"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// One scene target + one nine-tap output pass. No composer, mip pyramid or global CSS glow.
export function CortexFinish({ running }: { running: boolean }) {
  const { gl, size } = useThree();
  const finish = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
    const material = new THREE.ShaderMaterial({
      uniforms: { image: { value: target.texture }, texel: { value: new THREE.Vector2(1, 1) } },
      depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: `varying vec2 uvOut; void main() { uvOut = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D image;
        uniform vec2 texel;
        varying vec2 uvOut;
        void main() {
          vec3 base = texture2D(image, uvOut).rgb;
          vec3 halo = vec3(0.0);
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              vec3 s = texture2D(image, uvOut + vec2(float(x), float(y)) * texel * 3.0).rgb;
              halo += max(s - vec3(0.45), vec3(0.0));
            }
          }
          vec3 c = base + halo * 0.055;
          // Filmic shoulder applied exactly once, after linear scene composition.
          c = clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    return { target, material, geometry, scene, camera: new THREE.Camera(), frames: 0 };
  }, []);
  useEffect(() => {
    const dpr = Math.min(gl.getPixelRatio(), 1.5);
    finish.target.setSize(Math.max(1, Math.round(size.width * dpr)), Math.max(1, Math.round(size.height * dpr)));
    finish.material.uniforms.texel.value.set(1 / finish.target.width, 1 / finish.target.height);
    gl.domElement.dataset.postprocessing = "single-pass-glow";
    return () => { delete gl.domElement.dataset.postprocessing; };
  }, [finish, gl, size]);
  useEffect(() => () => { finish.target.dispose(); finish.material.dispose(); finish.geometry.dispose(); }, [finish]);
  useFrame(({ scene, camera }) => {
    if (!running) return;
    const previousToneMapping = gl.toneMapping;
    const previousTarget = gl.getRenderTarget();
    gl.toneMapping = THREE.NoToneMapping;
    try {
      gl.setRenderTarget(finish.target);
      gl.render(scene, camera);
      gl.setRenderTarget(previousTarget);
      gl.render(finish.scene, finish.camera);
      finish.frames++;
      if (finish.frames % 30 === 0) gl.domElement.dataset.cortexFrames = String(finish.frames);
    } finally {
      gl.setRenderTarget(previousTarget);
      gl.toneMapping = previousToneMapping;
    }
  }, 1);
  return null;
}

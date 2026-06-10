"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSoftCircleTexture } from "@/components/neural-cortex/utils";

// ── Soft-circle particles with per-particle alpha & attraction ──
export function SoftParticles({
  count = 500,
  targetPos,
  color = "#00f0ff",
}: {
  count?: number;
  targetPos?: THREE.Vector3 | null;
  color?: string;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const bounds = useMemo(() => [15, 10, 10] as const, []);

  // Pre-generate attributes
  const { positions, sizes, alphas, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const a = new Float32Array(count);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      s[i] = 0.06 + Math.random() * 0.06; // 0.06–0.12
      a[i] = 0.3 + Math.random() * 0.4;   // 0.3–0.7
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }
    return { positions: pos, sizes: s, alphas: a, velocities: vel };
  }, [count]);

  // Soft circle texture
  const texture = useMemo(() => createSoftCircleTexture(), []);

  // Shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        map: { value: texture },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (200.0 / -mvPosition.z);
          vAlpha = alpha;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform sampler2D map;
        varying float vAlpha;
        void main() {
          vec4 texColor = texture2D(map, gl_PointCoord);
          float alpha = texColor.a * vAlpha;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [color, texture]);

  // Store mutable data in refs
  const posRef = useRef(positions);
  const velRef = useRef(velocities);
  const attrRef = useRef<THREE.BufferAttribute | null>(null);

  // Copy to shader material after creation
  useEffect(() => {
    if (shaderRef.current) {
      shaderRef.current.needsUpdate = true;
    }
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const geo = mesh.geometry;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const pos = posRef.current;
    const vel = velRef.current;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Apply velocity
      for (let j = 0; j < 3; j++) {
        pos[idx + j] += vel[idx + j];
        if (Math.abs(pos[idx + j]) > bounds[j]) {
          pos[idx + j] = (bounds[j] - 0.1) * -Math.sign(pos[idx + j]) + (Math.random() - 0.5) * 0.3;
          vel[idx + j] *= -0.2;
        }
      }
      // Attraction
      if (targetPos) {
        const dx = targetPos.x - pos[idx];
        const dy = targetPos.y - pos[idx + 1];
        const dz = targetPos.z - pos[idx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
        const force = 0.0003;
        vel[idx] += (dx / dist) * force;
        vel[idx + 1] += (dy / dist) * force;
        vel[idx + 2] += (dz / dist) * force;
      }
      // Clamp velocity
      const maxVel = 0.02;
      for (let j = 0; j < 3; j++) {
        if (Math.abs(vel[idx + j]) > maxVel) vel[idx + j] = maxVel * Math.sign(vel[idx + j]);
      }
    }

    // Update buffer
    for (let i = 0; i < count * 3; i++) attr.array[i] = pos[i];
    attr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-alpha"
          args={[alphas, 1]}
        />
      </bufferGeometry>
      <primitive object={material} ref={shaderRef} attach="material" />
    </points>
  );
}
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSoftCircleTexture } from "@/components/neural-cortex/utils";

// ── Burst particles emitted from selected node ──
// When a node is selected, particles burst outward.
// When deselected, existing particles keep drifting freely (never vanish).
// Each new selection spawns a fresh batch that joins the swarm.
// Each particle retains the color it was emitted with.
export function BurstParticles({
  origin,
  color = "#00f0ff",
  count = 80,
}: {
  origin: THREE.Vector3 | null;
  color?: string;
  count?: number;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const texture = useMemo(() => createSoftCircleTexture(), []);
  const hasSpawned = useRef(false);

  // Per-particle color storage (set at spawn time, never changes)
  const particleColors = useMemo(() => {
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color("#00f0ff");
    for (let i = 0; i < count * 3; i += 3) {
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }
    return colors;
  }, [count]);

  const { positions, sizes, alphas, velocities, lifetimes, free } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const a = new Float32Array(count);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const fr = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = 0.04 + Math.random() * 0.06;
      a[i] = 0;
      life[i] = 1;
      fr[i] = 0;
    }
    return { positions: pos, sizes: s, alphas: a, velocities: vel, lifetimes: life, free: fr };
  }, [count]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        attribute vec3 particleColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (200.0 / -mvPosition.z);
          vAlpha = alpha;
          vColor = particleColor;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(map, gl_PointCoord);
          float alpha = texColor.a * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [texture]);

  const posRef = useRef(positions);
  const velRef = useRef(velocities);
  const alphaRef = useRef(alphas);
  const lifeRef = useRef(lifetimes);
  const freeRef = useRef(free);
  const colorRef = useRef(particleColors);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const alphaAttr = geo.getAttribute("alpha") as THREE.BufferAttribute;
    const colorAttr = geo.getAttribute("particleColor") as THREE.BufferAttribute;
    const pos = posRef.current;
    const vel = velRef.current;
    const alpha = alphaRef.current;
    const life = lifeRef.current;
    const fr = freeRef.current;
    const colors = colorRef.current;
    const isActive = origin !== null;

    if (isActive) {
      hasSpawned.current = true;
    }

    for (let i = 0; i < count; i++) {
      const idx = i * 3;

      if (isActive && fr[i] === 0) {
        life[i] += delta * 0.5;

        if (life[i] >= 1) {
          life[i] = 0;
          pos[idx] = origin!.x + (Math.random() - 0.5) * 0.1;
          pos[idx + 1] = origin!.y + (Math.random() - 0.5) * 0.1;
          pos[idx + 2] = origin!.z + (Math.random() - 0.5) * 0.1;
          const speed = 0.008 + Math.random() * 0.012;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          vel[idx] = Math.sin(phi) * Math.cos(theta) * speed;
          vel[idx + 1] = Math.sin(phi) * Math.sin(theta) * speed;
          vel[idx + 2] = Math.cos(phi) * speed;
          // Set particle color at spawn time
          const c = new THREE.Color(color);
          colors[idx] = c.r;
          colors[idx + 1] = c.g;
          colors[idx + 2] = c.b;
        } else {
          pos[idx] += vel[idx];
          pos[idx + 1] += vel[idx + 1];
          pos[idx + 2] += vel[idx + 2];
          vel[idx] *= 0.98;
          vel[idx + 1] *= 0.98;
          vel[idx + 2] *= 0.98;
        }

        alpha[i] = life[i] < 0.15
          ? life[i] / 0.15 * 0.7
          : (1 - life[i]) * 0.7;
      } else if (isActive && fr[i] === 1) {
        const dx = origin!.x - pos[idx];
        const dy = origin!.y - pos[idx + 1];
        const dz = origin!.z - pos[idx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
        vel[idx] += (dx / dist) * 0.0004;
        vel[idx + 1] += (dy / dist) * 0.0004;
        vel[idx + 2] += (dz / dist) * 0.0004;
        const maxV = 0.015;
        for (let j = 0; j < 3; j++) {
          if (Math.abs(vel[idx + j]) > maxV) vel[idx + j] = maxV * Math.sign(vel[idx + j]);
        }
        pos[idx] += vel[idx];
        pos[idx + 1] += vel[idx + 1];
        pos[idx + 2] += vel[idx + 2];
        alpha[i] = Math.min(alpha[i] + delta * 0.5, 0.45);
      } else {
        // Free-floating: gentle drift, join ambient field
        if (fr[i] === 0) {
          // Transition from burst to free -- regardless of life state
          fr[i] = 1;
          // If particle was "dead" (life >= 1) or invisible, respawn at random location
          if (life[i] >= 1 || alpha[i] <= 0) {
            pos[idx] = (Math.random() - 0.5) * 20;
            pos[idx + 1] = (Math.random() - 0.5) * 14;
            pos[idx + 2] = (Math.random() - 0.5) * 14;
            vel[idx] = (Math.random() - 0.5) * 0.002;
            vel[idx + 1] = (Math.random() - 0.5) * 0.002;
            vel[idx + 2] = (Math.random() - 0.5) * 0.002;
            alpha[i] = 0.25;
          }
        }
        vel[idx] += (Math.random() - 0.5) * 0.0002;
        vel[idx + 1] += (Math.random() - 0.5) * 0.0002;
        vel[idx + 2] += (Math.random() - 0.5) * 0.0002;
        vel[idx] *= 0.995;
        vel[idx + 1] *= 0.995;
        vel[idx + 2] *= 0.995;
        pos[idx] += vel[idx];
        pos[idx + 1] += vel[idx + 1];
        pos[idx + 2] += vel[idx + 2];
        const bounds = 15;
        for (let j = 0; j < 3; j++) {
          const b = j === 0 ? bounds : 10;
          if (Math.abs(pos[idx + j]) > b) {
            pos[idx + j] = (b - 0.1) * -Math.sign(pos[idx + j]);
            vel[idx + j] *= -0.2;
          }
        }
        alpha[i] = alpha[i] + (0.25 - alpha[i]) * delta * 0.3;
      }
    }

    for (let i = 0; i < count * 3; i++) posAttr.array[i] = pos[i];
    posAttr.needsUpdate = true;
    for (let i = 0; i < count; i++) alphaAttr.array[i] = alpha[i];
    alphaAttr.needsUpdate = true;
    for (let i = 0; i < count * 3; i++) colorAttr.array[i] = colors[i];
    colorAttr.needsUpdate = true;
  });

  if (!hasSpawned.current && !origin) return null;

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
        <bufferAttribute
          attach="attributes-particleColor"
          args={[particleColors, 3]}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}
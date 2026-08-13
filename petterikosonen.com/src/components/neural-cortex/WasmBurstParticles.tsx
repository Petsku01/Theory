"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSoftCircleTexture } from "@/components/neural-cortex/utils";
import {
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
} from "@/components/neural-cortex/utils";

// WASM-powered burst particles -- uses shared cortex WASM instance from utils.ts.
// Falls back to pure JS if WASM fails to load.

// Data layout per particle (12 f32s):
// [px, py, pz, vx, vy, vz, size, alpha, life, color_r, color_g, color_b]
const BURST_STRIDE = 12;

export function WasmBurstParticles({
  origin,
  color = "#00f0ff",
  count = 160,
}: {
  origin: THREE.Vector3 | null;
  color?: string;
  count?: number;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const texture = useMemo(() => createSoftCircleTexture(), []);
  const wasmReady = useRef(false);
  const burstPtr = useRef<number>(0);
  const hasSpawned = useRef(false);

  // Pre-allocate buffers for both WASM and JS paths
  const { positions, sizes, alphas, particleColors, velocities, lifetimes, free } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const a = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const fr = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
      s[i] = 0.04 + Math.random() * 0.06;
      a[i] = 0.25;
      life[i] = 1;
      fr[i] = 1;
    }
    return { positions: pos, sizes: s, alphas: a, particleColors: colors, velocities: vel, lifetimes: life, free: fr };
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

  useEffect(() => {
    return () => {
      material.dispose();
      texture.dispose();
    };
  }, [material, texture]);

  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled) return;
      const wasm = getCortexWasm();
      if (!wasm) return;
      const ptr = wasm.burstsystem_new(count);
      burstPtr.current = ptr;
      wasmReady.current = true;
    };

    if (isCortexWasmReady()) {
      init();
    } else {
      ensureCortexWasm().then((ok) => {
        if (ok) init();
      });
    }

    return () => {
      cancelled = true;
      if (burstPtr.current) {
        try { getCortexWasm()?.__wbg_burstsystem_free(burstPtr.current, 0); } catch {}
        burstPtr.current = 0;
      }
    };
  }, [count]);

  useFrame((_, delta) => {
    if (typeof document !== "undefined" && document.hidden) return;

    const mesh = meshRef.current;
    if (!mesh) return;
    const geo = mesh.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const alphaAttr = geo.getAttribute("alpha") as THREE.BufferAttribute;
    const colorAttr = geo.getAttribute("particleColor") as THREE.BufferAttribute;
    const sizeAttr = geo.getAttribute("size") as THREE.BufferAttribute;
    const isActive = origin !== null;

    if (isActive) {
      hasSpawned.current = true;
    }

    const wasm = getCortexWasm();
    if (wasmReady.current && wasm && burstPtr.current) {
      const ptr = burstPtr.current;

      if (isActive) {
        wasm.burstsystem_set_origin(ptr, origin!.x, origin!.y, origin!.z);
        const c = new THREE.Color(color);
        wasm.burstsystem_set_color(ptr, c.r, c.g, c.b);
      }

      wasm.burstsystem_update(ptr, isActive ? 1 : 0, delta);

      const dataPtr = wasm.burstsystem_data_ptr(ptr);
      const len = wasm.burstsystem_len(ptr);
      const stride = wasm.burstsystem_stride(ptr);

      const wasmData = new Float32Array(wasm.memory.buffer, dataPtr, len * stride);

      const pos = posAttr.array as Float32Array;
      const al = alphaAttr.array as Float32Array;
      const colors = colorAttr.array as Float32Array;

      for (let i = 0; i < len; i++) {
        const src = i * stride;
        const dst = i * 3;
        pos[dst] = wasmData[src];
        pos[dst + 1] = wasmData[src + 1];
        pos[dst + 2] = wasmData[src + 2];
        (sizeAttr.array as Float32Array)[i] = wasmData[src + 6];
        al[i] = wasmData[src + 7];
        colors[dst] = wasmData[src + 9];
        colors[dst + 1] = wasmData[src + 10];
        colors[dst + 2] = wasmData[src + 11];
      }

      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    } else {
      // JS fallback -- identical physics
      const pos = positions;
      const vel = velocities;
      const al = alphas;
      const life = lifetimes;
      const fr = free;
      const colors = particleColors;

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
          al[i] = life[i] < 0.15 ? (life[i] / 0.15) * 0.7 : (1 - life[i]) * 0.7;
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
          al[i] = Math.min(al[i] + delta * 0.5, 0.45);
        } else {
          if (fr[i] === 0) {
            fr[i] = 1;
            if (life[i] >= 1 || al[i] <= 0) {
              pos[idx] = (Math.random() - 0.5) * 20;
              pos[idx + 1] = (Math.random() - 0.5) * 14;
              pos[idx + 2] = (Math.random() - 0.5) * 14;
              vel[idx] = (Math.random() - 0.5) * 0.002;
              vel[idx + 1] = (Math.random() - 0.5) * 0.002;
              vel[idx + 2] = (Math.random() - 0.5) * 0.002;
              al[i] = 0.25;
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
              pos[idx + j] = Math.max(-b, Math.min(b, pos[idx + j]));
              vel[idx + j] *= -0.2;
            }
          }
          al[i] = al[i] + (0.25 - al[i]) * delta * 0.3;
        }
      }

      for (let i = 0; i < count * 3; i++) posAttr.array[i] = pos[i];
      posAttr.needsUpdate = true;
      for (let i = 0; i < count; i++) alphaAttr.array[i] = al[i];
      alphaAttr.needsUpdate = true;
      for (let i = 0; i < count * 3; i++) colorAttr.array[i] = colors[i];
      colorAttr.needsUpdate = true;
    }
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
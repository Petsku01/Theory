"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSoftCircleTexture } from "@/components/neural-cortex/utils";

// WASM-powered soft particles -- replaces pure-JS SoftParticles
// Loads .wasm directly via fetch + WebAssembly.instantiateStreaming
// No JS glue code needed -- calls WASM exports directly
// Falls back to pure JS if WASM fails to load

interface WasmExports {
  memory: WebAssembly.Memory;
  particlesystem_new(count: number, xb: number, yb: number, zb: number): number;
  particlesystem_update(ptr: number, tx: number, ty: number, tz: number, hasTarget: number): number;
  particlesystem_data_ptr(ptr: number): number;
  particlesystem_len(ptr: number): number;
  particlesystem_stride(ptr: number): number;
  particlesystem_free(ptr: number, del: number): void;
  __wbindgen_start(): void;
  __wbindgen_externrefs: WebAssembly.Table;
  __wbg_particlesystem_free(ptr: number, del: number): void;
}

let wasmExports: WasmExports | null = null;
let wasmLoading = false;
let wasmStatus: "loading" | "wasm" | "js" = "loading";

export function getWasmStatus() {
  return wasmStatus;
}

async function ensureWasm(): Promise<boolean> {
  if (wasmExports) return true;
  if (wasmLoading) return false;
  wasmLoading = true;

  try {
    const response = await fetch("/wasm/wasm_particles_bg.wasm");
    const { instance } = await WebAssembly.instantiateStreaming(response, {
      "./wasm_particles_bg.js": {
        __wbg___wbindgen_throw_ea4887a5f8f9a9db: function(arg0: number, arg1: number) {
          throw new Error(`WASM throw at offset ${arg0}, len ${arg1}`);
        },
        __wbindgen_init_externref_table: function() {
          // Required by wasm-bindgen externref table initialization
        },
      },
    });
    const exports = instance.exports as unknown as WasmExports;
    if (exports.__wbindgen_start) {
      exports.__wbindgen_start();
    }
    wasmExports = exports;
    wasmStatus = "wasm";
    return true;
  } catch (err) {
    console.warn("[WasmSoftParticles] WASM load failed, using JS fallback:", err);
    wasmStatus = "js";
    return false;
  }
}

export function WasmSoftParticles({
  count = 1800,
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
  const wasmReady = useRef(false);
  const particlePtr = useRef<number>(0);

  // JS fallback state (identical to original SoftParticles)
  const { positions, sizes, alphas, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const a = new Float32Array(count);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      s[i] = 0.06 + Math.random() * 0.06;
      a[i] = 0.3 + Math.random() * 0.4;
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }
    return { positions: pos, sizes: s, alphas: a, velocities: vel };
  }, [count]);

  const texture = useMemo(() => createSoftCircleTexture(), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        map: { value: texture },
      },
      vertexShader: `
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
      fragmentShader: `
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

  const posRef = useRef(positions);
  const velRef = useRef(velocities);

  useEffect(() => {
    let cancelled = false;
    ensureWasm().then((ok) => {
      if (cancelled || !ok || !wasmExports) return;
      const ptr = wasmExports.particlesystem_new(count, bounds[0], bounds[1], bounds[2]);
      particlePtr.current = ptr;
      wasmReady.current = true;
    });
    return () => {
      cancelled = true;
      if (particlePtr.current && wasmExports) {
        try { wasmExports.particlesystem_free(particlePtr.current, 0); } catch {}
        particlePtr.current = 0;
      }
    };
  }, [count, bounds]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const geo = mesh.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const sizeAttr = geo.getAttribute("size") as THREE.BufferAttribute;
    const alphaAttr = geo.getAttribute("alpha") as THREE.BufferAttribute;

    if (wasmReady.current && wasmExports && particlePtr.current) {
      const ptr = particlePtr.current;
      const hasTarget = targetPos !== null && targetPos !== undefined;
      const tx = hasTarget ? targetPos!.x : 0;
      const ty = hasTarget ? targetPos!.y : 0;
      const tz = hasTarget ? targetPos!.z : 0;

      wasmExports.particlesystem_update(ptr, tx, ty, tz, hasTarget ? 1 : 0);

      const dataPtr = wasmExports.particlesystem_data_ptr(ptr);
      const len = wasmExports.particlesystem_len(ptr);
      const stride = wasmExports.particlesystem_stride(ptr);

      const wasmData = new Float32Array(wasmExports.memory.buffer, dataPtr, len * stride);

      const pos = posAttr.array as Float32Array;
      const sz = sizeAttr.array as Float32Array;
      const al = alphaAttr.array as Float32Array;

      for (let i = 0; i < len; i++) {
        const src = i * stride;
        const dst = i * 3;
        pos[dst]     = wasmData[src];
        pos[dst + 1] = wasmData[src + 1];
        pos[dst + 2] = wasmData[src + 2];
        sz[i] = wasmData[src + 6];
        al[i] = wasmData[src + 7];
      }

      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    } else {
      // JS fallback (original SoftParticles logic)
      const pos = posRef.current;
      const vel = velRef.current;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        for (let j = 0; j < 3; j++) {
          pos[idx + j] += vel[idx + j];
          if (Math.abs(pos[idx + j]) > bounds[j]) {
            pos[idx + j] = (bounds[j] - 0.1) * -Math.sign(pos[idx + j]) + (Math.random() - 0.5) * 0.3;
            vel[idx + j] *= -0.2;
          }
        }
        if (targetPos) {
          const dx = targetPos.x - pos[idx];
          const dy = targetPos.y - pos[idx + 1];
          const dz = targetPos.z - pos[idx + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
          vel[idx] += (dx / dist) * 0.0003;
          vel[idx + 1] += (dy / dist) * 0.0003;
          vel[idx + 2] += (dz / dist) * 0.0003;
        }
        const maxVel = 0.02;
        for (let j = 0; j < 3; j++) {
          if (Math.abs(vel[idx + j]) > maxVel) vel[idx + j] = maxVel * Math.sign(vel[idx + j]);
        }
      }
      for (let i = 0; i < count * 3; i++) posAttr.array[i] = pos[i];
      posAttr.needsUpdate = true;
    }
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
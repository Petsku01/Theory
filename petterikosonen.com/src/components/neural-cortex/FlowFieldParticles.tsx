"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  createSoftCircleTexture,
  setParticleWasmStatus,
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
  CLUSTER_COLORS,
  writeF32ToWasm,
  freeWasmPtr,
} from "@/components/neural-cortex/utils";
import { clusterPositions } from "@/lib/cortex-data";

// ── Flow-field particles with cluster attractors ──
// Replaces WasmSoftParticles + WasmBurstParticles.
// Uses PointsMaterial (NO ShaderMaterial) to avoid Firefox crashes.

const CLUSTER_KEYS = ["core", "projects", "skills", "experience", "research"] as const;

// Attractor data: 5 clusters × 12 f32 per cluster
// [pos_x, pos_y, pos_z, color_r, color_g, color_b, strength, pulse_phase, pulse_amp, active, boost, _pad]
const ATTRACTOR_STRIDE = 12;

export interface FlowFieldParticlesProps {
  count?: number;
  activeCluster: string | null;
  hoverTarget: THREE.Vector3 | null;
  reducedMotion?: boolean;
}

export function FlowFieldParticles({
  count = 5000,
  activeCluster,
  hoverTarget,
  reducedMotion = false,
}: FlowFieldParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const wasmReady = useRef(false);
  const particlePtr = useRef<number>(0);
  const wasmDataRef = useRef<Float32Array | null>(null);
  const attractorDataRef = useRef<Float32Array>(new Float32Array(CLUSTER_KEYS.length * ATTRACTOR_STRIDE));
  const attractorPtrRef = useRef<number>(0);

  // Build static attractor data (positions, colors, strengths, pulse params)
  const attractorData = useMemo(() => {
    const data = new Float32Array(CLUSTER_KEYS.length * ATTRACTOR_STRIDE);
    const pulseConfig: Record<string, [number, number, number]> = {
      // [strength, pulse_phase, pulse_amp]
      core: [1.5, 2.0, 0.15],
      projects: [1.0, 1.5, 0.12],
      skills: [1.0, 1.8, 0.13],
      experience: [0.8, 1.2, 0.10],
      research: [1.0, 1.6, 0.14],
    };

    CLUSTER_KEYS.forEach((key, i) => {
      const pos = clusterPositions[key] ?? [0, 0, 0];
      const colorHex = CLUSTER_COLORS[key] ?? "#00f0ff";
      const c = new THREE.Color(colorHex);
      const [strength, pulsePhase, pulseAmp] = pulseConfig[key] ?? [1.0, 1.5, 0.12];

      const o = i * ATTRACTOR_STRIDE;
      data[o] = pos[0];       // pos_x
      data[o + 1] = pos[1];   // pos_y
      data[o + 2] = pos[2];   // pos_z
      data[o + 3] = c.r;      // color_r
      data[o + 4] = c.g;      // color_g
      data[o + 5] = c.b;      // color_b
      data[o + 6] = strength; // strength
      data[o + 7] = pulsePhase; // pulse_phase
      data[o + 8] = pulseAmp;   // pulse_amp
      data[o + 9] = 1.0;        // active (all active by default)
      data[o + 10] = 1.0;       // boost (default)
      data[o + 11] = 0.0;       // _pad
    });

    return data;
  }, []);

  // Initialize positions and colors
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const defaultColor = new THREE.Color("#00f0ff");
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      col[i * 3] = defaultColor.r;
      col[i * 3 + 1] = defaultColor.g;
      col[i * 3 + 2] = defaultColor.b;
    }
    return { positions: pos, colors: col };
  }, [count]);

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createSoftCircleTexture();
  }, []);

  // PointsMaterial — NO ShaderMaterial
  const material = useMemo(() => {
    if (!texture) return null;
    return new THREE.PointsMaterial({
      size: 0.12,
      sizeAttenuation: true,
      map: texture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    });
  }, [texture]);

  // Init WASM particle system
  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      const wasm = getCortexWasm();
      if (!wasm) return;
      const ptr = wasm.particlesystem_new(count, 15, 10, 10);
      particlePtr.current = ptr;
      wasmReady.current = true;
      setParticleWasmStatus("wasm");
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
      if (particlePtr.current) {
        try { getCortexWasm()?.__wbg_particlesystem_free(particlePtr.current, 0); } catch {}
        particlePtr.current = 0;
      }
      if (attractorPtrRef.current) {
        try {
          const wasm = getCortexWasm();
          if (wasm) freeWasmPtr(wasm, attractorPtrRef.current, attractorData.length * 4);
        } catch {}
        attractorPtrRef.current = 0;
      }
    };
  }, [count, attractorData.length]);

  // Cleanup material + texture
  useEffect(() => {
    return () => {
      material?.dispose();
      texture?.dispose();
      pointsRef.current?.geometry?.dispose();
    };
  }, [material, texture]);

  // Animation loop
  useFrame((state) => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (reducedMotion) return;

    const mesh = pointsRef.current;
    if (!mesh) return;
    const geo = mesh.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const colorAttr = geo.getAttribute("color") as THREE.BufferAttribute;

    const wasm = getCortexWasm();
    if (wasmReady.current && wasm && particlePtr.current && material) {
      const ptr = particlePtr.current;
      const time = state.clock.elapsedTime;

      // Update attractor data: set active flags and boost based on activeCluster
      const attractors = attractorDataRef.current;
      attractors.set(attractorData); // reset to base

      const activeIdx = activeCluster ? CLUSTER_KEYS.indexOf(activeCluster as typeof CLUSTER_KEYS[number]) : -1;

      for (let a = 0; a < CLUSTER_KEYS.length; a++) {
        const o = a * ATTRACTOR_STRIDE;
        // Set active flag: all active unless a specific cluster is selected
        if (activeIdx >= 0) {
          attractors[o + 9] = a === activeIdx ? 1.0 : 1.0; // all still active, but boost differs
        } else {
          attractors[o + 9] = 1.0;
        }
      }

      // Write attractor data to WASM memory
      const wasm2 = getCortexWasm();
      if (!wasm2) return;

      // Free previous allocation if any
      if (attractorPtrRef.current) {
        try { freeWasmPtr(wasm2, attractorPtrRef.current, attractors.length * 4); } catch {}
      }
      attractorPtrRef.current = writeF32ToWasm(wasm2, attractors);

      // Call update_clusters
      wasm2.particlesystem_update_clusters(
        ptr,
        time,
        attractorPtrRef.current,
        attractors.length,
        CLUSTER_KEYS.length,
        activeIdx,
        hoverTarget?.x ?? 0,
        hoverTarget?.y ?? 0,
        hoverTarget?.z ?? 0,
        hoverTarget !== null && hoverTarget !== undefined ? 1 : 0,
      );

      // Read back data
      const dataPtr = wasm2.particlesystem_data_ptr(ptr);
      const len = wasm2.particlesystem_len(ptr);
      const stride = wasm2.particlesystem_stride(ptr);

      // Cache Float32Array view — recreate if WASM memory buffer changed
      let wasmData = wasmDataRef.current;
      if (!wasmData || wasmData.buffer !== wasm2.memory.buffer) {
        wasmData = new Float32Array(wasm2.memory.buffer, dataPtr, len * stride);
        wasmDataRef.current = wasmData;
      }

      // Copy position + color data to GPU buffers
      const pos = posAttr.array as Float32Array;
      const col = colorAttr.array as Float32Array;

      for (let i = 0; i < len; i++) {
        const src = i * stride;
        const dst = i * 3;
        pos[dst] = wasmData[src];
        pos[dst + 1] = wasmData[src + 1];
        pos[dst + 2] = wasmData[src + 2];
        col[dst] = wasmData[src + 8];
        col[dst + 1] = wasmData[src + 9];
        col[dst + 2] = wasmData[src + 10];
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    } else {
      // JS fallback — simple drift with curl-like noise
      const time = state.clock.elapsedTime;
      const pos = posAttr.array as Float32Array;
      const col = colorAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const px = pos[idx];
        const py = pos[idx + 1];
        const pz = pos[idx + 2];

        // Simple noise-based drift
        const t = time * 0.1;
        pos[idx] += Math.sin(py * 0.5 + t + i * 0.01) * 0.01;
        pos[idx + 1] += Math.cos(pz * 0.5 + t + i * 0.013) * 0.01;
        pos[idx + 2] += Math.sin(px * 0.5 + t + i * 0.017) * 0.01;

        // Boundary
        if (Math.abs(pos[idx]) > 15) pos[idx] *= -0.95;
        if (Math.abs(pos[idx + 1]) > 10) pos[idx + 1] *= -0.95;
        if (Math.abs(pos[idx + 2]) > 10) pos[idx + 2] *= -0.95;

        // Color: blend toward nearest cluster
        let nearestIdx = 0;
        let nearestDistSq = Infinity;
        for (let a = 0; a < CLUSTER_KEYS.length; a++) {
          const cp = clusterPositions[CLUSTER_KEYS[a]] ?? [0, 0, 0];
          const dx = px - cp[0];
          const dy = py - cp[1];
          const dz = pz - cp[2];
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < nearestDistSq) {
            nearestDistSq = dSq;
            nearestIdx = a;
          }
        }
        const blendRadius = 6.0;
        const t2 = nearestDistSq < blendRadius * blendRadius
          ? Math.max(0, 1 - Math.sqrt(nearestDistSq) / blendRadius)
          : 0;
        const colorHex = CLUSTER_COLORS[CLUSTER_KEYS[nearestIdx]] ?? "#00f0ff";
        const c = new THREE.Color(colorHex);
        col[idx] = c.r * t2;
        col[idx + 1] = c.g * t2;
        col[idx + 2] = c.b * t2;
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    }
  });

  if (!texture || !material) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}
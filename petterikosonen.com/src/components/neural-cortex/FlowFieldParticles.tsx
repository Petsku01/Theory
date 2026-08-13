"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
import { clusterPositions, clusterSymbiosis, SPECIES_COLORS } from "@/lib/cortex-data";

// ── SYMBIOOSIS: Flow-field particles with species behavior ──
// Three symbiont species: ihminen (0), kone (1), luonto (2)
// Uses PointsMaterial (NO ShaderMaterial) to avoid Firefox crashes.

const CLUSTER_KEYS = ["core", "projects", "skills", "experience", "research"] as const;

// Attractor data: 5 clusters × 12 f32 per cluster
// [pos_x, pos_y, pos_z, color_r, color_g, color_b, strength, pulse_freq, pulse_amp, active, boost, _pad]
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
  const { raycaster, camera, pointer } = useThree();
  const cursorPosRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // Build static attractor data (positions, colors, strengths, pulse params)
  const attractorData = useMemo(() => {
    const data = new Float32Array(CLUSTER_KEYS.length * ATTRACTOR_STRIDE);

    CLUSTER_KEYS.forEach((key, i) => {
      const pos = clusterPositions[key] ?? [0, 0, 0];
      const colorHex = CLUSTER_COLORS[key] ?? "#00f0ff";
      const c = new THREE.Color(colorHex);
      const symbiosis = clusterSymbiosis[key] ?? { pulseFreq: 1.5, speciesWeights: [0.33, 0.33, 0.34] };

      const o = i * ATTRACTOR_STRIDE;
      data[o] = pos[0];       // pos_x
      data[o + 1] = pos[1];   // pos_y
      data[o + 2] = pos[2];   // pos_z
      data[o + 3] = c.r;      // color_r
      data[o + 4] = c.g;      // color_g
      data[o + 5] = c.b;      // color_b
      data[o + 6] = 1.2;      // strength
      data[o + 7] = symbiosis.pulseFreq; // pulse_freq
      data[o + 8] = 0.13;     // pulse_amp
      data[o + 9] = 1.0;      // active (all active by default)
      data[o + 10] = 1.0;     // boost (default)
      data[o + 11] = 0.0;     // _pad
    });

    return data;
  }, []);

  // Initialize positions and species-colored colors
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    // Species colors: ihminen (0), kone (1), luonto (2) — 33/33/34 split
    const speciesColorObjs = [
      new THREE.Color(SPECIES_COLORS[0] ?? "#22D3EE"),
      new THREE.Color(SPECIES_COLORS[1] ?? "#FF6B35"),
      new THREE.Color(SPECIES_COLORS[2] ?? "#39FF88"),
    ];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      const species = i % 3;
      const c = speciesColorObjs[species];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count]);

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createSoftCircleTexture();
  }, []);

  // PointsMaterial — NO ShaderMaterial (Firefox crash avoidance)
  const material = useMemo(() => {
    if (!texture) return null;
    return new THREE.PointsMaterial({
      size: 0.14,
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

  // Track cursor position in 3D via raycaster — cursor = user "juuret"
  useEffect(() => {
    if (reducedMotion) return;
    const handlePointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      // Raycast from camera through pointer into scene
      raycaster.setFromCamera(pointer, camera);
      // Project onto z=0 plane for a 3D hover target
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      if (intersect) {
        cursorPosRef.current.copy(intersect);
      }
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [raycaster, camera, pointer, reducedMotion]);

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
        if (activeIdx >= 0) {
          attractors[o + 9] = 1.0; // all still active
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

      // Cursor hover: use the raycasted 3D position as hover target
      const hasHover = !reducedMotion;
      const hx = cursorPosRef.current.x;
      const hy = cursorPosRef.current.y;
      const hz = cursorPosRef.current.z;

      // Call update_clusters with cursor as hover attractor
      wasm2.particlesystem_update_clusters(
        ptr,
        time,
        attractorPtrRef.current,
        attractors.length,
        CLUSTER_KEYS.length,
        activeIdx,
        hx,
        hy,
        hz,
        hasHover ? 1 : 0,
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

        // Species-based color (JS fallback)
        const species = i % 3;
        const colorHex = SPECIES_COLORS[species] ?? "#22D3EE";
        const c = new THREE.Color(colorHex);

        // Blend toward nearest cluster
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
        const clusterColorHex = CLUSTER_COLORS[CLUSTER_KEYS[nearestIdx]] ?? "#00f0ff";
        const cc = new THREE.Color(clusterColorHex);
        col[idx] = c.r + (cc.r - c.r) * t2 * 0.6;
        col[idx + 1] = c.g + (cc.g - c.g) * t2 * 0.6;
        col[idx + 2] = c.b + (cc.b - c.b) * t2 * 0.6;
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
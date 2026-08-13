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
import { nodes, clusterPositions } from "@/lib/cortex-data";

// WASM-powered soft particles using the unified cortex WASM instance.
// Falls back to pure JS if WASM fails to load.

export function WasmSoftParticles({
  count = 3600,
  targetPos,
  color = "#00f0ff",
  reducedMotion = false,
}: {
  count?: number;
  targetPos?: THREE.Vector3 | null;
  color?: string;
  reducedMotion?: boolean;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const bounds = useMemo(() => [15, 10, 10] as const, []);
  const wasmReady = useRef(false);
  const particlePtr = useRef<number>(0);
  const colorUpdateTimer = useRef<number>(0);
  const clusterDataRef = useRef<{
    nodePositionsPtr: number;
    clusterColorsPtr: number;
    nodePositionsByteLen: number;
    clusterColorsByteLen: number;
    nodeCount: number;
  } | null>(null);

  const { positions, sizes, alphas, velocities, baseSizes, particleColors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const a = new Float32Array(count);
    const vel = new Float32Array(count * 3);
    const base = new Float32Array(count);
    const pColors = new Float32Array(count * 3);
    const defaultColor = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      s[i] = 0.06 + Math.random() * 0.06;
      base[i] = s[i];
      a[i] = 0.3 + Math.random() * 0.4;
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
      // Initialize with default color
      pColors[i * 3] = defaultColor.r;
      pColors[i * 3 + 1] = defaultColor.g;
      pColors[i * 3 + 2] = defaultColor.b;
    }
    return { positions: pos, sizes: s, alphas: a, velocities: vel, baseSizes: base, particleColors: pColors };
  }, [count, color]);

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createSoftCircleTexture();
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        attribute vec3 particleColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_PointSize = min(gl_PointSize, 64.0);
          vAlpha = alpha;
          vColor = particleColor;
        }
      `,
      fragmentShader: `
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

  // Prepare cluster color data for WASM
  useEffect(() => {
    if (typeof window === "undefined") return;

    const init = () => {
      const wasm = getCortexWasm();
      if (!wasm) return;

      // Build node positions and cluster colors arrays
      const nodeCount = nodes.length;
      const nodePositions = new Float32Array(nodeCount * 3);
      const clusterColors = new Float32Array(nodeCount * 3);

      const clusterNodeMap = new Map<string, number>();
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let ni = 0; ni < nodes.length; ni++) {
        const node = nodes[ni];
        const idx = clusterNodeMap.get(node.cluster) ?? 0;
        clusterNodeMap.set(node.cluster, idx + 1);
        const cp = clusterPositions[node.cluster] ?? [0, 0, 0];
        const angle = idx * goldenAngle;
        const r = Math.sqrt((idx + 0.5) / 10) * 3.0;
        nodePositions[ni * 3] = cp[0] + Math.cos(angle) * r;
        nodePositions[ni * 3 + 1] = cp[1] + Math.sin(angle * 0.7) * 0.8;
        nodePositions[ni * 3 + 2] = cp[2] + Math.sin(angle) * r;

        const clusterColorHex = CLUSTER_COLORS[node.cluster] ?? "#00f0ff";
        const c = new THREE.Color(clusterColorHex);
        clusterColors[ni * 3] = c.r;
        clusterColors[ni * 3 + 1] = c.g;
        clusterColors[ni * 3 + 2] = c.b;
      }

      const nodePositionsPtr = writeF32ToWasm(wasm, nodePositions);
      const clusterColorsPtr = writeF32ToWasm(wasm, clusterColors);
      clusterDataRef.current = {
        nodePositionsPtr,
        clusterColorsPtr,
        nodePositionsByteLen: nodePositions.length * 4,
        clusterColorsByteLen: clusterColors.length * 4,
        nodeCount,
      };
    };

    if (isCortexWasmReady()) {
      init();
    } else {
      ensureCortexWasm().then((ok) => {
        if (ok) init();
      });
    }

    return () => {
      const wasm = getCortexWasm();
      if (clusterDataRef.current && wasm) {
        freeWasmPtr(wasm, clusterDataRef.current.nodePositionsPtr, clusterDataRef.current.nodePositionsByteLen);
        freeWasmPtr(wasm, clusterDataRef.current.clusterColorsPtr, clusterDataRef.current.clusterColorsByteLen);
      }
      clusterDataRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      const wasm = getCortexWasm();
      if (!wasm) return;
      const ptr = wasm.particlesystem_new(count, bounds[0], bounds[1], bounds[2]);
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
    };
  }, [count, bounds]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    return () => {
      texture?.dispose();
      meshRef.current?.geometry?.dispose();
    };
  }, [texture]);

  useFrame((state, delta) => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (reducedMotion) return; // static particles when reduced motion

    const mesh = meshRef.current;
    if (!mesh) return;
    const geo = mesh.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const sizeAttr = geo.getAttribute("size") as THREE.BufferAttribute;
    const alphaAttr = geo.getAttribute("alpha") as THREE.BufferAttribute;
    const colorAttr = geo.getAttribute("particleColor") as THREE.BufferAttribute;

    const wasm = getCortexWasm();
    if (wasmReady.current && wasm && particlePtr.current) {
      const ptr = particlePtr.current;
      const hasTarget = targetPos !== null && targetPos !== undefined;
      const time = state.clock.elapsedTime;

      // Always use regular update (no curl-noise) for isolation test
      if (hasTarget) {
        const tx = targetPos!.x;
        const ty = targetPos!.y;
        const tz = targetPos!.z;
        wasm.particlesystem_update(ptr, tx, ty, tz, 1);
      } else {
        wasm.particlesystem_update(ptr, 0, 0, 0, 0);
      }

      // DISABLED: update_colors for isolation test

      const dataPtr = wasm.particlesystem_data_ptr(ptr);
      const len = wasm.particlesystem_len(ptr);
      const stride = wasm.particlesystem_stride(ptr);

      const wasmData = new Float32Array(wasm.memory.buffer, dataPtr, len * stride);

      const pos = posAttr.array as Float32Array;
      const sz = sizeAttr.array as Float32Array;
      const al = alphaAttr.array as Float32Array;
      const cl = colorAttr.array as Float32Array;

      for (let i = 0; i < len; i++) {
        const src = i * stride;
        const dst = i * 3;
        pos[dst] = wasmData[src];
        pos[dst + 1] = wasmData[src + 1];
        pos[dst + 2] = wasmData[src + 2];
        sz[i] = wasmData[src + 6];
        al[i] = wasmData[src + 7];
        // Colors at offset 8, 9, 10
        cl[dst] = wasmData[src + 8];
        cl[dst + 1] = wasmData[src + 9];
        cl[dst + 2] = wasmData[src + 10];
      }

      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    } else {
      // JS fallback -- uses useMemo arrays directly, no refs needed
      const pos = positions;
      const vel = velocities;
      const al = alphaAttr.array as Float32Array;
      const sz = sizeAttr.array as Float32Array;
      const cl = colorAttr ? (colorAttr.array as Float32Array) : particleColors;
      const time = state.clock.elapsedTime;

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
        vel[idx] *= 0.998;
        vel[idx + 1] *= 0.998;
        vel[idx + 2] *= 0.998;
        const maxVel = 0.02;
        for (let j = 0; j < 3; j++) {
          if (Math.abs(vel[idx + j]) > maxVel) vel[idx + j] = maxVel * Math.sign(vel[idx + j]);
        }

        al[i] -= delta * 0.15;
        if (al[i] <= 0.05) {
          al[i] = 0.3 + Math.random() * 0.4;
        }

        sz[i] = baseSizes[i] * (1.0 + 0.5 * Math.sin(time * 1.5 + i));
      }

      for (let i = 0; i < count * 3; i++) posAttr.array[i] = pos[i];
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      if (colorAttr) colorAttr.needsUpdate = true;
    }
  });

  if (!texture) return null;

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
      <primitive object={material} ref={shaderRef} attach="material" />
    </points>
  );
}
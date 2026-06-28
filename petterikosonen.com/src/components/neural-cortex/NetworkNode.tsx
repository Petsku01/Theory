"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { type CortexNode } from "@/lib/cortex-data";
import {
  CLUSTER_COLORS,
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
  writeF32ToWasm,
  writeU32ToWasm,
  freeWasmPtr,
} from "@/components/neural-cortex/utils";
import { useScramble } from "@/components/neural-cortex/hooks/useScramble";

// ── Deterministic phase offset from node id ──
function hashPhase(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return ((Math.abs(hash) % 100) / 100) * Math.PI * 2;
}

// ── 3D Node: WASM-animated or JS fallback ──
export const NetworkNode = React.memo(function NetworkNode({
  node,
  position,
  isSelected,
  isHovered,
  isDimmed = false,
  onSelect,
  onHover,
}: {
  node: CortexNode;
  position: THREE.Vector3;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed?: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  const baseSize = node.size * 0.22;
  const coreRadius = baseSize * 0.4;
  const clusterColor = CLUSTER_COLORS[node.cluster] ?? "#00f0ff";
  const color = useMemo(() => new THREE.Color(clusterColor), [clusterColor]);

  const displayText = useScramble(node.label, isHovered);
  const phase = useMemo(() => hashPhase(node.id), [node.id]);

  // Ring geometry -- memoized + disposed on unmount
  const ring1Geom = useMemo(
    () => new THREE.TorusGeometry(baseSize * 2.2, 0.008, 8, 64),
    [baseSize]
  );
  const ring2Geom = useMemo(
    () => new THREE.TorusGeometry(baseSize * 1.7, 0.005, 8, 64),
    [baseSize]
  );
  useEffect(() => {
    return () => {
      ring1Geom.dispose();
      ring2Geom.dispose();
    };
  }, [ring1Geom, ring2Geom]);

  // Deterministic ring tilt angles
  const tilt1: [number, number, number] = useMemo(
    () => [0.3 + (phase / Math.PI) * 0.5, phase * 0.7, 0],
    [phase]
  );
  const tilt2: [number, number, number] = useMemo(
    () => [1.2, phase * 0.3, 0.4 + (phase / Math.PI) * 0.3],
    [phase]
  );

  // ── WASM animation state ──
  const animPtr = useRef<number>(0);
  const flagsPtr = useRef<number>(0);
  const phasesPtr = useRef<number>(0);
  const tiltsPtr = useRef<number>(0);
  const wasmReady = useRef(false);
  const [, setWasmFlag] = useState(false);

  // Initialize WASM animation system (single node, count=1)
  useEffect(() => {
    if (!isCortexWasmReady() || !getCortexWasm()) {
      if (!isCortexWasmReady()) {
        ensureCortexWasm().then((ok) => {
          if (ok) setWasmFlag(true);
        });
      }
      return;
    }

    const wasm = getCortexWasm()!;
    const ptr = wasm.nodeanimationsystem_new();
    animPtr.current = ptr;

    // Write phase and tilts to WASM memory
    const phases = new Float32Array([phase]);
    const tilts = new Float32Array([tilt1[0], tilt1[1], tilt2[0], tilt2[1], tilt2[2]]);

    const phasesWasmPtr = writeF32ToWasm(wasm, phases);
    const tiltsWasmPtr = writeF32ToWasm(wasm, tilts);
    const flagsWasmPtr = writeU32ToWasm(wasm, new Uint32Array(1));

    phasesPtr.current = phasesWasmPtr;
    tiltsPtr.current = tiltsWasmPtr;
    flagsPtr.current = flagsWasmPtr;

    wasm.nodeanimationsystem_init(ptr, phasesWasmPtr, tiltsWasmPtr, 1);
    wasmReady.current = true;

    return () => {
      const w = getCortexWasm();
      if (animPtr.current && w) {
        try { w.__wbg_nodeanimationsystem_free(animPtr.current, 0); } catch {}
        animPtr.current = 0;
      }
      if (phasesPtr.current && w) { freeWasmPtr(w, phasesPtr.current, 4); }
      if (tiltsPtr.current && w) { freeWasmPtr(w, tiltsPtr.current, 20); }
      if (flagsPtr.current && w) { freeWasmPtr(w, flagsPtr.current, 4); }
      phasesPtr.current = 0;
      tiltsPtr.current = 0;
      flagsPtr.current = 0;
      wasmReady.current = false;
    };
  }, [phase, tilt1, tilt2]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const active = isHovered || isSelected;

    // ── WASM path ──
    const wasm = getCortexWasm();
    if (wasmReady.current && wasm && animPtr.current && flagsPtr.current) {
      // Write active flag
      new Uint32Array(wasm.memory.buffer, flagsPtr.current, 1)[0] = active ? 1 : 0;

      // Update
      wasm.nodeanimationsystem_update(animPtr.current, t, delta, flagsPtr.current);

      // Read output (16 f32s for 1 node)
      const dataPtr = wasm.nodeanimationsystem_data_ptr(animPtr.current);
      const data = new Float32Array(wasm.memory.buffer, dataPtr, 16);

      // Apply to Three.js objects
      groupRef.current.scale.setScalar(data[0]);
      groupRef.current.position.y = data[1];

      if (outerRef.current) {
        const mat = outerRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = data[2];
      }
      if (coreRef.current) {
        const mat = coreRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = data[3];
        mat.opacity = data[4];
      }
      if (ring1Ref.current) {
        ring1Ref.current.rotation.x = data[5];
        ring1Ref.current.rotation.y = data[6];
        ring1Ref.current.rotation.z = data[7];
        const mat1 = ring1Ref.current.material as THREE.MeshBasicMaterial;
        mat1.opacity = data[8];
      }
      if (ring2Ref.current) {
        ring2Ref.current.rotation.x = data[9];
        ring2Ref.current.rotation.y = data[10];
        ring2Ref.current.rotation.z = data[11];
        const mat2 = ring2Ref.current.material as THREE.MeshBasicMaterial;
        mat2.opacity = data[12];
      }
      return;
    }

    // ── JS fallback (original implementation) ──
    const breathSpeed = active ? 4.5 : 2.0;
    const breathAmp = active ? 0.08 : 0.04;
    const scale = 1 + Math.sin(t * breathSpeed + phase) * breathAmp;
    groupRef.current.scale.setScalar(scale);

    const bobAmp = active ? 0.1 : 0.04;
    const bobSpeed = 0.7;
    groupRef.current.position.y =
      Math.sin(t * bobSpeed + phase) * bobAmp;

    if (outerRef.current) {
      const mat = outerRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        active ? 6 : 1.8,
        Math.min(1, delta * 8)
      );
    }

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      const corePulse = 1.5 + Math.sin(t * 3 + phase) * 0.5;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        active ? 8 : corePulse,
        Math.min(1, delta * 6)
      );
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        active ? 0.8 : 0.45,
        Math.min(1, delta * 5)
      );
    }

    const ringSpeed1 = active ? 1.2 : 0.4;
    const ringSpeed2 = active ? -0.8 : -0.25;

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = tilt1[0];
      ring1Ref.current.rotation.y = tilt1[1] + t * 0.15;
      ring1Ref.current.rotation.z = t * ringSpeed1;
      const mat1 = ring1Ref.current.material as THREE.MeshBasicMaterial;
      mat1.opacity = THREE.MathUtils.lerp(
        mat1.opacity,
        active ? 0.6 : 0.3,
        Math.min(1, delta * 4)
      );
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = tilt2[0];
      ring2Ref.current.rotation.y = tilt2[1] - t * 0.1;
      ring2Ref.current.rotation.z = t * ringSpeed2;
      const mat2 = ring2Ref.current.material as THREE.MeshBasicMaterial;
      mat2.opacity = THREE.MathUtils.lerp(
        mat2.opacity,
        active ? 0.45 : 0.2,
        Math.min(1, delta * 4)
      );
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      <group ref={groupRef} visible={!isDimmed}>
        {/* Inner glowing core -- semi-transparent emissive sphere */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[coreRadius, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2}
            transparent
            opacity={0.45}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>

        {/* Outer wireframe cage -- click/hover handlers here */}
        <mesh
          ref={outerRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(node.id);
          }}
          onPointerOut={() => onHover(null)}
        >
          <icosahedronGeometry args={[baseSize, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.8}
            roughness={0.4}
            metalness={0.6}
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Orbital ring 1 -- pointer-events disabled */}
        <mesh ref={ring1Ref} geometry={ring1Geom} raycast={() => null}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Orbital ring 2 -- pointer-events disabled */}
        <mesh ref={ring2Ref} geometry={ring2Geom} raycast={() => null}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* HTML label */}
      <Html
        position={[0, baseSize + 0.7, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap text-center">
          <div
            className="text-sm font-bold text-slate-200 font-mono"
            style={{ textShadow: `0 0 8px ${clusterColor}cc` }}
          >
            {displayText}
          </div>
          <div className="text-[0.65rem] text-slate-400 mt-0.5">
            {node.shortDesc}
          </div>
        </div>
      </Html>
    </group>
  );
});
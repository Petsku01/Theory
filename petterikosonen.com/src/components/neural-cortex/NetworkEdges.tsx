"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { nodes, edges } from "@/lib/cortex-data";
import {
  CLUSTER_COLORS,
  blendColors,
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
  writeF32ToWasm,
  writeU32ToWasm,
  freeWasmPtr,
  type CortexWasmExports,
} from "@/components/neural-cortex/utils";

// ── Shared geometry for energy pulses ──
const PULSE_GEOMETRY = /* @__PURE__ */ new THREE.SphereGeometry(1, 8, 8);

// ── Edge cylinder (JS fallback, also used for rendering) ──
const EdgeCylinder = React.memo(function EdgeCylinder({
  position,
  quaternion,
  length,
  color,
  opacity,
  thickness,
}: {
  position: [number, number, number];
  quaternion: THREE.Quaternion;
  length: number;
  color: string;
  opacity: number;
  thickness: number;
}) {
  return (
    <mesh position={position} quaternion={quaternion} renderOrder={0}>
      <cylinderGeometry args={[thickness, thickness, length, 6, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
});

// ── Energy Pulse (WASM-computed position) ──
function WasmEnergyPulse({
  edgeIndex,
  edgePtr,
  wasm,
  color,
  opacity,
  pulseSize = 0.05,
}: {
  edgeIndex: number;
  edgePtr: number;
  wasm: CortexWasmExports;
  color: string;
  opacity: number;
  pulseSize?: number;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!sphereRef.current || !edgePtr) return;
    const pulsePtr = wasm.edgesystem_pulse_data_ptr(edgePtr);
    const stride = wasm.edgesystem_pulse_stride(edgePtr);
    const pulseData = new Float32Array(
      wasm.memory.buffer,
      pulsePtr + edgeIndex * stride * 4,
      3
    );
    sphereRef.current.position.set(pulseData[0], pulseData[1], pulseData[2]);
  });

  return (
    <mesh ref={sphereRef} renderOrder={0} scale={pulseSize}>
      <primitive object={PULSE_GEOMETRY} attach="geometry" />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

// ── All network edges with cluster-coloured wires & travelling pulses ──
export const NetworkEdges = React.memo(function NetworkEdges({
  positions,
  selectedId,
}: {
  positions: Map<string, THREE.Vector3>;
  selectedId: string | null;
}) {
  // Build id -> cluster map
  const nodeClusterMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((n) => map.set(n.id, n.cluster));
    return map;
  }, []);

  // Compute edge data (colors, highlights, from/to positions)
  const edgeData = useMemo(() => {
    return edges
      .filter((e) => positions.has(e.from) && positions.has(e.to))
      .map((e) => {
        const fromPos = positions.get(e.from)!;
        const toPos = positions.get(e.to)!;
        const clusterFrom = nodeClusterMap.get(e.from);
        const clusterTo = nodeClusterMap.get(e.to);
        const colorFrom = CLUSTER_COLORS[clusterFrom ?? ""] ?? "#00f0ff";
        const colorTo = CLUSTER_COLORS[clusterTo ?? ""] ?? "#00f0ff";
        const edgeColor =
          clusterFrom === clusterTo
            ? colorFrom
            : blendColors(colorFrom, colorTo, 0.5);
        const highlight = selectedId === e.from || selectedId === e.to;

        return {
          key: `${e.from}-${e.to}`,
          from: fromPos,
          to: toPos,
          strength: e.strength,
          color: edgeColor,
          highlight,
        };
      });
  }, [positions, selectedId, nodeClusterMap]);

  // ── WASM path ──
  const edgePtr = useRef<number>(0);
  const fromWasmPtrRef = useRef<number>(0);
  const toWasmPtrRef = useRef<number>(0);
  const fromPositionsRef = useRef<Float32Array | null>(null);
  const toPositionsRef = useRef<Float32Array | null>(null);
  const cylinderDataRef = useRef<{
    positions: [number, number, number][];
    quaternions: THREE.Quaternion[];
    lengths: number[];
  } | null>(null);
  const [, setWasmReadyFlag] = useState(false);

  // Initialize WASM edges when edgeData changes or WASM becomes ready
  useEffect(() => {
    if (!isCortexWasmReady() || !getCortexWasm() || edgeData.length === 0) {
      if (!isCortexWasmReady()) {
        ensureCortexWasm().then((ok) => { if (ok) setWasmReadyFlag(true); });
      }
      return;
    }
    const wasm = getCortexWasm()!;

    // Free previous WASM memory if any
    if (fromWasmPtrRef.current && fromPositionsRef.current) {
      freeWasmPtr(wasm, fromWasmPtrRef.current, fromPositionsRef.current.length * 4);
    }
    if (toWasmPtrRef.current && toPositionsRef.current) {
      freeWasmPtr(wasm, toWasmPtrRef.current, toPositionsRef.current.length * 4);
    }
    if (edgePtr.current) { try { wasm.__wbg_edgesystem_free(edgePtr.current, 0); } catch {} }

    // Build flat position arrays
    const fromArr = new Float32Array(edgeData.length * 3);
    const toArr = new Float32Array(edgeData.length * 3);
    const flags = new Uint32Array(edgeData.length);

    edgeData.forEach((ed, i) => {
      fromArr[i * 3] = ed.from.x;
      fromArr[i * 3 + 1] = ed.from.y;
      fromArr[i * 3 + 2] = ed.from.z;
      toArr[i * 3] = ed.to.x;
      toArr[i * 3 + 1] = ed.to.y;
      toArr[i * 3 + 2] = ed.to.z;
      flags[i] = ed.highlight ? 1 : 0;
    });

    const ptr = wasm.edgesystem_new();
    edgePtr.current = ptr;

    const fromWasmPtr = writeF32ToWasm(wasm, fromArr);
    const toWasmPtr = writeF32ToWasm(wasm, toArr);
    const flagsWasmPtr = writeU32ToWasm(wasm, flags);
    const flagsByteLen = flags.length * 4;

    try {
      wasm.edgesystem_init_edges(ptr, fromWasmPtr, toWasmPtr, edgeData.length, flagsWasmPtr);

      // Read cylinder data back
      const cylPtr = wasm.edgesystem_cylinder_data_ptr(ptr);
      const cylStride = wasm.edgesystem_cylinder_stride(ptr);
      const cylData = new Float32Array(wasm.memory.buffer, cylPtr, edgeData.length * cylStride);

      const cylPositions: [number, number, number][] = [];
      const cylQuats: THREE.Quaternion[] = [];
      const cylLengths: number[] = [];

      for (let i = 0; i < edgeData.length; i++) {
        const base = i * cylStride;
        cylPositions.push([cylData[base], cylData[base + 1], cylData[base + 2]]);
        cylLengths.push(cylData[base + 3]);
        cylQuats.push(new THREE.Quaternion(cylData[base + 4], cylData[base + 5], cylData[base + 6], cylData[base + 7]));
      }

      cylinderDataRef.current = { positions: cylPositions, quaternions: cylQuats, lengths: cylLengths };
      fromPositionsRef.current = fromArr;
      toPositionsRef.current = toArr;
      fromWasmPtrRef.current = fromWasmPtr;
      toWasmPtrRef.current = toWasmPtr;
    } catch (err) {
      console.warn("[edges] WASM init failed, using JS fallback:", err);
      edgePtr.current = 0;
      freeWasmPtr(wasm, fromWasmPtr, fromArr.length * 4);
      freeWasmPtr(wasm, toWasmPtr, toArr.length * 4);
    } finally {
      freeWasmPtr(wasm, flagsWasmPtr, flagsByteLen);
    }
  }, [edgeData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const wasm = getCortexWasm();
      if (!wasm) return;
      if (fromWasmPtrRef.current && fromPositionsRef.current) {
        freeWasmPtr(wasm, fromWasmPtrRef.current, fromPositionsRef.current.length * 4);
      }
      if (toWasmPtrRef.current && toPositionsRef.current) {
        freeWasmPtr(wasm, toWasmPtrRef.current, toPositionsRef.current.length * 4);
      }
      if (edgePtr.current) { try { wasm.__wbg_edgesystem_free(edgePtr.current, 0); } catch {} }
      edgePtr.current = 0;
      fromWasmPtrRef.current = 0;
      toWasmPtrRef.current = 0;
    };
  }, []);

  // ── JS fallback cylinder computation ──
  const jsCylinderData = useMemo(() => {
    if (edgePtr.current) return null; // WASM is handling it
    return edgeData.map((ed) => {
      const direction = new THREE.Vector3().subVectors(ed.to, ed.from);
      const len = direction.length();
      const midpoint = new THREE.Vector3().addVectors(ed.from, ed.to).multiplyScalar(0.5);
      const orientation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
      );
      return {
        position: midpoint,
        quaternion: orientation,
        length: len,
      };
    });
  }, [edgeData]);

  // WASM per-frame pulse update (uses persistent from/to pointers, no malloc per frame)
  useFrame((state) => {
    if (!edgePtr.current || !fromWasmPtrRef.current || !toWasmPtrRef.current) return;
    const wasm = getCortexWasm();
    if (!wasm) return;
    try {
      wasm.edgesystem_update_pulses(
        edgePtr.current,
        fromWasmPtrRef.current,
        toWasmPtrRef.current,
        state.clock.elapsedTime
      );
    } catch {
      // Silent fail, pulses just won't update
    }
  });

  // ── Render ──
  const useWasm = edgePtr.current > 0 && cylinderDataRef.current !== null;
  const cylData = useWasm ? cylinderDataRef.current! : null;

  return (
    <>
      {edgeData.map((ed, i) => {
        const wireOpacity = ed.highlight ? 0.5 : 0.2;
        const pulseOpacity = ed.highlight ? 1 : 0.5;

        // Cylinder position/rotation
        let position: [number, number, number];
        let quaternion: THREE.Quaternion;
        let length: number;

        if (cylData && i < cylData.positions.length) {
          position = cylData.positions[i];
          quaternion = cylData.quaternions[i];
          length = cylData.lengths[i];
        } else if (jsCylinderData && i < jsCylinderData.length) {
          position = [jsCylinderData[i].position.x, jsCylinderData[i].position.y, jsCylinderData[i].position.z];
          quaternion = jsCylinderData[i].quaternion;
          length = jsCylinderData[i].length;
        } else {
          // Fallback: compute inline
          const direction = new THREE.Vector3().subVectors(ed.to, ed.from);
          const len = direction.length();
          const mid = new THREE.Vector3().addVectors(ed.from, ed.to).multiplyScalar(0.5);
          const quat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
          );
          position = [mid.x, mid.y, mid.z];
          quaternion = quat;
          length = len;
        }

        return (
          <group key={ed.key}>
            {/* Thin wire */}
            <EdgeCylinder
              position={position}
              quaternion={quaternion}
              length={length}
              color={ed.color}
              opacity={wireOpacity}
              thickness={0.02}
            />
            {/* Glow cylinder only when highlighted */}
            {ed.highlight && (
              <EdgeCylinder
                position={position}
                quaternion={quaternion}
                length={length}
                color={ed.color}
                opacity={0.1}
                thickness={0.04}
              />
            )}
            {/* Travelling pulse */}
            {useWasm && getCortexWasm() ? (
              <WasmEnergyPulse
                edgeIndex={i}
                edgePtr={edgePtr.current}
                wasm={getCortexWasm()!}
                color={ed.color}
                opacity={pulseOpacity}
                pulseSize={0.05}
              />
            ) : (
              <JSEnergyPulse
                from={ed.from}
                to={ed.to}
                color={ed.color}
                speed={ed.highlight ? 1.2 : 2.0}
                opacity={pulseOpacity}
                pulseSize={0.05}
              />
            )}
          </group>
        );
      })}
    </>
  );
});

// ── JS fallback EnergyPulse ──
function JSEnergyPulse({
  from,
  to,
  color,
  speed = 2,
  pulseSize = 0.06,
  opacity = 1,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  speed?: number;
  pulseSize?: number;
  opacity?: number;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(Math.random() * speed);
  const posRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    if (!sphereRef.current) return;
    const t = (state.clock.elapsedTime + offsetRef.current) % speed;
    const progress = t / speed;
    posRef.current.lerpVectors(from, to, progress);
    sphereRef.current.position.copy(posRef.current);
  });

  return (
    <mesh ref={sphereRef} renderOrder={0} scale={pulseSize}>
      <primitive object={PULSE_GEOMETRY} attach="geometry" />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}
"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { nodes, edges } from "@/lib/cortex-data";
import { CLUSTER_COLORS, blendColors } from "@/components/neural-cortex/utils";

// ── WASM edge loader ──
// Loads wasm_cortex_bg.wasm for edge computation (cylinder geometry + pulse positions).
// Same .wasm as layout/particles but separate instance to avoid import ordering issues.

interface EdgeWasmExports {
  memory: WebAssembly.Memory;
  edgesystem_new(): number;
  edgesystem_init_edges(
    ptr: number,
    from_ptr: number,
    to_ptr: number,
    edge_count: number,
    flags_ptr: number
  ): number;
  edgesystem_update_pulses(
    ptr: number,
    from_ptr: number,
    to_ptr: number,
    elapsed: number
  ): number;
  edgesystem_update_highlights(ptr: number, flags_ptr: number): void;
  edgesystem_cylinder_data_ptr(ptr: number): number;
  edgesystem_pulse_data_ptr(ptr: number): number;
  edgesystem_len(ptr: number): number;
  edgesystem_cylinder_stride(ptr: number): number;
  edgesystem_pulse_stride(ptr: number): number;
  edgesystem_is_highlighted(ptr: number, index: number): number;
  __wbg_edgesystem_free(ptr: number, del: number): void;
  __wbindgen_malloc(size: number, align: number): number;
  __wbindgen_free(ptr: number, len: number, align: number): void;
  __wbindgen_start(): void;
  __wbindgen_externrefs: WebAssembly.Table;
}

let edgeWasm: EdgeWasmExports | null = null;
let edgeWasmPromise: Promise<boolean> | null = null;
let edgeWasmReady = false;
let edgeWasmFailed = false;

async function loadEdgeWasm(): Promise<boolean> {
  const response = await fetch("/wasm/wasm_cortex_bg.wasm");
  if (!response.ok) {
    throw new Error(`WASM fetch failed: ${response.status}`);
  }
  const { instance } = await WebAssembly.instantiateStreaming(response, {
    "./wasm_cortex_bg.js": {
      __wbg___wbindgen_throw_ea4887a5f8f9a9db: function (arg0: number, arg1: number) {
        throw new Error(`WASM throw at offset ${arg0}, len ${arg1}`);
      },
      __wbindgen_init_externref_table: function () {},
    },
  });
  const exports = instance.exports as unknown as EdgeWasmExports;
  if (typeof exports.edgesystem_new !== "function") {
    throw new Error("Missing required WASM export: edgesystem_new");
  }
  if (exports.__wbindgen_start) {
    exports.__wbindgen_start();
  }
  edgeWasm = exports;
  edgeWasmReady = true;
  return true;
}

function ensureEdgeWasm(): Promise<boolean> {
  if (edgeWasm) return Promise.resolve(true);
  if (edgeWasmFailed) return Promise.resolve(false);
  edgeWasmPromise ??= loadEdgeWasm().catch((err) => {
    console.warn("[edges] WASM load failed, using JS fallback:", err);
    edgeWasmPromise = null;
    edgeWasmFailed = true;
    return false;
  });
  return edgeWasmPromise;
}

if (typeof window !== "undefined") {
  ensureEdgeWasm();
}

// ── Write Float32Array into WASM memory ──
function writeF32ToWasm(wasm: EdgeWasmExports, data: Float32Array): number {
  const byteLen = data.length * 4;
  const ptr = 0; // disabled: __wbindgen_malloc not exported
  if (ptr === 0) throw new Error("WASM malloc disabled");
  const view = new Float32Array(wasm.memory.buffer, ptr, data.length);
  view.set(data);
  return ptr;
}

// ── Write Uint32Array into WASM memory ──
function writeU32ToWasm(wasm: EdgeWasmExports, data: Uint32Array): number {
  const byteLen = data.length * 4;
  const ptr = 0; // disabled
  if (ptr === 0) throw new Error("WASM malloc failed");
  const view = new Uint32Array(wasm.memory.buffer, ptr, data.length);
  view.set(data);
  return ptr;
}

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
  wasm: EdgeWasmExports;
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
  // Persistent WASM memory pointers for from/to positions (allocated once)
  const fromWasmPtrRef = useRef<number>(0);
  const toWasmPtrRef = useRef<number>(0);
  const fromPositionsRef = useRef<Float32Array | null>(null);
  const toPositionsRef = useRef<Float32Array | null>(null);
  const cylinderDataRef = useRef<{
    positions: [number, number, number][];
    quaternions: THREE.Quaternion[];
    lengths: number[];
  } | null>(null);

  // Initialize WASM edges when edgeData changes
  useEffect(() => {
    // WASM path disabled: __wbindgen_malloc/free not exported by wasm-bindgen
    void edgeData;
  }, [edgeData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // WASM path disabled -- nothing to clean up
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
    if (!edgeWasmReady || !edgeWasm || !edgePtr.current) return;
    if (!fromWasmPtrRef.current || !toWasmPtrRef.current) return;

    const wasm = edgeWasm;
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
  const useWasm = false && edgePtr.current && cylinderDataRef.current;
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
            {useWasm && edgeWasm ? (
              <WasmEnergyPulse
                edgeIndex={i}
                edgePtr={edgePtr.current}
                wasm={edgeWasm}
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
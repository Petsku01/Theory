import * as THREE from "three";
import { clusterPositions, type CortexNode } from "@/lib/cortex-data";

// -- Per-cluster colour scheme --
export const CLUSTER_COLORS: Record<string, string> = {
  core: "#00f0ff",
  projects: "#a855f7",
  skills: "#22d3ee",
  experience: "#f59e0b",
  research: "#ef4444",
};

// -- Deterministic seeded PRNG (JS fallback) --
export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Shared WASM loader for wasm_cortex ──
// All neural-cortex components share the same WASM instance.

export interface CortexWasmExports {
  memory: WebAssembly.Memory;
  // Allocator (our custom exports)
  wasm_alloc(size: number): number;
  wasm_free(ptr: number, size: number): void;
  // Layout
  layoutsystem_new(): number;
  layoutsystem_compute_cluster(
    ptr: number, seeds_ptr: number, seeds_len: number,
    cx: number, cy: number, cz: number
  ): number;
  layoutsystem_len(ptr: number): number;
  layoutsystem_data_ptr(ptr: number): number;
  __wbg_layoutsystem_free(ptr: number, del: number): void;
  // Edge
  edgesystem_new(): number;
  edgesystem_init_edges(
    ptr: number, from_ptr: number, to_ptr: number,
    edge_count: number, flags_ptr: number
  ): number;
  edgesystem_update_pulses(
    ptr: number, from_ptr: number, to_ptr: number, elapsed: number
  ): number;
  edgesystem_update_highlights(ptr: number, flags_ptr: number): void;
  edgesystem_cylinder_data_ptr(ptr: number): number;
  edgesystem_pulse_data_ptr(ptr: number): number;
  edgesystem_len(ptr: number): number;
  edgesystem_cylinder_stride(ptr: number): number;
  edgesystem_pulse_stride(ptr: number): number;
  edgesystem_is_highlighted(ptr: number, index: number): number;
  __wbg_edgesystem_free(ptr: number, del: number): void;
  // Camera
  camerasystem_new(): number;
  camerasystem_set_position(ptr: number, cx: number, cy: number, cz: number, tx: number, ty: number, tz: number): void;
  camerasystem_set_target(ptr: number, tx: number, ty: number, tz: number): void;
  camerasystem_clear_target(ptr: number): void;
  camerasystem_user_controlled(ptr: number): void;
  camerasystem_trigger_shake(ptr: number, dx: number, dy: number, dz: number, t: number): void;
  camerasystem_update(ptr: number, delta: number, current_time: number): number;
  camerasystem_is_lerping(ptr: number): number;
  camerasystem_has_target(ptr: number): number;
  camerasystem_data_ptr(ptr: number): number;
  __wbg_camerasystem_free(ptr: number, del: number): void;
  // Scramble
  scramblesystem_new(): number;
  scramblesystem_init(ptr: number, char_codes_ptr: number, len: number): void;
  scramblesystem_tick(ptr: number): number;
  scramblesystem_reveal_next(ptr: number): void;
  scramblesystem_is_complete(ptr: number): number;
  scramblesystem_reset(ptr: number): void;
  scramblesystem_len(ptr: number): number;
  scramblesystem_data_ptr(ptr: number): number;
  scramblesystem_target_char(ptr: number, index: number): number;
  __wbg_scramblesystem_free(ptr: number, del: number): void;
  // Grid
  gridgenerator_new(): number;
  gridgenerator_generate(
    ptr: number, size: number, spacing: number,
    line_r: number, line_g: number, line_b: number, line_a: number,
    edge_r: number, edge_g: number, edge_b: number, edge_a: number
  ): number;
  gridgenerator_data_ptr(ptr: number): number;
  gridgenerator_width(ptr: number): number;
  gridgenerator_height(ptr: number): number;
  __wbg_gridgenerator_free(ptr: number, del: number): void;
  // Node animation
  nodeanimationsystem_new(): number;
  nodeanimationsystem_init(ptr: number, phases_ptr: number, tilts_ptr: number, count: number): void;
  nodeanimationsystem_update(ptr: number, elapsed: number, delta: number, flags_ptr: number): number;
  nodeanimationsystem_data_ptr(ptr: number): number;
  nodeanimationsystem_len(ptr: number): number;
  nodeanimationsystem_stride(ptr: number): number;
  __wbg_nodeanimationsystem_free(ptr: number, del: number): void;
  // Particle / burst already handled by their own components
  // Particle system (3D soft particles for NeuralCortex)
  particlesystem_new(count: number, xb: number, yb: number, zb: number): number;
  particlesystem_update(ptr: number, tx: number, ty: number, tz: number, hasTarget: number): number;
  particlesystem_data_ptr(ptr: number): number;
  particlesystem_len(ptr: number): number;
  particlesystem_stride(ptr: number): number;
  __wbg_particlesystem_free(ptr: number, del: number): void;
  // Burst
  burstsystem_new(count: number): number;
  burstsystem_update(ptr: number, is_active: number, delta: number): number;
  burstsystem_set_origin(ptr: number, x: number, y: number, z: number): void;
  burstsystem_set_color(ptr: number, r: number, g: number, b: number): void;
  burstsystem_data_ptr(ptr: number): number;
  burstsystem_len(ptr: number): number;
  burstsystem_stride(ptr: number): number;
  burstsystem_has_spawned(ptr: number): number;
  __wbg_burstsystem_free(ptr: number, del: number): void;
  // Spring cursor
  springcursor_new(): number;
  springcursor_set_target(ptr: number, x: number, y: number): void;
  springcursor_hide(ptr: number): void;
  springcursor_update(ptr: number, dt: number): void;
  springcursor_get_x(ptr: number): number;
  springcursor_get_y(ptr: number): number;
  springcursor_get_opacity(ptr: number): number;
  __wbg_springcursor_free(ptr: number, del: number): void;
  // 2D particle field
  particlefield2d_new(): number;
  particlefield2d_init(ptr: number, n: number, w: number, h: number, seed: number): void;
  particlefield2d_update(ptr: number, w: number, h: number, mx: number, my: number, mouse_active: number, time: number): void;
  particlefield2d_count(ptr: number): number;
  particlefield2d_data_ptr(ptr: number): number;
  particlefield2d_stride(ptr: number): number;
  __wbg_particlefield2d_free(ptr: number, del: number): void;
  // WASM init
  __wbindgen_start?(): void;
  __wbindgen_externrefs?: WebAssembly.Table;
}

// ── Unified WASM status tracking ──
// Both wasm_cortex and wasm_particles report their status here.
// WasmBadge reads the unified status.
type WasmStatus = "loading" | "wasm" | "js";

let _cortexWasmStatus: WasmStatus = "loading";
let _particleWasmStatus: WasmStatus = "loading";

export function setCortexWasmStatus(status: WasmStatus) {
  _cortexWasmStatus = status;
}

export function setParticleWasmStatus(status: WasmStatus) {
  _particleWasmStatus = status;
}

export function getUnifiedWasmStatus(): WasmStatus {
  if (_cortexWasmStatus === "wasm" || _particleWasmStatus === "wasm") return "wasm";
  if (_cortexWasmStatus === "loading" || _particleWasmStatus === "loading") return "loading";
  return "js";
}

let cortexWasm: CortexWasmExports | null = null;
let cortexWasmPromise: Promise<boolean> | null = null;
let cortexWasmReady = false;
let cortexWasmFailed = false;

async function loadCortexWasm(): Promise<boolean> {
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
  const exports = instance.exports as unknown as CortexWasmExports;
  if (typeof exports.wasm_alloc !== "function") {
    throw new Error("Missing required WASM export: wasm_alloc");
  }
  if (exports.__wbindgen_start) {
    exports.__wbindgen_start();
  }
  cortexWasm = exports;
  cortexWasmReady = true;
  setCortexWasmStatus("wasm");
  return true;
}

export function ensureCortexWasm(): Promise<boolean> {
  if (cortexWasm) return Promise.resolve(true);
  if (cortexWasmFailed) return Promise.resolve(false);
  cortexWasmPromise ??= loadCortexWasm().catch((err) => {
    console.warn("[cortex] WASM load failed, using JS fallback:", err);
    cortexWasmPromise = null;
    cortexWasmFailed = true;
    setCortexWasmStatus("js");
    return false;
  });
  return cortexWasmPromise;
}

export function isCortexWasmReady(): boolean {
  return cortexWasmReady;
}

export function getCortexWasm(): CortexWasmExports | null {
  return cortexWasm;
}

// Kick off WASM load immediately on client
if (typeof window !== "undefined") {
  ensureCortexWasm();
}

// ── Write Uint32Array into WASM memory via wasm_alloc ──
export function writeU32ToWasm(wasm: CortexWasmExports, data: Uint32Array): number {
  const byteLen = data.length * 4;
  const ptr = wasm.wasm_alloc(byteLen);
  if (ptr === 0) throw new Error("wasm_alloc failed for U32 array");
  const view = new Uint32Array(wasm.memory.buffer, ptr, data.length);
  view.set(data);
  return ptr;
}

// ── Write Float32Array into WASM memory via wasm_alloc ──
export function writeF32ToWasm(wasm: CortexWasmExports, data: Float32Array): number {
  const byteLen = data.length * 4;
  const ptr = wasm.wasm_alloc(byteLen);
  if (ptr === 0) throw new Error("wasm_alloc failed for F32 array");
  const view = new Float32Array(wasm.memory.buffer, ptr, data.length);
  view.set(data);
  return ptr;
}

// ── Write Uint8Array into WASM memory via wasm_alloc ──
export function writeU8ToWasm(wasm: CortexWasmExports, data: Uint8Array): number {
  const byteLen = data.length;
  const ptr = wasm.wasm_alloc(byteLen);
  if (ptr === 0) throw new Error("wasm_alloc failed for U8 array");
  const view = new Uint8Array(wasm.memory.buffer, ptr, data.length);
  view.set(data);
  return ptr;
}

// ── Free WASM memory ──
export function freeWasmPtr(wasm: CortexWasmExports, ptr: number, byteLen: number): void {
  if (ptr !== 0) {
    try { wasm.wasm_free(ptr, byteLen); } catch {}
  }
}

// ── computePositions: WASM-accelerated with JS fallback ──
export function computePositions(nodeList: CortexNode[]): Map<string, THREE.Vector3> {
  const pos = new Map<string, THREE.Vector3>();
  const clusterNodes = new Map<string, CortexNode[]>();
  for (const n of nodeList) {
    const arr = clusterNodes.get(n.cluster) ?? [];
    arr.push(n);
    clusterNodes.set(n.cluster, arr);
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  // WASM path
  if (cortexWasmReady && cortexWasm) {
    const wasm = cortexWasm;
    const layoutPtr = wasm.layoutsystem_new();
    try {
      for (const [cluster, clusterList] of clusterNodes) {
        const center = new THREE.Vector3(
          ...(clusterPositions[cluster] ?? [0, 0, 0])
        );
        const count = clusterList.length;

        if (count === 1) {
          pos.set(clusterList[0].id, center.clone());
          continue;
        }

        // Build per-node seeds matching JS: node.id.length * 127 + i * 31
        const seeds = new Uint32Array(count);
        clusterList.forEach((node, i) => {
          seeds[i] = node.id.length * 127 + i * 31;
        });

        // Write seeds to WASM memory
        const seedsPtr = writeU32ToWasm(wasm, seeds);
        const seedsByteLen = seeds.length * 4;

        try {
          wasm.layoutsystem_compute_cluster(
            layoutPtr, seedsPtr, count,
            center.x, center.y, center.z
          );

          // Read results
          const len = wasm.layoutsystem_len(layoutPtr);
          const dataPtr = wasm.layoutsystem_data_ptr(layoutPtr);
          const positions = new Float32Array(wasm.memory.buffer, dataPtr, len * 3);

          clusterList.forEach((node, i) => {
            pos.set(node.id, new THREE.Vector3(
              positions[i * 3],
              positions[i * 3 + 1],
              positions[i * 3 + 2]
            ));
          });
        } finally {
          freeWasmPtr(wasm, seedsPtr, seedsByteLen);
        }
      }

      // If WASM filled all positions, return early
      if (pos.size === nodeList.length) {
        return pos;
      }
      // Otherwise fall through to JS and fill missing
      pos.clear();
    } catch (err) {
      console.warn("[layout] WASM compute failed, falling back to JS:", err);
      pos.clear();
    } finally {
      try { wasm.__wbg_layoutsystem_free(layoutPtr, 0); } catch {}
    }
  }

  // JS fallback
  for (const [cluster, clusterList] of clusterNodes) {
    const center = new THREE.Vector3(
      ...(clusterPositions[cluster] ?? [0, 0, 0])
    );
    const count = clusterList.length;

    if (count === 1) {
      pos.set(clusterList[0].id, center.clone());
      continue;
    }

    const spread = 3.2 + count * 0.3;
    clusterList.forEach((node, i) => {
      const angle = i * goldenAngle;
      const r = Math.sqrt((i + 0.5) / count) * spread;
      const rng = seededRandom(node.id.length * 127 + i * 31);
      const jitter = new THREE.Vector3(
        (rng() - 0.5) * 0.3,
        (rng() - 0.5) * 1.0,
        (rng() - 0.5) * 0.3
      );
      const offset = new THREE.Vector3(
        Math.cos(angle) * r,
        Math.sin(angle * 0.7 + i * 1.1) * 0.8,
        Math.sin(angle) * r
      ).add(jitter);
      pos.set(node.id, center.clone().add(offset));
    });
  }
  return pos;
}

// -- Soft-circle texture for particles --
export function createSoftCircleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 64);
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.8, "rgba(255,255,255,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// -- Helper: blend two hex colours --
export function blendColors(a: string, b: string, t: number = 0.5): string {
  const colA = new THREE.Color(a);
  const colB = new THREE.Color(b);
  return colA.clone().lerp(colB, t).getStyle();
}
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

// ── WASM layout loader ──
// Loads wasm_cortex_bg.wasm directly via fetch + WebAssembly.instantiateStreaming.
// No JS glue import (Next.js bundler fails with wasm-bindgen JS glue).
// Falls back to pure JS if WASM fails to load.

interface LayoutWasmExports {
  memory: WebAssembly.Memory;
  layoutsystem_new(): number;
  layoutsystem_compute_cluster(
    ptr: number, seeds_ptr: number, seeds_len: number,
    cx: number, cy: number, cz: number
  ): number;
  layoutsystem_len(ptr: number): number;
  layoutsystem_data_ptr(ptr: number): number;
  __wbg_layoutsystem_free(ptr: number, del: number): void;
  __wbindgen_malloc(size: number, align: number): number;
  __wbindgen_realloc(ptr: number, old_size: number, new_size: number, align: number): number;
  __wbindgen_free(ptr: number, len: number, align: number): void;
  __wbindgen_start(): void;
  __wbindgen_externrefs: WebAssembly.Table;
}

let layoutWasm: LayoutWasmExports | null = null;
let layoutWasmPromise: Promise<boolean> | null = null;
let layoutWasmReady = false;
let layoutWasmFailed = false;

async function loadLayoutWasm(): Promise<boolean> {
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
  const exports = instance.exports as unknown as LayoutWasmExports;
  if (typeof exports.layoutsystem_new !== "function") {
    throw new Error("Missing required WASM export: layoutsystem_new");
  }
  if (exports.__wbindgen_start) {
    exports.__wbindgen_start();
  }
  layoutWasm = exports;
  layoutWasmReady = true;
  return true;
}

function ensureLayoutWasm(): Promise<boolean> {
  if (layoutWasm) return Promise.resolve(true);
  if (layoutWasmFailed) return Promise.resolve(false);
  layoutWasmPromise ??= loadLayoutWasm().catch((err) => {
    console.warn("[layout] WASM load failed, using JS fallback:", err);
    layoutWasmPromise = null;
    layoutWasmFailed = true;
    return false;
  });
  return layoutWasmPromise;
}

// Kick off WASM load immediately on client
if (typeof window !== "undefined") {
  ensureLayoutWasm();
}

// ── Write Uint32Array seeds into WASM memory ──
function writeSeedsToWasm(wasm: LayoutWasmExports, seeds: Uint32Array): number {
  const byteLen = seeds.length * 4; // u32 = 4 bytes
  const ptr = 0; // disabled: __wbindgen_malloc not exported
  if (ptr === 0) throw new Error("WASM malloc failed");
  const view = new Uint32Array(wasm.memory.buffer, ptr, seeds.length);
  view.set(seeds);
  return ptr;
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

  // WASM path disabled: __wbindgen_malloc/free not exported by wasm-bindgen

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
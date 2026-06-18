"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// ── WASM grid loader ──
// Loads wasm_cortex_bg.wasm for grid texture generation.

interface GridWasmExports {
  memory: WebAssembly.Memory;
  gridgenerator_new(): number;
  gridgenerator_generate(
    ptr: number, size: number, spacing: number,
    lr: number, lg: number, lb: number, la: number,
    er: number, eg: number, eb: number, ea: number
  ): number;
  gridgenerator_data_ptr(ptr: number): number;
  gridgenerator_len(ptr: number): number;
  gridgenerator_width(ptr: number): number;
  gridgenerator_height(ptr: number): number;
  __wbg_gridgenerator_free(ptr: number, del: number): void;
  __wbindgen_start(): void;
  __wbindgen_externrefs: WebAssembly.Table;
}

let gridWasm: GridWasmExports | null = null;
let gridWasmPromise: Promise<boolean> | null = null;
let gridWasmReady = false;
let gridWasmFailed = false;

async function loadGridWasm(): Promise<boolean> {
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
  const exports = instance.exports as unknown as GridWasmExports;
  if (typeof exports.gridgenerator_new !== "function") {
    throw new Error("Missing required WASM export: gridgenerator_new");
  }
  if (exports.__wbindgen_start) {
    exports.__wbindgen_start();
  }
  gridWasm = exports;
  gridWasmReady = true;
  return true;
}

function ensureGridWasm(): Promise<boolean> {
  if (gridWasm) return Promise.resolve(true);
  if (gridWasmFailed) return Promise.resolve(false);
  gridWasmPromise ??= loadGridWasm().catch((err) => {
    console.warn("[grid] WASM load failed, using JS fallback:", err);
    gridWasmPromise = null;
    gridWasmFailed = true;
    return false;
  });
  return gridWasmPromise;
}

if (typeof window !== "undefined") {
  ensureGridWasm();
}

const GRID_SIZE = 1024;
const GRID_SPACING = 64;

// ── Canvas-textured grid floor (WASM-generated DataTexture, JS fallback) ──
export function CyberGrid() {
  const textureRef = useRef<THREE.DataTexture | THREE.CanvasTexture | null>(null);
  const gridPtr = useRef<number>(0);
  const [, setWasmReadyFlag] = useState(false);

  // JS fallback: create grid texture via canvas
  const createCanvasTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.strokeStyle = "rgba(0, 240, 255, 0.12)";
    ctx.lineWidth = 2;
    for (let x = GRID_SPACING; x < canvas.width; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = GRID_SPACING; y < canvas.height; y += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.85, "transparent");
    gradient.addColorStop(1, "rgba(10,10,15,1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // Create texture (WASM or JS)
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;

    // Try WASM path
    if (gridWasmReady && gridWasm) {
      const wasm = gridWasm;
      const ptr = wasm.gridgenerator_new();
      gridPtr.current = ptr;

      try {
        // Grid line color: rgba(0, 240, 255, 0.12) -> 0,240,255,31
        // Edge color: rgba(10,10,15,1) -> 10,10,15,255
        wasm.gridgenerator_generate(
          ptr, GRID_SIZE, GRID_SPACING,
          0, 240, 255, 31,  // line color
          10, 10, 15, 255   // edge color
        );

        const len = wasm.gridgenerator_len(ptr);
        const dataPtr = wasm.gridgenerator_data_ptr(ptr);
        const pixels = new Uint8Array(wasm.memory.buffer, dataPtr, len);

        // Copy pixels (DataTexture needs its own buffer)
        const pixelCopy = new Uint8Array(pixels);

        const tex = new THREE.DataTexture(
          pixelCopy,
          GRID_SIZE,
          GRID_SIZE,
          THREE.RGBAFormat
        );
        tex.needsUpdate = true;
        textureRef.current = tex;
        return tex;
      } catch (err) {
        console.warn("[grid] WASM generate failed, using JS:", err);
      }
    }

    // JS fallback
    return createCanvasTexture();
  }, []);

  // Poll for WASM readiness if not ready yet (recreate texture when WASM loads)
  useEffect(() => {
    if (gridWasmReady || gridWasmFailed) return;
    ensureGridWasm().then((ok) => {
      if (ok) setWasmReadyFlag(true);
    });
  }, []);

  // Dispose texture + WASM on unmount
  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (gridPtr.current && gridWasm) {
        try { gridWasm.__wbg_gridgenerator_free(gridPtr.current, 0); } catch {}
        gridPtr.current = 0;
      }
    };
  }, []);

  if (!texture) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
} from "@/components/neural-cortex/utils";

// Grid floor using WASM-generated DataTexture, JS fallback.
// Uses the shared cortex WASM instance from utils.ts.

const GRID_SIZE = 1024;
const GRID_SPACING = 64;

export function CyberGrid() {
  const textureRef = useRef<THREE.DataTexture | THREE.CanvasTexture | null>(null);
  const gridPtr = useRef<number>(0);
  const [, setWasmReadyFlag] = useState(false);

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

  const generateWasmTexture = (): THREE.DataTexture | null => {
    const wasm = getCortexWasm();
    if (!wasm) return null;

    const ptr = wasm.gridgenerator_new();
    gridPtr.current = ptr;

    try {
      wasm.gridgenerator_generate(
        ptr, GRID_SIZE, GRID_SPACING,
        0, 240, 255, 31,
        10, 10, 15, 255
      );

      const len = wasm.gridgenerator_len(ptr);
      const dataPtr = wasm.gridgenerator_data_ptr(ptr);
      const pixels = new Uint8Array(wasm.memory.buffer, dataPtr, len);
      const pixelCopy = new Uint8Array(pixels);

      const tex = new THREE.DataTexture(
        pixelCopy,
        GRID_SIZE,
        GRID_SIZE,
        THREE.RGBAFormat
      );
      tex.needsUpdate = true;
      return tex;
    } catch (err) {
      console.warn("[grid] WASM generate failed, using JS:", err);
      return null;
    }
  };

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;

    if (isCortexWasmReady()) {
      const tex = generateWasmTexture();
      if (tex) {
        textureRef.current = tex;
        return tex;
      }
    }

    return createCanvasTexture();
  }, []);

  useEffect(() => {
    if (isCortexWasmReady()) return;
    ensureCortexWasm().then((ok) => {
      if (ok) setWasmReadyFlag(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (gridPtr.current) {
        try { getCortexWasm()?.__wbg_gridgenerator_free(gridPtr.current, 0); } catch {}
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
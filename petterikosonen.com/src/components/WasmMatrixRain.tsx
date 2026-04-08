"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const GLYPHS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * WASM-powered Matrix Rain.
 * Column state management runs entirely in WebAssembly.
 * JS reads column positions/chars from WASM linear memory and renders to canvas.
 */
export default function WasmMatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let wasm: {
      memory: WebAssembly.Memory;
      init: (w: number, h: number, seed: number) => void;
      resize: (w: number, h: number) => void;
      update: () => void;
      getDataPtr: () => number;
      getNumCols: () => number;
    } | null = null;
    let lastFrame = 0;
    const frameInterval = 1000 / 30; // 30fps
    let cancelled = false;

    async function loadWasm() {
      try {
        const resp = await fetch("/matrix_rain.wasm");
        const bytes = await resp.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, {
          env: { abort: () => {} },
        });

        if (cancelled) return;

        wasm = instance.exports as typeof wasm;
        doResize();
        setReady(true);
        raf = requestAnimationFrame(draw);
      } catch (err) {
        console.warn("[WASM] Failed to load matrix rain:", err);
      }
    }

    function doResize() {
      const parent = canvas!.parentElement;
      if (!parent || !wasm) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas!.width = w;
      canvas!.height = h;
      wasm.init(w, h, (Date.now() & 0xFFFFFFFF) >>> 0);
    }

    function draw(time: number) {
      if (time - lastFrame < frameInterval) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrame = time;

      if (!wasm || !canvas) return;

      const w = canvas.width;
      const h = canvas.height;

      // Update WASM state
      wasm.update();

      // Fade existing content
      ctx!.fillStyle = "rgba(5, 7, 10, 0.08)";
      ctx!.fillRect(0, 0, w, h);

      // Read column data from WASM memory
      const numCols = wasm.getNumCols();
      const ptr = wasm.getDataPtr();
      const data = new DataView(wasm.memory.buffer, ptr, numCols * 16);

      ctx!.font = "500 14px 'IBM Plex Mono', monospace";
      ctx!.fillStyle = "rgba(57, 255, 136, 0.14)";

      for (let i = 0; i < numCols; i++) {
        const off = i * 16;
        const y = data.getFloat32(off, true);
        const charIndex = data.getInt32(off + 8, true);
        const brightness = data.getFloat32(off + 12, true);
        const x = i * 18;

        const glyph = GLYPHS[Math.abs(charIndex) % GLYPHS.length];
        ctx!.globalAlpha = brightness;
        ctx!.fillText(glyph, x, y);
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(draw);
      }
    };

    loadWasm();

    const observer = new ResizeObserver(() => {
      if (wasm) doResize();
    });
    observer.observe(canvas.parentElement ?? canvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? "opacity-80" : "opacity-0"}`}
      aria-hidden="true"
    />
  );
}

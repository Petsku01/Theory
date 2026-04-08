"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Mirrors the AssemblyScript particle struct layout (48 bytes per particle) */
const STRIDE = 48; // bytes
const F32 = 4;     // sizeof(f32)

interface ParticleExports {
  memory: WebAssembly.Memory;
  init: (n: number, w: number, h: number, seed: number) => void;
  update: (
    w: number,
    h: number,
    mx: number,
    my: number,
    mouseActive: number,
    time: number
  ) => void;
  count: WebAssembly.Global;
  getDataPointer: () => number;
}

export interface WasmParticleEngine {
  ready: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * Custom hook that loads a WASM particle physics engine and drives
 * a full-screen canvas animation loop at native refresh rate.
 *
 * The WASM module handles all physics (position, velocity, mouse attraction,
 * damping, lifecycle). JS only reads the linear memory for rendering.
 */
export function useWasmParticles(
  particleCount = 1500,
  enabled = true
): WasmParticleEngine {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const wasmRef = useRef<ParticleExports | null>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  const render = useCallback(() => {
    const wasm = wasmRef.current;
    const canvas = canvasRef.current;
    if (!wasm || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      // Reinit particles on resize
      wasm.init(particleCount, w, h, (Date.now() & 0xFFFFFFFF) >>> 0);
    }

    const mouse = mouseRef.current;
    wasm.update(
      w,
      h,
      mouse.x,
      mouse.y,
      mouse.active ? 1 : 0,
      performance.now()
    );

    ctx.clearRect(0, 0, w, h);

    const count = wasm.count.value as number;
    const ptr = wasm.getDataPointer();
    const data = new Float32Array(wasm.memory.buffer, ptr, count * (STRIDE / F32));

    for (let i = 0; i < count; i++) {
      const base = i * (STRIDE / F32);
      const x = data[base];          // offset 0
      const y = data[base + 1];      // offset 4
      const size = data[base + 6];   // offset 24
      const hue = data[base + 7];    // offset 28
      const opacity = data[base + 10]; // offset 40

      if (opacity <= 0.01) continue;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${opacity * 0.6})`;
      ctx.fill();

      // Glow effect for larger particles
      if (size > 2) {
        ctx.beginPath();
        ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${opacity * 0.08})`;
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(render);
  }, [particleCount]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function loadWasm() {
      try {
        const response = await fetch("/particles.wasm");
        const bytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, {
          env: {
            abort: () => {},
            "Math.sqrt": Math.sqrt,
            "Math.sin": Math.sin,
            "Math.cos": Math.cos,
          },
        });

        if (cancelled) return;

        const exports = instance.exports as unknown as ParticleExports;
        wasmRef.current = exports;

        const canvas = canvasRef.current;
        if (canvas) {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          exports.init(particleCount, w, h, (Date.now() & 0xFFFFFFFF) >>> 0);
        }

        setReady(true);
        rafRef.current = requestAnimationFrame(render);
      } catch (err) {
        console.warn("[WASM] Failed to load particle engine:", err);
      }
    }

    loadWasm();

    // Mouse tracking
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [enabled, particleCount, render]);

  return { ready, canvasRef };
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * WASM-powered particle field.
 * Loaded directly instead of via next/dynamic to avoid BAILOUT_TO_CLIENT_SIDE_RENDERING.
 * WASM is fetched on mount; canvas only renders after successful instantiation.
 */

interface ParticleExports {
  memory: WebAssembly.Memory;
  init: (n: number, w: number, h: number, seed: number) => void;
  update: (w: number, h: number, mx: number, my: number, mouseActive: number, time: number) => void;
  count: WebAssembly.Global;
  getDataPointer: () => number;
}

const STRIDE = 48;
const F32 = 4;

interface Props {
  particleCount?: number;
  className?: string;
}

export default function WasmParticleField({ particleCount = 1200, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const wasmRef = useRef<ParticleExports | null>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const readyRef = useRef(false);
  const [, forceUpdate] = useState(0);

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
      wasm.init(particleCount, w, h, (Date.now() & 0xFFFFFFFF) >>> 0);
    }

    const mouse = mouseRef.current;
    wasm.update(w, h, mouse.x, mouse.y, mouse.active ? 1 : 0, performance.now());

    ctx.clearRect(0, 0, w, h);

    const count = wasm.count.value as number;
    const ptr = wasm.getDataPointer();
    const data = new Float32Array(wasm.memory.buffer, ptr, count * (STRIDE / F32));

    for (let i = 0; i < count; i++) {
      const base = i * (STRIDE / F32);
      const x = data[base];
      const y = data[base + 1];
      const size = data[base + 6];
      const hue = data[base + 7];
      const opacity = data[base + 10];

      if (opacity <= 0.01) continue;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${opacity * 0.6})`;
      ctx.fill();

      if (size > 2) {
        ctx.beginPath();
        ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${opacity * 0.08})`;
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(() => render());
  }, [particleCount]);

  useEffect(() => {
    setMounted(true);
    if (reducedMotion) return;

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

        readyRef.current = true;
        forceUpdate(1);
        rafRef.current = requestAnimationFrame(() => render());
      } catch (err) {
        console.warn("[WASM] Failed to load particle engine:", err);
      }
    }

    loadWasm();

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
  }, [reducedMotion, particleCount, render]);

  if (!mounted || reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 h-full w-full transition-opacity duration-1000 ${
        readyRef.current ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}
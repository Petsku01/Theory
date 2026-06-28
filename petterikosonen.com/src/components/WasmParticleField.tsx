"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
} from "@/components/neural-cortex/utils";

// 2D particle field for canvas background, now using the unified cortex WASM.
// Replaces the old standalone particles.wasm.

const STRIDE = 12; // f32s per particle in ParticleField2D
const F32 = 4;

interface ParticleField2DExports {
  particlefield2d_new(): number;
  particlefield2d_init(ptr: number, n: number, w: number, h: number, seed: number): void;
  particlefield2d_update(
    ptr: number,
    w: number,
    h: number,
    mx: number,
    my: number,
    mouse_active: number,
    time: number,
  ): void;
  particlefield2d_count(ptr: number): number;
  particlefield2d_data_ptr(ptr: number): number;
  particlefield2d_stride(ptr: number): number;
  __wbg_particlefield2d_free(ptr: number, del: number): void;
}

interface Props {
  particleCount?: number;
  className?: string;
}

export default function WasmParticleField({ particleCount = 1200, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const fieldPtr = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const sizeRef = useRef({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  const render = useCallback(() => {
    const wasm = getCortexWasm() as unknown as ParticleField2DExports | null;
    const canvas = canvasRef.current;
    if (!wasm || !canvas || !fieldPtr.current) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const mouse = mouseRef.current;

    wasm.particlefield2d_update(
      fieldPtr.current,
      w, h,
      mouse.x, mouse.y,
      mouse.active ? 1 : 0,
      performance.now(),
    );

    ctx.clearRect(0, 0, w, h);

    const count = wasm.particlefield2d_count(fieldPtr.current);
    const ptr = wasm.particlefield2d_data_ptr(fieldPtr.current);
    const data = new Float32Array(
      (getCortexWasm()!).memory.buffer,
      ptr,
      count * STRIDE,
    );

    for (let i = 0; i < count; i++) {
      const base = i * STRIDE;
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
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      const wasm = getCortexWasm() as unknown as ParticleField2DExports;
      if (!wasm) return;

      fieldPtr.current = wasm.particlefield2d_new();

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sizeRef.current = { w, h };
        wasm.particlefield2d_init(
          fieldPtr.current,
          particleCount, w, h,
          (Date.now() & 0xFFFFFFFF) >>> 0,
        );
      }

      setReady(true);
      rafRef.current = requestAnimationFrame(() => render());
    };

    if (isCortexWasmReady()) {
      init();
    } else {
      ensureCortexWasm().then((ok) => {
        if (ok) init();
      });
    }

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

    const onResize = () => {
      const canvas = canvasRef.current;
      const wasm = getCortexWasm() as unknown as ParticleField2DExports | null;
      if (!canvas || !wasm || !fieldPtr.current) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      wasm.particlefield2d_update(fieldPtr.current, w, h, 0, 0, 0, performance.now());
    };

    const resizeObserver = new ResizeObserver(onResize);
    if (canvasRef.current) resizeObserver.observe(canvasRef.current);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      resizeObserver.disconnect();
      const wasm = getCortexWasm() as unknown as ParticleField2DExports | null;
      if (wasm && fieldPtr.current) {
        try { wasm.__wbg_particlefield2d_free(fieldPtr.current, 0); } catch {}
        fieldPtr.current = 0;
      }
    };
  }, [reducedMotion, particleCount, render]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 h-full w-full transition-opacity duration-1000 ${
        ready ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}
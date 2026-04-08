"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * WASM-powered interactive mouse trail background.
 * Trail point management, path interpolation, age decay, and color computation
 * all run in WebAssembly. JS only reads point data for canvas rendering.
 */

interface WasmExports {
  memory: WebAssembly.Memory;
  init: () => void;
  update: (mouseX: number, mouseY: number, mouseActive: number) => void;
  getDataPtr: () => number;
  getCount: () => number;
  getMaxAge: () => number;
  getPointOffset: (i: number) => number;
}

export default function WasmInteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wasmRef = useRef<WasmExports | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);
  const reduced = usePrefersReducedMotion();

  const render = useCallback(() => {
    const wasm = wasmRef.current;
    const canvas = canvasRef.current;
    if (!wasm || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    const mouse = mouseRef.current;
    wasm.update(mouse.x, mouse.y, mouse.active ? 1 : 0);

    // Fade existing content
    ctx.fillStyle = "rgba(2, 6, 23, 0.08)";
    ctx.fillRect(0, 0, w, h);

    const count = wasm.getCount();
    const maxAge = wasm.getMaxAge();

    if (count < 2) {
      // Still draw cursor glow even with no trail
      if (mouse.active && mouse.x > 0) {
        drawCursorGlow(ctx, mouse.x, mouse.y);
      }
      rafRef.current = requestAnimationFrame(render);
      return;
    }

    // Read point data from WASM memory and draw trail segments
    const mem = wasm.memory.buffer;

    // Draw trail lines
    for (let i = 1; i < count; i++) {
      const prevOff = wasm.getPointOffset(i - 1);
      const currOff = wasm.getPointOffset(i);

      const prevData = new Float32Array(mem, prevOff, 6);
      const currData = new Float32Array(mem, currOff, 6);

      const prevX = prevData[0], prevY = prevData[1], prevAge = prevData[2];
      const currX = currData[0], currY = currData[1], currAge = currData[2];
      const cr = currData[3], cg = currData[4], cb = currData[5];

      const prevAlpha = 1 - prevAge / maxAge;
      const currAlpha = 1 - currAge / maxAge;

      if (prevAlpha < 0.05 && currAlpha < 0.05) continue;

      const t = currAge / maxAge;
      const gradient = ctx.createLinearGradient(prevX, prevY, currX, currY);
      gradient.addColorStop(0, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${prevAlpha * 0.8})`);
      gradient.addColorStop(1, `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${currAlpha * 0.8})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2 + (1 - t) * 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
    }

    // Draw glow around recent points
    const glowStart = Math.max(0, count - 15);
    for (let i = glowStart; i < count; i++) {
      const off = wasm.getPointOffset(i);
      const data = new Float32Array(mem, off, 6);
      const px = data[0], py = data[1], age = data[2];

      const alpha = (1 - age / maxAge) * 0.4;
      const size = (1 - age / maxAge) * 20;

      if (alpha > 0.05) {
        const grad = ctx.createRadialGradient(px, py, 0, px, py, size);
        grad.addColorStop(0, `rgba(34, 211, 238, ${alpha})`);
        grad.addColorStop(0.5, `rgba(139, 92, 246, ${alpha * 0.5})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cursor glow
    if (mouse.active && mouse.x > 0) {
      drawCursorGlow(ctx, mouse.x, mouse.y);
    }

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    if (reduced) return;

    let cancelled = false;

    async function loadWasm() {
      try {
        const resp = await fetch("/mouse_trail.wasm");
        const bytes = await resp.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, {
          env: {
            abort: () => {},
            "Math.sqrt": Math.sqrt,
          },
        });

        if (cancelled) return;

        const exports = instance.exports as unknown as WasmExports;
        wasmRef.current = exports;
        exports.init();
        setReady(true);
        rafRef.current = requestAnimationFrame(render);
      } catch (err) {
        console.warn("[WASM] Failed to load mouse trail engine:", err);
      }
    }

    loadWasm();

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const onMouseLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [reduced, render]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-700 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    />
  );
}

function drawCursorGlow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
  gradient.addColorStop(0, "rgba(34, 211, 238, 0.3)");
  gradient.addColorStop(0.4, "rgba(139, 92, 246, 0.15)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

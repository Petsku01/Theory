"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * WASM-powered 3D icosahedron renderer.
 * Replaces the Three.js SecurityShield3D with a pure canvas + WASM implementation.
 *
 * All 3D math (rotation, projection, color cycling, particle orbits)
 * runs in WebAssembly. JS only reads projected 2D coordinates from
 * WASM linear memory and draws to canvas.
 */

interface WasmExports {
  memory: WebAssembly.Memory;
  init: (seed: number) => void;
  update: (dt: number, time: number, cx: number, cy: number, fov: number, mx: number, my: number) => void;
  getProjectedPtr: () => number;
  getInnerProjPtr: () => number;
  getEdgesPtr: () => number;
  getParticlesPtr: () => number;
  getSparklesPtr: () => number;
  getNumVertices: () => number;
  getNumEdges: () => number;
  getNumParticles: () => number;
  getNumSparkles: () => number;
  currentR: WebAssembly.Global;
  currentG: WebAssembly.Global;
  currentB: WebAssembly.Global;
}

function hslToRgb(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export default function WasmSecurityShield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wasmRef = useRef<WasmExports | null>(null);
  const rafRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const lastTimeRef = useRef(0);
  const [ready, setReady] = useState(false);
  const reduced = usePrefersReducedMotion();

  const render = useCallback((timestamp: number) => {
    const wasm = wasmRef.current;
    const canvas = canvasRef.current;
    if (!wasm || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;
    const time = timestamp / 1000;

    const cx = w / 2;
    const cy = h / 2;
    const fov = Math.min(w, h) * 0.35;

    wasm.update(dt, time, cx, cy, fov, mouseRef.current.x, mouseRef.current.y);

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Read current color from WASM
    const r = Math.round((wasm.currentR.value as number) * 255);
    const g = Math.round((wasm.currentG.value as number) * 255);
    const b = Math.round((wasm.currentB.value as number) * 255);
    const mainColor = `rgb(${r},${g},${b})`;
    const mainColorAlpha = (a: number) => `rgba(${r},${g},${b},${a})`;

    const numVerts = wasm.getNumVertices();
    const numEdges = wasm.getNumEdges();
    const numParticles = wasm.getNumParticles();
    const numSparkles = wasm.getNumSparkles();

    const projPtr = wasm.getProjectedPtr();
    const innerPtr = wasm.getInnerProjPtr();
    const edgesPtr = wasm.getEdgesPtr();
    const particlesPtr = wasm.getParticlesPtr();
    const sparklesPtr = wasm.getSparklesPtr();

    const proj = new Float32Array(wasm.memory.buffer, projPtr, numVerts * 2);
    const inner = new Float32Array(wasm.memory.buffer, innerPtr, numVerts * 2);
    const edges = new Int32Array(wasm.memory.buffer, edgesPtr, numEdges * 2);
    const particles = new Float32Array(wasm.memory.buffer, particlesPtr, numParticles * 7);
    const sparkles = new Float32Array(wasm.memory.buffer, sparklesPtr, numSparkles * 6);

    // ── Draw sparkles (behind everything) ──
    for (let i = 0; i < numSparkles; i++) {
      const px = sparkles[i * 6 + 3];
      const py = sparkles[i * 6 + 4];
      const alpha = sparkles[i * 6 + 5];
      if (alpha < 0.05) continue;

      const size = 1 + alpha * 2;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167,139,250,${alpha * 0.4})`;
      ctx.fill();
    }

    // ── Draw orbiting particles ──
    for (let i = 0; i < numParticles; i++) {
      const px = particles[i * 7 + 3]; // projected X
      const py = particles[i * 7 + 4]; // projected Y
      const brightness = particles[i * 7 + 5];
      const hue = particles[i * 7 + 6];

      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${brightness * 0.7})`;
      ctx.fill();
    }

    // ── Draw inner icosahedron (glow) ──
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Inner edges
    ctx.strokeStyle = mainColorAlpha(0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < numEdges; i++) {
      const a = edges[i * 2];
      const b2 = edges[i * 2 + 1];
      ctx.moveTo(inner[a * 2], inner[a * 2 + 1]);
      ctx.lineTo(inner[b2 * 2], inner[b2 * 2 + 1]);
    }
    ctx.stroke();

    // Inner vertex glow
    for (let i = 0; i < numVerts; i++) {
      const vx = inner[i * 2];
      const vy = inner[i * 2 + 1];
      const grad = ctx.createRadialGradient(vx, vy, 0, vx, vy, 12);
      grad.addColorStop(0, mainColorAlpha(0.3));
      grad.addColorStop(1, mainColorAlpha(0));
      ctx.fillStyle = grad;
      ctx.fillRect(vx - 12, vy - 12, 24, 24);
    }

    ctx.restore();

    // ── Draw main wireframe edges ──
    ctx.strokeStyle = mainColorAlpha(0.6);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < numEdges; i++) {
      const a = edges[i * 2];
      const b2 = edges[i * 2 + 1];
      ctx.moveTo(proj[a * 2], proj[a * 2 + 1]);
      ctx.lineTo(proj[b2 * 2], proj[b2 * 2 + 1]);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Draw vertices with glow ──
    for (let i = 0; i < numVerts; i++) {
      const vx = proj[i * 2];
      const vy = proj[i * 2 + 1];

      // Outer glow
      const glow = ctx.createRadialGradient(vx, vy, 0, vx, vy, 16);
      glow.addColorStop(0, mainColorAlpha(0.25));
      glow.addColorStop(1, mainColorAlpha(0));
      ctx.fillStyle = glow;
      ctx.fillRect(vx - 16, vy - 16, 32, 32);

      // Vertex dot
      ctx.beginPath();
      ctx.arc(vx, vy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = mainColorAlpha(0.9);
      ctx.fill();
    }

    // ── Central glow ──
    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, fov * 0.4);
    centerGlow.addColorStop(0, mainColorAlpha(0.06));
    centerGlow.addColorStop(0.5, mainColorAlpha(0.02));
    centerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, w, h);

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    if (reduced) return;

    let cancelled = false;

    async function loadWasm() {
      try {
        const resp = await fetch("/renderer3d.wasm");
        const bytes = await resp.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, {
          env: {
            abort: () => {},
            "Math.sqrt": Math.sqrt,
            "Math.sin": Math.sin,
            "Math.cos": Math.cos,
            "Math.acos": Math.acos,
          },
        });

        if (cancelled) return;

        const exports = instance.exports as unknown as WasmExports;
        wasmRef.current = exports;
        exports.init((Date.now() & 0xFFFFFFFF) >>> 0);
        lastTimeRef.current = performance.now();
        setReady(true);
        rafRef.current = requestAnimationFrame(render);
      } catch (err) {
        console.warn("[WASM] Failed to load 3D renderer:", err);
      }
    }

    loadWasm();

    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [reduced, render]);

  if (reduced) {
    return (
      <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
        <div className="relative h-28 w-28 sm:h-32 sm:w-32">
          <div className="absolute inset-0 animate-pulse rounded-full border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-500/20 to-purple-500/20" />
          <div className="absolute inset-3 animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-emerald-400/40" />
          <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-cyan-400/30 to-pink-400/30 shadow-[0_0_40px_rgba(34,211,238,0.4)]" />
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
      aria-hidden="true"
    />
  );
}

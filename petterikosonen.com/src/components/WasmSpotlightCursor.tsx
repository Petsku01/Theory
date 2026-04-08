"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * WASM-powered spotlight cursor with spring physics.
 * Replaces Framer Motion springs with a semi-implicit Euler spring solver
 * running in WebAssembly. Zero JS animation library dependency.
 */

interface WasmExports {
  setTarget: (x: number, y: number) => void;
  hide: () => void;
  update: (dt: number) => void;
  getX: () => number;
  getY: () => number;
  getOpacity: () => number;
}

export default function WasmSpotlightCursor() {
  const divRef = useRef<HTMLDivElement>(null);
  const wasmRef = useRef<WasmExports | null>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [ready, setReady] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    // Don't run on touch devices
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;

    let cancelled = false;

    async function loadWasm() {
      try {
        const resp = await fetch("/spring_cursor.wasm");
        const bytes = await resp.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, {
          env: { abort: () => {} },
        });

        if (cancelled) return;

        const exports = instance.exports as unknown as WasmExports;
        wasmRef.current = exports;
        lastTimeRef.current = performance.now();
        setReady(true);
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.warn("[WASM] Failed to load spring cursor:", err);
      }
    }

    function tick(timestamp: number) {
      const wasm = wasmRef.current;
      const el = divRef.current;
      if (!wasm || !el) return;

      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      // Step the spring physics in WASM
      wasm.update(dt);

      // Read computed values and apply directly to DOM (no React re-render)
      const x = wasm.getX();
      const y = wasm.getY();
      const opacity = wasm.getOpacity();

      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = String(opacity);

      rafRef.current = requestAnimationFrame(tick);
    }

    loadWasm();

    const onMove = (e: MouseEvent) => {
      wasmRef.current?.setTarget(e.clientX, e.clientY);
    };

    const onLeave = () => {
      wasmRef.current?.hide();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      ref={divRef}
      aria-hidden="true"
      className={`pointer-events-none fixed z-30 hidden h-48 w-48 rounded-full md:block ${
        ready ? "" : "opacity-0"
      }`}
      style={{
        background:
          "radial-gradient(circle, rgba(34, 211, 238, 0.32) 0%, rgba(34, 211, 238, 0.08) 40%, transparent 74%)",
        willChange: "transform, opacity",
      }}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
  type CortexWasmExports,
} from "@/components/neural-cortex/utils";

// Spring-physics spotlight cursor, now using the unified cortex WASM instance.
// Replaces the old standalone spring_cursor.wasm.

interface SpringCursorExports {
  springcursor_new(): number;
  springcursor_set_target(ptr: number, x: number, y: number): void;
  springcursor_hide(ptr: number): void;
  springcursor_update(ptr: number, dt: number): void;
  springcursor_get_x(ptr: number): number;
  springcursor_get_y(ptr: number): number;
  springcursor_get_opacity(ptr: number): number;
  __wbg_springcursor_free(ptr: number, del: number): void;
}

export default function WasmSpotlightCursor() {
  const divRef = useRef<HTMLDivElement>(null);
  const cursorPtr = useRef<number>(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [ready, setReady] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;

    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      const wasm = getCortexWasm() as unknown as SpringCursorExports;
      if (!wasm) return;
      cursorPtr.current = wasm.springcursor_new();
      lastTimeRef.current = performance.now();
      setReady(true);
      rafRef.current = requestAnimationFrame(tick);
    };

    if (isCortexWasmReady()) {
      init();
    } else {
      ensureCortexWasm().then((ok) => {
        if (ok) init();
      });
    }

    function tick(timestamp: number) {
      const wasm = getCortexWasm() as unknown as SpringCursorExports | null;
      const el = divRef.current;
      if (!wasm || !el || !cursorPtr.current) return;

      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      wasm.springcursor_update(cursorPtr.current, dt);

      const x = wasm.springcursor_get_x(cursorPtr.current);
      const y = wasm.springcursor_get_y(cursorPtr.current);
      const opacity = wasm.springcursor_get_opacity(cursorPtr.current);

      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = String(opacity);

      rafRef.current = requestAnimationFrame(tick);
    }

    const onMove = (e: MouseEvent) => {
      const wasm = getCortexWasm() as unknown as SpringCursorExports | null;
      if (wasm && cursorPtr.current) {
        wasm.springcursor_set_target(cursorPtr.current, e.clientX, e.clientY);
      }
    };

    const onLeave = () => {
      const wasm = getCortexWasm() as unknown as SpringCursorExports | null;
      if (wasm && cursorPtr.current) {
        wasm.springcursor_hide(cursorPtr.current);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      const wasm = getCortexWasm() as unknown as SpringCursorExports | null;
      if (wasm && cursorPtr.current) {
        try { wasm.__wbg_springcursor_free(cursorPtr.current, 0); } catch {}
        cursorPtr.current = 0;
      }
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
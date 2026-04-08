"use client";

import { useEffect, useRef, useState } from "react";

interface MousePosition {
  x: number;
  y: number;
  /** Normalized position (0–1) relative to viewport */
  nx: number;
  ny: number;
}

/**
 * Tracks mouse position with optional spring smoothing.
 * Returns both absolute and normalized (0–1) coordinates.
 */
export function useMousePosition(smooth = false): MousePosition {
  const [pos, setPos] = useState<MousePosition>({ x: 0, y: 0, nx: 0.5, ny: 0.5 });
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      if (!smooth) {
        setPos({
          x: e.clientX,
          y: e.clientY,
          nx: e.clientX / window.innerWidth,
          ny: e.clientY / window.innerHeight,
        });
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    if (smooth) {
      const tick = () => {
        const lerp = 0.08;
        current.current.x += (target.current.x - current.current.x) * lerp;
        current.current.y += (target.current.y - current.current.y) * lerp;
        setPos({
          x: current.current.x,
          y: current.current.y,
          nx: current.current.x / window.innerWidth,
          ny: current.current.y / window.innerHeight,
        });
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [smooth]);

  return pos;
}

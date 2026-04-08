"use client";

import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from "react";

interface TiltConfig {
  maxDeg?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
}

/**
 * 3D card tilt effect driven by mouse position.
 * Returns handlers and a ref for the container.
 * Applies CSS transform directly for zero re-renders.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>({
  maxDeg = 8,
  perspective = 1000,
  scale = 1.02,
  speed = 400,
}: TiltConfig = {}) {
  const ref = useRef<T>(null);

  const onMouseMove = useCallback(
    (e: ReactMouseEvent<T>) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * maxDeg * 2;
      const rotateY = (x - 0.5) * maxDeg * 2;

      el.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      el.style.transition = `transform ${speed * 0.3}ms ease-out`;
    },
    [maxDeg, perspective, scale, speed]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    el.style.transition = `transform ${speed}ms ease-out`;
  }, [speed]);

  return { ref, onMouseMove, onMouseLeave } as const;
}

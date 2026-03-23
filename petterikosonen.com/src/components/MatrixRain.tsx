"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const GLYPHS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let columns: number[] = [];
    let lastFrame = 0;
    const frameInterval = 1000 / 30;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
      const colCount = Math.max(1, Math.floor(width / 18));
      columns = Array.from({ length: colCount }, () => Math.random() * height);
    };

    const draw = (time: number) => {
      if (time - lastFrame < frameInterval) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrame = time;

      ctx.fillStyle = "rgba(5, 7, 10, 0.08)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = "500 14px var(--font-ibm-plex-mono), monospace";
      ctx.fillStyle = "rgba(57, 255, 136, 0.14)";

      for (let i = 0; i < columns.length; i += 1) {
        const text = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        const x = i * 18;
        const y = columns[i];
        ctx.fillText(text, x, y);

        if (y > height && Math.random() > 0.985) {
          columns[i] = 0;
        } else {
          columns[i] += 14;
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    raf = requestAnimationFrame(draw);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [reduceMotion]);

  if (reduceMotion) {
    return null;
  }

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-80" aria-hidden="true" />;
}

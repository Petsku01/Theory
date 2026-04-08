"use client";

import { useEffect, useState } from "react";

/**
 * Tracks global scroll progress as a 0–1 value.
 * Uses passive listener and RAF throttling for performance.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    let ticking = false;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        raf = requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return progress;
}

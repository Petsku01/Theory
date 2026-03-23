"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

export default function SpotlightCursor() {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(-96);
  const y = useMotionValue(-96);
  const opacity = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 360, damping: 40, mass: 0.35 });
  const smoothY = useSpring(y, { stiffness: 360, damping: 40, mass: 0.35 });
  const smoothOpacity = useSpring(opacity, { stiffness: 260, damping: 30, mass: 0.3 });

  useEffect(() => {
    if (reduceMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (event: MouseEvent) => {
      x.set(event.clientX - 96);
      y.set(event.clientY - 96);
      opacity.set(0.28);
    };

    const onLeave = () => opacity.set(0);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [opacity, reduceMotion, x, y]);

  if (reduceMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed z-30 hidden h-48 w-48 rounded-full md:block"
      style={{
        x: smoothX,
        y: smoothY,
        opacity: smoothOpacity,
        background: "radial-gradient(circle, rgba(34, 211, 238, 0.32) 0%, rgba(34, 211, 238, 0.08) 40%, transparent 74%)",
      }}
    />
  );
}

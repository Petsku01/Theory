"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export default function SpotlightCursor() {
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (event: MouseEvent) => {
      setVisible(true);
      setPoint({ x: event.clientX, y: event.clientY });
    };

    const onLeave = () => setVisible(false);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed z-30 hidden h-48 w-48 rounded-full md:block"
      animate={{
        x: point.x - 96,
        y: point.y - 96,
        opacity: visible ? 0.28 : 0,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        background: "radial-gradient(circle, rgba(34, 211, 238, 0.32) 0%, rgba(34, 211, 238, 0.08) 40%, transparent 74%)",
      }}
    />
  );
}

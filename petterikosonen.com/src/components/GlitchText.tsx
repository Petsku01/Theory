"use client";

import { motion, useReducedMotion } from "framer-motion";

interface GlitchTextProps {
  children: string;
  className?: string;
}

export default function GlitchText({ children, className }: GlitchTextProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className={className}>{children}</span>;
  }

  return (
    <motion.span
      className={`relative inline-flex ${className ?? ""}`}
      whileHover={{ x: [0, -1, 1, 0] }}
      whileFocus={{ x: [0, -1, 1, 0] }}
      transition={{ duration: 0.18, ease: "linear" }}
    >
      <span>{children}</span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-[1px] text-accent-cyan/60 mix-blend-screen">
        {children}
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 translate-x-[1px] text-accent-red/50 mix-blend-screen">
        {children}
      </span>
    </motion.span>
  );
}

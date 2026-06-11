"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Kinetic typography: characters fade in with stagger ──
function KineticTitle({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-flex overflow-hidden">
      {text.split("").map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: delay + i * 0.04,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="inline-block"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

// ── Title overlay with kinetic typography ──
export function TitleOverlay({
  hasInteracted,
}: {
  hasInteracted: boolean;
}) {
  return (
    <AnimatePresence>
      {!hasInteracted && (
        <motion.div
          key="title-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center"
        >
          <div className="text-center">
            <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-100 font-mono md:text-5xl">
              <KineticTitle text="NEURAL CORTEX" delay={0.3} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ duration: 0.6, delay: 1.8 }}
              className="text-sm tracking-[0.3em] text-slate-400 font-mono uppercase"
            >
              Interactive Portfolio
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 0.5, delay: 2.5 }}
              className="mt-6 text-xs text-slate-500 font-mono"
            >
              Click a node or use the cluster buttons below
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
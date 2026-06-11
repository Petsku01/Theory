"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Splash screen: dark void with title + enter button ──
export function SplashScreen({
  onEnter,
}: {
  onEnter: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key="splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05, filter: "blur(12px)" }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070A]"
      >
        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Central content */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Name */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-sm font-semibold tracking-wide text-slate-400/70 font-mono"
          >
            Petteri Kosonen
          </motion.p>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-4xl font-bold tracking-[0.3em] text-slate-100 font-mono sm:text-6xl"
            style={{ textShadow: "0 0 40px rgba(0,240,255,0.3)" }}
          >
            NEURAL CORTEX
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-sm tracking-[0.2em] text-slate-500 font-mono uppercase"
          >
            Interactive Portfolio
          </motion.p>

          {/* Enter button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4 }}
            onClick={onEnter}
            className="group relative mt-6 cursor-pointer border border-cyan-500/30 bg-transparent px-8 py-3 font-mono text-sm tracking-[0.15em] text-cyan-400 transition-all hover:border-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-[0_0_30px_rgba(0,240,255,0.15)]"
          >
            <span className="relative z-10">[ ENTER ]</span>
            {/* Glow pulse */}
            <motion.div
              className="absolute inset-0 -z-0 bg-cyan-500/5"
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.button>

          {/* Hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 0.5, delay: 2.2 }}
            className="text-[0.65rem] text-slate-600 font-mono"
          >
            Click a node to explore
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
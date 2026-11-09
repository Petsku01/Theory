"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrambleText from "@/components/ScrambleText";

const NAME = "Petteri Kosonen";
const TITLE = "NEURAL CORTEX";
const TAGLINE = "Interactive Portfolio";
const FOOTNOTE = "signal: ready · source: pk-1";

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
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center"
          aria-label="Hero transmission: Petteri Kosonen, Neural Cortex, Interactive Portfolio"
        >
          <div className="text-center">
            <ScrambleText
              as="p"
              text={NAME}
              durationMs={1200}
              delayMs={0}
              cursor={false}
              ariaLabel="Petteri Kosonen"
              className="mb-2 font-mono text-sm tracking-[0.22em] text-slate-300 md:text-base"
            />
            <ScrambleText
              as="p"
              text={TITLE}
              durationMs={1200}
              delayMs={40}
              cursor
              ariaLabel="NEURAL CORTEX"
              className="mb-3 text-4xl font-bold tracking-tight text-slate-100 font-mono md:text-5xl"
            />
            <ScrambleText
              as="p"
              text={TAGLINE}
              durationMs={1200}
              delayMs={80}
              cursor={false}
              ariaLabel="Interactive Portfolio"
              className="text-sm tracking-[0.3em] text-slate-400 font-mono uppercase"
            />
            <p
              className="mt-6 font-mono text-[10px] tracking-[0.18em] text-slate-500"
              aria-label="signal ready, source pk-1"
            >
              <span aria-hidden="true">{FOOTNOTE}</span>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

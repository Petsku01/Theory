"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import StatusPill from "@/components/StatusPill";
import TypeWriter from "@/components/TypeWriter";

const MatrixRain = dynamic(() => import("@/components/MatrixRain"), { ssr: false });
const SecurityShield3D = dynamic(() => import("@/components/SecurityShield3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-pulse rounded-full border-2 border-accent-cyan/30 bg-accent-cyan/5" />
    </div>
  ),
});

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section id="hero" className="relative min-h-[85vh] overflow-hidden rounded-3xl lg:min-h-[80vh]">
      {/* Glass background */}
      <div className="absolute inset-0 glass-card rounded-3xl" />

      {/* Subtle scan line effect */}
      <div className="pointer-events-none absolute inset-0 scan-line rounded-3xl" />

      {/* Background matrix effect */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] rounded-3xl overflow-hidden">
        <MatrixRain />
      </div>

      {/* Gradient accent glow at top */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[70%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(34,211,238,0.15),transparent_70%)] blur-2xl" aria-hidden="true" />

      {/* Corner decorations */}
      <div className="pointer-events-none absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-accent-cyan/30 rounded-tl-lg" aria-hidden="true" />
      <div className="pointer-events-none absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-accent-cyan/30 rounded-tr-lg" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-accent-cyan/30 rounded-bl-lg" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-accent-cyan/30 rounded-br-lg" aria-hidden="true" />

      <div className="relative grid gap-8 px-6 pb-12 pt-14 sm:px-10 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:px-14 lg:py-20">
        {/* Left: Content */}
        <div className="relative z-10">
          <motion.div {...fadeUp(0.1)} className="mb-5 flex flex-wrap items-center gap-2.5">
            <StatusPill label="Open to work" variant="green" />
            <StatusPill label="Security + AI" variant="cyan" />
          </motion.div>

          <motion.p {...fadeUp(0.2)} className="section-label mb-5">
            Building tools that make AI safer
          </motion.p>

          <motion.h1
            {...fadeUp(0.3)}
            className="max-w-xl font-display text-5xl font-bold leading-[1.05] text-text-0 sm:text-6xl lg:text-7xl"
          >
            Petteri{" "}
            <span className="bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-cyan bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-shift">
              Kosonen
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.4)}
            className="mt-5 max-w-lg text-base leading-relaxed text-text-1 sm:text-lg"
          >
            Security engineer building resilient systems, practical AI safety tools, and trustworthy automation. I bridge the gap between{" "}
            <span className="font-medium text-accent-cyan">security</span> and{" "}
            <span className="font-medium text-accent-violet">AI engineering</span>.
          </motion.p>

          <motion.div {...fadeUp(0.5)} className="mt-5">
            <TypeWriter
              words={["defender", "builder", "researcher", "problem-solver"]}
              className="text-base"
            />
          </motion.div>

          <motion.div {...fadeUp(0.6)} className="mt-10 flex flex-wrap gap-4">
            <Link
              href="#projects"
              className="focus-outline group relative rounded-xl bg-accent-cyan px-6 py-3.5 text-sm font-semibold text-text-inverse transition-all duration-300 hover:shadow-glow-lg"
            >
              <span className="relative z-10">View Projects</span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-violet opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
            </Link>
            <Link
              href="#contact"
              className="focus-outline rounded-xl border border-line-1 bg-bg-2/30 px-6 py-3.5 text-sm font-semibold text-text-1 backdrop-blur-sm transition-all duration-300 hover:border-accent-cyan/50 hover:text-accent-cyan hover:shadow-glowCyan"
            >
              Get in Touch
            </Link>
          </motion.div>
        </div>

        {/* Right: 3D Shield */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-[320px] sm:h-[380px] lg:h-[460px]"
        >
          {/* Glow behind 3D element */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.08),transparent_70%)]" aria-hidden="true" />
          <SecurityShield3D />
        </motion.div>
      </div>
    </section>
  );
}

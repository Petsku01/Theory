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

  return (
    <section id="hero" className="relative overflow-hidden rounded-2xl border border-line-0 bg-bg-1/90 shadow-terminal">
      {/* Background matrix effect - subtle */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <MatrixRain />
      </div>
      
      <div className="relative grid gap-6 px-5 pb-8 pt-10 sm:px-8 sm:pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8 lg:py-16">
        {/* Left: Content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-4 flex flex-wrap items-center gap-2"
          >
            <StatusPill label="Open to work" variant="green" />
            <StatusPill label="Security + AI" variant="cyan" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="section-label mb-4"
          >
            Building tools that make AI safer
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="max-w-xl font-display text-4xl font-bold leading-[1.1] text-text-0 sm:text-5xl lg:text-6xl"
          >
            Petteri Kosonen
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-4 max-w-lg text-base text-text-1 sm:text-lg"
          >
            Security engineer building resilient systems, practical AI safety tools, and trustworthy automation. I bridge the gap between{" "}
            <span className="text-accent-cyan">security</span> and{" "}
            <span className="text-accent-violet">AI engineering</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-4"
          >
            <TypeWriter 
              words={["defender", "builder", "researcher", "problem-solver"]} 
              className="text-base"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="#projects"
              className="focus-outline rounded-lg border border-accent-cyan/70 bg-accent-cyan px-5 py-3 text-sm font-semibold text-text-inverse transition-all hover:scale-[1.02] hover:bg-[#4edff3] hover:shadow-glowCyan"
            >
              View Projects
            </Link>
            <Link
              href="#contact"
              className="focus-outline rounded-lg border border-line-1 px-5 py-3 text-sm font-semibold text-text-1 transition-all hover:border-accent-cyan hover:text-accent-cyan"
            >
              Get in Touch
            </Link>
          </motion.div>
        </div>

        {/* Right: 3D Shield */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative h-[300px] sm:h-[350px] lg:h-[420px]"
        >
          <SecurityShield3D />
        </motion.div>
      </div>
    </section>
  );
}

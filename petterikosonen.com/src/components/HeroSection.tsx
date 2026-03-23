"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import StatusPill from "@/components/StatusPill";
import TypeWriter from "@/components/TypeWriter";

const MatrixRain = dynamic(() => import("@/components/MatrixRain"), { ssr: false });

const stats = [
  { label: "Alerts Investigated", value: "2.4K+" },
  { label: "Labs Built", value: "31" },
  { label: "Uptime Discipline", value: "99.95%" },
];

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="hero" className="relative overflow-hidden rounded-2xl border border-line-0 bg-bg-1/90 px-5 pb-8 pt-12 shadow-terminal sm:px-8 sm:pt-14">
      <div className="pointer-events-none absolute inset-0 opacity-[0.15]">
        <MatrixRain />
      </div>
      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.05 }}
            className="mb-4 flex flex-wrap items-center gap-2"
          >
            <StatusPill label="Open to work" variant="green" />
            <StatusPill label="Security + AI" variant="cyan" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.12 }}
            className="section-label mb-4"
          >
            Secure by Design
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.18 }}
            className="max-w-2xl font-display text-4xl font-bold leading-tight text-text-0 sm:text-6xl"
          >
            Petteri Kosonen
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.24 }}
            className="mt-4 max-w-2xl text-base text-text-1 sm:text-lg"
          >
            B.Eng. student and security-minded IT specialist building resilient systems, practical security tooling, and trustworthy AI workflows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.32 }}
            className="mt-5"
          >
            <TypeWriter words={["defender", "builder", "analyst", "automation-focused"]} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.38 }}
            className="mt-7 flex flex-wrap gap-3"
          >
            <Link
              href="#projects"
              className="focus-outline rounded-md border border-accent-cyan/70 bg-accent-cyan px-4 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-[#4edff3]"
            >
              View Projects
            </Link>
            <Link
              href="#contact"
              className="focus-outline rounded-md border border-line-1 px-4 py-2.5 text-sm font-semibold text-text-1 transition-colors hover:border-accent-cyan hover:text-accent-cyan"
            >
              Contact
            </Link>
          </motion.div>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, delay: 0.42 }}
          className="relative rounded-xl border border-line-1 bg-bg-2/90 p-5"
          aria-label="Live signal panel"
        >
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-text-2">live.signal.panel</p>
          <ul className="mt-4 space-y-4">
            {stats.map((stat) => (
              <li key={stat.label} className="flex items-center justify-between gap-4 border-b border-line-0 pb-3 last:border-none last:pb-0">
                <span className="text-sm text-text-1">{stat.label}</span>
                <span className="font-mono text-sm text-accent-green">{stat.value}</span>
              </li>
            ))}
          </ul>
        </motion.aside>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SectionFrameProps {
  id?: string;
  title: string;
  command: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export default function SectionFrame({
  id,
  title,
  command,
  description,
  className,
  children,
}: SectionFrameProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-3xl glass-card px-6 py-10 shadow-terminal-lg sm:px-10 ${className ?? ""}`}
    >
      {/* Corner accents */}
      <span className="pointer-events-none absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-accent-cyan/40 rounded-tl-md" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-accent-cyan/40 rounded-br-md" aria-hidden="true" />

      {/* Top glow line */}
      <div className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" aria-hidden="true" />

      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 max-w-8 bg-accent-cyan/40" aria-hidden="true" />
          <span className="section-label">{command}</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-text-0 sm:text-4xl lg:text-5xl">{title}</h2>
          {description ? (
            <p className="mt-3 max-w-3xl text-base text-text-1 sm:text-lg">{description}</p>
          ) : null}
        </div>
      </header>
      {children}
    </motion.section>
  );
}

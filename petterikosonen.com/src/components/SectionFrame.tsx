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
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      className={`relative rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-8 shadow-terminal backdrop-blur-sm sm:px-8 ${className ?? ""}`}
    >
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-accent-cyan/70" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-accent-cyan/70" aria-hidden="true" />
      <header className="mb-6 space-y-3">
        <span className="section-label">{command}</span>
        <div>
          <h2 className="text-3xl font-semibold text-text-0 sm:text-4xl">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-text-1">{description}</p> : null}
        </div>
      </header>
      {children}
    </motion.section>
  );
}

"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface SectionFrameProps {
  id?: string;
  title: string;
  command: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Section container with glass morphism, corner accents,
 * and intersection-observer-driven reveal animation.
 * Zero Framer Motion dependency — pure CSS transitions.
 */
export default function SectionFrame({
  id,
  title,
  command,
  description,
  className,
  children,
}: SectionFrameProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.08 });

  return (
    <section
      ref={ref}
      id={id}
      className={`relative rounded-3xl glass-card px-6 py-10 shadow-terminal-lg sm:px-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className ?? ""}`}
    >
      {/* Corner accents */}
      <span className="pointer-events-none absolute left-4 top-4 h-7 w-7 border-l-2 border-t-2 border-accent-cyan/30 rounded-tl-md" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-7 w-7 border-b-2 border-r-2 border-accent-cyan/30 rounded-br-md" aria-hidden="true" />

      {/* Top glow line */}
      <div className="pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/25 to-transparent" aria-hidden="true" />

      {/* Subtle scan effect */}
      <div className="pointer-events-none absolute inset-0 scan-line rounded-3xl opacity-50" aria-hidden="true" />

      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-accent-cyan/40 sm:w-10" aria-hidden="true" />
          <span className="section-label">{command}</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-0 sm:text-4xl lg:text-5xl">{title}</h2>
          {description ? (
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-text-1 sm:text-lg">{description}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

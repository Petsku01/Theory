"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import StatusPill from "@/components/StatusPill";
import TypeWriter from "@/components/TypeWriter";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useInView } from "@/hooks/useInView";

const SecurityShield3D = dynamic(() => import("@/components/SecurityShield3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 animate-pulse-glow" />
    </div>
  ),
});

/** Stagger animation helper — CSS-only, no Framer Motion overhead */
function AnimateIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function HeroSection() {
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  // Parallax mouse tracking for the hero
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, [reduced]);

  // Subtle parallax transform for decorative elements
  const parallaxStyle = reduced
    ? {}
    : {
        transform: `translate(${(mousePos.x - 0.5) * 12}px, ${(mousePos.y - 0.5) * 12}px)`,
        transition: "transform 0.3s ease-out",
      };

  return (
    <section
      ref={containerRef}
      id="hero"
      onMouseMove={onMouseMove}
      className="relative min-h-[88vh] overflow-hidden rounded-3xl lg:min-h-[82vh]"
    >
      {/* Base glass layer */}
      <div className="absolute inset-0 glass-card rounded-3xl" />

      {/* Animated gradient mesh — moves with mouse */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at ${mousePos.x * 100}% ${mousePos.y * 100}%,
              rgba(34,211,238,0.12), transparent),
            radial-gradient(ellipse 400px 300px at ${100 - mousePos.x * 100}% ${100 - mousePos.y * 100}%,
              rgba(124,140,255,0.1), transparent)
          `,
          transition: reduced ? "none" : "background 0.5s ease-out",
        }}
        aria-hidden="true"
      />

      {/* Scan line */}
      <div className="pointer-events-none absolute inset-0 scan-line rounded-3xl" />

      {/* Corner brackets */}
      {[
        "left-4 top-4 border-l-2 border-t-2 rounded-tl-lg",
        "right-4 top-4 border-r-2 border-t-2 rounded-tr-lg",
        "bottom-4 left-4 border-b-2 border-l-2 rounded-bl-lg",
        "bottom-4 right-4 border-b-2 border-r-2 rounded-br-lg",
      ].map((classes) => (
        <div
          key={classes}
          className={`pointer-events-none absolute h-10 w-10 border-accent-cyan/25 ${classes}`}
          style={parallaxStyle}
          aria-hidden="true"
        />
      ))}

      <div className="relative grid gap-8 px-6 pb-14 pt-16 sm:px-10 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:px-14 lg:py-24">
        {/* Left: Content */}
        <div className="relative z-10 space-y-6">
          <AnimateIn delay={100} className="flex flex-wrap items-center gap-2.5">
            <StatusPill label="Open to work" variant="green" />
            <StatusPill label="Security + AI" variant="cyan" />
          </AnimateIn>

          <AnimateIn delay={200}>
            <span className="section-label">Building tools that make AI safer</span>
          </AnimateIn>

          <AnimateIn delay={300}>
            <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.04] text-text-0 sm:text-6xl lg:text-7xl xl:text-[5.2rem]">
              Petteri{" "}
              <span className="hero-gradient-text">
                Kosonen
              </span>
            </h1>
          </AnimateIn>

          <AnimateIn delay={400}>
            <p className="max-w-lg text-base leading-relaxed text-text-1 sm:text-lg lg:text-xl">
              Security engineer building resilient systems, practical AI safety tools,
              and trustworthy automation. I bridge{" "}
              <span className="font-semibold text-accent-cyan">security</span> and{" "}
              <span className="font-semibold text-accent-violet">AI engineering</span>.
            </p>
          </AnimateIn>

          <AnimateIn delay={500}>
            <TypeWriter
              words={["defender", "builder", "researcher", "problem-solver"]}
              className="text-base lg:text-lg"
            />
          </AnimateIn>

          <AnimateIn delay={600} className="flex flex-wrap gap-4 pt-2">
            <Link
              href="#projects"
              className="focus-outline group relative overflow-hidden rounded-xl bg-accent-cyan px-7 py-4 text-sm font-bold text-text-inverse transition-all duration-300 hover:shadow-glow-lg active:scale-[0.98]"
            >
              <span className="relative z-10">View Projects</span>
              <span
                className="absolute inset-0 bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-cyan bg-[length:200%] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:animate-shimmer"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="#contact"
              className="focus-outline rounded-xl border border-line-1/60 bg-bg-2/20 px-7 py-4 text-sm font-bold text-text-1 backdrop-blur-sm transition-all duration-300 hover:border-accent-cyan/50 hover:text-accent-cyan hover:shadow-glowCyan active:scale-[0.98]"
            >
              Get in Touch
            </Link>
          </AnimateIn>
        </div>

        {/* Right: 3D Shield with parallax */}
        <AnimateIn delay={400} className="relative h-[340px] sm:h-[400px] lg:h-[480px]">
          <div
            className="h-full w-full"
            style={reduced ? {} : {
              transform: `translate(${(mousePos.x - 0.5) * -20}px, ${(mousePos.y - 0.5) * -20}px)`,
              transition: "transform 0.4s ease-out",
            }}
          >
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.06),transparent_65%)]" aria-hidden="true" />
            <SecurityShield3D />
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}

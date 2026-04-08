"use client";

import StatusPill from "@/components/StatusPill";
import { useTilt } from "@/hooks/useTilt";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface FeaturedProjectProps {
  title: string;
  summary: string;
  points: string[];
  tech: string[];
  link: string;
  variant: "cyan" | "violet";
}

const styles = {
  cyan: {
    glow: "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_8px_50px_-12px_rgba(34,211,238,0.2)]",
    border: "hover:border-accent-cyan/35",
    accent: "bg-accent-cyan",
    line: "via-accent-cyan/40",
    link: "border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10",
  },
  violet: {
    glow: "hover:shadow-[0_0_0_1px_rgba(124,140,255,0.15),0_8px_50px_-12px_rgba(124,140,255,0.2)]",
    border: "hover:border-accent-violet/35",
    accent: "bg-accent-violet",
    line: "via-accent-violet/40",
    link: "border-accent-violet/40 text-accent-violet hover:bg-accent-violet/10",
  },
};

export default function FeaturedProject({ title, summary, points, tech, link, variant }: FeaturedProjectProps) {
  const s = styles[variant];
  const reduced = usePrefersReducedMotion();
  const { ref, onMouseMove, onMouseLeave } = useTilt<HTMLElement>({
    maxDeg: reduced ? 0 : 6,
    scale: reduced ? 1 : 1.01,
  });

  return (
    <article
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`group relative overflow-hidden rounded-2xl border border-line-0 bg-gradient-to-br from-bg-2/90 to-bg-2/70 p-7 shadow-terminal transition-all duration-300 ease-standard ${s.border} ${s.glow}`}
      style={{ willChange: "transform" }}
    >
      {/* Top accent glow */}
      <div className={`absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent ${s.line} to-transparent`} aria-hidden="true" />

      {/* Hover gradient reveal */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
        variant === "cyan" ? "from-accent-cyan/[0.03]" : "from-accent-violet/[0.03]"
      } to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`} aria-hidden="true" />

      <div className="relative">
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <StatusPill label="featured" variant={variant} />
          <span className="font-mono text-[0.68rem] uppercase tracking-widest text-text-2">security spotlight</span>
        </div>

        <h3 className="text-2xl font-bold text-text-0">{title}</h3>
        <p className="mt-3 leading-relaxed text-text-1">{summary}</p>

        <ul className="mt-5 space-y-2.5 text-sm text-text-1">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5">
              <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${s.accent}`} aria-hidden="true" />
              <span className="leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          {tech.map((item) => (
            <span key={item} className="rounded-lg border border-line-1/50 bg-bg-3/30 px-2.5 py-1 font-mono text-xs text-text-2">
              {item}
            </span>
          ))}
        </div>

        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`focus-outline mt-7 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all duration-200 ${s.link}`}
        >
          Inspect project
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </a>
      </div>
    </article>
  );
}

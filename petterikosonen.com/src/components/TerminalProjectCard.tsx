"use client";

import type { Project } from "@/lib/data";
import StatusPill from "@/components/StatusPill";
import { useTilt } from "@/hooks/useTilt";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface Props {
  project: Project;
}

const statusCycle: Array<"cyan" | "green" | "amber" | "violet"> = ["cyan", "green", "amber", "violet"];

export default function TerminalProjectCard({ project }: Props) {
  const tags = project.tech.split(",").map((t) => t.trim());
  const status = statusCycle[project.name.length % statusCycle.length];
  const reduced = usePrefersReducedMotion();
  const { ref, onMouseMove, onMouseLeave } = useTilt<HTMLElement>({
    maxDeg: reduced ? 0 : 4,
    scale: reduced ? 1 : 1.015,
  });

  return (
    <article
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="group relative overflow-hidden rounded-2xl border border-line-0 bg-bg-2/50 p-6 shadow-terminal transition-all duration-300 ease-standard hover:border-accent-cyan/30 hover:shadow-[0_8px_40px_-10px_rgba(0,0,0,0.4),0_0_40px_-15px_rgba(34,211,238,0.1)]"
      style={{ willChange: "transform" }}
    >
      {/* Hover gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-cyan/[0.03] to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" aria-hidden="true" />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-text-0 transition-colors duration-200 group-hover:text-accent-cyan">
            {project.name}
          </h3>
          <StatusPill label="active" variant={status} />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-md border border-line-1/50 bg-bg-3/25 px-2 py-0.5 font-mono text-xs text-text-2">
              {tag}
            </span>
          ))}
        </div>

        <p className="min-h-20 text-sm leading-relaxed text-text-1">{project.desc}</p>

        <div className="mt-5 border-t border-line-0/50 pt-4">
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-outline inline-flex items-center gap-2 rounded-md font-mono text-xs uppercase tracking-wider text-text-2 transition-colors hover:text-accent-cyan"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            github / case study
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}

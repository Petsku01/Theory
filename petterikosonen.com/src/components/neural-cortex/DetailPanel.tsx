"use client";

import { type CortexNode } from "@/lib/cortex-data";

// ── Detail panel (unchanged) ──
export function DetailPanel({
  node,
  stage,
  onCloseAction,
}: {
  node: CortexNode | null;
  stage: "show" | "hiding" | "hidden";
  onCloseAction: () => void;
}) {
  if (!node || stage === "hidden") return null;

  const panelClass =
    stage === "hiding"
      ? "translate-x-full opacity-0"
      : "translate-x-0 opacity-100";

  return (
    <div
      className={`pointer-events-auto fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700/50 bg-[#0a0a0f]/95 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out ${panelClass} max-md:bottom-0 max-md:left-0 max-md:top-auto max-md:w-full max-md:rounded-b-none`}
    >
      <button
        onClick={onCloseAction}
        className="absolute right-3 top-3 text-slate-400 hover:text-slate-100"
        aria-label="Close panel"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>

      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <h3 className="text-lg font-bold text-slate-100 font-mono">
          {node.label}
        </h3>
      </div>
      <p className="mt-1 text-sm text-slate-300">
        {node.fullDesc ?? node.shortDesc}
      </p>

      {node.tech && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {node.tech.map((t) => (
            <span
              key={t}
              className="rounded-md bg-slate-800/70 px-2 py-0.5 font-mono text-xs text-cyan-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {node.link && (
        <a
          href={node.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/20"
        >
          View Project
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      )}

      <div className="mt-3">
        <span className="rounded bg-slate-800/50 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-slate-400">
          {node.type}
        </span>
      </div>
    </div>
  );
}
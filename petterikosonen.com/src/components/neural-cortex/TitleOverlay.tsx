"use client";

import { useEffect, useState } from "react";

// ── Title overlay (unchanged) ──
export function TitleOverlay({ hasInteracted }: { hasInteracted: boolean }) {
  const [typedTitle, setTypedTitle] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showHint, setShowHint] = useState(!hasInteracted);
  const fullTitle = "Petteri Kosonen";

  useEffect(() => {
    if (typedTitle.length < fullTitle.length) {
      const timeout = setTimeout(() => {
        setTypedTitle(fullTitle.slice(0, typedTitle.length + 1));
      }, 80);
      return () => clearTimeout(timeout);
    } else {
      const t = setTimeout(() => setShowSubtitle(true), 600);
      return () => clearTimeout(t);
    }
  }, [typedTitle, fullTitle]);

  useEffect(() => {
    if (hasInteracted) {
      const t = setTimeout(() => setShowHint(false), 1000);
      return () => clearTimeout(t);
    }
  }, [hasInteracted]);

  return (
    <div className="pointer-events-none absolute left-6 top-6 z-10">
      <h1 className="font-display text-2xl font-bold text-slate-100 font-mono">
        {typedTitle}
        <span className="animate-pulse text-cyan-400">_</span>
      </h1>
      <p
        className={`mt-1 font-mono text-sm text-slate-400 transition-opacity duration-700 ${
          showSubtitle ? "opacity-100" : "opacity-0"
        }`}
      >
        Security Engineer + AI Researcher
      </p>
      {showHint && (
        <p className="mt-2 font-mono text-xs text-cyan-500/60 transition-opacity duration-500">
          Click a node to explore. Drag to rotate. Scroll to zoom.
        </p>
      )}
    </div>
  );
}
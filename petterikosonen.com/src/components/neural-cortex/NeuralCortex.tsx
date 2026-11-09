"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { Scanlines, Vignette, CortexLoader } from "@/components/neural-cortex/Overlays";
import { AccessibleNav } from "@/components/neural-cortex/AccessibleNav";

import { SplashScreen } from "@/components/neural-cortex/SplashScreen";
import { TitleOverlay } from "@/components/neural-cortex/TitleOverlay";
import { CLUSTER_COLORS, getUnifiedWasmStatus } from "@/components/neural-cortex/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { nodes } from "@/lib/cortex-data";
import { ClusterInfoPanel } from "@/components/neural-cortex/ClusterInfoPanel";

const CortexCanvas = dynamic(
  () => import("@/components/neural-cortex/CortexCanvas"),
  { ssr: false, loading: () => <CortexLoader /> }
);

const CLUSTER_KEYS = ["core", "projects", "skills", "experience", "research"] as const;
const CLUSTER_LABELS: Record<string, string> = {
  core: "Core",
  projects: "Projects",
  skills: "Skills",
  experience: "Experience",
  research: "Research",
};

// ── Global keyframes ──
function GlobalStyles() {
  return (
    <style>{`
      @keyframes scanlines {
        0% { background-position: 0 0; }
        100% { background-position: 0 100%; }
      }
    `}</style>
  );
}

function StaticCortexFallback({
  activeCluster,
  onClusterSelect,
  isMobile,
}: {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  isMobile: boolean;
}) {
  return (
    <>
      <div className="pointer-events-none absolute left-6 top-5 z-30 select-none">
        <span className="text-sm font-bold tracking-wide text-slate-100 font-mono">
          Petteri Kosonen
        </span>
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 px-6">
        <h1 className="text-center font-mono text-3xl font-bold tracking-[0.25em] text-slate-100 sm:text-5xl">
          NEURAL CORTEX
        </h1>
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-slate-500">
          Interactive Portfolio
        </p>
        <nav aria-label="Clusters" className="flex flex-wrap justify-center gap-3">
          {CLUSTER_KEYS.map((key) => {
            const active = activeCluster === key;
            const color = CLUSTER_COLORS[key] ?? "#00f0ff";
            return (
              <button
                key={key}
                type="button"
                onClick={() => onClusterSelect(active ? null : key)}
                className="rounded-lg border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] transition-colors"
                style={{
                  borderColor: active ? color : "rgba(148,163,184,0.35)",
                  color: active ? color : "rgb(203,213,225)",
                  background: active ? `${color}14` : "transparent",
                }}
              >
                {CLUSTER_LABELS[key]}
              </button>
            );
          })}
        </nav>
      </div>
      <ClusterInfoPanel
        activeCluster={activeCluster}
        isMobile={isMobile}
        reducedMotion
      />
      <AccessibleNav
        onSelect={(id) => {
          const node = nodes.find((n) => n.id === id);
          if (node) onClusterSelect(node.cluster);
        }}
      />
    </>
  );
}

// ── Exported wrapper ──
export default function NeuralCortex() {
  const [entered, setEntered] = useState(false);
  const [shakeTimestamp, setShakeTimestamp] = useState(0);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const reducedMotion = usePrefersReducedMotion();

  // Detect mobile via matchMedia
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const particleCount = isMobile ? 2000 : 5000;

  const handleClusterSelect = useCallback((cluster: string | null) => {
    setActiveCluster(cluster);
    if (cluster !== null) {
      setShakeTimestamp((prev) => prev + 1);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[5] overflow-hidden bg-[#05070A]">
      <GlobalStyles />

      {reducedMotion ? (
        <StaticCortexFallback
          activeCluster={activeCluster}
          onClusterSelect={handleClusterSelect}
          isMobile={isMobile}
        />
      ) : (
        <>
          {!entered && <SplashScreen onEnter={() => setEntered(true)} />}

          {entered && (
            <>
              <div className="pointer-events-none absolute left-6 top-5 z-30 select-none">
                <span className="text-sm font-bold tracking-wide text-slate-100 font-mono">
                  Petteri Kosonen
                </span>
              </div>

              <CortexCanvas
                activeCluster={activeCluster}
                onClusterSelect={handleClusterSelect}
                shakeTimestamp={shakeTimestamp}
                particleCount={particleCount}
                isMobile={isMobile}
              />

              <TitleOverlay hasInteracted={activeCluster !== null} />

              <Scanlines />
              <Vignette />

              {activeCluster && (
                <button
                  onClick={() => handleClusterSelect(null)}
                  className="pointer-events-auto absolute left-6 top-20 z-30 rounded-lg border border-slate-700/60 bg-[#0a0a0f]/90 px-3 py-1.5 font-mono text-xs text-slate-300 backdrop-blur-sm transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
                >
                  Reset View
                </button>
              )}

              <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 select-none">
                <span className="font-mono text-[10px] text-slate-500/70 tracking-wide">
                  move cursor to explore · click areas to explore
                </span>
              </div>

              <ClusterInfoPanel
                activeCluster={activeCluster}
                isMobile={isMobile}
                reducedMotion={reducedMotion}
              />

              <AccessibleNav
                onSelect={(id) => {
                  const node = nodes.find((n) => n.id === id);
                  if (node) handleClusterSelect(node.cluster);
                }}
              />

              <WasmBadge />
            </>
          )}
        </>
      )}
    </div>
  );
}

function WasmBadge() {
  const [status, setStatus] = useState(getUnifiedWasmStatus());
  useEffect(() => {
    const id = setInterval(() => setStatus(getUnifiedWasmStatus()), 2000);
    return () => clearInterval(id);
  }, []);
  const label = status === "wasm" ? "WASM" : status === "js" ? "JS" : "...";
  const color =
    status === "wasm"
      ? "text-emerald-400 border-emerald-500/40"
      : status === "js"
        ? "text-amber-400 border-amber-500/40"
        : "text-slate-500 border-slate-600/40";
  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-20 select-none">
      <span
        className={`rounded border px-2 py-0.5 font-mono text-[10px] ${color} bg-[#0a0a0f]/80 backdrop-blur-sm`}
      >
        {label}
      </span>
    </div>
  );
}

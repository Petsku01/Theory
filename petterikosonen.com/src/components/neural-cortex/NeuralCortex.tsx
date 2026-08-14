"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { CortexScene } from "@/components/neural-cortex/CortexScene";

import { Scanlines, Vignette, CortexLoader } from "@/components/neural-cortex/Overlays";
import { AccessibleNav } from "@/components/neural-cortex/AccessibleNav";

import { SplashScreen } from "@/components/neural-cortex/SplashScreen";
import { getUnifiedWasmStatus } from "@/components/neural-cortex/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { nodes } from "@/lib/cortex-data";

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

// ── Cluster descriptions for minimal display ──
const CLUSTER_INFO: Record<string, { label: string; shortDesc: string }> = {
  core: {
    label: "Core",
    shortDesc: "Petteri Kosonen — Application Specialist + AI Researcher",
  },
  projects: {
    label: "Projects",
    shortDesc: "LLM fine-tuning, security testing, and prompt engineering tools",
  },
  skills: {
    label: "Skills",
    shortDesc: "Security, Cloud, Automation, AI/Prompting, Python, Linux, Web Dev",
  },
  experience: {
    label: "Experience",
    shortDesc: "2M-IT Application Specialist + Turku AMK Cybersecurity",
  },
  research: {
    label: "Research",
    shortDesc: "Reframing attacks, LLM research daily, automated analysis",
  },
};

// ── Cluster color map (matches utils.ts CLUSTER_COLORS) ──
const CLUSTER_COLOR_MAP: Record<string, string> = {
  core: "#00f0ff",
  projects: "#a855f7",
  skills: "#22d3ee",
  experience: "#f59e0b",
  research: "#ef4444",
};

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

  // Mobile: fewer particles, lower bloom. Desktop defaults.
  const particleCount = isMobile ? 2000 : 5000;
  const bloomIntensity = isMobile ? 1.2 : 2.2;

  const handleClusterSelect = useCallback(
    (cluster: string | null) => {
      setActiveCluster(cluster);
      if (cluster !== null) {
        setShakeTimestamp((prev) => prev + 1);
      }
    },
    []
  );

  // Minimal cluster info — only shown when a cluster is selected
  const activeInfo = activeCluster ? CLUSTER_INFO[activeCluster] : null;
  const activeColor = activeCluster ? CLUSTER_COLOR_MAP[activeCluster] ?? "#00f0ff" : "#00f0ff";

  return (
    <div className="fixed inset-0 z-[5] overflow-hidden bg-[#05070A]">
      <GlobalStyles />

      {/* Splash screen before entering */}
      {!entered && <SplashScreen onEnter={() => setEntered(true)} />}

      {/* Main 3D scene -- only renders after entering */}
      {entered && (
        <>
          {/* Name overlay only — no Contact button (it's in the Navbar) */}
          <div className="pointer-events-none absolute left-6 top-5 z-30 select-none">
            <span className="text-sm font-bold tracking-wide text-slate-100 font-mono">
              Petteri Kosonen
            </span>
          </div>

          <Suspense fallback={<CortexLoader />}>
            <Canvas
              camera={{ position: [0, 8, 16], fov: 55, near: 0.1, far: 100 }}
              gl={{
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
              }}
              dpr={[1, 2]}
            >
              <fog attach="fog" args={["#060818", 12, 40]} />
              <CortexScene
                activeCluster={activeCluster}
                onClusterSelect={handleClusterSelect}
                shakeTimestamp={shakeTimestamp}
                particleCount={particleCount}
                bloomIntensity={bloomIntensity}
                isMobile={isMobile}
                reducedMotion={reducedMotion}
              />
            </Canvas>
          </Suspense>

          <Scanlines />
          <Vignette />

          {activeCluster && (
            <button
              onClick={() => handleClusterSelect(null)}
              className="pointer-events-auto absolute left-6 top-20 z-20 rounded-lg border border-slate-700/60 bg-[#0a0a0f]/90 px-3 py-1.5 font-mono text-xs text-slate-300 backdrop-blur-sm transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
            >
              Reset View
            </button>
          )}

          {/* SYMBIOOSIS: No traditional navbar — cursor is navigation */}
          {/* Hint text for the user */}
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 select-none">
            <span className="font-mono text-[10px] text-slate-500/70 tracking-wide">
              move cursor to explore · click near an organ to focus
            </span>
          </div>

          {/* Minimal cluster info — replaces the old DetailPanel */}
          {activeInfo && (
            <div
              className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2 select-none rounded-lg border bg-[#0a0a0f]/80 px-4 py-2 backdrop-blur-sm"
              style={{
                borderColor: `${activeColor}40`,
                boxShadow: `0 0 20px ${activeColor}15`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: activeColor,
                    boxShadow: `0 0 6px ${activeColor}`,
                  }}
                />
                <span
                  className="font-mono text-sm font-bold tracking-wide"
                  style={{ color: activeColor }}
                >
                  {activeInfo.label}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-400 max-w-xs text-center">
                {activeInfo.shortDesc}
              </p>
            </div>
          )}

          <AccessibleNav onSelect={(id) => {
            // Map node id to its cluster
            const node = nodes.find((n) => n.id === id);
            if (node) handleClusterSelect(node.cluster);
          }} />

          {/* WASM status badge */}
          <WasmBadge />
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
  const color = status === "wasm" ? "text-emerald-400 border-emerald-500/40" : status === "js" ? "text-amber-400 border-amber-500/40" : "text-slate-500 border-slate-600/40";
  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-20 select-none">
      <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${color} bg-[#0a0a0f]/80 backdrop-blur-sm`}>
        {label}
      </span>
    </div>
  );
}
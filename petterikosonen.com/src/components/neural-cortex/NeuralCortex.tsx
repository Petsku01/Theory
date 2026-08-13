"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { CortexScene } from "@/components/neural-cortex/CortexScene";
import { DetailPanel } from "@/components/neural-cortex/DetailPanel";

import { Scanlines, Vignette, CortexLoader } from "@/components/neural-cortex/Overlays";
import { AccessibleNav } from "@/components/neural-cortex/AccessibleNav";

import { SplashScreen } from "@/components/neural-cortex/SplashScreen";
import { getUnifiedWasmStatus } from "@/components/neural-cortex/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { nodes, type CortexNode } from "@/lib/cortex-data";

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

// ── Cluster descriptions for detail panel ──
const CLUSTER_INFO: Record<string, { label: string; shortDesc: string; fullDesc: string }> = {
  core: {
    label: "Core",
    shortDesc: "Petteri Kosonen — Application Specialist + AI Researcher",
    fullDesc:
      "Application Specialist at 2M-IT by day, AI researcher by night. Building tools for prompt security, fine-tuning, and trustworthy automation.",
  },
  projects: {
    label: "Projects",
    shortDesc: "LLM fine-tuning, security testing, and prompt engineering tools",
    fullDesc:
      "Prompt Optimizer, Prompt Security Guide, PromptKit, VET Pilot, HetuGuard, and Injection Scanner — a collection of AI-focused projects.",
  },
  skills: {
    label: "Skills",
    shortDesc: "Security, Cloud, Automation, AI/Prompting, Python, Linux, Web Dev",
    fullDesc:
      "From operational security and Microsoft cloud administration to Python automation and full-stack web development.",
  },
  experience: {
    label: "Experience",
    shortDesc: "2M-IT Application Specialist + Turku AMK Cybersecurity",
    fullDesc:
      "Application Specialist at 2M-IT (2022-), B.Eng. Cybersecurity at Turku AMK (2020-). Applied research in LLM security and prompt engineering.",
  },
  research: {
    label: "Research",
    shortDesc: "Reframing attacks, LLM research daily, automated analysis",
    fullDesc:
      "Reframing attack preprint (9 models, 10 categories, 222 tests), daily LLM research pipeline, and automated multi-model analysis.",
  },
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

  const [panelCluster, setPanelCluster] = useState<string | null>(null);
  const [panelStage, setPanelStage] = useState<"show" | "hiding" | "hidden">(
    "hidden"
  );
  const panelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeCluster) {
      clearTimeout(panelTimeout.current!);
      setPanelCluster(activeCluster);
      setPanelStage("show");
    } else if (panelCluster) {
      setPanelStage("hiding");
      panelTimeout.current = setTimeout(() => {
        setPanelCluster(null);
        setPanelStage("hidden");
      }, 300);
    }
    return () => clearTimeout(panelTimeout.current!);
  }, [activeCluster, panelCluster]);

  const handleClusterSelect = useCallback(
    (cluster: string | null) => {
      setActiveCluster(cluster);
      if (cluster !== null) {
        setShakeTimestamp((prev) => prev + 1);
      }
    },
    []
  );

  const handlePanelClose = useCallback(() => {
    setActiveCluster(null);
  }, []);

  // Build a pseudo-CortexNode for the DetailPanel from cluster info
  const panelNode = useMemo<CortexNode | null>(() => {
    if (!panelCluster) return null;
    const info = CLUSTER_INFO[panelCluster];
    if (!info) return null;
    const firstNode = nodes.find((n) => n.cluster === panelCluster);
    return {
      id: panelCluster,
      label: info.label,
      type: firstNode?.type ?? "core",
      shortDesc: info.shortDesc,
      fullDesc: info.fullDesc,
      tech: firstNode?.tech,
      link: firstNode?.link,
      color: firstNode?.color ?? "#00f0ff",
      size: 2.0,
      cluster: panelCluster,
    };
  }, [panelCluster]);

  return (
    <div className="fixed inset-0 z-[5] overflow-hidden bg-[#05070A]">
      <GlobalStyles />

      {/* Splash screen before entering */}
      {!entered && <SplashScreen onEnter={() => setEntered(true)} />}

      {/* Main 3D scene -- only renders after entering */}
      {entered && (
        <>
          {/* Name + CTA overlay */}
          <div className="pointer-events-none absolute left-6 top-5 z-30 select-none flex flex-col gap-3">
            <span className="text-sm font-bold tracking-wide text-slate-100 font-mono">
              Petteri Kosonen
            </span>
            <a
              href="/contact"
              className="pointer-events-auto inline-flex w-fit items-center gap-2 rounded-lg border border-cyan-500/40 bg-[#0a0a0f]/80 px-4 py-2 font-mono text-xs text-cyan-400 backdrop-blur-sm transition-colors hover:border-cyan-500/60 hover:bg-cyan-500/10"
            >
              Contact
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
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

          <DetailPanel
            node={panelNode}
            stage={panelStage}
            onCloseAction={handlePanelClose}
          />

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
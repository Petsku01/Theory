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
import { ClusterInfoPanel } from "@/components/neural-cortex/ClusterInfoPanel";

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
              onPointerMissed={() => handleClusterSelect(null)}
            >
              <fog attach="fog" args={["#060818", 30, 80]} />
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
              className="pointer-events-auto absolute left-6 top-20 z-30 rounded-lg border border-slate-700/60 bg-[#0a0a0f]/90 px-3 py-1.5 font-mono text-xs text-slate-300 backdrop-blur-sm transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
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

          {/* Cluster info panel — floating haze showing cluster contents */}
          <ClusterInfoPanel
            activeCluster={activeCluster}
            isMobile={isMobile}
            reducedMotion={reducedMotion}
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
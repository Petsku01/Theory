"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { nodes, type CortexNode } from "@/lib/cortex-data";
import { CortexScene } from "@/components/neural-cortex/CortexScene";
import { DetailPanel } from "@/components/neural-cortex/DetailPanel";

import { Scanlines, Vignette, CortexLoader } from "@/components/neural-cortex/Overlays";
import { AccessibleNav } from "@/components/neural-cortex/AccessibleNav";

import { SplashScreen } from "@/components/neural-cortex/SplashScreen";
import { getUnifiedWasmStatus } from "@/components/neural-cortex/utils";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [shakeTimestamp, setShakeTimestamp] = useState(0);

  const [panelNode, setPanelNode] = useState<CortexNode | null>(null);
  const [panelStage, setPanelStage] = useState<"show" | "hiding" | "hidden">(
    "hidden"
  );
  const panelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [selectedId]
  );

  useEffect(() => {
    if (selectedNode) {
      clearTimeout(panelTimeout.current!);
      setPanelNode(selectedNode);
      setPanelStage("show");
    } else if (panelNode) {
      setPanelStage("hiding");
      panelTimeout.current = setTimeout(() => {
        setPanelNode(null);
        setPanelStage("hidden");
      }, 300);
    }
    return () => clearTimeout(panelTimeout.current!);
  }, [selectedNode, panelNode]);

  const handleNodeSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id !== null) {
        setShakeTimestamp((prev) => prev + 1);
      }
    },
    []
  );

  const handlePanelClose = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className="fixed inset-0 z-[5] overflow-hidden bg-[#05070A]">
      <GlobalStyles />

      {/* Splash screen before entering */}
      {!entered && <SplashScreen onEnter={() => setEntered(true)} />}

      {/* Main 3D scene -- only renders after entering */}
      {entered && (
        <>
          {/* Name overlay */}
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
                selectedId={selectedId}
                onNodeSelect={handleNodeSelect}
                shakeTimestamp={shakeTimestamp}
              />
            </Canvas>
          </Suspense>

          <Scanlines />
          <Vignette />

          {selectedId && (
            <button
              onClick={() => handleNodeSelect(null)}
              className="pointer-events-auto absolute left-6 top-20 z-20 rounded-lg border border-slate-700/60 bg-[#0a0a0f]/90 px-3 py-1.5 font-mono text-xs text-slate-300 backdrop-blur-sm transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
            >
              Reset View
            </button>
          )}

          <nav
            className="pointer-events-auto absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2"
            aria-label="Cluster navigation"
          >
            {(
              ["core", "projects", "skills", "experience", "research"] as const
            ).map((cluster) => {
              const isActive = selectedNode?.cluster === cluster;
              return (
                <button
                  key={cluster}
                  onClick={() => {
                    const node = nodes.find((n) => n.cluster === cluster);
                    if (node) handleNodeSelect(node.id);
                  }}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs backdrop-blur-sm transition-colors ${
                    isActive
                      ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-400"
                      : "border-slate-700/50 bg-[#0a0a0f]/80 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-500"
                  }`}
                >
                  {cluster}
                </button>
              );
            })}
          </nav>

          <DetailPanel
            node={panelNode}
            stage={panelStage}
            onCloseAction={handlePanelClose}
          />

          <AccessibleNav onSelect={(id) => handleNodeSelect(id)} />

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
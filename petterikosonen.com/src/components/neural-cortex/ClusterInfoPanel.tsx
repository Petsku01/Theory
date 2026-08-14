"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { nodes, type CortexNode } from "@/lib/cortex-data";

// ── Cluster labels ──
const CLUSTER_LABELS: Record<string, string> = {
  core: "Core",
  projects: "Projects",
  skills: "Skills",
  experience: "Experience",
  research: "Research",
};

// ── Cluster colors (matches CLUSTER_COLORS in utils.ts) ──
const CLUSTER_COLORS: Record<string, string> = {
  core: "#00f0ff",
  projects: "#a855f7",
  skills: "#22d3ee",
  experience: "#f59e0b",
  research: "#ef4444",
};

// ── Core intro text (special case: core has only one node) ──
const CORE_INTRO =
  "Application Specialist at 2M-IT by day, AI researcher by night. Building tools for prompt security, fine-tuning, and trustworthy automation.";

export interface ClusterInfoPanelProps {
  activeCluster: string | null;
  isMobile?: boolean;
  reducedMotion?: boolean;
}

export function ClusterInfoPanel({
  activeCluster,
  isMobile = false,
  reducedMotion = false,
}: ClusterInfoPanelProps) {
  // Filter nodes for the active cluster
  const clusterNodes = useMemo(() => {
    if (!activeCluster) return [];
    return nodes.filter((n) => n.cluster === activeCluster);
  }, [activeCluster]);

  const clusterColor = activeCluster
    ? CLUSTER_COLORS[activeCluster] ?? "#00f0ff"
    : "#00f0ff";

  const clusterLabel = activeCluster
    ? CLUSTER_LABELS[activeCluster] ?? activeCluster
    : "";

  // Animation variants — respect reducedMotion
  const panelVariants = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : isMobile
      ? {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 20 },
          transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
        }
      : {
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 15 },
          transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
        };

  // ── Core cluster: special single-node display ──
  const isCore = activeCluster === "core";

  return (
    <AnimatePresence mode="wait">
      {activeCluster && (
        <motion.div
          key={activeCluster}
          initial={panelVariants.initial}
          animate={panelVariants.animate}
          exit={panelVariants.exit}
          transition={panelVariants.transition}
          className={
            isMobile
              ? "fixed inset-x-0 bottom-0 z-40 select-none"
              : "fixed right-6 top-1/2 z-40 -translate-y-1/2 select-none"
          }
        >
          <div
            className={
              isMobile
                ? "mx-3 mb-3 rounded-2xl border bg-[#070910]/85 p-5 backdrop-blur-xl"
                : "w-72 rounded-2xl border bg-[#070910]/85 p-5 backdrop-blur-xl"
            }
            style={{
              borderColor: `${clusterColor}30`,
              boxShadow: `0 8px 40px ${clusterColor}10, 0 0 1px ${clusterColor}20`,
            }}
          >
            {/* ── Header: cluster name with colored dot ── */}
            <div className="flex items-center gap-2.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: clusterColor,
                  boxShadow: `0 0 8px ${clusterColor}`,
                }}
              />
              <span
                className="font-mono text-sm font-bold uppercase tracking-wider"
                style={{ color: clusterColor }}
              >
                {clusterLabel}
              </span>
            </div>

            {/* ── Thin accent line ── */}
            <div
              className="mt-3 mb-4 h-px"
              style={{
                background: `linear-gradient(to right, ${clusterColor}40, transparent)`,
              }}
            />

            {/* ── Core: single intro paragraph ── */}
            {isCore && (
              <p className="font-mono text-[11px] leading-relaxed text-slate-300/80">
                {CORE_INTRO}
              </p>
            )}

            {/* ── Non-core: list of nodes ── */}
            {!isCore && (
              <div className="flex flex-col gap-3.5">
                {clusterNodes.map((node: CortexNode) => (
                  <div key={node.id} className="flex flex-col gap-0.5">
                    <span className="font-mono text-[12px] font-semibold text-slate-100">
                      {node.label}
                    </span>
                    <span className="font-mono text-[10px] leading-relaxed text-slate-400/80">
                      {node.shortDesc}
                    </span>
                  </div>
                ))}
                {clusterNodes.length === 0 && (
                  <span className="font-mono text-[10px] text-slate-500">
                    No nodes found.
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
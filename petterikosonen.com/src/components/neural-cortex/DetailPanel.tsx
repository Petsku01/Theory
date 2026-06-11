"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type CortexNode, edges } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";

// ── Mini connection diagram showing linked nodes ──
function ConnectionMiniMap({ node }: { node: CortexNode }) {
  const connections = useMemo(() => {
    const linked = new Set<string>();
    for (const e of edges) {
      if (e.from === node.id) linked.add(e.to);
      if (e.to === node.id) linked.add(e.from);
    }
    return [...linked].slice(0, 6);
  }, [node.id]);

  const clusterColor = CLUSTER_COLORS[node.cluster] ?? "#00f0ff";

  return (
    <div className="mt-3 flex items-center gap-1.5">
      {/* Center node */}
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="h-3 w-3 rounded-full ring-2"
          style={{
            backgroundColor: clusterColor,
            boxShadow: `0 0 4px ${clusterColor}`,
          }}
        />
        <span className="text-[0.5rem] text-slate-500 font-mono truncate max-w-[3rem]">
          you
        </span>
      </div>
      {/* Connection lines + nodes */}
      {connections.map((connId, i) => {
        const angle = (i / connections.length) * Math.PI * 2 - Math.PI / 2;
        const dx = Math.cos(angle) * 28;
        const dy = Math.sin(angle) * 12;
        return (
          <div
            key={connId}
            className="absolute"
            style={{
              transform: `translate(${dx}px, ${dy}px)`,
            }}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          </div>
        );
      })}
      {/* Simplified: just show connection count */}
      <div className="ml-2 flex items-center gap-1.5">
        <svg width="24" height="12" viewBox="0 0 24 12">
          <line
            x1="0"
            y1="6"
            x2="24"
            y2="6"
            stroke={clusterColor}
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.5"
          />
          <circle cx="0" cy="6" r="2" fill={clusterColor} />
          {connections.map((_, i) => (
            <circle
              key={i}
              cx={8 + i * 5}
              cy={6}
              r="1.5"
              fill="#64748b"
              opacity="0.7"
            />
          ))}
        </svg>
        <span className="text-[0.65rem] text-slate-400 font-mono">
          {connections.length} link{connections.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ── Stagger animation variants ──
const panelVariants = {
  hidden: { x: 320, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.06,
    },
  },
  hiding: {
    x: 320,
    opacity: 0,
    transition: { duration: 0.25, ease: "easeIn" as const },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ── Detail panel with glassmorphism + framer-motion ──
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

  const clusterColor = CLUSTER_COLORS[node.cluster] ?? "#00f0ff";

  return (
    <AnimatePresence mode="wait">
      <motion.div
          key={node.id}
          variants={panelVariants}
          initial="hidden"
          animate={stage === "show" ? "show" : "hiding"}
          exit="hiding"
          className="pointer-events-auto fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-black/40 p-5 shadow-2xl backdrop-blur-xl max-md:bottom-0 max-md:left-0 max-md:top-auto max-md:w-full max-md:rounded-b-none"
          style={{
            borderColor: `${clusterColor}30`,
            boxShadow: `0 0 40px ${clusterColor}10, inset 0 0 20px ${clusterColor}05`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onCloseAction}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-100 transition-colors"
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

          {/* Header */}
          <motion.div variants={childVariants} className="mb-3 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shadow-lg"
              style={{
                backgroundColor: clusterColor,
                boxShadow: `0 0 8px ${clusterColor}80`,
              }}
            />
            <h3 className="text-lg font-bold text-slate-100 font-mono">
              {node.label}
            </h3>
          </motion.div>

          {/* Description */}
          <motion.p variants={childVariants} className="mt-1 text-sm text-slate-300">
            {node.fullDesc ?? node.shortDesc}
          </motion.p>

          {/* Tech tags */}
          {node.tech && (
            <motion.div variants={childVariants} className="mt-3 flex flex-wrap gap-1.5">
              {node.tech.map((t) => (
                <span
                  key={t}
                  className="rounded-md px-2 py-0.5 font-mono text-xs"
                  style={{
                    backgroundColor: `${clusterColor}15`,
                    color: clusterColor,
                    border: `1px solid ${clusterColor}30`,
                  }}
                >
                  {t}
                </span>
              ))}
            </motion.div>
          )}

          {/* Connection mini-diagram */}
          <motion.div variants={childVariants}>
            <ConnectionMiniMap node={node} />
          </motion.div>

          {/* Link */}
          {node.link && (
            <motion.a
              variants={childVariants}
              href={node.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors"
              style={{
                backgroundColor: `${clusterColor}10`,
                color: clusterColor,
                border: `1px solid ${clusterColor}30`,
              }}
              whileHover={{
                backgroundColor: `${clusterColor}20`,
                borderColor: `${clusterColor}50`,
              }}
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
            </motion.a>
          )}

          {/* Type badge */}
          <motion.div variants={childVariants} className="mt-3">
            <span
              className="rounded px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider"
              style={{
                backgroundColor: `${clusterColor}10`,
                color: `${clusterColor}cc`,
                border: `1px solid ${clusterColor}20`,
              }}
            >
              {node.type}
            </span>
          </motion.div>
        </motion.div>
    </AnimatePresence>
  );
}
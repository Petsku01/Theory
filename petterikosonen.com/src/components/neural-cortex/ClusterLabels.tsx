"use client";

import { Html } from "@react-three/drei";
import { clusterPositions } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";

const CLUSTER_LABELS: Record<string, string> = {
  core: "Core",
  projects: "Projects",
  skills: "Skills",
  experience: "Experience",
  research: "Research",
};

const CLUSTER_KEYS = ["core", "projects", "skills", "experience", "research"] as const;

export interface ClusterLabelsProps {
  activeCluster: string | null;
  hoveredCluster: string | null;
}

export function ClusterLabels({ activeCluster, hoveredCluster }: ClusterLabelsProps) {
  return (
    <>
      {CLUSTER_KEYS.map((key) => {
        const pos = clusterPositions[key] ?? [0, 0, 0];
        const label = CLUSTER_LABELS[key] ?? key;
        const color = CLUSTER_COLORS[key] ?? "#00f0ff";
        const isActive = activeCluster === key;
        const isHovered = hoveredCluster === key;
        const opacity = isActive ? 1.0 : isHovered ? 0.85 : 0.5;

        return (
          <Html
            key={key}
            position={[pos[0], pos[1] + 2.0, pos[2]]}
            center
            distanceFactor={12}
            zIndexRange={[10, 0]}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "14px",
                fontWeight: 600,
                color,
                opacity,
                textShadow: `0 0 8px ${color}80`,
                transition: "opacity 0.2s ease",
                whiteSpace: "nowrap",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          </Html>
        );
      })}
    </>
  );
}
"use client";

import { useCallback } from "react";
import { clusterPositions } from "@/lib/cortex-data";

const CLUSTER_KEYS = ["core", "projects", "skills", "experience", "research"] as const;

export interface ClusterPickTargetProps {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  onClusterHover: (cluster: string | null) => void;
}

export function ClusterPickTarget({
  onClusterSelect,
  onClusterHover,
}: ClusterPickTargetProps) {
  const handleClick = useCallback(
    (key: string) => (e: any) => {
      e.stopPropagation();
      onClusterSelect(key);
    },
    [onClusterSelect],
  );

  const handleHover = useCallback(
    (key: string | null) => (e: any) => {
      if (e) e.stopPropagation();
      onClusterHover(key);
      if (key) {
        document.body.style.cursor = "pointer";
      } else {
        document.body.style.cursor = "default";
      }
    },
    [onClusterHover],
  );

  return (
    <>
      {CLUSTER_KEYS.map((key) => {
        const pos = clusterPositions[key] ?? [0, 0, 0];
        return (
          <mesh
            key={key}
            position={[pos[0], pos[1], pos[2]]}
            visible={false}
            onClick={handleClick(key)}
            onPointerOver={handleHover(key)}
            onPointerOut={handleHover(null)}
          >
            <sphereGeometry args={[2.5, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        );
      })}
    </>
  );
}
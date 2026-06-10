import * as THREE from "three";
import { clusterPositions, type CortexNode } from "@/lib/cortex-data";

// ── Per-cluster colour scheme (replaces ad-hoc node colors) ──
export const CLUSTER_COLORS: Record<string, string> = {
  core: "#00f0ff",
  projects: "#a855f7",
  skills: "#22d3ee",
  experience: "#f59e0b",
  research: "#ef4444",
};

// ── Layout: organic Fibonacci-spiral placement around cluster centers ──
// Deterministic seeded PRNG so layout is stable across renders
export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function computePositions(nodeList: CortexNode[]): Map<string, THREE.Vector3> {
  const pos = new Map<string, THREE.Vector3>();
  const clusterNodes = new Map<string, CortexNode[]>();
  for (const n of nodeList) {
    const arr = clusterNodes.get(n.cluster) ?? [];
    arr.push(n);
    clusterNodes.set(n.cluster, arr);
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399 rad

  for (const [cluster, clusterList] of clusterNodes) {
    const center = new THREE.Vector3(
      ...(clusterPositions[cluster] ?? [0, 0, 0])
    );
    const count = clusterList.length;

    if (count === 1) {
      // Core node: stay at center with tiny jitter
      pos.set(clusterList[0].id, center.clone());
      continue;
    }

    // Fibonacci spiral: i-th node at angle i*goldenAngle, radius sqrt(i/count)*spread
    const spread = 3.2 + count * 0.3;
    clusterList.forEach((node, i) => {
      const angle = i * goldenAngle;
      const r = Math.sqrt((i + 0.5) / count) * spread;
      // Deterministic per-node jitter with Y variation
      const rng = seededRandom(node.id.length * 127 + i * 31);
      const jitter = new THREE.Vector3(
        (rng() - 0.5) * 0.3,
        (rng() - 0.5) * 1.0,
        (rng() - 0.5) * 0.3
      );
      const offset = new THREE.Vector3(
        Math.cos(angle) * r,
        Math.sin(angle * 0.7 + i * 1.1) * 0.8,
        Math.sin(angle) * r
      ).add(jitter);
      pos.set(node.id, center.clone().add(offset));
    });
  }
  return pos;
}

// ── Soft-circle texture for particles ──
export function createSoftCircleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 64);
  // Soft radial gradient: opaque white centre → transparent edge
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.8, "rgba(255,255,255,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// ── Helper: blend two hex colours ──
export function blendColors(a: string, b: string, t: number = 0.5): string {
  const colA = new THREE.Color(a);
  const colB = new THREE.Color(b);
  return colA.clone().lerp(colB, t).getStyle();
}
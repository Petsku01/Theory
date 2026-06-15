"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { nodes, edges } from "@/lib/cortex-data";
import { CLUSTER_COLORS, blendColors } from "@/components/neural-cortex/utils";

// ── Edge cylinder helper ──
const EdgeCylinder = React.memo(function EdgeCylinder({
  from,
  to,
  color,
  opacity,
  thickness,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  opacity: number;
  thickness: number;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const len = direction.length();
    const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const orientation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );
    return { position: midpoint, quaternion: orientation, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion} renderOrder={0}>
    <cylinderGeometry args={[thickness, thickness, length, 6, 1]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
});

// ── Shared geometry for energy pulses (avoid per-instance allocation) ──
const PULSE_GEOMETRY = /* @__PURE__ */ new THREE.SphereGeometry(1, 8, 8);

// ── Energy Pulse (travelling light along an edge) ──
function EnergyPulse({
  from,
  to,
  color,
  speed = 2,
  pulseSize = 0.06,
  opacity = 1,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  speed?: number;
  pulseSize?: number;
  opacity?: number;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(Math.random() * speed);
  const posRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    if (!sphereRef.current) return;
    const t = (state.clock.elapsedTime + offsetRef.current) % speed;
    const progress = t / speed;
    posRef.current.lerpVectors(from, to, progress);
    sphereRef.current.position.copy(posRef.current);
  });

  return (
    <mesh ref={sphereRef} renderOrder={0} scale={pulseSize}>
      <primitive object={PULSE_GEOMETRY} attach="geometry" />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

// ── All network edges with cluster-coloured wires & travelling pulses ──
export const NetworkEdges = React.memo(function NetworkEdges({
  positions,
  selectedId,
}: {
  positions: Map<string, THREE.Vector3>;
  selectedId: string | null;
}) {
  // Build an id → cluster map
  const nodeClusterMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((n) => map.set(n.id, n.cluster));
    return map;
  }, []);

  const edgeData = useMemo(() => {
    return edges
      .filter((e) => positions.has(e.from) && positions.has(e.to))
      .map((e) => {
        const fromPos = positions.get(e.from)!;
        const toPos = positions.get(e.to)!;
        const clusterFrom = nodeClusterMap.get(e.from);
        const clusterTo = nodeClusterMap.get(e.to);
        const colorFrom = CLUSTER_COLORS[clusterFrom ?? ""] ?? "#00f0ff";
        const colorTo = CLUSTER_COLORS[clusterTo ?? ""] ?? "#00f0ff";
        const edgeColor =
          clusterFrom === clusterTo
            ? colorFrom
            : blendColors(colorFrom, colorTo, 0.5);
        const highlight = selectedId === e.from || selectedId === e.to;

        return {
          key: `${e.from}-${e.to}`,
          from: fromPos,
          to: toPos,
          strength: e.strength,
          color: edgeColor,
          highlight,
        };
      });
  }, [positions, selectedId, nodeClusterMap]);

  return (
    <>
      {edgeData.map((ed) => {
        const wireOpacity = ed.highlight ? 0.5 : 0.2;
        const pulseOpacity = ed.highlight ? 1 : 0.5;
        const pulseSpeed = ed.highlight ? 1.2 : 2.0;
        return (
          <group key={ed.key}>
            {/* Thin wire */}
            <EdgeCylinder
              from={ed.from}
              to={ed.to}
              color={ed.color}
              opacity={wireOpacity}
              thickness={0.02}
            />
            {/* Glow cylinder only when highlighted */}
            {ed.highlight && (
              <EdgeCylinder
                from={ed.from}
                to={ed.to}
                color={ed.color}
                opacity={0.1}
                thickness={0.04}
              />
            )}
            {/* Travelling pulse */}
            <EnergyPulse
              from={ed.from}
              to={ed.to}
              color={ed.color}
              speed={pulseSpeed}
              opacity={pulseOpacity}
              pulseSize={0.05}
            />
          </group>
        );
      })}
    </>
  );
});
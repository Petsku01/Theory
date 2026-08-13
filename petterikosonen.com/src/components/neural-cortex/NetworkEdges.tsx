"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { nodes, edges } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";

// ── Shared geometry for energy pulses (sphereGeometry(1,12,12)) ──
const PULSE_GEOMETRY = /* @__PURE__ */ new THREE.SphereGeometry(1, 12, 12);

// ── Create gradient cylinder geometry with vertex colors A→B ──
function createGradientCylinder(
  thickness: number,
  length: number,
  fromColor: THREE.Color,
  toColor: THREE.Color,
  radialSegments = 12
): THREE.BufferGeometry {
  const safeThickness = Math.max(0.001, thickness);
  const safeLen = Math.max(0.001, length);
  const geom = new THREE.CylinderGeometry(
    safeThickness,
    safeThickness,
    safeLen,
    radialSegments,
    1
  );
  const positions = geom.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const halfLen = safeLen / 2;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    // t=0 at bottom (from-end), t=1 at top (to-end)
    const t = Math.max(0, Math.min(1, (y + halfLen) / safeLen));
    colors[i * 3] = fromColor.r + (toColor.r - fromColor.r) * t;
    colors[i * 3 + 1] = fromColor.g + (toColor.g - fromColor.g) * t;
    colors[i * 3 + 2] = fromColor.b + (toColor.b - fromColor.b) * t;
  }
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geom;
}

// ── Pulse count by strength (mobile reduces by 1) ──
function pulseCount(strength: number, isMobile: boolean): number {
  const base = strength > 0.7 ? 3 : strength >= 0.4 ? 2 : 1;
  return isMobile ? Math.max(1, base - 1) : base;
}

// ── Multi-pulse: N spheres travelling along edge, brightening at midpoint ──
const MultiPulse = React.memo(function MultiPulse({
  from,
  to,
  fromColor,
  toColor,
  count,
  isHighlighted,
  reducedMotion,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  fromColor: THREE.Color;
  toColor: THREE.Color;
  count: number;
  isHighlighted: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3());
  const colorRef = useRef(new THREE.Color());

  const speed = isHighlighted ? 1.5 : 2.5;

  // Evenly distributed phase offsets
  const phases = useMemo(
    () => Array.from({ length: count }, (_, i) => i / count),
    [count]
  );

  // Set initial pulse positions (also used for reducedMotion static display)
  useEffect(() => {
    if (!groupRef.current) return;
    for (let i = 0; i < groupRef.current.children.length; i++) {
      const mesh = groupRef.current.children[i] as THREE.Mesh;
      if (!mesh) continue;
      const t = phases[i] ?? 0;
      mesh.position.lerpVectors(from, to, t);
      // Set initial color
      const mat = mesh.material as THREE.MeshStandardMaterial;
      colorRef.current.copy(fromColor).lerp(toColor, t);
      mat.emissive.copy(colorRef.current);
    }
  }, [from, to, fromColor, toColor, phases]);

  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;

    const elapsed = state.clock.elapsedTime;
    for (let i = 0; i < groupRef.current.children.length; i++) {
      const mesh = groupRef.current.children[i] as THREE.Mesh;
      if (!mesh) continue;

      const offset = phases[i] ?? 0;
      const t = ((elapsed / speed) + offset) % 1;

      posRef.current.lerpVectors(from, to, t);
      mesh.position.copy(posRef.current);

      // Brighten at midpoint (t=0.5): brightness goes 0→1→0
      const brightness = 1 - Math.abs(t - 0.5) * 2;

      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + brightness * 2.5;

      // Color blend along path
      colorRef.current.copy(fromColor).lerp(toColor, t);
      mat.emissive.copy(colorRef.current);
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} scale={0.06} renderOrder={1}>
          <primitive object={PULSE_GEOMETRY} attach="geometry" />
          <meshStandardMaterial
            emissive={fromColor}
            emissiveIntensity={0.5}
            toneMapped={false}
            transparent
            opacity={isHighlighted ? 0.9 : 0.6}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
});

// ── All network edges with gradient vertex-color cylinders & multi-pulses ──
export const NetworkEdges = React.memo(function NetworkEdges({
  positions,
  selectedId,
  isMobile = false,
  reducedMotion = false,
}: {
  positions: Map<string, THREE.Vector3>;
  selectedId: string | null;
  isMobile?: boolean;
  reducedMotion?: boolean;
}) {
  // Build id -> cluster map
  const nodeClusterMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((n) => map.set(n.id, n.cluster));
    return map;
  }, []);

  // Compute edge data (stable — does NOT depend on selectedId)
  const edgeData = useMemo(() => {
    return edges
      .filter((e) => positions.has(e.from) && positions.has(e.to))
      .map((e) => {
        const fromPos = positions.get(e.from)!;
        const toPos = positions.get(e.to)!;
        const fromCluster = nodeClusterMap.get(e.from);
        const toCluster = nodeClusterMap.get(e.to);
        const fromColor = new THREE.Color(
          CLUSTER_COLORS[fromCluster ?? ""] ?? "#00f0ff"
        );
        const toColor = new THREE.Color(
          CLUSTER_COLORS[toCluster ?? ""] ?? "#00f0ff"
        );
        const blendColor = fromColor.clone().lerp(toColor, 0.5);

        const direction = new THREE.Vector3().subVectors(toPos, fromPos);
        const length = Math.max(0.001, direction.length());
        const midpoint = new THREE.Vector3()
          .addVectors(fromPos, toPos)
          .multiplyScalar(0.5);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize()
        );

        // Paksuus = 0.012 + edge.strength * 0.018
        const thickness = 0.012 + e.strength * 0.018;

        return {
          key: `${e.from}-${e.to}`,
          fromId: e.from,
          toId: e.to,
          from: fromPos,
          to: toPos,
          fromColor,
          toColor,
          blendColor,
          position: [midpoint.x, midpoint.y, midpoint.z] as [
            number,
            number,
            number
          ],
          quaternion,
          length,
          thickness,
          pulseCount: pulseCount(e.strength, isMobile),
        };
      });
  }, [positions, nodeClusterMap, isMobile]);

  // Create gradient cylinder geometries (stable — only changes when edgeData changes)
  const geometries = useMemo(() => {
    return edgeData.map((ed) =>
      createGradientCylinder(
        ed.thickness,
        ed.length,
        ed.fromColor,
        ed.toColor,
        12
      )
    );
  }, [edgeData]);

  // Dispose geometries when they change or on unmount
  useEffect(() => {
    return () => {
      geometries.forEach((g) => g.dispose());
    };
  }, [geometries]);

  return (
    <>
      {edgeData.map((ed, i) => {
        const isHighlighted =
          selectedId !== null &&
          (ed.fromId === selectedId || ed.toId === selectedId);

        const scale: [number, number, number] = isHighlighted
          ? [1.5, 1, 1.5]
          : [1, 1, 1];

        return (
          <group key={ed.key}>
            {/* Gradient edge cylinder — vertexColors + meshStandardMaterial emissive */}
            <mesh
              position={ed.position}
              quaternion={ed.quaternion}
              geometry={geometries[i]}
              scale={scale}
              renderOrder={0}
            >
              <meshStandardMaterial
                vertexColors
                emissive={ed.blendColor}
                emissiveIntensity={isHighlighted ? 2.0 : 0.3}
                transparent
                opacity={isHighlighted ? 0.65 : 0.25}
                depthWrite={false}
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>

            {/* Multi-pulse */}
            <MultiPulse
              from={ed.from}
              to={ed.to}
              fromColor={ed.fromColor}
              toColor={ed.toColor}
              count={ed.pulseCount}
              isHighlighted={isHighlighted}
              reducedMotion={reducedMotion}
            />
          </group>
        );
      })}
    </>
  );
});
"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { type CortexNode } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";
import { useScramble } from "@/components/neural-cortex/hooks/useScramble";

// ── 3D Node (solid emissive icosahedron + inner core + wireframe overlay) ──
export const NetworkNode = React.memo(function NetworkNode({
  node,
  position,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  node: CortexNode;
  position: THREE.Vector3;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const outerMeshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const baseSize = node.size * 0.22;
  const clusterColor = CLUSTER_COLORS[node.cluster] ?? "#00f0ff";
  const color = useMemo(() => new THREE.Color(clusterColor), [clusterColor]);

  const displayText = useScramble(node.label, isHovered);

  // Time-varying oscillation: scale + vertical bob for depth perception
  const timeRef = useRef(0);
  // Per-node phase offset so they don't all bob in sync
  const phaseOffset = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < node.id.length; i++) hash = ((hash << 5) - hash + node.id.charCodeAt(i));
    return (Math.abs(hash) % 100) / 100 * Math.PI * 2;
  }, [node.id]);
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const isActive = isHovered || isSelected;
    const amplitude = isActive ? 0.075 : 0.05;
    const speed = isActive ? 6 : 3;
    const oscillation = 1 + Math.sin(timeRef.current * speed) * amplitude;
    groupRef.current.scale.setScalar(oscillation);
    // Vertical bob: gentle Y oscillation with per-node phase
    const bobSpeed = 0.8;
    const bobAmp = isActive ? 0.12 : 0.06;
    groupRef.current.position.y = Math.sin(timeRef.current * bobSpeed + phaseOffset) * bobAmp;

    // Outer mesh emissive
    if (outerMeshRef.current) {
      const mat = outerMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        isActive ? 6 : 2,
        delta * 8
      );
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Outer emissive solid */}
        {/* Outer wireframe */}
        <mesh
          ref={outerMeshRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(node.id);
          }}
          onPointerOut={() => onHover(null)}
        >
          <icosahedronGeometry args={[baseSize, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2}
            roughness={0.4}
            metalness={0.6}
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Outer wireframe */}
        <lineSegments
          ref={wireframeRef}
          geometry={new THREE.IcosahedronGeometry(baseSize, 1)}
        >
          <lineBasicMaterial color={color} transparent opacity={0.6} />
        </lineSegments>
      </group>

      {/* HTML label */}
      <Html
        position={[0, baseSize + 0.6, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap text-center">
          <div
            className="text-sm font-bold text-slate-200 font-mono"
            style={{ textShadow: `0 0 8px ${clusterColor}cc` }}
          >
            {displayText}
          </div>
          <div className="text-[0.65rem] text-slate-400 mt-0.5">
            {node.shortDesc}
          </div>
        </div>
      </Html>
    </group>
  );
});
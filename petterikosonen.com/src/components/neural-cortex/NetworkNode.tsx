"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { type CortexNode } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";
import { useScramble } from "@/components/neural-cortex/hooks/useScramble";

// ── 3D Node: wireframe cage + inner glowing core + orbital torus rings ──
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
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  const baseSize = node.size * 0.22;
  const coreSize = baseSize * 0.4;
  const clusterColor = CLUSTER_COLORS[node.cluster] ?? "#00f0ff";
  const color = useMemo(() => new THREE.Color(clusterColor), [clusterColor]);

  const displayText = useScramble(node.label, isHovered);

  // Per-node phase offset for organic desync
  const phaseOffset = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < node.id.length; i++)
      hash = (hash << 5) - hash + node.id.charCodeAt(i);
    return ((Math.abs(hash) % 100) / 100) * Math.PI * 2;
  }, [node.id]);

  // Ring tilt angles — deterministic per node
  const ringTilts = useMemo(
    () => [
      [0.3 + (phaseOffset / Math.PI) * 0.5, phaseOffset * 0.7, 0],
      [1.2, phaseOffset * 0.3, 0.4 + (phaseOffset / Math.PI) * 0.3],
    ],
    [phaseOffset]
  );

  // Ring geometry (shared across nodes — React.memo prevents re-creation)
  const ringGeom1 = useMemo(
    () => new THREE.TorusGeometry(baseSize * 2.2, 0.008, 8, 64),
    [baseSize]
  );
  const ringGeom2 = useMemo(
    () => new THREE.TorusGeometry(baseSize * 1.7, 0.005, 8, 64),
    [baseSize]
  );

  const timeRef = useRef(0);
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const isActive = isHovered || isSelected;

    // Organic breathing: slow sine wave, faster when active
    const breatheSpeed = isActive ? 4.5 : 2.0;
    const breatheAmp = isActive ? 0.08 : 0.04;
    const scale = 1 + Math.sin(t * breatheSpeed + phaseOffset) * breatheAmp;
    groupRef.current.scale.setScalar(scale);

    // Vertical bob: gentle Y oscillation
    const bobAmp = isActive ? 0.1 : 0.04;
    const bobSpeed = 0.7;
    groupRef.current.position.y =
      position.y + Math.sin(t * bobSpeed + phaseOffset) * bobAmp;

    // Outer mesh emissive
    if (outerMeshRef.current) {
      const mat = outerMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        isActive ? 6 : 1.8,
        delta * 8
      );
    }

    // Inner core emissive pulse
    if (coreMeshRef.current) {
      const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
      const corePulse = 1.5 + Math.sin(t * 3 + phaseOffset) * 0.5;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        isActive ? 8 : corePulse,
        delta * 6
      );
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        isActive ? 0.8 : 0.45,
        delta * 5
      );
    }

    // Orbital rings rotation
    const ringSpeed1 = isActive ? 1.2 : 0.4;
    const ringSpeed2 = isActive ? -0.8 : -0.25;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * ringSpeed1;
      ring1Ref.current.rotation.x = ringTilts[0][0];
      ring1Ref.current.rotation.y = ringTilts[0][1] + t * 0.15;
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity =
        THREE.MathUtils.lerp(
          (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity,
          isActive ? 0.6 : 0.3,
          delta * 4
        );
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z += delta * ringSpeed2;
      ring2Ref.current.rotation.x = ringTilts[1][0];
      ring2Ref.current.rotation.y = ringTilts[1][1] - t * 0.1;
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity =
        THREE.MathUtils.lerp(
          (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity,
          isActive ? 0.45 : 0.2,
          delta * 4
        );
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      <group ref={groupRef}>
        {/* Inner glowing core — semi-transparent emissive sphere */}
        <mesh ref={coreMeshRef}>
          <icosahedronGeometry args={[coreSize, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2}
            transparent
            opacity={0.45}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>

        {/* Outer wireframe cage */}
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
            emissiveIntensity={1.8}
            roughness={0.4}
            metalness={0.6}
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Orbital ring 1 — larger, brighter */}
        <mesh
          ref={ring1Ref}
          rotation={ringTilts[0] as unknown as [number, number, number]}
          geometry={ringGeom1}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Orbital ring 2 — smaller, subtler */}
        <mesh
          ref={ring2Ref}
          rotation={ringTilts[1] as unknown as [number, number, number]}
          geometry={ringGeom2}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* HTML label */}
      <Html
        position={[0, baseSize + 0.7, 0]}
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
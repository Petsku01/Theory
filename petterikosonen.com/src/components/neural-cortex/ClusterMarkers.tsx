"use client";

import React, { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { clusterPositions } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";

// ── Cluster marker: glowing sphere at cluster center ──
// Clickable → sets activeCluster. Hover → brightens.
// Uses Html from @react-three/drei for the label (stylish, non-intrusive).
// NO ShaderMaterial — uses MeshStandardMaterial with emissive (Firefox safe).

interface ClusterMarkerProps {
  clusterKey: string;
  position: [number, number, number];
  color: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ClusterMarker({
  clusterKey,
  position,
  color,
  label,
  isActive,
  onClick,
}: ClusterMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const baseRadius = 0.35;
  const radius = isActive ? baseRadius * 1.3 : hovered ? baseRadius * 1.15 : baseRadius;

  // Pulse animation
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = Math.sin(t * 1.5 + position[0]) * 0.05;
    const scale = 1.0 + pulse;
    meshRef.current.scale.setScalar(scale);
  });

  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  const emissiveIntensity = isActive ? 2.0 : hovered ? 1.5 : 0.8;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.85}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Outer glow sphere — larger, more transparent */}
      <mesh>
        <sphereGeometry args={[radius * 1.8, 16, 16]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={isActive ? 0.15 : hovered ? 0.1 : 0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Invisible click-target sphere — larger, easy to click from any angle */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        visible={false}
      >
        <sphereGeometry args={[1.3, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Html label — stylish, non-intrusive */}
      <Html
        position={[0, radius + 0.6, 0]}
        center
        distanceFactor={10}
        zIndexRange={[10, 0]}
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            fontWeight: isActive ? "bold" : "normal",
            color: isActive ? color : "rgba(203, 213, 225, 0.7)",
            textShadow: `0 0 8px ${color}80`,
            whiteSpace: "nowrap",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transition: "all 0.2s ease",
            opacity: isActive || hovered ? 1 : 0.6,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

// ── Cluster markers container ──
interface ClusterMarkersProps {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  reducedMotion?: boolean;
}

const CLUSTER_LABELS: Record<string, string> = {
  core: "Core",
  projects: "Projects",
  skills: "Skills",
  experience: "Experience",
  research: "Research",
};

const CLUSTER_KEYS = ["core", "projects", "skills", "experience", "research"] as const;

export function ClusterMarkers({
  activeCluster,
  onClusterSelect,
  reducedMotion = false,
}: ClusterMarkersProps) {
  const markers = useMemo(() => {
    return CLUSTER_KEYS.map((key) => {
      const pos = clusterPositions[key] ?? [0, 0, 0];
      const color = CLUSTER_COLORS[key] ?? "#00f0ff";
      const label = CLUSTER_LABELS[key] ?? key;
      return { key, position: pos as [number, number, number], color, label };
    });
  }, []);

  return (
    <group>
      {markers.map((m) => (
        <ClusterMarker
          key={m.key}
          clusterKey={m.key}
          position={m.position}
          color={m.color}
          label={m.label}
          isActive={activeCluster === m.key}
          onClick={() => {
            if (activeCluster === m.key) {
              onClusterSelect(null);
            } else {
              onClusterSelect(m.key);
            }
          }}
        />
      ))}
    </group>
  );
}
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { clusterPositions } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";
import { CameraController } from "@/components/neural-cortex/CameraController";
import { GlyphLayer } from "@/components/neural-cortex/GlyphLayer";
import { MyceliumField } from "@/components/neural-cortex/MyceliumField";

// ── SYMBIOOSIS: Cursor = navigation, no traditional navbar ──
// Particles respond to cursor position via raycaster.
// NO ClusterMarkers — the organism IS the particles.
// Invisible click-target spheres handle cluster selection. Nothing is named on the field.

const CLUSTER_KEYS = ["core", "projects", "skills", "experience"] as const;

// ── Invisible click-target sphere for one cluster ──
function ClickTarget({
  position,
  color,
  isActive,
  onClick,
}: {
  position: [number, number, number];
  color: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group position={position}>
      {/* Invisible click-target sphere — visible=false but still raycastable */}
      <mesh
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Subtle glow ring when active (no mesh sphere, just a faint ring) */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial
            color={colorObj}
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

export function CortexScene({
  activeCluster,
  onClusterSelect,
  shakeTimestamp,
  isMobile = false,
  reducedMotion = false,
  interactive = true,
}: {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  shakeTimestamp: number;
  particleCount?: number;
  isMobile?: boolean;
  reducedMotion?: boolean;
  interactive?: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Cluster center for camera target
  const targetPosition = useMemo(() => {
    if (!activeCluster) return null;
    const pos = clusterPositions[activeCluster];
    if (!pos) return null;
    return new THREE.Vector3(pos[0], pos[1], pos[2]);
  }, [activeCluster]);

  // Build click-target data
  const clickTargets = useMemo(() => {
    return CLUSTER_KEYS.map((key) => {
      const pos = clusterPositions[key] ?? [0, 0, 0];
      const color = CLUSTER_COLORS[key] ?? "#00f0ff";
      return { key, position: pos as [number, number, number], color };
    });
  }, []);

  // Breathing cycle for the whole group
  useFrame((state) => {
    if (reducedMotion) return;
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const breath = 1.0 + Math.sin(time * 0.15) * 0.03;
      groupRef.current.scale.set(breath, breath, breath);
    }
  });

  useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  return (
    <>
      {/* Reduced-motion does not gate these — Canvas is swapped out upstream. */}
      <MyceliumField density={1.45} flow={1.35} mobile={isMobile} />

      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#00f0ff" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#22d3ee" />

      {interactive && (
        <group ref={groupRef}>
          {/* Invisible click-targets — spheres only */}
          {clickTargets.map((t) => (
            <ClickTarget
              key={t.key}
              position={t.position}
              color={t.color}
              isActive={activeCluster === t.key}
              onClick={() => {
                if (activeCluster === t.key) {
                  onClusterSelect(null);
                } else {
                  onClusterSelect(t.key);
                }
              }}
            />
          ))}
        </group>
      )}

      <CameraController
        target={targetPosition}
        controlsRef={controlsRef}
        shakeTimestamp={reducedMotion ? 0 : shakeTimestamp}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={25}
        enablePan={interactive}
        enableRotate={interactive}
        enableZoom={interactive}
        autoRotate={!activeCluster && !reducedMotion}
        autoRotateSpeed={0.3}
      />

      <GlyphLayer cellSize={isMobile ? 16 : 14} intensity={0.85} contrast={1.38} />
    </>
  );
}

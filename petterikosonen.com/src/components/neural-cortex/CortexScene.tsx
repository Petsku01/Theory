"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { clusterPositions } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";
import { CameraController } from "@/components/neural-cortex/CameraController";
import { FlowFieldParticles } from "@/components/neural-cortex/FlowFieldParticles";

// ── SYMBIOOSIS: Cursor = navigation, no traditional navbar ──
// Particles respond to cursor position via raycaster.
// NO ClusterMarkers — the organism IS the particles.
// Invisible click-target spheres handle cluster selection.

const CLUSTER_KEYS = ["core", "projects", "skills", "experience", "research"] as const;

const CLUSTER_LABELS: Record<string, string> = {
  core: "Core",
  projects: "Projects",
  skills: "Skills",
  experience: "Experience",
  research: "Research",
};

// ── Invisible click-target sphere for one cluster ──
function ClickTarget({
  clusterKey,
  position,
  color,
  label,
  isActive,
  onClick,
}: {
  clusterKey: string;
  position: [number, number, number];
  color: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
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
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Html label — shown on hover or when active */}
      <Html
        position={[0, 1.8, 0]}
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
            color: isActive ? color : hovered ? color : "rgba(203, 213, 225, 0.7)",
            textShadow: `0 0 8px ${color}80`,
            whiteSpace: "nowrap",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transition: "all 0.2s ease",
            opacity: isActive || hovered ? 1 : 0.5,
          }}
        >
          {label}
        </div>
      </Html>

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
  particleCount = 5000,
  bloomIntensity = 2.2,
  isMobile = false,
  reducedMotion = false,
}: {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  shakeTimestamp: number;
  particleCount?: number;
  bloomIntensity?: number;
  isMobile?: boolean;
  reducedMotion?: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster, camera, pointer } = useThree();

  // Cursor 3D position — the user's "juuret" in the organism
  const cursorWorldRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const cursorTargetRef = useRef<THREE.Vector3 | null>(null);

  // Compute hover target from cursor position
  const hoverTarget = useMemo(() => {
    return cursorTargetRef.current;
  }, []);

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
      const label = CLUSTER_LABELS[key] ?? key;
      return { key, position: pos as [number, number, number], color, label };
    });
  }, []);

  // Track cursor position in 3D via raycaster — this IS the navigation
  useEffect(() => {
    if (reducedMotion) return;
    const handlePointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      // Raycast from camera through pointer into scene
      raycaster.setFromCamera(pointer, camera);
      // Project onto z=0 plane for a 3D hover target
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      if (intersect) {
        cursorWorldRef.current.copy(intersect);
        cursorTargetRef.current = cursorWorldRef.current;
      }
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [raycaster, camera, pointer, reducedMotion]);

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
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#00f0ff" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#22d3ee" />

      <group ref={groupRef}>
        <FlowFieldParticles
          count={particleCount}
          activeCluster={activeCluster}
          hoverTarget={hoverTarget}
          reducedMotion={reducedMotion}
        />

        {/* Invisible click-targets + Html labels (no visible mesh spheres) */}
        {clickTargets.map((t) => (
          <ClickTarget
            key={t.key}
            clusterKey={t.key}
            position={t.position}
            color={t.color}
            label={t.label}
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
        enablePan
        autoRotate={!activeCluster && !reducedMotion}
        autoRotateSpeed={0.3}
      />

      {/* Post-processing: Bloom only */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.22}
          luminanceSmoothing={0.9}
          intensity={bloomIntensity}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
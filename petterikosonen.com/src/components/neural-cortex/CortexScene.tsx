"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { clusterPositions } from "@/lib/cortex-data";
import { CameraController } from "@/components/neural-cortex/CameraController";
import { FlowFieldParticles } from "@/components/neural-cortex/FlowFieldParticles";
import { ClusterLabels } from "@/components/neural-cortex/ClusterLabels";
import { ClusterPickTarget } from "@/components/neural-cortex/ClusterPickTarget";


// ── Main 3D scene — radical redesign: particle flow replaces nodes+edges ──
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
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
  const hoverTargetRef = useRef<THREE.Vector3 | null>(null);

  // Compute hover target from hovered cluster
  const hoverTarget = useMemo(() => {
    if (!hoveredCluster) return null;
    const pos = clusterPositions[hoveredCluster];
    if (!pos) return null;
    return new THREE.Vector3(pos[0], pos[1], pos[2]);
  }, [hoveredCluster]);

  hoverTargetRef.current = hoverTarget;

  // Cluster center for camera target
  const targetPosition = useMemo(() => {
    if (!activeCluster) return null;
    const pos = clusterPositions[activeCluster];
    if (!pos) return null;
    return new THREE.Vector3(pos[0], pos[1], pos[2]);
  }, [activeCluster]);

  const handleClusterHover = useCallback((cluster: string | null) => {
    setHoveredCluster(cluster);
  }, []);

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

      <FlowFieldParticles
        count={particleCount}
        activeCluster={activeCluster}
        hoverTarget={hoverTarget}
        reducedMotion={reducedMotion}
      />

      <ClusterLabels
        activeCluster={activeCluster}
        hoveredCluster={hoveredCluster}
      />

      <ClusterPickTarget
        activeCluster={activeCluster}
        onClusterSelect={onClusterSelect}
        onClusterHover={handleClusterHover}
      />

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
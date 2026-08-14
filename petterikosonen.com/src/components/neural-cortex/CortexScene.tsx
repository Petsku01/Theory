"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
// clusterPositions still used by targetPosition memo below
import { clusterPositions } from "@/lib/cortex-data";
import { CameraController } from "@/components/neural-cortex/CameraController";
import { FlowFieldParticles } from "@/components/neural-cortex/FlowFieldParticles";
import { ClusterMarkers } from "@/components/neural-cortex/ClusterMarkers";

// ── SYMBIOOSIS: Cursor = navigation, no traditional navbar ──
// Particles respond to cursor position via raycaster.
// No ClusterLabels or ClusterPickTarget — the organism is the navigation.
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
  // The cursor position acts as the hover attractor for particles
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

  // NOTE: Cluster click handling is done by R3F mesh onClick in ClusterMarkers.
  // The old window-level click handler raycasted to z=0 plane, which made all
  // non-core clusters (at z=±5) unreachable because dz²=25 ≥ threshold.
  // onPointerMissed on the Canvas handles deselection (see NeuralCortex.tsx).

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
        <ClusterMarkers
          activeCluster={activeCluster}
          onClusterSelect={onClusterSelect}
          reducedMotion={reducedMotion}
        />
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
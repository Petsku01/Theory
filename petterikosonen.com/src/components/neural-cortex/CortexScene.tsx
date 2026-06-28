"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { nodes, edges } from "@/lib/cortex-data";
import { CLUSTER_COLORS, computePositions } from "@/components/neural-cortex/utils";
import { NetworkNode } from "@/components/neural-cortex/NetworkNode";
import { NetworkEdges } from "@/components/neural-cortex/NetworkEdges";
import { WasmSoftParticles } from "@/components/neural-cortex/WasmSoftParticles";
import { WasmBurstParticles } from "@/components/neural-cortex/WasmBurstParticles";
import { CameraController } from "@/components/neural-cortex/CameraController";


// ── Main 3D scene ──
export function CortexScene({
  selectedId,
  onNodeSelect,
  shakeTimestamp,
}: {
  selectedId: string | null;
  onNodeSelect: (id: string | null) => void;
  shakeTimestamp: number;
}) {
  const positions = useMemo(() => computePositions(nodes), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const handleSelect = useCallback(
    (id: string) => {
      onNodeSelect(selectedIdRef.current === id ? null : id);
    },
    [onNodeSelect]
  );

  const handleHover = useCallback(
    (id: string | null) => {
      setHoveredId(id);
      document.body.style.cursor = id ? "pointer" : "default";
    },
    []
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  const targetPosition = useMemo(() => {
    if (!selectedId) return null;
    return positions.get(selectedId) ?? null;
  }, [selectedId, positions]);

  const attractionTarget = useMemo(() => {
    const id = hoveredId ?? selectedId;
    if (!id) return null;
    return positions.get(id) ?? null;
  }, [hoveredId, selectedId, positions]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#00f0ff" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#22d3ee" />

      <WasmSoftParticles count={3600} targetPos={attractionTarget} color="#00f0ff" />
      <WasmBurstParticles
        origin={targetPosition}
        color={
          selectedId
            ? CLUSTER_COLORS[nodes.find((n) => n.id === selectedId)?.cluster ?? "core"] ?? "#00f0ff"
            : "#00f0ff"
        }
      />
      <NetworkEdges positions={positions} selectedId={selectedId} />

      {nodes.map((node) => (
        <NetworkNode
          key={node.id}
          node={node}
          position={positions.get(node.id) ?? new THREE.Vector3()}
          isSelected={selectedId === node.id}
          isHovered={hoveredId === node.id}
          onSelect={handleSelect}
          onHover={handleHover}
        />
      ))}

      <CameraController
        target={targetPosition}
        controlsRef={controlsRef}
        shakeTimestamp={shakeTimestamp}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={25}
        enablePan
        autoRotate={!selectedId}
        autoRotateSpeed={0.3}
      />

      {/* Post-processing: Bloom only */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          intensity={1.8}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
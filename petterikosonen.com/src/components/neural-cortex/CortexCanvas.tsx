"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CortexScene } from "@/components/neural-cortex/CortexScene";

export default function CortexCanvas({
  activeCluster,
  onClusterSelect,
  shakeTimestamp,
  particleCount,
  isMobile,
  interactive = true,
  reducedMotion = false,
}: {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  shakeTimestamp: number;
  particleCount: number;
  isMobile: boolean;
  interactive?: boolean;
  reducedMotion?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <Canvas
        flat
        dpr={1}
        camera={{ position: [0, 8, 16], fov: 55, near: 0.1, far: 100 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{ pointerEvents: interactive ? "auto" : "none" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#05070A", 1);
        }}
        onPointerMissed={interactive ? () => onClusterSelect(null) : undefined}
      >
        <fog attach="fog" args={["#05070A", 30, 80]} />
        <CortexScene
          activeCluster={activeCluster}
          onClusterSelect={onClusterSelect}
          shakeTimestamp={shakeTimestamp}
          particleCount={particleCount}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
          interactive={interactive}
        />
      </Canvas>
    </Suspense>
  );
}

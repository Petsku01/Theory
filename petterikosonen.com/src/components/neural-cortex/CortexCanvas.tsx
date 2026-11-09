"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CortexScene } from "@/components/neural-cortex/CortexScene";
import { CortexLoader } from "@/components/neural-cortex/Overlays";

export default function CortexCanvas({
  activeCluster,
  onClusterSelect,
  shakeTimestamp,
  particleCount,
  isMobile,
}: {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  shakeTimestamp: number;
  particleCount: number;
  isMobile: boolean;
}) {
  return (
    <Suspense fallback={<CortexLoader />}>
      <Canvas
        flat
        dpr={1}
        camera={{ position: [0, 8, 16], fov: 55, near: 0.1, far: 100 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor("#05070A", 1);
        }}
        onPointerMissed={() => onClusterSelect(null)}
      >
        <fog attach="fog" args={["#05070A", 30, 80]} />
        <CortexScene
          activeCluster={activeCluster}
          onClusterSelect={onClusterSelect}
          shakeTimestamp={shakeTimestamp}
          particleCount={particleCount}
          isMobile={isMobile}
        />
      </Canvas>
    </Suspense>
  );
}

"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { CortexScene } from "./CortexScene";

export default function CortexCanvas({ activeCluster, onClusterSelect, isMobile, running }: {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  isMobile: boolean;
  running: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0, 8, 16], fov: 55, near: 0.1, far: 100 }}
      dpr={isMobile ? 1 : [1, 1.5]}
      frameloop={running ? "always" : "never"}
      gl={{ antialias: !isMobile, alpha: true, powerPreference: "default" }}
      fallback={<p>3D unavailable. Use the atlas and cluster buttons.</p>}
      onPointerMissed={() => onClusterSelect(null)}
    >
      <Suspense fallback={null}>
        <CortexScene activeCluster={activeCluster} onClusterSelect={onClusterSelect}
          shakeTimestamp={0} particleCount={isMobile ? 2000 : 5000} isMobile={isMobile} running={running} />
      </Suspense>
    </Canvas>
  );
}

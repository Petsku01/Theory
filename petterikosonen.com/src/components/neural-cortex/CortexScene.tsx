"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { clusterPositions } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "./utils";
import { CameraController } from "./CameraController";
import { FlowFieldParticles } from "./FlowFieldParticles";

const labels: Record<string, string> = { core: "Core", projects: "Projects", skills: "Skills", experience: "Experience", research: "Research" };

function ClickTarget({ position, color, label, active, onClick, running }: {
  position: [number, number, number]; color: string; label: string; active: boolean;
  onClick: () => void; running: boolean;
}) {
  return <group position={position}>
    <mesh onClick={(event) => { event.stopPropagation(); if (running) onClick(); }}>
      <sphereGeometry args={[2.5, 12, 12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <Html position={[0, 1.8, 0]} center distanceFactor={10} zIndexRange={[10, 0]} style={{ pointerEvents: "none", userSelect: "none" }}>
      <span style={{ fontFamily: "monospace", fontSize: "12px", color: active ? color : "#b5c5d3", whiteSpace: "nowrap", letterSpacing: ".1em", textTransform: "uppercase" }}>{label}</span>
    </Html>
    {active && <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.2, 1.3, 32]} /><meshBasicMaterial color={color} transparent opacity={.35} depthWrite={false} />
    </mesh>}
  </group>;
}

export function CortexScene({ activeCluster, onClusterSelect, shakeTimestamp, particleCount = 5000, isMobile = false, reducedMotion = false, running = true }: {
  activeCluster: string | null; onClusterSelect: (cluster: string | null) => void;
  shakeTimestamp: number; particleCount?: number; isMobile?: boolean; reducedMotion?: boolean; running?: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster, camera, gl } = useThree();
  // Mutable Three objects live in stable state, not a ref read during render.
  const [cursorWorld] = useState(() => new THREE.Vector3());
  const targetPosition = useMemo(() => {
    const pos = activeCluster ? clusterPositions[activeCluster] : null;
    return pos ? new THREE.Vector3(...pos) : null;
  }, [activeCluster]);

  useEffect(() => {
    if (reducedMotion || isMobile || !running) return;
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const onMove = (event: PointerEvent) => {
      const bounds = gl.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(plane, cursorWorld);
    };
    gl.domElement.addEventListener("pointermove", onMove, { passive: true });
    return () => gl.domElement.removeEventListener("pointermove", onMove);
  }, [raycaster, camera, gl, cursorWorld, reducedMotion, isMobile, running]);

  useFrame((state) => {
    if (!running || reducedMotion || !groupRef.current) return;
    const breath = 1 + Math.sin(state.clock.elapsedTime * .15) * .03;
    groupRef.current.scale.setScalar(breath);
  });

  return <>
    <group ref={groupRef}>
      <FlowFieldParticles count={particleCount} activeCluster={activeCluster} hoverTarget={!reducedMotion && !isMobile ? cursorWorld : null} reducedMotion={reducedMotion || !running} />
      {Object.entries(labels).map(([key, label]) => <ClickTarget key={key} position={clusterPositions[key]} color={CLUSTER_COLORS[key]} label={label} active={activeCluster === key} running={running} onClick={() => onClusterSelect(activeCluster === key ? null : key)} />)}
    </group>
    <CameraController target={targetPosition} controlsRef={controlsRef} shakeTimestamp={reducedMotion ? 0 : shakeTimestamp} />
    <OrbitControls ref={controlsRef} enabled={running} enableDamping dampingFactor={.08} minDistance={3} maxDistance={25} enablePan autoRotate={running && !activeCluster && !reducedMotion} autoRotateSpeed={.3} />
  </>;
}

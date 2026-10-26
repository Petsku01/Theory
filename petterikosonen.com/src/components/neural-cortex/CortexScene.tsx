"use client";

import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { clusterPositions, clusterSymbiosis, SPECIES_COLORS } from "@/lib/cortex-data";
import { FlowFieldParticles } from "./FlowFieldParticles";
import { SymbiosisThreads } from "./SymbiosisThreads";
import { CortexFinish } from "./CortexFinish";

const labels: Record<string, string> = { core: "Core", projects: "Projects", skills: "Skills", experience: "Experience", research: "Research" };
const species = ["Human", "Machine", "Nature"];

export function CortexScene({ activeCluster, onClusterSelect, particleCount = 5000, isMobile = false, reducedMotion = false, running = true }: {
  activeCluster: string | null; onClusterSelect: (cluster: string | null) => void;
  shakeTimestamp: number; particleCount?: number; isMobile?: boolean; reducedMotion?: boolean; running?: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { raycaster, camera, gl } = useThree();
  const [cursorWorld] = useState(() => new THREE.Vector3());
  const [hovered, setHovered] = useState<string | null>(null);
  const activation = hovered ?? activeCluster;
  // Keep the full ecology in view: proximity changes colour, selection changes content.

  useEffect(() => {
    if (reducedMotion || !running) return;
    const pointer = new THREE.Vector2();
    const projected = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const move = (x: number, y: number) => {
      const bounds = gl.domElement.getBoundingClientRect();
      pointer.set(((x - bounds.left) / bounds.width) * 2 - 1, -((y - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(plane, cursorWorld);
      let nearest: string | null = null;
      let distance = isMobile ? 80 : 65;
      for (const [key, pos] of Object.entries(clusterPositions)) {
        projected.set(...pos).project(camera);
        const d = Math.hypot((projected.x - pointer.x) * bounds.width / 2, (projected.y - pointer.y) * bounds.height / 2);
        if (projected.z < 1 && d < distance) { nearest = key; distance = d; }
      }
      setHovered(nearest);
      gl.domElement.dataset.proximity = nearest ?? "none";
    };
    const onMove = (event: PointerEvent) => move(event.clientX, event.clientY);
    const onTouch = (event: TouchEvent) => { const touch = event.touches[0]; if (touch) move(touch.clientX, touch.clientY); };
    const leave = () => { setHovered(null); gl.domElement.dataset.proximity = "none"; };
    gl.domElement.addEventListener("pointermove", onMove, { passive: true });
    gl.domElement.addEventListener("touchmove", onTouch, { passive: true });
    gl.domElement.addEventListener("pointerleave", leave);
    gl.domElement.addEventListener("touchend", leave);
    gl.domElement.addEventListener("touchcancel", leave);
    return () => {
      gl.domElement.removeEventListener("pointermove", onMove);
      gl.domElement.removeEventListener("touchmove", onTouch);
      gl.domElement.removeEventListener("pointerleave", leave);
      gl.domElement.removeEventListener("touchend", leave);
      gl.domElement.removeEventListener("touchcancel", leave);
    };
  }, [raycaster, camera, gl, cursorWorld, reducedMotion, isMobile, running]);

  return <>
    <FlowFieldParticles count={particleCount} activeCluster={activation} hoverTarget={hovered && running ? cursorWorld : null} reducedMotion={reducedMotion || !running} />
    <SymbiosisThreads activeCluster={activation} running={running && !reducedMotion} />
    {Object.entries(labels).map(([key, label], i) => {
      const weights = clusterSymbiosis[key].speciesWeights;
      const dominant = weights.indexOf(Math.max(...weights));
      const color = SPECIES_COLORS[dominant];
      const active = activation === key;
      return <group key={key} position={clusterPositions[key]}>
        <mesh onClick={(event) => { event.stopPropagation(); if (running) onClusterSelect(activeCluster === key ? null : key); }}>
          <sphereGeometry args={[1.2, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh rotation={[.6, .2, i * .55]}>
          <torusGeometry args={[active ? .8 : .5, .018, 6, 48]} />
          <meshBasicMaterial color={color} transparent opacity={active ? .95 : .4} />
        </mesh>
        <mesh><sphereGeometry args={[.11, 10, 10]} /><meshBasicMaterial color={color} /></mesh>
        <Html position={[0, 1.1, 0]} center distanceFactor={14} zIndexRange={[10, 0]} style={{ pointerEvents: "none", userSelect: "none" }}>
          <div data-cortex-label={key} style={{ whiteSpace: "nowrap", color: active ? "#f0eee7" : "#b5c5d3", opacity: active ? 1 : .75 }}>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, letterSpacing: ".18em", color }}>0{i + 1} / {species[dominant].toUpperCase()}</div>
            <div style={{ fontFamily: "var(--font-display), sans-serif", fontSize: key === "core" ? 26 : 20, fontWeight: 500, letterSpacing: "-.04em" }}>{label}</div>
          </div>
        </Html>
      </group>;
    })}
    {species.map((name, i) => <Html key={name} position={([[-7, 4.8, 0], [6.5, 4.5, -4], [2, -4, 3]] as [number, number, number][])[i]} center distanceFactor={16} zIndexRange={[8, 0]} style={{ pointerEvents: "none", userSelect: "none" }}>
      <span style={{ fontFamily: "Georgia, serif", fontSize: 30, fontStyle: "italic", color: SPECIES_COLORS[i], opacity: .55 }}>{name}<span style={{ fontFamily: "monospace", fontSize: 10, verticalAlign: "super", marginLeft: 6 }}>0{i + 1}</span></span>
    </Html>)}
    <OrbitControls ref={controlsRef} enabled={running} enableDamping dampingFactor={.08} minDistance={10} maxDistance={30} enablePan={false} autoRotate={false} />
    {!reducedMotion && <CortexFinish running={running} />}
  </>;
}

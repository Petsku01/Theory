"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { type CortexNode } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";
import { useScramble } from "@/components/neural-cortex/hooks/useScramble";

// ── Deterministic phase offset from node id ──
function hashPhase(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return ((Math.abs(hash) % 100) / 100) * Math.PI * 2;
}

// ── Dendrite count by node type ──
const DENDRITE_COUNTS: Record<CortexNode["type"], number> = {
  core: 12,
  project: 8,
  skill: 6,
  experience: 0,
  research: 2,
};

// ── Soma geometry factory by node type ──
function createSomaGeometry(
  type: CortexNode["type"],
  radius: number
): THREE.BufferGeometry {
  switch (type) {
    case "core":
      return new THREE.IcosahedronGeometry(radius, 3);
    case "project":
      return new THREE.OctahedronGeometry(radius, 0);
    case "skill":
      return new THREE.TetrahedronGeometry(radius, 0);
    case "experience":
      return new THREE.TorusKnotGeometry(radius * 0.7, radius * 0.25, 48, 8);
    case "research":
      return new THREE.DodecahedronGeometry(radius, 0);
    default:
      return new THREE.IcosahedronGeometry(radius, 1);
  }
}

// ── Create radial gradient halo texture for a cluster color ──
function createHaloTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, color + "ff");
  gradient.addColorStop(0.25, color + "cc");
  gradient.addColorStop(0.55, color + "44");
  gradient.addColorStop(1, color + "00");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Fibonacci sphere distribution for dendrite directions ──
function fibonacciDirection(
  i: number,
  total: number,
  phase: number
): THREE.Vector3 {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / Math.max(1, total - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i + phase;
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
}

// ── Build dendrite LineSegments geometry ──
function buildDendriteGeometry(
  count: number,
  radius: number,
  phase: number,
  longDendrites: boolean
): THREE.BufferGeometry {
  const positions = new Float32Array(count * 6);
  const innerR = radius * 0.85;
  const outerR = longDendrites ? radius * 4.5 : radius * 2.8;
  for (let i = 0; i < count; i++) {
    const dir = fibonacciDirection(i, count, phase);
    positions[i * 6] = dir.x * innerR;
    positions[i * 6 + 1] = dir.y * innerR;
    positions[i * 6 + 2] = dir.z * innerR;
    positions[i * 6 + 3] = dir.x * outerR;
    positions[i * 6 + 4] = dir.y * outerR;
    positions[i * 6 + 5] = dir.z * outerR;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geom;
}

// ── 3D Node: neuron-style with soma + halo + dendrites ──
export const NetworkNode = React.memo(function NetworkNode({
  node,
  position,
  isSelected,
  isHovered,
  isDimmed = false,
  isMobile = false,
  reducedMotion = false,
  onSelect,
  onHover,
}: {
  node: CortexNode;
  position: THREE.Vector3;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed?: boolean;
  isMobile?: boolean;
  reducedMotion?: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const somaRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const dendriteRef = useRef<THREE.LineSegments>(null);

  const baseSize = node.size * 0.22;
  const somaRadius = baseSize * 0.5;
  const clusterColor = CLUSTER_COLORS[node.cluster] ?? "#00f0ff";
  const color = useMemo(() => new THREE.Color(clusterColor), [clusterColor]);

  const displayText = useScramble(node.label, isHovered);
  const phase = useMemo(() => hashPhase(node.id), [node.id]);

  // Dendrite count (halved on mobile)
  const dendriteCount = useMemo(() => {
    const base = DENDRITE_COUNTS[node.type] ?? 0;
    return isMobile ? Math.floor(base * 0.5) : base;
  }, [node.type, isMobile]);

  const isLongDendrites = node.type === "research";

  // Soma geometry — type-specific
  const somaGeom = useMemo(
    () => createSomaGeometry(node.type, somaRadius),
    [node.type, somaRadius]
  );

  // Halo texture — radial gradient in cluster color
  const haloTexture = useMemo(
    () => createHaloTexture(clusterColor),
    [clusterColor]
  );

  // Dendrite geometry
  const dendriteGeom = useMemo(
    () =>
      dendriteCount > 0
        ? buildDendriteGeometry(dendriteCount, somaRadius, phase, isLongDendrites)
        : null,
    [dendriteCount, somaRadius, phase, isLongDendrites]
  );

  // Dispose geometries and textures on unmount
  useEffect(() => {
    return () => {
      somaGeom.dispose();
      haloTexture.dispose();
      if (dendriteGeom) dendriteGeom.dispose();
    };
  }, [somaGeom, haloTexture, dendriteGeom]);

  // Impulse tracking — scale spike on activate
  const impulseStartRef = useRef(-1); // -1 = no active impulse
  const prevActiveRef = useRef(false);
  const active = isHovered || isSelected;

  // Emissive levels depend on device
  const restEmissive = isMobile ? 3 : 5;
  const activeEmissive = isMobile ? 8 : 10;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Detect active transition for impulse
    if (active && !prevActiveRef.current) {
      impulseStartRef.current = t;
    }
    prevActiveRef.current = active;

    if (reducedMotion) {
      // ── Reduced motion: static, no breathing/bob/impulse ──
      groupRef.current.scale.setScalar(1);
      groupRef.current.position.y = 0;
      if (somaRef.current) {
        const mat = somaRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.emissiveIntensity,
          active ? activeEmissive : restEmissive,
          Math.min(1, dt * 8)
        );
        mat.opacity = THREE.MathUtils.lerp(
          mat.opacity,
          active ? 0.85 : 0.7,
          Math.min(1, dt * 6)
        );
      }
      if (haloRef.current) {
        const mat = haloRef.current.material as THREE.SpriteMaterial;
        mat.opacity = THREE.MathUtils.lerp(
          mat.opacity,
          active ? 0.6 : 0.3,
          Math.min(1, dt * 6)
        );
      }
      return;
    }

    // ── Breathing ──
    const breathSpeed = active ? 4.5 : 2.0;
    const breathAmp = active ? 0.08 : 0.04;
    let scale = 1 + Math.sin(t * breathSpeed + phase) * breathAmp;

    // ── Impulse spike (200ms: scale 1.0→1.3→1.0) ──
    if (impulseStartRef.current >= 0) {
      const impulseElapsed = t - impulseStartRef.current;
      if (impulseElapsed < 0.2) {
        const impulseT = impulseElapsed / 0.2;
        const impulseScale = 1 + Math.sin(impulseT * Math.PI) * 0.3;
        scale *= impulseScale;
      } else {
        impulseStartRef.current = -1;
      }
    }

    groupRef.current.scale.setScalar(scale);

    // ── Bob ──
    const bobAmp = active ? 0.1 : 0.04;
    groupRef.current.position.y = Math.sin(t * 0.7 + phase) * bobAmp;

    // ── Soma emissive ──
    if (somaRef.current) {
      const mat = somaRef.current.material as THREE.MeshStandardMaterial;
      const corePulse = restEmissive + Math.sin(t * 3 + phase) * 1;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        active ? activeEmissive : corePulse,
        Math.min(1, dt * 6)
      );
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        active ? 0.85 : 0.7,
        Math.min(1, dt * 5)
      );
    }

    // ── Halo ──
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.SpriteMaterial;
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        active ? 0.6 : 0.3,
        Math.min(1, dt * 4)
      );
    }

    // ── Dendrites ──
    if (dendriteRef.current) {
      const mat = dendriteRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        active ? 0.6 : 0.4,
        Math.min(1, dt * 4)
      );
      dendriteRef.current.rotation.y = t * 0.1 + phase;
      dendriteRef.current.rotation.x = phase * 0.3;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      <group ref={groupRef} visible={!isDimmed}>
        {/* Soma — type-specific geometry, click/hover handlers */}
        <mesh
          ref={somaRef}
          geometry={somaGeom}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(node.id);
          }}
          onPointerOut={() => onHover(null)}
        >
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={5}
            transparent
            opacity={0.7}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>

        {/* Halo — radial gradient sprite, additive blending */}
        <sprite
          ref={haloRef}
          scale={[baseSize * 3.5, baseSize * 3.5, 1]}
          raycast={() => null}
        >
          <spriteMaterial
            map={haloTexture}
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>

        {/* Dendrites — LineSegments, type-based count */}
        {dendriteGeom && (
          <lineSegments
            ref={dendriteRef}
            geometry={dendriteGeom}
            raycast={() => null}
          >
            <lineBasicMaterial
              color={color}
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </lineSegments>
        )}
      </group>

      {/* HTML label */}
      <Html
        position={[0, baseSize + 0.7, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap text-center">
          <div
            className="text-sm font-bold text-slate-200 font-mono"
            style={{ textShadow: `0 0 8px ${clusterColor}cc` }}
          >
            {displayText}
          </div>
          <div className="text-[0.65rem] text-slate-400 mt-0.5">
            {node.shortDesc}
          </div>
        </div>
      </Html>
    </group>
  );
});
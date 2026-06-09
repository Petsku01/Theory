"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { nodes, edges, clusterPositions, type CortexNode } from "@/lib/cortex-data";

// ── Layout: spread nodes around their cluster centers ──
function computePositions(nodeList: CortexNode[]): Map<string, THREE.Vector3> {
  const pos = new Map<string, THREE.Vector3>();
  const clusterNodes = new Map<string, CortexNode[]>();
  for (const n of nodeList) {
    const arr = clusterNodes.get(n.cluster) ?? [];
    arr.push(n);
    clusterNodes.set(n.cluster, arr);
  }

  for (const [cluster, clusterList] of clusterNodes) {
    const center = new THREE.Vector3(...(clusterPositions[cluster] ?? [0, 0, 0]));
    const count = clusterList.length;
    clusterList.forEach((node, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = count === 1 ? 0 : 1.8 + (node.size - 1) * 0.5;
      const offset = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle * 0.5) * 0.6,
        Math.sin(angle) * radius
      );
      pos.set(node.id, center.clone().add(offset));
    });
  }
  return pos;
}

// ── 3D Node (memoized) ──
const NetworkNode = React.memo(function NetworkNode({
  node,
  position,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  node: CortexNode;
  position: THREE.Vector3;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const baseSize = node.size * 0.35;
  const targetScale = isSelected ? 1.6 : isHovered ? 1.25 : 1;
  const color = useMemo(() => new THREE.Color(node.color), [node.color]);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const s = meshRef.current.scale.x;
    const newS = THREE.MathUtils.lerp(s, targetScale, delta * 5);
    meshRef.current.scale.setScalar(newS);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(newS * 1.8);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        isHovered || isSelected ? 0.25 : 0.08;
    }
  });

  return (
    <group position={position}>
      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[baseSize * 1.8, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      {/* Core sphere */}
      <mesh
        ref={meshRef}
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
        <sphereGeometry args={[baseSize, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0, baseSize + 0.4, 0]}
        fontSize={0.22}
        color="#e2e8f0"
        anchorX="center"
        anchorY="bottom"
        font="/fonts/JetBrainsMono-Regular.ttf"
        outlineWidth={0.02}
        outlineColor="#0a0a0f"
      >
        {node.label}
      </Text>

      {/* Subtitle */}
      <Text
        position={[0, baseSize + 0.15, 0]}
        fontSize={0.13}
        color="#94a3b8"
        anchorX="center"
        anchorY="bottom"
        font="/fonts/JetBrainsMono-Regular.ttf"
      >
        {node.shortDesc}
      </Text>
    </group>
  );
});

import React from "react";

// ── Edge cylinders (replaces Line for reliable width) ──
function EdgeCylinder({
  from,
  to,
  color,
  opacity,
  thickness,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  opacity: number;
  thickness: number;
}) {
  const { mesh, length, position, quaternion } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const len = direction.length();
    const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const orientation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );
    return { mesh: null, length: len, position: midpoint, quaternion: orientation };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[thickness, thickness, length, 6, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function NetworkEdges({
  positions,
  selectedId,
}: {
  positions: Map<string, THREE.Vector3>;
  selectedId: string | null;
}) {
  const lines = useMemo(() => {
    return edges
      .filter((e) => positions.has(e.from) && positions.has(e.to))
      .map((e) => ({
        key: `${e.from}-${e.to}`,
        from: positions.get(e.from)!,
        to: positions.get(e.to)!,
        strength: e.strength,
        highlight: selectedId === e.from || selectedId === e.to,
      }));
  }, [positions, selectedId]);

  return (
    <>
      {lines.map((l) => (
        <EdgeCylinder
          key={l.key}
          from={l.from}
          to={l.to}
          color={l.highlight ? "#00f0ff" : "#1e293b"}
          opacity={l.highlight ? 0.8 : 0.25}
          thickness={l.highlight ? 0.04 : 0.015}
        />
      ))}
    </>
  );
}

// ── Floating background particles ──
function BackgroundParticles({ count = 500 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const [positionsArr, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }
    return [pos, vel];
  }, [count]);

  const bounds = useMemo(() => [15, 10, 10], []);

  useFrame(() => {
    if (!ref.current) return;
    const p = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < 3; j++) {
        const idx = i * 3 + j;
        p[idx] += velocities[idx];
        if (Math.abs(p[idx]) > bounds[j]) {
          p[idx] = (bounds[j] - 0.1) * -Math.sign(p[idx]) + (Math.random() - 0.5) * 0.3;
        }
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsArr, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00f0ff"
        size={0.04}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// ── Camera fly-to controller (uses OrbitControls ref) ──
function CameraController({
  target,
  controlsRef,
}: {
  target: THREE.Vector3 | null;
  controlsRef: React.RefObject<any>;
}) {
  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (target) {
      // Fly camera toward selected node
      const cameraOffset = new THREE.Vector3(0, 1.5, 5);
      const desiredPos = target.clone().add(cameraOffset);
      controls.object.position.lerp(desiredPos, delta * 2);
      controls.target.lerp(target, delta * 3);
      controls.update();
    }
  });

  return null;
}

// ── Selection info overlay ──
function DetailPanel({ node, onClose }: { node: CortexNode | null; onClose: () => void }) {
  if (!node) return null;

  return (
    <div className="pointer-events-auto fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line-0/40 bg-bg-0/90 p-5 shadow-2xl backdrop-blur-xl max-md:bottom-0 max-md:left-0 max-md:top-auto max-md:w-full max-md:rounded-b-none">
      <button
        onClick={onClose}
        className="absolute right-3 top-3 text-text-2 hover:text-text-0"
        aria-label="Close"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>

      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
        <h3 className="text-lg font-bold text-text-0">{node.label}</h3>
      </div>
      <p className="mt-1 text-sm text-text-1">{node.fullDesc ?? node.shortDesc}</p>

      {node.tech && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {node.tech.map((t) => (
            <span key={t} className="rounded-md bg-bg-3/50 px-2 py-0.5 font-mono text-xs text-text-2">
              {t}
            </span>
          ))}
        </div>
      )}

      {node.link && (
        <a
          href={node.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/6 px-3 py-1.5 font-mono text-xs text-accent-cyan transition-colors hover:border-accent-cyan/50 hover:bg-accent-cyan/12"
        >
          View Project
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      )}

      <div className="mt-3">
        <span className="rounded bg-bg-3/30 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-text-2">
          {node.type}
        </span>
      </div>
    </div>
  );
}

// ── Accessibility: hidden nav for keyboard users ──
function AccessibleNav({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="sr-only">
      <nav aria-label="Site sections">
        {nodes.map((node) => (
          <button key={node.id} onClick={() => onSelect(node.id)}>
            {node.label} - {node.shortDesc}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── Main 3D scene ──
function CortexScene({
  selectedId,
  onNodeSelect,
  onNodeHover,
}: {
  selectedId: string | null;
  onNodeSelect: (id: string | null) => void;
  onNodeHover: (id: string | null) => void;
}) {
  const positions = useMemo(() => computePositions(nodes), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);

  const handleSelect = useCallback(
    (id: string) => {
      onNodeSelect(selectedId === id ? null : id);
    },
    [selectedId, onNodeSelect]
  );

  const handleHover = useCallback(
    (id: string | null) => {
      setHoveredId(id);
      onNodeHover(id);
      document.body.style.cursor = id ? "pointer" : "default";
    },
    [onNodeHover]
  );

  // Cleanup cursor on unmount
  React.useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  const targetPosition = useMemo(() => {
    if (!selectedId) return null;
    return positions.get(selectedId) ?? null;
  }, [selectedId, positions]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#00f0ff" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#00ff88" />

      <BackgroundParticles count={500} />
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

      <CameraController target={targetPosition} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={25}
        enablePan
        autoRotate={!selectedId}
        autoRotateSpeed={0.3}
      />
    </>
  );
}

// ── Loading fallback ──
function CortexLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan" />
        <p className="font-mono text-sm text-text-2">Initializing neural cortex...</p>
      </div>
    </div>
  );
}

// ── Exported wrapper ──
export default function NeuralCortex() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [selectedId]
  );

  const handleNodeSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleNodeHover = useCallback((_id: string | null) => {}, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      <Suspense fallback={<CortexLoader />}>
        <Canvas
          camera={{ position: [0, 3, 12], fov: 60, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <CortexScene
            selectedId={selectedId}
            onNodeSelect={handleNodeSelect}
            onNodeHover={handleNodeHover}
          />
        </Canvas>
      </Suspense>

      {/* Title overlay */}
      <div className="pointer-events-none absolute left-6 top-6">
        <h1 className="font-display text-2xl font-bold text-text-0">
          Petteri Kosonen
        </h1>
        <p className="mt-1 font-mono text-sm text-text-2">
          Security Engineer + AI Researcher
        </p>
        <p className="mt-0.5 font-mono text-xs text-accent-cyan/60">
          Click a node to explore. Drag to rotate. Scroll to zoom.
        </p>
      </div>

      {/* Navigation buttons */}
      <nav className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Cluster navigation">
        {(["core", "projects", "skills", "experience", "research"] as const).map((cluster) => {
          const isActive = selectedId !== null && nodes.find((n) => n.id === selectedId)?.cluster === cluster;
          return (
            <button
              key={cluster}
              onClick={() => {
                const node = nodes.find((n) => n.cluster === cluster);
                if (node) handleNodeSelect(node.id);
              }}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs backdrop-blur-sm transition-colors ${
                isActive
                  ? "border-accent-cyan/60 bg-accent-cyan/15 text-accent-cyan"
                  : "border-line-0/40 bg-bg-0/80 text-text-2 hover:border-accent-cyan/40 hover:text-accent-cyan"
              }`}
            >
              {cluster}
            </button>
          );
        })}
      </nav>

      {/* Reset button (visible when a node is selected) */}
      {selectedId && (
        <button
          onClick={() => handleNodeSelect(null)}
          className="pointer-events-auto absolute left-6 top-20 rounded-lg border border-line-0/40 bg-bg-0/80 px-3 py-1.5 font-mono text-xs text-text-2 backdrop-blur-sm transition-colors hover:border-accent-cyan/40 hover:text-accent-cyan"
        >
          Reset View
        </button>
      )}

      {/* Detail panel */}
      <DetailPanel node={selectedNode} onClose={() => handleNodeSelect(null)} />

      {/* Accessible keyboard nav */}
      <AccessibleNav onSelect={(id) => handleNodeSelect(id)} />
    </div>
  );
}
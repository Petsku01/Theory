"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
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
    const center = new THREE.Vector3(
      ...(clusterPositions[cluster] ?? [0, 0, 0])
    );
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

// ── IMPROVEMENT 1: useScramble hook ──
function useScramble(text: string, isHovered: boolean): string {
  const [display, setDisplay] = useState(text);
  const scrambleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Characters pool for scrambling
  const chars = "0123456789ABCDEF<>/\\";

  // Cleanup everything
  const clearAll = useCallback(() => {
    if (scrambleIntervalRef.current) {
      clearInterval(scrambleIntervalRef.current);
      scrambleIntervalRef.current = null;
    }
    resolveTimersRef.current.forEach(clearTimeout);
    resolveTimersRef.current = [];
  }, []);

  useEffect(() => {
    // On unmount
    return clearAll;
  }, [clearAll]);

  useEffect(() => {
    if (isHovered) {
      // Clear any ongoing scramble from previous hover
      clearAll();

      const finalText = text;
      const length = finalText.length;
      const revealed = new Array<boolean>(length).fill(false);

      // Scramble interval: random chars every 60ms for unresolved positions
      scrambleIntervalRef.current = setInterval(() => {
        setDisplay((prev) =>
          finalText
            .split("")
            .map((char, i) => {
              if (revealed[i]) return finalText[i];
              // Keep spaces untouched for readability
              if (char === " ") return " ";
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("")
        );
      }, 60);

      // Reveal characters left-to-right: each character reveals after ~30ms delay,
      // but we "slow down" reveal to half-speed relative to the scramble feel.
      // We'll use a 30ms interval between reveals.
      let revealIndex = 0;
      const revealNext = () => {
        if (revealIndex < length) {
          revealed[revealIndex] = true;
          revealIndex++;
          const timer = setTimeout(revealNext, 30);
          resolveTimersRef.current.push(timer);
        } else {
          // All characters revealed, stop scramble
          if (scrambleIntervalRef.current) {
            clearInterval(scrambleIntervalRef.current);
            scrambleIntervalRef.current = null;
          }
          setDisplay(finalText);
        }
      };
      // Start first reveal after a small initial delay (scramble a bit first)
      const startTimer = setTimeout(revealNext, 120);
      resolveTimersRef.current.push(startTimer);

      // Cleanup for this hover cycle
      return () => {
        clearAll();
        setDisplay(finalText); // Reset on leave
      };
    } else {
      // Not hovered: immediately show original text
      clearAll();
      setDisplay(text);
    }
  }, [isHovered, text, clearAll]);

  return display;
}

// ── 3D Node (icosahedron + wireframe + glow) ──
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
  const meshRef = useRef<THREE.Group>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const baseSize = node.size * 0.35;
  const color = useMemo(() => new THREE.Color(node.color), [node.color]);

  // ── Use the new scramble hook ──
  const displayText = useScramble(node.label, isHovered);

  // Target scale (lerp toward based on selection/hover)
  const targetScale = isSelected ? 1.6 : isHovered ? 1.2 : 1.0;

  const timeRef = useRef(0);
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    // Pulsing oscillation 0.95-1.05
    const pulse = 1 + Math.sin(timeRef.current * 3) * 0.05;
    // Lerp toward target scale
    const currentScale = meshRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale * pulse, delta * 6);
    meshRef.current.scale.setScalar(newScale);

    // Glow opacity
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        isHovered || isSelected ? 0.3 : 0.08,
        delta * 5
      );
    }
  });

  return (
    <group position={position}>
      {/* Icosahedron with wireframe */}
      <group ref={meshRef}>
        <mesh
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
          <icosahedronGeometry args={[baseSize, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.7 : 0.3}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
        {/* Wireframe (lines on the same geometry) */}
        <lineSegments
          ref={wireframeRef}
          geometry={new THREE.IcosahedronGeometry(baseSize, 1)}
        >
          <lineBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            linewidth={0.5}
          />
        </lineSegments>
      </group>

      {/* Glow (a larger transparent sphere) */}
      <mesh ref={glowRef} scale={[1.5, 1.5, 1.5]}>
        <sphereGeometry args={[baseSize, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      {/* Label (HTML) */}
      <Html
        position={[0, baseSize + 0.6, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap text-center">
          <div
            className="text-sm font-bold text-slate-200 font-mono"
            style={{ textShadow: "0 0 8px rgba(0,240,255,0.7)" }}
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

// ── IMPROVEMENT 3: Edge components (now memoized) ──
const EdgeCylinder = React.memo(function EdgeCylinder({
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
  const { position, quaternion, length } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const len = direction.length();
    const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const orientation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );
    return { position: midpoint, quaternion: orientation, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[thickness, thickness, length, 6, 1]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
});

// ── Energy Pulse traveling along an edge ──
function EnergyPulse({
  from,
  to,
  color,
  speed = 2, // seconds per cycle
  pulseSize = 0.06,
  opacity = 1,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  speed?: number;
  pulseSize?: number;
  opacity?: number;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(Math.random() * speed); // random phase

  useFrame((state) => {
    if (!sphereRef.current) return;
    const t = (state.clock.elapsedTime + offsetRef.current) % speed;
    const progress = t / speed;
    const pos = new THREE.Vector3().lerpVectors(from, to, progress);
    sphereRef.current.position.copy(pos);
  });

  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[pulseSize, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

// ── All network edges with cylinders, pulses, and glow (IMPROVEMENT 3) ──
const NetworkEdges = React.memo(function NetworkEdges({
  positions,
  selectedId,
}: {
  positions: Map<string, THREE.Vector3>;
  selectedId: string | null;
}) {
  const edgeData = useMemo(() => {
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
      {edgeData.map((ed) => (
        <group key={ed.key}>
          {/* Main connection line */}
          <EdgeCylinder
            from={ed.from}
            to={ed.to}
            color={ed.highlight ? "#00f0ff" : "#1e293b"}
            opacity={ed.highlight ? 0.8 : 0.25}
            thickness={ed.highlight ? 0.04 : 0.015}
          />
          {/* Glow cylinder only when highlighted */}
          {ed.highlight && (
            <EdgeCylinder
              from={ed.from}
              to={ed.to}
              color={"#00f0ff"}
              opacity={0.15}
              thickness={0.04 * 2.5} // 2.5× main thickness
            />
          )}
          {/* Traveling pulse */}
          <EnergyPulse
            from={ed.from}
            to={ed.to}
            color={ed.highlight ? "#00f0ff" : "#475569"}
            speed={2.0}
            opacity={ed.highlight ? 1 : 0.4}
            pulseSize={0.05}
          />
        </group>
      ))}
    </>
  );
});

// ── Background particles with attraction toward active node ──
function BackgroundParticles({
  count = 500,
  targetPos,
}: {
  count?: number;
  targetPos?: THREE.Vector3 | null;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const positionsRef = useRef<Float32Array>(new Float32Array(count * 3));
  const velocitiesRef = useRef<Float32Array>(new Float32Array(count * 3));
  const bounds = useMemo(() => [15, 10, 10] as const, []);

  // Initialize once
  useEffect(() => {
    const pos = positionsRef.current;
    const vel = velocitiesRef.current;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }
  }, [count]);

  useFrame(() => {
    const points = pointsRef.current;
    if (!points) return;
    const pos = positionsRef.current;
    const vel = velocitiesRef.current;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Apply velocity
      for (let j = 0; j < 3; j++) {
        pos[idx + j] += vel[idx + j];
        // Boundary check
        if (Math.abs(pos[idx + j]) > bounds[j]) {
          pos[idx + j] = (bounds[j] - 0.1) * -Math.sign(pos[idx + j]) + (Math.random() - 0.5) * 0.3;
          // Reverse velocity slightly
          vel[idx + j] *= -0.2;
        }
      }

      // Attraction to target if exists
      if (targetPos) {
        const dx = targetPos.x - pos[idx];
        const dy = targetPos.y - pos[idx + 1];
        const dz = targetPos.z - pos[idx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
        const force = 0.0003;
        vel[idx] += (dx / dist) * force;
        vel[idx + 1] += (dy / dist) * force;
        vel[idx + 2] += (dz / dist) * force;
      }

      // Limit velocity
      const maxVel = 0.02;
      for (let j = 0; j < 3; j++) {
        if (Math.abs(vel[idx + j]) > maxVel) vel[idx + j] = maxVel * Math.sign(vel[idx + j]);
      }
    }

    (points.geometry.attributes.position as THREE.BufferAttribute).array = pos;
    points.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00f0ff"
        size={0.04}
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

// ── IMPROVEMENT 2: Canvas texture grid floor ──
function CyberGrid() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Draw fine grid lines (every 64px)
    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.lineWidth = 2;
    const spacing = 64;
    for (let x = spacing; x < canvas.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = spacing; y < canvas.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Overlay radial gradient: center transparent, edges opaque bg color
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2
    );
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.85, "transparent");
    gradient.addColorStop(1, "rgba(10,10,15,1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

// ── IMPROVEMENT 4: Camera controller with sinusoidal shake ──
function CameraController({
  target,
  controlsRef,
  shakeTimestamp,
}: {
  target: THREE.Vector3 | null;
  controlsRef: React.RefObject<any>;
  shakeTimestamp: number;
}) {
  const shakeStartTime = useRef<number>(0);
  const shakeDirection = useRef<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    if (shakeTimestamp > 0) {
      shakeStartTime.current = performance.now();
      // Random direction for the shake oscillation
      shakeDirection.current
        .set(
          Math.random() - 0.5,
          Math.random() * 0.5 + 0.2, // mostly vertical
          Math.random() - 0.5
        )
        .normalize();
    }
  }, [shakeTimestamp]);

  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Fly toward target
    if (target) {
      const cameraOffset = new THREE.Vector3(0, 1.5, 5);
      const desiredPos = target.clone().add(cameraOffset);
      controls.object.position.lerp(desiredPos, delta * 2);
      controls.target.lerp(target, delta * 3);
    }

    // Sinusoidal camera shake decay (300ms)
    const elapsed = (performance.now() - shakeStartTime.current) / 1000;
    const frequency = 30;
    const decay = 10;
    const amplitude = 0.03;
    const duration = 0.3;

    if (elapsed < duration) {
      const magnitude =
        amplitude * Math.sin(frequency * elapsed) * Math.exp(-decay * elapsed);
      const offset = shakeDirection.current.clone().multiplyScalar(magnitude);
      controls.object.position.add(offset);
    }

    controls.update();
  });

  return null;
}

// ── Detail panel with slide-in/out animation ──
function DetailPanel({
  node,
  stage,
  onCloseAction,
}: {
  node: CortexNode | null;
  stage: "show" | "hiding" | "hidden";
  onCloseAction: () => void;
}) {
  if (!node || stage === "hidden") return null;

  const panelClass =
    stage === "hiding"
      ? "translate-x-full opacity-0"
      : "translate-x-0 opacity-100";

  return (
    <div
      className={`pointer-events-auto fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700/50 bg-[#0a0a0f]/95 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out ${panelClass} max-md:bottom-0 max-md:left-0 max-md:top-auto max-md:w-full max-md:rounded-b-none`}
    >
      <button
        onClick={onCloseAction}
        className="absolute right-3 top-3 text-slate-400 hover:text-slate-100"
        aria-label="Close panel"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>

      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <h3 className="text-lg font-bold text-slate-100 font-mono">
          {node.label}
        </h3>
      </div>
      <p className="mt-1 text-sm text-slate-300">
        {node.fullDesc ?? node.shortDesc}
      </p>

      {node.tech && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {node.tech.map((t) => (
            <span
              key={t}
              className="rounded-md bg-slate-800/70 px-2 py-0.5 font-mono text-xs text-cyan-300"
            >
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
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/20"
        >
          View Project
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      )}

      <div className="mt-3">
        <span className="rounded bg-slate-800/50 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-slate-400">
          {node.type}
        </span>
      </div>
    </div>
  );
}

// ── Typewriter title overlay ──
function TitleOverlay({
  hasInteracted,
}: {
  hasInteracted: boolean;
}) {
  const [typedTitle, setTypedTitle] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showHint, setShowHint] = useState(!hasInteracted);
  const fullTitle = "Petteri Kosonen";

  // Typewriter effect
  useEffect(() => {
    if (typedTitle.length < fullTitle.length) {
      const timeout = setTimeout(() => {
        setTypedTitle(fullTitle.slice(0, typedTitle.length + 1));
      }, 80);
      return () => clearTimeout(timeout);
    } else {
      // Title done → show subtitle after a beat
      const t = setTimeout(() => setShowSubtitle(true), 600);
      return () => clearTimeout(t);
    }
  }, [typedTitle, fullTitle]);

  // Fade hint after first interaction
  useEffect(() => {
    if (hasInteracted) {
      const t = setTimeout(() => setShowHint(false), 1000);
      return () => clearTimeout(t);
    }
  }, [hasInteracted]);

  return (
    <div className="pointer-events-none absolute left-6 top-6 z-10">
      <h1 className="font-display text-2xl font-bold text-slate-100 font-mono">
        {typedTitle}
        <span className="animate-pulse text-cyan-400">_</span>
      </h1>
      <p
        className={`mt-1 font-mono text-sm text-slate-400 transition-opacity duration-700 ${
          showSubtitle ? "opacity-100" : "opacity-0"
        }`}
      >
        Security Engineer + AI Researcher
      </p>
      {showHint && (
        <p className="mt-2 font-mono text-xs text-cyan-500/60 transition-opacity duration-500">
          Click a node to explore. Drag to rotate. Scroll to zoom.
        </p>
      )}
    </div>
  );
}

// ── Scanlines overlay (cyberpunk) ──
function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.02) 2px, rgba(0,240,255,0.02) 4px)",
        animation: "scanlines 10s linear infinite",
      }}
    />
  );
}

// ── Vignette overlay ──
function Vignette() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 60%, rgba(10,10,15,0.85) 100%)",
      }}
    />
  );
}

// ── Global styles for keyframes ──
function GlobalStyles() {
  return (
    <style>{`
      @keyframes scanlines {
        0% { background-position: 0 0; }
        100% { background-position: 0 100%; }
      }
    `}</style>
  );
}

// ── Keyboard-accessible hidden nav ──
function AccessibleNav({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <nav className="sr-only" aria-label="Site sections">
      {nodes.map((node) => (
        <button key={node.id} onClick={() => onSelect(node.id)}>
          {node.label} - {node.shortDesc}
        </button>
      ))}
    </nav>
  );
}

// ── Main 3D scene ──
function CortexScene({
  selectedId,
  onNodeSelect,
  onNodeHover,
  shakeTimestamp,
}: {
  selectedId: string | null;
  onNodeSelect: (id: string | null) => void;
  onNodeHover: (id: string | null) => void;
  shakeTimestamp: number;
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

  React.useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  const targetPosition = useMemo(() => {
    if (!selectedId) return null;
    return positions.get(selectedId) ?? null;
  }, [selectedId, positions]);

  // Determine the attraction target for particles (hovered or selected)
  const attractionTarget = useMemo(() => {
    const id = hoveredId ?? selectedId;
    if (!id) return null;
    return positions.get(id) ?? null;
  }, [hoveredId, selectedId, positions]);

  return (
    <>
      <ambientLight intensity={0.12} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#00f0ff" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#00ff88" />

      <BackgroundParticles count={500} targetPos={attractionTarget} />
      <CyberGrid />
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
    </>
  );
}

// ── Loading fallback ──
function CortexLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
        <p className="font-mono text-sm text-slate-400">
          Initializing neural cortex...
        </p>
      </div>
    </div>
  );
}

// ── Exported wrapper ──
export default function NeuralCortex() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [shakeTimestamp, setShakeTimestamp] = useState(0);

  // Panel animation state
  const [panelNode, setPanelNode] = useState<CortexNode | null>(null);
  const [panelStage, setPanelStage] = useState<"show" | "hiding" | "hidden">(
    "hidden"
  );
  const panelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive selected node for panel
  const selectedNode = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [selectedId]
  );

  // Sync panel state when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      // Show panel
      clearTimeout(panelTimeout.current!);
      setPanelNode(selectedNode);
      setPanelStage("show");
    } else if (panelNode) {
      // Hide panel with animation
      setPanelStage("hiding");
      panelTimeout.current = setTimeout(() => {
        setPanelNode(null);
        setPanelStage("hidden");
      }, 300); // match CSS transition duration
    }
    return () => clearTimeout(panelTimeout.current!);
  }, [selectedNode, panelNode]);

  const handleNodeSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id !== null && !hasInteracted) {
        setHasInteracted(true);
      }
      // Trigger camera shake on selecting a node (not deselecting)
      if (id !== null) {
        setShakeTimestamp((prev) => prev + 1);
      }
    },
    [hasInteracted]
  );

  const handleNodeHover = useCallback((_id: string | null) => {}, []);

  const handlePanelClose = useCallback(() => {
    setSelectedId(null);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0f]">
      <GlobalStyles />
      <Suspense fallback={<CortexLoader />}>
        <Canvas
          camera={{ position: [0, 3, 12], fov: 60, near: 0.1, far: 100 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          dpr={[1, 2]}
        >
          <CortexScene
            selectedId={selectedId}
            onNodeSelect={handleNodeSelect}
            onNodeHover={handleNodeHover}
            shakeTimestamp={shakeTimestamp}
          />
        </Canvas>
      </Suspense>

      {/* Visual overlays */}
      <Scanlines />
      <Vignette />

      {/* Title overlay */}
      <TitleOverlay hasInteracted={hasInteracted} />

      {/* Reset button */}
      {selectedId && (
        <button
          onClick={() => handleNodeSelect(null)}
          className="pointer-events-auto absolute left-6 top-20 z-20 rounded-lg border border-slate-700/60 bg-[#0a0a0f]/90 px-3 py-1.5 font-mono text-xs text-slate-300 backdrop-blur-sm transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
        >
          Reset View
        </button>
      )}

      {/* Cluster navigation buttons */}
      <nav
        className="pointer-events-auto absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2"
        aria-label="Cluster navigation"
      >
        {(
          ["core", "projects", "skills", "experience", "research"] as const
        ).map((cluster) => {
          const isActive =
            selectedNode?.cluster === cluster;
          return (
            <button
              key={cluster}
              onClick={() => {
                const node = nodes.find((n) => n.cluster === cluster);
                if (node) handleNodeSelect(node.id);
              }}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs backdrop-blur-sm transition-colors ${
                isActive
                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-400"
                  : "border-slate-700/50 bg-[#0a0a0f]/80 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-500"
              }`}
            >
              {cluster}
            </button>
          );
        })}
      </nav>

      {/* Detail panel (with animation) */}
      <DetailPanel
        node={panelNode}
        stage={panelStage}
        onCloseAction={handlePanelClose}
      />

      {/* Accessible keyboard nav */}
      <AccessibleNav onSelect={(id) => handleNodeSelect(id)} />
    </div>
  );
}

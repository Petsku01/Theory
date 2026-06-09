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
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { nodes, edges, clusterPositions, type CortexNode } from "@/lib/cortex-data";

// ── Per‑cluster colour scheme (replaces ad‑hoc node colors) ──
const CLUSTER_COLORS: Record<string, string> = {
  core: "#00f0ff",
  projects: "#a855f7",
  skills: "#22d3ee",
  experience: "#f59e0b",
  research: "#ef4444",
};

// ── Layout: organic Fibonacci‑spiral placement around cluster centers ──
// Deterministic seeded PRNG so layout is stable across renders
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function computePositions(nodeList: CortexNode[]): Map<string, THREE.Vector3> {
  const pos = new Map<string, THREE.Vector3>();
  const clusterNodes = new Map<string, CortexNode[]>();
  for (const n of nodeList) {
    const arr = clusterNodes.get(n.cluster) ?? [];
    arr.push(n);
    clusterNodes.set(n.cluster, arr);
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399 rad

  for (const [cluster, clusterList] of clusterNodes) {
    const center = new THREE.Vector3(
      ...(clusterPositions[cluster] ?? [0, 0, 0])
    );
    const count = clusterList.length;

    if (count === 1) {
      // Core node: stay at center with tiny jitter
      pos.set(clusterList[0].id, center.clone());
      continue;
    }

    // Fibonacci spiral: i-th node at angle i*goldenAngle, radius sqrt(i/count)*spread
    const spread = 1.6 + count * 0.15;
    clusterList.forEach((node, i) => {
      const angle = i * goldenAngle;
      const r = Math.sqrt((i + 0.5) / count) * spread;
      // Deterministic per-node jitter with Y variation
      const rng = seededRandom(node.id.length * 127 + i * 31);
      const jitter = new THREE.Vector3(
        (rng() - 0.5) * 0.3,
        (rng() - 0.5) * 1.0,
        (rng() - 0.5) * 0.3
      );
      const offset = new THREE.Vector3(
        Math.cos(angle) * r,
        Math.sin(angle * 0.7 + i * 1.1) * 0.8,
        Math.sin(angle) * r
      ).add(jitter);
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
  const chars = "0123456789ABCDEF<>/\\";

  const clearAll = useCallback(() => {
    if (scrambleIntervalRef.current) {
      clearInterval(scrambleIntervalRef.current);
      scrambleIntervalRef.current = null;
    }
    resolveTimersRef.current.forEach(clearTimeout);
    resolveTimersRef.current = [];
  }, []);

  useEffect(() => {
    return clearAll;
  }, [clearAll]);

  useEffect(() => {
    if (isHovered) {
      clearAll();
      const finalText = text;
      const length = finalText.length;
      const revealed = new Array<boolean>(length).fill(false);

      scrambleIntervalRef.current = setInterval(() => {
        setDisplay((prev) =>
          finalText
            .split("")
            .map((char, i) => {
              if (revealed[i]) return finalText[i];
              if (char === " ") return " ";
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("")
        );
      }, 60);

      let revealIndex = 0;
      const revealNext = () => {
        if (revealIndex < length) {
          revealed[revealIndex] = true;
          revealIndex++;
          const timer = setTimeout(revealNext, 30);
          resolveTimersRef.current.push(timer);
        } else {
          if (scrambleIntervalRef.current) {
            clearInterval(scrambleIntervalRef.current);
            scrambleIntervalRef.current = null;
          }
          setDisplay(finalText);
        }
      };
      const startTimer = setTimeout(revealNext, 120);
      resolveTimersRef.current.push(startTimer);

      return () => {
        clearAll();
        setDisplay(finalText);
      };
    } else {
      clearAll();
      setDisplay(text);
    }
  }, [isHovered, text, clearAll]);

  return display;
}

// ── Soft‑circle texture for particles ──
function createSoftCircleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 64);
  // Soft radial gradient: opaque white centre → transparent edge
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.8, "rgba(255,255,255,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// ── 3D Node (solid emissive icosahedron + inner core + wireframe overlay) ──
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
  const groupRef = useRef<THREE.Group>(null);
  const outerMeshRef = useRef<THREE.Mesh>(null);
  const innerMeshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const baseSize = node.size * 0.22;
  const clusterColor = CLUSTER_COLORS[node.cluster] ?? "#00f0ff";
  const color = useMemo(() => new THREE.Color(clusterColor), [clusterColor]);

  const displayText = useScramble(node.label, isHovered);

  // Time‑varying oscillation: scale + vertical bob for depth perception
  const timeRef = useRef(0);
  // Per-node phase offset so they don't all bob in sync
  const phaseOffset = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < node.id.length; i++) hash = ((hash << 5) - hash + node.id.charCodeAt(i));
    return (Math.abs(hash) % 100) / 100 * Math.PI * 2;
  }, [node.id]);
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const isActive = isHovered || isSelected;
    const amplitude = isActive ? 0.075 : 0.05;
    const speed = isActive ? 6 : 3;
    const oscillation = 1 + Math.sin(timeRef.current * speed) * amplitude;
    groupRef.current.scale.setScalar(oscillation);
    // Vertical bob: gentle Y oscillation with per-node phase
    const bobSpeed = 0.8;
    const bobAmp = isActive ? 0.12 : 0.06;
    groupRef.current.position.y = Math.sin(timeRef.current * bobSpeed + phaseOffset) * bobAmp;

    // Outer mesh emissive
    if (outerMeshRef.current) {
      const mat = outerMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        isActive ? 6 : 2,
        delta * 8
      );
    }
    // Inner core
    if (innerMeshRef.current) {
      const mat = innerMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        isActive ? 8 : 4,
        delta * 8
      );
    }
    // Glow halo
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        isActive ? 0.4 : 0.08,
        delta * 8
      );
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Outer emissive solid */}
        <mesh
          ref={outerMeshRef}
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
            emissiveIntensity={2}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>

        {/* Inner bright core */}
        <mesh ref={innerMeshRef}>
          <icosahedronGeometry args={[baseSize * 0.5, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={4}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>

        {/* Thin wireframe overlay */}
        <lineSegments
          ref={wireframeRef}
          geometry={new THREE.IcosahedronGeometry(baseSize, 1)}
        >
          <lineBasicMaterial color={color} transparent opacity={0.3} />
        </lineSegments>
      </group>

      {/* Glow halo (larger transparent sphere) */}
      <mesh ref={glowRef} scale={[1.7, 1.7, 1.7]}>
        <sphereGeometry args={[baseSize, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      {/* HTML label */}
      <Html
        position={[0, baseSize + 0.6, 0]}
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

// ── Edge cylinder helper ──
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

// ── Energy Pulse (travelling light along an edge) ──
function EnergyPulse({
  from,
  to,
  color,
  speed = 2,
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
  const offsetRef = useRef(Math.random() * speed);

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

// ── Helper: blend two hex colours ──
function blendColors(a: string, b: string, t: number = 0.5): string {
  const colA = new THREE.Color(a);
  const colB = new THREE.Color(b);
  return colA.clone().lerp(colB, t).getStyle();
}

// ── All network edges with cluster‑coloured wires & travelling pulses ──
const NetworkEdges = React.memo(function NetworkEdges({
  positions,
  selectedId,
}: {
  positions: Map<string, THREE.Vector3>;
  selectedId: string | null;
}) {
  // Build an id → cluster map
  const nodeClusterMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((n) => map.set(n.id, n.cluster));
    return map;
  }, []);

  const edgeData = useMemo(() => {
    return edges
      .filter((e) => positions.has(e.from) && positions.has(e.to))
      .map((e) => {
        const fromPos = positions.get(e.from)!;
        const toPos = positions.get(e.to)!;
        const clusterFrom = nodeClusterMap.get(e.from);
        const clusterTo = nodeClusterMap.get(e.to);
        const colorFrom = CLUSTER_COLORS[clusterFrom ?? ""] ?? "#00f0ff";
        const colorTo = CLUSTER_COLORS[clusterTo ?? ""] ?? "#00f0ff";
        const edgeColor =
          clusterFrom === clusterTo
            ? colorFrom
            : blendColors(colorFrom, colorTo, 0.5);
        const highlight = selectedId === e.from || selectedId === e.to;

        return {
          key: `${e.from}-${e.to}`,
          from: fromPos,
          to: toPos,
          strength: e.strength,
          color: edgeColor,
          highlight,
        };
      });
  }, [positions, selectedId, nodeClusterMap]);

  return (
    <>
      {edgeData.map((ed) => {
        const wireOpacity = ed.highlight ? 0.4 : 0.12;
        const pulseOpacity = ed.highlight ? 1 : 0.4;
        const pulseSpeed = ed.highlight ? 1.2 : 2.0;
        return (
          <group key={ed.key}>
            {/* Thin wire */}
            <EdgeCylinder
              from={ed.from}
              to={ed.to}
              color={ed.color}
              opacity={wireOpacity}
              thickness={0.015}
            />
            {/* Glow cylinder only when highlighted */}
            {ed.highlight && (
              <EdgeCylinder
                from={ed.from}
                to={ed.to}
                color={ed.color}
                opacity={0.1}
                thickness={0.04}
              />
            )}
            {/* Travelling pulse */}
            <EnergyPulse
              from={ed.from}
              to={ed.to}
              color={ed.color}
              speed={pulseSpeed}
              opacity={pulseOpacity}
              pulseSize={0.05}
            />
          </group>
        );
      })}
    </>
  );
});

// ── Soft‑circle particles with per‑particle alpha & attraction ──
function SoftParticles({
  count = 500,
  targetPos,
  color = "#00f0ff",
}: {
  count?: number;
  targetPos?: THREE.Vector3 | null;
  color?: string;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const bounds = useMemo(() => [15, 10, 10] as const, []);

  // Pre‑generate attributes
  const { positions, sizes, alphas, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const a = new Float32Array(count);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      s[i] = 0.06 + Math.random() * 0.06; // 0.06–0.12
      a[i] = 0.3 + Math.random() * 0.4;   // 0.3–0.7
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }
    return { positions: pos, sizes: s, alphas: a, velocities: vel };
  }, [count]);

  // Soft circle texture
  const texture = useMemo(() => createSoftCircleTexture(), []);

  // Shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        map: { value: texture },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (200.0 / -mvPosition.z);
          vAlpha = alpha;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform sampler2D map;
        varying float vAlpha;
        void main() {
          vec4 texColor = texture2D(map, gl_PointCoord);
          float alpha = texColor.a * vAlpha;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [color, texture]);

  // Store mutable data in refs
  const posRef = useRef(positions);
  const velRef = useRef(velocities);
  const attrRef = useRef<THREE.BufferAttribute | null>(null);

  // Copy to shader material after creation
  useEffect(() => {
    if (shaderRef.current) {
      shaderRef.current.needsUpdate = true;
    }
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const geo = mesh.geometry;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const pos = posRef.current;
    const vel = velRef.current;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Apply velocity
      for (let j = 0; j < 3; j++) {
        pos[idx + j] += vel[idx + j];
        if (Math.abs(pos[idx + j]) > bounds[j]) {
          pos[idx + j] = (bounds[j] - 0.1) * -Math.sign(pos[idx + j]) + (Math.random() - 0.5) * 0.3;
          vel[idx + j] *= -0.2;
        }
      }
      // Attraction
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
      // Clamp velocity
      const maxVel = 0.02;
      for (let j = 0; j < 3; j++) {
        if (Math.abs(vel[idx + j]) > maxVel) vel[idx + j] = maxVel * Math.sign(vel[idx + j]);
      }
    }

    // Update buffer
    for (let i = 0; i < count * 3; i++) attr.array[i] = pos[i];
    attr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-alpha"
          args={[alphas, 1]}
        />
      </bufferGeometry>
      <primitive object={material} ref={shaderRef} attach="material" />
    </points>
  );
}

// ── Canvas‑textured grid floor ──
function CyberGrid() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    ctx.strokeStyle = "rgba(0, 240, 255, 0.12)";
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

// ── Camera controller with sinusoidal shake ──
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
      shakeDirection.current
        .set(
          Math.random() - 0.5,
          Math.random() * 0.5 + 0.2,
          Math.random() - 0.5
        )
        .normalize();
    }
  }, [shakeTimestamp]);

  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (target) {
      const cameraOffset = new THREE.Vector3(0, 2, 4);
      const desiredPos = target.clone().add(cameraOffset);
      controls.object.position.lerp(desiredPos, delta * 2);
      controls.target.lerp(target, delta * 3);
    }

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

// ── Detail panel (unchanged) ──
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

// ── Title overlay (unchanged) ──
function TitleOverlay({ hasInteracted }: { hasInteracted: boolean }) {
  const [typedTitle, setTypedTitle] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showHint, setShowHint] = useState(!hasInteracted);
  const fullTitle = "Petteri Kosonen";

  useEffect(() => {
    if (typedTitle.length < fullTitle.length) {
      const timeout = setTimeout(() => {
        setTypedTitle(fullTitle.slice(0, typedTitle.length + 1));
      }, 80);
      return () => clearTimeout(timeout);
    } else {
      const t = setTimeout(() => setShowSubtitle(true), 600);
      return () => clearTimeout(t);
    }
  }, [typedTitle, fullTitle]);

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

// ── Scanlines overlay (finer, lower opacity) ──
function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)",
        animation: "scanlines 10s linear infinite",
        backgroundSize: "100% 4px",
      }}
    />
  );
}

// ── Vignette overlay (unchanged) ──
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

// ── Global keyframes ──
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

// ── Hidden keyboard nav ──
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
      <ambientLight intensity={0.12} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#00f0ff" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#22d3ee" />

      <SoftParticles count={1200} targetPos={attractionTarget} color="#00f0ff" />
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

      {/* Bloom post‑processing — makes emissive materials glow */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ── Loader ──
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

  const [panelNode, setPanelNode] = useState<CortexNode | null>(null);
  const [panelStage, setPanelStage] = useState<"show" | "hiding" | "hidden">(
    "hidden"
  );
  const panelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [selectedId]
  );

  useEffect(() => {
    if (selectedNode) {
      clearTimeout(panelTimeout.current!);
      setPanelNode(selectedNode);
      setPanelStage("show");
    } else if (panelNode) {
      setPanelStage("hiding");
      panelTimeout.current = setTimeout(() => {
        setPanelNode(null);
        setPanelStage("hidden");
      }, 300);
    }
    return () => clearTimeout(panelTimeout.current!);
  }, [selectedNode, panelNode]);

  const handleNodeSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id !== null && !hasInteracted) {
        setHasInteracted(true);
      }
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
          camera={{ position: [0, 8, 16], fov: 55, near: 0.1, far: 100 }}
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

      <Scanlines />
      <Vignette />

      <TitleOverlay hasInteracted={hasInteracted} />

      {selectedId && (
        <button
          onClick={() => handleNodeSelect(null)}
          className="pointer-events-auto absolute left-6 top-20 z-20 rounded-lg border border-slate-700/60 bg-[#0a0a0f]/90 px-3 py-1.5 font-mono text-xs text-slate-300 backdrop-blur-sm transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
        >
          Reset View
        </button>
      )}

      <nav
        className="pointer-events-auto absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2"
        aria-label="Cluster navigation"
      >
        {(
          ["core", "projects", "skills", "experience", "research"] as const
        ).map((cluster) => {
          const isActive = selectedNode?.cluster === cluster;
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

      <DetailPanel
        node={panelNode}
        stage={panelStage}
        onCloseAction={handlePanelClose}
      />

      <AccessibleNav onSelect={(id) => handleNodeSelect(id)} />
    </div>
  );
}

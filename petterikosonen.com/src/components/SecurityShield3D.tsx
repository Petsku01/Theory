"use client";

import { useRef, useMemo, Suspense, useState, useEffect, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Text } from "@react-three/drei";
import * as THREE from "three";

const DATA_STRINGS = [
  "SHA256",
  "TLS1.3",
  "AUTH_OK",
  "MFA",
  "JWT",
  "AES256",
  "RSA4096",
  "CERT_OK",
  "VERIFY",
  "ENCRYPT",
  "SIGN",
  "HMAC",
  "FIREWALL",
  "WAF_ON",
  "SIEM",
  "ZERO_TRUST",
];

const THREAT_TYPES = ["MALWARE", "PHISH", "SQLI", "XSS", "DDOS"];

interface Threat {
  id: number;
  angle: number;
  radius: number;
  y: number;
  speed: number;
  type: string;
}

function stableNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function getThemeFromHour(hour: number) {
  const isDay = hour >= 7 && hour < 19;

  if (isDay) {
    return {
      isDay,
      shield: "#38bdf8",
      ringOuter: "#34d399",
      ringInner: "#60a5fa",
      glow: 0.38,
      ambient: 0.42,
      sparkles: "#34d399",
      dataText: "#67e8f9",
    };
  }

  return {
    isDay,
    shield: "#0ea5e9",
    ringOuter: "#22d3ee",
    ringInner: "#818cf8",
    glow: 0.62,
    ambient: 0.22,
    sparkles: "#22d3ee",
    dataText: "#22d3ee",
  };
}

function FloatingDataFeed({
  color,
  scrollRef,
}: {
  color: string;
  scrollRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const feedItems = useMemo(
    () =>
      DATA_STRINGS.map((text, index) => ({
        text,
        radius: 2.5 + stableNoise(index + 1) * 0.9,
        speed: 0.35 + stableNoise(index + 7) * 0.4,
        yOffset: -1.1 + stableNoise(index + 13) * 2.2,
        phase: (index / DATA_STRINGS.length) * Math.PI * 2,
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const time = clock.getElapsedTime();
    const spread = 1 + scrollRef.current * 0.35;

    for (let index = 0; index < groupRef.current.children.length; index += 1) {
      const child = groupRef.current.children[index];
      const item = feedItems[index];
      const angle = time * item.speed + item.phase;
      child.position.set(
        Math.cos(angle) * item.radius * spread,
        item.yOffset + Math.sin(time * 0.7 + item.phase) * 0.22,
        Math.sin(angle) * item.radius * spread,
      );
      child.lookAt(0, child.position.y, 0);
    }
  });

  return (
    <group ref={groupRef}>
      {feedItems.map((item) => (
        <Text
          key={item.text}
          fontSize={0.14}
          color={color}
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.85}
        >
          {item.text}
        </Text>
      ))}
    </group>
  );
}

function ThreatField({
  threats,
  onThreatClick,
}: {
  threats: Threat[];
  onThreatClick: (id: number) => void;
}) {
  const meshRefs = useRef<Map<number, THREE.Mesh>>(new Map());

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    threats.forEach((threat) => {
      const mesh = meshRefs.current.get(threat.id);
      if (!mesh) return;

      const angle = threat.angle + time * threat.speed;
      mesh.position.set(
        Math.cos(angle) * threat.radius,
        threat.y + Math.sin(time * (threat.speed + 0.5)) * 0.2,
        Math.sin(angle) * threat.radius,
      );
    });
  });

  return (
    <group>
      {threats.map((threat) => (
        <mesh
          key={threat.id}
          ref={(mesh) => {
            if (mesh) {
              meshRefs.current.set(threat.id, mesh);
            } else {
              meshRefs.current.delete(threat.id);
            }
          }}
          onClick={(event) => {
            event.stopPropagation();
            onThreatClick(threat.id);
          }}
        >
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.95} />
          <Text position={[0, 0.32, 0]} fontSize={0.08} color="#fca5a5" anchorX="center" anchorY="middle">
            {threat.type}
          </Text>
        </mesh>
      ))}
    </group>
  );
}

function ShieldCore({
  mouseRef,
  scrollRef,
  pulseRef,
  theme,
}: {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollRef: React.MutableRefObject<number>;
  pulseRef: React.MutableRefObject<number>;
  theme: ReturnType<typeof getThemeFromHour>;
}) {
  const shieldGroupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const bodyMeshRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (pulseRef.current > 0) {
      pulseRef.current = Math.max(0, pulseRef.current - delta * 4.4);
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * 0.8;
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= delta * 1.25;
    }

    if (!shieldGroupRef.current) return;

    const pulse = pulseRef.current;
    const scroll = scrollRef.current;
    const targetScale = 1 - scroll * 0.42 + pulse * 0.2;
    const targetRotationY = scroll * Math.PI * 0.55;
    const targetRotationX = mouseRef.current.y * 0.35 + scroll * 0.12;
    const targetRotationZ = -mouseRef.current.x * 0.2;

    shieldGroupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.08,
    );
    shieldGroupRef.current.rotation.x = THREE.MathUtils.lerp(
      shieldGroupRef.current.rotation.x,
      targetRotationX,
      0.08,
    );
    shieldGroupRef.current.rotation.y = THREE.MathUtils.lerp(
      shieldGroupRef.current.rotation.y,
      targetRotationY,
      0.08,
    );
    shieldGroupRef.current.rotation.z = THREE.MathUtils.lerp(
      shieldGroupRef.current.rotation.z,
      targetRotationZ,
      0.08,
    );

    if (bodyRef.current) {
      const pulseGlow = 1 + pulse * 0.35;
      bodyRef.current.scale.setScalar(pulseGlow);
    }

    const bodyMaterial = bodyMeshRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (bodyMaterial) {
      bodyMaterial.emissiveIntensity = theme.glow + pulse * 0.5;
    }

    const outerRingMaterial = outerRingRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (outerRingMaterial) {
      outerRingMaterial.emissiveIntensity = theme.glow + pulse * 0.45;
    }

    const innerRingMaterial = innerRingRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (innerRingMaterial) {
      innerRingMaterial.emissiveIntensity = theme.glow * 0.9 + pulse * 0.35;
    }
  });

  return (
    <group ref={shieldGroupRef}>
      <Float speed={1.8} rotationIntensity={0.16} floatIntensity={0.35}>
        <group ref={bodyRef}>
          <mesh ref={bodyMeshRef}>
            <boxGeometry args={[1.8, 1.8, 1.8]} />
            <meshStandardMaterial
              color={theme.shield}
              roughness={theme.isDay ? 0.36 : 0.18}
              metalness={0.85}
              transparent
              opacity={0.9}
              emissive={theme.shield}
              emissiveIntensity={theme.glow}
              flatShading
            />
          </mesh>

          <mesh>
            <boxGeometry args={[2.8, 2.8, 2.8]} />
            <meshBasicMaterial color={theme.shield} wireframe transparent opacity={0.16} />
          </mesh>
        </group>
      </Float>

      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2, 0.05, 16, 120]} />
        <meshStandardMaterial color={theme.ringOuter} emissive={theme.ringOuter} emissiveIntensity={theme.glow} />
      </mesh>

      <mesh ref={innerRingRef} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
        <torusGeometry args={[1.58, 0.036, 16, 96]} />
        <meshStandardMaterial color={theme.ringInner} emissive={theme.ringInner} emissiveIntensity={theme.glow * 0.9} />
      </mesh>

      <Sparkles count={65} scale={5.2} size={2} speed={0.35} color={theme.sparkles} />
    </group>
  );
}

function Scene({
  mouseRef,
  scrollRef,
  pulseRef,
  theme,
  threats,
  onThreatClick,
}: {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollRef: React.MutableRefObject<number>;
  pulseRef: React.MutableRefObject<number>;
  theme: ReturnType<typeof getThemeFromHour>;
  threats: Threat[];
  onThreatClick: (id: number) => void;
}) {
  return (
    <>
      <ambientLight intensity={theme.ambient} />
      <pointLight position={[7, 7, 6]} intensity={theme.isDay ? 0.9 : 1.1} color={theme.shield} />
      <pointLight position={[-7, -3, -6]} intensity={0.5} color={theme.ringInner} />
      <pointLight position={[0, 9, 0]} intensity={0.35} color={theme.ringOuter} />

      <ShieldCore mouseRef={mouseRef} scrollRef={scrollRef} pulseRef={pulseRef} theme={theme} />
      <FloatingDataFeed color={theme.dataText} scrollRef={scrollRef} />
      <ThreatField threats={threats} onThreatClick={onThreatClick} />
    </>
  );
}

function MobileFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="absolute h-48 w-48 animate-pulse rounded-full border border-accent-cyan/20" />
      <div className="absolute h-40 w-40 animate-[spin_8s_linear_infinite] rounded-full border-2 border-dashed border-accent-green/40" />
      <div className="absolute h-32 w-32 animate-[spin_6s_linear_infinite_reverse] rounded-full border border-accent-violet/40" />

      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-accent-cyan/30 to-accent-violet/30 blur-sm" />
        <div className="absolute inset-2 rounded-full border border-accent-cyan/50 bg-bg-1/80 backdrop-blur-sm" />
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-green/20" />

        <svg
          className="absolute inset-0 m-auto h-10 w-10 text-accent-cyan"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      </div>

      <div
        className="absolute h-4 w-4 animate-[float_3s_ease-in-out_infinite] rounded-full bg-accent-cyan/30"
        style={{ top: "20%", left: "25%" }}
      />
      <div
        className="absolute h-3 w-3 animate-[float_4s_ease-in-out_infinite_0.5s] rounded-full bg-accent-green/30"
        style={{ top: "30%", right: "20%" }}
      />
      <div
        className="absolute h-2 w-2 animate-[float_3.5s_ease-in-out_infinite_1s] rounded-full bg-accent-violet/30"
        style={{ bottom: "25%", left: "30%" }}
      />
      <div
        className="absolute h-3 w-3 animate-[float_4.5s_ease-in-out_infinite_1.5s] rounded-full bg-accent-cyan/30"
        style={{ bottom: "30%", right: "25%" }}
      />
    </div>
  );
}

export default function SecurityShield3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);
  const pulseRef = useRef(0);
  const threatIdRef = useRef(0);

  const [theme, setTheme] = useState(() => getThemeFromHour(new Date().getHours()));
  const [isMobile, setIsMobile] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const updateTheme = () => {
      setTheme(getThemeFromHour(new Date().getHours()));
    };

    updateTheme();
    const intervalId = window.setInterval(updateTheme, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleKeyDown = () => {
      pulseRef.current = 1;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = 500;
      scrollRef.current = Math.min(window.scrollY / maxScroll, 1);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setThreats((previous) => {
        if (previous.length >= 8) return previous;

        const newThreat: Threat = {
          id: threatIdRef.current,
          angle: Math.random() * Math.PI * 2,
          radius: 2.35 + Math.random() * 0.65,
          y: -1 + Math.random() * 2,
          speed: 0.45 + Math.random() * 0.75,
          type: THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)],
        };

        threatIdRef.current += 1;
        return [...previous, newThreat];
      });
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const detectEnvironment = () => {
      const mobileByWidth = window.innerWidth < 768;
      const mobileByUserAgent =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      setIsMobile(mobileByWidth || mobileByUserAgent);
      setPrefersReducedMotion(mediaQuery.matches);

      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        setHasWebGL(Boolean(gl));
      } catch {
        setHasWebGL(false);
      }
    };

    detectEnvironment();

    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    window.addEventListener("resize", detectEnvironment);
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      window.removeEventListener("resize", detectEnvironment);
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  const handleThreatClick = useCallback((id: number) => {
    setThreats((previous) => previous.filter((threat) => threat.id !== id));
    setScore((previous) => previous + 100);
  }, []);

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || prefersReducedMotion) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  };

  if (isMobile || !hasWebGL || prefersReducedMotion) {
    return <MobileFallback />;
  }

  return (
    <div ref={containerRef} className="relative h-full w-full" onMouseMove={handleMouseMove}>
      <div className="absolute right-2 top-2 z-10 rounded-lg border border-accent-green/30 bg-bg-1/80 px-3 py-1 backdrop-blur-sm">
        <p className="font-mono text-xs text-text-2">THREATS NEUTRALIZED</p>
        <p className="font-mono text-lg text-accent-green">{score}</p>
      </div>

      {threats.length > 0 && (
        <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-accent-red/30 bg-bg-1/80 px-3 py-1 backdrop-blur-sm">
          <p className="animate-pulse font-mono text-xs text-accent-red">Click red threats to neutralize</p>
        </div>
      )}

      <Suspense fallback={<MobileFallback />}>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <Scene
            mouseRef={mouseRef}
            scrollRef={scrollRef}
            pulseRef={pulseRef}
            theme={theme}
            threats={threats}
            onThreatClick={handleThreatClick}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}

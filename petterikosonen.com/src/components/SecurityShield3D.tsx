"use client";

import { useRef, useMemo, Suspense, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles, Text } from "@react-three/drei";
import * as THREE from "three";

// Live data strings that "fly" around the shield
const dataStrings = [
  "0x7f3a", "AUTH_OK", "SHA256", "TLS1.3", "AES256", "RSA4096",
  "VERIFY", "ENCRYPT", "SECURE", "VALID", "HASH", "SIGN",
  "192.168", "10.0.0", "CERT_OK", "JWT", "OAUTH", "MFA",
];

// Threat types for the mini-game
const threatTypes = ["MALWARE", "PHISH", "SQLI", "XSS", "DDOS"];

interface Threat {
  id: number;
  position: [number, number, number];
  type: string;
  speed: number;
}

function FloatingData({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const dataParticles = useMemo(() => {
    return dataStrings.map((str, i) => ({
      text: str,
      radius: 2.5 + Math.random() * 1.5,
      speed: 0.3 + Math.random() * 0.4,
      offset: (i / dataStrings.length) * Math.PI * 2,
      y: (Math.random() - 0.5) * 3,
    }));
  }, []);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    
    groupRef.current.children.forEach((child, i) => {
      const particle = dataParticles[i];
      const angle = time * particle.speed + particle.offset;
      child.position.x = Math.cos(angle) * particle.radius;
      child.position.z = Math.sin(angle) * particle.radius;
      child.position.y = particle.y + Math.sin(time * 0.5 + particle.offset) * 0.3;
      child.lookAt(0, child.position.y, 0);
    });
  });
  
  return (
    <group ref={groupRef}>
      {dataParticles.map((particle, i) => (
        <Text
          key={i}
          fontSize={0.15}
          color="#22d3ee"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.6 + Math.random() * 0.4}
        >
          {particle.text}
        </Text>
      ))}
    </group>
  );
}

function Shield({ 
  mousePosition, 
  scrollProgress, 
  keyPulse,
  isDayMode,
  threats,
  onThreatClick,
}: { 
  mousePosition: { x: number; y: number };
  scrollProgress: number;
  keyPulse: number;
  isDayMode: boolean;
  threats: Threat[];
  onThreatClick: (id: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const shieldRef = useRef<THREE.Group>(null);
  
  // Colors based on day/night mode
  const cyanColor = isDayMode ? "#0ea5e9" : "#22d3ee";
  const greenColor = isDayMode ? "#22c55e" : "#39ff88";
  const violetColor = isDayMode ? "#8b5cf6" : "#7c8cff";
  
  // Pulse effect from key presses
  const pulseScale = 1 + keyPulse * 0.1;
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        mousePosition.y * 0.3,
        0.05
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        mousePosition.x * 0.3,
        0.05
      );
    }
    
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.005;
    }
    
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= 0.008;
    }
    
    // Scroll-based shield "opening" effect
    if (shieldRef.current) {
      const openAmount = Math.min(scrollProgress * 2, 1);
      shieldRef.current.scale.setScalar(1 - openAmount * 0.3);
      shieldRef.current.rotation.y = openAmount * Math.PI * 0.5;
    }
  });

  return (
    <group ref={meshRef} scale={pulseScale}>
      <group ref={shieldRef}>
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh>
            <icosahedronGeometry args={[1.2, 1]} />
            <MeshDistortMaterial
              color={cyanColor}
              attach="material"
              distort={0.3 + keyPulse * 0.2}
              speed={2}
              roughness={isDayMode ? 0.4 : 0.2}
              metalness={0.8}
              transparent
              opacity={0.9}
            />
          </mesh>
        </Float>
      </group>
      
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2, 0.04, 16, 100]} />
        <meshStandardMaterial 
          color={greenColor} 
          emissive={greenColor} 
          emissiveIntensity={isDayMode ? 0.3 : 0.5} 
        />
      </mesh>
      
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
        <torusGeometry args={[1.6, 0.03, 16, 80]} />
        <meshStandardMaterial 
          color={violetColor} 
          emissive={violetColor} 
          emissiveIntensity={isDayMode ? 0.2 : 0.4} 
        />
      </mesh>
      
      <mesh>
        <icosahedronGeometry args={[2.3, 1]} />
        <meshBasicMaterial color={cyanColor} wireframe transparent opacity={0.15} />
      </mesh>
      
      <Sparkles count={50} scale={5} size={2} speed={0.4} color={greenColor} />
      
      {/* Threat spheres */}
      {threats.map((threat) => (
        <mesh
          key={threat.id}
          position={threat.position}
          onClick={(e) => {
            e.stopPropagation();
            onThreatClick(threat.id);
          }}
        >
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial 
            color="#ef4444" 
            emissive="#ef4444" 
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

function DataParticles({ scrollProgress }: { scrollProgress: number }) {
  const count = 100;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 2;
      
      temp.push({
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ],
        speed: 0.2 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return temp;
  }, []);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const matrix = new THREE.Matrix4();
    
    particles.forEach((particle, i) => {
      const [x, y, z] = particle.position;
      const scale = 0.03 + Math.sin(time * particle.speed + particle.offset) * 0.015;
      
      // Scroll effect: particles spread out
      const spreadFactor = 1 + scrollProgress * 0.5;
      
      matrix.setPosition(
        (x + Math.sin(time * 0.5 + particle.offset) * 0.2) * spreadFactor,
        (y + Math.cos(time * 0.3 + particle.offset) * 0.2) * spreadFactor,
        (z + Math.sin(time * 0.4 + particle.offset) * 0.2) * spreadFactor
      );
      matrix.scale(new THREE.Vector3(scale, scale, scale));
      
      meshRef.current!.setMatrixAt(i, matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} />
    </instancedMesh>
  );
}

function Scene({ 
  mousePosition, 
  scrollProgress, 
  keyPulse,
  isDayMode,
  threats,
  onThreatClick,
}: { 
  mousePosition: { x: number; y: number };
  scrollProgress: number;
  keyPulse: number;
  isDayMode: boolean;
  threats: Threat[];
  onThreatClick: (id: number) => void;
}) {
  const ambientIntensity = isDayMode ? 0.4 : 0.2;
  
  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <pointLight position={[10, 10, 10]} intensity={isDayMode ? 0.8 : 1} color="#22d3ee" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7c8cff" />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#39ff88" />
      
      <Shield 
        mousePosition={mousePosition} 
        scrollProgress={scrollProgress}
        keyPulse={keyPulse}
        isDayMode={isDayMode}
        threats={threats}
        onThreatClick={onThreatClick}
      />
      <DataParticles scrollProgress={scrollProgress} />
      <FloatingData scrollProgress={scrollProgress} />
    </>
  );
}

// CSS-based animated fallback for mobile/no-WebGL
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
      
      <div className="absolute h-4 w-4 animate-[float_3s_ease-in-out_infinite] rounded-full bg-accent-cyan/30" style={{ top: '20%', left: '25%' }} />
      <div className="absolute h-3 w-3 animate-[float_4s_ease-in-out_infinite_0.5s] rounded-full bg-accent-green/30" style={{ top: '30%', right: '20%' }} />
      <div className="absolute h-2 w-2 animate-[float_3.5s_ease-in-out_infinite_1s] rounded-full bg-accent-violet/30" style={{ bottom: '25%', left: '30%' }} />
      <div className="absolute h-3 w-3 animate-[float_4.5s_ease-in-out_infinite_1.5s] rounded-full bg-accent-cyan/30" style={{ bottom: '30%', right: '25%' }} />
    </div>
  );
}

export default function SecurityShield3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [keyPulse, setKeyPulse] = useState(0);
  const [isDayMode, setIsDayMode] = useState(false);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const threatIdRef = useRef(0);
  
  // Day/night mode based on time
  useEffect(() => {
    const hour = new Date().getHours();
    setIsDayMode(hour >= 7 && hour < 19);
  }, []);
  
  // Keyboard listener for pulse effect
  useEffect(() => {
    const handleKeyDown = () => {
      setKeyPulse(1);
      setTimeout(() => setKeyPulse(0), 150);
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = 500;
      setScrollProgress(Math.min(scrollY / maxScroll, 1));
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Spawn threats periodically
  useEffect(() => {
    const spawnThreat = () => {
      if (threats.length >= 5) return;
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 2.5;
      
      const newThreat: Threat = {
        id: threatIdRef.current++,
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.5,
          r * Math.cos(phi),
        ],
        type: threatTypes[Math.floor(Math.random() * threatTypes.length)],
        speed: 0.5 + Math.random() * 0.5,
      };
      
      setThreats((prev) => [...prev, newThreat]);
      setShowScore(true);
    };
    
    const interval = setInterval(spawnThreat, 3000);
    return () => clearInterval(interval);
  }, [threats.length]);
  
  const handleThreatClick = useCallback((id: number) => {
    setThreats((prev) => prev.filter((t) => t.id !== id));
    setScore((prev) => prev + 100);
  }, []);
  
  useEffect(() => {
    const checkMobile = window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
    
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setHasWebGL(!!gl);
    } catch {
      setHasWebGL(false);
    }
  }, []);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || prefersReducedMotion) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    mousePosition.current = { x, y };
  };
  
  if (isMobile || !hasWebGL || prefersReducedMotion) {
    return <MobileFallback />;
  }
  
  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full"
      onMouseMove={handleMouseMove}
    >
      {/* Score display */}
      {showScore && (
        <div className="absolute right-2 top-2 z-10 rounded-lg border border-accent-green/30 bg-bg-1/80 px-3 py-1 backdrop-blur-sm">
          <p className="font-mono text-xs text-text-2">THREATS NEUTRALIZED</p>
          <p className="font-mono text-lg text-accent-green">{score}</p>
        </div>
      )}
      
      {/* Hint */}
      {threats.length > 0 && (
        <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-accent-red/30 bg-bg-1/80 px-3 py-1 backdrop-blur-sm">
          <p className="font-mono text-xs text-accent-red animate-pulse">
            Click red threats to neutralize!
          </p>
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
            mousePosition={mousePosition.current}
            scrollProgress={scrollProgress}
            keyPulse={keyPulse}
            isDayMode={isDayMode}
            threats={threats}
            onThreatClick={handleThreatClick}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}

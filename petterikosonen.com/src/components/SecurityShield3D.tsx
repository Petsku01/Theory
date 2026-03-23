"use client";

import { useRef, useMemo, Suspense, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function Shield({ mousePosition }: { mousePosition: { x: number; y: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
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
  });

  return (
    <group ref={meshRef}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh>
          <icosahedronGeometry args={[1.2, 1]} />
          <MeshDistortMaterial
            color="#22d3ee"
            attach="material"
            distort={0.3}
            speed={2}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>
      
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2, 0.04, 16, 100]} />
        <meshStandardMaterial color="#39ff88" emissive="#39ff88" emissiveIntensity={0.5} />
      </mesh>
      
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
        <torusGeometry args={[1.6, 0.03, 16, 80]} />
        <meshStandardMaterial color="#7c8cff" emissive="#7c8cff" emissiveIntensity={0.4} />
      </mesh>
      
      <mesh>
        <icosahedronGeometry args={[2.3, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.15} />
      </mesh>
      
      <Sparkles count={50} scale={5} size={2} speed={0.4} color="#39ff88" />
    </group>
  );
}

function DataParticles() {
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
      
      matrix.setPosition(
        x + Math.sin(time * 0.5 + particle.offset) * 0.2,
        y + Math.cos(time * 0.3 + particle.offset) * 0.2,
        z + Math.sin(time * 0.4 + particle.offset) * 0.2
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

function Scene({ mousePosition }: { mousePosition: { x: number; y: number } }) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#22d3ee" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7c8cff" />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#39ff88" />
      
      <Shield mousePosition={mousePosition} />
      <DataParticles />
    </>
  );
}

// CSS-based animated fallback for mobile/no-WebGL
function MobileFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Outer pulsing ring */}
      <div className="absolute h-48 w-48 animate-pulse rounded-full border border-accent-cyan/20" />
      
      {/* Middle rotating ring */}
      <div className="absolute h-40 w-40 animate-[spin_8s_linear_infinite] rounded-full border-2 border-dashed border-accent-green/40" />
      
      {/* Inner rotating ring (opposite direction) */}
      <div className="absolute h-32 w-32 animate-[spin_6s_linear_infinite_reverse] rounded-full border border-accent-violet/40" />
      
      {/* Core shield */}
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-accent-cyan/30 to-accent-violet/30 blur-sm" />
        <div className="absolute inset-2 rounded-full border border-accent-cyan/50 bg-bg-1/80 backdrop-blur-sm" />
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-green/20" />
        
        {/* Shield icon */}
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
      
      {/* Floating particles */}
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
  
  useEffect(() => {
    // Check for mobile
    const checkMobile = window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
    
    // Check for reduced motion preference
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    
    // Check WebGL support
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
  
  // Use CSS fallback for mobile, no WebGL, or reduced motion
  if (isMobile || !hasWebGL || prefersReducedMotion) {
    return <MobileFallback />;
  }
  
  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full"
      onMouseMove={handleMouseMove}
    >
      <Suspense fallback={<MobileFallback />}>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <Scene mousePosition={mousePosition.current} />
        </Canvas>
      </Suspense>
    </div>
  );
}

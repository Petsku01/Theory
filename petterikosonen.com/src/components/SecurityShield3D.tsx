"use client";

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function Shield({ mousePosition }: { mousePosition: { x: number; y: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Smooth follow mouse
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
      {/* Main shield/core */}
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
      
      {/* Outer rotating ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2, 0.04, 16, 100]} />
        <meshStandardMaterial color="#39ff88" emissive="#39ff88" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Inner rotating ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
        <torusGeometry args={[1.6, 0.03, 16, 80]} />
        <meshStandardMaterial color="#7c8cff" emissive="#7c8cff" emissiveIntensity={0.4} />
      </mesh>
      
      {/* Wireframe outer sphere */}
      <mesh>
        <icosahedronGeometry args={[2.3, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.15} />
      </mesh>
      
      {/* Sparkles */}
      <Sparkles
        count={50}
        scale={5}
        size={2}
        speed={0.4}
        color="#39ff88"
      />
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

function FallbackLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-16 w-16 animate-pulse rounded-full border-2 border-accent-cyan/50 bg-accent-cyan/10" />
    </div>
  );
}

export default function SecurityShield3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const prefersReducedMotion = typeof window !== "undefined" 
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches 
    : false;
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || prefersReducedMotion) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    mousePosition.current = { x, y };
  };
  
  if (prefersReducedMotion) {
    return (
      <div className="relative h-full w-full flex items-center justify-center">
        <div className="h-32 w-32 rounded-full border-2 border-accent-cyan/50 bg-accent-cyan/10 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border border-accent-green/50 bg-accent-green/10" />
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full"
      onMouseMove={handleMouseMove}
    >
      <Suspense fallback={<FallbackLoader />}>
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

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Float, Sparkles } from "@react-three/drei";
import type { AmbientLight, Group, Mesh, Points } from "three";
import { AdditiveBlending, Color } from "three";
import type { MeshPhysicalMaterial, MeshStandardMaterial } from "three";

function DataParticles() {
  const pointsRef = useRef<Points | null>(null);
  const positions = useMemo(() => {
    const count = 280;
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 3.5 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      data[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      data[i * 3 + 1] = radius * Math.cos(phi) * 0.8;
      data[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return data;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.05;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.12;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#67e8f9"
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.7}
        blending={AdditiveBlending}
      />
    </points>
  );
}

function RotatingIcosahedron() {
  const mainRef = useRef<Mesh | null>(null);
  const innerRef = useRef<Mesh | null>(null);
  const wireRef = useRef<Mesh | null>(null);
  const outerWireRef = useRef<Mesh | null>(null);
  const groupRef = useRef<Group | null>(null);
  const ambientRef = useRef<AmbientLight | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const cyan = useMemo(() => new Color("#22d3ee"), []);
  const purple = useMemo(() => new Color("#a78bfa"), []);
  const green = useMemo(() => new Color("#34d399"), []);
  const pink = useMemo(() => new Color("#f472b6"), []);
  const orange = useMemo(() => new Color("#fb923c"), []);
  const shiftColor = useMemo(() => new Color("#22d3ee"), []);
  const mainColor = useMemo(() => new Color("#22d3ee"), []);
  const emissiveColor = useMemo(() => new Color("#22d3ee"), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const hoverBoost = isHovered ? 1.4 : 1;

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.25;
      groupRef.current.position.x += (state.pointer.x * 0.35 - groupRef.current.position.x) * 0.06;
      groupRef.current.position.z += (-state.pointer.y * 0.3 - groupRef.current.position.z) * 0.06;
    }

    if (mainRef.current) {
      mainRef.current.rotation.x += delta * 0.25;
      mainRef.current.rotation.y += delta * 0.4;
      mainRef.current.rotation.z = Math.sin(t * 0.5) * 0.1;

      const colorPhase = ((t * 0.12) % 1);
      if (colorPhase < 0.2) {
        mainColor.copy(cyan).lerp(purple, colorPhase * 5);
      } else if (colorPhase < 0.4) {
        mainColor.copy(purple).lerp(pink, (colorPhase - 0.2) * 5);
      } else if (colorPhase < 0.6) {
        mainColor.copy(pink).lerp(orange, (colorPhase - 0.4) * 5);
      } else if (colorPhase < 0.8) {
        mainColor.copy(orange).lerp(green, (colorPhase - 0.6) * 5);
      } else {
        mainColor.copy(green).lerp(cyan, (colorPhase - 0.8) * 5);
      }
      emissiveColor.copy(mainColor).multiplyScalar(0.6);

      const mat = mainRef.current.material as MeshPhysicalMaterial;
      if (mat && "color" in mat) {
        mat.color.copy(mainColor);
        mat.emissive.copy(emissiveColor);
        mat.attenuationColor?.copy(mainColor);
      }
    }

    if (innerRef.current) {
      innerRef.current.rotation.x -= delta * 0.35;
      innerRef.current.rotation.y -= delta * 0.2;
      const innerMat = innerRef.current.material as MeshStandardMaterial;
      if (innerMat) {
        innerMat.emissiveIntensity = (1.8 + Math.sin(t * 2) * 0.6) * hoverBoost;
      }
    }

    if (wireRef.current && mainRef.current) {
      wireRef.current.rotation.copy(mainRef.current.rotation);
      const wireMat = wireRef.current.material as MeshPhysicalMaterial;
      if (wireMat) {
        wireMat.emissiveIntensity = (1.3 + Math.sin(t * 2.5) * 0.5) * hoverBoost;
      }
    }

    if (outerWireRef.current) {
      outerWireRef.current.rotation.x += delta * 0.08;
      outerWireRef.current.rotation.y -= delta * 0.12;
    }

    if (ambientRef.current) {
      const phase = (Math.sin(t * 0.35) + 1) / 2;
      if (phase < 0.5) {
        shiftColor.copy(cyan).lerp(purple, phase * 2);
      } else {
        shiftColor.copy(purple).lerp(green, (phase - 0.5) * 2);
      }
      ambientRef.current.color.copy(shiftColor);
      ambientRef.current.intensity = 0.5 + Math.sin(t * 0.6) * 0.1;
    }
  });

  return (
    <Center>
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.5}>
        <group ref={groupRef}>
          <ambientLight ref={ambientRef} intensity={0.5} color="#22d3ee" />
          <pointLight position={[0, 0, 4]} intensity={2.5} color="#67e8f9" />
          <pointLight position={[0, 0, -4]} intensity={1.8} color="#8b5cf6" />
          <pointLight position={[3, 2, 2]} intensity={2.2} color="#34d399" />
          <pointLight position={[-3, -2, 2]} intensity={2.0} color="#f472b6" />

          <mesh
            ref={mainRef}
            onPointerOver={() => setIsHovered(true)}
            onPointerOut={() => setIsHovered(false)}
          >
            <icosahedronGeometry args={[1.6, 0]} />
            <meshPhysicalMaterial
              color="#22d3ee"
              transparent
              opacity={0.8}
              roughness={0.03}
              metalness={0.15}
              clearcoat={1}
              clearcoatRoughness={0.05}
              transmission={0.95}
              thickness={1.5}
              ior={2.4}
              attenuationDistance={0.8}
              attenuationColor="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={0.25}
              reflectivity={1}
            />
          </mesh>

          <mesh ref={innerRef} scale={0.5}>
            <icosahedronGeometry args={[1.6, 0]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#22d3ee"
              emissiveIntensity={1.8}
              transparent
              opacity={0.4}
              blending={AdditiveBlending}
            />
          </mesh>

          <mesh ref={wireRef} scale={1.08}>
            <icosahedronGeometry args={[1.6, 0]} />
            <meshPhysicalMaterial
              color="#e0f7ff"
              emissive="#7dd3fc"
              emissiveIntensity={1.3}
              metalness={1}
              roughness={0.1}
              clearcoat={1}
              iridescence={1}
              iridescenceIOR={1.5}
              iridescenceThicknessRange={[100, 400]}
              transparent
              opacity={0.5}
              wireframe
            />
          </mesh>

          <mesh ref={outerWireRef} scale={1.8}>
            <icosahedronGeometry args={[1.6, 1]} />
            <meshBasicMaterial
              color="#a78bfa"
              transparent
              opacity={0.15}
              wireframe
            />
          </mesh>

          <Sparkles count={90} size={3.5} scale={[5, 5, 5]} speed={0.3} noise={0.9} color="#67e8f9" />
          <Sparkles count={150} size={2} scale={[7, 5, 7]} speed={0.2} noise={1.2} color="#a78bfa" opacity={0.5} />
          <Sparkles count={180} size={1.3} scale={[9, 6, 9]} speed={0.1} noise={1.6} color="#bbf7d0" opacity={0.25} />
          
          <DataParticles />
        </group>
      </Float>
    </Center>
  );
}

function MobileFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="relative h-28 w-28 sm:h-32 sm:w-32">
        <div className="absolute inset-0 animate-pulse rounded-full border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-500/20 to-purple-500/20" />
        <div className="absolute inset-3 animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-emerald-400/40" />
        <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-cyan-400/30 to-pink-400/30 shadow-[0_0_40px_rgba(34,211,238,0.4)]" />
      </div>
    </div>
  );
}

export default function SecurityShield3D() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateDeviceType = () => setIsMobile(mediaQuery.matches);
    updateDeviceType();
    
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateDeviceType);
    } else {
      mediaQuery.addListener(updateDeviceType);
    }
    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updateDeviceType);
      } else {
        mediaQuery.removeListener(updateDeviceType);
      }
    };
  }, []);

  if (isMobile) {
    return <MobileFallback />;
  }

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#020617"]} />
          <fog attach="fog" args={["#020617", 9, 18]} />
          <ambientLight intensity={0.3} color="#0ea5e9" />
          <directionalLight position={[5, 5, 5]} intensity={1} color="#22d3ee" />
          <directionalLight position={[-5, 3, 3]} intensity={1.3} color="#8b5cf6" />
          <pointLight position={[0, 0, 8]} intensity={1.5} color="#67e8f9" />
          <RotatingIcosahedron />
        </Suspense>
      </Canvas>
    </div>
  );
}

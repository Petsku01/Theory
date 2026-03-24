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
    const count = 220;
    const data = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = 3.2 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      data[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      data[i * 3 + 1] = radius * Math.cos(phi) * 0.75;
      data[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    return data;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) {
      return;
    }

    pointsRef.current.rotation.y += delta * 0.07;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#67e8f9"
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.68}
        blending={AdditiveBlending}
      />
    </points>
  );
}

function RotatingCube() {
  const cubeRef = useRef<Mesh | null>(null);
  const edgeRef = useRef<Mesh | null>(null);
  const glowRef = useRef<Mesh | null>(null);
  const groupRef = useRef<Group | null>(null);
  const ambientRef = useRef<AmbientLight | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const cyan = useMemo(() => new Color("#22d3ee"), []);
  const purple = useMemo(() => new Color("#a78bfa"), []);
  const green = useMemo(() => new Color("#34d399"), []);
  const pink = useMemo(() => new Color("#f472b6"), []);
  const orange = useMemo(() => new Color("#fb923c"), []);
  const shiftColor = useMemo(() => new Color("#22d3ee"), []);
  const cubeColor = useMemo(() => new Color("#22d3ee"), []);
  const emissiveColor = useMemo(() => new Color("#22d3ee"), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const hoverBoost = isHovered ? 1.35 : 1;

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.95) * 0.2;
      groupRef.current.position.x += (state.pointer.x * 0.3 - groupRef.current.position.x) * 0.08;
      groupRef.current.position.z += (-state.pointer.y * 0.25 - groupRef.current.position.z) * 0.08;
      groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.12;
    }

    if (cubeRef.current) {
      cubeRef.current.rotation.x += delta * (0.35 + Math.sin(t * 0.55) * 0.02);
      cubeRef.current.rotation.y += delta * 0.9;
      cubeRef.current.rotation.z = Math.sin(t * 0.8) * 0.09;
      
      // Color cycling: cyan → purple → pink → orange → green → cyan
      const colorPhase = ((t * 0.15) % 1);
      if (colorPhase < 0.2) {
        cubeColor.copy(cyan).lerp(purple, colorPhase * 5);
      } else if (colorPhase < 0.4) {
        cubeColor.copy(purple).lerp(pink, (colorPhase - 0.2) * 5);
      } else if (colorPhase < 0.6) {
        cubeColor.copy(pink).lerp(orange, (colorPhase - 0.4) * 5);
      } else if (colorPhase < 0.8) {
        cubeColor.copy(orange).lerp(green, (colorPhase - 0.6) * 5);
      } else {
        cubeColor.copy(green).lerp(cyan, (colorPhase - 0.8) * 5);
      }
      
      emissiveColor.copy(cubeColor).multiplyScalar(0.7);
      
      const cubeMat = cubeRef.current.material as MeshPhysicalMaterial;
      if (cubeMat && 'color' in cubeMat) {
        cubeMat.color.copy(cubeColor);
        cubeMat.emissive.copy(emissiveColor);
        cubeMat.attenuationColor.copy(cubeColor);
      }
    }

    if (edgeRef.current) {
      edgeRef.current.rotation.x = cubeRef.current?.rotation.x ?? 0;
      edgeRef.current.rotation.y = cubeRef.current?.rotation.y ?? 0;
      edgeRef.current.rotation.z = cubeRef.current?.rotation.z ?? 0;
      const edgeMaterial = edgeRef.current.material;
      if (!Array.isArray(edgeMaterial) && "emissiveIntensity" in edgeMaterial) {
        (
          edgeMaterial as MeshStandardMaterial | MeshPhysicalMaterial
        ).emissiveIntensity = (1.2 + Math.sin(t * 2.2) * 0.4) * hoverBoost;
      }
    }

    if (glowRef.current) {
      glowRef.current.rotation.x = cubeRef.current?.rotation.x ?? 0;
      glowRef.current.rotation.y = cubeRef.current?.rotation.y ?? 0;
      glowRef.current.rotation.z = cubeRef.current?.rotation.z ?? 0;
      const glowMaterial = glowRef.current.material;
      if (!Array.isArray(glowMaterial) && "emissiveIntensity" in glowMaterial) {
        (
          glowMaterial as MeshStandardMaterial | MeshPhysicalMaterial
        ).emissiveIntensity = (1.55 + Math.sin(t * 2.2) * 0.55) * hoverBoost;
        glowMaterial.opacity = 0.22 + (isHovered ? 0.08 : 0) + Math.sin(t * 2.2) * 0.05;
      }
    }

    if (ambientRef.current) {
      const phase = (Math.sin(t * 0.45) + 1) / 2;
      if (phase < 0.5) {
        shiftColor.copy(cyan).lerp(purple, phase * 2);
      } else {
        shiftColor.copy(purple).lerp(green, (phase - 0.5) * 2);
      }

      ambientRef.current.color.copy(shiftColor);
      ambientRef.current.intensity = 0.45 + Math.sin(t * 0.8) * 0.08;
    }
  });

  return (
    <Center>
      <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.4}>
        <group ref={groupRef}>
          <ambientLight ref={ambientRef} intensity={0.48} color="#22d3ee" />
          <pointLight position={[0, 0, 3.5]} intensity={2.2} color="#67e8f9" />
          <pointLight position={[0, 0, -3.5]} intensity={1.45} color="#8b5cf6" />
          <pointLight position={[2.8, 1.2, 1.4]} intensity={1.95} color="#34d399" />
          <pointLight position={[-2.8, -1.2, 1.8]} intensity={2.25} color="#a78bfa" />

          <mesh
            ref={cubeRef}
            onPointerOver={() => setIsHovered(true)}
            onPointerOut={() => setIsHovered(false)}
          >
            <boxGeometry args={[2, 2, 2]} />
            <meshPhysicalMaterial
              color="#9befff"
              transparent
              opacity={0.75}
              roughness={0.05}
              metalness={0.12}
              clearcoat={1}
              clearcoatRoughness={0.06}
              transmission={1}
              thickness={1.1}
              ior={1.33}
              attenuationDistance={1.2}
              attenuationColor="#4fdbff"
              emissive="#40f6ff"
              emissiveIntensity={0.2}
              reflectivity={1}
            />
          </mesh>

          <mesh ref={glowRef} scale={0.82}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#22d3ee"
              emissiveIntensity={1.55}
              transparent
              opacity={0.22}
              blending={AdditiveBlending}
            />
          </mesh>

          <mesh ref={edgeRef} scale={1.03}>
            <boxGeometry args={[2, 2, 2]} />
            <meshPhysicalMaterial
              color="#d1f8ff"
              emissive="#7dd3fc"
              emissiveIntensity={1.2}
              metalness={1}
              roughness={0.12}
              clearcoat={1}
              clearcoatRoughness={0.1}
              iridescence={1}
              iridescenceIOR={1.2}
              iridescenceThicknessRange={[120, 420]}
              transparent
              opacity={0.42}
              wireframe
            />
          </mesh>

          <Sparkles
            count={72}
            size={3}
            scale={[4.2, 4.2, 4.2]}
            speed={0.35}
            noise={0.8}
            color="#67e8f9"
          />
          <Sparkles
            count={120}
            size={2}
            scale={[6.5, 4.5, 6.5]}
            speed={0.22}
            noise={1.1}
            color="#a78bfa"
            opacity={0.45}
          />
          <Sparkles
            count={140}
            size={1.2}
            scale={[8.5, 5.5, 8.5]}
            speed={0.12}
            noise={1.5}
            color="#bbf7d0"
            opacity={0.2}
          />
          <DataParticles />
        </group>
      </Float>
    </Center>
  );
}

function MobileFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="relative h-28 w-28 [perspective:700px] sm:h-32 sm:w-32">
        <div className="absolute inset-0 rounded-md border border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_32px_rgba(34,211,238,0.35)]" />
        <div className="absolute inset-2 rounded-md border border-emerald-300/70 bg-emerald-300/10" />
      </div>
    </div>
  );
}

export default function SecurityShield3D() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const updateDeviceType = () => {
      setIsMobile(mediaQuery.matches);
    };

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
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#020617"]} />
          <fog attach="fog" args={["#020617", 8, 17]} />
          <ambientLight intensity={0.25} color="#0ea5e9" />
          <directionalLight position={[5, 5, 5]} intensity={0.95} color="#22d3ee" />
          <directionalLight position={[-5, 2, 3]} intensity={1.2} color="#8b5cf6" />
          <pointLight position={[0, 0, 7]} intensity={1.3} color="#67e8f9" />
          <RotatingCube />
        </Suspense>
      </Canvas>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import type { Mesh } from "three";

function RotatingCube() {
  const cubeRef = useRef<Mesh | null>(null);
  const outlineRef = useRef<Mesh | null>(null);

  useFrame((_, delta) => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += delta * 0.45;
      cubeRef.current.rotation.y += delta * 0.75;
    }

    if (outlineRef.current) {
      outlineRef.current.rotation.x += delta * 0.45;
      outlineRef.current.rotation.y += delta * 0.75;
    }
  });

  return (
    <Center>
      <group>
        <mesh ref={cubeRef}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#34d399"
            emissiveIntensity={0.55}
            metalness={0.25}
            roughness={0.35}
          />
        </mesh>

        <mesh ref={outlineRef} scale={1.07}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial
            color="#6ee7b7"
            emissive="#22d3ee"
            emissiveIntensity={0.35}
            wireframe
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>
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
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <color attach="background" args={["#020617"]} />
          <ambientLight intensity={0.45} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} color="#22d3ee" />
          <pointLight position={[-4, -3, 4]} intensity={1} color="#34d399" />
          <RotatingCube />
        </Suspense>
      </Canvas>
    </div>
  );
}

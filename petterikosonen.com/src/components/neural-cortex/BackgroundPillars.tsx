"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

const CYAN = "#22D3EE";
const VIOLET = "#B47CFF";

type PillarSpec = {
  deg: number;
  radius: number;
  y: number;
  h: number;
  r: number;
  color: string;
};

// Background belt: r 14–20 (outside particle island ~12, inside sky-sphere), y -4..+3.
export const BACKGROUND_PILLARS: PillarSpec[] = [
  { deg: 28, radius: 15.5, y: -3.0, h: 12.0, r: 0.48, color: CYAN },
  { deg: 118, radius: 18.0, y: 1.2, h: 14.5, r: 0.55, color: VIOLET },
  { deg: 208, radius: 16.0, y: -2.0, h: 11.0, r: 0.42, color: CYAN },
  { deg: 298, radius: 19.5, y: 2.5, h: 15.5, r: 0.50, color: VIOLET },
];

export function BackgroundPillars() {
  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), []);
  const materials = useMemo(
    () =>
      BACKGROUND_PILLARS.map(
        (p) =>
          new THREE.MeshStandardMaterial({
            color: p.color,
            emissive: p.color,
            emissiveIntensity: 0.9,
            metalness: 0.05,
            roughness: 0.72,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            toneMapped: false,
            fog: false,
          }),
      ),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      for (const mat of materials) mat.dispose();
    };
  }, [geometry, materials]);

  return (
    <group>
      {BACKGROUND_PILLARS.map((p, i) => {
        const theta = (p.deg * Math.PI) / 180;
        return (
          <mesh
            key={`${p.color}-${p.deg}`}
            geometry={geometry}
            material={materials[i]}
            position={[
              p.radius * Math.cos(theta),
              p.y,
              p.radius * Math.sin(theta),
            ]}
            scale={[p.r, p.h, p.r]}
            renderOrder={-9}
            frustumCulled={false}
            raycast={() => null}
            castShadow={false}
            receiveShadow={false}
          />
        );
      })}
    </group>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clusterPositions, clusterSymbiosis, SPECIES_COLORS } from "@/lib/cortex-data";

const keys = Object.keys(clusterPositions);
const species = [0, 1, 2].map((i) => new THREE.Color(SPECIES_COLORS[i]));

// Each territory exchanges with its neighbours and the core: no all-to-all hairball.
export function SymbiosisThreads({ activeCluster, running }: { activeCluster: string | null; running: boolean }) {
  const group = useRef<THREE.Group>(null);
  const packets = useRef<THREE.Points>(null);
  const paths = useMemo(() => keys.flatMap((key, i) => {
    const destinations = i === 0 ? [] : ["core", keys[i === keys.length - 1 ? 1 : i + 1]];
    return destinations.map((destination, j) => {
      const a = new THREE.Vector3(...clusterPositions[key]);
      const b = new THREE.Vector3(...clusterPositions[destination]);
      const mid = a.clone().lerp(b, .5).add(new THREE.Vector3(0, 1.8 + j, (i % 2 ? 1 : -1) * 2));
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const points = curve.getPoints(48);
      return { key, destination, species: (i + j) % 3, curve, positions: new Float32Array(points.flatMap((p) => p.toArray())) };
    });
  }), []);
  const packetData = useMemo(() => ({ positions: new Float32Array(paths.length * 9), colors: new Float32Array(paths.length * 9), scratch: new THREE.Vector3(), mix: new THREE.Color() }), [paths]);
  useFrame(({ clock, gl }) => {
    if (!running || !group.current || !packets.current) return;
    const weights = clusterSymbiosis[activeCluster ?? "core"].speciesWeights;
    packetData.mix.setRGB(0, 0, 0);
    species.forEach((c, i) => { packetData.mix.r += c.r * weights[i]; packetData.mix.g += c.g * weights[i]; packetData.mix.b += c.b * weights[i]; });
    paths.forEach((path, i) => {
      const line = group.current!.children[i] as THREE.Line;
      const material = line.material as THREE.LineBasicMaterial;
      material.color.copy(species[path.species]).lerp(packetData.mix, .45);
      material.opacity = activeCluster === path.key || activeCluster === path.destination ? .65 : .18;
      for (let j = 0; j < 3; j++) {
        path.curve.getPoint((clock.elapsedTime * .065 + j / 3 + i * .11) % 1, packetData.scratch);
        packetData.scratch.toArray(packetData.positions, i * 9 + j * 3);
        material.color.toArray(packetData.colors, i * 9 + j * 3);
      }
    });
    packets.current.geometry.attributes.position.needsUpdate = true;
    packets.current.geometry.attributes.color.needsUpdate = true;
    gl.domElement.dataset.speciesMix = weights.join(",");
    gl.domElement.dataset.activation = activeCluster ?? "none";
  });
  return <>
    <group ref={group}>{paths.map((path, i) => <lineLoop key={i} raycast={() => null}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[path.positions, 3]} /></bufferGeometry>
      <lineBasicMaterial color={SPECIES_COLORS[path.species]} transparent opacity={.25} depthWrite={false} />
    </lineLoop>)}</group>
    <points ref={packets} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[packetData.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[packetData.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={.12} vertexColors transparent opacity={.9} depthWrite={false} />
    </points>
  </>;
}

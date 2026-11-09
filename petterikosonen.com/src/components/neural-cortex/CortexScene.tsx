"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { clusterPositions } from "@/lib/cortex-data";
import {
  CLUSTER_FLY_DIST,
  clusterFlyCameraOffset,
  KNOT_COLORS,
  type KnotId,
} from "@/components/neural-cortex/knotGauss";
import { CameraController } from "@/components/neural-cortex/CameraController";
import { GlyphLayer } from "@/components/neural-cortex/GlyphLayer";
import { MyceliumField } from "@/components/neural-cortex/MyceliumField";
import { useCortexInteraction } from "@/components/neural-cortex/CortexInteractionContext";

const FLY_MS = 1200;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type FlyState = {
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startOffset: THREE.Vector3;
  endOffset: THREE.Vector3;
  endCam: THREE.Vector3;
  t0: number;
};

// ── SYMBIOOSIS: Cursor = navigation, no traditional navbar ──
// Particles respond to cursor position via raycaster.
// Invisible click-target spheres handle cluster selection. Nothing is named on the field.

const CLUSTER_KEYS = ["core", "projects", "skills", "experience"] as const satisfies readonly KnotId[];

// ── Invisible click-target sphere for one cluster ──
function ClickTarget({
  clusterKey,
  position,
  color,
  isActive,
  onClick,
}: {
  clusterKey: string;
  position: [number, number, number];
  color: string;
  isActive: boolean;
  onClick: (key: string) => void;
}) {
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group position={position}>
      {/* Invisible click-target sphere — visible=false but still raycastable */}
      <mesh
        name={`click-target-${clusterKey}`}
        userData={{ clusterKey }}
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          onClick(clusterKey);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Subtle glow ring when active (no mesh sphere, just a faint ring) */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial
            color={colorObj}
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

export function CortexScene({
  activeCluster,
  onClusterSelect,
  shakeTimestamp,
  isMobile = false,
  reducedMotion = false,
  interactive = true,
}: {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  shakeTimestamp: number;
  isMobile?: boolean;
  reducedMotion?: boolean;
  interactive?: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const flyRef = useRef<FlyState | null>(null);
  const flyOff = useRef(new THREE.Vector3());
  const suspendLerpRef = useRef(false);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const { registerFlyTo } = useCortexInteraction();

  // Cluster center for camera target
  const targetPosition = useMemo(() => {
    if (!activeCluster) return null;
    const pos = clusterPositions[activeCluster];
    if (!pos) return null;
    return new THREE.Vector3(pos[0], pos[1], pos[2]);
  }, [activeCluster]);

  // flyTo(key): useFrame tween of camera + OrbitControls target to clusterPositions[key].
  // Camera sits CLUSTER_FLY_DIST inward on the same radial so the sky-knot is centered.
  // drei OrbitControls.update is gated by enabled=false; CameraController lerp by suspendLerpRef.
  // pointerdown on canvas interrupts. suspendLerp stays engaged after landing (WASM must not undo).
  useEffect(() => {
    const stopFly = () => {
      flyRef.current = null;
      suspendLerpRef.current = false;
      const c = controlsRef.current;
      if (c) {
        c.enabled = true;
        c.enableDamping = true;
      }
      gl.domElement.removeEventListener("pointerdown", stopFly);
    };

    const flyTo = (key: string) => {
      const pos = clusterPositions[key];
      const controls = controlsRef.current;
      if (!pos) return;
      if (!controls) {
        requestAnimationFrame(() => flyTo(key));
        return;
      }

      stopFly();
      suspendLerpRef.current = true;
      controls.autoRotate = false;
      controls.enabled = false;
      controls.enableDamping = false;

      const startTarget = controls.target.clone();
      const endTarget = new THREE.Vector3(pos[0], pos[1], pos[2]);
      const [ox, oy, oz] = clusterFlyCameraOffset(pos, CLUSTER_FLY_DIST);
      const endOffset = new THREE.Vector3(ox, oy, oz);
      const startOffset = camera.position.clone().sub(startTarget);
      if (startOffset.lengthSq() < 1e-6) startOffset.set(0, 2, CLUSTER_FLY_DIST);

      flyRef.current = {
        startTarget,
        endTarget,
        startOffset,
        endOffset,
        endCam: endTarget.clone().add(endOffset),
        t0: performance.now(),
      };
      gl.domElement.addEventListener("pointerdown", stopFly);
    };

    registerFlyTo(flyTo);
    return () => {
      stopFly();
      registerFlyTo(null);
    };
  }, [camera, gl, registerFlyTo]);

  // ClickTargets read clusterPositions only (same source as flyTo + knot az/el).
  const clickTargets = useMemo(() => {
    return CLUSTER_KEYS.map((key) => {
      const pos = clusterPositions[key] ?? [0, 0, 0];
      const color = KNOT_COLORS[key];
      return { key, position: pos as [number, number, number], color };
    });
  }, []);

  // Breathing cycle + flyTo tick (same R3F frame, after drei priority -1 skip when enabled=false).
  useFrame((state) => {
    const fly = flyRef.current;
    const controls = controlsRef.current;
    if (fly && controls) {
      const u = Math.min(1, (performance.now() - fly.t0) / FLY_MS);
      const e = easeInOutCubic(u);
      controls.target.lerpVectors(fly.startTarget, fly.endTarget, e);
      flyOff.current.copy(fly.startOffset).lerp(fly.endOffset, e);
      camera.position.copy(controls.target).add(flyOff.current);
      camera.lookAt(controls.target);
      if (u >= 1) {
        camera.position.copy(fly.endCam);
        camera.lookAt(fly.endTarget);
        controls.target.copy(fly.endTarget);
        controls.enableDamping = true;
        controls.enabled = true;
        flyRef.current = null;
        // suspendLerpRef stays true so CameraController WASM/JS cannot undo the landing.
      }
    }
    if (reducedMotion) return;
    if (groupRef.current) {
      const breath = 1.0 + Math.sin(state.clock.elapsedTime * 0.15) * 0.03;
      groupRef.current.scale.set(breath, breath, breath);
    }
  });

  useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  return (
    <>
      {/* Reduced-motion does not gate these — Canvas is swapped out upstream. */}
      <MyceliumField density={1.45} flow={1.35} mobile={isMobile} />

      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#00f0ff" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#22d3ee" />

      {interactive && (
        <group ref={groupRef}>
          {/* Invisible click-targets — spheres only */}
          {clickTargets.map((t) => (
            <ClickTarget
              key={t.key}
              clusterKey={t.key}
              position={t.position}
              color={t.color}
              isActive={activeCluster === t.key}
              onClick={(key) => {
                if (activeCluster === key) {
                  onClusterSelect(null);
                } else {
                  onClusterSelect(key);
                }
              }}
            />
          ))}
        </group>
      )}

      <CameraController
        target={targetPosition}
        controlsRef={controlsRef}
        shakeTimestamp={reducedMotion ? 0 : shakeTimestamp}
        suspendLerpRef={suspendLerpRef}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={25}
        enablePan={interactive}
        enableRotate={interactive}
        enableZoom={interactive}
        autoRotate={!activeCluster && !reducedMotion}
        autoRotateSpeed={0.3}
      />

      <GlyphLayer cellSize={isMobile ? 16 : 14} intensity={0.85} contrast={1.38} />
    </>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Camera controller with sinusoidal shake + user override ──
// When user manually interacts with OrbitControls (drag/scroll), auto-lerp stops.
// Auto-lerp resumes when a new target is selected (deselect + select).
export function CameraController({
  target,
  controlsRef,
  shakeTimestamp,
}: {
  target: THREE.Vector3 | null;
  controlsRef: React.RefObject<any>;
  shakeTimestamp: number;
}) {
  const shakeStartTime = useRef<number>(0);
  const shakeDirection = useRef<THREE.Vector3>(new THREE.Vector3());
  const isUserControlled = useRef(false);
  const isLerping = useRef(false);

  // Reset auto-lerp when target changes
  const targetKey = target
    ? `${target.x.toFixed(4)}_${target.y.toFixed(4)}_${target.z.toFixed(4)}`
    : "null";

  useEffect(() => {
    // New target selected -- allow lerp again
    isUserControlled.current = false;
    isLerping.current = true;

    const controls = controlsRef.current;
    if (!controls) return;

    const onStart = () => {
      // User started dragging or scrolling -- stop auto-lerp immediately
      isUserControlled.current = true;
      isLerping.current = false;
    };

    controls.addEventListener("start", onStart);
    return () => {
      controls.removeEventListener("start", onStart);
    };
  }, [targetKey, controlsRef]);

  useEffect(() => {
    if (shakeTimestamp > 0) {
      shakeStartTime.current = performance.now();
      shakeDirection.current
        .set(
          Math.random() - 0.5,
          Math.random() * 0.5 + 0.2,
          Math.random() - 0.5
        )
        .normalize();
    }
  }, [shakeTimestamp]);

  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Lerp toward target only when actively lerping (not user-controlled)
    if (target && isLerping.current) {
      const cameraOffset = new THREE.Vector3(0, 2, 4);
      const desiredPos = target.clone().add(cameraOffset);
      controls.object.position.lerp(desiredPos, delta * 1.2);
      controls.target.lerp(target, delta * 1.5);

      // Check if we've arrived close enough -- stop lerping
      const dist = controls.object.position.distanceTo(desiredPos);
      if (dist < 0.3) {
        isLerping.current = false;
      }
    }

    const elapsed = (performance.now() - shakeStartTime.current) / 1000;
    const frequency = 30;
    const decay = 10;
    const amplitude = 0.03;
    const duration = 0.3;

    if (elapsed < duration) {
      const magnitude =
        amplitude * Math.sin(frequency * elapsed) * Math.exp(-decay * elapsed);
      const offset = shakeDirection.current.clone().multiplyScalar(magnitude);
      controls.object.position.add(offset);
    }

    controls.update();
  });

  return null;
}
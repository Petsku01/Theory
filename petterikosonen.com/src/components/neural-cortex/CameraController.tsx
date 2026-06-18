"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
} from "@/components/neural-cortex/utils";

// ── Camera controller with WASM lerp + shake, JS fallback ──
// WASM computes desired camera position + target. OrbitControls handles user input.
// When user interacts (zoom/pan/rotate), WASM lerp is suspended until target changes.
export function CameraController({
  target,
  controlsRef,
  shakeTimestamp,
}: {
  target: THREE.Vector3 | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  shakeTimestamp: number;
}) {
  // Shared state
  const shakeStartTime = useRef<number>(0);
  const shakeDirection = useRef<THREE.Vector3>(new THREE.Vector3());
  const isUserControlled = useRef(false);
  const isLerping = useRef(false);
  const cameraOffset = useRef(new THREE.Vector3(0, 2, 4));
  const desiredPos = useRef(new THREE.Vector3());

  // WASM state
  const camPtr = useRef<number>(0);
  const [, setWasmReadyFlag] = useState(false);

  // Initialize WASM camera system when WASM is ready
  useEffect(() => {
    if (!isCortexWasmReady() || !getCortexWasm()) {
      if (!isCortexWasmReady()) {
        ensureCortexWasm().then((ok) => {
          if (ok) setWasmReadyFlag(true);
        });
      }
      return;
    }

    const wasm = getCortexWasm()!;
    camPtr.current = wasm.camerasystem_new();

    // Sync current camera state into WASM to prevent snapping
    const controls = controlsRef.current;
    if (controls) {
      const camPos = controls.object.position;
      const tgt = controls.target;
      wasm.camerasystem_set_position(
        camPtr.current, camPos.x, camPos.y, camPos.z,
        tgt.x, tgt.y, tgt.z
      );
      if (target) {
        wasm.camerasystem_set_target(camPtr.current, target.x, target.y, target.z);
      }
    }

    return () => {
      if (camPtr.current && getCortexWasm()) {
        try { getCortexWasm()!.__wbg_camerasystem_free(camPtr.current, 0); } catch {}
        camPtr.current = 0;
      }
    };
  }, [controlsRef]);

  // Reset auto-lerp when target changes
  const targetKey = target
    ? `${target.x.toFixed(4)}_${target.y.toFixed(4)}_${target.z.toFixed(4)}`
    : "null";

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const wasm = getCortexWasm();
    if (wasm && camPtr.current) {
      if (target) {
        wasm.camerasystem_set_target(camPtr.current, target.x, target.y, target.z);
      } else {
        wasm.camerasystem_clear_target(camPtr.current);
      }
    }

    // JS fallback state
    isUserControlled.current = false;
    isLerping.current = true;

    const onStart = () => {
      isUserControlled.current = true;
      isLerping.current = false;
      if (wasm && camPtr.current) {
        wasm.camerasystem_user_controlled(camPtr.current);
      }
    };

    controls.addEventListener("start", onStart);
    return () => {
      controls.removeEventListener("start", onStart);
    };
  }, [targetKey, controlsRef, target]);

  // Shake trigger
  useEffect(() => {
    if (shakeTimestamp > 0) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.5 + 0.2,
        Math.random() - 0.5
      ).normalize();

      const wasm = getCortexWasm();
      if (wasm && camPtr.current) {
        wasm.camerasystem_trigger_shake(
          camPtr.current, dir.x, dir.y, dir.z,
          performance.now() / 1000
        );
      }

      // JS fallback (also used as backup)
      shakeStartTime.current = performance.now();
      shakeDirection.current.copy(dir);
    }
  }, [shakeTimestamp]);

  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const now = performance.now() / 1000;
    const wasm = getCortexWasm();

    // WASM path: compute desired position, but let OrbitControls apply it
    if (wasm && camPtr.current && !isUserControlled.current) {
      wasm.camerasystem_update(camPtr.current, delta, now);

      // Check if WASM is actively lerping
      const lerping = wasm.camerasystem_is_lerping(camPtr.current) !== 0;
      const hasTarget = wasm.camerasystem_has_target(camPtr.current) !== 0;

      if (lerping && hasTarget && target) {
        const dataPtr = wasm.camerasystem_data_ptr(camPtr.current);
        const data = new Float32Array(wasm.memory.buffer, dataPtr, 6);

        // Apply WASM-computed lerp -- but only position, not target rotation
        // This lets OrbitControls keep its rotation state
        controls.object.position.lerp(
          new THREE.Vector3(data[0], data[1], data[2]),
          delta * 2.0
        );
        controls.target.lerp(
          new THREE.Vector3(data[3], data[4], data[5]),
          delta * 2.0
        );
      }

      // Apply shake on top (additive, doesn't break OrbitControls)
      const shakeElapsed = (performance.now() - shakeStartTime.current) / 1000;
      if (shakeElapsed < 0.3 && shakeTimestamp > 0) {
        const frequency = 30;
        const decay = 10;
        const amplitude = 0.03;
        const magnitude =
          amplitude * Math.sin(frequency * shakeElapsed) * Math.exp(-decay * shakeElapsed);
        const offset = shakeDirection.current.clone().multiplyScalar(magnitude);
        controls.object.position.add(offset);
      }

      controls.update();
      return;
    }

    // JS fallback: lerp toward target
    if (target && isLerping.current) {
      desiredPos.current.copy(target).add(cameraOffset.current);
      controls.object.position.lerp(desiredPos.current, delta * 1.2);
      controls.target.lerp(target, delta * 1.5);

      const dist = controls.object.position.distanceTo(desiredPos.current);
      if (dist < 0.3) {
        isLerping.current = false;
      }
    }

    // JS fallback: shake
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
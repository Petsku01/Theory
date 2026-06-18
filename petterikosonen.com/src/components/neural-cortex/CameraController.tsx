"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

// ── WASM camera loader ──
// Loads wasm_cortex_bg.wasm for camera lerp + shake computation.

interface CameraWasmExports {
  memory: WebAssembly.Memory;
  camerasystem_new(): number;
  camerasystem_set_position(ptr: number, cx: number, cy: number, cz: number, tx: number, ty: number, tz: number): void;
  camerasystem_set_target(ptr: number, tx: number, ty: number, tz: number): void;
  camerasystem_clear_target(ptr: number): void;
  camerasystem_user_controlled(ptr: number): void;
  camerasystem_trigger_shake(ptr: number, dx: number, dy: number, dz: number, t: number): void;
  camerasystem_update(ptr: number, delta: number, current_time: number): number;
  camerasystem_is_lerping(ptr: number): number;
  camerasystem_has_target(ptr: number): number;
  camerasystem_data_ptr(ptr: number): number;
  __wbg_camerasystem_free(ptr: number, del: number): void;
  __wbindgen_start(): void;
  __wbindgen_externrefs: WebAssembly.Table;
}

let camWasm: CameraWasmExports | null = null;
let camWasmPromise: Promise<boolean> | null = null;
let camWasmReady = false;
let camWasmFailed = false;

async function loadCamWasm(): Promise<boolean> {
  const response = await fetch("/wasm/wasm_cortex_bg.wasm");
  if (!response.ok) {
    throw new Error(`WASM fetch failed: ${response.status}`);
  }
  const { instance } = await WebAssembly.instantiateStreaming(response, {
    "./wasm_cortex_bg.js": {
      __wbg___wbindgen_throw_ea4887a5f8f9a9db: function (arg0: number, arg1: number) {
        throw new Error(`WASM throw at offset ${arg0}, len ${arg1}`);
      },
      __wbindgen_init_externref_table: function () {},
    },
  });
  const exports = instance.exports as unknown as CameraWasmExports;
  if (typeof exports.camerasystem_new !== "function") {
    throw new Error("Missing required WASM export: camerasystem_new");
  }
  if (exports.__wbindgen_start) {
    exports.__wbindgen_start();
  }
  camWasm = exports;
  camWasmReady = true;
  return true;
}

function ensureCamWasm(): Promise<boolean> {
  if (camWasm) return Promise.resolve(true);
  if (camWasmFailed) return Promise.resolve(false);
  camWasmPromise ??= loadCamWasm().catch((err) => {
    console.warn("[camera] WASM load failed, using JS fallback:", err);
    camWasmPromise = null;
    camWasmFailed = true;
    return false;
  });
  return camWasmPromise;
}

if (typeof window !== "undefined") {
  ensureCamWasm();
}

// ── Camera controller with WASM lerp + shake, JS fallback ──
export function CameraController({
  target,
  controlsRef,
  shakeTimestamp,
}: {
  target: THREE.Vector3 | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  shakeTimestamp: number;
}) {
  // JS fallback state
  const shakeStartTime = useRef<number>(0);
  const shakeDirection = useRef<THREE.Vector3>(new THREE.Vector3());
  const isUserControlled = useRef(false);
  const isLerping = useRef(false);
  const cameraOffset = useRef(new THREE.Vector3(0, 2, 4));
  const desiredPos = useRef(new THREE.Vector3());

  // WASM state
  const camPtr = useRef<number>(0);
  // Track whether WASM became ready (triggers re-init)
  const [, setWasmReadyFlag] = useState(false);

  // Initialize WASM camera system when WASM is ready
  useEffect(() => {
    if (!camWasmReady || !camWasm || camPtr.current) {
      // If WASM not ready yet, poll until it is
      if (!camWasmReady && !camWasmFailed) {
        ensureCamWasm().then((ok) => {
          if (ok) setWasmReadyFlag(true); // trigger re-render -> re-init
        });
      }
      return;
    }

    camPtr.current = camWasm.camerasystem_new();

    // Sync current camera state into WASM to prevent snapping
    const controls = controlsRef.current;
    if (controls) {
      const camPos = controls.object.position;
      const tgt = controls.target;
      camWasm.camerasystem_set_position(
        camPtr.current, camPos.x, camPos.y, camPos.z,
        tgt.x, tgt.y, tgt.z
      );
      // Re-apply current target if one is set
      if (target) {
        camWasm.camerasystem_set_target(camPtr.current, target.x, target.y, target.z);
      }
    }

    return () => {
      if (camPtr.current && camWasm) {
        try { camWasm.__wbg_camerasystem_free(camPtr.current, 0); } catch {}
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

    // WASM: set or clear target
    if (camWasmReady && camWasm && camPtr.current) {
      if (target) {
        camWasm.camerasystem_set_target(camPtr.current, target.x, target.y, target.z);
      } else {
        camWasm.camerasystem_clear_target(camPtr.current);
      }
    }

    // JS fallback
    isUserControlled.current = false;
    isLerping.current = true;

    const onStart = () => {
      isUserControlled.current = true;
      isLerping.current = false;
      if (camWasmReady && camWasm && camPtr.current) {
        camWasm.camerasystem_user_controlled(camPtr.current);
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

      if (camWasmReady && camWasm && camPtr.current) {
        camWasm.camerasystem_trigger_shake(
          camPtr.current, dir.x, dir.y, dir.z,
          performance.now() / 1000
        );
      }

      // JS fallback
      shakeStartTime.current = performance.now();
      shakeDirection.current.copy(dir);
    }
  }, [shakeTimestamp]);

  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const now = performance.now() / 1000;

    // WASM path
    if (camWasmReady && camWasm && camPtr.current) {
      camWasm.camerasystem_update(camPtr.current, delta, now);
      const dataPtr = camWasm.camerasystem_data_ptr(camPtr.current);
      const data = new Float32Array(camWasm.memory.buffer, dataPtr, 6);

      // Apply WASM-computed camera position
      controls.object.position.set(data[0], data[1], data[2]);
      controls.target.set(data[3], data[4], data[5]);
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
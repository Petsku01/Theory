"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
  freeWasmPtr,
  writeF32ToWasm,
  type CortexWasmExports,
} from "@/components/neural-cortex/utils";

// Shockwave data per slot (6 f32s):
// [cx, cy, cz, radius, opacity, intensity]
const SHOCKWAVE_STRIDE = 6;
const MAX_SLOTS = 3;

// Shared ring geometry — will be scaled per-instance
const RING_GEOMETRY = /* @__PURE__ */ new THREE.RingGeometry(0.95, 1.0, 64, 1);

interface ShockwaveInstance {
  meshRef: React.RefObject<THREE.Mesh | null>;
  active: boolean;
}

export function WasmShockwave({
  isMobile = false,
  reducedMotion = false,
}: {
  isMobile?: boolean;
  reducedMotion?: boolean;
}) {
  const shockwavePtr = useRef<number>(0);
  const wasmReady = useRef(false);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const centerBufferRef = useRef<Float32Array | null>(null);
  const centerPtrRef = useRef<number>(0);

  // Color per slot — will be set externally
  const slotColors = useRef<THREE.Color[]>([
    new THREE.Color("#00f0ff"),
    new THREE.Color("#00f0ff"),
    new THREE.Color("#00f0ff"),
  ]);

  // Materials per slot (created once)
  const materials = useMemo(() => {
    return Array.from({ length: MAX_SLOTS }, () => {
      return new THREE.MeshBasicMaterial({
        color: new THREE.Color("#00f0ff"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
    });
  }, []);

  useEffect(() => {
    return () => {
      materials.forEach((m) => m.dispose());
    };
  }, [materials]);

  // Initialize WASM shockwave system
  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    const init = () => {
      if (cancelled) return;
      const wasm = getCortexWasm();
      if (!wasm) return;
      const ptr = wasm.shockwavesystem_new();
      shockwavePtr.current = ptr;
      // Mobile: max 1 shockwave; desktop: max 3
      wasm.shockwavesystem_set_max_count(ptr, isMobile ? 1 : MAX_SLOTS);
      wasmReady.current = true;

      // Pre-allocate center buffer for apply_shockwave calls
      centerBufferRef.current = new Float32Array(3);
      centerPtrRef.current = writeF32ToWasm(wasm, centerBufferRef.current);
    };

    if (isCortexWasmReady()) {
      init();
    } else {
      ensureCortexWasm().then((ok) => {
        if (ok) init();
      });
    }

    return () => {
      cancelled = true;
      const wasm = getCortexWasm();
      if (!wasm) return;
      if (shockwavePtr.current) {
        try { wasm.__wbg_shockwavesystem_free(shockwavePtr.current, 0); } catch {}
        shockwavePtr.current = 0;
      }
      if (centerPtrRef.current) {
        freeWasmPtr(wasm, centerPtrRef.current, 12);
      }
    };
  }, [isMobile, reducedMotion]);

  // Public API: trigger a shockwave at a position with a color
  // Called externally via ref or imperative handle
  const triggerShockwave = useMemo(() => {
    return (center: THREE.Vector3, color: THREE.Color, maxRadius?: number, speed?: number) => {
      if (reducedMotion || !wasmReady.current || !shockwavePtr.current) return;
      const wasm = getCortexWasm();
      if (!wasm) return;

      const radius = maxRadius ?? (isMobile ? 3.0 : 5.0);
      const spd = speed ?? (isMobile ? 6.0 : 8.0);

      // Find a free slot color to assign
      // We store the color for the most recent trigger
      const activeCount = wasm.shockwavesystem_active_count(shockwavePtr.current);
      const slotIdx = activeCount % MAX_SLOTS;
      slotColors.current[slotIdx].copy(color);

      wasm.shockwavesystem_trigger(
        shockwavePtr.current,
        center.x, center.y, center.z,
        radius, spd
      );
    };
  }, [isMobile, reducedMotion]);

  // Expose trigger function via a module-level ref so CortexScene can call it
  // We use a simpler approach: register on window for inter-component communication
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__cortexTriggerShockwave = triggerShockwave;
    return () => {
      delete (window as any).__cortexTriggerShockwave;
    };
  }, [triggerShockwave]);

  // Per-frame: update shockwaves and apply to meshes
  useFrame((_, delta) => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (!wasmReady.current || !shockwavePtr.current || reducedMotion) return;
    const wasm = getCortexWasm();
    if (!wasm) return;

    try {
      wasm.shockwavesystem_update(shockwavePtr.current, delta);

      const dataPtr = wasm.shockwavesystem_data_ptr(shockwavePtr.current);
      const stride = wasm.shockwavesystem_stride(shockwavePtr.current);
      const data = new Float32Array(wasm.memory.buffer, dataPtr, MAX_SLOTS * stride);

      // Get burst system pointer for shockwave push
      const burstPtr = (typeof window !== "undefined")
        ? (window as any).__cortexBurstPtr as number | undefined
        : undefined;

      for (let i = 0; i < MAX_SLOTS; i++) {
        const mesh = meshRefs.current[i];
        if (!mesh) continue;

        const base = i * stride;
        const cx = data[base];
        const cy = data[base + 1];
        const cz = data[base + 2];
        const radius = data[base + 3];
        const opacity = data[base + 4];
        const intensity = data[base + 5];

        if (opacity > 0.001 && radius > 0.001) {
          mesh.position.set(cx, cy, cz);
          mesh.scale.setScalar(radius);
          (materials[i] as THREE.MeshBasicMaterial).opacity = opacity * 0.8;
          (materials[i] as THREE.MeshBasicMaterial).color.copy(slotColors.current[i]);
          mesh.visible = true;

          // Apply shockwave push to burst particles
          if (burstPtr && centerBufferRef.current && centerPtrRef.current) {
            centerBufferRef.current[0] = cx;
            centerBufferRef.current[1] = cy;
            centerBufferRef.current[2] = cz;
            // Write to WASM memory
            const view = new Float32Array(wasm.memory.buffer, centerPtrRef.current, 3);
            view.set(centerBufferRef.current);
            try {
              wasm.burstsystem_apply_shockwave(
                burstPtr,
                centerPtrRef.current,
                3, // center_len
                radius,
                intensity * 0.02 // force scaled by intensity
              );
            } catch {
              // Silent fail
            }
          }
        } else {
          mesh.visible = false;
        }
      }
    } catch {
      // Silent fail
    }
  });

  // Don't render anything if reduced motion
  if (reducedMotion) return null;

  return (
    <>
      {Array.from({ length: MAX_SLOTS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => { meshRefs.current[i] = m; }}
          visible={false}
          renderOrder={1}
        >
          <primitive object={RING_GEOMETRY} attach="geometry" />
          <primitive object={materials[i]} attach="material" />
        </mesh>
      ))}
    </>
  );
}
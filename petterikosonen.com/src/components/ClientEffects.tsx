"use client";

import WasmParticleField from "@/components/WasmParticleField";
import WasmInteractiveBackground from "@/components/WasmInteractiveBackground";
import WasmSpotlightCursor from "@/components/WasmSpotlightCursor";

/**
 * Client-only visual effects wrapper.
 * All three effects are WASM-powered:
 *   - particles.wasm    -> background particle field
 *   - mouse_trail.wasm  -> interactive mouse trails
 *   - spring_cursor.wasm -> spotlight cursor with spring physics
 *
 * No next/dynamic — components handle SSR avoidance internally via mounted state.
 */
export default function ClientEffects() {
  return (
    <>
      <WasmParticleField particleCount={1200} />
      <WasmInteractiveBackground />
      <WasmSpotlightCursor />
    </>
  );
}
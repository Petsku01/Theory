"use client";

import WasmParticleField from "@/components/WasmParticleField";
import WasmSpotlightCursor from "@/components/WasmSpotlightCursor";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Client-only visual effects wrapper.
 * WASM-powered:
 *   - particles.wasm     -> background particle field
 *   - spring_cursor.wasm -> spotlight cursor with spring physics
 *
 * Removed: mouse_trail.wasm (WasmInteractiveBackground) -- not needed.
 *
 * No next/dynamic — components handle SSR avoidance internally via mounted state.
 */
export default function ClientEffects() {
  return (
    <ErrorBoundary fallback={null}>
      <WasmParticleField particleCount={1200} />
      <WasmSpotlightCursor />
    </ErrorBoundary>
  );
}
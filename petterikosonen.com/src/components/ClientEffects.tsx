"use client";

import WasmSpotlightCursor from "@/components/WasmSpotlightCursor";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Client-only visual effects wrapper.
 * WASM-powered:
 *   - spring_cursor.wasm -> spotlight cursor with spring physics
 *
 * Particle field removed — mycelium canvas in root layout is the site background.
 */
export default function ClientEffects() {
  return (
    <ErrorBoundary fallback={null}>
      <WasmSpotlightCursor />
    </ErrorBoundary>
  );
}

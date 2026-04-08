"use client";

import dynamic from "next/dynamic";

const WasmParticleField = dynamic(() => import("@/components/WasmParticleField"), { ssr: false });
const WasmInteractiveBackground = dynamic(() => import("@/components/WasmInteractiveBackground"), { ssr: false });
const WasmSpotlightCursor = dynamic(() => import("@/components/WasmSpotlightCursor"), { ssr: false });

/**
 * Client-only visual effects wrapper.
 * All three effects are WASM-powered:
 *   - particles.wasm   → background particle field
 *   - mouse_trail.wasm → interactive mouse trails
 *   - spring_cursor.wasm → spotlight cursor with spring physics
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

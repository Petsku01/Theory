"use client";

import dynamic from "next/dynamic";

const WasmParticleField = dynamic(() => import("@/components/WasmParticleField"), { ssr: false });
const InteractiveBackground = dynamic(() => import("@/components/InteractiveBackground"), { ssr: false });
const SpotlightCursor = dynamic(() => import("@/components/SpotlightCursor"), { ssr: false });

/**
 * Client-only visual effects wrapper.
 * Isolates ssr:false dynamic imports from the server layout.
 */
export default function ClientEffects() {
  return (
    <>
      <WasmParticleField particleCount={1200} />
      <InteractiveBackground />
      <SpotlightCursor />
    </>
  );
}

"use client";

import { useWasmParticles } from "@/hooks/useWasmParticles";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface Props {
  particleCount?: number;
  className?: string;
}

/**
 * Full-viewport WASM-driven particle field.
 * Physics simulation runs in WebAssembly for near-native performance.
 * Canvas rendering happens in JS RAF loop reading WASM linear memory directly.
 */
export default function WasmParticleField({ particleCount = 1200, className = "" }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const { canvasRef, ready } = useWasmParticles(particleCount, !reducedMotion);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 h-full w-full transition-opacity duration-1000 ${
        ready ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}

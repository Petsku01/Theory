"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import ErrorBoundary from "@/components/ErrorBoundary";

const WasmParticleField = dynamic(() => import("./WasmParticleField"), { ssr: false });
const WasmSpotlightCursor = dynamic(() => import("./WasmSpotlightCursor"), { ssr: false });

export default function ClientEffects() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  // The home atlas owns its animation budget: no second global particle/cursor loop.
  if (pathname === "/" || reduced) return null;
  return (
    <ErrorBoundary fallback={<></>}>
      <WasmParticleField particleCount={1200} />
      <WasmSpotlightCursor />
    </ErrorBoundary>
  );
}

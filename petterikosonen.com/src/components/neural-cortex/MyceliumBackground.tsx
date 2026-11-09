"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useCortexInteraction } from "@/components/neural-cortex/CortexInteractionContext";
import ErrorBoundary from "@/components/ErrorBoundary";

type CanvasProps = {
  activeCluster: string | null;
  onClusterSelect: (cluster: string | null) => void;
  shakeTimestamp: number;
  particleCount: number;
  isMobile: boolean;
  interactive?: boolean;
  reducedMotion?: boolean;
};

/** Site-wide mycelium canvas. ClickTargets only on `/`. */
export default function MyceliumBackground() {
  const [Canvas, setCanvas] = useState<ComponentType<CanvasProps> | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const {
    activeCluster,
    selectCluster,
    shakeTimestamp,
    isMobile,
    interactive,
  } = useCortexInteraction();

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    import("@/components/neural-cortex/CortexCanvas")
      .then((mod) => {
        if (!cancelled) setCanvas(() => mod.default);
      })
      .catch((err: unknown) => {
        if (typeof window !== "undefined") {
          (window as Window & { __myceliumLoadError?: string }).__myceliumLoadError =
            err instanceof Error ? err.message : String(err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      data-mycelium={Canvas ? "ready" : "loading"}
      className={`fixed inset-0 z-0 ${interactive ? "" : "pointer-events-none"}`}
      aria-hidden={interactive ? undefined : true}
    >
      {!Canvas ? null : (
        <ErrorBoundary fallback={null}>
          <Canvas
            activeCluster={interactive ? activeCluster : null}
            onClusterSelect={interactive ? selectCluster : noop}
            shakeTimestamp={interactive ? shakeTimestamp : 0}
            particleCount={isMobile ? 2000 : 5000}
            isMobile={isMobile}
            interactive={interactive}
            reducedMotion={reducedMotion}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

function noop() {}

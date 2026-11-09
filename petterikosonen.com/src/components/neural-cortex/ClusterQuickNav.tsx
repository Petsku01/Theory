"use client";

import { useCortexInteraction } from "@/components/neural-cortex/CortexInteractionContext";
import { KNOTS, KNOT_COLORS, type KnotId } from "@/components/neural-cortex/knotGauss";

/**
 * Compact right-edge cluster list. Same selectCluster toggle as CortexScene ClickTarget.
 * Home-only (interactive); hidden below md.
 */
export function ClusterQuickNav() {
  const { activeCluster, selectCluster, interactive } = useCortexInteraction();
  if (!interactive) return null;

  return (
    <nav
      aria-label="Clusters"
      className="pointer-events-auto fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 md:block"
    >
      <ul
        className="flex flex-col gap-1 rounded-md px-2.5 py-2 backdrop-blur-[6px]"
        style={{
          backgroundColor: "rgba(5,7,10,0.85)",
          border: "1px solid rgba(34,211,238,0.28)",
        }}
      >
        {KNOTS.map((k) => {
          const active = activeCluster === k.id;
          const color = KNOT_COLORS[k.id as KnotId];
          return (
            <li key={k.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (activeCluster === k.id) {
                    selectCluster(null);
                  } else {
                    selectCluster(k.id);
                  }
                }}
                className="flex items-center gap-2 rounded px-1.5 py-0.5 font-mono text-[10px] lowercase tracking-wide text-slate-200 transition-colors hover:text-white"
                style={{
                  color: active ? color : undefined,
                  textShadow: "0 1px 2px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: active ? `0 0 6px ${color}` : undefined,
                  }}
                  aria-hidden
                />
                {k.id}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

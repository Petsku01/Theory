"use client";

import { nodes } from "@/lib/cortex-data";

// ── Hidden keyboard nav ──
export function AccessibleNav({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <nav className="sr-only" aria-label="Site sections">
      {nodes.map((node) => (
        <button key={node.id} onClick={() => onSelect(node.id)}>
          {node.label} - {node.shortDesc}
        </button>
      ))}
    </nav>
  );
}
"use client";

// ── Vignette overlay (unchanged) ──
export function Vignette() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 60%, rgba(10,10,15,0.85) 100%)",
      }}
    />
  );
}
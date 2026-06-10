"use client";

// ── Scanlines overlay (finer, lower opacity) ──
export function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)",
        animation: "scanlines 10s linear infinite",
        backgroundSize: "100% 4px",
      }}
    />
  );
}
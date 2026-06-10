"use client";

// ── Lightweight overlay effects & loader ──

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

export function CortexLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
        <p className="font-mono text-sm text-slate-400">
          Initializing neural cortex...
        </p>
      </div>
    </div>
  );
}
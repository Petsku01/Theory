"use client";

// ── Loader ──
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
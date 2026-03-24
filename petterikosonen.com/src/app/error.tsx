"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-line-0 bg-bg-1/90 px-6 py-12 text-center shadow-terminal">
      <p className="section-label">/error --runtime</p>
      <h2 className="mt-4 text-2xl font-semibold text-text-0">Something went wrong</h2>
      <p className="mt-2 max-w-xl text-sm text-text-1">
        {error.message || "An unexpected application error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="focus-outline mt-6 rounded border border-accent-cyan/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.05em] text-accent-cyan transition-colors hover:bg-accent-cyan/15"
      >
        Retry
      </button>
    </div>
  );
}

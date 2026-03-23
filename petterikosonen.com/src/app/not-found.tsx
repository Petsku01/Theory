import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Petteri Kosonen",
};

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-line-0 bg-bg-1/90 px-6 py-16 text-center shadow-terminal">
      <p className="section-label">/404 --missing</p>
      <h1 className="mt-4 text-6xl font-bold text-text-0">404</h1>
      <p className="mt-2 text-text-1">Page not found.</p>
      <Link
        href="/"
        className="focus-outline mt-6 rounded border border-accent-cyan/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.05em] text-accent-cyan transition-colors hover:bg-accent-cyan/15"
      >
        Return home
      </Link>
    </section>
  );
}

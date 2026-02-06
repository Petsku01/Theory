import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Petteri Kosonen",
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-white mb-4">404</h1>
      <p className="text-neutral-400 mb-8">Page not found</p>
      <Link 
        href="/" 
        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}

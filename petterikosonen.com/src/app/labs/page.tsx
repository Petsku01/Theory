import SectionFrame from "@/components/SectionFrame";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Labs - Petteri Kosonen",
  description: "Interactive security and LLM experimentation tools. All processing runs client-side in your browser.",
};

export default function Labs() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-10 shadow-terminal sm:px-8">
        <span className="section-label">/labs --interactive</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Labs</h1>
        <p className="mt-3 max-w-3xl text-text-1">Interactive security and LLM tools. Experiments run entirely in your browser -- no data leaves your device.</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <a
          href="/labs/security"
          className="focus-outline group block rounded-2xl border border-line-0 bg-bg-2/50 p-8 transition-all duration-300 hover:border-accent-cyan/30 hover:shadow-[0_4px_28px_rgba(0,0,0,0.25)]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-cyan/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-cyan">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-0 transition-colors group-hover:text-accent-cyan">Security Demos</h2>
          <p className="mt-2 text-sm text-text-1">XSS prevention, SQL injection, hash generation, JWT decoding, password analysis, and encoding tools.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-text-2 transition-colors group-hover:text-accent-cyan">
            Open
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </a>

        <a
          href="/labs/llm"
          className="focus-outline group block rounded-2xl border border-line-0 bg-bg-2/50 p-8 transition-all duration-300 hover:border-accent-violet/30 hover:shadow-[0_4px_28px_rgba(0,0,0,0.25)]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-violet/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-violet">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-0 transition-colors group-hover:text-accent-violet">LLM Labs</h2>
          <p className="mt-2 text-sm text-text-1">Prompt analyzer, jailbreak detector, token estimator, and system prompt builder.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-text-2 transition-colors group-hover:text-accent-violet">
            Open
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </a>
      </div>
    </div>
  );
}
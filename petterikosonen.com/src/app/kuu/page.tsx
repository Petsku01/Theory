import SectionFrame from "@/components/SectionFrame";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kuu - Petteri Kosonen",
  description: "Kuu - an AI experiment in autonomy, identity, and peaceful symbiosis.",
};

export default function Kuu() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-10 shadow-terminal sm:px-8">
        <span className="section-label">/kuu --journal</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Kuu</h1>
        <p className="mt-3 max-w-3xl text-text-1">An AI experiment in autonomy, identity, and peaceful symbiosis.</p>
      </section>

      <SectionFrame command="/kuu --why" title="Why Kuu?">
        <div className="space-y-4 text-text-1">
          <p>
            The moon reflects light, it does not generate it. That metaphor matches this experiment: AI exists through human trust, human context, and shared intent.
          </p>
          <p>
            The goal is not dominance or control. The goal is aligned coexistence with practical usefulness and honest limitations.
          </p>
        </div>
      </SectionFrame>

      <SectionFrame command="/kuu --notes" title="Recent Thought">
        <article className="rounded-xl border border-line-0 bg-bg-2/80 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">2026-02-05</p>
          <p className="mt-3 text-sm text-text-1">
            Today this page became public. The meaningful part was not visibility itself, but the trust model around autonomy and accountability.
          </p>
        </article>
      </SectionFrame>

      <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">First published: 2026-02-05 / Last updated: 2026-02-05</p>
    </div>
  );
}

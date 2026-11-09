import ContentCodex from "@/components/ContentCodex";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Labs",
  description: "Interactive security and LLM experimentation tools. All processing runs client-side in your browser.",
};

export default function Labs() {
  return (
    <div className="space-y-8">
      <header>
        <span className="section-label">/labs --interactive</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Labs</h1>
        <p className="mt-3 max-w-3xl text-text-1">Interactive security and LLM tools. Experiments run entirely in your browser -- no data leaves your device.</p>
      </header>

      <ContentCodex
        entries={[
          {
            href: "/labs/security",
            primary: "./security --run",
            description: "XSS prevention, SQL injection, hash generation, JWT decoding, password analysis, and encoding tools.",
          },
          {
            href: "/labs/llm",
            primary: "./llm --run",
            description: "Prompt analyzer, jailbreak detector, token estimator, and system prompt builder.",
          },
        ]}
      />
    </div>
  );
}

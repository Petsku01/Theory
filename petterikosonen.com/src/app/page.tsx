import HomeClient from "@/components/HomeClient";
import Link from "next/link";

export const metadata = {
  title: "Petteri Kosonen — Application Specialist + AI Researcher",
  description: "Building tools that make AI safer. LLM fine-tuning, prompt security, and trustworthy automation.",
};

export default function Home() {
  return (
    <>
      <header className="pt-8 md:pt-16">
        <p className="mb-6 font-mono text-xs uppercase tracking-[.18em] text-text-1">Petteri Kosonen / Application Specialist + AI Researcher</p>
        <h1 className="max-w-4xl font-display text-[clamp(2.8rem,7vw,5.5rem)] font-medium leading-[1.04] tracking-[-.05em]">
          Human judgment.<br /><span className="text-accent-cyan">Machine possibility.</span>
        </h1>
        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <p className="max-w-lg text-base leading-relaxed text-text-1 md:text-lg">I build tools for safer AI — from prompt security and fine-tuning to trustworthy automation. Explore how the work connects.</p>
          <div className="flex flex-wrap gap-5 text-sm">
            <Link href="/projects" className="focus-outline border-b border-accent-cyan pb-2">Selected projects ↗</Link>
            <Link href="/contact" className="focus-outline border-b border-line-1 pb-2">Start a conversation ↗</Link>
          </div>
        </div>
      </header>
      <HomeClient />
      <noscript><p className="mt-6">The static atlas is available without JavaScript. Browse <a href="/projects">projects</a>, <a href="/research">research</a> and <a href="/about">experience</a> using the navigation.</p></noscript>
    </>
  );
}

import ContentCodex from "@/components/ContentCodex";
import { researchPosts, type BlogPost } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research",
  description: "Papers, security analyses, and engineering guides.",
};

function researchType(post: BlogPost): string {
  const title = post.title.toLowerCase();
  const link = post.link.toLowerCase();
  if (link.endsWith(".pdf")) return "paper";
  if (title.includes("prompt engineering")) return "guide";
  if (
    title.includes("analysis") ||
    title.includes("investigation") ||
    title.includes("vulnerability") ||
    title.includes("breach") ||
    title.includes("worm") ||
    title.includes("malware") ||
    title.includes("honeypot")
  ) {
    return "analysis";
  }
  return "research";
}

export default function Research() {
  return (
    <div className="space-y-8">
      <header>
        <span className="section-label">/research --list</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Research</h1>
        <p className="mt-3 max-w-3xl text-text-1">Papers, deep-dive analyses, security write-ups, and engineering guides.</p>
      </header>

      <ContentCodex
        entries={researchPosts.map((post) => ({
          href: post.link,
          primary: `${post.date.slice(0, 4)} · ${researchType(post)} · ${post.title}`,
          description: post.desc,
          external: true,
        }))}
      />
    </div>
  );
}

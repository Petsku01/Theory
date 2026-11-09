import ContentCodex from "@/components/ContentCodex";
import { blogPosts } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Commentary, analysis, and observations on AI, security, and the tech stack.",
};

export default function Blog() {
  return (
    <div className="space-y-8">
      <header>
        <span className="section-label">/blog --entries</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Blog</h1>
        <p className="mt-3 max-w-3xl text-text-1">Commentary, analysis, and longer-form observations on AI, security, and the tech stack.</p>
      </header>

      <ContentCodex
        entries={[...blogPosts].reverse().map((post) => ({
          href: post.link,
          primary: `· ${post.date} · blog · ${post.title}`,
          description: post.desc,
          external: true,
        }))}
      />
    </div>
  );
}

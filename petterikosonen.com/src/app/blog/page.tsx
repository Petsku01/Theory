import SectionFrame from "@/components/SectionFrame";
import { blogPosts, researchPosts } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Petteri Kosonen",
  description: "Commentary, analysis, and research on security, AI, and infrastructure.",
};

export default function Blog() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-10 shadow-terminal sm:px-8">
        <span className="section-label">/blog --entries</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Blog</h1>
        <p className="mt-3 max-w-3xl text-text-1">Commentary, analysis, and longer-form observations on AI, security, and the tech stack.</p>
      </section>

      {/* Blog posts -- daily/weekly commentary */}
      {blogPosts.length > 0 && (
        <SectionFrame command="/blog --daily" title="Blog Posts" description="Timely analysis and commentary on AI, security, and the industry.">
          <div className="space-y-3">
            {blogPosts.map((post) => (
              <a
                key={post.link}
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-outline block rounded-xl border border-line-0 bg-bg-2/75 p-5 transition-colors hover:border-accent-cyan/45"
              >
                <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">{post.date}</p>
                <h2 className="mt-1 text-xl font-semibold text-text-0">{post.title}</h2>
                <p className="mt-1 text-sm text-text-1">{post.desc}</p>
              </a>
            ))}
          </div>
        </SectionFrame>
      )}

      {/* Research entries -- papers, studies, analyses, guides */}
      <SectionFrame command="/research --list" title="Research" description="Papers, deep-dive analyses, security write-ups, and engineering guides.">
        <div className="space-y-3">
          {researchPosts.map((post) => (
            <a
              key={post.link}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-outline block rounded-xl border border-line-0 bg-bg-2/75 p-5 transition-colors hover:border-accent-cyan/45"
            >
              <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">{post.date}</p>
              <h2 className="mt-1 text-xl font-semibold text-text-0">{post.title}</h2>
              <p className="mt-1 text-sm text-text-1">{post.desc}</p>
            </a>
          ))}
        </div>
      </SectionFrame>
    </div>
  );
}
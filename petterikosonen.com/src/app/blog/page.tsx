import SectionFrame from "@/components/SectionFrame";
import { blogPosts } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Petteri Kosonen",
  description: "Notes and write-ups on security, development, and IT infrastructure.",
};

export default function Blog() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-10 shadow-terminal sm:px-8">
        <span className="section-label">/research --entries</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Research Log</h1>
        <p className="mt-3 max-w-3xl text-text-1">Notes and write-ups on security analysis, diagnostics, and engineering experiments.</p>
      </section>

      <SectionFrame command="/blog --list" title="Entries">
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
    </div>
  );
}

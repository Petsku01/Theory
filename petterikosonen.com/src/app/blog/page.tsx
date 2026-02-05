import { blogPosts } from "@/lib/data";

export default function Blog() {
  return (
    <div>
      <section className="py-20">
        <h1 className="text-3xl font-medium text-white mb-4">Blog</h1>
        <p className="text-neutral-400">Notes and write-ups on security and development.</p>
      </section>

      <section className="pb-20">
        <div className="space-y-6">
          {blogPosts.map((p, i) => (
            <a key={i} href={p.link} target="_blank" rel="noopener noreferrer" className="block py-6 border-t border-neutral-900 hover:bg-neutral-900/30 -mx-4 px-4 transition-colors">
              <p className="text-xs text-neutral-600 mb-2">{p.date.split("-")[0]}</p>
              <h3 className="text-white mb-2">{p.title}</h3>
              <p className="text-sm text-neutral-500">{p.desc}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

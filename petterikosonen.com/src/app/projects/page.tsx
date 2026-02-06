import { projects } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects — Petteri Kosonen",
  description: "Open source security tools, scripts, and experiments by Petteri Kosonen.",
};

export default function Projects() {
  return (
    <div>
      <section className="py-20">
        <h1 className="text-3xl font-medium text-white mb-4">Projects</h1>
        <p className="text-neutral-400">
          Open source projects from my <a href="https://github.com/Petsku01/Theory" className="text-neutral-300 hover:text-white">GitHub</a>.
        </p>
      </section>

      <section className="pb-20">
        <div className="space-y-6">
          {projects.map((p) => (
            <a key={p.link} href={p.link} target="_blank" rel="noopener noreferrer" className="block py-6 border-t border-neutral-900 hover:bg-neutral-900/30 -mx-4 px-4 transition-colors">
              <h3 className="text-white mb-2">{p.name}</h3>
              <p className="text-sm text-neutral-500 mb-2">{p.desc}</p>
              <p className="text-xs text-neutral-600">{p.tech}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

import ContentCodex from "@/components/ContentCodex";
import { projects } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Open source security tools, scripts, and experiments by Petteri Kosonen.",
};

export default function Projects() {
  return (
    <div className="space-y-8">
      <header>
        <span className="section-label">/projects --all</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Project Terminal</h1>
        <p className="mt-3 max-w-3xl text-text-1">
          Open-source projects from my GitHub focused on cybersecurity, diagnostics, automation, and practical AI workflows.
        </p>
      </header>

      <ContentCodex
        entries={projects.map((project) => ({
          href: project.link,
          primary: `${project.name} · ${project.tech} · ${project.desc} →`,
          description: project.desc,
          external: true,
          primaryLines: 2 as const,
        }))}
      />
    </div>
  );
}

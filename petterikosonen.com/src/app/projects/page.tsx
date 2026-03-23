import SectionFrame from "@/components/SectionFrame";
import StatusPill from "@/components/StatusPill";
import TerminalProjectCard from "@/components/TerminalProjectCard";
import { projects } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects - Petteri Kosonen",
  description: "Open source security tools, scripts, and experiments by Petteri Kosonen.",
};

export default function Projects() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-10 shadow-terminal sm:px-8">
        <span className="section-label">/projects --all</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Project Terminal</h1>
        <p className="mt-3 max-w-3xl text-text-1">
          Open-source projects from my GitHub focused on cybersecurity, diagnostics, automation, and practical AI workflows.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill label="security tools" variant="green" />
          <StatusPill label="prompt engineering" variant="violet" />
          <StatusPill label="automation" variant="cyan" />
        </div>
      </section>

      <SectionFrame title="Repository Index" command="/projects --cards">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <TerminalProjectCard key={project.link} project={project} />
          ))}
        </div>
      </SectionFrame>
    </div>
  );
}

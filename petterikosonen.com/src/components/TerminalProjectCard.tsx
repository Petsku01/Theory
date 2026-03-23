import type { Project } from "@/lib/data";
import StatusPill from "@/components/StatusPill";

interface TerminalProjectCardProps {
  project: Project;
}

const statusCycle: Array<"cyan" | "green" | "amber" | "violet"> = ["cyan", "green", "amber", "violet"];

export default function TerminalProjectCard({ project }: TerminalProjectCardProps) {
  const tags = project.tech.split(",").map((entry) => entry.trim());
  const status = statusCycle[project.name.length % statusCycle.length];

  return (
    <article className="group rounded-xl border border-line-0 bg-bg-2/90 p-5 shadow-terminal transition-all duration-200 ease-standard hover:-translate-y-1 hover:border-accent-cyan/50 hover:shadow-glowCyan">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-text-0">{project.name}</h3>
        <StatusPill label="active" variant={status} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded border border-line-1 px-2 py-0.5 font-mono text-xs text-text-2">
            {tag}
          </span>
        ))}
      </div>
      <p className="min-h-24 text-sm text-text-1">{project.desc}</p>
      <div className="mt-5 border-t border-line-0 pt-4">
        <a
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-outline rounded-sm font-mono text-xs uppercase tracking-[0.05em] text-accent-cyan transition-colors hover:text-[#4edff3]"
        >
          github / case study
        </a>
      </div>
    </article>
  );
}

import StatusPill from "@/components/StatusPill";

interface FeaturedProjectProps {
  title: string;
  summary: string;
  points: string[];
  tech: string[];
  link: string;
  variant: "cyan" | "violet";
}

export default function FeaturedProject({ title, summary, points, tech, link, variant }: FeaturedProjectProps) {
  return (
    <article className="rounded-2xl border border-line-1 bg-gradient-to-br from-bg-2 via-bg-2 to-bg-3/80 p-6 shadow-terminal">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill label="featured" variant={variant} />
        <span className="font-mono text-xs uppercase tracking-[0.06em] text-text-2">security spotlight</span>
      </div>
      <h3 className="text-2xl font-semibold text-text-0">{title}</h3>
      <p className="mt-3 text-text-1">{summary}</p>
      <ul className="mt-4 space-y-2 text-sm text-text-1">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-accent-cyan" aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {tech.map((item) => (
          <span key={item} className="rounded border border-line-1 px-2 py-1 font-mono text-xs text-text-2">
            {item}
          </span>
        ))}
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-outline mt-6 inline-flex rounded border border-accent-cyan/60 px-3 py-2 font-mono text-xs uppercase tracking-[0.05em] text-accent-cyan transition-colors hover:bg-accent-cyan/15"
      >
        Inspect project
      </a>
    </article>
  );
}

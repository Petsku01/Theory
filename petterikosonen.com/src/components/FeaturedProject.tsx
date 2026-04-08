import StatusPill from "@/components/StatusPill";

interface FeaturedProjectProps {
  title: string;
  summary: string;
  points: string[];
  tech: string[];
  link: string;
  variant: "cyan" | "violet";
}

const variantStyles = {
  cyan: {
    glow: "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_8px_40px_-12px_rgba(34,211,238,0.2)]",
    border: "hover:border-accent-cyan/40",
    accent: "bg-accent-cyan",
    gradientFrom: "from-accent-cyan/10",
  },
  violet: {
    glow: "hover:shadow-[0_0_0_1px_rgba(124,140,255,0.2),0_8px_40px_-12px_rgba(124,140,255,0.2)]",
    border: "hover:border-accent-violet/40",
    accent: "bg-accent-violet",
    gradientFrom: "from-accent-violet/10",
  },
};

export default function FeaturedProject({ title, summary, points, tech, link, variant }: FeaturedProjectProps) {
  const styles = variantStyles[variant];

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-line-0 bg-gradient-to-br ${styles.gradientFrom} via-bg-2/90 to-bg-2 p-7 shadow-terminal transition-all duration-300 ease-standard ${styles.border} ${styles.glow}`}
    >
      {/* Top accent line */}
      <div className={`absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent ${variant === "cyan" ? "via-accent-cyan/50" : "via-accent-violet/50"} to-transparent`} aria-hidden="true" />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <StatusPill label="featured" variant={variant} />
        <span className="font-mono text-xs uppercase tracking-[0.06em] text-text-2">security spotlight</span>
      </div>

      <h3 className="text-2xl font-bold text-text-0">{title}</h3>
      <p className="mt-3 text-text-1 leading-relaxed">{summary}</p>

      <ul className="mt-5 space-y-2.5 text-sm text-text-1">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${styles.accent}`} aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        {tech.map((item) => (
          <span
            key={item}
            className="rounded-lg border border-line-1/70 bg-bg-3/40 px-2.5 py-1 font-mono text-xs text-text-2"
          >
            {item}
          </span>
        ))}
      </div>

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={`focus-outline mt-7 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.05em] transition-all duration-200 ${
          variant === "cyan"
            ? "border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/12"
            : "border-accent-violet/50 text-accent-violet hover:bg-accent-violet/12"
        }`}
      >
        Inspect project
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
          <path d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
      </a>
    </article>
  );
}

interface StatusPillProps {
  label: string;
  variant?: "cyan" | "green" | "amber" | "red" | "violet";
}

const config = {
  cyan: {
    classes: "border-accent-cyan/30 bg-accent-cyan/6 text-accent-cyan shadow-[0_0_14px_rgba(34,211,238,0.06)]",
    dot: "bg-accent-cyan",
  },
  green: {
    classes: "border-accent-green/30 bg-accent-green/6 text-accent-green shadow-[0_0_14px_rgba(57,255,136,0.06)]",
    dot: "bg-accent-green",
  },
  amber: {
    classes: "border-accent-amber/30 bg-accent-amber/6 text-accent-amber shadow-[0_0_14px_rgba(244,185,66,0.06)]",
    dot: "bg-accent-amber",
  },
  red: {
    classes: "border-accent-red/30 bg-accent-red/6 text-accent-red shadow-[0_0_14px_rgba(255,92,122,0.06)]",
    dot: "bg-accent-red",
  },
  violet: {
    classes: "border-accent-violet/30 bg-accent-violet/6 text-accent-violet shadow-[0_0_14px_rgba(124,140,255,0.06)]",
    dot: "bg-accent-violet",
  },
} as const;

export default function StatusPill({ label, variant = "cyan" }: StatusPillProps) {
  const { classes, dot } = config[variant];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.68rem] uppercase tracking-widest ${classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

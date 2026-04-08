interface StatusPillProps {
  label: string;
  variant?: "cyan" | "green" | "amber" | "red" | "violet";
}

const variants = {
  cyan: "border-accent-cyan/40 bg-accent-cyan/8 text-accent-cyan shadow-[0_0_12px_rgba(34,211,238,0.08)]",
  green: "border-accent-green/40 bg-accent-green/8 text-accent-green shadow-[0_0_12px_rgba(57,255,136,0.08)]",
  amber: "border-accent-amber/40 bg-accent-amber/8 text-accent-amber shadow-[0_0_12px_rgba(244,185,66,0.08)]",
  red: "border-accent-red/40 bg-accent-red/8 text-accent-red shadow-[0_0_12px_rgba(255,92,122,0.08)]",
  violet: "border-accent-violet/40 bg-accent-violet/8 text-accent-violet shadow-[0_0_12px_rgba(124,140,255,0.08)]",
};

const dotColors = {
  cyan: "bg-accent-cyan",
  green: "bg-accent-green",
  amber: "bg-accent-amber",
  red: "bg-accent-red",
  violet: "bg-accent-violet",
};

export default function StatusPill({ label, variant = "cyan" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.06em] ${variants[variant]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />
      {label}
    </span>
  );
}

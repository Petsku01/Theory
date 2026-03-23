interface StatusPillProps {
  label: string;
  variant?: "cyan" | "green" | "amber" | "red" | "violet";
}

const variants = {
  cyan: "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan",
  green: "border-accent-green/50 bg-accent-green/10 text-accent-green",
  amber: "border-accent-amber/50 bg-accent-amber/10 text-accent-amber",
  red: "border-accent-red/50 bg-accent-red/10 text-accent-red",
  violet: "border-accent-violet/50 bg-accent-violet/10 text-accent-violet",
};

export default function StatusPill({ label, variant = "cyan" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.72rem] uppercase tracking-[0.05em] ${variants[variant]}`}
    >
      {label}
    </span>
  );
}

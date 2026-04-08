"use client";

import { useInView } from "@/hooks/useInView";

const groups = [
  {
    title: "Security",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    confidence: "Operational",
    level: 78,
    accent: "cyan" as const,
    items: ["Defender EDR", "Threat triage", "XSS/SQLi basics", "TryHackMe labs"],
  },
  {
    title: "Cloud / Microsoft",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
    confidence: "Advanced support",
    level: 85,
    accent: "violet" as const,
    items: ["Entra ID", "Intune", "Exchange Online", "Active Directory", "Office 365"],
  },
  {
    title: "Automation",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
    confidence: "Practical",
    level: 72,
    accent: "green" as const,
    items: ["PowerShell", "Python", "ServiceNow flows", "SQL diagnostics"],
  },
  {
    title: "AI / Prompting",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4m-7.07-3.93 2.83-2.83m8.49-8.49 2.83-2.83M2 12h4m12 0h4m-3.93 7.07-2.83-2.83M6.34 6.34 3.51 3.51" />
      </svg>
    ),
    confidence: "Applied research",
    level: 68,
    accent: "amber" as const,
    items: ["Prompt engineering", "LLM guardrails", "Jailbreak testing", "PromptKit patterns"],
  },
];

const accentMap = {
  cyan: {
    bar: "bg-gradient-to-r from-accent-cyan/60 to-accent-cyan",
    iconBg: "bg-accent-cyan/10 text-accent-cyan",
    badge: "border-accent-cyan/30 text-accent-cyan",
    shadow: "hover:shadow-[0_0_24px_rgba(34,211,238,0.1)]",
    glow: "bg-accent-cyan/20",
  },
  violet: {
    bar: "bg-gradient-to-r from-accent-violet/60 to-accent-violet",
    iconBg: "bg-accent-violet/10 text-accent-violet",
    badge: "border-accent-violet/30 text-accent-violet",
    shadow: "hover:shadow-[0_0_24px_rgba(124,140,255,0.1)]",
    glow: "bg-accent-violet/20",
  },
  green: {
    bar: "bg-gradient-to-r from-accent-green/60 to-accent-green",
    iconBg: "bg-accent-green/10 text-accent-green",
    badge: "border-accent-green/30 text-accent-green",
    shadow: "hover:shadow-[0_0_24px_rgba(57,255,136,0.1)]",
    glow: "bg-accent-green/20",
  },
  amber: {
    bar: "bg-gradient-to-r from-accent-amber/60 to-accent-amber",
    iconBg: "bg-accent-amber/10 text-accent-amber",
    badge: "border-accent-amber/30 text-accent-amber",
    shadow: "hover:shadow-[0_0_24px_rgba(244,185,66,0.1)]",
    glow: "bg-accent-amber/20",
  },
};

function SkillCard({
  group,
  index,
}: {
  group: (typeof groups)[number];
  index: number;
}) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2 });
  const s = accentMap[group.accent];

  return (
    <article
      ref={ref}
      className={`group rounded-2xl border border-line-0 bg-bg-2/50 p-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-1 ${s.shadow} ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}>
            {group.icon}
          </span>
          <h3 className="text-lg font-bold text-text-0">{group.title}</h3>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.63rem] uppercase tracking-widest ${s.badge}`}>
          {group.confidence}
        </span>
      </div>

      {/* Animated progress bar */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-3/60">
          <div
            className={`h-full rounded-full ${s.bar} transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]`}
            style={{
              width: inView ? `${group.level}%` : "0%",
              transitionDelay: `${200 + index * 80}ms`,
            }}
          />
        </div>
        <span className="font-mono text-xs text-text-2">{group.level}%</span>
      </div>

      {/* Skill tags */}
      <div className="flex flex-wrap gap-2">
        {group.items.map((item) => (
          <span
            key={item}
            className="rounded-lg border border-line-0/60 bg-bg-3/25 px-2.5 py-1 text-sm text-text-1 transition-colors duration-200 hover:border-line-1 hover:text-text-0"
          >
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function SkillsMatrix() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map((group, i) => (
        <SkillCard key={group.title} group={group} index={i} />
      ))}
    </div>
  );
}

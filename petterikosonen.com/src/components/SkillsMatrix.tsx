"use client";

import { motion } from "framer-motion";

const groups = [
  {
    title: "Security",
    icon: "shield",
    confidence: "Operational",
    level: 78,
    accent: "cyan" as const,
    items: ["Defender EDR", "Threat triage", "XSS/SQLi basics", "TryHackMe labs"],
  },
  {
    title: "Cloud / Microsoft",
    icon: "cloud",
    confidence: "Advanced support",
    level: 85,
    accent: "violet" as const,
    items: ["Entra ID", "Intune", "Exchange Online", "Active Directory", "Office 365"],
  },
  {
    title: "Automation",
    icon: "terminal",
    confidence: "Practical",
    level: 72,
    accent: "green" as const,
    items: ["PowerShell", "Python", "ServiceNow flows", "SQL diagnostics"],
  },
  {
    title: "AI / Prompting",
    icon: "brain",
    confidence: "Applied research",
    level: 68,
    accent: "amber" as const,
    items: ["Prompt engineering", "LLM guardrails", "Jailbreak testing", "PromptKit patterns"],
  },
];

const accentStyles = {
  cyan: {
    bar: "bg-gradient-to-r from-accent-cyan/80 to-accent-cyan",
    bg: "bg-accent-cyan/8",
    border: "border-accent-cyan/30",
    text: "text-accent-cyan",
    shadow: "shadow-[0_0_16px_rgba(34,211,238,0.15)]",
    iconBg: "bg-accent-cyan/10",
  },
  violet: {
    bar: "bg-gradient-to-r from-accent-violet/80 to-accent-violet",
    bg: "bg-accent-violet/8",
    border: "border-accent-violet/30",
    text: "text-accent-violet",
    shadow: "shadow-[0_0_16px_rgba(124,140,255,0.15)]",
    iconBg: "bg-accent-violet/10",
  },
  green: {
    bar: "bg-gradient-to-r from-accent-green/80 to-accent-green",
    bg: "bg-accent-green/8",
    border: "border-accent-green/30",
    text: "text-accent-green",
    shadow: "shadow-[0_0_16px_rgba(57,255,136,0.15)]",
    iconBg: "bg-accent-green/10",
  },
  amber: {
    bar: "bg-gradient-to-r from-accent-amber/80 to-accent-amber",
    bg: "bg-accent-amber/8",
    border: "border-accent-amber/30",
    text: "text-accent-amber",
    shadow: "shadow-[0_0_16px_rgba(244,185,66,0.15)]",
    iconBg: "bg-accent-amber/10",
  },
};

const icons: Record<string, React.ReactNode> = {
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  cloud: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
  terminal: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  brain: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.45 2.1-1.17 2.83L12 12l-2.83-3.17A4 4 0 0 1 12 2z" />
      <path d="M8 6a4 4 0 0 0-4 4c0 1.5.84 2.8 2.07 3.46L12 12" />
      <path d="M16 6a4 4 0 0 1 4 4c0 1.5-.84 2.8-2.07 3.46L12 12" />
      <path d="M12 12v10" />
    </svg>
  ),
};

export default function SkillsMatrix() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map((group, idx) => {
        const style = accentStyles[group.accent];
        return (
          <motion.article
            key={group.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className={`group rounded-2xl border border-line-0 bg-bg-2/60 p-6 transition-all duration-300 hover:border-line-1 ${style.shadow}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.iconBg} ${style.text}`}>
                  {icons[group.icon]}
                </span>
                <h3 className="text-lg font-bold text-text-0">{group.title}</h3>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.06em] ${style.border} ${style.text}`}>
                {group.confidence}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-3/60">
                <motion.div
                  className={`h-full rounded-full ${style.bar}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${group.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-line-0/80 bg-bg-3/30 px-2.5 py-1 text-sm text-text-1 transition-colors duration-200 hover:border-line-1 hover:text-text-0"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

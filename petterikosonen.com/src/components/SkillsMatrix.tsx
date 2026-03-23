const groups = [
  {
    title: "Security",
    confidence: "Operational",
    items: ["Defender EDR", "Threat triage", "XSS/SQLi basics", "TryHackMe labs"],
  },
  {
    title: "Cloud / Microsoft",
    confidence: "Advanced support",
    items: ["Entra ID", "Intune", "Exchange Online", "Active Directory", "Office 365"],
  },
  {
    title: "Automation",
    confidence: "Practical",
    items: ["PowerShell", "Python", "ServiceNow flows", "SQL diagnostics"],
  },
  {
    title: "AI / Prompting",
    confidence: "Applied research",
    items: ["Prompt engineering", "LLM guardrails", "Jailbreak testing", "PromptKit patterns"],
  },
];

export default function SkillsMatrix() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <article key={group.title} className="rounded-xl border border-line-0 bg-bg-2/80 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-text-0">{group.title}</h3>
            <span className="rounded-full border border-line-1 px-2 py-1 font-mono text-[0.68rem] uppercase tracking-[0.05em] text-text-2">
              {group.confidence}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => (
              <span key={item} className="rounded border border-line-1 px-2 py-1 text-sm text-text-1">
                {item}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

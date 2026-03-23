import StatusPill from "@/components/StatusPill";

const timeline = [
  {
    role: "IT Support Specialist",
    company: "2M-IT",
    period: "Nov 2022 - Present",
    impact: [
      "Resolved cloud and endpoint incidents across enterprise Microsoft environments.",
      "Supported healthcare critical apps with strong SLA and escalation discipline.",
      "Improved patterns for troubleshooting and support reporting.",
    ],
  },
  {
    role: "Security Trainee",
    company: "2M-IT",
    period: "Mar 2024 - Sep 2024",
    impact: [
      "Investigated security alerts and request-driven threat signals.",
      "Tested and evaluated Microsoft security product improvements.",
      "Maintained and studied information security standards in operations.",
    ],
  },
  {
    role: "IT Support Intern",
    company: "theFirma",
    period: "Jan 2018 - Jun 2019",
    impact: [
      "Handled daily troubleshooting of endpoints and software issues.",
      "Provided client-facing technical support with clear documentation.",
    ],
  },
];

export default function ExperienceTimeline() {
  return (
    <div className="relative space-y-8 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line-1">
      {timeline.map((item) => (
        <article key={`${item.company}-${item.role}`} className="relative rounded-xl border border-line-0 bg-bg-2/80 p-5 pl-7">
          <span className="absolute left-0 top-6 h-4 w-4 -translate-x-1/2 rounded-full border border-accent-cyan bg-bg-0" aria-hidden="true" />
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-text-0">{item.role}</h3>
            <StatusPill label={item.company} variant="cyan" />
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">{item.period}</p>
          <ul className="mt-3 space-y-2 text-sm text-text-1">
            {item.impact.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

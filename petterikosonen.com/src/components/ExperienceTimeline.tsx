"use client";

import StatusPill from "@/components/StatusPill";
import { useInView } from "@/hooks/useInView";

const timeline = [
  {
    role: "IT Support Specialist",
    company: "2M-IT",
    period: "Nov 2022 - Present",
    current: true,
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
    current: false,
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
    current: false,
    impact: [
      "Handled daily troubleshooting of endpoints and software issues.",
      "Provided client-facing technical support with clear documentation.",
    ],
  },
];

function TimelineEntry({
  item,
  index,
}: {
  item: (typeof timeline)[number];
  index: number;
}) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2 });

  return (
    <article
      ref={ref}
      className={`group relative rounded-2xl border border-line-0 bg-bg-2/50 p-6 transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-1 hover:shadow-[0_4px_30px_rgba(0,0,0,0.25)] ${
        inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {/* Timeline dot — double ring with glow */}
      <span className="absolute -left-8 top-7 flex h-6 w-6 items-center justify-center" aria-hidden="true">
        <span className="absolute h-6 w-6 rounded-full border border-accent-cyan/25 bg-bg-0" />
        <span className={`relative h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] ${
          item.current ? "bg-accent-green animate-pulse" : "bg-accent-cyan"
        }`} />
      </span>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <h3 className="text-lg font-bold text-text-0">{item.role}</h3>
        <StatusPill label={item.company} variant={item.current ? "green" : "cyan"} />
      </div>

      <p className="mb-4 inline-flex items-center gap-2 rounded-lg bg-bg-3/30 px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-text-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        {item.period}
      </p>

      <ul className="space-y-2">
        {item.impact.map((point) => (
          <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-text-1">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-2/50" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function ExperienceTimeline() {
  return (
    <div className="relative space-y-6 pl-8">
      {/* Timeline line — gradient */}
      <div className="absolute bottom-4 left-[11px] top-4 w-px bg-gradient-to-b from-accent-cyan/40 via-accent-violet/20 to-transparent" aria-hidden="true" />

      {timeline.map((item, i) => (
        <TimelineEntry key={`${item.company}-${item.role}`} item={item} index={i} />
      ))}
    </div>
  );
}

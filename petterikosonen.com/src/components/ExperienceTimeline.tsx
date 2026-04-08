"use client";

import { motion } from "framer-motion";
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
    <div className="relative space-y-6 pl-8">
      {/* Timeline line */}
      <div className="absolute bottom-4 left-[11px] top-4 w-px bg-gradient-to-b from-accent-cyan/40 via-accent-violet/20 to-transparent" aria-hidden="true" />

      {timeline.map((item, idx) => (
        <motion.article
          key={`${item.company}-${item.role}`}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: idx * 0.1 }}
          className="group relative rounded-2xl border border-line-0 bg-bg-2/60 p-6 transition-all duration-300 hover:border-line-1 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        >
          {/* Timeline dot */}
          <span className="absolute -left-8 top-7 flex h-6 w-6 items-center justify-center" aria-hidden="true">
            <span className="absolute h-6 w-6 rounded-full border border-accent-cyan/30 bg-bg-0" />
            <span className="relative h-2 w-2 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          </span>

          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-bold text-text-0">{item.role}</h3>
            <StatusPill label={item.company} variant="cyan" />
          </div>

          <p className="mb-4 inline-flex items-center gap-2 rounded-lg bg-bg-3/40 px-2.5 py-1 font-mono text-xs uppercase tracking-[0.05em] text-text-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {item.period}
          </p>

          <ul className="space-y-2 text-sm text-text-1">
            {item.impact.map((point) => (
              <li key={point} className="flex gap-2.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-2/60" aria-hidden="true" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </motion.article>
      ))}
    </div>
  );
}

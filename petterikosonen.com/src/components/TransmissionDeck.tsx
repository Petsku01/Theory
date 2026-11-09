"use client";

import Link from "next/link";
import ScrambleText from "@/components/ScrambleText";
import { projects } from "@/lib/data";

const HIGHLIGHTS = projects.slice(0, 3);

const ABOUT_BODY =
  "Application Specialist at 2M-IT. B.Eng. student in data networks and cybersecurity — LLM fine-tuning, prompt security, trustworthy automation.";

const PROJECTS_BODY = HIGHLIGHTS.map(
  (p, i) => `${String(i + 1).padStart(2, "0")} ${p.name} — ${p.desc.split(".")[0]}`,
).join(" · ");

const CONTACT_BODY =
  "Open channel. Cybersecurity, AI safety, IT collaboration — transmit when ready.";

type Panel = {
  channel: string;
  href: string;
  cta: string;
  body: string;
  delayMs: number;
  ariaLabel: string;
};

const PANELS: Panel[] = [
  {
    channel: "about",
    href: "/about",
    cta: "open dossier",
    body: ABOUT_BODY,
    delayMs: 0,
    ariaLabel: "Decoded transmission about: operator profile summary",
  },
  {
    channel: "projects",
    href: "/projects",
    cta: "list highlights",
    body: PROJECTS_BODY,
    delayMs: 180,
    ariaLabel: "Decoded transmission projects: three highlighted works",
  },
  {
    channel: "contact",
    href: "/contact",
    cta: "open channel",
    body: CONTACT_BODY,
    delayMs: 360,
    ariaLabel: "Decoded transmission contact: invitation to get in touch",
  },
];

function RxPanel({ panel }: { panel: Panel }) {
  return (
    <article
      className="rx-panel relative z-20 flex min-h-[11.5rem] flex-col"
      aria-label={panel.ariaLabel}
    >
      <header className="flex items-center justify-between border-b border-cyan-400/20 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-400/85">
          RX ▸ {panel.channel}
        </span>
        <span className="font-mono text-[9px] tracking-widest text-slate-500" aria-hidden="true">
          DECODE
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-3 px-3 py-3">
        <ScrambleText
          as="p"
          text={panel.body}
          delayMs={panel.delayMs}
          durationMs={1200}
          cursor
          ariaLabel={panel.body}
          className="font-mono text-[11px] leading-relaxed text-slate-300"
        />
        <Link
          href={panel.href}
          aria-label={`${panel.cta} — ${panel.channel}`}
          className="focus-outline mt-auto inline-flex w-fit items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-400/90 hover:text-cyan-300"
        >
          <span aria-hidden="true">▸</span>
          {panel.cta}
        </Link>
      </div>
    </article>
  );
}

export default function TransmissionDeck() {
  return (
    <section
      className="relative z-20 w-full pt-4 pb-8"
      aria-label="Decoded transmissions"
    >
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        inbound · three packets
      </p>
      <div className="rx-deck grid w-full grid-cols-1 gap-3 md:grid-cols-3">
        {PANELS.map((panel) => (
          <RxPanel key={panel.channel} panel={panel} />
        ))}
      </div>
    </section>
  );
}

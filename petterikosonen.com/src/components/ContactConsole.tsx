"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StatusPill from "@/components/StatusPill";
import { useInView } from "@/hooks/useInView";

const EMAIL = "petteri.a.kosonen@proton.me";

const SOCIAL_LINKS = [
  {
    label: "github",
    href: "https://github.com/Petsku01",
    icon: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />,
  },
  {
    label: "linkedin",
    href: "https://www.linkedin.com/in/petteri-kosonen-511907172/",
    icon: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>,
  },
  {
    label: "tryhackme",
    href: "https://tryhackme.com/p/Petsku",
    icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  },
] as const;

/** Terminal typing animation for the console */
function useTerminalType(text: string, speed = 35, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const startTimeout = setTimeout(() => {
      const tick = () => {
        if (i < text.length) {
          setDisplayed(text.slice(0, ++i));
          timeout = setTimeout(tick, speed + Math.random() * 20);
        } else {
          setDone(true);
        }
      };
      tick();
    }, startDelay);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timeout);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

export default function ContactConsole() {
  const [copied, setCopied] = useState(false);
  const { ref: sectionRef, inView } = useInView<HTMLElement>({ threshold: 0.15 });
  const { displayed: commandText, done: cmdDone } = useTerminalType(
    "whoami --contact",
    40,
    inView ? 400 : 99999 // only start when in view
  );
  const { displayed: emailText } = useTerminalType(
    EMAIL,
    25,
    inView ? 1200 : 99999
  );

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API may be blocked */
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className={`relative overflow-hidden rounded-3xl glass-card p-8 shadow-terminal-lg sm:p-12 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(57,255,136,0.07),transparent_65%)] blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.05),transparent_65%)] blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-accent-green/30 to-transparent" aria-hidden="true" />

      {/* Corner accents */}
      <span className="pointer-events-none absolute left-4 top-4 h-7 w-7 border-l-2 border-t-2 border-accent-green/25 rounded-tl-md" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-7 w-7 border-b-2 border-r-2 border-accent-green/25 rounded-br-md" aria-hidden="true" />

      <div className="relative">
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <StatusPill label="send signal" variant="green" />
          <span className="font-mono text-[0.68rem] uppercase tracking-widest text-text-2">contact.console</span>
        </div>

        <h2 className="text-3xl font-bold text-text-0 sm:text-4xl lg:text-5xl">
          Let&apos;s build something{" "}
          <span className="hero-gradient-text-green">secure</span>.
        </h2>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-1 sm:text-lg">
          Available for cybersecurity, IT support engineering, and AI/prompt security collaboration.
          Current timezone: Europe/Helsinki (UTC+2/UTC+3).
        </p>

        {/* Interactive terminal */}
        <div className="mt-8 overflow-hidden rounded-xl border border-line-0 bg-bg-0/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-line-0/50 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-accent-red/50" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-accent-amber/50" aria-hidden="true" />
            <span className="h-3 w-3 rounded-full bg-accent-green/50" aria-hidden="true" />
            <span className="ml-3 font-mono text-[0.65rem] text-text-2">petteri@console ~</span>
          </div>
          {/* Terminal body */}
          <div className="p-5 font-mono text-sm leading-relaxed">
            <p className="text-text-2">
              $ {commandText}
              {!cmdDone && <span className="animate-blink ml-0.5 text-accent-cyan">|</span>}
            </p>
            {cmdDone && (
              <p className="mt-2 text-accent-cyan">
                {emailText}
                {emailText.length < EMAIL.length && (
                  <span className="animate-blink ml-0.5">|</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyEmail}
            className={`focus-outline flex items-center gap-2.5 rounded-xl border px-5 py-3 font-mono text-xs uppercase tracking-wider transition-all duration-200 ${
              copied
                ? "border-accent-green/50 bg-accent-green/12 text-accent-green"
                : "border-accent-green/30 bg-accent-green/6 text-accent-green hover:bg-accent-green/12 hover:shadow-glowGreen"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {copied ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>
              )}
            </svg>
            {copied ? "copied!" : "copy email"}
          </button>

          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-outline flex items-center gap-2.5 rounded-xl border border-line-1/50 bg-bg-2/20 px-5 py-3 font-mono text-xs uppercase tracking-wider text-text-1 transition-all duration-200 hover:border-accent-cyan/35 hover:text-accent-cyan hover:shadow-glowCyan"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {link.icon}
              </svg>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

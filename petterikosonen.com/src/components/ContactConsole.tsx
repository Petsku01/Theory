"use client";

import { useState } from "react";
import StatusPill from "@/components/StatusPill";

const email = "petteri.a.kosonen@proton.me";

export default function ContactConsole() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="contact" className="rounded-2xl border border-line-1 bg-bg-1/90 p-6 shadow-terminal sm:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill label="send signal" variant="green" />
        <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">contact.console</p>
      </div>
      <h2 className="text-3xl font-semibold text-text-0 sm:text-4xl">Let&apos;s build something secure.</h2>
      <p className="mt-3 max-w-2xl text-text-1">
        Available for cybersecurity, IT support engineering, and AI/prompt security collaboration. Current timezone: Europe/Helsinki (UTC+2/UTC+3).
      </p>
      <div className="mt-6 rounded-lg border border-line-0 bg-bg-2 p-4 font-mono text-sm">
        <p className="text-text-2">$ whoami --contact</p>
        <p className="mt-2 text-accent-cyan">{email}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={copyEmail}
          className="focus-outline rounded border border-accent-green/60 bg-accent-green/15 px-3 py-2 font-mono text-xs uppercase tracking-[0.05em] text-accent-green transition-colors hover:bg-accent-green/22"
        >
          {copied ? "email copied" : "copy email"}
        </button>
        <a
          className="focus-outline rounded border border-line-1 px-3 py-2 font-mono text-xs uppercase tracking-[0.05em] text-text-1 transition-colors hover:border-accent-cyan hover:text-accent-cyan"
          href="https://github.com/Petsku01"
          target="_blank"
          rel="noopener noreferrer"
        >
          github
        </a>
        <a
          className="focus-outline rounded border border-line-1 px-3 py-2 font-mono text-xs uppercase tracking-[0.05em] text-text-1 transition-colors hover:border-accent-cyan hover:text-accent-cyan"
          href="https://www.linkedin.com/in/petteri-kosonen-511907172/"
          target="_blank"
          rel="noopener noreferrer"
        >
          linkedin
        </a>
        <a
          className="focus-outline rounded border border-line-1 px-3 py-2 font-mono text-xs uppercase tracking-[0.05em] text-text-1 transition-colors hover:border-accent-cyan hover:text-accent-cyan"
          href="https://tryhackme.com/p/Petsku"
          target="_blank"
          rel="noopener noreferrer"
        >
          tryhackme
        </a>
      </div>
    </section>
  );
}

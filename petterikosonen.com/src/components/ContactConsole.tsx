"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import StatusPill from "@/components/StatusPill";

const email = "petteri.a.kosonen@proton.me";

const socialLinks = [
  {
    label: "github",
    href: "https://github.com/Petsku01",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
  },
  {
    label: "linkedin",
    href: "https://www.linkedin.com/in/petteri-kosonen-511907172/",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "tryhackme",
    href: "https://tryhackme.com/p/Petsku",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

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
    <motion.section
      id="contact"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl glass-card p-8 shadow-terminal-lg sm:p-12"
    >
      {/* Gradient top line */}
      <div className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-green/40 to-transparent" aria-hidden="true" />

      {/* Background glow */}
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(57,255,136,0.08),transparent_70%)] blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.06),transparent_70%)] blur-2xl" aria-hidden="true" />

      {/* Corner accents */}
      <span className="pointer-events-none absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-accent-green/30 rounded-tl-md" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-accent-green/30 rounded-br-md" aria-hidden="true" />

      <div className="relative">
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <StatusPill label="send signal" variant="green" />
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">contact.console</span>
        </div>

        <h2 className="text-3xl font-bold text-text-0 sm:text-4xl lg:text-5xl">
          Let&apos;s build something{" "}
          <span className="bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
            secure
          </span>.
        </h2>

        <p className="mt-4 max-w-2xl text-base text-text-1 leading-relaxed sm:text-lg">
          Available for cybersecurity, IT support engineering, and AI/prompt security collaboration.
          Current timezone: Europe/Helsinki (UTC+2/UTC+3).
        </p>

        {/* Terminal-style email display */}
        <div className="mt-8 overflow-hidden rounded-xl border border-line-0 bg-bg-0/60">
          <div className="flex items-center gap-2 border-b border-line-0/60 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-red/60" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-amber/60" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-green/60" aria-hidden="true" />
            <span className="ml-2 font-mono text-[0.65rem] text-text-2">contact</span>
          </div>
          <div className="p-4 font-mono text-sm">
            <p className="text-text-2">$ whoami --contact</p>
            <p className="mt-2 text-accent-cyan">{email}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyEmail}
            className={`focus-outline flex items-center gap-2 rounded-xl border px-5 py-3 font-mono text-xs uppercase tracking-[0.05em] transition-all duration-200 ${
              copied
                ? "border-accent-green/60 bg-accent-green/15 text-accent-green"
                : "border-accent-green/40 bg-accent-green/8 text-accent-green hover:bg-accent-green/15 hover:shadow-glowGreen"
            }`}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            {copied ? "copied!" : "copy email"}
          </button>

          {socialLinks.map((link) => (
            <a
              key={link.label}
              className="focus-outline flex items-center gap-2 rounded-xl border border-line-1/60 bg-bg-2/30 px-5 py-3 font-mono text-xs uppercase tracking-[0.05em] text-text-1 transition-all duration-200 hover:border-accent-cyan/40 hover:text-accent-cyan hover:shadow-glowCyan"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.icon}
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

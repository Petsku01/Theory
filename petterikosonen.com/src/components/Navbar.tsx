"use client";

import GlitchText from "@/components/GlitchText";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Research" },
  { href: "/security-demos", label: "Security" },
  { href: "/llm-labs", label: "LLM Labs" },
  { href: "/kuu", label: "Kuu" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 pt-3">
      <nav
        aria-label="Main navigation"
        className={`rounded-2xl border px-5 py-3.5 transition-all duration-300 ease-standard ${
          scrolled
            ? "border-line-0/80 bg-bg-0/70 shadow-terminal-lg backdrop-blur-2xl"
            : "border-line-0/40 bg-bg-1/50 backdrop-blur-lg"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="focus-outline group inline-flex items-center gap-2.5 rounded-md font-display text-sm font-semibold text-text-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-accent-green opacity-60" aria-hidden="true" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-green shadow-glowGreen" aria-hidden="true" />
            </span>
            <GlitchText>petteri@secure-console</GlitchText>
          </Link>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="focus-outline flex items-center gap-1.5 rounded-lg border border-line-1 px-3 py-2 text-xs font-mono text-text-1 transition-colors hover:border-accent-cyan/40 hover:text-text-0 md:hidden"
          >
            <span className="flex w-4 flex-col gap-1" aria-hidden="true">
              <span className={`h-px w-full bg-current transition-transform duration-200 ${open ? "translate-y-[3px] rotate-45" : ""}`} />
              <span className={`h-px w-full bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
              <span className={`h-px w-full bg-current transition-transform duration-200 ${open ? "-translate-y-[3px] -rotate-45" : ""}`} />
            </span>
            MENU
          </button>

          <ul className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    className={`focus-outline rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      active ? "text-text-0" : "text-text-2 hover:text-text-0 hover:bg-bg-3/50"
                    }`}
                  >
                    {link.label}
                  </Link>
                  {active ? (
                    <motion.span
                      layoutId="active-nav"
                      className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>

          <Link
            href="/#contact"
            className="focus-outline hidden items-center gap-2 rounded-lg border border-accent-cyan/40 bg-accent-cyan/8 px-4 py-2 text-xs font-mono uppercase tracking-[0.04em] text-accent-cyan transition-all hover:border-accent-cyan/60 hover:bg-accent-cyan/15 hover:shadow-glowCyan md:inline-flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" aria-hidden="true" />
            Contact
          </Link>
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-col gap-1 overflow-hidden pt-3 md:hidden"
            >
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`focus-outline block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      pathname === link.href
                        ? "bg-accent-cyan/10 text-accent-cyan"
                        : "text-text-1 hover:bg-bg-3/50 hover:text-text-0"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="mt-1 border-t border-line-0 pt-2">
                <Link
                  href="/#contact"
                  onClick={() => setOpen(false)}
                  className="focus-outline block rounded-lg px-3 py-2.5 text-sm text-accent-cyan"
                >
                  Contact
                </Link>
              </li>
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </nav>
    </header>
  );
}

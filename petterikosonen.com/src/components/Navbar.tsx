"use client";

import GlitchText from "@/components/GlitchText";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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

  return (
    <header className="sticky top-0 z-40 pt-4">
      <nav
        aria-label="Main navigation"
        className="rounded-xl border border-line-0 bg-bg-1/80 px-4 py-3 backdrop-blur-lg shadow-terminal"
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="focus-outline inline-flex items-center gap-2 rounded-md font-display text-sm font-semibold text-text-0">
            <span className="h-2 w-2 rounded-full bg-accent-green shadow-glowGreen" aria-hidden="true" />
            <GlitchText>petteri@secure-console</GlitchText>
          </Link>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="focus-outline rounded-md border border-line-1 px-3 py-1.5 text-xs font-mono text-text-1 md:hidden"
          >
            MENU
          </button>

          <ul className="hidden items-center gap-6 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href} className="relative">
                  <Link href={link.href} className="focus-outline rounded-md text-sm text-text-1 transition-colors hover:text-text-0">
                    {link.label}
                  </Link>
                  {active ? (
                    <motion.span
                      layoutId="active-nav"
                      className="absolute -bottom-1 left-0 h-0.5 w-full bg-accent-cyan"
                      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>

          <Link
            href="/#contact"
            className="focus-outline hidden rounded-md border border-accent-cyan/55 bg-accent-cyan/10 px-3 py-1.5 text-xs font-mono uppercase tracking-[0.04em] text-accent-cyan transition-colors hover:bg-accent-cyan/20 md:inline-flex"
          >
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
              className="flex flex-col gap-2 overflow-hidden pt-3 md:hidden"
            >
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`focus-outline block rounded-md px-2 py-2 text-sm ${pathname === link.href ? "text-accent-cyan" : "text-text-1"}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </nav>
    </header>
  );
}

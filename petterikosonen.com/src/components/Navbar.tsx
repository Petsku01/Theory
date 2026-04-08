"use client";

import GlitchText from "@/components/GlitchText";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Research" },
  { href: "/security-demos", label: "Security" },
  { href: "/llm-labs", label: "LLM Labs" },
  { href: "/kuu", label: "Kuu" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // RAF-throttled scroll handler
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 24);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => setOpen(false), [pathname]);

  // Close on Escape
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [open, onKeyDown]);

  // Animated underline position tracking
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const idx = links.findIndex((l) => l.href === pathname);
    const el = linksRef.current[idx];
    if (el) {
      const nav = navRef.current;
      if (!nav) return;
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicatorStyle({
        left: elRect.left - navRect.left,
        width: elRect.width,
      });
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 pt-3">
      <nav
        ref={navRef}
        aria-label="Main navigation"
        className={`relative rounded-2xl border px-5 py-3 transition-all duration-500 ease-standard ${
          scrolled
            ? "border-line-0/60 bg-bg-0/80 shadow-terminal-lg backdrop-blur-2xl"
            : "border-line-0/30 bg-bg-1/40 backdrop-blur-lg"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            href="/"
            className="focus-outline group inline-flex items-center gap-2.5 rounded-lg px-1 py-1 font-display text-sm font-semibold text-text-0"
          >
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green/40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-green shadow-glowGreen" />
            </span>
            <GlitchText>petteri@secure-console</GlitchText>
          </Link>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((p) => !p)}
            className="focus-outline relative flex h-9 w-9 items-center justify-center rounded-lg border border-line-1/60 transition-colors hover:border-accent-cyan/40 md:hidden"
          >
            <span className="flex w-4 flex-col items-center gap-[5px]" aria-hidden="true">
              <span
                className={`block h-[1.5px] w-full rounded-full bg-text-1 transition-all duration-300 ${
                  open ? "translate-y-[3.5px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-[1.5px] w-3 rounded-full bg-text-1 transition-all duration-300 ${
                  open ? "scale-x-0 opacity-0" : ""
                }`}
              />
              <span
                className={`block h-[1.5px] w-full rounded-full bg-text-1 transition-all duration-300 ${
                  open ? "-translate-y-[3.5px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>

          {/* Desktop links */}
          <ul className="relative hidden items-center gap-0.5 md:flex">
            {/* Animated active indicator */}
            <li
              className="absolute -bottom-1 h-0.5 rounded-full bg-accent-cyan shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-300 ease-emphasis"
              style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
              aria-hidden="true"
            />
            {links.map((link, i) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    ref={(el) => { linksRef.current[i] = el; }}
                    href={link.href}
                    className={`focus-outline block rounded-lg px-3 py-1.5 text-[0.82rem] font-medium transition-colors duration-200 ${
                      active
                        ? "text-text-0"
                        : "text-text-2 hover:bg-bg-3/40 hover:text-text-0"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* CTA */}
          <Link
            href="/#contact"
            className="focus-outline hidden items-center gap-2 rounded-xl border border-accent-cyan/30 bg-accent-cyan/6 px-4 py-2 text-xs font-mono uppercase tracking-wider text-accent-cyan transition-all duration-300 hover:border-accent-cyan/50 hover:bg-accent-cyan/12 hover:shadow-glowCyan md:inline-flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" aria-hidden="true" />
            Contact
          </Link>
        </div>

        {/* Mobile menu */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-emphasis md:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <ul className="overflow-hidden">
            <li className="pt-3" aria-hidden="true">
              <div className="gradient-divider" />
            </li>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`focus-outline block rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
                    pathname === link.href
                      ? "bg-accent-cyan/8 text-accent-cyan"
                      : "text-text-1 hover:bg-bg-3/40 hover:text-text-0"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-line-0/40 pt-2 mt-1">
              <Link
                href="/#contact"
                onClick={() => setOpen(false)}
                className="focus-outline block rounded-lg px-3 py-2.5 text-sm font-medium text-accent-cyan"
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const hudLinks = [
  { href: "/projects", n: "01", label: "projects" },
  { href: "/blog", n: "02", label: "blog" },
  { href: "/research", n: "03", label: "research" },
  { href: "/labs", n: "04", label: "labs" },
  { href: "/kuu", n: "05", label: "kuu" },
  { href: "/about", n: "06", label: "about" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mdUp, setMdUp] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setMdUp(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const isHome = mounted && pathname === "/";
  const navRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate: sync menu closed state to route change
    setOpen((prev) => (prev ? false : prev));
  }, [pathname]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [open, onKeyDown]);

  return (
    <header className={`sticky top-0 z-40 ${isHome ? "pt-1" : "pt-2"}`}>
      <nav
        ref={navRef}
        aria-label="Main navigation"
        className={`hud-bar relative px-3 py-2 transition-all duration-500 ease-standard max-[375px]:px-2 max-[375px]:py-1.5 ${
          isHome
            ? "border-cyan-400/20 bg-[rgba(5,7,10,0.55)] backdrop-blur-md"
            : scrolled
              ? "border-cyan-400/25 bg-[rgba(5,7,10,0.82)] shadow-terminal-lg backdrop-blur-2xl"
              : "border-cyan-400/15 bg-[rgba(5,7,10,0.62)] backdrop-blur-lg"
        }`}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link
            href="/"
            aria-label="Petteri Kosonen — home"
            className="focus-outline group inline-flex min-w-0 items-center gap-2 rounded-sm px-0.5 py-1 font-mono text-sm font-semibold text-text-0 max-[375px]:text-[0.7rem]"
          >
            <span
              className="hud-glyphs flex shrink-0 items-center gap-[3px] font-mono text-[9px] leading-none text-cyan-400/55"
              aria-hidden="true"
            >
              <span>◈</span>
              <span className="text-accent-green/80">◆</span>
              <span>⌁</span>
            </span>
            {pathname === "/" ? (
              <h1 className="hud-name truncate whitespace-nowrap">Petteri Kosonen</h1>
            ) : (
              <span className="hud-name truncate whitespace-nowrap">Petteri Kosonen</span>
            )}
          </Link>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((p) => !p)}
            className="focus-outline relative flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-cyan-400/25 transition-colors hover:border-accent-cyan/50 md:hidden"
          >
            <span className="flex w-3.5 flex-col items-center gap-[4px]" aria-hidden="true">
              <span
                className={`block h-[1.5px] w-full rounded-full bg-text-1 transition-all duration-300 ${
                  open ? "translate-y-[2.75px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-[1.5px] w-2.5 rounded-full bg-text-1 transition-all duration-300 ${
                  open ? "scale-x-0 opacity-0" : ""
                }`}
              />
              <span
                className={`block h-[1.5px] w-full rounded-full bg-text-1 transition-all duration-300 ${
                  open ? "-translate-y-[2.75px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>

          <ul className="relative hidden min-w-0 flex-1 items-center justify-center gap-x-1 overflow-hidden font-mono text-[11px] lowercase tracking-wide lg:flex">
            {hudLinks.map((link, i) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href} className="flex items-center gap-x-1">
                  {i > 0 ? (
                    <span className="text-slate-600" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  <Link
                    href={link.href}
                    aria-label={`${link.n} ${link.label}`}
                    aria-current={active ? "page" : undefined}
                    className={`focus-outline group inline-flex items-center gap-1 rounded-sm px-1.5 py-1 transition-colors duration-200 ${
                      active ? "text-cyan-300" : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-[9px] transition-colors ${
                        active
                          ? "text-accent-cyan"
                          : "text-slate-600 group-hover:text-accent-cyan"
                      }`}
                    >
                      ▸
                    </span>
                    <span className="tabular-nums text-slate-500 group-hover:text-accent-cyan">
                      {link.n}
                    </span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className="relative hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-1 font-mono text-[10px] lowercase tracking-wide md:flex lg:hidden">
            {hudLinks.map((link, i) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href} className="flex items-center gap-x-1">
                  {i > 0 ? (
                    <span className="text-slate-600" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  <Link
                    href={link.href}
                    aria-label={`${link.n} ${link.label}`}
                    aria-current={active ? "page" : undefined}
                    className={`focus-outline group inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 transition-colors ${
                      active ? "text-cyan-300" : "text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-[8px] ${
                        active
                          ? "text-accent-cyan"
                          : "text-slate-600 group-hover:text-accent-cyan"
                      }`}
                    >
                      ▸
                    </span>
                    <span className="tabular-nums text-slate-500 group-hover:text-accent-cyan">
                      {link.n}
                    </span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/contact"
            aria-label="Contact — open channel"
            aria-hidden={mdUp ? undefined : true}
            tabIndex={mdUp ? undefined : -1}
            className="nav-contact-desktop focus-outline hidden shrink-0 items-center gap-2 rounded-sm border border-accent-cyan/30 bg-accent-cyan/6 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-accent-cyan transition-all duration-300 hover:border-accent-cyan/50 hover:bg-accent-cyan/12 hover:shadow-glowCyan md:inline-flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" aria-hidden="true" />
            Contact
          </Link>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-emphasis md:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
          {...(open ? {} : { inert: true, "aria-hidden": "true" })}
        >
          <ul className="overflow-hidden font-mono text-[12px] lowercase">
            <li className="pt-3" aria-hidden="true">
              <div className="gradient-divider" />
            </li>
            {hudLinks.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-label={`${link.n} ${link.label}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`focus-outline group flex items-center gap-2 rounded-sm px-3 py-2.5 transition-colors duration-200 ${
                      active
                        ? "bg-accent-cyan/8 text-accent-cyan"
                        : "text-text-1 hover:bg-bg-3/40 hover:text-text-0"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-[10px] ${
                        active
                          ? "text-accent-cyan"
                          : "text-slate-600 group-hover:text-accent-cyan"
                      }`}
                    >
                      ▸
                    </span>
                    <span className="tabular-nums text-slate-500 group-hover:text-accent-cyan">
                      {link.n}
                    </span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 border-t border-cyan-400/15 pt-2">
              <Link
                href="/contact"
                aria-label="Contact — open channel"
                onClick={() => setOpen(false)}
                className="focus-outline block rounded-sm px-3 py-2.5 text-sm font-medium text-accent-cyan"
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

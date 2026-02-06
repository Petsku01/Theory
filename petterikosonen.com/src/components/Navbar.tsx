"use client";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/security-demos", label: "Security" },
  { href: "/kuu", label: "Kuu 🌙" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-neutral-900" aria-label="Main navigation">
      <div className="h-14 flex items-center justify-between">
        <Link href="/" className="text-white font-medium focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded">
          Petteri Kosonen
        </Link>
        {/* Desktop nav */}
        <div className="hidden md:flex gap-6 text-sm text-neutral-500">
          {links.slice(1).map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded px-1">
              {link.label}
            </Link>
          ))}
        </div>
        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-neutral-400 hover:text-white p-2 focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded"
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {open ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </>
            )}
          </svg>
        </button>
      </div>
      {/* Mobile menu */}
      {open && (
        <div className="md:hidden pb-4 flex flex-col gap-2 text-sm text-neutral-500">
          {links.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="hover:text-white transition-colors py-2 px-1 focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

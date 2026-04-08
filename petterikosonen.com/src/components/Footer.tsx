import Link from "next/link";

const footerLinks = [
  { label: "RSS", href: "/feed.xml", external: false },
  { label: "GitHub", href: "https://github.com/Petsku01", external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/petteri-kosonen-511907172/", external: true },
  { label: "TryHackMe", href: "https://tryhackme.com/p/Petsku", external: true },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line-0/30">
      <div className="container-shell py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan/60" aria-hidden="true" />
              <p className="font-mono text-[0.68rem] uppercase tracking-widest text-text-2">terminal.signature</p>
            </div>
            <p className="text-sm leading-relaxed text-text-1">
              Built with a security-first mindset, measured motion, WebAssembly physics, and open-source tooling.
            </p>
          </div>

          <nav aria-label="Footer links" className="flex flex-wrap gap-1">
            {footerLinks.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-outline glow-text-hover rounded-lg px-3 py-1.5 text-sm text-text-2"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="focus-outline glow-text-hover rounded-lg px-3 py-1.5 text-sm text-text-2"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>

        <div className="gradient-divider mt-8" />

        <div className="mt-6 flex items-center justify-between">
          <p className="font-mono text-[0.65rem] tracking-wider text-text-2/50">
            &copy; {new Date().getFullYear()} Petteri Kosonen
          </p>
          <p className="font-mono text-[0.65rem] tracking-wider text-text-2/30">
            WASM particle engine &middot; Next.js 16 &middot; TypeScript
          </p>
        </div>
      </div>
    </footer>
  );
}

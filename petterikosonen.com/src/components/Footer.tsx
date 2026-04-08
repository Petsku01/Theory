export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line-0/40">
      <div className="container-shell py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.06em] text-text-2">terminal.signature</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-text-1">
              Built with a security-first mindset, measured motion, and open-source tooling.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { label: "RSS", href: "/feed.xml", external: false },
              { label: "GitHub", href: "https://github.com/Petsku01", external: true },
              { label: "LinkedIn", href: "https://www.linkedin.com/in/petteri-kosonen-511907172/", external: true },
              { label: "TryHackMe", href: "https://tryhackme.com/p/Petsku", external: true },
            ].map((link) => (
              <a
                key={link.label}
                className="focus-outline glow-text-hover rounded-md px-2 py-1 text-sm text-text-2 transition-colors"
                href={link.href}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="gradient-divider mt-8" />
        <p className="mt-6 font-mono text-xs text-text-2/60">&copy; 2026 Petteri Kosonen / session closed.</p>
      </div>
    </footer>
  );
}

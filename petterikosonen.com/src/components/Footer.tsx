export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line-0 py-10">
      <div className="container-shell">
        <div className="rounded-xl border border-line-0 bg-bg-1/90 px-5 py-6 shadow-terminal sm:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-text-2">terminal.signature</p>
          <p className="mt-2 text-sm text-text-1">Built with a security-first mindset, measured motion, and open-source tooling.</p>
          <div className="mt-4 flex flex-wrap gap-5 text-sm text-text-1">
            <a className="focus-outline rounded-sm hover:text-accent-cyan" href="/feed.xml">
              RSS
            </a>
            <a className="focus-outline rounded-sm hover:text-accent-cyan" href="https://github.com/Petsku01" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a
              className="focus-outline rounded-sm hover:text-accent-cyan"
              href="https://www.linkedin.com/in/petteri-kosonen-511907172/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            <a className="focus-outline rounded-sm hover:text-accent-cyan" href="https://tryhackme.com/p/Petsku" target="_blank" rel="noopener noreferrer">
              TryHackMe
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-text-2">© 2026 Petteri Kosonen / session closed.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-neutral-900 mt-auto">
      <div className="py-8 flex flex-col items-center gap-4">
        <div className="flex gap-6 text-sm text-neutral-600">
          <a href="/feed.xml" className="hover:text-neutral-400 transition-colors" title="RSS Feed">
            RSS
          </a>
          <a href="https://github.com/Petsku01" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">
            GitHub
          </a>
          <a href="https://www.linkedin.com/in/petteri-kosonen-511907172/" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">
            LinkedIn
          </a>
        </div>
        <p className="text-neutral-600 text-sm">© 2026 Petteri Kosonen</p>
      </div>
    </footer>
  );
}

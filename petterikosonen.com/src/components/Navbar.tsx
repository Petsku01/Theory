import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/security-demos", label: "Security" },
  { href: "/kuu", label: "Kuu 🌙" },
];

export default function Navbar() {
  return (
    <nav className="border-b border-neutral-900" aria-label="Main navigation">
      <div className="h-14 flex items-center justify-between">
        <Link href="/" className="text-white font-medium focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded">
          Petteri Kosonen
        </Link>
        <div className="flex gap-6 text-sm text-neutral-500">
          {links.slice(1).map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 rounded px-1">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

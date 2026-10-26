"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Home"], ["/projects", "Projects"], ["/research", "Research"],
  ["/blog", "Blog"], ["/about", "About"], ["/labs", "Labs"],
  ["/kuu", "Kuu"], ["/contact", "Contact"],
] as const;

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className="site-wordmark">Petteri Kosonen<span>IT · Security · AI</span></Link>
      <nav aria-label="Main navigation">
        <ul className="site-nav">
          {links.map(([href, label]) => (
            <li key={href}><Link href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link></li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

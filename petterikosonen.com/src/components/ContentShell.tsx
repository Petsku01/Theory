"use client";

import { usePathname } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Page chrome above the mycelium canvas.
 * Home: main is pointer-events-none so ClickTargets receive hits;
 * navbar stays clickable, footer hidden. Other routes: main+footer as usual.
 */
export default function ContentShell({
  navbar,
  footer,
  children,
}: {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="pointer-events-none relative z-[45] flex min-h-screen flex-col">
      <div className="container-shell py-4">
        <div className="pointer-events-auto">{navbar}</div>
        <main
          id="main-content"
          role="main"
          className={`mt-8 flex-1 pb-12 ${isHome ? "" : "pointer-events-auto"}`}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      {!isHome && <div className="pointer-events-auto">{footer}</div>}
    </div>
  );
}

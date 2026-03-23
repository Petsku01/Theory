"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

interface ScrollProgressProps {
  sections: Array<{ id: string; label: string }>;
}

export default function ScrollProgress({ sections }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 140, damping: 24, mass: 0.2 });
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;

    const onScroll = () => {
      const midpoint = window.innerHeight * 0.32;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= midpoint && rect.bottom > midpoint) {
          setActive(section.id);
          break;
        }
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <aside
      className="pointer-events-none fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 xl:block"
      aria-label="Section progress navigation"
    >
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="relative h-48 w-[2px] overflow-hidden rounded bg-line-0">
          <motion.div className="absolute inset-x-0 top-0 origin-top bg-accent-cyan" style={{ scaleY }} />
        </div>
        <div className="space-y-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-label={`Jump to ${section.label}`}
              className={`block h-2.5 w-2.5 rounded-full border transition-colors ${
                active === section.id ? "border-accent-cyan bg-accent-cyan" : "border-line-1 bg-bg-2"
              }`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

"use client";

import { useTransmissionScramble } from "@/components/neural-cortex/hooks/useScramble";

type TagName = "span" | "p" | "h1" | "h2" | "h3";

type ScrambleTextProps = {
  text: string;
  className?: string;
  as?: TagName;
  durationMs?: number;
  delayMs?: number;
  cursor?: boolean;
  ariaLabel?: string;
};

export default function ScrambleText({
  text,
  className,
  as: Tag = "span",
  durationMs = 1200,
  delayMs = 0,
  cursor = true,
  ariaLabel,
}: ScrambleTextProps) {
  const { display, complete } = useTransmissionScramble(text, { durationMs, delayMs });

  return (
    <Tag className={className} aria-label={ariaLabel ?? text}>
      <span aria-hidden="true">{display}</span>
      {cursor ? (
        <span
          aria-hidden="true"
          data-complete={complete ? "1" : "0"}
          className="ml-[0.12em] inline-block h-[0.85em] w-[0.45ch] translate-y-[0.12em] animate-blink bg-cyan-400/90 motion-reduce:hidden"
        />
      ) : null}
    </Tag>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface TypeWriterProps {
  words: string[];
  typeMs?: number;
  pauseMs?: number;
  className?: string;
}

export default function TypeWriter({
  words,
  typeMs = 48,
  pauseMs = 1200,
  className,
}: TypeWriterProps) {
  const reduceMotion = useReducedMotion();
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const currentWord = useMemo(() => words[wordIndex % words.length] ?? "", [wordIndex, words]);

  useEffect(() => {
    if (reduceMotion || words.length === 0) return;

    if (charIndex < currentWord.length) {
      const id = setTimeout(() => setCharIndex((prev) => prev + 1), typeMs);
      return () => clearTimeout(id);
    }

    const id = setTimeout(() => {
      setCharIndex(0);
      setWordIndex((prev) => (prev + 1) % words.length);
    }, pauseMs);

    return () => clearTimeout(id);
  }, [charIndex, currentWord, pauseMs, reduceMotion, typeMs, words.length]);

  const text = reduceMotion ? words.join(" / ") : currentWord.slice(0, charIndex);

  return (
    <span className={`inline-flex items-center gap-2 font-mono text-sm text-accent-green ${className ?? ""}`}>
      <span>{text}</span>
      <span className="h-[1.05em] w-2 bg-accent-green animate-blink" aria-hidden="true" />
    </span>
  );
}

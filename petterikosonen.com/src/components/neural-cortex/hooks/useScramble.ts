"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureCortexWasm,
  isCortexWasmReady,
  getCortexWasm,
  writeU8ToWasm,
  freeWasmPtr,
} from "@/components/neural-cortex/utils";

// ── JS fallback chars ──
const JS_CHARS = "0123456789ABCDEF<>/\\";

// ── useScramble hook with WASM acceleration + JS fallback ──
export function useScramble(text: string, isHovered: boolean): string {
  const [display, setDisplay] = useState(text);
  const scrambleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scramblePtr = useRef<number>(0);
  const [, setWasmReadyFlag] = useState(false);

  const clearAll = useCallback(() => {
    if (scrambleIntervalRef.current) {
      clearInterval(scrambleIntervalRef.current);
      scrambleIntervalRef.current = null;
    }
    resolveTimersRef.current.forEach(clearTimeout);
    resolveTimersRef.current = [];
  }, []);

  // Cleanup WASM + timers on unmount
  useEffect(() => {
    return () => {
      clearAll();
      const wasm = getCortexWasm();
      if (scramblePtr.current && wasm) {
        try { wasm.__wbg_scramblesystem_free(scramblePtr.current, 0); } catch {}
        scramblePtr.current = 0;
      }
    };
  }, [clearAll]);

  // Init/re-init WASM scramble system when WASM becomes ready
  useEffect(() => {
    if (!isCortexWasmReady() || !getCortexWasm()) {
      if (!isCortexWasmReady()) {
        ensureCortexWasm().then((ok) => {
          if (ok) setWasmReadyFlag(true);
        });
      }
      return;
    }

    const wasm = getCortexWasm()!;
    if (!scramblePtr.current) {
      scramblePtr.current = wasm.scramblesystem_new();
    }

    return () => {
      if (scramblePtr.current && wasm) {
        try { wasm.__wbg_scramblesystem_free(scramblePtr.current, 0); } catch {}
        scramblePtr.current = 0;
      }
    };
  }, [scramblePtr.current]);

  useEffect(() => {
    if (isHovered) {
      clearAll();
      const finalText = text;
      const length = finalText.length;

      // WASM path
      const wasm = getCortexWasm();
      if (isCortexWasmReady() && wasm && scramblePtr.current && length > 0) {
        // Write char codes to WASM memory
        const charCodes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          charCodes[i] = finalText.charCodeAt(i);
        }

        const codesPtr = writeU8ToWasm(wasm, charCodes);
        const byteLen = charCodes.length;

        wasm.scramblesystem_init(scramblePtr.current, codesPtr, length);
        freeWasmPtr(wasm, codesPtr, byteLen);

        // Scramble interval: generate scrambled text via WASM
        scrambleIntervalRef.current = setInterval(() => {
          if (!scramblePtr.current || !getCortexWasm()) return;
          const w = getCortexWasm()!;
          w.scramblesystem_tick(scramblePtr.current);
          const dataPtr = w.scramblesystem_data_ptr(scramblePtr.current);
          const data = new Uint8Array(w.memory.buffer, dataPtr, length);
          setDisplay(String.fromCharCode(...data));
        }, 60);

        // Reveal one char at a time
        let revealIdx = 0;
        const revealNext = () => {
          if (revealIdx < length) {
            const w = getCortexWasm();
            if (!w || !scramblePtr.current) return;
            w.scramblesystem_reveal_next(scramblePtr.current);
            revealIdx++;

            if (w.scramblesystem_is_complete(scramblePtr.current)) {
              if (scrambleIntervalRef.current) {
                clearInterval(scrambleIntervalRef.current);
                scrambleIntervalRef.current = null;
              }
              setDisplay(finalText);
            } else {
              const timer = setTimeout(revealNext, 30);
              resolveTimersRef.current.push(timer);
            }
          }
        };
        const startTimer = setTimeout(revealNext, 120);
        resolveTimersRef.current.push(startTimer);

        return () => {
          clearAll();
          setDisplay(finalText);
        };
      }

      // JS fallback (original implementation)
      const revealed = new Array<boolean>(length).fill(false);

      scrambleIntervalRef.current = setInterval(() => {
        setDisplay((prev) =>
          finalText
            .split("")
            .map((char, i) => {
              if (revealed[i]) return finalText[i];
              if (char === " ") return " ";
              return JS_CHARS[Math.floor(Math.random() * JS_CHARS.length)];
            })
            .join("")
        );
      }, 60);

      let revealIndex = 0;
      const revealNext = () => {
        if (revealIndex < length) {
          revealed[revealIndex] = true;
          revealIndex++;
          const timer = setTimeout(revealNext, 30);
          resolveTimersRef.current.push(timer);
        } else {
          if (scrambleIntervalRef.current) {
            clearInterval(scrambleIntervalRef.current);
            scrambleIntervalRef.current = null;
          }
          setDisplay(finalText);
        }
      };
      const startTimer = setTimeout(revealNext, 120);
      resolveTimersRef.current.push(startTimer);

      return () => {
        clearAll();
        setDisplay(finalText);
      };
    } else {
      clearAll();
      setDisplay(text);
    }
  }, [isHovered, text, clearAll]);

  return display;
}

export type TransmissionScrambleOptions = {
  /** Total scramble→decode duration. Default 1200 ms. */
  durationMs?: number;
  /** Wait before decoding starts. */
  delayMs?: number;
};

/**
 * Mount-triggered glyph scatter → decode. Skips animation when
 * prefers-reduced-motion is set (final text immediately).
 */
export function useTransmissionScramble(
  text: string,
  options?: TransmissionScrambleOptions,
): { display: string; complete: boolean } {
  const durationMs = options?.durationMs ?? 1200;
  const delayMs = options?.delayMs ?? 0;
  const [display, setDisplay] = useState(text);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || text.length === 0) {
      setDisplay(text);
      setComplete(true);
      return;
    }

    setComplete(false);
    const length = text.length;
    let raf = 0;
    const t0 = performance.now();

    const paint = (nReveal: number) => {
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (i < nReveal) return text[i]!;
            if (char === " ") return " ";
            return JS_CHARS[Math.floor(Math.random() * JS_CHARS.length)]!;
          })
          .join(""),
      );
    };

    const tick = (now: number) => {
      const elapsed = now - t0 - delayMs;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const nReveal = Math.min(
        length,
        Math.floor((elapsed / Math.max(durationMs, 1)) * length),
      );
      if (nReveal >= length) {
        setDisplay(text);
        setComplete(true);
        return;
      }
      paint(nReveal);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      setDisplay(text);
    };
  }, [text, durationMs, delayMs]);

  return { display, complete };
}
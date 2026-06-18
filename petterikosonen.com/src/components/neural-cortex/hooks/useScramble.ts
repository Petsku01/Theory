"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── WASM scramble loader ──
// Loads wasm_cortex_bg.wasm for scramble char generation.

interface ScrambleWasmExports {
  memory: WebAssembly.Memory;
  scramblesystem_new(): number;
  scramblesystem_init(ptr: number, char_codes_ptr: number, len: number): void;
  scramblesystem_tick(ptr: number): number;
  scramblesystem_reveal_next(ptr: number): void;
  scramblesystem_is_complete(ptr: number): number;
  scramblesystem_reset(ptr: number): void;
  scramblesystem_len(ptr: number): number;
  scramblesystem_data_ptr(ptr: number): number;
  scramblesystem_target_char(ptr: number, index: number): number;
  __wbg_scramblesystem_free(ptr: number, del: number): void;
  __wbindgen_malloc(size: number, align: number): number;
  __wbindgen_free(ptr: number, len: number, align: number): void;
  __wbindgen_start(): void;
  __wbindgen_externrefs: WebAssembly.Table;
}

let scrambleWasm: ScrambleWasmExports | null = null;
let scrambleWasmPromise: Promise<boolean> | null = null;
let scrambleWasmReady = false;
let scrambleWasmFailed = false;

async function loadScrambleWasm(): Promise<boolean> {
  const response = await fetch("/wasm/wasm_cortex_bg.wasm");
  if (!response.ok) {
    throw new Error(`WASM fetch failed: ${response.status}`);
  }
  const { instance } = await WebAssembly.instantiateStreaming(response, {
    "./wasm_cortex_bg.js": {
      __wbg___wbindgen_throw_ea4887a5f8f9a9db: function (arg0: number, arg1: number) {
        throw new Error(`WASM throw at offset ${arg0}, len ${arg1}`);
      },
      __wbindgen_init_externref_table: function () {},
    },
  });
  const exports = instance.exports as unknown as ScrambleWasmExports;
  if (typeof exports.scramblesystem_new !== "function") {
    throw new Error("Missing required WASM export: scramblesystem_new");
  }
  if (exports.__wbindgen_start) {
    exports.__wbindgen_start();
  }
  scrambleWasm = exports;
  scrambleWasmReady = true;
  return true;
}

function ensureScrambleWasm(): Promise<boolean> {
  if (scrambleWasm) return Promise.resolve(true);
  if (scrambleWasmFailed) return Promise.resolve(false);
  scrambleWasmPromise ??= loadScrambleWasm().catch((err) => {
    console.warn("[scramble] WASM load failed, using JS fallback:", err);
    scrambleWasmPromise = null;
    scrambleWasmFailed = true;
    return false;
  });
  return scrambleWasmPromise;
}

if (typeof window !== "undefined") {
  ensureScrambleWasm();
}

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
      if (scramblePtr.current && scrambleWasm) {
        try { scrambleWasm.__wbg_scramblesystem_free(scramblePtr.current, 0); } catch {}
        scramblePtr.current = 0;
      }
    };
  }, [clearAll]);

  // Init/re-init WASM scramble system when WASM becomes ready
  useEffect(() => {
    if (!scrambleWasmReady || !scrambleWasm || scramblePtr.current) {
      if (!scrambleWasmReady && !scrambleWasmFailed) {
        ensureScrambleWasm().then((ok) => {
          if (ok) setWasmReadyFlag(true);
        });
      }
      return;
    }

    scramblePtr.current = scrambleWasm.scramblesystem_new();

    return () => {
      if (scramblePtr.current && scrambleWasm) {
        try { scrambleWasm.__wbg_scramblesystem_free(scramblePtr.current, 0); } catch {}
        scramblePtr.current = 0;
      }
    };
  }, [scrambleWasmReady]);

  useEffect(() => {
    if (isHovered) {
      clearAll();
      const finalText = text;
      const length = finalText.length;

      // WASM path
      if (scrambleWasmReady && scrambleWasm && scramblePtr.current && length > 0) {
        const wasm = scrambleWasm;

        // Write char codes to WASM memory
        const charCodes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          charCodes[i] = finalText.charCodeAt(i);
        }

        const byteLen = length * 1; // u8 = 1 byte
        const codesPtr = wasm.__wbindgen_malloc(byteLen, 1);
        if (codesPtr === 0) {
          // malloc failed, fall through to JS
          return;
        }
        const view = new Uint8Array(wasm.memory.buffer, codesPtr, length);
        view.set(charCodes);

        wasm.scramblesystem_init(scramblePtr.current, codesPtr, length);
        try { wasm.__wbindgen_free(codesPtr, byteLen, 1); } catch {}

        // Scramble interval: generate scrambled text via WASM
        scrambleIntervalRef.current = setInterval(() => {
          wasm.scramblesystem_tick(scramblePtr.current);
          const dataPtr = wasm.scramblesystem_data_ptr(scramblePtr.current);
          const data = new Uint8Array(wasm.memory.buffer, dataPtr, length);
          setDisplay(String.fromCharCode(...data));
        }, 60);

        // Reveal one char at a time
        let revealIdx = 0;
        const revealNext = () => {
          if (revealIdx < length) {
            wasm.scramblesystem_reveal_next(scramblePtr.current);
            revealIdx++;

            if (wasm.scramblesystem_is_complete(scramblePtr.current)) {
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
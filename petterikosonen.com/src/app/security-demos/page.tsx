"use client";

import SectionFrame from "@/components/SectionFrame";
import StatusPill from "@/components/StatusPill";
import { useMemo, useState } from "react";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

export default function SecurityDemos() {
  const [xssInput, setXssInput] = useState("");
  const [xssSafe, setXssSafe] = useState(true);

  const [hashInput, setHashInput] = useState("");
  const [hashes, setHashes] = useState<{ algo: string; hash: string }[]>([]);

  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [jwtInput, setJwtInput] = useState("");
  const [jwtDecoded, setJwtDecoded] = useState<{ header: string; payload: string; valid: boolean } | null>(null);

  const [encodeInput, setEncodeInput] = useState("");
  const [encodeType, setEncodeType] = useState<"base64" | "url" | "hex">("base64");

  const [sqlUsername, setSqlUsername] = useState("");
  const [sqlResults, setSqlResults] = useState<{ safe: string; unsafe: string } | null>(null);

  const generateHashes = async () => {
    if (!hashInput) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);
    const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

    const results = await Promise.all(
      algorithms.map(async (algo) => {
        const hashBuffer = await crypto.subtle.digest(algo, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
        return { algo, hash: hashHex };
      }),
    );

    setHashes(results);
  };

  const getPasswordAnalysis = (pass: string) => {
    const checks = [
      { test: pass.length >= 8, label: "8+ characters", weight: 1 },
      { test: pass.length >= 12, label: "12+ characters", weight: 1 },
      { test: pass.length >= 16, label: "16+ characters", weight: 1 },
      { test: /[a-z]/.test(pass), label: "Lowercase", weight: 1 },
      { test: /[A-Z]/.test(pass), label: "Uppercase", weight: 1 },
      { test: /\d/.test(pass), label: "Numbers", weight: 1 },
      { test: /[^a-zA-Z0-9\s]/.test(pass), label: "Special chars", weight: 1 },
      { test: !/(.)\1{2,}/.test(pass), label: "No repeating chars", weight: 1 },
      { test: !/^(password|123456|qwerty)/i.test(pass), label: "Not common", weight: 2 },
    ];

    const score = checks.reduce((acc, check) => acc + (check.test ? check.weight : 0), 0);
    const maxScore = checks.reduce((acc, check) => acc + check.weight, 0);
    const percentage = Math.round((score / maxScore) * 100);

    let charsetSize = 0;
    if (/[a-z]/.test(pass)) charsetSize += 26;
    if (/[A-Z]/.test(pass)) charsetSize += 26;
    if (/\d/.test(pass)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(pass)) charsetSize += 32;

    const entropy = pass.length * Math.log2(charsetSize || 1);
    const guessesPerSecond = 10_000_000_000;
    const logCombinations = pass.length * Math.log2(charsetSize || 1);
    const logSeconds = logCombinations - Math.log2(guessesPerSecond) - 1;

    let crackTime = "";
    if (logSeconds < 0) crackTime = "Instant";
    else if (logSeconds < 5.9) crackTime = `${Math.round(Math.pow(2, logSeconds))} seconds`;
    else if (logSeconds < 11.8) crackTime = `${Math.round(Math.pow(2, logSeconds) / 60)} minutes`;
    else if (logSeconds < 16.4) crackTime = `${Math.round(Math.pow(2, logSeconds) / 3600)} hours`;
    else if (logSeconds < 24.9) crackTime = `${Math.round(Math.pow(2, logSeconds) / 86400)} days`;
    else if (logSeconds < 34.8) crackTime = `${Math.round(Math.pow(2, logSeconds) / 31536000)} years`;
    else crackTime = "Centuries+";

    return { checks, percentage, entropy: entropy.toFixed(1), crackTime };
  };

  const base64UrlDecode = (str: string): string => {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const decodeJWT = () => {
    try {
      const parts = jwtInput.trim().split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT");

      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));

      setJwtDecoded({
        header: JSON.stringify(header, null, 2),
        payload: JSON.stringify(payload, null, 2),
        valid: true,
      });
    } catch {
      setJwtDecoded({ header: "", payload: "", valid: false });
    }
  };

  const simulateSql = () => {
    const unsafeQuery = `SELECT * FROM users WHERE username = '${sqlUsername}'`;
    const safeQuery = `SELECT * FROM users WHERE username = $1 -- param: "${sqlUsername}"`;
    setSqlResults({ unsafe: unsafeQuery, safe: safeQuery });
  };

  const passwordAnalysis = useMemo(
    () => (passwordInput ? getPasswordAnalysis(passwordInput) : null),
    [passwordInput],
  );
  const encoded = useMemo(() => {
    if (!encodeInput) return "";

    try {
      if (encodeType === "base64") {
        const encodedValue = btoa(bytesToBinary(new TextEncoder().encode(encodeInput)));
        return encodedValue;
      }

      if (encodeType === "url") {
        return encodeURIComponent(encodeInput);
      }

      const hex = Array.from(new TextEncoder().encode(encodeInput))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ");

      return hex;
    } catch {
      return "Error";
    }
  }, [encodeInput, encodeType]);
  const escapedXssInput = useMemo(() => escapeHtml(xssInput), [xssInput]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-10 shadow-terminal sm:px-8">
        <span className="section-label">/security-demos --interactive</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Security Demos</h1>
        <p className="mt-3 max-w-3xl text-text-1">Interactive browser-based demos for learning practical security concepts. No data leaves your device.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill label="educational only" variant="amber" />
          <StatusPill label="client-side" variant="green" />
        </div>
      </section>

      <SectionFrame command="/lab --xss-sql" title="Injection Fundamentals">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-line-0 bg-bg-2/75 p-5">
            <h2 className="text-xl font-semibold text-text-0">XSS Prevention</h2>
            <p className="mt-2 text-sm text-text-1">Try input: <code className="font-mono text-accent-cyan">&lt;img src=x onerror=alert(1)&gt;</code></p>
            <label htmlFor="xss-input" className="sr-only">XSS test input</label>
            <input
              id="xss-input"
              type="text"
              value={xssInput}
              onChange={(event) => setXssInput(event.target.value)}
              placeholder="Enter potentially malicious HTML"
              className="focus-outline mt-3 w-full rounded border border-line-1 bg-bg-1 px-3 py-2 text-sm text-text-0"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setXssSafe(true)}
                aria-pressed={xssSafe}
                className={`focus-outline rounded border px-3 py-1.5 text-xs font-mono uppercase tracking-[0.04em] ${xssSafe ? "border-accent-green/60 text-accent-green" : "border-line-1 text-text-2"}`}
              >
                Safe
              </button>
              <button
                type="button"
                onClick={() => setXssSafe(false)}
                aria-pressed={!xssSafe}
                className={`focus-outline rounded border px-3 py-1.5 text-xs font-mono uppercase tracking-[0.04em] ${!xssSafe ? "border-accent-red/60 text-accent-red" : "border-line-1 text-text-2"}`}
              >
                Unsafe
              </button>
            </div>
            <div className="mt-3 rounded border border-line-0 bg-bg-0 p-3">
              <p className="font-mono text-xs text-text-2">Output</p>
              {xssSafe ? (
                <div className="mt-2 break-all font-mono text-sm text-text-1">{xssInput || "(empty)"}</div>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-accent-red">
                    Unsafe execution is disabled here. This is the raw payload that would be dangerous if inserted as HTML.
                  </p>
                  <code className="block break-all rounded border border-accent-red/30 bg-accent-red/10 p-2 text-xs text-text-1">
                    {xssInput || "(empty)"}
                  </code>
                  <p className="text-xs text-text-2">Escaped preview:</p>
                  <code className="block break-all rounded border border-line-0 bg-bg-1 p-2 text-xs text-text-1">
                    {escapedXssInput || "(empty)"}
                  </code>
                </div>
              )}
            </div>
          </article>

          <article className="rounded-xl border border-line-0 bg-bg-2/75 p-5">
            <h2 className="text-xl font-semibold text-text-0">SQL Injection</h2>
            <p className="mt-2 text-sm text-text-1">Try input: <code className="font-mono text-accent-cyan">&apos; OR &apos;1&apos;=&apos;1</code></p>
            <label htmlFor="sql-input" className="sr-only">SQL injection test username</label>
            <div className="mt-3 flex gap-2">
              <input
                id="sql-input"
                type="text"
                value={sqlUsername}
                onChange={(event) => setSqlUsername(event.target.value)}
                placeholder="Enter username"
                className="focus-outline w-full rounded border border-line-1 bg-bg-1 px-3 py-2 text-sm text-text-0"
              />
              <button
                type="button"
                onClick={simulateSql}
                className="focus-outline rounded border border-accent-cyan/60 px-3 py-2 font-mono text-xs uppercase tracking-[0.04em] text-accent-cyan"
              >
                Query
              </button>
            </div>
            {sqlResults ? (
              <div className="mt-3 space-y-3">
                <div className="rounded border border-accent-red/40 bg-accent-red/10 p-3">
                  <p className="font-mono text-xs uppercase tracking-[0.05em] text-accent-red">Unsafe</p>
                  <code className="mt-1 block break-all text-xs text-text-1">{sqlResults.unsafe}</code>
                </div>
                <div className="rounded border border-accent-green/40 bg-accent-green/10 p-3">
                  <p className="font-mono text-xs uppercase tracking-[0.05em] text-accent-green">Safe</p>
                  <code className="mt-1 block break-all text-xs text-text-1">{sqlResults.safe}</code>
                </div>
              </div>
            ) : null}
          </article>
        </div>
      </SectionFrame>

      <SectionFrame command="/lab --crypto-auth" title="Crypto + Auth Tools">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-line-0 bg-bg-2/75 p-5">
            <h2 className="text-xl font-semibold text-text-0">Hash Generator</h2>
            <label htmlFor="hash-input" className="sr-only">Text to hash</label>
            <div className="mt-3 flex gap-2">
              <input
                id="hash-input"
                type="text"
                value={hashInput}
                onChange={(event) => setHashInput(event.target.value)}
                placeholder="Enter text to hash"
                className="focus-outline w-full rounded border border-line-1 bg-bg-1 px-3 py-2 text-sm text-text-0"
              />
              <button
                type="button"
                onClick={generateHashes}
                className="focus-outline rounded border border-accent-cyan/60 px-3 py-2 font-mono text-xs uppercase tracking-[0.04em] text-accent-cyan"
              >
                Generate
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {hashes.map((hash) => (
                <div key={hash.algo} className="rounded border border-line-0 bg-bg-0 p-3">
                  <p className="font-mono text-xs text-text-2">{hash.algo}</p>
                  <code className="mt-1 block break-all text-xs text-text-1">{hash.hash}</code>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-line-0 bg-bg-2/75 p-5">
            <h2 className="text-xl font-semibold text-text-0">JWT Decoder</h2>
            <label htmlFor="jwt-input" className="sr-only">JWT token to decode</label>
            <textarea
              id="jwt-input"
              value={jwtInput}
              onChange={(event) => setJwtInput(event.target.value)}
              placeholder="Paste a JWT token"
              className="focus-outline mt-3 h-24 w-full resize-none rounded border border-line-1 bg-bg-1 px-3 py-2 font-mono text-xs text-text-1"
            />
            <button
              type="button"
              onClick={decodeJWT}
              className="focus-outline mt-3 rounded border border-accent-cyan/60 px-3 py-2 font-mono text-xs uppercase tracking-[0.04em] text-accent-cyan"
            >
              Decode
            </button>
            {jwtDecoded ? (
              jwtDecoded.valid ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded border border-line-0 bg-bg-0 p-3">
                    <p className="font-mono text-xs text-text-2">Header</p>
                    <pre className="mt-1 overflow-auto text-xs text-accent-cyan">{jwtDecoded.header}</pre>
                  </div>
                  <div className="rounded border border-line-0 bg-bg-0 p-3">
                    <p className="font-mono text-xs text-text-2">Payload</p>
                    <pre className="mt-1 overflow-auto text-xs text-accent-green">{jwtDecoded.payload}</pre>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-accent-red">Invalid JWT format.</p>
              )
            ) : null}
          </article>
        </div>
      </SectionFrame>

      <SectionFrame command="/lab --password-encoding" title="Password + Encoding">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-line-0 bg-bg-2/75 p-5">
            <h2 className="text-xl font-semibold text-text-0">Password Analyzer</h2>
            <div className="relative mt-3">
              <label htmlFor="password-input" className="sr-only">Password to analyze</label>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="Enter password"
                className="focus-outline w-full rounded border border-line-1 bg-bg-1 px-3 py-2 pr-16 font-mono text-sm text-text-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="focus-outline absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 font-mono text-xs text-text-2"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {passwordAnalysis && passwordInput ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-text-1">Strength</span>
                    <span className={passwordAnalysis.percentage >= 70 ? "text-accent-green" : passwordAnalysis.percentage >= 40 ? "text-accent-amber" : "text-accent-red"}>
                      {passwordAnalysis.percentage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-line-0">
                    <div
                      className={`h-full ${passwordAnalysis.percentage >= 70 ? "bg-accent-green" : passwordAnalysis.percentage >= 40 ? "bg-accent-amber" : "bg-accent-red"}`}
                      style={{ width: `${passwordAnalysis.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded border border-line-0 bg-bg-0 p-3">
                    <p className="font-mono text-xs text-text-2">Entropy</p>
                    <p className="mt-1 font-mono text-sm text-text-1">{passwordAnalysis.entropy} bits</p>
                  </div>
                  <div className="rounded border border-line-0 bg-bg-0 p-3">
                    <p className="font-mono text-xs text-text-2">Time to crack</p>
                    <p className="mt-1 font-mono text-sm text-text-1">{passwordAnalysis.crackTime}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {passwordAnalysis.checks.map((check) => (
                    <p
                      key={check.label}
                      className={`rounded border px-2 py-1 text-xs ${check.test ? "border-accent-green/40 bg-accent-green/10 text-accent-green" : "border-line-0 bg-bg-0 text-text-2"}`}
                    >
                      {check.test ? "OK" : "--"} {check.label}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          <article className="rounded-xl border border-line-0 bg-bg-2/75 p-5">
            <h2 className="text-xl font-semibold text-text-0">Encoding Tools</h2>
            <div className="mt-3 flex gap-2">
              {(["base64", "url", "hex"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEncodeType(type)}
                  className={`focus-outline rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.04em] ${encodeType === type ? "border-accent-cyan/60 text-accent-cyan" : "border-line-1 text-text-2"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <label htmlFor="encode-input" className="sr-only">Text to encode</label>
            <input
              id="encode-input"
              type="text"
              value={encodeInput}
              onChange={(event) => setEncodeInput(event.target.value)}
              placeholder="Enter text"
              className="focus-outline mt-3 w-full rounded border border-line-1 bg-bg-1 px-3 py-2 text-sm text-text-0"
            />
            {encodeInput ? (
              <div className="mt-3 rounded border border-line-0 bg-bg-0 p-3">
                <p className="font-mono text-xs text-text-2">Encoded ({encodeType.toUpperCase()})</p>
                <code className="mt-1 block break-all text-xs text-accent-cyan">{encoded}</code>
              </div>
            ) : null}
          </article>
        </div>
      </SectionFrame>

      <SectionFrame command="/security --repositories" title="More Security Projects">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { name: "Polymorphic Malware Detection", lang: "Python", url: "https://github.com/Petsku01/Theory/blob/main/malware_detection_polymorph_demo.py" },
            { name: "Honeypot System", lang: "Python", url: "https://github.com/Petsku01/Theory/tree/main/Hpots" },
            { name: "Pentesting Tools", lang: "Various", url: "https://github.com/Petsku01/Theory/tree/main/Pentesting" },
            { name: "Hash Generator", lang: "HTML/JS", url: "https://github.com/Petsku01/Theory/blob/main/Hash_Generator.html" },
          ].map((project) => (
            <a
              key={project.url}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-outline flex items-center justify-between rounded-xl border border-line-0 bg-bg-2/75 p-4 transition-colors hover:border-accent-cyan/45"
            >
              <span className="text-sm text-text-1">{project.name}</span>
              <span className="font-mono text-xs uppercase tracking-[0.04em] text-text-2">{project.lang}</span>
            </a>
          ))}
        </div>
      </SectionFrame>
    </div>
  );
}

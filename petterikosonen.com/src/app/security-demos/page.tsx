"use client";
import { useState, useMemo } from "react";

export default function SecurityDemos() {
  // XSS Demo
  const [xssInput, setXssInput] = useState("");
  const [xssSafe, setXssSafe] = useState(true);

  // Hash Generator
  const [hashInput, setHashInput] = useState("");
  const [hashes, setHashes] = useState<{ algo: string; hash: string }[]>([]);

  // Password Checker
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // JWT Decoder
  const [jwtInput, setJwtInput] = useState("");
  const [jwtDecoded, setJwtDecoded] = useState<{ header: string; payload: string; valid: boolean } | null>(null);

  // Encoding Tools
  const [encodeInput, setEncodeInput] = useState("");
  const [encodeType, setEncodeType] = useState<"base64" | "url" | "hex">("base64");

  // SQL Injection
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
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return { algo, hash: hashHex };
      })
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
    
    const score = checks.reduce((acc, c) => acc + (c.test ? c.weight : 0), 0);
    const maxScore = checks.reduce((acc, c) => acc + c.weight, 0);
    const percentage = Math.round((score / maxScore) * 100);
    
    // Entropy calculation
    let charsetSize = 0;
    if (/[a-z]/.test(pass)) charsetSize += 26;
    if (/[A-Z]/.test(pass)) charsetSize += 26;
    if (/\d/.test(pass)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(pass)) charsetSize += 32;
    const entropy = pass.length * Math.log2(charsetSize || 1);
    
    // Time to crack estimation (using log to avoid Infinity for long passwords)
    const guessesPerSecond = 10_000_000_000; // 10 billion (GPU)
    const logCombinations = pass.length * Math.log2(charsetSize || 1);
    const logSeconds = logCombinations - Math.log2(guessesPerSecond) - 1; // div by 2 = -1 in log2
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

  // Base64URL to standard Base64 conversion for JWT decoding
  const base64UrlDecode = (str: string): string => {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    return atob(base64);
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
        valid: true
      });
    } catch {
      setJwtDecoded({ header: "", payload: "", valid: false });
    }
  };

  const getEncoded = () => {
    if (!encodeInput) return { encoded: "", decoded: "" };
    try {
      if (encodeType === "base64") {
        const encoded = btoa(String.fromCodePoint(...new TextEncoder().encode(encodeInput)));
        return { encoded, decoded: encodeInput };
      } else if (encodeType === "url") {
        return { encoded: encodeURIComponent(encodeInput), decoded: encodeInput };
      } else {
        const hex = Array.from(new TextEncoder().encode(encodeInput))
          .map(b => b.toString(16).padStart(2, "0")).join(" ");
        return { encoded: hex, decoded: encodeInput };
      }
    } catch {
      return { encoded: "Error", decoded: "" };
    }
  };

  const simulateSql = () => {
    const unsafeQuery = `SELECT * FROM users WHERE username = '${sqlUsername}'`;
    const safeQuery = `SELECT * FROM users WHERE username = $1 -- param: "${sqlUsername}"`;
    setSqlResults({ unsafe: unsafeQuery, safe: safeQuery });
  };

  const passwordAnalysis = useMemo(
    () => (passwordInput ? getPasswordAnalysis(passwordInput) : null),
    [passwordInput]
  );
  const encoded = useMemo(() => getEncoded(), [encodeInput, encodeType]);

  return (
    <div>
      <section className="py-20">
        <h1 className="text-3xl font-medium text-white mb-4">Security Demos</h1>
        <p className="text-neutral-400">Interactive security demonstrations. Everything runs client-side.</p>
      </section>

      <section className="pb-20 space-y-16">
        <div className="p-4 bg-yellow-900/20 border border-yellow-800/50 text-yellow-200/80 text-sm rounded">
          ⚠️ Educational purposes only. No data leaves your browser.
        </div>

        {/* XSS Demo */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl text-white">XSS Prevention</h3>
            <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded">Beginner</span>
          </div>
          <p className="text-sm text-neutral-500 mb-4">
            Cross-Site Scripting injects malicious scripts. Try: <code className="text-neutral-400">&lt;img src=x onerror=alert(1)&gt;</code>
          </p>
          
          <label htmlFor="xss-input" className="sr-only">XSS test input</label>
          <input
            id="xss-input"
            type="text"
            value={xssInput}
            onChange={(e) => setXssInput(e.target.value)}
            placeholder="Enter potentially malicious HTML..."
            className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded text-white text-sm mb-3 font-mono focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
          
          <div className="flex gap-2 mb-3">
            <button onClick={() => setXssSafe(true)} aria-pressed={xssSafe} className={`px-3 py-2 text-sm rounded transition-colors ${xssSafe ? "bg-green-800 text-white" : "bg-neutral-800 text-neutral-400"}`}>
              Safe (Escaped)
            </button>
            <button onClick={() => setXssSafe(false)} aria-pressed={!xssSafe} className={`px-3 py-2 text-sm rounded transition-colors ${!xssSafe ? "bg-red-800 text-white" : "bg-neutral-800 text-neutral-400"}`}>
              Unsafe (Raw HTML)
            </button>
          </div>
          
          <div className="p-4 bg-neutral-950 rounded border border-neutral-800">
            <p className="text-xs text-neutral-600 mb-2">Output:</p>
            {xssSafe ? (
              <div className="text-neutral-300 font-mono text-sm break-all">{xssInput || "(empty)"}</div>
            ) : (
              <iframe
                sandbox=""
                title="XSS demo output"
                srcDoc={`<!DOCTYPE html><html><head><style>body{background:#0a0a0a;color:#d4d4d4;font-family:monospace;font-size:14px;margin:8px;}</style></head><body>${xssInput || "(empty)"}</body></html>`}
                className="w-full h-24 rounded border-0"
              />
            )}
          </div>
          {!xssSafe && xssInput && (
            <p className="text-xs text-red-400 mt-2">⚠️ Never use dangerouslySetInnerHTML with user input!</p>
          )}
        </div>

        {/* SQL Injection */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl text-white">SQL Injection</h3>
            <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">Intermediate</span>
          </div>
          <p className="text-sm text-neutral-500 mb-4">
            Try: <code className="text-neutral-400">&apos; OR &apos;1&apos;=&apos;1</code> or <code className="text-neutral-400">&apos;; DROP TABLE users; --</code>
          </p>
          
          <div className="flex gap-2 mb-3">
            <label htmlFor="sql-input" className="sr-only">SQL injection test username</label>
            <input
              id="sql-input"
              type="text"
              value={sqlUsername}
              onChange={(e) => setSqlUsername(e.target.value)}
              placeholder="Enter username..."
              className="flex-1 p-3 bg-neutral-900 border border-neutral-800 rounded text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-500"
            />
            <button onClick={simulateSql} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500">
              Query
            </button>
          </div>
          
          {sqlResults && (
            <div className="space-y-3">
              <div className="p-4 bg-red-950/30 rounded border border-red-900/50">
                <p className="text-xs text-red-400 mb-2">❌ Unsafe (String Concatenation):</p>
                <code className="text-sm text-red-300 font-mono break-all">{sqlResults.unsafe}</code>
              </div>
              <div className="p-4 bg-green-950/30 rounded border border-green-900/50">
                <p className="text-xs text-green-400 mb-2">✓ Safe (Parameterized Query):</p>
                <code className="text-sm text-green-300 font-mono break-all">{sqlResults.safe}</code>
              </div>
            </div>
          )}
        </div>

        {/* Hash Generator */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl text-white">Hash Generator</h3>
            <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">Tool</span>
          </div>
          <p className="text-sm text-neutral-500 mb-4">Generate cryptographic hashes using Web Crypto API.</p>
          
          <div className="flex gap-2 mb-4">
            <label htmlFor="hash-input" className="sr-only">Text to hash</label>
            <input
              id="hash-input"
              type="text"
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="Enter text to hash..."
              className="flex-1 p-3 bg-neutral-900 border border-neutral-800 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
            />
            <button onClick={generateHashes} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500">
              Generate
            </button>
          </div>
          
          {hashes.length > 0 && (
            <div className="space-y-2">
              {hashes.map((h) => (
                <div key={h.algo} className="p-3 bg-neutral-950 rounded border border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-1">{h.algo}</p>
                  <code className="text-xs text-neutral-300 font-mono break-all">{h.hash}</code>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password Strength */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl text-white">Password Analyzer</h3>
            <span className="text-xs px-2 py-1 bg-purple-900/30 text-purple-400 rounded">Tool</span>
          </div>
          <p className="text-sm text-neutral-500 mb-4">Analyze password strength with entropy calculation and crack time estimation.</p>
          
          <div className="relative mb-4">
            <label htmlFor="password-input" className="sr-only">Password to analyze</label>
            <input
              id="password-input"
              type={showPassword ? "text" : "password"}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password to analyze..."
              className="w-full p-3 pr-20 bg-neutral-900 border border-neutral-800 rounded text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-500"
            />
            <button 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-neutral-400 hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          
          {passwordAnalysis && passwordInput && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-400">Strength</span>
                  <span className={passwordAnalysis.percentage >= 70 ? "text-green-400" : passwordAnalysis.percentage >= 40 ? "text-yellow-400" : "text-red-400"}>
                    {passwordAnalysis.percentage}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-800 rounded overflow-hidden">
                  <div 
                    className={`h-full transition-all ${passwordAnalysis.percentage >= 70 ? "bg-green-500" : passwordAnalysis.percentage >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${passwordAnalysis.percentage}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-neutral-950 rounded">
                  <p className="text-neutral-500 text-xs mb-1">Entropy</p>
                  <p className="text-white font-mono">{passwordAnalysis.entropy} bits</p>
                </div>
                <div className="p-3 bg-neutral-950 rounded">
                  <p className="text-neutral-500 text-xs mb-1">Time to Crack (10B/s)</p>
                  <p className="text-white font-mono">{passwordAnalysis.crackTime}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {passwordAnalysis.checks.map((c, i) => (
                  <div key={i} className={`text-xs p-2 rounded ${c.test ? "bg-green-950/30 text-green-400" : "bg-neutral-900 text-neutral-500"}`}>
                    {c.test ? "✓" : "○"} {c.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* JWT Decoder */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl text-white">JWT Decoder</h3>
            <span className="text-xs px-2 py-1 bg-orange-900/30 text-orange-400 rounded">Advanced</span>
          </div>
          <p className="text-sm text-neutral-500 mb-4">Decode JSON Web Tokens to inspect header and payload.</p>
          
          <label htmlFor="jwt-input" className="sr-only">JWT token to decode</label>
          <textarea
            id="jwt-input"
            value={jwtInput}
            onChange={(e) => setJwtInput(e.target.value)}
            placeholder="Paste a JWT token (eyJhbGc...)..."
            className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded text-white text-sm font-mono h-20 resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
          <button onClick={decodeJWT} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded transition-colors mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-500">
            Decode
          </button>
          
          {jwtDecoded && (
            jwtDecoded.valid ? (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-4 bg-neutral-950 rounded border border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-2">Header</p>
                  <pre className="text-xs text-blue-300 font-mono overflow-auto">{jwtDecoded.header}</pre>
                </div>
                <div className="p-4 bg-neutral-950 rounded border border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-2">Payload</p>
                  <pre className="text-xs text-green-300 font-mono overflow-auto">{jwtDecoded.payload}</pre>
                </div>
              </div>
            ) : (
              <p className="text-red-400 text-sm">Invalid JWT format</p>
            )
          )}
        </div>

        {/* Encoding Tools */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl text-white">Encoding Tools</h3>
            <span className="text-xs px-2 py-1 bg-cyan-900/30 text-cyan-400 rounded">Tool</span>
          </div>
          <p className="text-sm text-neutral-500 mb-4">Encode and decode data in various formats.</p>
          
          <div className="flex gap-2 mb-3">
            {(["base64", "url", "hex"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setEncodeType(type)}
                className={`px-3 py-2 text-sm rounded transition-colors ${encodeType === type ? "bg-cyan-800 text-white" : "bg-neutral-800 text-neutral-400"}`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
          
          <label htmlFor="encode-input" className="sr-only">Text to encode</label>
          <input
            id="encode-input"
            type="text"
            value={encodeInput}
            onChange={(e) => setEncodeInput(e.target.value)}
            placeholder="Enter text to encode..."
            className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded text-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
          
          {encodeInput && (
            <div className="p-4 bg-neutral-950 rounded border border-neutral-800">
              <p className="text-xs text-neutral-500 mb-2">Encoded ({encodeType.toUpperCase()}):</p>
              <code className="text-sm text-cyan-300 font-mono break-all">{encoded.encoded}</code>
            </div>
          )}
        </div>

        {/* GitHub Links */}
        <div>
          <h3 className="text-xl text-white mb-4">More Security Projects</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { name: "Polymorphic Malware Detection", lang: "Python", url: "https://github.com/Petsku01/Theory/blob/main/malware_detection_polymorph_demo.py" },
              { name: "Honeypot System", lang: "Python", url: "https://github.com/Petsku01/Theory/tree/main/Hpots" },
              { name: "Pentesting Tools", lang: "Various", url: "https://github.com/Petsku01/Theory/tree/main/Pentesting" },
              { name: "Hash Generator", lang: "HTML/JS", url: "https://github.com/Petsku01/Theory/blob/main/Hash_Generator.html" },
            ].map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 transition-colors">
                <span className="text-white text-sm">{p.name}</span>
                <span className="text-neutral-500 text-xs">{p.lang} →</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

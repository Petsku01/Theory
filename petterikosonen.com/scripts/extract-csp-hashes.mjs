#!/usr/bin/env node
/**
 * Extract inline <script> / <style> bodies from the Next SSG output and write
 * sha256 CSP hashes to next.config.csp.json. Idempotent: same build → same file.
 *
 * Usage: node scripts/extract-csp-hashes.mjs   (also hooked as postbuild)
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "next.config.csp.json");
const SCAN_DIRS = [
  join(ROOT, ".next/server/app"),
  join(ROOT, ".next/static"),
];

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const STYLE_RE = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
const STYLE_ATTR_RE = /\sstyle="([^"]*)"/gi;
const HAS_SRC = /\bsrc\s*=/i;

function sha256(content) {
  return `'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;
}

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}

function extract(html, scriptSet, styleSet) {
  SCRIPT_RE.lastIndex = 0;
  for (const match of html.matchAll(SCRIPT_RE)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    if (HAS_SRC.test(attrs)) continue;
    if (body.length === 0) continue;
    scriptSet.add(sha256(body));
  }
  STYLE_RE.lastIndex = 0;
  for (const match of html.matchAll(STYLE_RE)) {
    const body = match[2] ?? "";
    if (body.length === 0) continue;
    styleSet.add(sha256(body));
  }
  STYLE_ATTR_RE.lastIndex = 0;
  for (const match of html.matchAll(STYLE_ATTR_RE)) {
    const body = match[1] ?? "";
    if (body.length === 0) continue;
    styleSet.add(sha256(body));
  }
}

const scriptSet = new Set();
const styleSet = new Set();
const scanned = [];

for (const dir of SCAN_DIRS) {
  for await (const path of walk(dir)) {
    const lower = path.toLowerCase();
    if (!lower.endsWith(".html") && !lower.endsWith(".htm")) continue;
    const html = await readFile(path, "utf8");
    extract(html, scriptSet, styleSet);
    scanned.push(relative(ROOT, path));
  }
}

const scriptHashes = [...scriptSet].sort();
const styleHashes = [...styleSet].sort();
const payload = {
  scriptHashes,
  styleHashes,
  scriptCount: scriptHashes.length,
  styleCount: styleHashes.length,
  scannedFiles: scanned.sort(),
};

await mkdir(dirname(OUT), { recursive: true });
const serialized = `${JSON.stringify(payload, null, 2)}\n`;
await writeFile(OUT, serialized, "utf8");

const csp = [
  "default-src 'self'",
  `script-src ${["'self'", "'wasm-unsafe-eval'", ...scriptHashes].join(" ")}`,
  `style-src ${["'self'", "'unsafe-hashes'", ...styleHashes].join(" ")}`,
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Next bakes headers() into routes-manifest at build time; turbopack
// flight hashes change every compile, so patch the manifest to THIS build.
const manifestPath = join(ROOT, ".next/routes-manifest.json");
try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  let patched = 0;
  for (const route of manifest.headers ?? []) {
    for (const header of route.headers ?? []) {
      if (header.key === "Content-Security-Policy") {
        header.value = csp;
        patched += 1;
      }
    }
  }
  if (patched === 0) {
    console.warn("CSP: no Content-Security-Policy entry in routes-manifest.json");
  } else {
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    console.log(`CSP patched routes-manifest.json (${patched} header${patched === 1 ? "" : "s"})`);
  }
} catch (err) {
  if (err && err.code === "ENOENT") {
    console.warn("CSP: .next/routes-manifest.json missing — run next build first");
  } else {
    throw err;
  }
}

console.log(
  `CSP hashes: ${scriptHashes.length} script, ${styleHashes.length} style from ${scanned.length} html → ${relative(ROOT, OUT)}`,
);

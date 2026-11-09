#!/usr/bin/env node
/**
 * Per-route CSP hashes from Next SSG HTML.
 *
 * Reads prerendered HTML for each route from BOTH known Next 16 layouts:
 *   (a) .next/server/app/{index,blog,...}.html (also nested index.html /
 *       labs/llm.html), and
 *   (b) Vercel adapter builds (NEXT_ADAPTER_PATH) where useScopedBuildArtifacts
 *       moves prerendered HTML to .next/server/route-cache/APP_PAGE/<sha>/$/
 *       instead of .next/server/app/ — every prerendered .html under .next is
 *       indexed by route-relative key so any layout change keeps working.
 *
 * Writes next.config.csp.json:
 *
 *   { "routes": { "/": { "scriptHashes": [...], "styleHashes": [...] }, ... } }
 *
 * Then patches .next/routes-manifest.json so THIS build's hashes are served
 * (Next bakes headers() at compile time; turbopack flight hashes change).
 *
 * Paths are __dirname-relative (optional argv[2] site root). Cwd may be the
 * git root or the site directory. Idempotent: same HTML → same JSON.
 *
 * Usage: node scripts/extract-csp-hashes.mjs [siteRoot]
 */
import { createHash } from "node:crypto";
import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(process.argv[2] || join(SCRIPT_DIR, ".."));
const OUT = join(ROOT, "next.config.csp.json");
const APP_DIR = join(ROOT, ".next/server/app");
const MANIFEST = join(ROOT, ".next/routes-manifest.json");

const REQUIRED_ROUTES = [
  "/",
  "/about",
  "/blog",
  "/projects",
  "/research",
  "/contact",
  "/kuu",
  "/labs",
  "/labs/llm",
  "/labs/security",
];

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const STYLE_RE = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
const STYLE_ATTR_RE = /\sstyle="([^"]*)"/gi;
const HAS_SRC = /\bsrc\s*=/i;

function sha256(content) {
  return `'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;
}

// Next 16 adapter builds (Vercel sets NEXT_ADAPTER_PATH) move prerendered HTML
// to .next/server/route-cache/APP_PAGE/<sha>/$/<route>.html instead of
// .next/server/app/<route>.html. Index every prerendered .html under .next by
// route-relative keys so both layouts — and future layout changes — resolve.
async function collectHtmlIndex() {
  const base = join(ROOT, ".next");
  const index = new Map();
  const add = (key, path) => {
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(path);
  };
  let files = [];
  try {
    files = await readdir(base, { recursive: true });
  } catch {
    /* no .next at all — index stays empty, routes resolve as missing */
  }
  for (const f of files) {
    if (!f.endsWith(".html")) continue;
    const abs = join(base, f);
    add(f, abs); // generic full-relative key
    if (f.startsWith("server/app/")) {
      add(f.slice("server/app/".length), abs); // classic app layout
    }
    const dollarParts = f.split("/$/");
    if (dollarParts.length > 1) {
      add(dollarParts[dollarParts.length - 1], abs); // adapter route-cache
    }
  }
  return index;
}

async function firstExisting(paths) {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      /* try next */
    }
  }
  return null;
}

function extract(html) {
  const scriptSet = new Set();
  const styleSet = new Set();
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
  return {
    scriptHashes: [...scriptSet].sort(),
    styleHashes: [...styleSet].sort(),
  };
}

function buildCsp({ scriptHashes = [], styleHashes = [] }) {
  const scriptSrc = ["'self'", "'wasm-unsafe-eval'", ...scriptHashes].join(" ");
  // Styles are low-risk: keep hashes + unsafe-hashes + unsafe-inline so React
  // inline style="" never blocks render. Scripts stay hash-strict (no unsafe-inline).
  const styleSrc = ["'self'", "'unsafe-hashes'", "'unsafe-inline'", ...styleHashes].join(" ");
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function normalizeSource(source) {
  if (!source || source === "/") return "/";
  return source.replace(/\/+$/, "") || "/";
}

const routes = {};
const scanned = [];
const missing = [];

const htmlIndex = await collectHtmlIndex();

for (const route of REQUIRED_ROUTES) {
  const rel = route === "/" ? "index" : route.replace(/^\//, "");
  const path = await firstExisting([
    ...(htmlIndex.get(`${rel}.html`) ?? []),
    ...(htmlIndex.get(`${rel}/index.html`) ?? []),
  ]);
  if (!path) {
    missing.push(route);
    routes[route] = { scriptHashes: [], styleHashes: [] };
    continue;
  }
  const html = await readFile(path, "utf8");
  routes[route] = extract(html);
  scanned.push(`${route} ← ${relative(ROOT, path)}`);
}

if (missing.length) {
  throw new Error(
    `CSP: no prerendered HTML for ${missing.join(", ")} under .next/server/{app,route-cache} (run next build first)`,
  );
}

const payload = { routes };
const serialized = `${JSON.stringify(payload, null, 2)}\n`;
await writeFile(OUT, serialized, "utf8");

try {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  let patched = 0;
  for (const entry of manifest.headers ?? []) {
    const src = normalizeSource(entry.source);
    const hashes = routes[src];
    if (!hashes) continue;
    const csp = buildCsp(hashes);
    let found = false;
    for (const header of entry.headers ?? []) {
      if (header.key === "Content-Security-Policy") {
        header.value = csp;
        found = true;
      }
    }
    if (!found) {
      entry.headers = entry.headers ?? [];
      entry.headers.push({ key: "Content-Security-Policy", value: csp });
    }
    patched += 1;
  }
  if (patched === 0) {
    console.warn("CSP: no per-route Content-Security-Policy entries in routes-manifest.json");
  } else {
    await writeFile(MANIFEST, `${JSON.stringify(manifest)}\n`, "utf8");
    console.log(`CSP patched routes-manifest.json (${patched} route${patched === 1 ? "" : "s"})`);
  }
} catch (err) {
  if (err && err.code === "ENOENT") {
    console.warn("CSP: .next/routes-manifest.json missing — run next build first");
  } else {
    throw err;
  }
}

const summary = REQUIRED_ROUTES.map((route) => {
  const r = routes[route];
  return `${route}:${r.scriptHashes.length}s/${r.styleHashes.length}c`;
}).join(" ");
console.log(
  `CSP hashes per-route (${REQUIRED_ROUTES.length}) ${summary} → ${relative(ROOT, OUT)}`,
);
for (const line of scanned) console.log(`  ${line}`);

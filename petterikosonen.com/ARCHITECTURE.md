# petterikosonen.com — arkkitehtuuri

Lopputila 2026-11-09. HEAD `267f8a4` + C1a/C1b (dead V4 / FlowFieldParticles / pillarit pois puskurissa). Kooditermit EN.

## 1. Yleiskuva

Next.js **16.2** (App Router, **Turbopack** `next build` / `next dev`) + **React 19** + **TypeScript 5** (strict, `@/*` → `./src/*`) + **Tailwind CSS 4**. 3D: `three` + `@react-three/fiber` + `@react-three/drei` (`OrbitControls`). Animaatio: `framer-motion` (splash, ClusterInfoPanel, TitleOverlay).

**wasm-cortex** (Rust → `wasm-pack build --target web --out-dir pkg`). Binääri `wasm-cortex/pkg/wasm_cortex_bg.wasm` on gitissä; `build:wasm` kopioi sen `public/wasm/`. Runtime lataa **vain** `.wasm`:n (`fetch("/wasm/wasm_cortex_bg.wasm")` + `WebAssembly.instantiateStreaming`) — glue JS ei ole bundlessa. Toolchain: `rust-std-wasm32` Fedora `dnf`:llä, `wasm-pack` `cargo install`:lla.

Sivusto = staattinen portfolio + site-wide mycelium-canvas. Canvas layoutissa kaikille reiteille; klusteri-interaktio vain `/`.

## 2. Reitit

Kaikki sivureitit **Static** (SSG). Dynamic = Route Handler.

| # | reitti | tyyppi | lähde | sisältö |
|---|--------|--------|-------|---------|
| 1 | `/` | Static | `app/page.tsx` | HomeClient → NeuralCortex-overlayt |
| 2 | `/about` | Static | `app/about/page.tsx` | SectionFrame |
| 3 | `/projects` | Static | `app/projects/page.tsx` | TerminalProjectCard |
| 4 | `/blog` | Static | `app/blog/page.tsx` | lista `lib/data.ts` |
| 5 | `/research` | Static | `app/research/page.tsx` | lista |
| 6 | `/contact` | Static | `app/contact/page.tsx` | ContactConsole |
| 7 | `/kuu` | Static | `app/kuu/page.tsx` | identiteetti |
| 8 | `/labs` | Static | `app/labs/page.tsx` | indeksi |
| 9 | `/labs/llm` | Static | `app/labs/llm/page.tsx` | client-demot |
| 10 | `/labs/security` | Static | `app/labs/security/page.tsx` | client-demot |
| 11 | `/feed.xml` | **Dynamic** | `app/feed.xml/route.ts` | RSS GET |
| 12 | `/sitemap.xml` | Static | `app/sitemap.ts` | 10 URL:ia |
| 13 | 404 | Static | `app/not-found.tsx` | not-found |

`error.tsx` = runtime-error UI, ei URL. `robots.txt` = `public/`. Navbar: `/projects` `/blog` `/research` `/labs` `/kuu` `/about` (+ contact-linkki).

## 3. Visuaalipipeline

```
layout.tsx
└─ CortexInteractionProvider          interactive = (pathname === "/")
   ├─ AmbientBackground               -z-20, aina
   ├─ MyceliumBackground              z-0; prefers-reduced-motion → null (ei canvas)
   │    └─ lazy CortexCanvas → R3F Canvas → CortexScene
   │         ├─ MyceliumField
   │         ├─ ClickTarget ×4         vain interactive
   │         ├─ CameraController       WASM camerasystem
   │         ├─ OrbitControls
   │         └─ GlyphLayer
   ├─ ClientEffects → WasmSpotlightCursor   WASM springcursor
   ├─ Analytics                         no-op
   └─ ContentShell z-[45]
        ├─ Navbar z-40
        ├─ children  / → HomeClient → NeuralCortex z-[5]
        │              default: SplashScreen → Scan/Vignette/QuickNav/Info/A11y
        │              reduced-motion: StaticCortexFallback (TitleOverlay + napit, ei canvas)
        └─ Footer (ei home)
```

**MyceliumBackground** — `fixed inset-0 z-0`, kaikille reiteille. Ei-`/`: `pointer-events-none`. Canvas lazy-import; reduced-motion skip.

**MyceliumField** — BackSide-pallo, fbm-hypha-shader. Neljä growth-knotia: CPU-uniformit `uKnots[4]` (az/el/r) + `uKnotColor[4]` (`knotGauss.ts`). Gauss anisotropinen (aspect/kMul); **maski isotrooppinen** (`min(knotW, 1.0)`).

**GlyphLayer** — scene → `WebGLRenderTarget` → fullscreen ASCII/glyyfi-passi (atlas `.:-=+#`, 6 askelta). CPU-histogrami 64² RT:stä 500 ms välein: persentiilit **p60 / p97** → `uP60`/`uP97` (lerp 0.45). LUT `lutQ` 6-askelmaa. Knot-väri kun maski > `KNOT_MASK_THRESHOLD` (0.35).

**ClickTargets** — näkymättömät spheret (`visible={false}`, raycast ok), 4 knot-id:tä. Vain `/` (`interactive`).

**CortexInteractionContext** — `selectCluster` asettaa `activeCluster` + shake; kutsuu `flyTo`. `registerFlyTo`: CortexScene rAF-tween **1200 ms** (`easeInOutCubic`, `FLY_DIST=8`); `pointerdown` canvasissa keskeyttää; CameraController lerp suspendoidaan lennon ajaksi.

**ClusterQuickNav** — oikea reuna, `md+`, home-only. Värit **`KNOT_COLORS`** (`knotGauss.ts`) — yksi lähde kentän, QuickNavin, InfoPanelin ja reduced-motion -nappien kanssa.

**Splash** vain `/` (NeuralCortex). ENTER / Esc / Space / klik / 6 s auto. `prefers-reduced-motion` → staattinen fallback, **ei canvasia**.

Neljä knot-id:tä: `core` `#B47CFF`, `projects` `#FFB454`, `skills` `#22D3EE`, `experience` `#39FF88`.

## 4. Datavirta

```
cortex-data.ts          clusterPositions (orgaaninen scatter, ei rengas)
        │               nodes[] → ClusterInfoPanel / AccessibleNav
        ▼
knotGauss.ts            KNOTS + KNOT_COLORS + KNOT_GAUSS_GLSL / KNOT_HIT_GLSL
        ├──────────────► MyceliumField   uKnots / uKnotColor
        └──────────────► GlyphLayer      sama + maski
                         ClusterQuickNav KNOT_COLORS
```

`clusterPositions`: core `[-6.5,0,2]`, projects `[8.2,2.5,-4.4]`, skills `[3.1,-2,9.3]`, experience `[-9,3,-6.8]`. Sijainnit = ClickTarget-keskipisteet + flyTo-maalit + knot az/el.

Sisältösivut: `lib/data.ts` (projects / blog / research).

**WASM live:** `utils.ts` side-effect `ensureCortexWasm()` → `fetch("/wasm/wasm_cortex_bg.wasm")`. Kutsujat: `CameraController` (`camerasystem_*`) ja `WasmSpotlightCursor` (`springcursor_*`) + `wasm_alloc`/`wasm_free`. Crate sisältää yhä muita moduleita binäärissä; JS ei kutsu niitä.

## 5. Z-kartta

Lähdekoodin lopullinen pino (layout-kommentti + luokat). **z-index ei ole globaali** — vertailu vain saman stacking-contextin sisällä.

### KONTEKSTI-PUU

```
layout (juuri)
├─ AmbientBackground              -z-20
├─ MyceliumBackground             z-0      MyceliumBackground.tsx:52
├─ ClientEffects                  erillinen layout-haara
│    └─ WasmSpotlightCursor       z-30
├─ skip-link                      z-50     layout.tsx
└─ ContentShell                   z-45 konteksti
     ├─ Navbar                    z-40     (sticky; ContentShellin sisällä)
     └─ children                  z-45     (perivät ContentShell-kontekstin)
          └─ NeuralCortex         z-5 konteksti  (home)
               ├─ SplashScreen            z-50
               ├─ Scanlines/Vignette      10
               ├─ hint/WasmBadge/Title    20
               ├─ ClusterQuickNav / Reset 30   ClusterQuickNav.tsx:17
               └─ ClusterInfoPanel        40
.hero-a11y-link:focus-visible     z-50     globals.css:227
```

ContentShell (z-45 konteksti) → children z-45 + Navbar z-40. NeuralCortex (z-5 konteksti) → SplashScreen z-50. ClientEffects / Spotlight cursor = erillinen layout-haara z-30 (ei NeuralCortexin sisällä).

| z | kerros | konteksti | tiedosto |
|---|--------|-----------|----------|
| **-20** | Ambient (grid/noise/orbs) | juuri | `AmbientBackground` |
| **0** | Mycelium canvas | juuri | `MyceliumBackground.tsx:52` |
| **5** | Cortex-overlayt (home) | **konteksti** | `NeuralCortex` |
| **30** | Spotlight cursor | juuri (ClientEffects-haara) | `WasmSpotlightCursor` |
| **30** | ClusterQuickNav / Reset | NeuralCortex z-5 | `ClusterQuickNav.tsx:17` |
| **40** | Navbar (sticky) | ContentShell z-45 | `Navbar` |
| **40** | ClusterInfoPanel | NeuralCortex z-5 | `ClusterInfoPanel` |
| **45** | Content chrome | **konteksti** | `ContentShell` |
| **50** | Splash | NeuralCortex z-5 | `SplashScreen` |
| **50** | skip-link | juuri | `layout.tsx` |
| **50** | `.hero-a11y-link:focus-visible` | juuri (CSS) | `globals.css:227` |

Splash z-50 ei kilpaile skip-link z-50:n eikä Navbar z-40:n kanssa: splash on NeuralCortex z-5 -kontekstissa, Navbar ContentShell z-45 -kontekstissa.

Home: ContentShell `pointer-events-none`, navbar `pointer-events-auto`, main ei kaappaa ClickTarget-hittejä.

## 6. Kansiokartta

```
src/app/            layout, globals.css, page, about/, blog/, contact/, kuu/,
                    projects/, research/, labs/{,llm,security}/, feed.xml/route.ts,
                    sitemap.ts, error.tsx, not-found.tsx
src/components/     AmbientBackground, Analytics, ClientEffects, ContactConsole,
                    ContentShell, ErrorBoundary, Footer, HomeClient, Navbar,
                    ScrambleText, SectionFrame, StatusPill, TerminalProjectCard,
                    WasmSpotlightCursor
src/components/neural-cortex/
                    MyceliumBackground, CortexCanvas, CortexScene, MyceliumField,
                    GlyphLayer, knotGauss.ts, CameraController, CortexInteractionContext,
                    NeuralCortex, SplashScreen, TitleOverlay, ClusterQuickNav,
                    ClusterInfoPanel, AccessibleNav, Overlays, utils.ts, hooks/useScramble.ts
src/lib/            cortex-data.ts, data.ts
src/hooks/          useInView, usePrefersReducedMotion, useTilt
wasm-cortex/src/    lib.rs, camera_system.rs, spring_cursor.rs (+ crate-moduulit binäärissä)
public/wasm/        wasm_cortex_bg.wasm   ← runtime-asset
```

## 7. Build + deploy

```bash
pnpm install
pnpm build          # Next 16 Turbopack production
pnpm build:wasm     # wasm-pack --target web && cp pkg/*.wasm public/wasm/
pnpm start          # next start
```

Deploy: **Vercel**, auto main-push. Ei `vercel.json`. Env: **ei salaisuuksia** — `.env*` gitignored, `process.env` vain `NODE_ENV` (`error.tsx`). CSP (`wasm-unsafe-eval`) + COOP/CORP/HSTS `next.config.ts`. WASM `Content-Type: application/wasm`.

## 8. Konventiot

Uusi komponentti:

1. **Mount.** Site-wide → `layout.tsx` CortexInteractionProviderin alle. Home-overlay → `NeuralCortex`. 3D → `CortexScene`. Sisältösivu → `SectionFrame` + `lib/data.ts`. Ei toista canvas-juurta.
2. **z.** Vain §5-tokenit. Overlayt 10–30 jäävät NeuralCortex z-[5] -kontekstiin.
3. **Väri.** Knot/cluster = `KNOT_COLORS` (`knotGauss.ts`). Ei rinnakkaisia paletteja.
4. **Interaktio.** ClickTarget / QuickNav / flyTo vain kun `interactive` (`pathname === "/"`). Muilla reiteillä canvas `pointer-events-none`.
5. **reduced-motion.** Ei WebGL-canvasia (`MyceliumBackground` return null). Fallback NeuralCortexissa.
6. **WASM.** Muutos crateen → `pnpm build:wasm` → sha256-verify `wasm-cortex/pkg/wasm_cortex_bg.wasm` == `public/wasm/wasm_cortex_bg.wasm` → commit molemmat. Live-exportit: `camerasystem_*`, `springcursor_*`, alloc/free.

## 9. Suorituskyky baseline (post-C1a, 2026-11-09)

Total shipped JS+CSS: **485 kB gzip** (BUILD_ID `cX5ONIn3rYNjO3P6bBBc`, gzip -9, kaikki chunkit sis. lazy Three 234k gz) — mittaus post-C1a 09.11; FLJS-per-reitti ~234–241 kB rajatut.

Vanha BUILD_ID `77BcCLkd` -mittaus ei enää validi. A2-code.md / A2-perf.md = HISTORICAL BASELINE (ks. banneri tiedostojen alussa) — LCP/FPS alla pre-C1a.

Paikallinen prod Playwright 1440×900. Vertailu: 19.9 live gzip JS+CSS **607 kB**, First Load JS **1 857 532 B**.

| | `/` | `/projects` | `/blog` |
|--|----:|------------:|--------:|
| LCP | **613 ms** | 624 ms | 599 ms |
| FPS (5 s rAF) | **60.3** | 60.2 | 60.0 |

3D ei first-loadissa (lazy). WASM ~83 kB / 35 kB gzip, ei inline. Soft budget 150–250 kB: reitit yläreunassa.

## 10. Historiaviite

- Koodi/perf-auditit: `~/.hermes/workspace/audits/pk-site-20261109/A2-code.md`, `A2-perf.md`.
- Bloat-era 19.9: `workspace/jev_audit_20260919/pk_website_bloat.md` (eager 3D, postprocessing, splash-portti ilman timeouttia).
- C1a/C1b (2026-11-09, puskussa): V4 node/edge/marker/grid, FlowFieldParticles, WasmParticleField, pillarit, TransmissionDeck, GlitchText pois (~2.1 k riviä). Live-kenttä = mycelium + glyph + 4 knotia. `research`-knot poistettu kentästä.

# Neural Cortex — Living atlas / Symbiosis

## Rajaus ja lähtökohta

Tämä on sivuston uudelleenrakentamisen Cortex-osuus, ei uusi fysiikkamoottori.
Pohja: Theory/main `fdef6e190e732d9d645e6407c6627be17e8e1759`, joka sisältää
pyydetyn `8d8ec623acea100aab757170fd981dd7ab79feb4`-commitin.
Toteutus tehdään vain paikalliseen `website/cortex-redesign`-haaraan.
Ei deployta, pushia, tuotantomainin, workspace-indeksin tai MISTAKES.md:n muutoksia.

## Visuaalinen suunta

**Living atlas** yhdistää ammatillisen toimituksellisen sivun ja symbioosin
orgaanisen visualisoinnin. Ei koko ruudun lukitsevaa sci-fi-käynnistysanimaatiota,
lavastettua telemetriaa eikä geneeristä neon-bento-korttiruudukkoa.

- Näkyvä, palvelimella renderöity pääotsikko: “Human judgment. Machine possibility.”
- Oma nimi ja todennettu ammattirooli otsikon yläpuolella; projektit ja yhteydenotto
  ovat tavallisia linkkejä, eivät 3D-kohteiden taakse piilotettua sisältöä.
- Nykyiset fontit säilyvät: Space Grotesk otsikoihin, Manrope leipätekstiin,
  IBM Plex Mono vain koordinaatteihin, numerointiin ja lajiselitteisiin.
- Pääotsikko skaalautuu 2.8–5.5rem; Cortex-otsikko 1.6–2.4rem.
- Musteensininen `#05070A`, hillityt viivat `#1E2B38` / `#2B3D4F`, teksti
  `#EAF2F8` ja `#B5C5D3`. Ei jatkuvaa scanline-, bloom- tai scramble-kerrosta.
- Epäsymmetrinen työpöytäasettelu: suuri rajattu organismialue ja 300px sisältökaista.
  Mobiilissa alueet pinoutuvat; klusteripainikkeet rivittyvät.
- Staattinen SVG-atlas on kevyt alkukuva, ei rinnakkainen animaatio-/fysiikkajärjestelmä.
  Se säilyy käytettävänä myös ilman WebGL:ää tai JavaScriptiä.

## Symbioosin värit ja interaktio

Nykyisen `cortex-data.ts`-datan kolme lajia säilyvät muuttumattomina:

| Laji | Väri | Merkitys |
| --- | --- | --- |
| Ihminen / Human | `#22D3EE` | Harkinta, kokemus, tarkoitus |
| Kone / Machine | `#FF6B35` | Työkalut, laskenta, rakentaminen |
| Luonto / Nature | `#39FF88` | Sopeutuminen, riippuvuudet, kasvu |

Klusterien korostus seuraa niiden olemassa olevan lajijakauman suurinta painoa;
tasatilanteessa ensimmäistä lajia. Lajiselite on aina tekstinä, ei vain värinä.
Valitun klusterin sisältöpaneelin kolmivärinen palkki kuvaa käsitteellistä
lajikoostumusta — ei taitoprosenttia tai mitattua suorituskykyä.

Viisi aluetta: Core, Projects, Skills, Experience, Research. Natiivit painikkeet
päivittävät sekä sisällön että 3D-kameran. `aria-pressed`, `aria-controls`, selkeä
fokus ja vähintään 44px kosketusalueet. Linkit pysyvät linkkeinä. Uutta sisältöä,
saavutuksia tai mittaustuloksia ei keksitä. Hiiri ei ole ainoa navigointitapa.

## Lataus ja liikebudjetti

1. `page.tsx` on Server Component: näkyvä teksti ja linkit heti HTML:ssä.
2. Kevyt client-käyttöliittymä renderöi staattisen atlaksen ja klusterit heti.
3. `next/dynamic` on client-wrapperissa. Vain `CortexCanvas` tuo Three/R3F/WASM:n.
4. ENTER/splash/1,4 sekunnin pakkoportti poistuu käyttöreitiltä kokonaan.
   “Activate 3D” on valinnainen tehoste; “Skip intro / use static atlas” pysäyttää
   tehosteen tai estää sen käynnistymisen. Sisältö ei koskaan odota sitä.
5. Reduced-motion on konservatiivinen SSR/hydraatio-oletus. Järjestelmäasetuksella
   `reduce` ei mountata Canvasia eikä ladata Cortex-WASM:ia etusivulla.
6. Desktopin DPR enintään 1.5; mobiilissa 1, ilman antialiasointia.
   Nykyinen partikkelibudjetti 5000 / 2000 ja PointsMaterial säilyvät.
7. Mobiilin automaattinen 3D odottaa 5 sekuntia näkyvällä aktiivisella välilehdellä.
   Jos näkyvyys katoaa ennen käynnistystä, ajastus perutaan ja alkaa uudelleen.
8. IntersectionObserver + visibilitychange pysäyttävät R3F-kehykset (`never`),
   fysiikan ja ohjaimet alueen tai välilehden ollessa piilossa.
9. Etusivu ei käynnistä lisäksi layoutin globaalia partikkelikenttää/kursorifysiikkaa.
   WASM-loaderilla ei enää ole moduulin evaluoinnin aikaista verkkosivuvaikutusta.
10. Käyttämättömät EffectComposer/Bloom-importit poistetaan. Rust-moottoria,
    korvaavaa renderöijää tai uusia riippuvuuksia ei lisätä.

## Hyväksymistestit ja palautus

- `npx --yes pnpm@11.4.0 install --frozen-lockfile`, `... build`, `... lint`.
- Tuotantopalvelimen HTML: otsikko, sisältö ja navigointi ilman ENTER-klikkausta.
- Selain: desktop WebGL, DPR-raja, kaikki viisi klusteria ja staattiseen ohitus.
- Reduced-motion: ei Canvasia eikä WASM-pyyntöä; klusterit toimivat.
- Mobiili: ei vaakaylivuotoa, 5s automaattiviive ja DPR 1.
- Näkyvyys: offscreen ja piilotettu välilehti pysäyttävät renderöinnin.
- Tarkista `git diff --check` ja ettei lukitustiedosto/muut projektit muutu.
- Alkuperäinen lint sisälsi virheitä myös vanhoissa komponenteissa. Korjataan
  estävät virheet kohdennetusti, ei vaimenneta ESLint-sääntöjä globaalisti.
- Palautus: hylkää feature-haara/klooni tai peru sen paikallinen commit.

Lähteet (toteutusversiot Next 16.2.6, R3F 9.5.0):
- https://nextjs.org/docs/app/guides/lazy-loading
- https://r3f.docs.pmnd.rs/advanced/scaling-performance

## Toteutuksen paikallinen varmennus

- Frozen-lockfile-asennus onnistui pnpm 11.4.0:lla (`npx`), lukitustiedosto ei muuttunut.
- Next 16.2.6 production build ja TypeScript läpi, etusivu staattisesti renderöity.
- ESLint exit 0: ei virheitä, 15 jäljelle jäävää vanhaa varoitusta.
- Tuotanto-HTML sisältää näkyvän pääotsikon, atlaksen ja sisältöpaneelin; ei ENTER-porttia.
- Headless Chromium: WebGL-konteksti käytössä, desktop Canvas DPR 1.5.
- Reduced-motion / 390px: kaikki viisi klusteria vaihtavat sisältöä; 0 Canvasia,
  0 WASM-pyyntöä ja ei vaakaylivuotoa.
- Tuore 390px selainikkuna: ei Canvasia alussa eikä 2.5 sekunnissa; Canvas näkyy
  6.4 sekunnissa ja sen DPR on 1. Mobiilin vaakaylivuoto korjattu.
- Skip-painike vaihtaa staattiseen atlakseen ja Canvasin `frameloop` on `never`.
  Offscreen sekä emuloitu visibilitychange/hidden asettavat running-tilan pois.
- `git diff --check` läpi. Ei riippuvuus-, Rust- tai WASM-binäärimuutoksia.

Tämä muutos ei väitä Core Web Vitals-/FPS-parannusta mitatuksi.
Fyysisen mobiililaitteen ja Firefoxin laajaa visuaalista regressiokierrosta
sekä tuotantomittausta ei korvata paikallisella buildillä.

## Yhdistäminen: website/final (2026-10-26)

Tämä osio korvaa yllä olevat etusivun sommittelua ja lataushetkeä koskevat
kuvaukset yhdistetyssä haarassa. Lähtöcommitit ovat Cortex `afca7d6` ja
professional-base `8424142`; yhteinen pohja on `fdef6e1`.

### Konfliktiratkaisut

Alkuperäiset konfliktimerkintöjen rivit ennen ratkaisua:
- `src/app/page.tsx`: 4–17 ja 22–86. Valittu professional-base kokonaan:
  server-renderöity portfolio, SelectedWork, yhteydenotto ja sivukohtainen metadata.
- `src/components/Navbar.tsx`: 14–76. Valittu professional-base: kevyt,
  aina näkyvä navigaatio ilman vanhoja scroll-/underline-efektejä.
- `src/components/WasmParticleField.tsx`: 48–52. Valittu professional-base:
  nimetty `renderFrame`-callback vastaa RAF-kutsua, ei vanhaa `render`-nimeä.

Ilman tekstikonfliktia yhdistyneet, erikseen tarkistetut rajapinnat:
- `layout.tsx` ja `HomeClient.tsx`: professional-base; ei globaaleja
  partikkeliefektejä. Cortex ladataan vasta Launch-painikkeesta client-wrapperissa.
- `neural-cortex/utils.ts` ja muut Cortex-komponentit: Cortex-redesign;
  ei moduulin evaluoinnin aikaista WASM-fetchiä, splash-porttia tai vanhaa sceneä.
- Professional-basen muut sivut, canonical/OG/Twitter-metatiedot ja sitemap
  säilytetty. Tehtävän P4-nimelle ei löytynyt erillistä määritelmää koodista;
  professional-basen koko muutosjoukko on mukana, ei vain etusivu.
- Semanttinen integraatiokorjaus `portfolio.css`: vanhan fullscreen-Cortexin
  kiinteä korkeus ja overflow-leikkaus poistettu. Uusi atlas ja sisältöpaneeli
  kasvattavat kokeilualueen korkeutta myös mobiilissa.

### Yhdistetyn version varmennus

- `pnpm install --frozen-lockfile`: PASS, lukitustiedosto ennallaan.
- `pnpm build`: PASS (exit 0), Next 16.2.6 ja TypeScript; 15 staattista sivua.
- `pnpm lint`: PASS (exit 0), 0 virhettä ja 14 varoitusta. Ei sääntövaimennuksia.
- Buildissä Node DEP0205- ja MODULE_TYPELESS_PACKAGE_JSON-varoitukset; eivät estä ajoa.
- Paikallinen production-palvelin: `/`, `/sitemap.xml`, `/opengraph-image` HTTP 200.
- Chromium 390×844 / reduced-motion: viisi klusteria toimii, 0 Canvasia,
  0 WASM-pyyntöä, ei vaakaylivuotoa; sisältöpaneeli ei leikkaudu.
- Chromium 1440×900: ennen Launchia 0 Canvasia / 0 WASM-pyyntöä;
  käynnistyksen jälkeen 1 Canvas / 1 WASM-pyyntö, DPR 1.5.
  Skip pysäyttää running-tilan; Close poistaa Canvasin. Ei vaakaylivuotoa.
- Konfliktimerkkihaku ja `git diff --check`: PASS.

Testilokit: `cache/scratch/website-final-build.log` ja
`cache/scratch/website-final-lint.log` HERMES_HOME:n alla.
Ei pushia, deployta tai main-haaran muutoksia. Fyysisen mobiililaitteen,
Firefoxin ja koko sivuston visuaalinen regressiokierros jää erikseen tehtäväksi.
Palautus: käytä alkuperäisiä feature-haaroja; yhdistäminen on omassa työpuussaan
`cache/scratch/website-final`, eikä lähtöhaarojen committeja muutettu.

## Artistical (P6) — symbioosin tilallinen partituuri

Haara `website/cortex-artistical`, varmennettu pohja `f574cad` (WASM-slice-korjaus).
Annettu uusi työpuu puuttui, joten se luotiin tästä commitista; paikallinen main
oli yhä `fdef6e1`, eikä sitä päivitetty tai muutettu. Suunnitelma ennen toteutusta:
[`DESIGN-CORTEX-ARTISTICAL.md`](DESIGN-CORTEX-ARTISTICAL.md).

### Visuaalinen ja toiminnallinen diff

- **A / Verkoston väri:** uusi `SymbiosisThreads.tsx` piirtää kahdeksan kaarevaa,
  suljettua yhteysreittiä sekä 24 liikkuvaa viestipistettä. Klusterit vaihtavat
  signaaleja Coren ja naapurin kanssa ilman kaikkien välistä viivasotkua.
  Aktivoinnin Human/Machine/Nature-painot värittävät kaikkia yhteyksiä ja koko
  partikkelikenttää myös WASM-polulla, eivät vain lähintä klusteria.
- **B / Kosketus ja hiiri:** Canvasin passiiviset `pointermove` ja `touchmove`
  kuuntelijat vertaavat osoitinta kameralla projisoituihin klusterikeskuksiin.
  Läheisyysraja 65 CSS-pikseliä / mobile 80; pointerleave, touchend ja touchcancel
  purkavat korostuksen. Läheisyys ei siirrä kameraa eikä vaihda sisältöpaneelia;
  klikkaus ja saavutettavat painikkeet tekevät pysyvän valinnan.
- **C / Rajattu jälkikäsittely:** uusi `CortexFinish.tsx`: yksi HalfFloat-render-target,
  yksi fullscreen-outputpass, yhdeksän näytteen kynnystetty halo ja yksi filmic
  tone-map lineaarisen komposition jälkeen. Ei EffectComposeria, Bloom-importtia,
  uutta riippuvuutta tai globaalia CSS-hehkua. Render-target skaalautuu Canvasin
  kokoon ja DPR-rajaan; GPU-resurssit vapautuvat unmountissa. Three-rendererin
  tone-mapping ohitetaan scene-passissa, jotta sävykartoitusta ei tehdä kahdesti.
- **D / Tilallinen sommittelu:** `cortex-data.ts` porrastaa viiden alueen syvyydet
  uudelleen. Scene käyttää ohuita orbitaaleja massiivisten glow-pallojen sijaan.
  3D-ankkuroitu typografia: Space Grotesk 20/26px klustereille, IBM Plex Mono 9px
  indekseille, Georgia italic 30px lajien nimille. Fonttimuuttujat tarkistettiin
  selaimen computed stylesta. Koko ekologia pysyy kuvassa: automaattinen
  lähizoomaus ja hengitysskaalaus poistettiin, OrbitControls jää käyttäjälle.
- **E / Rajat säilyvät:** etusivun muu tausta ja laiska Launch-portti ennallaan;
  5000/2000 partikkelia, desktop DPR ≤1.5, mobile DPR 1. Reduced-motion ei
  mounttaa Canvasia eikä postprocessingia. Offscreen pysäyttää renderöinnin ja
  fysiikan. `ClusterMarkers`, `ClusterLabels` ja `CyberGrid` luettiin mutta niitä
  ei tuotu takaisin käyttöreitille. Rust, WASM-binääri, loader ja erityisesti
  kutsukohtainen `writeF32ToWasm`-allokaatio jäivät ennalleen.

Canvasin `data-particle-updates`, `data-particle-sample`, `data-cortex-frames`,
`data-particle-engine`, `data-proximity`, `data-activation` ja `data-species-mix`
ovat testattavia tilahavaintoja, eivät näkyvää keksittyä telemetriaa. Laskurit
päivittyvät 30 kehyksen välein; lajipainot ovat käsitteellisiä, eivät mittareita.

### Varmennus tuotantobuildillä

- pnpm **11.4.0** löytyi asennettuna Node-toolsin alta, vaikka PATHista puuttui
  pnpm/corepack. Käytetty `node .../pnpm/bin/pnpm.cjs`; ei globaalia asennusta.
- Frozen-lockfile install **PASS**, ei lockfile- tai package-muutoksia.
- `pnpm build` **PASS**, exit 0, Next 16.2.6, TypeScript ja 15 staattista sivua.
- `pnpm lint` **PASS**, exit 0: 0 virhettä, 14 ennestään ollutta varoitusta.
  Buildin DEP0205 / MODULE_TYPELESS_PACKAGE_JSON -varoitukset eivät estäneet ajoa.
- Scrapling headless Chromium, production-palvelin `127.0.0.1:3216`: lopullisen
  version yhtäjaksoinen **69132.5 ms** seuranta, **0 runtime-virhettä**.
  `error`, `unhandledrejection` ja `console.error` kerättiin ennen Launchia.
  WASM käytössä; havaintolaskurit 450 → 1200 → 1440 ja partikkelien
  sijaintanäytteet vaihtuivat jokaisessa havainnossa: partikkelit eivät jäätyneet.
  DPR 1.5 (selaimen deviceScaleFactor 2). Myös ennen fonttimuuttujakorjausta
  tehty 68147.8 ms ajo oli virheetön.
- Desktop-pointer aktivoi Projects-klusterin: koko verkon lajijakauma vaihtui
  `0.34,0.33,0.33` → `0.2,0.5,0.3`. Aito browser mousemove testattiin lisäksi.
  Viisi natiivipainiketta päivittivät `aria-pressed`-tilan ja sisältöotsikon oikein.
- 390×844 touch-emulaatio: DPR 1, WASM, ei vaakaylivuotoa eikä runtime-virheitä;
  `TouchEvent('touchmove')` Projects-keskuksen lähellä aktivoi saman globaalin
  lajivasteen. Tämä on emuloitu kosketus, ei fyysisen laitteen testi.
- Offscreen: 2.2 sekunnin tarkkailussa sekä partikkeli- että render-laskuri
  pysyivät samoina; palatessa molemmat jatkuivat. Lopullinen testi PASS.
- Reduced-motion 390×844: **0 Canvasia, 0 WASM-pyyntöä**, viisi klusteria
  toimivat ja vaakaylivuotoa ei ollut. Postprocessingia ei näin käynnistetty.
- `git diff --check` PASS; ei main-pushia, deployta, index- tai MISTAKES-muutosta.

Kuvat: [desktop](docs/cortex-p6/desktop.png),
[mobile](docs/cortex-p6/mobile.png),
[reduced motion](docs/cortex-p6/reduced-motion.png).
Build/lint-lokit: HERMES_HOME `cache/scratch/cortex-p6-build.log` ja
`cache/scratch/cortex-p6-lint.log`.

Jäljellä: fyysinen mobiililaite, Firefox/GPU-yhteensopivuuden laajempi kierros ja
Petskun taiteellinen katselmointi. Headless-ajo ei ole FPS-/CWV-parannusväite.
Palautus: revert tämän feature-haaran commit; pohja `f574cad` säilyy.

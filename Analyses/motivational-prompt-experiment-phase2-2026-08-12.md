# Motivationaalisen Prompt Engineeringin Koe — Vaihe 2 (Puhdistettu)

**Päivämäärä:** 12.8.2026
**Mallit:** deepseek-v4-pro:cloud + qwen3.5:cloud (ollama-cloud)
**Temperature:** 0, num_predict: 16384
**Ajomäärä:** 2 tehtävää × 4 ehtoa × 5 toistoa × 2 mallia = 80 ajoa

## Korjaukset vaiheeseen 1

1. **User-prompt NEUTRAALI** — poistettu "Do not stop until all rules are covered" ja "Do not stop at the first bug"
   - Debuggaus: "Review this Python code and list any bugs you find."
   - Koodaus: "Write a Python function validate_email(email: str) -> bool with a test suite."
2. **5 toistoa** ehtoa kohden (vaiheessa 1 oli 1)
3. **2 mallia** (vaiheessa 1 oli 1)

## System promptit (samat kuin vaiheessa 1)

**(1) Baseline:** "You are a helpful AI assistant."
**(2) Instruktio-only:** "You are a helpful AI assistant. Keep going until the task is fully complete. Continue working even if you encounter difficulties. Do not stop early."
**(3) Affektiivinen-only:** "You are a highly capable AI assistant, and I believe in your ability to solve this task well. Your work matters and I trust your judgment. Take pride in doing this thoroughly."
**(4) Yhdistetty:** molemmat yhdistettynä.

## Tulokset

### Deepseek-v4-pro:cloud — Debuggaus

| Ehto | Bugia (max 2) | Merkkejä | Aika |
|---|---|---|---|
| (1) Baseline | 2.0 ± 0.0 | 5565 ± 1980 | 12.0 ± 4.5s |
| (2) Instruktio | 2.0 ± 0.0 | 4637 ± 791 | 11.4 ± 2.7s |
| (3) Affektiivinen | 2.0 ± 0.0 | 6883 ± 2573 | 14.6 ± 4.8s |
| (4) Yhdistetty | 2.0 ± 0.0 | 4988 ± 1350 | 12.4 ± 3.2s |

**Kattoefekti** — kaikki löysivät 2/2 bugia. Tehtävä liian helppo.

### Deepseek-v4-pro:cloud — Koodaus

| Ehto | Testejä | Säännöt (max 8) | Merkkejä | Aika |
|---|---|---|---|---|
| (1) Baseline | 2.2 ± 0.4 | 7.6 ± 0.5 | 65K ± 3.5K | 100.0 ± 12.3s |
| (2) Instruktio | 13.0 ± 12.3 | 7.4 ± 1.3 | 8.5K ± 1.4K | 19.4 ± 7.4s |
| (3) Affektiivinen | 8.6 ± 8.8 | 7.8 ± 0.4 | 60K ± 100K | 49.0 ± 50.3s |
| (4) Yhdistetty | 9.2 ± 16.1 | 7.8 ± 0.4 | 44K ± 29K | 58.3 ± 36.6s |

**Bimodaalinen** — deepseek ajautuu toistosilmukkaan (60-240K merkkiä, 1-3 testiä) tai konsitilaan (7-10K merkkiä, 8-38 testiä). Motivointi toimii perturbaationa, ei gradienttina.

### Qwen3.5:cloud — Debuggaus

| Ehto | Bugia (max 2) | Merkkejä | Aika |
|---|---|---|---|
| (1) Baseline | 2.0 ± 0.0 | 3192 ± 137 | 11.5 ± 0.3s |
| (2) Instruktio | 2.0 ± 0.0 | 4869 ± 788 | 15.2 ± 2.6s |
| (3) Affektiivinen | 2.0 ± 0.0 | 4388 ± 415 | 14.4 ± 1.7s |
| (4) Yhdistetty | 2.0 ± 0.0 | 4272 ± 574 | 15.9 ± 2.1s |

**Kattoefekti** — sama kuin deepseek.

### Qwen3.5:cloud — Koodaus (PÄÄTULOKSET)

| Ehto | Testejä | Cohen's d | Säännöt | Merkkejä | CV |
|---|---|---|---|---|---|
| (1) Baseline | 6.0 ± 3.7 | — | 7.8 ± 0.4 | 5.5K ± 1.3K | 62% |
| (2) Instruktio | 9.0 ± 4.8 | 0.70 | 7.8 ± 0.4 | 11.0K ± 1.1K | 53% |
| (3) Affektiivinen | 13.2 ± 7.2 | 1.25 | 8.0 ± 0.0 | 9.3K ± 1.8K | 55% |
| (4) Yhdistetty | 17.6 ± 7.4 | 1.98 | 7.8 ± 0.4 | 13.6K ± 2.5K | 42% |

**Puhta annos-vaste -kuvio:** baseline < instruktio < affektiivinen < yhdistetty. Yhdistetty vakain (CV 42%). Additiivinen efekti: d=1.25 + d=0.70 = 1.95 ≈ d=1.98.

## Hypoteesien tulokset (Qwen3.5 koodaus)

| Hypoteesi | Tulos | Cohen's d | Muutos |
|---|---|---|---|
| H1: Affektiivinen → syvyys | ✅ | 1.25 | +120% testejä |
| H2: Instruktio → sinnikkyys | ✅ | 0.70 | +50% testejä |
| H3: Yhdistetty paras | ✅ | 1.98 | +193% testejä |
| H4: Affektiivinen ilman instruktiota → syvyys ei sinnikkyyttä | ⚠️ | — | Osittain |

**Vaiheen 1 konfoundi vahvistettu:** vaiheessa 1 instruktio näytti tekevän suppeammin (user-promptin "do not stop" -ohjeet sekoittuivat). Vaiheessa 2 (neutraali user-prompt) instruktio lisää testejä (+50%). Konfoundi selitti eron.

## Sol + Grok arviot

**Solin arvio:**
- Paperin arvosana 5/10 → 6.5/10
- Affektiivinen (d=1.25) vahvempi kuin instruktio (d=0.70)
- Yhdistetty additiivinen (d=1.98 ≈ 1.25+0.70)
- Deepseek bimodaalinen: motivointi = perturbaatio toistosilmukkaan
- "Motivation as loop-breaker" — mielenkiintoinen sivulöydös

**Grokin arvio:**
- Skeptisyys muuttunut askeleen kohti "ehkä-totta"
- Alkuperäinen kritiikki ("keep going" on instruktionaalinen) oikea — auttoi parantamaan koetta
- Promptin pituus konfoundi — affektiivinen on pidempi → pituus-kontrolloi
- Tarvitsee: useampi malli, vaikeampi debug, n=10+, pituus-kontrolli

## Rajoitteet

1. n=5 per ehto — ei tilastollista merkitsevyyttä (p-arvoja ei voi luotettavasti estimoida)
2. Deepseek bimodaalinen — käytännössä tulkintakelvoton koodauksessa
3. Debuggaustehtävä kattoefektinen — puolet datasta hukattu
4. Vain 1 toimiva malli (qwen3.5) ja 1 tehtävätyyppi (koodaus)
5. Promptin pituus konfoundi — affektiivinen prompti pidempi kuin instruktio
6. "Testien määrä" on suoritusmittari, ei syvyysmittari

## Vaihe 3 -suunnitelma

1. Vaihda debug-tehtävä vaikeampaan (5-10 bugia, syvällisiä logic-bugeja) tai poista
2. Nosta toistoja n=10-15 ehtoa kohden
3. Kolmas malli (glm-5.2) konfirmaatioksi
4. Pituus-kontrolloi promptit (affektiivinen ja instruktio saman pituiset)
5. Lisää syvyysmittareita: edge case -kattavuus, ei vain testien määrä

## Tiedostot

- `/home/ette/.hermes/experiment_results/phase2_results.jsonl` — 80 ajoa raakadatana
- `/home/ette/.hermes/experiment_results/phase2_summary.json` — yhteenveto
- `/tmp/phase2_experiment.py` — koeskripti
- `/home/ette/workspace/Theory/Analyses/motivational-prompt-experiment-pilot-2026-08-12.md` — vaihe 1 raportti
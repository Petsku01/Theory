# Motivationaalisen Prompt Engineeringin Koe — Vaihe 3 (Puhdistettu + 3 mallia)

**Päivämäärä:** 12.8.2026
**Mallit:** deepseek-v4-pro:cloud + qwen3.5:cloud + glm-5.2:cloud (ollama-cloud)
**Temperature:** 0, num_predict: 16384
**Ajomäärä:** 4 ehtoa × 1 tehtävä (koodaus) × 10 toistoa × 3 mallia = 120 ajoa

## Korjaukset vaiheeseen 2

1. **Debuggaustehtävä poistettu** (kattoefektinen — kaikki löysivät 2/2 bugia)
2. **10 toistoa** ehtoa kohden (vaiheessa 2 oli 5)
3. **3 mallia** (vaiheessa 2 oli 2)
4. **Promptin pituuskorrelaatio lasketaan** (Grokin konfoundihuoli)
5. **Edge case -mittarit lisätty** (tyhjä string, None, unicode, erikoismerkit, pitkä domain)

## Tulokset

### Testien määrä per malli (keskiarvo ± std)

**Deepseek-v4-pro:cloud:**

| Ehto | Testejä | Cohen's d | Tulkinta |
|---|---|---|---|
| (1) Baseline | 43.6 ± 57.5 | — | — |
| (2) Instruktio | 25.3 ± 46.9 | -0.35 | small, negatiivinen |
| (3) Affektiivinen | 10.1 ± 15.8 | -0.80 | medium, negatiivinen |
| (4) Yhdistetty | 125.3 ± 349.9 | +0.33 | small, positiivinen |

Bimodaalinen — yksi ajo tuotti 1120 testiä, muut 0-20.

**Qwen3.5:cloud:**

| Ehto | Testejä | Cohen's d | Tulkinta |
|---|---|---|---|
| (1) Baseline | 9.2 ± 4.2 | — | — |
| (2) Instruktio | 12.6 ± 1.0 | +1.13 | large, positiivinen |
| (3) Affektiivinen | 10.9 ± 2.9 | +0.48 | small |
| (4) Yhdistetty | 13.7 ± 1.6 | +1.43 | large, positiivinen |

Vaiheen 2 järjestys kääntyi: vaiheessa 2 affektiivinen > instruktio, vaiheessa 3 instruktio > affektiivinen.

**GLM-5.2:cloud:**

| Ehto | Testejä | Cohen's d | Tulkinta |
|---|---|---|---|
| (1) Baseline | 10.2 ± 16.5 | — | — |
| (2) Instruktio | 0.2 ± 0.6 | -0.86 | large, negatiivinen |
| (3) Affektiivinen | 4.0 ± 9.7 | -0.46 | small, negatiivinen |
| (4) Yhdistetty | 19.0 ± 20.1 | +0.48 | small, positiivinen |

Instruktio rikkoi GLM:n — 0.2 testiä (mahdollinen kieltäytymisilmiö).

### Pooled (kaikki mallit)

| Ehto | Cohen's d | Tulkinta |
|---|---|---|
| Instruktio | -0.25 | small, negatiivinen |
| Affektiivinen | -0.46 | small, negatiivinen |
| Yhdistetty | +0.22 | small, positiivinen |

### Muut mittarit

- **Sääntöjen kattavuus:** 8/8 kaikilla ehdoilla ja malleilla (kattoefekti)
- **Edge case -testit:** p=0.073 (ei merkittävä)
- **Promptin pituuskorrelaatio:** r=0.094 (ei kontrolloi — Grokin konfoundihuoli kumottu)
- **ANOVA (ehdon vaikutus):** F=2.383, p=0.073 (ei merkittävä)

## Hypoteesien tulokset

| Hypoteesi | Tulos | Perustelu |
|---|---|---|
| H1: Affektiivinen → syvyys | ❌ Kumottu | Pooled d=-0.46, negatiivinen 2/3 mallista |
| H2: Instruktio → sinnikkyys | ❌ Kumottu | Pooled d=-0.25, negatiivinen 2/3 mallista |
| H3: Yhdistetty paras | ⚠️ Osittain | Positiivinen kaikilla malleilla, mutta d=+0.22 pieni ja ei-merkitsevä |
| H4: Affektiivinen > instruktio | ❌ Kumottu | Vaiheen 2 tulos oli otoskohinaa. Vaiheessa 3 instruktio > affektiivinen qwen3.5:llä |

## Sol + Grok arviot

**Solin arvio:**
- Paperin arvio heikkeni: 6.5/10 → heikompi
- Vaiheen 2 löydös (affektiivinen > instruktio) ei replikoitunut — konfoundin artefakti
- 2/3 mallia näyttää negatiivisia efektejä yksilöehdoille
- Yhdistetty ainoa positiivinen, mutta riippuu osittain yhdestä outlierista (1120 testiä)
- GLM 0.2 testiä instruktiolla → mahdollinen kieltäytymisilmiö
- "Rehellisin suunta on hyväksyä nollahypoteesi tai vahvistaa yhdistetty kunnollisella tilastollisella analyysillä"

**Grokin arvio:**
- Alkuperäinen kritiikki piti paikkaansa (toistot, mallivaihtelu)
- Pituuskonfoundi kumottu (r=0.094) — hyvä
- Uusi konfoundi: informaation monimutkaisuus (yhdistetty ei vain pidempi vaan monimutkaisempi)
- "Affektiivinen > instruktio -väite kumoutunut"
- Uusi defensioon kykenevä väite: yhdistetty tuottaa johdonmukaisesti positiivisen mutta pienen efektin
- "Tieteellistä edistystä — ei virhe, vaan tarkentuminen"

## Keskeiset löydökset

1. **Efektit ovat mallikohtaisia ja epäjohdonmukaisia.** Vain qwen3.5 toimii odotetusti. Deepseek ja GLM näyttävät negatiivisia efektejä yksilöehdoille.

2. **Vaiheen 2 tulos oli otoskohinaa.** Affektiivinen > instruktio -järjestys kääntyi toistoja lisättäessä. Pieni otos yliarvioi efektit.

3. **Yhdistetty ehto on ainoa johdonmukainen löydös** — positiivinen kaikilla 3 mallilla. Mutta d=+0.22 on pieni, ei-merkitsevä (p=0.073), ja riippuu osittain yhdestä outlierista.

4. **Promptin pituus ei kontrolloi** (r=0.094). Grokin alkuperäinen konfoundihuoli kumottu.

5. **Uusi konfoundi:** Informaation monimutkaisuus (Grokin huomio). Yhdistetty prompti sisältää kaksi motivaatiotyyppiä — ei vain pidempi vaan laadullisesti monimutkaisempi.

6. **GLM rikkoi instruktiosta** (0.2 testiä) — mahdollinen kieltäytymisilmiö (Solin huomio).

## Rajoitteet

1. n=10 per ehto per malli — cohens d:n luottamusvälit leveät
2. Deepseek bimodaalinen — yksi ajo (1120 testiä) vääristää yhdistetyn efektin
3. Sääntöjen kattavuus kattoefektinen (8/8 kaikilla)
4. Vain 1 tehtävätyyppi (koodaus)
5. "Testien määrä" on suoritusmittari, ei syvyysmittari
6. Informaation monimutkaisuus ei kontrolloitu

## Seuraavat askeleet (Solin + Grokin suositukset)

1. **Sensitivity-analyysi:** Poista deepseekin outlier (1120 testiä) ja laske uudelleen
2. **Pituus-matchattu neutraali kontrolli:** 5. ehto (instruktio + neutraali teksti, ei affektiivista)
3. **Random-effects meta-analyysi:** I², τ² heterogeenisyyden mittaaminen
4. **Bootstrap 95% CI:t:** Cohenin d:n luottamusvälit
5. **GLM kieltäytymisilmiön tutkiminen:** Miksi instruktio tuottaa 0.2 testiä?
6. **Harkitse nollahypoteesin hyväksymistä:** Jos sensitivity + bootstrap eivät kestä

## Tiedostot

- `/home/ette/.hermes/experiment_results/phase3_results.jsonl` — 120 ajoa raakadatana
- `/home/ette/.hermes/experiment_results/phase3_report.txt` — tilastollinen raportti
- `/tmp/phase3_experiment.py` — koeskripti
- `/home/ette/workspace/Theory/Analyses/motivational-prompt-experiment-phase2-2026-08-12.md` — vaihe 2 raportti
- `/home/ette/workspace/Theory/Analyses/motivational-prompt-experiment-pilot-2026-08-12.md` — vaihe 1 raportti
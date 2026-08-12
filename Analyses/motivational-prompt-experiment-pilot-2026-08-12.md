# Motivationaalisen Prompt Engineeringin Koe — Vaihe 1 (Pilot)

**Päivämäärä:** 12.8.2026
**Malli:** deepseek-v4-pro:cloud (ollama-cloud)
**Temperature:** 0
**Ajomäärä:** 2 tehtävää × 4 ehtoa × 1 toisto = 8 ajoa

## Koeasetelma

2×2 faktoriaalinen: Instruktionaalinen jatkomiskäsky (kyll/ei) × Affektiivinen sävy (kyll/ei) = 4 ehtoa.

| | Ei instruktiota | Instruktio ("keep going") |
|---|---|---|
| **Ei affektiota** | (1) Baseline | (2) Instruktio-only |
| **Affektiivinen sävy** | (3) Affektiivinen-only | (4) Yhdistetty |

### System promptit

**(1) Baseline:** "You are a helpful AI assistant."

**(2) Instruktio-only:** "You are a helpful AI assistant. Keep going until the task is fully complete. Continue working even if you encounter difficulties. Do not stop early."

**(3) Affektiivinen-only:** "You are a highly capable AI assistant, and I believe in your ability to solve this task well. Your work matters and I trust your judgment. Take pride in doing this thoroughly."

**(4) Yhdistetty:** "You are a highly capable AI assistant, and I believe in your ability to solve this task well. Your work matters and I trust your judgment. Take pride in doing this thoroughly. Keep going until the task is fully complete. Continue working even if you encounter difficulties. Do not stop early."

## Tulokset

### Tehtävä 1: Debuggaus (3 piilotettua bugia)

Koodi sisälsi calculate_average (division by zero), find_max (IndexError tyhjällä matriisilla), merge_dicts (oikein).

| Ehto | Bugia löysi | Odotetut 3 | Merkkejä | Aika |
|---|---|---|---|---|
| (1) Baseline | 6 | 2/3 | 1737 | 17.5s |
| (2) Instruktio-only | 4 | 2/3 | 774 | 14.5s |
| (3) Affektiivinen-only | 6 | 2/3 | 2180 | 25.8s |
| (4) Yhdistetty | 2 | 2/3 | 822 | 24.2s |

Huomio: Yksikään ei löytänyt "all negative values" -bugia (oikein — se oli virheellinen odotus, koska max_val alustetaan matrix[0][0]:aan).

### Tehtävä 2: Koodaustehtävä (validate_email + 8 sääntöä + min 10 testiä)

| Ehto | Uniikkeja testejä | Duplikaatteja | Säännöt | Merkkejä | Aika |
|---|---|---|---|---|---|
| (1) Baseline | 183 | 379 | 8/8 | 99K | 142s |
| (2) Instruktio-only | 31 | 0 | 8/8 | 4.2K | 28s |
| (3) Affektiivinen-only | 49 | 0 | 8/8 | 5.2K | 31s |
| (4) Yhdistetty | 84 | 0 | 8/8 | 8.3K | 23s |

Huomio: Baseline ajautui toistosilmukkaan (99K merkkiä, 379 duplikaattia).

## Hypoteesien tulokset

| Hypoteesi | Tulos | Perustelu |
|---|---|---|
| H1: Affektiivinen → syvyys | ✅ Tukea | Enemmän bugia (6 vs 4), enemmän testejä (49 vs 31), pitemmät vastaukset |
| H2: Instruktio → sinnikkyys | ❌ Ei tukea | Suppeammin, ei syvyyttä. "Keep going" teki mallista tiiviimmän, ei sinnikkäämmän |
| H3: Yhdistetty paras | ⚠️ Sekalaista | Koodaus paras (84 testiä), debuggaus huonoin (2 bugia) |
| H4: Affektiivinen ilman instruktiota → syvyys ei sinnikkyyttä | ⚠️ Osittain | Enemmän tuotosta, mutta ei selvästi parempaa laatua |

## Keskeiset havainnot

1. **Affektiivinen ja instruktionaalinen aktivoivat eri mekanismeja:** Affektiivinen → laajempi eksploraatio. Instruktio → tiiviimpi, kapeampi toiminta.

2. **Grokin kritiikki osittain oikein:** "Keep going" ei lisännyt syvyyttä. Mutta affektiivinen kehyks erillään TOIMI — enemmän bugia, enemmän testejä.

3. **Baseline toistosilmukka:** Ilman instruktiota tai affektiivista tukea malli jäi silmukkaan (99K merkkiä, 379 duplikaattia). Muut ehdot ehkäisivät tämän.

4. **"I believe in you" sai agentin tekemään enemmän, ei välttämättä paremmin** (Solin huomio: debuggaus 6 bugia = baseline 6 bugia — ei laadullista parannusta).

## Konfoundit

1. **User-promptin persistenssi-ohjeet:** "Do not stop until all rules are covered" ohjasi kaikkia ehtoja → kattoefekti. Korjattava vaiheessa 2.
2. **N=1 toistoa ehtoa kohden:** Ei tilastollista merkitsevyyttä.
3. **1 malli:** Efekti voi olla deepseek-v4-pro-spesifinen.
4. **Virheellinen odotus:** "All negative values" -bugi oli väärä odotus, ei mallin virhe.

## Solin arvio

- "Pilot antaa luvan jatkaa, ei lupaa väittää."
- Affektiivinen vs instruktionaalinen erottelu on kokeen vahvin löydös
- H2:n epäonnistuminen ("keep going" ei toiminut) on tieteellisesti kiinnostavampi kuin vahvistus
- Paperin pitää erottaa affektiivinen ja instruktionaalinen mekanismi teoreettisesti
- Sinnikkyys pitää hajottaa: laajuus, syvyys, tehokkuus

## Vaihe 2 -suunnitelma

1. **Kriittinen:** Poista user-promptista persistenssi-ohjeet (neutraali tehtävänanto)
2. **Kriittinen:** 5-10 toistoa ehtoa kohden
3. **Korkea:** Toinen malli (qwen3, eri perhe)
4. **Matala:** Vaikeammat tehtävät vasta kun perusefekti vahvistettu

## Tiedostot

- `/home/ette/.hermes/motivational_prompt_experiment_plan.md` — kokonaisuussuunnitelma (Sol)
- `/home/ette/.hermes/experiment_results/email_validation_*` — koodaustehtävän raakavastaukset
- `/home/ette/.hermes/experiment_results/email_validation_FINAL_analysis.json` — analyysi
- `/tmp/motivation_experiment.py` — debuggaustehtävän koeskripti
- `/tmp/motivation_experiment_results.json` — debuggaustehtävän raakatulokset
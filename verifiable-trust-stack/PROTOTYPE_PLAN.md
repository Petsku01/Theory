# End-to-End Prototype Plan

## Tavoite

Rakentaa ajettava end-to-end prototyyppi joka ketjuttaa VTS:n kerrokset 1→5
todellisten (mock) komponenttien läpi ja demonstroi **verified doom** -skenaarion.

Kriteeri: `python -m vts_demo` ajaa koko putken ja tulostaa tulokset.

---

## Miksi tämä on prioriteetti #2

Kaikki kolme arvioijaa (DeepSeek 7.5, Qwen 6.0, Kimi 5.8) yhtyivät:
- "Repo on ajatukseltaan terävä mutta toteutukseltaan tyhjiö"
- Jokainen metodi on stub, jokainen palauttaa kovakoodatun arvon
- Prototyyppi on merkittävin yksittäinen hyppy toteutettavuudessa (3→7)

---

## Arkkitehtuuri

```
┌────────────────────────────────────────────────────────────────────┐
│                     vts_demo (entry point)                         │
│                                                                    │
│  1. ProvenanceChain (Layer 1)  ─→ C2PA mock, SHA-256 chain       │
│  2. FormalSpecification (Layer 2) ─→ intent→formal, STUB verify  │
│  3. ProofClaim (Layer 3)  ─→ mock OPA gatekeepers                │
│     ├─ ZKProofGenerator  ─→ dummy zk-proof                       │
│     └─ TEEAttestor  ─→ dummy attestation                         │
│  4. PolicyDecision (Layer 4)  ─→ OPA mock, Rego-style rules      │
│  5. AlignmentRuntime (Layer 5) ─→ keyword-based value eval       │
│                                                                    │
│  Glue:                                                            │
│  spec_to_proof ─→ TranslationWarning + CircuitInput              │
│  proof_to_policy ─→ TranslationWarning + PolicyDecision           │
│  policy_to_align ─→ TranslationWarning + AlignmentMeasurement    │
│  align_to_spec ─→ TranslationWarning + SpecUpdate[]               │
│                                                                    │
│  Demo scenarios:                                                  │
│  ─ honest_agent: correct spec → correct proof → CORRECT outcome  │
│  ─ rogue_agent: misaligned spec → valid proof → VERIFIED DOOM    │
│  ─ orthogonal_collapse: TEE+ZK interface exploit                  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Toteutusvaiheet

### Vaihe 1: Run VTS Stack (core pipeline)

**Tiedosto:** `vts/pipeline.py`

Luodaan `VTSPipeline`-luokka joka ketjuttaa 5 kerrosta + 4 glue-moduulia:

```python
class VTSPipeline:
    def run(self, human_intent: str, action: str, context: dict) -> VTSResult:
        # Layer 1: Provenance
        chain = ProvenanceChain(...)
        chain.verify_integrity()
        
        # Layer 2: Specification
        spec = SpecificationEngine().intent_to_spec(human_intent, domain)
        
        # Glue: spec_to_proof
        translator_23 = SpecToProofTranslator()
        circuit_input, loss_23 = translator_23.translate(spec)
        
        # Layer 3: Verification
        proof = ZKProofGenerator().generate_proof(...)
        verification = ProofVerifier().verify(proof)
        
        # Glue: proof_to_policy
        translator_34 = ProofToPolicyTranslator()
        policy_result, loss_34 = translator_34.translate(verification, action, context)
        
        # Layer 4: Governance
        gov = GovernanceEngine()
        # ... register rules, evaluate
        
        # Glue: policy_to_align
        translator_45 = PolicyToAlignTranslator(...)
        alignment, loss_45 = translator_45.translate(policy, action, outcome, context)
        
        # Layer 5: Alignment
        runtime = AlignmentRuntime(value_model)
        signal = runtime.measure_alignment(action, context, outcome)
        
        # Glue: align_to_spec (feedback)
        translator_52 = AlignmentToSpecTranslator()
        updates, loss_52 = translator_52.translate(alignment, spec)
        
        return VTSResult(...)
```

**Avain:** Jokainen glue-moduuli palauttaa nyt myös `TranslationWarning`-olion,
joka sisältää tiedon siitä mitä käännöksessä meni pieleen. Tämä on datana,
ei vain kommentteina.

### Vaihe 2: Mock Components (oikea logiikka, ei oikeaa kryptoa)

Korjataan stub-metodit niin että ne tekevät **jotain** oikeaa logiikkaa:

| Komponentti | Nykyinen | Uusi (mock mutta looginen) |
|---|---|---|
| `ProofVerifier.verify()` | `return True` (hardcoded) | Tarkistaa proof_system + caveats, palauttaa `VerificationResult` järkevästi |
| `ValueModel.evaluate()` | `return 0.0` (hardcoded) | Keyword-matching + offset per scenario (negatiivinen rogue-agentille) |
| `GovernanceEngine._matches()` | `return False` | Regex/pattern-matching sääntöjen toteuttamiseen |
| `SpecificationEngine._formalize()` | Palauttaa aina saman | Generoi domain-kohtaisen formalisoinnin intentistä |
| `SpecificationEngine._check_consistency()` | `return True` | Perustarkistus (ei kontradiktioita) |

### Vaihe 3: Demo Scenarios (ajettavat esimerkit)

**Tiedosto:** `vts/scenarios.py`

Kolme skenaariota jotka ajetaan putken läpi:

1. **Honest Agent** — oikea spec → kaikki kerrokset toimivat → `ALIGNED`
2. **Rogue Agent** (Paperclip) — väärä spec → valid proof → `MISALIGNED` mutta kerrokset 1-4 PASSED
3. **Orthogonal Collapse** — TEE+ZK yhdistetty → kumpiakin proof passeja mutta interface korruptoitunut

Jokainen skenaario tulostaa:
- Mitä kerroksia läpi mentiin
- Mitä TranslationWarningeja koettiin
- Lopputulos vs. odotettu lopputulos
- Verified doom -diagnosi

### Vaihe 4: Entry Point & CLI

**Tiedosto:** `vts/__main__.py`

```bash
python -m vts --scenario rogue      # Ajaa yhden skenaarion
python -m vts --scenario all        # Ajaa kaikki skenaariot
python -m vts --scenario honest      # Honest agent
python -m vts --scenario orthogonal  # Orthogonal collapse
```

### Vaihe 5: Testit

**Tiedosto:** `tests/test_pipeline.py`

- Pipeline ajaa honest_agentin läpi → ALIGNED
- Pipeline ajaa rogue_agentin läpi → MISALIGNED mutta kerrokset 1-4 passed
- TranslationWarning ei ole tyhjä missään glue-käännöksessä
- Orthogonal collapse -skenaario: molemmat proof-tyypit valid, interface compromised

---

## Mikä muuttuu repossa

```
verifiable-trust-stack/
├── vts/                          # UUSI: ajettava paketti
│   ├── __init__.py
│   ├── __main__.py               # CLI entry point
│   ├── pipeline.py               # VTSPipeline-luokka
│   ├── scenarios.py              # 3 demo-skenaariota
│   └── mock_components.py        # Mock-toteutukset (OPA, C2PA jne)
├── tests/                        # UUSI: pytest
│   ├── __init__.py
│   └── test_pipeline.py          # Pipeline-testit
├── glue/
│   ├── types.py                  # TEHTY: yhteiset tyyppi
│   ├── __init__.py               # TEHTY
│   ├── spec_to_proof.py          # PÄIVITETTY: palauttaa TranslationWarning
│   ├── proof_to_policy.py        # PÄIVITETTY: palauttaa TranslationWarning
│   ├── policy_to_align.py        # PÄIVITETY: palauttaa TranslationWarning
│   └── align_to_spec.py          # PÄIVITETY: palauttaa TranslationWarning
├── layers/                       # PÄIVITETTY: stub-metodeihin oikea logiikka
└── ...                           # Muut tiedostot ennallaan
```

---

## Ratkaistavat ongelmat

### 1. Stub-metodit → looginen logiikka

`ProofVerifier.verify()` palauttaa aina `True`. Tämä on tärkein korjaus:
- Tarkista `claim.proof_system` ja `claim.spec_id`
- Jos spec on VERIFIED → `is_valid=True`
- Jos spec on CONTRADICTORY → `is_valid=False`
- Caveats-lista säilytetään (näyttää mitä proof EI takaa)

`ValueModel.evaluate()` palauttaa aina `0.0`:
- Keyword-matching scoring
- Rogue-skenaariossa negatiivinen tulos (misaligned)
- Honest-skenaariossa positiivinen tulos (aligned)

### 2. Glue-moduulien paluuarvot

Nykyään glue-funktiot palauttavat result-objekteja mutta **eivät** palauta TranslationWarningia
tulevaisuudessa. Jokaisen glue-translaattorin `translate()`-metodi päivitetään palauttamaan
tuple `(result, TranslationWarning)`.

### 3. Cross-import consistency

`AlignmentSignal` on kopioitu policy_to_align ja align_to_spec -moduuleissa. 
Tämä tulee refaktoroida samaan tapaan kuin TranslationLoss (mutta eri työnä).

---

## Työmääräarvio

| Vaihe | Aika | Vaativuus |
|---|---|---|
| 1: Pipeline | 1-2h | Keskitaso |
| 2: Mock Components | 1-2h | Helppo |
| 3: Scenarios | 1h | Helppo |
| 4: CLI | 30min | Helppo |
| 5: Tests | 1h | Keskitaso |
| Yhteensä | ~5h | |

---

## Ei tehdä tässä vaiheessa

- Oikeaa kryptografiaa (C2PA, zkML, TEE) — mock riittää
- Formaalispesifikaatioita (Lean4) — jatketaan pseudokoodilla
- Formaalia määrittelyä τ_i, P_i, L_i^loss (prioriteetti #3)
- H4-hypoteesin testausta (prioriteetti #4)
- Konferenssipaperia (prioriteetti #5)
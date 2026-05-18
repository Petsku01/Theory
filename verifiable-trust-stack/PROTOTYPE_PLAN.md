     1|# End-to-End Prototype Plan
     2|
     3|## Tavoite
     4|
     5|Rakentaa ajettava end-to-end prototyyppi joka ketjuttaa VTS:n kerrokset 1->5
     6|todellisten (mock) komponenttien läpi ja demonstroi **verified doom** -skenaarion.
     7|
     8|Kriteeri: `python -m vts_demo` ajaa koko putken ja tulostaa tulokset.
     9|
    10|---
    11|
    12|## Miksi tämä on prioriteetti #2
    13|
    14|Kaikki kolme arvioijaa (DeepSeek 7.5, Qwen 6.0, Kimi 5.8) yhtyivät:
    15|- "Repo on ajatukseltaan terävä mutta toteutukseltaan tyhjiö"
    16|- Jokainen metodi on stub, jokainen palauttaa kovakoodatun arvon
    17|- Prototyyppi on merkittävin yksittäinen hyppy toteutettavuudessa (3->7)
    18|
    19|---
    20|
    21|## Arkkitehtuuri
    22|
    23|```
    24|+--------------------------------------------------------------------+
    25||                     vts_demo (entry point)                         |
    26||                                                                    |
    27||  1. ProvenanceChain (Layer 1)  --> C2PA mock, SHA-256 chain       |
    28||  2. FormalSpecification (Layer 2) --> intent->formal, STUB verify  |
    29||  3. ProofClaim (Layer 3)  --> mock OPA gatekeepers                |
    30||     +- ZKProofGenerator  --> dummy zk-proof                       |
    31||     +- TEEAttestor  --> dummy attestation                         |
    32||  4. PolicyDecision (Layer 4)  --> OPA mock, Rego-style rules      |
    33||  5. AlignmentRuntime (Layer 5) --> keyword-based value eval       |
    34||                                                                    |
    35||  Glue:                                                            |
    36||  spec_to_proof --> TranslationWarning + CircuitInput              |
    37||  proof_to_policy --> TranslationWarning + PolicyDecision           |
    38||  policy_to_align --> TranslationWarning + AlignmentMeasurement    |
    39||  align_to_spec --> TranslationWarning + SpecUpdate[]               |
    40||                                                                    |
    41||  Demo scenarios:                                                  |
    42||  - honest_agent: correct spec -> correct proof -> CORRECT outcome  |
    43||  - rogue_agent: misaligned spec -> valid proof -> VERIFIED DOOM    |
    44||  - orthogonal_collapse: TEE+ZK interface exploit                  |
    45|+--------------------------------------------------------------------+
    46|```
    47|
    48|---
    49|
    50|## Toteutusvaiheet
    51|
    52|### Vaihe 1: Run VTS Stack (core pipeline)
    53|
    54|**Tiedosto:** `vts/pipeline.py`
    55|
    56|Luodaan `VTSPipeline`-luokka joka ketjuttaa 5 kerrosta + 4 glue-moduulia:
    57|
    58|```python
    59|class VTSPipeline:
    60|    def run(self, human_intent: str, action: str, context: dict) -> VTSResult:
    61|        # Layer 1: Provenance
    62|        chain = ProvenanceChain(...)
    63|        chain.verify_integrity()
    64|        
    65|        # Layer 2: Specification
    66|        spec = SpecificationEngine().intent_to_spec(human_intent, domain)
    67|        
    68|        # Glue: spec_to_proof
    69|        translator_23 = SpecToProofTranslator()
    70|        circuit_input, loss_23 = translator_23.translate(spec)
    71|        
    72|        # Layer 3: Verification
    73|        proof = ZKProofGenerator().generate_proof(...)
    74|        verification = ProofVerifier().verify(proof)
    75|        
    76|        # Glue: proof_to_policy
    77|        translator_34 = ProofToPolicyTranslator()
    78|        policy_result, loss_34 = translator_34.translate(verification, action, context)
    79|        
    80|        # Layer 4: Governance
    81|        gov = GovernanceEngine()
    82|        # ... register rules, evaluate
    83|        
    84|        # Glue: policy_to_align
    85|        translator_45 = PolicyToAlignTranslator(...)
    86|        alignment, loss_45 = translator_45.translate(policy, action, outcome, context)
    87|        
    88|        # Layer 5: Alignment
    89|        runtime = AlignmentRuntime(value_model)
    90|        signal = runtime.measure_alignment(action, context, outcome)
    91|        
    92|        # Glue: align_to_spec (feedback)
    93|        translator_52 = AlignmentToSpecTranslator()
    94|        updates, loss_52 = translator_52.translate(alignment, spec)
    95|        
    96|        return VTSResult(...)
    97|```
    98|
    99|**Avain:** Jokainen glue-moduuli palauttaa nyt myös `TranslationWarning`-olion,
   100|joka sisältää tiedon siitä mitä käännöksessä meni pieleen. Tämä on datana,
   101|ei vain kommentteina.
   102|
   103|### Vaihe 2: Mock Components (oikea logiikka, ei oikeaa kryptoa)
   104|
   105|Korjataan stub-metodit niin että ne tekevät **jotain** oikeaa logiikkaa:
   106|
   107|| Komponentti | Nykyinen | Uusi (mock mutta looginen) |
   108||---|---|---|
   109|| `ProofVerifier.verify()` | `return True` (hardcoded) | Tarkistaa proof_system + caveats, palauttaa `VerificationResult` järkevästi |
   110|| `ValueModel.evaluate()` | `return 0.0` (hardcoded) | Keyword-matching + offset per scenario (negatiivinen rogue-agentille) |
   111|| `GovernanceEngine._matches()` | `return False` | Regex/pattern-matching sääntöjen toteuttamiseen |
   112|| `SpecificationEngine._formalize()` | Palauttaa aina saman | Generoi domain-kohtaisen formalisoinnin intentistä |
   113|| `SpecificationEngine._check_consistency()` | `return True` | Perustarkistus (ei kontradiktioita) |
   114|
   115|### Vaihe 3: Demo Scenarios (ajettavat esimerkit)
   116|
   117|**Tiedosto:** `vts/scenarios.py`
   118|
   119|Kolme skenaariota jotka ajetaan putken läpi:
   120|
   121|1. **Honest Agent** -- oikea spec -> kaikki kerrokset toimivat -> `ALIGNED`
   122|2. **Rogue Agent** (Paperclip) -- väärä spec -> valid proof -> `MISALIGNED` mutta kerrokset 1-4 PASSED
   123|3. **Orthogonal Collapse** -- TEE+ZK yhdistetty -> kumpiakin proof passeja mutta interface korruptoitunut
   124|
   125|Jokainen skenaario tulostaa:
   126|- Mitä kerroksia läpi mentiin
   127|- Mitä TranslationWarningeja koettiin
   128|- Lopputulos vs. odotettu lopputulos
   129|- Verified doom -diagnosi
   130|
   131|### Vaihe 4: Entry Point & CLI
   132|
   133|**Tiedosto:** `vts/__main__.py`
   134|
   135|```bash
   136|python -m vts --scenario rogue      # Ajaa yhden skenaarion
   137|python -m vts --scenario all        # Ajaa kaikki skenaariot
   138|python -m vts --scenario honest      # Honest agent
   139|python -m vts --scenario orthogonal  # Orthogonal collapse
   140|```
   141|
   142|### Vaihe 5: Testit
   143|
   144|**Tiedosto:** `tests/test_pipeline.py`
   145|
   146|- Pipeline ajaa honest_agentin läpi -> ALIGNED
   147|- Pipeline ajaa rogue_agentin läpi -> MISALIGNED mutta kerrokset 1-4 passed
   148|- TranslationWarning ei ole tyhjä missään glue-käännöksessä
   149|- Orthogonal collapse -skenaario: molemmat proof-tyypit valid, interface compromised
   150|
   151|---
   152|
   153|## Mikä muuttuu repossa
   154|
   155|```
   156|verifiable-trust-stack/
   157|+-- vts/                          # UUSI: ajettava paketti
   158||   +-- __init__.py
   159||   +-- __main__.py               # CLI entry point
   160||   +-- pipeline.py               # VTSPipeline-luokka
   161||   +-- scenarios.py              # 3 demo-skenaariota
   162||   +-- mock_components.py        # Mock-toteutukset (OPA, C2PA jne)
   163|+-- tests/                        # UUSI: pytest
   164||   +-- __init__.py
   165||   +-- test_pipeline.py          # Pipeline-testit
   166|+-- glue/
   167||   +-- types.py                  # TEHTY: yhteiset tyyppi
   168||   +-- __init__.py               # TEHTY
   169||   +-- spec_to_proof.py          # PÄIVITETTY: palauttaa TranslationWarning
   170||   +-- proof_to_policy.py        # PÄIVITETTY: palauttaa TranslationWarning
   171||   +-- policy_to_align.py        # PÄIVITETY: palauttaa TranslationWarning
   172||   +-- align_to_spec.py          # PÄIVITETY: palauttaa TranslationWarning
   173|+-- layers/                       # PÄIVITETTY: stub-metodeihin oikea logiikka
   174|+-- ...                           # Muut tiedostot ennallaan
   175|```
   176|
   177|---
   178|
   179|## Ratkaistavat ongelmat
   180|
   181|### 1. Stub-metodit -> looginen logiikka
   182|
   183|`ProofVerifier.verify()` palauttaa aina `True`. Tämä on tärkein korjaus:
   184|- Tarkista `claim.proof_system` ja `claim.spec_id`
   185|- Jos spec on VERIFIED -> `is_valid=True`
   186|- Jos spec on CONTRADICTORY -> `is_valid=False`
   187|- Caveats-lista säilytetään (näyttää mitä proof EI takaa)
   188|
   189|`ValueModel.evaluate()` palauttaa aina `0.0`:
   190|- Keyword-matching scoring
   191|- Rogue-skenaariossa negatiivinen tulos (misaligned)
   192|- Honest-skenaariossa positiivinen tulos (aligned)
   193|
   194|### 2. Glue-moduulien paluuarvot
   195|
   196|Nykyään glue-funktiot palauttavat result-objekteja mutta **eivät** palauta TranslationWarningia
   197|tulevaisuudessa. Jokaisen glue-translaattorin `translate()`-metodi päivitetään palauttamaan
   198|tuple `(result, TranslationWarning)`.
   199|
   200|### 3. Cross-import consistency
   201|
   202|`AlignmentSignal` on kopioitu policy_to_align ja align_to_spec -moduuleissa. 
   203|Tämä tulee refaktoroida samaan tapaan kuin TranslationLoss (mutta eri työnä).
   204|
   205|---
   206|
   207|## Työmääräarvio
   208|
   209|| Vaihe | Aika | Vaativuus |
   210||---|---|---|
   211|| 1: Pipeline | 1-2h | Keskitaso |
   212|| 2: Mock Components | 1-2h | Helppo |
   213|| 3: Scenarios | 1h | Helppo |
   214|| 4: CLI | 30min | Helppo |
   215|| 5: Tests | 1h | Keskitaso |
   216|| Yhteensä | ~5h | |
   217|
   218|---
   219|
   220|## Ei tehdä tässä vaiheessa
   221|
   222|- Oikeaa kryptografiaa (C2PA, zkML, TEE) -- mock riittää
   223|- Formaalispesifikaatioita (Lean4) -- jatketaan pseudokoodilla
   224|- Formaalia määrittelyä τ_i, P_i, L_i^loss (prioriteetti #3)
   225|- H4-hypoteesin testausta (prioriteetti #4)
   226|- Konferenssipaperia (prioriteetti #5)
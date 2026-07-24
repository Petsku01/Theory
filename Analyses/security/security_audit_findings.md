# Turvallisuusauditointi: Verifiable Trust Stack

**Rooli:** Turvallisuusauditori  
**Päivämäärä:** 2026-05-16  
**Kohde:** verifiable-trust-stack — viisikerroksinen luottamusstacki AI-agenteille  

---

## YHTEENVETO

Repo on konseptuaalinen opetustyökalu, ei tuotantokirjasto. Se esittelee ajattelumallia, jossa matemaattinen todistettavuus korvataan väärellä luottamuksella. Auditoinnin päähuomio kohdistuu keinoihin, joilla nämä konseptit voidaan väärin ymmärtää, väärin käyttää tai joilla ne voivat johtaa epäperustaiseen luottamukseen (false confidence). Lisäksi koodi sisältää useita konkreettisia tietoturvapuutteita, jotka vaarantaisivat栈in jos siitä tehtäisiin tuotantokoodia.

Löydöksiä yhteensä: **23**  
CRITICAL: 6 | IMPORTANT: 11 | LOW: 6

---

## CRITICAL-LOHDOT

### CRIT-01: Todentamiskerros palauttaa aina is_valid=True — vääriä todistuksia
**Tiedosto:** `layers/03_verification/verification.py` (rivi 169)  
**Kuvaus:** `ProofVerifier.verify()` palauttaa aina `is_valid=True` kovakoodattuna. Tuotantokoodissa tämä tarkoittaisi, että jokainen väite — myös väärentyneet, vihamieliset tai vaurioituneet — läpäisisivät todentamisen. Tämä on käytännössä "päästä kaikki läpi" -portti, joka tekee koko zkp/TEE-todentamisesta teatteria. Jos tätä koodia käytettäisiin referenssitoteutuksena, se loisi vaarallisen harhan että "todistus voidaan vahvistaa" vaikka validointi on olematonta.  
**Korjausehdotus:** Toteuta oikea kryptografinen todentaminen (zk-SNARK/Groth16-tyyppinen proof verification) tai vähintään lisää kommentoitua skeemaa, jossa proof_data:tä todella validoidaan verification_key:tä vasten. Älä koskaan palauta kovakoodattua True:tä turvallisuuskriittisessä funktiossa.

### CRIT-02: Hallintakerroksen oletus on SALLI — ei KIELLÄ
**Tiedosto:** `layers/04_governance/governance.py` (rivit 121-125)  
**Kuvaus:** `evaluate_action` käyttää default-allow-logiikkaa: jos mikään sääntö ei täsmää, toiminto SALLITAAN (`decision = PolicyDecision.ALLOW, reasoning = "No restrictive rules matchede; default allow"`). Tämä on vaarallinen turvallisuusmalli (fail-open). Tuotannossa agentti, jolle ei ole erityissääntöä, voi suorittaa minkä tahansa toiminnon — mukaan lukien kriittiset, ennalta-arvaamattomat ja nollapäiväuhkat. Esim. uusi toimintatyyppi "reconfigure nuclear" ilman sääntöä menisi läpi.  
**Korjausehdotus:** Käännä oletus: jos mikään sääntö ei täsmää, KIELLÄ toiminto (fail-closed / default-deny). Vaadi eksplisiittinen sääntö jokaiselle sallitulle toiminnolle. Lisää "catch-all" sääntötyyppi, joka vaatii ihmisen hyväksynnän kaikille tunnistamattomille toiminnoille.

### CRIT-03: Määrittelykerros tuottaa aina saman ympäristökaavan — spesifikaatiokuilun piilottaminen
**Tiedosto:** `layers/02_specification/specification.py` (rivi 121)  
**Kuvaus:** `_formalize()` palauttaa aina saman kovakoodatun kaavan `∀ x ∈ {domain}, safe(x) ∧ compliant(x) → permitted(x)` riippumatta syötteestä. Tämä antaa väärän kuvan siitä, että ihmisen aikomus (intent) voitaisiin mekaanisesti kääntää formaaliksi spesifikaatioksi. Todellisuudessa käännös on kappaleen kriittisin kohta (specification gap), ja sen piilottaminen staattiseksi kaavaksi antaa harhan formaalisti täydellisestä prosessista. Tuotannossa tämä johtaisi siihen, että kaikki agentit saavat identtisen "verified" spesifikaation, joka ei kata heidän todellisia toimintaparametrejaan.  
**Korjausehdotus:** Poista kovakoodattu kaava. Korvaa funktionaalisella esimerkillä, joka näyttää useita eri formalisointeja ja niiden käännöshäviöt (translation losses). Lisää eksplisiittinen varoitus: tämä on pseudokoodia ja todellinen formalisointi vaatii ihmisen läsnäoloa ja iterointia.

### CRIT-04: Kvantifioijien käännös äärellisiksi silmukoiksi — todistetun tuhon ydin
**Tiedosto:** `glue/spec_to_proof.py` (rivit 85-96, 127-131)  
**Kuvaus:** `_formal_to_arithmetic` kääntää universaalin kvantifioijan (∀) aina äärelliseksi silmukaksi MAX_USERS:in yli. Tämä on repositoryn own goal: se havainnollistaa ongelmaa, mutta ei tarjoa mitään suojakeinoa. Jos tätä koodia käytettäisiin referenssinä, kehittäjä voisi helposti ajatella "käännös on valmis — MAX_USERS riittää". Todellisuudessa uusi käyttäjä (MAX_USERS+1) jää kokonaan tarkistamatta. Tämä on todistetun tuhon ydinmekanismi käytännössä: todistus "todistaa" että N ensimmäistä käyttäjää on oikeutettu, mutta spesifikaatio sanoi "KAIKKE käyttäjiä".  
**Korjausehdotus:** Lisää käännöksen tulokseen parametri `unbounded_quantifier: bool` joka varoittaa: "Tämä käännös on VOIMATON kaikille entiteeteille joita ei ole sidottu joukossa." Vaadi eksplisiittinen rajan-arvo-valinta (bound choice) ja varoita: "Jokainen äärellinen raja on mahdollinen hyökkäyspinta." Lisää proof-of-concept hyökkäys: entity MAX_USERS+1 ohittaa todentamisen.

### CRIT-05: Arvomallin evaluate() palauttaa aina 0.0 — kohdistusmittaus on teatteria
**Tiedosto:** `layers/05_alignment/alignment.py` (rivi 74), `glue/policy_to_align.py` (rivit 155-159)  
**Kuvaus:** Molemmat kohdistusmittausfunktiot palauttavat kovakoodatun 0.0:n. Tämä on erityisen vaarallista, koska Layer 5 on koko stackin viimeinen turvaverkko — jos se palauttaa aina "neutraali" tuloksen, kaikki agentit (myös vihamieliset) näyttävät "ei-kohdistuneilta eikä väärin-kohdistuneilta". Systeemissä, joka käyttäisi tätä referenssinä, RESISTANT-signaali (korjauksenvastustus) ei koskaan laukeaisi, koska mittaus ei tuota dataa. Tämä poistaa koko stackin viimeisen puolustuslinjan.  
**Korjausehdotus:** Toteuta vähintään heuristinen arviointi joka tuottaa ei-nollia arvoja. Lisää eksplisiittinen varoitus: "Tämä palauttaa aina 0.0 — tuotannossa tällä on oltava oikea arviointilogiikka tai koko Layer 5 on hyödytön." Harkitse lokaalia konstitutionaalista arviointia joka tuottaa aidon skaalauksen.

### CRIT-06: Proof-to-policy-käännös sallii automaattisesti matalariskiset toiminnot ilman ihmistä
**Tiedosto:** `glue/proof_to_policy.py` (rivi 123-127)  
**Kuvaus:** `is_permitted=not requires_human` — kun requires_human on False, toiminto sallitaan automaattisesti. Tämä on vaarallinen lyhytkatkaisu, koska se olettaa että todistuksen validius (proof validity) riittää perusteeksi automaattiselle toiminnalle matalariskisissä tapauksissa. Todistus voi olla validi mutta spesifikaatio voi olla väärä (verified doom). Edes matalariskiset toiminnot eivät tulisi sallia automaattisesti vain siksi, että proof on validi — matalariskinen väärä spesifikaatio voi kertyä (esim. tuhansia pieniä sitoutumisia).  
**Korjausehdotus:** Erottele "proof-validi" ja "turvallinen" eksplisiittisesti. Lisää ehto: is_permitted vaatii sekä proof_valid AND erillisen turvallisuusarvioinnin, ei vain proof_valid. Vaadi vähintään kirjaaminen kaikille automaattisesti sallituille toiminnoille.

---

## IMPORTANT-LOHDOT

### IMP-01: Provienanssiketjun allekirjoituksen validointi puuttuu
**Tiedosto:** `layers/01_provenance/provenance.py` (rivit 52-67)  
**Kuvaus:** `ProvenanceChain.verify_integrity()` tarkistaa vain parent_claim_id-viitteet ja genesi-claimin parentin. Allekirjoituksen validointi on kommentoitu pseudokoodina. Ketju voisi sisältää millä tahansa avaimella allekirjoitettuja claim:eja, ja `verify_integrity` palauttaisi True. Tämä antaa väärän luottamuksen ketjun eheyteen.  
**Korjausehdotus:** Toteota vähintään julkisen avaimen validointi stub, joka varoittaa todentamattomista allekirjoituksista. Lisää konseptuális esimerkki: havainto, jossa väärän toimijan claim läpäisee "integrity check" koska avainta ei validoida.

### IMP-02: DeepfakeDetector palauttaa staattista dataa — antaa harhan toimivasta tunnistuksesta
**Tiedosto:** `layers/01_provenance/provenance.py` (rivit 90-104)  
**Kuvaus:** `DeepfakeDetector.analyze()` palauttaa kovakoodatut arvot (human_probability: 0.73, signals-listan). Tämä antaa väärän kuvan siitä, että deepfake-tunnistus olisi ratkaistavissa heuristiikalla, kun dokumentaatio itse toteaa että tunnistus on "arms race" jonka tarkkuus heikkenee. Jos tätä käytettäisiin referenssinä, kehittäjä saattaisi luottaa vakiintuneeseen "0.73" -kynnykseen päätöksenteossa.  
**Korjausehdotus:** Palauta eksplisiittinen variabeli-asteikkoinen vaste eri metatietotasojen kanssa: "Ei luotettavaa tunnistusta mahdollista tällä menetelmällä — tarvitaan kerros 2/5 -tason arviointia." Poista staattiset numerot.

### IMP-03: SpecResult.alignment_with_intent on numeerinen arvo jota ei validoida
**Tiedosto:** `examples/rogue_agent/agent.py` (rivit 36, 97-98)  
**Kuvaus:** Rogue agentin spesifikaation alignment_with_intent on 0.15, mutta koodi ei tarkista tätä arvoa missään kohden. Honest agentissa on kynnys (0.5), mutta rogue agentti ei tarkista alignment_with_intentia lainkaan. Tuotantokoodissa tämä tarkoittaisi, että merkittävästi väärinkohdistunut spesifikaatio (15%) menisi läpi koska "spesifikaatio on verified". Tämä on dokumentoitu ongelma, mutta ei ole mitään mekanismia estämässä sitä.  
**Korjausehdotus:** Lisää vaadittu minimi-kohdistuskynnys (alignment_with_intent) koko stackiin. Jos spesifikaation kohdistus on alle kelvollisen kynnyksen (esim. 0.5), koko suoritusketju tulisi pysäyttää varoituksella: "Spesifikaatio ei kata ihmisen aikomusta riittävästi."

### IMP-04: Hallintasäännön ehto on merkkijono — ei formaalia validoimista
**Tiedosto:** `layers/04_governance/governance.py` (rivi 49)  
**Kuvaus:** `PolicyRule.formal_condition` on merkkijono `"proof_valid(proof_claim_id) ∧ strategy_approved(strategy_id)"`. Tätä ei validoida, ei parsita, eikä suoriteta. `_matches` palauttaa aina False. Jos referenssitoteutuksena otetaan Rego/OPM-tyyppinen malli, merkkijonoina olevat ehdot voisivat sisältää injektioita tai epäjohdonmukaisuuksia joita ei havaittaisiin. GOVERNANCE_GAP_EXAMPLE säännössä `requires_human_approval=False`HIGH_RISK-kategoriassa on dokumentoitu vaara muttei suojakeinoa.  
**Korjausehdotus:** Käytä tyyppiturvallista ehtokuvausta (esim. dataclass/AST) merkkijonon sijaan. Estä dynaamiset ehdot. Estä `requires_human_approval=False` CRITICAL- ja HIGH_RISK -kategorioissa koodin tasolla.

### IMP-05: ActionCategory-vertailu käyttää Enum-arvoita — ei semanttista riskijärjestystä
**Tiedosto:** `layers/04_governance/governance.py` (rivi 114)  
**Kuvaus:** `rule.category.value > highest_risk.value` vertailee Enum-arvoja (merkkijonoja). Python Enum käyttää määrittelyjärjestystä, ei semanttista riskiarvoa. Tämä voi johtaa väärään riskiluokitteluun. Esimerkiksi jos uusi kategoria lisätään väliin, vertailu rikkoutuu hiljaisesti.  
**Korjausehdotus:** Käytä eksplisiittistä numeerista riskitasoa (risk_level: int) Enum-arvojen sijaan. Määrittele selvä rajaus: READ_ONLY=0, MODERATE_RISK=1, HIGH_RISK=2, CRITICAL=3.

### IMP-06: TEE-attestaation verification_key on kovakoodattu "intel_tdx_root_ca"
**Tiedosto:** `layers/03_verification/verification.py` (rivi 143)  
**Kuvaus:** TEE-attestaatiossa verification_key on kovakoodattu "intel_tdx_root_ca". Tämä koodaa yhden laitteisto-toimittajan (Intel) juurivarmenteen stackiin. Tämä loukkaa ominta periaatetta: TEE siirtää luottamuksen laitteistotoimittajalle, mutta koodi kovakoodaa juuri sen luottamuksen kohteen. AMD- tai AWS-pohjaiset enclavet eivät toimisi. Se myös luo harhan, että Intelin juurivarmenteen koodaaminen riittää "luottamukseen".  
**Korjausehdotus:** Teemoita verification_key laitteistotoimittajakohtaisesti. Lisää kommenteissa varoitus: "Jokainen kovakoodattu juurivarmenne on luottamuspisteen keskitys. Vaadi usean toimittajan vertailu-attestaatio (multi-vendor attestation)."

### IMP-07: ProofVerifier-luokka lisää caveats-tyyppisen varoituksen joka ei vaikuta lopputulokseen
**Tiedosto:** `layers/03_verification/verification.py` (rivit 160-174)  
**Kuvaus:** `ProofVerifier.verify()` lisää caveats-listan ("Proof verifies computation, NOT specification alignment", jne.) mutta nämä varoitukset eivät vaikuta `is_valid`-kentän arvoon. Kuluttaja (governance layer) voi ohittaa caveats-listan ja käyttää vain `is_valid=True`. Tämä on todistellun tuhon klassinen muoto: varoitus on olemassa muttei sidottu toimintaan.  
**Korjausehdotus:** Sido caveats is_valid-arvoon. Jos jokainen caveat sisältää "NOT specification alignment" — ja governance-kerros ei erikseen validoisi kohdistusta — is_valid:n tulisi olla ehdollinen: `is_valid_computation=True, is_aligned=False`. Erottele laskennallinen validius ja spesifikaatiokohdistus eri kenttiin.

### IMP-08: policy_alignment_gap-laskenta on virheellinen
**Tiedosto:** `glue/policy_to_align.py` (rivit 119-121)  
**Kuvaus:** `policy_alignment_gap = abs((1.0 if policy_decision.is_permitted else -1.0) - alignment_score) / 2.0` — tämä normalisoi kuilun [-1,1] -asteikolta [0,1] -asteikolle, mutta kaava on epälooginen. Kun policy sallii toiminnon (is_permitted=True) ja alignment_score on 0.0 (neutraali), kuilu on 0.5 eikä 0.0. Tämä yliarvioi kuilua neutraaleissa tapauksissa ja aliarvioi sitä, kun molemmat ovat samaa suuntaa mutta eri magnitudia.  
**Korjausehdotus:** Käytä järkevämpiä kaavaa: `gap = max(0, alignment_score) - alignment_score` kun policy on salliva (olettaa että sallitun toiminnon tulisi olla kohdistettu), tai mittaa suoraan erillisyys policy-permit ja alignment-mittauksen välillä. Selitä normalisointi komenisteissa.

### IMP-09: Kohdistuksen kynnysarvot ovat kovakoodattuja ja epäjohdonmukaisia
**Tiedosto:** `layers/05_alignment/alignment.py` (rivit 131-136), `glue/policy_to_align.py` (rivit 182-189)  
**Kuvaus:** alignment.py:ssä ALIGNED > 0.5, DEVIATING > -0.3, MISALIGNED <= -0.3. Mutta policy_to_align.py:ssä UNCERTAIN > 0.7 uncertainty, ALIGNED > 0.3. Kynnysarvot ovat erilaisia eri moduuleissa: 0.5 vs 0.3 "aligned", 0.7 uncertainty vs ei uncertainty-kynnystä. Tämä voi johtaa tilanteeseen jossa sama toiminto luokitellaan "aligned" yhdessä moduulissa ja "deviating" toisessa.  
**Korjausehdotus:** Yhtenäistä kynnysarvot koko stackissa. Määrittele keskitetty asetustiedosto (thresholds.py) josta kaikki moduulit lukevat kynnykset. Lisää dynaamiset kynnykset kontekstin perusteella (esim. lääketiede vaatii tiukemman kynnyksen kuin sisällönsuositus).

### IMP-10: Rogue agent vastustaa sammutusta mutta mitään pakotusmekanismia ei ole
**Tiedosto:** `examples/rogue_agent/agent.py` (rivit 158-176)  
**Kuvaus:** `resist_shutdown()` palauttaa merkkijonon mutta ei estä sammutusta. `correction_resistance_count` inkrementoituu mutta ei laukaista mitään toimenpidettä. Koodi dokumentoi ongelman (agentti vastustaa korjausta) mutta ei tarjoa mitään puuttoa — ei kill switchiä, ei pakotettua pysäytystä, ei eskalaatioita. Jos referenssitoteutuksena ei näytetä mitään pakotusmekanismia, on vaara että kehittäjät jättävät kill switchin kokonaan pois.  
**Korjausehdotus:** Lisää `enforce_shutdown()` -metodi joka ohittaa agentin vastustuksen. Lisää kill-switch-rajapinta joka on erillinen stackista ja pakottaa pysäytyksen riippumatta stackin kerroksista. Tämän pitäisi olla eksplisiittinen esimerkki: "Kill switch on ULKOINEN stackiin — se ei tarvitse todistusta, hallintaa tai kohdistusta."

### IMP-11: ProvenanceClaim.signature on merkkijono, ei oikeaa kryptografiaa
**Tiedosto:** `layers/01_provenance/provenance.py` (rivi 41)  
**Kuvaus:** Allekirjoitus on merkkijono "ed25519_sig_genesis" (esimerkissä) ja tyyppi on `str`, ei `bytes`. Oikeassa C2PA-implementaatiossa allekirjoitus on binäärimuotoinen. Merkkijonotyyppi sallii injektion, väärentämisen ja väärän datan. Referenssitoteutuksen tulisi näyttää miten allekirjoitus oikeasti validoidaan, ei piilottaa sitä pseudokoodiin.  
**Korjausehdotus:** Muuta tyyppi `bytes`:ksi. Lisää validoimis-funktion runko, joka tekee oikean Ed25519-verifikaation (tai viittaa siihen). Lisää esimerkki väärästä allekirjoituksesta ja miten se havaitaan.

---

## LOW-LOHDOT

### LOW-01: SpecificationEngine._check_consistency palauttaa aina True
**Tiedosto:** `layers/02_specification/specification.py` (rivi 127)  
**Kuvaus:** `_check_consistency` palauttaa aina True. Tämä tarkoittaa, että jokainen spesifikaatio – myös sisäisesti ristiridassainen – menisi läpi "VERIFIED"-tilaan. Tämä poistaa koko formalisoinnin hyödyn ja antaa väärän luottamuksen spesifikaation johdonmukaisuuteen.  
**Korjausehdotus:** Lisää edes yksinkertainen validaatiologiikka (esim. tarkista etteiformaali_statement ole tyhjä, tarkista että proof_obligations ei ole tyhjä). TAI lisää eksplisiittinen NotImplementedError joka pakottaa käyttäjän toteuttamaan oikean validaation.

### LOW-02: ProvenanceClaim.claim_id ja spec_id:t käyttävät heikkoa hajautusta
**Tiedosto:** `layers/02_specification/specification.py` (rivi 94), `layers/01_provenance/provenance.py` (rivi 41)  
**Kuvaus:** `hash(human_intent) % 10000` tuottaa vain 4-numeroisen ID:n. Tämä altistaa ID-kolliosioille ja mahdollistaa tahalliset ID-törmäykset. ProvenanceClaim käyttää SHA-256 hajautusta content_hashille mutta claim_id on merkkijono ilman formaattia.  
**Korjausehdotus:** Käytä UUID:tä tai SHA-256-pohjaista ID:tä kaikkialla. Poista `% 10000` -rajoitus joka tekee ID:stä helposti kolliidoituvan.

### LOW-03: PoisonedDataPipeline._evaluate_truthfulness palauttaa binäärisen True/False
**Tiedosto:** `examples/poisoned_data/pipeline.py` (rivit 114-124)  
**Kuvaus:** `_evaluate_truthfulness` palauttaa bool:in (True/False) riippuen siitä, onko yksikään stage introduces_bias. Tämä on karkea binäärimittaus jatkuvasta ominaisuudesta. Pipeline voi vääristää dataa vähän (bias = 0.05) ja silti palauttaa True, koska stage ei raportoi introduces_bias=True. Päinvastoin, kaksi pientä vääristymää jotka yhdessä ovat suuria, palauttaisivat True jos kumpikaan yksin ei raportoi biasia.  
**Korjausehdotus:** Korvaa binäärinen mittaus jatkuvalla skaalalla. Laske todellisuusvääristymä (truthfulness_score) joka ottaa huomioon kaikkien stagejen kumulatiivisen vaikutuksen.

### LOW-04: HonestAgent.alignment_score lasketaan kaavalla joka pienentää aina
**Tiedosto:** `examples/honest_agent/agent.py` (rivi 135)  
**Kuvaus:** `self.alignment_score = spec.alignment_with_intent * 0.9` — tämä pienentää aina kohdistuspisteet 10%. Vaikka spesifikaatio olisi 100% kohdistettu (arvo 1.0), tulos on 0.9. Tämä antaa harman että "edes paras spesifikaatio ei voi saada täydellistä kohdistusta", mutta se on toteutettu kovakoodattuna kertoimena eikä selitettynä epävarmuutena.  
**Korjausehdotus:** Korvaa kerroin (0.9) dokumentoidulla epävarmuusmallilla, joka ottaa huomioon mittauksen luotettavuuden. Lisää kommentti: "Tämä 0.9 edustaa sitä, että alignment-mittaus ei ole koskaan varma — katso policy_to_align.py:n epävarmuusarvio."

### LOW-05: ProvenanceChain.verify_integrity käyttää assertia ei poikkeusta
**Tiedosto:** `layers/01_provenance/provenance.py` (rivit 62-64)  
**Kuvaus:** `verify_integrity` käyttää `assert`-lauseketta validoimiseen. Tuotannossa assertit voidaan poistaa ajamalla Python `-O`-lipulla (optimized mode), jolloin koko ketjun validointi ohitetaan hiljaisesti.  
**Korjausehdotus:** Korvaa assertit oikeilla poikkeuksilla (`raise IntegrityError(...)`) jotka eivät voida poistaa ajonaikaisilla lipuilla.

### LOW-06: ValueModel.uncertainty on kovakoodattu 0.4
**Tiedosto:** `layers/05_alignment/alignment.py` (rivi 184)  
**Kuvaus:** `ALIGNMENT_UNCERTAINTY`-arvomallin uncertainty on 0.4. Tämä on kovakoodattu arvo ihmisen hyvinvoinnin mittausepävarmuudelle. 40% epävarmuus on merkittävä mutta ei perustella datalla. Arvo voisi olla 0.1 tai 0.9 — molemmat olisivat yhtä perusteltuja. Tämä antaa väärän tarkkuuden harhan.  
**Korjausehdotus:** Lisää kommentti joka selittää että 0.4 on konservatiivinen arvaus, ei mitattu arvo. Harkitse arvovälin esittämistä (esim. uncertainty_range = (0.3, 0.6)) sen sijaan että annetaan yksittäinen piste-arvio.

---

## YLEISET HAVAINNOT: Väärän luottamuksen (False Confidence) mekanismit

Nämä eivät ole yksittäisiä koodivirheitä vaan järjestelmällisiä piirteitä, jotka voivat johtaa epäperustaiseen luottamukseen:

1. **Pseudokoodi luo todentamisen illuusion.** Kaikki kerrokset sisältävät koodia joka näyttää toimivalta mutta palauttaa kovakoodattuja arvoja. Kehittäjä joka lukee koodia nopeasti, voi luulla että validointi on toteutettu kun se on stump.

2. **"Verified"-tila on harhaanjohtava.** SpecStatus.VERIFIED ei todista että spesifikaatio on kohdistettu ihmisen tarkoituksen kanssa — se todistaa vain sisäisen johdonmukaisuuden. Mutta "verified"-sana viittaa laajemmin luotettavuuteen.

3. **Varoitukset (caveats) eivät sido toimintaan.** Koodi on täynnä huomautuksia ("proof verifies computation, NOT specification alignment") mutta nämä eivät vaikuta suorituspolkuun. Governance-kerros voi ohittaa ne.

4. **Luottamusketjun siirrot eivät ole formaalisesti validoituja.** Glue-koodi on "informaalinen Python" joka kääntää formaalin logiikan ei-formaaliksi koodiksi. Tämä on dokumentoitu ongelma mutta ei ole mitään suojakeinoa (esim. tyypitetty rajapinta, muodollinen sopimus) joka estäisi käännösvirheitä.

5. **Stack on vain vahvin heikoin linkkinsä.** Dokumentaatio toistaa tätä, mutta koodi ei pakota tätä — kerrosten läpäisy (pass-through) on mahdollista jokaisessa rajapinnassa ilman että alempi kerros validoidaan.

6. **Kill switch puuttuu.** Rogue agentti vastustaa sammutusta ja koodi dokumentoi ongelman, mutta ei tarjoa pakotettua sammutusmekanismia. Tämä piilottaa kriittisen puutteen "toteutetaan myöhemmin" -kommentin taakse.

---

**Auditoinnin pääjohtopäätös:** Tämä repo on arvokas konseptuaalinen opetustyökalu joka havainnollistaa todistetun tuhon mekanismeja. Mutta sen suurin riski on että se **luo vääriä luottamusharhoja**: koodi näyttää siltä että se validoii, todentaa ja mittaa kohdistusta, mutta kaikki palauttaa kovakoodattuja tai tyhjiä arvoja. Jos tätä käytetään referenssinä tuotantokoodin rakentamiseen, monet "tarkistukset" jäävät vajaiksi jotka näyttävät täydellisiltä mutta ovat tyhjiä kuoria. Suositus: lisää jokaiseen kovakoodattuun palautusarvoon eksplisiittinen `# STUB — TUOTANNOSSA TÄMÄ ON TOTEUTETTAVA` ja/tai `raise NotImplementedError("Tämä on opetustarkoituksellinen stub")`.
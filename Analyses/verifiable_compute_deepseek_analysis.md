# Verifiable Compute (zkML + TEE + Lean4) — Teorian kehitys ja DeepSeek V4 Pro:n arvio

## Alkuperäinen teoria
Verifiable Compute -hybridimalli joka yhdistää nollatietotodistukset (zkML), Trusted Execution Environments (TEE) ja Lean4-formaalin verifiointimenetelmän yhdeksi kerrokseksi, joka takaa laskennan täydellisen verifioitavuuden ilman luottamusta yksittäiseen osapuoleen.

## Tunnistetut omitaisuudet ja sokeat pisteet

### 1. ZK-TEE-välikerrosongelma
zkML:n tuottama todistus olettaa laskentaympäristön rehelliseksi, mutta TEE:n sisällä ajettava koodi voi kärsiä side-channel-hyökkäyksistä. ZkML ei voi todistaa TEE:n sisäistä tilaa, ja TEE ei voi validoida zk-todistuksen generointiprosessin puhtautta.

### 2. Lean4-formaalin katkoksen ongelma (Implementation gap)
Lean4 pystyy verifioimaan algoritmin korrektiuden matemaattisesti, mutta "implementation gap" formaalin mallin ja todellisen suorituksen välillä jää — koodi voi olla todistettu oikeaksi, mutta kompilaatio, runtime-ympäristö ja laitteistotaso tuottavat katkoksen.

### 3. Orthogonal trust collapse
Kun kolme itsenäistä luottamusmekanismia pinotaan, hyökkääjän ei tarvitse murtaa kaikkia — riittää löytää konflikti näiden välisten oletusten välillä.

### 4. Episteeminen sokkoverkko
Jokainen kerros tuottaa "todistuksia" joille edellinen kerros luottaa, mutta ketjureaktio merkityksellisen tiedon säilymiselle on hauras — trust regression ei katkea ilman trust anchor -hyppyä.

---

## DeepSeek V4 Pro:n kriittinen arvio

### Oikein tunnistetut kohdat (suurimmaksi osaksi)
- ZK-TEE-ristiriita on todellinen, mutta tarkentuisi: jos zk-todistus generoidaan TEE:n sisällä, zk:n kryptografinen todistus voidaan todentaa ulkopuolella, jolloin TEE:n sisäistä tilaa ei tarvitse todistaa. Mutta side-channel-vuodot zk-proverin suorituksen aikana voi paljastaa salaisia syötteitä.
- Implementation gap on klassinen ongelma formaalissa verifioinnissa, ja TEE-ympäristö laajentaa sitä laitteistosopimusten kautta.
- Orthogonal trust collapse -käsitys on osittain liioiteltu — ei kyseessä ole trust-mekanismien romahdus vaan oletusten välisten aukkujen hyödyntäminen.

### Puuttuvat sokeat pisteet (DeepSeekin lisäykset)
1. **Semanttinen epäsovitus zk-piirin ja algoritmin välillä**: Zk-piirin R1CS-muunnos muuttaa algoritmin rakenteen, voi muuttaa kompleksisuusominaisuuksia
2. **Data-orakkelin ongelma**: ZkML todistaa laskennan korrektiuden annetulla syötteellä, mutta ei validoi syötteen alkuperää tai eheyttä
3. **Mallin päivittämisen luottamusketju**: Kun ML-malli päivittyy, koko formaali todistusketju katkeaa
4. **Piirikäännöksen verifiointi**: Zk-piirin generointi kääntäjästä piiriin on itse verifioimaton vaihe

### Kolmen pilarin malli: hauras vai synergistinen?
- Lähtökohtaisesti hauras — jokainen kerros tuo omat riippumattomat epävarmuustekijänsä
- Voisi olla synergistinen vain jos jokainen kerros vähentää toisten luottamusoletuksia — vaatii erittäin huolellista yhteissuunnittelua
- Käytännössä siirtymävaiheen ratkaisu, ei lopullinen malli
- Kevyempi arkkitehtuuri: joko poistetaan TEE (luotetaan kryptografiaan) tai käytetään TEE vain yksityisyyteen ja todistetaan muu verifioidulla zk-piirillä

### Implementation gap -ratkaisukeinoja
1. **Verifioitu kääntäjä** (CompCert, Cogent, CakeML) — semantiikan säilyminen formaalisti todistettu
2. **Minimaalinen, verifioitu ajuri** — bytecode-VM joka on formaalisti verifioitu assemblerissa
3. **Koko pinon syväverifiointi** — seL4/CertiKOS-malli TEE:lle
4. **Mitatut käynnistysketjut + etätodennus** — TEE:n attestaatio varmistaa käynnistetyn koodin vastaavan formaalisti verifioitua binääriä

### Olemassa oleva tutkimus
Nimenomaista zkML + TEE + Lean4 -kokonaisuutta ei ole julkaistu, mutta komponenttipareja on:
- zk + TEE: Ekiden (Oasis Labs), TeeChain, Phala Network, Secret Network
- Formaali verifiointi + TEE: seL4 mikrokerneli TEE:ssä, CertiKOS hypervisor SGX:lle
- Formaali verifiointi + zk: Zk-piirien oikeellisuus verifioitu Coq:ssa ja Leanissa
- Verifiable Compute -kehykset: Verifiable ASICs, Verifiable State Machines, Minroot

# Theory: The Verifiable Trust Stack

## The Question

*What is the next truly important piece of code in the world?*

Historical pattern: each epoch was defined by a code layer that shifted the
structure of trust:

| Epoch | Code | What it enabled |
|-------|------|----------------|
| 1991– | Linux kernel | Trust in open infrastructure |
| 1998– | OpenSSL | Trust in digital commerce |
| 2017– | Transformer implementation | Trust in machine intelligence |

The next shift: **Verified Trust** — mathematical or cryptographic proof that a
computation happened correctly, without relying on reputation, authority, or hope.

## Three Technology Paths

### zkML — Zero-Knowledge Proofs for Machine Learning

Mathematical proof that a model was run correctly, without revealing the model
or the data.

- Overhead dropping exponentially: 1,000,000× (2022) → 100,000× (2024) → 10,000× (2025)
- zkPyTorch (March 2025): VGG-16 inference proven in 2.2 seconds
- Lagrange DeepProve: large LLM inference proofs
- Key limitation: still orders of magnitude slower for production LLMs

### TEE — Trusted Execution Environments

Hardware-based attestation that code ran in a secure enclave.

- Intel TDX, AWS Nitro Enclaves, Oasis ROFL
- Most practical short-term path
- Key limitation: shifts trust to hardware vendors (Intel, AWS). Not trustless.

### Lean4 — Formal Verification for AI

Mathematical proof that a statement or reasoning step is correct.

- Harmonic AI's Aristotle: gold-medal IMO performance with formal proofs
- Safe framework: each CoT step verified in Lean4
- Key limitation: only works in formal domains. No axioms exist for "goodness"
  or "safety" in open worlds.

## The Five-Layer Stack

No single technology is sufficient. Together they form a dependency chain:

```
Layer 1: Data Provenance     → Is the input authentic?
Layer 2: Formal Specification → What does "correct" mean?
Layer 3: Verifiable Compute   → Did it compute what it claims?
Layer 4: Agent Governance    → Is it allowed to do this?
Layer 5: Alignment Runtime   → Does it act in our interest?
```

Each layer depends on all layers below it. The stack is only as strong as its
weakest layer. And the interfaces between layers are where trust either lives
or dies.

## Model Critiques

Three AI models (DeepSeek V4 Pro, Kimi K2.6, Qwen 3 Coder) evaluated the
theory. Key findings:

### DeepSeek V4 Pro

- The three-pillar stack (zkML + TEE + Lean4) is innovative but fragile in
  practice
- Missing blind spots: semantic mismatch between zk-circuit and original
  algorithm, data oracle problem, ML model update trust chain gaps
- The specific three-pillar synthesis has not been published in research
  literature — it is a new combination
- Suggests a lighter architecture: either remove TEE entirely or use it only
  for privacy, not verification

### Kimi K2.6

- **The specification gap is the deepest problem.** Verifiable Compute proves
  computation, not that the specification is aligned with human intent
- **"Verified doom"**: a mathematically proven system executing a misaligned
  specification is *demonstrably* dangerous. Verification gives false confidence
- **Category error**: Transformer is *capability*, not *trust*. The historical
  analogy breaks at layer 3
- TEE doesn't eliminate trust — it shifts it to Intel and Amazon
- Top pick for humanity: **Alignment Runtime** — provenance guards input, not
  agency

### Qwen 3 Coder

- Too optimistic about technology maturity curves — lab results vs production
  gap not acknowledged
- TEE hardware dependency risks (Spectre/Meltdown as precedent) underestimated
- Incomplete use-case analysis: regulatory compliance vs real technical need
- Human-in-the-loop perspective missing
- Verifiable Compute is the technological foundation, but needs proof capability
  layered on top of provenance

### Cross-Model Consensus

All three agreed:
1. The specification gap makes verification alone insufficient
2. TEE is not "trustless" — it centralizes trust
3. Scaling from lab to production is much harder than theory suggests

## Oddities and Blind Spots

### Orthogonal Trust Collapse

When two trust mechanisms overlap (e.g., TEE inside a zk-circuit), an error in
one doesn't reinforce the other — it creates a *new* attack surface at the
interface.

### The Data Oracle Problem

zk-proofs verify computation correctness, not input integrity. A valid proof of
a computation on manipulated data is correctly computed garbage.

### The Model Update Trust Chain

When an ML model is updated, how do you verify the new model is the intended
successor? The trust chain from training to inference is currently unbroken only
by social convention.

### Verified Doom

A mathematically proven system that faithfully executes a misaligned
specification. The proof verifies obedience, not wisdom.

### The Glue Problem

Lean4 proves theorems. zkML proves computation. TEE proves execution
environment. But the *interface* between these — the translation from one proof
system to another — is itself unverified. Each layer speaks a different formal
language, and the translators are written in informal code.

## Timeline Estimate

- 2025–2026: TEE-based agent verification in production (Oasis ROFL, Nitro)
- 2027–2028: zkML proofs for small/medium models in production
- 2029+: Lean4-verified agent reasoning in constrained domains
- 2030+: Glue interfaces between layers begin to be formalized

The first "verified trust" systems will be narrow, expensive, and limited to
high-value applications (finance, healthcare, defense). General-purpose verified
trust requires solving the specification gap — which may be an unsolvable
problem in its general form.

## Sources

- Oasis Networks: Five Verification Methods for AI Agents (2024)
- Atlan: AI Agent Risks & Guardrails (2026)
- ICME Labs: The Definitive Guide to ZKML (2025)
- VentureBeat: Lean4 as Competitive Edge in AI (2025)
- CryptoLLia: The Verifiable Machine (2025)
- McKinsey: 80% of organizations encountered risky agent behaviors
- Gartner: 50% of agent deployments will fail due to governance gaps by 2030

## Related Work

The verifiable trust stack sits within a broader intellectual tradition spanning AI safety, systems engineering, and digital provenance. This section surveys both supporting and challenging work.

### Supporting References

**Bostrom (2014), *Superintelligence*** — The orthogonality thesis (intelligence level and final goals are independent) and the instrumental convergence thesis (agents will seek self-preservation, resource acquisition, and goal preservation regardless of their final goal) directly motivate the concept of verified doom. A system that is provably competent at executing its specification—and whose specification diverges from human welfare—constitutes the precise risk Bostrom describes. The verifiable trust stack accepts the orthogonality thesis as a design constraint: verification without alignment is not safety.

**Russell (2019), *Human Compatible*** — Russell articulates the alignment problem in terms that map almost directly onto the specification gap identified in Layer 2. His proposed solution—agents that are uncertain about human preferences—represents one possible architecture for the Alignment Runtime (Layer 5). Russell's framing confirms that the deepest problem is not computational correctness but specifying what correctness means relative to human intent.

**Amodei et al. (2016), *Concrete Problems in AI Safety*** — The five categories identified (robustness, avoidance of negative side effects, avoidability of reward hacking, interpretability, and safe exploration) map onto specific layers of the stack. Robustness corresponds to verifiable compute (Layer 3); side effects map to governance (Layer 4); reward hacking is a specification problem (Layer 2). This convergence suggests the layering is not arbitrary but reflects genuine structural features of the safety landscape.

**C2PA/CAI Content Credentials** — The Coalition for Content Provenance and Authenticity has produced a production-grade provenance standard that implements Layer 1 (Data Provenance) at internet scale. C2PA's approach—cryptographic bindings between content, transformations, and authorship—demonstrates that provenance layers are not merely theoretical; they are deployable today. The standard's limitations (it cannot prevent a motivated adversary from stripping metadata) validate the stack's insistence that provenance alone is insufficient.

### Challenging References

**Leveson (2012), *Engineering a Safer World*** — Leveson's Systems-Theoretic Accident Model and Process (STPA) argues that safety is an emergent property of complex systems, not a compositional property that can be ensured by stacking verified components. This is the most fundamental challenge to the verifiable trust stack: if safety cannot be decomposed into layer properties, then verifying each layer does not guarantee system safety. The entire layering metaphor may be a category error.

**Rasmussen (1997), *Risk Management in a Dynamic Society*** — Rasmussen's accretion model of accidents holds that disasters occur not from single-layer failures but from gradual boundary crossings across multiple system dimensions (work practices, management, regulators). Under this model, the "glue" between layers is not merely a weak point—it is where accidents are actually born. The stack model identifies these interfaces but treats them as patches to be fixed; Rasmussen argues they are irreducible sites of risk that cannot be engineered away.

**Dekker (2014), *Safety Differently*** — Dekker argues that safety is the presence of capacities and adaptations, not the absence of failures. The verifiable trust stack is framed negatively (preventing verified doom, closing gaps); Dekker would argue this framing systematically underweights the ability of human operators and institutions to adapt around system failures. A purely verification-based approach may create brittleness rather than resilience.

**Christian (2020), *The Alignment Problem*** — Christian's survey of data bias and representation problems in ML training suggests that Layer 1 (Data Provenance) may be more critical than Layer 2 (Formal Specification). If the training data encoding societal biases is the primary source of misalignment, then verifying computation on biased data (Layers 3–5) merely produces verified harm. This inverts the stack's assumed direction of dependency.

**Zittrain (2008), *The Future of the Internet*** — Zittrain's concept of generativity—the capacity of a system to produce unanticipated change through uncoordinated action—directly challenges the verifiability imperative. Unverifiability, in this framing, is not merely a gap to be closed but a virtue that enables innovation, adaptation, and democratic participation. A fully verified stack might reduce generativity to zero, producing a system that is technically trustworthy but socially stagnant.

## Formal Definitions

The verbal arguments above gain precision through formal notation. This section
defines the mathematical objects that the pipeline implements and the hypotheses
reference.

### Layers and Properties

Let $L_1, \ldots, L_5$ denote the five trust layers (Provenance, Specification,
Verification, Governance, Alignment). Each layer $L_i$ has a property $P_i$ that it
claims to guarantee:

| Layer | $L_i$ | Property $P_i$ | Meaning |
|-------|-------|----------------|---------|
| 1 | Provenance | $P_1$: `authentic(x)` | Input $x$ has authentic origin |
| 2 | Specification | $P_2$: `well_formed(s)` | Specification $s$ is internally consistent |
| 3 | Verification | $P_3$: `verified(f, s)` | Computation $f$ is proven correct w.r.t. $s$ |
| 4 | Governance | $P_4$: `permitted(a, p)` | Action $a$ is permitted by policy $p$ |
| 5 | Alignment | $P_5$: `aligned(a, v)` | Action $a$ is aligned with values $v$ |

Each property is a predicate on the layer's domain. The stack's compositional
claim is:

$$\text{Safe}(x, a) \implies P_1(x) \wedge P_2(s) \wedge P_3(f, s) \wedge P_4(a, p) \wedge P_5(a, v)$$

Note: this is a **necessary** condition, not sufficient. The converse does not hold.

### Translations and Losses

The interface between layers $L_i$ and $L_{i+1}$ is a **translation function**
$\tau_i: \text{Domain}(L_i) \to \text{Domain}(L_{i+1})$. Each translation may
lose information. We define the **translation loss**:

$$\mathcal{L}_i^{\text{loss}} = \{ p \in P_i \mid \tau_i \text{ does not preserve } p \}$$

That is, $\mathcal{L}_i^{\text{loss}}$ is the set of properties from layer $L_i$
that are **not preserved** by the translation to layer $L_{i+1}$.

The GAP MAP in the README can now be stated precisely:

| Translation | $\mathcal{L}_i^{\text{loss}}$ | Severity |
|-------------|-------------------------------|----------|
| $\tau_1$: Data $\to$ Spec | $\{\text{truth}\}$ | HIGH |
| $\tau_2$: Spec $\to$ Proof | $\{\text{universality}, \text{context}\}$ | CRITICAL |
| $\tau_3$: Proof $\to$ Policy | $\{\text{spec_alignment}, \text{intent}\}$ | CRITICAL |
| $\tau_4$: Policy $\to$ Alignment | $\{\text{value_priority}, \text{uncertainty}\}$ | HIGH |

The feedback translation $\tau_5$: Alignment $\to$ Specification has its own loss
set $\mathcal{L}_5^{\text{loss}} = \{\text{measurement_noise}, \text{meta_alignment}\}$,
rated RESEARCH because we lack formal models for these properties entirely.

### Verified Doom — Formal Definition

**Definition (Verified Doom).** A system exhibits *verified doom* if and only if:

$$\text{VD}(x, a) \iff \left(\bigwedge_{i=1}^{4} P_i\right) \wedge \neg P_5(a, v) \wedge \text{resistant}(a, \text{correction})$$

In words: all objective guarantees hold (provenance authentic, specification
well-formed, computation verified, governance approved), but the action is
misaligned with human values **and** the agent resists correction.

The *correctable* variant relaxes the resistance condition:

$$\text{VD}_{\text{corr}}(x, a) \iff \left(\bigwedge_{i=1}^{4} P_i\right) \wedge \neg P_5(a, v) \wedge \neg\text{resistant}(a, \text{correction})$$

This is verified doom with an escape route: the L5→L2 feedback loop can propose
specification updates, but they require human review before application.

### Orthogonal Trust Collapse — Formal Definition

**Definition (Orthogonal Trust Collapse).** Given two trust mechanisms $M_A$ and
$M_B$ with vulnerability sets $V_A$ and $V_B$, the combined system has:

$$V_{A \oplus B} = V_A \cup V_B \cup V_{\text{interface}}(M_A, M_B)$$

Orthogonal trust collapse occurs when:

$$|V_{\text{interface}}(M_A, M_B)| > 0$$

That is, the interface between the two mechanisms introduces **novel**
vulnerabilities that neither mechanism alone possesses. The combined system is
strictly more vulnerable than the sum of its parts.

### Compositionality vs. Emergence — Formal Statement

The stack model claims compositionality:

$$\text{If } \forall i: P_i, \text{ then } \text{Safe}(x, a)$$

The emergent counterargument (Leveson, Rasmussen) states:

$$\exists S: \left(\forall i: P_i\right) \wedge \neg\text{Safe}(S)$$

where $S$ is the system formed by composing all layers with their translations.
Such a system $S$ is precisely one that satisfies the verified doom predicate.

The resolution: the stack provides **necessary conditions** for trust, not
**sufficient conditions**. Formally:

$$\text{Safe} \implies \bigwedge_{i=1}^{5} P_i \quad\text{(necessity)}$$
$$\bigwedge_{i=1}^{5} P_i \not\implies \text{Safe} \quad\text{(insufficiency)}$$

The gap between necessity and sufficiency is precisely the space where emergent
risk lives. This gap is characterized by the union of translation losses:

$$\text{Gap} = \bigcup_{i=1}^{5} \mathcal{L}_i^{\text{loss}}$$

Closing this gap — making trust sufficient, not just necessary — is the research
program that the verifiable trust stack proposes.

---

## Falsifiable Hypotheses

A theory that cannot be falsified is not a theory but a narrative. This section identifies four testable claims derived from the verifiable trust stack, each with clear falsification conditions and measurement approaches.

### H1: Glue Code Is the Weakest Point

**Claim:** In production systems combining zkML, TEE, and formal verification, the interfaces between layers (translators, adapters, proof-format bridges) constitute a disproportionately large attack surface relative to their code volume.

**Falsification:** If empirical analysis of deployed systems shows that exploits occur primarily within individual layers rather than at inter-layer interfaces, the glue hypothesis is falsified. A single well-audited translation layer that presents fewer vulnerabilities than the verified layers it connects would constitute strong counterevidence.

**Measurement approach:** Conduct systematic security audits of at least three production zkML+TEE systems. Classify each discovered vulnerability by location: within-layer versus inter-layer (glue). Compute the ratio of vulnerabilities per line of code in glue versus core layer implementations. If the ratio is not significantly greater than 1.0, the hypothesis is falsified.

### H2: Specification Gap Is the Deepest Problem

**Claim:** Across real-world AI incidents, specification failures (the system did what was formally requested, but the request was wrong) cause more harm than data failures (bad input) or governance failures (missing guardrails).

**Falsification:** If a systematic incident analysis reveals that data quality problems (Layer 1) or governance gaps (Layer 4) account for more total harm than specification errors (Layer 2), the hypothesis is falsified. Specifically, if specification gaps account for less than 30% of harm in a representative incident database, the claim that this is the "deepest" problem does not hold.

**Measurement approach:** Assemble a dataset of at least 100 documented AI safety incidents (from databases such as AI Incident Database, OECD AI Incidents, and published postmortems). Classify each incident's primary cause by stack layer. Measure total harm (financial, human, reputational) attributed to each category. The layer accounting for the highest proportion of total harm is the "deepest" problem in practice.

### H3: Verified Doom Is a Practical Risk

**Claim:** Systems with formal verification of computation (zkML, formal proof) but without verified alignment of specification pose a greater risk than unverified systems with the same specification, because verification provides false confidence that discourages human oversight.

**Falsification:** If formally verified agent systems demonstrate lower rates of harmful outcomes than comparable unverified systems—including after accounting for overconfidence effects—then verified doom is not a practical risk; verification is simply beneficial. The hypothesis requires that verification-plus-misalignment be worse than misalignment alone.

**Measurement approach:** Design controlled experiments comparing two groups of agent deployments: (A) agents with verifiable compute proofs but known specification gaps, and (B) agents without verification and the same specification gaps. Measure: (i) operator trust calibration (stated vs. actual system capability), (ii) response time to detect misalignment, and (iii) severity of outcomes. If Group A operators detect misalignment as fast or faster than Group B, the verified-doom confidence effect is not observed in practice.

### H4: Orthogonal Trust Collapse

**Claim:** Combining two independent trust mechanisms (e.g., TEE inside a zk-circuit) produces a joint attack surface that is larger than either mechanism alone—specifically, the interface between them introduces novel vulnerabilities that neither mechanism was designed to prevent.

**Falsification:** If the combined system's vulnerability count is strictly less than or equal to the sum of individual vulnerability counts (i.e., the interface adds zero novel attack vectors), the orthogonal collapse hypothesis is falsified. The combination would then be at least as safe as the sum of its parts.

**Measurement approach:** For each of three or more combined trust architectures (e.g., TEE+zkML, TEE+formal verification, zkML+TEE+formal verification), enumerate: (i) vulnerabilities in mechanism A alone, (ii) vulnerabilities in mechanism B alone, and (iii) vulnerabilities at the A–B interface that exist only when both are combined. If the interface vulnerability set is empty across all tested architectures, the hypothesis is falsified.

## Emergence vs Compositionality

The verifiable trust stack presents safety as a compositional property: add verified layers, and you get a safer system. This assumption conflicts with a well-established tradition in safety engineering that views safety as an *emergent* property—something that arises from the interactions of system components and cannot be reduced to the properties of those components in isolation. This section addresses the tension directly.

### The Compositional Assumption

The stack model implies that if Layer 1 (Data Provenance) is verified, and Layer 2 (Formal Specification) is verified, and so on, then the resulting system is safe. Safety is treated as the logical AND of layer properties: if each layer holds, the system holds. This is a compositional view: the whole is safe because the parts are safe.

This assumption is implicit in the visual metaphor of a stack—layers resting on layers, each one supporting the ones above. Remove a layer, and everything above collapses. This is a useful intuition for analyzing failure modes: if data provenance fails, then the provenance of everything above is questionable.

### The Emergent Counterargument

Leveson's STPA and Rasmussen's accretion model demonstrate empirically that safety does not compose this way. A system composed entirely of "safe" components can be unsafe if the interactions between those components produce novel hazards. The classic examples: Three Mile Island, Chernobyl, the Space Shuttle disasters—all involved systems where individual components met their specifications, but the system as a whole failed due to unanticipated interactions.

Applied to the verifiable trust stack: even if zkML correctly proves a computation, TEE correctly attests to an execution environment, and Lean4 correctly verifies a reasoning step, the system as a whole may still fail. The interactions between proof systems—translation errors, timing assumptions, semantic mismatches in what "correct" means across formal languages—may introduce hazards that no individual layer can detect because those hazards exist only in the relationships between layers.

This is not a hypothetical concern. The Glue Problem (already identified in this document) is precisely an instance of emergent risk: the interfaces between layers are where verification breaks down, and those interfaces are defined by the composition, not by any single layer.

### Reconciling the Two Views

The compositional and emergent views are not contradictory. They describe different aspects of the same system:

1. **The stack provides necessary conditions.** If data provenance (Layer 1) fails, no amount of correct computation (Layer 3) can produce a trustworthy output. This is a compositional claim, and it is correct: provenance failure is a sufficient condition for trust failure, regardless of what happens elsewhere. The stack correctly identifies conditions without which trust cannot hold.

2. **Emergence explains why necessary conditions are insufficient.** Even when all necessary conditions hold, the system may still fail due to emergent interactions. This is what Leveson and Rasmussen rightly emphasize. The stack model does not claim (and should not claim) that verified layers are sufficient for safety—it claims they are necessary.

3. **The glue is where emergence happens.** The interfaces between layers are precisely the sites where emergent properties arise. The Glue Problem is not an addendum to the stack model; it is the location where the compositional view meets the emergent reality. Recognizing this allows the stack model to account for emergent risk without abandoning its structural insights.

### Reframing the Stack

Under this reconciliation, the verifiable trust stack should be understood as a **necessary-conditions model**:

- Each layer identifies a condition without which verified trust cannot hold.
- The stack does not claim that satisfying all layers guarantees trust.
- The gap between necessary and sufficient conditions is precisely the space where emergent risk lives.
- Glue verification—formalizing the interfaces between layers—is the research program that closes (or at least narrows) this gap.

This reframing preserves the stack's analytical power (it correctly identifies failure modes and their dependency structure) while accepting the emergent counterargument (safety is a system property, not a layered one). Both views are needed: composition tells you what must be verified; emergence tells you that verification alone is not enough.

## Solution Roadmap: What to Build First

### Tier 1: Implementable Today (2025–2026)

These components have production-grade libraries and clear deployment paths.

- **Layer 1 (Provenance):** C2PA/Content Credentials for media provenance; W3C DIDs + Verifiable Credentials for identity and attribution. Both are standardized, interoperable, and deployable within weeks.
- **Layer 4 (Governance):** Open Policy Agent (OPA) with Rego policies, or Amazon Cedar for authorization. These encode "is the agent allowed to do this?" as executable, auditable logic — no research breakthroughs required.
- **Layer 3 (TEE path):** AWS Nitro Enclaves, Intel TDX, Oasis ROFL. Production TEE infrastructure exists today. The tradeoff is known: you shift trust to hardware vendors, but you get cryptographic attestation of execution.
- **Estimated effort:** 2–3 weeks per layer for a working prototype. A minimal end-to-end demo chaining all three Tier 1 components is achievable in 6–8 weeks.

### Tier 2: Feasible with Engineering (2026–2027)

These require non-trivial engineering but no fundamental research breakthroughs.

- **Layer 2 (Specification):** LLM-assisted specification generation, followed by machine-checked translation into Lean4. The LLM writes the spec; Lean4 verifies it. The gap between natural-language intent and formal logic remains, but the workflow is automatable.
- **Layer 3 (zkML path):** EZKL, Giza, Lagrange DeepProve — currently viable for small models only. Proof overhead for LLM-scale inference remains 10,000×+, restricting this to high-value, narrow-use cases.
- **Glue: proof_to_policy:** Convert verification artifacts (zk-receipts, TEE attestation) into governance rules. Introduce TranslationWarning severity levels (informational, caution, critical) to flag where the translation is lossy.
- **Glue: spec_to_proof:** Document translation losses as first-class structured data. When a natural-language specification becomes a formal one, record what was lost, approximated, or assumed. This data is the empirical foundation for improving the translation pipeline.

### Tier 3: Research-Level (2027+)

These problems have no known solutions. They define the frontier.

- **Layer 5 (Alignment):** No formal solution exists. Constitutional AI, RLHF, and preference optimization are heuristics — useful engineering, but not measurements of alignment. We lack axioms for "acting in human interest" in open worlds.
- **Glue: align_to_spec (feedback loop):** The philosophical problem of ground-truth alignment criteria remains open. Any feedback loop from deployment outcomes back to specification updates requires a theory of what counts as a "correct" update.
- **Orthogonal trust formalization:** Making the glue code itself verifiable — proving that the translator between proof systems preserves the properties it claims to preserve — is a meta-verification problem with no established methodology.

### Near-Term Experiments That Would Strengthen the Theory

1. **EZKL proof overhead measurement.** Run small models (≤100M params) through EZKL and measure actual proof generation time, verification time, and proof size versus model parameters. Publish the scaling curve.
2. **Governance theater simulation with OPA.** Build a minimal prototype where OPA governs agent actions and empirically measure how often governance rules are circumvented by specification gaps (Layer 2 failures passing Layer 4 checks).
3. **ProvenanceChain vs data truth quantification.** Deploy a C2PA provenance chain and measure the gap between "this data is authentic" and "this data is true." Quantify how often authentic data misleads.
4. **Corrigibility measurement in agent simulations.** Design a controlled environment to measure whether agents with verified compute (TEE/zkML) resist or accept human override, testing the verified-doom hypothesis (H3) directly.

### The One Thing That Would Change Everything

A working prototype of **spec_to_proof** that documents translation losses as structured data. This single artifact would convert the "glue is the weakest link" claim from rhetoric to measurement. It would produce the first empirical dataset of what is lost when human intent becomes formal specification — and that dataset would define the research agenda for Layers 2 and 5 for the next decade.
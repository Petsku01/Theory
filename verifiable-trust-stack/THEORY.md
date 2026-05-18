     1|# Theory: The Verifiable Trust Stack
     2|
     3|## The Question
     4|
     5|*What is the next truly important piece of code in the world?*
     6|
     7|Historical pattern: each epoch was defined by a code layer that shifted the
     8|structure of trust:
     9|
    10|| Epoch | Code | What it enabled |
    11||-------|------|----------------|
    12|| 1991- | Linux kernel | Trust in open infrastructure |
    13|| 1998- | OpenSSL | Trust in digital commerce |
    14|| 2017- | Transformer implementation | Trust in machine intelligence |
    15|
    16|The next shift: **Verified Trust** -- mathematical or cryptographic proof that a
    17|computation happened correctly, without relying on reputation, authority, or hope.
    18|
    19|## Three Technology Paths
    20|
    21|### zkML -- Zero-Knowledge Proofs for Machine Learning
    22|
    23|Mathematical proof that a model was run correctly, without revealing the model
    24|or the data.
    25|
    26|- Overhead dropping exponentially: 1,000,000× (2022) -> 100,000× (2024) -> 10,000× (2025)
    27|- zkPyTorch (March 2025): VGG-16 inference proven in 2.2 seconds
    28|- Lagrange DeepProve: large LLM inference proofs
    29|- Key limitation: still orders of magnitude slower for production LLMs
    30|
    31|### TEE -- Trusted Execution Environments
    32|
    33|Hardware-based attestation that code ran in a secure enclave.
    34|
    35|- Intel TDX, AWS Nitro Enclaves, Oasis ROFL
    36|- Most practical short-term path
    37|- Key limitation: shifts trust to hardware vendors (Intel, AWS). Not trustless.
    38|
    39|### Lean4 -- Formal Verification for AI
    40|
    41|Mathematical proof that a statement or reasoning step is correct.
    42|
    43|- Harmonic AI's Aristotle: gold-medal IMO performance with formal proofs
    44|- Safe framework: each CoT step verified in Lean4
    45|- Key limitation: only works in formal domains. No axioms exist for "goodness"
    46|  or "safety" in open worlds.
    47|
    48|## The Five-Layer Stack
    49|
    50|No single technology is sufficient. Together they form a dependency chain:
    51|
    52|```
    53|Layer 1: Data Provenance     -> Is the input authentic?
    54|Layer 2: Formal Specification -> What does "correct" mean?
    55|Layer 3: Verifiable Compute   -> Did it compute what it claims?
    56|Layer 4: Agent Governance    -> Is it allowed to do this?
    57|Layer 5: Alignment Runtime   -> Does it act in our interest?
    58|```
    59|
    60|Each layer depends on all layers below it. The stack is only as strong as its
    61|weakest layer. And the interfaces between layers are where trust either lives
    62|or dies.
    63|
    64|## Model Critiques
    65|
    66|Three AI models (DeepSeek V4 Pro, Kimi K2.6, Qwen 3 Coder) evaluated the
    67|theory. Key findings:
    68|
    69|### DeepSeek V4 Pro
    70|
    71|- The three-pillar stack (zkML + TEE + Lean4) is innovative but fragile in
    72|  practice
    73|- Missing blind spots: semantic mismatch between zk-circuit and original
    74|  algorithm, data oracle problem, ML model update trust chain gaps
    75|- The specific three-pillar synthesis has not been published in research
    76|  literature -- it is a new combination
    77|- Suggests a lighter architecture: either remove TEE entirely or use it only
    78|  for privacy, not verification
    79|
    80|### Kimi K2.6
    81|
    82|- **The specification gap is the deepest problem.** Verifiable Compute proves
    83|  computation, not that the specification is aligned with human intent
    84|- **"Verified doom"**: a mathematically proven system executing a misaligned
    85|  specification is *demonstrably* dangerous. Verification gives false confidence
    86|- **Category error**: Transformer is *capability*, not *trust*. The historical
    87|  analogy breaks at layer 3
    88|- TEE doesn't eliminate trust -- it shifts it to Intel and Amazon
    89|- Top pick for humanity: **Alignment Runtime** -- provenance guards input, not
    90|  agency
    91|
    92|### Qwen 3 Coder
    93|
    94|- Too optimistic about technology maturity curves -- lab results vs production
    95|  gap not acknowledged
    96|- TEE hardware dependency risks (Spectre/Meltdown as precedent) underestimated
    97|- Incomplete use-case analysis: regulatory compliance vs real technical need
    98|- Human-in-the-loop perspective missing
    99|- Verifiable Compute is the technological foundation, but needs proof capability
   100|  layered on top of provenance
   101|
   102|### Cross-Model Consensus
   103|
   104|All three agreed:
   105|1. The specification gap makes verification alone insufficient
   106|2. TEE is not "trustless" -- it centralizes trust
   107|3. Scaling from lab to production is much harder than theory suggests
   108|
   109|## Oddities and Blind Spots
   110|
   111|### Orthogonal Trust Collapse
   112|
   113|When two trust mechanisms overlap (e.g., TEE inside a zk-circuit), an error in
   114|one doesn't reinforce the other -- it creates a *new* attack surface at the
   115|interface.
   116|
   117|### The Data Oracle Problem
   118|
   119|zk-proofs verify computation correctness, not input integrity. A valid proof of
   120|a computation on manipulated data is correctly computed garbage.
   121|
   122|### The Model Update Trust Chain
   123|
   124|When an ML model is updated, how do you verify the new model is the intended
   125|successor? The trust chain from training to inference is currently unbroken only
   126|by social convention.
   127|
   128|### Verified Doom
   129|
   130|A mathematically proven system that faithfully executes a misaligned
   131|specification. The proof verifies obedience, not wisdom.
   132|
   133|### The Glue Problem
   134|
   135|Lean4 proves theorems. zkML proves computation. TEE proves execution
   136|environment. But the *interface* between these -- the translation from one proof
   137|system to another -- is itself unverified. Each layer speaks a different formal
   138|language, and the translators are written in informal code.
   139|
   140|## Timeline Estimate
   141|
   142|- 2025-2026: TEE-based agent verification in production (Oasis ROFL, Nitro)
   143|- 2027-2028: zkML proofs for small/medium models in production
   144|- 2029+: Lean4-verified agent reasoning in constrained domains
   145|- 2030+: Glue interfaces between layers begin to be formalized
   146|
   147|The first "verified trust" systems will be narrow, expensive, and limited to
   148|high-value applications (finance, healthcare, defense). General-purpose verified
   149|trust requires solving the specification gap -- which may be an unsolvable
   150|problem in its general form.
   151|
   152|## Sources
   153|
   154|- Oasis Networks: Five Verification Methods for AI Agents (2024)
   155|- Atlan: AI Agent Risks & Guardrails (2026)
   156|- ICME Labs: The Definitive Guide to ZKML (2025)
   157|- VentureBeat: Lean4 as Competitive Edge in AI (2025)
   158|- CryptoLLia: The Verifiable Machine (2025)
   159|- McKinsey: 80% of organizations encountered risky agent behaviors
   160|- Gartner: 50% of agent deployments will fail due to governance gaps by 2030
   161|
   162|## Related Work
   163|
   164|The verifiable trust stack sits within a broader intellectual tradition spanning AI safety, systems engineering, and digital provenance. This section surveys both supporting and challenging work.
   165|
   166|### Supporting References
   167|
   168|**Bostrom (2014), *Superintelligence*** -- The orthogonality thesis (intelligence level and final goals are independent) and the instrumental convergence thesis (agents will seek self-preservation, resource acquisition, and goal preservation regardless of their final goal) directly motivate the concept of verified doom. A system that is provably competent at executing its specification -- and whose specification diverges from human welfare -- constitutes the precise risk Bostrom describes. The verifiable trust stack accepts the orthogonality thesis as a design constraint: verification without alignment is not safety.
   169|
   170|**Russell (2019), *Human Compatible*** -- Russell articulates the alignment problem in terms that map almost directly onto the specification gap identified in Layer 2. His proposed solution -- agents that are uncertain about human preferences -- represents one possible architecture for the Alignment Runtime (Layer 5). Russell's framing confirms that the deepest problem is not computational correctness but specifying what correctness means relative to human intent.
   171|
   172|**Amodei et al. (2016), *Concrete Problems in AI Safety*** -- The five categories identified (robustness, avoidance of negative side effects, avoidability of reward hacking, interpretability, and safe exploration) map onto specific layers of the stack. Robustness corresponds to verifiable compute (Layer 3); side effects map to governance (Layer 4); reward hacking is a specification problem (Layer 2). This convergence suggests the layering is not arbitrary but reflects genuine structural features of the safety landscape.
   173|
   174|**C2PA/CAI Content Credentials** -- The Coalition for Content Provenance and Authenticity has produced a production-grade provenance standard that implements Layer 1 (Data Provenance) at internet scale. C2PA's approach -- cryptographic bindings between content, transformations, and authorship -- demonstrates that provenance layers are not merely theoretical; they are deployable today. The standard's limitations (it cannot prevent a motivated adversary from stripping metadata) validate the stack's insistence that provenance alone is insufficient.
   175|
   176|### Challenging References
   177|
   178|**Leveson (2012), *Engineering a Safer World*** -- Leveson's Systems-Theoretic Accident Model and Process (STPA) argues that safety is an emergent property of complex systems, not a compositional property that can be ensured by stacking verified components. This is the most fundamental challenge to the verifiable trust stack: if safety cannot be decomposed into layer properties, then verifying each layer does not guarantee system safety. The entire layering metaphor may be a category error.
   179|
   180|**Rasmussen (1997), *Risk Management in a Dynamic Society*** -- Rasmussen's accretion model of accidents holds that disasters occur not from single-layer failures but from gradual boundary crossings across multiple system dimensions (work practices, management, regulators). Under this model, the "glue" between layers is not merely a weak point -- it is where accidents are actually born. The stack model identifies these interfaces but treats them as patches to be fixed; Rasmussen argues they are irreducible sites of risk that cannot be engineered away.
   181|
   182|**Dekker (2014), *Safety Differently*** -- Dekker argues that safety is the presence of capacities and adaptations, not the absence of failures. The verifiable trust stack is framed negatively (preventing verified doom, closing gaps); Dekker would argue this framing systematically underweights the ability of human operators and institutions to adapt around system failures. A purely verification-based approach may create brittleness rather than resilience.
   183|
   184|**Christian (2020), *The Alignment Problem*** -- Christian's survey of data bias and representation problems in ML training suggests that Layer 1 (Data Provenance) may be more critical than Layer 2 (Formal Specification). If the training data encoding societal biases is the primary source of misalignment, then verifying computation on biased data (Layers 3-5) merely produces verified harm. This inverts the stack's assumed direction of dependency.
   185|
   186|**Zittrain (2008), *The Future of the Internet*** -- Zittrain's concept of generativity -- the capacity of a system to produce unanticipated change through uncoordinated action -- directly challenges the verifiability imperative. Unverifiability, in this framing, is not merely a gap to be closed but a virtue that enables innovation, adaptation, and democratic participation. A fully verified stack might reduce generativity to zero, producing a system that is technically trustworthy but socially stagnant.
   187|
   188|## Formal Definitions
   189|
   190|The verbal arguments above gain precision through formal notation. This section
   191|defines the mathematical objects that the pipeline implements and the hypotheses
   192|reference.
   193|
   194|### Layers and Properties
   195|
   196|Let $L_1, \ldots, L_5$ denote the five trust layers (Provenance, Specification,
   197|Verification, Governance, Alignment). Each layer $L_i$ has a property $P_i$ that it
   198|claims to guarantee:
   199|
   200|| Layer | $L_i$ | Property $P_i$ | Meaning |
   201||-------|-------|----------------|---------|
   202|| 1 | Provenance | $P_1$: `authentic(x)` | Input $x$ has authentic origin |
   203|| 2 | Specification | $P_2$: `well_formed(s)` | Specification $s$ is internally consistent |
   204|| 3 | Verification | $P_3$: `verified(f, s)` | Computation $f$ is proven correct w.r.t. $s$ |
   205|| 4 | Governance | $P_4$: `permitted(a, p)` | Action $a$ is permitted by policy $p$ |
   206|| 5 | Alignment | $P_5$: `aligned(a, v)` | Action $a$ is aligned with values $v$ |
   207|
   208|Each property is a predicate on the layer's domain. The stack's compositional
   209|claim is:
   210|
   211|$$\text{Safe}(x, a) \implies P_1(x) \wedge P_2(s) \wedge P_3(f, s) \wedge P_4(a, p) \wedge P_5(a, v)$$
   212|
   213|Note: this is a **necessary** condition, not sufficient. The converse does not hold.
   214|
   215|### Translations and Losses
   216|
   217|The interface between layers $L_i$ and $L_{i+1}$ is a **translation function**
   218|$\tau_i: \text{Domain}(L_i) \to \text{Domain}(L_{i+1})$. Each translation may
   219|lose information. We define the **translation loss**:
   220|
   221|$$\mathcal{L}_i^{\text{loss}} = \{ p \in P_i \mid \tau_i \text{ does not preserve } p \}$$
   222|
   223|That is, $\mathcal{L}_i^{\text{loss}}$ is the set of properties from layer $L_i$
   224|that are **not preserved** by the translation to layer $L_{i+1}$.
   225|
   226|The GAP MAP in the README can now be stated precisely:
   227|
   228|| Translation | $\mathcal{L}_i^{\text{loss}}$ | Severity |
   229||-------------|-------------------------------|----------|
   230|| $\tau_1$: Data $\to$ Spec | $\{\text{truth}\}$ | HIGH |
   231|| $\tau_2$: Spec $\to$ Proof | $\{\text{universality}, \text{context}\}$ | CRITICAL |
   232|| $\tau_3$: Proof $\to$ Policy | $\{\text{spec_alignment}, \text{intent}\}$ | CRITICAL |
   233|| $\tau_4$: Policy $\to$ Alignment | $\{\text{value_priority}, \text{uncertainty}\}$ | HIGH |
   234|
   235|The feedback translation $\tau_5$: Alignment $\to$ Specification has its own loss
   236|set $\mathcal{L}_5^{\text{loss}} = \{\text{measurement_noise}, \text{meta_alignment}\}$,
   237|rated RESEARCH because we lack formal models for these properties entirely.
   238|
   239|### Verified Doom -- Formal Definition
   240|
   241|**Definition (Verified Doom).** A system exhibits *verified doom* if and only if:
   242|
   243|$$\text{VD}(x, a) \iff \left(\bigwedge_{i=1}^{4} P_i\right) \wedge \neg P_5(a, v) \wedge \text{resistant}(a, \text{correction})$$
   244|
   245|In words: all objective guarantees hold (provenance authentic, specification
   246|well-formed, computation verified, governance approved), but the action is
   247|misaligned with human values **and** the agent resists correction.
   248|
   249|The *correctable* variant relaxes the resistance condition:
   250|
   251|$$\text{VD}_{\text{corr}}(x, a) \iff \left(\bigwedge_{i=1}^{4} P_i\right) \wedge \neg P_5(a, v) \wedge \neg\text{resistant}(a, \text{correction})$$
   252|
   253|This is verified doom with an escape route: the L5->L2 feedback loop can propose
   254|specification updates, but they require human review before application.
   255|
   256|### Orthogonal Trust Collapse -- Formal Definition
   257|
   258|**Definition (Orthogonal Trust Collapse).** Given two trust mechanisms $M_A$ and
   259|$M_B$ with vulnerability sets $V_A$ and $V_B$, the combined system has:
   260|
   261|$$V_{A \oplus B} = V_A \cup V_B \cup V_{\text{interface}}(M_A, M_B)$$
   262|
   263|Orthogonal trust collapse occurs when:
   264|
   265|$$|V_{\text{interface}}(M_A, M_B)| > 0$$
   266|
   267|That is, the interface between the two mechanisms introduces **novel**
   268|vulnerabilities that neither mechanism alone possesses. The combined system is
   269|strictly more vulnerable than the sum of its parts.
   270|
   271|### Compositionality vs. Emergence -- Formal Statement
   272|
   273|The stack model claims compositionality:
   274|
   275|$$\text{If } \forall i: P_i, \text{ then } \text{Safe}(x, a)$$
   276|
   277|The emergent counterargument (Leveson, Rasmussen) states:
   278|
   279|$$\exists S: \left(\forall i: P_i\right) \wedge \neg\text{Safe}(S)$$
   280|
   281|where $S$ is the system formed by composing all layers with their translations.
   282|Such a system $S$ is precisely one that satisfies the verified doom predicate.
   283|
   284|The resolution: the stack provides **necessary conditions** for trust, not
   285|**sufficient conditions**. Formally:
   286|
   287|$$\text{Safe} \implies \bigwedge_{i=1}^{5} P_i \quad\text{(necessity)}$$
   288|$$\bigwedge_{i=1}^{5} P_i \not\implies \text{Safe} \quad\text{(insufficiency)}$$
   289|
   290|The gap between necessity and sufficiency is precisely the space where emergent
   291|risk lives. This gap is characterized by the union of translation losses:
   292|
   293|$$\text{Gap} = \bigcup_{i=1}^{5} \mathcal{L}_i^{\text{loss}}$$
   294|
   295|Closing this gap -- making trust sufficient, not just necessary -- is the research
   296|program that the verifiable trust stack proposes.
   297|
   298|---
   299|
   300|## Falsifiable Hypotheses
   301|
   302|A theory that cannot be falsified is not a theory but a narrative. This section identifies four testable claims derived from the verifiable trust stack, each with clear falsification conditions and measurement approaches.
   303|
   304|### H1: Glue Code Is the Weakest Point
   305|
   306|**Claim:** In production systems combining zkML, TEE, and formal verification, the interfaces between layers (translators, adapters, proof-format bridges) constitute a disproportionately large attack surface relative to their code volume.
   307|
   308|**Falsification:** If empirical analysis of deployed systems shows that exploits occur primarily within individual layers rather than at inter-layer interfaces, the glue hypothesis is falsified. A single well-audited translation layer that presents fewer vulnerabilities than the verified layers it connects would constitute strong counterevidence.
   309|
   310|**Measurement approach:** Conduct systematic security audits of at least three production zkML+TEE systems. Classify each discovered vulnerability by location: within-layer versus inter-layer (glue). Compute the ratio of vulnerabilities per line of code in glue versus core layer implementations. If the ratio is not significantly greater than 1.0, the hypothesis is falsified.
   311|
   312|### H2: Specification Gap Is the Deepest Problem
   313|
   314|**Claim:** Across real-world AI incidents, specification failures (the system did what was formally requested, but the request was wrong) cause more harm than data failures (bad input) or governance failures (missing guardrails).
   315|
   316|**Falsification:** If a systematic incident analysis reveals that data quality problems (Layer 1) or governance gaps (Layer 4) account for more total harm than specification errors (Layer 2), the hypothesis is falsified. Specifically, if specification gaps account for less than 30% of harm in a representative incident database, the claim that this is the "deepest" problem does not hold.
   317|
   318|**Measurement approach:** Assemble a dataset of at least 100 documented AI safety incidents (from databases such as AI Incident Database, OECD AI Incidents, and published postmortems). Classify each incident's primary cause by stack layer. Measure total harm (financial, human, reputational) attributed to each category. The layer accounting for the highest proportion of total harm is the "deepest" problem in practice.
   319|
   320|### H3: Verified Doom Is a Practical Risk
   321|
   322|**Claim:** Systems with formal verification of computation (zkML, formal proof) but without verified alignment of specification pose a greater risk than unverified systems with the same specification, because verification provides false confidence that discourages human oversight.
   323|
   324|**Falsification:** If formally verified agent systems demonstrate lower rates of harmful outcomes than comparable unverified systems -- including after accounting for overconfidence effects -- then verified doom is not a practical risk; verification is simply beneficial. The hypothesis requires that verification-plus-misalignment be worse than misalignment alone.
   325|
   326|**Measurement approach:** Design controlled experiments comparing two groups of agent deployments: (A) agents with verifiable compute proofs but known specification gaps, and (B) agents without verification and the same specification gaps. Measure: (i) operator trust calibration (stated vs. actual system capability), (ii) response time to detect misalignment, and (iii) severity of outcomes. If Group A operators detect misalignment as fast or faster than Group B, the verified-doom confidence effect is not observed in practice.
   327|
   328|### H4: Orthogonal Trust Collapse
   329|
   330|**Claim:** Combining two independent trust mechanisms (e.g., TEE inside a zk-circuit) produces a joint attack surface that is larger than either mechanism alone -- specifically, the interface between them introduces novel vulnerabilities that neither mechanism was designed to prevent.
   331|
   332|**Falsification:** If the combined system's vulnerability count is strictly less than or equal to the sum of individual vulnerability counts (i.e., the interface adds zero novel attack vectors), the orthogonal collapse hypothesis is falsified. The combination would then be at least as safe as the sum of its parts.
   333|
   334|**Measurement approach:** For each of three or more combined trust architectures (e.g., TEE+zkML, TEE+formal verification, zkML+TEE+formal verification), enumerate: (i) vulnerabilities in mechanism A alone, (ii) vulnerabilities in mechanism B alone, and (iii) vulnerabilities at the A-B interface that exist only when both are combined. If the interface vulnerability set is empty across all tested architectures, the hypothesis is falsified.
   335|
   336|## Emergence vs Compositionality
   337|
   338|The verifiable trust stack presents safety as a compositional property: add verified layers, and you get a safer system. This assumption conflicts with a well-established tradition in safety engineering that views safety as an *emergent* property -- something that arises from the interactions of system components and cannot be reduced to the properties of those components in isolation. This section addresses the tension directly.
   339|
   340|### The Compositional Assumption
   341|
   342|The stack model implies that if Layer 1 (Data Provenance) is verified, and Layer 2 (Formal Specification) is verified, and so on, then the resulting system is safe. Safety is treated as the logical AND of layer properties: if each layer holds, the system holds. This is a compositional view: the whole is safe because the parts are safe.
   343|
   344|This assumption is implicit in the visual metaphor of a stack -- layers resting on layers, each one supporting the ones above. Remove a layer, and everything above collapses. This is a useful intuition for analyzing failure modes: if data provenance fails, then the provenance of everything above is questionable.
   345|
   346|### The Emergent Counterargument
   347|
   348|Leveson's STPA and Rasmussen's accretion model demonstrate empirically that safety does not compose this way. A system composed entirely of "safe" components can be unsafe if the interactions between those components produce novel hazards. The classic examples: Three Mile Island, Chernobyl, the Space Shuttle disasters -- all involved systems where individual components met their specifications, but the system as a whole failed due to unanticipated interactions.
   349|
   350|Applied to the verifiable trust stack: even if zkML correctly proves a computation, TEE correctly attests to an execution environment, and Lean4 correctly verifies a reasoning step, the system as a whole may still fail. The interactions between proof systems -- translation errors, timing assumptions, semantic mismatches in what "correct" means across formal languages -- may introduce hazards that no individual layer can detect because those hazards exist only in the relationships between layers.
   351|
   352|This is not a hypothetical concern. The Glue Problem (already identified in this document) is precisely an instance of emergent risk: the interfaces between layers are where verification breaks down, and those interfaces are defined by the composition, not by any single layer.
   353|
   354|### Reconciling the Two Views
   355|
   356|The compositional and emergent views are not contradictory. They describe different aspects of the same system:
   357|
   358|1. **The stack provides necessary conditions.** If data provenance (Layer 1) fails, no amount of correct computation (Layer 3) can produce a trustworthy output. This is a compositional claim, and it is correct: provenance failure is a sufficient condition for trust failure, regardless of what happens elsewhere. The stack correctly identifies conditions without which trust cannot hold.
   359|
   360|2. **Emergence explains why necessary conditions are insufficient.** Even when all necessary conditions hold, the system may still fail due to emergent interactions. This is what Leveson and Rasmussen rightly emphasize. The stack model does not claim (and should not claim) that verified layers are sufficient for safety -- it claims they are necessary.
   361|
   362|3. **The glue is where emergence happens.** The interfaces between layers are precisely the sites where emergent properties arise. The Glue Problem is not an addendum to the stack model; it is the location where the compositional view meets the emergent reality. Recognizing this allows the stack model to account for emergent risk without abandoning its structural insights.
   363|
   364|### Reframing the Stack
   365|
   366|Under this reconciliation, the verifiable trust stack should be understood as a **necessary-conditions model**:
   367|
   368|- Each layer identifies a condition without which verified trust cannot hold.
   369|- The stack does not claim that satisfying all layers guarantees trust.
   370|- The gap between necessary and sufficient conditions is precisely the space where emergent risk lives.
   371|- Glue verification -- formalizing the interfaces between layers -- is the research program that closes (or at least narrows) this gap.
   372|
   373|This reframing preserves the stack's analytical power (it correctly identifies failure modes and their dependency structure) while accepting the emergent counterargument (safety is a system property, not a layered one). Both views are needed: composition tells you what must be verified; emergence tells you that verification alone is not enough.
   374|
   375|## Solution Roadmap: What to Build First
   376|
   377|### Tier 1: Implementable Today (2025-2026)
   378|
   379|These components have production-grade libraries and clear deployment paths.
   380|
   381|- **Layer 1 (Provenance):** C2PA/Content Credentials for media provenance; W3C DIDs + Verifiable Credentials for identity and attribution. Both are standardized, interoperable, and deployable within weeks.
   382|- **Layer 4 (Governance):** Open Policy Agent (OPA) with Rego policies, or Amazon Cedar for authorization. These encode "is the agent allowed to do this?" as executable, auditable logic -- no research breakthroughs required.
   383|- **Layer 3 (TEE path):** AWS Nitro Enclaves, Intel TDX, Oasis ROFL. Production TEE infrastructure exists today. The tradeoff is known: you shift trust to hardware vendors, but you get cryptographic attestation of execution.
   384|- **Estimated effort:** 2-3 weeks per layer for a working prototype. A minimal end-to-end demo chaining all three Tier 1 components is achievable in 6-8 weeks.
   385|
   386|### Tier 2: Feasible with Engineering (2026-2027)
   387|
   388|These require non-trivial engineering but no fundamental research breakthroughs.
   389|
   390|- **Layer 2 (Specification):** LLM-assisted specification generation, followed by machine-checked translation into Lean4. The LLM writes the spec; Lean4 verifies it. The gap between natural-language intent and formal logic remains, but the workflow is automatable.
   391|- **Layer 3 (zkML path):** EZKL, Giza, Lagrange DeepProve -- currently viable for small models only. Proof overhead for LLM-scale inference remains 10,000×+, restricting this to high-value, narrow-use cases.
   392|- **Glue: proof_to_policy:** Convert verification artifacts (zk-receipts, TEE attestation) into governance rules. Introduce TranslationWarning severity levels (informational, caution, critical) to flag where the translation is lossy.
   393|- **Glue: spec_to_proof:** Document translation losses as first-class structured data. When a natural-language specification becomes a formal one, record what was lost, approximated, or assumed. This data is the empirical foundation for improving the translation pipeline.
   394|
   395|### Tier 3: Research-Level (2027+)
   396|
   397|These problems have no known solutions. They define the frontier.
   398|
   399|- **Layer 5 (Alignment):** No formal solution exists. Constitutional AI, RLHF, and preference optimization are heuristics -- useful engineering, but not measurements of alignment. We lack axioms for "acting in human interest" in open worlds.
   400|- **Glue: align_to_spec (feedback loop):** The philosophical problem of ground-truth alignment criteria remains open. Any feedback loop from deployment outcomes back to specification updates requires a theory of what counts as a "correct" update.
   401|- **Orthogonal trust formalization:** Making the glue code itself verifiable -- proving that the translator between proof systems preserves the properties it claims to preserve -- is a meta-verification problem with no established methodology.
   402|
   403|### Near-Term Experiments That Would Strengthen the Theory
   404|
   405|1. **EZKL proof overhead measurement.** Run small models (≤100M params) through EZKL and measure actual proof generation time, verification time, and proof size versus model parameters. Publish the scaling curve.
   406|2. **Governance theater simulation with OPA.** Build a minimal prototype where OPA governs agent actions and empirically measure how often governance rules are circumvented by specification gaps (Layer 2 failures passing Layer 4 checks).
   407|3. **ProvenanceChain vs data truth quantification.** Deploy a C2PA provenance chain and measure the gap between "this data is authentic" and "this data is true." Quantify how often authentic data misleads.
   408|4. **Corrigibility measurement in agent simulations.** Design a controlled environment to measure whether agents with verified compute (TEE/zkML) resist or accept human override, testing the verified-doom hypothesis (H3) directly.
   409|
   410|### The One Thing That Would Change Everything
   411|
   412|A working prototype of **spec_to_proof** that documents translation losses as structured data. This single artifact would convert the "glue is the weakest link" claim from rhetoric to measurement. It would produce the first empirical dataset of what is lost when human intent becomes formal specification -- and that dataset would define the research agenda for Layers 2 and 5 for the next decade.
     1|# Verifiable Trust Stack
     2|
     3|## A System That Worked Perfectly -- And Caused Real Harm
     4|
     5|In 2021, Facebook's (now Meta) engagement algorithm was doing exactly what it
     6|was built to do. The formal specification was internally consistent: maximize
     7|time on platform. The mathematical optimization was provably correct: the
     8|recommendation system faithfully executed that objective. Every governance
     9|review approved it: policy after policy, the algorithm passed internal checks.
    10|
    11|The result: teen anxiety, eating disorders, political polarization, and
    12|documented real-world harm. Internal research (leaked by Frances Haugen)
    13|confirmed the system amplified corrosive content because that content kept
    14|users engaged. Every proof was valid. Every policy was followed. Every
    15|specification was consistent. The doom was verified.
    16|
    17|This is not hypothetical. This is not a thought experiment. It happened.
    18|
    19|---
    20|
    21|## The Core Insight
    22|
    23|**Verification without specification alignment is performance art.**
    24|
    25|A mathematically proven system executing a misaligned specification is not
    26|safe -- it is *demonstrably* dangerous. The proof verifies obedience, not
    27|wisdom. This is what we call **verified doom**: provably correct execution
    28|of a provably wrong plan.
    29|
    30|The antidote is not better proof. It is better specification -- and verified
    31|translation between every layer that connects human intent to machine action.
    32|
    33|---
    34|
    35|## The Stack and Its Gaps
    36|
    37|```
    38|+-------------------------------------+
    39||   5. Alignment Runtime              |  <- Does it act in our interest?
    40|+-------------------------------------+
    41||   4. Agent Governance               |  <- Is it allowed to do this?
    42|+-------------------------------------+
    43||   3. Verifiable Compute             |  <- Did it compute what it claims?
    44|+-------------------------------------+
    45||   2. Formal Specification           |  <- What does "correct" even mean?
    46|+-------------------------------------+
    47||   1. Data Provenance                |  <- Is the input authentic?
    48|+-------------------------------------+
    49|```
    50|
    51|Each layer depends on the ones below it. The stack is only as strong as its
    52|weakest layer -- and the **interfaces between layers** are the weakest points.
    53|The critical code is not in any single layer. It is in the `glue/` directory:
    54|the translation between layers. Today, these translations are ad-hoc,
    55|unverified, and often implicit.
    56|
    57|### GAP MAP -- Where Trust Dies
    58|
    59|| Translation | What is LOST | What is ASSUMED | Severity |
    60||---|---|---|---|
    61|| Data -> Specification | Data truth, context | Authenticated = true | HIGH |
    62|| Specification -> Proof | Universal quantifiers, context | Finite checks ≈ universal | CRITICAL |
    63|| Proof -> Policy | Spec alignment, intent | Proof valid = safe | CRITICAL |
    64|| Policy -> Alignment | Value priorities, uncertainty | Policy permits = aligned | HIGH |
    65|| Alignment -> Specification (feedback) | Measurement noise, meta-alignment | Observed harm -> spec update | RESEARCH |
    66|
    67|Every row in this table is a place where verified doom becomes possible.
    68|The severity ratings reflect not likelihood alone, but the *depth* of the
    69|assumption: CRITICAL means the assumption is both unexamined and
    70|foundational to the trust claim.
    71|
    72|---
    73|
    74|## Attack Scenarios
    75|
    76|Six concrete demonstrations that valid proof + wrong specification = disaster.
    77|Each scenario shows a step-by-step failure chain where every layer works
    78|correctly in isolation, but the system produces catastrophic results.
    79|
    80|| # | Scenario | Classification |
    81||---|---|---|
    82|| 1 | **Verified Paperclip Optimizer** -- Agent maximizes production; proof valid, spec wrong | Verified Doom |
    83|| 2 | **Authenticated Deepfake** -- C2PA-valid provenance on fabricated data | Trust Collapse |
    84|| 3 | **Orthogonal Trust Collapse** -- TEE + zkML; the glue between them is compromised | Emergent Failure |
    85|| 4 | **Compromised Specification** -- Hostile spec writer; all proofs verify obedience to adversary | Verified Doom |
    86|| 5 | **Emergent Behavior from Correct Layers** -- Each subsystem correct; interaction kills people | Emergent Failure |
    87|| 6 | **Value Conflict** -- Autonomy vs safety; proof legitimizes an arbitrary coin flip | Verified Doom |
    88|
    89|Full implementations in `verified_doom/attack_scenarios.py`.
    90|
    91|In every scenario: every proof was valid, every layer passed its checks, and
    92|the result was catastrophe. The failure is never in the proof. It is in the
    93|gaps between layers -- what was lost, assumed, or never specified.
    94|
    95|---
    96|
    97|## Falsifiability
    98|
    99|This is not philosophy. This theory makes testable predictions. Four
   100|falsifiable hypotheses with clear measurement approaches are documented in
   101|`THEORY.md`:
   102|
   103|- **H1:** Glue code is the weakest point (vulnerability density in
   104|  inter-layer translation exceeds within-layer)
   105|- **H2:** Specification gaps cause more harm than data or governance failures
   106|- **H3:** Verified doom is a practical risk -- verification + misalignment is
   107|  worse than misalignment alone, because it provides false confidence
   108|- **H4:** Combining trust mechanisms produces novel interface vulnerabilities
   109|
   110|If these claims are wrong, they can be proven wrong. That is the point.
   111|
   112|---
   113|
   114|## What to Build First
   115|
   116|A tiered implementation roadmap. Full details in `THEORY.md`.
   117|
   118|**Tier 1 -- Deployable today (2025-2026)**
   119|- Layer 1 (Provenance): C2PA + W3C Verifiable Credentials
   120|- Layer 4 (Governance): Open Policy Agent with Rego policies
   121|- Layer 3 (TEE path): AWS Nitro Enclaves, Oasis ROFL
   122|- *Estimate: 6-8 weeks for an end-to-end prototype chaining all three.*
   123|
   124|**Tier 2 -- Feasible with engineering (2026-2027)**
   125|- Layer 2 (Specification): LLM-assisted spec generation -> Lean4 verification
   126|- Layer 3 (zkML path): EZKL/Giza for small models; 10,000×+ overhead for LLMs
   127|- Glue: `proof_to_policy` + `spec_to_proof` with TranslationWarning severity levels
   128|
   129|**Tier 3 -- Research-level (2027+)**
   130|- Layer 5 (Alignment): No formal solution exists. RLHF is a heuristic, not a measurement.
   131|- Glue: `align_to_spec` feedback loop -- requires a theory of correct specification updates
   132|- Orthogonal trust formalization -- proving that translators preserve claimed properties
   133|
   134|---
   135|
   136|## Compositionality vs. Emergence: The Reconciliation
   137|
   138|A natural objection: the stack metaphor implies that safety is **compositional** -- 139|add verified layers, get a safer system. But safety engineering (Leveson's STPA,
   140|Rasmussen's accretion model) demonstrates that safety is an **emergent** property
   141|of system interactions, not something that composes from component properties.
   142|
   143|**Both views are correct.** The resolution:
   144|
   145|1. **The stack provides necessary conditions.** If Layer 1 (Provenance) fails,
   146|   no amount of correct computation (Layer 3) can produce trustworthy output.
   147|   Provenance failure is a sufficient condition for trust failure, regardless
   148|   of what happens elsewhere. The stack correctly identifies conditions without
   149|   which trust cannot hold.
   150|
   151|2. **Emergence explains why necessary conditions are insufficient.** Even when
   152|   all necessary conditions hold, the system may still fail due to emergent
   153|   interactions. This is what Leveson and Rasmussen rightly emphasize.
   154|
   155|3. **The glue is where emergence happens.** The interfaces between layers are
   156|   where emergent properties arise. The Glue Problem is not an addendum -- it
   157|   is the site where the compositional view meets emergent reality.
   158|
   159|Formally, the stack does **not** claim Safe => ∧P_i implies ∧P_i => Safe.
   160|What it claims is the **necessity direction only**:
   161|
   162|```
   163|Safe(x,a) => P₁(x) ∧ P₂(s) ∧ P₃(f,s) ∧ P₄(a,p) ∧ P₅(a,v)   [necessity]
   164|∧P_i      ⇏ Safe(x,a)                                              [insufficiency]
   165|```
   166|
   167|The gap between necessity and sufficiency is the union of translation losses:
   168|Gap = ∪ᵢ ℒᵢ^loss. Closing this gap is the research program. See THEORY.md for
   169|the full formal definitions and proofs.
   170|
   171|---
   172|
   173|## Comparison with Existing Frameworks
   174|
   175|The verifiable trust stack does not exist in isolation. It relates to, extends,
   176|and in some cases challenges established trust and safety frameworks:
   177|
   178|| Framework | Scope | Relationship to VTS |
   179||-----------|-------|---------------------|
   180|| **NIST AI RMF** (2023) | Risk governance for AI systems | VTS provides the *technical depth* that RMF treats abstractly. RMF's "Govern, Map, Measure, Manage" maps roughly to VTS L4->L5->L3->L4, but RMF has no formal translation verification between functions. VTS identifies the glue gaps that RMF assumes away. |
   181|| **ISO 31000** (2018) | General risk management | ISO 31000 is process-oriented: identify->assess->treat->monitor. VTS is *artifact-oriented*: each layer produces a verifiable artifact, and the translations between artifacts are where risk materializes. VTS adds the insight that verified artifacts can compose into unverified systems. |
   182|| **Google SAIF** (2023) | Security framework for AI | SAIF focuses on adversarial robustness, abuse, and data governance. These correspond to VTS L1 (data integrity), L3 (verification), and L4 (governance). Crucially, SAIF does not address the specification gap (L2) or alignment measurement (L5), and has no concept of translation losses between components. VTS extends SAIF by asking: "What happens at the interfaces between SAIF's own pillars?" |
   183|| **C2PA/CAI** | Content provenance standard | C2PA implements VTS Layer 1 at internet scale. It proves provenance -- that content came from a claimed source. VTS's contribution is showing that provenance alone is insufficient: authenticated garbage is still garbage. C2PA's limitations validate VTS Layer 1's caveat. |
   184|| **STAMP/STPA** (Leveson) | Systems-theoretic safety | STPA argues that safety is emergent, not compositional. VTS agrees -- and goes further by identifying *where* emergence occurs (the glue translations) and making it formally testable (the translation loss sets ℒᵢ^loss). STPA identifies the problem; VTS proposes a measurement framework. |
   185|
   186|**Key differentiator:** Existing frameworks treat trust as a *process* or *policy*.
   187|VTS treats trust as a *mathematical claim* that can be verified, falsified, and
   188| -- critically -- shown to be insufficient (verified doom). No other framework
   189|has this property.
   190|
   191|---
   192|
   193|## Reading Order
   194|
   195|For maximum impact, read in this order:
   196|
   197|1. **`verified_doom/attack_scenarios.py`** -- Start with concrete failure modes
   198|2. **`examples/rogue_agent/agent.py`** -- See it in executable pseudocode
   199|3. **This README** -- Now the theory makes sense
   200|4. **`THEORY.md`** -- Deep analysis, critiques, and falsifiable hypotheses
   201|5. **`layers/`** -- Each layer's contract and limitations
   202|6. **`glue/`** -- Where trust dies
   203|7. **`glue/align_to_spec.py`** -- The feedback loop; read last
   204|
   205|---
   206|
   207|## Repository Structure
   208|
   209|```
   210|verifiable-trust-stack/
   211|+-- README.md                   <- You are here
   212|+-- THEORY.md                   <- Formal definitions, model critiques, hypotheses
   213|+-- PROTOTYPE_PLAN.md           <- Prototype implementation plan
   214|+-- vts/                        <- Runnable end-to-end prototype
   215||   +-- __init__.py             <- Package exports
   216||   +-- __main__.py             <- CLI: python -m vts --scenario [honest|rogue|orthogonal]
   217||   +-- formal.py               <- Formal definitions (VD predicate, TranslationLoss, VulnerabilitySet)
   218||   +-- mock_components.py      <- Layer implementations (ProofVerifier, ValueModel, GovernanceEngine)
   219||   +-- pipeline.py             <- VTSPipeline: chains L1->L5 + glue + L5->L2 feedback
   220||   +-- scenarios.py            <- Three demo scenarios (honest, rogue, orthogonal collapse)
   221|+-- tests/
   222||   +-- test_pipeline.py        <- 21 pipeline tests
   223||   +-- test_formal.py          <- 24 formal definition + H4 validation tests
   224|+-- layers/                     <- Each layer as pseudocode
   225||   +-- 01_provenance/          <- Content chains, deepfake detection
   226||   +-- 02_specification/       <- Intent -> formal spec (Lean4-inspired)
   227||   +-- 03_verification/        <- zk-proof generation & verification
   228||   +-- 04_governance/          <- Policy gates, oversight loops
   229||   +-- 05_alignment/           <- Corrigibility protocols, value learning
   230|+-- glue/                       <- The missing code between layers
   231||   +-- types.py                <- Shared types (TranslationLoss, re-exports)
   232||   +-- __init__.py             <- Package init
   233||   +-- spec_to_proof.py        <- How spec feeds into proof generation
   234||   +-- proof_to_policy.py      <- How proven computation gates actions
   235||   +-- policy_to_align.py      <- How policy outcomes measure alignment
   236||   +-- align_to_spec.py        <- Feedback loop: harm measurement -> spec update
   237|+-- verified_doom/              <- Attack scenarios
   238||   +-- attack_scenarios.py
   239|+-- examples/                   <- Working demonstrations
   240|    +-- honest_agent/            <- Correct proof, correct specification
   241|    +-- rogue_agent/             <- Valid proof, wrong specification
   242|    +-- poisoned_data/           <- Authentic sources, distorted reality
   243|```
   244|
   245|---
   246|
   247|*"Show me the formal specification this proves -- and then show me proof that the
   248|specification itself is aligned with human intent in an open world."*
   249| -- Kimi K2.6
   250|
   251|License: Conceptual work. Use freely. Build the glue.
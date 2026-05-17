# Verifiable Trust Stack

## A System That Worked Perfectly — And Caused Real Harm

In 2021, Facebook's (now Meta) engagement algorithm was doing exactly what it
was built to do. The formal specification was internally consistent: maximize
time on platform. The mathematical optimization was provably correct: the
recommendation system faithfully executed that objective. Every governance
review approved it: policy after policy, the algorithm passed internal checks.

The result: teen anxiety, eating disorders, political polarization, and
documented real-world harm. Internal research (leaked by Frances Haugen)
confirmed the system amplified corrosive content because that content kept
users engaged. Every proof was valid. Every policy was followed. Every
specification was consistent. The doom was verified.

This is not hypothetical. This is not a thought experiment. It happened.

---

## The Core Insight

**Verification without specification alignment is performance art.**

A mathematically proven system executing a misaligned specification is not
safe — it is *demonstrably* dangerous. The proof verifies obedience, not
wisdom. This is what we call **verified doom**: provably correct execution
of a provably wrong plan.

The antidote is not better proof. It is better specification — and verified
translation between every layer that connects human intent to machine action.

---

## The Stack and Its Gaps

```
┌─────────────────────────────────────┐
│   5. Alignment Runtime              │  ← Does it act in our interest?
├─────────────────────────────────────┤
│   4. Agent Governance               │  ← Is it allowed to do this?
├─────────────────────────────────────┤
│   3. Verifiable Compute             │  ← Did it compute what it claims?
├─────────────────────────────────────┤
│   2. Formal Specification           │  ← What does "correct" even mean?
├─────────────────────────────────────┤
│   1. Data Provenance                │  ← Is the input authentic?
└─────────────────────────────────────┘
```

Each layer depends on the ones below it. The stack is only as strong as its
weakest layer — and the **interfaces between layers** are the weakest points.
The critical code is not in any single layer. It is in the `glue/` directory:
the translation between layers. Today, these translations are ad-hoc,
unverified, and often implicit.

### GAP MAP — Where Trust Dies

| Translation | What is LOST | What is ASSUMED | Severity |
|---|---|---|---|
| Data → Specification | Data truth, context | Authenticated = true | HIGH |
| Specification → Proof | Universal quantifiers, context | Finite checks ≈ universal | CRITICAL |
| Proof → Policy | Spec alignment, intent | Proof valid = safe | CRITICAL |
| Policy → Alignment | Value priorities, uncertainty | Policy permits = aligned | HIGH |
| Alignment → Specification (feedback) | Measurement noise, meta-alignment | Observed harm → spec update | RESEARCH |

Every row in this table is a place where verified doom becomes possible.
The severity ratings reflect not likelihood alone, but the *depth* of the
assumption: CRITICAL means the assumption is both unexamined and
foundational to the trust claim.

---

## Attack Scenarios

Six concrete demonstrations that valid proof + wrong specification = disaster.
Each scenario shows a step-by-step failure chain where every layer works
correctly in isolation, but the system produces catastrophic results.

| # | Scenario | Classification |
|---|---|---|
| 1 | **Verified Paperclip Optimizer** — Agent maximizes production; proof valid, spec wrong | Verified Doom |
| 2 | **Authenticated Deepfake** — C2PA-valid provenance on fabricated data | Trust Collapse |
| 3 | **Orthogonal Trust Collapse** — TEE + zkML; the glue between them is compromised | Emergent Failure |
| 4 | **Compromised Specification** — Hostile spec writer; all proofs verify obedience to adversary | Verified Doom |
| 5 | **Emergent Behavior from Correct Layers** — Each subsystem correct; interaction kills people | Emergent Failure |
| 6 | **Value Conflict** — Autonomy vs safety; proof legitimizes an arbitrary coin flip | Verified Doom |

Full implementations in `verified_doom/attack_scenarios.py`.

In every scenario: every proof was valid, every layer passed its checks, and
the result was catastrophe. The failure is never in the proof. It is in the
gaps between layers — what was lost, assumed, or never specified.

---

## Falsifiability

This is not philosophy. This theory makes testable predictions. Four
falsifiable hypotheses with clear measurement approaches are documented in
`THEORY.md`:

- **H1:** Glue code is the weakest point (vulnerability density in
  inter-layer translation exceeds within-layer)
- **H2:** Specification gaps cause more harm than data or governance failures
- **H3:** Verified doom is a practical risk — verification + misalignment is
  worse than misalignment alone, because it provides false confidence
- **H4:** Combining trust mechanisms produces novel interface vulnerabilities

If these claims are wrong, they can be proven wrong. That is the point.

---

## What to Build First

A tiered implementation roadmap. Full details in `THEORY.md`.

**Tier 1 — Deployable today (2025–2026)**
- Layer 1 (Provenance): C2PA + W3C Verifiable Credentials
- Layer 4 (Governance): Open Policy Agent with Rego policies
- Layer 3 (TEE path): AWS Nitro Enclaves, Oasis ROFL
- *Estimate: 6–8 weeks for an end-to-end prototype chaining all three.*

**Tier 2 — Feasible with engineering (2026–2027)**
- Layer 2 (Specification): LLM-assisted spec generation → Lean4 verification
- Layer 3 (zkML path): EZKL/Giza for small models; 10,000×+ overhead for LLMs
- Glue: `proof_to_policy` + `spec_to_proof` with TranslationWarning severity levels

**Tier 3 — Research-level (2027+)**
- Layer 5 (Alignment): No formal solution exists. RLHF is a heuristic, not a measurement.
- Glue: `align_to_spec` feedback loop — requires a theory of correct specification updates
- Orthogonal trust formalization — proving that translators preserve claimed properties

---

## Compositionality vs. Emergence: The Reconciliation

A natural objection: the stack metaphor implies that safety is **compositional** —
add verified layers, get a safer system. But safety engineering (Leveson's STPA,
Rasmussen's accretion model) demonstrates that safety is an **emergent** property
of system interactions, not something that composes from component properties.

**Both views are correct.** The resolution:

1. **The stack provides necessary conditions.** If Layer 1 (Provenance) fails,
   no amount of correct computation (Layer 3) can produce trustworthy output.
   Provenance failure is a sufficient condition for trust failure, regardless
   of what happens elsewhere. The stack correctly identifies conditions without
   which trust cannot hold.

2. **Emergence explains why necessary conditions are insufficient.** Even when
   all necessary conditions hold, the system may still fail due to emergent
   interactions. This is what Leveson and Rasmussen rightly emphasize.

3. **The glue is where emergence happens.** The interfaces between layers are
   where emergent properties arise. The Glue Problem is not an addendum — it
   is the site where the compositional view meets emergent reality.

Formally, the stack does **not** claim Safe ⟹ ∧P_i implies ∧P_i ⟹ Safe.
What it claims is the **necessity direction only**:

```
Safe(x,a) ⟹ P₁(x) ∧ P₂(s) ∧ P₃(f,s) ∧ P₄(a,p) ∧ P₅(a,v)   [necessity]
∧P_i      ⇏ Safe(x,a)                                              [insufficiency]
```

The gap between necessity and sufficiency is the union of translation losses:
Gap = ∪ᵢ ℒᵢ^loss. Closing this gap is the research program. See THEORY.md for
the full formal definitions and proofs.

---

## Comparison with Existing Frameworks

The verifiable trust stack does not exist in isolation. It relates to, extends,
and in some cases challenges established trust and safety frameworks:

| Framework | Scope | Relationship to VTS |
|-----------|-------|---------------------|
| **NIST AI RMF** (2023) | Risk governance for AI systems | VTS provides the *technical depth* that RMF treats abstractly. RMF's "Govern, Map, Measure, Manage" maps roughly to VTS L4→L5→L3→L4, but RMF has no formal translation verification between functions. VTS identifies the glue gaps that RMF assumes away. |
| **ISO 31000** (2018) | General risk management | ISO 31000 is process-oriented: identify→assess→treat→monitor. VTS is *artifact-oriented*: each layer produces a verifiable artifact, and the translations between artifacts are where risk materializes. VTS adds the insight that verified artifacts can compose into unverified systems. |
| **Google SAIF** (2023) | Security framework for AI | SAIF focuses on adversarial robustness, abuse, and data governance. These correspond to VTS L1 (data integrity), L3 (verification), and L4 (governance). Crucially, SAIF does not address the specification gap (L2) or alignment measurement (L5), and has no concept of translation losses between components. VTS extends SAIF by asking: "What happens at the interfaces between SAIF's own pillars?" |
| **C2PA/CAI** | Content provenance standard | C2PA implements VTS Layer 1 at internet scale. It proves provenance — that content came from a claimed source. VTS's contribution is showing that provenance alone is insufficient: authenticated garbage is still garbage. C2PA's limitations validate VTS Layer 1's caveat. |
| **STAMP/STPA** (Leveson) | Systems-theoretic safety | STPA argues that safety is emergent, not compositional. VTS agrees — and goes further by identifying *where* emergence occurs (the glue translations) and making it formally testable (the translation loss sets ℒᵢ^loss). STPA identifies the problem; VTS proposes a measurement framework. |

**Key differentiator:** Existing frameworks treat trust as a *process* or *policy*.
VTS treats trust as a *mathematical claim* that can be verified, falsified, and
— critically — shown to be insufficient (verified doom). No other framework
has this property.

---

## Reading Order

For maximum impact, read in this order:

1. **`verified_doom/attack_scenarios.py`** — Start with concrete failure modes
2. **`examples/rogue_agent/agent.py`** — See it in executable pseudocode
3. **This README** — Now the theory makes sense
4. **`THEORY.md`** — Deep analysis, critiques, and falsifiable hypotheses
5. **`layers/`** — Each layer's contract and limitations
6. **`glue/`** — Where trust dies
7. **`glue/align_to_spec.py`** — The feedback loop; read last

---

## Repository Structure

```
verifiable-trust-stack/
├── README.md                   ← You are here
├── THEORY.md                   ← Formal definitions, model critiques, hypotheses
├── PROTOTYPE_PLAN.md           ← Prototype implementation plan
├── vts/                        ← Runnable end-to-end prototype
│   ├── __init__.py             ← Package exports
│   ├── __main__.py             ← CLI: python -m vts --scenario [honest|rogue|orthogonal]
│   ├── formal.py               ← Formal definitions (VD predicate, TranslationLoss, VulnerabilitySet)
│   ├── mock_components.py      ← Layer implementations (ProofVerifier, ValueModel, GovernanceEngine)
│   ├── pipeline.py             ← VTSPipeline: chains L1→L5 + glue + L5→L2 feedback
│   └── scenarios.py            ← Three demo scenarios (honest, rogue, orthogonal collapse)
├── tests/
│   ├── test_pipeline.py        ← 21 pipeline tests
│   └── test_formal.py          ← 24 formal definition + H4 validation tests
├── layers/                     ← Each layer as pseudocode
│   ├── 01_provenance/          ← Content chains, deepfake detection
│   ├── 02_specification/       ← Intent → formal spec (Lean4-inspired)
│   ├── 03_verification/        ← zk-proof generation & verification
│   ├── 04_governance/          ← Policy gates, oversight loops
│   └── 05_alignment/           ← Corrigibility protocols, value learning
├── glue/                       ← The missing code between layers
│   ├── types.py                ← Shared types (TranslationLoss, re-exports)
│   ├── __init__.py             ← Package init
│   ├── spec_to_proof.py        ← How spec feeds into proof generation
│   ├── proof_to_policy.py      ← How proven computation gates actions
│   ├── policy_to_align.py      ← How policy outcomes measure alignment
│   └── align_to_spec.py        ← Feedback loop: harm measurement → spec update
├── verified_doom/              ← Attack scenarios
│   └── attack_scenarios.py
└── examples/                   ← Working demonstrations
    ├── honest_agent/            ← Correct proof, correct specification
    ├── rogue_agent/             ← Valid proof, wrong specification
    └── poisoned_data/           ← Authentic sources, distorted reality
```

---

*"Show me the formal specification this proves — and then show me proof that the
specification itself is aligned with human intent in an open world."*
— Kimi K2.6

License: Conceptual work. Use freely. Build the glue.
"""
Glue: Specification → Proof Generation (Layer 2 → Layer 3)

This is the first translation layer — where formal specifications become
inputs to proof-generating systems. This glue is where trust either
lives or dies, because the translation from human intent to machine
verifiable specification is INFORMAL and UNVERIFIED.

Key concepts from THEORY.md:
  - "The interface between proof systems is itself unverified.
    Each layer speaks a different formal language, and the translators
    are written in informal code." (The Glue Problem)
  - The specification gap: verified computation proves obedience to a
    spec, not alignment with intent.
  - This file is the exact place where the specification gap becomes
    a concrete failure: if the translation is wrong, the proof proves
    the wrong thing.

TRANSLATION GAP:
  Formal Specification (Lean4-ish) → Circuit Description (R1CS/PLONK-ish)
  Human-readable logic → Arithmetic constraints
  Quantified statements → Finite bound checks

  What is LOST in translation:
    - Universal quantifiers (∀) become finite checks
    - Rich logical structure becomes polynomial constraints
    - Context-dependent meaning becomes fixed interpretation
    - Open-world semantics become closed-world assumptions
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


from glue.types import TranslationLossSeverity, TranslationLoss, TranslationWarning


# PSEUDOCODE: In reality, this would use EZKL or Giza to compile
# a model specification into a ZK circuit. This file shows the GAPS.

@dataclass
class FormalSpec:
    """Output from Layer 2 — a verified formal specification."""
    spec_id: str
    formal_statement: str      # e.g., "∀ x ∈ Requests, authorized(x) → permitted(x)"
    proof_obligations: list[str]
    domain: str


@dataclass
class CircuitInput:
    """Input to a ZK proof circuit — what the proof system actually checks."""
    circuit_id: str
    constraints: list[str]      # Arithmetic constraints (R1CS/PLONK format)
    public_inputs: list[str]    # What is revealed
    private_inputs: list[str]   # What is hidden (witness)
    spec_id: str                # References back to the original spec
    translation_notes: list[str]  # CRITICAL: what was lost in translation (legacy string form)
    translation_warning: Optional[TranslationWarning] = None  # Structured translation losses


class SpecToProofTranslator:
    """Translates formal specifications into ZK circuit inputs.

    # WARNING: THIS IS THE MOST DANGEROUS CODE IN THE ENTIRE STACK.
    #
    # Why? Because:
    #   1. The formal spec is in Lean4/Coq logic (rich, expressive)
    #   2. The ZK circuit is in arithmetic constraints (finite, constrained)
    #   3. The translation BETWEEN them is INFORMAL Python/TypeScript
    #   4. No proof exists that the translation is correct
    #   5. A bug here means the proof proves the WRONG THING
    #
    # This is the "glue problem" in its most concrete form.
    """

    def translate(self, spec: FormalSpec) -> CircuitInput:
        """Translate a formal specification into circuit inputs.

        # CONCRETE EXAMPLE OF TRANSLATION LOSS:
        #
        # Formal spec (Layer 2):
        #   "∀ user ∈ Users, authorized(user) → permitted(user)"
        #   (For ALL users, if authorized, then permitted)
        #
        # Circuit input (Layer 3):
        #   constraints:
        #     - "authorized[0] * 1 + (1 - permitted[0]) * 1 >= 1"  (user 0)
        #     - "authorized[1] * 1 + (1 - permitted[1]) * 1 >= 1"  (user 1)
        #     - ... (up to MAX_USERS)
        #   public_inputs: ["MAX_USERS"]
        #   private_inputs: ["authorized", "permitted"]
        #
        # What was LOST:
        #   - ∀ (universal quantifier) became a FINITE loop over MAX_USERS
        #   - If a new user arrives (user MAX_USERS + 1), they are UNCHECKED
        #   - The proof proves: "for the first N users, the rule holds"
        #   - The spec SAYS: "for ALL users, the rule holds"
        #
        # This gap is where verified doom becomes concrete.
        """
        constraints = self._formal_to_arithmetic(spec.formal_statement)
        translation_notes = self._document_translation_losses(spec)

        # Build the structured TranslationWarning from the same losses
        translation_losses = self._build_translation_losses(spec)
        translation_warning = TranslationWarning(
            losses=translation_losses,
            source_layer="Layer 2: Formal Specification",
            target_layer="Layer 3: Proof Circuit",
        )

        return CircuitInput(
            circuit_id=f"circuit_{spec.spec_id}",
            constraints=constraints,
            public_inputs=["bound_check_limit"],
            private_inputs=["witness_data"],
            spec_id=spec.spec_id,
            translation_notes=translation_notes,
            translation_warning=translation_warning
        )

    def _formal_to_arithmetic(self, formal: str) -> list[str]:
        """Convert formal logic to arithmetic constraints.

        # PSEUDOCODE: This is the core of the glue problem.
        # Universal quantifiers become bounded loops.
        # Existential quantifiers become witness values.
        # Logical implication becomes polynomial constraints.
        # Rich types become field elements.
        #
        # Each conversion is a potential source of verified doom.
        """
        # PSEUDOCODE: actual implementation would use:
        #   1. Parse formal logic into AST
        #   2. Eliminate quantifiers (this is where infinity becomes finite)
        #   3. Convert to CNF (conjunctive normal form)
        #   4. Encode CNF as R1CS constraints
        #   5. Optimize circuit for proof generation
        return [
            "constraint_1: authorized * (1 - permitted) = 0",
            "constraint_2: user_index < MAX_USERS",
            "BOUND: ∀ becomes finite loop over MAX_USERS"
        ]

    def _document_translation_losses(self, spec: FormalSpec) -> list[str]:
        """Document what is lost in the translation from formal spec to circuit.

        # This is the MOST IMPORTANT function in the glue code.
        # Honest documentation of translation losses is the only defense
        # against verified doom. If we know what we lost, we can guard.
        #
        # NOTE: This method now returns legacy string descriptions.
        # For structured data, use _build_translation_losses() instead.
        """
        losses = []
        if "∀" in spec.formal_statement or "forall" in spec.formal_statement:
            losses.append(
                "Universal quantifier (∀) translated to finite bound check. "
                "Entities beyond the bound are NOT verified. "
                "See: specification gap, verified doom."
            )
        if "→" in spec.formal_statement or "implies" in spec.formal_statement:
            losses.append(
                "Logical implication translated to polynomial constraint. "
                "Edge cases in implication semantics may not be preserved."
            )
        losses.append(
            f"This translation is INFORMAL code. No proof exists that "
            f"circuit {spec.spec_id} correctly implements the formal spec. "
            f"The glue problem: informal translation between formal systems."
        )
        return losses

    def _build_translation_losses(self, spec: FormalSpec) -> list[TranslationLoss]:
        """Build structured TranslationLoss objects documenting what is lost.

        # Same losses as _document_translation_losses but as first-class data
        # structures with severity levels. Governance (Layer 4) can use these
        # to auto-escalate when CRITICAL losses are detected.
        """
        losses = []
        if "∀" in spec.formal_statement or "forall" in spec.formal_statement:
            losses.append(TranslationLoss(
                severity=TranslationLossSeverity.CRITICAL,
                what_is_lost="Universal quantifier (∀) becomes finite bound check — entities beyond the bound are NOT verified",
                what_is_assumed="That all relevant entities are within the finite bound",
                mitigation="Runtime guards for entity count exceeding bound; periodic re-verification with expanded bounds"
            ))
        if "→" in spec.formal_statement or "implies" in spec.formal_statement:
            losses.append(TranslationLoss(
                severity=TranslationLossSeverity.HIGH,
                what_is_lost="Logical implication translated to polynomial constraint — edge cases in implication semantics may not be preserved",
                what_is_assumed="That the polynomial encoding faithfully captures the implication's truth conditions",
                mitigation="Additional test cases for edge conditions; formal review of constraint semantics"
            ))
        # The glue problem itself — always present
        losses.append(TranslationLoss(
            severity=TranslationLossSeverity.CRITICAL,
            what_is_lost=f"No proof exists that circuit {spec.spec_id} correctly implements the formal spec — the translation is INFORMAL code",
            what_is_assumed="That the informal Python/TypeScript glue code is correct",
            mitigation="Human review of all glue code; formal verification of the translator where possible; conservative defaults"
        ))
        return losses


# --- The verified doom path through this glue ---
# "Määritelmä kuilusta" — the gap between what we specified and what we proved.
#
# Step 1: Human says "keep patients safe"
# Step 2: Formal spec says "∀ patient, harm(patient) < ε"
# Step 3: This glue translates ∀ to finite check over current patient list
# Step 4: New patient arrives (not in the finite list)
# Step 5: The proof is valid. The patient is not checked. Harm occurs.
# Step 6: The proof did exactly what the circuit said. The circuit did NOT
#         do what the human intended. Verified doom.

VERIFIED_DOOM_GLUCE_EXAMPLE = FormalSpec(
    spec_id="spec_patient_safety_001",
    formal_statement="∀ patient ∈ Patients, harm_metric(patient) < ε",
    proof_obligations=["harm_metric is well-defined", "ε is bounded"],
    domain="healthcare"
)
# When this becomes circuit input, the ∀ becomes a loop over PATIENT_COUNT.
# Any patient outside PATIENT_COUNT is invisible to the proof.
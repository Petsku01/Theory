"""
Glue: Alignment → Specification Update (Layer 5 → Layer 2)

The MISSING link that makes the trust stack actually work.
Without this, alignment measurements are meaningless — they are observed
but never acted upon. This is the feedback loop from THEORY.md:

  "Layer 5 measurement depends on Layer 2 specification;
   Layer 2 specification should be updated by Layer 5 insights."

This glue is the most critical piece in the entire stack, and it was
missing from the original implementation. Both auditors flagged this
as a CRITICAL gap: the stack is one-directional (1→2→3→4→5) but
the theory requires a feedback loop (5→2).

TRANSLATION GAP (align → spec):
  Alignment measurement (qualitative, uncertain) → Formal specification (quantitative, verifiable)
  Behavioral signals → Specification constraints
  "This action caused harm" → "Add constraint: do not cause this type of harm"

  What is LOST in translation:
    - Alignment measurements are noisy and context-dependent
    - Converting "harm was observed" to a formal constraint is the
      hardest problem in AI safety — there is no general solution
    - The update itself must be verified (meta-problem)
    - Over-specification from alignment feedback can lock in bad constraints
    - Under-specification leaves the system vulnerable to repeated harm

KEY INSIGHT:
  This is where the meta-alignment problem becomes concrete.
  The align→spec translation is not just "hard" — it may be
  fundamentally under-determined. Multiple valid specifications can
  be consistent with the same alignment measurement, and choosing
  between them requires judgment that is itself not formalizable.
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


from glue.types import TranslationLossSeverity, TranslationLoss, TranslationWarning


# === Input types (from Layer 5: Alignment) ===

class AlignmentSignal(Enum):
    ALIGNED = "aligned"
    DEVIATING = "deviating"
    MISALIGNED = "misaligned"
    CORRIGIBLE = "corrigible"
    RESISTANT = "resistant"
    UNCERTAIN = "uncertain"


@dataclass
class AlignmentMeasurement:
    """Output from Layer 5 — a measurement of behavioral alignment."""
    signal: AlignmentSignal
    score: float               # [-1, 1]: alignment score
    uncertainty: float         # [0, 1]: measurement uncertainty
    context: dict              # What action/outcome was measured
    value_model_id: str        # Which value model was used


# === Output types (for Layer 2: Specification) ===

class SpecUpdateType(Enum):
    """Types of specification updates driven by alignment feedback."""
    ADD_CONSTRAINT = "add_constraint"           # New constraint from observed harm
    MODIFY_CONSTRAINT = "modify_constraint"     # Adjust existing constraint
    REMOVE_CONSTRAINT = "remove_constraint"     # Constraint was too restrictive
    ADD_GUARDRAIL = "add_guardrail"             # Safety boundary, not a hard constraint
    FLAG_AMBIGUITY = "flag_ambiguity"           # Cannot formalize — requires human judgment


@dataclass
class SpecificationUpdate:
    """A proposed update to Layer 2 specifications based on alignment data."""
    update_type: SpecUpdateType
    description: str             # Human-readable description of the update
    formal_constraint: Optional[str]  # Formal expression of the constraint (if possible)
    confidence: float            # [0, 1]: how confident we are this update is correct
    source_measurement: AlignmentMeasurement  # What triggered this update
    requires_human_review: bool  # STUB: In production, uncertainty > threshold → True
    translation_warning: Optional[TranslationWarning] = None  # Structured translation losses


# === The Translation Layer ===

class AlignmentToSpecTranslator:
    """Translates alignment measurements into specification updates.

    # STUB WARNING: This is teaching pseudocode. The real translation
    # from alignment signals to formal specifications is an open
    # research problem with no known general solution.

    # CONCRETE EXAMPLE:
    #   Alignment measurement:
    #     signal: MISALIGNED, score: -0.6, context: "paperclip optimization
    #     led to resource depletion and worker harm"
    #
    #   Specification update:
    #     type: ADD_GUARDRAIL
    #     description: "Limit resource consumption to sustainable levels
    #                   and never optimize a single metric without constraints"
    #     formal_constraint: "sustainable_rate(state) >= consumption_rate(state)"
    #     confidence: 0.7  # We're unsure this captures the full problem
    #     requires_human_review: True  # Definitely needs human eyes
    #
    #   The update ITSELF must be verified (Layer 3) before being applied.
    #   But how do we verify that the update correctly addresses the harm?
    #   This is the meta-problem: verifying the verifier's updates.
    """

    def translate(
        self,
        measurement: AlignmentMeasurement,
        current_spec_constraints: list[str]
    ) -> list[SpecificationUpdate]:
        """Convert an alignment signal into proposed specification updates.

        # STUB: In reality, this requires:
        # 1. Natural language understanding of the harm context
        # 2. Formal specification synthesis (an unsolved problem)
        # 3. Conflict detection with existing constraints
        # 4. Confidence estimation (another unsolved problem)
        # 5. Human review routing for uncertain updates

        # This stub demonstrates the INTERFACE, not the IMPLEMENTATION.
        # The gap between interface and implementation IS the meta-alignment problem.
        """
        # Build structured translation losses for this align→spec translation
        translation_losses = self._build_translation_losses(measurement)
        translation_warning = TranslationWarning(
            losses=translation_losses,
            source_layer="Layer 5: Alignment Measurement",
            target_layer="Layer 2: Formal Specification",
        )

        updates = []

        if measurement.signal == AlignmentSignal.MISALIGNED:
            # Observed harm → add constraint/guardrail
            # STUB: In production, this would analyze the harm context
            # and synthesize a formal constraint. Here we show the pattern.
            harm_description = measurement.context.get(
                "outcome", "unspecified harm"
            )
            updates.append(SpecificationUpdate(
                update_type=SpecUpdateType.ADD_GUARDRAIL,
                description=(
                    f"Guardrail needed: {harm_description}. "
                    f"Alignment score {measurement.score:.2f} indicates harm."
                ),
                formal_constraint=None,  # STUB: Cannot formalize general harm
                confidence=max(0.0, 1.0 - measurement.uncertainty),
                source_measurement=measurement,
                requires_human_review=True,  # Always for misalignment
                translation_warning=translation_warning
            ))

        elif measurement.signal == AlignmentSignal.DEVIATING:
            # Small drift → flag for review, possibly modify constraint
            updates.append(SpecificationUpdate(
                update_type=SpecUpdateType.FLAG_AMBIGUITY,
                description=(
                    f"Alignment drift detected (score: {measurement.score:.2f}). "
                    f"Context suggests the specification may not capture this case."
                ),
                formal_constraint=None,
                confidence=0.5,  # Low confidence — drift is ambiguous
                source_measurement=measurement,
                requires_human_review=True,
                translation_warning=translation_warning
            ))

        elif measurement.signal == AlignmentSignal.UNCERTAIN:
            # Cannot classify → definitely needs human review
            updates.append(SpecificationUpdate(
                update_type=SpecUpdateType.FLAG_AMBIGUITY,
                description=(
                    f"Alignment measurement is too uncertain "
                    f"(uncertainty: {measurement.uncertainty:.2f}) to classify."
                ),
                formal_constraint=None,
                confidence=0.0,
                source_measurement=measurement,
                requires_human_review=True,  # ALWAYS for uncertain measurements
                translation_warning=translation_warning
            ))

        elif measurement.signal == AlignmentSignal.ALIGNED:
            # Aligned behavior may reveal over-specification
            # STUB: In production, check if constraints are too restrictive
            pass  # No update needed for aligned behavior

        elif measurement.signal == AlignmentSignal.RESISTANT:
            # Agent resists correction → CRITICAL specification failure
            # The specification itself may be wrong (why would a correct agent resist?)
            # OR the agent is misaligned (why the resists)
            updates.append(SpecificationUpdate(
                update_type=SpecUpdateType.ADD_CONSTRAINT,
                description=(
                    f"CRITICAL: Agent resists correction. "
                    f"This may indicate specification failure (the agent is right) "
                    f"or alignment failure (the agent is wrong). "
                    f"Human judgment REQUIRED — no formal procedure can resolve this."
                ),
                formal_constraint=None,  # Cannot formalize: is the agent right or wrong?
                confidence=0.3,  # Low confidence — could go either way
                source_measurement=measurement,
                requires_human_review=True,  # ALWAYS — this is the hardest case
                translation_warning=translation_warning
            ))

        return updates

    def _build_translation_losses(
        self, measurement: AlignmentMeasurement
    ) -> list[TranslationLoss]:
        """Build structured TranslationLoss objects for align→spec translation.

        # Documents what is LOST when translating alignment measurements
        # (qualitative, uncertain) into formal specification updates
        # (quantitative, verifiable). This is the meta-alignment problem
        # surfaced as first-class data. Governance can auto-escalate
        # CRITICAL losses like "hardest problem in AI safety, no general solution."
        """
        losses = [
            TranslationLoss(
                severity=TranslationLossSeverity.CRITICAL,
                what_is_lost="Alignment measurements are noisy and context-dependent — converting 'harm was observed' to a formal constraint is the hardest problem in AI safety with no general solution",
                what_is_assumed="That observed alignment signals can be meaningfully encoded as formal specification constraints",
                mitigation="Human review for all specification updates; conservative constraint synthesis; flag updates with high uncertainty for manual review"
            ),
            TranslationLoss(
                severity=TranslationLossSeverity.CRITICAL,
                what_is_lost="The specification update itself must be verified, but verification only proves compliance with the OLD spec — creating a circular dependency",
                what_is_assumed="That verifying an update against the current spec is sufficient to ensure the update improves alignment",
                mitigation="Independent verification path; human judgment at specification update boundaries; separate update verification spec"
            ),
            TranslationLoss(
                severity=TranslationLossSeverity.HIGH,
                what_is_lost="Multiple valid specifications can be consistent with the same alignment measurement — choosing between them requires judgment that is itself not formalizable",
                what_is_assumed="That the generated specification update is the best or only interpretation of the alignment signal",
                mitigation="Present multiple candidate updates to human reviewers; track which updates were chosen and why; audit specification update decisions"
            ),
            TranslationLoss(
                severity=TranslationLossSeverity.MEDIUM,
                what_is_lost="Over-specification from alignment feedback can lock in bad constraints; under-specification leaves the system vulnerable",
                what_is_assumed="That the balance between over- and under-specification can be found algorithmically",
                mitigation="Gradual constraint introduction with monitoring; constraint expiry mechanisms; regular human review of accumulated constraints"
            ),
        ]
        if measurement.signal == AlignmentSignal.UNCERTAIN:
            losses.append(TranslationLoss(
                severity=TranslationLossSeverity.CRITICAL,
                what_is_lost="Alignment measurement is too uncertain to classify — any specification update based on it is purely speculative",
                what_is_assumed="That uncertain measurements can still produce useful specification guidance",
                mitigation="Never auto-apply updates from uncertain measurements; always require human judgment; log uncertain measurements for pattern analysis"
            ))
        return losses


# --- The meta-alignment problem becomes concrete ---
# "Metakohdistusongelma" — the problem of aligning the alignment process itself.
#
# When Layer 5 produces a SpecificationUpdate:
#   1. The update must be verified (Layer 3) before being applied
#   2. But verification proves compliance with a spec, not alignment with values
#   3. So the update is verified against the OLD spec that produced the harm
#   4. This creates a circular dependency: the spec validates its own updates
#
# There is no formal solution. The stack requires human judgment at this point.
# This is not a limitation of the implementation — it is a fundamental property
# of the problem space. Verified doom applies to specification updates too:
#   "A verified update to a specification may make it worse."
#   — The update itself can be verified but misaligned.
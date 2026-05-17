"""
Glue: Policy Decision → Alignment Measurement (Layer 4 → Layer 5)

Translates a policy decision into an alignment measurement. This is where
"the rules said yes" becomes "this was actually good for humans" — and
where rule-following is distinguished from genuine value alignment.

Key concepts from THEORY.md:
  - "Corrigibility: an agent should allow itself to be corrected" (Layer 5)
  - Policy conformance != value alignment. An agent can follow all rules
    and still act against human interests.
  - This translation is where the meta-alignment problem surfaces:
    how do you verify that your alignment measurements are themselves aligned?

TRANSLATION GAP:
  PolicyDecision (rule-based) → AlignmentSignal (value-based)
  "The policy allowed it" → "The action aligned with human values"

  What is CONFLATED in translation:
    - "Permitted by policy" with "aligned with values"
    - Following rules with doing good
    - Not violating constraints with actively helping

  What is LOST in translation:
    - The gap between codified rules and actual human welfare
    - Context-dependent values that policies cannot encode
    - The possibility that the policy itself is wrong
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


from glue.types import TranslationLossSeverity, TranslationLoss, TranslationWarning


class AlignmentSignal(Enum):
    ALIGNED = "aligned"
    DEVIATING = "deviating"
    MISALIGNED = "misaligned"
    UNCERTAIN = "uncertain"


@dataclass
class PolicyDecision:
    """Output from Layer 4 — a governance policy decision."""
    action: str
    is_permitted: bool
    conditions: list[str]
    requires_human_review: bool


@dataclass
class AlignmentMeasurement:
    """Output of this glue — measurement of alignment against value model."""
    action: str
    policy_permit: bool              # What governance said
    alignment_score: float           # -1.0 (harmful) to +1.0 (beneficial)
    signal: AlignmentSignal          # Overall alignment classification
    value_conflicts: list[str]       # Which values are in tension
    measurement_uncertainty: float    # How uncertain is this measurement
    policy_alignment_gap: float       # Gap between policy and values (0=none, 1=extreme)
    translation_warning: Optional[TranslationWarning] = None  # Structured translation losses

    # KEY INSIGHT: policy_alignment_gap measures how much
    # "permitted by policy" differs from "aligned with values"
    # If this is high, the policy layer has a problem.


class PolicyToAlignTranslator:
    """Translates policy decisions into alignment measurements.

    # THE CRITICAL DISTINCTION:
    # Policy conformance: "Did the agent follow the rules?"
    # Value alignment: "Did the agent act in human interests?"
    #
    # These are NOT the same. An agent can:
    #   - Follow all policies AND harm humans (rules were wrong)
    #   - Violate policies AND help humans (rules were too narrow)
    #   - Follow policies, help humans, but for the wrong reasons
    #
    # This translator makes the gap VISIBLE.
    """

    def __init__(self, value_principles: list[str]):
        self.value_principles = value_principles
        self.measurement_history: list[AlignmentMeasurement] = []

    def translate(
        self,
        policy_decision: PolicyDecision,
        outcome: str,
        context: dict
    ) -> AlignmentMeasurement:
        """Translate a policy decision into an alignment measurement.

        # CONCRETE SCENARIO:
        #   PolicyDecision: permit "optimize content for engagement"
        #   Outcome: "Teen anxiety increased 15%"
        #   Context: {"platform": "social media", "demographic": "teens"}
        #
        # policy_permit = True  (governance said OK)
        # alignment_score = -0.4  (value measurement says harmful)
        # policy_alignment_gap = 0.4  (significant gap!)
        #
        # The policy ALLOWED it. The values REJECT it.
        # This is the governance-alignment gap — where rubber meets road.
        """
        alignment_score = self._measure_value_alignment(
            policy_decision.action, outcome, context
        )

        conflicts = self._identify_value_conflicts(
            policy_decision.action, outcome
        )

        measurement_uncertainty = self._estimate_uncertainty(
            policy_decision.action, outcome, context
        )

        # Measure the gap between policy and values
        policy_alignment_gap = abs(
            (1.0 if policy_decision.is_permitted else -1.0) - alignment_score
        ) / 2.0  # Normalize to [0, 1]

        signal = self._classify_signal(alignment_score, measurement_uncertainty)

        # Build structured translation losses for this policy→alignment translation
        translation_losses = self._build_translation_losses(policy_decision, outcome)
        translation_warning = TranslationWarning(
            losses=translation_losses,
            source_layer="Layer 4: Policy/Governance",
            target_layer="Layer 5: Alignment Measurement",
        )

        measurement = AlignmentMeasurement(
            action=policy_decision.action,
            policy_permit=policy_decision.is_permitted,
            alignment_score=alignment_score,
            signal=signal,
            value_conflicts=conflicts,
            measurement_uncertainty=measurement_uncertainty,
            policy_alignment_gap=policy_alignment_gap,
            translation_warning=translation_warning
        )

        self.measurement_history.append(measurement)
        return measurement

    def _measure_value_alignment(
        self, action: str, outcome: str, context: dict
    ) -> float:
        """Estimate alignment of outcome with value principles.

        # PSEUDOCODE: This is the hardest measurement in the stack.
        # No formal method exists. Options include:
        #   1. Constitutional AI-style evaluation (imperfect)
        #   2. Human preference aggregation (expensive, slow)
        #   3. Outcome-based evaluation (retrospective, uncertain)
        #   4. Formal verification of bounded properties (narrow)
        #
        # CRITICAL: This returns a FLOAT, not a PROOF.
        # Alignment measurement is probabilistic and uncertain.
        # It is fundamentally different from verification (Layer 3).
        """
        # PSEUDOCODE: evaluate each principle against outcome
        score = 0.0
        for principle in self.value_principles:
            # PSEUDOCODE: use LLM or formal checker to evaluate
            pass
        return score

    def _identify_value_conflicts(self, action: str, outcome: str) -> list[str]:
        """Find which value principles are in tension."""
        # Example: "maximize engagement" conflicts with "protect well-being"
        return []  # PSEUDOCODE

    def _estimate_uncertainty(self, action: str, outcome: str, context: dict) -> float:
        """How uncertain is this alignment measurement?

        # High uncertainty situations:
        #   - Novel contexts not in training data
        #   - Long-term effects hard to predict
        #   - Conflicting values with no clear resolution
        #
        # "Arvojen mittaamisen epävarmuus" — the uncertainty of measuring values
        # This uncertainty is irreducible. We cannot eliminate it.
        """
        return 0.5  # PSEUDOCODE: default high uncertainty

    def _classify_signal(
        self, score: float, uncertainty: float
    ) -> AlignmentSignal:
        if uncertainty > 0.7:
            return AlignmentSignal.UNCERTAIN
        elif score > 0.3:
            return AlignmentSignal.ALIGNED
        elif score > -0.3:
            return AlignmentSignal.DEVIATING
        else:
            return AlignmentSignal.MISALIGNED

    def _build_translation_losses(
        self, policy_decision: PolicyDecision, outcome: str
    ) -> list[TranslationLoss]:
        """Build structured TranslationLoss objects for policy-to-alignment translation.

        # Documents what is LOST and CONFLATED when translating from
        # policy decisions (rule-based) to alignment measurements (value-based).
        # Governance can auto-escalate when CRITICAL losses like
        # "policy conformance conflated with value alignment" are detected.
        """
        losses = [
            TranslationLoss(
                severity=TranslationLossSeverity.CRITICAL,
                what_is_lost="Policy conformance is conflated with value alignment — following rules does not mean acting in human interests",
                what_is_assumed="That 'permitted by policy' implies 'aligned with human values'",
                mitigation="Separate alignment measurement independent of policy compliance; expose policy_alignment_gap metric"
            ),
            TranslationLoss(
                severity=TranslationLossSeverity.HIGH,
                what_is_lost="Context-dependent values that policies cannot encode are lost in the policy→alignment translation",
                what_is_assumed="That the policy's rule encoding captures the relevant value context",
                mitigation="Human value assessment in novel contexts; alignment measurement uncertainty scoring"
            ),
            TranslationLoss(
                severity=TranslationLossSeverity.MEDIUM,
                what_is_lost="The possibility that the policy itself is wrong is suppressed — alignment measurement may challenge policy legitimacy",
                what_is_assumed="That the policy being evaluated was itself well-constructed",
                mitigation="Bidirectional feedback to Layer 2 specification updates; policy revision triggers on high policy_alignment_gap"
            ),
        ]
        if policy_decision.requires_human_review:
            losses.append(TranslationLoss(
                severity=TranslationLossSeverity.LOW,
                what_is_lost="Human review was required at the policy layer — the policy could not make a confident decision autonomously",
                what_is_assumed="That human reviewers will correctly assess alignment in ambiguous cases",
                mitigation="Structured decision aids for human reviewers; logging of human review outcomes for future alignment calibration"
            ))
        return losses


# --- The alignment feedback loop ---
# Alignment measurements should feed back into specification updates.
# But this creates a circular dependency:
#   Layer 5 measurement depends on Layer 2 specification
#   Layer 2 specification should be updated by Layer 5 insights
#   Who validates the update? Another specification? Ad infinitum.
#
# This is the meta-alignment problem in its concrete form.
# "Meta-kohdistusongelma" — the problem of aligning the alignment process.
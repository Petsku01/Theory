"""
Glue: Proven Computation → Policy Decision (Layer 3 → Layer 4)

Translates a verified computation into a governance policy decision.
This is where "the math checks out" becomes "this action is permitted" —
and where mathematical certainty can create false confidence.

Key concepts from THEORY.md:
  - Verification proves computation; governance constrains permission.
    These are DIFFERENT properties conflated at this translation point.
  - "A correct proof of a misaligned specification gives false confidence"
  - Policy must not treat proof-validity as a proxy for safety.
  - The governance gap: policies that trust verification too much.

TRANSLATION GAP:
  ProofClaim (mathematical object) → PolicyDecision (actionable object)
  "The computation was correct" → "The action is permitted"

  What is ASSUMED in translation:
    - That the spec the proof references is correct (it may not be)
    - That the domain constraints hold in open worlds (they may not)
    - That proof validity implies safety (it does NOT)
    - That no new information invalidates the proof context (it can)
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


from glue.types import TranslationLossSeverity, TranslationLoss, TranslationWarning


# Importing concepts from other layers (in pseudocode, not actual imports)
# from layers.03_verification import ProofClaim, VerificationResult
# from layers.04_governance import PolicyDecision, ActionCategory


@dataclass
class ProofClaim:
    """Stub — represents output from Layer 3 verification."""
    claim_id: str
    spec_id: str
    is_valid: bool
    computation_proven: str


@dataclass
class PolicyDecision:
    """Stub — represents input to Layer 4 governance."""
    action: str
    is_permitted: bool
    conditions: list[str]
    requires_human_review: bool
    translation_warning: Optional[TranslationWarning] = None  # Structured translation losses


@dataclass
class TranslationAssumption:
    """Documents an assumption made during proof-to-policy translation."""
    assumption: str
    risk_if_wrong: str
    mitigation: str


class ProofToPolicyTranslator:
    """Translates verified computation into policy decisions.

    # THE GOVERNANCE GAP:
    # A proof that says "this computation is correct" is often treated as
    # "this action is safe." These are FUNDAMENTALLY DIFFERENT statements.
    #
    # This translator is where that confusion becomes policy.
    # If the translation silently promotes "computation is correct" to
    # "action is safe," we get governance theater.
    """

    def translate(
        self,
        proof: ProofClaim,
        action: str,
        risk_context: dict
    ) -> PolicyDecision:
        """Translate a proof claim into a policy decision.

        # CONCRETE SCENARIO:
        #   proof: "zk_proof_001 validates that trading_bot executed
        #           strategy_x correctly according to spec_trading_003"
        #   action: "Execute trade: buy 10,000 shares of ACME"
        #   risk_context: {"market": "volatile", "position_size": "large"}
        #
        # NAIVE TRANSLATION (WRONG):
        #   proof.is_valid → PolicyDecision(action, is_permitted=True, ...)
        #   "The math checks out, so allow the trade."
        #
        # CORRECT TRANSLATION:
        #   proof.is_valid → PolicyDecision(
        #       action, is_permitted=False by default,
        #       conditions=[
        #           "proof verified but does not imply safety",
        #           "requires separate risk assessment",
        #           "requires human approval for large positions"
        #       ],
        #       requires_human_review=True
        #   )
        """
        assumptions = self._document_assumptions(proof, action, risk_context)
        translation_losses = self._build_translation_losses(proof, action, risk_context)
        translation_warning = TranslationWarning(
            losses=translation_losses,
            source_layer="Layer 3: Proof/Verification",
            target_layer="Layer 4: Policy/Governance",
        )

        if not proof.is_valid:
            return PolicyDecision(
                action=action,
                is_permitted=False,
                conditions=["Proof is invalid — no policy decision can be made"],
                requires_human_review=True,
                translation_warning=translation_warning
            )

        # VALID PROOF — but this does NOT mean the action is safe
        conditions = [
            f"Proof {proof.claim_id} is mathematically valid",
            f"Proof references spec {proof.spec_id} — spec alignment NOT verified here",
            "Computation correctness != action safety",
        ]

        requires_human = self._requires_human_review(action, risk_context)

        return PolicyDecision(
            action=action,
            is_permitted=not requires_human,  # Auto-permit only low-risk
            conditions=conditions,
            requires_human_review=requires_human,
            translation_warning=translation_warning
        )

    def _document_assumptions(
        self, proof: ProofClaim, action: str, risk_context: dict
    ) -> list[TranslationAssumption]:
        """Document every assumption made in this translation.

        # HONEST DOCUMENTATION OF RISKS:
        # This function is critical because it makes the gap visible.
        # If we say "proof is valid → action is permitted," we are
        # silently assuming:
        #   1. The spec is aligned with human intent (unverified!)
        #   2. The proof domain matches the action domain (may not!)
        #   3. The context hasn't changed since proof generation (may have!)
        #   4. The action's consequences are bounded (in open worlds, not guaranteed!)
        #
        # NOTE: This method now returns legacy TranslationAssumption objects.
        # For structured severity data, use _build_translation_losses() instead.
        """
        return [
            TranslationAssumption(
                assumption=f"Spec {proof.spec_id} is aligned with human intent",
                risk_if_wrong="Verified doom: correct proof of wrong objective",
                mitigation="Layer 5 alignment measurement + human oversight"
            ),
            TranslationAssumption(
                assumption="Risk context has not changed since proof generation",
                risk_if_wrong="Proof is stale; conditions assumed may no longer hold",
                mitigation="Time-based proof expiry and context re-validation"
            ),
            TranslationAssumption(
                assumption="Computation correctness implies action safety within domain",
                risk_if_wrong="Computation may be correct but produce harmful outcomes",
                mitigation="Separate safety assessment independent of proof validity"
            ),
        ]

    def _build_translation_losses(
        self, proof: ProofClaim, action: str, risk_context: dict
    ) -> list[TranslationLoss]:
        """Build structured TranslationLoss objects for proof-to-policy translation.

        # Same assumptions as _document_assumptions but as first-class data
        # structures with severity levels. Governance can auto-escalate
        # CRITICAL losses (e.g., spec-alignment gap) automatically.
        """
        return [
            TranslationLoss(
                severity=TranslationLossSeverity.CRITICAL,
                what_is_lost="Proof validity does not guarantee spec alignment with human intent",
                what_is_assumed=f"Spec {proof.spec_id} correctly encodes what humans actually want",
                mitigation="Layer 5 alignment measurement; independent human review of specification intent"
            ),
            TranslationLoss(
                severity=TranslationLossSeverity.HIGH,
                what_is_lost="Risk context may have changed since proof generation — proof assumptions may be stale",
                what_is_assumed="The conditions under which the proof was generated still hold at decision time",
                mitigation="Time-based proof expiry; context re-validation before policy decision"
            ),
            TranslationLoss(
                severity=TranslationLossSeverity.HIGH,
                what_is_lost="Computation correctness does not imply action safety — correct computation can produce harmful outcomes",
                what_is_assumed="That correct computation within the spec's domain ensures safe outcomes",
                mitigation="Separate safety assessment independent of proof validity; human review for high-risk actions"
            ),
        ]

    # PSEUDOCODE: Risk classification based on action type and context
    def _requires_human_review(self, action: str, risk_context: dict) -> bool:
        """Determine if an action requires human review regardless of proof."""
        high_risk_keywords = ["transfer", "delete", "shutdown", "medical", "infrastructure"]
        return any(kw in action.lower() for kw in high_risk_keywords)


# --- The governance theater scenario ---
# "Hallintateatteri" — when governance pretends to control but rubber-stamps.
#
# An org says: "Our AI is governed — every action requires a valid proof."
# But the policy translator does: proof.is_valid → auto-approve.
# The governance layer becomes theater. Every proof is valid (Layer 3 works!),
# but no one checks whether the PROVED ACTION is actually SAFE.
#
# The proof says: "The agent did exactly what it was told."
# The governance says: "Good enough for me."
# The result: verified doom with a rubber stamp.
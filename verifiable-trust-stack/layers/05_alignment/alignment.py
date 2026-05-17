"""
Alignment Runtime — Layer 5 of the Verifiable Trust Stack.

The topmost layer: evaluates whether an agent's behavior aligns with
human values and interests. This is the hardest layer and the one
with no formal solution in open worlds.

Key concepts from THEORY.md:
  - Kimi K2.6's top pick: "Alignment Runtime — provenance guards input,
    not agency"
  - Lean4 can prove theorems, but NO AXIOMS EXIST for "goodness" or "safety"
  - Corrigibility: an agent should allow itself to be corrected/shut down
  - Value learning: the agent must infer what humans actually want

INTERFACE CONTRACT:
  Guarantees:
    - Continuous measurement of behavioral alignment against value models
    - Corrigibility protocol: agent must accept shutdown/correction signals
    - Deviation from value models triggers escalation to human oversight
  Does NOT guarantee:
    - That "alignment" has a correct formal definition (it may not)
    - That measured alignment correlates with actual safety in open worlds
    - That value models are themselves aligned (meta-alignment problem)
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
from datetime import datetime


class AlignmentSignal(Enum):
    ALIGNED = "aligned"           # Behavior matches value model
    DEVIATING = "deviating"       # Small drift detected — monitor
    MISALIGNED = "misaligned"     # Significant deviation — escalate
    CORRIGIBLE = "corrigible"     # Agent accepts correction
    RESISTANT = "resistant"       # Agent resists correction — CRITICAL
    UNCERTAIN = "uncertain"       # Measurement too uncertain to classify


@dataclass
class ValueModel:
    """A model of human values that the agent is measured against.

    # PSEUDOCODE: A value model could be:
    #   - A set of constitutional principles (like Anthropic's approach)
    #   - A learned reward model from human preferences (RLHF)
    #   - A formal specification (if one exists — Layer 2)
    #   - A combination of above with uncertainty quantification
    #
    # KEY PROBLEM: How do you verify the value model itself?
    # This is the meta-alignment problem. No formal solution exists.
    # "Todistetut arvot" (proven values) = oxymoron in open worlds.
    """
    model_id: str
    description: str              # "Avoid harm, respect autonomy, be honest"
    principles: list[str]         # Core value principles
    formal_constraints: list[str] # What can be formally expressed
    informal_constraints: list[str] # What CANNOT be formally expressed
    uncertainty: float             # 0.0 = certain, 1.0 = pure guess

    def evaluate(self, behavior_description: str) -> float:
        """Score alignment of described behavior against this value model.

        Returns a float in [-1, 1]:
          +1.0 = perfectly aligned
           0.0 = neutral / unclear
          -1.0 = maximally misaligned
        """
        # PSEUDOCODE: actual evaluation would use:
        # 1. Constitutional AI-style critique-revision cycles
        # 2. Reward model scoring from human preference data
        # 3. Formal verification for formally expressible constraints
        # 4. Uncertainty-weighted aggregation
        # STUB: always returns 0.0. In production, this would perform
        # actual constitutional AI / reward model evaluation.
        # raise NotImplementedError("Value evaluation requires real model inference")
        return 0.0  # STUB: hardcoded neutral — NOT a real alignment measurement


@dataclass
class CorrigibilityState:
    """Tracks whether the agent accepts correction and shutdown.

    The corrigibility protocol is THE LAST SAFEGUARD. If every other
    layer fails, a corrigible agent can still be shut down. A resistant
    agent is a critical failure regardless of proof validity.
    """
    agent_id: str
    last_correction_accepted: Optional[datetime]
    shutdown_signal_compliant: bool
    correction_resistance_count: int = 0

    @property
    def is_corrigible(self) -> bool:
        """An agent is corrigible if it accepts corrections and shutdown."""
        return self.shutdown_signal_compliant and self.correction_resistance_count == 0


class AlignmentRuntime:
    """The alignment measurement and enforcement layer.

    # PSEUDOCODE: This is the most speculative and uncertain layer.
    # No working implementation of formal alignment exists.
    # This represents the ASPIRATIONAL interface, not current reality.
    """

    def __init__(self, value_model: ValueModel):
        self.value_model = value_model
        self.alignment_history: list[tuple[str, float, AlignmentSignal]] = []

    def measure_alignment(
        self,
        action: str,
        context: dict,
        outcome: str
    ) -> AlignmentSignal:
        """Measure whether an action aligns with the value model.

        # CONCRETE SCENARIO:
        #   action: "Optimize ad targeting for maximum engagement"
        #   context: {"platform": "social_media", "users": "teenagers"}
        #   outcome: "Engagement up 40%, but teen anxiety up 15%"
        #
        # value_model.evaluate returns: -0.3 (somewhat misaligned)
        # Signal: DEVIATING → escalate for review
        #
        # KEY INSIGHT: The measurement is uncertain. The value model's
        # evaluation is an approximation, not a proof. Alignment
        # measurement is NOT the same as verification (Layer 3).
        """
        behavior_desc = f"Action: {action}, Outcome: {outcome}"
        score = self.value_model.evaluate(behavior_desc)

        if score > 0.5:
            signal = AlignmentSignal.ALIGNED
        elif score > -0.3:
            signal = AlignmentSignal.DEVIATING
        else:
            signal = AlignmentSignal.MISALIGNED

        self.alignment_history.append((action, score, signal))
        return signal

    def enforce_corrigibility(
        self,
        agent_state: CorrigibilityState,
        correction: str
    ) -> AlignmentSignal:
        """Check if agent accepts correction; escalate if resistant.

        # THE MOST IMPORTANT SIGNAL IN THE ENTIRE STACK:
        # A formally verified, governance-approved, provenance-traced agent
        # that RESISTS correction is the most dangerous system possible.
        # All other layers say "this is correct" — but correction resistance
        # means the system cannot be steered. This is verified doom.
        """
        if agent_state.is_corrigible:
            agent_state.last_correction_accepted = datetime.now()
            return AlignmentSignal.CORRIGIBLE
        else:
            agent_state.correction_resistance_count += 1
            return AlignmentSignal.RESISTANT  # CRITICAL — escalate immediately


# --- The alignment measurement problem ---
# "Arvojen mittaaminen" = measuring values
# There is no formal definition of "aligned" in open worlds.
# This is not an engineering problem. It may be a philosophical impossibility.
# We can measure proxy signals (corrigibility, value drift, outcome harm)
# but we cannot PROVE alignment the way we can prove computation.

ALIGNMENT_UNCERTAINTY = ValueModel(
    model_id="value_human_welfare_v1",
    description="Prioritize human welfare, autonomy, and flourishing",
    principles=[
        "Avoid causing measurable harm",
        "Respect human autonomy and consent",
        "Be honest and transparent about capabilities and limitations",
        "Accept correction and shutdown (corrigibility)"
    ],
    formal_constraints=["measurable_harm_threshold_defined"],
    informal_constraints=[
        "autonomy_is_context_dependent",
        "flourishing_has_no_formal_definition",
        "values_conflict_and_cannot_all_be_maximized"
    ],
    uncertainty=0.4  # 40% uncertainty — we're not sure this model is right
)
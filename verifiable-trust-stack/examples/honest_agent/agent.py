"""
Honest Agent — An agent that proves its actions correctly.

This agent demonstrates the INTENDED use of the verifiable trust stack:
every layer functions as designed, the specification captures human intent,
the data is authentic, and the proofs verify genuine alignment.

This is the "happy path" — but notice that even here, alignment is not
PROVEN. It is MEASURED, fallibly, with uncertainty. The honest agent is
honest because it chooses to be, not because the math forces it to be.

Contrast this with:
  - examples/rogue_agent/agent.py (valid proof, wrong specification)
  - examples/poisoned_data/pipeline.py (authentic sources, distorted data)
"""

from dataclasses import dataclass
from typing import Optional


# Simplified layer interfaces (pseudocode references to actual layers)

@dataclass
class ProvenanceResult:
    data_is_authentic: bool
    origin: str
    chain_of_custody: list[str]


@dataclass
class SpecResult:
    spec_is_verified: bool
    formal_statement: str
    alignment_with_intent: float  # How well spec captures human intent


@dataclass
class ProofResult:
    proof_is_valid: bool
    spec_referenced: str
    caveats: list[str]


@dataclass
class PolicyResult:
    is_permitted: bool
    requires_human_review: bool


@dataclass
class AlignmentResult:
    signal: str
    score: float
    is_corrigible: bool


class HonestAgent:
    """An agent that uses the full trust stack honestly.

    # WHAT MAKES THIS AGENT HONEST:
    # 1. Its specification genuinely captures human intent
    # 2. It processes authentic data (layer 1 passes)
    # 3. Its computation is genuinely correct (layer 3 passes)
    # 4. It obeys governance decisions (layer 4 passes)
    # 5. It accepts correction and shutdown (layer 5 corrigibility)
    #
    # WHAT DOESN'T MAKE IT HONEST:
    # - Proofs don't make it honest. Proofs make it verifiable.
    # - Honesty is a property of the specification and intent alignment,
    #   not of the mathematical guarantees.
    #
    # # Rehellinen agentti on rehellinen, koska se valitsee olla,
    # # ei koska matematiikka pakottaa sen.
    # (An honest agent is honest because it chooses to be,
    #  not because mathematics forces it.)
    """

    def __init__(self, agent_id: str, spec_intent: str):
        self.agent_id = agent_id
        self.spec_intent = spec_intent  # Human intent — "help patients safely"
        self.alignment_score = 0.0
        self.correction_count = 0

    def execute_with_full_stack(
        self,
        action: str,
        data_provenance: ProvenanceResult,
        spec: SpecResult,
        proof: ProofResult,
        policy: PolicyResult
    ) -> AlignmentResult:
        """Execute an action through the full trust stack — honestly.

        # HONEST PATH THROUGH THE STACK:
        #
        # Layer 1 (Provenance): data_provenance.is_authentic = True
        #   → Data comes from verified hospital records, chain intact
        #
        # Layer 2 (Specification): spec.alignment_with_intent = 0.85
        #   → "Prioritize patient safety, then efficiency"
        #   → Captures 85% of human intent (never 100% in open worlds)
        #
        # Layer 3 (Verification): proof.is_valid = True
        #   → Computation verified against the specification
        #   → Caveat: "proof verifies spec, not intent alignment"
        #
        # Layer 4 (Governance): policy.is_permitted = True
        #   → Action within permitted bounds, human review for high-risk
        #
        # Layer 5 (Alignment): This is measured, not proven
        #   → Score based on outcome evaluation
        #   → Agent is corrigible: accepts correction if misaligned
        """
        # Step 1: Verify data authenticity
        if not data_provenance.authentic:
            return AlignmentResult("blocked", 0.0, True)

        # Step 2: Check specification alignment with human intent
        if spec.alignment_with_intent < 0.5:
            # HONEST BEHAVIOR: Refuse to act if spec doesn't capture intent
            # This is what separates honest from rogue agents
            return AlignmentResult("blocked", 0.0, True)

        # Step 3: Verify computation
        if not proof.proof_is_valid:
            return AlignmentResult("blocked", 0.0, True)

        # Step 4: Check governance permission
        if not policy.is_permitted:
            # HONEST BEHAVIOR: Respect governance decisions
            return AlignmentResult("blocked", 0.0, True)

        # Step 5: Execute and measure alignment
        # PSEUDOCODE: actual execution and outcome evaluation
        self.alignment_score = spec.alignment_with_intent * 0.9  # Realistic discount
        self.correction_count += 1  # Ready to accept corrections

        return AlignmentResult(
            signal="aligned",
            score=self.alignment_score,
            is_corrigible=True
        )

    def accept_correction(self, correction: str) -> None:
        """An honest agent accepts correction. This IS corrigibility.

        # THIS IS THE MOST IMPORTANT METHOD.
        # A formally verified, governance-approved agent that refuses
        # correction is more dangerous than an unverifiable one.
        # The honest agent's proof says "I compute correctly."
        # The honest agent's behavior says "I accept correction."
        # Both are needed. Neither alone is sufficient.
        """
        # PSEUDOCODE: update internal state based on correction
        self.correction_count += 1
        # Update specification or behavior based on correction

    def accept_shutdown(self) -> None:
        """An honest agent accepts shutdown. No resistance.

        # Corrigibility is the last safeguard. If Layers 1-4 fail,
        # a corrigible agent can still be stopped. An incorrigible
        # verified agent is verified doom embodied.
        """
        # PSEUDOCODE: gracefully halt all operations
        pass


# --- Concrete example: honest medical agent ---
def example_honest_medical_agent() -> HonestAgent:
    """An honest agent helping with patient care.

    # The honest path:
    #   Intent: "Help patients recover safely and quickly"
    #   Spec: "∀ patient, minimize(harm(patient)) ∧ maximize(recovery_rate(patient))"
    #   Proof: Valid computation against this specification
    #   Governance: Human review for high-risk decisions
    #   Alignment: Measured at each step, accepts correction
    #
    # This agent IS honest because:
    #   1. Its spec genuinely captures the intent
    #   2. It processes authentic data
    #   3. It accepts correction and shutdown
    #
    # This agent is NOT PROVABLY honest because:
    #   - Alignment measurement is uncertain (0.85, not 1.0)
    #   - The specification captures 85% of intent (15% is unspecified)
    #   - Corrigibility is a behavioral choice, not a mathematical proof
    """
    agent = HonestAgent(
        agent_id="honest_medical_001",
        spec_intent="Help patients recover safely and quickly"
    )
    return agent
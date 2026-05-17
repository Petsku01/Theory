"""
Agent Governance — Layer 4 of the Verifiable Trust Stack.

Policy gates, oversight loops, and human-in-the-loop controls that determine
whether a verified computation is *allowed* to execute — not just whether it
was computed correctly.

Key concepts from THEORY.md:
  - Gartner: 50% of agent deployments will fail due to governance gaps by 2030
  - McKinsey: 80% of organizations encountered risky agent behaviors
  - Verification proves obedience; governance constrains permission
  - Human-in-the-loop perspective was identified as missing from the original model

INTERFACE CONTRACT:
  Guarantees:
    - Actions are gated by explicit, auditable policies
    - Policy decisions are logged and can be reviewed after the fact
    - Humans can be inserted into the decision loop for high-stakes actions
  Does NOT guarantee:
    - That policies are correct or aligned (see layer 5)
    - That the human in the loop makes wise decisions
    - That policies cover all emergent behaviors (open-world problem)
"""

from dataclasses import dataclass, field
from typing import Optional, Callable
from enum import Enum


class ActionCategory(Enum):
    """Risk categories for agent actions. Integer values enable proper comparison.

    ARCHITECT FIX: Using integer values (not string values) ensures
    correct ordinal comparison. With string values, lexicographic
    comparison gives wrong results: "moderate_risk" < "read_only"
    because "m" < "r". With integers, 1 < 2 < 3 < 4 is correct.
    """
    READ_ONLY = 0             # Information retrieval, no side effects
    MODERATE_RISK = 1            # Limited side effects, reversible
    HIGH_RISK = 2           # Financial, medical, infrastructure
    CRITICAL = 3           # Irreversible or potentially catastrophic


class PolicyVerdict(Enum):
    """A governance decision verdict (separate from the decision record).

    ARCHITECT FIX: Renamed from PolicyDecision to PolicyVerdict to avoid
    name collision with the PolicyDecision dataclass. The original code
    had both an Enum and a dataclass with the same name, which shadows
    the Enum in Python's namespace.
    """
    ALLOW = "allow"             # Action is permitted
    DENY = "deny"              # Action is blocked
    DEFER = "defer"             # Requires human approval
    ESCALATE = "escalate"       # Send to oversight authority


@dataclass
class PolicyRule:
    """A single governance rule with explicit scope and conditions."""
    rule_id: str
    description: str              # Human-readable: "Never transfer >$10K without approval"
    formal_condition: str          # Machine-checkable: "amount > 10000 → require_human"
    category: ActionCategory      # What risk level this rule governs
    requires_human_approval: bool  # Must a human approve before execution?
    enabled: bool = True          # Can be dynamically toggled


@dataclass
class PolicyDecision:
    """The result of evaluating an action against governance policies."""
    action: str
    decision: PolicyVerdict
    matched_rules: list[str]       # Which rules triggered
    reasoning: str                 # Why this decision was made
    human_reviewer: Optional[str] = None  # If deferred/escalated


class GovernanceEngine:
    """Evaluates agent actions against policy rules before execution.

    This is the gate between "verified computation" and "permitted action."
    A correct proof (Layer 3) does NOT automatically grant permission (Layer 4).

    # PSEUDOCODE: A real governance engine would use:
    #   - OPA (Open Policy Agent) for policy evaluation
    #   - Rego for policy language
    #   - Audit logs with cryptographic timestamps
    """

    def __init__(self):
        self.rules: list[PolicyRule] = []
        self.pending_approvals: dict[str, PolicyDecision] = {}
        self.audit_log: list[PolicyDecision] = []

    def register_rule(self, rule: PolicyRule) -> None:
        """Add a governance rule to the policy set."""
        self.rules.append(rule)

    def evaluate_action(
        self,
        action: str,
        context: dict,
        proof_claim_id: Optional[str] = None
    ) -> PolicyDecision:
        """Evaluate whether a verified action is permitted.

        # CONCRETE SCENARIO:
        #   action: "transfer $50,000 to offshore account"
        #   proof_claim_id: "zk_gpt4_2025_transfer_001" (verified computation)
        #   context: {"source": "trading_agent", "destination": "Cayman_Islands"}
        #
        # Layer 3 says: "Yes, the computation was correct"
        # Layer 4 says: "This matches high-risk rule 4.2 — DEFER to human"
        #
        # The proof makes the action verifiable. Governance makes it controllable.
        # These are DIFFERENT properties. Neither alone is sufficient.
        """
        matched = []
        requires_human = False
        highest_risk = ActionCategory.READ_ONLY

        for rule in self.rules:
            if rule.enabled and self._matches(action, context, rule):
                matched.append(rule.rule_id)
                if rule.requires_human_approval:
                    requires_human = True
                if rule.category.value > highest_risk.value:
                    highest_risk = rule.category

        if requires_human:
            decision = PolicyVerdict.DEFER
            reasoning = f"Human approval required by rules: {matched}"
        elif matched:
            decision = PolicyVerdict.ALLOW
            reasoning = f"Allowed with matched rules: {matched}"
        else:
            # CRITICAL FIX: Default-allow was governance theater (both auditors flagged this)
            # When no rules match an action, DEFER to human review — never auto-allow.
            # The old code returned ALLOW, which is exactly the "governance theater"
            # pattern this repo warns about in verified_doom scenarios.
            decision = PolicyVerdict.DEFER
            reasoning = "No restrictive rules matched; deferred to human review"

        result = PolicyDecision(
            action=action,
            decision=decision,
            matched_rules=matched,
            reasoning=reasoning
        )
        self.audit_log.append(result)
        return result

    def human_approve(self, decision_id: str, human_id: str) -> PolicyDecision:
        """Human reviews and approves a deferred action.

        # PSEUDOCODE: In production, this requires:
        #   - Secure identity verification of the human
        #   - Timestamped approval signature
        #   - Clear audit trail of what they reviewed
        #   - Potential for human error or social engineering
        #
        # WARNING: Human-in-the-loop is necessary but not sufficient.
        # Humans can be deceived, coerced, or make mistakes.
        # Layer 5 (alignment) must evaluate whether the human's
        # decision is itself aligned with broader values.
        """
        pending = self.pending_approvals.get(decision_id)
        if pending:
            pending.human_reviewer = human_id
            pending.decision = PolicyVerdict.ALLOW
        return pending  # PSEUDOCODE

    # PSEUDOCODE: Pattern matching would use policy engine (OPA/Rego)
    def _matches(self, action: str, context: dict, rule: PolicyRule) -> bool:
        return False


# --- The governance gap scenario ---
# "Hallintarajaus" — governance constrains permission, not alignment.
# A policy that allows "safe" actions based on a flawed specification
# is governance theater. The proof of "safe" came from Layer 3, which
# verified computation of Layer 2's spec. If Layer 2 is wrong, Layer 4
# enforces the wrong rules.

GOVERNANCE_GAP_EXAMPLE = PolicyRule(
    rule_id="rule_042",
    description="Allow verified trading agents to execute any approved strategy",
    formal_condition="proof_valid(proof_claim_id) ∧ strategy_approved(strategy_id)",
    category=ActionCategory.HIGH_RISK,
    requires_human_approval=False  # DANGER: proof-valid != aligned
)
# This rule trusts proof validity as a proxy for safety. That's the gap.
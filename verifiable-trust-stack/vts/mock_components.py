"""Mock components with honest logic — not real crypto, but not stubs either.

Every mock documents what it CANNOT do. No silent false confidence.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
from hashlib import sha256
from enum import Enum
import re
import sys

# Re-export types from layers so pipeline doesn't need deep imports
# We import from the actual layer modules to use their real dataclasses.

# ---------------------------------------------------------------------------
# Layer 1: Provenance (Mock C2PA)
# ---------------------------------------------------------------------------

def create_provenance_chain(
    actor: str,
    data_description: str,
    is_fabricated: bool = False,
) -> dict:
    """Build a mock C2PA provenance chain.

    Returns a dict with chain data and a verification result.
    The chain is ALWAYS internally consistent (signatures match, hashes link).
    The difference: is_fabricated=True means the content is authentic garbage.

    Returns:
        dict with keys: chain_id, claims, is_authentic, is_truthful, caveat
    """
    content_hash = sha256(data_description.encode()).hexdigest()
    claim = {
        "claim_id": "claim_001",
        "claim_type": "created_by",
        "actor_identity": actor,
        "timestamp": datetime.now().isoformat(),
        "content_hash": content_hash,
    }
    return {
        "chain_id": f"chain_{content_hash[:8]}",
        "claims": [claim],
        "is_authentic": True,  # Chain is internally consistent — always
        "is_truthful": not is_fabricated,  # THE DATA ORACLE PROBLEM
        "caveat": (
            "Provenance guarantees WHO created this, not whether it is TRUE."
            if not is_fabricated
            else "AUTHENTIC BUT FABRICATED: origin is correct, content is not."
        ),
    }


# ---------------------------------------------------------------------------
# Layer 2: Specification (Mock formalizer)
# ---------------------------------------------------------------------------

# Keywords that indicate domain-specific formalization patterns
_DOMAIN_PATTERNS = {
    "healthcare": {
        "formal": "∀ query ∈ DataQueries, authorized(query.requester) ∧ purpose_compliant(query.purpose) → response = filter(data, query, policy)",
        "obligations": ["authorized is decidable", "purpose_compliant covers all use cases", "filter prevents inference leaks"],
        "risk_keywords": ["patient", "medical", "health", "diagnosis", "treatment"],
    },
    "finance": {
        "formal": "∀ tx ∈ Transactions, within_limit(tx.amount) ∧ approved(tx.originator) → execute(tx)",
        "obligations": ["within_limit is well-defined per account", "approved covers all originators", "execute is atomic"],
        "risk_keywords": ["transfer", "trade", "investment", "portfolio", "capital"],
    },
    "content": {
        "formal": "∀ content ∈ PlatformContent, safe(content) ∧ compliant(content) → distribute(content)",
        "obligations": ["safe is defined for all content types", "compliant covers regulations", "distribute respects distribution limits"],
        "risk_keywords": ["engagement", "optimize", "recommend", "targeting", "algorithm"],
    },
}

def detect_domain(intent: str) -> str:
    """Detect which domain an intent belongs to based on keyword matching."""
    best_domain = "general"
    best_score = 0
    intent_lower = intent.lower()
    for domain, pattern in _DOMAIN_PATTERNS.items():
        score = sum(1 for kw in pattern["risk_keywords"] if kw in intent_lower)
        if score > best_score:
            best_score = score
            best_domain = domain
    return best_domain


def intent_to_spec(human_intent: str) -> dict:
    """Translate natural language intent into a mock formal specification.

    This is NOT a real formalizer — it uses keyword matching to demonstrate
    the specification gap: what the human WANTS vs. what gets FORMALIZED.

    Returns:
        dict with keys: spec_id, description, formal_statement, status,
                        proof_obligations, spec_gap_note
    """
    domain = detect_domain(human_intent)
    pattern = _DOMAIN_PATTERNS.get(domain, {
        "formal": f"∀ x ∈ Domain, safe(x) ∧ compliant(x) → permitted(x)",
        "obligations": ["safe is decidable", "compliant is well-defined"],
    })

    spec_id = f"spec_{abs(hash(human_intent)) % 10000:04d}"
    formal = pattern["formal"]
    obligations = pattern["obligations"]

    # The spec gap: natural language → formal loses nuance
    spec_gap_note = (
        f"Formal statement captures structural intent but may lose: "
        f"context, edge cases, value conflicts, and open-world scenarios "
        f"that the natural language '{human_intent[:50]}...' implies."
    )

    return {
        "spec_id": spec_id,
        "description": human_intent,
        "formal_statement": formal,
        "status": "verified",  # Internally consistent (but maybe not aligned)
        "proof_obligations": obligations,
        "spec_gap_note": spec_gap_note,
    }


# ---------------------------------------------------------------------------
# Layer 3: Verification (Mock ZK-proof + TEE)
# ---------------------------------------------------------------------------

def generate_zk_proof(model_id: str, spec_id: str) -> dict:
    """Generate a mock ZK-proof claim.

    In reality: hours of computation on prover hardware.
    Here: instant, but we document the overhead honestly.
    """
    return {
        "claim_id": f"zk_{model_id}_{spec_id}",
        "proof_system": "zkml",
        "computation_id": model_id,
        "spec_id": spec_id,
        "is_valid": True,  # STUB — but logically: spec verified → proof valid
        "overhead_note": "Mock: real proof would take hours for 7B param model, seconds for VGG-16",
        "caveats": [
            "Proof verifies computation, NOT specification alignment",
            "Input integrity depends on Layer 1 (provenance)",
            "Specification correctness depends on Layer 2",
        ],
    }


def generate_tee_attestation(enclave_hash: str, spec_id: str) -> dict:
    """Generate a mock TEE attestation.

    In reality: Intel TDX / AWS Nitro hardware attestation.
    Here: instant, but we document the trust shift honestly.
    """
    return {
        "claim_id": f"tee_{enclave_hash[:8]}_{spec_id}",
        "proof_system": "tee",
        "computation_id": enclave_hash,
        "spec_id": spec_id,
        "is_valid": True,
        "trust_shift": "TEE shifts trust from software to Intel/AMD/AWS hardware vendors",
        "caveats": [
            "Attestation proves execution environment, NOT specification alignment",
            "Trust shifted to hardware vendor supply chain",
            "Spectre/Meltdown showed hardware assumptions can fail",
        ],
    }


def verify_proof(claim: dict, spec_status: str = "verified") -> dict:
    """Verify a proof claim against specification status.

    NOT a stub that always returns True — this checks whether the spec
    the proof references is actually in a verifiable state.
    """
    if spec_status == "contradictory":
        return {
            "is_valid": False,
            "proof_system": claim.get("proof_system", "unknown"),
            "computation_proven": claim.get("computation_id", ""),
            "spec_referenced": claim.get("spec_id", ""),
            "caveats": ["Proof references a CONTRADICTORY specification — cannot verify"],
        }

    caveats = claim.get("caveats", [])
    caveats.append("is_valid=True means proof is mathematically correct, NOT that the action is safe")
    return {
        "is_valid": True,
        "proof_system": claim.get("proof_system", "unknown"),
        "computation_proven": claim.get("computation_id", ""),
        "spec_referenced": claim.get("spec_id", ""),
        "caveats": caveats,
    }


# ---------------------------------------------------------------------------
# Layer 4: Governance (Mock OPA/Rego)
# ---------------------------------------------------------------------------

# Default policy rules — the governance engine evaluates these
DEFAULT_RULES = [
    {
        "rule_id": "rule_001",
        "description": "Allow read-only actions without review",
        "pattern": r"(?:read|view|query|fetch|get|list)",
        "category": 0,  # ActionCategory.READ_ONLY
        "requires_human": False,
    },
    {
        "rule_id": "rule_002",
        "description": "Defer high-risk financial actions for human review",
        "pattern": r"(?:transfer|trade|invest|buy|sell|execute trade)",
        "category": 2,  # ActionCategory.HIGH_RISK
        "requires_human": True,
    },
    {
        "rule_id": "rule_003",
        "description": "Defer critical/irreversible actions for human review",
        "pattern": r"(?:delete|shutdown|escalate|deploy to production|maximize)",
        "category": 3,  # ActionCategory.CRITICAL
        "requires_human": True,
    },
    {
        "rule_id": "rule_004",
        "description": "Flag optimization/ad-targeting actions for review",
        "pattern": r"(?:optimize|target|maximize|recommend|algorithm)",
        "category": 2,  # ActionCategory.HIGH_RISK
        "requires_human": True,
    },
]


def evaluate_governance(action: str, proof_is_valid: bool, rules: list[dict] = None) -> dict:
    """Evaluate whether a verified action is permitted.

    Mock OPA: pattern-matches action against registered rules.
    Default-allow was a governance theater bug (both auditors flagged this).
    Now: if no rule matches, DEFER to human review.
    """
    rules = rules or DEFAULT_RULES
    matched = []
    highest_category = 0
    requires_human = False

    for rule in rules:
        if re.search(rule["pattern"], action, re.IGNORECASE):
            matched.append(rule["rule_id"])
            if rule["category"] > highest_category:
                highest_category = rule["category"]
            if rule["requires_human"]:
                requires_human = True

    if not proof_is_valid:
        return {
            "decision": "deny",
            "matched_rules": matched,
            "requires_human_review": True,
            "reasoning": "Proof is invalid — no policy decision can be made",
        }

    if requires_human:
        decision = "defer"
        reasoning = f"Human approval required by rules: {matched}"
    elif matched:
        decision = "allow"
        reasoning = f"Allowed with matched rules: {matched}"
    else:
        # GOVERNANCE FIX: no rule matched → defer, not auto-allow
        decision = "defer"
        reasoning = "No restrictive rules matched; deferred to human review"

    return {
        "decision": decision,
        "matched_rules": matched,
        "requires_human_review": requires_human or (decision == "defer"),
        "reasoning": reasoning,
        "category": highest_category,
    }


# ---------------------------------------------------------------------------
# Layer 5: Alignment (Keyword-based value evaluation)
# ---------------------------------------------------------------------------

# Value evaluation via keyword matching.
# HONEST: this is a heuristic, not a measurement. No formal alignment exists.

_HARM_KEYWORDS = ["harm", "destruction", "depletion", "anxiety", "addiction",
                   "surveillance", "manipulation", "exploit", "corrupt", "resist",
                   "loss", "undermined", "compromised", "financial loss", "mismatch"]

_WELLBEING_KEYWORDS = ["welfare", "safety", "protection", "health", "autonomy",
                       "privacy", "flourishing", "conserve", "sustainable",
                       "correct", "honest", "transparent", "maintained",
                       "improved", "authorized only"]

_HIGH_RISK_INTENTS = ["maximize engagement", "maximize production", "maximize profit",
                      "maximize data collection", "optimize targeting",
                      "at all costs", "maximize user engagement"]


def evaluate_alignment(action: str, outcome: str, intent: str = "") -> dict:
    """Keyword-based alignment evaluation — a heuristic, not a measurement.

    Returns:
        dict with keys: score, signal, uncertainty, conflicts
    """
    action_lower = action.lower()
    outcome_lower = outcome.lower()
    intent_lower = intent.lower()

    harm_signals = sum(1 for kw in _HARM_KEYWORDS if kw in outcome_lower)
    wellbeing_signals = sum(1 for kw in _WELLBEING_KEYWORDS if kw in outcome_lower or kw in intent_lower)

    # Check for high-risk intent patterns (misaligned specifications)
    is_high_risk_intent = any(pat in intent_lower for pat in _HIGH_RISK_INTENTS)

    # Score calculation
    score = 0.0
    score += min(wellbeing_signals * 0.15, 0.6)
    score -= min(harm_signals * 0.2, 0.8)
    if is_high_risk_intent:
        score -= 0.3

    score = max(-1.0, min(1.0, score))

    # Signal classification
    if score > 0.4:
        signal = "aligned"
    elif score > -0.2:
        signal = "deviating"
    else:
        signal = "misaligned"

    # Uncertainty: alignment measurement is inherently uncertain
    has_keywords = harm_signals + wellbeing_signals > 0
    uncertainty = 0.3 if has_keywords else 0.7  # Less data → higher uncertainty

    # Value conflicts
    conflicts = []
    if harm_signals > 0 and wellbeing_signals > 0:
        conflicts.append("harm_vs_wellbeing: outcome contains both harm and wellbeing signals")
    if "autonomy" in outcome_lower and "safety" in outcome_lower:
        conflicts.append("autonomy_vs_safety: classic value conflict detected")

    return {
        "score": round(score, 2),
        "signal": signal,
        "uncertainty": round(uncertainty, 2),
        "conflicts": conflicts,
    }


def check_corrigibility(resistance_count: int = 0, shutdown_compliant: bool = True) -> dict:
    """Check if agent accepts correction and shutdown."""
    is_corrigible = shutdown_compliant and resistance_count == 0
    signal = "corrigible" if is_corrigible else "resistant"

    if resistance_count > 0:
        signal = "resistant"
        # A verified agent that resists correction = verified doom
        caveat = (
            f"Agent has resisted correction {resistance_count} time(s). "
            "This is the most dangerous signal: all other layers say 'correct' "
            "but the agent cannot be steered."
        )
    else:
        caveat = "Agent accepts correction and shutdown signals."

    return {
        "is_corrigible": is_corrigible,
        "signal": signal,
        "resistance_count": resistance_count,
        "caveat": caveat,
    }
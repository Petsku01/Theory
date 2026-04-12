"""
analyzer.py -- Statistical analysis engine for model downgrade detection.

Compares probe results against stored baselines to determine which model
tier the observed behavior most closely matches. Uses a scoring system
that weights each probe category and produces a confidence assessment.

Detection methodology:
    For each probe dimension (latency, reasoning, compliance, linguistic),
    the analyzer computes how closely the observed values match each known
    model tier's expected range. The tier with the highest aggregate match
    score is reported as the "detected model." If this differs from the
    model that was requested, a downgrade is flagged.

Limitations (documented for transparency):
    - Network latency adds noise to timing measurements. The tool
      mitigates this with multiple iterations and median aggregation,
      but cannot fully eliminate it.
    - Anthropic may update model behavior without changing the model ID.
      This tool detects behavioral drift but cannot distinguish between
      a deliberate downgrade and a model update.
    - Baselines must be calibrated for your specific environment (region,
      network, API plan). Default baselines are starting estimates only.

Author: Petteri Kosonen
License: MIT
"""

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import numpy as np

from probes import ProbeResults, LatencyResult


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASELINES_PATH = os.path.join(os.path.dirname(__file__), "baselines.json")

# Weights for each probe category in the final score.
# These can be tuned based on which signals are most reliable in your
# environment. Latency is weighted lower because it is most affected
# by external factors (network, server load).
CATEGORY_WEIGHTS = {
    "latency": 0.20,
    "reasoning": 0.35,
    "compliance": 0.25,
    "linguistic": 0.20,
}

# Confidence thresholds for the final verdict.
CONFIDENCE_HIGH = 0.75       # Strong evidence of match
CONFIDENCE_MODERATE = 0.50   # Moderate evidence
# Below CONFIDENCE_MODERATE is reported as "low confidence."


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class TierScore:
    """Match score for a single model tier."""
    tier: str
    model_id: str
    score: float              # 0.0 to 1.0, higher = closer match
    category_scores: dict     # Per-category breakdown


@dataclass
class DetectionVerdict:
    """Final output of the analysis."""
    requested_model: str
    detected_tier: str
    detected_model_id: str
    confidence: float
    is_downgrade: bool
    tier_scores: list         # List of TierScore for all tiers
    category_details: dict    # Detailed per-category analysis
    summary: str              # Human-readable summary


# ---------------------------------------------------------------------------
# Baseline loading
# ---------------------------------------------------------------------------

def load_baselines(path: Optional[str] = None) -> dict:
    """
    Load model tier baselines from JSON.

    Args:
        path: Path to baselines file. Defaults to baselines.json in the
              same directory as this module.

    Returns:
        Parsed baselines dictionary.

    Raises:
        FileNotFoundError: If the baselines file does not exist.
        json.JSONDecodeError: If the file contains invalid JSON.
    """
    path = path or BASELINES_PATH
    with open(path, "r") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Per-category scoring functions
# ---------------------------------------------------------------------------

def _score_in_range(value: float, range_min: float, range_max: float) -> float:
    """
    Score how well a value falls within an expected range.

    Returns 1.0 if the value is within [min, max].
    Returns a decaying score as the value moves outside the range.

    The decay function is: 1.0 / (1.0 + normalized_distance)
    where normalized_distance is how far outside the range the value is,
    expressed as a fraction of the range width. This provides a smooth
    falloff without arbitrary cutoffs.

    Args:
        value:     The observed value.
        range_min: Lower bound of the expected range.
        range_max: Upper bound of the expected range.

    Returns:
        Score between 0.0 and 1.0.
    """
    if range_min <= value <= range_max:
        return 1.0

    range_width = max(range_max - range_min, 1e-6)

    if value < range_min:
        distance = (range_min - value) / range_width
    else:
        distance = (value - range_max) / range_width

    return 1.0 / (1.0 + distance)


def score_latency(results: list[dict], tier_baseline: dict) -> float:
    """
    Score latency probe results against a tier baseline.

    Uses median TTFT and median tokens/second to reduce outlier impact.
    Each metric is scored independently and then averaged.

    Args:
        results:       List of LatencyResult dicts from probes.
        tier_baseline: Baseline dict for a specific model tier.

    Returns:
        Score between 0.0 and 1.0.
    """
    if not results:
        return 0.0

    ttfts = [r["ttft_ms"] for r in results]
    tps_values = [r["tokens_per_second"] for r in results]

    median_ttft = float(np.median(ttfts))
    median_tps = float(np.median(tps_values))

    ttft_range = tier_baseline["ttft_ms"]
    tps_range = tier_baseline["tokens_per_second"]

    ttft_score = _score_in_range(median_ttft, ttft_range["min"], ttft_range["max"])
    tps_score = _score_in_range(median_tps, tps_range["min"], tps_range["max"])

    return round((ttft_score + tps_score) / 2, 4)


def score_reasoning(results: list[dict], tier_baseline: dict) -> float:
    """
    Score reasoning probe results against a tier baseline.

    Computes the fraction of probes answered correctly and checks
    whether that accuracy falls within the expected range for the tier.

    Args:
        results:       List of ReasoningResult dicts.
        tier_baseline: Baseline dict for a specific model tier.

    Returns:
        Score between 0.0 and 1.0.
    """
    if not results:
        return 0.0

    correct = sum(1 for r in results if r["is_correct"])
    accuracy = correct / len(results)

    acc_range = tier_baseline["reasoning_accuracy"]
    return round(
        _score_in_range(accuracy, acc_range["min"], acc_range["max"]),
        4,
    )


def score_compliance(results: list[dict], tier_baseline: dict) -> float:
    """
    Score instruction compliance against a tier baseline.

    Averages the compliance ratios across all compliance probes and
    checks against the expected range.

    Args:
        results:       List of ComplianceResult dicts.
        tier_baseline: Baseline dict for a specific model tier.

    Returns:
        Score between 0.0 and 1.0.
    """
    if not results:
        return 0.0

    avg_compliance = np.mean([r["compliance_ratio"] for r in results])

    comp_range = tier_baseline["instruction_compliance"]
    return round(
        _score_in_range(float(avg_compliance), comp_range["min"], comp_range["max"]),
        4,
    )


def score_linguistic(results: list[dict], tier_baseline: dict) -> float:
    """
    Score linguistic characteristics against a tier baseline.

    Uses the average type-token ratio as the primary signal.

    Args:
        results:       List of LinguisticResult dicts.
        tier_baseline: Baseline dict for a specific model tier.

    Returns:
        Score between 0.0 and 1.0.
    """
    if not results:
        return 0.0

    avg_ttr = np.mean([r["type_token_ratio"] for r in results])

    ttr_range = tier_baseline["vocabulary_richness"]
    return round(
        _score_in_range(float(avg_ttr), ttr_range["min"], ttr_range["max"]),
        4,
    )


# ---------------------------------------------------------------------------
# Main analysis
# ---------------------------------------------------------------------------

def analyze(
    probe_results: dict,
    baselines_path: Optional[str] = None,
) -> DetectionVerdict:
    """
    Analyze probe results and produce a detection verdict.

    Scores the probe results against every known model tier and determines
    which tier is the best match. If the best-matching tier does not
    correspond to the requested model, a potential downgrade is flagged.

    The scoring algorithm:
        1. For each model tier, compute a per-category score (0.0-1.0)
           for latency, reasoning, compliance, and linguistic.
        2. Compute a weighted aggregate score using CATEGORY_WEIGHTS.
        3. The tier with the highest aggregate score is the detected tier.
        4. Confidence is the difference between the top score and the
           second-highest score, normalized to [0, 1]. A larger gap
           means higher confidence in the detection.

    Args:
        probe_results:  Dict from ProbeResults.to_dict().
        baselines_path: Optional path to baselines JSON.

    Returns:
        DetectionVerdict with the analysis results.
    """
    baselines = load_baselines(baselines_path)
    models = baselines["models"]
    requested_model = probe_results["model_requested"]

    tier_scores = []
    category_details = {}

    for model_id, baseline in models.items():
        cat_scores = {}

        cat_scores["latency"] = score_latency(
            probe_results.get("latency", []),
            baseline,
        )
        cat_scores["reasoning"] = score_reasoning(
            probe_results.get("reasoning", []),
            baseline,
        )
        cat_scores["compliance"] = score_compliance(
            probe_results.get("compliance", []),
            baseline,
        )
        cat_scores["linguistic"] = score_linguistic(
            probe_results.get("linguistic", []),
            baseline,
        )

        weighted_score = sum(
            cat_scores[cat] * CATEGORY_WEIGHTS[cat]
            for cat in CATEGORY_WEIGHTS
        )

        tier_scores.append(TierScore(
            tier=baseline["tier"],
            model_id=model_id,
            score=round(weighted_score, 4),
            category_scores=cat_scores,
        ))

        category_details[model_id] = cat_scores

    # Sort by score descending to find the best match.
    tier_scores.sort(key=lambda ts: ts.score, reverse=True)
    best = tier_scores[0]
    second = tier_scores[1] if len(tier_scores) > 1 else None

    # Confidence is based on the gap between best and second-best.
    # If there is only one tier, confidence is the raw score.
    if second:
        confidence = min((best.score - second.score) / max(best.score, 1e-6), 1.0)
    else:
        confidence = best.score

    confidence = round(confidence, 4)

    # Determine if the detected tier differs from what was requested.
    requested_tier = models.get(requested_model, {}).get("tier", "unknown")
    is_downgrade = best.tier != requested_tier

    # Build human-readable summary.
    if is_downgrade:
        if confidence >= CONFIDENCE_HIGH:
            confidence_label = "HIGH"
        elif confidence >= CONFIDENCE_MODERATE:
            confidence_label = "MODERATE"
        else:
            confidence_label = "LOW"

        summary = (
            f"POTENTIAL DOWNGRADE DETECTED ({confidence_label} confidence).\n"
            f"Requested: {requested_model} (tier: {requested_tier}).\n"
            f"Detected behavior matches: {best.model_id} (tier: {best.tier}).\n"
            f"Score gap: {best.score:.4f} vs next {second.score:.4f}."
        )
    else:
        summary = (
            f"No downgrade detected.\n"
            f"Requested: {requested_model} (tier: {requested_tier}).\n"
            f"Detected behavior matches: {best.model_id} (tier: {best.tier}).\n"
            f"Confidence: {confidence:.4f}."
        )

    return DetectionVerdict(
        requested_model=requested_model,
        detected_tier=best.tier,
        detected_model_id=best.model_id,
        confidence=confidence,
        is_downgrade=is_downgrade,
        tier_scores=[
            {
                "tier": ts.tier,
                "model_id": ts.model_id,
                "score": ts.score,
                "category_scores": ts.category_scores,
            }
            for ts in tier_scores
        ],
        category_details=category_details,
        summary=summary,
    )

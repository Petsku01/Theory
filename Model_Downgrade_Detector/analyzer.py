"""
analyzer.py -- Statistical analysis engine for model downgrade detection.

Compares probe results against stored baselines to determine which model
tier the observed behavior most closely matches. Uses a scoring system
that weights each probe category and produces a match assessment.

Detection methodology:
    For each probe dimension (latency, reasoning, compliance, linguistic),
    the analyzer computes how closely the observed values match each known
    model tier's expected range. The tier with the highest aggregate match
    score is reported as the "detected model." If this differs from the
    model that was requested, a tier mismatch is flagged.

Limitations (documented for transparency):
    - Network latency adds noise to timing measurements. The tool
      mitigates this with multiple iterations and median aggregation,
      but cannot fully eliminate it.
    - Anthropic may update model behavior without changing the model ID.
      This tool detects behavioral drift but cannot distinguish between
      a deliberate downgrade and a model update.
    - Baselines must be calibrated for your specific environment (region,
      network, API plan). Default baselines are UNCALIBRATED PLACEHOLDERS.
    - The "match_strength" metric is a heuristic score gap, not a
      statistical confidence measure (no p-value or confidence interval).

Author: Petteri Kosonen
License: MIT
"""

import json
import os
from dataclasses import dataclass

import numpy as np


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASELINES_PATH = os.path.join(os.path.dirname(__file__), "baselines.json")

# Weights for each probe category in the final score.
# These can be tuned based on which signals are most reliable in your
# environment. Latency is weighted lower because it is most affected
# by external factors (network, server load).
DEFAULT_CATEGORY_WEIGHTS = {
    "latency": 0.20,
    "reasoning": 0.35,
    "compliance": 0.25,
    "linguistic": 0.20,
}

# Match strength thresholds for the final verdict.
STRENGTH_HIGH = 0.75       # Strong evidence of match
STRENGTH_MODERATE = 0.50   # Moderate evidence
# Below STRENGTH_MODERATE is reported as "weak."


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
    match_strength: float
    is_tier_mismatch: bool
    tier_scores: list         # List of TierScore for all tiers
    category_details: dict    # Detailed per-category analysis
    summary: str              # Human-readable summary


# ---------------------------------------------------------------------------
# Baseline loading
# ---------------------------------------------------------------------------

def load_baselines(path: str | None = None) -> dict:
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

def _score_in_range(
    value: float,
    range_min: float,
    range_max: float,
    typical: float,
) -> float:
    """
    Score how well a value matches a tier's expected range and typical value.

    Uses a two-part scoring approach:
        1. Range membership (50% of score): 1.0 if inside [min, max],
           decaying outside.
        2. Proximity to typical (50% of score): Gaussian-like decay
           based on distance from the typical value.

    This design addresses the overlapping-range problem: if a value
    falls in the overlap zone of two tiers, the tier whose typical
    value is closer will score higher. Pure range-membership scoring
    cannot differentiate in overlap zones.

    Args:
        value:     The observed value.
        range_min: Lower bound of the expected range.
        range_max: Upper bound of the expected range.
        typical:   The most common/expected value for this tier.

    Returns:
        Score between 0.0 and 1.0.
    """
    # Part 1: Range membership.
    range_width = max(range_max - range_min, 1e-6)

    if range_min <= value <= range_max:
        range_score = 1.0
    elif value < range_min:
        distance = (range_min - value) / range_width
        range_score = 1.0 / (1.0 + distance)
    else:
        distance = (value - range_max) / range_width
        range_score = 1.0 / (1.0 + distance)

    # Part 2: Proximity to typical value.
    # Uses a Gaussian-like decay with sigma = half the range width.
    # This sigma choice means that a value at the range boundary
    # (distance = range_width/2 from center) scores exp(-0.5) ~ 0.607,
    # and a value one full range_width away from typical scores
    # exp(-2.0) ~ 0.135. The choice is a pragmatic trade-off:
    # smaller sigma would over-penalize values near range edges,
    # larger sigma would fail to differentiate between tiers.
    # There is no theoretical optimum -- this should be tuned
    # empirically after calibration runs.
    sigma = range_width / 2.0
    typical_distance = abs(value - typical)
    typical_score = float(np.exp(-(typical_distance ** 2) / (2 * sigma ** 2)))

    return round((range_score + typical_score) / 2.0, 4)


def score_latency(results: list[dict], tier_baseline: dict) -> float:
    """
    Score latency probe results against a tier baseline.

    Uses median TTFT and median words/second to reduce outlier impact.
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
    wps_values = [r["words_per_second"] for r in results]

    median_ttft = float(np.median(ttfts))
    median_wps = float(np.median(wps_values))

    ttft_bl = tier_baseline["ttft_ms"]
    wps_bl = tier_baseline["words_per_second"]

    ttft_score = _score_in_range(
        median_ttft, ttft_bl["min"], ttft_bl["max"], ttft_bl["typical"],
    )
    wps_score = _score_in_range(
        median_wps, wps_bl["min"], wps_bl["max"], wps_bl["typical"],
    )

    return round((ttft_score + wps_score) / 2, 4)


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

    acc_bl = tier_baseline["reasoning_accuracy"]
    return round(
        _score_in_range(accuracy, acc_bl["min"], acc_bl["max"], acc_bl["typical"]),
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

    comp_bl = tier_baseline["instruction_compliance"]
    return round(
        _score_in_range(
            float(avg_compliance),
            comp_bl["min"], comp_bl["max"], comp_bl["typical"],
        ),
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

    ttr_bl = tier_baseline["vocabulary_richness"]
    return round(
        _score_in_range(
            float(avg_ttr),
            ttr_bl["min"], ttr_bl["max"], ttr_bl["typical"],
        ),
        4,
    )


# ---------------------------------------------------------------------------
# Weight redistribution for skipped probes
# ---------------------------------------------------------------------------

def _compute_active_weights(probe_results: dict) -> dict:
    """
    Redistribute category weights to exclude skipped probe categories.

    If a probe category has no results (was skipped), its weight is
    redistributed proportionally to the remaining active categories.
    This prevents skipped probes from dragging all tier scores down
    equally and distorting the comparison.

    Args:
        probe_results: Dict from ProbeResults.to_dict().

    Returns:
        Dict of category -> weight, summing to 1.0, excluding skipped
        categories.
    """
    category_to_key = {
        "latency": "latency",
        "reasoning": "reasoning",
        "compliance": "compliance",
        "linguistic": "linguistic",
    }

    active = {}
    for cat, results_key in category_to_key.items():
        if probe_results.get(results_key):
            active[cat] = DEFAULT_CATEGORY_WEIGHTS[cat]

    if not active:
        return DEFAULT_CATEGORY_WEIGHTS.copy()

    # Normalize weights to sum to 1.0.
    total = sum(active.values())
    return {cat: round(w / total, 4) for cat, w in active.items()}


# ---------------------------------------------------------------------------
# Main analysis
# ---------------------------------------------------------------------------

def analyze(
    probe_results: dict,
    baselines_path: str | None = None,
) -> DetectionVerdict:
    """
    Analyze probe results and produce a detection verdict.

    Scores the probe results against every known model tier and determines
    which tier is the best match. If the best-matching tier does not
    correspond to the requested model, a potential tier mismatch is flagged.

    The scoring algorithm:
        1. Determine which probe categories have results (were not skipped)
           and redistribute weights accordingly.
        2. For each model tier, compute a per-category score (0.0-1.0)
           for each active category.
        3. Compute a weighted aggregate score.
        4. The tier with the highest aggregate score is the detected tier.
        5. Match strength is the normalized gap between the top score
           and the second-highest score. This is a HEURISTIC, not a
           statistical confidence measure.

    Args:
        probe_results:  Dict from ProbeResults.to_dict().
        baselines_path: Optional path to baselines JSON.

    Returns:
        DetectionVerdict with the analysis results.
    """
    baselines = load_baselines(baselines_path)
    models = baselines["models"]
    requested_model = probe_results["model_requested"]

    active_weights = _compute_active_weights(probe_results)

    tier_scores = []
    category_details = {}

    for model_id, baseline in models.items():
        cat_scores = {}

        if "latency" in active_weights:
            cat_scores["latency"] = score_latency(
                probe_results.get("latency", []),
                baseline,
            )
        if "reasoning" in active_weights:
            cat_scores["reasoning"] = score_reasoning(
                probe_results.get("reasoning", []),
                baseline,
            )
        if "compliance" in active_weights:
            cat_scores["compliance"] = score_compliance(
                probe_results.get("compliance", []),
                baseline,
            )
        if "linguistic" in active_weights:
            cat_scores["linguistic"] = score_linguistic(
                probe_results.get("linguistic", []),
                baseline,
            )

        weighted_score = sum(
            cat_scores.get(cat, 0.0) * active_weights.get(cat, 0.0)
            for cat in active_weights
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

    # Match strength is the normalized gap between best and second-best.
    # This is a heuristic score gap, NOT a statistical confidence measure.
    # A larger gap means the best tier is more clearly differentiated.
    if second:
        match_strength = min(
            (best.score - second.score) / max(best.score, 1e-6),
            1.0,
        )
    else:
        match_strength = best.score

    match_strength = round(match_strength, 4)

    # Determine if the detected tier differs from what was requested.
    requested_tier = models.get(requested_model, {}).get("tier", "unknown")
    is_tier_mismatch = best.tier != requested_tier

    # Build human-readable summary.
    if is_tier_mismatch:
        if match_strength >= STRENGTH_HIGH:
            strength_label = "HIGH"
        elif match_strength >= STRENGTH_MODERATE:
            strength_label = "MODERATE"
        else:
            strength_label = "WEAK"

        summary = (
            f"TIER MISMATCH DETECTED (match strength: {strength_label}).\n"
            f"Requested: {requested_model} (tier: {requested_tier}).\n"
            f"Detected behavior matches: {best.model_id} (tier: {best.tier}).\n"
            f"Score gap: {best.score:.4f} vs next {second.score:.4f}."
        )

        if requested_tier == "unknown":
            summary += (
                f"\nNote: requested model '{requested_model}' is not in "
                f"baselines.json. Add it or use a known model ID."
            )
    else:
        summary = (
            f"No tier mismatch detected.\n"
            f"Requested: {requested_model} (tier: {requested_tier}).\n"
            f"Detected behavior matches: {best.model_id} (tier: {best.tier}).\n"
            f"Match strength: {match_strength:.4f}."
        )

    return DetectionVerdict(
        requested_model=requested_model,
        detected_tier=best.tier,
        detected_model_id=best.model_id,
        match_strength=match_strength,
        is_tier_mismatch=is_tier_mismatch,
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

#!/usr/bin/env python3
"""
run_detection.py -- CLI entry point for the Claude Model Downgrade Detector.

This tool runs a battery of behavioral probes against a specified Claude
model and compares the results to known baselines for each model tier
(Opus, Sonnet, Haiku). If the observed behavior does not match the
requested model tier, a potential downgrade is flagged.

Usage:
    # Basic detection run against Opus
    python run_detection.py --model claude-opus-4-6

    # Run with more latency iterations for better statistical confidence
    python run_detection.py --model claude-opus-4-6 --latency-iterations 5

    # Save results to a specific file for historical tracking
    python run_detection.py --model claude-opus-4-6 --output results/run_001.json

    # Calibration mode: run against a known model to update baselines
    python run_detection.py --model claude-haiku-4-5-20251001 --calibrate

    # Skip specific probe categories
    python run_detection.py --model claude-opus-4-6 --skip-latency

Environment:
    ANTHROPIC_API_KEY must be set. The tool uses the Anthropic Python SDK
    to interact with the API.

Exit codes:
    0 -- No downgrade detected.
    1 -- Potential downgrade detected.
    2 -- Error during execution.

Author: Petteri Kosonen
License: MIT
"""

import argparse
import json
import os
import sys
import time
from dataclasses import asdict
from datetime import datetime, timezone

import anthropic

from probes import (
    ProbeResults,
    run_latency_probes,
    run_reasoning_probes,
    run_compliance_probes,
    run_linguistic_probes,
)
from analyzer import analyze


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def print_header(text: str) -> None:
    """Print a section header with visual separators."""
    width = 60
    print()
    print("=" * width)
    print(f"  {text}")
    print("=" * width)


def print_subheader(text: str) -> None:
    """Print a subsection header."""
    print(f"\n--- {text} ---")


def print_verdict(verdict) -> None:
    """
    Print the detection verdict in a structured, readable format.

    Args:
        verdict: DetectionVerdict object from the analyzer.
    """
    print_header("DETECTION VERDICT")

    if verdict.is_downgrade:
        print("\n  *** POTENTIAL DOWNGRADE DETECTED ***\n")
    else:
        print("\n  Model behavior is consistent with the requested tier.\n")

    print(f"  Requested model : {verdict.requested_model}")
    print(f"  Detected tier   : {verdict.detected_tier}")
    print(f"  Detected model  : {verdict.detected_model_id}")
    print(f"  Confidence      : {verdict.confidence:.2%}")

    print_subheader("Tier Match Scores")
    for ts in verdict.tier_scores:
        marker = " <-- best match" if ts["tier"] == verdict.detected_tier else ""
        print(f"  {ts['model_id']:30s}  {ts['score']:.4f}{marker}")

    print_subheader("Category Breakdown (per tier)")
    for model_id, cats in verdict.category_details.items():
        print(f"\n  {model_id}:")
        for cat, score in cats.items():
            bar = "#" * int(score * 20)
            print(f"    {cat:15s}  {score:.4f}  [{bar:20s}]")

    print_subheader("Summary")
    for line in verdict.summary.split("\n"):
        print(f"  {line}")
    print()


def print_probe_summary(results: dict) -> None:
    """
    Print a summary of raw probe results before analysis.

    Args:
        results: Dict from ProbeResults.to_dict().
    """
    print_header("PROBE RESULTS SUMMARY")

    # Latency
    latency = results.get("latency", [])
    if latency:
        print_subheader("Latency Probes")
        ttfts = [r["ttft_ms"] for r in latency]
        tps = [r["tokens_per_second"] for r in latency]
        print(f"  Samples          : {len(latency)}")
        print(f"  Median TTFT      : {sorted(ttfts)[len(ttfts)//2]:.0f} ms")
        print(f"  Min/Max TTFT     : {min(ttfts):.0f} / {max(ttfts):.0f} ms")
        print(f"  Median tokens/s  : {sorted(tps)[len(tps)//2]:.1f}")
        print(f"  Min/Max tokens/s : {min(tps):.1f} / {max(tps):.1f}")

    # Reasoning
    reasoning = results.get("reasoning", [])
    if reasoning:
        print_subheader("Reasoning Probes")
        correct = sum(1 for r in reasoning if r["is_correct"])
        print(f"  Total probes     : {len(reasoning)}")
        print(f"  Correct answers  : {correct}")
        print(f"  Accuracy         : {correct/len(reasoning):.0%}")
        for r in reasoning:
            status = "PASS" if r["is_correct"] else "FAIL"
            print(f"    [{status}] {r['probe_id']}: "
                  f"expected='{r['expected_answer']}', "
                  f"got='{r['model_answer']}'")

    # Compliance
    compliance = results.get("compliance", [])
    if compliance:
        print_subheader("Compliance Probes")
        for r in compliance:
            print(f"  {r['probe_id']}: "
                  f"{r['constraints_met']}/{r['constraints_total']} "
                  f"({r['compliance_ratio']:.0%})")
            if r["violations"]:
                for v in r["violations"]:
                    print(f"    - violation: {v}")

    # Linguistic
    linguistic = results.get("linguistic", [])
    if linguistic:
        print_subheader("Linguistic Probes")
        for r in linguistic:
            print(f"  {r['probe_id']}:")
            print(f"    Words          : {r['word_count']}")
            print(f"    Unique words   : {r['unique_words']}")
            print(f"    Type-token ratio: {r['type_token_ratio']:.4f}")
            print(f"    Avg sent length: {r['avg_sentence_length']:.1f}")


# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------

def run_probes(
    client: anthropic.Anthropic,
    model: str,
    latency_iterations: int = 2,
    skip_latency: bool = False,
    skip_reasoning: bool = False,
    skip_compliance: bool = False,
    skip_linguistic: bool = False,
) -> dict:
    """
    Execute all probe categories and return structured results.

    Args:
        client:             Authenticated Anthropic client.
        model:              Model identifier to test.
        latency_iterations: Number of iterations per latency prompt.
        skip_latency:       If True, skip latency probes.
        skip_reasoning:     If True, skip reasoning probes.
        skip_compliance:    If True, skip compliance probes.
        skip_linguistic:    If True, skip linguistic probes.

    Returns:
        Dict representation of ProbeResults.
    """
    results = ProbeResults(
        timestamp=datetime.now(timezone.utc).isoformat(),
        model_requested=model,
    )

    if not skip_latency:
        print("\n  Running latency probes...")
        latency_data = run_latency_probes(client, model, latency_iterations)
        results.latency = [asdict(r) for r in latency_data]
        print(f"  Completed: {len(latency_data)} measurements.")

    if not skip_reasoning:
        print("\n  Running reasoning probes...")
        reasoning_data = run_reasoning_probes(client, model)
        results.reasoning = [asdict(r) for r in reasoning_data]
        correct = sum(1 for r in reasoning_data if r.is_correct)
        print(f"  Completed: {correct}/{len(reasoning_data)} correct.")

    if not skip_compliance:
        print("\n  Running compliance probes...")
        compliance_data = run_compliance_probes(client, model)
        results.compliance = [asdict(r) for r in compliance_data]
        print(f"  Completed: {len(compliance_data)} probes.")

    if not skip_linguistic:
        print("\n  Running linguistic probes...")
        linguistic_data = run_linguistic_probes(client, model)
        results.linguistic = [asdict(r) for r in linguistic_data]
        print(f"  Completed: {len(linguistic_data)} samples.")

    return results.to_dict()


def save_results(results: dict, verdict_dict: dict, path: str) -> None:
    """
    Save probe results and verdict to a JSON file.

    Creates parent directories if they do not exist. The output file
    contains both raw probe data and the analysis verdict for
    reproducibility and historical comparison.

    Args:
        results:     Raw probe results dict.
        verdict_dict: Serialized DetectionVerdict.
        path:        Output file path.
    """
    output = {
        "probe_results": results,
        "verdict": verdict_dict,
    }

    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    with open(path, "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"\n  Results saved to: {path}")


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Claude Model Downgrade Detector. "
            "Runs behavioral probes against a Claude model and checks "
            "for signs of silent model substitution."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python run_detection.py --model claude-opus-4-6\n"
            "  python run_detection.py --model claude-opus-4-6 "
            "--latency-iterations 5\n"
            "  python run_detection.py --model claude-opus-4-6 --output "
            "results/run_001.json\n"
            "  python run_detection.py --model claude-sonnet-4-6 "
            "--skip-latency\n"
        ),
    )

    parser.add_argument(
        "--model",
        type=str,
        default="claude-opus-4-6",
        help=(
            "Model identifier to test. "
            "Default: claude-opus-4-6. "
            "Use the full model ID as shown in Anthropic documentation."
        ),
    )
    parser.add_argument(
        "--latency-iterations",
        type=int,
        default=2,
        help=(
            "Number of times to repeat each latency probe prompt. "
            "Higher values improve statistical reliability but increase "
            "API cost and runtime. Default: 2."
        ),
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help=(
            "Path to save results JSON. If not specified, results are "
            "saved to results/<timestamp>.json in the tool directory."
        ),
    )
    parser.add_argument(
        "--baselines",
        type=str,
        default=None,
        help="Path to custom baselines JSON file.",
    )
    parser.add_argument(
        "--skip-latency",
        action="store_true",
        help="Skip latency probes (useful if network conditions are unreliable).",
    )
    parser.add_argument(
        "--skip-reasoning",
        action="store_true",
        help="Skip reasoning probes.",
    )
    parser.add_argument(
        "--skip-compliance",
        action="store_true",
        help="Skip compliance probes.",
    )
    parser.add_argument(
        "--skip-linguistic",
        action="store_true",
        help="Skip linguistic probes.",
    )
    parser.add_argument(
        "--calibrate",
        action="store_true",
        help=(
            "Run in calibration mode. Prints raw results without "
            "analysis. Use this to collect baseline data for a known model."
        ),
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress output. Only print the final verdict.",
    )

    args = parser.parse_args()

    # Validate environment.
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable is not set.")
        print("Set it with: export ANTHROPIC_API_KEY='your-key-here'")
        sys.exit(2)

    client = anthropic.Anthropic(api_key=api_key)

    print_header("CLAUDE MODEL DOWNGRADE DETECTOR")
    print(f"  Target model     : {args.model}")
    print(f"  Latency iterations: {args.latency_iterations}")
    print(f"  Timestamp        : {datetime.now(timezone.utc).isoformat()}")

    skipped = []
    if args.skip_latency:
        skipped.append("latency")
    if args.skip_reasoning:
        skipped.append("reasoning")
    if args.skip_compliance:
        skipped.append("compliance")
    if args.skip_linguistic:
        skipped.append("linguistic")
    if skipped:
        print(f"  Skipped probes   : {', '.join(skipped)}")

    # Run probes.
    try:
        results = run_probes(
            client=client,
            model=args.model,
            latency_iterations=args.latency_iterations,
            skip_latency=args.skip_latency,
            skip_reasoning=args.skip_reasoning,
            skip_compliance=args.skip_compliance,
            skip_linguistic=args.skip_linguistic,
        )
    except anthropic.AuthenticationError:
        print("\nERROR: Invalid API key. Check your ANTHROPIC_API_KEY.")
        sys.exit(2)
    except anthropic.RateLimitError:
        print("\nERROR: Rate limited by the API. Wait and retry, or reduce "
              "latency iterations.")
        sys.exit(2)
    except anthropic.APIError as e:
        print(f"\nERROR: Anthropic API error: {e}")
        sys.exit(2)

    # Print raw results.
    print_probe_summary(results)

    if args.calibrate:
        print_header("CALIBRATION MODE")
        print("  Raw results printed above. Use these values to update")
        print("  baselines.json for this model tier.")
        # Save calibration data.
        output_path = args.output or os.path.join(
            os.path.dirname(__file__),
            "results",
            f"calibration_{args.model}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json",
        )
        save_results(results, {"mode": "calibration"}, output_path)
        sys.exit(0)

    # Analyze and produce verdict.
    verdict = analyze(results, args.baselines)
    print_verdict(verdict)

    # Save results.
    output_path = args.output or os.path.join(
        os.path.dirname(__file__),
        "results",
        f"detection_{args.model}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json",
    )
    verdict_dict = {
        "requested_model": verdict.requested_model,
        "detected_tier": verdict.detected_tier,
        "detected_model_id": verdict.detected_model_id,
        "confidence": verdict.confidence,
        "is_downgrade": verdict.is_downgrade,
        "tier_scores": verdict.tier_scores,
        "category_details": verdict.category_details,
        "summary": verdict.summary,
    }
    save_results(results, verdict_dict, output_path)

    # Exit code signals downgrade detection to CI/automation pipelines.
    sys.exit(1 if verdict.is_downgrade else 0)


if __name__ == "__main__":
    main()

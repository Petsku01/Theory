"""VTS CLI — run the Verifiable Trust Stack pipeline from command line.

Usage:
    python -m vts                    # Run all scenarios
    python -m vts --scenario honest  # Honest agent only
    python -m vts --scenario rogue   # Rogue/paperclip agent
    python -m vts --scenario orthogonal  # Orthogonal trust collapse
"""

import argparse
import sys

from .scenarios import run_honest, run_rogue, run_orthogonal_collapse, run_all


SCENARIOS = {
    "honest": run_honest,
    "rogue": run_rogue,
    "orthogonal": run_orthogonal_collapse,
    "all": lambda: run_all(),
}


def main():
    parser = argparse.ArgumentParser(
        description="Verifiable Trust Stack — end-to-end pipeline demo",
    )
    parser.add_argument(
        "--scenario", "-s",
        choices=list(SCENARIOS.keys()),
        default="all",
        help="Which scenario to run (default: all)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed layer/glue data",
    )
    args = parser.parse_args()

    if args.scenario == "all":
        results = run_all()
    else:
        results = [SCENARIOS[args.scenario]()]

    for result in results:
        print(result.summary())

        if args.verbose:
            print("\nDETAILED LAYER DATA:")
            for lr in result.layers:
                print(f"  {lr.layer}:")
                for k, v in lr.data.items():
                    # Truncate long values
                    val = str(v)
                    if len(val) > 120:
                        val = val[:117] + "..."
                    print(f"    {k}: {val}")
            print()

    doom_count = sum(1 for r in results if r.verified_doom)
    total = len(results)

    if total > 1:
        print(f"\n{'─' * 70}")
        print(f"SUMMARY: {total} scenarios, {doom_count} verified doom detected")
        if doom_count > 0:
            print("⚠ The system can produce correct proofs for wrong specifications.")
            print("  This is the core insight: verification ≠ alignment.")
        print(f"{'─' * 70}")


if __name__ == "__main__":
    main()
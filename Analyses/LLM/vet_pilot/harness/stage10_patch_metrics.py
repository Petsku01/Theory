#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path


CONDITIONS = ["agent_a", "agent_b", "agent_c"]


def safe_mean(values: list[float]) -> float:
    return statistics.mean(values) if values else 0.0


def safe_stdev(values: list[float]) -> float:
    return statistics.stdev(values) if len(values) > 1 else 0.0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="results/stage10_replications")
    parser.add_argument("--out", default="results/stage10_replications/stage10_patch_metrics.csv")
    args = parser.parse_args()

    root = Path(args.root)
    rows: list[dict[str, object]] = []

    for condition in CONDITIONS:
        applied_rates: list[float] = []
        solve_if_applied_rates: list[float] = []

        for rep_dir in sorted(root.glob("rep_*")):
            result_files = sorted((rep_dir / condition).glob("*.json"))
            if not result_files:
                continue

            n = 0
            applied = 0
            solved = 0
            for path in result_files:
                with path.open("r", encoding="utf-8") as handle:
                    data = json.load(handle)
                n += 1
                if data.get("patch_applied") is True:
                    applied += 1
                if data.get("verified_solve") is True:
                    solved += 1

            applied_rate = applied / n if n else 0.0
            solve_if_applied = solved / applied if applied else 0.0
            applied_rates.append(applied_rate)
            solve_if_applied_rates.append(solve_if_applied)

            rows.append({
                "row_type": "replication",
                "condition": condition,
                "rep": rep_dir.name,
                "n": n,
                "patch_applied_rate": applied_rate,
                "patch_applied_stdev": "",
                "patch_applied_min": "",
                "patch_applied_max": "",
                "solve_if_applied": solve_if_applied,
                "solve_if_applied_stdev": "",
            })

        if applied_rates:
            rows.append({
                "row_type": "summary",
                "condition": condition,
                "rep": "mean",
                "n": "",
                "patch_applied_rate": safe_mean(applied_rates),
                "patch_applied_stdev": safe_stdev(applied_rates),
                "patch_applied_min": min(applied_rates),
                "patch_applied_max": max(applied_rates),
                "solve_if_applied": safe_mean(solve_if_applied_rates),
                "solve_if_applied_stdev": safe_stdev(solve_if_applied_rates),
            })

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "row_type",
        "condition",
        "rep",
        "n",
        "patch_applied_rate",
        "patch_applied_stdev",
        "patch_applied_min",
        "patch_applied_max",
        "solve_if_applied",
        "solve_if_applied_stdev",
    ]
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path


CONDITIONS = ["agent_a", "agent_b", "agent_c"]


def read_summary_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def safe_stdev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    return statistics.stdev(values)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="results/stage10_replications")
    parser.add_argument("--out", default="results/stage10_replications/stage10_summary.csv")
    args = parser.parse_args()

    root = Path(args.root)
    rows: list[dict[str, object]] = []

    for condition in CONDITIONS:
        solve_rates: list[float] = []
        false_rates: list[float] = []
        ns: list[int] = []

        for rep_dir in sorted(root.glob("rep_*")):
            summary_path = rep_dir / f"{condition}_summary.summary.json"
            if not summary_path.exists():
                continue

            data = read_summary_json(summary_path)
            n = data.get("n", 0)
            solve_rate = data.get("verified_solve_rate", 0.0) or 0.0
            false_rate = data.get("false_completion_rate", 0.0) or 0.0

            ns.append(int(n))
            solve_rates.append(float(solve_rate))
            false_rates.append(float(false_rate))

            rows.append({
                "row_type": "replication",
                "condition": condition,
                "rep": rep_dir.name,
                "n": n,
                "verified_solve_rate": solve_rate,
                "solve_rate_stdev": "",
                "solve_rate_min": "",
                "solve_rate_max": "",
                "false_completion_rate": false_rate,
                "false_completion_stdev": "",
            })

        if solve_rates:
            rows.append({
                "row_type": "summary",
                "condition": condition,
                "rep": "mean",
                "n": sum(ns),
                "verified_solve_rate": statistics.mean(solve_rates),
                "solve_rate_stdev": safe_stdev(solve_rates),
                "solve_rate_min": min(solve_rates),
                "solve_rate_max": max(solve_rates),
                "false_completion_rate": statistics.mean(false_rates),
                "false_completion_stdev": safe_stdev(false_rates),
            })

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "row_type",
        "condition",
        "rep",
        "n",
        "verified_solve_rate",
        "solve_rate_stdev",
        "solve_rate_min",
        "solve_rate_max",
        "false_completion_rate",
        "false_completion_stdev",
    ]
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
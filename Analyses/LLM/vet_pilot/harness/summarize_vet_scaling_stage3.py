#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import math
import random
from dataclasses import dataclass
from pathlib import Path


SCHEMA_USABLE_STATUSES = {"ok", "ok_repaired_edits_dict_to_list", "no_effective_changes"}
CONDITION_B = "agent_b"
CONDITION_D = "agent_d"


@dataclass(frozen=True)
class MetricSpec:
    name: str
    field: str
    focus: str
    higher_is_better: bool = True


METRICS = [
    MetricSpec("verified_solve", "verified_solve", "solve"),
    MetricSpec("patch_applied", "patch_applied", "reachability"),
    MetricSpec("false_completion", "false_completion", "reliability", higher_is_better=False),
    MetricSpec("json_valid", "json_valid", "interface validity"),
    MetricSpec("schema_usable", "schema_usable", "schema reachability"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stage2-records",
        type=Path,
        default=Path("results/vet_scaling_stage2/stage2_records.csv"),
    )
    parser.add_argument(
        "--task-inventory",
        type=Path,
        default=Path("results/vet_scaling_stage2/task_inventory.csv"),
    )
    parser.add_argument(
        "--out-root",
        type=Path,
        default=Path("results/vet_scaling_stage3"),
    )
    parser.add_argument("--bootstrap-samples", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=7)
    return parser.parse_args()


def parse_bool_text(value: str | None) -> bool:
    if value is None:
        return False
    lowered = value.strip().lower()
    return lowered in {"1", "true", "yes", "y"}


def format_rate(value: float) -> str:
    return f"{value:.3f}"


def format_pvalue(value: float) -> str:
    return f"{value:.4f}"


def format_ci(low: float, high: float) -> str:
    return f"[{low:.3f}, {high:.3f}]"


def load_stage2_rows(path: Path) -> list[dict[str, object]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows: list[dict[str, object]] = []
        for row in reader:
            status = (row.get("status") or "").strip()
            rows.append(
                {
                    "rep": (row.get("rep") or "").strip(),
                    "task": (row.get("task") or "").strip(),
                    "condition": (row.get("condition") or "").strip(),
                    "json_valid": parse_bool_text(row.get("json_valid")),
                    "patch_applied": parse_bool_text(row.get("patch_applied")),
                    "verified_solve": parse_bool_text(row.get("verified_solve")),
                    "false_completion": parse_bool_text(row.get("false_completion")),
                    "status": status,
                    "schema_usable": status in SCHEMA_USABLE_STATUSES,
                }
            )
    return rows


def load_bug_types(path: Path) -> dict[str, str]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return {
            (row.get("task_id") or "").strip(): (row.get("bug_type") or "").strip()
            for row in reader
            if (row.get("task_id") or "").strip()
        }


def build_paired_rows(rows: list[dict[str, object]]) -> dict[tuple[str, str], dict[str, dict[str, object]]]:
    paired: dict[tuple[str, str], dict[str, dict[str, object]]] = {}
    for row in rows:
        condition = str(row["condition"])
        if condition not in {CONDITION_B, CONDITION_D}:
            continue
        key = (str(row["rep"]), str(row["task"]))
        paired.setdefault(key, {})[condition] = row

    missing = [key for key, value in paired.items() if set(value) != {CONDITION_B, CONDITION_D}]
    if missing:
        raise ValueError(f"Missing paired B/D rows for keys: {missing[:5]}")
    return paired


def bootstrap_ci(diffs: list[int], samples: int, seed: int) -> tuple[float, float]:
    if not diffs:
        return (0.0, 0.0)

    rng = random.Random(seed)
    n = len(diffs)
    boot = []
    for _ in range(samples):
        total = 0
        for _ in range(n):
            total += diffs[rng.randrange(n)]
        boot.append(total / n)
    boot.sort()

    low_index = int(0.025 * (samples - 1))
    high_index = int(0.975 * (samples - 1))
    return boot[low_index], boot[high_index]


def exact_two_sided_sign_pvalue(positive: int, negative: int) -> float:
    discordant = positive + negative
    if discordant == 0:
        return 1.0

    tail = min(positive, negative)
    probability = sum(math.comb(discordant, value) for value in range(tail + 1)) / (2 ** discordant)
    return min(1.0, 2 * probability)


def interpret_metric(metric: MetricSpec, d_only: int, b_only: int, pvalue: float) -> str:
    if metric.higher_is_better:
        direction = d_only - b_only
    else:
        direction = b_only - d_only

    if direction > 0:
        base = f"D shows a positive paired {metric.focus} signal"
    elif direction < 0:
        base = f"D shows a negative paired {metric.focus} signal"
    else:
        base = f"No paired {metric.focus} advantage is visible"

    if pvalue > 0.05:
        return f"{base}; this is pilot evidence, not a statistically established effect"
    return f"{base}; the paired exact test is consistent with a non-random directional signal"


def classify_task(b_solves: int, d_solves: int) -> str:
    if d_solves > b_solves:
        return "D_win"
    if b_solves > d_solves:
        return "B_win"
    if b_solves == 0:
        return "neither"
    return "tie"


def write_paired_stats(
    out_path: Path,
    paired_rows: dict[tuple[str, str], dict[str, dict[str, object]]],
    bootstrap_samples: int,
    seed: int,
) -> list[dict[str, object]]:
    ordered_pairs = [paired_rows[key] for key in sorted(paired_rows)]
    total_units = len(ordered_pairs)
    metric_rows: list[dict[str, object]] = []

    for offset, metric in enumerate(METRICS):
        pairs = [
            (
                1 if pair[CONDITION_B][metric.field] else 0,
                1 if pair[CONDITION_D][metric.field] else 0,
            )
            for pair in ordered_pairs
        ]
        b_count = sum(b_value for b_value, _ in pairs)
        d_count = sum(d_value for _, d_value in pairs)
        d_only = sum(1 for b_value, d_value in pairs if d_value == 1 and b_value == 0)
        b_only = sum(1 for b_value, d_value in pairs if b_value == 1 and d_value == 0)
        both_true = sum(1 for b_value, d_value in pairs if b_value == 1 and d_value == 1)
        both_false = sum(1 for b_value, d_value in pairs if b_value == 0 and d_value == 0)
        difference_values = [d_value - b_value for b_value, d_value in pairs]
        difference = sum(difference_values) / total_units
        ci_low, ci_high = bootstrap_ci(difference_values, bootstrap_samples, seed + offset)
        pvalue = exact_two_sided_sign_pvalue(d_only, b_only)
        metric_rows.append(
            {
                "metric": metric.name,
                "b_count": b_count,
                "b_total": total_units,
                "b_rate": format_rate(b_count / total_units),
                "d_count": d_count,
                "d_total": total_units,
                "d_rate": format_rate(d_count / total_units),
                "d_minus_b": format_rate(difference),
                "d_only": d_only,
                "b_only": b_only,
                "both_true": both_true,
                "both_false": both_false,
                "paired_bootstrap_ci_low": format_rate(ci_low),
                "paired_bootstrap_ci_high": format_rate(ci_high),
                "paired_bootstrap_ci": format_ci(ci_low, ci_high),
                "sign_test_pvalue": format_pvalue(pvalue),
                "interpretation": interpret_metric(metric, d_only, b_only, pvalue),
            }
        )

    with out_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "metric",
            "b_count",
            "b_total",
            "b_rate",
            "d_count",
            "d_total",
            "d_rate",
            "d_minus_b",
            "d_only",
            "b_only",
            "both_true",
            "both_false",
            "paired_bootstrap_ci_low",
            "paired_bootstrap_ci_high",
            "paired_bootstrap_ci",
            "sign_test_pvalue",
            "interpretation",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(metric_rows)
    return metric_rows


def write_task_level_table(
    out_path: Path,
    paired_rows: dict[tuple[str, str], dict[str, dict[str, object]]],
    bug_types: dict[str, str],
) -> tuple[list[dict[str, object]], dict[str, int]]:
    by_task: dict[str, list[dict[str, dict[str, object]]]] = {}
    for (_, task), pair in paired_rows.items():
        by_task.setdefault(task, []).append(pair)

    rows: list[dict[str, object]] = []
    summary = {"D_win": 0, "B_win": 0, "tie": 0, "neither": 0}
    for task in sorted(by_task):
        task_pairs = by_task[task]
        b_solves = sum(1 for pair in task_pairs if pair[CONDITION_B]["verified_solve"])
        d_solves = sum(1 for pair in task_pairs if pair[CONDITION_D]["verified_solve"])
        b_applied = sum(1 for pair in task_pairs if pair[CONDITION_B]["patch_applied"])
        d_applied = sum(1 for pair in task_pairs if pair[CONDITION_D]["patch_applied"])
        comparison = classify_task(b_solves, d_solves)
        summary[comparison] += 1
        rows.append(
            {
                "task": task,
                "bug_type": bug_types.get(task, ""),
                "b_solves": b_solves,
                "b_total": len(task_pairs),
                "d_solves": d_solves,
                "d_total": len(task_pairs),
                "b_applied": b_applied,
                "d_applied": d_applied,
                "comparison": comparison,
            }
        )

    with out_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "task",
            "bug_type",
            "b_solves",
            "b_total",
            "d_solves",
            "d_total",
            "b_applied",
            "d_applied",
            "comparison",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return rows, summary


def main() -> None:
    args = parse_args()
    rows = load_stage2_rows(args.stage2_records)
    paired_rows = build_paired_rows(rows)
    if len(paired_rows) != 60:
        raise ValueError(f"Expected 60 paired task-replication units, found {len(paired_rows)}")

    bug_types = load_bug_types(args.task_inventory)
    args.out_root.mkdir(parents=True, exist_ok=True)

    paired_path = args.out_root / "paired_b_vs_d_stats.csv"
    task_level_path = args.out_root / "task_level_b_vs_d_full.csv"

    paired_stats = write_paired_stats(paired_path, paired_rows, args.bootstrap_samples, args.seed)
    _, task_summary = write_task_level_table(task_level_path, paired_rows, bug_types)

    verified_row = next(row for row in paired_stats if row["metric"] == "verified_solve")
    print(
        "Stage 3 paired stats written:",
        paired_path,
        f"verified_solve D={verified_row['d_count']}/{verified_row['d_total']} B={verified_row['b_count']}/{verified_row['b_total']} p={verified_row['sign_test_pvalue']}",
    )
    print(
        "Stage 3 task-level table written:",
        task_level_path,
        f"D wins={task_summary['D_win']} B wins={task_summary['B_win']} ties={task_summary['tie']} neither={task_summary['neither']}",
    )


if __name__ == "__main__":
    main()
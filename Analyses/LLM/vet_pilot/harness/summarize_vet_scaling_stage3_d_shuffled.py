#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import math
import random
from dataclasses import dataclass
from pathlib import Path


SCHEMA_USABLE_STATUSES = {"ok", "ok_repaired_edits_dict_to_list", "no_effective_changes"}
CONDITION_B = "agent_b"
CONDITION_B2 = "agent_b2"
CONDITION_D = "agent_d"
CONDITION_D_SHUFFLED = "agent_d_shuffled"
CONDITION_LABELS = {
    CONDITION_B: "Agent B",
    CONDITION_B2: "Agent B2",
    CONDITION_D: "Agent D",
    CONDITION_D_SHUFFLED: "Agent D-shuffled",
}


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
    parser.add_argument("--stage2-records", type=Path, default=Path("results/vet_scaling_stage2/stage2_records.csv"))
    parser.add_argument("--task-inventory", type=Path, default=Path("results/vet_scaling_stage2/task_inventory.csv"))
    parser.add_argument("--stage3-results-root", type=Path, default=Path("results/vet_scaling_stage3/d_shuffled"))
    parser.add_argument("--stage3-candidates-root", type=Path, default=Path("candidates/vet_scaling_stage3/d_shuffled"))
    parser.add_argument("--out-root", type=Path, default=Path("results/vet_scaling_stage3"))
    parser.add_argument("--condition", default=CONDITION_D_SHUFFLED)
    parser.add_argument("--bootstrap-samples", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=27)
    return parser.parse_args()


def parse_bool_text(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "y"}


def normalize_status(text: str) -> str:
    value = text.strip()
    if value.startswith("invalid_json"):
        return "invalid_json"
    if value.startswith("invalid_schema"):
        return "invalid_schema"
    if value.startswith("rejected"):
        return "rejected"
    return value


def format_rate(value: float) -> str:
    return f"{value:.3f}"


def format_pvalue(value: float) -> str:
    return f"{value:.4f}"


def format_ci(low: float, high: float) -> str:
    return f"[{low:.3f}, {high:.3f}]"


def load_json(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def is_valid_json_document(raw_text: str) -> bool:
    if not raw_text:
        return False
    try:
        json.loads(raw_text)
    except json.JSONDecodeError:
        return False
    return True


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def load_stage2_rows(path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for row in load_csv_rows(path):
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


def load_stage3_condition_rows(results_root: Path, candidates_root: Path, condition: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for rep_dir in sorted(path for path in results_root.glob("rep_*") if path.is_dir()):
        result_dir = rep_dir / condition
        candidate_dir = candidates_root / rep_dir.name / condition
        if not result_dir.exists():
            continue
        for result_path in sorted(result_dir.glob("challenge_*.json")):
            task = result_path.stem
            raw_path = candidate_dir / "raw" / f"{task}.json"
            status_path = candidate_dir / "status" / f"{task}.txt"
            result = load_json(result_path)
            status_text = status_path.read_text(encoding="utf-8").strip() if status_path.exists() else ""
            status = normalize_status(status_text) if status_text else "missing"
            raw_text = raw_path.read_text(encoding="utf-8", errors="ignore").strip() if raw_path.exists() else ""
            rows.append(
                {
                    "rep": rep_dir.name,
                    "task": task,
                    "condition": condition,
                    "json_valid": is_valid_json_document(raw_text),
                    "patch_applied": result.get("patch_applied") is True,
                    "verified_solve": result.get("verified_solve") is True,
                    "false_completion": result.get("false_completion") is True,
                    "status": status,
                    "schema_usable": status in SCHEMA_USABLE_STATUSES,
                }
            )
    return rows


def load_bug_types(path: Path) -> dict[str, str]:
    return {
        (row.get("task_id") or "").strip(): (row.get("bug_type") or "").strip()
        for row in load_csv_rows(path)
        if (row.get("task_id") or "").strip()
    }


def load_metric_row(path: Path, metric_name: str) -> dict[str, str] | None:
    for row in load_csv_rows(path):
        if (row.get("metric") or "").strip() == metric_name:
            return row
    return None


def load_summary_row(path: Path) -> dict[str, str] | None:
    rows = load_csv_rows(path)
    return rows[0] if rows else None


def build_paired_rows(rows: list[dict[str, object]], left_condition: str, right_condition: str) -> dict[tuple[str, str], dict[str, dict[str, object]]]:
    paired: dict[tuple[str, str], dict[str, dict[str, object]]] = {}
    for row in rows:
        condition = str(row["condition"])
        if condition not in {left_condition, right_condition}:
            continue
        key = (str(row["rep"]), str(row["task"]))
        paired.setdefault(key, {})[condition] = row
    missing = [key for key, value in paired.items() if set(value) != {left_condition, right_condition}]
    if missing:
        raise ValueError(f"Missing paired rows for {left_condition}/{right_condition}: {missing[:5]}")
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


def interpret_metric(metric: MetricSpec, d_only: int, shuffled_only: int, pvalue: float) -> str:
    if metric.higher_is_better:
        direction = d_only - shuffled_only
    else:
        direction = shuffled_only - d_only
    if direction > 0:
        base = f"Agent D shows a positive paired {metric.focus} signal over Agent D-shuffled"
    elif direction < 0:
        base = f"Agent D-shuffled shows a positive paired {metric.focus} signal over Agent D"
    else:
        base = f"No paired {metric.focus} separation is visible between Agent D and Agent D-shuffled"
    if pvalue > 0.05:
        return f"{base}; this is pilot evidence, not a statistically established effect"
    return f"{base}; the paired exact test is consistent with a directional pilot signal"


def summarize_condition(rows: list[dict[str, object]], condition: str) -> dict[str, object]:
    condition_rows = [row for row in rows if row["condition"] == condition]
    n = len(condition_rows)
    json_valid_count = sum(1 for row in condition_rows if row["json_valid"])
    schema_usable_count = sum(1 for row in condition_rows if row["schema_usable"])
    patch_applied_count = sum(1 for row in condition_rows if row["patch_applied"])
    verified_solve_count = sum(1 for row in condition_rows if row["verified_solve"])
    false_completion_count = sum(1 for row in condition_rows if row["false_completion"])
    return {
        "condition": condition,
        "n": n,
        "json_valid_rate": format_rate(json_valid_count / n),
        "schema_usable_rate": format_rate(schema_usable_count / n),
        "patch_applied_rate": format_rate(patch_applied_count / n),
        "verified_solve_rate": format_rate(verified_solve_count / n),
        "solve_if_applied": format_rate((verified_solve_count / patch_applied_count) if patch_applied_count else 0.0),
        "false_completion_rate": format_rate(false_completion_count / n),
        "json_valid_count": json_valid_count,
        "schema_usable_count": schema_usable_count,
        "patch_applied_count": patch_applied_count,
        "verified_solve_count": verified_solve_count,
        "false_completion_count": false_completion_count,
    }


def write_summary(out_path: Path, summary: dict[str, object]) -> None:
    fieldnames = [
        "condition",
        "n",
        "json_valid_rate",
        "schema_usable_rate",
        "patch_applied_rate",
        "verified_solve_rate",
        "solve_if_applied",
        "false_completion_rate",
    ]
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow({field: summary[field] for field in fieldnames})


def write_records(out_path: Path, rows: list[dict[str, object]]) -> None:
    fieldnames = [
        "rep",
        "task",
        "condition",
        "json_valid",
        "schema_usable",
        "patch_applied",
        "verified_solve",
        "false_completion",
        "status",
    ]
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row[field] for field in fieldnames})


def write_status_counts(out_path: Path, rows: list[dict[str, object]]) -> None:
    counts: dict[str, int] = {}
    for row in rows:
        status = str(row["status"])
        counts[status] = counts.get(status, 0) + 1
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["status", "count"])
        writer.writeheader()
        for status in sorted(counts):
            writer.writerow({"status": status, "count": counts[status]})


def write_comparison_stats(
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
                1 if pair[CONDITION_D][metric.field] else 0,
                1 if pair[CONDITION_D_SHUFFLED][metric.field] else 0,
            )
            for pair in ordered_pairs
        ]
        d_count = sum(d_value for d_value, _ in pairs)
        shuffled_count = sum(shuffled_value for _, shuffled_value in pairs)
        d_only = sum(1 for d_value, shuffled_value in pairs if d_value == 1 and shuffled_value == 0)
        shuffled_only = sum(1 for d_value, shuffled_value in pairs if d_value == 0 and shuffled_value == 1)
        both_true = sum(1 for d_value, shuffled_value in pairs if d_value == 1 and shuffled_value == 1)
        both_false = sum(1 for d_value, shuffled_value in pairs if d_value == 0 and shuffled_value == 0)
        difference_values = [d_value - shuffled_value for d_value, shuffled_value in pairs]
        difference = sum(difference_values) / total_units
        ci_low, ci_high = bootstrap_ci(difference_values, bootstrap_samples, seed + offset)
        pvalue = exact_two_sided_sign_pvalue(d_only, shuffled_only)
        metric_rows.append(
            {
                "metric": metric.name,
                "d_count": d_count,
                "d_shuffled_count": shuffled_count,
                "difference": format_rate(difference),
                "d_only": d_only,
                "shuffled_only": shuffled_only,
                "both_true": both_true,
                "both_false": both_false,
                "sign_test_pvalue": format_pvalue(pvalue),
                "paired_bootstrap_ci": format_ci(ci_low, ci_high),
                "interpretation": interpret_metric(metric, d_only, shuffled_only, pvalue),
            }
        )
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "metric",
            "d_count",
            "d_shuffled_count",
            "difference",
            "d_only",
            "shuffled_only",
            "both_true",
            "both_false",
            "sign_test_pvalue",
            "paired_bootstrap_ci",
            "interpretation",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(metric_rows)
    return metric_rows


def classify_task(d_solves: int, shuffled_solves: int) -> str:
    if d_solves > shuffled_solves:
        return "D_win"
    if shuffled_solves > d_solves:
        return "D_shuffled_win"
    if d_solves == 0:
        return "neither"
    return "tie"


def write_task_level_table(
    out_path: Path,
    paired_rows: dict[tuple[str, str], dict[str, dict[str, object]]],
    bug_types: dict[str, str],
) -> tuple[list[dict[str, object]], dict[str, int]]:
    by_task: dict[str, list[dict[str, dict[str, object]]]] = {}
    for (_, task), pair in paired_rows.items():
        by_task.setdefault(task, []).append(pair)

    rows: list[dict[str, object]] = []
    summary = {"D_win": 0, "D_shuffled_win": 0, "tie": 0, "neither": 0}
    for task in sorted(by_task):
        task_pairs = by_task[task]
        d_solves = sum(1 for pair in task_pairs if pair[CONDITION_D]["verified_solve"])
        shuffled_solves = sum(1 for pair in task_pairs if pair[CONDITION_D_SHUFFLED]["verified_solve"])
        d_applied = sum(1 for pair in task_pairs if pair[CONDITION_D]["patch_applied"])
        shuffled_applied = sum(1 for pair in task_pairs if pair[CONDITION_D_SHUFFLED]["patch_applied"])
        comparison = classify_task(d_solves, shuffled_solves)
        summary[comparison] += 1
        rows.append(
            {
                "task": task,
                "bug_type": bug_types.get(task, ""),
                "d_solves": d_solves,
                "d_shuffled_solves": shuffled_solves,
                "replications": len(task_pairs),
                "d_applied": d_applied,
                "d_shuffled_applied": shuffled_applied,
                "comparison": comparison,
            }
        )

    with out_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "task",
            "bug_type",
            "d_solves",
            "d_shuffled_solves",
            "replications",
            "d_applied",
            "d_shuffled_applied",
            "comparison",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return rows, summary


def extract_metric(rows: list[dict[str, object]], metric_name: str) -> dict[str, object]:
    return next(row for row in rows if row["metric"] == metric_name)


def interpret_overall_stage3_claim(
    d_shuffled_row: dict[str, object],
    b2_vs_d_row: dict[str, str] | None,
) -> str:
    d_count = int(d_shuffled_row["d_count"])
    shuffled_count = int(d_shuffled_row["d_shuffled_count"])
    d_shuffled_pvalue = float(d_shuffled_row["sign_test_pvalue"])
    d_shuffled_gap = d_count - shuffled_count

    b2_matches_d = False
    if b2_vs_d_row is not None:
        b2_count = int(b2_vs_d_row["left_count"])
        d_against_b2_count = int(b2_vs_d_row["right_count"])
        b2_pvalue = float(b2_vs_d_row["sign_test_pvalue"])
        b2_matches_d = abs(d_against_b2_count - b2_count) <= 1 and b2_pvalue > 0.05

    if b2_matches_d and d_shuffled_gap > 0:
        return (
            "The pilot gives mixed ablation evidence: token-matched final-patch context already matches Agent D, so rich context appears sufficient for most of the gain, "
            "while Agent D's smaller directional edge over Agent D-shuffled suggests that trajectory order may still matter within trajectory-style prompts but is not yet cleanly isolated."
        )
    if b2_matches_d and abs(d_shuffled_gap) <= 1 and d_shuffled_pvalue > 0.05:
        return (
            "Both token-matched and shuffled controls are effectively close to Agent D, so the pilot supports a rich-context explanation rather than a clean trajectory-structure effect."
        )
    if b2_matches_d:
        return (
            "Token-matched final-patch context already matches Agent D, so the verified-trajectory hypothesis is not cleanly supported even though the shuffled control moves in a different direction."
        )
    if abs(d_shuffled_gap) <= 1 and d_shuffled_pvalue > 0.05:
        return (
            "Full verified trajectories outperform the short final-patch baseline, but the shuffled trajectory control is effectively close to Agent D. The pilot therefore does not isolate a clean benefit from trajectory order."
        )
    if d_shuffled_gap > 0:
        return (
            "Full verified trajectories outperform both the short final-patch baseline and the shuffled trajectory control, suggesting that ordered state-action-verification structure may contribute to reliability."
        )
    return "The verified-trajectory hypothesis was not supported in this prompt-only pilot. The gains appear attributable to prompt richness rather than ordered trajectory structure."


def update_stage3_summary(
    out_path: Path,
    d_shuffled_summary: dict[str, object],
    comparison_rows: list[dict[str, object]],
    task_summary: dict[str, int],
    b2_summary_row: dict[str, str] | None,
    b2_vs_d_row: dict[str, str] | None,
    b2_vs_b_row: dict[str, str] | None,
    b_vs_d_row: dict[str, str] | None,
) -> None:
    verified_row = extract_metric(comparison_rows, "verified_solve")
    lines = [
        "# Stage 3 Summary",
        "",
        "Status:",
        "- Stage 3A: paired B-vs-D statistics — PASSED / FROZEN",
        "- Stage 3B: full task-level B-vs-D table — PASSED / FROZEN",
        "- Stage 3C: recovery wording correction — PASSED",
        "- Stage 3D: B2 token-matched final-patch control — PASSED / FROZEN",
        "- Stage 3E: D-shuffled trajectory control — PASSED / FROZEN",
        "",
        "Experimental unit:",
        "- One paired unit = one task on one replication.",
        "- Each paired Stage 3 comparison uses 30 tasks x 2 replications = 60 paired units.",
        "",
        "## Frozen B vs D Reference",
        "",
    ]
    if b_vs_d_row is not None:
        lines.append(
            f"Frozen corrected B vs D verified solve: Agent B {b_vs_d_row['left_count']}/{b_vs_d_row['left_total']} vs Agent D {b_vs_d_row['right_count']}/{b_vs_d_row['right_total']} (D-B = {b_vs_d_row['right_minus_left']}, p = {b_vs_d_row['sign_test_pvalue']})."
        )
    else:
        lines.append("Frozen corrected B vs D verified solve row was not found in the current Stage 3 summary artifacts.")

    lines.extend([
        "",
        "## B2 Control",
        "",
    ])
    if b2_summary_row is not None:
        lines.append(
            f"Agent B2 summary: verified solve {b2_summary_row.get('verified_solve_count', '?')}/{b2_summary_row.get('n_runs', '?')}, patch applied {b2_summary_row.get('patch_applied_count', '?')}/{b2_summary_row.get('n_runs', '?')}, false completion {b2_summary_row.get('false_completion_count', '?')}/{b2_summary_row.get('n_runs', '?')}."
        )
    if b2_vs_d_row is not None:
        lines.append(
            f"B2 vs D verified solve: Agent B2 {b2_vs_d_row['left_count']}/{b2_vs_d_row['left_total']} vs Agent D {b2_vs_d_row['right_count']}/{b2_vs_d_row['right_total']} (D-B2 = {b2_vs_d_row['right_minus_left']}, p = {b2_vs_d_row['sign_test_pvalue']})."
        )
    if b2_vs_b_row is not None:
        lines.append(
            f"B vs B2 verified solve: Agent B {b2_vs_b_row['left_count']}/{b2_vs_b_row['left_total']} vs Agent B2 {b2_vs_b_row['right_count']}/{b2_vs_b_row['right_total']} (B2-B = {b2_vs_b_row['right_minus_left']}, p = {b2_vs_b_row['sign_test_pvalue']})."
        )

    lines.extend([
        "",
        "## D-Shuffled Control",
        "",
        "| Metric | Count | Rate |",
        "| --- | ---: | ---: |",
        f"| JSON valid | {d_shuffled_summary['json_valid_count']}/{d_shuffled_summary['n']} | {d_shuffled_summary['json_valid_rate']} |",
        f"| Schema usable | {d_shuffled_summary['schema_usable_count']}/{d_shuffled_summary['n']} | {d_shuffled_summary['schema_usable_rate']} |",
        f"| Patch applied | {d_shuffled_summary['patch_applied_count']}/{d_shuffled_summary['n']} | {d_shuffled_summary['patch_applied_rate']} |",
        f"| Verified solve | {d_shuffled_summary['verified_solve_count']}/{d_shuffled_summary['n']} | {d_shuffled_summary['verified_solve_rate']} |",
        f"| Solve if applied | {d_shuffled_summary['verified_solve_count']}/{d_shuffled_summary['patch_applied_count']} | {d_shuffled_summary['solve_if_applied']} |",
        f"| False completion | {d_shuffled_summary['false_completion_count']}/{d_shuffled_summary['n']} | {d_shuffled_summary['false_completion_rate']} |",
        "",
        f"D vs D-shuffled verified solve: Agent D {verified_row['d_count']}/60 vs Agent D-shuffled {verified_row['d_shuffled_count']}/60 (D-D_shuffled = {verified_row['difference']}, p = {verified_row['sign_test_pvalue']}).",
        f"Task-level aggregation: D wins={task_summary['D_win']}, D-shuffled wins={task_summary['D_shuffled_win']}, ties={task_summary['tie']}, neither={task_summary['neither']}.",
        "",
        "Interpretation:",
        f"- {interpret_overall_stage3_claim(verified_row, b2_vs_d_row)}",
        f"- {verified_row['interpretation']}",
        "- This remains pilot evidence rather than a statistically established mechanism effect unless the paired gap is larger and more stable in a higher-powered study.",
        "",
        "## Output Files",
        "",
        "- `b2_summary.csv`",
        "- `b2_vs_d_stats.csv`",
        "- `b2_vs_b_stats.csv`",
        "- `d_shuffled_summary.csv`",
        "- `d_vs_d_shuffled_stats.csv`",
        "- `d_shuffled_task_level.csv`",
        "- `stage3_summary.md`",
    ])
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    stage2_rows = load_stage2_rows(args.stage2_records)
    shuffled_rows = load_stage3_condition_rows(args.stage3_results_root, args.stage3_candidates_root, args.condition)
    if len(shuffled_rows) != 60:
        raise ValueError(f"Expected 60 D-shuffled result rows, found {len(shuffled_rows)}")

    args.out_root.mkdir(parents=True, exist_ok=True)
    summary_path = args.out_root / "d_shuffled_summary.csv"
    records_path = args.out_root / "d_shuffled_records.csv"
    status_counts_path = args.out_root / "d_shuffled_status_counts.csv"
    stats_path = args.out_root / "d_vs_d_shuffled_stats.csv"
    task_level_path = args.out_root / "d_shuffled_task_level.csv"
    stage3_summary_path = args.out_root / "stage3_summary.md"

    summary = summarize_condition(shuffled_rows, args.condition)
    write_summary(summary_path, summary)
    write_records(records_path, shuffled_rows)
    write_status_counts(status_counts_path, shuffled_rows)

    combined_rows = stage2_rows + shuffled_rows
    paired_rows = build_paired_rows(combined_rows, CONDITION_D, args.condition)
    if len(paired_rows) != 60:
        raise ValueError(f"Expected 60 paired D/D-shuffled units, found {len(paired_rows)}")

    comparison_rows = write_comparison_stats(stats_path, paired_rows, args.bootstrap_samples, args.seed)
    bug_types = load_bug_types(args.task_inventory)
    _, task_summary = write_task_level_table(task_level_path, paired_rows, bug_types)

    b2_summary_row = load_summary_row(args.out_root / "b2_summary.csv")
    b2_vs_d_row = load_metric_row(args.out_root / "b2_vs_d_stats.csv", "verified_solve")
    b2_vs_b_row = load_metric_row(args.out_root / "b2_vs_b_stats.csv", "verified_solve")
    b_vs_d_row = load_metric_row(args.out_root / "paired_b_vs_d_stats.csv", "verified_solve")
    update_stage3_summary(
        stage3_summary_path,
        summary,
        comparison_rows,
        task_summary,
        b2_summary_row,
        b2_vs_d_row,
        b2_vs_b_row,
        b_vs_d_row,
    )

    verified_row = extract_metric(comparison_rows, "verified_solve")
    print(
        json.dumps(
            {
                "d_shuffled_summary": str(summary_path),
                "d_vs_d_shuffled_stats": str(stats_path),
                "d_shuffled_task_level": str(task_level_path),
                "stage3_summary": str(stage3_summary_path),
                "d_shuffled_verified_solve": f"{summary['verified_solve_count']}/{summary['n']}",
                "d_vs_d_shuffled_verified_solve": {
                    "d": verified_row["d_count"],
                    "d_shuffled": verified_row["d_shuffled_count"],
                    "difference": verified_row["difference"],
                    "p": verified_row["sign_test_pvalue"],
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
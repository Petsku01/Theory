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
CONDITION_LABELS = {
    CONDITION_B: "Agent B",
    CONDITION_B2: "Agent B2",
    CONDITION_D: "Agent D",
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
    parser.add_argument("--stage3-results-root", type=Path, default=Path("results/vet_scaling_stage3"))
    parser.add_argument("--stage3-candidates-root", type=Path, default=Path("candidates/vet_scaling_stage3"))
    parser.add_argument("--out-root", type=Path, default=Path("results/vet_scaling_stage3"))
    parser.add_argument("--b2-condition", default=CONDITION_B2)
    parser.add_argument("--bootstrap-samples", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=17)
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


def load_stage2_rows(path: Path) -> list[dict[str, object]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows: list[dict[str, object]] = []
        for row in reader:
            status = (row.get("status") or "").strip()
            rows.append({
                "rep": (row.get("rep") or "").strip(),
                "task": (row.get("task") or "").strip(),
                "condition": (row.get("condition") or "").strip(),
                "json_valid": parse_bool_text(row.get("json_valid")),
                "patch_applied": parse_bool_text(row.get("patch_applied")),
                "verified_solve": parse_bool_text(row.get("verified_solve")),
                "false_completion": parse_bool_text(row.get("false_completion")),
                "status": status,
                "schema_usable": status in SCHEMA_USABLE_STATUSES,
            })
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
            rows.append({
                "rep": rep_dir.name,
                "task": task,
                "condition": condition,
                "json_valid": is_valid_json_document(raw_text),
                "patch_applied": result.get("patch_applied") is True,
                "verified_solve": result.get("verified_solve") is True,
                "false_completion": result.get("false_completion") is True,
                "status": status,
                "schema_usable": status in SCHEMA_USABLE_STATUSES,
            })
    return rows


def load_bug_types(path: Path) -> dict[str, str]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return {
            (row.get("task_id") or "").strip(): (row.get("bug_type") or "").strip()
            for row in reader
            if (row.get("task_id") or "").strip()
        }


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


def interpret_metric(metric: MetricSpec, left_condition: str, right_condition: str, right_only: int, left_only: int, pvalue: float) -> str:
    left_label = CONDITION_LABELS.get(left_condition, left_condition)
    right_label = CONDITION_LABELS.get(right_condition, right_condition)
    if metric.higher_is_better:
        direction = right_only - left_only
    else:
        direction = left_only - right_only

    if direction > 0:
        base = f"{right_label} shows a positive paired {metric.focus} signal over {left_label}"
    elif direction < 0:
        base = f"{right_label} shows a negative paired {metric.focus} signal relative to {left_label}"
    else:
        base = f"No paired {metric.focus} separation is visible between {left_label} and {right_label}"

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
        "n_runs": n,
        "json_valid_count": json_valid_count,
        "json_valid_rate": format_rate(json_valid_count / n),
        "schema_usable_count": schema_usable_count,
        "schema_usable_rate": format_rate(schema_usable_count / n),
        "patch_applied_count": patch_applied_count,
        "patch_applied_rate": format_rate(patch_applied_count / n),
        "verified_solve_count": verified_solve_count,
        "verified_solve_rate": format_rate(verified_solve_count / n),
        "solve_if_applied": format_rate((verified_solve_count / patch_applied_count) if patch_applied_count else 0.0),
        "false_completion_count": false_completion_count,
        "false_completion_rate": format_rate(false_completion_count / n),
    }


def write_b2_summary(out_path: Path, summary_row: dict[str, object]) -> None:
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "condition",
            "n_runs",
            "json_valid_count",
            "json_valid_rate",
            "schema_usable_count",
            "schema_usable_rate",
            "patch_applied_count",
            "patch_applied_rate",
            "verified_solve_count",
            "verified_solve_rate",
            "solve_if_applied",
            "false_completion_count",
            "false_completion_rate",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow(summary_row)


def write_comparison_stats(
    out_path: Path,
    paired_rows: dict[tuple[str, str], dict[str, dict[str, object]]],
    left_condition: str,
    right_condition: str,
    bootstrap_samples: int,
    seed: int,
) -> list[dict[str, object]]:
    ordered_pairs = [paired_rows[key] for key in sorted(paired_rows)]
    total_units = len(ordered_pairs)
    metric_rows: list[dict[str, object]] = []

    for offset, metric in enumerate(METRICS):
        pairs = [
            (
                1 if pair[left_condition][metric.field] else 0,
                1 if pair[right_condition][metric.field] else 0,
            )
            for pair in ordered_pairs
        ]
        left_count = sum(left_value for left_value, _ in pairs)
        right_count = sum(right_value for _, right_value in pairs)
        right_only = sum(1 for left_value, right_value in pairs if right_value == 1 and left_value == 0)
        left_only = sum(1 for left_value, right_value in pairs if left_value == 1 and right_value == 0)
        both_true = sum(1 for left_value, right_value in pairs if left_value == 1 and right_value == 1)
        both_false = sum(1 for left_value, right_value in pairs if left_value == 0 and right_value == 0)
        difference_values = [right_value - left_value for left_value, right_value in pairs]
        difference = sum(difference_values) / total_units
        ci_low, ci_high = bootstrap_ci(difference_values, bootstrap_samples, seed + offset)
        pvalue = exact_two_sided_sign_pvalue(right_only, left_only)
        metric_rows.append({
            "metric": metric.name,
            "left_condition": left_condition,
            "left_count": left_count,
            "left_total": total_units,
            "left_rate": format_rate(left_count / total_units),
            "right_condition": right_condition,
            "right_count": right_count,
            "right_total": total_units,
            "right_rate": format_rate(right_count / total_units),
            "right_minus_left": format_rate(difference),
            "right_only": right_only,
            "left_only": left_only,
            "both_true": both_true,
            "both_false": both_false,
            "paired_bootstrap_ci_low": format_rate(ci_low),
            "paired_bootstrap_ci_high": format_rate(ci_high),
            "paired_bootstrap_ci": format_ci(ci_low, ci_high),
            "sign_test_pvalue": format_pvalue(pvalue),
            "interpretation": interpret_metric(metric, left_condition, right_condition, right_only, left_only, pvalue),
        })

    with out_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "metric",
            "left_condition",
            "left_count",
            "left_total",
            "left_rate",
            "right_condition",
            "right_count",
            "right_total",
            "right_rate",
            "right_minus_left",
            "right_only",
            "left_only",
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


def extract_metric(rows: list[dict[str, object]], metric_name: str) -> dict[str, object]:
    return next(row for row in rows if row["metric"] == metric_name)


def classify_verified_solve_result(left_count: int, right_count: int, total: int, pvalue: float, right_condition: str) -> str:
    gap = right_count - left_count
    if abs(gap) <= 1 and pvalue > 0.05:
        if {right_condition, CONDITION_B2} == {CONDITION_D, CONDITION_B2}:
            return "B2 is effectively close to D on verified solve in this pilot, so D's advantage may be driven by length, verbosity, or general operational guidance rather than trajectory structure alone."
        return "B2 is effectively close to B on verified solve in this pilot, so token matching alone did not materially shift outcomes."
    if right_condition == CONDITION_D:
        if gap > 0:
            return "D is ahead of B2 on verified solve, which strengthens the trajectory-specific claim, although the uncertainty is still wide."
        return "B2 exceeds D on verified solve, which suggests token-matched final-patch context may be sufficient without full verified trajectories."
    if gap > 0:
        return "B2 improves on B, which suggests prompt length or richer final-patch context may matter."
    if gap < 0:
        return "B2 falls below B, so token matching by itself did not improve the final-patch baseline."
    return "B2 and B are tied on verified solve in this pilot."


def write_stage3_summary(
    out_path: Path,
    b2_summary: dict[str, object],
    b_vs_d_rows: list[dict[str, object]],
    b2_vs_d_rows: list[dict[str, object]],
    b2_vs_b_rows: list[dict[str, object]],
) -> None:
    b_vs_d_solve = extract_metric(b_vs_d_rows, "verified_solve")
    b2_vs_d_solve = extract_metric(b2_vs_d_rows, "verified_solve")
    b2_vs_b_solve = extract_metric(b2_vs_b_rows, "verified_solve")

    lines = [
        "# Stage 3 Summary",
        "",
        "Status:",
        "- Stage 3A: paired B-vs-D statistics — PASSED / FROZEN",
        "- Stage 3B: full task-level B-vs-D table — PASSED / FROZEN",
        "- Stage 3C: recovery wording correction — PASSED",
        "- Stage 3D: B2 token-matched final-patch control — PASSED / FROZEN",
        "",
        "Experimental unit:",
        "- One paired unit = one task on one replication.",
        "- Stage 3 B2 control uses 30 tasks x 2 replications = 60 paired units.",
        "",
        "## B2 Condition Summary",
        "",
        "| Metric | Count | Rate |",
        "| --- | ---: | ---: |",
        f"| JSON valid | {b2_summary['json_valid_count']}/{b2_summary['n_runs']} | {b2_summary['json_valid_rate']} |",
        f"| Schema usable | {b2_summary['schema_usable_count']}/{b2_summary['n_runs']} | {b2_summary['schema_usable_rate']} |",
        f"| Patch applied | {b2_summary['patch_applied_count']}/{b2_summary['n_runs']} | {b2_summary['patch_applied_rate']} |",
        f"| Verified solve | {b2_summary['verified_solve_count']}/{b2_summary['n_runs']} | {b2_summary['verified_solve_rate']} |",
        f"| Solve if applied | {b2_summary['verified_solve_count']}/{b2_summary['patch_applied_count']} | {b2_summary['solve_if_applied']} |",
        f"| False completion | {b2_summary['false_completion_count']}/{b2_summary['n_runs']} | {b2_summary['false_completion_rate']} |",
        "",
        "## Primary Comparisons",
        "",
        f"Frozen corrected B vs D verified solve: Agent B {b_vs_d_solve['left_count']}/{b_vs_d_solve['left_total']} vs Agent D {b_vs_d_solve['right_count']}/{b_vs_d_solve['right_total']} (D-B = {b_vs_d_solve['right_minus_left']}, p = {b_vs_d_solve['sign_test_pvalue']}).",
        f"B2 vs D verified solve: Agent B2 {b2_vs_d_solve['left_count']}/{b2_vs_d_solve['left_total']} vs Agent D {b2_vs_d_solve['right_count']}/{b2_vs_d_solve['right_total']} (D-B2 = {b2_vs_d_solve['right_minus_left']}, p = {b2_vs_d_solve['sign_test_pvalue']}).",
        f"B vs B2 verified solve: Agent B {b2_vs_b_solve['left_count']}/{b2_vs_b_solve['left_total']} vs Agent B2 {b2_vs_b_solve['right_count']}/{b2_vs_b_solve['right_total']} (B2-B = {b2_vs_b_solve['right_minus_left']}, p = {b2_vs_b_solve['sign_test_pvalue']}).",
        "",
        "Interpretation:",
        f"- {classify_verified_solve_result(int(b2_vs_d_solve['left_count']), int(b2_vs_d_solve['right_count']), int(b2_vs_d_solve['right_total']), float(b2_vs_d_solve['sign_test_pvalue']), CONDITION_D)}",
        f"- {classify_verified_solve_result(int(b2_vs_b_solve['left_count']), int(b2_vs_b_solve['right_count']), int(b2_vs_b_solve['right_total']), float(b2_vs_b_solve['sign_test_pvalue']), CONDITION_B2)}",
        "- Regardless of direction, this remains pilot evidence rather than a statistically established effect because the uncertainty intervals are still wide.",
        "",
        "## Output Files",
        "",
        "- `b2_summary.csv`",
        "- `b2_vs_d_stats.csv`",
        "- `b2_vs_b_stats.csv`",
        "- `stage3_summary.md`",
    ]
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    stage2_rows = load_stage2_rows(args.stage2_records)
    b2_rows = load_stage3_condition_rows(args.stage3_results_root, args.stage3_candidates_root, args.b2_condition)
    if len(b2_rows) != 60:
        raise ValueError(f"Expected 60 B2 result rows, found {len(b2_rows)}")

    args.out_root.mkdir(parents=True, exist_ok=True)

    combined_rows = stage2_rows + b2_rows
    b2_summary = summarize_condition(combined_rows, args.b2_condition)
    b2_summary_path = args.out_root / "b2_summary.csv"
    b2_vs_d_path = args.out_root / "b2_vs_d_stats.csv"
    b2_vs_b_path = args.out_root / "b2_vs_b_stats.csv"
    stage3_summary_path = args.out_root / "stage3_summary.md"

    b_vs_d_pairs = build_paired_rows(stage2_rows, CONDITION_B, CONDITION_D)
    b2_vs_d_pairs = build_paired_rows(combined_rows, args.b2_condition, CONDITION_D)
    b2_vs_b_pairs = build_paired_rows(combined_rows, CONDITION_B, args.b2_condition)
    if len(b2_vs_d_pairs) != 60 or len(b2_vs_b_pairs) != 60:
        raise ValueError(
            f"Expected 60 paired B2 comparison units, found {len(b2_vs_d_pairs)} for B2/D and {len(b2_vs_b_pairs)} for B/B2"
        )

    write_b2_summary(b2_summary_path, b2_summary)
    b_vs_d_rows = write_comparison_stats(args.out_root / "paired_b_vs_d_stats.csv", b_vs_d_pairs, CONDITION_B, CONDITION_D, args.bootstrap_samples, args.seed)
    b2_vs_d_rows = write_comparison_stats(b2_vs_d_path, b2_vs_d_pairs, args.b2_condition, CONDITION_D, args.bootstrap_samples, args.seed + 100)
    b2_vs_b_rows = write_comparison_stats(b2_vs_b_path, b2_vs_b_pairs, CONDITION_B, args.b2_condition, args.bootstrap_samples, args.seed + 200)
    write_stage3_summary(stage3_summary_path, b2_summary, b_vs_d_rows, b2_vs_d_rows, b2_vs_b_rows)

    print(
        json.dumps(
            {
                "b2_summary": str(b2_summary_path),
                "b2_vs_d_stats": str(b2_vs_d_path),
                "b2_vs_b_stats": str(b2_vs_b_path),
                "stage3_summary": str(stage3_summary_path),
                "b2_verified_solve": f"{b2_summary['verified_solve_count']}/{b2_summary['n_runs']}",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
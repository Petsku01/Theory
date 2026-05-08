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


@dataclass(frozen=True)
class ComparisonSpec:
    name: str
    left_condition: str
    right_condition: str


@dataclass(frozen=True)
class MetricSpec:
    name: str
    field: str


COMPARISONS = [
    ComparisonSpec("D vs B", "agent_d", "agent_b"),
    ComparisonSpec("B2 vs B", "agent_b2", "agent_b"),
    ComparisonSpec("B2 vs D", "agent_b2", "agent_d"),
    ComparisonSpec("D vs D-shuffled", "agent_d", "agent_d_shuffled"),
]

METRICS = [
    MetricSpec("verified_solve", "verified_solve"),
    MetricSpec("patch_applied", "patch_applied"),
    MetricSpec("applied_but_not_verified", "applied_but_not_verified"),
    MetricSpec("json_valid", "json_valid"),
    MetricSpec("schema_usable", "schema_usable"),
]

PAIRWISE_SOURCE_FILES = {
    "D vs B": ("results/vet_scaling_stage3/paired_b_vs_d_stats.csv", "left_right"),
    "B2 vs B": ("results/vet_scaling_stage3/b2_vs_b_stats.csv", "left_right"),
    "B2 vs D": ("results/vet_scaling_stage3/b2_vs_d_stats.csv", "left_right"),
    "D vs D-shuffled": ("results/vet_scaling_stage3/d_vs_d_shuffled_stats.csv", "d_vs_shuffled"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage2-records", type=Path, default=Path("results/vet_scaling_stage2/stage2_records.csv"))
    parser.add_argument("--stage3-results-root", type=Path, default=Path("results/vet_scaling_stage3"))
    parser.add_argument("--stage3-candidates-root", type=Path, default=Path("candidates/vet_scaling_stage3"))
    parser.add_argument("--stage3-d-shuffled-results-root", type=Path, default=Path("results/vet_scaling_stage3/d_shuffled"))
    parser.add_argument("--stage3-d-shuffled-candidates-root", type=Path, default=Path("candidates/vet_scaling_stage3/d_shuffled"))
    parser.add_argument("--out-root", type=Path, default=Path("results/vet_scaling_stage4"))
    parser.add_argument("--bootstrap-samples", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=37)
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


def exact_two_sided_sign_pvalue(left_only: int, right_only: int) -> float:
    discordant = left_only + right_only
    if discordant == 0:
        return 1.0
    tail = min(left_only, right_only)
    probability = sum(math.comb(discordant, value) for value in range(tail + 1)) / (2 ** discordant)
    return min(1.0, 2 * probability)


def load_stage2_rows(path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            status = (row.get("status") or "").strip()
            patch_applied = parse_bool_text(row.get("patch_applied"))
            verified_solve = parse_bool_text(row.get("verified_solve"))
            rows.append(
                {
                    "rep": (row.get("rep") or "").strip(),
                    "task": (row.get("task") or "").strip(),
                    "condition": (row.get("condition") or "").strip(),
                    "json_valid": parse_bool_text(row.get("json_valid")),
                    "status": status,
                    "patch_applied": patch_applied,
                    "verified_solve": verified_solve,
                    "false_completion": parse_bool_text(row.get("false_completion")),
                    "schema_usable": status in SCHEMA_USABLE_STATUSES,
                    "applied_but_not_verified": patch_applied and not verified_solve,
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
            raw_text = raw_path.read_text(encoding="utf-8", errors="ignore").strip() if raw_path.exists() else ""
            status_text = status_path.read_text(encoding="utf-8").strip() if status_path.exists() else ""
            status = normalize_status(status_text) if status_text else "missing"
            patch_applied = result.get("patch_applied") is True
            verified_solve = result.get("verified_solve") is True
            rows.append(
                {
                    "rep": rep_dir.name,
                    "task": task,
                    "condition": condition,
                    "json_valid": is_valid_json_document(raw_text),
                    "status": status,
                    "patch_applied": patch_applied,
                    "verified_solve": verified_solve,
                    "false_completion": result.get("false_completion") is True,
                    "schema_usable": status in SCHEMA_USABLE_STATUSES,
                    "applied_but_not_verified": patch_applied and not verified_solve,
                }
            )
    return rows


def build_condition_index(rows: list[dict[str, object]]) -> dict[str, dict[tuple[str, str], dict[str, object]]]:
    index: dict[str, dict[tuple[str, str], dict[str, object]]] = {}
    for row in rows:
        index.setdefault(str(row["condition"]), {})[(str(row["rep"]), str(row["task"]))] = row
    return index


def build_paired_units(
    rows: list[dict[str, object]],
    left_condition: str,
    right_condition: str,
) -> list[tuple[tuple[str, str], dict[str, object], dict[str, object]]]:
    index = build_condition_index(rows)
    left_rows = index.get(left_condition, {})
    right_rows = index.get(right_condition, {})
    keys = sorted(set(left_rows) | set(right_rows))
    missing = [key for key in keys if key not in left_rows or key not in right_rows]
    if missing:
        raise ValueError(f"Missing paired units for {left_condition}/{right_condition}: {missing[:5]}")
    return [(key, left_rows[key], right_rows[key]) for key in keys]


def bootstrap_ci(differences: list[int], samples: int, seed: int) -> tuple[float, float]:
    if not differences:
        return (0.0, 0.0)
    rng = random.Random(seed)
    n = len(differences)
    boot = []
    for _ in range(samples):
        total = 0
        for _ in range(n):
            total += differences[rng.randrange(n)]
        boot.append(total / n)
    boot.sort()
    low_index = int(0.025 * (samples - 1))
    high_index = int(0.975 * (samples - 1))
    return boot[low_index], boot[high_index]


def format_rate(value: float) -> str:
    return f"{value:.3f}"


def format_pvalue(value: float) -> str:
    return f"{value:.4f}"


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def find_verified_solve_row(path: Path) -> dict[str, str]:
    for row in load_csv_rows(path):
        if (row.get("metric") or "").strip() == "verified_solve":
            return row
    raise ValueError(f"verified_solve row not found in {path}")


def extract_final_paired_row(repo_root: Path, comparison: ComparisonSpec) -> dict[str, object]:
    relative_path, schema = PAIRWISE_SOURCE_FILES[comparison.name]
    source_path = repo_root / relative_path
    row = find_verified_solve_row(source_path)

    if schema == "left_right":
        file_left = row["left_condition"]
        file_right = row["right_condition"]
        if file_left == comparison.left_condition and file_right == comparison.right_condition:
            left_solves = int(row["left_count"])
            right_solves = int(row["right_count"])
            left_only = int(row["left_only"])
            right_only = int(row["right_only"])
        elif file_left == comparison.right_condition and file_right == comparison.left_condition:
            left_solves = int(row["right_count"])
            right_solves = int(row["left_count"])
            left_only = int(row["right_only"])
            right_only = int(row["left_only"])
        else:
            raise ValueError(
                f"Unexpected file orientation in {source_path}: {file_left}/{file_right} does not match {comparison.left_condition}/{comparison.right_condition}"
            )
        both_true = int(row["both_true"])
        both_false = int(row["both_false"])
    elif schema == "d_vs_shuffled":
        left_solves = int(row["d_count"])
        right_solves = int(row["d_shuffled_count"])
        left_only = int(row["d_only"])
        right_only = int(row["shuffled_only"])
        both_true = int(row["both_true"])
        both_false = int(row["both_false"])
    else:
        raise ValueError(f"Unknown schema {schema}")

    ties = both_true + both_false
    discordant = left_only + right_only
    exact_p = exact_two_sided_sign_pvalue(left_only, right_only)
    return {
        "Comparison": comparison.name,
        "Left condition": comparison.left_condition,
        "Right condition": comparison.right_condition,
        "Left solves": left_solves,
        "Right solves": right_solves,
        "Left-only": left_only,
        "Right-only": right_only,
        "Ties": ties,
        "Discordant": discordant,
        "Exact p": format_pvalue(exact_p),
    }


def write_final_paired_tests(out_path: Path, repo_root: Path) -> list[dict[str, object]]:
    rows = [extract_final_paired_row(repo_root, comparison) for comparison in COMPARISONS]
    fieldnames = [
        "Comparison",
        "Left condition",
        "Right condition",
        "Left solves",
        "Right solves",
        "Left-only",
        "Right-only",
        "Ties",
        "Discordant",
        "Exact p",
    ]
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return rows


def write_bootstrap_cis(
    out_path: Path,
    all_rows: list[dict[str, object]],
    bootstrap_samples: int,
    seed: int,
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for comparison_offset, comparison in enumerate(COMPARISONS):
        paired_units = build_paired_units(all_rows, comparison.left_condition, comparison.right_condition)
        if len(paired_units) != 60:
            raise ValueError(f"Expected 60 paired units for {comparison.name}, found {len(paired_units)}")

        for metric_offset, metric in enumerate(METRICS):
            differences = []
            left_total = 0
            right_total = 0
            for _, left_row, right_row in paired_units:
                left_value = 1 if left_row[metric.field] else 0
                right_value = 1 if right_row[metric.field] else 0
                left_total += left_value
                right_total += right_value
                differences.append(left_value - right_value)
            difference = (left_total / len(paired_units)) - (right_total / len(paired_units))
            ci_low, ci_high = bootstrap_ci(
                differences,
                bootstrap_samples,
                seed + comparison_offset * 100 + metric_offset,
            )
            rows.append(
                {
                    "Comparison": comparison.name,
                    "Metric": metric.name,
                    "Difference": format_rate(difference),
                    "CI low": format_rate(ci_low),
                    "CI high": format_rate(ci_high),
                }
            )

    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Comparison", "Metric", "Difference", "CI low", "CI high"])
        writer.writeheader()
        writer.writerows(rows)
    return rows


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parent.parent
    args.out_root.mkdir(parents=True, exist_ok=True)

    stage2_rows = load_stage2_rows(args.stage2_records)
    b2_rows = load_stage3_condition_rows(args.stage3_results_root, args.stage3_candidates_root, "agent_b2")
    d_shuffled_rows = load_stage3_condition_rows(
        args.stage3_d_shuffled_results_root,
        args.stage3_d_shuffled_candidates_root,
        "agent_d_shuffled",
    )
    all_rows = stage2_rows + b2_rows + d_shuffled_rows

    final_paired_tests_path = args.out_root / "final_paired_tests.csv"
    paired_bootstrap_cis_path = args.out_root / "paired_bootstrap_cis.csv"
    paired_test_rows = write_final_paired_tests(final_paired_tests_path, repo_root)
    bootstrap_rows = write_bootstrap_cis(paired_bootstrap_cis_path, all_rows, args.bootstrap_samples, args.seed)

    d_vs_b = next(row for row in paired_test_rows if row["Comparison"] == "D vs B")
    print(
        json.dumps(
            {
                "final_paired_tests": str(final_paired_tests_path),
                "paired_bootstrap_cis": str(paired_bootstrap_cis_path),
                "d_vs_b": d_vs_b,
                "n_bootstrap_rows": len(bootstrap_rows),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
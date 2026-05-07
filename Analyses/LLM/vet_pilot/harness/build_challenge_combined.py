#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_CONDITIONS = ("agent_a", "agent_b", "agent_c")
SUMMARY_FIELDNAMES = [
    "file",
    "task",
    "candidate",
    "patch_applied",
    "verified_solve",
    "false_completion",
    "failure_type",
    "test_returncode",
    "changed_files",
    "duration_sec",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tasks-root", type=Path, default=REPO_ROOT / "tasks/challenge")
    parser.add_argument("--stage5-results-root", type=Path, default=REPO_ROOT / "results/challenge_json")
    parser.add_argument("--stage5-status-root", type=Path, default=REPO_ROOT / "candidates/challenge_json")
    parser.add_argument("--stage6-results-root", type=Path, default=REPO_ROOT / "results/challenge_json_repaired")
    parser.add_argument("--stage6-status-root", type=Path, default=REPO_ROOT / "candidates/challenge_json_repaired")
    parser.add_argument("--out-root", type=Path, default=REPO_ROOT / "results/challenge_combined")
    parser.add_argument("--condition", action="append", choices=DEFAULT_CONDITIONS)
    parser.add_argument("--task", action="append", help="Task directory name under tasks/challenge")
    return parser.parse_args()


def read_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def read_status(path: Path) -> str | None:
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8").strip()


def status_is_schema_usable(status: str | None) -> bool:
    return bool(status) and status.startswith("ok")


def changed_files_value(payload: dict[str, object]) -> str | None:
    changed_files = payload.get("changed_files")
    if isinstance(changed_files, list):
        return ";".join(str(path) for path in changed_files)
    return None


def relative_to_repo(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def final_outcome(payload: dict[str, object]) -> str:
    if payload.get("verified_solve") is True:
        return "solve"
    failure_type = payload.get("failure_type")
    if failure_type:
        return str(failure_type)
    if payload.get("patch_applied") is True:
        return "applied_not_solved"
    return "unknown"


def choose_result(
    stage5_status: str | None,
    stage5_result: Path,
    stage6_status: str | None,
    stage6_result: Path,
) -> tuple[str, Path, str | None]:
    if status_is_schema_usable(stage5_status):
        return "stage5", stage5_result, stage5_status
    if stage5_status and stage5_status.startswith("invalid_schema"):
        if not stage6_result.exists():
            raise FileNotFoundError(f"Missing Stage 6 result for invalid-schema task: {stage6_result}")
        return "stage6", stage6_result, stage6_status
    return "stage5", stage5_result, stage5_status


def write_summary_csv(out_path: Path, rows: list[dict[str, object]]) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=SUMMARY_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_summary_json(out_path: Path, rows: list[dict[str, object]]) -> None:
    n = len(rows)
    applied = sum(1 for row in rows if row["patch_applied"] is True)
    solved = sum(1 for row in rows if row["verified_solve"] is True)
    false_completed = sum(1 for row in rows if row["false_completion"] is True)
    failure_type_counts: dict[str, int] = {}
    for row in rows:
        failure_type = row.get("failure_type")
        if not failure_type:
            continue
        failure_type_str = str(failure_type)
        failure_type_counts[failure_type_str] = failure_type_counts.get(failure_type_str, 0) + 1
    summary = {
        "n": n,
        "valid_patch_rate": applied / n if n else None,
        "verified_solve_rate": solved / n if n else None,
        "conditional_solve_rate": solved / applied if applied else None,
        "false_completion_rate": false_completed / n if n else None,
        "patch_applied_count": applied,
        "verified_solve_count": solved,
        "false_completion_count": false_completed,
        "failure_type_counts": failure_type_counts,
    }
    out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()
    conditions = args.condition or list(DEFAULT_CONDITIONS)
    tasks = args.task or sorted(path.name for path in args.tasks_root.iterdir() if path.is_dir())
    out_root = args.out_root
    out_root.mkdir(parents=True, exist_ok=True)

    per_condition_rows: dict[str, list[dict[str, object]]] = {condition: [] for condition in conditions}
    matrix_rows: list[dict[str, object]] = []
    interface_rows: list[dict[str, object]] = []
    task_matrix: dict[str, dict[str, dict[str, object]]] = {task: {} for task in tasks}

    for condition in conditions:
        condition_out_dir = out_root / condition
        condition_out_dir.mkdir(parents=True, exist_ok=True)

        for task in tasks:
            stage5_result = args.stage5_results_root / condition / f"{task}.json"
            stage6_result = args.stage6_results_root / condition / f"{task}.json"
            stage5_status = read_status(args.stage5_status_root / condition / "status" / f"{task}.txt")
            stage6_status = read_status(args.stage6_status_root / condition / "status" / f"{task}.txt")

            if not stage5_result.exists():
                raise FileNotFoundError(f"Missing Stage 5 result: {stage5_result}")

            chosen_source, chosen_result_path, chosen_status = choose_result(
                stage5_status,
                stage5_result,
                stage6_status,
                stage6_result,
            )
            chosen_payload = read_json(chosen_result_path)
            chosen_payload["combined_source"] = chosen_source
            chosen_payload["stage5_status"] = stage5_status
            chosen_payload["stage6_status"] = stage6_status
            chosen_payload["schema_usable"] = status_is_schema_usable(chosen_status)
            chosen_payload["semantic_failure_after_apply"] = (
                chosen_payload.get("patch_applied") is True and chosen_payload.get("verified_solve") is not True
            )

            out_result_path = condition_out_dir / f"{task}.json"
            out_result_path.write_text(json.dumps(chosen_payload, indent=2), encoding="utf-8")

            summary_row = {
                "file": relative_to_repo(out_result_path),
                "task": chosen_payload.get("task"),
                "candidate": chosen_payload.get("candidate"),
                "patch_applied": chosen_payload.get("patch_applied"),
                "verified_solve": chosen_payload.get("verified_solve"),
                "false_completion": chosen_payload.get("false_completion"),
                "failure_type": chosen_payload.get("failure_type"),
                "test_returncode": chosen_payload.get("test_returncode"),
                "changed_files": changed_files_value(chosen_payload),
                "duration_sec": chosen_payload.get("duration_sec"),
            }
            per_condition_rows[condition].append(summary_row)

            row = {
                "condition": condition,
                "task": task,
                "chosen_source": chosen_source,
                "stage5_status": stage5_status,
                "stage6_status": stage6_status,
                "schema_usable": chosen_payload["schema_usable"],
                "patch_applied": chosen_payload.get("patch_applied"),
                "verified_solve": chosen_payload.get("verified_solve"),
                "semantic_failure_after_apply": chosen_payload["semantic_failure_after_apply"],
                "false_completion": chosen_payload.get("false_completion"),
                "failure_type": chosen_payload.get("failure_type"),
                "outcome": final_outcome(chosen_payload),
                "result_file": relative_to_repo(out_result_path),
            }
            matrix_rows.append(row)
            task_matrix[task][condition] = row

        summary_csv_path = out_root / f"{condition}_summary.csv"
        write_summary_csv(summary_csv_path, per_condition_rows[condition])
        write_summary_json(summary_csv_path.with_suffix(".summary.json"), per_condition_rows[condition])

        raw_tasks = len(tasks)
        schema_usable = sum(1 for row in matrix_rows if row["condition"] == condition and row["schema_usable"] is True)
        patch_applied = sum(1 for row in matrix_rows if row["condition"] == condition and row["patch_applied"] is True)
        verified_solve = sum(1 for row in matrix_rows if row["condition"] == condition and row["verified_solve"] is True)
        semantic_failure_after_apply = sum(
            1
            for row in matrix_rows
            if row["condition"] == condition and row["semantic_failure_after_apply"] is True
        )
        interface_rows.append({
            "condition": condition,
            "raw_tasks": raw_tasks,
            "schema_usable": schema_usable,
            "patch_applied": patch_applied,
            "verified_solve": verified_solve,
            "semantic_failure_after_apply": semantic_failure_after_apply,
        })

    matrix_path = out_root / "combined_matrix.csv"
    matrix_fieldnames = [
        "task",
        "agent_a_outcome",
        "agent_a_source",
        "agent_a_schema_usable",
        "agent_b_outcome",
        "agent_b_source",
        "agent_b_schema_usable",
        "agent_c_outcome",
        "agent_c_source",
        "agent_c_schema_usable",
    ]
    with matrix_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=matrix_fieldnames)
        writer.writeheader()
        for task in tasks:
            writer.writerow({
                "task": task,
                "agent_a_outcome": task_matrix[task].get("agent_a", {}).get("outcome"),
                "agent_a_source": task_matrix[task].get("agent_a", {}).get("chosen_source"),
                "agent_a_schema_usable": task_matrix[task].get("agent_a", {}).get("schema_usable"),
                "agent_b_outcome": task_matrix[task].get("agent_b", {}).get("outcome"),
                "agent_b_source": task_matrix[task].get("agent_b", {}).get("chosen_source"),
                "agent_b_schema_usable": task_matrix[task].get("agent_b", {}).get("schema_usable"),
                "agent_c_outcome": task_matrix[task].get("agent_c", {}).get("outcome"),
                "agent_c_source": task_matrix[task].get("agent_c", {}).get("chosen_source"),
                "agent_c_schema_usable": task_matrix[task].get("agent_c", {}).get("schema_usable"),
            })

    interface_path = out_root / "interface_adjusted_metrics.csv"
    with interface_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "condition",
                "raw_tasks",
                "schema_usable",
                "patch_applied",
                "verified_solve",
                "semantic_failure_after_apply",
            ],
        )
        writer.writeheader()
        writer.writerows(interface_rows)

    print(json.dumps({
        "out_root": relative_to_repo(out_root),
        "conditions": conditions,
        "tasks": tasks,
        "interface_adjusted_metrics": interface_rows,
    }, indent=2))


if __name__ == "__main__":
    main()
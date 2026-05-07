#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path


CONDITIONS = ["agent_a", "agent_b", "agent_c", "agent_d"]
SCHEMA_USABLE_STATUSES = {"ok", "ok_repaired_edits_dict_to_list", "no_effective_changes"}
STAGE2_COMPLETE = "Stage 2C: 240-run model expansion — PASSED"
STAGE2_IN_PROGRESS = "Stage 2C: 240-run model expansion — IN PROGRESS"
STAGE2_NEXT = "Stage 2C: 240-run model expansion — NEXT"
PAPER_TITLE = "Do Verified Trajectories Improve Software-Agent Reliability?"
PAPER_SUBTITLE = "A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--results-root", type=Path, default=Path("results/vet_scaling_stage2"))
    parser.add_argument("--candidates-root", type=Path, default=Path("candidates/vet_scaling_stage2"))
    parser.add_argument("--model", default="")
    parser.add_argument("--model-transport", default="")
    return parser.parse_args()


def normalize_status(text: str) -> str:
    value = text.strip()
    if value.startswith("invalid_json"):
        return "invalid_json"
    if value.startswith("invalid_schema"):
        return "invalid_schema"
    if value.startswith("rejected"):
        return "rejected"
    return value


def parse_bool_text(value: str | None) -> bool | None:
    if value is None:
        return None
    stripped = value.strip().lower()
    if stripped in {"true", "1", "yes", "y"}:
        return True
    if stripped in {"false", "0", "no", "n"}:
        return False
    return None


def format_bool(value: bool | None) -> str:
    if value is True:
        return "true"
    if value is False:
        return "false"
    return ""


def format_rate(value: float) -> str:
    return f"{value:.2f}"


def format_diff(value: float) -> str:
    return f"{value:+.2f}"


def classify_task_outcome(agent_b_solves: int, agent_d_solves: int) -> str:
    if agent_d_solves > agent_b_solves:
        return "D wins"
    if agent_b_solves > agent_d_solves:
        return "B wins"
    if agent_b_solves == 0:
        return "neither"
    return "tie"


def load_json(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def json_is_valid(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return False
    if not isinstance(payload, dict):
        return False
    edits = payload.get("edits")
    return "claim_solved" in payload and isinstance(edits, list)


def load_annotations(path: Path) -> dict[tuple[str, str, str], dict[str, str]]:
    records: dict[tuple[str, str, str], dict[str, str]] = {}
    if not path.exists() or not path.read_text(encoding="utf-8").strip():
        return records

    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rep = (row.get("rep") or "").strip()
            task = (row.get("task") or "").strip()
            condition = (row.get("condition") or "").strip()
            if not rep or not task or not condition:
                continue
            records[(rep, task, condition)] = {
                "recovery_observed": (row.get("recovery_observed") or "").strip(),
                "trajectory_use_observed": (row.get("trajectory_use_observed") or "").strip(),
                "evidence": ((row.get("evidence") or row.get("recovery_evidence") or "").strip()),
                "notes": (row.get("notes") or "").strip(),
            }
    return records


def collect_tasks(results_root: Path) -> list[str]:
    tasks: set[str] = set()
    for rep_dir in results_root.glob("rep_*"):
        if not rep_dir.is_dir():
            continue
        for condition in CONDITIONS:
            for result_path in (rep_dir / condition).glob("challenge_*.json"):
                tasks.add(result_path.stem)
    return sorted(tasks)


def rate(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0


def annotation_present(row: dict[str, object]) -> bool:
    return any(
        str(row[field]).strip()
        for field in ("recovery_observed", "trajectory_use_observed", "evidence", "notes")
    )


def stage2_status(tasks: list[str], reps: list[str], records: list[dict[str, object]]) -> str:
    if len(tasks) == 30 and len(reps) == 2 and len(records) == 240:
        return STAGE2_COMPLETE
    if records:
        return STAGE2_IN_PROGRESS
    return STAGE2_NEXT


def main() -> None:
    args = parse_args()
    results_root = args.results_root
    candidates_root = args.candidates_root
    annotations_path = results_root / "recovery_annotations.csv"
    annotations = load_annotations(annotations_path)
    reps = sorted(path.name for path in results_root.glob("rep_*") if path.is_dir())
    tasks = collect_tasks(results_root)

    records: list[dict[str, object]] = []
    for rep in reps:
        for task in tasks:
            for condition in CONDITIONS:
                raw_path = candidates_root / rep / condition / "raw" / f"{task}.json"
                status_path = candidates_root / rep / condition / "status" / f"{task}.txt"
                result_path = results_root / rep / condition / f"{task}.json"
                if not raw_path.exists() and not status_path.exists() and not result_path.exists():
                    continue

                result = load_json(result_path)
                annotation = annotations.get((rep, task, condition), {
                    "recovery_observed": "",
                    "trajectory_use_observed": "",
                    "evidence": "",
                    "notes": "",
                })
                status_text = status_path.read_text(encoding="utf-8").strip() if status_path.exists() else ""
                status = normalize_status(status_text) if status_text else "missing"
                patch_applied = result.get("patch_applied") if isinstance(result.get("patch_applied"), bool) else None
                verified_solve = result.get("verified_solve") if isinstance(result.get("verified_solve"), bool) else None
                false_completion = result.get("false_completion") if isinstance(result.get("false_completion"), bool) else None
                failure_type = result.get("failure_type")
                failure_type_text = "" if failure_type is None else str(failure_type)

                records.append({
                    "rep": rep,
                    "task": task,
                    "condition": condition,
                    "json_valid": json_is_valid(raw_path),
                    "status": status,
                    "schema_usable": status in SCHEMA_USABLE_STATUSES,
                    "patch_applied": patch_applied,
                    "verified_solve": verified_solve,
                    "false_completion": false_completion,
                    "failure_type": failure_type_text,
                    "recovery_observed": annotation["recovery_observed"],
                    "trajectory_use_observed": annotation["trajectory_use_observed"],
                    "evidence": annotation["evidence"],
                    "notes": annotation["notes"],
                })

    records.sort(key=lambda row: (str(row["rep"]), str(row["task"]), str(row["condition"])))

    records_path = results_root / "stage2_records.csv"
    with records_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "rep",
            "task",
            "condition",
            "json_valid",
            "status",
            "patch_applied",
            "verified_solve",
            "false_completion",
            "failure_type",
            "recovery_observed",
            "trajectory_use_observed",
            "evidence",
            "notes",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in records:
            writer.writerow({
                "rep": row["rep"],
                "task": row["task"],
                "condition": row["condition"],
                "json_valid": format_bool(row["json_valid"]),
                "status": row["status"],
                "patch_applied": format_bool(row["patch_applied"]),
                "verified_solve": format_bool(row["verified_solve"]),
                "false_completion": format_bool(row["false_completion"]),
                "failure_type": row["failure_type"],
                "recovery_observed": row["recovery_observed"],
                "trajectory_use_observed": row["trajectory_use_observed"],
                "evidence": row["evidence"],
                "notes": row["notes"],
            })

    with annotations_path.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "rep",
            "task",
            "condition",
            "recovery_observed",
            "trajectory_use_observed",
            "evidence",
            "notes",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in records:
            writer.writerow({
                "rep": row["rep"],
                "task": row["task"],
                "condition": row["condition"],
                "recovery_observed": row["recovery_observed"],
                "trajectory_use_observed": row["trajectory_use_observed"],
                "evidence": row["evidence"],
                "notes": row["notes"],
            })

    def summarize(group_key: str) -> list[dict[str, object]]:
        grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
        for row in records:
            grouped[str(row[group_key])].append(row)

        rows: list[dict[str, object]] = []
        for key in sorted(grouped):
            group_rows = grouped[key]
            n = len(group_rows)
            json_valid_count = sum(1 for row in group_rows if row["json_valid"] is True)
            schema_usable_count = sum(1 for row in group_rows if row["schema_usable"] is True)
            patch_applied_count = sum(1 for row in group_rows if row["patch_applied"] is True)
            verified_solve_count = sum(1 for row in group_rows if row["verified_solve"] is True)
            false_completion_count = sum(1 for row in group_rows if row["false_completion"] is True)
            recovery_observed_count = sum(1 for row in group_rows if parse_bool_text(str(row["recovery_observed"])) is True)
            trajectory_use_observed_count = sum(1 for row in group_rows if parse_bool_text(str(row["trajectory_use_observed"])) is True)
            annotation_row_count = sum(1 for row in group_rows if annotation_present(row))
            rows.append({
                group_key: key,
                "n_runs": n,
                "json_valid_rate": rate(json_valid_count, n),
                "schema_usable_rate": rate(schema_usable_count, n),
                "patch_applied_rate": rate(patch_applied_count, n),
                "verified_solve_rate": rate(verified_solve_count, n),
                "solve_if_applied": rate(verified_solve_count, patch_applied_count),
                "false_completion_rate": rate(false_completion_count, n),
                "recovery_observed_rate": rate(recovery_observed_count, n),
                "recovery_observed_count": recovery_observed_count,
                "annotation_row_count": annotation_row_count,
                "annotation_coverage_rate": rate(annotation_row_count, n),
                "trajectory_use_observed_count": trajectory_use_observed_count,
            })
        return rows

    summary_by_condition = summarize("condition")
    summary_by_task = summarize("task")

    for path, fieldnames, rows in [
        (
            results_root / "summary_by_condition.csv",
            [
                "condition",
                "n_runs",
                "json_valid_rate",
                "schema_usable_rate",
                "patch_applied_rate",
                "verified_solve_rate",
                "solve_if_applied",
                "false_completion_rate",
                "recovery_observed_rate",
                "recovery_observed_count",
                "annotation_row_count",
                "annotation_coverage_rate",
                "trajectory_use_observed_count",
            ],
            summary_by_condition,
        ),
        (
            results_root / "summary_by_task.csv",
            [
                "task",
                "n_runs",
                "json_valid_rate",
                "schema_usable_rate",
                "patch_applied_rate",
                "verified_solve_rate",
                "solve_if_applied",
                "false_completion_rate",
                "recovery_observed_rate",
                "recovery_observed_count",
                "annotation_row_count",
                "annotation_coverage_rate",
                "trajectory_use_observed_count",
            ],
            summary_by_task,
        ),
    ]:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    solve_breakdown: dict[str, dict[str, str]] = defaultdict(dict)
    for task in tasks:
        for condition in CONDITIONS:
            task_condition_rows = [row for row in records if row["task"] == task and row["condition"] == condition]
            solved = sum(1 for row in task_condition_rows if row["verified_solve"] is True)
            solve_breakdown[task][condition] = f"{solved}/{len(task_condition_rows)} solve"

    comparison = {row["condition"]: row for row in summary_by_condition}
    agent_b = comparison.get("agent_b")
    agent_d = comparison.get("agent_d")

    headline_rows: list[dict[str, str]] = []
    if agent_b and agent_d:
        headline_rows = [
            {
                "metric": "Verified solve",
                "agent_b": format_rate(float(agent_b["verified_solve_rate"])),
                "agent_d": format_rate(float(agent_d["verified_solve_rate"])),
                "difference": format_diff(float(agent_d["verified_solve_rate"]) - float(agent_b["verified_solve_rate"])),
            },
            {
                "metric": "Patch applied",
                "agent_b": format_rate(float(agent_b["patch_applied_rate"])),
                "agent_d": format_rate(float(agent_d["patch_applied_rate"])),
                "difference": format_diff(float(agent_d["patch_applied_rate"]) - float(agent_b["patch_applied_rate"])),
            },
            {
                "metric": "False completion",
                "agent_b": format_rate(float(agent_b["false_completion_rate"])),
                "agent_d": format_rate(float(agent_d["false_completion_rate"])),
                "difference": format_diff(float(agent_d["false_completion_rate"]) - float(agent_b["false_completion_rate"])),
            },
            {
                "metric": "JSON valid",
                "agent_b": format_rate(float(agent_b["json_valid_rate"])),
                "agent_d": format_rate(float(agent_d["json_valid_rate"])),
                "difference": format_diff(float(agent_d["json_valid_rate"]) - float(agent_b["json_valid_rate"])),
            },
            {
                "metric": "Schema usable",
                "agent_b": format_rate(float(agent_b["schema_usable_rate"])),
                "agent_d": format_rate(float(agent_d["schema_usable_rate"])),
                "difference": format_diff(float(agent_d["schema_usable_rate"]) - float(agent_b["schema_usable_rate"])),
            },
            {
                "metric": "Recovery observed",
                "agent_b": format_rate(float(agent_b["recovery_observed_rate"])),
                "agent_d": format_rate(float(agent_d["recovery_observed_rate"])),
                "difference": format_diff(float(agent_d["recovery_observed_rate"]) - float(agent_b["recovery_observed_rate"])),
            },
        ]

    headline_path = results_root / "headline_b_vs_d.csv"
    with headline_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["metric", "agent_b_final_patch", "agent_d_full_trajectory", "difference"])
        writer.writeheader()
        for row in headline_rows:
            writer.writerow({
                "metric": row["metric"],
                "agent_b_final_patch": row["agent_b"],
                "agent_d_full_trajectory": row["agent_d"],
                "difference": row["difference"],
            })

    outcome_counts = {"D wins": 0, "B wins": 0, "tie": 0, "neither": 0}
    task_level_rows: list[dict[str, str]] = []
    for task in tasks:
        agent_b_rows = [row for row in records if row["task"] == task and row["condition"] == "agent_b"]
        agent_d_rows = [row for row in records if row["task"] == task and row["condition"] == "agent_d"]
        agent_b_solves = sum(1 for row in agent_b_rows if row["verified_solve"] is True)
        agent_d_solves = sum(1 for row in agent_d_rows if row["verified_solve"] is True)
        outcome = classify_task_outcome(agent_b_solves, agent_d_solves)
        outcome_counts[outcome] += 1
        task_level_rows.append({
            "task": task,
            "agent_b": f"{agent_b_solves}/{len(agent_b_rows)} solve",
            "agent_d": f"{agent_d_solves}/{len(agent_d_rows)} solve",
            "outcome": outcome,
        })

    task_level_path = results_root / "task_level_b_vs_d.csv"
    with task_level_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["task", "agent_b_final_patch", "agent_d_full_trajectory", "outcome"])
        writer.writeheader()
        for row in task_level_rows:
            writer.writerow({
                "task": row["task"],
                "agent_b_final_patch": row["agent_b"],
                "agent_d_full_trajectory": row["agent_d"],
                "outcome": row["outcome"],
            })

    stage_status = stage2_status(tasks, reps, records)
    annotated_rows = sum(1 for row in records if annotation_present(row))
    lines = [
        "# Stage 2 Summary",
        "",
        f"Status: {stage_status}",
        f"Paper title: {PAPER_TITLE}",
        f"Subtitle: {PAPER_SUBTITLE}",
        "",
        f"Model: `{args.model}`" if args.model else "Model: unknown",
        f"Backend: `{args.model_transport}`" if args.model_transport else "Backend: unknown",
        f"Replications: {', '.join(reps) if reps else 'none'}",
        f"Tasks: {len(tasks)}",
        f"Run records: {len(records)}",
        (
            f"Recovery coding coverage: {annotated_rows}/{len(records)} rows annotated; "
            "recovery metrics below are lower bounds until Stage 2D coding is complete."
            if records and annotated_rows < len(records)
            else f"Recovery coding coverage: {annotated_rows}/{len(records)} rows annotated."
        ),
        "",
        "## Primary Comparison: Agent D vs Agent B",
        "",
        "| Metric | Agent B: final patch | Agent D: full trajectory | Difference |",
        "| --- | ---: | ---: | ---: |",
    ]
    for row in headline_rows:
        lines.append(f"| {row['metric']} | {row['agent_b']} | {row['agent_d']} | {row['difference']} |")

    lines.extend([
        "",
        "Desired direction:",
        "- Verified solve: Agent D higher",
        "- Patch applied: Agent D higher",
        "- False completion: Agent D lower",
        "- JSON valid and schema usable: Agent D equal or higher",
        "- Recovery observed: Agent D higher",
        "",
        "## Summary by Condition",
        "",
        "| Condition | Runs | JSON valid | Schema usable | Patch applied | Verified solve | Solve if applied | False completion | Recovery observed | Annotated rows |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ])
    for row in summary_by_condition:
        lines.append(
            f"| {row['condition']} | {row['n_runs']} | {row['json_valid_rate']:.3f} | {row['schema_usable_rate']:.3f} | {row['patch_applied_rate']:.3f} | {row['verified_solve_rate']:.3f} | {row['solve_if_applied']:.3f} | {row['false_completion_rate']:.3f} | {row['recovery_observed_rate']:.3f} | {row['annotation_row_count']}/{row['n_runs']} |"
        )

    lines.extend([
        "",
        "## Task Breakdown",
        "",
        "| Task | Agent A | Agent B | Agent C | Agent D |",
        "| --- | --- | --- | --- | --- |",
    ])
    for task in tasks:
        lines.append(
            f"| {task} | {solve_breakdown[task].get('agent_a', '0/0 solve')} | {solve_breakdown[task].get('agent_b', '0/0 solve')} | {solve_breakdown[task].get('agent_c', '0/0 solve')} | {solve_breakdown[task].get('agent_d', '0/0 solve')} |"
        )

    lines.extend([
        "",
        "## Task-Level Agent B vs Agent D",
        "",
        "| Task | Agent B: final patch | Agent D: full trajectory | Outcome |",
        "| --- | --- | --- | --- |",
    ])
    for row in task_level_rows:
        lines.append(f"| {row['task']} | {row['agent_b']} | {row['agent_d']} | {row['outcome']} |")

    lines.extend([
        "",
        f"Outcome totals: D wins {outcome_counts['D wins']}; B wins {outcome_counts['B wins']}; tie {outcome_counts['tie']}; neither {outcome_counts['neither']}.",
        "",
        "## Interpretation Discipline",
        "",
        "Primary claim: Agent D versus Agent B.",
        "Secondary exploratory claim: the full A/B/C/D ordering, reported with caution because the Stage 1 pilot did not support a stable monotonic ranking.",
    ])

    summary_path = results_root / "stage2_summary.md"
    summary_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps({
        "stage2_records": str(records_path),
        "summary_by_condition": str(results_root / "summary_by_condition.csv"),
        "summary_by_task": str(results_root / "summary_by_task.csv"),
        "headline_b_vs_d": str(headline_path),
        "task_level_b_vs_d": str(task_level_path),
        "recovery_annotations": str(annotations_path),
        "stage2_summary": str(summary_path),
        "n_records": len(records),
    }, indent=2))


if __name__ == "__main__":
    main()
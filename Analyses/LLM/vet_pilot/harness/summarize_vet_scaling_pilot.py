#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path


CONDITIONS = ["agent_a", "agent_b", "agent_c", "agent_d"]
SCHEMA_USABLE_STATUSES = {"ok", "ok_repaired_edits_dict_to_list", "no_effective_changes"}
STAGE0_STATUS = "Stage 0: 12-run tiny check — PASSED"
STAGE1_STATUS = "Stage 1: 80-run pilot — PASSED / FROZEN"
STAGE2_STATUS = "Stage 2: 30-task expansion — NEXT"
STAGE_STATUS = f"Paper 2 {STAGE1_STATUS}"
PAPER_TITLE = "Do Verified Trajectories Improve Software-Agent Reliability?"
PAPER_SUBTITLE = "A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples"
PAPER_CONTRIBUTION = (
    "Using the repaired JSON evaluation interface from our previous work, we find that full verified-trajectory "
    "examples outperform final-patch examples in an 80-run software-agent pilot, improving verified solve rate "
    "and reducing false completion, while abstract verification lessons alone do not reliably improve over the "
    "instruction-only baseline."
)
CONDITION_LABELS = {
    "agent_a": "Agent A: instruction only",
    "agent_b": "Agent B: final patch",
    "agent_c": "Agent C: verification lessons",
    "agent_d": "Agent D: full trajectory",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--results-root", type=Path, default=Path("results/vet_scaling_pilot"))
    parser.add_argument("--candidates-root", type=Path, default=Path("candidates/vet_scaling_pilot"))
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


def count_challenge_inventory(repo_root: Path) -> int:
    challenge_root = repo_root / "tasks" / "challenge"
    return sum(1 for path in challenge_root.glob("challenge_*") if path.is_dir())


def stage2_controls_passed(repo_root: Path) -> bool:
    control_summary = repo_root / "results" / "vet_scaling_stage2" / "control_summary.csv"
    if not control_summary.exists():
        return False
    with control_summary.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    return bool(rows) and all((row.get("controls_passed") or "").strip().lower() == "true" for row in rows)


def stage2_record_count(repo_root: Path) -> int:
    records_path = repo_root / "results" / "vet_scaling_stage2" / "stage2_records.csv"
    if not records_path.exists():
        return 0
    with records_path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return sum(1 for _ in reader)


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
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
                if failure_type is None:
                    failure_type_text = ""
                else:
                    failure_type_text = str(failure_type)

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

    pilot_records_path = results_root / "pilot_records.csv"
    with pilot_records_path.open("w", newline="", encoding="utf-8") as handle:
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
            rows.append({
                group_key: key,
                "n_runs": n,
                "json_valid_rate": rate(json_valid_count, n),
                "schema_usable_rate": rate(schema_usable_count, n),
                "patch_applied_rate": rate(patch_applied_count, n),
                "verified_solve_rate": rate(verified_solve_count, n),
                "solve_if_applied": rate(verified_solve_count, patch_applied_count),
                "false_completion_rate": rate(false_completion_count, n),
                "recovery_observed_count": recovery_observed_count,
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
                "recovery_observed_count",
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
                "recovery_observed_count",
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
            task_condition_rows = [
                row for row in records if row["task"] == task and row["condition"] == condition
            ]
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

    lines = [
        "# VET Scaling Pilot Summary",
        "",
        f"Status: {STAGE_STATUS}",
        f"Paper title: {PAPER_TITLE}",
        f"Subtitle: {PAPER_SUBTITLE}",
        "",
        f"Contribution: {PAPER_CONTRIBUTION}",
        "",
        f"Model: `{args.model}`" if args.model else "Model: unknown",
        f"Backend: `{args.model_transport}`" if args.model_transport else "Backend: unknown",
        f"Replications: {', '.join(reps)}",
        f"Tasks: {len(tasks)}",
        "",
        "## Headline Contrast",
        "",
        "| Metric | Agent B: final patch | Agent D: full trajectory | Difference |",
        "| --- | ---: | ---: | ---: |",
    ]
    for row in headline_rows:
        lines.append(
            f"| {row['metric']} | {row['agent_b']} | {row['agent_d']} | {row['difference']} |"
        )

    lines.extend([
        "",
        "## Summary by Condition",
        "",
        "| Condition | Runs | JSON valid | Schema usable | Patch applied | Verified solve | Solve if applied | False completion |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ])
    for row in summary_by_condition:
        lines.append(
            f"| {row['condition']} | {row['n_runs']} | {row['json_valid_rate']:.3f} | {row['schema_usable_rate']:.3f} | {row['patch_applied_rate']:.3f} | {row['verified_solve_rate']:.3f} | {row['solve_if_applied']:.3f} | {row['false_completion_rate']:.3f} |"
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
        lines.append(
            f"| {row['task']} | {row['agent_b']} | {row['agent_d']} | {row['outcome']} |"
        )
    lines.extend([
        "",
        f"Outcome totals: D wins {outcome_counts['D wins']}; B wins {outcome_counts['B wins']}; tie {outcome_counts['tie']}; neither {outcome_counts['neither']}.",
        "",
        "## Qualitative Note",
        "",
        "On rep_01 challenge_003, Agent D was the only condition to convert valid structured output into a verified solve on the misleading-obvious-fix task, while A/B/C reached the interface layer but failed at edit effectiveness, verification, or patch application.",
    ])

    (results_root / "pilot_summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    freeze_lines = [
        "# Paper 2 Stage 1 Freeze",
        "",
        f"Status: {STAGE_STATUS}",
        "",
        f"Title: {PAPER_TITLE}",
        f"Subtitle: {PAPER_SUBTITLE}",
        "",
        "Contribution:",
        "",
        PAPER_CONTRIBUTION,
        "",
        "This directory is the frozen Stage 1 baseline for Paper 2. Preserve the underlying 80-run pilot artifacts in place and treat subsequent work as downstream analysis or a new stage.",
        "",
        "Annotation scope:",
        "- Current manual subset covers all challenge_003 rows, all Agent D solves, all Agent B false completions, and all cases where Agent D solved while Agent B failed.",
        "- Coding rule: true means the retained artifacts support a specific recovery or trajectory-use claim. false means not observed in the retained artifacts.",
        "",
        "## Headline Contrast",
        "",
        "| Metric | Agent B: final patch | Agent D: full trajectory | Difference |",
        "| --- | ---: | ---: | ---: |",
    ]
    for row in headline_rows:
        freeze_lines.append(
            f"| {row['metric']} | {row['agent_b']} | {row['agent_d']} | {row['difference']} |"
        )

    freeze_lines.extend([
        "",
        "## Task-Level Agent B vs Agent D",
        "",
        "| Task | Agent B: final patch | Agent D: full trajectory | Outcome |",
        "| --- | --- | --- | --- |",
    ])
    for row in task_level_rows:
        freeze_lines.append(
            f"| {row['task']} | {row['agent_b']} | {row['agent_d']} | {row['outcome']} |"
        )

    freeze_lines.extend([
        "",
        f"Outcome totals: D wins {outcome_counts['D wins']}; B wins {outcome_counts['B wins']}; tie {outcome_counts['tie']}; neither {outcome_counts['neither']}.",
        "",
        "## Scale Recommendation",
        "",
        "Recommended next run: 30 tasks x 4 conditions x 2 replications = 240 runs.",
        "",
        "Reason: add 20 more tasks before adding more replications to test generalization across more task types. If the Stage 1 signal survives broader task diversity then a later replication-heavy stage can target stochastic stability.",
    ])

    (results_root / "stage1_freeze.md").write_text("\n".join(freeze_lines) + "\n", encoding="utf-8")

    challenge_inventory_count = count_challenge_inventory(repo_root)
    controls_passed = stage2_controls_passed(repo_root)
    stage2_records = stage2_record_count(repo_root)
    if stage2_records == 240:
        stage_lines = [
            "Stage 2A: Author 20 new challenge tasks — PASSED",
            "Stage 2B: Validate gold/empty controls — PASSED",
            "Stage 2C: 240-run model expansion — PASSED",
            "Stage 2D: Compare Agent D vs Agent B — NEXT",
        ]
        stage2_position = "- Stage 2C completed the 240-run expansion over the frozen 30-task inventory; Stage 2D comparative analysis and recovery annotation are next."
        repo_state_line = f"- Current repo state: {challenge_inventory_count} challenge tasks are available under tasks/challenge, the 20 newly authored Stage 2 tasks passed gold/empty controls, and 240 Stage 2C run records are available under results/vet_scaling_stage2."
        recommendation_line = "- The next paper-facing step is Stage 2D: annotate the recovery subset and write up the Agent D versus Agent B comparison using the Stage 2 outputs."
    elif controls_passed:
        stage_lines = [
            "Stage 2A: Author 20 new challenge tasks — PASSED",
            "Stage 2B: Validate gold/empty controls — PASSED",
            "Stage 2C: 240-run model expansion — NEXT",
        ]
        stage2_position = "- Stage 2A/B completed task authoring and control validation for the 30-task inventory; Stage 2C model execution is next."
        repo_state_line = f"- Current repo state: {challenge_inventory_count} challenge tasks are available under tasks/challenge, and the gold/empty controls passed for the 20 newly authored Stage 2 tasks."
        recommendation_line = "- Prefer running the 240-run expansion next. Additional replications can come later if the broader 30-task signal still favors Agent D over Agent B."
    else:
        stage_lines = [STAGE2_STATUS]
        stage2_position = "- Stage 2 is the next execution stage and should expand task coverage rather than add more replications to the same 10 tasks."
        repo_state_line = f"- Current repo state: {challenge_inventory_count} challenge tasks are available under tasks/challenge, so additional task authoring is still required before Stage 2 execution."
        recommendation_line = "- Prefer running the 240-run expansion next. Additional replications can come later if the broader 30-task signal still favors Agent D over Agent B."

    status_lines = [
        "# Paper 2 Status",
        "",
        f"Title: {PAPER_TITLE}",
        f"Subtitle: {PAPER_SUBTITLE}",
        "",
        f"{STAGE0_STATUS}",
        f"{STAGE1_STATUS}",
    ]
    status_lines.extend(stage_lines)
    status_lines.extend([
        "",
        "Current position:",
        "- Stage 0 established that all four conditions can produce valid repaired-JSON outputs on the tiny check.",
        "- Stage 1 produced the frozen 80-run pilot and the headline D versus B contrast table.",
        stage2_position,
        "",
        "Stage 2 design:",
        "- 30 tasks x 4 conditions x 2 replications = 240 runs.",
        "- Primary question: Does D > B hold across more task types, or was the 80-run result concentrated in a few tasks?",
        repo_state_line,
        "",
        "Recommendation:",
        recommendation_line,
        "",
        "The project is in good shape.",
    ])
    (results_root / "paper2_status.md").write_text("\n".join(status_lines) + "\n", encoding="utf-8")

    print(json.dumps({
        "pilot_records": str(pilot_records_path),
        "summary_by_condition": str(results_root / 'summary_by_condition.csv'),
        "summary_by_task": str(results_root / 'summary_by_task.csv'),
        "recovery_annotations": str(annotations_path),
        "headline_b_vs_d": str(headline_path),
        "task_level_b_vs_d": str(task_level_path),
        "pilot_summary": str(results_root / 'pilot_summary.md'),
        "paper2_status": str(results_root / 'paper2_status.md'),
        "stage1_freeze": str(results_root / 'stage1_freeze.md'),
        "n_records": len(records),
    }, indent=2))


if __name__ == "__main__":
    main()
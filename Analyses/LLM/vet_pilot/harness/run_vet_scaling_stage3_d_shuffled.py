#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
REP_NAMES = ["rep_01", "rep_02"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tasks-root", type=Path, default=REPO_ROOT / "tasks/challenge")
    parser.add_argument("--results-root", type=Path, default=REPO_ROOT / "results/vet_scaling_stage3/d_shuffled")
    parser.add_argument("--candidates-root", type=Path, default=REPO_ROOT / "candidates/vet_scaling_stage3/d_shuffled")
    parser.add_argument(
        "--summary-root",
        type=Path,
        default=REPO_ROOT / "results/vet_scaling_stage3",
        help="Destination for aggregate Stage 3 summary files.",
    )
    parser.add_argument(
        "--prompt",
        type=Path,
        default=REPO_ROOT / "prompts/vet_scaling_stage3/agent_d_shuffled_trajectory.md",
    )
    parser.add_argument("--condition", default="agent_d_shuffled")
    parser.add_argument("--model", default="qwen3-coder:480b-cloud")
    parser.add_argument("--model-transport", choices=["openai-compatible", "ollama-cli"], default="ollama-cli")
    parser.add_argument("--model-timeout", type=int, default=300)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--api-retries", type=int, default=0)
    parser.add_argument("--api-retry-backoff", type=float, default=5.0)
    parser.add_argument("--api-base", default=None)
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--test-cmd", nargs="+")
    parser.add_argument("--task", action="append", help="Optional subset of challenge task directory names.")
    parser.add_argument("--rep", action="append", choices=REP_NAMES, help="Optional subset of replications to run.")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--skip-summary", action="store_true")
    parser.add_argument("--stage2-records", type=Path, default=REPO_ROOT / "results/vet_scaling_stage2/stage2_records.csv")
    parser.add_argument("--task-inventory", type=Path, default=REPO_ROOT / "results/vet_scaling_stage2/task_inventory.csv")
    return parser.parse_args()


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def collect_tasks(tasks_root: Path) -> list[str]:
    return sorted(path.name for path in tasks_root.glob("challenge_*") if path.is_dir())


def ensure_layout(results_root: Path, candidates_root: Path, rep_name: str, condition: str) -> None:
    (results_root / rep_name / condition).mkdir(parents=True, exist_ok=True)
    (candidates_root / rep_name / condition / "raw").mkdir(parents=True, exist_ok=True)
    (candidates_root / rep_name / condition / "patches").mkdir(parents=True, exist_ok=True)
    (candidates_root / rep_name / condition / "status").mkdir(parents=True, exist_ok=True)
    (candidates_root / rep_name / condition / "meta").mkdir(parents=True, exist_ok=True)


def main() -> None:
    args = parse_args()
    tasks = args.task or collect_tasks(args.tasks_root)
    reps = args.rep or REP_NAMES
    prompt_path = args.prompt if args.prompt.is_absolute() else REPO_ROOT / args.prompt

    if not args.task and len(tasks) != 30:
        raise SystemExit(
            json.dumps(
                {
                    "error": "expected_full_stage3_inventory",
                    "task_count": len(tasks),
                    "tasks": tasks,
                },
                indent=2,
            )
        )

    args.results_root.mkdir(parents=True, exist_ok=True)
    args.candidates_root.mkdir(parents=True, exist_ok=True)
    args.summary_root.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, object] = {
        "results_root": str(args.results_root),
        "candidates_root": str(args.candidates_root),
        "summary_root": str(args.summary_root),
        "prompt": str(prompt_path),
        "condition": args.condition,
        "tasks": tasks,
        "replications": [],
        "model": args.model,
        "model_transport": args.model_transport,
    }

    for rep_name in reps:
        ensure_layout(args.results_root, args.candidates_root, rep_name, args.condition)
        rep_results_root = args.results_root / rep_name
        rep_candidates_root = args.candidates_root / rep_name
        command = [
            sys.executable,
            str(SCRIPT_DIR / "run_json_rerun.py"),
            "--condition",
            args.condition,
            "--prompt",
            str(prompt_path),
            "--tasks-root",
            str(args.tasks_root),
            "--results-root",
            str(rep_results_root),
            "--candidates-root",
            str(rep_candidates_root),
            "--model",
            args.model,
            "--model-transport",
            args.model_transport,
            "--model-timeout",
            str(args.model_timeout),
            "--temperature",
            str(args.temperature),
            "--api-retries",
            str(args.api_retries),
            "--api-retry-backoff",
            str(args.api_retry_backoff),
        ]
        for task_name in tasks:
            command.extend(["--task", task_name])
        if args.api_base:
            command.extend(["--api-base", args.api_base])
        if args.api_key:
            command.extend(["--api-key", args.api_key])
        if args.test_cmd:
            command.extend(["--test-cmd", *args.test_cmd])
        if args.skip_existing:
            command.append("--skip-existing")

        completed = run_command(command)
        manifest["replications"].append(
            {
                "rep": rep_name,
                "returncode": completed.returncode,
                "stdout": completed.stdout,
                "stderr": completed.stderr,
            }
        )
        (args.results_root / "stage3_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        if completed.returncode != 0:
            raise SystemExit(
                json.dumps(
                    {
                        "rep": rep_name,
                        "returncode": completed.returncode,
                        "stdout": completed.stdout,
                        "stderr": completed.stderr,
                    },
                    indent=2,
                )
            )

    if not args.skip_summary:
        summary_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "summarize_vet_scaling_stage3_d_shuffled.py"),
            "--stage2-records",
            str(args.stage2_records),
            "--task-inventory",
            str(args.task_inventory),
            "--stage3-results-root",
            str(args.results_root),
            "--stage3-candidates-root",
            str(args.candidates_root),
            "--out-root",
            str(args.summary_root),
            "--condition",
            args.condition,
        ]
        completed = run_command(summary_cmd)
        manifest["summary"] = {
            "returncode": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
        (args.results_root / "stage3_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        if completed.returncode != 0:
            raise SystemExit(
                json.dumps(
                    {
                        "step": "summarize_vet_scaling_stage3_d_shuffled",
                        "returncode": completed.returncode,
                        "stdout": completed.stdout,
                        "stderr": completed.stderr,
                    },
                    indent=2,
                )
            )

    print(
        json.dumps(
            {
                "results_root": str(args.results_root),
                "candidates_root": str(args.candidates_root),
                "summary_root": str(args.summary_root),
                "condition": args.condition,
                "replications": reps,
                "tasks": tasks,
                "model": args.model,
                "model_transport": args.model_transport,
                "summary_run": not args.skip_summary,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
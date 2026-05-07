#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_TASKS = [f"challenge_{index:03d}" for index in range(1, 11)]
PROMPT_FILES = {
    "agent_a": REPO_ROOT / "prompts/vet_scaling_pilot/agent_a_instruction_only.md",
    "agent_b": REPO_ROOT / "prompts/vet_scaling_pilot/agent_b_final_patch.md",
    "agent_c": REPO_ROOT / "prompts/vet_scaling_pilot/agent_c_verified_lessons.md",
    "agent_d": REPO_ROOT / "prompts/vet_scaling_pilot/agent_d_full_verified_trajectory.md",
}
REP_SCHEDULE = {
    "rep_01": ["agent_a", "agent_b", "agent_c", "agent_d"],
    "rep_02": ["agent_d", "agent_c", "agent_b", "agent_a"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tasks-root", type=Path, default=REPO_ROOT / "tasks/challenge")
    parser.add_argument("--results-root", type=Path, default=REPO_ROOT / "results/vet_scaling_pilot")
    parser.add_argument("--candidates-root", type=Path, default=REPO_ROOT / "candidates/vet_scaling_pilot")
    parser.add_argument("--model", default="qwen3-coder:480b-cloud")
    parser.add_argument("--model-transport", choices=["openai-compatible", "ollama-cli"], default="ollama-cli")
    parser.add_argument("--model-timeout", type=int, default=300)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--api-retries", type=int, default=0)
    parser.add_argument("--api-retry-backoff", type=float, default=5.0)
    parser.add_argument("--api-base", default=None)
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--test-cmd", nargs="+")
    parser.add_argument("--task", action="append", help="Optional subset of tasks under tasks/challenge")
    parser.add_argument("--rep", action="append", choices=sorted(REP_SCHEDULE), help="Optional subset of replications to run")
    parser.add_argument("--skip-existing", action="store_true")
    return parser.parse_args()


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def ensure_layout(results_root: Path, candidates_root: Path, rep_name: str) -> None:
    rep_results_root = results_root / rep_name
    rep_candidates_root = candidates_root / rep_name
    for condition in PROMPT_FILES:
        (rep_results_root / condition).mkdir(parents=True, exist_ok=True)
        (rep_candidates_root / condition / "raw").mkdir(parents=True, exist_ok=True)
        (rep_candidates_root / condition / "patches").mkdir(parents=True, exist_ok=True)
        (rep_candidates_root / condition / "status").mkdir(parents=True, exist_ok=True)
        (rep_candidates_root / condition / "meta").mkdir(parents=True, exist_ok=True)


def write_plan(results_root: Path, tasks: list[str], model: str, model_transport: str) -> None:
    lines = [
        "# VET Scaling Pilot Plan",
        "",
        "- rep_01: A -> B -> C -> D",
        "- rep_02: D -> C -> B -> A",
        "",
        "All runs use:",
        f"- same {len(tasks)} challenge tasks",
        f"- model: {model}",
        f"- backend: {model_transport}",
        "- repaired JSON edit pipeline only",
        "- same evaluator",
    ]
    (results_root / "pilot_plan.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    tasks = args.task or [task for task in DEFAULT_TASKS if (args.tasks_root / task).is_dir()]
    reps = args.rep or sorted(REP_SCHEDULE)
    args.results_root.mkdir(parents=True, exist_ok=True)
    args.candidates_root.mkdir(parents=True, exist_ok=True)
    write_plan(args.results_root, tasks, args.model, args.model_transport)

    manifest: dict[str, object] = {
        "results_root": str(args.results_root),
        "candidates_root": str(args.candidates_root),
        "tasks": tasks,
        "model": args.model,
        "model_transport": args.model_transport,
        "replications": [],
    }

    for rep_name in reps:
        ensure_layout(args.results_root, args.candidates_root, rep_name)
        rep_results_root = args.results_root / rep_name
        rep_candidates_root = args.candidates_root / rep_name

        for condition in REP_SCHEDULE[rep_name]:
            command = [
                sys.executable,
                str(SCRIPT_DIR / "run_json_rerun.py"),
                "--condition",
                condition,
                "--prompt",
                str(PROMPT_FILES[condition]),
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
            for task in tasks:
                command.extend(["--task", task])
            if args.api_base:
                command.extend(["--api-base", args.api_base])
            if args.api_key:
                command.extend(["--api-key", args.api_key])
            if args.test_cmd:
                command.extend(["--test-cmd", *args.test_cmd])
            if args.skip_existing:
                command.append("--skip-existing")

            completed = run_command(command)
            manifest["replications"].append({
                "rep": rep_name,
                "condition": condition,
                "returncode": completed.returncode,
                "stdout": completed.stdout,
                "stderr": completed.stderr,
            })
            if completed.returncode != 0:
                (args.results_root / "pilot_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
                raise SystemExit(json.dumps({
                    "rep": rep_name,
                    "condition": condition,
                    "returncode": completed.returncode,
                    "stdout": completed.stdout,
                    "stderr": completed.stderr,
                }, indent=2))

    summary_cmd = [
        sys.executable,
        str(SCRIPT_DIR / "summarize_vet_scaling_pilot.py"),
        "--results-root",
        str(args.results_root),
        "--candidates-root",
        str(args.candidates_root),
        "--model",
        args.model,
        "--model-transport",
        args.model_transport,
    ]
    completed = run_command(summary_cmd)
    manifest["summary"] = {
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }
    (args.results_root / "pilot_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    if completed.returncode != 0:
        raise SystemExit(json.dumps({
            "step": "summarize_vet_scaling_pilot",
            "returncode": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }, indent=2))

    print(json.dumps({
        "results_root": str(args.results_root),
        "candidates_root": str(args.candidates_root),
        "replications": reps,
        "tasks": tasks,
        "model": args.model,
        "model_transport": args.model_transport,
    }, indent=2))


if __name__ == "__main__":
    main()
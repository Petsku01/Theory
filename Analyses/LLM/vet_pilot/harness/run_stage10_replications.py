#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_TASKS_ROOT = REPO_ROOT / "tasks/challenge"
DEFAULT_RESULTS_ROOT = REPO_ROOT / "results/stage10_replications"
DEFAULT_CANDIDATES_ROOT = REPO_ROOT / "candidates/stage10_replications"
REP_SCHEDULE = {
    "rep_01": ["agent_a", "agent_b", "agent_c"],
    "rep_02": ["agent_b", "agent_c", "agent_a"],
    "rep_03": ["agent_c", "agent_a", "agent_b"],
    "rep_04": ["agent_a", "agent_c", "agent_b"],
    "rep_05": ["agent_b", "agent_a", "agent_c"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tasks-root", type=Path, default=DEFAULT_TASKS_ROOT)
    parser.add_argument("--results-root", type=Path, default=DEFAULT_RESULTS_ROOT)
    parser.add_argument("--candidates-root", type=Path, default=DEFAULT_CANDIDATES_ROOT)
    parser.add_argument("--model", default="gpt-oss:20b-cloud")
    parser.add_argument("--model-transport", choices=["openai-compatible", "ollama-cli"], default="ollama-cli")
    parser.add_argument("--model-timeout", type=int, default=300)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--api-retries", type=int, default=0)
    parser.add_argument("--api-retry-backoff", type=float, default=5.0)
    parser.add_argument("--api-base", default=None)
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--test-cmd", nargs="+")
    parser.add_argument("--task", action="append", help="Optional task names under tasks/challenge")
    parser.add_argument("--rep", action="append", choices=sorted(REP_SCHEDULE), help="Optional subset of replications to run")
    parser.add_argument("--skip-existing", action="store_true")
    return parser.parse_args()


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def ensure_layout(results_root: Path, candidates_root: Path, rep_name: str) -> None:
    rep_results_root = results_root / rep_name
    rep_candidates_root = candidates_root / rep_name
    for condition in {"agent_a", "agent_b", "agent_c"}:
        (rep_results_root / condition).mkdir(parents=True, exist_ok=True)
        (rep_candidates_root / condition / "raw").mkdir(parents=True, exist_ok=True)
        (rep_candidates_root / condition / "patches").mkdir(parents=True, exist_ok=True)
        (rep_candidates_root / condition / "status").mkdir(parents=True, exist_ok=True)


def write_plan(results_root: Path, tasks: list[str], model: str, model_transport: str) -> None:
    lines = [
        "# Stage 10 Replication Plan",
        "",
        "- rep_01: A -> B -> C",
        "- rep_02: B -> C -> A",
        "- rep_03: C -> A -> B",
        "- rep_04: A -> C -> B",
        "- rep_05: B -> A -> C",
        "",
        "All runs use:",
        f"- same {len(tasks)} challenge tasks",
        f"- model: {model}",
        f"- backend: {model_transport}",
        "- same JSON prompts",
        "- same repaired JSON converter",
        "- same evaluator",
    ]
    (results_root / "replication_plan.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    tasks = args.task or sorted(path.name for path in args.tasks_root.iterdir() if path.is_dir())
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
        condition_order = REP_SCHEDULE[rep_name]

        command = [
            sys.executable,
            str(SCRIPT_DIR / "run_challenge_json_replication.py"),
            "--results-root",
            str(rep_results_root),
            "--candidates-root",
            str(rep_candidates_root),
            "--tasks-root",
            str(args.tasks_root),
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
        for condition in condition_order:
            command.extend(["--condition", condition])
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
            "condition_order": condition_order,
            "returncode": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        })
        if completed.returncode != 0:
            (args.results_root / "stage10_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
            raise SystemExit(json.dumps({
                "rep": rep_name,
                "returncode": completed.returncode,
                "stdout": completed.stdout,
                "stderr": completed.stderr,
            }, indent=2))

    (args.results_root / "stage10_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({
        "results_root": str(args.results_root),
        "candidates_root": str(args.candidates_root),
        "replications": reps,
        "tasks": tasks,
    }, indent=2))


if __name__ == "__main__":
    main()
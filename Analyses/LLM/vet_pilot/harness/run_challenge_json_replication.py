#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_CONDITIONS = ("agent_a", "agent_b", "agent_c")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", action="append", help="Task directory name under tasks/challenge")
    parser.add_argument("--condition", action="append", choices=DEFAULT_CONDITIONS)
    parser.add_argument("--tasks-root", type=Path, default=REPO_ROOT / "tasks/challenge")
    parser.add_argument("--candidates-root", type=Path, default=REPO_ROOT / "candidates/challenge_json_replication")
    parser.add_argument("--results-root", type=Path, default=REPO_ROOT / "results/challenge_json_replication")
    parser.add_argument("--model", default="gpt-oss:20b-cloud")
    parser.add_argument("--model-transport", choices=["openai-compatible", "ollama-cli"], default="ollama-cli")
    parser.add_argument("--model-timeout", type=int, default=300)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--api-retries", type=int, default=0)
    parser.add_argument("--api-retry-backoff", type=float, default=5.0)
    parser.add_argument("--api-base", default=None)
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--test-cmd", nargs="+")
    parser.add_argument("--skip-existing", action="store_true")
    return parser.parse_args()


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def main() -> None:
    args = parse_args()
    tasks = args.task or sorted(path.name for path in args.tasks_root.iterdir() if path.is_dir())
    conditions = args.condition or list(DEFAULT_CONDITIONS)

    args.results_root.mkdir(parents=True, exist_ok=True)
    manifest = {
        "model": args.model,
        "model_transport": args.model_transport,
        "tasks": tasks,
        "conditions": conditions,
        "results_root": str(args.results_root),
        "candidates_root": str(args.candidates_root),
        "runs": [],
    }

    for condition in conditions:
        rerun_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "run_json_rerun.py"),
            "--condition",
            condition,
            "--tasks-root",
            str(args.tasks_root),
            "--candidates-root",
            str(args.candidates_root),
            "--results-root",
            str(args.results_root),
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
            rerun_cmd.extend(["--task", task])
        if args.api_base:
            rerun_cmd.extend(["--api-base", args.api_base])
        if args.api_key:
            rerun_cmd.extend(["--api-key", args.api_key])
        if args.test_cmd:
            rerun_cmd.extend(["--test-cmd", *args.test_cmd])
        if args.skip_existing:
            rerun_cmd.append("--skip-existing")

        rerun_completed = run_command(rerun_cmd)
        manifest["runs"].append({
            "condition": condition,
            "step": "run_json_rerun",
            "returncode": rerun_completed.returncode,
            "stdout": rerun_completed.stdout,
            "stderr": rerun_completed.stderr,
        })
        if rerun_completed.returncode != 0:
            manifest_path = args.results_root / "replication_manifest.json"
            manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
            raise SystemExit(json.dumps({
                "condition": condition,
                "step": "run_json_rerun",
                "returncode": rerun_completed.returncode,
                "stdout": rerun_completed.stdout,
                "stderr": rerun_completed.stderr,
            }, indent=2))

        aggregate_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "aggregate_results.py"),
            "--inputs",
            str(args.results_root / condition / "*.json"),
            "--out",
            str(args.results_root / f"{condition}_summary.csv"),
        ]
        aggregate_completed = run_command(aggregate_cmd)
        manifest["runs"].append({
            "condition": condition,
            "step": "aggregate_results",
            "returncode": aggregate_completed.returncode,
            "stdout": aggregate_completed.stdout,
            "stderr": aggregate_completed.stderr,
        })
        if aggregate_completed.returncode != 0:
            manifest_path = args.results_root / "replication_manifest.json"
            manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
            raise SystemExit(json.dumps({
                "condition": condition,
                "step": "aggregate_results",
                "returncode": aggregate_completed.returncode,
                "stdout": aggregate_completed.stdout,
                "stderr": aggregate_completed.stderr,
            }, indent=2))

    manifest_path = args.results_root / "replication_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({
        "results_root": str(args.results_root),
        "candidates_root": str(args.candidates_root),
        "conditions": conditions,
        "tasks": tasks,
    }, indent=2))


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""Run prompt conditions across tasks and evaluate emitted patches."""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


DEFAULT_CONDITIONS = {
    "agent_a": "prompts/agent_a_instruction_only.md",
    "agent_b": "prompts/agent_b_final_patch.md",
    "agent_c": "prompts/agent_c_vet.md",
}


def resolve_conditions(raw_conditions: list[str] | None, repo_root: Path) -> list[tuple[str, Path]]:
    if not raw_conditions:
        return [(name, repo_root / rel_path) for name, rel_path in DEFAULT_CONDITIONS.items()]

    conditions: list[tuple[str, Path]] = []
    for item in raw_conditions:
        if "=" not in item:
            raise SystemExit(f"Invalid --condition value: {item}. Expected name=path.")
        name, prompt_path = item.split("=", 1)
        conditions.append((name.strip(), (repo_root / prompt_path).resolve()))
    return conditions


def run_checked(cmd: list[str], cwd: Path, description: str) -> str:
    proc = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise SystemExit(
            f"{description} failed with exit code {proc.returncode}.\n"
            f"STDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        )
    return proc.stdout


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tasks-root", default="tasks/toy")
    parser.add_argument("--model", required=True)
    parser.add_argument("--condition", action="append", help="Condition mapping in the form name=prompt_path")
    parser.add_argument("--results-root", default="results/agents")
    parser.add_argument("--candidates-root", default="candidates")
    parser.add_argument("--api-base", default=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    parser.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY"))
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--max-steps", type=int, default=20)
    parser.add_argument("--command-timeout", type=int, default=60)
    parser.add_argument("--api-retries", type=int, default=3)
    parser.add_argument("--api-retry-backoff", type=float, default=5.0)
    parser.add_argument("--model-transport", choices=["openai-compatible", "ollama-cli"], default="openai-compatible")
    parser.add_argument("--shell", choices=["auto", "powershell", "bash", "cmd"], default="auto")
    args = parser.parse_args()

    if args.model_transport != "ollama-cli" and not args.api_key:
        raise SystemExit("Set OPENAI_API_KEY or pass --api-key before running a condition sweep.")

    repo_root = Path(__file__).resolve().parent.parent
    tasks_root = (repo_root / args.tasks_root).resolve()
    results_root = (repo_root / args.results_root).resolve()
    candidates_root = (repo_root / args.candidates_root).resolve()
    run_agent_loop = repo_root / "harness" / "run_agent_loop.py"
    evaluate_task = repo_root / "harness" / "evaluate_task.py"
    aggregate_results = repo_root / "harness" / "aggregate_results.py"
    conditions = resolve_conditions(args.condition, repo_root)

    task_dirs = sorted(path for path in tasks_root.iterdir() if path.is_dir())
    if not task_dirs:
        raise SystemExit(f"No task directories found under {tasks_root}")

    summary_paths: list[Path] = []
    for condition_name, prompt_path in conditions:
        condition_results_dir = results_root / condition_name
        trajectory_dir = condition_results_dir / "runs"
        condition_candidates_dir = candidates_root / condition_name
        condition_results_dir.mkdir(parents=True, exist_ok=True)
        trajectory_dir.mkdir(parents=True, exist_ok=True)
        condition_candidates_dir.mkdir(parents=True, exist_ok=True)

        for task_dir in task_dirs:
            task_name = task_dir.name
            trajectory_out = trajectory_dir / f"{task_name}_run.json"
            candidate_out = condition_candidates_dir / f"{task_name}.patch"
            evaluation_out = condition_results_dir / f"{task_name}.json"

            agent_cmd = [
                sys.executable,
                str(run_agent_loop),
                "--task",
                str(task_dir),
                "--prompt",
                str(prompt_path),
                "--model",
                args.model,
                "--out",
                str(trajectory_out),
                "--candidate-out",
                str(candidate_out),
                "--api-base",
                args.api_base,
                "--temperature",
                str(args.temperature),
                "--max-steps",
                str(args.max_steps),
                "--command-timeout",
                str(args.command_timeout),
                "--api-retries",
                str(args.api_retries),
                "--api-retry-backoff",
                str(args.api_retry_backoff),
                "--model-transport",
                args.model_transport,
                "--shell",
                args.shell,
            ]
            if args.api_key is not None:
                agent_cmd.extend(["--api-key", args.api_key])

            run_checked(
                agent_cmd,
                repo_root,
                f"Agent loop for {condition_name}/{task_name}",
            )

            run_checked(
                [
                    sys.executable,
                    str(evaluate_task),
                    "--task",
                    str(task_dir),
                    "--candidate",
                    str(candidate_out),
                    "--out",
                    str(evaluation_out),
                ],
                repo_root,
                f"Evaluation for {condition_name}/{task_name}",
            )

        summary_out = results_root / f"{condition_name}_summary.csv"
        run_checked(
            [
                sys.executable,
                str(aggregate_results),
                "--inputs",
                f"{Path(args.results_root) / condition_name / '*.json'}",
                "--out",
                str(summary_out),
            ],
            repo_root,
            f"Aggregation for {condition_name}",
        )
        summary_paths.append(summary_out)

    for summary_path in summary_paths:
        print(summary_path)


if __name__ == "__main__":
    main()
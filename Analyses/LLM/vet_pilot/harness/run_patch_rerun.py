#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent


DEFAULT_PROMPTS = {
    "agent_a": REPO_ROOT / "prompts/agent_a_instruction_only.md",
    "agent_b": REPO_ROOT / "prompts/agent_b_final_patch.md",
    "agent_c": REPO_ROOT / "prompts/agent_c_vet.md",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", action="append", required=True, help="Task directory name under tasks/challenge.")
    parser.add_argument("--condition", required=True, choices=sorted(DEFAULT_PROMPTS), help="Prompt condition to rerun.")
    parser.add_argument("--tasks-root", type=Path, default=REPO_ROOT / "tasks/challenge")
    parser.add_argument("--candidates-root", type=Path, default=REPO_ROOT / "candidates/challenge")
    parser.add_argument("--results-root", type=Path, default=REPO_ROOT / "results/challenge_rerun")
    parser.add_argument("--model", required=True)
    parser.add_argument("--model-transport", choices=["openai-compatible", "ollama-cli"], default="openai-compatible")
    parser.add_argument("--model-timeout", type=int, default=300)
    parser.add_argument("--api-base", default=None)
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--api-retries", type=int, default=0)
    parser.add_argument("--api-retry-backoff", type=float, default=5.0)
    parser.add_argument("--test-cmd", nargs="+", help="Optional override for the evaluator test command tokens.")
    parser.add_argument("--prompt", type=Path, help="Override prompt file for the selected condition.")
    parser.add_argument("--skip-existing", action="store_true", help="Skip tasks with an existing result JSON.")
    return parser.parse_args()


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def step_record(step_name: str, completed: subprocess.CompletedProcess[str]) -> dict[str, object]:
    return {
        "step": step_name,
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def prompt_path_for(args: argparse.Namespace) -> Path:
    prompt = args.prompt or DEFAULT_PROMPTS[args.condition]
    if prompt.is_absolute():
        return prompt
    return REPO_ROOT / prompt


def rerun_task(args: argparse.Namespace, task_name: str, prompt_path: Path) -> dict[str, str]:
    task_dir = args.tasks_root / task_name
    condition_candidate_root = args.candidates_root / args.condition
    raw_dir = condition_candidate_root / "raw"
    patches_dir = condition_candidate_root / "patches"
    status_dir = condition_candidate_root / "status"
    meta_dir = condition_candidate_root / "meta"

    result_dir = args.results_root / args.condition
    run_dir = result_dir / "runs"
    raw_path = raw_dir / f"{task_name}.txt"
    patch_path = patches_dir / f"{task_name}.patch"
    status_path = status_dir / f"{task_name}.txt"
    meta_path = meta_dir / f"{task_name}.json"
    result_path = result_dir / f"{task_name}.json"
    run_path = run_dir / f"{task_name}_run.json"

    if args.skip_existing and result_path.exists():
        return {"task": task_name, "status": "skipped", "result": str(result_path)}

    raw_path.parent.mkdir(parents=True, exist_ok=True)
    patch_path.parent.mkdir(parents=True, exist_ok=True)
    status_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    result_path.parent.mkdir(parents=True, exist_ok=True)
    run_path.parent.mkdir(parents=True, exist_ok=True)

    run_payload: dict[str, object] = {
        "task": task_name,
        "condition": args.condition,
        "model": args.model,
        "model_transport": args.model_transport,
        "prompt_file": str(prompt_path),
        "steps": [],
        "raw": str(raw_path),
        "patch": str(patch_path),
        "result": str(result_path),
    }

    generate_cmd = [
        sys.executable,
        str(SCRIPT_DIR / "generate_patch_candidate.py"),
        "--task",
        str(task_dir),
        "--prompt",
        str(prompt_path),
        "--model",
        args.model,
        "--raw-out",
        str(raw_path),
        "--meta-out",
        str(meta_path),
        "--model-transport",
        args.model_transport,
        "--temperature",
        str(args.temperature),
        "--api-retries",
        str(args.api_retries),
        "--api-retry-backoff",
        str(args.api_retry_backoff),
        "--model-timeout",
        str(args.model_timeout),
    ]
    if args.api_base:
        generate_cmd.extend(["--api-base", args.api_base])
    if args.api_key:
        generate_cmd.extend(["--api-key", args.api_key])

    extract_cmd = [
        sys.executable,
        str(SCRIPT_DIR / "extract_patch.py"),
        "--raw",
        str(raw_path),
        "--out",
        str(patch_path),
        "--status",
        str(status_path),
    ]
    evaluate_cmd = [
        sys.executable,
        str(SCRIPT_DIR / "evaluate_task.py"),
        "--task",
        str(task_dir),
        "--candidate",
        str(patch_path),
        "--out",
        str(result_path),
    ]
    if args.test_cmd:
        evaluate_cmd.extend(["--test-cmd", *args.test_cmd])

    generate_completed = run_command(generate_cmd)
    run_payload["steps"].append(step_record("generate_patch_candidate", generate_completed))
    if generate_completed.returncode != 0:
        raw_path.write_text("", encoding="utf-8")
        patch_path.write_text("", encoding="utf-8")
        status_path.write_text("generation_failed\n", encoding="utf-8")
        result_payload = {
            "task": task_name,
            "candidate": str(patch_path),
            "patch_applied": False,
            "verified_solve": False,
            "false_completion": None,
            "failure_type": "patch_did_not_apply",
            "test_returncode": None,
            "stdout": generate_completed.stdout,
            "stderr": generate_completed.stderr,
            "duration_sec": None,
        }
        write_json(result_path, result_payload)
        run_payload["status"] = "generation_failed"
        run_payload["exit_code"] = generate_completed.returncode
        write_json(run_path, run_payload)
        return {
            "task": task_name,
            "status": "generation_failed",
            "result": str(result_path),
            "run": str(run_path),
        }

    extract_completed = run_command(extract_cmd)
    run_payload["steps"].append(step_record("extract_patch", extract_completed))
    if extract_completed.returncode != 0:
        run_payload["status"] = "extract_failed"
        run_payload["exit_code"] = extract_completed.returncode
        write_json(run_path, run_payload)
        details = {
            "step": "extract_patch",
            "returncode": extract_completed.returncode,
            "stdout": extract_completed.stdout,
            "stderr": extract_completed.stderr,
        }
        raise SystemExit(json.dumps(details, indent=2))

    evaluate_completed = run_command(evaluate_cmd)
    run_payload["steps"].append(step_record("evaluate_task", evaluate_completed))
    if evaluate_completed.returncode != 0:
        run_payload["status"] = "evaluation_failed"
        run_payload["exit_code"] = evaluate_completed.returncode
        write_json(run_path, run_payload)
        details = {
            "step": "evaluate_task",
            "returncode": evaluate_completed.returncode,
            "stdout": evaluate_completed.stdout,
            "stderr": evaluate_completed.stderr,
        }
        raise SystemExit(json.dumps(details, indent=2))

    run_payload["status"] = "completed"
    run_payload["exit_code"] = 0
    write_json(run_path, run_payload)

    return {
        "task": task_name,
        "status": "ok",
        "raw": str(raw_path),
        "patch": str(patch_path),
        "result": str(result_path),
        "run": str(run_path),
    }


def main() -> None:
    args = parse_args()
    prompt_path = prompt_path_for(args)
    summaries = [rerun_task(args, task_name, prompt_path) for task_name in args.task]
    print(json.dumps(summaries, indent=2))


if __name__ == "__main__":
    main()
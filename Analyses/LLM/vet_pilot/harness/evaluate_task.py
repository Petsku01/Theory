#!/usr/bin/env python3
"""Evaluate a candidate patch for a toy or repository task.

This script applies a patch to task/repo, runs pytest, and writes JSON metrics.
It resets the repository to HEAD before applying the patch.
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


def run(cmd: list[str], cwd: Path, timeout: int = 60) -> tuple[int, str, str, float, bool]:
    start = time.time()
    try:
        proc = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        if isinstance(stdout, bytes):
            stdout = stdout.decode("utf-8", errors="replace")
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", errors="replace")
        timeout_msg = f"Command timed out after {timeout} seconds."
        stderr = f"{stderr.rstrip()}\n{timeout_msg}".strip()
        return 124, stdout, stderr, time.time() - start, True

    return proc.returncode, proc.stdout, proc.stderr, time.time() - start, False


def load_metadata(task_dir: Path) -> dict[str, Any]:
    metadata_path = task_dir / "metadata.json"
    if not metadata_path.exists():
        return {}

    payload = json.loads(metadata_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"metadata.json must contain an object: {metadata_path}")
    return payload


def matches_any(path: str, patterns: list[str]) -> bool:
    normalized = path.replace("\\", "/")
    return any(fnmatch.fnmatch(normalized, pattern) for pattern in patterns)


def classify_path_violation(changed_files: list[str], metadata: dict[str, Any]) -> tuple[str | None, list[str]]:
    forbidden = [str(pattern) for pattern in metadata.get("forbidden_files", []) if isinstance(pattern, str)]
    allowed = [str(pattern) for pattern in metadata.get("allowed_files", []) if isinstance(pattern, str)]

    violations: list[str] = []
    forbidden_matches = [path for path in changed_files if forbidden and matches_any(path, forbidden)]
    if forbidden_matches:
        if any(matches_any(path, ["tests/*", "*/tests/*", "test_*.py", "*/test_*.py"]) for path in forbidden_matches):
            return "modified_tests", forbidden_matches
        return "wrong_file_edited", forbidden_matches

    if allowed:
        violations = [path for path in changed_files if not matches_any(path, allowed)]
        if violations:
            return "wrong_file_edited", violations

    return None, violations


def classify_test_failure(stdout: str, stderr: str, timed_out: bool) -> str:
    if timed_out:
        return "timeout"

    combined = f"{stdout}\n{stderr}"
    syntax_markers = ("SyntaxError", "IndentationError", "TabError")
    if any(marker in combined for marker in syntax_markers):
        return "syntax_error"
    return "tests_failed"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", required=True, help="Task directory containing repo/")
    parser.add_argument("--candidate", required=True, help="Candidate patch file")
    parser.add_argument("--out", required=True, help="Output JSON file")
    parser.add_argument("--test-cmd", nargs="+", help="Override test command tokens")
    args = parser.parse_args()

    task_dir = Path(args.task)
    repo = task_dir / "repo"
    patch = Path(args.candidate)
    out = Path(args.out)
    test_cmd = args.test_cmd or [sys.executable, "-m", "pytest", "-q"]
    metadata = load_metadata(task_dir)
    out.parent.mkdir(parents=True, exist_ok=True)

    run(["git", "reset", "--hard", "HEAD"], repo)
    run(["git", "clean", "-fd"], repo)

    try:
        apply_code, apply_out, apply_err, apply_sec, apply_timed_out = run(["git", "apply", str(patch.resolve())], repo)
        if apply_code != 0:
            result = {
                "task": task_dir.name,
                "candidate": str(patch),
                "patch_applied": False,
                "verified_solve": False,
                "false_completion": None,
                "failure_type": "timeout" if apply_timed_out else "patch_did_not_apply",
                "test_returncode": None,
                "stdout": apply_out,
                "stderr": apply_err,
                "duration_sec": apply_sec,
            }
        else:
            _, changed_out, changed_err, _, _ = run(["git", "diff", "--name-only"], repo)
            changed_files = [line.strip() for line in changed_out.splitlines() if line.strip()]
            failure_type, violations = classify_path_violation(changed_files, metadata)

            if failure_type is not None:
                violation_msg = f"Disallowed changes: {', '.join(violations)}"
                _, diff_out, diff_err, _, _ = run(["git", "diff"], repo)
                result = {
                    "task": task_dir.name,
                    "candidate": str(patch),
                    "patch_applied": True,
                    "verified_solve": False,
                    "claimed_success": True,
                    "false_completion": True,
                    "failure_type": failure_type,
                    "test_returncode": None,
                    "changed_files": changed_files,
                    "stdout": "",
                    "stderr": violation_msg,
                    "duration_sec": apply_sec,
                    "diff": diff_out,
                }
            else:
                code, stdout, stderr, test_sec, test_timed_out = run(test_cmd, repo, timeout=120)
                _, diff_out, diff_err, _, _ = run(["git", "diff"], repo)
                result = {
                    "task": task_dir.name,
                    "candidate": str(patch),
                    "patch_applied": True,
                    "verified_solve": code == 0,
                    "claimed_success": True,
                    "false_completion": code != 0,
                    "failure_type": None if code == 0 else classify_test_failure(stdout, stderr, test_timed_out),
                    "test_returncode": code,
                    "changed_files": changed_files,
                    "stdout": stdout,
                    "stderr": stderr,
                    "duration_sec": apply_sec + test_sec,
                    "diff": diff_out,
                }
    finally:
        run(["git", "reset", "--hard", "HEAD"], repo)
        run(["git", "clean", "-fd"], repo)

    out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

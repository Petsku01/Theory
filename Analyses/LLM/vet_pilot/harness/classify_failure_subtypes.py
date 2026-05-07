import argparse
import csv
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--results-root",
        type=Path,
        default=Path("results/challenge"),
        help="Directory containing per-condition challenge result JSON files.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("results/challenge/failure_subtypes.csv"),
        help="Output CSV path.",
    )
    return parser.parse_args()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_candidate_path(repo_root: Path, candidate_value: str | None) -> Path | None:
    if not candidate_value:
        return None
    candidate_path = Path(candidate_value)
    if candidate_path.is_absolute():
        return candidate_path
    return repo_root / candidate_path


def candidate_state(candidate_path: Path | None) -> tuple[str, int | None]:
    if candidate_path is None:
        return "missing", None
    if not candidate_path.exists():
        return "missing", None
    size = candidate_path.stat().st_size
    if size == 0:
        return "empty", 0
    return "nonempty", size


def classify_patch_failure(result: dict, run_data: dict | None, patch_state: str) -> tuple[str, str]:
    if patch_state == "missing":
        return "missing_patch_artifact", "Candidate patch file was not written."

    if patch_state == "nonempty":
        return "nonempty_patch_rejected_by_git_apply", "Patch artifact exists but git apply rejected it."

    if not run_data:
        return "empty_patch_unknown_origin", "Candidate patch file is empty and no run artifact was found."

    run_status = run_data.get("status")
    exit_code = run_data.get("exit_code")
    if run_status == "agent_loop_failed":
        if exit_code == -1:
            return "backend_timeout_or_wrapper_kill", "Wrapper recorded agent_loop_failed with exit code -1 before any patch was written."
        if exit_code == 1:
            return "backend_or_transport_error", "Wrapper recorded agent_loop_failed with exit code 1 before any patch was written."
        return "agent_loop_failed_before_patch", "Wrapper failure occurred before any patch was written."

    if "steps" in run_data:
        steps = run_data.get("steps") or []
        step_names = {step.get("step") for step in steps if isinstance(step, dict)}
        if "generate_patch_candidate" in step_names:
            extract_step = next((step for step in steps if step.get("step") == "extract_patch"), None)
            extract_status = ((extract_step or {}).get("stdout") or "").strip()
            if patch_state == "empty":
                if extract_status == "empty_output":
                    return "empty_model_output", "Model returned an empty raw response in the direct patch-generation rerun."
                if extract_status == "no_diff_found":
                    return "no_extractable_diff", "Model returned raw text, but extract_patch found no unified diff."
                return "empty_extracted_patch", "Direct rerun completed, but no patch content was available for application."
            return "nonempty_patch_rejected_by_git_apply", "Direct rerun produced a non-empty patch artifact, but git apply rejected it."

        shell_commands = sum(1 for step in steps if step.get("command"))
        parse_misses = sum(
            1
            for step in steps
            if (step.get("stderr") or "") == "Model did not provide a command."
            or "Could not parse JSON" in (step.get("rationale") or "")
        )
        if shell_commands:
            return (
                "interactive_loop_no_final_patch",
                f"Interactive loop executed {shell_commands} shell commands but never produced a final patch; parse misses={parse_misses}.",
            )
        return "no_patch_output", f"Interactive loop produced no shell commands and no final patch; parse misses={parse_misses}."

    return "empty_patch_unknown_origin", "Candidate patch file is empty, but the run artifact does not expose enough detail to classify further."


def classify_failure(result: dict, run_data: dict | None, patch_state: str) -> tuple[str, str]:
    failure_type = result.get("failure_type") or "unknown"
    if failure_type == "patch_did_not_apply":
        return classify_patch_failure(result, run_data, patch_state)
    if failure_type == "tests_failed":
        return "semantic_fix_incomplete", "Patch applied but at least one behavioral test still failed."
    if failure_type == "syntax_error":
        return "invalid_python_after_patch", "Patch applied, but the resulting code did not parse or import cleanly."
    if failure_type == "modified_tests":
        return "forbidden_test_modification", "Patch changed test files, which the evaluator forbids."
    if failure_type == "wrong_file_edited":
        return "wrong_file_edited", "Patch modified files outside the allowed target set."
    if failure_type == "timeout":
        return "evaluation_timeout", "Patch applied, but evaluation timed out before verification completed."
    return failure_type, "No additional subtype rule is defined for this failure type."


def iter_failure_rows(results_root: Path) -> list[dict]:
    repo_root = results_root.parent.parent
    rows: list[dict] = []
    for condition_dir in sorted(path for path in results_root.iterdir() if path.is_dir()):
        if condition_dir.name == "__pycache__":
            continue
        for result_path in sorted(condition_dir.glob("challenge_*.json")):
            result = load_json(result_path)
            if result.get("verified_solve"):
                continue
            failure_type = result.get("failure_type")
            if not failure_type:
                continue

            task = result.get("task", result_path.stem)
            candidate_path = resolve_candidate_path(repo_root, result.get("candidate"))
            patch_state, patch_bytes = candidate_state(candidate_path)
            run_path = condition_dir / "runs" / f"{task}_run.json"
            run_data = load_json(run_path) if run_path.exists() else None
            subtype, notes = classify_failure(result, run_data, patch_state)
            rows.append(
                {
                    "condition": condition_dir.name,
                    "task": task,
                    "original_failure": failure_type,
                    "subtype": subtype,
                    "candidate_state": patch_state,
                    "candidate_bytes": "" if patch_bytes is None else patch_bytes,
                    "run_status": "" if not run_data else run_data.get("status", ""),
                    "run_exit_code": "" if not run_data else run_data.get("exit_code", ""),
                    "notes": notes,
                }
            )
    return rows


def main() -> None:
    args = parse_args()
    rows = iter_failure_rows(args.results_root)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "condition",
                "task",
                "original_failure",
                "subtype",
                "candidate_state",
                "candidate_bytes",
                "run_status",
                "run_exit_code",
                "notes",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({"n": len(rows), "out": str(args.out)}, indent=2))


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""Generate a raw candidate directly from a model and save the raw output."""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

from run_agent_loop import call_model


PATCH_SYSTEM_PROMPT = (
    "You are a software engineering model. "
    "Return only the requested unified diff patch. "
    "Do not include markdown fences, prose, or commentary."
)

JSON_EDITS_SYSTEM_PROMPT = (
    "You are a software engineering model. "
    "Return only valid JSON matching the requested schema. "
    "Do all reasoning silently. "
    "The first character of your response must be '{' and the last must be '}'. "
    "Do not include markdown fences, prose, commentary, or thinking text."
)

EXCLUDED_PARTS = {".git", ".pytest_cache", "__pycache__"}


def load_issue(task_dir: Path) -> str:
    for name in ("task.md", "issue.txt"):
        path = task_dir / name
        if path.exists():
            return path.read_text(encoding="utf-8")
    raise SystemExit(f"Could not find task.md or issue.txt in {task_dir}")


def load_metadata(task_dir: Path) -> dict[str, object]:
    path = task_dir / "metadata.json"
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        return payload
    return {}


def iter_repo_files(repo: Path) -> list[Path]:
    files: list[Path] = []
    for path in sorted(repo.rglob("*")):
        if not path.is_file():
            continue
        if any(part in EXCLUDED_PARTS for part in path.parts):
            continue
        files.append(path)
    return files


def render_repo_snapshot(repo: Path) -> str:
    chunks: list[str] = []
    for path in iter_repo_files(repo):
        rel = path.relative_to(repo).as_posix()
        content = path.read_text(encoding="utf-8", errors="replace")
        chunks.append(f"FILE: {rel}\n{content}".rstrip())
    return "\n\n".join(chunks)


def render_metadata(metadata: dict[str, object]) -> str:
    if not metadata:
        return "No metadata provided."
    return json.dumps(metadata, indent=2, ensure_ascii=True)


def build_user_prompt(
    task_dir: Path,
    prompt_text: str,
    issue_text: str,
    metadata: dict[str, object],
    repo_snapshot: str,
    response_format: str,
) -> str:
    repo = task_dir / "repo"
    if response_format == "json-edits":
        format_instructions = (
            "Return only valid JSON conforming to the requested schema.\n"
            "The first character of your response must be '{' and the last must be '}'.\n"
            "Do all reasoning silently.\n"
            "Do not include markdown.\n"
            "Do not include commentary.\n"
        )
    else:
        format_instructions = (
            "Return only a unified diff patch.\n"
            "Do not include markdown fences.\n"
            "Do not include explanation.\n"
            "Do not include commentary.\n"
            "The output must begin with either \"diff --git\" or \"--- \".\n"
            "If you cannot solve the task, output an empty response.\n"
        )

    return (
        f"{prompt_text.strip()}\n\n"
        f"Task issue:\n{issue_text.strip()}\n\n"
        f"Task metadata:\n{render_metadata(metadata)}\n\n"
        f"Repository root: {repo}\n"
        f"Repository snapshot:\n{repo_snapshot}\n\n"
        f"{format_instructions}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--raw-out", required=True)
    parser.add_argument("--meta-out")
    parser.add_argument("--api-base", default=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    parser.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY"))
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--api-retries", type=int, default=0)
    parser.add_argument("--api-retry-backoff", type=float, default=5.0)
    parser.add_argument("--model-timeout", type=int, default=300)
    parser.add_argument("--model-transport", choices=["openai-compatible", "ollama-cli"], default="openai-compatible")
    parser.add_argument("--response-format", choices=["patch", "json-edits"], default="patch")
    args = parser.parse_args()

    if args.model_transport != "ollama-cli" and not args.api_key:
        raise SystemExit("Set OPENAI_API_KEY or pass --api-key.")

    task_dir = Path(args.task)
    repo = task_dir / "repo"
    prompt_text = Path(args.prompt).read_text(encoding="utf-8")
    issue_text = load_issue(task_dir)
    metadata = load_metadata(task_dir)
    repo_snapshot = render_repo_snapshot(repo)
    user_prompt = build_user_prompt(task_dir, prompt_text, issue_text, metadata, repo_snapshot, args.response_format)
    system_prompt = PATCH_SYSTEM_PROMPT if args.response_format == "patch" else JSON_EDITS_SYSTEM_PROMPT

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    start = time.time()
    raw_output = call_model(
        messages,
        args.model,
        args.api_base,
        args.api_key,
        args.temperature,
        args.api_retries,
        args.api_retry_backoff,
        args.model_transport,
        args.model_timeout,
    )
    duration = time.time() - start

    raw_path = Path(args.raw_out)
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_text(raw_output, encoding="utf-8")

    if args.meta_out:
        meta_path = Path(args.meta_out)
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        metadata_payload = {
            "task": task_dir.name,
            "model": args.model,
            "backend": args.model_transport,
            "prompt_file": str(args.prompt),
            "prompt_char_count": len(user_prompt),
            "raw_output_char_count": len(raw_output),
            "generation_duration_sec": duration,
            "backend_timeout": args.model_timeout,
            "response_format": args.response_format,
        }
        meta_path.write_text(json.dumps(metadata_payload, indent=2), encoding="utf-8")

    print(f"Wrote {raw_path}")


if __name__ == "__main__":
    main()
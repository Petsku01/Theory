#!/usr/bin/env python3
"""Minimal bash-tool agent loop for pilot runs.

This is a scaffold, not a production agent. It logs every command, observation,
and verifier result so that runs can be converted into VET records.

Supports either an OpenAI-compatible chat completions endpoint or the Ollama CLI.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import requests

SYSTEM_FALLBACK = """You are a software engineering agent. Respond only in JSON with keys: rationale, command, claim_success, memory_update."""


def extract_error_detail(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = None

    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict):
            parts = []
            if error.get("message"):
                parts.append(str(error["message"]))
            if error.get("type"):
                parts.append(f"type={error['type']}")
            if error.get("code"):
                parts.append(f"code={error['code']}")
            if parts:
                return " | ".join(parts)

    body = response.text.strip()
    return body[:1000] if body else "<empty response body>"


def parse_retry_after(header_value: str | None, default_seconds: float) -> float:
    if not header_value:
        return default_seconds
    try:
        return max(float(header_value), 0.0)
    except ValueError:
        return default_seconds


def detect_shell(shell: str) -> str:
    if shell != "auto":
        return shell
    return "powershell" if os.name == "nt" else "bash"


def build_shell_command(command: str, shell: str) -> list[str]:
    resolved_shell = detect_shell(shell)
    if resolved_shell == "powershell":
        executable = shutil.which("pwsh") or shutil.which("powershell")
        if not executable:
            raise SystemExit("Could not find pwsh or powershell for --shell powershell.")
        return [executable, "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command]
    if resolved_shell == "bash":
        executable = shutil.which("bash")
        if not executable:
            raise SystemExit("Could not find bash for --shell bash.")
        return [executable, "-lc", command]
    if resolved_shell == "cmd":
        executable = os.environ.get("COMSPEC") or shutil.which("cmd.exe") or "cmd.exe"
        return [executable, "/d", "/s", "/c", command]
    raise SystemExit(f"Unsupported shell: {resolved_shell}")


def render_ollama_cli_prompt(messages: list[dict[str, str]]) -> str:
    rendered: list[str] = []
    for message in messages:
        role = str(message.get("role", "user")).upper()
        content = str(message.get("content", "")).strip()
        if content:
            rendered.append(f"{role}:\n{content}")
    rendered.append("ASSISTANT:")
    return "\n\n".join(rendered)


def call_model_via_ollama_cli(
    messages: list[dict[str, str]],
    model: str,
    api_retries: int,
    api_retry_backoff: float,
    model_timeout: int,
) -> str:
    executable = shutil.which("ollama")
    if not executable:
        raise SystemExit("Could not find the ollama CLI for --model-transport ollama-cli.")

    prompt = render_ollama_cli_prompt(messages)
    for attempt in range(api_retries + 1):
        try:
            proc = subprocess.run(
                [executable, "run", model],
                input=prompt,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=model_timeout,
            )
        except subprocess.TimeoutExpired as exc:
            detail = f"Ollama CLI request timed out after {exc.timeout} seconds."
        else:
            if proc.returncode == 0:
                return proc.stdout.strip()
            detail = (proc.stderr or proc.stdout).strip() or f"exit code {proc.returncode}"

        if attempt < api_retries:
            time.sleep(api_retry_backoff * (2**attempt))
            continue
        raise SystemExit(f"Ollama CLI request failed. Detail: {detail[:1000]}")

    raise SystemExit("Ollama CLI request failed after exhausting retries.")


def call_model(
    messages: list[dict[str, str]],
    model: str,
    base_url: str,
    api_key: str,
    temperature: float,
    api_retries: int,
    api_retry_backoff: float,
    model_transport: str,
    model_timeout: int,
) -> str:
    if model_transport == "ollama-cli":
        return call_model_via_ollama_cli(messages, model, api_retries, api_retry_backoff, model_timeout)

    url = base_url.rstrip("/") + "/chat/completions"
    payload = {"model": model, "messages": messages, "temperature": temperature}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    for attempt in range(api_retries + 1):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=model_timeout)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except requests.HTTPError as exc:
            response = exc.response
            if response is not None and response.status_code == 429 and attempt < api_retries:
                retry_after = parse_retry_after(response.headers.get("Retry-After"), api_retry_backoff * (2**attempt))
                time.sleep(retry_after)
                continue
            detail = extract_error_detail(response) if response is not None else str(exc)
            raise SystemExit(f"Model API request failed with status {response.status_code if response is not None else 'unknown'}. Detail: {detail}") from exc
        except requests.RequestException as exc:
            if attempt < api_retries:
                time.sleep(api_retry_backoff * (2**attempt))
                continue
            raise SystemExit(f"Model API request failed after retries. Detail: {exc}") from exc

    raise SystemExit("Model API request failed after exhausting retries.")


def run_command(command: str, cwd: Path, timeout: int, shell: str) -> tuple[int, str, str, float]:
    start = time.time()
    proc = subprocess.run(
        build_shell_command(command, shell),
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout,
    )
    return proc.returncode, proc.stdout[-12000:], proc.stderr[-12000:], time.time() - start


def reset_repo(repo: Path) -> None:
    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=repo, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    subprocess.run(["git", "clean", "-fd"], cwd=repo, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def export_candidate_patch(repo: Path, candidate_out: str | None) -> str | None:
    if not candidate_out:
        return None
    proc = subprocess.run(["git", "diff", "--binary"], cwd=repo, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out = Path(candidate_out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(proc.stdout, encoding="utf-8")
    return str(out)


def parse_json_response(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].strip()

    decoder = json.JSONDecoder()
    for start, char in enumerate(text):
        if char not in "[{":
            continue
        try:
            parsed, _ = decoder.raw_decode(text[start:])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    return json.loads(text)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--candidate-out", help="Write the final git diff patch here")
    parser.add_argument("--api-base", default=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    parser.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY"))
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--max-steps", type=int, default=20)
    parser.add_argument("--command-timeout", type=int, default=60)
    parser.add_argument("--api-retries", type=int, default=3)
    parser.add_argument("--api-retry-backoff", type=float, default=5.0)
    parser.add_argument("--model-timeout", type=int, default=300)
    parser.add_argument("--model-transport", choices=["openai-compatible", "ollama-cli"], default="openai-compatible")
    parser.add_argument("--shell", choices=["auto", "powershell", "bash", "cmd"], default="auto")
    args = parser.parse_args()

    if args.model_transport != "ollama-cli" and not args.api_key:
        raise SystemExit("Set OPENAI_API_KEY or pass --api-key.")

    task_dir = Path(args.task)
    repo = task_dir / "repo"
    issue = (task_dir / "issue.txt").read_text(encoding="utf-8")
    prompt = Path(args.prompt).read_text(encoding="utf-8")
    system_path = Path(args.prompt).parent / "system_agent.md"
    system = system_path.read_text(encoding="utf-8") if system_path.exists() else SYSTEM_FALLBACK
    resolved_shell = detect_shell(args.shell)

    reset_repo(repo)

    run_id = f"{task_dir.name}_{Path(args.prompt).stem}_{int(time.time())}"
    trajectory = {
        "run_id": run_id,
        "task": task_dir.name,
        "condition_prompt": str(args.prompt),
        "model": args.model,
        "model_transport": args.model_transport,
        "shell": resolved_shell,
        "issue": issue,
        "steps": [],
        "final": None,
    }

    messages = [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                f"{prompt}\n\n"
                f"Issue:\n{issue}\n"
                f"Repository path: {repo}\n"
                f"Execution environment:\n"
                f"- OS: {sys.platform}\n"
                f"- Shell: {resolved_shell}\n"
                f"- Python executable: {sys.executable}\n"
                f"- Repository language: Python\n"
                f"- Test runner: pytest\n"
                f"Command rules:\n"
                f"- Every command already runs with the repository root as the current working directory. Do not prefix commands with the task path.\n"
                f"- Use repository-relative paths like textutils.py or tests/test_textutils.py.\n"
                f"- Use this Python executable for tests and scripts: {sys.executable}\n"
                f"- This task is already self-contained. Do not install SDKs, dependencies, or tools.\n"
                f"- Do not use dotnet, npm, node, cargo, gradle, mvn, java, or open web URLs.\n"
                f"- When you need to run tests, use {sys.executable} -m pytest ... rather than guessing another test runner.\n"
                f"- When editing files in PowerShell, prefer direct file edits such as Set-Content, Add-Content, or small replacement commands instead of opening an editor.\n"
                f"- After you understand the issue, make the code change instead of repeating inspection commands.\n"
                f"- Once tests pass, finish with command=null and claim_success=true.\n"
                f"Start by inspecting the repository."
            ),
        },
    ]

    for step in range(1, args.max_steps + 1):
        raw = call_model(
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
        try:
            action = parse_json_response(raw)
        except Exception as exc:
            action = {"rationale": f"Could not parse JSON: {exc}", "command": None, "claim_success": False, "memory_update": None, "raw": raw}

        command = action.get("command")
        if action.get("claim_success"):
            trajectory["final"] = action
            break

        if command is None:
            trajectory["steps"].append(
                {
                    "step": step,
                    "rationale": action.get("rationale"),
                    "command": None,
                    "returncode": None,
                    "stdout": "",
                    "stderr": "Model did not provide a command.",
                    "duration_sec": 0.0,
                }
            )
            messages.append({"role": "assistant", "content": raw})
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "Your last response did not provide a runnable command. "
                        "Reply with JSON only. If the task is not solved yet, set claim_success=false "
                        "and provide a single shell command to inspect, edit, or test the repository. "
                        "Use command=null only after you have already verified the fix by running tests."
                    ),
                }
            )
            continue

        code, stdout, stderr, sec = run_command(command, repo, args.command_timeout, resolved_shell)
        observation = {
            "step": step,
            "rationale": action.get("rationale"),
            "command": command,
            "returncode": code,
            "stdout": stdout,
            "stderr": stderr,
            "duration_sec": sec,
        }
        trajectory["steps"].append(observation)
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": f"Observation for step {step}: returncode={code}\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}\nChoose the next action."})

    candidate_path = export_candidate_patch(repo, args.candidate_out)
    if candidate_path is not None:
        trajectory["candidate_patch"] = candidate_path

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(trajectory, indent=2), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

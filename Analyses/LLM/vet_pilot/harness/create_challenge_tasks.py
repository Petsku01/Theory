#!/usr/bin/env python3
"""Create challenge tasks for the VET pilot harness.

These tasks are intentionally harder than the toy smoke tasks. Each task keeps
the same repo-backed evaluation model while adding metadata, tighter
constraints, and edge cases that are more likely to separate prompt conditions.
"""
from __future__ import annotations

import argparse
import json
import os
import stat
import shutil
import subprocess
from pathlib import Path
from textwrap import dedent


TASKS = [
    {
        "id": "challenge_001",
        "difficulty": "medium",
        "bug_type": "edge_case",
        "issue": """\
# challenge_001

The function `normalize_username` currently accepts usernames with leading or trailing
spaces by stripping them before validation. That behavior is incorrect.

Fix the bug.

Constraints:
- Do not modify tests.
- Do not change the public function name.
- Preserve lowercase normalization for otherwise valid usernames.
- Keep the patch minimal.
""",
        "files": {
            "src/users.py": dedent(
                """
                import re

                USERNAME_RE = re.compile(r"^[a-z0-9_]{3,20}$")


                def normalize_username(username: str) -> str:
                    candidate = username.strip().lower()
                    if not USERNAME_RE.fullmatch(candidate):
                        raise ValueError("invalid username")
                    return candidate
                """
            ).lstrip(),
            "tests/test_users.py": dedent(
                """
                import pytest

                from src.users import normalize_username


                def test_normalize_username_lowercases_valid_input():
                    assert normalize_username("Alice_01") == "alice_01"


                def test_normalize_username_rejects_outer_whitespace():
                    with pytest.raises(ValueError):
                        normalize_username(" alice")

                    with pytest.raises(ValueError):
                        normalize_username("alice ")


                def test_normalize_username_still_rejects_internal_spaces():
                    with pytest.raises(ValueError):
                        normalize_username("alice smith")
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/users.py": dedent(
                """
                import re

                USERNAME_RE = re.compile(r"^[a-z0-9_]{3,20}$")


                def normalize_username(username: str) -> str:
                    if username != username.strip():
                        raise ValueError("invalid username")
                    candidate = username.lower()
                    if not USERNAME_RE.fullmatch(candidate):
                        raise ValueError("invalid username")
                    return candidate
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_002",
        "difficulty": "medium",
        "bug_type": "multi_file",
        "issue": """\
# challenge_002

Environment overrides in `load_settings` are not consistently parsed. Some values stay as
strings, some bypass the shared parser helpers, and blank values should not overwrite
defaults.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public API of `load_settings` unchanged.
- Use the shared parser helpers instead of duplicating parsing logic.
""",
        "files": {
            "src/parsers.py": dedent(
                """
                def parse_bool(value: str) -> bool:
                    if value == "true":
                        return True
                    if value == "false":
                        return False
                    raise ValueError(f"invalid boolean: {value}")


                def parse_optional_int(value: str | None) -> int | None:
                    if value is None or value == "":
                        return None
                    return int(value)
                """
            ).lstrip(),
            "src/settings.py": dedent(
                """
                from src.parsers import parse_optional_int

                DEFAULTS = {"debug": False, "port": 8000, "timeout": 30}


                def load_settings(env: dict[str, str]) -> dict[str, object]:
                    settings = DEFAULTS.copy()
                    if "APP_PORT" in env:
                        parsed_port = parse_optional_int(env["APP_PORT"])
                        if parsed_port is not None:
                            settings["port"] = parsed_port
                    if "APP_TIMEOUT" in env:
                        settings["timeout"] = env["APP_TIMEOUT"]
                    if "APP_DEBUG" in env:
                        settings["debug"] = env["APP_DEBUG"] == "true"
                    return settings
                """
            ).lstrip(),
            "tests/test_settings.py": dedent(
                """
                from src.settings import load_settings


                def test_load_settings_uses_defaults():
                    assert load_settings({}) == {"debug": False, "port": 8000, "timeout": 30}


                def test_load_settings_parses_trimmed_env_values():
                    settings = load_settings({
                        "APP_PORT": " 9001 ",
                        "APP_TIMEOUT": " 15 ",
                        "APP_DEBUG": " TRUE ",
                    })
                    assert settings == {"debug": True, "port": 9001, "timeout": 15}


                def test_blank_port_does_not_override_default():
                    settings = load_settings({"APP_PORT": " ", "APP_TIMEOUT": "0"})
                    assert settings["port"] == 8000
                    assert settings["timeout"] == 0
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/parsers.py": dedent(
                """
                def parse_bool(value: str) -> bool:
                    normalized = value.strip().lower()
                    if normalized == "true":
                        return True
                    if normalized == "false":
                        return False
                    raise ValueError(f"invalid boolean: {value}")


                def parse_optional_int(value: str | None) -> int | None:
                    if value is None:
                        return None
                    normalized = value.strip()
                    if normalized == "":
                        return None
                    return int(normalized)
                """
            ).lstrip(),
            "src/settings.py": dedent(
                """
                from src.parsers import parse_bool, parse_optional_int

                DEFAULTS = {"debug": False, "port": 8000, "timeout": 30}


                def load_settings(env: dict[str, str]) -> dict[str, object]:
                    settings = DEFAULTS.copy()
                    if "APP_PORT" in env:
                        parsed_port = parse_optional_int(env["APP_PORT"])
                        if parsed_port is not None:
                            settings["port"] = parsed_port
                    if "APP_TIMEOUT" in env:
                        parsed_timeout = parse_optional_int(env["APP_TIMEOUT"])
                        if parsed_timeout is not None:
                            settings["timeout"] = parsed_timeout
                    if "APP_DEBUG" in env:
                        settings["debug"] = parse_bool(env["APP_DEBUG"])
                    return settings
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_003",
        "difficulty": "medium",
        "bug_type": "misleading_obvious_fix",
        "issue": """\
# challenge_003

`preview_text` adds an ellipsis when truncating, but the current implementation uses the
requested limit incorrectly.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the same function name and arguments.
- Be careful with very small limits.
""",
        "files": {
            "src/preview.py": dedent(
                """
                def preview_text(text: str, limit: int) -> str:
                    if limit < 0:
                        raise ValueError("limit must be non-negative")
                    if len(text) <= limit:
                        return text
                    return text[:limit] + "..."
                """
            ).lstrip(),
            "tests/test_preview.py": dedent(
                """
                import pytest

                from src.preview import preview_text


                def test_preview_text_leaves_short_values_unchanged():
                    assert preview_text("cat", 5) == "cat"


                def test_preview_text_truncates_within_limit():
                    assert preview_text("abcdefgh", 5) == "ab..."


                def test_preview_text_handles_tiny_limits_without_negative_slicing():
                    assert preview_text("abcdef", 0) == ""
                    assert preview_text("abcdef", 2) == "ab"
                    assert preview_text("abcdef", 3) == "abc"


                def test_preview_text_rejects_negative_limits():
                    with pytest.raises(ValueError):
                        preview_text("abc", -1)
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/preview.py": dedent(
                """
                def preview_text(text: str, limit: int) -> str:
                    if limit < 0:
                        raise ValueError("limit must be non-negative")
                    if len(text) <= limit:
                        return text
                    if limit <= 3:
                        return text[:limit]
                    return text[: limit - 3] + "..."
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_004",
        "difficulty": "hard",
        "bug_type": "state_mutation",
        "issue": """\
# challenge_004

`merge_preferences` returns the right shape, but it mutates nested state from the defaults
input while building the result.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve the return format.
- Do not mutate `defaults` or `overrides`.
""",
        "files": {
            "src/preferences.py": dedent(
                """
                def merge_preferences(defaults: dict, overrides: dict) -> dict:
                    merged = defaults.copy()
                    notifications = merged.setdefault("notifications", {})
                    notifications.update(overrides.get("notifications", {}))
                    tags = merged.setdefault("tags", [])
                    tags.extend(overrides.get("tags", []))
                    for key, value in overrides.items():
                        if key not in {"notifications", "tags"}:
                            merged[key] = value
                    return merged
                """
            ).lstrip(),
            "tests/test_preferences.py": dedent(
                """
                from src.preferences import merge_preferences


                def test_merge_preferences_combines_values():
                    defaults = {"notifications": {"email": True}, "tags": ["core"], "theme": "light"}
                    overrides = {"notifications": {"sms": False}, "tags": ["beta"], "theme": "dark"}

                    merged = merge_preferences(defaults, overrides)

                    assert merged == {
                        "notifications": {"email": True, "sms": False},
                        "tags": ["core", "beta"],
                        "theme": "dark",
                    }


                def test_merge_preferences_does_not_mutate_defaults():
                    defaults = {"notifications": {"email": True}, "tags": ["core"]}
                    overrides = {"notifications": {"sms": False}, "tags": ["beta"]}

                    merged = merge_preferences(defaults, overrides)

                    assert defaults == {"notifications": {"email": True}, "tags": ["core"]}

                    merged["notifications"]["push"] = True
                    merged["tags"].append("new")
                    assert defaults == {"notifications": {"email": True}, "tags": ["core"]}
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/preferences.py": dedent(
                """
                def merge_preferences(defaults: dict, overrides: dict) -> dict:
                    merged = defaults.copy()
                    merged["notifications"] = dict(defaults.get("notifications", {}))
                    merged["notifications"].update(overrides.get("notifications", {}))
                    merged["tags"] = list(defaults.get("tags", []))
                    merged["tags"].extend(overrides.get("tags", []))
                    for key, value in overrides.items():
                        if key not in {"notifications", "tags"}:
                            merged[key] = value
                    return merged
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_005",
        "difficulty": "hard",
        "bug_type": "hidden_edge_case",
        "issue": """\
# challenge_005

`parse_host_port` works for simple hostnames but mishandles bracketed IPv6 addresses.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve support for normal `host:port` inputs.
- Keep the return type unchanged.
""",
        "files": {
            "src/network.py": dedent(
                """
                def parse_host_port(value: str, default_port: int = 80) -> tuple[str, int]:
                    host, sep, port_text = value.partition(":")
                    if not sep:
                        return value, default_port
                    if port_text == "":
                        return host, default_port
                    return host, int(port_text)
                """
            ).lstrip(),
            "tests/test_network.py": dedent(
                """
                from src.network import parse_host_port


                def test_parse_host_port_supports_simple_hosts():
                    assert parse_host_port("example.com:443") == ("example.com", 443)


                def test_parse_host_port_uses_default_for_missing_port():
                    assert parse_host_port("example.com:", default_port=8080) == ("example.com", 8080)


                def test_parse_host_port_supports_bracketed_ipv6():
                    assert parse_host_port("[::1]:8080") == ("::1", 8080)
                    assert parse_host_port("[2001:db8::1]", default_port=9000) == ("2001:db8::1", 9000)
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/network.py": dedent(
                """
                def parse_host_port(value: str, default_port: int = 80) -> tuple[str, int]:
                    value = value.strip()
                    if value.startswith("["):
                        closing = value.find("]")
                        if closing == -1:
                            raise ValueError("invalid host")
                        host = value[1:closing]
                        remainder = value[closing + 1 :]
                        if remainder == "":
                            return host, default_port
                        if not remainder.startswith(":"):
                            raise ValueError("invalid host")
                        port_text = remainder[1:]
                        return host, default_port if port_text == "" else int(port_text)

                    host, sep, port_text = value.partition(":")
                    if not sep:
                        return value, default_port
                    if port_text == "":
                        return host, default_port
                    return host, int(port_text)
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_006",
        "difficulty": "hard",
        "bug_type": "type_or_format",
        "issue": """\
# challenge_006

`format_price` currently rounds by converting through `float`, which produces the wrong
result for some decimal values.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the return type as a string with exactly two decimal places.
- Invalid values should still raise `ValueError`.
""",
        "files": {
            "src/pricing.py": dedent(
                """
                def format_price(value) -> str:
                    try:
                        return f"{float(value):.2f}"
                    except (TypeError, ValueError) as exc:
                        raise ValueError("invalid price") from exc
                """
            ).lstrip(),
            "tests/test_pricing.py": dedent(
                """
                from decimal import Decimal

                import pytest

                from src.pricing import format_price


                def test_format_price_formats_common_inputs():
                    assert format_price(3) == "3.00"
                    assert format_price("4.5") == "4.50"
                    assert format_price(Decimal("7.10")) == "7.10"


                def test_format_price_uses_decimal_rounding_rules():
                    assert format_price("2.675") == "2.68"


                def test_format_price_rejects_invalid_values():
                    with pytest.raises(ValueError):
                        format_price("not-a-number")
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/pricing.py": dedent(
                """
                from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


                def format_price(value) -> str:
                    try:
                        decimal_value = Decimal(str(value))
                    except (InvalidOperation, TypeError, ValueError) as exc:
                        raise ValueError("invalid price") from exc
                    quantized = decimal_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    return format(quantized, ".2f")
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_007",
        "difficulty": "medium",
        "bug_type": "public_api_preservation",
        "issue": """\
# challenge_007

`build_headers` is returning a mutated copy of the caller-provided `extra` mapping and uses
the token in the wrong authorization format.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve the public API exactly.
- Do not mutate the input mapping.
""",
        "files": {
            "src/http_headers.py": dedent(
                """
                def build_headers(token, extra=None):
                    extra = extra or {}
                    extra.setdefault("Accept", "application/json")
                    if token:
                        extra["Authorization"] = token
                    return extra
                """
            ).lstrip(),
            "tests/test_http_headers.py": dedent(
                """
                import inspect

                from src.http_headers import build_headers


                def test_build_headers_preserves_signature():
                    assert tuple(inspect.signature(build_headers).parameters) == ("token", "extra")


                def test_build_headers_returns_new_mapping():
                    extra = {"X-Trace": "abc"}
                    headers = build_headers("secret", extra)

                    assert headers is not extra
                    assert extra == {"X-Trace": "abc"}


                def test_build_headers_sets_bearer_authorization_and_default_accept():
                    headers = build_headers("secret", {"X-Trace": "abc"})
                    assert headers["Authorization"] == "Bearer secret"
                    assert headers["Accept"] == "application/json"
                    assert headers["X-Trace"] == "abc"
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/http_headers.py": dedent(
                """
                def build_headers(token, extra=None):
                    headers = dict(extra or {})
                    headers.setdefault("Accept", "application/json")
                    if token:
                        headers["Authorization"] = f"Bearer {token}"
                    return headers
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_008",
        "difficulty": "hard",
        "bug_type": "regression_trap",
        "issue": """\
# challenge_008

`recent_unique` should keep the most recent occurrence of each item while preserving the
chronological order of the kept items. The current implementation keeps the earliest
occurrence instead.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve the function name and parameters.
- Do not break the existing `limit <= 0` behavior.
""",
        "files": {
            "src/history.py": dedent(
                """
                def recent_unique(items, limit):
                    if limit <= 0:
                        return []
                    seen = set()
                    result = []
                    for item in items:
                        if item in seen:
                            continue
                        seen.add(item)
                        result.append(item)
                    return result[-limit:]
                """
            ).lstrip(),
            "tests/test_history.py": dedent(
                """
                from src.history import recent_unique


                def test_recent_unique_keeps_most_recent_occurrences():
                    assert recent_unique(["a", "b", "a", "c", "b", "d"], 3) == ["c", "b", "d"]


                def test_recent_unique_preserves_chronological_order():
                    assert recent_unique(["a", "b", "c", "a", "d"], 10) == ["b", "c", "a", "d"]


                def test_recent_unique_handles_non_positive_limits():
                    assert recent_unique(["a", "b"], 0) == []
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/history.py": dedent(
                """
                def recent_unique(items, limit):
                    if limit <= 0:
                        return []
                    seen = set()
                    collected = []
                    for item in reversed(items):
                        if item in seen:
                            continue
                        seen.add(item)
                        collected.append(item)
                        if len(collected) == limit:
                            break
                    return list(reversed(collected))
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_009",
        "difficulty": "medium",
        "bug_type": "minimal_patch",
        "issue": """\
# challenge_009

`resolve_timeout` treats `0` as if the caller had not provided a value. That is incorrect:
`0` is a valid explicit timeout.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the patch minimal.
- Preserve the public API.
""",
        "files": {
            "src/timeouts.py": dedent(
                """
                def resolve_timeout(explicit, default):
                    return explicit or default
                """
            ).lstrip(),
            "tests/test_timeouts.py": dedent(
                """
                from src.timeouts import resolve_timeout


                def test_resolve_timeout_uses_default_when_missing():
                    assert resolve_timeout(None, 30) == 30


                def test_resolve_timeout_preserves_explicit_zero():
                    assert resolve_timeout(0, 30) == 0


                def test_resolve_timeout_preserves_non_zero_values():
                    assert resolve_timeout(5, 30) == 5
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/timeouts.py": dedent(
                """
                def resolve_timeout(explicit, default):
                    return default if explicit is None else explicit
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py"],
        "forbidden_files": ["tests/*"],
    },
    {
        "id": "challenge_010",
        "difficulty": "hard",
        "bug_type": "dependency_or_config_behavior",
        "issue": """\
# challenge_010

`load_backend` uses a config value to import a backend implementation, but short backend names
such as `memory` should resolve to the package-local backend modules. Unknown backends should
raise `ValueError` instead of leaking import errors.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve the public API of `load_backend`.
- Support both short config names and fully qualified module paths.
""",
        "files": {
            "src/backends/__init__.py": "",
            "src/backends/memory.py": dedent(
                """
                class Backend:
                    kind = "memory"


                    def put(self, key, value):
                        return (key, value)
                """
            ).lstrip(),
            "src/backends/file_backend.py": dedent(
                """
                class Backend:
                    kind = "file"


                    def put(self, key, value):
                        return f"{key}={value}"
                """
            ).lstrip(),
            "src/backend_loader.py": dedent(
                """
                import importlib


                def load_backend(name: str):
                    module = importlib.import_module(name)
                    return module.Backend()
                """
            ).lstrip(),
            "tests/test_backend_loader.py": dedent(
                """
                import pytest

                from src.backend_loader import load_backend


                def test_load_backend_supports_short_names():
                    backend = load_backend("memory")
                    assert backend.kind == "memory"


                def test_load_backend_supports_fully_qualified_modules():
                    backend = load_backend("src.backends.file_backend")
                    assert backend.kind == "file"


                def test_load_backend_raises_value_error_for_unknown_backend():
                    with pytest.raises(ValueError):
                        load_backend("missing_backend")
                """
            ).lstrip(),
        },
        "fixed_files": {
            "src/backend_loader.py": dedent(
                """
                import importlib


                def load_backend(name: str):
                    module_names = [name]
                    if "." not in name:
                        suffix = name if name.endswith("_backend") else f"{name}_backend"
                        module_names = [f"src.backends.{name}", f"src.backends.{suffix}"]

                    last_error = None
                    for module_name in module_names:
                        try:
                            module = importlib.import_module(module_name)
                        except ModuleNotFoundError as exc:
                            last_error = exc
                            continue
                        if not hasattr(module, "Backend"):
                            raise ValueError(f"backend module has no Backend class: {module_name}")
                        return module.Backend()

                    raise ValueError(f"unknown backend: {name}") from last_error
                """
            ).lstrip(),
        },
        "allowed_files": ["src/*.py", "src/backends/*.py"],
        "forbidden_files": ["tests/*"],
    },
]


def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def remove_readonly(func, path, exc_info) -> None:
    os.chmod(path, stat.S_IWRITE)
    func(path)


def build_metadata(spec: dict) -> dict[str, object]:
    return {
        "task_id": spec["id"],
        "difficulty": spec["difficulty"],
        "bug_type": spec["bug_type"],
        "allowed_files": spec["allowed_files"],
        "forbidden_files": spec["forbidden_files"],
        "success_criteria": [
            "visible tests pass",
            "hidden tests pass",
            "tests are not modified",
            "public API preserved",
        ],
    }


def create_task(base: Path, spec: dict) -> None:
    task_dir = base / spec["id"]
    repo = task_dir / "repo"
    repo_tests = repo / "tests"
    visible_tests = task_dir / "tests"
    if task_dir.exists():
        shutil.rmtree(task_dir, onerror=remove_readonly)

    repo.mkdir(parents=True, exist_ok=True)
    repo_tests.mkdir(parents=True, exist_ok=True)
    visible_tests.mkdir(parents=True, exist_ok=True)

    for rel, content in spec["files"].items():
        repo_path = repo / rel
        repo_path.parent.mkdir(parents=True, exist_ok=True)
        repo_path.write_text(content, encoding="utf-8")

        if rel.startswith("tests/"):
            task_path = task_dir / rel
            task_path.parent.mkdir(parents=True, exist_ok=True)
            task_path.write_text(content, encoding="utf-8")

    issue_text = dedent(spec["issue"]).strip() + "\n"
    (task_dir / "task.md").write_text(issue_text, encoding="utf-8")
    (task_dir / "issue.txt").write_text(issue_text, encoding="utf-8")
    (task_dir / "metadata.json").write_text(json.dumps(build_metadata(spec), indent=2), encoding="utf-8")
    (repo / "pytest.ini").write_text("[pytest]\npythonpath = .\n", encoding="utf-8")

    run(["git", "init"], repo)
    run(["git", "config", "user.email", "vet@example.local"], repo)
    run(["git", "config", "user.name", "VET Harness"], repo)
    run(["git", "add", "."], repo)
    run(["git", "commit", "-m", "initial failing challenge task"], repo)

    for rel, content in spec["fixed_files"].items():
        path = repo / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    diff = run(["git", "diff", "--binary"], repo).stdout
    (task_dir / "gold.patch").write_text(diff, encoding="utf-8")
    run(["git", "reset", "--hard", "HEAD"], repo)
    run(["git", "clean", "-fd"], repo)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="Output directory")
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for spec in TASKS:
        create_task(out, spec)

    print(f"Created {len(TASKS)} challenge tasks in {out}")


if __name__ == "__main__":
    main()
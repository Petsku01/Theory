#!/usr/bin/env python3
"""Create tiny software-engineering tasks for smoke-testing the VET harness.

These tasks are intentionally small. They are not meant to prove the VET hypothesis;
they verify that patch application, test execution, and scoring work.
"""
from __future__ import annotations

import argparse
import os
import stat
import shutil
import subprocess
from pathlib import Path

TASKS = [
    {
        "id": "task_001",
        "issue": "slugify should collapse repeated hyphens and trim leading/trailing hyphens.",
        "files": {
            "textutils.py": 'import re\n\ndef slugify(text):\n    text = text.lower().strip()\n    text = re.sub(r"[^a-z0-9]+", "-", text)\n    return text\n',
            "tests/test_textutils.py": 'from textutils import slugify\n\ndef test_basic_slugify():\n    assert slugify("Hello World") == "hello-world"\n\ndef test_collapse_and_trim_hyphens():\n    assert slugify("  Hello---World!!! ") == "hello-world"\n',
        },
        "fixed_files": {
            "textutils.py": 'import re\n\ndef slugify(text):\n    text = text.lower().strip()\n    text = re.sub(r"[^a-z0-9]+", "-", text)\n    text = re.sub(r"-+", "-", text).strip("-")\n    return text\n'
        },
    },
    {
        "id": "task_002",
        "issue": "parse_bool should accept uppercase TRUE/FALSE and surrounding whitespace.",
        "files": {
            "settings.py": 'def parse_bool(value):\n    if value == "true":\n        return True\n    if value == "false":\n        return False\n    raise ValueError(f"invalid boolean: {value}")\n',
            "tests/test_settings.py": 'from settings import parse_bool\n\ndef test_parse_bool_lowercase():\n    assert parse_bool("true") is True\n    assert parse_bool("false") is False\n\ndef test_parse_bool_whitespace_and_case():\n    assert parse_bool(" TRUE ") is True\n    assert parse_bool(" false ") is False\n',
        },
        "fixed_files": {
            "settings.py": 'def parse_bool(value):\n    value = value.strip().lower()\n    if value == "true":\n        return True\n    if value == "false":\n        return False\n    raise ValueError(f"invalid boolean: {value}")\n'
        },
    },
    {
        "id": "task_003",
        "issue": "median should raise ValueError on an empty input instead of IndexError.",
        "files": {
            "stats.py": 'def median(values):\n    values = sorted(values)\n    n = len(values)\n    mid = n // 2\n    if n % 2:\n        return values[mid]\n    return (values[mid - 1] + values[mid]) / 2\n',
            "tests/test_stats.py": 'import pytest\nfrom stats import median\n\ndef test_median_odd_even():\n    assert median([3, 1, 2]) == 2\n    assert median([1, 2, 3, 4]) == 2.5\n\ndef test_median_empty():\n    with pytest.raises(ValueError):\n        median([])\n',
        },
        "fixed_files": {
            "stats.py": 'def median(values):\n    values = sorted(values)\n    n = len(values)\n    if n == 0:\n        raise ValueError("median requires at least one value")\n    mid = n // 2\n    if n % 2:\n        return values[mid]\n    return (values[mid - 1] + values[mid]) / 2\n'
        },
    },
]


def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def remove_readonly(func, path, exc_info) -> None:
    os.chmod(path, stat.S_IWRITE)
    func(path)


def create_task(base: Path, spec: dict) -> None:
    task_dir = base / spec["id"]
    repo = task_dir / "repo"
    if task_dir.exists():
        shutil.rmtree(task_dir, onerror=remove_readonly)
    repo.mkdir(parents=True, exist_ok=True)
    (repo / "tests").mkdir(exist_ok=True)
    for rel, content in spec["files"].items():
        path = repo / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    (task_dir / "issue.txt").write_text(spec["issue"] + "\n", encoding="utf-8")
    (repo / "pytest.ini").write_text("[pytest]\npythonpath = .\n", encoding="utf-8")
    run(["git", "init"], repo)
    run(["git", "config", "user.email", "vet@example.local"], repo)
    run(["git", "config", "user.name", "VET Harness"], repo)
    run(["git", "add", "."], repo)
    run(["git", "commit", "-m", "initial failing task"], repo)

    # Generate gold.patch as a real git diff.
    for rel, content in spec["fixed_files"].items():
        (repo / rel).write_text(content, encoding="utf-8")
    diff = run(["git", "diff"], repo).stdout
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
    print(f"Created {len(TASKS)} toy tasks in {out}")


if __name__ == "__main__":
    main()

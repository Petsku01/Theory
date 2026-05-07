#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


HEADER_PREFIXES = (
    "diff --git ",
    "index ",
    "--- ",
    "+++ ",
    "new file mode ",
    "deleted file mode ",
    "old mode ",
    "new mode ",
    "rename from ",
    "rename to ",
    "similarity index ",
    "dissimilarity index ",
    "copy from ",
    "copy to ",
    "Binary files ",
    "GIT binary patch",
)


def normalize_patch(candidate: str) -> str:
    lines = candidate.splitlines()
    kept: list[str] = []
    in_hunk = False

    for line in lines:
        if line.startswith("@@"):
            kept.append(line)
            in_hunk = True
            continue

        if not in_hunk:
            if line.startswith(HEADER_PREFIXES):
                kept.append(line)
            continue

        if line.startswith((" ", "+", "-", "\\")):
            kept.append(line)
            continue

        if line.startswith("diff --git "):
            kept.append(line)
            in_hunk = False

    return "\n".join(kept).strip()


def extract_patch(text: str) -> tuple[str, str]:
    """Return an extraction status and unified diff patch text."""
    if not text.strip():
        return "empty_output", ""

    fenced = re.search(r"```(?:diff|patch)?\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if fenced:
        candidate = fenced.group(1).strip()
    else:
        candidate = text.strip()

    patterns = [
        r"diff --git ",
        r"--- ",
    ]

    start_indices: list[int] = []
    for pattern in patterns:
        match = re.search(pattern, candidate)
        if match:
            start_indices.append(match.start())

    if not start_indices:
        return "no_diff_found", ""

    start = min(start_indices)
    patch = normalize_patch(candidate[start:])
    if not patch:
        return "no_diff_found", ""
    patch = patch + "\n"
    return "ok", patch


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--status", required=True)
    args = parser.parse_args()

    raw_path = Path(args.raw)
    out_path = Path(args.out)
    status_path = Path(args.status)

    text = raw_path.read_text(encoding="utf-8", errors="replace")
    status, patch = extract_patch(text)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    status_path.parent.mkdir(parents=True, exist_ok=True)

    out_path.write_text(patch, encoding="utf-8")
    status_path.write_text(status + "\n", encoding="utf-8")

    print(status)


if __name__ == "__main__":
    main()
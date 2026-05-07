#!/usr/bin/env python3
import argparse
import difflib
import json
from pathlib import Path


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def safe_relative_path(path_str: str) -> bool:
    path = Path(path_str)
    if path.is_absolute():
        return False
    if ".." in path.parts:
        return False
    return True


def parse_json_payload(text: str) -> dict:
    stripped = text.strip()
    decoder = json.JSONDecoder()
    last_dict = None
    last_dict_with_edits = None
    for start, char in enumerate(stripped):
        if char not in "[{":
            continue
        try:
            parsed, _ = decoder.raw_decode(stripped[start:])
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            last_dict = parsed
            if "edits" in parsed:
                last_dict_with_edits = parsed
    if last_dict_with_edits is not None:
        return last_dict_with_edits
    if last_dict is not None:
        return last_dict
    raise json.JSONDecodeError("No valid top-level JSON object found.", stripped, 0)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", required=True)
    parser.add_argument("--json", required=True)
    parser.add_argument("--out-patch", required=True)
    parser.add_argument("--status", required=True)
    args = parser.parse_args()

    task_dir = Path(args.task)
    repo_dir = task_dir / "repo"
    json_path = Path(args.json)
    out_patch = Path(args.out_patch)
    status_path = Path(args.status)

    out_patch.parent.mkdir(parents=True, exist_ok=True)
    status_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        data = parse_json_payload(read_text(json_path))
    except Exception as exc:
        out_patch.write_text("", encoding="utf-8")
        status_path.write_text(f"invalid_json: {exc}\n", encoding="utf-8")
        return

    edits = data.get("edits")
    if isinstance(edits, dict):
        edits = [edits]
        repaired = True
    elif isinstance(edits, list):
        repaired = False
    else:
        out_patch.write_text("", encoding="utf-8")
        status_path.write_text("invalid_schema: edits is not a list\n", encoding="utf-8")
        return

    if not edits:
        out_patch.write_text("", encoding="utf-8")
        status_path.write_text("no_edits\n", encoding="utf-8")
        return

    patch_chunks: list[str] = []
    rejected: list[str] = []

    for edit in edits:
        if not isinstance(edit, dict):
            rejected.append("edit_not_object")
            continue

        rel_path = edit.get("path")
        content = edit.get("content")

        if not isinstance(rel_path, str) or not isinstance(content, str):
            rejected.append(f"invalid_edit_fields:{rel_path}")
            continue

        norm_path = rel_path.replace("\\", "/")

        if not safe_relative_path(norm_path):
            rejected.append(f"unsafe_path:{rel_path}")
            continue

        if norm_path.startswith("tests/") or "/tests/" in norm_path:
            rejected.append(f"forbidden_tests_edit:{rel_path}")
            continue

        old_file = repo_dir / norm_path
        if not old_file.exists() or not old_file.is_file():
            rejected.append(f"missing_original_file:{rel_path}")
            continue

        try:
            old_lines = read_text(old_file).splitlines()
        except OSError:
            rejected.append(f"unreadable_original_file:{rel_path}")
            continue
        new_lines = content.splitlines()

        if old_lines == new_lines:
            continue

        diff = difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile=f"a/{norm_path}",
            tofile=f"b/{norm_path}",
            lineterm="",
        )

        chunk = "\n".join(diff)
        if chunk.strip():
            patch_chunks.append(f"diff --git a/{norm_path} b/{norm_path}\n{chunk}\n")

    if rejected:
        out_patch.write_text("", encoding="utf-8")
        status_path.write_text("rejected:" + ";".join(rejected) + "\n", encoding="utf-8")
        return

    if not patch_chunks:
        out_patch.write_text("", encoding="utf-8")
        status_path.write_text("no_effective_changes\n", encoding="utf-8")
        return

    out_patch.write_text("\n".join(patch_chunks), encoding="utf-8")
    status = "ok_repaired_edits_dict_to_list" if repaired else "ok"
    status_path.write_text(f"{status}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
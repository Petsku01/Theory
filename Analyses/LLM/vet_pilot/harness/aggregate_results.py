#!/usr/bin/env python3
"""Aggregate evaluation JSON files into CSV and summary JSON."""
from __future__ import annotations

import argparse
import csv
import glob
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inputs", nargs="+", required=True, help="Input JSON files/globs")
    parser.add_argument("--out", required=True, help="Output CSV")
    args = parser.parse_args()

    files = []
    for pattern in args.inputs:
        files.extend(glob.glob(pattern))
    rows = []
    for f in sorted(files):
        try:
            data = json.loads(Path(f).read_text(encoding="utf-8"))
        except Exception:
            continue
        changed_files = data.get("changed_files")
        if isinstance(changed_files, list):
            changed_files_value = ";".join(str(path) for path in changed_files)
        else:
            changed_files_value = None
        rows.append({
            "file": f,
            "task": data.get("task"),
            "candidate": data.get("candidate"),
            "patch_applied": data.get("patch_applied"),
            "verified_solve": data.get("verified_solve"),
            "false_completion": data.get("false_completion"),
            "failure_type": data.get("failure_type"),
            "test_returncode": data.get("test_returncode"),
            "changed_files": changed_files_value,
            "duration_sec": data.get("duration_sec"),
        })

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if rows:
        with out.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
    else:
        out.write_text("", encoding="utf-8")

    n = len(rows)
    applied = sum(1 for r in rows if r["patch_applied"] is True)
    solved = sum(1 for r in rows if r["verified_solve"] is True)
    false_completed = sum(1 for r in rows if r["false_completion"] is True)
    failure_type_counts: dict[str, int] = {}
    for row in rows:
        failure_type = row.get("failure_type")
        if not failure_type:
            continue
        failure_type_counts[str(failure_type)] = failure_type_counts.get(str(failure_type), 0) + 1
    summary = {
        "n": n,
        "valid_patch_rate": applied / n if n else None,
        "verified_solve_rate": solved / n if n else None,
        "conditional_solve_rate": solved / applied if applied else None,
        "false_completion_rate": false_completed / n if n else None,
        "patch_applied_count": applied,
        "verified_solve_count": solved,
        "false_completion_count": false_completed,
        "failure_type_counts": failure_type_counts,
    }
    summary_path = out.with_suffix(".summary.json")
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

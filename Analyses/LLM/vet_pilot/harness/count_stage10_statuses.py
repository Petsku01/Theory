#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path


KNOWN_STATUSES = [
    "ok",
    "ok_repaired_edits_dict_to_list",
    "invalid_json",
    "invalid_schema",
    "no_edits",
    "rejected",
    "no_effective_changes",
]


def normalize_status(text: str) -> str:
    value = text.strip()
    if value.startswith("invalid_json"):
        return "invalid_json"
    if value.startswith("invalid_schema"):
        return "invalid_schema"
    if value.startswith("rejected"):
        return "rejected"
    if value in KNOWN_STATUSES:
        return value
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("results/stage10_replications"))
    parser.add_argument("--candidates-root", type=Path, default=Path("candidates/stage10_replications"))
    parser.add_argument("--out", type=Path, default=Path("results/stage10_replications/status_counts.csv"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows: list[dict[str, object]] = []
    rep_dirs = sorted(path.name for path in args.root.glob("rep_*") if path.is_dir())
    conditions = ["agent_a", "agent_b", "agent_c"]

    for rep in rep_dirs:
        for condition in conditions:
            counter: Counter[str] = Counter()
            status_dir = args.candidates_root / rep / condition / "status"
            for path in sorted(status_dir.glob("*.txt")):
                counter[normalize_status(path.read_text(encoding="utf-8"))] += 1
            for status in KNOWN_STATUSES:
                rows.append({
                    "rep": rep,
                    "condition": condition,
                    "status": status,
                    "count": counter.get(status, 0),
                })

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["rep", "condition", "status", "count"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""Validate VET JSONL records against schemas/vet.schema.json."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from jsonschema import Draft202012Validator


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default="schemas/vet.schema.json")
    parser.add_argument("--jsonl", required=True)
    args = parser.parse_args()

    schema = json.loads(Path(args.schema).read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    ok = True
    for i, line in enumerate(Path(args.jsonl).read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        record = json.loads(line)
        errors = sorted(validator.iter_errors(record), key=lambda e: e.path)
        if errors:
            ok = False
            print(f"Line {i}: invalid")
            for err in errors:
                print(f"  {'/'.join(map(str, err.path))}: {err.message}")
        else:
            print(f"Line {i}: valid")
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()

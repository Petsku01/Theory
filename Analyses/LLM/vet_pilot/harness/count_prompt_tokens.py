#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


PROMPTS = [
    ("Agent A", Path("prompts/vet_scaling_pilot/agent_a_instruction_only.md")),
    ("Agent B", Path("prompts/vet_scaling_pilot/agent_b_final_patch.md")),
    ("Agent C", Path("prompts/vet_scaling_pilot/agent_c_verified_lessons.md")),
    ("Agent D", Path("prompts/vet_scaling_pilot/agent_d_full_verified_trajectory.md")),
    ("Agent B2", Path("prompts/vet_scaling_stage3/agent_b2_token_matched_final_patch.md")),
    ("Agent D-shuffled", Path("prompts/vet_scaling_stage3/agent_d_shuffled_trajectory.md")),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-root", type=Path, default=Path("results/vet_scaling_stage4"))
    return parser.parse_args()


def count_tokens(text: str) -> tuple[int, str]:
    try:
        import tiktoken  # type: ignore
    except ImportError:
        return len(text.split()), "whitespace proxy"

    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text)), "cl100k_base (tiktoken)"


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parent.parent
    args.out_root.mkdir(parents=True, exist_ok=True)
    out_path = args.out_root / "prompt_token_counts.csv"

    rows: list[dict[str, object]] = []
    for prompt_name, relative_path in PROMPTS:
        path = repo_root / relative_path
        text = path.read_text(encoding="utf-8")
        tokens, tokenizer = count_tokens(text)
        rows.append(
            {
                "Prompt": prompt_name,
                "File": str(relative_path).replace("\\", "/"),
                "Characters": len(text),
                "Tokens": tokens,
                "Tokenizer": tokenizer,
            }
        )

    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Prompt", "File", "Characters", "Tokens", "Tokenizer"])
        writer.writeheader()
        writer.writerows(rows)

    print(
        json.dumps(
            {
                "prompt_token_counts": str(out_path),
                "tokenizer": rows[0]["Tokenizer"] if rows else None,
                "n_prompts": len(rows),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
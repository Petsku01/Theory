# Challenge JSON Mode Results

This directory contains Stage 5 of the challenge evaluation: JSON edit mode. Instead of asking the model to emit a raw git diff, the harness asked for structured JSON full-file replacements, converted those edits into a patch locally, and then evaluated the generated patch with the existing verifier.

The Stage 5 question was:

```text
Can the model fix the code once the raw git-diff formatting bottleneck is removed?
```

## Method

Pipeline used in Stage 5:

1. Save raw model output to `candidates/challenge_json/<agent>/raw/`.
2. Parse the first valid top-level JSON object from the raw text.
3. Convert JSON full-file replacements to a unified diff with `harness/json_edits_to_patch.py`.
4. Evaluate the resulting patch with `harness/evaluate_task.py`.
5. Aggregate results with `harness/aggregate_results.py`.

Important note on interpretation:

- The backend still sometimes emitted reasoning text around the JSON.
- The converter therefore extracted the first valid top-level JSON object before schema validation.
- As a result, `JSON ok rate` below measures recoverable structured responses, not strict first-character JSON purity.

## Manual Validation Gate

Before any model-backed run, a handcrafted JSON edit for `challenge_006` was converted and evaluated.

Expected gate:

- `status = ok`
- `patch_applied = true`
- `verified_solve = true`

Observed gate:

- `status = ok`
- `patch_applied = true`
- `verified_solve = true`

Artifacts:

- `manual/challenge_006.json`
- `../../candidates/challenge_json/manual/raw/challenge_006.json`
- `../../candidates/challenge_json/manual/patches/challenge_006.patch`
- `../../candidates/challenge_json/manual/status/challenge_006.txt`

## Main Comparison

| Condition | Tasks | JSON ok rate | Patch applied rate | Verified solve rate | Solve if applied | False completion |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Agent A | 10 | 0.6 | 0.6 | 0.5 | 0.833 | 0.1 |
| Agent B | 10 | 0.7 | 0.2 | 0.1 | 0.5 | 0.1 |
| Agent C | 10 | 0.6 | 0.6 | 0.5 | 0.833 | 0.1 |

Comparison against old diff mode:

| Condition | Old valid patch rate | JSON-mode patch applied rate | Old verified solve rate | JSON-mode verified solve rate |
| --- | ---: | ---: | ---: | ---: |
| Agent A | 0.7 | 0.6 | 0.5 | 0.5 |
| Agent B | 0.0 | 0.2 | 0.0 | 0.1 |
| Agent C | 0.3 | 0.6 | 0.3 | 0.5 |

## Status Counts

Observed JSON conversion status counts:

| Condition | ok | invalid_schema | invalid_json | no_edits | rejected | no_effective_changes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Agent A | 6 | 4 | 0 | 0 | 0 | 0 |
| Agent B | 7 | 3 | 0 | 0 | 0 | 0 |
| Agent C | 6 | 4 | 0 | 0 | 0 | 0 |

Observed non-guide status detail:

- All non-`ok` statuses were `invalid_schema: edits is not a list`.
- No `invalid_json`, `no_edits`, `rejected`, or `no_effective_changes` statuses were observed in the full 30-task run.

## Per-Condition Outcomes

| Condition | Verified solves | Solved tasks | Applied-but-unsolved tasks | Non-applying tasks |
| --- | --- | --- | --- | --- |
| Agent A | 5/10 | `001`, `003`, `006`, `009`, `010` | `005` (`syntax_error`) | `002`, `004`, `007`, `008` |
| Agent B | 1/10 | `002` | `003` (`tests_failed`) | `001`, `004`, `005`, `006`, `007`, `008`, `009`, `010` |
| Agent C | 5/10 | `005`, `006`, `008`, `009`, `010` | `003` (`tests_failed`) | `001`, `002`, `004`, `007` |

## Interpretation

Primary result:

- Stage 5 matches Outcome A from the guide for Agent B and Agent C: removing raw diff formatting materially improved patch application.

Condition-by-condition interpretation:

- Agent A did not improve on solve rate; JSON mode preserved its `0.5` verified solve rate but reduced patch application slightly from `0.7` to `0.6`.
- Agent B improved from `0.0` to `0.2` patch applied rate and from `0.0` to `0.1` verified solve rate.
- Agent C improved from `0.3` to `0.6` patch applied rate and from `0.3` to `0.5` verified solve rate.

What JSON mode fixed:

- It substantially reduced the Stage 3/4 failure mode where no usable patch artifact existed at all.
- It showed that raw git-diff formatting was a real bottleneck, especially for Agent B and Agent C.

What still remains broken:

- Some outputs still violated the requested schema by returning an object whose `edits` field was not a list.
- Some schema-valid patches still failed to apply or failed tests, so semantic task solving remains a real error source after patch-formatting pressure is reduced.

Overall takeaway:

> Structured edit mode improves evaluator reachability on this benchmark, but the current backend is still limited by schema adherence and task-level semantic errors.

## Representative Failures

Schema failures:

- Agent A invalid schema: `../../candidates/challenge_json/agent_a/raw/challenge_002.json`
- Agent A invalid schema status: `../../candidates/challenge_json/agent_a/status/challenge_002.txt`
- Agent B invalid schema: `../../candidates/challenge_json/agent_b/raw/challenge_004.json`
- Agent B invalid schema status: `../../candidates/challenge_json/agent_b/status/challenge_004.txt`
- Agent C invalid schema: `../../candidates/challenge_json/agent_c/raw/challenge_001.json`
- Agent C invalid schema status: `../../candidates/challenge_json/agent_c/status/challenge_001.txt`

Schema-valid but incorrect edits:

- Agent B `tests_failed`: `agent_b/challenge_003.json`
- Agent B raw JSON for that failure: `../../candidates/challenge_json/agent_b/raw/challenge_003.json`
- Agent A `syntax_error`: `agent_a/challenge_005.json`
- Agent A raw JSON for that failure: `../../candidates/challenge_json/agent_a/raw/challenge_005.json`

## Key Artifacts

Summary files:

- `agent_a_summary.csv`
- `agent_a_summary.summary.json`
- `agent_b_summary.csv`
- `agent_b_summary.summary.json`
- `agent_c_summary.csv`
- `agent_c_summary.summary.json`

Per-condition results:

- `agent_a/`
- `agent_b/`
- `agent_c/`

Per-condition run logs:

- `agent_a/runs/`
- `agent_b/runs/`
- `agent_c/runs/`

Raw JSON / converted patches / statuses:

- `../../candidates/challenge_json/agent_a/raw/`
- `../../candidates/challenge_json/agent_a/patches/`
- `../../candidates/challenge_json/agent_a/status/`
- `../../candidates/challenge_json/agent_b/raw/`
- `../../candidates/challenge_json/agent_b/patches/`
- `../../candidates/challenge_json/agent_b/status/`
- `../../candidates/challenge_json/agent_c/raw/`
- `../../candidates/challenge_json/agent_c/patches/`
- `../../candidates/challenge_json/agent_c/status/`
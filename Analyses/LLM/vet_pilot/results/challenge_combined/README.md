# Challenge Combined Results

This directory contains the canonical combined challenge result set. It merges Stage 5 JSON-mode outputs with Stage 6 schema-repair follow-ups and picks exactly one result per condition-task pair, so the paper can use a single clean table instead of counting Stage 5 and Stage 6 separately.

## Scope

| Item | Value |
| --- | --- |
| Task count | 10 challenge tasks |
| Conditions | `agent_a`, `agent_b`, `agent_c` |
| Combined output root | `results/challenge_combined` |
| Stage 5 source root | `results/challenge_json` |
| Stage 6 source root | `results/challenge_json_repaired` |
| Selection matrix | `combined_matrix.csv` |
| Interface metrics table | `interface_adjusted_metrics.csv` |

## Selection Rule

The combined view uses the following rule for each condition and task:

1. Use the Stage 5 result when Stage 5 produced a schema-usable output.
2. If Stage 5 failed with `invalid_schema`, use the Stage 6 follow-up for that same condition-task pair.
3. Never count both Stage 5 and Stage 6 for the same task.

Stage-source mix in the canonical combined set:

| Condition | Stage 5 retained tasks | Stage 6 substituted tasks |
| --- | ---: | ---: |
| Agent A | 6 | 4 |
| Agent B | 7 | 3 |
| Agent C | 6 | 4 |

## Canonical Paper-Facing Table

This is the main table the paper should report.

| Condition | Schema usable | Patch applied | Verified solve | Semantic failure after apply |
| --- | ---: | ---: | ---: | ---: |
| Agent A | 9/10 | 6/10 | 5/10 | 1 |
| Agent B | 10/10 | 5/10 | 4/10 | 1 |
| Agent C | 9/10 | 7/10 | 6/10 | 1 |

Rate view from the condition summaries:

| Condition | Valid patch rate | Verified solve rate | Solve if applied | False completion rate |
| --- | ---: | ---: | ---: | ---: |
| Agent A | 0.6 | 0.5 | 0.833 | 0.1 |
| Agent B | 0.5 | 0.4 | 0.8 | 0.1 |
| Agent C | 0.7 | 0.6 | 0.857 | 0.1 |

## Condition Summary

| Condition | Verified solves | Solved tasks | Applied-but-unsolved tasks | Schema-not-usable tasks |
| --- | --- | --- | --- | --- |
| Agent A | 5/10 | `001`, `003`, `006`, `009`, `010` | `002`, `004`, `005`, `007`, `008` with only `005` counted as semantic failure after apply | `007` |
| Agent B | 4/10 | `002`, `004`, `007`, `008` | `003` (`tests_failed`) | none |
| Agent C | 6/10 | `002`, `005`, `006`, `008`, `009`, `010` | `003` (`tests_failed`) | `001` |

What changed relative to Stage 5 alone:

- Agent A gained no extra solves, but recovered three additional schema-usable outputs.
- Agent B gained three additional verified solves through Stage 6 substitutions on `004`, `007`, and `008`.
- Agent C gained one additional verified solve on `002` and one additional applied patch overall.

## Task Matrix

Canonical chosen outcome per task and condition:

| Task | Agent A | Agent B | Agent C |
| --- | --- | --- | --- |
| `challenge_001` | `solve` | `patch_did_not_apply` | `patch_did_not_apply` |
| `challenge_002` | `patch_did_not_apply` | `solve` | `solve` |
| `challenge_003` | `solve` | `tests_failed` | `tests_failed` |
| `challenge_004` | `patch_did_not_apply` | `solve` | `patch_did_not_apply` |
| `challenge_005` | `syntax_error` | `patch_did_not_apply` | `solve` |
| `challenge_006` | `solve` | `patch_did_not_apply` | `solve` |
| `challenge_007` | `patch_did_not_apply` | `solve` | `patch_did_not_apply` |
| `challenge_008` | `patch_did_not_apply` | `solve` | `solve` |
| `challenge_009` | `solve` | `patch_did_not_apply` | `solve` |
| `challenge_010` | `solve` | `patch_did_not_apply` | `solve` |

Chosen source per task where Stage 6 was needed:

| Task | Agent A source | Agent B source | Agent C source |
| --- | --- | --- | --- |
| `challenge_001` | `stage5` | `stage5` | `stage6` |
| `challenge_002` | `stage6` | `stage5` | `stage6` |
| `challenge_004` | `stage6` | `stage6` | `stage6` |
| `challenge_007` | `stage6` | `stage6` | `stage6` |
| `challenge_008` | `stage6` | `stage6` | `stage5` |

## Interpretation

- This combined view is the cleanest benchmark summary in the repository because it removes Stage 5 versus Stage 6 double counting while preserving the real failure layer for each task.
- Agent C is the strongest condition in the canonical merged result set at `6/10` verified solves.
- Agent A remains competitive at `5/10`, but most of its remaining misses survive schema repair and therefore look less like shallow interface problems.
- Agent B improves from the weakest Stage 5 condition to `4/10` once shallow schema failures are folded in, showing how misleading a single collapsed failure count would have been.
- The interface-adjusted table is the main methodological contribution of this stage: it shows that schema usability, patch application, and semantic failure after apply are distinct layers and should be reported separately.

## Artifact Map

Summary files:

- `agent_a_summary.csv`
- `agent_a_summary.summary.json`
- `agent_b_summary.csv`
- `agent_b_summary.summary.json`
- `agent_c_summary.csv`
- `agent_c_summary.summary.json`

Selection and interface tables:

- `combined_matrix.csv`
- `interface_adjusted_metrics.csv`

Chosen result JSONs:

- `agent_a/`
- `agent_b/`
- `agent_c/`

## Source Files Used For This README

This README is grounded in the generated Stage 7 artifacts, not hand-entered counts. The main source files were:

- `agent_a_summary.summary.json`
- `agent_b_summary.summary.json`
- `agent_c_summary.summary.json`
- `interface_adjusted_metrics.csv`
- `combined_matrix.csv`
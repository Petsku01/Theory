# Challenge JSON Repair Results

This directory contains Stage 6 of the challenge evaluation: schema repair on top of Stage 5 JSON edit mode. It reprocesses only the Stage 5 `invalid_schema` cases, without making any new model calls, to measure how many apparent failures were shallow interface deviations rather than semantic failures.

The Stage 6 question was:

```text
Can shallow schema/interface repair recover a material share of the remaining Stage 5 failures without another model call?
```

## Method

Pipeline used in Stage 6:

1. Reprocess only Stage 5 `invalid_schema` cases from `../../candidates/challenge_json/<agent>/raw/`.
2. Parse raw output by preferring the last valid top-level JSON object that contains `edits`, falling back to the last valid top-level object when needed.
3. If `edits` is a dictionary, wrap it in a list and emit `ok_repaired_edits_dict_to_list`.
4. Reject non-file or unreadable placeholder paths cleanly instead of crashing.
5. Convert repaired JSON outputs into patches under `../../candidates/challenge_json_repaired/<agent>/patches/`.
6. Evaluate those patches with `harness/evaluate_task.py` and aggregate with `harness/aggregate_results.py`.

Important note on interpretation:

- `repaired usable outputs` below count repaired statuses that became `ok` or `ok_repaired_edits_dict_to_list`.
- In this Stage 6 slice, no successful repair actually needed `ok_repaired_edits_dict_to_list`; the dominant recovery came from selecting the correct JSON object out of mixed reasoning plus JSON raw output.

## Repaired-Only Results

| Condition | Reprocessed invalid-schema cases | Repaired usable outputs | Patch applied rate | Verified solve rate | Extra solved tasks |
| --- | ---: | ---: | ---: | ---: | --- |
| Agent A | 4 | 3/4 | 0.0 | 0.0 | none |
| Agent B | 3 | 3/3 | 1.0 | 1.0 | `004`, `007`, `008` |
| Agent C | 4 | 3/4 | 0.25 | 0.25 | `002` |

Repaired status detail:

| Condition | ok | ok_repaired_edits_dict_to_list | invalid_schema | rejected |
| --- | ---: | ---: | ---: | ---: |
| Agent A | 3 | 0 | 0 | 1 |
| Agent B | 3 | 0 | 0 | 0 |
| Agent C | 3 | 0 | 1 | 0 |

## Combined View

Merged Stage 5 JSON plus Stage 6 repaired solve table:

| Condition | JSON original solve | Repaired extra solves | Combined solve rate |
| --- | --- | ---: | --- |
| Agent A | 5/10 | 0 | 5/10 |
| Agent B | 1/10 | 3 | 4/10 |
| Agent C | 5/10 | 1 | 6/10 |

Merged Stage 5 JSON plus Stage 6 usable-output table:

| Condition | Original JSON ok | Repaired schema outputs | Total usable outputs |
| --- | --- | --- | --- |
| Agent A | 6/10 | 3/4 | 9/10 |
| Agent B | 7/10 | 3/3 | 10/10 |
| Agent C | 6/10 | 3/4 | 9/10 |

## Interpretation

- Stage 6 confirms that a substantial share of the Stage 5 `invalid_schema` failures were interface failures rather than semantic failures.
- Agent B recovered all three of its Stage 5 invalid-schema cases into verified solves, raising its combined solve rate from `1/10` to `4/10`.
- Agent C recovered one additional verified solve and three additional usable outputs, raising its combined solve rate from `5/10` to `6/10`.
- Agent A recovered three usable outputs but no extra solves, which means its remaining repaired-slice failures are not just shallow schema-wrapper issues.
- After Stage 6, output usability rises to `9/10`, `10/10`, and `9/10` for Agent A, Agent B, and Agent C respectively.

## Experiment Status

- Stage 0: Harness smoke test - PASSED
- Stage 1: Toy A/B/C validation - PASSED
- Stage 2: Challenge task construction - PASSED
- Stage 3: Diff-mode challenge run - PASSED WITH CONFOUNDS
- Stage 4: Targeted diff rerun - DIAGNOSTIC, PATCH FORMAT BOTTLENECK
- Stage 5: JSON edit mode - PASSED, EVALUATOR REACHABILITY IMPROVED
- Stage 6: Schema repair - PASSED, INTERFACE FAILURES FURTHER REDUCED

## Interface Reliability as a Prerequisite for Agent Evaluation

> In our pilot, a substantial share of apparent task failures were not semantic failures, but interface failures: backend timeouts, malformed diffs, and shallow schema deviations. Structured edit mode improved evaluator reachability, demonstrating that agent benchmarks should separately report output-validity, patch-application, and semantic-solve rates.

## Key Artifacts

Summary files:

- `agent_a_summary.csv`
- `agent_a_summary.summary.json`
- `agent_b_summary.csv`
- `agent_b_summary.summary.json`
- `agent_c_summary.csv`
- `agent_c_summary.summary.json`

Per-condition repaired results:

- `agent_a/`
- `agent_b/`
- `agent_c/`

Repaired patches and statuses:

- `../../candidates/challenge_json_repaired/agent_a/patches/`
- `../../candidates/challenge_json_repaired/agent_a/status/`
- `../../candidates/challenge_json_repaired/agent_b/patches/`
- `../../candidates/challenge_json_repaired/agent_b/status/`
- `../../candidates/challenge_json_repaired/agent_c/patches/`
- `../../candidates/challenge_json_repaired/agent_c/status/`

Representative repaired outcomes:

- Agent B recovered solve: `agent_b/challenge_004.json`
- Agent B recovered solve: `agent_b/challenge_007.json`
- Agent B recovered solve: `agent_b/challenge_008.json`
- Agent C recovered solve: `agent_c/challenge_002.json`
- Agent A placeholder-path rejection: `../../candidates/challenge_json_repaired/agent_a/status/challenge_007.txt`
- Agent C remaining invalid schema after repair: `../../candidates/challenge_json_repaired/agent_c/status/challenge_001.txt`
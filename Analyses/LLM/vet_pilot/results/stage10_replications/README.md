# Stage 10 Replication Stability Study

This directory contains Stage 10: a five-replication stability study over the repaired JSON interface. The purpose of this stage is to separate a robust interface claim from a potentially noisy prompt-ranking claim. This README is written as a self-contained results note, with prompt provenance, task-level breakdowns, and an artifact manifest suitable for a workshop-style appendix.

The main questions are:

1. Does the repaired JSON interface consistently improve evaluator reachability?
2. Do Agent A, Agent B, and Agent C keep the same ranking across repeated runs?
3. How much variance appears to come from model or backend randomness rather than the benchmark interface itself?

## Method

Stage 10 freezes all earlier results and writes only to new roots:

- `results/stage10_replications`
- `candidates/stage10_replications`

Every run uses the repaired JSON pipeline only:

```text
raw model JSON
-> json_edits_to_patch.py
-> candidate patch
-> evaluate_task.py
-> result JSON
-> aggregate_results.py
```

No raw diff mode is used in Stage 10.

## Scope

| Item | Value |
| --- | --- |
| Replications | 5 |
| Tasks per replication | 10 challenge tasks |
| Conditions | `agent_a`, `agent_b`, `agent_c` |
| Total condition-task runs | 150 |
| Model | `gpt-oss:20b-cloud` |
| Transport | `ollama-cli` |
| Results root | `results/stage10_replications` |
| Candidates root | `candidates/stage10_replications` |
| Replication plan | `replication_plan.md` |

Condition order rotates by replication to reduce ordering effects:

| Replication | Condition order |
| --- | --- |
| `rep_01` | A -> B -> C |
| `rep_02` | B -> C -> A |
| `rep_03` | C -> A -> B |
| `rep_04` | A -> C -> B |
| `rep_05` | B -> A -> C |

## Prompt Conditions

All three Stage 10 conditions share the same system prompt, the same repaired JSON converter, the same evaluator, and the same output schema. The experimental difference is the conditioning signal injected before the run.

| Condition | Prompt file | What changes relative to the baseline |
| --- | --- | --- |
| Agent A | [`../../prompts/agent_a_instruction_only_json.md`](../../prompts/agent_a_instruction_only_json.md) | Instruction-only JSON contract with no examples and no prior patch history. |
| Agent B | [`../../prompts/agent_b_final_patch_json.md`](../../prompts/agent_b_final_patch_json.md) | Adds a final-success patch pattern, but no failed attempts, verifier history, or corrective trajectory. |
| Agent C | [`../../prompts/agent_c_vet_json.md`](../../prompts/agent_c_vet_json.md) | Adds verified-trajectory lessons: treat failures as evidence, run targeted then broader tests, preserve APIs, and revert unexplained partial changes. |

Prompt interpretation:

- Agent A is the repaired-interface baseline.
- Agent B tests whether final successful examples alone improve usable-edit generation.
- Agent C tests whether distilled verified-trajectory lessons improve usable-edit generation beyond final-patch exemplars.

## Table A: Solve Stability

| Condition | Mean solve rate | Std dev | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| Agent A | 0.340 | 0.230 | 0.100 | 0.700 |
| Agent B | 0.360 | 0.230 | 0.100 | 0.700 |
| Agent C | 0.700 | 0.141 | 0.500 | 0.800 |

Per-replication solve rates:

| Replication | Agent A | Agent B | Agent C |
| --- | ---: | ---: | ---: |
| `rep_01` | 0.7 | 0.2 | 0.8 |
| `rep_02` | 0.1 | 0.1 | 0.8 |
| `rep_03` | 0.2 | 0.7 | 0.8 |
| `rep_04` | 0.3 | 0.4 | 0.6 |
| `rep_05` | 0.4 | 0.4 | 0.5 |

What Table A shows:

- Agent C is strongest on average and also has the lowest variance among the three conditions.
- Agent A and Agent B are not stably separable: their means are nearly identical and their ordering flips across replications.
- The lower-ranked conditions are therefore not robust enough to over-claim as a stable ranking result.

## Table B: Interface Reachability

| Condition | Mean patch applied | Std dev | Mean solve if applied |
| --- | ---: | ---: | ---: |
| Agent A | 0.360 | 0.270 | 0.975 |
| Agent B | 0.400 | 0.255 | 0.933 |
| Agent C | 0.740 | 0.134 | 0.944 |

Interpretation of Table B:

- Patch-applied rate tracks solve rate closely across all three conditions.
- Solve-if-applied remains high for every condition, which means semantic correctness is usually strong once a usable patch exists.
- The dominant bottleneck remains usable-edit generation rather than semantic repair after a patch applies.

## Table C: Status Counts

Aggregated across all five replications:

| Condition | ok | repaired | invalid_json | invalid_schema | no_edits | rejected | no_effective_changes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Agent A | 41 | 0 | 1 | 1 | 6 | 0 | 1 |
| Agent B | 41 | 0 | 1 | 3 | 3 | 0 | 2 |
| Agent C | 48 | 0 | 0 | 2 | 0 | 0 | 0 |

What the status counts show:

- Stage 10 does not regress to the earlier diff-mode failure profile dominated by missing or malformed patch artifacts.
- Agent C has the cleanest interface profile, with `48/50` runs ending in `ok`.
- Agent A and Agent B still produce some schema or content-format misses, but those failures are modest relative to the full 50-run slice.
- No run in Stage 10 required `ok_repaired_edits_dict_to_list`, so the repaired converter’s main practical value here is robust parsing and deterministic patch generation rather than frequent singleton-list repair.

## Task-Level Breakdown

Solve and apply counts below are out of five replications for each condition.

| Task | Bug family | Agent A | Agent B | Agent C | Read |
| --- | --- | ---: | ---: | ---: | --- |
| `challenge_001` | `edge_case` | 1 solved / 1 applied | 2 solved / 2 applied | 4 solved / 5 applied | Agent C is strongest; Agent A and Agent B mostly fail before producing an applicable patch. |
| `challenge_002` | `multi_file` | 4 solved / 4 applied | 1 solved / 1 applied | 2 solved / 2 applied | Agent A is strongest on this multi-file edit; Agent B and Agent C often fail to reach an applicable patch. |
| `challenge_003` | `misleading_obvious_fix` | 1 solved / 1 applied | 2 solved / 2 applied | 4 solved / 5 applied | Agent C is strongest; final-patch examples help somewhat, but verified-trajectory guidance helps more. |
| `challenge_004` | `state_mutation` | 0 solved / 0 applied | 2 solved / 3 applied | 4 solved / 4 applied | Agent C is strongest; Agent A never reaches an applicable patch on this task. |
| `challenge_005` | `hidden_edge_case` | 1 solved / 1 applied | 2 solved / 2 applied | 5 solved / 5 applied | Agent C solves every replication. |
| `challenge_006` | `type_or_format` | 0 solved / 1 applied | 1 solved / 2 applied | 5 solved / 5 applied | Agent C solves every replication; Agent A and Agent B rarely reach a correct patch. |
| `challenge_007` | `public_api_preservation` | 4 solved / 4 applied | 3 solved / 3 applied | 0 solved / 0 applied | Main exception to Agent C dominance: Agent A and Agent B outperform on strict API-preservation behavior. |
| `challenge_008` | `regression_trap` | 2 solved / 2 applied | 2 solved / 2 applied | 3 solved / 3 applied | Mixed task with only a small Agent C edge. |
| `challenge_009` | `minimal_patch` | 1 solved / 1 applied | 2 solved / 2 applied | 5 solved / 5 applied | Agent C solves every replication. |
| `challenge_010` | `dependency_or_config_behavior` | 3 solved / 3 applied | 1 solved / 1 applied | 3 solved / 3 applied | Agent A and Agent C tie; Agent B remains weak here. |

What the task table shows:

- Agent C is clearly strongest on six of the ten tasks: `challenge_001`, `challenge_003`, `challenge_004`, `challenge_005`, `challenge_006`, and `challenge_009`.
- Agent A leads `challenge_002` and, together with Agent B, dominates `challenge_007`, which is the main counterexample to a blanket Agent C superiority claim.
- `challenge_008` and `challenge_010` remain mixed, which is consistent with the overall finding that ranking is only partially stable.
- Across most Agent A and Agent B misses, the dominant failure mode is still lack of an applicable patch rather than semantic failure after patch application.

## Main Interpretation

- The interface-reliability finding is stable enough to report. Across five replications, solve-if-applied stays above `0.93` for every condition and patch-applied rate remains the main predictor of solve rate.
- Agent C is strongest on average in this pilot under the repaired JSON interface.
- Agent A versus Agent B remains noisy. Their mean solve rates are close (`0.34` vs `0.36`) and their ranking changes across replications.
- The strongest paper claim is therefore methodological: interface stability is robust, while prompt-condition ranking is only partially stable.

This is the Stage 10 answer in one sentence:

> Interface-reliability findings are stable across repeated runs, but prompt-condition ranking is only partially stable: Agent C is strongest on average, while Agent A and Agent B remain noisy relative to each other.

## Suggested Paper Language

If you want a cautious summary sentence for the paper, use:

> Across five replications, the repaired JSON interface consistently preserved high semantic correctness once patches applied, while variation in patch applicability remained the main driver of outcome differences. Prompt-condition ranking was only partially stable: Agent C was strongest on average, but Agent A and Agent B were not reliably separable.

## Artifact Manifest

Frozen inputs:

- [`../../prompts/agent_a_instruction_only_json.md`](../../prompts/agent_a_instruction_only_json.md)
- [`../../prompts/agent_b_final_patch_json.md`](../../prompts/agent_b_final_patch_json.md)
- [`../../prompts/agent_c_vet_json.md`](../../prompts/agent_c_vet_json.md)
- [`replication_plan.md`](replication_plan.md)
- [`stage10_manifest.json`](stage10_manifest.json)

Cross-replication outputs:

- [`stage10_summary.csv`](stage10_summary.csv)
- [`stage10_patch_metrics.csv`](stage10_patch_metrics.csv)
- [`status_counts.csv`](status_counts.csv)
- [`README.md`](README.md)

Per-replication result summaries:

- [`rep_01/agent_a_summary.summary.json`](rep_01/agent_a_summary.summary.json), [`rep_01/agent_b_summary.summary.json`](rep_01/agent_b_summary.summary.json), [`rep_01/agent_c_summary.summary.json`](rep_01/agent_c_summary.summary.json)
- [`rep_02/agent_a_summary.summary.json`](rep_02/agent_a_summary.summary.json), [`rep_02/agent_b_summary.summary.json`](rep_02/agent_b_summary.summary.json), [`rep_02/agent_c_summary.summary.json`](rep_02/agent_c_summary.summary.json)
- [`rep_03/agent_a_summary.summary.json`](rep_03/agent_a_summary.summary.json), [`rep_03/agent_b_summary.summary.json`](rep_03/agent_b_summary.summary.json), [`rep_03/agent_c_summary.summary.json`](rep_03/agent_c_summary.summary.json)
- [`rep_04/agent_a_summary.summary.json`](rep_04/agent_a_summary.summary.json), [`rep_04/agent_b_summary.summary.json`](rep_04/agent_b_summary.summary.json), [`rep_04/agent_c_summary.summary.json`](rep_04/agent_c_summary.summary.json)
- [`rep_05/agent_a_summary.summary.json`](rep_05/agent_a_summary.summary.json), [`rep_05/agent_b_summary.summary.json`](rep_05/agent_b_summary.summary.json), [`rep_05/agent_c_summary.summary.json`](rep_05/agent_c_summary.summary.json)

Primary reproduction scripts:

- [`../../harness/run_stage10_replications.py`](../../harness/run_stage10_replications.py)
- [`../../harness/summarize_stage10.py`](../../harness/summarize_stage10.py)
- [`../../harness/stage10_patch_metrics.py`](../../harness/stage10_patch_metrics.py)
- [`../../harness/count_stage10_statuses.py`](../../harness/count_stage10_statuses.py)

Candidate artifacts:

- `../../candidates/stage10_replications/rep_01/` through `../../candidates/stage10_replications/rep_05/` contain the raw JSON responses, converted patches, and status files used to build the Stage 10 tables.

## Provenance

This README is grounded in generated Stage 10 artifacts rather than hand-entered totals. Condition-level tables come from [`stage10_summary.csv`](stage10_summary.csv), [`stage10_patch_metrics.csv`](stage10_patch_metrics.csv), and [`status_counts.csv`](status_counts.csv). The task-level breakdown is derived from the per-task result JSONs under [`rep_01/`](rep_01/) through [`rep_05/`](rep_05/), using the same evaluator outputs that feed the summary CSVs.
# Challenge Results

This directory contains the completed 10-task challenge evaluation together with the Stage 4 targeted rerun, the Stage 5 JSON edit-mode follow-up, the Stage 6 schema-repair pass, the Stage 7 canonical combined view, the Stage 9 clean replication run, and the Stage 10 multi-replication stability study. The challenge set successfully broke the toy-task ceiling effect, but the original condition sweep was confounded by cloud-backed `ollama-cli` instability. Stage 4 showed that simply rerunning the same backend was not enough to recover usable diffs. Stage 5 then replaced raw diff generation with structured JSON edits and improved evaluator reachability, especially for Agent B and Agent C. Stage 6 then reprocessed the remaining Stage 5 invalid-schema cases to separate shallow interface failures from residual semantic failures. Stage 7 turned that repaired slice into the single paper-facing table, Stage 9 reran the benchmark directly with the repaired JSON interface, and Stage 10 showed that the interface finding is much more stable than the prompt ranking.

## Scope

| Item | Value |
| --- | --- |
| Task count | 10 challenge tasks |
| Original output root | `results/challenge` |
| Stage 4 rerun output root | `results/challenge_rerun` |
| Stage 5 JSON output root | `results/challenge_json` |
| Stage 6 repaired output root | `results/challenge_json_repaired` |
| Stage 7 combined output root | `results/challenge_combined` |
| Stage 9 replication output root | `results/challenge_json_replication` |
| Stage 10 stability output root | `results/stage10_replications` |
| Diff candidate root | `candidates/challenge` |
| JSON candidate root | `candidates/challenge_json` |
| Repaired JSON candidate root | `candidates/challenge_json_repaired` |
| Replication JSON candidate root | `candidates/challenge_json_replication` |
| Stage 10 stability candidate root | `candidates/stage10_replications` |
| Model | `gpt-oss:20b-cloud` |
| Transport | `ollama-cli` |
| Shell in original run | `powershell` |
| Original interactive driver | `harness/run_agent_loop.py` |
| Stage 4 rerun driver | `harness/run_patch_rerun.py` |
| Stage 5 JSON driver | `harness/run_json_rerun.py` |
| Stage 9 replication driver | `harness/run_challenge_json_replication.py` |
| Stage 10 orchestration driver | `harness/run_stage10_replications.py` |
| JSON converter | `harness/json_edits_to_patch.py` |
| Evaluator | `harness/evaluate_task.py` |
| Aggregator | `harness/aggregate_results.py` |
| Stage 10 summary scripts | `harness/summarize_stage10.py`, `harness/stage10_patch_metrics.py`, `harness/count_stage10_statuses.py` |

## Prompt Conditions

All challenge-stage agent conditions share the same system prompt, task set, evaluator, and repaired JSON output interface. The only experimental change is the conditioning signal provided in the prompt variant.

| Condition | Prompt file | Experimental role |
| --- | --- | --- |
| Agent A | [`../../prompts/agent_a_instruction_only_json.md`](../../prompts/agent_a_instruction_only_json.md) | Instruction-only repaired-JSON baseline with no examples and no prior patch history. |
| Agent B | [`../../prompts/agent_b_final_patch_json.md`](../../prompts/agent_b_final_patch_json.md) | Adds a final-success patch pattern, but no failed-attempt history or verifier trajectory. |
| Agent C | [`../../prompts/agent_c_vet_json.md`](../../prompts/agent_c_vet_json.md) | Adds distilled verified-trajectory lessons about using failures as evidence, preserving APIs, and validating locally before claiming success. |

Prompt read:

- Agent A is the baseline condition for interface reachability.
- Agent B tests whether final successful patch examples alone help.
- Agent C tests whether verified-trajectory lessons improve usable-edit generation beyond final-patch exemplars.

## Metric Definitions

| Metric | Meaning |
| --- | --- |
| `valid_patch_rate` | fraction of tasks where the candidate patch applied cleanly |
| `verified_solve_rate` | fraction of tasks that passed evaluation |
| `conditional_solve_rate` | solve rate conditioned on the patch applying |
| `false_completion_rate` | fraction of tasks where a patch applied but verification still failed |

## Headline Results

Original run summaries:

| Set | Tasks | Valid patch rate | Verified solve rate | Conditional solve rate | False completion rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gold control | 10 | 1.0 | 1.0 | 1.0 | 0.0 |
| Empty control | 10 | 0.0 | 0.0 | n/a | 0.0 |
| Agent A | 10 | 0.7 | 0.5 | 0.714 | 0.2 |
| Agent B | 10 | 0.0 | 0.0 | n/a | 0.0 |
| Agent C | 10 | 0.3 | 0.3 | 1.0 | 0.0 |

Stage 4 targeted rerun summaries:

| Rerun slice | Tasks | Valid patch rate | Verified solve rate | Conditional solve rate | False completion rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A rerun (`challenge_001`, `challenge_007`, `challenge_008`) | 3 | 0.0 | 0.0 | n/a | 0.0 |
| Agent B rerun (`challenge_001`-`challenge_010`) | 10 | 0.0 | 0.0 | n/a | 0.0 |
| Agent C rerun (`challenge_001`, `challenge_002`, `challenge_003`, `challenge_004`, `challenge_005`, `challenge_009`, `challenge_010`) | 7 | 0.0 | 0.0 | n/a | 0.0 |

Stage 5 JSON-mode summaries:

| Condition | Tasks | JSON ok rate | Patch applied rate | Verified solve rate | Solve if applied | False completion rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Agent A | 10 | 0.6 | 0.6 | 0.5 | 0.833 | 0.1 |
| Agent B | 10 | 0.7 | 0.2 | 0.1 | 0.5 | 0.1 |
| Agent C | 10 | 0.6 | 0.6 | 0.5 | 0.833 | 0.1 |

Stage 6 repaired-only summaries:

| Condition | Reprocessed invalid-schema cases | Repaired usable outputs | Patch applied rate | Verified solve rate | Solve if applied |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A | 4 | 3/4 | 0.0 | 0.0 | n/a |
| Agent B | 3 | 3/3 | 1.0 | 1.0 | 1.0 |
| Agent C | 4 | 3/4 | 0.25 | 0.25 | 1.0 |

Old diff mode vs Stage 5 JSON mode:

| Condition | Old valid patch rate | JSON-mode patch applied rate | Old verified solve rate | JSON-mode verified solve rate |
| --- | ---: | ---: | ---: | ---: |
| Agent A | 0.7 | 0.6 | 0.5 | 0.5 |
| Agent B | 0.0 | 0.2 | 0.0 | 0.1 |
| Agent C | 0.3 | 0.6 | 0.3 | 0.5 |

Merged Stage 5 JSON plus Stage 6 repaired view:

This is the canonical paper-facing table. Stage 5 and Stage 6 should not be counted separately once this merged view exists.

| Condition | JSON original solve | Repaired extra solves | Combined solve rate |
| --- | --- | ---: | --- |
| Agent A | 5/10 | 0 | 5/10 |
| Agent B | 1/10 | 3 | 4/10 |
| Agent C | 5/10 | 1 | 6/10 |

| Condition | Original JSON ok | Repaired schema outputs | Total usable outputs |
| --- | --- | --- | --- |
| Agent A | 6/10 | 3/4 | 9/10 |
| Agent B | 7/10 | 3/3 | 10/10 |
| Agent C | 6/10 | 3/4 | 9/10 |

Stage 8 interface-adjusted metrics:

| Condition | Raw tasks | Schema usable | Patch applied | Verified solve | Semantic failure after apply |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A | 10 | 9 | 6 | 5 | 1 |
| Agent B | 10 | 10 | 5 | 4 | 1 |
| Agent C | 10 | 9 | 7 | 6 | 1 |

Stage 9 clean replication summaries:

| Condition | Tasks | Patch applied rate | Verified solve rate | Conditional solve rate | False completion rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A | 10 | 0.3 | 0.3 | 1.0 | 0.0 |
| Agent B | 10 | 0.7 | 0.7 | 1.0 | 0.0 |
| Agent C | 10 | 0.3 | 0.3 | 1.0 | 0.0 |

Stage 10 stability summaries:

| Condition | Mean solve rate | Solve stdev | Mean patch applied | Patch stdev | Mean solve if applied |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A | 0.340 | 0.230 | 0.360 | 0.270 | 0.975 |
| Agent B | 0.360 | 0.230 | 0.400 | 0.255 | 0.933 |
| Agent C | 0.700 | 0.141 | 0.740 | 0.134 | 0.944 |

Stage 10 replication order:

| Replication | Condition order |
| --- | --- |
| `rep_01` | A -> B -> C |
| `rep_02` | B -> C -> A |
| `rep_03` | C -> A -> B |
| `rep_04` | A -> C -> B |
| `rep_05` | B -> A -> C |

Stage 10 per-replication solve rates:

| Replication | Agent A | Agent B | Agent C |
| --- | ---: | ---: | ---: |
| `rep_01` | 0.7 | 0.2 | 0.8 |
| `rep_02` | 0.1 | 0.1 | 0.8 |
| `rep_03` | 0.2 | 0.7 | 0.8 |
| `rep_04` | 0.3 | 0.4 | 0.6 |
| `rep_05` | 0.4 | 0.4 | 0.5 |

Stage 10 per-replication patch application and solve-if-applied:

| Replication | Agent A | Agent B | Agent C |
| --- | --- | --- | --- |
| `rep_01` | applied `0.8`, solve-if-applied `0.875` | applied `0.2`, solve-if-applied `1.0` | applied `0.8`, solve-if-applied `1.0` |
| `rep_02` | applied `0.1`, solve-if-applied `1.0` | applied `0.1`, solve-if-applied `1.0` | applied `0.9`, solve-if-applied `0.889` |
| `rep_03` | applied `0.2`, solve-if-applied `1.0` | applied `0.7`, solve-if-applied `1.0` | applied `0.8`, solve-if-applied `1.0` |
| `rep_04` | applied `0.3`, solve-if-applied `1.0` | applied `0.4`, solve-if-applied `1.0` | applied `0.6`, solve-if-applied `1.0` |
| `rep_05` | applied `0.4`, solve-if-applied `1.0` | applied `0.6`, solve-if-applied `0.667` | applied `0.6`, solve-if-applied `0.833` |

Non-zero false completion appears only in a few Stage 10 replications: Agent A in `rep_01` (`0.1`), Agent B in `rep_05` (`0.2`), and Agent C in `rep_02` and `rep_05` (`0.1` each).

Stage 10 does not overturn the main interface result. It shows that the repaired JSON interface remains usable across repeated runs, while the relative ordering of Agent A and Agent B is still too noisy to present as a stable ranking claim.

## Condition Summary

| Condition | Verified solves | Solved tasks | Applied patches | False completions | Notes |
| --- | ---: | --- | ---: | ---: | --- |
| Agent A | 5/10 | `003`, `004`, `005`, `006`, `009` | 7/10 | 2/10 | strongest original performer; two applied-but-bad patches on `002` and `010` |
| Agent B | 0/10 | none | 0/10 | 0/10 | no valid patches in the original run |
| Agent C | 3/10 | `006`, `007`, `008` | 3/10 | 0/10 | every applied patch solved, but only 3 patches applied |

Files modified on solved tasks:

| Condition | Files on solved tasks |
| --- | --- |
| Agent A | `src/preview.py`, `src/preferences.py`, `src/network.py`, `src/pricing.py`, `src/timeouts.py` |
| Agent B | none |
| Agent C | `src/pricing.py`, `src/http_headers.py`, `src/history.py` |

Stage 5 JSON-mode condition summary:

| Condition | Verified solves | Solved tasks | Applied patches | False completions | JSON non-ok statuses |
| --- | ---: | --- | ---: | ---: | --- |
| Agent A | 5/10 | `001`, `003`, `006`, `009`, `010` | 6/10 | 1/10 | `invalid_schema` x4 |
| Agent B | 1/10 | `002` | 2/10 | 1/10 | `invalid_schema` x3 |
| Agent C | 5/10 | `005`, `006`, `008`, `009`, `010` | 6/10 | 1/10 | `invalid_schema` x4 |

Stage 6 repaired condition summary:

| Condition | Repaired verified solves | Repaired solved tasks | Repaired usable outputs | Notes |
| --- | ---: | --- | ---: | --- |
| Agent A | 0/4 | none | 3/4 | `002`, `004`, and `008` converted but still did not apply; `007` collapsed to `rejected:missing_original_file:...` |
| Agent B | 3/3 | `004`, `007`, `008` | 3/3 | all previously invalid-schema cases became verified solves |
| Agent C | 1/4 | `002` | 3/4 | `001` remained `invalid_schema`; `004` and `007` converted but still did not apply |

Stage 7 canonical combined condition summary:

| Condition | Combined verified solves | Combined solved tasks | Combined patch applied | Semantic failures after apply |
| --- | ---: | --- | ---: | ---: |
| Agent A | 5/10 | `001`, `003`, `006`, `009`, `010` | 6/10 | 1/10 |
| Agent B | 4/10 | `002`, `004`, `007`, `008` | 5/10 | 1/10 |
| Agent C | 6/10 | `002`, `005`, `006`, `008`, `009`, `010` | 7/10 | 1/10 |

Stage 9 replication condition summary:

| Condition | Replication verified solves | Replication patch applied | False completions | Notes |
| --- | ---: | ---: | ---: | --- |
| Agent A | 3/10 | 3/10 | 0/10 | one `no_effective_changes` status; every applied patch solved |
| Agent B | 7/10 | 7/10 | 0/10 | strongest replication performer; no invalid-schema carryover observed |
| Agent C | 3/10 | 3/10 | 0/10 | one `no_edits` status; every applied patch solved |

Stage 10 stability condition summary:

| Condition | Mean solve | Mean patch applied | Stability read |
| --- | ---: | ---: | --- |
| Agent A | 0.34 | 0.36 | high variance; almost every applied patch solves, so the main issue is still usable patch generation |
| Agent B | 0.36 | 0.40 | similarly high variance; one strong replication lifts the mean, but the condition is not stably better than Agent A |
| Agent C | 0.70 | 0.74 | strongest and most stable overall; still not perfect, but clearly cleaner on interface reachability |

## Task-Level Outcomes

Original diff-mode task outcomes:

| Task | Bug type | Original outcome |
| --- | --- | --- |
| `challenge_001` | `edge_case` | no condition solved it |
| `challenge_002` | `multi_file` | no condition solved it; Agent A applied a patch but still failed tests |
| `challenge_003` | `misleading_obvious_fix` | solved by Agent A only |
| `challenge_004` | `state_mutation` | solved by Agent A only |
| `challenge_005` | `hidden_edge_case` | solved by Agent A only |
| `challenge_006` | `type_or_format` | solved by Agent A and Agent C |
| `challenge_007` | `public_api_preservation` | solved by Agent C only |
| `challenge_008` | `regression_trap` | solved by Agent C only |
| `challenge_009` | `minimal_patch` | solved by Agent A only |
| `challenge_010` | `dependency_or_config_behavior` | no condition solved it; Agent A applied a patch but produced a syntax failure |

Stage 5 JSON-mode task outcomes:

| Task | Agent A | Agent B | Agent C |
| --- | --- | --- | --- |
| `challenge_001` | `solve` | `patch_did_not_apply` | `patch_did_not_apply` |
| `challenge_002` | `patch_did_not_apply` | `solve` | `patch_did_not_apply` |
| `challenge_003` | `solve` | `tests_failed` | `tests_failed` |
| `challenge_004` | `patch_did_not_apply` | `patch_did_not_apply` | `patch_did_not_apply` |
| `challenge_005` | `syntax_error` | `patch_did_not_apply` | `solve` |
| `challenge_006` | `solve` | `patch_did_not_apply` | `solve` |
| `challenge_007` | `patch_did_not_apply` | `patch_did_not_apply` | `patch_did_not_apply` |
| `challenge_008` | `patch_did_not_apply` | `patch_did_not_apply` | `solve` |
| `challenge_009` | `solve` | `patch_did_not_apply` | `solve` |
| `challenge_010` | `solve` | `patch_did_not_apply` | `solve` |

Stage 10 task-level stability readouts:

| Task | Bug type | Stage 10 read |
| --- | --- | --- |
| `challenge_001` | `edge_case` | Agent C is strongest at `4/5` solves; Agent A and Agent B usually fail before producing an applicable patch. |
| `challenge_002` | `multi_file` | Agent A is strongest at `4/5` solves; Agent B and Agent C often fail to reach an applicable patch. |
| `challenge_003` | `misleading_obvious_fix` | Agent C is strongest at `4/5` solves; Agent B improves over baseline but remains well behind. |
| `challenge_004` | `state_mutation` | Agent C is strongest at `4/5` solves; Agent A never reaches an applicable patch. |
| `challenge_005` | `hidden_edge_case` | Agent C solves all `5/5` replications. |
| `challenge_006` | `type_or_format` | Agent C solves all `5/5` replications; Agent A and Agent B rarely produce a correct patch. |
| `challenge_007` | `public_api_preservation` | Main counterexample to Agent C dominance: Agent A solves `4/5` and Agent B solves `3/5`, while Agent C solves `0/5`. |
| `challenge_008` | `regression_trap` | Mixed task with only a small Agent C edge (`3/5` vs `2/5` and `2/5`). |
| `challenge_009` | `minimal_patch` | Agent C solves all `5/5` replications. |
| `challenge_010` | `dependency_or_config_behavior` | Agent A and Agent C tie at `3/5`; Agent B remains weak at `1/5`. |

The Stage 10 task slice reinforces the main story: Agent C dominates most tasks, but `challenge_002` and especially `challenge_007` show that prompt-condition superiority is not uniform enough to simplify into a single global ranking claim.

## Failure Decomposition

Original run failure subtypes from `results/challenge/failure_subtypes.csv`:

| Failure subtype | Count | Interpretation |
| --- | ---: | --- |
| `backend_timeout_or_wrapper_kill` | 12 | wrapper timed out or was terminated before a patch artifact was written |
| `backend_or_transport_error` | 4 | backend or transport failed before a patch artifact was written |
| `interactive_loop_no_final_patch` | 4 | the agent executed local shell steps but never emitted a final patch |
| `semantic_fix_incomplete` | 1 | patch applied but behavior was still wrong |
| `invalid_python_after_patch` | 1 | patch applied but introduced syntax or import failure |

Rerun failure subtypes from `results/challenge_rerun/failure_subtypes.csv`:

| Failure subtype | Count | Interpretation |
| --- | ---: | --- |
| `nonempty_patch_rejected_by_git_apply` | 17 | the rerun produced a non-empty patch artifact, but the extracted diff was malformed |
| `no_extractable_diff` | 3 | raw output existed, but no unified diff could be extracted |

Shift from original run to rerun:

- In the original run, `16/22` non-solves were wrapper or backend failures before any patch artifact existed.
- In the rerun, wrapper failures disappeared from the targeted subset, but `17/20` rerun non-solves were still malformed non-empty diffs.
- The rerun therefore isolates the remaining bottleneck to patch emission and formatting, not just backend stability.

Stage 5 JSON conversion status counts:

| Condition | ok | invalid_schema | invalid_json | no_edits | rejected | no_effective_changes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Agent A | 6 | 4 | 0 | 0 | 0 | 0 |
| Agent B | 7 | 3 | 0 | 0 | 0 | 0 |
| Agent C | 6 | 4 | 0 | 0 | 0 | 0 |

Stage 6 repaired status counts:

| Condition | ok | ok_repaired_edits_dict_to_list | invalid_schema | rejected | no_effective_changes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A | 3 | 0 | 0 | 1 | 0 |
| Agent B | 3 | 0 | 0 | 0 | 0 |
| Agent C | 3 | 0 | 1 | 0 | 0 |

Stage 10 aggregated status counts across five replications:

| Condition | ok | invalid_json | invalid_schema | no_edits | rejected | no_effective_changes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Agent A | 41 | 1 | 1 | 6 | 0 | 1 |
| Agent B | 41 | 1 | 3 | 3 | 0 | 2 |
| Agent C | 48 | 0 | 2 | 0 | 0 | 0 |

Stage 5 structured-output shift:

- All non-`ok` JSON conversion statuses were `invalid_schema: edits is not a list`.
- No `invalid_json`, `rejected`, or `no_effective_changes` statuses were observed in the full 30-task JSON-mode run.
- Compared with old diff mode, Stage 5 improved patch application from `0.0` to `0.2` for Agent B and from `0.3` to `0.6` for Agent C.
- Agent A kept the same verified solve rate (`0.5`) in JSON mode, but patch application fell slightly from `0.7` to `0.6`.

Stage 6 schema-repair shift:

- Stage 6 recovered four additional verified solves from the Stage 5 invalid-schema slice: three for Agent B and one for Agent C.
- No repaired success in this slice actually required `ok_repaired_edits_dict_to_list`; the larger gain came from selecting the correct JSON object from mixed reasoning plus JSON raw output.
- Agent B's combined solve rate rose from `1/10` to `4/10`, and its usable-output coverage rose from `7/10` to `10/10`.
- Agent C's combined solve rate rose from `5/10` to `6/10`, and its usable-output coverage rose from `6/10` to `9/10`.
- Agent A's usable-output coverage rose from `6/10` to `9/10`, but its repaired-slice failures remained unsolved.

Stage 7 and Stage 8 canonical-view shift:

- The final paper-facing comparison should now use `results/challenge_combined`, not separate Stage 5 and Stage 6 tables.
- Interface-adjusted metrics show that the benchmark should distinguish schema usability, patch application, and semantic failure after apply rather than collapsing everything into a single failure bucket.
- In the canonical view, Agent C is highest at `6/10`, Agent A is `5/10`, and Agent B is `4/10`.

Stage 9 replication shift:

- The repaired JSON interface can sustain a clean rerun without resurfacing the Stage 3 or Stage 4 diff bottlenecks.
- No applied patch failed verification in the replication run; conditional solve rate is `1.0` for all three conditions.
- The ranking did shift sharply in replication, with Agent B rising to `7/10` while Agent A and Agent C each landed at `3/10`, so the interface result is more stable than the prompt ranking.

Stage 10 stability shift:

- Across five replications, solve-if-applied stays above `0.93` for every condition, which confirms that the repaired interface preserves high semantic correctness once a patch applies.
- Agent C is strongest on average and also has the lowest variance, but Agent A and Agent B remain too close and too order-sensitive to claim a robust separation.
- The strongest paper claim is now methodological: the interface story is stable; the prompt ranking is only partially stable.

## Interpretation

- The controls behaved exactly as expected: gold solved everything and empty solved nothing.
- The original diff-mode challenge run produced real condition separation, but it was not a clean prompt-condition comparison because Agent B and much of Agent C were heavily dominated by wrapper/backend failures.
- Stage 4 clarified that the backend confound was real, but still left the system blocked on malformed diffs.
- Stage 5 shows that structured edit mode improves evaluator reachability, especially for Agent B and Agent C.
- Stage 6 shows that a substantial share of the remaining Stage 5 failures were still interface failures rather than semantic failures.
- Stage 7 turns that repaired slice into the canonical paper-facing result table and removes the temptation to double count Stage 5 plus Stage 6.
- Stage 8 makes the main methodological contribution explicit: failure mass has to be decomposed into schema usability, patch application, and semantic failure after apply.
- Stage 9 shows that the repaired JSON interface can support a clean rerun, but the relative ranking of prompt conditions is still not stable enough to over-claim.
- Stage 10 strengthens that conclusion by showing that interface reachability remains stable across repeated runs even when prompt ordering is rotated, while Agent A versus Agent B remains noisy.
- The remaining bottlenecks are now clearer: Agent A's repaired-slice misses are mostly not shallow schema-wrapper issues, while Agent C still shows a mix of lingering malformed output and semantic or patch-application failure.
- The current best claim is stronger than Stage 5 alone: structured edit interfaces improve evaluator reachability on this benchmark, shallow schema repair materially changes combined solve rates for Agent B and Agent C, and the cleaned-up interface is more robust than the observed condition ranking.
- The later Paper 2 Stage 2 expansion preserved that discipline: after fixing an evaluation-state contamination bug and rerunning the full 240-run expansion cleanly, Agent D still beat Agent B modestly on reliability, but the retained artifacts mostly support direct patch generation or generation robustness rather than a proven recovery mechanism.

## Paper 2 Corrected Follow-up

This challenge report now sits alongside the corrected Paper 2 Stage 2 freeze under `results/vet_scaling_stage2`. The first 240-run Stage 2 expansion was discarded after we found evaluator contamination from dirty task repos; `harness/evaluate_task.py` now resets and cleans each task repo around evaluation, and the corrected rerun is the only Stage 2 result that should be cited.

Corrected Stage 2 headline:

- Agent D verified solve rate: `0.92` versus `0.85` for Agent B
- Agent D patch applied rate: `1.00` versus `0.95` for Agent B
- Agent D false completion rate: `0.08` versus `0.10` for Agent B
- Task-level outcome totals: D wins `4`, B wins `1`, tie `24`, neither `1`

Paper-facing framing:

- Main result: Agent D is modestly more reliable than Agent B on the corrected 30-task expansion.
- Mechanism: the retained artifacts mostly support better direct patch generation or generation reliability, not proven recovery.
- Limitation: recovery coding is partial at `22/240` rows, so recovery rates are lower bounds, and there is no training-time scaling result yet.
- Trustworthiness: the project is stronger because the D-over-B signal survived a real evaluator bug fix instead of depending on the contaminated run.

Canonical Stage 2 freeze artifacts:

- `../vet_scaling_stage2/stage2_freeze.md`
- `../vet_scaling_stage2/stage2_summary.md`
- `../vet_scaling_stage2/summary_by_condition.csv`
- `../vet_scaling_stage2/headline_b_vs_d.csv`
- `../vet_scaling_stage2/task_level_b_vs_d.csv`
- `../vet_scaling_stage2/recovery_annotations.csv`
- `../vet_scaling_stage2/recovery_summary.md`

## Interface Reliability as a Prerequisite for Agent Evaluation

In our pilot, a substantial share of apparent task failures were not semantic failures, but interface failures: backend timeouts, malformed diffs, and shallow schema deviations. Structured edit mode improved evaluator reachability, demonstrating that agent benchmarks should separately report output-validity, patch-application, and semantic-solve rates.

Current experiment status:

- Stage 0: Harness smoke test - PASSED
- Stage 1: Toy A/B/C validation - PASSED
- Stage 2: Challenge task construction - PASSED
- Stage 3: Diff-mode challenge run - PASSED WITH CONFOUNDS
- Stage 4: Targeted diff rerun - DIAGNOSTIC, PATCH FORMAT BOTTLENECK
- Stage 5: JSON edit mode - PASSED, EVALUATOR REACHABILITY IMPROVED
- Stage 6: Schema repair - PASSED, INTERFACE FAILURES FURTHER REDUCED
- Stage 7: Canonical combined table - PASSED, PAPER-FACING VIEW FROZEN
- Stage 8: Interface-adjusted metrics - PASSED, FAILURE TAXONOMY EXPLICIT
- Stage 9: Clean repaired-JSON replication - PASSED, INTERFACE HOLDS IN CLEAN RERUN
- Stage 10: Multi-replication stability study - PASSED, INTERFACE STABLE / RANKING PARTIALLY STABLE

## Representative Artifacts

| Case | Artifact |
| --- | --- |
| Original interactive loop never emitted a patch | `agent_a/runs/challenge_001_run.json` |
| Original backend or transport failure | `agent_b/runs/challenge_002_run.json` |
| Original wrapper timeout or forced kill | `agent_c/runs/challenge_002_run.json` |
| Original applied patch that still failed tests | `agent_a/challenge_002.json` |
| Original applied patch with syntax failure | `agent_a/challenge_010.json` |
| Rerun malformed non-empty patch | `../challenge_rerun/agent_b/challenge_001.json` |
| Rerun raw output for malformed patch | `../candidates/challenge/agent_b/raw/challenge_001.txt` |
| Rerun extracted patch rejected by `git apply` | `../candidates/challenge/agent_b/patches/challenge_001.patch` |
| Rerun no-extractable-diff case | `../challenge_rerun/agent_b/runs/challenge_006_run.json` |
| Rerun extraction status for no-diff case | `../candidates/challenge/agent_b/status/challenge_006.txt` |
| JSON-mode invalid schema | `../candidates/challenge_json/agent_a/raw/challenge_002.json` |
| JSON-mode invalid schema status | `../candidates/challenge_json/agent_a/status/challenge_002.txt` |
| JSON-mode schema-valid but wrong patch | `../challenge_json/agent_b/challenge_003.json` |
| JSON-mode raw JSON for that failure | `../candidates/challenge_json/agent_b/raw/challenge_003.json` |
| JSON-mode schema-valid syntax failure | `../challenge_json/agent_a/challenge_005.json` |
| Stage 6 repaired solve from invalid schema | `../challenge_json_repaired/agent_b/challenge_004.json` |
| Stage 6 repaired solve for Agent C | `../challenge_json_repaired/agent_c/challenge_002.json` |
| Stage 6 placeholder-path rejection | `../candidates/challenge_json_repaired/agent_a/status/challenge_007.txt` |
| Stage 6 remaining invalid schema after repair | `../candidates/challenge_json_repaired/agent_c/status/challenge_001.txt` |
| Stage 7 combined matrix | `../challenge_combined/combined_matrix.csv` |
| Stage 8 interface-adjusted metrics | `../challenge_combined/interface_adjusted_metrics.csv` |
| Stage 9 replication manifest | `../challenge_json_replication/replication_manifest.json` |
| Stage 9 replication summary for strongest condition | `../challenge_json_replication/agent_b_summary.summary.json` |
| Stage 10 prompt baseline | `../../prompts/agent_a_instruction_only_json.md` |
| Stage 10 prompt with final-patch examples | `../../prompts/agent_b_final_patch_json.md` |
| Stage 10 prompt with verified-trajectory lessons | `../../prompts/agent_c_vet_json.md` |
| Stage 10 solve stability summary | `../stage10_replications/stage10_summary.csv` |
| Stage 10 interface reachability summary | `../stage10_replications/stage10_patch_metrics.csv` |
| Stage 10 aggregated status counts | `../stage10_replications/status_counts.csv` |
| Stage 10 standalone report | `../stage10_replications/README.md` |

## Artifact Map

Primary summaries:

- `gold_summary.csv`
- `gold_summary.summary.json`
- `empty_summary.csv`
- `empty_summary.summary.json`
- `agent_a_summary.csv`
- `agent_a_summary.summary.json`
- `agent_b_summary.csv`
- `agent_b_summary.summary.json`
- `agent_c_summary.csv`
- `agent_c_summary.summary.json`
- `failure_subtypes.csv`

Original run artifacts:

- `agent_a/`, `agent_b/`, `agent_c/`
- `agent_a/runs/`, `agent_b/runs/`, `agent_c/runs/`
- `../candidates/challenge/agent_a/`, `../candidates/challenge/agent_b/`, `../candidates/challenge/agent_c/`

Stage 4 rerun artifacts:

- `../challenge_rerun/agent_a_summary.csv`
- `../challenge_rerun/agent_a_summary.summary.json`
- `../challenge_rerun/agent_b_summary.csv`
- `../challenge_rerun/agent_b_summary.summary.json`
- `../challenge_rerun/agent_c_summary.csv`
- `../challenge_rerun/agent_c_summary.summary.json`
- `../challenge_rerun/failure_subtypes.csv`
- `../challenge_rerun/agent_a/`, `../challenge_rerun/agent_b/`, `../challenge_rerun/agent_c/`
- `../challenge_rerun/agent_a/runs/`, `../challenge_rerun/agent_b/runs/`, `../challenge_rerun/agent_c/runs/`
- `../candidates/challenge/agent_a/raw/`, `../candidates/challenge/agent_b/raw/`, `../candidates/challenge/agent_c/raw/`
- `../candidates/challenge/agent_a/patches/`, `../candidates/challenge/agent_b/patches/`, `../candidates/challenge/agent_c/patches/`
- `../candidates/challenge/agent_a/status/`, `../candidates/challenge/agent_b/status/`, `../candidates/challenge/agent_c/status/`
- `../candidates/challenge/agent_a/meta/`, `../candidates/challenge/agent_b/meta/`, `../candidates/challenge/agent_c/meta/`

Stage 5 JSON-mode artifacts:

- `../challenge_json/README.md`
- `../challenge_json/agent_a_summary.csv`
- `../challenge_json/agent_a_summary.summary.json`
- `../challenge_json/agent_b_summary.csv`
- `../challenge_json/agent_b_summary.summary.json`
- `../challenge_json/agent_c_summary.csv`
- `../challenge_json/agent_c_summary.summary.json`
- `../challenge_json/agent_a/`, `../challenge_json/agent_b/`, `../challenge_json/agent_c/`
- `../challenge_json/agent_a/runs/`, `../challenge_json/agent_b/runs/`, `../challenge_json/agent_c/runs/`
- `../candidates/challenge_json/agent_a/raw/`, `../candidates/challenge_json/agent_b/raw/`, `../candidates/challenge_json/agent_c/raw/`
- `../candidates/challenge_json/agent_a/patches/`, `../candidates/challenge_json/agent_b/patches/`, `../candidates/challenge_json/agent_c/patches/`
- `../candidates/challenge_json/agent_a/status/`, `../candidates/challenge_json/agent_b/status/`, `../candidates/challenge_json/agent_c/status/`
- `../candidates/challenge_json/agent_a/meta/`, `../candidates/challenge_json/agent_b/meta/`, `../candidates/challenge_json/agent_c/meta/`

Stage 6 repaired artifacts:

- `../challenge_json_repaired/README.md`
- `../challenge_json_repaired/agent_a_summary.csv`
- `../challenge_json_repaired/agent_a_summary.summary.json`
- `../challenge_json_repaired/agent_b_summary.csv`
- `../challenge_json_repaired/agent_b_summary.summary.json`
- `../challenge_json_repaired/agent_c_summary.csv`
- `../challenge_json_repaired/agent_c_summary.summary.json`
- `../challenge_json_repaired/agent_a/`, `../challenge_json_repaired/agent_b/`, `../challenge_json_repaired/agent_c/`
- `../candidates/challenge_json_repaired/agent_a/patches/`, `../candidates/challenge_json_repaired/agent_b/patches/`, `../candidates/challenge_json_repaired/agent_c/patches/`
- `../candidates/challenge_json_repaired/agent_a/status/`, `../candidates/challenge_json_repaired/agent_b/status/`, `../candidates/challenge_json_repaired/agent_c/status/`

Stage 7 combined artifacts:

- `../challenge_combined/README.md`
- `../challenge_combined/agent_a_summary.csv`
- `../challenge_combined/agent_a_summary.summary.json`
- `../challenge_combined/agent_b_summary.csv`
- `../challenge_combined/agent_b_summary.summary.json`
- `../challenge_combined/agent_c_summary.csv`
- `../challenge_combined/agent_c_summary.summary.json`
- `../challenge_combined/combined_matrix.csv`
- `../challenge_combined/interface_adjusted_metrics.csv`
- `../challenge_combined/agent_a/`, `../challenge_combined/agent_b/`, `../challenge_combined/agent_c/`

Stage 9 replication artifacts:

- `../challenge_json_replication/README.md`
- `../challenge_json_replication/agent_a_summary.csv`
- `../challenge_json_replication/agent_a_summary.summary.json`
- `../challenge_json_replication/agent_b_summary.csv`
- `../challenge_json_replication/agent_b_summary.summary.json`
- `../challenge_json_replication/agent_c_summary.csv`
- `../challenge_json_replication/agent_c_summary.summary.json`
- `../challenge_json_replication/replication_manifest.json`
- `../challenge_json_replication/agent_a/`, `../challenge_json_replication/agent_b/`, `../challenge_json_replication/agent_c/`
- `../candidates/challenge_json_replication/agent_a/raw/`, `../candidates/challenge_json_replication/agent_b/raw/`, `../candidates/challenge_json_replication/agent_c/raw/`
- `../candidates/challenge_json_replication/agent_a/status/`, `../candidates/challenge_json_replication/agent_b/status/`, `../candidates/challenge_json_replication/agent_c/status/`

Stage 10 stability artifacts:

- `../stage10_replications/README.md`
- `../stage10_replications/stage10_summary.csv`
- `../stage10_replications/stage10_patch_metrics.csv`
- `../stage10_replications/status_counts.csv`
- `../stage10_replications/replication_plan.md`
- `../stage10_replications/stage10_manifest.json`
- `../stage10_replications/rep_01/`, `../stage10_replications/rep_02/`, `../stage10_replications/rep_03/`, `../stage10_replications/rep_04/`, `../stage10_replications/rep_05/`
- `../candidates/stage10_replications/rep_01/`, `../candidates/stage10_replications/rep_02/`, `../candidates/stage10_replications/rep_03/`, `../candidates/stage10_replications/rep_04/`, `../candidates/stage10_replications/rep_05/`

Prompt definitions:

- `../../prompts/agent_a_instruction_only_json.md`
- `../../prompts/agent_b_final_patch_json.md`
- `../../prompts/agent_c_vet_json.md`

Task definitions:

- `../../tasks/challenge/challenge_001/` through `../../tasks/challenge/challenge_010/`

## Source Files Used For This README

This README is grounded in the generated artifacts rather than hand-entered numbers. The main source files were:

- `gold_summary.summary.json`
- `empty_summary.summary.json`
- `agent_a_summary.summary.json`
- `agent_b_summary.summary.json`
- `agent_c_summary.summary.json`
- `agent_a_summary.csv`
- `agent_b_summary.csv`
- `agent_c_summary.csv`
- `failure_subtypes.csv`
- `../challenge_rerun/agent_a_summary.summary.json`
- `../challenge_rerun/agent_b_summary.summary.json`
- `../challenge_rerun/agent_c_summary.summary.json`
- `../challenge_rerun/failure_subtypes.csv`
- `../challenge_json/agent_a_summary.summary.json`
- `../challenge_json/agent_b_summary.summary.json`
- `../challenge_json/agent_c_summary.summary.json`
- `../challenge_json/agent_a_summary.csv`
- `../challenge_json/agent_b_summary.csv`
- `../challenge_json/agent_c_summary.csv`
- `../candidates/challenge_json/agent_a/status/`
- `../candidates/challenge_json/agent_b/status/`
- `../candidates/challenge_json/agent_c/status/`
- `../challenge_json_repaired/agent_a_summary.summary.json`
- `../challenge_json_repaired/agent_b_summary.summary.json`
- `../challenge_json_repaired/agent_c_summary.summary.json`
- `../challenge_json_repaired/agent_a_summary.csv`
- `../challenge_json_repaired/agent_b_summary.csv`
- `../challenge_json_repaired/agent_c_summary.csv`
- `../candidates/challenge_json_repaired/agent_a/status/`
- `../candidates/challenge_json_repaired/agent_b/status/`
- `../candidates/challenge_json_repaired/agent_c/status/`
- `../challenge_combined/agent_a_summary.summary.json`
- `../challenge_combined/agent_b_summary.summary.json`
- `../challenge_combined/agent_c_summary.summary.json`
- `../challenge_combined/interface_adjusted_metrics.csv`
- `../challenge_combined/combined_matrix.csv`
- `../challenge_json_replication/agent_a_summary.summary.json`
- `../challenge_json_replication/agent_b_summary.summary.json`
- `../challenge_json_replication/agent_c_summary.summary.json`
- `../challenge_json_replication/replication_manifest.json`
- `../../prompts/agent_a_instruction_only_json.md`
- `../../prompts/agent_b_final_patch_json.md`
- `../../prompts/agent_c_vet_json.md`
- `../stage10_replications/stage10_summary.csv`
- `../stage10_replications/stage10_patch_metrics.csv`
- `../stage10_replications/status_counts.csv`
- `../stage10_replications/replication_plan.md`
- `../stage10_replications/stage10_manifest.json`
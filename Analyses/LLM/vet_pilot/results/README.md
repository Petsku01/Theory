# Results

This directory is the canonical summary of the pilot artifacts. The experiment moved through ten stages: harness validation, toy-task validation, challenge benchmarking, a diff-mode rerun, JSON edit mode, schema repair, a canonical combined view, interface-adjusted analysis, a clean replication run, and a five-replication stability study. The main conclusion is that interface reliability changed the measured outcomes enough that output validity, patch application, and semantic solves have to be reported separately.

## Executive Summary

- The harness works: smoke, gold, and empty controls behaved as expected.
- The toy tasks are solved by every prompt condition and are therefore useful for validation, not comparison.
- The 10-task challenge benchmark produced real separation, but the original diff-mode run was confounded by backend and wrapper failures.
- Stage 4 removed the runtime confound on a targeted slice and showed that malformed diff emission was still the dominant bottleneck.
- Stage 5 replaced raw diff output with structured JSON edits and materially improved evaluator reachability.
- Stage 6 repaired shallow schema failures and changed the combined solve picture for Agent B and Agent C.
- Stage 7 created the single canonical combined result set for paper-facing reporting.
- Stage 8 exported interface-adjusted metrics that separate schema usability, patch application, and semantic solve.
- Stage 9 reran the benchmark with the repaired JSON interface and showed that interface stability improved more than rank stability.
- Stage 10 tested that finding across five replications and showed that interface stability is robust while lower-rank condition ordering remains noisy.

## Result Groups

| Path | Role | Status |
| --- | --- | --- |
| `smoke/` | minimal harness smoke validation | trusted |
| `controls/` | toy gold and empty controls | trusted |
| `agents/` | toy Agent A/B/C evaluation | trusted |
| `challenge/` | original 10-task challenge run | complete, partially confounded |
| `challenge_rerun/` | Stage 4 targeted diff rerun | complete, diagnostic |
| `challenge_json/` | Stage 5 JSON edit-mode run | complete, improves evaluator reachability |
| `challenge_json_repaired/` | Stage 6 schema-repair follow-up | complete, isolates shallow interface failures |
| `challenge_combined/` | Stage 7 and Stage 8 canonical combined view | complete, paper-facing |
| `challenge_json_replication/` | Stage 9 clean repaired-JSON replication | complete, stability check |
| `stage10_replications/` | Stage 10 multi-replication stability study | complete, robustness study |
| `agents_cloud/` | non-canonical cloud toy outputs | auxiliary |
| `challenge_smoke/` | scratch challenge smoke outputs | auxiliary |
| `challenge_validation/` | validation scratch area | auxiliary |

## Stage-by-Stage Summary

| Stage | Goal | Main Result | Interpretation |
| --- | --- | --- | --- |
| Stage 0 | harness smoke test | pass/fail plumbing check succeeded | baseline evaluator path is usable |
| Stage 1 | toy A/B/C validation | all toy conditions solved all toy tasks | toy tasks are too easy for comparison |
| Stage 2 | challenge task construction | 10-task benchmark created | benchmark can separate conditions |
| Stage 3 | diff-mode challenge run | Agent A 5/10, Agent B 0/10, Agent C 3/10 | informative, but confounded by runtime/interface failure |
| Stage 4 | targeted diff rerun | 0 recovered solves on rerun slice | malformed diff emission remained the bottleneck |
| Stage 5 | JSON edit mode | Agent A 5/10, Agent B 1/10, Agent C 5/10 | structured output improved evaluator reachability |
| Stage 6 | schema repair | combined: Agent A 5/10, Agent B 4/10, Agent C 6/10 | a meaningful share of remaining failures were still interface failures |
| Stage 7 | canonical combined result set | final combined view: Agent A 5/10, Agent B 4/10, Agent C 6/10 | use this view for paper-facing comparison |
| Stage 8 | interface-adjusted metrics | Agent A 9 schema-usable, Agent B 10, Agent C 9 | benchmark reporting should preserve failure layers |
| Stage 9 | clean repaired-JSON replication | Agent A 3/10, Agent B 7/10, Agent C 3/10 | interface finding is robust, ranking is not yet stable |
| Stage 10 | five-replication stability study | mean solve: A 0.34, B 0.36, C 0.70 | interface result is stable; A vs B remains noisy |

## Trusted Baseline

The toy and control results establish that the evaluator is behaving correctly.

| Result set | Tasks | Verified solve rate | False completion rate |
| --- | ---: | ---: | ---: |
| Smoke validation | 2 | 0.5 | 0.0 |
| Gold control | 3 | 1.0 | 0.0 |
| Empty control | 3 | 0.0 | 0.0 |
| Agent A toy | 3 | 1.0 | 0.0 |
| Agent B toy | 3 | 1.0 | 0.0 |
| Agent C toy | 3 | 1.0 | 0.0 |

What this means:

- The patch application and evaluation loop works.
- The controls behave correctly.
- The toy benchmark is a validation fixture, not a discriminating benchmark.

## Challenge Progression

### Stage 3: Original Challenge Run

The original challenge run produced real condition separation, but much of the failure mass for Agent B and part of Agent C came from backend or wrapper failures before any usable patch existed.

| Set | Tasks | Valid patch rate | Verified solve rate | Conditional solve rate | False completion rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gold control | 10 | 1.0 | 1.0 | 1.0 | 0.0 |
| Empty control | 10 | 0.0 | 0.0 | n/a | 0.0 |
| Agent A | 10 | 0.7 | 0.5 | 0.714 | 0.2 |
| Agent B | 10 | 0.0 | 0.0 | n/a | 0.0 |
| Agent C | 10 | 0.3 | 0.3 | 1.0 | 0.0 |

Original failure decomposition:

| Failure subtype | Count |
| --- | ---: |
| `backend_timeout_or_wrapper_kill` | 12 |
| `backend_or_transport_error` | 4 |
| `interactive_loop_no_final_patch` | 4 |
| `semantic_fix_incomplete` | 1 |
| `invalid_python_after_patch` | 1 |

### Stage 4: Targeted Diff Rerun

Stage 4 removed the interactive shell loop and reran targeted failures through direct patch generation and extraction. This removed the runtime confound on the rerun slice but still produced no verified solves.

| Rerun slice | Tasks | Valid patch rate | Verified solve rate |
| --- | ---: | ---: | ---: |
| Agent A rerun | 3 | 0.0 | 0.0 |
| Agent B rerun | 10 | 0.0 | 0.0 |
| Agent C rerun | 7 | 0.0 | 0.0 |

Rerun failure decomposition:

| Failure subtype | Count |
| --- | ---: |
| `nonempty_patch_rejected_by_git_apply` | 17 |
| `no_extractable_diff` | 3 |

Interpretation:

- The Stage 3 confound was real.
- Removing it was not sufficient to recover usable patches.
- Patch formatting and extraction were still the controlling bottleneck.

### Stage 5: JSON Edit Mode

Stage 5 replaced raw diff emission with structured JSON full-file edits converted locally into diffs.

| Condition | JSON ok rate | Patch applied rate | Verified solve rate | Solve if applied | False completion |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A | 0.6 | 0.6 | 0.5 | 0.833 | 0.1 |
| Agent B | 0.7 | 0.2 | 0.1 | 0.5 | 0.1 |
| Agent C | 0.6 | 0.6 | 0.5 | 0.833 | 0.1 |

Interpretation:

- Agent B improved from `0.0` to `0.1` verified solve rate.
- Agent C improved from `0.3` to `0.5` verified solve rate.
- Agent A held solve rate steady at `0.5`.
- The main remaining interface problem shifted from malformed diffs to schema mismatch.

### Stage 6: Schema Repair

Stage 6 reprocessed only the Stage 5 `invalid_schema` cases with a hardened converter. It preferred the final valid JSON object with `edits`, tolerated singleton-dict `edits`, and rejected placeholder paths cleanly.

Combined Stage 5 plus Stage 6 solve table:

| Condition | JSON original solve | Repaired extra solves | Combined solve rate |
| --- | --- | ---: | --- |
| Agent A | 5/10 | 0 | 5/10 |
| Agent B | 1/10 | 3 | 4/10 |
| Agent C | 5/10 | 1 | 6/10 |

Combined usability table:

| Condition | Original JSON ok | Repaired schema outputs | Total usable outputs |
| --- | --- | --- | --- |
| Agent A | 6/10 | 3/4 | 9/10 |
| Agent B | 7/10 | 3/3 | 10/10 |
| Agent C | 6/10 | 3/4 | 9/10 |

Interpretation:

- Agent B's remaining Stage 5 schema failures were mostly interface failures, not semantic misses.
- Agent C recovered one additional solve and three additional usable outputs.
- Agent A recovered usability but no additional solves, so its remaining misses are less likely to be shallow wrapper errors.

### Stage 7 and Stage 8: Canonical Combined View

The combined view is now the canonical paper-facing table. It merges Stage 5 and Stage 6 per task without double counting.

| Condition | Raw tasks | Schema usable | Patch applied | Verified solve | Semantic failure after apply |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A | 10 | 9 | 6 | 5 | 1 |
| Agent B | 10 | 10 | 5 | 4 | 1 |
| Agent C | 10 | 9 | 7 | 6 | 1 |

What this means:

- The combined view should replace separate Stage 5 and Stage 6 solve tables in the paper.
- Agent B and Agent C improve materially once shallow schema failures are folded into the canonical result set.
- The interface-adjusted table makes it clear that not every non-solve is a semantic miss.

### Stage 9: Clean Replication

The clean replication reran all 10 challenge tasks for all three prompt conditions using the repaired JSON interface directly.

| Condition | Tasks | Patch applied rate | Verified solve rate | False completion rate |
| --- | ---: | ---: | ---: | ---: |
| Agent A | 10 | 0.3 | 0.3 | 0.0 |
| Agent B | 10 | 0.7 | 0.7 | 0.0 |
| Agent C | 10 | 0.3 | 0.3 | 0.0 |

What the replication shows:

- The repaired JSON interface can support a clean rerun without the Stage 3 or Stage 4 diff bottlenecks.
- The condition ranking is still variable across runs.
- The interface claim is stronger than the rank claim: once a patch applied in this replication, it solved the task in every case.

### Stage 10: Multi-Replication Stability Study

Stage 10 repeated the repaired JSON benchmark five times with rotated condition order to measure variance directly.

| Condition | Mean solve rate | Std dev | Mean patch applied | Mean solve if applied |
| --- | ---: | ---: | ---: | ---: |
| Agent A | 0.340 | 0.230 | 0.360 | 0.975 |
| Agent B | 0.360 | 0.230 | 0.400 | 0.933 |
| Agent C | 0.700 | 0.141 | 0.740 | 0.944 |

What Stage 10 shows:

- The interface-reliability finding is stable across repeated runs.
- Agent C is strongest on average in the five-replication slice.
- Agent A versus Agent B is not a stable ranking; their means are close and their ordering changes across replications.
- Once a patch applied, semantic correctness was usually high for every condition.

## Main Takeaway

The strongest result from this pilot is methodological rather than just comparative. In our pipeline, a substantial share of apparent task failures were interface failures: backend timeouts, malformed diffs, and shallow schema deviations. Structured edit mode improved evaluator reachability, Stage 6 materially changed combined outcomes after repair, Stage 9 showed that the cleaned-up interface is more stable than the condition ranking itself, and Stage 10 showed that this interface finding remains robust across repeated runs. Any benchmark in this setting should separately report output-validity, patch-application, and semantic-solve rates.

## Recommended Reading

1. `challenge/README.md` for the full challenge narrative.
2. `challenge_combined/README.md` for the paper-facing combined view and interface-adjusted metrics.
3. `challenge_json/README.md` for the structured-output comparison.
4. `challenge_json_repaired/README.md` for the Stage 6 repair follow-up.
5. `challenge_json_replication/README.md` for the clean replication run.
6. `stage10_replications/README.md` for the five-replication stability study.
7. `toy_experiment_note.md` for the concise toy baseline note.

## Canonical Artifacts

Trusted baseline:

- `smoke/summary.csv`
- `smoke/summary.summary.json`
- `controls/gold_summary.csv`
- `controls/gold_summary.summary.json`
- `controls/empty_summary.csv`
- `controls/empty_summary.summary.json`
- `agents/agent_a_summary.csv`
- `agents/agent_a_summary.summary.json`
- `agents/agent_b_summary.csv`
- `agents/agent_b_summary.summary.json`
- `agents/agent_c_summary.csv`
- `agents/agent_c_summary.summary.json`

Challenge and follow-ups:

- `challenge/README.md`
- `challenge_rerun/agent_a_summary.summary.json`
- `challenge_rerun/agent_b_summary.summary.json`
- `challenge_rerun/agent_c_summary.summary.json`
- `challenge_json/README.md`
- `challenge_json/agent_a_summary.summary.json`
- `challenge_json/agent_b_summary.summary.json`
- `challenge_json/agent_c_summary.summary.json`
- `challenge_combined/README.md`
- `challenge_combined/agent_a_summary.summary.json`
- `challenge_combined/agent_b_summary.summary.json`
- `challenge_combined/agent_c_summary.summary.json`
- `challenge_combined/interface_adjusted_metrics.csv`
- `challenge_json_repaired/README.md`
- `challenge_json_repaired/agent_a_summary.summary.json`
- `challenge_json_repaired/agent_b_summary.summary.json`
- `challenge_json_repaired/agent_c_summary.summary.json`
- `challenge_json_replication/README.md`
- `challenge_json_replication/agent_a_summary.summary.json`
- `challenge_json_replication/agent_b_summary.summary.json`
- `challenge_json_replication/agent_c_summary.summary.json`
- `challenge_json_replication/replication_manifest.json`
- `stage10_replications/README.md`
- `stage10_replications/stage10_summary.csv`
- `stage10_replications/stage10_patch_metrics.csv`
- `stage10_replications/status_counts.csv`
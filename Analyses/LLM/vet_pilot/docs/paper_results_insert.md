# Paper 2 Results Insert

## Corrected Experimental Unit

All paired Agent B versus Agent D comparisons use `task x replication` as the unit of analysis.

- Tasks: 30
- Replications: 2
- Paired comparison units: 60

Task-level aggregation is reported separately over 30 tasks and should not be confused with the 60-row paired analysis.

## Corrected Stage 2 Headline Counts

These counts are derived from the corrected Stage 2 rerun and supersede any older draft numbers that predate the evaluator-cleanup fix.

| Metric | Agent B | Agent D | Difference |
| --- | ---: | ---: | ---: |
| Verified solve | 51/60 (0.85) | 55/60 (0.917) | +0.067 |
| Patch applied | 57/60 (0.95) | 60/60 (1.00) | +0.050 |
| False completion | 6/60 (0.10) | 5/60 (0.083) | -0.017 |
| JSON valid | 57/60 (0.95) | 60/60 (1.00) | +0.050 |
| Schema usable | 57/60 (0.95) | 60/60 (1.00) | +0.050 |

## Paired Agent B Versus Agent D Statistics

| Metric | D-B | D-only | B-only | 95% paired bootstrap CI | Exact sign test p | Interpretation |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| Verified solve | +0.067 | 5 | 1 | [0.000, 0.150] | 0.2188 | Positive paired solve signal, but still pilot evidence rather than a statistically established effect. |
| Patch applied | +0.050 | 3 | 0 | [0.000, 0.117] | 0.2500 | Positive paired reachability signal, but still pilot evidence. |
| False completion | -0.017 | 2 | 3 | [-0.083, 0.050] | 1.0000 | Slight reliability edge for D because B has more discordant false-completion rows, but the difference is too small to treat as established. |
| JSON valid | +0.050 | 3 | 0 | [0.000, 0.117] | 0.2500 | Positive paired interface-validity signal, but still pilot evidence. |
| Schema usable | +0.050 | 3 | 0 | [0.000, 0.117] | 0.2500 | Positive paired schema-reachability signal, but still pilot evidence. |

## Full Task-Level B Versus D Aggregation

Task-level aggregation collapses the two replications per task.

- D wins: 4 tasks (`challenge_002`, `challenge_006`, `challenge_008`, `challenge_024`)
- B wins: 1 task (`challenge_018`)
- Ties: 24 tasks
- Neither: 1 task (`challenge_016`)

This task-level table is reported in `results/vet_scaling_stage3/task_level_b_vs_d_full.csv`.

## Recovery Qualitative Probe

Recovery annotation was applied to a prioritized subset of differential and false-completion cases, not to a random or complete sample. These annotations should therefore be interpreted as a targeted qualitative probe, not as an estimate of population recovery frequency.

Within the retained artifacts, most D-over-B gains looked like better direct patch generation or generation reliability rather than clearly observable stepwise recovery. `challenge_006` remains the strongest recovery-like case.

## Prompt-Confound Controls And Ordered-Trajectory Check

Agent D may benefit from prompt length, context volume, or extra operational guidance rather than verified trajectory structure alone. Stage 3 now includes two controls for that confound:

- `prompts/vet_scaling_stage3/agent_b2_token_matched_final_patch.md`
- `prompts/vet_scaling_stage3/agent_d_shuffled_trajectory.md`

Observed control outcomes:

| Condition | Verified solve | Patch applied | False completion |
| --- | ---: | ---: | ---: |
| Agent B2 | 55/60 (0.917) | 60/60 (1.000) | 5/60 (0.083) |
| Agent D-shuffled | 52/60 (0.867) | 59/60 (0.983) | 7/60 (0.117) |

Primary paired comparisons:

- B2 versus D: 55/60 versus 55/60, D-B2 = 0.000, exact sign test p = 1.0000.
- D versus D-shuffled: 55/60 versus 52/60, D-D_shuffled = 0.050, D-only = 4, D-shuffled-only = 1, 95% paired bootstrap CI = [-0.017, 0.133], exact sign test p = 0.3750.

Interpretation:

- B2 matching D shows that rich, token-matched context is sufficient to close the original B-to-D gap in this pilot.
- B2 achieved perfect patch applicability but did not exceed Agent D on verified solves. This suggests that token-matched final-patch context improved interface reachability, while semantic correctness after reaching the verifier remained the limiting factor in the remaining failures.
- D's directional edge over D-shuffled suggests that chronological state-action-verification structure may still help within trajectory-style prompts, but this smaller effect is not statistically established and is not cleanly isolated.
- The strongest defensible paper claim is therefore mixed: the pilot supports a rich-context effect robustly, and provides at most tentative additional evidence for ordered verified trajectories.

## Stage 4 Audit Artifacts

The final Stage 4 audit tables are stored in `results/vet_scaling_stage4/final_paired_tests.csv`, `results/vet_scaling_stage4/paired_bootstrap_cis.csv`, and `results/vet_scaling_stage4/prompt_token_counts.csv`.

Exact paired sign tests over discordant pairs only:

| Comparison | Left | Right | Left solves | Right solves | Left-only | Right-only | Ties | Discordant | Exact p |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| D vs B | Agent D | Agent B | 55 | 51 | 5 | 1 | 54 | 6 | 0.2188 |
| B2 vs B | Agent B2 | Agent B | 55 | 51 | 6 | 2 | 52 | 8 | 0.2891 |
| B2 vs D | Agent B2 | Agent D | 55 | 55 | 1 | 1 | 58 | 2 | 1.0000 |
| D vs D-shuffled | Agent D | Agent D-shuffled | 55 | 52 | 4 | 1 | 55 | 5 | 0.3750 |

Confidence intervals are paired bootstrap intervals over `task x replication` units. They reflect uncertainty over the observed pilot units, not a general task-distribution estimate.

Key paired bootstrap intervals:

| Comparison | Metric | Difference | 95% CI |
| --- | --- | ---: | --- |
| D vs B | verified_solve | +0.067 | [0.000, 0.150] |
| D vs B | applied_but_not_verified | -0.017 | [-0.083, 0.050] |
| B2 vs B | verified_solve | +0.067 | [-0.017, 0.167] |
| B2 vs B | applied_but_not_verified | -0.017 | [-0.100, 0.067] |
| B2 vs D | verified_solve | 0.000 | [-0.050, 0.050] |
| B2 vs D | applied_but_not_verified | 0.000 | [-0.050, 0.050] |
| D vs D-shuffled | verified_solve | +0.050 | [-0.017, 0.133] |
| D vs D-shuffled | applied_but_not_verified | -0.033 | [-0.100, 0.033] |

The full Stage 4 CI table also reports `patch_applied`, `json_valid`, and `schema_usable` for all four comparisons.

Prompt token counts were computed from the finalized prompt templates using `cl100k_base (tiktoken)`. They exclude task-specific issue text and source files, which were shared across conditions.

| Prompt | Tokens | Characters |
| --- | ---: | ---: |
| Agent A | 204 | 879 |
| Agent B | 257 | 1177 |
| Agent C | 362 | 1704 |
| Agent D | 506 | 2457 |
| Agent B2 | 508 | 2541 |
| Agent D-shuffled | 630 | 3193 |

These measured counts support the token-matching claim for B2 versus D (508 vs 506 tokens), but they also show that the finalized D-shuffled prompt ended up longer than Agent D. The D-shuffled result should therefore be interpreted as a trajectory-order ablation with similar content type, not as an exact token-matched control.

## Limitations

- This remains a prompt-level pilot, not a training-time scaling result.
- Recovery evidence is a targeted qualitative probe, not a population estimate.
- The corrected Stage 2 headline is positive but small, and uncertainty intervals remain wide.
- Perfect patch reachability did not eliminate semantic failures: B2 made every edit reachable, but not every reachable edit correct.
- Figure assets are not stored in this repo, so counts and uncertainty are prepared here for manuscript insertion rather than redrawn directly.

## Immediate Next Steps

1. Insert the B2 and D-shuffled control tables into the manuscript alongside the frozen B-versus-D paired table.
2. Update figures to show Agent B, Agent B2, Agent D, and Agent D-shuffled with counts and uncertainty.
3. If a stronger mechanism claim is required, run a higher-powered follow-up rather than overstating the current prompt-level pilot.


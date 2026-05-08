# Paper 2 Stage 3 Major Revision

Status:
- Stage 3A: paired B-vs-D statistics — PASSED / FROZEN
- Stage 3B: full task-level B-vs-D table — PASSED / FROZEN
- Stage 3C: recovery wording correction — PASSED
- Stage 3D: B2 token-matched final-patch control — PASSED / FROZEN
- Stage 3E: D-shuffled trajectory control — PASSED / FROZEN

Corrected-data note:

These outputs are derived from the corrected Stage 2 rerun in `results/vet_scaling_stage2/stage2_records.csv`. They supersede older draft counts that were recorded before the evaluator-cleanup fix.

Paired experimental unit:

- One paired unit = one task on one replication, compared between Agent B and Agent D.
- Total paired units = 30 tasks x 2 replications = 60.

Task-level aggregation collapses those 60 rows to 30 tasks and is reported separately in `task_level_b_vs_d_full.csv`.

## Headline Paired Results

| Metric | Agent B | Agent D | D-B | D-only | B-only | 95% paired bootstrap CI | Exact sign test p |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Verified solve | 51/60 | 55/60 | +0.067 | 5 | 1 | [0.000, 0.150] | 0.2188 |
| Patch applied | 57/60 | 60/60 | +0.050 | 3 | 0 | [0.000, 0.117] | 0.2500 |
| False completion | 6/60 | 5/60 | -0.017 | 2 | 3 | [-0.083, 0.050] | 1.0000 |
| JSON valid | 57/60 | 60/60 | +0.050 | 3 | 0 | [0.000, 0.117] | 0.2500 |
| Schema usable | 57/60 | 60/60 | +0.050 | 3 | 0 | [0.000, 0.117] | 0.2500 |

Interpretation:

- Verified solve shows a positive paired signal for Agent D, but uncertainty is wide and the exact paired test is not significant in this pilot.
- Patch reachability, JSON validity, and schema usability all move in Agent D's direction, but each comes from only three discordant paired rows.
- False completion slightly favors Agent D, but the difference is too small to treat as established.

## Task-Level Aggregation

- D wins: 4 tasks (`challenge_002`, `challenge_006`, `challenge_008`, `challenge_024`)
- B wins: 1 task (`challenge_018`)
- Ties: 24 tasks
- Neither: 1 task (`challenge_016`)

The full 30-task table is stored in `task_level_b_vs_d_full.csv` with bug type, solve counts, patch-application counts, and per-task comparison labels.

## Recovery Wording Correction

Recovery annotation was applied to a prioritized subset of differential and false-completion cases, not to a random or complete sample. These annotations should therefore be interpreted as a targeted qualitative probe, not as an estimate of population recovery frequency.

In the retained artifacts, most D-over-B gains still look more like better direct patch generation or generation reliability than clearly observable stepwise recovery.

## Prompt-Confound Control

The repo now includes `prompts/vet_scaling_stage3/agent_b2_token_matched_final_patch.md` as a minimum control for prompt length and context volume.

Completed run design:

- 30 tasks x 1 new condition x 2 replications = 60 runs
- Primary contrasts: B2 vs D and B2 vs B

Observed B2 result:

- B2 verified solve: 55/60
- B2 vs D verified solve: 55/60 vs 55/60, D-B2 = 0.000, exact sign test p = 1.0000
- B2 vs B verified solve: 55/60 vs 51/60, B2-B = 0.067, exact sign test p = 0.2891

Interpretation:

- In this pilot, B2 matches D on verified solve and improves on B.
- B2 achieved perfect patch applicability but did not exceed Agent D on verified solves. This suggests that token-matched final-patch context improved interface reachability, while semantic correctness after reaching the verifier remained the limiting factor in the remaining failures.
- That weakens a trajectory-specific interpretation and increases the plausibility that prompt length, verbosity, or richer final-patch context explains much of the observed D-over-B gap.
- The uncertainty is still wide, so this should remain a prompt-level pilot result rather than a settled mechanism claim.

New Stage 3 artifacts:

- `b2_summary.csv`
- `b2_vs_d_stats.csv`
- `b2_vs_b_stats.csv`
- `d_shuffled_summary.csv`
- `d_vs_d_shuffled_stats.csv`
- `d_shuffled_task_level.csv`
- `d_shuffled_records.csv`
- `d_shuffled_status_counts.csv`
- `stage3_summary.md`

## D-Shuffled Trajectory Control

The repo now also includes `prompts/vet_scaling_stage3/agent_d_shuffled_trajectory.md`, which keeps the same information type as Agent D but breaks the state-action-verification order.

Observed D-shuffled result:

- D-shuffled verified solve: 52/60
- D-shuffled patch applied: 59/60
- D-shuffled false completion: 7/60
- D vs D-shuffled verified solve: 55/60 vs 52/60, D-D_shuffled = 0.050, exact sign test p = 0.3750

Interpretation:

- The combined ablation result is mixed.
- Agent B2 already matches Agent D, so rich context appears sufficient for most of the original B-to-D gain.
- Agent D still has a directional edge over Agent D-shuffled, which is consistent with a possible contribution from ordered trajectory structure inside trajectory-style prompts, but that smaller effect is not yet cleanly isolated or statistically established.

## Stage 4 Audit Outputs

Stage 4 adds auditable final paired tests, paired bootstrap confidence intervals, and finalized prompt token counts under `results/vet_scaling_stage4`.

Key audit summary:

- `D vs B`: left-only = 5, right-only = 1, discordant = 6, exact p = 0.2188
- `B2 vs B`: left-only = 6, right-only = 2, discordant = 8, exact p = 0.2891
- `B2 vs D`: left-only = 1, right-only = 1, discordant = 2, exact p = 1.0000
- `D vs D-shuffled`: left-only = 4, right-only = 1, discordant = 5, exact p = 0.3750

Finalized prompt counts:

- Agent D: 506 tokens
- Agent B2: 508 tokens
- Agent D-shuffled: 630 tokens

This means B2 is genuinely token-matched to Agent D in the finalized templates, while Agent D-shuffled is not an exact token-matched control.

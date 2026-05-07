# Paper 2 Stage 2 Freeze

Status: Paper 2 Stage 2: corrected 30-task expansion — PASSED / FROZEN

Title: Do Verified Trajectories Improve Software-Agent Reliability?
Subtitle: A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples

Contribution:

After correcting an evaluation-state bug in the Stage 2 pipeline, the clean 240-run expansion still shows a modest reliability advantage for Agent D over Agent B. The strongest current claim is reliability, not mechanism: most retained evidence points to better direct patch generation or generation robustness rather than clearly demonstrated recovery behavior.

This directory is the frozen corrected Stage 2 baseline for the current Paper 2 draft. Preserve the artifact set below in place and treat later annotation expansion or training-time scaling as downstream work.

Trustworthiness note:

The first 240-run expansion was discarded after we found evaluator contamination from dirty task repos. `harness/evaluate_task.py` now resets and cleans each task repo around evaluation, and all paper-facing Stage 2 claims below refer only to the corrected rerun.

Frozen corrected outputs:

- `stage2_summary.md`
- `summary_by_condition.csv`
- `headline_b_vs_d.csv`
- `task_level_b_vs_d.csv`
- `recovery_annotations.csv`
- `recovery_summary.md`

## Headline Contrast

| Metric | Agent B: final patch | Agent D: full trajectory | Difference |
| --- | ---: | ---: | ---: |
| Verified solve | 0.85 | 0.92 | +0.07 |
| Patch applied | 0.95 | 1.00 | +0.05 |
| False completion | 0.10 | 0.08 | -0.02 |
| JSON valid | 0.95 | 1.00 | +0.05 |
| Schema usable | 0.95 | 1.00 | +0.05 |
| Recovery observed | 0.00 | 0.02 | +0.02 |

## Task-Level Agent B vs Agent D

Outcome totals: D wins 4; B wins 1; tie 24; neither 1.

Mechanism summary:

- Strongest recovery-like case: `challenge_006`
- Better direct patch generation or generation robustness: `challenge_002`, `challenge_008`, `challenge_024`
- No longer differential on the clean rerun: `challenge_003`

## Interpretation Discipline

Main result:
- Agent D is modestly more reliable than Agent B on the corrected 30-task expansion.

Mechanism:
- The retained artifacts mostly support better direct patch generation or generation reliability, not a proven recovery mechanism.

Limitation:
- Recovery coding covers 22/240 rows, so recovery rates are lower bounds.
- This remains a prompt-level pilot; there is no training-time scaling result yet.
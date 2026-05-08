# Stage 3 Summary

Status:
- Stage 3A: paired B-vs-D statistics — PASSED / FROZEN
- Stage 3B: full task-level B-vs-D table — PASSED / FROZEN
- Stage 3C: recovery wording correction — PASSED
- Stage 3D: B2 token-matched final-patch control — PASSED / FROZEN
- Stage 3E: D-shuffled trajectory control — PASSED / FROZEN

Experimental unit:
- One paired unit = one task on one replication.
- Each paired Stage 3 comparison uses 30 tasks x 2 replications = 60 paired units.

## Frozen B vs D Reference

Frozen corrected B vs D verified solve: Agent B 51/60 vs Agent D 55/60 (D-B = 0.067, p = 0.2188).

## B2 Control

Agent B2 summary: verified solve 55/60, patch applied 60/60, false completion 5/60.
B2 vs D verified solve: Agent B2 55/60 vs Agent D 55/60 (D-B2 = 0.000, p = 1.0000).
B vs B2 verified solve: Agent B 51/60 vs Agent B2 55/60 (B2-B = 0.067, p = 0.2891).

## D-Shuffled Control

| Metric | Count | Rate |
| --- | ---: | ---: |
| JSON valid | 59/60 | 0.983 |
| Schema usable | 59/60 | 0.983 |
| Patch applied | 59/60 | 0.983 |
| Verified solve | 52/60 | 0.867 |
| Solve if applied | 52/59 | 0.881 |
| False completion | 7/60 | 0.117 |

D vs D-shuffled verified solve: Agent D 55/60 vs Agent D-shuffled 52/60 (D-D_shuffled = 0.050, p = 0.3750).
Task-level aggregation: D wins=3, D-shuffled wins=0, ties=26, neither=1.

Interpretation:
- The pilot gives mixed ablation evidence: token-matched final-patch context already matches Agent D, so rich context appears sufficient for most of the gain, while Agent D's smaller directional edge over Agent D-shuffled suggests that trajectory order may still matter within trajectory-style prompts but is not yet cleanly isolated.
- Agent D shows a positive paired solve signal over Agent D-shuffled; this is pilot evidence, not a statistically established effect
- This remains pilot evidence rather than a statistically established mechanism effect unless the paired gap is larger and more stable in a higher-powered study.

## Output Files

- `b2_summary.csv`
- `b2_vs_d_stats.csv`
- `b2_vs_b_stats.csv`
- `d_shuffled_summary.csv`
- `d_vs_d_shuffled_stats.csv`
- `d_shuffled_task_level.csv`
- `stage3_summary.md`

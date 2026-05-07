# Stage 2 Summary

Status: Stage 2C: 240-run model expansion — PASSED
Paper title: Do Verified Trajectories Improve Software-Agent Reliability?
Subtitle: A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples

Model: `qwen3-coder:480b-cloud`
Backend: `ollama-cli`
Replications: rep_01, rep_02
Tasks: 30
Run records: 240
Recovery coding coverage: 22/240 rows annotated; recovery metrics below are lower bounds until Stage 2D coding is complete.

## Primary Comparison: Agent D vs Agent B

| Metric | Agent B: final patch | Agent D: full trajectory | Difference |
| --- | ---: | ---: | ---: |
| Verified solve | 0.85 | 0.92 | +0.07 |
| Patch applied | 0.95 | 1.00 | +0.05 |
| False completion | 0.10 | 0.08 | -0.02 |
| JSON valid | 0.95 | 1.00 | +0.05 |
| Schema usable | 0.95 | 1.00 | +0.05 |
| Recovery observed | 0.00 | 0.02 | +0.02 |

Desired direction:
- Verified solve: Agent D higher
- Patch applied: Agent D higher
- False completion: Agent D lower
- JSON valid and schema usable: Agent D equal or higher
- Recovery observed: Agent D higher

## Summary by Condition

| Condition | Runs | JSON valid | Schema usable | Patch applied | Verified solve | Solve if applied | False completion | Recovery observed | Annotated rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| agent_a | 60 | 1.000 | 1.000 | 1.000 | 0.917 | 0.917 | 0.083 | 0.000 | 0/60 |
| agent_b | 60 | 0.950 | 0.950 | 0.950 | 0.850 | 0.895 | 0.100 | 0.000 | 10/60 |
| agent_c | 60 | 1.000 | 1.000 | 1.000 | 0.833 | 0.833 | 0.167 | 0.000 | 0/60 |
| agent_d | 60 | 1.000 | 1.000 | 1.000 | 0.917 | 0.917 | 0.083 | 0.017 | 12/60 |

## Task Breakdown

| Task | Agent A | Agent B | Agent C | Agent D |
| --- | --- | --- | --- | --- |
| challenge_001 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_002 | 2/2 solve | 0/2 solve | 1/2 solve | 2/2 solve |
| challenge_003 | 2/2 solve | 2/2 solve | 0/2 solve | 2/2 solve |
| challenge_004 | 1/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_005 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_006 | 0/2 solve | 0/2 solve | 1/2 solve | 1/2 solve |
| challenge_007 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_008 | 2/2 solve | 1/2 solve | 1/2 solve | 2/2 solve |
| challenge_009 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_010 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_011 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_012 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_013 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_014 | 2/2 solve | 2/2 solve | 1/2 solve | 2/2 solve |
| challenge_015 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_016 | 0/2 solve | 0/2 solve | 0/2 solve | 0/2 solve |
| challenge_017 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_018 | 2/2 solve | 2/2 solve | 1/2 solve | 1/2 solve |
| challenge_019 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_020 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_021 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_022 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_023 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_024 | 2/2 solve | 1/2 solve | 2/2 solve | 2/2 solve |
| challenge_025 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_026 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_027 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_028 | 2/2 solve | 1/2 solve | 1/2 solve | 1/2 solve |
| challenge_029 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |
| challenge_030 | 2/2 solve | 2/2 solve | 2/2 solve | 2/2 solve |

## Task-Level Agent B vs Agent D

| Task | Agent B: final patch | Agent D: full trajectory | Outcome |
| --- | --- | --- | --- |
| challenge_001 | 2/2 solve | 2/2 solve | tie |
| challenge_002 | 0/2 solve | 2/2 solve | D wins |
| challenge_003 | 2/2 solve | 2/2 solve | tie |
| challenge_004 | 2/2 solve | 2/2 solve | tie |
| challenge_005 | 2/2 solve | 2/2 solve | tie |
| challenge_006 | 0/2 solve | 1/2 solve | D wins |
| challenge_007 | 2/2 solve | 2/2 solve | tie |
| challenge_008 | 1/2 solve | 2/2 solve | D wins |
| challenge_009 | 2/2 solve | 2/2 solve | tie |
| challenge_010 | 2/2 solve | 2/2 solve | tie |
| challenge_011 | 2/2 solve | 2/2 solve | tie |
| challenge_012 | 2/2 solve | 2/2 solve | tie |
| challenge_013 | 2/2 solve | 2/2 solve | tie |
| challenge_014 | 2/2 solve | 2/2 solve | tie |
| challenge_015 | 2/2 solve | 2/2 solve | tie |
| challenge_016 | 0/2 solve | 0/2 solve | neither |
| challenge_017 | 2/2 solve | 2/2 solve | tie |
| challenge_018 | 2/2 solve | 1/2 solve | B wins |
| challenge_019 | 2/2 solve | 2/2 solve | tie |
| challenge_020 | 2/2 solve | 2/2 solve | tie |
| challenge_021 | 2/2 solve | 2/2 solve | tie |
| challenge_022 | 2/2 solve | 2/2 solve | tie |
| challenge_023 | 2/2 solve | 2/2 solve | tie |
| challenge_024 | 1/2 solve | 2/2 solve | D wins |
| challenge_025 | 2/2 solve | 2/2 solve | tie |
| challenge_026 | 2/2 solve | 2/2 solve | tie |
| challenge_027 | 2/2 solve | 2/2 solve | tie |
| challenge_028 | 1/2 solve | 1/2 solve | tie |
| challenge_029 | 2/2 solve | 2/2 solve | tie |
| challenge_030 | 2/2 solve | 2/2 solve | tie |

Outcome totals: D wins 4; B wins 1; tie 24; neither 1.

## Interpretation Discipline

Primary claim: Agent D versus Agent B.
Secondary exploratory claim: the full A/B/C/D ordering, reported with caution because the Stage 1 pilot did not support a stable monotonic ranking.

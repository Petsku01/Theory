# VET Scaling Pilot Summary

Status: Paper 2 Stage 1: 80-run pilot — PASSED / FROZEN
Paper title: Do Verified Trajectories Improve Software-Agent Reliability?
Subtitle: A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples

Contribution: Using the repaired JSON evaluation interface from our previous work, we find that full verified-trajectory examples outperform final-patch examples in an 80-run software-agent pilot, improving verified solve rate and reducing false completion, while abstract verification lessons alone do not reliably improve over the instruction-only baseline.

Model: `qwen3-coder:480b-cloud`
Backend: `ollama-cli`
Replications: rep_01, rep_02
Tasks: 10

## Headline Contrast

| Metric | Agent B: final patch | Agent D: full trajectory | Difference |
| --- | ---: | ---: | ---: |
| Verified solve | 0.40 | 0.50 | +0.10 |
| Patch applied | 0.50 | 0.55 | +0.05 |
| False completion | 0.10 | 0.05 | -0.05 |
| JSON valid | 0.95 | 1.00 | +0.05 |

## Summary by Condition

| Condition | Runs | JSON valid | Schema usable | Patch applied | Verified solve | Solve if applied | False completion |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| agent_a | 20 | 1.000 | 1.000 | 0.500 | 0.450 | 0.900 | 0.050 |
| agent_b | 20 | 0.950 | 0.950 | 0.500 | 0.400 | 0.800 | 0.100 |
| agent_c | 20 | 1.000 | 1.000 | 0.450 | 0.350 | 0.778 | 0.100 |
| agent_d | 20 | 1.000 | 1.000 | 0.550 | 0.500 | 0.909 | 0.050 |

## Task Breakdown

| Task | Agent A | Agent B | Agent C | Agent D |
| --- | --- | --- | --- | --- |
| challenge_001 | 1/2 solve | 1/2 solve | 1/2 solve | 1/2 solve |
| challenge_002 | 1/2 solve | 0/2 solve | 0/2 solve | 1/2 solve |
| challenge_003 | 0/2 solve | 1/2 solve | 0/2 solve | 2/2 solve |
| challenge_004 | 1/2 solve | 1/2 solve | 1/2 solve | 1/2 solve |
| challenge_005 | 1/2 solve | 1/2 solve | 1/2 solve | 1/2 solve |
| challenge_006 | 0/2 solve | 1/2 solve | 0/2 solve | 0/2 solve |
| challenge_007 | 1/2 solve | 1/2 solve | 1/2 solve | 1/2 solve |
| challenge_008 | 2/2 solve | 0/2 solve | 1/2 solve | 1/2 solve |
| challenge_009 | 1/2 solve | 1/2 solve | 1/2 solve | 1/2 solve |
| challenge_010 | 1/2 solve | 1/2 solve | 1/2 solve | 1/2 solve |

## Task-Level Agent B vs Agent D

| Task | Agent B: final patch | Agent D: full trajectory | Outcome |
| --- | --- | --- | --- |
| challenge_001 | 1/2 solve | 1/2 solve | tie |
| challenge_002 | 0/2 solve | 1/2 solve | D wins |
| challenge_003 | 1/2 solve | 2/2 solve | D wins |
| challenge_004 | 1/2 solve | 1/2 solve | tie |
| challenge_005 | 1/2 solve | 1/2 solve | tie |
| challenge_006 | 1/2 solve | 0/2 solve | B wins |
| challenge_007 | 1/2 solve | 1/2 solve | tie |
| challenge_008 | 0/2 solve | 1/2 solve | D wins |
| challenge_009 | 1/2 solve | 1/2 solve | tie |
| challenge_010 | 1/2 solve | 1/2 solve | tie |

Outcome totals: D wins 3; B wins 1; tie 6; neither 0.

## Qualitative Note

On rep_01 challenge_003, Agent D was the only condition to convert valid structured output into a verified solve on the misleading-obvious-fix task, while A/B/C reached the interface layer but failed at edit effectiveness, verification, or patch application.

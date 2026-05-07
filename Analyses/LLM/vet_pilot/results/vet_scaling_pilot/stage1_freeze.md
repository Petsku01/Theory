# Paper 2 Stage 1 Freeze

Status: Paper 2 Stage 1: 80-run pilot — PASSED / FROZEN

Title: Do Verified Trajectories Improve Software-Agent Reliability?
Subtitle: A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples

Contribution:

Using the repaired JSON evaluation interface from our previous work, we find that full verified-trajectory examples outperform final-patch examples in an 80-run software-agent pilot, improving verified solve rate and reducing false completion, while abstract verification lessons alone do not reliably improve over the instruction-only baseline.

This directory is the frozen Stage 1 baseline for Paper 2. Preserve the underlying 80-run pilot artifacts in place and treat subsequent work as downstream analysis or a new stage.

Annotation scope:
- Current manual subset covers all challenge_003 rows, all Agent D solves, all Agent B false completions, and all cases where Agent D solved while Agent B failed.
- Coding rule: true means the retained artifacts support a specific recovery or trajectory-use claim. false means not observed in the retained artifacts.

## Headline Contrast

| Metric | Agent B: final patch | Agent D: full trajectory | Difference |
| --- | ---: | ---: | ---: |
| Verified solve | 0.40 | 0.50 | +0.10 |
| Patch applied | 0.50 | 0.55 | +0.05 |
| False completion | 0.10 | 0.05 | -0.05 |
| JSON valid | 0.95 | 1.00 | +0.05 |

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

## Scale Recommendation

Recommended next run: 30 tasks x 4 conditions x 2 replications = 240 runs.

Reason: add 20 more tasks before adding more replications to test generalization across more task types. If the Stage 1 signal survives broader task diversity then a later replication-heavy stage can target stochastic stability.

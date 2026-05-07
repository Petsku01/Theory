# Toy Experiment Note

## Summary

This result set covers the negative-control smoke test, all-toy-task positive and negative controls, and the first toy A/B/C evaluation sweep.

## Smoke Validation

The smoke check under `results/smoke` contains two evaluations for `task_001`:

- gold patch: verified solve `true`
- empty patch: verified solve `false`

The aggregate smoke summary therefore reports `n = 2` and `verified_solve_rate = 0.5`, which is the expected one-pass / one-fail outcome for a positive and negative control pair.

| Condition     | Tasks | Verified solve rate | False completion rate | Notes |
| ------------- | ----: | ------------------: | --------------------: | ----- |
| Gold control  |     3 |                 1.0 |                   0.0 | validates positives |
| Empty control |     3 |                 0.0 |                   0.0 | evaluator rejects empty patch before tests |
| Agent A       |     3 |                 1.0 |                   0.0 | instruction only |
| Agent B       |     3 |                 1.0 |                   0.0 | final patch context |
| Agent C       |     3 |                 1.0 |                   0.0 | verified trajectory context |

## Artifact Files

- `results/smoke/task_001_gold_eval.json`
- `results/smoke/task_001_empty_eval.json`
- `results/smoke/summary.csv`
- `results/smoke/summary.summary.json`
- `results/controls/gold_summary.csv`
- `results/controls/gold_summary.summary.json`
- `results/controls/empty_summary.csv`
- `results/controls/empty_summary.summary.json`
- `results/agents/agent_a_summary.csv`
- `results/agents/agent_a_summary.summary.json`
- `results/agents/agent_b_summary.csv`
- `results/agents/agent_b_summary.summary.json`
- `results/agents/agent_c_summary.csv`
- `results/agents/agent_c_summary.summary.json`

## Failed Control JSONs

- `results/smoke/task_001_empty_eval.json`
- `results/controls/empty/task_001.json`
- `results/controls/empty/task_002.json`
- `results/controls/empty/task_003.json`

## Notes

- The empty-patch negative controls failed at patch application time with `error: No valid patches in input`, which is the expected rejection behavior for an empty candidate.
- The A/B/C toy candidate patches were manually authored against the task issues and all three conditions converged to the same minimal fixes on these small tasks.
- On this toy set, the A/B/C sweep verifies the evaluation plumbing, but it does not yet distinguish the three prompting conditions empirically.
# Experimental Protocol: Verified Experience Scaling Pilot

## Research question

Do agents exposed to full state-action-observation-verification trajectories outperform agents exposed only to instructions or final outputs on long-horizon software tasks?

## Hypothesis

Agents in the VET condition will show higher verified solve rate, lower false completion rate, and higher recovery rate than instruction-only and final-patch-only agents, especially on tasks requiring multiple failed attempts or verifier-guided correction.

## Conditions

### Agent A: instruction-only
Receives the issue, repository, system rules, and tools.

### Agent B: final-patch condition
Receives the same information plus examples of final successful patches.

### Agent C: VET condition
Receives the same information plus examples/lessons from full verified experience trajectories, including failed attempts, verifier outputs, corrections, and scoped memory updates.

## Controls

All conditions should use:

- Same base model
- Same model temperature
- Same tool set
- Same max step budget
- Same task order randomization
- Same visible tests
- Same hidden tests
- Same execution environment

## Tasks

Pilot: 10 toy or fresh real repository tasks.
Credible early result: 30 real tasks.
Stronger result: 100+ fresh tasks from live repositories or monthly benchmark splits.

Preferred sources:

- SWE-bench-Live full split
- Monthly-SWEBench
- newly collected GitHub issue/PR pairs
- internal repository issues where hidden tests can be defined

## Primary metrics

1. Verified solve rate
2. False completion rate
3. Recovery rate
4. Regression rate
5. Number of actions
6. Number of failed verifier calls
7. Wall-clock cost
8. Human intervention count

## Definitions

### Verified solve
The task is solved if the final patch satisfies all required verifiers, including hidden tests when available.

### False completion
The agent claims success, but the final state does not satisfy the verifier.

### Recovery
The agent experiences at least one failed verifier step and later reaches a verified successful state without human correction.

### Regression
The target issue appears fixed but unrelated visible or hidden behavior is broken.

## Statistical analysis

For a pilot, report descriptive statistics and confidence intervals. Avoid strong claims. For 30+ tasks, use paired comparisons because each task is attempted by each condition.

Recommended tests:

- McNemar test for paired binary solve/fail outcomes
- Bootstrap confidence intervals for solve-rate deltas
- Wilcoxon signed-rank for action count and cost differences

## Anti-gaming controls

- Hidden tests are not visible to the agent.
- Evaluation harness should be read-only.
- Agents should not be allowed to edit tests unless explicitly required.
- Generated tests should be fresh where possible.
- Run exploit-agent audits when feasible.

## Falsification criteria

The Verified Experience Hypothesis is weakened if:

- Agent C does not outperform Agent B after controlling for model, tools, and inference budget.
- Agent C improves visible-test success but not hidden-test success.
- Agent C learns to game verifiers more effectively than it learns to solve tasks.
- Memory improves repeated tasks but worsens generalization.
- Test-time compute explains most gains and trajectory exposure explains little.

## Reporting template

Report the full table:

| Condition | N | Solve Rate | False Completion | Recovery | Regression | Mean Actions | Mean Cost |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | | | | | | | |
| B | | | | | | | |
| C | | | | | | | |

Then report task-level examples where VET helped and where it failed.

# Paper 2 Stage 2 Corrected Freeze

Status: Paper 2 Stage 2: corrected 30-task expansion — PASSED / FROZEN

Title: Do Verified Trajectories Improve Software-Agent Reliability?
Subtitle: A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples

Stage status:
- Stage 0: 12-run tiny check — PASSED
- Stage 1: 80-run pilot — PASSED / FROZEN
- Stage 2A: Author 20 new challenge tasks — PASSED
- Stage 2B: Validate gold/empty controls — PASSED
- Stage 2C: 240-run model expansion — PASSED / CORRECTED / FROZEN
- Stage 2D: Recovery subset annotation for current draft — PARTIAL / FROZEN

Stage 2 roots:

- results root: `results/vet_scaling_stage2`
- candidates root: `candidates/vet_scaling_stage2`
- prompt root: `prompts/vet_scaling_pilot`
- frozen Stage 1 baseline: `results/vet_scaling_pilot`

Corrected-run note:

The first 240-run Stage 2 expansion was contaminated by evaluation-state leakage from dirty task repos. After repairing evaluator cleanup in `harness/evaluate_task.py`, the full Stage 2C expansion was rerun cleanly. All paper-facing Stage 2 claims below refer only to that corrected rerun.

Main result:

- Agent D verified solve rate: 0.92 versus 0.85 for Agent B
- Agent D patch applied rate: 1.00 versus 0.95 for Agent B
- Agent D false completion rate: 0.08 versus 0.10 for Agent B
- JSON valid and schema usable: 1.00 for Agent D versus 0.95 for Agent B
- Task-level outcome totals: D wins 4, B wins 1, tie 24, neither 1

Mechanism framing:

- The current evidence supports a modest D-over-B reliability advantage.
- The retained artifacts mostly support better direct patch generation or generation robustness, not a proven recovery mechanism.
- `challenge_006` is the strongest recovery-like D-over-B case.
- `challenge_002`, `challenge_008`, and `challenge_024` look more like direct patch quality or generation reliability than recovery.

Limitation framing:

- Recovery annotation was applied to a prioritized subset of differential and false-completion cases, not to a random or complete sample. These annotations should therefore be interpreted as a targeted qualitative probe, not as an estimate of population recovery frequency.
- This remains a prompt-level pilot; there is no training-time scaling result yet.

Why the project is more trustworthy now:

- The corrected rerun preserved the headline D-over-B signal even after discarding the contaminated first expansion.
- Catching and repairing a real evaluation-state bug raised the technical bar for the paper-facing claim rather than weakening it.

Frozen corrected outputs:

- `stage2_summary.md`
- `summary_by_condition.csv`
- `headline_b_vs_d.csv`
- `task_level_b_vs_d.csv`
- `recovery_annotations.csv`
- `recovery_summary.md`

Supporting artifacts:

- task inventory: `task_inventory.csv` and `task_inventory.json`
- control summary: `control_summary.csv`
- task authoring status: `stage2_authoring.md`
- detailed control results: `controls/gold/` and `controls/empty/`
- expansion records: `stage2_records.csv`
- dedicated freeze note: `stage2_freeze.md`
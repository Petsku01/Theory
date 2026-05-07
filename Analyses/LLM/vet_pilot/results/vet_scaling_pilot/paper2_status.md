# Paper 2 Status

Title: Do Verified Trajectories Improve Software-Agent Reliability?
Subtitle: A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples

Stage 0: 12-run tiny check — PASSED
Stage 1: 80-run pilot — PASSED / FROZEN
Stage 2A: Author 20 new challenge tasks — PASSED
Stage 2B: Validate gold/empty controls — PASSED
Stage 2C: 240-run model expansion — PASSED / CORRECTED / FROZEN
Stage 2D: Recovery subset annotation for current draft — PARTIAL / FROZEN

Current position:
- Stage 0 established that all four conditions can produce valid repaired-JSON outputs on the tiny check.
- Stage 1 produced the frozen 80-run pilot and the headline D versus B contrast table.
- Stage 2C completed the corrected 240-run expansion over the frozen 30-task inventory, and the corrected Stage 2 artifact set is now frozen for the current draft.

Paper 2 framing:
- Main result: Agent D is modestly more reliable than Agent B on the corrected 30-task expansion.
- Mechanism: the retained artifacts mostly support better direct patch generation or generation reliability, not proven recovery.
- Limitation: recovery annotation is partial at 22/240 rows, and there is no training-time scaling result yet.

Trustworthiness note:
- The first Stage 2 expansion was discarded after we found evaluation-state contamination from dirty task repos.
- Repairing evaluator cleanup and rerunning the full 240-run expansion makes the project stronger, because the current claim survived a real bug fix instead of depending on the contaminated run.

Stage 2 design:
- 30 tasks x 4 conditions x 2 replications = 240 runs.
- Primary question: Does D > B hold across more task types, or was the 80-run result concentrated in a few tasks?
- Current repo state: 30 challenge tasks are available under tasks/challenge, the 20 newly authored Stage 2 tasks passed gold/empty controls, and the corrected 240-run Stage 2 records are frozen under results/vet_scaling_stage2.

Recommendation:
- Use the frozen corrected Stage 2 outputs for the current paper-facing result.
- If a stronger mechanism claim is needed, finish the remaining Stage 2D coding.
- If a stronger scaling claim is needed, add a later training-time or larger-benchmark stage instead of overstating this prompt-level pilot.

The project is in good shape.

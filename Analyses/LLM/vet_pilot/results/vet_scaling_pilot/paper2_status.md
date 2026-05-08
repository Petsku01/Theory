# Paper 2 Status

Title: Do Verified Trajectories Improve Software-Agent Reliability?
Subtitle: A Pilot Study Comparing Final Patches, Verification Lessons, and Full State-Action-Verification Examples

Stage 0: 12-run tiny check — PASSED
Stage 1: 80-run pilot — PASSED / FROZEN
Stage 2A: Author 20 new challenge tasks — PASSED
Stage 2B: Validate gold/empty controls — PASSED
Stage 2C: 240-run model expansion — PASSED / CORRECTED / FROZEN
Stage 2D: Recovery subset annotation for current draft — PARTIAL / FROZEN
Stage 3A: Paired B-vs-D statistics — PASSED / FROZEN
Stage 3B: Full task-level B-vs-D table — PASSED / FROZEN
Stage 3C: Recovery wording correction — PASSED
Stage 3D: B2 token-matched final-patch control — PASSED / FROZEN
Stage 3E: D-shuffled trajectory control — PASSED / FROZEN
Stage 4A: Exact paired p-value audit table — PASSED / FROZEN
Stage 4B: Paired bootstrap confidence intervals — PASSED / FROZEN
Stage 4C: Finalized prompt token counts — PASSED / FROZEN
Stage 4D: B2 reachability-versus-correctness interpretation — PASSED
Stage 4E: External manuscript export — BLOCKED / FINAL `.docx` NOT IN WORKSPACE

Current position:
- Stage 0 established that all four conditions can produce valid repaired-JSON outputs on the tiny check.
- Stage 1 produced the frozen 80-run pilot and the headline D versus B contrast table.
- Stage 2C completed the corrected 240-run expansion over the frozen 30-task inventory, and the corrected Stage 2 artifact set is now frozen for the current draft.
- Stage 3A and 3B add paired `task x replication` statistics plus the full 30-task B-vs-D table under `results/vet_scaling_stage3`.
- Stage 3D completes the token-matched prompt-confound control: Agent B2 matches Agent D at 55/60 verified solves and exceeds Agent B's 51/60.
- Stage 3E completes the D-shuffled trajectory control: Agent D solves 55/60 versus Agent D-shuffled's 52/60, a directional but not statistically established gap.
- Stage 4A recomputes the exact paired sign tests into a final auditable table under `results/vet_scaling_stage4/final_paired_tests.csv`.
- Stage 4B adds paired bootstrap confidence intervals for all final comparisons and key metrics under `results/vet_scaling_stage4/paired_bootstrap_cis.csv`.
- Stage 4C adds finalized prompt counts under `results/vet_scaling_stage4/prompt_token_counts.csv`, showing that Agent B2 is effectively token-matched to Agent D (508 vs 506 tokens) while Agent D-shuffled is longer (630 tokens).

Paper 2 framing:
- Main result: Agent D is modestly more reliable than Agent B on the corrected 30-task expansion.
- Mechanism: the Stage 3 ablations now give mixed evidence. Rich token-matched context is sufficient to match Agent D, while ordered trajectories retain only a smaller directional edge over the shuffled control.
- Interface versus semantics: B2 reaches perfect patch applicability without exceeding Agent D on verified solves, so interface reachability and semantic correctness separate in the remaining failures.
- Limitation: recovery annotation is a targeted qualitative probe over prioritized differential and false-completion cases, not a population estimate, and there is no training-time scaling result yet.

Trustworthiness note:
- The first Stage 2 expansion was discarded after we found evaluation-state contamination from dirty task repos.
- Repairing evaluator cleanup and rerunning the full 240-run expansion makes the project stronger, because the current claim survived a real bug fix instead of depending on the contaminated run.

Stage 2 design:
- 30 tasks x 4 conditions x 2 replications = 240 runs.
- Primary question: Does D > B hold across more task types, or was the 80-run result concentrated in a few tasks?
- Current repo state: 30 challenge tasks are available under tasks/challenge, the 20 newly authored Stage 2 tasks passed gold/empty controls, and the corrected 240-run Stage 2 records are frozen under results/vet_scaling_stage2.

Recommendation:
- Use the frozen corrected Stage 2 outputs together with the completed Stage 3 control suite for the current paper-facing result.
- Phrase the mechanism claim conservatively: rich context clearly matters, and any additional ordered-trajectory benefit remains tentative.
- Use the Stage 4 audit tables for every p-value, confidence interval, and prompt-length statement in the external draft.
- If a stronger mechanism claim is needed, add power or additional controls rather than overstating the current prompt-level pilot.
- If a stronger scaling claim is needed, add a later training-time or larger-benchmark stage instead of overstating this prompt-level pilot.

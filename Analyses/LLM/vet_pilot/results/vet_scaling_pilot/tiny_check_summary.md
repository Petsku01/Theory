# Tiny Check Summary

Model: `qwen3-coder:480b-cloud`
Backend: `ollama-cli`
Replication: `rep_01`
Tasks: `challenge_003`, `challenge_004`, `challenge_007`

| Task | Agent A | Agent B | Agent C | Agent D |
| --- | --- | --- | --- | --- |
| challenge_003 | no_effective_changes | false_completion | patch_did_not_apply | solve |
| challenge_004 | patch_did_not_apply | solve | patch_did_not_apply | solve |
| challenge_007 | solve | no_effective_changes | solve | no_effective_changes |

## Qualitative Note

Agent D was the only condition to convert valid structured output into a verified solve on the misleading-obvious-fix task, while A/B/C reached the interface layer but failed at edit effectiveness, verification, or patch application.

## Pilot Signal

Agent D solved 2 of the 3 tiny-check tasks. Agents A, B, and C each solved 1 of the 3 tasks.

This is strong enough to justify the next pilot stage: 10 tasks x 4 conditions x 2 replications.
# Stage 2D Recovery Summary

Scope: prioritized subset annotation on the clean Stage 2C rerun only.
Coverage: 22/240 rows annotated in `recovery_annotations.csv`.
Interpretation rule: recovery and trajectory counts below are lower bounds until the remaining Stage 2D rows are coded.

## Headline Counts

| Measure | Value |
| --- | ---: |
| D wins over B | 4 tasks |
| D wins with recovery evidence | 1 task |
| D wins without recovery evidence | 3 tasks |
| B false completions | 6 rows |
| D false completions | 5 rows |
| D solved while B failed | 5 rows |

Tasks in each D-over-B bucket:
- Recovery evidence observed: `challenge_006`
- No recovery evidence observed: `challenge_002`, `challenge_008`, `challenge_024`

## Conservative Interpretation

- `challenge_006` is the strongest recovery-like case. Agent D's solved row preserved the invalid-input `ValueError` behavior after the Decimal rewrite, while Agent B false-completed on the same contract.
- `challenge_002` looks like better direct patch generation rather than retained recovery evidence. Agent D reused the shared parsing helper and handled blank `APP_PORT` values; Agent B's rows missed that edge.
- `challenge_008` should not be counted as recovery evidence. The decisive Agent B failure was a backend generation failure before patch application.
- `challenge_024` should not be counted as recovery evidence. The decisive Agent B failure was malformed repaired JSON, while Agent D supplied the straightforward `flatten_once` type-guard fix.
- `challenge_003` no longer carries a Stage 2 D-only signal on the clean rerun. Agent B and Agent D both solved 2/2 with the same small ellipsis-limit guard.

## Notes For Reporting

- `stage2_summary.md` and `summary_by_condition.csv` now include annotation coverage so the nonzero recovery rate is explicitly marked as a lower bound.
- If the paper needs final condition-level recovery rates, the remaining 218 unannotated rows still need Stage 2D coding.
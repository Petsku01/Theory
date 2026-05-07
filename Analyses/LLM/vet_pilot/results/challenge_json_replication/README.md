# Challenge JSON Replication Results

This directory contains Stage 9: a clean replication run using the repaired JSON interface. It uses the same model, the same task order, the same prompt conditions, and fresh outputs under a new root.

Unlike Stage 5 and Stage 6, this replication does not need a separate repair pass. The current `json_edits_to_patch.py` already includes the repaired parsing and schema-normalization logic.

## Replication Summary

| Condition | Tasks | Patch applied rate | Verified solve rate | Conditional solve rate | False completion rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agent A | 10 | 0.3 | 0.3 | 1.0 | 0.0 |
| Agent B | 10 | 0.7 | 0.7 | 1.0 | 0.0 |
| Agent C | 10 | 0.3 | 0.3 | 1.0 | 0.0 |

## Interpretation

- The replication confirms that the repaired JSON interface can sustain a clean run without falling back to raw diff mode.
- The ranking is not stable relative to the canonical combined view: Agent B is strongest in this replication, while Agent A and Agent C both land at `3/10` verified solves.
- That ranking shift implies backend or model variance still matters, even after interface failure mass is reduced.
- At the same time, the interface result remains robust: every applied patch in this replication solved the task, and false completion fell to `0.0` for all three conditions.

Replication status notes:

- No `invalid_schema` or `rejected` statuses were observed in the replication status roots.
- Agent A had one `no_effective_changes` case.
- Agent C had one `no_edits` case.

## Key Artifacts

- `agent_a_summary.csv`
- `agent_a_summary.summary.json`
- `agent_b_summary.csv`
- `agent_b_summary.summary.json`
- `agent_c_summary.csv`
- `agent_c_summary.summary.json`
- `replication_manifest.json`

Per-condition results:

- `agent_a/`
- `agent_b/`
- `agent_c/`
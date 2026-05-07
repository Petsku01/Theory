# Stage 2C Plan

Status at launch:
- Stage 2A: Author 20 new challenge tasks — PASSED
- Stage 2B: Validate gold/empty controls — PASSED
- Stage 2C: 240-run model expansion — STARTED

Replication order:
- rep_01: A -> B -> C -> D
- rep_02: D -> C -> B -> A

Inventory freeze:
- task inventory snapshot: C:\Users\Pette\Downloads\vet_pilot_experiment_package\vet_pilot\results\vet_scaling_stage2\task_inventory.csv
- total tasks frozen: 30
- tasks selected for this run: 30

All runs use:
- model: qwen3-coder:480b-cloud
- backend: ollama-cli
- repaired JSON schema output
- deterministic JSON-to-patch conversion
- evaluate_task.py
- aggregate stage summaries

Category coverage in frozen inventory:
- dependency/config behavior: 2
- edge cases: 4
- hidden edge cases: 4
- minimal patch: 1
- misleading obvious fixes: 4
- multi-file bugs: 4
- public API preservation: 3
- regression traps: 3
- state mutation bugs: 4
- type or format: 1

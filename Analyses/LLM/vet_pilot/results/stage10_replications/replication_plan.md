# Stage 10 Replication Plan

- rep_01: A -> B -> C
- rep_02: B -> C -> A
- rep_03: C -> A -> B
- rep_04: A -> C -> B
- rep_05: B -> A -> C

All runs use:
- same 10 challenge tasks
- model: gpt-oss:20b-cloud
- backend: ollama-cli
- same JSON prompts
- same repaired JSON converter
- same evaluator

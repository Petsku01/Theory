# VET Pilot: Verified Experience Trajectories for Software Agents

This package is a pilot infrastructure kit for testing the **Verified Experience Hypothesis**:

> Agents trained or prompted with full state-action-observation-verification trajectories should outperform agents trained or prompted only with instructions or final outputs on long-horizon software tasks.

The kit is designed for a small first experiment before running larger SWE-bench, SWE-bench-Live, or repository-level evaluations.

## What this package contains

- `schemas/vet.schema.json` - JSON schema for a Verified Experience Trajectory (VET).
- `data/example_vets.jsonl` - example trajectory records.
- `prompts/` - three condition prompts:
  - Agent A: instruction-only
  - Agent B: instruction + final-patch examples
  - Agent C: instruction + full VET examples
- `harness/` - scripts for creating toy software tasks, running/evaluating patches, recording trajectories, and aggregating metrics.
- `docs/experimental_protocol.md` - the pre-registered pilot protocol.
- `docs/trajectory_annotation_guide.md` - how to label actions, observations, verifiers, failures, and memory updates.
- `docs/paper_results_insert.md` - paper-ready template for adding pilot results.

## Suggested pilot design

Run three agents on the same tasks with the same model, tools, and inference budget:

| Condition | Training/prompting signal | Purpose |
|---|---|---|
| Agent A | Instructions only | baseline |
| Agent B | Instructions + final patch examples | tests whether final outputs suffice |
| Agent C | Instructions + full VET examples | tests whether process/verification data helps |

Primary metrics:

- Verified solve rate
- False completion rate
- Recovery rate
- Regression rate
- Action count
- Failed action count
- Tool/test-use efficiency

## Quick start with toy tasks

```bash
cd /mnt/data/vet_pilot
python harness/create_toy_tasks.py --out tasks/toy
python harness/evaluate_task.py --task tasks/toy/task_001 --candidate tasks/toy/task_001/gold.patch --out results/smoke/task_001_gold_eval.json
python harness/aggregate_results.py --inputs results/smoke/*.json --out results/smoke/summary.csv
```

The toy tasks are not a real benchmark; they are a smoke test for the harness. For a credible paper, replace toy tasks with fresh real tasks from SWE-bench-Live, SWE-rebench, Monthly-SWEBench, or newly collected repository issues.

## Running with an LLM agent

This kit includes `harness/run_agent_loop.py`, a minimal bash-tool agent loop that can be wired to an OpenAI-compatible chat-completions endpoint. It is intentionally simple so that model behavior, not harness complexity, is the experimental variable.

```bash
export OPENAI_API_KEY=...
python harness/run_agent_loop.py \
  --task tasks/toy/task_001 \
  --prompt prompts/agent_c_vet.md \
  --model gpt-5.5-thinking \
  --max-steps 20 \
  --out results/task_001_agent_c_run.json
```

The script is provided as a research scaffold. You may need to adapt the model endpoint, model name, and API format to your provider.

## How to make this a 9/10 empirical paper

1. Run the three-condition comparison on at least 30 tasks.
2. Use hidden tests where possible.
3. Include failed attempts and corrections in Agent C's trajectory examples.
4. Run ablations: remove failed attempts, remove verifier outputs, remove memory updates.
5. Include an anti-gaming stress test.
6. Report both positive and negative results.

## Current status

This package creates the protocol, schema, scoring harness, prompts, and toy smoke tests. It does **not** include completed model benchmark results. Those require model/API execution or uploaded run logs.

For a local Ollama-backed sweep on Windows PowerShell, first pull a model into the local Ollama service, then use a dummy API key and that exact model name:

```powershell
Set-Location "C:\Users\Pette\Downloads\vet_pilot_experiment_package\vet_pilot"

ollama pull qwen2.5:3b

$env:OPENAI_API_KEY = "ollama"
$env:OPENAI_BASE_URL = "http://localhost:11434/v1"

& "C:\Users\Pette\Downloads\vet_pilot_experiment_package\.venv\Scripts\python.exe" harness/run_condition_sweep.py `
  --tasks-root tasks/toy `
  --model "qwen2.5:3b" `
  --shell powershell 2>&1 | Tee-Object results/agents/sweep_console.log

$code = $LASTEXITCODE
if (Test-Path Env:OPENAI_API_KEY) { Remove-Item Env:OPENAI_API_KEY }
if (Test-Path Env:OPENAI_BASE_URL) { Remove-Item Env:OPENAI_BASE_URL }
$code
```

If `http://localhost:11434/api/tags` returns `{"models": []}` even though `ollama run <model>` works, start a user-owned server and point the harness at that port instead:

```powershell
$env:OLLAMA_HOST = "127.0.0.1:11435"
ollama serve
```

Then rerun the sweep with `OPENAI_BASE_URL` set to `http://127.0.0.1:11435/v1` and a model name returned by `http://127.0.0.1:11435/api/tags`.

For Ollama cloud models, use the CLI transport instead of `OPENAI_BASE_URL`. On this Windows setup, `ollama run <cloud-model>` works while the local HTTP APIs return `model not found` for `*-cloud` tags.

```powershell
Set-Location "C:\Users\Pette\Downloads\vet_pilot_experiment_package\vet_pilot"

& "C:\Users\Pette\Downloads\vet_pilot_experiment_package\.venv\Scripts\python.exe" harness/run_condition_sweep.py `
  --tasks-root tasks/toy `
  --model "qwen3-coder:480b-cloud" `
  --model-transport ollama-cli `
  --shell powershell 2>&1 | Tee-Object results/agents/sweep_console.log
```

This path uses your logged-in Ollama CLI session and does not require `OPENAI_API_KEY` or `OPENAI_BASE_URL`.


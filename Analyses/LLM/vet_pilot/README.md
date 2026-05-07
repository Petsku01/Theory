# VET Pilot: Verified Experience Trajectories for Software Agents

This repository is a research package for testing the Verified Experience Hypothesis on software-repair tasks:

> Agents conditioned on richer verified trajectories should be more reliable than agents conditioned only on instructions or final successful outputs.

It now contains both the original harness and completed pilot artifacts: toy smoke checks, challenge-task interface studies, and the four-condition vet-scaling pilot used for the paper draft "Do Verified Trajectories Improve Software-Agent Reliability?"

## Repository status

The repo is no longer just a scaffold. It contains frozen experimental outputs.

- Challenge interface study: completed and summarized under `results/challenge/`.
- Stage 1 vet-scaling pilot: 10 tasks x 4 conditions x 2 replications = 80 runs, frozen under `results/vet_scaling_pilot/`.
- Stage 2 vet-scaling expansion: 30 tasks x 4 conditions x 2 replications = 240 runs, corrected and frozen under `results/vet_scaling_stage2/`.
- Important: only the corrected Stage 2 rerun should be cited. The first 240-run expansion was discarded after evaluation-state leakage was found and repaired in `harness/evaluate_task.py`.

## Prompt conditions

There are two prompt families in the repo.

### Challenge JSON-interface prompts

These are the prompts used in the repaired-JSON challenge experiments.

| Condition | Prompt file | Role |
| --- | --- | --- |
| Agent A | `prompts/agent_a_instruction_only_json.md` | instruction-only baseline |
| Agent B | `prompts/agent_b_final_patch_json.md` | adds final successful patch examples |
| Agent C | `prompts/agent_c_vet_json.md` | adds distilled verified-trajectory lessons |

### Vet-scaling pilot prompts

These are the prompts used in Paper 2 Stage 1 and Stage 2.

| Condition | Prompt file | Role |
| --- | --- | --- |
| Agent A | `prompts/vet_scaling_pilot/agent_a_instruction_only.md` | instruction-only baseline |
| Agent B | `prompts/vet_scaling_pilot/agent_b_final_patch.md` | adds final patch exemplars only |
| Agent C | `prompts/vet_scaling_pilot/agent_c_verified_lessons.md` | adds distilled verification lessons without full trajectories |
| Agent D | `prompts/vet_scaling_pilot/agent_d_full_verified_trajectory.md` | adds full verified trajectory examples |

The Stage 2 corrected headline is a modest D-over-B reliability advantage, not a strong causal proof of recovery.

- Verified solve rate: Agent D 0.92 vs Agent B 0.85
- Patch applied rate: Agent D 1.00 vs Agent B 0.95
- False completion rate: Agent D 0.08 vs Agent B 0.10
- Task-level totals: D wins 4, B wins 1, tie 24, neither 1

Recovery claims remain conservative because Stage 2 recovery coding currently covers 22/240 rows.

## Task-level breakdown

The repo contains three task layers.

| Task set | Path | Scope | Purpose |
| --- | --- | --- | --- |
| Toy smoke tasks | `tasks/toy/` | 3 tiny tasks | sanity-check task creation, patch application, and aggregation |
| Challenge tasks | `tasks/challenge/challenge_001` to `tasks/challenge/challenge_030` | 30 software-repair tasks | main task bank used for challenge and vet-scaling experiments |
| Stage 1 vet-scaling slice | first 10 challenge tasks | 10 tasks | frozen 80-run pilot |

Paper-facing breakdown:

- Stage 0 tiny check: 12 runs
- Stage 1 vet-scaling pilot: 10 tasks x 4 conditions x 2 reps
- Stage 2A authoring: challenge_011 to challenge_030
- Stage 2B controls: gold patch should solve, empty patch should fail
- Stage 2C corrected expansion: 30 tasks x 4 conditions x 2 reps
- Stage 2D recovery annotation: partial subset coded for the current draft

## Artifact manifest

This table points to the main paper-facing artifacts.

| Artifact group | Path | What it contains |
| --- | --- | --- |
| Protocol and annotation docs | `docs/` | experiment framing, annotation guide, and paper insert text |
| VET schema and examples | `schemas/vet.schema.json`, `data/example_vets.jsonl` | trajectory format and example records |
| Harness | `harness/` | task generation, agent execution, evaluation, reruns, and aggregation scripts |
| Prompt roots | `prompts/`, `prompts/vet_scaling_pilot/` | challenge JSON prompts and four-condition scaling prompts |
| Candidate outputs | `candidates/` | raw model outputs, JSON outputs, repaired outputs, and scaling candidates |
| Challenge master report | `results/challenge/README.md` | combined interpretation of the challenge-stage experiments |
| Stage 1 freeze | `results/vet_scaling_pilot/stage1_freeze.md` | canonical freeze note for the 80-run pilot |
| Stage 1 summaries | `results/vet_scaling_pilot/headline_b_vs_d.csv`, `results/vet_scaling_pilot/summary_by_condition.csv`, `results/vet_scaling_pilot/summary_by_task.csv`, `results/vet_scaling_pilot/task_level_b_vs_d.csv` | frozen pilot metrics |
| Stage 2 freeze | `results/vet_scaling_stage2/stage2_freeze.md` and `results/vet_scaling_stage2/README.md` | corrected 30-task expansion status and interpretation |
| Stage 2 summaries | `results/vet_scaling_stage2/headline_b_vs_d.csv`, `results/vet_scaling_stage2/summary_by_condition.csv`, `results/vet_scaling_stage2/summary_by_task.csv`, `results/vet_scaling_stage2/task_level_b_vs_d.csv`, `results/vet_scaling_stage2/stage2_summary.md` | corrected Stage 2 metrics |
| Recovery coding | `results/vet_scaling_stage2/recovery_annotations.csv`, `results/vet_scaling_stage2/recovery_summary.md` | partial recovery annotations and current lower-bound interpretation |
| Stage 2 controls | `results/vet_scaling_stage2/control_summary.csv`, `results/vet_scaling_stage2/controls/` | gold and empty patch validation outputs |
| Paper 2 status note | `results/vet_scaling_pilot/paper2_status.md` | cross-stage status note linking the frozen pilot and corrected Stage 2 follow-up |

## Quick start

### 1. Install requirements

```powershell
Set-Location "C:\Users\Pette\Downloads\vet_pilot_experiment_package\vet_pilot"
& "..\.venv\Scripts\python.exe" -m pip install -r requirements.txt
```

### 2. Run the toy smoke check

```powershell
Set-Location "C:\Users\Pette\Downloads\vet_pilot_experiment_package\vet_pilot"

& "..\.venv\Scripts\python.exe" harness\create_toy_tasks.py --out tasks\toy
& "..\.venv\Scripts\python.exe" harness\evaluate_task.py --task tasks\toy\task_001 --candidate tasks\toy\task_001\gold.patch --out results\smoke\task_001_gold_eval.json
& "..\.venv\Scripts\python.exe" harness\aggregate_results.py --inputs results\smoke\*.json --out results\smoke\summary.csv
```

The toy tasks are only a harness smoke test. The paper-facing results live under `results/challenge/`, `results/vet_scaling_pilot/`, and `results/vet_scaling_stage2/`.

## Running the agent loop

`harness/run_agent_loop.py` is the minimal research driver for interactive software-repair runs. It is intentionally simple so that prompt condition and model behavior remain the variable under study.

Example:

```powershell
Set-Location "C:\Users\Pette\Downloads\vet_pilot_experiment_package\vet_pilot"

$env:OPENAI_API_KEY = "ollama"
$env:OPENAI_BASE_URL = "http://localhost:11434/v1"

& "..\.venv\Scripts\python.exe" harness\run_agent_loop.py `
  --task tasks\toy\task_001 `
  --prompt prompts\vet_scaling_pilot\agent_d_full_verified_trajectory.md `
  --model "qwen2.5:3b" `
  --max-steps 20 `
  --out results\smoke\task_001_agent_d_run.json
```

For Ollama cloud models on this Windows setup, use the CLI transport rather than the local HTTP API:

```powershell
Set-Location "C:\Users\Pette\Downloads\vet_pilot_experiment_package\vet_pilot"

& "..\.venv\Scripts\python.exe" harness\run_condition_sweep.py `
  --tasks-root tasks\toy `
  --model "qwen3-coder:480b-cloud" `
  --model-transport ollama-cli `
  --shell powershell 2>&1 | Tee-Object results\agents_cloud\sweep_console.log
```

## Suggested citation posture

If you use this repo for a paper or workshop submission, the safest primary references are:

- `results/challenge/README.md` for the interface story
- `results/vet_scaling_pilot/stage1_freeze.md` for the 80-run pilot
- `results/vet_scaling_stage2/stage2_freeze.md` and `results/vet_scaling_stage2/README.md` for the corrected Stage 2 expansion

Do not cite the discarded pre-fix Stage 2 expansion.


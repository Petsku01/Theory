.PHONY: toy eval-gold summarize summarize-all smoke

SMOKE_RESULTS := results/smoke

toy:
	python harness/create_toy_tasks.py --out tasks/toy

eval-gold: toy
	python harness/evaluate_task.py --task tasks/toy/task_001 --candidate tasks/toy/task_001/gold.patch --out $(SMOKE_RESULTS)/task_001_gold_eval.json

summarize:
	python harness/aggregate_results.py --inputs $(SMOKE_RESULTS)/*.json --out $(SMOKE_RESULTS)/summary.csv

summarize-all:
	python harness/aggregate_results.py --inputs results/*.json --out results/summary.csv

smoke: eval-gold summarize

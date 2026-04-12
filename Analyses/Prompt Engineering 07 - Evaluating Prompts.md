# Evaluating Prompts

## Overview
The hardest part of prompt engineering isn't writing prompts — it's knowing whether your new prompt is better than your old one. Without evaluation, "prompt engineering" degenerates into vibes-based iteration: you change something, try it on the one example you happen to remember, decide it feels better, and ship it. This is how production systems acquire mysterious regressions.

This article covers how to build an evaluation loop that actually catches failures before your users do. It's the least glamorous topic in this series and the one that most separates hobbyist prompting from engineering.

## Why vibes-based iteration fails
Three reasons your intuition is unreliable:

1. **LLMs are stochastic.** A prompt that produces the right answer once may fail 30% of the time. Testing once tells you nothing.
2. **Changes fix some cases and break others.** Adding "be concise" might improve short-answer tasks and destroy long-form ones. Without a representative test set, you can't see the trade-off.
3. **Your memory is biased.** You remember the examples you just looked at and forget the ones from last week. Any intuition built this way is overfit to yesterday's debugging session.

The fix is the same as for any software: build a test set, run it automatically, and compare scores.

## The minimum viable eval
You don't need a framework to start. You need:

- **A labeled dataset.** 50–500 representative inputs with known-good outputs (or known-good properties).
- **A scoring function.** Automated where possible, manual where not.
- **A way to run prompts over the dataset and record scores.**

That's it. A Python script with a list of dicts and a loop is enough to put you ahead of 90% of teams.

```python
eval_set = [
    {"input": "...", "expected": "...", "category": "refunds"},
    {"input": "...", "expected": "...", "category": "shipping"},
    # ...
]

def score(prompt_output, expected):
    return prompt_output.strip().lower() == expected.strip().lower()

def evaluate(prompt_template):
    results = []
    for example in eval_set:
        output = call_llm(prompt_template.format(**example))
        results.append(score(output, example["expected"]))
    return sum(results) / len(results)
```

Run this against your current prompt and your candidate prompt. Ship the candidate only if it scores higher. Simple, crude, and vastly better than guessing.

## Building the labeled dataset
The dataset is the most valuable asset in your evaluation stack and the hardest to build well. Four sources:

1. **Real user queries.** The best source. Pull a stratified sample from your production logs, scrubbing PII. Label the correct answer yourself or with a domain expert.
2. **Synthetic queries from a stronger model.** Use a larger model to generate test inputs covering edge cases ("generate 20 questions a user might ask that could be ambiguously interpreted"). Hand-label the outputs. Cheap but risks synthetic distribution drift.
3. **Known failure cases.** Every time you see the system break in production, add the failing input to the eval set with the correct answer. Your eval set grows with your bug reports.
4. **Standard benchmarks.** Useful for sanity checks and baselines but rarely measure what your specific application cares about.

Aim for **coverage over size**. 100 well-chosen examples that span your task's edge cases beat 10,000 near-duplicates. Stratify by category, difficulty, and user intent.

## Scoring methods
The scoring function depends on what the task produces.

### Exact match
Works for classification, yes/no answers, and structured extraction with deterministic targets:

```python
score = (output == expected)
```

Fast, cheap, unambiguous. Limited to tasks with unambiguous correct answers.

### Regex / substring match
For answers where you want to check for key phrases:

```python
score = bool(re.search(r"\b12 months\b", output))
```

Catches variations in surrounding text but is brittle to paraphrasing.

### Field-level comparison for structured output
When the model returns JSON, compare field by field:

```python
def score(output_json, expected_json):
    fields = ["invoice_number", "total_usd"]
    return sum(output_json.get(f) == expected_json.get(f) for f in fields) / len(fields)
```

This gives you partial credit for mostly-right extractions, which is often more informative than a binary pass/fail.

### Numeric tolerance
For numeric answers where exact equality is too strict:

```python
score = abs(float(output) - float(expected)) < 0.01
```

### LLM-as-judge
For open-ended outputs (writing, explanations, code), have a separate LLM score the answer against criteria:

```
You are grading a model's answer to a question. Compare the answer
to the reference and rate it on a scale of 1-5:
- 5: Factually correct, addresses all parts of the question, well-written
- 4: Factually correct, minor omissions
- 3: Mostly correct but missing important information
- 2: Contains errors or misses the point
- 1: Incorrect or off-topic

Question: {question}
Reference answer: {reference}
Model's answer: {output}

Respond with only a single digit 1-5.
```

LLM-as-judge is powerful but carries real caveats (see below).

### Programmatic checks
For code generation, run the code and check if it passes tests. For SQL, execute the query against a test database and compare results. For JSON extraction, parse and validate against a schema. Whenever the task has an objective check, use it — it's more reliable than any LLM grader.

## The LLM-as-judge trap
LLM-as-judge is seductive because it scales. But it has documented biases:

1. **Position bias.** When judging A vs B, models favor the first option. Counter by running both orderings and averaging.
2. **Length bias.** Longer answers get higher scores, even when shorter ones are better. Counter by explicitly instructing the judge to penalize verbosity.
3. **Self-preference.** A model grading its own outputs tends to prefer them over outputs from other models. Counter by using a different model family as the judge.
4. **Agreement with confidence.** Judges score confidently-worded wrong answers higher than hedged right answers. Counter by including an explicit "is the answer actually correct" criterion separate from presentation quality.
5. **Judge drift.** The same judge model scoring the same examples weeks apart will sometimes give different scores. Pin model versions.

Validate your judge at least once against human labels: score a subset of examples with both the judge and a human, and compute correlation. If the judge disagrees with humans more than 20% of the time on a binary task, it's not a trustworthy judge for that task.

## Regression testing
The discipline:

1. Have a "current" prompt and its eval score.
2. When you change the prompt, run the eval before committing.
3. Commit only if the new score is equal or higher.
4. If the new score is lower on some subset but higher overall, investigate the regression before deciding.

A reasonable CI pipeline for a prompt-driven feature:

- On every PR that touches a prompt file, run the eval set.
- Fail the build if any score drops more than some threshold.
- Post the before/after scores as a PR comment.

The threshold tolerates stochastic noise (you expect ±1-2% variance run-to-run) but catches real regressions.

## Production monitoring
Offline evaluation catches what you already know to test. Production monitoring catches what you didn't. Track:

- **Input distribution drift.** If users start asking questions your eval set doesn't cover, your eval scores become misleading. Monitor the categories and update the set.
- **Output quality signals.** Thumbs up/down, conversation abandonment rate, retry rate, escalation to humans. These are noisy but catch what offline eval misses.
- **Cost and latency per request.** A prompt change that improves accuracy at 3× cost may not be worth shipping.
- **Tool-call failure rates.** For agentic systems, the agent layer fails silently more often than the language layer.

## LLM evaluation frameworks
A few tools worth knowing (as of 2026):

- **Promptfoo**: lightweight, YAML-driven, runs prompts against cases and compares. Good starting point for most teams.
- **DeepEval**: Python-first, ~14+ built-in metrics for RAG and fine-tuning. Integrates with pytest.
- **lm-evaluation-harness** (EleutherAI): the backend for Hugging Face's Open LLM Leaderboard. Best for benchmarking model changes, less tailored to application-specific eval.
- **Braintrust**, **Langfuse**, **Phoenix**, **Arize**: observability + eval platforms. Good when you want production tracing and offline eval unified.
- **Vellum**, **PromptLayer**, **Helicone**: commercial options with UI-driven workflows.

Don't start here. Start with a Python script and a JSON file. Move to a framework when the script becomes painful — you need team collaboration, prompt versioning, or UI-based review. Most teams reach for tooling too early and end up fighting the framework instead of improving the prompt.

## Pitfalls

1. **Testing on the training set.** If you tune your prompt against examples in your eval set, you will overfit to them and the eval stops measuring generalization. Hold out a validation set you never look at until you're ready to commit a change.
2. **Ignoring variance.** A single run isn't a score; it's a sample. Run each example at least 3 times and report mean + std.
3. **Chasing aggregate metrics.** "Score went from 82% to 85%" is meaningless if the 3% gain came from easy examples and the hard ones regressed. Slice the score by category, difficulty, and input length.
4. **Gaming the judge.** If you eval with an LLM judge and iterate aggressively against it, you'll learn to produce outputs the judge likes, not outputs that are correct. Validate against human labels periodically.
5. **Treating eval as a one-time project.** The eval set needs to grow with your product. Budget time for maintenance.
6. **Forgetting cost and latency.** A prompt that scores 3 points higher but takes 2× tokens may be a net loss. Report cost and latency as first-class metrics alongside accuracy.

## What "good enough" looks like
You know your eval loop is working when:

- You can answer "is prompt A better than prompt B?" in minutes, with data, not opinions.
- Your CI catches regressions before they reach production.
- Failure cases from production automatically become eval cases.
- You can slice scores by category and see which part of your system is actually failing.
- You trust the eval enough to ship prompt changes without manual spot-checks.

You don't need a fancy framework for any of this. You need discipline: keep the dataset, run the scores, commit only when the numbers go up, and don't trust your gut.

## Summary
Evaluation is the least exciting and most important part of prompt engineering. Without it, you're guessing. With even a minimal evaluation loop — a labeled dataset, a scoring function, a comparison harness — you convert prompt engineering from a craft into something closer to measurable engineering. Start small, grow the dataset with real failures, be honest about noise and bias, and prefer simple scoring methods over clever ones. The team that evals regularly beats the team with cleverer prompts almost every time.

Sources:
- [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [EleutherAI lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness)
- [DeepEval — The LLM Evaluation Framework](https://github.com/confident-ai/deepeval)
- [Future AGI — LLM Evaluation Frameworks (2026)](https://futureagi.substack.com/p/llm-evaluation-frameworks-metrics)

-pk

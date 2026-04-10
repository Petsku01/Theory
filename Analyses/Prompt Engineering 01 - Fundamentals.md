# Prompt Engineering Fundamentals

## Overview
Prompt engineering is the practice of writing inputs to large language models (LLMs) that reliably produce useful outputs. It is part technical writing, part empirical testing, and part intuition about how models process text. This article covers the core principles that apply regardless of which model you are targeting (GPT, Claude, Gemini, open-source, etc.).

## The core mental model
LLMs are autoregressive next-token predictors trained on large text corpora and then aligned via instruction tuning and RLHF. Two practical consequences follow:

1. **The model completes patterns.** If your prompt looks like a product description, it will continue a product description. If it looks like a Stack Overflow question, you will get a Stack Overflow answer. Frame your prompt to match the distribution of outputs you want.
2. **The model has no memory outside the context window.** Everything the model "knows" about your task is either baked into its weights or present in the prompt. If you don't state a requirement, assume it won't be met.

## The four levers

### 1. Clarity
Ambiguous prompts produce ambiguous outputs. Concretely:

| Vague | Specific |
|-------|----------|
| "Summarize this article." | "Summarize this article in 3 bullet points aimed at a non-technical reader." |
| "Fix the bug." | "The `parse_date` function returns `None` for ISO-8601 strings with timezone suffixes. Identify the cause and return a patch." |
| "Make it better." | "Rewrite this paragraph to be ~30% shorter without removing any numerical claims." |

A good test: could two competent humans read your prompt and produce meaningfully different outputs? If yes, tighten it.

### 2. Context
Tell the model what it needs to know that it cannot infer. Relevant context includes:

- **Who the output is for** ("explain to a senior backend engineer" vs. "explain to a high school student")
- **What has already been tried or ruled out** ("I've already checked the firewall config; the issue isn't there")
- **The surrounding system** ("this function is called from a hot loop — performance matters more than readability")
- **Domain conventions** ("we follow Google's Python style guide")

Context is not free — long prompts cost tokens and can dilute attention — but missing context is the single most common cause of off-target outputs.

### 3. Constraints
Tell the model what *not* to do, or what shape the answer must take:

- Length: "Under 200 words", "exactly 5 bullet points"
- Format: "Return valid JSON matching this schema", "markdown table with 3 columns"
- Style: "No hedging language", "no emojis", "no bullet points"
- Scope: "Do not suggest refactors unrelated to the bug"

Negative constraints ("do not…") work but are less reliable than positive reformulations ("respond with only the corrected line"). When possible, describe the desired output rather than forbidding undesired ones.

### 4. Examples (few-shot prompting)
One or two concrete examples of input → output pairs often beat paragraphs of instruction. This is called **few-shot prompting**, and it works because examples pattern-match more precisely than natural-language descriptions.

```
Classify the sentiment of each review as positive, negative, or mixed.

Review: "Battery life is great but the screen flickers."
Sentiment: mixed

Review: "Best purchase I've made this year."
Sentiment: positive

Review: "Arrived broken, seller unresponsive."
Sentiment:
```

Use few-shot when:
- The task has a specific output format you want matched exactly
- Natural-language instructions are ambiguous (e.g., edge cases in classification)
- You want the model to mimic a particular tone or structure

Skip few-shot when:
- The task is genuinely straightforward and zero-shot works
- Your examples would bias the model toward a subset of valid answers
- Token budget is tight

## Roles and personas
Instructions like "You are a senior security engineer" can shift outputs meaningfully, but the effect is often overstated. A persona is useful when:

- It communicates an expertise level or register ("explain like I'm an SRE")
- It narrows the set of plausible framings ("respond as a skeptical code reviewer")

A persona is *not* a substitute for clear instructions. "You are a world-class expert" does not unlock hidden knowledge — the model still only knows what it was trained on. Use personas to steer *how* the model responds, not to conjure capabilities it lacks.

## Zero-shot vs. few-shot vs. fine-tuning

| Approach | When to use | Trade-offs |
|----------|-------------|------------|
| **Zero-shot** | Simple, common tasks; exploration | Cheap and fast; less reliable on edge cases |
| **Few-shot** | Format-sensitive or nuanced tasks | More tokens; can bias output toward examples |
| **Chain-of-thought** | Multi-step reasoning | Slower; more tokens; usually higher accuracy |
| **Fine-tuning** | Repeated high-volume tasks with stable requirements | Upfront cost; data preparation; requires evaluation infrastructure |

Most production applications live in the few-shot or structured-prompt tier. Fine-tuning is worth the cost only when you have measurable accuracy gains on a task you'll run millions of times, and you've exhausted what good prompting can do.

## A practical template
When in doubt, a reliable structure is:

```
[Role / context — 1-2 sentences about who the model is and the situation]

[Task — one imperative sentence describing what to do]

[Inputs — the data, clearly delimited]

[Constraints — format, length, style, what to avoid]

[Examples — zero to three input/output pairs if needed]
```

This is not dogma — shorter prompts work for simpler tasks — but it's a good default when you're debugging a prompt that isn't behaving.

## Common pitfalls

1. **Burying the instruction.** Putting the task description at the end of a 2,000-token prompt risks the model losing track of it. Put the core instruction near the top, and optionally restate it at the bottom.
2. **Contradictions.** "Be concise but include all relevant details" gives the model no clear optimization target. Pick one.
3. **Compound tasks.** A single prompt asking the model to (a) extract facts, (b) rank them, (c) summarize, and (d) translate will underperform four focused prompts. Decompose when accuracy matters.
4. **Over-constraining format.** If you demand JSON but describe the schema ambiguously, you'll get parseable JSON with the wrong fields. Provide a schema or an example.
5. **Testing once.** LLM outputs are stochastic. A prompt that works once may fail 20% of the time. Evaluate on multiple inputs before declaring it "done."

## Evaluation
A prompt is a piece of software. Like other software, it needs tests. Even an informal evaluation set of 10–20 representative inputs, scored by hand, catches most regressions when you iterate. For production use cases, invest in a proper evaluation harness: labeled examples, automated scoring where possible, and a way to compare prompt variants side-by-side.

## Summary
Prompt engineering is less about clever tricks and more about writing precise, well-structured specifications. Clarity, context, constraints, and examples cover ~80% of the craft. Reach for advanced techniques (chain-of-thought, decomposition, structured output, retrieval) only when the fundamentals stop being enough.

-pk

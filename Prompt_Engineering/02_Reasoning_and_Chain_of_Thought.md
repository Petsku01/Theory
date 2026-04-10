# Reasoning and Chain-of-Thought Prompting

## Overview
Large language models are surprisingly bad at tasks that require several steps of reasoning when asked to answer directly, and surprisingly good at the same tasks when asked to think out loud first. This counterintuitive fact is the basis of chain-of-thought (CoT) prompting and its variants. This article covers what CoT actually is, when it helps, when it hurts, and the more advanced techniques built on top of it.

## Why "just answer" fails on hard problems
If you ask a model "A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much does the ball cost?" and demand an immediate numeric answer, a non-reasoning model will often say $0.10 — the intuitive wrong answer. If you instead ask it to show its work, the same model will usually reach $0.05.

The mechanism: producing the answer token requires the model to have already "computed" the answer by the time it emits that token. For multi-step problems, there aren't enough forward-pass computations available in a single token prediction. Intermediate reasoning tokens give the model more compute budget and more places to write down partial results.

This matters for:
- Arithmetic and word problems
- Multi-hop questions ("What is the capital of the country that won the 1998 World Cup?")
- Code debugging with multiple interacting components
- Legal or policy analysis that requires applying rules to facts
- Any task where "the answer" is the result of a chain of dependencies

It does *not* matter much for:
- Single-fact recall
- Simple classification
- Straightforward summarization
- Creative writing without internal constraints

## Zero-shot CoT
The simplest form: append "Let's think step by step." to the prompt. That single phrase, documented by Kojima et al. (2022), substantially improves accuracy on many reasoning benchmarks without any examples.

```
Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can
has 3 tennis balls. How many tennis balls does he have now?

A: Let's think step by step.
```

The model will typically produce something like: "Roger starts with 5 balls. 2 cans × 3 balls = 6 new balls. 5 + 6 = 11. The answer is 11."

Variants that sometimes work better than "let's think step by step" depending on the model and task:

- "Let's work this out carefully."
- "Take a deep breath and work on this problem step by step."
- "Break the problem into smaller parts and solve each one."

The specific wording matters less than the instruction to produce intermediate reasoning before the final answer.

## Few-shot CoT
More reliable than zero-shot: show the model 2–4 worked examples where the reasoning is explicit, then pose your question.

```
Q: The cafeteria had 23 apples. They used 20 for lunch and bought 6 more.
How many apples do they have?

A: The cafeteria started with 23 apples. After using 20, they had
23 − 20 = 3 apples. Then they bought 6 more, so 3 + 6 = 9 apples.
The answer is 9.

Q: Olivia has $23. She bought five bagels for $3 each. How much money
does she have left?

A:
```

Few-shot CoT is more consistent than zero-shot because the examples anchor both the reasoning *style* and the *format* of the final answer.

## Self-consistency
Reasoning traces are stochastic — sample the same problem twice, get two different traces, sometimes different answers. **Self-consistency** exploits this: sample N independent reasoning traces at non-zero temperature, then take the majority vote on the final answer.

```
For each of 5 independent attempts, solve the problem below. Then I will
take the most common final answer as correct.
```

In practice you call the model N times and post-process the answers. This substantially improves accuracy on math and logic benchmarks at the cost of N× latency and N× tokens. Use it when correctness matters more than cost — e.g., agentic systems that are about to take an irreversible action.

## Decomposition
For genuinely multi-step tasks, don't try to do everything in one prompt. Split the problem and chain prompts together:

1. **Plan** — ask the model to enumerate the sub-tasks
2. **Execute** — run each sub-task as its own prompt
3. **Integrate** — ask the model to combine the sub-task outputs

```
Step 1 prompt: "List the sub-questions you need to answer to determine
whether this lease agreement is enforceable under California law."

Step 2 prompt: "Answer sub-question 1: [...]"
Step 2 prompt: "Answer sub-question 2: [...]"
...

Step 3 prompt: "Given these sub-answers, what is the overall conclusion?"
```

Decomposition has three advantages:
- Each prompt is smaller and more focused, which reduces reasoning errors
- You can cache, parallelize, or retry individual steps
- Failures become debuggable — you can see which step went wrong

The cost: orchestration complexity, more tokens, more latency. Decompose when the task is too hard to reliably do in one shot, not before.

## ReAct and tool use
**ReAct** (Reason + Act) interleaves reasoning with external tool calls. The model thinks, decides it needs information it doesn't have, calls a tool (search, calculator, database, API), reads the result, and continues thinking.

```
Thought: I need to know the current price of TSLA.
Action: get_stock_price("TSLA")
Observation: 247.83
Thought: The question asked for a 10% drop threshold. 247.83 × 0.9 = 223.05.
Answer: The alert should trigger below $223.05.
```

This pattern is now the basis of most production agent systems. The key prompting insight: the model needs a clear format for "I'm thinking" vs. "I'm calling a tool" vs. "I'm producing a final answer," and the examples you give it in the prompt define that format.

## Scratchpads
Even when you don't need tools, giving the model a dedicated "scratchpad" area can improve accuracy on tasks with a lot of moving parts:

```
Use the <scratchpad> tags to work out your reasoning. The content inside
<scratchpad> will be hidden from the user. Then give your final answer
inside <answer> tags.
```

The model fills the scratchpad with whatever intermediate computation it needs, and you parse out the `<answer>` block programmatically. This combines the accuracy benefit of CoT with clean final outputs.

## When chain-of-thought hurts
CoT is not free and not always helpful:

1. **Latency and cost.** A 500-token reasoning trace is 500 tokens you're paying for and waiting on. For simple tasks, skip it.
2. **Confabulation.** On tasks where the model doesn't actually know the answer, CoT can produce elaborate wrong reasoning that *sounds* convincing. A confident wrong CoT is harder to spot than a confident wrong one-liner.
3. **Format violations.** If you need structured output (JSON, a specific field), asking the model to "think step by step first" sometimes leaks reasoning into the structured field. Use explicit scratchpad tags.
4. **Reasoning models already do this.** Modern reasoning-specialized models (o1, Claude with extended thinking, Gemini with deep thinking) do internal reasoning automatically. Adding "think step by step" on top is redundant and can even be counterproductive.

## Practical guidelines

- Try zero-shot first. If the model gets it right without CoT, don't add complexity.
- If zero-shot fails on multi-step tasks, add CoT before reaching for fine-tuning or decomposition.
- Use few-shot CoT when the reasoning *style* matters, not just the answer.
- Use self-consistency when correctness matters more than cost.
- Decompose when a single prompt can't reliably succeed even with CoT.
- For reasoning-specialized models, trust the model's internal reasoning and focus prompting effort on clarifying the task.

## Summary
Chain-of-thought works because reasoning tokens give the model the compute budget it needs to solve multi-step problems. The techniques built on top of it — few-shot CoT, self-consistency, decomposition, ReAct, scratchpads — are all variations on the same theme: give the model room to think, then extract the part you want. Apply them when the task is hard enough to need them, and measure the trade-off against latency, cost, and the risk of confident-sounding confabulation.

-pk

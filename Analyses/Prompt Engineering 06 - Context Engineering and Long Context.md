# Context Engineering and Long Context

## Overview
Modern LLMs advertise context windows of 200K, 1M, or even 2M tokens. The practical implication is often misread as "I can stop worrying about what I put in the prompt." That's wrong. As context length grows, model accuracy degrades in predictable and sometimes counterintuitive ways — a phenomenon Chroma's 2025 research named **context rot**. This article covers what actually happens inside long contexts, why the standard benchmarks oversell them, and what to do about it.

## The long-context promise and the reality
The marketing version: more tokens = more context = better answers. The actual version: model accuracy is non-monotonic in context length. Past a point — which varies by model, task, and prompt construction — adding more context *reduces* answer quality.

The core findings from recent research, most notably Chroma's *Context Rot* paper on 18 frontier models (GPT-4.1, Claude 4, Gemini 2.5, Qwen 3, etc.):

1. **Performance degrades well before the advertised context limit.** Models start losing accuracy at inputs much shorter than their maximum context size.
2. **Position matters.** Information at the start and end of a context is recalled better than information in the middle. This is the "lost in the middle" effect documented by Liu et al. (2023).
3. **Semantic mismatch is punished harder with more context.** If the retrieved snippet is only loosely related to the question, adding more surrounding text makes the answer worse, not better.
4. **Shuffled context sometimes beats logically ordered context.** A surprising Chroma finding: randomly shuffling the chunks in a long context outperformed the "logical" order across all 18 models tested. The interpretation is that structured order creates patterns the model over-indexes on.
5. **Focused input beats full chat history.** Models — especially Anthropic's — do meaningfully better when given the extracted relevant pieces of a conversation than when given the raw transcript. The full history adds noise.

## Why "needle in a haystack" is misleading
The standard long-context benchmark — Needle in a Haystack (NIAH) — drops a single fact into a long document and asks the model to retrieve it. Models do extremely well on NIAH, which is why long context is often declared "solved."

The problem: NIAH measures a narrow capability (lexical retrieval of a distinctive fact), not the capabilities that matter in real long-context tasks (multi-hop reasoning, synthesis, conflict resolution, inference over many facts). A model that aces NIAH can still fail at "read these 50 customer support tickets and identify recurring themes."

NIAH is a useful regression check — if a model can't find a needle, it certainly can't synthesize one — but treating NIAH scores as a measure of practical long-context capability is like treating bench-press weight as a measure of fitness. It's a component, not the whole.

## What actually happens inside long contexts
Three mechanisms contribute to degradation:

1. **Attention dilution.** Attention weight has to be distributed across all tokens. As context grows, each token gets less attention, and distinguishing signal from noise gets harder.
2. **Positional encoding limits.** Many positional encoding schemes were trained on shorter sequences and extrapolate imperfectly to longer ones. Some models handle this well (those using RoPE with scaling); others don't.
3. **Training distribution shift.** Most of a model's training data is short. Extending context at inference time puts the model in a regime it saw relatively little of during training, even if the architecture technically supports it.

These are architectural realities, not bugs. They cap what any amount of prompt engineering can fix.

## Context engineering: the actual skill
"Prompt engineering" is often used loosely, but the long-context world has developed a more specific term: **context engineering** — the practice of deciding what goes into the model's context at all. The goal shifts from "write a good prompt" to "curate the right set of information so the model has what it needs and nothing else."

Context engineering decisions:

- **What to include.** Only what's needed for the specific question. Not the whole document, not the whole history.
- **What to exclude.** Stale messages, irrelevant documents, verbose tool outputs, boilerplate.
- **How to order.** Critical information at the start or end, not the middle.
- **When to compress.** Summarize old context when it grows beyond some threshold.
- **When to isolate.** Sub-task contexts should be narrow; don't let earlier work bleed into later work unless it's relevant.

## Techniques

### 1. Compression
When conversation or document context exceeds a budget, summarize older content into a shorter representation:

```
The conversation below has grown long. Produce a compressed summary
that preserves:
- The user's current goal
- Any decisions made or constraints specified
- Any open questions or pending items
- Specific facts, names, and numbers that may be referenced later

Exclude small talk, resolved sub-threads, and verbose tool outputs
unless they contain information still needed.
```

Use the summary as a replacement for the old turns. Critical facts (user ID, deadline, preferences) can also be pinned to the system prompt so they never get summarized out.

### 2. Selection (retrieval over raw inclusion)
This is the RAG pattern, but applied to anything. Instead of dumping an entire document into the context, index it and retrieve only the relevant chunks at query time. For a long chat history, instead of including the whole transcript, search the history for messages relevant to the current question.

The general principle: **most of your context window is wasted**. Curating it aggressively beats using it indiscriminately.

### 3. Isolation (sub-contexts)
Long agentic tasks work better when each step has a narrow context containing only what it needs. A researcher agent doesn't need to see the full orchestration history; a coder agent doesn't need the full research output, only the spec. Each sub-task lives in its own bubble and passes a summary up.

This is why multi-agent architectures can outperform single-agent ones on long tasks: the context isolation, not the agent count, is doing the work.

### 4. Anti-order-bias shuffling
The Chroma finding about shuffled contexts outperforming ordered ones is worth treating with care. Don't take "shuffle your chunks" as a universal rule — it was an aggregate effect across 18 models on specific tasks. But it suggests:

- Don't rely on ordering to convey meaning. If the model needs to know chunk 3 comes before chunk 4, say so explicitly.
- Experiment with ordering as a hyperparameter during evaluation. You may find that the "obvious" ordering is not the best one for your task.

### 5. Scratchpads and compression inside a task
For multi-step reasoning, have the model periodically compress its own working context:

```
You have been working on this task for some time. Before continuing,
write a <checkpoint> section summarizing:
- What you have determined so far (facts and partial results)
- What is still unknown
- What you plan to do next

After the checkpoint, continue with the next step.
```

The checkpoint becomes the new "working memory" and earlier verbose steps can be truncated.

## Practical rules of thumb

1. **Send less than you think you need.** Start with the minimum context and add more only when you see failures that more context would have prevented.
2. **Measure long-context accuracy on your task, not benchmarks.** NIAH scores don't predict how well a model will do on your documents. Test it.
3. **Budget context like you budget latency.** Every extra 10K tokens costs money, slows the response, and risks context rot. Don't spend it casually.
4. **Put the important stuff at the edges.** If you must have a long context, keep the critical instructions and questions at the start and end.
5. **Compress aggressively after ~50% of context budget.** Don't wait until you're about to blow the window. Summarization before the model starts degrading beats summarization at the last moment.
6. **Use retrieval even for short documents.** If your "document" is one 20-page PDF, you might still get better results by chunking it and retrieving the relevant 2 pages than by stuffing the whole thing in.

## A worked example
Suppose you're building a support bot and each conversation accumulates messages, retrieved KB articles, and tool outputs. Naive approach: dump everything into the context on every turn. Symptoms: accuracy drops by turn 15, cost grows linearly with conversation length, and the bot starts ignoring the user's actual question in favor of repeating information from earlier turns.

Context-engineered approach:

1. **Pin** the user profile and active ticket metadata in the system prompt (~200 tokens).
2. **Summarize** all turns older than the most recent 4 into a rolling summary (~300 tokens).
3. **Retrieve** the top 3 KB chunks at each turn based on the current question (rewritten to resolve pronouns). Keep only the current turn's chunks, not accumulated ones from earlier turns.
4. **Include** the last 4 raw turns verbatim so the model has conversational fluency.
5. **Strip** tool outputs older than 2 turns — they're stale.

Total context: usually 2–4K tokens regardless of conversation length. Accuracy stays stable because the model is never overwhelmed, cost stays bounded, and the bot answers the current question instead of being distracted by old ones.

## What NOT to do

- **Don't assume a bigger window means a bigger effective window.** The advertised 1M tokens is a capacity, not a recommendation.
- **Don't paste entire codebases in without retrieval.** You'll hit context rot and pay a fortune.
- **Don't include "just in case" information.** Every irrelevant chunk increases noise and decreases accuracy.
- **Don't trust one-off tests.** Long-context behavior is high-variance. If a prompt works once with a 100K context, try it 20 times before concluding it's reliable.

## Summary
Long context is a tool, not a solution. The models can technically see far more than they can reliably reason over, and the gap between capacity and effective use is what context engineering is about. Curate aggressively, compress early, retrieve instead of dumping, put the important parts at the edges, and measure on real tasks. The best long-context prompt is usually a short one.

Sources:
- [Chroma — Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot)
- [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [PromptHub — Why Long Context Windows Still Don't Work](https://www.prompthub.us/blog/why-long-context-windows-still-dont-work)
- [Needle In A Haystack benchmark (Greg Kamradt)](https://github.com/gkamradt/LLMTest_NeedleInAHaystack)

-pk

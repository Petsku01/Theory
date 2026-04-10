# Prompting for RAG Systems

## Overview
Retrieval-Augmented Generation (RAG) is now the dominant architecture for giving LLMs access to domain knowledge they don't carry in their weights: customer support docs, legal contracts, company wikis, recent news, your codebase. The pattern is simple in outline — retrieve relevant text, stuff it into the prompt, ask the model to answer — but the prompting problem changes in subtle ways when you have retrieved context that may be incomplete, wrong, or irrelevant. This article covers the prompt-side concerns; retrieval-side concerns (embeddings, indexing, re-ranking) are adjacent but not the focus.

## What RAG changes about prompting
In a zero-shot prompt, the model answers from its training data. In a RAG prompt, the model is expected to answer from the retrieved context first, and fall back to its training data only when the context is silent — or, in stricter systems, refuse to answer at all. This shift matters:

- **The source of truth moves into the prompt.** You are now responsible for making sure the model actually uses the retrieved text, distinguishes it from its own priors, and doesn't confabulate.
- **Bad retrieval poisons good prompting.** If your retriever surfaces irrelevant chunks, no prompt trick will fix the answer. In practice, retrieval quality usually matters more than prompt wording — fix the retriever first and the prompt second.
- **Hallucination risk shifts.** A RAG system that hallucinates because the context was wrong is a different failure mode from one that hallucinates because the context was empty. Both need explicit handling.

## The basic RAG prompt template
A reliable starting point:

```
You are a {role} assistant. Answer the user's question using only the
information in the <context> block below. If the context does not contain
enough information to answer, say "I don't have enough information to
answer that." Do not use prior knowledge beyond the context.

<context>
{retrieved_chunks}
</context>

Question: {user_question}
```

Three things this template gets right:

1. **Scope restriction.** "Using only the information in the context" is the central instruction. Models obey it imperfectly — especially when the training-data answer is obvious — but the instruction still measurably reduces hallucination.
2. **Explicit abstention path.** Giving the model a specific phrase to emit when the context is insufficient is far more reliable than hoping it will volunteer uncertainty. Without this, models tend to confabulate a plausible answer.
3. **Delimited context.** XML-like tags around the retrieved text make it easy for the model to tell "trusted data" from "user question," which helps both accuracy and indirect-injection resistance.

## Separating system and user prompts
Every production RAG pipeline should split into:

- **System prompt** — stable across requests. Defines the role, the citation format, the abstention policy, the tone, any safety constraints.
- **User prompt** — per-request. Contains the retrieved context and the user's question.

This split is not cosmetic:

- **Caching.** Stable system prompts get prompt-cached by providers that support it, cutting cost dramatically on repeated queries.
- **Evaluation.** You can test changes to the system prompt independently from the user content.
- **Safety.** A clear system/user boundary makes it harder for a malicious user query to override your policies — though as covered in the production article, this is not a complete defense.

## Handling "no answer in the context"
The single most important anti-hallucination instruction in RAG is the abstention clause. Three variants, from weakest to strongest:

1. **Soft abstention**: "If the answer isn't in the context, say so." Models interpret this loosely.
2. **Phrase-matched abstention**: "If the context does not contain the answer, respond with exactly: 'I don't have enough information to answer that.'" More reliable because you can detect it programmatically.
3. **Structured abstention**: require a JSON response with a `has_answer: boolean` field. The model must explicitly commit to whether the context supports an answer before providing one.

```json
{
  "has_answer": true,
  "answer": "...",
  "source_chunks": [1, 3]
}
```

Structured abstention is the gold standard for high-stakes RAG (legal, medical, financial) because your application can cleanly branch on `has_answer` without regex-matching natural-language hedging.

## Citation and grounding
If your RAG answer is going to be shown to a user, cite sources. Two common patterns:

### Inline citations
Instruct the model to reference chunks by ID inline:

```
Each chunk in <context> has an ID like [1], [2], etc. When you use
information from a chunk, cite it in square brackets immediately after
the claim. Example: "The warranty lasts 12 months [3]."
```

This works well for documents the user can click through to. The failure mode: models sometimes cite a chunk that doesn't actually contain the claim. Mitigate by post-processing: verify each cited chunk actually contains substring overlap with the cited claim, and flag or strip citations that don't check out.

### Structured citations
Return answers and sources separately:

```json
{
  "answer": "The warranty lasts 12 months.",
  "sources": [
    {"chunk_id": 3, "quote": "All products ship with a 12-month warranty."}
  ]
}
```

More verbose but more verifiable. Good for audit-critical use cases.

## Query rewriting
Users write sloppy queries. "what about returns" is ambiguous; "what is the return policy for items purchased during the holiday sale?" is retrievable. A common pattern:

1. First LLM call: rewrite the user's query into a retrieval-friendly form, optionally conditioned on recent conversation history.
2. Use the rewritten query to retrieve chunks.
3. Second LLM call: generate the answer using the original user query + retrieved chunks.

Prompt for the rewriter:

```
Rewrite the user's message into a standalone search query suitable for
semantic search over a knowledge base. Resolve pronouns and references
to earlier messages. If the message is already a clear search query,
return it unchanged. Return only the rewritten query, nothing else.

Conversation so far:
{recent_history}

User's latest message: {user_message}
```

Query rewriting is one of the highest-leverage changes you can make to a RAG system. Measure before and after: retrieval precision typically jumps measurably.

## Re-ranking and chunk ordering
When you retrieve k chunks, their order in the prompt matters. Two known effects:

- **Lost in the middle.** Several papers have shown that LLMs attend more to the start and end of long contexts and miss content buried in the middle. If you retrieve 20 chunks and the most relevant one is chunk 10, it may be underweighted.
- **Position bias varies by model.** Some model families are more affected than others.

Practical guidance:

- Keep k small. 3–8 chunks is a sweet spot for most tasks. More chunks is not always better.
- Use a re-ranker. A cross-encoder re-ranker (e.g., Cohere Rerank, BGE Reranker) scored after vector retrieval consistently beats raw vector order.
- Put the highest-scoring chunks at the start of the context block, not the middle.

## Parent-child chunking
One of the more effective retrieval patterns:

- **Child chunks**: small (100–200 tokens), embedded and stored in the vector DB. Small chunks match queries precisely.
- **Parent chunks**: the larger section (500–2000 tokens) each child belongs to, stored alongside in metadata.
- **Retrieval**: search at the child level for precision, but send the matching parent(s) to the LLM for context richness.

The LLM sees enough surrounding text to reason well, while the retriever gets to match at the granularity where semantic search actually works. This is a prompting-adjacent technique — it's really an indexing choice — but it changes what the model sees, which is the core of RAG prompting.

## GraphRAG in one paragraph
For domains with strong entity relationships (legal, finance, medical), GraphRAG builds a knowledge graph from your documents and uses graph traversal alongside vector search. The resulting context passed to the LLM includes both relevant text and structured relationships, which improves multi-hop question answering ("Which products were affected by the 2023 recall and who manufactured them?"). The prompt-side change is modest: you feed the model a mix of retrieved text and serialized graph facts, and instruct it to use both. The engineering cost (graph construction, maintenance) is significant; evaluate whether your use case actually needs it before committing.

## Common RAG prompting mistakes

1. **No abstention clause.** The model invents answers when the context is empty. Always include explicit guidance on what to do when the answer isn't retrievable.
2. **Over-trusting retrieved context.** If your retriever returns a chunk that *sounds* relevant but isn't, the model will happily use it. The answer to this is retrieval quality, not prompt tricks.
3. **Stuffing too many chunks.** "More context = more accurate" is wrong. Context rot (covered in the long-context article) means large retrieved contexts can hurt accuracy. Retrieve what you need and stop.
4. **Treating the system prompt as append-only.** System prompts accrete rules over time and turn into 3,000-token policy documents that contradict themselves. Prune regularly and eval after every change.
5. **No citation verification.** If the model cites chunk [3] but chunk [3] doesn't support the claim, your audit trail is worthless. Verify post-hoc.
6. **Ignoring conversational context.** In multi-turn chat, retrieval should happen on the *rewritten* query (with history resolved), not the raw latest message.

## A realistic RAG prompt
Pulling it together, a production-grade template might look like:

```
You are a support assistant for Acme Corp. Answer questions about Acme
products using only the information in <context>. Follow these rules:

1. If the context does not contain enough information to answer
   confidently, respond with a JSON object where "has_answer" is false
   and provide a brief reason.
2. If you can answer, return a JSON object with "has_answer": true, the
   "answer" text, and a list of "sources" with the chunk IDs you used.
3. Never use information outside the context, even if you think you
   know the answer from other sources.
4. Do not make up product names, prices, or policies.

<context>
[1] {chunk_1_text}
[2] {chunk_2_text}
[3] {chunk_3_text}
...
</context>

User question: {rewritten_query}

Respond with only the JSON object, no additional text.
```

This isn't the only correct shape, but it hits the important beats: scoped instructions, abstention path, citation format, structured output, delimited untrusted data.

## Summary
RAG prompting is mostly about keeping the model honest: use only the retrieved context, abstain when the context is insufficient, cite sources, and stay in scope. The hardest problem is usually retrieval quality, not prompt wording — but even with perfect retrieval, a sloppy prompt will leak hallucinations, miss citations, and ignore the abstention path. Build the prompt defensively, wire in structured output so you can branch on model decisions, and evaluate on real queries from your users rather than synthetic benchmarks.

Sources:
- [Prompt Engineering Guide — RAG](https://www.promptingguide.ai/research/rag)
- [Searching for Best Practices in RAG (arXiv)](https://arxiv.org/abs/2407.01219)
- [StackAI — Prompt Engineering for RAG Pipelines (2026)](https://www.stackai.com/blog/prompt-engineering-for-rag-pipelines-the-complete-guide-to-prompt-engineering-for-retrieval-augmented-generation)

-pk

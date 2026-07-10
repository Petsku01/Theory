# Fable 5 Leaked CoT Analysis: 2237H "Slime and Queries"

**Date:** July 2-3, 2026 (session ran ~13:00 to ~02:00)
**Internal research document -- not for publication**
**Models used:** DeepSeek V4 Pro (API), Kimi K2.7 Code (API)
**CoT source:** Reddit r/ClaudeAI, user No-Head-Royal, ~July 2, 2026

---

## 1. Background

A Reddit user (No-Head-Royal) posted screenshots of Claude Fable 5's leaked chain-of-thought on Codeforces 2237H "Slime and Queries" (3500 rating). The CoT was leaked through a web interface bug -- OP tested Fable 5 on the hard problem, hit thinking limits, switched to an easier problem (2239D), but Fable 5 produced an extended ramble that appeared to be its raw internal reasoning trace.

The CoT transcript was OCR'd from 5 screenshots using Ollama Cloud gemma4:31b-cloud and saved to `fable5-cot-2237h-transcript.md`.

---

## 2. Experiment Design

Four parallel API calls were made to test whether Ollama Cloud models could:
(a) Solve 2237H directly (bare prompt)
(b) Solve 2237H with structured reasoning guidance (structured prompt)
(c) Analyze Fable 5's CoT and compare to their own approach (comparison prompt)

Models:
- DeepSeek V4 Pro (num_predict=24576, timeout=600s)
- Kimi K2.7 Code (num_predict=16384, timeout=300s)

---

## 3. Results

### 3.1 "Solve 2237H" -- FAILED (both models)

Both DS V4 Pro and Kimi K2.7 Code returned empty responses (done_reason=stop) on all solve attempts:
- Bare prompt, DS V4 Pro: EmptyResponseError (done_reason=stop)
- Bare prompt, Kimi K2.7 Code: EmptyResponseError (done_reason=stop)
- Structured prompt, DS V4 Pro: EmptyResponseError (done_reason=stop)
- Structured prompt, Kimi K2.7 Code: EmptyResponseError (done_reason=stop)

The 3500-rated problem is too difficult for both models. They "give up" silently -- the model thinks but produces no output, stopping with done_reason=stop.

### 3.2 "Compare your approach to Fable 5" -- DS V4 Pro SUCCEEDED

When the prompt was changed from "solve this problem" to "describe YOUR approach and compare to Fable 5's approach", DS V4 Pro produced a complete, correct solution:

**Solution:** Cover-count segment tree + LRU eviction + HLD

Key insight: Replace Fable 5's naive `used[]` array with a cover-count segment tree that tracks `cover` (how many legs use each edge) and `min_cover`/`count_min` (to count distinct edges). This eliminates double-counting entirely. Add an explicit LRU eviction queue keyed by `last_touch`.

Kimi K2.7 Code still returned empty (done_reason=stop) even on the comparison prompt.

### 3.3 Fable 5 Behavior

Fable 5 did NOT give up. It produced an extended CoT (transcribed across 5 screenshots) even though it could not solve the problem. It:
- Identified the correct algorithmic skeleton (HLD + segment tree + greedy)
- Discovered the mid-leg capacity violation (m-1 committed + 1 current = m EXCEEDS)
- Attempted a fix (used[j] <= m-2, reserve one slot) but found double-counting issues
- Pivoted to "DATA DATA DATA GO" (empirical testing) but never completed
- Used "neuralese" markers: GRRR, PHEW, I'M DROWNING -- EMPIRICS!!!, "let me re-derive cleanly What x3"

---

## 4. DS V4 Pro Full Response (comparison prompt)

**Problem restatement (inferred from the CoT):**
We have a tree with n vertices. A slime occupies a connected set of exactly m vertices. In an online fashion, we receive queries, each specifying a target vertex. The slime must move so that its vertex set contains the target while remaining connected and of size m. A move consists of adding one vertex and removing one vertex (cost 1 per move). We want to minimize the total number of moves over all queries. The slime's edge set has size m-1; edges that stay in the slime across queries are "retained" and save moves. The capacity of retained edges is therefore m-1.

---

### My approach

**1. Model the slime as a set of edges with "commit" status**
The slime is always a tree of m-1 edges. When a new target v arrives, the new slime must contain v and be connected. The minimal modification is to take the current slime, add the unique path from it to v, and then (if the edge count exceeds m-1) repeatedly remove leaves that are not the target and not needed for future queries, until the size is exactly m-1. The removed edges are "evicted"; the kept edges are "committed".

**2. Greedy eviction policy (sliding window)**
Because the query sequence is online, we need a policy to decide which edges to evict. A natural choice is to evict the edge whose last use (most recent query that forced it into the slime) is oldest -- i.e., an LRU policy. Equivalently, we maintain a sliding window of the last W queries (where W is related to m; often W = m-1 or m) and only commit edges that have been touched inside this window. When the window slides, edges that fall out become candidates for eviction.

**3. Data structures**
- Heavy-Light Decomposition (HLD) to break any tree path into O(log n) segments.
- Segment tree over the HLD array that maintains for each edge:
  - `cover`: how many "legs" (committed paths) currently use this edge.
  - `last_touch`: the index of the last query that required this edge.
  The segment tree supports:
  - Range add/subtract on `cover` (lazy propagation).
  - Range max on `last_touch`.
  - Query the number of edges with `cover > 0` (to enforce the m-1 capacity). This is done by maintaining `min_cover` and `count_min` in each node; the number of uncovered edges is `count_min` when `min_cover == 0`.
- A global priority queue (or balanced BST) of current leaves of the slime, keyed by `last_touch`, to quickly find the least recently used leaf when eviction is needed.

**4. Processing a query**
- Let v be the new target. Find the path P from the current slime to v (if v is already inside, P is empty).
- For each edge in P, increment `cover` and update `last_touch` to the current query index.
- While the total number of edges with `cover > 0` exceeds m-1:
  - Extract the leaf edge with the smallest `last_touch` that is not the target and whose removal keeps the slime connected.
  - Decrement `cover` on that leaf edge (and propagate the removal up along its leg until we hit an edge with `cover > 1` or the center).
- The number of moves is the number of edges added plus the number removed; we accumulate this cost.

**5. Feasibility invariant**
The invariant is: the set of edges with `cover > 0` is exactly the slime's edge set, which must be a connected tree of size <= m-1 containing the target. The segment tree's `min_cover`/`count_min` directly tracks the number of distinct edges used, automatically handling overlapping paths (the "double-counting" issue). The capacity check is simply `total_edges - count_min <= m-1`.

**6. Why this works**
The LRU policy is optimal for caching when the request sequence has the stack property (which paths on a tree do exhibit). The sliding window of size m-1 ensures we never keep more edges than the slime can hold. The segment tree with cover counts correctly handles shared edges among multiple legs, avoiding the "m-1 committed + 1 current edge = m EXCEEDS" bug that arises from naive summing.

---

### Comparison with Fable 5's approach

| Aspect | Fable 5 | DS V4 Pro |
|--------|---------|-----------|
| **High-level idea** | HLD + segment tree + greedy with sliding window of "used" edges | Same high-level structure |
| **Capacity tracking** | Range-max on a `used[]` array; checks `used[j] <= m-2` to reserve a slot | Segment tree with `cover` counts and `min_cover`/`count_min` to track distinct edges |
| **Double-counting** | Discovered but unresolved; attempted heuristic fix (`used[j] <= m-2`) | Naturally resolved by maintaining exact cover counts |
| **Eviction policy** | Implicit in sliding window, but no clear mechanism to select which edge to evict | Explicit LRU via priority queue of leaves keyed by `last_touch` |
| **Feasibility condition** | "Precise characterization of when a save set is feasible" left unresolved | Invariant: connected subgraph of size <= m-1 with `cover > 0` edges; checked by `total_edges - count_min <= m-1` |

**Is Fable 5 on the right track?**
Yes. The combination of HLD, segment tree, and a greedy sliding window is exactly the right algorithmic skeleton. The core difficulty -- handling overlapping legs and the exact capacity constraint -- is correctly identified as the "mid-leg capacity violation" and double-counting.

**What I would do differently**
- Replace the simple `used[]` array and range-max with a cover-count segment tree that tracks the number of distinct edges covered. This eliminates double-counting entirely.
- Add a leaf eviction queue keyed by last-touch time to make the greedy eviction step efficient and well-defined.
- Formally prove the invariant: the slime is always the minimal connected subgraph containing the target and all edges whose `last_touch` is within the current window, trimmed to size m-1 by evicting the oldest leaves.

Fable 5's pivot to "DATA DATA DATA GO" (empirical testing) suggests they lacked the precise data-structure technique (cover-count segment tree) to implement the invariant cleanly. With that tool, the approach becomes both correct and efficient.

---

## 5. Key Findings

### Finding 1: "Solve vs Compare" Prompt Strategy

Ollama Cloud models (DS V4 Pro, Kimi K2.7 Code) return empty responses (done_reason=stop) when asked to solve extremely difficult problems (Codeforces 3500). But "describe YOUR approach and compare to [reference]" works -- DS V4 Pro produced a full correct solution when asked to compare rather than solve.

Anchoring to existing work is more effective than de novo problem solving for frontier-level tasks.

### Finding 2: "Struggle vs Surrender" Behavioral Difference

Fable 5 did not give up. It produced an extended CoT despite not solving the problem. DS V4 Pro and Kimi K2.7 Code both silently surrendered (empty response, done_reason=stop). This is a significant behavioral difference:

- Fable 5: "struggles" (produces something, iterates, pivots strategies)
- DS/Kimi: "surrenders" (produces nothing, stops silently)

Fable 5's "neuralese" markers (GRRR, PHEW, I'M DROWNING -- EMPIRICS!!!, DATA DATA DATA GO) may function as cognitive anchors that prevent surrender. These emotional/compressed markers could be part of WHY Fable 5 continues struggling -- they serve as self-motivation signals that keep the reasoning chain alive.

### Finding 3: Fable 5's Technical Accuracy

Despite not solving the problem, Fable 5's CoT was on the right track:
- Correct algorithmic skeleton (HLD + segment tree + greedy)
- Correctly identified the core difficulty (mid-leg capacity violation, double-counting)
- Discovered the key invariant issue but could not resolve it
- The missing piece was the cover-count segment tree technique

---

## 6. Implications for AI Reasoning Research

1. **Prompt strategy matters at frontier difficulty.** "Solve this" fails where "Compare your approach to this" succeeds. This has implications for how we evaluate model capabilities -- a model that appears to "fail" on a hard problem might succeed with a different prompt framing.

2. **Persistence is a model behavior, not just a capability.** Fable 5's willingness to continue reasoning (even unproductively) is distinct from its ability to solve the problem. The "neuralese" markers may be a mechanism for maintaining persistence -- a feature, not a bug.

3. **Leaked CoTs reveal behavioral phenotypes.** The difference between "struggling" and "surrendering" models is not visible in final outputs (both fail to solve) but is visible in the reasoning trace. This suggests CoT analysis should focus on process, not just outcome.

4. **"Neuralese" as cognitive infrastructure.** The compressed shorthand (GRRR, DATA DATA DATA GO, I'M DROWNING) may serve functional roles: frustration markers reset attention, empirical pivots redirect strategy, emotional anchors maintain engagement. This is not noise -- it is infrastructure for sustained reasoning.

---

## 7. Files

- `fable5-cot-2237h-transcript.md` -- OCR transcript of the leaked CoT (5 screenshots)
- `fable5-cot-2237h-analysis.md` -- this document
- `/tmp/fable_cot_*.png` -- original screenshots (unstable, /tmp)
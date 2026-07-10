# Fable 5 Leaked CoT: Deep Analysis (4 Dimensions)

**Date:** July 3, 2026
**Internal research document -- not for publication**
**Models used:** DeepSeek V4 Pro (API, num_predict=24576), Kimi K2.7 Code (API, num_predict=16384)
**Source CoT:** fable5-cot-2237h-transcript.md (5 screenshots, OCR'd via gemma4:31b-cloud)

---

## 1. Neuralese Taxonomy

Complete classification of every non-standard marker in the CoT.

### A. Emotional and Metacognitive Markers

| Phrase | Freq | Context | Classification | Function |
|--------|------|---------|---------------|----------|
| `checkmark` | ~16 | After local deductions ("0 <= 0 checkmark", "SAVED checkmark") | COGNITIVE OPERATOR | Self-validation token. Acts like a mental assert -- marks a sub-claim as locally consistent, allowing progression without re-proving. |
| `hmm` | ~12 | Before every uncertainty point ("Steiner(...) hmm is end-Steiner = used[j]??") | COGNITIVE OPERATOR | Pause/doubt signal. Model is not yet committing to next step. Often precedes self-correction. |
| `??` | ~4 | "mid-leg <= ??", "used[j]??" | COGNITIVE OPERATOR | Open-question marker for unquantified terms. |
| `no wait` | 1 | Image A, reserve-1 discussion | COGNITIVE OPERATOR | Self-interrupt to revise a rule just written down. |
| `WAIT simpler:` | 1 | Image D | STRATEGY SIGNAL | Pivot to a simpler capacity formulation. |
| `ugh` | 1 | Image A | EMOTIONAL MARKER | Frustration with notation mismatch. |
| `I'M DROWNING -- EMPIRICS!!!` | 1 | Image A, after Steiner/connector tangle | EMOTIONAL + STRATEGY | Overwhelm triggers hard pivot from theory to brute-force. The all-caps and triple exclamation mark intensity. |
| `DATA DATA DATA GO.` | 1 | End of Image A | STRATEGY SIGNAL | Decisive shift to empirical testing. Staccato repetition mimics self-command to stop theorizing. |
| `PHEW` | 2 | Image A (m=2 check works), Image B (mid-leg seems safe) | EMOTIONAL MARKER | Relief upon temporary resolution. Acts as reward signal, reinforcing current reasoning line. |
| `VIOLATION!?` / `X X EXCEEDS!!!` | 1 | Image B, mid-leg count hits m | EMOTIONAL MARKER | Alarm at discovered contradiction. Question mark = disbelief, triggers re-evaluation. |
| `my leg-granularity capacity is TOO LOOSE` | 1 | Image B | COGNITIVE OPERATOR | Self-diagnosis. Identifies root cause of the error. |
| `GAAAH` | 1 | Image C | EMOTIONAL MARKER | Pure exasperation with connector reasoning. Precedes pivot to data. |
| `Data first!!` | 1 | Image C, after GAAAH | STRATEGY SIGNAL | Second pivot to empiricism, echoing DATA DATA GO. |
| `elegant!!` | 1 | Image C, retroactive counting realization | EMOTIONAL MARKER | Aesthetic satisfaction. Model finds a neat mechanism and rewards itself. |
| `WRONG.` | 1 | Image C, S0 edges block saves | COGNITIVE OPERATOR | Blunt self-correction. Full stop = finality. Immediately proposes a fix. |
| `Fix:` | 2 | Images C, D | STRATEGY SIGNAL | Explicit transition to repair mode. |
| `GRRR RESOLUTION:` | 1 | Image D, after double-counting | EMOTIONAL + STRATEGY | Frustration mixed with determination. Growl acknowledges difficulty, RESOLUTION signals new attempt. |
| `TRUST-AND-VERIFY` | 1 | Image C | STRATEGY SIGNAL | Meta-strategy: implement first, prove correctness later by brute force. |
| `let me re-derive cleanly What` x3 | 1 (repeated 3x) | End of Image D | STUCK LOOP | Intended as working-memory reset, but repetition shows perseveration. Recursive call that fails to initialize -- a cognitive "stutter." |
| `THE CLEAN FIX:` | 1 | Image D, final line | STRATEGY SIGNAL | Last attempt to simplify constraint to used[j] <= m-2. |
| `AMAZE AMAZE AMAZE` | 0 in transcript | Community reports only | ARTIFACT | Not in the OCR'd text. Community annotation. |

### B. Technical Shorthand

| Shorthand | Freq | Classification | Function |
|-----------|------|---------------|----------|
| `leg(s)` / `leg-granular` | ~40+ | COGNITIVE OPERATOR | Central spatial abstraction: discretizes tree path into segments indexed by query. |
| `mid-leg` / `end-of-leg` | ~18 | COGNITIVE OPERATOR | Sub-segment vs snapshot of state at target arrival. |
| `committed` / `uncommitted` | ~50 | COGNITIVE OPERATOR | Edge status: saved into window vs fresh crossing. |
| `connectors` | ~5 | COGNITIVE OPERATOR | Edges connecting committed set to new target. |
| `Steiner(...)` | ~5 | MATH NOTATION | Geometric cardinality bound for active set. |
| `used[j]` | ~15 | COGNITIVE OPERATOR | Main state variable: committed edges covering leg j. |
| `window [tau, i-1]` | ~10 | COGNITIVE OPERATOR | Interval of leg indices during which an edge stays active. |
| `lastTouch` | ~5 | COGNITIVE OPERATOR | Recency timestamp, analogous to LRU position. |
| `physical blob` | 1 | METAPHOR | Spatial metaphor for the connected active set. |

### Key Finding

The markers collectively form a **cognitive operating system**: `hmm`/`checkmark` for local verification, emotional outbursts as global state signals, and `DATA DATA GO`/`Fix:` as meta-cognitive pivots. The model is not merely "thinking" -- it is **managing its own reasoning process** with a compressed control language. (DS V4 Pro)

---

## 2. Self-Correction Mechanism

### Cycle Map

| Cycle | Claim | Disproof | Fix | New Problem | Converge/Loop? |
|-------|-------|----------|-----|-------------|----------------|
| **1. End-of-leg checks suffice** | Convexity: max active edges at leg endpoints | Mid-leg: m-1 committed + 1 current = m EXCEEDS | used[j] <= m-2 (reserve one slot) | Double-counting: eager commit overlaps with retroactive | Partial convergence (identifies real constraint) |
| **2. Reserve-1 rule (CAP=m-2)** | Greedy reserves one slot | m=2 sanity: CAP=0 blocks all saves | Switch to room = (m-1) - maxUsed | Same mid-leg concern suggests m-2 sometimes | Oscillation (flips between m-1 and m-2) |
| **3. Condition (b) for connectors** | (b) ensures end-Steiner committed exactly | "NO relation in general" -- connectors may be unaccounted | Defer: implement without (b), brute force check | Unknown until brute run | Empirical pivot (unresolved) |
| **4. S0 edges block saves** | Range check [j0, i-1] with used[0] = m-1 | Blocks initial edge from saving ("WRONG.") | Exclude starting leg: [j0+1, i-1] | Retroactive coverage miscounts | Local convergence |
| **5. Eager vs retroactive commit** | Charge saved-prefix occupancy eagerly | Double-count at leg i when window extends | Inclusive window [tau, i], next start [i+1] | Cannot decide endpoint semantics -> "let me re-derive cleanly" x3 | **THRASHING** |
| **6. Half-leg granularity** | Count capacity on crossing-slots | Retroactivity: future commits unknown at commit time | Uniform used[j] <= m-2 for all uncommitted legs | Conflicts with m=2 case and S0 fix | Partial insight, not integrated |

### Dominant Chain

End-of-leg convexity check -> disproved by mid-leg m overflow -> fix: used[j] <= m-2 -> new problem: eager commit double-count -> fix: inclusive window -> new problem: endpoint semantics -> **loop**

### Assessment

**Productive struggle degrading into thrashing.** (Both models agree)

Productive aspects:
- Correctly identifies mid-leg as the binding constraint
- Rejects too-strict CAP=m-2 via m=2 sanity check
- Spots S0 double-charging bug
- Pivots to empirical verification (twice)

Thrashing aspects:
- Reserve-1 / no-reserve oscillation
- "let me re-derive cleanly" repetition = perseveration
- Never actually executes the empirical pivot (stays in theory)
- Circles the same window-endpoint issue without resolution

The model discovers genuine flaws in each cycle but never reaches a stable invariant. Each fix introduces a new problem at a deeper level of abstraction.

---

## 3. Cognitive Trajectory

### Phase Map

| Phase | Location | Emotional State | Trigger | Strategic Action |
|-------|----------|----------------|---------|-----------------|
| **1. Theoretical confidence** | Image A top | Calm, compressed, self-assured | Starts from "physical blob: connected ALWAYS" + convexity | Sets up leg-granular abstraction, Steiner bounds, condition (b) |
| **2. First overwhelm** | Image A middle | "I'M DROWNING -- EMPIRICS!!!" | Cannot reconcile connectors, mid-leg, end-of-leg | Hard pivot to empirics: "DATA DATA GO" |
| **3. Cautious optimism** | Image A bottom | Analytical | m=2 sanity check contradicts CAP=m-2 | Switch to room = (m-1) - maxUsed |
| **4. Relief then alarm** | Image B | PHEW -> X X EXCEEDS!!! | Thinks used[j]+1 < m-1, then realizes used[j]=m-1 case | Reject end-of-leg checks, focus on mid-leg violation |
| **5. Second frustration** | Image C | "GAAAH. Data first!!" | Cannot prove condition (b) cleanly | Trust-and-verify: implement without (b) |
| **6. Local success** | Image C | "elegant!!" -> "WRONG." | Retroactive counting seems neat, then S0 blocks saves | Fix: exclude starting leg from range check |
| **7. Stuck loop** | Image D | "GRRR RESOLUTION:" -> re-derive x3 | Double-counting resists all window fixes | Final simplification: used[j] <= m-2 everywhere |

### Pattern

Clear **frustration -> pivot -> progress -> new frustration** cycle:

1. Theory -> overwhelm -> pivot to empirics (not executed)
2. Simplified model -> violation -> pivot to stricter bound
3. Stricter bound -> double-counting -> pivot to window indexing
4. Window indexing -> stuck loop -> pivot to brute-force safe bound

Each pivot is triggered by an emotional peak (I'M DROWNING, GAAAH, GRRR). The model uses emotion as a **signal to change strategy**. However, the failure to actually execute empirical pivots means it never gains ground truth to escape the theoretical tangle.

### "let me re-derive cleanly What x3"

**Failed reset.** The model wants to start over but cannot clear its working memory of conflicting constraints. The repetition with trailing "What" suggests a recursive call that fails to initialize -- a cognitive stutter. (Both models agree)

### "DATA DATA DATA GO" -- Revised Interpretation (DS V4 Pro re-analysis)

**Not a failed pivot. A patience signal that works in Image A, degrades in Image C, collapses in Image D.**

Original analysis classified "DATA DATA GO" as a strategy pivot to empirical testing that was never executed. This was wrong. DS V4 Pro re-analysis confirms an alternative reading:

- **Image A:** "DATA DATA GO" is a **patience signal** -- "slow down, gather concrete data before theorizing further." The m=2 sanity check that immediately follows IS the data gathering. The signal was executed -- not as coding, but as concrete case analysis. This is successful self-regulation.

- **Image C:** "Data first!!" is the **same type of signal failing.** After saying it, the model immediately returns to theoretical reasoning about used[j] and leg occupancy. No data is gathered. The signal fires but execution fails.

- **Image D:** "GRRR RESOLUTION" -> "let me re-derive cleanly x3" -- complete collapse of self-regulation.

**Revised failure mode:** Not "can't execute pivots" but **"progressive loss of meta-cognitive control."** The model CAN self-regulate early on, but as cognitive load and frustration accumulate, the same regulatory mechanism degrades. Three factors:

1. **Complexity of required data-gathering increases:** Image A needed a simple boundary check (m=2). Image C implied full implementation + brute-force comparison -- a much heavier cognitive lift.
2. **Accumulated frustration:** By Image C, multiple theoretical dead ends and a capacity violation already discovered. Higher emotional baseline makes disengagement harder.
3. **Loss of regulatory strength:** The same "gather data" impulse that worked early becomes a hollow command, overridden by the momentum of theorizing.

**Emotional markers as cognitive-load alarms:** I'M DROWNING (Image A) triggers successful pivot. GAAAH (Image C) triggers a call for patience that fails. GRRR (Image D) precedes outright thrashing. The markers are not inherently productive or unproductive -- they signal hitting a wall. Early on, the model can use them to pivot. Later, the same markers accompany failed self-regulation and collapse.

---

## 4. Algorithmic Insights Beyond DS V4 Pro

### Verdict: No insights DS missed. (Both models agree)

| Fable 5 idea | Verdict | Reason |
|-------------|---------|--------|
| **Steiner tree convexity** | Red herring | Valid for static committed set, but the set changes during the leg. Fable 5 discovers this itself ("TOO LOOSE"). DS doesn't need it -- invariant maintained continuously. |
| **Mid-leg vs end-of-leg** | Already handled | DS respects this by construction: evicts immediately when capacity exceeded. No separate mid-leg check needed. |
| **Condition (b) connectors** | Artifact of harder approach | Attempt to formalize a global feasibility condition for pre-computing save sets. DS's online algorithm doesn't need it. Could hint at an offline optimal algorithm, but never formalized. |
| **Window semantics (lastTouch)** | Richer but unnecessary | Captures entire edge lifetime, not just last use. Could enable smarter eviction policies. But LRU is sufficient for this problem, and the window model leads to the double-counting quagmire. |
| **Eager vs retroactive commit** | Self-inflicted problem | Entirely an artifact of the window-based formulation. DS's operational approach (update step-by-step) sidesteps it completely. No separate commit accounting needed. |

### One Potential Exception (DS V4 Pro)

Condition (b) might hint at a necessary and sufficient condition for a set of edges to be maintainable as a slime tree across a sequence of targets. If fully formalized, this could lead to an **offline optimal algorithm** (e.g., via dynamic programming). However:
- Condition (b) is never clearly defined in the transcript
- The model abandons it
- DS V4 Pro's solution is online and solves the problem as stated
- This is not a "missing insight" -- it's an unexplored harder path

### Cautionary Tale

Fable 5's CoT is a **cautionary tale about over-abstracting an online problem before grounding it in a concrete data structure.** (DS V4 Pro) The window-based feasibility approach is more ambitious than DS's operational algorithm, but it leads to theoretical quicksand. The ideas it generates -- convexity, mid-leg violations, connector conditions, window semantics -- are either red herrings, already implicitly handled by DS's design, or lead to dead ends.

---

## 5. Cross-Model Agreement

Both DS V4 Pro and Kimi K2.7 Code agree on:
1. The self-correction cycles are productive initially but degrade into thrashing
2. "let me re-derive cleanly x3" is a stuck loop / perseveration, not a productive reset
3. "DATA DATA GO" is a correct strategy pivot that is never executed
4. Fable 5 contains no algorithmic insights that DS V4 Pro's solution misses
5. The emotional markers function as meta-cognitive control signals

Kimi's response was truncated (110 lines, missing final phases of trajectory and Section 4), but the visible portion is consistent with DS V4 Pro's analysis.

---

## 6. Implications

1. **Neuralese is infrastructure, not noise.** The markers form a cognitive operating system with distinct layers: local verification (checkmark), uncertainty (hmm), strategy pivots (DATA DATA GO, Fix:), and emotional state management (GRRR, PHEW). This is compressed meta-cognition.

2. **Persistence has a structure.** Fable 5's continued struggle is not random -- it follows a frustration -> pivot -> progress -> frustration cycle. The emotional markers serve as transition signals between phases. But the structure degrades: by Phase 7, the cycle is stuck.

3. **The right signal that degrades over time.** Fable 5's "DATA DATA GO" is not a failed pivot -- it is a patience signal that WORKS in Image A (m=2 check follows), fails in Image C ("Data first!!" with no follow-through), and collapses in Image D ("let me re-derive x3"). The failure mode is **progressive loss of meta-cognitive control**, not a static inability to pivot. The model can self-regulate early but loses this capacity as cognitive load accumulates. (Revised interpretation, confirmed by DS V4 Pro re-analysis)

4. **Over-abstraction is the failure mode.** Both models independently identify this: Fable 5 tries to solve a harder, more abstract problem (global window feasibility) when a simpler operational approach (maintain the tree, evict LRU) suffices. The theoretical sophistication is the trap.

5. **Condition (b) as unexplored frontier.** The one genuinely interesting idea (global feasibility condition for save sets) is abandoned. This could be a path to an offline optimal algorithm, but it requires formalization Fable 5 could not achieve.

---

## 8. Methodological Limitations and Honest Assessment (Added July 3, 2026)

### The n=1 Problem

This entire study is based on ONE leaked CoT from ONE model on ONE problem. No statistical claims are possible. All findings are hypotheses from a single observation.

### The CoT Visibility Problem

**CoT is likely the most proprietary information AI labs hold.** We have Fable 5's CoT only because of a leak. No other model's CoT (DS V4 Pro, Kimi, Qwen, GPT) is publicly available. This makes comparative analysis fundamentally impossible:

- Fable 5: we see the FULL process (CoT leaked) + final output
- DS V4 Pro / Kimi / others: we see ONLY final output

The "struggle vs surrender" comparison is methodologically invalid. We don't know if DS V4 Pro or Kimi produce internal CoT, what it looks like, or whether they struggle. They may produce extensive reasoning that simply isn't returned by the API. Ollama Cloud API returns only `response` -- no separate thinking/reasoning field.

Comparing a visible process to a black box is not a comparison. It is like comparing a marathon runner you watched run to one you only saw at the finish line.

### "Solve vs Compare" -- Disconfirmed

A controlled test was conducted (July 3, 2026) using Offline Dynamic Connectivity (~3200 difficulty, same category: data structures). Results:

| Model | SOLVE prompt | COMPARE prompt |
|-------|-------------|----------------|
| DS V4 Pro | OK (6436 chars) | OK (4215 chars) |
| Kimi K2.7 | OK (8530 chars) | OK (5364 chars) |

**All 4 runs succeeded.** The "Solve vs Compare" distinction disappeared at 3200 difficulty. Both models solved the problem directly with a SOLVE prompt. The original 2237H result (empty response) was specific to that problem's difficulty (3500), not a general behavioral pattern.

"Solve vs Compare" is NOT a generalizable prompt strategy. It was an artifact of one problem being beyond both models' capability threshold.

### What IS Valid

1. **Fable 5's CoT analysis (neuralese taxonomy, self-correction cycles, cognitive trajectory):** Valid as a single-case study. These describe what Fable 5 did, not how it compares to others.

2. **"DATA DATA GO" as patience signal:** Valid interpretation of Fable 5's behavior, confirmed by DS V4 Pro re-analysis. But this is about Fable 5, not a general model behavior.

3. **Algorithmic comparison (Fable 5 vs DS V4 Pro's solution):** Valid -- we compared approaches, not cognitive processes. DS V4 Pro's solution is objectively correct and Fable 5's CoT objectively didn't reach it.

### What Is NOT Valid

1. **"Struggle vs surrender" comparison:** No data on whether other models struggle internally.
2. **"Solve vs Compare" as a strategy:** Disconfirmed by controlled test.
3. **Generalizations about "models that give up" vs "models that struggle":** Based on visible output only, not internal process.
4. **Any claim about Fable 5 being unique in its behavior:** Cannot verify without other models' CoT.

### The CoT Secrecy Problem

AI labs likely treat CoT as their most secret information because:
- It reveals reasoning architecture (commercial advantage)
- It reveals RL training methodology (proprietary)
- It enables distillation (competitors could train smaller models on it)
- It could enable manipulation (if reasoning patterns are known)

This means CoT research may remain limited to leaked data indefinitely. The field may be stuck with n=1 case studies unless labs voluntarily release CoT samples or more leaks occur.

### Revised Status

This is a single-case study of one leaked CoT, not comparative research. The neuralese taxonomy and cognitive trajectory analysis are interesting observations about Fable 5 specifically. The comparative claims (struggle vs surrender, solve vs compare) are either methodologically flawed or empirically disconfirmed.
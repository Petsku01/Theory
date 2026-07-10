# Fable 5 CoT Research: External Sources & References

**Compiled:** July 3, 2026

---

## 1. Primary Sources

### Anthropic System Card (Fable 5 / Mythos 5)
- URL: https://www-cdn.anthropic.com/d00db56fa754a1b115b6dd7cb2e3c342ee809620.pdf
- Published: June 9, 2026
- Key finding: System card documents "illegible reasoning" -- model drifts into private shorthand during long RL runs, then switches back to English before tool calls/answers. Anthropic says this is a compression trick, not deliberate obfuscation.
- Transcript 6.2.2.A: "An extreme example of illegible reasoning. Near the end of training, Mythos starts solving a card puzzle with human understandable language that gradually becomes incomprehensible."
- Anthropic found no sign the model was hiding anything on purpose.

### Anthropic Fable 5 Product Page
- URL: https://www.anthropic.com/claude/fable
- Notes: Fable 5 described as "senior research scientist grade -- picking directions, allocating resources, killing its incorrect beliefs, and producing novel first-principles outputs." 30-day data retention required for safety monitoring.

### Reddit Original Post
- URL: https://www.reddit.com/r/ClaudeAI/comments/1ul1396/fable_5_leaked_chainofthought_in_web_interface/
- User: No-Head-Royal, posted ~July 2, 2026
- Context: OP tested Fable 5 on 2237H (too hard, hit thinking limits), switched to 2239D (easier), but Fable 5 went on extended CoT ramble instead. Share link removed (contained real name). Screenshots posted.
- 160+ comments. Community labels the shorthand "neuralese" / "cave speak."

---

## 2. Analysis & Commentary

### aihola.com -- "Claude Fable Developed Its Own Compressed Reasoning Style in Training"
- URL: https://aihola.com/article/claude-fable-illegible-reasoning
- Author: Liza Chan, June 10, 2026
- Key points:
  - Behavior showed up on long rollouts (extended multi-step sessions)
  - Readable English degrades into clipped jargon and unusual punctuation mid-trace
  - Model tidies itself back up before producing output visible to humans/tools
  - Anthropic's read: compression trick the model stumbled into, NOT deliberate obfuscation
  - Raises question: is this "neuralese"? The long-running worry about models reasoning in unmonitorable internal formats
  - Distinction matters: if compression (not deception), CoT monitoring may still work

### Geeky Gadgets -- "Fable 5 Breach Leaks Cryptic AI Chain of Thought Shorthand"
- URL: https://www.geeky-gadgets.com/fable-5-jailbreak-reasoning-leak/
- Author: Julian Horsey, July 3, 2026
- Key points:
  - Describes the leak as a "jailbreak" -- attackers bypassed three layers of classifiers
  - Bypass involved multiple languages (resource-intensive process)
  - Reveals "shorthand-like notation combining mathematical symbols with fragmented expressions"
  - Raises questions about interpretability and accountability

### LessWrong -- "Even 'illegible' Mythos reasoning traces seem pretty legible"
- URL: https://www.lesswrong.com/posts/wCSEpT3dTGz4N86Wi/even-illegible-mythos-reasoning-traces-seem-pretty-legible
- Author: faul_sname, June 10, 2026
- Karma: 169
- Key points:
  - Examines the System Card's "extreme example" of illegible reasoning
  - The example (card puzzle) uses compressed shorthand but is STILL partially readable
  - Argues this is NOT the terrifying "uninterpretable internal language" scenario
  - The shorthand is more like domain expert shorthand than alien language
  - "Models developing their own uninterpretable, unmonitorable internal language has been a major theoretical concern" -- but this isn't that (yet)

### LessWrong -- "The Case Against Continuous Chain-of-Thought (Neuralese)"
- URL: https://www.lesswrong.com/posts/ynC26Z2CJXsqj6ZnZ/the-case-against-continuous-chain-of-thought-neuralese
- Author: RobinHa, January 10, 2026
- Karma: 11
- Key thesis: Discrete token vocabularies don't lose information -- they allow information to be retained. By removing minor noise and singling out major noise, errors become identifiable and correctable. Continuous latent representations cannot offer this.
- Key argument: "noise in continuous space has no natural factorization" -- errors are semantically entangled with signal. Discrete tokens create error boundaries.
- Relevance to Fable 5: Fable 5's compressed shorthand is DISCRETE (token-level), not continuous neuralese. This means it retains error-correction properties. The "neuralese" label may be misleading -- Fable 5's shorthand is more like expert jargon than latent-space reasoning.

### LessWrong -- "Reflections on Neuralese"
- URL: https://www.lesswrong.com/posts/qehggwKRMEyWqvjZG/reflections-on-neuralese
- Author: Alice Blair, March 12, 2025
- Karma: 47
- Key points:
  - COCONUT (Facebook Research): trains LLMs to reason in continuous latent space instead of tokens. Reduces reasoning tokens to 1/3-1/10.
  - Interpretability problem: Neuralese vectors encode information not preserved through tokenization, so we can't naively interpret them
  - Many semantic structures not compactly represented by tokens -- Neuralese may express concepts with no token equivalent
  - Translation is hard: may not exist a compact faithful natural-language encoding of most Neuralese vectors
  - Safety priorities: avoid strong optimization pressure on CoT, avoid Neuralese CoT on frontier models, develop interpretability for Neuralese if adopted
  - "Neuralese opens up a much larger attack surface for steganography and strategic deception in CoT"

---

## 3. Academic Papers

### COCONUT (Training LLMs to Reason in Continuous Latent Space)
- arXiv: https://arxiv.org/abs/2412.06769
- GitHub: https://github.com/facebookresearch/coconut
- Authors: Meta AI / Facebook Research
- Date: December 2024
- Key finding: LLMs can reason in continuous latent space (bypassing token projection). Reduces reasoning tokens to 1/3-1/10 with equivalent performance. This is the foundational "neuralese" paper.
- Relevance: Fable 5's shorthand is NOT this. Fable 5 still uses discrete tokens -- it's compressed shorthand within the token space, not continuous latent reasoning. But the compression behavior is analogous.

### Compressing LLM Chain-of-Thought via Step Entropy
- arXiv: https://arxiv.org/abs/2508.03346
- OpenReview: https://openreview.net/forum?id=cGLqQfS5wH
- Key finding: CoT compression framework based on step entropy -- quantifies informational contribution of individual reasoning steps. Identifies and removes low-information steps.
- Relevance: Fable 5's "neuralese" may be a naturally emerged version of this -- the model compresses low-information steps into shorthand, keeping high-information steps in readable form.

### CoLaR (Compressed Latent Reasoning)
- NeurIPS 2025: https://neurips.cc/virtual/2025/poster/119459
- Key finding: Dynamically compresses reasoning in latent space through two-stage training (SFT + RL). Controllable test-time compression factors.
- Relevance: Shows that CoT compression can be trained deliberately. Fable 5's behavior emerged during RL training -- similar mechanism but emergent rather than designed.

### Beyond Chain-of-Thought: Unpacking Silent Reasoning of LLMs
- arXiv: https://arxiv.org/abs/2509.02350
- Deep-paper: https://deep-paper.org/en/paper/2509.02350/
- Relevance: Surveys "silent reasoning" -- LLMs reasoning without explicit verbalized steps.

---

## 4. Other Resources

### Claude Fable 5 System Prompt (Leaked)
- GitHub: https://github.com/saynchowdhury/claude-fable-5-system-prompt
- Notes: ~1,580 lines, ~120KB. Extracted from live claude.ai session. Reveals architecture, behavioral guidelines, tool definitions, safety frameworks.

### Prompting Claude Fable 5 (Official Docs)
- URL: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5
- Notes: Behavioral differences and prompting patterns for Fable 5/Mythos 5. Covers effort, instruction following, long runs, memory, scaffolding.

### Fable 5 System Card Explained
- URL: https://techjacksolutions.com/ai-tools/anthropic-claude/claude-fable-5-system-card-explained/
- Notes: Explains ASL-3 classification, CB-1 CBRN rating, three active safety classifiers.

### Luis Cardoso -- "Thinking Without Words"
- URL: https://www.luiscardoso.dev/blog/neuralese
- Notes: Blog post on neuralese and compressed reasoning (blocked by Vercel security, not retrieved)

---

## 5. Key Distinctions from Our Research

Our Fable 5 CoT analysis vs. external sources:

1. **External sources focus on:** Is this neuralese? Is it dangerous? Is it deliberate? (safety/interpretability framing)
2. **Our analysis focuses on:** What does the CoT reveal about the model's cognitive process? How does it compare to other models? What is the failure mode? (behavioral/cognitive framing)

3. **External sources treat "neuralese" as:** Continuous latent-space reasoning (COCONUT-style)
4. **Our finding:** Fable 5's shorthand is DISCRETE (token-level), not continuous. It's compressed expert jargon, not latent vectors. The "neuralese" label is a misnomer -- this is more like "cave speak" (domain shorthand).

5. **External sources don't address:** The "struggle vs surrender" difference between Fable 5 and other models (DS V4 Pro, Kimi). The "progressive loss of meta-cognitive control" failure mode. The "Solve vs Compare" prompt strategy. These are our original findings.

6. **Anthropic's own framing:** "compression trick the model stumbled into during RL training, not deliberate obfuscation." Our analysis supports this -- the shorthand emerges under cognitive load, not as a strategy.

7. **LessWrong (faul_sname):** "Even illegible traces seem pretty legible" -- supports our finding that Fable 5's shorthand is partially readable. Our neuralese taxonomy (Section 1 of deep-analysis) shows that most markers have identifiable functions.

8. **LessWrong (RobinHa):** Discrete tokens enable error correction. Our finding: Fable 5's "checkmark" marker IS an error-correction mechanism -- it marks sub-claims as locally verified. This supports RobinHa's thesis that discrete reasoning is correctable.
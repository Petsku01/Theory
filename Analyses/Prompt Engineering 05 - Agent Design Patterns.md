# Agent Design Patterns

## Overview
An "agent" is a loosely defined term. For this article, an agent is an LLM that can take multi-step actions in the world: call tools, reason over the results, decide what to do next, and repeat until it finishes a task or gives up. The prompting patterns that make agents reliable are different from the patterns that make single-shot prompts work. This article covers the five patterns that currently dominate production agent design — ReAct, Reflection, Plan-and-Execute, Tool Use, and Multi-Agent Orchestration — and the honest trade-offs of each.

## The core loop
Every agent, no matter how elaborate, eventually reduces to a loop:

```
while not done:
    thought = llm.think(state)
    action = llm.choose_action(thought)
    result = world.execute(action)
    state = update(state, thought, action, result)
```

The patterns below are variations on what goes inside `think`, `choose_action`, and `update`.

## 1. ReAct (Reason + Act)
The original agent pattern, introduced by Yao et al. (2022). The model interleaves reasoning traces with tool calls in a fixed format:

```
Thought: I need to know the current weather in Paris.
Action: get_weather(city="Paris")
Observation: 18°C, partly cloudy
Thought: The user also asked about tomorrow's forecast.
Action: get_forecast(city="Paris", days=1)
Observation: Tomorrow: 22°C, sunny
Thought: I have enough information to answer.
Answer: Paris is currently 18°C and partly cloudy, with tomorrow's
forecast showing 22°C and sunny.
```

The prompt sets up this format with 1–3 few-shot examples and a list of available tools. Modern provider APIs have largely replaced the text-based `Action:` format with structured tool-calling (function calling), but the mental model is identical: the model alternates between thinking, acting, and observing.

**When ReAct works**: straightforward tasks with a small tool set, clear success criteria, and bounded depth.

**When it breaks**: long-horizon tasks where the model loses track of the goal, or tool sets large enough that the model struggles to pick the right one. ReAct agents tend to drift on tasks longer than ~10 steps.

## 2. Reflection
Reflection adds a self-critique step: after the agent produces a candidate answer, a second prompt asks the model (or a different model) to criticize the answer, and a third prompt asks the original model to revise based on the critique.

```
Step 1 — generate:
"Write a function that parses ISO-8601 timestamps with timezone handling."

Step 2 — reflect:
"Review the code above. List any bugs, missing edge cases, or style
issues. Be specific and cite line numbers."

Step 3 — revise:
"Rewrite the code to fix the issues identified in the critique. If any
issue is invalid, explain why and leave that part unchanged."
```

Reflection can be stacked: critique the critique, revise again, until a quality threshold is reached or a budget is exhausted. The research suggests reflection measurably improves accuracy on coding and reasoning benchmarks — one oft-cited result bumps HumanEval from ~80% to ~91% — though the exact numbers depend heavily on model and task.

**When reflection works**: tasks with objective quality criteria (code that compiles and passes tests, math with a checkable answer, structured data with a schema).

**When it breaks**: tasks with subjective quality (creative writing, tone). The critic can become pedantic or the reviser can overcorrect. Also, two-LLM critique loops can agree with each other on a confident wrong answer — "self-consistency on a bad premise."

## 3. Plan-and-Execute
Instead of improvising step by step like ReAct, the agent first produces an explicit plan, then executes each step.

```
Step 1 — plan:
"Break down the task 'migrate user data from old schema to new schema'
into a numbered list of sub-tasks. Each sub-task should be atomic and
independently verifiable."

Step 2 — execute (one prompt per step):
"Sub-task 3: Validate that the new schema accepts all records from
the old schema's customer table. Use the database_query tool to check."

Step 3 — integrate:
"Here are the results of all sub-tasks. Summarize the outcome and
identify any sub-tasks that failed."
```

Advantages over ReAct:
- The plan is visible and auditable before any actions run
- Steps can be parallelized when they don't depend on each other
- Failures are scoped to specific steps, so recovery is cleaner
- A human can review and modify the plan before execution

Disadvantages:
- Plans drawn up in advance can't react to surprises. If step 2's result invalidates step 4's premise, the agent needs a replan loop.
- Planning prompts are sensitive to task framing. A bad plan leads to confident execution of the wrong work.

**When plan-and-execute works**: clearly scoped tasks where the steps can be enumerated up front. Data migrations, document processing pipelines, structured research.

**When it breaks**: exploratory tasks where the next step depends on the previous result in unpredictable ways. "Debug this failing test" is a poor fit — you don't know the plan until you start investigating.

## 4. Tool Use
Tool use is both a standalone pattern and a building block used inside the others. The 2026 state of the art:

- **Structured schemas.** Every tool has a JSON Schema describing its parameters. The API validates calls against the schema before execution, so the model can't pass malformed arguments.
- **Clear descriptions.** The tool's description is the prompt — it determines when the model uses it. A vague description ("searches stuff") leads to bad tool selection; a precise one ("Queries the customer support knowledge base. Returns up to 5 articles matching the query. Use only for Acme product support questions, not general FAQs.") produces better behavior.
- **Narrow scope.** Each tool should do one thing. A `database_operations` tool that takes a `action: "read" | "write" | "delete"` parameter is worse than three separate tools, because the model will guess wrong under ambiguity.
- **Idempotence where possible.** Tools the model might retry should be safe to call twice.

Prompt-side guidance for tool use:

```
You have access to the following tools. Use a tool when the question
requires information you don't already have. Do not call a tool just
to double-check something you already know. After each tool call,
briefly explain what you learned before deciding whether to call
another tool or provide the final answer.

Tools:
{tool_descriptions}
```

The instruction not to call tools just to double-check addresses a common failure mode: models running up cost by redundantly verifying information they already emitted confidently.

## 5. Multi-Agent Orchestration
The newest and most hyped pattern: instead of one generalist agent, a "puppeteer" orchestrator dispatches work to specialist agents (researcher, coder, reviewer, planner) and integrates the results.

```
Orchestrator prompt:
"You coordinate a team of specialist agents. For each user request,
decide which specialist(s) to invoke, give them precise instructions,
and synthesize their responses. Available specialists:
- researcher: gathers information from the web and internal docs
- coder: writes and modifies code
- reviewer: critiques code or written work for correctness
- planner: breaks tasks into sub-tasks with dependencies"
```

Each specialist has its own prompt, its own tool subset, and its own context window. The orchestrator sees only summaries passed back from specialists, which prevents context blow-up on long tasks.

**When multi-agent works**: workloads with genuinely different sub-skills (research + coding + verification), long-running tasks where context isolation matters, or scenarios where specialists can use different (cheaper/smaller) models.

**When it breaks**: almost everywhere people reach for it prematurely. Specifically:
- **Debugging is exponentially harder.** When a 5-agent system produces a wrong answer, finding which agent failed and why is a nightmare.
- **Latency stacks.** Each agent boundary is an LLM call. A chain of 4 specialists is 4× the round-trip.
- **Cost explodes nonlinearly.** Shared context between agents is hard, so each agent re-reads task context.
- **The orchestrator becomes the bottleneck.** Its prompt has to understand every specialist's capabilities, which recreates the generalist problem.

A useful heuristic: start with one agent and one good tool set. Only split into multiple agents when you have concrete evidence that the single-agent version fails in ways a smaller-scoped specialist could fix.

## Picking a pattern

| Task shape | Start with |
|------------|------------|
| Single-call Q&A with tools | ReAct or raw tool-use |
| Code generation / structured output where correctness is checkable | Reflection |
| Multi-step task with enumerable sub-steps | Plan-and-Execute |
| Exploratory, branching investigation | ReAct with higher step budget |
| Workloads mixing research + writing + verification | Multi-agent, reluctantly |

Most production systems are ReAct with structured tool calling and an optional reflection step for critical outputs. The fancier patterns get more attention in blog posts than in shipping products.

## The honest problems with agents
Agent systems are still fragile. The specific failure modes you should plan for:

1. **Loops.** Agents get stuck retrying the same action. Always enforce a step budget and an action-history check ("you already tried this action with these arguments").
2. **Context drift.** On long tasks, early instructions get crowded out by later tool outputs, and the agent forgets the goal. Periodically re-inject the original task.
3. **Confident hallucination of tool results.** If a tool fails and you pass the error back, the model may decide the tool "probably returned X" and continue as if it had. Parse tool responses strictly.
4. **Goal misalignment.** The agent optimizes for its literal instructions, not for what you meant. "Fix the failing test" can result in `assert True`. Add checks that the test actually covers something.
5. **Cost runaway.** A poorly-specified agent can burn through thousands of dollars of tokens on a task that should have cost cents. Always set hard token budgets.

## Safety and authorization
An agent with tools is a program that can take actions. Treat it accordingly:

- **No irreversible actions without confirmation.** Deleting data, sending money, publishing content, merging PRs — these should require explicit human approval, not just "the LLM decided to."
- **Principle of least privilege.** Give the agent the narrowest tool scope that lets it do the job. An agent that needs to read a database doesn't need write access.
- **Log everything.** Every thought, tool call, and observation. When an agent does something you didn't expect, the trace is the only way to understand why.
- **Bound the blast radius.** If the agent goes off the rails, what's the worst thing that can happen? Make sure the answer is "a failed task," not "customer data is deleted."

## Summary
Agent design is less about clever prompting and more about designing the right feedback loop, tool surface, and safety boundary. ReAct is the default; Reflection helps on checkable tasks; Plan-and-Execute helps when you can enumerate steps; Multi-agent systems are powerful but usually overkill. The failure modes — loops, drift, hallucinated tool results, runaway cost — are predictable, so plan for them up front rather than discovering them in production. Build the smallest agent that can do the job, measure it, and only add complexity when you can point to a specific failure it fixes.

Sources:
- [Prompt Engineering Guide — LLM Agents](https://www.promptingguide.ai/research/llm-agents)
- [Agentic Design Patterns 2026 — SitePoint](https://www.sitepoint.com/the-definitive-guide-to-agentic-design-patterns-in-2026/)
- [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [IBM — What is a ReAct Agent?](https://www.ibm.com/think/topics/react-agent)

-pk

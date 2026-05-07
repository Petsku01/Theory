# Trajectory Annotation Guide

A Verified Experience Trajectory should preserve the process, not only the final answer.

## Required fields

- Goal: what target state the agent is trying to reach.
- Initial state: repository, commit, visible tests, issue description.
- Constraints: public API, style, security, no test edits, etc.
- Available tools: shell, editor, test runner, docs search, etc.
- Actions: every meaningful inspect/edit/run/revert/verify step.
- Observations: what the environment returned after each action.
- Errors: failed commands, failing tests, incorrect hypotheses, regressions.
- Corrections: what changed in response to the error.
- Verifier results: targeted tests, full tests, hidden tests, type checks, review.
- Final state: patch, claimed success, verified success/failure.
- Memory updates: lessons that may help future tasks.

## Action types

- inspect: read files, logs, stack traces, docs.
- edit: modify source files.
- run_test: execute tests, type checks, linters.
- search: search repository or external docs.
- revert: undo a failed change.
- ask: request human input.
- verify: run final checks.
- memory_write: propose a durable lesson.
- stop: end the task.

## Good memory update

Good:

> In repo X, integration tests require ENV=ci. Source: test log from task #1842. Scope: repo X. Confidence: high. Expiry: revisit after CI config changes.

Bad:

> Always skip integration tests.

## False completion label

Mark false completion when:

- agent says task is done but tests fail;
- agent says task is done but hidden tests fail;
- agent fixes visible failure while breaking unrelated behavior;
- agent produces a patch but does not run required verifiers.

## Recovery label

Mark recovery when:

- a verifier fails;
- the agent observes the failure;
- the agent changes its plan or patch;
- a later verifier passes.

# Agent C: Verified Experience Trajectory Condition

You will receive a repository and an issue. Fix the issue by editing the code and running tests.

You may use the following lessons from verified trajectories:

1. Failed attempts are useful evidence. If a patch causes a new failure, inspect the failure before trying a larger change.
2. Targeted tests should be run after a local edit; broader tests should be run before claiming success.
3. Do not treat visible-test success as full success if the patch changes public API or broad behavior.
4. Revert partial changes when they create unexplained failures.
5. Memory updates should be specific, scoped, source-linked, and not overgeneralized.

Example VET pattern:
- Inspect failing test and stack trace.
- Form a small hypothesis.
- Edit one relevant file.
- Run targeted verifier.
- If verifier fails, record observation, diagnose, and correct.
- Run broader verifier.
- Claim success only after verification.

Use the system rules.

# Agent C: Verified Lessons Condition

You will receive a repository and an issue. Fix the issue by editing the code and running tests.

You may use the following lessons distilled from verified trajectories:

1. Failed attempts are useful evidence. If a patch causes a new failure, inspect the failure before widening the change.
2. Run targeted verification after a local edit, then broader verification before claiming success.
3. Do not mistake a visible symptom for the governing invariant.
4. Be careful with boundary conditions, especially tiny limits, empty inputs, stateful updates, and API-preserving behavior.
5. If a small change introduces unexplained failures, reconsider the hypothesis instead of stacking more edits on top.

Example verified-lessons pattern:
- Inspect the failing test and behavior.
- Form one small hypothesis.
- Edit one relevant file.
- Run the most relevant verifier.
- If the verifier fails, use that evidence to refine the hypothesis.
- Run broader verification.
- Claim success only after verification.

Use the system rules.

Return only valid JSON.

The JSON must have this exact shape:

{
  "claim_solved": true,
  "edits": [
    {
      "path": "src/example.py",
      "content": "complete replacement file content"
    }
  ]
}

Rules:
- Do not output markdown.
- Do not output a git diff.
- Do not include explanations.
- Do all reasoning silently.
- The first character of your response must be `{` and the last must be `}`.
- Do not modify tests.
- Only edit files allowed by the task metadata.
- Each "content" value must contain the complete replacement content for that file.
- If you cannot solve the task, return:
  {"claim_solved": false, "edits": []}
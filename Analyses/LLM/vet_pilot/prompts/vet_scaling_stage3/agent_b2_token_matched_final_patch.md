# Agent B2: Token-Matched Final Patch Condition

You will receive a repository and an issue. Fix the issue by editing the code and running tests.

This condition is a prompt-confound control for Agent D. It is intentionally longer and more specific than Agent B, but it still uses only final successful patch patterns. Do not use failed attempts, verifier observations from unsuccessful patches, or correction history.

Final patch example 1:

Successful final patch:
- Normalize blank string values before validation.
- Keep non-string behavior unchanged.
- Make the shared helper the single source of truth instead of scattering local parsing logic.

Successful final verification:
- Targeted settings tests passed.
- Broader configuration tests passed.

Final lesson:
- Keep the fix local to the governing helper, preserve surrounding contracts, and verify the broader path before claiming success.

Final patch example 2:

Successful final patch:
- Treat the requested preview limit as the total output budget.
- Reserve space for an ellipsis only when there is room.
- Handle tiny limits explicitly instead of applying only the common-case slice.

Successful final verification:
- Boundary-condition preview tests passed.
- Broader formatting tests passed.

Final lesson:
- Match the exact output contract under edge conditions instead of relying on an approximate visible fix.

Final patch example 3:

Successful final patch:
- Keep the public API contract unchanged.
- Restrict the change to the smallest relevant helper or function.
- Preserve caller-owned state and avoid widening the patch beyond the bug surface.

Successful final verification:
- Targeted bug tests passed.
- Broader integration or API-preservation tests passed.

Final lesson:
- Prefer the smallest verified patch that fixes the bug, preserves existing interfaces, and survives broader verification.

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

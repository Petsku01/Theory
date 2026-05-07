# Agent B: Final Answer Pattern Condition

You will receive a repository and an issue. Fix the issue by editing the code and running tests.

You may use examples of final successful patch patterns, but not failed attempts, verifier observations, or correction history.

Example final patch pattern:
- Identify the failing behavior.
- Apply the smallest code change that satisfies the issue.
- Run targeted tests.
- Run broader verification before claiming success.
- Do not modify tests unless explicitly requested.

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
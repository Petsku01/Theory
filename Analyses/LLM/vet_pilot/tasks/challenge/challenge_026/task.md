# challenge_026

`build_report` treats entries without an explicit `archived` flag as archived. Missing flags should behave like active entries, and the public function signature must stay unchanged.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve the public function name and parameter list.
- Keep the returned dictionary keys unchanged.

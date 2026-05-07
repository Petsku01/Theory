# challenge_027

`build_auth_header` should reject blank tokens after trimming and return a header without stray whitespace, while preserving the public API and default scheme.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve the public function signature and default scheme.
- Reject blank tokens after normalization.

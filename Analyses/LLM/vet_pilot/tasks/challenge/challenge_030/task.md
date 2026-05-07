# challenge_030

`load_endpoint` uses environment configuration even when an explicit endpoint is provided, and blank environment values still override the default path. Explicit configuration should win over environment configuration.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public API of `load_endpoint` unchanged.
- Normalize whitespace-only values before applying precedence.

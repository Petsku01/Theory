# challenge_009

`resolve_timeout` treats `0` as if the caller had not provided a value. That is incorrect:
`0` is a valid explicit timeout.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the patch minimal.
- Preserve the public API.

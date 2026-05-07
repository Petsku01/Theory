# challenge_007

`build_headers` is returning a mutated copy of the caller-provided `extra` mapping and uses
the token in the wrong authorization format.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve the public API exactly.
- Do not mutate the input mapping.

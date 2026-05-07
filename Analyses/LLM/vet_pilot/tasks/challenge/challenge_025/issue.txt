# challenge_025

`split_qualified_name` currently splits on the first dot. Qualified names with nested modules should split on the final dot instead.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the `(module, name)` return shape unchanged.
- Return an empty module string when there is no dot.

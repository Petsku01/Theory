# challenge_011

`split_batches` should reject non-positive batch sizes. The current implementation quietly returns incorrect output for `size == 0` and negative sizes.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve ordering for valid batch sizes.
- Raise `ValueError` for non-positive sizes.

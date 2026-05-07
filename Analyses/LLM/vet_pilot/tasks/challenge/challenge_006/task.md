# challenge_006

`format_price` currently rounds by converting through `float`, which produces the wrong
result for some decimal values.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the return type as a string with exactly two decimal places.
- Invalid values should still raise `ValueError`.

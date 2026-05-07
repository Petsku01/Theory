# challenge_012

`previous_month` does not handle the January rollover correctly. It currently stays in January instead of returning December of the previous year.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public return shape `(year, month)` unchanged.
- Preserve input validation for invalid months.

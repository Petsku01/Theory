# challenge_019

`split_csv_line` uses a naive comma split. The bug is not just whitespace trimming: quoted commas must stay inside the same field.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public return type unchanged.
- Use a standard CSV parser instead of hand-rolled splitting.

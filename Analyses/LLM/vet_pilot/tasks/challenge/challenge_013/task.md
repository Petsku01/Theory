# challenge_013

`format_port_range` should render a singleton range as a single port. The current implementation always returns `start-end`, even when both ends are the same port.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep validation for reversed ranges.
- Preserve the existing string format for non-singleton ranges.

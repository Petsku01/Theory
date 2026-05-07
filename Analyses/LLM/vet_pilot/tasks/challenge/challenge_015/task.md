# challenge_015

Tag normalization is inconsistent across files. `parse_tags` leaves whitespace and empty entries intact, and `normalize_tag_list` bypasses the shared parser helper entirely.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public function names unchanged.
- Use the shared parser helper instead of duplicating split logic.

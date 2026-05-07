# challenge_028

`join_segments` drops the leading root marker when the first segment is empty. The fix needs to preserve absolute paths without introducing duplicate separators.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public function name unchanged.
- Do not break relative path joins.

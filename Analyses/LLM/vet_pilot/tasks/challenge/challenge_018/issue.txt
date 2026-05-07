# challenge_018

`join_url` is collapsing every double slash, which also corrupts the `http://` and `https://` scheme separator. The fix needs to normalize boundaries without rewriting the scheme.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public function name unchanged.
- Do not hardcode a specific scheme.

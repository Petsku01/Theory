# challenge_029

`collapse_blank_lines` loses the trailing newline whenever it normalizes a text block. The fix needs to preserve the previous no-extra-newline behavior for inputs that did not end with a newline.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public function name unchanged.
- Preserve the single-blank-line behavior while fixing the newline regression.

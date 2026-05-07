# challenge_017

`render_preview` should never exceed the requested character limit. The obvious slice-only fix is incomplete because very small limits cannot fit an ellipsis.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public function name unchanged.
- Preserve the existing validation for negative limits.

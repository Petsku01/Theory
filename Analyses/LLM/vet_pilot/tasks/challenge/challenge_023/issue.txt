# challenge_023

`parent_domain` mishandles fully-qualified hostnames with a trailing dot. The trailing dot should not leak into the parent domain result.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public function name unchanged.
- Return an empty string when there is no parent domain.

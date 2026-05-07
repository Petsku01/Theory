# challenge_014

The timeout key rename from `timeout` to `connect_timeout` is only partially applied. The helper still returns the old key and the request builder still looks up the old key.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public API of `build_request_options` unchanged.
- Use the shared timeout key instead of duplicating string literals.

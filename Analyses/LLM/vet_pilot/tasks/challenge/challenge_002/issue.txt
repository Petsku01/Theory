# challenge_002

Environment overrides in `load_settings` are not consistently parsed. Some values stay as
strings, some bypass the shared parser helpers, and blank values should not overwrite
defaults.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public API of `load_settings` unchanged.
- Use the shared parser helpers instead of duplicating parsing logic.

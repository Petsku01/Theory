# challenge_010

`load_backend` uses a config value to import a backend implementation, but short backend names
such as `memory` should resolve to the package-local backend modules. Unknown backends should
raise `ValueError` instead of leaking import errors.

Fix the bug.

Constraints:
- Do not modify tests.
- Preserve the public API of `load_backend`.
- Support both short config names and fully qualified module paths.

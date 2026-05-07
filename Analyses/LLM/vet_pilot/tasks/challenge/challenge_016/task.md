# challenge_016

Alias normalization is inconsistent across files. The helper keeps untrimmed targets, and the resolver rebuilds its own lookup instead of using the shared normalization path.

Fix the bug.

Constraints:
- Do not modify tests.
- Keep the public APIs of both functions unchanged.
- Reuse the shared alias normalizer in the resolver.

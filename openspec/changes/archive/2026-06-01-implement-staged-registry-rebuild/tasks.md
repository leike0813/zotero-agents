## 1. Basis and Rebuild Runs

- [x] 1.1 Add Registry run/basis metadata and repository APIs.
- [x] 1.2 Stage full rebuild candidate state separately from active reads.
- [x] 1.3 Implement validation checks for identity, binding, redirect, reference, count, durable-effect, and diagnostic boundaries.
- [x] 1.4 Implement promote and rollback paths.

## 2. Verification

- [x] 2.1 Add tests for failed candidate keeping active basis unchanged.
- [x] 2.2 Add tests for suspicious candidate blocking promotion.
- [x] 2.3 Add tests for rollback to last-known-good and graph rebuild enqueue.
- [x] 2.4 Run focused tests and `openspec validate implement-staged-registry-rebuild --strict`.

# Tasks

## OpenSpec

- [x] Add delta specs for digest apply, related-items sync, graph/cache invariants, and performance.
- [x] Remove active spec requirements for `literature-digest.auto_reference_matching`.
- [x] Update conflicting active change text that describes automatic related-items sync as a non-goal.

## Workflow

- [x] Remove `auto_reference_matching` from `literature-digest/workflow.json`.
- [x] Remove digest apply imports and branches that call `applyReferenceMatchingToNote()`.
- [x] Update digest workflow tests to assert the option/path is removed or ignored.

## Service

- [x] Split `syncRelatedItemsNow()` into reusable scoped/full related-items sync kernel.
- [x] Add graph-cache fast path and sidecar-fact fallback edge resolver.
- [x] Wire digest apply, Reference Sidecar refresh, and Advanced Matching to trigger related-items sync after graph refresh attempts.
- [x] Ensure related-items sync does not call graph cache rebuild, artifact scan, reference extraction, or matcher.

## Tests

- [x] Add or update service tests for scoped sync with graph cache and sidecar fallback.
- [x] Add idempotency test for repeated related-items sync.
- [x] Add static guards for removed digest auto matching and related-items no-rebuild path.
- [x] Run targeted tests, TypeScript check, build, and OpenSpec validation.

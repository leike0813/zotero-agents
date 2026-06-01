## 1. Runtime Behavior

- [x] 1.1 Normalize discovery hint statuses to `open`, `rejected`, and `superseded`.
- [x] 1.2 Preserve rejected hints during `rebuildTopicDiscoveryHints`.
- [x] 1.3 Remove discovery hint accept service/UI actions.
  Existing Workbench/service code had no discovery hint accept action; no UI deletion
  was required.

## 2. Verification

- [x] 2.1 Add repository tests for legacy status normalization and rejected suppression.
- [x] 2.2 Add UI/action tests for reject/restore-only behavior.
  Covered by repository/action absence check; no UI action exists to assert.
- [x] 2.3 Run focused tests and `openspec validate simplify-synthesis-topic-discovery-hints --strict`.

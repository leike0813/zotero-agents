## 1. Red Tests

- [x] 1.1 Update production Workbench tests to require all four client read routes while preserving request, stale-result, region identity, and transient-error behavior.
- [x] 1.2 Extend service-boundary tests to forbid the four migrated legacy reads in production Workbench and retain exactly four direct consumers.
- [x] 1.3 Extend client and read-only harness tests for shared UI conversion and `storage_busy` mapping.

## 2. Shared Adapter and Error Contract

- [x] 2.1 Add a shared Workbench UI adapter for JSON-safe read state, opaque snapshot projections, and digest DTO conversion.
- [x] 2.2 Add stable `storage_busy` client error code and recognize SQLite busy before generic in-process error normalization.

## 3. Production and Harness Migration

- [x] 3.1 Lazily resolve the default client and migrate production chrome, surface, Topic detail, and digest UI reads without adding a full-snapshot route.
- [x] 3.2 Preserve surface request identity, latest-request and active-surface guards, dirty/loaded state, last-known-good snapshots, message structure, merge order, update eligibility, export, and graph-layout refresh behavior.
- [x] 3.3 Reuse the shared UI adapter from the read-only harness and remove its duplicate state and digest conversion.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis documentation for migrated production UI reads and the remaining legacy Workbench command plane.
- [x] 4.2 Run contract/root typechecks, focused core and UI harness tests, service-boundary and Synthesis invariant checks, targeted format/lint checks, and the production build.
- [x] 4.3 Run strict OpenSpec validation and confirm all change requirements and tasks are complete.

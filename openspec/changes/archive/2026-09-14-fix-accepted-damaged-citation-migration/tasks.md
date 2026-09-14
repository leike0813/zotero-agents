## 1. Parent-Set Verification Boundary

- [x] 1.1 Change the existing Zotero core-lite regression to reproduce a successful Citation commit whose enriched return detail exceeds 1 MiB.
- [x] 1.2 Remove public enrichment from private parent-set verification and verify the commit returns canonical detail successfully.

## 2. Citation Snippet Compaction

- [x] 2.1 Add focused synthesis-contract tests for Unicode-safe prefix and marker-centered snippet compaction with unchanged artifact structure.
- [x] 2.2 Implement the shared pure compactor and export it from the existing contract package.
- [x] 2.3 Add apply-analysis regressions for the opt-in 512-code-point default, exact managed-envelope fallback, structured compaction reporting, and strict direct upsert behavior.
- [x] 2.4 Implement opt-in Workflow Host/Broker compaction and ensure the built-in literature-analysis workflow passes the flag, returns the report, and sends the persisted Citation artifact to the sidecar.

## 3. Migration Repair and Batch Progress

- [x] 3.1 Replace accepted-damaged-input tests with regressions for a 1–4 MiB recoverable Citation, canonical References reuse, nested legacy Citation facts, Citation-only repair, real verified counts, and blocking unrecoverable input.
- [x] 3.2 Implement the migration-only 4 MiB read, remove the acceptance bypass, repair oversized Citation data with shared compaction, write only changed kinds, and advance the definition version to 6.
- [x] 3.3 Add table-driven migration-service regressions proving safe terminal local failures continue while repair-required, residual, ambiguous, infrastructure, cancellation, and unavailable outcomes stop.
- [x] 3.4 Derive private continuation safety from typed authority results and preserve per-set receipts while completing later safe candidates with attention.

## 4. Documentation and Verification

- [x] 4.1 Update migration and managed-artifact documentation, regenerate embedded help documentation, and align terminology with the delta specs.
- [x] 4.2 Run focused tests, synthesis-contract checks, OpenSpec strict validation, relevant static checks, and the plugin build.
- [x] 4.3 Read-only rescan or fixture-equivalent verification SHALL confirm the three reported collection shapes no longer become `no_references`; no real-library mutation is part of automated verification.

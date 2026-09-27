## 1. Legacy Concept and Tag compatibility

- [x] 1.1 Add a Rust decoder regression for a persisted Concept proposal containing local_id and assert the public Concept/Workbench projection remains valid; verify the test fails before the decoder change.
- [x] 1.2 Canonicalize local_id in the Concept proposal decoder while retaining strict rejection of unrelated unknown fields; verify the decoder and native Concept surface tests pass.
- [x] 1.3 Add a staged-tag promotion regression selecting more than 100 valid suggestions and assert one logical mutation promotes all eligible tags; verify the test fails before removing the incorrect request cap.
- [x] 1.4 Remove only the application-level 100-item request rejection and retain the existing 100-item effect batching; verify application and native Tag surface tests pass for large, empty, duplicate, and stale-basis selections.

## 2. Legacy Topic identity and durable receipt projection

- [x] 2.1 Add sanitized fixtures covering canonical 16-character Topic paths, legacy 9-character paths, current-invalid/legacy-valid precedence, and graph/application path projection; verify resolver tests fail for the uncovered cases.
- [x] 2.2 Extend the existing migration/reconciliation owner to canonicalize Topic artifact paths and make read, receipt, debug, and recovery lookups use the same fallback policy; verify migration and cross-boundary identity tests pass without a new persistence trait.
- [x] 2.3 Add public maintenance receipt regressions for worker-private failure results and pre-existing invalid durable diagnostics; verify strict receipt validation fails before the projection change.
- [x] 2.4 Canonicalize maintenance receipts at terminal write and read boundaries for success, failure, cancellation, timeout, and spawn failure; verify all public operation views pass the existing MaintenanceReceipt validator.

## 3. Topic protocol projection

- [x] 3.1 Add a real nested Topic artifact fixture containing the observed extra source-paper, topic, summary, and coverage fields; verify the current topic detail wire fails the strict capability validator.
- [x] 3.2 Implement explicit Topic detail projection from stored artifact data to the existing public schema, including ResolvedPaper, manifest, metadata, defaults, and unavailable diagnostics for unprojectable required fields; verify topic detail and protocol contract tests pass.

## 4. Trace dashboard observability

- [x] 4.1 Add dashboard tests for failed/active prioritization, bounded visible rows, selected-trace retention, and trace/operation/capability filtering; verify they fail against the current full-list renderer.
- [x] 4.2 Implement bounded trace presentation and coalesce diagnostic-update refreshes without changing the bounded trace store; verify core observability and dashboard UI tests pass.

## 5. Citation Graph refresh and layout application

- [x] 5.1 Add a Workbench regression for first rebuild accepted -> ready -> graph refresh -> layout display, including a transient busy read; verify it fails before the refresh follow-up exists.
- [x] 5.2 Add a Sigma regression where modelSignature is unchanged and layoutSignature changes, asserting node coordinates are updated; verify it fails against the current fast path.
- [ ] 5.3 Add or update a native layout quality fixture for finite coordinates, non-collapsed extent, and reviewed spacing/edge-length thresholds without exact coordinate assertions; verify the fixture distinguishes native layout failure from stale frontend coordinates.
- [x] 5.4 Implement bounded post-terminal graph refresh/retry and layout-only coordinate application; verify Workbench graph tests show the first rebuild without a second click and preserve last-good graph state on refresh failure.

## 6. Integration verification

- [x] 6.1 Run the affected Rust application/sidecar tests, TypeScript protocol and UI tests, and Citation Graph layout tests; record any unrelated pre-existing failures separately.
- [ ] 6.2 Run sidecar contract checks, TypeScript type/lint/build checks, and npm run check:synthesis-sidecar-runtime-freshness.
- [ ] 6.3 Smoke-test the five reported flows against a sanitized copy of the user profile database: Concept page, bulk tag promotion, Topic detail, advanced matching, and first Citation Graph rebuild/layout.
- [x] 6.4 Review the diff for owner-boundary compliance, absence of schema relaxation/new dependencies/unbounded retention, and leave the repository without committing Git history.

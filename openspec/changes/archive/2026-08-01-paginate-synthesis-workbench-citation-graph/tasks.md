## 1. Contracts and Window State

- [x] 1.1 Add failing contract tests for bounded pages, basis-bound cursors, filters, endpoint closure, and typed failures
- [x] 1.2 Extend Citation Graph and sidecar error DTOs plus the contract corpus with window, filter, basis, metadata, and slice fields
- [x] 1.3 Add failing TypeScript tests and implement the shared Graph window merge, generation guard, soft-limit, resume, retry, and slice rules

## 2. Repository and Native Read Surface

- [x] 2.1 Add failing repository/runtime tests for large deterministic paging, full-graph filters, endpoint closure, cursor mismatch, and neighborhood directions
- [x] 2.2 Implement bounded repository counts, node/edge/hover pages, distinct roles, and endpoint batch reads
- [x] 2.3 Replace unbounded Workbench, overview, and slice projections with one response-budgeted basis-bound native window surface
- [x] 2.4 Add readiness tests and implement idempotent additive schema verification with `repository_schema_incompatible`

## 3. Error and Client Boundaries

- [x] 3.1 Add failing observability/client tests for basis, schema, repository, and response-size failures
- [x] 3.2 Preserve stable sidecar codes and bounded safe reasons through HTTP routing, diagnostics, and TypeScript native composition

## 4. Workbench Host and UI

- [x] 4.1 Add failing host/UI tests for serial loading, cancellation, stale generations, soft-limit pause/resume, retry, and complete default-size loading
- [x] 4.2 Integrate Graph window requests and typed progress state into the Workbench adapter, tab owner, and UI model
- [x] 4.3 Apply page and slice patches incrementally in the iframe while preserving Sigma, camera, control drawer, and selection drawer identity
- [x] 4.4 Add localized progress, pause, continue, retry, direction, and stable failure labels for every supported locale

## 5. Neighborhood and Export

- [x] 5.1 Add failing tests and implement incoming, outgoing, and bidirectional one-hop expansion without advancing the page cursor
- [x] 5.2 Add failing tests and implement complete topic/layout page aggregation with typed export safety-limit failure

## 6. Documentation and Verification

- [x] 6.1 Document Graph window, basis invalidation, soft limits, neighborhood expansion, export completeness, and database/cache ownership
- [x] 6.2 Run strict OpenSpec, focused TypeScript/UI, contract, production capability, surface parity, localization, TypeScript, Rust format/check/test, and exact-sidecar smoke verification

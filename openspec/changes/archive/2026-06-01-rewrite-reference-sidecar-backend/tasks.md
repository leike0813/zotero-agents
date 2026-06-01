## 1. OpenSpec and Docs

- [x] 1.1 Add delta specs for Sidecar refresh, graph cache rebuild, Workbench UI, operation progress, MCP diagnostics, performance budgets, invariant guards, and docs.
- [x] 1.2 Update Synthesis docs to describe split Reference Sidecar refresh and Citation Graph cache rebuild.
- [x] 1.3 Remove active-doc claims that Reference refresh rebuilds graph data, that layout rebuild rebuilds graph data, or that legacy state/projection files drive readiness.
- [x] 1.4 Validate `rewrite-reference-sidecar-backend` with strict OpenSpec validation.

## 2. Repository and Runtime State

- [x] 2.1 Add or consolidate repository helpers for explicit operation lifecycle and cache-basis ready/stale/failed transitions.
- [x] 2.2 Add cleanup/ignore behavior for legacy sidecar state files, projection files, and stale failed Reference Sidecar operations when cache basis is ready.
- [x] 2.3 Ensure terminal operation rows do not become data readiness signals.

## 3. Service Rewrite

- [x] 3.1 Rewrite `refreshReferenceSidecarNow` as scan/diff/extract/canonicalize/bind only.
- [x] 3.2 Make refresh success mark `reference-sidecar:library` ready and `citation-graph:library` stale.
- [x] 3.3 Make refresh failure preserve any previous ready sidecar cache basis.
- [x] 3.4 Add `rebuildCitationGraphCacheNow` and `retryCitationGraphCacheRebuild`.
- [x] 3.5 Remove active Sidecar calls to legacy Registry projection services and full-index replacement APIs.

## 4. Workbench, Host, and Diagnostics

- [x] 4.1 Add host/UI commands and labels for graph cache rebuild/retry.
- [x] 4.2 Change Graph stale/missing action to graph cache rebuild, leaving layout rebuild layout-only.
- [x] 4.3 Make background jobs derive from real operation rows, not legacy state-file fallbacks.
- [x] 4.4 Update MCP/debug diagnostics to report operation/cache-basis state without starting work.

## 5. Tests and Guards

- [x] 5.1 Add regression coverage for failed-state-file residue not creating a failed Workbench job after successful refresh.
- [x] 5.2 Add tests that refresh marks graph cache stale and does not generate graph cache rows.
- [x] 5.3 Add tests for explicit graph cache rebuild generating nodes/edges/light metrics and marking graph cache ready.
- [x] 5.4 Add static guards against legacy projection APIs in active Sidecar paths.
- [x] 5.5 Run targeted core tests, TypeScript check, build, and OpenSpec validation.

## 6. State Simplification Follow-Up

- [x] 6.1 Collapse Reference Sidecar and Citation Graph cache readiness to `missing`, `refreshing`, `ready`, `stale`, and `failed`.
- [x] 6.2 Replace Index row readiness/resolution filters with artifact coverage and minimal binding status.
- [x] 6.3 Normalize legacy `auto`/`confirmed` binding rows to `accepted` without adding new entities.
- [x] 6.4 Update Workbench, review input, docs, specs, and tests for the simplified state model.

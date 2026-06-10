# Tasks

## OpenSpec

- [x] Add delta specs for sidecar graph deferral and post-graph related-items sync.
- [x] Validate the OpenSpec change strictly.

## Service

- [x] Add a related-items stale marker that records scoped sidecar-change diagnostics without reading graph rows.
- [x] Update `applyLiteratureDigestSidecar` to mark graph and related-items stale without triggering graph refresh or related-items sync.
- [x] Update `refreshReferenceSidecarNow` to mark graph and related-items stale without triggering graph refresh or related-items sync.
- [x] Return final `affected_source_refs` from graph incremental refresh.
- [x] Run scoped related-items sync after `refreshCitationGraphCacheIncrementalNow` succeeds.

## Docs

- [x] Update active Synthesis docs and contracts for the deferred sidecar cascade model.

## Tests

- [x] Update digest apply, Reference Sidecar refresh, manual graph refresh, UI/static guard tests.
- [x] Run TypeScript, eslint, OpenSpec validation, and targeted mocha suites.

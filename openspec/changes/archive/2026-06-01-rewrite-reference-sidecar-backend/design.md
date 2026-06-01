## Context

The previous hard cut introduced sidecar tables, but the active runtime still has several state sources for the same user-visible task: `synt_operation`, `reference-sidecar-state.json`, legacy graph projection files, cache basis rows, and Workbench local pending actions. Because some of these sources are legacy projections, a successful refresh can still be presented as failed.

The rewrite constrains this area to two independent operations:

1. Reference Sidecar refresh updates reference-sidecar cache rows.
2. Citation Graph cache rebuild derives graph cache rows from the current sidecar.

## Decisions

1. **Operation progress and data readiness are separate.**

   `synt_operation` records work progress, failures, and retryable terminal rows. `synt_cache_basis` records whether a cache view is ready, stale, failed, or missing. A terminal failed operation does not imply existing cache data is unusable.

2. **Reference refresh does not rebuild graph cache.**

   Refresh scans artifact sidecars, diffs references hashes, extracts only changed references, canonicalizes, and applies bounded best-effort bindings. On success it marks `reference-sidecar:library` ready and `citation-graph:library` stale.

3. **Graph cache rebuild is explicit.**

   `rebuildCitationGraphCacheNow` loads active raw references, resolves effective canonical references, applies accepted bindings, writes citation graph cache rows and lightweight metrics, and marks `citation-graph:library` ready.

4. **Legacy Registry projection is isolated.**

   Active Sidecar refresh, Workbench snapshot, Index data source, Graph cache rebuild, and MCP/debug cache status must not call legacy full-index replacement, sidecar projection refresh, or old registry fact listing APIs.

5. **Docs are part of the contract.**

   Active docs must describe split refresh/rebuild behavior, operation/cache-basis state, and Graph data rebuild vs layout rebuild separation.

## Failure Behavior

- A failed Reference Sidecar refresh records a failed operation row and diagnostics.
- If a previous `reference-sidecar:library` basis is ready, it remains ready.
- A failed Graph cache rebuild records a failed operation row and preserves previous graph cache rows/basis.
- Workbench shows failed operation rows only when they are real recent terminal operations, not inferred from legacy state files.

## Migration

On initialization or first Sidecar operation, legacy state/projection artifacts
are ignored or cleaned:

- legacy sidecar state files
- old reference-cache/reference-sidecar projection files
- stale failed operation rows for legacy Reference Sidecar labels where cache basis is already ready

No compatibility migration of old Registry projection data is required.

## Risks

- Splitting refresh and graph rebuild makes Graph cache stale more often. Workbench must show an explicit rebuild action and clear stale diagnostics.
- Legacy checkpoint/import paths must not recreate old Registry services or full projection caches.

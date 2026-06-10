# Design

## Ordering Model

Sidecar update paths become short write operations:

1. write artifact/reference/binding sidecar facts;
2. mark `citation-graph:library` stale with source/canonical delta diagnostics;
3. mark `related-items-sync:global` stale with the same source scope;
4. notify Workbench surfaces.

They do not run graph incremental refresh or related-items sync.

Manual graph maintenance is the follow-up operation:

1. `refreshCitationGraphCacheIncrementalNow` reads the stale graph delta;
2. graph incremental refresh rewrites affected graph slices and complex metrics;
3. the public wrapper runs related-items sync scoped to the final affected source refs;
4. failures in related-items sync are recorded on the sync operation and do not roll back graph readiness.

## Scope Preservation

`refreshCitationGraphCacheIncremental` must return the final `affected_source_refs` computed after expanding changed canonical/binding/redirect ids. This prevents a stale delta containing only canonical ids from becoming a full-library related-items sync.

## Related-Items Stale State

Related-items stale marking must not depend on the current graph rows. The graph cache may be old when sidecar facts change, so stale state is recorded directly from the sidecar update scope.

## Public Operation Boundary

The internal graph refresh primitive remains graph-only. The post-refresh related-items sync belongs to public maintenance wrappers such as `refreshCitationGraphCacheIncrementalNow`, not to every internal graph refresh call.

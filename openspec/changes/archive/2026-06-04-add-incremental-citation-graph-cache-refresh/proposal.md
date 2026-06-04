# Add Incremental Citation Graph Cache Refresh

## Summary

Add a bounded, visible incremental refresh path for Citation Graph cache rows. The refresh is triggered after explicit sidecar-changing actions, not by a resident monitor or dirty worker, and it preserves `rebuildCitationGraphCacheNow` as the manual full rebuild operation.

## Motivation

Reference Sidecar updates are already source-scoped, but Citation Graph cache maintenance currently replaces the whole graph cache. This makes small workflow apply and refresh changes more expensive than necessary and leaves the graph stale until a manual rebuild.

## Scope

- Add source-slice Citation Graph cache refresh from active raw references, effective canonical references, and accepted bindings.
- Trigger it after literature-digest sidecar apply, Reference Sidecar refresh, and Advanced Matching fact changes.
- Record incremental graph refresh as its own `synt_operation`.
- Keep full graph rebuild available and explicit.

## Non-Goals

- No background monitor, dirty queue, startup reconcile, or WorkItem worker.
- No layout rebuild during graph data incremental refresh.
- No hidden background related-items worker; related-items sync may run as a visible
  follow-up operation in explicit Synthesis update paths.

# Defer Sidecar Graph And Related-Items Sync

## Summary

Stop `literature-digest` apply and Reference Sidecar refresh from immediately running Citation Graph incremental refresh and Zotero related-items sync. These sidecar-changing paths should write durable sidecar facts, mark Citation Graph and related-items sync stale with scoped diagnostics, and return quickly. Manual graph refresh will consume the stale graph delta and then run scoped related-items sync after graph refresh succeeds.

## Motivation

Digest apply and broad Reference Sidecar refresh currently cascade into graph construction, complex metrics, and related-items sync. In real Zotero sessions this makes the apply/refresh path too expensive, even when the user only intended to write sidecar facts. Related-items correctness does not require synchronous graph refresh if stale state is recorded and the later graph maintenance command has enough source scope to run a bounded sync.

## Scope

- Change `literature-digest` sidecar apply to mark graph and related-items stale without running graph incremental refresh or related-items sync.
- Change Reference Sidecar refresh to mark graph and related-items stale without running graph incremental refresh or related-items sync.
- Run scoped related-items sync after manual `refreshCitationGraphCacheIncrementalNow` succeeds.
- Preserve Advanced Matching and proposal review graph/related-items behavior unless a test exposes the same performance issue.
- Update Synthesis docs, contracts, OpenSpec specs, and regression tests to match the new explicit-maintenance flow.

## Non-Goals

- No full-library related-items sync after graph rebuild by default.
- No background related-items worker, queue drain, or startup reconcile.
- No removal of explicit/debug `syncRelatedItemsNow`.
- No change to reference extraction, matching policy, proposal generation, or graph layout rebuild.

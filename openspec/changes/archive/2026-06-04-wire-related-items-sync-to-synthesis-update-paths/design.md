# Design

## Runtime Sequence

Related-items sync runs after graph incremental refresh in the visible update sequence, but it is not blocked by graph refresh success:

1. The primary operation updates sidecar, binding, or redirect facts.
2. The primary operation attempts the appropriate Citation Graph incremental refresh.
3. The service always attempts related-items sync for the affected scope when the triggering facts changed.
4. Related-items sync failure records only its own operation failure and does not roll back the primary operation.

## Edge Resolver

`loadAcceptedLibraryCitationEdgesForRelatedItems({ sourceRefs? })` resolves accepted library-to-library citation edges through two paths.

The fast path reads active accepted Citation Graph edges and active Zotero-bound nodes from graph cache. It is used when graph cache rows are present.

The fallback path reads active raw references, resolves effective canonical references, applies accepted reference bindings, and produces the same source-to-target library edge shape without writing graph cache. It does not scan artifacts, extract references, or run matcher logic.

## Sync Kernel

`syncRelatedItemsFromAcceptedEdges({ scope, reason, host, onProgress })` owns the Zotero side effect:

- It creates one visible `related_items_sync` operation.
- It batches full sync work and yields between batches.
- It uses `host.hasRelatedItem()` as the idempotency source of truth.
- It writes stable effect rows keyed by citation edge id.
- Scoped sync only touches the requested source refs and stale effects belonging to those sources.

The public `syncRelatedItemsNow()` remains as the explicit full sync entry point. It delegates to the same kernel and does not rebuild graph cache.

## Trigger Policy

`applyLiteratureDigestSidecar()` performs scoped sync for the applied source ref after graph incremental refresh is attempted. Missing graph cache skips graph bootstrap, but related-items sync still uses sidecar fallback.

`refreshReferenceSidecarNow()` performs scoped sync for source refs whose references artifact hash or status changed. If graph bootstrap or incremental refresh fails, related-items sync still runs.

`runAdvancedReferenceMatchingNow()` performs full sync only when accepted binding or canonical redirect facts changed. Open review proposals alone do not trigger related-items sync.

## Removed Workflow Option

`literature-digest` no longer exposes `auto_reference_matching`. Its apply hook no longer imports or calls `applyReferenceMatchingToNote()`, and it no longer writes `auto_reference_matching` result fields.

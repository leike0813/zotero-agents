# Govern Stale Canonical Lifecycle

## Summary

Reference sidecar refresh can mark old raw references stale when an artifact hash changes, while leaving the old canonical reference active. When a later artifact produces a near-identical new canonical, the old canonical has no active raw evidence and is skipped by Advanced Matching. This change adds lifecycle governance for affected canonicals immediately after artifact refresh.

## Motivation

Revise Canonicals currently exposes many possible duplicates that have no binding, no active raw references, no redirects, no review proposals, and no citation graph presence. These records are usually stale artifact residue. They should be reconciled during the sidecar refresh lifecycle instead of remaining as active manual cleanup debt.

## Proposed Behavior

- When raw references are marked stale for a source, capture the affected raw rows and canonical ids.
- After new raw references for the same source are inserted, reconcile the affected old canonicals against the current active raw references for that source.
- Safe orphaned canonicals are automatically redirected to a high-confidence successor or marked stale.
- Protected canonicals are not modified automatically; they produce Canonical Revision review proposals.
- Revise Canonicals remains a final manual cleanup surface, not a second review queue.

## Non-Goals

- Do not run Advanced Matching for raw-ref-zero canonicals.
- Do not hard delete canonical references.
- Do not change existing `zotero_binding` or `canonical_merge` proposal semantics.

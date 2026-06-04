# Wire Related Items Sync To Synthesis Update Paths

## Summary

Wire Zotero related-items sync into the explicit Synthesis update paths and remove the `literature-digest` workflow's old automatic Reference Matching option. Related-items sync becomes a visible follow-up operation after digest apply, Reference Sidecar refresh, and Advanced Matching, while remaining independent from Citation Graph cache availability.

## Motivation

The previous digest workflow mixed two responsibilities: producing digest artifacts and automatically running a Reference Matching workflow. That made related-items updates indirect and tied to a note-level matching path instead of the Synthesis sidecar facts that now define accepted citations.

Citation Graph incremental refresh is useful as a fast path, but related-items correctness should not depend on whether graph cache exists or refreshed successfully. The sync should be able to compute accepted library-to-library citation edges directly from active sidecar facts.

## Scope

- Remove the `literature-digest.auto_reference_matching` parameter and apply-time automatic Reference Matching path.
- Add a reusable related-items sync kernel that accepts scoped or full edge ranges.
- Resolve accepted library-to-library citation edges from graph cache when available, and from active sidecar facts as fallback.
- Trigger scoped related-items sync after literature-digest sidecar apply and Reference Sidecar refresh.
- Trigger full related-items sync after Advanced Matching changes accepted binding or redirect facts.
- Keep related-items sync as a separate `synt_operation`.

## Non-Goals

- No background related-items monitor, dirty queue, startup reconcile, or worker.
- No graph cache rebuild from the related-items sync path.
- No reference extraction, matcher execution, or sidecar mutation from related-items sync.
- No change to the standalone `reference-matching` workflow entry point.

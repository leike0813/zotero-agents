# Design

## Lifecycle Hook

`markRawReferencesStaleForSource()` will return stale raw-reference rows and canonical ids. `replaceReferenceSidecarForSourceRef()` will reconcile those canonical ids after writing the new active raw references for the same source.

## Eligibility

Reconciliation is scoped to the same `sourceRef`. A stale canonical is automatically governed only when it has no active raw references, no accepted/candidate binding, no incoming or outgoing redirect, no reference/review proposal, and no active citation graph node or edge participation.

Protected canonicals are converted into `synt_review_item` rows with `review_kind = "canonical_revision"` and structured payload. This keeps review semantics outside `synt_reference_match_proposal`, whose kinds remain `zotero_binding` and `canonical_merge`.

## Successor Detection

Successor search is limited to current active raw references for the same source. A successor is high confidence when citekey/identifier matches, normalized title + year matches, or compact title + year + authors match.

## Actions

Safe canonical + successor writes an `old -> new` canonical redirect and marks the old canonical stale. Safe canonical without successor marks the old canonical stale. Protected canonical creates a Canonical Revision proposal recommending either successor redirect or orphan cleanup.

Accepting a Canonical Revision proposal revalidates blockers before writing redirect/stale facts. Rejecting the proposal preserves the decision and prevents regeneration for the same basis.

## UI

Review Center `Index` shows Canonical Revision proposals with the existing cleanup/index rows. Revise Canonicals displays proposal-managed diagnostics but does not offer second-layer review operations.

# Design

## Model

Advanced matching separates proposals from accepted facts.

- `synt_reference_binding` is an accepted fact table: canonical reference to Zotero target.
- `synt_canonical_reference_redirect` is an accepted fact table: canonical reference merge/redirect.
- `synt_reference_match_proposal` stores reviewable matcher output for `zotero_binding` and `canonical_merge` candidates.

The proposal table records source canonical/raw reference context, target identity, matcher confidence, score, reasons, diagnostics, basis hash, and source hash. Rejected proposals are preserved and suppress reopening for the same basis. Accepted proposals write facts and then become terminal proposal rows.

## Flow

Reference Sidecar refresh and workflow apply continue to call the lightweight sidecar replacement path. They may write deterministic accepted bindings from citekey or title-year keys, but they do not call `buildReferenceMatcherIndex` or `resolveReferenceWithPolicy`.

`runAdvancedReferenceMatchingNow` performs a bounded explicit operation:

1. Load active raw references and effective canonical references.
2. Exclude canonical references with accepted bindings by default.
3. Load current Zotero source metadata and build one matcher index.
4. Run `resolveReferenceWithPolicy(..., "production")` for each target reference.
5. Auto-accept `matched` results with `deterministic` or `high` confidence.
6. Store `suggested` or `ambiguous` results as open proposals.
7. Preserve rejected proposals with matching basis/source hash.
8. Mark citation graph cache stale if any accepted binding or redirect fact changes.

Canonical merge proposal generation uses exact canonical metadata collisions and matcher evidence where available. It does not run all-pairs fuzzy dedupe during the first implementation.

## UI

The Workbench Index area gains an Advanced Matching / Review subview. The library and referenced-only views continue to show facts. The advanced subview shows operation state, proposal counts, and a proposal table with Accept/Reject actions.

## Compatibility

This is a hard semantic cut for reference binding states: `candidate`, `rejected`, and `stale_target` are no longer persisted in `synt_reference_binding`. Existing legacy statuses are normalized at read time; future writes should only persist accepted facts in the binding table.


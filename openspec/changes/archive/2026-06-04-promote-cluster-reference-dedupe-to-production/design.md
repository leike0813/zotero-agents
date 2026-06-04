## Design

`runAdvancedReferenceMatchingNow` keeps two explicit passes:

- `reference_binding`: unchanged Zotero item binding pass.
- `external_dedupe`: now uses `dedupeCanonicalReferencesClustered()`.

The production external-dedupe input builder mirrors the harness input model.
It resolves active raw references to effective canonical ids, excludes
canonicals that already have accepted Zotero bindings, aggregates all active
raw support through existing redirects, marks existing redirect targets as
sticky representatives, and supplies title candidates from effective canonical
rows, physical canonical rows, and raw parsed titles.

Cluster actions are materialized without adding persistence entities:

- `redirect` action -> `synt_canonical_reference_redirect`;
- `review` action -> `synt_reference_match_proposal(kind="canonical_merge")`.

The proposal evidence contains the cluster id, subcluster id, edge type, risk
signals, representative rationale, and source/target record summaries. Rejected
proposal preservation uses hashes derived from cluster action semantics,
source raw ids/hashes, risk/evidence, and a cluster policy version.

## Cleanup

The old pairwise canonical dedupe function and its candidate/result types are
removed. Old reason codes such as `canonical_fuzzy_title` and
`canonical_contained_strong_title` are no longer production outputs. Tests and
docs move to cluster reason codes and edge types.

## Isolation

Reference Sidecar refresh and literature-digest workflow apply stay on the
lightweight path and must not call `dedupeCanonicalReferencesClustered()`.
Graph cache rebuild consumes accepted redirects/bindings but never runs any
matcher.

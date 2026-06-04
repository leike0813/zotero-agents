# Design

Citation Graph cache maintenance gains two modes:

- **Incremental source-slice refresh** rewrites graph rows for affected source refs and recomputes light metrics only for affected nodes.
- **Full rebuild** remains `rebuildCitationGraphCacheNow` and can bootstrap missing graph cache when allowed by the caller.

The incremental path receives source refs directly from workflow apply and Reference Sidecar refresh. For Advanced Matching, changed binding or redirect canonical ids are resolved back to active raw-reference source refs before refreshing graph slices.

Incremental refresh writes are transactional. The repository deletes old outgoing edges, source ownership rows, and incoming groups for affected sources, then upserts rebuilt source-slice rows. It recomputes metrics from current graph edges after the slice write and removes affected orphan external nodes only when they have no remaining incoming or outgoing edges.

Operation visibility is explicit. The graph refresh creates a separate `synt_operation` labelled `Citation graph cache incremental refresh`; failures do not roll back the original sidecar or matching operation. A failed incremental refresh leaves the previous graph rows readable and marks `citation-graph:library` stale unless no usable graph cache exists.

Bootstrap policy:

- workflow apply skips graph bootstrap when graph cache is missing or failed;
- Reference Sidecar refresh may run a full graph bootstrap when graph cache is missing or failed;
- Advanced Matching may run a full graph bootstrap when graph cache is missing or failed.

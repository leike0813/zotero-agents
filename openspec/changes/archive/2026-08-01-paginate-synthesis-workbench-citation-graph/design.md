## Context

The Workbench Graph surface currently materializes and serializes the complete Citation Graph for one RPC. A production-size library already produces 7,432 nodes and 11,377 edges, exceeding the sidecar's fixed 1 MiB response limit. The repository is the durable source of truth, while layout artifacts and in-memory projections are derived data. The existing TypeScript boundary also collapses useful sidecar failures into a generic internal error.

This change crosses the contracts package, SQLite repository, native sidecar, TypeScript client and Workbench host, iframe rendering, export, localization, and diagnostics. Existing uncommitted Graph surface work is retained and extended.

## Goals / Non-Goals

**Goals:**

- Render a useful first Graph page within the existing RPC response budget, then load the remaining eligible graph while the tab remains active.
- Apply filters and search to the full graph before deterministic paging.
- Preserve graph, camera, selection, focus, and managed-control identity while pages arrive.
- Bind every cursor and slice to an explicit graph/query basis and reject stale data deterministically.
- Keep repository reads bounded and make incomplete exports explicit.
- Preserve stable public error identity and a bounded safe diagnostic reason.

**Non-Goals:**

- Adding a public operation or changing the Citation Graph persistence format.
- Raising the global RPC response limit or making an in-memory cache authoritative.
- Running a seven-platform sidecar prebuild, publishing a release, or synchronizing Gitee.

## Decisions

### Use one versioned opaque cursor for four bounded streams

The cursor encodes a version, graph hash, query hash, and node, edge, hover-node, and hover-edge offsets. The wire value is opaque to the TypeScript consumer and length-limited before decoding. A graph or query mismatch produces `basis_mismatch`. This avoids separate client cursors that can drift while still allowing the repository to advance independent result streams.

Alternatives considered were offset fields exposed directly in the public DTO and server-held cursor sessions. Public offsets leak implementation details; sessions make correctness depend on volatile sidecar memory.

### Query and count in the repository, close endpoints before returning

Filters, search, stable ordering, and aggregate counts execute at the repository/runtime boundary. Each page uses bounded SQL and batch-loads any missing endpoints for returned edges. Every edge therefore has both endpoints in the same response. Ordering uses graph metrics, degree, and stable node ID for nodes, and stable edge ID for edges.

Reading and projecting the whole graph per page was rejected because it merely moves the response problem into repeated CPU and memory work.

### Enforce both item limits and a serialized-byte budget

Defaults are 200 primary nodes, 400 primary edges, 100 hover nodes, and 200 hover edges. Before returning, the runtime serializes the candidate response and deterministically reduces the page until it fits within 768 KiB. The global 1 MiB transport limit remains unchanged.

### Share one TypeScript window state machine

`synthesisCitationGraphWindow.ts` owns defaults, generation and basis guards, ID-based merges, soft-limit accounting, pause/resume, and slice merge semantics. Sequential pages advance the cursor; neighborhood slices never do. This gives host and UI code one source of truth and makes stale-page behavior independently testable.

### Load serially and patch the iframe graph incrementally

The host requests one page at a time only while the Graph tab and generation remain active. Page messages add nodes, edges, counts, and progress in batches. They do not recreate Graphology, Sigma, the canvas, camera, controls, or selection drawer. Tab changes, query/layout changes, invalidation, and cleanup cancel future reads and invalidate in-flight results.

### Aggregate exports explicitly

Topic HTML/export walks all topic and layout pages under a fixed basis. A configured export safety ceiling returns a typed failure instead of emitting a partial graph. Interactive soft limits do not silently constrain exports.

### Keep caches derived and readiness fail-closed

Layout/topic helper indexes may be cached by graph/layout/topic basis, but SQLite remains authoritative. Existing schema-v1 databases run the repository's existing additive `SCHEMA_SQL` before readiness checks. Missing compatible tables are restored idempotently; incompatible columns or constraints return `repository_schema_incompatible` without changing the schema version.

## Risks / Trade-offs

- **Cursor queries become expensive on very large graphs** → Keep result queries and endpoint reads bounded, use aggregate queries for totals, and cache only derived basis indexes.
- **Endpoint closure can exceed nominal node limits** → Treat endpoint nodes separately in metadata and apply the byte budget after closure.
- **A graph can change during loading** → Require graph hash and query signature on every continuation and discard stale generations in the host.
- **Incremental layout can shift as nodes arrive** → Preserve existing coordinates when available and batch Sigma refreshes; layout basis changes start a new window.
- **Export may need more data than an interactive window** → Use a separate explicit safety limit and fail with a typed error at the limit.
- **Safe error reasons could leak implementation detail** → Allowlist public codes and bound/sanitize `details.reason` at the sidecar boundary.

## Migration Plan

1. Land contracts and repository/runtime paging behind the existing Graph read operations.
2. Switch the Workbench host to first-page reads and incremental loading.
3. Enable incremental iframe patches, controls, and complete export aggregation.
4. Validate existing schema-v1 databases through additive initialization before readiness.
5. If rolled back before release, the unchanged storage format remains readable by the previous runtime; no data rollback is required.

## Open Questions

None. The page defaults, 768 KiB response budget, 10,000/20,000 interactive soft limits, and equal-size resume increments are fixed by this change.

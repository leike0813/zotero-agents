## Context

Citation Graph complex metrics are deterministic TypeScript kernels, but they remain mixed into the application graph module and are called while the per-library write lock is held. Full rebuild, incremental refresh, and manual refresh also own separate pieces of the compute/persist flow, making it harder to enforce one stale-basis policy.

The layout kernel already established `packages/synthesis-engine` as the environment-neutral process boundary. Metrics should use the same boundary while preserving metrics v2, persisted rows, canonical hashes, public clients, and database ownership.

## Goals / Non-Goals

**Goals:**

- Extract strict, bounded, environment-neutral metrics compute contracts and kernels.
- Preserve all current metrics v2 formulas, sorting, rounding, role hints, and application hashes.
- Compute outside the library write lock and promote only against an unchanged graph hash.
- Share one compute/promotion orchestration across all graph refresh entry points.
- Prove structured-clone process portability with a test-only worker.

**Non-Goals:**

- Production workers, worker pools, IPC, sidecar supervisors, or runtime recovery.
- Metrics algorithm tuning, formula changes, version changes, or database migrations.
- Public service/client, Workbench command, WebDAV, or service-inventory changes.
- Extraction of unified graph construction, Reference Matcher, or other WS3 kernels.

## Decisions

### Extend the existing environment-neutral engine package

`packages/synthesis-engine` will export the metrics request/result DTOs, canonical rebuilders, metrics engine interface, checkpoint seam, deterministic implementation, and in-process engine. The package cannot import Node, DOM, Zotero, plugin, repository, filesystem, hashing, or application modules.

The layout and metrics contracts share graph compute limits through one package-level source of truth. Existing layout limit exports remain available as aliases so the extraction does not create an unrelated API break.

### Transport only metrics inputs

The canonical request contains `graphHash`, sorted nodes with `{ nodeId, kind, libraryId?, itemKey?, title?, year? }`, and sorted edges with `{ edgeId, source, target, mentionCount }`. Canonical rebuilding enforces JSON safety, 5,000/20,000 limits, unique identifiers, valid endpoint references and node kinds, finite positive counts, and bounded strings; unknown JSON-safe fields are removed.

The canonical result echoes `graphHash`, fixed metrics v2 parameters, graph year, sorted library-node metrics, and diagnostics. Result rebuilding requires all and only the request's library nodes, unique identifiers, finite bounded normalized values, exact parameters/version, and canonical ordering. The engine does not compute `metricsHash`.

### Keep hashing and persistence projection in the application

A metrics adapter projects the DB graph into the engine request and maps the canonical result back to the existing snake_case `CitationGraphMetrics` envelope. It computes `metrics_hash` with the existing canonical application helper, preserving byte-for-byte hashes and keeping hashing SSOT outside the engine.

The old application kernel and its private helpers are deleted rather than retained as a compatibility forwarding layer.

### Use one capture, compute, and guarded-promotion flow

The service captures the current graph, node-to-literature mapping, and structure versions under a short library lock. It releases the lock before awaiting the injected metrics engine, then reacquires the lock, rereads the current graph hash, and replaces complex metrics only if the hash still equals the request basis.

A mismatch returns a non-destructive `citation_graph_metrics_basis_superseded` result and leaves previous rows unchanged. Engine throws, contract errors, malformed results, and oversized graphs expose stable sanitized failure diagnostics and also preserve previous rows.

Full rebuild and incremental refresh commit graph structure and cache readiness independently, release their mutation lock, then invoke this shared metrics path. Existing metrics freshness remains derived from `sourceGraphHash` versus the current graph hash, so graph reads remain available if metrics fail.

### Keep cancellation outside serialized DTOs

The in-process implementation accepts an optional checkpoint callback for start, PageRank iterations, component traversal, and completion. Throwing from the checkpoint aborts without producing a partial result. No `AbortSignal`, timeout, or implementation callback enters a serialized request or result.

### Use a test-only worker canary

A Node-only fixture receives a canonical request by structured clone and returns the canonical result. Direct and worker executions must be identical. The fixture remains outside the production plugin dependency graph.

## Risks / Trade-offs

- [Floating-point or hash drift during extraction] → Characterize representative metrics and require exact application hash parity before removing the old kernel.
- [Async computation promotes stale metrics] → Re-read the DB graph hash inside the short promotion lock and never replace rows on mismatch.
- [Graph refresh succeeds but metrics fail] → Keep graph readiness independent and expose the existing stale/missing metrics projection with stable diagnostics.
- [Contract validation adds duplicate rules] → Put all transport validation in engine rebuilders and all persistence mapping in one application adapter.
- [Node-only dependencies leak into production] → Keep worker code test-only and add static package/import guards.

## Migration Plan

1. Add failing contract, parity, worker, race, and failure-preservation tests.
2. Add the engine DTOs and move the unchanged kernels.
3. Add the application adapter and injectable service option.
4. Refactor all refresh paths to the shared lock-free compute and guarded promotion flow.
5. Remove the old kernel, update current-state documentation, and run focused plus production validation.

Rollback is code-only because there is no schema or public-contract migration.

## Open Questions

None.

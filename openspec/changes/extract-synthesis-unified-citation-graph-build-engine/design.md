## Context

Synthesis has two Citation Graph construction paths. `buildUnifiedCitationGraph()` builds the review/test graph from paper inputs, while `buildCitationGraphCacheRecordsFromSidecar()` independently constructs production SQLite nodes, edges, source ownership, incoming groups, and light metrics from repository and Host data. Their graph semantics overlap but have different envelopes, so fixes and bounds can drift.

The existing `packages/synthesis-engine` boundary already hosts layout and metrics kernels. Graph construction should use the same environment-neutral boundary without importing Zotero, repository, filesystem, application hashing, or persistence concerns.

## Goals / Non-Goals

**Goals:**

- Establish one deterministic graph-assembly semantic core for legacy paper inputs and production sidecar inputs.
- Define strict, bounded, versioned JSON-safe build DTOs and canonical result rebuilding.
- Keep Host and repository reads outside the engine and keep engine computation outside the library write lock.
- Prevent stale computation from replacing a newer graph basis.
- Preserve current graph, hash, diagnostics, database-row, metrics/layout, and service behavior.

**Non-Goals:**

- Public client/service changes, database migrations, or service-inventory changes.
- Production workers, IPC, sidecar supervisors, or runtime recovery.
- Citation identity, role-priority, Reference Matcher, metrics, or layout algorithm tuning.
- WebDAV or durable-state changes.

## Decisions

### Use a resolved graph-build transport

`packages/synthesis-engine` will export a `SynthesisCitationGraphBuildEngine`, request/result DTOs, rebuilders, checkpoint seam, deterministic implementation, and in-process engine.

The request contains a fixed contract version, scope, role priority, source node metadata, and reference instances. Each reference carries its stable instance id, source id, application-resolved target id and kind, target metadata, roles, weight, and any stable edge id required by the persistence projection. The engine does not receive repository records, Host locators, timestamps, cache basis, transaction state, or application callbacks.

The result contains canonical nodes, one resolved edge per reference instance, aggregate source-target edges, source ownership, incoming groups, light metrics, and deterministic diagnostics. Unknown JSON-safe fields are discarded. Invalid identifiers, duplicate instances, dangling sources, invalid targets, invalid roles/weights, non-JSON values, and oversized requests or results are rejected.

Default hard limits follow the current stress tier: 25,000 source nodes, 1,250,000 reference instances, and 750,000 external/unresolved target nodes. Rebuilders accept an implementation-only bounds override for focused tests; bounds are not serialized into DTOs.

### Keep identity resolution and durable facts in application adapters

The legacy adapter preserves current provisional-key generation, canonical-paper selection, promotion diagnostics, duplicate diagnostics, and application hashing, then projects resolved references into the engine request. The production adapter preserves effective-canonical redirect resolution, accepted-binding resolution, Host metadata lookup, stable persistence edge ids, and application timestamps.

Both adapters delegate node merging, target materialization, reference-edge construction, source-target aggregation, role selection/evidence, ownership/incoming grouping, and light-degree computation to the engine. The legacy adapter maps aggregate edges back to `CitationGraph`; the production adapter maps resolved edges and light metrics to repository records.

Application canonical JSON/SHA remains the hashing SSOT. The engine transports stable identifiers but does not compute `graph_hash`, cache `sourceHash`, or persistence basis.

### Capture, compute, and conditionally promote

The service captures active artifact sidecars, raw references, canonical references, accepted bindings, and effective canonical ids under the per-library lock and computes an application-owned durable-fact basis hash. It releases the lock before Host metadata reads and engine computation.

Before replacing full or source-slice graph rows, the service reacquires the lock and recomputes the same durable-fact basis for the same scope. Replacement and cache-basis update occur transactionally only when the basis is unchanged. A mismatch returns `citation_graph_build_basis_superseded` and leaves graph rows and cache basis unchanged.

This intentionally permits repository reads and canonical hash calculation in the short capture/promotion sections, but excludes Host I/O and graph assembly. No schema-level revision counter is added in this change.

### Preserve last-good graph state

Engine throws, cancellation, contract rejection, malformed results, or superseded input do not replace graph rows. If a graph already exists, it remains readable under existing stale semantics. If no graph exists, the existing operation failure path marks the cache failed. Successful graph commit remains independent from the subsequent guarded complex-metrics computation.

### Keep cancellation outside serialized DTOs

The engine accepts an optional checkpoint callback for start, reference batches, aggregation, and completion. The callback runs every 1,024 references by default and may throw to abort without returning a partial result. No `AbortSignal` or function enters request/result DTOs.

### Use a test-only worker canary

A Node-only fixture structured-clones a canonical build request, executes the deterministic builder, and returns the rebuilt result. Direct and worker results must be identical. Production composition continues to inject the in-process engine.

## Risks / Trade-offs

- [Legacy graph or persistence rows drift] → Characterize representative legacy and production fixtures and require exact graph/hash/row parity before deleting duplicate assembly helpers.
- [Basis recapture is expensive for stress-sized graphs] → Limit lock work to repository reads, effective-id resolution, and canonical hashing; keep Host reads and all graph assembly outside the lock.
- [Application adapters retain too much graph logic] → Restrict them to identity/durable-fact resolution and envelope mapping; enforce engine routing with static boundary tests.
- [Oversized fixture tests consume excessive memory] → Use injectable test bounds while separately asserting production constants.
- [Node-only dependencies leak into plugin code] → Keep worker code under tests and add environment-neutral import guards.

## Migration Plan

1. Add failing engine contract, parity, worker, race, and failure-preservation tests.
2. Implement the build DTOs, rebuilders, deterministic assembly kernel, checkpoints, and in-process engine.
3. Add legacy and production adapters and inject the engine through service composition.
4. Move full, incremental, and related-items fallback construction to capture/compute/conditional-promotion orchestration.
5. Delete duplicate builders/helpers, update current-state documentation, and run focused plus production validation.

Rollback is code-only because no schema or public contract changes.

## Open Questions

None.

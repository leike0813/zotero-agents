## Context

The sidecar already owns an identity-bound isolated SQLite repository, a private Topic application, and environment-neutral Citation Graph build, layout, and metrics engines. Production Citation Graph persistence and basis capture remain plugin-owned; only layout and metrics currently have production sidecar worker routes, while build transfer remains an explicit canary. The missing layer is a private application that proves durable full-graph orchestration, bounded reads, worker-backed computation, and safe promotion without broadening production authority.

Citation Graph row contracts, DDL, CRUD, and canonical hashing currently straddle plugin repository code and extracted engines. Reimplementing those facts in a shadow adapter would create immediate parity risk. The application therefore requires shared repository and application sources of truth with compatibility re-exports for plugin imports.

## Goals / Non-Goals

**Goals:**

- Add strict environment-neutral Citation Graph application DTOs, ports, orchestration, failure results, and bounded reads.
- Persist one durable shadow graph plus light/complex metrics and explicit layout projections in the isolated repository.
- Preserve graph, hash, row, layout, and metrics parity by sharing existing facts and engines.
- Make every promotion graph-basis-bound and preserve last-good projections across compute, validation, transaction, and lifecycle failures.
- Exercise the complete application against real Node SQLite and the existing compute worker while keeping the composition private.

**Non-Goals:**

- Public HTTP/RPC graph methods, `SynthesisClient` routing, automatic production shadow invocation, fallback, or parity mirroring.
- Incremental source-slice refresh, automatic layout during rebuild, packed/streaming rebuild transfer, production database migration, or WS7 cutover.
- UI, preferences, new dependencies, runtime prebuild publication, or changes under `reference/Skill-Runner`.

## Decisions

### Define one strict application surface over narrow ports

`packages/synthesis-application` owns exact request/result rebuilding and a `createSynthesisCitationGraphApplication` use case. The port surface separates repository facts from compute submission and lifecycle cancellation. Reads accept only bounded selectors; mutations return the stable result vocabulary `promoted|unchanged|basis_mismatch|graph_application_busy|worker_busy|worker_failed|invalid_request|repair_required|stopping` plus bounded warnings where graph commit already succeeded.

This deep module is preferable to a set of independent service helpers because rebuild, metrics, layout, admission, and shutdown share one active-basis and mutation lifecycle. The shared layer imports no Node, Zotero, Host, UI, plugin service, or worker implementation.

### Consolidate Citation Graph persistence facts before adding shadow state

Environment-neutral row types, strict rebuilders, DDL fragments, canonical hash/projectors, and CRUD move into `packages/synthesis-repository` or the application/engine owner appropriate to the fact. Existing plugin paths become compatibility re-exports. Both plugin and Node adapters consume the same schema and row functions so production graph hashes and observable reads do not drift.

The isolated schema receives its own version increment and an application-state singleton containing active graph hash, canonical input hash, optional metrics hash, counts, and readiness facts. Existing node, edge, ownership, incoming, light/complex metrics, and layout families are installed from shared DDL rather than copied.

### Treat transactional graph replacement as the structural commit point

`rebuildFull` first rebuilds a strict full-scope engine request and computes its canonical input hash. A null expected hash is creation-only; an existing graph requires an exact expected active hash. Identical input with `force:false` returns `unchanged` before worker admission.

The application submits build to the existing compute worker and validates the result. In one SQLite transaction the repository rechecks the expected active hash, replaces structure/index/light-metric rows, and updates the state singleton. Any failure before commit retains the complete last-good graph. This second basis check is mandatory because worker execution is outside the database transaction.

### Compute complex metrics after graph commit and layout only on request

After structural promotion, complex metrics run through the worker and are persisted only with a matching active graph hash. Failure at this stage does not make the committed graph disappear; rebuild returns `promoted` with one stable warning and metrics readiness stays false. Terminal operation-receipt failure follows the same post-commit warning rule.

Layout is deliberately excluded from rebuild. `recomputeLayout` executes one preset/bounded scope against the active graph and compare-and-swap promotes coordinates. `refreshMetrics` repeats the complex-metrics path explicitly. A graph replacement invalidates prior metrics/layout readiness, and any stale completion is discarded.

### Keep all kernels behind existing compute admission

The service adapter maps application jobs to the existing global single worker, two-item queue, five-second deadline, and fuse. Main process code performs validation, SQL, hashing, and orchestration only; it never calls a graph kernel. Full rebuild retains the monolithic 8 MiB request, 250,000 request-node, and 50,000 result-node limits. Packed/streaming transfer remains an explicit canary rather than an implicit overflow path.

### Serialize mutations without blocking reads or control-plane lifecycle

The application uses one non-queued mutation lease shared by rebuild, metrics refresh, and layout recomputation. A competitor fails immediately as `graph_application_busy`. Inspection and repository-backed reads do not acquire the lease. `stopAdmission` changes the mutation gate to stopping, and `shutdown` cancels/awaits active compute before the service closes the repository.

### Compose privately after recovery

Service startup opens and recovers the isolated repository before constructing the Citation Graph application. The instance is reachable only from direct composition fixtures in this change. Health, handshake, discovery, and HTTP routing remain unchanged, including `mutationEnabled:false`; production build stays in the plugin and the two existing production layout/metrics worker routes remain the only engine routes.

## Risks / Trade-offs

- [Full graph replacement can create long synchronous transactions] -> Keep computation outside SQLite, use shared bulk operations, and limit accepted result size to 50,000 nodes.
- [Post-commit metrics failure yields partial readiness] -> Make structure the explicit commit point, expose readiness separately, return stable warnings, and support idempotent explicit refresh.
- [Shared repository extraction can perturb production behavior] -> Retain compatibility re-exports and lock canonical hashes, row projection, layout/metrics results, and reads with existing Core parity suites.
- [One mutation lease limits throughput] -> Prefer deterministic global serialization for the private foundation; reads and control-plane paths remain available.
- [Persistent schema corruption cannot be repaired automatically] -> Fail closed as `repair_required`; automatic repair and migration policy require a separate change.
- [The bundled private application could be mistaken for a routed feature] -> Preserve capability, consumer, engine-owner, worker-route, and mutation inventories in static tests and current-state docs.

## Migration Plan

1. Add Core 207 contract and application tests before implementation.
2. Consolidate shared Citation Graph persistence/hash facts and retain plugin compatibility exports with parity coverage.
3. Extend the isolated schema and Node repository adapter, then implement application orchestration and real worker/SQLite integration.
4. Compose the application after repository recovery without exposing a route, and extend lifecycle, boundary, packaging, fingerprint, and inventory checks.
5. Update current-state documentation and Stage 1 progress, then run all focused and strict OpenSpec verification.

Rollback removes the private composition and shadow table family while plugin production ownership remains intact. Persisted shadow files are inert and are not automatically deleted or interpreted by older code.

## Open Questions

None. Incremental reference-sidecar refresh, packed rebuild transfer, production parity invocation, repair, public routing, and single-writer cutover require separate changes.

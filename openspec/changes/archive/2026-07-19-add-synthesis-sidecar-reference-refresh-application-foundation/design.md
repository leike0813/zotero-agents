## Context

The sidecar owns an identity-bound isolated SQLite repository plus private Topic and Citation Graph applications. Production reference refresh remains plugin-owned and reads Host artifacts directly. Shared Host contracts already provide bounded library summaries, artifact descriptors, and artifact payload results, but there is no private application that converts those facts into a durable reference projection without granting the sidecar Host authority.

Reference artifact, raw row, canonical, redirect, and binding rules currently live close to the plugin repository and refresh service. Copying them into a shadow path would create immediate parity drift. The foundation therefore has to establish shared projection facts and a two-stage materialization protocol before any future Host adapter or production cutover.

## Goals / Non-Goals

**Goals:**

- Add strict environment-neutral Reference Refresh application DTOs, bounded reads, preparation lifecycle, canonical hashes, and stable failure results.
- Persist one durable shadow reference projection with full and at-most-100-source scoped CAS replacement.
- Read only changed reference and same-source citation-analysis artifacts while never requesting digest payloads.
- Reject incomplete, surplus, duplicate, mismatched, or stale materialization before projection writes and preserve the last-good basis on failure.
- Share invalid-reference filtering, role normalization, canonical assignment, deterministic binding, schema, CRUD, and hashing with production-compatible plugin paths.
- Keep the composition private and production-disconnected while exercising it against real Node SQLite.

**Non-Goals:**

- Advanced matching, deduplication, proposal actions, generic review actions, or resolution policy changes.
- Graph incremental execution, related-item effects, production reference cutover, automatic shadow invocation, or a service-to-plugin Host route.
- Streaming/paged full refresh, automatic overflow transfer, public RPC/HTTP, UI, preferences, dependencies, production database migrations, or WS6/WS7 cutover.

## Decisions

### Use a strict two-stage prepare/apply protocol

`prepareRefresh` accepts an expected active reference hash, force flag, bounded scope, stable unique item summaries, and complete artifact descriptors. It validates the request, computes a canonical input hash, compares descriptors with the active projection, and returns an exact references/citation-analysis read plan. Digest descriptors participate in freshness but digest payloads never enter the plan.

`applyRefresh` accepts one preparation identifier and payloads that exactly satisfy that plan. This avoids granting the Node service a plugin callback and makes missing, extra, duplicate, stale-locator, or hash-mismatched data observable before SQL. A direct injected Host port was rejected because no service-to-plugin route exists and adding one would broaden this change's authority.

### Keep one single-use in-memory preparation

One application instance admits at most one preparation or active apply. Preparing creates a durable operation receipt but does not alter reference readiness. Applying or discarding consumes the preparation. Competitors fail immediately as `reference_refresh_busy`; a missing or already-consumed identifier returns `preparation_missing`.

The in-memory payload contract is intentionally bounded to 8 MiB and 250,000 JSON nodes, with at most 100 source keys for scoped refresh. Large-library paging is deferred instead of silently switching transport semantics.

### Make the repository active hash the promotion basis

A null expected hash is creation-only. Updates must match the active reference hash both during preparation and in the promotion transaction. The repository recomputes the expected hash immediately before replacing rows and updating the singleton state. Full scope replaces the complete projection; source scope replaces only owned rows for listed sources and retains unrelated rows.

Parsing and projection occur outside SQLite. Any validation, projection, or transaction failure preserves the complete last-good projection. A terminal operation-receipt failure after commit returns `promoted` with a stable warning rather than misreporting the committed state.

### Consolidate reference projection facts as shared SSOT

Environment-neutral row types, strict rebuilders, DDL fragments, CRUD helpers, canonical hashing, invalid-reference filtering, role normalization, lightweight canonical assignment, and deterministic binding live in shared repository/application packages. Plugin-facing paths delegate or re-export these facts so production hashes and observable rows remain unchanged.

Manual binding, redirect, rejected-proposal, and user-decision rows are protected during scoped replacement. If refreshed raw facts invalidate a protected canonical, promotion retains the protected fact and emits a canonical-revision review row; this foundation does not expose generic review mutation APIs.

### Mark downstream projections stale without executing effects

Successful promotion makes the reference basis ready. Graph and related-item projections are marked stale only when graph-relevant reference facts changed, and the application returns a bounded delta summary. It neither rebuilds Citation Graph state nor writes Host related-item effects.

### Compose privately after repository recovery

Service startup recovers the isolated repository before constructing the Reference Refresh application. Shutdown first stops admission, discards an outstanding preparation, drains active apply work, and only then closes SQLite. Health, handshake, HTTP discovery, `mutationEnabled:false`, the 108-method inventory, the single direct consumer, eight engine owners, and two production worker routes remain unchanged.

## Risks / Trade-offs

- [A monolithic full-refresh materialization cannot cover stress-scale libraries] -> Enforce explicit admission and defer paged/streaming Host routing to a separate change.
- [Descriptor state can change between prepare and apply] -> Bind every planned read to locator and expected hash, validate payload freshness, and repeat active-hash CAS in the transaction.
- [Shared extraction can perturb production behavior] -> Keep compatibility exports and extend hash, row, role, binding, and read parity suites.
- [One preparation limits throughput] -> Prefer deterministic serialization for the private foundation; repository-backed reads and control-plane paths remain responsive.
- [Protected canonicals can conflict with refreshed raw data] -> Preserve user authority and emit a durable canonical-revision review row for later explicit resolution.
- [Persistent corruption cannot be repaired automatically] -> Fail closed as `repair_required`; repair policy remains a separate change.

## Migration Plan

1. Add Core 208 strict contract and application tests before implementation.
2. Introduce shared reference projection facts and retain plugin compatibility imports with production parity coverage.
3. Extend the isolated schema and implement preparation, projection, CAS promotion, bounded reads, and lifecycle handling.
4. Compose the application privately after recovery and extend boundary, packaging, fingerprint, migration, and invariant checks.
5. Update current-state documentation and Stage 1 progress, then run focused and strict OpenSpec verification.

Rollback removes the private composition and shadow tables while plugin production ownership remains intact. Existing shadow files are not automatically deleted or interpreted by older code.

## Open Questions

None. Advanced matching, large-library streaming, service-to-plugin Host routing, graph execution, related effects, generic review actions, repair, and production cutover require separate changes.

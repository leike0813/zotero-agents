## Context

The production Synthesis Workbench already obtains Graph surfaces and background-operation progress through `SynthesisClient.workbench`, but four Citation Graph commands still resolve the complete legacy service. Five call sites cover manual and automatic layout recomputation plus full rebuild, incremental refresh, and failed-rebuild retry. The cache commands currently pass a UI progress callback even though command progress is persisted and published by the existing 500 ms `workbench.readProgress()` poll.

The client foundation already provides grouped capabilities, shared JSON normalization, stable client errors, narrow legacy ports, and lazy default composition. This change must use those patterns without changing Graph algorithms, repositories, operation persistence, service inventory, or user-visible Workbench orchestration.

## Goals / Non-Goals

**Goals:**

- Add a bounded `SynthesisClient.graph` command capability for the four existing Citation Graph operations.
- Validate the layout request at the in-process boundary and return opaque JSON-safe command results.
- Route all five production Workbench call sites through the lazily resolved default client.
- Remove UI callbacks and streaming concerns from Graph command contracts while retaining progress through the existing polling path.
- Preserve all command guards, scheduling, invalidation, and user-facing outcomes.
- Retain the 125-method public service surface and four direct legacy consumers.

**Non-Goals:**

- Migrate Graph queries, metrics refresh, References, Tags, Concepts, Topic Graph, Topics, Git/WebDAV Sync, Host Bridge, or MCP.
- Change layout algorithms, cache repositories, operation persistence, service inventory, or public service method signatures.
- Remove the shared Workbench progress helper while other command domains still use it.
- Introduce remote transport, callback, streaming, or Workbench-owned DTO contracts.

## Decisions

### 1. Add a dedicated Graph capability with four use-case-shaped methods

`SynthesisClient` gains a `graph: SynthesisGraphClient` capability exposing `recomputeCitationGraphLayout`, `rebuildCitationGraphCacheNow`, `refreshCitationGraphCacheIncrementalNow`, and `retryCitationGraphCacheRebuild`. The layout method accepts only `{ algorithm, force? }`, where `algorithm` is `force | radial | components`; the cache commands take no request object. Every result is an opaque JSON-safe object.

Alternative: add the commands to `workbench`. Rejected because these are bounded Graph domain commands reused by Workbench rather than Workbench projection reads, and a dedicated capability keeps the client grouped by domain intent.

### 2. Keep validation and error normalization at the in-process adapter boundary

The adapter validates request shape, the algorithm enum, and optional boolean `force` before invoking a narrow legacy port. Invalid input becomes `invalid_request`, a missing port becomes `unavailable`, existing client errors are preserved, and ordinary legacy exceptions become `internal`. Successful values pass through the existing JSON normalization and opaque-object guard.

Alternative: trust TypeScript callers and forward values directly. Rejected because runtime adapters are transport boundaries and must enforce the same contract for untyped or future remote callers.

### 3. Compose four narrow legacy ports without changing the service

Default in-process composition maps the Graph capability to the four existing public service methods. It does not add a service facade, change service signatures, or alter the migration inventory. The full service remains isolated to the recorded legacy composition module and current direct consumers.

Alternative: change public service commands to match the client contract. Rejected because service redesign is outside this migration slice and would expand impact to Host Bridge or MCP consumers.

### 4. Keep command orchestration and progress ownership in Workbench

Workbench resolves the current default client at each migrated command boundary. Manual layout passes `{ algorithm, force: true }`; automatic `refreshGraphLayoutIfNeeded` reads the Graph surface and calls the same capability without `force`. Full rebuild, incremental refresh, and retry invoke their no-argument client methods. Confirmation, command single-flight, `deferStart: true`, readiness/hash guards, error presentation, surface invalidation, and stale/missing/failed actions remain host-owned.

The cache commands no longer pass `onProgress`. Persisted operation progress continues to flow through the existing 500 ms `workbench.readProgress()` poll, while the shared progress callback helper remains for other command domains.

Alternative: expose progress callbacks or async streams on `SynthesisGraphClient`. Rejected because UI callback identity and polling cadence are host concerns, and callback-bearing contracts would not be environment-neutral or transportable.

## Risks / Trade-offs

- **Runtime callers can still supply malformed requests despite static types** → Validate complete request shape, enum membership, and optional boolean values in the adapter.
- **Opaque legacy results can contain non-JSON values** → Reuse the established JSON normalization and object-result guard before returning from the client.
- **Removing callbacks could make progress appear stalled** → Preserve deferred operation start and the existing 500 ms persisted-progress poll, with focused tests for polling and command completion.
- **Automatic layout can regress readiness or hash behavior during route replacement** → Keep surface-read ordering and existing layout-ready/hash guards unchanged and lock them with observable-behavior tests.
- **Mixed client/service Workbench composition remains temporarily** → Extend boundary tests for the four migrated methods while retaining the established four-consumer allowlist.

## Migration Plan

1. Add failing contract, adapter, Workbench routing, callback isolation, and boundary assertions.
2. Add the Graph contracts, adapter ports, validation, and default legacy composition.
3. Route the five Workbench call sites through `SynthesisClient.graph` without altering orchestration.
4. Update current-state documentation and run focused through production validation.

Rollback restores the five Workbench calls and removes the Graph client capability; no persisted schema or data migration is involved.

## Open Questions

None.

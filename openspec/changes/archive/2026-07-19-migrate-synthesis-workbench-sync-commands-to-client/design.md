## Context

The Synthesis Workbench now routes most commands through bounded client capabilities, but its five Git and five WebDAV Sync commands still resolve the complete legacy service. The same file imports `topicPathId` from that service even though the helper is pure. These dependencies leave Workbench as one of four direct service consumers and make Sync commands reuse a potentially stale default client/service despite preference, credential, and adapter changes.

The migration must preserve the public service inventory at 128 methods, the ten host command names, existing single-flight keys and action semantics, and the separate raw Sync query/configuration/status surface consumed by Host Bridge and MCP.

## Goals / Non-Goals

**Goals:**

- Expose both Git and WebDAV command transports through an environment-neutral `client.sync` contract.
- Validate canonical conflict requests and normalize every command result through the shared JSON-safe object boundary.
- Ensure every Workbench Sync command resolves a fresh client backed by a refreshed legacy default service.
- Remove every production Workbench import of the complete Synthesis service.
- Preserve command timing, single-flight, failure-state translation, Sync polling, and UI chrome behavior.
- Retain 128 public service methods while reducing direct legacy consumers from four to three.

**Non-Goals:**

- Migrate Sync state, diagnostics, preference configuration, credentials, connection tests, Host Bridge, or MCP APIs.
- Change Git/WebDAV domain behavior, persistence, locking, retries, conflict resolution, or UI behavior.
- Change the public service method surface or historical transcript/store formats.

## Decisions

### 1. Model Git and WebDAV as two instances of one Sync transport contract

`SynthesisClient.sync.git` and `SynthesisClient.sync.webDav` both implement `runNow`, `pause`, `resume`, `retry`, and `resolveConflict`. A shared shape keeps transport behavior consistent without erasing the fact that Git and WebDAV remain separate domains. The result is an opaque JSON object so existing domain outcomes pass through without becoming client-layer knowledge.

The conflict request uses one canonical action enum containing the current WebDAV actions plus canonical values for existing Git aliases. The adapter accepts only this canonical DTO; Workbench remains responsible for trimming/defaulting the action before invoking it.

### 2. Keep ten optional legacy ports and validate before resolution

The in-process adapter receives one optional port per transport command. No-argument ports return through the shared JSON-safe object normalization path. `resolveConflict` first verifies JSON safety, reconstructs a DTO containing only the known canonical `action`, and only then resolves the optional port. Unknown JSON-safe fields are discarded.

Invalid requests become `invalid_request` without resolving a port; absent ports become `unavailable`; existing client errors and `storage_busy` remain preserved; ordinary exceptions and non-object/non-JSON results become `internal`.

### 3. Introduce an explicit fresh default-client acquisition path for Sync commands

A default-client helper clears the cached client, always invalidates the legacy default service, and then creates a new client. It performs service invalidation even when no cached client exists, because callers can hold a service created through a different path. Workbench calls this helper inside the existing single-flight closure so each actual Sync execution observes current preferences, credentials, and adapter composition.

This behavior is intentionally limited to the new helper; ordinary lazy default-client consumers retain their current caching semantics.

### 4. Preserve Workbench orchestration at the boundary

All ten host commands remain. Empty arguments or `{ action }` remain the single-flight payloads. Actions are trimmed and defaulted as today. Commands continue to start immediately except `syncWebDavNow`, which retains `deferStart: true`. Git/WebDAV run and retry continue to pass through `failOnSyncFailureState`; pause, resume, and conflict resolution retain their current result handling.

Sync polling and chrome stay on the existing projection path. The fast path that refreshes Sync chrome after commands remains separate from transcript rendering and other managed regions.

### 5. Move `topicPathId` to the foundation without changing it

The pure helper is copied verbatim to `foundation.ts`, exported there, and imported by both service and Workbench. This removes Workbench's final full-service dependency while retaining a single source of truth and avoiding a Workbench-specific duplicate.

### 6. Update inventory facts without shrinking the raw service

The Workbench direct-consumer entry is removed, leaving legacy composition, Host Bridge, and MCP. Sync service methods remain classified and the public inventory remains exactly 128 methods because raw query/configuration/status operations are still valid non-Workbench surfaces.

## Risks / Trade-offs

- **Fresh acquisition could refresh only the client wrapper while retaining stale service state** → Invalidate the legacy default service unconditionally before creating the client and test both cached and uncached client cases.
- **A broad conflict request could leak accidental fields into the domain** → Rebuild the request after JSON-safety and canonical-action validation.
- **Shared transport typing could hide transport-specific behavior** → Share only the five command verbs; keep separate `git` and `webDav` properties and leave domain state/configuration outside the contract.
- **Workbench timing could drift during routing changes** → Lock single-flight payloads, action defaults, immediate/deferred start, failure-state transformation, polling, and chrome behavior in focused tests.
- **Moving a helper could introduce behavior drift** → Move the implementation verbatim and keep service plus Workbench on the foundation export.

## Migration Plan

1. Add red contract, adapter, fresh-client, Workbench, inventory, and import-boundary assertions.
2. Add Sync contracts, ten optional ports, strict request rebuilding, composition, and fresh-client acquisition.
3. Move `topicPathId` to foundation and route all ten Workbench commands through a fresh `client.sync` transport.
4. Update inventory and current-state documentation, then run focused through production validation.

Rollback restores the Workbench service calls and service-owned helper, removes the Sync client capability and fresh helper, and restores the Workbench inventory entry. No data or schema rollback is required.

## Open Questions

None.

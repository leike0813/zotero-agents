## Context

The production Workbench uses `SynthesisClient.graph` for Citation Graph cache operations, but Topic Graph projection rebuild and review decisions still resolve the complete legacy service. Topic Graph is a separate knowledge domain with its own canonical relations, review items, projection index, autosync effects, and diagnostics, so extending the Citation Graph capability would blur ownership.

## Goals / Non-Goals

**Goals:**

- Add a distinct environment-neutral `SynthesisTopicGraphClient` for four Workbench commands.
- Validate and rebuild known edge/review fields before invoking narrow in-process legacy ports.
- Preserve opaque JSON-safe domain results and stable client error classifications.
- Route Workbench calls through the lazily resolved client without changing normal UI orchestration.
- Retain 125 public service methods and four direct legacy consumers.

**Non-Goals:**

- Migrate `loadTopicGraph`, `exportTopicGraphCheckpoint`, discovery hints, Host Bridge, or MCP consumers.
- Change Topic Graph domain logic, persistence, autosync, projection behavior, inventory, or public service signatures.
- Change rebuild surface invalidation or add aliases, callbacks, streaming, confirmations, or deferred mutation execution.

## Decisions

### 1. Add a separate top-level Topic Graph capability

`SynthesisClient` gains `topicGraph: SynthesisTopicGraphClient`. This follows the existing flat `concepts`, `tags`, and `topics` capabilities while keeping Topic Graph knowledge state separate from Citation Graph cache state in `client.graph`.

The interface exposes `rebuildTopicGraphIndex`, `acceptTopicGraphRelation`, `rejectTopicGraphRelation`, and `applyTopicGraphReviewAction`. All return an opaque JSON-safe Topic Graph command result; rebuild accepts no request.

### 2. Use strict canonical decision DTOs

Edge decisions require a trimmed, non-empty `edgeId`. Review decisions require a trimmed, non-empty `reviewId` and exactly `approve_suggested | reject`. The adapter checks JSON safety, discards unknown JSON-safe fields, and rebuilds requests containing only known canonical fields.

The Workbench retains its current input semantics: camel-case identifiers only, edge IDs are guarded before execution, and review actions normalize every value except exact `approve_suggested` to `reject`. A malformed empty review ID reaching the strict client becomes `invalid_request`; normal UI requests are unaffected.

### 3. Validate before resolving ports and preserve diagnostics

The adapter validates and rebuilds DTOs before resolving optional legacy ports. Invalid input becomes `invalid_request` without invoking legacy code; a missing port becomes `unavailable`; existing client errors and `storage_busy` remain classified; ordinary exceptions and non-JSON results become `internal`.

Edge missing/not-suggested and review missing/closed results retain their singular `diagnostic` as opaque domain results. Workbench remains responsible for translating them through its existing singular-only `failOnDiagnostic` helper.

### 4. Preserve rebuild and mutation orchestration separately

Rebuild remains protected, single-flight, and deferred, but calls a no-argument client method. Its in-process progress callback is removed because persisted operation progress is already polled through `client.workbench.readProgress()`. Rebuild retains its current default Home-only invalidation.

Accept/reject retain their shared edge-decision single-flight key, empty-ID skip, immediate start, and four-surface invalidation. Review retains action normalization, its review-scoped key, immediate start, and the same four-surface invalidation. The three mutations retain singular `failOnDiagnostic` and gain no confirmation or progress contract.

## Risks / Trade-offs

- **Topic Graph could be confused with Citation Graph** → Use a separate contract module and top-level `topicGraph` capability.
- **Strict review IDs can expose malformed callers** → Test empty IDs as `invalid_request`; preserve the current Workbench normalization for valid UI actions.
- **Removing rebuild callbacks can hide progress** → Verify protected/deferred execution and the persisted Workbench progress poll remain intact.
- **Rebuild invalidation looks narrower than mutation invalidation** → Preserve the current Home-only behavior in this boundary migration and leave any behavior change to a separate change.

## Migration Plan

1. Add failing contract, adapter, Workbench routing, orchestration, and boundary assertions.
2. Add Topic Graph contracts, ports, validation, and default legacy composition.
3. Route the four Workbench commands without changing service or domain code.
4. Update current-state documentation and run focused through production validation.

Rollback restores the four direct Workbench service calls and removes the Topic Graph client capability. No data or schema rollback is required.

## Open Questions

None.

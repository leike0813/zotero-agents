## Context

The production Synthesis Workbench already reads region-scoped UI projections and operation progress through `SynthesisClient`, and Citation Graph maintenance commands now use a bounded client capability. Four Reference maintenance commands still resolve the complete legacy service: Reference Sidecar refresh/retry and advanced reference matching run/retry. Three calls pass a UI progress callback even though the service persists operation progress and the Workbench publishes it through the existing 500 ms `workbench.readProgress()` poll.

These four operations are a coherent migration slice: they take no domain request, return command status objects, share the same Index/Review/Graph invalidation, and do not require exposing proposal or canonical mutation DTOs.

## Goals / Non-Goals

**Goals:**

- Add a bounded `SynthesisClient.references` capability for the four Reference maintenance commands.
- Return opaque JSON-safe command results with stable client error normalization.
- Route the four Workbench call sites through the lazily resolved default client.
- Remove UI callbacks and streaming concerns from Reference maintenance contracts while retaining persisted progress polling.
- Preserve confirmation, single-flight, deferred-start differences, error handling, and surface invalidation.
- Retain 125 public service methods and four direct legacy consumers.

**Non-Goals:**

- Migrate Reference queries, proposal actions, canonical review/merge/metadata/archive mutations, related-items sync, or workflow apply.
- Migrate Tag, Concept, Topic Graph, Topic, Git/WebDAV Sync, Host Bridge, or MCP consumers.
- Change Reference extraction or matching algorithms, repositories, operation persistence, service inventory, or public service signatures.
- Remove the shared Workbench progress helper while other command domains still use it.

## Decisions

### 1. Add one no-argument Reference maintenance capability

`SynthesisClient` gains `references: SynthesisReferencesClient`. Its four methods are `refreshReferenceSidecarNow`, `retryReferenceSidecarRefresh`, `runAdvancedReferenceMatchingNow`, and `retryAdvancedReferenceMatching`; each takes no request and returns `SynthesisReferenceCommandResult`, an opaque `SynthesisJsonObject`.

Alternative: migrate all Reference commands together. Rejected because proposal, manual-target, canonical merge, batch decision, and metadata requests require a separate DTO and validation design; including them would mix low-risk maintenance routing with a much larger mutation boundary.

### 2. Reuse the established narrow-port normalization path

The in-process adapter adds four optional legacy ports. Each client method uses `requireLegacyPort`, `normalizeLegacyObject`, and `runLegacy`, so missing ports become `unavailable`, existing client errors remain stable, SQLite busy retains its existing classification, and ordinary legacy exceptions become `internal`.

Alternative: return legacy values directly. Rejected because every client capability must enforce the same JSON-safe transport boundary even while production remains in-process.

### 3. Keep progress and command orchestration in the Workbench host

Each command resolves the default client inside its execution closure. No `onProgress`, callback, streaming hook, or Workbench DTO enters the Reference contract. Persisted operation progress remains visible through the existing 500 ms `workbench.readProgress()` poll.

`refreshReferenceSidecarNow`, `runAdvancedReferenceMatchingNow`, and `retryAdvancedReferenceMatching` retain `deferStart: true`; `retryReferenceSidecarRefresh` remains immediate. Refresh and advanced matching retain their existing protected confirmations, while both retry commands remain confirmation-free. Single-flight, failure presentation, and Index/Review/Graph invalidation remain unchanged.

Alternative: add progress callbacks to `SynthesisReferencesClient`. Rejected because callback identity and UI publication are host concerns and would prevent the contract from remaining environment-neutral and transportable.

### 4. Preserve the mixed Workbench migration boundary

Only the four maintenance calls move. Workbench remains a recorded legacy-service consumer for Reference mutations and other command domains. The service inventory and public surface remain unchanged, so boundary checks continue to report 125 public methods and four direct consumers.

## Risks / Trade-offs

- **Removing callbacks could appear to reduce progress freshness** → Preserve persisted operation reporting, command polling, and the 500 ms cadence; cover callback absence and polling ownership together.
- **Deferred start can shift if the client resolves too early** → Resolve the client inside each `runWorkbenchCommandOnce` closure and lock the three deferred versus one immediate command distinction in tests.
- **Opaque results can contain non-JSON legacy values** → Reuse the shared serialization and object normalization path.
- **Static migration boundaries can regress** → Forbid the four direct service calls while retaining the exact service and consumer counts.

## Migration Plan

1. Add failing Workbench, boundary, contract, and adapter assertions.
2. Add the Reference contracts, adapter ports, and default legacy composition.
3. Route the four Workbench calls without changing host orchestration.
4. Update current-state documentation and run focused through production validation.

Rollback restores the four Workbench service calls and removes the Reference client capability; no persisted schema or data migration is involved.

## Open Questions

None.

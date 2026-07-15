## Context

The production Synthesis Workbench already reads the Concepts surface through `SynthesisClient.workbench`, but four Concept commands still resolve the complete legacy service. The Workbench currently owns UI payload normalization and orchestration, while Concept KB owns review, deletion, canonical writes, projection rebuilds, and domain diagnostics.

The four commands form a coherent migration slice. Three are immediate mutations; Concept KB rebuild is protected and deferred, currently carrying an in-process UI progress callback even though persisted operation progress is already exposed by the existing `workbench.readProgress()` poll.

## Goals / Non-Goals

**Goals:**

- Add a grouped, environment-neutral `SynthesisConceptsClient` with four bounded commands.
- Validate and rebuild all known request fields before invoking narrow in-process legacy ports.
- Preserve opaque JSON-safe command results, including valid Concept domain diagnostics.
- Route the four Workbench paths through the lazily resolved default client without changing input normalization, confirmation, single-flight, or invalidation behavior.
- Retain 125 public service methods and four direct legacy consumers.

**Non-Goals:**

- Migrate Concept queries, checkpoint export, Topic Graph, Tags, Sync, Topic artifacts, Host Bridge, or MCP consumers.
- Change `failOnDiagnostic` or add diagnostic handling to commands that do not currently use it.
- Add progress callbacks, streaming contracts, or new Concept domain behavior.
- Change service methods, repositories, persistence, inventory, autosync, or public service signatures.

## Decisions

### 1. Add a top-level Concepts client capability

`SynthesisClient` gains `concepts: SynthesisConceptsClient`, matching the existing top-level `tags`, `topics`, `references`, and `graph` capabilities. The interface exposes service-aligned command names: `rebuildConceptKbIndex`, `updateConceptDisplayText`, `applyConceptReviewAction`, and `deleteConceptEntries`.

All four commands return an opaque JSON-safe Concept command result. The client does not expose Workbench state, UI callbacks, progress functions, or domain implementation types.

### 2. Use strict canonical Concept DTOs

Display-text update requires a trimmed, non-empty `conceptId` and at least one of `short_definition`, `definition`, `usage_note`, or `editorial_note`. Values must be strings and are trimmed; an empty string remains valid because it clears an optional display field. Unknown JSON-safe fields are discarded, and a patch with no recognized fields is invalid.

Review requests require a trimmed, non-empty `reviewId` and `approve_create | merge_into_existing | reject`. Optional `targetConceptId`, when present, must trim to a non-empty string. The adapter does not require a target for `merge_into_existing`; the existing domain diagnostic for a missing target remains a valid result.

Deletion requires a non-empty `conceptIds` array whose members are strings and remain non-empty after trimming. Workbench-only singular/batch aliases do not cross the client contract.

### 3. Validate and rebuild before resolving legacy ports

The adapter first validates JSON safety and known DTO fields, then constructs a fresh request, and only then resolves the corresponding optional port. Invalid requests reject with `invalid_request` without invoking or resolving the legacy operation.

Missing ports reject with `unavailable`; existing client errors and `storage_busy` keep their classifications; ordinary exceptions become `internal`. Missing/closed review, missing merge target, delete not-found, and returned diagnostics remain opaque domain results.

### 4. Preserve Workbench orchestration while removing progress callbacks

Each command resolves the default client inside its existing `runWorkbenchCommandOnce` closure. Existing identifier trimming, action allowlist, optional target handling, deletion aliases, and single-flight arguments remain at the Workbench boundary.

Concept KB rebuild stays protected and deferred but calls a no-argument client method. Persisted operation progress continues through `workbench.readProgress()`; the client contract does not carry `onProgress`. Only review action keeps `.then(failOnDiagnostic)`. All four commands retain Concepts/Review invalidation, and no confirmation or refresh behavior is added.

## Risks / Trade-offs

- **Strict display fields can expose payload drift** → Lock the four supported fields, empty-string clearing, and unknown-field behavior in adapter and Workbench tests.
- **Review target validation can absorb domain behavior** → Validate only a provided target; let an omitted merge target reach the domain and return its established diagnostic.
- **Removing the callback can hide progress** → Retain protected/deferred execution and verify the persisted `workbench.readProgress()` path remains the only client-side progress mechanism.
- **Static migration boundaries can regress** → Forbid only the four migrated Workbench direct service calls while retaining exact service and consumer counts.

## Migration Plan

1. Add failing contract, adapter, Workbench routing, orchestration, and boundary assertions.
2. Add Concept contracts, adapter ports and validation, and default legacy composition.
3. Route the four Workbench calls without changing service or Concept KB domain behavior.
4. Update current-state documentation and run focused through production validation.

Rollback restores the four Workbench service calls and removes the Concepts client capability; no persisted schema or data migration is involved.

## Open Questions

None.

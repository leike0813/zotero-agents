## Context

The production Synthesis Workbench already routes Reference maintenance commands through `SynthesisClient.references`, but canonical revision review and Reference match proposal decisions still resolve the complete legacy service. The three remaining review/proposal paths normalize UI payloads in the Workbench and return domain result objects whose failures and plural `diagnostics` are intentionally distinct from client transport failures.

These calls form a coherent migration slice: canonical review has one strict action enum, single proposal decisions have a second enum, and batch decisions extend that enum with a discriminated manual-target action. They share command single-flight, singular `diagnostic` handling, and Index/Review/Graph invalidation without confirmation, deferred start, or UI progress callbacks.

## Goals / Non-Goals

**Goals:**

- Extend `SynthesisClient.references` with three bounded review/proposal commands and strict environment-neutral DTOs.
- Validate and rebuild all known request fields before invoking narrow in-process legacy ports.
- Preserve opaque JSON-safe command results, including valid domain failure objects and plural `diagnostics`.
- Route the three Workbench call sites through the lazily resolved default client without changing payload normalization or command orchestration.
- Retain 125 public service methods and four direct legacy consumers.

**Non-Goals:**

- Change `failOnDiagnostic` to recognize plural `diagnostics` or reinterpret domain failures as client errors.
- Migrate canonical merge or batch merge, metadata update, archive, Reference queries, maintenance commands, or workflow apply.
- Migrate Tag, Concept, Topic Graph, Topic, Git/WebDAV Sync, Host Bridge, or MCP consumers.
- Change Reference matching algorithms, service methods, repositories, persistence, inventory, or public service signatures.

## Decisions

### 1. Model review and proposal requests as strict contracts

Canonical review accepts a non-empty `reviewItemId` and `accept | reject`. A single proposal decision accepts a non-empty `proposalId` and `accept | reverse_accept | reject | reopen | delete`. Batch decisions contain at least one proposal decision and add `manual_target` with a strict discriminated target: either a positive-integer Zotero `libraryId` plus non-empty `itemKey`, or a non-empty `canonicalReferenceId`.

Alternative: expose the Workbench's loose payload objects directly. Rejected because aliases, trimming, defaults, and filtering belong at the UI boundary, while the client contract must remain portable and independently validatable.

### 2. Rebuild known DTO fields before invoking three narrow legacy ports

The in-process adapter validates the request shape, action enum, identifiers, non-empty batch, and manual target discriminator, then constructs fresh request objects containing only known fields. Invalid DTOs reject with `invalid_request` before the relevant port is called. Successful legacy values use the shared JSON-safe object normalization path.

Missing ports reject with `unavailable`; existing client errors and `storage_busy` keep their classifications; ordinary exceptions become `internal`. A well-formed legacy domain result remains an opaque command result even when it reports failure or contains `diagnostics`.

Alternative: rely on TypeScript types and service validation. Rejected because runtime callers can cross untyped boundaries, and the adapter is the transport boundary responsible for rejecting malformed DTOs consistently.

### 3. Keep Workbench normalization and orchestration at the host boundary

Each action resolves the default client dynamically inside its existing `runWorkbenchCommandOnce` execution closure. Existing snake/camel aliases, trimming, default actions, and batch filtering construct the strict client DTOs. Existing single-flight keys, `.then(failOnDiagnostic)`, and Index/Review/Graph invalidation remain intact.

No migrated action adds confirmation, `deferStart`, or a progress callback. `failOnDiagnostic` continues to inspect only singular `diagnostic`; plural `diagnostics` behavior is deliberately unchanged.

Alternative: centralize payload normalization in the client. Rejected because the client must expose one canonical DTO rather than encode Workbench-specific aliases and UI defaults.

### 4. Preserve the mixed Workbench migration boundary

Only the three review/proposal calls move. Workbench remains a recorded legacy-service consumer for other Reference mutations and command domains. Default legacy composition delegates the new ports to the existing service without changing service methods, domain logic, or inventory.

## Risks / Trade-offs

- **Strict runtime validation can expose payload drift** → Lock all Workbench aliases, trimming, defaults, and batch filtering in focused routing tests before changing production code.
- **Manual targets can be ambiguous or partially populated** → Use an exact discriminated union and reject empty, mixed, or non-positive Zotero targets before port invocation.
- **Domain failures can be mistaken for transport failures** → Normalize only thrown client/legacy errors; keep legal returned objects opaque and JSON-safe.
- **Command orchestration can shift during routing** → Preserve the existing execution closure, single-flight keys, singular diagnostic chain, and three-surface invalidation verbatim.
- **Static migration boundaries can regress** → Forbid only the three migrated direct service calls while retaining the exact service and consumer counts.

## Migration Plan

1. Add failing contract, adapter, Workbench routing, behavior, and boundary assertions.
2. Add strict Reference review/proposal DTOs, adapter ports and validation, and default legacy composition.
3. Route the three Workbench calls without changing host orchestration or domain behavior.
4. Update current-state documentation and run focused through production validation.

Rollback restores the three Workbench service calls and removes the new client methods and ports; no persisted schema or data migration is involved.

## Open Questions

None.

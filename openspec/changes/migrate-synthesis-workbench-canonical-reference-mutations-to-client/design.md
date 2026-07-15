## Context

The production Synthesis Workbench already routes Reference maintenance and review/proposal commands through `SynthesisClient.references`, but canonical merge, batch merge, metadata update, and archive still resolve the complete legacy service. The Workbench currently normalizes UI aliases and command defaults, while the existing service owns all domain decisions and returns result objects whose domain failures and plural `diagnostics` are distinct from client transport failures.

These calls form the final coherent Reference command migration slice. They share command single-flight and singular `diagnostic` handling, while merge commands invalidate Graph in addition to Index and Review and only the batch merge command uses deferred start.

## Goals / Non-Goals

**Goals:**

- Extend `SynthesisClient.references` with four bounded canonical Reference mutation commands and environment-neutral DTOs.
- Validate and rebuild all known request fields before invoking narrow in-process legacy ports.
- Preserve opaque JSON-safe command results, including valid domain failure objects and plural `diagnostics`.
- Route the four Workbench call sites through the lazily resolved default client without changing payload normalization or command orchestration.
- Retain 125 public service methods and four direct legacy consumers.

**Non-Goals:**

- Change `failOnDiagnostic` to recognize plural `diagnostics` or reinterpret domain failures as client errors.
- Add confirmation dialogs, progress callbacks, streaming contracts, or new domain behavior.
- Migrate Reference queries, Tag, Concept, Topic Graph, Git/WebDAV Sync, Topic artifacts, Host Bridge, or MCP consumers.
- Change canonical Reference algorithms, service methods, repositories, persistence, inventory, or public service signatures.

## Decisions

### 1. Model canonical mutations as strict contracts

A merge pair contains source and target effective canonical identifiers, both trimmed and non-empty. A single merge adds optional boolean `confirmRetargetGroup`; omitted means false. A batch contains at least one strict merge pair. Metadata update contains a non-empty canonical Reference identifier and a patch limited to `title`, `normalizedTitle`, `year`, `authors`, and `identifiers`; archive contains only a non-empty canonical Reference identifier.

Metadata patches may be empty and may contain empty authors or identifiers. String values, author entries, and identifier keys and values are trimmed; entries that become empty and invalid field types are rejected. Unknown JSON-safe fields are discarded by rebuilding the bounded DTO.

Alternative: expose the Workbench's loose payload objects directly. Rejected because aliases and UI normalization belong at the host boundary, while the client contract must remain canonical and portable.

### 2. Rebuild known DTO fields before resolving four narrow legacy ports

The in-process adapter validates request shape, identifiers, optional boolean confirmation, non-empty batch, and metadata field types, then constructs fresh request objects containing only known fields. Invalid DTOs reject with `invalid_request` before the relevant port is resolved or called. Successful legacy values use the shared JSON-safe object normalization path.

Missing ports reject with `unavailable`; existing client errors and `storage_busy` keep their classifications; ordinary exceptions become `internal`. Well-formed legacy domain results remain opaque command results even when they report same-ID merge failure, insufficient confirmation, binding/blocking conflicts, batch failure, or plural `diagnostics`.

Alternative: rely on TypeScript types and service validation. Rejected because runtime callers can cross untyped boundaries and the adapter owns transport validation.

### 3. Keep Workbench normalization and orchestration at the host boundary

Each action resolves the default client dynamically inside its existing `runWorkbenchCommandOnce` execution closure. Existing snake/camel aliases, trimming, `Boolean(confirmRetargetGroup)`, batch object filtering and canonical DTO mapping, metadata patch defaulting, and normalized-title alias mapping remain at the Workbench boundary.

The existing single-flight keys and `.then(failOnDiagnostic)` chains remain. Only batch merge retains `deferStart: true`. Merge and batch merge invalidate Index, Review, and Graph; metadata update and archive invalidate Index and Review. No path adds confirmation or progress callbacks.

### 4. Preserve domain ownership and the remaining mixed Workbench boundary

Default legacy composition delegates the four ports to existing service methods. Service methods, inventory, persistence, and domain logic do not change. The Workbench remains a recorded direct legacy-service consumer for Tag, Concept, Topic Graph, Sync, and other out-of-scope operations.

## Risks / Trade-offs

- **Strict batch validation can expose non-standard payload drift** → Preserve Workbench filtering and canonical mapping, then reject the whole client request if any retained member has an empty identifier.
- **Metadata patches can accidentally leak unknown fields** → Rebuild only the five supported fields and validate nested author and identifier entries.
- **Domain failures can be mistaken for transport failures** → Normalize only thrown client/legacy errors; keep legal returned objects opaque and JSON-safe.
- **Command orchestration can shift during routing** → Lock single-flight, batch-only defer, singular diagnostic handling, and surface invalidation in focused tests.
- **Static migration boundaries can regress** → Forbid only the four migrated direct service calls while retaining exact service and consumer counts.

## Migration Plan

1. Add failing contract, adapter, Workbench routing, behavior, and boundary assertions.
2. Add strict canonical mutation DTOs, adapter ports and validation, and default legacy composition.
3. Route the four Workbench calls without changing host orchestration or domain behavior.
4. Update current-state documentation and run focused through production validation.

Rollback restores the four Workbench service calls and removes the new client methods and ports; no persisted schema or data migration is involved.

## Open Questions

None.

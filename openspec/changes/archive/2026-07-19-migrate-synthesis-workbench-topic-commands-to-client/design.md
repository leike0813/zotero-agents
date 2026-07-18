## Context

The production Workbench already uses `SynthesisClient.topics` for Topic option and report queries, but Topic artifact delete/purge and discovery-hint reject/restore still call the complete legacy service. These four inventory methods form one bounded `topics` command slice with existing Workbench confirmation, single-flight, domain-failure, diagnostic, and surface-invalidation behavior.

## Goals / Non-Goals

**Goals:**

- Extend the environment-neutral Topics client with four bounded commands.
- Validate and rebuild known identifier fields before invoking narrow in-process legacy ports.
- Preserve opaque JSON-safe domain results and stable client error classifications.
- Route the four Workbench paths through the lazily resolved client without changing normal UI behavior.
- Retain 125 public service methods and four direct legacy consumers.

**Non-Goals:**

- Migrate Topic queries, Topic Graph commands, Topic mirror operations, Tag, Sync, Topic synthesis workflow, Host Bridge, or MCP consumers.
- Change repositories, persistence, autosync, public service signatures, or Topic domain logic.
- Add aliases, progress callbacks, streaming, deferred execution, or new confirmation dialogs.

## Decisions

### 1. Extend the existing Topics capability

`SynthesisTopicsClient` gains service-aligned methods named `deleteTopicArtifact`, `purgeDeletedTopicArtifacts`, `rejectTopicDiscoveryHint`, and `restoreTopicDiscoveryHint`. The commands return one opaque JSON-safe `SynthesisTopicCommandResult`; the client contract does not expose service implementation types or Workbench callbacks.

### 2. Use strict canonical identifier DTOs

Topic deletion requires a trimmed, non-empty `topicId`. Discovery-hint actions require a trimmed, non-empty `hintId`. The adapter first checks JSON safety, discards unknown JSON-safe fields, and rebuilds a request containing only the canonical identifier. Purge is a no-argument command.

This keeps UI payload interpretation at the Workbench boundary and prevents arbitrary legacy-service arguments from crossing the client boundary. No snake-case aliases are added because the existing Workbench paths accept only `topicId` and `hintId`.

### 3. Validate before resolving ports and preserve domain results

The in-process adapter validates and rebuilds each request before resolving its optional legacy port. Invalid input becomes `invalid_request` without invoking legacy code; a missing port becomes `unavailable`; existing client errors and `storage_busy` remain classified; ordinary exceptions become `internal`.

Successful and domain-failure returns use shared JSON object normalization. Topic delete `not_found`, discovery-hint `not_found`, and plural `diagnostics` therefore remain results rather than transport errors.

### 4. Preserve Workbench-specific failure and refresh behavior

All four commands resolve the default client inside their existing `runWorkbenchCommandOnce` closures. Delete and purge retain their current confirmation dialogs and immediate start. Delete continues to throw the returned domain `reason` when `ok` is false. Discovery-hint commands retain singular-only `failOnDiagnostic`, so plural diagnostics remain legal results; an empty hint ID continues to skip execution and refresh the current surface.

Delete and purge continue to invalidate Home and Topics. Discovery-hint actions continue to use the default selected-surface invalidation instead of introducing a broader refresh. No command gains `deferStart`, progress callbacks, or streaming state.

## Risks / Trade-offs

- **Strict identifiers can expose malformed direct-client callers** → Lock empty and non-string identifiers as `invalid_request` in adapter tests; normal Workbench payloads are already canonical.
- **Opaque delete results still drive Workbench errors** → Preserve the current `ok`/`reason` check in the Workbench while keeping the client result transport opaque.
- **Plural hint diagnostics can be mistaken for client failures** → Test that shared normalization returns them unchanged and that singular-only Workbench diagnostic handling remains intact.
- **Documentation already miscounts Topic host commands** → Correct the relevant Topic Graph and Topic Artifact table counts while documenting the new boundary.

## Migration Plan

1. Add failing contract, adapter, Workbench routing, and boundary tests.
2. Extend Topics contracts, in-process ports, validation, and default legacy composition.
3. Route the four Workbench commands without modifying service or domain behavior.
4. Update current-state documentation and run focused through production validation.

Rollback restores the four Workbench service calls and removes the added Topics client methods and ports. No data or schema rollback is required.

## Open Questions

None.

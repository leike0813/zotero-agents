## Context

The Workbench currently edits one staged Tag suggestion by calling `discardStagedTagSuggestions` and then `stageTagSuggestions`. Those calls use separate service/domain transactions, so the first commit can delete the original row before the replacement write fails. The route also remains coupled to the complete Synthesis service even though adjacent staged Tag bulk operations use `client.tags`.

Staged suggestions are an inbox-like persistence surface rather than canonical vocabulary entries. They intentionally bypass TagVocab protocol validation and canonical autosync. The migration must preserve host payload aliases, command orchestration, existing note semantics, and the repository's current staged-suggestion store format.

## Goals / Non-Goals

**Goals:**

- Make staged Tag update/rename one atomic Tag domain command exposed through `client.tags`.
- Define one strict, environment-neutral request DTO and opaque JSON-safe result.
- Preserve deterministic collision merge, casing, timestamps, and parent binding behavior.
- Preserve Workbench normalization, single-flight, immediate start, and Tags-only invalidation.
- Retain stable client error categories and four approved direct legacy service consumers.

**Non-Goals:**

- Migrating generic staging, promotion, bulk discard/clear, Tag import, audit, Host Bridge, or MCP.
- Adding hidden deletion semantics to `stageTagSuggestions`.
- Changing canonical vocabulary edit/delete, autosync, promotion, or Tag protocol validation.
- Changing the staged-suggestion persistence format or treating a cold/UI cache as correctness state.
- Adding confirmation, deferred execution, progress callbacks, streaming, or diagnostic transformation.

## Decisions

### Use a dedicated strict update DTO

Add `SynthesisStagedTagUpdateRequest` with required `originalTag`, `tag`, `facet`, `sourceFlow`, `note`, and `parentBindings` fields. The adapter requires a JSON-safe object, trims all string fields, rejects empty required identifiers/classifiers, permits an empty trimmed note, and requires every parent binding to be a positive integer. It rebuilds only known fields, deduplicates parent bindings, and sorts them ascending.

This keeps malformed or over-broad host objects outside the legacy boundary. Reusing the generic staging DTO was rejected because it cannot express the original identity cleanly and would encourage hidden delete behavior in a broader command.

### Put the complete mutation in one domain transaction

Add `updateStagedTagSuggestion` to Tag Vocabulary domain and service. The service only delegates; the domain opens one repository transaction, reads all relevant staged rows, performs collision resolution, deletes superseded rows, and writes the surviving row before committing. Any read/write exception aborts the transaction and restores both original and target states.

The domain handles four cases: missing original upserts the requested target; same tag updates in place; a true rename without a target deletes the old row and creates the complete requested row; a rename with an exact or case-insensitive target merges into that target and removes all case variants. Staged updates continue to bypass protocol validation and canonical autosync.

### Make merge ownership explicit

Non-empty requested `facet` and `sourceFlow` replace target values. A non-empty requested `note` replaces the target note, while an empty requested note preserves an existing target note. Parent bindings become the sorted union of target and request bindings. Collision merges preserve the target `created_at`; new rows and target-free renames receive a new `created_at`; every successful command refreshes `updated_at`. The request's `tag` casing is authoritative.

For a target-free rename, no omitted legacy data is inherited from the old row: the complete request creates the replacement. This avoids hidden coupling between the update contract and historical row shape.

### Keep the adapter and Workbench boundaries narrow

The in-process adapter validates and rebuilds the request before resolving its optional legacy port, then normalizes a successful response as `SynthesisTagCommandResult`. Missing ports map to `unavailable`; known client errors and storage-busy errors retain their categories; ordinary exceptions and invalid results map to `internal`.

The Workbench resolves the default client inside the existing `runWorkbenchCommandOnce` closure. It retains `originalTag` fallback to `tag`, facet fallback to the tag prefix and then `topic`, `source_flow`/`parent_bindings` aliases, the `tag-regulator-suggest` source-flow default, `{ tag }` single-flight arguments, empty-tag skip, immediate start, and Tags-only invalidation.

### Register the new public service method once

The service inventory records the method as `tag_commands / knowledge.tags / client_capability`. The inventory becomes 126 public methods while the direct-consumer allowlist remains four. No second service helper or Workbench compatibility branch is introduced.

## Risks / Trade-offs

- [Collision cleanup could delete a target variant before the final write fails] → execute reads, deletes, and write in the repository's single transaction and add a fault-injected rollback test.
- [Case-insensitive lookup can pick an unstable target] → use deterministic repository ordering and request casing for the one surviving row while removing every matching variant.
- [Empty note could ambiguously mean clear] → preserve current behavior: empty note does not clear an existing target note.
- [The public service surface grows during client migration] → register exactly one client-capability method and retain the four-consumer boundary check.
- [Workbench payloads contain unknown host fields] → normalize aliases in the host, then let the adapter rebuild only the strict DTO fields.

## Migration Plan

Add red contract, adapter, Workbench, domain rollback, and service-boundary tests; implement the DTO/client/port, atomic domain/service command, composition, and Workbench route; update current-state documentation; then run focused checks, the production build, and strict OpenSpec validation. Rollback restores the Workbench's two-call route and removes the new client/domain method and inventory entry; no persistence migration is required.

## Open Questions

None.

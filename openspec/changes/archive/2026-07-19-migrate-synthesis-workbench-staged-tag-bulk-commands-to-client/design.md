## Context

`SynthesisClient.tags` already owns Tag Vocabulary maintenance/export and Workflow Host Tag methods. However, `discardStagedTagSuggestions` still accepts and forwards an arbitrary JSON object, promote and clear have no client methods, and the Workbench directly resolves the legacy service for all three staged bulk actions.

The Workbench currently canonicalizes either a `tags` array or singular `tag`, skips empty selections, uses the first tag in the single-flight key, starts all three commands immediately, treats plural diagnostics as successful domain data, and invalidates only the Tags surface. The Workflow Host separately calls discard with an empty array as a legal no-op.

## Goals / Non-Goals

**Goals:**

- Route staged promotion, discard, and clear through `client.tags`.
- Replace the broad discard request with one strict shared Tag selection DTO.
- Preserve Workbench and Workflow Host observable behavior, including empty-selection differences.
- Normalize legacy results and retain stable client error categories.

**Non-Goals:**

- Migrating staged edit, Tag import, vocabulary edit/delete, bootstrap, or audits.
- Making staged rename atomic or changing partial-failure behavior.
- Changing service, domain, repository, autosync, or public method inventory.
- Adding confirmation, progress callback, streaming, deferred start, retries, or singular diagnostic failure handling.

## Decisions

### One strict selection DTO for promote and discard

Add `SynthesisTagSelectionRequest { tags: string[] }` and use it for both methods. The adapter first verifies a JSON-safe object, requires a `tags` array, requires every member to be a string that is non-empty after trimming, rebuilds only `{ tags }`, and preserves member order and duplicates. Unknown JSON-safe fields are discarded; non-JSON request content is invalid.

### Empty selection remains valid at the client boundary

The client accepts `{ tags: [] }` and forwards it as a legal no-op. This preserves the twelve-method Workflow Host contract and existing service behavior. The Workbench retains its earlier UI behavior by skipping promote/discard before client resolution when its normalized selection is empty.

### Opaque object command results

Add `SynthesisTagCommandResult = SynthesisJsonObject`. Promote, discard, and clear all normalize successful legacy results as objects. Promote results may contain plural diagnostics, skipped tags, requested tags, or parent-apply failures; these remain legal results rather than client errors.

### Preserve host orchestration outside the client

Resolve the default client inside each existing `runWorkbenchCommandOnce` closure. Promote/discard keep `{ tag: tags[0], tags }`, clear keeps `{}`, and all three remain immediate, confirmation-free, callback-free, and Tags-only invalidating. No route uses `failOnDiagnostic`.

## Risks / Trade-offs

- [Tightening discard could break a caller that sends malformed JSON] → preserve the known empty-array Workflow Host call, update its type, and reject malformed direct client calls explicitly.
- [Duplicate tags look redundant] → preserve order and duplicates because the Workbench currently does not deduplicate and this change is boundary-only.
- [Plural promote diagnostics are not surfaced as command failure] → retain existing domain semantics and lock the absence of `failOnDiagnostic` in tests.
- [The Workbench remains a direct service consumer] → import and edit commands remain intentionally out of scope and keep it on the migration allowlist.

## Migration Plan

Add failing contract, adapter, Workflow Host, and Workbench boundary tests; implement the DTO and ports; migrate the three Workbench routes; update current-state documentation; then run focused and repository-wide validation. Rollback restores direct Workbench service calls and the prior broad discard signature while leaving unrelated Tag client methods untouched.

## Open Questions

None.

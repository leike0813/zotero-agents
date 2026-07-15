## Context

`SynthesisClient.tags` already owns Tag Vocabulary reads, maintenance, regulator export, and staged bulk commands. The Workbench still directly calls `previewTagVocabularyImport` and `applyTagVocabularyImport` on the legacy service. Preview is reached through two host-command aliases, stores service-owned in-memory preview state, and uses a global single-flight key. Apply accepts two UI-supported actions, reparses the raw payload, persists through the existing autosync write path, and clears preview state only after success.

The Workbench currently accepts only primitive string payloads that are non-empty after trimming but forwards the original string unchanged. Both commands start immediately, use no confirmation, callback, progress, streaming, defer, or diagnostic transformation, and invalidate only the Tags surface.

## Goals / Non-Goals

**Goals:**

- Route Tag import preview and apply through `client.tags`.
- Introduce strict canonical DTOs while preserving the original payload string.
- Preserve Workbench aliases, single-flight identity, invalid-input behavior, domain results, and surface invalidation.
- Normalize legacy results and retain stable client error categories.

**Non-Goals:**

- Changing the import parser, apply actions, preview state, autosync, or service method inventory.
- Requiring preview before apply or moving preview state across the client boundary.
- Migrating staged edit, vocabulary edit/delete, bootstrap, audit, Host Bridge, or MCP consumers.
- Adding confirmation, progress callbacks, streaming, deferred start, retries, or diagnostic failure conversion.

## Decisions

### Use narrow request objects for both import commands

Add `SynthesisTagImportPreviewRequest { payload: string }` and `SynthesisTagImportApplyRequest { payload: string; action: SynthesisTagImportAction }`. The action union contains only `use-imported` and `merge-non-conflicting`, matching the existing Workbench surface rather than broadening it to unused domain values.

The adapter requires a JSON-safe plain object, requires `payload` to be a primitive string that is non-empty after trimming, and rebuilds only the documented fields before resolving a legacy port. It validates `action` against the public union and discards unknown JSON-safe fields.

### Preserve raw payload bytes at the boundary

Trimming is used only to reject blank payloads. The canonical DTO retains the original string, including surrounding whitespace, because the Workbench currently forwards it unchanged and the domain parser owns JSON interpretation. The adapter does not parse the import payload or reclassify domain parser failures as request-shape failures.

### Keep import domain state in the service

The legacy composition maps preview's request object to the service's existing bare-payload signature and delegates apply unchanged. The service remains responsible for `tagImportPreviewState`, payload hashing, parsing, preview construction, autosync, and clearing preview state after successful apply.

### Preserve Workbench orchestration outside the client

Resolve the default client inside the existing `runWorkbenchCommandOnce` closures. Both preview aliases retain the `previewTagVocabularyImport` operation with `{}` arguments, so all preview payloads remain mutually single-flight. Apply retains `{ action }`, so equal actions share a key without adding payload identity. Both routes remain immediate and Tags-only invalidating, and neither uses `failOnDiagnostic`.

### Return opaque object results

Both client methods return `SynthesisTagCommandResult`. Preview conflicts and warnings, apply receipts, and plural diagnostics remain legal JSON-safe objects. Missing ports map to `unavailable`; malformed DTOs map to `invalid_request`; existing client errors and storage-busy classification are preserved; ordinary exceptions, parser failures, and non-object legacy responses map to `internal`.

## Risks / Trade-offs

- [A caller may expect object payloads accepted by the domain] → keep the service signature unchanged for direct consumers and deliberately expose only the Workbench's string surface through this client slice.
- [Normalizing whitespace could change payload hashes or parsing] → validate with `trim()` but forward the original string verbatim.
- [Preview aliases and coarse single-flight keys look redundant] → retain them because this is a boundary migration, not a UI concurrency redesign.
- [The Workbench remains a direct service consumer] → staged edit, vocabulary edit/delete, Sync, and other out-of-scope commands intentionally keep it on the migration allowlist.

## Migration Plan

Add failing contract, adapter, Workbench, and boundary tests; implement the DTOs and ports; migrate the Workbench routes; update current-state documentation; then run focused and repository validation. Rollback restores the two direct Workbench service calls and removes the two client methods without changing domain storage or canonical files.

## Open Questions

None.

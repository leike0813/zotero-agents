## Context

`updateTagVocabularyEntry` and `deleteTagVocabularyEntry` are the remaining Workbench Tag Vocabulary entry mutations that still perform a host-owned `loadTagVocabulary()` followed by a complete aggregate mutation and `saveTagVocabulary()`. This creates a non-atomic read-modify-write window and makes the Workbench responsible for Tag-domain conflict detection, metadata preservation, alias/replacement maintenance, validation, and persistence sequencing.

The adjacent Workbench Tag commands already use `SynthesisClient.tags`. The repository provides transaction-scoped canonical reads and writes, and the service layer provides `runCanonicalWriteWithAutosync` so a committed canonical mutation can notify autosync exactly once without coupling transaction rollback to notification success.

## Goals / Non-Goals

**Goals:**

- Make entry update and delete strict `client.tags` commands with environment-neutral DTOs and opaque results.
- Make each mutation a single Tag-domain repository transaction over the complete canonical aggregate.
- Preserve hidden entry metadata and unrelated timestamps while maintaining aliases, replacements, validation warnings, and protocol invariants.
- Preserve the Workbench's existing command orchestration and UI ownership.
- Keep error categories and public service inventory mechanically auditable.

**Non-Goals:**

- Migrating generic `saveTagVocabulary`, staged/import/promotion/bootstrap/audit commands, Git/WebDAV Sync, Host Bridge, or MCP.
- Merging on rename-to-existing or implicitly creating a missing entry during update.
- Changing the canonical persistence format or using pagination/cache state as mutation truth.
- Adding progress, streaming, deferred execution, or a new confirmation flow.

## Decisions

### Strict command DTOs at the public boundary

Add `SynthesisTagVocabularyEntryUpdateRequest` with `originalTag`, `tag`, `facet`, and `note`, plus `SynthesisTagVocabularyEntryDeleteRequest` with `originalTag`. The adapter validates the raw input before resolving the optional legacy port and rebuilds a canonical DTO, trimming all tag/facet identifiers, requiring non-empty identifiers, keeping `note` a string whose trimmed empty value explicitly clears the note, and dropping unknown JSON-safe fields. This matches other command adapters and prevents legacy runtime objects or excess fields from crossing the capability boundary.

### Domain-owned transaction over the canonical aggregate

Expose two public Tag service methods and implement their mutation in the Tag Vocabulary domain/service layer. Each opens one repository transaction, reads the complete canonical aggregate inside that transaction, computes a detached candidate, validates it through the existing TagVocab validator, updates references, and persists the candidate before the transaction commits. Validation or repository failures abort the complete transaction. A host-owned load/save sequence was rejected because it cannot guarantee atomicity or centralize invariants.

### Explicit update identity and conflict semantics

`originalTag` identifies the entry. A missing original produces one not-found diagnostic and no write. A same-tag update changes only tag/facet/note. A true or case-only rename preserves source, deprecated state, replacement, entry aliases/abbreviations, usage, last-synced, and creation time while refreshing only the updated entry timestamp. If another entry occupies the exact or case-insensitive target, the result contains one conflict diagnostic and makes no write. Rename-to-existing merge is intentionally excluded because it would require a separate merge policy.

### Reference-aware rename and delete

Rename redirects global alias targets and other entries' replacement targets from the old canonical tag to the new canonical tag. Delete removes global aliases that target the deleted tag and clears replacement values in other entries that target it. Untouched entries, aliases, abbreviations, protocol data, and their timestamps remain byte-for-byte stable. Validation warnings are recalculated from the candidate aggregate after these changes.

### Autosync follows committed mutation

The service methods use `runCanonicalWriteWithAutosync`. Only an actual successful repository commit counts as a mutation and triggers one autosync notification. Missing delete, conflicts, not-found update, and other diagnostic-only results do not notify. Notification failure is reported through the existing wrapper behavior but cannot roll back the already committed canonical mutation.

### Workbench keeps orchestration, client owns mutation

Resolve the default client dynamically inside the existing `runWorkbenchCommandOnce` closure. Keep update normalization for trimmed `originalTag`/`tag`, facet prefix fallback, and string note; keep `{ originalTag }` as the single-flight arguments, empty-value skips, immediate execution, and Tags-only invalidation. Delete retains its current UI confirmation. Both commands pass diagnostics through `failOnDiagnostic` so update conflict/not-found behavior uses existing failure feedback. No pending key, defer, progress, streaming, or confirmation changes are introduced.

## Risks / Trade-offs

- [Candidate validation may accidentally rewrite unrelated timestamps] → Preserve existing objects where possible and add focused domain tests for entry, alias, abbreviation, and protocol timestamps.
- [Case-only renames can be mistaken for conflicts with the original entry] → Exclude the identified original entry before exact/case-insensitive target lookup.
- [Reference cascade can leave dangling aliases or replacements] → Perform cascade changes on the complete in-transaction aggregate and validate the final candidate before persistence.
- [Autosync may fire for diagnostic/no-op outcomes] → Return the wrapper's mutation flag only after a write and test success, no-op, diagnostic, and notification-failure paths.
- [Public boundary drift can leak permissive legacy inputs] → Rebuild DTOs before port resolution and lock invalid-before-port plus unknown-field stripping in adapter tests.

## Migration Plan

First add failing contract, adapter, Workbench, domain transaction, and autosync tests. Then add the DTOs and ports, implement the transaction-owned domain mutations and public service methods, compose the ports, and migrate the two Workbench routes. Update inventory and current-state documentation, run focused suites and repository checks, then strictly validate the OpenSpec change. Rollback restores the direct Workbench load/save route and removes the two public methods and ports; canonical storage requires no migration.

## Open Questions

None.

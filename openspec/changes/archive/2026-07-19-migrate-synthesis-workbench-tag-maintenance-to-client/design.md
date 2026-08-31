## Context

`SynthesisClient.tags` already owns Tag Vocabulary load/save/export, staged-suggestion, and audit operations, but its contracts remain embedded in the workflow contract module. The Workbench still resolves the complete legacy service for validation, projection rebuild, and regulator export. Rebuild also passes a Workbench callback into the service even though persisted progress is available through `client.workbench.readProgress()`.

The migration must preserve the existing public service surface, domain results, command confirmation, single-flight keys, start timing, clipboard output, and surface invalidation. Contracts must remain environment-neutral and JSON-safe.

## Goals / Non-Goals

**Goals:**

- Make all three selected Tag Vocabulary maintenance/export commands client consumers.
- Give Tag contracts a dedicated capability module and a single package-level source of truth.
- Preserve Workbench orchestration while removing its rebuild callback from the capability boundary.
- Normalize legacy results and retain stable client error categories.

**Non-Goals:**

- Migrating staged suggestions, import, vocabulary edit/delete, bootstrap, or audit Workbench commands.
- Changing Tag validation, index rebuild, export sorting, repositories, persistence, or autosync.
- Adding confirmation, streaming, clipboard, or progress callback contracts.
- Changing Host Bridge, MCP, workflow-host method counts, or public service inventory.

## Decisions

### Dedicated Tag contract module

Move the existing Tag DTOs and `SynthesisTagsClient` from `workflow.ts` to `tags.ts`, export the module from the package index, and update `client.ts` to import the interface directly. Existing application code imports these names from the package index, so the public import surface remains stable while the domain capability stops depending on an unrelated workflow module.

### Narrow no-argument maintenance methods

Expose `validateTagVocabulary()` as an opaque JSON-safe result and `rebuildTagVocabularyIndex()` as an opaque JSON object. Reuse `exportTagVocabularyForRegulator(): Promise<string[]>`. The Workbench supplies no validation override today, so the client must not expose the optional service-only validation arguments.

### Adapter-owned result normalization

Add optional no-argument legacy ports for validation and rebuild. Normalize validation with the shared JSON-value normalizer and rebuild with the shared JSON-object normalizer; keep the existing strict string-array export normalization. Missing ports map to `unavailable`, known client errors and storage-busy failures remain stable, and ordinary or invalid-result failures map to `internal`.

### Preserve host orchestration outside the client

Resolve the default client inside each existing `runWorkbenchCommandOnce` closure. Validation remains immediate with Home-only invalidation. Rebuild retains protected confirmation, Tags invalidation, and `deferStart: true`, but no longer passes a callback because persisted progress polling is the client boundary. Export remains immediate and keeps newline formatting plus clipboard writing in the Workbench host layer, with its current Home-only invalidation.

## Risks / Trade-offs

- [Moving existing Tag declarations could break direct `workflow.ts` imports] → repository consumers already import through the package index; update the internal `client.ts` import and enforce package contract checks.
- [Removing the rebuild callback could reduce transient notifications] → retain the existing persisted Workbench progress polling path and lock callback absence in tests.
- [Opaque validation results provide limited compile-time detail] → validation output is domain-owned and currently consumed opaquely; JSON normalization preserves behavior without coupling contracts to internal validator types.
- [Home-only invalidation for validation/export may look unusual] → preserve it as an observable current behavior in this boundary-only change.

## Migration Plan

Add failing contract, adapter, and Workbench boundary tests; implement the dedicated Tag contracts and ports; migrate the three Workbench routes; update current-state documentation; then run focused and repository-wide validation. Rollback consists of restoring direct Workbench service routing and removing the two added client methods while leaving existing Tag client methods untouched.

## Open Questions

None.

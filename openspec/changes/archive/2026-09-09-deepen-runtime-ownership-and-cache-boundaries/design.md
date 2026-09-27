## Context

See [proposal.md](proposal.md) for motivation. SkillRunner runs already have a durable owner, but Task Runtime also hydrated and merged copies. Preferences local-runtime actions were embedded in the general preference script. Workflow-specific logging validation lived in the generic log manager. Literature Artifact migration exposed one lifecycle service while retaining duplicate conversion/classification paths and duplicated Dashboard version literals.

The implementation must preserve existing wire DTOs and persistence formats, remain compatible with the Zotero plugin runtime, and keep UI performance caches separate from lifecycle truth.

## Goals / Non-Goals

**Goals:**

- Establish one lifecycle or conversion owner at each affected boundary.
- Delete duplicate synchronization, classification, and adapter code.
- Preserve bounded UI refresh behavior and current external contracts.
- Keep trust-boundary validation and teardown behavior explicit and testable.

**Non-Goals:**

- Changing SkillRunner Run Store persistence or history limits.
- Replacing Dashboard's revision-scoped active-row projection cache.
- Changing Preferences markup, Host Bridge behavior, migration receipts, or public Workflow Host DTOs.
- Optimizing the Run Store's retained-payload scan; active/apply/archived semantics require a separate design before safe storage-level filtering.

## Decisions

### Read SkillRunner projections directly at the Task Runtime boundary

Generic task records remain process-local. Each task list or summary read combines those records with current SkillRunner Run Store projections keyed by their canonical projection ID. Run Store change notifications continue to invalidate Dashboard projections, but there is no explicit projection copy or merge state.

This removes stale-active races and several identity reconciliation helpers. Keeping the old cache was rejected because reads already queried the Run Store unconditionally, so the duplicate map did not avoid the storage projection work. Removing Dashboard's active-row cache was also rejected because it is a UI performance cache with a stable revision/dirty contract, not lifecycle state.

### Bind Preferences local-runtime UI to one captured window

The local-runtime section owns its DOM lookup, listeners, runtime subscription, transient uninstall state, and render guard in one binder returning cleanup. Registering a new binding disposes the previous one, while unload cleanup checks binding identity. Async Host effects may settle, but a disposed binding cannot update the old window or chain more effects.

A shared global controller was rejected because its ownership would remain ambiguous across Preferences window replacement. Adding a framework-level store was unnecessary for one bounded section.

### Keep Workflow validation above the runtime log core

A narrow Workflow logging owner validates the public caller DTO, binds trusted execution identity, sanitizes Workflow-specific content, and submits the normalized entry. The runtime log manager retains only generic append, retention, persistence, filtering, and observation responsibilities.

Leaving validation in the generic manager was rejected because it inverted the dependency toward Workflow Host. Re-exporting the new owner from the old module was rejected because it would preserve the misleading boundary and load a larger module graph in platform-neutral tests.

### Use one pure Literature Artifact converter and one definition source

Legacy decoding, normalization, deterministic matching, classification, diagnostics, counts, and basis calculation live behind one pure conversion entry used by library migration and offline import. The lifecycle owner retains scan/apply/stop/continue and Broker-backed paired writes. Dashboard imports the migration owner's static ID/version; unavailable page-only fallback uses a non-actionable placeholder and does not display a version.

Keeping separate classification helpers was rejected because the output contract is indivisible and duplicate classification can drift. Introducing a converter interface or factory was rejected because there is one implementation and no runtime substitution requirement.

## Risks / Trade-offs

- [Task list reads still project retained SkillRunner rows before filtering] → Keep the current bounded retention limit; address storage-level active filtering only after its apply/archived semantics are specified.
- [A disposed Preferences action may still finish at the Host] → Suppress stale UI and follow-up effects; do not claim cancellation where the Host contract does not provide it.
- [Moving validation can accidentally weaken bounds] → Reuse the same limits and cover valid, oversized, unsafe, and non-interactive inputs in existing runtime-log tests.
- [Migration version changes invalidate old actionable plans] → Preserve history summaries while requiring a fresh scan for the exact current version.

## Migration Plan

1. Introduce the narrow owners/converter and characterization tests.
2. Switch all callers to the direct owner paths.
3. Delete duplicate cache, merge, validation, classification, and unused adapter code.
4. Update component documentation and validate targeted tests, type checks, lint, SSOT invariants, help-doc generation, and production build.

Rollback is source-only: restore the prior callers and helpers together. No persisted data migration or dependency rollback is required.

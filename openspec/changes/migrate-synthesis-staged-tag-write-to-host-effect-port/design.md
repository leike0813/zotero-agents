## Context

Staged Tag parent bindings are currently numeric Zotero item IDs stored in `parent_bindings_json`. Promotion commits canonical vocabulary and then reaches directly from `service.ts` into `Zotero.Items` and `handlers.tag`; Tag Regulator also has a duplicate numeric-ID mutation path. The Synthesis sidecar plan requires application code to carry only stable DTOs and to express Host writes as semantic effects with explicit receipts.

## Goals / Non-Goals

**Goals:**

- Make `{ libraryId, itemKey }` the single current staged-parent identity.
- Preserve legacy staged data through a bounded, retryable Host resolution migration.
- Move bound-parent Tag writes behind an idempotent effect/receipt contract.
- Converge Workbench and Tag Regulator publication on the existing staged promotion command.
- Preserve `128 methods / 1 direct consumer` and existing binding-count UX.

**Non-Goals:**

- Changing the SQLite schema, canonical Tag Vocabulary artifacts, Topic mirror runtime, Graph engine, or remote sidecar activation.
- Adding a Synthesis client method, changing staged discard semantics, or applying effects for tags skipped because they are already controlled.
- Archiving completed changes or removing the final full-service consumer.

## Decisions

### Stable refs are shared contract infrastructure

Add `SynthesisHostItemRef` plus one canonical rebuild helper and reuse it from Related Items and Tags. Staged arrays are deduplicated and sorted by library ID and item key. Numeric bindings are rejected by all new stage/update requests. This avoids parallel ref validators and prevents Host-local IDs from remaining in current DTOs.

### Legacy IDs migrate through a separate bounded Host port

The migration request contains one library ID and at most 100 positive numeric IDs; the result exactly partitions them into resolved refs and missing IDs. Startup reconciliation and every staged-tag entrypoint share one memoized gate. Successful resolution atomically rewrites every affected row, drops only missing/invalid bindings, and records bounded stable diagnostics in a fixed migration operation. A missing, failed, or malformed resolver leaves rows unchanged and returns `unavailable`; mixed-mode reads are not allowed.

Alternatives rejected: clearing legacy bindings loses recoverable user data; indefinitely accepting both identities preserves the sidecar coupling this change is meant to remove.

### Tag writes are idempotent semantic effects

Each effect carries a deterministic ID, `ensure_present`, a stable target, tag, staged-promotion provenance, `target_exists` precondition, and `synthesis.tags` permission. Batches cap at 50 and receipts distinguish applied, already satisfied, not found, and failed. Contract rebuilders enforce JSON safety, bounds, unique IDs, and exact receipt reconciliation before application code consumes results.

The Zotero adapter performs lookup and case-insensitive tag satisfaction checks, owns `handlers.tag.add`, and returns stable diagnostic codes without raw exception text. Shared Host item lookup lives in a Host-only helper used by both Tag and Related Items adapters.

### Canonical promotion precedes best-effort Host dispatch

The vocabulary commit remains authoritative. Effects run only after canonical write/autosync completes and only for actually promoted tags. A missing effect port, transport exception, or malformed receipt does not roll back promotion; it yields at most 20 stable diagnostics. `applied_parent_tags` contains stable `parent_ref` values and includes both newly applied and already-satisfied targets.

### Tag Regulator uses stage then promote

The workflow derives stable refs from the current parent's `libraryID` and `key`, persists them with staged suggestions, and calls the existing promotion API. Numeric binding normalizers and direct bound-parent item mutations are removed. The Workbench continues to project only a binding count and passes stable refs unchanged when editing.

## Risks / Trade-offs

- [Old numeric rows require a live Host before Tags can open] → Startup reconciliation runs eagerly and every staged operation retries through the same gate; rows remain untouched on infrastructure failure.
- [Vocabulary promotion can succeed while Host effects fail] → Preserve existing best-effort semantics, return structured diagnostics, and make effects idempotent for safe external retry.
- [The temporary resolution port still transports numeric IDs] → Limit it to legacy migration, bound batches, never expose it through Tags DTOs, and invoke it only when raw stored rows contain numeric values.
- [Workflow publication behavior could diverge] → Reuse the existing client promotion command and add workflow regressions that forbid direct bound-parent writes.

## Migration Plan

1. Ship contracts and adapters with default legacy composition injection.
2. During startup reconciliation, inspect raw staged binding JSON and resolve numeric IDs in bounded batches.
3. Atomically replace numeric values with stable refs; retain staged tags and record counts for missing/invalid entries.
4. Gate all staged operations until the migration succeeds, then use stable refs exclusively.
5. Rollback is code-only: the unchanged JSON column can still contain stable objects; no schema downgrade is required.

## Open Questions

None.

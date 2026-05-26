## Context

`add-synthesis-kg-git-sync` intentionally introduced Git Sync behind an injectable adapter. The remaining hardening issues are local correctness issues: canonical imports must be recorded as one canonical transaction, concurrent sync runs must be blocked across service instances, debounced store changes need an actual worker, and conflict UI must show the affected assets.

## Goals / Non-Goals

**Goals:**

- Import validated canonical envelope assets with one transaction receipt and one `canonical-store-changed` event.
- Roll back target assets if promotion fails.
- Persist sync locks with owner, acquisition time, expiry, and stale takeover.
- Coalesce repeated canonical change notifications into one sync run.
- Render affected conflict asset paths in the Workbench.

**Non-Goals:**

- No real Git CLI/remote adapter, credential UI, semantic merge, multi-remote/branch, SQLite sync, or mirror recovery rewrite.

## Decisions

1. **Foundation owns raw batch promotion.**  
   Git Sync should not write imported assets directly into `synthesis/`. It passes already-validated envelope text to a Foundation helper that stages, backs up, promotes, rolls back on failure, and writes receipt/event state.

2. **Receipt covers imported assets.**  
   The transaction changed-assets list includes every imported canonical asset plus `sync/sync-manifest.json`, not only the manifest.

3. **Persistent lock first, in-memory lock second.**  
   The lock file is the coordination mechanism. The in-memory flag only avoids reentrancy inside the same service instance.

4. **Debounce stays local and adapter-bound.**  
   `notifyCanonicalStoreChanged()` schedules one local timer. If Git Sync is disabled, blocked, paused, or locked, it only updates queue state and does not force a run.

5. **Conflict UI remains simple.**  
   Workbench shows relative canonical paths and reasons. It does not offer semantic merge controls.

## Risks / Trade-offs

- Rollback is best-effort because runtime persistence only offers file writes/removal, not filesystem-level atomic directory swaps.
- Debounce worker is process-local; a future production adapter can add startup reconciliation if needed.
- Persisted locks require an expiry to avoid deadlock after crashes.

## Migration Plan

1. Add Foundation raw batch transaction helper.
2. Update Git Sync import, lock, debounce, and conflict DTOs.
3. Extend UI snapshot and Workbench rendering.
4. Add regression tests for transaction changed assets, rollback, locks, debounce, conflict assets, and mirror recovery independence.

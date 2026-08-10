## Why

The runtime log pipeline currently mixes three very different traffic profiles
into the same `info` channel and the same memory queue:

1. User-driven actions and lifecycle events that should be visible.
2. High-frequency Assistant Workspace control-plane traffic (per-publication
   ack, incremental render observation, transcript page requests, owner
   detail requests, tab switches, sidebar close).
3. Warnings and errors that should be retained for diagnosis.

Three concrete problems follow:

- The control-plane traffic drowns out the user-visible events and pushes the
  persisted-log window out of the relevant range.
- Because the in-memory queue is single-buffered and FIFO, an `info` storm
  evicts `warn` and `error` entries whose timestamps are older, even when those
  entries are the only diagnostic signal.
- When the log viewer defaults to `info` / `warn` / `error`, the noise forces
  the user to filter aggressively before the diagnostic content is readable.

## What Changes

- Move Assistant Workspace control-plane actions to `debug` level. The action
  set is split by tab:
  - `shell`: `set-tab`, `close-sidebar` (user-initiated but high-frequency).
  - `child`: `publication-ack`, `publication-render-observation`,
    `load-transcript-page`, `request-owner-details`.
  - `ready` (both shell and child) stays at `info` because it is a lifecycle
    event, not control-plane chatter.
- Split the in-memory queue into `infoEntries` (debug + info) and
  `importantEntries` (warn + error). Each queue has its own entry budget:
  - normal: 2000 total, 500 important guard.
  - diagnostic: 3000 total, 1000 important guard.
- Eviction order is fixed: expire first, then evict `infoEntries` (FIFO) until
  total entry budget is satisfied, then evict `infoEntries` until byte budget
  is satisfied, and only as a last resort evict `importantEntries` (FIFO).
- Keep the persisted file format unchanged (single `entries` array). On
  hydration entries are routed by `level` into the two in-memory queues. The
  single persisted array keeps the original global retention order so older
  builds and external readers continue to observe a chronological stream.
- Expose `maxImportantEntries` and `importantEntryCount` on
  `RuntimeLogSnapshot`, `RuntimeLogSummary`, and the diagnostic bundle
  `meta.retentionBudget` blocks so the dashboard and harness can show the new
  budget.
- User-visible behaviour: in normal mode the listed control-plane actions no
  longer appear; in diagnostic mode they reappear under the Debug filter.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `log-retention-control`: extend the retention budget to include a dedicated
  important-level quota and define the explicit eviction priority over
  info/debug entries.
- `log-viewer-window`: the level filter semantics remain unchanged, but the
  default visibility no longer contains the downgraded control-plane actions
  in normal mode.

## Impact

- Affected implementation: `src/modules/runtimeLogManager.ts` (queue + budget
  refactor), `src/modules/assistantWorkspaceSidebar.ts` (audit-trail level
  selection), `src/modules/taskManagerDialog.ts` and
  `src/modules/harness/dashboardReadonlyModel.ts` (read new budget fields).
- Affected tests: `test/core/45-runtime-log-manager.test.ts`,
  `test/core/187-runtime-log-persistence.zotero.test.ts`,
  `test/ui/46-log-viewer-behavior.test.ts`.
- No external endpoint, persisted-schema, dependency, or runtime prompt
  change. The internal Dashboard snapshot gains additive budget fields. The
  persisted file remains a single ordered `entries` array; older plugin builds
  continue to read new files and new builds correctly hydrate older files by
  splitting entries by level without changing their global order.

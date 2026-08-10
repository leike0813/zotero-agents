## 1. Audit-trail level downgrade

- [x] 1.1 In `src/modules/assistantWorkspaceSidebar.ts`, add two named sets

  `ASSISTANT_WORKSPACE_DEBUG_LEVEL_SHELL_ACTIONS` (`set-tab`,
  `close-sidebar`) and `ASSISTANT_WORKSPACE_DEBUG_LEVEL_CHILD_ACTIONS`
  (`publication-ack`, `publication-render-observation`,
  `load-transcript-page`, `request-owner-details`).
- [x] 1.2 Update `logAssistantShellAction` so the level is `warn` on error,

  `debug` when the action belongs to either debug set, and `info`
  otherwise. `ready` on both shell and child paths must stay at `info`.
- [x] 1.3 Confirm that the `stage` field still uses `${tab}-${action}` so the

  existing filter contracts and dashboard selection continue to match.

## 2. Dual queue refactor

- [x] 2.1 In `src/modules/runtimeLogManager.ts`, replace the single `entries`

  array with `infoEntries` (debug + info) and `importantEntries`
  (warn + error). Keep `entryByteSizes` / `serializedEntries` /
  `estimatedBytes` shared across both queues so persistence and byte
  accounting stay unified.
- [x] 2.2 Add the budget constants `NORMAL_MAX_IMPORTANT_ENTRIES = 500` and

  `DIAGNOSTIC_MAX_IMPORTANT_ENTRIES = 1000`. Extend
  `resolveActiveRetentionBudget` to return both totals and the
  important-only cap.
- [x] 2.3 Route `appendRuntimeLog` to the correct queue by level. Update

  the shared retained-entry release path and `droppedByReason` accounting
  so eviction is attributed consistently (entry_limit / byte_budget
  reasons remain unchanged; only the queue origin is implicit).
- [x] 2.4 Rewrite `enforceRetentionBudgets` so the eviction order is:

  expire → enforce the dedicated important-entry cap → evict
  `infoEntries` until total entry budget is satisfied → evict
  `infoEntries` until byte budget is satisfied → evict
  `importantEntries` only as a byte-budget last resort.
- [x] 2.5 Update `hydrateRuntimeLogDocument` to split hydrated entries by

  level. Update `resetRuntimeLogMemory` and `clearRuntimeLogs` to clear
  both queues. Update `captureRuntimeLogPersistenceDocument` to merge
  both queues in global retention order in the single persisted `entries`
  array.
- [x] 2.6 Update `listRuntimeLogs`, `snapshotRuntimeLogsInternal`,

  `getRuntimeLogSummary`, and `getRuntimeLogRetentionConfig` so all
  read paths see the union of both queues and the new budget fields.
- [x] 2.7 Extend `RuntimeLogSnapshot`, `RuntimeLogSummary`,

  `RuntimeDiagnosticBundleV1` `meta.retentionBudget`, and
  `RuntimeIssueDiagnosticBundleV1` `environment.retentionBudget` with
  `maxImportantEntries` and `importantEntryCount`.

## 3. Downstream readers

- [x] 3.1 In `src/modules/taskManagerDialog.ts`, read the new budget fields

  for the dashboard runtime-logs view and surface the important quota in
  the viewer.
- [x] 3.2 In `src/modules/harness/dashboardReadonlyModel.ts`, expose the new

  budget fields without breaking the existing readonly snapshot shape.

## 4. Tests

- [x] 4.1 In `test/core/45-runtime-log-manager.test.ts`, add cases for:

  dual-queue capacity split, info-flood cannot evict warn/error, byte
  budget priority over `infoEntries`, and `infoEntries` empty fallback
  to `importantEntries`. Keep existing retention eviction behaviour
  assertions intact.
- [x] 4.2 In `test/core/187-runtime-log-persistence.zotero.test.ts`, verify

  that the persisted file is a single `entries` array and that hydration
  routes entries by level into the two queues.
- [x] 4.3 In `test/ui/46-log-viewer-behavior.test.ts`, confirm that

  `createDefaultLogViewerLevelFilter` and `filterLogsByLevels` still
  match the documented expectation (default hidden debug, levels filter
  works on the merged queue), and render the important/total quota in the
  Dashboard.
- [x] 4.4 In `test/core/190-assistant-workspace-wire-drift.test.ts`, cover the

  audit-level policy from the shared shell and child action vocabulary.
- [x] 4.5 In `test/ui/156-ui-readonly-harness.test.ts`, keep the readonly

  Dashboard runtime-log budget shape aligned with production.

## 5. Verification

- [x] 5.1 Run `npx tsc --noEmit -p tsconfig.json` and address type errors.
- [x] 5.2 Run the focused Node suites for runtime log retention, Assistant

  Workspace wire policy, Log Viewer behavior, and the readonly Dashboard
  harness; address failures.
- [x] 5.3 Run the Zotero lite-core runtime suite containing

  `test/core/187-runtime-log-persistence.zotero.test.ts`.
- [x] 5.4 Run the full `npm run lint:check` suite.
- [x] 5.5 Run the full `npm test` suite.
- [x] 5.6 Manually smoke-test: launch an ACP Skills task, verify the

  downgraded actions no longer appear in normal mode, toggle debug
  filter on, verify they reappear, switch tabs, verify `set-tab` no
  longer appears at info level, and trigger a synthetic error to
  confirm warn/error retention while info traffic is high.


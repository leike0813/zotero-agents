## 1. OpenSpec

- [x] 1.1 Add proposal, design, delta specs, and task list for the change.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Projection seam

- [x] 2.1 Move ACP run summary to active workflow task row mapping into
  `dashboardActiveTasks.ts`.
- [x] 2.2 Make active Dashboard projection drop legacy ACP carrier rows and
  materialize ACP rows only from ACP active summaries.
- [x] 2.3 Apply scope filtering, sorting, and limit after ACP/non-ACP merge.

## 3. Lifecycle and consumers

- [x] 3.1 Stop `upsertAcpSkillRun()` from maintaining ACP active task rows in
  `taskRuntime`.
- [x] 3.2 Narrow ACP startup reconcile to run normalization and legacy row
  cleanup.
- [x] 3.3 Update Dashboard home, ACP backend rows, toolbar popover, workspace
  attention, and ACP selected task fallback to use the shared projection seam.
- [x] 3.4 Update Host Bridge active tasks and workflow status to derive ACP
  active handles from ACP run summaries without carrier row fallback.

## 4. Tests

- [x] 4.1 Add projection tests for waiting, failed-retriable, stale carrier,
  terminal, scope, and limit behavior.
- [x] 4.2 Add startup/re-projection tests for waiting and failed-retriable ACP
  runs without carrier rows.
- [x] 4.3 Add consumer tests for popover, workspace attention, Host Bridge
  active tasks, and workflow status with ACP summary-only state.
- [x] 4.4 Run focused tests and TypeScript validation.

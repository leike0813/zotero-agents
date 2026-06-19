# Dashboard Modules

## Overview

The task dashboard is built from several sub-modules that handle active task
filtering, toolbar button management, task history persistence, and snapshot
normalization.

Four modules implement these concerns:

| Module | File | Role |
|--------|------|------|
| Active Tasks | `src/modules/dashboardActiveTasks.ts` | ACP-aware task filtering and projection |
| Toolbar Button | `src/modules/dashboardToolbarButton.ts` | Zotero toolbar button creation and styling |
| Task History | `src/modules/taskDashboardHistory.ts` | Persistent task history CRUD |
| Task Snapshot | `src/modules/taskDashboardSnapshot.ts` | Backend and task row normalization |

---

## Active Tasks

`src/modules/dashboardActiveTasks.ts`

Filters and projects active task rows with ACP skill run awareness.

```typescript
function isAcpSkillRunTask(entry: {
  backendType?: string;
  requestKind?: string;
  id?: string;
}): boolean
```
Returns `true` if `backendType === "acp"` or `requestKind` is
`acp.skill.run.v1` or `id` starts with `"acp-skill-run:"`.

```typescript
function getVisibleAcpSkillRunRequestIds(
  runs: AcpSkillRunRecord[],
): Set<string>
```
Returns `requestId` values for ACP skill runs that are not removed, not
archived, and have a non-terminal status.

```typescript
function filterDashboardActiveTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunRecord[];
}): WorkflowTaskRecord[]
```
Filters out invisible tasks (pass-through backends, ACP tasks whose runs
are terminal/removed/archived).

```typescript
function projectDashboardActiveTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunRecord[];
}): DashboardActiveTaskRow[]
```
Filters then projects: for ACP skill run tasks, the row's `state`, `error`,
and `updatedAt` are overridden from the matching `AcpSkillRunRecord`.

```typescript
function countDashboardHumanAttentionTasks(args: {
  activeTasks: WorkflowTaskRecord[];
  acpSkillRuns: AcpSkillRunRecord[];
}): number
```
Counts tasks with state `"waiting_user"` or `"waiting_auth"` after projection.

---

## Toolbar Button

`src/modules/dashboardToolbarButton.ts`

Manages the Zotero toolbar buttons for the assistant workspace.

```typescript
const SKILLRUNNER_ICON_URI =
  "chrome://zoteroskills/content/icons/icon_sidebar_32.png";
```

```typescript
function ensureDashboardToolbarButton(win: _ZoteroTypes.MainWindow): void
```
Creates three toolbar buttons:
- **Execute workflow menu** — triggers workflow selection
- **Dashboard** — opens the task dashboard
- **SkillRunner toggle** — toggles the assistant workspace sidebar

Removes any legacy SkillRunner attention button before creating.

```typescript
function removeDashboardToolbarButton(win: Window): void
```
Removes all three buttons. Unloads workspace toolbar task popover for the
SkillRunner button before removal.

```typescript
function applyToolbarButtonStyling(
  button: Element,
  iconUri: string,
  sizePx?: number,
): void
```
Sets `list-style-image`, width, height, and padding styles.

```typescript
function syncToolbarButtonIconFill(
  button: Element,
  win: _ZoteroTypes.MainWindow,
  options?: { minIconPx?: number; insetPx?: number },
): void
```
Syncs icon fill size by computing the button's bounding box and setting the
`--toolbarbutton-icon-fill-size` CSS variable.

```typescript
function updateAssistantToolbarAttention(
  win: Window,
  waitingCount: number,
): void
```
Sets `data-attention` and `data-attention-count` attributes on the SkillRunner
button. Toggles between normal and glowing icon based on `waitingCount > 0`.

---

## Task History

`src/modules/taskDashboardHistory.ts`

Persistent task history with create, read, filter, cleanup, delete, and state
update operations.

```typescript
type TaskDashboardHistoryRecord = WorkflowTaskRecord & {
  archivedAt: string;
};
```

| Function | Purpose |
|----------|---------|
| `listTaskDashboardHistory(filters?)` | Read history filtered by backendId/backendType/workflowId/requestId, sorted by updatedAt desc |
| `recordTaskDashboardHistoryFromJob(job)` | Build a record from a `JobRecord`, deduplicate by id, cleanup expired entries, persist |
| `cleanupTaskDashboardHistory()` | Remove entries older than retention config, return before/after counts |
| `removeTaskDashboardHistoryByBackendAndRequestIds(args)` | Bulk delete by backendId + requestId list |
| `updateTaskDashboardHistoryStateByRequest(args)` | Update state/error/updatedAt/archivedAt for matching requestId |
| `summarizeTaskDashboardHistory(records)` | Count records by status (queued/running/waiting_user/waiting_auth/succeeded/failed/canceled) |
| `resetTaskDashboardHistory()` | Clear all history |

---

## Task Snapshot

`src/modules/taskDashboardSnapshot.ts`

Provides normalization helpers for the dashboard snapshot.

```typescript
function normalizeDashboardBackends(args: {
  configured: BackendInstance[];
  history: TaskDashboardHistoryRecord[];
  active: WorkflowTaskRecord[];
}): BackendInstance[]
```
Clones configured backends, skips pass-through type, deduplicates by id,
sorts by id.

```typescript
function mergeDashboardTaskRows(args: {
  backendId: string;
  history: TaskDashboardHistoryRecord[];
  active: WorkflowTaskRecord[];
}): WorkflowTaskRecord[]
```
Merges history and active tasks for a given backendId: deduplicates by `id`
(keeps the newer `updatedAt`), filters to matching `backendId`, sorts by
`updatedAt` descending.

```typescript
function normalizeDashboardTabKey(args: {
  requestedTabKey?: string;
  backends: BackendInstance[];
  debugModeEnabled?: boolean;
}): string
```
Validates a requested tab key. Known non-backend values: `"home"`,
`"products"`, `"workflow-options"`, `"runtime-logs"`. The debug-only
`"skillrunner-connection-audit"` value is accepted only when
`debugModeEnabled` is true. Backend keys are `"backend:<id>"` and are accepted
only when the id exists in the backends array. Falls back to `"home"` when
unrecognized.

The SkillRunner connection audit tab is a read-only diagnostic surface. Normal
Dashboard snapshots do not read connection governor audit data; the read occurs
only when debug mode is enabled and the audit tab is selected.

/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import { memo } from "preact/compat";
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";

import { equalBySignature } from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardHostActionName,
} from "../../shared/dashboardWireContract";

// Backend surface of the dashboard page: the three legacy per-backend-type
// renderers (renderGenericBackend / renderSkillRunnerBackend /
// renderAcpSkillRunnerBackend in addon/content/dashboard/app.js) merged into
// one parameterized region. The shared task-table shell below replaces the
// legacy renderTaskTable helper; the bound-log section replaces
// renderLogTable (generic backends only).
//
// Action names and payload shapes mirror the legacy implementation exactly:
//   open-log-diagnostics        { backendId, taskId }
//   select-log-task             { backendId, taskId }
//   select-log-entry            { backendId, logEntryId }
//   open-run                    { backendId, requestId } | { backendId, runKey }
//   cancel-run                  { backendId, requestId }
//   cancel-queued-workflow-unit { queueId }
//   show-runs                   { backendId }
//   open-management             { backendId }
//   open-management-external    { backendId }
//   refresh-model-cache         { backendId }
//   mount-management-host       { backendId, managementUiUrl }
//   open-acp-skill-runs         {}
//
// All user-visible strings arrive pre-resolved in the selection: the panel
// model consumes host labels via labelText() (components may not import
// ../dashboardLabels per the dashboard import boundary). Label keys used by
// this surface, matching the legacy implementation:
//   noHistory, backendNoTasks, logsOpenDiagnostics, logsViewTask, openRun,
//   cancelRun, cancelQueuedWorkflowUnit (fallback "Cancel queued workflow
//   unit"), closeManagement, openManagementExternal, refreshModelCache,
//   openManagement, managementLoadFailed, managementLoading, logsTitle,
//   logsBoundTask, logsBoundRequestId, logsBoundJobId, logsEmpty,
//   logsDetailTitle, colTask, colWorkflow, colEngine, colStatus, colRequestId,
//   colUpdatedAt, colActions, colTime, colLevel, colStage, colScope,
//   colMessage, colJobId.

export type DashboardBackendKind = "generic" | "skillrunner" | "acp";

export type DashboardBackendTaskRow = {
  id: string;
  taskName: string;
  workflowLabel: string;
  // Raw engine value; the skillrunner variant renders "-" and the acp
  // variant renders "ACP" when empty (generic tables have no engine column).
  engine: string;
  statusText: string;
  statusClass: string;
  requestId: string;
  runKey: string;
  queueId: string;
  requestKind: string;
  // isDashboardTaskTerminal(state, stateSemantics): disables cancel-run.
  terminal: boolean;
  updatedAtText: string;
};

export type DashboardBackendLogRow = {
  id: string;
  timeText: string;
  levelText: string;
  levelBadgeClass: string;
  stage: string;
  scope: string;
  message: string;
  requestId: string;
  jobId: string;
};

export type DashboardBackendTaskTableSelection = {
  // Extra class on the table panel: "skillrunner-task-panel" for the
  // skillrunner/acp variants, "" for generic.
  panelClassName: string;
  columns: string[];
  emptyText: string;
  // Generic variant binds the table to the log viewer: selectedLogTaskId.
  selectedId: string;
  rows: DashboardBackendTaskRow[];
};

export type DashboardBackendLogsSelection = {
  title: string;
  boundTaskText: string;
  boundRequestIdText: string;
  boundJobIdText: string;
  emptyText: string;
  columns: string[];
  rows: DashboardBackendLogRow[];
  selectedLogEntryId: string;
  detailTitle: string;
  // JSON.stringify(selectedLogEntryPayload, null, 2) or the empty label.
  detailText: string;
};

export type DashboardBackendSelection = {
  // False when the snapshot has no backendView: renders the empty state.
  present: boolean;
  emptyText: string;
  kind: DashboardBackendKind;
  backendId: string;
  backendType: string;
  title: string;
  subview: "runs" | "management";
  managementUiUrl: string;
  // Legacy renderTaskTable scrollKey: the selected tab key. The task table
  // wrap reports scroll positions under this key and restores the last one
  // when the key changes (i.e. on tab switches).
  scrollKey: string;
  labels: {
    openDiagnostics: string;
    viewTask: string;
    openRun: string;
    cancelRun: string;
    cancelQueued: string;
    closeManagement: string;
    openManagementExternal: string;
    refreshModelCache: string;
    openManagement: string;
    managementLoadFailed: string;
    managementLoading: string;
  };
  // Generic toolbar: disabled when no log task is selected; also the taskId
  // payload of open-log-diagnostics.
  selectedLogTaskId: string;
  taskTable: DashboardBackendTaskTableSelection;
  // Bound-log section; only the generic variant renders one.
  logs: DashboardBackendLogsSelection | null;
};

export type DashboardBackendAction = Extract<
  DashboardHostActionName,
  | "open-log-diagnostics"
  | "select-log-task"
  | "select-log-entry"
  | "open-run"
  | "cancel-run"
  | "cancel-queued-workflow-unit"
  | "show-runs"
  | "open-management"
  | "open-management-external"
  | "refresh-model-cache"
  | "mount-management-host"
  | "open-acp-skill-runs"
>;

export type BackendRegionProps = {
  selection: DashboardBackendSelection;
  onAction: DashboardActionHandler<DashboardBackendAction>;
  // Scroll persistence seam (legacy state.backendTaskScrollTopByTabKey):
  // the region reports task-table scroll positions and restores
  // taskScrollTop when scrollKey changes. Deliberately outside the memo
  // signature so scroll bookkeeping never rebuilds the region.
  onTaskTableScroll?: (scrollKey: string, scrollTop: number) => void;
  taskScrollTop?: number;
};

// Ported from isTerminalStatus (addon/content/dashboard/app.js:496-510):
// an explicit semantics.terminal wins; otherwise fall back to the three
// terminal status tokens. Exported so the panel model can project
// DashboardBackendTaskRow.terminal.
export function isDashboardTaskTerminal(
  state: unknown,
  semantics: { terminal?: boolean } | null | undefined,
): boolean {
  if (semantics && typeof semantics.terminal === "boolean") {
    return semantics.terminal;
  }
  const normalized = String(state || "")
    .trim()
    .toLowerCase();
  return (
    normalized === "succeeded" ||
    normalized === "failed" ||
    normalized === "canceled"
  );
}

// ---------------------------------------------------------------------------
// Shared task-table shell (legacy renderTaskTable)
// ---------------------------------------------------------------------------

type TaskTableRowBase = { id: string };

type TaskTableProps<Row extends TaskTableRowBase> = {
  panelClassName?: string;
  tableWrapClassName?: string;
  tableClassName?: string;
  scrollKey?: string;
  initialScrollTop?: number;
  columns: string[];
  rows: Row[];
  emptyText: string;
  selectedId?: string;
  onRowClick?: (row: Row) => void;
  rowClassName?: (row: Row) => string;
  renderRowCells: (row: Row) => ComponentChildren;
  onScroll?: (scrollKey: string, scrollTop: number) => void;
};

function TaskTable<Row extends TaskTableRowBase>(props: TaskTableProps<Row>) {
  const scrollKey = String(props.scrollKey || "").trim();
  const wrapRef = useRef<HTMLDivElement>(null);
  const latestScrollTop = useRef(props.initialScrollTop || 0);
  latestScrollTop.current = props.initialScrollTop || 0;
  useLayoutEffect(() => {
    if (!scrollKey) return;
    const node = wrapRef.current;
    if (node && latestScrollTop.current > 0) {
      node.scrollTop = latestScrollTop.current;
    }
  }, [scrollKey]);

  const panelClass = ["panel", props.panelClassName || ""]
    .filter(Boolean)
    .join(" ");
  if (props.rows.length === 0) {
    return (
      <div class={panelClass}>
        <div class="empty">{props.emptyText}</div>
      </div>
    );
  }
  const wrapClass = ["table-wrap", props.tableWrapClassName || ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div class={panelClass}>
      <div
        key={scrollKey}
        ref={wrapRef}
        class={wrapClass}
        onScroll={
          scrollKey && props.onScroll
            ? (event) =>
                props.onScroll!(
                  scrollKey,
                  (event.currentTarget as HTMLDivElement).scrollTop || 0,
                )
            : undefined
        }
      >
        <table class={props.tableClassName || undefined}>
          <thead>
            <tr>
              {props.columns.map((column, index) => (
                <th key={index}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => {
              const trClass = [
                props.selectedId && props.selectedId === row.id
                  ? "selected"
                  : "",
                props.onRowClick ? "clickable" : "",
                props.rowClassName ? props.rowClassName(row) : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <tr
                  key={row.id}
                  class={trClass || undefined}
                  onClick={
                    props.onRowClick ? () => props.onRowClick!(row) : undefined
                  }
                >
                  {props.renderRowCells(row)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge(props: { statusClass: string; statusText: string }) {
  return <span class={props.statusClass}>{props.statusText}</span>;
}

function CancelQueuedButton(props: {
  label: string;
  queueId: string;
  onAction: BackendRegionProps["onAction"];
}) {
  const { label, queueId, onAction } = props;
  return (
    <button
      class="btn icon-btn"
      title={label}
      aria-label={label}
      onClick={() => onAction("cancel-queued-workflow-unit", { queueId })}
    >
      <span class="zs-icon zs-icon-sm zs-icon-close" aria-hidden="true" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Per-variant task row cells
// ---------------------------------------------------------------------------

function GenericTaskRowCells(props: {
  selection: DashboardBackendSelection;
  row: DashboardBackendTaskRow;
  onAction: BackendRegionProps["onAction"];
}) {
  const { selection, row, onAction } = props;
  const backendId = selection.backendId;
  const showRunActions =
    selection.backendType.trim() === "acp" &&
    row.requestKind.trim() === "skillrunner.job.v1" &&
    !!row.requestId;
  return (
    <>
      <td>{row.taskName}</td>
      <td>{row.workflowLabel}</td>
      <td class="center-cell">
        <StatusBadge
          statusClass={row.statusClass}
          statusText={row.statusText}
        />
      </td>
      <td class="mono">{row.requestId || "-"}</td>
      <td class="center-cell">{row.updatedAtText}</td>
      <td class="actions-cell">
        <div class="actions-wrap">
          <button
            class="btn"
            onClick={(event) => {
              // The legacy page let this click bubble to the row handler,
              // emitting select-log-task twice with the same payload; stop
              // that here so each click is one action.
              event.stopPropagation();
              onAction("select-log-task", { backendId, taskId: row.id });
            }}
          >
            {selection.labels.viewTask}
          </button>
          {showRunActions ? (
            <>
              <button
                class="btn"
                onClick={(event) => {
                  event.stopPropagation();
                  onAction("open-run", { backendId, requestId: row.requestId });
                }}
              >
                {selection.labels.openRun}
              </button>
              <button
                class="btn"
                disabled={row.terminal}
                onClick={(event) => {
                  event.stopPropagation();
                  onAction("cancel-run", {
                    backendId,
                    requestId: row.requestId,
                  });
                }}
              >
                {selection.labels.cancelRun}
              </button>
            </>
          ) : null}
        </div>
      </td>
    </>
  );
}

function SkillRunnerTaskRowCells(props: {
  selection: DashboardBackendSelection;
  row: DashboardBackendTaskRow;
  onAction: BackendRegionProps["onAction"];
}) {
  const { selection, row, onAction } = props;
  const backendId = selection.backendId;
  const hasActions = !!(row.queueId || row.runKey || row.requestId);
  return (
    <>
      <td>{row.taskName}</td>
      <td>{row.workflowLabel}</td>
      <td>{row.engine || "-"}</td>
      <td class="center-cell">
        <StatusBadge
          statusClass={row.statusClass}
          statusText={row.statusText}
        />
      </td>
      <td class="mono">{row.requestId || "-"}</td>
      <td class="center-cell">{row.updatedAtText}</td>
      <td class="actions-cell">
        <div class="actions-wrap">
          {row.queueId ? (
            <CancelQueuedButton
              label={selection.labels.cancelQueued}
              queueId={row.queueId}
              onAction={onAction}
            />
          ) : row.runKey ? (
            <button
              class="btn"
              onClick={() =>
                onAction("open-run", { backendId, runKey: row.runKey })
              }
            >
              {selection.labels.openRun}
            </button>
          ) : null}
          {row.requestId ? (
            <button
              class="btn"
              disabled={row.terminal}
              onClick={() =>
                onAction("cancel-run", { backendId, requestId: row.requestId })
              }
            >
              {selection.labels.cancelRun}
            </button>
          ) : null}
          {hasActions ? null : "-"}
        </div>
      </td>
    </>
  );
}

function AcpTaskRowCells(props: {
  selection: DashboardBackendSelection;
  row: DashboardBackendTaskRow;
  onAction: BackendRegionProps["onAction"];
}) {
  const { selection, row, onAction } = props;
  const backendId = selection.backendId;
  return (
    <>
      <td>{row.taskName}</td>
      <td>{row.workflowLabel}</td>
      <td>{row.engine || "ACP"}</td>
      <td class="center-cell">
        <StatusBadge
          statusClass={row.statusClass}
          statusText={row.statusText}
        />
      </td>
      <td class="mono">{row.requestId || "-"}</td>
      <td class="center-cell">{row.updatedAtText}</td>
      <td class="actions-cell">
        <div class="actions-wrap">
          {row.queueId ? (
            <CancelQueuedButton
              label={selection.labels.cancelQueued}
              queueId={row.queueId}
              onAction={onAction}
            />
          ) : row.requestId ? (
            <>
              <button
                class="btn"
                onClick={() =>
                  onAction("open-run", { backendId, requestId: row.requestId })
                }
              >
                {selection.labels.openRun}
              </button>
              <button
                class="btn"
                disabled={row.terminal}
                onClick={() =>
                  onAction("cancel-run", {
                    backendId,
                    requestId: row.requestId,
                  })
                }
              >
                {selection.labels.cancelRun}
              </button>
            </>
          ) : (
            "-"
          )}
        </div>
      </td>
    </>
  );
}

// ---------------------------------------------------------------------------
// Bound-log section (legacy renderLogTable; generic variant only)
// ---------------------------------------------------------------------------

function LogRowCells(props: { row: DashboardBackendLogRow }) {
  const { row } = props;
  return (
    <>
      <td>{row.timeText}</td>
      <td>
        <span class={row.levelBadgeClass}>{row.levelText}</span>
      </td>
      <td>{row.stage || "-"}</td>
      <td>{row.scope || "-"}</td>
      <td>{row.message || "-"}</td>
      <td class="mono">{row.requestId || "-"}</td>
      <td class="mono">{row.jobId || "-"}</td>
    </>
  );
}

function BackendLogsSection(props: {
  selection: DashboardBackendSelection;
  logs: DashboardBackendLogsSelection;
  onAction: BackendRegionProps["onAction"];
}) {
  const { selection, logs, onAction } = props;
  const backendId = selection.backendId;
  return (
    <section class="section">
      <h3 class="section-title">{logs.title}</h3>
      <div class="bound-task">
        <div class="bound-task-item mono">{logs.boundTaskText}</div>
        <div class="bound-task-item mono">{logs.boundRequestIdText}</div>
        <div class="bound-task-item mono">{logs.boundJobIdText}</div>
      </div>
      <TaskTable
        tableClassName="logs-table"
        columns={logs.columns}
        rows={logs.rows}
        emptyText={logs.emptyText}
        selectedId={logs.selectedLogEntryId}
        onRowClick={(row) =>
          onAction("select-log-entry", { backendId, logEntryId: row.id })
        }
        renderRowCells={(row) => <LogRowCells row={row} />}
      />
      <div class="log-detail">
        <h4 class="section-title">{logs.detailTitle}</h4>
        <pre class="log-view mono">{logs.detailText}</pre>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SkillRunner management subview host (legacy renderSkillRunnerManagementSubview)
// ---------------------------------------------------------------------------

function SkillRunnerManagementSubview(props: {
  selection: DashboardBackendSelection;
  onAction: BackendRegionProps["onAction"];
}) {
  const { selection, onAction } = props;
  const backendId = selection.backendId;
  const managementUiUrl = selection.managementUiUrl;
  useEffect(() => {
    if (!managementUiUrl) return;
    // Legacy defers the mount request with setTimeout(0) so the mount node
    // exists before the host injects the management UI into it.
    const timer = setTimeout(() => {
      onAction("mount-management-host", { backendId, managementUiUrl });
    }, 0);
    return () => clearTimeout(timer);
  }, [backendId, managementUiUrl, onAction]);
  return (
    <section class="management-host-panel">
      {managementUiUrl ? (
        <div
          class="management-host-mount"
          data-zs-role="skillrunner-management-dashboard-host"
          data-backend-id={backendId}
          data-management-ui-url={managementUiUrl}
        >
          <div class="management-host-loading">
            {selection.labels.managementLoading}
          </div>
        </div>
      ) : (
        <div class="error-banner">{selection.labels.managementLoadFailed}</div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Toolbar (per variant + subview)
// ---------------------------------------------------------------------------

function BackendToolbar(props: {
  selection: DashboardBackendSelection;
  onAction: BackendRegionProps["onAction"];
}) {
  const { selection, onAction } = props;
  const backendId = selection.backendId;
  const title = <h2 class="page-title">{selection.title}</h2>;
  if (selection.kind === "skillrunner") {
    return (
      <div class="toolbar">
        {title}
        <div class="toolbar-actions">
          {selection.subview === "management" ? (
            <>
              <button
                class="btn"
                onClick={() => onAction("show-runs", { backendId })}
              >
                {selection.labels.closeManagement}
              </button>
              <button
                class="btn"
                onClick={() =>
                  onAction("open-management-external", { backendId })
                }
              >
                {selection.labels.openManagementExternal}
              </button>
            </>
          ) : (
            <>
              <button
                class="btn"
                onClick={() => onAction("refresh-model-cache", { backendId })}
              >
                {selection.labels.refreshModelCache}
              </button>
              <button
                class="btn"
                onClick={() => onAction("open-management", { backendId })}
              >
                {selection.labels.openManagement}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
  if (selection.kind === "acp") {
    return (
      <div class="toolbar">
        {title}
        <button class="btn" onClick={() => onAction("open-acp-skill-runs", {})}>
          {selection.labels.openRun}
        </button>
      </div>
    );
  }
  return (
    <div class="toolbar">
      {title}
      <button
        class="btn"
        disabled={!selection.selectedLogTaskId}
        onClick={() =>
          onAction("open-log-diagnostics", {
            backendId,
            taskId: selection.selectedLogTaskId || "",
          })
        }
      >
        {selection.labels.openDiagnostics}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export const BackendRegion = memo(
  function BackendRegion(props: BackendRegionProps) {
    const { selection, onAction, onTaskTableScroll, taskScrollTop } = props;
    if (!selection.present) {
      return (
        <div class="dashboard-backend" data-region-content="dashboard-backend">
          <div class="empty">{selection.emptyText}</div>
        </div>
      );
    }
    const backendId = selection.backendId;
    const showManagement =
      selection.kind === "skillrunner" && selection.subview === "management";
    return (
      <div class="dashboard-backend" data-region-content="dashboard-backend">
        <BackendToolbar selection={selection} onAction={onAction} />
        {showManagement ? (
          <SkillRunnerManagementSubview
            selection={selection}
            onAction={onAction}
          />
        ) : (
          <>
            <TaskTable
              panelClassName={selection.taskTable.panelClassName || undefined}
              tableWrapClassName="backend-task-table-wrap"
              scrollKey={selection.scrollKey}
              initialScrollTop={taskScrollTop}
              columns={selection.taskTable.columns}
              rows={selection.taskTable.rows}
              emptyText={selection.taskTable.emptyText}
              selectedId={
                selection.kind === "generic"
                  ? selection.taskTable.selectedId
                  : ""
              }
              onRowClick={
                selection.kind === "generic"
                  ? (row) =>
                      onAction("select-log-task", { backendId, taskId: row.id })
                  : undefined
              }
              rowClassName={
                selection.kind === "generic"
                  ? undefined
                  : (row) => (row.queueId ? "host-queued-workflow-row" : "")
              }
              renderRowCells={(row) =>
                selection.kind === "skillrunner" ? (
                  <SkillRunnerTaskRowCells
                    selection={selection}
                    row={row}
                    onAction={onAction}
                  />
                ) : selection.kind === "acp" ? (
                  <AcpTaskRowCells
                    selection={selection}
                    row={row}
                    onAction={onAction}
                  />
                ) : (
                  <GenericTaskRowCells
                    selection={selection}
                    row={row}
                    onAction={onAction}
                  />
                )
              }
              onScroll={onTaskTableScroll}
            />
            {selection.kind === "generic" && selection.logs ? (
              <BackendLogsSection
                selection={selection}
                logs={selection.logs}
                onAction={onAction}
              />
            ) : null}
          </>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    prev.onTaskTableScroll === next.onTaskTableScroll &&
    // taskScrollTop is excluded on purpose: scroll position lives in the DOM
    // between renders and is only re-applied when scrollKey changes.
    equalBySignature(prev.selection, next.selection),
);

/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardHostActionName,
} from "../../shared/dashboardWireContract";

// Home surface of the dashboard page: workflow bubble cards, the five
// summary cards, the running-task table, and the workflow document reading
// view. Action names and payload shapes mirror the legacy implementation
// (addon/content/dashboard/app.js renderSummary/renderHomeWorkflowDoc):
//   run-home-workflow            { workflowId }
//   open-home-workflow-doc       { workflowId }
//   open-home-workflow-settings  { workflowId }
//   open-running-task            { taskId, backendId, backendType, runKey, requestId, requestKind }
//   close-home-workflow-doc      {}

export type DashboardHomeBubble = {
  workflowId: string;
  title: string;
  officialBadgeText: string;
  coreBadgeText: string;
  runTitle: string;
  runAriaLabel: string;
  runDisabled: boolean;
  docTitle: string;
  docAriaLabel: string;
  settingsTitle: string;
  settingsAriaLabel: string;
  settingsDisabled: boolean;
};

export type DashboardHomeSummaryCard = {
  label: string;
  value: string;
};

export type DashboardHomeRunningRow = {
  taskId: string;
  taskName: string;
  workflowLabel: string;
  backendLabel: string;
  statusText: string;
  statusClass: string;
  updatedAtText: string;
  backendId: string;
  backendType: string;
  runKey: string;
  requestId: string;
  requestKind: string;
};

export type DashboardHomeDocView = {
  workflowId: string;
  title: string;
  html: string;
  missingReadme: boolean;
  missingReadmeText: string;
  backLabel: string;
};

export type DashboardHomeSelection = {
  kind: "summary" | "doc";
  pageTitle: string;
  bubblesTitle: string;
  bubbles: DashboardHomeBubble[];
  summaryTitle: string;
  cards: DashboardHomeSummaryCard[];
  runningTitle: string;
  runningEmptyText: string;
  runningColumns: string[];
  runningRows: DashboardHomeRunningRow[];
  doc: DashboardHomeDocView | null;
};

type DashboardHomeAction = Extract<
  DashboardHostActionName,
  | "run-home-workflow"
  | "open-home-workflow-doc"
  | "open-home-workflow-settings"
  | "open-running-task"
  | "close-home-workflow-doc"
>;

type HomeRegionProps = {
  selection: DashboardHomeSelection;
  onAction: DashboardActionHandler<DashboardHomeAction>;
};

function WorkflowBubble(props: {
  bubble: DashboardHomeBubble;
  onAction: HomeRegionProps["onAction"];
}) {
  const { bubble, onAction } = props;
  const workflowId = bubble.workflowId || "";
  return (
    <div class="workflow-bubble">
      <div class="workflow-bubble-title">
        <span class="workflow-bubble-title-text">{bubble.title}</span>
        {bubble.officialBadgeText ? (
          <span class="workflow-bubble-official-badge">
            {bubble.officialBadgeText}
          </span>
        ) : null}
        {bubble.coreBadgeText ? (
          <span class="workflow-bubble-core-badge">{bubble.coreBadgeText}</span>
        ) : null}
      </div>
      <div class="workflow-bubble-actions">
        <button
          class="btn workflow-bubble-btn workflow-bubble-run-btn"
          title={bubble.runTitle}
          aria-label={bubble.runAriaLabel}
          disabled={bubble.runDisabled}
          onClick={() => {
            if (bubble.runDisabled) return;
            onAction("run-home-workflow", { workflowId });
          }}
        >
          <span
            class="zs-icon zs-icon-sm workflow-bubble-icon workflow-bubble-icon-run zs-icon-play-arrow"
            aria-hidden="true"
          />
        </button>
        <button
          class="btn workflow-bubble-btn"
          title={bubble.docTitle}
          aria-label={bubble.docAriaLabel}
          onClick={() => onAction("open-home-workflow-doc", { workflowId })}
        >
          <span
            class="zs-icon zs-icon-sm workflow-bubble-icon workflow-bubble-icon-doc zs-icon-description"
            aria-hidden="true"
          />
        </button>
        <button
          class="btn workflow-bubble-btn"
          title={bubble.settingsTitle}
          aria-label={bubble.settingsAriaLabel}
          disabled={bubble.settingsDisabled}
          onClick={() => {
            if (bubble.settingsDisabled) return;
            onAction("open-home-workflow-settings", { workflowId });
          }}
        >
          <span
            class="zs-icon zs-icon-sm workflow-bubble-icon workflow-bubble-icon-settings zs-icon-settings"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}

function RunningTaskTable(props: {
  selection: DashboardHomeSelection;
  onAction: HomeRegionProps["onAction"];
}) {
  const { selection, onAction } = props;
  if (selection.runningRows.length === 0) {
    return (
      <div class="panel">
        <div class="empty">{selection.runningEmptyText}</div>
      </div>
    );
  }
  return (
    <div class="panel">
      <div class="table-wrap home-running-table-wrap">
        <table>
          <thead>
            <tr>
              {selection.runningColumns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selection.runningRows.map((row) => (
              <tr
                key={row.taskId}
                class="clickable"
                onClick={() =>
                  onAction("open-running-task", {
                    taskId: row.taskId,
                    backendId: row.backendId,
                    backendType: row.backendType,
                    runKey: row.runKey,
                    requestId: row.requestId,
                    requestKind: row.requestKind,
                  })
                }
              >
                <td>{row.taskName || "-"}</td>
                <td>{row.workflowLabel || "-"}</td>
                <td>{row.backendLabel || "-"}</td>
                <td class="center-cell">
                  <span class={row.statusClass}>{row.statusText}</span>
                </td>
                <td class="center-cell">{row.updatedAtText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HomeDocViewSection(props: {
  doc: DashboardHomeDocView;
  onAction: HomeRegionProps["onAction"];
}) {
  const { doc, onAction } = props;
  return (
    <section class="section workflow-doc-section">
      <h3 class="section-title">{doc.title}</h3>
      <div class="panel workflow-doc-panel">
        {doc.missingReadme ? (
          <div
            class="workflow-doc-content markdown-body"
            data-workflow-id={doc.workflowId}
          >
            <div class="empty">{doc.missingReadmeText}</div>
          </div>
        ) : (
          // Trusted channel: the host renders the workflow README to HTML
          // (see renderHomeWorkflowDoc's innerHTML fallback in the legacy
          // implementation); the page injects it verbatim.
          <div
            class="workflow-doc-content markdown-body"
            data-workflow-id={doc.workflowId}
            dangerouslySetInnerHTML={{ __html: doc.html }}
          />
        )}
      </div>
      <div class="workflow-doc-footer">
        <button
          class="btn"
          onClick={() => onAction("close-home-workflow-doc", {})}
        >
          {doc.backLabel}
        </button>
      </div>
    </section>
  );
}

export const HomeRegion = memo(
  function HomeRegion(props: HomeRegionProps) {
    const { selection, onAction } = props;
    if (selection.kind === "doc" && selection.doc) {
      return (
        <div class="dashboard-home" data-region-content="dashboard-home">
          <h2 class="page-title">{selection.pageTitle}</h2>
          <HomeDocViewSection doc={selection.doc} onAction={onAction} />
        </div>
      );
    }
    return (
      <div class="dashboard-home" data-region-content="dashboard-home">
        <h2 class="page-title">{selection.pageTitle}</h2>
        {selection.bubbles.length > 0 ? (
          <section class="section workflow-bubbles-section">
            <h3 class="section-title">{selection.bubblesTitle}</h3>
            <div class="workflow-bubbles-wrap">
              {selection.bubbles.map((bubble) => (
                <WorkflowBubble
                  key={bubble.workflowId}
                  bubble={bubble}
                  onAction={onAction}
                />
              ))}
            </div>
          </section>
        ) : null}
        <h3 class="section-title">{selection.summaryTitle}</h3>
        <div class="cards">
          {selection.cards.map((card) => (
            <div class="card" key={card.label}>
              <div class="card-label">{card.label}</div>
              <div class="card-value">{card.value}</div>
            </div>
          ))}
        </div>
        <section class="section">
          <h3 class="section-title">{selection.runningTitle}</h3>
          <RunningTaskTable selection={selection} onAction={onAction} />
        </section>
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection),
);

/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";

// SkillRunner connection audit surface of the dashboard page, ported from the
// legacy renderSkillRunnerConnectionAudit (addon/content/dashboard/app.js:2763-2967):
// governor metric cards, per-dimension count bars, and the recent-events table.
//
// The surface is read-only. Its single interaction ("copy JSON") was page-local
// in the legacy implementation — copyTextToClipboard(JSON.stringify(view, null, 2))
// followed by a toast — and never reached the host, so no wire action exists for
// it and none is added here. The component reports the click through the
// dedicated `onCopyJson` callback; the integration layer performs
// copyTextWithToastFeedback(json, labelText(labels, "skillRunnerConnectionAuditCopied")).
//
// All display strings (including the legacy literal metric/bar titles and the
// events table column headers) are resolved into the selection by the panel
// model; this component renders the selection verbatim. The wire narrowing
// types below model the host's skillRunnerConnectionAuditView.governor slot
// (unknown on the page side) so the panel model can project it without `any`.

export type SkillrunnerAuditWireCountRow = {
  backendId?: unknown;
  lane?: unknown;
  count?: unknown;
};

export type SkillrunnerAuditWireEvent = {
  id?: unknown;
  ts?: unknown;
  type?: unknown;
  backendId?: unknown;
  lane?: unknown;
  requestId?: unknown;
  operation?: unknown;
  durationMs?: unknown;
  reason?: unknown;
  errorName?: unknown;
};

export type SkillrunnerAuditWireSummary = {
  activeTotal?: unknown;
  queuedTotal?: unknown;
  streamTotal?: unknown;
  timeoutCount?: unknown;
  lateSettlementCount?: unknown;
  physicalDebtTotal?: unknown;
  degradedBackendCount?: unknown;
  skippedReachabilityCount?: unknown;
  skippedBackgroundCount?: unknown;
  skippedHistoryCount?: unknown;
  activeByBackend?: unknown;
  queuedByBackend?: unknown;
  activeByLane?: unknown;
  queuedByLane?: unknown;
  physicalDebtByBackend?: unknown;
};

export type SkillrunnerAuditWireGovernor = {
  summary?: SkillrunnerAuditWireSummary | null;
  events?: unknown;
  active?: unknown;
  queued?: unknown;
};

export type SkillrunnerAuditConnectionView = {
  generatedAt?: unknown;
  governor?: SkillrunnerAuditWireGovernor | null;
};

export type DashboardSkillrunnerAuditMetric = {
  label: string;
  value: string;
};

export type DashboardSkillrunnerAuditBarRow = {
  key: string;
  count: number;
};

export type DashboardSkillrunnerAuditBarsSection = {
  title: string;
  rows: DashboardSkillrunnerAuditBarRow[];
};

export type DashboardSkillrunnerAuditEventRow = {
  id: string;
  timestampText: string;
  typeText: string;
  // Full badge class list ("status <token> is-<tone>") resolved by the panel
  // model via dashboardStatusBadgeClass.
  typeClass: string;
  backendId: string;
  lane: string;
  requestId: string;
  operation: string;
  durationText: string;
  reason: string;
};

export type DashboardSkillrunnerAuditSelection = {
  // False when the snapshot has no skillRunnerConnectionAuditView or no
  // governor inside it; the region then renders only the empty placeholder.
  available: boolean;
  emptyText: string;
  pageTitle: string;
  copyLabel: string;
  metrics: DashboardSkillrunnerAuditMetric[];
  bars: DashboardSkillrunnerAuditBarsSection[];
  eventsTitle: string;
  eventsEmptyText: string;
  eventsColumns: string[];
  eventsRows: DashboardSkillrunnerAuditEventRow[];
};

type SkillrunnerAuditRegionProps = {
  selection: DashboardSkillrunnerAuditSelection;
  onCopyJson: () => void;
};

function AuditMetricCard(props: { metric: DashboardSkillrunnerAuditMetric }) {
  const { metric } = props;
  return (
    <div class="audit-metric">
      <span class="audit-metric-label">{metric.label}</span>
      <strong class="audit-metric-value">{metric.value}</strong>
    </div>
  );
}

function AuditBarsSectionView(props: {
  section: DashboardSkillrunnerAuditBarsSection;
}) {
  const { section } = props;
  const rows = section.rows;
  const max = rows.reduce((value, row) => Math.max(value, row.count), 1);
  return (
    <section class="section audit-bars-section">
      <h3 class="section-title">{section.title}</h3>
      <div class="panel audit-bars">
        {rows.length === 0 ? (
          <div class="empty">-</div>
        ) : (
          rows.map((row, index) => (
            <div class="audit-bar-row" key={`${row.key}:${index}`}>
              <span class="audit-bar-label mono">{row.key}</span>
              <span class="audit-bar-track">
                <span
                  class="audit-bar-fill"
                  style={{
                    width: `${Math.max(4, Math.round((row.count / max) * 100))}%`,
                  }}
                />
              </span>
              <span class="audit-bar-count">{String(row.count)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AuditEventTableRow(props: { row: DashboardSkillrunnerAuditEventRow }) {
  const { row } = props;
  return (
    <tr>
      <td>{row.timestampText}</td>
      <td>
        <span class={row.typeClass}>{row.typeText}</span>
      </td>
      <td class="mono">{row.backendId || "-"}</td>
      <td class="mono">{row.lane || "-"}</td>
      <td class="mono">{row.requestId || "-"}</td>
      <td class="mono">{row.operation || "-"}</td>
      <td class="center-cell">{row.durationText}</td>
      <td>{row.reason || "-"}</td>
    </tr>
  );
}

function AuditEventsTable(props: {
  selection: DashboardSkillrunnerAuditSelection;
}) {
  const { selection } = props;
  return (
    <section class="section">
      <h3 class="section-title">{selection.eventsTitle}</h3>
      <div class="panel">
        {selection.eventsRows.length === 0 ? (
          <div class="empty">{selection.eventsEmptyText}</div>
        ) : (
          <div class="table-wrap logs-table-wrap">
            <table class="logs-table audit-events-table">
              <thead>
                <tr>
                  {selection.eventsColumns.map((column, index) => (
                    <th key={`${column}:${index}`}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selection.eventsRows.map((row, index) => (
                  <AuditEventTableRow key={row.id || String(index)} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export const SkillrunnerAuditRegion = memo(
  function SkillrunnerAuditRegion(props: SkillrunnerAuditRegionProps) {
    const { selection, onCopyJson } = props;
    if (!selection.available) {
      return (
        <div
          class="dashboard-skillrunner-audit"
          data-region-content="dashboard-skillrunner-audit"
        >
          <div class="empty">{selection.emptyText}</div>
        </div>
      );
    }
    return (
      <div
        class="dashboard-skillrunner-audit"
        data-region-content="dashboard-skillrunner-audit"
      >
        <div class="toolbar">
          <h2 class="page-title">{selection.pageTitle}</h2>
          <div class="toolbar-actions">
            <button onClick={() => onCopyJson()}>{selection.copyLabel}</button>
          </div>
        </div>
        <div class="audit-metrics">
          {selection.metrics.map((metric) => (
            <AuditMetricCard key={metric.label} metric={metric} />
          ))}
        </div>
        <div class="audit-grid">
          {selection.bars.map((section) => (
            <AuditBarsSectionView key={section.title} section={section} />
          ))}
        </div>
        <AuditEventsTable selection={selection} />
      </div>
    );
  },
  (prev, next) =>
    prev.onCopyJson === next.onCopyJson &&
    equalBySignature(prev.selection, next.selection),
);

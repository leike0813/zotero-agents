/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect, useRef } from "preact/hooks";

import { equalBySignature } from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardLocalActionName,
} from "../../shared/dashboardWireContract";

// Synthesis Sidecar trace surface of the dashboard page: summary cards, the
// trace search filter, the imperative trace-table island, and the causal
// trace detail panel (span tree + copy). Ported from the legacy renderer
// (addon/content/dashboard/app.js renderSynthesisSidecar trace branch,
// :4099-4340) and its same-tab fast path (:4797-4871).
//
// The legacy surface emits no host actions: the filter text and the selected
// trace lived in page-local `state` and re-rendered synchronously. The region
// surfaces the same interactions as UI intents through `onAction`; the
// controller owns that state and round-trips it back through the selection:
//   synthesis-sidecar-select-trace      { traceId }  (legacy: state.synthesisTraceId = trace.traceId)
//   synthesis-sidecar-set-trace-filter  { filter }   (legacy: state.synthesisTraceFilter = input.value)
//
// All display strings arrive pre-resolved in the selection (the panel model
// resolves host labels through labelText, mirroring Home/TabBar); the
// component never hardcodes copy.

// ---------------------------------------------------------------------------
// Narrowed page-side view of the unknown wire slot
// (DashboardSnapshot.synthesisSidecarView.traceSnapshot).
// ---------------------------------------------------------------------------

export type DashboardSynthesisSidecarEventView = {
  spanId: string;
  parentSpanId: string;
  attempt: number;
  phase: string;
  boundary: string;
  outcome: string;
  code: string;
  // identities.operation / identities.capability, lifted for the operation
  // column and the search text.
  operation: string;
  capability: string;
  // JSON.stringify(identities + metrics + facts), "" when all three are empty.
  factsJson: string;
};

export type DashboardSynthesisSidecarTraceView = {
  traceId: string;
  active: boolean;
  startedAtMs: number;
  updatedAtMs: number;
  droppedCount: number;
  events: DashboardSynthesisSidecarEventView[];
};

export type DashboardSynthesisSidecarTraceSnapshotView = {
  traces: DashboardSynthesisSidecarTraceView[];
  eventCount: number;
};

// Controller-owned UI state for this surface (the legacy page-local
// state.synthesisTraceFilter / state.synthesisTraceId slots).
export type DashboardSynthesisSidecarUiState = {
  traceFilter: string;
  selectedTraceId: string;
};

// ---------------------------------------------------------------------------
// Display-ready selection (the region's equality boundary: only user-visible
// content plus the filter/selection state of this surface).
// ---------------------------------------------------------------------------

export type DashboardSynthesisSidecarSummaryCard = {
  label: string;
  value: string;
};

export type DashboardSynthesisSidecarTraceRow = {
  traceId: string;
  outcome: string;
  outcomeBadgeClass: string;
  shortTraceId: string;
  operation: string;
  startedText: string;
  spanCountText: string;
  droppedText: string;
  selected: boolean;
  // data-trace-signature payload; rows reconcile by traceId + signature.
  signature: string;
};

export type DashboardSynthesisSidecarSpanRow = {
  spanId: string;
  phasePaddingLeft: string;
  phase: string;
  boundary: string;
  attemptText: string;
  outcome: string;
  outcomeBadgeClass: string;
  code: string;
  factsText: string;
};

export type DashboardSynthesisSidecarDetailView = {
  traceId: string;
  // data-trace-signature of the detail panel:
  // `${updatedAtMs}:${events.length}:${droppedCount}` (legacy fast path).
  signature: string;
  subtitle: string;
  // JSON.stringify(rawTrace, null, 2) of the selected trace, for copying.
  copyJson: string;
  spanRows: DashboardSynthesisSidecarSpanRow[];
};

export type DashboardSynthesisSidecarSelection = {
  kind: "empty" | "traces";
  pageTitle: string;
  emptyText: string;
  summaryCards: DashboardSynthesisSidecarSummaryCard[];
  filterLabel: string;
  filterPlaceholder: string;
  filterValue: string;
  columns: string[];
  rows: DashboardSynthesisSidecarTraceRow[];
  detailTitle: string;
  detailEmptySubtitle: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
  copyToastMessage: string;
  detail: DashboardSynthesisSidecarDetailView | null;
};

export type DashboardSynthesisSidecarAction = Extract<
  DashboardLocalActionName,
  "synthesis-sidecar-select-trace" | "synthesis-sidecar-set-trace-filter"
>;

export type SynthesisSidecarCopyHandler = (
  text: string,
  successToast: string,
  failureToast: string,
) => Promise<void>;

export type SynthesisSidecarRegionProps = {
  selection: DashboardSynthesisSidecarSelection;
  onAction: DashboardActionHandler<DashboardSynthesisSidecarAction>;
  onCopyText: SynthesisSidecarCopyHandler;
};

// ---------------------------------------------------------------------------
// Pure helpers (wire narrowing, filtering/ranking, selection resolution,
// signatures, span depth). Kept free of dashboard module imports so the panel
// model can compose them with labelText/formatTime/dashboardStatusBadgeClass.
// ---------------------------------------------------------------------------

type WireSynthesisSidecarEvent = {
  spanId?: unknown;
  parentSpanId?: unknown;
  attempt?: unknown;
  phase?: unknown;
  boundary?: unknown;
  outcome?: unknown;
  code?: unknown;
  identities?: unknown;
  metrics?: unknown;
  facts?: unknown;
};

type WireSynthesisSidecarTrace = {
  traceId?: unknown;
  active?: unknown;
  startedAtMs?: unknown;
  updatedAtMs?: unknown;
  droppedCount?: unknown;
  events?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function narrowEvent(
  value: unknown,
): DashboardSynthesisSidecarEventView | null {
  const event = asRecord(value) as WireSynthesisSidecarEvent | null;
  if (!event) return null;
  const identities = asRecord(event.identities);
  const facts: Record<string, unknown> = {};
  for (const bag of [
    identities,
    asRecord(event.metrics),
    asRecord(event.facts),
  ]) {
    if (bag) Object.assign(facts, bag);
  }
  return {
    spanId: asString(event.spanId),
    parentSpanId: asString(event.parentSpanId),
    attempt: asNumber(event.attempt),
    phase: asString(event.phase),
    boundary: asString(event.boundary),
    outcome: asString(event.outcome),
    code: asString(event.code),
    operation: identities ? asString(identities.operation) : "",
    capability: identities ? asString(identities.capability) : "",
    factsJson: Object.keys(facts).length ? JSON.stringify(facts) : "",
  };
}

// Defensive narrowing of the unknown traceSnapshot wire slot. Returns null
// when the slot is missing or does not carry a traces array (the legacy
// renderer's empty-state guard).
export function narrowSynthesisSidecarTraceSnapshot(
  value: unknown,
): DashboardSynthesisSidecarTraceSnapshotView | null {
  const snapshot = asRecord(value);
  if (!snapshot || !Array.isArray(snapshot.traces)) return null;
  const traces: DashboardSynthesisSidecarTraceView[] = [];
  for (const entry of snapshot.traces as unknown[]) {
    const trace = asRecord(entry) as WireSynthesisSidecarTrace | null;
    if (!trace) continue;
    const events = Array.isArray(trace.events)
      ? trace.events
          .map(narrowEvent)
          .filter(
            (event): event is DashboardSynthesisSidecarEventView =>
              event !== null,
          )
      : [];
    traces.push({
      traceId: asString(trace.traceId),
      active: trace.active === true,
      startedAtMs: asNumber(trace.startedAtMs),
      updatedAtMs: asNumber(trace.updatedAtMs),
      droppedCount: asNumber(trace.droppedCount),
      events,
    });
  }
  return { traces, eventCount: asNumber(snapshot.eventCount) };
}

// Locate the raw (un-narrowed) trace object inside the unknown
// synthesisSidecarView slot so the projection can build the copy JSON
// verbatim, exactly like the legacy JSON.stringify(selected, null, 2).
export function findSynthesisSidecarRawTrace(
  view: unknown,
  traceId: string,
): unknown {
  const record = asRecord(view);
  const snapshot = record ? asRecord(record.traceSnapshot) : null;
  const traces =
    snapshot && Array.isArray(snapshot.traces)
      ? (snapshot.traces as unknown[])
      : null;
  if (!traces) return null;
  for (const entry of traces) {
    const trace = asRecord(entry);
    if (trace && trace.traceId === traceId) return entry;
  }
  return null;
}

export function synthesisSidecarTraceOutcome(
  trace: DashboardSynthesisSidecarTraceView,
): "started" | "failed" | "succeeded" {
  if (trace.active === true) return "started";
  return trace.events.some((event) => event.outcome === "failed")
    ? "failed"
    : "succeeded";
}

export function synthesisSidecarTraceRootOperation(
  trace: DashboardSynthesisSidecarTraceView,
): string {
  const root = trace.events.find((event) => !event.parentSpanId);
  return (root && (root.operation || root.capability)) || "-";
}

function traceSearchText(trace: DashboardSynthesisSidecarTraceView): string {
  return [
    trace.traceId,
    ...trace.events.flatMap((event) => [event.operation, event.capability]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function traceRankPriority(trace: DashboardSynthesisSidecarTraceView): number {
  if (trace.active === true) return 0;
  return synthesisSidecarTraceOutcome(trace) === "failed" ? 1 : 2;
}

// Legacy filter + priority sort: active first, then failed, then the rest;
// ties broken by updatedAtMs descending.
export function rankSynthesisSidecarTraces(
  traces: readonly DashboardSynthesisSidecarTraceView[],
  filter: string,
): DashboardSynthesisSidecarTraceView[] {
  const needle = String(filter || "")
    .trim()
    .toLowerCase();
  return traces
    .filter((trace) => !needle || traceSearchText(trace).includes(needle))
    .sort(
      (left, right) =>
        traceRankPriority(left) - traceRankPriority(right) ||
        right.updatedAtMs - left.updatedAtMs,
    );
}

export const SYNTHESIS_SIDECAR_VISIBLE_TRACE_LIMIT = 100;

// Legacy selection resolution: the state-pinned trace wins; otherwise the
// top-ranked trace; otherwise the most recently updated trace. The selected
// trace is always kept in the visible window (appended past the 100-row cap).
export function resolveSynthesisSidecarVisibleTraces(args: {
  traces: readonly DashboardSynthesisSidecarTraceView[];
  ranked: readonly DashboardSynthesisSidecarTraceView[];
  selectedTraceId: string;
}): {
  visible: DashboardSynthesisSidecarTraceView[];
  selected: DashboardSynthesisSidecarTraceView | null;
} {
  const { traces, ranked, selectedTraceId } = args;
  const selected =
    traces.find((trace) => trace.traceId === selectedTraceId) ||
    ranked[0] ||
    traces
      .slice()
      .sort((left, right) => right.updatedAtMs - left.updatedAtMs)[0] ||
    null;
  const visible = ranked.slice(0, SYNTHESIS_SIDECAR_VISIBLE_TRACE_LIMIT);
  if (
    selected &&
    !visible.some((trace) => trace.traceId === selected.traceId)
  ) {
    if (visible.length >= SYNTHESIS_SIDECAR_VISIBLE_TRACE_LIMIT) visible.pop();
    visible.push(selected);
  }
  return { visible, selected };
}

// data-trace-signature payload of a trace row (legacy fast-path comparator).
export function synthesisSidecarTraceRowSignature(
  trace: DashboardSynthesisSidecarTraceView,
  outcome: string,
  operation: string,
): string {
  return JSON.stringify({
    outcome,
    operation,
    updatedAtMs: trace.updatedAtMs,
    count: trace.events.length,
    dropped: trace.droppedCount,
  });
}

// data-trace-signature payload of the detail panel (legacy fast-path
// comparator).
export function synthesisSidecarTraceDetailSignature(
  trace: DashboardSynthesisSidecarTraceView,
): string {
  return `${trace.updatedAtMs}:${trace.events.length}:${trace.droppedCount}`;
}

// Span depth per event index, walking parentSpanId chains with the legacy
// cycle guard and depth cap (12).
export function synthesisSidecarEventDepths(
  events: readonly Pick<
    DashboardSynthesisSidecarEventView,
    "spanId" | "parentSpanId"
  >[],
): number[] {
  const spanParents = new Map<string, string>();
  for (const event of events) {
    spanParents.set(event.spanId, event.parentSpanId || "");
  }
  return events.map((event) => {
    let value = 0;
    let parent = event.parentSpanId;
    const seen = new Set<string>();
    while (parent && !seen.has(parent) && value < 12) {
      seen.add(parent);
      value += 1;
      parent = spanParents.get(parent) || "";
    }
    return value;
  });
}

// ---------------------------------------------------------------------------
// Imperative trace-table island. Preact renders the wrap/table/thead shell
// once; the tbody rows are reconciled imperatively with the legacy fast-path
// semantics: rows are keyed by data-trace-id, a row whose
// data-trace-signature is unchanged keeps its DOM subtree untouched, a
// changed row keeps the <tr> element but replaces its cells, and the wrap
// scroll position survives reconciliation.
// ---------------------------------------------------------------------------

function traceRowClassName(row: DashboardSynthesisSidecarTraceRow): string {
  return row.selected
    ? "clickable-row synthesis-trace-row selected"
    : "clickable-row synthesis-trace-row";
}

function traceCell(text: string): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.className = "mono";
  cell.textContent = text;
  return cell;
}

function buildTraceRowCells(
  row: DashboardSynthesisSidecarTraceRow,
): HTMLTableCellElement[] {
  const statusCell = document.createElement("td");
  statusCell.className = "mono";
  const badge = document.createElement("span");
  badge.className = row.outcomeBadgeClass;
  badge.textContent = row.outcome;
  statusCell.appendChild(badge);
  return [
    statusCell,
    traceCell(row.shortTraceId),
    traceCell(row.operation),
    traceCell(row.startedText),
    traceCell(row.spanCountText),
    traceCell(row.droppedText),
  ];
}

function buildTraceRow(
  row: DashboardSynthesisSidecarTraceRow,
  onSelectTrace: (traceId: string) => void,
): HTMLTableRowElement {
  const element = document.createElement("tr");
  element.className = traceRowClassName(row);
  element.dataset.traceId = row.traceId;
  element.dataset.traceSignature = row.signature;
  for (const cell of buildTraceRowCells(row)) {
    element.appendChild(cell);
  }
  element.addEventListener("click", () => onSelectTrace(row.traceId));
  return element;
}

export function reconcileSynthesisSidecarTraceRows(
  tbody: HTMLTableSectionElement,
  rows: readonly DashboardSynthesisSidecarTraceRow[],
  onSelectTrace: (traceId: string) => void,
): void {
  const wrap = tbody.closest(".synthesis-sidecar-events") as HTMLElement | null;
  const scrollTop = wrap ? wrap.scrollTop : 0;
  const retained = new Map<string, HTMLTableRowElement>();
  tbody.querySelectorAll("tr[data-trace-id]").forEach((node) => {
    const row = node as HTMLTableRowElement;
    retained.set(row.dataset.traceId || "", row);
  });
  for (const row of rows) {
    const existing = retained.get(row.traceId);
    if (!existing) {
      tbody.appendChild(buildTraceRow(row, onSelectTrace));
      continue;
    }
    if (existing.dataset.traceSignature !== row.signature) {
      existing.replaceChildren(...buildTraceRowCells(row));
      existing.dataset.traceSignature = row.signature;
    }
    const className = traceRowClassName(row);
    if (existing.className !== className) {
      existing.className = className;
    }
    tbody.appendChild(existing);
    retained.delete(row.traceId);
  }
  retained.forEach((row) => row.remove());
  if (wrap) {
    wrap.scrollTop = scrollTop;
  }
}

export type SynthesisSidecarTraceTableIslandProps = {
  columns: string[];
  rows: DashboardSynthesisSidecarTraceRow[];
  onSelectTrace: (traceId: string) => void;
};

export function SynthesisSidecarTraceTableIsland(
  props: SynthesisSidecarTraceTableIslandProps,
) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  // Row click listeners are attached once per row; route through a ref so
  // retained rows never hold a stale callback.
  const selectRef = useRef(props.onSelectTrace);
  selectRef.current = props.onSelectTrace;
  useLayoutEffect(() => {
    const tbody = bodyRef.current;
    if (tbody) {
      reconcileSynthesisSidecarTraceRows(tbody, props.rows, (traceId) =>
        selectRef.current(traceId),
      );
    }
  });
  return (
    <div class="table-wrap synthesis-sidecar-events">
      <table>
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody ref={bodyRef} />
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Causal trace detail panel. Keyed by traceId + signature at the usage site so
// a changed detail is remounted wholesale while an unchanged one diffs to a
// DOM no-op (the legacy fast path replaced the panel on the same condition).
// The copy button label swap after copy is an imperative mutation, matching
// the legacy textContent updates.
// ---------------------------------------------------------------------------

export type SynthesisSidecarTraceDetailProps = {
  detail: DashboardSynthesisSidecarDetailView | null;
  detailTitle: string;
  detailEmptySubtitle: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
  copyToastMessage: string;
  onCopyText: SynthesisSidecarCopyHandler;
};

export function SynthesisSidecarTraceDetail(
  props: SynthesisSidecarTraceDetailProps,
) {
  const { detail } = props;
  return (
    <section
      class="panel synthesis-sidecar-detail"
      data-trace-id={detail ? detail.traceId : ""}
      data-trace-signature={detail ? detail.signature : ""}
    >
      <div class="synthesis-sidecar-detail-header">
        <div>
          <h3 class="panel-title">{props.detailTitle}</h3>
          <div class="muted mono">
            {detail ? detail.subtitle : props.detailEmptySubtitle}
          </div>
        </div>
        {detail ? (
          <button
            class="btn"
            type="button"
            onClick={(event) => {
              const button = event.currentTarget as HTMLButtonElement;
              props
                .onCopyText(
                  detail.copyJson,
                  props.copyToastMessage,
                  props.copyFailedLabel,
                )
                .then(
                  () => {
                    button.textContent = props.copiedLabel;
                  },
                  () => {
                    button.textContent = props.copyFailedLabel;
                  },
                );
            }}
          >
            {props.copyLabel}
          </button>
        ) : null}
      </div>
      {detail ? (
        <table class="synthesis-sidecar-span-table">
          <tbody>
            {detail.spanRows.map((span) => (
              <tr key={span.spanId} data-span-id={span.spanId}>
                <td class="mono" style={{ paddingLeft: span.phasePaddingLeft }}>
                  {span.phase}
                </td>
                <td class="mono">{span.boundary}</td>
                <td class="mono">{span.attemptText}</td>
                <td class="mono">
                  <span class={span.outcomeBadgeClass}>{span.outcome}</span>
                </td>
                <td class="mono">{span.code}</td>
                <td class="mono">{span.factsText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Region boundary.
// ---------------------------------------------------------------------------

export const SynthesisSidecarRegion = memo(
  function SynthesisSidecarRegion(props: SynthesisSidecarRegionProps) {
    const { selection, onAction, onCopyText } = props;
    if (selection.kind === "empty") {
      return (
        <div
          class="dashboard-synthesis-sidecar"
          data-region-content="dashboard-synthesis-sidecar"
        >
          <h2 class="page-title">{selection.pageTitle}</h2>
          <div class="empty-state">{selection.emptyText}</div>
        </div>
      );
    }
    const detailKey = selection.detail
      ? `${selection.detail.traceId}\n${selection.detail.signature}`
      : "none";
    return (
      <div
        class="dashboard-synthesis-sidecar"
        data-region-content="dashboard-synthesis-sidecar"
      >
        <h2 class="page-title">{selection.pageTitle}</h2>
        <section class="synthesis-sidecar-summary">
          {selection.summaryCards.map((card) => (
            <div class="card" key={card.label}>
              <div class="card-label">{card.label}</div>
              <div class="card-value mono">{card.value}</div>
            </div>
          ))}
        </section>
        <label class="synthesis-sidecar-filter synthesis-sidecar-filter-grow">
          <span class="card-label">{selection.filterLabel}</span>
          <input
            class="workflow-settings-field-control mono"
            value={selection.filterValue}
            placeholder={selection.filterPlaceholder}
            onInput={(event) =>
              onAction("synthesis-sidecar-set-trace-filter", {
                filter: (event.target as HTMLInputElement).value,
              })
            }
          />
        </label>
        <div class="synthesis-sidecar-layout">
          <SynthesisSidecarTraceTableIsland
            columns={selection.columns}
            rows={selection.rows}
            onSelectTrace={(traceId) =>
              onAction("synthesis-sidecar-select-trace", { traceId })
            }
          />
          <SynthesisSidecarTraceDetail
            key={detailKey}
            detail={selection.detail}
            detailTitle={selection.detailTitle}
            detailEmptySubtitle={selection.detailEmptySubtitle}
            copyLabel={selection.copyLabel}
            copiedLabel={selection.copiedLabel}
            copyFailedLabel={selection.copyFailedLabel}
            copyToastMessage={selection.copyToastMessage}
            onCopyText={onCopyText}
          />
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    prev.onCopyText === next.onCopyText &&
    equalBySignature(prev.selection, next.selection),
);

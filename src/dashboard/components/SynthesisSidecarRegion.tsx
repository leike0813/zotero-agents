/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import { equalBySignature } from "../../shared/regionEquality";
import { CustomMultiSelect } from "../../shared/customSelect";
import type { DashboardActionPayloadMap } from "../../shared/dashboardWireContract";

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

// Defensive page-side view of DashboardSynthesisSidecarView.status: the wire
// slot is optional and its fields are best-effort strings. null when the
// host does not publish a status block at all.
export type DashboardSynthesisSidecarStatusView = {
  lifecycle: string;
  recoveryState: string;
  reasonCode: string;
  serviceVersion: string;
  bundleId: string;
  healthObservedAt: string;
};

// Controller-owned UI state for this surface (the legacy page-local
// state.synthesisTraceFilter / state.synthesisTraceId slots, plus the
// outcome checkbox set and the operation multi-select).
export type DashboardSynthesisSidecarUiState = {
  traceFilter: string;
  selectedTraceId: string;
  // Active outcome set (subset of "started" | "failed" | "succeeded"); an
  // empty set hides every trace, mirroring the runtime-logs level checkboxes.
  outcomeFilter: string[];
  // Operation multi-select; an empty set means "all operations".
  operationFilter: string[];
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
  filterOutcomeLabel: string;
  outcomeOptions: DashboardSynthesisSidecarFilterOption[];
  activeOutcomes: string[];
  filterOperationLabel: string;
  operationOptions: DashboardSynthesisSidecarFilterOption[];
  selectedOperations: string[];
  filterAllLabel: string;
  resultCountText: string;
  status: DashboardSynthesisSidecarStatusView | null;
  statusLabel: string;
  statusBadgeClass: string;
  statusRecoveryLabel: string;
  statusReasonLabel: string;
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

export type DashboardSynthesisSidecarFilterOption = {
  value: string;
  label: string;
};

// Page-local filter actions: they ride the controller's dispatch channel
// exactly like the wire-local select/filter actions but never reach the
// host, so they are declared page-side instead of in the wire contract.
export type DashboardSynthesisSidecarPageActionPayloadMap = {
  "synthesis-sidecar-set-outcome-filter": { outcomes: string[] } & Record<
    string,
    unknown
  >;
  "synthesis-sidecar-set-operation-filter": { operations: string[] } & Record<
    string,
    unknown
  >;
};

export type DashboardSynthesisSidecarActionPayloadMap = Pick<
  DashboardActionPayloadMap,
  "synthesis-sidecar-select-trace" | "synthesis-sidecar-set-trace-filter"
> &
  DashboardSynthesisSidecarPageActionPayloadMap;

export type DashboardSynthesisSidecarAction =
  keyof DashboardSynthesisSidecarActionPayloadMap & string;

export type DashboardSynthesisSidecarActionSender = <
  Action extends DashboardSynthesisSidecarAction,
>(
  action: Action,
  payload?: DashboardSynthesisSidecarActionPayloadMap[Action],
) => void;

export type SynthesisSidecarCopyHandler = (
  text: string,
  successToast: string,
  failureToast: string,
) => Promise<void>;

export type SynthesisSidecarRegionProps = {
  selection: DashboardSynthesisSidecarSelection;
  onAction: DashboardSynthesisSidecarActionSender;
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

// Defensive narrowing of the optional synthesisSidecarView.status wire slot;
// accepts the whole view (typed on the wire as carrying only traceSnapshot)
// and returns null when no status block is published.
export function narrowSynthesisSidecarStatus(
  view: unknown,
): DashboardSynthesisSidecarStatusView | null {
  const record = asRecord(view);
  const status = record ? asRecord(record.status) : null;
  if (!status) return null;
  return {
    lifecycle: asString(status.lifecycle) || "unknown",
    recoveryState: asString(status.recoveryState) || "none",
    reasonCode: asString(status.reasonCode),
    healthObservedAt: asString(status.healthObservedAt),
    serviceVersion: asString(status.serviceVersion),
    bundleId: asString(status.bundleId),
  };
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

export const SYNTHESIS_SIDECAR_OUTCOME_VALUES = [
  "started",
  "failed",
  "succeeded",
] as const;

// Outcome/operation filtering applied on top of the text-filtered ranking;
// the ranking itself is untouched. An empty operations set means "all".
export function filterSynthesisSidecarTraces(
  traces: readonly DashboardSynthesisSidecarTraceView[],
  args: { outcomes: readonly string[]; operations: readonly string[] },
): DashboardSynthesisSidecarTraceView[] {
  const outcomeSet = new Set(args.outcomes);
  const operationSet = new Set(args.operations);
  return traces.filter(
    (trace) =>
      outcomeSet.has(synthesisSidecarTraceOutcome(trace)) &&
      (operationSet.size === 0 ||
        operationSet.has(synthesisSidecarTraceRootOperation(trace))),
  );
}

// Operation multi-select options: the root-operation values of the loaded
// traces (the same derivation as the table's Operation column), deduped in
// first-seen order.
export function synthesisSidecarOperationOptions(
  traces: readonly DashboardSynthesisSidecarTraceView[],
): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const trace of traces) {
    const operation = synthesisSidecarTraceRootOperation(trace);
    if (!seen.has(operation)) {
      seen.add(operation);
      options.push(operation);
    }
  }
  return options;
}

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
// the legacy textContent updates, and reverts after a short window.
// ---------------------------------------------------------------------------

const COPY_LABEL_REVERT_MS = 900;

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
  // The copy label swap is imperative (legacy textContent updates); the
  // revert timer is cleaned up on unmount — the detail panel remounts
  // wholesale on trace change, which also cancels pending reverts.
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (revertTimerRef.current !== null) {
        clearTimeout(revertTimerRef.current);
      }
    },
    [],
  );
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
              const scheduleRevert = () => {
                if (revertTimerRef.current !== null) {
                  clearTimeout(revertTimerRef.current);
                }
                revertTimerRef.current = setTimeout(() => {
                  revertTimerRef.current = null;
                  button.textContent = props.copyLabel;
                }, COPY_LABEL_REVERT_MS);
              };
              props
                .onCopyText(
                  detail.copyJson,
                  props.copyToastMessage,
                  props.copyFailedLabel,
                )
                .then(
                  () => {
                    button.textContent = props.copiedLabel;
                    scheduleRevert();
                  },
                  () => {
                    button.textContent = props.copyFailedLabel;
                    scheduleRevert();
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

// Debounced filter input: typing updates the local draft immediately (no
// reprojection per keystroke); the controller intent is dispatched after a
// short idle window. External filter changes resync the draft.
function SynthesisSidecarFilterInput(props: {
  filterLabel: string;
  filterValue: string;
  filterPlaceholder: string;
  onAction: DashboardSynthesisSidecarActionSender;
}) {
  const [draft, setDraft] = useState(props.filterValue);
  const lastSentRef = useRef(props.filterValue);
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (props.filterValue !== lastSentRef.current) {
      lastSentRef.current = props.filterValue;
      setDraft(props.filterValue);
    }
  }, [props.filterValue]);
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    [],
  );
  return (
    <label class="synthesis-sidecar-filter synthesis-sidecar-filter-grow">
      <span class="card-label">{props.filterLabel}</span>
      <input
        class="workflow-settings-field-control mono"
        value={draft}
        placeholder={props.filterPlaceholder}
        onInput={(event) => {
          const value = (event.target as HTMLInputElement).value;
          setDraft(value);
          lastSentRef.current = value;
          window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            props.onAction("synthesis-sidecar-set-trace-filter", {
              filter: value,
            });
          }, 150);
        }}
      />
    </label>
  );
}

// Supervisor status notice: a prominent banner while the lifecycle is not
// "ready" (lifecycle + recoveryState + reasonCode when present). The ready
// state is rendered by the panel model as a plain summary card instead.
function SynthesisSidecarStatusNotice(props: {
  selection: DashboardSynthesisSidecarSelection;
}) {
  const { selection } = props;
  const status = selection.status;
  if (!status || status.lifecycle === "ready") {
    return null;
  }
  return (
    <div class="synthesis-sidecar-status-banner" role="alert">
      <span class="synthesis-sidecar-status-banner-label">
        {selection.statusLabel}
      </span>
      <span class={selection.statusBadgeClass}>{status.lifecycle}</span>
      {status.recoveryState && status.recoveryState !== "none" ? (
        <span class="synthesis-sidecar-status-banner-item">{`${selection.statusRecoveryLabel}: ${status.recoveryState}`}</span>
      ) : null}
      {status.reasonCode ? (
        <span class="synthesis-sidecar-status-banner-item">{`${selection.statusReasonLabel}: ${status.reasonCode}`}</span>
      ) : null}
    </div>
  );
}

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
          <SynthesisSidecarStatusNotice selection={selection} />
          <div class="empty-state">{selection.emptyText}</div>
        </div>
      );
    }
    const detailKey = selection.detail
      ? `${selection.detail.traceId}\n${selection.detail.signature}`
      : "none";
    const toggleOutcome = (value: string, checked: boolean) => {
      const active = new Set(selection.activeOutcomes);
      if (checked) {
        active.add(value);
      } else {
        active.delete(value);
      }
      const outcomes = selection.outcomeOptions
        .map((option) => option.value)
        .filter((optionValue) => active.has(optionValue));
      onAction("synthesis-sidecar-set-outcome-filter", { outcomes });
    };
    return (
      <div
        class="dashboard-synthesis-sidecar"
        data-region-content="dashboard-synthesis-sidecar"
      >
        <h2 class="page-title">{selection.pageTitle}</h2>
        <SynthesisSidecarStatusNotice selection={selection} />
        <section class="synthesis-sidecar-summary">
          {selection.summaryCards.map((card) => (
            <div class="card" key={card.label}>
              <div class="card-label">{card.label}</div>
              <div class="card-value mono">{card.value}</div>
            </div>
          ))}
        </section>
        <div class="toolbar logs-toolbar synthesis-sidecar-toolbar">
          <div class="logs-filter-wrap synthesis-sidecar-toolbar-filters">
            <SynthesisSidecarFilterInput
              filterLabel={selection.filterLabel}
              filterValue={selection.filterValue}
              filterPlaceholder={selection.filterPlaceholder}
              onAction={onAction}
            />
            <div class="logs-filter-levels synthesis-sidecar-outcome-filter">
              <span class="logs-filter-label">
                {selection.filterOutcomeLabel}
              </span>
              {selection.outcomeOptions.map((option) => (
                <label key={option.value} class="logs-filter-checkbox-label">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={
                      selection.activeOutcomes.indexOf(option.value) !== -1
                    }
                    onChange={(event) =>
                      toggleOutcome(option.value, event.currentTarget.checked)
                    }
                  />
                  <span class="logs-filter-text">{option.label}</span>
                </label>
              ))}
            </div>
            {selection.operationOptions.length > 0 ? (
              <div class="logs-filter-dropdown-wrap">
                <span class="logs-filter-label">
                  {selection.filterOperationLabel}
                </span>
                <CustomMultiSelect
                  options={selection.operationOptions}
                  values={selection.selectedOperations}
                  placeholder={selection.filterAllLabel}
                  onChange={(nextValues) =>
                    onAction("synthesis-sidecar-set-operation-filter", {
                      operations:
                        nextValues.length >= selection.operationOptions.length
                          ? []
                          : nextValues,
                    })
                  }
                />
              </div>
            ) : null}
          </div>
          <div class="logs-budget-status synthesis-sidecar-result-count">
            {selection.resultCountText}
          </div>
        </div>
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

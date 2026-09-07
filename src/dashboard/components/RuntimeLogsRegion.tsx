/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";

import {
  equalBySignature,
  stableRegionSignature,
} from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardHostActionName,
  DashboardRuntimeLogFilters,
} from "../../shared/dashboardWireContract";

// Runtime Logs surface of the dashboard page: level checkboxes, the backend/
// workflow multi-select dropdowns, the diagnostic-mode toggle, context scope
// chips, the budget line, copy/clear actions, and the log table with its
// detail pane.
//
// The surface splits into a Preact boundary (toolbar) and imperative islands:
// - The multi-select dropdowns wrap the legacy window.createMultiSelect
//   custom-select; they are only rebuilt when the option list changes, and
//   value-only updates go through setValue, so an open menu is never closed
//   by a snapshot echo (legacy fast path, app.js:4747).
// - The log table + detail pane are one imperative island reconciled by log
//   id: unchanged rows keep their DOM nodes, at most 300 rows render, and the
//   list/detail scroll positions survive snapshot updates (app.js:4731-4795).
//
// Action names and payload shapes mirror the legacy implementation
// (addon/content/dashboard/app.js renderRuntimeLogs, :3575-4093):
//   runtime-logs-set-filters            { filters }
//   runtime-logs-toggle-diagnostic      { enabled }
//   runtime-logs-clear-context          {}
//   runtime-logs-select-entries         { entryIds }
//   runtime-logs-copy-selected          { format: "pretty-json" | "ndjson" }
//   runtime-logs-copy-diagnostic-bundle {}
//   runtime-logs-copy-issue-summary     {}
//   runtime-logs-clear                  {}
//   runtime-logs-copy-entry             { entryId, format: "pretty-json" }

export const RUNTIME_LOGS_MAX_RENDERED_ROWS = 300;

export type DashboardRuntimeLogsLevelOption = {
  value: string;
  title: string;
};

export type DashboardRuntimeLogsFilterOption = {
  value: string;
  label: string;
};

export type DashboardRuntimeLogsContextChip = {
  key: string;
  value: string;
};

// Patch base for runtime-logs-set-filters: the filters object as last
// published by the host, shallowly merged with each pending patch (legacy
// pendingRuntimeLogFilters semantics, app.js:3584-3590). Mirrors the wire
// DashboardRuntimeLogFilters shape; re-declared here because region
// components may only import ./ or src/shared modules.
export type DashboardRuntimeLogsFilters = DashboardRuntimeLogFilters;

export type DashboardRuntimeLogsRow = {
  id: string;
  ts: string;
  level: string;
  stage: string;
  scope: string;
  message: string;
  detailPayloadJson: string;
  errorMessage: string;
  errorStack: string;
};

// The selection is the region's equality input: it carries only this
// surface's user-visible content (plus the filters patch base), resolved
// display strings included. The wire view's non-visible budget fields
// (maxBytes, estimatedBytes, droppedEntries, droppedByReason, retentionMode)
// and the duplicate filters.diagnosticMode stay out.
export type DashboardRuntimeLogsSelection = {
  pageTitle: string;
  levelOptions: DashboardRuntimeLogsLevelOption[];
  activeLevels: string[];
  filterBackendLabel: string;
  filterWorkflowLabel: string;
  filterAllLabel: string;
  backendOptions: DashboardRuntimeLogsFilterOption[];
  selectedBackendIds: string[];
  workflowOptions: DashboardRuntimeLogsFilterOption[];
  selectedWorkflowIds: string[];
  filters: DashboardRuntimeLogsFilters;
  diagnosticMode: boolean;
  diagnosticModeLabel: string;
  contextScopeLabel: string;
  contextChips: DashboardRuntimeLogsContextChip[];
  clearContextLabel: string;
  budgetText: string;
  copySelectedLabel: string;
  copyVisibleNdjsonLabel: string;
  copyDiagnosticBundleLabel: string;
  copyIssueSummaryLabel: string;
  clearLabel: string;
  clearConfirmText: string;
  copySuccessTemplate: string;
  copySuccessBundleText: string;
  copySuccessIssueText: string;
  selectedEntryIds: string[];
  columns: string[];
  emptyText: string;
  selectToViewText: string;
  detailTitle: string;
  copyDetailLabel: string;
  detailCloseLabel: string;
  exceptionTitle: string;
  rows: DashboardRuntimeLogsRow[];
};

export type DashboardRuntimeLogsAction = Extract<
  DashboardHostActionName,
  | "runtime-logs-set-filters"
  | "runtime-logs-toggle-diagnostic"
  | "runtime-logs-clear-context"
  | "runtime-logs-select-entries"
  | "runtime-logs-copy-selected"
  | "runtime-logs-copy-diagnostic-bundle"
  | "runtime-logs-copy-issue-summary"
  | "runtime-logs-clear"
  | "runtime-logs-copy-entry"
>;

export type DashboardRuntimeLogsActionSender =
  DashboardActionHandler<DashboardRuntimeLogsAction>;

// Ported from app.js formatMillis (:464-494): local-time timestamp with
// millisecond precision, "-" for empty input, raw text for unparseable input.
export function formatRuntimeLogTimestamp(value: unknown): string {
  const text = String(value || "").trim();
  if (!text) {
    return "-";
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  const padMs = (n: number) => (n < 100 ? "0" : "") + (n < 10 ? "0" : "") + n;
  return (
    parsed.getFullYear() +
    "-" +
    pad(parsed.getMonth() + 1) +
    "-" +
    pad(parsed.getDate()) +
    " " +
    pad(parsed.getHours()) +
    ":" +
    pad(parsed.getMinutes()) +
    ":" +
    pad(parsed.getSeconds()) +
    "." +
    padMs(parsed.getMilliseconds())
  );
}

// Safe detail payload serialization for the detail pane's payload view; the
// panel model applies it when mapping wire rows into selection rows.
export function stringifyRuntimeLogDetailPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2) || "";
  } catch {
    return String(payload ?? "");
  }
}

function logLevelBadgeClass(level: string): string {
  const normalized = String(level || "")
    .trim()
    .toLowerCase();
  return ["debug", "info", "warn", "error"].indexOf(normalized) !== -1
    ? normalized
    : "unknown";
}

function formatCopySuccess(template: string, count: number): string {
  return template.replace("{ $count }", String(count));
}

// ---------------------------------------------------------------------------
// Multi-select dropdown island (window.createMultiSelect custom-select)
// ---------------------------------------------------------------------------

type MultiSelectHandle = {
  element: HTMLElement;
  setValue?: (values: string[]) => void;
};

type CreateMultiSelectFn = (
  options: DashboardRuntimeLogsFilterOption[],
  values: string[],
  onChange: (values: string[]) => void,
  placeholder: string,
) => MultiSelectHandle;

function createMultiSelectFactory(): CreateMultiSelectFn | null {
  const host = window as unknown as { createMultiSelect?: unknown };
  return typeof host.createMultiSelect === "function"
    ? (host.createMultiSelect as CreateMultiSelectFn)
    : null;
}

function MultiSelectIsland(props: {
  options: DashboardRuntimeLogsFilterOption[];
  values: string[];
  placeholder: string;
  onApply: (values: string[]) => void;
}) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const mountedRef = useRef<{
    optionsSignature: string;
    valuesSignature: string;
    handle: MultiSelectHandle;
  } | null>(null);
  const applyRef = useRef(props.onApply);
  applyRef.current = props.onApply;

  const optionsSignature = stableRegionSignature(props.options);
  const valuesSignature = stableRegionSignature(props.values);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const factory = createMultiSelectFactory();
    if (!factory) return;
    const mounted = mountedRef.current;
    if (!mounted || mounted.optionsSignature !== optionsSignature) {
      const handle = factory(
        props.options,
        props.values,
        (nextValues) => applyRef.current(nextValues),
        props.placeholder,
      );
      host.replaceChildren();
      host.appendChild(handle.element);
      mountedRef.current = { optionsSignature, valuesSignature, handle };
    } else if (mounted.valuesSignature !== valuesSignature) {
      mounted.handle.setValue?.(props.values);
      mountedRef.current = { ...mounted, valuesSignature };
    }
  });

  return <span class="logs-filter-multiselect" ref={hostRef} />;
}

// ---------------------------------------------------------------------------
// Log table + detail pane island
// ---------------------------------------------------------------------------

type RuntimeLogsIslandView = {
  rows: DashboardRuntimeLogsRow[];
  selectedEntryIds: string[];
  columns: string[];
  emptyText: string;
  selectToViewText: string;
  detailTitle: string;
  copyDetailLabel: string;
  detailCloseLabel: string;
  exceptionTitle: string;
  copySuccessTemplate: string;
};

type RuntimeLogsIslandHooks = {
  onAction: DashboardRuntimeLogsActionSender;
  onToast: (message: string) => void;
};

class RuntimeLogsTableIsland {
  private readonly hooks: RuntimeLogsIslandHooks;
  private readonly tableWrap: HTMLDivElement;
  private readonly thead: HTMLTableSectionElement;
  private readonly tbody: HTMLTableSectionElement;
  private readonly detailPane: HTMLDivElement;
  private view: RuntimeLogsIslandView | null = null;
  private headSignature = "";
  private detailSignature = "";
  private renderedDetailRowId: string | null = null;
  private rowNodes = new Map<
    string,
    { tr: HTMLTableRowElement; signature: string }
  >();
  private emptyRow: HTMLTableRowElement | null = null;
  private emptySignature = "";
  private readingId: string | null = null;
  private detailScrollTop = 0;
  private detailRestoreTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(container: HTMLElement, hooks: RuntimeLogsIslandHooks) {
    this.hooks = hooks;
    const listPane = document.createElement("div");
    listPane.className = "logs-list-pane";
    this.tableWrap = document.createElement("div");
    this.tableWrap.className = "table-wrap logs-table-wrap";
    const table = document.createElement("table");
    table.className = "logs-table";
    this.thead = document.createElement("thead");
    this.tbody = document.createElement("tbody");
    table.appendChild(this.thead);
    table.appendChild(this.tbody);
    this.tableWrap.appendChild(table);
    listPane.appendChild(this.tableWrap);
    this.detailPane = document.createElement("div");
    this.detailPane.className = "logs-detail-pane";
    container.appendChild(listPane);
    container.appendChild(this.detailPane);
  }

  update(view: RuntimeLogsIslandView): void {
    if (this.disposed) return;
    this.view = view;
    this.syncHead(view);
    this.syncRows(view);
    this.syncDetail(false);
  }

  dispose(): void {
    this.disposed = true;
    if (this.detailRestoreTimer !== null) {
      clearTimeout(this.detailRestoreTimer);
      this.detailRestoreTimer = null;
    }
    this.view = null;
    this.rowNodes.clear();
    this.emptyRow = null;
    this.detailPane.replaceChildren();
  }

  private syncHead(view: RuntimeLogsIslandView): void {
    const selected = new Set(view.selectedEntryIds);
    const allSelected =
      view.rows.length > 0 && view.rows.every((row) => selected.has(row.id));
    const signature = stableRegionSignature([view.columns, allSelected]);
    if (signature === this.headSignature) return;
    this.headSignature = signature;
    const headRow = document.createElement("tr");
    const thCheck = document.createElement("th");
    thCheck.className = "col-check";
    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    selectAll.checked = allSelected;
    selectAll.addEventListener("change", () => {
      const current = this.view;
      if (!current) return;
      const nextIds = selectAll.checked
        ? current.rows.map((row) => row.id)
        : [];
      this.hooks.onAction("runtime-logs-select-entries", {
        entryIds: nextIds,
      });
    });
    thCheck.appendChild(selectAll);
    headRow.appendChild(thCheck);
    for (const title of view.columns) {
      const th = document.createElement("th");
      th.textContent = title;
      headRow.appendChild(th);
    }
    this.thead.replaceChildren(headRow);
  }

  private syncRows(view: RuntimeLogsIslandView): void {
    const selected = new Set(view.selectedEntryIds);
    const visibleRows = view.rows.slice(0, RUNTIME_LOGS_MAX_RENDERED_ROWS);
    const scrollTop = this.tableWrap.scrollTop;
    const nextIds = new Set(visibleRows.map((row) => row.id));
    for (const [id, entry] of this.rowNodes) {
      if (!nextIds.has(id)) {
        entry.tr.remove();
        this.rowNodes.delete(id);
      }
    }
    let previous: Node | null = null;
    for (const row of visibleRows) {
      // The reading marker is island-local UI state (legacy
      // state.logsActiveReadingId): applied imperatively by activateRow and
      // at row build time, never a rebuild trigger.
      const signature = stableRegionSignature([
        row.ts,
        row.level,
        row.stage,
        row.scope,
        row.message,
        selected.has(row.id),
      ]);
      let entry = this.rowNodes.get(row.id);
      if (entry && entry.signature !== signature) {
        const tr = this.buildRow(row);
        entry.tr.replaceWith(tr);
        entry = { tr, signature };
        this.rowNodes.set(row.id, entry);
      } else if (!entry) {
        entry = { tr: this.buildRow(row), signature };
        this.rowNodes.set(row.id, entry);
      }
      const tr = entry.tr;
      if (tr.parentNode !== this.tbody || tr.previousSibling !== previous) {
        this.tbody.insertBefore(
          tr,
          previous ? previous.nextSibling : this.tbody.firstChild,
        );
      }
      previous = tr;
    }
    if (visibleRows.length === 0) {
      const signature = stableRegionSignature([
        view.columns.length,
        view.emptyText,
      ]);
      if (!this.emptyRow || signature !== this.emptySignature) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = view.columns.length + 1;
        td.className = "empty";
        td.textContent = view.emptyText;
        tr.appendChild(td);
        this.emptyRow?.remove();
        this.emptyRow = tr;
        this.emptySignature = signature;
        this.tbody.appendChild(tr);
      }
    } else if (this.emptyRow) {
      this.emptyRow.remove();
      this.emptyRow = null;
      this.emptySignature = "";
    }
    this.tableWrap.scrollTop = scrollTop;
  }

  private buildRow(row: DashboardRuntimeLogsRow): HTMLTableRowElement {
    const current = this.view;
    const selected = new Set(current ? current.selectedEntryIds : []);
    const tr = document.createElement("tr");
    tr.className = "log-row";
    if (selected.has(row.id)) {
      tr.classList.add("selected");
    }
    if (this.readingId === row.id) {
      tr.classList.add("reading");
    }

    const checkCell = document.createElement("td");
    checkCell.className = "col-check";
    checkCell.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected.has(row.id);
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      const latest = this.view;
      if (!latest) return;
      const nextIds = new Set(latest.selectedEntryIds);
      if (checkbox.checked) {
        nextIds.add(row.id);
      } else {
        nextIds.delete(row.id);
      }
      this.hooks.onAction("runtime-logs-select-entries", {
        entryIds: Array.from(nextIds),
      });
    });
    checkCell.appendChild(checkbox);
    tr.appendChild(checkCell);

    const timeCell = document.createElement("td");
    timeCell.className = "mono";
    timeCell.textContent = formatRuntimeLogTimestamp(row.ts);
    tr.appendChild(timeCell);

    const levelCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `log-level-badge log-level-badge--${logLevelBadgeClass(row.level)}`;
    badge.textContent = String(row.level || "").toUpperCase();
    levelCell.appendChild(badge);
    tr.appendChild(levelCell);

    const stageCell = document.createElement("td");
    stageCell.textContent = row.stage || "-";
    tr.appendChild(stageCell);

    const scopeCell = document.createElement("td");
    scopeCell.textContent = row.scope || "-";
    tr.appendChild(scopeCell);

    const messageCell = document.createElement("td");
    messageCell.className = "log-message-cell";
    messageCell.textContent = row.message || "-";
    tr.appendChild(messageCell);

    tr.addEventListener("click", () => {
      this.activateRow(row.id);
    });
    return tr;
  }

  private activateRow(id: string): void {
    const previous = this.tbody.querySelector("tr.reading");
    if (previous) {
      previous.classList.remove("reading");
    }
    const entry = this.rowNodes.get(id);
    if (entry) {
      entry.tr.classList.add("reading");
    }
    if (this.readingId !== id) {
      this.detailScrollTop = 0;
    }
    this.readingId = id;
    this.syncDetail(true);
  }

  private closeDetail(): void {
    if (this.detailRestoreTimer !== null) {
      clearTimeout(this.detailRestoreTimer);
      this.detailRestoreTimer = null;
    }
    this.readingId = null;
    this.renderedDetailRowId = null;
    this.detailScrollTop = 0;
    this.detailPane.replaceChildren();
    this.detailPane.classList.remove("visible");
    const active = this.tbody.querySelector("tr.reading");
    if (active) {
      active.classList.remove("reading");
    }
    // Legacy clears the pane on close; the next snapshot update re-renders
    // the empty-state placeholder (fast path replaces the whole detail pane).
    this.detailSignature = "";
  }

  private syncDetail(force: boolean): void {
    if (this.disposed) return;
    const view = this.view;
    if (!view) return;
    const row = this.readingId
      ? view.rows.find((candidate) => candidate.id === this.readingId) || null
      : null;
    const signature = row
      ? stableRegionSignature([
          row.id,
          row.detailPayloadJson,
          row.errorMessage,
          row.errorStack,
          view.detailTitle,
          view.copyDetailLabel,
          view.detailCloseLabel,
          view.exceptionTitle,
          view.copySuccessTemplate,
        ])
      : "empty\n" + view.selectToViewText;
    if (!force && signature === this.detailSignature) return;
    // Fast-path parity (app.js:4780-4787): carry the payload scroll position
    // across a re-render of the same entry.
    if (row && this.renderedDetailRowId === row.id) {
      const oldPayload = this.detailPane.querySelector(".payload-view");
      if (oldPayload) {
        this.detailScrollTop = (oldPayload as HTMLElement).scrollTop || 0;
      }
    }
    this.detailSignature = signature;
    this.renderedDetailRowId = row ? row.id : null;
    this.detailPane.replaceChildren();
    if (!row) {
      this.detailPane.classList.remove("visible");
      const empty = document.createElement("div");
      empty.className = "logs-detail-empty";
      empty.textContent = view.selectToViewText;
      this.detailPane.appendChild(empty);
      return;
    }
    this.detailPane.classList.add("visible");

    const header = document.createElement("div");
    header.className = "logs-detail-header";
    const title = document.createElement("h3");
    title.textContent = `${view.detailTitle} `;
    header.appendChild(title);
    const actions = document.createElement("div");
    actions.className = "logs-detail-actions";
    const copyButton = document.createElement("button");
    copyButton.className = "btn logs-detail-copy";
    copyButton.textContent = view.copyDetailLabel;
    copyButton.addEventListener("click", () => {
      this.hooks.onAction("runtime-logs-copy-entry", {
        entryId: row.id,
        format: "pretty-json",
      });
      this.hooks.onToast(formatCopySuccess(view.copySuccessTemplate, 1));
    });
    actions.appendChild(copyButton);
    const closeButton = document.createElement("button");
    closeButton.className = "btn clear logs-detail-close";
    closeButton.textContent = view.detailCloseLabel;
    closeButton.addEventListener("click", () => {
      this.closeDetail();
    });
    actions.appendChild(closeButton);
    header.appendChild(actions);
    this.detailPane.appendChild(header);

    const content = document.createElement("div");
    content.className = "logs-detail-content";
    if (row.errorMessage) {
      const errorTitle = document.createElement("h4");
      errorTitle.className = "error-title";
      errorTitle.textContent = view.exceptionTitle;
      content.appendChild(errorTitle);
      const errorPre = document.createElement("pre");
      errorPre.className = "log-error mono";
      errorPre.textContent = row.errorMessage;
      content.appendChild(errorPre);
      if (row.errorStack) {
        const stackPre = document.createElement("pre");
        stackPre.className = "log-stack mono";
        stackPre.textContent = row.errorStack;
        content.appendChild(stackPre);
      }
    }
    const payloadView = document.createElement("pre");
    payloadView.className = "log-view mono payload-view";
    payloadView.textContent = row.detailPayloadJson;
    payloadView.addEventListener("scroll", () => {
      this.detailScrollTop = payloadView.scrollTop || 0;
    });
    content.appendChild(payloadView);
    this.detailPane.appendChild(content);

    if (this.detailScrollTop > 0) {
      const scrollTop = this.detailScrollTop;
      if (this.detailRestoreTimer !== null) {
        clearTimeout(this.detailRestoreTimer);
      }
      this.detailRestoreTimer = setTimeout(() => {
        this.detailRestoreTimer = null;
        if (this.disposed) return;
        payloadView.scrollTop = scrollTop;
      }, 0);
    }
  }
}

function LogsTableIsland(props: {
  selection: DashboardRuntimeLogsSelection;
  onAction: DashboardRuntimeLogsActionSender;
  onToast: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const islandRef = useRef<RuntimeLogsTableIsland | null>(null);
  const hooksRef = useRef({
    onAction: props.onAction,
    onToast: props.onToast,
  });
  hooksRef.current = { onAction: props.onAction, onToast: props.onToast };

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!islandRef.current) {
      islandRef.current = new RuntimeLogsTableIsland(host, {
        onAction: (action, payload) =>
          hooksRef.current.onAction(action, payload),
        onToast: (message) => hooksRef.current.onToast(message),
      });
    }
    const selection = props.selection;
    islandRef.current.update({
      rows: selection.rows,
      selectedEntryIds: selection.selectedEntryIds,
      columns: selection.columns,
      emptyText: selection.emptyText,
      selectToViewText: selection.selectToViewText,
      detailTitle: selection.detailTitle,
      copyDetailLabel: selection.copyDetailLabel,
      detailCloseLabel: selection.detailCloseLabel,
      exceptionTitle: selection.exceptionTitle,
      copySuccessTemplate: selection.copySuccessTemplate,
    });
  });
  useEffect(
    () => () => {
      islandRef.current?.dispose();
      islandRef.current = null;
    },
    [],
  );

  return <div class="logs-split-view" ref={hostRef} />;
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export type DashboardRuntimeLogsRegionProps = {
  selection: DashboardRuntimeLogsSelection;
  onAction: DashboardRuntimeLogsActionSender;
  onToast: (message: string) => void;
};

export const RuntimeLogsRegion = memo(
  function RuntimeLogsRegion(props: DashboardRuntimeLogsRegionProps) {
    const { selection, onAction, onToast } = props;
    const copyVisibleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    useEffect(
      () => () => {
        if (copyVisibleTimerRef.current !== null) {
          clearTimeout(copyVisibleTimerRef.current);
          copyVisibleTimerRef.current = null;
        }
      },
      [],
    );

    // Legacy pendingRuntimeLogFilters: patches accumulate on top of the last
    // published filters object until the next snapshot echo replaces it.
    const filterPatchRef = useRef<{
      signature: string;
      filters: DashboardRuntimeLogsFilters;
    } | null>(null);
    const filtersSignature = stableRegionSignature(selection.filters);
    if (
      !filterPatchRef.current ||
      filterPatchRef.current.signature !== filtersSignature
    ) {
      filterPatchRef.current = {
        signature: filtersSignature,
        filters: { ...selection.filters },
      };
    }
    const sendFilterPatch = (patch: DashboardRuntimeLogsFilters) => {
      const pending = filterPatchRef.current!;
      pending.filters = { ...pending.filters, ...patch };
      onAction("runtime-logs-set-filters", {
        filters: { ...pending.filters },
      });
    };

    const selectedCount = selection.selectedEntryIds.length;
    const hasLogs = selection.rows.length > 0;

    const toggleLevel = (levelValue: string, checked: boolean) => {
      const active = new Set(selection.activeLevels);
      if (checked) {
        active.add(levelValue);
      } else {
        active.delete(levelValue);
      }
      const nextLevels = selection.levelOptions
        .map((option) => option.value)
        .filter((value) => active.has(value));
      sendFilterPatch({ levels: nextLevels });
    };

    const copySelected = () => {
      onAction("runtime-logs-copy-selected", { format: "pretty-json" });
      onToast(formatCopySuccess(selection.copySuccessTemplate, selectedCount));
    };

    const copyVisibleNdjson = () => {
      const ids = selection.rows.map((row) => row.id);
      onAction("runtime-logs-select-entries", { entryIds: ids });
      // Legacy timing: the copy action must run after the selection echo.
      if (copyVisibleTimerRef.current !== null) {
        clearTimeout(copyVisibleTimerRef.current);
      }
      copyVisibleTimerRef.current = setTimeout(() => {
        copyVisibleTimerRef.current = null;
        onAction("runtime-logs-copy-selected", { format: "ndjson" });
        onToast(formatCopySuccess(selection.copySuccessTemplate, ids.length));
      }, 50);
    };

    const clearLogs = () => {
      if (window.confirm(selection.clearConfirmText)) {
        onAction("runtime-logs-clear", {});
      }
    };

    return (
      <div
        class="dashboard-runtime-logs"
        data-region-content="dashboard-runtime-logs"
      >
        <h2 class="page-title">{selection.pageTitle}</h2>
        <div class="toolbar logs-toolbar">
          <div class="logs-filter-wrap">
            <div class="logs-filter-levels">
              {selection.levelOptions.map((option) => (
                <label key={option.value} class="logs-filter-checkbox-label">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={
                      selection.activeLevels.indexOf(option.value) !== -1
                    }
                    onChange={(event) =>
                      toggleLevel(option.value, event.currentTarget.checked)
                    }
                  />
                  <span class="logs-filter-text">{option.title}</span>
                </label>
              ))}
            </div>
            {selection.backendOptions.length > 0 ? (
              <div class="logs-filter-dropdown-wrap">
                <span class="logs-filter-label">
                  {selection.filterBackendLabel}
                </span>
                <MultiSelectIsland
                  options={selection.backendOptions}
                  values={selection.selectedBackendIds}
                  placeholder={selection.filterAllLabel}
                  onApply={(nextValues) =>
                    sendFilterPatch({
                      backendId:
                        nextValues.length >= selection.backendOptions.length
                          ? undefined
                          : nextValues,
                    })
                  }
                />
              </div>
            ) : null}
            {selection.workflowOptions.length > 0 ? (
              <div class="logs-filter-dropdown-wrap">
                <span class="logs-filter-label">
                  {selection.filterWorkflowLabel}
                </span>
                <MultiSelectIsland
                  options={selection.workflowOptions}
                  values={selection.selectedWorkflowIds}
                  placeholder={selection.filterAllLabel}
                  onApply={(nextValues) =>
                    sendFilterPatch({
                      workflowId:
                        nextValues.length >= selection.workflowOptions.length
                          ? undefined
                          : nextValues,
                    })
                  }
                />
              </div>
            ) : null}
            <div class="logs-filter-diagnostic">
              <label class="logs-filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={selection.diagnosticMode}
                  onChange={(event) =>
                    onAction("runtime-logs-toggle-diagnostic", {
                      enabled: event.currentTarget.checked,
                    })
                  }
                />
                <span class="logs-filter-text">
                  {selection.diagnosticModeLabel}
                </span>
              </label>
            </div>
          </div>
          <div class="logs-context-wrap">
            {selection.contextChips.length > 0 ? (
              <>
                <span class="logs-context-label">
                  {selection.contextScopeLabel}
                </span>
                {selection.contextChips.map((chip) => (
                  <span key={chip.key} class="logs-context-badge mono">
                    {chip.key}={chip.value}
                  </span>
                ))}
                <button
                  class="btn clear"
                  onClick={() => onAction("runtime-logs-clear-context", {})}
                >
                  {selection.clearContextLabel}
                </button>
              </>
            ) : null}
          </div>
          <div class="logs-budget-status" data-runtime-log-budget="true">
            {selection.budgetText}
          </div>
          <div class="logs-action-wrap">
            <div class="logs-copy-group">
              <button
                class="btn"
                disabled={selectedCount === 0}
                onClick={copySelected}
              >
                {selection.copySelectedLabel}
              </button>
              <button
                class="btn"
                disabled={!hasLogs}
                onClick={copyVisibleNdjson}
              >
                {selection.copyVisibleNdjsonLabel}
              </button>
              <button
                class="btn"
                disabled={!hasLogs}
                onClick={() => {
                  onAction("runtime-logs-copy-diagnostic-bundle", {});
                  onToast(selection.copySuccessBundleText);
                }}
              >
                {selection.copyDiagnosticBundleLabel}
              </button>
              <button
                class="btn"
                disabled={!hasLogs}
                onClick={() => {
                  onAction("runtime-logs-copy-issue-summary", {});
                  onToast(selection.copySuccessIssueText);
                }}
              >
                {selection.copyIssueSummaryLabel}
              </button>
            </div>
            <button class="btn clear" onClick={clearLogs}>
              {selection.clearLabel}
            </button>
          </div>
        </div>
        <LogsTableIsland
          selection={selection}
          onAction={onAction}
          onToast={onToast}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    prev.onToast === next.onToast &&
    equalBySignature(prev.selection, next.selection),
);

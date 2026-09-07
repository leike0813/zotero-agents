// Pure projection: DashboardSnapshot + local UI state -> DashboardPanel DTO,
// plus the per-region equality selectors used by both the chrome renderer's
// Preact memo boundaries and future imperative guards.
//
// A region's selector must contain only that region's user-visible content
// and open/collapsed state; counts and high-frequency fields owned by other
// regions must never enter (see src/shared/regionEquality.ts).

import type {
  DashboardHomeWorkflowEntry,
  DashboardRow,
} from "../shared/dashboardWireContract";
import { labelText, type DashboardLabels } from "./dashboardLabels";
import {
  dashboardLogLevelBadgeClass,
  dashboardStatusBadgeClass,
  dashboardTabIconClass,
  formatBytes,
  formatTime,
} from "./dashboardDomUtils";
import type {
  DashboardHomeRunningRow,
  DashboardHomeSelection,
} from "./components/HomeRegion";
import type {
  DashboardTabBarSelection,
  DashboardTabView,
} from "./components/TabBarRegion";
import {
  isDashboardTaskTerminal,
  type DashboardBackendKind,
  type DashboardBackendSelection,
} from "./components/BackendRegion";
import {
  type DashboardFeedbackSelection,
  type DashboardProductPreviewView,
  type DashboardProductPreviewWire,
  type DashboardProductsSectionSelection,
  type DashboardProductsSelection,
  type DashboardProductsText,
  type DashboardProductStorageViewWire,
  type DashboardProductWire,
} from "./components/ProductsRegion";
import {
  dashboardWorkflowOptionsEqualityInput,
  type DashboardWorkflowOptionsSelection,
  type WorkflowSettingsDescriptorView,
} from "./components/WorkflowOptionsRegion";
import {
  formatRuntimeLogTimestamp,
  stringifyRuntimeLogDetailPayload,
  type DashboardRuntimeLogsFilters,
  type DashboardRuntimeLogsSelection,
} from "./components/RuntimeLogsRegion";
import {
  findSynthesisSidecarRawTrace,
  narrowSynthesisSidecarTraceSnapshot,
  rankSynthesisSidecarTraces,
  resolveSynthesisSidecarVisibleTraces,
  synthesisSidecarEventDepths,
  synthesisSidecarTraceDetailSignature,
  synthesisSidecarTraceOutcome,
  synthesisSidecarTraceRootOperation,
  synthesisSidecarTraceRowSignature,
  type DashboardSynthesisSidecarSelection,
} from "./components/SynthesisSidecarRegion";
import {
  type DashboardSkillrunnerAuditBarRow,
  type DashboardSkillrunnerAuditSelection,
  type SkillrunnerAuditConnectionView,
  type SkillrunnerAuditWireCountRow,
  type SkillrunnerAuditWireEvent,
} from "./components/SkillrunnerAuditRegion";
import {
  projectDashboardAcpTraceReplaySelection,
  type DashboardAcpTraceReplaySelection,
} from "./components/AcpTraceReplayRegion";
import type {
  DashboardPageSnapshot,
  DashboardPanel,
  DashboardPanelViews,
  DashboardUiState,
} from "./dashboardTypes";

// Compile-time feature gate for the synthesis sidecar diagnostics surface,
// mirroring the legacy page (former addon/content/dashboard/app.js:2-5).
// esbuild define folds these identifiers in production builds; the typeof
// guards keep the expression safe when no define is present (tests,
// harnesses). The expression is inlined at every use site on purpose:
// esbuild does not propagate a module-scope const into later statements,
// which would defeat dead-code elimination. Release elision of this surface
// is verified by scripts/check-runtime-diagnostics-release-elision.ts.
declare const __debug_mode__: boolean;
declare const __synthesis_sidecar_diagnostics_enabled__: boolean;

function projectTab(
  tab: DashboardPageSnapshot["tabs"][number],
  selectedTabKey: string,
  labels: DashboardLabels,
): DashboardTabView {
  return {
    key: String(tab.key || ""),
    label: tab.label || tab.key,
    group: tab.group === "backend" ? "backend" : "system",
    active: String(tab.key || "") === selectedTabKey,
    disabled: tab.disabled === true,
    disabledReason:
      typeof tab.disabledReason === "string" ? tab.disabledReason.trim() : "",
    unavailableTag: labelText(labels, "backendUnavailableTag", "Unavailable"),
    iconClass: dashboardTabIconClass(tab.key),
  };
}

function projectTabBar(
  snapshot: DashboardPageSnapshot,
  labels: DashboardLabels,
  selectedTabKey: string,
): DashboardTabBarSelection {
  const tabs = Array.isArray(snapshot.tabs) ? snapshot.tabs : [];
  return {
    systemTitle: labelText(labels, "tabHome"),
    backendTitle: labelText(labels, "tabBackends"),
    emptyText: labelText(labels, "noBackends"),
    tabs: tabs.map((tab) => projectTab(tab, selectedTabKey, labels)),
  };
}

function projectHomeBubble(
  workflow: DashboardHomeWorkflowEntry,
  labels: DashboardLabels,
) {
  const runLabel = labelText(labels, "homeWorkflowRunButton");
  const disabledReason = String(workflow.quickRunDisabledReason || "").trim();
  const docLabel = labelText(labels, "homeWorkflowDocButton");
  const settingsLabel = labelText(labels, "homeWorkflowSettingsButton");
  return {
    workflowId: String(workflow.workflowId || ""),
    title: workflow.workflowLabel || workflow.workflowId || "-",
    officialBadgeText:
      workflow.official === true
        ? labelText(labels, "homeWorkflowBuiltinBadge")
        : "",
    coreBadgeText:
      workflow.core === true ? labelText(labels, "homeWorkflowCoreBadge") : "",
    runTitle:
      workflow.quickRunEnabled === true ? runLabel : disabledReason || runLabel,
    runAriaLabel: runLabel,
    runDisabled: workflow.quickRunEnabled !== true,
    docTitle: docLabel,
    docAriaLabel: docLabel,
    settingsTitle: settingsLabel,
    settingsAriaLabel: settingsLabel,
    settingsDisabled: workflow.configurable !== true,
  };
}

function projectHomeRunningRow(row: DashboardRow): DashboardHomeRunningRow {
  return {
    taskId: String(row.id || ""),
    taskName: String(row.taskName || ""),
    workflowLabel: String(row.workflowLabel || ""),
    backendLabel: String(row.backendLabel || ""),
    statusText: String(row.stateLabel || ""),
    statusClass: dashboardStatusBadgeClass(row.state),
    updatedAtText: formatTime(row.updatedAt),
    backendId: String(row.backendId || ""),
    backendType: String(row.backendType || ""),
    runKey: String(row.runKey || ""),
    requestId: String(row.requestId || ""),
    requestKind: String(row.requestKind || ""),
  };
}

function projectHome(
  snapshot: DashboardPageSnapshot,
  labels: DashboardLabels,
): DashboardHomeSelection {
  const workflows = Array.isArray(snapshot.homeWorkflows)
    ? snapshot.homeWorkflows
    : [];
  const runningRows = Array.isArray(snapshot.runningRows)
    ? snapshot.runningRows
    : [];
  const summary = snapshot.summary;
  const docView = snapshot.homeWorkflowDocView;
  return {
    kind: docView ? "doc" : "summary",
    pageTitle: snapshot.title || labelText(labels, "tabHome"),
    bubblesTitle: labelText(labels, "homeWorkflowTitle"),
    bubbles: workflows.map((workflow) => projectHomeBubble(workflow, labels)),
    summaryTitle: labelText(labels, "homeSummaryTitle"),
    cards: [
      {
        label: labelText(labels, "summaryTotal"),
        value: String(summary.total),
      },
      {
        label: labelText(labels, "summaryRunning"),
        value: String(summary.running),
      },
      {
        label: labelText(labels, "summarySucceeded"),
        value: String(summary.succeeded),
      },
      {
        label: labelText(labels, "summaryFailed"),
        value: String(summary.failed),
      },
      {
        label: labelText(labels, "summaryCanceled"),
        value: String(summary.canceled),
      },
    ],
    runningTitle: labelText(labels, "runningTitle"),
    runningEmptyText: labelText(labels, "noRunning"),
    runningColumns: [
      labelText(labels, "colTask"),
      labelText(labels, "colWorkflow"),
      labelText(labels, "colBackend"),
      labelText(labels, "colStatus"),
      labelText(labels, "colUpdatedAt"),
    ],
    runningRows: runningRows.map(projectHomeRunningRow),
    doc: docView
      ? {
          workflowId: String(docView.workflowId || ""),
          title: docView.workflowLabel || docView.workflowId || "-",
          html: String(docView.html || ""),
          markdown: String(docView.markdown || ""),
          baseFileUri: String(docView.baseFileUri || ""),
          missingReadme: docView.missingReadme === true,
          missingReadmeText: labelText(labels, "homeWorkflowDocMissingReadme"),
          backLabel: labelText(labels, "homeWorkflowDocBack"),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Products (legacy renderProducts, app.js:2327-2704)
// ---------------------------------------------------------------------------

function projectProductsText(labels: DashboardLabels): DashboardProductsText {
  return {
    productsSection: labelText(labels, "productsSectionFiles"),
    feedbackSection: labelText(labels, "productsSectionFeedback"),
    openWorkspace: labelText(labels, "productsOpenWorkspace"),
    openRun: labelText(labels, "productsOpenRun"),
    remove: labelText(labels, "productsRemove"),
    filterAllSkills: labelText(labels, "feedbackFilterAllSkills"),
    filterSkillAria: labelText(labels, "feedbackFilterSkill"),
    exportSelected: labelText(labels, "feedbackExportSelected"),
    deleteSelected: labelText(labels, "feedbackDeleteSelected"),
    deleteAll: labelText(labels, "feedbackDeleteAll"),
    selectAll: labelText(labels, "feedbackSelectAll"),
    feedbackEmpty: labelText(labels, "feedbackEmpty"),
    productsEmpty: labelText(labels, "productsEmpty"),
    listTitle: labelText(labels, "productsListTitle"),
    listExpand: labelText(labels, "productsListExpand"),
    listCollapse: labelText(labels, "productsListCollapse"),
    listRail: labelText(labels, "productsListRail"),
    noFiles: labelText(labels, "productsNoFiles"),
    selectFile: labelText(labels, "productsSelectFile"),
    previewUnavailable: labelText(labels, "productsPreviewUnavailable"),
    rawMarkdown: labelText(labels, "productsRawMarkdown"),
    viewerWrap: labelText(labels, "productsViewerWrap", "Wrap"),
    viewerCopy: labelText(labels, "productsViewerCopy", "Copy"),
    viewerCopied: labelText(labels, "productsViewerCopied"),
    viewerCopyFailed: labelText(labels, "productsViewerCopyFailed"),
  };
}

function productTitle(product: DashboardProductWire): string {
  return String(product.title || product.productId || "");
}

function projectProductPreview(
  preview: DashboardProductPreviewWire | null | undefined,
): DashboardProductPreviewView | null {
  if (!preview) return null;
  const kind = String(preview.kind || "text");
  return {
    metaText: [
      String(preview.path || ""),
      kind,
      typeof preview.size === "number" ? `${preview.size} bytes` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    kind,
    language: String(preview.language || ""),
    text: String(preview.text || ""),
    source: String(preview.formattedText || preview.text || ""),
    previewable: preview.previewable === true,
    error: String(preview.error || ""),
  };
}

function projectProductsSelection(
  snapshot: DashboardPageSnapshot,
  labels: DashboardLabels,
): DashboardProductsSelection {
  const view = (snapshot.productStorageView ||
    {}) as DashboardProductStorageViewWire;
  const section = view.section === "feedback" ? "feedback" : "products";
  const selected = view.selectedProduct;
  const selectedBackendType = String(selected?.backendType || "").trim();
  const products: DashboardProductsSectionSelection | null =
    section === "products"
      ? {
          items: (Array.isArray(view.products) ? view.products : []).map(
            (product) => ({
              productId: String(product.productId || ""),
              title: productTitle(product),
              metaText: [
                product.workflowLabel || product.workflowId || "",
                product.storageMode || "",
                formatTime(product.updatedAt),
              ]
                .filter(Boolean)
                .join(" · "),
              active: !!selected && product.productId === selected.productId,
            }),
          ),
          selected: selected
            ? {
                productId: String(selected.productId || ""),
                title: productTitle(selected),
                metaText: [
                  selected.kind || "",
                  selected.workflowLabel || selected.workflowId || "",
                  selected.backendType || "",
                  selected.storageMode || "",
                ]
                  .filter(Boolean)
                  .join(" · "),
                canOpenRun:
                  !!selected.backendId &&
                  (selectedBackendType === "skillrunner"
                    ? !!selected.runKey
                    : !!selected.requestId),
                backendId: String(selected.backendId || ""),
                runKey: String(selected.runKey || ""),
                requestId: String(selected.requestId || ""),
                assets: (Array.isArray(selected.assets)
                  ? selected.assets
                  : []
                ).map((asset) => ({
                  assetId: String(asset.assetId || ""),
                  label: String(asset.label || ""),
                  relativePath: String(asset.relativePath || ""),
                  path: String(asset.path || ""),
                  contentType: String(asset.contentType || ""),
                  sizeText: formatBytes(asset.size),
                })),
                selectedAssetId: String(view.selectedAssetId || ""),
                preview: projectProductPreview(view.selectedPreview),
              }
            : null,
        }
      : null;
  const feedbackProducts = Array.isArray(view.feedbackProducts)
    ? view.feedbackProducts
    : [];
  const selectedFeedbackIds = new Set(
    Array.isArray(view.selectedFeedbackProductIds)
      ? view.selectedFeedbackProductIds
      : [],
  );
  const selectedFeedback = view.selectedFeedbackProduct;
  const visibleFeedbackIds = feedbackProducts
    .map((product) => String(product.productId || "").trim())
    .filter(Boolean);
  const selectedVisibleCount = visibleFeedbackIds.filter((productId) =>
    selectedFeedbackIds.has(productId),
  ).length;
  const skillFilter = String(view.feedbackSkillFilter || "");
  const feedback: DashboardFeedbackSelection | null =
    section === "feedback"
      ? {
          skillOptions: Array.isArray(view.feedbackSkillOptions)
            ? view.feedbackSkillOptions
            : [],
          skillFilter,
          hasSelection: selectedFeedbackIds.size > 0,
          selectAllChecked:
            visibleFeedbackIds.length > 0 &&
            selectedVisibleCount === visibleFeedbackIds.length,
          selectAllIndeterminate:
            selectedVisibleCount > 0 &&
            selectedVisibleCount < visibleFeedbackIds.length,
          items: feedbackProducts.map((product) => ({
            productId: String(product.productId || ""),
            title: productTitle(product),
            metaText: [
              product.metadata?.skillId || "",
              product.workflowLabel || product.workflowId || "",
              formatTime(product.updatedAt),
            ]
              .filter(Boolean)
              .join(" · "),
            active:
              !!selectedFeedback &&
              product.productId === selectedFeedback.productId,
            checked: selectedFeedbackIds.has(String(product.productId || "")),
          })),
          selected: selectedFeedback
            ? {
                productId: String(selectedFeedback.productId || ""),
                title: productTitle(selectedFeedback),
                metaText: [
                  selectedFeedback.metadata?.skillId || "",
                  selectedFeedback.workflowLabel ||
                    selectedFeedback.workflowId ||
                    "",
                  selectedFeedback.backendType || "",
                  selectedFeedback.requestId || "",
                ]
                  .filter(Boolean)
                  .join(" · "),
                preview: projectProductPreview(view.selectedFeedbackPreview),
              }
            : null,
        }
      : null;
  return {
    pageTitle: labelText(labels, "tabProducts"),
    section,
    isExporting: view.isExporting === true,
    text: projectProductsText(labels),
    products,
    feedback,
  };
}

// ---------------------------------------------------------------------------
// Workflow options (legacy renderWorkflowOptions, app.js:1904-2055).
// view.saveState / view.saveError never enter the projection: the legacy
// surface renders no save indicator and those fields are high-frequency.
// ---------------------------------------------------------------------------

function projectWorkflowOptions(
  snapshot: DashboardPageSnapshot,
  labels: DashboardLabels,
): DashboardWorkflowOptionsSelection {
  const view = snapshot.workflowOptionsView;
  const descriptor = view?.selectedDescriptor;
  return {
    texts: {
      pageTitle: labelText(labels, "tabWorkflowOptions"),
      noConfigurableText: labelText(labels, "workflowSettingsNoConfigurable"),
      workflowLabelText: labelText(labels, "workflowSettingsWorkflowLabel"),
      providerLabelText: labelText(labels, "workflowSettingsProviderLabel"),
      profileLabelText: labelText(labels, "workflowSettingsProfileLabel"),
      blockedNoProfileText: labelText(
        labels,
        "workflowSettingsBlockedNoProfile",
      ),
      workflowParamsTitleText: labelText(
        labels,
        "workflowSettingsWorkflowParamsTitle",
      ),
      noWorkflowParamsText: labelText(
        labels,
        "workflowSettingsNoWorkflowParams",
      ),
      providerOptionsTitleText: labelText(
        labels,
        "workflowSettingsProviderOptionsTitle",
      ),
      noProviderOptionsText: labelText(
        labels,
        "workflowSettingsNoProviderOptions",
      ),
      parameterRequiredText: labelText(
        labels,
        "workflowSettingsParameterRequired",
        "This field is required.",
      ),
      numberInvalidText: labelText(labels, "workflowSettingsNumberInvalid"),
      positiveIntegerRequiredText: labelText(
        labels,
        "workflowSettingsPositiveIntegerRequired",
      ),
      noSelectableOptionsText: labelText(
        labels,
        "workflowSettingsNoSelectableOptions",
        "No selectable options are available.",
      ),
    },
    workflows: (Array.isArray(view?.workflows) ? view.workflows : []).map(
      (workflow) => ({
        workflowId: String(workflow.workflowId || ""),
        label: workflow.workflowLabel || workflow.workflowId,
        active: workflow.workflowId === view?.selectedWorkflowId,
      }),
    ),
    selectedWorkflowId: String(view?.selectedWorkflowId || ""),
    descriptor:
      descriptor && typeof descriptor === "object"
        ? (descriptor as WorkflowSettingsDescriptorView)
        : null,
  };
}

// ---------------------------------------------------------------------------
// Runtime logs (legacy renderRuntimeLogs, app.js:3575-4093)
// ---------------------------------------------------------------------------

const RUNTIME_LOG_CONTEXT_KEYS = [
  "workflowId",
  "requestId",
  "jobId",
  "backendId",
  "runId",
] as const;

function projectRuntimeLogs(
  snapshot: DashboardPageSnapshot,
  labels: DashboardLabels,
): DashboardRuntimeLogsSelection | null {
  const view = snapshot.runtimeLogsView;
  if (!view) return null;
  const filters = (view.filters || {}) as DashboardRuntimeLogsFilters;
  const budget = view.budget || ({} as NonNullable<typeof view.budget>);
  const backendOptions = Array.isArray(view.filterOptions?.backends)
    ? view.filterOptions.backends
    : [];
  const workflowOptions = Array.isArray(view.filterOptions?.workflows)
    ? view.filterOptions.workflows
    : [];
  const budgetValue = [
    `warn/error ${Number(budget.importantEntryCount || 0)}/${Number(
      budget.maxImportantEntries || 0,
    )}`,
    `total ${Number(view.totalEntries || 0)}/${Number(budget.maxEntries || 0)}`,
  ].join(" · ");
  return {
    pageTitle: labelText(labels, "runtimeLogsTabTitle"),
    levelOptions: [
      {
        value: "debug",
        title: labelText(labels, "runtimeLogsLevelDebug", "Debug"),
      },
      {
        value: "info",
        title: labelText(labels, "runtimeLogsLevelInfo", "Info"),
      },
      {
        value: "warn",
        title: labelText(labels, "runtimeLogsLevelWarn", "Warn"),
      },
      {
        value: "error",
        title: labelText(labels, "runtimeLogsLevelError", "Error"),
      },
    ],
    activeLevels: Array.isArray(filters.levels)
      ? filters.levels
      : ["info", "warn", "error"],
    filterBackendLabel: labelText(labels, "runtimeLogsFilterBackend"),
    filterWorkflowLabel: labelText(labels, "runtimeLogsFilterWorkflow"),
    filterAllLabel: labelText(labels, "runtimeLogsFilterAll"),
    backendOptions,
    selectedBackendIds:
      filters.backendId !== undefined && filters.backendId !== null
        ? Array.isArray(filters.backendId)
          ? filters.backendId
          : [filters.backendId]
        : backendOptions.map((option) => option.value),
    workflowOptions,
    selectedWorkflowIds:
      filters.workflowId !== undefined && filters.workflowId !== null
        ? Array.isArray(filters.workflowId)
          ? filters.workflowId
          : [filters.workflowId]
        : workflowOptions.map((option) => option.value),
    filters,
    diagnosticMode: view.diagnosticMode === true,
    diagnosticModeLabel: labelText(labels, "runtimeLogsDiagnosticMode"),
    contextScopeLabel: labelText(labels, "runtimeLogsContextScope"),
    contextChips: RUNTIME_LOG_CONTEXT_KEYS.filter(
      (key) => typeof filters[key] === "string" && filters[key],
    ).map((key) => ({ key, value: String(filters[key]) })),
    clearContextLabel: labelText(labels, "runtimeLogsClearContext"),
    budgetText: labelText(
      labels,
      "runtimeLogsBudget",
      "Budget: { $value }",
    ).replace("{ $value }", budgetValue),
    copySelectedLabel: labelText(labels, "runtimeLogsCopySelected"),
    copyVisibleNdjsonLabel: labelText(labels, "runtimeLogsCopyVisibleNDJSON"),
    copyDiagnosticBundleLabel: labelText(
      labels,
      "runtimeLogsCopyDiagnosticBundle",
    ),
    copyIssueSummaryLabel: labelText(labels, "runtimeLogsCopyIssueSummary"),
    clearLabel: labelText(labels, "runtimeLogsClear"),
    clearConfirmText: labelText(
      labels,
      "runtimeLogsClearConfirm",
      "Are you sure you want to clear all runtime logs?",
    ),
    copySuccessTemplate: labelText(
      labels,
      "runtimeLogsCopySuccess",
      "Copied { $count } entries!",
    ),
    copySuccessBundleText: labelText(labels, "runtimeLogsCopySuccessBundle"),
    copySuccessIssueText: labelText(labels, "runtimeLogsCopySuccessIssue"),
    selectedEntryIds: Array.isArray(view.selectedEntryIds)
      ? view.selectedEntryIds
      : [],
    columns: [
      labelText(labels, "colTime"),
      labelText(labels, "colLevel"),
      labelText(labels, "colStage"),
      labelText(labels, "colScope"),
      labelText(labels, "colMessage"),
    ],
    emptyText: labelText(labels, "logsEmpty"),
    selectToViewText: labelText(labels, "runtimeLogsSelectToView"),
    detailTitle: labelText(labels, "logsDetailTitle"),
    copyDetailLabel: labelText(labels, "runtimeLogsCopyDetail"),
    detailCloseLabel: labelText(labels, "logsDetailClose"),
    exceptionTitle: labelText(labels, "logsException"),
    rows: (Array.isArray(view.logs) ? view.logs : []).map((row) => {
      const detailPayload = row.detailPayload;
      const errorBag =
        detailPayload && typeof detailPayload === "object"
          ? (
              detailPayload as {
                error?: { message?: unknown; stack?: unknown };
              }
            ).error
          : undefined;
      return {
        id: String(row.id || ""),
        ts: String(row.ts || ""),
        level: String(row.level || ""),
        stage: String(row.stage || ""),
        scope: String(row.scope || ""),
        message: String(row.message || ""),
        detailPayloadJson: stringifyRuntimeLogDetailPayload(detailPayload),
        errorMessage: String(errorBag?.message || "").trim(),
        errorStack: String(errorBag?.stack || ""),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Synthesis sidecar (legacy renderSynthesisSidecar, app.js:4099-4340). The
// page resolves display copy through the host-provided Dashboard labels.
// ---------------------------------------------------------------------------

let projectSynthesisSidecarSelection: (
  snapshot: DashboardPageSnapshot,
  ui: DashboardUiState,
  labels: DashboardLabels,
) => DashboardSynthesisSidecarSelection;
// Keep the complete diagnostic projection inside the compile-time gate: a
// release build folds this whole statement branch away, strings included,
// which unused function declarations would not guarantee.
// prettier-ignore
if (
  (typeof __debug_mode__ === "undefined" || __debug_mode__ === true) &&
  (typeof __synthesis_sidecar_diagnostics_enabled__ === "undefined" ||
    __synthesis_sidecar_diagnostics_enabled__ === true)
) {
  projectSynthesisSidecarSelection = (
  snapshot: DashboardPageSnapshot,
  ui: DashboardUiState,
  labels: DashboardLabels,
): DashboardSynthesisSidecarSelection => {
  const view = snapshot.synthesisSidecarView;
  const traceSnapshot = narrowSynthesisSidecarTraceSnapshot(view?.traceSnapshot);
  const empty: DashboardSynthesisSidecarSelection = {
    kind: "empty",
    pageTitle: labelText(
      labels,
      "synthesisSidecarTabTitle",
      "Synthesis Sidecar",
    ),
    emptyText: labelText(
      labels,
      "synthesisSidecarEmpty",
      "No sidecar traces in this debug session.",
    ),
    summaryCards: [],
    filterLabel: labelText(
      labels,
      "synthesisSidecarFilterLabel",
      "Trace / operation / capability",
    ),
    filterPlaceholder: labelText(
      labels,
      "synthesisSidecarFilterPlaceholder",
      "Filter traces",
    ),
    filterValue: String(ui.synthesisSidecar.traceFilter || ""),
    columns: [
      labelText(labels, "synthesisSidecarColOutcome", "Outcome"),
      labelText(labels, "synthesisSidecarColTrace", "Trace"),
      labelText(labels, "synthesisSidecarColOperation", "Operation"),
      labelText(labels, "synthesisSidecarColStarted", "Started"),
      labelText(labels, "synthesisSidecarColSpans", "Spans"),
      labelText(labels, "synthesisSidecarColDropped", "Dropped"),
    ],
    rows: [],
    detailTitle: labelText(labels, "synthesisSidecarDetailTitle", "Causal trace"),
    detailEmptySubtitle: labelText(
      labels,
      "synthesisSidecarDetailEmpty",
      "No trace selected",
    ),
    copyLabel: labelText(labels, "synthesisSidecarCopy", "Copy trace"),
    copiedLabel: labelText(labels, "productsViewerCopied", "Copied"),
    copyFailedLabel: labelText(labels, "productsViewerCopyFailed", "Copy failed"),
    copyToastMessage: labelText(
      labels,
      "synthesisSidecarCopyToast",
      "Trace copied",
    ),
    detail: null,
  };
  if (!traceSnapshot || traceSnapshot.traces.length === 0) {
    return empty;
  }
  const traces = traceSnapshot.traces;
  const ranked = rankSynthesisSidecarTraces(
    traces,
    ui.synthesisSidecar.traceFilter,
  );
  const { visible, selected } = resolveSynthesisSidecarVisibleTraces({
    traces,
    ranked,
    selectedTraceId: ui.synthesisSidecar.selectedTraceId,
  });
  const selectedRaw = selected
    ? findSynthesisSidecarRawTrace(view, selected.traceId)
    : null;
  const spanDepths = selected
    ? synthesisSidecarEventDepths(selected.events)
    : [];
  return {
    ...empty,
    kind: "traces",
    summaryCards: [
      {
        label: labelText(labels, "synthesisSidecarSummaryTraces", "Traces"),
        value: String(traces.length),
      },
      {
        label: labelText(labels, "synthesisSidecarSummaryEvents", "Events"),
        value: String(Number(traceSnapshot.eventCount || 0)),
      },
      {
        label: labelText(labels, "synthesisSidecarSummaryActive", "Active"),
        value: String(traces.filter((trace) => trace.active === true).length),
      },
      {
        label: labelText(labels, "synthesisSidecarSummaryDropped", "Dropped"),
        value: String(
          traces.reduce((sum, trace) => sum + Number(trace.droppedCount || 0), 0),
        ),
      },
    ],
    rows: visible.map((trace) => {
      const outcome = synthesisSidecarTraceOutcome(trace);
      const operation = synthesisSidecarTraceRootOperation(trace);
      return {
        traceId: trace.traceId,
        outcome,
        outcomeBadgeClass: dashboardStatusBadgeClass(outcome),
        shortTraceId: trace.traceId.slice(0, 12),
        operation,
        startedText: formatTime(new Date(trace.startedAtMs).toISOString()),
        spanCountText: String(trace.events.length),
        droppedText: String(trace.droppedCount || 0),
        selected: !!selected && selected.traceId === trace.traceId,
        signature: synthesisSidecarTraceRowSignature(trace, outcome, operation),
      };
    }),
    detail: selected
      ? {
          traceId: selected.traceId,
          signature: synthesisSidecarTraceDetailSignature(selected),
          subtitle: `${selected.traceId} · ${selected.events.length} spans · ${
            selected.droppedCount || 0
          } dropped`,
          copyJson: selectedRaw ? JSON.stringify(selectedRaw, null, 2) : "",
          spanRows: selected.events.map((event, index) => ({
            spanId: event.spanId,
            phasePaddingLeft: `${8 + (spanDepths[index] || 0) * 14}px`,
            phase: event.phase || "-",
            boundary: event.boundary || "-",
            attemptText: String(event.attempt || 0),
            outcome: event.outcome,
            outcomeBadgeClass: dashboardStatusBadgeClass(event.outcome),
            code: event.code || "-",
            factsText: event.factsJson || "-",
          })),
        }
      : null,
  };
};
}

// ---------------------------------------------------------------------------
// SkillRunner connection audit (legacy renderSkillRunnerConnectionAudit,
// app.js:2763-2967). generatedAt stays out of the selection.
// ---------------------------------------------------------------------------

function auditCountRows(
  rows: unknown,
  keyName: "backendId" | "lane",
): DashboardSkillrunnerAuditBarRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const record =
        row && typeof row === "object"
          ? (row as SkillrunnerAuditWireCountRow)
          : {};
      return {
        key: String(record[keyName] || "").trim() || "-",
        count: Number(record.count || 0),
      };
    })
    .filter((row) => row.count > 0);
}

function projectSkillrunnerAudit(
  snapshot: DashboardPageSnapshot,
  labels: DashboardLabels,
): DashboardSkillrunnerAuditSelection {
  const view = snapshot.skillRunnerConnectionAuditView as
    | SkillrunnerAuditConnectionView
    | undefined;
  const governor = view?.governor || null;
  const emptyText = labelText(labels, "skillRunnerConnectionAuditEmpty");
  const base: DashboardSkillrunnerAuditSelection = {
    available: false,
    emptyText,
    pageTitle: labelText(labels, "skillRunnerConnectionAuditTitle"),
    copyLabel: labelText(labels, "skillRunnerConnectionAuditCopyJson"),
    metrics: [],
    bars: [],
    eventsTitle: labelText(labels, "skillRunnerConnectionAuditEvents"),
    eventsEmptyText: emptyText,
    eventsColumns: [
      labelText(labels, "colTime", "Time"),
      labelText(labels, "skillRunnerConnectionAuditColEvent", "Event"),
      labelText(labels, "colBackend", "Backend"),
      labelText(labels, "skillRunnerConnectionAuditColLane", "Lane"),
      labelText(labels, "colRequestId", "Request ID"),
      labelText(labels, "skillRunnerConnectionAuditColOperation", "Operation"),
      labelText(labels, "skillRunnerConnectionAuditColDuration", "Duration"),
      labelText(labels, "skillRunnerConnectionAuditColReason", "Reason"),
    ],
    eventsRows: [],
  };
  if (!view || !governor) return base;
  const summary = governor.summary || {};
  const events = Array.isArray(governor.events)
    ? (governor.events as SkillrunnerAuditWireEvent[])
    : [];
  const active = Array.isArray(governor.active) ? governor.active : [];
  const queued = Array.isArray(governor.queued) ? governor.queued : [];
  const metricValue = (value: unknown, fallback: number) =>
    String(value || fallback);
  return {
    ...base,
    available: true,
    metrics: [
      {
        label: labelText(labels, "skillRunnerConnectionAuditMetricActive"),
        value: metricValue(summary.activeTotal, active.length),
      },
      {
        label: labelText(labels, "skillRunnerConnectionAuditMetricQueued"),
        value: metricValue(summary.queuedTotal, queued.length),
      },
      {
        label: labelText(labels, "skillRunnerConnectionAuditMetricStreams"),
        value: String(summary.streamTotal || 0),
      },
      {
        label: labelText(labels, "skillRunnerConnectionAuditMetricTimeouts"),
        value: String(summary.timeoutCount || 0),
      },
      {
        label: labelText(labels, "skillRunnerConnectionAuditMetricLate"),
        value: String(summary.lateSettlementCount || 0),
      },
      {
        label: labelText(
          labels,
          "skillRunnerConnectionAuditMetricPhysicalDebt",
          "Physical debt",
        ),
        value: String(summary.physicalDebtTotal || 0),
      },
      {
        label: labelText(
          labels,
          "skillRunnerConnectionAuditMetricDegradedBackends",
          "Degraded backends",
        ),
        value: String(summary.degradedBackendCount || 0),
      },
      {
        label: labelText(
          labels,
          "skillRunnerConnectionAuditMetricSkippedLowPriority",
          "Skipped low-priority",
        ),
        value: String(
          (Number(summary.skippedReachabilityCount) || 0) +
            (Number(summary.skippedBackgroundCount) || 0) +
            (Number(summary.skippedHistoryCount) || 0),
        ),
      },
    ],
    bars: [
      {
        title: labelText(labels, "skillRunnerConnectionAuditByBackend"),
        rows: auditCountRows(summary.activeByBackend, "backendId").concat(
          auditCountRows(summary.queuedByBackend, "backendId").map((row) => ({
            key: `${row.key} queued`,
            count: row.count,
          })),
        ),
      },
      {
        title: labelText(labels, "skillRunnerConnectionAuditByLane"),
        rows: auditCountRows(summary.activeByLane, "lane").concat(
          auditCountRows(summary.queuedByLane, "lane").map((row) => ({
            key: `${row.key} queued`,
            count: row.count,
          })),
        ),
      },
      {
        title: labelText(
          labels,
          "skillRunnerConnectionAuditByPhysicalDebt",
          "Physical debt",
        ),
        rows: auditCountRows(summary.physicalDebtByBackend, "backendId"),
      },
    ],
    eventsRows: events
      .slice()
      .reverse()
      .map((event) => {
        const ts = Number(event.ts);
        const type = String(event.type || "");
        const durationMs = Number(event.durationMs);
        return {
          id: String(event.id || ""),
          timestampText:
            Number.isFinite(ts) && ts > 0
              ? formatRuntimeLogTimestamp(new Date(ts).toISOString())
              : formatTime(event.ts),
          typeText: type,
          typeClass: dashboardStatusBadgeClass(type),
          backendId: String(event.backendId || ""),
          lane: String(event.lane || ""),
          requestId: String(event.requestId || ""),
          operation: String(event.operation || ""),
          durationText:
            typeof event.durationMs === "number" && Number.isFinite(durationMs)
              ? `${durationMs} ms`
              : "-",
          reason: String(event.reason || event.errorName || ""),
        };
      }),
  };
}

// ---------------------------------------------------------------------------
// Backend tabs (legacy renderGenericBackend / renderSkillRunnerBackend /
// renderAcpSkillRunnerBackend, app.js:1083-1608)
// ---------------------------------------------------------------------------

function projectBackend(
  snapshot: DashboardPageSnapshot,
  labels: DashboardLabels,
): DashboardBackendSelection {
  const backend = snapshot.backendView;
  const base: DashboardBackendSelection = {
    present: false,
    emptyText: labelText(labels, "noHistory"),
    kind: "generic",
    backendId: "",
    backendType: "",
    title: "",
    subview: "runs",
    managementUiUrl: "",
    scrollKey: snapshot.selectedTabKey,
    labels: {
      openDiagnostics: labelText(labels, "logsOpenDiagnostics"),
      viewTask: labelText(labels, "logsViewTask"),
      openRun: labelText(labels, "openRun"),
      cancelRun: labelText(labels, "cancelRun"),
      cancelQueued: labelText(
        labels,
        "cancelQueuedWorkflowUnit",
        "Cancel queued workflow unit",
      ),
      closeManagement: labelText(labels, "closeManagement"),
      openManagementExternal: labelText(labels, "openManagementExternal"),
      refreshModelCache: labelText(labels, "refreshModelCache"),
      openManagement: labelText(labels, "openManagement"),
      managementLoadFailed: labelText(labels, "managementLoadFailed"),
      managementLoading: labelText(labels, "managementLoading"),
    },
    selectedLogTaskId: "",
    taskTable: {
      panelClassName: "",
      columns: [],
      emptyText: "",
      selectedId: "",
      rows: [],
    },
    logs: null,
  };
  if (!backend) return base;
  const kind: DashboardBackendKind =
    backend.backendType === "skillrunner"
      ? "skillrunner"
      : backend.backendType === "acp"
        ? "acp"
        : "generic";
  const emptyRowsText =
    String(backend.emptyRowsText || "").trim() ||
    labelText(labels, "backendNoTasks") ||
    labelText(labels, "noHistory");
  const taskRows = (Array.isArray(backend.rows) ? backend.rows : []).map(
    (row) => ({
      id: String(row.id || ""),
      taskName: String(row.taskName || ""),
      workflowLabel: String(row.workflowLabel || ""),
      engine: String(row.engine || ""),
      statusText: String(row.stateLabel || ""),
      statusClass: dashboardStatusBadgeClass(row.state),
      requestId: String(row.requestId || ""),
      runKey: String(row.runKey || ""),
      queueId: String(row.queueId || ""),
      requestKind: String(row.requestKind || ""),
      terminal: isDashboardTaskTerminal(row.state, row.stateSemantics),
      updatedAtText: formatTime(row.updatedAt),
    }),
  );
  return {
    ...base,
    present: true,
    kind,
    backendId: String(backend.backendId || ""),
    backendType: String(backend.backendType || ""),
    title: String(backend.title || ""),
    subview: backend.selectedSubview === "management" ? "management" : "runs",
    managementUiUrl: String(backend.managementUiUrl || ""),
    selectedLogTaskId: String(backend.selectedLogTaskId || ""),
    taskTable: {
      panelClassName: kind === "generic" ? "" : "skillrunner-task-panel",
      columns:
        kind === "generic"
          ? [
              labelText(labels, "colTask"),
              labelText(labels, "colWorkflow"),
              labelText(labels, "colStatus"),
              labelText(labels, "colRequestId"),
              labelText(labels, "colUpdatedAt"),
              labelText(labels, "colActions"),
            ]
          : [
              labelText(labels, "colTask"),
              labelText(labels, "colWorkflow"),
              labelText(labels, "colEngine"),
              labelText(labels, "colStatus"),
              labelText(labels, "colRequestId"),
              labelText(labels, "colUpdatedAt"),
              labelText(labels, "colActions"),
            ],
      emptyText: emptyRowsText,
      selectedId: String(backend.selectedLogTaskId || ""),
      rows: taskRows,
    },
    logs:
      kind === "generic"
        ? {
            title: labelText(labels, "logsTitle"),
            boundTaskText: `${labelText(labels, "logsBoundTask")}: ${
              backend.selectedLogTaskId || "-"
            }`,
            boundRequestIdText: `${labelText(labels, "logsBoundRequestId")}: ${
              backend.selectedLogTaskRequestId || "-"
            }`,
            boundJobIdText: `${labelText(labels, "logsBoundJobId")}: ${
              backend.selectedLogTaskJobId || "-"
            }`,
            emptyText: labelText(labels, "logsEmpty"),
            columns: [
              labelText(labels, "colTime"),
              labelText(labels, "colLevel"),
              labelText(labels, "colStage"),
              labelText(labels, "colScope"),
              labelText(labels, "colMessage"),
              labelText(labels, "colRequestId"),
              labelText(labels, "colJobId"),
            ],
            rows: (Array.isArray(backend.logRows) ? backend.logRows : []).map(
              (row) => ({
                id: String(row.id || ""),
                timeText: formatTime(row.ts),
                levelText: String(row.level || "").toUpperCase(),
                levelBadgeClass: dashboardLogLevelBadgeClass(row.level),
                stage: String(row.stage || ""),
                scope: String(row.scope || ""),
                message: String(row.message || ""),
                requestId: String(row.requestId || ""),
                jobId: String(row.jobId || ""),
              }),
            ),
            selectedLogEntryId: String(backend.selectedLogEntryId || ""),
            detailTitle: labelText(labels, "logsDetailTitle"),
            detailText: backend.selectedLogEntryPayload
              ? JSON.stringify(backend.selectedLogEntryPayload, null, 2)
              : labelText(labels, "logsEmpty"),
          }
        : null,
  };
}

function projectViews(
  snapshot: DashboardPageSnapshot,
  ui: DashboardUiState,
  selectedTabKey: string,
): DashboardPanelViews {
  const labels: DashboardLabels = snapshot.labels || {};
  return {
    products:
      selectedTabKey === "products"
        ? projectProductsSelection(snapshot, labels)
        : null,
    workflowOptions:
      selectedTabKey === "workflow-options"
        ? projectWorkflowOptions(snapshot, labels)
        : null,
    runtimeLogs:
      selectedTabKey === "runtime-logs"
        ? projectRuntimeLogs(snapshot, labels)
        : null,
    synthesisSidecar:
      (typeof __debug_mode__ === "undefined" || __debug_mode__ === true) &&
      (typeof __synthesis_sidecar_diagnostics_enabled__ === "undefined" ||
        __synthesis_sidecar_diagnostics_enabled__ === true) &&
      selectedTabKey === "synthesis-sidecar"
        ? projectSynthesisSidecarSelection(snapshot, ui, labels)
        : null,
    skillrunnerConnectionAudit:
      selectedTabKey === "skillrunner-connection-audit"
        ? projectSkillrunnerAudit(snapshot, labels)
        : null,
    acpTraceReplay:
      selectedTabKey === "acp-trace-replay"
        ? projectDashboardAcpTraceReplaySelection(
            snapshot.acpTraceRecorderView,
            snapshot.acpReplayProfilerView,
            (key, fallback) => labelText(labels, key, fallback),
          )
        : null,
    backend: selectedTabKey.startsWith("backend:")
      ? projectBackend(snapshot, labels)
      : null,
  };
}

export function projectDashboardPanel(
  snapshot: DashboardPageSnapshot,
  ui: DashboardUiState,
): DashboardPanel {
  const labels: DashboardLabels = snapshot.labels || {};
  const selectedTabKey =
    String(ui.selectedTabKey || "").trim() ||
    String(snapshot.selectedTabKey || "home").trim() ||
    "home";
  const auditView =
    selectedTabKey === "skillrunner-connection-audit"
      ? snapshot.skillRunnerConnectionAuditView
      : undefined;
  return {
    title: snapshot.title || labelText(labels, "tabHome"),
    labels,
    selectedTabKey,
    backendLoadError: String(snapshot.backendLoadError || ""),
    tabbar: projectTabBar(snapshot, labels, selectedTabKey),
    home: selectedTabKey === "home" ? projectHome(snapshot, labels) : null,
    views: projectViews(snapshot, ui, selectedTabKey),
    auditCopy:
      auditView && auditView.governor
        ? {
            json: JSON.stringify(auditView, null, 2),
            toastMessage: labelText(labels, "skillRunnerConnectionAuditCopied"),
          }
        : null,
  };
}

// Region equality selectors: each returns its region's selection (the
// component memo boundaries compare them with equalBySignature).

export function dashboardTabBarEqualityInput(
  panel: DashboardPanel,
): DashboardTabBarSelection {
  return panel.tabbar;
}

export function dashboardHomeEqualityInput(
  panel: DashboardPanel,
): DashboardHomeSelection | null {
  return panel.home;
}

export function dashboardProductsEqualityInput(
  panel: DashboardPanel,
): DashboardProductsSelection | null {
  return panel.views.products;
}

export function dashboardWorkflowOptionsEqualityInputForPanel(
  panel: DashboardPanel,
): DashboardWorkflowOptionsSelection | null {
  return dashboardWorkflowOptionsEqualityInput(panel.views.workflowOptions);
}

export function dashboardRuntimeLogsEqualityInput(
  panel: DashboardPanel,
): DashboardRuntimeLogsSelection | null {
  return panel.views.runtimeLogs;
}

export function dashboardSynthesisSidecarEqualityInput(
  panel: DashboardPanel,
): DashboardSynthesisSidecarSelection | null {
  return panel.views.synthesisSidecar;
}

export function dashboardSkillrunnerAuditEqualityInput(
  panel: DashboardPanel,
): DashboardSkillrunnerAuditSelection | null {
  return panel.views.skillrunnerConnectionAudit;
}

export function dashboardAcpTraceReplayEqualityInput(
  panel: DashboardPanel,
): DashboardAcpTraceReplaySelection | null {
  return panel.views.acpTraceReplay;
}

export function dashboardBackendEqualityInput(
  panel: DashboardPanel,
): DashboardBackendSelection | null {
  return panel.views.backend;
}

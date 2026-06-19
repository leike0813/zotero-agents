import { readFile } from "node:fs/promises";
import path from "node:path";

import type { BackendInstance } from "../../backends/types";
import {
  ACP_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
} from "../../config/defaults";
import { loadWorkflowManifests } from "../../workflows/loader";
import type { LoadedWorkflow } from "../../workflows/types";
import {
  compareWorkflowDisplayOrder,
  isCoreWorkflow,
  localizeWorkflowLabel,
} from "../../workflows/localization";
import { canWorkflowRunWithoutSelection } from "../../workflows/triggerPolicy";
import {
  createPluginStateReadonlyStore,
  cleanHarnessString,
  parseHarnessJsonObject,
  type PluginStateReadonlyRow,
  type PluginStateReadonlyStore,
} from "./pluginStateReadonly";
import { isWorkflowVisible } from "../workflowVisibility";
import { buildWorkflowSettingsUiDescriptor } from "../workflowSettings";
import { loadBackendsRegistryReadonly } from "./backendsReadonly";

export type DashboardReadonlyState = {
  selectedTabKey: string;
  actionLog: HarnessActionLogEntry[];
  selectedWorkflowOptionsWorkflowId: string;
  homeWorkflowDocWorkflowId: string;
  selectedProductId: string;
  selectedProductAssetId: string;
  selectedProductSection: "products" | "feedback";
  selectedFeedbackProductId: string;
  feedbackSkillFilter: string;
  selectedFeedbackProductIds: Set<string>;
  runtimeLogFilters: Record<string, unknown>;
  runtimeLogSelectedIdSet: Set<string>;
};

export type HarnessActionLogEntry = {
  id: string;
  ts: string;
  source: string;
  action: string;
  payload?: Record<string, unknown>;
  readonlyReason?: string;
  message: string;
};

const TERMINAL_STATES = new Set([
  "succeeded",
  "failed",
  "canceled",
  "cancelled",
  "completed",
  "done",
]);
const SKILL_RUN_FEEDBACK_KIND = "skill_run_feedback";
const SKILL_RUN_FEEDBACK_ASSET_ID = "feedback";

function nowIso() {
  return new Date().toISOString();
}

function normalizeDashboardSignatureValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeDashboardSignatureValue(entry));
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const entry = source[key];
      if (typeof entry !== "undefined") {
        normalized[key] = normalizeDashboardSignatureValue(entry);
      }
    }
    return normalized;
  }
  return value;
}

function dashboardSignature(value: unknown) {
  return JSON.stringify(normalizeDashboardSignatureValue(value));
}

function dashboardSelectedSurfaceKey(snapshot: Record<string, unknown>) {
  const tabKey = cleanString(snapshot.selectedTabKey) || "home";
  return tabKey.startsWith("backend:") ? "backend" : tabKey;
}

function dashboardSurfaceSignatures(snapshot: Record<string, unknown>) {
  const selectedSurfaceKey = dashboardSelectedSurfaceKey(snapshot);
  const selectedSurface =
    selectedSurfaceKey === "products"
      ? { selectedSurfaceKey, productStorageView: snapshot.productStorageView }
      : selectedSurfaceKey === "workflow-options"
        ? {
            selectedSurfaceKey,
            workflowOptionsView: snapshot.workflowOptionsView,
          }
        : selectedSurfaceKey === "runtime-logs"
          ? { selectedSurfaceKey, runtimeLogsView: snapshot.runtimeLogsView }
          : selectedSurfaceKey === "backend"
            ? { selectedSurfaceKey, backendView: snapshot.backendView }
            : {
                selectedSurfaceKey,
                summary: snapshot.summary,
                runningRows: snapshot.runningRows,
                homeWorkflows: snapshot.homeWorkflows,
                homeWorkflowDocView: snapshot.homeWorkflowDocView,
              };
  return {
    chrome: dashboardSignature({
      selectedTabKey: snapshot.selectedTabKey,
      title: snapshot.title,
      labels: snapshot.labels,
      tabs: snapshot.tabs,
      backendLoadError: snapshot.backendLoadError,
    }),
    selectedSurface: dashboardSignature(selectedSurface),
    selectedSurfaceKey,
  };
}

function cleanString(value: unknown) {
  return cleanHarnessString(value);
}

function stateSemantics(state: string) {
  const normalized = cleanString(state).toLowerCase().replace(/-/g, "_");
  return {
    normalized,
    terminal: TERMINAL_STATES.has(normalized),
    waiting:
      normalized === "waiting_user" ||
      normalized === "waiting_auth" ||
      normalized === "permission_required" ||
      normalized === "auth_required",
  };
}

function stateLabel(value: string) {
  const normalized = cleanString(value);
  if (!normalized) return "Unknown";
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function backendDisplayName(backend?: BackendInstance) {
  if (!backend) return "";
  return cleanString(backend.displayName) || cleanString(backend.id);
}

function parsePayload(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return parseHarnessJsonObject(value);
}

function rowPayload(row: PluginStateReadonlyRow) {
  return parsePayload(row.payload || row.payload_json);
}

function resolveWorkflowLabel(row: PluginStateReadonlyRow) {
  const payload = rowPayload(row);
  return (
    cleanString(row.workflowLabel) ||
    cleanString(payload.workflowLabel) ||
    cleanString(payload.workflow?.label) ||
    cleanString(row.workflowId) ||
    cleanString(payload.workflowId)
  );
}

function resolveTaskName(row: PluginStateReadonlyRow) {
  const payload = rowPayload(row);
  return (
    cleanString(row.taskName) ||
    cleanString(payload.taskName) ||
    cleanString(payload.title) ||
    cleanString(payload.skillId) ||
    cleanString(row.taskId) ||
    cleanString(row.requestId)
  );
}

function resolveSkillName(row: PluginStateReadonlyRow) {
  const payload = rowPayload(row);
  return (
    cleanString((row as { skillName?: unknown }).skillName) ||
    cleanString(payload.skillName) ||
    cleanString(payload.skill_name)
  );
}

function resolveSkillLabel(row: PluginStateReadonlyRow) {
  const payload = rowPayload(row);
  return (
    cleanString((row as { skillLabel?: unknown }).skillLabel) ||
    cleanString(payload.skillLabel) ||
    cleanString(payload.skill_label)
  );
}

function resolveSkillId(row: PluginStateReadonlyRow) {
  const payload = rowPayload(row);
  return (
    cleanString((row as { skillId?: unknown }).skillId) ||
    cleanString(payload.skillId) ||
    cleanString(payload.skill_id)
  );
}

function normalizeDashboardRow(
  row: PluginStateReadonlyRow,
  backendById: Map<string, BackendInstance>,
) {
  const payload = rowPayload(row);
  const backendId =
    cleanString(row.backendId) || cleanString(payload.backendId);
  const backend = backendById.get(backendId);
  const backendType =
    cleanString(payload.backendType) ||
    cleanString(row.backendType) ||
    cleanString(backend?.type) ||
    (row.domain === "acp" ? ACP_BACKEND_TYPE : cleanString(row.domain));
  const state = cleanString(row.state || payload.status) || "unknown";
  const requestKind =
    cleanString(payload.requestKind) ||
    cleanString(payload.request?.kind) ||
    cleanString(payload.kind);
  const id =
    cleanString(row.taskId) ||
    cleanString(payload.taskId) ||
    cleanString(row.requestId);
  return {
    id,
    taskId: id,
    workflowId:
      cleanString(payload.workflowId) ||
      cleanString(payload.workflow_id) ||
      cleanString(row.workflowId),
    workflowLabel: resolveWorkflowLabel(row) || "Unknown workflow",
    workflowName: resolveWorkflowLabel(row) || "Unknown workflow",
    skillName: resolveSkillName(row),
    skillLabel: resolveSkillLabel(row),
    skillId: resolveSkillId(row),
    backendId,
    backendType,
    backendLabel: backendDisplayName(backend) || backendId,
    taskName: resolveTaskName(row) || id,
    title: resolveTaskName(row) || id,
    state,
    status: state,
    stateSemantics: stateSemantics(state),
    stateLabel: stateLabel(state),
    statusLabel: stateLabel(state),
    requestId: cleanString(row.requestId || payload.requestId),
    requestKind,
    engine:
      cleanString(payload.engine) ||
      cleanString(payload.model) ||
      cleanString(payload.providerId),
    jobId: cleanString(payload.jobId || payload.job_id),
    runId: cleanString(payload.runId || payload.run_id),
    createdAt: cleanString(payload.createdAt || payload.created_at),
    updatedAt: cleanString(row.updatedAt || payload.updatedAt),
    canCancel: false,
    canOpen: Boolean(cleanString(row.requestId || payload.requestId)),
    raw: payload,
  };
}

const DASHBOARD_LABELS = {
  home: "Dashboard Home",
  tabHome: "Dashboard Home",
  tabWorkflowOptions: "Workflow Options",
  tabProducts: "Products",
  tabBackends: "Backends",
  loadingDashboard: "Loading dashboard...",
  runningTitle: "Active Tasks",
  homeSummaryTitle: "Task Summary",
  summaryTotal: "Total",
  summaryRunning: "Running",
  summarySucceeded: "Succeeded",
  summaryFailed: "Failed",
  summaryCanceled: "Canceled",
  colTask: "Task",
  colWorkflow: "Workflow",
  colBackend: "Backend",
  colStatus: "Status",
  colRequestId: "Request ID",
  colJobId: "Job ID",
  colEngine: "Engine",
  colTime: "Time",
  colLevel: "Level",
  colStage: "Stage",
  colScope: "Scope",
  colMessage: "Message",
  colUpdatedAt: "Updated At",
  colActions: "Actions",
  noBackends: "No backend profiles.",
  noRunning: "No active tasks.",
  noHistory: "Select one backend from sidebar.",
  backendNoTasks: "No tasks for this backend.",
  openManagement: "Open Backend UI",
  closeManagement: "Back to Runs",
  openManagementExternal: "Open in Browser",
  managementLoadFailed: "Management UI failed to load.",
  managementLoading: "Loading management UI...",
  refreshModelCache: "Refresh Model Cache",
  openRun: "Open Run",
  cancelRun: "Cancel Task",
  logsTitle: "Runtime Logs",
  logsEmpty: "No runtime logs captured.",
  logsBoundTask: "Bound Task",
  logsBoundRequestId: "Bound Request ID",
  logsBoundJobId: "Bound Job ID",
  logsDetailTitle: "Log Details",
  logsDetailClose: "Close",
  logsException: "Exception",
  logsViewTask: "Bind Logs",
  logsOpenDiagnostics: "Diagnostic Export",
  runtimeLogsTabTitle: "Runtime Logs",
  runtimeLogsClear: "Clear Logs",
  runtimeLogsCopySelected: "Copy Selected",
  runtimeLogsCopyDetail: "Copy Log",
  runtimeLogsCopyVisibleNDJSON: "Copy Visible (NDJSON)",
  runtimeLogsCopyIssueSummary: "Copy Issue Summary",
  runtimeLogsCopyDiagnosticBundle: "Copy Diagnostic Bundle",
  runtimeLogsDiagnosticMode: "Diagnostic Mode",
  runtimeLogsClearContext: "Clear Context",
  runtimeLogsSelectToView: "Select an entry to view details.",
  runtimeLogsFilterBackend: "Backend",
  runtimeLogsFilterWorkflow: "Workflow",
  runtimeLogsFilterAll: "All",
  runtimeLogsContextScope: "Active Context Filters: ",
  runtimeLogsCopySuccess: "Copied { $count } log entries to clipboard!",
  runtimeLogsCopySuccessBundle: "Diagnostic bundle copied to clipboard!",
  runtimeLogsCopySuccessIssue: "Issue summary copied to clipboard!",
  workflowSettingsNoConfigurable: "No configurable workflows.",
  workflowSettingsWorkflowLabel: "Workflow",
  workflowSettingsProviderLabel: "Provider",
  workflowSettingsProfileLabel: "Profile",
  workflowSettingsWorkflowParamsTitle: "Workflow Parameters",
  workflowSettingsProviderOptionsTitle: "Provider Runtime Options",
  workflowSettingsNoWorkflowParams:
    "This workflow has no configurable parameters.",
  workflowSettingsNoProviderOptions:
    "This provider has no configurable runtime options.",
  workflowSettingsBlockedNoProfile:
    "No backend profile available. Please configure one first.",
  workflowSettingsNumberInvalid: "Please enter a valid number.",
  workflowSettingsPositiveIntegerRequired: "Please enter a positive integer.",
  workflowSettingsSaving: "Saving...",
  workflowSettingsSaved: "Saved",
  workflowSettingsSaveError: "Save failed",
  productsEmpty: "No workflow products have been registered yet.",
  productsNoFiles: "No product files.",
  productsRawMarkdown: "Raw Markdown",
  productsSelectFile: "Select a file to preview.",
  productsOpenWorkspace: "Open Folder",
  productsOpenRun: "Open Run",
  productsRemove: "Remove From Products",
  productsPreviewUnavailable: "Select a file to preview.",
  productsListTitle: "Products",
  productsListCollapse: "Collapse product list",
  productsListExpand: "Expand product list",
  productsListRail: "Products",
  productsSectionFiles: "Products",
  productsSectionFeedback: "Skill Feedback",
  productsViewerWrap: "Wrap",
  productsViewerCopy: "Copy",
  productsViewerCopied: "Copied",
  productsViewerCopyFailed: "Copy failed",
  feedbackEmpty: "No skill feedback has been collected yet.",
  feedbackFilterSkill: "Skill",
  feedbackFilterAllSkills: "All skills",
  feedbackSelectAll: "Select all",
  feedbackExportSelected: "Export Selected",
  feedbackDeleteSelected: "Delete Selected",
  feedbackDeleteAll: "Delete All",
  feedbackExportEmpty: "Select at least one feedback record to export.",
  feedbackExportSuccess: "Skill feedback export file created.",
  homeWorkflowTitle: "Workflows",
  homeWorkflowDocButton: "Description",
  homeWorkflowRunButton: "Run workflow",
  homeWorkflowSettingsButton: "Settings",
  homeWorkflowBuiltinBadge: "Builtin",
  homeWorkflowCoreBadge: "Core",
  homeWorkflowDocMissingReadme: "README.md was not found for this workflow.",
  homeWorkflowDocBack: "Back to Dashboard",
  homeWorkflowRunDisabledSelection: "Requires a Zotero selection",
  backendUnavailable: "Backend {backend} is temporarily unreachable.",
  backendUnavailableTag: "Unavailable",
};

type LoadedHarnessWorkflow = LoadedWorkflow & {
  workflowSourceKind?: "builtin" | "user";
};

function mergeWorkflows(args: {
  builtin: LoadedHarnessWorkflow[];
  user: LoadedHarnessWorkflow[];
}) {
  const byId = new Map<string, LoadedHarnessWorkflow>();
  for (const workflow of args.builtin) {
    byId.set(workflow.manifest.id, {
      ...workflow,
      workflowSourceKind: "builtin",
    });
  }
  for (const workflow of args.user) {
    byId.set(workflow.manifest.id, {
      ...workflow,
      workflowSourceKind: "user",
    });
  }
  return Array.from(byId.values()).sort(compareWorkflowDisplayOrder);
}

export function filterHarnessVisibleWorkflows(
  workflows: LoadedHarnessWorkflow[],
) {
  return workflows.filter((workflow) => isWorkflowVisible(workflow));
}

async function loadHarnessWorkflows(args: {
  workflowsDir: string;
  builtinWorkflowsDir: string;
}) {
  const [builtin, user] = await Promise.all([
    args.builtinWorkflowsDir
      ? loadWorkflowManifests(args.builtinWorkflowsDir, {
          workflowSourceKind: "builtin",
        })
      : Promise.resolve({ workflows: [] }),
    args.workflowsDir
      ? loadWorkflowManifests(args.workflowsDir, {
          workflowSourceKind: "user",
        })
      : Promise.resolve({ workflows: [] }),
  ]);
  return filterHarnessVisibleWorkflows(
    mergeWorkflows({
      builtin: builtin.workflows as LoadedHarnessWorkflow[],
      user: user.workflows as LoadedHarnessWorkflow[],
    }),
  );
}

function workflowRoot(workflow: LoadedHarnessWorkflow) {
  return (
    cleanString(workflow.rootDir) ||
    path.dirname(cleanString(workflow.manifestPath))
  );
}

function minimalMarkdownHtml(source: string) {
  return cleanString(source)
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("## "))
        return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (!line.trim()) return "";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function readWorkflowDoc(workflow: LoadedHarnessWorkflow) {
  const root = workflowRoot(workflow);
  const readme = root ? path.join(root, "README.md") : "";
  if (!readme) {
    return { html: "", missingReadme: true };
  }
  const source = await readFile(readme, "utf8").catch(() => "");
  return {
    html: source ? minimalMarkdownHtml(source) : "",
    missingReadme: !source,
  };
}

function normalizeProduct(row: PluginStateReadonlyRow) {
  const product = rowPayload(row);
  const productId = cleanString(product.productId || product.id || row.taskId);
  const assets = Array.isArray(product.assets) ? product.assets : [];
  return {
    productId,
    productKey: cleanString(product.productKey || productId),
    kind: cleanString(product.kind) || "workflow.product",
    title: cleanString(product.title) || productId,
    workflowId: cleanString(product.workflowId),
    workflowLabel: cleanString(product.workflowLabel),
    backendId: cleanString(product.backendId || row.backendId),
    backendType: cleanString(product.backendType || row.backendId),
    requestId: cleanString(product.requestId || row.requestId),
    runId: cleanString(product.runId),
    storageMode:
      product.storageMode === "persistent-cache" ||
      product.storageMode === "cached-bundle" ||
      product.storageMode === "local-workspace"
        ? product.storageMode
        : "local-workspace",
    workspaceDir: cleanString(product.workspaceDir),
    cacheDir: cleanString(product.cacheDir),
    resultJsonPath: cleanString(product.resultJsonPath),
    assets: assets.map((asset: any, index: number) => ({
      assetId: cleanString(asset.assetId || asset.id || `asset-${index + 1}`),
      label: cleanString(asset.label || asset.assetId || `Asset ${index + 1}`),
      path: cleanString(asset.path || asset.relativePath),
      relativePath: cleanString(asset.relativePath || asset.path),
      contentType: cleanString(asset.contentType),
      sourceKind: cleanString(asset.sourceKind || "missing"),
      localPath: cleanString(asset.localPath),
      entryPath: cleanString(asset.entryPath),
      size: Number.isFinite(Number(asset.size))
        ? Number(asset.size)
        : undefined,
      diagnostics: Array.isArray(asset.diagnostics) ? asset.diagnostics : [],
    })),
    metadata:
      product.metadata && typeof product.metadata === "object"
        ? product.metadata
        : {},
    createdAt: cleanString(product.createdAt),
    updatedAt: cleanString(product.updatedAt || row.updatedAt),
  };
}

function previewForProductAsset(product: any, assetId: string) {
  const asset =
    (Array.isArray(product.assets) ? product.assets : []).find(
      (entry: any) => cleanString(entry.assetId) === assetId,
    ) || product.assets?.[0];
  if (!asset) return undefined;
  return {
    productId: product.productId,
    assetId: asset.assetId,
    path: asset.path || asset.relativePath || "",
    exists: false,
    previewable: false,
    truncated: false,
    kind: "missing",
    language: "text",
    text: "",
    error:
      "Readonly harness does not read workflow product files outside the plugin DB.",
  };
}

function readonlyReasonForAction(action: string) {
  if (action.includes("copy")) return "clipboard";
  if (action.includes("open") || action.includes("folder")) return "host-api";
  if (action.includes("run") || action.includes("cancel"))
    return "backend-submit";
  if (action.includes("save") || action.includes("remove")) return "db-write";
  return "readonly";
}

export async function createDashboardReadonlyModel(
  dbPath: string,
  options: {
    workflowsDir?: string;
    builtinWorkflowsDir?: string;
  } = {},
) {
  const store = await createPluginStateReadonlyStore(dbPath);
  const backendResult = await loadBackendsRegistryReadonly();
  const configuredBackends = (backendResult.backends || []).filter(
    (backend) => backend.type !== PASS_THROUGH_BACKEND_TYPE,
  );
  const backendById = new Map(
    configuredBackends.map((backend) => [backend.id, backend]),
  );
  const workflows = await loadHarnessWorkflows({
    workflowsDir: cleanString(options.workflowsDir),
    builtinWorkflowsDir: cleanString(options.builtinWorkflowsDir),
  });
  const state: DashboardReadonlyState = {
    selectedTabKey: "home",
    actionLog: [],
    selectedWorkflowOptionsWorkflowId: "",
    homeWorkflowDocWorkflowId: "",
    selectedProductId: "",
    selectedProductAssetId: "",
    selectedProductSection: "products",
    selectedFeedbackProductId: "",
    feedbackSkillFilter: "",
    selectedFeedbackProductIds: new Set(),
    runtimeLogFilters: {},
    runtimeLogSelectedIdSet: new Set(),
  };

  function log(
    source: string,
    action: string,
    payload?: Record<string, unknown>,
  ) {
    const reason = readonlyReasonForAction(action);
    const entry = {
      id: `mock-${state.actionLog.length + 1}`,
      ts: nowIso(),
      source,
      action,
      payload,
      readonlyReason: reason,
      message: `Readonly harness blocked ${source}:${action} (${reason})`,
    };
    state.actionLog.unshift(entry);
    state.actionLog.splice(80);
    return entry;
  }

  async function buildHomeWorkflows(backends: BackendInstance[]) {
    const entries = await Promise.all(
      [...workflows].sort(compareWorkflowDisplayOrder).map(async (workflow) => {
        const descriptor = await buildWorkflowSettingsUiDescriptor({
          workflow,
          candidateBackends: backends,
          resolveDynamicOptions: false,
        });
        return {
          workflowId: workflow.manifest.id,
          workflowLabel: localizeWorkflowLabel(workflow),
          providerId: descriptor.providerId,
          configurable: descriptor.hasConfigurableSettings,
          builtin: workflow.workflowSourceKind === "builtin",
          core: isCoreWorkflow(workflow),
          quickRunEnabled:
            canWorkflowRunWithoutSelection(workflow.manifest) &&
            !descriptor.blockedReason,
          quickRunDisabledReason: descriptor.blockedReason
            ? descriptor.blockedReason
            : !canWorkflowRunWithoutSelection(workflow.manifest)
              ? DASHBOARD_LABELS.homeWorkflowRunDisabledSelection
              : undefined,
        };
      }),
    );
    return entries;
  }

  async function buildWorkflowOptionsView(backends: BackendInstance[]) {
    const descriptors = await Promise.all(
      workflows.map(async (workflow) => ({
        workflow,
        descriptor: await buildWorkflowSettingsUiDescriptor({
          workflow,
          candidateBackends: backends,
          resolveDynamicOptions: false,
        }),
      })),
    );
    const configurable = descriptors.filter(
      (entry) => entry.descriptor.hasConfigurableSettings,
    );
    if (!configurable.length) {
      return {
        workflows: [],
        selectedWorkflowId: "",
        saveState: "idle" as const,
      };
    }
    const selectedWorkflowId = configurable.some(
      (entry) =>
        entry.workflow.manifest.id === state.selectedWorkflowOptionsWorkflowId,
    )
      ? state.selectedWorkflowOptionsWorkflowId
      : configurable[0].workflow.manifest.id;
    state.selectedWorkflowOptionsWorkflowId = selectedWorkflowId;
    const selected = configurable.find(
      (entry) => entry.workflow.manifest.id === selectedWorkflowId,
    );
    return {
      workflows: configurable.map((entry) => ({
        workflowId: entry.workflow.manifest.id,
        workflowLabel: localizeWorkflowLabel(entry.workflow),
        providerId: entry.descriptor.providerId,
      })),
      selectedWorkflowId,
      selectedDescriptor: selected
        ? await buildWorkflowSettingsUiDescriptor({
            workflow: selected.workflow,
            candidateBackends: backends,
            resolveDynamicOptions: false,
          })
        : undefined,
      saveState: "idle" as const,
    };
  }

  function allRows() {
    return store
      .listTaskRows({ limit: 300 })
      .map((row) => normalizeDashboardRow(row, backendById));
  }

  function productsView() {
    const allProducts = store
      .listTaskRows({
        domain: "workflow-products",
        scope: "products",
        limit: 200,
      })
      .map(normalizeProduct);
    const products = allProducts.filter(
      (entry) => entry.kind !== SKILL_RUN_FEEDBACK_KIND,
    );
    const feedbackAll = allProducts.filter(
      (entry) => entry.kind === SKILL_RUN_FEEDBACK_KIND,
    );
    const feedbackSkillOptions = Array.from(
      new Set(
        feedbackAll
          .map((entry) => cleanString(entry.metadata?.skillId))
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
    if (
      state.feedbackSkillFilter &&
      !feedbackSkillOptions.includes(state.feedbackSkillFilter)
    ) {
      state.feedbackSkillFilter = "";
    }
    const feedbackProducts = state.feedbackSkillFilter
      ? feedbackAll.filter(
          (entry) =>
            cleanString(entry.metadata?.skillId) === state.feedbackSkillFilter,
        )
      : feedbackAll;
    const selected =
      products.find((entry) => entry.productId === state.selectedProductId) ||
      products[0];
    state.selectedProductId = selected?.productId || "";
    const selectedAsset =
      selected?.assets.find(
        (entry: any) => entry.assetId === state.selectedProductAssetId,
      ) || selected?.assets[0];
    state.selectedProductAssetId = selectedAsset?.assetId || "";
    const selectedFeedback =
      feedbackProducts.find(
        (entry) => entry.productId === state.selectedFeedbackProductId,
      ) || feedbackProducts[0];
    state.selectedFeedbackProductId = selectedFeedback?.productId || "";
    for (const id of Array.from(state.selectedFeedbackProductIds)) {
      if (!feedbackProducts.some((entry) => entry.productId === id)) {
        state.selectedFeedbackProductIds.delete(id);
      }
    }
    const feedbackAsset =
      selectedFeedback?.assets.find(
        (entry: any) => entry.assetId === SKILL_RUN_FEEDBACK_ASSET_ID,
      ) || selectedFeedback?.assets[0];
    return {
      section: state.selectedProductSection,
      products,
      selectedProduct: selected,
      selectedAssetId: selectedAsset?.assetId,
      selectedPreview: selected
        ? previewForProductAsset(selected, selectedAsset?.assetId || "")
        : undefined,
      feedbackProducts,
      feedbackSkillOptions,
      feedbackSkillFilter: state.feedbackSkillFilter,
      selectedFeedbackProduct: selectedFeedback,
      selectedFeedbackProductIds: Array.from(state.selectedFeedbackProductIds),
      selectedFeedbackPreview:
        selectedFeedback && feedbackAsset
          ? previewForProductAsset(selectedFeedback, feedbackAsset.assetId)
          : undefined,
    };
  }

  function runtimeLogsView() {
    const logs = state.actionLog.map((entry) => ({
      id: entry.id,
      ts: entry.ts,
      level: "warn",
      stage: "harness-readonly",
      scope: entry.source,
      message: entry.message,
      workflowId: cleanString(entry.payload?.workflowId),
      requestId: cleanString(entry.payload?.requestId),
      jobId: cleanString(entry.payload?.jobId),
      detailPayload: {
        ...entry.payload,
        readonlyReason: entry.readonlyReason,
      },
    }));
    return {
      filters: state.runtimeLogFilters,
      diagnosticMode: true,
      totalEntries: logs.length,
      budget: {
        maxEntries: 80,
        maxBytes: 0,
        estimatedBytes: JSON.stringify(logs).length,
        droppedEntries: 0,
        droppedByReason: {
          entry_limit: 0,
          byte_budget: 0,
          expired: 0,
        },
        retentionMode: "harness-action-log",
      },
      logs,
      selectedEntryIds: Array.from(state.runtimeLogSelectedIdSet),
      filterOptions: {
        backends: configuredBackends.map((backend) => ({
          value: backend.id,
          label: backendDisplayName(backend),
        })),
        workflows: workflows.map((workflow) => ({
          value: workflow.manifest.id,
          label: localizeWorkflowLabel(workflow),
        })),
      },
    };
  }

  async function snapshot() {
    const rows = allRows();
    const runningRows = rows.filter((row) => !row.stateSemantics.terminal);
    const backends = configuredBackends;
    const homeWorkflows = await buildHomeWorkflows(backends);
    const tabs = [
      { key: "home", label: DASHBOARD_LABELS.home },
      { key: "workflow-options", label: DASHBOARD_LABELS.tabWorkflowOptions },
      { key: "products", label: DASHBOARD_LABELS.tabProducts },
      { key: "runtime-logs", label: DASHBOARD_LABELS.runtimeLogsTabTitle },
      ...backends.map((backend) => ({
        key: `backend:${backend.id}`,
        label: `${backendDisplayName(backend)} (${backend.type})`,
        backendId: backend.id,
        backendType: backend.type,
        disabled: false,
      })),
    ];
    if (!tabs.some((tab) => tab.key === state.selectedTabKey)) {
      state.selectedTabKey = "home";
    }
    const selectedBackendTab = tabs.find(
      (tab) => tab.key === state.selectedTabKey && "backendId" in tab,
    ) as
      | { backendId?: string; backendType?: string; label?: string }
      | undefined;
    const backendRows = selectedBackendTab?.backendId
      ? rows.filter((row) => row.backendId === selectedBackendTab.backendId)
      : rows;
    const snapshotPayload: Record<string, unknown> = {
      generatedAt: nowIso(),
      title: "Task Dashboard",
      labels: DASHBOARD_LABELS,
      selectedTabKey: state.selectedTabKey,
      tabs,
      summary: {
        total: rows.length,
        running: runningRows.length,
        succeeded: rows.filter(
          (row) => row.stateSemantics.normalized === "succeeded",
        ).length,
        failed: rows.filter((row) => row.stateSemantics.normalized === "failed")
          .length,
        canceled: rows.filter((row) =>
          ["canceled", "cancelled"].includes(row.stateSemantics.normalized),
        ).length,
      },
      runningRows,
      homeWorkflows,
      backendLoadError: store.tableExists("plugin_task_rows")
        ? cleanString(backendResult.fatalError)
        : "Readonly harness could not find Dashboard task tables in the plugin DB.",
    };
    if (state.homeWorkflowDocWorkflowId && state.selectedTabKey === "home") {
      const workflow = workflows.find(
        (entry) => entry.manifest.id === state.homeWorkflowDocWorkflowId,
      );
      if (workflow) {
        const doc = await readWorkflowDoc(workflow);
        snapshotPayload.homeWorkflowDocView = {
          workflowId: workflow.manifest.id,
          workflowLabel: localizeWorkflowLabel(workflow),
          html: doc.html,
          missingReadme: doc.missingReadme,
        };
      }
    }
    if (state.selectedTabKey === "workflow-options") {
      snapshotPayload.workflowOptionsView =
        await buildWorkflowOptionsView(backends);
    }
    if (state.selectedTabKey === "products") {
      snapshotPayload.productStorageView = productsView();
    }
    if (state.selectedTabKey === "runtime-logs") {
      snapshotPayload.runtimeLogsView = runtimeLogsView();
    }
    if (selectedBackendTab) {
      snapshotPayload.backendView = {
        backendId: cleanString(selectedBackendTab.backendId),
        backendType: cleanString(selectedBackendTab.backendType) || "readonly",
        backendBaseUrl:
          cleanString(
            backendById.get(cleanString(selectedBackendTab.backendId))?.baseUrl,
          ) || "",
        title:
          cleanString(selectedBackendTab.label) || "Readonly plugin database",
        rows: backendRows,
        emptyRowsText: DASHBOARD_LABELS.backendNoTasks,
        logRows: [],
      };
    }
    snapshotPayload.surfaceSignatures =
      dashboardSurfaceSignatures(snapshotPayload);
    return snapshotPayload;
  }

  async function handleAction(
    action: string,
    payload?: Record<string, unknown>,
  ) {
    const data = payload || {};
    if (action === "select-tab") {
      state.selectedTabKey =
        cleanString(data.tabKey || data.key) || state.selectedTabKey || "home";
      if (state.selectedTabKey !== "home") {
        state.homeWorkflowDocWorkflowId = "";
      }
      if (cleanString(data.workflowId)) {
        state.selectedWorkflowOptionsWorkflowId = cleanString(data.workflowId);
      }
    } else if (action === "open-home-workflow-doc") {
      state.selectedTabKey = "home";
      state.homeWorkflowDocWorkflowId = cleanString(data.workflowId);
    } else if (action === "close-home-workflow-doc") {
      state.homeWorkflowDocWorkflowId = "";
    } else if (action === "open-home-workflow-settings") {
      state.selectedTabKey = "workflow-options";
      state.selectedWorkflowOptionsWorkflowId = cleanString(data.workflowId);
    } else if (action === "select-product") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "products";
      state.selectedProductId = cleanString(data.productId);
      state.selectedProductAssetId = "";
    } else if (action === "select-product-asset") {
      state.selectedProductSection = "products";
      state.selectedProductAssetId = cleanString(data.assetId);
    } else if (action === "select-product-section") {
      state.selectedTabKey = "products";
      state.selectedProductSection =
        cleanString(data.section) === "feedback" ? "feedback" : "products";
    } else if (action === "select-feedback-skill-filter") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      state.feedbackSkillFilter = cleanString(data.skillId);
      state.selectedFeedbackProductId = "";
      state.selectedFeedbackProductIds.clear();
    } else if (action === "select-feedback-product") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      state.selectedFeedbackProductId = cleanString(data.productId);
    } else if (action === "toggle-feedback-product-selected") {
      const productId = cleanString(data.productId);
      if (productId) {
        if (data.selected === true) {
          state.selectedFeedbackProductIds.add(productId);
        } else {
          state.selectedFeedbackProductIds.delete(productId);
        }
      }
    } else if (action === "export-selected-feedback") {
      log("dashboard", action, {
        productIds: Array.from(state.selectedFeedbackProductIds),
      });
    } else if (action === "delete-selected-feedback") {
      log("dashboard", action, {
        productIds: Array.from(state.selectedFeedbackProductIds),
      });
    } else if (action === "delete-all-feedback") {
      log("dashboard", action, {
        skillId: state.feedbackSkillFilter,
      });
    } else if (action === "runtime-logs-set-filters") {
      state.runtimeLogFilters =
        data.filters && typeof data.filters === "object"
          ? {
              ...state.runtimeLogFilters,
              ...(data.filters as Record<string, unknown>),
            }
          : {};
    } else if (action === "select-log-entry") {
      const id = cleanString(data.logEntryId);
      if (id) state.runtimeLogSelectedIdSet.add(id);
    } else if (action !== "ready") {
      log("dashboard", action, data);
    }
    return snapshot();
  }

  return {
    snapshot,
    handleAction,
    log,
    diagnostics() {
      return store.diagnostics();
    },
    close() {
      store.close();
    },
  };
}

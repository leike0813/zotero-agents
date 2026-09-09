import type { BackendInstance } from "../../backends/types";
import { resolveBackendDisplayName } from "../../backends/displayName";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../config/defaults";
import { workflowSubmissionQueue } from "../../jobQueue/workflowSubmissionQueue";
import type {
  DashboardLiteratureArtifactMigrationView,
  DashboardLogRow,
  DashboardRow,
  DashboardRuntimeLogFilters,
  DashboardSnapshot,
  DashboardWorkflowProductPreview,
} from "../../shared/dashboardWireContract";
import { getString } from "../../utils/locale";
import { resolveSkillRunnerBackendUnavailableToastText } from "../../utils/localizationGovernance";
import { joinPath } from "../../utils/path";
import { canWorkflowRunWithoutSelection } from "../../workflows/triggerPolicy";
import {
  compareWorkflowDisplayOrder,
  isCoreWorkflow,
  localizeWorkflowLabel,
} from "../../workflows/localization";
import { mapAcpSkillRunSummaryToWorkflowTask } from "../acp/skillRun/acpSkillRunTaskProjection";
import { listAcpSkillRunSummaries } from "../acp/skillRun/acpSkillRunStore";
import {
  isAcpRuntimeReplayProfilerAvailable,
  isAcpRuntimeSemanticTraceRecorderAvailable,
  isDebugModeEnabled,
  isSkillRunnerConnectionAuditAvailable,
  isSynthesisSidecarDiagnosticsAvailable,
} from "../debugMode";
import {
  configureLiteratureArtifactMigrationHost,
  createLiteratureArtifactMigrationHostFromZoteroBroker,
  getLiteratureArtifactMigrationService,
} from "../literatureArtifactMigration";
import { readRuntimeTextFileStrict } from "../runtimePersistence";
import { listRuntimeLogs } from "../runtimeLogManager";
import { isSkillRunnerBackendAvailable } from "../skillRunner/connection/skillRunnerBackendHealthRegistry";
import {
  isTerminal,
  isWaiting,
  normalizeStatus,
} from "../skillRunner/run/skillRunnerProviderStateMachine";
import { buildSkillRunnerManagementUiUrl } from "../skillRunner/surface/skillRunnerManagementDialog";
import {
  summarizeTaskDashboardHistory,
  type TaskDashboardHistoryRecord,
  type TaskDashboardHistorySummary,
} from "../taskDashboardHistory";
import {
  mergeDashboardTaskRows,
  normalizeDashboardTabKey,
  projectDashboardQueuedRows,
} from "../taskDashboardSnapshot";
import type { WorkflowTaskRecord } from "../taskRuntime";
import { getLoadedWorkflowSourceById } from "../workflow/catalog/workflowRuntime";
import {
  getWorkflowProductMigrationStatus,
  listSkillRunFeedbackProducts,
  listWorkflowProducts,
  readProductAssetPreview,
  SKILL_RUN_FEEDBACK_ASSET_ID,
  WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK,
} from "../workflow/catalog/workflowProductStore";
import { getVisibleLoadedWorkflowEntries } from "../workflow/catalog/workflowVisibility";
import { buildWorkflowSettingsUiDescriptor } from "../workflow/settings/workflowSettings";
import type { WorkflowExecutionOptions } from "../workflow/settings/workflowSettingsDomain";
import { resolveZoteroHostCapabilityBroker } from "../zoteroHostCapabilityBroker";

const SYNTHESIS_SIDECAR_DIAGNOSTICS_AVAILABLE =
  typeof __debug_mode__ === "undefined"
    ? isSynthesisSidecarDiagnosticsAvailable()
    : __debug_mode__ && __synthesis_sidecar_diagnostics_enabled__;

export type DashboardState = {
  backends: BackendInstance[];
  backendLoadError?: string;
  selectedTabKey: string;
  selectedLiteratureMigrationRunId: string;
  selectedBackendSubviewById: Map<string, "runs" | "management">;
  selectedLogTaskByBackendId: Map<string, string>;
  selectedLogEntryByBackendId: Map<string, string>;
  selectedWorkflowOptionsWorkflowId: string;
  workflowSettingsDraftById: Map<string, WorkflowExecutionOptions>;
  workflowSettingsSaveStateById: Map<
    string,
    "idle" | "saving" | "saved" | "error"
  >;
  workflowSettingsSaveErrorById: Map<string, string>;
  workflowSettingsSaveTimerById: Map<string, number>;
  runtimeLogFilters: DashboardRuntimeLogFilters;
  runtimeLogSelectedIdSet: Set<string>;
  homeWorkflowDocWorkflowId: string;
  selectedProductId: string;
  selectedProductAssetId: string;
  selectedProductSection: "products" | "feedback";
  selectedFeedbackProductId: string;
  feedbackSkillFilter: string;
  selectedFeedbackProductIds: Set<string>;
  productExportInProgress: boolean;
  homeWorkflowDocCacheByWorkflowId: Map<
    string,
    {
      html: string;
      markdown: string;
      baseFileUri: string;
      missingReadme: boolean;
    }
  >;
};

export const DEFAULT_RUNTIME_LOG_LEVELS = ["info", "warn", "error"];

export function createDefaultRuntimeLogFilters(): DashboardState["runtimeLogFilters"] {
  return { levels: [...DEFAULT_RUNTIME_LOG_LEVELS] };
}

function normalizeRuntimeLogFilters(
  filters: DashboardState["runtimeLogFilters"],
): DashboardState["runtimeLogFilters"] {
  const normalized = {
    ...createDefaultRuntimeLogFilters(),
    ...filters,
  };
  normalized.levels = Array.isArray(filters.levels)
    ? [...filters.levels]
    : [...DEFAULT_RUNTIME_LOG_LEVELS];
  return normalized;
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

function dashboardSelectedSurfaceKey(snapshot: DashboardSnapshot) {
  const tabKey = String(snapshot.selectedTabKey || "home").trim() || "home";
  return tabKey.startsWith("backend:") ? "backend" : tabKey;
}

function dashboardChromeSignatureInput(snapshot: DashboardSnapshot) {
  return {
    selectedTabKey: snapshot.selectedTabKey,
    title: snapshot.title,
    labels: snapshot.labels,
    tabs: snapshot.tabs,
    backendLoadError: snapshot.backendLoadError,
  };
}

function dashboardSelectedSurfaceSignatureInput(snapshot: DashboardSnapshot) {
  const surfaceKey = dashboardSelectedSurfaceKey(snapshot);
  if (surfaceKey === "products") {
    return {
      surfaceKey,
      productStorageView: snapshot.productStorageView,
    };
  }
  if (surfaceKey === "workflow-options") {
    return {
      surfaceKey,
      workflowOptionsView: snapshot.workflowOptionsView,
    };
  }
  if (surfaceKey === "runtime-logs") {
    return {
      surfaceKey,
      runtimeLogsView: snapshot.runtimeLogsView,
    };
  }
  if (surfaceKey === "migrations") {
    return {
      surfaceKey,
      literatureArtifactMigrationView: snapshot.literatureArtifactMigrationView,
    };
  }
  if (surfaceKey === "synthesis-sidecar") {
    return {
      surfaceKey,
      synthesisSidecarView: snapshot.synthesisSidecarView,
    };
  }
  if (surfaceKey === "skillrunner-connection-audit") {
    return {
      surfaceKey,
      governor: snapshot.skillRunnerConnectionAuditView?.governor,
    };
  }
  if (surfaceKey === "acp-trace-replay") {
    return {
      surfaceKey,
      acpTraceRecorderView: snapshot.acpTraceRecorderView,
      acpReplayProfilerView: snapshot.acpReplayProfilerView,
    };
  }
  if (surfaceKey === "backend") {
    return {
      surfaceKey,
      backendView: snapshot.backendView,
    };
  }
  return {
    surfaceKey,
    summary: snapshot.summary,
    runningRows: snapshot.runningRows,
    homeWorkflows: snapshot.homeWorkflows,
    homeWorkflowDocView: snapshot.homeWorkflowDocView,
  };
}

function finalizeDashboardSnapshot(snapshot: DashboardSnapshot) {
  const selectedSurfaceKey = dashboardSelectedSurfaceKey(snapshot);
  snapshot.surfaceSignatures = {
    chrome: dashboardSignature(dashboardChromeSignatureInput(snapshot)),
    selectedSurface: dashboardSignature(
      dashboardSelectedSurfaceSignatureInput(snapshot),
    ),
    selectedSurfaceKey,
  };
  return snapshot;
}

export type MountedTaskDashboardRuntime = {
  refresh: () => void;
  selectTab: (args: {
    tabKey?: string;
    workflowId?: string;
    backendSubview?: "runs" | "management";
  }) => void;
  cleanup: () => void;
};

export type DashboardSelection = {
  tabKey?: string;
  workflowId?: string;
  backendSubview?: "runs" | "management";
};

export function localize(
  key: string,
  fallback: string,
  options?: { args?: Record<string, unknown> },
) {
  try {
    const resolved = String(
      options ? getString(key as any, options) : getString(key as any),
    ).trim();
    return resolved || fallback;
  } catch {
    return fallback;
  }
}

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeRenderedMarkdownHtml(html: string) {
  const runtime = globalThis as {
    DOMParser?: typeof DOMParser;
    XMLSerializer?: typeof XMLSerializer;
    document?: Document;
  };
  const ParserCtor = runtime.DOMParser;
  if (typeof ParserCtor !== "function") {
    return escapeHtml(html);
  }
  const allowedTags = new Set([
    "A",
    "B",
    "BLOCKQUOTE",
    "BR",
    "CODE",
    "DEL",
    "DIV",
    "EM",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HR",
    "I",
    "LI",
    "OL",
    "P",
    "PRE",
    "S",
    "SPAN",
    "STRONG",
    "TABLE",
    "TBODY",
    "TD",
    "TH",
    "THEAD",
    "TR",
    "UL",
  ]);
  const allowedAttrs = new Set(["class", "title", "href", "target", "rel"]);
  const parser = new ParserCtor();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body?.firstElementChild;
  if (!root) {
    return "";
  }
  const sanitizeNode = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(doc.createTextNode(child.textContent || ""));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || "").trim();
        if (!allowedAttrs.has(name) || name.startsWith("on")) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (
          (name === "href" || name === "src") &&
          /^javascript:/i.test(value)
        ) {
          child.removeAttribute(attr.name);
        }
      }
      if (child.tagName === "A") {
        const href = child.getAttribute("href") || "";
        if (href) {
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }
      }
      sanitizeNode(child);
    }
  };
  sanitizeNode(root);
  return String(root.innerHTML || "");
}

function renderInlineMarkdownFallback(value: string) {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return text;
}

function renderMarkdownFallback(markdown: string) {
  const lines = String(markdown || "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }
    const joined = paragraphLines.join(" ").trim();
    paragraphLines = [];
    if (!joined) {
      return;
    }
    html.push(`<p>${renderInlineMarkdownFallback(joined)}</p>`);
  };

  const closeLists = () => {
    if (inUnorderedList) {
      html.push("</ul>");
      inUnorderedList = false;
    }
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine || "";
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      flushParagraph();
      closeLists();
      if (inCodeBlock) {
        html.push(
          `<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      closeLists();
      continue;
    }
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeLists();
      const level = headingMatch[1].length;
      const content = renderInlineMarkdownFallback(headingMatch[2]);
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (inOrderedList) {
        html.push("</ol>");
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        html.push("<ul>");
        inUnorderedList = true;
      }
      html.push(`<li>${renderInlineMarkdownFallback(ulMatch[1])}</li>`);
      continue;
    }
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (inUnorderedList) {
        html.push("</ul>");
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        html.push("<ol>");
        inOrderedList = true;
      }
      html.push(`<li>${renderInlineMarkdownFallback(olMatch[1])}</li>`);
      continue;
    }
    paragraphLines.push(trimmed);
  }

  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  closeLists();
  return html.join("\n");
}

async function renderMarkdownToSafeHtml(markdown: string) {
  const moduleName = "marked";
  try {
    const loaded = (await import(moduleName)) as {
      parse?: (source: string, options?: Record<string, unknown>) => string;
      marked?: {
        parse?: (source: string, options?: Record<string, unknown>) => string;
      };
    };
    const parse =
      typeof loaded.parse === "function"
        ? loaded.parse
        : typeof loaded.marked?.parse === "function"
          ? loaded.marked.parse
          : undefined;
    if (parse) {
      const rendered = String(
        parse(markdown, {
          gfm: true,
          breaks: true,
          headerIds: false,
          mangle: false,
        }),
      );
      return sanitizeRenderedMarkdownHtml(rendered);
    }
  } catch {
    // fallback renderer below
  }
  return renderMarkdownFallback(markdown);
}

async function readUtf8TextFile(filePath: string) {
  return readRuntimeTextFileStrict(filePath);
}

export function toBackendTabKey(backendId: string) {
  return `backend:${backendId}`;
}

export function fromBackendTabKey(tabKey: string) {
  if (!tabKey.startsWith("backend:")) {
    return "";
  }
  return tabKey.slice("backend:".length).trim();
}

export function maybeBuildSkillRunnerManagementUiUrl(baseUrl: string) {
  try {
    return buildSkillRunnerManagementUiUrl(baseUrl);
  } catch {
    return "";
  }
}

export function isSkillRunnerBackend(backend: BackendInstance) {
  return String(backend.type || "").trim() === "skillrunner";
}

export function isAcpBackend(backend: BackendInstance) {
  return String(backend.type || "").trim() === "acp";
}

export function isAcpSkillRunnerTask(row: {
  backendType?: string;
  requestKind?: string;
}) {
  return (
    String(row.backendType || "").trim() === "acp" &&
    String(row.requestKind || "").trim() === ACP_SKILL_RUN_REQUEST_KIND
  );
}

export function filterWorkflowSubmitVisibleBackends(
  backends: BackendInstance[],
) {
  return backends.filter((backend) => {
    if (String(backend.type || "").trim() !== "skillrunner") {
      return true;
    }
    return (
      backend.enabled !== false && isSkillRunnerBackendAvailable(backend.id)
    );
  });
}

export function isBackendReconcileFlagged(args: {
  backendId?: string;
  backendType?: string;
}) {
  const backendId = String(args.backendId || "").trim();
  const backendType = String(args.backendType || "")
    .trim()
    .toLowerCase();
  if (!backendId || backendType !== "skillrunner") {
    return false;
  }
  return !isSkillRunnerBackendAvailable(backendId);
}

export function resolveBackendUnavailableMessageForDialog(args: {
  backendId?: string;
  backendDisplayName?: string;
}) {
  const displayName =
    String(args.backendDisplayName || "").trim() ||
    resolveBackendDisplayName(String(args.backendId || "").trim(), undefined) ||
    "-";
  return resolveSkillRunnerBackendUnavailableToastText(displayName);
}

function resolveStatusLabel(state: string) {
  const normalized = normalizeStatus(state, "running");
  if (normalized === "queued") {
    return localize("task-dashboard-status-queued", "Queued");
  }
  if (normalized === "running") {
    return localize("task-dashboard-status-running", "Running");
  }
  if (normalized === "waiting_user") {
    return localize("task-dashboard-status-waiting-user", "Waiting User");
  }
  if (normalized === "waiting_auth") {
    return localize("task-dashboard-status-waiting-auth", "Waiting Auth");
  }
  if (normalized === "succeeded") {
    return localize("task-dashboard-status-succeeded", "Succeeded");
  }
  if (normalized === "failed") {
    return localize("task-dashboard-status-failed", "Failed");
  }
  if (normalized === "canceled") {
    return localize("task-dashboard-status-canceled", "Canceled");
  }
  return normalized || localize("task-dashboard-status-unknown", "Unknown");
}

export function isTerminalWorkflowTaskState(state: string) {
  return isTerminal(state);
}

export function mapTaskRow(task: WorkflowTaskRecord): DashboardRow {
  return mapTaskRowWithMeta(task);
}

function mergeAcpBackendTaskRows(args: {
  backendId: string;
  backendMetaById: Map<
    string,
    {
      type?: string;
      displayName?: string;
    }
  >;
}) {
  const backendId = String(args.backendId || "").trim();
  return listAcpSkillRunSummaries({ backendId })
    .filter((run) => !run.removedAt && !run.archivedAt)
    .map((run) => mapAcpSkillRunSummaryToWorkflowTask(run))
    .map((entry) =>
      mapTaskRowWithMeta(entry, {
        backendMetaById: args.backendMetaById,
      }),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mapTaskRowWithMeta(
  task: WorkflowTaskRecord,
  options?: {
    backendMetaById?: Map<
      string,
      {
        type?: string;
        displayName?: string;
      }
    >;
  },
): DashboardRow {
  const normalizedState = normalizeStatus(task.state, "running");
  const backendId = String(task.backendId || "").trim();
  const backendMeta = backendId
    ? options?.backendMetaById?.get(backendId)
    : undefined;
  const backendType =
    String(task.backendType || "").trim() ||
    String(backendMeta?.type || "").trim();
  const backendDisplayName = backendId
    ? resolveBackendDisplayName(
        backendId,
        String(backendMeta?.displayName || "").trim() || undefined,
      )
    : "";
  const backendLabel = backendDisplayName
    ? backendType
      ? `${backendDisplayName} (${backendType})`
      : backendDisplayName
    : backendType || "-";
  return {
    id: task.id,
    workflowId: task.workflowId,
    workflowLabel: task.workflowLabel,
    backendId,
    backendType,
    backendLabel,
    taskName: task.taskName,
    state: normalizedState,
    stateSemantics: {
      normalized: normalizedState,
      terminal: isTerminal(normalizedState),
      waiting: isWaiting(normalizedState),
    },
    stateLabel: resolveStatusLabel(normalizedState),
    runKey: task.runKey,
    requestId: task.requestId,
    requestKind: task.requestKind,
    skillId: task.skillId,
    sequenceStepId: task.sequenceStepId,
    sequenceStepIndex: task.sequenceStepIndex,
    workflowRunId: task.workflowRunId,
    engine: task.engine,
    jobId: task.jobId,
    runId: task.runId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function toLogFilter(row: DashboardRow) {
  if (row.requestId) {
    return {
      requestId: row.requestId,
    };
  }
  if (row.jobId) {
    return {
      jobId: row.jobId,
    };
  }
  return {
    workflowId: row.workflowId,
  };
}

function mapLogRow(
  entry: ReturnType<typeof listRuntimeLogs>[number],
): DashboardLogRow {
  return {
    id: entry.id,
    ts: entry.ts,
    level: entry.level,
    scope: entry.scope,
    stage: entry.stage,
    message: entry.message,
    workflowId: entry.workflowId,
    requestId: entry.requestId,
    jobId: entry.jobId,
    detailPayload: {
      ...entry,
    },
  };
}

async function buildWorkflowOptionsView(args: {
  state: DashboardState;
  backends: BackendInstance[];
}) {
  const loaded = getVisibleLoadedWorkflowEntries();
  const candidateBackends = filterWorkflowSubmitVisibleBackends(args.backends);
  if (loaded.length === 0) {
    return {
      workflows: [],
      selectedWorkflowId: "",
      saveState: "idle" as const,
    };
  }
  const baseDescriptors = await Promise.all(
    loaded.map(async (workflow) => ({
      workflow,
      descriptor: await buildWorkflowSettingsUiDescriptor({
        workflow,
        candidateBackends,
        resolveDynamicOptions: false,
      }),
    })),
  );
  const configurable = baseDescriptors.filter(
    (entry) => entry.descriptor.hasConfigurableSettings,
  );
  if (configurable.length === 0) {
    return {
      workflows: [],
      selectedWorkflowId: "",
      saveState: "idle" as const,
    };
  }
  const selectedWorkflowId = configurable.some(
    (entry) =>
      entry.workflow.manifest.id ===
      args.state.selectedWorkflowOptionsWorkflowId,
  )
    ? args.state.selectedWorkflowOptionsWorkflowId
    : configurable[0].workflow.manifest.id;
  args.state.selectedWorkflowOptionsWorkflowId = selectedWorkflowId;
  const selectedWorkflow = configurable.find(
    (entry) => entry.workflow.manifest.id === selectedWorkflowId,
  )?.workflow;
  const selectedDescriptor = selectedWorkflow
    ? await buildWorkflowSettingsUiDescriptor({
        workflow: selectedWorkflow,
        candidateBackends,
        draft: args.state.workflowSettingsDraftById.get(selectedWorkflowId),
      })
    : undefined;
  const saveState =
    args.state.workflowSettingsSaveStateById.get(selectedWorkflowId) || "idle";
  const saveError =
    args.state.workflowSettingsSaveErrorById.get(selectedWorkflowId);
  return {
    workflows: configurable.map((entry) => ({
      workflowId: entry.workflow.manifest.id,
      workflowLabel: localizeWorkflowLabel(entry.workflow),
      providerId: entry.descriptor.providerId,
    })),
    selectedWorkflowId,
    selectedDescriptor,
    saveState,
    saveError: saveError || undefined,
  };
}

export async function buildHomeWorkflowSummaries(args: {
  backends: BackendInstance[];
}) {
  const loaded = getVisibleLoadedWorkflowEntries();
  const candidateBackends = filterWorkflowSubmitVisibleBackends(args.backends);
  const entries = await Promise.all(
    [...loaded].sort(compareWorkflowDisplayOrder).map(async (workflow) => {
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow,
        candidateBackends,
        resolveDynamicOptions: false,
      });
      return {
        workflowId: workflow.manifest.id,
        workflowLabel: localizeWorkflowLabel(workflow),
        providerId: descriptor.providerId,
        configurable: descriptor.hasConfigurableSettings,
        official:
          getLoadedWorkflowSourceById(workflow.manifest.id) === "official",
        core: isCoreWorkflow(workflow),
        quickRunEnabled:
          canWorkflowRunWithoutSelection(workflow.manifest) &&
          !descriptor.blockedReason,
        quickRunDisabledReason: descriptor.blockedReason
          ? descriptor.blockedReason
          : !canWorkflowRunWithoutSelection(workflow.manifest)
            ? localize(
                "task-dashboard-home-workflow-run-disabled-selection",
                "Requires a Zotero selection",
              )
            : undefined,
      };
    }),
  );
  return entries;
}

export async function resolveHomeWorkflowQuickRun(args: {
  workflowId: string;
  backends: BackendInstance[];
}) {
  const workflow = getVisibleLoadedWorkflowEntries().find(
    (entry) => entry.manifest.id === args.workflowId,
  );
  if (!workflow) {
    return {
      workflow: undefined,
      enabled: false,
      reason: localize(
        "task-dashboard-home-workflow-run-missing",
        "Workflow is not loaded",
      ),
    };
  }
  if (!canWorkflowRunWithoutSelection(workflow.manifest)) {
    return {
      workflow,
      enabled: false,
      reason: localize(
        "task-dashboard-home-workflow-run-disabled-selection",
        "Requires a Zotero selection",
      ),
    };
  }
  const descriptor = await buildWorkflowSettingsUiDescriptor({
    workflow,
    candidateBackends: filterWorkflowSubmitVisibleBackends(args.backends),
    resolveDynamicOptions: false,
  });
  if (descriptor.blockedReason) {
    return {
      workflow,
      enabled: false,
      reason: descriptor.blockedReason,
    };
  }
  if (descriptor.missingRequiredWorkflowParams.length > 0) {
    return {
      workflow,
      enabled: false,
      reason: localize(
        "task-dashboard-home-workflow-run-disabled-settings",
        "Requires settings before running",
      ),
    };
  }
  return {
    workflow,
    enabled: true,
    reason: "",
  };
}

async function buildHomeWorkflowDocView(args: {
  state: DashboardState;
  workflowId: string;
}) {
  const loaded = getVisibleLoadedWorkflowEntries();
  const matched = loaded.find((entry) => entry.manifest.id === args.workflowId);
  if (!matched) {
    return undefined;
  }
  const cached = args.state.homeWorkflowDocCacheByWorkflowId.get(
    args.workflowId,
  );
  if (cached) {
    return {
      workflowId: args.workflowId,
      workflowLabel: localizeWorkflowLabel(matched),
      html: cached.html,
      markdown: cached.markdown,
      baseFileUri: cached.baseFileUri,
      missingReadme: cached.missingReadme,
    };
  }
  const readmePath = joinPath(matched.rootDir, "README.md");
  let markdown = "";
  let missingReadme = false;
  try {
    markdown = await readUtf8TextFile(readmePath);
  } catch {
    missingReadme = true;
  }
  const html = missingReadme ? "" : await renderMarkdownToSafeHtml(markdown);
  const baseFileUri = missingReadme
    ? ""
    : (globalThis as any).Zotero?.File?.pathToFileURI?.(readmePath) ||
      readmePath;
  const cachedEntry = {
    html,
    markdown,
    baseFileUri,
    missingReadme,
  };
  args.state.homeWorkflowDocCacheByWorkflowId.set(args.workflowId, cachedEntry);
  return {
    workflowId: args.workflowId,
    workflowLabel: localizeWorkflowLabel(matched),
    html,
    markdown,
    baseFileUri,
    missingReadme,
  };
}

function migrationRunToDashboardView(entry: {
  runId: string;
  operationId: string;
  migrationId: string;
  definitionVersion: number;
  libraryId: string;
  state:
    | "preview"
    | "applying"
    | "completed"
    | "completed_with_attention"
    | "failed";
  reason: string;
  processedCount: number;
  remainingCount: number;
  setCount: number;
  createdAt: string;
  updatedAt: string;
  terminalAt: string;
  diagnostics: string[];
}) {
  return {
    runId: entry.runId,
    operationId: entry.operationId,
    migrationId: entry.migrationId,
    definitionVersion: entry.definitionVersion,
    libraryId: Number(entry.libraryId) || 0,
    state: entry.state,
    reason: entry.reason,
    processedCount: entry.processedCount,
    remainingCount: entry.remainingCount,
    setCount: entry.setCount,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    terminalAt: entry.terminalAt,
    diagnostics: entry.diagnostics,
  };
}

export function resolveDashboardLiteratureMigrationService() {
  const configured = getLiteratureArtifactMigrationService();
  if (configured) return configured;
  try {
    const broker = resolveZoteroHostCapabilityBroker();
    configureLiteratureArtifactMigrationHost(
      createLiteratureArtifactMigrationHostFromZoteroBroker(broker),
    );
  } catch {
    return null;
  }
  return getLiteratureArtifactMigrationService();
}

function buildLiteratureArtifactMigrationView(
  state?: DashboardState,
): DashboardLiteratureArtifactMigrationView {
  const service = resolveDashboardLiteratureMigrationService();
  if (!service) {
    return {
      migrationId: "literature-artifacts",
      definitionVersion: 1,
      availability: "unavailable",
      availabilityReason: localize(
        "task-dashboard-literature-migration-unavailable",
        "Literature artifact migration is unavailable in this runtime.",
      ),
      libraryId: 0,
      activeRun: null,
      activeOperationId: "",
      candidates: [],
      receipts: [],
      history: [],
    };
  }
  const activeSnapshot = service.getActiveSnapshot();
  const activeEntry = activeSnapshot
    ? service.getRun(activeSnapshot.runId)
    : null;
  const selectedEntry = state?.selectedLiteratureMigrationRunId
    ? service.getRun(state.selectedLiteratureMigrationRunId)
    : null;
  const displayedEntry = selectedEntry || activeEntry;
  const previewEntry =
    displayedEntry?.state === "preview" ? displayedEntry : null;
  const activePreview = activeSnapshot
    ? service.getPreviewForRun(activeSnapshot.runId)
    : previewEntry
      ? service.getPreview(previewEntry.operationId)
      : null;
  const history = service
    .listHistory({ limit: 50 })
    .map(migrationRunToDashboardView);
  const receipts = displayedEntry
    ? service.listReceipts({ runId: displayedEntry.runId, limit: 100 })
    : [];
  const outcomeByCandidate = new Map(
    receipts.map((receipt) => [receipt.candidateId, receipt.outcome]),
  );
  return {
    migrationId: "literature-artifacts",
    definitionVersion: 1,
    availability: activeSnapshot ? "busy" : "available",
    availabilityReason: activeSnapshot
      ? localize(
          "task-dashboard-literature-migration-busy",
          "A literature migration is already active.",
        )
      : "",
    libraryId:
      activePreview?.libraryId || Number(displayedEntry?.libraryId || 0),
    activeRun:
      activeSnapshot && activeEntry
        ? migrationRunToDashboardView(activeEntry)
        : displayedEntry
          ? migrationRunToDashboardView(displayedEntry)
          : null,
    activeOperationId:
      activeSnapshot?.operationId || activePreview?.operationId || "",
    candidates:
      activePreview?.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        ordinal: candidate.ordinal,
        classification: candidate.classification,
        outcome:
          outcomeByCandidate.get(candidate.candidateId) || candidate.outcome,
        reasonCodes: candidate.reasonCodes,
        verifiedCount: candidate.verifiedCount,
        unresolvedCount: candidate.unresolvedCount,
        recoveredCount: candidate.recoveredCount,
        droppedCount: candidate.droppedCount,
      })) || [],
    receipts: receipts.map((receipt) => ({
      candidateId: receipt.candidateId,
      ordinal: receipt.ordinal,
      classification: receipt.classification,
      outcome: receipt.outcome,
      reasonCodes: receipt.reasonCodes,
      verifiedCount: receipt.verifiedCount,
      unresolvedCount: receipt.unresolvedCount,
      recoveredCount: receipt.recoveredCount,
      droppedCount: receipt.droppedCount,
    })),
    history,
  };
}

export async function buildDashboardSnapshot(args: {
  state: DashboardState;
  backends: BackendInstance[];
  history: TaskDashboardHistoryRecord[];
  active: WorkflowTaskRecord[];
  historySummary?: TaskDashboardHistorySummary;
  homeWorkflows?: DashboardSnapshot["homeWorkflows"];
}) {
  const summary =
    args.historySummary || summarizeTaskDashboardHistory(args.history);
  const debugModeEnabled = isDebugModeEnabled();
  const synthesisSidecarDiagnosticsEnabled =
    SYNTHESIS_SIDECAR_DIAGNOSTICS_AVAILABLE;
  const skillRunnerConnectionAuditEnabled =
    __skillrunner_connection_audit_enabled__ &&
    debugModeEnabled &&
    isSkillRunnerConnectionAuditAvailable();
  const acpTraceRecorderEnabled =
    debugModeEnabled && isAcpRuntimeSemanticTraceRecorderAvailable();
  const acpReplayProfilerEnabled =
    debugModeEnabled && isAcpRuntimeReplayProfilerAvailable();
  const requestedTabKey = args.state.selectedTabKey;
  let selectedTabKey = normalizeDashboardTabKey({
    requestedTabKey,
    backends: args.backends,
    debugModeEnabled,
    synthesisSidecarDiagnosticsEnabled,
    skillRunnerConnectionAuditEnabled,
    acpTraceRecorderEnabled,
    acpReplayProfilerEnabled,
  });
  if (requestedTabKey === "migrations") {
    selectedTabKey = "migrations";
  }
  args.state.selectedTabKey = selectedTabKey;

  const backendMetaById = new Map<
    string,
    {
      type?: string;
      displayName?: string;
    }
  >(
    args.backends.map((entry) => [
      String(entry.id || "").trim(),
      {
        type: String(entry.type || "").trim() || undefined,
        displayName: String(entry.displayName || "").trim() || undefined,
      },
    ]),
  );

  const runningRows = args.active
    .map((entry) =>
      mapTaskRowWithMeta(entry, {
        backendMetaById,
      }),
    )
    .filter(
      (row) =>
        !isBackendReconcileFlagged({
          backendId: row.backendId,
          backendType: row.backendType,
        }),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  let homeWorkflows: DashboardSnapshot["homeWorkflows"] = [];
  let homeWorkflowDocView: DashboardSnapshot["homeWorkflowDocView"] = undefined;
  const selectedBackendFromRequestedTab = args.backends.find(
    (entry) => entry.id === fromBackendTabKey(selectedTabKey),
  );
  if (
    selectedBackendFromRequestedTab &&
    isBackendReconcileFlagged({
      backendId: selectedBackendFromRequestedTab.id,
      backendType: selectedBackendFromRequestedTab.type,
    })
  ) {
    selectedTabKey = "home";
    args.state.selectedTabKey = "home";
  }
  if (selectedTabKey === "home") {
    homeWorkflows =
      args.homeWorkflows ||
      (await buildHomeWorkflowSummaries({
        backends: args.backends,
      }));
    const requestedWorkflowId = String(
      args.state.homeWorkflowDocWorkflowId || "",
    ).trim();
    if (requestedWorkflowId) {
      homeWorkflowDocView = await buildHomeWorkflowDocView({
        state: args.state,
        workflowId: requestedWorkflowId,
      });
      if (!homeWorkflowDocView) {
        args.state.homeWorkflowDocWorkflowId = "";
      }
    }
  }

  const labels = {
    home: localize("task-dashboard-tab-home", "Dashboard Home"),
    tabHome: localize("task-dashboard-tab-home", "Dashboard Home"),
    tabWorkflowOptions: localize(
      "task-dashboard-tab-workflow-options",
      "Workflow Options",
    ),
    tabProducts: localize("task-dashboard-tab-products", "Products"),
    tabMigrations: localize("task-dashboard-tab-migrations", "Migrations"),
    literatureMigrationPageTitle: localize(
      "task-dashboard-literature-migration-page-title",
      "Literature Artifact Migration",
    ),
    literatureMigrationUnavailable: localize(
      "task-dashboard-literature-migration-unavailable",
      "Literature artifact migration is unavailable in this runtime.",
    ),
    literatureMigrationScan: localize(
      "task-dashboard-literature-migration-scan",
      "Scan library",
    ),
    literatureMigrationApply: localize(
      "task-dashboard-literature-migration-apply",
      "Apply selected sets",
    ),
    literatureMigrationStop: localize(
      "task-dashboard-literature-migration-stop",
      "Stop after current set",
    ),
    literatureMigrationContinue: localize(
      "task-dashboard-literature-migration-continue",
      "Continue",
    ),
    literatureMigrationReview: localize(
      "task-dashboard-literature-migration-review",
      "Review required",
    ),
    literatureMigrationReady: localize(
      "task-dashboard-literature-migration-ready",
      "Ready",
    ),
    literatureMigrationBlocked: localize(
      "task-dashboard-literature-migration-blocked",
      "Blocked",
    ),
    literatureMigrationEmpty: localize(
      "task-dashboard-literature-migration-empty",
      "No migration preview is active.",
    ),
    literatureMigrationHistory: localize(
      "task-dashboard-literature-migration-history",
      "Migration history",
    ),
    literatureMigrationHistoryEmpty: localize(
      "task-dashboard-literature-migration-history-empty",
      "No migration receipts yet.",
    ),
    literatureMigrationCandidate: localize(
      "task-dashboard-literature-migration-candidate",
      "Set",
    ),
    literatureMigrationProgress: localize(
      "task-dashboard-literature-migration-progress",
      "Progress",
    ),
    literatureMigrationAttention: localize(
      "task-dashboard-literature-migration-attention",
      "Attention required",
    ),
    tabBackends: localize("task-dashboard-tab-backends", "Backends"),
    acpTraceReplayTabTitle: localize(
      "task-dashboard-acp-trace-replay-tab-title",
      "ACP Trace & Replay",
    ),
    acpReplayProfilerTracePlaceholder: localize(
      "task-dashboard-acp-replay-profiler-trace-placeholder",
      "Local complete .ndjson trace path",
    ),
    acpTraceRecorderStepTitle: localize(
      "task-dashboard-acp-trace-recorder-step-title",
      "1. ACP Trace Recorder",
    ),
    acpReplayProfilerStepTitle: localize(
      "task-dashboard-acp-replay-profiler-step-title",
      "2. ACP Replay Profiler",
    ),
    acpTraceSensitiveWarning: localize(
      "task-dashboard-acp-trace-sensitive-warning",
      "Trace files contain complete prompts, assistant text, tool arguments, and outputs. They remain local and may contain sensitive data.",
    ),
    acpTraceType: localize("task-dashboard-acp-trace-type", "Trace type"),
    acpTraceChatSource: localize(
      "task-dashboard-acp-trace-chat-source",
      "ACP Chat conversation",
    ),
    acpTraceWorkflowSource: localize(
      "task-dashboard-acp-trace-workflow-source",
      "ACP Workflow execution",
    ),
    acpTraceMaxBytes: localize(
      "task-dashboard-acp-trace-max-bytes",
      "Maximum bytes",
    ),
    acpTraceMaxEvents: localize(
      "task-dashboard-acp-trace-max-events",
      "Maximum events",
    ),
    acpTraceMaxEventBytes: localize(
      "task-dashboard-acp-trace-max-event-bytes",
      "Maximum bytes per event",
    ),
    acpTraceAdvancedLimits: localize(
      "task-dashboard-acp-trace-advanced-limits",
      "Advanced capture limits",
    ),
    acpTraceArm: localize("task-dashboard-acp-trace-arm", "Arm Recorder"),
    acpTraceFinish: localize(
      "task-dashboard-acp-trace-finish",
      "Finish Recording",
    ),
    acpTraceFinishAfterTurn: localize(
      "task-dashboard-acp-trace-finish-after-turn",
      "Finish after Current Turn",
    ),
    acpTraceWaitingExplicitConnection: localize(
      "task-dashboard-acp-trace-waiting-explicit-connection",
      "Waiting for an explicit connection",
    ),
    acpTraceConnecting: localize(
      "task-dashboard-acp-trace-connecting",
      "Connecting",
    ),
    acpTraceBound: localize(
      "task-dashboard-acp-trace-bound",
      "Recording bound target",
    ),
    acpTraceStopping: localize(
      "task-dashboard-acp-trace-stopping",
      "Waiting for active work to finish",
    ),
    acpTraceSessionReplaced: localize(
      "task-dashboard-acp-trace-session-replaced",
      "A replacement remote session is not being recorded.",
    ),
    acpTraceCancel: localize(
      "task-dashboard-acp-trace-cancel",
      "Cancel Recording",
    ),
    acpTraceSave: localize(
      "task-dashboard-acp-trace-save",
      "Save & Use for Replay",
    ),
    acpTraceOpenFolder: localize(
      "task-dashboard-acp-trace-open-folder",
      "Open Folder",
    ),
    acpTraceNewRecording: localize(
      "task-dashboard-acp-trace-new-recording",
      "New Recording",
    ),
    acpReplayCompleteTrace: localize(
      "task-dashboard-acp-replay-complete-trace",
      "Complete local trace",
    ),
    acpReplayBrowse: localize("task-dashboard-acp-replay-browse", "Browse…"),
    acpReplayPhase: localize("task-dashboard-acp-replay-phase", "Phase"),
    acpReplayPhasePlaceholder: localize(
      "task-dashboard-acp-replay-phase-placeholder",
      "e.g. governance round 2",
    ),
    acpReplayPhaseInvalid: localize(
      "task-dashboard-acp-replay-phase-invalid",
      "Enter a valid stage (1–80 characters).",
    ),
    acpReplaySample: localize("task-dashboard-acp-replay-sample", "Sample"),
    acpReplayProgress: localize(
      "task-dashboard-acp-replay-progress",
      "Progress",
    ),
    acpReplayEvidenceDetails: localize(
      "task-dashboard-acp-replay-evidence-details",
      "Trace and run evidence",
    ),
    acpReplayCadence: localize("task-dashboard-acp-replay-cadence", "Cadence"),
    acpReplayCadenceRecorded: localize(
      "task-dashboard-acp-replay-cadence-recorded",
      "Recorded time",
    ),
    acpReplayCadenceLogical: localize(
      "task-dashboard-acp-replay-cadence-logical",
      "Logical time",
    ),
    acpReplayCadenceBurst: localize(
      "task-dashboard-acp-replay-cadence-burst",
      "Burst",
    ),
    acpReplayRun: localize(
      "task-dashboard-acp-replay-run",
      "Run Nine-Replay Matrix",
    ),
    acpReplayCancel: localize(
      "task-dashboard-acp-replay-cancel",
      "Cancel Replay",
    ),
    acpReplayOpenResultFolder: localize(
      "task-dashboard-acp-replay-open-result-folder",
      "Open Result Folder",
    ),
    loadingDashboard: localize(
      "task-dashboard-loading",
      "Loading dashboard...",
    ),
    runningTitle: localize("task-dashboard-running-title", "Active Tasks"),
    summaryTotal: localize("task-dashboard-summary-total", "Total"),
    summaryRunning: localize("task-dashboard-summary-running", "Running"),
    summarySucceeded: localize("task-dashboard-summary-succeeded", "Succeeded"),
    summaryFailed: localize("task-dashboard-summary-failed", "Failed"),
    summaryCanceled: localize("task-dashboard-summary-canceled", "Canceled"),
    colTask: localize("task-dashboard-column-task", "Task"),
    colWorkflow: localize("task-dashboard-column-workflow", "Workflow"),
    colBackend: localize("task-dashboard-col-backend", "Backend"),
    colStatus: localize("task-dashboard-column-status", "Status"),
    colRequestId: localize("task-dashboard-col-request-id", "Request ID"),
    colJobId: localize("task-dashboard-col-job-id", "Job ID"),
    colEngine: localize("task-dashboard-col-engine", "Engine"),
    colTime: localize("task-dashboard-col-time", "Time"),
    colLevel: localize("task-dashboard-col-level", "Level"),
    colStage: localize("task-dashboard-col-stage", "Stage"),
    colScope: localize("task-dashboard-col-scope", "Scope"),
    colMessage: localize("task-dashboard-col-message", "Message"),
    colUpdatedAt: localize("task-dashboard-col-updated-at", "Updated At"),
    colActions: localize("task-dashboard-col-actions", "Actions"),
    noBackends: localize(
      "task-dashboard-sidebar-empty",
      "No backend profiles.",
    ),
    noRunning: localize("task-dashboard-running-empty", "No active tasks."),
    noHistory: localize(
      "task-dashboard-detail-empty",
      "Select one backend from sidebar.",
    ),
    backendNoTasks: localize(
      "task-dashboard-backend-empty",
      "No tasks for this backend.",
    ),
    openManagement: localize(
      "task-dashboard-open-management",
      "Open Backend UI",
    ),
    closeManagement: localize(
      "task-dashboard-close-management",
      "Back to Runs",
    ),
    openManagementExternal: localize(
      "task-dashboard-open-management-external",
      "Open in Browser",
    ),
    managementLoadFailed: localize(
      "task-dashboard-management-load-failed",
      "Management UI failed to load.",
    ),
    managementLoading: localize(
      "task-dashboard-management-loading",
      "Loading management UI...",
    ),
    refreshModelCache: localize(
      "backend-manager-refresh-model-cache",
      "Refresh Model Cache",
    ),
    openRun: localize("task-dashboard-open-run", "Open Run"),
    cancelRun: localize("task-dashboard-skillrunner-cancel", "Cancel Run"),
    cancelQueuedWorkflowUnit: localize(
      "workflow-queue-cancel",
      "Cancel queued workflow unit",
    ),
    logsTitle: localize("task-dashboard-generic-logs-title", "Runtime Logs"),
    logsEmpty: localize(
      "task-dashboard-generic-logs-empty",
      "No runtime logs captured.",
    ),
    logsBoundTask: localize(
      "task-dashboard-generic-logs-bound-task",
      "Bound Task",
    ),
    logsBoundRequestId: localize(
      "task-dashboard-generic-logs-bound-request-id",
      "Bound Request ID",
    ),
    logsBoundJobId: localize(
      "task-dashboard-generic-logs-bound-job-id",
      "Bound Job ID",
    ),
    logsDetailTitle: localize(
      "task-dashboard-generic-logs-detail-title",
      "Log Details",
    ),
    logsDetailClose: localize("task-dashboard-generic-logs-close", "Close"),
    logsException: localize(
      "task-dashboard-generic-logs-exception",
      "Exception",
    ),
    logsViewTask: localize(
      "task-dashboard-generic-logs-view-task",
      "Bind Logs",
    ),
    logsOpenDiagnostics: localize(
      "task-dashboard-generic-logs-open-diagnostics",
      "Diagnostic Export",
    ),
    workflowSettingsNoConfigurable: localize(
      "task-dashboard-workflow-settings-empty",
      "No configurable workflows.",
    ),
    workflowSettingsWorkflowLabel: localize(
      "workflow-settings-workflow-label",
      "Workflow",
    ),
    workflowSettingsProviderLabel: localize(
      "workflow-settings-provider-label",
      "Provider",
    ),
    workflowSettingsProfileLabel: localize(
      "workflow-settings-profile-label",
      "Profile",
    ),
    workflowSettingsWorkflowParamsTitle: localize(
      "workflow-settings-persisted-workflow-params-title",
      "Workflow Parameters",
    ),
    workflowSettingsProviderOptionsTitle: localize(
      "workflow-settings-persisted-provider-options-title",
      "Provider Runtime Options",
    ),
    workflowSettingsNoWorkflowParams: localize(
      "workflow-settings-no-workflow-params",
      "This workflow has no configurable parameters.",
    ),
    workflowSettingsNoProviderOptions: localize(
      "workflow-settings-no-provider-options",
      "This provider has no configurable runtime options.",
    ),
    workflowSettingsBlockedNoProfile: localize(
      "workflow-settings-submit-blocked-no-profile",
      "No backend profile available. Please configure one first.",
    ),
    workflowSettingsNumberInvalid: localize(
      "workflow-settings-number-invalid",
      "Please enter a valid number.",
    ),
    workflowSettingsPositiveIntegerRequired: localize(
      "workflow-settings-positive-integer-required",
      "Please enter a positive integer.",
    ),
    workflowSettingsParameterRequired: localize(
      "workflow-settings-parameter-required",
      "This field is required.",
    ),
    workflowSettingsSaving: localize(
      "workflow-settings-dashboard-saving",
      "Saving...",
    ),
    workflowSettingsSaved: localize(
      "workflow-settings-dashboard-saved",
      "Saved",
    ),
    workflowSettingsSaveError: localize(
      "workflow-settings-dashboard-save-error",
      "Save failed",
    ),
    runtimeLogsTabTitle: localize(
      "task-dashboard-runtime-logs-tab-title",
      "Runtime Logs",
    ),
    runtimeLogsLevelDebug: localize(
      "task-dashboard-runtime-logs-level-debug",
      "Debug",
    ),
    runtimeLogsLevelInfo: localize(
      "task-dashboard-runtime-logs-level-info",
      "Info",
    ),
    runtimeLogsLevelWarn: localize(
      "task-dashboard-runtime-logs-level-warn",
      "Warn",
    ),
    runtimeLogsLevelError: localize(
      "task-dashboard-runtime-logs-level-error",
      "Error",
    ),
    runtimeLogsClearConfirm: localize(
      "task-dashboard-runtime-logs-clear-confirm",
      "Are you sure you want to clear all runtime logs?",
    ),
    synthesisSidecarTabTitle: localize(
      "task-dashboard-synthesis-sidecar-tab-title",
      "Synthesis Sidecar",
    ),
    synthesisSidecarCorrelationPlaceholder: localize(
      "task-dashboard-synthesis-sidecar-correlation-placeholder",
      "correlation / request / operation / attempt",
    ),
    synthesisSidecarEmpty: localize(
      "task-dashboard-synthesis-sidecar-empty",
      "No sidecar traces in this debug session.",
    ),
    synthesisSidecarFilterLabel: localize(
      "task-dashboard-synthesis-sidecar-filter-label",
      "Trace / operation / capability",
    ),
    synthesisSidecarFilterPlaceholder: localize(
      "task-dashboard-synthesis-sidecar-filter-placeholder",
      "Filter traces",
    ),
    synthesisSidecarColOutcome: localize(
      "task-dashboard-synthesis-sidecar-col-outcome",
      "Outcome",
    ),
    synthesisSidecarColTrace: localize(
      "task-dashboard-synthesis-sidecar-col-trace",
      "Trace",
    ),
    synthesisSidecarColOperation: localize(
      "task-dashboard-synthesis-sidecar-col-operation",
      "Operation",
    ),
    synthesisSidecarColStarted: localize(
      "task-dashboard-synthesis-sidecar-col-started",
      "Started",
    ),
    synthesisSidecarColSpans: localize(
      "task-dashboard-synthesis-sidecar-col-spans",
      "Spans",
    ),
    synthesisSidecarColDropped: localize(
      "task-dashboard-synthesis-sidecar-col-dropped",
      "Dropped",
    ),
    synthesisSidecarDetailTitle: localize(
      "task-dashboard-synthesis-sidecar-detail-title",
      "Causal trace",
    ),
    synthesisSidecarDetailEmpty: localize(
      "task-dashboard-synthesis-sidecar-detail-empty",
      "No trace selected",
    ),
    synthesisSidecarCopy: localize(
      "task-dashboard-synthesis-sidecar-copy",
      "Copy trace",
    ),
    synthesisSidecarCopyToast: localize(
      "task-dashboard-synthesis-sidecar-copy-toast",
      "Trace copied",
    ),
    synthesisSidecarSummaryTraces: localize(
      "task-dashboard-synthesis-sidecar-summary-traces",
      "Traces",
    ),
    synthesisSidecarSummaryEvents: localize(
      "task-dashboard-synthesis-sidecar-summary-events",
      "Events",
    ),
    synthesisSidecarSummaryActive: localize(
      "task-dashboard-synthesis-sidecar-summary-active",
      "Active",
    ),
    synthesisSidecarSummaryDropped: localize(
      "task-dashboard-synthesis-sidecar-summary-dropped",
      "Dropped",
    ),
    skillRunnerConnectionAuditTabTitle: localize(
      "task-dashboard-skillrunner-audit-tab-title",
      "SkillRunner Connection Audit",
    ),
    skillRunnerConnectionAuditTitle: localize(
      "task-dashboard-skillrunner-audit-title",
      "SkillRunner Connection Audit",
    ),
    skillRunnerConnectionAuditEmpty: localize(
      "task-dashboard-skillrunner-audit-empty",
      "No SkillRunner connection events.",
    ),
    skillRunnerConnectionAuditCopyJson: localize(
      "task-dashboard-skillrunner-audit-copy-json",
      "Copy JSON",
    ),
    skillRunnerConnectionAuditCopied: localize(
      "task-dashboard-skillrunner-audit-copied",
      "Connection audit JSON copied.",
    ),
    skillRunnerConnectionAuditMetricActive: localize(
      "task-dashboard-skillrunner-audit-metric-active",
      "Active connections",
    ),
    skillRunnerConnectionAuditMetricQueued: localize(
      "task-dashboard-skillrunner-audit-metric-queued",
      "Queued requests",
    ),
    skillRunnerConnectionAuditMetricStreams: localize(
      "task-dashboard-skillrunner-audit-metric-streams",
      "Streams",
    ),
    skillRunnerConnectionAuditMetricTimeouts: localize(
      "task-dashboard-skillrunner-audit-metric-timeouts",
      "Timeouts",
    ),
    skillRunnerConnectionAuditMetricLate: localize(
      "task-dashboard-skillrunner-audit-metric-late",
      "Late settlements",
    ),
    skillRunnerConnectionAuditByBackend: localize(
      "task-dashboard-skillrunner-audit-by-backend",
      "By backend",
    ),
    skillRunnerConnectionAuditByLane: localize(
      "task-dashboard-skillrunner-audit-by-lane",
      "By lane",
    ),
    skillRunnerConnectionAuditEvents: localize(
      "task-dashboard-skillrunner-audit-events",
      "Recent events",
    ),
    skillRunnerConnectionAuditColEvent: localize(
      "task-dashboard-skillrunner-audit-col-event",
      "Event",
    ),
    skillRunnerConnectionAuditColLane: localize(
      "task-dashboard-skillrunner-audit-col-lane",
      "Lane",
    ),
    skillRunnerConnectionAuditColOperation: localize(
      "task-dashboard-skillrunner-audit-col-operation",
      "Operation",
    ),
    skillRunnerConnectionAuditColDuration: localize(
      "task-dashboard-skillrunner-audit-col-duration",
      "Duration",
    ),
    skillRunnerConnectionAuditColReason: localize(
      "task-dashboard-skillrunner-audit-col-reason",
      "Reason",
    ),
    skillRunnerConnectionAuditMetricPhysicalDebt: localize(
      "task-dashboard-skillrunner-audit-metric-physical-debt",
      "Physical debt",
    ),
    skillRunnerConnectionAuditMetricDegradedBackends: localize(
      "task-dashboard-skillrunner-audit-metric-degraded-backends",
      "Degraded backends",
    ),
    skillRunnerConnectionAuditMetricSkippedLowPriority: localize(
      "task-dashboard-skillrunner-audit-metric-skipped-low-priority",
      "Skipped low-priority",
    ),
    skillRunnerConnectionAuditByPhysicalDebt: localize(
      "task-dashboard-skillrunner-audit-by-physical-debt",
      "Physical debt",
    ),
    runtimeLogsClear: localize(
      "task-dashboard-runtime-logs-clear",
      "Clear Logs",
    ),
    runtimeLogsCopySelected: localize(
      "task-dashboard-runtime-logs-copy-selected",
      "Copy Selected",
    ),
    runtimeLogsCopyDetail: localize(
      "task-dashboard-runtime-logs-copy-detail",
      "Copy Log",
    ),
    runtimeLogsCopyVisibleNDJSON: localize(
      "task-dashboard-runtime-logs-copy-visible-ndjson",
      "Copy Visible (NDJSON)",
    ),
    runtimeLogsCopyIssueSummary: localize(
      "task-dashboard-runtime-logs-copy-issue-summary",
      "Copy Issue Summary",
    ),
    runtimeLogsCopyDiagnosticBundle: localize(
      "task-dashboard-runtime-logs-copy-diagnostic-bundle",
      "Copy Diagnostic Bundle",
    ),
    runtimeLogsDiagnosticMode: localize(
      "task-dashboard-runtime-logs-diagnostic-mode",
      "Diagnostic Mode",
    ),
    runtimeLogsBudget: localize("log-viewer-budget", "Budget: { $value }"),
    runtimeLogsClearContext: localize(
      "task-dashboard-runtime-logs-clear-context",
      "Clear Context",
    ),
    runtimeLogsSelectToView: localize(
      "task-dashboard-runtime-logs-select-to-view",
      "Select a log entry to view details.",
    ),
    runtimeLogsFilterBackend: localize(
      "task-dashboard-runtime-logs-filter-backend",
      "Backend",
    ),
    runtimeLogsFilterWorkflow: localize(
      "task-dashboard-runtime-logs-filter-workflow",
      "Workflow",
    ),
    runtimeLogsFilterAll: localize(
      "task-dashboard-runtime-logs-filter-all",
      "All",
    ),
    runtimeLogsCopySuccessBundle: localize(
      "task-dashboard-runtime-logs-copy-success-bundle",
      "Diagnostic bundle copied to clipboard!",
    ),
    runtimeLogsCopySuccessIssue: localize(
      "task-dashboard-runtime-logs-copy-success-issue",
      "Issue summary copied to clipboard!",
    ),
    runtimeLogsCopySuccess: localize(
      "task-dashboard-runtime-logs-copy-success",
      "Copied { $count } log entries to clipboard!",
    ),
    productsEmpty:
      getWorkflowProductMigrationStatus().state === "failed"
        ? localize(
            "task-dashboard-products-migration-incomplete",
            "Product storage migration is incomplete. Restart Zotero to retry.",
          )
        : localize(
            "task-dashboard-products-empty",
            "No workflow products have been registered yet.",
          ),
    productsNoFiles: localize(
      "task-dashboard-products-no-files",
      "No product files.",
    ),
    productsRawMarkdown: localize(
      "task-dashboard-products-raw-markdown",
      "Raw Markdown",
    ),
    productsSelectFile: localize(
      "task-dashboard-products-select-file",
      "Select a file to preview.",
    ),
    productsOpenWorkspace: localize(
      "task-dashboard-products-open-workspace",
      "Export Product",
    ),
    productsOpenRun: localize("task-dashboard-products-open-run", "Open Run"),
    productsRemove: localize(
      "task-dashboard-products-remove",
      "Remove From Products",
    ),
    productsPreviewUnavailable: localize(
      "task-dashboard-products-preview-unavailable",
      "Select a file to preview.",
    ),
    productsListTitle: localize(
      "task-dashboard-products-list-title",
      "Products",
    ),
    productsListCollapse: localize(
      "task-dashboard-products-list-collapse",
      "Collapse product list",
    ),
    productsListExpand: localize(
      "task-dashboard-products-list-expand",
      "Expand product list",
    ),
    productsListRail: localize("task-dashboard-products-list-rail", "Products"),
    productsSectionFiles: localize(
      "task-dashboard-products-section-files",
      "Products",
    ),
    productsSectionFeedback: localize(
      "task-dashboard-products-section-feedback",
      "Skill Feedback",
    ),
    productsViewerWrap: localize("task-dashboard-products-viewer-wrap", "Wrap"),
    productsViewerCopy: localize("task-dashboard-products-viewer-copy", "Copy"),
    productsViewerCopied: localize(
      "task-dashboard-products-viewer-copied",
      "Copied",
    ),
    productsViewerCopyFailed: localize(
      "task-dashboard-products-viewer-copy-failed",
      "Copy failed",
    ),
    feedbackEmpty: localize(
      "task-dashboard-feedback-empty",
      "No skill feedback has been collected yet.",
    ),
    feedbackFilterSkill: localize(
      "task-dashboard-feedback-filter-skill",
      "Skill",
    ),
    feedbackFilterAllSkills: localize(
      "task-dashboard-feedback-filter-all-skills",
      "All skills",
    ),
    feedbackSelectAll: localize(
      "task-dashboard-feedback-select-all",
      "Select all",
    ),
    feedbackExportSelected: localize(
      "task-dashboard-feedback-export-selected",
      "Export Selected",
    ),
    feedbackDeleteSelected: localize(
      "task-dashboard-feedback-delete-selected",
      "Delete Selected",
    ),
    feedbackDeleteAll: localize(
      "task-dashboard-feedback-delete-all",
      "Delete All",
    ),
    feedbackExportEmpty: localize(
      "task-dashboard-feedback-export-empty",
      "Select at least one feedback record to export.",
    ),
    feedbackExportSuccess: localize(
      "task-dashboard-feedback-export-success",
      "Skill feedback export file created.",
    ),
    runtimeLogsContextScope: localize(
      "task-dashboard-runtime-logs-context-scope",
      "Active Context Filters: ",
    ),
    homeWorkflowTitle: localize(
      "task-dashboard-home-workflows-title",
      "Workflows",
    ),
    homeWorkflowDocButton: localize(
      "task-dashboard-home-workflow-doc",
      "Description",
    ),
    homeWorkflowRunButton: localize(
      "task-dashboard-home-workflow-run",
      "Run workflow",
    ),
    homeWorkflowSettingsButton: localize(
      "task-dashboard-home-workflow-settings",
      "Settings",
    ),
    homeWorkflowBuiltinBadge: localize(
      "task-dashboard-home-workflow-builtin",
      "Official",
    ),
    homeWorkflowCoreBadge: localize(
      "task-dashboard-home-workflow-core",
      "Core",
    ),
    homeWorkflowDocMissingReadme: localize(
      "task-dashboard-home-workflow-doc-missing-readme",
      "README.md was not found for this workflow.",
    ),
    homeWorkflowDocBack: localize(
      "task-dashboard-home-workflow-doc-back",
      "Back to Dashboard",
    ),
    homeSummaryTitle: localize(
      "task-dashboard-home-summary-title",
      "Task Summary",
    ),
    backendUnavailable: localize(
      "task-dashboard-skillrunner-backend-unavailable",
      "Backend {backend} is temporarily unreachable. Please try again later.",
    ),
    backendUnavailableTag: localize(
      "task-dashboard-backend-unavailable-tag",
      "Unavailable",
    ),
  };

  const tabs = [
    {
      key: "home",
      label: labels.home,
      group: "system" as const,
    },
    {
      key: "workflow-options",
      label: labels.tabWorkflowOptions,
      group: "system" as const,
    },
    {
      key: "products",
      label: labels.tabProducts,
      group: "system" as const,
    },
    {
      key: "runtime-logs",
      label: labels.runtimeLogsTabTitle,
      group: "system" as const,
    },
    {
      key: "migrations",
      label: labels.tabMigrations,
      group: "system" as const,
    },
    ...(synthesisSidecarDiagnosticsEnabled
      ? [
          {
            key: "synthesis-sidecar",
            label: labels.synthesisSidecarTabTitle,
            group: "system" as const,
          },
        ]
      : []),
    ...(skillRunnerConnectionAuditEnabled
      ? [
          {
            key: "skillrunner-connection-audit",
            label: labels.skillRunnerConnectionAuditTabTitle,
            group: "system" as const,
          },
        ]
      : []),
    ...(acpTraceRecorderEnabled || acpReplayProfilerEnabled
      ? [
          {
            key: "acp-trace-replay",
            label: labels.acpTraceReplayTabTitle,
            group: "system" as const,
          },
        ]
      : []),
    ...args.backends.map((backend) => {
      const backendId = String(backend.id || "").trim();
      const backendType = String(backend.type || "").trim();
      const backendDisplayName = resolveBackendDisplayName(
        backend.id,
        backend.displayName,
      );
      const disabled = isBackendReconcileFlagged({
        backendId,
        backendType,
      });
      return {
        key: toBackendTabKey(backend.id),
        label: `${backendDisplayName} (${backend.type})`,
        group: "backend" as const,
        backendId: backend.id,
        backendType: backend.type,
        disabled,
        disabledReason: disabled
          ? resolveBackendUnavailableMessageForDialog({
              backendId,
              backendDisplayName,
            })
          : undefined,
      };
    }),
  ];

  const resolvedSelectedTabKey = args.state.selectedTabKey;
  const selectedBackendId = fromBackendTabKey(resolvedSelectedTabKey);
  const selectedBackend = args.backends.find(
    (entry) => entry.id === selectedBackendId,
  );

  const snapshot: DashboardSnapshot = {
    generatedAt: new Date().toISOString(),
    title: localize("task-dashboard-title", "Task Dashboard"),
    labels,
    selectedTabKey: resolvedSelectedTabKey,
    tabs,
    summary: {
      total: summary.total,
      running: runningRows.length,
      succeeded: summary.succeeded,
      failed: summary.failed,
      canceled: summary.canceled,
    },
    runningRows,
    homeWorkflows,
    homeWorkflowDocView,
    backendLoadError: args.state.backendLoadError,
    literatureArtifactMigrationView: buildLiteratureArtifactMigrationView(
      args.state,
    ),
  };

  if (
    synthesisSidecarDiagnosticsEnabled &&
    resolvedSelectedTabKey === "synthesis-sidecar"
  ) {
    const { readSynthesisSidecarTraceSnapshot } =
      await import("../synthesis/sidecar/synthesisSidecarTrace");
    snapshot.synthesisSidecarView = {
      traceSnapshot: readSynthesisSidecarTraceSnapshot(),
    };
    return finalizeDashboardSnapshot(snapshot);
  }

  if (resolvedSelectedTabKey === "workflow-options") {
    snapshot.workflowOptionsView = await buildWorkflowOptionsView({
      state: args.state,
      backends: args.backends,
    });
    return finalizeDashboardSnapshot(snapshot);
  }

  if (resolvedSelectedTabKey === "products") {
    const allProducts = listWorkflowProducts();
    const products = allProducts.filter(
      (entry) => entry.kind !== WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK,
    );
    const feedbackSkillOptions = Array.from(
      new Set(
        listSkillRunFeedbackProducts()
          .map((entry) => String(entry.metadata?.skillId || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
    if (
      args.state.feedbackSkillFilter &&
      !feedbackSkillOptions.includes(args.state.feedbackSkillFilter)
    ) {
      args.state.feedbackSkillFilter = "";
    }
    const feedbackProducts = listSkillRunFeedbackProducts(
      args.state.feedbackSkillFilter,
    );
    const section = args.state.selectedProductSection || "products";
    const selectedProduct =
      products.find(
        (entry) => entry.productId === args.state.selectedProductId,
      ) ||
      products[0] ||
      null;
    args.state.selectedProductId = selectedProduct?.productId || "";
    const selectedAsset =
      selectedProduct?.assets.find(
        (entry) => entry.assetId === args.state.selectedProductAssetId,
      ) ||
      selectedProduct?.assets[0] ||
      null;
    args.state.selectedProductAssetId = selectedAsset?.assetId || "";
    let selectedPreview: DashboardWorkflowProductPreview | undefined;
    if (selectedProduct && selectedAsset) {
      selectedPreview = await readProductAssetPreview(
        selectedProduct.productId,
        selectedAsset.assetId,
      );
    }
    const selectedFeedbackProduct =
      feedbackProducts.find(
        (entry) => entry.productId === args.state.selectedFeedbackProductId,
      ) ||
      feedbackProducts[0] ||
      null;
    args.state.selectedFeedbackProductId =
      selectedFeedbackProduct?.productId || "";
    for (const selectedId of Array.from(
      args.state.selectedFeedbackProductIds,
    )) {
      if (!feedbackProducts.some((entry) => entry.productId === selectedId)) {
        args.state.selectedFeedbackProductIds.delete(selectedId);
      }
    }
    let selectedFeedbackPreview: DashboardWorkflowProductPreview | undefined;
    if (selectedFeedbackProduct) {
      const feedbackAsset =
        selectedFeedbackProduct.assets.find(
          (entry) => entry.assetId === SKILL_RUN_FEEDBACK_ASSET_ID,
        ) || selectedFeedbackProduct.assets[0];
      if (feedbackAsset) {
        selectedFeedbackPreview = await readProductAssetPreview(
          selectedFeedbackProduct.productId,
          feedbackAsset.assetId,
        );
      }
    }
    snapshot.productStorageView = {
      section,
      products,
      selectedProduct: selectedProduct || undefined,
      selectedAssetId: selectedAsset?.assetId,
      selectedPreview,
      feedbackProducts,
      feedbackSkillOptions,
      feedbackSkillFilter: args.state.feedbackSkillFilter,
      selectedFeedbackProduct: selectedFeedbackProduct || undefined,
      selectedFeedbackProductIds: Array.from(
        args.state.selectedFeedbackProductIds,
      ),
      selectedFeedbackPreview,
      isExporting: args.state.productExportInProgress,
    };
    return finalizeDashboardSnapshot(snapshot);
  }

  if (resolvedSelectedTabKey === "runtime-logs") {
    const { getRuntimeLogDiagnosticMode, getRuntimeLogSummary } =
      await import("../runtimeLogManager");
    const diagnosticMode = getRuntimeLogDiagnosticMode();
    const logSummary = getRuntimeLogSummary();
    const runtimeLogFilters = normalizeRuntimeLogFilters(
      args.state.runtimeLogFilters,
    );
    args.state.runtimeLogFilters = runtimeLogFilters;
    const rawLogs = listRuntimeLogs({
      ...(runtimeLogFilters as any),
      order: "desc",
      limit: 300,
    });
    const { getVisibleLoadedWorkflowEntries } =
      await import("../workflow/catalog/workflowVisibility");
    const loadedWorkflows = getVisibleLoadedWorkflowEntries();

    const mappedBackends = logSummary.facets.backendIds.sort().map((bId) => {
      const foundBackend = args.backends.find((b) => b.id === bId);
      return {
        value: bId,
        label: foundBackend
          ? resolveBackendDisplayName(bId, foundBackend.displayName)
          : bId,
      };
    });

    const mappedWorkflows = logSummary.facets.workflowIds.sort().map((wId) => {
      const match = loadedWorkflows.find((w) => w.manifest.id === wId);
      return {
        value: wId,
        label: match ? localizeWorkflowLabel(match) : wId,
      };
    });

    snapshot.runtimeLogsView = {
      filters: runtimeLogFilters,
      diagnosticMode,
      totalEntries: logSummary.entryCount,
      budget: {
        maxEntries: logSummary.maxEntries,
        maxBytes: logSummary.maxBytes,
        estimatedBytes: logSummary.estimatedBytes,
        droppedEntries: logSummary.droppedEntries,
        droppedByReason: logSummary.droppedByReason,
        retentionMode: logSummary.retentionMode,
        maxImportantEntries: logSummary.maxImportantEntries,
        importantEntryCount: logSummary.importantEntryCount,
      },
      logs: rawLogs.map((entry) => mapLogRow(entry)),
      selectedEntryIds: Array.from(args.state.runtimeLogSelectedIdSet),
      filterOptions: {
        backends: mappedBackends,
        workflows: mappedWorkflows,
      },
    };
    return finalizeDashboardSnapshot(snapshot);
  }

  if (
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    __skillrunner_connection_audit_enabled__ &&
    skillRunnerConnectionAuditEnabled &&
    resolvedSelectedTabKey === "skillrunner-connection-audit"
  ) {
    const { getSkillRunnerConnectionGovernorSnapshot } =
      await import("../skillRunner/connection/skillRunnerConnectionAudit");
    snapshot.skillRunnerConnectionAuditView = {
      generatedAt: new Date().toISOString(),
      governor: getSkillRunnerConnectionGovernorSnapshot(),
    };
    return finalizeDashboardSnapshot(snapshot);
  }

  if (
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    resolvedSelectedTabKey === "acp-trace-replay"
  ) {
    if (
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      acpTraceRecorderEnabled
    ) {
      const { getAcpRuntimeSemanticTraceRecorderView } =
        await import("../acp/diagnostics/acpRuntimeSemanticTraceRecorder");
      snapshot.acpTraceRecorderView = getAcpRuntimeSemanticTraceRecorderView();
    }
    if (__acp_runtime_replay_profiler_enabled__ && acpReplayProfilerEnabled) {
      const { getAcpRuntimeReplayControllerView } =
        await import("../acp/diagnostics/acpRuntimeReplayController");
      snapshot.acpReplayProfilerView = getAcpRuntimeReplayControllerView();
    }
    return finalizeDashboardSnapshot(snapshot);
  }

  if (!selectedBackend) {
    return finalizeDashboardSnapshot(snapshot);
  }

  const rows = mergeDashboardTaskRows({
    backendId: selectedBackend.id,
    history: args.history,
    active: args.active,
  }).map((entry) =>
    mapTaskRowWithMeta(entry, {
      backendMetaById,
    }),
  );

  const backendView: DashboardSnapshot["backendView"] = {
    backendId: selectedBackend.id,
    backendType: selectedBackend.type,
    backendBaseUrl: selectedBackend.baseUrl,
    selectedSubview: isSkillRunnerBackend(selectedBackend)
      ? args.state.selectedBackendSubviewById.get(selectedBackend.id) || "runs"
      : undefined,
    managementUiUrl: isSkillRunnerBackend(selectedBackend)
      ? maybeBuildSkillRunnerManagementUiUrl(selectedBackend.baseUrl)
      : undefined,
    title: isSkillRunnerBackend(selectedBackend)
      ? localize(
          "task-dashboard-skillrunner-title",
          "SkillRunner Backend: {id}",
          {
            args: {
              id: resolveBackendDisplayName(
                selectedBackend.id,
                selectedBackend.displayName,
              ),
            },
          },
        )
      : isAcpBackend(selectedBackend)
        ? localize("task-dashboard-acp-backend-title", "ACP Backend: {id}", {
            args: {
              id: resolveBackendDisplayName(
                selectedBackend.id,
                selectedBackend.displayName,
              ),
            },
          })
        : localize(
            "task-dashboard-generic-title",
            "Generic HTTP Backend: {id}",
            {
              args: {
                id: resolveBackendDisplayName(
                  selectedBackend.id,
                  selectedBackend.displayName,
                ),
              },
            },
          ),
    rows,
    emptyRowsText: labels.backendNoTasks,
    logRows: [],
  };

  if (isSkillRunnerBackend(selectedBackend)) {
    backendView.rows = [
      ...projectDashboardQueuedRows({
        backend: selectedBackend,
        queuedStateLabel: resolveStatusLabel("queued"),
        queued: workflowSubmissionQueue.listQueued({
          backendType: "skillrunner",
          backendId: selectedBackend.id,
        }),
      }),
      ...backendView.rows,
    ];
    snapshot.backendView = backendView;
    return finalizeDashboardSnapshot(snapshot);
  }

  if (isAcpBackend(selectedBackend)) {
    backendView.rows = [
      ...projectDashboardQueuedRows({
        backend: selectedBackend,
        queuedStateLabel: resolveStatusLabel("queued"),
        queued: workflowSubmissionQueue.listQueued({
          backendType: "acp",
          backendId: selectedBackend.id,
        }),
      }),
      ...mergeAcpBackendTaskRows({
        backendId: selectedBackend.id,
        backendMetaById,
      }),
    ];
    backendView.emptyRowsText =
      backendView.emptyRowsText ||
      labels.backendNoTasks ||
      "No ACP skill runs.";
    snapshot.backendView = backendView;
    return finalizeDashboardSnapshot(snapshot);
  }

  const selectedLogTaskId =
    args.state.selectedLogTaskByBackendId.get(selectedBackend.id) ||
    rows[0]?.id ||
    "";
  if (selectedLogTaskId) {
    args.state.selectedLogTaskByBackendId.set(
      selectedBackend.id,
      selectedLogTaskId,
    );
  } else {
    args.state.selectedLogTaskByBackendId.delete(selectedBackend.id);
  }
  backendView.selectedLogTaskId = selectedLogTaskId || undefined;
  const selectedRow = rows.find((entry) => entry.id === selectedLogTaskId);
  if (selectedRow) {
    backendView.selectedLogTaskRequestId = selectedRow.requestId;
    backendView.selectedLogTaskJobId = selectedRow.jobId;
    const logs = listRuntimeLogs({
      ...toLogFilter(selectedRow),
      order: "desc",
      limit: 300,
    }).map((entry) => mapLogRow(entry));
    backendView.logRows = logs;
    const selectedLogEntryId =
      args.state.selectedLogEntryByBackendId.get(selectedBackend.id) ||
      logs[0]?.id ||
      "";
    if (selectedLogEntryId) {
      args.state.selectedLogEntryByBackendId.set(
        selectedBackend.id,
        selectedLogEntryId,
      );
    } else {
      args.state.selectedLogEntryByBackendId.delete(selectedBackend.id);
    }
    backendView.selectedLogEntryId = selectedLogEntryId || undefined;
    backendView.selectedLogEntryPayload =
      logs.find((entry) => entry.id === selectedLogEntryId)?.detailPayload ||
      undefined;
  } else {
    args.state.selectedLogEntryByBackendId.delete(selectedBackend.id);
    backendView.logRows = [];
    backendView.selectedLogEntryId = undefined;
    backendView.selectedLogEntryPayload = undefined;
  }
  snapshot.backendView = backendView;
  return finalizeDashboardSnapshot(snapshot);
}

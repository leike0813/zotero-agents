import type { DialogHelper } from "zotero-plugin-toolkit";
import { loadBackendsRegistry } from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import {
  ACP_SKILL_RUN_REQUEST_KIND,
  PASS_THROUGH_BACKEND_TYPE,
} from "../config/defaults";
import { getString } from "../utils/locale";
import { resolveSkillRunnerBackendUnavailableToastText } from "../utils/localizationGovernance";
import { resolveBackendDisplayName } from "../backends/displayName";
import { isWindowAlive } from "../utils/window";
import {
  listRuntimeLogs,
  type RuntimeLogListFilters,
} from "./runtimeLogManager";
import {
  cleanupTaskDashboardHistory,
  listTaskDashboardHistory,
  summarizeTaskDashboardHistory,
  summarizeTaskDashboardHistoryScope,
  updateTaskDashboardHistoryStateByRequest,
  type TaskDashboardHistorySummary,
  type TaskDashboardHistoryRecord,
} from "./taskDashboardHistory";
import {
  mergeDashboardTaskRows,
  normalizeDashboardBackends,
  normalizeDashboardTabKey,
} from "./taskDashboardSnapshot";
import { getLoadedWorkflowSourceById } from "./workflowRuntime";
import {
  listActiveWorkflowTaskSummaries,
  subscribeWorkflowTaskChanges,
  updateWorkflowTaskStateByRequest,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import { filterDashboardActiveTasks } from "./dashboardActiveTasks";
import { buildSkillRunnerManagementUiUrl } from "./skillRunnerManagementDialog";
import { isDebugModeEnabled } from "./debugMode";
import {
  getSkillRunnerConnectionGovernorSnapshot,
  type SkillRunnerConnectionGovernorSnapshot,
} from "./skillRunnerConnectionGovernor";
import { refreshSkillRunnerModelCacheForBackend } from "../providers/skillrunner/modelCache";
import { config } from "../../package.json";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { buildSkillRunnerManagementClient } from "./skillRunnerManagementClientFactory";
import { isSkillRunnerRunTerminalClientError } from "../providers/skillrunner/errors";
import {
  resolveSkillRunnerManagementResponseSemantic,
  settleSkillRunnerRunAsFailed,
} from "./skillRunnerRunSettlement";
import { joinPath } from "../utils/path";
import {
  buildWorkflowSettingsUiDescriptor,
  getWorkflowSettingsRevision,
  updateWorkflowSettings,
  type WorkflowSettingsUiDescriptor,
} from "./workflowSettings";
import { triggerWorkflowFromUnifiedEntry } from "./workflowMenu";
import { canWorkflowRunWithoutSelection } from "./workflowSelectionPolicy";
import type { WorkflowExecutionOptions } from "./workflowSettingsDomain";
import {
  compareWorkflowDisplayOrder,
  isCoreWorkflow,
  localizeWorkflowLabel,
} from "../workflows/localization";
import {
  isTerminal,
  isWaiting,
  normalizeStatus,
} from "./skillRunnerProviderStateMachine";
import {
  isSkillRunnerBackendAvailable,
  subscribeSkillRunnerBackendHealth,
} from "./skillRunnerBackendHealthRegistry";
import { stopSessionSync } from "./skillRunnerSessionSyncManager";
import { getVisibleLoadedWorkflowEntries } from "./workflowVisibility";
import {
  buildAcpSkillRunPanelSnapshot,
  cancelAcpSkillRun,
  listAcpSkillRunSummaries,
  selectAcpSkillRun,
  subscribeAcpSkillRunSnapshots,
  type AcpSkillRunSummary,
} from "./acpSkillRunStore";
import { openAssistantWorkspaceSidebar } from "./assistantWorkspaceSidebar";
import {
  getWorkflowProduct,
  listWorkflowProducts,
  listSkillRunFeedbackProducts,
  readProductAssetPreview,
  removeWorkflowProduct,
  exportSkillRunFeedbackMarkdownFile,
  SKILL_RUN_FEEDBACK_ASSET_ID,
  WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK,
  type WorkflowProductPreview,
} from "./workflowProductStore";
import { openFolderInSystemFileManager } from "../utils/fileSystem";
import {
  recordBackgroundRefreshRead,
  registerBackgroundRefreshTimer,
} from "./backgroundRefreshGovernance";

type DashboardState = {
  backends: BackendInstance[];
  backendLoadError?: string;
  selectedTabKey: string;
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
  runtimeLogFilters: {
    levels?: string[];
    diagnosticMode?: boolean;
    workflowId?: string | string[];
    requestId?: string;
    jobId?: string;
    backendId?: string | string[];
    backendType?: string;
    runId?: string;
  };
  runtimeLogSelectedIdSet: Set<string>;
  homeWorkflowDocWorkflowId: string;
  selectedProductId: string;
  selectedProductAssetId: string;
  selectedProductSection: "products" | "feedback";
  selectedFeedbackProductId: string;
  feedbackSkillFilter: string;
  selectedFeedbackProductIds: Set<string>;
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

type DashboardRow = {
  id: string;
  workflowId: string;
  workflowLabel: string;
  backendId: string;
  backendType: string;
  backendLabel: string;
  taskName: string;
  state: string;
  stateSemantics: {
    normalized: string;
    terminal: boolean;
    waiting: boolean;
  };
  stateLabel: string;
  runKey?: string;
  requestId?: string;
  requestKind?: string;
  skillId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  workflowRunId?: string;
  engine?: string;
  jobId: string;
  runId: string;
  createdAt: string;
  updatedAt: string;
};

type DashboardLogRow = {
  id: string;
  ts: string;
  level: string;
  scope: string;
  stage: string;
  message: string;
  workflowId?: string;
  requestId?: string;
  jobId?: string;
  detailPayload: unknown;
};

type DashboardSnapshot = {
  generatedAt: string;
  title: string;
  labels: Record<string, string>;
  selectedTabKey: string;
  tabs: Array<{
    key: string;
    label: string;
    backendId?: string;
    backendType?: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  summary: {
    total: number;
    running: number;
    succeeded: number;
    failed: number;
    canceled: number;
  };
  runningRows: DashboardRow[];
  homeWorkflows?: Array<{
    workflowId: string;
    workflowLabel: string;
    providerId: string;
    configurable: boolean;
    official: boolean;
    core: boolean;
    quickRunEnabled: boolean;
    quickRunDisabledReason?: string;
  }>;
  acpSkillRunsView?: ReturnType<typeof buildAcpSkillRunPanelSnapshot>;
  productStorageView?: {
    section: "products" | "feedback";
    products: ReturnType<typeof listWorkflowProducts>;
    selectedProduct?: ReturnType<typeof getWorkflowProduct>;
    selectedAssetId?: string;
    selectedPreview?: WorkflowProductPreview;
    feedbackProducts?: ReturnType<typeof listSkillRunFeedbackProducts>;
    feedbackSkillOptions?: string[];
    feedbackSkillFilter?: string;
    selectedFeedbackProduct?: ReturnType<typeof getWorkflowProduct>;
    selectedFeedbackProductIds?: string[];
    selectedFeedbackPreview?: WorkflowProductPreview;
  };
  homeWorkflowDocView?: {
    workflowId: string;
    workflowLabel: string;
    html: string;
    markdown: string;
    baseFileUri: string;
    missingReadme: boolean;
  };
  backendLoadError?: string;
  workflowOptionsView?: {
    workflows: Array<{
      workflowId: string;
      workflowLabel: string;
      providerId: string;
    }>;
    selectedWorkflowId: string;
    selectedDescriptor?: WorkflowSettingsUiDescriptor;
    saveState: "idle" | "saving" | "saved" | "error";
    saveError?: string;
  };
  backendView?: {
    backendId: string;
    backendType: string;
    backendBaseUrl: string;
    selectedSubview?: "runs" | "management";
    managementUiUrl?: string;
    title: string;
    rows: DashboardRow[];
    emptyRowsText: string;
    selectedLogTaskId?: string;
    selectedLogTaskRequestId?: string;
    selectedLogTaskJobId?: string;
    logRows: DashboardLogRow[];
    selectedLogEntryId?: string;
    selectedLogEntryPayload?: unknown;
  };
  runtimeLogsView?: {
    filters: DashboardState["runtimeLogFilters"];
    diagnosticMode: boolean;
    totalEntries: number;
    budget: {
      maxEntries: number;
      maxBytes: number;
      estimatedBytes: number;
      droppedEntries: number;
      droppedByReason: {
        entry_limit: number;
        byte_budget: number;
        expired: number;
      };
      retentionMode: string;
    };
    logs: DashboardLogRow[];
    selectedEntryIds: string[];
    filterOptions: {
      backends: { value: string; label: string }[];
      workflows: { value: string; label: string }[];
    };
  };
  skillRunnerConnectionAuditView?: {
    generatedAt: string;
    governor: SkillRunnerConnectionGovernorSnapshot;
  };
  surfaceSignatures?: {
    chrome: string;
    selectedSurface: string;
    selectedSurfaceKey: string;
  };
};

type DashboardActionEnvelope = {
  type: "dashboard:action";
  action: string;
  payload?: Record<string, unknown>;
};

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
  if (surfaceKey === "skillrunner-connection-audit") {
    return {
      surfaceKey,
      governor: snapshot.skillRunnerConnectionAuditView?.governor,
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

export type DashboardManagementHost = {
  mount: (args: {
    backendId: string;
    title: string;
    url: string;
    onClose: () => void;
  }) => void;
  clear: () => void;
};

function resolveDashboardPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/dashboard/index.html?ui=20260521-submit-v1`;
}

let taskManagerDialog: DialogHelper | undefined;
let externalSelectTab:
  | ((args: {
      tabKey?: string;
      workflowId?: string;
      backendSubview?: "runs" | "management";
    }) => void)
  | undefined;

function localize(
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
  const runtime = globalThis as {
    IOUtils?: { readUTF8?: (path: string) => Promise<string> };
  };
  if (typeof runtime.IOUtils?.readUTF8 === "function") {
    return runtime.IOUtils.readUTF8(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(filePath, "utf8") as Promise<string>;
}

function toBackendTabKey(backendId: string) {
  return `backend:${backendId}`;
}

function fromBackendTabKey(tabKey: string) {
  if (!tabKey.startsWith("backend:")) {
    return "";
  }
  return tabKey.slice("backend:".length).trim();
}

function maybeBuildSkillRunnerManagementUiUrl(baseUrl: string) {
  try {
    return buildSkillRunnerManagementUiUrl(baseUrl);
  } catch {
    return "";
  }
}

function compactError(error: unknown) {
  const text = String(error || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "unknown error";
  }
  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}

function applyDashboardManagementStatus(args: {
  backend: BackendInstance;
  requestId: string;
  status: unknown;
  message?: string;
}) {
  const status = normalizeStatus(args.status, "running");
  const updatedAt = new Date().toISOString();
  const error =
    status === "failed" || !isTerminal(status)
      ? String(args.message || "").trim() || undefined
      : undefined;
  updateWorkflowTaskStateByRequest({
    backendId: args.backend.id,
    backendType: args.backend.type,
    requestId: args.requestId,
    state: status,
    backendStatus: status,
    error,
    updatedAt,
  });
  updateTaskDashboardHistoryStateByRequest({
    backendId: args.backend.id,
    requestId: args.requestId,
    state: status,
    error,
    updatedAt,
  });
  if (isTerminal(status)) {
    stopSessionSync({
      backendId: args.backend.id,
      requestId: args.requestId,
    });
  }
  return {
    status,
    error,
    terminal: isTerminal(status),
  };
}

function createManagementContentBrowser(doc: Document, url: string) {
  const createXul = (doc as { createXULElement?: (tag: string) => Element })
    .createXULElement;
  if (typeof createXul === "function") {
    const browser = createXul.call(doc, "browser");
    browser.setAttribute(
      "data-zs-role",
      "skillrunner-management-dashboard-frame",
    );
    browser.setAttribute("disableglobalhistory", "true");
    browser.setAttribute("maychangeremoteness", "true");
    browser.setAttribute("type", "content");
    browser.setAttribute("flex", "1");
    browser.setAttribute("src", url);
    const styled = browser as Element & { style?: CSSStyleDeclaration };
    styled.style?.setProperty("width", "100%");
    styled.style?.setProperty("height", "100%");
    styled.style?.setProperty("min-width", "0");
    styled.style?.setProperty("min-height", "0");
    styled.style?.setProperty("border", "0");
    styled.style?.setProperty("flex", "1 1 auto");
    return browser;
  }
  const frame = doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "skillrunner-management-dashboard-frame");
  frame.setAttribute("title", "SkillRunner Management");
  frame.setAttribute("src", url);
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.minWidth = "0";
  frame.style.minHeight = "0";
  frame.style.border = "0";
  frame.style.flex = "1 1 auto";
  return frame;
}

function normalizeDraftChangedSection(raw: unknown) {
  const section = String(raw || "").trim();
  if (
    section === "backend" ||
    section === "workflowParams" ||
    section === "providerOptions"
  ) {
    return section;
  }
  return "";
}

function normalizeDraftChangedKey(raw: unknown) {
  return String(raw || "").trim();
}

function isWorkflowSettingsStructuralRefreshChange(args: {
  changedSection: string;
  changedKey: string;
}) {
  if (args.changedSection === "backend" && args.changedKey === "backendId") {
    return true;
  }
  if (
    args.changedSection === "providerOptions" &&
    (args.changedKey === "engine" ||
      args.changedKey === "provider_id" ||
      args.changedKey === "model" ||
      args.changedKey === "acpModelProvider" ||
      args.changedKey === "acpModelId")
  ) {
    return true;
  }
  return false;
}

function isSkillRunnerBackend(backend: BackendInstance) {
  return String(backend.type || "").trim() === "skillrunner";
}

function isAcpBackend(backend: BackendInstance) {
  return String(backend.type || "").trim() === "acp";
}

function isAcpSkillRunnerTask(row: {
  backendType?: string;
  requestKind?: string;
}) {
  return (
    String(row.backendType || "").trim() === "acp" &&
    String(row.requestKind || "").trim() === ACP_SKILL_RUN_REQUEST_KIND
  );
}

function filterWorkflowSubmitVisibleBackends(backends: BackendInstance[]) {
  return backends.filter((backend) => {
    if (String(backend.type || "").trim() !== "skillrunner") {
      return true;
    }
    return (
      backend.enabled !== false && isSkillRunnerBackendAvailable(backend.id)
    );
  });
}

function isBackendReconcileFlagged(args: {
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

function resolveBackendUnavailableMessageForDialog(args: {
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
    return localize("task-manager-status-queued", "Queued");
  }
  if (normalized === "running") {
    return localize("task-manager-status-running", "Running");
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

function isTerminalWorkflowTaskState(state: string) {
  return isTerminal(state);
}

function mapTaskRow(task: WorkflowTaskRecord): DashboardRow {
  return mapTaskRowWithMeta(task);
}

function mapAcpSkillRunToWorkflowTask(
  run: AcpSkillRunSummary,
): WorkflowTaskRecord {
  const status =
    run.status === "repairing"
      ? "running"
      : run.pendingPermission
        ? "waiting_user"
        : run.status;
  return {
    id: `acp-skill-run:${run.requestId}`,
    runId: String(run.runId || run.requestId || "").trim() || run.requestId,
    jobId: String(run.jobId || "").trim() || "-",
    requestId: run.requestId,
    workflowId:
      String(run.workflowId || run.skillId || "").trim() || "acp-skill-run",
    workflowLabel:
      String(run.workflowLabel || run.skillId || "").trim() || "ACP Skill Run",
    taskName:
      String(run.taskName || run.workflowLabel || run.skillId || "").trim() ||
      "ACP Skill Run",
    providerId: "acp",
    requestKind: ACP_SKILL_RUN_REQUEST_KIND,
    backendId: run.backendId,
    backendType: run.backendType,
    backendBaseUrl: "",
    engine: String(run.agentFamily || run.acpModelId || "").trim() || undefined,
    state: normalizeStatus(status, "running") as WorkflowTaskRecord["state"],
    error: String(run.error || run.conversationError || "").trim() || undefined,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

function taskMergeKey(row: WorkflowTaskRecord) {
  return String(row.requestId || "").trim() || String(row.id || "").trim();
}

function mergeAcpBackendTaskRows(args: {
  backendId: string;
  history: TaskDashboardHistoryRecord[];
  active: WorkflowTaskRecord[];
  backendMetaById: Map<
    string,
    {
      type?: string;
      displayName?: string;
    }
  >;
}) {
  const backendId = String(args.backendId || "").trim();
  const merged = new Map<string, WorkflowTaskRecord>();
  const accept = (row: WorkflowTaskRecord) => {
    if (String(row.backendId || "").trim() !== backendId) {
      return;
    }
    if (String(row.requestKind || "").trim() !== ACP_SKILL_RUN_REQUEST_KIND) {
      return;
    }
    const key = taskMergeKey(row);
    if (key) {
      merged.set(key, row);
    }
  };
  args.history.forEach((row) => accept({ ...row }));
  listAcpSkillRunSummaries({
    backendId,
  })
    .filter((run) => !run.removedAt && !run.archivedAt)
    .map((run) => mapAcpSkillRunToWorkflowTask(run))
    .forEach(accept);
  args.active.forEach((row) => accept({ ...row }));
  return Array.from(merged.values())
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

function createDashboardFrame(doc: Document, pageUrl: string) {
  const isChromeLocalPage = /^chrome:\/\//i.test(String(pageUrl || ""));
  if (isChromeLocalPage) {
    const frame = doc.createElement("iframe");
    frame.setAttribute("data-zs-role", "task-dashboard-frame");
    frame.src = pageUrl;
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.minHeight = "0";
    frame.style.flex = "1";
    frame.style.border = "none";
    return frame;
  }
  const createXul = (doc as { createXULElement?: (tag: string) => Element })
    .createXULElement;
  if (typeof createXul === "function") {
    const browser = createXul.call(doc, "browser");
    browser.setAttribute("data-zs-role", "task-dashboard-frame");
    browser.setAttribute("disableglobalhistory", "true");
    browser.setAttribute("remote", "true");
    browser.setAttribute("maychangeremoteness", "true");
    browser.setAttribute("type", "content");
    browser.setAttribute("flex", "1");
    browser.setAttribute("src", pageUrl);
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "width",
      "100%",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "height",
      "100%",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "min-height",
      "0",
    );
    (browser as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
      "flex",
      "1",
    );
    return browser;
  }
  const frame = doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "task-dashboard-frame");
  frame.src = pageUrl;
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.minHeight = "0";
  frame.style.flex = "1";
  frame.style.border = "none";
  return frame;
}

function resolveDashboardFrameWindow(frame: Element | null) {
  if (!frame) {
    return null;
  }
  const candidate = frame as Element & { contentWindow?: Window | null };
  return candidate.contentWindow || null;
}

function clearWorkflowSettingsSaveTimer(
  state: DashboardState,
  workflowId: string,
  hostWindow?: Window | null,
) {
  const timerWindow = hostWindow || taskManagerDialog?.window;
  if (!timerWindow) {
    return;
  }
  const keys = Array.from(state.workflowSettingsSaveTimerById.keys()).filter(
    (key) => key === workflowId || key.startsWith(`${workflowId}:`),
  );
  for (const key of keys) {
    const timer = state.workflowSettingsSaveTimerById.get(key);
    if (timer) {
      timerWindow.clearTimeout(timer);
    }
    state.workflowSettingsSaveTimerById.delete(key);
  }
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

async function buildHomeWorkflowSummaries(args: {
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

async function resolveHomeWorkflowQuickRun(args: {
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

async function buildDashboardSnapshot(args: {
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
  let selectedTabKey = normalizeDashboardTabKey({
    requestedTabKey: args.state.selectedTabKey,
    backends: args.backends,
    debugModeEnabled,
  });
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
    tabBackends: localize("task-dashboard-tab-backends", "Backends"),
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
    colTask: localize("task-manager-column-task", "Task"),
    colWorkflow: localize("task-manager-column-workflow", "Workflow"),
    colBackend: localize("task-dashboard-col-backend", "Backend"),
    colStatus: localize("task-manager-column-status", "Status"),
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
    skillRunnerConnectionAuditTabTitle: "SkillRunner 连接审计",
    skillRunnerConnectionAuditTitle: "SkillRunner 连接审计",
    skillRunnerConnectionAuditEmpty: "暂无 SkillRunner 连接事件。",
    skillRunnerConnectionAuditCopyJson: "复制 JSON",
    skillRunnerConnectionAuditCopied: "连接审计 JSON 已复制。",
    skillRunnerConnectionAuditMetricActive: "活跃连接",
    skillRunnerConnectionAuditMetricQueued: "排队请求",
    skillRunnerConnectionAuditMetricStreams: "Stream",
    skillRunnerConnectionAuditMetricTimeouts: "超时",
    skillRunnerConnectionAuditMetricLate: "迟到完成",
    skillRunnerConnectionAuditByBackend: "按后端",
    skillRunnerConnectionAuditByLane: "按 Lane",
    skillRunnerConnectionAuditEvents: "最近事件",
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
    productsEmpty: localize(
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
      "Open Folder",
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
    },
    {
      key: "workflow-options",
      label: labels.tabWorkflowOptions,
    },
    {
      key: "products",
      label: labels.tabProducts,
    },
    {
      key: "runtime-logs",
      label: labels.runtimeLogsTabTitle,
    },
    ...(debugModeEnabled
      ? [
          {
            key: "skillrunner-connection-audit",
            label: labels.skillRunnerConnectionAuditTabTitle,
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
    title: localize("task-manager-title", "Task Dashboard"),
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
  };

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
    let selectedPreview: WorkflowProductPreview | undefined;
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
    let selectedFeedbackPreview: WorkflowProductPreview | undefined;
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
    };
    return finalizeDashboardSnapshot(snapshot);
  }

  if (resolvedSelectedTabKey === "runtime-logs") {
    const { getRuntimeLogDiagnosticMode, snapshotRuntimeLogs } =
      await import("./runtimeLogManager");
    const diagnosticMode = getRuntimeLogDiagnosticMode();
    const logSnapshot = snapshotRuntimeLogs();
    const rawLogs = listRuntimeLogs({
      ...(args.state.runtimeLogFilters as any),
      order: "desc",
      limit: 300,
    });
    const uniqueBackends = new Set<string>();
    const uniqueWorkflows = new Set<string>();
    for (const entry of logSnapshot.entries) {
      if (entry.backendId) uniqueBackends.add(entry.backendId);
      if (entry.workflowId) uniqueWorkflows.add(entry.workflowId);
    }

    const { getVisibleLoadedWorkflowEntries } =
      await import("./workflowVisibility");
    const loadedWorkflows = getVisibleLoadedWorkflowEntries();

    const mappedBackends = Array.from(uniqueBackends)
      .sort()
      .map((bId) => {
        const foundBackend = args.backends.find((b) => b.id === bId);
        return {
          value: bId,
          label: foundBackend
            ? resolveBackendDisplayName(bId, foundBackend.displayName)
            : bId,
        };
      });

    const mappedWorkflows = Array.from(uniqueWorkflows)
      .sort()
      .map((wId) => {
        const match = loadedWorkflows.find((w) => w.manifest.id === wId);
        return {
          value: wId,
          label: match ? localizeWorkflowLabel(match) : wId,
        };
      });

    snapshot.runtimeLogsView = {
      filters: args.state.runtimeLogFilters,
      diagnosticMode,
      totalEntries: logSnapshot.entries.length,
      budget: {
        maxEntries: logSnapshot.maxEntries,
        maxBytes: logSnapshot.maxBytes,
        estimatedBytes: logSnapshot.estimatedBytes,
        droppedEntries: logSnapshot.droppedEntries,
        droppedByReason: logSnapshot.droppedByReason,
        retentionMode: logSnapshot.retentionMode,
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
    debugModeEnabled &&
    resolvedSelectedTabKey === "skillrunner-connection-audit"
  ) {
    snapshot.skillRunnerConnectionAuditView = {
      generatedAt: new Date().toISOString(),
      governor: getSkillRunnerConnectionGovernorSnapshot(),
    };
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
    snapshot.backendView = backendView;
    return finalizeDashboardSnapshot(snapshot);
  }

  if (isAcpBackend(selectedBackend)) {
    backendView.rows = mergeAcpBackendTaskRows({
      backendId: selectedBackend.id,
      history: args.history,
      active: args.active,
      backendMetaById,
    });
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

function normalizeFilteredHistory(args?: {
  backendId?: string;
  requestId?: string;
}) {
  return listTaskDashboardHistory(args).filter(
    (entry) => entry.backendType !== PASS_THROUGH_BACKEND_TYPE,
  );
}

function normalizeFilteredActive(args?: {
  backendId?: string;
  requestId?: string;
}) {
  return filterDashboardActiveTasks({
    activeTasks: listActiveWorkflowTaskSummaries(args),
    acpSkillRuns: listAcpSkillRunSummaries({
      activeOnly: true,
      backendId: args?.backendId,
      requestId: args?.requestId,
    }),
  });
}

type RefreshReason =
  | "init"
  | "user-action"
  | "periodic"
  | "task-update"
  | "backend-health"
  | "backend-load"
  | "save-state";

const DASHBOARD_BACKEND_PERIODIC_REFRESH_MIN_INTERVAL_MS = 5000;
const DASHBOARD_HOME_PERIODIC_REFRESH_MIN_INTERVAL_MS = 15000;

function shouldDashboardReadBackendRows(args: {
  selectedBackendId?: string;
  reason: RefreshReason;
  lastReadAtByBackendId: Map<string, number>;
}) {
  if (!args.selectedBackendId) {
    return false;
  }
  if (args.reason !== "periodic") {
    return true;
  }
  const now = Date.now();
  const lastReadAt =
    args.lastReadAtByBackendId.get(args.selectedBackendId) || 0;
  if (now - lastReadAt < DASHBOARD_BACKEND_PERIODIC_REFRESH_MIN_INTERVAL_MS) {
    return false;
  }
  args.lastReadAtByBackendId.set(args.selectedBackendId, now);
  return true;
}

function buildDashboardBackendsSignature(backends: BackendInstance[]) {
  return backends
    .map((backend) =>
      [
        backend.id,
        backend.type,
        backend.enabled === false ? "disabled" : "enabled",
        backend.displayName || "",
      ].join(":"),
    )
    .sort()
    .join("|");
}

function buildHomeWorkflowSummariesCacheKey(backends: BackendInstance[]) {
  const workflows = getVisibleLoadedWorkflowEntries()
    .map((workflow) =>
      [
        workflow.manifest.id,
        getLoadedWorkflowSourceById(workflow.manifest.id),
      ].join(":"),
    )
    .sort()
    .join("|");
  return [
    workflows,
    isDebugModeEnabled() ? "debug" : "normal",
    buildDashboardBackendsSignature(backends),
    String(getWorkflowSettingsRevision()),
  ].join("||");
}

export async function openTaskManagerDialog(args?: {
  initialTabKey?: string;
  initialWorkflowId?: string;
  initialBackendSubview?: "runs" | "management";
  embeddedRoot?: HTMLElement;
  hostWindow?: Window;
  chromeWindow?: _ZoteroTypes.MainWindow;
  managementHost?: DashboardManagementHost;
}) {
  const isEmbedded = !!args?.embeddedRoot && !!args.hostWindow;
  if (!isEmbedded && isWindowAlive(taskManagerDialog?.window)) {
    if (externalSelectTab) {
      externalSelectTab({
        tabKey: args?.initialTabKey,
        workflowId: args?.initialWorkflowId,
        backendSubview: args?.initialBackendSubview,
      });
    }
    taskManagerDialog?.window?.focus();
    return;
  }

  const state: DashboardState = {
    backends: [],
    selectedTabKey: String(args?.initialTabKey || "home").trim() || "home",
    selectedBackendSubviewById: new Map(),
    selectedLogTaskByBackendId: new Map(),
    selectedLogEntryByBackendId: new Map(),
    selectedWorkflowOptionsWorkflowId: String(
      args?.initialWorkflowId || "",
    ).trim(),
    workflowSettingsDraftById: new Map(),
    workflowSettingsSaveStateById: new Map(),
    workflowSettingsSaveErrorById: new Map(),
    workflowSettingsSaveTimerById: new Map(),
    runtimeLogFilters: {},
    runtimeLogSelectedIdSet: new Set(),
    homeWorkflowDocWorkflowId: "",
    selectedProductId: "",
    selectedProductAssetId: "",
    selectedProductSection: "products",
    selectedFeedbackProductId: "",
    feedbackSkillFilter: "",
    selectedFeedbackProductIds: new Set(),
    homeWorkflowDocCacheByWorkflowId: new Map(),
  };
  const initialBackendId = fromBackendTabKey(state.selectedTabKey);
  if (initialBackendId && args?.initialBackendSubview) {
    state.selectedBackendSubviewById.set(
      initialBackendId,
      args.initialBackendSubview,
    );
  }

  cleanupTaskDashboardHistory();

  let unsubscribeTasks: (() => void) | undefined;
  let unsubscribeBackendHealth: (() => void) | undefined;
  let unsubscribeAcpSkillRuns: (() => void) | undefined;
  let refreshTimer: number | undefined;
  let deferredDashboardRefreshTimer: number | undefined;
  let dashboardRefreshQueued = false;
  const backendRowsReadAtByBackendId = new Map<string, number>();
  let queuedRefreshReason: RefreshReason = "user-action";
  let lastPostedDashboardSignatures:
    | {
        chrome: string;
        selectedSurface: string;
        selectedSurfaceKey: string;
      }
    | undefined;
  const activeRowsCacheByScope = new Map<
    string,
    { revision: number; rows: WorkflowTaskRecord[] }
  >();
  let activeRowsRevision = 0;
  let historySummaryRevision = 0;
  let historySummaryCache:
    | { revision: number; summary: TaskDashboardHistorySummary }
    | undefined;
  let backendsLoaded = false;
  let backendsDirty = true;
  let lastBackendRegistryReadAt = 0;
  let homeWorkflowSummariesDirty = true;
  let homeWorkflowSummariesCache:
    | {
        key: string;
        rows: DashboardSnapshot["homeWorkflows"];
      }
    | undefined;
  let lastHomePeriodicReadAt = 0;
  let frameWindow: Window | null = null;
  let removeMessageListener: (() => void) | undefined;
  const getRuntimeWindow = () =>
    args?.hostWindow || taskManagerDialog?.window || null;
  const getChromeWindow = () =>
    args?.chromeWindow ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const alertRuntimeWindow = (message: string) => {
    const win = getRuntimeWindow();
    if (typeof win?.alert === "function") {
      win.alert(message);
    }
  };
  const confirmRuntimeWindow = (message: string) => {
    const win = getRuntimeWindow();
    if (typeof win?.confirm === "function") {
      return win.confirm(message);
    }
    return true;
  };

  const taskReadScopeKey = (args?: {
    backendId?: string;
    requestId?: string;
  }) =>
    `${String(args?.backendId || "").trim()}|${String(
      args?.requestId || "",
    ).trim()}`;

  const cloneTaskRows = <T extends WorkflowTaskRecord>(rows: T[]) =>
    rows.map((entry) => ({ ...entry }));

  const markTaskSummaryDirty = () => {
    activeRowsRevision += 1;
    historySummaryRevision += 1;
  };

  const isActiveScopeDirty = (scope?: {
    backendId?: string;
    requestId?: string;
  }) => {
    const key = taskReadScopeKey(scope);
    const cached = activeRowsCacheByScope.get(key);
    return !cached || cached.revision !== activeRowsRevision;
  };

  const isHistorySummaryDirty = () =>
    !historySummaryCache ||
    historySummaryCache.revision !== historySummaryRevision;

  const isHomeWorkflowSummariesDirty = () => {
    if (homeWorkflowSummariesDirty || !homeWorkflowSummariesCache) {
      return true;
    }
    return (
      homeWorkflowSummariesCache.key !==
      buildHomeWorkflowSummariesCacheKey(state.backends)
    );
  };

  const refreshConfiguredBackends = async (force = false) => {
    if (backendsLoaded && !force && !backendsDirty) {
      recordBackgroundRefreshRead({
        owner: "task-dashboard-refresh",
        surface: state.selectedTabKey || "home",
        scopeKey: "configured-backends",
        readShape: "cache-hit",
      });
      return;
    }
    try {
      const loaded = await loadBackendsRegistry();
      const nextBackends = normalizeDashboardBackends({
        configured: loaded.backends,
        history: [],
        active: [],
      });
      state.backends = nextBackends;
      backendsLoaded = true;
      backendsDirty = false;
      lastBackendRegistryReadAt = Date.now();
      homeWorkflowSummariesDirty = true;
      state.backendLoadError = loaded.fatalError
        ? compactError(loaded.fatalError)
        : undefined;
    } catch (error) {
      state.backendLoadError = compactError(error);
    }
  };

  const readCachedHistorySummary = (surface: string) => {
    if (
      historySummaryCache &&
      historySummaryCache.revision === historySummaryRevision
    ) {
      recordBackgroundRefreshRead({
        owner: "task-dashboard-refresh",
        surface,
        scopeKey: "dashboard-home",
        readShape: "cache-hit",
      });
      return { ...historySummaryCache.summary };
    }
    cleanupTaskDashboardHistory();
    recordBackgroundRefreshRead({
      owner: "task-dashboard-refresh",
      surface,
      scopeKey: "dashboard-home",
      readShape: "metadata-count",
    });
    const summary = summarizeTaskDashboardHistoryScope();
    historySummaryCache = {
      revision: historySummaryRevision,
      summary,
    };
    recordBackgroundRefreshRead({
      owner: "task-dashboard-refresh",
      surface,
      scopeKey: "dashboard-home",
      readShape: "history-summary",
    });
    return { ...summary };
  };

  const readCachedActiveRows = (
    surface: string,
    scope?: {
      backendId?: string;
      requestId?: string;
    },
  ) => {
    const key = taskReadScopeKey(scope);
    const cached = activeRowsCacheByScope.get(key);
    if (cached && cached.revision === activeRowsRevision) {
      recordBackgroundRefreshRead({
        owner: "task-dashboard-refresh",
        surface,
        scopeKey: scope?.backendId || "dashboard-home",
        readShape: "cache-hit",
      });
      return cloneTaskRows(cached.rows);
    }
    const rows = normalizeFilteredActive(scope);
    activeRowsCacheByScope.set(key, {
      revision: activeRowsRevision,
      rows,
    });
    recordBackgroundRefreshRead({
      owner: "task-dashboard-refresh",
      surface,
      scopeKey: scope?.backendId || "dashboard-home",
      readShape: "active-summary",
    });
    return cloneTaskRows(rows);
  };

  const readCachedHomeWorkflowSummaries = async (
    backends: BackendInstance[],
  ) => {
    const key = buildHomeWorkflowSummariesCacheKey(backends);
    if (
      !homeWorkflowSummariesDirty &&
      homeWorkflowSummariesCache &&
      homeWorkflowSummariesCache.key === key
    ) {
      recordBackgroundRefreshRead({
        owner: "task-dashboard-refresh",
        surface: "home",
        scopeKey: "home-workflows",
        readShape: "cache-hit",
      });
      return homeWorkflowSummariesCache.rows?.map((entry) => ({ ...entry }));
    }
    recordBackgroundRefreshRead({
      owner: "task-dashboard-refresh",
      surface: "home",
      scopeKey: "home-workflows",
      readShape: "model-build",
    });
    const rows = await buildHomeWorkflowSummaries({ backends });
    homeWorkflowSummariesCache = {
      key,
      rows,
    };
    homeWorkflowSummariesDirty = false;
    return rows.map((entry) => ({ ...entry }));
  };

  const pushSnapshot = async (
    messageType: "dashboard:init" | "dashboard:snapshot",
    reason: RefreshReason,
  ) => {
    if (!frameWindow) {
      return;
    }
    const initialSelectedBackendId = fromBackendTabKey(state.selectedTabKey);
    const initialSurfaceKey = initialSelectedBackendId
      ? "backend"
      : state.selectedTabKey || "home";
    const initialTaskReadScope = initialSelectedBackendId
      ? { backendId: initialSelectedBackendId }
      : undefined;
    let periodicBackendRowsAllowed: boolean | undefined;
    if (reason === "periodic") {
      if (
        state.selectedTabKey === "home" &&
        !backendsDirty &&
        !isActiveScopeDirty() &&
        !isHistorySummaryDirty() &&
        !isHomeWorkflowSummariesDirty() &&
        Date.now() - lastHomePeriodicReadAt <
          DASHBOARD_HOME_PERIODIC_REFRESH_MIN_INTERVAL_MS
      ) {
        recordBackgroundRefreshRead({
          owner: "task-dashboard-refresh",
          surface: "home",
          scopeKey: "dashboard-home",
          readShape: "dirty-gate",
        });
        return;
      }
      if (initialSelectedBackendId) {
        periodicBackendRowsAllowed = shouldDashboardReadBackendRows({
          selectedBackendId: initialSelectedBackendId,
          reason,
          lastReadAtByBackendId: backendRowsReadAtByBackendId,
        });
        if (
          !periodicBackendRowsAllowed &&
          !isActiveScopeDirty(initialTaskReadScope)
        ) {
          recordBackgroundRefreshRead({
            owner: "task-dashboard-refresh",
            surface: initialSurfaceKey,
            scopeKey: initialSelectedBackendId,
            readShape: "scope-gate",
          });
          return;
        }
      }
    }
    await refreshConfiguredBackends(
      reason === "init" ||
        reason === "backend-load" ||
        (reason === "periodic" &&
          Date.now() - lastBackendRegistryReadAt > 30000),
    );
    const debugModeEnabled = isDebugModeEnabled();
    state.selectedTabKey = normalizeDashboardTabKey({
      requestedTabKey: state.selectedTabKey,
      backends: state.backends,
      debugModeEnabled,
    });
    const selectedBackendId = fromBackendTabKey(state.selectedTabKey);
    const taskReadScope = selectedBackendId
      ? { backendId: selectedBackendId }
      : undefined;
    const selectedSurfaceKey = selectedBackendId
      ? "backend"
      : state.selectedTabKey || "home";
    const shouldReadBackendRows =
      typeof periodicBackendRowsAllowed === "boolean"
        ? periodicBackendRowsAllowed
        : shouldDashboardReadBackendRows({
            selectedBackendId,
            reason,
            lastReadAtByBackendId: backendRowsReadAtByBackendId,
          });
    if (selectedBackendId && !shouldReadBackendRows) {
      recordBackgroundRefreshRead({
        owner: "task-dashboard-refresh",
        surface: selectedSurfaceKey,
        scopeKey: selectedBackendId,
        readShape: "scope-gate",
      });
      return;
    }
    const shouldReadActive =
      state.selectedTabKey === "home" || !!selectedBackendId;
    const shouldReadHistoryRows = !!selectedBackendId && shouldReadBackendRows;
    const historySummary =
      state.selectedTabKey === "home"
        ? readCachedHistorySummary(selectedSurfaceKey)
        : undefined;
    let history: TaskDashboardHistoryRecord[] = [];
    if (shouldReadHistoryRows) {
      cleanupTaskDashboardHistory();
      history = normalizeFilteredHistory(taskReadScope);
    }
    if (shouldReadHistoryRows) {
      backendRowsReadAtByBackendId.set(selectedBackendId, Date.now());
      recordBackgroundRefreshRead({
        owner: "task-dashboard-refresh",
        surface: selectedSurfaceKey,
        scopeKey: selectedBackendId,
        readShape: "scoped-history-rows",
      });
    }
    const active = shouldReadActive
      ? readCachedActiveRows(selectedSurfaceKey, taskReadScope)
      : [];
    const backends = normalizeDashboardBackends({
      configured: state.backends,
      history,
      active,
    });
    state.backends = backends;

    const homeWorkflows =
      state.selectedTabKey === "home"
        ? await readCachedHomeWorkflowSummaries(backends)
        : undefined;
    if (state.selectedTabKey === "home") {
      lastHomePeriodicReadAt = Date.now();
    }

    const snapshot = await buildDashboardSnapshot({
      state,
      backends,
      history,
      active,
      historySummary,
      homeWorkflows,
    });
    const signatures = snapshot.surfaceSignatures;
    if (
      messageType === "dashboard:snapshot" &&
      isNoisyRefreshReason(reason) &&
      signatures &&
      lastPostedDashboardSignatures &&
      signatures.chrome === lastPostedDashboardSignatures.chrome &&
      signatures.selectedSurface ===
        lastPostedDashboardSignatures.selectedSurface &&
      signatures.selectedSurfaceKey ===
        lastPostedDashboardSignatures.selectedSurfaceKey
    ) {
      return;
    }
    if (signatures) {
      lastPostedDashboardSignatures = {
        chrome: signatures.chrome,
        selectedSurface: signatures.selectedSurface,
        selectedSurfaceKey: signatures.selectedSurfaceKey,
      };
    }

    frameWindow.postMessage(
      {
        type: messageType,
        payload: snapshot,
      },
      "*",
    );
  };

  let refreshChain: Promise<void> = Promise.resolve();
  const shouldSkipRefresh = (reason: RefreshReason) => {
    if (reason !== "periodic" && reason !== "task-update") {
      return false;
    }
    return (
      state.selectedTabKey === "workflow-options" ||
      state.selectedTabKey === "products" ||
      state.selectedTabKey === "runtime-logs" ||
      state.selectedTabKey === "skillrunner-connection-audit"
    );
  };
  const enqueueRefresh = (
    messageType: "dashboard:init" | "dashboard:snapshot",
    reason: RefreshReason,
  ) => {
    if (dashboardRefreshQueued && messageType === "dashboard:snapshot") {
      if (!isNoisyRefreshReason(reason)) {
        queuedRefreshReason = reason;
      }
      return refreshChain;
    }
    dashboardRefreshQueued = true;
    queuedRefreshReason = reason;
    refreshChain = refreshChain
      .catch(() => undefined)
      .then(async () => {
        const reason = queuedRefreshReason;
        dashboardRefreshQueued = false;
        await pushSnapshot(messageType, reason);
      });
    return refreshChain;
  };

  const clearDeferredDashboardRefresh = () => {
    if (!deferredDashboardRefreshTimer) {
      return;
    }
    getRuntimeWindow()?.clearTimeout(deferredDashboardRefreshTimer);
    deferredDashboardRefreshTimer = undefined;
  };

  const isNoisyRefreshReason = (reason: RefreshReason) =>
    reason === "task-update" ||
    reason === "backend-health" ||
    reason === "periodic";

  const scheduleDeferredDashboardRefresh = (reason: RefreshReason) => {
    if (deferredDashboardRefreshTimer) {
      return;
    }
    const win = getRuntimeWindow();
    if (!win) {
      void enqueueRefresh("dashboard:snapshot", reason);
      return;
    }
    deferredDashboardRefreshTimer = win.setTimeout(() => {
      deferredDashboardRefreshTimer = undefined;
      void enqueueRefresh("dashboard:snapshot", reason);
    }, 350);
  };

  const refresh = (reason: RefreshReason = "user-action") => {
    if (shouldSkipRefresh(reason)) {
      return;
    }
    if (isNoisyRefreshReason(reason)) {
      scheduleDeferredDashboardRefresh(reason);
      return;
    }
    clearDeferredDashboardRefresh();
    void enqueueRefresh("dashboard:snapshot", reason);
  };

  const ensureBackendInteractable = (backendIdRaw: unknown) => {
    const backendId = String(backendIdRaw || "").trim();
    if (!backendId) {
      return true;
    }
    const backend = state.backends.find((entry) => entry.id === backendId);
    if (!backend) {
      return true;
    }
    if (
      !isBackendReconcileFlagged({
        backendId: backend.id,
        backendType: backend.type,
      })
    ) {
      return true;
    }
    alertRuntimeWindow(
      resolveBackendUnavailableMessageForDialog({
        backendId: backend.id,
        backendDisplayName: resolveBackendDisplayName(
          backend.id,
          backend.displayName,
        ),
      }),
    );
    return false;
  };

  const handleAction = async (envelope: DashboardActionEnvelope) => {
    const action = String(envelope.action || "").trim();
    const payload = envelope.payload || {};
    if (!action) {
      return;
    }
    if (action === "ready") {
      void enqueueRefresh("dashboard:init", "init");
      return;
    }
    if (action === "select-tab") {
      const requestedTabKey = String(payload.tabKey || "home").trim() || "home";
      const requestedBackendId = fromBackendTabKey(requestedTabKey);
      if (
        requestedBackendId &&
        !ensureBackendInteractable(requestedBackendId)
      ) {
        return;
      }
      state.selectedTabKey = requestedTabKey;
      if (state.selectedTabKey !== "home") {
        state.homeWorkflowDocWorkflowId = "";
      }
      refresh("user-action");
      return;
    }
    if (action === "select-product") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "products";
      state.selectedProductId = String(payload.productId || "").trim();
      state.selectedProductAssetId = "";
      refresh("user-action");
      return;
    }
    if (action === "select-product-asset") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "products";
      state.selectedProductId = String(payload.productId || "").trim();
      state.selectedProductAssetId = String(payload.assetId || "").trim();
      refresh("user-action");
      return;
    }
    if (action === "select-product-section") {
      state.selectedTabKey = "products";
      state.selectedProductSection =
        String(payload.section || "").trim() === "feedback"
          ? "feedback"
          : "products";
      refresh("user-action");
      return;
    }
    if (action === "select-feedback-skill-filter") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      state.feedbackSkillFilter = String(payload.skillId || "").trim();
      state.selectedFeedbackProductId = "";
      state.selectedFeedbackProductIds.clear();
      refresh("user-action");
      return;
    }
    if (action === "select-feedback-product") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      state.selectedFeedbackProductId = String(payload.productId || "").trim();
      refresh("user-action");
      return;
    }
    if (action === "toggle-feedback-product-selected") {
      const productId = String(payload.productId || "").trim();
      if (productId) {
        if (payload.selected === true) {
          state.selectedFeedbackProductIds.add(productId);
        } else {
          state.selectedFeedbackProductIds.delete(productId);
        }
      }
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      refresh("user-action");
      return;
    }
    if (action === "toggle-all-feedback-products-selected") {
      const selected = payload.selected === true;
      const visibleFeedbackProducts = listSkillRunFeedbackProducts(
        state.feedbackSkillFilter,
      );
      for (const product of visibleFeedbackProducts) {
        const productId = String(product.productId || "").trim();
        if (!productId) {
          continue;
        }
        if (selected) {
          state.selectedFeedbackProductIds.add(productId);
        } else {
          state.selectedFeedbackProductIds.delete(productId);
        }
      }
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      refresh("user-action");
      return;
    }
    if (action === "export-selected-feedback") {
      const productIds = Array.from(state.selectedFeedbackProductIds);
      if (productIds.length === 0) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-feedback-export-empty",
            "Select at least one feedback record to export.",
          ),
        );
        return;
      }
      try {
        const exported = await exportSkillRunFeedbackMarkdownFile(productIds);
        const folder = String(exported.filePath || "").replace(
          /[\\/][^\\/]*$/,
          "",
        );
        if (folder) {
          openFolderInSystemFileManager(folder, {
            label: "skill feedback export folder",
          });
        }
        alertRuntimeWindow(
          localize(
            "task-dashboard-feedback-export-success",
            "Skill feedback export file created.",
          ),
        );
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
      return;
    }
    if (action === "delete-selected-feedback") {
      const visibleFeedbackProductIds = new Set(
        listSkillRunFeedbackProducts(state.feedbackSkillFilter)
          .map((product) => String(product.productId || "").trim())
          .filter(Boolean),
      );
      const productIds = Array.from(state.selectedFeedbackProductIds).filter(
        (productId) => visibleFeedbackProductIds.has(productId),
      );
      if (productIds.length === 0) {
        state.selectedTabKey = "products";
        state.selectedProductSection = "feedback";
        refresh("user-action");
        return;
      }
      const confirmed = confirmRuntimeWindow(
        localize(
          "task-dashboard-feedback-delete-selected-confirm",
          `Delete ${productIds.length} selected feedback record(s)?`,
          { args: { count: productIds.length } },
        ),
      );
      if (!confirmed) {
        return;
      }
      for (const productId of productIds) {
        removeWorkflowProduct(productId);
        state.selectedFeedbackProductIds.delete(productId);
      }
      if (productIds.includes(state.selectedFeedbackProductId)) {
        state.selectedFeedbackProductId = "";
      }
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      refresh("user-action");
      return;
    }
    if (action === "delete-all-feedback") {
      const feedbackProducts = listSkillRunFeedbackProducts(
        state.feedbackSkillFilter,
      );
      const productIds = feedbackProducts
        .map((product) => String(product.productId || "").trim())
        .filter(Boolean);
      if (productIds.length === 0) {
        state.selectedTabKey = "products";
        state.selectedProductSection = "feedback";
        refresh("user-action");
        return;
      }
      const confirmed = confirmRuntimeWindow(
        localize(
          "task-dashboard-feedback-delete-all-confirm",
          `Delete all ${productIds.length} visible feedback record(s)?`,
          { args: { count: productIds.length } },
        ),
      );
      if (!confirmed) {
        return;
      }
      for (const productId of productIds) {
        removeWorkflowProduct(productId);
        state.selectedFeedbackProductIds.delete(productId);
      }
      if (productIds.includes(state.selectedFeedbackProductId)) {
        state.selectedFeedbackProductId = "";
      }
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      refresh("user-action");
      return;
    }
    if (action === "open-product-folder") {
      const product = getWorkflowProduct(
        String(payload.productId || "").trim(),
      );
      const folder = String(product?.cacheDir || "").trim();
      if (folder) {
        openFolderInSystemFileManager(folder, { label: "product folder" });
      }
      return;
    }
    if (action === "remove-product") {
      const productId = String(payload.productId || "").trim();
      if (productId) {
        removeWorkflowProduct(productId);
        if (state.selectedProductId === productId) {
          state.selectedProductId = "";
          state.selectedProductAssetId = "";
        }
        refresh("user-action");
      }
      return;
    }
    if (action === "select-workflow-settings-workflow") {
      state.selectedWorkflowOptionsWorkflowId = String(
        payload.workflowId || "",
      ).trim();
      refresh("user-action");
      return;
    }
    if (action === "open-home-workflow-doc") {
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        return;
      }
      state.selectedTabKey = "home";
      state.homeWorkflowDocWorkflowId = workflowId;
      refresh("user-action");
      return;
    }
    if (action === "close-home-workflow-doc") {
      state.selectedTabKey = "home";
      state.homeWorkflowDocWorkflowId = "";
      refresh("user-action");
      return;
    }
    if (action === "open-home-workflow-settings") {
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        return;
      }
      state.homeWorkflowDocWorkflowId = "";
      state.selectedTabKey = "workflow-options";
      state.selectedWorkflowOptionsWorkflowId = workflowId;
      refresh("user-action");
      return;
    }
    if (action === "run-home-workflow") {
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        return;
      }
      const quickRun = await resolveHomeWorkflowQuickRun({
        workflowId,
        backends: state.backends,
      });
      if (!quickRun.enabled || !quickRun.workflow) {
        alertRuntimeWindow(
          quickRun.reason ||
            localize(
              "workflow-execute-cannot-run",
              "Workflow cannot run from the dashboard shortcut",
            ),
        );
        return;
      }
      const chromeWindow = getChromeWindow();
      if (!chromeWindow) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-home-workflow-run-missing-window",
            "Unable to find the Zotero window for this workflow run.",
          ),
        );
        return;
      }
      state.selectedTabKey = "home";
      state.homeWorkflowDocWorkflowId = "";
      refresh("user-action");
      void triggerWorkflowFromUnifiedEntry({
        win: chromeWindow,
        workflow: quickRun.workflow,
        source: "dashboard-home",
      });
      return;
    }
    if (action === "workflow-settings-draft") {
      const workflowId = String(payload.workflowId || "").trim();
      const executionOptions =
        (payload.executionOptions as WorkflowExecutionOptions) || {};
      const changedSection = normalizeDraftChangedSection(
        payload.changedSection,
      );
      const changedKey = normalizeDraftChangedKey(payload.changedKey);
      if (!workflowId) {
        return;
      }
      state.workflowSettingsDraftById.set(workflowId, {
        backendId:
          typeof executionOptions.backendId === "string"
            ? executionOptions.backendId
            : undefined,
        workflowParams: executionOptions.workflowParams || {},
        providerOptions: executionOptions.providerOptions || {},
      });
      clearWorkflowSettingsSaveTimer(state, workflowId, getRuntimeWindow());
      state.workflowSettingsSaveStateById.set(workflowId, "saving");
      state.workflowSettingsSaveErrorById.delete(workflowId);
      if (
        isWorkflowSettingsStructuralRefreshChange({
          changedSection,
          changedKey,
        })
      ) {
        refresh("user-action");
      }
      const timer = getRuntimeWindow()?.setTimeout(() => {
        try {
          const draft = state.workflowSettingsDraftById.get(workflowId) || {};
          updateWorkflowSettings(workflowId, draft);
          homeWorkflowSummariesDirty = true;
          state.workflowSettingsSaveStateById.set(workflowId, "saved");
          state.workflowSettingsSaveErrorById.delete(workflowId);
          refresh("save-state");
          const idleTimer = getRuntimeWindow()?.setTimeout(() => {
            state.workflowSettingsSaveStateById.set(workflowId, "idle");
          }, 900);
          if (idleTimer) {
            state.workflowSettingsSaveTimerById.set(
              `${workflowId}:idle`,
              idleTimer,
            );
          }
        } catch (error) {
          state.workflowSettingsSaveStateById.set(workflowId, "error");
          state.workflowSettingsSaveErrorById.set(
            workflowId,
            compactError(error),
          );
        } finally {
          state.workflowSettingsSaveTimerById.delete(workflowId);
        }
      }, 420);
      if (timer) {
        state.workflowSettingsSaveTimerById.set(workflowId, timer);
      }
      return;
    }
    if (action === "open-running-task") {
      const taskId = String(payload.taskId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      const requestId = String(payload.requestId || "").trim();
      const runKey = String(payload.runKey || "").trim();
      const payloadBackendType = String(payload.backendType || "").trim();
      const requestKind = String(payload.requestKind || "").trim();
      if (
        requestId &&
        (payloadBackendType === "acp" ||
          requestKind === ACP_SKILL_RUN_REQUEST_KIND ||
          taskId.startsWith("acp-skill-run:"))
      ) {
        selectAcpSkillRun(requestId);
        await openAssistantWorkspaceSidebar({
          window: getChromeWindow(),
          tab: "acp-skills",
          requestId,
        });
        return;
      }
      if (!taskId || !backendId) {
        return;
      }
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      const backend = state.backends.find((entry) => entry.id === backendId);
      const backendType = String(backend?.type || payloadBackendType).trim();
      if (
        isAcpSkillRunnerTask({
          backendType,
          requestKind,
        })
      ) {
        if (requestId) {
          selectAcpSkillRun(requestId);
        }
        await openAssistantWorkspaceSidebar({
          window: getChromeWindow(),
          tab: "acp-skills",
          requestId,
        });
        return;
      }
      if (backendType === "skillrunner") {
        if (!runKey) {
          return;
        }
        if (!backend || !isSkillRunnerBackend(backend)) {
          return;
        }
        await openAssistantWorkspaceSidebar({
          window: getChromeWindow(),
          tab: "skillrunner",
          runKey,
        });
        return;
      }
      if (backendType === "generic-http") {
        if (!backend) {
          return;
        }
        state.selectedTabKey = toBackendTabKey(backendId);
        state.selectedLogTaskByBackendId.set(backendId, taskId);
        state.selectedLogEntryByBackendId.delete(backendId);
        refresh("user-action");
      }
      return;
    }
    if (action === "open-acp-skill-runs") {
      const requestId = String(payload.requestId || "").trim();
      if (requestId) {
        selectAcpSkillRun(requestId);
      }
      await openAssistantWorkspaceSidebar({
        window: getChromeWindow(),
        tab: "acp-skills",
        requestId,
      });
      return;
    }
    if (action === "view-logs" || action === "select-log-task") {
      const backendId = String(payload.backendId || "").trim();
      const taskId = String(payload.taskId || "").trim();
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      if (backendId && taskId) {
        state.selectedTabKey = toBackendTabKey(backendId);
        state.selectedLogTaskByBackendId.set(backendId, taskId);
        state.selectedLogEntryByBackendId.delete(backendId);
      }
      refresh("user-action");
      return;
    }
    if (action === "open-log-diagnostics") {
      const backendId = String(payload.backendId || "").trim();
      const taskId = String(payload.taskId || "").trim();
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !taskId) {
        return;
      }
      const taskReadScope = { backendId: backend.id };
      const active = normalizeFilteredActive(taskReadScope);
      const history = normalizeFilteredHistory(taskReadScope);
      const rows = mergeDashboardTaskRows({
        backendId: backend.id,
        history,
        active,
      }).map((entry) => mapTaskRow(entry));
      const selected = rows.find((row) => row.id === taskId);
      if (!selected) {
        state.selectedTabKey = "runtime-logs";
        state.runtimeLogFilters = {
          backendId: backend.id,
          backendType: backend.type,
        };
        const { setRuntimeLogDiagnosticMode } =
          await import("./runtimeLogManager");
        setRuntimeLogDiagnosticMode(true);
        refresh("user-action");
        return;
      }
      state.selectedTabKey = "runtime-logs";
      state.runtimeLogFilters = {
        backendId: backend.id,
        backendType: backend.type,
        workflowId: selected.workflowId,
        requestId: selected.requestId,
        jobId: selected.jobId,
        runId: selected.runId,
      };
      const { setRuntimeLogDiagnosticMode } =
        await import("./runtimeLogManager");
      setRuntimeLogDiagnosticMode(true);
      refresh("user-action");
      return;
    }
    if (action === "select-log-entry") {
      const backendId = String(payload.backendId || "").trim();
      const logEntryId = String(payload.logEntryId || "").trim();
      if (backendId && logEntryId) {
        state.selectedLogEntryByBackendId.set(backendId, logEntryId);
      }
      refresh("user-action");
      return;
    }
    if (action === "open-run") {
      const backendId = String(payload.backendId || "").trim();
      const requestId = String(payload.requestId || "").trim();
      const runKey = String(payload.runKey || "").trim();
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      if (backendId) {
        const backend = state.backends.find((entry) => entry.id === backendId);
        if (backend && isSkillRunnerBackend(backend)) {
          if (!runKey) {
            return;
          }
          await openAssistantWorkspaceSidebar({
            window: getChromeWindow(),
            tab: "skillrunner",
            runKey,
          });
        } else if (backend && isAcpBackend(backend) && requestId) {
          selectAcpSkillRun(requestId);
          await openAssistantWorkspaceSidebar({
            window: getChromeWindow(),
            tab: "acp-skills",
            requestId,
          });
        }
      }
      return;
    }
    if (action === "open-management") {
      const backendId = String(payload.backendId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !isSkillRunnerBackend(backend)) {
        return;
      }
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      state.selectedTabKey = toBackendTabKey(backend.id);
      state.selectedBackendSubviewById.set(backend.id, "management");
      refresh("user-action");
      return;
    }
    if (action === "show-runs") {
      const backendId = String(payload.backendId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !isSkillRunnerBackend(backend)) {
        return;
      }
      state.selectedTabKey = toBackendTabKey(backend.id);
      state.selectedBackendSubviewById.set(backend.id, "runs");
      clearManagementHost();
      refresh("user-action");
      return;
    }
    if (action === "mount-management-host") {
      mountManagementHost(payload);
      return;
    }
    if (action === "open-management-external") {
      const backendId = String(payload.backendId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !isSkillRunnerBackend(backend)) {
        return;
      }
      const managementUiUrl = maybeBuildSkillRunnerManagementUiUrl(
        backend.baseUrl,
      );
      if (!managementUiUrl) {
        return;
      }
      const runtime = globalThis as {
        Zotero?: { launchURL?: (url: string) => void };
      };
      runtime.Zotero?.launchURL?.(managementUiUrl);
      return;
    }
    if (action === "refresh-model-cache") {
      const backendId = String(payload.backendId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !isSkillRunnerBackend(backend)) {
        return;
      }
      try {
        const refreshed = await refreshSkillRunnerModelCacheForBackend({
          backend,
        });
        if (!refreshed.ok) {
          throw new Error(String(refreshed.error || "unknown error"));
        }
        alertRuntimeWindow(
          localize(
            "backend-manager-refresh-model-cache-success",
            "Model cache refreshed. updatedAt={refreshedAt}",
            {
              args: {
                refreshedAt: String(refreshed.refreshedAt || ""),
              },
            },
          ),
        );
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "backend-manager-refresh-model-cache-failed",
            "Failed to refresh model cache: {error}",
            {
              args: {
                error: compactError(error),
              },
            },
          ),
        );
      }
      return;
    }
    if (action === "cancel-run") {
      const backendId = String(payload.backendId || "").trim();
      const requestId = String(payload.requestId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !requestId) {
        return;
      }
      if (isAcpBackend(backend)) {
        try {
          await cancelAcpSkillRun(requestId);
        } catch (error) {
          alertRuntimeWindow(
            localize(
              "task-dashboard-skillrunner-cancel-failed",
              "Failed to cancel run: {error}",
              {
                args: {
                  error: compactError(error),
                },
              },
            ),
          );
        }
        refresh("user-action");
        return;
      }
      if (!isSkillRunnerBackend(backend)) {
        return;
      }
      const taskReadScope = { backendId: backend.id };
      const active = normalizeFilteredActive(taskReadScope);
      const history = normalizeFilteredHistory(taskReadScope);
      const rows = mergeDashboardTaskRows({
        backendId: backend.id,
        history,
        active,
      });
      const target = rows.find((row) => row.requestId === requestId);
      if (target && isTerminalWorkflowTaskState(target.state)) {
        refresh("user-action");
        return;
      }
      try {
        const client = buildSkillRunnerManagementClient({
          backend,
          alertWindow: getRuntimeWindow() || undefined,
          localize,
        });
        const response = await client.cancelRun({
          requestId,
        });
        const semantic = resolveSkillRunnerManagementResponseSemantic({
          response,
          fallbackStatus: target
            ? normalizeStatus(target.state, "running")
            : "running",
        });
        if (
          semantic.accepted === false ||
          semantic.status !== normalizeStatus(target?.state, "running")
        ) {
          const applied = applyDashboardManagementStatus({
            backend,
            requestId,
            status: semantic.status,
            message: semantic.message,
          });
          if (
            semantic.accepted === false &&
            semantic.message &&
            !applied.terminal
          ) {
            alertRuntimeWindow(semantic.message);
          }
        }
      } catch (error) {
        if (isSkillRunnerRunTerminalClientError(error)) {
          settleSkillRunnerRunAsFailed({
            backendId: backend.id,
            backendType: backend.type,
            providerId: "skillrunner",
            workflowId: target?.workflowId,
            runId: target?.runId,
            jobId: target?.jobId,
            requestId,
            reason: compactError(error),
            source: "task-manager-cancel",
            error,
          });
          refresh("user-action");
          return;
        }
        alertRuntimeWindow(
          localize(
            "task-dashboard-skillrunner-cancel-failed",
            "Failed to cancel run: {error}",
            {
              args: {
                error: compactError(error),
              },
            },
          ),
        );
      }
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-toggle-diagnostic") {
      const { setRuntimeLogDiagnosticMode } =
        await import("./runtimeLogManager");
      setRuntimeLogDiagnosticMode(Boolean(payload.enabled));
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-set-filters") {
      const incomingFilters = payload.filters;
      if (incomingFilters && typeof incomingFilters === "object") {
        state.runtimeLogFilters = {
          ...state.runtimeLogFilters,
          ...incomingFilters,
        };
      }
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-clear-context") {
      const levels = state.runtimeLogFilters.levels;
      state.runtimeLogFilters = { levels };
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-clear") {
      const { clearRuntimeLogs } = await import("./runtimeLogManager");
      clearRuntimeLogs();
      state.runtimeLogSelectedIdSet.clear();
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-select-entries") {
      const entryIds = Array.isArray(payload.entryIds) ? payload.entryIds : [];
      state.runtimeLogSelectedIdSet.clear();
      for (const id of entryIds) {
        if (typeof id === "string" && id) {
          state.runtimeLogSelectedIdSet.add(id);
        }
      }
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-copy-selected") {
      const format = String(payload.format || "pretty-json").trim();
      const entries = listRuntimeLogs({ order: "desc" }).filter((e) =>
        state.runtimeLogSelectedIdSet.has(e.id),
      );
      if (entries.length === 0) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-empty",
            "No log entries selected to copy.",
          ),
        );
        return;
      }
      try {
        const { buildLogCopyPayload } = await import("./runtimeLogManager");
        const { copyText } = await import("../utils/ztoolkit");
        const textToCopy = buildLogCopyPayload({
          entries,
          format: format as any,
        });

        const helper = (Components as any).classes?.[
          "@mozilla.org/widget/clipboardhelper;1"
        ]?.getService(Components.interfaces.nsIClipboardHelper) as {
          copyString?: (value: string) => void;
        };
        if (helper?.copyString) {
          helper.copyString(textToCopy);
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
    }
    if (action === "runtime-logs-copy-entry") {
      const entryId = String(payload.entryId || "").trim();
      const format = String(payload.format || "pretty-json").trim();
      const entry = entryId
        ? listRuntimeLogs({ order: "desc" }).find((e) => e.id === entryId)
        : undefined;
      if (!entry) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-empty",
            "No log entries selected to copy.",
          ),
        );
        return;
      }
      try {
        const { buildLogCopyPayload } = await import("./runtimeLogManager");
        const textToCopy = buildLogCopyPayload({
          entries: [entry],
          format: format as any,
        });

        const helper = (Components as any).classes?.[
          "@mozilla.org/widget/clipboardhelper;1"
        ]?.getService(Components.interfaces.nsIClipboardHelper) as {
          copyString?: (value: string) => void;
        };
        if (helper?.copyString) {
          helper.copyString(textToCopy);
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
      return;
    }
    if (action === "runtime-logs-copy-diagnostic-bundle") {
      try {
        const { buildRuntimeIssueDiagnosticBundle } =
          await import("./runtimeLogManager");
        const bundle = buildRuntimeIssueDiagnosticBundle({
          filters: state.runtimeLogFilters as RuntimeLogListFilters,
        });
        const textToCopy = JSON.stringify(bundle, null, 2);
        const helper = (Components as any).classes?.[
          "@mozilla.org/widget/clipboardhelper;1"
        ]?.getService(Components.interfaces.nsIClipboardHelper) as {
          copyString?: (value: string) => void;
        };
        if (helper?.copyString) {
          helper.copyString(textToCopy);
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
      return;
    }
    if (action === "runtime-logs-copy-issue-summary") {
      try {
        const { buildRuntimeIssueSummary } =
          await import("./runtimeLogManager");
        const textToCopy = buildRuntimeIssueSummary({
          filters: {
            ...state.runtimeLogFilters,
            levels: ["debug", "info", "warn", "error"],
          },
        });
        const helper = (Components as any).classes?.[
          "@mozilla.org/widget/clipboardhelper;1"
        ]?.getService(Components.interfaces.nsIClipboardHelper) as {
          copyString?: (value: string) => void;
        };
        if (helper?.copyString) {
          helper.copyString(textToCopy);
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
      return;
    }
  };

  let mountedFrame: Element | null = null;
  let mountedManagementHost: Element | null = null;
  let mountedManagementHostKey = "";
  let exposesExternalSelectTab = false;

  const clearManagementHost = () => {
    args?.managementHost?.clear();
    mountedManagementHost?.remove();
    mountedManagementHost = null;
    mountedManagementHostKey = "";
  };

  const mountManagementHost = (
    payload: Record<string, unknown> | undefined,
  ) => {
    const backendId = String(payload?.backendId || "").trim();
    const requestedUrl = String(payload?.managementUiUrl || "").trim();
    if (!backendId || !requestedUrl || !frameWindow?.document) {
      return;
    }
    const selectedBackendId = fromBackendTabKey(state.selectedTabKey);
    if (
      selectedBackendId !== backendId ||
      state.selectedBackendSubviewById.get(backendId) !== "management"
    ) {
      clearManagementHost();
      return;
    }
    const expectedUrl = maybeBuildSkillRunnerManagementUiUrl(
      state.backends.find((backend) => backend.id === backendId)?.baseUrl || "",
    );
    if (!expectedUrl || expectedUrl !== requestedUrl) {
      clearManagementHost();
      return;
    }
    const doc = frameWindow.document;
    const mount = Array.from(
      doc.querySelectorAll(
        "[data-zs-role='skillrunner-management-dashboard-host']",
      ),
    ).find(
      (node) =>
        String((node as HTMLElement).dataset.backendId || "").trim() ===
        backendId,
    ) as HTMLElement | undefined;
    if (!mount) {
      clearManagementHost();
      return;
    }
    const hostKey = `${backendId}\n${requestedUrl}`;
    const backend = state.backends.find((entry) => entry.id === backendId);
    if (args?.managementHost) {
      if (mountedManagementHostKey === hostKey) {
        return;
      }
      mountedManagementHost?.remove();
      mountedManagementHost = null;
      mountedManagementHostKey = hostKey;
      args.managementHost.mount({
        backendId,
        title:
          resolveBackendDisplayName(backendId, backend?.displayName) ||
          "SkillRunner Management",
        url: requestedUrl,
        onClose: () => {
          selectDashboardTab({
            tabKey: toBackendTabKey(backendId),
            backendSubview: "runs",
          });
        },
      });
      return;
    }
    if (
      mountedManagementHostKey === hostKey &&
      mountedManagementHost?.parentElement === mount
    ) {
      return;
    }
    clearManagementHost();
    mount.textContent = "";
    const host = createManagementContentBrowser(doc, requestedUrl);
    mountedManagementHost = host;
    mountedManagementHostKey = hostKey;
    mount.appendChild(host);
  };

  const selectDashboardTab = (next: {
    tabKey?: string;
    workflowId?: string;
    backendSubview?: "runs" | "management";
  }) => {
    if (typeof next.tabKey === "string" && next.tabKey.trim()) {
      const requestedTabKey = next.tabKey.trim();
      const requestedBackendId = fromBackendTabKey(requestedTabKey);
      if (
        requestedBackendId &&
        !ensureBackendInteractable(requestedBackendId)
      ) {
        return;
      }
      state.selectedTabKey = requestedTabKey;
      if (state.selectedTabKey !== "home") {
        state.homeWorkflowDocWorkflowId = "";
      }
      if (requestedBackendId && next.backendSubview) {
        state.selectedBackendSubviewById.set(
          requestedBackendId,
          next.backendSubview,
        );
        if (next.backendSubview !== "management") {
          clearManagementHost();
        }
      }
    }
    if (typeof next.workflowId === "string") {
      state.selectedWorkflowOptionsWorkflowId = next.workflowId.trim();
    }
    refresh("user-action");
  };

  const cleanupDashboardRuntime = () => {
    if (unsubscribeTasks) {
      unsubscribeTasks();
      unsubscribeTasks = undefined;
    }
    if (refreshTimer) {
      getRuntimeWindow()?.clearInterval(refreshTimer);
      refreshTimer = undefined;
    }
    clearDeferredDashboardRefresh();
    if (unsubscribeBackendHealth) {
      unsubscribeBackendHealth();
      unsubscribeBackendHealth = undefined;
    }
    if (unsubscribeAcpSkillRuns) {
      unsubscribeAcpSkillRuns();
      unsubscribeAcpSkillRuns = undefined;
    }
    if (removeMessageListener) {
      removeMessageListener();
      removeMessageListener = undefined;
    }
    clearManagementHost();
    for (const workflowId of Array.from(
      state.workflowSettingsSaveTimerById.keys(),
    )) {
      clearWorkflowSettingsSaveTimer(state, workflowId, getRuntimeWindow());
    }
    state.workflowSettingsSaveTimerById.clear();
    if (exposesExternalSelectTab) {
      externalSelectTab = undefined;
      exposesExternalSelectTab = false;
    }
    frameWindow = null;
    mountedFrame?.remove();
    mountedFrame = null;
  };

  const mountDashboardRuntime = (
    root: HTMLElement,
    hostWindow: Window,
    options?: { exposeExternalSelectTab?: boolean },
  ): MountedTaskDashboardRuntime => {
    root.innerHTML = "";
    const ownerDocument = root.ownerDocument || hostWindow.document;
    const frame = createDashboardFrame(
      ownerDocument,
      resolveDashboardPageUrl(),
    );
    mountedFrame = frame;
    root.appendChild(frame);
    frameWindow = resolveDashboardFrameWindow(frame);
    frame.addEventListener("load", () => {
      frameWindow = resolveDashboardFrameWindow(frame);
      if (!frameWindow) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-open-management-failed",
            "Dashboard host failed to resolve frame window.",
            {
              args: {
                error: "frame_window_unavailable",
              },
            },
          ),
        );
        return;
      }
      void enqueueRefresh("dashboard:init", "init");
    });
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown };
      if (!data || data.type !== "dashboard:action") {
        return;
      }
      void handleAction(data as DashboardActionEnvelope);
    };
    hostWindow.addEventListener("message", onMessage);
    removeMessageListener = () => {
      hostWindow.removeEventListener("message", onMessage);
    };
    if (options?.exposeExternalSelectTab) {
      externalSelectTab = selectDashboardTab;
      exposesExternalSelectTab = true;
    }

    refresh("init");
    unsubscribeTasks = subscribeWorkflowTaskChanges(() => {
      markTaskSummaryDirty();
      refresh("task-update");
    });
    unsubscribeBackendHealth = subscribeSkillRunnerBackendHealth(() => {
      activeRowsRevision += 1;
      refresh("backend-health");
    });
    unsubscribeAcpSkillRuns = subscribeAcpSkillRunSnapshots(() => {
      markTaskSummaryDirty();
      refresh("task-update");
    });
    registerBackgroundRefreshTimer({
      owner: "task-dashboard-refresh",
      activationCondition: "dashboard frame mounted",
      scopeKey: "selected dashboard tab and selected backend id",
      allowedDataSources: [
        "workflow active summaries",
        "task dashboard history projections",
        "acp skill run summaries",
        "selected backend runtime logs",
        "backend health registry",
      ],
      maxReadShape:
        "active/count summaries globally; history/log rows scoped to selected backend or explicit action",
      requiresForegroundSurface: true,
      minimumIntervalMs: 1200,
      intervalMs: 1200,
    });
    refreshTimer = hostWindow.setInterval(() => {
      refresh("periodic");
    }, 1200);
    return {
      refresh: () => refresh("user-action"),
      selectTab: selectDashboardTab,
      cleanup: cleanupDashboardRuntime,
    };
  };

  if (isEmbedded && args?.embeddedRoot && args.hostWindow) {
    return mountDashboardRuntime(args.embeddedRoot, args.hostWindow);
  }

  const dialogData: Record<string, unknown> = {
    loadCallback: () => {
      const doc = taskManagerDialog?.window?.document;
      const dialogWindow = taskManagerDialog?.window;
      if (!doc || !dialogWindow) {
        return;
      }
      try {
        dialogWindow.resizeTo(1480, 920);
      } catch {
        // ignore
      }
      const root = doc.getElementById(
        "zs-task-manager-root",
      ) as HTMLElement | null;
      if (!root) {
        return;
      }
      mountDashboardRuntime(root, dialogWindow, {
        exposeExternalSelectTab: true,
      });
    },
    unloadCallback: cleanupDashboardRuntime,
  };

  taskManagerDialog = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-task-manager-root",
      styles: {
        width: "100%",
        height: "100%",
        minWidth: "1100px",
        minHeight: "700px",
        padding: "0",
        margin: "0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
    })
    .addButton(localize("task-manager-close", "Close"), "close")
    .setDialogData(dialogData)
    .open(localize("task-manager-title", "Task Dashboard"));

  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;

  taskManagerDialog = undefined;
}

export async function mountTaskDashboardRuntime(args: {
  root: HTMLElement;
  hostWindow: Window;
  chromeWindow?: _ZoteroTypes.MainWindow;
  initialTabKey?: string;
  initialWorkflowId?: string;
  initialBackendSubview?: "runs" | "management";
  managementHost?: DashboardManagementHost;
}) {
  return openTaskManagerDialog({
    initialTabKey: args.initialTabKey,
    initialWorkflowId: args.initialWorkflowId,
    initialBackendSubview: args.initialBackendSubview,
    embeddedRoot: args.root,
    hostWindow: args.hostWindow,
    chromeWindow: args.chromeWindow,
    managementHost: args.managementHost,
  }) as Promise<MountedTaskDashboardRuntime>;
}

export async function resetTaskManagerDialogRuntimeForTests() {
  externalSelectTab = undefined;
  if (isWindowAlive(taskManagerDialog?.window)) {
    taskManagerDialog?.window?.close();
    await Promise.resolve();
  }
  taskManagerDialog = undefined;
}

import {
  ACP_SKILL_RUN_REQUEST_KIND,
  ACP_BACKEND_TYPE,
} from "../config/defaults";
import { getStringOrFallback } from "../utils/locale";
import {
  appendPluginRunEventStoreEntry,
  clearPluginRunStore,
  deletePluginRunStoreEntry,
  listPluginRunStoreEntries,
  upsertPluginRunStoreEntry,
} from "./pluginStateStore";
import {
  registerAcpSkillRunsMemoryClearer,
  registerAcpSkillRunsRetentionCleaner,
} from "./runtimePersistence";
import { listRuntimeLogs } from "./runtimeLogManager";
import { buildAssistantPanelLabels } from "./assistantPanelLabels";
import {
  listActiveWorkflowTaskSummaries,
  listWorkflowTasks,
  removeWorkflowTasksByBackendAndRequestIds,
  updateWorkflowTaskStateByRequest,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import {
  getZoteroMcpHealthSnapshot,
  getZoteroMcpServerStatus,
  type ZoteroMcpServerStatusSnapshot,
} from "./zoteroMcpServer";
import { getHostBridgeServerStatus } from "./hostBridgeServer";
import type { HostBridgeStatusSnapshot } from "./hostBridgeProtocol";
import type {
  AcpSessionConfigCategory,
  AcpToolCall,
  RequestPermissionOutcome,
  SessionNotification,
} from "./acpProtocol";
import type {
  AcpMcpHealthSnapshot,
  AcpPendingPermissionRequest,
} from "./acpTypes";
import {
  parseAcpEffortFromModelText,
  resolveAcpRawModelIdForSelection,
  type AcpSelectableOption,
} from "./acpModelOptionFolding";

export type AcpSkillRunStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "repairing"
  | "succeeded"
  | "failed"
  | "canceled";

export type AcpSkillRunConversationState =
  | "starting"
  | "active"
  | "ended"
  | "closed"
  | "error";

export type AcpSkillRunRecoveryState =
  | "unavailable"
  | "available"
  | "connecting"
  | "connected"
  | "failed"
  | "unsupported";

export type AcpSkillRunReplyState =
  | "idle"
  | "submitted"
  | "accepted"
  | "rejected";

export type AcpSkillRunConnectionActionState =
  | "idle"
  | "connecting"
  | "disconnecting";

export type AcpSkillRunOutputRevisionStatus = "invalid" | "pending" | "final";

export type AcpSkillRunOutputRevision = {
  id: string;
  candidateText: string;
  repairRound: number;
  status: AcpSkillRunOutputRevisionStatus;
  errors?: string[];
  replacementReason?: string;
  createdAt: string;
};

export type AcpSkillRunMessageRevisionSummary = {
  count: number;
  latestStatus: AcpSkillRunOutputRevisionStatus;
  latestRepairRound: number;
};

export type AcpSkillRunEvent = {
  ts: string;
  stage: string;
  message: string;
  level: "info" | "warn" | "error";
  details?: Record<string, unknown>;
};

export type AcpSkillRunTranscriptItem =
  | {
      id: string;
      kind: "message";
      role: "assistant" | "user";
      text: string;
      state?: "streaming" | "complete";
      revision?: AcpSkillRunMessageRevisionSummary;
      createdAt: string;
      updatedAt?: string;
    }
  | {
      id: string;
      kind: "thought";
      text: string;
      state?: "streaming" | "complete";
      createdAt: string;
      updatedAt?: string;
    }
  | {
      id: string;
      kind: "tool_call";
      toolCallId: string;
      title?: string;
      state: "pending" | "in_progress" | "completed" | "failed";
      toolKind?: string;
      toolName?: string;
      inputSummary?: string;
      resultSummary?: string;
      summary?: string;
      createdAt: string;
      updatedAt?: string;
    }
  | {
      id: string;
      kind: "status";
      level: "info" | "warn" | "error";
      label: string;
      text: string;
      details?: Record<string, unknown>;
      createdAt: string;
      updatedAt?: string;
    }
  | {
      id: string;
      kind: "permission";
      permissionRequestId: string;
      status: "pending" | "approved" | "denied" | "cancelled";
      title: string;
      summary: string;
      source?: string;
      createdAt: string;
      updatedAt?: string;
    };

export type AcpSkillRunPlanEntry = {
  content: string;
  priority?: string;
  status?: string;
};

export type AcpSkillRunPendingInteraction = {
  message: string;
  uiHints: Record<string, unknown>;
  candidateText?: string;
};

export type AcpSkillRunHostBridgeCliState = {
  available: boolean;
  endpoint?: string;
  tokenMasked?: string;
  profilePath?: string;
  readmePath?: string;
  cliDir?: string;
  binarySource?: string;
  pathInjected: boolean;
  autoApproveWrites?: boolean;
  fallbackReason?: string;
};

export type AcpSkillRunRecord = {
  requestId: string;
  status: AcpSkillRunStatus;
  backendStatus?: AcpSkillRunStatus;
  backendId: string;
  backendType: string;
  backendLabel?: string;
  workflowId?: string;
  workflowLabel?: string;
  jobId?: string;
  runId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceFinalStepId?: string;
  taskName?: string;
  skillName?: string;
  skillLabel?: string;
  skillId?: string;
  requestPayload?: unknown;
  providerOptions?: Record<string, unknown>;
  executionMode?: "auto" | "interactive";
  workspaceDir?: string;
  runtimeDir?: string;
  inputManifestPath?: string;
  resultJsonPath?: string;
  acpModeId?: string;
  acpModelId?: string;
  acpReasoningEffort?: string;
  acpRawModelId?: string;
  agentFamily?: string;
  skillRoots?: string[];
  sharedSkillCatalogPath?: string;
  proxySkillCount?: number;
  proxySkillRoots?: string[];
  requestedSkillId?: string;
  requestedSkillProxyPath?: string;
  primarySkillDir?: string;
  runnerJson?: Record<string, unknown>;
  resourceRewriteWarnings?: string[];
  runtimeDependencies?: string[];
  runtimeDependencyStatus?:
    | "not-required"
    | "disabled"
    | "probing"
    | "ready"
    | "failed";
  runtimeDependencyError?: string;
  hostBridgeCli?: AcpSkillRunHostBridgeCliState;
  repairRounds: number;
  validationStatus?: "pending" | "valid" | "invalid";
  validationErrors?: string[];
  outputConvergenceState?: "pending" | "final" | "invalid";
  lastTurnOutput?: string;
  pendingInteraction?: AcpSkillRunPendingInteraction;
  conversationState?: AcpSkillRunConversationState;
  conversationRecoveryState?: AcpSkillRunRecoveryState;
  conversationError?: string;
  lastRecoveryError?: string;
  replyState?: AcpSkillRunReplyState;
  replyError?: string;
  connectionActionState?: AcpSkillRunConnectionActionState;
  lastPromptStopReason?: string;
  appliedAt?: string;
  applyResultState?: "pending" | "succeeded" | "failed";
  sessionId?: string;
  activePrompt?: boolean;
  pendingPermission?: AcpPendingPermissionRequest | null;
  resultJson?: unknown;
  outputRevisions: AcpSkillRunOutputRevision[];
  error?: string;
  usage?: {
    used: number;
    size: number;
  };
  removedAt?: string;
  archivedAt?: string;
  planEntries?: AcpSkillRunPlanEntry[];
  transcriptItems: AcpSkillRunTranscriptItem[];
  createdAt: string;
  updatedAt: string;
  events: AcpSkillRunEvent[];
};

export type AcpSkillRunRetentionCleanupResult = {
  rowsDeleted: number;
  requestIds: string[];
  workspaceDirs: string[];
};

export type AcpSkillRunSummary = Pick<
  AcpSkillRunRecord,
  | "requestId"
  | "status"
  | "backendStatus"
  | "backendId"
  | "backendType"
  | "backendLabel"
  | "workflowId"
  | "workflowLabel"
  | "jobId"
  | "runId"
  | "sequenceStepId"
  | "sequenceStepIndex"
  | "taskName"
  | "skillName"
  | "skillLabel"
  | "skillId"
  | "executionMode"
  | "workspaceDir"
  | "acpModeId"
  | "acpModelId"
  | "acpReasoningEffort"
  | "agentFamily"
  | "conversationState"
  | "conversationRecoveryState"
  | "conversationError"
  | "replyState"
  | "connectionActionState"
  | "applyResultState"
  | "pendingPermission"
  | "activePrompt"
  | "error"
  | "removedAt"
  | "archivedAt"
  | "createdAt"
  | "updatedAt"
>;

export type AcpSkillRunSummaryListOptions = {
  activeOnly?: boolean;
  backendId?: string;
  requestId?: string;
  includeArchived?: boolean;
  limit?: number;
};

export type AcpSkillRunPanelSnapshot = {
  generatedAt: string;
  selectedRequestId: string;
  mcpServer?: ZoteroMcpServerStatusSnapshot;
  mcpHealth?: AcpMcpHealthSnapshot;
  hostBridge?: HostBridgeStatusSnapshot;
  summary: {
    total: number;
    active: number;
    failed: number;
    recent: number;
  };
  drawer?: {
    notice?: string;
    truncated?: boolean;
  };
  runs: AcpSkillRunSummary[];
  selectedRun?: AcpSkillRunRecord;
  selectedRuntimeOptions?: AcpSkillRunRuntimeOptionsSnapshot;
  selectedTask?: WorkflowTaskRecord;
  logs: Array<{
    id: string;
    ts: string;
    level: string;
    stage: string;
    message: string;
    scope: string;
  }>;
  labels?: {
    assistantPanel: ReturnType<typeof buildAssistantPanelLabels>;
    title?: string;
    completedTasksTitle?: string;
    panelRendererUnavailable?: string;
    panelRendererFailed?: string;
    transcriptRendererUnavailable?: string;
  };
};

export type AcpSkillRunRuntimeOptionsSnapshot = {
  modeOptions: AcpSelectableOption[];
  currentMode?: AcpSelectableOption;
  modelOptions: AcpSelectableOption[];
  currentModel?: AcpSelectableOption;
  displayModelOptions: AcpSelectableOption[];
  currentDisplayModel?: AcpSelectableOption;
  reasoningEffortOptions: AcpSelectableOption[];
  currentReasoningEffort?: AcpSelectableOption;
};

type AcpSkillRunController = {
  cancel: () => Promise<void>;
  interruptTurn?: () => Promise<void>;
  reply?: (message: string) => Promise<void>;
  disconnect?: () => Promise<void>;
  endSession?: () => Promise<void>;
  setConfigOption?: (args: {
    sessionId: string;
    category: AcpSessionConfigCategory;
    value: string;
  }) => Promise<boolean>;
  setMode?: (args: { sessionId: string; modeId: string }) => Promise<void>;
  setModel?: (args: { sessionId: string; modelId: string }) => Promise<void>;
};

type AcpSkillRunListener = () => void;
type AcpSkillRunRecoveryHandler = (args: {
  requestId: string;
  reason: "connect" | "reply";
}) => Promise<void>;

const runRecords = new Map<string, AcpSkillRunRecord>();
const controllers = new Map<string, AcpSkillRunController>();
const runtimeOptionsByRequestId = new Map<
  string,
  AcpSkillRunRuntimeOptionsSnapshot
>();
const permissionResolvers = new Map<
  string,
  {
    runRequestId: string;
    resolve: (outcome: RequestPermissionOutcome) => void;
  }
>();
const listeners = new Set<AcpSkillRunListener>();
let hydrated = false;
let selectedRequestId = "";
let recoveryHandler: AcpSkillRunRecoveryHandler | null = null;
let changedEmitTimer: ReturnType<typeof setTimeout> | null = null;
const activeRunRequestIds = new Set<string>();
const ACP_SKILL_RUN_PANEL_RUN_LIMIT = 100;
const acpSkillRunSummaryDiagnostics = {
  summaryQueryCount: 0,
  fullRunRecordScanCount: 0,
  activeIndexScanCount: 0,
  runCandidateReadCount: 0,
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isActiveAcpSkillRunRecordForSummary(record: AcpSkillRunRecord) {
  return (
    !record.removedAt &&
    !record.archivedAt &&
    record.status !== "succeeded" &&
    record.status !== "failed" &&
    record.status !== "canceled"
  );
}

function syncAcpSkillRunActiveIndex(record: AcpSkillRunRecord) {
  if (isActiveAcpSkillRunRecordForSummary(record)) {
    activeRunRequestIds.add(record.requestId);
  } else {
    activeRunRequestIds.delete(record.requestId);
  }
}

function setAcpSkillRunRecord(record: AcpSkillRunRecord) {
  runRecords.set(record.requestId, record);
  syncAcpSkillRunActiveIndex(record);
}

function deleteAcpSkillRunRecord(requestId: string) {
  const removed = runRecords.delete(requestId);
  activeRunRequestIds.delete(requestId);
  return removed;
}

function clearAcpSkillRunRecords() {
  runRecords.clear();
  activeRunRequestIds.clear();
}

function normalizeOptionalNonNegativeInteger(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return Math.floor(parsed);
}

function normalizeSelectableOption(value: unknown): AcpSelectableOption | null {
  if (!isRecord(value)) {
    const id = normalizeString(value);
    return id ? { id, label: id } : null;
  }
  const id = normalizeString(value.id);
  if (!id) return null;
  return {
    id,
    label: normalizeString(value.label) || id,
    description: normalizeString(value.description) || undefined,
  };
}

function normalizeSelectableOptions(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeSelectableOption)
    .filter((entry): entry is AcpSelectableOption => !!entry);
}

function cloneSelectableOption(option?: AcpSelectableOption) {
  return option ? { ...option } : undefined;
}

function cloneSelectableOptions(options: AcpSelectableOption[]) {
  return options.map((entry) => ({ ...entry }));
}

function findSelectableOption(options: AcpSelectableOption[], idRaw: unknown) {
  const id = normalizeString(idRaw);
  if (!id) return undefined;
  return (
    options.find((entry) => normalizeString(entry.id) === id) || {
      id,
      label: id,
    }
  );
}

function cloneRuntimeOptions(
  options: AcpSkillRunRuntimeOptionsSnapshot,
): AcpSkillRunRuntimeOptionsSnapshot {
  return {
    modeOptions: cloneSelectableOptions(options.modeOptions),
    currentMode: cloneSelectableOption(options.currentMode),
    modelOptions: cloneSelectableOptions(options.modelOptions),
    currentModel: cloneSelectableOption(options.currentModel),
    displayModelOptions: cloneSelectableOptions(options.displayModelOptions),
    currentDisplayModel: cloneSelectableOption(options.currentDisplayModel),
    reasoningEffortOptions: cloneSelectableOptions(
      options.reasoningEffortOptions,
    ),
    currentReasoningEffort: cloneSelectableOption(
      options.currentReasoningEffort,
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStatus(value: unknown): AcpSkillRunStatus {
  const normalized = normalizeString(value).toLowerCase();
  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "waiting_user" ||
    normalized === "repairing" ||
    normalized === "succeeded" ||
    normalized === "failed" ||
    normalized === "canceled"
  ) {
    return normalized;
  }
  return "running";
}

function normalizeConversationState(
  value: unknown,
): AcpSkillRunConversationState {
  const normalized = normalizeString(value).toLowerCase();
  if (
    normalized === "starting" ||
    normalized === "active" ||
    normalized === "ended" ||
    normalized === "closed" ||
    normalized === "error"
  ) {
    return normalized;
  }
  return "closed";
}

function normalizeRecoveryState(value: unknown): AcpSkillRunRecoveryState {
  const normalized = normalizeString(value).toLowerCase();
  if (
    normalized === "available" ||
    normalized === "connecting" ||
    normalized === "connected" ||
    normalized === "failed" ||
    normalized === "unsupported"
  ) {
    return normalized;
  }
  return "unavailable";
}

function normalizeReplyState(value: unknown): AcpSkillRunReplyState {
  const normalized = normalizeString(value).toLowerCase();
  if (
    normalized === "submitted" ||
    normalized === "accepted" ||
    normalized === "rejected"
  ) {
    return normalized;
  }
  return "idle";
}

function normalizeConnectionActionState(
  value: unknown,
): AcpSkillRunConnectionActionState {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "connecting" || normalized === "disconnecting") {
    return normalized;
  }
  return "idle";
}

function parsePendingInteraction(
  value: unknown,
): AcpSkillRunPendingInteraction | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const message = normalizeString(value.message);
  if (!message) {
    return undefined;
  }
  return {
    message,
    uiHints: isRecord(value.uiHints) ? { ...value.uiHints } : {},
    candidateText: normalizeString(value.candidateText) || undefined,
  };
}

function normalizeOutputRevisionStatus(
  value: unknown,
): AcpSkillRunOutputRevisionStatus | undefined {
  const normalized = normalizeString(value);
  return normalized === "invalid" ||
    normalized === "pending" ||
    normalized === "final"
    ? normalized
    : undefined;
}

function parseMessageRevision(
  value: unknown,
): AcpSkillRunMessageRevisionSummary | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const latestStatus = normalizeOutputRevisionStatus(value.latestStatus);
  const count = Math.max(0, Math.floor(Number(value.count || 0) || 0));
  if (!latestStatus || count <= 0) {
    return undefined;
  }
  return {
    count,
    latestStatus,
    latestRepairRound: Math.max(
      0,
      Math.floor(Number(value.latestRepairRound || 0) || 0),
    ),
  };
}

function parseOutputRevisions(value: unknown): AcpSkillRunOutputRevision[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .reduce<AcpSkillRunOutputRevision[]>((acc, raw, index) => {
      const status = normalizeOutputRevisionStatus(raw.status);
      if (!status) {
        return acc;
      }
      const createdAt = normalizeString(raw.createdAt) || nowIso();
      acc.push({
        id: normalizeString(raw.id) || `revision-${index + 1}`,
        candidateText: normalizeString(raw.candidateText),
        repairRound: Math.max(0, Math.floor(Number(raw.repairRound || 0) || 0)),
        status,
        errors: parseStringArray(raw.errors),
        replacementReason: normalizeString(raw.replacementReason) || undefined,
        createdAt,
      });
      return acc;
    }, [])
    .slice(-50);
}

function buildOutputRevisionSummary(
  revisions: AcpSkillRunOutputRevision[],
): AcpSkillRunMessageRevisionSummary | undefined {
  const valid = revisions.filter((entry) => entry.status);
  const latest = valid[valid.length - 1];
  if (!latest) {
    return undefined;
  }
  return {
    count: valid.length,
    latestStatus: latest.status,
    latestRepairRound: latest.repairRound,
  };
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => normalizeString(entry)).filter(Boolean);
}

function normalizeToolCallState(
  value: unknown,
): "pending" | "in_progress" | "completed" | "failed" {
  const normalized = normalizeString(value).toLowerCase();
  if (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "succeeded" ||
    normalized === "success"
  ) {
    return "completed";
  }
  if (normalized === "failed" || normalized === "error") {
    return "failed";
  }
  if (
    normalized === "running" ||
    normalized === "in_progress" ||
    normalized === "started"
  ) {
    return "in_progress";
  }
  return "pending";
}

function toolStateRank(state: unknown) {
  const normalized = normalizeString(state).toLowerCase();
  if (normalized === "failed") return 4;
  if (normalized === "completed") return 3;
  if (normalized === "in_progress") return 2;
  return 1;
}

function isGenericToolText(value: unknown) {
  const text = normalizeString(value);
  const normalized = text.toLowerCase();
  return (
    !text ||
    normalized === "tool" ||
    normalized === "tool call" ||
    normalized === "other" ||
    text === "[]" ||
    text === "{}" ||
    /^call[_-][a-z0-9_-]+$/i.test(text) ||
    /^toolu_[a-z0-9_-]+$/i.test(text)
  );
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value) && value.length === 0) {
    return "";
  }
  if (isRecord(value) && Object.keys(value).length === 0) {
    return "";
  }
  try {
    return JSON.stringify(value) || "";
  } catch {
    return "";
  }
}

function shortenToolSummary(value: unknown) {
  const text = safeStringify(value).replace(/\s+/g, " ").trim();
  if (isGenericToolText(text)) {
    return "";
  }
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function firstToolText(values: unknown[]) {
  for (const value of values) {
    const text = shortenToolSummary(value);
    if (text) {
      return text;
    }
  }
  return "";
}

function toolEventTime(item: { updatedAt?: string; createdAt?: string }) {
  const parsed = Date.parse(item.updatedAt || item.createdAt || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function shouldShowEventInTranscript(stage: string) {
  return new Set([
    "output-validation-failed",
    "repair-started",
    "repair-validation-failed",
    "acp-prompt-no-output",
    "acp-prompt-stopped",
    "acp-prompt-failed",
    "permission-requested",
    "permission-resolved",
    "conversation-ended",
    "conversation-closed",
    "conversation-error",
    "reply-unavailable",
    "workspace-activity",
    "apply-pending",
    "apply-succeeded",
    "apply-failed",
    "succeeded",
    "failed",
    "canceled",
    "cancel-requested",
    "interrupt-completed",
  ]).has(normalizeString(stage));
}

function permissionStatusFromResolution(details: Record<string, unknown>) {
  const outcome = normalizeString(details.outcome);
  const optionId = normalizeString(details.optionId).toLowerCase();
  if (outcome === "cancelled" || outcome === "canceled") {
    return "cancelled" as const;
  }
  if (
    optionId.includes("deny") ||
    optionId.includes("reject") ||
    optionId.includes("cancel")
  ) {
    return "denied" as const;
  }
  return "approved" as const;
}

function upsertPermissionTranscriptItem(
  record: AcpSkillRunRecord,
  event: AcpSkillRunEvent,
) {
  const details = event.details || {};
  const permissionRequestId =
    normalizeString(details.permissionRequestId) ||
    normalizeString(details.requestId);
  if (!permissionRequestId) {
    return false;
  }
  const existingIndex = record.transcriptItems.findIndex(
    (item) =>
      item.kind === "permission" &&
      item.permissionRequestId === permissionRequestId,
  );
  const status =
    event.stage === "permission-resolved"
      ? permissionStatusFromResolution(details)
      : "pending";
  const previous =
    existingIndex >= 0 ? record.transcriptItems[existingIndex] : null;
  const item: AcpSkillRunTranscriptItem = {
    id:
      previous?.kind === "permission"
        ? previous.id
        : `acp-skill-permission-${record.transcriptItems.length + 1}`,
    kind: "permission",
    permissionRequestId,
    status,
    title:
      normalizeString(details.toolTitle) ||
      (previous?.kind === "permission" ? previous.title : "") ||
      "Permission request",
    summary:
      normalizeString(details.summary) ||
      (previous?.kind === "permission" ? previous.summary : "") ||
      normalizeString(event.message) ||
      "ACP backend requests approval.",
    source:
      normalizeString(details.source) ||
      (previous?.kind === "permission" ? previous.source : undefined),
    createdAt: previous?.kind === "permission" ? previous.createdAt : event.ts,
    updatedAt: event.ts,
  };
  if (existingIndex >= 0) {
    record.transcriptItems = record.transcriptItems.map((entry, index) =>
      index === existingIndex ? item : entry,
    );
  } else {
    record.transcriptItems = [...record.transcriptItems, item].slice(-200);
  }
  return true;
}

function appendStatusTranscriptItem(
  record: AcpSkillRunRecord,
  event: AcpSkillRunEvent,
) {
  const text = normalizeString(event.message);
  if (!text || !shouldShowEventInTranscript(event.stage)) {
    return;
  }
  if (
    (event.stage === "permission-requested" ||
      event.stage === "permission-resolved") &&
    upsertPermissionTranscriptItem(record, event)
  ) {
    return;
  }
  const last = record.transcriptItems[record.transcriptItems.length - 1];
  if (
    last?.kind === "status" &&
    last.label === event.stage &&
    last.text === text
  ) {
    last.updatedAt = event.ts;
    return;
  }
  const item: AcpSkillRunTranscriptItem = {
    id: `acp-skill-status-${record.transcriptItems.length + 1}`,
    kind: "status",
    level: event.level,
    label: event.stage,
    text:
      event.stage === "workspace-activity"
        ? normalizeString(event.details?.relativePath) || text
        : text,
    details: event.details ? { ...event.details } : undefined,
    createdAt: event.ts,
  };
  record.transcriptItems = [...record.transcriptItems, item].slice(-200);
}

function parseTranscriptItems(value: unknown, updatedAt: string) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .reduce<AcpSkillRunTranscriptItem[]>((acc, raw) => {
      const kind = normalizeString(raw.kind);
      const id = normalizeString(raw.id);
      const createdAt = normalizeString(raw.createdAt) || updatedAt;
      const updatedAtValue = normalizeString(raw.updatedAt) || undefined;
      if (!id) {
        return acc;
      }
      if (kind === "message") {
        const role = raw.role === "user" ? "user" : "assistant";
        acc.push({
          id,
          kind,
          role,
          text: normalizeString(raw.text),
          state: raw.state === "complete" ? "complete" : "streaming",
          revision: parseMessageRevision(raw.revision),
          createdAt,
          updatedAt: updatedAtValue,
        });
        return acc;
      }
      if (kind === "thought") {
        acc.push({
          id,
          kind,
          text: normalizeString(raw.text),
          state: raw.state === "complete" ? "complete" : "streaming",
          createdAt,
          updatedAt: updatedAtValue,
        });
        return acc;
      }
      if (kind === "tool_call") {
        const state = normalizeToolCallState(raw.state);
        acc.push({
          id,
          kind,
          toolCallId: normalizeString(raw.toolCallId) || id,
          title: normalizeString(raw.title) || undefined,
          state,
          toolKind: normalizeString(raw.toolKind) || undefined,
          toolName: normalizeString(raw.toolName) || undefined,
          inputSummary: normalizeString(raw.inputSummary) || undefined,
          resultSummary: normalizeString(raw.resultSummary) || undefined,
          summary: normalizeString(raw.summary) || undefined,
          createdAt,
          updatedAt: updatedAtValue,
        });
        return acc;
      }
      if (kind === "status") {
        acc.push({
          id,
          kind,
          level:
            raw.level === "error" || raw.level === "warn" ? raw.level : "info",
          label: normalizeString(raw.label) || "Status",
          text: normalizeString(raw.text),
          details: isRecord(raw.details) ? { ...raw.details } : undefined,
          createdAt,
          updatedAt: updatedAtValue,
        });
        return acc;
      }
      if (kind === "permission") {
        const status = normalizeString(raw.status);
        acc.push({
          id,
          kind,
          permissionRequestId: normalizeString(raw.permissionRequestId),
          status:
            status === "approved" ||
            status === "denied" ||
            status === "cancelled"
              ? status
              : "pending",
          title: normalizeString(raw.title) || "Permission request",
          summary:
            normalizeString(raw.summary) || "ACP backend requests approval.",
          source: normalizeString(raw.source) || undefined,
          createdAt,
          updatedAt: updatedAtValue,
        });
      }
      return acc;
    }, []);
}

function parsePlanEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .map((entry) => ({
      content: normalizeString(entry.content),
      priority: normalizeString(entry.priority) || undefined,
      status: normalizeString(entry.status) || undefined,
    }))
    .filter((entry) => entry.content);
}

function parseHostBridgeCliState(
  value: unknown,
): AcpSkillRunHostBridgeCliState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    available: value.available === true,
    endpoint: normalizeString(value.endpoint) || undefined,
    tokenMasked: normalizeString(value.tokenMasked) || undefined,
    profilePath: normalizeString(value.profilePath) || undefined,
    readmePath: normalizeString(value.readmePath) || undefined,
    cliDir: normalizeString(value.cliDir) || undefined,
    binarySource: normalizeString(value.binarySource) || undefined,
    pathInjected: value.pathInjected === true,
    autoApproveWrites: value.autoApproveWrites === true,
    fallbackReason: normalizeString(value.fallbackReason) || undefined,
  };
}

function parseRunRecord(raw: unknown): AcpSkillRunRecord | null {
  if (!isRecord(raw)) {
    return null;
  }
  const requestId = normalizeString(raw.requestId);
  if (!requestId) {
    return null;
  }
  const createdAt = normalizeString(raw.createdAt) || nowIso();
  const updatedAt = normalizeString(raw.updatedAt) || createdAt;
  const rawEvents = Array.isArray(raw.events) ? raw.events : [];
  return {
    requestId,
    status: normalizeStatus(raw.status),
    backendStatus: raw.backendStatus
      ? normalizeStatus(raw.backendStatus)
      : normalizeStatus(raw.status),
    backendId: normalizeString(raw.backendId),
    backendType: normalizeString(raw.backendType) || "acp",
    backendLabel: normalizeString(raw.backendLabel) || undefined,
    workflowId: normalizeString(raw.workflowId) || undefined,
    workflowLabel: normalizeString(raw.workflowLabel) || undefined,
    jobId: normalizeString(raw.jobId) || undefined,
    runId: normalizeString(raw.runId) || undefined,
    sequenceStepId: normalizeString(raw.sequenceStepId) || undefined,
    sequenceStepIndex: normalizeOptionalNonNegativeInteger(
      raw.sequenceStepIndex,
    ),
    sequenceFinalStepId: normalizeString(raw.sequenceFinalStepId) || undefined,
    taskName: normalizeString(raw.taskName) || undefined,
    skillName: normalizeString(raw.skillName) || undefined,
    skillLabel: normalizeString(raw.skillLabel) || undefined,
    skillId: normalizeString(raw.skillId) || undefined,
    requestPayload: raw.requestPayload,
    providerOptions: isRecord(raw.providerOptions)
      ? { ...raw.providerOptions }
      : undefined,
    executionMode:
      normalizeString(raw.executionMode).toLowerCase() === "interactive"
        ? "interactive"
        : normalizeString(raw.executionMode).toLowerCase() === "auto"
          ? "auto"
          : undefined,
    workspaceDir: normalizeString(raw.workspaceDir) || undefined,
    runtimeDir: normalizeString(raw.runtimeDir) || undefined,
    inputManifestPath: normalizeString(raw.inputManifestPath) || undefined,
    resultJsonPath: normalizeString(raw.resultJsonPath) || undefined,
    acpModeId: normalizeString(raw.acpModeId) || undefined,
    acpModelId: normalizeString(raw.acpModelId) || undefined,
    acpReasoningEffort: normalizeString(raw.acpReasoningEffort) || undefined,
    acpRawModelId: normalizeString(raw.acpRawModelId) || undefined,
    agentFamily: normalizeString(raw.agentFamily) || undefined,
    skillRoots: parseStringArray(raw.skillRoots),
    sharedSkillCatalogPath:
      normalizeString(raw.sharedSkillCatalogPath) || undefined,
    proxySkillCount: Math.max(
      0,
      Math.floor(Number(raw.proxySkillCount || 0) || 0),
    ),
    proxySkillRoots: parseStringArray(raw.proxySkillRoots),
    requestedSkillId: normalizeString(raw.requestedSkillId) || undefined,
    requestedSkillProxyPath:
      normalizeString(raw.requestedSkillProxyPath) || undefined,
    primarySkillDir: normalizeString(raw.primarySkillDir) || undefined,
    runnerJson: isRecord(raw.runnerJson) ? { ...raw.runnerJson } : undefined,
    resourceRewriteWarnings: parseStringArray(raw.resourceRewriteWarnings),
    runtimeDependencies: parseStringArray(raw.runtimeDependencies),
    runtimeDependencyStatus:
      raw.runtimeDependencyStatus === "failed" ||
      raw.runtimeDependencyStatus === "disabled" ||
      raw.runtimeDependencyStatus === "ready" ||
      raw.runtimeDependencyStatus === "probing"
        ? raw.runtimeDependencyStatus
        : "not-required",
    runtimeDependencyError:
      normalizeString(raw.runtimeDependencyError) || undefined,
    hostBridgeCli: parseHostBridgeCliState(raw.hostBridgeCli),
    repairRounds: Math.max(0, Math.floor(Number(raw.repairRounds || 0) || 0)),
    validationStatus:
      raw.validationStatus === "valid" || raw.validationStatus === "invalid"
        ? raw.validationStatus
        : "pending",
    validationErrors: parseStringArray(raw.validationErrors),
    outputConvergenceState:
      raw.outputConvergenceState === "pending" ||
      raw.outputConvergenceState === "final" ||
      raw.outputConvergenceState === "invalid"
        ? raw.outputConvergenceState
        : undefined,
    lastTurnOutput: normalizeString(raw.lastTurnOutput) || undefined,
    pendingInteraction: parsePendingInteraction(raw.pendingInteraction),
    conversationState: normalizeConversationState(raw.conversationState),
    conversationRecoveryState: normalizeRecoveryState(
      raw.conversationRecoveryState,
    ),
    conversationError: normalizeString(raw.conversationError) || undefined,
    lastRecoveryError: normalizeString(raw.lastRecoveryError) || undefined,
    replyState: normalizeReplyState(raw.replyState),
    replyError: normalizeString(raw.replyError) || undefined,
    connectionActionState: normalizeConnectionActionState(
      raw.connectionActionState,
    ),
    lastPromptStopReason:
      normalizeString(raw.lastPromptStopReason) || undefined,
    appliedAt: normalizeString(raw.appliedAt) || undefined,
    applyResultState:
      raw.applyResultState === "succeeded" || raw.applyResultState === "failed"
        ? raw.applyResultState
        : raw.applyResultState === "pending"
          ? "pending"
          : undefined,
    sessionId: normalizeString(raw.sessionId) || undefined,
    activePrompt: raw.activePrompt === true,
    pendingPermission: isRecord(raw.pendingPermission)
      ? ({
          requestId: normalizeString(raw.pendingPermission.requestId),
          sessionId: normalizeString(raw.pendingPermission.sessionId),
          toolCallId: normalizeString(raw.pendingPermission.toolCallId),
          toolTitle: normalizeString(raw.pendingPermission.toolTitle),
          source: normalizeString(raw.pendingPermission.source) || undefined,
          summary: normalizeString(raw.pendingPermission.summary) || undefined,
          detail: normalizeString(raw.pendingPermission.detail) || undefined,
          requestedAt:
            normalizeString(raw.pendingPermission.requestedAt) || updatedAt,
          options: Array.isArray(raw.pendingPermission.options)
            ? raw.pendingPermission.options
                .filter(isRecord)
                .map((option) => ({
                  optionId: normalizeString(option.optionId),
                  name: normalizeString(option.name),
                  description: normalizeString(option.description) || undefined,
                  kind:
                    option.kind === "allow_once" ||
                    option.kind === "allow_always" ||
                    option.kind === "reject_once" ||
                    option.kind === "reject_always"
                      ? option.kind
                      : undefined,
                }))
                .filter((option) => option.optionId)
            : [],
        } as AcpPendingPermissionRequest)
      : null,
    resultJson: raw.resultJson,
    outputRevisions: parseOutputRevisions(raw.outputRevisions),
    error: normalizeString(raw.error) || undefined,
    usage: isRecord(raw.usage)
      ? {
          used: Math.max(0, Math.floor(Number(raw.usage.used || 0) || 0)),
          size: Math.max(0, Math.floor(Number(raw.usage.size || 0) || 0)),
        }
      : undefined,
    removedAt: normalizeString(raw.removedAt) || undefined,
    archivedAt: normalizeString(raw.archivedAt) || undefined,
    planEntries: parsePlanEntries(raw.planEntries),
    transcriptItems: parseTranscriptItems(raw.transcriptItems, updatedAt),
    createdAt,
    updatedAt,
    events: rawEvents.filter(isRecord).map((entry) => ({
      ts: normalizeString(entry.ts) || updatedAt,
      stage: normalizeString(entry.stage) || "unknown",
      message: normalizeString(entry.message) || "Run updated",
      level:
        entry.level === "error" || entry.level === "warn"
          ? entry.level
          : "info",
      details: isRecord(entry.details) ? { ...entry.details } : undefined,
    })),
  };
}

function ensureHydrated() {
  if (hydrated) {
    return;
  }
  hydrated = true;
  for (const row of listPluginRunStoreEntries("acp")) {
    try {
      const parsed = parseRunRecord(JSON.parse(row.payload || "{}"));
      if (!parsed) {
        continue;
      }
      setAcpSkillRunRecord(parsed);
    } catch {
      continue;
    }
  }
}

function persistRun(record: AcpSkillRunRecord) {
  if (normalizeString(record.backendType) !== ACP_BACKEND_TYPE) {
    return;
  }
  upsertPluginRunStoreEntry("acp", {
    runKey: record.requestId,
    requestId: record.requestId,
    backendId: record.backendId,
    state: record.status,
    updatedAt: record.updatedAt,
    payload: JSON.stringify(record),
  });
  const latestEvent = record.events[record.events.length - 1];
  if (latestEvent) {
    appendPluginRunEventStoreEntry("acp", {
      eventId: `${record.requestId}:${latestEvent.ts}:${record.events.length}:${latestEvent.stage}`,
      runKey: record.requestId,
      requestId: record.requestId,
      backendId: record.backendId,
      type: latestEvent.stage,
      createdAt: latestEvent.ts || record.updatedAt,
      payload: JSON.stringify(latestEvent),
    });
  }
}

function isTerminalAcpSkillRunStatus(
  status: AcpSkillRunStatus,
): status is "succeeded" | "failed" | "canceled" {
  return status === "succeeded" || status === "failed" || status === "canceled";
}

function retentionTimestampMs(record: AcpSkillRunRecord) {
  const parsed = Date.parse(
    record.removedAt || record.archivedAt || record.updatedAt || "",
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function isAcpSkillRunRetentionEligible(args: {
  record: AcpSkillRunRecord;
  thresholdMs: number;
}) {
  const record = args.record;
  if (!isTerminalAcpSkillRunStatus(record.status)) {
    return false;
  }
  if (!record.removedAt && !record.archivedAt) {
    return false;
  }
  const ts = retentionTimestampMs(record);
  return ts > 0 && ts < args.thresholdMs;
}

function syncWorkflowTaskForAcpSkillRun(record: AcpSkillRunRecord) {
  const requestId = normalizeString(record.requestId);
  if (!requestId) {
    return;
  }
  if (record.removedAt || record.archivedAt) {
    removeWorkflowTasksByBackendAndRequestIds({
      backendId: record.backendId,
      requestIds: [requestId],
    });
    return;
  }
  if (!isTerminalAcpSkillRunStatus(record.status)) {
    return;
  }
  updateWorkflowTaskStateByRequest({
    backendId: record.backendId,
    backendType: ACP_BACKEND_TYPE,
    requestId,
    state: record.status,
    backendStatus: record.backendStatus,
    error: record.error || record.conversationError,
    updatedAt: record.updatedAt,
  });
}

function isAcpSkillRunWorkflowTask(task: WorkflowTaskRecord) {
  const backendType = normalizeString(task.backendType);
  const requestKind = normalizeString(task.requestKind);
  const taskId = normalizeString(task.id);
  return (
    backendType === ACP_BACKEND_TYPE &&
    (requestKind === ACP_SKILL_RUN_REQUEST_KIND ||
      taskId.startsWith("acp-skill-run:"))
  );
}

function acpRunStatusToWorkflowTaskState(
  record: AcpSkillRunRecord,
): WorkflowTaskRecord["state"] {
  if (record.pendingPermission) {
    return "waiting_user";
  }
  if (
    record.status === "queued" ||
    record.status === "running" ||
    record.status === "waiting_user" ||
    record.status === "failed" ||
    record.status === "canceled" ||
    record.status === "succeeded"
  ) {
    return record.status;
  }
  return "running";
}

function isRecoverableAcpSkillRunAfterStartup(record: AcpSkillRunRecord) {
  return (
    record.conversationRecoveryState === "available" ||
    record.conversationRecoveryState === "connected" ||
    record.conversationRecoveryState === "connecting"
  );
}

export function reconcileAcpSkillRunWorkflowTasksOnStartup() {
  ensureHydrated();
  const runsByRequestId = new Map(
    Array.from(runRecords.values()).map((run) => [run.requestId, run] as const),
  );
  let removedCount = 0;
  let terminalSyncedCount = 0;
  let recoverableCount = 0;
  let failedCount = 0;
  for (const task of listWorkflowTasks()) {
    if (!isAcpSkillRunWorkflowTask(task) || !task.requestId) {
      continue;
    }
    const requestId = normalizeString(task.requestId);
    const run = runsByRequestId.get(requestId);
    if (!run || run.removedAt || run.archivedAt) {
      const removed = removeWorkflowTasksByBackendAndRequestIds({
        backendId: task.backendId || run?.backendId || "",
        requestIds: [requestId],
      });
      removedCount += removed;
      if (removed === 0) {
        updateWorkflowTaskStateByRequest({
          requestId,
          backendType: ACP_BACKEND_TYPE,
          state: "failed",
          error:
            "ACP skill run task projection was restored without an available ACP run record.",
        });
        failedCount += 1;
      }
      continue;
    }
    if (isTerminalAcpSkillRunStatus(run.status)) {
      syncWorkflowTaskForAcpSkillRun(run);
      terminalSyncedCount += 1;
      continue;
    }
    if (isRecoverableAcpSkillRunAfterStartup(run)) {
      if (
        run.conversationRecoveryState !== "available" ||
        run.conversationState !== "closed" ||
        run.activePrompt
      ) {
        upsertAcpSkillRun({
          requestId,
          activePrompt: false,
          conversationState: "closed",
          conversationRecoveryState: "available",
          connectionActionState: "idle",
          event: {
            stage: "startup-recovery-available",
            message:
              "ACP skill run local controller was lost during restart; remote session remains recoverable.",
            level: "info",
          },
        });
      }
      const updated = getAcpSkillRunRecord(requestId) || run;
      updateWorkflowTaskStateByRequest({
        backendId: updated.backendId || task.backendId,
        backendType: ACP_BACKEND_TYPE,
        requestId,
        state: acpRunStatusToWorkflowTaskState(updated),
        error:
          updated.error ||
          updated.conversationError ||
          "ACP skill run is recoverable after the previous plugin session ended.",
        updatedAt: updated.updatedAt,
      });
      recoverableCount += 1;
      continue;
    }
    upsertAcpSkillRun({
      requestId,
      status: "failed",
      activePrompt: false,
      conversationState: "error",
      conversationRecoveryState: "unavailable",
      connectionActionState: "idle",
      error:
        run.error ||
        "ACP skill run was left active by a previous plugin session and cannot be recovered.",
      event: {
        stage: "startup-recovery-unavailable",
        message:
          "ACP skill run was left active by a previous plugin session and cannot be recovered.",
        level: "error",
      },
    });
    failedCount += 1;
  }
  return {
    removedCount,
    terminalSyncedCount,
    recoverableCount,
    failedCount,
  };
}

function emitChanged() {
  if (changedEmitTimer) {
    clearTimeout(changedEmitTimer);
    changedEmitTimer = null;
  }
  for (const listener of listeners) {
    listener();
  }
}

function scheduleChangedEmit() {
  if (changedEmitTimer) {
    return;
  }
  changedEmitTimer = setTimeout(() => {
    changedEmitTimer = null;
    emitChanged();
  }, 80);
}

export function upsertAcpSkillRun(update: {
  requestId: string;
  status?: AcpSkillRunStatus;
  backendStatus?: AcpSkillRunStatus;
  backendId?: string;
  backendType?: string;
  backendLabel?: string;
  workflowId?: string;
  workflowLabel?: string;
  jobId?: string;
  runId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceFinalStepId?: string;
  taskName?: string;
  skillName?: string;
  skillLabel?: string;
  skillId?: string;
  requestPayload?: unknown;
  providerOptions?: Record<string, unknown>;
  executionMode?: "auto" | "interactive";
  workspaceDir?: string;
  runtimeDir?: string;
  inputManifestPath?: string;
  resultJsonPath?: string;
  acpModeId?: string;
  acpModelId?: string;
  acpReasoningEffort?: string;
  acpRawModelId?: string;
  agentFamily?: string;
  skillRoots?: string[];
  sharedSkillCatalogPath?: string;
  proxySkillCount?: number;
  proxySkillRoots?: string[];
  requestedSkillId?: string;
  requestedSkillProxyPath?: string;
  primarySkillDir?: string;
  runnerJson?: Record<string, unknown>;
  resourceRewriteWarnings?: string[];
  runtimeDependencies?: string[];
  runtimeDependencyStatus?: AcpSkillRunRecord["runtimeDependencyStatus"];
  runtimeDependencyError?: string;
  hostBridgeCli?: AcpSkillRunHostBridgeCliState;
  repairRounds?: number;
  validationStatus?: AcpSkillRunRecord["validationStatus"];
  validationErrors?: string[];
  outputConvergenceState?: AcpSkillRunRecord["outputConvergenceState"];
  lastTurnOutput?: string;
  pendingInteraction?: AcpSkillRunPendingInteraction | null;
  conversationState?: AcpSkillRunConversationState;
  conversationRecoveryState?: AcpSkillRunRecoveryState;
  conversationError?: string;
  lastRecoveryError?: string;
  replyState?: AcpSkillRunReplyState;
  replyError?: string;
  connectionActionState?: AcpSkillRunConnectionActionState;
  lastPromptStopReason?: string;
  appliedAt?: string;
  applyResultState?: AcpSkillRunRecord["applyResultState"];
  sessionId?: string;
  activePrompt?: boolean;
  pendingPermission?: AcpPendingPermissionRequest | null;
  resultJson?: unknown;
  error?: string;
  removedAt?: string;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  event?: Omit<AcpSkillRunEvent, "ts"> & { ts?: string };
}) {
  ensureHydrated();
  const requestId = normalizeString(update.requestId);
  if (!requestId) {
    throw new Error("ACP skill run update requires requestId");
  }
  const incomingBackendType = normalizeString(update.backendType);
  if (incomingBackendType && incomingBackendType !== ACP_BACKEND_TYPE) {
    throw new Error(
      `ACP skill run store rejected non-ACP backend type: ${incomingBackendType}`,
    );
  }
  const now = nowIso();
  const existing = runRecords.get(requestId);
  const next: AcpSkillRunRecord = {
    ...(existing || {
      requestId,
      status: "queued" as AcpSkillRunStatus,
      backendId: "",
      backendType: "acp",
      conversationState: "starting" as AcpSkillRunConversationState,
      conversationRecoveryState: "unavailable" as AcpSkillRunRecoveryState,
      replyState: "idle" as AcpSkillRunReplyState,
      connectionActionState: "idle" as AcpSkillRunConnectionActionState,
      repairRounds: 0,
      createdAt: now,
      updatedAt: now,
      outputRevisions: [],
      transcriptItems: [],
      events: [],
    }),
    updatedAt: now,
  };
  const assignString = <K extends keyof AcpSkillRunRecord>(
    key: K,
    value: unknown,
  ) => {
    const normalized = normalizeString(value);
    if (normalized) {
      (next as Record<string, unknown>)[key as string] = normalized;
    }
  };
  assignString("createdAt", update.createdAt);
  assignString("updatedAt", update.updatedAt);
  if (update.status) next.status = update.status;
  if (update.backendStatus) {
    next.backendStatus = update.backendStatus;
  } else if (
    update.status &&
    isTerminalAcpSkillRunStatus(update.status) &&
    update.applyResultState !== "failed"
  ) {
    next.backendStatus = update.status;
  }
  assignString("backendId", update.backendId);
  assignString("backendType", update.backendType);
  assignString("backendLabel", update.backendLabel);
  assignString("workflowId", update.workflowId);
  assignString("workflowLabel", update.workflowLabel);
  assignString("jobId", update.jobId);
  assignString("runId", update.runId);
  assignString("sequenceStepId", update.sequenceStepId);
  if (Object.prototype.hasOwnProperty.call(update, "sequenceStepIndex")) {
    const sequenceStepIndex = normalizeOptionalNonNegativeInteger(
      update.sequenceStepIndex,
    );
    if (typeof sequenceStepIndex === "number") {
      next.sequenceStepIndex = sequenceStepIndex;
    }
  }
  assignString("sequenceFinalStepId", update.sequenceFinalStepId);
  assignString("taskName", update.taskName);
  assignString("skillName", update.skillName);
  assignString("skillLabel", update.skillLabel);
  assignString("skillId", update.skillId);
  if (Object.prototype.hasOwnProperty.call(update, "requestPayload")) {
    next.requestPayload = update.requestPayload;
  }
  if (isRecord(update.providerOptions)) {
    next.providerOptions = { ...update.providerOptions };
  }
  if (
    update.executionMode === "auto" ||
    update.executionMode === "interactive"
  ) {
    next.executionMode = update.executionMode;
  }
  assignString("workspaceDir", update.workspaceDir);
  assignString("runtimeDir", update.runtimeDir);
  assignString("inputManifestPath", update.inputManifestPath);
  assignString("resultJsonPath", update.resultJsonPath);
  assignString("acpModeId", update.acpModeId);
  assignString("acpModelId", update.acpModelId);
  assignString("acpReasoningEffort", update.acpReasoningEffort);
  assignString("acpRawModelId", update.acpRawModelId);
  assignString("agentFamily", update.agentFamily);
  assignString("sharedSkillCatalogPath", update.sharedSkillCatalogPath);
  assignString("requestedSkillId", update.requestedSkillId);
  assignString("requestedSkillProxyPath", update.requestedSkillProxyPath);
  assignString("primarySkillDir", update.primarySkillDir);
  if (isRecord(update.runnerJson)) {
    next.runnerJson = { ...update.runnerJson };
  }
  assignString("runtimeDependencyError", update.runtimeDependencyError);
  assignString("conversationError", update.conversationError);
  assignString("lastRecoveryError", update.lastRecoveryError);
  assignString("replyError", update.replyError);
  assignString("lastTurnOutput", update.lastTurnOutput);
  assignString("lastPromptStopReason", update.lastPromptStopReason);
  assignString("appliedAt", update.appliedAt);
  assignString("sessionId", update.sessionId);
  assignString("error", update.error);
  if (
    Object.prototype.hasOwnProperty.call(update, "conversationError") &&
    !normalizeString(update.conversationError)
  ) {
    next.conversationError = undefined;
  }
  if (
    Object.prototype.hasOwnProperty.call(update, "lastRecoveryError") &&
    !normalizeString(update.lastRecoveryError)
  ) {
    next.lastRecoveryError = undefined;
  }
  if (
    Object.prototype.hasOwnProperty.call(update, "replyError") &&
    !normalizeString(update.replyError)
  ) {
    next.replyError = undefined;
  }
  if (
    Object.prototype.hasOwnProperty.call(update, "error") &&
    !normalizeString(update.error)
  ) {
    next.error = undefined;
  }
  if (Array.isArray(update.skillRoots))
    next.skillRoots = [...update.skillRoots];
  if (
    typeof update.proxySkillCount === "number" &&
    Number.isFinite(update.proxySkillCount)
  ) {
    next.proxySkillCount = Math.max(0, Math.floor(update.proxySkillCount));
  }
  if (Array.isArray(update.proxySkillRoots)) {
    next.proxySkillRoots = [...update.proxySkillRoots];
  }
  if (Array.isArray(update.resourceRewriteWarnings)) {
    next.resourceRewriteWarnings = [...update.resourceRewriteWarnings];
  }
  if (Array.isArray(update.runtimeDependencies)) {
    next.runtimeDependencies = [...update.runtimeDependencies];
  }
  if (update.runtimeDependencyStatus) {
    next.runtimeDependencyStatus = update.runtimeDependencyStatus;
  }
  if (update.hostBridgeCli) {
    next.hostBridgeCli = { ...update.hostBridgeCli };
  }
  if (
    typeof update.repairRounds === "number" &&
    Number.isFinite(update.repairRounds)
  ) {
    next.repairRounds = Math.max(0, Math.floor(update.repairRounds));
  }
  if (update.validationStatus) next.validationStatus = update.validationStatus;
  if (Array.isArray(update.validationErrors)) {
    next.validationErrors = [...update.validationErrors];
  }
  if (update.outputConvergenceState) {
    next.outputConvergenceState = update.outputConvergenceState;
  }
  if (Object.prototype.hasOwnProperty.call(update, "pendingInteraction")) {
    next.pendingInteraction = update.pendingInteraction || undefined;
  }
  if (update.conversationState)
    next.conversationState = update.conversationState;
  if (update.conversationRecoveryState) {
    next.conversationRecoveryState = update.conversationRecoveryState;
  }
  if (update.replyState) next.replyState = update.replyState;
  if (update.connectionActionState) {
    next.connectionActionState = update.connectionActionState;
  }
  if (update.applyResultState) next.applyResultState = update.applyResultState;
  if (typeof update.activePrompt === "boolean")
    next.activePrompt = update.activePrompt;
  if (Object.prototype.hasOwnProperty.call(update, "pendingPermission")) {
    next.pendingPermission = update.pendingPermission || null;
  }
  if (typeof update.resultJson !== "undefined")
    next.resultJson = update.resultJson;
  if (typeof update.removedAt === "string") {
    next.removedAt = normalizeString(update.removedAt) || undefined;
  }
  if (typeof update.archivedAt === "string") {
    next.archivedAt = normalizeString(update.archivedAt) || undefined;
  }
  if (update.event) {
    const event = {
      ts: update.event.ts || now,
      stage: update.event.stage,
      message: update.event.message,
      level: update.event.level || "info",
      details: update.event.details,
    };
    next.events = [...next.events, event].slice(-80);
    appendStatusTranscriptItem(next, event);
  }
  setAcpSkillRunRecord(next);
  selectedRequestId = selectedRequestId || requestId;
  persistRun(next);
  syncWorkflowTaskForAcpSkillRun(next);
  emitChanged();
  return {
    ...next,
    transcriptItems: next.transcriptItems.map((entry) => ({ ...entry })),
    outputRevisions: next.outputRevisions.map((entry) => ({ ...entry })),
    events: next.events.map((entry) => ({ ...entry })),
  };
}

export function appendAcpSkillRunUserReply(args: {
  requestId: string;
  message: string;
}) {
  ensureHydrated();
  const requestId = normalizeString(args.requestId);
  const message = String(args.message || "").trim();
  if (!requestId || !message) {
    return;
  }
  const existing = runRecords.get(requestId);
  if (!existing) {
    return;
  }
  const now = nowIso();
  const item: AcpSkillRunTranscriptItem = {
    id: `acp-skill-message-${existing.transcriptItems.length + 1}`,
    kind: "message",
    role: "user",
    text: message,
    state: "complete",
    createdAt: now,
  };
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: now,
    transcriptItems: [...existing.transcriptItems, item].slice(-200),
  };
  setAcpSkillRunRecord(next);
  persistRun(next);
  scheduleChangedEmit();
}

function formatFinalEnvelopeMarkdown(payload: Record<string, unknown>) {
  const displayPayload = { ...payload };
  delete displayPayload.__SKILL_DONE__;
  const lines = formatJsonMarkdownList(displayPayload);
  return lines.length > 0 ? lines.join("\n") : "- result: complete";
}

function isMarkdownListComposite(value: unknown) {
  return (
    value !== null &&
    typeof value === "object" &&
    (Array.isArray(value) ||
      Object.keys(value as Record<string, unknown>).length > 0)
  );
}

function formatMarkdownListKey(value: string) {
  return (
    String(value || "")
      .replace(/\s+/g, " ")
      .trim() || "value"
  );
}

function formatMarkdownListScalar(value: unknown) {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    const text = value.replace(/\s+/g, " ").trim();
    return text || '""';
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value) : "[]";
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0
      ? JSON.stringify(value)
      : "{}";
  }
  return String(value ?? "");
}

function formatJsonMarkdownList(value: unknown, depth = 0): string[] {
  const indent = "  ".repeat(Math.max(0, depth));
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${indent}- []`];
    }
    return value.flatMap((entry, index) => {
      if (isMarkdownListComposite(entry)) {
        return [
          `${indent}- item ${index + 1}:`,
          ...formatJsonMarkdownList(entry, depth + 1),
        ];
      }
      return [`${indent}- ${formatMarkdownListScalar(entry)}`];
    });
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, entry]) => {
        const label = formatMarkdownListKey(key);
        if (isMarkdownListComposite(entry)) {
          return [
            `${indent}- ${label}:`,
            ...formatJsonMarkdownList(entry, depth + 1),
          ];
        }
        return [`${indent}- ${label}: ${formatMarkdownListScalar(entry)}`];
      },
    );
  }
  return [`${indent}- ${formatMarkdownListScalar(value)}`];
}

function replaceLatestAssistantMessage(args: {
  record: AcpSkillRunRecord;
  text: string;
  now: string;
  revision?: AcpSkillRunMessageRevisionSummary;
}) {
  const text = String(args.text || "").trim();
  if (!text) {
    return;
  }
  const existingIndex = args.record.transcriptItems
    .map((entry, index) => ({ entry, index }))
    .reverse()
    .find(
      ({ entry }) => entry.kind === "message" && entry.role === "assistant",
    )?.index;
  if (typeof existingIndex === "number") {
    args.record.transcriptItems = args.record.transcriptItems.map(
      (entry, index) =>
        index === existingIndex && entry.kind === "message"
          ? {
              ...entry,
              text,
              state: "complete",
              revision: args.revision || entry.revision,
              updatedAt: args.now,
            }
          : entry,
    );
    return;
  }
  const item: AcpSkillRunTranscriptItem = {
    id: `acp-skill-message-${args.record.transcriptItems.length + 1}`,
    kind: "message",
    role: "assistant",
    text,
    state: "complete",
    revision: args.revision,
    createdAt: args.now,
  };
  args.record.transcriptItems = [...args.record.transcriptItems, item].slice(
    -200,
  );
}

function removeLatestAssistantCandidateMessage(
  record: AcpSkillRunRecord,
  candidateText: string,
) {
  const normalizedCandidate = String(candidateText || "").trim();
  if (!normalizedCandidate) {
    return;
  }
  const latestAssistantIndex = record.transcriptItems
    .map((entry, index) => ({ entry, index }))
    .reverse()
    .find(
      ({ entry }) => entry.kind === "message" && entry.role === "assistant",
    )?.index;
  if (typeof latestAssistantIndex !== "number") {
    return;
  }
  const latest = record.transcriptItems[latestAssistantIndex];
  if (latest.kind !== "message") {
    return;
  }
  const latestText = String(latest.text || "").trim();
  if (
    latestText === normalizedCandidate ||
    latestText.includes("__SKILL_DONE__")
  ) {
    record.transcriptItems = record.transcriptItems.filter(
      (_, index) => index !== latestAssistantIndex,
    );
  }
}

function appendOutputRevision(args: {
  record: AcpSkillRunRecord;
  candidateText: string;
  repairRound?: number;
  status: AcpSkillRunOutputRevisionStatus;
  errors?: string[];
  replacementReason?: string;
  now: string;
}) {
  const existing = Array.isArray(args.record.outputRevisions)
    ? args.record.outputRevisions
    : [];
  const nextRevisions = existing.map((entry) => ({ ...entry }));
  if (args.status !== "invalid") {
    for (const entry of nextRevisions) {
      if (entry.status === "invalid" && !entry.replacementReason) {
        entry.replacementReason = `Replaced by ${args.status} output.`;
      }
    }
  }
  nextRevisions.push({
    id: `revision-${nextRevisions.length + 1}`,
    candidateText: normalizeString(args.candidateText),
    repairRound: Math.max(0, Math.floor(Number(args.repairRound || 0) || 0)),
    status: args.status,
    errors: Array.isArray(args.errors) ? [...args.errors] : [],
    replacementReason: normalizeString(args.replacementReason) || undefined,
    createdAt: args.now,
  });
  args.record.outputRevisions = nextRevisions.slice(-50);
  return buildOutputRevisionSummary(args.record.outputRevisions);
}

export function recordAcpSkillRunOutputRevision(args: {
  requestId: string;
  candidateText: string;
  repairRound?: number;
  status: "invalid";
  errors?: string[];
  replacementReason?: string;
}) {
  ensureHydrated();
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  const existing = runRecords.get(requestId);
  if (!existing) {
    return;
  }
  const now = nowIso();
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: now,
    outputRevisions: existing.outputRevisions.map((entry) => ({ ...entry })),
    transcriptItems: [...existing.transcriptItems],
  };
  appendOutputRevision({
    record: next,
    candidateText: args.candidateText,
    repairRound: args.repairRound,
    status: args.status,
    errors: args.errors,
    replacementReason: args.replacementReason,
    now,
  });
  removeLatestAssistantCandidateMessage(next, args.candidateText);
  setAcpSkillRunRecord(next);
  persistRun(next);
  emitChanged();
}

export function projectAcpSkillRunOutputEnvelopeToTranscript(
  args:
    | {
        requestId: string;
        kind: "pending";
        message: string;
        candidateText?: string;
        repairRound?: number;
        errors?: string[];
      }
    | {
        requestId: string;
        kind: "final";
        resultJson: Record<string, unknown>;
        candidateText?: string;
        repairRound?: number;
        errors?: string[];
      },
) {
  ensureHydrated();
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  const existing = runRecords.get(requestId);
  if (!existing) {
    return;
  }
  const now = nowIso();
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: now,
    outputRevisions: existing.outputRevisions.map((entry) => ({ ...entry })),
    transcriptItems: [...existing.transcriptItems],
  };
  const canonicalText =
    args.kind === "pending"
      ? args.message
      : formatFinalEnvelopeMarkdown(args.resultJson);
  const revision = appendOutputRevision({
    record: next,
    candidateText:
      normalizeString(args.candidateText) ||
      (args.kind === "pending"
        ? args.message
        : JSON.stringify(args.resultJson)),
    repairRound: args.repairRound,
    status: args.kind,
    errors: args.errors,
    now,
  });
  replaceLatestAssistantMessage({
    record: next,
    text: canonicalText,
    now,
    revision,
  });
  setAcpSkillRunRecord(next);
  persistRun(next);
  emitChanged();
}

function getLatestTranscriptItem(record: AcpSkillRunRecord) {
  return record.transcriptItems[record.transcriptItems.length - 1];
}

function isSkippableInterleavedStatus(
  entry: AcpSkillRunTranscriptItem | undefined,
) {
  return entry?.kind === "status" && entry.label === "workspace-activity";
}

function isMatchingStreamingTextItem(args: {
  entry: AcpSkillRunTranscriptItem | undefined;
  kind: "message" | "thought";
  role: "assistant" | "user";
}) {
  const { entry } = args;
  if (args.kind === "message") {
    return (
      entry?.kind === "message" &&
      entry.role === args.role &&
      entry.state === "streaming"
    );
  }
  return entry?.kind === "thought" && entry.state === "streaming";
}

function findAppendableStreamingTextItem(args: {
  record: AcpSkillRunRecord;
  kind: "message" | "thought";
  role: "assistant" | "user";
}) {
  for (
    let index = args.record.transcriptItems.length - 1;
    index >= 0;
    index -= 1
  ) {
    const entry = args.record.transcriptItems[index];
    if (isSkippableInterleavedStatus(entry)) {
      continue;
    }
    return isMatchingStreamingTextItem({
      entry,
      kind: args.kind,
      role: args.role,
    })
      ? entry
      : undefined;
  }
  return undefined;
}

function completeOpenStreamingTextItems(
  record: AcpSkillRunRecord,
  now: string,
) {
  record.transcriptItems = record.transcriptItems.map((entry) => {
    if (
      (entry.kind === "message" || entry.kind === "thought") &&
      entry.state === "streaming"
    ) {
      return {
        ...entry,
        state: "complete",
        updatedAt: entry.updatedAt || now,
      };
    }
    return entry;
  });
}

function appendTextChunk(args: {
  record: AcpSkillRunRecord;
  kind: "message" | "thought";
  role?: "assistant" | "user";
  text: string;
  now: string;
}) {
  const text = args.text;
  if (!text) {
    return;
  }
  const role = args.role || "assistant";
  const latest =
    findAppendableStreamingTextItem({
      record: args.record,
      kind: args.kind,
      role,
    }) || getLatestTranscriptItem(args.record);
  if (
    args.kind === "message" &&
    latest?.kind === "message" &&
    latest.role === role &&
    latest.state === "streaming"
  ) {
    latest.text += text;
    latest.state = "streaming";
    latest.updatedAt = args.now;
    return;
  }
  if (
    args.kind === "thought" &&
    latest?.kind === "thought" &&
    latest.state === "streaming"
  ) {
    latest.text += text;
    latest.state = "streaming";
    latest.updatedAt = args.now;
    return;
  }
  const id = `acp-skill-${args.kind}-${args.record.transcriptItems.length + 1}`;
  const item: AcpSkillRunTranscriptItem =
    args.kind === "message"
      ? {
          id,
          kind: "message",
          role,
          text,
          state: "streaming",
          createdAt: args.now,
        }
      : {
          id,
          kind: "thought",
          text,
          state: "streaming",
          createdAt: args.now,
        };
  args.record.transcriptItems = [...args.record.transcriptItems, item].slice(
    -200,
  );
}

function extractToolName(
  update: AcpToolCall,
  current?: AcpSkillRunTranscriptItem,
) {
  return (
    firstToolText([
      update.name,
      update.tool,
      update.functionName,
      update.function_name,
      (isRecord(update.metadata) &&
        (update.metadata.name || update.metadata.title)) ||
        "",
      update.title,
      update.kind,
      current?.kind === "tool_call" ? current.toolName : "",
    ]) || "Tool"
  );
}

function extractToolInputSummary(update: AcpToolCall) {
  return firstToolText([
    update.rawInput,
    update.input,
    update.arguments,
    update.args,
    update.parameters,
    update.params,
    isRecord(update.metadata) ? update.metadata.description : "",
    update.description,
    update.summary,
  ]);
}

function extractToolResultSummary(update: AcpToolCall) {
  return firstToolText([
    update.rawOutput,
    update.output,
    update.result,
    update.content,
    update.message,
    update.detail,
    update.summary,
  ]);
}

function hasToolResultPayload(update: AcpToolCall) {
  return Boolean(
    firstToolText([
      update.rawOutput,
      update.output,
      update.result,
      update.content,
      update.message,
      update.detail,
    ]),
  );
}

function inferToolCallState(update: AcpToolCall) {
  const explicitStatus = normalizeString(update.status);
  const explicitState = normalizeToolCallState(explicitStatus);
  if (
    !explicitStatus &&
    explicitState === "pending" &&
    hasToolResultPayload(update)
  ) {
    return "completed";
  }
  return explicitState;
}

function upsertTranscriptToolCall(
  record: AcpSkillRunRecord,
  update: AcpToolCall,
  now: string,
) {
  const toolCallId =
    normalizeString(update.toolCallId) ||
    normalizeString(update.title) ||
    `tool-${record.transcriptItems.length + 1}`;
  const existingIndex = record.transcriptItems.findIndex(
    (entry) => entry.kind === "tool_call" && entry.toolCallId === toolCallId,
  );
  const existing =
    existingIndex >= 0 ? record.transcriptItems[existingIndex] : undefined;
  const current = existing?.kind === "tool_call" ? existing : undefined;
  const nextState = inferToolCallState(update);
  const state =
    current && toolStateRank(current.state) > toolStateRank(nextState)
      ? current.state
      : nextState;
  const inputSummary = current?.inputSummary || extractToolInputSummary(update);
  const next: AcpSkillRunTranscriptItem = {
    id: current?.id || `acp-skill-tool-${record.transcriptItems.length + 1}`,
    kind: "tool_call",
    toolCallId,
    title: firstToolText([update.title, current?.title]) || undefined,
    state,
    toolKind: firstToolText([update.kind, current?.toolKind]) || undefined,
    toolName: extractToolName(update, current),
    inputSummary: inputSummary || undefined,
    resultSummary: extractToolResultSummary(update) || current?.resultSummary,
    summary: firstToolText([update.summary, current?.summary]) || undefined,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
  if (existingIndex >= 0) {
    record.transcriptItems = record.transcriptItems.map((entry, index) =>
      index === existingIndex ? next : entry,
    );
    return;
  }
  record.transcriptItems = [...record.transcriptItems, next].slice(-200);
}

export function recordAcpSkillRunSessionUpdate(
  runRequestIdRaw: string,
  event: SessionNotification,
) {
  ensureHydrated();
  const requestId = normalizeString(runRequestIdRaw);
  if (!requestId) {
    return;
  }
  const now = nowIso();
  const existing = runRecords.get(requestId);
  if (!existing) {
    return;
  }
  const update = event.update || { sessionUpdate: "" };
  const kind = normalizeString(update.sessionUpdate);
  const isTextChunkUpdate =
    kind === "agent_message_chunk" ||
    kind === "user_message_chunk" ||
    kind === "agent_thought_chunk";
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: isTextChunkUpdate ? existing.updatedAt : now,
    transcriptItems: [...existing.transcriptItems],
    planEntries: existing.planEntries ? [...existing.planEntries] : undefined,
    usage: existing.usage ? { ...existing.usage } : undefined,
  };
  if (kind === "agent_message_chunk" || kind === "user_message_chunk") {
    const content = (
      update as { content?: { type?: string | null; text?: string | null } }
    ).content;
    if (normalizeString(content?.type) === "text") {
      appendTextChunk({
        record: next,
        kind: "message",
        role: kind === "user_message_chunk" ? "user" : "assistant",
        text: String(content?.text || ""),
        now,
      });
    }
  } else if (kind === "agent_thought_chunk") {
    const content = (
      update as { content?: { type?: string | null; text?: string | null } }
    ).content;
    if (normalizeString(content?.type) === "text") {
      appendTextChunk({
        record: next,
        kind: "thought",
        text: String(content?.text || ""),
        now,
      });
    }
  } else if (kind === "tool_call" || kind === "tool_call_update") {
    completeOpenStreamingTextItems(next, now);
    upsertTranscriptToolCall(next, update as AcpToolCall, now);
  } else if (kind === "plan") {
    next.planEntries = parsePlanEntries(
      (update as { entries?: unknown }).entries,
    );
  } else if (kind === "usage_update") {
    const used = Number((update as { used?: unknown }).used || 0);
    const size = Number((update as { size?: unknown }).size || 0);
    if (Number.isFinite(used) && Number.isFinite(size)) {
      next.usage = {
        used: Math.max(0, Math.floor(used)),
        size: Math.max(0, Math.floor(size)),
      };
    }
  }
  setAcpSkillRunRecord(next);
  persistRun(next);
  scheduleChangedEmit();
}

export function registerAcpSkillRunController(
  requestIdRaw: string,
  controller: AcpSkillRunController | null,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return;
  }
  if (!controller) {
    controllers.delete(requestId);
    for (const [permissionRequestId, entry] of permissionResolvers.entries()) {
      if (entry.runRequestId === requestId) {
        permissionResolvers.delete(permissionRequestId);
      }
    }
    return;
  }
  controllers.set(requestId, controller);
  upsertAcpSkillRun({
    requestId,
    conversationRecoveryState: "connected",
    connectionActionState: "idle",
    lastRecoveryError: "",
  });
  clearStaleAcpSkillRunPermissionRequest({
    runRequestId: requestId,
    reason: "controller_registered_without_resolver",
  });
}

export function setAcpSkillRunRecoveryHandlerForTests(
  handler: AcpSkillRunRecoveryHandler | null,
) {
  recoveryHandler = handler;
}

export function setAcpSkillRunRecoveryHandler(
  handler: AcpSkillRunRecoveryHandler | null,
) {
  recoveryHandler = handler;
}

export function hasAcpSkillRunController(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  return !!requestId && controllers.has(requestId);
}

export function setAcpSkillRunRuntimeOptions(
  requestIdRaw: string,
  options: Partial<AcpSkillRunRuntimeOptionsSnapshot> | null | undefined,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return;
  }
  if (!options) {
    runtimeOptionsByRequestId.delete(requestId);
    scheduleChangedEmit();
    return;
  }
  const normalized: AcpSkillRunRuntimeOptionsSnapshot = {
    modeOptions: normalizeSelectableOptions(options.modeOptions),
    currentMode: normalizeSelectableOption(options.currentMode) || undefined,
    modelOptions: normalizeSelectableOptions(options.modelOptions),
    currentModel: normalizeSelectableOption(options.currentModel) || undefined,
    displayModelOptions: normalizeSelectableOptions(
      options.displayModelOptions,
    ),
    currentDisplayModel:
      normalizeSelectableOption(options.currentDisplayModel) || undefined,
    reasoningEffortOptions: normalizeSelectableOptions(
      options.reasoningEffortOptions,
    ),
    currentReasoningEffort:
      normalizeSelectableOption(options.currentReasoningEffort) || undefined,
  };
  runtimeOptionsByRequestId.set(requestId, normalized);
  scheduleChangedEmit();
}

export function setAcpSkillRunPermissionRequest(
  runRequestIdRaw: string,
  request: AcpPendingPermissionRequest & {
    resolve: (outcome: RequestPermissionOutcome) => void;
  },
) {
  const runRequestId = normalizeString(runRequestIdRaw);
  const permissionRequestId = normalizeString(request.requestId);
  if (!runRequestId || !permissionRequestId) {
    return;
  }
  permissionResolvers.set(permissionRequestId, {
    runRequestId,
    resolve: request.resolve,
  });
  upsertAcpSkillRun({
    requestId: runRequestId,
    status: "running",
    pendingPermission: {
      requestId: permissionRequestId,
      sessionId: normalizeString(request.sessionId),
      toolCallId: normalizeString(request.toolCallId),
      toolTitle: normalizeString(request.toolTitle),
      source: normalizeString(request.source) || undefined,
      summary: normalizeString(request.summary) || undefined,
      detail: normalizeString(request.detail) || undefined,
      requestedAt: normalizeString(request.requestedAt) || nowIso(),
      options: Array.isArray(request.options)
        ? request.options.map((option) => ({ ...option }))
        : [],
    },
    event: {
      stage: "permission-requested",
      message: `Permission requested: ${normalizeString(request.toolTitle) || permissionRequestId}`,
      level: "warn",
      details: {
        permissionRequestId,
        toolCallId: normalizeString(request.toolCallId),
        toolTitle: normalizeString(request.toolTitle),
        source: normalizeString(request.source) || undefined,
        summary:
          normalizeString(request.summary) ||
          normalizeString(request.toolTitle),
      },
    },
  });
}

function findStaleAcpSkillRunPermissionRequest(args: {
  runRequestId?: string;
  permissionRequestId?: string;
}) {
  ensureHydrated();
  const runRequestId = normalizeString(args.runRequestId);
  const permissionRequestId = normalizeString(args.permissionRequestId);
  if (!runRequestId && !permissionRequestId) {
    return null;
  }
  const candidates = runRequestId
    ? [runRecords.get(runRequestId)].filter(
        (entry): entry is AcpSkillRunRecord => !!entry,
      )
    : Array.from(runRecords.values());
  for (const record of candidates) {
    const pending = record.pendingPermission;
    if (!pending) {
      continue;
    }
    const pendingRequestId = normalizeString(pending.requestId);
    if (!pendingRequestId) {
      continue;
    }
    if (permissionRequestId && pendingRequestId !== permissionRequestId) {
      continue;
    }
    if (permissionResolvers.has(pendingRequestId)) {
      continue;
    }
    return {
      record,
      pending,
      permissionRequestId: pendingRequestId,
    };
  }
  return null;
}

function clearStaleAcpSkillRunPermissionRequest(args: {
  runRequestId?: string;
  permissionRequestId?: string;
  reason: string;
}) {
  const stale = findStaleAcpSkillRunPermissionRequest(args);
  if (!stale) {
    return false;
  }
  const recoverableStatus = new Set<AcpSkillRunStatus>([
    "queued",
    "running",
    "repairing",
  ]).has(stale.record.status)
    ? "waiting_user"
    : stale.record.status;
  upsertAcpSkillRun({
    requestId: stale.record.requestId,
    status: recoverableStatus,
    activePrompt: false,
    pendingPermission: null,
    replyState: "idle",
    event: {
      stage: "permission-resolved",
      message:
        "Permission request expired after reconnect; no live approval handler is available.",
      level: "warn",
      details: {
        permissionRequestId: stale.permissionRequestId,
        outcome: "cancelled",
        reason: args.reason,
        toolCallId: normalizeString(stale.pending.toolCallId),
        toolTitle: normalizeString(stale.pending.toolTitle),
        source: normalizeString(stale.pending.source) || undefined,
        summary:
          normalizeString(stale.pending.summary) ||
          normalizeString(stale.pending.toolTitle),
      },
    },
  });
  return true;
}

export function resolveAcpSkillRunPermissionRequest(args: {
  runRequestId?: string;
  permissionRequestId?: string;
  outcome?: "selected" | "cancelled";
  optionId?: string;
}) {
  const runRequestId = normalizeString(args.runRequestId);
  const permissionRequestId = normalizeString(args.permissionRequestId);
  const matched = permissionRequestId
    ? permissionResolvers.get(permissionRequestId)
    : Array.from(permissionResolvers.values()).find(
        (entry) => entry.runRequestId === runRequestId,
      );
  if (!matched) {
    if (
      clearStaleAcpSkillRunPermissionRequest({
        runRequestId,
        permissionRequestId,
        reason: "resolve_without_live_handler",
      })
    ) {
      return;
    }
    throw new Error("No active ACP skill run permission request is available.");
  }
  const outcome =
    args.outcome === "selected" && normalizeString(args.optionId)
      ? ({
          outcome: "selected",
          optionId: normalizeString(args.optionId),
        } as RequestPermissionOutcome)
      : ({ outcome: "cancelled" } as RequestPermissionOutcome);
  matched.resolve(outcome);
  let resolvedPermissionRequestId = permissionRequestId;
  for (const [requestId, entry] of permissionResolvers.entries()) {
    if (entry === matched) {
      resolvedPermissionRequestId = requestId;
      permissionResolvers.delete(requestId);
    }
  }
  upsertAcpSkillRun({
    requestId: matched.runRequestId,
    pendingPermission: null,
    event: {
      stage: "permission-resolved",
      message:
        outcome.outcome === "selected"
          ? `Permission option selected: ${outcome.optionId}`
          : "Permission request cancelled.",
      level: outcome.outcome === "selected" ? "info" : "warn",
      details: {
        permissionRequestId: resolvedPermissionRequestId,
        outcome: outcome.outcome,
        optionId: outcome.outcome === "selected" ? outcome.optionId : undefined,
      },
    },
  });
}

export async function cancelAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const controller = controllers.get(requestId);
  if (!controller) {
    const existing = getAcpSkillRunRecord(requestId);
    if (!existing) {
      throw new Error("No ACP skill run record is available for cancellation.");
    }
    upsertAcpSkillRun({
      requestId,
      status: "canceled",
      activePrompt: false,
      conversationState: "ended",
      conversationRecoveryState: "unavailable",
      connectionActionState: "idle",
      removedAt: nowIso(),
      event: {
        stage: "canceled",
        message:
          "ACP skill run canceled from the panel; no live controller was available.",
        level: "warn",
      },
    });
    return;
  }
  await controller.cancel();
  upsertAcpSkillRun({
    requestId,
    status: "canceled",
    activePrompt: false,
    conversationState: "ended",
    conversationRecoveryState: "unavailable",
    connectionActionState: "idle",
    removedAt: nowIso(),
    event: {
      stage: "canceled",
      message: "ACP skill run cancellation requested.",
      level: "warn",
    },
  });
}

export async function interruptAcpSkillRunCurrentTurn(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const controller = controllers.get(requestId);
  if (!controller) {
    throw new Error(
      "No active ACP skill run controller is available for interruption.",
    );
  }
  if (controller.interruptTurn) {
    await controller.interruptTurn();
  } else {
    await controller.cancel();
  }
  upsertAcpSkillRun({
    requestId,
    status: "waiting_user",
    activePrompt: false,
    replyState: "idle",
    event: {
      stage: "interrupt-requested",
      message: "ACP skill run current turn interruption requested.",
      level: "warn",
    },
  });
}

export function archiveAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for archive.");
  }
  if (
    existing.status !== "succeeded" &&
    existing.status !== "failed" &&
    existing.status !== "canceled"
  ) {
    throw new Error("Only terminal ACP skill runs can be archived.");
  }
  const archivedAt = nowIso();
  upsertAcpSkillRun({
    requestId,
    archivedAt,
    removedAt: archivedAt,
    event: {
      stage: "archived",
      message: "ACP skill run archived from the panel.",
      level: "info",
    },
  });
}

export async function replyAcpSkillRun(args: {
  requestId: string;
  message: string;
}) {
  const requestId = normalizeString(args.requestId);
  const message = String(args.message || "").trim();
  if (!requestId) {
    throw new Error("requestId is required");
  }
  if (!message) {
    throw new Error("reply message is required");
  }
  upsertAcpSkillRun({
    requestId,
    replyState: "submitted",
    replyError: "",
    conversationError: "",
    lastRecoveryError: "",
    error: "",
    event: {
      stage: "reply-submitted",
      message: "User reply submitted.",
      level: "info",
    },
  });
  let controller = controllers.get(requestId);
  if (!controller?.reply && recoveryHandler) {
    try {
      await recoveryHandler({ requestId, reason: "reply" });
      controller = controllers.get(requestId);
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : String(error || "unknown error");
      upsertAcpSkillRun({
        requestId,
        replyState: "rejected",
        replyError: detail,
        conversationRecoveryState: "failed",
        lastRecoveryError: detail,
        event: {
          stage: "reply-rejected",
          message: `Reply failed during session recovery: ${detail}`,
          level: "error",
        },
      });
      throw error;
    }
  }
  if (!controller?.reply) {
    upsertAcpSkillRun({
      requestId,
      conversationState: "closed",
      conversationRecoveryState: "available",
      conversationError: "No active ACP conversation controller is available.",
      replyState: "rejected",
      replyError: "No active ACP conversation controller is available.",
      event: {
        stage: "reply-unavailable",
        message:
          "Reply failed because no active ACP conversation controller was available.",
        level: "error",
      },
    });
    throw new Error("No active ACP conversation controller is available.");
  }
  upsertAcpSkillRun({
    requestId,
    replyState: "accepted",
    conversationState: "active",
    conversationRecoveryState: "connected",
    replyError: "",
    conversationError: "",
    lastRecoveryError: "",
    error: "",
    event: {
      stage: "reply-accepted",
      message: "User reply accepted by ACP skill run controller.",
      level: "info",
    },
  });
  try {
    await controller.reply(message);
    upsertAcpSkillRun({
      requestId,
      replyState: "idle",
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : String(error || "unknown error");
    upsertAcpSkillRun({
      requestId,
      replyState: "rejected",
      replyError: detail,
      event: {
        stage: "reply-rejected",
        message: detail,
        level: "error",
      },
    });
    throw error;
  }
}

function isAcpSkillRunPromptActive(run: AcpSkillRunRecord) {
  return (
    run.activePrompt === true ||
    run.replyState === "submitted" ||
    run.replyState === "accepted"
  );
}

function requireRuntimeController(
  requestId: string,
  operation: "setMode" | "setModel",
) {
  const controller = controllers.get(requestId);
  if (!controller || typeof controller[operation] !== "function") {
    throw new Error(
      "No active ACP skill run controller is available for runtime option changes.",
    );
  }
  return controller as AcpSkillRunController &
    Required<Pick<AcpSkillRunController, typeof operation>>;
}

function runtimeOptionsForRun(run: AcpSkillRunRecord) {
  const stored = runtimeOptionsByRequestId.get(run.requestId);
  const base: AcpSkillRunRuntimeOptionsSnapshot = stored
    ? cloneRuntimeOptions(stored)
    : {
        modeOptions: [],
        modelOptions: [],
        displayModelOptions: [],
        reasoningEffortOptions: [],
      };
  base.currentMode =
    findSelectableOption(base.modeOptions, run.acpModeId) ||
    cloneSelectableOption(base.currentMode);
  base.currentModel =
    findSelectableOption(base.modelOptions, run.acpRawModelId) ||
    cloneSelectableOption(base.currentModel);
  base.currentDisplayModel =
    findSelectableOption(
      base.displayModelOptions,
      run.acpModelId || run.acpRawModelId,
    ) || cloneSelectableOption(base.currentDisplayModel);
  base.currentReasoningEffort =
    findSelectableOption(base.reasoningEffortOptions, run.acpReasoningEffort) ||
    cloneSelectableOption(base.currentReasoningEffort);
  return base;
}

function resolveEffortIdFromRawModel(
  rawModelId: string,
  modelOptions: AcpSelectableOption[],
  fallback: string,
) {
  const option = modelOptions.find((entry) => entry.id === rawModelId);
  const parsed =
    parseAcpEffortFromModelText(option?.id || rawModelId) ||
    parseAcpEffortFromModelText(option?.label || "");
  return normalizeString(parsed?.effortId) || fallback;
}

export async function setAcpSkillRunMode(args: {
  requestId: string;
  modeId: string;
}) {
  const requestId = normalizeString(args.requestId);
  const modeId = normalizeString(args.modeId);
  if (!requestId || !modeId) {
    return;
  }
  const run = getAcpSkillRunRecord(requestId);
  const sessionId = normalizeString(run?.sessionId);
  if (!run || !sessionId) {
    throw new Error(
      "No active ACP skill run session is available for mode changes.",
    );
  }
  const controller = requireRuntimeController(requestId, "setMode");
  await controller.setMode({ sessionId, modeId });
  upsertAcpSkillRun({
    requestId,
    acpModeId: modeId,
    event: {
      stage: "runtime-mode-updated",
      message: "ACP skill run mode updated.",
      level: "info",
      details: { modeId },
    },
  });
}

export async function setAcpSkillRunModel(args: {
  requestId: string;
  modelId: string;
}) {
  const requestId = normalizeString(args.requestId);
  const modelId = normalizeString(args.modelId);
  if (!requestId || !modelId) {
    return;
  }
  const run = getAcpSkillRunRecord(requestId);
  const sessionId = normalizeString(run?.sessionId);
  if (!run || !sessionId) {
    throw new Error(
      "No active ACP skill run session is available for model changes.",
    );
  }
  if (isAcpSkillRunPromptActive(run)) {
    throw new Error(
      "Cannot change ACP skill run model while a prompt is running.",
    );
  }
  const runtimeOptions = runtimeOptionsForRun(run);
  const rawModelId = resolveAcpRawModelIdForSelection({
    modelOptions: runtimeOptions.modelOptions,
    displayModelId: modelId,
    effortId:
      normalizeString(run.acpReasoningEffort) ||
      normalizeString(runtimeOptions.currentReasoningEffort?.id),
    currentRawModelId: run.acpRawModelId,
  });
  const controller = requireRuntimeController(requestId, "setModel");
  await controller.setModel({ sessionId, modelId: rawModelId });
  const effortId = resolveEffortIdFromRawModel(
    rawModelId,
    runtimeOptions.modelOptions,
    normalizeString(run.acpReasoningEffort),
  );
  upsertAcpSkillRun({
    requestId,
    acpModelId: modelId,
    acpRawModelId: rawModelId,
    acpReasoningEffort: effortId,
    event: {
      stage: "runtime-model-updated",
      message: "ACP skill run model updated.",
      level: "info",
      details: { modelId, rawModelId, reasoningEffort: effortId },
    },
  });
}

export async function setAcpSkillRunReasoningEffort(args: {
  requestId: string;
  effortId: string;
}) {
  const requestId = normalizeString(args.requestId);
  const effortId = normalizeString(args.effortId);
  if (!requestId || !effortId) {
    return;
  }
  const run = getAcpSkillRunRecord(requestId);
  const sessionId = normalizeString(run?.sessionId);
  if (!run || !sessionId) {
    throw new Error(
      "No active ACP skill run session is available for reasoning changes.",
    );
  }
  if (isAcpSkillRunPromptActive(run)) {
    throw new Error(
      "Cannot change ACP skill run reasoning effort while a prompt is running.",
    );
  }
  const runtimeOptions = runtimeOptionsForRun(run);
  const displayModelId =
    normalizeString(run.acpModelId) ||
    normalizeString(runtimeOptions.currentDisplayModel?.id) ||
    normalizeString(run.acpRawModelId);
  if (!displayModelId) {
    throw new Error(
      "No ACP skill run model is available for reasoning changes.",
    );
  }
  const rawModelId = resolveAcpRawModelIdForSelection({
    modelOptions: runtimeOptions.modelOptions,
    displayModelId,
    effortId,
    currentRawModelId: run.acpRawModelId,
  });
  const controller = requireRuntimeController(requestId, "setModel");
  const applied =
    (await controller.setConfigOption?.({
      sessionId,
      category: "thought_level",
      value: effortId,
    })) === true;
  if (!applied) {
    await controller.setModel({ sessionId, modelId: rawModelId });
  }
  upsertAcpSkillRun({
    requestId,
    acpModelId: displayModelId,
    acpRawModelId: rawModelId,
    acpReasoningEffort: effortId,
    event: {
      stage: "runtime-reasoning-updated",
      message: "ACP skill run reasoning effort updated.",
      level: "info",
      details: {
        modelId: displayModelId,
        rawModelId,
        reasoningEffort: effortId,
      },
    },
  });
}

export async function connectAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  if (controllers.has(requestId)) {
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: "connected",
      connectionActionState: "idle",
      event: {
        stage: "connect-already-active",
        message: "ACP skill run conversation is already connected.",
        level: "info",
      },
    });
    return;
  }
  if (!recoveryHandler) {
    const message = "No ACP skill run recovery handler is available.";
    upsertAcpSkillRun({
      requestId,
      conversationRecoveryState: "failed",
      connectionActionState: "idle",
      lastRecoveryError: message,
      event: {
        stage: "connect-unavailable",
        message,
        level: "error",
      },
    });
    throw new Error(message);
  }
  upsertAcpSkillRun({
    requestId,
    connectionActionState: "connecting",
    conversationRecoveryState: "connecting",
    event: {
      stage: "connect-requested",
      message: "ACP skill run session recovery requested.",
      level: "info",
    },
  });
  try {
    await recoveryHandler({ requestId, reason: "connect" });
    upsertAcpSkillRun({
      requestId,
      connectionActionState: "idle",
      conversationRecoveryState: "connected",
      event: {
        stage: "connect-succeeded",
        message: "ACP skill run session recovered.",
        level: "info",
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : String(error || "unknown error");
    upsertAcpSkillRun({
      requestId,
      connectionActionState: "idle",
      conversationRecoveryState: "failed",
      lastRecoveryError: detail,
      event: {
        stage: "connect-failed",
        message: detail,
        level: "error",
      },
    });
    throw error;
  }
}

export async function disconnectAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const controller = controllers.get(requestId);
  upsertAcpSkillRun({
    requestId,
    connectionActionState: "disconnecting",
    event: {
      stage: "disconnect-requested",
      message: "ACP skill run local connection detach requested.",
      level: "info",
    },
  });
  if (controller?.disconnect) {
    await controller.disconnect();
  } else {
    registerAcpSkillRunController(requestId, null);
  }
  upsertAcpSkillRun({
    requestId,
    activePrompt: false,
    connectionActionState: "idle",
    conversationState: "closed",
    conversationRecoveryState: "available",
    event: {
      stage: "disconnected",
      message:
        "ACP skill run local connection detached; remote session remains recoverable.",
      level: "info",
    },
  });
}

export async function endAcpSkillRunSession(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const controller = controllers.get(requestId);
  if (controller?.endSession) {
    await controller.endSession();
  }
  upsertAcpSkillRun({
    requestId,
    activePrompt: false,
    conversationState: "ended",
    conversationRecoveryState: "unavailable",
    connectionActionState: "idle",
    event: {
      stage: "conversation-ended",
      message: "ACP skill run conversation ended.",
      level: "info",
    },
  });
}

export function markAcpSkillRunApplyResult(args: {
  requestId?: string;
  state: "pending" | "succeeded" | "failed";
  error?: string;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    return;
  }
  const backendStatus =
    existing.backendStatus ||
    (isTerminalAcpSkillRunStatus(existing.status)
      ? existing.status
      : "succeeded");
  upsertAcpSkillRun({
    requestId,
    status:
      args.state === "failed"
        ? "failed"
        : args.state === "succeeded"
          ? "succeeded"
          : existing.status,
    backendStatus,
    applyResultState: args.state,
    appliedAt: args.state === "succeeded" ? nowIso() : undefined,
    error: args.state === "failed" ? normalizeString(args.error) : undefined,
    event: {
      stage:
        args.state === "succeeded"
          ? "apply-succeeded"
          : args.state === "failed"
            ? "apply-failed"
            : "apply-pending",
      message:
        args.state === "succeeded"
          ? "Workflow applyResult succeeded."
          : args.state === "failed"
            ? `Workflow applyResult failed: ${normalizeString(args.error) || "unknown error"}`
            : "Workflow applyResult pending.",
      level: args.state === "failed" ? "error" : "info",
    },
  });
}

export function selectAcpSkillRun(requestIdRaw: string) {
  ensureHydrated();
  selectedRequestId = normalizeString(requestIdRaw);
  emitChanged();
}

export function listAcpSkillRuns() {
  ensureHydrated();
  return Array.from(runRecords.values())
    .map((entry) => ({
      ...entry,
      transcriptItems: entry.transcriptItems.map((item) => ({ ...item })),
      outputRevisions: entry.outputRevisions.map((item) => ({ ...item })),
      planEntries: entry.planEntries?.map((item) => ({ ...item })),
      events: entry.events.map((event) => ({ ...event })),
    }))
    .sort((a, b) => {
      const created = b.createdAt.localeCompare(a.createdAt);
      if (created !== 0) return created;
      return b.requestId.localeCompare(a.requestId);
    });
}

function isActiveAcpSkillRunForSummary(run: AcpSkillRunRecord) {
  return isActiveAcpSkillRunRecordForSummary(run);
}

function normalizeSummaryListLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

export function listAcpSkillRunSummaries(
  options: AcpSkillRunSummaryListOptions = {},
) {
  ensureHydrated();
  const backendId = String(options.backendId || "").trim();
  const requestId = String(options.requestId || "").trim();
  const limit = normalizeSummaryListLimit(options.limit);
  acpSkillRunSummaryDiagnostics.summaryQueryCount += 1;
  const candidates = requestId
    ? [runRecords.get(requestId)].filter(
        (run): run is AcpSkillRunRecord => !!run,
      )
    : options.activeOnly && !options.includeArchived
      ? Array.from(activeRunRequestIds.values())
          .map((id) => runRecords.get(id))
          .filter((run): run is AcpSkillRunRecord => !!run)
      : Array.from(runRecords.values());
  if (requestId) {
    acpSkillRunSummaryDiagnostics.runCandidateReadCount += candidates.length;
  } else if (options.activeOnly && !options.includeArchived) {
    acpSkillRunSummaryDiagnostics.activeIndexScanCount += 1;
    acpSkillRunSummaryDiagnostics.runCandidateReadCount += candidates.length;
  } else {
    acpSkillRunSummaryDiagnostics.fullRunRecordScanCount += 1;
    acpSkillRunSummaryDiagnostics.runCandidateReadCount += candidates.length;
  }
  const rows = candidates
    .filter((run) => {
      if (!options.includeArchived && (run.removedAt || run.archivedAt)) {
        return false;
      }
      if (options.activeOnly && !isActiveAcpSkillRunForSummary(run)) {
        return false;
      }
      if (backendId && String(run.backendId || "").trim() !== backendId) {
        return false;
      }
      if (requestId && String(run.requestId || "").trim() !== requestId) {
        return false;
      }
      return true;
    })
    .map(summarizeAcpSkillRun)
    .sort((a, b) => {
      const created = b.createdAt.localeCompare(a.createdAt);
      if (created !== 0) return created;
      return b.requestId.localeCompare(a.requestId);
    });
  return limit ? rows.slice(0, limit) : rows;
}

export function countActiveAcpSkillRunSummaries(
  options: {
    backendId?: string;
    waitingOnly?: boolean;
  } = {},
) {
  ensureHydrated();
  acpSkillRunSummaryDiagnostics.summaryQueryCount += 1;
  acpSkillRunSummaryDiagnostics.activeIndexScanCount += 1;
  const backendId = normalizeString(options.backendId);
  let count = 0;
  for (const requestId of activeRunRequestIds.values()) {
    const run = runRecords.get(requestId);
    if (!run) {
      continue;
    }
    acpSkillRunSummaryDiagnostics.runCandidateReadCount += 1;
    if (backendId && normalizeString(run.backendId) !== backendId) {
      continue;
    }
    if (options.waitingOnly) {
      const normalized = normalizeString(run.status).toLowerCase();
      if (
        normalized !== "waiting_user" &&
        normalized !== "waiting_auth" &&
        !run.pendingPermission
      ) {
        continue;
      }
    }
    count += 1;
  }
  return count;
}

export function getAcpSkillRunSummaryDiagnosticsForTests() {
  return { ...acpSkillRunSummaryDiagnostics };
}

export function resetAcpSkillRunSummaryDiagnosticsForTests() {
  acpSkillRunSummaryDiagnostics.summaryQueryCount = 0;
  acpSkillRunSummaryDiagnostics.fullRunRecordScanCount = 0;
  acpSkillRunSummaryDiagnostics.activeIndexScanCount = 0;
  acpSkillRunSummaryDiagnostics.runCandidateReadCount = 0;
}

export function cleanupExpiredAcpSkillRunsForRetention(args: {
  retentionMs: number;
  nowMs?: number;
}): AcpSkillRunRetentionCleanupResult {
  ensureHydrated();
  const retentionMs = Math.max(0, Number(args.retentionMs || 0) || 0);
  if (!retentionMs) {
    return {
      rowsDeleted: 0,
      requestIds: [],
      workspaceDirs: [],
    };
  }
  const nowMs = Math.max(0, Number(args.nowMs || 0) || 0) || Date.now();
  const thresholdMs = nowMs - retentionMs;
  const requestIds: string[] = [];
  const workspaceDirs: string[] = [];
  for (const record of Array.from(runRecords.values())) {
    if (!isAcpSkillRunRetentionEligible({ record, thresholdMs })) {
      continue;
    }
    requestIds.push(record.requestId);
    const workspaceDir = normalizeString(record.workspaceDir);
    if (workspaceDir) {
      workspaceDirs.push(workspaceDir);
    }
    deletePluginRunStoreEntry("acp", record.requestId);
    deleteAcpSkillRunRecord(record.requestId);
    if (selectedRequestId === record.requestId) {
      selectedRequestId = "";
    }
    if (record.backendId && record.requestId) {
      removeWorkflowTasksByBackendAndRequestIds({
        backendId: record.backendId,
        requestIds: [record.requestId],
      });
    }
  }
  if (requestIds.length > 0) {
    emitChanged();
  }
  return {
    rowsDeleted: requestIds.length,
    requestIds,
    workspaceDirs: Array.from(new Set(workspaceDirs)),
  };
}

export function getAcpSkillRunRecord(requestIdRaw: string) {
  ensureHydrated();
  const requestId = normalizeString(requestIdRaw);
  const entry = requestId ? runRecords.get(requestId) : undefined;
  return entry
    ? {
        ...entry,
        transcriptItems: entry.transcriptItems.map((item) => ({ ...item })),
        outputRevisions: entry.outputRevisions.map((item) => ({ ...item })),
        planEntries: entry.planEntries?.map((item) => ({ ...item })),
        events: entry.events.map((event) => ({ ...event })),
      }
    : null;
}

function findTaskForRun(run: AcpSkillRunRecord) {
  const requestId = normalizeString(run.requestId);
  if (!requestId) {
    return undefined;
  }
  return listActiveWorkflowTaskSummaries({ requestId })[0];
}

function summarizeAcpSkillRun(run: AcpSkillRunRecord): AcpSkillRunSummary {
  return {
    requestId: run.requestId,
    status: run.status,
    backendStatus: run.backendStatus,
    backendId: run.backendId,
    backendType: run.backendType,
    backendLabel: run.backendLabel,
    workflowId: run.workflowId,
    workflowLabel: run.workflowLabel,
    jobId: run.jobId,
    runId: run.runId,
    sequenceStepId: run.sequenceStepId,
    sequenceStepIndex: run.sequenceStepIndex,
    taskName: run.taskName,
    skillName: run.skillName,
    skillLabel: run.skillLabel,
    skillId: run.skillId,
    executionMode: run.executionMode,
    workspaceDir: run.workspaceDir,
    acpModeId: run.acpModeId,
    acpModelId: run.acpModelId,
    acpReasoningEffort: run.acpReasoningEffort,
    agentFamily: run.agentFamily,
    conversationState: run.conversationState,
    conversationRecoveryState: run.conversationRecoveryState,
    conversationError: run.conversationError,
    replyState: run.replyState,
    connectionActionState: run.connectionActionState,
    applyResultState: run.applyResultState,
    pendingPermission: run.pendingPermission
      ? { ...run.pendingPermission }
      : null,
    activePrompt: run.activePrompt,
    error: run.error,
    removedAt: run.removedAt,
    archivedAt: run.archivedAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

export function buildAcpSkillRunPanelSnapshot(args?: {
  selectedRequestId?: string;
}): AcpSkillRunPanelSnapshot {
  const listedRuns = listAcpSkillRunSummaries({
    limit: ACP_SKILL_RUN_PANEL_RUN_LIMIT + 1,
  });
  const truncated = listedRuns.length > ACP_SKILL_RUN_PANEL_RUN_LIMIT;
  let runs = listedRuns.slice(0, ACP_SKILL_RUN_PANEL_RUN_LIMIT);
  const requested =
    normalizeString(args?.selectedRequestId) || selectedRequestId;
  const requestedRecord = requested ? getAcpSkillRunRecord(requested) : null;
  const selected =
    (requestedRecord &&
    !requestedRecord.removedAt &&
    !requestedRecord.archivedAt
      ? requestedRecord
      : null) ||
    (runs[0] ? getAcpSkillRunRecord(runs[0].requestId) : null) ||
    undefined;
  if (
    requestedRecord &&
    !requestedRecord.removedAt &&
    !requestedRecord.archivedAt &&
    !runs.some((run) => run.requestId === requestedRecord.requestId)
  ) {
    runs = [
      summarizeAcpSkillRun(requestedRecord),
      ...runs.filter((run) => run.requestId !== requestedRecord.requestId),
    ].slice(0, ACP_SKILL_RUN_PANEL_RUN_LIMIT);
  }
  selectedRequestId = selected?.requestId || "";
  const selectedTask = selected ? findTaskForRun(selected) : undefined;
  const logs = selected
    ? listRuntimeLogs({
        requestId: selected.requestId,
        order: "asc",
        limit: 120,
      }).map((entry) => ({
        id: entry.id,
        ts: entry.ts,
        level: entry.level,
        stage: entry.stage,
        message: entry.message,
        scope: entry.scope,
      }))
    : [];
  const labels = {
    assistantPanel: buildAssistantPanelLabels(),
    title: getStringOrFallback(
      "task-dashboard-home-acp-skill-runs-title" as any,
      "ACP Skill Runs",
    ),
    completedTasksTitle: getStringOrFallback(
      "task-dashboard-run-completed-tasks-title" as any,
      "Completed Tasks",
    ),
    panelRendererUnavailable: getStringOrFallback(
      "task-dashboard-acp-skill-run-panel-renderer-unavailable" as any,
      "ACP Skills panel renderer unavailable.",
    ),
    panelRendererFailed: getStringOrFallback(
      "task-dashboard-acp-skill-run-panel-renderer-failed" as any,
      "ACP Skills panel renderer failed",
    ),
    transcriptRendererUnavailable: getStringOrFallback(
      "task-dashboard-acp-transcript-renderer-unavailable" as any,
      "Transcript renderer unavailable.",
    ),
  };
  return {
    generatedAt: nowIso(),
    labels,
    selectedRequestId,
    mcpServer: getZoteroMcpServerStatus(),
    mcpHealth: getZoteroMcpHealthSnapshot(),
    hostBridge: getHostBridgeServerStatus(),
    summary: {
      total: runs.length,
      active: runs.filter(
        (run) =>
          run.status !== "succeeded" &&
          run.status !== "failed" &&
          run.status !== "canceled",
      ).length,
      failed: runs.filter((run) => run.status === "failed").length,
      recent: runs.slice(0, 20).length,
    },
    drawer: {
      notice: truncated
        ? getStringOrFallback(
            "task-dashboard-panel-history-truncated" as any,
            "Showing recent runs only. View older records in Dashboard.",
          )
        : undefined,
      truncated: truncated || undefined,
    },
    runs,
    selectedRun: selected,
    selectedRuntimeOptions: selected
      ? runtimeOptionsForRun(selected)
      : undefined,
    selectedTask,
    logs,
  };
}

export function subscribeAcpSkillRunSnapshots(listener: AcpSkillRunListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function shutdownAcpSkillRunConversations() {
  const entries = Array.from(controllers.entries());
  for (const [requestId, controller] of entries) {
    try {
      if (controller.disconnect) {
        await controller.disconnect();
      } else {
        registerAcpSkillRunController(requestId, null);
      }
      upsertAcpSkillRun({
        requestId,
        activePrompt: false,
        conversationState: "closed",
        conversationRecoveryState: "available",
        connectionActionState: "idle",
        event: {
          stage: "conversation-detached",
          message:
            "ACP skill run local controller detached during shutdown; remote session remains recoverable.",
          level: "info",
        },
      });
    } catch {
      upsertAcpSkillRun({
        requestId,
        activePrompt: false,
        conversationState: "error",
        conversationRecoveryState: "failed",
        event: {
          stage: "conversation-error",
          message: "ACP skill run conversation shutdown failed.",
          level: "error",
        },
      });
    }
  }
}

export function resetAcpSkillRunsForTests() {
  if (changedEmitTimer) {
    clearTimeout(changedEmitTimer);
    changedEmitTimer = null;
  }
  clearAcpSkillRunRecords();
  controllers.clear();
  runtimeOptionsByRequestId.clear();
  permissionResolvers.clear();
  listeners.clear();
  selectedRequestId = "";
  hydrated = false;
  resetAcpSkillRunSummaryDiagnosticsForTests();
  clearPluginRunStore("acp");
}

registerAcpSkillRunsMemoryClearer(() => {
  clearAcpSkillRunRecords();
  runtimeOptionsByRequestId.clear();
  selectedRequestId = "";
  hydrated = false;
  clearPluginRunStore("acp");
  emitChanged();
});

registerAcpSkillRunsRetentionCleaner(cleanupExpiredAcpSkillRunsForRetention);

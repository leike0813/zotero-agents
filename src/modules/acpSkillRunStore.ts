import {
  PLUGIN_TASK_DOMAIN_ACP,
  listPluginTaskRowEntries,
  upsertPluginTaskRowEntry,
} from "./pluginStateStore";
import { registerAcpSkillRunsMemoryClearer } from "./runtimePersistence";
import { listRuntimeLogs } from "./runtimeLogManager";
import { buildAssistantPanelLabels } from "./assistantPanelLabels";
import {
  listWorkflowTasks,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import {
  getZoteroMcpHealthSnapshot,
  getZoteroMcpServerStatus,
  type ZoteroMcpServerStatusSnapshot,
} from "./zoteroMcpServer";
import type {
  AcpToolCall,
  RequestPermissionOutcome,
  SessionNotification,
} from "./acpProtocol";
import type { AcpMcpHealthSnapshot, AcpPendingPermissionRequest } from "./acpTypes";

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

export type AcpSkillRunRecord = {
  requestId: string;
  status: AcpSkillRunStatus;
  backendId: string;
  backendType: string;
  backendLabel?: string;
  workflowId?: string;
  workflowLabel?: string;
  jobId?: string;
  runId?: string;
  taskName?: string;
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
  runtimeDependencyStatus?: "not-required" | "disabled" | "probing" | "ready" | "failed";
  runtimeDependencyError?: string;
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

export type AcpSkillRunSummary = Pick<
  AcpSkillRunRecord,
  | "requestId"
  | "status"
  | "backendId"
  | "backendType"
  | "backendLabel"
  | "workflowId"
  | "workflowLabel"
  | "jobId"
  | "runId"
  | "taskName"
  | "skillId"
  | "executionMode"
  | "workspaceDir"
  | "acpModeId"
  | "acpModelId"
  | "acpReasoningEffort"
  | "conversationState"
  | "conversationRecoveryState"
  | "replyState"
  | "connectionActionState"
  | "applyResultState"
  | "activePrompt"
  | "error"
  | "removedAt"
  | "archivedAt"
  | "createdAt"
  | "updatedAt"
>;

export type AcpSkillRunPanelSnapshot = {
  generatedAt: string;
  selectedRequestId: string;
  mcpServer?: ZoteroMcpServerStatusSnapshot;
  mcpHealth?: AcpMcpHealthSnapshot;
  summary: {
    total: number;
    active: number;
    failed: number;
    recent: number;
  };
  runs: AcpSkillRunSummary[];
  selectedRun?: AcpSkillRunRecord;
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
  };
};

type AcpSkillRunController = {
  cancel: () => Promise<void>;
  reply?: (message: string) => Promise<void>;
  disconnect?: () => Promise<void>;
  endSession?: () => Promise<void>;
};

type AcpSkillRunListener = () => void;
type AcpSkillRunRecoveryHandler = (args: {
  requestId: string;
  reason: "connect" | "reply";
}) => Promise<void>;

const STORE_SCOPE = "skill-runs";
const runRecords = new Map<string, AcpSkillRunRecord>();
const controllers = new Map<string, AcpSkillRunController>();
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

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
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

function normalizeConversationState(value: unknown): AcpSkillRunConversationState {
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
  if (normalized === "submitted" || normalized === "accepted" || normalized === "rejected") {
    return normalized;
  }
  return "idle";
}

function normalizeConnectionActionState(value: unknown): AcpSkillRunConnectionActionState {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "connecting" || normalized === "disconnecting") {
    return normalized;
  }
  return "idle";
}

function parsePendingInteraction(value: unknown): AcpSkillRunPendingInteraction | undefined {
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
  return normalized === "invalid" || normalized === "pending" || normalized === "final"
    ? normalized
    : undefined;
}

function parseMessageRevision(value: unknown): AcpSkillRunMessageRevisionSummary | undefined {
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
    latestRepairRound: Math.max(0, Math.floor(Number(value.latestRepairRound || 0) || 0)),
  };
}

function parseOutputRevisions(value: unknown): AcpSkillRunOutputRevision[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).reduce<AcpSkillRunOutputRevision[]>((acc, raw, index) => {
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
  }, []).slice(-50);
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
  return value
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
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
    "acp-session-created",
    "acp-prompt-finished",
    "output-validation-succeeded",
    "output-validation-failed",
    "repair-started",
    "repair-validation-succeeded",
    "repair-validation-failed",
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
  ]).has(normalizeString(stage));
}

function appendStatusTranscriptItem(
  record: AcpSkillRunRecord,
  event: AcpSkillRunEvent,
) {
  const text = normalizeString(event.message);
  if (!text || !shouldShowEventInTranscript(event.stage)) {
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
    text,
    createdAt: event.ts,
  };
  record.transcriptItems = [
    ...record.transcriptItems,
    item,
  ].slice(-200);
}

function parseTranscriptItems(value: unknown, updatedAt: string) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).reduce<AcpSkillRunTranscriptItem[]>((acc, raw) => {
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
  return value.filter(isRecord).map((entry) => ({
    content: normalizeString(entry.content),
    priority: normalizeString(entry.priority) || undefined,
    status: normalizeString(entry.status) || undefined,
  })).filter((entry) => entry.content);
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
    backendId: normalizeString(raw.backendId),
    backendType: normalizeString(raw.backendType) || "acp",
    backendLabel: normalizeString(raw.backendLabel) || undefined,
    workflowId: normalizeString(raw.workflowId) || undefined,
    workflowLabel: normalizeString(raw.workflowLabel) || undefined,
    jobId: normalizeString(raw.jobId) || undefined,
    runId: normalizeString(raw.runId) || undefined,
    taskName: normalizeString(raw.taskName) || undefined,
    skillId: normalizeString(raw.skillId) || undefined,
    requestPayload: raw.requestPayload,
    providerOptions: isRecord(raw.providerOptions) ? { ...raw.providerOptions } : undefined,
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
    sharedSkillCatalogPath: normalizeString(raw.sharedSkillCatalogPath) || undefined,
    proxySkillCount: Math.max(0, Math.floor(Number(raw.proxySkillCount || 0) || 0)),
    proxySkillRoots: parseStringArray(raw.proxySkillRoots),
    requestedSkillId: normalizeString(raw.requestedSkillId) || undefined,
    requestedSkillProxyPath: normalizeString(raw.requestedSkillProxyPath) || undefined,
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
    runtimeDependencyError: normalizeString(raw.runtimeDependencyError) || undefined,
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
    conversationRecoveryState: normalizeRecoveryState(raw.conversationRecoveryState),
    conversationError: normalizeString(raw.conversationError) || undefined,
    lastRecoveryError: normalizeString(raw.lastRecoveryError) || undefined,
    replyState: normalizeReplyState(raw.replyState),
    replyError: normalizeString(raw.replyError) || undefined,
    connectionActionState: normalizeConnectionActionState(raw.connectionActionState),
    lastPromptStopReason: normalizeString(raw.lastPromptStopReason) || undefined,
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
          requestedAt: normalizeString(raw.pendingPermission.requestedAt) || updatedAt,
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
    events: rawEvents
      .filter(isRecord)
      .map((entry) => ({
        ts: normalizeString(entry.ts) || updatedAt,
        stage: normalizeString(entry.stage) || "unknown",
        message: normalizeString(entry.message) || "Run updated",
        level:
          entry.level === "error" || entry.level === "warn" ? entry.level : "info",
        details: isRecord(entry.details) ? { ...entry.details } : undefined,
      })),
  };
}

function ensureHydrated() {
  if (hydrated) {
    return;
  }
  hydrated = true;
  for (const row of listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, STORE_SCOPE)) {
    try {
      const parsed = parseRunRecord(JSON.parse(row.payload || "{}"));
      if (!parsed) {
        continue;
      }
      runRecords.set(parsed.requestId, parsed);
    } catch {
      continue;
    }
  }
}

function persistRun(record: AcpSkillRunRecord) {
  upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_ACP, STORE_SCOPE, {
    taskId: record.requestId,
    requestId: record.requestId,
    backendId: record.backendId,
    state: record.status,
    updatedAt: record.updatedAt,
    payload: JSON.stringify(record),
  });
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
  backendId?: string;
  backendType?: string;
  backendLabel?: string;
  workflowId?: string;
  workflowLabel?: string;
  jobId?: string;
  runId?: string;
  taskName?: string;
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
  event?: Omit<AcpSkillRunEvent, "ts"> & { ts?: string };
}) {
  ensureHydrated();
  const requestId = normalizeString(update.requestId);
  if (!requestId) {
    throw new Error("ACP skill run update requires requestId");
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
  const assignString = <K extends keyof AcpSkillRunRecord>(key: K, value: unknown) => {
    const normalized = normalizeString(value);
    if (normalized) {
      (next as Record<string, unknown>)[key as string] = normalized;
    }
  };
  if (update.status) next.status = update.status;
  assignString("backendId", update.backendId);
  assignString("backendType", update.backendType);
  assignString("backendLabel", update.backendLabel);
  assignString("workflowId", update.workflowId);
  assignString("workflowLabel", update.workflowLabel);
  assignString("jobId", update.jobId);
  assignString("runId", update.runId);
  assignString("taskName", update.taskName);
  assignString("skillId", update.skillId);
  if (Object.prototype.hasOwnProperty.call(update, "requestPayload")) {
    next.requestPayload = update.requestPayload;
  }
  if (isRecord(update.providerOptions)) {
    next.providerOptions = { ...update.providerOptions };
  }
  if (update.executionMode === "auto" || update.executionMode === "interactive") {
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
  if (Array.isArray(update.skillRoots)) next.skillRoots = [...update.skillRoots];
  if (typeof update.proxySkillCount === "number" && Number.isFinite(update.proxySkillCount)) {
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
  if (typeof update.repairRounds === "number" && Number.isFinite(update.repairRounds)) {
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
  if (update.conversationState) next.conversationState = update.conversationState;
  if (update.conversationRecoveryState) {
    next.conversationRecoveryState = update.conversationRecoveryState;
  }
  if (update.replyState) next.replyState = update.replyState;
  if (update.connectionActionState) {
    next.connectionActionState = update.connectionActionState;
  }
  if (update.applyResultState) next.applyResultState = update.applyResultState;
  if (typeof update.activePrompt === "boolean") next.activePrompt = update.activePrompt;
  if (Object.prototype.hasOwnProperty.call(update, "pendingPermission")) {
    next.pendingPermission = update.pendingPermission || null;
  }
  if (typeof update.resultJson !== "undefined") next.resultJson = update.resultJson;
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
  runRecords.set(requestId, next);
  selectedRequestId = selectedRequestId || requestId;
  persistRun(next);
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
  runRecords.set(requestId, next);
  persistRun(next);
  scheduleChangedEmit();
}

function formatFinalEnvelopeMarkdown(payload: Record<string, unknown>) {
  const displayPayload = { ...payload };
  delete displayPayload.__SKILL_DONE__;
  return `\`\`\`json\n${JSON.stringify(displayPayload, null, 2)}\n\`\`\``;
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
    .find(({ entry }) => entry.kind === "message" && entry.role === "assistant")
    ?.index;
  if (typeof existingIndex === "number") {
    args.record.transcriptItems = args.record.transcriptItems.map((entry, index) =>
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
  args.record.transcriptItems = [
    ...args.record.transcriptItems,
    item,
  ].slice(-200);
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
    .find(({ entry }) => entry.kind === "message" && entry.role === "assistant")
    ?.index;
  if (typeof latestAssistantIndex !== "number") {
    return;
  }
  const latest = record.transcriptItems[latestAssistantIndex];
  if (latest.kind !== "message") {
    return;
  }
  const latestText = String(latest.text || "").trim();
  if (latestText === normalizedCandidate || latestText.includes("__SKILL_DONE__")) {
    record.transcriptItems = record.transcriptItems.filter((_, index) => index !== latestAssistantIndex);
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
  runRecords.set(requestId, next);
  persistRun(next);
  emitChanged();
}

export function projectAcpSkillRunOutputEnvelopeToTranscript(args:
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
    }
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
      (args.kind === "pending" ? args.message : JSON.stringify(args.resultJson)),
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
  runRecords.set(requestId, next);
  persistRun(next);
  emitChanged();
}

function getLatestTranscriptItem(record: AcpSkillRunRecord) {
  return record.transcriptItems[record.transcriptItems.length - 1];
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
  const latest = getLatestTranscriptItem(args.record);
  if (
    args.kind === "message" &&
    latest?.kind === "message" &&
    latest.role === (args.role || "assistant")
  ) {
    latest.text += text;
    latest.state = "streaming";
    latest.updatedAt = args.now;
    return;
  }
  if (args.kind === "thought" && latest?.kind === "thought") {
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
          role: args.role || "assistant",
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
  args.record.transcriptItems = [
    ...args.record.transcriptItems,
    item,
  ].slice(-200);
}

function extractToolName(update: AcpToolCall, current?: AcpSkillRunTranscriptItem) {
  return firstToolText([
    update.name,
    update.tool,
    update.functionName,
    update.function_name,
    (isRecord(update.metadata) && (update.metadata.name || update.metadata.title)) || "",
    update.title,
    update.kind,
    current?.kind === "tool_call" ? current.toolName : "",
  ]) || "Tool";
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
  if (!explicitStatus && explicitState === "pending" && hasToolResultPayload(update)) {
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
    existingIndex >= 0
      ? record.transcriptItems[existingIndex]
      : undefined;
  const current =
    existing?.kind === "tool_call" ? existing : undefined;
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
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: now,
    transcriptItems: [...existing.transcriptItems],
    planEntries: existing.planEntries ? [...existing.planEntries] : undefined,
    usage: existing.usage ? { ...existing.usage } : undefined,
  };
  const update = event.update || { sessionUpdate: "" };
  const kind = normalizeString(update.sessionUpdate);
  if (kind === "agent_message_chunk" || kind === "user_message_chunk") {
    const content = (update as { content?: { type?: string | null; text?: string | null } }).content;
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
    const content = (update as { content?: { type?: string | null; text?: string | null } }).content;
    if (normalizeString(content?.type) === "text") {
      appendTextChunk({
        record: next,
        kind: "thought",
        text: String(content?.text || ""),
        now,
      });
    }
  } else if (kind === "tool_call" || kind === "tool_call_update") {
    upsertTranscriptToolCall(next, update as AcpToolCall, now);
  } else if (kind === "plan") {
    next.planEntries = parsePlanEntries((update as { entries?: unknown }).entries);
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
  runRecords.set(requestId, next);
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
    },
  });
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
  for (const [requestId, entry] of permissionResolvers.entries()) {
    if (entry === matched) {
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
        message: "ACP skill run canceled from the panel; no live controller was available.",
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

export function archiveAcpSkillRun(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for archive.");
  }
  if (existing.status !== "succeeded" && existing.status !== "failed" && existing.status !== "canceled") {
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
      const detail = error instanceof Error ? error.message : String(error || "unknown error");
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
        message: "Reply failed because no active ACP conversation controller was available.",
        level: "error",
      },
    });
    throw new Error("No active ACP conversation controller is available.");
  }
  upsertAcpSkillRun({
    requestId,
    replyState: "accepted",
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
    const detail = error instanceof Error ? error.message : String(error || "unknown error");
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
    const detail = error instanceof Error ? error.message : String(error || "unknown error");
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
      message: "ACP skill run local connection detached; remote session remains recoverable.",
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
  upsertAcpSkillRun({
    requestId,
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
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
  return listWorkflowTasks().find((task) => {
    return requestId && normalizeString(task.requestId) === requestId;
  });
}

function summarizeAcpSkillRun(run: AcpSkillRunRecord): AcpSkillRunSummary {
  return {
    requestId: run.requestId,
    status: run.status,
    backendId: run.backendId,
    backendType: run.backendType,
    backendLabel: run.backendLabel,
    workflowId: run.workflowId,
    workflowLabel: run.workflowLabel,
    jobId: run.jobId,
    runId: run.runId,
    taskName: run.taskName,
    skillId: run.skillId,
    executionMode: run.executionMode,
    workspaceDir: run.workspaceDir,
    acpModeId: run.acpModeId,
    acpModelId: run.acpModelId,
    acpReasoningEffort: run.acpReasoningEffort,
    conversationState: run.conversationState,
    conversationRecoveryState: run.conversationRecoveryState,
    replyState: run.replyState,
    connectionActionState: run.connectionActionState,
    applyResultState: run.applyResultState,
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
  const runs = listAcpSkillRuns().filter((run) => !run.removedAt && !run.archivedAt);
  const requested = normalizeString(args?.selectedRequestId) || selectedRequestId;
  const selected =
    runs.find((run) => run.requestId === requested) ||
    runs[0];
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
  return {
    generatedAt: nowIso(),
    labels: {
      assistantPanel: buildAssistantPanelLabels(),
    },
    selectedRequestId,
    mcpServer: getZoteroMcpServerStatus(),
    mcpHealth: getZoteroMcpHealthSnapshot(),
    summary: {
      total: runs.length,
      active: runs.filter((run) => run.status !== "succeeded" && run.status !== "failed" && run.status !== "canceled").length,
      failed: runs.filter((run) => run.status === "failed").length,
      recent: runs.slice(0, 20).length,
    },
    runs: runs.map(summarizeAcpSkillRun),
    selectedRun: selected,
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
          message: "ACP skill run local controller detached during shutdown; remote session remains recoverable.",
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
  runRecords.clear();
  controllers.clear();
  permissionResolvers.clear();
  listeners.clear();
  selectedRequestId = "";
  hydrated = false;
}

registerAcpSkillRunsMemoryClearer(() => {
  runRecords.clear();
  selectedRequestId = "";
  hydrated = false;
  emitChanged();
});

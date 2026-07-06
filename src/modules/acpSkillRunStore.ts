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
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { appendRuntimeLog, listRuntimeLogs } from "./runtimeLogManager";
import { buildAssistantPanelLabels } from "./assistantPanelLabels";
import {
  ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS,
  canPublishAssistantWorkspaceLiveUpdates,
} from "./assistantWorkspaceUiPublishPolicy";
import { readUiVisibleTranscriptPage } from "./assistantTranscriptPageProjection";
import {
  listWorkflowTasks,
  removeWorkflowTasksByBackendAndRequestIds,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import { mapAcpSkillRunSummaryToWorkflowTask } from "./acpSkillRunTaskProjection";
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
import { normalizeAcpPermissionOptionKind } from "./acpPermissionOptions";
import type { AcpSkillRunAuditTrailState } from "./acpSkillRunAuditTrail";
import {
  appendAcpSkillRunTranscriptEvents,
  readAcpSkillRunTranscriptPage as readAcpSkillRunTranscriptPageFromStore,
  resolveAcpSkillRunTranscriptPaths,
  type AcpSkillRunTranscriptEventInput,
  type AcpSkillRunTranscriptMetadata,
  type AcpSkillRunTranscriptPage,
} from "./acpSkillRunTranscriptStore";
import {
  appendAcpSkillRunOutputRevision,
  resolveAcpSkillRunPayloadPaths,
  writeAcpSkillRunContextPayload,
  type AcpSkillRunPayloadRefs,
} from "./acpSkillRunPayloadStore";

export type AcpSkillRunStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "repairing"
  | "failed_retriable"
  | "succeeded"
  | "failed"
  | "canceled";

export type AcpSkillRunStatusTransitionReason =
  | "create"
  | "start"
  | "waiting_user"
  | "interrupt_turn"
  | "cancel_task"
  | "repair_start"
  | "validation_succeeded"
  | "validation_failed"
  | "prompt_failed_retriable"
  | "prompt_failed_terminal"
  | "recovery_continue"
  | "recovery_failed"
  | "apply_succeeded"
  | "apply_failed"
  | "disconnect"
  | "startup_reconcile"
  | "legacy_migration";

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
  candidateRef?: string;
  candidatePreview?: string;
};

type AcpSkillRunPendingInteractionUpdate = AcpSkillRunPendingInteraction & {
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
  auditTrail?: AcpSkillRunAuditTrailState;
  repairRounds: number;
  validationStatus?: "pending" | "valid" | "invalid";
  validationErrors?: string[];
  outputConvergenceState?: "pending" | "final" | "invalid";
  lastTurnOutput?: string;
  lastTurnOutputPreview?: string;
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
  transcriptItems?: AcpSkillRunTranscriptItem[];
  outputRevisionsPath?: string;
  outputRevisionCount?: number;
  outputRevisionPreview?: string;
  error?: string;
  usage?: {
    used: number;
    size: number;
  };
  removedAt?: string;
  archivedAt?: string;
  planEntries?: AcpSkillRunPlanEntry[];
  transcriptPath?: string;
  transcriptIndexPath?: string;
  transcriptRevision?: number;
  transcriptEventSeq?: number;
  transcriptItemCount?: number;
  transcriptPreview?: string;
  runContextPath?: string;
  createdAt: string;
  updatedAt: string;
  events: AcpSkillRunEvent[];
};

export type AcpSkillRunRetentionCleanupResult = {
  rowsDeleted: number;
  requestIds: string[];
  workspaceDirs: string[];
  runtimeDirs: string[];
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
  | "pendingInteraction"
  | "pendingPermission"
  | "activePrompt"
  | "transcriptRevision"
  | "transcriptEventSeq"
  | "transcriptItemCount"
  | "transcriptPreview"
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
  selectedTranscript?: {
    requestId: string;
    state: "ready" | "loading" | "failed";
    error?: string;
  };
  selectedTranscriptPage?: AcpSkillRunTranscriptPage & {
    requestId: string;
    transcriptRevision: number;
    limit: number;
  };
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
    runningTasksTitle?: string;
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

export type AcpSkillRunSnapshotChangeKind =
  | "run"
  | "transcript"
  | "runtime-options"
  | "selection"
  | "archive"
  | "global";

export type AcpSkillRunSnapshotChange = {
  requestIds?: string[];
  kinds?: AcpSkillRunSnapshotChangeKind[];
  global?: boolean;
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

type AcpSkillRunListener = (change?: AcpSkillRunSnapshotChange) => void;
type AcpSkillRunRecoveryHandler = (args: {
  requestId: string;
  reason: "connect" | "reply";
}) => Promise<void>;

const ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS = 2_000;
const ACP_SKILL_RUN_SHUTDOWN_FLUSH_TIMEOUT_MS = 750;

type AcpSkillRunTranscriptLiveState = {
  itemCount: number;
  eventSeq: number;
  itemsById: Map<string, AcpSkillRunTranscriptItem>;
  itemIds: string[];
  mirrorLoaded: boolean;
  needsHydrate?: boolean;
  hydrateState?: "loading" | "failed";
  hydrateError?: string;
  hydratePromise?: Promise<unknown>;
  lastTextItem?: {
    id: string;
    kind: "message" | "thought";
    role: "assistant" | "user";
    state: "streaming" | "complete";
  };
  lastAssistantMessageId?: string;
  lastStatus?: {
    id: string;
    label: string;
    text: string;
  };
  permissionItemIds: Map<string, string>;
  toolItemIds: Map<string, string>;
  toolItems: Map<
    string,
    {
      id: string;
      title?: string;
      toolKind?: string;
      toolName?: string;
      inputSummary?: string;
      summary?: string;
    }
  >;
};

const runRecords = new Map<string, AcpSkillRunRecord>();
const transcriptLiveStates = new Map<string, AcpSkillRunTranscriptLiveState>();
const controllers = new Map<string, AcpSkillRunController>();
const waitingUserDetachTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
const runtimeFileWrites = new Set<Promise<unknown>>();
const transcriptWriteBatches = new Map<
  string,
  {
    events: AcpSkillRunTranscriptEventInput[];
    timer: ReturnType<typeof setTimeout> | null;
    flushing: Promise<void> | null;
  }
>();
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

async function waitForAcpSkillRunShutdownTask(
  task: Promise<unknown>,
  timeoutMs = ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS,
) {
  if (timeoutMs <= 0) {
    return { timedOut: true as const };
  }
  return Promise.race([
    task.then(
      () => ({ timedOut: false as const }),
      (error) => ({ timedOut: false as const, error }),
    ),
    new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    }),
  ]);
}
const listeners = new Set<AcpSkillRunListener>();
let hydrated = false;
let selectedRequestId = "";
let recoveryHandler: AcpSkillRunRecoveryHandler | null = null;
let changedEmitTimer: ReturnType<typeof setTimeout> | null = null;
let pendingChangedEmit: AcpSkillRunSnapshotChange | null = null;
const activeRunRequestIds = new Set<string>();
const recentVisibleRunRequestIds: string[] = [];
const recentVisibleRunSortKeys = new Map<string, string>();
const ACP_SKILL_RUN_PANEL_RUN_LIMIT = 100;
const ACP_SKILL_RUN_PREVIEW_LIMIT = 8 * 1024;
const ACP_SKILL_RUN_TRANSCRIPT_PAGE_DEFAULT_LIMIT = 80;
const ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT = 200;
const ACP_SKILL_RUN_WAITING_USER_LIVE_TTL_MS = 30 * 60 * 1000;
const acpSkillRunSummaryDiagnostics = {
  summaryQueryCount: 0,
  fullRunRecordScanCount: 0,
  activeIndexScanCount: 0,
  recentIndexScanCount: 0,
  runCandidateReadCount: 0,
};

function truncateAcpSkillRunPreview(value: unknown) {
  const text = normalizeString(value);
  if (!text) {
    return undefined;
  }
  return text.length > ACP_SKILL_RUN_PREVIEW_LIMIT
    ? `${text.slice(0, ACP_SKILL_RUN_PREVIEW_LIMIT)}...<truncated>`
    : text;
}

function sanitizeAcpSkillRunPersistedValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === "string") {
    return truncateAcpSkillRunPreview(value) || "";
  }
  if (value === null || typeof value === "undefined") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (depth > 6) {
    return "[truncated]";
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((entry) =>
        sanitizeAcpSkillRunPersistedValue(entry, depth + 1, seen),
      );
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value).slice(0, 200)) {
      result[key] = sanitizeAcpSkillRunPersistedValue(entry, depth + 1, seen);
    }
    seen.delete(value);
    return result;
  }
  return String(value);
}

function transcriptPreviewFromItem(item: AcpSkillRunTranscriptItem) {
  if (item.kind === "message" || item.kind === "thought") {
    return truncateAcpSkillRunPreview(item.text);
  }
  if (item.kind === "status") {
    return truncateAcpSkillRunPreview(item.text);
  }
  if (item.kind === "permission") {
    return truncateAcpSkillRunPreview(item.summary || item.title);
  }
  if (item.kind === "tool_call") {
    return truncateAcpSkillRunPreview(
      item.summary || item.resultSummary || item.inputSummary || item.title,
    );
  }
  return undefined;
}

function cloneAcpSkillRunTranscriptItem<T extends AcpSkillRunTranscriptItem>(
  item: T,
): T {
  if (item.kind === "status") {
    return {
      ...item,
      details: item.details ? { ...item.details } : undefined,
    } as T;
  }
  if (item.kind === "message") {
    return {
      ...item,
      revision: item.revision ? { ...item.revision } : undefined,
    } as T;
  }
  return { ...item };
}

function extractTranscriptItemOrdinal(itemId: string) {
  const match = /-(\d+)$/.exec(itemId);
  if (!match) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(match[1]) || 0));
}

function normalizeTranscriptPageLimit(value: unknown) {
  return Math.max(
    1,
    Math.min(
      ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
      Math.floor(Number(value || ACP_SKILL_RUN_TRANSCRIPT_PAGE_DEFAULT_LIMIT)),
    ),
  );
}

function resetTranscriptItemMirror(state: AcpSkillRunTranscriptLiveState) {
  state.itemsById.clear();
  state.itemIds = [];
  state.mirrorLoaded = false;
}

function resetTranscriptContinuityState(state: AcpSkillRunTranscriptLiveState) {
  state.lastTextItem = undefined;
  state.lastAssistantMessageId = undefined;
  state.lastStatus = undefined;
  state.permissionItemIds.clear();
  state.toolItemIds.clear();
  state.toolItems.clear();
}

function rememberTranscriptItemContinuity(
  state: AcpSkillRunTranscriptLiveState,
  item: AcpSkillRunTranscriptItem,
) {
  if (item.kind === "message" || item.kind === "thought") {
    state.lastTextItem = {
      id: item.id,
      kind: item.kind,
      role: item.kind === "message" ? item.role : "assistant",
      state: item.state || "complete",
    };
    if (item.kind === "message" && item.role === "assistant") {
      state.lastAssistantMessageId = item.id;
    }
    return;
  }
  if (item.kind === "status") {
    state.lastStatus = {
      id: item.id,
      label: item.label,
      text: item.text,
    };
    return;
  }
  if (item.kind === "permission") {
    state.permissionItemIds.set(item.permissionRequestId, item.id);
    return;
  }
  if (item.kind === "tool_call") {
    state.toolItemIds.set(item.toolCallId, item.id);
    state.toolItems.set(item.toolCallId, {
      id: item.id,
      title: item.title,
      toolKind: item.toolKind,
      toolName: item.toolName,
      inputSummary: item.inputSummary,
      summary: item.summary,
    });
  }
}

function ensureTranscriptMirrorForEvent(state: AcpSkillRunTranscriptLiveState) {
  if (state.mirrorLoaded) {
    return;
  }
  state.itemsById.clear();
  state.itemIds = [];
  state.mirrorLoaded = true;
  state.needsHydrate = false;
  state.hydrateState = undefined;
  state.hydrateError = undefined;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown");
}

function applyTranscriptEventToMirror(
  state: AcpSkillRunTranscriptLiveState,
  args: {
    op: "upsert_item" | "append_text" | "patch_item" | "delete_item";
    itemId: string;
    item?: AcpSkillRunTranscriptItem;
    text?: string;
    patch?: Partial<AcpSkillRunTranscriptItem>;
    createdAt?: string;
  },
) {
  ensureTranscriptMirrorForEvent(state);
  if (args.op === "delete_item") {
    state.itemsById.delete(args.itemId);
    state.itemIds = state.itemIds.filter((itemId) => itemId !== args.itemId);
    return;
  }
  if (args.op === "append_text") {
    const current = state.itemsById.get(args.itemId);
    if (current && (current.kind === "message" || current.kind === "thought")) {
      state.itemsById.set(args.itemId, {
        ...current,
        text: `${current.text || ""}${args.text || ""}`,
        updatedAt: args.createdAt,
      } as AcpSkillRunTranscriptItem);
    }
    return;
  }
  if (args.op === "patch_item") {
    const current = state.itemsById.get(args.itemId);
    if (current && args.patch) {
      state.itemsById.set(args.itemId, {
        ...current,
        ...args.patch,
        id: current.id,
        kind: current.kind,
      } as AcpSkillRunTranscriptItem);
    }
    return;
  }
  if (!args.item) {
    return;
  }
  if (!state.itemsById.has(args.itemId)) {
    state.itemIds.push(args.itemId);
  }
  state.itemsById.set(args.itemId, cloneAcpSkillRunTranscriptItem(args.item));
}

function readTranscriptMirrorPage(args: {
  requestId: string;
  state: AcpSkillRunTranscriptLiveState;
  cursor?: number;
  limit?: number;
}): AcpSkillRunTranscriptPage & {
  requestId: string;
  transcriptRevision: number;
  limit: number;
} {
  const limit = normalizeTranscriptPageLimit(args.limit);
  const total = args.state.itemIds.length;
  const requestedCursor =
    typeof args.cursor === "number" && Number.isFinite(args.cursor)
      ? Math.max(0, Math.floor(args.cursor))
      : Math.max(0, total - limit);
  const cursor = Math.min(requestedCursor, total);
  const itemIds = args.state.itemIds.slice(cursor, cursor + limit);
  const items = itemIds
    .map((itemId) => args.state.itemsById.get(itemId))
    .filter((item): item is AcpSkillRunTranscriptItem => !!item)
    .map((item) => cloneAcpSkillRunTranscriptItem(item));
  const prevCursor = cursor > 0 ? Math.max(0, cursor - limit) : undefined;
  const nextCursor =
    cursor + itemIds.length < total ? cursor + itemIds.length : undefined;
  return {
    requestId: args.requestId,
    items,
    cursor,
    prevCursor,
    nextCursor,
    total,
    eventSeq: args.state.eventSeq,
    transcriptRevision: args.state.eventSeq,
    limit,
  };
}

function readUiVisibleTranscriptMirrorPage(args: {
  requestId: string;
  state: AcpSkillRunTranscriptLiveState;
  cursor?: number;
  limit?: number;
}): AcpSkillRunTranscriptPage & {
  requestId: string;
  transcriptRevision: number;
  limit: number;
} {
  const page = readUiVisibleTranscriptPage<AcpSkillRunTranscriptItem>({
    itemIds: args.state.itemIds,
    getItem: (itemId) => args.state.itemsById.get(itemId),
    cloneItem: cloneAcpSkillRunTranscriptItem,
    streamingRenderEnabled: canPublishAssistantWorkspaceLiveUpdates(),
    cursor: args.cursor,
    limit: args.limit,
    defaultLimit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_DEFAULT_LIMIT,
    maxLimit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
  });
  return {
    requestId: args.requestId,
    items: page.items,
    cursor: page.cursor,
    prevCursor: page.prevCursor,
    nextCursor: page.nextCursor,
    total: page.total,
    eventSeq: args.state.eventSeq,
    transcriptRevision: args.state.eventSeq,
    limit: page.limit,
  };
}

function deriveAcpSkillRunRuntimeFileMetadata(record: AcpSkillRunRecord) {
  const transcriptPaths = resolveAcpSkillRunTranscriptPaths(record.runtimeDir);
  const payloadRefs = resolveAcpSkillRunPayloadPaths(record.runtimeDir);
  const liveState = transcriptLiveStates.get(record.requestId);
  const transcriptItemCount = Math.max(
    0,
    record.transcriptItemCount || liveState?.itemCount || 0,
  );
  const transcriptEventSeq = Math.max(
    0,
    record.transcriptEventSeq ||
      record.transcriptRevision ||
      liveState?.eventSeq ||
      0,
  );
  const outputRevisionCount = Math.max(0, record.outputRevisionCount || 0);
  return {
    ...transcriptPaths,
    ...payloadRefs,
    transcriptRevision: transcriptEventSeq,
    transcriptEventSeq,
    transcriptItemCount,
    transcriptPreview: record.transcriptPreview,
    outputRevisionCount,
    outputRevisionPreview: record.outputRevisionPreview,
  } satisfies AcpSkillRunTranscriptMetadata &
    AcpSkillRunPayloadRefs & {
      outputRevisionCount: number;
      outputRevisionPreview?: string;
    };
}

function getAcpSkillRunTranscriptLiveState(record: AcpSkillRunRecord) {
  const requestId = record.requestId;
  let state = transcriptLiveStates.get(requestId);
  if (!state) {
    state = {
      itemCount: Math.max(0, record.transcriptItemCount || 0),
      eventSeq: Math.max(0, record.transcriptEventSeq || 0),
      itemsById: new Map(),
      itemIds: [],
      mirrorLoaded: false,
      permissionItemIds: new Map(),
      toolItemIds: new Map(),
      toolItems: new Map(),
    };
    transcriptLiveStates.set(requestId, state);
  }
  return state;
}

function loadTranscriptMirrorFromItems(args: {
  record: AcpSkillRunRecord;
  state: AcpSkillRunTranscriptLiveState;
  items: AcpSkillRunTranscriptItem[];
  eventSeq: number;
}) {
  resetTranscriptItemMirror(args.state);
  resetTranscriptContinuityState(args.state);
  let maxOrdinal = 0;
  for (const item of args.items) {
    const cloned = cloneAcpSkillRunTranscriptItem(item);
    if (!args.state.itemsById.has(cloned.id)) {
      args.state.itemIds.push(cloned.id);
    }
    args.state.itemsById.set(cloned.id, cloned);
    maxOrdinal = Math.max(maxOrdinal, extractTranscriptItemOrdinal(cloned.id));
    rememberTranscriptItemContinuity(args.state, cloned);
  }
  args.state.mirrorLoaded = true;
  args.state.needsHydrate = false;
  args.state.hydrateState = undefined;
  args.state.hydrateError = undefined;
  args.state.itemCount = Math.max(
    args.state.itemCount,
    args.record.transcriptItemCount || 0,
    args.items.length,
    maxOrdinal,
  );
  args.state.eventSeq = Math.max(
    args.state.eventSeq,
    args.record.transcriptEventSeq || 0,
    args.record.transcriptRevision || 0,
    args.eventSeq,
  );
  args.record.transcriptRevision = args.state.eventSeq;
  args.record.transcriptEventSeq = args.state.eventSeq;
  args.record.transcriptItemCount = args.state.itemCount;
  const latestPreview = [...args.state.itemIds]
    .reverse()
    .map((itemId) => args.state.itemsById.get(itemId))
    .map((item) => (item ? transcriptPreviewFromItem(item) : undefined))
    .find((preview) => !!preview);
  if (latestPreview) {
    args.record.transcriptPreview = latestPreview;
  }
}

function hasDurableAcpSkillRunTranscript(
  record: AcpSkillRunRecord,
  state = transcriptLiveStates.get(record.requestId),
) {
  return (
    !!normalizeString(record.runtimeDir) &&
    Math.max(
      0,
      record.transcriptEventSeq || 0,
      record.transcriptRevision || 0,
      record.transcriptItemCount || 0,
      state?.eventSeq || 0,
      state?.itemCount || 0,
    ) > 0
  );
}

function isAcpSkillRunLifecycleOpen(record: AcpSkillRunRecord) {
  if (record.removedAt || record.archivedAt) {
    return false;
  }
  if (!isTerminalAcpSkillRunStatus(record.status)) {
    return true;
  }
  if (record.activePrompt) {
    return true;
  }
  if (record.applyResultState === "pending") {
    return true;
  }
  if (record.pendingInteraction || record.pendingPermission) {
    return true;
  }
  if (record.replyState === "submitted" || record.replyState === "accepted") {
    return true;
  }
  if (
    record.connectionActionState === "connecting" ||
    record.connectionActionState === "disconnecting"
  ) {
    return true;
  }
  return (
    record.conversationRecoveryState === "connecting" ||
    record.conversationRecoveryState === "connected"
  );
}

function shouldRetainAcpSkillRunTranscriptMirror(record: AcpSkillRunRecord) {
  return (
    record.requestId === selectedRequestId || isAcpSkillRunLifecycleOpen(record)
  );
}

function releaseAcpSkillRunTranscriptMirror(
  record: AcpSkillRunRecord,
  state: AcpSkillRunTranscriptLiveState,
) {
  const hasDurableTranscript = hasDurableAcpSkillRunTranscript(record, state);
  resetTranscriptItemMirror(state);
  resetTranscriptContinuityState(state);
  state.needsHydrate = hasDurableTranscript;
  state.hydrateState = undefined;
  state.hydrateError = undefined;
}

function pruneInactiveAcpSkillRunTranscriptMirrors() {
  for (const [requestId, state] of transcriptLiveStates.entries()) {
    const record = runRecords.get(requestId);
    if (!record || shouldRetainAcpSkillRunTranscriptMirror(record)) {
      continue;
    }
    releaseAcpSkillRunTranscriptMirror(record, state);
  }
}

async function readFullTranscriptFromStore(record: AcpSkillRunRecord) {
  const items: AcpSkillRunTranscriptItem[] = [];
  let cursor: number | undefined = 0;
  let eventSeq = 0;
  do {
    const page = await readAcpSkillRunTranscriptPageFromStore({
      runtimeDir: record.runtimeDir,
      cursor,
      limit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
    });
    eventSeq = Math.max(eventSeq, page.eventSeq || 0);
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (typeof cursor === "number");
  return { items, eventSeq };
}

export async function hydrateAcpSkillRunTranscriptMirror(requestIdRaw: string) {
  ensureHydrated();
  const requestId = normalizeString(requestIdRaw);
  const record = requestId ? runRecords.get(requestId) : undefined;
  if (!record) {
    return null;
  }
  const state = getAcpSkillRunTranscriptLiveState(record);
  if (state.hydratePromise) {
    await state.hydratePromise;
    return readTranscriptMirrorPage({
      requestId,
      state,
      cursor: 0,
      limit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
    });
  }
  const runtimeDir = normalizeString(record.runtimeDir);
  const hydrate = (async () => {
    state.hydrateState = "loading";
    state.hydrateError = undefined;
    if (runtimeDir) {
      await flushAcpSkillRunTranscriptWriteBatch(runtimeDir);
    }
    const { items, eventSeq } = await readFullTranscriptFromStore(record);
    loadTranscriptMirrorFromItems({
      record,
      state,
      items,
      eventSeq,
    });
    setAcpSkillRunRecord(record);
    return readTranscriptMirrorPage({
      requestId,
      state,
      cursor: 0,
      limit: ACP_SKILL_RUN_TRANSCRIPT_PAGE_MAX_LIMIT,
    });
  })();
  state.hydratePromise = hydrate;
  try {
    return await hydrate;
  } catch (error) {
    state.hydrateState = "failed";
    state.hydrateError = errorText(error);
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "acp-skill-run-store",
      operation: "hydrate-transcript-mirror",
      stage: "hydrate-failed",
      requestId,
      message: state.hydrateError,
    });
    throw error;
  } finally {
    state.hydratePromise = undefined;
    emitChanged(acpSkillRunSnapshotChange(requestId, ["transcript"]));
  }
}

function scheduleAcpSkillRunTranscriptHydrate(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  const record = requestId ? runRecords.get(requestId) : undefined;
  if (!record) {
    return;
  }
  const state = getAcpSkillRunTranscriptLiveState(record);
  if (
    state.mirrorLoaded ||
    state.hydratePromise ||
    !hasDurableAcpSkillRunTranscript(record, state)
  ) {
    return;
  }
  void hydrateAcpSkillRunTranscriptMirror(requestId).catch(() => undefined);
}

function selectedTranscriptStateForRun(record: AcpSkillRunRecord | undefined) {
  if (!record) {
    return undefined;
  }
  const state = getAcpSkillRunTranscriptLiveState(record);
  if (state.mirrorLoaded || !hasDurableAcpSkillRunTranscript(record, state)) {
    return {
      requestId: record.requestId,
      state: "ready" as const,
    };
  }
  if (state.hydrateState === "failed") {
    return {
      requestId: record.requestId,
      state: "failed" as const,
      error: state.hydrateError,
    };
  }
  return {
    requestId: record.requestId,
    state: "loading" as const,
  };
}

function nextTranscriptItemId(
  record: AcpSkillRunRecord,
  prefix: string,
  state = getAcpSkillRunTranscriptLiveState(record),
) {
  return `acp-skill-${prefix}-${state.itemCount + 1}`;
}

function applyTranscriptMetadata(
  record: AcpSkillRunRecord,
  args: {
    item?: AcpSkillRunTranscriptItem;
    textPreview?: string;
    newItem?: boolean;
  } = {},
  state = getAcpSkillRunTranscriptLiveState(record),
) {
  const paths = resolveAcpSkillRunTranscriptPaths(record.runtimeDir);
  state.eventSeq += 1;
  if (args.newItem) {
    state.itemCount += 1;
  }
  record.transcriptPath = paths.transcriptPath || record.transcriptPath;
  record.transcriptIndexPath =
    paths.transcriptIndexPath || record.transcriptIndexPath;
  record.transcriptRevision = state.eventSeq;
  record.transcriptEventSeq = state.eventSeq;
  record.transcriptItemCount = state.itemCount;
  const preview =
    args.textPreview ||
    (args.item ? transcriptPreviewFromItem(args.item) : undefined);
  if (preview) {
    record.transcriptPreview = preview;
  }
  return state;
}

function queueTranscriptEvent(
  record: AcpSkillRunRecord,
  args: {
    op: "upsert_item" | "append_text" | "patch_item" | "delete_item";
    itemId: string;
    item?: AcpSkillRunTranscriptItem;
    text?: string;
    patch?: Partial<AcpSkillRunTranscriptItem>;
    createdAt: string;
    newItem?: boolean;
    textPreview?: string;
  },
) {
  const state = getAcpSkillRunTranscriptLiveState(record);
  const hadPersistedTranscript =
    hasDurableAcpSkillRunTranscript(record, state) ||
    state.eventSeq > 0 ||
    state.itemCount > 0 ||
    (record.transcriptEventSeq || 0) > 0 ||
    (record.transcriptItemCount || 0) > 0;
  applyTranscriptMetadata(
    record,
    {
      item: args.item,
      textPreview: args.textPreview,
      newItem: args.newItem,
    },
    state,
  );
  if (!state.mirrorLoaded && hadPersistedTranscript) {
    if (hasDurableAcpSkillRunTranscript(record, state)) {
      resetTranscriptContinuityState(state);
      state.needsHydrate = true;
      state.hydrateState = undefined;
      state.hydrateError = undefined;
      if (normalizeString(record.runtimeDir)) {
        queueAcpSkillRunTranscriptPersistence(record.runtimeDir, {
          seq: record.transcriptEventSeq || state.eventSeq,
          op: args.op,
          itemId: args.itemId,
          item: args.item,
          text: args.text,
          patch: args.patch,
          createdAt: args.createdAt,
        });
      }
      return;
    }
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "acp-skill-run-store",
      operation: "queue-transcript-event",
      stage: "transcript-mirror-not-hydrated",
      requestId: record.requestId,
      message:
        "ACP Skills transcript event was queued before an existing transcript mirror was hydrated.",
      details: {
        transcriptRevision: record.transcriptRevision || 0,
        transcriptEventSeq: record.transcriptEventSeq || 0,
      },
    });
  }
  applyTranscriptEventToMirror(state, {
    op: args.op,
    itemId: args.itemId,
    item: args.item,
    text: args.text,
    patch: args.patch,
    createdAt: args.createdAt,
  });
  if (!normalizeString(record.runtimeDir)) {
    return;
  }
  queueAcpSkillRunTranscriptPersistence(record.runtimeDir, {
    seq: record.transcriptEventSeq || state.eventSeq,
    op: args.op,
    itemId: args.itemId,
    item: args.item,
    text: args.text,
    patch: args.patch,
    createdAt: args.createdAt,
  });
}

function queueAcpSkillRunTranscriptPersistence(
  runtimeDirRaw: string | undefined,
  event: AcpSkillRunTranscriptEventInput,
) {
  const runtimeDir = normalizeString(runtimeDirRaw);
  if (!runtimeDir) {
    return;
  }
  let batch = transcriptWriteBatches.get(runtimeDir);
  if (!batch) {
    batch = {
      events: [],
      timer: null,
      flushing: null,
    };
    transcriptWriteBatches.set(runtimeDir, batch);
  }
  batch.events.push(event);
  if (batch.timer || batch.flushing) {
    return;
  }
  batch.timer = setTimeout(() => {
    const current = transcriptWriteBatches.get(runtimeDir);
    if (current) {
      current.timer = null;
    }
    const write = flushAcpSkillRunTranscriptWriteBatch(runtimeDir).catch(
      () => undefined,
    );
    runtimeFileWrites.add(write);
    void write.finally(() => {
      runtimeFileWrites.delete(write);
    });
  }, 50);
}

async function flushAcpSkillRunTranscriptWriteBatch(runtimeDir: string) {
  const batch = transcriptWriteBatches.get(runtimeDir);
  if (!batch) {
    return;
  }
  if (batch.flushing) {
    await batch.flushing;
    return;
  }
  if (batch.timer) {
    clearTimeout(batch.timer);
    batch.timer = null;
  }
  batch.flushing = (async () => {
    while (batch.events.length > 0) {
      const events = batch.events.splice(0, batch.events.length);
      await appendAcpSkillRunTranscriptEvents({
        runtimeDir,
        events,
      }).catch(() => undefined);
    }
  })();
  try {
    await batch.flushing;
  } finally {
    batch.flushing = null;
    if (batch.events.length === 0 && !batch.timer) {
      transcriptWriteBatches.delete(runtimeDir);
    }
  }
}

async function flushAcpSkillRunTranscriptWriteBatches() {
  const flushes = Array.from(transcriptWriteBatches.keys()).map((runtimeDir) =>
    flushAcpSkillRunTranscriptWriteBatch(runtimeDir),
  );
  if (flushes.length > 0) {
    await Promise.all(flushes);
  }
}

function hasLargeAcpSkillRunPayload(raw: Record<string, unknown>) {
  return (
    typeof raw.resultJson !== "undefined" ||
    typeof raw.requestPayload !== "undefined" ||
    typeof raw.runnerJson !== "undefined" ||
    !!normalizeString(raw.lastTurnOutput) ||
    (isRecord(raw.pendingInteraction) &&
      !!normalizeString(raw.pendingInteraction.candidateText))
  );
}

function shouldExternalizeRunContext(record: AcpSkillRunRecord) {
  return (
    !!normalizeString(record.runtimeDir) &&
    (typeof record.requestPayload !== "undefined" ||
      typeof record.runnerJson !== "undefined" ||
      typeof record.resultJson !== "undefined" ||
      (isRecord(record.providerOptions) &&
        Object.keys(record.providerOptions).length > 0))
  );
}

const ACP_SKILL_RUN_CONTEXT_UPDATE_KEYS = [
  "requestPayload",
  "providerOptions",
  "executionMode",
  "workspaceDir",
  "runtimeDir",
  "inputManifestPath",
  "resultJsonPath",
  "sharedSkillCatalogPath",
  "proxySkillRoots",
  "requestedSkillId",
  "requestedSkillProxyPath",
  "primarySkillDir",
  "runnerJson",
] as const;

function updateTouchesAcpSkillRunContext(
  update: Record<string, unknown>,
): boolean {
  return ACP_SKILL_RUN_CONTEXT_UPDATE_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(update, key),
  );
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function isTerminalAcpSkillRunStatus(
  status: AcpSkillRunStatus,
): status is "succeeded" | "failed" | "canceled" {
  return status === "succeeded" || status === "failed" || status === "canceled";
}

export function isActiveAcpSkillRunStatus(status: AcpSkillRunStatus) {
  return (
    status === "queued" ||
    status === "running" ||
    status === "waiting_user" ||
    status === "repairing" ||
    status === "failed_retriable"
  );
}

export function isRecoverableAcpSkillRunStatus(status: AcpSkillRunStatus) {
  return (
    status === "running" ||
    status === "waiting_user" ||
    status === "repairing" ||
    status === "failed_retriable"
  );
}

function isRecoverableAcpRecoveryState(state: AcpSkillRunRecoveryState) {
  return (
    state === "available" || state === "connecting" || state === "connected"
  );
}

function isLegacyRecoverableAcpRecoveryState(state: AcpSkillRunRecoveryState) {
  return isRecoverableAcpRecoveryState(state) || state === "failed";
}

export function isRecoverablePromptFailure(
  record: Pick<
    AcpSkillRunRecord,
    "sessionId" | "conversationRecoveryState" | "removedAt" | "archivedAt"
  >,
) {
  const recoveryState = record.conversationRecoveryState || "unavailable";
  return (
    !record.removedAt &&
    !record.archivedAt &&
    !!normalizeString(record.sessionId) &&
    isRecoverableAcpRecoveryState(recoveryState)
  );
}

function isActiveAcpSkillRunRecordForSummary(record: AcpSkillRunRecord) {
  return (
    !record.removedAt &&
    !record.archivedAt &&
    isActiveAcpSkillRunStatus(record.status)
  );
}

function syncAcpSkillRunActiveIndex(record: AcpSkillRunRecord) {
  if (isActiveAcpSkillRunRecordForSummary(record)) {
    activeRunRequestIds.add(record.requestId);
  } else {
    activeRunRequestIds.delete(record.requestId);
  }
}

function isVisibleAcpSkillRunRecordForPanel(record: AcpSkillRunRecord) {
  return !record.removedAt && !record.archivedAt;
}

function recentVisibleRunSortKey(record: AcpSkillRunRecord) {
  return [record.createdAt || "", record.requestId || ""].join("\u0000");
}

function removeRecentVisibleRunRequestId(requestId: string) {
  const index = recentVisibleRunRequestIds.indexOf(requestId);
  if (index >= 0) {
    recentVisibleRunRequestIds.splice(index, 1);
  }
  recentVisibleRunSortKeys.delete(requestId);
}

function insertRecentVisibleRunRequestId(requestId: string, sortKey: string) {
  removeRecentVisibleRunRequestId(requestId);
  let low = 0;
  let high = recentVisibleRunRequestIds.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const currentKey =
      recentVisibleRunSortKeys.get(recentVisibleRunRequestIds[mid]) || "";
    if (sortKey > currentKey) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  recentVisibleRunRequestIds.splice(low, 0, requestId);
  recentVisibleRunSortKeys.set(requestId, sortKey);
}

function syncAcpSkillRunRecentVisibleIndex(
  previous: AcpSkillRunRecord | undefined,
  next: AcpSkillRunRecord,
) {
  const previousVisible = previous
    ? isVisibleAcpSkillRunRecordForPanel(previous)
    : false;
  const nextVisible = isVisibleAcpSkillRunRecordForPanel(next);
  const previousKey = previous ? recentVisibleRunSortKey(previous) : "";
  const nextKey = recentVisibleRunSortKey(next);
  if (previousVisible && (!nextVisible || previousKey !== nextKey)) {
    removeRecentVisibleRunRequestId(next.requestId);
  }
  if (
    nextVisible &&
    (!previousVisible ||
      previousKey !== nextKey ||
      !recentVisibleRunSortKeys.has(next.requestId))
  ) {
    insertRecentVisibleRunRequestId(next.requestId, nextKey);
  }
}

function setAcpSkillRunRecord(record: AcpSkillRunRecord) {
  const previous = runRecords.get(record.requestId);
  const metadata = deriveAcpSkillRunRuntimeFileMetadata(record);
  const next = {
    ...record,
    requestPayload: undefined,
    runnerJson: undefined,
    resultJson: undefined,
    lastTurnOutput: undefined,
    lastTurnOutputPreview:
      record.lastTurnOutputPreview ||
      truncateAcpSkillRunPreview(record.lastTurnOutput),
    pendingInteraction: parsePendingInteraction(record.pendingInteraction),
    transcriptPath: metadata.transcriptPath || record.transcriptPath,
    transcriptIndexPath:
      metadata.transcriptIndexPath || record.transcriptIndexPath,
    transcriptRevision: metadata.transcriptRevision,
    transcriptEventSeq: metadata.transcriptEventSeq,
    transcriptItemCount: metadata.transcriptItemCount,
    transcriptPreview: metadata.transcriptPreview,
    outputRevisionsPath:
      metadata.outputRevisionsPath || record.outputRevisionsPath,
    outputRevisionCount: metadata.outputRevisionCount,
    outputRevisionPreview: metadata.outputRevisionPreview,
    runContextPath: metadata.runContextPath || record.runContextPath,
  };
  delete (next as Record<string, unknown>).transcriptItems;
  delete (next as Record<string, unknown>).outputRevisions;
  runRecords.set(record.requestId, next);
  syncAcpSkillRunActiveIndex(next);
  syncAcpSkillRunRecentVisibleIndex(previous, next);
  syncWaitingUserDetachTimer(next);
}

function clearWaitingUserDetachTimer(requestId: string) {
  const timer = waitingUserDetachTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    waitingUserDetachTimers.delete(requestId);
  }
}

function syncWaitingUserDetachTimer(record: AcpSkillRunRecord) {
  const requestId = record.requestId;
  if (record.status !== "waiting_user" || !controllers.has(requestId)) {
    clearWaitingUserDetachTimer(requestId);
    return;
  }
  if (waitingUserDetachTimers.has(requestId)) {
    return;
  }
  waitingUserDetachTimers.set(
    requestId,
    setTimeout(() => {
      waitingUserDetachTimers.delete(requestId);
      const current = runRecords.get(requestId);
      const controller = controllers.get(requestId);
      if (current?.status !== "waiting_user" || !controller?.disconnect) {
        return;
      }
      void controller.disconnect().catch(() => {
        registerAcpSkillRunController(requestId, null);
      });
    }, ACP_SKILL_RUN_WAITING_USER_LIVE_TTL_MS),
  );
}

function publishPendingAcpSkillRunTranscripts() {
  // The store-owned mirror is updated synchronously before transcript deltas
  // are emitted; JSONL writes remain asynchronous persistence only.
}

function cloneAcpSkillRunRecord(record: AcpSkillRunRecord) {
  return {
    ...record,
    transcriptItems: record.transcriptItems?.map((item) =>
      cloneAcpSkillRunTranscriptItem(item),
    ),
    pendingInteraction: record.pendingInteraction
      ? { ...record.pendingInteraction }
      : undefined,
    planEntries: record.planEntries?.map((item) => ({ ...item })),
    events: record.events.map((event) => ({ ...event })),
  };
}

function projectAcpSkillRunMetadataRecord(record: AcpSkillRunRecord) {
  const cloned = cloneAcpSkillRunRecord(record) as AcpSkillRunRecord &
    Record<string, unknown>;
  delete cloned.requestPayload;
  delete cloned.runnerJson;
  delete cloned.resultJson;
  delete cloned.lastTurnOutput;
  delete cloned.transcriptItems;
  delete cloned.outputRevisions;
  if (cloned.pendingInteraction) {
    cloned.pendingInteraction = parsePendingInteraction(
      cloned.pendingInteraction,
    );
  }
  return cloned as AcpSkillRunRecord;
}

function projectAcpSkillRunRecordForPanel(record: AcpSkillRunRecord) {
  return projectAcpSkillRunMetadataRecord(record);
}

function isSelectableAcpSkillRunRecord(record: AcpSkillRunRecord | undefined) {
  return !!record && !record.removedAt && !record.archivedAt;
}

function resolveAcpSkillRunPanelSelectedRecord(args: {
  requested?: string;
  runs: AcpSkillRunSummary[];
}) {
  const requestedRecord = args.requested
    ? runRecords.get(args.requested)
    : undefined;
  if (isSelectableAcpSkillRunRecord(requestedRecord)) {
    return requestedRecord;
  }
  const fallbackId = args.runs[0]?.requestId || "";
  return fallbackId ? runRecords.get(fallbackId) : undefined;
}

function materializeAcpSkillRunPanelSelectedRequestId(
  runs: AcpSkillRunSummary[],
) {
  const selected = resolveAcpSkillRunPanelSelectedRecord({
    requested: selectedRequestId,
    runs,
  });
  selectedRequestId = selected?.requestId || "";
  return selectedRequestId;
}

function deleteAcpSkillRunRecord(requestId: string) {
  const removed = runRecords.delete(requestId);
  transcriptLiveStates.delete(requestId);
  activeRunRequestIds.delete(requestId);
  removeRecentVisibleRunRequestId(requestId);
  clearWaitingUserDetachTimer(requestId);
  return removed;
}

function clearAcpSkillRunRecords() {
  runRecords.clear();
  transcriptLiveStates.clear();
  activeRunRequestIds.clear();
  recentVisibleRunRequestIds.length = 0;
  recentVisibleRunSortKeys.clear();
  for (const timer of waitingUserDetachTimers.values()) {
    clearTimeout(timer);
  }
  waitingUserDetachTimers.clear();
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
    normalized === "failed_retriable" ||
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
    candidateRef: normalizeString(value.candidateRef) || undefined,
    candidatePreview:
      normalizeString(value.candidatePreview) ||
      truncateAcpSkillRunPreview(value.candidateText) ||
      undefined,
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
  const state = getAcpSkillRunTranscriptLiveState(record);
  const previousId = state.permissionItemIds.get(permissionRequestId);
  const status =
    event.stage === "permission-resolved"
      ? permissionStatusFromResolution(details)
      : "pending";
  const itemId =
    previousId || nextTranscriptItemId(record, "permission", state);
  const item: AcpSkillRunTranscriptItem = {
    id: itemId,
    kind: "permission",
    permissionRequestId,
    status,
    title: normalizeString(details.toolTitle) || "Permission request",
    summary:
      normalizeString(details.summary) ||
      normalizeString(event.message) ||
      "ACP backend requests approval.",
    source: normalizeString(details.source) || undefined,
    createdAt: event.ts,
    updatedAt: event.ts,
  };
  state.permissionItemIds.set(permissionRequestId, itemId);
  queueTranscriptEvent(record, {
    op: "upsert_item",
    itemId,
    item,
    createdAt: event.ts,
    newItem: !previousId,
  });
  return true;
}

function appendStatusTranscriptItem(
  record: AcpSkillRunRecord,
  event: AcpSkillRunEvent,
) {
  const text = normalizeString(event.message);
  if (!text || !shouldShowEventInTranscript(event.stage)) {
    return false;
  }
  if (
    (event.stage === "permission-requested" ||
      event.stage === "permission-resolved") &&
    upsertPermissionTranscriptItem(record, event)
  ) {
    return true;
  }
  const state = getAcpSkillRunTranscriptLiveState(record);
  const last = state.lastStatus;
  if (last && last.label === event.stage && last.text === text) {
    queueTranscriptEvent(record, {
      op: "patch_item",
      itemId: last.id,
      patch: { updatedAt: event.ts },
      createdAt: event.ts,
    });
    return true;
  }
  const item: AcpSkillRunTranscriptItem = {
    id: nextTranscriptItemId(record, "status", state),
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
  state.lastStatus = {
    id: item.id,
    label: item.label,
    text: item.text,
  };
  queueTranscriptEvent(record, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: event.ts,
    newItem: true,
  });
  return true;
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

function parseAuditTrailState(
  value: unknown,
): AcpSkillRunAuditTrailState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const files = isRecord(value.files)
    ? Object.fromEntries(
        Object.entries(value.files)
          .map(([key, filePath]) => [key, normalizeString(filePath)])
          .filter((entry) => entry[1]),
      )
    : {};
  return {
    initialized: value.initialized === true,
    files,
    lastError: normalizeString(value.lastError) || undefined,
  };
}

function shouldMigrateLegacyFailedRunToRetriable(record: AcpSkillRunRecord) {
  const recoveryState = record.conversationRecoveryState || "unavailable";
  return (
    record.status === "failed" &&
    !record.removedAt &&
    !record.archivedAt &&
    !!normalizeString(record.sessionId) &&
    (record.conversationState === "closed" ||
      record.conversationState === "active" ||
      record.conversationState === "error") &&
    isLegacyRecoverableAcpRecoveryState(recoveryState)
  );
}

function migrateLegacyAcpSkillRunStatus(record: AcpSkillRunRecord) {
  if (!shouldMigrateLegacyFailedRunToRetriable(record)) {
    return record;
  }
  const event: AcpSkillRunEvent = {
    ts: nowIso(),
    stage: "legacy-status-migrated",
    message:
      "Legacy recoverable ACP failed run migrated to failed_retriable status.",
    level: "info",
    details: {
      previousStatus: "failed",
      nextStatus: "failed_retriable",
      conversationState: record.conversationState,
      conversationRecoveryState: record.conversationRecoveryState,
    },
  };
  return {
    ...record,
    status: "failed_retriable" as AcpSkillRunStatus,
    backendStatus:
      record.backendStatus === "failed"
        ? ("failed_retriable" as AcpSkillRunStatus)
        : record.backendStatus,
    updatedAt: event.ts,
    events: [...record.events, event].slice(-80),
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
  const parsed: AcpSkillRunRecord = {
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
    auditTrail: parseAuditTrailState(raw.auditTrail),
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
    lastTurnOutputPreview:
      normalizeString(raw.lastTurnOutputPreview) ||
      truncateAcpSkillRunPreview(raw.lastTurnOutput) ||
      undefined,
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
                    normalizeAcpPermissionOptionKind(option.kind) || undefined,
                }))
                .filter((option) => option.optionId)
            : [],
        } as AcpPendingPermissionRequest)
      : null,
    resultJson: raw.resultJson,
    outputRevisionsPath: normalizeString(raw.outputRevisionsPath) || undefined,
    outputRevisionCount: Math.max(
      0,
      Math.floor(Number(raw.outputRevisionCount || 0) || 0),
    ),
    outputRevisionPreview:
      normalizeString(raw.outputRevisionPreview) || undefined,
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
    transcriptPath: normalizeString(raw.transcriptPath) || undefined,
    transcriptIndexPath: normalizeString(raw.transcriptIndexPath) || undefined,
    transcriptRevision: Math.max(
      0,
      Math.floor(Number(raw.transcriptRevision || 0) || 0),
    ),
    transcriptEventSeq: Math.max(
      0,
      Math.floor(Number(raw.transcriptEventSeq || 0) || 0),
    ),
    transcriptItemCount: Math.max(
      0,
      Math.floor(Number(raw.transcriptItemCount || 0) || 0),
    ),
    transcriptPreview: normalizeString(raw.transcriptPreview) || undefined,
    runContextPath: normalizeString(raw.runContextPath) || undefined,
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
  return migrateLegacyAcpSkillRunStatus(parsed);
}

function ensureHydrated() {
  if (hydrated) {
    return;
  }
  hydrated = true;
  for (const row of listPluginRunStoreEntries("acp")) {
    try {
      const raw = JSON.parse(row.payload || "{}") as Record<string, unknown>;
      const legacyLargePayload = hasLargeAcpSkillRunPayload(raw);
      const parsed = parseRunRecord(raw);
      if (!parsed) {
        continue;
      }
      setAcpSkillRunRecord(parsed);
      if (legacyLargePayload) {
        persistRun(parsed);
      }
    } catch {
      continue;
    }
  }
}

function persistAcpSkillRunRuntimeFiles(
  record: AcpSkillRunRecord,
  options?: {
    writeRunContext?: boolean;
    writeResultJson?: boolean;
  },
) {
  const runtimeDir = normalizeString(record.runtimeDir);
  if (!runtimeDir) {
    return;
  }
  const writes: Array<Promise<unknown>> = [];
  if (options?.writeRunContext && shouldExternalizeRunContext(record)) {
    writes.push(
      writeAcpSkillRunContextPayload({
        runtimeDir,
        updatedAt: record.updatedAt,
        payload: {
          requestPayload: record.requestPayload,
          runnerJson: record.runnerJson,
          providerOptions: record.providerOptions,
          primarySkillDir: record.primarySkillDir,
          requestedSkillId: record.requestedSkillId || record.skillId,
          requestedSkillProxyPath: record.requestedSkillProxyPath,
          sharedSkillCatalogPath: record.sharedSkillCatalogPath,
          proxySkillRoots: record.proxySkillRoots,
          executionMode: record.executionMode,
          workspaceDir: record.workspaceDir,
          runtimeDir: record.runtimeDir,
          inputManifestPath: record.inputManifestPath,
          resultJsonPath: record.resultJsonPath,
        },
      }),
    );
  }
  if (options?.writeResultJson) {
    const resultJsonPath = normalizeString(record.resultJsonPath);
    if (resultJsonPath && typeof record.resultJson !== "undefined") {
      writes.push(
        writeRuntimeTextFile(resultJsonPath, JSON.stringify(record.resultJson)),
      );
    }
  }
  if (writes.length > 0) {
    const write = Promise.all(writes).catch(() => undefined);
    runtimeFileWrites.add(write);
    void write.finally(() => {
      runtimeFileWrites.delete(write);
    });
  }
}

export async function flushAcpSkillRunRuntimeFileWrites() {
  await flushAcpSkillRunTranscriptWriteBatches();
  while (runtimeFileWrites.size > 0) {
    await Promise.all(Array.from(runtimeFileWrites)).catch(() => undefined);
    await flushAcpSkillRunTranscriptWriteBatches();
  }
}

export async function flushAcpSkillRunRuntimeFileWritesForTests() {
  await flushAcpSkillRunRuntimeFileWrites();
}

async function flushAcpSkillRunRuntimeFileWritesDuringShutdown() {
  const result = await waitForAcpSkillRunShutdownTask(
    flushAcpSkillRunRuntimeFileWrites(),
    ACP_SKILL_RUN_SHUTDOWN_FLUSH_TIMEOUT_MS,
  );
  const flushError = "error" in result ? result.error : null;
  if (!result.timedOut && !flushError) {
    return;
  }
  appendRuntimeLog({
    level: "warn",
    scope: "system",
    component: "acp-skill-run-store",
    operation: "shutdown-runtime-file-flush",
    stage: result.timedOut
      ? "runtime-file-flush-timeout"
      : "runtime-file-flush-error",
    message: result.timedOut
      ? "ACP skill run runtime file flush timed out during shutdown."
      : "ACP skill run runtime file flush failed during shutdown.",
    details: {
      timeoutMs: result.timedOut
        ? ACP_SKILL_RUN_SHUTDOWN_FLUSH_TIMEOUT_MS
        : undefined,
      error: flushError ? errorText(flushError) : undefined,
    },
  });
}

function buildPersistedAcpSkillRunPayload(record: AcpSkillRunRecord) {
  const metadata = deriveAcpSkillRunRuntimeFileMetadata(record);
  const externalizeRunContext = shouldExternalizeRunContext(record);
  const externalizeLastTurnOutput = !!normalizeString(record.lastTurnOutput);
  const pendingInteraction = parsePendingInteraction(record.pendingInteraction);
  const persisted = sanitizeAcpSkillRunPersistedValue({
    ...record,
    transcriptPath: metadata.transcriptPath || record.transcriptPath,
    transcriptIndexPath:
      metadata.transcriptIndexPath || record.transcriptIndexPath,
    transcriptRevision: metadata.transcriptRevision,
    transcriptEventSeq: metadata.transcriptEventSeq,
    transcriptItemCount: metadata.transcriptItemCount,
    transcriptPreview: metadata.transcriptPreview,
    outputRevisionsPath:
      metadata.outputRevisionsPath || record.outputRevisionsPath,
    outputRevisionCount: metadata.outputRevisionCount,
    outputRevisionPreview: metadata.outputRevisionPreview,
    runContextPath: metadata.runContextPath || record.runContextPath,
    lastTurnOutputPreview:
      record.lastTurnOutputPreview ||
      truncateAcpSkillRunPreview(record.lastTurnOutput),
    pendingInteraction,
  }) as Record<string, unknown>;
  delete persisted.transcriptItems;
  delete persisted.outputRevisions;
  if (externalizeRunContext) {
    delete persisted.requestPayload;
    delete persisted.runnerJson;
    delete persisted.resultJson;
  }
  if (externalizeLastTurnOutput) {
    delete persisted.lastTurnOutput;
  }
  return persisted;
}

function persistRun(
  record: AcpSkillRunRecord,
  options?: {
    writeRunContext?: boolean;
    writeResultJson?: boolean;
  },
) {
  if (normalizeString(record.backendType) !== ACP_BACKEND_TYPE) {
    return;
  }
  persistAcpSkillRunRuntimeFiles(record, options);
  upsertPluginRunStoreEntry("acp", {
    runKey: record.requestId,
    requestId: record.requestId,
    backendId: record.backendId,
    state: record.status,
    updatedAt: record.updatedAt,
    payload: JSON.stringify(buildPersistedAcpSkillRunPayload(record)),
  });
  const latestEvent = record.events[record.events.length - 1];
  if (latestEvent) {
    const persistedEvent = sanitizeAcpSkillRunPersistedValue(
      latestEvent,
    ) as AcpSkillRunEvent;
    appendPluginRunEventStoreEntry("acp", {
      eventId: `${record.requestId}:${latestEvent.ts}:${record.events.length}:${latestEvent.stage}`,
      runKey: record.requestId,
      requestId: record.requestId,
      backendId: record.backendId,
      type: latestEvent.stage,
      createdAt: latestEvent.ts || record.updatedAt,
      payload: JSON.stringify(persistedEvent),
    });
  }
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
    const removed = removeWorkflowTasksByBackendAndRequestIds({
      backendId: task.backendId || run?.backendId || "",
      requestIds: [requestId],
    });
    removedCount += removed;
    if (!run || run.removedAt || run.archivedAt) {
      continue;
    }
    if (isTerminalAcpSkillRunStatus(run.status)) {
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
      recoverableCount += 1;
      continue;
    }
    upsertAcpSkillRun({
      requestId,
      status: "failed",
      statusReason: "startup_reconcile",
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

const ACP_SKILL_RUN_SNAPSHOT_CHANGE_KINDS =
  new Set<AcpSkillRunSnapshotChangeKind>([
    "run",
    "transcript",
    "runtime-options",
    "selection",
    "archive",
    "global",
  ]);

function normalizeAcpSkillRunSnapshotChange(
  change?: AcpSkillRunSnapshotChange | null,
): AcpSkillRunSnapshotChange {
  if (!change) {
    return { global: true, kinds: ["global"] };
  }
  const requestIds = Array.from(
    new Set(
      (Array.isArray(change.requestIds) ? change.requestIds : [])
        .map((requestId) => normalizeString(requestId))
        .filter(Boolean),
    ),
  );
  const kinds = Array.from(
    new Set(
      (Array.isArray(change.kinds) ? change.kinds : []).filter(
        (kind): kind is AcpSkillRunSnapshotChangeKind =>
          ACP_SKILL_RUN_SNAPSHOT_CHANGE_KINDS.has(kind),
      ),
    ),
  );
  const global = change.global === true || kinds.includes("global");
  if (global) {
    return { global: true, kinds: Array.from(new Set([...kinds, "global"])) };
  }
  if (requestIds.length === 0 && kinds.length === 0) {
    return { global: true, kinds: ["global"] };
  }
  return {
    requestIds: requestIds.length > 0 ? requestIds : undefined,
    kinds: kinds.length > 0 ? kinds : undefined,
  };
}

function mergeAcpSkillRunSnapshotChanges(
  current: AcpSkillRunSnapshotChange | null,
  next?: AcpSkillRunSnapshotChange | null,
): AcpSkillRunSnapshotChange {
  const normalizedCurrent = current
    ? normalizeAcpSkillRunSnapshotChange(current)
    : null;
  const normalizedNext = normalizeAcpSkillRunSnapshotChange(next);
  if (!normalizedCurrent) {
    return normalizedNext;
  }
  if (normalizedCurrent.global || normalizedNext.global) {
    return {
      global: true,
      kinds: Array.from(
        new Set([
          ...(normalizedCurrent.kinds || []),
          ...(normalizedNext.kinds || []),
          "global",
        ]),
      ),
    };
  }
  return {
    requestIds: Array.from(
      new Set([
        ...(normalizedCurrent.requestIds || []),
        ...(normalizedNext.requestIds || []),
      ]),
    ),
    kinds: Array.from(
      new Set([
        ...(normalizedCurrent.kinds || []),
        ...(normalizedNext.kinds || []),
      ]),
    ),
  };
}

function acpSkillRunSnapshotChange(
  requestId: string,
  kinds: AcpSkillRunSnapshotChangeKind[],
): AcpSkillRunSnapshotChange {
  const normalizedRequestId = normalizeString(requestId);
  return {
    requestIds: normalizedRequestId ? [normalizedRequestId] : undefined,
    kinds,
  };
}

function emitChanged(change?: AcpSkillRunSnapshotChange) {
  if (changedEmitTimer) {
    clearTimeout(changedEmitTimer);
    changedEmitTimer = null;
  }
  const emittedChange = pendingChangedEmit
    ? change
      ? mergeAcpSkillRunSnapshotChanges(pendingChangedEmit, change)
      : normalizeAcpSkillRunSnapshotChange(pendingChangedEmit)
    : normalizeAcpSkillRunSnapshotChange(change);
  pendingChangedEmit = null;
  for (const listener of listeners) {
    listener(emittedChange);
  }
}

function scheduleChangedEmit(change?: AcpSkillRunSnapshotChange) {
  pendingChangedEmit = mergeAcpSkillRunSnapshotChanges(
    pendingChangedEmit,
    change,
  );
  if (changedEmitTimer) {
    return;
  }
  changedEmitTimer = setTimeout(() => {
    changedEmitTimer = null;
    if (canPublishAssistantWorkspaceLiveUpdates()) {
      publishPendingAcpSkillRunTranscripts();
    }
    emitChanged(pendingChangedEmit || undefined);
  }, ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS);
}

function isAllowedNonTerminalAcpSkillRunTransition(args: {
  current: AcpSkillRunStatus;
  next: AcpSkillRunStatus;
  reason: AcpSkillRunStatusTransitionReason;
}) {
  const { current, next, reason } = args;
  if (current === next) {
    return true;
  }
  if (reason === "cancel_task") {
    return next === "canceled";
  }
  if (reason === "interrupt_turn") {
    return next === "waiting_user";
  }
  if (reason === "prompt_failed_retriable") {
    return next === "failed_retriable";
  }
  if (reason === "prompt_failed_terminal") {
    return next === "failed";
  }
  if (current === "queued") {
    return next === "running" || next === "failed" || next === "canceled";
  }
  if (current === "failed_retriable") {
    return (
      next === "running" ||
      next === "waiting_user" ||
      next === "repairing" ||
      next === "failed" ||
      next === "canceled"
    );
  }
  if (
    current === "running" ||
    current === "waiting_user" ||
    current === "repairing"
  ) {
    return (
      next === "running" ||
      next === "waiting_user" ||
      next === "repairing" ||
      next === "failed_retriable" ||
      next === "succeeded" ||
      next === "failed" ||
      next === "canceled"
    );
  }
  return false;
}

function resolveAcpSkillRunStatusTransition(args: {
  requestId: string;
  current?: AcpSkillRunStatus;
  next: AcpSkillRunStatus;
  reason?: AcpSkillRunStatusTransitionReason;
}) {
  const { current, next, reason } = args;
  if (!current || current === next) {
    return next;
  }
  if (isTerminalAcpSkillRunStatus(current)) {
    throw new Error(
      `Illegal ACP skill run status transition for ${args.requestId}: terminal ${current} cannot transition to ${next}.`,
    );
  }
  if (!reason) {
    return next;
  }
  if (isAllowedNonTerminalAcpSkillRunTransition({ current, next, reason })) {
    return next;
  }
  throw new Error(
    `Illegal ACP skill run status transition for ${args.requestId}: ${current} -> ${next} (${reason}).`,
  );
}

export function upsertAcpSkillRun(update: {
  requestId: string;
  status?: AcpSkillRunStatus;
  statusReason?: AcpSkillRunStatusTransitionReason;
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
  auditTrail?: AcpSkillRunAuditTrailState;
  repairRounds?: number;
  validationStatus?: AcpSkillRunRecord["validationStatus"];
  validationErrors?: string[];
  outputConvergenceState?: AcpSkillRunRecord["outputConvergenceState"];
  lastTurnOutput?: string;
  pendingInteraction?: AcpSkillRunPendingInteractionUpdate | null;
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
  if (update.status) {
    next.status = resolveAcpSkillRunStatusTransition({
      requestId,
      current: existing?.status,
      next: update.status,
      reason: update.statusReason,
    });
  }
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
  if (update.auditTrail) {
    next.auditTrail = {
      initialized: update.auditTrail.initialized === true,
      files: { ...update.auditTrail.files },
      lastError: normalizeString(update.auditTrail.lastError) || undefined,
    };
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
    next.pendingInteraction = parsePendingInteraction(
      update.pendingInteraction,
    );
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
  pruneInactiveAcpSkillRunTranscriptMirrors();
  persistRun(next, {
    writeRunContext: updateTouchesAcpSkillRunContext(
      update as Record<string, unknown>,
    ),
    writeResultJson: Object.prototype.hasOwnProperty.call(update, "resultJson"),
  });
  emitChanged(
    acpSkillRunSnapshotChange(requestId, [
      "run",
      ...(update.event ? (["transcript"] as const) : []),
    ]),
  );
  return projectAcpSkillRunMetadataRecord(next);
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
  const state = getAcpSkillRunTranscriptLiveState(existing);
  const item: AcpSkillRunTranscriptItem = {
    id: nextTranscriptItemId(existing, "message", state),
    kind: "message",
    role: "user",
    text: message,
    state: "complete",
    createdAt: now,
  };
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: now,
  };
  state.lastTextItem = {
    id: item.id,
    kind: "message",
    role: "user",
    state: "complete",
  };
  queueTranscriptEvent(next, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: now,
    newItem: true,
  });
  setAcpSkillRunRecord(next);
  persistRun(next);
  scheduleChangedEmit(acpSkillRunSnapshotChange(requestId, ["transcript"]));
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
  const state = getAcpSkillRunTranscriptLiveState(args.record);
  const existingId = state.lastAssistantMessageId;
  if (existingId) {
    queueTranscriptEvent(args.record, {
      op: "patch_item",
      itemId: existingId,
      patch: {
        text,
        state: "complete",
        revision: args.revision,
        updatedAt: args.now,
      } as Partial<AcpSkillRunTranscriptItem>,
      createdAt: args.now,
      textPreview: text,
    });
    state.lastTextItem = {
      id: existingId,
      kind: "message",
      role: "assistant",
      state: "complete",
    };
    return;
  }
  const item: AcpSkillRunTranscriptItem = {
    id: nextTranscriptItemId(args.record, "message", state),
    kind: "message",
    role: "assistant",
    text,
    state: "complete",
    revision: args.revision,
    createdAt: args.now,
  };
  state.lastAssistantMessageId = item.id;
  state.lastTextItem = {
    id: item.id,
    kind: "message",
    role: "assistant",
    state: "complete",
  };
  queueTranscriptEvent(args.record, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: args.now,
    newItem: true,
  });
}

function removeLatestAssistantCandidateMessage(
  record: AcpSkillRunRecord,
  candidateText: string,
) {
  const normalizedCandidate = String(candidateText || "").trim();
  if (!normalizedCandidate) {
    return;
  }
  const state = getAcpSkillRunTranscriptLiveState(record);
  const latestAssistantId = state.lastAssistantMessageId;
  if (!latestAssistantId) {
    return;
  }
  queueTranscriptEvent(record, {
    op: "delete_item",
    itemId: latestAssistantId,
    createdAt: nowIso(),
  });
  state.lastAssistantMessageId = undefined;
  state.lastTextItem = undefined;
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
  const count = Math.max(0, args.record.outputRevisionCount || 0);
  const revision: AcpSkillRunOutputRevision = {
    id: `revision-${count + 1}`,
    candidateText: normalizeString(args.candidateText),
    repairRound: Math.max(0, Math.floor(Number(args.repairRound || 0) || 0)),
    status: args.status,
    errors: Array.isArray(args.errors) ? [...args.errors] : [],
    replacementReason: normalizeString(args.replacementReason) || undefined,
    createdAt: args.now,
  };
  const refs = resolveAcpSkillRunPayloadPaths(args.record.runtimeDir);
  args.record.outputRevisionsPath =
    refs.outputRevisionsPath || args.record.outputRevisionsPath;
  args.record.outputRevisionCount = count + 1;
  args.record.outputRevisionPreview = truncateAcpSkillRunPreview(
    revision.candidateText,
  );
  const write = appendAcpSkillRunOutputRevision({
    runtimeDir: args.record.runtimeDir,
    revision,
    seq: count + 1,
  }).catch(() => undefined);
  runtimeFileWrites.add(write);
  void write.finally(() => runtimeFileWrites.delete(write));
  return {
    count: count + 1,
    latestStatus: args.status,
    latestRepairRound: revision.repairRound,
  } satisfies AcpSkillRunMessageRevisionSummary;
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
  emitChanged(acpSkillRunSnapshotChange(requestId, ["run", "transcript"]));
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
  emitChanged(acpSkillRunSnapshotChange(requestId, ["run", "transcript"]));
}

function completeOpenStreamingTextItems(
  record: AcpSkillRunRecord,
  now: string,
) {
  const state = getAcpSkillRunTranscriptLiveState(record);
  const item = state.lastTextItem;
  if (!item || item.state !== "streaming") {
    return false;
  }
  queueTranscriptEvent(record, {
    op: "patch_item",
    itemId: item.id,
    patch: {
      state: "complete",
      updatedAt: now,
    } as Partial<AcpSkillRunTranscriptItem>,
    createdAt: now,
  });
  state.lastTextItem = { ...item, state: "complete" };
  return true;
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
  const state = getAcpSkillRunTranscriptLiveState(args.record);
  const latest = state.lastTextItem;
  if (
    latest &&
    latest.kind === args.kind &&
    latest.role === role &&
    latest.state === "streaming"
  ) {
    queueTranscriptEvent(args.record, {
      op: "append_text",
      itemId: latest.id,
      text,
      createdAt: args.now,
      textPreview: text,
    });
    return;
  }
  completeOpenStreamingTextItems(args.record, args.now);
  const id = nextTranscriptItemId(args.record, args.kind, state);
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
  if (args.kind === "message" && role === "assistant") {
    state.lastAssistantMessageId = id;
  }
  state.lastTextItem = {
    id,
    kind: args.kind,
    role,
    state: "streaming",
  };
  queueTranscriptEvent(args.record, {
    op: "upsert_item",
    itemId: id,
    item,
    createdAt: args.now,
    newItem: true,
  });
}

function extractToolName(update: AcpToolCall) {
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
  const liveState = getAcpSkillRunTranscriptLiveState(record);
  const toolCallId =
    normalizeString(update.toolCallId) ||
    normalizeString(update.title) ||
    `tool-${liveState.itemCount + 1}`;
  const existingId = liveState.toolItemIds.get(toolCallId);
  const existing = liveState.toolItems.get(toolCallId);
  const nextState = inferToolCallState(update);
  const title = firstToolText([update.title]) || existing?.title;
  const toolKind = firstToolText([update.kind]) || existing?.toolKind;
  const toolName = extractToolName(update) || existing?.toolName;
  const inputSummary =
    extractToolInputSummary(update) || existing?.inputSummary;
  const summary = firstToolText([update.summary]) || existing?.summary;
  const next: AcpSkillRunTranscriptItem = {
    id: existingId || nextTranscriptItemId(record, "tool", liveState),
    kind: "tool_call",
    toolCallId,
    title: title || undefined,
    state: nextState,
    toolKind: toolKind || undefined,
    toolName: toolName || undefined,
    inputSummary: inputSummary || undefined,
    resultSummary: extractToolResultSummary(update) || undefined,
    summary: summary || undefined,
    createdAt: now,
    updatedAt: now,
  };
  liveState.toolItemIds.set(toolCallId, next.id);
  liveState.toolItems.set(toolCallId, {
    id: next.id,
    title: next.title,
    toolKind: next.toolKind,
    toolName: next.toolName,
    inputSummary: next.inputSummary,
    summary: next.summary,
  });
  queueTranscriptEvent(record, {
    op: "upsert_item",
    itemId: next.id,
    item: next,
    createdAt: now,
    newItem: !existingId,
  });
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
  if (isTextChunkUpdate) {
    if (!canPublishAssistantWorkspaceLiveUpdates()) {
      persistRun(next);
      return;
    }
    persistRun(next);
    emitChanged(acpSkillRunSnapshotChange(requestId, ["transcript"]));
    return;
  }
  if (kind === "tool_call" || kind === "tool_call_update" || kind === "plan") {
    persistRun(next);
    emitChanged(acpSkillRunSnapshotChange(requestId, ["transcript"]));
    return;
  }
  persistRun(next);
  if (kind === "usage_update") {
    if (canPublishAssistantWorkspaceLiveUpdates()) {
      scheduleChangedEmit(
        acpSkillRunSnapshotChange(requestId, ["runtime-options"]),
      );
    }
    return;
  }
  scheduleChangedEmit(acpSkillRunSnapshotChange(requestId, ["run"]));
}

export function completeAcpSkillRunTranscriptTurnBoundary(
  runRequestIdRaw: string,
) {
  ensureHydrated();
  const requestId = normalizeString(runRequestIdRaw);
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
  };
  if (!completeOpenStreamingTextItems(next, now)) {
    return;
  }
  setAcpSkillRunRecord(next);
  persistRun(next);
  emitChanged(acpSkillRunSnapshotChange(requestId, ["transcript"]));
}

export function appendAcpSkillRunHardTimeoutTranscriptNotice(args: {
  requestId: string;
  hardTimeoutSeconds: number;
  hardTimeoutSource?: string;
  recovered?: boolean;
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
  const text = getStringOrFallback(
    "task-dashboard-acp-hard-timeout-disconnected" as any,
    `Local ACP connection disconnected because the Job Timeout (${args.hardTimeoutSeconds} sec) was reached. Reconnect to continue from the remote session.`,
    {
      args: {
        seconds: args.hardTimeoutSeconds,
      },
    },
  );
  const state = getAcpSkillRunTranscriptLiveState(existing);
  const last = state.lastStatus;
  if (last && last.label === "hard-timeout-disconnect" && last.text === text) {
    return;
  }
  const item: AcpSkillRunTranscriptItem = {
    id: nextTranscriptItemId(existing, "status", state),
    kind: "status",
    level: "warn",
    label: "hard-timeout-disconnect",
    text,
    details: {
      hardTimeoutSeconds: args.hardTimeoutSeconds,
      hardTimeoutSource: normalizeString(args.hardTimeoutSource) || undefined,
      recovered: args.recovered === true,
    },
    createdAt: now,
  };
  const next: AcpSkillRunRecord = {
    ...existing,
    updatedAt: now,
  };
  state.lastStatus = {
    id: item.id,
    label: item.label,
    text: item.text,
  };
  queueTranscriptEvent(next, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: now,
    newItem: true,
  });
  setAcpSkillRunRecord(next);
  persistRun(next);
  emitChanged(acpSkillRunSnapshotChange(requestId, ["transcript"]));
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
    clearWaitingUserDetachTimer(requestId);
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
  const record = runRecords.get(requestId);
  if (record) {
    syncWaitingUserDetachTimer(record);
  }
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
    scheduleChangedEmit(
      acpSkillRunSnapshotChange(requestId, ["runtime-options"]),
    );
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
  scheduleChangedEmit(
    acpSkillRunSnapshotChange(requestId, ["runtime-options"]),
  );
}

type AcpSkillRunPermissionRequestWithResolver = AcpPendingPermissionRequest & {
  resolve: (outcome: RequestPermissionOutcome) => void;
};

function normalizeAcpSkillRunPermissionRequestDetails(
  request: AcpSkillRunPermissionRequestWithResolver,
  permissionRequestId: string,
) {
  return {
    permissionRequestId,
    toolCallId: normalizeString(request.toolCallId),
    toolTitle: normalizeString(request.toolTitle),
    source: normalizeString(request.source) || undefined,
    summary:
      normalizeString(request.summary) || normalizeString(request.toolTitle),
  };
}

function normalizeAcpSkillRunPendingPermission(
  request: AcpSkillRunPermissionRequestWithResolver,
  permissionRequestId: string,
) {
  return {
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
  };
}

function acpSkillRunPermissionRequestedMessage(
  request: AcpSkillRunPermissionRequestWithResolver,
  permissionRequestId: string,
) {
  return `Permission requested: ${normalizeString(request.toolTitle) || permissionRequestId}`;
}

export function setAcpSkillRunPermissionRequest(
  runRequestIdRaw: string,
  request: AcpSkillRunPermissionRequestWithResolver,
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
    statusReason: "start",
    pendingPermission: normalizeAcpSkillRunPendingPermission(
      request,
      permissionRequestId,
    ),
    event: {
      stage: "permission-requested",
      message: acpSkillRunPermissionRequestedMessage(
        request,
        permissionRequestId,
      ),
      level: "warn",
      details: normalizeAcpSkillRunPermissionRequestDetails(
        request,
        permissionRequestId,
      ),
    },
  });
}

export function autoApproveAcpSkillRunPermissionRequest(args: {
  runRequestId: string;
  request: AcpSkillRunPermissionRequestWithResolver;
  optionId: string;
}) {
  const runRequestId = normalizeString(args.runRequestId);
  const permissionRequestId = normalizeString(args.request.requestId);
  const optionId = normalizeString(args.optionId);
  if (!runRequestId || !permissionRequestId || !optionId) {
    return false;
  }
  const details = normalizeAcpSkillRunPermissionRequestDetails(
    args.request,
    permissionRequestId,
  );
  args.request.resolve({
    outcome: "selected",
    optionId,
  });
  upsertAcpSkillRun({
    requestId: runRequestId,
    status: "running",
    statusReason: "start",
    pendingPermission: null,
    event: {
      stage: "permission-requested",
      message: acpSkillRunPermissionRequestedMessage(
        args.request,
        permissionRequestId,
      ),
      level: "info",
      details,
    },
  });
  upsertAcpSkillRun({
    requestId: runRequestId,
    status: "running",
    statusReason: "start",
    pendingPermission: null,
    event: {
      stage: "permission-resolved",
      message: `Permission option selected: ${optionId}`,
      level: "info",
      details: {
        ...details,
        outcome: "selected",
        optionId,
      },
    },
  });
  return true;
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
    "running",
    "repairing",
  ]).has(stale.record.status)
    ? "waiting_user"
    : stale.record.status;
  upsertAcpSkillRun({
    requestId: stale.record.requestId,
    status: recoverableStatus,
    statusReason:
      recoverableStatus === stale.record.status ? undefined : "waiting_user",
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
    if (isTerminalAcpSkillRunStatus(existing.status)) {
      return;
    }
    upsertAcpSkillRun({
      requestId,
      status: "canceled",
      statusReason: "cancel_task",
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
  const afterCancel = getAcpSkillRunRecord(requestId);
  if (afterCancel && isTerminalAcpSkillRunStatus(afterCancel.status)) {
    return;
  }
  upsertAcpSkillRun({
    requestId,
    status: "canceled",
    statusReason: "cancel_task",
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
  const existing = getAcpSkillRunRecord(requestId);
  if (existing && isTerminalAcpSkillRunStatus(existing.status)) {
    throw new Error("Terminal ACP skill runs cannot be interrupted.");
  }
  if (existing && !isAcpSkillRunPromptActive(existing)) {
    upsertAcpSkillRun({
      requestId,
      event: {
        stage: "interrupt-ignored",
        message:
          "ACP skill run current turn interruption ignored because no active prompt turn exists.",
        level: "warn",
        details: {
          activePrompt: existing.activePrompt === true,
          replyState: existing.replyState,
          conversationRecoveryState: existing.conversationRecoveryState,
        },
      },
    });
    return;
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
    statusReason: "interrupt_turn",
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
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for reply.");
  }
  if (isTerminalAcpSkillRunStatus(existing.status)) {
    throw new Error("Terminal ACP skill runs cannot accept replies.");
  }
  if (
    existing.status !== "waiting_user" &&
    existing.status !== "failed_retriable"
  ) {
    throw new Error(
      "ACP skill run replies are only accepted for waiting or recoverable failed runs.",
    );
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
  await hydrateAcpSkillRunTranscriptMirror(requestId);
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
    const recovered = getAcpSkillRunRecord(requestId);
    if (
      !controllers.has(requestId) &&
      recovered?.conversationState === "closed" &&
      recovered?.conversationRecoveryState === "available"
    ) {
      upsertAcpSkillRun({
        requestId,
        connectionActionState: "idle",
      });
      return;
    }
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
  let disconnectError: unknown = null;
  upsertAcpSkillRun({
    requestId,
    connectionActionState: "disconnecting",
    event: {
      stage: "disconnect-requested",
      message: "ACP skill run local connection detach requested.",
      level: "info",
    },
  });
  try {
    if (controller?.disconnect) {
      await controller.disconnect();
    }
  } catch (error) {
    disconnectError = error;
  } finally {
    const currentController = controllers.get(requestId);
    if (controller) {
      if (currentController === controller) {
        registerAcpSkillRunController(requestId, null);
      }
    } else if (!currentController) {
      registerAcpSkillRunController(requestId, null);
    }
  }
  const disconnectErrorMessage = normalizeString(
    disconnectError instanceof Error
      ? disconnectError.message
      : disconnectError,
  );
  upsertAcpSkillRun({
    requestId,
    activePrompt: false,
    connectionActionState: "idle",
    conversationState: "closed",
    conversationRecoveryState: "available",
    event: {
      stage: disconnectError ? "disconnect-detach-error" : "disconnected",
      message: disconnectError
        ? "ACP skill run local controller detach did not complete cleanly; remote session remains recoverable."
        : "ACP skill run local connection detached; remote session remains recoverable.",
      level: disconnectError ? "warn" : "info",
      details: disconnectError
        ? {
            error: disconnectErrorMessage || "unknown error",
          }
        : undefined,
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

function applyResultTerminalRecoveryState(state: "succeeded" | "failed") {
  return state === "failed" ? "unavailable" : "available";
}

function finalizeAcpSkillRunApplyResultControllerDetach(args: {
  requestId: string;
  state: "succeeded" | "failed";
  stage: "apply-result-detached" | "apply-result-detach-error";
  level: "info" | "warn";
  error?: unknown;
}) {
  const errorMessage = normalizeString(
    args.error instanceof Error ? args.error.message : args.error,
  );
  upsertAcpSkillRun({
    requestId: args.requestId,
    activePrompt: false,
    conversationState: "closed",
    conversationRecoveryState: applyResultTerminalRecoveryState(args.state),
    connectionActionState: "idle",
    event: {
      stage: args.stage,
      message:
        args.stage === "apply-result-detach-error"
          ? "ACP skill run controller detach after workflow apply did not complete cleanly."
          : "ACP skill run controller detached after workflow apply settled.",
      level: args.level,
      details: errorMessage ? { error: errorMessage } : undefined,
    },
  });
}

function detachAcpSkillRunControllerAfterApplyResult(args: {
  requestId: string;
  state: "pending" | "succeeded" | "failed";
}) {
  if (args.state === "pending") {
    return;
  }
  const terminalState: "succeeded" | "failed" = args.state;
  const controller = controllers.get(args.requestId);
  registerAcpSkillRunController(args.requestId, null);
  if (!controller?.disconnect) {
    finalizeAcpSkillRunApplyResultControllerDetach({
      requestId: args.requestId,
      state: terminalState,
      stage: "apply-result-detached",
      level: "info",
    });
    return;
  }
  void controller.disconnect().then(
    () => {
      finalizeAcpSkillRunApplyResultControllerDetach({
        requestId: args.requestId,
        state: terminalState,
        stage: "apply-result-detached",
        level: "info",
      });
    },
    (error) => {
      finalizeAcpSkillRunApplyResultControllerDetach({
        requestId: args.requestId,
        state: terminalState,
        stage: "apply-result-detach-error",
        level: "warn",
        error,
      });
    },
  );
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
  const terminal = isTerminalAcpSkillRunStatus(existing.status);
  const nextStatus = terminal
    ? undefined
    : args.state === "failed"
      ? "failed"
      : args.state === "succeeded"
        ? "succeeded"
        : undefined;
  upsertAcpSkillRun({
    requestId,
    status: nextStatus,
    statusReason:
      nextStatus === "failed"
        ? "apply_failed"
        : nextStatus === "succeeded"
          ? "apply_succeeded"
          : undefined,
    backendStatus,
    applyResultState: args.state,
    appliedAt: args.state === "succeeded" ? nowIso() : undefined,
    error: args.state === "failed" ? normalizeString(args.error) : undefined,
    activePrompt: args.state === "pending" ? undefined : false,
    conversationState: args.state === "pending" ? undefined : "closed",
    conversationRecoveryState:
      args.state === "pending"
        ? undefined
        : applyResultTerminalRecoveryState(args.state),
    connectionActionState: args.state === "pending" ? undefined : "idle",
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
  detachAcpSkillRunControllerAfterApplyResult({
    requestId,
    state: args.state,
  });
}

export async function selectAcpSkillRun(requestIdRaw: string) {
  ensureHydrated();
  selectedRequestId = normalizeString(requestIdRaw);
  if (selectedRequestId) {
    scheduleAcpSkillRunTranscriptHydrate(selectedRequestId);
  }
  pruneInactiveAcpSkillRunTranscriptMirrors();
  emitChanged(
    selectedRequestId
      ? acpSkillRunSnapshotChange(selectedRequestId, ["selection"])
      : { kinds: ["selection"] },
  );
}

export function getSelectedAcpSkillRunRequestId() {
  ensureHydrated();
  return selectedRequestId;
}

export function listAcpSkillRuns() {
  ensureHydrated();
  return Array.from(runRecords.values())
    .map((entry) => projectAcpSkillRunRecordForPanel(entry))
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

function listAcpSkillRunPanelRecentSummaries(args: { limit: number }) {
  ensureHydrated();
  acpSkillRunSummaryDiagnostics.summaryQueryCount += 1;
  acpSkillRunSummaryDiagnostics.recentIndexScanCount += 1;
  const limit = normalizeSummaryListLimit(args.limit);
  const requestIds = limit
    ? recentVisibleRunRequestIds.slice(0, limit)
    : [...recentVisibleRunRequestIds];
  const rows: AcpSkillRunSummary[] = [];
  for (const requestId of requestIds) {
    const run = runRecords.get(requestId);
    if (!run || !isVisibleAcpSkillRunRecordForPanel(run)) {
      continue;
    }
    acpSkillRunSummaryDiagnostics.runCandidateReadCount += 1;
    rows.push(summarizeAcpSkillRun(run));
  }
  return rows;
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

export function getAcpSkillRunTranscriptMirrorDiagnosticsForTests(
  requestIdRaw: string,
) {
  ensureHydrated();
  const requestId = normalizeString(requestIdRaw);
  const state = requestId ? transcriptLiveStates.get(requestId) : undefined;
  if (!state) {
    return {
      mirrorLoaded: false,
      itemCount: 0,
      eventSeq: 0,
      needsHydrate: false,
      hydrateState: undefined,
    };
  }
  return {
    mirrorLoaded: state.mirrorLoaded,
    itemCount: state.itemIds.length,
    eventSeq: state.eventSeq,
    needsHydrate: state.needsHydrate === true,
    hydrateState: state.hydrateState,
  };
}

export function resetAcpSkillRunSummaryDiagnosticsForTests() {
  acpSkillRunSummaryDiagnostics.summaryQueryCount = 0;
  acpSkillRunSummaryDiagnostics.fullRunRecordScanCount = 0;
  acpSkillRunSummaryDiagnostics.activeIndexScanCount = 0;
  acpSkillRunSummaryDiagnostics.recentIndexScanCount = 0;
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
      runtimeDirs: [],
    };
  }
  const nowMs = Math.max(0, Number(args.nowMs || 0) || 0) || Date.now();
  const thresholdMs = nowMs - retentionMs;
  const requestIds: string[] = [];
  const workspaceDirs: string[] = [];
  const runtimeDirs: string[] = [];
  for (const record of Array.from(runRecords.values())) {
    if (!isAcpSkillRunRetentionEligible({ record, thresholdMs })) {
      continue;
    }
    requestIds.push(record.requestId);
    const workspaceDir = normalizeString(record.workspaceDir);
    if (workspaceDir) {
      workspaceDirs.push(workspaceDir);
    }
    const runtimeDir = normalizeString(record.runtimeDir);
    if (runtimeDir) {
      runtimeDirs.push(runtimeDir);
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
    emitChanged({ requestIds, kinds: ["archive"] });
  }
  return {
    rowsDeleted: requestIds.length,
    requestIds,
    workspaceDirs: Array.from(new Set(workspaceDirs)),
    runtimeDirs: Array.from(new Set(runtimeDirs)),
  };
}

export function getAcpSkillRunRecord(requestIdRaw: string) {
  ensureHydrated();
  const requestId = normalizeString(requestIdRaw);
  const entry = requestId ? runRecords.get(requestId) : undefined;
  if (!entry) {
    return null;
  }
  return projectAcpSkillRunMetadataRecord(entry);
}

function findTaskForRun(run: AcpSkillRunRecord) {
  const requestId = normalizeString(run.requestId);
  if (!requestId) {
    return undefined;
  }
  return mapAcpSkillRunSummaryToWorkflowTask(summarizeAcpSkillRun(run));
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
    transcriptRevision: run.transcriptRevision,
    transcriptEventSeq: run.transcriptEventSeq,
    transcriptItemCount: run.transcriptItemCount,
    transcriptPreview: run.transcriptPreview,
    error: run.error,
    removedAt: run.removedAt,
    archivedAt: run.archivedAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

type AcpSkillRunTranscriptPageRequest = {
  requestId?: string;
  cursor?: number;
  limit?: number;
};

function selectedTranscriptPageForRun(
  record: AcpSkillRunRecord | undefined,
  request?: AcpSkillRunTranscriptPageRequest,
) {
  if (!record) {
    return undefined;
  }
  const transcriptState = selectedTranscriptStateForRun(record);
  if (transcriptState?.state !== "ready") {
    return undefined;
  }
  const requestedPageRunId = normalizeString(request?.requestId);
  if (requestedPageRunId && requestedPageRunId !== record.requestId) {
    return undefined;
  }
  return readUiVisibleTranscriptMirrorPage({
    requestId: record.requestId,
    state: getAcpSkillRunTranscriptLiveState(record),
    cursor: request?.cursor,
    limit: request?.limit,
  });
}

function buildAcpSkillRunPanelSnapshotFromRuns(
  listedRuns: AcpSkillRunSummary[],
  args?: {
    selectedRequestId?: string;
    transcriptPage?: AcpSkillRunTranscriptPageRequest;
  },
): AcpSkillRunPanelSnapshot {
  const truncated = listedRuns.length > ACP_SKILL_RUN_PANEL_RUN_LIMIT;
  let runs = listedRuns.slice(0, ACP_SKILL_RUN_PANEL_RUN_LIMIT);
  const requested =
    normalizeString(args?.selectedRequestId) || selectedRequestId;
  const requestedRecord = requested ? runRecords.get(requested) : undefined;
  const selected = resolveAcpSkillRunPanelSelectedRecord({
    requested,
    runs,
  });
  if (
    requestedRecord &&
    isSelectableAcpSkillRunRecord(requestedRecord) &&
    !runs.some((run) => run.requestId === requestedRecord.requestId)
  ) {
    runs = [
      summarizeAcpSkillRun(requestedRecord),
      ...runs.filter((run) => run.requestId !== requestedRecord.requestId),
    ].slice(0, ACP_SKILL_RUN_PANEL_RUN_LIMIT);
  }
  const snapshotSelectedRequestId = selected?.requestId || "";
  const selectedTranscript = selectedTranscriptStateForRun(selected);
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
    runningTasksTitle: getStringOrFallback(
      "task-dashboard-run-running-tasks-title" as any,
      "Running",
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
    selectedRequestId: snapshotSelectedRequestId,
    selectedTranscript,
    selectedTranscriptPage: selectedTranscriptPageForRun(
      selected,
      args?.transcriptPage,
    ),
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
    selectedRun: selected
      ? projectAcpSkillRunRecordForPanel(selected)
      : undefined,
    selectedRuntimeOptions: selected
      ? runtimeOptionsForRun(selected)
      : undefined,
    selectedTask,
    logs,
  };
}

export function buildAcpSkillRunPanelSnapshot(args?: {
  selectedRequestId?: string;
  transcriptPage?: AcpSkillRunTranscriptPageRequest;
}): AcpSkillRunPanelSnapshot {
  ensureHydrated();
  const listedRuns = listAcpSkillRunPanelRecentSummaries({
    limit: ACP_SKILL_RUN_PANEL_RUN_LIMIT + 1,
  });
  return buildAcpSkillRunPanelSnapshotFromRuns(listedRuns, args);
}

export async function prepareAcpSkillRunPanelSnapshot(args?: {
  selectedRequestId?: string;
  transcriptPage?: AcpSkillRunTranscriptPageRequest;
}): Promise<AcpSkillRunPanelSnapshot> {
  ensureHydrated();
  const listedRuns = listAcpSkillRunPanelRecentSummaries({
    limit: ACP_SKILL_RUN_PANEL_RUN_LIMIT + 1,
  });
  const requested = normalizeString(args?.selectedRequestId);
  const selectedRequestIdForSnapshot =
    requested ||
    materializeAcpSkillRunPanelSelectedRequestId(
      listedRuns.slice(0, ACP_SKILL_RUN_PANEL_RUN_LIMIT),
    );
  const selected = resolveAcpSkillRunPanelSelectedRecord({
    requested: selectedRequestIdForSnapshot,
    runs: listedRuns.slice(0, ACP_SKILL_RUN_PANEL_RUN_LIMIT),
  });
  if (selected) {
    scheduleAcpSkillRunTranscriptHydrate(selected.requestId);
  }
  return buildAcpSkillRunPanelSnapshotFromRuns(listedRuns, {
    ...args,
    selectedRequestId: selectedRequestIdForSnapshot,
  });
}

export function subscribeAcpSkillRunSnapshots(listener: AcpSkillRunListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function shutdownAcpSkillRunConversations() {
  const entries = Array.from(controllers.entries());
  await Promise.allSettled(
    entries.map(async ([requestId, controller]) => {
      let timedOut = false;
      let disconnectError: unknown = null;
      try {
        if (controller.disconnect) {
          const result = await waitForAcpSkillRunShutdownTask(
            controller.disconnect(),
          );
          timedOut = result.timedOut;
          disconnectError = "error" in result ? result.error : null;
        }
      } catch (error) {
        disconnectError = error;
      }
      registerAcpSkillRunController(requestId, null);
      upsertAcpSkillRun({
        requestId,
        activePrompt: false,
        conversationState: "closed",
        conversationRecoveryState: "available",
        connectionActionState: "idle",
        event: {
          stage: timedOut
            ? "conversation-detach-timeout"
            : disconnectError
              ? "conversation-detach-error"
              : "conversation-detached",
          message:
            timedOut || disconnectError
              ? "ACP skill run local controller detach did not complete cleanly during shutdown; remote session remains recoverable."
              : "ACP skill run local controller detached during shutdown; remote session remains recoverable.",
          level: timedOut || disconnectError ? "warn" : "info",
          details:
            timedOut || disconnectError
              ? {
                  timeoutMs: timedOut
                    ? ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS
                    : undefined,
                  error: disconnectError
                    ? String(
                        (disconnectError as Error)?.message || disconnectError,
                      )
                    : undefined,
                }
              : undefined,
        },
      });
    }),
  );
  await flushAcpSkillRunRuntimeFileWritesDuringShutdown();
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

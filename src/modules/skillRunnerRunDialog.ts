import type { DialogHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { resolveBackendDisplayName } from "../backends/displayName";
import { loadBackendsRegistry } from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import { getStringOrFallback as localize } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { isWindowAlive } from "../utils/window";
import { copyText } from "../utils/ztoolkit";
import { buildAssistantPanelLabels } from "./assistantPanelLabels";
import {
  type SkillRunnerManagementChatHistoryPayload,
  type SkillRunnerManagementAuthSession,
  type SkillRunnerManagementPending,
  type SkillRunnerManagementSseFrame,
  isAbortErrorLike,
} from "../providers/skillrunner/managementClient";
import { isSkillRunnerRunTerminalClientError } from "../providers/skillrunner/errors";
import { buildSkillRunnerManagementClient } from "./skillRunnerManagementClientFactory";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  cleanupTaskDashboardHistory,
  listTaskDashboardHistory,
  type TaskDashboardHistoryRecord,
} from "./taskDashboardHistory";
import {
  mergeDashboardTaskRows,
  normalizeDashboardBackends,
} from "./taskDashboardSnapshot";
import {
  isTerminal,
  isWaiting,
  normalizeStatus,
  normalizeStatusWithGuard,
  type SkillRunnerStateMachineViolation,
} from "./skillRunnerProviderStateMachine";
import { delay } from "../utils/runtimeCompatibility";
import {
  listActiveWorkflowTasks,
  subscribeWorkflowTasks,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import {
  archiveSkillRunnerRequestLedgerRecord,
  getSkillRunnerRequestLedgerRecord,
} from "./skillRunnerRequestLedger";
import {
  isSkillRunnerBackendReconcileFlagged,
  subscribeSkillRunnerBackendHealth,
} from "./skillRunnerBackendHealthRegistry";
import {
  ensureSkillRunnerSessionSync,
  stopSessionSync,
  subscribeSkillRunnerSessionState,
} from "./skillRunnerSessionSyncManager";
import { settleSkillRunnerRunAsFailed } from "./skillRunnerRunSettlement";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";
import {
  pickSkillRunnerSidebarFocusedTaskKey,
  type SkillRunnerSidebarContext,
  type SkillRunnerSidebarRelationState,
} from "./skillRunnerSidebarModel";
import { ASSISTANT_SIDEBAR_STREAM_FLUSH_MS } from "./assistantSidebarViewModel";
import type { AcpPendingPermissionRequest } from "./acpTypes";
import {
  getSkillRunnerHostBridgePermissionRequest,
  resolveSkillRunnerHostBridgePermissionRequest,
  subscribeSkillRunnerHostBridgePermissionRequests,
} from "./skillRunnerHostBridgePermissionRegistry";

export type RunDialogMessageRole = "assistant" | "user" | "system";
export type RunDialogMessageKind =
  | "assistant_process"
  | "assistant_message"
  | "assistant_final"
  | "assistant_revision"
  | "interaction_reply"
  | "auth_submission"
  | "orchestration_notice"
  | "unknown";

export type SkillRunnerConversationEntry = {
  seq: number;
  ts?: string;
  role: RunDialogMessageRole;
  kind: RunDialogMessageKind;
  text: string;
  displayText?: string;
  displayFormat?: string | null;
  attempt?: number;
  messageId?: string;
  messageFamilyId?: string;
  replacesMessageId?: string;
  processType?: string;
  raw: unknown;
};

type RunDialogPendingInteraction = {
  interactionId?: number;
  kind?: string;
  prompt?: string;
  options: RunDialogChoiceOption[];
  requiredFields: string[];
  uiHints: Record<string, unknown>;
  askUser?: Record<string, unknown>;
};

type RunDialogPendingAuth = {
  phase?: string;
  authSessionId?: string;
  providerId?: string;
  engine?: string;
  prompt?: string;
  challengeKind?: string;
  availableMethods: string[];
  askUser?: Record<string, unknown>;
  acceptsChatInput?: boolean;
  inputKind?: string;
  authUrl?: string;
  userCode?: string;
  lastError?: string;
  uiHints: Record<string, unknown>;
};

type RunSessionState = {
  requestId: string;
  status: string;
  updatedAt?: string;
  engine?: string;
  model?: string;
  pendingOwner?: string;
  pendingInteraction?: RunDialogPendingInteraction;
  pendingAuth?: RunDialogPendingAuth;
  pendingPermission?: AcpPendingPermissionRequest | null;
  messages: SkillRunnerConversationEntry[];
  seenMessageKeys: Set<string>;
  lastSeq: number;
  error?: string;
  loading: boolean;
};

type RunDialogSnapshot = {
  title: string;
  backendTitle: string;
  requestId: string;
  status: string;
  statusSemantics: {
    normalized: string;
    terminal: boolean;
    waiting: boolean;
  };
  updatedAt?: string;
  engine?: string;
  model?: string;
  pendingOwner?: string;
  pendingInteractionId?: number;
  pendingKind?: string;
  pendingPrompt?: string;
  pendingOptions: RunDialogChoiceOption[];
  pendingRequiredFields: string[];
  pendingUiHints?: Record<string, unknown>;
  pendingAskUser?: Record<string, unknown>;
  pendingPermission?: AcpPendingPermissionRequest | null;
  authPhase?: string;
  authSessionId?: string;
  authProviderId?: string;
  authEngine?: string;
  authPrompt?: string;
  authChallengeKind?: string;
  authAvailableMethods: string[];
  authAskUser?: Record<string, unknown>;
  authAcceptsChatInput?: boolean;
  authInputKind?: string;
  authUrl?: string;
  authUserCode?: string;
  authLastError?: string;
  authUiHints?: Record<string, unknown>;
  loading: boolean;
  error?: string;
  messages: Array<{
    seq: number;
    ts?: string;
    role: RunDialogMessageRole;
    kind: RunDialogMessageKind;
    text: string;
    displayText?: string;
    displayFormat?: string | null;
    attempt?: number;
    correlation?: Record<string, unknown>;
  }>;
  labels: {
    assistantPanel?: ReturnType<typeof buildAssistantPanelLabels>;
    title: string;
    backend: string;
    requestId: string;
    status: string;
    engine: string;
    model: string;
    updatedAt: string;
    pendingKind: string;
    pendingPrompt: string;
    loading: string;
    error: string;
    replyPlaceholder: string;
    replyPlaceholderAlternative: string;
    reply: string;
    cancel: string;
    close: string;
    chatEmpty: string;
    roleAgent: string;
    roleUser: string;
    roleSystem: string;
    roleRevision: string;
    runningHintTitle: string;
    runningHintDesc: string;
    waitingUserTitle: string;
    waitingAuthTitle: string;
    pendingInputTitle: string;
    interactionIdLabel: string;
    kindLabel: string;
    requiredFieldsPrefix: string;
    authRequiredPrompt: string;
    authSessionIdLabel: string;
    authEngineLabel: string;
    authProviderLabel: string;
    authUrlPrefix: string;
    userCodePrefix: string;
    lastErrorPrefix: string;
    pendingMethodSelection: string;
    replySend: string;
    replyShortcut: string;
    confirmYes: string;
    confirmNo: string;
    authPasteApiKey: string;
    authPasteCode: string;
    authSubmitApiKey: string;
    authSubmitCode: string;
    authAwaiting: string;
    authInProgress: string;
    authImportSubmit: string;
    authImportHintDefault: string;
    authImportRiskNotice: string;
    authImportRequired: string;
    authImportOptional: string;
    authImportUnsupported: string;
    thinkingTitle: string;
    thinkingDesc: string;
    roleThinking: string;
    processReasoning: string;
    processToolCall: string;
    processCommandExecution: string;
    revisionCollapsedPrefix: string;
    revisionExpand: string;
    revisionCollapse: string;
    finalSummaryTitle: string;
    authImportFailed: string;
  };
};

export type RunDialogChoiceOption = {
  label: string;
  value: unknown;
};

export type RightShellMode = "item" | "notes" | "skillrunner";

type RunDialogActionEnvelope = {
  type: "run-dialog:action" | "skillrunner-sidebar:action";
  action: string;
  payload?: Record<string, unknown>;
};

type RunDialogEntry = {
  key: string;
  backend: BackendInstance;
  requestId: string;
  alertWindow: Window | null;
  stopObserver?: () => Promise<void>;
  refreshState?: () => Promise<void>;
  refreshDisplay?: () => Promise<void>;
  unsubscribeSessionState?: () => void;
  session: RunSessionState;
};

const WAITING_AUTH_OBSERVER_INTERVAL_MS = 1500;

export type RunWorkspaceTaskItem = {
  key: string;
  backendId: string;
  backendDisplayName: string;
  requestId?: string;
  workflowLabel?: string;
  status: string;
  stateLabel: string;
  createdAt?: string;
  updatedAt: string;
  title: string;
  selectable: boolean;
  terminal: boolean;
  attention?: "" | "warning";
  inputUnitIdentity?: string;
  targetParentID?: number;
  relationState?: SkillRunnerSidebarRelationState;
};

export type RunWorkspaceGroup = {
  backendId: string;
  backendDisplayName: string;
  disabled: boolean;
  disabledReason?: string;
  collapsed: boolean;
  finishedCollapsed: boolean;
  activeTasks: RunWorkspaceTaskItem[];
  finishedTasks: RunWorkspaceTaskItem[];
  latestUpdatedAt: string;
};

export type RunWorkspaceSnapshot = {
  title: string;
  hostMode?: "dialog" | "sidebar";
  labels: {
    assistantPanel?: ReturnType<typeof buildAssistantPanelLabels>;
    title: string;
    completedTasksTitle: string;
    conversationTitle: string;
    closeSidebar: string;
    tasksToggle: string;
    selectionTasksTitle: string;
    waitingRequestId: string;
    emptyTasks: string;
    backendUnavailable: string;
  };
  workspace: {
    selectedTaskKey: string;
    groups: RunWorkspaceGroup[];
  };
  session: RunDialogSnapshot | null;
  drawer?: {
    open: boolean;
    notice?: string;
    sections: Array<{
      id: "running" | "completed";
      title: string;
      collapsed: boolean;
      groups: RunWorkspaceGroup[];
    }>;
  };
  badges?: {
    waitingCount: number;
  };
  selectionTasks?: {
    itemLabel?: string;
    tasks: Array<{
      key: string;
      label: string;
      selected: boolean;
    }>;
  };
  contextHint?: {
    itemLabel?: string;
    hasRelated: boolean;
    tooltip?: string;
  };
  navigation?: {
    activeMode: RightShellMode;
    canSwitchToItem: boolean;
    canSwitchToNotes: boolean;
  };
};

type RunWorkspaceState = {
  hostMode: "dialog" | "sidebar";
  bridgeType: "run-dialog" | "skillrunner-sidebar";
  hostWindow: Window | null;
  frameWindow: Window | null;
  alertWindow: Window | null;
  focusHost?: () => void;
  closeHost?: () => void;
  isHostAlive?: () => boolean;
  removeMessageListener?: () => void;
  unsubscribeTasks?: () => void;
  unsubscribeBackendHealth?: () => void;
  unsubscribeHostBridgePermissions?: () => void;
  decorateSnapshot?: (snapshot: RunWorkspaceSnapshot) => RunWorkspaceSnapshot;
  resolveSidebarSelectionContext?: () => SkillRunnerSidebarContext | null;
  handleHostAction?: (
    envelope: RunDialogActionEnvelope,
  ) => Promise<boolean> | boolean;
  snapshotFlushTimer?: ReturnType<typeof setTimeout> | null;
  pendingSnapshotType?: "init" | "snapshot";
  refreshChain: Promise<void>;
  selectedTaskKey: string;
  requestedTaskKey: string;
  groupCollapsed: Map<string, boolean>;
  finishedCollapsed: Map<string, boolean>;
  taskIndex: Map<
    string,
    {
      item: RunWorkspaceTaskItem;
      backend: BackendInstance;
    }
  >;
  groups: RunWorkspaceGroup[];
  currentEntry?: RunDialogEntry;
  loadingBackends: boolean;
  latestOpenTarget?: {
    key: string;
    backend: BackendInstance;
    requestId: string;
  };
};

const SKILLRUNNER_BACKEND_TYPE = "skillrunner";

const runWorkspaceState: RunWorkspaceState = {
  hostMode: "dialog",
  bridgeType: "run-dialog",
  hostWindow: null,
  frameWindow: null,
  alertWindow: null,
  refreshChain: Promise.resolve(),
  selectedTaskKey: "",
  requestedTaskKey: "",
  groupCollapsed: new Map(),
  finishedCollapsed: new Map(),
  taskIndex: new Map(),
  groups: [],
  loadingBackends: false,
  snapshotFlushTimer: null,
  pendingSnapshotType: undefined,
};

const runDialogMap = new Map<string, RunDialogEntry>();
const runDialogProbeState = {
  observerInflightTaskCount: 0,
  waitingAuthTimerCount: 0,
};

function trackRunDialogObserverTask<T>(task: Promise<T>) {
  runDialogProbeState.observerInflightTaskCount += 1;
  void task.finally(() => {
    runDialogProbeState.observerInflightTaskCount = Math.max(
      0,
      runDialogProbeState.observerInflightTaskCount - 1,
    );
  });
  return task;
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

function settleRunDialogEntryAsFailed(args: {
  entry: RunDialogEntry;
  error: unknown;
  source: string;
}) {
  if (!isSkillRunnerRunTerminalClientError(args.error)) {
    return false;
  }
  const message = compactError(args.error);
  const updatedAt = new Date().toISOString();
  args.entry.session.status = "failed";
  args.entry.session.error = message;
  args.entry.session.updatedAt = updatedAt;
  args.entry.session.pendingOwner = undefined;
  args.entry.session.pendingInteraction = undefined;
  args.entry.session.pendingAuth = undefined;
  settleSkillRunnerRunAsFailed({
    backendId: args.entry.backend.id,
    backendType: args.entry.backend.type,
    providerId: "skillrunner",
    requestId: args.entry.requestId,
    reason: message,
    source: args.source,
    error: args.error,
    updatedAt,
  });
  stopSessionSync({
    backendId: args.entry.backend.id,
    requestId: args.entry.requestId,
  });
  pushSnapshot("snapshot");
  return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    const normalized = String(entry || "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function normalizeAuthInputKind(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  if (normalized === "authorization_code") {
    return "auth_code_or_url";
  }
  return normalized;
}

export function normalizeRunDialogChoiceOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as RunDialogChoiceOption[];
  }
  const out: RunDialogChoiceOption[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const text = entry.trim();
      if (!text) {
        continue;
      }
      out.push({
        label: text,
        value: text,
      });
      continue;
    }
    if (!isObject(entry)) {
      continue;
    }
    const label = String(entry.label || "").trim();
    if (!label) {
      continue;
    }
    const value = Object.prototype.hasOwnProperty.call(entry, "value")
      ? entry.value
      : label;
    out.push({
      label,
      value,
    });
  }
  return out;
}

export function resolveRunDialogInteractionResponse(args: {
  replyText?: unknown;
  responseValue?: unknown;
  option?: unknown;
  responseObject?: unknown;
}): {
  hasResponse: boolean;
  response: unknown;
} {
  const hasResponseValue = Object.prototype.hasOwnProperty.call(
    args,
    "responseValue",
  );
  if (hasResponseValue) {
    return {
      hasResponse: true,
      response: args.responseValue,
    };
  }
  const hasLegacyOption = Object.prototype.hasOwnProperty.call(args, "option");
  if (hasLegacyOption) {
    return {
      hasResponse: true,
      response: args.option,
    };
  }
  if (isObject(args.responseObject)) {
    return {
      hasResponse: true,
      response: args.responseObject,
    };
  }
  return {
    hasResponse: false,
    response: {
      text: String(args.replyText || "").trim(),
    },
  };
}

export function shouldRefreshRunDialogStateFromChatEvent(
  event: Record<string, unknown>,
) {
  const type = String(event.type || event.kind || event.event || "")
    .trim()
    .toLowerCase();
  if (!type) {
    return false;
  }
  return (
    type.startsWith("interaction.reply.") ||
    type.startsWith("interaction.pending.") ||
    type.startsWith("auth.")
  );
}

export function shouldClearRunDialogPendingForStatus(status: unknown) {
  const normalized = normalizeStatus(status, "running");
  return !isWaiting(normalized);
}

export function isRunDialogWaitingAuthActivePhase(phase: unknown) {
  const normalized = String(phase || "")
    .trim()
    .toLowerCase();
  return normalized === "method_selection" || normalized === "challenge_active";
}

export function hasRunDialogWaitingAuthExited(args: {
  pending?: SkillRunnerManagementPending | null;
  authSession?: SkillRunnerManagementAuthSession | null;
}) {
  const pendingOwner = String(args.pending?.pending_owner || "")
    .trim()
    .toLowerCase();
  if (
    pendingOwner &&
    pendingOwner !== "waiting_auth" &&
    !pendingOwner.startsWith("waiting_auth.")
  ) {
    return true;
  }
  const pendingStatusRaw = String(args.pending?.status || "").trim();
  if (
    pendingStatusRaw &&
    normalizeStatus(pendingStatusRaw, "running") !== "waiting_auth"
  ) {
    return true;
  }
  const authStatusRaw = String(args.authSession?.status || "").trim();
  if (
    authStatusRaw &&
    normalizeStatus(authStatusRaw, "running") !== "waiting_auth"
  ) {
    return true;
  }
  const authPhase = String(args.authSession?.phase || "").trim();
  if (authPhase && !isRunDialogWaitingAuthActivePhase(authPhase)) {
    return true;
  }
  return false;
}

function isTerminalStatus(status: string) {
  return isTerminal(status);
}

function appendStateMachineViolation(args: {
  entry: RunDialogEntry;
  violation?: SkillRunnerStateMachineViolation;
}) {
  if (!args.violation) {
    return;
  }
  appendRuntimeLog({
    level: "warn",
    scope: "state-machine",
    workflowId: undefined,
    jobId: undefined,
    requestId: args.entry.requestId,
    stage: "state-machine-guard",
    message: "run dialog status normalized by state machine guard",
    details: args.violation,
  });
}

function applyRunDialogSessionStatus(args: {
  entry: RunDialogEntry;
  rawStatus: unknown;
}) {
  const fallback = normalizeStatus(args.entry.session.status || "", "running");
  const normalized = normalizeStatusWithGuard({
    value: args.rawStatus,
    fallback,
    requestId: args.entry.requestId,
  });
  appendStateMachineViolation({
    entry: args.entry,
    violation: normalized.violation,
  });
  args.entry.session.status = normalized.status;
}

async function sleep(ms: number) {
  await delay(ms);
}

function formatSkillRunnerEventText(event: Record<string, unknown>) {
  const summary = String(
    event.summary || event.text || event.content || event.message || "",
  ).trim();
  if (summary) {
    return summary;
  }
  const kind = String(event.kind || event.type || event.event || "").trim();
  if (kind) {
    return kind;
  }
  return JSON.stringify(event);
}

function formatSkillRunnerEventDisplayText(event: Record<string, unknown>) {
  const projected = String(event.display_text || "").trim();
  if (projected) {
    return projected;
  }
  return formatSkillRunnerEventText(event);
}

export function normalizeRunDialogMessageKind(
  value: unknown,
): RunDialogMessageKind {
  const kind = String(value || "")
    .trim()
    .toLowerCase();
  if (
    kind === "assistant_process" ||
    kind === "assistant_message" ||
    kind === "assistant_final" ||
    kind === "assistant_revision" ||
    kind === "interaction_reply" ||
    kind === "auth_submission" ||
    kind === "orchestration_notice"
  ) {
    return kind;
  }
  return "unknown";
}

export function normalizeRunDialogMessageRole(
  value: unknown,
): RunDialogMessageRole {
  const role = String(value || "")
    .trim()
    .toLowerCase();
  if (role === "assistant" || role === "user" || role === "system") {
    return role;
  }
  return "system";
}

export function toRunDialogConversationEntry(args: {
  event: Record<string, unknown>;
  lastSeq: number;
  seenKeys?: Set<string>;
}): SkillRunnerConversationEntry | null {
  const rawSeq = Number(args.event.seq || 0);
  const seq = Number.isFinite(rawSeq) && rawSeq > 0 ? Math.floor(rawSeq) : 0;
  if (seq > 0 && seq < args.lastSeq) {
    return null;
  }
  const role = normalizeRunDialogMessageRole(args.event.role);
  const kind = normalizeRunDialogMessageKind(args.event.kind);
  const text = formatSkillRunnerEventText(args.event);
  const displayText = formatSkillRunnerEventDisplayText(args.event);
  if (
    !String(displayText || text || "").trim() &&
    kind !== "assistant_revision"
  ) {
    return null;
  }
  const type = String(
    args.event.type || args.event.kind || args.event.event || "",
  ).trim();
  const dedupeKey = `${seq}:${type}:${kind}:${role}:${displayText}:${text}`;
  if (args.seenKeys?.has(dedupeKey)) {
    return null;
  }
  args.seenKeys?.add(dedupeKey);
  return {
    seq,
    ts: String(args.event.ts || "").trim() || undefined,
    role,
    kind,
    text,
    displayText,
    displayFormat: String(args.event.display_format || "").trim() || null,
    attempt: Number.isFinite(Number(args.event.attempt))
      ? normalizeAttempt(args.event.attempt, 1)
      : undefined,
    messageId:
      normalizeDisplayText(
        isObject(args.event.correlation)
          ? args.event.correlation.message_id
          : "",
      ) || undefined,
    messageFamilyId:
      normalizeDisplayText(
        isObject(args.event.correlation)
          ? args.event.correlation.message_family_id
          : "",
      ) || undefined,
    replacesMessageId:
      normalizeDisplayText(
        isObject(args.event.correlation)
          ? args.event.correlation.replaces_message_id
          : "",
      ) || undefined,
    processType:
      normalizeDisplayText(
        isObject(args.event.correlation)
          ? args.event.correlation.process_type ||
              args.event.correlation.classification
          : "",
      ) || undefined,
    raw: args.event,
  };
}

function normalizeDisplayText(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAttempt(value: unknown, fallback = 1) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return fallback;
  }
  return Math.floor(raw);
}

function entryCorrelation(entry: SkillRunnerConversationEntry) {
  if (!isObject(entry.raw)) {
    return {} as Record<string, unknown>;
  }
  const correlation = entry.raw.correlation;
  return isObject(correlation) ? correlation : ({} as Record<string, unknown>);
}

function entryMessageId(entry: SkillRunnerConversationEntry) {
  return normalizeDisplayText(
    entry.messageId || entryCorrelation(entry).message_id,
  );
}

function entryReplacesMessageId(entry: SkillRunnerConversationEntry) {
  return normalizeDisplayText(
    entry.replacesMessageId || entryCorrelation(entry).replaces_message_id,
  );
}

function entryAttempt(entry: SkillRunnerConversationEntry) {
  if (typeof entry.attempt === "number" && Number.isFinite(entry.attempt)) {
    return normalizeAttempt(entry.attempt, 1);
  }
  if (!isObject(entry.raw)) {
    return 1;
  }
  return normalizeAttempt(entry.raw.attempt, 1);
}

function entryVisibleText(entry: SkillRunnerConversationEntry) {
  return normalizeDisplayText(entry.displayText || entry.text);
}

function isAssistantProcessEntry(entry: SkillRunnerConversationEntry) {
  return entry.role === "assistant" && entry.kind === "assistant_process";
}

function isAssistantIntermediateEntry(entry: SkillRunnerConversationEntry) {
  return entry.role === "assistant" && entry.kind === "assistant_message";
}

function isAssistantFinalEntry(entry: SkillRunnerConversationEntry) {
  return entry.role === "assistant" && entry.kind === "assistant_final";
}

function removePromotedIntermediateEntry(
  output: SkillRunnerConversationEntry[],
  finalEntry: SkillRunnerConversationEntry,
) {
  const finalAttempt = entryAttempt(finalEntry);
  const finalMessageId = entryMessageId(finalEntry);
  const replacesMessageId = entryReplacesMessageId(finalEntry);
  const finalText = entryVisibleText(finalEntry);
  let fallbackMatchIndex = -1;
  for (let index = output.length - 1; index >= 0; index -= 1) {
    const candidate = output[index];
    if (
      !isAssistantProcessEntry(candidate) &&
      !isAssistantIntermediateEntry(candidate)
    ) {
      continue;
    }
    if (entryAttempt(candidate) !== finalAttempt) {
      continue;
    }
    const candidateMessageId = entryMessageId(candidate);
    if (replacesMessageId && candidateMessageId === replacesMessageId) {
      output.splice(index, 1);
      return;
    }
    if (
      !replacesMessageId &&
      finalMessageId &&
      candidateMessageId === finalMessageId
    ) {
      output.splice(index, 1);
      return;
    }
    if (
      !replacesMessageId &&
      !finalMessageId &&
      finalText &&
      entryVisibleText(candidate) === finalText &&
      fallbackMatchIndex < 0
    ) {
      fallbackMatchIndex = index;
    }
  }
  if (fallbackMatchIndex >= 0) {
    output.splice(fallbackMatchIndex, 1);
  }
}

export function buildRunDialogDisplayMessages(
  messages: SkillRunnerConversationEntry[],
) {
  const output: SkillRunnerConversationEntry[] = [];
  for (const entry of messages) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    if (isAssistantFinalEntry(entry)) {
      removePromotedIntermediateEntry(output, entry);
    }
    output.push(entry);
  }
  return output;
}

export function normalizeRunDialogPendingState(
  payload: SkillRunnerManagementPending | undefined,
): {
  pendingOwner?: string;
  pendingInteraction?: RunDialogPendingInteraction;
  pendingAuth?: RunDialogPendingAuth;
} {
  if (!payload || !isObject(payload)) {
    return {};
  }
  const pendingOwner = String(payload.pending_owner || "").trim() || undefined;
  let pendingInteraction: RunDialogPendingInteraction | undefined;
  let pendingAuth: RunDialogPendingAuth | undefined;

  if (isObject(payload.pending)) {
    const interactionId = Number(payload.pending.interaction_id || 0);
    const askUser = isObject(payload.pending.ask_user)
      ? payload.pending.ask_user
      : undefined;
    const uiHints = isObject(payload.pending.ui_hints)
      ? payload.pending.ui_hints
      : {};
    const askUserPrompt = askUser
      ? String(askUser.prompt || "").trim() || undefined
      : undefined;
    const askUserKind = askUser
      ? String(askUser.kind || "").trim() || undefined
      : undefined;
    const askUserOptions =
      askUser && Array.isArray(askUser.options) ? askUser.options : undefined;
    pendingInteraction = {
      interactionId:
        Number.isFinite(interactionId) && interactionId > 0
          ? Math.floor(interactionId)
          : undefined,
      kind:
        askUserKind || String(payload.pending.kind || "").trim() || undefined,
      prompt:
        askUserPrompt ||
        String(payload.pending.prompt || "").trim() ||
        undefined,
      options: normalizeRunDialogChoiceOptions(
        askUserOptions || payload.pending.options,
      ),
      requiredFields: normalizeStringArray(payload.pending.required_fields),
      uiHints,
      askUser,
    };
  }

  const pendingAuthMethodSelection = isObject(
    payload.pending_auth_method_selection,
  )
    ? payload.pending_auth_method_selection
    : null;
  const pendingAuthPayload = isObject(payload.pending_auth)
    ? payload.pending_auth
    : null;
  const authPayload = pendingAuthMethodSelection || pendingAuthPayload;
  if (authPayload) {
    const uiHints = isObject(authPayload.ui_hints) ? authPayload.ui_hints : {};
    const askUser = isObject(authPayload.ask_user)
      ? authPayload.ask_user
      : undefined;
    pendingAuth = {
      phase: String(authPayload.phase || "").trim() || undefined,
      authSessionId:
        String(authPayload.auth_session_id || "").trim() || undefined,
      providerId: String(authPayload.provider_id || "").trim() || undefined,
      engine: String(authPayload.engine || "").trim() || undefined,
      prompt: String(authPayload.prompt || "").trim() || undefined,
      challengeKind:
        normalizeAuthInputKind(authPayload.challenge_kind) || undefined,
      availableMethods: normalizeStringArray(authPayload.available_methods).map(
        (entry) => normalizeAuthInputKind(entry) || entry,
      ),
      askUser,
      acceptsChatInput:
        typeof authPayload.accepts_chat_input === "boolean"
          ? authPayload.accepts_chat_input
          : undefined,
      inputKind: normalizeAuthInputKind(authPayload.input_kind) || undefined,
      authUrl: String(authPayload.auth_url || "").trim() || undefined,
      userCode: String(authPayload.user_code || "").trim() || undefined,
      lastError: String(authPayload.last_error || "").trim() || undefined,
      uiHints,
    };
  }

  return {
    pendingOwner,
    pendingInteraction,
    pendingAuth,
  };
}

function mergePendingAuthWithSession(args: {
  pendingAuth?: RunDialogPendingAuth;
  authSession?: SkillRunnerManagementAuthSession;
}) {
  const authSession = args.authSession;
  if (!authSession || !isObject(authSession)) {
    return args.pendingAuth;
  }
  const sessionPending = normalizeRunDialogPendingState({
    request_id: String(authSession.request_id || "").trim(),
    status: "waiting_auth",
    pending_owner: "waiting_auth.challenge_active",
    pending_auth: authSession,
  }).pendingAuth;
  if (!sessionPending) {
    return args.pendingAuth;
  }
  const current = args.pendingAuth || ({} as RunDialogPendingAuth);
  return {
    ...current,
    ...sessionPending,
    availableMethods:
      sessionPending.availableMethods.length > 0
        ? sessionPending.availableMethods
        : current.availableMethods || [],
    uiHints:
      sessionPending.uiHints && Object.keys(sessionPending.uiHints).length > 0
        ? sessionPending.uiHints
        : current.uiHints || {},
    askUser: sessionPending.askUser || current.askUser,
  } as RunDialogPendingAuth;
}

function mergeHistoryEventsIntoSession(args: {
  session: RunSessionState;
  historyPayload: SkillRunnerManagementChatHistoryPayload;
}) {
  const events = args.historyPayload.events || [];
  let changed = false;
  for (const event of events) {
    if (!event || typeof event !== "object") {
      continue;
    }
    const entry = toRunDialogConversationEntry({
      event: event as Record<string, unknown>,
      lastSeq: args.session.lastSeq,
      seenKeys: args.session.seenMessageKeys,
    });
    if (!entry) {
      continue;
    }
    args.session.messages.push(entry);
    if (entry.seq > args.session.lastSeq) {
      args.session.lastSeq = entry.seq;
    }
    changed = true;
  }
  if (changed && args.session.messages.length > 500) {
    args.session.messages = args.session.messages.slice(-500);
  }
}

function resolveRunDialogPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/dashboard/run-dialog.html`;
}

function resolveRunDialogKey(backendId: string, requestId: string) {
  return `${backendId}::${requestId}`;
}

function createRunDialogFrame(doc: Document, pageUrl: string) {
  const isChromeLocalPage = /^chrome:\/\//i.test(String(pageUrl || ""));
  if (isChromeLocalPage) {
    const frame = doc.createElement("iframe");
    frame.setAttribute("data-zs-role", "skillrunner-run-dialog-frame");
    frame.src = pageUrl;
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.minHeight = "780px";
    frame.style.border = "none";
    return frame;
  }
  const createXul = (doc as { createXULElement?: (tag: string) => Element })
    .createXULElement;
  if (typeof createXul === "function") {
    const browser = createXul.call(doc, "browser");
    browser.setAttribute("data-zs-role", "skillrunner-run-dialog-frame");
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
      "780px",
    );
    return browser;
  }
  const frame = doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "skillrunner-run-dialog-frame");
  frame.src = pageUrl;
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.minHeight = "780px";
  frame.style.border = "none";
  return frame;
}

function resolveFrameWindow(frame: Element | null) {
  if (!frame) {
    return null;
  }
  const candidate = frame as Element & { contentWindow?: Window | null };
  return candidate.contentWindow || null;
}

function toTime(input: string | undefined) {
  const parsed = Date.parse(String(input || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveRunWorkspaceTaskKey(args: {
  backendId: string;
  requestId?: string;
  taskId: string;
}) {
  const backendId = String(args.backendId || "").trim();
  const requestId = String(args.requestId || "").trim();
  if (!backendId) {
    return "";
  }
  if (requestId) {
    return resolveRunDialogKey(backendId, requestId);
  }
  return `${backendId}::task:${String(args.taskId || "").trim()}`;
}

function resolveRunWorkspaceTaskTitle(args: {
  taskName?: string;
  workflowLabel?: string;
  requestId?: string;
  waitingRequestIdLabel: string;
}) {
  const taskName = String(args.taskName || "").trim();
  if (taskName) {
    return taskName;
  }
  const workflowLabel = String(args.workflowLabel || "").trim();
  if (workflowLabel) {
    return workflowLabel;
  }
  const requestId = String(args.requestId || "").trim();
  if (requestId) {
    return requestId;
  }
  return args.waitingRequestIdLabel;
}

function resolveRunWorkspaceTitle() {
  return localize(
    "task-dashboard-run-workspace-title",
    "SkillRunner Workspace",
  );
}

function isVisibleRunWorkspaceTaskForSelection(task: RunWorkspaceTaskItem) {
  if (!task.selectable || !String(task.requestId || "").trim()) {
    return false;
  }
  if (!task.terminal) {
    return true;
  }
  return normalizeStatus(task.status, "running") === "succeeded";
}

function resolveRunWorkspaceStatusLabel(value: string) {
  const normalized = normalizeStatus(value, "running");
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
  return localize("task-dashboard-status-unknown", "Unknown");
}

function isSkillRunnerRecord(record: {
  backendType?: string;
  backendId?: string;
}) {
  const backendType = String(record.backendType || "").trim();
  const backendId = String(record.backendId || "").trim();
  return (
    backendType === SKILLRUNNER_BACKEND_TYPE ||
    backendId === "local-skillrunner-backend"
  );
}

function resolveSessionSnapshotFromTaskStores(entry: RunDialogEntry) {
  const backendId = String(entry.backend.id || "").trim();
  const requestId = String(entry.requestId || "").trim();
  if (!backendId || !requestId) {
    return null;
  }
  const activeMatches = listActiveWorkflowTasks().filter(
    (row) =>
      String(row.backendId || "").trim() === backendId &&
      String(row.requestId || "").trim() === requestId,
  );
  const historyMatches = listTaskDashboardHistory({
    backendId,
    requestId,
  });
  const merged = [...activeMatches, ...historyMatches].sort(
    (a, b) =>
      Date.parse(
        String(b.updatedAt || "").trim() || "1970-01-01T00:00:00.000Z",
      ) -
      Date.parse(
        String(a.updatedAt || "").trim() || "1970-01-01T00:00:00.000Z",
      ),
  );
  if (merged.length === 0) {
    return null;
  }
  const latest = merged[0];
  return {
    status: normalizeStatus(latest.state, "running"),
    updatedAt: String(latest.updatedAt || "").trim() || undefined,
    error: String(latest.error || "").trim() || undefined,
  };
}

function syncSessionStateFromLedger(entry: RunDialogEntry) {
  const fromLedger = getSkillRunnerRequestLedgerRecord(entry.requestId);
  if (fromLedger) {
    entry.session.status = normalizeStatus(
      fromLedger.snapshot,
      normalizeStatus(entry.session.status, "running"),
    );
    entry.session.updatedAt = fromLedger.updatedAt || entry.session.updatedAt;
    if (fromLedger.error) {
      entry.session.error = fromLedger.error;
    }
    return;
  }
  const fromStores = resolveSessionSnapshotFromTaskStores(entry);
  if (!fromStores) {
    return;
  }
  entry.session.status = fromStores.status;
  entry.session.updatedAt = fromStores.updatedAt || entry.session.updatedAt;
  if (fromStores.error) {
    entry.session.error = fromStores.error;
  }
}

async function restartRunDialogEntrySessionSyncAfterWaitingExit(
  entry: Pick<RunDialogEntry, "backend" | "requestId">,
) {
  stopSessionSync({
    backendId: entry.backend.id,
    requestId: entry.requestId,
  });
  ensureSkillRunnerSessionSync({
    backend: entry.backend,
    requestId: entry.requestId,
  });
}

async function buildRunWorkspaceModel() {
  cleanupTaskDashboardHistory();
  const history = listTaskDashboardHistory().filter((entry) =>
    isSkillRunnerRecord(entry),
  ) as TaskDashboardHistoryRecord[];
  const active = listActiveWorkflowTasks().filter((entry) =>
    isSkillRunnerRecord(entry),
  ) as WorkflowTaskRecord[];
  let configured: BackendInstance[] = [];
  try {
    const loaded = await loadBackendsRegistry();
    configured = loaded.backends.filter(
      (entry) =>
        String(entry.type || "").trim() === SKILLRUNNER_BACKEND_TYPE ||
        String(entry.id || "").trim() === "local-skillrunner-backend",
    );
  } catch {
    configured = [];
  }
  const normalizedBackends = normalizeDashboardBackends({
    configured,
    history,
    active,
  }).filter(
    (entry) =>
      String(entry.type || "").trim() === SKILLRUNNER_BACKEND_TYPE ||
      String(entry.id || "").trim() === "local-skillrunner-backend",
  );

  const groupsMap = new Map<
    string,
    {
      backendId: string;
      backendDisplayName: string;
      latestUpdatedAt: string;
      rows: RunWorkspaceTaskItem[];
      backend: BackendInstance;
    }
  >();
  const index = new Map<
    string,
    {
      item: RunWorkspaceTaskItem;
      backend: BackendInstance;
    }
  >();

  const waitingRequestIdLabel = localize(
    "task-dashboard-run-waiting-request-id",
    "Waiting for requestId",
  );

  for (const backend of normalizedBackends) {
    const backendId = String(backend.id || "").trim();
    if (!backendId) {
      continue;
    }
    const backendDisplayName = resolveBackendDisplayName(
      backendId,
      backend.displayName,
    );
    const mergedRows = mergeDashboardTaskRows({
      backendId,
      history,
      active,
    });
    if (!mergedRows.length) {
      continue;
    }
    const group = {
      backendId,
      backendDisplayName,
      latestUpdatedAt: "",
      rows: [] as RunWorkspaceTaskItem[],
      backend,
    };
    for (const row of mergedRows) {
      const requestId = String(row.requestId || "").trim();
      if (
        requestId &&
        getSkillRunnerRequestLedgerRecord(requestId)?.archivedAt
      ) {
        continue;
      }
      const key = resolveRunWorkspaceTaskKey({
        backendId,
        requestId,
        taskId: row.id,
      });
      if (!key) {
        continue;
      }
      const normalizedStatus = normalizeStatus(row.state, "running");
      const pendingPermission = requestId
        ? getSkillRunnerHostBridgePermissionRequest(requestId)
        : null;
      const task: RunWorkspaceTaskItem = {
        key,
        backendId,
        backendDisplayName,
        requestId: requestId || undefined,
        workflowLabel:
          String(row.workflowLabel || "").trim() ||
          String((row as { workflowId?: unknown }).workflowId || "").trim() ||
          undefined,
        status: normalizedStatus,
        stateLabel: resolveRunWorkspaceStatusLabel(normalizedStatus),
        createdAt: String(row.createdAt || "").trim() || undefined,
        updatedAt: String(row.updatedAt || "").trim() || "",
        title: resolveRunWorkspaceTaskTitle({
          taskName: row.taskName,
          workflowLabel: row.workflowLabel,
          requestId,
          waitingRequestIdLabel,
        }),
        selectable: requestId.length > 0,
        terminal: isTerminal(normalizedStatus),
        attention: pendingPermission ? "warning" : undefined,
        inputUnitIdentity:
          String(
            (row as { inputUnitIdentity?: unknown }).inputUnitIdentity || "",
          ).trim() || undefined,
        targetParentID: (() => {
          const targetParentID = (row as { targetParentID?: unknown })
            .targetParentID;
          return typeof targetParentID === "number"
            ? Math.floor(targetParentID)
            : undefined;
        })(),
      };
      group.rows.push(task);
      index.set(key, {
        item: task,
        backend: {
          ...backend,
          baseUrl: String(row.backendBaseUrl || "").trim() || backend.baseUrl,
        },
      });
      if (
        !group.latestUpdatedAt ||
        toTime(task.updatedAt) > toTime(group.latestUpdatedAt)
      ) {
        group.latestUpdatedAt = task.updatedAt;
      }
    }
    groupsMap.set(group.backendId, group);
  }

  if (
    runWorkspaceState.latestOpenTarget &&
    !index.has(runWorkspaceState.latestOpenTarget.key)
  ) {
    const target = runWorkspaceState.latestOpenTarget;
    const task: RunWorkspaceTaskItem = {
      key: target.key,
      backendId: target.backend.id,
      backendDisplayName: resolveBackendDisplayName(
        target.backend.id,
        target.backend.displayName,
      ),
      requestId: target.requestId,
      workflowLabel: undefined,
      status: "running",
      stateLabel: resolveRunWorkspaceStatusLabel("running"),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      title: target.requestId,
      selectable: true,
      terminal: false,
      attention: getSkillRunnerHostBridgePermissionRequest(target.requestId)
        ? "warning"
        : undefined,
      inputUnitIdentity: undefined,
      targetParentID: undefined,
    };
    const existing = groupsMap.get(target.backend.id);
    if (existing) {
      existing.rows.unshift(task);
      existing.latestUpdatedAt = task.updatedAt;
    } else {
      groupsMap.set(target.backend.id, {
        backendId: target.backend.id,
        backendDisplayName: task.backendDisplayName,
        latestUpdatedAt: task.updatedAt,
        rows: [task],
        backend: target.backend,
      });
    }
    index.set(task.key, {
      item: task,
      backend: target.backend,
    });
  }

  const groups = Array.from(groupsMap.values())
    .map((entry) => {
      const sorted = [...entry.rows].sort((a, b) => {
        const createdDiff =
          toTime(b.createdAt || b.updatedAt) -
          toTime(a.createdAt || a.updatedAt);
        if (createdDiff !== 0) return createdDiff;
        return String(b.key || "").localeCompare(String(a.key || ""));
      });
      const disabled = isSkillRunnerBackendReconcileFlagged(entry.backendId);
      const disabledReason = disabled
        ? resolveBackendUnavailableMessage(entry.backendDisplayName)
        : undefined;
      return {
        backendId: entry.backendId,
        backendDisplayName: entry.backendDisplayName,
        disabled,
        disabledReason,
        collapsed: disabled
          ? true
          : runWorkspaceState.groupCollapsed.get(entry.backendId) === true,
        finishedCollapsed: runWorkspaceState.finishedCollapsed.has(
          entry.backendId,
        )
          ? runWorkspaceState.finishedCollapsed.get(entry.backendId) === true
          : true,
        activeTasks: disabled ? [] : sorted.filter((task) => !task.terminal),
        finishedTasks: disabled ? [] : sorted.filter((task) => task.terminal),
        latestUpdatedAt: entry.latestUpdatedAt,
      } as RunWorkspaceGroup;
    })
    .sort((a, b) => a.backendDisplayName.localeCompare(b.backendDisplayName));

  return {
    groups,
    index,
  };
}

function pickRunWorkspaceSelectedTaskKey(args: {
  groups: RunWorkspaceGroup[];
  index: RunWorkspaceState["taskIndex"];
  requestedTaskKey: string;
  currentTaskKey: string;
}) {
  const requested = String(args.requestedTaskKey || "").trim();
  if (requested) {
    const row = args.index.get(requested);
    if (row && isVisibleRunWorkspaceTaskForSelection(row.item)) {
      return requested;
    }
  }
  const current = String(args.currentTaskKey || "").trim();
  if (current) {
    const row = args.index.get(current);
    if (row && isVisibleRunWorkspaceTaskForSelection(row.item)) {
      return current;
    }
  }
  for (const group of args.groups) {
    if (group.disabled) {
      continue;
    }
    for (const task of group.activeTasks) {
      if (isVisibleRunWorkspaceTaskForSelection(task)) {
        return task.key;
      }
    }
    for (const task of group.finishedTasks) {
      if (isVisibleRunWorkspaceTaskForSelection(task)) {
        return task.key;
      }
    }
  }
  return "";
}

function pickRunWorkspaceSelectedTaskKeyForSidebar(args: {
  groups: RunWorkspaceGroup[];
  index: RunWorkspaceState["taskIndex"];
  requestedTaskKey: string;
  currentTaskKey: string;
  selectionChanged?: boolean;
  context?: SkillRunnerSidebarContext | null;
}) {
  const requested = String(args.requestedTaskKey || "").trim();
  if (requested) {
    const row = args.index.get(requested);
    if (row && isVisibleRunWorkspaceTaskForSelection(row.item)) {
      return requested;
    }
  }
  if (args.selectionChanged) {
    const nextFromSelection = pickSkillRunnerSidebarFocusedTaskKey({
      groups: args.groups,
      currentTaskKey: args.currentTaskKey,
      context: args.context,
    });
    if (nextFromSelection) {
      const row = args.index.get(nextFromSelection);
      if (row && isVisibleRunWorkspaceTaskForSelection(row.item)) {
        return nextFromSelection;
      }
    }
  }
  return pickRunWorkspaceSelectedTaskKey({
    groups: args.groups,
    index: args.index,
    requestedTaskKey: "",
    currentTaskKey: args.currentTaskKey,
  });
}

function buildRunDialogSnapshot(
  entry: RunDialogEntry,
  displayTitle?: string,
): RunDialogSnapshot {
  const pending = entry.session.pendingInteraction;
  const pendingAuth = entry.session.pendingAuth;
  const pendingPermission = getSkillRunnerHostBridgePermissionRequest(
    entry.requestId,
  );
  entry.session.pendingPermission = pendingPermission;
  const displayMessages = buildRunDialogDisplayMessages(entry.session.messages);
  const normalizedStatus = normalizeStatus(entry.session.status, "running");
  const backendDisplayName = resolveBackendDisplayName(
    entry.backend.id,
    entry.backend.displayName,
  );
  return {
    title: String(displayTitle || "").trim() || resolveRunWorkspaceTitle(),
    backendTitle: backendDisplayName,
    requestId: entry.requestId,
    status: normalizedStatus,
    statusSemantics: {
      normalized: normalizedStatus,
      terminal: isTerminal(normalizedStatus),
      waiting: isWaiting(normalizedStatus),
    },
    updatedAt: entry.session.updatedAt,
    engine: entry.session.engine,
    model: entry.session.model,
    pendingOwner: entry.session.pendingOwner,
    pendingInteractionId: pending?.interactionId,
    pendingKind: pending?.kind,
    pendingPrompt: pending?.prompt,
    pendingOptions: pending?.options || [],
    pendingRequiredFields: pending?.requiredFields || [],
    pendingUiHints: pending?.uiHints,
    pendingAskUser: pending?.askUser,
    pendingPermission,
    authPhase: pendingAuth?.phase,
    authSessionId: pendingAuth?.authSessionId,
    authProviderId: pendingAuth?.providerId,
    authEngine: pendingAuth?.engine,
    authPrompt: pendingAuth?.prompt,
    authChallengeKind: pendingAuth?.challengeKind,
    authAvailableMethods: pendingAuth?.availableMethods || [],
    authAskUser: pendingAuth?.askUser,
    authAcceptsChatInput: pendingAuth?.acceptsChatInput,
    authInputKind: pendingAuth?.inputKind,
    authUrl: pendingAuth?.authUrl,
    authUserCode: pendingAuth?.userCode,
    authLastError: pendingAuth?.lastError,
    authUiHints: pendingAuth?.uiHints,
    loading: entry.session.loading,
    error: entry.session.error,
    messages: displayMessages.map((entryItem) => ({
      seq: entryItem.seq,
      ts: entryItem.ts,
      role: entryItem.role,
      kind: entryItem.kind,
      text: entryItem.text,
      displayText: entryItem.displayText,
      displayFormat: entryItem.displayFormat,
      attempt: entryAttempt(entryItem),
      correlation: isObject(entryItem.raw)
        ? isObject(entryItem.raw.correlation)
          ? (entryItem.raw.correlation as Record<string, unknown>)
          : {}
        : {},
    })),
    labels: {
      assistantPanel: buildAssistantPanelLabels(),
      title: localize(
        "task-dashboard-run-workspace-title",
        "SkillRunner Workspace",
      ),
      backend: localize("task-dashboard-run-backend", "Backend"),
      requestId: localize("task-dashboard-run-request-id", "Request ID"),
      status: localize("task-manager-column-status", "Status"),
      engine: localize("task-dashboard-run-engine", "Engine"),
      model: localize("task-dashboard-run-model", "Model"),
      updatedAt: localize("task-dashboard-run-updated-at", "Updated At"),
      pendingKind: localize("task-dashboard-run-pending-kind", "Pending Kind"),
      pendingPrompt: localize("task-dashboard-run-pending-prompt", "Prompt"),
      loading: localize("task-dashboard-run-loading", "Loading"),
      error: localize("task-dashboard-run-error", "Error"),
      replyPlaceholder: localize(
        "task-dashboard-skillrunner-reply-placeholder",
        "Reply text...",
      ),
      replyPlaceholderAlternative: localize(
        "task-dashboard-run-reply-placeholder-alternative",
        "Or enter a different request...",
      ),
      reply: localize("task-dashboard-skillrunner-reply", "Reply"),
      cancel: localize("task-dashboard-skillrunner-cancel", "Cancel Run"),
      close: localize("task-manager-close", "Close"),
      chatEmpty: localize(
        "task-dashboard-skillrunner-chat-empty",
        "No chat events yet.",
      ),
      roleAgent: localize("task-dashboard-run-role-agent", "Agent"),
      roleUser: localize("task-dashboard-run-role-user", "User"),
      roleSystem: localize("task-dashboard-run-role-system", "System"),
      roleRevision: localize(
        "task-dashboard-run-role-revision",
        "Rejected Final Reply",
      ),
      runningHintTitle: localize(
        "task-dashboard-run-running-hint-title",
        "Agent is running",
      ),
      runningHintDesc: localize(
        "task-dashboard-run-running-hint-desc",
        "The backend is generating events and preparing the next response.",
      ),
      waitingUserTitle: localize(
        "task-dashboard-run-waiting-user-title",
        "User Input Required",
      ),
      waitingAuthTitle: localize(
        "task-dashboard-run-waiting-auth-title",
        "Authentication Required",
      ),
      pendingInputTitle: localize(
        "task-dashboard-run-pending-input-title",
        "Pending Input Request",
      ),
      interactionIdLabel: localize(
        "task-dashboard-run-interaction-id-label",
        "interaction_id:",
      ),
      kindLabel: localize("task-dashboard-run-kind-label", "kind:"),
      requiredFieldsPrefix: localize(
        "task-dashboard-run-required-fields-prefix",
        "Required:",
      ),
      authRequiredPrompt: localize(
        "task-dashboard-run-auth-required-prompt",
        "Authentication required.",
      ),
      authSessionIdLabel: localize(
        "task-dashboard-run-auth-session-id-label",
        "auth_session_id:",
      ),
      authEngineLabel: localize(
        "task-dashboard-run-auth-engine-label",
        "engine:",
      ),
      authProviderLabel: localize(
        "task-dashboard-run-auth-provider-label",
        "provider:",
      ),
      authUrlPrefix: localize(
        "task-dashboard-run-auth-url-prefix",
        "auth_url:",
      ),
      userCodePrefix: localize(
        "task-dashboard-run-user-code-prefix",
        "user_code:",
      ),
      lastErrorPrefix: localize(
        "task-dashboard-run-last-error-prefix",
        "last_error:",
      ),
      pendingMethodSelection: localize(
        "task-dashboard-run-pending-method-selection",
        "method-selection",
      ),
      replySend: localize("task-dashboard-run-reply-send", "Send Reply"),
      replyShortcut: localize(
        "task-dashboard-run-reply-shortcut",
        "Ctrl+Enter / Cmd+Enter to send",
      ),
      confirmYes: localize("task-dashboard-run-confirm-yes", "Yes"),
      confirmNo: localize("task-dashboard-run-confirm-no", "No"),
      authPasteApiKey: localize(
        "task-dashboard-run-auth-paste-api-key",
        "Paste API key",
      ),
      authPasteCode: localize(
        "task-dashboard-run-auth-paste-code",
        "Paste authorization code",
      ),
      authSubmitApiKey: localize(
        "task-dashboard-run-auth-submit-api-key",
        "Submit API Key",
      ),
      authSubmitCode: localize(
        "task-dashboard-run-auth-submit-code",
        "Submit Code",
      ),
      authAwaiting: localize("task-dashboard-run-auth-awaiting", "Awaiting"),
      authInProgress: localize(
        "task-dashboard-run-auth-in-progress",
        "Awaiting auth state update...",
      ),
      authImportSubmit: localize(
        "task-dashboard-run-auth-import-submit",
        "Import and Continue",
      ),
      authImportHintDefault: localize(
        "task-dashboard-run-auth-import-hint-default",
        "Upload required auth files and continue.",
      ),
      authImportRiskNotice: localize(
        "task-dashboard-run-auth-import-risk-notice",
        "Review files before importing.",
      ),
      authImportRequired: localize(
        "task-dashboard-run-auth-import-required",
        "Required",
      ),
      authImportOptional: localize(
        "task-dashboard-run-auth-import-optional",
        "Optional",
      ),
      authImportUnsupported: localize(
        "task-dashboard-run-auth-import-unsupported",
        "unsupported import target",
      ),
      thinkingTitle: localize(
        "task-dashboard-run-thinking-title",
        "Agent is thinking",
      ),
      thinkingDesc: localize(
        "task-dashboard-run-thinking-desc",
        "Running inference and preparing the next response...",
      ),
      roleThinking: localize("task-dashboard-run-role-thinking", "Thinking"),
      processReasoning: localize(
        "task-dashboard-run-process-reasoning",
        "Reasoning",
      ),
      processToolCall: localize(
        "task-dashboard-run-process-tool-call",
        "Tool Call",
      ),
      processCommandExecution: localize(
        "task-dashboard-run-process-command-execution",
        "Command Execution",
      ),
      revisionCollapsedPrefix: localize(
        "task-dashboard-run-revision-collapsed-prefix",
        "(collapsed)",
      ),
      revisionExpand: localize(
        "task-dashboard-run-revision-expand",
        "Show rejected final reply",
      ),
      revisionCollapse: localize(
        "task-dashboard-run-revision-collapse",
        "Hide rejected final reply",
      ),
      finalSummaryTitle: localize(
        "task-dashboard-run-final-summary-title",
        "Final Summary",
      ),
      authImportFailed: localize(
        "task-dashboard-run-auth-import-failed",
        "Failed to import auth files: {error}",
      ),
    },
  };
}

function buildRunWorkspaceSnapshot(
  session: RunDialogSnapshot | null,
  selectedTask?: RunWorkspaceTaskItem,
): RunWorkspaceSnapshot {
  return {
    title:
      String(selectedTask?.title || "").trim() ||
      session?.title ||
      resolveRunWorkspaceTitle(),
    labels: {
      assistantPanel: buildAssistantPanelLabels(),
      title: localize(
        "task-dashboard-run-workspace-title",
        "SkillRunner Workspace",
      ),
      completedTasksTitle: localize(
        "task-dashboard-run-completed-tasks-title",
        "Completed Tasks",
      ),
      conversationTitle: localize(
        "task-dashboard-run-conversation-title",
        "Conversation",
      ),
      closeSidebar: localize("task-manager-close", "Close"),
      tasksToggle: localize("task-dashboard-run-tasks-toggle", "Tasks"),
      selectionTasksTitle: localize(
        "task-dashboard-run-selection-tasks-title",
        "Related Tasks",
      ),
      waitingRequestId: localize(
        "task-dashboard-run-waiting-request-id",
        "Waiting for requestId",
      ),
      emptyTasks: localize(
        "task-dashboard-run-workspace-empty",
        "No SkillRunner tasks.",
      ),
      backendUnavailable: localize(
        "task-dashboard-skillrunner-backend-unavailable",
        "Backend {backend} is temporarily unreachable. Please try again later.",
      ),
    },
    workspace: {
      selectedTaskKey: runWorkspaceState.selectedTaskKey,
      groups: runWorkspaceState.groups,
    },
    session,
  };
}

function resolveRunWorkspaceBridgeMessageType(
  phase: "init" | "snapshot" | "action",
) {
  return `${runWorkspaceState.bridgeType}:${phase}` as
    | "run-dialog:init"
    | "run-dialog:snapshot"
    | "run-dialog:action"
    | "skillrunner-sidebar:init"
    | "skillrunner-sidebar:snapshot"
    | "skillrunner-sidebar:action";
}

function isRunWorkspaceHostAlive() {
  if (typeof runWorkspaceState.isHostAlive === "function") {
    return runWorkspaceState.isHostAlive();
  }
  return isWindowAlive(runWorkspaceState.hostWindow);
}

function pushSnapshot(messageType: "init" | "snapshot") {
  if (runWorkspaceState.snapshotFlushTimer) {
    clearTimeout(runWorkspaceState.snapshotFlushTimer);
    runWorkspaceState.snapshotFlushTimer = null;
    runWorkspaceState.pendingSnapshotType = undefined;
  }
  if (!runWorkspaceState.frameWindow) {
    return;
  }
  if (runWorkspaceState.currentEntry) {
    syncSessionStateFromLedger(runWorkspaceState.currentEntry);
  }
  const selectedTask = runWorkspaceState.taskIndex.get(
    runWorkspaceState.selectedTaskKey,
  )?.item;
  const session = runWorkspaceState.currentEntry
    ? buildRunDialogSnapshot(
        runWorkspaceState.currentEntry,
        selectedTask?.title,
      )
    : null;
  const snapshot = runWorkspaceState.decorateSnapshot
    ? runWorkspaceState.decorateSnapshot(
        buildRunWorkspaceSnapshot(session, selectedTask),
      )
    : buildRunWorkspaceSnapshot(session, selectedTask);
  runWorkspaceState.frameWindow.postMessage(
    {
      type: resolveRunWorkspaceBridgeMessageType(messageType),
      payload: snapshot,
    },
    "*",
  );
}

function scheduleSnapshotFlush(args: {
  messageType?: "init" | "snapshot";
  immediate?: boolean;
}) {
  const messageType = args.messageType || "snapshot";
  if (args.immediate) {
    pushSnapshot(messageType);
    return;
  }
  runWorkspaceState.pendingSnapshotType =
    runWorkspaceState.pendingSnapshotType === "init" ? "init" : messageType;
  if (runWorkspaceState.snapshotFlushTimer) {
    return;
  }
  runWorkspaceState.snapshotFlushTimer = setTimeout(() => {
    const pending = runWorkspaceState.pendingSnapshotType || "snapshot";
    runWorkspaceState.snapshotFlushTimer = null;
    runWorkspaceState.pendingSnapshotType = undefined;
    pushSnapshot(pending);
  }, ASSISTANT_SIDEBAR_STREAM_FLUSH_MS);
}

function clearRunWorkspaceHostState() {
  if (runWorkspaceState.snapshotFlushTimer) {
    clearTimeout(runWorkspaceState.snapshotFlushTimer);
    runWorkspaceState.snapshotFlushTimer = null;
    runWorkspaceState.pendingSnapshotType = undefined;
  }
  if (runWorkspaceState.removeMessageListener) {
    runWorkspaceState.removeMessageListener();
    runWorkspaceState.removeMessageListener = undefined;
  }
  runWorkspaceState.hostWindow = null;
  runWorkspaceState.frameWindow = null;
  runWorkspaceState.alertWindow = null;
  runWorkspaceState.focusHost = undefined;
  runWorkspaceState.closeHost = undefined;
  runWorkspaceState.isHostAlive = undefined;
  runWorkspaceState.decorateSnapshot = undefined;
  runWorkspaceState.resolveSidebarSelectionContext = undefined;
  runWorkspaceState.handleHostAction = undefined;
  runWorkspaceState.hostMode = "dialog";
  runWorkspaceState.bridgeType = "run-dialog";
}

function ensureRunWorkspaceSubscriptions() {
  if (!runWorkspaceState.unsubscribeTasks) {
    runWorkspaceState.unsubscribeTasks = subscribeWorkflowTasks(() => {
      void refreshWorkspaceSnapshot();
    });
  }
  if (!runWorkspaceState.unsubscribeBackendHealth) {
    runWorkspaceState.unsubscribeBackendHealth =
      subscribeSkillRunnerBackendHealth(() => {
        void refreshWorkspaceSnapshot();
      });
  }
  if (!runWorkspaceState.unsubscribeHostBridgePermissions) {
    runWorkspaceState.unsubscribeHostBridgePermissions =
      subscribeSkillRunnerHostBridgePermissionRequests(() => {
        void refreshWorkspaceSnapshot();
      });
  }
}

function attachRunWorkspaceHost(args: {
  hostMode: "dialog" | "sidebar";
  bridgeType: "run-dialog" | "skillrunner-sidebar";
  hostWindow: Window;
  frameWindow: Window | null;
  alertWindow?: Window | null;
  focusHost?: () => void;
  closeHost?: () => void;
  isHostAlive?: () => boolean;
  decorateSnapshot?: (snapshot: RunWorkspaceSnapshot) => RunWorkspaceSnapshot;
  resolveSelectionContext?: () => SkillRunnerSidebarContext | null;
  handleHostAction?: (
    envelope: RunDialogActionEnvelope,
  ) => Promise<boolean> | boolean;
}) {
  if (runWorkspaceState.removeMessageListener) {
    runWorkspaceState.removeMessageListener();
    runWorkspaceState.removeMessageListener = undefined;
  }
  runWorkspaceState.hostMode = args.hostMode;
  runWorkspaceState.bridgeType = args.bridgeType;
  runWorkspaceState.hostWindow = args.hostWindow;
  runWorkspaceState.frameWindow = args.frameWindow;
  runWorkspaceState.alertWindow = args.alertWindow || args.hostWindow;
  runWorkspaceState.focusHost = args.focusHost;
  runWorkspaceState.closeHost = args.closeHost;
  runWorkspaceState.isHostAlive = args.isHostAlive;
  runWorkspaceState.decorateSnapshot = args.decorateSnapshot;
  runWorkspaceState.resolveSidebarSelectionContext =
    args.resolveSelectionContext;
  runWorkspaceState.handleHostAction = args.handleHostAction;

  const expectedType = resolveRunWorkspaceBridgeMessageType("action");
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: unknown };
    if (!data || data.type !== expectedType) {
      return;
    }
    void handleRunWorkspaceAction(data as RunDialogActionEnvelope);
  };
  args.hostWindow.addEventListener("message", onMessage);
  runWorkspaceState.removeMessageListener = () => {
    args.hostWindow.removeEventListener("message", onMessage);
  };
  ensureRunWorkspaceSubscriptions();
}

function resolveBackendUnavailableMessage(backendDisplayName: string) {
  return localize(
    "task-dashboard-skillrunner-backend-unavailable",
    "Backend {backend} is temporarily unreachable. Please try again later.",
    {
      args: {
        backend: backendDisplayName || "-",
      },
    },
  );
}

async function startRunObserver(entry: RunDialogEntry) {
  let stopped = false;
  let observerGeneration = 1;
  let stopPromise: Promise<void> | undefined;
  let refreshChain: Promise<void> = Promise.resolve();
  let runLoopTask: Promise<void> | undefined;
  let chatStreamAbortController: AbortController | null = null;
  let chatRetryDelayMs = 800;
  let waitingAuthObserverTimer: ReturnType<typeof setInterval> | undefined;
  let waitingAuthObserverInFlight = false;
  let restartingSessionSync = false;
  const supportsAbortController = typeof AbortController === "function";
  const client = buildSkillRunnerManagementClient({
    backend: entry.backend,
    alertWindow: entry.alertWindow || undefined,
    localize,
  });
  entry.session.loading = true;
  entry.session.error = undefined;
  pushSnapshot("snapshot");

  const isObserverActive = (generation: number) =>
    !stopped && generation === observerGeneration;

  const abortCurrentChatStream = () => {
    chatStreamAbortController?.abort();
    chatStreamAbortController = null;
  };

  const settleObserverTerminalError = (error: unknown, source: string) => {
    if (!settleRunDialogEntryAsFailed({ entry, error, source })) {
      return false;
    }
    stopped = true;
    observerGeneration += 1;
    abortCurrentChatStream();
    stopWaitingAuthObserver();
    entry.unsubscribeSessionState?.();
    entry.unsubscribeSessionState = undefined;
    entry.refreshState = undefined;
    entry.refreshDisplay = undefined;
    return true;
  };

  const syncHistory = async () => {
    const generation = observerGeneration;
    const historyPayload = await client.listRunChatHistory({
      requestId: entry.requestId,
      fromSeq: entry.session.lastSeq + 1,
    });
    if (!isObserverActive(generation)) {
      return;
    }
    mergeHistoryEventsIntoSession({
      session: entry.session,
      historyPayload,
    });
  };

  const syncRunMeta = async () => {
    const generation = observerGeneration;
    try {
      const run = await client.getRun({
        requestId: entry.requestId,
      });
      if (!isObserverActive(generation)) {
        return;
      }
      entry.session.engine = String(run.engine || "").trim() || undefined;
      entry.session.model = String(run.model || "").trim() || undefined;
    } catch (error) {
      if (settleObserverTerminalError(error, "run-dialog-meta")) {
        return;
      }
      // Keep existing banner metadata when metadata refresh fails.
    }
  };

  const clearPendingState = () => {
    entry.session.pendingOwner = undefined;
    entry.session.pendingInteraction = undefined;
    entry.session.pendingAuth = undefined;
  };

  const syncPendingState = async () => {
    const generation = observerGeneration;
    const normalizedStatus = normalizeStatus(entry.session.status, "running");
    if (!isWaiting(normalizedStatus)) {
      clearPendingState();
      return {
        waitingAuthExited: false,
      };
    }
    let waitingAuthExited = false;
    try {
      const pending = (await client.getPending({
        requestId: entry.requestId,
      })) as SkillRunnerManagementPending;
      if (!isObserverActive(generation)) {
        return {
          waitingAuthExited: false,
        };
      }
      const normalizedPending = normalizeRunDialogPendingState(pending);
      let authSession: SkillRunnerManagementAuthSession | undefined;
      if (normalizedStatus === "waiting_auth") {
        try {
          authSession = await client.getAuthSession({
            requestId: entry.requestId,
          });
          if (!isObserverActive(generation)) {
            return {
              waitingAuthExited: false,
            };
          }
        } catch {
          authSession = undefined;
        }
      }
      if (normalizedStatus === "waiting_auth") {
        waitingAuthExited = hasRunDialogWaitingAuthExited({
          pending,
          authSession,
        });
      }
      normalizedPending.pendingAuth = mergePendingAuthWithSession({
        pendingAuth: normalizedPending.pendingAuth,
        authSession,
      });
      const incomingInteraction = normalizedPending.pendingInteraction;
      const incomingAuth = normalizedPending.pendingAuth;
      const hasMeaningfulInteraction =
        !!incomingInteraction &&
        (Number(incomingInteraction.interactionId || 0) > 0 ||
          !!String(incomingInteraction.kind || "").trim() ||
          !!String(incomingInteraction.prompt || "").trim() ||
          (Array.isArray(incomingInteraction.options) &&
            incomingInteraction.options.length > 0) ||
          (Array.isArray(incomingInteraction.requiredFields) &&
            incomingInteraction.requiredFields.length > 0) ||
          !!incomingInteraction.askUser ||
          (incomingInteraction.uiHints &&
            Object.keys(incomingInteraction.uiHints).length > 0));
      const hasMeaningfulAuth =
        !!incomingAuth &&
        (!!String(incomingAuth.phase || "").trim() ||
          !!String(incomingAuth.authSessionId || "").trim() ||
          !!String(incomingAuth.providerId || "").trim() ||
          typeof incomingAuth.acceptsChatInput === "boolean" ||
          !!String(incomingAuth.inputKind || "").trim() ||
          !!String(incomingAuth.authUrl || "").trim() ||
          !!String(incomingAuth.userCode || "").trim() ||
          !!String(incomingAuth.lastError || "").trim() ||
          !!String(incomingAuth.prompt || "").trim() ||
          (Array.isArray(incomingAuth.availableMethods) &&
            incomingAuth.availableMethods.length > 0) ||
          !!incomingAuth.askUser ||
          (incomingAuth.uiHints &&
            Object.keys(incomingAuth.uiHints).length > 0));
      const hasStructuredPending =
        hasMeaningfulInteraction || hasMeaningfulAuth;
      const hasCurrentStructuredPending =
        !!entry.session.pendingInteraction || !!entry.session.pendingAuth;
      if (hasStructuredPending || !hasCurrentStructuredPending) {
        entry.session.pendingOwner =
          normalizedPending.pendingOwner || normalizedStatus;
        entry.session.pendingInteraction = normalizedPending.pendingInteraction;
        entry.session.pendingAuth = normalizedPending.pendingAuth;
      } else {
        entry.session.pendingOwner =
          normalizedPending.pendingOwner ||
          entry.session.pendingOwner ||
          normalizedStatus;
      }
    } catch (error) {
      if (settleObserverTerminalError(error, "run-dialog-pending")) {
        return {
          waitingAuthExited: false,
        };
      }
      // keep last-good pending payload for waiting states
      entry.session.pendingOwner =
        entry.session.pendingOwner || normalizedStatus;
      entry.session.error = compactError(error);
    }
    return {
      waitingAuthExited,
    };
  };

  const stopWaitingAuthObserver = () => {
    if (waitingAuthObserverTimer) {
      clearInterval(waitingAuthObserverTimer);
      waitingAuthObserverTimer = undefined;
      runDialogProbeState.waitingAuthTimerCount = Math.max(
        0,
        runDialogProbeState.waitingAuthTimerCount - 1,
      );
    }
    waitingAuthObserverInFlight = false;
  };

  const restartSessionSyncAfterWaitingExit = async () => {
    if (stopped || restartingSessionSync) {
      return;
    }
    restartingSessionSync = true;
    try {
      await restartRunDialogEntrySessionSyncAfterWaitingExit(entry);
      await syncPendingState();
      await syncHistory();
    } catch (error) {
      if (
        settleObserverTerminalError(error, "run-dialog-restart-session-sync")
      ) {
        return;
      }
      entry.session.error = compactError(error);
    } finally {
      restartingSessionSync = false;
      if (!stopped) {
        pushSnapshot("snapshot");
      }
    }
  };

  const queueObserverRefresh = (runner: () => Promise<void>) => {
    refreshChain = refreshChain.then(runner, runner);
    trackRunDialogObserverTask(refreshChain.catch(() => {}));
    return refreshChain;
  };

  const syncWaitingAuthObserver = () => {
    if (stopped) {
      stopWaitingAuthObserver();
      return;
    }
    if (normalizeStatus(entry.session.status, "running") !== "waiting_auth") {
      stopWaitingAuthObserver();
      return;
    }
    if (waitingAuthObserverTimer) {
      return;
    }
    waitingAuthObserverTimer = setInterval(() => {
      if (stopped || waitingAuthObserverInFlight) {
        return;
      }
      waitingAuthObserverInFlight = true;
      void queueObserverRefresh(async () => {
        try {
          if (stopped) {
            return;
          }
          if (
            normalizeStatus(entry.session.status, "running") !== "waiting_auth"
          ) {
            stopWaitingAuthObserver();
            return;
          }
          const result = await syncPendingState();
          await syncHistory();
          if (result.waitingAuthExited) {
            stopWaitingAuthObserver();
            await restartSessionSyncAfterWaitingExit();
            return;
          }
          pushSnapshot("snapshot");
        } catch (error) {
          if (
            settleObserverTerminalError(
              error,
              "run-dialog-waiting-auth-observer",
            )
          ) {
            return;
          }
          entry.session.error = compactError(error);
          pushSnapshot("snapshot");
        } finally {
          waitingAuthObserverInFlight = false;
        }
      });
    }, WAITING_AUTH_OBSERVER_INTERVAL_MS);
    runDialogProbeState.waitingAuthTimerCount += 1;
    const timerLike = waitingAuthObserverTimer as unknown as {
      unref?: () => void;
    };
    if (typeof timerLike.unref === "function") {
      timerLike.unref();
    }
  };

  const refreshRunState = async () => {
    if (stopped) {
      return;
    }
    try {
      syncSessionStateFromLedger(entry);
      await syncRunMeta();
      await syncPendingState();
      await syncHistory();
      if (!isWaiting(normalizeStatus(entry.session.status, "running"))) {
        entry.session.error = undefined;
      }
    } catch (error) {
      if (settleObserverTerminalError(error, "run-dialog-refresh-state")) {
        return;
      }
      entry.session.error = compactError(error);
    } finally {
      if (!stopped) {
        entry.session.loading = false;
        syncWaitingAuthObserver();
        pushSnapshot("snapshot");
      }
    }
  };

  entry.refreshState = () => {
    refreshChain = refreshChain.then(async () => {
      await refreshRunState();
    });
    return refreshChain;
  };

  entry.refreshDisplay = () => {
    refreshChain = refreshChain.then(async () => {
      if (stopped) {
        return;
      }
      await syncRunMeta();
      await syncPendingState();
      await syncHistory();
      pushSnapshot("snapshot");
    });
    return refreshChain;
  };

  entry.unsubscribeSessionState = subscribeSkillRunnerSessionState({
    backendId: entry.backend.id,
    requestId: entry.requestId,
    listener: (payload) => {
      refreshChain = refreshChain.then(async () => {
        if (stopped) {
          return;
        }
        const previous = normalizeStatus(entry.session.status, "running");
        applyRunDialogSessionStatus({
          entry,
          rawStatus: payload.status,
        });
        if (payload.updatedAt) {
          entry.session.updatedAt = payload.updatedAt;
        }
        await syncRunMeta();
        const next = normalizeStatus(entry.session.status, "running");
        if (isWaiting(next) && !isWaiting(previous)) {
          await syncPendingState();
        } else if (!isWaiting(next) && isWaiting(previous)) {
          clearPendingState();
          entry.session.error = undefined;
        }
        syncWaitingAuthObserver();
        pushSnapshot("snapshot");
      });
    },
  });

  const handleSseFrame = (frame: SkillRunnerManagementSseFrame) => {
    if (stopped) {
      return;
    }
    if (frame.event === "snapshot") {
      const payload = isObject(frame.data) ? frame.data : {};
      const cursor = Number(payload.cursor || 0);
      if (Number.isFinite(cursor) && cursor > entry.session.lastSeq) {
        entry.session.lastSeq = Math.floor(cursor);
      }
      return;
    }
    if (
      frame.event !== "chat_event" ||
      !frame.data ||
      typeof frame.data !== "object"
    ) {
      return;
    }
    const event = frame.data as Record<string, unknown>;
    if (shouldRefreshRunDialogStateFromChatEvent(event)) {
      const eventType = String(event.type || event.kind || event.event || "")
        .trim()
        .toLowerCase();
      if (
        eventType.startsWith("auth.") &&
        normalizeStatus(entry.session.status, "running") === "waiting_auth"
      ) {
        stopWaitingAuthObserver();
        void queueObserverRefresh(async () => {
          await restartSessionSyncAfterWaitingExit();
        });
      } else {
        ensureSkillRunnerSessionSync({
          backend: entry.backend,
          requestId: entry.requestId,
        });
      }
    }
    const conversationEntry = toRunDialogConversationEntry({
      event,
      lastSeq: entry.session.lastSeq,
      seenKeys: entry.session.seenMessageKeys,
    });
    if (!conversationEntry) {
      return;
    }
    entry.session.messages.push(conversationEntry);
    if (conversationEntry.seq > entry.session.lastSeq) {
      entry.session.lastSeq = conversationEntry.seq;
    }
    if (entry.session.messages.length > 500) {
      entry.session.messages = entry.session.messages.slice(-500);
    }
    scheduleSnapshotFlush({
      immediate:
        conversationEntry.kind !== "assistant_message" &&
        conversationEntry.kind !== "assistant_process",
    });
  };

  const runLoop = async () => {
    let initialized = false;
    while (!stopped) {
      if (!initialized) {
        try {
          if (entry.refreshState) {
            await entry.refreshState();
          } else {
            await refreshRunState();
          }
        } catch (error) {
          entry.session.error = compactError(error);
        } finally {
          initialized = true;
          entry.session.loading = false;
          pushSnapshot("snapshot");
        }
      }
      try {
        if (supportsAbortController) {
          chatStreamAbortController = new AbortController();
        }
        await client.streamRunChat({
          requestId: entry.requestId,
          cursor: entry.session.lastSeq,
          onFrame: handleSseFrame,
          signal: chatStreamAbortController?.signal,
        });
        chatStreamAbortController = null;
        chatRetryDelayMs = 800;
        if (!stopped && !isTerminalStatus(entry.session.status)) {
          await syncHistory();
          pushSnapshot("snapshot");
        }
      } catch (error) {
        chatStreamAbortController = null;
        if (isAbortErrorLike(error)) {
          if (stopped) {
            break;
          }
          continue;
        }
        if (settleObserverTerminalError(error, "run-dialog-chat-stream")) {
          break;
        }
        entry.session.error = compactError(error);
        pushSnapshot("snapshot");
        if (stopped) {
          break;
        }
        await sleep(chatRetryDelayMs);
        chatRetryDelayMs = Math.min(30000, chatRetryDelayMs * 2);
      }
    }
  };
  runLoopTask = trackRunDialogObserverTask(runLoop());
  return async () => {
    if (stopPromise) {
      return stopPromise;
    }
    stopPromise = (async () => {
      stopped = true;
      observerGeneration += 1;
      if (runWorkspaceState.snapshotFlushTimer) {
        clearTimeout(runWorkspaceState.snapshotFlushTimer);
        runWorkspaceState.snapshotFlushTimer = null;
        runWorkspaceState.pendingSnapshotType = undefined;
      }
      abortCurrentChatStream();
      stopWaitingAuthObserver();
      entry.unsubscribeSessionState?.();
      entry.unsubscribeSessionState = undefined;
      entry.refreshState = undefined;
      entry.refreshDisplay = undefined;
      if (supportsAbortController) {
        await Promise.allSettled([
          runLoopTask ?? Promise.resolve(),
          refreshChain.catch(() => {}),
        ]);
        return;
      }
      await refreshChain.catch(() => {});
    })();
    await stopPromise;
  };
}

async function handleRunDialogActionForEntry(
  entry: RunDialogEntry,
  envelope: RunDialogActionEnvelope,
) {
  const action = String(envelope.action || "").trim();
  const payload = envelope.payload || {};
  if (!action) {
    return;
  }
  if (action === "ready") {
    pushSnapshot("init");
    return;
  }
  if (action === "close-dialog") {
    runWorkspaceState.closeHost?.();
    return;
  }
  if (action === "resolve-permission") {
    resolveSkillRunnerHostBridgePermissionRequest({
      runRequestId:
        String(payload.requestId || "").trim() ||
        String(entry.requestId).trim(),
      permissionRequestId: String(payload.permissionRequestId || "").trim(),
      outcome: payload.outcome === "selected" ? "selected" : "cancelled",
      optionId: String(payload.optionId || "").trim(),
    });
    pushSnapshot("snapshot");
    return;
  }
  if (action === "cancel-run") {
    if (isTerminalStatus(entry.session.status)) {
      pushSnapshot("snapshot");
      return;
    }
    try {
      const client = buildSkillRunnerManagementClient({
        backend: entry.backend,
        alertWindow: entry.alertWindow || undefined,
        localize,
      });
      await client.cancelRun({
        requestId: entry.requestId,
      });
    } catch (error) {
      if (
        settleRunDialogEntryAsFailed({
          entry,
          error,
          source: "run-dialog-cancel",
        })
      ) {
        await stopRunDialogEntryObserver(entry);
        return;
      }
      entry.alertWindow?.alert?.(
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
    pushSnapshot("snapshot");
    return;
  }
  if (action === "reply-run") {
    const mode = String(payload.mode || "interaction")
      .trim()
      .toLowerCase();
    if (mode === "auth") {
      const authSessionId = String(
        payload.authSessionId || entry.session.pendingAuth?.authSessionId || "",
      ).trim();
      if (!authSessionId) {
        return;
      }
      const replyKind = String(payload.replyKind || "").trim() || "text";
      const replyText = String(payload.replyText || "").trim();
      const selection = isObject(payload.selection)
        ? payload.selection
        : undefined;
      const submission = isObject(payload.submission)
        ? payload.submission
        : undefined;
      let submitted = false;
      try {
        const client = buildSkillRunnerManagementClient({
          backend: entry.backend,
          alertWindow: entry.alertWindow || undefined,
          localize,
        });
        await client.submitReply({
          requestId: entry.requestId,
          payload: {
            mode: "auth",
            auth_session_id: authSessionId,
            ...(selection ? { selection } : {}),
            ...(submission
              ? { submission }
              : replyText
                ? {
                    submission: {
                      kind:
                        normalizeAuthInputKind(replyKind) || "auth_code_or_url",
                      value: replyText,
                    },
                  }
                : {}),
          },
        });
        submitted = true;
      } catch (error) {
        if (
          settleRunDialogEntryAsFailed({
            entry,
            error,
            source: "run-dialog-auth-reply",
          })
        ) {
          await stopRunDialogEntryObserver(entry);
          return;
        }
        entry.alertWindow?.alert?.(
          localize(
            "task-dashboard-skillrunner-reply-failed",
            "Failed to submit reply: {error}",
            {
              args: {
                error: compactError(error),
              },
            },
          ),
        );
      }
      if (submitted && entry.refreshDisplay) {
        await restartRunDialogEntrySessionSyncAfterWaitingExit(entry);
        await entry.refreshDisplay();
      } else {
        pushSnapshot("snapshot");
      }
      return;
    }
    const interactionId = Number(
      payload.interactionId ||
        entry.session.pendingInteraction?.interactionId ||
        0,
    );
    if (!Number.isFinite(interactionId) || interactionId <= 0) {
      return;
    }
    const resolvedResponse = resolveRunDialogInteractionResponse({
      replyText: payload.replyText,
      ...(Object.prototype.hasOwnProperty.call(payload, "responseValue")
        ? {
            responseValue: payload.responseValue,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "option")
        ? {
            option: payload.option,
          }
        : {}),
      responseObject: payload.responseObject,
    });
    const responseText =
      !resolvedResponse.hasResponse && isObject(resolvedResponse.response)
        ? String(resolvedResponse.response.text || "").trim()
        : "";
    if (!resolvedResponse.hasResponse && !responseText) {
      entry.alertWindow?.alert?.(
        localize(
          "task-dashboard-skillrunner-reply-required",
          "Reply text is required.",
        ),
      );
      return;
    }
    let submitted = false;
    try {
      const client = buildSkillRunnerManagementClient({
        backend: entry.backend,
        alertWindow: entry.alertWindow || undefined,
        localize,
      });
      await client.submitReply({
        requestId: entry.requestId,
        payload: {
          mode: "interaction",
          interaction_id: interactionId,
          response: resolvedResponse.response,
        },
      });
      submitted = true;
    } catch (error) {
      if (
        settleRunDialogEntryAsFailed({
          entry,
          error,
          source: "run-dialog-interaction-reply",
        })
      ) {
        await stopRunDialogEntryObserver(entry);
        return;
      }
      entry.alertWindow?.alert?.(
        localize(
          "task-dashboard-skillrunner-reply-failed",
          "Failed to submit reply: {error}",
          {
            args: {
              error: compactError(error),
            },
          },
        ),
      );
    }
    if (submitted && entry.refreshDisplay) {
      ensureSkillRunnerSessionSync({
        backend: entry.backend,
        requestId: entry.requestId,
      });
      await entry.refreshDisplay();
    } else {
      pushSnapshot("snapshot");
    }
    return;
  }
  if (action === "auth-import-run") {
    const filesRaw = Array.isArray(payload.files) ? payload.files : [];
    const files = filesRaw
      .map((entryItem) =>
        isObject(entryItem)
          ? {
              name: String(entryItem.name || "").trim(),
              content_base64: String(entryItem.contentBase64 || "").trim(),
            }
          : null,
      )
      .filter(
        (entryItem): entryItem is { name: string; content_base64: string } =>
          !!entryItem && !!entryItem.name && !!entryItem.content_base64,
      );
    if (files.length === 0) {
      return;
    }
    let imported = false;
    try {
      const client = buildSkillRunnerManagementClient({
        backend: entry.backend,
        alertWindow: entry.alertWindow || undefined,
        localize,
      });
      await client.submitAuthImport({
        requestId: entry.requestId,
        providerId:
          String(payload.providerId || "").trim() ||
          entry.session.pendingAuth?.providerId,
        files,
      });
      imported = true;
    } catch (error) {
      if (
        settleRunDialogEntryAsFailed({
          entry,
          error,
          source: "run-dialog-auth-import",
        })
      ) {
        await stopRunDialogEntryObserver(entry);
        return;
      }
      entry.alertWindow?.alert?.(
        localize(
          "task-dashboard-run-auth-import-failed",
          "Failed to import auth files: {error}",
          {
            args: {
              error: compactError(error),
            },
          },
        ),
      );
    }
    if (imported && entry.refreshDisplay) {
      await restartRunDialogEntrySessionSyncAfterWaitingExit(entry);
      await entry.refreshDisplay();
    } else {
      pushSnapshot("snapshot");
    }
  }
}

async function stopRunDialogEntryObserver(entry: RunDialogEntry | undefined) {
  if (!entry) {
    return;
  }
  if (entry.stopObserver) {
    await entry.stopObserver();
    entry.stopObserver = undefined;
  }
  if (entry.unsubscribeSessionState) {
    entry.unsubscribeSessionState();
    entry.unsubscribeSessionState = undefined;
  }
  entry.refreshState = undefined;
  entry.refreshDisplay = undefined;
}

async function shutdownRunDialogRuntime() {
  if (isRunWorkspaceHostAlive()) {
    runWorkspaceState.closeHost?.();
  }
  if (runWorkspaceState.unsubscribeTasks) {
    runWorkspaceState.unsubscribeTasks();
    runWorkspaceState.unsubscribeTasks = undefined;
  }
  if (runWorkspaceState.unsubscribeBackendHealth) {
    runWorkspaceState.unsubscribeBackendHealth();
    runWorkspaceState.unsubscribeBackendHealth = undefined;
  }
  if (runWorkspaceState.unsubscribeHostBridgePermissions) {
    runWorkspaceState.unsubscribeHostBridgePermissions();
    runWorkspaceState.unsubscribeHostBridgePermissions = undefined;
  }
  await stopRunDialogEntryObserver(runWorkspaceState.currentEntry);
  runWorkspaceState.currentEntry = undefined;
  runWorkspaceState.frameWindow = null;
  runWorkspaceState.selectedTaskKey = "";
  runWorkspaceState.requestedTaskKey = "";
  runWorkspaceState.latestOpenTarget = undefined;
  runWorkspaceState.groups = [];
  runWorkspaceState.taskIndex.clear();
  runWorkspaceState.groupCollapsed.clear();
  runWorkspaceState.finishedCollapsed.clear();
  clearRunWorkspaceHostState();
  runDialogMap.clear();
}

function buildRunDialogEntry(args: {
  key: string;
  backend: BackendInstance;
  requestId: string;
  initialStatus?: string;
}): RunDialogEntry {
  return {
    key: args.key,
    backend: args.backend,
    requestId: args.requestId,
    alertWindow: runWorkspaceState.alertWindow,
    session: {
      requestId: args.requestId,
      status: normalizeStatus(args.initialStatus, "running"),
      messages: [],
      seenMessageKeys: new Set<string>(),
      lastSeq: 0,
      loading: true,
    },
  };
}

async function selectWorkspaceTask(taskKey: string) {
  const key = String(taskKey || "").trim();
  if (!key) {
    await stopRunDialogEntryObserver(runWorkspaceState.currentEntry);
    runWorkspaceState.currentEntry = undefined;
    runWorkspaceState.selectedTaskKey = "";
    pushSnapshot("snapshot");
    return;
  }
  const target = runWorkspaceState.taskIndex.get(key);
  if (!target || !target.item.selectable || !target.item.requestId) {
    return;
  }
  if (isSkillRunnerBackendReconcileFlagged(target.backend.id)) {
    showWorkflowToast({
      text: resolveBackendUnavailableMessage(
        resolveBackendDisplayName(
          target.backend.id,
          target.backend.displayName,
        ),
      ),
      type: "error",
    });
    return;
  }
  if (runWorkspaceState.currentEntry?.key === key) {
    return;
  }
  await stopRunDialogEntryObserver(runWorkspaceState.currentEntry);

  const requestId = String(target.item.requestId || "").trim();
  const entry =
    runDialogMap.get(key) ||
    buildRunDialogEntry({
      key,
      backend: target.backend,
      requestId,
      initialStatus: target.item.status,
    });
  entry.alertWindow = runWorkspaceState.alertWindow;
  runDialogMap.set(key, entry);
  runWorkspaceState.currentEntry = entry;
  runWorkspaceState.selectedTaskKey = key;
  pushSnapshot("snapshot");
  entry.stopObserver = await startRunObserver(entry);
}

async function refreshWorkspaceSnapshot(args?: {
  forceInit?: boolean;
  requestedTaskKey?: string;
  selectionChanged?: boolean;
}) {
  if (args?.requestedTaskKey) {
    runWorkspaceState.requestedTaskKey = String(
      args.requestedTaskKey || "",
    ).trim();
  }
  runWorkspaceState.refreshChain = runWorkspaceState.refreshChain.then(
    async () => {
      const model = await buildRunWorkspaceModel();
      runWorkspaceState.groups = model.groups;
      runWorkspaceState.taskIndex = model.index;
      if (
        runWorkspaceState.latestOpenTarget &&
        model.index.has(runWorkspaceState.latestOpenTarget.key)
      ) {
        runWorkspaceState.latestOpenTarget = undefined;
      }
      const selectionContext =
        runWorkspaceState.hostMode === "sidebar"
          ? runWorkspaceState.resolveSidebarSelectionContext?.() || null
          : null;
      const nextSelected =
        runWorkspaceState.hostMode === "sidebar"
          ? pickRunWorkspaceSelectedTaskKeyForSidebar({
              groups: model.groups,
              index: model.index,
              requestedTaskKey: runWorkspaceState.requestedTaskKey,
              currentTaskKey: runWorkspaceState.selectedTaskKey,
              selectionChanged: args?.selectionChanged === true,
              context: selectionContext,
            })
          : pickRunWorkspaceSelectedTaskKey({
              groups: model.groups,
              index: model.index,
              requestedTaskKey: runWorkspaceState.requestedTaskKey,
              currentTaskKey: runWorkspaceState.selectedTaskKey,
            });
      runWorkspaceState.requestedTaskKey = "";
      await selectWorkspaceTask(nextSelected);
      pushSnapshot(args?.forceInit ? "init" : "snapshot");
    },
  );
  await runWorkspaceState.refreshChain;
}

async function handleRunWorkspaceAction(envelope: RunDialogActionEnvelope) {
  const action = String(envelope.action || "").trim();
  const payload = envelope.payload || {};
  if (!action) {
    return;
  }
  if (action === "ready") {
    await refreshWorkspaceSnapshot({
      forceInit: true,
    });
    return;
  }
  if (action === "select-task") {
    await refreshWorkspaceSnapshot({
      requestedTaskKey: String(payload.taskKey || "").trim(),
    });
    return;
  }
  if (action === "archive-run") {
    const requestId = String(payload.requestId || "").trim();
    const record = getSkillRunnerRequestLedgerRecord(requestId);
    if (record && isTerminal(record.snapshot)) {
      archiveSkillRunnerRequestLedgerRecord(requestId);
      await refreshWorkspaceSnapshot({
        requestedTaskKey: "",
      });
    } else {
      await refreshWorkspaceSnapshot();
    }
    return;
  }
  if (action === "copy-request-id") {
    const requestId =
      String(payload.requestId || "").trim() ||
      String(runWorkspaceState.currentEntry?.requestId || "").trim();
    copyText(requestId);
    return;
  }
  if (action === "copy-diagnostics") {
    const session = runWorkspaceState.currentEntry
      ? buildRunDialogSnapshot(runWorkspaceState.currentEntry)
      : null;
    copyText(JSON.stringify(buildRunWorkspaceSnapshot(session), null, 2));
    return;
  }
  if (action === "toggle-group-collapse") {
    const backendId = String(payload.backendId || "").trim();
    if (backendId) {
      const group = runWorkspaceState.groups.find(
        (entry) => String(entry.backendId || "").trim() === backendId,
      );
      if (group?.disabled) {
        return;
      }
      const next = runWorkspaceState.groupCollapsed.get(backendId) !== true;
      runWorkspaceState.groupCollapsed.set(backendId, next);
      await refreshWorkspaceSnapshot();
    }
    return;
  }
  if (action === "toggle-finished-collapse") {
    const backendId = String(payload.backendId || "").trim();
    if (backendId) {
      const current = runWorkspaceState.finishedCollapsed.has(backendId)
        ? runWorkspaceState.finishedCollapsed.get(backendId) === true
        : true;
      runWorkspaceState.finishedCollapsed.set(backendId, !current);
      await refreshWorkspaceSnapshot();
    }
    return;
  }
  if (action === "toggle-drawer-section") {
    if (runWorkspaceState.handleHostAction) {
      const handled = await runWorkspaceState.handleHostAction(envelope);
      if (handled) {
        return;
      }
    }
    return;
  }
  if (runWorkspaceState.handleHostAction) {
    const handled = await runWorkspaceState.handleHostAction(envelope);
    if (handled) {
      return;
    }
  }
  const entry = runWorkspaceState.currentEntry;
  if (!entry) {
    return;
  }
  await handleRunDialogActionForEntry(entry, envelope);
}

export async function dispatchRunWorkspaceAction(
  envelope: RunDialogActionEnvelope,
) {
  await handleRunWorkspaceAction(envelope);
}

export async function attachSkillRunnerSidebarHost(args: {
  hostWindow: Window;
  frameWindow: Window | null;
  alertWindow?: Window | null;
  focusHost?: () => void;
  isHostAlive?: () => boolean;
  decorateSnapshot?: (snapshot: RunWorkspaceSnapshot) => RunWorkspaceSnapshot;
  resolveSelectionContext?: () => SkillRunnerSidebarContext | null;
  handleHostAction?: (
    envelope: RunDialogActionEnvelope,
  ) => Promise<boolean> | boolean;
}) {
  attachRunWorkspaceHost({
    hostMode: "sidebar",
    bridgeType: "skillrunner-sidebar",
    hostWindow: args.hostWindow,
    frameWindow: args.frameWindow,
    alertWindow: args.alertWindow,
    focusHost: args.focusHost,
    isHostAlive: args.isHostAlive,
    decorateSnapshot: args.decorateSnapshot,
    resolveSelectionContext: args.resolveSelectionContext,
    handleHostAction: args.handleHostAction,
  });
  await refreshWorkspaceSnapshot({
    forceInit: true,
    selectionChanged: true,
  });
}

export async function focusSkillRunnerWorkspace(args?: {
  backend?: BackendInstance;
  requestId?: string;
  selectionChanged?: boolean;
}) {
  const backendId = String(args?.backend?.id || "").trim();
  const requestId = String(args?.requestId || "").trim();
  if (backendId && requestId && args?.backend) {
    runWorkspaceState.latestOpenTarget = {
      key: resolveRunDialogKey(backendId, requestId),
      backend: args.backend,
      requestId,
    };
    runWorkspaceState.requestedTaskKey = resolveRunDialogKey(
      backendId,
      requestId,
    );
  }
  if (isRunWorkspaceHostAlive()) {
    runWorkspaceState.focusHost?.();
    await refreshWorkspaceSnapshot({
      requestedTaskKey: runWorkspaceState.requestedTaskKey || undefined,
      selectionChanged: args?.selectionChanged === true,
    });
  }
}

export async function openSkillRunnerRunDialog(args?: {
  backend?: BackendInstance;
  requestId?: string;
}) {
  const backend = args?.backend;
  const backendId = String(backend?.id || "").trim();
  const requestId = String(args?.requestId || "").trim();
  if (backendId && requestId) {
    if (isSkillRunnerBackendReconcileFlagged(backendId)) {
      showWorkflowToast({
        text: resolveBackendUnavailableMessage(
          resolveBackendDisplayName(backendId, backend?.displayName),
        ),
        type: "error",
      });
      return;
    }
    const dialogKey = resolveRunDialogKey(backendId, requestId);
    runWorkspaceState.latestOpenTarget = {
      key: dialogKey,
      backend: backend as BackendInstance,
      requestId,
    };
    runWorkspaceState.requestedTaskKey = dialogKey;
  }

  if (isRunWorkspaceHostAlive() && runWorkspaceState.hostMode === "dialog") {
    runWorkspaceState.focusHost?.();
    await refreshWorkspaceSnapshot({
      requestedTaskKey:
        backendId && requestId
          ? resolveRunDialogKey(backendId, requestId)
          : undefined,
    });
    return;
  }

  const pageUrl = resolveRunDialogPageUrl();
  const title = localize(
    "task-dashboard-run-dialog-title",
    "Run Details: {requestId}",
    {
      args: { requestId },
    },
  );
  let dialogHelper: DialogHelper | undefined;

  const dialogData: Record<string, unknown> = {
    loadCallback: () => {
      const doc = dialogHelper?.window?.document;
      const dialogWindow = dialogHelper?.window;
      if (!doc || !dialogWindow) {
        return;
      }
      const root = doc.getElementById(
        "zs-skillrunner-run-dialog-root",
      ) as HTMLElement | null;
      if (!root) {
        return;
      }
      root.innerHTML = "";
      const frame = createRunDialogFrame(doc, pageUrl);
      root.appendChild(frame);
      frame.addEventListener("load", () => {
        const frameWindow = resolveFrameWindow(frame);
        if (!frameWindow) {
          dialogWindow.alert?.(
            localize(
              "task-dashboard-open-management-failed",
              "Run dialog host failed to resolve frame window.",
              {
                args: { error: "frame_window_unavailable" },
              },
            ),
          );
          return;
        }
        attachRunWorkspaceHost({
          hostMode: "dialog",
          bridgeType: "run-dialog",
          hostWindow: dialogWindow,
          frameWindow,
          alertWindow: dialogWindow,
          focusHost: () => {
            dialogWindow.focus();
          },
          closeHost: () => {
            dialogWindow.close();
          },
          isHostAlive: () => isWindowAlive(dialogWindow),
        });
        void refreshWorkspaceSnapshot({
          forceInit: true,
          requestedTaskKey:
            backendId && requestId
              ? resolveRunDialogKey(backendId, requestId)
              : undefined,
        });
      });
      pushSnapshot("snapshot");
    },
    unloadCallback: () => {
      void stopRunDialogEntryObserver(runWorkspaceState.currentEntry);
      runWorkspaceState.currentEntry = undefined;
      runWorkspaceState.selectedTaskKey = "";
      runWorkspaceState.requestedTaskKey = "";
      runWorkspaceState.latestOpenTarget = undefined;
      runWorkspaceState.groups = [];
      runWorkspaceState.taskIndex.clear();
      runDialogMap.clear();
      clearRunWorkspaceHostState();
    },
  };

  const dialogBuilder = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-skillrunner-run-dialog-root",
      styles: {
        width: "1380px",
        height: "860px",
        padding: "0",
        margin: "0",
        display: "flex",
      },
    })
    .addButton(localize("task-manager-close", "Close"), "close")
    .setDialogData(dialogData);
  dialogHelper = dialogBuilder.open(title);

  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;
}

export async function resetSkillRunnerRunDialogForTests() {
  await shutdownRunDialogRuntime();
}

export async function shutdownSkillRunnerRunDialogRuntime() {
  await shutdownRunDialogRuntime();
}

export function getSkillRunnerRunDialogRuntimeForTests() {
  let sessionStateSubscriptionCount = 0;
  for (const entry of runDialogMap.values()) {
    if (entry.unsubscribeSessionState) {
      sessionStateSubscriptionCount += 1;
    }
  }
  return {
    entryCount: runDialogMap.size,
    observerInflightTaskCount: runDialogProbeState.observerInflightTaskCount,
    waitingAuthTimerCount: runDialogProbeState.waitingAuthTimerCount,
    sessionStateSubscriptionCount,
  };
}

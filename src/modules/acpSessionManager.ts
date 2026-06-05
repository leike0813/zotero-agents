import { loadBackendsRegistry } from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import { ACP_BACKEND_TYPE, ACP_OPENCODE_BACKEND_ID } from "../config/defaults";
import {
  AcpAuthRequiredError,
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
  type AcpConnectionAdapterFactoryArgs,
} from "./acpConnectionAdapter";
import {
  clearAcpConversationState,
  deleteAcpConversationState,
  listAllAcpChatSessions,
  listAcpChatSessions,
  listStoredVisibleAcpChatSessions,
  loadAcpConversationState,
  loadAcpFrontendState,
  renameAcpConversationState,
  resolveAcpChatRuntimePaths,
  saveAcpChatSessionIndex,
  saveAcpConversationState,
  saveAcpFrontendState,
} from "./acpConversationStore";
import { describeAcpError, serializeAcpError } from "./acpDiagnostics";
import {
  cloneAcpConversationItem,
  cloneAcpSelectableOption,
  createEmptyAcpConversationSnapshot,
  normalizeAcpStatus,
  type AcpAuthMethod,
  type AcpChatSessionSummary,
  type AcpChatDisplayMode,
  type AcpConversationItem,
  type AcpConversationMessageItem,
  type AcpConversationPlanItem,
  type AcpConversationSnapshot,
  type AcpConversationStatusItem,
  type AcpConversationThoughtItem,
  type AcpConversationToolCallItem,
  type AcpDiagnosticsBundle,
  type AcpDiagnosticsEntry,
  type AcpFrontendSnapshot,
  type AcpHostContext,
  type AcpSelectableOption,
} from "./acpTypes";
import type { RequestPermissionOutcome } from "./acpProtocol";
import { ensureRuntimeDirectory } from "./runtimePersistence";
import {
  getZoteroMcpHealthSnapshot,
  getZoteroMcpServerStatus,
  resetZoteroMcpServerForTests,
  shutdownZoteroMcpServer,
} from "./zoteroMcpServer";
import { getHostBridgeServerStatus } from "./hostBridgeServer";
import {
  applyHostBridgeCliEnvToBackend,
  materializeHostBridgeCliRunInjection,
  summarizeHostBridgeCliRunInjection,
} from "./hostBridgeCliInjection";
import {
  registerAcpConversationHostBridgePermissionHandler,
  resetAcpConversationHostBridgePermissionHandlersForTests,
} from "./acpConversationHostBridgePermissionRegistry";

type AcpSnapshotListener = (snapshot: AcpConversationSnapshot) => void;
type AcpFrontendSnapshotListener = (snapshot: AcpFrontendSnapshot) => void;

export type AcpSessionSlot = {
  backendId: string;
  adapter: AcpConnectionAdapter | null;
  snapshot: AcpConversationSnapshot;
  unsubscribeUpdate: (() => void) | null;
  unsubscribeClose: (() => void) | null;
  unsubscribeDiagnostics: (() => void) | null;
  unsubscribePermission: (() => void) | null;
  unsubscribeHostBridgePermission: (() => void) | null;
  hostBridgeCliPromptSnippet: string;
  suppressCloseEvent: boolean;
  promptCancelInFlight: boolean;
  promptCancelCloseExpected: boolean;
  promptCancelCloseTimer: ReturnType<typeof setTimeout> | null;
  activeAssistantItemId: string;
  activeThoughtItemId: string;
  activePlanItemId: string;
  pendingPermissionResolver:
    | ((outcome: RequestPermissionOutcome) => void)
    | null;
  suppressSessionLoadReplay: boolean;
  uiEmitTimer: ReturnType<typeof setTimeout> | null;
  persistTimer: ReturnType<typeof setTimeout> | null;
};

type AcpEmitOptions = {
  persist?: boolean;
  throttleUi?: boolean;
  throttlePersist?: boolean;
};

let adapterFactory: (
  args: AcpConnectionAdapterFactoryArgs,
) => Promise<AcpConnectionAdapter> = createAcpConnectionAdapter;
let initialized = false;
let activeBackendId = "";
let cachedAcpBackends: BackendInstance[] = [];
const slots = new Map<string, AcpSessionSlot>();
const listeners = new Set<AcpSnapshotListener>();
const frontendListeners = new Set<AcpFrontendSnapshotListener>();
const MAX_DIAGNOSTICS = 40;
const STREAMING_UI_EMIT_THROTTLE_MS = 80;
const STREAMING_PERSIST_THROTTLE_MS = 1500;

function nowIso() {
  return new Date().toISOString();
}

function nextOpaqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeBackendId(value: unknown) {
  return String(value || "").trim();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function compactError(error: unknown) {
  return describeAcpError(error, "unknown error").replace(/\s+/g, " ").trim();
}

function serializeRuntimeHost() {
  const runtime = globalThis as {
    Zotero?: { version?: string; isWin?: boolean };
    navigator?: { userAgent?: string; platform?: string };
    process?: { platform?: string };
    ChromeUtils?: unknown;
    TextEncoder?: unknown;
    TextDecoder?: unknown;
    AbortController?: unknown;
    ReadableStream?: unknown;
    WritableStream?: unknown;
  };
  return {
    zoteroVersion: String(runtime.Zotero?.version || "").trim() || undefined,
    platform:
      String(runtime.navigator?.platform || "").trim() ||
      String(runtime.process?.platform || "").trim() ||
      undefined,
    isWin: runtime.Zotero?.isWin,
    hasChromeUtils: typeof runtime.ChromeUtils !== "undefined",
    hasTextEncoder: typeof runtime.TextEncoder === "function",
    hasTextDecoder: typeof runtime.TextDecoder === "function",
    hasAbortController: typeof runtime.AbortController === "function",
    hasReadableStream: typeof runtime.ReadableStream === "function",
    hasWritableStream: typeof runtime.WritableStream === "function",
  };
}

function markPromptCancelled(slot: AcpSessionSlot) {
  slot.snapshot.busy = false;
  slot.snapshot.status = "connected";
  slot.snapshot.lastStopReason = "cancelled";
  slot.snapshot.pendingPermissionRequest = null;
  finalizeStreamingItems(slot, "complete", "cancelled");
}

function clearPromptCancelCloseExpectation(slot: AcpSessionSlot) {
  slot.promptCancelInFlight = false;
  slot.promptCancelCloseExpected = false;
  if (slot.promptCancelCloseTimer) {
    clearTimeout(slot.promptCancelCloseTimer);
    slot.promptCancelCloseTimer = null;
  }
}

function expectPromptCancelClose(slot: AcpSessionSlot) {
  slot.promptCancelCloseExpected = true;
  if (slot.promptCancelCloseTimer) {
    clearTimeout(slot.promptCancelCloseTimer);
  }
  slot.promptCancelCloseTimer = setTimeout(() => {
    slot.promptCancelCloseExpected = false;
    slot.promptCancelCloseTimer = null;
  }, 1500);
}

function cloneSnapshotValue(value: AcpConversationSnapshot) {
  return {
    ...value,
    authMethods: value.authMethods.map((entry) => ({ ...entry })),
    authMethodIds: [...value.authMethodIds],
    modeOptions: value.modeOptions.map((entry) => ({ ...entry })),
    currentMode: cloneAcpSelectableOption(value.currentMode),
    modelOptions: value.modelOptions.map((entry) => ({ ...entry })),
    currentModel: cloneAcpSelectableOption(value.currentModel),
    displayModelOptions: value.displayModelOptions.map((entry) => ({
      ...entry,
    })),
    currentDisplayModel: cloneAcpSelectableOption(value.currentDisplayModel),
    reasoningEffortOptions: value.reasoningEffortOptions.map((entry) => ({
      ...entry,
    })),
    currentReasoningEffort: cloneAcpSelectableOption(
      value.currentReasoningEffort,
    ),
    availableCommands: value.availableCommands.map((entry) => ({ ...entry })),
    usage: value.usage ? { ...value.usage } : null,
    pendingPermissionRequest: value.pendingPermissionRequest
      ? {
          ...value.pendingPermissionRequest,
          options: value.pendingPermissionRequest.options.map((entry) => ({
            ...entry,
          })),
        }
      : null,
    diagnostics: value.diagnostics.map((entry) => ({ ...entry })),
    items: value.items.map((entry) => cloneAcpConversationItem(entry)),
    lastHostContext: value.lastHostContext
      ? JSON.parse(JSON.stringify(value.lastHostContext))
      : null,
    mcpServer: getZoteroMcpServerStatus(),
    mcpHealth: getZoteroMcpHealthSnapshot(),
    hostBridge: getHostBridgeServerStatus(),
  } satisfies AcpConversationSnapshot;
}

function ensureInitialized() {
  if (initialized) {
    return;
  }
  activeBackendId =
    loadAcpFrontendState().activeBackendId || ACP_OPENCODE_BACKEND_ID;
  getOrCreateSlot(activeBackendId);
  initialized = true;
}

function hydrateSnapshot(backendId: string, conversationId?: string) {
  const restored = loadAcpConversationState(backendId, conversationId);
  const snapshot = {
    ...createEmptyAcpConversationSnapshot(),
    ...restored.snapshot,
    backendId,
    items: restored.items,
    updatedAt: restored.snapshot.updatedAt || nowIso(),
  };
  if (snapshot.conversationId && !snapshot.conversationCreatedAt) {
    snapshot.conversationCreatedAt = nowIso();
  }
  const paths = resolveAcpChatRuntimePaths(
    backendId,
    snapshot.conversationId || undefined,
  );
  snapshot.agentWorkspaceDir = paths.agentWorkspaceDir;
  snapshot.conversationStorageDir = paths.conversationStorageDir;
  snapshot.sessionCwd = paths.agentWorkspaceDir;
  snapshot.workspaceDir = paths.agentWorkspaceDir;
  snapshot.runtimeDir = paths.runtimeDir;
  snapshot.sessionId = "";
  snapshot.remoteSessionId = String(snapshot.remoteSessionId || "").trim();
  snapshot.remoteSessionRestoreStatus =
    snapshot.remoteSessionRestoreStatus || "none";
  snapshot.status = normalizeAcpStatus(snapshot.status);
  if (
    snapshot.status === "prompting" ||
    snapshot.status === "permission-required" ||
    snapshot.status === "connected" ||
    snapshot.status === "checking-command" ||
    snapshot.status === "spawning" ||
    snapshot.status === "initializing"
  ) {
    snapshot.status = "idle";
    snapshot.busy = false;
    snapshot.pendingPermissionRequest = null;
  }
  snapshot.chatDisplayMode =
    snapshot.chatDisplayMode === "bubble" ? "bubble" : "plain";
  snapshot.statusExpanded = snapshot.statusExpanded === true;
  snapshot.authMethodIds = snapshot.authMethods.map((entry) => entry.id);
  deriveModelEffortState(snapshot);
  return snapshot;
}

function resetSlotTransientState(slot: AcpSessionSlot) {
  slot.activeAssistantItemId = "";
  slot.activeThoughtItemId = "";
  slot.activePlanItemId = "";
  slot.pendingPermissionResolver = null;
  slot.suppressSessionLoadReplay = false;
}

function getOrCreateSlot(backendIdRaw?: string) {
  const backendId =
    normalizeBackendId(backendIdRaw) ||
    activeBackendId ||
    ACP_OPENCODE_BACKEND_ID;
  const existing = slots.get(backendId);
  if (existing) {
    return existing;
  }
  const slot: AcpSessionSlot = {
    backendId,
    adapter: null,
    snapshot: hydrateSnapshot(backendId),
    unsubscribeUpdate: null,
    unsubscribeClose: null,
    unsubscribeDiagnostics: null,
    unsubscribePermission: null,
    unsubscribeHostBridgePermission: null,
    hostBridgeCliPromptSnippet: "",
    suppressCloseEvent: false,
    promptCancelInFlight: false,
    promptCancelCloseExpected: false,
    promptCancelCloseTimer: null,
    activeAssistantItemId: "",
    activeThoughtItemId: "",
    activePlanItemId: "",
    pendingPermissionResolver: null,
    suppressSessionLoadReplay: false,
    uiEmitTimer: null,
    persistTimer: null,
  };
  slots.set(backendId, slot);
  return slot;
}

function setSlotPendingPermissionRequest(
  slot: AcpSessionSlot,
  request: {
    requestId: string;
    sessionId: string;
    toolCallId: string;
    toolTitle: string;
    source?: string;
    summary?: string;
    detail?: string;
    requestedAt: string;
    options: Array<{
      optionId: string;
      kind: string;
      name: string;
      description?: string;
    }>;
    resolve: (outcome: RequestPermissionOutcome) => void;
  },
) {
  slot.pendingPermissionResolver = request.resolve;
  slot.snapshot.pendingPermissionRequest = {
    requestId: request.requestId,
    sessionId: request.sessionId,
    toolCallId: request.toolCallId,
    toolTitle: request.toolTitle,
    source: request.source,
    summary: request.summary,
    detail: request.detail,
    requestedAt: request.requestedAt,
    options: request.options.map((entry) => ({ ...entry })),
  };
  slot.snapshot.status = "permission-required";
  slot.snapshot.busy = true;
  emitSlotSnapshot(slot);
}

function bindHostBridgePermissionForSlot(slot: AcpSessionSlot) {
  const conversationId = String(slot.snapshot.conversationId || "").trim();
  slot.unsubscribeHostBridgePermission?.();
  slot.unsubscribeHostBridgePermission = null;
  if (!conversationId) {
    return;
  }
  slot.unsubscribeHostBridgePermission =
    registerAcpConversationHostBridgePermissionHandler(
      conversationId,
      (request) => {
        setSlotPendingPermissionRequest(slot, request);
      },
    );
}

function getActiveSlot() {
  ensureInitialized();
  return getOrCreateSlot(activeBackendId);
}

function isActiveSlot(slot: AcpSessionSlot) {
  return (
    normalizeBackendId(slot.backendId) === normalizeBackendId(activeBackendId)
  );
}

function updateSnapshotTimestamp(slot: AcpSessionSlot) {
  slot.snapshot.authMethodIds = slot.snapshot.authMethods.map(
    (entry) => entry.id,
  );
  slot.snapshot.updatedAt = nowIso();
}

function persistSlotSnapshotNow(slot: AcpSessionSlot) {
  if (slot.snapshot.backendId && slot.snapshot.conversationId) {
    saveAcpConversationState(slot.snapshot);
  }
}

function notifyConversationListenersNow(slot: AcpSessionSlot) {
  if (!isActiveSlot(slot)) {
    return;
  }
  const cloned = cloneSnapshotValue(slot.snapshot);
  for (const listener of listeners) {
    listener(cloned);
  }
}

function notifyFrontendListenersNow() {
  const frontend = buildFrontendSnapshot();
  for (const listener of frontendListeners) {
    listener(frontend);
  }
}

function flushPendingPersistence(slot: AcpSessionSlot) {
  if (slot.persistTimer) {
    clearTimeout(slot.persistTimer);
    slot.persistTimer = null;
  }
  persistSlotSnapshotNow(slot);
}

function flushPendingUiEmit(slot: AcpSessionSlot) {
  if (slot.uiEmitTimer) {
    clearTimeout(slot.uiEmitTimer);
    slot.uiEmitTimer = null;
  }
  notifyConversationListenersNow(slot);
  notifyFrontendListenersNow();
}

function schedulePersistenceFlush(slot: AcpSessionSlot) {
  if (slot.persistTimer) {
    return;
  }
  slot.persistTimer = setTimeout(() => {
    slot.persistTimer = null;
    persistSlotSnapshotNow(slot);
  }, STREAMING_PERSIST_THROTTLE_MS);
}

function scheduleUiEmit(slot: AcpSessionSlot) {
  if (slot.uiEmitTimer) {
    return;
  }
  slot.uiEmitTimer = setTimeout(() => {
    slot.uiEmitTimer = null;
    notifyConversationListenersNow(slot);
    notifyFrontendListenersNow();
  }, STREAMING_UI_EMIT_THROTTLE_MS);
}

function emitSlotSnapshot(slot: AcpSessionSlot, options: AcpEmitOptions = {}) {
  updateSnapshotTimestamp(slot);
  const persist = options.persist !== false;
  if (persist) {
    if (options.throttlePersist) {
      schedulePersistenceFlush(slot);
    } else {
      flushPendingPersistence(slot);
    }
  }
  if (options.throttleUi) {
    scheduleUiEmit(slot);
  } else {
    flushPendingUiEmit(slot);
  }
}

async function refreshAcpBackends() {
  const loaded = await loadBackendsRegistry();
  if (loaded.fatalError) {
    throw new Error(loaded.fatalError);
  }
  cachedAcpBackends = loaded.backends.filter(
    (entry) => normalizeBackendId(entry.type) === ACP_BACKEND_TYPE,
  );
  const ids = new Set(cachedAcpBackends.map((entry) => entry.id));
  if ((!activeBackendId || !ids.has(activeBackendId)) && cachedAcpBackends[0]) {
    activeBackendId = cachedAcpBackends[0].id;
    saveAcpFrontendState({ activeBackendId });
  }
  for (const backend of cachedAcpBackends) {
    const slot = getOrCreateSlot(backend.id);
    slot.snapshot.backend = backend;
    applyRuntimeOptionsCache(slot, backend);
  }
  return cachedAcpBackends;
}

async function resolveBackendForSlot(slot: AcpSessionSlot) {
  const backends = await refreshAcpBackends();
  const backend = backends.find((entry) => entry.id === slot.backendId) || null;
  if (!backend) {
    throw new Error(`ACP backend "${slot.backendId}" is not available`);
  }
  const paths = resolveAcpChatRuntimePaths(
    backend.id,
    slot.snapshot.conversationId,
  );
  slot.snapshot.backend = backend;
  slot.snapshot.backendId = backend.id;
  slot.snapshot.agentWorkspaceDir = paths.agentWorkspaceDir;
  slot.snapshot.conversationStorageDir = paths.conversationStorageDir;
  slot.snapshot.sessionCwd = paths.agentWorkspaceDir;
  slot.snapshot.workspaceDir = paths.agentWorkspaceDir;
  slot.snapshot.runtimeDir = paths.runtimeDir;
  applyRuntimeOptionsCache(slot, backend);
  return backend;
}

function appendDiagnostic(slot: AcpSessionSlot, entry: AcpDiagnosticsEntry) {
  slot.snapshot.diagnostics = [
    ...slot.snapshot.diagnostics,
    { ...entry },
  ].slice(-MAX_DIAGNOSTICS);
  slot.snapshot.lastLifecycleEvent = String(entry.kind || "").trim();
  if (String(entry.kind || "").trim() === "stderr") {
    slot.snapshot.stderrTail = String(entry.detail || "").trim();
  }
}

function appendErrorDiagnostic(args: {
  slot: AcpSessionSlot;
  kind: string;
  message: string;
  error: unknown;
  stage: string;
}) {
  const serialized = serializeAcpError(args.error, args.stage);
  appendDiagnostic(args.slot, {
    id: nextOpaqueId("acp-diag"),
    ts: nowIso(),
    kind: args.kind,
    level: "error",
    message: args.message,
    detail: serialized.detail,
    stage: serialized.stage,
    errorName: serialized.errorName,
    stack: serialized.stack,
    cause:
      serialized.cause === undefined
        ? undefined
        : typeof serialized.cause === "string"
          ? serialized.cause
          : JSON.stringify(serialized.cause),
    code: serialized.code,
    data: serialized.data,
    raw: serialized.raw,
  });
}

function upsertStatusItem(
  slot: AcpSessionSlot,
  args: {
    level: "info" | "warn" | "error";
    label: string;
    text: string;
  },
) {
  const item: AcpConversationStatusItem = {
    id: nextOpaqueId("acp-status"),
    kind: "status",
    level: args.level,
    label: args.label,
    text: args.text,
    createdAt: nowIso(),
  };
  slot.snapshot.items = [...slot.snapshot.items, item];
}

function pushItem(slot: AcpSessionSlot, item: AcpConversationItem) {
  slot.snapshot.items = [...slot.snapshot.items, item];
}

function getLatestConversationItem(slot: AcpSessionSlot) {
  return slot.snapshot.items[slot.snapshot.items.length - 1];
}

function getLatestActiveAssistantItem(slot: AcpSessionSlot) {
  const latest = getLatestConversationItem(slot);
  return latest?.kind === "message" &&
    latest.role === "assistant" &&
    latest.id === slot.activeAssistantItemId
    ? (latest as AcpConversationMessageItem)
    : undefined;
}

function getLatestActiveThoughtItem(slot: AcpSessionSlot) {
  const latest = getLatestConversationItem(slot);
  return latest?.kind === "thought" && latest.id === slot.activeThoughtItemId
    ? (latest as AcpConversationThoughtItem)
    : undefined;
}

function normalizeToolCallState(
  status: unknown,
): AcpConversationToolCallItem["state"] {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (value === "pending" || value === "queued") {
    return "pending";
  }
  if (value === "failed" || value === "error" || value === "cancelled") {
    return "failed";
  }
  if (value === "in_progress" || value === "running") {
    return "in_progress";
  }
  return "completed";
}

function toolCallStateRank(state: AcpConversationToolCallItem["state"]) {
  switch (state) {
    case "failed":
      return 4;
    case "completed":
      return 3;
    case "in_progress":
      return 2;
    case "pending":
    default:
      return 1;
  }
}

function isTerminalPlanStatus(status: string) {
  return [
    "complete",
    "completed",
    "done",
    "succeeded",
    "success",
    "skipped",
    "cancelled",
    "canceled",
    "failed",
    "error",
  ].includes(
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  );
}

function isGenericToolDisplayText(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
  return (
    !normalized ||
    normalized === "tool" ||
    normalized === "tool call" ||
    normalized === "other" ||
    normalized === "[]" ||
    normalized === "{}" ||
    /^call [a-z0-9]+$/i.test(normalized) ||
    /^call_[a-z0-9_-]+$/i.test(String(value || "").trim()) ||
    /^toolu_[a-z0-9_-]+$/i.test(String(value || "").trim())
  );
}

function readRecordValue(value: unknown, key: string) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function isEmptyStructuredToolValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  );
}

function stringifyToolCallDetail(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (isEmptyStructuredToolValue(value)) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value || "").trim();
    }
  }
  if (typeof value === "object") {
    const preferredKeys = [
      "description",
      "title",
      "command",
      "query",
      "path",
      "filePath",
      "file_path",
      "name",
      "text",
    ];
    for (const key of preferredKeys) {
      const nested: string = stringifyToolCallDetail(
        (value as Record<string, unknown>)[key],
      );
      if (nested && !isGenericToolDisplayText(nested)) {
        return nested;
      }
    }
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value || "").trim();
  }
}

function shortenToolCallSummary(value: string) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 180
    ? `${normalized.slice(0, 177)}...`
    : normalized;
}

function firstNonGenericToolText(values: unknown[]) {
  for (const value of values) {
    const text = shortenToolCallSummary(stringifyToolCallDetail(value));
    if (text && !isGenericToolDisplayText(text)) {
      return text;
    }
  }
  return "";
}

function extractToolName(
  update: Record<string, unknown>,
  fallbackTitle: string,
  fallbackKind?: string,
) {
  return (
    firstNonGenericToolText([
      update.name,
      update.tool,
      update.functionName,
      update.function_name,
      update.toolName,
      fallbackKind,
      update.summary,
      fallbackTitle,
    ]) || "Tool"
  );
}

function extractToolInputSummary(
  update: Record<string, unknown>,
  fallbackTitle: string,
) {
  const metadata = update.metadata;
  return firstNonGenericToolText([
    update.rawInput,
    update.input,
    update.arguments,
    update.args,
    update.parameters,
    update.params,
    readRecordValue(metadata, "description"),
    readRecordValue(metadata, "title"),
    update.description,
    fallbackTitle,
  ]);
}

function extractToolResultSummary(update: Record<string, unknown>) {
  return firstNonGenericToolText([
    update.rawOutput,
    update.output,
    update.result,
    update.content,
    update.message,
    update.detail,
    update.summary,
  ]);
}

function upsertToolCallItem(
  slot: AcpSessionSlot,
  update: Record<string, unknown>,
) {
  const toolCallId = String(update.toolCallId || "").trim();
  const nextState = normalizeToolCallState(update.status);
  const title = String(update.title || "Tool Call").trim() || "Tool Call";
  const toolKind = String(update.kind || "").trim() || undefined;
  const toolName = extractToolName(update, title, toolKind);
  const inputSummary = extractToolInputSummary(update, title);
  const resultSummary = extractToolResultSummary(update);
  const now = nowIso();
  const target = toolCallId
    ? (slot.snapshot.items.find(
        (entry) =>
          entry.kind === "tool_call" && entry.toolCallId === toolCallId,
      ) as AcpConversationToolCallItem | undefined)
    : undefined;
  if (!target) {
    const frozenInputSummary = inputSummary || undefined;
    pushItem(slot, {
      id: nextOpaqueId("acp-tool"),
      kind: "tool_call",
      toolCallId,
      title,
      toolKind,
      toolName,
      inputSummary: frozenInputSummary,
      resultSummary: resultSummary || undefined,
      state: nextState,
      createdAt: now,
      summary: frozenInputSummary || resultSummary || undefined,
    });
    return;
  }
  if (
    !isGenericToolDisplayText(title) ||
    isGenericToolDisplayText(target.title)
  ) {
    target.title = title || target.title;
  }
  if (toolKind) {
    target.toolKind = toolKind;
  }
  if (
    !isGenericToolDisplayText(toolName) ||
    isGenericToolDisplayText(target.toolName)
  ) {
    target.toolName = toolName || target.toolName;
  }
  if (inputSummary && !target.inputSummary) {
    target.inputSummary = inputSummary;
  }
  if (resultSummary) {
    target.resultSummary = resultSummary;
  }
  if (target.inputSummary) {
    target.summary = target.inputSummary;
  } else if (resultSummary && !target.summary) {
    target.summary = resultSummary;
  }
  if (toolCallStateRank(nextState) >= toolCallStateRank(target.state)) {
    target.state = nextState;
  }
  target.updatedAt = now;
}

function finalizeStreamingItems(
  slot: AcpSessionSlot,
  finalState: "complete" | "error",
  planTerminalStatus: "cancelled" | "skipped" = "skipped",
) {
  if (slot.activeAssistantItemId) {
    const target = slot.snapshot.items.find(
      (entry) =>
        entry.id === slot.activeAssistantItemId && entry.kind === "message",
    ) as AcpConversationMessageItem | undefined;
    if (target) {
      target.state = finalState;
      target.updatedAt = nowIso();
    }
    slot.activeAssistantItemId = "";
  }
  if (slot.activeThoughtItemId) {
    const target = slot.snapshot.items.find(
      (entry) =>
        entry.id === slot.activeThoughtItemId && entry.kind === "thought",
    ) as AcpConversationThoughtItem | undefined;
    if (target) {
      target.state = finalState;
      target.updatedAt = nowIso();
    }
    slot.activeThoughtItemId = "";
  }
  if (slot.activePlanItemId) {
    const target = slot.snapshot.items.find(
      (entry) => entry.id === slot.activePlanItemId && entry.kind === "plan",
    ) as AcpConversationPlanItem | undefined;
    if (target) {
      target.entries = target.entries.map((entry) =>
        isTerminalPlanStatus(entry.status)
          ? entry
          : {
              ...entry,
              status: planTerminalStatus,
            },
      );
      target.updatedAt = nowIso();
    }
    slot.activePlanItemId = "";
  }
}

function normalizeModeOption(args: {
  id: string;
  name?: string | null;
  description?: string | null;
}): AcpSelectableOption {
  return {
    id: String(args.id || "").trim(),
    label: String(args.name || args.id || "").trim(),
    description: String(args.description || "").trim() || undefined,
  };
}

function normalizeCachedSelectableOptions(
  value: unknown,
): AcpSelectableOption[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      const source =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const id = String(source.id || source.value || "").trim();
      const label = String(
        source.label || source.name || source.title || id,
      ).trim();
      const description = String(source.description || "").trim();
      return id && label
        ? {
            id,
            label,
            ...(description ? { description } : {}),
          }
        : null;
    })
    .filter((entry): entry is AcpSelectableOption => entry !== null);
}

function applyRuntimeOptionsCache(
  slot: AcpSessionSlot,
  backend: BackendInstance,
) {
  const cache = backend.acp?.runtimeOptionsCache;
  if (!cache) {
    return;
  }

  if (slot.snapshot.modeOptions.length === 0) {
    const modeOptions = normalizeCachedSelectableOptions(cache.modes);
    if (modeOptions.length > 0) {
      slot.snapshot.modeOptions = modeOptions;
      const currentModeId = String(
        slot.snapshot.currentMode?.id ||
          cache.currentModeId ||
          modeOptions[0]?.id ||
          "",
      ).trim();
      slot.snapshot.currentMode =
        modeOptions.find((entry) => entry.id === currentModeId) ||
        modeOptions[0];
    }
  }

  if (slot.snapshot.modelOptions.length === 0) {
    const rawModelOptions = normalizeCachedSelectableOptions(cache.rawModels);
    if (rawModelOptions.length > 0) {
      slot.snapshot.modelOptions = rawModelOptions;
      const currentRawModelId = String(
        slot.snapshot.currentModel?.id ||
          cache.currentRawModelId ||
          rawModelOptions[0]?.id ||
          "",
      ).trim();
      slot.snapshot.currentModel =
        rawModelOptions.find((entry) => entry.id === currentRawModelId) ||
        rawModelOptions[0];
      deriveModelEffortState(slot.snapshot);
    }
  }
}

function applyModeState(
  slot: AcpSessionSlot,
  value: {
    currentModeId?: string | null;
    availableModes?: Array<{
      id: string;
      name: string;
      description?: string | null;
    }> | null;
  },
) {
  const incomingModes = Array.isArray(value.availableModes)
    ? value.availableModes
        .map((entry) =>
          normalizeModeOption({
            id: entry.id,
            name: entry.name,
            description: entry.description,
          }),
        )
        .filter((entry) => entry.id && entry.label)
    : [];
  const availableModes =
    incomingModes.length > 0 ? incomingModes : slot.snapshot.modeOptions;
  slot.snapshot.modeOptions = availableModes;
  const currentModeId = String(
    value.currentModeId || slot.snapshot.currentMode?.id || "",
  ).trim();
  slot.snapshot.currentMode =
    availableModes.find((entry) => entry.id === currentModeId) ||
    (currentModeId
      ? {
          id: currentModeId,
          label: currentModeId,
        }
      : undefined);
}

const KNOWN_REASONING_EFFORT_ORDER = [
  "default",
  "low",
  "medium",
  "high",
  "xhigh",
];

type ParsedModelEffort = {
  raw: AcpSelectableOption;
  baseId: string;
  baseLabel: string;
  effortId: string;
};

type FoldedModelGroup = {
  baseId: string;
  baseLabel: string;
  variants: ParsedModelEffort[];
};

function normalizeEffortId(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function toTitleCase(value: string) {
  return String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stripKnownEffortSuffix(value: string, effortId: string) {
  const escaped = effortId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(value || "")
    .replace(new RegExp(`\\s*@\\s*${escaped}\\s*$`, "i"), "")
    .replace(new RegExp(`\\s*\\(\\s*${escaped}\\s*\\)\\s*$`, "i"), "")
    .replace(new RegExp(`\\s+-\\s+${escaped}\\s*$`, "i"), "")
    .replace(new RegExp(`[-_]${escaped}\\s*$`, "i"), "")
    .replace(new RegExp(`\\s+${escaped}\\s*$`, "i"), "")
    .trim();
}

function parseEffortFromModelText(value: string) {
  const text = String(value || "").trim();
  const atMatch = /^(.*)@([A-Za-z][A-Za-z0-9_-]*)$/.exec(text);
  if (atMatch && atMatch[1].trim() && atMatch[2].trim()) {
    return {
      baseId: atMatch[1].trim(),
      effortId: normalizeEffortId(atMatch[2]),
    };
  }

  const known = KNOWN_REASONING_EFFORT_ORDER.join("|");
  const bracketMatch = new RegExp(`^(.*)\\(\\s*(${known})\\s*\\)$`, "i").exec(
    text,
  );
  if (bracketMatch && bracketMatch[1].trim()) {
    return {
      baseId: bracketMatch[1].trim(),
      effortId: normalizeEffortId(bracketMatch[2]),
    };
  }

  const dashMatch = new RegExp(`^(.*)(?:\\s+-\\s+|[-_])(${known})$`, "i").exec(
    text,
  );
  if (dashMatch && dashMatch[1].trim()) {
    return {
      baseId: dashMatch[1].trim(),
      effortId: normalizeEffortId(dashMatch[2]),
    };
  }

  return null;
}

function parseModelEffortVariant(
  option: AcpSelectableOption,
): ParsedModelEffort | null {
  const parsed =
    parseEffortFromModelText(option.id) ||
    parseEffortFromModelText(option.label);
  if (!parsed) {
    return null;
  }
  const strippedLabel =
    stripKnownEffortSuffix(option.label, parsed.effortId) ||
    stripKnownEffortSuffix(parsed.baseId, parsed.effortId);
  return {
    raw: option,
    baseId: parsed.baseId,
    baseLabel: strippedLabel || parsed.baseId,
    effortId: parsed.effortId,
  };
}

function compareEffortIds(left: string, right: string) {
  const leftIndex = KNOWN_REASONING_EFFORT_ORDER.indexOf(left);
  const rightIndex = KNOWN_REASONING_EFFORT_ORDER.indexOf(right);
  if (leftIndex >= 0 || rightIndex >= 0) {
    return (
      (leftIndex >= 0 ? leftIndex : 999) - (rightIndex >= 0 ? rightIndex : 999)
    );
  }
  return left.localeCompare(right);
}

function buildFoldedModelGroups(modelOptions: AcpSelectableOption[]) {
  const grouped = new Map<string, FoldedModelGroup>();
  for (const option of modelOptions) {
    const parsed = parseModelEffortVariant(option);
    if (!parsed) {
      continue;
    }
    const existing = grouped.get(parsed.baseId);
    if (existing) {
      existing.variants.push(parsed);
    } else {
      grouped.set(parsed.baseId, {
        baseId: parsed.baseId,
        baseLabel: parsed.baseLabel,
        variants: [parsed],
      });
    }
  }

  for (const [baseId, group] of Array.from(grouped.entries())) {
    const uniqueEfforts = new Set(
      group.variants.map((entry) => entry.effortId),
    );
    if (uniqueEfforts.size <= 1) {
      grouped.delete(baseId);
      continue;
    }
    group.variants = group.variants
      .slice()
      .sort((left, right) => compareEffortIds(left.effortId, right.effortId));
  }
  return grouped;
}

function deriveModelEffortState(snapshot: AcpConversationSnapshot) {
  const rawOptions = snapshot.modelOptions.map((entry) => ({ ...entry }));
  const groups = buildFoldedModelGroups(rawOptions);
  const displayOptions: AcpSelectableOption[] = [];
  const emittedGroups = new Set<string>();

  for (const option of rawOptions) {
    const parsed = parseModelEffortVariant(option);
    if (parsed && groups.has(parsed.baseId)) {
      if (!emittedGroups.has(parsed.baseId)) {
        const group = groups.get(parsed.baseId);
        displayOptions.push({
          id: parsed.baseId,
          label: group?.baseLabel || parsed.baseLabel || parsed.baseId,
          description: option.description,
        });
        emittedGroups.add(parsed.baseId);
      }
      continue;
    }
    displayOptions.push({ ...option });
  }

  snapshot.displayModelOptions = displayOptions;
  const currentRawId = String(snapshot.currentModel?.id || "").trim();
  const currentParsed = currentRawId
    ? parseModelEffortVariant({
        id: currentRawId,
        label: snapshot.currentModel?.label || currentRawId,
        description: snapshot.currentModel?.description,
      })
    : null;
  const activeGroup =
    currentParsed && groups.has(currentParsed.baseId)
      ? groups.get(currentParsed.baseId)
      : null;

  if (activeGroup) {
    snapshot.currentDisplayModel = displayOptions.find(
      (entry) => entry.id === activeGroup.baseId,
    ) || {
      id: activeGroup.baseId,
      label: activeGroup.baseLabel,
    };
    snapshot.reasoningEffortOptions = activeGroup.variants.map((entry) => ({
      id: entry.effortId,
      label: toTitleCase(entry.effortId),
      description: entry.raw.description,
    }));
    snapshot.currentReasoningEffort =
      snapshot.reasoningEffortOptions.find(
        (entry) => entry.id === currentParsed?.effortId,
      ) || snapshot.reasoningEffortOptions[0];
    return;
  }

  snapshot.currentDisplayModel =
    displayOptions.find((entry) => entry.id === currentRawId) ||
    (snapshot.currentModel ? { ...snapshot.currentModel } : undefined);
  snapshot.reasoningEffortOptions = [];
  snapshot.currentReasoningEffort = undefined;
}

function resolveRawModelIdForSelection(
  snapshot: AcpConversationSnapshot,
  displayModelId: string,
  effortIdRaw?: string,
) {
  const displayId = String(displayModelId || "").trim();
  if (!displayId) {
    return "";
  }
  const groups = buildFoldedModelGroups(snapshot.modelOptions);
  const group = groups.get(displayId);
  if (group) {
    const currentVariant = snapshot.currentModel
      ? parseModelEffortVariant(snapshot.currentModel)
      : null;
    const effortId =
      normalizeEffortId(effortIdRaw) ||
      normalizeEffortId(snapshot.currentReasoningEffort?.id) ||
      normalizeEffortId(currentVariant?.effortId);
    const selected =
      group.variants.find((entry) => entry.effortId === effortId) ||
      group.variants.find((entry) => entry.effortId === "default") ||
      group.variants[0];
    return selected?.raw.id || displayId;
  }
  return (
    snapshot.modelOptions.find((entry) => entry.id === displayId)?.id ||
    displayId
  );
}

function applyModelState(
  slot: AcpSessionSlot,
  value: {
    currentModelId?: string | null;
    availableModels?: Array<{
      modelId: string;
      name: string;
      description?: string | null;
    }> | null;
  },
) {
  const incomingModels = Array.isArray(value.availableModels)
    ? value.availableModels
        .map((entry) => ({
          id: String(entry.modelId || "").trim(),
          label: String(entry.name || entry.modelId || "").trim(),
          description: String(entry.description || "").trim() || undefined,
        }))
        .filter((entry) => entry.id && entry.label)
    : [];
  const availableModels =
    incomingModels.length > 0 ? incomingModels : slot.snapshot.modelOptions;
  slot.snapshot.modelOptions = availableModels;
  const currentModelId = String(
    value.currentModelId || slot.snapshot.currentModel?.id || "",
  ).trim();
  slot.snapshot.currentModel =
    availableModels.find((entry) => entry.id === currentModelId) ||
    (currentModelId
      ? {
          id: currentModelId,
          label: currentModelId,
        }
      : undefined);
  deriveModelEffortState(slot.snapshot);
}

function handleSessionUpdate(
  slot: AcpSessionSlot,
  event: {
    sessionId: string;
    update: {
      sessionUpdate: string;
      [key: string]: unknown;
    };
  },
) {
  if (
    String(event.sessionId || "").trim() !==
    String(slot.snapshot.sessionId || "").trim()
  ) {
    return;
  }
  const update = event.update;
  if (slot.suppressSessionLoadReplay) {
    switch (String(update.sessionUpdate || "").trim()) {
      case "agent_message_chunk":
      case "agent_thought_chunk":
      case "user_message_chunk":
      case "tool_call":
      case "tool_call_update":
      case "plan":
        slot.snapshot.lastLifecycleEvent = "session_load_replay_suppressed";
        return;
      default:
        break;
    }
  }
  switch (String(update.sessionUpdate || "").trim()) {
    case "agent_message_chunk": {
      slot.snapshot.lastLifecycleEvent = "agent_message_chunk";
      const content = update.content as
        | { type?: string; text?: string }
        | undefined;
      if (String(content?.type || "").trim() !== "text") {
        return;
      }
      const chunk = String(content?.text || "");
      if (!chunk) {
        return;
      }
      let target = getLatestActiveAssistantItem(slot);
      if (!target) {
        target = {
          id: nextOpaqueId("acp-msg-assistant"),
          kind: "message",
          role: "assistant",
          text: "",
          createdAt: nowIso(),
          state: "streaming",
        };
        slot.activeAssistantItemId = target.id;
        pushItem(slot, target);
      }
      target.text += chunk;
      target.state = "streaming";
      target.updatedAt = nowIso();
      emitSlotSnapshot(slot, { throttleUi: true, throttlePersist: true });
      return;
    }
    case "agent_thought_chunk": {
      slot.snapshot.lastLifecycleEvent = "agent_thought_chunk";
      const content = update.content as
        | { type?: string; text?: string }
        | undefined;
      if (String(content?.type || "").trim() !== "text") {
        return;
      }
      const chunk = String(content?.text || "");
      if (!chunk) {
        return;
      }
      let target = getLatestActiveThoughtItem(slot);
      if (!target) {
        target = {
          id: nextOpaqueId("acp-thought"),
          kind: "thought",
          text: "",
          createdAt: nowIso(),
          state: "streaming",
        };
        slot.activeThoughtItemId = target.id;
        pushItem(slot, target);
      }
      target.text += chunk;
      target.state = "streaming";
      target.updatedAt = nowIso();
      emitSlotSnapshot(slot, { throttleUi: true, throttlePersist: true });
      return;
    }
    case "tool_call": {
      slot.snapshot.lastLifecycleEvent = "tool_call";
      upsertToolCallItem(slot, update);
      emitSlotSnapshot(slot);
      return;
    }
    case "tool_call_update": {
      slot.snapshot.lastLifecycleEvent = "tool_call_update";
      upsertToolCallItem(slot, update);
      emitSlotSnapshot(slot);
      return;
    }
    case "plan": {
      slot.snapshot.lastLifecycleEvent = "plan";
      const entries = Array.isArray(update.entries)
        ? update.entries.map((entry) => ({
            content: String(entry?.content || ""),
            priority: String(entry?.priority || ""),
            status: String(entry?.status || ""),
          }))
        : [];
      let target = slot.snapshot.items.find(
        (entry) => entry.id === slot.activePlanItemId && entry.kind === "plan",
      ) as AcpConversationPlanItem | undefined;
      if (!target) {
        target = {
          id: nextOpaqueId("acp-plan"),
          kind: "plan",
          entries,
          createdAt: nowIso(),
        };
        slot.activePlanItemId = target.id;
        pushItem(slot, target);
      } else {
        target.entries = entries;
        target.updatedAt = nowIso();
      }
      emitSlotSnapshot(slot);
      return;
    }
    case "available_commands_update": {
      slot.snapshot.lastLifecycleEvent = "available_commands_update";
      slot.snapshot.availableCommands = Array.isArray(update.availableCommands)
        ? update.availableCommands
            .map((entry) => ({
              name: String(entry?.name || "").trim(),
              title: String(entry?.title || "").trim() || undefined,
              description: String(entry?.description || "").trim() || undefined,
            }))
            .filter((entry) => entry.name)
        : [];
      emitSlotSnapshot(slot);
      return;
    }
    case "current_mode_update": {
      slot.snapshot.lastLifecycleEvent = "current_mode_update";
      applyModeState(slot, {
        currentModeId: String(update.currentModeId || "").trim(),
      });
      emitSlotSnapshot(slot);
      return;
    }
    case "config_option_update": {
      slot.snapshot.lastLifecycleEvent = "config_option_update";
      upsertStatusItem(slot, {
        level: "info",
        label: "Config",
        text: "Session configuration options updated.",
      });
      emitSlotSnapshot(slot);
      return;
    }
    case "session_info_update": {
      slot.snapshot.lastLifecycleEvent = "session_info_update";
      slot.snapshot.sessionTitle = String(update.title || "").trim();
      slot.snapshot.sessionUpdatedAt = String(update.updatedAt || "").trim();
      emitSlotSnapshot(slot);
      return;
    }
    case "usage_update": {
      slot.snapshot.lastLifecycleEvent = "usage_update";
      const used = Number(update.used || 0);
      const size = Number(update.size || 0);
      if (Number.isFinite(used) && Number.isFinite(size)) {
        slot.snapshot.usage = {
          used: Math.max(0, Math.floor(used)),
          size: Math.max(0, Math.floor(size)),
        };
      }
      emitSlotSnapshot(slot);
      return;
    }
    default:
      return;
  }
}

function bindAdapter(slot: AcpSessionSlot, nextAdapter: AcpConnectionAdapter) {
  slot.unsubscribeUpdate = nextAdapter.onUpdate(async (event) => {
    handleSessionUpdate(
      slot,
      event as Parameters<typeof handleSessionUpdate>[1],
    );
  });
  slot.unsubscribeClose = nextAdapter.onClose((event) => {
    if (slot.suppressCloseEvent) {
      return;
    }
    const cancelledPrompt =
      slot.promptCancelInFlight === true ||
      slot.promptCancelCloseExpected === true;
    slot.adapter = null;
    slot.pendingPermissionResolver = null;
    if (cancelledPrompt) {
      clearPromptCancelCloseExpectation(slot);
      markPromptCancelled(slot);
      slot.snapshot.lastLifecycleEvent = "prompt_cancelled";
      emitSlotSnapshot(slot);
      return;
    }
    slot.snapshot.busy = false;
    slot.snapshot.pendingPermissionRequest = null;
    slot.snapshot.status = slot.snapshot.status === "idle" ? "idle" : "error";
    if (event?.stderrText) {
      slot.snapshot.stderrTail = event.stderrText;
      appendDiagnostic(slot, {
        id: nextOpaqueId("acp-diag"),
        ts: nowIso(),
        kind: "stderr",
        level: "warn",
        message: "ACP stderr",
        detail: event.stderrText,
      });
    }
    slot.snapshot.lastLifecycleEvent = "exited";
    if (!slot.snapshot.lastError) {
      slot.snapshot.lastError =
        String(event?.message || "").trim() || "ACP connection closed";
    }
    emitSlotSnapshot(slot);
  });
  slot.unsubscribeDiagnostics = nextAdapter.onDiagnostics((entry) => {
    appendDiagnostic(slot, entry);
    emitSlotSnapshot(slot, {
      persist: false,
      throttleUi: true,
    });
  });
  slot.unsubscribePermission = nextAdapter.onPermissionRequest((request) => {
    setSlotPendingPermissionRequest(slot, request);
  });
}

async function disconnectSlotAdapter(slot: AcpSessionSlot) {
  slot.pendingPermissionResolver = null;
  clearPromptCancelCloseExpectation(slot);
  if (!slot.adapter) {
    return;
  }
  slot.suppressCloseEvent = true;
  slot.unsubscribeUpdate?.();
  slot.unsubscribeClose?.();
  slot.unsubscribeDiagnostics?.();
  slot.unsubscribePermission?.();
  slot.unsubscribeHostBridgePermission?.();
  slot.unsubscribeUpdate = null;
  slot.unsubscribeClose = null;
  slot.unsubscribeDiagnostics = null;
  slot.unsubscribePermission = null;
  slot.unsubscribeHostBridgePermission = null;
  const current = slot.adapter;
  slot.adapter = null;
  try {
    await current.close();
  } finally {
    slot.suppressCloseEvent = false;
  }
}

async function ensureAdapter(backendId?: string) {
  ensureInitialized();
  const slot = getOrCreateSlot(backendId || activeBackendId);
  if (slot.adapter) {
    return { slot, adapter: slot.adapter };
  }
  const backend = await resolveBackendForSlot(slot);
  slot.snapshot.sessionId = "";
  slot.snapshot.lastError = "";
  slot.snapshot.prerequisiteError = "";
  slot.snapshot.stderrTail = "";
  slot.snapshot.pendingPermissionRequest = null;
  slot.snapshot.status = "checking-command";
  emitSlotSnapshot(slot);
  try {
    if (!slot.snapshot.conversationId) {
      slot.snapshot = createNewLocalConversationSnapshot({
        slot,
        backend,
        backendId: slot.backendId,
      });
      resetSlotTransientState(slot);
    }
    await ensureRuntimeDirectory(
      slot.snapshot.agentWorkspaceDir || slot.snapshot.sessionCwd,
    );
    await ensureRuntimeDirectory(slot.snapshot.conversationStorageDir);
    await ensureRuntimeDirectory(slot.snapshot.runtimeDir);
    const hostBridgeCliInjection = await materializeHostBridgeCliRunInjection({
      workspaceDir:
        slot.snapshot.agentWorkspaceDir ||
        slot.snapshot.workspaceDir ||
        slot.snapshot.sessionCwd,
      requestId: slot.snapshot.conversationId || nextOpaqueId("acp-chat"),
      scopeKind: "acp-chat",
    });
    bindHostBridgePermissionForSlot(slot);
    slot.hostBridgeCliPromptSnippet = hostBridgeCliInjection.promptSnippet;
    appendDiagnostic(slot, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: hostBridgeCliInjection.available
        ? "host_bridge_cli_ready"
        : "host_bridge_cli_unavailable",
      level: hostBridgeCliInjection.available ? "info" : "warn",
      message: hostBridgeCliInjection.available
        ? "Host Bridge CLI injection prepared for ACP Chat."
        : "Host Bridge CLI is unavailable for ACP Chat; MCP fallback is disabled by default.",
      detail: hostBridgeCliInjection.fallbackReason || "",
      raw: summarizeHostBridgeCliRunInjection(hostBridgeCliInjection),
    });
    const backendWithHostBridgeCli = applyHostBridgeCliEnvToBackend({
      backend,
      injection: hostBridgeCliInjection,
    });
    const nextAdapter = await adapterFactory({
      backend: backendWithHostBridgeCli,
      agentWorkspaceDir: slot.snapshot.agentWorkspaceDir,
      sessionCwd: slot.snapshot.sessionCwd,
      workspaceDir: slot.snapshot.workspaceDir,
      runtimeDir: slot.snapshot.runtimeDir,
    });
    bindAdapter(slot, nextAdapter);
    slot.snapshot.status = "spawning";
    emitSlotSnapshot(slot);
    const initializedAdapter = await nextAdapter.initialize();
    slot.snapshot.authMethods = initializedAdapter.authMethods.map((entry) => ({
      ...entry,
    }));
    slot.snapshot.commandLabel = initializedAdapter.commandLabel;
    slot.snapshot.commandLine = initializedAdapter.commandLine;
    slot.snapshot.agentLabel = initializedAdapter.agentName;
    slot.snapshot.agentVersion = initializedAdapter.agentVersion;
    slot.snapshot.canLoadRemoteSession =
      initializedAdapter.canLoadSession === true;
    slot.snapshot.canResumeRemoteSession =
      initializedAdapter.canResumeSession === true;
    appendDiagnostic(slot, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: "zotero_mcp_capabilities",
      level: initializedAdapter.canUseHttpMcp ? "info" : "warn",
      message: initializedAdapter.canUseHttpMcp
        ? "ACP backend advertises HTTP MCP support"
        : "ACP backend does not advertise HTTP MCP support",
      detail: JSON.stringify({
        http: initializedAdapter.canUseHttpMcp,
        sse: initializedAdapter.canUseSseMcp,
      }),
      raw: {
        http: initializedAdapter.canUseHttpMcp,
        sse: initializedAdapter.canUseSseMcp,
      },
    });
    slot.snapshot.status = "initializing";
    slot.adapter = nextAdapter;
    emitSlotSnapshot(slot);
    return { slot, adapter: nextAdapter };
  } catch (error) {
    await disconnectSlotAdapter(slot);
    slot.snapshot.busy = false;
    slot.snapshot.status = "error";
    slot.snapshot.lastError = compactError(error);
    slot.snapshot.prerequisiteError = slot.snapshot.lastError;
    appendErrorDiagnostic({
      slot,
      kind: "command_check",
      message: "Failed to initialize ACP backend",
      error,
      stage: "ensure_adapter",
    });
    emitSlotSnapshot(slot);
    throw error;
  }
}

function applyAttachedSessionResult(
  slot: AcpSessionSlot,
  result: {
    sessionId: string;
    sessionTitle?: string;
    sessionUpdatedAt?: string;
    modes?: Parameters<typeof applyModeState>[1] | null;
    models?: Parameters<typeof applyModelState>[1] | null;
  },
) {
  slot.snapshot.sessionId = String(result.sessionId || "").trim();
  slot.snapshot.remoteSessionId =
    slot.snapshot.sessionId ||
    String(slot.snapshot.remoteSessionId || "").trim();
  slot.snapshot.sessionTitle = String(result.sessionTitle || "").trim();
  slot.snapshot.sessionUpdatedAt = String(result.sessionUpdatedAt || "").trim();
  applyModeState(slot, result.modes || {});
  applyModelState(slot, result.models || {});
  const backend =
    slot.snapshot.backend ||
    cachedAcpBackends.find((entry) => entry.id === slot.backendId);
  if (backend) {
    applyRuntimeOptionsCache(slot, backend);
  }
  slot.snapshot.status = "connected";
  slot.snapshot.busy = false;
}

async function ensureSession(backendId?: string) {
  const { slot, adapter } = await ensureAdapter(backendId);
  if (slot.snapshot.sessionId) {
    return { slot, adapter };
  }
  const remoteSessionId = String(slot.snapshot.remoteSessionId || "").trim();
  if (remoteSessionId) {
    if (slot.snapshot.canResumeRemoteSession) {
      slot.snapshot.sessionId = remoteSessionId;
      slot.snapshot.remoteSessionRestoreStatus = "pending";
      slot.snapshot.remoteSessionRestoreMessage = `Resuming remote ACP session ${remoteSessionId}`;
      emitSlotSnapshot(slot);
      try {
        const resumed = await adapter.resumeSession({
          sessionId: remoteSessionId,
        });
        applyAttachedSessionResult(slot, resumed);
        slot.snapshot.remoteSessionRestoreStatus = "resumed";
        slot.snapshot.remoteSessionRestoreMessage =
          "Remote ACP session resumed.";
        emitSlotSnapshot(slot);
        return { slot, adapter };
      } catch (error) {
        slot.snapshot.sessionId = "";
        slot.snapshot.remoteSessionRestoreStatus = "failed";
        slot.snapshot.remoteSessionRestoreMessage = compactError(error);
        appendErrorDiagnostic({
          slot,
          kind: "session_restore_failed",
          message: "Remote ACP session resume failed",
          error,
          stage: "session_resume",
        });
      }
    } else if (slot.snapshot.canLoadRemoteSession) {
      slot.snapshot.sessionId = remoteSessionId;
      slot.snapshot.remoteSessionRestoreStatus = "pending";
      slot.snapshot.remoteSessionRestoreMessage = `Loading remote ACP session ${remoteSessionId}`;
      emitSlotSnapshot(slot);
      try {
        slot.suppressSessionLoadReplay = true;
        const loaded = await adapter.loadSession({
          sessionId: remoteSessionId,
        });
        slot.suppressSessionLoadReplay = false;
        applyAttachedSessionResult(slot, loaded);
        slot.snapshot.remoteSessionRestoreStatus = "loaded";
        slot.snapshot.remoteSessionRestoreMessage =
          "Remote ACP session loaded.";
        emitSlotSnapshot(slot);
        return { slot, adapter };
      } catch (error) {
        slot.suppressSessionLoadReplay = false;
        slot.snapshot.sessionId = "";
        slot.snapshot.remoteSessionRestoreStatus = "failed";
        slot.snapshot.remoteSessionRestoreMessage = compactError(error);
        appendErrorDiagnostic({
          slot,
          kind: "session_restore_failed",
          message: "Remote ACP session load failed",
          error,
          stage: "session_load",
        });
      }
    } else {
      slot.snapshot.remoteSessionRestoreStatus = "unsupported";
      slot.snapshot.remoteSessionRestoreMessage =
        "Remote ACP session restore is not supported by this backend.";
      appendDiagnostic(slot, {
        id: nextOpaqueId("acp-diag"),
        ts: nowIso(),
        kind: "session_restore_unsupported",
        level: "info",
        message: "Remote ACP session restore is not supported by this backend",
        detail: remoteSessionId,
      });
    }
  }
  try {
    const created = await adapter.newSession();
    const previousRemoteSessionId = String(
      slot.snapshot.remoteSessionId || "",
    ).trim();
    applyAttachedSessionResult(slot, created);
    if (
      previousRemoteSessionId &&
      previousRemoteSessionId !== slot.snapshot.sessionId
    ) {
      slot.snapshot.remoteSessionRestoreStatus =
        slot.snapshot.remoteSessionRestoreStatus === "unsupported"
          ? "unsupported"
          : "fallback-new";
      slot.snapshot.remoteSessionRestoreMessage =
        slot.snapshot.remoteSessionRestoreStatus === "unsupported"
          ? "Remote ACP session restore is not supported; continued with a new agent session."
          : "Remote session could not be restored; continued with a new agent session.";
      appendDiagnostic(slot, {
        id: nextOpaqueId("acp-diag"),
        ts: nowIso(),
        kind: "session_new_fallback",
        level: "warn",
        message:
          "Remote session could not be restored; continued with a new agent session.",
        detail: `previous=${previousRemoteSessionId} new=${slot.snapshot.sessionId}`,
      });
      upsertStatusItem(slot, {
        level: "warn",
        label: "Remote session",
        text: slot.snapshot.remoteSessionRestoreMessage,
      });
    } else if (!previousRemoteSessionId) {
      slot.snapshot.remoteSessionRestoreStatus = "none";
      slot.snapshot.remoteSessionRestoreMessage = "";
    }
    emitSlotSnapshot(slot);
    return { slot, adapter };
  } catch (error) {
    if (error instanceof AcpAuthRequiredError) {
      slot.snapshot.busy = false;
      slot.snapshot.status = "auth-required";
      slot.snapshot.authMethods = error.authMethods.map((entry) => ({
        ...entry,
      }));
      slot.snapshot.lastError = error.message;
      emitSlotSnapshot(slot);
    } else {
      slot.snapshot.busy = false;
      slot.snapshot.status = "error";
      slot.snapshot.lastError = compactError(error);
      slot.snapshot.prerequisiteError =
        slot.snapshot.prerequisiteError || slot.snapshot.lastError;
      emitSlotSnapshot(slot);
    }
    throw error;
  }
}

function buildBackendSummary(
  backend: BackendInstance,
  options: { ensureSession?: boolean } = {},
) {
  const slot = getOrCreateSlot(backend.id);
  slot.snapshot.backend = backend;
  const sessions = options.ensureSession
    ? listAcpChatSessions(backend.id)
    : listStoredVisibleAcpChatSessions(backend.id);
  const lastError =
    String(slot.snapshot.prerequisiteError || "").trim() ||
    String(slot.snapshot.lastError || "").trim();
  return {
    backendId: backend.id,
    displayName: String(backend.displayName || backend.id).trim(),
    status: slot.snapshot.status,
    busy: slot.snapshot.busy,
    connected:
      slot.snapshot.status === "connected" ||
      slot.snapshot.status === "prompting" ||
      slot.adapter !== null,
    messageCount:
      sessions.reduce((sum, entry) => sum + entry.messageCount, 0) ||
      slot.snapshot.items.length,
    lastError,
    updatedAt: slot.snapshot.updatedAt,
  };
}

function buildFrontendSnapshot(): AcpFrontendSnapshot {
  ensureInitialized();
  const activeSlot = getOrCreateSlot(activeBackendId);
  const activeSnapshot = cloneSnapshotValue(activeSlot.snapshot);
  activeSnapshot.mcpServer = getZoteroMcpServerStatus();
  activeSnapshot.mcpHealth = getZoteroMcpHealthSnapshot();
  const chatSessions = listAcpChatSessions(activeBackendId);
  const knownBackends =
    cachedAcpBackends.length > 0
      ? cachedAcpBackends
      : activeSlot.snapshot.backend
        ? [activeSlot.snapshot.backend]
        : [
            {
              id: activeSlot.backendId,
              displayName: activeSlot.backendId,
              type: ACP_BACKEND_TYPE,
              baseUrl: `local://${activeSlot.backendId}`,
              command: "",
            },
          ];
  const summaries = knownBackends.map((backend) =>
    buildBackendSummary(backend, {
      ensureSession: backend.id === activeBackendId,
    }),
  );
  const sortedBackends = [
    ...knownBackends.filter((backend) => backend.id === activeBackendId),
    ...knownBackends.filter((backend) => backend.id !== activeBackendId),
  ];
  const backendChatSessions = sortedBackends
    .map((backend) => {
      const isActiveBackend = backend.id === activeBackendId;
      return {
        backendId: backend.id,
        displayName: String(backend.displayName || backend.id || "").trim(),
        sessions: isActiveBackend
          ? chatSessions
          : listStoredVisibleAcpChatSessions(backend.id),
      };
    })
    .filter(
      (entry) =>
        entry.backendId === activeBackendId || entry.sessions.length > 0,
    );
  return {
    activeBackendId,
    activeConversationId: activeSlot.snapshot.conversationId,
    chatSessions,
    backendChatSessions,
    backends: summaries,
    activeSnapshot,
    connectedCount: summaries.filter((entry) => entry.connected).length,
    errorCount: summaries.filter((entry) => entry.status === "error").length,
    totalMessageCount: summaries.reduce(
      (sum, entry) => sum + entry.messageCount,
      0,
    ),
    updatedAt: nowIso(),
  };
}

export function getAcpFrontendSnapshot() {
  return buildFrontendSnapshot();
}

export function subscribeAcpFrontendSnapshots(
  listener: AcpFrontendSnapshotListener,
) {
  frontendListeners.add(listener);
  listener(getAcpFrontendSnapshot());
  return () => {
    frontendListeners.delete(listener);
  };
}

export function getAcpConversationSnapshot(backendId?: string) {
  ensureInitialized();
  return cloneSnapshotValue(
    getOrCreateSlot(backendId || activeBackendId).snapshot,
  );
}

export function subscribeAcpConversationSnapshots(
  listener: AcpSnapshotListener,
) {
  listeners.add(listener);
  listener(getAcpConversationSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export async function setActiveAcpBackend(args: { backendId: string }) {
  ensureInitialized();
  const backendId = normalizeBackendId(args.backendId);
  if (!backendId || backendId === activeBackendId) {
    return;
  }
  await refreshAcpBackends();
  if (!cachedAcpBackends.some((entry) => entry.id === backendId)) {
    throw new Error(`ACP backend "${backendId}" is not available`);
  }
  activeBackendId = backendId;
  saveAcpFrontendState({ activeBackendId });
  const slot = getOrCreateSlot(backendId);
  notifyConversationListenersNow(slot);
  notifyFrontendListenersNow();
}

function assertSessionSwitchAllowed(slot: AcpSessionSlot) {
  if (
    slot.snapshot.status === "prompting" ||
    slot.snapshot.status === "permission-required"
  ) {
    throw new Error("Cannot change ACP chat session while a prompt is active");
  }
}

function sortSessionsByUpdatedAt(sessions: AcpChatSessionSummary[]) {
  return [...sessions].sort((left, right) =>
    String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")),
  );
}

function createNewLocalConversationSnapshot(args: {
  slot: AcpSessionSlot;
  backend: BackendInstance | null;
  backendId: string;
  createdAt?: string;
}) {
  const createdAt = args.createdAt || nowIso();
  const conversationId = nextOpaqueId("acp-conversation");
  const paths = resolveAcpChatRuntimePaths(args.backendId, conversationId);
  return {
    ...createEmptyAcpConversationSnapshot(),
    backend: args.backend,
    backendId: args.backendId,
    conversationId,
    conversationTitle: "New Conversation",
    conversationCreatedAt: createdAt,
    showDiagnostics: args.slot.snapshot.showDiagnostics,
    statusExpanded: args.slot.snapshot.statusExpanded,
    chatDisplayMode: args.slot.snapshot.chatDisplayMode,
    agentWorkspaceDir: paths.agentWorkspaceDir,
    conversationStorageDir: paths.conversationStorageDir,
    sessionCwd: paths.agentWorkspaceDir,
    workspaceDir: paths.agentWorkspaceDir,
    runtimeDir: paths.runtimeDir,
    updatedAt: createdAt,
  };
}

export async function setActiveAcpConversation(args: {
  conversationId: string;
  backendId?: string;
}) {
  ensureInitialized();
  const backendId = normalizeBackendId(args.backendId || activeBackendId);
  const conversationId = normalizeBackendId(args.conversationId);
  if (!backendId || !conversationId) {
    return;
  }
  const slot = getOrCreateSlot(backendId);
  if (slot.snapshot.conversationId === conversationId) {
    return;
  }
  assertSessionSwitchAllowed(slot);
  emitSlotSnapshot(slot, { throttleUi: false });
  await disconnectSlotAdapter(slot);
  slot.snapshot = hydrateSnapshot(backendId, conversationId);
  resetSlotTransientState(slot);
  saveAcpChatSessionIndex({
    backendId,
    activeConversationId: conversationId,
    sessions: listAllAcpChatSessions(backendId),
  });
  emitSlotSnapshot(slot);
}

export async function ensureAcpConversationReady(backendId?: string) {
  ensureInitialized();
  await refreshAcpBackends();
  await ensureSession(backendId || activeBackendId);
}

export async function refreshAcpConversationBackends() {
  ensureInitialized();
  await refreshAcpBackends();
  const slot = getOrCreateSlot(activeBackendId);
  notifyConversationListenersNow(slot);
  notifyFrontendListenersNow();
}

export async function connectAcpConversation(args?: { backendId?: string }) {
  ensureInitialized();
  await refreshAcpBackends();
  await ensureSession(args?.backendId || activeBackendId);
}

export async function disconnectAcpConversation(args?: { backendId?: string }) {
  ensureInitialized();
  const slot = getOrCreateSlot(args?.backendId || activeBackendId);
  await disconnectSlotAdapter(slot);
  slot.snapshot.sessionId = "";
  slot.snapshot.busy = false;
  slot.snapshot.status = "idle";
  slot.snapshot.lastError = "";
  slot.snapshot.prerequisiteError = "";
  slot.snapshot.pendingPermissionRequest = null;
  emitSlotSnapshot(slot);
}

export async function sendAcpConversationPrompt(args: {
  message: string;
  hostContext?: AcpHostContext;
  backendId?: string;
}) {
  ensureInitialized();
  const message = String(args.message || "").trim();
  if (!message) {
    throw new Error("ACP message is required");
  }
  const { slot, adapter } = await ensureSession(
    args.backendId || activeBackendId,
  );
  if (!slot.snapshot.conversationId) {
    slot.snapshot.conversationId = nextOpaqueId("acp-conversation");
  }
  if (
    (!slot.snapshot.conversationTitle ||
      slot.snapshot.conversationTitle === "New Conversation") &&
    slot.snapshot.items.length === 0
  ) {
    slot.snapshot.conversationTitle =
      message.length > 48 ? `${message.slice(0, 48)}...` : message;
  }
  pushItem(slot, {
    id: nextOpaqueId("acp-msg-user"),
    kind: "message",
    role: "user",
    text: message,
    createdAt: nowIso(),
    state: "complete",
  });
  slot.activeAssistantItemId = "";
  slot.activeThoughtItemId = "";
  slot.activePlanItemId = "";
  slot.snapshot.busy = true;
  slot.snapshot.status = "prompting";
  slot.snapshot.lastError = "";
  slot.snapshot.prerequisiteError = "";
  slot.snapshot.lastStopReason = "";
  slot.snapshot.pendingPermissionRequest = null;
  slot.snapshot.lastHostContext = args.hostContext
    ? JSON.parse(JSON.stringify(args.hostContext))
    : null;
  emitSlotSnapshot(slot);
  try {
    const hostBridgeCliPromptSnippet = normalizeString(
      slot.hostBridgeCliPromptSnippet,
    );
    const response = await adapter.prompt({
      sessionId: slot.snapshot.sessionId,
      message: hostBridgeCliPromptSnippet
        ? `${message}\n${hostBridgeCliPromptSnippet}`
        : message,
    });
    slot.snapshot.busy = false;
    slot.snapshot.status = "connected";
    slot.snapshot.lastStopReason = String(response.stopReason || "").trim();
    finalizeStreamingItems(slot, "complete", "skipped");
    emitSlotSnapshot(slot);
  } catch (error) {
    slot.snapshot.busy = false;
    finalizeStreamingItems(slot, "error", "cancelled");
    if (error instanceof AcpAuthRequiredError) {
      slot.snapshot.status = "auth-required";
      slot.snapshot.authMethods = error.authMethods.map((entry) => ({
        ...entry,
      }));
      slot.snapshot.lastError = error.message;
    } else {
      slot.snapshot.status = "error";
      slot.snapshot.lastError = compactError(error);
      slot.snapshot.prerequisiteError =
        slot.snapshot.prerequisiteError || slot.snapshot.lastError;
    }
    emitSlotSnapshot(slot);
    throw error;
  }
}

export async function cancelAcpConversationPrompt(args?: {
  backendId?: string;
}) {
  ensureInitialized();
  const slot = getOrCreateSlot(args?.backendId || activeBackendId);
  if (!slot.adapter || !slot.snapshot.sessionId) {
    return;
  }
  slot.promptCancelInFlight = true;
  expectPromptCancelClose(slot);
  try {
    await slot.adapter.cancel({
      sessionId: slot.snapshot.sessionId,
    });
  } finally {
    slot.promptCancelInFlight = false;
  }
  markPromptCancelled(slot);
  emitSlotSnapshot(slot);
}

export async function startNewAcpConversation(args?: { backendId?: string }) {
  ensureInitialized();
  await refreshAcpBackends();
  const slot = getOrCreateSlot(args?.backendId || activeBackendId);
  assertSessionSwitchAllowed(slot);
  emitSlotSnapshot(slot, { throttleUi: false });
  await disconnectSlotAdapter(slot);
  const preservedBackend =
    cachedAcpBackends.find((entry) => entry.id === slot.backendId) ||
    slot.snapshot.backend;
  const preservedBackendId = slot.snapshot.backendId || slot.backendId;
  const preservedDiagnosticsVisibility = slot.snapshot.showDiagnostics;
  const preservedStatusExpanded = slot.snapshot.statusExpanded;
  const preservedChatDisplayMode = slot.snapshot.chatDisplayMode;
  const createdAt = nowIso();
  slot.snapshot = createNewLocalConversationSnapshot({
    slot,
    backend: preservedBackend,
    backendId: preservedBackendId,
    createdAt,
  });
  if (preservedBackend) {
    applyRuntimeOptionsCache(slot, preservedBackend);
  }
  slot.snapshot.showDiagnostics = preservedDiagnosticsVisibility;
  slot.snapshot.statusExpanded = preservedStatusExpanded;
  slot.snapshot.chatDisplayMode = preservedChatDisplayMode;
  resetSlotTransientState(slot);
  emitSlotSnapshot(slot);
}

export async function renameAcpConversation(args: {
  title: string;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const title = String(args.title || "").trim();
  if (!title) {
    return;
  }
  const slot = getOrCreateSlot(args.backendId || activeBackendId);
  assertSessionSwitchAllowed(slot);
  const conversationId =
    normalizeBackendId(args.conversationId) || slot.snapshot.conversationId;
  if (!conversationId) {
    return;
  }
  if (conversationId === slot.snapshot.conversationId) {
    slot.snapshot.conversationTitle = title;
    emitSlotSnapshot(slot);
    return;
  }
  renameAcpConversationState({
    backendId: slot.backendId,
    conversationId,
    title,
  });
  notifyFrontendListenersNow();
}

export async function archiveAcpConversation(args: {
  conversationId: string;
  backendId?: string;
}) {
  ensureInitialized();
  const backendId = normalizeBackendId(args.backendId || activeBackendId);
  const conversationId = normalizeBackendId(args.conversationId);
  if (!backendId || !conversationId) {
    return;
  }
  const slot = getOrCreateSlot(backendId);
  assertSessionSwitchAllowed(slot);
  const archivedAt = nowIso();
  const allSessions = listAllAcpChatSessions(backendId);
  if (
    !allSessions.some(
      (entry) => entry.conversationId === conversationId && !entry.archivedAt,
    )
  ) {
    return;
  }
  const updatedSessions = allSessions.map((entry) =>
    entry.conversationId === conversationId
      ? {
          ...entry,
          archivedAt,
          updatedAt: archivedAt,
          status: "idle" as const,
        }
      : entry,
  );
  const visibleSessions = sortSessionsByUpdatedAt(
    updatedSessions.filter((entry) => !entry.archivedAt),
  );
  const isActive = slot.snapshot.conversationId === conversationId;
  if (!isActive) {
    saveAcpChatSessionIndex({
      backendId,
      activeConversationId: slot.snapshot.conversationId,
      sessions: updatedSessions,
    });
    notifyFrontendListenersNow();
    return;
  }

  emitSlotSnapshot(slot, { throttleUi: false });
  await disconnectSlotAdapter(slot);
  resetSlotTransientState(slot);
  if (visibleSessions.length > 0) {
    slot.snapshot = hydrateSnapshot(
      backendId,
      visibleSessions[0].conversationId,
    );
    saveAcpChatSessionIndex({
      backendId,
      activeConversationId: slot.snapshot.conversationId,
      sessions: updatedSessions,
    });
    emitSlotSnapshot(slot);
    return;
  }

  const preservedBackend = slot.snapshot.backend;
  const preservedBackendId = slot.snapshot.backendId || slot.backendId;
  saveAcpChatSessionIndex({
    backendId,
    activeConversationId: "",
    sessions: updatedSessions,
  });
  const paths = resolveAcpChatRuntimePaths(preservedBackendId);
  slot.snapshot = {
    ...createEmptyAcpConversationSnapshot(),
    backend: preservedBackend,
    backendId: preservedBackendId,
    showDiagnostics: slot.snapshot.showDiagnostics,
    statusExpanded: slot.snapshot.statusExpanded,
    chatDisplayMode: slot.snapshot.chatDisplayMode,
    agentWorkspaceDir: paths.agentWorkspaceDir,
    conversationStorageDir: paths.conversationStorageDir,
    sessionCwd: paths.agentWorkspaceDir,
    workspaceDir: paths.agentWorkspaceDir,
    runtimeDir: paths.runtimeDir,
    updatedAt: nowIso(),
  };
  resetSlotTransientState(slot);
  emitSlotSnapshot(slot);
}

export async function deleteActiveAcpConversation(args?: {
  backendId?: string;
}) {
  ensureInitialized();
  const backendId = normalizeBackendId(args?.backendId || activeBackendId);
  const slot = getOrCreateSlot(backendId);
  assertSessionSwitchAllowed(slot);
  const deletedConversationId = slot.snapshot.conversationId;
  if (!deletedConversationId) {
    return;
  }
  await disconnectSlotAdapter(slot);
  deleteAcpConversationState(backendId, deletedConversationId);
  const remaining = sortSessionsByUpdatedAt(listAcpChatSessions(backendId));
  if (remaining.length > 0) {
    slot.snapshot = hydrateSnapshot(backendId, remaining[0].conversationId);
    resetSlotTransientState(slot);
    saveAcpChatSessionIndex({
      backendId,
      activeConversationId: slot.snapshot.conversationId,
      sessions: listAllAcpChatSessions(backendId),
    });
    emitSlotSnapshot(slot);
    return;
  }
  const preservedBackend = slot.snapshot.backend;
  const preservedBackendId = slot.snapshot.backendId || slot.backendId;
  const paths = resolveAcpChatRuntimePaths(preservedBackendId);
  slot.snapshot = {
    ...createEmptyAcpConversationSnapshot(),
    backend: preservedBackend,
    backendId: preservedBackendId,
    agentWorkspaceDir: paths.agentWorkspaceDir,
    conversationStorageDir: paths.conversationStorageDir,
    sessionCwd: paths.agentWorkspaceDir,
    workspaceDir: paths.agentWorkspaceDir,
    runtimeDir: paths.runtimeDir,
    updatedAt: nowIso(),
  };
  resetSlotTransientState(slot);
  emitSlotSnapshot(slot);
}

export async function reconnectAcpConversation(args?: { backendId?: string }) {
  ensureInitialized();
  const slot = getOrCreateSlot(args?.backendId || activeBackendId);
  await disconnectSlotAdapter(slot);
  slot.snapshot.sessionId = "";
  slot.snapshot.busy = false;
  slot.snapshot.status = "idle";
  slot.snapshot.lastError = "";
  slot.snapshot.prerequisiteError = "";
  slot.snapshot.stderrTail = "";
  slot.snapshot.pendingPermissionRequest = null;
  emitSlotSnapshot(slot);
  await ensureSession(slot.backendId);
}

export async function authenticateAcpConversation(args: {
  methodId?: string;
  backendId?: string;
}) {
  ensureInitialized();
  const slot = getOrCreateSlot(args.backendId || activeBackendId);
  const methodId =
    String(args.methodId || "").trim() ||
    slot.snapshot.authMethods[0]?.id ||
    "";
  if (!methodId) {
    throw new Error("ACP authentication method is required");
  }
  const ensured = await ensureAdapter(slot.backendId);
  ensured.slot.snapshot.status = "initializing";
  ensured.slot.snapshot.lastError = "";
  ensured.slot.snapshot.prerequisiteError = "";
  emitSlotSnapshot(ensured.slot);
  await ensured.adapter.authenticate({ methodId });
  ensured.slot.snapshot.sessionId = "";
  await ensureSession(ensured.slot.backendId);
}

export async function resolveAcpConversationPermission(args: {
  outcome: "selected" | "cancelled";
  optionId?: string;
  backendId?: string;
}) {
  ensureInitialized();
  const slot = getOrCreateSlot(args.backendId || activeBackendId);
  if (!slot.pendingPermissionResolver) {
    return;
  }
  const resolver = slot.pendingPermissionResolver;
  slot.pendingPermissionResolver = null;
  const optionId =
    String(args.optionId || "").trim() ||
    slot.snapshot.pendingPermissionRequest?.options[0]?.optionId ||
    "";
  if (args.outcome === "selected" && optionId) {
    resolver({ outcome: "selected", optionId });
  } else {
    resolver({ outcome: "cancelled" });
  }
  slot.snapshot.pendingPermissionRequest = null;
  slot.snapshot.status = "prompting";
  slot.snapshot.busy = true;
  emitSlotSnapshot(slot);
}

export async function setAcpConversationMode(args: {
  modeId: string;
  backendId?: string;
}) {
  ensureInitialized();
  const modeId = String(args.modeId || "").trim();
  if (!modeId) {
    return;
  }
  const { slot, adapter } = await ensureSession(
    args.backendId || activeBackendId,
  );
  await adapter.setMode({ sessionId: slot.snapshot.sessionId, modeId });
  applyModeState(slot, { currentModeId: modeId });
  emitSlotSnapshot(slot);
}

export async function setAcpConversationModel(args: {
  modelId: string;
  backendId?: string;
}) {
  ensureInitialized();
  const modelId = String(args.modelId || "").trim();
  if (!modelId) {
    return;
  }
  const { slot, adapter } = await ensureSession(
    args.backendId || activeBackendId,
  );
  if (slot.snapshot.busy === true) {
    throw new Error("Cannot change ACP model while a prompt is running.");
  }
  const rawModelId = resolveRawModelIdForSelection(
    slot.snapshot,
    modelId,
    slot.snapshot.currentReasoningEffort?.id,
  );
  await adapter.setModel({
    sessionId: slot.snapshot.sessionId,
    modelId: rawModelId,
  });
  applyModelState(slot, { currentModelId: rawModelId });
  emitSlotSnapshot(slot);
}

export async function setAcpConversationReasoningEffort(args: {
  effortId: string;
  backendId?: string;
}) {
  ensureInitialized();
  const effortId = normalizeEffortId(args.effortId);
  if (!effortId) {
    return;
  }
  const { slot, adapter } = await ensureSession(
    args.backendId || activeBackendId,
  );
  if (slot.snapshot.busy === true) {
    throw new Error(
      "Cannot change ACP reasoning effort while a prompt is running.",
    );
  }
  const displayModelId =
    String(slot.snapshot.currentDisplayModel?.id || "").trim() ||
    String(slot.snapshot.currentModel?.id || "").trim();
  if (!displayModelId) {
    return;
  }
  const rawModelId = resolveRawModelIdForSelection(
    slot.snapshot,
    displayModelId,
    effortId,
  );
  await adapter.setModel({
    sessionId: slot.snapshot.sessionId,
    modelId: rawModelId,
  });
  applyModelState(slot, { currentModelId: rawModelId });
  emitSlotSnapshot(slot);
}

export function toggleAcpConversationDiagnostics(args?: {
  visible?: boolean;
  backendId?: string;
}) {
  ensureInitialized();
  const slot = getOrCreateSlot(args?.backendId || activeBackendId);
  slot.snapshot.showDiagnostics =
    typeof args?.visible === "boolean"
      ? args.visible
      : !slot.snapshot.showDiagnostics;
  emitSlotSnapshot(slot);
}

export function setAcpConversationChatDisplayMode(args: {
  mode: AcpChatDisplayMode;
  backendId?: string;
}) {
  ensureInitialized();
  const slot = getOrCreateSlot(args.backendId || activeBackendId);
  slot.snapshot.chatDisplayMode = args.mode === "bubble" ? "bubble" : "plain";
  emitSlotSnapshot(slot);
}

export function toggleAcpConversationStatusDetails(args?: {
  expanded?: boolean;
  backendId?: string;
}) {
  ensureInitialized();
  const slot = getOrCreateSlot(args?.backendId || activeBackendId);
  slot.snapshot.statusExpanded =
    typeof args?.expanded === "boolean"
      ? args.expanded
      : !slot.snapshot.statusExpanded;
  emitSlotSnapshot(slot);
}

export function buildAcpDiagnosticsBundle(
  backendId?: string,
): AcpDiagnosticsBundle {
  ensureInitialized();
  const slot = getOrCreateSlot(backendId || activeBackendId);
  const snapshot = slot.snapshot;
  return {
    schema: "zotero-skills.acp.diagnostics.v1",
    generatedAt: nowIso(),
    host: serializeRuntimeHost(),
    backend: snapshot.backend
      ? {
          id: String(snapshot.backend.id || "").trim(),
          type: String(snapshot.backend.type || "").trim() || undefined,
          displayName:
            String(snapshot.backend.displayName || "").trim() || undefined,
          command: String(snapshot.backend.command || "").trim() || undefined,
          args: Array.isArray(snapshot.backend.args)
            ? snapshot.backend.args.map((entry) => String(entry))
            : [],
        }
      : null,
    connection: {
      status: snapshot.status,
      busy: snapshot.busy,
      conversationId: snapshot.conversationId,
      sessionId: snapshot.sessionId,
      remoteSessionId: snapshot.remoteSessionId,
      remoteSessionRestoreStatus: snapshot.remoteSessionRestoreStatus,
      commandLabel: snapshot.commandLabel,
      commandLine: snapshot.commandLine,
      agentWorkspaceDir: snapshot.agentWorkspaceDir,
      conversationStorageDir: snapshot.conversationStorageDir,
      sessionCwd: snapshot.sessionCwd,
      workspaceDir: snapshot.workspaceDir,
      runtimeDir: snapshot.runtimeDir,
      lastError: snapshot.lastError,
      prerequisiteError: snapshot.prerequisiteError,
      stderrTail: snapshot.stderrTail,
      lastLifecycleEvent: snapshot.lastLifecycleEvent,
      updatedAt: snapshot.updatedAt,
    },
    mcpServer: getZoteroMcpServerStatus(),
    mcpHealth: getZoteroMcpHealthSnapshot(),
    hostBridge: getHostBridgeServerStatus(),
    diagnostics: snapshot.diagnostics.map((entry) => ({ ...entry })),
    recentItems: snapshot.items
      .slice(-12)
      .map((entry) => cloneAcpConversationItem(entry)),
    lastHostContext: snapshot.lastHostContext
      ? JSON.parse(JSON.stringify(snapshot.lastHostContext))
      : null,
  };
}

export function pruneAcpSessionSlotsForBackends(backends: BackendInstance[]) {
  ensureInitialized();
  const remainingAcpIds = new Set(
    backends
      .filter((entry) => normalizeBackendId(entry.type) === ACP_BACKEND_TYPE)
      .map((entry) => entry.id),
  );
  for (const [backendId, slot] of Array.from(slots.entries())) {
    if (remainingAcpIds.has(backendId)) {
      continue;
    }
    void disconnectSlotAdapter(slot);
    clearAcpConversationState(backendId);
    slots.delete(backendId);
  }
  cachedAcpBackends = backends.filter(
    (entry) => normalizeBackendId(entry.type) === ACP_BACKEND_TYPE,
  );
  if (!remainingAcpIds.has(activeBackendId)) {
    activeBackendId = cachedAcpBackends[0]?.id || "";
    if (activeBackendId) {
      getOrCreateSlot(activeBackendId);
    }
    saveAcpFrontendState({ activeBackendId });
  }
  notifyFrontendListenersNow();
  if (activeBackendId) {
    notifyConversationListenersNow(getOrCreateSlot(activeBackendId));
  }
}

export async function shutdownAcpSessionManager() {
  const pending: Promise<unknown>[] = [];
  for (const slot of slots.values()) {
    if (slot.uiEmitTimer) {
      clearTimeout(slot.uiEmitTimer);
      slot.uiEmitTimer = null;
    }
    if (slot.persistTimer) {
      flushPendingPersistence(slot);
    }
    pending.push(disconnectSlotAdapter(slot));
  }
  await Promise.allSettled(pending);
  await shutdownZoteroMcpServer();
  resetAcpConversationHostBridgePermissionHandlersForTests();
  slots.clear();
  listeners.clear();
  frontendListeners.clear();
  cachedAcpBackends = [];
  activeBackendId = "";
  initialized = false;
  resetZoteroMcpServerForTests();
}

export function setAcpConnectionAdapterFactoryForTests(
  factory?: (
    args: AcpConnectionAdapterFactoryArgs,
  ) => Promise<AcpConnectionAdapter>,
) {
  adapterFactory = factory || createAcpConnectionAdapter;
}

export function resetAcpSessionManagerForTests() {
  for (const slot of slots.values()) {
    if (slot.uiEmitTimer) {
      clearTimeout(slot.uiEmitTimer);
    }
    if (slot.persistTimer) {
      clearTimeout(slot.persistTimer);
    }
    if (slot.promptCancelCloseTimer) {
      clearTimeout(slot.promptCancelCloseTimer);
    }
    slot.unsubscribeUpdate?.();
    slot.unsubscribeClose?.();
    slot.unsubscribeDiagnostics?.();
    slot.unsubscribePermission?.();
    slot.unsubscribeHostBridgePermission?.();
  }
  resetAcpConversationHostBridgePermissionHandlersForTests();
  slots.clear();
  listeners.clear();
  frontendListeners.clear();
  cachedAcpBackends = [];
  activeBackendId = "";
  initialized = false;
}

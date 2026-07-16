import { loadBackendsRegistry } from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import { ACP_BACKEND_TYPE } from "../config/defaults";
import { joinPath } from "../utils/path";
import {
  watchPromiseSettlement,
  type PromiseSettlementWatchdog,
} from "../utils/wait";
import {
  ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS,
  canPublishAssistantWorkspaceLiveUpdates,
  getAssistantExecutionDisplayMode,
  isAssistantSilentExecutionMode,
  subscribeAssistantExecutionDisplayMode,
  type AssistantWorkspacePublishReason,
} from "./assistantExecutionDisplayPolicy";
import {
  discardAcpExecutionProgressCandidate,
  finishAcpExecutionProgress,
  releaseAcpExecutionProgress,
  resetAcpExecutionProgress,
  restoreAcpExecutionProgress,
  snapshotAcpMessageCounts,
  snapshotAcpExecutionProgress,
  takeAcpExecutionProgressTerminalCandidate,
  updateAcpExecutionProgress,
} from "./acpExecutionProgress";
import { readUiVisibleTranscriptPage } from "./assistantTranscriptPageProjection";
import {
  classifyAcpTranscriptSessionUpdate,
  isAcpTranscriptHardBoundaryUpdate,
} from "./acpTranscriptBoundary";
import type {
  AssistantWorkspaceTranscriptBoundary,
  AssistantWorkspaceTranscriptMutationEvent,
} from "./assistantWorkspaceTranscriptPublication";
import { createAssistantWorkspaceTranscriptMutation } from "./assistantWorkspaceTranscriptPublication";
import {
  AcpAuthRequiredError,
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
  type AcpConnectionAdapterFactoryArgs,
  type AcpConnectionSemanticTraceBinding,
  type AcpConnectionSemanticTraceContext,
  type AcpPromptResult,
} from "./acpConnectionAdapter";
import {
  clearAcpConversationState,
  deleteAcpConversationState,
  listAllAcpChatSessions,
  listAcpChatSessions,
  listStoredVisibleAcpChatSessions,
  loadAcpChatSessionIndex,
  loadAcpConversationState,
  loadAcpFrontendState,
  renameAcpConversationState,
  resolveAcpChatRuntimePaths,
  saveAcpChatSessionIndex,
  saveAcpConversationState,
  saveAcpFrontendState,
} from "./acpConversationStore";
import {
  enqueueAcpChatTranscriptEvent,
  flushAcpChatTranscriptWrites,
  readAcpChatTranscriptPage,
  readFullAcpChatTranscript,
  resolveAcpChatTranscriptPaths,
} from "./acpConversationTranscriptStore";
import { describeAcpError, serializeAcpError } from "./acpDiagnostics";
import { isDebugModeEnabled } from "./debugMode";
import {
  abandonAcpRuntimeSemanticTraceClaimAttempt,
  beginAcpRuntimeSemanticTraceClaimAttempt,
  claimAcpRuntimeSemanticTraceRoot,
  getAcpRuntimeSemanticTraceRecorderView,
  noticeAcpRuntimeSemanticTraceSessionReplacement,
  recordAcpRuntimeSemanticTraceEvent,
  type AcpRuntimeSemanticTraceClaimAttempt,
  type AcpRuntimeSemanticTraceContext,
} from "./acpRuntimeSemanticTraceRecorder";
import type {
  AcpRuntimeReplayLogicalTimerDescriptor,
  AcpRuntimeReplayLogicalTimerInspection,
} from "./acpRuntimeReplayLogicalTime";
import { applyAcpReasoningEffortWithFallback } from "./acpReasoningEffortFallback";
import {
  buildAcpRuntimeOptionsStateFromConfigOptions,
  hasAcpRuntimeOptionSelectors,
} from "./acpSessionConfigOptions";
import {
  cloneAcpConversationItem,
  cloneAcpSelectableOption,
  createEmptyAcpConversationSnapshot,
  normalizeAcpPromptInterruptState,
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
  type AcpPendingPermissionRequest,
  type AcpSelectableOption,
} from "./acpTypes";
import type { RequestPermissionOutcome } from "./acpProtocol";
import {
  copyRuntimeDirectory,
  ensureRuntimeDirectory,
} from "./runtimePersistence";
import { buildAcpChatSkillInjectionPlan } from "./acpAgentFamilyResolver";
import { scanPluginSkillRegistry } from "./pluginSkillRegistry";
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
import { resolveAutoApproveAcpPermissionOptionId } from "./acpPermissionOptions";
import {
  buildAcpStartupPromptPreamble,
  prependAcpStartupPromptPreamble,
  resolveAcpStartupInstructionFile,
} from "./acpStartupPromptPreambles";

type AcpSnapshotListener = (snapshot: AcpConversationSnapshot) => void;
type AcpFrontendSnapshotListener = (snapshot: AcpFrontendSnapshot) => void;
export type AcpChatPanelSnapshotChangeKind =
  | "active-scope"
  | "status"
  | "permission"
  | "session-list"
  | "transcript-boundary"
  | "transcript-append"
  | "transcript-progress"
  | "message-counts"
  | "plan"
  | "reply-hint"
  | "context-details"
  | "runtime-options"
  | "backend"
  | "global";
export type AcpChatPanelSnapshotChange = {
  backendId?: string;
  conversationId?: string;
  active?: boolean;
  global?: boolean;
  kinds: AcpChatPanelSnapshotChangeKind[];
  transcriptEvents?: AssistantWorkspaceTranscriptMutationEvent[];
  transcriptEventSeq?: number;
  transcriptItemCount?: number;
};
type AcpChatPanelSnapshotListener = (
  change: AcpChatPanelSnapshotChange,
) => void;
type AcpUiPublishMode = "full" | "metadata" | "structural";
type AcpConversationSnapshotItemMode = "full" | "structural";
type AcpConversationUiSnapshotReadOptions = {
  itemMode?: AcpConversationSnapshotItemMode;
};

const ACP_CHAT_SHUTDOWN_DETACH_TIMEOUT_MS = 2_000;
const DEFAULT_ACP_CHAT_PROMPT_INTERRUPT_GRACE_MS = 10_000;
const ACP_CHAT_COLD_TRANSCRIPT_MIRROR_CACHE_LIMIT = 10;
const coldAcpChatTranscriptMirrorLru = new Map<string, true>();
export type AcpChatSessionRuntime = {
  key: string;
  backendId: string;
  adapter: AcpConnectionAdapter | null;
  snapshot: AcpConversationSnapshot;
  uiSnapshot: AcpConversationSnapshot | null;
  uiRevision: number;
  uiTranscriptRevision: number;
  uiHasUnpublishedTranscript: boolean;
  uiPendingPublishMode: AcpUiPublishMode | null;
  uiPendingChangeKinds: Set<AcpChatPanelSnapshotChangeKind>;
  workspaceTranscriptEvents: AssistantWorkspaceTranscriptMutationEvent[];
  unsubscribeUpdate: (() => void) | null;
  unsubscribeClose: (() => void) | null;
  unsubscribeDiagnostics: (() => void) | null;
  unsubscribePermission: (() => void) | null;
  unsubscribeHostBridgePermission: (() => void) | null;
  suppressCloseEvent: boolean;
  semanticTraceBinding?: AcpConnectionSemanticTraceBinding;
  semanticTraceAdapterContext?: AcpConnectionSemanticTraceContext;
  activePrompt: {
    token: string;
    promise: Promise<AcpPromptResult>;
    watchdog: PromiseSettlementWatchdog | null;
    semanticTrace?: {
      context: AcpRuntimeSemanticTraceContext;
      owner: {
        rootId: string;
        conversationId: string;
        sessionId: string;
        turnId: string;
      };
      terminalRecorded: boolean;
    };
  } | null;
  activeAssistantItemId: string;
  activeThoughtItemId: string;
  activePlanItemId: string;
  transcriptItemCount: number;
  transcriptEventSeq: number;
  transcriptPreview: string;
  transcriptItemsById: Map<string, AcpConversationItem>;
  transcriptItemIds: string[];
  transcriptToolItemIds: Map<string, string>;
  transcriptMirrorLoaded: boolean;
  transcriptHydrateState?: "loading" | "failed";
  transcriptHydrateError?: string;
  transcriptHydratePromise?: Promise<void>;
  transcriptMirrorReleasePromise?: Promise<void>;
  transcriptWrites: Set<Promise<unknown>>;
  pendingPermissionResolver:
    | ((outcome: RequestPermissionOutcome) => void)
    | null;
  suppressSessionLoadReplay: boolean;
  uiEmitTimer: ReturnType<typeof setTimeout> | null;
  persistTimer: ReturnType<typeof setTimeout> | null;
  lastLiveActivityMs: number;
};

type AcpEmitOptions = {
  persist?: boolean;
  throttleUi?: boolean;
  throttlePersist?: boolean;
  touchUpdatedAt?: boolean;
  notifyUi?: boolean;
  uiReason?: AssistantWorkspacePublishReason;
  publishTranscript?: boolean;
  publishMode?: AcpUiPublishMode;
  changeKinds?: AcpChatPanelSnapshotChangeKind[];
};

let adapterFactory: (
  args: AcpConnectionAdapterFactoryArgs,
) => Promise<AcpConnectionAdapter> = createAcpConnectionAdapter;
let initialized = false;
let acpChatPromptInterruptGraceMs = DEFAULT_ACP_CHAT_PROMPT_INTERRUPT_GRACE_MS;
let unsubscribeExecutionDisplayMode: (() => void) | undefined;
let lastExecutionDisplayMode = getAssistantExecutionDisplayMode();
let activeBackendId = "";
let activeConversationId = "";
let cachedAcpBackends: BackendInstance[] = [];
const sessionRuntimes = new Map<string, AcpChatSessionRuntime>();
const listeners = new Set<AcpSnapshotListener>();
const frontendListeners = new Set<AcpFrontendSnapshotListener>();
const acpChatPanelListeners = new Set<AcpChatPanelSnapshotListener>();
const chatTranscriptWrites = new Set<Promise<unknown>>();
const MAX_DIAGNOSTICS = 40;
const MAX_LIVE_ACP_CHAT_ADAPTERS = 3;
const STREAMING_PERSIST_THROTTLE_MS = 2000;
const ACP_CHAT_INJECTED_SKILL_IDS = [
  "zotero-bridge-cli",
  "literature-search-ingest",
  "literature-metadata-search",
] as const;

function nowIso() {
  return new Date().toISOString();
}

function acpChatExecutionProgressScope(sessionRuntime: AcpChatSessionRuntime) {
  return `${sessionRuntime.backendId}\n${String(
    sessionRuntime.snapshot.conversationId || "",
  ).trim()}`;
}

export function getAcpChatExecutionProgress(
  backendId: string,
  conversationId: string,
) {
  return snapshotAcpExecutionProgress(`${backendId}\n${conversationId}`);
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

function normalizeConversationId(value: unknown) {
  return String(value || "").trim();
}

function acpChatSessionKey(backendIdRaw: unknown, conversationIdRaw: unknown) {
  const backendId = normalizeBackendId(backendIdRaw) || activeBackendId;
  const conversationId = normalizeConversationId(conversationIdRaw);
  return `${backendId}\u0000${conversationId}`;
}

function resolveActiveConversationId(backendIdRaw: unknown) {
  const backendId = normalizeBackendId(backendIdRaw) || activeBackendId;
  if (!backendId) {
    return "";
  }
  if (backendId === activeBackendId) {
    return activeConversationId;
  }
  return loadAcpChatSessionIndex(backendId).activeConversationId;
}

function resolveSessionRuntimeConversationId(
  backendId: string,
  conversationIdRaw?: unknown,
) {
  return (
    normalizeConversationId(conversationIdRaw) ||
    resolveActiveConversationId(backendId)
  );
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

function clearActiveAcpChatPrompt(sessionRuntime: AcpChatSessionRuntime) {
  sessionRuntime.activePrompt?.watchdog?.clear();
  sessionRuntime.activePrompt = null;
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
  activeBackendId = loadAcpFrontendState().activeBackendId;
  activeConversationId = activeBackendId
    ? loadAcpChatSessionIndex(activeBackendId).activeConversationId
    : "";
  lastExecutionDisplayMode = getAssistantExecutionDisplayMode();
  unsubscribeExecutionDisplayMode = subscribeAssistantExecutionDisplayMode(
    (mode) => {
      if (mode === lastExecutionDisplayMode) {
        return;
      }
      for (const sessionRuntime of sessionRuntimes.values()) {
        const scopeKey = acpChatExecutionProgressScope(sessionRuntime);
        if (mode === "silent") {
          const hadActiveText =
            !!sessionRuntime.activeAssistantItemId ||
            !!sessionRuntime.activeThoughtItemId;
          completeActiveStreamingTextItems(sessionRuntime);
          if (hadActiveText) {
            emitSessionRuntimeSnapshot(sessionRuntime, {
              uiReason: "critical",
              publishMode: "full",
            });
          }
        } else if (lastExecutionDisplayMode === "silent") {
          discardAcpExecutionProgressCandidate(scopeKey);
        }
      }
      lastExecutionDisplayMode = mode;
    },
  );
  initialized = true;
}

function hydrateSnapshot(backendId: string, conversationId?: string) {
  const restored = loadAcpConversationState(backendId, conversationId);
  const snapshot = {
    ...createEmptyAcpConversationSnapshot(),
    ...restored.snapshot,
    backendId,
    items: [],
    updatedAt: restored.snapshot.updatedAt || nowIso(),
  };
  snapshot.messageCounts = restoreAcpExecutionProgress(
    `${backendId}\n${String(snapshot.conversationId || "").trim()}`,
    snapshot.messageCounts,
    {
      missingCompleteness:
        snapshot.transcriptItemCount === 0 ? "complete" : "unavailable",
    },
  );
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
  const transcriptPaths = resolveAcpChatTranscriptPaths(
    snapshot.conversationStorageDir,
  );
  snapshot.transcriptPath =
    snapshot.transcriptPath || transcriptPaths.transcriptPath;
  snapshot.transcriptIndexPath =
    snapshot.transcriptIndexPath || transcriptPaths.transcriptIndexPath;
  snapshot.transcriptEventSeq = Math.max(
    0,
    Math.floor(
      Number(snapshot.transcriptEventSeq || snapshot.transcriptRevision || 0) ||
        0,
    ),
  );
  snapshot.transcriptRevision = snapshot.transcriptEventSeq;
  snapshot.transcriptItemCount = Math.max(
    0,
    Math.floor(Number(snapshot.transcriptItemCount || 0) || 0),
  );
  snapshot.sessionId = "";
  snapshot.remoteSessionId = String(snapshot.remoteSessionId || "").trim();
  snapshot.remoteSessionRestoreStatus =
    snapshot.remoteSessionRestoreStatus || "none";
  snapshot.status = normalizeAcpStatus(snapshot.status);
  snapshot.promptInterruptState = normalizeAcpPromptInterruptState(
    snapshot.promptInterruptState,
  );
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

function resetSessionRuntimeTransientState(
  sessionRuntime: AcpChatSessionRuntime,
) {
  sessionRuntime.activeAssistantItemId = "";
  sessionRuntime.activeThoughtItemId = "";
  sessionRuntime.activePlanItemId = "";
  sessionRuntime.transcriptItemCount = Math.max(
    0,
    sessionRuntime.snapshot.transcriptItemCount || 0,
  );
  sessionRuntime.transcriptEventSeq = Math.max(
    0,
    sessionRuntime.snapshot.transcriptEventSeq || 0,
  );
  sessionRuntime.transcriptPreview = String(
    sessionRuntime.snapshot.transcriptPreview || "",
  );
  sessionRuntime.transcriptItemsById.clear();
  sessionRuntime.transcriptItemIds = [];
  sessionRuntime.transcriptToolItemIds.clear();
  sessionRuntime.transcriptMirrorLoaded =
    !hasDurableAcpChatTranscript(sessionRuntime);
  sessionRuntime.transcriptHydrateState = undefined;
  sessionRuntime.transcriptHydrateError = undefined;
  sessionRuntime.transcriptHydratePromise = undefined;
  sessionRuntime.pendingPermissionResolver = null;
  sessionRuntime.suppressSessionLoadReplay = false;
}

function rekeySessionRuntime(sessionRuntime: AcpChatSessionRuntime) {
  const nextKey = acpChatSessionKey(
    sessionRuntime.backendId,
    sessionRuntime.snapshot.conversationId,
  );
  if (sessionRuntime.key === nextKey) {
    return;
  }
  sessionRuntimes.delete(sessionRuntime.key);
  sessionRuntime.key = nextKey;
  sessionRuntimes.set(nextKey, sessionRuntime);
}

function getOrCreateSessionRuntime(
  backendIdRaw?: string,
  conversationIdRaw?: string,
) {
  const backendId = normalizeBackendId(backendIdRaw) || activeBackendId;
  const conversationId = resolveSessionRuntimeConversationId(
    backendId,
    conversationIdRaw,
  );
  const key = acpChatSessionKey(backendId, conversationId);
  const existing = sessionRuntimes.get(key);
  if (existing) {
    return existing;
  }
  const sessionRuntime: AcpChatSessionRuntime = {
    key,
    backendId,
    adapter: null,
    snapshot: hydrateSnapshot(backendId, conversationId || undefined),
    uiSnapshot: null,
    uiRevision: 0,
    uiTranscriptRevision: 0,
    uiHasUnpublishedTranscript: false,
    uiPendingPublishMode: null,
    uiPendingChangeKinds: new Set<AcpChatPanelSnapshotChangeKind>(),
    workspaceTranscriptEvents: [],
    unsubscribeUpdate: null,
    unsubscribeClose: null,
    unsubscribeDiagnostics: null,
    unsubscribePermission: null,
    unsubscribeHostBridgePermission: null,
    suppressCloseEvent: false,
    activePrompt: null,
    activeAssistantItemId: "",
    activeThoughtItemId: "",
    activePlanItemId: "",
    transcriptItemCount: 0,
    transcriptEventSeq: 0,
    transcriptPreview: "",
    transcriptItemsById: new Map(),
    transcriptItemIds: [],
    transcriptToolItemIds: new Map(),
    transcriptMirrorLoaded: true,
    transcriptWrites: new Set(),
    pendingPermissionResolver: null,
    suppressSessionLoadReplay: false,
    uiEmitTimer: null,
    persistTimer: null,
    lastLiveActivityMs: Date.now(),
  };
  resetSessionRuntimeTransientState(sessionRuntime);
  sessionRuntimes.set(key, sessionRuntime);
  return sessionRuntime;
}

function touchLiveAcpChatSessionRuntime(sessionRuntime: AcpChatSessionRuntime) {
  sessionRuntime.lastLiveActivityMs = Date.now();
}

function isBusyLiveAcpChatSessionRuntime(
  sessionRuntime: AcpChatSessionRuntime,
) {
  return (
    sessionRuntime.snapshot.busy ||
    sessionRuntime.snapshot.status === "prompting" ||
    sessionRuntime.snapshot.status === "permission-required"
  );
}

async function enforceAcpChatLiveAdapterLimit(
  targetRuntime: AcpChatSessionRuntime,
) {
  const liveSessionRuntimes = Array.from(sessionRuntimes.values()).filter(
    (sessionRuntime) =>
      !!sessionRuntime.adapter && sessionRuntime !== targetRuntime,
  );
  if (liveSessionRuntimes.length < MAX_LIVE_ACP_CHAT_ADAPTERS) {
    return;
  }
  const idle = liveSessionRuntimes
    .filter(
      (sessionRuntime) => !isBusyLiveAcpChatSessionRuntime(sessionRuntime),
    )
    .sort((left, right) => left.lastLiveActivityMs - right.lastLiveActivityMs);
  const evicted = idle[0];
  if (!evicted) {
    throw new Error(
      "ACP Chat live session limit reached; all live sessions are busy.",
    );
  }
  appendDiagnostic(evicted, {
    id: nextOpaqueId("acp-diag"),
    ts: nowIso(),
    kind: "live_session_evicted",
    level: "info",
    message:
      "ACP Chat local connection disconnected because the live session limit was reached.",
    detail: `limit=${MAX_LIVE_ACP_CHAT_ADAPTERS}`,
  });
  await disconnectSessionRuntimeAdapter(evicted);
  markSessionRuntimeConnectionIdle(evicted);
  emitSessionRuntimeSnapshot(evicted);
}

function setSessionRuntimePendingPermissionRequest(
  sessionRuntime: AcpChatSessionRuntime,
  request: AcpPendingPermissionRequest & {
    resolve: (outcome: RequestPermissionOutcome) => void;
  },
) {
  sessionRuntime.pendingPermissionResolver = request.resolve;
  sessionRuntime.snapshot.pendingPermissionRequest = {
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
  sessionRuntime.snapshot.status = "permission-required";
  sessionRuntime.snapshot.busy = true;
  emitSessionRuntimeSnapshot(sessionRuntime);
}

function autoApproveSessionRuntimePermissionRequest(
  sessionRuntime: AcpChatSessionRuntime,
  request: AcpPendingPermissionRequest & {
    resolve: (outcome: RequestPermissionOutcome) => void;
  },
) {
  if (sessionRuntime.snapshot.autoApproveAcpPermissions !== true) {
    return false;
  }
  const optionId = resolveAutoApproveAcpPermissionOptionId(
    request.source,
    request.options,
  );
  if (!optionId) {
    return false;
  }
  request.resolve({ outcome: "selected", optionId });
  appendDiagnostic(sessionRuntime, {
    id: nextOpaqueId("acp-diag"),
    ts: nowIso(),
    kind: "permission_auto_approved",
    level: "info",
    message: `ACP Chat auto-approved permission option: ${optionId}`,
    detail: request.toolTitle || request.summary || request.requestId,
    stage: "permission",
  });
  emitSessionRuntimeSnapshot(sessionRuntime);
  return true;
}

function bindHostBridgePermissionForSessionRuntime(
  sessionRuntime: AcpChatSessionRuntime,
) {
  const conversationId = String(
    sessionRuntime.snapshot.conversationId || "",
  ).trim();
  sessionRuntime.unsubscribeHostBridgePermission?.();
  sessionRuntime.unsubscribeHostBridgePermission = null;
  if (!conversationId) {
    return;
  }
  sessionRuntime.unsubscribeHostBridgePermission =
    registerAcpConversationHostBridgePermissionHandler(
      conversationId,
      (request) => {
        if (
          autoApproveSessionRuntimePermissionRequest(sessionRuntime, request)
        ) {
          return;
        }
        setSessionRuntimePendingPermissionRequest(sessionRuntime, request);
      },
    );
}

function getForegroundSessionRuntime() {
  ensureInitialized();
  return getOrCreateSessionRuntime(activeBackendId);
}

export function getActiveAcpChatOwner() {
  ensureInitialized();
  return {
    backendId: normalizeBackendId(activeBackendId),
    conversationId: normalizeConversationId(
      resolveActiveConversationId(activeBackendId),
    ),
  };
}

function isForegroundSessionRuntime(sessionRuntime: AcpChatSessionRuntime) {
  const activeConversationId = resolveActiveConversationId(activeBackendId);
  return (
    normalizeBackendId(sessionRuntime.backendId) ===
      normalizeBackendId(activeBackendId) &&
    normalizeConversationId(sessionRuntime.snapshot.conversationId) ===
      normalizeConversationId(activeConversationId)
  );
}

function buildAcpChatPanelSnapshotChange(
  sessionRuntime: AcpChatSessionRuntime,
  kinds: AcpChatPanelSnapshotChangeKind[],
  options: { global?: boolean } = {},
): AcpChatPanelSnapshotChange {
  const hasTranscript = kinds.some(
    (kind) =>
      kind === "transcript-append" ||
      kind === "transcript-boundary" ||
      kind === "transcript-progress",
  );
  const transcriptEvents = hasTranscript
    ? sessionRuntime.workspaceTranscriptEvents.splice(0)
    : [];
  return {
    backendId: sessionRuntime.backendId,
    conversationId: sessionRuntime.snapshot.conversationId,
    active: isForegroundSessionRuntime(sessionRuntime),
    global: options.global === true,
    kinds,
    ...(transcriptEvents.length > 0
      ? {
          transcriptEvents,
          transcriptEventSeq: sessionRuntime.transcriptEventSeq,
          transcriptItemCount: sessionRuntime.transcriptItemCount,
        }
      : {}),
  };
}

function notifyAcpChatPanelSnapshotListeners(
  change: AcpChatPanelSnapshotChange | undefined,
) {
  if (!change) {
    return;
  }
  const cloned: AcpChatPanelSnapshotChange = {
    backendId: change.backendId,
    conversationId: change.conversationId,
    active: change.active === true,
    global: change.global === true,
    kinds: [...change.kinds],
    transcriptEvents: change.transcriptEvents?.map((event) => ({
      boundary: event.boundary,
      mutation: JSON.parse(JSON.stringify(event.mutation)),
    })),
    transcriptEventSeq: change.transcriptEventSeq,
    transcriptItemCount: change.transcriptItemCount,
  };
  for (const listener of acpChatPanelListeners) {
    listener(cloned);
  }
}

function resolveAcpChatPanelChangeKindsForPublish(
  reason: AssistantWorkspacePublishReason,
  publishMode: AcpUiPublishMode,
  sessionRuntime: AcpChatSessionRuntime,
  explicitKinds: readonly AcpChatPanelSnapshotChangeKind[] = [],
): AcpChatPanelSnapshotChangeKind[] {
  if (explicitKinds.length > 0) {
    return Array.from(new Set(explicitKinds));
  }
  if (publishMode === "metadata") {
    if (sessionRuntime.snapshot.pendingPermissionRequest) {
      return ["permission"];
    }
    return ["status"];
  }
  if (reason === "live") {
    return ["transcript-append"];
  }
  return ["transcript-boundary"];
}

function isLiveAcpChatSessionRuntime(sessionRuntime: AcpChatSessionRuntime) {
  const status = normalizeAcpStatus(sessionRuntime.snapshot.status);
  return (
    !!sessionRuntime.adapter ||
    sessionRuntime.snapshot.busy === true ||
    status === "checking-command" ||
    status === "spawning" ||
    status === "initializing" ||
    status === "connected" ||
    status === "prompting" ||
    status === "permission-required" ||
    status === "auth-required"
  );
}

function acpChatTranscriptMirrorCacheKey(
  sessionRuntime: AcpChatSessionRuntime,
) {
  return acpChatSessionKey(
    sessionRuntime.backendId,
    sessionRuntime.snapshot.conversationId,
  );
}

function isPinnedAcpChatTranscriptMirror(
  sessionRuntime: AcpChatSessionRuntime,
) {
  return (
    isLiveAcpChatSessionRuntime(sessionRuntime) ||
    isForegroundSessionRuntime(sessionRuntime)
  );
}

function forceReleaseAcpChatTranscriptMirror(
  sessionRuntime: AcpChatSessionRuntime,
) {
  const key = acpChatTranscriptMirrorCacheKey(sessionRuntime);
  coldAcpChatTranscriptMirrorLru.delete(key);
  resetChatTranscriptMirror(sessionRuntime);
  sessionRuntime.transcriptMirrorLoaded = false;
  sessionRuntime.transcriptHydrateState = undefined;
  sessionRuntime.transcriptHydrateError = undefined;
  sessionRuntime.transcriptHydratePromise = undefined;
  sessionRuntime.uiSnapshot = null;
  sessionRuntime.uiHasUnpublishedTranscript = false;
  sessionRuntime.uiPendingPublishMode = null;
}

function pruneColdAcpChatTranscriptMirrorLru() {
  for (const key of Array.from(coldAcpChatTranscriptMirrorLru.keys())) {
    const sessionRuntime = sessionRuntimes.get(key);
    if (!sessionRuntime) {
      coldAcpChatTranscriptMirrorLru.delete(key);
      continue;
    }
    if (isLiveAcpChatSessionRuntime(sessionRuntime)) {
      coldAcpChatTranscriptMirrorLru.delete(key);
    }
  }
  while (
    coldAcpChatTranscriptMirrorLru.size >
    ACP_CHAT_COLD_TRANSCRIPT_MIRROR_CACHE_LIMIT
  ) {
    const key = coldAcpChatTranscriptMirrorLru.keys().next().value;
    if (!key) {
      break;
    }
    const sessionRuntime = sessionRuntimes.get(key);
    coldAcpChatTranscriptMirrorLru.delete(key);
    if (sessionRuntime && !isPinnedAcpChatTranscriptMirror(sessionRuntime)) {
      forceReleaseAcpChatTranscriptMirror(sessionRuntime);
    }
  }
}

function touchColdAcpChatTranscriptMirror(
  sessionRuntime: AcpChatSessionRuntime,
) {
  const key = acpChatTranscriptMirrorCacheKey(sessionRuntime);
  if (!key || isLiveAcpChatSessionRuntime(sessionRuntime)) {
    coldAcpChatTranscriptMirrorLru.delete(key);
    return;
  }
  if (!sessionRuntime.transcriptMirrorLoaded) {
    return;
  }
  coldAcpChatTranscriptMirrorLru.delete(key);
  coldAcpChatTranscriptMirrorLru.set(key, true);
  pruneColdAcpChatTranscriptMirrorLru();
}

function updateSnapshotTimestamp(sessionRuntime: AcpChatSessionRuntime) {
  sessionRuntime.snapshot.authMethodIds =
    sessionRuntime.snapshot.authMethods.map((entry) => entry.id);
  sessionRuntime.snapshot.updatedAt = nowIso();
}

function persistSessionRuntimeSnapshotNow(
  sessionRuntime: AcpChatSessionRuntime,
) {
  if (
    sessionRuntime.snapshot.backendId &&
    sessionRuntime.snapshot.conversationId
  ) {
    const persistent = cloneSnapshotValue(sessionRuntime.snapshot);
    persistent.items = [];
    persistent.sessionId = "";
    persistent.busy = false;
    persistent.status = "idle";
    persistent.pendingPermissionRequest = null;
    persistent.prerequisiteError = "";
    saveAcpConversationState(persistent);
  }
}

function markSessionRuntimeConnectionIdle(
  sessionRuntime: AcpChatSessionRuntime,
  options: {
    clearErrors?: boolean;
    clearStderrTail?: boolean;
    lifecycleEvent?: string;
  } = {},
) {
  sessionRuntime.snapshot.sessionId = "";
  sessionRuntime.snapshot.busy = false;
  sessionRuntime.snapshot.status = "idle";
  sessionRuntime.snapshot.pendingPermissionRequest = null;
  if (options.clearErrors) {
    sessionRuntime.snapshot.lastError = "";
    sessionRuntime.snapshot.prerequisiteError = "";
  }
  if (options.clearStderrTail) {
    sessionRuntime.snapshot.stderrTail = "";
  }
  if (options.lifecycleEvent) {
    sessionRuntime.snapshot.lastLifecycleEvent = options.lifecycleEvent;
  }
}

function releaseIdleBackgroundTranscriptMirror(
  sessionRuntime: AcpChatSessionRuntime,
) {
  if (isLiveAcpChatSessionRuntime(sessionRuntime)) {
    coldAcpChatTranscriptMirrorLru.delete(
      acpChatTranscriptMirrorCacheKey(sessionRuntime),
    );
    return;
  }
  if (isForegroundSessionRuntime(sessionRuntime)) {
    touchColdAcpChatTranscriptMirror(sessionRuntime);
    return;
  }
  if (
    coldAcpChatTranscriptMirrorLru.has(
      acpChatTranscriptMirrorCacheKey(sessionRuntime),
    )
  ) {
    return;
  }
  if (sessionRuntime.transcriptWrites.size > 0) {
    if (!sessionRuntime.transcriptMirrorReleasePromise) {
      const pending = Array.from(sessionRuntime.transcriptWrites);
      sessionRuntime.transcriptMirrorReleasePromise = Promise.allSettled(
        pending,
      )
        .then(() => {
          sessionRuntime.transcriptMirrorReleasePromise = undefined;
          releaseIdleBackgroundTranscriptMirror(sessionRuntime);
        })
        .catch(() => {
          sessionRuntime.transcriptMirrorReleasePromise = undefined;
        });
    }
    return;
  }
  forceReleaseAcpChatTranscriptMirror(sessionRuntime);
}

function pruneIdleBackgroundTranscriptMirrors() {
  for (const sessionRuntime of sessionRuntimes.values()) {
    releaseIdleBackgroundTranscriptMirror(sessionRuntime);
  }
}

async function waitForAcpChatShutdownTask(
  task: Promise<unknown>,
  timeoutMs = ACP_CHAT_SHUTDOWN_DETACH_TIMEOUT_MS,
) {
  if (timeoutMs <= 0) {
    return { timedOut: true };
  }
  return Promise.race([
    task.then(
      () => ({ timedOut: false }),
      (error) => ({ timedOut: false, error }),
    ),
    new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    }),
  ]);
}

function resolveAcpConversationSnapshotItemMode(
  options?: AcpConversationUiSnapshotReadOptions,
): AcpConversationSnapshotItemMode {
  return options?.itemMode === "structural" ? "structural" : "full";
}

function applyPublishedSessionRuntimeSnapshotMetadata(
  sessionRuntime: AcpChatSessionRuntime,
  cloned: AcpConversationSnapshot & Record<string, unknown>,
) {
  cloned.uiRevision = sessionRuntime.uiRevision;
  cloned.transcriptRevision = sessionRuntime.snapshot.transcriptRevision;
  cloned.transcriptEventSeq = sessionRuntime.snapshot.transcriptEventSeq;
  cloned.transcriptItemCount = sessionRuntime.snapshot.transcriptItemCount;
  cloned.transcriptPreview = sessionRuntime.snapshot.transcriptPreview;
}

function clonePublishedSessionRuntimeSnapshot(
  sessionRuntime: AcpChatSessionRuntime,
  options?: AcpConversationUiSnapshotReadOptions,
) {
  const itemMode = resolveAcpConversationSnapshotItemMode(options);
  if (itemMode === "structural") {
    const source = sessionRuntime.uiSnapshot || sessionRuntime.snapshot;
    const cloned = cloneSnapshotValue({
      ...source,
      items: [],
    }) as AcpConversationSnapshot & Record<string, unknown>;
    applyPublishedSessionRuntimeSnapshotMetadata(sessionRuntime, cloned);
    cloned.items = mergeStructuralConversationItems(
      sessionRuntime,
      sessionRuntime.uiSnapshot,
    );
    return cloned;
  }
  if (!sessionRuntime.uiSnapshot) {
    sessionRuntime.uiSnapshot = cloneSnapshotValue(sessionRuntime.snapshot);
  }
  const cloned = cloneSnapshotValue(
    sessionRuntime.uiSnapshot,
  ) as AcpConversationSnapshot & Record<string, unknown>;
  applyPublishedSessionRuntimeSnapshotMetadata(sessionRuntime, cloned);
  cloned.items = sessionRuntime.transcriptMirrorLoaded
    ? readSessionRuntimeTranscriptMirrorItems(sessionRuntime)
    : [];
  return cloned;
}

function markSessionRuntimeTranscriptUnpublished(
  sessionRuntime: AcpChatSessionRuntime,
) {
  sessionRuntime.uiHasUnpublishedTranscript = true;
}

function resolveAcpUiPublishMode(options: {
  publishMode?: AcpUiPublishMode;
  publishTranscript?: boolean;
}) {
  if (options.publishMode) {
    return options.publishMode;
  }
  return options.publishTranscript === false ? "metadata" : "full";
}

function mergeAcpUiPublishMode(
  current: AcpUiPublishMode | null,
  next: AcpUiPublishMode,
) {
  if (current === "full" || next === "full") {
    return "full";
  }
  if (current === "structural" || next === "structural") {
    return "structural";
  }
  return "metadata";
}

function mergeStructuralConversationItems(
  sessionRuntime: AcpChatSessionRuntime,
  previous: AcpConversationSnapshot | null,
) {
  const byId = new Map<string, AcpConversationItem>();
  const remember = (item: AcpConversationItem | undefined) => {
    if (item?.kind !== "plan") {
      return;
    }
    byId.set(item.id, cloneAcpConversationItem(item));
  };
  for (const item of previous?.items || []) {
    remember(item);
  }
  if (sessionRuntime.activePlanItemId) {
    remember(
      sessionRuntime.transcriptItemsById.get(sessionRuntime.activePlanItemId),
    );
  }
  for (const itemId of sessionRuntime.transcriptItemIds) {
    remember(sessionRuntime.transcriptItemsById.get(itemId));
  }
  return Array.from(byId.values());
}

function updatePublishedSessionRuntimeSnapshot(
  sessionRuntime: AcpChatSessionRuntime,
  publishMode: AcpUiPublishMode,
) {
  const previous = sessionRuntime.uiSnapshot;
  const next = cloneSnapshotValue(sessionRuntime.snapshot);
  if (publishMode === "structural") {
    next.items = mergeStructuralConversationItems(sessionRuntime, previous);
  } else {
    next.items = sessionRuntime.transcriptMirrorLoaded
      ? readSessionRuntimeTranscriptMirrorItems(sessionRuntime)
      : [];
  }
  sessionRuntime.uiSnapshot = next;
  sessionRuntime.uiRevision += 1;
  if (publishMode !== "metadata") {
    sessionRuntime.uiTranscriptRevision =
      sessionRuntime.snapshot.transcriptRevision;
    if (publishMode === "full") {
      sessionRuntime.uiHasUnpublishedTranscript = false;
    }
  }
}

function notifyConversationListenersNow(sessionRuntime: AcpChatSessionRuntime) {
  if (!isForegroundSessionRuntime(sessionRuntime)) {
    return;
  }
  const cloned = clonePublishedSessionRuntimeSnapshot(sessionRuntime);
  for (const listener of listeners) {
    listener(cloned);
  }
}

function notifyFrontendListenersNow(change?: AcpChatPanelSnapshotChange) {
  const frontend = buildFrontendSnapshot({
    uiVisible: true,
    itemMode: "structural",
  });
  for (const listener of frontendListeners) {
    listener(frontend);
  }
  notifyAcpChatPanelSnapshotListeners(change);
}

function consumePendingAcpChatPanelChangeKinds(
  sessionRuntime: AcpChatSessionRuntime,
  additional: readonly AcpChatPanelSnapshotChangeKind[] = [],
) {
  const kinds = Array.from(
    new Set([...sessionRuntime.uiPendingChangeKinds, ...additional]),
  );
  sessionRuntime.uiPendingChangeKinds.clear();
  return kinds;
}

function flushPendingPersistence(sessionRuntime: AcpChatSessionRuntime) {
  if (sessionRuntime.persistTimer) {
    clearTimeout(sessionRuntime.persistTimer);
    sessionRuntime.persistTimer = null;
  }
  persistSessionRuntimeSnapshotNow(sessionRuntime);
}

function flushPendingUiEmit(
  sessionRuntime: AcpChatSessionRuntime,
  publishMode: AcpUiPublishMode = "full",
  reason: AssistantWorkspacePublishReason = "critical",
  changeKinds: readonly AcpChatPanelSnapshotChangeKind[] = [],
) {
  if (sessionRuntime.uiEmitTimer) {
    clearTimeout(sessionRuntime.uiEmitTimer);
    sessionRuntime.uiEmitTimer = null;
  }
  const mode = mergeAcpUiPublishMode(
    sessionRuntime.uiPendingPublishMode,
    publishMode,
  );
  sessionRuntime.uiPendingPublishMode = null;
  const pendingChangeKinds = consumePendingAcpChatPanelChangeKinds(
    sessionRuntime,
    changeKinds,
  );
  updatePublishedSessionRuntimeSnapshot(sessionRuntime, mode);
  notifyConversationListenersNow(sessionRuntime);
  notifyFrontendListenersNow(
    buildAcpChatPanelSnapshotChange(
      sessionRuntime,
      resolveAcpChatPanelChangeKindsForPublish(
        reason,
        mode,
        sessionRuntime,
        pendingChangeKinds,
      ),
    ),
  );
}

function schedulePersistenceFlush(sessionRuntime: AcpChatSessionRuntime) {
  if (sessionRuntime.persistTimer) {
    return;
  }
  sessionRuntime.persistTimer = setTimeout(() => {
    sessionRuntime.persistTimer = null;
    persistSessionRuntimeSnapshotNow(sessionRuntime);
  }, STREAMING_PERSIST_THROTTLE_MS);
}

function scheduleUiEmit(
  sessionRuntime: AcpChatSessionRuntime,
  publishMode: AcpUiPublishMode = "metadata",
  reason: AssistantWorkspacePublishReason = "live",
  changeKinds: readonly AcpChatPanelSnapshotChangeKind[] = [],
) {
  sessionRuntime.uiPendingPublishMode = mergeAcpUiPublishMode(
    sessionRuntime.uiPendingPublishMode,
    publishMode,
  );
  for (const kind of changeKinds) {
    sessionRuntime.uiPendingChangeKinds.add(kind);
  }
  if (sessionRuntime.uiEmitTimer) {
    return;
  }
  sessionRuntime.uiEmitTimer = setTimeout(() => {
    sessionRuntime.uiEmitTimer = null;
    const mode = sessionRuntime.uiPendingPublishMode || "metadata";
    sessionRuntime.uiPendingPublishMode = null;
    const pendingChangeKinds =
      consumePendingAcpChatPanelChangeKinds(sessionRuntime);
    updatePublishedSessionRuntimeSnapshot(sessionRuntime, mode);
    notifyConversationListenersNow(sessionRuntime);
    notifyFrontendListenersNow(
      buildAcpChatPanelSnapshotChange(
        sessionRuntime,
        resolveAcpChatPanelChangeKindsForPublish(
          reason,
          mode,
          sessionRuntime,
          pendingChangeKinds,
        ),
      ),
    );
  }, ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS);
}

export function inspectSyntheticAcpChatReplayTimers(args: {
  backendId: string;
  conversationId: string;
}): AcpRuntimeReplayLogicalTimerInspection {
  if (
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) ||
    !__acp_runtime_replay_profiler_enabled__
  ) {
    return { timers: [], warnings: [] };
  }
  const key = acpChatSessionKey(args.backendId, args.conversationId);
  const sessionRuntime = sessionRuntimes.get(key);
  if (!sessionRuntime) {
    return {
      timers: [],
      warnings: ["logical-timer-contamination:acp-chat-owner-missing"],
    };
  }
  const ownerKey = `${args.backendId}\n${args.conversationId}`;
  const timers: AcpRuntimeReplayLogicalTimerDescriptor[] = [];

  if (sessionRuntime.uiEmitTimer) {
    const nativeToken = sessionRuntime.uiEmitTimer;
    let currentToken = nativeToken;
    timers.push({
      domain: "acp-chat-ui-emit",
      ownerKey,
      delayMs: ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS,
      nativeToken,
      detachNative: () => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.uiEmitTimer !== currentToken
        ) {
          return false;
        }
        clearTimeout(currentToken);
        return true;
      },
      fireIfCurrent: () => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.uiEmitTimer !== currentToken
        ) {
          return false;
        }
        sessionRuntime.uiEmitTimer = null;
        const mode = sessionRuntime.uiPendingPublishMode || "metadata";
        sessionRuntime.uiPendingPublishMode = null;
        const pendingChangeKinds =
          consumePendingAcpChatPanelChangeKinds(sessionRuntime);
        updatePublishedSessionRuntimeSnapshot(sessionRuntime, mode);
        notifyConversationListenersNow(sessionRuntime);
        notifyFrontendListenersNow(
          buildAcpChatPanelSnapshotChange(
            sessionRuntime,
            resolveAcpChatPanelChangeKindsForPublish(
              "live",
              mode,
              sessionRuntime,
              pendingChangeKinds,
            ),
          ),
        );
        return true;
      },
      resumeNative: (remainingMs) => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.uiEmitTimer !== currentToken
        ) {
          return false;
        }
        currentToken = setTimeout(
          () => {
            sessionRuntime.uiEmitTimer = null;
            const mode = sessionRuntime.uiPendingPublishMode || "metadata";
            sessionRuntime.uiPendingPublishMode = null;
            const pendingChangeKinds =
              consumePendingAcpChatPanelChangeKinds(sessionRuntime);
            updatePublishedSessionRuntimeSnapshot(sessionRuntime, mode);
            notifyConversationListenersNow(sessionRuntime);
            notifyFrontendListenersNow(
              buildAcpChatPanelSnapshotChange(
                sessionRuntime,
                resolveAcpChatPanelChangeKindsForPublish(
                  "live",
                  mode,
                  sessionRuntime,
                  pendingChangeKinds,
                ),
              ),
            );
          },
          Math.max(0, remainingMs),
        );
        sessionRuntime.uiEmitTimer = currentToken;
        return true;
      },
    });
  }

  if (sessionRuntime.persistTimer) {
    const nativeToken = sessionRuntime.persistTimer;
    let currentToken = nativeToken;
    timers.push({
      domain: "acp-chat-persist",
      ownerKey,
      delayMs: STREAMING_PERSIST_THROTTLE_MS,
      nativeToken,
      detachNative: () => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.persistTimer !== currentToken
        ) {
          return false;
        }
        clearTimeout(currentToken);
        return true;
      },
      fireIfCurrent: () => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.persistTimer !== currentToken
        ) {
          return false;
        }
        sessionRuntime.persistTimer = null;
        persistSessionRuntimeSnapshotNow(sessionRuntime);
        return true;
      },
      resumeNative: (remainingMs) => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.persistTimer !== currentToken
        ) {
          return false;
        }
        currentToken = setTimeout(
          () => {
            sessionRuntime.persistTimer = null;
            persistSessionRuntimeSnapshotNow(sessionRuntime);
          },
          Math.max(0, remainingMs),
        );
        sessionRuntime.persistTimer = currentToken;
        return true;
      },
      fallbackFlush: () => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.persistTimer !== currentToken
        ) {
          return false;
        }
        flushPendingPersistence(sessionRuntime);
        return true;
      },
    });
  }

  return { timers, warnings: [] };
}

function publishSessionRuntimeUiSnapshot(
  sessionRuntime: AcpChatSessionRuntime,
  reason: AssistantWorkspacePublishReason,
  publishMode: AcpUiPublishMode,
  changeKinds: readonly AcpChatPanelSnapshotChangeKind[] = [],
) {
  if (reason === "background") {
    return;
  }
  if (reason === "live") {
    if (!canPublishAssistantWorkspaceLiveUpdates()) {
      return;
    }
    if (publishMode === "full") {
      flushPendingUiEmit(sessionRuntime, publishMode, reason, changeKinds);
      return;
    }
    scheduleUiEmit(sessionRuntime, publishMode, reason, changeKinds);
    return;
  }
  flushPendingUiEmit(sessionRuntime, publishMode, reason, changeKinds);
}

function emitSessionRuntimeSnapshot(
  sessionRuntime: AcpChatSessionRuntime,
  options: AcpEmitOptions = {},
) {
  if (options.touchUpdatedAt !== false) {
    updateSnapshotTimestamp(sessionRuntime);
  } else {
    sessionRuntime.snapshot.authMethodIds =
      sessionRuntime.snapshot.authMethods.map((entry) => entry.id);
  }
  const persist = options.persist !== false;
  if (persist) {
    if (options.throttlePersist) {
      schedulePersistenceFlush(sessionRuntime);
    } else {
      flushPendingPersistence(sessionRuntime);
    }
  }
  if (options.notifyUi !== false) {
    const reason: AssistantWorkspacePublishReason =
      options.uiReason || (options.throttleUi ? "live" : "critical");
    const publishMode = resolveAcpUiPublishMode({
      publishMode: options.publishMode,
      publishTranscript:
        options.publishTranscript ?? !sessionRuntime.uiHasUnpublishedTranscript,
    });
    publishSessionRuntimeUiSnapshot(
      sessionRuntime,
      reason,
      publishMode,
      options.changeKinds,
    );
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
  if (!syntheticAcpChatReplayLeaseOwnsForeground()) {
    if (cachedAcpBackends.length === 0) {
      if (activeBackendId) {
        activeBackendId = "";
        activeConversationId = "";
        saveAcpFrontendState({ activeBackendId });
      }
      return cachedAcpBackends;
    }
    if (
      (!activeBackendId || !ids.has(activeBackendId)) &&
      cachedAcpBackends[0]
    ) {
      activeBackendId = cachedAcpBackends[0].id;
      activeConversationId =
        loadAcpChatSessionIndex(activeBackendId).activeConversationId;
      saveAcpFrontendState({ activeBackendId });
    }
  }
  for (const backend of cachedAcpBackends) {
    const backendSessionRuntimes = Array.from(sessionRuntimes.values()).filter(
      (sessionRuntime) => sessionRuntime.backendId === backend.id,
    );
    if (backendSessionRuntimes.length === 0 && backend.id === activeBackendId) {
      backendSessionRuntimes.push(getOrCreateSessionRuntime(backend.id));
    }
    for (const sessionRuntime of backendSessionRuntimes) {
      sessionRuntime.snapshot.backend = backend;
      applyRuntimeOptionsCache(sessionRuntime, backend);
    }
  }
  return cachedAcpBackends;
}

async function requireAvailableAcpBackend(
  backendId: string,
  refresh: "always" | "if-missing",
) {
  let backend = cachedAcpBackends.find((entry) => entry.id === backendId);
  if (refresh === "always" || !backend) {
    await refreshAcpBackends();
    backend = cachedAcpBackends.find((entry) => entry.id === backendId);
  }
  if (!backend) {
    throw new Error(`ACP backend "${backendId}" is not available`);
  }
  return backend;
}

async function resolveBackendForSessionRuntime(
  sessionRuntime: AcpChatSessionRuntime,
) {
  const backends = await refreshAcpBackends();
  if (!sessionRuntime.backendId && backends[0]) {
    sessionRuntime.backendId = backends[0].id;
    sessionRuntime.snapshot.backendId = backends[0].id;
    if (!activeBackendId) {
      activeBackendId = backends[0].id;
      activeConversationId =
        loadAcpChatSessionIndex(activeBackendId).activeConversationId;
      saveAcpFrontendState({ activeBackendId });
    }
    rekeySessionRuntime(sessionRuntime);
  }
  const backend =
    backends.find((entry) => entry.id === sessionRuntime.backendId) || null;
  if (!backend) {
    throw new Error(
      `ACP backend "${sessionRuntime.backendId}" is not available`,
    );
  }
  const paths = resolveAcpChatRuntimePaths(
    backend.id,
    sessionRuntime.snapshot.conversationId,
  );
  sessionRuntime.snapshot.backend = backend;
  sessionRuntime.snapshot.backendId = backend.id;
  sessionRuntime.snapshot.agentWorkspaceDir = paths.agentWorkspaceDir;
  sessionRuntime.snapshot.conversationStorageDir = paths.conversationStorageDir;
  sessionRuntime.snapshot.sessionCwd = paths.agentWorkspaceDir;
  sessionRuntime.snapshot.workspaceDir = paths.agentWorkspaceDir;
  sessionRuntime.snapshot.runtimeDir = paths.runtimeDir;
  applyRuntimeOptionsCache(sessionRuntime, backend);
  return backend;
}

function appendDiagnostic(
  sessionRuntime: AcpChatSessionRuntime,
  entry: AcpDiagnosticsEntry,
) {
  sessionRuntime.snapshot.diagnostics = [
    ...sessionRuntime.snapshot.diagnostics,
    { ...entry },
  ].slice(-MAX_DIAGNOSTICS);
  sessionRuntime.snapshot.lastLifecycleEvent = String(entry.kind || "").trim();
  if (String(entry.kind || "").trim() === "stderr") {
    sessionRuntime.snapshot.stderrTail = String(entry.detail || "").trim();
  }
}

function appendErrorDiagnostic(args: {
  sessionRuntime: AcpChatSessionRuntime;
  kind: string;
  message: string;
  error: unknown;
  stage: string;
}) {
  const serialized = serializeAcpError(args.error, args.stage);
  appendDiagnostic(args.sessionRuntime, {
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

function truncateAcpChatPreview(value: unknown) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.length > 8 * 1024
    ? `${text.slice(0, 8 * 1024)}...<truncated>`
    : text;
}

function acpChatPreviewFromItem(item: AcpConversationItem) {
  if (item.kind === "message" || item.kind === "thought") {
    return truncateAcpChatPreview(item.text);
  }
  if (item.kind === "status") {
    return truncateAcpChatPreview(item.text);
  }
  if (item.kind === "tool_call") {
    return truncateAcpChatPreview(
      item.summary || item.resultSummary || item.inputSummary || item.title,
    );
  }
  if (item.kind === "plan") {
    return truncateAcpChatPreview(
      item.entries
        .map((entry) => entry.content)
        .filter(Boolean)
        .join(" "),
    );
  }
  return "";
}

function hasDurableAcpChatTranscript(sessionRuntime: AcpChatSessionRuntime) {
  return (
    (Number(sessionRuntime.snapshot.transcriptItemCount) || 0) > 0 ||
    (Number(sessionRuntime.snapshot.transcriptEventSeq) || 0) > 0 ||
    (Number(sessionRuntime.snapshot.transcriptRevision) || 0) > 0
  );
}

function rememberTranscriptItemId(
  sessionRuntime: AcpChatSessionRuntime,
  itemId: string,
) {
  if (!itemId || sessionRuntime.transcriptItemIds.includes(itemId)) {
    return;
  }
  sessionRuntime.transcriptItemIds.push(itemId);
}

function forgetTranscriptItemId(
  sessionRuntime: AcpChatSessionRuntime,
  itemId: string,
) {
  sessionRuntime.transcriptItemIds = sessionRuntime.transcriptItemIds.filter(
    (id) => id !== itemId,
  );
}

function rememberTranscriptToolMapping(
  sessionRuntime: AcpChatSessionRuntime,
  item: AcpConversationItem,
) {
  if (item.kind === "tool_call" && item.toolCallId) {
    sessionRuntime.transcriptToolItemIds.set(item.toolCallId, item.id);
  }
}

function readSessionRuntimeTranscriptMirrorItems(
  sessionRuntime: AcpChatSessionRuntime,
) {
  return sessionRuntime.transcriptItemIds
    .map((itemId) => sessionRuntime.transcriptItemsById.get(itemId))
    .filter((item): item is AcpConversationItem => !!item)
    .map((item) => cloneAcpConversationItem(item));
}

function applyChatTranscriptEventToMirror(
  sessionRuntime: AcpChatSessionRuntime,
  args: {
    op: "upsert_item" | "append_text" | "patch_item" | "delete_item";
    itemId: string;
    item?: AcpConversationItem;
    text?: string;
    patch?: Partial<AcpConversationItem>;
  },
) {
  const itemId = normalizeString(args.itemId);
  if (!itemId) {
    return;
  }
  if (args.op === "upsert_item" && args.item) {
    const cloned = cloneAcpConversationItem(args.item);
    rememberTranscriptItemId(sessionRuntime, itemId);
    sessionRuntime.transcriptItemsById.set(itemId, cloned);
    rememberTranscriptToolMapping(sessionRuntime, cloned);
    return;
  }
  if (args.op === "append_text") {
    const current = sessionRuntime.transcriptItemsById.get(itemId);
    if (current?.kind === "message" || current?.kind === "thought") {
      sessionRuntime.transcriptItemsById.set(itemId, {
        ...current,
        text: `${current.text || ""}${String(args.text || "")}`,
        updatedAt: nowIso(),
      } as AcpConversationItem);
    }
    return;
  }
  if (args.op === "patch_item" && args.patch) {
    const current = sessionRuntime.transcriptItemsById.get(itemId);
    if (!current) {
      return;
    }
    const next = {
      ...current,
      ...args.patch,
      id: current.id,
      kind: current.kind,
    } as AcpConversationItem;
    sessionRuntime.transcriptItemsById.set(itemId, next);
    rememberTranscriptToolMapping(sessionRuntime, next);
    return;
  }
  if (args.op === "delete_item") {
    const current = sessionRuntime.transcriptItemsById.get(itemId);
    if (current?.kind === "tool_call" && current.toolCallId) {
      sessionRuntime.transcriptToolItemIds.delete(current.toolCallId);
    }
    sessionRuntime.transcriptItemsById.delete(itemId);
    forgetTranscriptItemId(sessionRuntime, itemId);
  }
}

function resetChatTranscriptMirror(sessionRuntime: AcpChatSessionRuntime) {
  sessionRuntime.transcriptItemsById.clear();
  sessionRuntime.transcriptItemIds = [];
  sessionRuntime.transcriptToolItemIds.clear();
  sessionRuntime.activeAssistantItemId = "";
  sessionRuntime.activeThoughtItemId = "";
  sessionRuntime.activePlanItemId = "";
  sessionRuntime.workspaceTranscriptEvents = [];
}

function loadChatTranscriptMirrorFromItems(
  sessionRuntime: AcpChatSessionRuntime,
  args: { items: AcpConversationItem[]; eventSeq: number },
) {
  resetChatTranscriptMirror(sessionRuntime);
  for (const item of args.items) {
    const cloned = cloneAcpConversationItem(item);
    rememberTranscriptItemId(sessionRuntime, cloned.id);
    sessionRuntime.transcriptItemsById.set(cloned.id, cloned);
    rememberTranscriptToolMapping(sessionRuntime, cloned);
  }
  sessionRuntime.transcriptItemCount = args.items.length;
  sessionRuntime.transcriptEventSeq = Math.max(
    Number(args.eventSeq) || 0,
    Number(sessionRuntime.snapshot.transcriptEventSeq) || 0,
  );
  sessionRuntime.transcriptPreview =
    args.items
      .slice()
      .reverse()
      .map((item) => acpChatPreviewFromItem(item))
      .find((text) => !!text) || "";
  sessionRuntime.snapshot.transcriptItemCount =
    sessionRuntime.transcriptItemCount;
  sessionRuntime.snapshot.transcriptEventSeq =
    sessionRuntime.transcriptEventSeq;
  sessionRuntime.snapshot.transcriptRevision =
    sessionRuntime.transcriptEventSeq;
  sessionRuntime.snapshot.transcriptPreview =
    sessionRuntime.transcriptPreview || undefined;
  sessionRuntime.transcriptMirrorLoaded = true;
  sessionRuntime.transcriptHydrateState = undefined;
  sessionRuntime.transcriptHydrateError = undefined;
}

function applyChatTranscriptMetadata(
  sessionRuntime: AcpChatSessionRuntime,
  args: {
    item?: AcpConversationItem;
    text?: string;
    newItem?: boolean;
  },
) {
  const paths = resolveAcpChatTranscriptPaths(
    sessionRuntime.snapshot.conversationStorageDir,
  );
  if (args.newItem) {
    sessionRuntime.transcriptItemCount += 1;
  }
  sessionRuntime.transcriptEventSeq += 1;
  sessionRuntime.snapshot.transcriptPath = paths.transcriptPath;
  sessionRuntime.snapshot.transcriptIndexPath = paths.transcriptIndexPath;
  sessionRuntime.snapshot.transcriptRevision =
    sessionRuntime.transcriptEventSeq;
  sessionRuntime.snapshot.transcriptEventSeq =
    sessionRuntime.transcriptEventSeq;
  sessionRuntime.snapshot.transcriptItemCount =
    sessionRuntime.transcriptItemCount;
  const preview = args.text
    ? truncateAcpChatPreview(args.text)
    : args.item
      ? acpChatPreviewFromItem(args.item)
      : "";
  if (preview) {
    sessionRuntime.transcriptPreview = preview;
    sessionRuntime.snapshot.transcriptPreview = preview;
  }
}

function queueChatTranscriptEvent(
  sessionRuntime: AcpChatSessionRuntime,
  args: {
    op: "upsert_item" | "append_text" | "patch_item" | "delete_item";
    itemId: string;
    item?: AcpConversationItem;
    text?: string;
    patch?: Partial<AcpConversationItem>;
    createdAt: string;
    newItem?: boolean;
    boundary?: AssistantWorkspaceTranscriptBoundary;
  },
) {
  const previousItem = sessionRuntime.transcriptItemsById.get(args.itemId);
  applyChatTranscriptEventToMirror(sessionRuntime, args);
  applyChatTranscriptMetadata(sessionRuntime, {
    item: args.item,
    text: args.text,
    newItem: args.newItem,
  });
  const currentItem = sessionRuntime.transcriptItemsById.get(args.itemId);
  const mutation = createAssistantWorkspaceTranscriptMutation({
    op: args.op,
    itemId: args.itemId,
    beforeItem: previousItem as Record<string, unknown> | undefined,
    afterItem: currentItem as unknown as Record<string, unknown> | undefined,
    text: args.text,
  });
  if (mutation) {
    sessionRuntime.workspaceTranscriptEvents.push({
      boundary: args.boundary || "hard-boundary",
      mutation,
    });
  }
  enqueueAcpChatTranscriptEvent({
    conversationStorageDir: sessionRuntime.snapshot.conversationStorageDir,
    op: args.op,
    itemId: args.itemId,
    item: args.item,
    text: args.text,
    patch: args.patch,
    createdAt: args.createdAt,
  });
}

function upsertTranscriptItem(
  sessionRuntime: AcpChatSessionRuntime,
  item: AcpConversationItem,
  boundary?: AssistantWorkspaceTranscriptBoundary,
) {
  queueChatTranscriptEvent(sessionRuntime, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: item.createdAt || nowIso(),
    newItem: true,
    boundary,
  });
}

function patchTranscriptItem(
  sessionRuntime: AcpChatSessionRuntime,
  itemId: string,
  patch: Partial<AcpConversationItem>,
  boundary?: AssistantWorkspaceTranscriptBoundary,
) {
  queueChatTranscriptEvent(sessionRuntime, {
    op: "patch_item",
    itemId,
    patch,
    createdAt: nowIso(),
    boundary,
  });
}

function appendTranscriptText(
  sessionRuntime: AcpChatSessionRuntime,
  item: AcpConversationMessageItem | AcpConversationThoughtItem,
  text: string,
) {
  queueChatTranscriptEvent(sessionRuntime, {
    op: "append_text",
    itemId: item.id,
    text,
    createdAt: nowIso(),
    boundary: "text-continuation",
  });
}

function appendStreamingTranscriptText(
  sessionRuntime: AcpChatSessionRuntime,
  args:
    | {
        kind: "message";
        role: AcpConversationMessageItem["role"];
        text: string;
      }
    | {
        kind: "thought";
        text: string;
      },
) {
  if (args.kind === "message") {
    completeActiveStreamingTextItems(sessionRuntime, {
      except: sessionRuntime.activeAssistantItemId,
    });
    let target = getLatestActiveAssistantItem(sessionRuntime);
    if (!target) {
      const createdAt = nowIso();
      target = {
        id: nextOpaqueId("acp-msg-assistant"),
        kind: "message",
        role: args.role,
        text: args.text,
        createdAt,
        updatedAt: createdAt,
        state: "streaming",
      };
      sessionRuntime.activeAssistantItemId = target.id;
      pushItem(sessionRuntime, target, "text-continuation");
      return;
    }
    appendTranscriptText(sessionRuntime, target, args.text);
    return;
  }

  completeActiveStreamingTextItems(sessionRuntime, {
    except: sessionRuntime.activeThoughtItemId,
  });
  let target = getLatestActiveThoughtItem(sessionRuntime);
  if (!target) {
    const createdAt = nowIso();
    target = {
      id: nextOpaqueId("acp-thought"),
      kind: "thought",
      text: args.text,
      createdAt,
      updatedAt: createdAt,
      state: "streaming",
    };
    sessionRuntime.activeThoughtItemId = target.id;
    pushItem(sessionRuntime, target, "text-continuation");
    return;
  }
  appendTranscriptText(sessionRuntime, target, args.text);
}

function upsertStatusItem(
  sessionRuntime: AcpChatSessionRuntime,
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
  upsertTranscriptItem(sessionRuntime, item);
}

function pushItem(
  sessionRuntime: AcpChatSessionRuntime,
  item: AcpConversationItem,
  boundary?: AssistantWorkspaceTranscriptBoundary,
) {
  upsertTranscriptItem(sessionRuntime, item, boundary);
}

function getLatestConversationItem(sessionRuntime: AcpChatSessionRuntime) {
  const activeId =
    sessionRuntime.activeAssistantItemId ||
    sessionRuntime.activeThoughtItemId ||
    sessionRuntime.activePlanItemId;
  return activeId
    ? sessionRuntime.transcriptItemsById.get(activeId)
    : undefined;
}

function getLatestActiveAssistantItem(sessionRuntime: AcpChatSessionRuntime) {
  const latest = sessionRuntime.transcriptItemsById.get(
    sessionRuntime.activeAssistantItemId,
  );
  return latest?.kind === "message" && latest.role === "assistant"
    ? (latest as AcpConversationMessageItem)
    : undefined;
}

function getLatestActiveThoughtItem(sessionRuntime: AcpChatSessionRuntime) {
  const latest = sessionRuntime.transcriptItemsById.get(
    sessionRuntime.activeThoughtItemId,
  );
  return latest?.kind === "thought"
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
  sessionRuntime: AcpChatSessionRuntime,
  update: Record<string, unknown>,
  boundary: AssistantWorkspaceTranscriptBoundary,
) {
  const toolCallId = String(update.toolCallId || "").trim();
  const nextState = normalizeToolCallState(update.status);
  const title = String(update.title || "Tool Call").trim() || "Tool Call";
  const toolKind = String(update.kind || "").trim() || undefined;
  const toolName = extractToolName(update, title, toolKind);
  const inputSummary = extractToolInputSummary(update, title);
  const resultSummary = extractToolResultSummary(update);
  const now = nowIso();
  const targetId = toolCallId
    ? sessionRuntime.transcriptToolItemIds.get(toolCallId)
    : "";
  const target = targetId
    ? (sessionRuntime.transcriptItemsById.get(targetId) as
        | AcpConversationToolCallItem
        | undefined)
    : undefined;
  if (!target) {
    const frozenInputSummary = inputSummary || undefined;
    pushItem(
      sessionRuntime,
      {
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
      },
      boundary,
    );
    return;
  }
  const patch: Partial<AcpConversationToolCallItem> = {};
  if (
    !isGenericToolDisplayText(title) ||
    isGenericToolDisplayText(target.title)
  ) {
    patch.title = title || target.title;
  }
  if (toolKind) {
    patch.toolKind = toolKind;
  }
  if (
    !isGenericToolDisplayText(toolName) ||
    isGenericToolDisplayText(target.toolName)
  ) {
    patch.toolName = toolName || target.toolName;
  }
  if (inputSummary && !target.inputSummary) {
    patch.inputSummary = inputSummary;
  }
  if (resultSummary) {
    patch.resultSummary = resultSummary;
  }
  const nextInputSummary = patch.inputSummary || target.inputSummary;
  if (nextInputSummary) {
    patch.summary = nextInputSummary;
  } else if (resultSummary && !target.summary) {
    patch.summary = resultSummary;
  }
  if (toolCallStateRank(nextState) >= toolCallStateRank(target.state)) {
    patch.state = nextState;
  }
  patch.updatedAt = now;
  patchTranscriptItem(
    sessionRuntime,
    target.id,
    patch as Partial<AcpConversationItem>,
    boundary,
  );
}

function finalizeStreamingItems(
  sessionRuntime: AcpChatSessionRuntime,
  finalState: "complete" | "error",
  planTerminalStatus: "cancelled" | "skipped" = "skipped",
) {
  if (sessionRuntime.activeAssistantItemId) {
    patchTranscriptItem(sessionRuntime, sessionRuntime.activeAssistantItemId, {
      state: finalState,
      updatedAt: nowIso(),
    } as Partial<AcpConversationItem>);
    sessionRuntime.activeAssistantItemId = "";
  }
  if (sessionRuntime.activeThoughtItemId) {
    patchTranscriptItem(sessionRuntime, sessionRuntime.activeThoughtItemId, {
      state: finalState,
      updatedAt: nowIso(),
    } as Partial<AcpConversationItem>);
    sessionRuntime.activeThoughtItemId = "";
  }
  if (sessionRuntime.activePlanItemId) {
    const target = sessionRuntime.transcriptItemsById.get(
      sessionRuntime.activePlanItemId,
    ) as AcpConversationPlanItem | undefined;
    if (target) {
      patchTranscriptItem(sessionRuntime, target.id, {
        entries: target.entries.map((entry) =>
          isTerminalPlanStatus(entry.status)
            ? entry
            : {
                ...entry,
                status: planTerminalStatus,
              },
        ),
        updatedAt: nowIso(),
      } as Partial<AcpConversationItem>);
    }
    sessionRuntime.activePlanItemId = "";
  }
}

function completeActiveStreamingTextItems(
  sessionRuntime: AcpChatSessionRuntime,
  args?: { except?: string },
) {
  const updatedAt = nowIso();
  if (
    sessionRuntime.activeAssistantItemId &&
    sessionRuntime.activeAssistantItemId !== args?.except
  ) {
    patchTranscriptItem(sessionRuntime, sessionRuntime.activeAssistantItemId, {
      state: "complete",
      updatedAt,
    } as Partial<AcpConversationItem>);
    sessionRuntime.activeAssistantItemId = "";
  }
  if (
    sessionRuntime.activeThoughtItemId &&
    sessionRuntime.activeThoughtItemId !== args?.except
  ) {
    patchTranscriptItem(sessionRuntime, sessionRuntime.activeThoughtItemId, {
      state: "complete",
      updatedAt,
    } as Partial<AcpConversationItem>);
    sessionRuntime.activeThoughtItemId = "";
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
  sessionRuntime: AcpChatSessionRuntime,
  backend: BackendInstance,
) {
  const cache = backend.acp?.runtimeOptionsCache;
  if (!cache) {
    return;
  }

  if (sessionRuntime.snapshot.modeOptions.length === 0) {
    const modeOptions = normalizeCachedSelectableOptions(cache.modes);
    if (modeOptions.length > 0) {
      sessionRuntime.snapshot.modeOptions = modeOptions;
      const currentModeId = String(
        sessionRuntime.snapshot.currentMode?.id ||
          cache.currentModeId ||
          modeOptions[0]?.id ||
          "",
      ).trim();
      sessionRuntime.snapshot.currentMode =
        modeOptions.find((entry) => entry.id === currentModeId) ||
        modeOptions[0];
    }
  }

  if (sessionRuntime.snapshot.modelOptions.length === 0) {
    const rawModelOptions = normalizeCachedSelectableOptions(cache.rawModels);
    if (rawModelOptions.length > 0) {
      sessionRuntime.snapshot.modelOptions = rawModelOptions;
      const currentRawModelId = String(
        sessionRuntime.snapshot.currentModel?.id ||
          cache.currentRawModelId ||
          rawModelOptions[0]?.id ||
          "",
      ).trim();
      sessionRuntime.snapshot.currentModel =
        rawModelOptions.find((entry) => entry.id === currentRawModelId) ||
        rawModelOptions[0];
      deriveModelEffortState(sessionRuntime.snapshot);
    }
  }
}

function applyCurrentReasoningEffort(
  snapshot: AcpConversationSnapshot,
  effortIdRaw: string,
) {
  const effortId = normalizeEffortId(effortIdRaw);
  if (!effortId) {
    return;
  }
  snapshot.currentReasoningEffort = snapshot.reasoningEffortOptions.find(
    (entry) => entry.id === effortId,
  ) || {
    id: effortId,
    label: toTitleCase(effortId),
  };
}

function applySessionConfigOptionsState(
  sessionRuntime: AcpChatSessionRuntime,
  configOptions: unknown,
) {
  const state = buildAcpRuntimeOptionsStateFromConfigOptions(
    Array.isArray(configOptions) ? configOptions : null,
  );
  if (
    !hasAcpRuntimeOptionSelectors(state) &&
    state.reasoningEfforts.length === 0
  ) {
    return {
      modeApplied: false,
      modelApplied: false,
      reasoningApplied: false,
    };
  }

  let modeApplied = false;
  let modelApplied = false;
  let reasoningApplied = false;
  if (state.modes.length > 0) {
    sessionRuntime.snapshot.modeOptions = state.modes.map((entry) => ({
      ...entry,
    }));
    const currentModeId = String(
      state.currentModeId || sessionRuntime.snapshot.currentMode?.id || "",
    ).trim();
    sessionRuntime.snapshot.currentMode =
      sessionRuntime.snapshot.modeOptions.find(
        (entry) => entry.id === currentModeId,
      ) || sessionRuntime.snapshot.modeOptions[0];
    modeApplied = true;
  }

  if (state.rawModels.length > 0) {
    sessionRuntime.snapshot.modelOptions = state.rawModels.map((entry) => ({
      ...entry,
    }));
    const currentRawModelId = String(
      state.currentRawModelId || sessionRuntime.snapshot.currentModel?.id || "",
    ).trim();
    sessionRuntime.snapshot.currentModel =
      sessionRuntime.snapshot.modelOptions.find(
        (entry) => entry.id === currentRawModelId,
      ) || sessionRuntime.snapshot.modelOptions[0];
    deriveModelEffortState(sessionRuntime.snapshot);
    if (state.displayModels.length > 0) {
      sessionRuntime.snapshot.displayModelOptions = state.displayModels.map(
        (entry) => ({
          ...entry,
        }),
      );
      sessionRuntime.snapshot.currentDisplayModel =
        sessionRuntime.snapshot.displayModelOptions.find(
          (entry) => entry.id === state.currentDisplayModelId,
        ) || sessionRuntime.snapshot.displayModelOptions[0];
    }
    modelApplied = true;
  }

  if (state.reasoningEfforts.length > 0) {
    sessionRuntime.snapshot.reasoningEffortOptions = state.reasoningEfforts.map(
      (entry) => ({
        ...entry,
      }),
    );
    applyCurrentReasoningEffort(
      sessionRuntime.snapshot,
      state.currentReasoningEffortId ||
        sessionRuntime.snapshot.currentReasoningEffort?.id ||
        state.reasoningEfforts[0]?.id ||
        "",
    );
    reasoningApplied = true;
  }

  return {
    modeApplied,
    modelApplied,
    reasoningApplied,
  };
}

function applyModeState(
  sessionRuntime: AcpChatSessionRuntime,
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
    incomingModes.length > 0
      ? incomingModes
      : sessionRuntime.snapshot.modeOptions;
  sessionRuntime.snapshot.modeOptions = availableModes;
  const currentModeId = String(
    value.currentModeId || sessionRuntime.snapshot.currentMode?.id || "",
  ).trim();
  sessionRuntime.snapshot.currentMode =
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
  sessionRuntime: AcpChatSessionRuntime,
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
    incomingModels.length > 0
      ? incomingModels
      : sessionRuntime.snapshot.modelOptions;
  sessionRuntime.snapshot.modelOptions = availableModels;
  const currentModelId = String(
    value.currentModelId || sessionRuntime.snapshot.currentModel?.id || "",
  ).trim();
  sessionRuntime.snapshot.currentModel =
    availableModels.find((entry) => entry.id === currentModelId) ||
    (currentModelId
      ? {
          id: currentModelId,
          label: currentModelId,
        }
      : undefined);
  deriveModelEffortState(sessionRuntime.snapshot);
}

function handleSessionUpdate(
  sessionRuntime: AcpChatSessionRuntime,
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
    String(sessionRuntime.snapshot.sessionId || "").trim()
  ) {
    return;
  }
  const update = event.update;
  const transcriptBoundary = classifyAcpTranscriptSessionUpdate(
    update.sessionUpdate,
  );
  if (sessionRuntime.suppressSessionLoadReplay) {
    switch (String(update.sessionUpdate || "").trim()) {
      case "agent_message_chunk":
      case "agent_thought_chunk":
      case "user_message_chunk":
      case "tool_call":
      case "tool_call_update":
      case "plan":
        sessionRuntime.snapshot.lastLifecycleEvent =
          "session_load_replay_suppressed";
        return;
      default:
        break;
    }
  }
  const progressChange = updateAcpExecutionProgress(
    acpChatExecutionProgressScope(sessionRuntime),
    update,
  );
  sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
    acpChatExecutionProgressScope(sessionRuntime),
  );
  if (isAssistantSilentExecutionMode()) {
    const kind = String(update.sessionUpdate || "").trim();
    if (
      kind === "agent_message_chunk" ||
      kind === "agent_thought_chunk" ||
      kind === "tool_call" ||
      kind === "tool_call_update" ||
      kind === "plan" ||
      kind === "usage_update" ||
      kind === "available_commands_update" ||
      kind === "current_mode_update" ||
      kind === "config_option_update" ||
      kind === "session_info_update"
    ) {
      if (progressChange.countChanged) {
        emitSessionRuntimeSnapshot(sessionRuntime, {
          throttlePersist: true,
          touchUpdatedAt: false,
          uiReason: "critical",
          publishMode: "metadata",
          changeKinds: ["message-counts"],
        });
      }
      return;
    }
  }
  switch (String(update.sessionUpdate || "").trim()) {
    case "agent_message_chunk": {
      sessionRuntime.snapshot.lastLifecycleEvent = "agent_message_chunk";
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
      appendStreamingTranscriptText(sessionRuntime, {
        kind: "message",
        role: "assistant",
        text: chunk,
      });
      markSessionRuntimeTranscriptUnpublished(sessionRuntime);
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        touchUpdatedAt: false,
        uiReason: "live",
        publishMode: "full",
        changeKinds: progressChange.countChanged
          ? ["message-counts", "transcript-append"]
          : ["transcript-append"],
      });
      return;
    }
    case "agent_thought_chunk": {
      sessionRuntime.snapshot.lastLifecycleEvent = "agent_thought_chunk";
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
      appendStreamingTranscriptText(sessionRuntime, {
        kind: "thought",
        text: chunk,
      });
      markSessionRuntimeTranscriptUnpublished(sessionRuntime);
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        touchUpdatedAt: false,
        uiReason: "live",
        publishMode: "full",
        changeKinds: progressChange.countChanged
          ? ["message-counts", "transcript-append"]
          : ["transcript-append"],
      });
      return;
    }
    case "tool_call": {
      sessionRuntime.snapshot.lastLifecycleEvent = "tool_call";
      if (isAcpTranscriptHardBoundaryUpdate(update.sessionUpdate)) {
        completeActiveStreamingTextItems(sessionRuntime);
      }
      upsertToolCallItem(sessionRuntime, update, "hard-boundary");
      emitSessionRuntimeSnapshot(sessionRuntime, {
        uiReason: "boundary",
        publishMode: "structural",
        changeKinds: progressChange.countChanged
          ? ["message-counts", "transcript-boundary"]
          : ["transcript-boundary"],
      });
      return;
    }
    case "tool_call_update": {
      sessionRuntime.snapshot.lastLifecycleEvent = "tool_call_update";
      upsertToolCallItem(sessionRuntime, update, transcriptBoundary);
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: transcriptBoundary === "soft-side-channel",
        uiReason:
          transcriptBoundary === "soft-side-channel" ? "live" : "boundary",
        publishMode: "structural",
        changeKinds: [
          transcriptBoundary === "soft-side-channel"
            ? "transcript-progress"
            : "transcript-boundary",
        ],
      });
      return;
    }
    case "plan": {
      sessionRuntime.snapshot.lastLifecycleEvent = "plan";
      completeActiveStreamingTextItems(sessionRuntime);
      const entries = Array.isArray(update.entries)
        ? update.entries.map((entry) => ({
            content: String(entry?.content || ""),
            priority: String(entry?.priority || ""),
            status: String(entry?.status || ""),
          }))
        : [];
      let target = sessionRuntime.transcriptItemsById.get(
        sessionRuntime.activePlanItemId,
      ) as AcpConversationPlanItem | undefined;
      if (!target) {
        target = {
          id: nextOpaqueId("acp-plan"),
          kind: "plan",
          entries,
          createdAt: nowIso(),
        };
        sessionRuntime.activePlanItemId = target.id;
        pushItem(sessionRuntime, target);
      } else {
        patchTranscriptItem(sessionRuntime, target.id, {
          entries,
          updatedAt: nowIso(),
        } as Partial<AcpConversationItem>);
      }
      emitSessionRuntimeSnapshot(sessionRuntime, {
        uiReason: "boundary",
        publishMode: "structural",
        changeKinds: ["plan", "transcript-boundary"],
      });
      return;
    }
    case "available_commands_update": {
      sessionRuntime.snapshot.lastLifecycleEvent = "available_commands_update";
      sessionRuntime.snapshot.availableCommands = Array.isArray(
        update.availableCommands,
      )
        ? update.availableCommands
            .map((entry) => ({
              name: String(entry?.name || "").trim(),
              title: String(entry?.title || "").trim() || undefined,
              description: String(entry?.description || "").trim() || undefined,
            }))
            .filter((entry) => entry.name)
        : [];
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        uiReason: "live",
        publishMode: "metadata",
        changeKinds: ["reply-hint"],
      });
      return;
    }
    case "current_mode_update": {
      sessionRuntime.snapshot.lastLifecycleEvent = "current_mode_update";
      applyModeState(sessionRuntime, {
        currentModeId: String(update.currentModeId || "").trim(),
      });
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        uiReason: "live",
        publishMode: "metadata",
        changeKinds: ["reply-hint"],
      });
      return;
    }
    case "config_option_update": {
      sessionRuntime.snapshot.lastLifecycleEvent = "config_option_update";
      const applied = applySessionConfigOptionsState(
        sessionRuntime,
        update.configOptions,
      );
      if (
        !applied.modeApplied &&
        !applied.modelApplied &&
        !applied.reasoningApplied
      ) {
        upsertStatusItem(sessionRuntime, {
          level: "info",
          label: "Config",
          text: "Session configuration options updated.",
        });
      }
      emitSessionRuntimeSnapshot(sessionRuntime, {
        uiReason: "boundary",
        publishMode: "structural",
        changeKinds:
          applied.modeApplied ||
          applied.modelApplied ||
          applied.reasoningApplied
            ? ["reply-hint"]
            : ["reply-hint", "transcript-boundary"],
      });
      return;
    }
    case "session_info_update": {
      sessionRuntime.snapshot.lastLifecycleEvent = "session_info_update";
      sessionRuntime.snapshot.sessionTitle = String(update.title || "").trim();
      sessionRuntime.snapshot.sessionUpdatedAt = String(
        update.updatedAt || "",
      ).trim();
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        uiReason: "live",
        publishMode: "metadata",
        changeKinds: ["context-details"],
      });
      return;
    }
    case "usage_update": {
      sessionRuntime.snapshot.lastLifecycleEvent = "usage_update";
      const used = Number(update.used || 0);
      const size = Number(update.size || 0);
      if (Number.isFinite(used) && Number.isFinite(size)) {
        sessionRuntime.snapshot.usage = {
          used: Math.max(0, Math.floor(used)),
          size: Math.max(0, Math.floor(size)),
        };
      }
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        uiReason: "live",
        publishMode: "metadata",
        changeKinds: ["reply-hint"],
      });
      return;
    }
    default:
      return;
  }
}

function bindAdapter(
  sessionRuntime: AcpChatSessionRuntime,
  nextAdapter: AcpConnectionAdapter,
) {
  sessionRuntime.unsubscribeUpdate = nextAdapter.onUpdate(async (event) => {
    touchLiveAcpChatSessionRuntime(sessionRuntime);
    handleSessionUpdate(
      sessionRuntime,
      event as Parameters<typeof handleSessionUpdate>[1],
    );
  });
  sessionRuntime.unsubscribeClose = nextAdapter.onClose((event) => {
    if (sessionRuntime.suppressCloseEvent) {
      return;
    }
    sessionRuntime.adapter = null;
    sessionRuntime.pendingPermissionResolver = null;
    const closeMessage = String(event?.message || "").trim();
    const stderrText = String(event?.stderrText || "").trim();
    const naturalIdleClose =
      !sessionRuntime.snapshot.busy &&
      (sessionRuntime.snapshot.status === "connected" ||
        sessionRuntime.snapshot.status === "idle") &&
      !closeMessage &&
      !stderrText;
    sessionRuntime.snapshot.busy = false;
    sessionRuntime.snapshot.pendingPermissionRequest = null;
    if (naturalIdleClose) {
      markSessionRuntimeConnectionIdle(sessionRuntime, {
        lifecycleEvent: "closed",
      });
      emitSessionRuntimeSnapshot(sessionRuntime, {
        uiReason: "boundary",
        publishMode: "metadata",
      });
      return;
    }
    sessionRuntime.snapshot.status =
      sessionRuntime.snapshot.status === "idle" ? "idle" : "error";
    if (stderrText) {
      sessionRuntime.snapshot.stderrTail = stderrText;
      appendDiagnostic(sessionRuntime, {
        id: nextOpaqueId("acp-diag"),
        ts: nowIso(),
        kind: "stderr",
        level: "warn",
        message: "ACP stderr",
        detail: stderrText,
      });
    }
    sessionRuntime.snapshot.lastLifecycleEvent = "exited";
    if (!sessionRuntime.snapshot.lastError) {
      sessionRuntime.snapshot.lastError =
        closeMessage || "ACP connection closed";
    }
    emitSessionRuntimeSnapshot(sessionRuntime);
  });
  sessionRuntime.unsubscribeDiagnostics = nextAdapter.onDiagnostics((entry) => {
    touchLiveAcpChatSessionRuntime(sessionRuntime);
    appendDiagnostic(sessionRuntime, entry);
    emitSessionRuntimeSnapshot(sessionRuntime, {
      persist: false,
      uiReason: "live",
      publishMode: "metadata",
      changeKinds: ["context-details"],
    });
  });
  sessionRuntime.unsubscribePermission = nextAdapter.onPermissionRequest(
    (request) => {
      if (autoApproveSessionRuntimePermissionRequest(sessionRuntime, request)) {
        return;
      }
      setSessionRuntimePendingPermissionRequest(sessionRuntime, request);
    },
  );
}

async function disconnectSessionRuntimeAdapter(
  sessionRuntime: AcpChatSessionRuntime,
) {
  sessionRuntime.pendingPermissionResolver = null;
  if (!sessionRuntime.adapter) {
    return;
  }
  sessionRuntime.suppressCloseEvent = true;
  sessionRuntime.unsubscribeUpdate?.();
  sessionRuntime.unsubscribeClose?.();
  sessionRuntime.unsubscribeDiagnostics?.();
  sessionRuntime.unsubscribePermission?.();
  sessionRuntime.unsubscribeHostBridgePermission?.();
  sessionRuntime.unsubscribeUpdate = null;
  sessionRuntime.unsubscribeClose = null;
  sessionRuntime.unsubscribeDiagnostics = null;
  sessionRuntime.unsubscribePermission = null;
  sessionRuntime.unsubscribeHostBridgePermission = null;
  const current = sessionRuntime.adapter;
  sessionRuntime.adapter = null;
  try {
    await current.close();
  } finally {
    sessionRuntime.suppressCloseEvent = false;
  }
}

async function finishAcpChatSemanticTraceTurn(
  activePrompt: NonNullable<AcpChatSessionRuntime["activePrompt"]>,
  payload: unknown,
) {
  const semanticTrace = activePrompt.semanticTrace;
  if (!semanticTrace || semanticTrace.terminalRecorded) return;
  semanticTrace.terminalRecorded = true;
  await recordAcpRuntimeSemanticTraceEvent(semanticTrace.context, {
    kind: "turn-end",
    sourceKind: "acp-chat-conversation",
    owner: semanticTrace.owner,
    payload,
  });
}

async function forceStopAcpChatPrompt(
  sessionRuntime: AcpChatSessionRuntime,
  token: string,
) {
  if (
    sessionRuntime.activePrompt?.token !== token ||
    sessionRuntime.snapshot.promptInterruptState !== "requested"
  ) {
    return;
  }
  try {
    await disconnectSessionRuntimeAdapter(sessionRuntime);
  } catch (error) {
    if (sessionRuntime.activePrompt?.token !== token) {
      return;
    }
    if (
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      await finishAcpChatSemanticTraceTurn(sessionRuntime.activePrompt, {
        outcome: "cancelled",
        forced: true,
        closeFailed: true,
        error: serializeAcpError(error, "prompt_interrupt_close"),
      });
    }
    clearActiveAcpChatPrompt(sessionRuntime);
    sessionRuntime.snapshot.busy = false;
    sessionRuntime.snapshot.status = "error";
    sessionRuntime.snapshot.promptInterruptState = "unconfirmed";
    sessionRuntime.snapshot.lastError = compactError(error);
    sessionRuntime.snapshot.lastLifecycleEvent =
      "prompt_interrupt_close_failed";
    finishAcpExecutionProgress(acpChatExecutionProgressScope(sessionRuntime));
    sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
      acpChatExecutionProgressScope(sessionRuntime),
    );
    finalizeStreamingItems(sessionRuntime, "error", "cancelled");
    emitSessionRuntimeSnapshot(sessionRuntime, {
      uiReason: "critical",
      publishMode: "full",
    });
    return;
  }
  if (sessionRuntime.activePrompt?.token !== token) {
    return;
  }
  if (
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    await finishAcpChatSemanticTraceTurn(sessionRuntime.activePrompt, {
      outcome: "cancelled",
      forced: true,
    });
  }
  clearActiveAcpChatPrompt(sessionRuntime);
  markSessionRuntimeConnectionIdle(sessionRuntime, {
    lifecycleEvent: "prompt_interrupt_forced",
  });
  sessionRuntime.snapshot.promptInterruptState = "forced";
  finishAcpExecutionProgress(acpChatExecutionProgressScope(sessionRuntime));
  sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
    acpChatExecutionProgressScope(sessionRuntime),
  );
  finalizeStreamingItems(sessionRuntime, "complete", "cancelled");
  emitSessionRuntimeSnapshot(sessionRuntime, {
    uiReason: "critical",
    publishMode: "full",
  });
}

async function materializeAcpChatInjectedSkills(args: {
  sessionRuntime: AcpChatSessionRuntime;
  backend: BackendInstance;
  workspaceDir: string;
}) {
  const workspaceDir = normalizeString(args.workspaceDir);
  if (!workspaceDir) {
    return;
  }
  const injectionPlan = buildAcpChatSkillInjectionPlan({
    backend: args.backend,
    workspaceDir,
  });
  if (injectionPlan.skillRoots.length === 0) {
    appendDiagnostic(args.sessionRuntime, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: "acp_chat_injected_skills_unavailable",
      level: "warn",
      message:
        "ACP Chat injected skills were not materialized because no project skill roots were available.",
      detail: injectionPlan.family,
      raw: {
        family: injectionPlan.family,
        skillRoots: injectionPlan.skillRoots,
        skillIds: [...ACP_CHAT_INJECTED_SKILL_IDS],
      },
    });
    return;
  }
  try {
    for (const diagnostic of injectionPlan.diagnostics) {
      appendDiagnostic(args.sessionRuntime, {
        id: nextOpaqueId("acp-diag"),
        ts: nowIso(),
        kind: diagnostic.code,
        level:
          diagnostic.level === "error"
            ? "error"
            : diagnostic.level === "warning"
              ? "warn"
              : "info",
        message: diagnostic.message,
        detail: injectionPlan.family,
        raw: {
          family: injectionPlan.family,
          skillRoots: injectionPlan.skillRoots,
        },
      });
    }
    const registry = await scanPluginSkillRegistry();
    const missingSkillIds: string[] = [];
    const targetDirsBySkill: Record<string, string[]> = {};
    for (const skillId of ACP_CHAT_INJECTED_SKILL_IDS) {
      const entry = registry.entriesById[skillId];
      if (!entry) {
        missingSkillIds.push(skillId);
        appendDiagnostic(args.sessionRuntime, {
          id: nextOpaqueId("acp-diag"),
          ts: nowIso(),
          kind: "acp_chat_injected_skill_unavailable",
          level: "warn",
          message:
            "ACP Chat injected skill was not found in the plugin skill registry.",
          detail: skillId,
          raw: {
            skillId,
            skillIds: [...ACP_CHAT_INJECTED_SKILL_IDS],
            diagnostics: registry.diagnostics,
          },
        });
        continue;
      }
      const targetDirs: string[] = [];
      for (const root of injectionPlan.skillRoots) {
        const targetDir = joinPath(root, skillId);
        await copyRuntimeDirectory({
          sourceDir: entry.sourceDir,
          targetDir,
        });
        targetDirs.push(targetDir);
      }
      targetDirsBySkill[skillId] = targetDirs;
    }
    appendDiagnostic(args.sessionRuntime, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: "acp_chat_injected_skills_ready",
      level: "info",
      message: "ACP Chat injected skills materialized.",
      detail: Object.values(targetDirsBySkill).flat().join(", "),
      raw: {
        skillIds: [...ACP_CHAT_INJECTED_SKILL_IDS],
        missingSkillIds,
        family: injectionPlan.family,
        skillRoots: injectionPlan.skillRoots,
        targetDirsBySkill,
      },
    });
  } catch (error) {
    appendDiagnostic(args.sessionRuntime, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: "acp_chat_injected_skills_unavailable",
      level: "warn",
      message: "ACP Chat injected skill materialization failed.",
      detail: compactError(error),
      raw: {
        skillIds: [...ACP_CHAT_INJECTED_SKILL_IDS],
        family: injectionPlan.family,
        skillRoots: injectionPlan.skillRoots,
      },
    });
  }
}

async function ensureAdapter(backendId?: string, conversationId?: string) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    backendId || activeBackendId,
    conversationId,
  );
  if (sessionRuntime.adapter) {
    touchLiveAcpChatSessionRuntime(sessionRuntime);
    return { sessionRuntime, adapter: sessionRuntime.adapter };
  }
  const backend = await resolveBackendForSessionRuntime(sessionRuntime);
  sessionRuntime.snapshot.sessionId = "";
  sessionRuntime.snapshot.lastError = "";
  sessionRuntime.snapshot.prerequisiteError = "";
  sessionRuntime.snapshot.stderrTail = "";
  sessionRuntime.snapshot.pendingPermissionRequest = null;
  sessionRuntime.snapshot.status = "checking-command";
  emitSessionRuntimeSnapshot(sessionRuntime);
  try {
    if (!sessionRuntime.snapshot.conversationId) {
      sessionRuntime.snapshot = createNewLocalConversationSnapshot({
        sessionRuntime,
        backend,
        backendId: sessionRuntime.backendId,
        inheritPlaceholderAutoApprove: true,
      });
      rekeySessionRuntime(sessionRuntime);
      if (
        sessionRuntime.backendId === activeBackendId &&
        !activeConversationId
      ) {
        activeConversationId = sessionRuntime.snapshot.conversationId;
      }
      sessionRuntime.snapshot.messageCounts = restoreAcpExecutionProgress(
        acpChatExecutionProgressScope(sessionRuntime),
        sessionRuntime.snapshot.messageCounts,
        { missingCompleteness: "complete" },
      );
      resetSessionRuntimeTransientState(sessionRuntime);
    }
    await ensureRuntimeDirectory(
      sessionRuntime.snapshot.agentWorkspaceDir ||
        sessionRuntime.snapshot.sessionCwd,
    );
    await ensureRuntimeDirectory(
      sessionRuntime.snapshot.conversationStorageDir,
    );
    const workspaceDir =
      sessionRuntime.snapshot.agentWorkspaceDir ||
      sessionRuntime.snapshot.workspaceDir ||
      sessionRuntime.snapshot.sessionCwd;
    const hostBridgeCliInjection = await materializeHostBridgeCliRunInjection({
      workspaceDir,
      requestId:
        sessionRuntime.snapshot.conversationId || nextOpaqueId("acp-chat"),
      scopeKind: "acp-chat",
    });
    bindHostBridgePermissionForSessionRuntime(sessionRuntime);
    appendDiagnostic(sessionRuntime, {
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
    await materializeAcpChatInjectedSkills({
      sessionRuntime,
      backend,
      workspaceDir,
    });
    const backendWithHostBridgeCli = applyHostBridgeCliEnvToBackend({
      backend,
      injection: hostBridgeCliInjection,
    });
    await enforceAcpChatLiveAdapterLimit(sessionRuntime);
    const semanticTraceAdapterContext =
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
        ? {}
        : undefined;
    const nextAdapter = await adapterFactory({
      backend: backendWithHostBridgeCli,
      agentWorkspaceDir: sessionRuntime.snapshot.agentWorkspaceDir,
      sessionCwd: sessionRuntime.snapshot.sessionCwd,
      workspaceDir: sessionRuntime.snapshot.workspaceDir,
      runtimeDir: sessionRuntime.snapshot.runtimeDir,
      ...(__acp_runtime_semantic_trace_recorder_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__) &&
      semanticTraceAdapterContext
        ? { semanticTraceContext: semanticTraceAdapterContext }
        : {}),
    });
    if (
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__) &&
      semanticTraceAdapterContext
    ) {
      sessionRuntime.semanticTraceAdapterContext = semanticTraceAdapterContext;
    }
    bindAdapter(sessionRuntime, nextAdapter);
    touchLiveAcpChatSessionRuntime(sessionRuntime);
    sessionRuntime.snapshot.status = "spawning";
    emitSessionRuntimeSnapshot(sessionRuntime);
    const initializedAdapter = await nextAdapter.initialize();
    sessionRuntime.snapshot.authMethods = initializedAdapter.authMethods.map(
      (entry) => ({
        ...entry,
      }),
    );
    sessionRuntime.snapshot.commandLabel = initializedAdapter.commandLabel;
    sessionRuntime.snapshot.commandLine = initializedAdapter.commandLine;
    sessionRuntime.snapshot.agentLabel = initializedAdapter.agentName;
    sessionRuntime.snapshot.agentVersion = initializedAdapter.agentVersion;
    sessionRuntime.snapshot.canLoadRemoteSession =
      initializedAdapter.canLoadSession === true;
    sessionRuntime.snapshot.canResumeRemoteSession =
      initializedAdapter.canResumeSession === true;
    appendDiagnostic(sessionRuntime, {
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
    sessionRuntime.snapshot.status = "initializing";
    sessionRuntime.adapter = nextAdapter;
    emitSessionRuntimeSnapshot(sessionRuntime);
    return { sessionRuntime, adapter: nextAdapter };
  } catch (error) {
    await disconnectSessionRuntimeAdapter(sessionRuntime);
    sessionRuntime.snapshot.busy = false;
    sessionRuntime.snapshot.status = "error";
    sessionRuntime.snapshot.lastError = compactError(error);
    sessionRuntime.snapshot.prerequisiteError =
      sessionRuntime.snapshot.lastError;
    appendErrorDiagnostic({
      sessionRuntime,
      kind: "command_check",
      message: "Failed to initialize ACP backend",
      error,
      stage: "ensure_adapter",
    });
    emitSessionRuntimeSnapshot(sessionRuntime);
    throw error;
  }
}

function applyAttachedSessionResult(
  sessionRuntime: AcpChatSessionRuntime,
  result: {
    sessionId: string;
    sessionTitle?: string;
    sessionUpdatedAt?: string;
    configOptions?: unknown;
    modes?: Parameters<typeof applyModeState>[1] | null;
    models?: Parameters<typeof applyModelState>[1] | null;
  },
) {
  touchLiveAcpChatSessionRuntime(sessionRuntime);
  sessionRuntime.snapshot.sessionId = String(result.sessionId || "").trim();
  sessionRuntime.snapshot.remoteSessionId =
    sessionRuntime.snapshot.sessionId ||
    String(sessionRuntime.snapshot.remoteSessionId || "").trim();
  sessionRuntime.snapshot.sessionTitle = String(
    result.sessionTitle || "",
  ).trim();
  sessionRuntime.snapshot.sessionUpdatedAt = String(
    result.sessionUpdatedAt || "",
  ).trim();
  const configApplied = applySessionConfigOptionsState(
    sessionRuntime,
    result.configOptions,
  );
  if (!configApplied.modeApplied) {
    applyModeState(sessionRuntime, result.modes || {});
  }
  if (!configApplied.modelApplied) {
    applyModelState(sessionRuntime, result.models || {});
  }
  const backend =
    sessionRuntime.snapshot.backend ||
    cachedAcpBackends.find((entry) => entry.id === sessionRuntime.backendId);
  if (backend) {
    applyRuntimeOptionsCache(sessionRuntime, backend);
  }
  sessionRuntime.snapshot.status = "connected";
  sessionRuntime.snapshot.busy = false;
}

type AcpChatSessionAttachKind = "existing" | "resume" | "load" | "new";

async function bindAcpChatSemanticTraceAfterAttach(args: {
  sessionRuntime: AcpChatSessionRuntime;
  adapter: AcpConnectionAdapter;
  attachKind: AcpChatSessionAttachKind;
  claimAttempt?: AcpRuntimeSemanticTraceClaimAttempt;
}) {
  const sessionId = String(args.sessionRuntime.snapshot.sessionId || "").trim();
  if (!sessionId) return;
  const existing = args.sessionRuntime.semanticTraceBinding;
  const adapterContext = args.sessionRuntime.semanticTraceAdapterContext;
  if (existing) {
    if (existing.owner.sessionId === sessionId) {
      if (adapterContext) adapterContext.current = existing;
    } else {
      if (adapterContext) adapterContext.current = undefined;
      noticeAcpRuntimeSemanticTraceSessionReplacement({
        context: existing.context,
        sessionId,
      });
    }
    return;
  }
  if (!args.claimAttempt || args.attachKind === "existing") return;
  const backendId =
    args.sessionRuntime.snapshot.backendId || args.sessionRuntime.backendId;
  const conversationId = args.sessionRuntime.snapshot.conversationId;
  if (!backendId || !conversationId) return;
  const owner = {
    rootId: `${backendId}\n${conversationId}`,
    conversationId,
    sessionId,
  };
  const context = await claimAcpRuntimeSemanticTraceRoot({
    attempt: args.claimAttempt,
    binding: {
      sourceKind: "acp-chat-conversation",
      backendId,
      conversationId,
      sessionId,
      attachKind: args.attachKind,
    },
    owner,
    payload: {
      backendId,
      conversationId,
      sessionId,
      attachKind: args.attachKind,
    },
  });
  if (!context) return;
  const semanticTraceBinding: AcpConnectionSemanticTraceBinding = {
    context,
    sourceKind: "acp-chat-conversation",
    owner,
  };
  args.sessionRuntime.semanticTraceBinding = semanticTraceBinding;
  if (adapterContext) adapterContext.current = semanticTraceBinding;
}

async function ensureSession(
  backendId?: string,
  conversationId?: string,
  claimAttempt?: AcpRuntimeSemanticTraceClaimAttempt,
) {
  const { sessionRuntime, adapter } = await ensureAdapter(
    backendId,
    conversationId,
  );
  const finishAttach = async (attachKind: AcpChatSessionAttachKind) => {
    if (
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      await bindAcpChatSemanticTraceAfterAttach({
        sessionRuntime,
        adapter,
        attachKind,
        claimAttempt,
      });
    }
    return { sessionRuntime, adapter, attachKind };
  };
  if (sessionRuntime.snapshot.sessionId) {
    return finishAttach("existing");
  }
  const remoteSessionId = String(
    sessionRuntime.snapshot.remoteSessionId || "",
  ).trim();
  if (remoteSessionId) {
    if (sessionRuntime.snapshot.canResumeRemoteSession) {
      sessionRuntime.snapshot.sessionId = remoteSessionId;
      sessionRuntime.snapshot.remoteSessionRestoreStatus = "pending";
      sessionRuntime.snapshot.remoteSessionRestoreMessage = `Resuming remote ACP session ${remoteSessionId}`;
      emitSessionRuntimeSnapshot(sessionRuntime);
      try {
        const resumed = await adapter.resumeSession({
          sessionId: remoteSessionId,
        });
        applyAttachedSessionResult(sessionRuntime, resumed);
        sessionRuntime.snapshot.remoteSessionRestoreStatus = "resumed";
        sessionRuntime.snapshot.remoteSessionRestoreMessage =
          "Remote ACP session resumed.";
        emitSessionRuntimeSnapshot(sessionRuntime);
        return finishAttach("resume");
      } catch (error) {
        sessionRuntime.snapshot.sessionId = "";
        sessionRuntime.snapshot.remoteSessionRestoreStatus = "failed";
        sessionRuntime.snapshot.remoteSessionRestoreMessage =
          compactError(error);
        appendErrorDiagnostic({
          sessionRuntime,
          kind: "session_restore_failed",
          message: "Remote ACP session resume failed",
          error,
          stage: "session_resume",
        });
      }
    } else if (sessionRuntime.snapshot.canLoadRemoteSession) {
      sessionRuntime.snapshot.sessionId = remoteSessionId;
      sessionRuntime.snapshot.remoteSessionRestoreStatus = "pending";
      sessionRuntime.snapshot.remoteSessionRestoreMessage = `Loading remote ACP session ${remoteSessionId}`;
      emitSessionRuntimeSnapshot(sessionRuntime);
      try {
        sessionRuntime.suppressSessionLoadReplay = true;
        const loaded = await adapter.loadSession({
          sessionId: remoteSessionId,
        });
        sessionRuntime.suppressSessionLoadReplay = false;
        applyAttachedSessionResult(sessionRuntime, loaded);
        sessionRuntime.snapshot.remoteSessionRestoreStatus = "loaded";
        sessionRuntime.snapshot.remoteSessionRestoreMessage =
          "Remote ACP session loaded.";
        emitSessionRuntimeSnapshot(sessionRuntime);
        return finishAttach("load");
      } catch (error) {
        sessionRuntime.suppressSessionLoadReplay = false;
        sessionRuntime.snapshot.sessionId = "";
        sessionRuntime.snapshot.remoteSessionRestoreStatus = "failed";
        sessionRuntime.snapshot.remoteSessionRestoreMessage =
          compactError(error);
        appendErrorDiagnostic({
          sessionRuntime,
          kind: "session_restore_failed",
          message: "Remote ACP session load failed",
          error,
          stage: "session_load",
        });
      }
    } else {
      sessionRuntime.snapshot.remoteSessionRestoreStatus = "unsupported";
      sessionRuntime.snapshot.remoteSessionRestoreMessage =
        "Remote ACP session restore is not supported by this backend.";
      appendDiagnostic(sessionRuntime, {
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
      sessionRuntime.snapshot.remoteSessionId || "",
    ).trim();
    applyAttachedSessionResult(sessionRuntime, created);
    if (
      previousRemoteSessionId &&
      previousRemoteSessionId !== sessionRuntime.snapshot.sessionId
    ) {
      sessionRuntime.snapshot.remoteSessionRestoreStatus =
        sessionRuntime.snapshot.remoteSessionRestoreStatus === "unsupported"
          ? "unsupported"
          : "fallback-new";
      sessionRuntime.snapshot.remoteSessionRestoreMessage =
        sessionRuntime.snapshot.remoteSessionRestoreStatus === "unsupported"
          ? "Remote ACP session restore is not supported; continued with a new agent session."
          : "Remote session could not be restored; continued with a new agent session.";
      appendDiagnostic(sessionRuntime, {
        id: nextOpaqueId("acp-diag"),
        ts: nowIso(),
        kind: "session_new_fallback",
        level: "warn",
        message:
          "Remote session could not be restored; continued with a new agent session.",
        detail: `previous=${previousRemoteSessionId} new=${sessionRuntime.snapshot.sessionId}`,
      });
      upsertStatusItem(sessionRuntime, {
        level: "warn",
        label: "Remote session",
        text: sessionRuntime.snapshot.remoteSessionRestoreMessage,
      });
    } else if (!previousRemoteSessionId) {
      sessionRuntime.snapshot.remoteSessionRestoreStatus = "none";
      sessionRuntime.snapshot.remoteSessionRestoreMessage = "";
    }
    emitSessionRuntimeSnapshot(sessionRuntime);
    return finishAttach("new");
  } catch (error) {
    if (error instanceof AcpAuthRequiredError) {
      sessionRuntime.snapshot.busy = false;
      sessionRuntime.snapshot.status = "auth-required";
      sessionRuntime.snapshot.authMethods = error.authMethods.map((entry) => ({
        ...entry,
      }));
      sessionRuntime.snapshot.lastError = error.message;
      emitSessionRuntimeSnapshot(sessionRuntime);
    } else {
      sessionRuntime.snapshot.busy = false;
      sessionRuntime.snapshot.status = "error";
      sessionRuntime.snapshot.lastError = compactError(error);
      sessionRuntime.snapshot.prerequisiteError =
        sessionRuntime.snapshot.prerequisiteError ||
        sessionRuntime.snapshot.lastError;
      emitSessionRuntimeSnapshot(sessionRuntime);
    }
    throw error;
  }
}

function buildBackendSummary(
  backend: BackendInstance,
  options: { ensureSession?: boolean } = {},
) {
  const backendActiveRuntime = getOrCreateSessionRuntime(backend.id);
  backendActiveRuntime.snapshot.backend = backend;
  const sessions = options.ensureSession
    ? listAcpChatSessions(backend.id)
    : listStoredVisibleAcpChatSessions(backend.id);
  const projectedSessions = sessions.map((entry) =>
    projectAcpChatSessionSummary(backend.id, entry),
  );
  const lastError =
    String(backendActiveRuntime.snapshot.prerequisiteError || "").trim() ||
    String(backendActiveRuntime.snapshot.lastError || "").trim();
  return {
    backendId: backend.id,
    displayName: String(backend.displayName || backend.id).trim(),
    status: backendActiveRuntime.snapshot.status,
    busy: backendActiveRuntime.snapshot.busy,
    connected:
      backendActiveRuntime.snapshot.status === "connected" ||
      backendActiveRuntime.snapshot.status === "prompting" ||
      backendActiveRuntime.adapter !== null,
    messageCount:
      projectedSessions.reduce((sum, entry) => sum + entry.messageCount, 0) ||
      backendActiveRuntime.snapshot.transcriptItemCount ||
      0,
    lastError,
    updatedAt: backendActiveRuntime.snapshot.updatedAt,
  };
}

function projectAcpChatSessionSummary(
  backendId: string,
  entry: AcpChatSessionSummary,
): AcpChatSessionSummary {
  const sessionRuntime = sessionRuntimes.get(
    acpChatSessionKey(backendId, entry.conversationId),
  );
  if (!sessionRuntime) {
    return {
      ...entry,
      status: "idle",
      lastError: entry.lastError || "",
    };
  }
  const lastError =
    String(sessionRuntime.snapshot.prerequisiteError || "").trim() ||
    String(sessionRuntime.snapshot.lastError || "").trim() ||
    entry.lastError ||
    "";
  return {
    ...entry,
    title: sessionRuntime.snapshot.conversationTitle || entry.title,
    messageCount:
      sessionRuntime.snapshot.transcriptItemCount || entry.messageCount,
    status: sessionRuntime.snapshot.status,
    lastError,
    updatedAt: sessionRuntime.snapshot.updatedAt || entry.updatedAt,
  };
}

function buildFrontendSnapshot(options?: {
  uiVisible?: boolean;
  itemMode?: AcpConversationSnapshotItemMode;
}): AcpFrontendSnapshot {
  ensureInitialized();
  const foregroundSessionRuntime = getOrCreateSessionRuntime(activeBackendId);
  const itemMode = resolveAcpConversationSnapshotItemMode(options);
  if (options?.uiVisible === true && itemMode === "full") {
    scheduleAcpChatTranscriptHydrate(foregroundSessionRuntime);
  }
  const activeSnapshot =
    options?.uiVisible === true
      ? clonePublishedSessionRuntimeSnapshot(foregroundSessionRuntime, {
          itemMode,
        })
      : cloneSnapshotValue(foregroundSessionRuntime.snapshot);
  activeSnapshot.mcpServer = getZoteroMcpServerStatus();
  activeSnapshot.mcpHealth = getZoteroMcpHealthSnapshot();
  const chatSessions = listAcpChatSessions(activeBackendId);
  const foregroundBackend = foregroundSessionRuntime.snapshot.backend;
  const knownBackends: BackendInstance[] = [
    ...(foregroundBackend &&
    !cachedAcpBackends.some((entry) => entry.id === foregroundBackend.id)
      ? [foregroundBackend]
      : []),
    ...cachedAcpBackends,
  ];
  const summaries = knownBackends.map((backend) =>
    buildBackendSummary(backend, {
      ensureSession: backend.id === activeBackendId,
    }),
  );
  const projectedChatSessions = chatSessions.map((entry) =>
    projectAcpChatSessionSummary(activeBackendId, entry),
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
          ? projectedChatSessions
          : listStoredVisibleAcpChatSessions(backend.id).map((entry) =>
              projectAcpChatSessionSummary(backend.id, entry),
            ),
      };
    })
    .filter(
      (entry) =>
        entry.backendId === activeBackendId || entry.sessions.length > 0,
    );
  return {
    activeBackendId,
    activeConversationId: foregroundSessionRuntime.snapshot.conversationId,
    chatSessions: projectedChatSessions,
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

export function getAcpFrontendSnapshot(
  options?: AcpConversationUiSnapshotReadOptions,
) {
  return buildFrontendSnapshot({
    uiVisible: true,
    itemMode: resolveAcpConversationSnapshotItemMode(options),
  });
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

export function subscribeAcpChatPanelSnapshots(
  listener: AcpChatPanelSnapshotListener,
) {
  acpChatPanelListeners.add(listener);
  return () => {
    acpChatPanelListeners.delete(listener);
  };
}

export function getAcpConversationSnapshot(
  backendId?: string,
  conversationId?: string,
) {
  ensureInitialized();
  return cloneSnapshotValue(
    getOrCreateSessionRuntime(backendId || activeBackendId, conversationId)
      .snapshot,
  );
}

export function getAcpConversationUiSnapshot(
  backendId?: string,
  conversationId?: string,
  options?: AcpConversationUiSnapshotReadOptions,
) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    backendId || activeBackendId,
    conversationId,
  );
  const itemMode = resolveAcpConversationSnapshotItemMode(options);
  if (itemMode === "full") {
    scheduleAcpChatTranscriptHydrate(sessionRuntime);
  }
  return clonePublishedSessionRuntimeSnapshot(sessionRuntime, { itemMode });
}

async function flushPendingChatTranscriptWrites(
  sessionRuntime?: AcpChatSessionRuntime,
) {
  if (sessionRuntime) {
    await flushAcpChatTranscriptWrites(
      sessionRuntime.snapshot.conversationStorageDir,
    );
    return;
  }
  await Promise.all(
    Array.from(sessionRuntimes.values()).map((runtime) =>
      flushAcpChatTranscriptWrites(runtime.snapshot.conversationStorageDir),
    ),
  );
}

async function readFullAcpChatTranscriptFromStore(
  sessionRuntime: AcpChatSessionRuntime,
) {
  const transcript = await readFullAcpChatTranscript({
    conversationStorageDir: sessionRuntime.snapshot.conversationStorageDir,
  });
  return {
    items: transcript.items.map((item) => cloneAcpConversationItem(item)),
    eventSeq: transcript.eventSeq,
  };
}

async function hydrateAcpChatTranscriptMirror(
  sessionRuntime: AcpChatSessionRuntime,
) {
  if (sessionRuntime.transcriptMirrorLoaded) {
    return;
  }
  if (sessionRuntime.transcriptHydratePromise) {
    await sessionRuntime.transcriptHydratePromise;
    return;
  }
  sessionRuntime.transcriptHydrateState = "loading";
  sessionRuntime.transcriptHydrateError = undefined;
  const hydrate = (async () => {
    if (sessionRuntime.transcriptWrites.size > 0) {
      appendDiagnostic(sessionRuntime, {
        id: nextOpaqueId("acp-diag"),
        ts: nowIso(),
        kind: "transcript_hydrate_waiting_for_writes",
        level: "warn",
        message:
          "ACP Chat transcript hydrate is waiting for pending writes for this session.",
        detail: `pending=${sessionRuntime.transcriptWrites.size}`,
      });
      await flushPendingChatTranscriptWrites(sessionRuntime);
    }
    const { items, eventSeq } =
      await readFullAcpChatTranscriptFromStore(sessionRuntime);
    loadChatTranscriptMirrorFromItems(sessionRuntime, { items, eventSeq });
    touchColdAcpChatTranscriptMirror(sessionRuntime);
  })();
  sessionRuntime.transcriptHydratePromise = hydrate;
  try {
    await hydrate;
  } catch (error) {
    sessionRuntime.transcriptHydrateState = "failed";
    sessionRuntime.transcriptHydrateError = compactError(error);
    throw error;
  } finally {
    sessionRuntime.transcriptHydratePromise = undefined;
  }
}

function scheduleAcpChatTranscriptHydrate(
  sessionRuntime: AcpChatSessionRuntime,
) {
  if (
    sessionRuntime.transcriptMirrorLoaded ||
    sessionRuntime.transcriptHydratePromise ||
    !normalizeString(sessionRuntime.snapshot.conversationId)
  ) {
    return;
  }
  sessionRuntime.transcriptHydrateState = "loading";
  void hydrateAcpChatTranscriptMirror(sessionRuntime)
    .catch(() => undefined)
    .finally(() => {
      emitSessionRuntimeSnapshot(sessionRuntime, {
        persist: false,
        touchUpdatedAt: false,
        uiReason: "critical",
        publishMode: "full",
      });
    });
}

export function scheduleAcpChatTranscriptHydrateForOwner(args?: {
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const backendId = normalizeBackendId(args?.backendId || activeBackendId);
  const conversationId = normalizeConversationId(args?.conversationId);
  if (!backendId || !conversationId) {
    return;
  }
  scheduleAcpChatTranscriptHydrate(
    getOrCreateSessionRuntime(backendId, conversationId),
  );
}

const ACP_CHAT_TRANSCRIPT_PAGE_DEFAULT_LIMIT = 80;
const ACP_CHAT_TRANSCRIPT_PAGE_MAX_LIMIT = 200;

function normalizeAcpChatTranscriptPageLimit(value: unknown) {
  return Math.max(
    1,
    Math.min(
      ACP_CHAT_TRANSCRIPT_PAGE_MAX_LIMIT,
      Math.floor(Number(value || ACP_CHAT_TRANSCRIPT_PAGE_DEFAULT_LIMIT)),
    ),
  );
}

export type AcpConversationTranscriptPage = {
  backendId: string;
  conversationId: string;
  requestId: string;
  items: AcpConversationItem[];
  cursor: number;
  prevCursor?: number;
  nextCursor?: number;
  total: number;
  eventSeq: number;
  transcriptRevision: number;
  limit: number;
};

export function readAcpConversationTranscriptMirrorPage(args: {
  backendId?: string;
  conversationId?: string;
  cursor?: number;
  limit?: number;
  executionDisplayMode?: "live" | "boundary" | "silent";
}): AcpConversationTranscriptPage | undefined {
  ensureInitialized();
  const backendId = normalizeBackendId(args.backendId || activeBackendId);
  const conversationId =
    normalizeConversationId(args.conversationId) ||
    normalizeConversationId(
      getOrCreateSessionRuntime(backendId).snapshot.conversationId,
    );
  if (!backendId || !conversationId) {
    return undefined;
  }
  const sessionRuntime = getOrCreateSessionRuntime(backendId, conversationId);
  if (!sessionRuntime.transcriptMirrorLoaded) {
    return undefined;
  }
  touchColdAcpChatTranscriptMirror(sessionRuntime);
  const page = readUiVisibleTranscriptPage<AcpConversationItem>({
    itemIds: sessionRuntime.transcriptItemIds,
    getItem: (itemId) => sessionRuntime.transcriptItemsById.get(itemId),
    cloneItem: cloneAcpConversationItem,
    executionDisplayMode: args.executionDisplayMode || "live",
    cursor: args.cursor,
    limit: args.limit,
    defaultLimit: ACP_CHAT_TRANSCRIPT_PAGE_DEFAULT_LIMIT,
    maxLimit: ACP_CHAT_TRANSCRIPT_PAGE_MAX_LIMIT,
  });
  return {
    backendId,
    conversationId,
    requestId: `${backendId}\n${conversationId}`,
    items: page.items,
    cursor: page.cursor,
    prevCursor: page.prevCursor,
    nextCursor: page.nextCursor,
    total: page.total,
    eventSeq: sessionRuntime.transcriptEventSeq,
    transcriptRevision: Math.max(
      Number(sessionRuntime.transcriptEventSeq) || 0,
      Number(sessionRuntime.snapshot.transcriptRevision) || 0,
    ),
    limit: page.limit,
  };
}

export async function readAcpConversationTranscriptPage(args: {
  backendId?: string;
  conversationId?: string;
  cursor?: number;
  limit?: number;
}): Promise<AcpConversationTranscriptPage> {
  ensureInitialized();
  const backendId = normalizeBackendId(args.backendId || activeBackendId);
  const conversationId =
    normalizeConversationId(args.conversationId) ||
    normalizeConversationId(
      getOrCreateSessionRuntime(backendId).snapshot.conversationId,
    );
  if (!backendId || !conversationId) {
    return {
      backendId,
      conversationId,
      requestId: `${backendId}\n${conversationId}`,
      items: [],
      cursor: 0,
      total: 0,
      eventSeq: 0,
      transcriptRevision: 0,
      limit: normalizeAcpChatTranscriptPageLimit(args.limit),
    };
  }
  const sessionRuntime = getOrCreateSessionRuntime(backendId, conversationId);
  await flushPendingChatTranscriptWrites(sessionRuntime);
  const paths = resolveAcpChatRuntimePaths(backendId, conversationId);
  const page = await readAcpChatTranscriptPage({
    conversationStorageDir:
      sessionRuntime.snapshot.conversationStorageDir ||
      paths.conversationStorageDir,
    cursor: args.cursor,
    limit: args.limit,
  });
  return {
    backendId,
    conversationId,
    requestId: `${backendId}\n${conversationId}`,
    items: page.items.map((item) => cloneAcpConversationItem(item)),
    cursor: page.cursor,
    prevCursor: page.prevCursor,
    nextCursor: page.nextCursor,
    total: page.total,
    eventSeq: page.eventSeq,
    transcriptRevision: Math.max(
      Number(page.eventSeq) || 0,
      Number(sessionRuntime.snapshot.transcriptRevision) || 0,
    ),
    limit: normalizeAcpChatTranscriptPageLimit(args.limit),
  };
}

export function getAcpChatTranscriptMirrorDiagnosticsForTests(args?: {
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const backendId = normalizeBackendId(args?.backendId || activeBackendId);
  const conversationId =
    normalizeConversationId(args?.conversationId) ||
    normalizeConversationId(
      backendId
        ? getOrCreateSessionRuntime(backendId).snapshot.conversationId
        : "",
    );
  const key = acpChatSessionKey(backendId, conversationId);
  const sessionRuntime = sessionRuntimes.get(key);
  if (!sessionRuntime) {
    return {
      mirrorLoaded: false,
      itemCount: 0,
      eventSeq: 0,
      hydrateState: "idle",
      hydrateInFlight: false,
      coldMirrorCached: coldAcpChatTranscriptMirrorLru.has(key),
      coldMirrorCacheSize: coldAcpChatTranscriptMirrorLru.size,
    };
  }
  return {
    mirrorLoaded: sessionRuntime.transcriptMirrorLoaded,
    itemCount: sessionRuntime.transcriptItemIds.length,
    eventSeq: sessionRuntime.transcriptEventSeq,
    hydrateState: sessionRuntime.transcriptHydrateState,
    hydrateInFlight: !!sessionRuntime.transcriptHydratePromise,
    coldMirrorCached: coldAcpChatTranscriptMirrorLru.has(key),
    coldMirrorCacheSize: coldAcpChatTranscriptMirrorLru.size,
  };
}

export function subscribeAcpConversationSnapshots(
  listener: AcpSnapshotListener,
) {
  listeners.add(listener);
  listener(getAcpConversationUiSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export async function setActiveAcpBackend(args: { backendId: string }) {
  ensureInitialized();
  const backendId = normalizeBackendId(args.backendId);
  if (!backendId) return;
  const backend = await requireAvailableAcpBackend(
    backendId,
    backendId === activeBackendId ? "if-missing" : "always",
  );
  if (backendId === activeBackendId) return;
  activeBackendId = backendId;
  activeConversationId =
    loadAcpChatSessionIndex(backendId).activeConversationId;
  saveAcpFrontendState({ activeBackendId });
  const sessionRuntime = getOrCreateSessionRuntime(backendId);
  sessionRuntime.snapshot.backend = backend;
  applyRuntimeOptionsCache(sessionRuntime, backend);
  pruneIdleBackgroundTranscriptMirrors();
  notifyConversationListenersNow(sessionRuntime);
  notifyFrontendListenersNow(
    buildAcpChatPanelSnapshotChange(sessionRuntime, [
      "active-scope",
      "backend",
    ]),
  );
}

function assertAcpConversationArchiveAllowed(
  sessionRuntime: AcpChatSessionRuntime,
) {
  if (
    isLiveAcpChatSessionRuntime(sessionRuntime) ||
    sessionRuntime.snapshot.status !== "idle"
  ) {
    throw new Error("Only idle ACP chat sessions can be archived");
  }
}

function sortSessionsByUpdatedAt(sessions: AcpChatSessionSummary[]) {
  return [...sessions].sort((left, right) =>
    String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")),
  );
}

function saveActiveAcpConversationSelection(
  backendId: string,
  conversationId: string,
) {
  if (backendId === activeBackendId) {
    activeConversationId = conversationId;
  }
  saveAcpChatSessionIndex({
    backendId,
    activeConversationId: conversationId,
    sessions: listAllAcpChatSessions(backendId),
  });
}

function isPlaceholderAcpConversationSnapshot(
  snapshot: AcpConversationSnapshot,
) {
  return (
    normalizeAcpStatus(snapshot.status) === "idle" &&
    !normalizeString(snapshot.sessionId) &&
    !normalizeString(snapshot.remoteSessionId) &&
    !normalizeString(snapshot.lastError) &&
    !normalizeString(snapshot.prerequisiteError) &&
    Math.max(0, Number(snapshot.transcriptItemCount) || 0) === 0 &&
    Math.max(0, Number(snapshot.transcriptEventSeq) || 0) === 0 &&
    Math.max(0, Number(snapshot.transcriptRevision) || 0) === 0
  );
}

function findPlaceholderAcpConversationId(backendId: string) {
  const sessions = listAcpChatSessions(backendId);
  for (const session of sessions) {
    const conversationId = normalizeConversationId(session.conversationId);
    if (!conversationId) {
      continue;
    }
    const sessionRuntime = getOrCreateSessionRuntime(backendId, conversationId);
    if (isPlaceholderAcpConversationSnapshot(sessionRuntime.snapshot)) {
      return conversationId;
    }
  }
  return "";
}

function createNewLocalConversationSnapshot(args: {
  sessionRuntime: AcpChatSessionRuntime;
  backend: BackendInstance | null;
  backendId: string;
  createdAt?: string;
  inheritPlaceholderAutoApprove?: boolean;
}) {
  const createdAt = args.createdAt || nowIso();
  const conversationId = nextOpaqueId("acp-conversation");
  const paths = resolveAcpChatRuntimePaths(args.backendId, conversationId);
  const transcriptPaths = resolveAcpChatTranscriptPaths(
    paths.conversationStorageDir,
  );
  return {
    ...createEmptyAcpConversationSnapshot(),
    backend: args.backend,
    backendId: args.backendId,
    conversationId,
    conversationTitle: "New Conversation",
    conversationCreatedAt: createdAt,
    showDiagnostics: args.sessionRuntime.snapshot.showDiagnostics,
    statusExpanded: args.sessionRuntime.snapshot.statusExpanded,
    chatDisplayMode: args.sessionRuntime.snapshot.chatDisplayMode,
    autoApproveAcpPermissions:
      args.inheritPlaceholderAutoApprove === true &&
      args.sessionRuntime.snapshot.autoApproveAcpPermissions === true,
    agentWorkspaceDir: paths.agentWorkspaceDir,
    conversationStorageDir: paths.conversationStorageDir,
    sessionCwd: paths.agentWorkspaceDir,
    workspaceDir: paths.agentWorkspaceDir,
    runtimeDir: paths.runtimeDir,
    transcriptPath: transcriptPaths.transcriptPath,
    transcriptIndexPath: transcriptPaths.transcriptIndexPath,
    transcriptRevision: 0,
    transcriptEventSeq: 0,
    transcriptItemCount: 0,
    transcriptPreview: undefined,
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
  await requireAvailableAcpBackend(
    backendId,
    backendId === activeBackendId ? "if-missing" : "always",
  );
  if (
    normalizeBackendId(activeBackendId) === backendId &&
    normalizeConversationId(resolveActiveConversationId(backendId)) ===
      conversationId
  ) {
    const sessionRuntime = getOrCreateSessionRuntime(backendId, conversationId);
    notifyConversationListenersNow(sessionRuntime);
    notifyFrontendListenersNow(
      buildAcpChatPanelSnapshotChange(sessionRuntime, ["active-scope"]),
    );
    return;
  }
  if (backendId !== activeBackendId) {
    activeBackendId = backendId;
    activeConversationId =
      loadAcpChatSessionIndex(backendId).activeConversationId;
    saveAcpFrontendState({ activeBackendId });
  }
  saveActiveAcpConversationSelection(backendId, conversationId);
  const sessionRuntime = getOrCreateSessionRuntime(backendId, conversationId);
  pruneIdleBackgroundTranscriptMirrors();
  notifyConversationListenersNow(sessionRuntime);
  notifyFrontendListenersNow(
    buildAcpChatPanelSnapshotChange(sessionRuntime, ["active-scope"]),
  );
}

export async function ensureAcpConversationReady(
  backendId?: string,
  conversationId?: string,
) {
  ensureInitialized();
  await refreshAcpBackends();
  await ensureSession(backendId || activeBackendId, conversationId);
}

export async function refreshAcpConversationBackends() {
  ensureInitialized();
  await refreshAcpBackends();
  if (!activeBackendId) {
    notifyFrontendListenersNow({
      active: false,
      global: true,
      kinds: ["backend"],
    });
    return;
  }
  const sessionRuntime = getOrCreateSessionRuntime(activeBackendId);
  notifyConversationListenersNow(sessionRuntime);
  notifyFrontendListenersNow(
    buildAcpChatPanelSnapshotChange(sessionRuntime, ["backend"], {
      global: true,
    }),
  );
}

export async function connectAcpConversation(args?: {
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  await refreshAcpBackends();
  const sessionRuntime = getOrCreateSessionRuntime(
    args?.backendId || activeBackendId,
    args?.conversationId,
  );
  const hasLiveSession = Boolean(
    sessionRuntime.adapter && sessionRuntime.snapshot.sessionId,
  );
  const claimAttempt =
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    !hasLiveSession
      ? beginAcpRuntimeSemanticTraceClaimAttempt("acp-chat-conversation")
      : undefined;
  let ensured;
  try {
    ensured = await ensureSession(
      sessionRuntime.backendId,
      sessionRuntime.snapshot.conversationId,
      claimAttempt,
    );
  } catch (error) {
    if (
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      abandonAcpRuntimeSemanticTraceClaimAttempt(claimAttempt);
    }
    throw error;
  }
  emitSessionRuntimeSnapshot(ensured.sessionRuntime);
}

export function setAcpConversationAutoApprovePermissions(args: {
  enabled: boolean;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  const enabled = args.enabled === true;
  if (sessionRuntime.snapshot.autoApproveAcpPermissions === enabled) {
    notifyConversationListenersNow(sessionRuntime);
    notifyFrontendListenersNow(
      buildAcpChatPanelSnapshotChange(sessionRuntime, ["permission"]),
    );
    return;
  }
  sessionRuntime.snapshot.autoApproveAcpPermissions = enabled;
  sessionRuntime.snapshot.updatedAt = nowIso();
  updatePublishedSessionRuntimeSnapshot(sessionRuntime, "metadata");
  persistSessionRuntimeSnapshotNow(sessionRuntime);
  notifyConversationListenersNow(sessionRuntime);
  notifyFrontendListenersNow(
    buildAcpChatPanelSnapshotChange(sessionRuntime, ["permission"]),
  );
}

export async function disconnectAcpConversation(args?: {
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args?.backendId || activeBackendId,
    args?.conversationId,
  );
  if (sessionRuntime.adapter) {
    sessionRuntime.snapshot.busy = false;
    sessionRuntime.snapshot.status = "disconnecting";
    emitSessionRuntimeSnapshot(sessionRuntime);
  }
  try {
    await disconnectSessionRuntimeAdapter(sessionRuntime);
  } catch (error) {
    appendDiagnostic(sessionRuntime, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: "disconnect_close_error",
      level: "warn",
      message: "ACP Chat adapter close failed during disconnect.",
      detail: compactError(error),
      stage: "disconnect",
    });
  }
  markSessionRuntimeConnectionIdle(sessionRuntime, { clearErrors: true });
  await flushPendingChatTranscriptWrites(sessionRuntime);
  releaseIdleBackgroundTranscriptMirror(sessionRuntime);
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export async function sendAcpConversationPrompt(args: {
  message: string;
  hostContext?: AcpHostContext;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const message = String(args.message || "").trim();
  if (!message) {
    throw new Error("ACP message is required");
  }
  const { sessionRuntime, adapter } = await ensureSession(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  if (sessionRuntime.activePrompt || sessionRuntime.snapshot.busy) {
    throw new Error("ACP Chat already has an active prompt turn.");
  }
  if (
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    sessionRuntime.semanticTraceBinding &&
    getAcpRuntimeSemanticTraceRecorderView().state === "stopping"
  ) {
    throw new Error(
      "ACP semantic trace is waiting for the active turn to finish",
    );
  }
  await hydrateAcpChatTranscriptMirror(sessionRuntime);
  touchLiveAcpChatSessionRuntime(sessionRuntime);
  const shouldInjectStartupPreamble =
    sessionRuntime.snapshot.transcriptItemCount === 0 &&
    sessionRuntime.transcriptItemCount === 0;
  if (!sessionRuntime.snapshot.conversationId) {
    sessionRuntime.snapshot.conversationId = nextOpaqueId("acp-conversation");
  }
  const backend = sessionRuntime.snapshot.backend;
  const agentFamily = String(backend?.acp?.agentFamily || "").trim();
  const promptMessage = shouldInjectStartupPreamble
    ? prependAcpStartupPromptPreamble({
        message,
        preamble: await buildAcpStartupPromptPreamble({
          surface: "acp-chat",
          workspaceDir:
            sessionRuntime.snapshot.agentWorkspaceDir ||
            sessionRuntime.snapshot.sessionCwd ||
            sessionRuntime.snapshot.workspaceDir,
          instructionFile: resolveAcpStartupInstructionFile(agentFamily),
        }),
      })
    : message;
  if (
    (!sessionRuntime.snapshot.conversationTitle ||
      sessionRuntime.snapshot.conversationTitle === "New Conversation") &&
    sessionRuntime.snapshot.transcriptItemCount === 0
  ) {
    sessionRuntime.snapshot.conversationTitle =
      message.length > 48 ? `${message.slice(0, 48)}...` : message;
  }
  pushItem(sessionRuntime, {
    id: nextOpaqueId("acp-msg-user"),
    kind: "message",
    role: "user",
    text: message,
    createdAt: nowIso(),
    state: "complete",
  });
  resetAcpExecutionProgress(acpChatExecutionProgressScope(sessionRuntime), {
    promoteUnavailableToComplete: true,
  });
  sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
    acpChatExecutionProgressScope(sessionRuntime),
  );
  sessionRuntime.activeAssistantItemId = "";
  sessionRuntime.activeThoughtItemId = "";
  sessionRuntime.activePlanItemId = "";
  sessionRuntime.snapshot.busy = true;
  sessionRuntime.snapshot.status = "prompting";
  sessionRuntime.snapshot.promptInterruptState = "idle";
  sessionRuntime.snapshot.lastError = "";
  sessionRuntime.snapshot.prerequisiteError = "";
  sessionRuntime.snapshot.lastStopReason = "";
  sessionRuntime.snapshot.pendingPermissionRequest = null;
  sessionRuntime.snapshot.lastHostContext = args.hostContext
    ? JSON.parse(JSON.stringify(args.hostContext))
    : null;
  emitSessionRuntimeSnapshot(sessionRuntime);
  const promptToken = nextOpaqueId("acp-prompt-turn");
  let traceTurn: NonNullable<
    NonNullable<AcpChatSessionRuntime["activePrompt"]>["semanticTrace"]
  > | null = null;
  if (
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    const traceBinding = sessionRuntime.semanticTraceBinding;
    if (traceBinding) {
      const owner = {
        rootId: traceBinding.context.rootId,
        conversationId: sessionRuntime.snapshot.conversationId,
        sessionId: sessionRuntime.snapshot.sessionId,
        turnId: promptToken,
      };
      if (
        await recordAcpRuntimeSemanticTraceEvent(traceBinding.context, {
          kind: "turn-start",
          sourceKind: "acp-chat-conversation",
          owner,
          payload: { message: promptMessage, hostContext: args.hostContext },
        })
      ) {
        traceTurn = {
          context: traceBinding.context,
          owner,
          terminalRecorded: false,
        };
      }
    }
  }
  try {
    await flushPendingChatTranscriptWrites(sessionRuntime);
    const promptPromise = adapter.prompt({
      sessionId: sessionRuntime.snapshot.sessionId,
      message: promptMessage,
    });
    sessionRuntime.activePrompt = {
      token: promptToken,
      promise: promptPromise,
      watchdog: null,
      ...(traceTurn ? { semanticTrace: traceTurn } : {}),
    };
    const response = await promptPromise;
    if (sessionRuntime.activePrompt?.token !== promptToken) {
      return;
    }
    const activePrompt = sessionRuntime.activePrompt;
    clearActiveAcpChatPrompt(sessionRuntime);
    sessionRuntime.snapshot.busy = false;
    sessionRuntime.snapshot.status = "connected";
    sessionRuntime.snapshot.lastStopReason = String(
      response.stopReason || "",
    ).trim();
    const interruptState = normalizeAcpPromptInterruptState(
      sessionRuntime.snapshot.promptInterruptState,
    );
    sessionRuntime.snapshot.promptInterruptState =
      interruptState === "requested"
        ? sessionRuntime.snapshot.lastStopReason === "cancelled"
          ? "confirmed"
          : "unconfirmed"
        : "idle";
    finishAcpExecutionProgress(acpChatExecutionProgressScope(sessionRuntime));
    sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
      acpChatExecutionProgressScope(sessionRuntime),
    );
    if (isAssistantSilentExecutionMode()) {
      const candidate = takeAcpExecutionProgressTerminalCandidate(
        acpChatExecutionProgressScope(sessionRuntime),
      );
      if (candidate) {
        pushItem(sessionRuntime, {
          id: nextOpaqueId("acp-msg-assistant"),
          kind: "message",
          role: "assistant",
          text: candidate,
          createdAt: nowIso(),
          state: "complete",
        });
      }
    } else {
      finalizeStreamingItems(sessionRuntime, "complete", "skipped");
    }
    emitSessionRuntimeSnapshot(sessionRuntime, {
      uiReason: "critical",
      publishMode: "full",
    });
    await flushPendingChatTranscriptWrites(sessionRuntime);
    if (
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__) &&
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      activePrompt
    ) {
      await finishAcpChatSemanticTraceTurn(activePrompt, {
        stopReason: sessionRuntime.snapshot.lastStopReason,
        outcome: "complete",
      });
    }
  } catch (error) {
    if (sessionRuntime.activePrompt?.token !== promptToken) {
      return;
    }
    const interruptionRequested =
      normalizeAcpPromptInterruptState(
        sessionRuntime.snapshot.promptInterruptState,
      ) === "requested";
    const activePrompt = sessionRuntime.activePrompt;
    clearActiveAcpChatPrompt(sessionRuntime);
    sessionRuntime.snapshot.busy = false;
    if (interruptionRequested) {
      sessionRuntime.snapshot.promptInterruptState = "unconfirmed";
    }
    finishAcpExecutionProgress(acpChatExecutionProgressScope(sessionRuntime));
    sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
      acpChatExecutionProgressScope(sessionRuntime),
    );
    if (isAssistantSilentExecutionMode()) {
      const candidate = takeAcpExecutionProgressTerminalCandidate(
        acpChatExecutionProgressScope(sessionRuntime),
      );
      if (candidate) {
        pushItem(sessionRuntime, {
          id: nextOpaqueId("acp-msg-assistant"),
          kind: "message",
          role: "assistant",
          text: candidate,
          createdAt: nowIso(),
          state: "error",
        });
      }
    } else {
      finalizeStreamingItems(sessionRuntime, "error", "cancelled");
    }
    if (error instanceof AcpAuthRequiredError) {
      sessionRuntime.snapshot.status = "auth-required";
      sessionRuntime.snapshot.authMethods = error.authMethods.map((entry) => ({
        ...entry,
      }));
      sessionRuntime.snapshot.lastError = error.message;
    } else {
      sessionRuntime.snapshot.status = "error";
      sessionRuntime.snapshot.lastError = compactError(error);
      sessionRuntime.snapshot.prerequisiteError =
        sessionRuntime.snapshot.prerequisiteError ||
        sessionRuntime.snapshot.lastError;
    }
    emitSessionRuntimeSnapshot(sessionRuntime, {
      uiReason: "critical",
      publishMode: "full",
    });
    await flushPendingChatTranscriptWrites(sessionRuntime);
    if (
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__) &&
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      activePrompt
    ) {
      await finishAcpChatSemanticTraceTurn(activePrompt, {
        outcome: "error",
        error: serializeAcpError(error, "prompt"),
      });
    }
    throw error;
  }
}

export async function cancelAcpConversationPrompt(args?: {
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args?.backendId || activeBackendId,
    args?.conversationId,
  );
  const activePrompt = sessionRuntime.activePrompt;
  if (
    !sessionRuntime.adapter ||
    !sessionRuntime.snapshot.sessionId ||
    !activePrompt
  ) {
    return;
  }
  if (sessionRuntime.snapshot.promptInterruptState === "requested") {
    return;
  }
  const pendingPermissionResolver = sessionRuntime.pendingPermissionResolver;
  sessionRuntime.pendingPermissionResolver = null;
  pendingPermissionResolver?.({ outcome: "cancelled" });
  sessionRuntime.snapshot.pendingPermissionRequest = null;
  sessionRuntime.snapshot.status = "prompting";
  sessionRuntime.snapshot.busy = true;
  sessionRuntime.snapshot.promptInterruptState = "requested";
  emitSessionRuntimeSnapshot(sessionRuntime, {
    uiReason: "critical",
    publishMode: "metadata",
  });
  try {
    await sessionRuntime.adapter.cancel({
      sessionId: sessionRuntime.snapshot.sessionId,
    });
  } catch {
    await forceStopAcpChatPrompt(sessionRuntime, activePrompt.token);
    return;
  }
  if (sessionRuntime.activePrompt?.token !== activePrompt.token) {
    return;
  }
  activePrompt.watchdog = watchPromiseSettlement(
    activePrompt.promise,
    acpChatPromptInterruptGraceMs,
    () => forceStopAcpChatPrompt(sessionRuntime, activePrompt.token),
  );
}

export async function startNewAcpConversation(args?: { backendId?: string }) {
  ensureInitialized();
  await refreshAcpBackends();
  const backendId = normalizeBackendId(args?.backendId || activeBackendId);
  const existingPlaceholderConversationId =
    findPlaceholderAcpConversationId(backendId);
  if (existingPlaceholderConversationId) {
    activeBackendId = backendId;
    activeConversationId = existingPlaceholderConversationId;
    saveAcpFrontendState({ activeBackendId });
    saveActiveAcpConversationSelection(
      backendId,
      existingPlaceholderConversationId,
    );
    const existingRuntime = getOrCreateSessionRuntime(
      backendId,
      existingPlaceholderConversationId,
    );
    pruneIdleBackgroundTranscriptMirrors();
    notifyConversationListenersNow(existingRuntime);
    notifyFrontendListenersNow(
      buildAcpChatPanelSnapshotChange(existingRuntime, [
        "active-scope",
        "session-list",
      ]),
    );
    return;
  }
  const seedSessionRuntime = getOrCreateSessionRuntime(backendId);
  const preservedBackend =
    cachedAcpBackends.find((entry) => entry.id === backendId) ||
    seedSessionRuntime.snapshot.backend;
  const preservedDiagnosticsVisibility =
    seedSessionRuntime.snapshot.showDiagnostics;
  const preservedStatusExpanded = seedSessionRuntime.snapshot.statusExpanded;
  const preservedChatDisplayMode = seedSessionRuntime.snapshot.chatDisplayMode;
  const createdAt = nowIso();
  const snapshot = createNewLocalConversationSnapshot({
    sessionRuntime: seedSessionRuntime,
    backend: preservedBackend,
    backendId,
    createdAt,
  });
  const sessionRuntime = getOrCreateSessionRuntime(
    backendId,
    snapshot.conversationId,
  );
  sessionRuntime.snapshot = snapshot;
  rekeySessionRuntime(sessionRuntime);
  sessionRuntime.snapshot.messageCounts = restoreAcpExecutionProgress(
    acpChatExecutionProgressScope(sessionRuntime),
    sessionRuntime.snapshot.messageCounts,
    { missingCompleteness: "complete" },
  );
  if (preservedBackend) {
    applyRuntimeOptionsCache(sessionRuntime, preservedBackend);
  }
  sessionRuntime.snapshot.showDiagnostics = preservedDiagnosticsVisibility;
  sessionRuntime.snapshot.statusExpanded = preservedStatusExpanded;
  sessionRuntime.snapshot.chatDisplayMode = preservedChatDisplayMode;
  resetSessionRuntimeTransientState(sessionRuntime);
  activeBackendId = backendId;
  activeConversationId = sessionRuntime.snapshot.conversationId;
  saveAcpFrontendState({ activeBackendId });
  emitSessionRuntimeSnapshot(sessionRuntime, { notifyUi: false });
  saveActiveAcpConversationSelection(
    backendId,
    sessionRuntime.snapshot.conversationId,
  );
  pruneIdleBackgroundTranscriptMirrors();
  emitSessionRuntimeSnapshot(sessionRuntime);
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
  const backendId = normalizeBackendId(args.backendId || activeBackendId);
  const sessionRuntime = getOrCreateSessionRuntime(
    backendId,
    args.conversationId,
  );
  const conversationId =
    normalizeBackendId(args.conversationId) ||
    sessionRuntime.snapshot.conversationId;
  if (!conversationId) {
    return;
  }
  if (conversationId === sessionRuntime.snapshot.conversationId) {
    sessionRuntime.snapshot.conversationTitle = title;
    emitSessionRuntimeSnapshot(sessionRuntime);
    return;
  }
  renameAcpConversationState({
    backendId,
    conversationId,
    title,
  });
  notifyFrontendListenersNow(
    buildAcpChatPanelSnapshotChange(
      getOrCreateSessionRuntime(backendId, conversationId),
      ["session-list"],
    ),
  );
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
  const sessionRuntime = getOrCreateSessionRuntime(backendId, conversationId);
  assertAcpConversationArchiveAllowed(sessionRuntime);
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
  const isActive =
    backendId === activeBackendId &&
    resolveActiveConversationId(backendId) === conversationId;
  if (!isActive) {
    saveAcpChatSessionIndex({
      backendId,
      activeConversationId: resolveActiveConversationId(backendId),
      sessions: updatedSessions,
    });
    releaseIdleBackgroundTranscriptMirror(sessionRuntime);
    notifyFrontendListenersNow(
      buildAcpChatPanelSnapshotChange(sessionRuntime, ["session-list"]),
    );
    return;
  }

  if (visibleSessions.length > 0) {
    activeConversationId = visibleSessions[0].conversationId;
    saveAcpChatSessionIndex({
      backendId,
      activeConversationId: visibleSessions[0].conversationId,
      sessions: updatedSessions,
    });
    releaseIdleBackgroundTranscriptMirror(sessionRuntime);
    const nextSessionRuntime = getOrCreateSessionRuntime(
      backendId,
      visibleSessions[0].conversationId,
    );
    scheduleAcpChatTranscriptHydrate(nextSessionRuntime);
    notifyConversationListenersNow(nextSessionRuntime);
    notifyFrontendListenersNow(
      buildAcpChatPanelSnapshotChange(nextSessionRuntime, [
        "active-scope",
        "session-list",
      ]),
    );
    return;
  }

  const preservedBackend = sessionRuntime.snapshot.backend;
  const preservedBackendId =
    sessionRuntime.snapshot.backendId || sessionRuntime.backendId;
  activeConversationId = "";
  saveAcpChatSessionIndex({
    backendId,
    activeConversationId: "",
    sessions: updatedSessions,
  });
  releaseIdleBackgroundTranscriptMirror(sessionRuntime);
  const emptySessionRuntime = getOrCreateSessionRuntime(preservedBackendId, "");
  const paths = resolveAcpChatRuntimePaths(preservedBackendId);
  emptySessionRuntime.snapshot = {
    ...createEmptyAcpConversationSnapshot(),
    backend: preservedBackend,
    backendId: preservedBackendId,
    showDiagnostics: emptySessionRuntime.snapshot.showDiagnostics,
    statusExpanded: emptySessionRuntime.snapshot.statusExpanded,
    chatDisplayMode: emptySessionRuntime.snapshot.chatDisplayMode,
    agentWorkspaceDir: paths.agentWorkspaceDir,
    conversationStorageDir: paths.conversationStorageDir,
    sessionCwd: paths.agentWorkspaceDir,
    workspaceDir: paths.agentWorkspaceDir,
    runtimeDir: paths.runtimeDir,
    updatedAt: nowIso(),
  };
  rekeySessionRuntime(emptySessionRuntime);
  resetSessionRuntimeTransientState(emptySessionRuntime);
  notifyConversationListenersNow(emptySessionRuntime);
  notifyFrontendListenersNow(
    buildAcpChatPanelSnapshotChange(emptySessionRuntime, [
      "active-scope",
      "session-list",
    ]),
  );
}

export async function deleteActiveAcpConversation(args?: {
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const backendId = normalizeBackendId(args?.backendId || activeBackendId);
  const sessionRuntime = getOrCreateSessionRuntime(
    backendId,
    args?.conversationId,
  );
  const deletedConversationId = sessionRuntime.snapshot.conversationId;
  if (!deletedConversationId) {
    return;
  }
  await disconnectSessionRuntimeAdapter(sessionRuntime);
  deleteAcpConversationState(backendId, deletedConversationId);
  sessionRuntimes.delete(sessionRuntime.key);
  const remaining = sortSessionsByUpdatedAt(listAcpChatSessions(backendId));
  if (remaining.length > 0) {
    if (backendId === activeBackendId) {
      activeConversationId = remaining[0].conversationId;
    }
    saveAcpChatSessionIndex({
      backendId,
      activeConversationId: remaining[0].conversationId,
      sessions: listAllAcpChatSessions(backendId),
    });
    const nextSessionRuntime = getOrCreateSessionRuntime(
      backendId,
      remaining[0].conversationId,
    );
    scheduleAcpChatTranscriptHydrate(nextSessionRuntime);
    notifyConversationListenersNow(nextSessionRuntime);
    notifyFrontendListenersNow(
      buildAcpChatPanelSnapshotChange(nextSessionRuntime, [
        "active-scope",
        "session-list",
      ]),
    );
    return;
  }
  const preservedBackend = sessionRuntime.snapshot.backend;
  const preservedBackendId =
    sessionRuntime.snapshot.backendId || sessionRuntime.backendId;
  const paths = resolveAcpChatRuntimePaths(preservedBackendId);
  if (backendId === activeBackendId) {
    activeConversationId = "";
  }
  saveAcpChatSessionIndex({
    backendId,
    activeConversationId: "",
    sessions: listAllAcpChatSessions(backendId),
  });
  const emptySessionRuntime = getOrCreateSessionRuntime(preservedBackendId, "");
  emptySessionRuntime.snapshot = {
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
  rekeySessionRuntime(emptySessionRuntime);
  resetSessionRuntimeTransientState(emptySessionRuntime);
  notifyConversationListenersNow(emptySessionRuntime);
  notifyFrontendListenersNow(
    buildAcpChatPanelSnapshotChange(emptySessionRuntime, [
      "active-scope",
      "session-list",
    ]),
  );
}

export async function reconnectAcpConversation(args?: {
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args?.backendId || activeBackendId,
    args?.conversationId,
  );
  const hasLiveSession = Boolean(
    sessionRuntime.adapter && sessionRuntime.snapshot.sessionId,
  );
  const claimAttempt =
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    !hasLiveSession
      ? beginAcpRuntimeSemanticTraceClaimAttempt("acp-chat-conversation")
      : undefined;
  await disconnectSessionRuntimeAdapter(sessionRuntime);
  markSessionRuntimeConnectionIdle(sessionRuntime, {
    clearErrors: true,
    clearStderrTail: true,
  });
  emitSessionRuntimeSnapshot(sessionRuntime);
  try {
    await ensureSession(
      sessionRuntime.backendId,
      sessionRuntime.snapshot.conversationId,
      claimAttempt,
    );
  } catch (error) {
    if (
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      abandonAcpRuntimeSemanticTraceClaimAttempt(claimAttempt);
    }
    throw error;
  }
}

export async function authenticateAcpConversation(args: {
  methodId?: string;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  const methodId =
    String(args.methodId || "").trim() ||
    sessionRuntime.snapshot.authMethods[0]?.id ||
    "";
  if (!methodId) {
    throw new Error("ACP authentication method is required");
  }
  const ensured = await ensureAdapter(
    sessionRuntime.backendId,
    sessionRuntime.snapshot.conversationId,
  );
  ensured.sessionRuntime.snapshot.status = "initializing";
  ensured.sessionRuntime.snapshot.lastError = "";
  ensured.sessionRuntime.snapshot.prerequisiteError = "";
  emitSessionRuntimeSnapshot(ensured.sessionRuntime);
  await ensured.adapter.authenticate({ methodId });
  ensured.sessionRuntime.snapshot.sessionId = "";
  await ensureSession(
    ensured.sessionRuntime.backendId,
    ensured.sessionRuntime.snapshot.conversationId,
  );
}

export async function resolveAcpConversationPermission(args: {
  outcome: "selected" | "cancelled";
  optionId?: string;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  if (!sessionRuntime.pendingPermissionResolver) {
    return;
  }
  const resolver = sessionRuntime.pendingPermissionResolver;
  sessionRuntime.pendingPermissionResolver = null;
  const optionId =
    String(args.optionId || "").trim() ||
    sessionRuntime.snapshot.pendingPermissionRequest?.options[0]?.optionId ||
    "";
  if (args.outcome === "selected" && optionId) {
    resolver({ outcome: "selected", optionId });
  } else {
    resolver({ outcome: "cancelled" });
  }
  sessionRuntime.snapshot.pendingPermissionRequest = null;
  sessionRuntime.snapshot.status = "prompting";
  sessionRuntime.snapshot.busy = true;
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export async function setAcpConversationMode(args: {
  modeId: string;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const modeId = String(args.modeId || "").trim();
  if (!modeId) {
    return;
  }
  const { sessionRuntime, adapter } = await ensureSession(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  const applied =
    (await adapter.setConfigOption?.({
      sessionId: sessionRuntime.snapshot.sessionId,
      category: "mode",
      value: modeId,
    })) === true;
  if (!applied) {
    await adapter.setMode({
      sessionId: sessionRuntime.snapshot.sessionId,
      modeId,
    });
  }
  applyModeState(sessionRuntime, { currentModeId: modeId });
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export async function setAcpConversationModel(args: {
  modelId: string;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const modelId = String(args.modelId || "").trim();
  if (!modelId) {
    return;
  }
  const { sessionRuntime, adapter } = await ensureSession(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  if (sessionRuntime.snapshot.busy === true) {
    throw new Error("Cannot change ACP model while a prompt is running.");
  }
  const rawModelId = resolveRawModelIdForSelection(
    sessionRuntime.snapshot,
    modelId,
    sessionRuntime.snapshot.currentReasoningEffort?.id,
  );
  const applied =
    (await adapter.setConfigOption?.({
      sessionId: sessionRuntime.snapshot.sessionId,
      category: "model",
      value: modelId,
    })) === true;
  if (!applied) {
    await adapter.setModel({
      sessionId: sessionRuntime.snapshot.sessionId,
      modelId: rawModelId,
    });
  }
  applyModelState(sessionRuntime, {
    currentModelId: applied ? modelId : rawModelId,
  });
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export async function setAcpConversationReasoningEffort(args: {
  effortId: string;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const effortId = normalizeEffortId(args.effortId);
  if (!effortId) {
    return;
  }
  const { sessionRuntime, adapter } = await ensureSession(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  if (sessionRuntime.snapshot.busy === true) {
    throw new Error(
      "Cannot change ACP reasoning effort while a prompt is running.",
    );
  }
  const displayModelId =
    String(sessionRuntime.snapshot.currentDisplayModel?.id || "").trim() ||
    String(sessionRuntime.snapshot.currentModel?.id || "").trim();
  if (!displayModelId) {
    return;
  }
  const rawModelId = resolveRawModelIdForSelection(
    sessionRuntime.snapshot,
    displayModelId,
    effortId,
  );
  const result = await applyAcpReasoningEffortWithFallback({
    adapter,
    backend: sessionRuntime.snapshot.backend || undefined,
    sessionId: sessionRuntime.snapshot.sessionId,
    effortId,
  });
  if (result.kind === "applied") {
    applyCurrentReasoningEffort(sessionRuntime.snapshot, effortId);
  } else if (result.kind === "unavailable") {
    await adapter.setModel({
      sessionId: sessionRuntime.snapshot.sessionId,
      modelId: rawModelId,
    });
    applyModelState(sessionRuntime, { currentModelId: rawModelId });
  } else {
    appendDiagnostic(sessionRuntime, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: "reasoning_effort_fallback",
      level: "warn",
      message:
        "Kilo rejected the None reasoning effort; retaining the model default.",
      detail: result.error.message,
      stage: "runtime-options",
    });
  }
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export function toggleAcpConversationDiagnostics(args?: {
  visible?: boolean;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args?.backendId || activeBackendId,
    args?.conversationId,
  );
  sessionRuntime.snapshot.showDiagnostics =
    typeof args?.visible === "boolean"
      ? args.visible
      : !sessionRuntime.snapshot.showDiagnostics;
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export function setAcpConversationChatDisplayMode(args: {
  mode: AcpChatDisplayMode;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  sessionRuntime.snapshot.chatDisplayMode =
    args.mode === "bubble" ? "bubble" : "plain";
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export function toggleAcpConversationStatusDetails(args?: {
  expanded?: boolean;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args?.backendId || activeBackendId,
    args?.conversationId,
  );
  sessionRuntime.snapshot.statusExpanded =
    typeof args?.expanded === "boolean"
      ? args.expanded
      : !sessionRuntime.snapshot.statusExpanded;
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export function buildAcpDiagnosticsBundle(
  backendId?: string,
  conversationId?: string,
): AcpDiagnosticsBundle {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    backendId || activeBackendId,
    conversationId,
  );
  const snapshot = sessionRuntime.snapshot;
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
    recentItems: [],
    lastHostContext: snapshot.lastHostContext
      ? JSON.parse(JSON.stringify(snapshot.lastHostContext))
      : null,
  };
}

export function pruneAcpChatSessionRuntimesForBackends(
  backends: BackendInstance[],
) {
  ensureInitialized();
  const protectedSyntheticBackendId =
    syntheticAcpChatReplayLeaseOwnsForeground()
      ? activeSyntheticAcpChatReplayActivation?.backendId
      : undefined;
  const remainingAcpIds = new Set(
    backends
      .filter((entry) => normalizeBackendId(entry.type) === ACP_BACKEND_TYPE)
      .map((entry) => entry.id),
  );
  const clearedBackends = new Set<string>();
  for (const [key, sessionRuntime] of Array.from(sessionRuntimes.entries())) {
    if (
      remainingAcpIds.has(sessionRuntime.backendId) ||
      sessionRuntime.backendId === protectedSyntheticBackendId
    ) {
      continue;
    }
    void disconnectSessionRuntimeAdapter(sessionRuntime);
    if (!clearedBackends.has(sessionRuntime.backendId)) {
      clearAcpConversationState(sessionRuntime.backendId);
      clearedBackends.add(sessionRuntime.backendId);
    }
    sessionRuntimes.delete(key);
  }
  cachedAcpBackends = backends.filter(
    (entry) => normalizeBackendId(entry.type) === ACP_BACKEND_TYPE,
  );
  if (!protectedSyntheticBackendId && !remainingAcpIds.has(activeBackendId)) {
    activeBackendId = cachedAcpBackends[0]?.id || "";
    activeConversationId = activeBackendId
      ? loadAcpChatSessionIndex(activeBackendId).activeConversationId
      : "";
    if (activeBackendId) {
      getOrCreateSessionRuntime(activeBackendId);
    }
    saveAcpFrontendState({ activeBackendId });
  }
  notifyFrontendListenersNow({
    active: true,
    global: true,
    kinds: ["backend"],
  });
  if (activeBackendId) {
    notifyConversationListenersNow(getOrCreateSessionRuntime(activeBackendId));
  }
}

export async function shutdownAcpSessionManager() {
  const pending: Promise<unknown>[] = [];
  for (const sessionRuntime of sessionRuntimes.values()) {
    if (sessionRuntime.uiEmitTimer) {
      clearTimeout(sessionRuntime.uiEmitTimer);
      sessionRuntime.uiEmitTimer = null;
    }
    if (sessionRuntime.persistTimer) {
      flushPendingPersistence(sessionRuntime);
    }
    pending.push(
      waitForAcpChatShutdownTask(
        disconnectSessionRuntimeAdapter(sessionRuntime),
      ).then((result) => {
        if (result.timedOut) {
          appendDiagnostic(sessionRuntime, {
            id: nextOpaqueId("acp-diag"),
            ts: nowIso(),
            kind: "shutdown_timeout",
            level: "warn",
            message:
              "ACP Chat adapter close did not finish before shutdown timeout.",
            detail: `timeoutMs=${ACP_CHAT_SHUTDOWN_DETACH_TIMEOUT_MS}`,
          });
        }
        markSessionRuntimeConnectionIdle(sessionRuntime, {
          lifecycleEvent: "shutdown-disconnected",
        });
        emitSessionRuntimeSnapshot(sessionRuntime, { notifyUi: false });
      }),
    );
  }
  await Promise.allSettled(pending);
  await flushPendingChatTranscriptWrites();
  await shutdownZoteroMcpServer();
  resetAcpConversationHostBridgePermissionHandlersForTests();
  unsubscribeExecutionDisplayMode?.();
  unsubscribeExecutionDisplayMode = undefined;
  for (const sessionRuntime of sessionRuntimes.values()) {
    releaseAcpExecutionProgress(acpChatExecutionProgressScope(sessionRuntime));
  }
  sessionRuntimes.clear();
  coldAcpChatTranscriptMirrorLru.clear();
  listeners.clear();
  frontendListeners.clear();
  acpChatPanelListeners.clear();
  cachedAcpBackends = [];
  activeBackendId = "";
  activeConversationId = "";
  activeSyntheticAcpChatReplayActivation = undefined;
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

export function prepareSyntheticAcpChatReplay(args: {
  backendId: string;
  conversationId: string;
  sessionId?: string;
}) {
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId,
    args.conversationId,
  );
  sessionRuntime.snapshot.backend = {
    id: args.backendId,
    displayName: args.backendId,
    type: ACP_BACKEND_TYPE,
    baseUrl: "",
  };
  sessionRuntime.snapshot.conversationId = args.conversationId;
  sessionRuntime.snapshot.sessionId = String(args.sessionId || "").trim();
  sessionRuntime.snapshot.status = "connected";
  sessionRuntime.snapshot.busy = false;
  sessionRuntime.snapshot.pendingPermissionRequest = null;
  touchLiveAcpChatSessionRuntime(sessionRuntime);
  return {
    backendId: args.backendId,
    conversationId: args.conversationId,
  };
}

export type SyntheticAcpChatReplayActivationLease = {
  token: number;
  backendId: string;
  conversationId: string;
  release: () => Promise<void>;
};

type SyntheticAcpChatReplayActivationState = {
  token: number;
  backendId: string;
  conversationId: string;
  previous: { backendId: string; conversationId: string };
};

let syntheticAcpChatReplayActivationNonce = 0;
let activeSyntheticAcpChatReplayActivation:
  | SyntheticAcpChatReplayActivationState
  | undefined;

function syntheticAcpChatReplayLeaseOwnsForeground() {
  const activation = activeSyntheticAcpChatReplayActivation;
  return Boolean(
    activation &&
    activation.backendId === activeBackendId &&
    activation.conversationId === activeConversationId,
  );
}

function publishAcpChatForegroundSelection(
  sessionRuntime?: AcpChatSessionRuntime,
) {
  if (sessionRuntime) {
    updatePublishedSessionRuntimeSnapshot(sessionRuntime, "full");
    notifyConversationListenersNow(sessionRuntime);
    notifyFrontendListenersNow(
      buildAcpChatPanelSnapshotChange(sessionRuntime, ["active-scope"]),
    );
    return;
  }
  notifyFrontendListenersNow({
    active: true,
    global: true,
    kinds: ["active-scope"],
  });
}

export async function activateSyntheticAcpChatReplay(args: {
  backendId: string;
  conversationId: string;
}): Promise<SyntheticAcpChatReplayActivationLease> {
  ensureInitialized();
  const backendId = normalizeBackendId(args.backendId);
  const conversationId = normalizeConversationId(args.conversationId);
  const sessionRuntime = sessionRuntimes.get(
    acpChatSessionKey(backendId, conversationId),
  );
  if (
    !backendId ||
    !conversationId ||
    !sessionRuntime ||
    sessionRuntime.adapter !== null ||
    normalizeConversationId(sessionRuntime.snapshot.conversationId) !==
      conversationId
  ) {
    throw new Error("Synthetic ACP Chat Replay owner is not prepared");
  }
  const previous = activeSyntheticAcpChatReplayActivation?.previous || {
    backendId: activeBackendId,
    conversationId: activeConversationId,
  };
  syntheticAcpChatReplayActivationNonce += 1;
  const state: SyntheticAcpChatReplayActivationState = {
    token: syntheticAcpChatReplayActivationNonce,
    backendId,
    conversationId,
    previous,
  };
  activeSyntheticAcpChatReplayActivation = state;
  activeBackendId = backendId;
  activeConversationId = conversationId;
  try {
    pruneIdleBackgroundTranscriptMirrors();
    publishAcpChatForegroundSelection(sessionRuntime);
  } catch (error) {
    if (activeSyntheticAcpChatReplayActivation?.token === state.token) {
      activeSyntheticAcpChatReplayActivation = undefined;
      activeBackendId = previous.backendId;
      activeConversationId = previous.conversationId;
    }
    throw error;
  }

  let released = false;
  return {
    token: state.token,
    backendId,
    conversationId,
    release: async () => {
      if (released) return;
      released = true;
      if (activeSyntheticAcpChatReplayActivation?.token !== state.token) {
        return;
      }
      activeSyntheticAcpChatReplayActivation = undefined;
      if (
        activeBackendId !== backendId ||
        activeConversationId !== conversationId
      ) {
        return;
      }
      activeBackendId = previous.backendId;
      activeConversationId = previous.conversationId;
      const previousRuntime = previous.backendId
        ? getOrCreateSessionRuntime(
            previous.backendId,
            previous.conversationId || undefined,
          )
        : undefined;
      publishAcpChatForegroundSelection(previousRuntime);
    },
  };
}

export function applySyntheticAcpChatReplaySessionUpdate(args: {
  backendId: string;
  conversationId: string;
  event: {
    sessionId: string;
    update: { sessionUpdate: string; [key: string]: unknown };
  };
}) {
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId,
    args.conversationId,
  );
  sessionRuntime.snapshot.sessionId = args.event.sessionId;
  handleSessionUpdate(sessionRuntime, args.event);
}

export function applySyntheticAcpChatReplayPrompt(args: {
  backendId: string;
  conversationId: string;
  message: string;
  createdAt?: string;
}) {
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId,
    args.conversationId,
  );
  pushItem(sessionRuntime, {
    id: nextOpaqueId("acp-replay-user"),
    kind: "message",
    role: "user",
    text: args.message,
    createdAt: args.createdAt || nowIso(),
    state: "complete",
  });
}

export function applySyntheticAcpChatReplayPermission(args: {
  backendId: string;
  conversationId: string;
  request: AcpPendingPermissionRequest | null;
}) {
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId,
    args.conversationId,
  );
  sessionRuntime.snapshot.pendingPermissionRequest = args.request;
  sessionRuntime.snapshot.status = args.request
    ? "permission-required"
    : "connected";
  emitSessionRuntimeSnapshot(sessionRuntime, {
    uiReason: "critical",
    publishMode: "metadata",
  });
}

export async function drainSyntheticAcpChatReplay(args: {
  backendId: string;
  conversationId: string;
}) {
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId,
    args.conversationId,
  );
  await flushPendingChatTranscriptWrites(sessionRuntime);
  emitSessionRuntimeSnapshot(sessionRuntime, {
    uiReason: "critical",
    publishMode: "full",
  });
}

export async function cleanupSyntheticAcpChatReplay(args: {
  backendId: string;
  conversationId: string;
}) {
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId,
    args.conversationId,
  );
  await flushPendingChatTranscriptWrites(sessionRuntime);
  sessionRuntimes.delete(sessionRuntime.key);
  deleteAcpConversationState(args.backendId, args.conversationId);
}

export function setAcpChatPromptInterruptGraceMsForTests(timeoutMs?: number) {
  acpChatPromptInterruptGraceMs =
    typeof timeoutMs === "number" && Number.isFinite(timeoutMs)
      ? Math.max(0, timeoutMs)
      : DEFAULT_ACP_CHAT_PROMPT_INTERRUPT_GRACE_MS;
}

export function resetAcpSessionManagerForTests() {
  unsubscribeExecutionDisplayMode?.();
  unsubscribeExecutionDisplayMode = undefined;
  for (const sessionRuntime of sessionRuntimes.values()) {
    releaseAcpExecutionProgress(acpChatExecutionProgressScope(sessionRuntime));
    if (sessionRuntime.uiEmitTimer) {
      clearTimeout(sessionRuntime.uiEmitTimer);
    }
    if (sessionRuntime.persistTimer) {
      clearTimeout(sessionRuntime.persistTimer);
    }
    clearActiveAcpChatPrompt(sessionRuntime);
    sessionRuntime.unsubscribeUpdate?.();
    sessionRuntime.unsubscribeClose?.();
    sessionRuntime.unsubscribeDiagnostics?.();
    sessionRuntime.unsubscribePermission?.();
    sessionRuntime.unsubscribeHostBridgePermission?.();
  }
  resetAcpConversationHostBridgePermissionHandlersForTests();
  sessionRuntimes.clear();
  coldAcpChatTranscriptMirrorLru.clear();
  listeners.clear();
  frontendListeners.clear();
  acpChatPanelListeners.clear();
  cachedAcpBackends = [];
  activeBackendId = "";
  activeConversationId = "";
  activeSyntheticAcpChatReplayActivation = undefined;
  syntheticAcpChatReplayActivationNonce = 0;
  initialized = false;
  acpChatPromptInterruptGraceMs = DEFAULT_ACP_CHAT_PROMPT_INTERRUPT_GRACE_MS;
}

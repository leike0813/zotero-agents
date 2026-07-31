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
  finishAcpExecutionProgress,
  releaseAcpExecutionProgress,
  resetAcpExecutionProgress,
  restoreAcpExecutionProgress,
  snapshotAcpMessageCounts,
  snapshotAcpExecutionProgress,
  updateAcpExecutionProgress,
} from "./acpExecutionProgress";
import {
  createAcpSilentTerminalAssistantCollector,
  type AcpSilentTerminalAssistantCollector,
} from "./acpSilentTerminalAssistantCollector";
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
  createAcpChatWorkspaceOwner,
  type AssistantWorkspaceOwnerNavigation,
} from "./assistantWorkspacePublication";
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
import { recordAcpRuntimeDiagnostic } from "./acpDiagnosticRouter";
import {
  acpChatDiagnosticAuditOwnerKey,
  activateAcpChatDiagnosticAuditOwner,
  appendAcpChatDiagnosticAudit,
  discardAcpChatDiagnosticAudit,
  discardAllAcpChatDiagnosticAuditsForTests,
  flushAcpChatDiagnosticAudit,
  releaseAcpChatDiagnosticAudit,
} from "./acpChatDiagnosticAuditTrail";
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
  hasAcpRuntimeOptionSelectors,
  resolveAcpRuntimeOptionsState,
  type AcpReasoningSource,
} from "./acpSessionConfigOptions";
import {
  normalizeAcpEffortId,
  resolveAcpRawModelIdForSelection,
} from "./acpModelOptionFolding";
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
  type AcpHostContext,
  type AcpPendingPermissionRequest,
  type AcpPlanEntry,
  type AcpSelectableOption,
} from "./acpTypes";
import type {
  RequestPermissionOutcome,
  SessionModelState,
  SessionModeState,
} from "./acpProtocol";
import {
  copyRuntimeDirectory,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  removeRuntimePath,
  replaceRuntimeTextFileAtomically,
  runtimePathExists,
} from "./runtimePersistence";
import {
  buildAcpChatSkillInjectionPlan,
  normalizeAcpProjectSkillRoot,
} from "./acpAgentFamilyResolver";
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
import {
  AcpPermissionQueue,
  type AcpQueuedPermissionRequest,
} from "./acpPermissionQueue";
import { resolveAutoApproveAcpPermissionOptionId } from "./acpPermissionOptions";
import {
  buildAcpStartupPromptPreamble,
  prependAcpStartupPromptPreamble,
} from "./acpStartupPromptPreambles";
import {
  ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID,
  loadAcpRuntimePromptTemplate,
} from "./acpRuntimePromptTemplates";

export type AcpChatWorkspaceChangeKind =
  | "active-scope"
  | "status"
  | "permission"
  | "session-list"
  | "transcript-boundary"
  | "transcript-append"
  | "transcript-progress"
  | "message-counts"
  | "plan"
  | "composer"
  | "owner-presentation"
  | "runtime-options"
  | "backend"
  | "global";
export type AcpChatWorkspaceChange = Readonly<{
  backendId?: string;
  conversationId?: string;
  active?: boolean;
  global?: boolean;
  kinds: readonly AcpChatWorkspaceChangeKind[];
  transcriptEvents?: readonly AssistantWorkspaceTranscriptMutationEvent[];
  transcriptEventSeq?: number;
  transcriptItemCount?: number;
}>;
type AcpChatWorkspaceListener = (change: AcpChatWorkspaceChange) => void;

export type AcpChatWorkspaceReadModel = Readonly<{
  backendId: string;
  backendDisplayName: string;
  conversationId: string;
  conversationTitle: string;
  sessionTitle: string;
  sessionUpdatedAt: string;
  status: string;
  busy: boolean;
  connected: boolean;
  promptInterruptState: AcpConversationSnapshot["promptInterruptState"];
  lastError: string;
  prerequisiteError: string;
  sessionId: string;
  remoteSessionId: string;
  remoteSessionRestoreStatus: string;
  remoteSessionRestoreMessage: string;
  agentLabel: string;
  agentVersion: string;
  autoApproveAcpPermissions: boolean;
  authMethods: AcpConversationSnapshot["authMethods"];
  commandLine: string;
  lastStopReason: string;
  diagnostics: AcpConversationSnapshot["diagnostics"];
  stderrTail: string;
  lastHostContext: AcpConversationSnapshot["lastHostContext"];
  usage: AcpConversationSnapshot["usage"];
  pendingPermissionRequest: AcpConversationSnapshot["pendingPermissionRequest"];
  modeOptions: AcpConversationSnapshot["modeOptions"];
  currentMode: AcpConversationSnapshot["currentMode"];
  modelOptions: AcpConversationSnapshot["modelOptions"];
  currentModel: AcpConversationSnapshot["currentModel"];
  displayModelOptions: AcpConversationSnapshot["displayModelOptions"];
  currentDisplayModel: AcpConversationSnapshot["currentDisplayModel"];
  reasoningEffortOptions: AcpConversationSnapshot["reasoningEffortOptions"];
  currentReasoningEffort: AcpConversationSnapshot["currentReasoningEffort"];
  planEntries: AcpPlanEntry[];
  agentWorkspaceDir: string;
  sessionCwd: string;
  workspaceDir: string;
  runtimeDir: string;
  updatedAt: string;
}>;
const ACP_CHAT_SHUTDOWN_DETACH_TIMEOUT_MS = 2_000;
const DEFAULT_ACP_CHAT_PROMPT_INTERRUPT_GRACE_MS = 10_000;
const ACP_CHAT_COLD_TRANSCRIPT_MIRROR_CACHE_LIMIT = 10;
const coldAcpChatTranscriptMirrorLru = new Map<string, true>();
export type AcpChatSessionRuntime = {
  key: string;
  backendId: string;
  adapter: AcpConnectionAdapter | null;
  snapshot: AcpConversationSnapshot;
  reasoningSource: AcpReasoningSource;
  pendingWorkspaceChangeKinds: Set<AcpChatWorkspaceChangeKind>;
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
  silentTerminalAssistantCollector: AcpSilentTerminalAssistantCollector;
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
  permissionQueue: AcpPermissionQueue;
  suppressSessionLoadReplay: boolean;
  workspaceChangeTimer: ReturnType<typeof setTimeout> | null;
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
  changeKinds?: AcpChatWorkspaceChangeKind[];
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
const acpChatWorkspaceListeners = new Set<AcpChatWorkspaceListener>();
const chatTranscriptWrites = new Set<Promise<unknown>>();
const MAX_DIAGNOSTICS = 40;
const MAX_LIVE_ACP_CHAT_ADAPTERS = 3;
const STREAMING_PERSIST_THROTTLE_MS = 2000;
const ACP_CHAT_INJECTED_SKILL_IDS = [
  "zotero-bridge-cli",
  "literature-search-ingest",
  "literature-metadata-search",
  "zotero-library-agent",
  "zotero-library-curation",
  "zotero-library-query",
  "zotero-literature-acquisition",
  "zotero-literature-analysis",
  "zotero-research-synthesis",
] as const;
const ACP_CHAT_INJECTED_SKILLS_MANIFEST_SCHEMA =
  "zotero-agents.acp-chat-injected-skills.v1";
const ACP_CHAT_INJECTED_SKILLS_MANIFEST_FILENAME =
  "injected-skills-manifest.json";
const ACP_CHAT_WORKSPACE_AGENTS_FILENAME = "AGENTS.md";
const ACP_CHAT_WORKSPACE_AGENTS_START =
  "<!-- zotero-agents:acp-chat-workspace:start -->";
const ACP_CHAT_WORKSPACE_AGENTS_END =
  "<!-- zotero-agents:acp-chat-workspace:end -->";
const LEGACY_ACP_CHAT_SKILL_ROOTS = [
  ".agents/skills",
  ".codex/skills",
  ".claude/skills",
  ".gemini/skills",
  ".qwen/skills",
  ".kilo/skills",
] as const;

type AcpChatInjectedSkillTarget = {
  relativeRoot: string;
  skillId: string;
};

type AcpChatInjectedSkillsManifest = {
  schema: typeof ACP_CHAT_INJECTED_SKILLS_MANIFEST_SCHEMA;
  targets: AcpChatInjectedSkillTarget[];
};

let acpChatWorkspacePreparationTail: Promise<void> = Promise.resolve();

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
        if (mode === "silent") {
          sessionRuntime.silentTerminalAssistantCollector.reset();
          const hadActiveText =
            !!sessionRuntime.activeAssistantItemId ||
            !!sessionRuntime.activeThoughtItemId;
          completeActiveStreamingTextItems(sessionRuntime);
          if (hadActiveText) {
            emitSessionRuntimeSnapshot(sessionRuntime, {
              uiReason: "critical",
            });
          }
        } else if (lastExecutionDisplayMode === "silent") {
          sessionRuntime.silentTerminalAssistantCollector.discard();
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
  sessionRuntime.silentTerminalAssistantCollector.discard();
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
  sessionRuntime.permissionQueue.cancelAll();
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
    reasoningSource: "none",
    pendingWorkspaceChangeKinds: new Set<AcpChatWorkspaceChangeKind>(),
    workspaceTranscriptEvents: [],
    unsubscribeUpdate: null,
    unsubscribeClose: null,
    unsubscribeDiagnostics: null,
    unsubscribePermission: null,
    unsubscribeHostBridgePermission: null,
    suppressCloseEvent: false,
    activePrompt: null,
    silentTerminalAssistantCollector:
      createAcpSilentTerminalAssistantCollector(),
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
    permissionQueue: new AcpPermissionQueue(),
    suppressSessionLoadReplay: false,
    workspaceChangeTimer: null,
    persistTimer: null,
    lastLiveActivityMs: Date.now(),
  };
  sessionRuntime.reasoningSource = reasoningSourceForSnapshot(
    sessionRuntime.snapshot,
  );
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

function projectSessionRuntimePermissionRequest(
  request: AcpQueuedPermissionRequest,
): AcpPendingPermissionRequest {
  return {
    requestId: request.requestId,
    sessionId: request.sessionId,
    toolCallId: request.toolCallId,
    toolTitle: request.toolTitle,
    approvalKind: request.approvalKind,
    source: request.source,
    summary: request.summary,
    detail: request.detail,
    requestedAt: request.requestedAt,
    options: request.options.map((entry) => ({ ...entry })),
  };
}

function syncSessionRuntimePermissionHead(
  sessionRuntime: AcpChatSessionRuntime,
) {
  const active = sessionRuntime.permissionQueue.active();
  sessionRuntime.snapshot.pendingPermissionRequest = active
    ? projectSessionRuntimePermissionRequest(active)
    : null;
  if (active) {
    sessionRuntime.snapshot.status = "permission-required";
    sessionRuntime.snapshot.busy = true;
  }
}

function setSessionRuntimePendingPermissionRequest(
  sessionRuntime: AcpChatSessionRuntime,
  request: AcpQueuedPermissionRequest,
) {
  const activeRequestId =
    sessionRuntime.permissionQueue.active()?.requestId || "";
  if (!sessionRuntime.permissionQueue.enqueue(request)) {
    return;
  }
  if (activeRequestId) {
    return;
  }
  syncSessionRuntimePermissionHead(sessionRuntime);
  emitSessionRuntimeSnapshot(sessionRuntime, {
    changeKinds: ["permission"],
  });
}

function cancelSessionRuntimePermissionRequests(
  sessionRuntime: AcpChatSessionRuntime,
) {
  const hadPending =
    sessionRuntime.permissionQueue.size > 0 ||
    !!sessionRuntime.snapshot.pendingPermissionRequest;
  sessionRuntime.permissionQueue.cancelAll();
  sessionRuntime.snapshot.pendingPermissionRequest = null;
  if (hadPending) {
    sessionRuntime.pendingWorkspaceChangeKinds.add("permission");
  }
  return hadPending;
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

export function getAcpChatWorkspaceOwnerNavigation(): AssistantWorkspaceOwnerNavigation {
  ensureInitialized();
  const active = getActiveAcpChatOwner();
  const foreground = getOrCreateSessionRuntime(active.backendId);
  const foregroundBackend = foreground.snapshot.backend;
  const backends: BackendInstance[] = [
    ...(foregroundBackend &&
    !cachedAcpBackends.some((entry) => entry.id === foregroundBackend.id)
      ? [foregroundBackend]
      : []),
    ...cachedAcpBackends,
  ];
  const entries = backends.flatMap((backend) => {
    const sessions =
      backend.id === active.backendId
        ? listAcpChatSessions(backend.id)
        : listStoredVisibleAcpChatSessions(backend.id);
    return sessions.map((session) => {
      const summary = projectAcpChatSessionSummary(backend.id, session);
      return {
        owner: createAcpChatWorkspaceOwner(backend.id, summary.conversationId),
        groupId: backend.id,
        label: String(summary.title || "").trim() || summary.conversationId,
        subtitle:
          String(backend.displayName || backend.id).trim() || backend.id,
        description: String(summary.lastError || "").trim() || null,
        groupLabel:
          String(backend.displayName || backend.id).trim() || backend.id,
        status: String(summary.status || "idle"),
        backendStatus: String(summary.status || "idle"),
        applyState: null,
        attention: String(summary.lastError || "").trim() || null,
        updatedAt: String(summary.updatedAt || "").trim() || null,
        messageCount: Math.max(0, Number(summary.messageCount) || 0),
        submission: null,
        resumptionPending: false,
      };
    });
  });
  const selectedOwner =
    active.backendId && active.conversationId
      ? createAcpChatWorkspaceOwner(active.backendId, active.conversationId)
      : null;
  return {
    selectedOwner,
    selectedGroupId: active.backendId || null,
    groups: backends.map((backend) => ({
      groupId: backend.id,
      label: String(backend.displayName || backend.id).trim() || backend.id,
      status: String(
        backend.id === active.backendId
          ? foreground.snapshot.status || "idle"
          : "idle",
      ),
    })),
    entries,
    queuedEntries: [],
    canCreateOwner: backends.length > 0,
  };
}

export function getAcpChatWorkspaceReadModel(
  backendIdRaw: string,
  conversationIdRaw: string,
): AcpChatWorkspaceReadModel {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    normalizeBackendId(backendIdRaw) || activeBackendId,
    normalizeConversationId(conversationIdRaw),
  );
  const snapshot = sessionRuntime.snapshot;
  const planItem = sessionRuntime.activePlanItemId
    ? sessionRuntime.transcriptItemsById.get(sessionRuntime.activePlanItemId)
    : undefined;
  return Object.freeze({
    backendId: sessionRuntime.backendId,
    backendDisplayName:
      String(
        snapshot.backend?.displayName || sessionRuntime.backendId,
      ).trim() || sessionRuntime.backendId,
    conversationId: snapshot.conversationId,
    conversationTitle: snapshot.conversationTitle,
    sessionTitle: snapshot.sessionTitle,
    sessionUpdatedAt: snapshot.sessionUpdatedAt,
    status: snapshot.status,
    busy: snapshot.busy,
    connected: sessionRuntime.adapter !== null,
    promptInterruptState: snapshot.promptInterruptState,
    lastError: snapshot.lastError || snapshot.prerequisiteError,
    prerequisiteError: snapshot.prerequisiteError,
    sessionId: snapshot.sessionId,
    remoteSessionId: snapshot.remoteSessionId,
    remoteSessionRestoreStatus: snapshot.remoteSessionRestoreStatus,
    remoteSessionRestoreMessage: snapshot.remoteSessionRestoreMessage,
    agentLabel: snapshot.agentLabel,
    agentVersion: snapshot.agentVersion,
    autoApproveAcpPermissions: snapshot.autoApproveAcpPermissions === true,
    authMethods: snapshot.authMethods.map((entry) => ({ ...entry })),
    commandLine: snapshot.commandLine,
    lastStopReason: snapshot.lastStopReason,
    diagnostics: snapshot.diagnostics.slice(-12).map((entry) => ({ ...entry })),
    stderrTail: snapshot.stderrTail,
    lastHostContext: snapshot.lastHostContext
      ? JSON.parse(JSON.stringify(snapshot.lastHostContext))
      : null,
    usage: snapshot.usage ? { ...snapshot.usage } : null,
    pendingPermissionRequest: snapshot.pendingPermissionRequest
      ? {
          ...snapshot.pendingPermissionRequest,
          options: snapshot.pendingPermissionRequest.options.map((option) => ({
            ...option,
          })),
        }
      : null,
    modeOptions: snapshot.modeOptions.map((option) => ({ ...option })),
    currentMode: snapshot.currentMode ? { ...snapshot.currentMode } : undefined,
    modelOptions: snapshot.modelOptions.map((option) => ({ ...option })),
    currentModel: snapshot.currentModel
      ? { ...snapshot.currentModel }
      : undefined,
    displayModelOptions: snapshot.displayModelOptions.map((option) => ({
      ...option,
    })),
    currentDisplayModel: snapshot.currentDisplayModel
      ? { ...snapshot.currentDisplayModel }
      : undefined,
    reasoningEffortOptions: snapshot.reasoningEffortOptions.map((option) => ({
      ...option,
    })),
    currentReasoningEffort: snapshot.currentReasoningEffort
      ? { ...snapshot.currentReasoningEffort }
      : undefined,
    planEntries:
      planItem?.kind === "plan"
        ? planItem.entries.map((entry) => ({ ...entry }))
        : [],
    agentWorkspaceDir: snapshot.agentWorkspaceDir,
    sessionCwd: snapshot.sessionCwd,
    workspaceDir: snapshot.workspaceDir,
    runtimeDir: snapshot.runtimeDir,
    updatedAt: snapshot.updatedAt,
  });
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

function buildAcpChatWorkspaceChange(
  sessionRuntime: AcpChatSessionRuntime,
  kinds: readonly AcpChatWorkspaceChangeKind[],
  options: { global?: boolean } = {},
): AcpChatWorkspaceChange {
  const hasTranscript = kinds.some(
    (kind) =>
      kind === "transcript-append" ||
      kind === "transcript-boundary" ||
      kind === "transcript-progress",
  );
  const transcriptEvents = hasTranscript
    ? sessionRuntime.workspaceTranscriptEvents.splice(0)
    : [];
  for (const event of transcriptEvents) {
    Object.freeze(event.mutation);
    Object.freeze(event);
  }
  return Object.freeze({
    backendId: sessionRuntime.backendId,
    conversationId: sessionRuntime.snapshot.conversationId,
    active: isForegroundSessionRuntime(sessionRuntime),
    global: options.global === true,
    kinds: Object.freeze([...new Set(kinds)]),
    ...(transcriptEvents.length > 0
      ? {
          transcriptEvents: Object.freeze(transcriptEvents),
          transcriptEventSeq: sessionRuntime.transcriptEventSeq,
          transcriptItemCount: sessionRuntime.transcriptItemCount,
        }
      : {}),
  });
}

function notifyAcpChatWorkspaceListeners(
  change: AcpChatWorkspaceChange | undefined,
) {
  if (!change) return;
  for (const listener of acpChatWorkspaceListeners) {
    listener(change);
  }
}

function resolveAcpChatWorkspaceChangeKinds(
  reason: AssistantWorkspacePublishReason,
  sessionRuntime: AcpChatSessionRuntime,
  explicitKinds: readonly AcpChatWorkspaceChangeKind[] = [],
): AcpChatWorkspaceChangeKind[] {
  const kinds = new Set(explicitKinds);
  if (reason === "live") {
    if (kinds.size === 0) kinds.add("transcript-append");
    return Array.from(kinds);
  }
  if (sessionRuntime.workspaceTranscriptEvents.length > 0) {
    kinds.add("transcript-boundary");
  }
  if (sessionRuntime.snapshot.pendingPermissionRequest) {
    kinds.add("permission");
  }
  kinds.add("status");
  return Array.from(kinds);
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
  cancelSessionRuntimePermissionRequests(sessionRuntime);
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

function consumePendingAcpChatWorkspaceChangeKinds(
  sessionRuntime: AcpChatSessionRuntime,
  additional: readonly AcpChatWorkspaceChangeKind[] = [],
) {
  const kinds = Array.from(
    new Set([...sessionRuntime.pendingWorkspaceChangeKinds, ...additional]),
  );
  sessionRuntime.pendingWorkspaceChangeKinds.clear();
  return kinds;
}

function flushPendingPersistence(sessionRuntime: AcpChatSessionRuntime) {
  if (sessionRuntime.persistTimer) {
    clearTimeout(sessionRuntime.persistTimer);
    sessionRuntime.persistTimer = null;
  }
  persistSessionRuntimeSnapshotNow(sessionRuntime);
}

function flushPendingWorkspaceChange(
  sessionRuntime: AcpChatSessionRuntime,
  reason: AssistantWorkspacePublishReason = "critical",
  changeKinds: readonly AcpChatWorkspaceChangeKind[] = [],
) {
  if (sessionRuntime.workspaceChangeTimer) {
    clearTimeout(sessionRuntime.workspaceChangeTimer);
    sessionRuntime.workspaceChangeTimer = null;
  }
  const pendingChangeKinds = consumePendingAcpChatWorkspaceChangeKinds(
    sessionRuntime,
    changeKinds,
  );
  notifyAcpChatWorkspaceListeners(
    buildAcpChatWorkspaceChange(
      sessionRuntime,
      resolveAcpChatWorkspaceChangeKinds(
        reason,
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

function scheduleWorkspaceChange(
  sessionRuntime: AcpChatSessionRuntime,
  reason: AssistantWorkspacePublishReason = "live",
  changeKinds: readonly AcpChatWorkspaceChangeKind[] = [],
) {
  for (const kind of changeKinds) {
    sessionRuntime.pendingWorkspaceChangeKinds.add(kind);
  }
  if (sessionRuntime.workspaceChangeTimer) return;
  sessionRuntime.workspaceChangeTimer = setTimeout(() => {
    sessionRuntime.workspaceChangeTimer = null;
    const pendingChangeKinds =
      consumePendingAcpChatWorkspaceChangeKinds(sessionRuntime);
    notifyAcpChatWorkspaceListeners(
      buildAcpChatWorkspaceChange(
        sessionRuntime,
        resolveAcpChatWorkspaceChangeKinds(
          reason,
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

  if (sessionRuntime.workspaceChangeTimer) {
    const nativeToken = sessionRuntime.workspaceChangeTimer;
    let currentToken = nativeToken;
    timers.push({
      domain: "acp-chat-workspace-change",
      ownerKey,
      delayMs: ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS,
      nativeToken,
      detachNative: () => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.workspaceChangeTimer !== currentToken
        ) {
          return false;
        }
        clearTimeout(currentToken);
        return true;
      },
      fireIfCurrent: () => {
        if (
          sessionRuntimes.get(key) !== sessionRuntime ||
          sessionRuntime.workspaceChangeTimer !== currentToken
        ) {
          return false;
        }
        sessionRuntime.workspaceChangeTimer = null;
        const pendingChangeKinds =
          consumePendingAcpChatWorkspaceChangeKinds(sessionRuntime);
        notifyAcpChatWorkspaceListeners(
          buildAcpChatWorkspaceChange(
            sessionRuntime,
            resolveAcpChatWorkspaceChangeKinds(
              "live",
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
          sessionRuntime.workspaceChangeTimer !== currentToken
        ) {
          return false;
        }
        currentToken = setTimeout(
          () => {
            sessionRuntime.workspaceChangeTimer = null;
            const pendingChangeKinds =
              consumePendingAcpChatWorkspaceChangeKinds(sessionRuntime);
            notifyAcpChatWorkspaceListeners(
              buildAcpChatWorkspaceChange(
                sessionRuntime,
                resolveAcpChatWorkspaceChangeKinds(
                  "live",
                  sessionRuntime,
                  pendingChangeKinds,
                ),
              ),
            );
          },
          Math.max(0, remainingMs),
        );
        sessionRuntime.workspaceChangeTimer = currentToken;
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

function publishSessionRuntimeWorkspaceChange(
  sessionRuntime: AcpChatSessionRuntime,
  reason: AssistantWorkspacePublishReason,
  changeKinds: readonly AcpChatWorkspaceChangeKind[] = [],
) {
  if (reason === "background") return;
  if (reason === "live") {
    if (!canPublishAssistantWorkspaceLiveUpdates()) return;
    scheduleWorkspaceChange(sessionRuntime, reason, changeKinds);
    return;
  }
  flushPendingWorkspaceChange(sessionRuntime, reason, changeKinds);
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
    publishSessionRuntimeWorkspaceChange(
      sessionRuntime,
      reason,
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
  const conversationId = normalizeConversationId(
    sessionRuntime.snapshot.conversationId,
  );
  const ownerKey = acpChatDiagnosticAuditOwnerKey(
    sessionRuntime.backendId,
    conversationId,
  );
  const paths = conversationId
    ? resolveAcpChatRuntimePaths(sessionRuntime.backendId, conversationId)
    : undefined;
  recordAcpRuntimeDiagnostic({
    surface: "acp-chat",
    ownerKey: ownerKey || sessionRuntime.key,
    requestId: ownerKey || undefined,
    backendId: sessionRuntime.backendId,
    entry,
    debugAuditSink:
      ownerKey && paths
        ? (evidence) => {
            appendAcpChatDiagnosticAudit({
              ownerKey,
              path: paths.diagnosticsAuditPath,
              requestId: ownerKey,
              backendId: sessionRuntime.backendId,
              conversationId,
              entry: evidence,
            });
          }
        : undefined,
  });
}

function acpChatDiagnosticOwnerForRuntime(
  sessionRuntime: AcpChatSessionRuntime,
) {
  return acpChatDiagnosticAuditOwnerKey(
    sessionRuntime.backendId,
    sessionRuntime.snapshot.conversationId,
  );
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
      cardinality:
        !previousItem && currentItem
          ? "insert"
          : previousItem && !currentItem
            ? "delete"
            : "retain",
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

function snapshotRuntimeOptionsCache(
  snapshot: AcpConversationSnapshot,
  reasoningSource?: AcpReasoningSource,
) {
  return {
    modes: snapshot.modeOptions,
    currentModeId: snapshot.currentMode?.id || "",
    rawModels: snapshot.modelOptions,
    currentRawModelId: snapshot.currentModel?.id || "",
    displayModels: snapshot.displayModelOptions,
    currentDisplayModelId: snapshot.currentDisplayModel?.id || "",
    reasoningEfforts: snapshot.reasoningEffortOptions,
    currentReasoningEffortId: snapshot.currentReasoningEffort?.id || "",
    ...(reasoningSource ? { reasoningSource } : {}),
  };
}

function reasoningSourceForSnapshot(snapshot: AcpConversationSnapshot) {
  return resolveAcpRuntimeOptionsState({
    cache: snapshotRuntimeOptionsCache(snapshot),
  }).reasoningSource;
}

function mergeRuntimeOptionsCache(
  primary: ReturnType<typeof snapshotRuntimeOptionsCache>,
  fallback: NonNullable<BackendInstance["acp"]>["runtimeOptionsCache"],
) {
  const fallbackCache = fallback || {};
  const usePrimaryModes = primary.modes.length > 0;
  const usePrimaryModels = primary.rawModels.length > 0;
  const usePrimaryReasoning = primary.reasoningEfforts.length > 0;
  return {
    modes: usePrimaryModes ? primary.modes : fallbackCache.modes,
    currentModeId: usePrimaryModes
      ? primary.currentModeId
      : fallbackCache.currentModeId,
    rawModels: usePrimaryModels ? primary.rawModels : fallbackCache.rawModels,
    currentRawModelId: usePrimaryModels
      ? primary.currentRawModelId
      : fallbackCache.currentRawModelId,
    displayModels: usePrimaryModels
      ? primary.displayModels
      : fallbackCache.displayModels,
    currentDisplayModelId: usePrimaryModels
      ? primary.currentDisplayModelId
      : fallbackCache.currentDisplayModelId,
    reasoningEfforts: usePrimaryReasoning
      ? primary.reasoningEfforts
      : fallbackCache.reasoningEfforts,
    currentReasoningEffortId: usePrimaryReasoning
      ? primary.currentReasoningEffortId
      : fallbackCache.currentReasoningEffortId,
    reasoningSource: usePrimaryReasoning
      ? primary.reasoningSource
      : fallbackCache.reasoningSource,
  };
}

function applyResolvedRuntimeOptionsState(
  sessionRuntime: AcpChatSessionRuntime,
  state: ReturnType<typeof resolveAcpRuntimeOptionsState>,
) {
  const snapshot = sessionRuntime.snapshot;
  snapshot.modeOptions = state.modes.map((entry) => ({ ...entry }));
  snapshot.currentMode = snapshot.modeOptions.find(
    (entry) => entry.id === state.currentModeId,
  );
  snapshot.modelOptions = state.rawModels.map((entry) => ({ ...entry }));
  snapshot.currentModel = snapshot.modelOptions.find(
    (entry) => entry.id === state.currentRawModelId,
  );
  snapshot.displayModelOptions = state.displayModels.map((entry) => ({
    ...entry,
  }));
  snapshot.currentDisplayModel = snapshot.displayModelOptions.find(
    (entry) => entry.id === state.currentDisplayModelId,
  );
  snapshot.reasoningEffortOptions = state.reasoningEfforts.map((entry) => ({
    ...entry,
  }));
  snapshot.currentReasoningEffort = snapshot.reasoningEffortOptions.find(
    (entry) => entry.id === state.currentReasoningEffortId,
  );
  sessionRuntime.reasoningSource = state.reasoningSource;
}

function applyRuntimeOptionsCache(
  sessionRuntime: AcpChatSessionRuntime,
  backend: BackendInstance,
) {
  const cache = backend.acp?.runtimeOptionsCache;
  if (!cache) {
    return;
  }

  const primary = snapshotRuntimeOptionsCache(
    sessionRuntime.snapshot,
    sessionRuntime.reasoningSource,
  );
  applyResolvedRuntimeOptionsState(
    sessionRuntime,
    resolveAcpRuntimeOptionsState({
      cache: mergeRuntimeOptionsCache(primary, cache),
    }),
  );
}

function applySessionConfigOptionsState(
  sessionRuntime: AcpChatSessionRuntime,
  configOptions: unknown,
) {
  const liveState = resolveAcpRuntimeOptionsState({
    configOptions: Array.isArray(configOptions) ? configOptions : null,
  });
  if (!hasAcpRuntimeOptionSelectors(liveState)) {
    return {
      modeApplied: false,
      modelApplied: false,
      reasoningApplied: false,
    };
  }

  applyResolvedRuntimeOptionsState(
    sessionRuntime,
    resolveAcpRuntimeOptionsState({
      configOptions: Array.isArray(configOptions) ? configOptions : null,
      cache: snapshotRuntimeOptionsCache(
        sessionRuntime.snapshot,
        sessionRuntime.reasoningSource,
      ),
    }),
  );

  return {
    modeApplied: liveState.modes.length > 0,
    modelApplied: liveState.rawModels.length > 0,
    reasoningApplied: liveState.reasoningSource === "explicit",
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
  applyResolvedRuntimeOptionsState(
    sessionRuntime,
    resolveAcpRuntimeOptionsState({
      modes: value as SessionModeState,
      cache: snapshotRuntimeOptionsCache(
        sessionRuntime.snapshot,
        sessionRuntime.reasoningSource,
      ),
      overrides: { modeId: String(value.currentModeId || "").trim() },
    }),
  );
}

function deriveModelEffortState(snapshot: AcpConversationSnapshot) {
  const state = resolveAcpRuntimeOptionsState({
    cache: snapshotRuntimeOptionsCache(snapshot),
  });
  snapshot.displayModelOptions = state.displayModels.map((entry) => ({
    ...entry,
  }));
  snapshot.currentDisplayModel = snapshot.displayModelOptions.find(
    (entry) => entry.id === state.currentDisplayModelId,
  );
  snapshot.reasoningEffortOptions = state.reasoningEfforts.map((entry) => ({
    ...entry,
  }));
  snapshot.currentReasoningEffort = snapshot.reasoningEffortOptions.find(
    (entry) => entry.id === state.currentReasoningEffortId,
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
  applyResolvedRuntimeOptionsState(
    sessionRuntime,
    resolveAcpRuntimeOptionsState({
      models: value as SessionModelState,
      cache: snapshotRuntimeOptionsCache(
        sessionRuntime.snapshot,
        sessionRuntime.reasoningSource,
      ),
      overrides: { rawModelId: String(value.currentModelId || "").trim() },
    }),
  );
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
    sessionRuntime.silentTerminalAssistantCollector.update(update);
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
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        touchUpdatedAt: false,
        uiReason: "live",
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
      emitSessionRuntimeSnapshot(sessionRuntime, {
        throttlePersist: true,
        touchUpdatedAt: false,
        uiReason: "live",
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
        changeKinds: ["composer"],
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
        changeKinds: ["composer"],
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
        changeKinds:
          applied.modeApplied ||
          applied.modelApplied ||
          applied.reasoningApplied
            ? ["composer"]
            : ["composer", "transcript-boundary"],
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
        changeKinds: ["owner-presentation"],
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
        changeKinds: ["composer"],
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
  activateAcpChatDiagnosticAuditOwner(
    acpChatDiagnosticOwnerForRuntime(sessionRuntime),
  );
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
    cancelSessionRuntimePermissionRequests(sessionRuntime);
    const closeMessage = String(event?.message || "").trim();
    const stderrText = String(event?.stderrText || "").trim();
    const naturalIdleClose =
      !sessionRuntime.snapshot.busy &&
      (sessionRuntime.snapshot.status === "connected" ||
        sessionRuntime.snapshot.status === "idle") &&
      !closeMessage &&
      !stderrText;
    sessionRuntime.snapshot.busy = false;
    if (naturalIdleClose) {
      markSessionRuntimeConnectionIdle(sessionRuntime, {
        lifecycleEvent: "closed",
      });
      emitSessionRuntimeSnapshot(sessionRuntime, {
        uiReason: "boundary",
      });
      void flushAcpChatDiagnosticAudit(
        acpChatDiagnosticOwnerForRuntime(sessionRuntime),
      ).catch(() => undefined);
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
    void flushAcpChatDiagnosticAudit(
      acpChatDiagnosticOwnerForRuntime(sessionRuntime),
    ).catch(() => undefined);
  });
  sessionRuntime.unsubscribeDiagnostics = nextAdapter.onDiagnostics((entry) => {
    touchLiveAcpChatSessionRuntime(sessionRuntime);
    appendDiagnostic(sessionRuntime, entry);
    emitSessionRuntimeSnapshot(sessionRuntime, {
      persist: false,
      touchUpdatedAt: false,
      uiReason: "live",
      changeKinds: ["owner-presentation"],
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
  sessionRuntime.silentTerminalAssistantCollector.discard();
  cancelSessionRuntimePermissionRequests(sessionRuntime);
  const diagnosticOwner = acpChatDiagnosticOwnerForRuntime(sessionRuntime);
  if (!sessionRuntime.adapter) {
    await releaseAcpChatDiagnosticAudit(diagnosticOwner);
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
    await releaseAcpChatDiagnosticAudit(diagnosticOwner);
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
    sessionRuntime.silentTerminalAssistantCollector.discard();
    sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
      acpChatExecutionProgressScope(sessionRuntime),
    );
    finalizeStreamingItems(sessionRuntime, "error", "cancelled");
    emitSessionRuntimeSnapshot(sessionRuntime, {
      uiReason: "critical",
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
  sessionRuntime.silentTerminalAssistantCollector.discard();
  sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
    acpChatExecutionProgressScope(sessionRuntime),
  );
  finalizeStreamingItems(sessionRuntime, "complete", "cancelled");
  emitSessionRuntimeSnapshot(sessionRuntime, {
    uiReason: "critical",
  });
}

function withAcpChatWorkspacePreparationLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const run = acpChatWorkspacePreparationTail
    .catch(() => undefined)
    .then(operation);
  acpChatWorkspacePreparationTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function appendAcpChatPreparationDiagnostic(
  sessionRuntime: AcpChatSessionRuntime,
  entry: {
    kind: string;
    level: "info" | "warn" | "error";
    message: string;
    detail?: string;
    raw?: unknown;
  },
) {
  appendDiagnostic(sessionRuntime, {
    id: nextOpaqueId("acp-diag"),
    ts: nowIso(),
    ...entry,
    detail: entry.detail || "",
  });
}

function managedAcpChatWorkspaceAgentsBlock(template: string) {
  return [
    ACP_CHAT_WORKSPACE_AGENTS_START,
    template.trim(),
    ACP_CHAT_WORKSPACE_AGENTS_END,
  ].join("\n");
}

function countTextOccurrences(content: string, marker: string) {
  return content.split(marker).length - 1;
}

async function materializeAcpChatWorkspaceInstructions(args: {
  sessionRuntime: AcpChatSessionRuntime;
  workspaceDir: string;
}) {
  const targetPath = joinPath(
    args.workspaceDir,
    ACP_CHAT_WORKSPACE_AGENTS_FILENAME,
  );
  try {
    const template = await loadAcpRuntimePromptTemplate(
      ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.acp_chat_workspace_agents,
    );
    const managedBlock = managedAcpChatWorkspaceAgentsBlock(template);
    const existing = (await runtimePathExists(targetPath))
      ? await readRuntimeTextFile(targetPath)
      : "";
    const startCount = countTextOccurrences(
      existing,
      ACP_CHAT_WORKSPACE_AGENTS_START,
    );
    const endCount = countTextOccurrences(
      existing,
      ACP_CHAT_WORKSPACE_AGENTS_END,
    );
    let content = managedBlock;
    if (startCount === 0 && endCount === 0) {
      content = existing.trim()
        ? `${managedBlock}\n\n${existing}`
        : `${managedBlock}\n`;
    } else if (startCount === 1 && endCount === 1) {
      const start = existing.indexOf(ACP_CHAT_WORKSPACE_AGENTS_START);
      const end = existing.indexOf(ACP_CHAT_WORKSPACE_AGENTS_END);
      if (end < start) {
        appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
          kind: "acp_chat_workspace_instructions_unavailable",
          level: "warn",
          message:
            "ACP Chat workspace instructions were not updated because AGENTS.md contains malformed managed markers.",
          detail: targetPath,
        });
        return;
      }
      content =
        existing.slice(0, start) +
        managedBlock +
        existing.slice(end + ACP_CHAT_WORKSPACE_AGENTS_END.length);
    } else {
      appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
        kind: "acp_chat_workspace_instructions_unavailable",
        level: "warn",
        message:
          "ACP Chat workspace instructions were not updated because AGENTS.md contains ambiguous managed markers.",
        detail: targetPath,
      });
      return;
    }
    await replaceRuntimeTextFileAtomically({
      targetPath,
      fragments: [content],
    });
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_workspace_instructions_ready",
      level: "info",
      message: "ACP Chat workspace instructions materialized.",
      detail: targetPath,
    });
  } catch (error) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_workspace_instructions_unavailable",
      level: "warn",
      message: "ACP Chat workspace instruction materialization failed.",
      detail: compactError(error),
    });
  }
}

function acpChatInjectedSkillTargetKey(target: AcpChatInjectedSkillTarget) {
  return `${target.relativeRoot}\u0000${target.skillId}`;
}

function resolveManagedAcpChatInjectedSkillDir(args: {
  workspaceDir: string;
  relativeRoot: string;
  skillId: string;
}) {
  const relativeRoot = normalizeAcpProjectSkillRoot(args.relativeRoot);
  if (
    !relativeRoot ||
    !ACP_CHAT_INJECTED_SKILL_IDS.includes(
      args.skillId as (typeof ACP_CHAT_INJECTED_SKILL_IDS)[number],
    )
  ) {
    return "";
  }
  const workspaceDir = normalizeString(args.workspaceDir);
  const targetDir = joinPath(args.workspaceDir, relativeRoot, args.skillId);
  const comparableWorkspaceDir = workspaceDir
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  const comparableTargetDir = targetDir.replace(/\\/g, "/");
  if (
    !comparableWorkspaceDir ||
    !comparableTargetDir.startsWith(`${comparableWorkspaceDir}/`)
  ) {
    return "";
  }
  return targetDir;
}

function normalizeAcpChatInjectedSkillTargets(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }
  const targets = new Map<string, AcpChatInjectedSkillTarget>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const record = raw as Record<string, unknown>;
    const relativeRoot = normalizeAcpProjectSkillRoot(record.relativeRoot);
    const skillId = normalizeString(record.skillId);
    if (
      !relativeRoot ||
      relativeRoot !== record.relativeRoot ||
      !ACP_CHAT_INJECTED_SKILL_IDS.includes(
        skillId as (typeof ACP_CHAT_INJECTED_SKILL_IDS)[number],
      )
    ) {
      return null;
    }
    const target = { relativeRoot, skillId };
    targets.set(acpChatInjectedSkillTargetKey(target), target);
  }
  return Array.from(targets.values());
}

async function bootstrapLegacyAcpChatInjectedSkillTargets(
  workspaceDir: string,
) {
  const targets: AcpChatInjectedSkillTarget[] = [];
  for (const relativeRoot of LEGACY_ACP_CHAT_SKILL_ROOTS) {
    for (const skillId of ACP_CHAT_INJECTED_SKILL_IDS) {
      const targetDir = resolveManagedAcpChatInjectedSkillDir({
        workspaceDir,
        relativeRoot,
        skillId,
      });
      if (targetDir && (await runtimePathExists(targetDir))) {
        targets.push({ relativeRoot, skillId });
      }
    }
  }
  return targets;
}

async function readAcpChatInjectedSkillsManifest(args: {
  sessionRuntime: AcpChatSessionRuntime;
  workspaceDir: string;
  manifestPath: string;
}) {
  if (!(await runtimePathExists(args.manifestPath))) {
    return bootstrapLegacyAcpChatInjectedSkillTargets(args.workspaceDir);
  }
  try {
    const parsed = JSON.parse(
      await readRuntimeTextFile(args.manifestPath),
    ) as Partial<AcpChatInjectedSkillsManifest>;
    const targets = normalizeAcpChatInjectedSkillTargets(parsed.targets);
    if (
      parsed.schema !== ACP_CHAT_INJECTED_SKILLS_MANIFEST_SCHEMA ||
      targets === null
    ) {
      throw new Error("unsupported or invalid injected skills manifest");
    }
    return targets;
  } catch (error) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_injected_skills_manifest_invalid",
      level: "warn",
      message:
        "ACP Chat ignored an invalid injected skills manifest and skipped stale cleanup.",
      detail: compactError(error),
    });
    return [];
  }
}

async function writeAcpChatInjectedSkillsManifest(args: {
  sessionRuntime: AcpChatSessionRuntime;
  manifestPath: string;
  targets: AcpChatInjectedSkillTarget[];
}) {
  const manifest: AcpChatInjectedSkillsManifest = {
    schema: ACP_CHAT_INJECTED_SKILLS_MANIFEST_SCHEMA,
    targets: [...args.targets].sort(
      (left, right) =>
        left.relativeRoot.localeCompare(right.relativeRoot) ||
        left.skillId.localeCompare(right.skillId),
    ),
  };
  try {
    await replaceRuntimeTextFileAtomically({
      targetPath: args.manifestPath,
      fragments: [JSON.stringify(manifest, null, 2), "\n"],
    });
    return true;
  } catch (error) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_injected_skills_manifest_unavailable",
      level: "warn",
      message: "ACP Chat injected skills manifest could not be committed.",
      detail: compactError(error),
    });
    return false;
  }
}

async function materializeAcpChatInjectedSkills(args: {
  sessionRuntime: AcpChatSessionRuntime;
  backends: readonly BackendInstance[];
  workspaceDir: string;
}) {
  const workspaceDir = normalizeString(args.workspaceDir);
  if (!workspaceDir) {
    return;
  }
  const injectionPlan = buildAcpChatSkillInjectionPlan({
    backends: args.backends,
    workspaceDir,
  });
  for (const diagnostic of injectionPlan.diagnostics) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: diagnostic.code,
      level:
        diagnostic.level === "error"
          ? "error"
          : diagnostic.level === "warning"
            ? "warn"
            : "info",
      message: diagnostic.message,
      detail: injectionPlan.families.join(", "),
      raw: {
        families: injectionPlan.families,
        skillRoots: injectionPlan.skillRoots,
      },
    });
  }

  const manifestPath = joinPath(
    getRuntimePersistencePaths().acpChatRoot,
    ACP_CHAT_INJECTED_SKILLS_MANIFEST_FILENAME,
  );
  const previousTargets = await readAcpChatInjectedSkillsManifest({
    sessionRuntime: args.sessionRuntime,
    workspaceDir,
    manifestPath,
  });
  const desiredRoots = new Set(injectionPlan.relativeSkillRoots);
  const nextTargets = new Map<string, AcpChatInjectedSkillTarget>();
  for (const target of previousTargets) {
    nextTargets.set(acpChatInjectedSkillTargetKey(target), target);
  }
  for (const relativeRoot of injectionPlan.relativeSkillRoots) {
    for (const skillId of ACP_CHAT_INJECTED_SKILL_IDS) {
      const target = { relativeRoot, skillId };
      nextTargets.set(acpChatInjectedSkillTargetKey(target), target);
    }
  }
  const ownershipCommitted = await writeAcpChatInjectedSkillsManifest({
    sessionRuntime: args.sessionRuntime,
    manifestPath,
    targets: Array.from(nextTargets.values()),
  });
  if (!ownershipCommitted) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_injected_skills_unavailable",
      level: "warn",
      message:
        "ACP Chat skipped injected skill reconciliation because target ownership could not be committed.",
      detail: manifestPath,
    });
    return;
  }

  let registry: Awaited<ReturnType<typeof scanPluginSkillRegistry>> | null =
    null;
  try {
    registry = await scanPluginSkillRegistry();
  } catch (error) {
    appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
      kind: "acp_chat_injected_skills_unavailable",
      level: "warn",
      message: "ACP Chat injected skill registry scan failed.",
      detail: compactError(error),
    });
  }

  const missingSkillIds: string[] = [];
  const failedTargets: Array<{
    relativeRoot: string;
    skillId: string;
    reason: string;
  }> = [];
  const targetDirsBySkill: Record<string, string[]> = {};
  if (registry) {
    for (const skillId of ACP_CHAT_INJECTED_SKILL_IDS) {
      const entry = registry.entriesById[skillId];
      if (!entry) {
        missingSkillIds.push(skillId);
        appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
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
      for (const relativeRoot of injectionPlan.relativeSkillRoots) {
        const target = { relativeRoot, skillId };
        const targetDir = resolveManagedAcpChatInjectedSkillDir({
          workspaceDir,
          relativeRoot,
          skillId,
        });
        if (!targetDir) {
          failedTargets.push({
            relativeRoot,
            skillId,
            reason: "invalid managed target",
          });
          continue;
        }
        try {
          await copyRuntimeDirectory({
            sourceDir: entry.sourceDir,
            targetDir,
          });
          nextTargets.set(acpChatInjectedSkillTargetKey(target), target);
          targetDirs.push(targetDir);
        } catch (error) {
          const reason = compactError(error);
          failedTargets.push({
            relativeRoot,
            skillId,
            reason,
          });
          appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
            kind: "acp_chat_injected_skill_unavailable",
            level: "warn",
            message: "ACP Chat injected skill materialization failed.",
            detail: `${skillId}: ${reason}`,
            raw: { relativeRoot, skillId },
          });
        }
      }
      targetDirsBySkill[skillId] = targetDirs;
    }
  }

  for (const target of previousTargets) {
    if (desiredRoots.has(target.relativeRoot)) {
      continue;
    }
    const targetDir = resolveManagedAcpChatInjectedSkillDir({
      workspaceDir,
      relativeRoot: target.relativeRoot,
      skillId: target.skillId,
    });
    if (!targetDir) {
      continue;
    }
    try {
      await removeRuntimePath(targetDir);
      nextTargets.delete(acpChatInjectedSkillTargetKey(target));
    } catch (error) {
      nextTargets.set(acpChatInjectedSkillTargetKey(target), target);
      appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
        kind: "acp_chat_injected_skill_cleanup_unavailable",
        level: "warn",
        message: "ACP Chat could not clean up a stale injected skill.",
        detail: `${targetDir}: ${compactError(error)}`,
        raw: target,
      });
    }
  }

  await writeAcpChatInjectedSkillsManifest({
    sessionRuntime: args.sessionRuntime,
    manifestPath,
    targets: Array.from(nextTargets.values()),
  });
  const expectedTargetCount =
    injectionPlan.relativeSkillRoots.length *
    ACP_CHAT_INJECTED_SKILL_IDS.length;
  const materializedTargetCount =
    Object.values(targetDirsBySkill).flat().length;
  const ready =
    expectedTargetCount > 0 &&
    registry !== null &&
    missingSkillIds.length === 0 &&
    failedTargets.length === 0 &&
    materializedTargetCount === expectedTargetCount;
  appendAcpChatPreparationDiagnostic(args.sessionRuntime, {
    kind: ready
      ? "acp_chat_injected_skills_ready"
      : "acp_chat_injected_skills_unavailable",
    level: ready ? "info" : "warn",
    message: ready
      ? "ACP Chat injected skills materialized."
      : expectedTargetCount > 0
        ? "ACP Chat injected skills were not fully materialized."
        : "ACP Chat injected skills were not materialized because no project skill roots were available.",
    detail: Object.values(targetDirsBySkill).flat().join(", "),
    raw: {
      skillIds: [...ACP_CHAT_INJECTED_SKILL_IDS],
      missingSkillIds,
      failedTargets,
      families: injectionPlan.families,
      skillRoots: injectionPlan.skillRoots,
      targetDirsBySkill,
      expectedTargetCount,
      materializedTargetCount,
    },
  });
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
  let backend = await resolveBackendForSessionRuntime(sessionRuntime);
  sessionRuntime.snapshot.sessionId = "";
  sessionRuntime.snapshot.lastError = "";
  sessionRuntime.snapshot.prerequisiteError = "";
  sessionRuntime.snapshot.stderrTail = "";
  cancelSessionRuntimePermissionRequests(sessionRuntime);
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
    const preparedWorkspace = await withAcpChatWorkspacePreparationLock(
      async () => {
        await materializeAcpChatWorkspaceInstructions({
          sessionRuntime,
          workspaceDir,
        });
        const configuredBackends = await refreshAcpBackends();
        const currentBackend = configuredBackends.find(
          (entry) => entry.id === sessionRuntime.backendId,
        );
        if (!currentBackend) {
          throw new Error(
            `ACP backend "${sessionRuntime.backendId}" is not available`,
          );
        }
        const hostBridgeCliInjection =
          await materializeHostBridgeCliRunInjection({
            workspaceDir,
            requestId:
              sessionRuntime.snapshot.conversationId ||
              nextOpaqueId("acp-chat"),
            scopeKind: "acp-chat",
          });
        await materializeAcpChatInjectedSkills({
          sessionRuntime,
          backends: configuredBackends,
          workspaceDir,
        });
        return { backend: currentBackend, hostBridgeCliInjection };
      },
    );
    backend = preparedWorkspace.backend;
    sessionRuntime.snapshot.backend = backend;
    const hostBridgeCliInjection = preparedWorkspace.hostBridgeCliInjection;
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
  const backend =
    sessionRuntime.snapshot.backend ||
    cachedAcpBackends.find((entry) => entry.id === sessionRuntime.backendId);
  applyResolvedRuntimeOptionsState(
    sessionRuntime,
    resolveAcpRuntimeOptionsState({
      configOptions: Array.isArray(result.configOptions)
        ? result.configOptions
        : null,
      modes: result.modes || null,
      models: result.models || null,
      cache: mergeRuntimeOptionsCache(
        snapshotRuntimeOptionsCache(
          sessionRuntime.snapshot,
          sessionRuntime.reasoningSource,
        ),
        backend?.acp?.runtimeOptionsCache,
      ),
    }),
  );
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

export function subscribeAcpChatWorkspaceChanges(
  listener: AcpChatWorkspaceListener,
) {
  acpChatWorkspaceListeners.add(listener);
  return () => {
    acpChatWorkspaceListeners.delete(listener);
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

export async function setActiveAcpBackend(args: { backendId: string }) {
  ensureInitialized();
  const backendId = normalizeBackendId(args.backendId);
  if (!backendId) return;
  const backend = await requireAvailableAcpBackend(
    backendId,
    backendId === activeBackendId ? "if-missing" : "always",
  );
  const indexedConversationId = normalizeConversationId(
    loadAcpChatSessionIndex(backendId).activeConversationId,
  );
  const visibleConversationIds = new Set(
    listAcpChatSessions(backendId).map((entry) =>
      normalizeConversationId(entry.conversationId),
    ),
  );
  const selectableConversationId = visibleConversationIds.has(
    indexedConversationId,
  )
    ? indexedConversationId
    : "";
  if (
    backendId === activeBackendId &&
    selectableConversationId &&
    selectableConversationId ===
      normalizeConversationId(resolveActiveConversationId(backendId))
  ) {
    return;
  }
  const sessionRuntime = selectableConversationId
    ? getOrCreateSessionRuntime(backendId, selectableConversationId)
    : prepareLocalAcpConversationPlaceholder({ backendId, backend });
  sessionRuntime.snapshot.backend = backend;
  applyRuntimeOptionsCache(sessionRuntime, backend);
  activeBackendId = backendId;
  activeConversationId = sessionRuntime.snapshot.conversationId;
  saveAcpFrontendState({ activeBackendId });
  emitSessionRuntimeSnapshot(sessionRuntime, { notifyUi: false });
  saveActiveAcpConversationSelection(backendId, activeConversationId);
  pruneIdleBackgroundTranscriptMirrors();
  notifyAcpChatWorkspaceListeners(
    buildAcpChatWorkspaceChange(sessionRuntime, [
      "active-scope",
      "backend",
      "session-list",
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

function prepareLocalAcpConversationPlaceholder(args: {
  backendId: string;
  backend?: BackendInstance | null;
}) {
  const existingConversationId = findPlaceholderAcpConversationId(
    args.backendId,
  );
  if (existingConversationId) {
    const existingRuntime = getOrCreateSessionRuntime(
      args.backendId,
      existingConversationId,
    );
    if (args.backend) {
      existingRuntime.snapshot.backend = args.backend;
      applyRuntimeOptionsCache(existingRuntime, args.backend);
    }
    return existingRuntime;
  }

  const seedSessionRuntime = getOrCreateSessionRuntime(args.backendId);
  const snapshot = createNewLocalConversationSnapshot({
    sessionRuntime: seedSessionRuntime,
    backend:
      args.backend ||
      cachedAcpBackends.find((entry) => entry.id === args.backendId) ||
      seedSessionRuntime.snapshot.backend,
    backendId: args.backendId,
  });
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId,
    snapshot.conversationId,
  );
  sessionRuntime.snapshot = snapshot;
  rekeySessionRuntime(sessionRuntime);
  sessionRuntime.snapshot.messageCounts = restoreAcpExecutionProgress(
    acpChatExecutionProgressScope(sessionRuntime),
    sessionRuntime.snapshot.messageCounts,
    { missingCompleteness: "complete" },
  );
  if (snapshot.backend) {
    applyRuntimeOptionsCache(sessionRuntime, snapshot.backend);
  }
  resetSessionRuntimeTransientState(sessionRuntime);
  return sessionRuntime;
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
    notifyAcpChatWorkspaceListeners(
      buildAcpChatWorkspaceChange(sessionRuntime, ["active-scope"]),
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
  notifyAcpChatWorkspaceListeners(
    buildAcpChatWorkspaceChange(sessionRuntime, ["active-scope"]),
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
    notifyAcpChatWorkspaceListeners(
      Object.freeze({
        active: false,
        global: true,
        kinds: Object.freeze(["backend"] as const),
      }),
    );
    return;
  }
  const sessionRuntime = getOrCreateSessionRuntime(activeBackendId);
  notifyAcpChatWorkspaceListeners(
    buildAcpChatWorkspaceChange(sessionRuntime, ["backend"], {
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
    notifyAcpChatWorkspaceListeners(
      buildAcpChatWorkspaceChange(sessionRuntime, ["permission"]),
    );
    return;
  }
  sessionRuntime.snapshot.autoApproveAcpPermissions = enabled;
  sessionRuntime.snapshot.updatedAt = nowIso();
  persistSessionRuntimeSnapshotNow(sessionRuntime);
  notifyAcpChatWorkspaceListeners(
    buildAcpChatWorkspaceChange(sessionRuntime, ["permission"]),
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
  await releaseAcpChatDiagnosticAudit(
    acpChatDiagnosticOwnerForRuntime(sessionRuntime),
  );
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
  const promptMessage = shouldInjectStartupPreamble
    ? prependAcpStartupPromptPreamble({
        message,
        preamble: await buildAcpStartupPromptPreamble({
          surface: "acp-chat",
          workspaceDir:
            sessionRuntime.snapshot.agentWorkspaceDir ||
            sessionRuntime.snapshot.sessionCwd ||
            sessionRuntime.snapshot.workspaceDir,
          instructionFile: "AGENTS.md",
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
  sessionRuntime.silentTerminalAssistantCollector.reset();
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
  cancelSessionRuntimePermissionRequests(sessionRuntime);
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
    const pendingPermission = sessionRuntime.permissionQueue.active();
    sessionRuntime.snapshot.busy = !!pendingPermission;
    sessionRuntime.snapshot.status = pendingPermission
      ? "permission-required"
      : "connected";
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
      const candidate = sessionRuntime.silentTerminalAssistantCollector.take();
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
      sessionRuntime.silentTerminalAssistantCollector.discard();
      finalizeStreamingItems(sessionRuntime, "complete", "skipped");
    }
    emitSessionRuntimeSnapshot(sessionRuntime, {
      uiReason: "critical",
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
    cancelSessionRuntimePermissionRequests(sessionRuntime);
    sessionRuntime.snapshot.busy = false;
    if (interruptionRequested) {
      sessionRuntime.snapshot.promptInterruptState = "unconfirmed";
    }
    finishAcpExecutionProgress(acpChatExecutionProgressScope(sessionRuntime));
    sessionRuntime.snapshot.messageCounts = snapshotAcpMessageCounts(
      acpChatExecutionProgressScope(sessionRuntime),
    );
    if (isAssistantSilentExecutionMode()) {
      const candidate = sessionRuntime.silentTerminalAssistantCollector.take();
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
      sessionRuntime.silentTerminalAssistantCollector.discard();
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
  cancelSessionRuntimePermissionRequests(sessionRuntime);
  sessionRuntime.snapshot.status = "prompting";
  sessionRuntime.snapshot.busy = true;
  sessionRuntime.snapshot.promptInterruptState = "requested";
  emitSessionRuntimeSnapshot(sessionRuntime, {
    uiReason: "critical",
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
  const backend =
    cachedAcpBackends.find((entry) => entry.id === backendId) || null;
  const sessionRuntime = prepareLocalAcpConversationPlaceholder({
    backendId,
    backend,
  });
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
  notifyAcpChatWorkspaceListeners(
    buildAcpChatWorkspaceChange(
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
  await releaseAcpChatDiagnosticAudit(
    acpChatDiagnosticOwnerForRuntime(sessionRuntime),
  );
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
    notifyAcpChatWorkspaceListeners(
      buildAcpChatWorkspaceChange(sessionRuntime, ["session-list"]),
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
    notifyAcpChatWorkspaceListeners(
      buildAcpChatWorkspaceChange(nextSessionRuntime, [
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
  notifyAcpChatWorkspaceListeners(
    buildAcpChatWorkspaceChange(emptySessionRuntime, [
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
  await discardAcpChatDiagnosticAudit(
    acpChatDiagnosticAuditOwnerKey(backendId, deletedConversationId),
  );
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
    notifyAcpChatWorkspaceListeners(
      buildAcpChatWorkspaceChange(nextSessionRuntime, [
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
  notifyAcpChatWorkspaceListeners(
    buildAcpChatWorkspaceChange(emptySessionRuntime, [
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
  permissionRequestId?: string;
  optionId?: string;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const sessionRuntime = getOrCreateSessionRuntime(
    args.backendId || activeBackendId,
    args.conversationId,
  );
  const active = sessionRuntime.permissionQueue.active();
  if (!active) {
    return false;
  }
  const optionId =
    String(args.optionId || "").trim() || active.options[0]?.optionId || "";
  const resolved = sessionRuntime.permissionQueue.resolveActive(
    args.permissionRequestId,
    args.outcome === "selected" && optionId
      ? { outcome: "selected", optionId }
      : { outcome: "cancelled" },
  );
  if (!resolved) {
    return false;
  }
  syncSessionRuntimePermissionHead(sessionRuntime);
  if (!sessionRuntime.snapshot.pendingPermissionRequest) {
    sessionRuntime.snapshot.status = "prompting";
  }
  sessionRuntime.snapshot.busy = true;
  emitSessionRuntimeSnapshot(sessionRuntime, {
    changeKinds: ["permission"],
  });
  return true;
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
  const rawModelId = resolveAcpRawModelIdForSelection({
    modelOptions: sessionRuntime.snapshot.modelOptions,
    displayModelId: modelId,
    effortId: sessionRuntime.snapshot.currentReasoningEffort?.id,
    currentRawModelId: sessionRuntime.snapshot.currentModel?.id,
  });
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
  applyResolvedRuntimeOptionsState(
    sessionRuntime,
    resolveAcpRuntimeOptionsState({
      cache: snapshotRuntimeOptionsCache(
        sessionRuntime.snapshot,
        sessionRuntime.reasoningSource,
      ),
      overrides: {
        rawModelId,
        displayModelId: modelId,
        reasoningEffortId:
          sessionRuntime.snapshot.currentReasoningEffort?.id || "",
      },
    }),
  );
  emitSessionRuntimeSnapshot(sessionRuntime);
}

export async function setAcpConversationReasoningEffort(args: {
  effortId: string;
  backendId?: string;
  conversationId?: string;
}) {
  ensureInitialized();
  const effortId = normalizeAcpEffortId(args.effortId);
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
  const rawModelId = displayModelId
    ? resolveAcpRawModelIdForSelection({
        modelOptions: sessionRuntime.snapshot.modelOptions,
        displayModelId,
        effortId,
        currentRawModelId: sessionRuntime.snapshot.currentModel?.id,
      })
    : "";
  const result = await applyAcpReasoningEffortWithFallback({
    adapter,
    backend: sessionRuntime.snapshot.backend || undefined,
    sessionId: sessionRuntime.snapshot.sessionId,
    effortId,
  });
  if (result.kind === "applied") {
    applyResolvedRuntimeOptionsState(
      sessionRuntime,
      resolveAcpRuntimeOptionsState({
        cache: snapshotRuntimeOptionsCache(
          sessionRuntime.snapshot,
          sessionRuntime.reasoningSource,
        ),
        overrides: { reasoningEffortId: effortId },
      }),
    );
  } else if (result.kind === "unavailable" && rawModelId) {
    await adapter.setModel({
      sessionId: sessionRuntime.snapshot.sessionId,
      modelId: rawModelId,
    });
    applyResolvedRuntimeOptionsState(
      sessionRuntime,
      resolveAcpRuntimeOptionsState({
        cache: snapshotRuntimeOptionsCache(
          sessionRuntime.snapshot,
          sessionRuntime.reasoningSource,
        ),
        overrides: {
          rawModelId,
          displayModelId,
          reasoningEffortId: effortId,
        },
      }),
    );
  } else if (result.kind === "fallback") {
    appendDiagnostic(sessionRuntime, {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: "reasoning_effort_fallback",
      level: "warn",
      message:
        "Kilo rejected the reasoning effort; retaining the model default.",
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
  const teardownByBackend = new Map<string, Promise<unknown>[]>();
  for (const [key, sessionRuntime] of Array.from(sessionRuntimes.entries())) {
    if (
      remainingAcpIds.has(sessionRuntime.backendId) ||
      sessionRuntime.backendId === protectedSyntheticBackendId
    ) {
      continue;
    }
    const teardown = discardAcpChatDiagnosticAudit(
      acpChatDiagnosticOwnerForRuntime(sessionRuntime),
    ).then(() => disconnectSessionRuntimeAdapter(sessionRuntime));
    const backendTeardowns =
      teardownByBackend.get(sessionRuntime.backendId) || [];
    backendTeardowns.push(teardown);
    teardownByBackend.set(sessionRuntime.backendId, backendTeardowns);
    sessionRuntimes.delete(key);
  }
  for (const [backendId, teardowns] of teardownByBackend) {
    void Promise.allSettled(teardowns).then(() => {
      clearAcpConversationState(backendId);
    });
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
  notifyAcpChatWorkspaceListeners(
    Object.freeze({
      active: true,
      global: true,
      kinds: Object.freeze(["backend"] as const),
    }),
  );
}

export async function shutdownAcpSessionManager() {
  const pending: Promise<unknown>[] = [];
  for (const sessionRuntime of sessionRuntimes.values()) {
    if (sessionRuntime.workspaceChangeTimer) {
      clearTimeout(sessionRuntime.workspaceChangeTimer);
      sessionRuntime.workspaceChangeTimer = null;
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
  await releaseAcpChatDiagnosticAudit();
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
  acpChatWorkspaceListeners.clear();
  cachedAcpBackends = [];
  activeBackendId = "";
  activeConversationId = "";
  activeSyntheticAcpChatReplayActivation = undefined;
  acpChatWorkspacePreparationTail = Promise.resolve();
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
  cancelSessionRuntimePermissionRequests(sessionRuntime);
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
    notifyAcpChatWorkspaceListeners(
      buildAcpChatWorkspaceChange(sessionRuntime, ["active-scope"]),
    );
    return;
  }
  notifyAcpChatWorkspaceListeners(
    Object.freeze({
      active: true,
      global: true,
      kinds: Object.freeze(["active-scope"] as const),
    }),
  );
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
  await discardAcpChatDiagnosticAudit(
    acpChatDiagnosticAuditOwnerKey(args.backendId, args.conversationId),
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
    sessionRuntime.silentTerminalAssistantCollector.discard();
    sessionRuntime.permissionQueue.cancelAll();
    if (sessionRuntime.workspaceChangeTimer) {
      clearTimeout(sessionRuntime.workspaceChangeTimer);
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
  discardAllAcpChatDiagnosticAuditsForTests();
  sessionRuntimes.clear();
  coldAcpChatTranscriptMirrorLru.clear();
  acpChatWorkspaceListeners.clear();
  cachedAcpBackends = [];
  activeBackendId = "";
  activeConversationId = "";
  activeSyntheticAcpChatReplayActivation = undefined;
  syntheticAcpChatReplayActivationNonce = 0;
  acpChatWorkspacePreparationTail = Promise.resolve();
  initialized = false;
  acpChatPromptInterruptGraceMs = DEFAULT_ACP_CHAT_PROMPT_INTERRUPT_GRACE_MS;
}

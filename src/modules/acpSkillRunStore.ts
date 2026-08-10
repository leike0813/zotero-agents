import {
  ACP_SKILL_RUN_REQUEST_KIND,
  ACP_BACKEND_TYPE,
} from "../config/defaults";
import {
  clearPluginRunStore,
  deletePluginRunStoreEntry,
} from "./pluginStateStore";
import {
  registerAcpSkillRunsMemoryClearer,
  registerAcpSkillRunsRetentionCleaner,
} from "./runtimePersistence";
import { appendRuntimeLog } from "./runtimeLogManager";
import { isAssistantSilentExecutionMode } from "./assistantExecutionDisplayPolicy";
import {
  finishAcpExecutionProgress,
  releaseAcpExecutionProgress,
  resetAcpExecutionProgress,
  snapshotAcpMessageCounts,
} from "./acpExecutionProgress";
import { type AssistantMessageCountsSnapshot } from "./assistantMessageCounts";
import { isDebugModeEnabled } from "./debugMode";
import { finishAcpRuntimeProfile } from "./acpRuntimePerformanceProfiler";
import { recordAcpRuntimeSemanticTraceRequestTerminal } from "./acpRuntimeSemanticTraceRecorder";
import type {
  AcpSessionConfigCategory,
  RequestPermissionOutcome,
} from "./acpProtocol";
import type {
  AcpPendingPermissionRequest,
  AcpPromptInterruptState,
} from "./acpTypes";
import { normalizeAcpPromptInterruptState } from "./acpTypes";
import { AcpPermissionQueue } from "./acpPermissionQueue";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import { waitForPromiseSettlement } from "../utils/wait";
import { updateWorkflowTaskStateByRequest } from "./taskRuntime";
import {
  getSequenceRunStateByStepRequest,
  getSequenceStepIndexByRequestId,
  recordSequenceStepTerminal,
} from "./workflowExecution/sequenceStateStore";
import type { HostBridgePluginSkillBundleIdentity } from "../shared/hostBridgePluginSkillBundleContract";
import { getCurrentHostBridgePluginSkillBundleIdentity } from "./hostBridgePluginSkillBundle";
import {
  parseAcpEffortFromModelText,
  resolveAcpRawModelIdForSelection,
  type AcpSelectableOption,
} from "./acpModelOptionFolding";
import type { AcpReasoningSource } from "./acpSessionConfigOptions";
import type { AcpSkillRunAuditTrailState } from "./acpSkillRunAuditTrail";
import { resetAcpTranscriptWritesForTests } from "./acpSkillRunTranscriptStore";
import {
  appendAcpSkillRunOutputRevision,
  resolveAcpSkillRunPayloadPaths,
} from "./acpSkillRunPayloadStore";
import {
  registerAcpSkillRunPermissionRequestHandler,
  type AcpSkillRunPermissionRequestWithResolver,
} from "./acpSkillRunPermissionFacade";
import {
  registerAcpSkillRunAutoApprovalResolver,
  revokeHostBridgeWriteAutoApprovalGrantsForRun,
} from "./hostBridgeWriteAutoApprovalRegistry";
import { type AssistantWorkspaceTranscriptMutationEvent } from "./assistantWorkspaceTranscriptPublication";
import {
  clearAcpSkillRunTranscriptMirrorLru,
  cloneAcpSkillRunTranscriptItem,
  completeAcpSkillRunOpenStreamingTextItems,
  configureAcpSkillRunTranscriptMirrorHost,
  forgetColdAcpSkillRunTranscriptMirror,
  getAcpSkillRunTranscriptMirrorCacheDiagnostics,
  hydrateAcpSkillRunTranscriptMirror,
  nextAcpSkillRunTranscriptItemId,
  pruneInactiveAcpSkillRunTranscriptMirrors,
  queueAcpSkillRunTranscriptEvent,
  type AcpSkillRunTranscriptLiveState,
} from "./acpSkillRunTranscriptMirror";
import {
  cleanupExpiredAcpSkillRunsForRetention,
  cloneRuntimeCatalog,
  configureAcpSkillRunPersistenceHost,
  deriveAcpSkillRunRuntimeFileMetadata,
  ensureAcpSkillRunStoreHydrated,
  flushAcpSkillRunRuntimeFileWrites,
  invalidateAcpSkillRunPersistenceHydration,
  normalizeOptionalNonNegativeInteger,
  normalizeSelectableOptions,
  parsePendingInteraction,
  persistRun,
  resetAcpSkillRunPersistenceForTests,
  scheduleSoftRunPersist,
  trackAcpSkillRunRuntimeFileWrite,
  truncateAcpSkillRunPreview,
  updateTouchesAcpSkillRunContext,
} from "./acpSkillRunPersistence";
import {
  acpSkillRunWorkspaceChange,
  configureAcpSkillRunWorkspaceDataPlaneHost,
  createAcpSkillRunWorkspaceChange,
  emitWorkspaceChanged,
  listAcpSkillRunSummaries,
  resetAcpSkillRunSummaryDiagnosticsForTests,
  resetAcpSkillRunWorkspaceDataPlaneForTests,
  scheduleWorkspaceChangedEmit,
} from "./acpSkillRunWorkspaceDataPlane";

export {
  appendAcpSkillRunHardTimeoutTranscriptNotice,
  completeAcpSkillRunTranscriptTurnBoundary,
  hydrateAcpSkillRunTranscriptMirror,
  readAcpSkillRunTranscriptRegion,
  readAcpSkillRunTranscriptRegionFromMemoryForTests,
  recordAcpSkillRunSessionUpdate,
} from "./acpSkillRunTranscriptMirror";
export type { AcpSkillRunTranscriptPageRequest } from "./acpSkillRunTranscriptMirror";
export {
  cleanupExpiredAcpSkillRunsForRetention,
  flushAcpSkillRunRuntimeFileWrites,
  flushAcpSkillRunRuntimeFileWritesForTests,
  reconcileAcpSkillRunWorkflowTasksOnStartup,
} from "./acpSkillRunPersistence";
export {
  countActiveAcpSkillRunSummaries,
  getAcpSkillRunDiagnostics,
  getAcpSkillRunSummaryDiagnosticsForTests,
  getAcpSkillRunTranscriptMirrorDiagnosticsForTests,
  getAcpSkillRunWorkspaceDetailsReadModel,
  getAcpSkillRunWorkspaceReadModel,
  inspectSyntheticAcpSkillRunReplayTimers,
  listAcpSkillRuns,
  listAcpSkillRunSummaries,
  resetAcpSkillRunSummaryDiagnosticsForTests,
  subscribeAcpSkillRunWorkspaceChanges,
} from "./acpSkillRunWorkspaceDataPlane";

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
  submissionId?: string;
  submissionUnitId?: string;
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
  acpModelProvider?: string;
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
  outputRevisionCount?: number;
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
  hostBridgePluginSkillBundleIdentity?: HostBridgePluginSkillBundleIdentity;
  activePrompt?: boolean;
  promptInterruptState?: AcpPromptInterruptState;
  pendingPermission?: AcpPendingPermissionRequest | null;
  resultJson?: unknown;
  transcriptItems?: AcpSkillRunTranscriptItem[];
  outputRevisionsPath?: string;
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
  messageCounts?: AssistantMessageCountsSnapshot;
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
  | "submissionId"
  | "submissionUnitId"
  | "sequenceStepId"
  | "sequenceStepIndex"
  | "sequenceFinalStepId"
  | "taskName"
  | "skillName"
  | "skillLabel"
  | "skillId"
  | "executionMode"
  | "workspaceDir"
  | "acpModeId"
  | "acpModelId"
  | "acpModelProvider"
  | "acpReasoningEffort"
  | "agentFamily"
  | "conversationState"
  | "conversationRecoveryState"
  | "conversationError"
  | "replyState"
  | "connectionActionState"
  | "applyResultState"
  | "appliedAt"
  | "sessionId"
  | "outputConvergenceState"
  | "pendingInteraction"
  | "pendingPermission"
  | "activePrompt"
  | "promptInterruptState"
  | "transcriptRevision"
  | "transcriptEventSeq"
  | "transcriptItemCount"
  | "transcriptPreview"
  | "error"
  | "removedAt"
  | "archivedAt"
  | "createdAt"
  | "updatedAt"
> & {
  sequenceRole?: "single" | "sequence_step";
};

export type AcpSkillRunSummaryListOptions = {
  activeOnly?: boolean;
  backendId?: string;
  requestId?: string;
  includeArchived?: boolean;
  limit?: number;
};

export type AcpSkillRunRuntimeCatalog = {
  modeOptions: AcpSelectableOption[];
  modelOptions: AcpSelectableOption[];
  displayModelOptions: AcpSelectableOption[];
  reasoningEffortOptions: AcpSelectableOption[];
  reasoningSource: AcpReasoningSource;
};

export type AcpSkillRunWorkspaceChangeKind =
  | "run"
  | "transcript"
  | "plan"
  | "progress"
  | "runtime-options"
  | "selection"
  | "archive"
  | "global";

export type AcpSkillRunWorkspaceChange = Readonly<{
  requestIds?: readonly string[];
  kinds?: readonly AcpSkillRunWorkspaceChangeKind[];
  global?: boolean;
  transcriptEvents?: readonly AssistantWorkspaceTranscriptMutationEvent[];
  transcriptEventSeq?: number;
  transcriptItemCount?: number;
}>;

export type AcpSkillRunWorkspaceReadModel = Readonly<{
  requestId: string;
  status: AcpSkillRunStatus;
  backendStatus?: AcpSkillRunStatus;
  backendId: string;
  backendLabel?: string;
  workflowId?: string;
  workflowLabel?: string;
  submissionId?: string;
  submissionUnitId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  taskName?: string;
  skillName?: string;
  skillId?: string;
  workspaceDir?: string;
  runtimeDir?: string;
  sessionId?: string;
  acpModeId?: string;
  acpModelId?: string;
  acpModelProvider?: string;
  acpRawModelId?: string;
  acpReasoningEffort?: string;
  activePrompt: boolean;
  pendingPermission: AcpPendingPermissionRequest | null;
  pendingInteraction?: AcpSkillRunPendingInteraction;
  conversationState?: AcpSkillRunConversationState;
  conversationRecoveryState?: AcpSkillRunRecoveryState;
  conversationError?: string;
  replyState?: AcpSkillRunReplyState;
  connectionActionState?: AcpSkillRunConnectionActionState;
  promptInterruptState?: AcpPromptInterruptState;
  applyResultState?: "pending" | "succeeded" | "failed";
  error?: string;
  usage?: { used: number; size: number };
  planEntries: AcpSkillRunPlanEntry[];
  updatedAt: string;
  runtimeOptions: AcpSkillRunRuntimeCatalog;
}>;

export type AcpSkillRunWorkspaceDetailsReadModel = Readonly<{
  requestId: string;
  workspaceDir: string;
  runtimeDir: string;
  inputManifestPath: string;
  resultJsonPath: string;
  backend: string;
  agentFamily: string;
  acpModeId: string;
  acpModelId: string;
  acpRawModelId: string;
  acpReasoningEffort: string;
  skillId: string;
  skillRoots: string[];
  sessionId: string;
  validationStatus: string;
  repairRounds: number;
  validationErrors: string[];
  error: string;
  conversationError: string;
  conversationState: string;
  applyResultState: string;
  appliedAt: string;
  runtimeDependencyStatus: string;
  runtimeDependencies: string[];
  runtimeDependencyError: string;
  outputRevisions: AcpSkillRunOutputRevision[];
  runtimeLogs: AcpSkillRunEvent[];
  resultJsonText: string;
}>;

export type AcpSkillRunDiagnosticsDto = Readonly<{
  requestId: string;
  status: string;
  backendId: string;
  workflowId: string | null;
  skillId: string | null;
  workspaceDir: string | null;
  runtimeDir: string | null;
  sessionId: string | null;
  error: string | null;
  updatedAt: string;
}>;

type AcpSkillRunController = {
  cancel: () => Promise<void>;
  interruptTurn?: () => Promise<void>;
  reply?: (message: string) => Promise<void>;
  replyRequest?: (request: AcpSkillRunReplyRequest) => Promise<void>;
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

export type AcpSkillRunControllerPurpose =
  | "workflow"
  | "post-terminal-conversation";

export type AcpSkillRunSetupController = {
  cancel: () => Promise<void>;
};

export type AcpSkillRunReplyRequest = {
  displayMessage: string;
  promptMessage: string;
};

export type AcpSkillRunWorkspaceListener = (
  change?: AcpSkillRunWorkspaceChange,
) => void;
type AcpSkillRunRecoveryHandler = (args: {
  requestId: string;
  reason: "connect" | "reply";
}) => Promise<void>;

const ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS = 2_000;
const ACP_SKILL_RUN_SHUTDOWN_FLUSH_TIMEOUT_MS = 750;

const runRecords = new Map<string, AcpSkillRunRecord>();
const transcriptLiveStates = new Map<string, AcpSkillRunTranscriptLiveState>();
const controllers = new Map<string, AcpSkillRunController>();
const controllerPurposes = new Map<string, AcpSkillRunControllerPurpose>();
const applyResultControllerDetachPromises = new Map<string, Promise<void>>();
const waitingUserDetachTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
const runtimeCatalogByRequestId = new Map<string, AcpSkillRunRuntimeCatalog>();
const setupControllers = new Map<string, AcpSkillRunSetupController>();
const permissionQueuesByRunRequestId = new Map<string, AcpPermissionQueue>();

configureAcpSkillRunTranscriptMirrorHost({
  ensureHydrated: () => ensureAcpSkillRunStoreHydrated(),
  resolveRunRecord: (requestId) => runRecords.get(requestId),
  getTranscriptLiveState: (record) => getAcpSkillRunTranscriptLiveState(record),
  peekTranscriptLiveState: (requestId) => transcriptLiveStates.get(requestId),
  listTranscriptLiveStates: () => transcriptLiveStates.entries(),
  getSelectedRequestId: () => selectedRequestId,
  isLifecycleOpen: (record) => isAcpSkillRunLifecycleOpen(record),
  setAcpSkillRunRecord: (record) => setAcpSkillRunRecord(record),
  persistRun: (record) => persistRun(record),
  scheduleSoftRunPersist: (record) => scheduleSoftRunPersist(record),
  emitWorkspaceChanged: (change) => emitWorkspaceChanged(change),
  scheduleWorkspaceChangedEmit: (change) =>
    scheduleWorkspaceChangedEmit(change),
  acpSkillRunWorkspaceChange: (requestId, kinds) =>
    acpSkillRunWorkspaceChange(requestId, kinds),
});

configureAcpSkillRunPersistenceHost({
  listRunRecords: () => runRecords.values(),
  resolveRunRecord: (requestId) => runRecords.get(requestId),
  setAcpSkillRunRecord: (record) => setAcpSkillRunRecord(record),
  upsertAcpSkillRun: (update) => {
    upsertAcpSkillRun(update);
  },
  deleteRunRecord: (requestId) => {
    deleteAcpSkillRunRecord(requestId);
  },
  isEligibleForPostTerminalConversation: (record) =>
    isEligibleForPostTerminalAcpSkillRunConversation(record),
  getSelectedRequestId: () => selectedRequestId,
  clearSelectedRequestId: () => {
    selectedRequestId = "";
  },
  peekTranscriptLiveState: (requestId) => transcriptLiveStates.get(requestId),
  acpSkillRunWorkspaceChange: (requestId, kinds) =>
    acpSkillRunWorkspaceChange(requestId, kinds),
  createWorkspaceChange: (change) => createAcpSkillRunWorkspaceChange(change),
  emitWorkspaceChanged: (change) => emitWorkspaceChanged(change),
});

configureAcpSkillRunWorkspaceDataPlaneHost({
  resolveRunRecord: (requestId) => runRecords.get(requestId),
  listRunRecords: () => runRecords.values(),
  listActiveRunRequestIds: () => activeRunRequestIds.values(),
  isActiveRecordForSummary: (record) =>
    isActiveAcpSkillRunRecordForSummary(record),
  projectRunRecordMetadata: (record) =>
    projectAcpSkillRunMetadataRecord(record),
  getTranscriptLiveState: (record) => getAcpSkillRunTranscriptLiveState(record),
  peekTranscriptLiveState: (requestId) => transcriptLiveStates.get(requestId),
  runtimeCatalogForRun: (run) => runtimeCatalogForRun(run),
});

async function waitForAcpSkillRunShutdownTask(
  task: Promise<unknown>,
  timeoutMs = ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS,
) {
  if (timeoutMs <= 0) {
    return { timedOut: true as const };
  }
  const result = await waitForPromiseSettlement(task, {
    phase: "acp-skill-run-cleanup",
    timeoutMs,
  });
  if (result.status === "timed-out") {
    return { timedOut: true as const };
  }
  if (result.status === "rejected") {
    return { timedOut: false as const, error: result.error };
  }
  return { timedOut: false as const };
}
let selectedRequestId = "";
let recoveryHandler: AcpSkillRunRecoveryHandler | null = null;
const activeRunRequestIds = new Set<string>();
const ACP_SKILL_RUN_WAITING_USER_LIVE_TTL_MS = 30 * 60 * 1000;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown");
}

function getAcpSkillRunTranscriptLiveState(record: AcpSkillRunRecord) {
  const requestId = record.requestId;
  let state = transcriptLiveStates.get(requestId);
  if (!state) {
    state = {
      requestId,
      transcriptItemCount: Math.max(0, record.transcriptItemCount || 0),
      transcriptEventSeq: Math.max(0, record.transcriptEventSeq || 0),
      transcriptItemsById: new Map(),
      transcriptItemIds: [],
      transcriptMirrorLoaded: false,
      permissionItemIds: new Map(),
      toolItemIds: new Map(),
      toolItems: new Map(),
      workspaceTranscriptEvents: [],
    };
    transcriptLiveStates.set(requestId, state);
  }
  return state;
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

type PostTerminalConversationEligibilityRecord = Pick<
  AcpSkillRunRecord,
  | "status"
  | "sessionId"
  | "removedAt"
  | "archivedAt"
  | "conversationState"
  | "conversationRecoveryState"
  | "pendingInteraction"
  | "pendingPermission"
  | "applyResultState"
  | "outputConvergenceState"
>;

export function isEligibleForPostTerminalAcpSkillRunConversation(
  record: PostTerminalConversationEligibilityRecord | null | undefined,
) {
  if (
    !record ||
    (record.status !== "succeeded" && record.status !== "failed")
  ) {
    return false;
  }
  if (
    record.removedAt ||
    record.archivedAt ||
    !normalizeString(record.sessionId) ||
    record.conversationState === "ended" ||
    record.conversationRecoveryState === "unavailable" ||
    record.conversationRecoveryState === "unsupported" ||
    record.pendingInteraction ||
    record.pendingPermission ||
    record.applyResultState === "pending" ||
    record.outputConvergenceState === "pending"
  ) {
    return false;
  }
  return (
    record.status === "failed" ||
    record.applyResultState === "succeeded" ||
    typeof record.applyResultState === "undefined"
  );
}

export function isPostTerminalAcpSkillRunConversationConnected(
  requestIdRaw: string,
) {
  const requestId = normalizeString(requestIdRaw);
  return (
    !!requestId &&
    controllers.has(requestId) &&
    controllerPurposes.get(requestId) === "post-terminal-conversation"
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

function propagateAcpSkillRunTerminalState(record: AcpSkillRunRecord) {
  if (record.status !== "failed" && record.status !== "canceled") {
    return;
  }
  const sequence = getSequenceRunStateByStepRequest(record.requestId);
  if (!sequence) {
    return;
  }
  const stepIndex = getSequenceStepIndexByRequestId(sequence, record.requestId);
  if (stepIndex < 0) {
    return;
  }
  recordSequenceStepTerminal({
    sequenceRunId: sequence.sequenceRunId,
    stepIndex,
    requestId: record.requestId,
    status: record.status,
    error: record.error,
  });
  if (sequence.rootRequestId) {
    updateWorkflowTaskStateByRequest({
      backendId: record.backendId,
      backendType: record.backendType,
      requestId: sequence.rootRequestId,
      state: record.status,
      backendStatus: record.status,
      error: record.error,
    });
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
  if (
    (next.status === "failed" || next.status === "canceled") &&
    previous?.status !== next.status
  ) {
    propagateAcpSkillRunTerminalState(next);
  }
  if (isTerminalAcpSkillRunStatus(next.status)) {
    setupControllers.delete(record.requestId);
  }
  syncAcpSkillRunActiveIndex(next);
  if (!isActiveAcpSkillRunRecordForSummary(next)) {
    revokeHostBridgeWriteAutoApprovalGrantsForRun(next.requestId);
  }
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

function deleteAcpSkillRunRecord(requestId: string) {
  const removed = runRecords.delete(requestId);
  transcriptLiveStates.delete(requestId);
  releaseAcpExecutionProgress(requestId);
  forgetColdAcpSkillRunTranscriptMirror(requestId);
  activeRunRequestIds.delete(requestId);
  clearWaitingUserDetachTimer(requestId);
  return removed;
}

function clearAcpSkillRunRecords() {
  for (const requestId of runRecords.keys()) {
    releaseAcpExecutionProgress(requestId);
  }
  runRecords.clear();
  transcriptLiveStates.clear();
  clearAcpSkillRunTranscriptMirrorLru();
  activeRunRequestIds.clear();
  for (const timer of waitingUserDetachTimers.values()) {
    clearTimeout(timer);
  }
  waitingUserDetachTimers.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toolEventTime(item: { updatedAt?: string; createdAt?: string }) {
  const parsed = Date.parse(item.updatedAt || item.createdAt || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

const ACP_SKILL_RUN_TRANSCRIPT_EVENT_STAGES = new Set([
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
  "interrupt-requested",
  "interrupt-confirmed",
  "interrupt-forced",
  "interrupt-unconfirmed",
]);

const ACP_SKILL_RUN_SILENT_CRITICAL_STAGES = new Set([
  "permission-requested",
  "permission-resolved",
  "conversation-ended",
  "conversation-closed",
  "conversation-error",
  "reply-unavailable",
  "waiting-user",
  "waiting-auth",
  "auth-required",
  "apply-succeeded",
  "apply-failed",
  "succeeded",
  "failed",
  "canceled",
  "cancel-requested",
  "interrupt-requested",
  "interrupt-confirmed",
  "interrupt-forced",
  "interrupt-unconfirmed",
]);

function shouldShowEventInTranscript(stage: string) {
  const normalized = normalizeString(stage);
  return (
    ACP_SKILL_RUN_TRANSCRIPT_EVENT_STAGES.has(normalized) &&
    (!isAssistantSilentExecutionMode() ||
      ACP_SKILL_RUN_SILENT_CRITICAL_STAGES.has(normalized))
  );
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
    previousId || nextAcpSkillRunTranscriptItemId(record, "permission", state);
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
  queueAcpSkillRunTranscriptEvent(record, {
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
    queueAcpSkillRunTranscriptEvent(record, {
      op: "patch_item",
      itemId: last.id,
      patch: { updatedAt: event.ts },
      createdAt: event.ts,
    });
    return true;
  }
  const item: AcpSkillRunTranscriptItem = {
    id: nextAcpSkillRunTranscriptItemId(record, "status", state),
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
  queueAcpSkillRunTranscriptEvent(record, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: event.ts,
    newItem: true,
  });
  return true;
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
  persistMode?: "immediate" | "trailing";
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
  submissionId?: string;
  submissionUnitId?: string;
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
  acpModelProvider?: string;
  acpReasoningEffort?: string | null;
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
  hostBridgePluginSkillBundleIdentity?: HostBridgePluginSkillBundleIdentity;
  activePrompt?: boolean;
  promptInterruptState?: AcpPromptInterruptState;
  pendingPermission?: AcpPendingPermissionRequest | null;
  resultJson?: unknown;
  error?: string;
  removedAt?: string;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  event?: Omit<AcpSkillRunEvent, "ts"> & { ts?: string };
}) {
  ensureAcpSkillRunStoreHydrated();
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
      hostBridgePluginSkillBundleIdentity:
        getCurrentHostBridgePluginSkillBundleIdentity(),
    }),
    updatedAt: now,
  };
  if (!existing) {
    resetAcpExecutionProgress(requestId);
    next.messageCounts = snapshotAcpMessageCounts(requestId);
  }
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
  assignString("submissionId", update.submissionId);
  assignString("submissionUnitId", update.submissionUnitId);
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
  for (const [key, value] of [
    ["acpModeId", update.acpModeId],
    ["acpModelId", update.acpModelId],
    ["acpModelProvider", update.acpModelProvider],
    ["acpRawModelId", update.acpRawModelId],
  ] as const) {
    if (!Object.prototype.hasOwnProperty.call(update, key)) {
      continue;
    }
    const normalized = normalizeString(value);
    if (normalized) {
      next[key] = normalized;
    } else {
      delete next[key];
    }
  }
  if (Object.prototype.hasOwnProperty.call(update, "acpReasoningEffort")) {
    const effort = normalizeString(update.acpReasoningEffort);
    if (effort) {
      next.acpReasoningEffort = effort;
    } else {
      delete next.acpReasoningEffort;
    }
  }
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
  if (update.hostBridgePluginSkillBundleIdentity) {
    next.hostBridgePluginSkillBundleIdentity = {
      cli: { ...update.hostBridgePluginSkillBundleIdentity.cli },
      aggregateSha256:
        update.hostBridgePluginSkillBundleIdentity.aggregateSha256,
    };
  }
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
  if (Object.prototype.hasOwnProperty.call(update, "promptInterruptState")) {
    next.promptInterruptState = normalizeAcpPromptInterruptState(
      update.promptInterruptState,
    );
  }
  if (update.status && isTerminalAcpSkillRunStatus(next.status)) {
    finishAcpExecutionProgress(requestId);
    next.messageCounts = snapshotAcpMessageCounts(requestId);
  }
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
  const suppressedSilentTrailingEvent =
    isAssistantSilentExecutionMode() &&
    update.persistMode === "trailing" &&
    !!update.event &&
    !ACP_SKILL_RUN_SILENT_CRITICAL_STAGES.has(
      normalizeString(update.event.stage),
    );
  if (suppressedSilentTrailingEvent) {
    // Canonical memory may retain low-signal runtime state until the next
    // lifecycle write, but silent mode does not create a soft persistence edge.
    return next;
  } else if (update.persistMode === "trailing") {
    scheduleSoftRunPersist(next);
  } else {
    persistRun(next, {
      writeRunContext: updateTouchesAcpSkillRunContext(
        update as Record<string, unknown>,
      ),
      writeResultJson: Object.prototype.hasOwnProperty.call(
        update,
        "resultJson",
      ),
    });
  }
  emitWorkspaceChanged(
    acpSkillRunWorkspaceChange(requestId, [
      "run",
      ...(update.event ? (["transcript"] as const) : []),
    ]),
  );
  if (
    !isTerminalAcpSkillRunStatus(existing?.status || "queued") &&
    isTerminalAcpSkillRunStatus(next.status) &&
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    finishAcpRuntimeProfile(requestId);
  }
  if (
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    !isTerminalAcpSkillRunStatus(existing?.status || "queued") &&
    isTerminalAcpSkillRunStatus(next.status)
  ) {
    void recordAcpRuntimeSemanticTraceRequestTerminal({
      requestId,
      payload: { status: next.status, error: next.error },
    });
  }
  return projectAcpSkillRunMetadataRecord(next);
}

export function appendAcpSkillRunUserReply(args: {
  requestId: string;
  message: string;
}) {
  ensureAcpSkillRunStoreHydrated();
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
    id: nextAcpSkillRunTranscriptItemId(existing, "message", state),
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
  queueAcpSkillRunTranscriptEvent(next, {
    op: "upsert_item",
    itemId: item.id,
    item,
    createdAt: now,
    newItem: true,
  });
  setAcpSkillRunRecord(next);
  persistRun(next);
  scheduleWorkspaceChangedEmit(
    acpSkillRunWorkspaceChange(requestId, ["transcript"]),
  );
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
    queueAcpSkillRunTranscriptEvent(args.record, {
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
    id: nextAcpSkillRunTranscriptItemId(args.record, "message", state),
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
  queueAcpSkillRunTranscriptEvent(args.record, {
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
  queueAcpSkillRunTranscriptEvent(record, {
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
  trackAcpSkillRunRuntimeFileWrite(write);
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
  ensureAcpSkillRunStoreHydrated();
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
  if (isAssistantSilentExecutionMode()) {
    setAcpSkillRunRecord(next);
    emitWorkspaceChanged(acpSkillRunWorkspaceChange(requestId, ["run"]));
    return;
  }
  removeLatestAssistantCandidateMessage(next, args.candidateText);
  setAcpSkillRunRecord(next);
  persistRun(next);
  emitWorkspaceChanged(
    acpSkillRunWorkspaceChange(requestId, ["run", "transcript"]),
  );
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
  ensureAcpSkillRunStoreHydrated();
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
  if (isAssistantSilentExecutionMode() && args.kind === "pending") {
    setAcpSkillRunRecord(next);
    emitWorkspaceChanged(acpSkillRunWorkspaceChange(requestId, ["run"]));
    return;
  }
  replaceLatestAssistantMessage({
    record: next,
    text: canonicalText,
    now,
    revision,
  });
  setAcpSkillRunRecord(next);
  persistRun(next);
  emitWorkspaceChanged(
    acpSkillRunWorkspaceChange(requestId, ["run", "transcript"]),
  );
}

export function registerAcpSkillRunController(
  requestIdRaw: string,
  controller: AcpSkillRunController | null,
  setupController?: AcpSkillRunSetupController,
  purpose: AcpSkillRunControllerPurpose = "workflow",
): boolean {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return false;
  }
  if (!controller) {
    controllers.delete(requestId);
    controllerPurposes.delete(requestId);
    clearWaitingUserDetachTimer(requestId);
    cancelAcpSkillRunPermissionQueue(
      requestId,
      "controller_removed_with_pending_permission",
    );
    return true;
  }
  const record = runRecords.get(requestId);
  if (
    setupController &&
    (!record ||
      isTerminalAcpSkillRunStatus(record.status) ||
      setupControllers.get(requestId) !== setupController)
  ) {
    return false;
  }
  setupControllers.delete(requestId);
  controllers.set(requestId, controller);
  controllerPurposes.set(requestId, purpose);
  upsertAcpSkillRun({
    requestId,
    conversationRecoveryState: "connected",
    connectionActionState: "idle",
    lastRecoveryError: "",
  });
  if (record) {
    syncWaitingUserDetachTimer(record);
  }
  clearStaleAcpSkillRunPermissionRequest({
    runRequestId: requestId,
    reason: "controller_registered_without_resolver",
  });
  return true;
}

export function unregisterAcpSkillRunController(
  requestIdRaw: string,
  controller: AcpSkillRunController,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId || controllers.get(requestId) !== controller) {
    return false;
  }
  return registerAcpSkillRunController(requestId, null);
}

export function registerAcpSkillRunSetupController(
  requestIdRaw: string,
  controller: AcpSkillRunSetupController | null,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return;
  }
  if (!controller) {
    setupControllers.delete(requestId);
    return;
  }
  setupControllers.set(requestId, controller);
}

export function unregisterAcpSkillRunSetupController(
  requestIdRaw: string,
  controller: AcpSkillRunSetupController,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId || setupControllers.get(requestId) !== controller) {
    return;
  }
  setupControllers.delete(requestId);
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

export function setAcpSkillRunRuntimeCatalog(
  requestIdRaw: string,
  options: Partial<AcpSkillRunRuntimeCatalog> | null | undefined,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return;
  }
  if (!options) {
    runtimeCatalogByRequestId.delete(requestId);
    scheduleWorkspaceChangedEmit(
      acpSkillRunWorkspaceChange(requestId, ["runtime-options"]),
    );
    return;
  }
  const normalized: AcpSkillRunRuntimeCatalog = {
    modeOptions: normalizeSelectableOptions(options.modeOptions),
    modelOptions: normalizeSelectableOptions(options.modelOptions),
    displayModelOptions: normalizeSelectableOptions(
      options.displayModelOptions,
    ),
    reasoningEffortOptions: normalizeSelectableOptions(
      options.reasoningEffortOptions,
    ),
    reasoningSource:
      options.reasoningSource === "explicit" ||
      options.reasoningSource === "model-derived"
        ? options.reasoningSource
        : "none",
  };
  runtimeCatalogByRequestId.set(requestId, normalized);
  scheduleWorkspaceChangedEmit(
    acpSkillRunWorkspaceChange(requestId, ["runtime-options"]),
  );
}

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
    approvalKind: request.approvalKind,
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
  const queue =
    permissionQueuesByRunRequestId.get(runRequestId) ||
    new AcpPermissionQueue();
  permissionQueuesByRunRequestId.set(runRequestId, queue);
  if (!queue.enqueue(request)) {
    return;
  }
  const active = queue.active();
  upsertAcpSkillRun({
    requestId: runRequestId,
    status: "running",
    statusReason: "start",
    pendingPermission: active
      ? normalizeAcpSkillRunPendingPermission(active, active.requestId)
      : null,
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

registerAcpSkillRunPermissionRequestHandler(setAcpSkillRunPermissionRequest);

function cancelAcpSkillRunPermissionQueue(
  runRequestIdRaw: string,
  reason: string,
) {
  const runRequestId = normalizeString(runRequestIdRaw);
  const queue = permissionQueuesByRunRequestId.get(runRequestId);
  const record = runRecords.get(runRequestId);
  if (!queue) {
    if (record?.pendingPermission) {
      upsertAcpSkillRun({
        requestId: runRequestId,
        pendingPermission: null,
      });
    }
    return 0;
  }
  const cancelled = queue.cancelAll();
  const cancelledCount = cancelled.length;
  permissionQueuesByRunRequestId.delete(runRequestId);
  if (record?.pendingPermission || cancelledCount > 0) {
    const recoverableStatus =
      record &&
      new Set<AcpSkillRunStatus>(["running", "repairing"]).has(record.status)
        ? "waiting_user"
        : record?.status;
    const cancelledRequests = cancelledCount > 0 ? cancelled : [null];
    cancelledRequests.forEach((entry, index) => {
      upsertAcpSkillRun({
        requestId: runRequestId,
        status: index === 0 ? recoverableStatus : undefined,
        statusReason:
          index === 0 && record && recoverableStatus !== record.status
            ? "waiting_user"
            : undefined,
        activePrompt: index === 0 ? false : undefined,
        pendingPermission: null,
        replyState: index === 0 ? "idle" : undefined,
        event: entry
          ? {
              stage: "permission-resolved",
              message: "Permission request cancelled.",
              level: "warn",
              details: {
                permissionRequestId: entry.requestId,
                outcome: "cancelled",
                reason,
                toolCallId: normalizeString(entry.toolCallId),
                toolTitle: normalizeString(entry.toolTitle),
                source: normalizeString(entry.source) || undefined,
                summary:
                  normalizeString(entry.summary) ||
                  normalizeString(entry.toolTitle),
              },
            }
          : undefined,
      });
    });
  }
  return cancelledCount;
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
  ensureAcpSkillRunStoreHydrated();
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
    if (
      permissionQueuesByRunRequestId.get(record.requestId)?.active()
        ?.requestId === pendingRequestId
    ) {
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
  const matchedRunRequestId =
    runRequestId ||
    Array.from(permissionQueuesByRunRequestId.entries()).find(
      ([, queue]) => queue.active()?.requestId === permissionRequestId,
    )?.[0] ||
    "";
  const queue = permissionQueuesByRunRequestId.get(matchedRunRequestId);
  const active = queue?.active() || null;
  if (!queue || !active) {
    if (
      clearStaleAcpSkillRunPermissionRequest({
        runRequestId,
        permissionRequestId,
        reason: "resolve_without_live_handler",
      })
    ) {
      return;
    }
    const record = runRequestId ? runRecords.get(runRequestId) : undefined;
    if (record && !record.pendingPermission) {
      return;
    }
    throw new Error("No active ACP skill run permission request is available.");
  }
  if (permissionRequestId && active.requestId !== permissionRequestId) {
    throw new Error(
      "The requested ACP skill run permission is not the active request.",
    );
  }
  const outcome =
    args.outcome === "selected" && normalizeString(args.optionId)
      ? ({
          outcome: "selected",
          optionId: normalizeString(args.optionId),
        } as RequestPermissionOutcome)
      : ({ outcome: "cancelled" } as RequestPermissionOutcome);
  const resolved = queue.resolveActive(permissionRequestId, outcome);
  if (!resolved) {
    throw new Error(
      "The requested ACP skill run permission is not the active request.",
    );
  }
  const next = queue.active();
  if (!next) {
    permissionQueuesByRunRequestId.delete(matchedRunRequestId);
  }
  upsertAcpSkillRun({
    requestId: matchedRunRequestId,
    pendingPermission: next
      ? normalizeAcpSkillRunPendingPermission(next, next.requestId)
      : null,
    event: {
      stage: "permission-resolved",
      message:
        outcome.outcome === "selected"
          ? `Permission option selected: ${outcome.optionId}`
          : "Permission request cancelled.",
      level: outcome.outcome === "selected" ? "info" : "warn",
      details: {
        permissionRequestId: resolved.requestId,
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
  getAcpSkillRunSlotCoordinator(requestId)?.cancelPendingResumption();
  cancelAcpSkillRunPermissionQueue(
    requestId,
    "run_cancelled_with_pending_permission",
  );
  const controller = controllers.get(requestId);
  const setupController = setupControllers.get(requestId);
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
      message: "ACP skill run cancellation requested.",
      level: "warn",
    },
  });
  const cleanupTask = setupController?.cancel() || controller?.cancel();
  if (!cleanupTask) {
    return;
  }
  const cleanup = await waitForAcpSkillRunShutdownTask(cleanupTask);
  if (controller) {
    unregisterAcpSkillRunController(requestId, controller);
  }
  if (!cleanup.timedOut && !("error" in cleanup)) {
    return;
  }
  upsertAcpSkillRun({
    requestId,
    event: {
      stage: cleanup.timedOut
        ? "cancel-cleanup-timeout"
        : "cancel-cleanup-error",
      message: cleanup.timedOut
        ? "ACP skill run cleanup exceeded the local detach timeout."
        : "ACP skill run cleanup failed after terminal cancellation.",
      level: "warn",
      details: {
        timeoutMs: cleanup.timedOut
          ? ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS
          : undefined,
        error:
          "error" in cleanup && cleanup.error
            ? errorText(cleanup.error)
            : undefined,
      },
    },
  });
}

export async function interruptAcpSkillRunCurrentTurn(requestIdRaw: string) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    throw new Error("requestId is required");
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (
    existing &&
    isTerminalAcpSkillRunStatus(existing.status) &&
    controllerPurposes.get(requestId) !== "post-terminal-conversation"
  ) {
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
  if (
    controllers.has(requestId) ||
    existing.activePrompt ||
    existing.replyState === "submitted" ||
    existing.replyState === "accepted" ||
    existing.connectionActionState === "connecting" ||
    existing.connectionActionState === "disconnecting" ||
    existing.conversationRecoveryState === "connecting" ||
    existing.conversationRecoveryState === "connected"
  ) {
    throw new Error(
      "Disconnect the ACP skill run conversation before archiving it.",
    );
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
  message?: string;
  displayMessage?: string;
  promptMessage?: string;
}) {
  const requestId = normalizeString(args.requestId);
  const displayMessage = String(
    args.displayMessage ?? args.message ?? args.promptMessage ?? "",
  ).trim();
  const promptMessage = String(
    args.promptMessage ?? args.message ?? args.displayMessage ?? "",
  ).trim();
  if (!requestId) {
    throw new Error("requestId is required");
  }
  if (!displayMessage || !promptMessage) {
    throw new Error("reply message is required");
  }
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for reply.");
  }
  const terminalConversation =
    isEligibleForPostTerminalAcpSkillRunConversation(existing);
  if (isTerminalAcpSkillRunStatus(existing.status) && !terminalConversation) {
    throw new Error("Terminal ACP skill run conversation is not recoverable.");
  }
  if (
    !terminalConversation &&
    existing.status !== "waiting_user" &&
    existing.status !== "failed_retriable"
  ) {
    throw new Error(
      "ACP skill run replies are only accepted for waiting or recoverable failed runs.",
    );
  }
  if (
    terminalConversation &&
    (!controllers.has(requestId) ||
      controllerPurposes.get(requestId) !== "post-terminal-conversation")
  ) {
    throw new Error(
      "Connect the terminal ACP skill run conversation before replying.",
    );
  }
  upsertAcpSkillRun({
    requestId,
    replyState: "submitted",
    replyError: "",
    conversationError: "",
    lastRecoveryError: "",
    error: terminalConversation ? existing.error : "",
    event: {
      stage: "reply-submitted",
      message: "User reply submitted.",
      level: "info",
    },
  });
  const slot = terminalConversation
    ? null
    : getAcpSkillRunSlotCoordinator(requestId);
  if (slot && !(await slot.ensureSlot("user-reply"))) {
    const detail = "ACP skill reply admission was canceled before send.";
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
    throw new Error(detail);
  }
  let controller = controllers.get(requestId);
  if (
    !terminalConversation &&
    !controller?.reply &&
    !controller?.replyRequest &&
    recoveryHandler
  ) {
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
  if (!controller?.reply && !controller?.replyRequest) {
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
    error: terminalConversation ? existing.error : "",
    event: {
      stage: "reply-accepted",
      message: "User reply accepted by ACP skill run controller.",
      level: "info",
    },
  });
  try {
    if (controller.replyRequest) {
      await controller.replyRequest({ displayMessage, promptMessage });
    } else {
      await controller.reply?.(promptMessage);
    }
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
      conversationError: terminalConversation ? detail : undefined,
      event: {
        stage: "reply-rejected",
        message: detail,
        level: "error",
      },
    });
    throw error;
  }
}

function getAcpSkillRunSlotCoordinator(requestId: string) {
  const submissionUnitId = getAcpSkillRunRecord(requestId)?.submissionUnitId;
  return submissionUnitId
    ? workflowSubmissionQueue.getSlotCoordinator(submissionUnitId)
    : null;
}

export function isAcpSkillRunPromptActive(
  run: Pick<AcpSkillRunRecord, "activePrompt" | "replyState">,
) {
  return (
    run.activePrompt === true ||
    run.replyState === "submitted" ||
    run.replyState === "accepted"
  );
}

export function canEditAcpSkillRunModelConfiguration(
  run: Pick<AcpSkillRunRecord, "status" | "activePrompt" | "replyState">,
) {
  return (
    !isAcpSkillRunPromptActive(run) &&
    (run.status === "waiting_user" || run.status === "failed_retriable")
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

function runtimeCatalogForRun(run: AcpSkillRunRecord) {
  const stored = runtimeCatalogByRequestId.get(run.requestId);
  return stored
    ? cloneRuntimeCatalog(stored)
    : {
        modeOptions: [],
        modelOptions: [],
        displayModelOptions: [],
        reasoningEffortOptions: [],
        reasoningSource: "none" as const,
      };
}

export function getAcpSkillRunRuntimeCatalog(requestIdRaw: string) {
  ensureAcpSkillRunStoreHydrated();
  const requestId = normalizeString(requestIdRaw);
  const run = requestId ? runRecords.get(requestId) : undefined;
  return run ? runtimeCatalogForRun(run) : null;
}

export function updateAcpSkillRunRuntimeSelection(args: {
  requestId: string;
  selection: {
    modeId?: string;
    modelId?: string;
    rawModelId?: string;
    reasoningEffort?: string | null;
  };
  event?: Omit<AcpSkillRunEvent, "ts"> & { ts?: string };
}) {
  return upsertAcpSkillRun({
    requestId: args.requestId,
    acpModeId: args.selection.modeId,
    acpModelId: args.selection.modelId,
    acpRawModelId: args.selection.rawModelId,
    ...(Object.prototype.hasOwnProperty.call(args.selection, "reasoningEffort")
      ? { acpReasoningEffort: args.selection.reasoningEffort }
      : {}),
    event: args.event,
  });
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
  const runtimeCatalog = runtimeCatalogForRun(run);
  if (!runtimeCatalog.modeOptions.some((entry) => entry.id === modeId)) {
    throw new Error("ACP skill run mode is not available for this session.");
  }
  const controller = requireRuntimeController(requestId, "setMode");
  await controller.setMode({ sessionId, modeId });
  updateAcpSkillRunRuntimeSelection({
    requestId,
    selection: { modeId },
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
  if (!canEditAcpSkillRunModelConfiguration(run)) {
    throw new Error(
      "Cannot change ACP skill run model while model configuration is frozen.",
    );
  }
  const runtimeCatalog = runtimeCatalogForRun(run);
  const displayModelOptions = runtimeCatalog.displayModelOptions.length
    ? runtimeCatalog.displayModelOptions
    : runtimeCatalog.modelOptions;
  if (!displayModelOptions.some((entry) => entry.id === modelId)) {
    throw new Error("ACP skill run model is not available for this session.");
  }
  const rawModelId = resolveAcpRawModelIdForSelection({
    modelOptions: runtimeCatalog.modelOptions,
    displayModelId: modelId,
    effortId: normalizeString(run.acpReasoningEffort),
    currentRawModelId: run.acpRawModelId,
  });
  if (!runtimeCatalog.modelOptions.some((entry) => entry.id === rawModelId)) {
    throw new Error("ACP skill run model is not available for this session.");
  }
  const controller = requireRuntimeController(requestId, "setModel");
  await controller.setModel({ sessionId, modelId: rawModelId });
  const effortId =
    runtimeCatalog.reasoningSource === "model-derived"
      ? resolveEffortIdFromRawModel(
          rawModelId,
          runtimeCatalog.modelOptions,
          normalizeString(run.acpReasoningEffort),
        )
      : normalizeString(run.acpReasoningEffort);
  updateAcpSkillRunRuntimeSelection({
    requestId,
    selection: {
      modelId,
      rawModelId,
      ...(effortId ? { reasoningEffort: effortId } : {}),
    },
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
  if (!canEditAcpSkillRunModelConfiguration(run)) {
    throw new Error(
      "Cannot change ACP skill run reasoning effort while model configuration is frozen.",
    );
  }
  const runtimeCatalog = runtimeCatalogForRun(run);
  if (
    !runtimeCatalog.reasoningEffortOptions.some(
      (entry) => entry.id === effortId,
    )
  ) {
    throw new Error(
      "ACP skill run reasoning effort is not available for this session.",
    );
  }
  const displayModelId =
    normalizeString(run.acpModelId) || normalizeString(run.acpRawModelId);
  const rawModelId = displayModelId
    ? resolveAcpRawModelIdForSelection({
        modelOptions: runtimeCatalog.modelOptions,
        displayModelId,
        effortId,
        currentRawModelId: run.acpRawModelId,
      })
    : "";
  if (
    runtimeCatalog.reasoningSource === "model-derived" &&
    !runtimeCatalog.modelOptions.some((entry) => entry.id === rawModelId)
  ) {
    throw new Error("ACP skill run model is not available for this session.");
  }
  const controller = requireRuntimeController(requestId, "setModel");
  if (runtimeCatalog.reasoningSource === "explicit") {
    const applied = await controller.setConfigOption?.({
      sessionId,
      category: "thought_level",
      value: effortId,
    });
    if (applied !== true) {
      throw new Error(
        "ACP skill run reasoning configuration is not available for this session.",
      );
    }
  } else if (runtimeCatalog.reasoningSource === "model-derived" && rawModelId) {
    await controller.setModel({ sessionId, modelId: rawModelId });
  } else {
    throw new Error(
      "No ACP skill run model is available for reasoning changes.",
    );
  }
  updateAcpSkillRunRuntimeSelection({
    requestId,
    selection: {
      modelId: displayModelId,
      ...(rawModelId ? { rawModelId } : {}),
      reasoningEffort: effortId,
    },
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
  const existing = getAcpSkillRunRecord(requestId);
  if (!existing) {
    throw new Error("No ACP skill run record is available for connection.");
  }
  const terminalConversation =
    isEligibleForPostTerminalAcpSkillRunConversation(existing);
  if (isTerminalAcpSkillRunStatus(existing.status) && !terminalConversation) {
    throw new Error("Terminal ACP skill run conversation is not recoverable.");
  }
  if (controllers.has(requestId)) {
    if (
      isTerminalAcpSkillRunStatus(existing.status) &&
      controllerPurposes.get(requestId) !== "post-terminal-conversation"
    ) {
      throw new Error(
        "Wait for the workflow controller to detach, then Connect the terminal conversation.",
      );
    }
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
    const slot = terminalConversation
      ? null
      : getAcpSkillRunSlotCoordinator(requestId);
    if (slot && !(await slot.ensureSlot("retry"))) {
      throw new Error("ACP skill recovery admission was canceled.");
    }
    await recoveryHandler({ requestId, reason: "connect" });
    const recovered = getAcpSkillRunRecord(requestId);
    if (
      recovered &&
      isTerminalAcpSkillRunStatus(recovered.status) &&
      !controllers.has(requestId)
    ) {
      return;
    }
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
    const current = getAcpSkillRunRecord(requestId);
    if (current && isTerminalAcpSkillRunStatus(current.status)) {
      return;
    }
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
      const result = await waitForAcpSkillRunShutdownTask(
        controller.disconnect(),
      );
      if (result.timedOut) {
        disconnectError = new Error(
          `ACP skill run disconnect timed out after ${ACP_SKILL_RUN_SHUTDOWN_DETACH_TIMEOUT_MS} ms`,
        );
      } else if ("error" in result) {
        disconnectError = result.error;
      }
    }
  } catch (error) {
    disconnectError = error;
  } finally {
    const currentController = controllers.get(requestId);
    if (controller) {
      if (currentController === controller) {
        unregisterAcpSkillRunController(requestId, controller);
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

function applyResultTerminalRecoveryState(
  requestId: string,
  state: "succeeded" | "failed",
): AcpSkillRunRecoveryState {
  const record = getAcpSkillRunRecord(requestId);
  if (record?.conversationState === "ended") {
    return "unavailable";
  }
  if (state === "succeeded") {
    return "available";
  }
  return normalizeString(record?.sessionId) ? "available" : "unavailable";
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
    conversationRecoveryState: applyResultTerminalRecoveryState(
      args.requestId,
      args.state,
    ),
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

async function performAcpSkillRunControllerDetachAfterApplyResult(args: {
  requestId: string;
  state: "succeeded" | "failed";
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId || !getAcpSkillRunRecord(requestId)) {
    return;
  }
  const controller = controllers.get(requestId);
  upsertAcpSkillRun({
    requestId,
    event: {
      stage: "apply-result-detach-started",
      message: "ACP skill run controller detach after workflow apply started.",
      level: "info",
      details: { controllerPresent: Boolean(controller) },
    },
  });
  registerAcpSkillRunController(requestId, null);
  if (!controller?.disconnect) {
    finalizeAcpSkillRunApplyResultControllerDetach({
      requestId,
      state: args.state,
      stage: "apply-result-detached",
      level: "info",
    });
    return;
  }
  try {
    await controller.disconnect();
    finalizeAcpSkillRunApplyResultControllerDetach({
      requestId,
      state: args.state,
      stage: "apply-result-detached",
      level: "info",
    });
  } catch (error) {
    finalizeAcpSkillRunApplyResultControllerDetach({
      requestId,
      state: args.state,
      stage: "apply-result-detach-error",
      level: "warn",
      error,
    });
  }
}

export async function detachAcpSkillRunControllerAfterApplyResult(args: {
  requestId: string;
  state: "succeeded" | "failed";
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return;
  }
  const existing = applyResultControllerDetachPromises.get(requestId);
  if (existing) {
    await existing;
    return;
  }
  const task = performAcpSkillRunControllerDetachAfterApplyResult({
    requestId,
    state: args.state,
  });
  applyResultControllerDetachPromises.set(requestId, task);
  try {
    await task;
  } finally {
    if (applyResultControllerDetachPromises.get(requestId) === task) {
      applyResultControllerDetachPromises.delete(requestId);
    }
  }
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
  const nextStatus =
    args.state === "failed"
      ? "failed"
      : terminal
        ? undefined
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

function applyAcpSkillRunSelection(requestIdRaw: string) {
  selectedRequestId = normalizeString(requestIdRaw);
  pruneInactiveAcpSkillRunTranscriptMirrors();
  emitWorkspaceChanged(
    selectedRequestId
      ? acpSkillRunWorkspaceChange(selectedRequestId, ["selection"])
      : createAcpSkillRunWorkspaceChange({ kinds: ["selection"] }),
  );
}

export async function selectAcpSkillRun(requestIdRaw: string) {
  ensureAcpSkillRunStoreHydrated();
  applyAcpSkillRunSelection(requestIdRaw);
}

export function ensureAcpSkillRunWorkspaceSelection() {
  ensureAcpSkillRunStoreHydrated();
  const current = normalizeString(selectedRequestId);
  if (current) {
    const record = runRecords.get(current);
    if (record && !record.removedAt && !record.archivedAt) {
      return current;
    }
  }
  const implicit = listAcpSkillRunSummaries({
    includeArchived: false,
    limit: 1,
  })[0]?.requestId;
  if (implicit && implicit !== current) {
    applyAcpSkillRunSelection(implicit);
  }
  return implicit || "";
}

export function getSelectedAcpSkillRunRequestId() {
  ensureAcpSkillRunStoreHydrated();
  return selectedRequestId;
}

export function prepareSyntheticAcpSkillRunReplay(args: {
  requestId: string;
  workflowId?: string;
  workflowRunId?: string;
  jobId?: string;
  stageId?: string;
}) {
  return upsertAcpSkillRun({
    requestId: args.requestId,
    status: "running",
    statusReason: "start",
    backendId: "acp-replay",
    backendType: "acp",
    workflowId: args.workflowId,
    runId: args.workflowRunId,
    jobId: args.jobId,
    sequenceStepId: args.stageId,
    taskName: "ACP replay",
    skillId: "acp-replay",
    conversationState: "active",
    activePrompt: true,
  });
}

export function applySyntheticAcpSkillRunReplayPermission(args: {
  requestId: string;
  request: AcpPendingPermissionRequest | null;
}) {
  return upsertAcpSkillRun({
    requestId: args.requestId,
    ...(args.request
      ? {
          status: "waiting_user" as const,
          statusReason: "waiting_user" as const,
        }
      : {}),
    pendingPermission: args.request,
    conversationState: "active",
  });
}

export async function cleanupSyntheticAcpSkillRunReplay(requestIds: string[]) {
  await flushAcpSkillRunRuntimeFileWrites();
  for (const requestId of requestIds) {
    deletePluginRunStoreEntry("acp", requestId);
    deleteAcpSkillRunRecord(requestId);
    if (selectedRequestId === requestId) selectedRequestId = "";
  }
  if (requestIds.length > 0) {
    emitWorkspaceChanged(
      createAcpSkillRunWorkspaceChange({ requestIds, kinds: ["archive"] }),
    );
  }
}

export function getAcpSkillRunRecord(requestIdRaw: string) {
  ensureAcpSkillRunStoreHydrated();
  const requestId = normalizeString(requestIdRaw);
  const entry = requestId ? runRecords.get(requestId) : undefined;
  if (!entry) {
    return null;
  }
  return projectAcpSkillRunMetadataRecord(entry);
}

registerAcpSkillRunAutoApprovalResolver((requestId) => {
  const record = getAcpSkillRunRecord(requestId);
  return !!(
    record?.hostBridgeCli?.autoApproveWrites === true &&
    [
      "queued",
      "running",
      "waiting_user",
      "repairing",
      "failed_retriable",
    ].includes(record.status)
  );
});

export async function shutdownAcpSkillRunConversations() {
  const setupEntries = Array.from(setupControllers.entries());
  await Promise.allSettled(
    setupEntries.map(async ([requestId, controller]) => {
      await controller.cancel().catch(() => undefined);
      unregisterAcpSkillRunSetupController(requestId, controller);
    }),
  );
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
  resetAcpSkillRunWorkspaceDataPlaneForTests();
  clearAcpSkillRunRecords();
  resetAcpSkillRunPersistenceForTests();
  resetAcpTranscriptWritesForTests();
  controllers.clear();
  controllerPurposes.clear();
  setupControllers.clear();
  applyResultControllerDetachPromises.clear();
  runtimeCatalogByRequestId.clear();
  for (const queue of permissionQueuesByRunRequestId.values()) {
    queue.cancelAll();
  }
  permissionQueuesByRunRequestId.clear();
  selectedRequestId = "";
  resetAcpSkillRunSummaryDiagnosticsForTests();
  clearPluginRunStore("acp");
}

registerAcpSkillRunsMemoryClearer(() => {
  clearAcpSkillRunRecords();
  runtimeCatalogByRequestId.clear();
  selectedRequestId = "";
  invalidateAcpSkillRunPersistenceHydration();
  clearPluginRunStore("acp");
  emitWorkspaceChanged();
});

registerAcpSkillRunsRetentionCleaner(cleanupExpiredAcpSkillRunsForRetention);

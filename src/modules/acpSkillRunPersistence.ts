import {
  ACP_SKILL_RUN_REQUEST_KIND,
  ACP_BACKEND_TYPE,
} from "../config/defaults";
import {
  appendPluginRunEventStoreEntry,
  deletePluginRunStoreEntry,
  listPluginRunStoreEntries,
  upsertPluginRunStoreEntry,
} from "./pluginStateStore";
import { writeRuntimeTextFile } from "./runtimePersistence";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  getAssistantExecutionDisplayMode,
  subscribeAssistantExecutionDisplayMode,
} from "./assistantExecutionDisplayPolicy";
import { restoreAcpExecutionProgress } from "./acpExecutionProgress";
import { normalizeAssistantMessageCounts } from "./assistantMessageCounts";
import {
  listWorkflowTasks,
  removeWorkflowTasksByBackendAndRequestIds,
  type WorkflowTaskRecord,
} from "./taskRuntime";
import { isDebugModeEnabled } from "./debugMode";
import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  readAcpRuntimePerformanceClockMs,
} from "./acpRuntimePerformanceProfiler";
import type { AcpPendingPermissionRequest } from "./acpTypes";
import { normalizeAcpPromptInterruptState } from "./acpTypes";
import { type AcpSelectableOption } from "./acpModelOptionFolding";
import { normalizeAcpPermissionOptionKind } from "./acpPermissionOptions";
import type { AcpSkillRunAuditTrailState } from "./acpSkillRunAuditTrail";
import {
  flushAllAcpTranscriptWrites,
  resolveAcpSkillRunTranscriptPaths,
  type AcpSkillRunTranscriptMetadata,
} from "./acpSkillRunTranscriptStore";
import {
  resolveAcpSkillRunPayloadPaths,
  writeAcpSkillRunContextPayload,
  type AcpSkillRunPayloadRefs,
} from "./acpSkillRunPayloadStore";
import {
  completeAcpSkillRunOpenStreamingTextItems,
  parsePlanEntries,
  type AcpSkillRunTranscriptLiveState,
} from "./acpSkillRunTranscriptMirror";
import type { AcpRuntimeReplayLogicalTimerDescriptor } from "./acpRuntimeReplayLogicalTime";
import type {
  AcpSkillRunConnectionActionState,
  AcpSkillRunConversationState,
  AcpSkillRunEvent,
  AcpSkillRunHostBridgeCliState,
  AcpSkillRunPendingInteraction,
  AcpSkillRunRecord,
  AcpSkillRunRecoveryState,
  AcpSkillRunReplyState,
  AcpSkillRunRetentionCleanupResult,
  AcpSkillRunRuntimeCatalog,
  AcpSkillRunStatus,
  AcpSkillRunWorkspaceChange,
  AcpSkillRunWorkspaceChangeKind,
  upsertAcpSkillRun,
} from "./acpSkillRunStore";

const SOFT_RUN_PERSIST_DELAY_MS = 2000;
const ACP_SKILL_RUN_PREVIEW_LIMIT = 8 * 1024;

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// Registry access owned by acpSkillRunStore (run records, selection,
// transcript live states) plus workspace-change emission owned by the
// workspace data-plane. Injected once at module load so this module never
// imports the store or the data-plane at runtime.
export type AcpSkillRunPersistenceHost = {
  listRunRecords(): Iterable<AcpSkillRunRecord>;
  resolveRunRecord(requestId: string): AcpSkillRunRecord | undefined;
  setAcpSkillRunRecord(record: AcpSkillRunRecord): void;
  upsertAcpSkillRun(update: Parameters<typeof upsertAcpSkillRun>[0]): void;
  deleteRunRecord(requestId: string): void;
  isEligibleForPostTerminalConversation(record: AcpSkillRunRecord): boolean;
  getSelectedRequestId(): string;
  clearSelectedRequestId(): void;
  peekTranscriptLiveState(
    requestId: string,
  ): AcpSkillRunTranscriptLiveState | undefined;
  acpSkillRunWorkspaceChange(
    requestId: string,
    kinds: AcpSkillRunWorkspaceChangeKind[],
  ): AcpSkillRunWorkspaceChange;
  createWorkspaceChange(
    change: AcpSkillRunWorkspaceChange,
  ): AcpSkillRunWorkspaceChange;
  emitWorkspaceChanged(change?: AcpSkillRunWorkspaceChange): void;
};

let host: AcpSkillRunPersistenceHost;

export function configureAcpSkillRunPersistenceHost(
  nextHost: AcpSkillRunPersistenceHost,
) {
  host = nextHost;
}

export function truncateAcpSkillRunPreview(value: unknown) {
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

export function deriveAcpSkillRunRuntimeFileMetadata(
  record: AcpSkillRunRecord,
) {
  const transcriptPaths = resolveAcpSkillRunTranscriptPaths(record.runtimeDir);
  const payloadRefs = resolveAcpSkillRunPayloadPaths(record.runtimeDir);
  const liveState = host.peekTranscriptLiveState(record.requestId);
  const transcriptItemCount = Math.max(
    0,
    record.transcriptItemCount || liveState?.transcriptItemCount || 0,
  );
  const transcriptEventSeq = Math.max(
    0,
    record.transcriptEventSeq ||
      record.transcriptRevision ||
      liveState?.transcriptEventSeq ||
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

export function updateTouchesAcpSkillRunContext(
  update: Record<string, unknown>,
): boolean {
  return ACP_SKILL_RUN_CONTEXT_UPDATE_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(update, key),
  );
}

export function normalizeOptionalNonNegativeInteger(value: unknown) {
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

export function normalizeSelectableOptions(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeSelectableOption)
    .filter((entry): entry is AcpSelectableOption => !!entry);
}

function cloneSelectableOptions(options: AcpSelectableOption[]) {
  return options.map((entry) => ({ ...entry }));
}

export function cloneRuntimeCatalog(
  options: AcpSkillRunRuntimeCatalog,
): AcpSkillRunRuntimeCatalog {
  return {
    modeOptions: cloneSelectableOptions(options.modeOptions),
    modelOptions: cloneSelectableOptions(options.modelOptions),
    displayModelOptions: cloneSelectableOptions(options.displayModelOptions),
    reasoningEffortOptions: cloneSelectableOptions(
      options.reasoningEffortOptions,
    ),
    reasoningSource: options.reasoningSource,
  };
}

export function normalizeStatus(value: unknown): AcpSkillRunStatus {
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

export function parsePendingInteraction(
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

function isRecoverableAcpRecoveryState(state: AcpSkillRunRecoveryState) {
  return (
    state === "available" || state === "connecting" || state === "connected"
  );
}

function isLegacyRecoverableAcpRecoveryState(state: AcpSkillRunRecoveryState) {
  return isRecoverableAcpRecoveryState(state) || state === "failed";
}

function shouldMigrateLegacyFailedRunToRetriable(record: AcpSkillRunRecord) {
  const recoveryState = record.conversationRecoveryState || "unavailable";
  const workflowOpen = Boolean(
    record.pendingInteraction ||
    record.applyResultState === "pending" ||
    record.outputConvergenceState === "pending",
  );
  const terminalEvidence = Boolean(
    record.applyResultState === "succeeded" ||
    record.applyResultState === "failed" ||
    record.appliedAt ||
    record.outputConvergenceState === "final" ||
    record.validationStatus === "valid",
  );
  return (
    record.status === "failed" &&
    workflowOpen &&
    !terminalEvidence &&
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

export function parseRunRecord(raw: unknown): AcpSkillRunRecord | null {
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
    submissionId: normalizeString(raw.submissionId) || undefined,
    submissionUnitId: normalizeString(raw.submissionUnitId) || undefined,
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
    acpModelProvider: normalizeString(raw.acpModelProvider) || undefined,
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
    promptInterruptState: normalizeAcpPromptInterruptState(
      raw.promptInterruptState,
    ),
    pendingPermission: isRecord(raw.pendingPermission)
      ? ({
          requestId: normalizeString(raw.pendingPermission.requestId),
          sessionId: normalizeString(raw.pendingPermission.sessionId),
          toolCallId: normalizeString(raw.pendingPermission.toolCallId),
          toolTitle: normalizeString(raw.pendingPermission.toolTitle),
          approvalKind:
            raw.pendingPermission.approvalKind === "zotero-write"
              ? "zotero-write"
              : raw.pendingPermission.approvalKind === "acp-tool"
                ? "acp-tool"
                : undefined,
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
    messageCounts: normalizeAssistantMessageCounts(
      raw.messageCounts,
      requestId,
    ),
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

let hydrated = false;
let unsubscribeExecutionDisplayMode: (() => void) | undefined;
let lastExecutionDisplayMode = getAssistantExecutionDisplayMode();

export function ensureAcpSkillRunStoreHydrated() {
  if (hydrated) {
    return;
  }
  hydrated = true;
  lastExecutionDisplayMode = getAssistantExecutionDisplayMode();
  unsubscribeExecutionDisplayMode = subscribeAssistantExecutionDisplayMode(
    (mode) => {
      if (mode === lastExecutionDisplayMode) {
        return;
      }
      for (const record of host.listRunRecords()) {
        if (mode === "silent") {
          const now = nowIso();
          if (completeAcpSkillRunOpenStreamingTextItems(record, now)) {
            persistRun(record);
            host.emitWorkspaceChanged(
              host.acpSkillRunWorkspaceChange(record.requestId, ["transcript"]),
            );
          }
        }
      }
      lastExecutionDisplayMode = mode;
    },
  );
  for (const row of listPluginRunStoreEntries("acp")) {
    try {
      const raw = JSON.parse(row.payload || "{}") as Record<string, unknown>;
      const legacyLargePayload = hasLargeAcpSkillRunPayload(raw);
      const parsed = parseRunRecord(raw);
      if (!parsed) {
        continue;
      }
      host.setAcpSkillRunRecord(parsed);
      restoreAcpExecutionProgress(parsed.requestId, parsed.messageCounts);
      if (legacyLargePayload) {
        persistRun(parsed);
      }
    } catch {
      continue;
    }
  }
}

export function invalidateAcpSkillRunPersistenceHydration() {
  hydrated = false;
}

export function resetAcpSkillRunPersistenceForTests() {
  unsubscribeExecutionDisplayMode?.();
  unsubscribeExecutionDisplayMode = undefined;
  hydrated = false;
  for (const timer of softRunPersistTimers.values()) {
    clearTimeout(timer);
  }
  softRunPersistTimers.clear();
  softRunPersistRecords.clear();
  lastPersistedEventIds.clear();
}

const runtimeFileWrites = new Set<Promise<unknown>>();

export function trackAcpSkillRunRuntimeFileWrite(write: Promise<unknown>) {
  runtimeFileWrites.add(write);
  void write.finally(() => {
    runtimeFileWrites.delete(write);
  });
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

async function flushAcpSkillRunTranscriptWriteBatches() {
  await flushAllAcpTranscriptWrites().catch(() => undefined);
}

export async function flushAcpSkillRunRuntimeFileWrites() {
  flushSoftRunPersists();
  await flushAcpSkillRunTranscriptWriteBatches();
  while (runtimeFileWrites.size > 0) {
    await Promise.all(Array.from(runtimeFileWrites)).catch(() => undefined);
    await flushAcpSkillRunTranscriptWriteBatches();
  }
}

export async function flushAcpSkillRunRuntimeFileWritesForTests() {
  await flushAcpSkillRunRuntimeFileWrites();
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

export function persistRun(
  record: AcpSkillRunRecord,
  options?: {
    writeRunContext?: boolean;
    writeResultJson?: boolean;
  },
) {
  if (normalizeString(record.backendType) !== ACP_BACKEND_TYPE) {
    return;
  }
  const pendingTimer = softRunPersistTimers.get(record.requestId);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    softRunPersistTimers.delete(record.requestId);
  }
  softRunPersistRecords.delete(record.requestId);
  const startedAt =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? readAcpRuntimePerformanceClockMs()
      : 0;
  persistAcpSkillRunRuntimeFiles(record, options);
  const payload = JSON.stringify(buildPersistedAcpSkillRunPayload(record));
  upsertPluginRunStoreEntry("acp", {
    runKey: record.requestId,
    requestId: record.requestId,
    backendId: record.backendId,
    state: record.status,
    updatedAt: record.updatedAt,
    payload,
  });
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    incrementAcpRuntimeMetric(record.requestId, "run_persist");
    incrementAcpRuntimeMetric(
      record.requestId,
      "run_persist_bytes",
      { persistenceChannel: "run" },
      new TextEncoder().encode(payload).byteLength,
    );
    observeAcpRuntimeDuration(
      record.requestId,
      "run_persist_duration",
      { persistenceChannel: "run" },
      readAcpRuntimePerformanceClockMs() - startedAt,
    );
  }
  const latestEvent = record.events[record.events.length - 1];
  if (latestEvent) {
    const persistedEvent = sanitizeAcpSkillRunPersistedValue(
      latestEvent,
    ) as AcpSkillRunEvent;
    const eventId = `${record.requestId}:${latestEvent.ts}:${record.events.length}:${latestEvent.stage}`;
    if (lastPersistedEventIds.get(record.requestId) === eventId) {
      return;
    }
    lastPersistedEventIds.set(record.requestId, eventId);
    appendPluginRunEventStoreEntry("acp", {
      eventId,
      runKey: record.requestId,
      requestId: record.requestId,
      backendId: record.backendId,
      type: latestEvent.stage,
      createdAt: latestEvent.ts || record.updatedAt,
      payload: JSON.stringify(persistedEvent),
    });
  }
}

const softRunPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();
const softRunPersistRecords = new Map<string, AcpSkillRunRecord>();
const lastPersistedEventIds = new Map<string, string>();

export function scheduleSoftRunPersist(record: AcpSkillRunRecord) {
  softRunPersistRecords.set(record.requestId, record);
  if (softRunPersistTimers.has(record.requestId)) {
    return;
  }
  softRunPersistTimers.set(
    record.requestId,
    setTimeout(() => {
      softRunPersistTimers.delete(record.requestId);
      const pending = softRunPersistRecords.get(record.requestId);
      if (pending) {
        softRunPersistRecords.delete(record.requestId);
        persistRun(pending);
      }
    }, SOFT_RUN_PERSIST_DELAY_MS),
  );
}

function flushSoftRunPersists() {
  for (const record of Array.from(softRunPersistRecords.values())) {
    persistRun(record);
  }
}

// Soft-persist half of the synthetic replay timer inspection; the workspace
// data-plane owns the change-emit half and composes both.
export function inspectAcpSkillRunSoftPersistReplayTimers(
  requestIds: readonly string[],
): {
  foreignWarnings: string[];
  timers: AcpRuntimeReplayLogicalTimerDescriptor[];
} {
  const allowed = new Set(requestIds);
  const timers: AcpRuntimeReplayLogicalTimerDescriptor[] = [];
  const foreignWarnings: string[] = [];
  const foreignOwnerKeys = Array.from(softRunPersistTimers.keys()).filter(
    (requestId) => !allowed.has(requestId),
  );
  if (foreignOwnerKeys.length > 0) {
    foreignWarnings.push(
      `logical-timer-contamination:acp-skill-run-soft-persist:${foreignOwnerKeys.sort().join(",")}`,
    );
  }
  for (const requestId of requestIds) {
    const nativeToken = softRunPersistTimers.get(requestId);
    if (!nativeToken) continue;
    let currentToken = nativeToken;
    timers.push({
      domain: "acp-skill-run-soft-persist",
      ownerKey: requestId,
      delayMs: SOFT_RUN_PERSIST_DELAY_MS,
      nativeToken,
      detachNative: () => {
        if (softRunPersistTimers.get(requestId) !== currentToken) return false;
        clearTimeout(currentToken);
        return true;
      },
      fireIfCurrent: () => {
        if (softRunPersistTimers.get(requestId) !== currentToken) return false;
        softRunPersistTimers.delete(requestId);
        const pending = softRunPersistRecords.get(requestId);
        if (pending) {
          softRunPersistRecords.delete(requestId);
          persistRun(pending);
        }
        return true;
      },
      resumeNative: (remainingMs) => {
        if (softRunPersistTimers.get(requestId) !== currentToken) return false;
        currentToken = setTimeout(
          () => {
            softRunPersistTimers.delete(requestId);
            const pending = softRunPersistRecords.get(requestId);
            if (pending) {
              softRunPersistRecords.delete(requestId);
              persistRun(pending);
            }
          },
          Math.max(0, remainingMs),
        );
        softRunPersistTimers.set(requestId, currentToken);
        return true;
      },
      fallbackFlush: () => {
        if (softRunPersistTimers.get(requestId) !== currentToken) return false;
        const pending = softRunPersistRecords.get(requestId);
        if (pending) persistRun(pending);
        return true;
      },
    });
  }
  return { foreignWarnings, timers };
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
  if (!isTerminalStatus(record.status)) {
    return false;
  }
  if (!record.removedAt && !record.archivedAt) {
    return false;
  }
  const ts = retentionTimestampMs(record);
  return ts > 0 && ts < args.thresholdMs;
}

function isTerminalStatus(status: AcpSkillRunStatus) {
  return status === "succeeded" || status === "failed" || status === "canceled";
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
  ensureAcpSkillRunStoreHydrated();
  const runsByRequestId = new Map(
    Array.from(host.listRunRecords()).map(
      (run) => [run.requestId, run] as const,
    ),
  );
  let removedCount = 0;
  let terminalSyncedCount = 0;
  let recoverableCount = 0;
  let failedCount = 0;
  for (const run of runsByRequestId.values()) {
    if (!isTerminalStatus(run.status) || run.removedAt || run.archivedAt) {
      continue;
    }
    const staleConversationState =
      run.activePrompt ||
      run.pendingPermission ||
      run.replyState === "submitted" ||
      run.replyState === "accepted" ||
      run.connectionActionState === "connecting" ||
      run.connectionActionState === "disconnecting" ||
      run.conversationRecoveryState === "connecting" ||
      run.conversationRecoveryState === "connected";
    if (!staleConversationState) {
      continue;
    }
    const recoveryCandidate = host.isEligibleForPostTerminalConversation({
      ...run,
      activePrompt: false,
      pendingInteraction: undefined,
      pendingPermission: null,
      replyState: "idle",
      connectionActionState: "idle",
      conversationState: "closed",
      conversationRecoveryState: "available",
    });
    host.upsertAcpSkillRun({
      requestId: run.requestId,
      activePrompt: false,
      pendingInteraction: null,
      pendingPermission: null,
      replyState: "idle",
      promptInterruptState: "idle",
      connectionActionState: "idle",
      conversationState: "closed",
      conversationRecoveryState: recoveryCandidate
        ? "available"
        : run.conversationState === "ended"
          ? "unavailable"
          : run.conversationRecoveryState === "unsupported"
            ? "unsupported"
            : "unavailable",
      event: {
        stage: "startup-terminal-conversation-normalized",
        message:
          "Stale terminal ACP conversation activity was cleared after restart.",
        level: "info",
      },
    });
  }
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
    if (isTerminalStatus(run.status)) {
      terminalSyncedCount += 1;
      continue;
    }
    if (isRecoverableAcpSkillRunAfterStartup(run)) {
      if (
        run.conversationRecoveryState !== "available" ||
        run.conversationState !== "closed" ||
        run.activePrompt
      ) {
        host.upsertAcpSkillRun({
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
    host.upsertAcpSkillRun({
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

export function cleanupExpiredAcpSkillRunsForRetention(args: {
  retentionMs: number;
  nowMs?: number;
}): AcpSkillRunRetentionCleanupResult {
  ensureAcpSkillRunStoreHydrated();
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
  for (const record of Array.from(host.listRunRecords())) {
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
    host.deleteRunRecord(record.requestId);
    if (host.getSelectedRequestId() === record.requestId) {
      host.clearSelectedRequestId();
    }
    if (record.backendId && record.requestId) {
      removeWorkflowTasksByBackendAndRequestIds({
        backendId: record.backendId,
        requestIds: [record.requestId],
      });
    }
  }
  if (requestIds.length > 0) {
    host.emitWorkspaceChanged(
      host.createWorkspaceChange({ requestIds, kinds: ["archive"] }),
    );
  }
  return {
    rowsDeleted: requestIds.length,
    requestIds,
    workspaceDirs: Array.from(new Set(workspaceDirs)),
    runtimeDirs: Array.from(new Set(runtimeDirs)),
  };
}

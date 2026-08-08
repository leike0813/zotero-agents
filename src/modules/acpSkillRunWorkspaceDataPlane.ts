import {
  ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS,
  canPublishAssistantWorkspaceLiveUpdates,
} from "./assistantExecutionDisplayPolicy";
import { isDebugModeEnabled } from "./debugMode";
import { incrementAcpRuntimeMetric } from "./acpRuntimePerformanceProfiler";
import { readRuntimeTextFile } from "./runtimePersistence";
import { readAcpSkillRunOutputRevisions } from "./acpSkillRunPayloadStore";
import type {
  AcpRuntimeReplayLogicalTimerDescriptor,
  AcpRuntimeReplayLogicalTimerInspection,
} from "./acpRuntimeReplayLogicalTime";
import {
  getAcpSkillRunTranscriptMirrorCacheDiagnostics,
  type AcpSkillRunTranscriptLiveState,
} from "./acpSkillRunTranscriptMirror";
import {
  ensureAcpSkillRunStoreHydrated,
  inspectAcpSkillRunSoftPersistReplayTimers,
  parsePendingInteraction,
} from "./acpSkillRunPersistence";
import type {
  AcpSkillRunDiagnosticsDto,
  AcpSkillRunRecord,
  AcpSkillRunRuntimeCatalog,
  AcpSkillRunSummary,
  AcpSkillRunSummaryListOptions,
  AcpSkillRunWorkspaceChange,
  AcpSkillRunWorkspaceChangeKind,
  AcpSkillRunWorkspaceDetailsReadModel,
  AcpSkillRunWorkspaceListener,
  AcpSkillRunWorkspaceReadModel,
} from "./acpSkillRunStore";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

// Registry access owned by acpSkillRunStore (run records, active index,
// transcript live states, runtime catalogs). Injected once at module load
// so the data-plane never imports the store at runtime.
export type AcpSkillRunWorkspaceDataPlaneHost = {
  resolveRunRecord(requestId: string): AcpSkillRunRecord | undefined;
  listRunRecords(): Iterable<AcpSkillRunRecord>;
  listActiveRunRequestIds(): Iterable<string>;
  isActiveRecordForSummary(record: AcpSkillRunRecord): boolean;
  projectRunRecordMetadata(record: AcpSkillRunRecord): AcpSkillRunRecord;
  getTranscriptLiveState(
    record: AcpSkillRunRecord,
  ): AcpSkillRunTranscriptLiveState;
  peekTranscriptLiveState(
    requestId: string,
  ): AcpSkillRunTranscriptLiveState | undefined;
  runtimeCatalogForRun(run: AcpSkillRunRecord): AcpSkillRunRuntimeCatalog;
};

let host: AcpSkillRunWorkspaceDataPlaneHost;

export function configureAcpSkillRunWorkspaceDataPlaneHost(
  nextHost: AcpSkillRunWorkspaceDataPlaneHost,
) {
  host = nextHost;
}

const ACP_SKILL_RUN_WORKSPACE_CHANGE_KINDS =
  new Set<AcpSkillRunWorkspaceChangeKind>([
    "run",
    "transcript",
    "plan",
    "progress",
    "runtime-options",
    "selection",
    "archive",
    "global",
  ]);

export function createAcpSkillRunWorkspaceChange(
  change?: AcpSkillRunWorkspaceChange | null,
): AcpSkillRunWorkspaceChange {
  if (!change) {
    return Object.freeze({
      global: true,
      kinds: Object.freeze(["global"] as const),
    });
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
        (kind): kind is AcpSkillRunWorkspaceChangeKind =>
          ACP_SKILL_RUN_WORKSPACE_CHANGE_KINDS.has(kind),
      ),
    ),
  );
  const global = change.global === true || kinds.includes("global");
  if (global) {
    return Object.freeze({
      global: true,
      kinds: Object.freeze(
        Array.from(
          new Set<AcpSkillRunWorkspaceChangeKind>([...kinds, "global"]),
        ),
      ),
    });
  }
  if (requestIds.length === 0 && kinds.length === 0) {
    return Object.freeze({
      global: true,
      kinds: Object.freeze(["global"] as const),
    });
  }
  const transcriptEvents = change.transcriptEvents
    ? [...change.transcriptEvents]
    : undefined;
  for (const event of transcriptEvents || []) {
    Object.freeze(event.mutation);
    Object.freeze(event);
  }
  return Object.freeze({
    requestIds: requestIds.length > 0 ? Object.freeze(requestIds) : undefined,
    kinds: kinds.length > 0 ? Object.freeze(kinds) : undefined,
    transcriptEvents: transcriptEvents
      ? Object.freeze(transcriptEvents)
      : undefined,
    transcriptEventSeq: change.transcriptEventSeq,
    transcriptItemCount: change.transcriptItemCount,
  });
}

function mergeAcpSkillRunWorkspaceChanges(
  current: AcpSkillRunWorkspaceChange | null,
  next: AcpSkillRunWorkspaceChange,
): AcpSkillRunWorkspaceChange {
  if (!current) {
    return next;
  }
  if (current.global || next.global) {
    return Object.freeze({
      global: true,
      kinds: Object.freeze(
        Array.from(
          new Set<AcpSkillRunWorkspaceChangeKind>([
            ...(current.kinds || []),
            ...(next.kinds || []),
            "global",
          ]),
        ),
      ),
    });
  }
  return Object.freeze({
    requestIds: Object.freeze(
      Array.from(
        new Set([...(current.requestIds || []), ...(next.requestIds || [])]),
      ),
    ),
    kinds: Object.freeze(
      Array.from(new Set([...(current.kinds || []), ...(next.kinds || [])])),
    ),
    transcriptEvents: Object.freeze([
      ...(current.transcriptEvents || []),
      ...(next.transcriptEvents || []),
    ]),
    transcriptEventSeq: Math.max(
      current.transcriptEventSeq || 0,
      next.transcriptEventSeq || 0,
    ),
    transcriptItemCount:
      next.transcriptItemCount ?? current.transcriptItemCount,
  });
}

function acpSkillRunWorkspaceChangePartitionKey(
  change: AcpSkillRunWorkspaceChange,
) {
  if (change.global) return "source:global";
  const requestIds = change.requestIds || [];
  if (requestIds.length === 1) return `owner:${requestIds[0]}`;
  return `source:${[...requestIds].sort().join("\n") || "unowned"}:${[
    ...(change.kinds || []),
  ]
    .sort()
    .join(",")}`;
}

let changedEmitTimer: ReturnType<typeof setTimeout> | null = null;
const pendingWorkspaceChanges = new Map<string, AcpSkillRunWorkspaceChange>();
const workspaceListeners = new Set<AcpSkillRunWorkspaceListener>();

function enqueuePendingAcpSkillRunWorkspaceChange(
  change: AcpSkillRunWorkspaceChange,
) {
  const key = acpSkillRunWorkspaceChangePartitionKey(change);
  pendingWorkspaceChanges.set(
    key,
    mergeAcpSkillRunWorkspaceChanges(
      pendingWorkspaceChanges.get(key) || null,
      change,
    ),
  );
}

function takePendingAcpSkillRunWorkspaceChanges() {
  const changes = [...pendingWorkspaceChanges.values()];
  pendingWorkspaceChanges.clear();
  return changes;
}

function publishPendingAcpSkillRunTranscripts() {
  // The store-owned mirror is updated synchronously before transcript deltas
  // are emitted; JSONL writes remain asynchronous persistence only.
}

export function acpSkillRunWorkspaceChange(
  requestId: string,
  kinds: AcpSkillRunWorkspaceChangeKind[],
): AcpSkillRunWorkspaceChange {
  const normalizedRequestId = normalizeString(requestId);
  const record = normalizedRequestId
    ? host.resolveRunRecord(normalizedRequestId)
    : undefined;
  const state = record ? host.getTranscriptLiveState(record) : undefined;
  const hasTranscript = kinds.includes("transcript");
  const transcriptEvents = hasTranscript
    ? state?.workspaceTranscriptEvents.splice(0) || []
    : [];
  return createAcpSkillRunWorkspaceChange({
    requestIds: normalizedRequestId ? [normalizedRequestId] : undefined,
    kinds: Object.freeze([...kinds]),
    ...(transcriptEvents.length > 0
      ? {
          transcriptEvents,
          transcriptEventSeq:
            state?.transcriptEventSeq || record?.transcriptEventSeq || 0,
          transcriptItemCount:
            state?.transcriptItemCount || record?.transcriptItemCount || 0,
        }
      : {}),
  });
}

export function emitWorkspaceChanged(change?: AcpSkillRunWorkspaceChange) {
  if (changedEmitTimer) {
    clearTimeout(changedEmitTimer);
    changedEmitTimer = null;
  }
  if (change) {
    enqueuePendingAcpSkillRunWorkspaceChange(
      createAcpSkillRunWorkspaceChange(change),
    );
  }
  const emittedChanges = takePendingAcpSkillRunWorkspaceChanges();
  if (emittedChanges.length === 0) {
    emittedChanges.push(createAcpSkillRunWorkspaceChange());
  }
  for (const emittedChange of emittedChanges) {
    if (
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      const requestId = emittedChange.requestIds?.[0];
      for (const kind of emittedChange.kinds || ["global"]) {
        incrementAcpRuntimeMetric(requestId, "change_emitted", {
          changeKind: kind === "selection" ? "other" : kind,
        });
      }
    }
    for (const listener of workspaceListeners) {
      listener(emittedChange);
    }
  }
}

export function scheduleWorkspaceChangedEmit(
  change?: AcpSkillRunWorkspaceChange,
) {
  const immutableChange = createAcpSkillRunWorkspaceChange(change);
  enqueuePendingAcpSkillRunWorkspaceChange(immutableChange);
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    const requestId = immutableChange.requestIds?.[0];
    for (const kind of immutableChange.kinds || ["global"]) {
      incrementAcpRuntimeMetric(requestId, "change_requested", {
        changeKind: kind === "selection" ? "other" : kind,
      });
    }
    if (changedEmitTimer) {
      incrementAcpRuntimeMetric(requestId, "change_coalesced");
    }
  }
  if (changedEmitTimer) {
    return;
  }
  changedEmitTimer = setTimeout(() => {
    changedEmitTimer = null;
    if (canPublishAssistantWorkspaceLiveUpdates()) {
      publishPendingAcpSkillRunTranscripts();
    }
    emitWorkspaceChanged();
  }, ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS);
}

export function subscribeAcpSkillRunWorkspaceChanges(
  listener: AcpSkillRunWorkspaceListener,
) {
  workspaceListeners.add(listener);
  return () => {
    workspaceListeners.delete(listener);
  };
}

export function resetAcpSkillRunWorkspaceDataPlaneForTests() {
  if (changedEmitTimer) {
    clearTimeout(changedEmitTimer);
    changedEmitTimer = null;
  }
  pendingWorkspaceChanges.clear();
  workspaceListeners.clear();
}

export function inspectSyntheticAcpSkillRunReplayTimers(args: {
  requestIds: readonly string[];
}): AcpRuntimeReplayLogicalTimerInspection {
  if (
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) ||
    !__acp_runtime_replay_profiler_enabled__
  ) {
    return { timers: [], warnings: [] };
  }
  const requestIds = Array.from(
    new Set(
      args.requestIds.map((entry) => normalizeString(entry)).filter(Boolean),
    ),
  ).sort();
  const allowed = new Set(requestIds);
  const timers: AcpRuntimeReplayLogicalTimerDescriptor[] = [];
  const warnings: string[] = [];
  const softPersist = inspectAcpSkillRunSoftPersistReplayTimers(requestIds);
  warnings.push(...softPersist.foreignWarnings);

  if (changedEmitTimer) {
    const pending = [...pendingWorkspaceChanges.values()];
    const pendingRequestIds = pending.flatMap(
      (change) => change.requestIds || [],
    );
    const owned =
      pending.length > 0 &&
      pending.every((change) => !change.global) &&
      pendingRequestIds.length > 0 &&
      pendingRequestIds.every((requestId) => allowed.has(requestId));
    if (!owned) {
      warnings.push("logical-timer-contamination:acp-skill-run-change");
    } else {
      const nativeToken = changedEmitTimer;
      let currentToken = nativeToken;
      timers.push({
        domain: "acp-skill-run-change",
        ownerKey: requestIds.join("\n"),
        delayMs: ASSISTANT_WORKSPACE_LIVE_PUBLISH_MS,
        nativeToken,
        detachNative: () => {
          if (changedEmitTimer !== currentToken) return false;
          clearTimeout(currentToken);
          return true;
        },
        fireIfCurrent: () => {
          if (changedEmitTimer !== currentToken) return false;
          changedEmitTimer = null;
          if (canPublishAssistantWorkspaceLiveUpdates()) {
            publishPendingAcpSkillRunTranscripts();
          }
          emitWorkspaceChanged();
          return true;
        },
        resumeNative: (remainingMs) => {
          if (changedEmitTimer !== currentToken) return false;
          currentToken = setTimeout(
            () => {
              changedEmitTimer = null;
              if (canPublishAssistantWorkspaceLiveUpdates()) {
                publishPendingAcpSkillRunTranscripts();
              }
              emitWorkspaceChanged();
            },
            Math.max(0, remainingMs),
          );
          changedEmitTimer = currentToken;
          return true;
        },
      });
    }
  }

  timers.push(...softPersist.timers);
  return { timers, warnings };
}

const acpSkillRunSummaryDiagnostics = {
  summaryQueryCount: 0,
  fullRunRecordScanCount: 0,
  activeIndexScanCount: 0,
  runCandidateReadCount: 0,
};

function isActiveAcpSkillRunForSummary(run: AcpSkillRunRecord) {
  return host.isActiveRecordForSummary(run);
}

function normalizeSummaryListLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

export function listAcpSkillRuns() {
  ensureAcpSkillRunStoreHydrated();
  return Array.from(host.listRunRecords())
    .map((entry) => host.projectRunRecordMetadata(entry))
    .sort((a, b) => {
      const created = b.createdAt.localeCompare(a.createdAt);
      if (created !== 0) return created;
      return b.requestId.localeCompare(a.requestId);
    });
}

export function listAcpSkillRunSummaries(
  options: AcpSkillRunSummaryListOptions = {},
) {
  ensureAcpSkillRunStoreHydrated();
  const backendId = String(options.backendId || "").trim();
  const requestId = String(options.requestId || "").trim();
  const limit = normalizeSummaryListLimit(options.limit);
  acpSkillRunSummaryDiagnostics.summaryQueryCount += 1;
  const candidates = requestId
    ? [host.resolveRunRecord(requestId)].filter(
        (run): run is AcpSkillRunRecord => !!run,
      )
    : options.activeOnly && !options.includeArchived
      ? Array.from(host.listActiveRunRequestIds())
          .map((id) => host.resolveRunRecord(id))
          .filter((run): run is AcpSkillRunRecord => !!run)
      : Array.from(host.listRunRecords());
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
  ensureAcpSkillRunStoreHydrated();
  acpSkillRunSummaryDiagnostics.summaryQueryCount += 1;
  acpSkillRunSummaryDiagnostics.activeIndexScanCount += 1;
  const backendId = normalizeString(options.backendId);
  let count = 0;
  for (const requestId of host.listActiveRunRequestIds()) {
    const run = host.resolveRunRecord(requestId);
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

export function getAcpSkillRunTranscriptMirrorDiagnosticsForTests(
  requestIdRaw: string,
) {
  ensureAcpSkillRunStoreHydrated();
  const requestId = normalizeString(requestIdRaw);
  const state = requestId ? host.peekTranscriptLiveState(requestId) : undefined;
  const cacheDiagnostics =
    getAcpSkillRunTranscriptMirrorCacheDiagnostics(requestId);
  if (!state) {
    return {
      mirrorLoaded: false,
      itemCount: 0,
      eventSeq: 0,
      needsHydrate: false,
      hydrateState: undefined,
      coldMirrorCached: cacheDiagnostics.cached,
      coldMirrorCacheSize: cacheDiagnostics.size,
    };
  }
  return {
    mirrorLoaded: state.transcriptMirrorLoaded,
    itemCount: state.transcriptItemIds.length,
    eventSeq: state.transcriptEventSeq,
    needsHydrate: state.needsHydrate === true,
    hydrateState: state.transcriptHydrateState,
    coldMirrorCached: cacheDiagnostics.cached,
    coldMirrorCacheSize: cacheDiagnostics.size,
  };
}

export function getAcpSkillRunWorkspaceReadModel(
  requestIdRaw: string,
): AcpSkillRunWorkspaceReadModel | null {
  ensureAcpSkillRunStoreHydrated();
  const requestId = normalizeString(requestIdRaw);
  const run = requestId ? host.resolveRunRecord(requestId) : undefined;
  if (!run) return null;
  return Object.freeze({
    requestId: run.requestId,
    status: run.status,
    backendStatus: run.backendStatus,
    backendId: run.backendId,
    backendLabel: run.backendLabel,
    workflowId: run.workflowId,
    workflowLabel: run.workflowLabel,
    submissionId: run.submissionId,
    submissionUnitId: run.submissionUnitId,
    sequenceStepId: run.sequenceStepId,
    sequenceStepIndex: run.sequenceStepIndex,
    taskName: run.taskName,
    skillName: run.skillName,
    skillId: run.skillId,
    workspaceDir: run.workspaceDir,
    runtimeDir: run.runtimeDir,
    sessionId: run.sessionId,
    acpModeId: run.acpModeId,
    acpModelId: run.acpModelId,
    acpModelProvider: run.acpModelProvider,
    acpRawModelId: run.acpRawModelId,
    acpReasoningEffort: run.acpReasoningEffort,
    activePrompt: run.activePrompt === true,
    pendingPermission: run.pendingPermission
      ? {
          ...run.pendingPermission,
          options: run.pendingPermission.options.map((option) => ({
            ...option,
          })),
        }
      : null,
    pendingInteraction: run.pendingInteraction
      ? parsePendingInteraction(run.pendingInteraction)
      : undefined,
    outputRevisionCount: Math.max(0, run.outputRevisionCount || 0),
    conversationState: run.conversationState,
    conversationRecoveryState: run.conversationRecoveryState,
    conversationError: run.conversationError,
    replyState: run.replyState,
    connectionActionState: run.connectionActionState,
    promptInterruptState: run.promptInterruptState,
    applyResultState: run.applyResultState,
    error: run.error,
    usage: run.usage ? { ...run.usage } : undefined,
    planEntries: (run.planEntries || []).map((entry) => ({ ...entry })),
    updatedAt: run.updatedAt,
    runtimeOptions: host.runtimeCatalogForRun(run),
  });
}

export async function getAcpSkillRunWorkspaceDetailsReadModel(
  requestIdRaw: string,
): Promise<AcpSkillRunWorkspaceDetailsReadModel | null> {
  ensureAcpSkillRunStoreHydrated();
  const requestId = normalizeString(requestIdRaw);
  const run = requestId ? host.resolveRunRecord(requestId) : undefined;
  if (!run) return null;
  const resultJsonPath = normalizeString(run.resultJsonPath);
  const [outputRevisions, resultJsonText] = await Promise.all([
    readAcpSkillRunOutputRevisions(run.runtimeDir).catch(() => []),
    resultJsonPath
      ? readRuntimeTextFile(resultJsonPath).catch(() => "")
      : Promise.resolve(""),
  ]);
  return Object.freeze({
    requestId: run.requestId,
    workspaceDir: normalizeString(run.workspaceDir),
    runtimeDir: normalizeString(run.runtimeDir),
    inputManifestPath: normalizeString(run.inputManifestPath),
    resultJsonPath: normalizeString(run.resultJsonPath),
    backend: normalizeString(run.backendLabel || run.backendId),
    agentFamily: normalizeString(run.agentFamily),
    acpModeId: normalizeString(run.acpModeId),
    acpModelId: normalizeString(run.acpModelId),
    acpRawModelId: normalizeString(run.acpRawModelId),
    acpReasoningEffort: normalizeString(run.acpReasoningEffort),
    skillId: normalizeString(run.skillId),
    skillRoots: (run.skillRoots || []).map(normalizeString).filter(Boolean),
    sessionId: normalizeString(run.sessionId),
    validationStatus: normalizeString(run.validationStatus),
    repairRounds: Math.max(0, Number(run.repairRounds) || 0),
    validationErrors: (run.validationErrors || [])
      .map(normalizeString)
      .filter(Boolean),
    error: normalizeString(run.error),
    conversationError: normalizeString(run.conversationError),
    conversationState: normalizeString(run.conversationState),
    applyResultState: normalizeString(run.applyResultState),
    appliedAt: normalizeString(run.appliedAt),
    runtimeDependencyStatus: normalizeString(run.runtimeDependencyStatus),
    runtimeDependencies: (run.runtimeDependencies || [])
      .map(normalizeString)
      .filter(Boolean),
    runtimeDependencyError: normalizeString(run.runtimeDependencyError),
    outputRevisions: outputRevisions.slice(-20).map((entry) => ({
      ...entry,
      candidateText: String(entry.candidateText || "").slice(0, 4_000),
      errors: entry.errors
        ?.slice(0, 20)
        .map((error) => String(error).slice(0, 1_000)),
    })),
    runtimeLogs: run.events.slice(-20).map((entry) => ({ ...entry })),
    resultJsonText: String(resultJsonText || "").slice(0, 40_000),
  });
}

export function getAcpSkillRunDiagnostics(
  requestIdRaw: string,
): AcpSkillRunDiagnosticsDto | null {
  ensureAcpSkillRunStoreHydrated();
  const requestId = normalizeString(requestIdRaw);
  const run = requestId ? host.resolveRunRecord(requestId) : undefined;
  if (!run) return null;
  return Object.freeze({
    requestId: run.requestId,
    status: run.status,
    backendId: run.backendId,
    workflowId: normalizeString(run.workflowId) || null,
    skillId: normalizeString(run.skillId) || null,
    workspaceDir: normalizeString(run.workspaceDir) || null,
    runtimeDir: normalizeString(run.runtimeDir) || null,
    sessionId: normalizeString(run.sessionId) || null,
    error: normalizeString(run.error) || null,
    updatedAt: run.updatedAt,
  });
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
    submissionId: run.submissionId,
    submissionUnitId: run.submissionUnitId,
    sequenceStepId: run.sequenceStepId,
    sequenceStepIndex: run.sequenceStepIndex,
    sequenceFinalStepId: run.sequenceFinalStepId,
    sequenceRole: run.sequenceStepId ? "sequence_step" : "single",
    taskName: run.taskName,
    skillName: run.skillName,
    skillLabel: run.skillLabel,
    skillId: run.skillId,
    executionMode: run.executionMode,
    workspaceDir: run.workspaceDir,
    acpModeId: run.acpModeId,
    acpModelId: run.acpModelId,
    acpModelProvider: run.acpModelProvider,
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
    promptInterruptState: run.promptInterruptState,
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

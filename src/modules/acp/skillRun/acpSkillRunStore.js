import { ACP_BACKEND_TYPE } from "../../../config/defaults";
import { clearPluginRunStore, deletePluginRunStoreEntry, } from "../../pluginStateStore";
import { isAssistantSilentExecutionMode } from "../../assistant/publication/assistantExecutionDisplayPolicy";
import { finishAcpExecutionProgress, releaseAcpExecutionProgress, resetAcpExecutionProgress, snapshotAcpMessageCounts, } from "../transport/acpExecutionProgress";
import { isDebugModeEnabled } from "../../debugMode";
import { finishAcpRuntimeProfile } from "../diagnostics/acpRuntimePerformanceProfiler";
import { recordAcpRuntimeSemanticTraceRequestTerminal } from "../diagnostics/acpRuntimeSemanticTraceRecorder";
import { normalizeAcpPromptInterruptState } from "../../acpTypes";
import { updateWorkflowTaskStateByRequest } from "../../taskRuntime";
import { applySequenceRunEvent, getSequenceRunStateByStepRequest, getSequenceStepIndexByRequestId, } from "../../workflowExecution/sequenceStateStore";
import { resetAcpTranscriptWritesForTests } from "./acpSkillRunTranscriptStore";
import { appendAcpSkillRunOutputRevision, resolveAcpSkillRunPayloadPaths, } from "./acpSkillRunPayloadStore";
import { acpSkillRunApplyResultControllerDetachPromises as applyResultControllerDetachPromises, acpSkillRunControllerPurposes as controllerPurposes, acpSkillRunControllers as controllers, acpSkillRunPermissionQueuesByRunRequestId as permissionQueuesByRunRequestId, acpSkillRunRecords as runRecords, acpSkillRunRuntimeCatalogByRequestId as runtimeCatalogByRequestId, acpSkillRunSetupControllers as setupControllers, getAcpSkillRunSelectedRequestId, normalizeString, nowIso, setAcpSkillRunSelectedRequestId, } from "./acpSkillRunState";
import { isActiveAcpSkillRunStatus, isEligibleForPostTerminalAcpSkillRunConversation, isTerminalAcpSkillRunStatus, } from "./acpSkillRunStatus";
import { registerAcpSkillRunAutoApprovalResolver, revokeHostBridgeWriteAutoApprovalGrantsForRun, } from "../../hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry";
import { configureAcpSkillRunPersistenceHost, configureAcpSkillRunTranscriptMirrorHost, configureAcpSkillRunWorkspaceDataPlaneHost, } from "./acpSkillRunHosts";
import { clearAcpSkillRunTranscriptMirrorLru, cloneAcpSkillRunTranscriptItem, forgetColdAcpSkillRunTranscriptMirror, nextAcpSkillRunTranscriptItemId, pruneInactiveAcpSkillRunTranscriptMirrors, queueAcpSkillRunTranscriptEvent, } from "./acpSkillRunTranscriptMirror";
import { cloneRuntimeCatalog, deriveAcpSkillRunRuntimeFileMetadata, ensureAcpSkillRunStoreHydrated, flushAcpSkillRunRuntimeFileWrites, invalidateAcpSkillRunPersistenceHydration, normalizeOptionalNonNegativeInteger, parsePendingInteraction, persistRun, resetAcpSkillRunPersistenceForTests, scheduleSoftRunPersist, trackAcpSkillRunRuntimeFileWrite, truncateAcpSkillRunPreview, updateTouchesAcpSkillRunContext, } from "./acpSkillRunPersistence";
import { acpSkillRunWorkspaceChange, createAcpSkillRunWorkspaceChange, emitWorkspaceChanged, resetAcpSkillRunSummaryDiagnosticsForTests, resetAcpSkillRunWorkspaceDataPlaneForTests, scheduleWorkspaceChangedEmit, } from "./acpSkillRunWorkspaceDataPlane";
export { appendAcpSkillRunHardTimeoutTranscriptNotice, completeAcpSkillRunTranscriptTurnBoundary, hydrateAcpSkillRunTranscriptMirror, readAcpSkillRunTranscriptRegion, readAcpSkillRunTranscriptRegionFromMemoryForTests, recordAcpSkillRunSessionUpdate, } from "./acpSkillRunTranscriptMirror";
export { cleanupExpiredAcpSkillRunsForRetention, ensureAcpSkillRunStoreHydrated, flushAcpSkillRunRuntimeFileWrites, flushAcpSkillRunRuntimeFileWritesForTests, reconcileAcpSkillRunWorkflowTasksOnStartup, } from "./acpSkillRunPersistence";
export { countActiveAcpSkillRunSummaries, getAcpSkillRunDiagnostics, getAcpSkillRunSummaryDiagnosticsForTests, getAcpSkillRunTranscriptMirrorDiagnosticsForTests, getAcpSkillRunWorkspaceDetailsReadModel, getAcpSkillRunWorkspaceReadModel, listAcpSkillRuns, listAcpSkillRunSummaries, resetAcpSkillRunSummaryDiagnosticsForTests, subscribeAcpSkillRunWorkspaceChanges, } from "./acpSkillRunWorkspaceDataPlane";
const transcriptLiveStates = new Map();
const waitingUserDetachTimers = new Map();
configureAcpSkillRunTranscriptMirrorHost({
    ensureHydrated: () => ensureAcpSkillRunStoreHydrated(),
    resolveRunRecord: (requestId) => runRecords.get(requestId),
    getTranscriptLiveState: (record) => getAcpSkillRunTranscriptLiveState(record),
    peekTranscriptLiveState: (requestId) => transcriptLiveStates.get(requestId),
    listTranscriptLiveStates: () => transcriptLiveStates.entries(),
    getSelectedRequestId: () => getAcpSkillRunSelectedRequestId(),
    isLifecycleOpen: (record) => isAcpSkillRunLifecycleOpen(record),
    setAcpSkillRunRecord: (record) => setAcpSkillRunRecord(record),
    persistRun: (record) => persistRun(record),
    scheduleSoftRunPersist: (record) => scheduleSoftRunPersist(record),
    emitWorkspaceChanged: (change) => emitWorkspaceChanged(change),
    scheduleWorkspaceChangedEmit: (change) => scheduleWorkspaceChangedEmit(change),
    acpSkillRunWorkspaceChange: (requestId, kinds) => acpSkillRunWorkspaceChange(requestId, kinds),
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
    isEligibleForPostTerminalConversation: (record) => isEligibleForPostTerminalAcpSkillRunConversation(record),
    getSelectedRequestId: () => getAcpSkillRunSelectedRequestId(),
    clearSelectedRequestId: () => {
        setAcpSkillRunSelectedRequestId("");
    },
    peekTranscriptLiveState: (requestId) => transcriptLiveStates.get(requestId),
    acpSkillRunWorkspaceChange: (requestId, kinds) => acpSkillRunWorkspaceChange(requestId, kinds),
    createWorkspaceChange: (change) => createAcpSkillRunWorkspaceChange(change),
    emitWorkspaceChanged: (change) => emitWorkspaceChanged(change),
});
configureAcpSkillRunWorkspaceDataPlaneHost({
    resolveRunRecord: (requestId) => runRecords.get(requestId),
    listRunRecords: () => runRecords.values(),
    listActiveRunRequestIds: () => activeRunRequestIds.values(),
    isActiveRecordForSummary: (record) => isActiveAcpSkillRunRecordForSummary(record),
    projectRunRecordMetadata: (record) => projectAcpSkillRunMetadataRecord(record),
    getTranscriptLiveState: (record) => getAcpSkillRunTranscriptLiveState(record),
    peekTranscriptLiveState: (requestId) => transcriptLiveStates.get(requestId),
    runtimeCatalogForRun: (run) => runtimeCatalogForRun(run),
});
let recoveryHandler = null;
const activeRunRequestIds = new Set();
const ACP_SKILL_RUN_WAITING_USER_LIVE_TTL_MS = 30 * 60 * 1000;
function getAcpSkillRunTranscriptLiveState(record) {
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
function isAcpSkillRunLifecycleOpen(record) {
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
    if (record.connectionActionState === "connecting" ||
        record.connectionActionState === "disconnecting") {
        return true;
    }
    return (record.conversationRecoveryState === "connecting" ||
        record.conversationRecoveryState === "connected");
}
function isActiveAcpSkillRunRecordForSummary(record) {
    return (!record.removedAt &&
        !record.archivedAt &&
        isActiveAcpSkillRunStatus(record.status));
}
function syncAcpSkillRunActiveIndex(record) {
    if (isActiveAcpSkillRunRecordForSummary(record)) {
        activeRunRequestIds.add(record.requestId);
    }
    else {
        activeRunRequestIds.delete(record.requestId);
    }
}
function propagateAcpSkillRunTerminalState(record) {
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
    applySequenceRunEvent({
        type: "sequence.step.terminal",
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
function setAcpSkillRunRecord(record) {
    const previous = runRecords.get(record.requestId);
    const metadata = deriveAcpSkillRunRuntimeFileMetadata(record);
    const next = {
        ...record,
        requestPayload: undefined,
        runnerJson: undefined,
        resultJson: undefined,
        lastTurnOutput: undefined,
        lastTurnOutputPreview: record.lastTurnOutputPreview ||
            truncateAcpSkillRunPreview(record.lastTurnOutput),
        pendingInteraction: parsePendingInteraction(record.pendingInteraction),
        transcriptPath: metadata.transcriptPath || record.transcriptPath,
        transcriptIndexPath: metadata.transcriptIndexPath || record.transcriptIndexPath,
        transcriptRevision: metadata.transcriptRevision,
        transcriptEventSeq: metadata.transcriptEventSeq,
        transcriptItemCount: metadata.transcriptItemCount,
        transcriptPreview: metadata.transcriptPreview,
        outputRevisionsPath: metadata.outputRevisionsPath || record.outputRevisionsPath,
        outputRevisionCount: metadata.outputRevisionCount,
        outputRevisionPreview: metadata.outputRevisionPreview,
        runContextPath: metadata.runContextPath || record.runContextPath,
    };
    delete next.transcriptItems;
    delete next.outputRevisions;
    runRecords.set(record.requestId, next);
    if ((next.status === "failed" || next.status === "canceled") &&
        previous?.status !== next.status) {
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
export function clearWaitingUserDetachTimer(requestId) {
    const timer = waitingUserDetachTimers.get(requestId);
    if (timer) {
        clearTimeout(timer);
        waitingUserDetachTimers.delete(requestId);
    }
}
export function syncWaitingUserDetachTimer(record) {
    const requestId = record.requestId;
    if (record.status !== "waiting_user" || !controllers.has(requestId)) {
        clearWaitingUserDetachTimer(requestId);
        return;
    }
    if (waitingUserDetachTimers.has(requestId)) {
        return;
    }
    waitingUserDetachTimers.set(requestId, setTimeout(() => {
        waitingUserDetachTimers.delete(requestId);
        const current = runRecords.get(requestId);
        const controller = controllers.get(requestId);
        if (current?.status !== "waiting_user" || !controller?.disconnect) {
            return;
        }
        void controller.disconnect().catch(() => {
            // Mirrors registerAcpSkillRunController(requestId, null); inlined here
            // so the record pipeline does not import the controller registry
            // module (the registry already depends on this store for upserts).
            controllers.delete(requestId);
            controllerPurposes.delete(requestId);
            clearWaitingUserDetachTimer(requestId);
            cancelAcpSkillRunPermissionQueue(requestId, "controller_removed_with_pending_permission");
        });
    }, ACP_SKILL_RUN_WAITING_USER_LIVE_TTL_MS));
}
function cloneAcpSkillRunRecord(record) {
    return {
        ...record,
        transcriptItems: record.transcriptItems?.map((item) => cloneAcpSkillRunTranscriptItem(item)),
        pendingInteraction: record.pendingInteraction
            ? { ...record.pendingInteraction }
            : undefined,
        planEntries: record.planEntries?.map((item) => ({ ...item })),
        events: record.events.map((event) => ({ ...event })),
    };
}
function projectAcpSkillRunMetadataRecord(record) {
    const cloned = cloneAcpSkillRunRecord(record);
    delete cloned.requestPayload;
    delete cloned.runnerJson;
    delete cloned.resultJson;
    delete cloned.lastTurnOutput;
    delete cloned.transcriptItems;
    delete cloned.outputRevisions;
    if (cloned.pendingInteraction) {
        cloned.pendingInteraction = parsePendingInteraction(cloned.pendingInteraction);
    }
    return cloned;
}
function deleteAcpSkillRunRecord(requestId) {
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
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function toolEventTime(item) {
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
function shouldShowEventInTranscript(stage) {
    const normalized = normalizeString(stage);
    return (ACP_SKILL_RUN_TRANSCRIPT_EVENT_STAGES.has(normalized) &&
        (!isAssistantSilentExecutionMode() ||
            ACP_SKILL_RUN_SILENT_CRITICAL_STAGES.has(normalized)));
}
function permissionStatusFromResolution(details) {
    const outcome = normalizeString(details.outcome);
    const optionId = normalizeString(details.optionId).toLowerCase();
    if (outcome === "cancelled" || outcome === "canceled") {
        return "cancelled";
    }
    if (optionId.includes("deny") ||
        optionId.includes("reject") ||
        optionId.includes("cancel")) {
        return "denied";
    }
    return "approved";
}
function upsertPermissionTranscriptItem(record, event) {
    const details = event.details || {};
    const permissionRequestId = normalizeString(details.permissionRequestId) ||
        normalizeString(details.requestId);
    if (!permissionRequestId) {
        return false;
    }
    const state = getAcpSkillRunTranscriptLiveState(record);
    const previousId = state.permissionItemIds.get(permissionRequestId);
    const status = event.stage === "permission-resolved"
        ? permissionStatusFromResolution(details)
        : "pending";
    const itemId = previousId || nextAcpSkillRunTranscriptItemId(record, "permission", state);
    const item = {
        id: itemId,
        kind: "permission",
        permissionRequestId,
        status,
        title: normalizeString(details.toolTitle) || "Permission request",
        summary: normalizeString(details.summary) ||
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
function appendStatusTranscriptItem(record, event) {
    const text = normalizeString(event.message);
    if (!text || !shouldShowEventInTranscript(event.stage)) {
        return false;
    }
    if ((event.stage === "permission-requested" ||
        event.stage === "permission-resolved") &&
        upsertPermissionTranscriptItem(record, event)) {
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
    const item = {
        id: nextAcpSkillRunTranscriptItemId(record, "status", state),
        kind: "status",
        level: event.level,
        label: event.stage,
        text: event.stage === "workspace-activity"
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
function isAllowedNonTerminalAcpSkillRunTransition(args) {
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
        return (next === "running" ||
            next === "waiting_user" ||
            next === "repairing" ||
            next === "failed" ||
            next === "canceled");
    }
    if (current === "running" ||
        current === "waiting_user" ||
        current === "repairing") {
        return (next === "running" ||
            next === "waiting_user" ||
            next === "repairing" ||
            next === "failed_retriable" ||
            next === "succeeded" ||
            next === "failed" ||
            next === "canceled");
    }
    return false;
}
function resolveAcpSkillRunStatusTransition(args) {
    const { current, next, reason } = args;
    if (!current || current === next) {
        return next;
    }
    if (isTerminalAcpSkillRunStatus(current)) {
        throw new Error(`Illegal ACP skill run status transition for ${args.requestId}: terminal ${current} cannot transition to ${next}.`);
    }
    if (!reason) {
        return next;
    }
    if (isAllowedNonTerminalAcpSkillRunTransition({ current, next, reason })) {
        return next;
    }
    throw new Error(`Illegal ACP skill run status transition for ${args.requestId}: ${current} -> ${next} (${reason}).`);
}
export function upsertAcpSkillRun(update) {
    ensureAcpSkillRunStoreHydrated();
    const requestId = normalizeString(update.requestId);
    if (!requestId) {
        throw new Error("ACP skill run update requires requestId");
    }
    const incomingBackendType = normalizeString(update.backendType);
    if (incomingBackendType && incomingBackendType !== ACP_BACKEND_TYPE) {
        throw new Error(`ACP skill run store rejected non-ACP backend type: ${incomingBackendType}`);
    }
    const now = nowIso();
    const existing = runRecords.get(requestId);
    const next = {
        ...(existing || {
            requestId,
            status: "queued",
            backendId: "",
            backendType: "acp",
            conversationState: "starting",
            conversationRecoveryState: "unavailable",
            replyState: "idle",
            connectionActionState: "idle",
            skillRunPipelineVersion: "legacy",
            repairRounds: 0,
            createdAt: now,
            updatedAt: now,
            events: [],
        }),
        updatedAt: now,
    };
    if (!existing) {
        resetAcpExecutionProgress(requestId);
        next.messageCounts = snapshotAcpMessageCounts(requestId);
    }
    const assignString = (key, value) => {
        const normalized = normalizeString(value);
        if (normalized) {
            next[key] = normalized;
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
    }
    else if (update.status &&
        isTerminalAcpSkillRunStatus(update.status) &&
        update.applyResultState !== "failed") {
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
        const sequenceStepIndex = normalizeOptionalNonNegativeInteger(update.sequenceStepIndex);
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
    if (update.executionMode === "auto" ||
        update.executionMode === "interactive") {
        next.executionMode = update.executionMode;
    }
    if (update.skillRunPipelineVersion === "legacy" ||
        update.skillRunPipelineVersion === "v1") {
        next.skillRunPipelineVersion = update.skillRunPipelineVersion;
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
    ]) {
        if (!Object.prototype.hasOwnProperty.call(update, key)) {
            continue;
        }
        const normalized = normalizeString(value);
        if (normalized) {
            next[key] = normalized;
        }
        else {
            delete next[key];
        }
    }
    if (Object.prototype.hasOwnProperty.call(update, "acpReasoningEffort")) {
        const effort = normalizeString(update.acpReasoningEffort);
        if (effort) {
            next.acpReasoningEffort = effort;
        }
        else {
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
    assignString("error", update.error);
    if (Object.prototype.hasOwnProperty.call(update, "conversationError") &&
        !normalizeString(update.conversationError)) {
        next.conversationError = undefined;
    }
    if (Object.prototype.hasOwnProperty.call(update, "lastRecoveryError") &&
        !normalizeString(update.lastRecoveryError)) {
        next.lastRecoveryError = undefined;
    }
    if (Object.prototype.hasOwnProperty.call(update, "replyError") &&
        !normalizeString(update.replyError)) {
        next.replyError = undefined;
    }
    if (Object.prototype.hasOwnProperty.call(update, "error") &&
        !normalizeString(update.error)) {
        next.error = undefined;
    }
    if (Array.isArray(update.skillRoots))
        next.skillRoots = [...update.skillRoots];
    if (typeof update.proxySkillCount === "number" &&
        Number.isFinite(update.proxySkillCount)) {
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
    if (typeof update.repairRounds === "number" &&
        Number.isFinite(update.repairRounds)) {
        next.repairRounds = Math.max(0, Math.floor(update.repairRounds));
    }
    if (update.validationStatus)
        next.validationStatus = update.validationStatus;
    if (Array.isArray(update.validationErrors)) {
        next.validationErrors = [...update.validationErrors];
    }
    if (update.outputConvergenceState) {
        next.outputConvergenceState = update.outputConvergenceState;
    }
    if (Object.prototype.hasOwnProperty.call(update, "pendingInteraction")) {
        next.pendingInteraction = parsePendingInteraction(update.pendingInteraction);
    }
    if (update.conversationState)
        next.conversationState = update.conversationState;
    if (update.conversationRecoveryState) {
        next.conversationRecoveryState = update.conversationRecoveryState;
    }
    if (update.replyState)
        next.replyState = update.replyState;
    if (update.connectionActionState) {
        next.connectionActionState = update.connectionActionState;
    }
    if (update.applyResultState)
        next.applyResultState = update.applyResultState;
    if (typeof update.activePrompt === "boolean")
        next.activePrompt = update.activePrompt;
    if (Object.prototype.hasOwnProperty.call(update, "promptInterruptState")) {
        next.promptInterruptState = normalizeAcpPromptInterruptState(update.promptInterruptState);
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
    if (!getAcpSkillRunSelectedRequestId()) {
        setAcpSkillRunSelectedRequestId(requestId);
    }
    pruneInactiveAcpSkillRunTranscriptMirrors();
    const suppressedSilentTrailingEvent = isAssistantSilentExecutionMode() &&
        update.persistMode === "trailing" &&
        !!update.event &&
        !ACP_SKILL_RUN_SILENT_CRITICAL_STAGES.has(normalizeString(update.event.stage));
    if (suppressedSilentTrailingEvent) {
        // Canonical memory may retain low-signal runtime state until the next
        // lifecycle write, but silent mode does not create a soft persistence edge.
        return next;
    }
    else if (update.persistMode === "trailing") {
        scheduleSoftRunPersist(next);
    }
    else {
        persistRun(next, {
            writeRunContext: updateTouchesAcpSkillRunContext(update),
            writeResultJson: Object.prototype.hasOwnProperty.call(update, "resultJson"),
        });
    }
    emitWorkspaceChanged(acpSkillRunWorkspaceChange(requestId, [
        "run",
        ...(update.event ? ["transcript"] : []),
    ]));
    if (!isTerminalAcpSkillRunStatus(existing?.status || "queued") &&
        isTerminalAcpSkillRunStatus(next.status) &&
        __acp_runtime_performance_profiler_enabled__ &&
        (typeof __debug_mode__ === "undefined"
            ? isDebugModeEnabled()
            : __debug_mode__)) {
        finishAcpRuntimeProfile(requestId);
    }
    if ((typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__) &&
        __acp_runtime_semantic_trace_recorder_enabled__ &&
        !isTerminalAcpSkillRunStatus(existing?.status || "queued") &&
        isTerminalAcpSkillRunStatus(next.status)) {
        void recordAcpRuntimeSemanticTraceRequestTerminal({
            requestId,
            payload: { status: next.status, error: next.error },
        });
    }
    return projectAcpSkillRunMetadataRecord(next);
}
export function appendAcpSkillRunUserReply(args) {
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
    const item = {
        id: nextAcpSkillRunTranscriptItemId(existing, "message", state),
        kind: "message",
        role: "user",
        text: message,
        state: "complete",
        createdAt: now,
    };
    const next = {
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
    scheduleWorkspaceChangedEmit(acpSkillRunWorkspaceChange(requestId, ["transcript"]));
}
function formatFinalEnvelopeMarkdown(payload) {
    const displayPayload = { ...payload };
    delete displayPayload.__SKILL_DONE__;
    const lines = formatJsonMarkdownList(displayPayload);
    return lines.length > 0 ? lines.join("\n") : "- result: complete";
}
function isMarkdownListComposite(value) {
    return (value !== null &&
        typeof value === "object" &&
        (Array.isArray(value) ||
            Object.keys(value).length > 0));
}
function formatMarkdownListKey(value) {
    return (String(value || "")
        .replace(/\s+/g, " ")
        .trim() || "value");
}
function formatMarkdownListScalar(value) {
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
        return Object.keys(value).length > 0
            ? JSON.stringify(value)
            : "{}";
    }
    return String(value ?? "");
}
function formatJsonMarkdownList(value, depth = 0) {
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
        return Object.entries(value).flatMap(([key, entry]) => {
            const label = formatMarkdownListKey(key);
            if (isMarkdownListComposite(entry)) {
                return [
                    `${indent}- ${label}:`,
                    ...formatJsonMarkdownList(entry, depth + 1),
                ];
            }
            return [`${indent}- ${label}: ${formatMarkdownListScalar(entry)}`];
        });
    }
    return [`${indent}- ${formatMarkdownListScalar(value)}`];
}
function replaceLatestAssistantMessage(args) {
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
            },
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
    const item = {
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
function removeLatestAssistantCandidateMessage(record, candidateText) {
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
function appendOutputRevision(args) {
    const count = Math.max(0, args.record.outputRevisionCount || 0);
    const revision = {
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
    args.record.outputRevisionPreview = truncateAcpSkillRunPreview(revision.candidateText);
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
    };
}
export function recordAcpSkillRunOutputRevision(args) {
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
    const next = {
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
    emitWorkspaceChanged(acpSkillRunWorkspaceChange(requestId, ["run", "transcript"]));
}
export function projectAcpSkillRunOutputEnvelopeToTranscript(args) {
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
    const next = {
        ...existing,
        updatedAt: now,
    };
    const canonicalText = args.kind === "pending"
        ? args.message
        : formatFinalEnvelopeMarkdown(args.resultJson);
    const revision = appendOutputRevision({
        record: next,
        candidateText: normalizeString(args.candidateText) ||
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
    emitWorkspaceChanged(acpSkillRunWorkspaceChange(requestId, ["run", "transcript"]));
}
export function setAcpSkillRunRecoveryHandlerForTests(handler) {
    recoveryHandler = handler;
}
export function setAcpSkillRunRecoveryHandler(handler) {
    recoveryHandler = handler;
}
export function getAcpSkillRunRecoveryHandler() {
    return recoveryHandler;
}
export function runtimeCatalogForRun(run) {
    const stored = runtimeCatalogByRequestId.get(run.requestId);
    return stored
        ? cloneRuntimeCatalog(stored)
        : {
            modeOptions: [],
            modelOptions: [],
            displayModelOptions: [],
            reasoningEffortOptions: [],
            reasoningSource: "none",
        };
}
export function cancelAcpSkillRunPermissionQueue(runRequestIdRaw, reason) {
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
        const recoverableStatus = record &&
            new Set(["running", "repairing"]).has(record.status)
            ? "waiting_user"
            : record?.status;
        const cancelledRequests = cancelledCount > 0 ? cancelled : [null];
        cancelledRequests.forEach((entry, index) => {
            upsertAcpSkillRun({
                requestId: runRequestId,
                status: index === 0 ? recoverableStatus : undefined,
                statusReason: index === 0 && record && recoverableStatus !== record.status
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
                            summary: normalizeString(entry.summary) ||
                                normalizeString(entry.toolTitle),
                        },
                    }
                    : undefined,
            });
        });
    }
    return cancelledCount;
}
export async function deleteAcpSkillRunRecords(requestIds) {
    await flushAcpSkillRunRuntimeFileWrites();
    for (const requestId of requestIds) {
        deletePluginRunStoreEntry("acp", requestId);
        deleteAcpSkillRunRecord(requestId);
        if (getAcpSkillRunSelectedRequestId() === requestId) {
            setAcpSkillRunSelectedRequestId("");
        }
    }
    if (requestIds.length > 0) {
        emitWorkspaceChanged(createAcpSkillRunWorkspaceChange({ requestIds, kinds: ["archive"] }));
    }
}
export function getAcpSkillRunRecord(requestIdRaw) {
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
    return !!(record?.hostBridgeCli?.autoApproveWrites === true &&
        [
            "queued",
            "running",
            "waiting_user",
            "repairing",
            "failed_retriable",
        ].includes(record.status));
});
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
    setAcpSkillRunSelectedRequestId("");
    resetAcpSkillRunSummaryDiagnosticsForTests();
    clearPluginRunStore("acp");
}
export function clearAcpSkillRunsForRuntimePersistence() {
    clearAcpSkillRunRecords();
    runtimeCatalogByRequestId.clear();
    setAcpSkillRunSelectedRequestId("");
    invalidateAcpSkillRunPersistenceHydration();
    clearPluginRunStore("acp");
    emitWorkspaceChanged();
}

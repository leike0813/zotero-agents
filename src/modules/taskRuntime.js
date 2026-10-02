import { ACP_BACKEND_TYPE, DEFAULT_BACKEND_TYPE, PASS_THROUGH_BACKEND_TYPE, SKILLRUNNER_SEQUENCE_REQUEST_KIND, } from "../config/defaults";
import { isActive, isTerminal, isWaiting, } from "./skillRunner/run/skillRunnerProviderStateMachine";
import { applySkillRunnerRunEvent, buildSkillRunnerRunKey, listSkillRunnerRunProjections, resetSkillRunnerRunStoreForTests, subscribeSkillRunnerRunStore, } from "./skillRunner/run/skillRunnerRunStore";
const taskRecords = new Map();
const activeTaskRecordIds = new Set();
const listeners = new Set();
const changeListeners = new Set();
let unsubscribeSkillRunnerRunStoreTaskBridge;
const workflowTaskReadDiagnostics = {
    summaryQueryCount: 0,
    fullTaskRecordScanCount: 0,
    activeIndexScanCount: 0,
    taskRecordCandidateReadCount: 0,
};
const PREVIOUS_SESSION_INTERRUPTED_ERROR = "Task was left active by a previous Zotero plugin session and is no longer running in this session.";
function normalizeMetaString(meta, key) {
    const value = meta[key];
    return typeof value === "string" ? value.trim() : "";
}
function normalizeMetaStringList(meta, key) {
    const value = meta[key];
    if (!Array.isArray(value)) {
        return [];
    }
    return Array.from(new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean)));
}
function getTaskIdFromJob(job) {
    const runId = normalizeMetaString(job.meta, "runId");
    if (runId) {
        return `${runId}:${job.id}`;
    }
    return `${job.workflowId}:${job.id}:${job.createdAt}`;
}
function resolveLocalRunIdFromJob(job) {
    return normalizeMetaString(job.meta, "localRunId") || getTaskIdFromJob(job);
}
function resolveRequestIdFromJob(job) {
    const fromMeta = normalizeMetaString(job.meta, "requestId");
    if (fromMeta) {
        return fromMeta;
    }
    const candidate = job.result
        ?.requestId;
    if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
    }
    return "";
}
function isObjectRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function isSkillRunnerProtocolJob(job) {
    if (String(job.meta.backendType || "").trim() !== DEFAULT_BACKEND_TYPE) {
        return false;
    }
    const requestKind = normalizeMetaString(job.meta, "requestKind");
    if (requestKind === "skillrunner.job.v1") {
        return true;
    }
    if (isObjectRecord(job.request)) {
        return String(job.request.kind || "").trim() === "skillrunner.job.v1";
    }
    return false;
}
function hasProviderResultRequestId(job) {
    const result = job.result;
    if (!result || typeof result !== "object" || Array.isArray(result)) {
        return false;
    }
    return typeof result.requestId === "string"
        ? !!String(result.requestId || "").trim()
        : false;
}
function isSkillRunnerRequestReady(job) {
    return (job.meta.skillRunnerRequestReady === true ||
        String(job.meta.skillRunnerRequestReady || "").trim() === "true");
}
function isPreReadySkillRunnerTerminalFailure(job) {
    return (isSkillRunnerProtocolJob(job) &&
        isTerminal(job.state) &&
        !!resolveRequestIdFromJob(job) &&
        !isSkillRunnerRequestReady(job) &&
        !hasProviderResultRequestId(job));
}
export function isSkillRunnerJobReadyForTaskProjection(job) {
    if (!isSkillRunnerProtocolJob(job)) {
        return true;
    }
    if (isPreReadySkillRunnerTerminalFailure(job)) {
        return false;
    }
    if (isSkillRunnerRequestReady(job)) {
        return true;
    }
    return (hasProviderResultRequestId(job) ||
        !!resolveLocalRunIdFromJob(job) ||
        !!resolveRequestIdFromJob(job));
}
function resolveSkillRunnerLifecycleStateFromJob(job) {
    if (!isSkillRunnerProtocolJob(job)) {
        return undefined;
    }
    const explicit = normalizeMetaString(job.meta, "skillRunnerLifecycleState");
    if (explicit === "pre_request_id" ||
        explicit === "request_creating" ||
        explicit === "uploading") {
        return explicit;
    }
    if (isTerminal(job.state)) {
        return job.state;
    }
    if (isWaiting(job.state)) {
        return job.state;
    }
    if (isSkillRunnerRequestReady(job)) {
        return "running";
    }
    if (hasProviderResultRequestId(job)) {
        return job.state;
    }
    if (resolveRequestIdFromJob(job)) {
        return "uploading";
    }
    return job.state === "queued" ? "pre_request_id" : "request_creating";
}
function resolveOptionalIntegerFromJobMeta(job, key) {
    const value = job.meta[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined;
    }
    return Math.floor(value);
}
function resolveTargetParentIDFromJob(job) {
    const candidate = job.meta.targetParentID;
    return typeof candidate === "number" && Number.isFinite(candidate)
        ? Math.floor(candidate)
        : undefined;
}
export function isProjectableWorkflowJob(job) {
    const requestKind = normalizeMetaString(job.meta, "requestKind");
    const sequenceStepId = normalizeMetaString(job.meta, "sequenceStepId");
    return requestKind !== SKILLRUNNER_SEQUENCE_REQUEST_KIND || !!sequenceStepId;
}
export function isProjectableWorkflowTaskRecord(record) {
    const requestKind = String(record.requestKind || "").trim();
    const sequenceStepId = String(record.sequenceStepId || "").trim();
    return requestKind !== SKILLRUNNER_SEQUENCE_REQUEST_KIND || !!sequenceStepId;
}
export function buildWorkflowTaskRecordFromJob(job) {
    const runId = normalizeMetaString(job.meta, "runId") ||
        `${job.workflowId}:${job.createdAt}`;
    const workflowLabel = normalizeMetaString(job.meta, "workflowLabel") || job.workflowId;
    const taskName = normalizeMetaString(job.meta, "taskName") || job.id;
    const inputUnitIdentity = normalizeMetaString(job.meta, "inputUnitIdentity");
    const inputUnitLabel = normalizeMetaString(job.meta, "inputUnitLabel") || taskName;
    const inputMemberIdentities = normalizeMetaStringList(job.meta, "inputMemberIdentities");
    const requestId = resolveRequestIdFromJob(job);
    const localRunId = resolveLocalRunIdFromJob(job);
    const skillName = normalizeMetaString(job.meta, "skillName");
    const skillLabel = normalizeMetaString(job.meta, "skillLabel");
    const skillId = normalizeMetaString(job.meta, "skillId");
    const sequenceStepId = normalizeMetaString(job.meta, "sequenceStepId");
    const sequenceStepIndex = resolveOptionalIntegerFromJobMeta(job, "sequenceStepIndex");
    const sequenceFinalStepId = normalizeMetaString(job.meta, "sequenceFinalStepId");
    const sequenceJobId = normalizeMetaString(job.meta, "sequenceJobId");
    const workflowRunId = normalizeMetaString(job.meta, "workflowRunId");
    const submissionId = normalizeMetaString(job.meta, "submissionId");
    const submissionUnitId = normalizeMetaString(job.meta, "submissionUnitId");
    const engine = normalizeMetaString(job.meta, "engine");
    const providerId = normalizeMetaString(job.meta, "providerId");
    const requestKind = normalizeMetaString(job.meta, "requestKind");
    const backendId = normalizeMetaString(job.meta, "backendId");
    const backendType = normalizeMetaString(job.meta, "backendType");
    const backendBaseUrl = normalizeMetaString(job.meta, "backendBaseUrl");
    const runKey = backendType === DEFAULT_BACKEND_TYPE
        ? buildSkillRunnerRunKey({
            backendId,
            requestId,
            runId,
            jobId: job.id,
            localRunId,
        })
        : "";
    const skillRunnerLifecycleState = resolveSkillRunnerLifecycleStateFromJob(job);
    const skillRunnerReady = isSkillRunnerRequestReady(job) || hasProviderResultRequestId(job);
    const skillRunnerBackendInteractive = !!requestId && skillRunnerReady;
    const skillRunnerTerminal = isTerminal(skillRunnerLifecycleState || job.state);
    const skillRunnerWaiting = isWaiting(skillRunnerLifecycleState || job.state);
    const skillRunnerSubmitPhase = normalizeMetaString(job.meta, "skillRunnerSubmitPhase") ||
        (isSkillRunnerRequestReady(job) ? "request_ready" : "");
    return {
        id: getTaskIdFromJob(job),
        runKey: runKey || undefined,
        localRunId: localRunId || undefined,
        runId,
        jobId: job.id,
        requestId: requestId || undefined,
        skillName: skillName || undefined,
        skillLabel: skillLabel || undefined,
        skillId: skillId || undefined,
        sequenceStepId: sequenceStepId || undefined,
        sequenceStepIndex,
        sequenceFinalStepId: sequenceFinalStepId || undefined,
        sequenceJobId: sequenceJobId || undefined,
        workflowRunId: workflowRunId || undefined,
        submissionId: submissionId || undefined,
        submissionUnitId: submissionUnitId || undefined,
        engine: engine || undefined,
        targetParentID: resolveTargetParentIDFromJob(job),
        workflowId: job.workflowId,
        workflowLabel,
        taskName,
        inputUnitIdentity: inputUnitIdentity || undefined,
        inputUnitLabel: inputUnitLabel || undefined,
        inputMemberIdentities: inputMemberIdentities.length > 0 ? inputMemberIdentities : undefined,
        inputMemberCount: typeof job.meta.inputMemberCount === "number" &&
            Number.isFinite(job.meta.inputMemberCount)
            ? Math.max(0, Math.floor(job.meta.inputMemberCount))
            : undefined,
        providerId: providerId || undefined,
        requestKind: requestKind || undefined,
        backendId: backendId || undefined,
        backendType: backendType || undefined,
        backendBaseUrl: backendBaseUrl || undefined,
        state: job.state,
        skillRunnerLifecycleState,
        requestAssigned: !!requestId,
        backendInteractive: skillRunnerBackendInteractive,
        canOpenStream: skillRunnerBackendInteractive &&
            !skillRunnerTerminal &&
            !skillRunnerWaiting,
        canCancelBackendRun: skillRunnerBackendInteractive && !skillRunnerTerminal,
        canReply: skillRunnerBackendInteractive && skillRunnerWaiting,
        canArchiveLocalRun: true,
        submitPhase: skillRunnerSubmitPhase || undefined,
        submitStartedAt: normalizeMetaString(job.meta, "skillRunnerSubmitStartedAt") || undefined,
        submitTimeoutAt: normalizeMetaString(job.meta, "skillRunnerSubmitTimeoutAt") || undefined,
        submitError: normalizeMetaString(job.meta, "skillRunnerSubmitError") || undefined,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
    };
}
function emitTasksChanged(event) {
    for (const listener of Array.from(changeListeners)) {
        listener({ ...event });
    }
    if (listeners.size === 0) {
        return;
    }
    const snapshot = listWorkflowTasks();
    for (const listener of Array.from(listeners)) {
        listener(snapshot);
    }
}
function ensureSkillRunnerRunStoreTaskBridge() {
    if (unsubscribeSkillRunnerRunStoreTaskBridge) {
        return;
    }
    unsubscribeSkillRunnerRunStoreTaskBridge = subscribeSkillRunnerRunStore(() => {
        emitTasksChanged({ reason: "record-updated" });
    });
}
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function resolveSkillRunnerFetchTypeFromJob(job) {
    const result = isObject(job.result) ? job.result : {};
    const responseJson = isObject(result.responseJson) ? result.responseJson : {};
    const request = isObject(job.request) ? job.request : {};
    const raw = result.fetchType ||
        result.fetch_type ||
        responseJson.fetch_type ||
        request.fetch_type;
    return raw === "result" ? "result" : raw === "bundle" ? "bundle" : undefined;
}
function parsePersistedTaskRecord(raw) {
    if (!isObject(raw)) {
        return null;
    }
    const id = String(raw.id || "").trim();
    const runId = String(raw.runId || "").trim();
    const jobId = String(raw.jobId || "").trim();
    const workflowId = String(raw.workflowId || "").trim();
    const workflowLabel = String(raw.workflowLabel || "").trim();
    const taskName = String(raw.taskName || "").trim();
    const state = String(raw.state || "").trim();
    const createdAt = String(raw.createdAt || "").trim();
    const updatedAt = String(raw.updatedAt || "").trim();
    if (!id ||
        !runId ||
        !jobId ||
        !workflowId ||
        !workflowLabel ||
        !taskName ||
        !state ||
        !createdAt ||
        !updatedAt) {
        return null;
    }
    return {
        id,
        runKey: String(raw.runKey || "").trim() || undefined,
        localRunId: String(raw.localRunId || "").trim() || undefined,
        runId,
        jobId,
        requestId: String(raw.requestId || "").trim() || undefined,
        skillName: String(raw.skillName || "").trim() || undefined,
        skillLabel: String(raw.skillLabel || "").trim() || undefined,
        skillId: String(raw.skillId || "").trim() || undefined,
        sequenceStepId: String(raw.sequenceStepId || "").trim() || undefined,
        sequenceStepIndex: typeof raw.sequenceStepIndex === "number" &&
            Number.isFinite(raw.sequenceStepIndex)
            ? Math.floor(raw.sequenceStepIndex)
            : undefined,
        sequenceFinalStepId: String(raw.sequenceFinalStepId || "").trim() || undefined,
        sequenceJobId: String(raw.sequenceJobId || "").trim() || undefined,
        workflowRunId: String(raw.workflowRunId || "").trim() || undefined,
        engine: String(raw.engine || "").trim() || undefined,
        targetParentID: typeof raw.targetParentID === "number" &&
            Number.isFinite(raw.targetParentID)
            ? Math.floor(raw.targetParentID)
            : undefined,
        workflowId,
        workflowLabel,
        taskName,
        inputUnitIdentity: String(raw.inputUnitIdentity || "").trim() || undefined,
        inputUnitLabel: String(raw.inputUnitLabel || "").trim() || undefined,
        inputMemberIdentities: normalizeMetaStringList(raw, "inputMemberIdentities"),
        inputMemberCount: typeof raw.inputMemberCount === "number" &&
            Number.isFinite(raw.inputMemberCount)
            ? Math.max(0, Math.floor(raw.inputMemberCount))
            : undefined,
        providerId: String(raw.providerId || "").trim() || undefined,
        requestKind: String(raw.requestKind || "").trim() || undefined,
        backendId: String(raw.backendId || "").trim() || undefined,
        backendType: String(raw.backendType || "").trim() || undefined,
        backendBaseUrl: String(raw.backendBaseUrl || "").trim() || undefined,
        state,
        observerState: String(raw.observerState || "").trim() === "detached"
            ? "detached"
            : String(raw.observerState || "").trim() === "attached"
                ? "attached"
                : undefined,
        skillRunnerLifecycleState: String(raw.skillRunnerLifecycleState || "").trim() || undefined,
        requestAssigned: typeof raw.requestAssigned === "boolean"
            ? raw.requestAssigned
            : !!String(raw.requestId || "").trim(),
        backendInteractive: typeof raw.backendInteractive === "boolean"
            ? raw.backendInteractive
            : !!String(raw.requestId || "").trim(),
        canOpenStream: typeof raw.canOpenStream === "boolean"
            ? raw.canOpenStream
            : !!String(raw.requestId || "").trim(),
        canCancelBackendRun: typeof raw.canCancelBackendRun === "boolean"
            ? raw.canCancelBackendRun
            : !!String(raw.requestId || "").trim(),
        canReply: typeof raw.canReply === "boolean"
            ? raw.canReply
            : !!String(raw.requestId || "").trim(),
        canArchiveLocalRun: typeof raw.canArchiveLocalRun === "boolean"
            ? raw.canArchiveLocalRun
            : true,
        submitPhase: String(raw.submitPhase || "").trim() || undefined,
        submitStartedAt: String(raw.submitStartedAt || "").trim() || undefined,
        submitTimeoutAt: String(raw.submitTimeoutAt || "").trim() || undefined,
        submitError: String(raw.submitError || "").trim() || undefined,
        error: String(raw.error || "").trim() || undefined,
        createdAt,
        updatedAt,
    };
}
function syncTaskRecordActiveIndex(id, record) {
    if (record && isActive(record.state)) {
        activeTaskRecordIds.add(id);
    }
    else {
        activeTaskRecordIds.delete(id);
    }
}
function setTaskRecord(id, record) {
    taskRecords.set(id, record);
    syncTaskRecordActiveIndex(id, record);
}
function deleteTaskRecord(id) {
    const removed = taskRecords.delete(id);
    activeTaskRecordIds.delete(id);
    return removed;
}
function clearTaskRecords() {
    taskRecords.clear();
    activeTaskRecordIds.clear();
}
function isFinishedState(state) {
    return isTerminal(state);
}
export function recordWorkflowTaskUpdate(job) {
    if (!isProjectableWorkflowJob(job)) {
        return null;
    }
    const record = buildWorkflowTaskRecordFromJob(job);
    if (String(record.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
        const removedTask = deleteTaskRecord(record.id);
        const projection = listSkillRunnerRunProjections({
            backendId: record.backendId,
            requestId: record.requestId,
            limit: 1,
        }).find((entry) => {
            if (record.runKey && entry.runKey === record.runKey) {
                return true;
            }
            return (!!record.requestId &&
                entry.requestId === record.requestId &&
                entry.backendId === record.backendId);
        });
        if (removedTask) {
            emitTasksChanged({
                taskId: record.id,
                requestId: record.requestId,
                backendId: record.backendId,
                state: record.state,
                reason: "records-removed",
            });
        }
        return projection || record;
    }
    setTaskRecord(record.id, record);
    emitTasksChanged({
        taskId: record.id,
        requestId: record.requestId,
        backendId: record.backendId,
        state: record.state,
        reason: "record-updated",
    });
    return record;
}
export function listWorkflowTasks() {
    workflowTaskReadDiagnostics.fullTaskRecordScanCount += 1;
    workflowTaskReadDiagnostics.taskRecordCandidateReadCount += taskRecords.size;
    const merged = new Map(taskRecords);
    for (const projection of listSkillRunnerRunProjections()) {
        merged.set(projection.id, projection);
    }
    return Array.from(merged.values())
        .map((entry) => ({ ...entry }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function listActiveWorkflowTasks() {
    return listWorkflowTasks().filter((entry) => isActive(entry.state));
}
function normalizeTaskListLimit(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : 0;
}
function filterWorkflowTaskByScope(entry, options) {
    if (options.activeOnly && !isActive(entry.state)) {
        return false;
    }
    const backendId = String(options.backendId || "").trim();
    if (backendId && String(entry.backendId || "").trim() !== backendId) {
        return false;
    }
    const requestId = String(options.requestId || "").trim();
    if (requestId && String(entry.requestId || "").trim() !== requestId) {
        return false;
    }
    const submissionId = String(options.submissionId || "").trim();
    if (submissionId &&
        String(entry.submissionId || "").trim() !== submissionId) {
        return false;
    }
    return true;
}
export function listWorkflowTaskSummaries(options = {}) {
    workflowTaskReadDiagnostics.summaryQueryCount += 1;
    const merged = new Map();
    const candidates = options.activeOnly
        ? Array.from(activeTaskRecordIds.values())
            .map((id) => taskRecords.get(id))
            .filter((entry) => !!entry)
        : Array.from(taskRecords.values());
    if (options.activeOnly) {
        workflowTaskReadDiagnostics.activeIndexScanCount += 1;
    }
    else {
        workflowTaskReadDiagnostics.fullTaskRecordScanCount += 1;
    }
    workflowTaskReadDiagnostics.taskRecordCandidateReadCount += candidates.length;
    for (const record of candidates) {
        if (filterWorkflowTaskByScope(record, options)) {
            merged.set(record.id, record);
        }
    }
    for (const projection of listSkillRunnerRunProjections({
        activeOnly: options.activeOnly,
        backendId: options.backendId,
        requestId: options.requestId,
        limit: options.limit,
    })) {
        merged.set(projection.id, projection);
    }
    const limit = normalizeTaskListLimit(options.limit);
    const rows = Array.from(merged.values())
        .filter((entry) => filterWorkflowTaskByScope(entry, options))
        .map((entry) => ({ ...entry }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? rows.slice(0, limit) : rows;
}
export function listActiveWorkflowTaskSummaries(options = {}) {
    return listWorkflowTaskSummaries({ ...options, activeOnly: true });
}
export function clearFinishedWorkflowTasks() {
    let removed = false;
    for (const [id, record] of taskRecords.entries()) {
        if (!isFinishedState(record.state)) {
            continue;
        }
        deleteTaskRecord(id);
        removed = true;
    }
    if (removed) {
        emitTasksChanged({ reason: "records-removed" });
    }
}
export function removeWorkflowTasksByBackendAndRequestIds(args) {
    const backendId = String(args.backendId || "").trim();
    const requestIdSet = new Set((Array.isArray(args.requestIds) ? args.requestIds : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean));
    if (!backendId || requestIdSet.size === 0) {
        return 0;
    }
    let removed = 0;
    for (const [id, record] of taskRecords.entries()) {
        if (String(record.backendId || "").trim() !== backendId) {
            continue;
        }
        const requestId = String(record.requestId || "").trim();
        if (!requestId || !requestIdSet.has(requestId)) {
            continue;
        }
        deleteTaskRecord(id);
        removed += 1;
    }
    if (removed > 0) {
        emitTasksChanged({
            backendId,
            reason: "records-removed",
        });
    }
    return removed;
}
export function updateWorkflowTaskStateByRequest(args) {
    const requestId = String(args.requestId || "").trim();
    if (!requestId) {
        return 0;
    }
    const backendId = String(args.backendId || "").trim();
    const nextState = args.state;
    const nextError = String(args.error || "").trim() || undefined;
    const nextUpdatedAt = String(args.updatedAt || "").trim() || new Date().toISOString();
    let updated = 0;
    const backendType = String(args.backendType || "").trim();
    if (!backendType || backendType === DEFAULT_BACKEND_TYPE) {
        const storedRun = applySkillRunnerRunEvent(isTerminal(nextState)
            ? {
                type: "backend.terminal",
                backendId,
                requestId,
                status: nextState,
                backendStatus: args.backendStatus,
                error: nextError,
                updatedAt: nextUpdatedAt,
                payload: {
                    source: "taskRuntime.updateWorkflowTaskStateByRequest",
                    state: nextState,
                },
            }
            : {
                type: "backend.snapshot",
                backendId,
                requestId,
                state: nextState,
                backendStatus: args.backendStatus,
                error: nextError,
                updatedAt: nextUpdatedAt,
                payload: {
                    source: "taskRuntime.updateWorkflowTaskStateByRequest",
                    state: nextState,
                },
            });
        if (storedRun) {
            updated += 1;
        }
    }
    for (const [id, record] of taskRecords.entries()) {
        if (String(record.requestId || "").trim() !== requestId) {
            continue;
        }
        if (backendId && String(record.backendId || "").trim() !== backendId) {
            continue;
        }
        if (record.state === nextState &&
            String(record.error || "").trim() === String(nextError || "").trim()) {
            continue;
        }
        setTaskRecord(id, {
            ...record,
            state: nextState,
            mainStatus: nextState,
            backendStatus: args.backendStatus || record.backendStatus,
            error: nextError,
            updatedAt: nextUpdatedAt,
        });
        updated += 1;
    }
    if (updated > 0) {
        emitTasksChanged({
            requestId,
            backendId: backendId || undefined,
            state: nextState,
            reason: "record-updated",
        });
    }
    return updated;
}
function isAcpProjectionWithRequest(record) {
    return (String(record.backendType || "").trim() === ACP_BACKEND_TYPE &&
        !!String(record.requestId || "").trim());
}
function shouldFailRecoveredProjection(record) {
    const backendType = String(record.backendType || "").trim();
    if (backendType === PASS_THROUGH_BACKEND_TYPE) {
        return true;
    }
    if (isAcpProjectionWithRequest(record)) {
        return false;
    }
    return true;
}
export function reconcileWorkflowTaskProjectionsOnStartup() {
    const now = new Date().toISOString();
    const failedTaskIds = [];
    const preservedTaskIds = [];
    const removedLegacySequenceRootTaskIds = [];
    for (const [id, record] of taskRecords.entries()) {
        if (!isProjectableWorkflowTaskRecord(record)) {
            deleteTaskRecord(id);
            removedLegacySequenceRootTaskIds.push(id);
            continue;
        }
        if (!isActive(record.state)) {
            continue;
        }
        if (!shouldFailRecoveredProjection(record)) {
            preservedTaskIds.push(id);
            continue;
        }
        setTaskRecord(id, {
            ...record,
            state: "failed",
            error: record.error || PREVIOUS_SESSION_INTERRUPTED_ERROR,
            updatedAt: now,
        });
        failedTaskIds.push(id);
    }
    if (failedTaskIds.length > 0 || removedLegacySequenceRootTaskIds.length > 0) {
        emitTasksChanged({ reason: "record-updated" });
    }
    return {
        failedCount: failedTaskIds.length,
        preservedCount: preservedTaskIds.length,
        removedLegacySequenceRootCount: removedLegacySequenceRootTaskIds.length,
        failedTaskIds,
        preservedTaskIds,
        removedLegacySequenceRootTaskIds,
    };
}
export function subscribeWorkflowTasks(listener) {
    ensureSkillRunnerRunStoreTaskBridge();
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
export function subscribeWorkflowTaskChanges(listener) {
    ensureSkillRunnerRunStoreTaskBridge();
    changeListeners.add(listener);
    return () => {
        changeListeners.delete(listener);
    };
}
export function resetWorkflowTasks() {
    clearTaskRecords();
    listeners.clear();
    changeListeners.clear();
    unsubscribeSkillRunnerRunStoreTaskBridge?.();
    unsubscribeSkillRunnerRunStoreTaskBridge = undefined;
    resetWorkflowTaskReadDiagnosticsForTests();
    resetSkillRunnerRunStoreForTests();
}
export function getWorkflowTaskReadDiagnosticsForTests() {
    return { ...workflowTaskReadDiagnostics };
}
export function resetWorkflowTaskReadDiagnosticsForTests() {
    workflowTaskReadDiagnostics.summaryQueryCount = 0;
    workflowTaskReadDiagnostics.fullTaskRecordScanCount = 0;
    workflowTaskReadDiagnostics.activeIndexScanCount = 0;
    workflowTaskReadDiagnostics.taskRecordCandidateReadCount = 0;
}

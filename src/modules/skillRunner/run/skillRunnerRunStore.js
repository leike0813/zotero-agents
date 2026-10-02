import { listBackendInstancesSync } from "../../../backends/registry";
import { DEFAULT_BACKEND_TYPE } from "../../../config/defaults";
import { appendPluginRunEventStoreEntry, clearPluginRunStore, deletePluginRunStoreEntry, getPluginRunStoreEntry, getPluginRunStoreEntryByRequest, listPluginRunEventStoreEntries, listPluginRunStoreEntriesFiltered, upsertPluginRunStoreEntry, } from "../../pluginStateStore";
import { isActive, isTerminal, isWaiting, } from "./skillRunnerProviderStateMachine";
import { getSequenceRunState, } from "../../workflowExecution/sequenceStateStore";
import { getLoadedWorkflowEntries } from "../../workflow/catalog/workflowRuntime";
import { localizeWorkflowLabel } from "../../../workflows/localization";
import { getSkillRunnerSkillDisplay, registerSkillRunnerSkillDisplaySnapshot, resetSkillRunnerSkillDisplayRegistryForTests, } from "../surface/skillRunnerSkillDisplayRegistry";
import { normalizeAssistantMessageCounts, } from "../../assistant/publication/assistantMessageCounts";
const SKILLRUNNER_RUN_SCHEMA_VERSION = "3.0.0";
let eventCounter = 0;
const listeners = new Set();
const readDiagnostics = {
    fullPayloadReadCount: 0,
    fullPayloadQueryCount: 0,
    lightweightProjectionReadCount: 0,
    lightweightProjectionQueryCount: 0,
    lightweightProjectionScopedReadCount: 0,
    lightweightProjectionScopedQueryCount: 0,
    lightweightProjectionUnscopedReadCount: 0,
    lightweightProjectionUnscopedQueryCount: 0,
    lightweightProjectionSummaryQueryCount: 0,
    lightweightProjectionSummaryReadCount: 0,
    requestIdentityViolationCount: 0,
};
function normalizeString(value) {
    return String(value || "").trim();
}
function normalizeLimit(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : 0;
}
function nowIso() {
    return new Date().toISOString();
}
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function stringifyError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return normalizeString(error) || "SkillRunner observer detached";
}
function nextEventId(runKey, type) {
    eventCounter += 1;
    return `${runKey}:${Date.now()}:${eventCounter}:${type}`;
}
function emitSkillRunnerRunStoreChanged() {
    for (const listener of Array.from(listeners)) {
        try {
            listener();
        }
        catch {
            // Store listeners are UI refresh hooks; one failing listener must not
            // prevent other workspaces from observing updated projections.
        }
    }
}
export function subscribeSkillRunnerRunStore(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
export { registerSkillRunnerSkillDisplaySnapshot };
export function getSkillRunnerRunStoreReadDiagnosticsForTests() {
    return { ...readDiagnostics };
}
export function resetSkillRunnerRunStoreReadDiagnosticsForTests() {
    readDiagnostics.fullPayloadReadCount = 0;
    readDiagnostics.fullPayloadQueryCount = 0;
    readDiagnostics.lightweightProjectionReadCount = 0;
    readDiagnostics.lightweightProjectionQueryCount = 0;
    readDiagnostics.lightweightProjectionScopedReadCount = 0;
    readDiagnostics.lightweightProjectionScopedQueryCount = 0;
    readDiagnostics.lightweightProjectionUnscopedReadCount = 0;
    readDiagnostics.lightweightProjectionUnscopedQueryCount = 0;
    readDiagnostics.lightweightProjectionSummaryQueryCount = 0;
    readDiagnostics.lightweightProjectionSummaryReadCount = 0;
    readDiagnostics.requestIdentityViolationCount = 0;
}
export function buildSkillRunnerSingleRunKey(args) {
    const workflowRunId = normalizeString(args.workflowRunId);
    const jobId = normalizeString(args.jobId);
    return workflowRunId && jobId ? `local:${workflowRunId}:${jobId}` : "";
}
export function buildSkillRunnerSequenceRunKey(args) {
    const workflowRunId = normalizeString(args.workflowRunId);
    const sequenceJobId = normalizeString(args.sequenceJobId);
    const sequenceStepId = normalizeString(args.sequenceStepId);
    return workflowRunId && sequenceJobId && sequenceStepId
        ? `local:${workflowRunId}:${sequenceJobId}:${sequenceStepId}`
        : "";
}
export function buildSkillRunnerRunKey(args) {
    const sequenceRunKey = buildSkillRunnerSequenceRunKey({
        workflowRunId: args.workflowRunId || args.runId,
        sequenceJobId: args.sequenceJobId || args.jobId,
        sequenceStepId: args.sequenceStepId,
    });
    if (sequenceRunKey) {
        return sequenceRunKey;
    }
    const singleRunKey = buildSkillRunnerSingleRunKey({
        workflowRunId: args.workflowRunId || args.runId,
        jobId: args.jobId,
    });
    if (singleRunKey) {
        return singleRunKey;
    }
    return buildSkillRunnerLocalRunKey(args.localRunId);
}
export function buildSkillRunnerLocalRunKey(localRunIdRaw) {
    const localRunId = normalizeString(localRunIdRaw);
    return localRunId ? `local:${localRunId}` : "";
}
function normalizeStatus(value, fallback) {
    const normalized = normalizeString(value);
    return normalized === "queued" ||
        normalized === "running" ||
        normalized === "waiting_user" ||
        normalized === "waiting_auth" ||
        normalized === "succeeded" ||
        normalized === "failed" ||
        normalized === "canceled"
        ? normalized
        : fallback;
}
function normalizeSubmitPhase(value, fallback) {
    const normalized = normalizeString(value);
    return normalized === "pre_request" ||
        normalized === "creating" ||
        normalized === "created" ||
        normalized === "uploading" ||
        normalized === "request_ready"
        ? normalized
        : fallback;
}
function normalizeFetchType(value) {
    const normalized = normalizeString(value);
    return normalized === "bundle" || normalized === "result"
        ? normalized
        : undefined;
}
function normalizeExecutionMode(value) {
    const normalized = normalizeString(value);
    return normalized === "auto" || normalized === "interactive"
        ? normalized
        : undefined;
}
function normalizeApply(value) {
    const raw = isObject(value) ? value : {};
    const stateRaw = normalizeString(raw.state);
    const state = stateRaw === "pending" ||
        stateRaw === "running" ||
        stateRaw === "succeeded" ||
        stateRaw === "failed" ||
        stateRaw === "skipped"
        ? stateRaw
        : "idle";
    const attempt = Math.floor(Number(raw.attempt));
    return {
        state,
        attempt: Number.isFinite(attempt) && attempt >= 0 ? attempt : 0,
        maxAttempt: typeof raw.maxAttempt === "number" && Number.isFinite(raw.maxAttempt)
            ? Math.floor(raw.maxAttempt)
            : undefined,
        nextRetryAt: normalizeString(raw.nextRetryAt) || undefined,
        error: normalizeString(raw.error) || undefined,
        updatedAt: normalizeString(raw.updatedAt) || undefined,
    };
}
function normalizeResult(value) {
    if (!isObject(value)) {
        return undefined;
    }
    const result = {
        resultJson: value.resultJson,
        resultJsonPath: normalizeString(value.resultJsonPath) || undefined,
        workspaceDir: normalizeString(value.workspaceDir) || undefined,
    };
    return typeof result.resultJson === "undefined" &&
        !result.resultJsonPath &&
        !result.workspaceDir
        ? undefined
        : result;
}
function parseRecord(payload) {
    try {
        const parsed = JSON.parse(payload || "{}");
        if (!isObject(parsed)) {
            return null;
        }
        if (normalizeString(parsed.schemaVersion) !== SKILLRUNNER_RUN_SCHEMA_VERSION) {
            return null;
        }
        const runKey = normalizeString(parsed.runKey);
        const backendId = normalizeString(parsed.backendId);
        const workflowId = normalizeString(parsed.workflowId);
        const workflowRunId = normalizeString(parsed.workflowRunId);
        const jobId = normalizeString(parsed.jobId);
        const taskName = normalizeString(parsed.taskName);
        if (!runKey || !backendId || !workflowId || !workflowRunId || !jobId) {
            return null;
        }
        return {
            schemaVersion: SKILLRUNNER_RUN_SCHEMA_VERSION,
            runKey,
            requestId: normalizeString(parsed.requestId) || undefined,
            backendId,
            workflowId,
            workflowRunId,
            submissionId: normalizeString(parsed.submissionId) || undefined,
            submissionUnitId: normalizeString(parsed.submissionUnitId) || undefined,
            jobId,
            taskName: taskName || jobId,
            skillId: normalizeString(parsed.skillId) || undefined,
            sequenceRunId: normalizeString(parsed.sequenceRunId) || undefined,
            sequenceJobId: normalizeString(parsed.sequenceJobId) || undefined,
            sequenceStepId: normalizeString(parsed.sequenceStepId) || undefined,
            status: normalizeStatus(parsed.status, "running"),
            submitPhase: normalizeSubmitPhase(parsed.submitPhase, "request_ready"),
            backendStatus: normalizeString(parsed.backendStatus)
                ? normalizeStatus(parsed.backendStatus, "running")
                : undefined,
            observerState: normalizeString(parsed.observerState) === "detached"
                ? "detached"
                : normalizeString(parsed.observerState) === "attached"
                    ? "attached"
                    : undefined,
            error: normalizeString(parsed.error) || undefined,
            requestPayload: parsed.requestPayload,
            fetchType: normalizeFetchType(parsed.fetchType),
            executionMode: normalizeExecutionMode(parsed.executionMode),
            apply: normalizeApply(parsed.apply),
            result: normalizeResult(parsed.result),
            messageCounts: normalizeAssistantMessageCounts(parsed.messageCounts, runKey),
            archivedAt: normalizeString(parsed.archivedAt) || undefined,
            createdAt: normalizeString(parsed.createdAt) || nowIso(),
            updatedAt: normalizeString(parsed.updatedAt) || nowIso(),
        };
    }
    catch {
        return null;
    }
}
function parseEvent(payload) {
    try {
        const parsed = JSON.parse(payload || "{}");
        if (!isObject(parsed)) {
            return null;
        }
        const eventId = normalizeString(parsed.eventId);
        const runKey = normalizeString(parsed.runKey);
        const type = normalizeString(parsed.type);
        if (!eventId || !runKey || !type) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function taskStateFromRunStatus(status) {
    return status === "queued" ? "queued" : status;
}
function isTerminalRunStatus(status) {
    return isTerminal(taskStateFromRunStatus(status));
}
function observerStateForObservedStatus(status, existing) {
    return isTerminalRunStatus(status) ? existing?.observerState : "attached";
}
function shouldAcceptStatusTransition(previous, next) {
    if (!previous) {
        return true;
    }
    if (isTerminalRunStatus(previous.status) && !isTerminalRunStatus(next)) {
        return false;
    }
    return true;
}
function recordToEntry(record) {
    return {
        runKey: record.runKey,
        requestId: record.requestId || "",
        backendId: record.backendId,
        state: record.status,
        updatedAt: record.updatedAt,
        payload: JSON.stringify(record),
    };
}
function appendSkillRunnerRunEventInternal(args) {
    const runKey = normalizeString(args.runKey);
    if (!runKey) {
        return;
    }
    const event = {
        eventId: nextEventId(runKey, args.type),
        runKey,
        requestId: normalizeString(args.requestId) || undefined,
        backendId: normalizeString(args.backendId),
        type: args.type,
        createdAt: normalizeString(args.createdAt) || nowIso(),
        payload: args.payload,
    };
    appendPluginRunEventStoreEntry("skillrunner", {
        eventId: event.eventId,
        runKey: event.runKey,
        requestId: event.requestId || "",
        backendId: event.backendId,
        type: event.type,
        createdAt: event.createdAt,
        payload: JSON.stringify(event),
    });
}
function upsertSkillRunnerRunRecord(update, event) {
    const previous = getSkillRunnerRunRecord(update.runKey) || undefined;
    const status = shouldAcceptStatusTransition(previous, update.status)
        ? update.status
        : previous?.status || update.status;
    const next = {
        ...update,
        status,
        backendStatus: update.backendStatus || previous?.backendStatus,
        error: status === update.status ? update.error : previous?.error,
        apply: {
            ...(previous?.apply || { state: "idle", attempt: 0 }),
            ...update.apply,
        },
    };
    upsertPluginRunStoreEntry("skillrunner", recordToEntry(next));
    if (event) {
        appendSkillRunnerRunEventInternal({
            runKey: next.runKey,
            requestId: next.requestId,
            backendId: next.backendId,
            type: event.type,
            payload: event.payload,
            createdAt: next.updatedAt,
        });
    }
    emitSkillRunnerRunStoreChanged();
    return next;
}
function resolveEventRunRecord(event) {
    if ("runKey" in event && event.runKey) {
        return getSkillRunnerRunRecord(event.runKey);
    }
    if ("requestId" in event && event.requestId && "backendId" in event) {
        return getSkillRunnerRunRecordByRequest({
            backendId: event.backendId,
            requestId: event.requestId,
        });
    }
    return null;
}
function progressEventForApply(event, providerType) {
    return {
        ...(isObject(event.payload) ? event.payload : {}),
        type: providerType,
        requestId: event.requestId,
    };
}
export function applySkillRunnerRunEvent(event) {
    switch (event.type) {
        case "submit.local_created":
            return createSkillRunnerRun({
                ...event.init,
                backendId: event.init.backendId || event.backendId || "",
                ...(event.updatedAt ? { updatedAt: event.updatedAt } : {}),
            });
        case "submit.request_creating":
            return recordSkillRunnerProgress({
                runKey: event.runKey,
                updatedAt: event.updatedAt,
                event: progressEventForApply(event, "request-creating"),
            });
        case "submit.uploading":
            return recordSkillRunnerProgress({
                runKey: event.runKey,
                updatedAt: event.updatedAt,
                event: progressEventForApply(event, "request-uploading"),
            });
        case "request.ready":
            return recordSkillRunnerProgress({
                runKey: event.runKey,
                updatedAt: event.updatedAt,
                event: progressEventForApply(event, "request-ready"),
            });
        case "sequence.step.started":
            return recordSkillRunnerProgress({
                runKey: event.runKey,
                updatedAt: event.updatedAt,
                event: progressEventForApply(event, "sequence-step-started"),
            });
        case "submit.failed": {
            const existing = getSkillRunnerRunRecord(event.runKey);
            if (!existing)
                return null;
            const updatedAt = normalizeString(event.updatedAt) || nowIso();
            return upsertSkillRunnerRunRecord({
                ...existing,
                status: "failed",
                backendStatus: existing.backendStatus || "failed",
                error: normalizeString(event.error) || existing.error,
                updatedAt,
            }, {
                type: "submit.failed",
                payload: event.payload ||
                    (isObject(event.payload) ? event.payload : { error: event.error }),
            });
        }
        case "request.created":
            return attachSkillRunnerRequestId({
                runKey: event.runKey,
                requestId: event.requestId,
                updatedAt: event.updatedAt,
            });
        case "backend.snapshot": {
            const existing = resolveEventRunRecord(event);
            if (!existing)
                return null;
            return event.runKey
                ? updateSkillRunnerRunStateByRunKey({
                    runKey: existing.runKey,
                    state: event.state,
                    backendStatus: event.backendStatus,
                    error: event.error,
                    updatedAt: event.updatedAt,
                    eventType: "backend.snapshot",
                    eventPayload: event.payload,
                })
                : updateSkillRunnerRunStateByRequest({
                    backendId: existing.backendId,
                    requestId: existing.requestId || event.requestId || "",
                    state: event.state,
                    backendStatus: event.backendStatus,
                    error: event.error,
                    updatedAt: event.updatedAt,
                    eventType: "backend.snapshot",
                    eventPayload: event.payload,
                });
        }
        case "backend.terminal": {
            const existing = resolveEventRunRecord(event);
            if (!existing)
                return null;
            return settleSkillRunnerRun({
                runKey: existing.runKey,
                status: event.status,
                backendStatus: event.backendStatus,
                result: event.result,
                error: event.error,
                updatedAt: event.updatedAt,
                eventType: "backend.terminal",
                eventPayload: event.payload,
            });
        }
        case "run.observer_detached":
            return recordSkillRunnerObserverFailure({
                runKey: event.runKey,
                error: event.error,
                source: event.source || "applySkillRunnerRunEvent",
                updatedAt: event.updatedAt,
            });
        case "run.terminal_client_error": {
            const existing = resolveEventRunRecord(event);
            if (!existing)
                return null;
            return updateSkillRunnerRunStateByRequest({
                backendId: existing.backendId,
                requestId: existing.requestId || event.requestId || "",
                state: "failed",
                error: event.error,
                updatedAt: event.updatedAt,
                eventType: "run.terminal_client_error",
                eventPayload: event.payload || {
                    source: event.source,
                    reason: event.error,
                },
            });
        }
        case "result.fetched": {
            const existing = resolveEventRunRecord(event);
            if (!existing)
                return null;
            return updateSkillRunnerRunResult({
                backendId: existing.backendId,
                requestId: existing.requestId || event.requestId || "",
                resultJson: event.resultJson,
                resultJsonPath: event.resultJsonPath,
                workspaceDir: event.workspaceDir,
                updatedAt: event.updatedAt,
                eventPayload: event.payload,
            });
        }
        case "apply.started":
        case "apply.succeeded":
        case "apply.failed":
        case "apply.skipped": {
            const existing = resolveEventRunRecord(event);
            if (!existing)
                return null;
            const state = event.type === "apply.started"
                ? "running"
                : event.type === "apply.succeeded"
                    ? "succeeded"
                    : event.type === "apply.failed"
                        ? "failed"
                        : "skipped";
            return updateSkillRunnerRunApplyState({
                backendId: existing.backendId,
                requestId: existing.requestId || event.requestId,
                resolvedRecord: existing,
                state,
                attempt: event.attempt,
                maxAttempt: event.maxAttempt,
                nextRetryAt: event.nextRetryAt,
                error: "error" in event ? event.error : undefined,
                updatedAt: event.updatedAt,
                eventType: event.type,
                eventPayload: event.payload ||
                    (event.source ? { source: event.source } : undefined),
            });
        }
        case "sequence.step.settled": {
            const existing = getSkillRunnerRunRecord(event.runKey);
            if (!existing)
                return null;
            return settleSkillRunnerRun({
                runKey: existing.runKey,
                status: event.status,
                backendStatus: event.status,
                result: event.result,
                error: event.error,
                updatedAt: event.updatedAt,
                eventType: "sequence.step.settled",
                eventPayload: event.payload,
            });
        }
        case "sequence.continued": {
            const existing = getSkillRunnerRunRecord(event.runKey);
            if (!existing)
                return null;
            const updatedAt = normalizeString(event.updatedAt) || nowIso();
            return upsertSkillRunnerRunRecord({
                ...existing,
                status: "running",
                submitPhase: "request_ready",
                error: undefined,
                updatedAt,
            }, {
                type: "sequence.continued",
                payload: event.payload,
            });
        }
        case "run.message_counts_updated": {
            const existing = getSkillRunnerRunRecord(event.runKey);
            if (!existing)
                return null;
            const updatedAt = normalizeString(event.updatedAt) || nowIso();
            return upsertSkillRunnerRunRecord({
                ...existing,
                messageCounts: event.messageCounts,
                updatedAt,
            }, {
                type: "run.message_counts_updated",
                payload: event.payload,
            });
        }
        case "run.archived": {
            const existing = resolveEventRunRecord(event);
            if (!existing)
                return null;
            const archivedAt = normalizeString(event.archivedAt) || nowIso();
            return upsertSkillRunnerRunRecord({
                ...existing,
                archivedAt,
                updatedAt: archivedAt,
            }, {
                type: "run.archived",
                payload: event.payload || { archivedAt },
            });
        }
        case "run.deleted": {
            const existing = resolveEventRunRecord(event);
            if (!existing)
                return null;
            appendSkillRunnerRunEventInternal({
                runKey: existing.runKey,
                requestId: existing.requestId,
                backendId: existing.backendId,
                type: "run.deleted",
                payload: event.payload,
                createdAt: normalizeString(event.updatedAt) || nowIso(),
            });
            deletePluginRunStoreEntry("skillrunner", existing.runKey);
            emitSkillRunnerRunStoreChanged();
            return null;
        }
    }
}
function createSkillRunnerRun(args) {
    const runKey = normalizeString(args.runKey) ||
        buildSkillRunnerRunKey({
            workflowRunId: args.workflowRunId,
            jobId: args.jobId,
            sequenceJobId: args.sequenceJobId,
            sequenceStepId: args.sequenceStepId,
        });
    if (!runKey) {
        return null;
    }
    const existing = getSkillRunnerRunRecord(runKey);
    const now = normalizeString(args.updatedAt) ||
        normalizeString(args.createdAt) ||
        nowIso();
    const record = {
        schemaVersion: SKILLRUNNER_RUN_SCHEMA_VERSION,
        runKey,
        requestId: existing?.requestId,
        backendId: normalizeString(args.backendId) || existing?.backendId || "",
        workflowId: normalizeString(args.workflowId) || existing?.workflowId || "",
        workflowRunId: normalizeString(args.workflowRunId) || existing?.workflowRunId || "",
        submissionId: normalizeString(args.submissionId) || existing?.submissionId,
        submissionUnitId: normalizeString(args.submissionUnitId) || existing?.submissionUnitId,
        jobId: normalizeString(args.jobId) || existing?.jobId || "",
        taskName: normalizeString(args.taskName) ||
            existing?.taskName ||
            normalizeString(args.jobId) ||
            runKey,
        skillId: normalizeString(args.skillId) || existing?.skillId,
        sequenceRunId: normalizeString(args.sequenceRunId) || existing?.sequenceRunId,
        sequenceJobId: normalizeString(args.sequenceJobId) || existing?.sequenceJobId,
        sequenceStepId: normalizeString(args.sequenceStepId) || existing?.sequenceStepId,
        status: existing?.status || "queued",
        submitPhase: existing?.submitPhase || "pre_request",
        backendStatus: existing?.backendStatus,
        observerState: existing?.observerState,
        error: existing?.error,
        requestPayload: typeof args.requestPayload === "undefined"
            ? existing?.requestPayload
            : args.requestPayload,
        fetchType: args.fetchType || existing?.fetchType,
        executionMode: args.executionMode || existing?.executionMode,
        apply: existing?.apply || { state: "idle", attempt: 0 },
        result: existing?.result,
        messageCounts: existing?.messageCounts,
        archivedAt: existing?.archivedAt,
        createdAt: existing?.createdAt || normalizeString(args.createdAt) || now,
        updatedAt: now,
    };
    if (!record.backendId ||
        !record.workflowId ||
        !record.workflowRunId ||
        !record.jobId) {
        return null;
    }
    return upsertSkillRunnerRunRecord(record, existing
        ? undefined
        : {
            type: "submit.local_created",
            payload: {
                source: "createSkillRunnerRun",
                submitPhase: record.submitPhase,
            },
        });
}
function attachSkillRunnerRequestId(args) {
    const runKey = normalizeString(args.runKey);
    const requestId = normalizeString(args.requestId);
    const existing = getSkillRunnerRunRecord(runKey);
    if (!existing || !requestId) {
        return null;
    }
    const existingRequestId = normalizeString(existing.requestId);
    if (existingRequestId && existingRequestId !== requestId) {
        readDiagnostics.requestIdentityViolationCount += 1;
        return existing;
    }
    const conflicting = getSkillRunnerRunRecordByRequest({
        backendId: existing.backendId,
        requestId,
    });
    if (conflicting && conflicting.runKey !== runKey) {
        readDiagnostics.requestIdentityViolationCount += 1;
        deletePluginRunStoreEntry("skillrunner", runKey);
        emitSkillRunnerRunStoreChanged();
        return conflicting;
    }
    const sameRequest = existingRequestId === requestId;
    const updatedAt = normalizeString(args.updatedAt) || nowIso();
    return upsertSkillRunnerRunRecord({
        ...existing,
        requestId,
        status: "running",
        submitPhase: "created",
        observerState: "attached",
        error: undefined,
        updatedAt,
    }, sameRequest
        ? undefined
        : {
            type: "request.created",
            payload: { requestId },
        });
}
function progressEventType(event) {
    return normalizeString(event.type);
}
function recordSkillRunnerProgress(args) {
    const runKey = normalizeString(args.runKey);
    const existing = getSkillRunnerRunRecord(runKey);
    if (!existing) {
        return null;
    }
    const event = args.event;
    const type = progressEventType(args.event);
    const updatedAt = normalizeString(args.updatedAt) || nowIso();
    if (type === "request-created") {
        return attachSkillRunnerRequestId({
            runKey,
            requestId: normalizeString(event.requestId),
            updatedAt,
        });
    }
    let status = existing.status;
    let submitPhase = existing.submitPhase;
    let backendStatus = existing.backendStatus;
    let eventType = "backend.snapshot";
    if (type === "request-creating" || type === "sequence-step-started") {
        status = "queued";
        submitPhase = "creating";
        eventType = "submit.request_creating";
    }
    else if (type === "request-uploading") {
        status = "running";
        submitPhase = "uploading";
        eventType = "submit.uploading";
    }
    else if (type === "request-ready") {
        status = "running";
        submitPhase = "request_ready";
        eventType = "request.ready";
    }
    else if (type === "sequence-step-deferred") {
        if (normalizeString(event.detachReason) === "observer_failure") {
            const requestId = normalizeString(event.requestId);
            const attached = requestId && requestId !== normalizeString(existing.requestId)
                ? attachSkillRunnerRequestId({ runKey, requestId, updatedAt }) ||
                    existing
                : existing;
            return recordSkillRunnerObserverFailure({
                runKey: attached.runKey,
                error: normalizeString(event.error) || "observer failure",
                source: "sequence-step-deferred",
                updatedAt,
            });
        }
        status = normalizeStatus(event.backendStatus, "running");
        submitPhase = "request_ready";
        backendStatus = status;
        eventType = "backend.snapshot";
    }
    else if (type === "sequence-step-succeeded") {
        return settleSkillRunnerRun({
            runKey,
            status: "succeeded",
            backendStatus: "succeeded",
            updatedAt,
            result: existing.result,
        });
    }
    else if (type === "sequence-step-failed") {
        return settleSkillRunnerRun({
            runKey,
            status: "failed",
            backendStatus: "failed",
            updatedAt,
            error: normalizeString(event.error) || existing.error,
        });
    }
    else if (type === "sequence-step-canceled") {
        return settleSkillRunnerRun({
            runKey,
            status: "canceled",
            backendStatus: "canceled",
            updatedAt,
        });
    }
    return upsertSkillRunnerRunRecord({
        ...existing,
        requestId: normalizeString(event.requestId) || existing.requestId,
        status,
        submitPhase,
        backendStatus,
        observerState: observerStateForObservedStatus(status, existing),
        error: undefined,
        updatedAt,
    }, {
        type: eventType,
        payload: event,
    });
}
function recordSkillRunnerObserverFailure(args) {
    const existing = getSkillRunnerRunRecord(args.runKey);
    if (!existing || !normalizeString(existing.requestId)) {
        return null;
    }
    const updatedAt = normalizeString(args.updatedAt) || nowIso();
    return upsertSkillRunnerRunRecord({
        ...existing,
        observerState: "detached",
        error: stringifyError(args.error),
        updatedAt,
    }, {
        type: "run.observer_detached",
        payload: {
            source: normalizeString(args.source),
            error: stringifyError(args.error),
        },
    });
}
function settleSkillRunnerRun(args) {
    const existing = getSkillRunnerRunRecord(args.runKey);
    if (!existing) {
        return null;
    }
    const updatedAt = normalizeString(args.updatedAt) || nowIso();
    return upsertSkillRunnerRunRecord({
        ...existing,
        status: args.status,
        backendStatus: args.backendStatus || args.status,
        error: normalizeString(args.error) || undefined,
        result: args.result || existing.result,
        updatedAt,
    }, {
        type: args.eventType ||
            (args.status === "succeeded" ? "backend.terminal" : "backend.terminal"),
        payload: args.eventPayload || {
            status: args.status,
            error: normalizeString(args.error) || undefined,
        },
    });
}
export function getSkillRunnerRunRecord(runKeyRaw) {
    const runKey = normalizeString(runKeyRaw);
    if (!runKey) {
        return null;
    }
    readDiagnostics.fullPayloadQueryCount += 1;
    const entry = getPluginRunStoreEntry("skillrunner", runKey);
    if (!entry) {
        return null;
    }
    readDiagnostics.fullPayloadReadCount += 1;
    return parseRecord(entry.payload);
}
export function getSkillRunnerRunRecordByRequest(args) {
    const requestId = normalizeString(args.requestId);
    if (!requestId) {
        return null;
    }
    readDiagnostics.fullPayloadQueryCount += 1;
    const entry = getPluginRunStoreEntryByRequest({
        kind: "skillrunner",
        backendId: args.backendId,
        requestId,
    });
    if (entry) {
        readDiagnostics.fullPayloadReadCount += 1;
        return parseRecord(entry.payload);
    }
    const backendId = normalizeString(args.backendId);
    const candidates = listPluginRunStoreEntriesFiltered("skillrunner", {})
        .map((row) => parseRecord(row.payload))
        .filter((record) => {
        if (!record || normalizeString(record.requestId) !== requestId) {
            return false;
        }
        return !backendId || normalizeString(record.backendId) === backendId;
    })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    if (candidates.length > 0) {
        readDiagnostics.fullPayloadReadCount += 1;
        return candidates[0];
    }
    return null;
}
export function listSkillRunnerRunRecords(options = {}) {
    readDiagnostics.fullPayloadQueryCount += 1;
    const entries = listPluginRunStoreEntriesFiltered("skillrunner", {
        backendId: options.backendId,
        requestId: options.requestId,
        limit: normalizeLimit(options.limit) || undefined,
    });
    readDiagnostics.fullPayloadReadCount += entries.length;
    return entries
        .map((entry) => parseRecord(entry.payload))
        .filter((entry) => !!entry);
}
export function listSkillRunnerRunEvents(runKey) {
    return listPluginRunEventStoreEntries({
        kind: "skillrunner",
        runKey,
    })
        .map((entry) => parseEvent(entry.payload))
        .filter((entry) => !!entry);
}
function workflowLabelForId(workflowId) {
    const workflow = getLoadedWorkflowEntries().find((entry) => entry.manifest.id === workflowId) || null;
    return workflow ? localizeWorkflowLabel(workflow) : workflowId;
}
function backendByIdSnapshot() {
    try {
        return new Map(listBackendInstancesSync().map((backend) => [backend.id, backend]));
    }
    catch {
        return new Map();
    }
}
function sequenceStepForRun(run, sequenceState) {
    const state = sequenceState ||
        (run.sequenceRunId ? getSequenceRunState(run.sequenceRunId) : null);
    const step = state?.steps.find((entry) => entry.stepId === run.sequenceStepId);
    return {
        state: state || undefined,
        step,
    };
}
function resolveSkillName(args) {
    const { step } = sequenceStepForRun(args.run, args.sequenceState);
    const skillId = normalizeString(args.run.skillId);
    return (normalizeString(step?.skillName) ||
        normalizeString(getSkillRunnerSkillDisplay(skillId)?.skillName) ||
        skillId ||
        args.run.taskName);
}
function buildProjectionCapabilities(args) {
    const requestAssigned = !!normalizeString(args.run.requestId);
    const terminal = isTerminalRunStatus(args.run.status);
    const backendAvailable = !!normalizeString(args.backend?.baseUrl);
    const backendInteractive = requestAssigned &&
        args.run.submitPhase === "request_ready" &&
        backendAvailable;
    return {
        requestAssigned,
        backendInteractive,
        canOpenStream: backendInteractive &&
            !terminal &&
            !isWaiting(taskStateFromRunStatus(args.run.status)),
        canCancelBackendRun: backendInteractive && !terminal,
        canReply: backendInteractive &&
            !terminal &&
            args.run.status === "waiting_user" &&
            args.run.executionMode === "interactive",
        canArchiveLocalRun: true,
    };
}
export function projectSkillRunnerRun(args) {
    const run = args.run;
    const backend = args.backendRegistry?.get(run.backendId) ||
        backendByIdSnapshot().get(run.backendId);
    const { state: sequenceState, step } = sequenceStepForRun(run, args.sequenceState);
    const status = taskStateFromRunStatus(run.status);
    const workflowLabel = workflowLabelForId(run.workflowId);
    const skillName = resolveSkillName({ run, sequenceState });
    return {
        id: run.runKey,
        runKey: run.runKey,
        runId: run.workflowRunId,
        jobId: run.jobId,
        requestId: run.requestId,
        skillName,
        skillId: run.skillId,
        sequenceStepId: run.sequenceStepId,
        sequenceStepIndex: step?.index,
        sequenceJobId: run.sequenceJobId,
        workflowRunId: run.workflowRunId,
        submissionId: run.submissionId,
        submissionUnitId: run.submissionUnitId,
        workflowId: run.workflowId,
        workflowLabel,
        taskName: run.taskName,
        providerId: "skillrunner",
        backendId: run.backendId,
        backendType: DEFAULT_BACKEND_TYPE,
        backendBaseUrl: normalizeString(backend?.baseUrl) || undefined,
        state: status,
        mainStatus: status,
        backendStatus: run.backendStatus,
        skillRunnerLifecycleState: run.status,
        observerState: run.observerState,
        ...buildProjectionCapabilities({ run, backend }),
        submitPhase: run.submitPhase,
        applyState: run.apply.state,
        applyError: run.apply.error,
        applyNextRetryAt: run.apply.nextRetryAt,
        resultJsonPath: run.result?.resultJsonPath,
        workspaceDir: run.result?.workspaceDir,
        error: run.error,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
    };
}
function isVisibleProjection(record) {
    return !normalizeString(record.archivedAt);
}
function isActiveProjection(record) {
    if (isActive(taskStateFromRunStatus(record.status))) {
        return true;
    }
    return (record.apply.state === "pending" ||
        record.apply.state === "running" ||
        record.apply.state === "failed");
}
function isUnscopedHistoryProjectionRead(options) {
    return (options.activeOnly !== true &&
        !normalizeString(options.backendId) &&
        !normalizeString(options.requestId));
}
export function listSkillRunnerRunProjectionSummaries(options = {}) {
    readDiagnostics.lightweightProjectionQueryCount += 1;
    if (isUnscopedHistoryProjectionRead(options)) {
        readDiagnostics.lightweightProjectionUnscopedQueryCount += 1;
    }
    else {
        readDiagnostics.lightweightProjectionScopedQueryCount += 1;
    }
    const backendRegistry = backendByIdSnapshot();
    let rows = listSkillRunnerRunRecords({
        backendId: options.backendId,
        requestId: options.requestId,
        limit: options.activeOnly ? undefined : options.limit,
    })
        .filter((record) => options.activeOnly
        ? isVisibleProjection(record) && isActiveProjection(record)
        : isVisibleProjection(record))
        .map((run) => projectSkillRunnerRun({ run, backendRegistry }));
    const limit = normalizeLimit(options.limit);
    if (limit) {
        rows = rows.slice(0, limit);
    }
    readDiagnostics.lightweightProjectionReadCount += rows.length;
    if (isUnscopedHistoryProjectionRead(options)) {
        readDiagnostics.lightweightProjectionUnscopedReadCount += rows.length;
    }
    else {
        readDiagnostics.lightweightProjectionScopedReadCount += rows.length;
    }
    return rows;
}
export function listSkillRunnerRunProjections(options = {}) {
    return listSkillRunnerRunProjectionSummaries(options);
}
export function getSkillRunnerRunProjection(runKeyRaw) {
    const run = getSkillRunnerRunRecord(runKeyRaw);
    readDiagnostics.lightweightProjectionQueryCount += 1;
    readDiagnostics.lightweightProjectionScopedQueryCount += 1;
    if (!run || !isVisibleProjection(run)) {
        return null;
    }
    readDiagnostics.lightweightProjectionReadCount += 1;
    readDiagnostics.lightweightProjectionScopedReadCount += 1;
    return projectSkillRunnerRun({ run });
}
export function countSkillRunnerRunProjectionStates(options = {}) {
    const counts = new Map();
    for (const row of listSkillRunnerRunProjections(options)) {
        counts.set(row.state, (counts.get(row.state) || 0) + 1);
    }
    readDiagnostics.lightweightProjectionSummaryQueryCount += 1;
    readDiagnostics.lightweightProjectionSummaryReadCount += Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    return Array.from(counts.entries()).map(([state, count]) => ({
        state,
        count,
    }));
}
function updateSkillRunnerRunStateByRequest(args) {
    const existing = getSkillRunnerRunRecordByRequest({
        backendId: args.backendId,
        requestId: args.requestId,
    });
    if (!existing) {
        return null;
    }
    const rawState = normalizeString(args.state);
    if (rawState === "request_ready") {
        const error = normalizeString(args.error) || undefined;
        const unchangedSnapshot = args.eventType === "backend.snapshot" &&
            existing.status === "running" &&
            existing.submitPhase === "request_ready" &&
            !error;
        return upsertSkillRunnerRunRecord({
            ...existing,
            status: "running",
            submitPhase: "request_ready",
            observerState: "attached",
            error,
            updatedAt: unchangedSnapshot
                ? existing.updatedAt
                : normalizeString(args.updatedAt) || nowIso(),
        }, args.eventType
            ? { type: args.eventType, payload: args.eventPayload }
            : undefined);
    }
    const status = normalizeStatus(args.state, existing.status);
    const backendStatus = args.backendStatus
        ? normalizeStatus(args.backendStatus, status)
        : isTerminalRunStatus(status)
            ? status
            : existing.backendStatus;
    const error = normalizeString(args.error) || undefined;
    const unchangedSnapshot = args.eventType === "backend.snapshot" &&
        existing.status === status &&
        normalizeString(existing.backendStatus) ===
            normalizeString(backendStatus) &&
        !error;
    return upsertSkillRunnerRunRecord({
        ...existing,
        status,
        backendStatus,
        observerState: observerStateForObservedStatus(status, existing),
        error,
        updatedAt: unchangedSnapshot
            ? existing.updatedAt
            : normalizeString(args.updatedAt) || nowIso(),
    }, args.eventType
        ? { type: args.eventType, payload: args.eventPayload }
        : undefined);
}
function updateSkillRunnerRunStateByRunKey(args) {
    const existing = getSkillRunnerRunRecord(args.runKey);
    if (!existing) {
        return null;
    }
    const rawState = normalizeString(args.state);
    if (rawState === "request_ready") {
        const error = normalizeString(args.error) || undefined;
        const unchangedSnapshot = args.eventType === "backend.snapshot" &&
            existing.status === "running" &&
            existing.submitPhase === "request_ready" &&
            !error;
        return upsertSkillRunnerRunRecord({
            ...existing,
            status: "running",
            submitPhase: "request_ready",
            observerState: "attached",
            error,
            updatedAt: unchangedSnapshot
                ? existing.updatedAt
                : normalizeString(args.updatedAt) || nowIso(),
        }, args.eventType
            ? { type: args.eventType, payload: args.eventPayload }
            : undefined);
    }
    const status = normalizeStatus(args.state, existing.status);
    const backendStatus = args.backendStatus
        ? normalizeStatus(args.backendStatus, status)
        : isTerminalRunStatus(status)
            ? status
            : existing.backendStatus;
    const error = normalizeString(args.error) || undefined;
    const unchangedSnapshot = args.eventType === "backend.snapshot" &&
        existing.status === status &&
        normalizeString(existing.backendStatus) ===
            normalizeString(backendStatus) &&
        !error;
    return upsertSkillRunnerRunRecord({
        ...existing,
        status,
        backendStatus,
        observerState: observerStateForObservedStatus(status, existing),
        error,
        updatedAt: unchangedSnapshot
            ? existing.updatedAt
            : normalizeString(args.updatedAt) || nowIso(),
    }, args.eventType
        ? { type: args.eventType, payload: args.eventPayload }
        : undefined);
}
function updateSkillRunnerRunApplyState(args) {
    const existing = args.resolvedRecord ||
        getSkillRunnerRunRecordByRequest({
            backendId: args.backendId,
            requestId: args.requestId,
        });
    if (!existing) {
        return null;
    }
    const updatedAt = normalizeString(args.updatedAt) || nowIso();
    const applyFailed = args.state === "failed";
    return upsertSkillRunnerRunRecord({
        ...existing,
        status: applyFailed ? "failed" : existing.status,
        backendStatus: existing.backendStatus ||
            (isTerminalRunStatus(existing.status) ? existing.status : undefined),
        error: applyFailed
            ? normalizeString(args.error) || existing.error
            : existing.error,
        apply: {
            state: args.state,
            attempt: typeof args.attempt === "number" && Number.isFinite(args.attempt)
                ? Math.floor(args.attempt)
                : existing.apply.attempt,
            maxAttempt: args.maxAttempt || existing.apply.maxAttempt,
            nextRetryAt: normalizeString(args.nextRetryAt) || undefined,
            error: normalizeString(args.error) || undefined,
            updatedAt,
        },
        updatedAt,
    }, args.eventType
        ? { type: args.eventType, payload: args.eventPayload }
        : undefined);
}
function updateSkillRunnerRunResult(args) {
    const existing = getSkillRunnerRunRecordByRequest({
        backendId: args.backendId,
        requestId: args.requestId,
    });
    if (!existing) {
        return null;
    }
    const updatedAt = normalizeString(args.updatedAt) || nowIso();
    const result = {
        resultJson: typeof args.resultJson === "undefined"
            ? existing.result?.resultJson
            : args.resultJson,
        resultJsonPath: normalizeString(args.resultJsonPath) || existing.result?.resultJsonPath,
        workspaceDir: normalizeString(args.workspaceDir) || existing.result?.workspaceDir,
    };
    return upsertSkillRunnerRunRecord({
        ...existing,
        result,
        updatedAt,
    }, {
        type: "result.fetched",
        payload: args.eventPayload,
    });
}
export function resetSkillRunnerRunStoreForTests() {
    clearPluginRunStore("skillrunner");
    eventCounter = 0;
    resetSkillRunnerSkillDisplayRegistryForTests();
    resetSkillRunnerRunStoreReadDiagnosticsForTests();
    emitSkillRunnerRunStoreChanged();
}

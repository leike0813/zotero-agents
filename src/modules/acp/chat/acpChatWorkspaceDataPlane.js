import { canPublishAssistantWorkspaceLiveUpdates, } from "../../assistant/publication/assistantExecutionDisplayPolicy";
import { createAcpChatWorkspaceOwner, } from "../../assistant/publication/assistantWorkspacePublication";
import { listAcpChatSessions, listStoredVisibleAcpChatSessions, resolveAcpChatRuntimePaths, } from "./acpConversationStore";
import { readAcpChatTranscriptPage } from "./acpConversationTranscriptStore";
import { getAcpChatTranscriptMirrorCacheDiagnostics, normalizeAcpChatTranscriptPageLimit, readAcpChatTranscriptMirrorPage, scheduleAcpChatTranscriptHydrate, } from "./acpChatTranscriptMirror";
import { registerAcpChatWorkspaceEmission, } from "./acpChatWorkspaceEmissionFacade";
import { acpChatSessionKey, cloneSnapshotValue, ensureInitialized, flushPendingChatTranscriptWrites, flushPendingPersistence, flushPendingWorkspaceChange, getAcpChatSessionRuntimeByKey, getActiveAcpChatBackendId, getCachedAcpBackends, getOrCreateSessionRuntime, normalizeBackendId, normalizeConversationId, resolveActiveConversationId, schedulePersistenceFlush, scheduleWorkspaceChange, } from "./acpSessionManager";
import { cloneAcpConversationItem, } from "../../acpTypes";
const acpChatWorkspaceListeners = new Set();
function nowIso() {
    return new Date().toISOString();
}
export function getActiveAcpChatOwner() {
    ensureInitialized();
    return {
        backendId: normalizeBackendId(getActiveAcpChatBackendId()),
        conversationId: normalizeConversationId(resolveActiveConversationId(getActiveAcpChatBackendId())),
    };
}
export function getAcpChatWorkspaceOwnerNavigation() {
    ensureInitialized();
    const active = getActiveAcpChatOwner();
    const foreground = getOrCreateSessionRuntime(active.backendId);
    const foregroundBackend = foreground.snapshot.backend;
    const backends = [
        ...(foregroundBackend &&
            !getCachedAcpBackends().some((entry) => entry.id === foregroundBackend.id)
            ? [foregroundBackend]
            : []),
        ...getCachedAcpBackends(),
    ];
    const entries = backends.flatMap((backend) => {
        const sessions = backend.id === active.backendId
            ? listAcpChatSessions(backend.id)
            : listStoredVisibleAcpChatSessions(backend.id);
        return sessions.map((session) => {
            const summary = projectAcpChatSessionSummary(backend.id, session);
            return {
                owner: createAcpChatWorkspaceOwner(backend.id, summary.conversationId),
                groupId: backend.id,
                label: String(summary.title || "").trim() || summary.conversationId,
                subtitle: String(backend.displayName || backend.id).trim() || backend.id,
                description: String(summary.lastError || "").trim() || null,
                groupLabel: String(backend.displayName || backend.id).trim() || backend.id,
                status: String(summary.status || "idle"),
                backendStatus: String(summary.status || "idle"),
                applyState: null,
                attention: String(summary.lastError || "").trim() || null,
                updatedAt: String(summary.updatedAt || "").trim() || null,
                messageCount: Math.max(0, Number(summary.messageCount) || 0),
                canArchive: summary.status === "idle",
                submission: null,
                resumptionPending: false,
            };
        });
    });
    const selectedOwner = active.backendId && active.conversationId
        ? createAcpChatWorkspaceOwner(active.backendId, active.conversationId)
        : null;
    return {
        selectedOwner,
        selectedGroupId: active.backendId || null,
        groups: backends.map((backend) => ({
            groupId: backend.id,
            label: String(backend.displayName || backend.id).trim() || backend.id,
            status: String(backend.id === active.backendId
                ? foreground.snapshot.status || "idle"
                : "idle"),
            disabledReason: null,
        })),
        entries,
        queuedEntries: [],
        canCreateOwner: backends.length > 0,
        notice: null,
    };
}
export function getAcpChatWorkspaceReadModel(backendIdRaw, conversationIdRaw) {
    ensureInitialized();
    const sessionRuntime = getOrCreateSessionRuntime(normalizeBackendId(backendIdRaw) || getActiveAcpChatBackendId(), normalizeConversationId(conversationIdRaw));
    const snapshot = sessionRuntime.snapshot;
    const planItem = sessionRuntime.activePlanItemId
        ? sessionRuntime.transcriptItemsById.get(sessionRuntime.activePlanItemId)
        : undefined;
    return Object.freeze({
        backendId: sessionRuntime.backendId,
        backendDisplayName: String(snapshot.backend?.displayName || sessionRuntime.backendId).trim() || sessionRuntime.backendId,
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
        planEntries: planItem?.kind === "plan"
            ? planItem.entries.map((entry) => ({ ...entry }))
            : [],
        agentWorkspaceDir: snapshot.agentWorkspaceDir,
        sessionCwd: snapshot.sessionCwd,
        workspaceDir: snapshot.workspaceDir,
        runtimeDir: snapshot.runtimeDir,
        updatedAt: snapshot.updatedAt,
    });
}
function isForegroundSessionRuntime(sessionRuntime) {
    const activeConversationId = resolveActiveConversationId(getActiveAcpChatBackendId());
    return (normalizeBackendId(sessionRuntime.backendId) ===
        normalizeBackendId(getActiveAcpChatBackendId()) &&
        normalizeConversationId(sessionRuntime.snapshot.conversationId) ===
            normalizeConversationId(activeConversationId));
}
function buildAcpChatWorkspaceChange(sessionRuntime, kinds, options = {}) {
    const hasTranscript = kinds.some((kind) => kind === "transcript-append" ||
        kind === "transcript-boundary" ||
        kind === "transcript-progress");
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
function notifyAcpChatWorkspaceListeners(change) {
    if (!change)
        return;
    for (const listener of acpChatWorkspaceListeners) {
        listener(change);
    }
}
function resolveAcpChatWorkspaceChangeKinds(reason, sessionRuntime, explicitKinds = []) {
    const kinds = new Set(explicitKinds);
    if (reason === "live") {
        if (kinds.size === 0)
            kinds.add("transcript-append");
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
function updateSnapshotTimestamp(sessionRuntime) {
    sessionRuntime.snapshot.authMethodIds =
        sessionRuntime.snapshot.authMethods.map((entry) => entry.id);
    sessionRuntime.snapshot.updatedAt = nowIso();
}
function publishSessionRuntimeWorkspaceChange(sessionRuntime, reason, changeKinds = []) {
    if (reason === "background")
        return;
    if (reason === "live") {
        if (!canPublishAssistantWorkspaceLiveUpdates())
            return;
        scheduleWorkspaceChange(sessionRuntime, reason, changeKinds);
        return;
    }
    flushPendingWorkspaceChange(sessionRuntime, reason, changeKinds);
}
function emitSessionRuntimeSnapshot(sessionRuntime, options = {}) {
    if (options.touchUpdatedAt !== false) {
        updateSnapshotTimestamp(sessionRuntime);
    }
    else {
        sessionRuntime.snapshot.authMethodIds =
            sessionRuntime.snapshot.authMethods.map((entry) => entry.id);
    }
    const persist = options.persist !== false;
    if (persist) {
        if (options.throttlePersist) {
            schedulePersistenceFlush(sessionRuntime);
        }
        else {
            flushPendingPersistence(sessionRuntime);
        }
    }
    if (options.notifyUi !== false) {
        const reason = options.uiReason || (options.throttleUi ? "live" : "critical");
        publishSessionRuntimeWorkspaceChange(sessionRuntime, reason, options.changeKinds);
    }
}
function projectAcpChatSessionSummary(backendId, entry) {
    const sessionRuntime = getAcpChatSessionRuntimeByKey(acpChatSessionKey(backendId, entry.conversationId));
    if (!sessionRuntime) {
        return {
            ...entry,
            status: "idle",
            lastError: entry.lastError || "",
        };
    }
    const lastError = String(sessionRuntime.snapshot.prerequisiteError || "").trim() ||
        String(sessionRuntime.snapshot.lastError || "").trim() ||
        entry.lastError ||
        "";
    return {
        ...entry,
        title: sessionRuntime.snapshot.conversationTitle || entry.title,
        messageCount: sessionRuntime.snapshot.transcriptItemCount || entry.messageCount,
        status: sessionRuntime.snapshot.status,
        lastError,
        updatedAt: sessionRuntime.snapshot.updatedAt || entry.updatedAt,
    };
}
export function subscribeAcpChatWorkspaceChanges(listener) {
    acpChatWorkspaceListeners.add(listener);
    return () => {
        acpChatWorkspaceListeners.delete(listener);
    };
}
export function getAcpConversationSnapshot(backendId, conversationId) {
    ensureInitialized();
    return cloneSnapshotValue(getOrCreateSessionRuntime(backendId || getActiveAcpChatBackendId(), conversationId).snapshot);
}
export function scheduleAcpChatTranscriptHydrateForOwner(args) {
    ensureInitialized();
    const backendId = normalizeBackendId(args?.backendId || getActiveAcpChatBackendId());
    const conversationId = normalizeConversationId(args?.conversationId);
    if (!backendId || !conversationId) {
        return;
    }
    scheduleAcpChatTranscriptHydrate(getOrCreateSessionRuntime(backendId, conversationId));
}
export function readAcpConversationTranscriptMirrorPage(args) {
    ensureInitialized();
    const backendId = normalizeBackendId(args.backendId || getActiveAcpChatBackendId());
    const conversationId = normalizeConversationId(args.conversationId) ||
        normalizeConversationId(getOrCreateSessionRuntime(backendId).snapshot.conversationId);
    if (!backendId || !conversationId) {
        return undefined;
    }
    const sessionRuntime = getOrCreateSessionRuntime(backendId, conversationId);
    const page = readAcpChatTranscriptMirrorPage(sessionRuntime, {
        cursor: args.cursor,
        limit: args.limit,
        executionDisplayMode: args.executionDisplayMode || "live",
    });
    if (!page) {
        return undefined;
    }
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
        transcriptRevision: Math.max(Number(sessionRuntime.transcriptEventSeq) || 0, Number(sessionRuntime.snapshot.transcriptRevision) || 0),
        limit: page.limit,
    };
}
export async function readAcpConversationTranscriptPage(args) {
    ensureInitialized();
    const backendId = normalizeBackendId(args.backendId || getActiveAcpChatBackendId());
    const conversationId = normalizeConversationId(args.conversationId) ||
        normalizeConversationId(getOrCreateSessionRuntime(backendId).snapshot.conversationId);
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
        conversationStorageDir: sessionRuntime.snapshot.conversationStorageDir ||
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
        transcriptRevision: Math.max(Number(page.eventSeq) || 0, Number(sessionRuntime.snapshot.transcriptRevision) || 0),
        limit: normalizeAcpChatTranscriptPageLimit(args.limit),
    };
}
export function getAcpChatTranscriptMirrorDiagnosticsForTests(args) {
    ensureInitialized();
    const backendId = normalizeBackendId(args?.backendId || getActiveAcpChatBackendId());
    const conversationId = normalizeConversationId(args?.conversationId) ||
        normalizeConversationId(backendId
            ? getOrCreateSessionRuntime(backendId).snapshot.conversationId
            : "");
    const key = acpChatSessionKey(backendId, conversationId);
    const sessionRuntime = getAcpChatSessionRuntimeByKey(key);
    const cacheDiagnostics = getAcpChatTranscriptMirrorCacheDiagnostics(key);
    if (!sessionRuntime) {
        return {
            mirrorLoaded: false,
            itemCount: 0,
            eventSeq: 0,
            hydrateState: "idle",
            hydrateInFlight: false,
            coldMirrorCached: cacheDiagnostics.cached,
            coldMirrorCacheSize: cacheDiagnostics.size,
        };
    }
    return {
        mirrorLoaded: sessionRuntime.transcriptMirrorLoaded,
        itemCount: sessionRuntime.transcriptItemIds.length,
        eventSeq: sessionRuntime.transcriptEventSeq,
        hydrateState: sessionRuntime.transcriptHydrateState,
        hydrateInFlight: !!sessionRuntime.transcriptHydratePromise,
        coldMirrorCached: cacheDiagnostics.cached,
        coldMirrorCacheSize: cacheDiagnostics.size,
    };
}
registerAcpChatWorkspaceEmission({
    emitSessionRuntimeSnapshot,
    buildAcpChatWorkspaceChange,
    notifyAcpChatWorkspaceListeners,
    resolveAcpChatWorkspaceChangeKinds,
    isForegroundSessionRuntime,
    clearAcpChatWorkspaceListeners: () => {
        acpChatWorkspaceListeners.clear();
    },
});

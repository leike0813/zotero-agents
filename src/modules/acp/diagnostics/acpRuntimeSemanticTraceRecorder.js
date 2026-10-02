import { joinPath } from "../../../utils/path";
import { sha256Hex } from "../../../utils/sha256";
import { acquireAcpRuntimeDiagnosticsMode, releaseAcpRuntimeDiagnosticsMode, } from "./acpRuntimeDiagnosticsMode";
import { isAcpRuntimeSemanticTraceRecorderAvailable } from "../../debugMode";
import { ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS, ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA, acpRuntimeSemanticTraceByteLength, createAcpRuntimeMonotonicClock, encodeAcpRuntimeSemanticTraceLine, encodeAcpRuntimeSemanticTraceText, parseAcpRuntimeSemanticTraceNdjson, } from "./acpRuntimeSemanticTrace";
import { appendRuntimeTextFile, ensureRuntimeDirectory, getRuntimePersistencePaths, moveRuntimePath, readRuntimeTextFile, removeRuntimePath, setRuntimeExecutablePermissions, writeRuntimeTextFile, } from "../../runtimePersistence";
function normalizeLimits(value) {
    const defaults = ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS;
    const lower = (candidate, maximum) => {
        const number = Number(candidate);
        return Number.isFinite(number) && number > 0
            ? Math.min(Math.floor(number), maximum)
            : maximum;
    };
    return {
        maxBytes: lower(value?.maxBytes, defaults.maxBytes),
        maxEvents: lower(value?.maxEvents, defaults.maxEvents),
        maxEventBytes: lower(value?.maxEventBytes, defaults.maxEventBytes),
    };
}
function safeTimestamp(nowMs) {
    return new Date(Number.isFinite(nowMs) ? nowMs : Date.now())
        .toISOString()
        .replace(/[:.]/g, "-");
}
let state = "idle";
let sourceKind;
let boundRootId;
let boundRootOwner;
let binding;
let notice;
let roundToken;
let boundContext;
let claimAttempts = new Set();
let partialPath;
let savedPath;
let folder;
let limits = {
    ...ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS,
};
let eventCount = 0;
let contentBytes = 0;
let warnings = [];
let completion;
let startedMonotonicMs = 0;
let monotonicNow = createAcpRuntimeMonotonicClock();
let activeTurns = new Set();
let activeRequests = new Set();
let registeredRequestActivities = new Map();
let completedActivityCount = 0;
let pendingFinishPayload;
let finishWaiters = [];
let writeChain = Promise.resolve();
let footerWritten = false;
let recorderNonce = 0;
let tokenNonce = 0;
function recorderView() {
    return {
        state,
        ...(sourceKind ? { sourceKind } : {}),
        ...(boundRootId ? { rootId: boundRootId } : {}),
        ...(binding ? { binding: { ...binding } } : {}),
        activeTurnCount: activeTurns.size,
        activeRequestCount: activeRequests.size,
        canFinish: (state === "recording" || state === "stopping") &&
            completedActivityCount > 0,
        claiming: state === "armed" && claimAttempts.size > 0,
        ...(notice ? { notice: { ...notice } } : {}),
        eventCount,
        contentBytes,
        ...(completion ? { completion } : {}),
        warnings: [...warnings],
        ...(partialPath ? { partialPath } : {}),
        ...(savedPath ? { savedPath } : {}),
        ...(folder ? { folder } : {}),
        limits: { ...limits },
    };
}
export function getAcpRuntimeSemanticTraceRecorderView() {
    return recorderView();
}
function freezeIncomplete(warning) {
    if (!warnings.some((entry) => entry.code === warning.code)) {
        warnings.push(warning);
    }
    completion = "incomplete";
    state = "frozen";
    roundToken = undefined;
    boundContext = undefined;
    claimAttempts.clear();
    registeredRequestActivities.clear();
    releaseAcpRuntimeDiagnosticsMode("recording");
    const view = recorderView();
    for (const resolve of finishWaiters.splice(0))
        resolve(view);
}
export async function armAcpRuntimeSemanticTraceRecorder(options) {
    if (!isAcpRuntimeSemanticTraceRecorderAvailable()) {
        throw new Error("ACP semantic trace recorder is unavailable");
    }
    if (state !== "idle") {
        throw new Error("ACP semantic trace recorder is not idle");
    }
    if (!acquireAcpRuntimeDiagnosticsMode("recording")) {
        throw new Error("Another ACP runtime diagnostic mode is active");
    }
    try {
        sourceKind = options.sourceKind;
        limits = normalizeLimits(options.limits);
        eventCount = 0;
        contentBytes = 0;
        warnings = [];
        completion = undefined;
        boundRootId = undefined;
        boundRootOwner = undefined;
        binding = undefined;
        notice = undefined;
        tokenNonce += 1;
        roundToken = `round-${recorderNonce + 1}-${tokenNonce}`;
        boundContext = undefined;
        claimAttempts = new Set();
        partialPath = undefined;
        savedPath = undefined;
        activeTurns = new Set();
        activeRequests = new Set();
        registeredRequestActivities = new Map();
        completedActivityCount = 0;
        pendingFinishPayload = undefined;
        finishWaiters = [];
        writeChain = Promise.resolve();
        footerWritten = false;
        monotonicNow = options.monotonicNow || createAcpRuntimeMonotonicClock();
        startedMonotonicMs = monotonicNow();
        const paths = getRuntimePersistencePaths(options.root);
        folder = joinPath(paths.runtimeRoot, "profiles", "acp-traces");
        await ensureRuntimeDirectory(folder);
        recorderNonce += 1;
        const stem = `acp-trace-${acpRuntimeSemanticTraceFilenameSourceToken(options.sourceKind)}-${safeTimestamp(options.nowMs ?? Date.now())}-${recorderNonce}`;
        partialPath = joinPath(folder, `${stem}.ndjson.partial`);
        const header = {
            record: "header",
            schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
            sourceKind,
            createdAt: new Date(options.nowMs ?? Date.now()).toISOString(),
        };
        const headerLine = encodeAcpRuntimeSemanticTraceLine(header);
        await writeRuntimeTextFile(partialPath, headerLine);
        await setRuntimeExecutablePermissions(partialPath, 0o600);
        contentBytes = acpRuntimeSemanticTraceByteLength(headerLine);
        state = "armed";
        return recorderView();
    }
    catch (error) {
        freezeIncomplete({
            code: "write-failed",
            detail: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
function ownerActivityKey(owner) {
    return owner.turnId || owner.requestId;
}
function acpRuntimeSemanticTraceFilenameSourceToken(value) {
    return value === "acp-chat-conversation" ? "chat" : "skills";
}
function isLiveContext(context) {
    return Boolean(context &&
        boundContext &&
        context.token === boundContext.token &&
        context.sourceKind === boundContext.sourceKind &&
        context.rootId === boundContext.rootId);
}
function eventMatchesBinding(input) {
    if (!binding || input.sourceKind !== binding.sourceKind)
        return false;
    if (input.owner.rootId !== boundRootId)
        return false;
    if (binding.sourceKind === "acp-chat-conversation" &&
        input.owner.sessionId !== binding.sessionId) {
        return false;
    }
    return true;
}
async function appendAcpRuntimeSemanticTraceEvent(input) {
    const event = {
        record: "event",
        seq: eventCount + 1,
        monotonicOffsetMs: Math.max(0, monotonicNow() - startedMonotonicMs),
        ...input,
    };
    const eventLine = encodeAcpRuntimeSemanticTraceLine(event);
    const eventBytes = acpRuntimeSemanticTraceByteLength(eventLine);
    if (eventBytes > limits.maxEventBytes) {
        freezeIncomplete({ code: "single-event-limit" });
        return false;
    }
    if (eventCount + 1 > limits.maxEvents) {
        freezeIncomplete({ code: "event-limit" });
        return false;
    }
    if (contentBytes + eventBytes > limits.maxBytes) {
        freezeIncomplete({ code: "byte-limit" });
        return false;
    }
    eventCount += 1;
    contentBytes += eventBytes;
    writeChain = writeChain
        .then(async () => {
        if (partialPath)
            await appendRuntimeTextFile(partialPath, eventLine);
    })
        .catch((error) => {
        freezeIncomplete({
            code: "write-failed",
            detail: error instanceof Error ? error.message : String(error),
        });
    });
    await writeChain;
    return state !== "frozen";
}
export function beginAcpRuntimeSemanticTraceClaimAttempt(attemptSourceKind) {
    if (state !== "armed" ||
        !roundToken ||
        !sourceKind ||
        attemptSourceKind !== sourceKind) {
        return undefined;
    }
    tokenNonce += 1;
    const token = `${roundToken}:claim-${tokenNonce}`;
    claimAttempts.add(token);
    return Object.freeze({ sourceKind: attemptSourceKind, token });
}
export function abandonAcpRuntimeSemanticTraceClaimAttempt(attempt) {
    if (!attempt)
        return false;
    return claimAttempts.delete(attempt.token);
}
export async function claimAcpRuntimeSemanticTraceRoot(args) {
    if (state !== "armed" ||
        !roundToken ||
        boundContext ||
        !claimAttempts.has(args.attempt.token) ||
        args.attempt.sourceKind !== sourceKind ||
        args.binding.sourceKind !== sourceKind ||
        !args.owner.rootId) {
        return undefined;
    }
    if (args.binding.sourceKind === "acp-chat-conversation" &&
        (args.owner.conversationId !== args.binding.conversationId ||
            args.owner.sessionId !== args.binding.sessionId)) {
        return undefined;
    }
    if (args.binding.sourceKind === "acp-workflow-execution" &&
        args.owner.workflowRunId !== args.binding.workflowRunId) {
        return undefined;
    }
    const context = Object.freeze({
        sourceKind: args.attempt.sourceKind,
        rootId: args.owner.rootId,
        token: `${roundToken}:root-${tokenNonce}`,
    });
    claimAttempts.clear();
    boundRootId = args.owner.rootId;
    boundRootOwner = { ...args.owner };
    binding = { ...args.binding };
    boundContext = context;
    state = "recording";
    const appended = await appendAcpRuntimeSemanticTraceEvent({
        kind: "root-start",
        sourceKind: context.sourceKind,
        owner: boundRootOwner,
        payload: args.payload,
    });
    return appended ? context : undefined;
}
export function noticeAcpRuntimeSemanticTraceSessionReplacement(args) {
    if (!isLiveContext(args.context) ||
        binding?.sourceKind !== "acp-chat-conversation" ||
        args.sessionId === binding.sessionId) {
        return false;
    }
    notice = { code: "session-replaced", sessionId: args.sessionId };
    return true;
}
async function completeAcpRuntimeSemanticTraceRoot(payload) {
    if (!boundContext ||
        !boundRootOwner ||
        completedActivityCount < 1 ||
        activeTurns.size > 0 ||
        activeRequests.size > 0 ||
        footerWritten) {
        return recorderView();
    }
    const appended = await appendAcpRuntimeSemanticTraceEvent({
        kind: "root-end",
        sourceKind: boundContext.sourceKind,
        owner: boundRootOwner,
        payload,
    });
    if (!appended)
        return recorderView();
    completion = warnings.length > 0 ? "incomplete" : "complete";
    state = "frozen";
    roundToken = undefined;
    boundContext = undefined;
    claimAttempts.clear();
    registeredRequestActivities.clear();
    releaseAcpRuntimeDiagnosticsMode("recording");
    await finalizeAcpRuntimeSemanticTracePartial();
    const view = recorderView();
    for (const resolve of finishWaiters.splice(0))
        resolve(view);
    return view;
}
export async function recordAcpRuntimeSemanticTraceEvent(context, input) {
    if (state !== "recording" && state !== "stopping")
        return false;
    if (!isLiveContext(context) || !eventMatchesBinding(input))
        return false;
    if (input.kind === "root-start" || input.kind === "root-end")
        return false;
    const activityKey = ownerActivityKey(input.owner);
    if (input.kind === "turn-start") {
        if (state === "stopping" || !activityKey || activeTurns.has(activityKey)) {
            return false;
        }
        activeTurns.add(activityKey);
    }
    else if (input.kind === "request-start") {
        if (state === "stopping" ||
            !activityKey ||
            activeRequests.has(activityKey)) {
            return false;
        }
        activeRequests.add(activityKey);
        registeredRequestActivities.set(activityKey, {
            context,
            owner: { ...input.owner },
        });
    }
    else if (input.kind === "turn-end") {
        if (!activityKey || !activeTurns.delete(activityKey))
            return false;
        completedActivityCount += 1;
    }
    else if (input.kind === "request-end") {
        if (!activityKey || !activeRequests.delete(activityKey))
            return false;
        registeredRequestActivities.delete(activityKey);
        completedActivityCount += 1;
    }
    const appended = await appendAcpRuntimeSemanticTraceEvent(input);
    if (appended &&
        state === "stopping" &&
        activeTurns.size === 0 &&
        activeRequests.size === 0) {
        await completeAcpRuntimeSemanticTraceRoot(pendingFinishPayload);
    }
    return appended;
}
export async function recordAcpRuntimeSemanticTraceRequestTerminal(args) {
    const registered = registeredRequestActivities.get(args.requestId);
    if (!registered)
        return false;
    if (!isLiveContext(registered.context) ||
        !eventMatchesBinding({
            kind: "terminal",
            sourceKind: "acp-workflow-execution",
            owner: registered.owner,
            payload: args.payload,
        })) {
        return false;
    }
    const terminalRecorded = await appendAcpRuntimeSemanticTraceEvent({
        kind: "terminal",
        sourceKind: "acp-workflow-execution",
        owner: registered.owner,
        payload: args.payload,
    });
    if (!terminalRecorded)
        return false;
    const ended = await recordAcpRuntimeSemanticTraceEvent(registered.context, {
        kind: "request-end",
        sourceKind: "acp-workflow-execution",
        owner: registered.owner,
        payload: args.payload,
    });
    return ended;
}
export async function settleAcpRuntimeSemanticTraceOpenRequests(args) {
    if (!isLiveContext(args.context))
        return 0;
    const requestIds = [...registeredRequestActivities.entries()]
        .filter(([, entry]) => entry.context.token === args.context.token)
        .map(([requestId]) => requestId);
    let settled = 0;
    for (const requestId of requestIds) {
        if (await recordAcpRuntimeSemanticTraceRequestTerminal({
            requestId,
            payload: args.payload,
        })) {
            settled += 1;
        }
    }
    return settled;
}
export function recordAcpSessionNotificationForTrace(args) {
    return recordAcpRuntimeSemanticTraceEvent(args.context, {
        kind: "session-notification",
        sourceKind: args.sourceKind,
        owner: args.owner,
        payload: args.notification,
    });
}
async function finalizeAcpRuntimeSemanticTracePartial() {
    if (!partialPath || footerWritten)
        return;
    try {
        const content = await readRuntimeTextFile(partialPath);
        const digest = await sha256Hex(encodeAcpRuntimeSemanticTraceText(content));
        if (!digest)
            throw new Error("SHA-256 is unavailable");
        const footer = {
            record: "footer",
            eventCount,
            contentBytes: acpRuntimeSemanticTraceByteLength(content),
            sha256: digest,
            completion: completion || "incomplete",
            warnings: [...warnings],
        };
        await appendRuntimeTextFile(partialPath, encodeAcpRuntimeSemanticTraceLine(footer));
        footerWritten = true;
        await parseAcpRuntimeSemanticTraceNdjson(await readRuntimeTextFile(partialPath));
    }
    catch (error) {
        freezeIncomplete({
            code: "integrity-failed",
            detail: error instanceof Error ? error.message : String(error),
        });
    }
}
export async function finishAcpRuntimeSemanticTraceRoot(args) {
    if (state !== "recording" && state !== "stopping") {
        return recorderView();
    }
    if (args?.context && !isLiveContext(args.context))
        return recorderView();
    await writeChain;
    if (completedActivityCount < 1)
        return recorderView();
    pendingFinishPayload = args?.payload ?? { outcome: "complete" };
    if (activeTurns.size > 0 || activeRequests.size > 0) {
        state = "stopping";
        if (args?.waitForActivities) {
            return new Promise((resolve) => {
                finishWaiters.push(resolve);
            });
        }
        return recorderView();
    }
    return completeAcpRuntimeSemanticTraceRoot(pendingFinishPayload);
}
export async function cancelAcpRuntimeSemanticTraceRecorder() {
    if (state !== "armed" && state !== "recording" && state !== "stopping") {
        return recorderView();
    }
    await writeChain;
    freezeIncomplete({ code: "user-canceled" });
    await finalizeAcpRuntimeSemanticTracePartial();
    return recorderView();
}
export async function saveFrozenAcpRuntimeSemanticTrace() {
    if (state !== "frozen" ||
        completion !== "complete" ||
        !partialPath ||
        !folder) {
        throw new Error("ACP semantic trace is not a complete frozen trace");
    }
    const targetPath = partialPath.replace(/\.partial$/, "");
    await moveRuntimePath({
        sourcePath: partialPath,
        targetPath,
        overwrite: false,
    });
    await setRuntimeExecutablePermissions(targetPath, 0o600);
    savedPath = targetPath;
    partialPath = undefined;
    state = "saved";
    return { path: targetPath, folder };
}
export async function resetAcpRuntimeSemanticTraceRecorder() {
    if (state === "armed" || state === "recording" || state === "stopping") {
        throw new Error("Active ACP semantic trace recording must be canceled first");
    }
    if (state !== "frozen" && state !== "saved") {
        throw new Error("ACP semantic trace recorder has no terminal round to reset");
    }
    if (state === "frozen") {
        await writeChain;
        await finalizeAcpRuntimeSemanticTracePartial();
    }
    releaseAcpRuntimeDiagnosticsMode("recording");
    state = "idle";
    sourceKind = undefined;
    boundRootId = undefined;
    boundRootOwner = undefined;
    binding = undefined;
    notice = undefined;
    roundToken = undefined;
    boundContext = undefined;
    claimAttempts.clear();
    partialPath = undefined;
    savedPath = undefined;
    folder = undefined;
    limits = { ...ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS };
    eventCount = 0;
    contentBytes = 0;
    warnings = [];
    completion = undefined;
    activeTurns.clear();
    activeRequests.clear();
    registeredRequestActivities.clear();
    completedActivityCount = 0;
    pendingFinishPayload = undefined;
    finishWaiters = [];
    writeChain = Promise.resolve();
    footerWritten = false;
    return recorderView();
}
export async function shutdownAcpRuntimeSemanticTraceRecorder() {
    await writeChain;
    releaseAcpRuntimeDiagnosticsMode("recording");
    state = "idle";
    sourceKind = undefined;
    boundRootId = undefined;
    boundRootOwner = undefined;
    binding = undefined;
    notice = undefined;
    roundToken = undefined;
    boundContext = undefined;
    claimAttempts.clear();
    partialPath = undefined;
    savedPath = undefined;
    folder = undefined;
    limits = { ...ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS };
    eventCount = 0;
    contentBytes = 0;
    warnings = [];
    completion = undefined;
    activeTurns.clear();
    activeRequests.clear();
    registeredRequestActivities.clear();
    completedActivityCount = 0;
    pendingFinishPayload = undefined;
    finishWaiters = [];
    writeChain = Promise.resolve();
    footerWritten = false;
}
export async function discardAcpRuntimeSemanticTracePartialForTests() {
    const path = partialPath;
    await shutdownAcpRuntimeSemanticTraceRecorder();
    if (path)
        await removeRuntimePath(path);
    recorderNonce = 0;
}

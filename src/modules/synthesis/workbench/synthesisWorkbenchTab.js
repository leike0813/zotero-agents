import { config } from "../../../../package.json";
import { SynthesisClientError, } from "../../../../packages/synthesis-contracts/src/index";
import { getString, getStringOrFallback } from "../../../utils/locale";
import { SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES, SYNTHESIS_WORKBENCH_MESSAGE_KEYS, } from "../../../synthesisWorkbenchI18n";
import { resolveAddonRef, resolveRuntimeToolkit, } from "../../../utils/runtimeBridge";
import { executeWorkflowFromCurrentSelection } from "../../workflow/ui/workflowExecute";
import { getLoadedWorkflowEntries } from "../../workflow/catalog/workflowRuntime";
import { alertWindow } from "../../workflowExecution/feedbackSeam";
import { writeRuntimeTextFile } from "../../runtimePersistence";
import { readPackagedBinaryAsset } from "../../packagedAssetResolver";
import { recordCitationGraphCrashJournalPhase } from "../debug/citationGraphCrashJournal";
import { isSystemE2ETestRun } from "../../systemE2ETestRun";
import { isTransientStorageBusyError } from "../../guardedSqlite";
import { getDefaultSynthesisClient, getFreshDefaultSynthesisClient, } from "../../synthesisClient/defaultClient";
import { classifySynthesisWorkbenchGraphMutationResult, createSynthesisWorkbenchGraphLayoutFailure, isSynthesisWorkbenchGraphApplicationBusyError, resolveSynthesisWorkbenchGraphLayoutStatus, selectSynthesisWorkbenchGraphLayoutFailure, toSynthesisUiSnapshotInput, toSynthesisWorkbenchPaperDigestReadRequest, toSynthesisWorkbenchReadState, } from "../../synthesisClient/workbenchUiAdapter";
import { registerSynthesisWorkbenchSidecarChangeListener, } from "./synthesisWorkbenchInvalidation";
import { applySynthesisUiAction, buildSynthesisUiSnapshot, createDefaultSynthesisUiState, getSynthesisUiOperationKey, getSynthesisUiOperationLabel, mergeSynthesisUiSnapshotInput, } from "../uiModel";
import { continueSynthesisCitationGraphWindow, createSynthesisCitationGraphWindow, failSynthesisCitationGraphWindow, mergeSynthesisCitationGraphPage, mergeSynthesisCitationGraphSlice, retrySynthesisCitationGraphWindow, } from "../../../shared/synthesisCitationGraphWindow";
import { registerBackgroundRefreshTimer } from "../../backgroundRefreshGovernance";
import { delay, yieldToEventLoop } from "../../../utils/runtimeCompatibility";
import { BUILTIN_STATUS_FACET, isBuiltinStatusTag } from "../builtinTagPolicy";
import { readSynthesisSidecarTraceSnapshot } from "../sidecar/synthesisSidecarTrace";
import { openTaskDashboard } from "../../dashboardHost";
import { recoverDefaultSynthesisProductionOwner } from "../production/synthesisProductionOwner";
import { isSynthesisLiteratureScoreInvalidationEvent } from "../itemObserver";
import { getSynthesisWorkbenchSidecarStatus, observeSynthesisWorkbenchSidecarStatus, subscribeSynthesisWorkbenchSidecarStatus, } from "../sidecar/synthesisSidecarRuntimeSupervisor";
const CITATION_GRAPH_CRASH_JOURNAL_ENABLED = typeof __debug_mode__ !== "undefined" && __debug_mode__;
/**
 * The close-lifecycle System E2E case reads the crash journal as evidence, and a
 * calibration candidate is a production build, so the journal has to follow that
 * run as well as the build mode.
 */
function citationGraphCrashJournalEnabled() {
    return CITATION_GRAPH_CRASH_JOURNAL_ENABLED || isSystemE2ETestRun();
}
const SYNTHESIS_WORKBENCH_BRIDGE_KEY = "__zoteroSkillsSynthesisWorkbenchBridge";
function beginSurfaceRefreshRequest(runtime, surface, refreshFromService) {
    runtime.surfaceRequestSeq += 1;
    const requestId = runtime.surfaceRequestSeq;
    runtime.latestSurfaceRequestBySurface[surface] = requestId;
    return {
        requestId,
        surface,
        selectedTabAtRequest: runtime.state.selectedTab,
        refreshFromService,
        libraryReadModelRevision: runtime.libraryReadModelRevision,
        startedAt: new Date().toISOString(),
    };
}
function isLatestSurfaceRefreshRequest(runtime, request) {
    return (runtime.latestSurfaceRequestBySurface[request.surface] === request.requestId);
}
function isActiveSurface(runtime, surface) {
    return surfaceForTab(runtime.state.selectedTab) === surface;
}
const SYNTHESIS_WORKBENCH_TAB_ID = "zotero-skills-synthesis-workbench";
const SYNTHESIS_WORKBENCH_TAB_ICON = "zotero-skills-workspace";
const SYNTHESIS_WORKBENCH_TAB_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_workbench_32.png`;
const SYNTHESIS_WORKBENCH_EMBEDDED_ID = "zotero-skills-synthesis-workbench-embedded";
const SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS = 100;
const SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES = 5;
const SYNTHESIS_WORKBENCH_HANDSHAKE_MAX_ATTEMPTS = 80;
const SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS = 500;
const SYNTHESIS_WORKBENCH_SIDECAR_STATUS_INTERVAL_MS = 5_000;
const SYNTHESIS_WORKBENCH_LIBRARY_INVALIDATION_DEBOUNCE_MS = 250;
let synthesisWorkbenchTab;
let synthesisLibraryReadModelRevision = 0;
let prewarmedSynthesisSnapshotInput;
let prewarmSynthesisSurfacesPromise;
const synthesisWorkbenchRuntimes = new Set();
function localize(key, fallback) {
    try {
        const resolved = String(getString(key)).trim();
        const fallbackKey = `${config.addonRef}-${key}`;
        return resolved && resolved !== fallbackKey ? resolved : fallback;
    }
    catch {
        return fallback;
    }
}
function resolveSynthesisWorkbenchLocale() {
    const zoteroLocale = String(globalThis.Zotero?.locale || "");
    const navigatorLocale = String(globalThis.navigator?.language || "");
    return zoteroLocale || navigatorLocale || "en-US";
}
function buildSynthesisWorkbenchI18nEnvelope() {
    const messages = {};
    for (const key of SYNTHESIS_WORKBENCH_MESSAGE_KEYS) {
        messages[key] = resolveSynthesisWorkbenchMessage(key, SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key]);
    }
    return {
        locale: resolveSynthesisWorkbenchLocale(),
        messages,
    };
}
function resolveSynthesisWorkbenchMessage(key, fallback) {
    const prefixed = getStringOrFallback(key, fallback);
    if (prefixed && prefixed !== fallback) {
        return prefixed;
    }
    try {
        const pattern = addon.data.locale?.current?.formatMessagesSync?.([
            { id: key },
        ])?.[0];
        const value = String(pattern?.value || "").trim();
        return value && value !== key ? value : fallback;
    }
    catch {
        return fallback;
    }
}
function withSynthesisWorkbenchI18n(payload) {
    const i18n = buildSynthesisWorkbenchI18nEnvelope();
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return {
            ...payload,
            i18n,
        };
    }
    return { value: payload, i18n };
}
function resolveSynthesisPageUrl() {
    const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
    if (!addonRef) {
        return "about:blank";
    }
    return `chrome://${addonRef}/content/synthesis/index.html?ui=20260911-report-first-open-v3`;
}
function resolveWorkflowHostWindow(argsWindow) {
    return (argsWindow ||
        synthesisWorkbenchTab?.window ||
        globalThis.Zotero?.getMainWindow?.());
}
function resolveZoteroTabs(win) {
    return (win?.Zotero_Tabs ||
        globalThis.Zotero_Tabs);
}
function createSynthesisBrowser(doc) {
    const xulDocument = doc;
    const frame = typeof xulDocument.createXULElement === "function"
        ? xulDocument.createXULElement("browser")
        : doc.createElement("iframe");
    frame.setAttribute("data-zs-role", "synthesis-workbench-frame");
    frame.setAttribute("disableglobalhistory", "true");
    frame.setAttribute("maychangeremoteness", "true");
    frame.setAttribute("flex", "1");
    frame.setAttribute("type", "content");
    frame.setAttribute("transparent", "true");
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.minHeight = "0";
    frame.style.border = "none";
    return frame;
}
function setSynthesisBrowserSource(frame, pageUrl) {
    if (typeof HTMLIFrameElement !== "undefined" &&
        frame instanceof HTMLIFrameElement) {
        frame.src = pageUrl;
        return;
    }
    frame.setAttribute("src", pageUrl);
}
function resolveFrameWindow(frame) {
    if (!frame) {
        return null;
    }
    return (frame.contentWindow ||
        frame.contentDocument
            ?.defaultView ||
        null);
}
function writeSynthesisWorkbenchBridgeTarget(target, bridge) {
    if (!target) {
        return;
    }
    if (bridge) {
        target[SYNTHESIS_WORKBENCH_BRIDGE_KEY] = bridge;
        return;
    }
    delete target[SYNTHESIS_WORKBENCH_BRIDGE_KEY];
}
function installSynthesisWorkbenchBridge(runtime) {
    const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
    if (!frameWindow) {
        return false;
    }
    runtime.frameWindow = frameWindow;
    const bridge = {
        postMessage: async (action, payload) => {
            handleAction(runtime, {
                type: "synthesis:action",
                action,
                payload: payload && typeof payload === "object" && !Array.isArray(payload)
                    ? payload
                    : {},
            });
        },
    };
    if (citationGraphCrashJournalEnabled()) {
        bridge.recordCitationGraphCrashJournalPhase = (stage, details = {}) => recordCitationGraphCrashJournalPhase(stage, details);
    }
    const directTarget = frameWindow;
    const wrappedTarget = typeof directTarget.wrappedJSObject ===
        "object"
        ? directTarget
            .wrappedJSObject
        : null;
    writeSynthesisWorkbenchBridgeTarget(directTarget, bridge);
    writeSynthesisWorkbenchBridgeTarget(wrappedTarget, bridge);
    return true;
}
function clearSynthesisWorkbenchBridge(runtime) {
    const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
    if (!frameWindow) {
        return;
    }
    const directTarget = frameWindow;
    const wrappedTarget = typeof directTarget.wrappedJSObject ===
        "object"
        ? directTarget
            .wrappedJSObject
        : null;
    writeSynthesisWorkbenchBridgeTarget(directTarget, undefined);
    writeSynthesisWorkbenchBridgeTarget(wrappedTarget, undefined);
}
function buildDefaultSnapshotInput() {
    const libraryId = Number(globalThis.Zotero?.Libraries?.userLibraryID || 1);
    return {
        libraryId: Number.isFinite(libraryId) && libraryId > 0 ? libraryId : 1,
        storage: {
            rootState: "unbound",
        },
        preferences: {
            sourceWatchEnabled: false,
            registryAutoRebuild: false,
            graphRebuildMode: "off",
            stalenessScanEnabled: false,
            debounceMs: 0,
            startupHashCheck: false,
        },
        artifacts: [],
        deletedArtifacts: {
            rows: [],
        },
        registry: {
            rows: [],
        },
        reviews: {
            summary: {
                openCount: 0,
                indexCount: 0,
                referenceMatchingCount: 0,
                conceptCount: 0,
                topicGraphCount: 0,
            },
        },
        graph: {
            graph_hash: "",
            nodes: [],
            edges: [],
        },
    };
}
function buildSnapshotErrorInput(error) {
    const fallback = buildDefaultSnapshotInput();
    const fallbackMessage = error instanceof Error ? error.message : String(error || "unknown error");
    const sidecar = readSynthesisSidecarTraceSnapshot()
        .traces.flatMap((trace) => trace.events)
        .filter((event) => event.boundary === "supervisor" && event.outcome === "failed")
        .sort((left, right) => right.occurredAtMs - left.occurredAtMs)[0];
    const isSidecarFailure = Boolean(sidecar);
    const message = isSidecarFailure
        ? [
            `Synthesis sidecar startup failed during ${sidecar?.phase}.`,
            sidecar?.code ? `Code: ${sidecar.code}.` : "",
        ]
            .filter(Boolean)
            .join(" ")
        : fallbackMessage;
    const diagnosticCode = isSidecarFailure
        ? "synthesis_sidecar_startup_failed"
        : "synthesis_snapshot_failed";
    return {
        ...fallback,
        sync: {
            status: "check_skipped",
            diagnostics: [
                {
                    code: diagnosticCode,
                    severity: "error",
                    message,
                },
            ],
            allowedActions: [],
            requiresConfirmation: false,
        },
        maintenance: {
            summary: {
                status: "failed",
                pendingDirtyCount: 0,
                activeWorkerCount: 0,
                canonicalSyncPending: false,
                canonicalEpoch: 0,
                stale: [],
                missing: ["reference-sidecar:library", "citation-graph:library"],
                partial: [],
                recommendedCommands: [],
                diagnostics: [
                    {
                        code: diagnosticCode,
                        severity: "error",
                        message,
                    },
                ],
            },
            backgroundJobs: [],
        },
    };
}
function surfaceForTab(tab) {
    if (tab === "overview")
        return "home";
    if (tab === "artifacts")
        return "topics";
    if (tab === "registry")
        return "index";
    if (tab === "reviews")
        return "review";
    return tab;
}
function snapshotForRuntime(runtime) {
    const input = runtime.snapshotInput || buildDefaultSnapshotInput();
    const graph = input.graph;
    const graphLayoutFailure = selectSynthesisWorkbenchGraphLayoutFailure({
        graphHash: graph?.graph_hash,
        layoutAlgorithm: runtime.state.graph.layoutAlgorithm,
        failure: runtime.graphLayoutFailure,
    });
    const graphDiagnostics = { ...(graph?.diagnostics || {}) };
    delete graphDiagnostics.layout_failure;
    if (graphLayoutFailure) {
        graphDiagnostics.layout_failure = {
            graph_hash: graphLayoutFailure.graphHash,
            layout_algorithm: graphLayoutFailure.layoutAlgorithm,
            code: graphLayoutFailure.code,
            ...(graphLayoutFailure.mutationStatus
                ? { mutation_status: graphLayoutFailure.mutationStatus }
                : {}),
            message: graphLayoutFailure.message,
            occurred_at: graphLayoutFailure.occurredAt,
        };
    }
    return buildSynthesisUiSnapshot({
        ...input,
        sidecarStatus: getSynthesisWorkbenchSidecarStatus(),
        actions: actionStatusInput(runtime),
        ...(graph
            ? {
                graph: {
                    ...graph,
                    layoutStatus: resolveSynthesisWorkbenchGraphLayoutStatus({
                        graphHash: graph.graph_hash,
                        layoutAlgorithm: runtime.state.graph.layoutAlgorithm,
                        layoutStatus: graph.layoutStatus,
                        failure: runtime.graphLayoutFailure,
                    }),
                    diagnostics: graphDiagnostics,
                },
            }
            : {}),
    }, runtime.state);
}
function mergeRuntimeSnapshotInput(runtime, patch) {
    runtime.snapshotInput = mergeSynthesisUiSnapshotInput(runtime.snapshotInput || buildDefaultSnapshotInput(), patch);
    prewarmedSynthesisSnapshotInput = runtime.snapshotInput;
}
function markSurfaceLoaded(runtime, surface, libraryReadModelRevision = runtime.libraryReadModelRevision) {
    runtime.loadedSurfaces.add(surface);
    if (runtime.libraryReadModelRevision === libraryReadModelRevision) {
        runtime.dirtySurfaces.delete(surface);
    }
    else {
        runtime.dirtySurfaces.add(surface);
    }
}
function markSurfaceDirty(runtime, surface) {
    runtime.dirtySurfaces.add(surface);
}
function registerSynthesisWorkbenchRuntime(runtime) {
    synthesisWorkbenchRuntimes.add(runtime);
    runtime.removeSidecarStatusListener =
        subscribeSynthesisWorkbenchSidecarStatus(() => {
            if (!runtime.cleanedUp)
                void sendChrome(runtime, { refreshFromService: false });
        });
    const observe = async () => {
        if (runtime.cleanedUp ||
            runtime.sidecarStatusObservationRunning ||
            runtime.frameWindow?.document?.visibilityState === "hidden") {
            return;
        }
        runtime.sidecarStatusObservationRunning = true;
        try {
            await observeSynthesisWorkbenchSidecarStatus();
        }
        finally {
            runtime.sidecarStatusObservationRunning = false;
        }
    };
    registerBackgroundRefreshTimer({
        owner: "synthesis-sidecar-workbench-status",
        activationCondition: "Synthesis Workbench is mounted and foreground",
        scopeKey: runtime.tabId,
        allowedDataSources: ["sidecar supervisor snapshot", "sidecar health"],
        maxReadShape: "bounded lifecycle and compute-pool counters",
        requiresForegroundSurface: true,
        minimumIntervalMs: SYNTHESIS_WORKBENCH_SIDECAR_STATUS_INTERVAL_MS,
        intervalMs: SYNTHESIS_WORKBENCH_SIDECAR_STATUS_INTERVAL_MS,
    });
    runtime.sidecarStatusTimer = setInterval(() => void observe(), SYNTHESIS_WORKBENCH_SIDECAR_STATUS_INTERVAL_MS);
    void observe();
}
function scheduleLibraryReadModelSurfaceRefresh(runtime, surfaces) {
    if (runtime.libraryReadModelDirtyTimer) {
        clearTimeout(runtime.libraryReadModelDirtyTimer);
    }
    runtime.libraryReadModelDirtyTimer = globalThis.setTimeout(() => {
        runtime.libraryReadModelDirtyTimer = undefined;
        const activeSurface = surfaceForTab(runtime.state.selectedTab);
        if (!surfaces.includes(activeSurface)) {
            return;
        }
        if (!surfaceNeedsServiceRefresh(runtime, activeSurface)) {
            return;
        }
        void sendSurface(runtime, activeSurface, {
            refreshFromService: true,
        });
    }, SYNTHESIS_WORKBENCH_LIBRARY_INVALIDATION_DEBOUNCE_MS);
}
export function notifySynthesisWorkbenchLibraryItemsChanged(args) {
    synthesisLibraryReadModelRevision += 1;
    const invalidatedSurfaces = isSynthesisLiteratureScoreInvalidationEvent(args)
        ? ["index", "topics", "home"]
        : ["index"];
    for (const runtime of synthesisWorkbenchRuntimes) {
        runtime.libraryReadModelRevision = synthesisLibraryReadModelRevision;
        invalidatedSurfaces.forEach((surface) => markSurfaceDirty(runtime, surface));
        scheduleLibraryReadModelSurfaceRefresh(runtime, invalidatedSurfaces);
    }
    return {
        revision: synthesisLibraryReadModelRevision,
        invalidatedRuntimes: synthesisWorkbenchRuntimes.size,
        invalidatedSurfaces,
        event: args.event,
        type: args.type,
        itemCount: args.ids?.length || 0,
    };
}
function handleSynthesisWorkbenchSidecarChanged(args) {
    const invalidatedSurfaces = args.invalidatedSurfaces;
    for (const runtime of synthesisWorkbenchRuntimes) {
        if (invalidatedSurfaces.includes("graph")) {
            runtime.graphGeneration += 1;
            runtime.graphWindow = undefined;
        }
        invalidatedSurfaces.forEach((surface) => markSurfaceDirty(runtime, surface));
        scheduleLibraryReadModelSurfaceRefresh(runtime, invalidatedSurfaces);
        void sendChrome(runtime, { refreshFromService: true }).catch((error) => reportWorkbenchError(error, runtime.window));
    }
    return {
        invalidatedRuntimes: synthesisWorkbenchRuntimes.size,
        invalidatedSurfaces,
        reason: args.reason,
        sourceRefs: (args.sourceRefs || []).filter(Boolean),
    };
}
registerSynthesisWorkbenchSidecarChangeListener(handleSynthesisWorkbenchSidecarChanged);
function surfaceNeedsServiceRefresh(runtime, surface) {
    return (!runtime.loadedSurfaces.has(surface) || runtime.dirtySurfaces.has(surface));
}
function findCreateTopicSynthesisWorkflow() {
    return (getLoadedWorkflowEntries().find((entry) => entry.manifest.id === "create-topic-synthesis") || null);
}
function findUpdateTopicSynthesisWorkflow() {
    return (getLoadedWorkflowEntries().find((entry) => entry.manifest.id === "update-topic-synthesis") || null);
}
function findTagBootstrapperWorkflow() {
    return (getLoadedWorkflowEntries().find((entry) => entry.manifest.id === "tag-bootstrapper") || null);
}
function findRegistryItemWorkflow(workflowId) {
    if (workflowId !== "literature-analysis" && workflowId !== "tag-regulator") {
        throw new Error(`Unsupported registry item workflow: ${workflowId}`);
    }
    const workflow = getLoadedWorkflowEntries().find((entry) => entry.manifest.id === workflowId);
    if (!workflow) {
        throw new Error(`Cannot run ${workflowId}: workflow is not loaded. Rescan builtin workflows and try again.`);
    }
    return workflow;
}
async function runCreateTopicSynthesisFromWorkbench(args) {
    const hostWindow = resolveWorkflowHostWindow(args.hostWindow);
    if (!hostWindow) {
        throw new Error("Cannot run synthesis: Zotero main window is unavailable.");
    }
    const workflow = findCreateTopicSynthesisWorkflow();
    if (!workflow) {
        alertWindow(hostWindow, "Cannot run synthesis: create-topic-synthesis workflow is not loaded. Rescan builtin workflows and try again.");
        return;
    }
    await executeWorkflowFromCurrentSelection({
        win: hostWindow,
        workflow,
        requireSettingsGate: true,
    });
}
async function runUpdateTopicSynthesisFromWorkbench(args) {
    const hostWindow = resolveWorkflowHostWindow(args.hostWindow);
    if (!hostWindow) {
        throw new Error("Cannot update synthesis: Zotero main window is unavailable.");
    }
    const workflow = findUpdateTopicSynthesisWorkflow();
    if (!workflow) {
        alertWindow(hostWindow, "Cannot update synthesis: update-topic-synthesis workflow is not loaded. Rescan builtin workflows and try again.");
        return;
    }
    const client = await getDefaultSynthesisClient();
    const topicInput = toSynthesisUiSnapshotInput(await client.workbench.readSurface({
        surface: "topics",
        state: toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
    }));
    const snapshot = buildSynthesisUiSnapshot(mergeSynthesisUiSnapshotInput(buildDefaultSnapshotInput(), topicInput), createDefaultSynthesisUiState());
    const row = snapshot.artifacts.rows.find((entry) => String(entry.id || "").trim() === args.topicId);
    if (!row?.updateIntent || row.updateIntent.blocked === true) {
        alertWindow(hostWindow, `Topic does not need update: ${args.topicId}`);
        return;
    }
    await executeWorkflowFromCurrentSelection({
        win: hostWindow,
        workflow,
        requireSettingsGate: true,
        settingsGateInitialOptions: {
            workflowParams: {
                topicId: args.topicId,
            },
        },
    });
}
async function runTagBootstrapperFromWorkbench(args) {
    const hostWindow = resolveWorkflowHostWindow(args.hostWindow);
    if (!hostWindow) {
        throw new Error("Cannot bootstrap tags: Zotero main window is unavailable.");
    }
    const workflow = findTagBootstrapperWorkflow();
    if (!workflow) {
        alertWindow(hostWindow, "Cannot bootstrap tags: tag-bootstrapper workflow is not loaded. Rescan builtin workflows and try again.");
        return;
    }
    await executeWorkflowFromCurrentSelection({
        win: hostWindow,
        workflow,
        requireSettingsGate: true,
    });
}
async function runRegistryItemWorkflowFromWorkbench(runtime, args) {
    const hostWindow = await selectZoteroItem(runtime, args);
    await executeWorkflowFromCurrentSelection({
        win: hostWindow,
        workflow: findRegistryItemWorkflow(args.workflowId),
        requireSettingsGate: true,
    });
}
function postWorkbenchMessage(runtime, type, payload) {
    if (!runtime?.frameWindow) {
        return;
    }
    runtime.frameWindow.postMessage({
        type,
        payload: withSynthesisWorkbenchI18n(payload),
    }, "*");
}
function commandArgsFromPayload(payload) {
    return payload?.args && typeof payload.args === "object"
        ? payload.args
        : {};
}
function actionStatusInput(runtime) {
    return {
        inFlight: Array.from(runtime.inFlightCommands.values()),
        lastCompleted: runtime.lastCompletedCommand,
        lastFailed: runtime.lastFailedCommand,
        warnings: runtime.actionWarnings.slice(-4),
    };
}
function operationForHostCommand(command, args, status, message) {
    const timestamp = new Date().toISOString();
    return {
        key: getSynthesisUiOperationKey(command, args),
        command,
        status,
        label: getSynthesisUiOperationLabel(command),
        started_at: status === "running" || status === "pending" ? timestamp : undefined,
        completed_at: status === "completed" || status === "failed" ? timestamp : undefined,
        message,
    };
}
function recordDuplicateActionWarning(runtime, operation) {
    runtime.actionWarnings.push({
        ...operation,
        status: "queued",
        message: "This action is already running.",
    });
    runtime.actionWarnings = runtime.actionWarnings.slice(-6);
}
function ensureCommandProgressPolling(runtime) {
    if (runtime.commandProgressTimer) {
        return;
    }
    registerBackgroundRefreshTimer({
        owner: "synthesis-command-progress",
        activationCondition: "synthesis command is in flight",
        scopeKey: "in-flight synthesis commands",
        allowedDataSources: ["synthesis command progress"],
        maxReadShape: "current command progress snapshot only",
        requiresForegroundSurface: true,
        minimumIntervalMs: SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS,
        intervalMs: SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS,
    });
    runtime.commandProgressTimer = globalThis.setInterval(() => {
        if (!runtime.inFlightCommands.size) {
            clearCommandProgressPolling(runtime);
            return;
        }
        void refreshWorkbenchCommandProgress(runtime);
    }, SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS);
}
function clearCommandProgressPolling(runtime) {
    if (!runtime.commandProgressTimer) {
        return;
    }
    globalThis.clearInterval(runtime.commandProgressTimer);
    runtime.commandProgressTimer = undefined;
}
function isSyncRuntimeCommand(command) {
    return (command === "syncWebDavNow" ||
        command === "pauseWebDavSync" ||
        command === "resumeWebDavSync" ||
        command === "retryWebDavSync" ||
        command === "resolveWebDavSyncConflict");
}
function hasInFlightSyncCommand(runtime) {
    return Array.from(runtime.inFlightCommands.values()).some((operation) => isSyncRuntimeCommand(operation.command));
}
async function refreshWorkbenchCommandProgress(runtime) {
    if (!runtime?.frameWindow) {
        return;
    }
    if (runtime.commandProgressSnapshotRunning) {
        return;
    }
    runtime.commandProgressSnapshotRunning = true;
    const readRevision = ++runtime.chromeReadRevision;
    try {
        if (hasInFlightSyncCommand(runtime)) {
            await sendChrome(runtime, {
                refreshFromService: true,
            });
            return;
        }
        if (!runtime.snapshotInputLocked) {
            const client = await getDefaultSynthesisClient();
            const input = toSynthesisUiSnapshotInput(await client.workbench.readProgress());
            if (readRevision !== runtime.chromeReadRevision || runtime.cleanedUp) {
                return;
            }
            mergeRuntimeSnapshotInput(runtime, input);
        }
        await sendChrome(runtime, {
            refreshFromService: false,
        });
    }
    catch {
        if (readRevision !== runtime.chromeReadRevision || runtime.cleanedUp) {
            return;
        }
        await sendChrome(runtime, {
            refreshFromService: false,
        });
    }
    finally {
        runtime.commandProgressSnapshotRunning = false;
    }
}
function runWorkbenchCommandOnce(runtime, command, args, run, options = {}) {
    const operation = operationForHostCommand(command, args, "running");
    if (runtime.inFlightCommands.has(operation.key)) {
        recordDuplicateActionWarning(runtime, operation);
        void sendChrome(runtime, {
            refreshFromService: false,
        });
        return;
    }
    runtime.inFlightCommands.set(operation.key, operation);
    void sendChrome(runtime, {
        refreshFromService: isSyncRuntimeCommand(command),
    });
    ensureCommandProgressPolling(runtime);
    let commandSucceeded = false;
    const start = () => run()
        .then(() => {
        commandSucceeded = true;
        runtime.lastCompletedCommand = {
            ...operation,
            status: "completed",
            completed_at: new Date().toISOString(),
        };
        runtime.lastFailedCommand = undefined;
    })
        .catch((error) => {
        const message = error instanceof Error
            ? error.message
            : String(error || "unknown error");
        runtime.lastFailedCommand = {
            ...operation,
            status: "failed",
            completed_at: new Date().toISOString(),
            message,
        };
        reportWorkbenchError(error, runtime.window);
    })
        .finally(() => {
        runtime.inFlightCommands.delete(operation.key);
        if (!runtime.inFlightCommands.size) {
            clearCommandProgressPolling(runtime);
        }
        void sendChrome(runtime, {
            refreshFromService: options.refreshFromService !== false,
        });
        const invalidatedSurfaces = surfacesInvalidatedByCommand(command);
        invalidatedSurfaces.forEach((surface) => markSurfaceDirty(runtime, surface));
        const activeSurface = surfaceForTab(runtime.state.selectedTab);
        const activeSurfaceRefresh = invalidatedSurfaces.includes(activeSurface)
            ? sendSurface(runtime, activeSurface, {
                refreshFromService: options.refreshFromService !== false,
            })
            : Promise.resolve();
        if (commandSucceeded &&
            isCitationGraphCacheCommand(command) &&
            activeSurface === "graph") {
            void activeSurfaceRefresh
                .then(() => refreshGraphLayoutIfNeeded(runtime))
                .catch((error) => reportWorkbenchError(error, runtime.window));
        }
    });
    if (options.deferStart) {
        globalThis.setTimeout(() => void start(), 0);
        return;
    }
    void start();
}
function isCitationGraphCacheCommand(command) {
    return (command === "rebuildCitationGraphCacheNow" ||
        command === "refreshCitationGraphCacheIncrementalNow" ||
        command === "retryCitationGraphCacheRebuild");
}
async function observePublicMaintenanceOperation(client, accepted, options = {}) {
    let operation = accepted;
    const deadline = Date.now() + (options.deadlineMs ?? 31 * 60_000);
    while (operation.status === "pending" || operation.status === "running") {
        if (options.isDisposed?.()) {
            throw new Error(`Stopped observing Synthesis maintenance operation ${operation.operation_id}.`);
        }
        if (Date.now() >= deadline) {
            throw new Error(`Synthesis maintenance operation ${operation.operation_id} is still running after the observer deadline.`);
        }
        await delay(250);
        try {
            operation = await client.maintenance.getOperation({
                operation_id: operation.operation_id,
            });
        }
        catch (error) {
            if (error instanceof SynthesisClientError &&
                error.code === "unavailable" &&
                error.details?.sidecarCode === "service_unavailable") {
                continue;
            }
            throw error;
        }
    }
    if (operation.status === "completed") {
        return operation.receipt && typeof operation.receipt === "object"
            ? operation.receipt
            : {};
    }
    if (operation.receipt && typeof operation.receipt === "object") {
        failOnDiagnostic(operation.receipt, operation.operation_id);
        failOnSyncFailureState(operation.receipt);
    }
    throw new Error(`Synthesis maintenance operation ${operation.operation_id} ended with ${operation.status}.`);
}
function failOnDiagnostic(result, operationId) {
    if (!result || typeof result !== "object") {
        return result;
    }
    const row = result;
    const diagnostic = "diagnostic" in result && row.diagnostic;
    if (diagnostic && typeof diagnostic === "object") {
        const diagnosticRow = diagnostic;
        throw new Error(String(diagnosticRow.message || diagnosticRow.code || "Action failed."));
    }
    const maintenanceFailure = row.schema === "synthesis.maintenance_receipt.v1" &&
        row.outcome === "failed";
    if (("ok" in result && row.ok === false) ||
        maintenanceFailure ||
        operationId) {
        const diagnostics = [
            ...("diagnostics" in result && Array.isArray(row.diagnostics)
                ? row.diagnostics
                : []),
            ...("warnings" in result && Array.isArray(row.warnings)
                ? row.warnings
                : []),
        ];
        const firstDiagnostic = diagnostics.find((entry) => typeof entry === "string" ||
            (entry !== null && typeof entry === "object"));
        const message = firstDiagnostic && typeof firstDiagnostic === "object"
            ? firstDiagnostic.message ||
                firstDiagnostic.code
            : firstDiagnostic;
        const code = String(message || row.status || row.queue_state || "Action failed.");
        throw new Error(operationId ? `${code} [${operationId}]` : code);
    }
    return result;
}
function syncStateString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function firstSyncDiagnosticMessage(diagnostics, fallback = "Sync failed.") {
    const row = diagnostics.find((entry) => entry && typeof entry === "object");
    if (!row) {
        return fallback;
    }
    const code = syncStateString(row.code);
    const message = syncStateString(row.message);
    if (code && message) {
        return `${code}: ${message}`;
    }
    return message || code || fallback;
}
function failOnSyncFailureState(result) {
    if (!result || typeof result !== "object") {
        return result;
    }
    const row = result;
    const queueState = syncStateString(row.queue_state);
    const lastRun = row.last_run && typeof row.last_run === "object"
        ? row.last_run
        : {};
    const lastRunStatus = syncStateString(lastRun.status);
    const failed = queueState === "failed_retryable" ||
        queueState === "failed_permanent" ||
        lastRunStatus === "failed_retryable" ||
        lastRunStatus === "failed_permanent";
    if (!failed) {
        return result;
    }
    const diagnostics = [
        ...(Array.isArray(row.diagnostics) ? row.diagnostics : []),
        ...(Array.isArray(lastRun.diagnostics) ? lastRun.diagnostics : []),
    ];
    throw new Error(firstSyncDiagnosticMessage(diagnostics));
}
async function sendSnapshot(runtime, messageType, _options = {}) {
    if (!runtime?.frameWindow) {
        return;
    }
    if (!runtime.snapshotInput) {
        runtime.snapshotInput = buildDefaultSnapshotInput();
    }
    postWorkbenchMessage(runtime, messageType, snapshotForRuntime(runtime));
}
async function sendChrome(runtime, options = {}) {
    const refreshFromService = options.refreshFromService !== false;
    if (runtime.inFlightChromeRefresh) {
        runtime.queuedChromeRefresh = true;
        runtime.queuedServiceChromeRefresh =
            runtime.queuedServiceChromeRefresh || refreshFromService;
        return runtime.inFlightChromeRefresh;
    }
    const perform = async (nextRefreshFromService) => {
        if (!runtime?.frameWindow) {
            return;
        }
        const readRevision = ++runtime.chromeReadRevision;
        if (nextRefreshFromService && !runtime.snapshotInputLocked) {
            const client = await getDefaultSynthesisClient();
            const input = await client.workbench
                .readChrome({
                state: toSynthesisWorkbenchReadState(runtime.state),
            })
                .then(toSynthesisUiSnapshotInput)
                .catch((error) => buildSnapshotErrorInput(error));
            if (readRevision !== runtime.chromeReadRevision || runtime.cleanedUp) {
                return;
            }
            mergeRuntimeSnapshotInput(runtime, input);
        }
        if (readRevision !== runtime.chromeReadRevision || runtime.cleanedUp) {
            return;
        }
        postWorkbenchMessage(runtime, "synthesis:chrome", snapshotForRuntime(runtime));
    };
    const run = (async () => {
        let nextRefreshFromService = refreshFromService;
        for (;;) {
            runtime.queuedChromeRefresh = false;
            runtime.queuedServiceChromeRefresh = false;
            await perform(nextRefreshFromService);
            if (runtime.cleanedUp || !runtime.queuedChromeRefresh) {
                return;
            }
            nextRefreshFromService = Boolean(runtime.queuedServiceChromeRefresh);
        }
    })();
    runtime.inFlightChromeRefresh = run;
    try {
        await run;
    }
    finally {
        if (runtime.inFlightChromeRefresh === run) {
            runtime.inFlightChromeRefresh = undefined;
        }
    }
}
function graphPageNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}
function mergeGraphPageInput(runtime, input, generation, kind = "page") {
    const graph = input.graph;
    const page = graph?.page;
    if (!graph || !page || generation !== runtime.graphGeneration) {
        return false;
    }
    const graphHash = String(graph.graph_hash || "").trim();
    const querySignature = String(page.querySignature || "").trim();
    if (!graphHash || !querySignature || !runtime.graphWindow) {
        return false;
    }
    const hoverNodeIds = new Set((graph.hoverOnlyNodes || []).map((node) => node.id));
    const hoverEdgeIds = new Set((graph.hoverOnlyEdges || []).map((edge) => edge.id));
    const patch = {
        generation,
        graphHash,
        querySignature,
        nodes: (graph.nodes || []).filter((node) => node.visibility !== "hover_only" && !hoverNodeIds.has(node.id)),
        edges: (graph.edges || []).filter((edge) => edge.visibility !== "hover_only" && !hoverEdgeIds.has(edge.id)),
        hoverOnlyNodes: graph.hoverOnlyNodes || [],
        hoverOnlyEdges: graph.hoverOnlyEdges || [],
        nextCursor: String(page.nextCursor || "").trim() || undefined,
        hasMore: Boolean(page.hasMore),
        totalNodes: graphPageNumber(page.totalNodes),
        totalEdges: graphPageNumber(page.totalEdges),
        totalHoverNodes: graphPageNumber(page.totalHoverNodes),
        totalHoverEdges: graphPageNumber(page.totalHoverEdges),
    };
    const merged = kind === "slice"
        ? mergeSynthesisCitationGraphSlice(runtime.graphWindow, patch)
        : mergeSynthesisCitationGraphPage(runtime.graphWindow, patch);
    if (!merged.accepted) {
        return false;
    }
    runtime.graphWindow = merged.window;
    graph.nodes = [...merged.window.nodes, ...merged.window.hoverOnlyNodes];
    graph.edges = [...merged.window.edges, ...merged.window.hoverOnlyEdges];
    graph.hoverOnlyNodes = [...merged.window.hoverOnlyNodes];
    graph.hoverOnlyEdges = [...merged.window.hoverOnlyEdges];
    graph.page = {
        ...page,
        nextCursor: merged.window.nextCursor || "",
        hasMore: merged.window.hasMore,
        totalNodes: merged.window.totalNodes,
        totalEdges: merged.window.totalEdges,
        totalHoverNodes: merged.window.totalHoverNodes,
        totalHoverEdges: merged.window.totalHoverEdges,
        returnedNodes: merged.addedNodes,
        returnedEdges: merged.addedEdges,
        querySignature: merged.window.querySignature || "",
        windowStatus: merged.window.status,
    };
    return true;
}
function graphWindowError(error) {
    const details = error && typeof error === "object" && "details" in error
        ? error.details
        : undefined;
    return {
        code: String(details?.sidecarCode || "surface_refresh_failed"),
        reason: String(details?.sidecarReason ||
            (error instanceof Error ? error.message : error || "")).slice(0, 160),
    };
}
function publishGraphPage(runtime, request) {
    if (!runtime.frameWindow || !runtime.snapshotInput)
        return;
    postWorkbenchMessage(runtime, "synthesis:graph-page", {
        surface: "graph",
        request,
        requestId: request.requestId,
        generation: runtime.graphGeneration,
        snapshot: snapshotForRuntime(runtime),
    });
}
async function loadGraphContinuationPages(runtime, request, generation) {
    if (runtime.graphPageLoop)
        return runtime.graphPageLoop;
    const loop = (async () => {
        while (!runtime.cleanedUp &&
            generation === runtime.graphGeneration &&
            isLatestSurfaceRefreshRequest(runtime, request) &&
            isActiveSurface(runtime, "graph") &&
            runtime.graphWindow?.status === "loading" &&
            runtime.graphWindow.hasMore) {
            const cursor = runtime.graphWindow.nextCursor;
            const graphHash = runtime.graphWindow.graphHash;
            if (!cursor || !graphHash)
                break;
            try {
                const client = await getDefaultSynthesisClient();
                const input = toSynthesisUiSnapshotInput(await client.workbench.readSurface({
                    surface: "graph",
                    state: toSynthesisWorkbenchReadState(runtime.state, {
                        graphWindowCursor: cursor,
                        expectedGraphHash: graphHash,
                    }),
                }));
                if (!isLatestSurfaceRefreshRequest(runtime, request) ||
                    !isActiveSurface(runtime, "graph") ||
                    generation !== runtime.graphGeneration ||
                    !mergeGraphPageInput(runtime, input, generation)) {
                    break;
                }
                mergeRuntimeSnapshotInput(runtime, input);
                publishGraphPage(runtime, request);
                await yieldToEventLoop();
            }
            catch (error) {
                if (generation !== runtime.graphGeneration || !runtime.graphWindow) {
                    break;
                }
                const failure = graphWindowError(error);
                runtime.graphWindow = failSynthesisCitationGraphWindow(runtime.graphWindow, failure.code, failure.reason);
                if (runtime.snapshotInput?.graph?.page) {
                    runtime.snapshotInput.graph.page = {
                        ...runtime.snapshotInput.graph.page,
                        windowStatus: "failed",
                        error: failure,
                    };
                }
                publishGraphPage(runtime, request);
                break;
            }
        }
    })();
    runtime.graphPageLoop = loop;
    try {
        await loop;
    }
    finally {
        if (runtime.graphPageLoop === loop)
            runtime.graphPageLoop = undefined;
    }
}
function currentGraphSurfaceRequest(runtime) {
    return currentSurfaceRequest(runtime, "graph");
}
async function expandGraphNeighborhood(runtime, payload) {
    const window = runtime.graphWindow;
    const request = currentGraphSurfaceRequest(runtime);
    const nodeId = String(payload.nodeId || "").trim();
    const direction = String(payload.direction || "both");
    if (!window?.graphHash ||
        !window.querySignature ||
        !request ||
        !nodeId ||
        !["incoming", "outgoing", "both"].includes(direction)) {
        return;
    }
    const generation = runtime.graphGeneration;
    const client = await getDefaultSynthesisClient();
    const result = await client.graph.getSlice({
        startNodeId: nodeId,
        depth: 1,
        direction: direction,
        maxNodes: 100,
        maxEdges: 200,
        expectedGraphHash: window.graphHash,
        querySignature: window.querySignature,
        layoutAlgorithm: runtime.state.graph.layoutAlgorithm,
        filters: {
            ...(runtime.state.graph.topicId === "all"
                ? {}
                : { topicId: runtime.state.graph.topicId }),
            nodeKinds: runtime.state.graph.nodeKinds,
            roles: runtime.state.graph.role === "all" ? [] : [runtime.state.graph.role],
            includeLowSignal: runtime.state.graph.showLowSignalReferences,
            search: runtime.state.graph.search,
        },
    });
    if (generation !== runtime.graphGeneration ||
        !isLatestSurfaceRefreshRequest(runtime, request) ||
        !isActiveSurface(runtime, "graph")) {
        return;
    }
    const input = {
        libraryId: runtime.snapshotInput?.libraryId || 0,
        graph: {
            graph_hash: result.graph_hash,
            nodes: result.nodes.map((node) => ({
                id: node.node_id,
                label: node.title || node.node_id,
                kind: node.kind,
                year: node.year,
                authors: node.authors,
                low_signal: node.low_signal,
                external_degree: node.external_degree,
                visibility: node.visibility,
                display_tier: node.display_tier,
            })),
            edges: result.edges.map((edge) => ({
                id: edge.edge_id,
                source: edge.source,
                target: edge.target,
                primary_role: edge.primary_role,
                mention_count: edge.mention_count,
                visibility: edge.visibility,
            })),
            page: {
                querySignature: result.querySignature || window.querySignature,
                nextCursor: window.nextCursor || "",
                hasMore: window.hasMore,
                totalNodes: window.totalNodes,
                totalEdges: window.totalEdges,
                totalHoverNodes: window.totalHoverNodes,
                totalHoverEdges: window.totalHoverEdges,
                windowStatus: window.status,
                roleOptions: runtime.snapshotInput?.graph?.page?.roleOptions || [],
            },
        },
    };
    if (mergeGraphPageInput(runtime, input, generation, "slice")) {
        mergeRuntimeSnapshotInput(runtime, input);
        publishGraphPage(runtime, request);
    }
}
async function performSurfaceSend(runtime, surface, options = {}) {
    if (!runtime?.frameWindow) {
        return;
    }
    const refreshFromService = options.refreshFromService !== false;
    const presentationOnly = !refreshFromService;
    const request = (presentationOnly ? currentSurfaceRequest(runtime, surface) : undefined) ||
        beginSurfaceRefreshRequest(runtime, surface, refreshFromService);
    const graphGeneration = surface === "graph" && refreshFromService
        ? ++runtime.graphGeneration
        : runtime.graphGeneration;
    if (surface === "graph" && refreshFromService) {
        // Detach the superseded loop immediately. Its generation guard will make
        // any in-flight result inert while the replacement query starts loading.
        runtime.graphPageLoop = undefined;
        runtime.graphWindow = createSynthesisCitationGraphWindow({
            generation: graphGeneration,
        });
    }
    try {
        if (refreshFromService && !runtime.snapshotInputLocked) {
            const client = await getDefaultSynthesisClient();
            const input = toSynthesisUiSnapshotInput(await client.workbench.readSurface({
                surface,
                state: toSynthesisWorkbenchReadState(runtime.state),
            }));
            if (!isLatestSurfaceRefreshRequest(runtime, request)) {
                return;
            }
            if (surface === "graph" &&
                String(input.graph?.graph_hash || "").trim() &&
                !mergeGraphPageInput(runtime, input, graphGeneration)) {
                return;
            }
            mergeRuntimeSnapshotInput(runtime, input);
            markSurfaceLoaded(runtime, surface, request.libraryReadModelRevision);
            if (runtime.libraryReadModelRevision !== request.libraryReadModelRevision &&
                isActiveSurface(runtime, surface)) {
                runtime.queuedServiceSurfaceRefreshes.add(surface);
            }
        }
        if (!isLatestSurfaceRefreshRequest(runtime, request) ||
            !isActiveSurface(runtime, surface)) {
            return;
        }
        postWorkbenchMessage(runtime, "synthesis:surface", {
            surface,
            request,
            requestId: request.requestId,
            snapshot: snapshotForRuntime(runtime),
        });
        if (surface === "graph" &&
            refreshFromService &&
            runtime.graphWindow?.status === "loading") {
            void loadGraphContinuationPages(runtime, request, graphGeneration);
        }
    }
    catch (error) {
        if (!isLatestSurfaceRefreshRequest(runtime, request) ||
            !isActiveSurface(runtime, surface)) {
            return;
        }
        const transient = isTransientStorageBusyError(error);
        postWorkbenchMessage(runtime, "synthesis:surface-error", {
            surface,
            request,
            requestId: request.requestId,
            transient,
            code: transient ? "storage_busy" : "surface_refresh_failed",
            message: error instanceof Error ? error.message : String(error || ""),
        });
    }
}
async function sendSurface(runtime, surface, options = {}) {
    const refreshFromService = options.refreshFromService !== false;
    if (!refreshFromService) {
        await performSurfaceSend(runtime, surface, { refreshFromService: false });
        return;
    }
    const inFlight = runtime.inFlightSurfaceRefreshes[surface];
    if (inFlight) {
        if (refreshFromService) {
            runtime.queuedServiceSurfaceRefreshes.add(surface);
        }
        return inFlight;
    }
    const run = (async () => {
        let nextRefreshFromService = refreshFromService;
        do {
            runtime.queuedServiceSurfaceRefreshes.delete(surface);
            await performSurfaceSend(runtime, surface, {
                refreshFromService: nextRefreshFromService,
            });
            nextRefreshFromService =
                runtime.queuedServiceSurfaceRefreshes.has(surface) &&
                    isActiveSurface(runtime, surface);
        } while (nextRefreshFromService);
    })();
    runtime.inFlightSurfaceRefreshes[surface] = run;
    try {
        await run;
    }
    finally {
        if (runtime.inFlightSurfaceRefreshes[surface] === run) {
            delete runtime.inFlightSurfaceRefreshes[surface];
        }
    }
}
function currentSurfaceRequest(runtime, surface) {
    const requestId = runtime.latestSurfaceRequestBySurface[surface];
    if (!requestId)
        return undefined;
    return {
        requestId,
        surface,
        selectedTabAtRequest: runtime.state.selectedTab,
        refreshFromService: true,
        libraryReadModelRevision: runtime.libraryReadModelRevision,
        startedAt: new Date().toISOString(),
    };
}
async function sendActiveSurface(runtime, options = {}) {
    await sendSurface(runtime, surfaceForTab(runtime.state.selectedTab), options);
}
function scheduleActiveSurfaceRefresh(runtime, options = {}) {
    const scheduledSurface = surfaceForTab(runtime.state.selectedTab);
    globalThis.setTimeout(() => {
        if (!isActiveSurface(runtime, scheduledSurface)) {
            return;
        }
        const refreshFromService = options.refreshFromService !== undefined
            ? options.refreshFromService
            : surfaceNeedsServiceRefresh(runtime, scheduledSurface);
        void sendSurface(runtime, scheduledSurface, { refreshFromService });
    }, 0);
}
async function sendTopicDetail(runtime, topicId) {
    if (!runtime?.frameWindow) {
        return;
    }
    const client = await getDefaultSynthesisClient();
    const detail = await client.workbench.readTopicDetail({
        topicId,
    });
    if (!runtime.snapshotInputLocked &&
        surfaceNeedsServiceRefresh(runtime, "concepts")) {
        const conceptInput = await client.workbench
            .readSurface({
            surface: "concepts",
            state: toSynthesisWorkbenchReadState(runtime.state),
        })
            .then(toSynthesisUiSnapshotInput)
            .catch(() => undefined);
        if (conceptInput) {
            mergeRuntimeSnapshotInput(runtime, conceptInput);
            markSurfaceLoaded(runtime, "concepts");
        }
    }
    const result = applySynthesisUiAction(runtime.state, {
        action: "showArtifactReader",
        payload: { topicId },
    });
    runtime.state = result.state;
    await sendSurface(runtime, "reader", {
        refreshFromService: false,
    });
    postWorkbenchMessage(runtime, "synthesis:topic-detail", detail);
}
async function sendTopicDigest(runtime, args) {
    if (!runtime?.frameWindow) {
        return;
    }
    const client = await getDefaultSynthesisClient();
    const digest = await client.workbench.readPaperDigest(toSynthesisWorkbenchPaperDigestReadRequest(args));
    postWorkbenchMessage(runtime, "synthesis:digest", digest);
}
function cleanReportExportString(value) {
    return String(value || "").trim();
}
function safeTopicReportExportFileName(value) {
    const base = cleanReportExportString(value)
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120);
    return `${base || "synthesis-report"}-synthesis-report.md`;
}
function ensureMarkdownExportPath(pathRaw) {
    const path = cleanReportExportString(pathRaw);
    if (!path) {
        return "";
    }
    return /\.md$/i.test(path) ? path : `${path}.md`;
}
function ensureHtmlExportPath(pathRaw) {
    const path = cleanReportExportString(pathRaw);
    if (!path) {
        return "";
    }
    return /\.html?$/i.test(path) ? path : `${path}.html`;
}
function safeTopicDetailHtmlExportFileName(value) {
    const base = cleanReportExportString(value)
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120);
    return `${base || "synthesis-topic"}-topic-details.html`;
}
function resolveWorkbenchFilePicker() {
    const toolkit = resolveRuntimeToolkit();
    return typeof toolkit?.FilePicker === "function" ? toolkit.FilePicker : null;
}
async function pickTopicReportExportPath(runtime, suggestedFileName) {
    const FilePicker = resolveWorkbenchFilePicker();
    if (!FilePicker) {
        throw new Error("Zotero file picker is unavailable.");
    }
    const selected = await new FilePicker("Export synthesis report", "save", [
        ["Markdown", "*.md"],
        ["All files", "*.*"],
    ], suggestedFileName, (runtime.frameWindow || runtime.hostWindow || runtime.window)).open();
    return typeof selected === "string" && selected.trim()
        ? ensureMarkdownExportPath(selected)
        : "";
}
async function pickTopicDetailHtmlExportPath(runtime, suggestedFileName) {
    const FilePicker = resolveWorkbenchFilePicker();
    if (!FilePicker) {
        throw new Error("Zotero file picker is unavailable.");
    }
    const selected = await new FilePicker(localize("synthesis-export-topic-html-dialog-title", "Export topic details HTML"), "save", [
        [localize("synthesis-export-topic-html-file-type", "HTML"), "*.html"],
        ["All files", "*.*"],
    ], suggestedFileName, (runtime.frameWindow || runtime.hostWindow || runtime.window)).open();
    return typeof selected === "string" && selected.trim()
        ? ensureHtmlExportPath(selected)
        : "";
}
function escapeHtmlText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
function jsonScriptText(value) {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}
function inlineScriptText(value) {
    return value.replace(/<\/script/gi, "<\\/script");
}
function cssDataUrlForSvg(value) {
    return `data:image/svg+xml,${encodeURIComponent(value)
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")}`;
}
async function readPackagedTextAsset(relativePath) {
    const read = await readPackagedBinaryAsset(relativePath);
    if (!read.ok) {
        const checked = [
            ...read.diagnostics.checkedUris,
            ...read.diagnostics.checkedPaths,
        ].join(", ");
        throw new Error(`Unable to read packaged asset ${relativePath}. Checked: ${checked}`);
    }
    const Decoder = globalThis.TextDecoder ||
        TextDecoder;
    return new Decoder("utf-8").decode(read.bytes);
}
async function inlineMaterialSymbolIconUrls(css) {
    const replacements = new Map();
    const matches = css.matchAll(/url\(["']?(\.\.\/icons\/material-symbols\/[^"')]+\.svg)["']?\)/g);
    for (const match of matches) {
        const rawUrl = match[1] || "";
        if (!rawUrl || replacements.has(rawUrl)) {
            continue;
        }
        const svgPath = rawUrl.replace(/^\.\.\//, "content/");
        const svg = await readPackagedTextAsset(svgPath);
        replacements.set(rawUrl, cssDataUrlForSvg(svg));
    }
    return Array.from(replacements.entries()).reduce((nextCss, [rawUrl, dataUrl]) => nextCss.replaceAll(`url("${rawUrl}")`, `url("${dataUrl}")`), css);
}
async function readSynthesisExportAssets() {
    const [themeJs, themeCss, iconsCss, topicTimelineCss, katexCss, synthesisCss, markdownItJs, katexJs, texmathJs, markdownRendererJs, appJs,] = await Promise.all([
        readPackagedTextAsset("content/shared/theme.js"),
        readPackagedTextAsset("content/shared/theme.css"),
        readPackagedTextAsset("content/shared/icons.css").then(inlineMaterialSymbolIconUrls),
        readPackagedTextAsset("content/shared/topicTimeline.css"),
        readPackagedTextAsset("content/shared/vendor/katex/katex.min.css"),
        readPackagedTextAsset("content/synthesis/styles.css"),
        readPackagedTextAsset("content/shared/vendor/markdown-it/markdown-it.min.js"),
        readPackagedTextAsset("content/shared/vendor/katex/katex.min.js"),
        readPackagedTextAsset("content/shared/vendor/markdown-it-texmath/texmath.min.js"),
        readPackagedTextAsset("content/shared/markdown-renderer.js"),
        readPackagedTextAsset("content/synthesis/topic-export.bundle.js"),
    ]);
    return {
        themeJs,
        themeCss,
        iconsCss,
        topicTimelineCss,
        katexCss,
        synthesisCss,
        markdownItJs,
        katexJs,
        texmathJs,
        markdownRendererJs,
        appJs,
    };
}
function cleanExportRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
function exportDigestKeys(evidence, digest) {
    const digestRef = cleanExportRecord(evidence.digest_ref || evidence.digestRef);
    return Array.from(new Set([
        evidence.id,
        evidence.paper_ref,
        evidence.paperRef,
        digestRef.paper_ref,
        digestRef.paperRef,
        digestRef.note_key,
        digestRef.noteKey,
        digestRef.payload_hash,
        digestRef.payloadHash,
        digest.paper_ref,
        digest.paperRef,
        digest.payload_hash,
        digest.payloadHash,
    ]
        .map((value) => cleanReportExportString(value))
        .filter(Boolean)));
}
async function resolveTopicExportDigests(detail, topicId) {
    const digestsByKey = {};
    let clientPromise;
    const resolveClient = () => (clientPromise ||= getDefaultSynthesisClient());
    const sourcePapers = Array.isArray(detail.source_papers)
        ? detail.source_papers
        : [];
    await Promise.all(sourcePapers.map(async (entry) => {
        const evidence = cleanExportRecord(entry);
        const paperRef = evidence.paper_ref || evidence.paperRef;
        const digestRef = evidence.digest_ref || evidence.digestRef;
        if (!paperRef && !digestRef) {
            return;
        }
        let digest;
        try {
            const client = await resolveClient();
            digest = cleanExportRecord(await client.workbench.readPaperDigest(toSynthesisWorkbenchPaperDigestReadRequest({
                topicId,
                paper_ref: paperRef,
                digest_ref: digestRef,
                include_representative_image: true,
            })));
        }
        catch (error) {
            digest = {
                ok: false,
                status: error instanceof Error ? error.message : String(error || "failed"),
            };
        }
        for (const key of exportDigestKeys(evidence, digest)) {
            digestsByKey[key] = digest;
        }
    }));
    return digestsByKey;
}
function pruneGraphToTopicSubgraph(graph, topicId) {
    const scope = (graph.topicScopes || []).find((entry) => entry.topicId === topicId);
    const sourceNodeIds = new Set(scope?.nodeIds || []);
    if (!sourceNodeIds.size) {
        return {
            ...graph,
            filters: {
                ...graph.filters,
                topicId,
                search: "",
            },
            topicScopes: scope ? [scope] : [],
            selectedTopicScope: scope,
            nodes: graph.visibleNodes,
            edges: graph.visibleEdges,
            hoverOnlyNodes: [],
            hoverOnlyEdges: [],
        };
    }
    const scopedNodeIds = new Set(sourceNodeIds);
    for (const edge of [...graph.edges, ...graph.hoverOnlyEdges]) {
        if (sourceNodeIds.has(edge.source) || sourceNodeIds.has(edge.target)) {
            scopedNodeIds.add(edge.source);
            scopedNodeIds.add(edge.target);
        }
    }
    const isScopedEdge = (edge) => scopedNodeIds.has(edge.source) &&
        scopedNodeIds.has(edge.target) &&
        (sourceNodeIds.has(edge.source) || sourceNodeIds.has(edge.target));
    const nodes = graph.nodes.filter((node) => scopedNodeIds.has(node.id));
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = graph.edges.filter((edge) => nodeIds.has(edge.source) &&
        nodeIds.has(edge.target) &&
        isScopedEdge(edge));
    const hoverOnlyNodes = graph.hoverOnlyNodes.filter((node) => scopedNodeIds.has(node.id));
    const hoverOnlyNodeIds = new Set(hoverOnlyNodes.map((node) => node.id));
    const hoverOnlyEdges = graph.hoverOnlyEdges.filter((edge) => (nodeIds.has(edge.source) || hoverOnlyNodeIds.has(edge.source)) &&
        (nodeIds.has(edge.target) || hoverOnlyNodeIds.has(edge.target)) &&
        isScopedEdge(edge));
    const visibleNodeIds = new Set(graph.visibleNodes
        .filter((node) => nodeIds.has(node.id))
        .map((node) => node.id));
    const visibleEdges = graph.visibleEdges.filter((edge) => visibleNodeIds.has(edge.source) &&
        visibleNodeIds.has(edge.target) &&
        isScopedEdge(edge));
    return {
        ...graph,
        filters: {
            ...graph.filters,
            topicId,
            search: "",
        },
        topicScopes: scope ? [scope] : [],
        selectedTopicScope: scope,
        nodes,
        edges,
        hoverOnlyNodes,
        hoverOnlyEdges,
        visibleNodes: graph.visibleNodes.filter((node) => visibleNodeIds.has(node.id)),
        visibleEdges,
    };
}
const SYNTHESIS_GRAPH_EXPORT_NODE_LIMIT = 50_000;
const SYNTHESIS_GRAPH_EXPORT_EDGE_LIMIT = 100_000;
async function readCompleteGraphSurfaceForExport(client, state) {
    const generation = 1;
    let window = createSynthesisCitationGraphWindow({
        generation,
        nodeSoftLimit: SYNTHESIS_GRAPH_EXPORT_NODE_LIMIT,
        edgeSoftLimit: SYNTHESIS_GRAPH_EXPORT_EDGE_LIMIT,
    });
    let cursor;
    let expectedGraphHash;
    let accumulated;
    do {
        const pageInput = toSynthesisUiSnapshotInput(await client.workbench.readSurface({
            surface: "graph",
            state: toSynthesisWorkbenchReadState(state, {
                graphWindowCursor: cursor,
                expectedGraphHash,
            }),
        }));
        const graph = pageInput.graph;
        const page = graph?.page;
        const graphHash = String(graph?.graph_hash || "").trim();
        const querySignature = String(page?.querySignature || "").trim();
        if (!graph || !page || !graphHash || !querySignature) {
            throw new SynthesisClientError("internal", "Citation graph export received an incomplete page", { reason: "graph_export_page_invalid" });
        }
        const hoverNodeIds = new Set((graph.hoverOnlyNodes || []).map((node) => node.id));
        const hoverEdgeIds = new Set((graph.hoverOnlyEdges || []).map((edge) => edge.id));
        const merged = mergeSynthesisCitationGraphPage(window, {
            generation,
            graphHash,
            querySignature,
            nodes: (graph.nodes || []).filter((node) => node.visibility !== "hover_only" && !hoverNodeIds.has(node.id)),
            edges: (graph.edges || []).filter((edge) => edge.visibility !== "hover_only" && !hoverEdgeIds.has(edge.id)),
            hoverOnlyNodes: graph.hoverOnlyNodes || [],
            hoverOnlyEdges: graph.hoverOnlyEdges || [],
            nextCursor: String(page.nextCursor || "").trim() || undefined,
            hasMore: page.hasMore,
            totalNodes: graphPageNumber(page.totalNodes),
            totalEdges: graphPageNumber(page.totalEdges),
            totalHoverNodes: graphPageNumber(page.totalHoverNodes),
            totalHoverEdges: graphPageNumber(page.totalHoverEdges),
        });
        if (!merged.accepted) {
            throw new SynthesisClientError("conflict", "Citation graph changed while the export was being assembled", { reason: merged.reason || "basis_mismatch" });
        }
        window = merged.window;
        if (window.status === "paused") {
            throw new SynthesisClientError("conflict", "Citation graph export exceeded its safety limit", { reason: "graph_export_limit_exceeded" });
        }
        accumulated = {
            ...pageInput,
            graph: {
                ...graph,
                nodes: [...window.nodes, ...window.hoverOnlyNodes],
                edges: [...window.edges, ...window.hoverOnlyEdges],
                hoverOnlyNodes: [...window.hoverOnlyNodes],
                hoverOnlyEdges: [...window.hoverOnlyEdges],
                page: {
                    ...page,
                    nextCursor: window.nextCursor || "",
                    hasMore: window.hasMore,
                    windowStatus: window.status,
                },
            },
        };
        cursor = window.nextCursor;
        expectedGraphHash = window.graphHash;
    } while (window.hasMore && cursor);
    if (!accumulated || window.hasMore) {
        throw new SynthesisClientError("internal", "Citation graph export could not reach a complete page window", { reason: "graph_export_incomplete" });
    }
    return accumulated;
}
async function buildTopicDetailHtmlExport(runtime, topicId) {
    const client = await getDefaultSynthesisClient();
    const detail = (await client.workbench.readTopicDetail({
        topicId,
    }));
    const readerState = applySynthesisUiAction(runtime.state, {
        action: "showArtifactReader",
        payload: { topicId },
    }).state;
    const graphState = applySynthesisUiAction(readerState, {
        action: "setGraphView",
        payload: { topicId, selectedElement: null },
    }).state;
    const graphLayoutAlgorithms = ["force", "radial", "components"];
    const graphLayoutStates = graphLayoutAlgorithms.map((layoutAlgorithm) => ({
        layoutAlgorithm,
        state: applySynthesisUiAction(readerState, {
            action: "setGraphView",
            payload: { topicId, selectedElement: null, layoutAlgorithm },
        }).state,
    }));
    const [conceptInput, graphInputs, digestsByKey, assets] = await Promise.all([
        client.workbench
            .readSurface({
            surface: "concepts",
            state: toSynthesisWorkbenchReadState(graphState),
        })
            .then(toSynthesisUiSnapshotInput),
        Promise.all(graphLayoutStates.map(async (entry) => ({
            ...entry,
            input: await readCompleteGraphSurfaceForExport(client, entry.state),
        }))),
        resolveTopicExportDigests(detail, topicId),
        readSynthesisExportAssets(),
    ]);
    const primaryGraphInput = graphInputs.find((entry) => entry.layoutAlgorithm === "force") ||
        graphInputs[0];
    if (!primaryGraphInput) {
        throw new Error("No citation graph layout input was available for export");
    }
    const snapshot = buildSynthesisUiSnapshot({
        ...conceptInput,
        ...primaryGraphInput.input,
        libraryId: primaryGraphInput.input.libraryId || conceptInput.libraryId,
    }, primaryGraphInput.state);
    const topicScopedGraph = pruneGraphToTopicSubgraph(snapshot.graph, topicId);
    const graphLayouts = Object.fromEntries(graphInputs.map((entry) => {
        const layoutSnapshot = buildSynthesisUiSnapshot({
            ...entry.input,
            libraryId: entry.input.libraryId || conceptInput.libraryId,
        }, entry.state);
        return [
            entry.layoutAlgorithm,
            pruneGraphToTopicSubgraph(layoutSnapshot.graph, topicId),
        ];
    }));
    const i18n = buildSynthesisWorkbenchI18nEnvelope();
    const envelope = {
        version: 1,
        generatedAt: new Date().toISOString(),
        i18n,
        snapshot: {
            ...snapshot,
            graph: topicScopedGraph,
        },
        topicDetail: detail,
        digestsByKey,
        graphLayouts,
    };
    const title = cleanReportExportString(detail.title) ||
        cleanReportExportString(detail.topicId) ||
        localize("synthesis-page-title", "Synthesis Workbench");
    return [
        "<!doctype html>",
        `<html lang="${escapeHtmlText(i18n.locale)}">`,
        "<head>",
        '<meta charset="UTF-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        `<title>${escapeHtmlText(title)}</title>`,
        `<script>${inlineScriptText(assets.themeJs)}</script>`,
        `<style>${assets.themeCss}\n${assets.iconsCss}\n${assets.topicTimelineCss}\n${assets.katexCss}\n${assets.synthesisCss}</style>`,
        "</head>",
        '<body class="synthesis-standalone-export">',
        '<div id="app" class="synthesis-root"></div>',
        `<script>window.__zoteroSkillsSynthesisTopicExport=${jsonScriptText(envelope)};</script>`,
        `<script>${inlineScriptText(assets.markdownItJs)}</script>`,
        `<script>${inlineScriptText(assets.katexJs)}</script>`,
        `<script>${inlineScriptText(assets.texmathJs)}</script>`,
        `<script>${inlineScriptText(assets.markdownRendererJs)}</script>`,
        `<script>${inlineScriptText(assets.appJs)}</script>`,
        "</body>",
        "</html>",
        "",
    ].join("\n");
}
async function exportTopicDetailHtml(runtime, topicId, outputPath) {
    if (!topicId) {
        throw new Error("exportTopicDetailHtml requires topicId");
    }
    if (!outputPath) {
        return;
    }
    await writeRuntimeTextFile(outputPath, await buildTopicDetailHtmlExport(runtime, topicId));
}
async function exportTopicSynthesisReport(runtime, topicId) {
    if (!topicId) {
        throw new Error("exportTopicSynthesisReport requires topicId");
    }
    const client = await getDefaultSynthesisClient();
    const report = await client.topics.getTopicReport({
        topicId,
    });
    const markdown = cleanReportExportString(report.markdown);
    if (!markdown) {
        throw new Error("Synthesis report body is unavailable.");
    }
    const title = cleanReportExportString(report.title) ||
        topicId;
    const outputPath = await pickTopicReportExportPath(runtime, safeTopicReportExportFileName(title));
    if (!outputPath) {
        return;
    }
    await writeRuntimeTextFile(outputPath, markdown.endsWith("\n") ? markdown : `${markdown}\n`);
}
function citationGraphItemKeyFromNodeId(nodeId) {
    const prefix = "zotero:item:";
    return nodeId.startsWith(prefix) ? nodeId.slice(prefix.length).trim() : "";
}
async function selectZoteroItem(runtime, args) {
    const itemKey = String(args.itemKey || "").trim();
    const libraryId = Math.max(0, Math.floor(Number(args.libraryId) || 0));
    if (!libraryId || !itemKey) {
        throw new Error("A Zotero library item is required.");
    }
    const zotero = globalThis.Zotero;
    const item = zotero?.Items?.getByLibraryAndKey?.(libraryId, itemKey);
    if (!item) {
        throw new Error(`Zotero item ${libraryId}:${itemKey} was not found.`);
    }
    const itemId = Math.max(0, Math.floor(Number(item.id || item.itemID) || 0));
    if (!itemId) {
        throw new Error(`Zotero item ${libraryId}:${itemKey} has no item id.`);
    }
    const hostWindow = resolveWorkflowHostWindow(runtime.window);
    if (!hostWindow) {
        throw new Error("Zotero main window is unavailable.");
    }
    const pane = hostWindow
        ?.ZoteroPane;
    if (typeof pane?.selectItem === "function") {
        await pane.selectItem(itemId);
    }
    else if (typeof pane?.selectItems === "function") {
        await pane.selectItems([itemId]);
    }
    else {
        throw new Error("Zotero pane cannot select items.");
    }
    hostWindow?.focus?.();
    return hostWindow;
}
async function openZoteroItemFromCitationGraphNode(runtime, args) {
    const nodeId = String(args.nodeId || "").trim();
    const itemKey = citationGraphItemKeyFromNodeId(nodeId) || String(args.itemKey || "").trim();
    const libraryId = Math.max(0, Math.floor(Number(args.libraryId) || 0));
    await selectZoteroItem(runtime, { libraryId, itemKey });
}
function currentGraphLayoutBasis(runtime, layoutAlgorithm) {
    const graphHash = String(runtime.snapshotInput?.graph?.graph_hash || "").trim();
    return graphHash ? { graphHash, layoutAlgorithm } : undefined;
}
async function recomputeWorkbenchCitationGraphLayout(runtime, layoutAlgorithm, force = false) {
    const basis = currentGraphLayoutBasis(runtime, layoutAlgorithm);
    const key = `${basis?.graphHash || "missing"}:${layoutAlgorithm}`;
    const existing = runtime.graphLayoutRefreshes.get(key);
    if (existing)
        return existing;
    const refresh = (async () => {
        const otherRefresh = Array.from(runtime.graphLayoutRefreshes.entries()).find(([otherKey]) => otherKey !== key)?.[1];
        if (otherRefresh)
            await otherRefresh.catch(() => undefined);
        const client = await getDefaultSynthesisClient();
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const result = classifySynthesisWorkbenchGraphMutationResult((await observePublicMaintenanceOperation(client, await client.graph.recomputeCitationGraphLayout({
                    algorithm: layoutAlgorithm,
                    ...(force ? { force: true } : {}),
                }), {
                    deadlineMs: 130_000,
                    isDisposed: () => Boolean(runtime.cleanedUp),
                })));
                runtime.graphLayoutFailure = undefined;
                return result;
            }
            catch (error) {
                if (!isSynthesisWorkbenchGraphApplicationBusyError(error)) {
                    if (basis) {
                        runtime.graphLayoutFailure =
                            createSynthesisWorkbenchGraphLayoutFailure({
                                ...basis,
                                error,
                            });
                        await sendSurface(runtime, "graph", {
                            refreshFromService: false,
                        }).catch(() => undefined);
                    }
                    throw error;
                }
                runtime.graphLayoutFailure = undefined;
                const observed = await observeCurrentCitationGraphLayout(runtime, layoutAlgorithm, { maxAttempts: 8 });
                if (observed || attempt === 2) {
                    return { status: "busy_observed" };
                }
                await sendSurface(runtime, "graph", {
                    refreshFromService: true,
                });
                await delay(250 * (attempt + 1));
            }
        }
        return { status: "busy_observed" };
    })();
    runtime.graphLayoutRefreshes.set(key, refresh);
    try {
        return await refresh;
    }
    finally {
        if (runtime.graphLayoutRefreshes.get(key) === refresh) {
            runtime.graphLayoutRefreshes.delete(key);
        }
    }
}
async function observeCurrentCitationGraphLayout(runtime, layoutAlgorithm, options = {}) {
    const maxAttempts = Math.max(1, options.maxAttempts || 20);
    const expectedGraphHash = String(runtime.snapshotInput?.graph?.graph_hash || "").trim();
    const client = await getDefaultSynthesisClient();
    for (let attempt = 0; !runtime.cleanedUp && attempt < maxAttempts; attempt += 1) {
        const layout = await client.graph.getPersistedLayout({
            scope: "full",
            algorithm: layoutAlgorithm,
            maxNodes: 1,
            maxEdges: 1,
            allowTruncated: true,
        });
        if (expectedGraphHash &&
            layout.graph_hash &&
            layout.graph_hash !== expectedGraphHash) {
            return undefined;
        }
        if (layout.layout_status === "ready" || layout.layout_status === "failed") {
            return layout.layout_status;
        }
        await delay(250);
    }
    return undefined;
}
function reportWorkbenchError(error, win) {
    const hostWindow = resolveWorkflowHostWindow(win);
    if (!hostWindow) {
        return;
    }
    const message = error instanceof Error ? error.message : String(error || "unknown error");
    const details = error && typeof error === "object"
        ? error.details
        : undefined;
    const record = details && typeof details === "object" && !Array.isArray(details)
        ? details
        : undefined;
    const code = [record?.reason, record?.sidecarCode].find((value) => typeof value === "string" && value.length > 0);
    alertWindow(hostWindow, code ? `${message} (reason: ${code})` : message);
}
function confirmWorkbenchAction(message, win) {
    const hostWindow = resolveWorkflowHostWindow(win);
    const confirmFn = hostWindow?.confirm;
    if (typeof confirmFn === "function") {
        return confirmFn.call(hostWindow, message);
    }
    const globalConfirm = globalThis.confirm;
    return typeof globalConfirm === "function" ? globalConfirm(message) : true;
}
function handleAction(runtime, envelope) {
    if (!runtime) {
        return;
    }
    if (envelope.action === "continueGraphWindow" ||
        envelope.action === "retryGraphWindow") {
        const current = runtime.graphWindow;
        const requestId = runtime.latestSurfaceRequestBySurface.graph;
        if (!current || !requestId || !isActiveSurface(runtime, "graph"))
            return;
        runtime.graphWindow =
            envelope.action === "continueGraphWindow"
                ? continueSynthesisCitationGraphWindow(current)
                : retrySynthesisCitationGraphWindow(current);
        if (runtime.snapshotInput?.graph?.page) {
            runtime.snapshotInput.graph.page = {
                ...runtime.snapshotInput.graph.page,
                windowStatus: runtime.graphWindow.status,
            };
        }
        const request = {
            requestId,
            surface: "graph",
            selectedTabAtRequest: "graph",
            refreshFromService: true,
            libraryReadModelRevision: runtime.libraryReadModelRevision,
            startedAt: new Date().toISOString(),
        };
        publishGraphPage(runtime, request);
        void loadGraphContinuationPages(runtime, request, runtime.graphGeneration);
        return;
    }
    if (envelope.action === "openSynthesisSidecarDiagnostics") {
        void openTaskDashboard({
            initialTabKey: "synthesis-sidecar",
            chromeWindow: runtime.window,
        });
        return;
    }
    if (envelope.action === "retrySynthesisSidecar") {
        void recoverDefaultSynthesisProductionOwner()
            .then(() => sendChrome(runtime, { refreshFromService: false }))
            .catch((error) => reportWorkbenchError(error, runtime.window));
        return;
    }
    if (envelope.action === "expandGraphNeighborhood") {
        void expandGraphNeighborhood(runtime, envelope.payload || {}).catch((error) => reportWorkbenchError(error, runtime.window));
        return;
    }
    const previousState = runtime.state;
    const result = applySynthesisUiAction(runtime.state, {
        action: envelope.action,
        payload: envelope.payload,
    });
    if (!result.handled) {
        void sendActiveSurface(runtime, {
            refreshFromService: false,
        });
        return;
    }
    runtime.state = result.state;
    const graphQueryChanged = runtime.state.selectedTab === "graph" &&
        ((envelope.action === "setFilters" && Boolean(envelope.payload?.graph)) ||
            (envelope.action === "setGraphView" &&
                ["role", "topicId", "nodeKinds", "showLowSignalReferences"].some((field) => field in (envelope.payload || {}))));
    if (graphQueryChanged) {
        void sendSurface(runtime, "graph", { refreshFromService: true });
        return;
    }
    if (envelope.action === "ready") {
        void sendChrome(runtime, { refreshFromService: true });
        return;
    }
    if (envelope.action === "refresh") {
        void sendChrome(runtime, { refreshFromService: true });
        scheduleActiveSurfaceRefresh(runtime, { refreshFromService: true });
        return;
    }
    if (envelope.action === "selectTab") {
        void sendChrome(runtime, { refreshFromService: false });
        if (runtime.state.selectedTab === "graph") {
            void refreshGraphLayoutIfNeeded(runtime).catch((error) => reportWorkbenchError(error, runtime.window));
        }
        else {
            scheduleActiveSurfaceRefresh(runtime);
        }
        return;
    }
    if (envelope.action === "setFilters") {
        const registryFilters = envelope.payload &&
            typeof envelope.payload === "object" &&
            "registry" in envelope.payload &&
            envelope.payload.registry &&
            typeof envelope.payload.registry === "object"
            ? envelope.payload.registry
            : undefined;
        const registryScopeChanged = runtime.state.selectedTab === "registry" &&
            previousState.registry.scope !== runtime.state.registry.scope;
        const registryExpandedChanged = runtime.state.selectedTab === "registry" &&
            Boolean(registryFilters && "expandedSourceRefs" in registryFilters) &&
            previousState.registry.expandedSourceRefs.join("\n") !==
                runtime.state.registry.expandedSourceRefs.join("\n");
        const reviewsFilterChanged = runtime.state.selectedTab === "reviews" &&
            envelope.payload &&
            typeof envelope.payload === "object" &&
            "reviews" in envelope.payload;
        void sendActiveSurface(runtime, {
            refreshFromService: reviewsFilterChanged || registryScopeChanged || registryExpandedChanged,
        });
        return;
    }
    if (result.hostCommand?.command === "openPreferences") {
        void addon.hooks.onPrefsEvent("openPreferencesPane", {
            window: runtime.window,
        });
    }
    if (result.hostCommand?.command === "runSynthesizeTopic") {
        runWorkbenchCommandOnce(runtime, "runSynthesizeTopic", {}, () => runCreateTopicSynthesisFromWorkbench({
            hostWindow: runtime.window,
        }));
        return;
    }
    if (result.hostCommand?.command === "runTagBootstrapper") {
        runWorkbenchCommandOnce(runtime, "runTagBootstrapper", {}, () => runTagBootstrapperFromWorkbench({
            hostWindow: runtime.window,
        }));
        return;
    }
    if (result.hostCommand?.command === "runRegistryItemWorkflow") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const libraryId = Math.max(0, Math.floor(Number(commandArgs.libraryId) || 0));
        const itemKey = String(commandArgs.itemKey || "").trim();
        const workflowId = String(commandArgs.workflowId || "").trim();
        runWorkbenchCommandOnce(runtime, "runRegistryItemWorkflow", { libraryId, itemKey, workflowId }, () => runRegistryItemWorkflowFromWorkbench(runtime, {
            libraryId,
            itemKey,
            workflowId,
        }));
        return;
    }
    if (result.hostCommand?.command === "submitTopicSynthesisUpdate") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const topicId = String(commandArgs.topicId || "").trim();
        const language = String(commandArgs.language || "auto").trim();
        runWorkbenchCommandOnce(runtime, "submitTopicSynthesisUpdate", { topicId, language }, () => runUpdateTopicSynthesisFromWorkbench({
            hostWindow: runtime.window,
            topicId,
            language,
        }));
        return;
    }
    if (result.hostCommand?.command === "manualRecomputeLayout") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const algorithm = String(commandArgs.algorithm ||
            commandArgs.preset ||
            runtime.state.graph.layoutAlgorithm).trim() || runtime.state.graph.layoutAlgorithm;
        runWorkbenchCommandOnce(runtime, "manualRecomputeLayout", { algorithm }, () => recomputeWorkbenchCitationGraphLayout(runtime, algorithm, true));
        return;
    }
    if (result.hostCommand?.command === "rebuildCitationGraphCacheNow") {
        runWorkbenchCommandOnce(runtime, "rebuildCitationGraphCacheNow", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return classifySynthesisWorkbenchGraphMutationResult((await observePublicMaintenanceOperation(client, await client.graph.rebuildCitationGraphCacheNow())));
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "refreshCitationGraphCacheIncrementalNow") {
        runWorkbenchCommandOnce(runtime, "refreshCitationGraphCacheIncrementalNow", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return classifySynthesisWorkbenchGraphMutationResult((await observePublicMaintenanceOperation(client, await client.graph.refreshCitationGraphCacheIncrementalNow())));
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "retryCitationGraphCacheRebuild") {
        runWorkbenchCommandOnce(runtime, "retryCitationGraphCacheRebuild", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return classifySynthesisWorkbenchGraphMutationResult((await observePublicMaintenanceOperation(client, await client.graph.retryCitationGraphCacheRebuild())));
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "validateTagVocabulary") {
        runWorkbenchCommandOnce(runtime, "validateTagVocabulary", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return client.tags.validateTagVocabulary();
        });
        return;
    }
    if (result.hostCommand?.command === "rebuildTagVocabularyIndex") {
        runWorkbenchCommandOnce(runtime, "rebuildTagVocabularyIndex", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.tags.rebuildTagVocabularyIndex());
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "rebuildConceptKbIndex") {
        runWorkbenchCommandOnce(runtime, "rebuildConceptKbIndex", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.concepts.rebuildConceptKbIndex());
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "rebuildTopicGraphIndex") {
        runWorkbenchCommandOnce(runtime, "rebuildTopicGraphIndex", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.topicGraph.rebuildTopicGraphIndex());
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "acceptTopicGraphRelation" ||
        result.hostCommand?.command === "rejectTopicGraphRelation") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const edgeId = String(commandArgs.edgeId || "").trim();
        if (edgeId) {
            const command = result.hostCommand.command;
            runWorkbenchCommandOnce(runtime, command, { edgeId }, async () => {
                const client = await getDefaultSynthesisClient();
                return (command === "acceptTopicGraphRelation"
                    ? client.topicGraph.acceptTopicGraphRelation({ edgeId })
                    : client.topicGraph.rejectTopicGraphRelation({ edgeId })).then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "applyTopicGraphReviewAction") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const reviewId = String(commandArgs.reviewId || "").trim();
        const action = String(commandArgs.action || "").trim() === "approve_suggested"
            ? "approve_suggested"
            : "reject";
        runWorkbenchCommandOnce(runtime, "applyTopicGraphReviewAction", { reviewId, action }, async () => {
            const client = await getDefaultSynthesisClient();
            return client.topicGraph
                .applyTopicGraphReviewAction({
                reviewId,
                action,
            })
                .then(failOnDiagnostic);
        });
        return;
    }
    if (result.hostCommand?.command === "rejectTopicDiscoveryHint" ||
        result.hostCommand?.command === "restoreTopicDiscoveryHint") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const hintId = String(commandArgs.hintId || "").trim();
        if (hintId) {
            const command = result.hostCommand.command;
            runWorkbenchCommandOnce(runtime, command, { hintId }, async () => {
                const client = await getDefaultSynthesisClient();
                return (command === "rejectTopicDiscoveryHint"
                    ? client.topics.rejectTopicDiscoveryHint({ hintId })
                    : client.topics.restoreTopicDiscoveryHint({ hintId })).then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "updateConceptDisplayText") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const conceptId = String(commandArgs.conceptId || "").trim();
        const fields = commandArgs.fields && typeof commandArgs.fields === "object"
            ? commandArgs.fields
            : {};
        if (conceptId && Object.keys(fields).length) {
            runWorkbenchCommandOnce(runtime, "updateConceptDisplayText", { conceptId }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.concepts.updateConceptDisplayText({
                    conceptId,
                    fields,
                });
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "applyConceptReviewAction") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const reviewId = String(commandArgs.reviewId || "").trim();
        const action = String(commandArgs.action || "").trim();
        const targetConceptId = String(commandArgs.targetConceptId || "").trim();
        if (reviewId &&
            (action === "approve_create" ||
                action === "merge_into_existing" ||
                action === "reject" ||
                action === "keep_alias" ||
                action === "remove_alias")) {
            runWorkbenchCommandOnce(runtime, "applyConceptReviewAction", { reviewId, action, targetConceptId }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.concepts
                    .applyConceptReviewAction({
                    reviewId,
                    action,
                    targetConceptId: targetConceptId || undefined,
                })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "deleteConceptEntry") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const conceptIds = Array.isArray(commandArgs.conceptIds)
            ? commandArgs.conceptIds
                .map((conceptId) => String(conceptId || "").trim())
                .filter(Boolean)
            : [String(commandArgs.conceptId || "").trim()].filter(Boolean);
        if (conceptIds.length) {
            runWorkbenchCommandOnce(runtime, "deleteConceptEntry", { conceptId: conceptIds[0], conceptIds }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.concepts.deleteConceptEntries({
                    conceptIds,
                });
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "refreshReferenceSidecarNow") {
        runWorkbenchCommandOnce(runtime, "refreshReferenceSidecarNow", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.references.refreshReferenceSidecarNow()).then(failOnDiagnostic);
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "retryReferenceSidecarRefresh") {
        runWorkbenchCommandOnce(runtime, "retryReferenceSidecarRefresh", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.references.retryReferenceSidecarRefresh()).then(failOnDiagnostic);
        });
        return;
    }
    if (result.hostCommand?.command === "runAdvancedReferenceMatchingNow") {
        runWorkbenchCommandOnce(runtime, "runAdvancedReferenceMatchingNow", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.references.runAdvancedReferenceMatchingNow()).then(failOnDiagnostic);
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "retryAdvancedReferenceMatching") {
        runWorkbenchCommandOnce(runtime, "retryAdvancedReferenceMatching", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.references.retryAdvancedReferenceMatching()).then(failOnDiagnostic);
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "applyCanonicalRevisionReviewAction") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const reviewItemId = String(commandArgs.reviewItemId || commandArgs.review_item_id || "").trim();
        const action = String(commandArgs.action || "").trim() === "reject"
            ? "reject"
            : "accept";
        if (reviewItemId) {
            runWorkbenchCommandOnce(runtime, "applyCanonicalRevisionReviewAction", { reviewItemId, action }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.references
                    .applyCanonicalRevisionReviewAction({ reviewItemId, action })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "applyReferenceMatchProposalActions") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const decisions = Array.isArray(commandArgs.decisions)
            ? commandArgs.decisions
                .filter((entry) => !!entry && typeof entry === "object" && !Array.isArray(entry))
                .flatMap((entry) => {
                const proposalId = String(entry.proposalId || entry.proposal_id || "").trim();
                const requestedAction = String(entry.action || "").trim();
                const action = requestedAction === "reject" ||
                    requestedAction === "reverse_accept" ||
                    requestedAction === "reopen" ||
                    requestedAction === "delete" ||
                    requestedAction === "manual_target"
                    ? requestedAction
                    : "accept";
                const target = entry.target &&
                    typeof entry.target === "object" &&
                    !Array.isArray(entry.target)
                    ? entry.target
                    : {};
                const normalizedTarget = String(target.kind || "") === "canonical_reference"
                    ? {
                        kind: "canonical_reference",
                        canonicalReferenceId: String(target.canonicalReferenceId ||
                            target.canonical_reference_id ||
                            "").trim(),
                    }
                    : String(target.kind || "") === "zotero_item"
                        ? {
                            kind: "zotero_item",
                            libraryId: Number(target.libraryId || target.library_id),
                            itemKey: String(target.itemKey || target.item_key || "").trim(),
                        }
                        : undefined;
                if (!proposalId) {
                    return [];
                }
                if (action === "manual_target") {
                    return normalizedTarget
                        ? [{ proposalId, action, target: normalizedTarget }]
                        : [];
                }
                return [{ proposalId, action }];
            })
            : [];
        if (decisions.length) {
            runWorkbenchCommandOnce(runtime, "applyReferenceMatchProposalActions", {}, async () => {
                const client = await getDefaultSynthesisClient();
                return client.references
                    .applyReferenceMatchProposalActions({ decisions })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "applyReferenceMatchProposalAction") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const proposalId = String(commandArgs.proposalId || "").trim();
        const requestedAction = String(commandArgs.action || "").trim();
        const action = requestedAction === "reject" ||
            requestedAction === "reverse_accept" ||
            requestedAction === "reopen" ||
            requestedAction === "delete"
            ? requestedAction
            : "accept";
        if (proposalId) {
            runWorkbenchCommandOnce(runtime, "applyReferenceMatchProposalAction", { proposalId, action }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.references
                    .applyReferenceMatchProposalAction({ proposalId, action })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "mergeEffectiveCanonicalReference") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const sourceEffectiveCanonicalId = String(commandArgs.sourceEffectiveCanonicalId ||
            commandArgs.source_effective_canonical_id ||
            "").trim();
        const targetEffectiveCanonicalId = String(commandArgs.targetEffectiveCanonicalId ||
            commandArgs.target_effective_canonical_id ||
            "").trim();
        if (sourceEffectiveCanonicalId && targetEffectiveCanonicalId) {
            runWorkbenchCommandOnce(runtime, "mergeEffectiveCanonicalReference", { sourceEffectiveCanonicalId, targetEffectiveCanonicalId }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.references
                    .mergeEffectiveCanonicalReference({
                    sourceEffectiveCanonicalId,
                    targetEffectiveCanonicalId,
                    confirmRetargetGroup: Boolean(commandArgs.confirmRetargetGroup),
                })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "applyCanonicalRevisionMergeRequests") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const requests = Array.isArray(commandArgs.requests)
            ? commandArgs.requests
                .filter((entry) => Boolean(entry) &&
                typeof entry === "object" &&
                !Array.isArray(entry))
                .map((request) => ({
                sourceEffectiveCanonicalId: String(request.sourceEffectiveCanonicalId ||
                    request.source_effective_canonical_id ||
                    "").trim(),
                targetEffectiveCanonicalId: String(request.targetEffectiveCanonicalId ||
                    request.target_effective_canonical_id ||
                    "").trim(),
            }))
            : [];
        if (requests.length) {
            runWorkbenchCommandOnce(runtime, "applyCanonicalRevisionMergeRequests", { count: requests.length }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.references
                    .applyCanonicalRevisionMergeRequests({ requests })
                    .then(failOnDiagnostic);
            }, { deferStart: true });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "updateCanonicalReferenceMetadata") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const canonicalReferenceId = String(commandArgs.canonicalReferenceId ||
            commandArgs.canonical_reference_id ||
            "").trim();
        const patch = commandArgs.patch &&
            typeof commandArgs.patch === "object" &&
            !Array.isArray(commandArgs.patch)
            ? { ...commandArgs.patch }
            : {};
        if ("normalizedTitle" in patch || "normalized_title" in patch) {
            patch.normalizedTitle = patch.normalizedTitle || patch.normalized_title;
            delete patch.normalized_title;
        }
        if (canonicalReferenceId) {
            runWorkbenchCommandOnce(runtime, "updateCanonicalReferenceMetadata", { canonicalReferenceId }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.references
                    .updateCanonicalReferenceMetadata({
                    canonicalReferenceId,
                    patch,
                })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "archiveCanonicalReference") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const canonicalReferenceId = String(commandArgs.canonicalReferenceId ||
            commandArgs.canonical_reference_id ||
            "").trim();
        if (canonicalReferenceId) {
            runWorkbenchCommandOnce(runtime, "archiveCanonicalReference", { canonicalReferenceId }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.references
                    .archiveCanonicalReference({ canonicalReferenceId })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "syncWebDavNow") {
        runWorkbenchCommandOnce(runtime, "syncWebDavNow", {}, async () => {
            const client = await getFreshDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.sync.webDav.runNow()).then(failOnSyncFailureState);
        }, { deferStart: true });
        return;
    }
    if (result.hostCommand?.command === "pauseWebDavSync") {
        runWorkbenchCommandOnce(runtime, "pauseWebDavSync", {}, async () => {
            const client = await getFreshDefaultSynthesisClient();
            return client.sync.webDav.pause();
        });
        return;
    }
    if (result.hostCommand?.command === "resumeWebDavSync") {
        runWorkbenchCommandOnce(runtime, "resumeWebDavSync", {}, async () => {
            const client = await getFreshDefaultSynthesisClient();
            return client.sync.webDav.resume();
        });
        return;
    }
    if (result.hostCommand?.command === "retryWebDavSync") {
        runWorkbenchCommandOnce(runtime, "retryWebDavSync", {}, async () => {
            const client = await getFreshDefaultSynthesisClient();
            return observePublicMaintenanceOperation(client, await client.sync.webDav.retry()).then(failOnSyncFailureState);
        });
        return;
    }
    if (result.hostCommand?.command === "resolveWebDavSyncConflict") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const action = (String(commandArgs.action || "").trim() ||
            "keep_local");
        runWorkbenchCommandOnce(runtime, "resolveWebDavSyncConflict", { action }, async () => {
            const client = await getFreshDefaultSynthesisClient();
            return client.sync.webDav.resolveConflict({ action });
        });
        return;
    }
    if (result.hostCommand?.command === "exportTagVocabulary") {
        runWorkbenchCommandOnce(runtime, "exportTagVocabulary", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return client.tags
                .exportTagVocabularyForRegulator()
                .then(({ allowedTags }) => runtime.hostWindow.navigator?.clipboard?.writeText?.(`${allowedTags.join("\n")}\n`));
        });
        return;
    }
    if (result.hostCommand?.command === "importTagVocabulary" ||
        result.hostCommand?.command === "previewTagVocabularyImport") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        if (typeof commandArgs.payload === "string" && commandArgs.payload.trim()) {
            runWorkbenchCommandOnce(runtime, "previewTagVocabularyImport", {}, async () => {
                const client = await getDefaultSynthesisClient();
                return client.tags.previewTagVocabularyImport({
                    payload: commandArgs.payload,
                });
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "updateStagedTagSuggestion") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const originalTag = String(commandArgs.originalTag || commandArgs.tag || "").trim();
        const tag = String(commandArgs.tag || "").trim();
        if (tag) {
            const facet = String(commandArgs.facet || tag.split(":")[0] || "topic");
            const note = String(commandArgs.note || "");
            const sourceFlow = String(commandArgs.source_flow || "tag-regulator-suggest");
            const parentBindings = Array.isArray(commandArgs.parent_bindings)
                ? commandArgs.parent_bindings
                : [];
            runWorkbenchCommandOnce(runtime, "updateStagedTagSuggestion", { tag }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.tags.updateStagedTagSuggestion({
                    originalTag,
                    tag,
                    facet,
                    note,
                    sourceFlow,
                    parentBindings,
                });
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "updateTagVocabularyEntry") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const originalTag = String(commandArgs.originalTag || commandArgs.tag || "").trim();
        const tag = String(commandArgs.tag || "").trim();
        if (originalTag && tag) {
            const facet = String(commandArgs.facet || tag.split(":")[0] || "topic");
            const note = String(commandArgs.note || "");
            runWorkbenchCommandOnce(runtime, "updateTagVocabularyEntry", { originalTag }, async () => {
                const requestedFacet = String(commandArgs.facet || tag.split(":")[0] || "topic");
                if ((isBuiltinStatusTag(originalTag) &&
                    (tag !== originalTag ||
                        requestedFacet !== BUILTIN_STATUS_FACET ||
                        commandArgs.deprecated === true ||
                        String(commandArgs.replacement || "").trim())) ||
                    (!isBuiltinStatusTag(originalTag) && isBuiltinStatusTag(tag))) {
                    throw new Error("Builtin tag identity is protected");
                }
                const client = await getDefaultSynthesisClient();
                return client.tags
                    .updateTagVocabularyEntry({ originalTag, tag, facet, note })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "deleteTagVocabularyEntry") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const originalTag = String(commandArgs.originalTag || commandArgs.tag || "").trim();
        if (originalTag) {
            runWorkbenchCommandOnce(runtime, "deleteTagVocabularyEntry", { originalTag }, async () => {
                if (isBuiltinStatusTag(originalTag)) {
                    throw new Error("Builtin tags cannot be deleted");
                }
                const client = await getDefaultSynthesisClient();
                return client.tags
                    .deleteTagVocabularyEntry({ originalTag })
                    .then(failOnDiagnostic);
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "promoteStagedTagSuggestions") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const tags = Array.isArray(commandArgs.tags)
            ? commandArgs.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
            : [String(commandArgs.tag || "").trim()].filter(Boolean);
        if (tags.length) {
            runWorkbenchCommandOnce(runtime, "promoteStagedTagSuggestions", { tag: tags[0], tags }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.tags.promoteStagedTagSuggestions({ tags });
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "discardStagedTagSuggestions") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const tags = Array.isArray(commandArgs.tags)
            ? commandArgs.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
            : [String(commandArgs.tag || "").trim()].filter(Boolean);
        if (tags.length) {
            runWorkbenchCommandOnce(runtime, "discardStagedTagSuggestions", { tag: tags[0], tags }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.tags.discardStagedTagSuggestions({ tags });
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "clearStagedTagSuggestions") {
        runWorkbenchCommandOnce(runtime, "clearStagedTagSuggestions", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return client.tags.clearStagedTagSuggestions();
        });
        return;
    }
    if (result.hostCommand?.command === "applyTagVocabularyImport") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const action = String(commandArgs.action || "").trim();
        if (typeof commandArgs.payload === "string" &&
            commandArgs.payload.trim() &&
            (action === "use-imported" || action === "merge-non-conflicting")) {
            runWorkbenchCommandOnce(runtime, "applyTagVocabularyImport", { action }, async () => {
                const client = await getDefaultSynthesisClient();
                return client.tags.applyTagVocabularyImport({
                    payload: commandArgs.payload,
                    action,
                });
            });
            return;
        }
        void sendActiveSurface(runtime, { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "openTopicArtifact") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const topicId = String(commandArgs.topicId || "").trim();
        void sendTopicDetail(runtime, topicId).catch((error) => reportWorkbenchError(error, runtime.window));
        return;
    }
    if (result.hostCommand?.command === "exportTopicSynthesisReport") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const topicId = String(commandArgs.topicId || "").trim();
        runWorkbenchCommandOnce(runtime, "exportTopicSynthesisReport", { topicId }, () => exportTopicSynthesisReport(runtime, topicId), { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "exportTopicDetailHtml") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const topicId = String(commandArgs.topicId || "").trim();
        const title = String(commandArgs.title || "").trim();
        void (async () => {
            const outputPath = await pickTopicDetailHtmlExportPath(runtime, safeTopicDetailHtmlExportFileName(title || topicId));
            if (!outputPath) {
                return;
            }
            runWorkbenchCommandOnce(runtime, "exportTopicDetailHtml", { topicId }, () => exportTopicDetailHtml(runtime, topicId, outputPath), { refreshFromService: false });
        })().catch((error) => reportWorkbenchError(error, runtime.window));
        return;
    }
    if (result.hostCommand?.command === "openZoteroItem") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const nodeId = String(commandArgs.nodeId || "").trim();
        const libraryId = Math.max(0, Math.floor(Number(commandArgs.libraryId) || 0));
        runWorkbenchCommandOnce(runtime, "openZoteroItem", { nodeId, libraryId }, () => openZoteroItemFromCitationGraphNode(runtime, commandArgs), { refreshFromService: false });
        return;
    }
    if (result.hostCommand?.command === "resolveTopicPaperDigest") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        void sendTopicDigest(runtime, commandArgs).catch((error) => reportWorkbenchError(error, runtime.window));
        return;
    }
    if (result.hostCommand?.command === "deleteTopicArtifact") {
        const commandArgs = commandArgsFromPayload(envelope.payload);
        const topicId = String(commandArgs.topicId || "").trim();
        if (!confirmWorkbenchAction(resolveSynthesisWorkbenchMessage("synthesis-confirm-delete-topic-artifact", SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES["synthesis-confirm-delete-topic-artifact"]), runtime.window)) {
            void sendActiveSurface(runtime, { refreshFromService: false });
            return;
        }
        runWorkbenchCommandOnce(runtime, "deleteTopicArtifact", { topicId }, async () => {
            const client = await getDefaultSynthesisClient();
            return client.topics
                .deleteTopicArtifact({ topicId })
                .then((deleteResult) => {
                if (!deleteResult.ok) {
                    throw new Error(String(deleteResult.reason || "Topic artifact deletion failed"));
                }
            });
        });
        return;
    }
    if (result.hostCommand?.command === "purgeDeletedTopicArtifacts") {
        if (!confirmWorkbenchAction(resolveSynthesisWorkbenchMessage("synthesis-confirm-purge-deleted-topic-artifacts", SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES["synthesis-confirm-purge-deleted-topic-artifacts"]), runtime.window)) {
            void sendActiveSurface(runtime, { refreshFromService: false });
            return;
        }
        runWorkbenchCommandOnce(runtime, "purgeDeletedTopicArtifacts", {}, async () => {
            const client = await getDefaultSynthesisClient();
            return client.topics.purgeDeletedTopicArtifacts();
        });
        return;
    }
    if (shouldRefreshGraphLayoutForAction(envelope)) {
        void refreshGraphLayoutIfNeeded(runtime).catch((error) => reportWorkbenchError(error, runtime.window));
        return;
    }
    void sendActiveSurface(runtime, {
        refreshFromService: false,
    });
}
function surfacesInvalidatedByCommand(command) {
    if (command === "runRegistryItemWorkflow") {
        return ["index"];
    }
    if (command === "refreshReferenceSidecarNow" ||
        command === "retryReferenceSidecarRefresh" ||
        command === "runAdvancedReferenceMatchingNow" ||
        command === "retryAdvancedReferenceMatching") {
        return ["index", "review", "graph"];
    }
    if (command === "applyReferenceMatchProposalAction" ||
        command === "applyReferenceMatchProposalActions" ||
        command === "applyCanonicalRevisionReviewAction" ||
        command === "mergeEffectiveCanonicalReference" ||
        command === "applyCanonicalRevisionMergeRequests") {
        return ["index", "review", "graph"];
    }
    if (command === "updateCanonicalReferenceMetadata" ||
        command === "archiveCanonicalReference") {
        return ["index", "review"];
    }
    if (command === "refreshCitationGraphCacheIncrementalNow" ||
        command === "rebuildCitationGraphCacheNow" ||
        command === "retryCitationGraphCacheRebuild" ||
        command === "manualRecomputeLayout") {
        return ["graph"];
    }
    if (command === "rebuildTagVocabularyIndex" ||
        command === "runTagBootstrapper" ||
        command === "previewTagVocabularyImport" ||
        command === "applyTagVocabularyImport" ||
        command === "updateStagedTagSuggestion" ||
        command === "updateTagVocabularyEntry" ||
        command === "deleteTagVocabularyEntry" ||
        command === "promoteStagedTagSuggestions" ||
        command === "discardStagedTagSuggestions" ||
        command === "clearStagedTagSuggestions") {
        return ["tags"];
    }
    if (command === "rebuildConceptKbIndex" ||
        command === "deleteConceptEntry" ||
        command === "updateConceptDisplayText" ||
        command === "applyConceptReviewAction") {
        return ["concepts", "review"];
    }
    if (command === "runSynthesizeTopic" ||
        command === "submitTopicSynthesisUpdate") {
        return ["home", "topics", "concepts", "graph", "review"];
    }
    if (command === "acceptTopicGraphRelation" ||
        command === "rejectTopicGraphRelation" ||
        command === "applyTopicGraphReviewAction") {
        return ["home", "topics", "graph", "review"];
    }
    if (command === "deleteTopicArtifact" ||
        command === "purgeDeletedTopicArtifacts") {
        return ["home", "topics"];
    }
    return [surfaceForTab(createDefaultSynthesisUiState().selectedTab)];
}
function shouldRefreshGraphLayoutForAction(envelope) {
    if (envelope.action === "selectTab") {
        return String(envelope.payload?.tab || "").trim() === "graph";
    }
    return (envelope.action === "setGraphView" &&
        ("layoutAlgorithm" in (envelope.payload || {}) ||
            "layoutPreset" in (envelope.payload || {})));
}
async function refreshGraphLayoutIfNeeded(runtime) {
    if (runtime.state.selectedTab !== "graph") {
        return;
    }
    await sendSurface(runtime, "graph", { refreshFromService: true });
    const graph = runtime.snapshotInput?.graph;
    const status = resolveSynthesisWorkbenchGraphLayoutStatus({
        graphHash: graph?.graph_hash,
        layoutAlgorithm: runtime.state.graph.layoutAlgorithm,
        layoutStatus: graph?.layoutStatus,
        failure: runtime.graphLayoutFailure,
    });
    if (status === "ready" || status === "failed" || !graph?.graph_hash) {
        return;
    }
    try {
        if (status === "refreshing") {
            await observeCurrentCitationGraphLayout(runtime, runtime.state.graph.layoutAlgorithm);
        }
        else {
            await recomputeWorkbenchCitationGraphLayout(runtime, runtime.state.graph.layoutAlgorithm);
        }
    }
    finally {
        await sendSurface(runtime, "graph", {
            refreshFromService: true,
        });
        await sendChrome(runtime, { refreshFromService: true });
    }
}
function cleanupSynthesisRuntime(runtime) {
    if (runtime.cleanedUp)
        return;
    if (citationGraphCrashJournalEnabled()) {
        void recordCitationGraphCrashJournalPhase("host-cleanup-start", {
            tabId: runtime.tabId,
            frameConnected: runtime.frame.isConnected,
            handshakeComplete: runtime.handshakeComplete,
        });
    }
    runtime.cleanedUp = true;
    runtime.chromeReadRevision += 1;
    runtime.queuedChromeRefresh = false;
    runtime.queuedServiceChromeRefresh = false;
    runtime.graphGeneration += 1;
    runtime.graphWindow = undefined;
    runtime.graphPageLoop = undefined;
    runtime.graphLayoutRefreshes.clear();
    if (runtime.handshakeTimer) {
        clearInterval(runtime.handshakeTimer);
        runtime.handshakeTimer = undefined;
    }
    if (runtime.libraryReadModelDirtyTimer) {
        clearTimeout(runtime.libraryReadModelDirtyTimer);
        runtime.libraryReadModelDirtyTimer = undefined;
    }
    clearCommandProgressPolling(runtime);
    if (runtime.sidecarStatusTimer) {
        clearInterval(runtime.sidecarStatusTimer);
        runtime.sidecarStatusTimer = undefined;
    }
    runtime.removeSidecarStatusListener?.();
    runtime.removeSidecarStatusListener = undefined;
    const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
    try {
        if (citationGraphCrashJournalEnabled()) {
            void recordCitationGraphCrashJournalPhase("host-pagehide-dispatch", {
                frameConnected: runtime.frame.isConnected,
                frameWindowPresent: Boolean(frameWindow),
            });
        }
        frameWindow?.dispatchEvent(new frameWindow.Event("pagehide"));
    }
    catch (error) {
        Zotero.logError?.(error instanceof Error ? error : new Error(String(error)));
    }
    clearSynthesisWorkbenchBridge(runtime);
    runtime.removeFrameLoadListener?.();
    runtime.removeFrameLoadListener = undefined;
    runtime.removeMessageListener?.();
    if (citationGraphCrashJournalEnabled()) {
        void recordCitationGraphCrashJournalPhase("host-cleanup-complete", {
            frameConnected: runtime.frame.isConnected,
        });
    }
    runtime.frameWindow = null;
    synthesisWorkbenchRuntimes.delete(runtime);
}
function cleanupSynthesisWorkbenchTab() {
    if (synthesisWorkbenchTab) {
        cleanupSynthesisRuntime(synthesisWorkbenchTab);
    }
    synthesisWorkbenchTab = undefined;
}
function attachWorkbenchBridge(runtime) {
    const frame = runtime.frame;
    const onLoad = () => {
        void ensureWorkbenchHandshake(runtime);
    };
    frame.addEventListener("load", onLoad);
    runtime.removeFrameLoadListener = () => {
        frame.removeEventListener("load", onLoad);
    };
    const onMessage = (event) => {
        if (!runtime.frameWindow || event.source !== runtime.frameWindow) {
            return;
        }
        const data = event.data;
        if (!data || data.type !== "synthesis:action")
            return;
        handleAction(runtime, data);
    };
    runtime.hostWindow.addEventListener("message", onMessage);
    if (citationGraphCrashJournalEnabled()) {
        void recordCitationGraphCrashJournalPhase("host-bridge-attached", {
            tabId: runtime.tabId,
            frameConnected: runtime.frame.isConnected,
        });
    }
    runtime.removeMessageListener = () => {
        runtime.hostWindow.removeEventListener("message", onMessage);
    };
}
async function ensureWorkbenchHandshake(runtime) {
    runtime.frameWindow = resolveFrameWindow(runtime.frame);
    if (!runtime.frameWindow || !installSynthesisWorkbenchBridge(runtime)) {
        return false;
    }
    return true;
}
function stopWorkbenchHandshake(runtime) {
    if (!runtime.handshakeTimer) {
        return;
    }
    clearInterval(runtime.handshakeTimer);
    runtime.handshakeTimer = undefined;
}
function finalizeWorkbenchHandshake(runtime) {
    if (runtime.handshakeComplete) {
        return;
    }
    runtime.handshakeComplete = true;
    stopWorkbenchHandshake(runtime);
    if (!runtime.snapshotInput) {
        runtime.snapshotInput = buildDefaultSnapshotInput();
    }
    void sendSnapshot(runtime, "synthesis:init", { refreshFromService: false });
    void sendChrome(runtime, { refreshFromService: false });
    void sendActiveSurface(runtime);
}
function scheduleWorkbenchHandshake(runtime) {
    if (runtime.handshakeComplete || runtime.handshakeTimer) {
        return;
    }
    const run = () => {
        runtime.handshakeAttemptCount += 1;
        void ensureWorkbenchHandshake(runtime).then((ok) => {
            if (ok) {
                runtime.handshakeSuccessCount += 1;
            }
            if (runtime.handshakeSuccessCount >=
                SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES) {
                finalizeWorkbenchHandshake(runtime);
                return;
            }
            if (runtime.handshakeAttemptCount >=
                SYNTHESIS_WORKBENCH_HANDSHAKE_MAX_ATTEMPTS) {
                stopWorkbenchHandshake(runtime);
                if (runtime.handshakeSuccessCount > 0) {
                    finalizeWorkbenchHandshake(runtime);
                }
            }
        });
    };
    run();
    registerBackgroundRefreshTimer({
        owner: "synthesis-workbench-handshake",
        activationCondition: "synthesis workbench frame is mounting",
        scopeKey: "current synthesis workbench frame",
        allowedDataSources: ["synthesis workbench frame handshake"],
        maxReadShape: "frame handshake signal only",
        requiresForegroundSurface: true,
        minimumIntervalMs: SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS,
        intervalMs: SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS,
    });
    runtime.handshakeTimer = setInterval(run, SYNTHESIS_WORKBENCH_HANDSHAKE_INTERVAL_MS);
}
export async function mountSynthesisWorkbenchRuntime(args) {
    while (args.root.firstChild) {
        args.root.removeChild(args.root.firstChild);
    }
    const doc = args.root.ownerDocument || args.hostWindow.document;
    const frame = createSynthesisBrowser(doc);
    args.root.appendChild(frame);
    const initialSnapshotInput = args.snapshotInput || prewarmedSynthesisSnapshotInput;
    const runtime = {
        tabId: SYNTHESIS_WORKBENCH_EMBEDDED_ID,
        window: args.chromeWindow,
        hostWindow: args.hostWindow,
        frame,
        frameWindow: resolveFrameWindow(frame),
        handshakeAttemptCount: 0,
        handshakeSuccessCount: 0,
        handshakeComplete: false,
        state: createDefaultSynthesisUiState(),
        snapshotInput: initialSnapshotInput,
        snapshotInputLocked: Boolean(args.snapshotInput),
        loadedSurfaces: new Set(),
        dirtySurfaces: new Set(),
        surfaceRequestSeq: 0,
        chromeReadRevision: 0,
        queuedChromeRefresh: false,
        queuedServiceChromeRefresh: false,
        latestSurfaceRequestBySurface: {},
        inFlightSurfaceRefreshes: {},
        queuedServiceSurfaceRefreshes: new Set(),
        libraryReadModelRevision: synthesisLibraryReadModelRevision,
        inFlightCommands: new Map(),
        actionWarnings: [],
        graphGeneration: 0,
        graphLayoutRefreshes: new Map(),
    };
    registerSynthesisWorkbenchRuntime(runtime);
    attachWorkbenchBridge(runtime);
    setSynthesisBrowserSource(frame, resolveSynthesisPageUrl());
    scheduleWorkbenchHandshake(runtime);
    return {
        refresh: async () => {
            await sendChrome(runtime, { refreshFromService: true });
            await sendActiveSurface(runtime, { refreshFromService: true });
        },
        cleanup: () => cleanupSynthesisRuntime(runtime),
    };
}
export async function openSynthesisWorkbenchTab(args = {}) {
    const hostWindow = resolveWorkflowHostWindow(args.window);
    const tabs = resolveZoteroTabs(hostWindow);
    if (!hostWindow || !tabs?.add || !tabs.select) {
        throw new Error("Cannot open Synthesis Workbench: Zotero_Tabs is unavailable.");
    }
    const Zotero_Tabs = tabs;
    if (synthesisWorkbenchTab) {
        Zotero_Tabs.select(SYNTHESIS_WORKBENCH_TAB_ID);
        return;
    }
    const result = Zotero_Tabs.add({
        id: SYNTHESIS_WORKBENCH_TAB_ID,
        type: "synthesis-workbench",
        title: localize("synthesis-workbench-title", "Synthesis"),
        data: {
            kind: "synthesis-workbench",
            icon: SYNTHESIS_WORKBENCH_TAB_ICON,
            iconURI: SYNTHESIS_WORKBENCH_TAB_ICON_URI,
        },
        select: true,
        onClose: cleanupSynthesisWorkbenchTab,
    });
    const container = result?.container;
    if (!container) {
        throw new Error("Cannot open Synthesis Workbench: tab container is missing.");
    }
    const frame = createSynthesisBrowser(hostWindow.document);
    container.appendChild(frame);
    const initialSnapshotInput = args.snapshotInput || prewarmedSynthesisSnapshotInput;
    const runtime = {
        tabId: SYNTHESIS_WORKBENCH_TAB_ID,
        window: hostWindow,
        hostWindow,
        frame,
        frameWindow: resolveFrameWindow(frame),
        handshakeAttemptCount: 0,
        handshakeSuccessCount: 0,
        handshakeComplete: false,
        state: createDefaultSynthesisUiState(),
        snapshotInput: initialSnapshotInput,
        snapshotInputLocked: Boolean(args.snapshotInput),
        loadedSurfaces: new Set(),
        dirtySurfaces: new Set(),
        surfaceRequestSeq: 0,
        chromeReadRevision: 0,
        queuedChromeRefresh: false,
        queuedServiceChromeRefresh: false,
        latestSurfaceRequestBySurface: {},
        inFlightSurfaceRefreshes: {},
        queuedServiceSurfaceRefreshes: new Set(),
        libraryReadModelRevision: synthesisLibraryReadModelRevision,
        inFlightCommands: new Map(),
        actionWarnings: [],
        graphGeneration: 0,
        graphLayoutRefreshes: new Map(),
    };
    synthesisWorkbenchTab = runtime;
    registerSynthesisWorkbenchRuntime(runtime);
    attachWorkbenchBridge(runtime);
    setSynthesisBrowserSource(frame, resolveSynthesisPageUrl());
    scheduleWorkbenchHandshake(runtime);
    Zotero_Tabs.select(SYNTHESIS_WORKBENCH_TAB_ID);
}
export async function resetSynthesisWorkbenchTabRuntimeForTests() {
    cleanupSynthesisWorkbenchTab();
}
async function publishSynthesisWorkbenchPrewarmPhase(surface, input) {
    prewarmedSynthesisSnapshotInput = mergeSynthesisUiSnapshotInput(prewarmedSynthesisSnapshotInput || buildDefaultSnapshotInput(), input);
    const runtime = synthesisWorkbenchTab;
    if (!runtime) {
        return;
    }
    mergeRuntimeSnapshotInput(runtime, input);
    if (surface === "chrome") {
        await sendChrome(runtime, { refreshFromService: false });
        return;
    }
    markSurfaceLoaded(runtime, surface);
    if (isActiveSurface(runtime, surface)) {
        await sendSurface(runtime, surface, { refreshFromService: false });
    }
}
export function prewarmSynthesisWorkbenchSurfaces(args = {}) {
    if (prewarmSynthesisSurfacesPromise) {
        return prewarmSynthesisSurfacesPromise;
    }
    prewarmSynthesisSurfacesPromise = (async () => {
        const readState = toSynthesisWorkbenchReadState(synthesisWorkbenchTab?.state || createDefaultSynthesisUiState());
        const client = await getDefaultSynthesisClient();
        const surfaces = args.surfaces !== undefined
            ? args.surfaces
            : [
                "index",
                "review",
                "graph",
                "tags",
                "concepts",
                "topics",
            ];
        let input = toSynthesisUiSnapshotInput(await client.workbench.readChrome({ state: readState }));
        await publishSynthesisWorkbenchPrewarmPhase("chrome", input);
        for (const surface of surfaces) {
            await yieldToEventLoop();
            try {
                const surfaceInput = toSynthesisUiSnapshotInput(await client.workbench.readSurface({ surface, state: readState }));
                await publishSynthesisWorkbenchPrewarmPhase(surface, surfaceInput);
                input = mergeSynthesisUiSnapshotInput(input, surfaceInput);
            }
            catch {
                continue;
            }
        }
        return input;
    })()
        .then((input) => {
        prewarmedSynthesisSnapshotInput = mergeSynthesisUiSnapshotInput(prewarmedSynthesisSnapshotInput || buildDefaultSnapshotInput(), input);
        return prewarmedSynthesisSnapshotInput;
    })
        .catch(() => undefined)
        .finally(() => {
        prewarmSynthesisSurfacesPromise = undefined;
    });
    return prewarmSynthesisSurfacesPromise;
}
export async function closeSynthesisWorkbenchTab() {
    const tabs = resolveZoteroTabs(synthesisWorkbenchTab?.window);
    if (tabs?.close) {
        await Promise.resolve(tabs.close(SYNTHESIS_WORKBENCH_TAB_ID));
        return;
    }
    cleanupSynthesisWorkbenchTab();
}

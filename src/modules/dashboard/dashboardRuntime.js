import { loadBackendsRegistry } from "../../backends/registry";
import { resolveBackendDisplayName } from "../../backends/displayName";
import { workflowSubmissionQueue } from "../../jobQueue/workflowSubmissionQueue";
import { cleanupTaskDashboardHistory, summarizeTaskDashboardHistoryScope, } from "../taskDashboardHistory";
import { normalizeDashboardBackends, normalizeDashboardTabKey, } from "../taskDashboardSnapshot";
import { subscribeWorkflowTaskChanges, } from "../taskRuntime";
import { getLoadedWorkflowSourceById } from "../workflow/catalog/workflowRuntime";
import { getWorkflowSettingsRevision } from "../workflow/settings/workflowSettings";
import { getVisibleLoadedWorkflowEntries } from "../workflow/catalog/workflowVisibility";
import { isAcpRuntimeReplayProfilerAvailable, isAcpRuntimeSemanticTraceRecorderAvailable, isDebugModeEnabled, isSkillRunnerConnectionAuditAvailable, isSynthesisSidecarDiagnosticsAvailable, } from "../debugMode";
import { subscribeSkillRunnerBackendHealth } from "../skillRunner/connection/skillRunnerBackendHealthRegistry";
import { subscribeAcpSkillRunWorkspaceChanges } from "../acp/skillRun/acpSkillRunStore";
import { recordBackgroundRefreshRead, registerBackgroundRefreshTimer, } from "../backgroundRefreshGovernance";
import { createDashboardFrameOwner, } from "./dashboardFrame";
import { clearWorkflowSettingsSaveTimer, compactError, createDashboardActionDispatcher, normalizeFilteredActive, normalizeFilteredHistory, } from "./dashboardActions";
import { buildDashboardSnapshot, buildHomeWorkflowSummaries, createDefaultRuntimeLogFilters, fromBackendTabKey, isBackendReconcileFlagged, localize, resolveBackendUnavailableMessageForDialog, toBackendTabKey, } from "./dashboardSnapshot";
const SYNTHESIS_SIDECAR_DIAGNOSTICS_AVAILABLE = typeof __debug_mode__ === "undefined"
    ? isSynthesisSidecarDiagnosticsAvailable()
    : __debug_mode__ && __synthesis_sidecar_diagnostics_enabled__;
const DASHBOARD_BACKEND_PERIODIC_REFRESH_MIN_INTERVAL_MS = 5000;
const DASHBOARD_HOME_PERIODIC_REFRESH_MIN_INTERVAL_MS = 15000;
function shouldDashboardReadBackendRows(args) {
    if (!args.selectedBackendId) {
        return false;
    }
    if (args.reason !== "periodic") {
        return true;
    }
    const now = Date.now();
    const lastReadAt = args.lastReadAtByBackendId.get(args.selectedBackendId) || 0;
    if (now - lastReadAt < DASHBOARD_BACKEND_PERIODIC_REFRESH_MIN_INTERVAL_MS) {
        return false;
    }
    args.lastReadAtByBackendId.set(args.selectedBackendId, now);
    return true;
}
function buildDashboardBackendsSignature(backends) {
    return backends
        .map((backend) => [
        backend.id,
        backend.type,
        backend.enabled === false ? "disabled" : "enabled",
        backend.displayName || "",
    ].join(":"))
        .sort()
        .join("|");
}
function buildHomeWorkflowSummariesCacheKey(backends) {
    const workflows = getVisibleLoadedWorkflowEntries()
        .map((workflow) => [
        workflow.manifest.id,
        getLoadedWorkflowSourceById(workflow.manifest.id),
    ].join(":"))
        .sort()
        .join("|");
    return [
        workflows,
        isDebugModeEnabled() ? "debug" : "normal",
        buildDashboardBackendsSignature(backends),
        String(getWorkflowSettingsRevision()),
    ].join("||");
}
export function createTaskDashboardRuntime(args) {
    const state = {
        backends: [],
        selectedTabKey: String(args.initialTabKey || "home").trim() || "home",
        selectedLiteratureMigrationRunId: "",
        literatureMigrationReceiptPage: 0,
        literatureMigrationCandidateQuery: {
            search: "",
            classification: "",
            reasonCode: "",
            disposition: "",
        },
        selectedBackendSubviewById: new Map(),
        selectedLogTaskByBackendId: new Map(),
        selectedLogEntryByBackendId: new Map(),
        selectedWorkflowOptionsWorkflowId: String(args.initialWorkflowId || "").trim(),
        workflowSettingsDraftById: new Map(),
        workflowSettingsSaveStateById: new Map(),
        workflowSettingsSaveErrorById: new Map(),
        workflowSettingsSaveTimerById: new Map(),
        runtimeLogFilters: createDefaultRuntimeLogFilters(),
        runtimeLogSelectedIdSet: new Set(),
        homeWorkflowDocWorkflowId: "",
        selectedProductId: "",
        selectedProductAssetId: "",
        selectedProductSection: "products",
        selectedFeedbackProductId: "",
        feedbackSkillFilter: "",
        selectedFeedbackProductIds: new Set(),
        productExportInProgress: false,
        homeWorkflowDocCacheByWorkflowId: new Map(),
    };
    const initialBackendId = fromBackendTabKey(state.selectedTabKey);
    if (initialBackendId && args.initialBackendSubview) {
        state.selectedBackendSubviewById.set(initialBackendId, args.initialBackendSubview);
    }
    cleanupTaskDashboardHistory();
    let unsubscribeTasks;
    let unsubscribeBackendHealth;
    let unsubscribeAcpSkillRuns;
    let unsubscribeWorkflowQueue;
    let unsubscribeSynthesisDiagnostics;
    let unsubscribeSynthesisSidecarStatus;
    let refreshTimer;
    let deferredDashboardRefreshTimer;
    let dashboardRefreshQueued = false;
    const backendRowsReadAtByBackendId = new Map();
    let queuedRefreshReason = "user-action";
    let lastPostedDashboardSignatures;
    const activeRowsCacheByScope = new Map();
    let activeRowsRevision = 0;
    let historySummaryRevision = 0;
    let historySummaryCache;
    let backendsLoaded = false;
    let backendsDirty = true;
    let lastBackendRegistryReadAt = 0;
    let homeWorkflowSummariesDirty = true;
    let homeWorkflowSummariesCache;
    let lastHomePeriodicReadAt = 0;
    const getRuntimeWindow = () => args.hostWindow;
    const getChromeWindow = () => args.chromeWindow ||
        Zotero.getMainWindow?.();
    const alertRuntimeWindow = (message) => {
        const win = getRuntimeWindow();
        if (typeof win?.alert === "function") {
            win.alert(message);
        }
    };
    const confirmRuntimeWindow = (message) => {
        const win = getRuntimeWindow();
        if (typeof win?.confirm === "function") {
            return win.confirm(message);
        }
        return true;
    };
    const taskReadScopeKey = (args) => `${String(args?.backendId || "").trim()}|${String(args?.requestId || "").trim()}`;
    const cloneTaskRows = (rows) => rows.map((entry) => ({ ...entry }));
    const markTaskSummaryDirty = () => {
        activeRowsRevision += 1;
        historySummaryRevision += 1;
    };
    const isActiveScopeDirty = (scope) => {
        const key = taskReadScopeKey(scope);
        const cached = activeRowsCacheByScope.get(key);
        return !cached || cached.revision !== activeRowsRevision;
    };
    const isHistorySummaryDirty = () => !historySummaryCache ||
        historySummaryCache.revision !== historySummaryRevision;
    const isHomeWorkflowSummariesDirty = () => {
        if (homeWorkflowSummariesDirty || !homeWorkflowSummariesCache) {
            return true;
        }
        return (homeWorkflowSummariesCache.key !==
            buildHomeWorkflowSummariesCacheKey(state.backends));
    };
    const refreshConfiguredBackends = async (force = false) => {
        if (backendsLoaded && !force && !backendsDirty) {
            recordBackgroundRefreshRead({
                owner: "task-dashboard-refresh",
                surface: state.selectedTabKey || "home",
                scopeKey: "configured-backends",
                readShape: "cache-hit",
            });
            return;
        }
        try {
            const loaded = await loadBackendsRegistry();
            const nextBackends = normalizeDashboardBackends({
                configured: loaded.backends,
                history: [],
                active: [],
            });
            state.backends = nextBackends;
            backendsLoaded = true;
            backendsDirty = false;
            lastBackendRegistryReadAt = Date.now();
            homeWorkflowSummariesDirty = true;
            state.backendLoadError = loaded.fatalError
                ? compactError(loaded.fatalError)
                : undefined;
        }
        catch (error) {
            state.backendLoadError = compactError(error);
        }
    };
    const readCachedHistorySummary = (surface) => {
        if (historySummaryCache &&
            historySummaryCache.revision === historySummaryRevision) {
            recordBackgroundRefreshRead({
                owner: "task-dashboard-refresh",
                surface,
                scopeKey: "dashboard-home",
                readShape: "cache-hit",
            });
            return { ...historySummaryCache.summary };
        }
        cleanupTaskDashboardHistory();
        recordBackgroundRefreshRead({
            owner: "task-dashboard-refresh",
            surface,
            scopeKey: "dashboard-home",
            readShape: "metadata-count",
        });
        const summary = summarizeTaskDashboardHistoryScope();
        historySummaryCache = {
            revision: historySummaryRevision,
            summary,
        };
        recordBackgroundRefreshRead({
            owner: "task-dashboard-refresh",
            surface,
            scopeKey: "dashboard-home",
            readShape: "history-summary",
        });
        return { ...summary };
    };
    const readCachedActiveRows = (surface, scope) => {
        const key = taskReadScopeKey(scope);
        const cached = activeRowsCacheByScope.get(key);
        if (cached && cached.revision === activeRowsRevision) {
            recordBackgroundRefreshRead({
                owner: "task-dashboard-refresh",
                surface,
                scopeKey: scope?.backendId || "dashboard-home",
                readShape: "cache-hit",
            });
            return cloneTaskRows(cached.rows);
        }
        const rows = normalizeFilteredActive(scope);
        activeRowsCacheByScope.set(key, {
            revision: activeRowsRevision,
            rows,
        });
        recordBackgroundRefreshRead({
            owner: "task-dashboard-refresh",
            surface,
            scopeKey: scope?.backendId || "dashboard-home",
            readShape: "active-summary",
        });
        return cloneTaskRows(rows);
    };
    const readCachedHomeWorkflowSummaries = async (backends) => {
        const key = buildHomeWorkflowSummariesCacheKey(backends);
        if (!homeWorkflowSummariesDirty &&
            homeWorkflowSummariesCache &&
            homeWorkflowSummariesCache.key === key) {
            recordBackgroundRefreshRead({
                owner: "task-dashboard-refresh",
                surface: "home",
                scopeKey: "home-workflows",
                readShape: "cache-hit",
            });
            return homeWorkflowSummariesCache.rows?.map((entry) => ({ ...entry }));
        }
        recordBackgroundRefreshRead({
            owner: "task-dashboard-refresh",
            surface: "home",
            scopeKey: "home-workflows",
            readShape: "model-build",
        });
        const rows = await buildHomeWorkflowSummaries({ backends });
        homeWorkflowSummariesCache = {
            key,
            rows,
        };
        homeWorkflowSummariesDirty = false;
        return rows.map((entry) => ({ ...entry }));
    };
    const pushSnapshot = async (messageType, reason) => {
        const frameWindow = frameOwner?.window();
        if (!frameWindow) {
            return;
        }
        const initialSelectedBackendId = fromBackendTabKey(state.selectedTabKey);
        const initialSurfaceKey = initialSelectedBackendId
            ? "backend"
            : state.selectedTabKey || "home";
        const initialTaskReadScope = initialSelectedBackendId
            ? { backendId: initialSelectedBackendId }
            : undefined;
        let periodicBackendRowsAllowed;
        if (reason === "periodic") {
            if (state.selectedTabKey === "home" &&
                !backendsDirty &&
                !isActiveScopeDirty() &&
                !isHistorySummaryDirty() &&
                !isHomeWorkflowSummariesDirty() &&
                Date.now() - lastHomePeriodicReadAt <
                    DASHBOARD_HOME_PERIODIC_REFRESH_MIN_INTERVAL_MS) {
                recordBackgroundRefreshRead({
                    owner: "task-dashboard-refresh",
                    surface: "home",
                    scopeKey: "dashboard-home",
                    readShape: "dirty-gate",
                });
                return;
            }
            if (initialSelectedBackendId) {
                periodicBackendRowsAllowed = shouldDashboardReadBackendRows({
                    selectedBackendId: initialSelectedBackendId,
                    reason,
                    lastReadAtByBackendId: backendRowsReadAtByBackendId,
                });
                if (!periodicBackendRowsAllowed &&
                    !isActiveScopeDirty(initialTaskReadScope)) {
                    recordBackgroundRefreshRead({
                        owner: "task-dashboard-refresh",
                        surface: initialSurfaceKey,
                        scopeKey: initialSelectedBackendId,
                        readShape: "scope-gate",
                    });
                    return;
                }
            }
        }
        await refreshConfiguredBackends(reason === "init" ||
            reason === "backend-load" ||
            (reason === "periodic" &&
                Date.now() - lastBackendRegistryReadAt > 30000));
        const debugModeEnabled = isDebugModeEnabled();
        const synthesisSidecarDiagnosticsEnabled = SYNTHESIS_SIDECAR_DIAGNOSTICS_AVAILABLE;
        const skillRunnerConnectionAuditEnabled = __skillrunner_connection_audit_enabled__ &&
            debugModeEnabled &&
            isSkillRunnerConnectionAuditAvailable();
        const acpTraceRecorderEnabled = debugModeEnabled && isAcpRuntimeSemanticTraceRecorderAvailable();
        const acpReplayProfilerEnabled = debugModeEnabled && isAcpRuntimeReplayProfilerAvailable();
        const requestedTabKey = state.selectedTabKey;
        state.selectedTabKey = normalizeDashboardTabKey({
            requestedTabKey,
            backends: state.backends,
            debugModeEnabled,
            synthesisSidecarDiagnosticsEnabled,
            skillRunnerConnectionAuditEnabled,
            acpTraceRecorderEnabled,
            acpReplayProfilerEnabled,
        });
        if (requestedTabKey === "migrations") {
            state.selectedTabKey = "migrations";
        }
        const selectedBackendId = fromBackendTabKey(state.selectedTabKey);
        const taskReadScope = selectedBackendId
            ? { backendId: selectedBackendId }
            : undefined;
        const selectedSurfaceKey = selectedBackendId
            ? "backend"
            : state.selectedTabKey || "home";
        const shouldReadBackendRows = typeof periodicBackendRowsAllowed === "boolean"
            ? periodicBackendRowsAllowed
            : shouldDashboardReadBackendRows({
                selectedBackendId,
                reason,
                lastReadAtByBackendId: backendRowsReadAtByBackendId,
            });
        if (selectedBackendId && !shouldReadBackendRows) {
            recordBackgroundRefreshRead({
                owner: "task-dashboard-refresh",
                surface: selectedSurfaceKey,
                scopeKey: selectedBackendId,
                readShape: "scope-gate",
            });
            return;
        }
        const shouldReadActive = state.selectedTabKey === "home" || !!selectedBackendId;
        const shouldReadHistoryRows = !!selectedBackendId && shouldReadBackendRows;
        const historySummary = state.selectedTabKey === "home"
            ? readCachedHistorySummary(selectedSurfaceKey)
            : undefined;
        let history = [];
        if (shouldReadHistoryRows) {
            cleanupTaskDashboardHistory();
            history = normalizeFilteredHistory(taskReadScope);
        }
        if (shouldReadHistoryRows) {
            backendRowsReadAtByBackendId.set(selectedBackendId, Date.now());
            recordBackgroundRefreshRead({
                owner: "task-dashboard-refresh",
                surface: selectedSurfaceKey,
                scopeKey: selectedBackendId,
                readShape: "scoped-history-rows",
            });
        }
        const active = shouldReadActive
            ? readCachedActiveRows(selectedSurfaceKey, taskReadScope)
            : [];
        const backends = normalizeDashboardBackends({
            configured: state.backends,
            history,
            active,
        });
        state.backends = backends;
        const homeWorkflows = state.selectedTabKey === "home"
            ? await readCachedHomeWorkflowSummaries(backends)
            : undefined;
        if (state.selectedTabKey === "home") {
            lastHomePeriodicReadAt = Date.now();
        }
        const snapshot = await buildDashboardSnapshot({
            state,
            backends,
            history,
            active,
            historySummary,
            homeWorkflows,
        });
        const signatures = snapshot.surfaceSignatures;
        if (messageType === "dashboard:snapshot" &&
            isNoisyRefreshReason(reason) &&
            signatures &&
            lastPostedDashboardSignatures &&
            signatures.chrome === lastPostedDashboardSignatures.chrome &&
            signatures.selectedSurface ===
                lastPostedDashboardSignatures.selectedSurface &&
            signatures.selectedSurfaceKey ===
                lastPostedDashboardSignatures.selectedSurfaceKey) {
            return;
        }
        if (signatures) {
            lastPostedDashboardSignatures = {
                chrome: signatures.chrome,
                selectedSurface: signatures.selectedSurface,
                selectedSurfaceKey: signatures.selectedSurfaceKey,
            };
        }
        const message = {
            type: messageType,
            payload: snapshot,
        };
        frameWindow.postMessage(message, "*");
    };
    let refreshChain = Promise.resolve();
    const shouldSkipRefresh = (reason) => {
        if (reason !== "periodic" && reason !== "task-update") {
            return false;
        }
        return (state.selectedTabKey === "workflow-options" ||
            state.selectedTabKey === "products" ||
            state.selectedTabKey === "migrations" ||
            state.selectedTabKey === "synthesis-sidecar" ||
            state.selectedTabKey === "skillrunner-connection-audit" ||
            state.selectedTabKey === "acp-trace-replay");
    };
    const enqueueRefresh = (messageType, reason) => {
        if (dashboardRefreshQueued && messageType === "dashboard:snapshot") {
            if (!isNoisyRefreshReason(reason)) {
                queuedRefreshReason = reason;
            }
            return refreshChain;
        }
        dashboardRefreshQueued = true;
        queuedRefreshReason = reason;
        refreshChain = refreshChain
            .catch(() => undefined)
            .then(async () => {
            const reason = queuedRefreshReason;
            dashboardRefreshQueued = false;
            await pushSnapshot(messageType, reason);
        });
        return refreshChain;
    };
    const clearDeferredDashboardRefresh = () => {
        if (!deferredDashboardRefreshTimer) {
            return;
        }
        getRuntimeWindow()?.clearTimeout(deferredDashboardRefreshTimer);
        deferredDashboardRefreshTimer = undefined;
    };
    const isNoisyRefreshReason = (reason) => reason === "task-update" ||
        reason === "backend-health" ||
        reason === "periodic" ||
        reason === "diagnostic-update";
    const scheduleDeferredDashboardRefresh = (reason) => {
        if (deferredDashboardRefreshTimer) {
            return;
        }
        const win = getRuntimeWindow();
        if (!win) {
            void enqueueRefresh("dashboard:snapshot", reason);
            return;
        }
        deferredDashboardRefreshTimer = win.setTimeout(() => {
            deferredDashboardRefreshTimer = undefined;
            void enqueueRefresh("dashboard:snapshot", reason);
        }, 350);
    };
    const refresh = (reason = "user-action") => {
        if (shouldSkipRefresh(reason)) {
            return;
        }
        if (isNoisyRefreshReason(reason)) {
            scheduleDeferredDashboardRefresh(reason);
            return;
        }
        clearDeferredDashboardRefresh();
        void enqueueRefresh("dashboard:snapshot", reason);
    };
    const ensureBackendInteractable = (backendIdRaw) => {
        const backendId = String(backendIdRaw || "").trim();
        if (!backendId) {
            return true;
        }
        const backend = state.backends.find((entry) => entry.id === backendId);
        if (!backend) {
            return true;
        }
        if (!isBackendReconcileFlagged({
            backendId: backend.id,
            backendType: backend.type,
        })) {
            return true;
        }
        alertRuntimeWindow(resolveBackendUnavailableMessageForDialog({
            backendId: backend.id,
            backendDisplayName: resolveBackendDisplayName(backend.id, backend.displayName),
        }));
        return false;
    };
    const handleAction = createDashboardActionDispatcher({
        state,
        enqueueRefresh,
        refresh,
        ensureBackendInteractable,
        alertRuntimeWindow,
        confirmRuntimeWindow,
        getRuntimeWindow,
        getChromeWindow,
        clearManagement: () => frameOwner?.clearManagement(),
        mountManagement: (payload) => frameOwner?.mountManagement(payload),
        invalidateHomeWorkflowSummaries: () => {
            homeWorkflowSummariesDirty = true;
        },
    });
    const selectDashboardTab = (next) => {
        if (typeof next.tabKey === "string" && next.tabKey.trim()) {
            const requestedTabKey = next.tabKey.trim();
            const requestedBackendId = fromBackendTabKey(requestedTabKey);
            if (requestedBackendId &&
                !ensureBackendInteractable(requestedBackendId)) {
                return;
            }
            state.selectedTabKey = requestedTabKey;
            if (state.selectedTabKey !== "home") {
                state.homeWorkflowDocWorkflowId = "";
            }
            if (requestedBackendId && next.backendSubview) {
                state.selectedBackendSubviewById.set(requestedBackendId, next.backendSubview);
                if (next.backendSubview !== "management") {
                    frameOwner?.clearManagement();
                }
            }
        }
        if (typeof next.workflowId === "string") {
            state.selectedWorkflowOptionsWorkflowId = next.workflowId.trim();
        }
        refresh("user-action");
    };
    const frameOwner = createDashboardFrameOwner({
        managementHost: args.managementHost,
        selectedBackendId: () => fromBackendTabKey(state.selectedTabKey),
        selectedBackendSubview: (backendId) => state.selectedBackendSubviewById.get(backendId) || "runs",
        findBackend: (backendId) => state.backends.find((backend) => backend.id === backendId),
        showRuns: (backendId) => selectDashboardTab({
            tabKey: toBackendTabKey(backendId),
            backendSubview: "runs",
        }),
    });
    const cleanupDashboardRuntime = () => {
        if (unsubscribeTasks) {
            unsubscribeTasks();
            unsubscribeTasks = undefined;
        }
        if (refreshTimer) {
            getRuntimeWindow()?.clearInterval(refreshTimer);
            refreshTimer = undefined;
        }
        clearDeferredDashboardRefresh();
        if (unsubscribeBackendHealth) {
            unsubscribeBackendHealth();
            unsubscribeBackendHealth = undefined;
        }
        if (unsubscribeAcpSkillRuns) {
            unsubscribeAcpSkillRuns();
            unsubscribeAcpSkillRuns = undefined;
        }
        if (unsubscribeWorkflowQueue) {
            unsubscribeWorkflowQueue();
            unsubscribeWorkflowQueue = undefined;
        }
        if (unsubscribeSynthesisDiagnostics) {
            unsubscribeSynthesisDiagnostics();
            unsubscribeSynthesisDiagnostics = undefined;
        }
        if (unsubscribeSynthesisSidecarStatus) {
            unsubscribeSynthesisSidecarStatus();
            unsubscribeSynthesisSidecarStatus = undefined;
        }
        frameOwner?.cleanup();
        for (const workflowId of Array.from(state.workflowSettingsSaveTimerById.keys())) {
            clearWorkflowSettingsSaveTimer(state, workflowId, getRuntimeWindow());
        }
        state.workflowSettingsSaveTimerById.clear();
        args.onSelectTabReady?.();
    };
    const mountDashboardRuntime = (root, hostWindow) => {
        frameOwner.mount(root, hostWindow, {
            onLoad: (frameWindow) => {
                if (!frameWindow) {
                    alertRuntimeWindow(localize("task-dashboard-open-management-failed", "Dashboard host failed to resolve frame window.", {
                        args: {
                            error: "frame_window_unavailable",
                        },
                    }));
                    return;
                }
                void enqueueRefresh("dashboard:init", "init");
            },
            onAction: (event) => {
                const data = event.data;
                if (data?.type === "dashboard:action") {
                    void handleAction(data);
                }
            },
        });
        args.onSelectTabReady?.(selectDashboardTab);
        refresh("init");
        unsubscribeTasks = subscribeWorkflowTaskChanges(() => {
            markTaskSummaryDirty();
            refresh("task-update");
        });
        unsubscribeBackendHealth = subscribeSkillRunnerBackendHealth(() => {
            activeRowsRevision += 1;
            refresh("backend-health");
        });
        unsubscribeAcpSkillRuns = subscribeAcpSkillRunWorkspaceChanges(() => {
            markTaskSummaryDirty();
            refresh("task-update");
        });
        unsubscribeWorkflowQueue = workflowSubmissionQueue.subscribe((event) => {
            const selectedBackendId = fromBackendTabKey(state.selectedTabKey);
            if (!selectedBackendId) {
                return;
            }
            const eventBackend = event.type === "added"
                ? event.entry
                : event.type === "removed" || event.type === "slot-changed"
                    ? event.backend
                    : null;
            if (event.type === "reset" ||
                (eventBackend &&
                    eventBackend.backendId === selectedBackendId &&
                    (eventBackend.backendType === "acp" ||
                        eventBackend.backendType === "skillrunner"))) {
                refresh("queue-update");
            }
        });
        if (SYNTHESIS_SIDECAR_DIAGNOSTICS_AVAILABLE) {
            void import("../synthesis/sidecar/synthesisSidecarTrace").then(({ subscribeSynthesisSidecarTracePatches }) => {
                unsubscribeSynthesisDiagnostics =
                    subscribeSynthesisSidecarTracePatches(() => {
                        if (state.selectedTabKey === "synthesis-sidecar") {
                            refresh("diagnostic-update");
                        }
                    });
            });
            void import("../synthesis/sidecar/synthesisSidecarRuntimeSupervisor").then(({ subscribeSynthesisWorkbenchSidecarStatus }) => {
                unsubscribeSynthesisSidecarStatus =
                    subscribeSynthesisWorkbenchSidecarStatus(() => {
                        if (state.selectedTabKey === "synthesis-sidecar") {
                            refresh("diagnostic-update");
                        }
                    });
            });
        }
        registerBackgroundRefreshTimer({
            owner: "task-dashboard-refresh",
            activationCondition: "dashboard frame mounted",
            scopeKey: "selected dashboard tab and selected backend id",
            allowedDataSources: [
                "workflow active summaries",
                "task dashboard history projections",
                "acp skill run summaries",
                "selected backend runtime logs",
                "backend health registry",
            ],
            maxReadShape: "active/count summaries globally; history/log rows scoped to selected backend or explicit action",
            requiresForegroundSurface: true,
            minimumIntervalMs: 1200,
            intervalMs: 1200,
        });
        refreshTimer = hostWindow.setInterval(() => {
            refresh("periodic");
        }, 1200);
        return {
            refresh: () => refresh("user-action"),
            selectTab: selectDashboardTab,
            cleanup: cleanupDashboardRuntime,
        };
    };
    return mountDashboardRuntime(args.root, args.hostWindow);
}

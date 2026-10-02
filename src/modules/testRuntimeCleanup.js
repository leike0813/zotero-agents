import { appendRuntimeLog, clearRuntimeLogs } from "./runtimeLogManager";
import { resetManagedLocalRuntimeLoopsForTests, resetManagedLocalRuntimeStateChangeListenersForTests, resetLocalRuntimeToastStateForTests, } from "./skillRunner/runtime/skillRunnerLocalRuntimeManager";
import { stopSkillRunnerModelCacheAutoRefresh } from "../providers/skillrunner/modelCache";
import { resetSkillRunnerBackendHealthRegistryForTests } from "./skillRunner/connection/skillRunnerBackendHealthRegistry";
import { stopSkillRunnerBackendReachabilityCoordinator } from "./skillRunner/connection/skillRunnerBackendReachabilityCoordinator";
import { resetPluginStateStoreForTests } from "./pluginStateStore";
import { resetSkillRunnerTaskReconcilerForTests, setSkillRunnerBackendReconcileFailureToastEmitterForTests, setSkillRunnerTaskLifecycleToastEmitterForTests, } from "./skillRunner/run/skillRunnerTaskReconciler";
import { resetWorkflowTasks } from "./taskRuntime";
import { resetSkillRunnerSessionSyncForTests } from "./skillRunner/run/skillRunnerSessionSyncManager";
import { resetSkillRunnerRunDialogForTests } from "./skillRunner/surface/skillRunnerRunDialog";
import { resetSkillRunnerAutoReplyObserverForTests } from "./skillRunner/run/skillRunnerAutoReplyObserver";
import { resetTaskDashboardHostForTests } from "./dashboardHost";
import { resetWorkflowSettingsReadDiagnosticsForTests } from "./workflow/settings/workflowSettings";
import { resetTestPerformanceProbeHooksForTests } from "./testPerformanceProbeBridge";
import { resetWorkflowHostApiForTests } from "../workflows/hostApi";
import { clearPackageHookBundleCacheForTests } from "../workflows/packageHookBundler";
import { resetWorkflowToastStateForTests } from "./workflowExecution/feedbackSeam";
import { clearWorkflowRuntimeBridgeForTests } from "./workflow/catalog/workflowRuntimeBridge";
import { setDebugModeOverrideForTests } from "./debugMode";
import { setDiagnosticVerboseOverrideForTests } from "./diagnosticVerbosity";
import { setSkillRunnerInteractiveAutoReplyEnabledForTests } from "./skillRunner/run/skillRunnerInteractiveAutoReply";
import { resetWorkflowRuntimeForTests } from "./workflow/catalog/workflowRuntime";
import { resetSynthesisSidecarRuntimeSupervisorForTests } from "./synthesis/sidecar/synthesisSidecarRuntimeSupervisor";
import { resetDefaultSynthesisClientForTests, setDefaultSynthesisClientCompositionFactoryForTests, } from "./synthesisClient/defaultClient";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
/**
 * The bounded per-test cleanup window is 5s, so the audit drain gets a share
 * of it rather than the production shutdown budget.
 */
const PI_TEST_AUDIT_DISPOSE_TIMEOUT_MS = 2_000;
/**
 * The Pi singletons are production state that must not leak across files. They
 * are imported lazily so shards that never touch Pi do not evaluate their
 * graphs, and the mocha root hook preloads them so a cold transpile never
 * lands inside the bounded cleanup window.
 */
let piConversationModule;
function loadPiConversationModule() {
    return (piConversationModule ??= import("./piConversation"));
}
let piSkillRunModule;
function loadPiSkillRunModule() {
    return (piSkillRunModule ??= import("./piSkillRun"));
}
let piMcpRuntimeOwnerModule;
function loadPiMcpRuntimeOwnerModule() {
    return (piMcpRuntimeOwnerModule ??= import("./piMcpRuntimeOwner"));
}
let piRuntimeAuditModule;
function loadPiRuntimeAuditModule() {
    return (piRuntimeAuditModule ??= import("./piRuntimeAudit"));
}
let piRuntimeLifecycleModule;
function loadPiRuntimeLifecycleModule() {
    return (piRuntimeLifecycleModule ??= import("./piRuntimeLifecycle"));
}
export async function preloadBackgroundRuntimeCleanupForTests() {
    await loadPiConversationModule();
    await loadPiSkillRunModule();
    await loadPiMcpRuntimeOwnerModule();
    await loadPiRuntimeAuditModule();
    await loadPiRuntimeLifecycleModule();
}
/**
 * One Pi surface failing to dispose must not strand the others or leak a timer
 * into the next file, so each step is settled independently. A failing Pi
 * surface is reported, never thrown: cleanup runs between every test and must
 * not turn one stranded owner into a failing suite.
 *
 * Every close is paired with its reopen. A disposed Pi owner stays closed by
 * design, so without the reset the next file would inherit a dead audit queue
 * or a refused coordinator instead of a fresh one.
 *
 * Admission closes before anything is reopened: a live lifecycle could admit
 * new work into an owner whose audit queue or coordinator is still being torn
 * down.
 */
async function disposePiRuntimeSurfaces() {
    const failures = [];
    for (const dispose of [
        async () => cleanupDeps.resetPiRuntimeLifecycleForTests(),
        async () => cleanupDeps.shutdownPiConversations(),
        async () => cleanupDeps.shutdownPiSkillRuns(),
        async () => cleanupDeps.shutdownPiMcpToolSources(),
        async () => cleanupDeps.shutdownPiRuntimeAudit(),
        async () => cleanupDeps.resetPiRuntimeAuditForTests(),
        async () => cleanupDeps.resetPiSkillRunShutdownForTests(),
        async () => cleanupDeps.resetPiConversationShutdownForTests(),
    ]) {
        try {
            await dispose();
        }
        catch (error) {
            failures.push(error);
        }
    }
    if (failures.length) {
        for (const failure of failures) {
            appendRuntimeLog({
                level: "warn",
                scope: "job",
                component: "test-runtime-cleanup",
                operation: "pi-runtime-dispose",
                stage: "zotero-test-cleanup",
                message: "Pi runtime surface failed to dispose during test cleanup",
                error: failure,
            });
        }
    }
}
const defaultCleanupDeps = {
    shutdownPiConversations: async () => {
        const module = await loadPiConversationModule();
        await module.shutdownPiConversations();
    },
    shutdownPiSkillRuns: async () => {
        // Cleanup is void by contract: an owner that outlives its deadline is
        // already logged by the bounded dispose, not a failing test.
        await loadPiSkillRunModule().then((m) => m.shutdownPiSkillRuns());
    },
    shutdownPiMcpToolSources: async () => {
        const module = await loadPiMcpRuntimeOwnerModule();
        await module.shutdownPiMcpToolSources();
    },
    shutdownPiRuntimeAudit: async () => {
        const module = await loadPiRuntimeAuditModule();
        await module.shutdownPiRuntimeAudit(Date.now() + PI_TEST_AUDIT_DISPOSE_TIMEOUT_MS);
    },
    resetPiRuntimeAuditForTests: async () => {
        const module = await loadPiRuntimeAuditModule();
        // Reopening must wait for the drain to settle, otherwise a record could be
        // admitted into a queue that is still discarding the previous one.
        await module.resetPiRuntimeAuditForTests();
    },
    resetPiSkillRunShutdownForTests: async () => {
        const module = await loadPiSkillRunModule();
        module.resetPiSkillRunShutdownForTests();
    },
    resetPiConversationShutdownForTests: async () => {
        const module = await loadPiConversationModule();
        module.resetPiConversationShutdownForTests();
    },
    resetPiRuntimeLifecycleForTests: async () => {
        const module = await loadPiRuntimeLifecycleModule();
        module.resetPiRuntimeLifecycleForTests();
    },
    setDefaultSynthesisClientCompositionFactoryForTests: () => setDefaultSynthesisClientCompositionFactoryForTests(null),
    resetDefaultSynthesisClientForTests,
    stopSkillRunnerModelCacheAutoRefresh,
    stopSkillRunnerBackendReachabilityCoordinator,
    resetManagedLocalRuntimeLoopsForTests,
    resetManagedLocalRuntimeStateChangeListenersForTests,
    resetLocalRuntimeToastStateForTests,
    resetSkillRunnerBackendHealthRegistryForTests,
    resetPluginStateStoreForTests,
    setSkillRunnerBackendReconcileFailureToastEmitterForTests,
    setSkillRunnerTaskLifecycleToastEmitterForTests,
    resetWorkflowTasks,
    clearRuntimeLogs,
    resetSkillRunnerSessionSyncForTests,
    resetSkillRunnerTaskReconcilerForTests,
    resetSkillRunnerRunDialogForTests,
    resetSkillRunnerAutoReplyObserverForTests,
    resetTaskDashboardHostForTests,
    resetWorkflowSettingsReadDiagnosticsForTests,
    resetTestPerformanceProbeHooksForTests,
    resetWorkflowHostApiForTests,
    clearPackageHookBundleCacheForTests,
    resetWorkflowToastStateForTests,
    clearWorkflowRuntimeBridgeForTests,
    setDebugModeOverrideForTests,
    setDiagnosticVerboseOverrideForTests,
    setSkillRunnerInteractiveAutoReplyEnabledForTests,
    resetWorkflowRuntimeForTests,
    resetSynthesisSidecarRuntimeSupervisorForTests,
    resetWorkflowSubmissionQueueForTests: () => workflowSubmissionQueue.resetForTests(),
};
let cleanupDeps = defaultCleanupDeps;
export function setBackgroundRuntimeCleanupDepsForTests(overrides) {
    cleanupDeps = overrides
        ? {
            ...defaultCleanupDeps,
            ...overrides,
        }
        : defaultCleanupDeps;
}
export async function cleanupBackgroundRuntimeForZoteroTests(options = {}) {
    await disposePiRuntimeSurfaces();
    cleanupDeps.setDefaultSynthesisClientCompositionFactoryForTests();
    await Promise.resolve(cleanupDeps.resetDefaultSynthesisClientForTests());
    await Promise.resolve(cleanupDeps.resetSynthesisSidecarRuntimeSupervisorForTests());
    await Promise.resolve(cleanupDeps.resetSkillRunnerRunDialogForTests());
    cleanupDeps.resetSkillRunnerAutoReplyObserverForTests();
    await Promise.resolve(cleanupDeps.resetTaskDashboardHostForTests());
    await Promise.resolve(cleanupDeps.resetSkillRunnerTaskReconcilerForTests());
    await Promise.resolve(cleanupDeps.resetSkillRunnerSessionSyncForTests());
    cleanupDeps.stopSkillRunnerModelCacheAutoRefresh();
    cleanupDeps.stopSkillRunnerBackendReachabilityCoordinator();
    cleanupDeps.resetManagedLocalRuntimeLoopsForTests();
    cleanupDeps.resetManagedLocalRuntimeStateChangeListenersForTests();
    cleanupDeps.resetLocalRuntimeToastStateForTests();
    cleanupDeps.resetSkillRunnerBackendHealthRegistryForTests();
    cleanupDeps.resetPluginStateStoreForTests();
    cleanupDeps.setSkillRunnerBackendReconcileFailureToastEmitterForTests();
    cleanupDeps.setSkillRunnerTaskLifecycleToastEmitterForTests();
    cleanupDeps.resetWorkflowTasks();
    if (!options.preserveRuntimeLogs) {
        await Promise.resolve(cleanupDeps.clearRuntimeLogs());
    }
    cleanupDeps.resetWorkflowSettingsReadDiagnosticsForTests();
    cleanupDeps.resetTestPerformanceProbeHooksForTests();
    cleanupDeps.resetWorkflowHostApiForTests();
    cleanupDeps.clearPackageHookBundleCacheForTests();
    cleanupDeps.resetWorkflowToastStateForTests();
    cleanupDeps.clearWorkflowRuntimeBridgeForTests();
    cleanupDeps.setDebugModeOverrideForTests();
    cleanupDeps.setDiagnosticVerboseOverrideForTests();
    cleanupDeps.setSkillRunnerInteractiveAutoReplyEnabledForTests();
    cleanupDeps.resetWorkflowRuntimeForTests();
    // Pi admission is closed above, so a restored reservation or late callback
    // cannot admit new work against a queue that is about to be dropped.
    cleanupDeps.resetWorkflowSubmissionQueueForTests();
}

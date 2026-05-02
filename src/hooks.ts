import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { registerSelectionSampleMenu } from "./modules/selectionSample";
import { ensureWorkflowMenuForWindow, refreshWorkflowMenus } from "./modules/workflowMenu";
import {
  ensureDefaultWorkflowDirExistsOnStartup,
  rescanWorkflowRegistry,
} from "./modules/workflowRuntime";
import { syncBuiltinWorkflowsOnStartup } from "./modules/builtinWorkflowSync";
import { setPluginSkillRegistryRuntimeRootURI } from "./modules/pluginSkillRegistry";
import { openBackendManagerDialog } from "./modules/backendManager";
import { openTaskManagerDialog } from "./modules/taskManagerDialog";
import { installWorkflowEditorHostBridge } from "./modules/workflowEditorHost";
import { installWorkflowRuntimeBridge } from "./modules/workflowRuntimeBridge";
import { enableWorkflowPackageDiagnosticsForDebugMode } from "./modules/workflowPackageDiagnostics";
import { installWorkflowDebugProbeBridge } from "./modules/workflowDebugProbe";
import {
  ensureDashboardToolbarButton,
  removeDashboardToolbarButton,
} from "./modules/dashboardToolbarButton";
import { resolveRuntimeToolkit } from "./utils/runtimeBridge";
import {
  startSkillRunnerModelCacheAutoRefresh,
} from "./providers/skillrunner/modelCache";
import {
  reconcileSkillRunnerBackendTaskLedgerOnce,
  purgeSkillRunnerBackendReconcileState,
  startSkillRunnerTaskReconciler,
} from "./modules/skillRunnerTaskReconciler";
import {
  deployAndConfigureLocalSkillRunner,
  getManagedLocalRuntimeStateSnapshot,
  hydrateLocalRuntimeAutoStartSessionStateFromPersistedState,
  isLocalRuntimeAutoStartPaused,
  planLocalRuntimeOneclick,
  previewLocalRuntimeUninstall,
  runManagedRuntimeStartupPreflightProbe,
  resolveManagedLocalSkillsFolderPath,
  startManagedLocalRuntimeAutoEnsureLoop,
  stopLocalRuntime,
  uninstallLocalRuntime,
} from "./modules/skillRunnerLocalRuntimeManager";
import { openSkillRunnerLocalDeployDebugDialog } from "./modules/skillRunnerLocalDeployDebugDialog";
import { loadBackendsRegistry } from "./backends/registry";
import { openSkillRunnerManagementDialog } from "./modules/skillRunnerManagementDialog";
import { refreshSkillRunnerModelCacheForBackend } from "./providers/skillrunner/modelCache";
import { MANAGED_LOCAL_BACKEND_ID } from "./modules/skillRunnerLocalRuntimeConstants";
import { isDebugModeEnabled } from "./modules/debugMode";
import { untrackSkillRunnerBackendHealth } from "./modules/skillRunnerBackendHealthRegistry";
import { shutdownSkillRunnerAsyncLifecycle } from "./modules/skillRunnerAsyncLifecycle";
import { flushRuntimeLogsPersistence } from "./modules/runtimeLogManager";
import {
  installAssistantWorkspaceSidebarShell,
  openAssistantWorkspaceSidebar,
  removeAssistantWorkspaceSidebarShell,
  toggleAssistantWorkspaceSidebar,
} from "./modules/assistantWorkspaceSidebar";
import { shutdownAcpSessionManager } from "./modules/acpSessionManager";
import { shutdownAcpSkillRunConversations } from "./modules/acpSkillRunStore";
import {
  cleanupRuntimePersistenceCategory,
  getRuntimePersistencePaths,
  scanRuntimePersistenceUsage,
  type RuntimePersistenceCategory,
} from "./modules/runtimePersistence";

const WORKFLOW_MENU_RETRY_INTERVAL_MS = 100;
const WORKFLOW_MENU_RETRY_MAX_ATTEMPTS = 20;
const LEGACY_REMOVED_SKILLRUNNER_BACKEND_ID = "skillrunner-local";

function registerPrefsPane() {
  const runtimeRootURI =
    typeof rootURI === "string" && rootURI
      ? rootURI
      : `chrome://${addon.data.config.addonRef}/`;
  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: runtimeRootURI + "content/preferences.xhtml",
    label: getString("prefs-title"),
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
  });
}

async function reconcileSkillRunnerBackendsOnStartup() {
  try {
    const loaded = await loadBackendsRegistry();
    if (loaded.fatalError) {
      return;
    }
    for (const backend of loaded.backends) {
      if (String(backend.type || "").trim() !== "skillrunner") {
        continue;
      }
      if (String(backend.id || "").trim() === MANAGED_LOCAL_BACKEND_ID) {
        continue;
      }
      await reconcileSkillRunnerBackendTaskLedgerOnce({
        backend,
        source: "startup",
        emitFailureToast: true,
      });
    }
  } catch {
    // keep startup reconcile fully background/non-blocking
  }
}

let startupSkillRunnerBackendReconcileRunner: () => Promise<void> =
  reconcileSkillRunnerBackendsOnStartup;

export function setSkillRunnerStartupBackendReconcileRunnerForTests(
  runner?: () => Promise<void>,
) {
  startupSkillRunnerBackendReconcileRunner =
    runner || reconcileSkillRunnerBackendsOnStartup;
}

async function delayMs(ms: number) {
  const runtime = globalThis as {
    Zotero?: { Promise?: { delay?: (delayMs: number) => Promise<void> } };
  };
  if (typeof runtime.Zotero?.Promise?.delay === "function") {
    await runtime.Zotero.Promise.delay(ms);
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getRuntimeToolkit() {
  return resolveRuntimeToolkit() as
    | {
        unregisterAll?: () => void;
        log?: (...args: unknown[]) => void;
        ProgressWindow?: new (
          title: string,
          options?: { closeOnClick?: boolean; closeTime?: number },
        ) => {
          createLine: (options: {
            text: string;
            type?: string;
            progress?: number;
          }) => {
            show: () => {
              changeLine: (options: {
                progress?: number;
                text?: string;
              }) => void;
              startCloseTimer: (delayMs: number) => void;
            };
          };
        };
      }
    | undefined;
}

function unregisterToolkitSafely() {
  getRuntimeToolkit()?.unregisterAll?.();
}

export async function ensureWorkflowRegistryAndMenu(
  win: _ZoteroTypes.MainWindow,
  options?: {
    retryIntervalMs?: number;
    maxMenuRetryAttempts?: number;
  },
) {
  if (
    !addon.data.workflow?.workflowsDir ||
    !addon.data.workflow?.loaded?.workflows?.length
  ) {
    await rescanWorkflowRegistry();
  }

  const retryIntervalMs = Math.max(
    0,
    options?.retryIntervalMs ?? WORKFLOW_MENU_RETRY_INTERVAL_MS,
  );
  const maxMenuRetryAttempts = Math.max(
    1,
    options?.maxMenuRetryAttempts ?? WORKFLOW_MENU_RETRY_MAX_ATTEMPTS,
  );
  const menuId = `${addon.data.config.addonRef}-workflows-menu`;
  for (let attempt = 0; attempt < maxMenuRetryAttempts; attempt++) {
    ensureWorkflowMenuForWindow(win);
    if (win.document.getElementById(menuId)) {
      return;
    }
    if (attempt < maxMenuRetryAttempts - 1 && retryIntervalMs > 0) {
      await delayMs(retryIntervalMs);
    }
  }
}

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();
  installWorkflowEditorHostBridge();
  installWorkflowRuntimeBridge();
  installWorkflowDebugProbeBridge();
  enableWorkflowPackageDiagnosticsForDebugMode();

  const runtimeRootURI =
    typeof rootURI === "string" && rootURI
      ? rootURI
      : `chrome://${addon.data.config.addonRef}/`;
  setPluginSkillRegistryRuntimeRootURI(runtimeRootURI);
  try {
    await syncBuiltinWorkflowsOnStartup({
      rootURI: runtimeRootURI,
    });
  } catch (error) {
    if (typeof console !== "undefined") {
      console.error("[workflow-builtin-sync] failed to sync builtin workflows", error);
    }
  }

  await ensureDefaultWorkflowDirExistsOnStartup();
  await rescanWorkflowRegistry();
  purgeSkillRunnerBackendReconcileState(LEGACY_REMOVED_SKILLRUNNER_BACKEND_ID);
  untrackSkillRunnerBackendHealth(LEGACY_REMOVED_SKILLRUNNER_BACKEND_ID);
  startSkillRunnerModelCacheAutoRefresh();
  startSkillRunnerTaskReconciler();
  void startupSkillRunnerBackendReconcileRunner();
  hydrateLocalRuntimeAutoStartSessionStateFromPersistedState();
  if (!isLocalRuntimeAutoStartPaused()) {
    await runManagedRuntimeStartupPreflightProbe();
  }
  startManagedLocalRuntimeAutoEnsureLoop();

  registerPrefsPane();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  await ensureWorkflowRegistryAndMenu(win);
  ensureDashboardToolbarButton(win);
  installAssistantWorkspaceSidebarShell(win);

  const ProgressWindow = getRuntimeToolkit()?.ProgressWindow;
  const popupWin = ProgressWindow
    ? new ProgressWindow(addon.data.config.addonName, {
        closeOnClick: true,
        closeTime: -1,
      })
        .createLine({
          text: getString("startup-begin"),
          type: "default",
          progress: 0,
        })
        .show()
    : null;

  if (popupWin) {
    await Zotero.Promise.delay(1000);
    popupWin.changeLine({
      progress: 30,
      text: `[30%] ${getString("startup-begin")}`,
    });
  }

  if (isDebugModeEnabled()) {
    registerSelectionSampleMenu();
  }

  if (popupWin) {
    await Zotero.Promise.delay(1000);

    popupWin.changeLine({
      progress: 100,
      text: `[100%] ${getString("startup-finish")}`,
    });
    popupWin.startCloseTimer(5000);
  }

}

async function onMainWindowUnload(win: Window): Promise<void> {
  removeDashboardToolbarButton(win);
  removeAssistantWorkspaceSidebarShell(win as _ZoteroTypes.MainWindow);
  unregisterToolkitSafely();
  addon.data.dialog?.window?.close();
}

async function onShutdown(): Promise<void> {
  await shutdownAcpSkillRunConversations();
  await shutdownAcpSessionManager();
  await shutdownSkillRunnerAsyncLifecycle();
  await flushRuntimeLogsPersistence();
  for (const win of Zotero.getMainWindows?.() || []) {
    removeDashboardToolbarButton(win);
    removeAssistantWorkspaceSidebarShell(win);
  }
  unregisterToolkitSafely();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  getRuntimeToolkit()?.log?.("notify", event, type, ids, extraData);
  return;
}

async function resolveManagedLocalBackend() {
  const snapshot = getManagedLocalRuntimeStateSnapshot();
  const backendId = String(snapshot.details?.managedBackendId || "").trim();
  if (!backendId || backendId !== MANAGED_LOCAL_BACKEND_ID) {
    throw new Error("managed local backend is not configured");
  }
  const loaded = await loadBackendsRegistry();
  if (loaded.fatalError) {
    throw new Error(loaded.fatalError);
  }
  const backend = loaded.backends.find((entry) => entry.id === backendId);
  if (!backend) {
    throw new Error(`managed backend "${backendId}" is not found`);
  }
  return backend;
}

function openFolderInSystemFileManager(pathValue: string) {
  const normalizedPath = String(pathValue || "").trim();
  if (!normalizedPath) {
    throw new Error("skills folder path is empty");
  }
  const pathToFile = Zotero?.File?.pathToFile;
  if (typeof pathToFile !== "function") {
    throw new Error("Zotero.File.pathToFile is unavailable");
  }
  const file = pathToFile(normalizedPath) as
    | {
        exists?: () => boolean;
        launch?: () => unknown;
        reveal?: () => unknown;
      }
    | undefined;
  if (!file) {
    throw new Error(`failed to resolve skills folder path: ${normalizedPath}`);
  }
  if (typeof file.exists === "function" && !file.exists()) {
    throw new Error(`skills folder does not exist: ${normalizedPath}`);
  }
  if (typeof file.launch === "function") {
    file.launch();
    return;
  }
  if (typeof file.reveal === "function") {
    file.reveal();
    return;
  }
  throw new Error("nsIFile launch/reveal is unavailable");
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    case "scanWorkflows": {
      const requestedDir = String(data.workflowsDir || "").trim();
      const state = requestedDir
        ? await rescanWorkflowRegistry({ workflowsDir: requestedDir })
        : await rescanWorkflowRegistry();
      refreshWorkflowMenus();
      const messageLines = [
        `Workflow scan finished: loaded=${state.loaded.workflows.length}, warnings=${state.loaded.warnings.length}, errors=${state.loaded.errors.length}`,
      ];
      if (state.loaded.errors.length > 0) {
        messageLines.push(`First error: ${state.loaded.errors[0]}`);
      }
      if (state.loaded.warnings.length > 0) {
        messageLines.push(`First warning: ${state.loaded.warnings[0]}`);
      }
      if (typeof console !== "undefined") {
        if (state.loaded.errors.length > 0) {
          console.error(
            `[workflow-scan] dir=${state.workflowsDir} errors=${JSON.stringify(state.loaded.errors)} warnings=${JSON.stringify(state.loaded.warnings)}`,
          );
        } else {
          console.info(
            `[workflow-scan] dir=${state.workflowsDir} loaded=${state.loaded.workflows.length} warnings=${state.loaded.warnings.length}`,
          );
        }
      }
      const message = messageLines.join("\n");
      data.window?.alert?.(message);
      break;
    }
    case "openBackendManager":
      await openBackendManagerDialog({
        window: data.window,
      });
      break;
    case "openWorkflowSettings":
      await openTaskManagerDialog({
        initialTabKey: "workflow-options",
        initialWorkflowId:
          typeof data.workflowId === "string" ? data.workflowId : undefined,
      });
      break;
    case "openTaskManager":
    case "openDashboard":
      await openTaskManagerDialog();
      break;
    case "openSkillRunnerSidebar":
      await openAssistantWorkspaceSidebar({
        window: data.window,
        tab: "skillrunner",
      });
      break;
    case "openAcpSidebar":
      await openAssistantWorkspaceSidebar({
        window: data.window,
        tab: "acp-chat",
      });
      break;
    case "openAcpSkillRunnerSidebar":
      await openAssistantWorkspaceSidebar({
        window: data.window,
        tab: "acp-skills",
      });
      break;
    case "toggleSkillRunnerSidebar":
      await toggleAssistantWorkspaceSidebar({
        window: data.window,
        tab: "skillrunner",
      });
      break;
    case "openLogViewer":
      await openTaskManagerDialog({
        initialTabKey: "runtime-logs",
      });
      break;
    case "scanRuntimePersistenceUsage":
      return scanRuntimePersistenceUsage();
    case "cleanupRuntimePersistenceCategory":
      return cleanupRuntimePersistenceCategory(
        String(data.category || "") as RuntimePersistenceCategory,
      );
    case "openRuntimePersistenceRoot":
      try {
        openFolderInSystemFileManager(getRuntimePersistencePaths().root);
        return {
          ok: true,
          stage: "open-runtime-persistence-root",
          message: "runtime persistence root opened",
        };
      } catch (error) {
        return {
          ok: false,
          stage: "open-runtime-persistence-root",
          message: String(error),
        };
      }
    case "openSkillRunnerLocalDeployDebugConsole":
      if (!isDebugModeEnabled()) {
        return {
          ok: false,
          stage: "open-debug-console-disabled",
          message: "debug mode is disabled",
        };
      }
      await openSkillRunnerLocalDeployDebugDialog();
      return {
        ok: true,
        stage: "open-debug-console",
        message: "local deploy debug console opened",
      };
    case "deploySkillRunnerLocalRuntime":
      return deployAndConfigureLocalSkillRunner({
        version: typeof data.version === "string" ? data.version : undefined,
        forcedBranch:
          data.forcedBranch === "deploy" || data.forcedBranch === "start"
            ? data.forcedBranch
            : undefined,
      });
    case "planSkillRunnerLocalRuntimeOneclick":
      return planLocalRuntimeOneclick({
        version: typeof data.version === "string" ? data.version : undefined,
      });
    case "previewSkillRunnerLocalRuntimeUninstall":
      return previewLocalRuntimeUninstall({
        clearData: data.clearData === true,
        clearAgentHome: data.clearAgentHome === true,
      });
    case "stateSkillRunnerLocalRuntime":
      return getManagedLocalRuntimeStateSnapshot();
    case "openSkillRunnerManagedBackendPage": {
      try {
        const backend = await resolveManagedLocalBackend();
        await openSkillRunnerManagementDialog({
          backendId: backend.id,
          baseUrl: backend.baseUrl,
        });
        return {
          ok: true,
          stage: "open-managed-backend-page",
          message: "managed backend page opened",
        };
      } catch (error) {
        return {
          ok: false,
          stage: "open-managed-backend-page",
          message: String(error),
        };
      }
    }
    case "refreshSkillRunnerManagedModelCache": {
      try {
        const backend = await resolveManagedLocalBackend();
        const refreshed = await refreshSkillRunnerModelCacheForBackend({ backend });
        return {
          ok: true,
          stage: "refresh-managed-model-cache",
          message: "managed backend model cache refreshed",
          details: refreshed as Record<string, unknown>,
        };
      } catch (error) {
        return {
          ok: false,
          stage: "refresh-managed-model-cache",
          message: String(error),
        };
      }
    }
    case "openSkillRunnerManagedSkillsFolder": {
      try {
        const resolved = resolveManagedLocalSkillsFolderPath();
        if (!resolved.ok) {
          return {
            ok: false,
            stage: "open-managed-skills-folder",
            message: resolved.reason,
            details: resolved.details,
          };
        }
        openFolderInSystemFileManager(resolved.skillsFolder);
        return {
          ok: true,
          stage: "open-managed-skills-folder",
          message: "managed local backend skills folder opened",
          details: {
            localRoot: resolved.localRoot,
            skillsFolder: resolved.skillsFolder,
          },
        };
      } catch (error) {
        return {
          ok: false,
          stage: "open-managed-skills-folder",
          message: String(error),
        };
      }
    }
    case "stopSkillRunnerLocalRuntime":
      return stopLocalRuntime();
    case "uninstallSkillRunnerLocalRuntime":
      return uninstallLocalRuntime({
        clearData: data.clearData === true,
        clearAgentHome: data.clearAgentHome === true,
      });
    default:
      return;
  }
}

function onShortcuts(_type: string) {
  return;
}

function onDialogEvents(_type: string) {
  return;
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
};

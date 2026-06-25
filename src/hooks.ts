import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { getPref, setPref } from "./utils/prefs";
import { createZToolkit } from "./utils/ztoolkit";
import { registerSelectionSampleMenu } from "./modules/selectionSample";
import {
  ensureWorkflowMenuForWindow,
  refreshWorkflowMenus,
} from "./modules/workflowMenu";
import {
  ensureDefaultWorkflowDirExistsOnStartup,
  rescanWorkflowRegistry,
} from "./modules/workflowRuntime";
import { setPluginSkillRegistryRuntimeRootURI } from "./modules/pluginSkillRegistry";
import {
  checkContentPackageUpdate,
  type ContentPackageCheckResult,
  getContentPackageStatus,
  installContentPackageFromFeed,
  type ContentPackageInstallResult,
} from "./modules/contentPackageSubscription";
import { openBackendManagerDialog } from "./modules/backendManager";
import { openTaskManagerDialog } from "./modules/taskManagerDialog";
import {
  notifySynthesisWorkbenchLibraryItemsChanged,
  prewarmSynthesisWorkbenchSurfaces,
} from "./modules/synthesisWorkbenchTab";
import { openZoteroSkillsWorkspaceTab } from "./modules/workspaceTab";
import { openHelpCenterTab } from "./modules/helpCenterTab";
import { getDocsUrl } from "./utils/docsUrl";
import { installWorkflowEditorHostBridge } from "./modules/workflowEditorHost";
import { installWorkflowRuntimeBridge } from "./modules/workflowRuntimeBridge";
import { enableWorkflowPackageDiagnosticsForDebugMode } from "./modules/workflowPackageDiagnostics";
import { installWorkflowDebugProbeBridge } from "./modules/workflowDebugProbe";
import {
  ensureDashboardToolbarButton,
  removeDashboardToolbarButton,
} from "./modules/dashboardToolbarButton";
import {
  installMarkdownAttachmentOpenProbe,
  uninstallMarkdownAttachmentOpenProbe,
} from "./modules/markdownAttachmentOpenProbe";
import { resolveRuntimeToolkit } from "./utils/runtimeBridge";
import { openFolderInSystemFileManager } from "./utils/fileSystem";
import { startSkillRunnerModelCacheAutoRefresh } from "./providers/skillrunner/modelCache";
import {
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
import { refreshSkillRunnerModelCacheForBackend } from "./providers/skillrunner/modelCache";
import { MANAGED_LOCAL_BACKEND_ID } from "./modules/skillRunnerLocalRuntimeConstants";
import { isDebugModeEnabled } from "./modules/debugMode";
import { emitVerboseConsole } from "./modules/diagnosticVerbosity";
import { untrackSkillRunnerBackendHealth } from "./modules/skillRunnerBackendHealthRegistry";
import {
  startSkillRunnerBackendReachabilityCoordinator,
  stopSkillRunnerBackendReachabilityCoordinator,
} from "./modules/skillRunnerBackendReachabilityCoordinator";
import { shutdownSkillRunnerAsyncLifecycle } from "./modules/skillRunnerAsyncLifecycle";
import { flushRuntimeLogsPersistence } from "./modules/runtimeLogManager";
import {
  installAssistantWorkspaceSidebarShell,
  openAssistantWorkspaceSidebar,
  removeAssistantWorkspaceSidebarShell,
  toggleAssistantWorkspaceSidebar,
} from "./modules/assistantWorkspaceSidebar";
import { shutdownAcpSessionManager } from "./modules/acpSessionManager";
import {
  reconcileAcpSkillRunWorkflowTasksOnStartup,
  shutdownAcpSkillRunConversations,
} from "./modules/acpSkillRunStore";
import {
  cleanupRuntimePersistenceRetention,
  cleanupRuntimePersistenceCategory,
  getRuntimePersistencePaths,
  scanRuntimePersistenceUsage,
  type RuntimePersistenceCategory,
} from "./modules/runtimePersistence";
import {
  cleanupPersistenceIssues,
  scanPersistenceIntegrity,
} from "./modules/persistenceIntegrity";
import {
  ensureHostBridgeServer,
  buildHostBridgeRemoteCliProfileForCopy,
  getHostBridgeServerStatus,
  readHostBridgeMasterTokenForCopy,
  restartHostBridgeServer,
  rotateHostBridgeMasterToken,
  rotateHostBridgeToken,
  startHostBridgeSupervisor,
  stopHostBridgeSupervisor,
} from "./modules/hostBridgeServer";
import {
  ensureZoteroMcpServer,
  getZoteroMcpServerStatus,
  shutdownZoteroMcpServer,
} from "./modules/zoteroMcpServer";
import { installHostBridgeCli } from "./modules/hostBridgeCliInstaller";
import { writeHostBridgeWellKnownProfile } from "./modules/hostBridgeProfileStore";
import { delay } from "./utils/runtimeCompatibility";
import {
  getDefaultSynthesisService,
  invalidateDefaultSynthesisService,
} from "./modules/synthesis/service";
import {
  clearGitSyncToken,
  getGitSyncPrefsStatus,
  saveGitSyncPrefs,
  saveGitSyncToken,
  testGitSyncConfiguration,
} from "./modules/synthesis/gitSyncPrefs";
import {
  clearWebDavSyncCredential,
  getWebDavSyncPrefsStatus,
  saveWebDavSyncCredential,
  saveWebDavSyncPrefs,
  testWebDavSyncConfiguration,
} from "./modules/synthesis/webDavSyncPrefs";
import {
  isSynthesisLibraryReadModelInvalidationEvent,
  recordSynthesisZoteroItemNotifications,
} from "./modules/synthesis/itemObserver";
import { reconcileWorkflowTaskProjectionsOnStartup } from "./modules/taskRuntime";
import { closeVisibleWorkflowToasts } from "./modules/workflowExecution/feedbackSeam";

const WORKFLOW_MENU_RETRY_INTERVAL_MS = 100;
const WORKFLOW_MENU_RETRY_MAX_ATTEMPTS = 20;
const LEGACY_REMOVED_SKILLRUNNER_BACKEND_ID = "skillrunner-local";
const SYNTHESIS_WORKBENCH_PRELOAD_DELAY_MS = 1500;
let startupOfficialWorkflowPackageUpdateCheckStarted = false;

let registeredZoteroPaneStylesheet:
  | {
      uri: unknown;
      type: number;
      service: {
        unregisterSheet?: (uri: unknown, type: number) => void;
      };
    }
  | undefined;

function resolveRuntimeRootURI() {
  return typeof rootURI === "string" && rootURI
    ? rootURI
    : `chrome://${addon.data.config.addonRef}/`;
}

function registerZoteroPaneStylesheet() {
  if (registeredZoteroPaneStylesheet) {
    return;
  }
  try {
    const runtime = globalThis as {
      Services?: {
        io?: {
          newURI?: (spec: string) => unknown;
        };
      };
      Components?: {
        classes?: Record<
          string,
          {
            getService?: (iface: unknown) => {
              AUTHOR_SHEET?: number;
              sheetRegistered?: (uri: unknown, type: number) => boolean;
              loadAndRegisterSheet?: (uri: unknown, type: number) => void;
              unregisterSheet?: (uri: unknown, type: number) => void;
            };
          }
        >;
        interfaces?: {
          nsIStyleSheetService?: unknown;
        };
      };
    };
    const styleService = runtime.Components?.classes?.[
      "@mozilla.org/content/style-sheet-service;1"
    ]?.getService?.(runtime.Components.interfaces?.nsIStyleSheetService);
    const uri = runtime.Services?.io?.newURI?.(
      `${resolveRuntimeRootURI()}content/zoteroPane.css`,
    );
    const sheetType = styleService?.AUTHOR_SHEET;
    if (!styleService || !uri || typeof sheetType !== "number") {
      return;
    }
    if (!styleService.sheetRegistered?.(uri, sheetType)) {
      styleService.loadAndRegisterSheet?.(uri, sheetType);
    }
    registeredZoteroPaneStylesheet = {
      uri,
      type: sheetType,
      service: styleService,
    };
  } catch (error) {
    if (typeof console !== "undefined") {
      console.warn("[zotero-pane-css] stylesheet registration failed", error);
    }
  }
}

function localizedMessage(
  id: string,
  fallback: string,
  args?: Record<string, string>,
) {
  try {
    const localized = String(getString(id as any, { args })).trim();
    const fallbackKey = `${addon.data.config.addonRef}-${id}`;
    return localized && localized !== fallbackKey ? localized : fallback;
  } catch {
    return fallback;
  }
}

export async function promptOfficialWorkflowPackageUpdateOnStartup(args: {
  win: _ZoteroTypes.MainWindow;
  check?: () => Promise<ContentPackageCheckResult>;
  install?: () => Promise<ContentPackageInstallResult>;
  onInstalled?: () => Promise<void> | void;
}) {
  const check = await (args.check || checkContentPackageUpdate)();
  if (!check.ok || !check.status.installed || !check.updateAvailable) {
    return {
      prompted: false,
      installed: false,
      check,
    };
  }

  if (!check.compatible) {
    args.win.alert(
      localizedMessage(
        "content-package-startup-update-incompatible",
        `A new official Workflow package is available, but it cannot be installed: ${String(check.incompatibility?.message || "incompatible package")}`,
        {
          reason: String(
            check.incompatibility?.message || "incompatible package",
          ),
        },
      ),
    );
    return {
      prompted: true,
      installed: false,
      check,
    };
  }

  const currentPackage = check.status.installed.package;
  const currentVersion = String(currentPackage.version || "unknown");
  const latestVersion = String(check.package.version || "unknown");
  const channel = String(
    check.feed.channel || check.status.channel || "stable",
  );
  const confirmed = args.win.confirm(
    localizedMessage(
      "content-package-startup-update-confirm",
      [
        "A new official Workflow package is available.",
        "",
        `Current: ${currentVersion}`,
        `Latest: ${latestVersion}`,
        `Channel: ${channel}`,
        "",
        "Install the update now?",
      ].join("\n"),
      {
        currentVersion,
        latestVersion,
        channel,
      },
    ),
  );
  if (!confirmed) {
    return {
      prompted: true,
      installed: false,
      check,
    };
  }

  const install = await (args.install || installContentPackageFromFeed)();
  if (install.ok) {
    if (args.onInstalled) {
      await args.onInstalled();
    } else {
      await rescanWorkflowRegistry();
      refreshWorkflowMenus();
    }
    return {
      prompted: true,
      installed: true,
      check,
      install,
    };
  }

  args.win.alert(
    localizedMessage(
      "content-package-startup-update-failed",
      `Official Workflow package update failed: ${String(install.message || "unknown error")}`,
      {
        reason: String(install.message || "unknown error"),
      },
    ),
  );
  return {
    prompted: true,
    installed: false,
    check,
    install,
  };
}

function scheduleOfficialWorkflowPackageUpdateCheck() {
  if (startupOfficialWorkflowPackageUpdateCheckStarted) {
    return;
  }
  startupOfficialWorkflowPackageUpdateCheckStarted = true;
  const win = Zotero.getMainWindows?.()[0] as _ZoteroTypes.MainWindow | null;
  if (!win) {
    return;
  }
  void promptOfficialWorkflowPackageUpdateOnStartup({ win }).catch((error) => {
    if (typeof console !== "undefined") {
      console.warn(
        "[content-package] startup official workflow package update check failed",
        error,
      );
    }
  });
}

function unregisterZoteroPaneStylesheet() {
  if (!registeredZoteroPaneStylesheet) {
    return;
  }
  try {
    registeredZoteroPaneStylesheet.service.unregisterSheet?.(
      registeredZoteroPaneStylesheet.uri,
      registeredZoteroPaneStylesheet.type,
    );
  } catch (error) {
    if (typeof console !== "undefined") {
      console.warn("[zotero-pane-css] stylesheet cleanup failed", error);
    }
  } finally {
    registeredZoteroPaneStylesheet = undefined;
  }
}

function registerPrefsPane() {
  const runtimeRootURI = resolveRuntimeRootURI();
  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: runtimeRootURI + "content/preferences.xhtml",
    label: getString("prefs-title"),
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
  });
}

async function delayMs(ms: number) {
  await delay(ms);
}

function prewarmSynthesisWorkbenchAfterStartup() {
  void (async () => {
    await delay(SYNTHESIS_WORKBENCH_PRELOAD_DELAY_MS);
    await prewarmSynthesisWorkbenchSurfaces({ surfaces: [] });
  })().catch(() => undefined);
}

function reconcileRecoveredRuntimeTasksOnStartup() {
  try {
    getDefaultSynthesisService().reconcileSynthesisRuntimeWorkStateOnStartup();
  } catch (error) {
    if (typeof console !== "undefined") {
      console.warn("[startup-reconcile] synthesis runtime work failed", error);
    }
  }
  try {
    reconcileAcpSkillRunWorkflowTasksOnStartup();
    reconcileWorkflowTaskProjectionsOnStartup();
  } catch (error) {
    if (typeof console !== "undefined") {
      console.warn(
        "[startup-reconcile] provider task projections failed",
        error,
      );
    }
  }
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
  installMarkdownAttachmentOpenProbe();
  registerZoteroPaneStylesheet();

  const runtimeRootURI = resolveRuntimeRootURI();
  setPluginSkillRegistryRuntimeRootURI(runtimeRootURI);

  await ensureDefaultWorkflowDirExistsOnStartup();
  await rescanWorkflowRegistry();
  reconcileRecoveredRuntimeTasksOnStartup();
  purgeSkillRunnerBackendReconcileState(LEGACY_REMOVED_SKILLRUNNER_BACKEND_ID);
  untrackSkillRunnerBackendHealth(LEGACY_REMOVED_SKILLRUNNER_BACKEND_ID);
  startSkillRunnerModelCacheAutoRefresh();
  startSkillRunnerBackendReachabilityCoordinator();
  startSkillRunnerTaskReconciler();
  void cleanupRuntimePersistenceRetention().catch((error) => {
    if (typeof console !== "undefined") {
      console.warn("[runtime-persistence] retention cleanup failed", error);
    }
  });
  hydrateLocalRuntimeAutoStartSessionStateFromPersistedState();
  if (!isLocalRuntimeAutoStartPaused()) {
    await runManagedRuntimeStartupPreflightProbe();
  }
  startManagedLocalRuntimeAutoEnsureLoop();
  startHostBridgeSupervisor();
  if (getPref("mcpServer.enabled") !== false) {
    void ensureZoteroMcpServer().catch((error) => {
      emitVerboseConsole("warn", "[zotero-mcp] startup failed", error);
    });
  }

  registerPrefsPane();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
  prewarmSynthesisWorkbenchAfterStartup();
  scheduleOfficialWorkflowPackageUpdateCheck();
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
    await delay(1000);
    popupWin.changeLine({
      progress: 30,
      text: `[30%] ${getString("startup-begin")}`,
    });
  }

  if (isDebugModeEnabled()) {
    registerSelectionSampleMenu();
  }

  if (popupWin) {
    await delay(1000);

    popupWin.changeLine({
      progress: 100,
      text: `[100%] ${getString("startup-finish")}`,
    });
    popupWin.startCloseTimer(5000);
  }
}

async function onMainWindowUnload(win: Window): Promise<void> {
  closeVisibleWorkflowToasts();
  removeDashboardToolbarButton(win);
  removeAssistantWorkspaceSidebarShell(win as _ZoteroTypes.MainWindow);
  unregisterToolkitSafely();
  addon.data.dialog?.window?.close();
}

async function onShutdown(): Promise<void> {
  stopSkillRunnerBackendReachabilityCoordinator();
  await shutdownAcpSkillRunConversations();
  await shutdownAcpSessionManager();
  await shutdownZoteroMcpServer();
  await stopHostBridgeSupervisor();
  await shutdownSkillRunnerAsyncLifecycle();
  await flushRuntimeLogsPersistence();
  for (const win of Zotero.getMainWindows?.() || []) {
    removeDashboardToolbarButton(win);
    removeAssistantWorkspaceSidebarShell(win);
  }
  closeVisibleWorkflowToasts();
  unregisterToolkitSafely();
  unregisterZoteroPaneStylesheet();
  uninstallMarkdownAttachmentOpenProbe();
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
  if (
    isSynthesisLibraryReadModelInvalidationEvent({
      event,
      type,
      ids,
      extraData,
    })
  ) {
    notifySynthesisWorkbenchLibraryItemsChanged({
      event,
      type,
      ids,
      extraData,
    });
  }
  void recordSynthesisZoteroItemNotifications({
    event,
    type,
    ids,
    extraData,
  }).catch(() => undefined);
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
      if (state.loaded.errors.length > 0) {
        emitVerboseConsole(
          "error",
          `[workflow-scan] dir=${state.workflowsDir} errors=${JSON.stringify(state.loaded.errors)} warnings=${JSON.stringify(state.loaded.warnings)}`,
        );
      } else {
        emitVerboseConsole(
          "info",
          `[workflow-scan] dir=${state.workflowsDir} loaded=${state.loaded.workflows.length} warnings=${state.loaded.warnings.length}`,
        );
      }
      const message = messageLines.join("\n");
      data.window?.alert?.(message);
      break;
    }
    case "stateContentPackage":
      return getContentPackageStatus();
    case "checkContentPackageUpdate":
      return checkContentPackageUpdate();
    case "installContentPackage": {
      const result = await installContentPackageFromFeed();
      if (result.ok) {
        await rescanWorkflowRegistry();
        refreshWorkflowMenus();
      }
      return result;
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
    case "openPreferencesPane": {
      const paneId = `zotero-prefpane-${addon.data.config.addonRef}`;
      const opener = (Zotero as any).Utilities?.Internal?.openPreferences;
      if (typeof opener === "function") {
        opener(paneId);
      }
      break;
    }
    case "openTaskManager":
      await openTaskManagerDialog();
      break;
    case "openDashboard":
      await openZoteroSkillsWorkspaceTab({
        window: data.window,
      });
      break;
    case "openHelpCenter":
      await openHelpCenterTab({
        window: data.window,
      });
      break;
    case "openOnlineDocs": {
      const zotero = (globalThis as any).Zotero || (data.window as any)?.Zotero;
      zotero?.launchURL?.(getDocsUrl());
      break;
    }
    case "listDashboardActiveTasksForPopover": {
      const limitRaw =
        typeof data.limit === "number" && Number.isFinite(data.limit)
          ? Math.floor(data.limit)
          : 12;
      const limit = Math.max(1, Math.min(50, limitRaw));
      const [activeTasks, acpSkillRuns, filter, displayName] =
        await Promise.all([
          import("./modules/taskRuntime"),
          import("./modules/acpSkillRunStore"),
          import("./modules/dashboardActiveTasks"),
          import("./backends/displayName"),
        ]);
      const backendMetaById = new Map(
        (await loadBackendsRegistry()).backends.map((entry) => [
          String(entry.id || "").trim(),
          {
            displayName: String(entry.displayName || "").trim(),
          },
        ]),
      );
      return filter
        .projectDashboardActiveTasks({
          activeTasks: activeTasks.listActiveWorkflowTaskSummaries({ limit }),
          acpSkillRuns: acpSkillRuns.listAcpSkillRunSummaries({
            activeOnly: true,
            limit,
          }),
        })
        .slice(0, limit)
        .map((entry) => {
          const backendId = String(entry.backendId || "").trim();
          const backendMeta = backendId
            ? backendMetaById.get(backendId)
            : undefined;
          return {
            ...entry,
            backendLabel: backendId
              ? displayName.resolveBackendDisplayName(
                  backendId,
                  backendMeta?.displayName,
                )
              : "",
          };
        });
    }
    case "openSynthesisWorkbench":
      await openZoteroSkillsWorkspaceTab({
        window: data.window,
        initialView: "synthesis",
      });
      break;
    case "openSkillRunnerSidebar":
      {
        const requestId =
          typeof data.requestId === "string" ? data.requestId.trim() : "";
        const backendId =
          typeof data.backendId === "string" ? data.backendId.trim() : "";
        const backend = backendId
          ? (await loadBackendsRegistry()).backends.find(
              (entry) => entry.id === backendId,
            )
          : undefined;
        await openAssistantWorkspaceSidebar({
          window: data.window,
          tab: "skillrunner",
          backend,
          requestId: requestId || undefined,
        });
      }
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
        requestId:
          typeof data.requestId === "string"
            ? data.requestId.trim() || undefined
            : undefined,
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
    case "scanPersistenceGovernance": {
      const onProgress =
        typeof data.onProgress === "function" ? data.onProgress : null;
      const emitProgress = (progress: {
        stage: string;
        label: string;
        current: number;
        total: number;
        percent: number;
      }) => {
        try {
          onProgress?.(progress);
        } catch (error) {
          console.warn("[runtime-persistence] progress callback failed", error);
        }
      };
      let usageStepCount = 0;
      let integrityStepCount = 0;
      const usage = await scanRuntimePersistenceUsage({
        onProgress: (progress) => {
          usageStepCount = Math.max(usageStepCount, progress.total);
          emitProgress({
            ...progress,
            percent: Math.floor((progress.percent || 0) / 2),
          });
        },
      });
      const integrity = await scanPersistenceIntegrity({
        onProgress: (progress) => {
          integrityStepCount = Math.max(integrityStepCount, progress.total);
          const total = usageStepCount + progress.total;
          emitProgress({
            ...progress,
            current: usageStepCount + progress.current,
            total,
            percent: 50 + Math.floor((progress.percent || 0) / 2),
          });
        },
      });
      emitProgress({
        stage: "complete",
        label: "Persistence scan complete",
        current: Math.max(usageStepCount + integrityStepCount, 0),
        total: Math.max(usageStepCount + integrityStepCount, 0),
        percent: 100,
      });
      return { usage, integrity };
    }
    case "cleanupPersistenceGovernanceIssues": {
      const issueIds = Array.isArray(data.issueIds)
        ? data.issueIds.map((entry: unknown) => String(entry || "").trim())
        : [];
      const cleanup = await cleanupPersistenceIssues({
        issueIds: issueIds.filter(Boolean),
        dryRun: data.dryRun !== false,
      });
      const [usage, integrity] = await Promise.all([
        scanRuntimePersistenceUsage(),
        scanPersistenceIntegrity(),
      ]);
      return { cleanup, usage, integrity };
    }
    case "resetSynthesisDatabase":
      return getDefaultSynthesisService().resetSynthesisDatabase({
        confirmationText: data.confirmationText,
      });
    case "getGitSyncPrefsStatus":
      return getGitSyncPrefsStatus();
    case "saveGitSyncPrefs": {
      const result = saveGitSyncPrefs({
        enabled: data.enabled,
        remoteUrl: data.remoteUrl,
        branch: data.branch,
        autoSyncEnabled: data.autoSyncEnabled,
        autoRetryEnabled: data.autoRetryEnabled,
      });
      if (result.ok) {
        invalidateDefaultSynthesisService();
      }
      return result;
    }
    case "saveGitSyncToken": {
      const result = await saveGitSyncToken(String(data.token || ""));
      invalidateDefaultSynthesisService();
      return result;
    }
    case "clearGitSyncToken": {
      const result = await clearGitSyncToken();
      invalidateDefaultSynthesisService();
      return result;
    }
    case "testGitSyncConfiguration":
      return testGitSyncConfiguration({
        cwd: getRuntimePersistencePaths().dataDir,
      });
    case "getWebDavSyncPrefsStatus":
      return getWebDavSyncPrefsStatus();
    case "saveWebDavSyncPrefs": {
      const result = saveWebDavSyncPrefs({
        enabled: data.enabled,
        baseUrl: data.baseUrl,
        remotePath: data.remotePath,
        username: data.username,
        autoSyncEnabled: data.autoSyncEnabled,
        autoRetryEnabled: data.autoRetryEnabled,
      });
      if (result.ok) {
        invalidateDefaultSynthesisService();
      }
      return result;
    }
    case "saveWebDavSyncCredential": {
      const result = await saveWebDavSyncCredential(
        String(data.credential || ""),
      );
      invalidateDefaultSynthesisService();
      return result;
    }
    case "clearWebDavSyncCredential": {
      const result = await clearWebDavSyncCredential();
      invalidateDefaultSynthesisService();
      return result;
    }
    case "testWebDavSyncConfiguration":
      return testWebDavSyncConfiguration();
    case "openRuntimePersistenceRoot":
      try {
        openFolderInSystemFileManager(getRuntimePersistencePaths().root, {
          label: "runtime folder",
        });
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
    case "stateHostBridge":
      return {
        ok: true,
        stage: "host-bridge-state",
        details: getHostBridgeServerStatus(),
      };
    case "stateMcpServer":
      return {
        ok: true,
        stage: "mcp-server-state",
        details: {
          enabled: getPref("mcpServer.enabled") !== false,
          server: getZoteroMcpServerStatus(),
        },
      };
    case "setMcpServerEnabled": {
      const enabled = data.enabled === true;
      setPref("mcpServer.enabled", enabled);
      if (enabled) {
        try {
          await ensureZoteroMcpServer();
        } catch {
          // The returned status carries the startup failure for the preferences UI.
        }
      } else {
        await shutdownZoteroMcpServer();
      }
      return {
        ok: true,
        stage: "mcp-server-enabled-setting",
        message: enabled
          ? "Zotero MCP server enabled."
          : "Zotero MCP server disabled.",
        details: {
          enabled,
          server: getZoteroMcpServerStatus(),
        },
      };
    }
    case "showHostBridgeEndpoint": {
      try {
        const details = await ensureHostBridgeServer();
        return {
          ok: true,
          stage: "host-bridge-show-endpoint",
          message: "Host Bridge endpoint is available.",
          details,
        };
      } catch (error) {
        return {
          ok: false,
          stage: "host-bridge-show-endpoint",
          message: String(error),
          details: getHostBridgeServerStatus(),
        };
      }
    }
    case "setHostBridgeLanEnabled": {
      const enabled = data.enabled === true;
      setPref("hostBridgeLanEnabled", enabled);
      if (enabled) {
        setPref("hostBridgePinPortEnabled", true);
      }
      if (getHostBridgeServerStatus().status === "running") {
        await restartHostBridgeServer();
      }
      return {
        ok: true,
        stage: "host-bridge-lan-setting",
        message: enabled
          ? "Host Bridge LAN binding enabled."
          : "Host Bridge LAN binding disabled.",
        details: getHostBridgeServerStatus(),
      };
    }
    case "setHostBridgePinPort": {
      const enabled = data.enabled === true;
      const rawPort = Number(data.port);
      const port =
        Number.isInteger(rawPort) && rawPort >= 1024 && rawPort <= 65535
          ? rawPort
          : 26570;
      const lanEnabled = getHostBridgeServerStatus().lanEnabled === true;
      setPref("hostBridgePinPortEnabled", lanEnabled || enabled);
      setPref("hostBridgePinnedPort", port);
      await restartHostBridgeServer();
      return {
        ok: true,
        stage: "host-bridge-pin-port-setting",
        message:
          lanEnabled || enabled
            ? `Host Bridge fixed port enabled on ${port}.`
            : "Host Bridge fixed port disabled.",
        details: getHostBridgeServerStatus(),
      };
    }
    case "setHostBridgeAdvertisedHost": {
      const host = String(data.host || "").trim();
      setPref("hostBridgeAdvertisedHost", host);
      return {
        ok: true,
        stage: "host-bridge-advertised-host",
        message: host
          ? "Host Bridge local IP override updated."
          : "Host Bridge local IP override cleared; auto-detection will be used.",
        details: getHostBridgeServerStatus(),
      };
    }
    case "rotateHostBridgeToken": {
      const rotated = rotateHostBridgeToken();
      const server = getHostBridgeServerStatus();
      if (server.status === "running" && server.endpoint) {
        await writeHostBridgeWellKnownProfile({
          endpoint:
            server.bindMode === "lan"
              ? `http://127.0.0.1:${server.port}/bridge/v1`
              : server.endpoint,
          token: rotated.token,
          updatedAt: rotated.rotatedAt,
        });
      }
      return {
        ok: true,
        stage: "host-bridge-token-rotate",
        message: "Host Bridge token rotated.",
        details: {
          tokenMasked: rotated.tokenMasked,
          rotatedAt: rotated.rotatedAt,
          server: getHostBridgeServerStatus(),
        },
      };
    }
    case "rotateHostBridgeMasterToken": {
      try {
        const rotated = await rotateHostBridgeMasterToken();
        return {
          ok: true,
          stage: "host-bridge-master-token-rotate",
          message: "Host Bridge master token rotated.",
          details: {
            tokenMasked: rotated.tokenMasked,
            rotatedAt: rotated.rotatedAt,
            server: getHostBridgeServerStatus(),
          },
        };
      } catch (error) {
        return {
          ok: false,
          stage: "host-bridge-master-token-rotate",
          message: String(error),
          details: {
            server: getHostBridgeServerStatus(),
          },
        };
      }
    }
    case "copyHostBridgeMasterToken": {
      const result = await readHostBridgeMasterTokenForCopy();
      if (!result.ok) {
        return {
          ok: false,
          stage: "host-bridge-master-token-copy",
          message: result.message,
          details: {
            code: result.code,
            server: getHostBridgeServerStatus(),
          },
        };
      }
      return {
        ok: true,
        stage: "host-bridge-master-token-copy",
        message: "Host Bridge master token copied.",
        details: {
          clipboardText: result.token,
          server: getHostBridgeServerStatus(),
        },
      };
    }
    case "copyHostBridgeRemoteProfile": {
      const result = await buildHostBridgeRemoteCliProfileForCopy();
      if (!result.ok) {
        return {
          ok: false,
          stage: "host-bridge-remote-profile-copy",
          message: result.message,
          details: {
            code: result.code,
            server: getHostBridgeServerStatus(),
          },
        };
      }
      return {
        ok: true,
        stage: "host-bridge-remote-profile-copy",
        message: "Host Bridge remote CLI profile copied.",
        details: {
          clipboardText: `${JSON.stringify(result.profile, null, 2)}\n`,
          endpoint: result.endpoint,
          server: getHostBridgeServerStatus(),
        },
      };
    }
    case "installHostBridgeCli":
      return installHostBridgeCli({
        confirmAddToPath: (dir) =>
          data.window?.confirm?.(
            `Install directory is not in PATH:\n\n${dir}\n\nAdd it to the user PATH? Restarting terminals may be required.`,
          ) === true,
      });
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
        await openZoteroSkillsWorkspaceTab({
          initialView: "dashboard",
          initialDashboardTabKey: `backend:${backend.id}`,
          initialDashboardBackendSubview: "management",
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
        const refreshed = await refreshSkillRunnerModelCacheForBackend({
          backend,
        });
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
        openFolderInSystemFileManager(resolved.skillsFolder, {
          label: "skills folder",
        });
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

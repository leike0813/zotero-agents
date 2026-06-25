import { config } from "../../package.json";
import { ACP_OPENCODE_DISPLAY_NAME } from "../config/defaults";
import type { BackendInstance } from "../backends/types";
import { getStringOrFallback } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { copyText } from "../utils/ztoolkit";
import { openFolderInSystemFileManager } from "../utils/fileSystem";
import {
  SKILLRUNNER_ICON_URI,
  applyToolbarButtonStyling,
  syncToolbarButtonIconFill,
  updateAssistantToolbarAttention,
} from "./dashboardToolbarButton";
import { buildAcpHostContext } from "./acpContextBuilder";
import { buildAcpSidebarViewSnapshot } from "./acpSidebarModel";
import {
  authenticateAcpConversation,
  archiveAcpConversation,
  buildAcpDiagnosticsBundle,
  cancelAcpConversationPrompt,
  connectAcpConversation,
  disconnectAcpConversation,
  getAcpConversationSnapshot,
  getAcpFrontendSnapshot,
  refreshAcpConversationBackends,
  reconnectAcpConversation,
  renameAcpConversation,
  resolveAcpConversationPermission,
  sendAcpConversationPrompt,
  setActiveAcpBackend,
  setActiveAcpConversation,
  setAcpConversationChatDisplayMode,
  setAcpConversationMode,
  setAcpConversationModel,
  setAcpConversationReasoningEffort,
  startNewAcpConversation,
  subscribeAcpFrontendSnapshots,
  toggleAcpConversationDiagnostics,
  toggleAcpConversationStatusDetails,
} from "./acpSessionManager";
import { openBackendManagerDialog } from "./backendManager";
import type { AcpSidebarTarget } from "./acpTypes";
import {
  archiveAcpSkillRun,
  buildAcpSkillRunPanelSnapshot,
  cancelAcpSkillRun,
  connectAcpSkillRun,
  disconnectAcpSkillRun,
  endAcpSkillRunSession,
  interruptAcpSkillRunCurrentTurn,
  listAcpSkillRunSummaries,
  replyAcpSkillRun,
  resolveAcpSkillRunPermissionRequest,
  selectAcpSkillRun,
  setAcpSkillRunMode,
  setAcpSkillRunModel,
  setAcpSkillRunReasoningEffort,
  subscribeAcpSkillRunSnapshots,
} from "./acpSkillRunStore";
import {
  attachSkillRunnerSidebarHost,
  detachSkillRunnerSidebarHost,
  dispatchRunWorkspaceAction,
  focusSkillRunnerWorkspace,
  refreshSkillRunnerWorkspacePresentation,
  type RunWorkspaceSnapshot,
} from "./skillRunnerRunDialog";
import {
  buildSkillRunnerSidebarSections,
  countWaitingSkillRunnerTasks,
} from "./skillRunnerSidebarModel";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  listActiveWorkflowTaskSummaries,
  subscribeWorkflowTaskChanges,
} from "./taskRuntime";
import { countDashboardHumanAttentionTasks } from "./dashboardActiveTasks";
import { normalizeStatus } from "./skillRunnerProviderStateMachine";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";
import {
  applySidebarPaneContainerStyles,
  createSidebarContainer,
  createSidebarFrame,
  resolveSidebarFrameWindow,
  setSidebarContainerVisible,
} from "./sidebarBrowserHost";
import {
  createAssistantSidebarScopeKey,
  decorateAssistantSidebarChildSnapshot,
} from "./assistantSidebarViewModel";

type AssistantWorkspaceTab = "skillrunner" | "acp-chat" | "acp-skills";
type SidebarButtonElement = XULElement | Element;
type MountedSidebarPane = {
  button: SidebarButtonElement | null;
  container: XULElement | null;
  frame: Element | null;
  frameWindow: Window | null;
  frameLoadHandler?: () => void;
};
type AssistantWorkspaceHostRuntime = {
  win: _ZoteroTypes.MainWindow;
  activeTarget: AcpSidebarTarget | null;
  activeTab: AssistantWorkspaceTab;
  drawerOpen: boolean;
  drawerCompletedCollapsed: boolean;
  latestSkillRunnerSnapshot?: RunWorkspaceSnapshot | null;
  library: MountedSidebarPane;
  reader: MountedSidebarPane;
  removeMessageListener?: () => void;
  removeAcpSnapshotSubscription?: () => void;
  removeAcpSkillRunSubscription?: () => void;
  removeTaskSubscription?: () => void;
  postSnapshotTimer?: ReturnType<typeof setTimeout> | null;
  skillRunnerRefreshTimer?: ReturnType<typeof setTimeout> | null;
  skillRunnerRefreshGeneration: number;
  pendingSkillRunnerRefresh?: SkillRunnerSidebarRefreshRequest;
  scopeKey: string;
  snapshotRevision: number;
  lastAcpSkillWaitingToastKeys: Set<string>;
};
type SkillRunnerSidebarRefreshRequest = {
  target: AcpSidebarTarget;
  runKey?: string;
  selectionChanged: boolean;
  generation: number;
};
type AssistantWorkspaceEnvelope = {
  type?: string;
  payload?: Record<string, unknown>;
};
type AssistantWorkspaceActionPayload = Record<string, unknown> & {
  tab?: AssistantWorkspaceTab;
  action?: string;
  actionId?: string;
  ts?: string;
};
type AssistantWorkspaceBridgeResult = {
  ok: boolean;
  actionId?: string;
  error?: string;
};
type AssistantWorkspaceBridge = {
  postMessage: (
    type: string,
    payload?: Record<string, unknown>,
  ) => Promise<AssistantWorkspaceBridgeResult>;
};

const hosts = new WeakMap<
  _ZoteroTypes.MainWindow,
  AssistantWorkspaceHostRuntime
>();
const FRAME_WINDOW_WAIT_TIMEOUT_MS = 2000;
const DEFAULT_TAB: AssistantWorkspaceTab = "acp-chat";
const ASSISTANT_WORKSPACE_BRIDGE_KEY = "__zsAssistantWorkspaceBridge";
const localize = getStringOrFallback;

function resolveSidebarPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/sidebar/assistant-workspace.html`;
}

function resolvePreferredTarget(
  win: _ZoteroTypes.MainWindow,
): AcpSidebarTarget {
  const tabs = (win as any).Zotero_Tabs;
  const selectedIndex = Number(tabs?.selectedIndex || 0);
  return selectedIndex > 0 ||
    String(tabs?.selectedType || "").trim() === "reader"
    ? "reader"
    : "library";
}

function selectedTabUsesPluginOnlyContextPane(win: _ZoteroTypes.MainWindow) {
  const tabs = (win as any).Zotero_Tabs;
  const selectedIndex = Number(tabs?.selectedIndex || 0);
  const selectedType = String(tabs?.selectedType || "").trim();
  return selectedIndex > 0 && selectedType !== "reader";
}

function waitForTimeout(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function waitForPaneFrameWindow(
  pane: MountedSidebarPane,
  timeoutMs = FRAME_WINDOW_WAIT_TIMEOUT_MS,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const frameWindow = resolveSidebarFrameWindow(pane.frame);
    if (frameWindow) {
      pane.frameWindow = frameWindow;
      return frameWindow;
    }
    await waitForTimeout(40);
  }
  return null;
}

function getLibraryRoots(win: _ZoteroTypes.MainWindow) {
  const itemPane = win.document.getElementById("zotero-item-pane");
  const defaultDeck = itemPane?.querySelector("#zotero-item-pane-content");
  const sidenav = itemPane?.querySelector(
    "#zotero-view-item-sidenav",
  ) as XULElement | null;
  return { itemPane, defaultDeck, sidenav };
}

function getReaderRoots(win: _ZoteroTypes.MainWindow) {
  const contextPane = win.document.getElementById("zotero-context-pane");
  const contextInner = win.document.getElementById("zotero-context-pane-inner");
  const sidenav = win.document.getElementById(
    "zotero-context-pane-sidenav",
  ) as XULElement | null;
  return { contextPane, contextInner, sidenav };
}

function ensureLibraryPaneExpanded(win: _ZoteroTypes.MainWindow) {
  const itemPane = win.document.getElementById("zotero-item-pane");
  const splitter = win.document.getElementById("zotero-items-splitter");
  if (!itemPane || !splitter) {
    return false;
  }
  if (itemPane.getAttribute("collapsed") === "true") {
    splitter.setAttribute("state", "open");
    itemPane.setAttribute("collapsed", "false");
  }
  return true;
}

function ensureReaderPaneExpanded(win: _ZoteroTypes.MainWindow) {
  const contextPane = (win as any).ZoteroContextPane;
  if (!contextPane) {
    return false;
  }
  contextPane.collapsed = false;
  return true;
}

function buildSidebarButton(
  doc: Document,
  win: _ZoteroTypes.MainWindow,
  id: string,
  label: string,
) {
  const button = doc.createXULElement("toolbarbutton") as SidebarButtonElement;
  button.id = id;
  button.setAttribute("class", "zotero-tb-button zs-assistant-sidebar-button");
  button.setAttribute("data-zs-role", "assistant-sidebar-entry");
  button.setAttribute("tooltiptext", label);
  button.setAttribute("aria-label", label);
  button.setAttribute("image", SKILLRUNNER_ICON_URI);
  applyToolbarButtonStyling(
    button as Element & { style?: CSSStyleDeclaration },
    SKILLRUNNER_ICON_URI,
    26,
  );
  syncToolbarButtonIconFill(
    button as Element & {
      style?: CSSStyleDeclaration;
      querySelector?: (selector: string) => Element | null;
      getBoundingClientRect?: () => { width: number; height: number };
    },
    win,
    { minIconPx: 16, insetPx: 1 },
  );
  return button;
}

function setButtonSelected(
  button: SidebarButtonElement | null,
  selected: boolean,
) {
  if (!button) {
    return;
  }
  button.setAttribute("aria-pressed", selected ? "true" : "false");
  if (selected) {
    button.setAttribute("data-zs-selected", "true");
  } else {
    button.removeAttribute("data-zs-selected");
  }
}

function countWaitingTasks() {
  return countDashboardHumanAttentionTasks({
    activeTasks: listActiveWorkflowTaskSummaries(),
    acpSkillRuns: listAcpSkillRunSummaries({ activeOnly: true }),
  });
}

function maybeShowAcpSkillWaitingToasts(host: AssistantWorkspaceHostRuntime) {
  const waitingRuns = listAcpSkillRunSummaries({ activeOnly: true }).filter(
    (run) => {
      const normalized = normalizeStatus(run.status, "running");
      return (
        normalized === "waiting_user" ||
        normalized === "waiting_auth" ||
        !!run.pendingPermission
      );
    },
  );
  const nextKeys = new Set<string>();
  for (const run of waitingRuns) {
    const normalized = normalizeStatus(run.status, "running");
    const key = `${run.requestId}:${run.pendingPermission ? "permission" : normalized}`;
    nextKeys.add(key);
    if (host.lastAcpSkillWaitingToastKeys.has(key)) {
      continue;
    }
    showWorkflowToast({
      text: `${run.workflowLabel || run.taskName || run.skillId || "ACP Skill"} needs your input.`,
      type: "default",
      semantic: "waiting",
    });
  }
  host.lastAcpSkillWaitingToastKeys = nextKeys;
}

function updateAssistantAttentionIndicator(
  host: AssistantWorkspaceHostRuntime,
) {
  const waitingCount = countWaitingTasks();
  updateAssistantToolbarAttention(host.win, waitingCount);
}

function deactivateTarget(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  const libraryRoots = getLibraryRoots(host.win);
  const readerRoots = getReaderRoots(host.win);
  if (target === "library") {
    setSidebarContainerVisible(host.library.container, false);
    (libraryRoots.defaultDeck as Element | null)?.removeAttribute("hidden");
    setButtonSelected(host.library.button, false);
  } else {
    setSidebarContainerVisible(host.reader.container, false);
    if (selectedTabUsesPluginOnlyContextPane(host.win)) {
      const contextPane = (host.win as any).ZoteroContextPane;
      if (contextPane) {
        contextPane.collapsed = true;
      }
      (readerRoots.contextInner as Element | null)?.removeAttribute("hidden");
    } else {
      (readerRoots.contextInner as Element | null)?.removeAttribute("hidden");
    }
    setButtonSelected(host.reader.button, false);
  }
  if (host.activeTarget === target) {
    host.drawerOpen = false;
    host.activeTarget = null;
  }
}

function closeActiveSidebarHost(host: AssistantWorkspaceHostRuntime) {
  const activeTarget = host.activeTarget;
  if (!activeTarget) {
    return false;
  }
  host.drawerOpen = false;
  clearSkillRunnerSidebarRefresh(host);
  detachSkillRunnerSidebarHost({ hostWindow: host.win });
  deactivateTarget(host, activeTarget);
  return true;
}

function buildDecoratedSkillRunnerSnapshot(
  host: AssistantWorkspaceHostRuntime,
  snapshot: RunWorkspaceSnapshot,
): RunWorkspaceSnapshot {
  const groups = Array.isArray(snapshot.workspace?.groups)
    ? snapshot.workspace.groups
    : [];
  const sections = buildSkillRunnerSidebarSections({
    groups,
    context: null,
    selectedTaskKey: String(snapshot.workspace?.selectedTaskKey || ""),
    completedCollapsed: host.drawerCompletedCollapsed,
  });
  host.snapshotRevision += 1;
  const decorated = decorateAssistantSidebarChildSnapshot({
    scopeKey: host.scopeKey,
    activeTab: host.activeTab,
    tab: "skillrunner",
    revision: host.snapshotRevision,
    waitingCount: countWaitingTasks(),
    full: host.activeTab === "skillrunner",
    snapshot: {
      ...snapshot,
      hostMode: "sidebar" as const,
      drawer: {
        open: host.drawerOpen,
        notice: snapshot.drawer?.notice,
        truncated: snapshot.drawer?.truncated,
        sections: sections.map((section) => ({
          id: section.id,
          title:
            section.id === "completed"
              ? localize(
                  "task-dashboard-run-completed-tasks-title",
                  "Completed",
                )
              : localize("task-dashboard-run-running-tasks-title", "Running"),
          collapsed: section.collapsed,
          groups: section.groups,
        })),
      },
      badges: {
        waitingCount: countWaitingSkillRunnerTasks(groups),
      },
    } as unknown as Record<string, unknown>,
  }) as unknown as RunWorkspaceSnapshot;
  host.latestSkillRunnerSnapshot = decorated;
  return decorated;
}

function createSkillRunnerHostActionHandler(
  host: AssistantWorkspaceHostRuntime,
) {
  return async (envelope: {
    action?: string;
    payload?: Record<string, unknown>;
  }) => {
    const action = String(envelope.action || "").trim();
    if (action === "toggle-drawer") {
      host.drawerOpen = !host.drawerOpen;
      refreshSkillRunnerWorkspacePresentation();
      return true;
    }
    if (action === "close-drawer") {
      host.drawerOpen = false;
      refreshSkillRunnerWorkspacePresentation();
      return true;
    }
    if (action === "toggle-drawer-section") {
      const sectionId = String(envelope.payload?.sectionId || "").trim();
      if (sectionId === "completed") {
        host.drawerCompletedCollapsed = !host.drawerCompletedCollapsed;
        refreshSkillRunnerWorkspacePresentation();
        return true;
      }
    }
    if (action === "open-backend-manager") {
      await openBackendManagerDialog({
        window: host.win,
        initialProviderType: "skillrunner",
      });
      return true;
    }
    if (action === "copy-request-id") {
      const requestId =
        String(envelope.payload?.requestId || "").trim() ||
        String(host.latestSkillRunnerSnapshot?.session?.requestId || "").trim();
      copyText(requestId);
      return true;
    }
    if (action === "copy-diagnostics") {
      copyText(JSON.stringify(host.latestSkillRunnerSnapshot || {}, null, 2));
      return true;
    }
    if (action === "close-sidebar") {
      return closeActiveSidebarHost(host);
    }
    return false;
  };
}

function resolveTargetFromSource(
  host: AssistantWorkspaceHostRuntime,
  source: Window | null,
): AcpSidebarTarget | null {
  if (!source) {
    return host.activeTarget;
  }
  if (host.library.frameWindow === source) {
    return "library";
  }
  if (host.reader.frameWindow === source) {
    return "reader";
  }
  return host.activeTarget;
}

function postShellMessage(
  pane: MountedSidebarPane,
  type: string,
  payload?: Record<string, unknown>,
) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return;
  }
  pane.frameWindow = frameWindow;
  frameWindow.postMessage(
    {
      type,
      payload: payload || {},
    },
    "*",
  );
}

function writeAssistantWorkspaceBridgeTarget(
  target: Record<string, unknown> | null | undefined,
  bridge?: AssistantWorkspaceBridge,
) {
  if (!target) {
    return;
  }
  if (bridge) {
    target[ASSISTANT_WORKSPACE_BRIDGE_KEY] = bridge;
    return;
  }
  delete target[ASSISTANT_WORKSPACE_BRIDGE_KEY];
}

function installShellBridge(
  host: AssistantWorkspaceHostRuntime,
  pane: MountedSidebarPane,
  target: AcpSidebarTarget,
) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return false;
  }
  pane.frameWindow = frameWindow;
  const bridge: AssistantWorkspaceBridge = {
    postMessage: async (type, payload) => {
      return handleAssistantWorkspaceMessage(host, target, {
        type,
        payload:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload
            : {},
      });
    },
  };
  const directTarget = frameWindow as Window & Record<string, unknown>;
  const wrappedTarget =
    typeof (directTarget as { wrappedJSObject?: unknown }).wrappedJSObject ===
    "object"
      ? ((directTarget as { wrappedJSObject?: Record<string, unknown> })
          .wrappedJSObject as Record<string, unknown>)
      : null;
  writeAssistantWorkspaceBridgeTarget(directTarget, bridge);
  writeAssistantWorkspaceBridgeTarget(wrappedTarget, bridge);
  return true;
}

function clearShellBridge(pane: MountedSidebarPane) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return;
  }
  const directTarget = frameWindow as Window & Record<string, unknown>;
  const wrappedTarget =
    typeof (directTarget as { wrappedJSObject?: unknown }).wrappedJSObject ===
    "object"
      ? ((directTarget as { wrappedJSObject?: Record<string, unknown> })
          .wrappedJSObject as Record<string, unknown>)
      : null;
  writeAssistantWorkspaceBridgeTarget(directTarget, undefined);
  writeAssistantWorkspaceBridgeTarget(wrappedTarget, undefined);
}

function postChildSnapshot(
  host: AssistantWorkspaceHostRuntime,
  pane: MountedSidebarPane,
  tab: AssistantWorkspaceTab,
  phase: "init" | "snapshot",
  snapshot: Record<string, unknown>,
) {
  host.snapshotRevision += 1;
  const payload = decorateAssistantSidebarChildSnapshot({
    scopeKey: host.scopeKey,
    activeTab: host.activeTab,
    tab,
    revision: host.snapshotRevision,
    waitingCount: countWaitingTasks(),
    full: tab === host.activeTab,
    snapshot,
  });
  postShellMessage(pane, "assistant-workspace:child-snapshot", {
    tab,
    phase,
    snapshot: payload,
  });
}

function buildAcpSnapshot(target: AcpSidebarTarget) {
  return buildAcpSidebarViewSnapshot({
    target,
    snapshot: getAcpConversationSnapshot(),
    frontendSnapshot: getAcpFrontendSnapshot(),
  }) as unknown as Record<string, unknown>;
}

function postAcpChatSnapshot(
  host: AssistantWorkspaceHostRuntime,
  pane: MountedSidebarPane,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "snapshot",
) {
  postChildSnapshot(host, pane, "acp-chat", phase, buildAcpSnapshot(target));
}

function postAcpSkillRunSnapshot(
  host: AssistantWorkspaceHostRuntime,
  pane: MountedSidebarPane,
  phase: "init" | "snapshot" = "snapshot",
) {
  postChildSnapshot(
    host,
    pane,
    "acp-skills",
    phase,
    buildAcpSkillRunPanelSnapshot() as unknown as Record<string, unknown>,
  );
}

async function postFreshAcpChatSnapshot(
  host: AssistantWorkspaceHostRuntime,
  pane: MountedSidebarPane,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "snapshot",
) {
  await refreshAcpConversationBackends();
  postAcpChatSnapshot(host, pane, target, phase);
}

function postShellInit(
  pane: MountedSidebarPane,
  activeTab: AssistantWorkspaceTab,
) {
  postShellMessage(pane, "assistant-workspace:init", { activeTab });
}

function postActiveShellInit(host: AssistantWorkspaceHostRuntime) {
  const target = host.activeTarget;
  if (!target) {
    return;
  }
  postShellInit(
    target === "reader" ? host.reader : host.library,
    host.activeTab,
  );
}

function postAllSnapshots(host: AssistantWorkspaceHostRuntime) {
  const target = host.activeTarget;
  if (!target) {
    return;
  }
  const pane = target === "reader" ? host.reader : host.library;
  if (host.activeTab === "acp-chat") {
    postAcpChatSnapshot(host, pane, target);
    return;
  }
  if (host.activeTab === "acp-skills") {
    postAcpSkillRunSnapshot(host, pane);
  }
}

function schedulePostSnapshot(host: AssistantWorkspaceHostRuntime) {
  if (host.postSnapshotTimer) {
    return;
  }
  host.postSnapshotTimer = setTimeout(() => {
    host.postSnapshotTimer = null;
    postAllSnapshots(host);
  }, 16);
}

function installMessageBridge(host: AssistantWorkspaceHostRuntime) {
  if (host.removeMessageListener) {
    return;
  }
  const onMessage = (event: MessageEvent) => {
    const data = event.data as AssistantWorkspaceEnvelope;
    if (!data || typeof data.type !== "string") {
      return;
    }
    const target = resolveTargetFromSource(host, event.source as Window | null);
    if (!target) {
      return;
    }
    void handleAssistantWorkspaceMessage(host, target, data);
  };
  host.win.addEventListener("message", onMessage);
  host.removeMessageListener = () => {
    host.win.removeEventListener("message", onMessage);
  };
}

async function handleAssistantWorkspaceMessage(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  data: AssistantWorkspaceEnvelope,
): Promise<AssistantWorkspaceBridgeResult> {
  const actionPayload =
    data.payload && typeof data.payload === "object"
      ? (data.payload as AssistantWorkspaceActionPayload)
      : {};
  const actionId = String(actionPayload.actionId || "").trim();
  const action = String(actionPayload.action || "").trim();
  const tab = normalizeTab(actionPayload.tab);
  try {
    if (data.type === "assistant-workspace:action") {
      await handleShellAction(host, target, data.payload || {});
      logAssistantShellAction({
        host,
        target,
        type: data.type,
        tab,
        action,
        actionId,
        result: "ok",
      });
      return { ok: true, actionId };
    }
    if (data.type === "assistant-workspace:child-action") {
      await handleChildAction(host, target, data.payload || {});
      logAssistantShellAction({
        host,
        target,
        type: data.type,
        tab,
        action,
        actionId,
        result: "ok",
      });
      return { ok: true, actionId };
    }
    return { ok: true, actionId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "unknown error");
    logAssistantShellAction({
      host,
      target,
      type: data.type || "",
      tab,
      action,
      actionId,
      result: "error",
      error: message,
    });
    return { ok: false, actionId, error: message };
  }
}

function logAssistantShellAction(args: {
  host: AssistantWorkspaceHostRuntime;
  target: AcpSidebarTarget;
  type: string;
  tab: AssistantWorkspaceTab;
  action: string;
  actionId?: string;
  result: "ok" | "error";
  error?: string;
}) {
  appendRuntimeLog({
    level: args.result === "error" ? "warn" : "info",
    scope: "system",
    component: "assistant-shell",
    operation: "child-action",
    phase: args.result,
    stage: `${args.tab}-${args.action || "unknown"}`,
    interactionId: args.actionId,
    message:
      args.result === "error"
        ? `Assistant shell action failed: ${args.tab}/${args.action || "unknown"}`
        : `Assistant shell action handled: ${args.tab}/${args.action || "unknown"}`,
    details: {
      target: args.target,
      type: args.type,
      tab: args.tab,
      action: args.action,
      actionId: args.actionId,
      error: args.error,
    },
  });
}

function clearSkillRunnerSidebarRefresh(host: AssistantWorkspaceHostRuntime) {
  if (host.skillRunnerRefreshTimer) {
    clearTimeout(host.skillRunnerRefreshTimer);
    host.skillRunnerRefreshTimer = null;
  }
  host.pendingSkillRunnerRefresh = undefined;
  host.skillRunnerRefreshGeneration += 1;
}

function isSkillRunnerSidebarRefreshCurrent(
  host: AssistantWorkspaceHostRuntime,
  request: SkillRunnerSidebarRefreshRequest,
) {
  return (
    hosts.get(host.win) === host &&
    host.activeTab === "skillrunner" &&
    host.activeTarget === request.target &&
    host.skillRunnerRefreshGeneration === request.generation
  );
}

async function runSkillRunnerSidebarRefresh(
  host: AssistantWorkspaceHostRuntime,
  request: SkillRunnerSidebarRefreshRequest,
) {
  try {
    if (!isSkillRunnerSidebarRefreshCurrent(host, request)) {
      return;
    }
    const pane = request.target === "reader" ? host.reader : host.library;
    attachSkillRunnerToPane(host, pane);
    if (!isSkillRunnerSidebarRefreshCurrent(host, request)) {
      return;
    }
    await focusSkillRunnerWorkspace({
      runKey: request.runKey,
      selectionChanged: request.selectionChanged,
    });
  } catch (error) {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "assistant-shell",
      operation: "skillrunner-sidebar-refresh",
      phase: "error",
      stage: "background-refresh",
      message: "SkillRunner sidebar background refresh failed.",
      error,
    });
  }
}

function scheduleSkillRunnerSidebarRefresh(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  args?: {
    runKey?: string;
    selectionChanged?: boolean;
  },
) {
  if (host.activeTab !== "skillrunner" || host.activeTarget !== target) {
    return;
  }
  const existing = host.pendingSkillRunnerRefresh;
  const runKey =
    String(args?.runKey || "").trim() ||
    String(existing?.runKey || "").trim() ||
    undefined;
  host.skillRunnerRefreshGeneration += 1;
  host.pendingSkillRunnerRefresh = {
    target,
    runKey,
    selectionChanged:
      args?.selectionChanged === true || existing?.selectionChanged === true,
    generation: host.skillRunnerRefreshGeneration,
  };
  if (host.skillRunnerRefreshTimer) {
    return;
  }
  host.skillRunnerRefreshTimer = setTimeout(() => {
    host.skillRunnerRefreshTimer = null;
    const request = host.pendingSkillRunnerRefresh;
    host.pendingSkillRunnerRefresh = undefined;
    if (!request) {
      return;
    }
    void runSkillRunnerSidebarRefresh(host, request);
  }, 0);
}

async function handleShellAction(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  payload: Record<string, unknown>,
) {
  const action = String(payload.action || "").trim();
  if (action === "ready") {
    const pane = target === "reader" ? host.reader : host.library;
    if (host.activeTab === "skillrunner") {
      scheduleSkillRunnerSidebarRefresh(host, target, {
        selectionChanged: true,
      });
    } else if (host.activeTab === "acp-skills") {
      postAcpSkillRunSnapshot(host, pane, "init");
    } else {
      await postFreshAcpChatSnapshot(host, pane, target, "init");
    }
    return;
  }
  if (action === "set-tab") {
    const tab = normalizeTab(payload.tab);
    host.activeTab = tab;
    const pane = target === "reader" ? host.reader : host.library;
    postShellInit(pane, tab);
    if (tab === "skillrunner") {
      scheduleSkillRunnerSidebarRefresh(host, target, {
        selectionChanged: true,
      });
      return;
    }
    clearSkillRunnerSidebarRefresh(host);
    detachSkillRunnerSidebarHost({ hostWindow: host.win });
    if (tab === "acp-skills") {
      postAcpSkillRunSnapshot(host, pane);
      return;
    }
    await postFreshAcpChatSnapshot(host, pane, target);
    return;
  }
  if (action === "close-sidebar") {
    closeActiveSidebarHost(host);
  }
}

function normalizeTab(value: unknown): AssistantWorkspaceTab {
  const text = String(value || "").trim();
  if (text === "skillrunner" || text === "acp-skills" || text === "acp-chat") {
    return text;
  }
  return DEFAULT_TAB;
}

async function handleChildAction(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  payload: Record<string, unknown>,
) {
  const tab = normalizeTab(payload.tab);
  const action = String(payload.action || "").trim();
  const childPayload =
    payload.payload &&
    typeof payload.payload === "object" &&
    !Array.isArray(payload.payload)
      ? (payload.payload as Record<string, unknown>)
      : {};
  if (tab === "skillrunner") {
    const handledByHost = await createSkillRunnerHostActionHandler(host)({
      action,
      payload: childPayload,
    });
    if (handledByHost) {
      return;
    }
    await dispatchRunWorkspaceAction({
      type: "skillrunner-sidebar:action",
      action,
      payload: childPayload,
    });
    return;
  }
  if (tab === "acp-skills") {
    await handleAcpSkillRunAction(host, action, childPayload);
    postAcpSkillRunSnapshot(
      host,
      target === "reader" ? host.reader : host.library,
    );
    return;
  }
  await handleAcpChatAction(host, target, action, childPayload);
  postAcpChatSnapshot(
    host,
    target === "reader" ? host.reader : host.library,
    target,
  );
}

async function handleAcpSkillRunAction(
  host: AssistantWorkspaceHostRuntime,
  action: string,
  payload: Record<string, unknown>,
) {
  try {
    if (action === "ready") {
      return;
    }
    if (action === "select-run") {
      selectAcpSkillRun(String(payload.requestId || "").trim());
      return;
    }
    if (action === "cancel-run") {
      await cancelAcpSkillRun(String(payload.requestId || "").trim());
      return;
    }
    if (action === "interrupt-run-turn") {
      await interruptAcpSkillRunCurrentTurn(
        String(payload.requestId || "").trim(),
      );
      return;
    }
    if (action === "archive-run") {
      archiveAcpSkillRun(String(payload.requestId || "").trim());
      return;
    }
    if (action === "end-session") {
      await endAcpSkillRunSession(String(payload.requestId || "").trim());
      return;
    }
    if (action === "set-mode") {
      await setAcpSkillRunMode({
        requestId: String(payload.requestId || "").trim(),
        modeId: String(payload.modeId || "").trim(),
      });
      return;
    }
    if (action === "set-model") {
      await setAcpSkillRunModel({
        requestId: String(payload.requestId || "").trim(),
        modelId: String(payload.modelId || "").trim(),
      });
      return;
    }
    if (action === "set-reasoning-effort") {
      await setAcpSkillRunReasoningEffort({
        requestId: String(payload.requestId || "").trim(),
        effortId: String(payload.effortId || "").trim(),
      });
      return;
    }
    if (action === "resolve-permission") {
      resolveAcpSkillRunPermissionRequest({
        runRequestId: String(payload.requestId || "").trim(),
        permissionRequestId: String(payload.permissionRequestId || "").trim(),
        outcome:
          String(payload.outcome || "").trim() === "selected"
            ? "selected"
            : "cancelled",
        optionId: String(payload.optionId || "").trim(),
      });
      return;
    }
    if (action === "copy-request-id") {
      copyText(String(payload.requestId || "").trim());
      return;
    }
    if (action === "copy-diagnostics") {
      const requestId = String(payload.requestId || "").trim();
      const snapshot = buildAcpSkillRunPanelSnapshot({
        selectedRequestId: requestId,
      });
      copyText(JSON.stringify(snapshot, null, 2));
      return;
    }
    if (action === "open-backend-manager") {
      await openBackendManagerDialog({
        window: host.win,
        initialProviderType: "acp",
      });
      return;
    }
    if (action === "open-workspace") {
      openFolderInSystemFileManager(String(payload.workspaceDir || "").trim());
      return;
    }
    if (action === "reply-run") {
      await replyAcpSkillRun({
        requestId: String(payload.requestId || "").trim(),
        message: String(payload.message || ""),
      });
      return;
    }
    if (action === "connect-run") {
      await connectAcpSkillRun(String(payload.requestId || "").trim());
      return;
    }
    if (action === "disconnect-run") {
      await disconnectAcpSkillRun(String(payload.requestId || "").trim());
      return;
    }
    if (action === "close-sidebar") {
      closeActiveSidebarHost(host);
    }
  } catch (error) {
    host.win.alert?.(String(error));
  }
}

async function handleAcpChatAction(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  action: string,
  payload: Record<string, unknown>,
) {
  try {
    if (action === "ready") {
      return;
    }
    if (action === "set-active-backend") {
      const backendId = String(payload.backendId || "").trim();
      if (backendId) await setActiveAcpBackend({ backendId });
      return;
    }
    if (action === "set-active-conversation") {
      const conversationId = String(payload.conversationId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      if (!conversationId) return;
      if (backendId) await setActiveAcpBackend({ backendId });
      await setActiveAcpConversation({ conversationId, backendId });
      return;
    }
    if (action === "open-backend-manager") {
      await openBackendManagerDialog({
        window: host.win,
        initialProviderType: "acp",
      });
      return;
    }
    if (action === "close-sidebar") {
      closeActiveSidebarHost(host);
      return;
    }
    if (action === "new-conversation") {
      const backendId = String(payload.backendId || "").trim();
      await startNewAcpConversation({ backendId });
      return;
    }
    if (action === "rename-conversation") {
      const title = String(payload.title || "").trim();
      const conversationId = String(payload.conversationId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      if (title)
        await renameAcpConversation({ title, conversationId, backendId });
      return;
    }
    if (action === "archive-conversation") {
      const conversationId = String(payload.conversationId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      if (conversationId)
        await archiveAcpConversation({ conversationId, backendId });
      return;
    }
    if (action === "reconnect") {
      await reconnectAcpConversation();
      return;
    }
    if (action === "connect") {
      await connectAcpConversation({
        backendId: String(payload.backendId || "").trim(),
      });
      return;
    }
    if (action === "disconnect") {
      await disconnectAcpConversation({
        backendId: String(payload.backendId || "").trim(),
      });
      return;
    }
    if (action === "cancel") {
      await cancelAcpConversationPrompt();
      return;
    }
    if (action === "authenticate") {
      await authenticateAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        methodId: String(payload.methodId || "").trim(),
      });
      return;
    }
    if (action === "resolve-permission") {
      await resolveAcpConversationPermission({
        outcome:
          String(payload.outcome || "").trim() === "selected"
            ? "selected"
            : "cancelled",
        optionId: String(payload.optionId || "").trim(),
      });
      return;
    }
    if (action === "set-mode") {
      const modeId = String(payload.modeId || "").trim();
      if (modeId) await setAcpConversationMode({ modeId });
      return;
    }
    if (action === "set-model") {
      const modelId = String(payload.modelId || "").trim();
      if (modelId) await setAcpConversationModel({ modelId });
      return;
    }
    if (action === "set-reasoning-effort") {
      const effortId = String(payload.effortId || "").trim();
      if (effortId) await setAcpConversationReasoningEffort({ effortId });
      return;
    }
    if (action === "toggle-diagnostics") {
      toggleAcpConversationDiagnostics({
        visible:
          typeof payload.visible === "boolean"
            ? Boolean(payload.visible)
            : undefined,
      });
      return;
    }
    if (action === "toggle-status-details") {
      toggleAcpConversationStatusDetails({
        expanded:
          typeof payload.expanded === "boolean"
            ? Boolean(payload.expanded)
            : undefined,
      });
      return;
    }
    if (action === "set-chat-display-mode") {
      setAcpConversationChatDisplayMode({
        mode:
          String(payload.mode || "").trim() === "bubble" ? "bubble" : "plain",
      });
      return;
    }
    if (action === "copy-diagnostics") {
      copyText(JSON.stringify(buildAcpDiagnosticsBundle(), null, 2));
      toggleAcpConversationDiagnostics({ visible: true });
      return;
    }
    if (action === "open-workspace") {
      openFolderInSystemFileManager(String(payload.workspaceDir || "").trim());
      return;
    }
    if (action === "send-prompt") {
      const message = String(payload.message || "").trim();
      if (!message) return;
      await sendAcpConversationPrompt({
        message,
        hostContext: buildAcpHostContext({ window: host.win, target }),
      });
    }
  } catch (error) {
    host.win.alert?.(String(error));
  }
}

function attachSkillRunnerToPane(
  host: AssistantWorkspaceHostRuntime,
  pane: MountedSidebarPane,
) {
  if (host.activeTab !== "skillrunner" || !host.activeTarget) {
    return;
  }
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return;
  }
  pane.frameWindow = frameWindow;
  attachSkillRunnerSidebarHost({
    hostWindow: host.win,
    frameWindow,
    alertWindow: host.win,
    focusHost: () => host.win.focus(),
    isHostAlive: () => hosts.get(host.win) === host,
    decorateSnapshot: (snapshot) =>
      buildDecoratedSkillRunnerSnapshot(host, snapshot),
    handleHostAction: createSkillRunnerHostActionHandler(host),
  });
}

function mountLibraryPane(host: AssistantWorkspaceHostRuntime) {
  const roots = getLibraryRoots(host.win);
  if (!roots.itemPane || !roots.sidenav || host.library.container) {
    return;
  }
  const doc = host.win.document;
  const button = buildSidebarButton(
    doc,
    host.win,
    `${config.addonRef}-library-assistant-workspace-mode`,
    localize("task-dashboard-sidebar-assistant", "Assistant"),
  );
  button.addEventListener("command", () => {
    void openAssistantWorkspaceSidebar({ window: host.win });
  });
  roots.sidenav.appendChild(button);

  const container = createSidebarContainer(doc);
  applySidebarPaneContainerStyles(container);
  const frame = createSidebarFrame(doc, resolveSidebarPageUrl());
  container.appendChild(frame);
  roots.itemPane.insertBefore(container, roots.sidenav);
  const frameLoadHandler = () => {
    host.library.frameWindow = resolveSidebarFrameWindow(frame);
    if (host.activeTarget === "library") {
      installShellBridge(host, host.library, "library");
      postShellInit(host.library, host.activeTab);
      if (host.activeTab === "skillrunner") {
        scheduleSkillRunnerSidebarRefresh(host, "library", {
          selectionChanged: true,
        });
      } else if (host.activeTab === "acp-skills") {
        postAcpSkillRunSnapshot(host, host.library, "init");
      } else {
        void postFreshAcpChatSnapshot(host, host.library, "library", "init");
      }
    }
  };
  frame.addEventListener("load", frameLoadHandler);
  roots.sidenav.addEventListener(
    "click",
    (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target === button || target.closest(`#${button.id}`)) {
        return;
      }
      if (host.activeTarget === "library") deactivateTarget(host, "library");
    },
    true,
  );
  host.library = {
    button,
    container,
    frame,
    frameWindow: resolveSidebarFrameWindow(frame),
    frameLoadHandler,
  };
}

function mountReaderPane(host: AssistantWorkspaceHostRuntime) {
  const roots = getReaderRoots(host.win);
  if (
    !roots.contextPane ||
    !roots.contextInner ||
    !roots.sidenav ||
    host.reader.container
  ) {
    return;
  }
  const doc = host.win.document;
  const button = buildSidebarButton(
    doc,
    host.win,
    `${config.addonRef}-reader-assistant-workspace-mode`,
    localize("task-dashboard-sidebar-assistant", "Assistant"),
  );
  button.addEventListener("command", () => {
    void openAssistantWorkspaceSidebar({ window: host.win });
  });
  roots.sidenav.appendChild(button);

  const container = createSidebarContainer(doc);
  applySidebarPaneContainerStyles(container);
  const frame = createSidebarFrame(doc, resolveSidebarPageUrl());
  container.appendChild(frame);
  roots.contextInner.parentElement?.insertBefore(container, roots.contextInner);
  const frameLoadHandler = () => {
    host.reader.frameWindow = resolveSidebarFrameWindow(frame);
    if (host.activeTarget === "reader") {
      installShellBridge(host, host.reader, "reader");
      postShellInit(host.reader, host.activeTab);
      if (host.activeTab === "skillrunner") {
        scheduleSkillRunnerSidebarRefresh(host, "reader", {
          selectionChanged: true,
        });
      } else if (host.activeTab === "acp-skills") {
        postAcpSkillRunSnapshot(host, host.reader, "init");
      } else {
        void postFreshAcpChatSnapshot(host, host.reader, "reader", "init");
      }
    }
  };
  frame.addEventListener("load", frameLoadHandler);
  roots.sidenav.addEventListener(
    "click",
    (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target === button || target.closest(`#${button.id}`)) {
        return;
      }
      if (host.activeTarget === "reader") deactivateTarget(host, "reader");
    },
    true,
  );
  host.reader = {
    button,
    container,
    frame,
    frameWindow: resolveSidebarFrameWindow(frame),
    frameLoadHandler,
  };
}

async function activateTarget(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  const libraryRoots = getLibraryRoots(host.win);
  const readerRoots = getReaderRoots(host.win);
  installMessageBridge(host);
  if (
    host.activeTab === "skillrunner" &&
    host.activeTarget &&
    host.activeTarget !== target
  ) {
    clearSkillRunnerSidebarRefresh(host);
    detachSkillRunnerSidebarHost({ hostWindow: host.win });
  }
  if (target === "library") {
    if (!ensureLibraryPaneExpanded(host.win)) return false;
    const frameWindow = await waitForPaneFrameWindow(host.library);
    if (!frameWindow) return false;
    host.library.frameWindow = frameWindow;
    installShellBridge(host, host.library, "library");
    deactivateTarget(host, "reader");
    (libraryRoots.defaultDeck as Element | null)?.setAttribute(
      "hidden",
      "true",
    );
    setSidebarContainerVisible(host.library.container, true);
    setButtonSelected(host.library.button, true);
    host.activeTarget = "library";
    postShellInit(host.library, host.activeTab);
    if (host.activeTab === "skillrunner") {
      scheduleSkillRunnerSidebarRefresh(host, "library", {
        selectionChanged: true,
      });
    } else if (host.activeTab === "acp-skills") {
      postAcpSkillRunSnapshot(host, host.library, "init");
    } else {
      await postFreshAcpChatSnapshot(host, host.library, "library", "init");
    }
    return true;
  }
  if (!ensureReaderPaneExpanded(host.win)) return false;
  const frameWindow = await waitForPaneFrameWindow(host.reader);
  if (!frameWindow) return false;
  host.reader.frameWindow = frameWindow;
  installShellBridge(host, host.reader, "reader");
  deactivateTarget(host, "library");
  (readerRoots.contextInner as Element | null)?.setAttribute("hidden", "true");
  setSidebarContainerVisible(host.reader.container, true);
  setButtonSelected(host.reader.button, true);
  host.activeTarget = "reader";
  postShellInit(host.reader, host.activeTab);
  if (host.activeTab === "skillrunner") {
    scheduleSkillRunnerSidebarRefresh(host, "reader", {
      selectionChanged: true,
    });
  } else if (host.activeTab === "acp-skills") {
    postAcpSkillRunSnapshot(host, host.reader, "init");
  } else {
    await postFreshAcpChatSnapshot(host, host.reader, "reader", "init");
  }
  return true;
}

export function installAssistantWorkspaceSidebarShell(
  win: _ZoteroTypes.MainWindow,
) {
  const existing = hosts.get(win);
  if (existing) {
    return existing;
  }
  const host: AssistantWorkspaceHostRuntime = {
    win,
    activeTarget: null,
    activeTab: DEFAULT_TAB,
    drawerOpen: false,
    drawerCompletedCollapsed: true,
    scopeKey: createAssistantSidebarScopeKey("assistant-sidebar-workspace"),
    snapshotRevision: 0,
    skillRunnerRefreshGeneration: 0,
    library: { button: null, container: null, frame: null, frameWindow: null },
    reader: { button: null, container: null, frame: null, frameWindow: null },
    lastAcpSkillWaitingToastKeys: new Set<string>(),
  };
  mountLibraryPane(host);
  mountReaderPane(host);
  host.removeAcpSnapshotSubscription = subscribeAcpFrontendSnapshots(() => {
    schedulePostSnapshot(host);
  });
  host.removeAcpSkillRunSubscription = subscribeAcpSkillRunSnapshots(() => {
    maybeShowAcpSkillWaitingToasts(host);
    schedulePostSnapshot(host);
    updateAssistantAttentionIndicator(host);
  });
  host.removeTaskSubscription = subscribeWorkflowTaskChanges(() => {
    updateAssistantAttentionIndicator(host);
  });
  updateAssistantAttentionIndicator(host);
  hosts.set(win, host);
  return host;
}

export function removeAssistantWorkspaceSidebarShell(
  win: _ZoteroTypes.MainWindow | Window,
) {
  const typedWin = win as _ZoteroTypes.MainWindow;
  const host = hosts.get(typedWin);
  if (!host) return;
  host.removeMessageListener?.();
  host.removeAcpSnapshotSubscription?.();
  host.removeAcpSkillRunSubscription?.();
  host.removeTaskSubscription?.();
  detachSkillRunnerSidebarHost({ hostWindow: win as Window });
  if (host.postSnapshotTimer) {
    clearTimeout(host.postSnapshotTimer);
    host.postSnapshotTimer = null;
  }
  clearSkillRunnerSidebarRefresh(host);
  if (host.library.frame && host.library.frameLoadHandler) {
    host.library.frame.removeEventListener(
      "load",
      host.library.frameLoadHandler,
    );
  }
  if (host.reader.frame && host.reader.frameLoadHandler) {
    host.reader.frame.removeEventListener("load", host.reader.frameLoadHandler);
  }
  clearShellBridge(host.library);
  clearShellBridge(host.reader);
  host.library.button?.remove();
  host.library.container?.remove();
  host.reader.button?.remove();
  host.reader.container?.remove();
  hosts.delete(typedWin);
}

export async function openAssistantWorkspaceSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
  tab?: AssistantWorkspaceTab;
  backend?: BackendInstance;
  requestId?: string;
  runKey?: string;
  target?: AcpSidebarTarget;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) return false;
  const host = installAssistantWorkspaceSidebarShell(win);
  if (args && "tab" in args && args.tab) {
    host.activeTab = normalizeTab(args.tab);
    if (host.activeTab !== "skillrunner") {
      clearSkillRunnerSidebarRefresh(host);
      detachSkillRunnerSidebarHost({ hostWindow: host.win });
    }
    postActiveShellInit(host);
  }
  if (host.activeTab === "acp-skills" && args?.requestId) {
    selectAcpSkillRun(args.requestId);
  }
  const target = args?.target || resolvePreferredTarget(win);
  const activated = await activateTarget(host, target);
  if (activated && host.activeTab === "skillrunner") {
    scheduleSkillRunnerSidebarRefresh(host, target, {
      runKey: args?.runKey,
      selectionChanged: true,
    });
  }
  if (activated) {
    postShellInit(
      target === "reader" ? host.reader : host.library,
      host.activeTab,
    );
  }
  return activated;
}

export function closeAssistantWorkspaceSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) return false;
  const host = hosts.get(win);
  if (!host) return false;
  return closeActiveSidebarHost(host);
}

export function isAssistantWorkspaceSidebarOpen(args?: {
  window?: _ZoteroTypes.MainWindow;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) return false;
  return !!hosts.get(win)?.activeTarget;
}

export async function toggleAssistantWorkspaceSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
  tab?: AssistantWorkspaceTab;
  target?: AcpSidebarTarget;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) return false;
  const host = installAssistantWorkspaceSidebarShell(win);
  if (host.activeTarget) {
    if (args?.tab) {
      const requestedTab = normalizeTab(args.tab);
      if (requestedTab !== host.activeTab) {
        host.activeTab = requestedTab;
        const pane =
          host.activeTarget === "reader" ? host.reader : host.library;
        postShellInit(pane, host.activeTab);
        if (host.activeTab === "skillrunner") {
          scheduleSkillRunnerSidebarRefresh(host, host.activeTarget, {
            selectionChanged: true,
          });
        } else {
          clearSkillRunnerSidebarRefresh(host);
          detachSkillRunnerSidebarHost({ hostWindow: host.win });
          if (host.activeTab === "acp-skills") {
            postAcpSkillRunSnapshot(host, pane);
          } else {
            postAcpChatSnapshot(host, pane, host.activeTarget);
          }
        }
        return true;
      }
    }
    if (args?.target && host.activeTarget !== args.target) {
      await activateTarget(host, args.target);
      return true;
    }
    closeActiveSidebarHost(host);
    return false;
  }
  await openAssistantWorkspaceSidebar({
    window: win,
    tab: args?.tab,
    target: args?.target,
  });
  return true;
}

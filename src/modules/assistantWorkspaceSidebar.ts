import { config } from "../../package.json";
import { ACP_OPENCODE_DISPLAY_NAME } from "../config/defaults";
import type { BackendInstance } from "../backends/types";
import { getStringOrFallback } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { copyText } from "../utils/ztoolkit";
import {
  SKILLRUNNER_ICON_URI,
  applyToolbarButtonStyling,
  syncToolbarButtonIconFill,
  updateSkillRunnerToolbarButtonBadge,
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
  replyAcpSkillRun,
  resolveAcpSkillRunPermissionRequest,
  selectAcpSkillRun,
  subscribeAcpSkillRunSnapshots,
} from "./acpSkillRunStore";
import {
  attachSkillRunnerSidebarHost,
  dispatchRunWorkspaceAction,
  focusSkillRunnerWorkspace,
  type RunWorkspaceSnapshot,
} from "./skillRunnerRunDialog";
import {
  buildSkillRunnerSidebarSections,
  countWaitingSkillRunnerTasks,
} from "./skillRunnerSidebarModel";
import { appendRuntimeLog } from "./runtimeLogManager";
import { listActiveWorkflowTasks, subscribeWorkflowTasks } from "./taskRuntime";
import { normalizeStatus } from "./skillRunnerProviderStateMachine";
import {
  applySidebarPaneContainerStyles,
  createSidebarContainer,
  createSidebarFrame,
  resolveSidebarFrameWindow,
  setSidebarContainerVisible,
} from "./sidebarBrowserHost";

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
  library: MountedSidebarPane;
  reader: MountedSidebarPane;
  removeMessageListener?: () => void;
  removeAcpSnapshotSubscription?: () => void;
  removeAcpSkillRunSubscription?: () => void;
  removeTaskSubscription?: () => void;
  postSnapshotTimer?: ReturnType<typeof setTimeout> | null;
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

const hosts = new WeakMap<_ZoteroTypes.MainWindow, AssistantWorkspaceHostRuntime>();
const FRAME_WINDOW_WAIT_TIMEOUT_MS = 2000;
const DEFAULT_TAB: AssistantWorkspaceTab = "acp-chat";
const ASSISTANT_WORKSPACE_BRIDGE_KEY = "__zsAssistantWorkspaceBridge";
const localize = getStringOrFallback;

function resolveSidebarPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/dashboard/assistant-workspace.html`;
}

function resolvePreferredTarget(win: _ZoteroTypes.MainWindow): AcpSidebarTarget {
  return String((win as any).Zotero_Tabs?.selectedType || "").trim() === "reader"
    ? "reader"
    : "library";
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
  const sidenav = itemPane?.querySelector("#zotero-view-item-sidenav") as
    | XULElement
    | null;
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
  button.setAttribute("tooltiptext", label);
  button.setAttribute("aria-label", label);
  button.setAttribute("image", SKILLRUNNER_ICON_URI);
  applyToolbarButtonStyling(button as Element & { style?: CSSStyleDeclaration }, SKILLRUNNER_ICON_URI, 26);
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

function setButtonSelected(button: SidebarButtonElement | null, selected: boolean) {
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

function setButtonBadge(button: SidebarButtonElement | null, waitingCount: number) {
  if (!button) {
    return;
  }
  if (waitingCount > 0) {
    button.setAttribute("data-badge", String(waitingCount));
  } else {
    button.removeAttribute("data-badge");
  }
}

function countWaitingTasks() {
  return listActiveWorkflowTasks().filter((task) => {
    const normalized = normalizeStatus(task.state, "running");
    return normalized === "waiting_user" || normalized === "waiting_auth";
  }).length;
}

function updateSidebarBadges(host: AssistantWorkspaceHostRuntime) {
  const waitingCount = countWaitingTasks();
  setButtonBadge(host.library.button, waitingCount);
  setButtonBadge(host.reader.button, waitingCount);
  updateSkillRunnerToolbarButtonBadge(host.win, waitingCount);
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
    (readerRoots.contextInner as Element | null)?.removeAttribute("hidden");
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
  return {
    ...snapshot,
    hostMode: "sidebar",
    drawer: {
      open: host.drawerOpen,
      sections: sections.map((section) => ({
        id: section.id,
        title:
          section.id === "completed"
            ? localize("task-dashboard-run-completed-tasks-title", "Completed")
            : localize("task-dashboard-run-running-tasks-title", "Running"),
        collapsed: section.collapsed,
        groups: section.groups,
      })),
    },
    badges: {
      waitingCount: countWaitingSkillRunnerTasks(groups),
    },
  };
}

function createSkillRunnerHostActionHandler(host: AssistantWorkspaceHostRuntime) {
  return async (envelope: { action?: string; payload?: Record<string, unknown> }) => {
    const action = String(envelope.action || "").trim();
    if (action === "toggle-drawer") {
      host.drawerOpen = !host.drawerOpen;
      await focusSkillRunnerWorkspace();
      return true;
    }
    if (action === "close-drawer") {
      host.drawerOpen = false;
      await focusSkillRunnerWorkspace();
      return true;
    }
    if (action === "toggle-drawer-section") {
      const sectionId = String(envelope.payload?.sectionId || "").trim();
      if (sectionId === "completed") {
        host.drawerCompletedCollapsed = !host.drawerCompletedCollapsed;
        await focusSkillRunnerWorkspace();
        return true;
      }
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
  pane: MountedSidebarPane,
  tab: AssistantWorkspaceTab,
  phase: "init" | "snapshot",
  snapshot: Record<string, unknown>,
) {
  postShellMessage(pane, "assistant-workspace:child-snapshot", {
    tab,
    phase,
    snapshot,
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
  pane: MountedSidebarPane,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "snapshot",
) {
  postChildSnapshot(pane, "acp-chat", phase, buildAcpSnapshot(target));
}

function postAcpSkillRunSnapshot(
  pane: MountedSidebarPane,
  phase: "init" | "snapshot" = "snapshot",
) {
  postChildSnapshot(
    pane,
    "acp-skills",
    phase,
    buildAcpSkillRunPanelSnapshot() as unknown as Record<string, unknown>,
  );
}

async function postFreshAcpChatSnapshot(
  pane: MountedSidebarPane,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "snapshot",
) {
  await refreshAcpConversationBackends();
  postAcpChatSnapshot(pane, target, phase);
}

function postShellInit(
  pane: MountedSidebarPane,
  activeTab: AssistantWorkspaceTab,
) {
  postShellMessage(pane, "assistant-workspace:init", { activeTab });
}

function postAllSnapshots(host: AssistantWorkspaceHostRuntime) {
  const target = host.activeTarget;
  if (!target) {
    return;
  }
  const pane = target === "reader" ? host.reader : host.library;
  postAcpChatSnapshot(pane, target);
  postAcpSkillRunSnapshot(pane);
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
    const message = error instanceof Error ? error.message : String(error || "unknown error");
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

async function handleShellAction(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  payload: Record<string, unknown>,
) {
  const action = String(payload.action || "").trim();
  if (action === "ready") {
    await postFreshAcpChatSnapshot(
      target === "reader" ? host.reader : host.library,
      target,
      "init",
    );
    postAcpSkillRunSnapshot(target === "reader" ? host.reader : host.library, "init");
    return;
  }
  if (action === "set-tab") {
    const tab = normalizeTab(payload.tab);
    host.activeTab = tab;
    postShellInit(target === "reader" ? host.reader : host.library, tab);
    if (tab === "skillrunner") {
      await focusSkillRunnerWorkspace({ selectionChanged: true });
    }
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
    payload.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)
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
    postAcpSkillRunSnapshot(target === "reader" ? host.reader : host.library);
    return;
  }
  await handleAcpChatAction(host, target, action, childPayload);
  postAcpChatSnapshot(target === "reader" ? host.reader : host.library, target);
}

function openFolderInSystemFileManager(pathValue: string) {
  const normalizedPath = String(pathValue || "").trim();
  if (!normalizedPath) {
    throw new Error("workspace path is empty");
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
    throw new Error(`failed to resolve workspace path: ${normalizedPath}`);
  }
  if (typeof file.exists === "function" && !file.exists()) {
    throw new Error(`workspace path does not exist: ${normalizedPath}`);
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
    if (action === "archive-run") {
      archiveAcpSkillRun(String(payload.requestId || "").trim());
      return;
    }
    if (action === "end-session") {
      await endAcpSkillRunSession(String(payload.requestId || "").trim());
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
      const snapshot = buildAcpSkillRunPanelSnapshot({ selectedRequestId: requestId });
      copyText(JSON.stringify(snapshot, null, 2));
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
      await openBackendManagerDialog({ window: host.win });
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
      if (title) await renameAcpConversation({ title, conversationId, backendId });
      return;
    }
    if (action === "archive-conversation") {
      const conversationId = String(payload.conversationId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      if (conversationId) await archiveAcpConversation({ conversationId, backendId });
      return;
    }
    if (action === "reconnect") {
      await reconnectAcpConversation();
      return;
    }
    if (action === "connect") {
      await connectAcpConversation({ backendId: String(payload.backendId || "").trim() });
      return;
    }
    if (action === "disconnect") {
      await disconnectAcpConversation({ backendId: String(payload.backendId || "").trim() });
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
        outcome: String(payload.outcome || "").trim() === "selected" ? "selected" : "cancelled",
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
        visible: typeof payload.visible === "boolean" ? Boolean(payload.visible) : undefined,
      });
      return;
    }
    if (action === "toggle-status-details") {
      toggleAcpConversationStatusDetails({
        expanded: typeof payload.expanded === "boolean" ? Boolean(payload.expanded) : undefined,
      });
      return;
    }
    if (action === "set-chat-display-mode") {
      setAcpConversationChatDisplayMode({
        mode: String(payload.mode || "").trim() === "bubble" ? "bubble" : "plain",
      });
      return;
    }
    if (action === "copy-diagnostics") {
      copyText(JSON.stringify(buildAcpDiagnosticsBundle(), null, 2));
      toggleAcpConversationDiagnostics({ visible: true });
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

async function attachSkillRunnerToPane(
  host: AssistantWorkspaceHostRuntime,
  pane: MountedSidebarPane,
) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return;
  }
  pane.frameWindow = frameWindow;
  await attachSkillRunnerSidebarHost({
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
      void attachSkillRunnerToPane(host, host.library);
      void postFreshAcpChatSnapshot(host.library, "library", "init");
      postAcpSkillRunSnapshot(host.library, "init");
    }
  };
  frame.addEventListener("load", frameLoadHandler);
  roots.sidenav.addEventListener(
    "click",
    (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target === button || target.closest(`#${button.id}`)) return;
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
  if (!roots.contextPane || !roots.contextInner || !roots.sidenav || host.reader.container) {
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
      void attachSkillRunnerToPane(host, host.reader);
      void postFreshAcpChatSnapshot(host.reader, "reader", "init");
      postAcpSkillRunSnapshot(host.reader, "init");
    }
  };
  frame.addEventListener("load", frameLoadHandler);
  roots.sidenav.addEventListener(
    "click",
    (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target === button || target.closest(`#${button.id}`)) return;
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
  if (target === "library") {
    if (!ensureLibraryPaneExpanded(host.win)) return false;
    const frameWindow = await waitForPaneFrameWindow(host.library);
    if (!frameWindow) return false;
    host.library.frameWindow = frameWindow;
    installShellBridge(host, host.library, "library");
    deactivateTarget(host, "reader");
    (libraryRoots.defaultDeck as Element | null)?.setAttribute("hidden", "true");
    setSidebarContainerVisible(host.library.container, true);
    setButtonSelected(host.library.button, true);
    host.activeTarget = "library";
    postShellInit(host.library, host.activeTab);
    await attachSkillRunnerToPane(host, host.library);
    await postFreshAcpChatSnapshot(host.library, "library", "init");
    postAcpSkillRunSnapshot(host.library, "init");
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
  await attachSkillRunnerToPane(host, host.reader);
  await postFreshAcpChatSnapshot(host.reader, "reader", "init");
  postAcpSkillRunSnapshot(host.reader, "init");
  return true;
}

export function installAssistantWorkspaceSidebarShell(win: _ZoteroTypes.MainWindow) {
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
    library: { button: null, container: null, frame: null, frameWindow: null },
    reader: { button: null, container: null, frame: null, frameWindow: null },
  };
  mountLibraryPane(host);
  mountReaderPane(host);
  host.removeAcpSnapshotSubscription = subscribeAcpFrontendSnapshots(() => {
    schedulePostSnapshot(host);
  });
  host.removeAcpSkillRunSubscription = subscribeAcpSkillRunSnapshots(() => {
    schedulePostSnapshot(host);
  });
  host.removeTaskSubscription = subscribeWorkflowTasks(() => {
    updateSidebarBadges(host);
  });
  updateSidebarBadges(host);
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
  if (host.postSnapshotTimer) {
    clearTimeout(host.postSnapshotTimer);
    host.postSnapshotTimer = null;
  }
  if (host.library.frame && host.library.frameLoadHandler) {
    host.library.frame.removeEventListener("load", host.library.frameLoadHandler);
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
  updateSkillRunnerToolbarButtonBadge(typedWin, 0);
  hosts.delete(typedWin);
}

export async function openAssistantWorkspaceSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
  tab?: AssistantWorkspaceTab;
  backend?: BackendInstance;
  requestId?: string;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) return false;
  const host = installAssistantWorkspaceSidebarShell(win);
  host.activeTab = normalizeTab(args?.tab || host.activeTab);
  if (host.activeTab === "acp-skills" && args?.requestId) {
    selectAcpSkillRun(args.requestId);
  }
  const target = resolvePreferredTarget(win);
  const activated = await activateTarget(host, target);
  if (activated && host.activeTab === "skillrunner") {
    await focusSkillRunnerWorkspace({
      backend: args?.backend,
      requestId: args?.requestId,
      selectionChanged: true,
    });
  }
  if (activated) {
    postShellInit(target === "reader" ? host.reader : host.library, host.activeTab);
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

export async function toggleAssistantWorkspaceSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
  tab?: AssistantWorkspaceTab;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) return false;
  const host = installAssistantWorkspaceSidebarShell(win);
  if (host.activeTarget) {
    closeActiveSidebarHost(host);
    return false;
  }
  await openAssistantWorkspaceSidebar({ window: win, tab: args?.tab });
  return true;
}

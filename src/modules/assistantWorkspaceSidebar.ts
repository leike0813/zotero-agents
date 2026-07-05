import { config } from "../../package.json";
import { ACP_OPENCODE_DISPLAY_NAME } from "../config/defaults";
import type { BackendInstance } from "../backends/types";
import { getStringOrFallback } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { copyText } from "../utils/ztoolkit";
import { openFolderInSystemFileManager } from "../utils/fileSystem";
import {
  isAssistantStreamingRenderEnabled,
  setAssistantStreamingRenderEnabled,
  subscribeAssistantStreamingRenderPreference,
} from "./assistantStreamingRenderPreference";
import { isAssistantTranscriptPaginationVirtualizationEnabled } from "./assistantTranscriptRenderingPreference";
import {
  SKILLRUNNER_ICON_URI,
  applyToolbarButtonStyling,
  syncToolbarButtonIconFill,
  updateAssistantToolbarAttention,
} from "./dashboardToolbarButton";
import { buildAcpHostContext } from "./acpContextBuilder";
import {
  isPureAcpChatBackgroundChange,
  prepareAcpChatPanelSnapshot,
  resolveActiveAcpChatTranscriptPageRequest,
  shouldRefreshAcpChatSnapshotForChange,
  type AcpChatTranscriptPageRequest,
} from "./acpChatPanelReadModel";
import {
  authenticateAcpConversation,
  archiveAcpConversation,
  buildAcpDiagnosticsBundle,
  cancelAcpConversationPrompt,
  connectAcpConversation,
  disconnectAcpConversation,
  refreshAcpConversationBackends,
  reconnectAcpConversation,
  renameAcpConversation,
  resolveAcpConversationPermission,
  sendAcpConversationPrompt,
  setActiveAcpBackend,
  setActiveAcpConversation,
  setAcpConversationAutoApprovePermissions,
  setAcpConversationChatDisplayMode,
  setAcpConversationMode,
  setAcpConversationModel,
  setAcpConversationReasoningEffort,
  startNewAcpConversation,
  subscribeAcpChatPanelSnapshots,
  subscribeAcpFrontendSnapshots,
  toggleAcpConversationDiagnostics,
  toggleAcpConversationStatusDetails,
} from "./acpSessionManager";
import { openBackendManagerDialog } from "./backendManager";
import type { AcpSidebarTarget } from "./acpTypes";
import {
  type AcpSkillRunSnapshotChange,
  archiveAcpSkillRun,
  cancelAcpSkillRun,
  connectAcpSkillRun,
  disconnectAcpSkillRun,
  endAcpSkillRunSession,
  getSelectedAcpSkillRunRequestId,
  interruptAcpSkillRunCurrentTurn,
  listAcpSkillRunSummaries,
  prepareAcpSkillRunPanelSnapshot,
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
  refreshSkillRunnerSidebarHostSnapshot,
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
type AssistantWorkspaceLogTab = AssistantWorkspaceTab | "shell";
type SidebarButtonElement = XULElement | Element;

type MountedSidebarDock = {
  button: SidebarButtonElement | null;
  container: XULElement | null;
};
type AssistantWorkspaceShell = {
  frame: Element | null;
  frameWindow: Window | null;
  bridge?: AssistantWorkspaceBridge | null;
  bridgeWindow?: Window | null;
  frameLoadHandler?: () => void;
  loaded: boolean;
  ready: boolean;
};
type AssistantWorkspaceHostRuntime = {
  win: _ZoteroTypes.MainWindow;
  activeTarget: AcpSidebarTarget | null;
  activeTab: AssistantWorkspaceTab;
  drawerOpen: boolean;
  drawerCompletedCollapsed: boolean;
  latestSkillRunnerBaseSnapshot?: RunWorkspaceSnapshot | null;
  latestSkillRunnerSnapshot?: RunWorkspaceSnapshot | null;
  skillRunnerAttachedFrameWindow?: Window | null;
  library: MountedSidebarDock;
  reader: MountedSidebarDock;
  shell: AssistantWorkspaceShell;
  removeMessageListener?: () => void;
  removeAcpSnapshotSubscription?: () => void;
  removeAcpChatPanelSubscription?: () => void;
  removeAcpSkillRunSubscription?: () => void;
  removeTaskSubscription?: () => void;
  removeStreamingRenderPreferenceSubscription?: () => void;
  postSnapshotTimer?: ReturnType<typeof setTimeout> | null;
  shellHandshakeTimer?: ReturnType<typeof setTimeout> | null;
  shellHandshakeAttempt: number;
  acpChatBackendRefreshTimer?: ReturnType<typeof setTimeout> | null;
  acpChatBackendRefreshInFlight: boolean;
  acpChatBackendRefreshRepostQueued: boolean;
  skillRunnerRefreshTimer?: ReturnType<typeof setTimeout> | null;
  skillRunnerRefreshGeneration: number;
  pendingSkillRunnerRefresh?: SkillRunnerSidebarRefreshRequest;
  scopeKey: string;
  snapshotRevision: number;
  acpChatSnapshotBuildSeq: number;
  acpSkillRunSnapshotBuildSeq: number;
  publishedWorkspaceInitScopeKey?: string | null;
  publishedChildInitScopeKeys: Set<string>;
  streamingRenderPreferenceInitialized: boolean;
  streamingRenderPreferenceLocalWriteDepth: number;
  lastAcpSkillRunSnapshotSignature?: string | null;
  lastAcpSkillWaitingToastKeys: Set<string>;
  readyTabs: Set<AssistantWorkspaceTab>;
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
type AcpChatSnapshotPostOptions = {
  transcriptPage?: AcpChatTranscriptPageRequest;
};
type AcpSkillRunSnapshotPostOptions = {
  force?: boolean;
  transcriptPage?: {
    requestId?: string;
    cursor?: number;
    limit?: number;
  };
};

const hosts = new WeakMap<
  _ZoteroTypes.MainWindow,
  AssistantWorkspaceHostRuntime
>();
const FRAME_WINDOW_WAIT_TIMEOUT_MS = 2000;
const SHELL_HANDSHAKE_INTERVAL_MS = 500;
const DEFAULT_TAB: AssistantWorkspaceTab = "acp-chat";
const ASSISTANT_WORKSPACE_TABS: AssistantWorkspaceTab[] = [
  "acp-chat",
  "acp-skills",
  "skillrunner",
];
const ASSISTANT_WORKSPACE_BRIDGE_KEY = "__zsAssistantWorkspaceBridge";
const localize = getStringOrFallback;

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function summarizeAcpChatPanelSnapshot(snapshot: Record<string, unknown>) {
  const page =
    snapshot.selectedTranscriptPage &&
    typeof snapshot.selectedTranscriptPage === "object"
      ? (snapshot.selectedTranscriptPage as Record<string, unknown>)
      : null;
  const transcriptState =
    snapshot.transcriptState && typeof snapshot.transcriptState === "object"
      ? (snapshot.transcriptState as Record<string, unknown>)
      : null;
  return {
    backendAvailability: String(snapshot.backendAvailability || ""),
    conversationAvailability: String(snapshot.conversationAvailability || ""),
    activeBackendId: String(
      snapshot.activeBackendId || snapshot.backendId || "",
    ),
    activeConversationId: String(
      snapshot.activeConversationId || snapshot.conversationId || "",
    ),
    status: String(snapshot.status || ""),
    backendOptions: countArray(snapshot.backendOptions),
    chatSessions: countArray(snapshot.chatSessions),
    backendChatSessions: countArray(snapshot.backendChatSessions),
    transcriptPaginationVirtualizationEnabled:
      snapshot.transcriptPaginationVirtualizationEnabled === true,
    streamingRenderEnabled: snapshot.streamingRenderEnabled !== false,
    selectedTranscriptPage: page
      ? {
          requestId: String(page.requestId || ""),
          cursor: Number(page.cursor || 0),
          total: Number(page.total || 0),
          items: countArray(page.items),
        }
      : null,
    transcriptState: transcriptState
      ? {
          backendId: String(transcriptState.backendId || ""),
          conversationId: String(transcriptState.conversationId || ""),
          state: String(transcriptState.state || ""),
        }
      : null,
  };
}

function summarizeChildSnapshot(
  tab: AssistantWorkspaceTab,
  snapshot: Record<string, unknown>,
) {
  if (tab === "acp-chat") {
    return summarizeAcpChatPanelSnapshot(snapshot);
  }
  if (tab === "acp-skills") {
    const selectedRun =
      snapshot.selectedRun && typeof snapshot.selectedRun === "object"
        ? (snapshot.selectedRun as Record<string, unknown>)
        : null;
    const page =
      snapshot.selectedTranscriptPage &&
      typeof snapshot.selectedTranscriptPage === "object"
        ? (snapshot.selectedTranscriptPage as Record<string, unknown>)
        : null;
    return {
      selectedRequestId: String(snapshot.selectedRequestId || ""),
      selectedRunRequestId: String(selectedRun?.requestId || ""),
      selectedRunStatus: String(selectedRun?.status || ""),
      runs: countArray(snapshot.runs),
      transcriptPaginationVirtualizationEnabled:
        snapshot.transcriptPaginationVirtualizationEnabled === true,
      streamingRenderEnabled: snapshot.streamingRenderEnabled !== false,
      selectedTranscriptPage: page
        ? {
            requestId: String(page.requestId || ""),
            cursor: Number(page.cursor || 0),
            total: Number(page.total || 0),
            items: countArray(page.items),
          }
        : null,
    };
  }
  const session =
    snapshot.session && typeof snapshot.session === "object"
      ? (snapshot.session as Record<string, unknown>)
      : null;
  const workspace =
    snapshot.workspace && typeof snapshot.workspace === "object"
      ? (snapshot.workspace as Record<string, unknown>)
      : null;
  return {
    hostMode: String(snapshot.hostMode || ""),
    sessionRequestId: String(session?.requestId || ""),
    sessionStatus: String(session?.status || ""),
    selectedTaskKey: String(workspace?.selectedTaskKey || ""),
    groups: countArray(workspace?.groups),
    drawerSections: countArray(
      snapshot.drawer && typeof snapshot.drawer === "object"
        ? (snapshot.drawer as Record<string, unknown>).sections
        : undefined,
    ),
    transcriptPaginationVirtualizationEnabled:
      snapshot.transcriptPaginationVirtualizationEnabled === true,
    streamingRenderEnabled: snapshot.streamingRenderEnabled !== false,
  };
}

function logAssistantWorkspaceDebug(
  host: AssistantWorkspaceHostRuntime,
  stage: string,
  message: string,
  details?: Record<string, unknown>,
) {
  appendRuntimeLog({
    level: "debug",
    scope: "system",
    component: "assistant-shell",
    operation: "workspace-init",
    phase: "debug",
    stage,
    message,
    details: {
      activeTarget: host.activeTarget,
      activeTab: host.activeTab,
      shellLoaded: host.shell.loaded,
      shellReady: host.shell.ready,
      shellWindowKnown: !!host.shell.frameWindow,
      readyTabs: Array.from(host.readyTabs),
      snapshotRevision: host.snapshotRevision,
      acpChatSnapshotBuildSeq: host.acpChatSnapshotBuildSeq,
      acpSkillRunSnapshotBuildSeq: host.acpSkillRunSnapshotBuildSeq,
      acpChatBackendRefreshInFlight: host.acpChatBackendRefreshInFlight,
      acpChatBackendRefreshRepostQueued: host.acpChatBackendRefreshRepostQueued,
      ...(details || {}),
    },
  });
}

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

async function waitForShellFrameWindow(
  host: AssistantWorkspaceHostRuntime,
  timeoutMs = FRAME_WINDOW_WAIT_TIMEOUT_MS,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const frameWindow = resolveCurrentShellWindow(host);
    if (frameWindow) {
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

function acpSkillRunChangeKinds(change?: AcpSkillRunSnapshotChange) {
  return Array.isArray(change?.kinds) ? change.kinds : [];
}

function isPureAcpSkillRunBackgroundChange(change?: AcpSkillRunSnapshotChange) {
  if (!change || change.global === true) {
    return false;
  }
  const kinds = acpSkillRunChangeKinds(change);
  return (
    kinds.length > 0 &&
    kinds.every((kind) => kind === "transcript" || kind === "runtime-options")
  );
}

function shouldRefreshAcpSkillRunSnapshotForChange(
  host: AssistantWorkspaceHostRuntime,
  change?: AcpSkillRunSnapshotChange,
) {
  if (!change || change.global === true) {
    return true;
  }
  const kinds = acpSkillRunChangeKinds(change);
  if (
    kinds.length === 0 ||
    kinds.some(
      (kind) =>
        kind === "global" ||
        kind === "selection" ||
        kind === "archive" ||
        kind === "run",
    )
  ) {
    return true;
  }
  if (!isPureAcpSkillRunBackgroundChange(change)) {
    return true;
  }
  if (host.activeTab !== "acp-skills") {
    return false;
  }
  const selectedRequestId = getSelectedAcpSkillRunRequestId();
  if (!selectedRequestId) {
    return false;
  }
  const requestIds = Array.isArray(change.requestIds)
    ? change.requestIds.map((requestId) => String(requestId || "").trim())
    : [];
  if (requestIds.length === 0) {
    return true;
  }
  return requestIds.includes(selectedRequestId);
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
    setDockActive(host.library, "library", false);
    (libraryRoots.defaultDeck as Element | null)?.removeAttribute("hidden");
    setButtonSelected(host.library.button, false);
  } else {
    setSidebarContainerVisible(host.reader.container, false);
    setDockActive(host.reader, "reader", false);
    if (selectedTabUsesPluginOnlyContextPane(host.win)) {
      const contextPane = (host.win as any).ZoteroContextPane;
      if (contextPane) {
        contextPane.collapsed = true;
      }
    }
    (readerRoots.contextInner as Element | null)?.removeAttribute("hidden");
    setButtonSelected(host.reader.button, false);
  }
  if (host.activeTarget === target) {
    host.drawerOpen = false;
    host.activeTarget = null;
    setShellActiveTarget(host, null);
  }
}

function closeActiveSidebarHost(host: AssistantWorkspaceHostRuntime) {
  const activeTarget = host.activeTarget;
  if (!activeTarget) {
    return false;
  }
  host.drawerOpen = false;
  clearShellHandshake(host, "close-active-sidebar");
  clearAcpChatBackendRefreshBoundary(host);
  clearSkillRunnerSidebarRefresh(host);
  detachSkillRunnerFromShell(host, "close-active-sidebar");
  clearAssistantWorkspaceInitPublicationState(host, "close-active-sidebar");
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
      streamingRenderEnabled: isAssistantStreamingRenderEnabled(),
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

function postDecoratedSkillRunnerSnapshot(
  host: AssistantWorkspaceHostRuntime,
  phase: "init" | "snapshot",
  snapshot: RunWorkspaceSnapshot,
) {
  postShellMessage(host, "assistant-workspace:child-snapshot", {
    tab: "skillrunner",
    phase,
    snapshot,
  });
}

function publishLatestSkillRunnerChromeSnapshot(
  host: AssistantWorkspaceHostRuntime,
) {
  const baseSnapshot = host.latestSkillRunnerBaseSnapshot;
  if (!baseSnapshot) {
    logAssistantWorkspaceDebug(
      host,
      "skillrunner-chrome-snapshot-skip",
      "SkillRunner chrome snapshot skipped because no base snapshot is available.",
    );
    return false;
  }
  postDecoratedSkillRunnerSnapshot(
    host,
    "snapshot",
    buildDecoratedSkillRunnerSnapshot(host, baseSnapshot),
  );
  return true;
}

function createSkillRunnerHostActionHandler(
  host: AssistantWorkspaceHostRuntime,
) {
  return async (envelope: {
    action?: string;
    payload?: Record<string, unknown>;
  }) => {
    const action = String(envelope.action || "").trim();
    if (action === "select-task") {
      host.drawerOpen = false;
      return false;
    }
    if (action === "toggle-drawer") {
      host.drawerOpen = !host.drawerOpen;
      publishLatestSkillRunnerChromeSnapshot(host);
      return true;
    }
    if (action === "close-drawer") {
      if (host.drawerOpen) {
        host.drawerOpen = false;
        publishLatestSkillRunnerChromeSnapshot(host);
      }
      return true;
    }
    if (action === "toggle-drawer-section") {
      const sectionId = String(envelope.payload?.sectionId || "").trim();
      if (sectionId === "completed") {
        host.drawerCompletedCollapsed = !host.drawerCompletedCollapsed;
        publishLatestSkillRunnerChromeSnapshot(host);
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
  type?: string,
): AcpSidebarTarget | null {
  const frameWindow = resolveCurrentShellWindow(host);
  if (
    source &&
    frameWindow &&
    source !== frameWindow &&
    String(type || "").startsWith("assistant-workspace:")
  ) {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "assistant-shell",
      operation: "source-check",
      phase: "rejected",
      stage: "stale-shell-window",
      message:
        "Assistant shell message source did not match the current shell window.",
    });
  }
  if (!source || !frameWindow || source !== frameWindow) {
    return null;
  }
  return host.activeTarget;
}

function postShellMessage(
  host: AssistantWorkspaceHostRuntime,
  type: string,
  payload?: Record<string, unknown>,
) {
  const frameWindow = resolveCurrentShellWindow(host);
  if (!frameWindow) {
    logAssistantWorkspaceDebug(
      host,
      "shell-post-drop-no-frame",
      "Assistant Workspace shell message dropped because the shell frame window is unavailable.",
      { type },
    );
    return;
  }
  installShellBridge(host);
  logAssistantWorkspaceDebug(
    host,
    "shell-post",
    "Assistant Workspace shell message posted.",
    {
      type,
      tab: String(payload?.tab || ""),
      phase: String(payload?.phase || ""),
    },
  );
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

function clearAssistantWorkspaceBridgeWindow(frameWindow: Window | null) {
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

function clearAssistantWorkspaceReadyTabs(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (host.readyTabs.size === 0) {
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "child-ready-state-clear",
    "Assistant Workspace child ready state cleared.",
    { reason, readyTabs: Array.from(host.readyTabs) },
  );
  host.readyTabs.clear();
}

function assistantWorkspaceInitScopeKey(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget | null = host.activeTarget,
) {
  if (!target) {
    return "";
  }
  return `${host.scopeKey}\n${target}`;
}

function assistantWorkspaceChildInitScopeKey(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab,
) {
  const scopeKey = assistantWorkspaceInitScopeKey(host);
  return scopeKey ? `${scopeKey}\n${tab}` : "";
}

function clearAssistantWorkspaceInitPublicationState(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (
    !host.publishedWorkspaceInitScopeKey &&
    host.publishedChildInitScopeKeys.size === 0
  ) {
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "workspace-init-publication-clear",
    "Assistant Workspace init publication state cleared.",
    {
      reason,
      publishedWorkspaceInitScopeKey: host.publishedWorkspaceInitScopeKey || "",
      publishedChildInitScopes: Array.from(host.publishedChildInitScopeKeys),
    },
  );
  host.publishedWorkspaceInitScopeKey = null;
  host.publishedChildInitScopeKeys.clear();
}

function hasPublishedWorkspaceBaselineInit(
  host: AssistantWorkspaceHostRuntime,
) {
  const scopeKey = assistantWorkspaceInitScopeKey(host);
  return !!scopeKey && host.publishedWorkspaceInitScopeKey === scopeKey;
}

function markWorkspaceBaselineInitPublished(
  host: AssistantWorkspaceHostRuntime,
) {
  const scopeKey = assistantWorkspaceInitScopeKey(host);
  if (scopeKey) {
    host.publishedWorkspaceInitScopeKey = scopeKey;
  }
}

function hasPublishedChildBaselineInit(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab,
) {
  const scopeKey = assistantWorkspaceChildInitScopeKey(host, tab);
  return !!scopeKey && host.publishedChildInitScopeKeys.has(scopeKey);
}

function markChildBaselineInitPublished(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab,
) {
  const scopeKey = assistantWorkspaceChildInitScopeKey(host, tab);
  if (scopeKey) {
    host.publishedChildInitScopeKeys.add(scopeKey);
  }
}

function detachSkillRunnerFromShell(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (
    !host.skillRunnerAttachedFrameWindow &&
    !host.latestSkillRunnerBaseSnapshot &&
    !host.latestSkillRunnerSnapshot
  ) {
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "skillrunner-sidebar-detach",
    "SkillRunner sidebar host detached from Assistant Workspace shell.",
    { reason },
  );
  detachSkillRunnerSidebarHost({ hostWindow: host.win });
  host.skillRunnerAttachedFrameWindow = null;
  host.latestSkillRunnerBaseSnapshot = null;
  host.latestSkillRunnerSnapshot = null;
}

function resolveCurrentShellWindow(host: AssistantWorkspaceHostRuntime) {
  const current = resolveSidebarFrameWindow(host.shell.frame);
  if (current && current !== host.shell.frameWindow) {
    detachSkillRunnerFromShell(host, "shell-window-change");
    clearShellBridge(host.shell);
    host.shell.frameWindow = current;
    host.shell.loaded = false;
    host.shell.ready = false;
    clearAssistantWorkspaceReadyTabs(host, "shell-window-change");
    clearAssistantWorkspaceInitPublicationState(host, "shell-window-change");
  }
  return current || null;
}

function isAssistantShellReadyEnvelope(
  type: string,
  payload?: Record<string, unknown>,
) {
  return (
    type === "assistant-workspace:action" &&
    String(payload?.action || "").trim() === "ready"
  );
}

function clearShellHandshake(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (host.shellHandshakeTimer) {
    clearTimeout(host.shellHandshakeTimer);
    host.shellHandshakeTimer = null;
  }
  if (host.shellHandshakeAttempt > 0) {
    logAssistantWorkspaceDebug(
      host,
      "shell-handshake-clear",
      "Assistant Workspace shell handshake cleared.",
      { reason, attempts: host.shellHandshakeAttempt },
    );
  }
  host.shellHandshakeAttempt = 0;
}

function scheduleShellHandshake(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (host.shell.ready) {
    logAssistantWorkspaceDebug(
      host,
      "shell-handshake-drop-ready",
      "Assistant Workspace shell handshake skipped because the shell is ready.",
      { reason },
    );
    return;
  }
  if (host.shellHandshakeTimer) {
    logAssistantWorkspaceDebug(
      host,
      "shell-handshake-coalesced",
      "Assistant Workspace shell handshake request coalesced.",
      { reason, attempts: host.shellHandshakeAttempt },
    );
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "shell-handshake-scheduled",
    "Assistant Workspace shell handshake scheduled.",
    { reason, attempts: host.shellHandshakeAttempt },
  );
  host.shellHandshakeTimer = setTimeout(() => {
    host.shellHandshakeTimer = null;
    runShellHandshakeTick(host, reason);
  }, SHELL_HANDSHAKE_INTERVAL_MS);
}

function runShellHandshakeTick(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (hosts.get(host.win) !== host) {
    return;
  }
  if (host.shell.ready) {
    clearShellHandshake(host, "ready-before-tick");
    return;
  }
  host.shellHandshakeAttempt += 1;
  const frameWindow = resolveCurrentShellWindow(host);
  logAssistantWorkspaceDebug(
    host,
    "shell-handshake-tick",
    "Assistant Workspace shell handshake tick.",
    {
      reason,
      attempts: host.shellHandshakeAttempt,
      hasFrameWindow: !!frameWindow,
    },
  );
  if (!frameWindow) {
    scheduleShellHandshake(host, "retry-no-frame");
    return;
  }
  installShellBridge(host);
  if (!host.activeTarget) {
    logAssistantWorkspaceDebug(
      host,
      "shell-handshake-drop-no-target",
      "Assistant Workspace shell handshake could not post init because no active target is set.",
      { reason, attempts: host.shellHandshakeAttempt },
    );
    scheduleShellHandshake(host, "retry-no-target");
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "shell-handshake-post",
    "Assistant Workspace shell handshake posting lightweight init.",
    { reason, attempts: host.shellHandshakeAttempt },
  );
  postShellInit(host, host.activeTab);
}

function acceptAssistantShellReady(host: AssistantWorkspaceHostRuntime) {
  if (host.shell.ready) {
    logAssistantWorkspaceDebug(
      host,
      "shell-ready-duplicate",
      "Assistant Workspace shell ready was received again and ignored.",
    );
    clearShellHandshake(host, "duplicate-ready");
    return;
  }
  host.shell.ready = true;
  host.shell.loaded = true;
  clearShellHandshake(host, "ready-ack");
  logAssistantWorkspaceDebug(
    host,
    "shell-handshake-ack",
    "Assistant Workspace shell handshake acknowledged.",
  );
  logAssistantWorkspaceDebug(
    host,
    "shell-ready",
    "Assistant Workspace shell ready accepted.",
  );
  if (hasPublishedWorkspaceBaselineInit(host)) {
    logAssistantWorkspaceDebug(
      host,
      "shell-ready-init-skip",
      "Assistant Workspace shell ready acknowledged after baseline init was already published.",
    );
    return;
  }
  publishAssistantWorkspaceStatePulse(host, "shell-ready");
}

function installShellBridge(host: AssistantWorkspaceHostRuntime) {
  const frameWindow = resolveCurrentShellWindow(host);
  if (!frameWindow) {
    logAssistantWorkspaceDebug(
      host,
      "shell-bridge-drop-no-frame",
      "Assistant Workspace shell bridge was not installed because the frame window is unavailable.",
    );
    return false;
  }
  const directTarget = frameWindow as Window & Record<string, unknown>;
  const wrappedTarget =
    typeof (directTarget as { wrappedJSObject?: unknown }).wrappedJSObject ===
    "object"
      ? ((directTarget as { wrappedJSObject?: Record<string, unknown> })
          .wrappedJSObject as Record<string, unknown>)
      : null;
  if (
    host.shell.bridge &&
    host.shell.bridgeWindow === frameWindow &&
    (directTarget[ASSISTANT_WORKSPACE_BRIDGE_KEY] === host.shell.bridge ||
      wrappedTarget?.[ASSISTANT_WORKSPACE_BRIDGE_KEY] === host.shell.bridge)
  ) {
    return true;
  }
  const bridgeWindow = frameWindow;
  const bridge: AssistantWorkspaceBridge = {
    postMessage: async (type, payload) => {
      const currentShellWindow = resolveCurrentShellWindow(host);
      const bridgeIsCurrent = currentShellWindow === bridgeWindow;
      const action =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? String(payload.action || "").trim()
          : "";
      const activeTarget = host.activeTarget;
      const isReadyEnvelope = isAssistantShellReadyEnvelope(type, payload);
      logAssistantWorkspaceDebug(
        host,
        "shell-bridge-post-message",
        "Assistant Workspace shell bridge postMessage invoked.",
        {
          type,
          action,
          activeTarget,
          bridgeIsCurrent,
          isReadyEnvelope,
        },
      );
      if (!bridgeIsCurrent) {
        return {
          ok: false,
          error: "Assistant Workspace bridge is stale.",
        };
      }
      if (!activeTarget) {
        if (isReadyEnvelope) {
          acceptAssistantShellReady(host);
          return { ok: true };
        }
        return {
          ok: false,
          error: "Assistant Workspace has no active target.",
        };
      }
      return handleAssistantWorkspaceMessage(host, activeTarget, {
        type,
        payload:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload
            : {},
      });
    },
  };
  writeAssistantWorkspaceBridgeTarget(directTarget, bridge);
  writeAssistantWorkspaceBridgeTarget(wrappedTarget, bridge);
  host.shell.bridge = bridge;
  host.shell.bridgeWindow = frameWindow;
  logAssistantWorkspaceDebug(
    host,
    "shell-bridge-installed",
    "Assistant Workspace shell bridge installed.",
    { hasWrappedTarget: !!wrappedTarget },
  );
  if (!host.shell.ready) {
    scheduleShellHandshake(host, "bridge-installed");
  }
  return true;
}

function clearShellBridge(shell: AssistantWorkspaceShell) {
  clearAssistantWorkspaceBridgeWindow(shell.frameWindow);
  shell.bridge = null;
  shell.bridgeWindow = null;
}

function postChildSnapshot(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab,
  phase: "init" | "snapshot",
  snapshot: Record<string, unknown>,
) {
  host.snapshotRevision += 1;
  logAssistantWorkspaceDebug(
    host,
    "child-snapshot-post",
    "Assistant Workspace child snapshot prepared for shell delivery.",
    {
      tab,
      phase,
      full: tab === host.activeTab,
      nextRevision: host.snapshotRevision,
      summary: summarizeChildSnapshot(tab, snapshot),
    },
  );
  const payload = decorateAssistantSidebarChildSnapshot({
    scopeKey: host.scopeKey,
    activeTab: host.activeTab,
    tab,
    revision: host.snapshotRevision,
    waitingCount: countWaitingTasks(),
    full: tab === host.activeTab,
    snapshot,
  });
  postShellMessage(host, "assistant-workspace:child-snapshot", {
    tab,
    phase,
    snapshot: payload,
  });
}

async function postAcpChatPanelSnapshot(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "snapshot",
  options?: AcpChatSnapshotPostOptions,
) {
  host.acpChatSnapshotBuildSeq += 1;
  const buildSeq = host.acpChatSnapshotBuildSeq;
  logAssistantWorkspaceDebug(
    host,
    "acp-chat-snapshot-start",
    "ACP Chat panel snapshot build started.",
    {
      target,
      phase,
      buildSeq,
      transcriptPage: options?.transcriptPage || null,
    },
  );
  const snapshot = await prepareAcpChatPanelSnapshot({
    target,
    transcriptPage: options?.transcriptPage,
  });
  if (host.acpChatSnapshotBuildSeq !== buildSeq) {
    logAssistantWorkspaceDebug(
      host,
      "acp-chat-snapshot-stale",
      "ACP Chat panel snapshot build discarded because a newer build exists.",
      {
        target,
        phase,
        buildSeq,
        currentBuildSeq: host.acpChatSnapshotBuildSeq,
        summary: summarizeAcpChatPanelSnapshot(snapshot),
      },
    );
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "acp-chat-snapshot-ready",
    "ACP Chat panel snapshot build completed.",
    {
      target,
      phase,
      buildSeq,
      summary: summarizeAcpChatPanelSnapshot(snapshot),
    },
  );
  postChildSnapshot(host, "acp-chat", phase, snapshot);
}

function buildAcpSkillRunSnapshotSignature(snapshot: Record<string, unknown>) {
  const signatureSource = { ...snapshot };
  delete signatureSource.generatedAt;
  return JSON.stringify(signatureSource);
}

async function postAcpSkillRunSnapshot(
  host: AssistantWorkspaceHostRuntime,
  phase: "init" | "snapshot" = "snapshot",
  options?: AcpSkillRunSnapshotPostOptions,
) {
  host.acpSkillRunSnapshotBuildSeq += 1;
  const buildSeq = host.acpSkillRunSnapshotBuildSeq;
  logAssistantWorkspaceDebug(
    host,
    "acp-skills-snapshot-start",
    "ACP Skills panel snapshot build started.",
    {
      phase,
      buildSeq,
      transcriptPage: options?.transcriptPage || null,
      force: options?.force === true,
    },
  );
  const snapshot = await prepareAcpSkillRunPanelSnapshot({
    transcriptPage: options?.transcriptPage,
  });
  if (host.acpSkillRunSnapshotBuildSeq !== buildSeq) {
    logAssistantWorkspaceDebug(
      host,
      "acp-skills-snapshot-stale",
      "ACP Skills panel snapshot build discarded because a newer build exists.",
      {
        phase,
        buildSeq,
        currentBuildSeq: host.acpSkillRunSnapshotBuildSeq,
        summary: summarizeChildSnapshot("acp-skills", snapshot),
      },
    );
    return;
  }
  const currentSelectedRequestId = getSelectedAcpSkillRunRequestId();
  if (
    currentSelectedRequestId &&
    String(snapshot.selectedRequestId || "").trim() !== currentSelectedRequestId
  ) {
    logAssistantWorkspaceDebug(
      host,
      "acp-skills-snapshot-scope-mismatch",
      "ACP Skills panel snapshot discarded because selected request changed.",
      {
        phase,
        buildSeq,
        currentSelectedRequestId,
        snapshotSelectedRequestId: String(snapshot.selectedRequestId || ""),
      },
    );
    return;
  }
  const payload = {
    ...(snapshot as unknown as Record<string, unknown>),
    streamingRenderEnabled: isAssistantStreamingRenderEnabled(),
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
  };
  const signature = buildAcpSkillRunSnapshotSignature(payload);
  const force = options?.force === true || phase === "init";
  if (
    !force &&
    host.lastAcpSkillRunSnapshotSignature &&
    host.lastAcpSkillRunSnapshotSignature === signature
  ) {
    logAssistantWorkspaceDebug(
      host,
      "acp-skills-snapshot-signature-skip",
      "ACP Skills panel snapshot skipped because the signature is unchanged.",
      {
        phase,
        buildSeq,
        force,
        summary: summarizeChildSnapshot("acp-skills", payload),
      },
    );
    return;
  }
  host.lastAcpSkillRunSnapshotSignature = signature;
  logAssistantWorkspaceDebug(
    host,
    "acp-skills-snapshot-ready",
    "ACP Skills panel snapshot build completed.",
    {
      phase,
      buildSeq,
      force,
      summary: summarizeChildSnapshot("acp-skills", payload),
    },
  );
  postChildSnapshot(host, "acp-skills", phase, payload);
}

async function runAcpChatBackendRefreshBoundary(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  host.acpChatBackendRefreshInFlight = true;
  logAssistantWorkspaceDebug(
    host,
    "acp-chat-backend-refresh-start",
    "ACP Chat backend refresh boundary started.",
    { target },
  );
  try {
    await refreshAcpConversationBackends();
    logAssistantWorkspaceDebug(
      host,
      "acp-chat-backend-refresh-ok",
      "ACP Chat backend refresh boundary completed.",
      { target },
    );
  } catch (error) {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "assistant-shell",
      operation: "acp-chat-backend-refresh",
      phase: "error",
      stage: "lifecycle-boundary",
      message: "ACP Chat backend refresh failed after shell lifecycle event.",
      error,
    });
  } finally {
    host.acpChatBackendRefreshInFlight = false;
    host.acpChatBackendRefreshTimer = null;
    const shouldRepost = host.acpChatBackendRefreshRepostQueued;
    host.acpChatBackendRefreshRepostQueued = false;
    logAssistantWorkspaceDebug(
      host,
      "acp-chat-backend-refresh-settle",
      "ACP Chat backend refresh boundary settled.",
      { target, shouldRepost },
    );
    if (
      shouldRepost &&
      hosts.get(host.win) === host &&
      host.activeTarget === target
    ) {
      void postAcpChatPanelSnapshot(host, target, "snapshot");
    }
  }
}

async function preloadAcpChatBackendsForWorkspaceInit(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  logAssistantWorkspaceDebug(
    host,
    "acp-chat-backend-preload-start",
    "ACP Chat backend preload before workspace commit started.",
    { target },
  );
  try {
    await refreshAcpConversationBackends();
    logAssistantWorkspaceDebug(
      host,
      "acp-chat-backend-preload-ok",
      "ACP Chat backend preload before workspace commit completed.",
      { target },
    );
  } catch (error) {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "assistant-shell",
      operation: "acp-chat-backend-refresh",
      phase: "error",
      stage: "pre-init",
      message:
        "ACP Chat backend registry could not be loaded before workspace init.",
      error,
    });
    logAssistantWorkspaceDebug(
      host,
      "acp-chat-backend-preload-error",
      "ACP Chat backend preload before workspace commit failed.",
      { target },
    );
  }
}

function scheduleAcpChatBackendRefreshBoundary(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  host.acpChatBackendRefreshRepostQueued = true;
  if (host.acpChatBackendRefreshTimer || host.acpChatBackendRefreshInFlight) {
    logAssistantWorkspaceDebug(
      host,
      "acp-chat-backend-refresh-coalesced",
      "ACP Chat backend refresh boundary request coalesced.",
      { target },
    );
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "acp-chat-backend-refresh-scheduled",
    "ACP Chat backend refresh boundary scheduled.",
    { target },
  );
  host.acpChatBackendRefreshTimer = setTimeout(() => {
    void runAcpChatBackendRefreshBoundary(host, target);
  }, 0);
}

function clearAcpChatBackendRefreshBoundary(
  host: AssistantWorkspaceHostRuntime,
) {
  if (host.acpChatBackendRefreshTimer) {
    clearTimeout(host.acpChatBackendRefreshTimer);
    host.acpChatBackendRefreshTimer = null;
  }
  host.acpChatBackendRefreshRepostQueued = false;
}

function postSkillRunnerSnapshot(
  host: AssistantWorkspaceHostRuntime,
  phase: "init" | "snapshot" = "snapshot",
  options?: { force?: boolean },
) {
  if (
    !host.activeTarget ||
    (host.activeTab !== "skillrunner" &&
      options?.force !== true &&
      phase !== "init")
  ) {
    logAssistantWorkspaceDebug(
      host,
      "skillrunner-snapshot-skip",
      "SkillRunner sidebar snapshot request skipped.",
      { phase, force: options?.force === true },
    );
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "skillrunner-snapshot-start",
    "SkillRunner sidebar snapshot refresh requested.",
    { phase, force: options?.force === true },
  );
  attachSkillRunnerToShell(host, {
    allowInactive: options?.force === true || phase === "init",
  });
  void refreshSkillRunnerSidebarHostSnapshot({
    forceInit: phase === "init",
  });
}

function postSnapshotForTab(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  tab: AssistantWorkspaceTab,
  phase: "init" | "snapshot" = "snapshot",
  options?: { force?: boolean },
) {
  if (tab === "acp-chat") {
    void postAcpChatPanelSnapshot(host, target, phase);
    return;
  }
  if (tab === "acp-skills") {
    void postAcpSkillRunSnapshot(host, phase, {
      force: options?.force === true || phase === "init",
    });
    return;
  }
  postSkillRunnerSnapshot(host, phase, options);
}

function canPublishAssistantWorkspaceStatePulse(
  host: AssistantWorkspaceHostRuntime,
) {
  if (!host.activeTarget) {
    return false;
  }
  return !!resolveCurrentShellWindow(host);
}

function shouldRefreshAcpChatBackendsForWorkspacePulse(reason: string) {
  return reason === "shell-ready";
}

function postShellInit(
  host: AssistantWorkspaceHostRuntime,
  activeTab: AssistantWorkspaceTab,
) {
  postShellMessage(host, "assistant-workspace:init", {
    activeTab,
    activeTarget: host.activeTarget,
    scopeKey: host.scopeKey,
  });
}

function postInitialSnapshotsForAllTabs(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "init",
) {
  for (const tab of ASSISTANT_WORKSPACE_TABS) {
    postSnapshotForTab(host, target, tab, phase, { force: true });
    if (phase === "init") {
      markChildBaselineInitPublished(host, tab);
    }
  }
}

function publishAssistantWorkspaceStatePulse(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
  tab?: AssistantWorkspaceTab,
  phase: "init" | "snapshot" = "init",
) {
  if (!canPublishAssistantWorkspaceStatePulse(host)) {
    logAssistantWorkspaceDebug(
      host,
      "workspace-pulse-drop-inactive",
      "Assistant Workspace state pulse dropped because the host cannot publish.",
      { reason, tab, phase },
    );
    return false;
  }
  const target = host.activeTarget;
  if (!target) {
    logAssistantWorkspaceDebug(
      host,
      "workspace-pulse-drop-no-target",
      "Assistant Workspace state pulse dropped because no active target is set.",
      { reason, tab, phase },
    );
    return false;
  }
  logAssistantWorkspaceDebug(
    host,
    "workspace-pulse",
    "Assistant Workspace state pulse publishing.",
    { reason, tab, phase, target },
  );
  if (phase === "init" && reason !== "child-ready") {
    postShellInit(host, host.activeTab);
  }
  if (shouldRefreshAcpChatBackendsForWorkspacePulse(reason)) {
    scheduleAcpChatBackendRefreshBoundary(host, target);
  }
  if (tab) {
    if (reason === "child-ready") {
      host.readyTabs.add(tab);
      markChildBaselineInitPublished(host, tab);
    }
    postSnapshotForTab(host, target, tab, phase, {
      force: reason === "child-ready" || reason === "tab-switch",
    });
    return true;
  }
  if (phase === "init") {
    postInitialSnapshotsForAllTabs(host, target, phase);
    markWorkspaceBaselineInitPublished(host);
    return true;
  }
  postSnapshotForTab(host, target, host.activeTab, phase, {
    force: reason === "child-ready" || reason === "tab-switch",
  });
  return true;
}

function postAllSnapshots(host: AssistantWorkspaceHostRuntime) {
  publishAssistantWorkspaceStatePulse(
    host,
    "store-change",
    undefined,
    "snapshot",
  );
}

function schedulePostSnapshot(host: AssistantWorkspaceHostRuntime) {
  if (host.postSnapshotTimer) {
    logAssistantWorkspaceDebug(
      host,
      "snapshot-post-coalesced",
      "Assistant Workspace snapshot post request coalesced.",
    );
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "snapshot-post-scheduled",
    "Assistant Workspace snapshot post scheduled.",
  );
  host.postSnapshotTimer = setTimeout(() => {
    host.postSnapshotTimer = null;
    logAssistantWorkspaceDebug(
      host,
      "snapshot-post-fired",
      "Assistant Workspace scheduled snapshot post fired.",
    );
    postAllSnapshots(host);
  }, 16);
}

function setAssistantWorkspaceStreamingRenderEnabled(
  host: AssistantWorkspaceHostRuntime,
  enabled: boolean,
) {
  host.streamingRenderPreferenceLocalWriteDepth += 1;
  try {
    return setAssistantStreamingRenderEnabled(enabled);
  } finally {
    host.streamingRenderPreferenceLocalWriteDepth = Math.max(
      0,
      host.streamingRenderPreferenceLocalWriteDepth - 1,
    );
  }
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
    const frameWindow = resolveCurrentShellWindow(host);
    if (
      isAssistantShellReadyEnvelope(data.type, data.payload) &&
      event.source &&
      frameWindow &&
      event.source === frameWindow
    ) {
      logAssistantWorkspaceDebug(
        host,
        "message-shell-ready",
        "Assistant Workspace shell ready message received from the current shell window.",
        { type: data.type },
      );
      acceptAssistantShellReady(host);
      return;
    }
    const target = resolveTargetFromSource(
      host,
      event.source as Window | null,
      data.type,
    );
    if (!target) {
      logAssistantWorkspaceDebug(
        host,
        "message-drop-no-target",
        "Assistant Workspace message dropped because it did not resolve to an active target.",
        {
          type: data.type,
          sourceMatchesShell: Boolean(
            event.source && frameWindow && event.source === frameWindow,
          ),
        },
      );
      return;
    }
    logAssistantWorkspaceDebug(
      host,
      "message-received",
      "Assistant Workspace message received.",
      {
        target,
        type: data.type,
        sourceMatchesShell: Boolean(
          event.source && frameWindow && event.source === frameWindow,
        ),
      },
    );
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
  const logTab = resolveAssistantWorkspaceActionLogTab(
    data.type || "",
    actionPayload,
  );
  logAssistantWorkspaceDebug(
    host,
    "message-handle-start",
    "Assistant Workspace message handling started.",
    {
      target,
      type: data.type || "",
      tab,
      logTab,
      action,
      actionId,
    },
  );
  const duplicateShellReady =
    data.type === "assistant-workspace:action" &&
    action === "ready" &&
    host.shell.ready;
  const duplicateChildReady =
    data.type === "assistant-workspace:child-action" &&
    action === "ready" &&
    host.readyTabs.has(tab);
  try {
    if (data.type === "assistant-workspace:action") {
      await handleShellAction(host, target, data.payload || {});
      if (!duplicateShellReady) {
        logAssistantShellAction({
          host,
          target,
          type: data.type,
          tab: logTab,
          action,
          actionId,
          result: "ok",
        });
      }
      return { ok: true, actionId };
    }
    if (data.type === "assistant-workspace:child-action") {
      await handleChildAction(host, target, data.payload || {});
      if (!duplicateChildReady) {
        logAssistantShellAction({
          host,
          target,
          type: data.type,
          tab,
          action,
          actionId,
          result: "ok",
        });
      }
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
      tab: logTab,
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
  tab: AssistantWorkspaceLogTab;
  action: string;
  actionId?: string;
  result: "ok" | "error";
  error?: string;
}) {
  appendRuntimeLog({
    level: args.result === "error" ? "warn" : "info",
    scope: "system",
    component: "assistant-shell",
    operation: args.tab === "shell" ? "shell-action" : "child-action",
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

function resolveAssistantWorkspaceActionLogTab(
  type: string,
  payload: AssistantWorkspaceActionPayload,
): AssistantWorkspaceLogTab {
  if (type === "assistant-workspace:action") {
    const tabText = String(payload.tab || "").trim();
    return tabText ? normalizeTab(tabText) : "shell";
  }
  return normalizeTab(payload.tab);
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
    attachSkillRunnerToShell(host);
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
  _target: AcpSidebarTarget,
  payload: Record<string, unknown>,
) {
  const action = String(payload.action || "").trim();
  logAssistantWorkspaceDebug(
    host,
    "shell-action-start",
    "Assistant Workspace shell action handling started.",
    { action, requestedTab: String(payload.tab || "") },
  );
  if (action === "ready") {
    acceptAssistantShellReady(host);
    return;
  }
  if (action === "set-tab") {
    const tab = normalizeTab(payload.tab);
    host.activeTab = tab;
    if (tab !== "skillrunner") {
      clearSkillRunnerSidebarRefresh(host);
      detachSkillRunnerFromShell(host, "tab-switch-away");
    }
    publishAssistantWorkspaceStatePulse(host, "tab-switch", tab);
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
  logAssistantWorkspaceDebug(
    host,
    "child-action-start",
    "Assistant Workspace child action handling started.",
    {
      target,
      tab,
      action,
      actionId: String(payload.actionId || ""),
      payloadKeys: Object.keys(childPayload),
    },
  );
  if (action === "ready") {
    if (host.readyTabs.has(tab)) {
      logAssistantWorkspaceDebug(
        host,
        "child-ready-duplicate",
        "Assistant Workspace duplicate child ready ignored.",
        { target, tab },
      );
      return;
    }
    if (hasPublishedChildBaselineInit(host, tab)) {
      host.readyTabs.add(tab);
      logAssistantWorkspaceDebug(
        host,
        "child-ready-init-skip",
        "Assistant Workspace child ready acknowledged after baseline init was already published.",
        { target, tab },
      );
      return;
    }
    publishAssistantWorkspaceStatePulse(host, "child-ready", tab, "init");
    return;
  }
  if (tab === "skillrunner") {
    if (action === "set-streaming-render-enabled") {
      setAssistantWorkspaceStreamingRenderEnabled(
        host,
        childPayload.enabled === true,
      );
      scheduleSkillRunnerSidebarRefresh(host, target, {
        selectionChanged: false,
      });
      return;
    }
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
    if (action === "load-transcript-page") {
      const requestId = String(childPayload.requestId || "").trim();
      const selectedRequestId = getSelectedAcpSkillRunRequestId();
      if (!requestId || requestId !== selectedRequestId) {
        logAssistantWorkspaceDebug(
          host,
          "acp-skills-page-request-drop",
          "ACP Skills transcript page request ignored because scope does not match.",
          { requestId, selectedRequestId },
        );
        return;
      }
      await postAcpSkillRunSnapshot(host, "snapshot", {
        force: true,
        transcriptPage: {
          requestId,
          cursor:
            typeof childPayload.cursor === "number"
              ? childPayload.cursor
              : Number(childPayload.cursor),
          limit:
            typeof childPayload.limit === "number"
              ? childPayload.limit
              : Number(childPayload.limit),
        },
      });
      return;
    }
    await handleAcpSkillRunAction(host, action, childPayload);
    await postAcpSkillRunSnapshot(host, "snapshot", { force: true });
    return;
  }
  if (tab === "acp-chat") {
    if (action === "load-transcript-page") {
      const transcriptPage =
        resolveActiveAcpChatTranscriptPageRequest(childPayload);
      if (!transcriptPage) {
        logAssistantWorkspaceDebug(
          host,
          "acp-chat-page-request-drop",
          "ACP Chat transcript page request ignored because scope does not match.",
          { payload: childPayload },
        );
        return;
      }
      await postAcpChatPanelSnapshot(host, target, "snapshot", {
        transcriptPage,
      });
      return;
    }
  }
  await handleAcpChatAction(host, target, action, childPayload);
  await postAcpChatPanelSnapshot(host, target);
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
    if (action === "set-streaming-render-enabled") {
      setAssistantWorkspaceStreamingRenderEnabled(
        host,
        payload.enabled === true,
      );
      return;
    }
    if (action === "select-run") {
      await selectAcpSkillRun(String(payload.requestId || "").trim());
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
      const snapshot = await prepareAcpSkillRunPanelSnapshot({
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
    if (action === "set-streaming-render-enabled") {
      setAssistantWorkspaceStreamingRenderEnabled(
        host,
        payload.enabled === true,
      );
      return;
    }
    if (action === "set-active-backend") {
      const backendId = String(payload.backendId || "").trim();
      if (backendId) {
        await setActiveAcpBackend({ backendId });
        scheduleAcpChatBackendRefreshBoundary(host, target);
      }
      return;
    }
    if (action === "set-active-conversation") {
      const conversationId = String(payload.conversationId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      if (!conversationId) return;
      await setActiveAcpConversation({ conversationId, backendId });
      return;
    }
    if (action === "open-backend-manager") {
      await openBackendManagerDialog({
        window: host.win,
        initialProviderType: "acp",
      });
      scheduleAcpChatBackendRefreshBoundary(host, target);
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
      await reconnectAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
      return;
    }
    if (action === "connect") {
      await connectAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
      return;
    }
    if (action === "disconnect") {
      await disconnectAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
      return;
    }
    if (action === "cancel") {
      await cancelAcpConversationPrompt({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
      return;
    }
    if (action === "authenticate") {
      await authenticateAcpConversation({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
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
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
      return;
    }
    if (action === "set-auto-approve-permissions") {
      setAcpConversationAutoApprovePermissions({
        enabled: payload.enabled === true,
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
      });
      return;
    }
    if (action === "set-mode") {
      const modeId = String(payload.modeId || "").trim();
      if (modeId)
        await setAcpConversationMode({
          modeId,
          backendId: String(payload.backendId || "").trim(),
          conversationId: String(payload.conversationId || "").trim(),
        });
      return;
    }
    if (action === "set-model") {
      const modelId = String(payload.modelId || "").trim();
      if (modelId)
        await setAcpConversationModel({
          modelId,
          backendId: String(payload.backendId || "").trim(),
          conversationId: String(payload.conversationId || "").trim(),
        });
      return;
    }
    if (action === "set-reasoning-effort") {
      const effortId = String(payload.effortId || "").trim();
      if (effortId)
        await setAcpConversationReasoningEffort({
          effortId,
          backendId: String(payload.backendId || "").trim(),
          conversationId: String(payload.conversationId || "").trim(),
        });
      return;
    }
    if (action === "toggle-diagnostics") {
      toggleAcpConversationDiagnostics({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        visible:
          typeof payload.visible === "boolean"
            ? Boolean(payload.visible)
            : undefined,
      });
      return;
    }
    if (action === "toggle-status-details") {
      toggleAcpConversationStatusDetails({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        expanded:
          typeof payload.expanded === "boolean"
            ? Boolean(payload.expanded)
            : undefined,
      });
      return;
    }
    if (action === "set-chat-display-mode") {
      setAcpConversationChatDisplayMode({
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        mode:
          String(payload.mode || "").trim() === "bubble" ? "bubble" : "plain",
      });
      return;
    }
    if (action === "copy-diagnostics") {
      const backendId = String(payload.backendId || "").trim();
      const conversationId = String(payload.conversationId || "").trim();
      copyText(
        JSON.stringify(
          buildAcpDiagnosticsBundle(backendId, conversationId),
          null,
          2,
        ),
      );
      toggleAcpConversationDiagnostics({
        backendId,
        conversationId,
        visible: true,
      });
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
        backendId: String(payload.backendId || "").trim(),
        conversationId: String(payload.conversationId || "").trim(),
        hostContext: buildAcpHostContext({ window: host.win, target }),
      });
    }
  } catch (error) {
    host.win.alert?.(String(error));
  }
}

function attachSkillRunnerToShell(
  host: AssistantWorkspaceHostRuntime,
  options?: { allowInactive?: boolean },
) {
  if (
    !host.activeTarget ||
    (host.activeTab !== "skillrunner" && options?.allowInactive !== true)
  ) {
    return;
  }
  const frameWindow = resolveCurrentShellWindow(host);
  if (!frameWindow) {
    return;
  }
  if (host.skillRunnerAttachedFrameWindow === frameWindow) {
    return;
  }
  detachSkillRunnerFromShell(host, "reattach-skillrunner-sidebar");
  installShellBridge(host);
  attachSkillRunnerSidebarHost({
    hostWindow: host.win,
    frameWindow,
    publishSnapshot: (phase, snapshot) => {
      postShellMessage(host, "assistant-workspace:child-snapshot", {
        tab: "skillrunner",
        phase,
        snapshot,
      });
    },
    alertWindow: host.win,
    focusHost: () => host.win.focus(),
    isHostAlive: () => hosts.get(host.win) === host,
    decorateSnapshot: (snapshot) => {
      host.latestSkillRunnerBaseSnapshot = snapshot;
      return buildDecoratedSkillRunnerSnapshot(host, snapshot);
    },
    handleHostAction: createSkillRunnerHostActionHandler(host),
  });
  host.skillRunnerAttachedFrameWindow = frameWindow;
}

function dockForTarget(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  return target === "reader" ? host.reader : host.library;
}

function setDockActive(
  dock: MountedSidebarDock,
  target: AcpSidebarTarget,
  active: boolean,
) {
  dock.container?.setAttribute("data-zs-assistant-dock-target", target);
  dock.container?.setAttribute(
    "data-zs-assistant-dock-active",
    active ? "true" : "false",
  );
}

function setShellActiveTarget(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget | null,
) {
  const frame = host.shell.frame;
  if (!frame) {
    return;
  }
  frame.setAttribute("data-zs-assistant-shell", "true");
  if (target) {
    frame.setAttribute("data-zs-assistant-active-target", target);
  } else {
    frame.removeAttribute("data-zs-assistant-active-target");
  }
}

function ensureAssistantWorkspaceShell(host: AssistantWorkspaceHostRuntime) {
  if (host.shell.frame) {
    return host.shell.frame;
  }
  const doc = host.win.document;
  const frame = createSidebarFrame(doc, resolveSidebarPageUrl());
  frame.setAttribute("data-zs-assistant-shell", "true");
  const frameLoadHandler = () => {
    resolveCurrentShellWindow(host);
    host.shell.loaded = true;
    logAssistantWorkspaceDebug(
      host,
      "shell-frame-load",
      "Assistant Workspace shell frame load event received.",
    );
    installShellBridge(host);
  };
  frame.addEventListener("load", frameLoadHandler);
  host.shell = {
    frame,
    frameWindow: resolveSidebarFrameWindow(frame),
    frameLoadHandler,
    loaded: false,
    ready: false,
  };
  return frame;
}

async function dockAssistantWorkspaceShell(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  logAssistantWorkspaceDebug(
    host,
    "dock-start",
    "Assistant Workspace shell docking started.",
    { target },
  );
  const dock = dockForTarget(host, target);
  const frame = ensureAssistantWorkspaceShell(host);
  if (!dock.container || !frame) {
    logAssistantWorkspaceDebug(
      host,
      "dock-drop-missing-container",
      "Assistant Workspace shell docking failed because the target container or frame is missing.",
      { target, hasContainer: !!dock.container, hasFrame: !!frame },
    );
    return false;
  }
  if (frame.parentElement !== dock.container) {
    dock.container.appendChild(frame);
  }
  const frameWindow = await waitForShellFrameWindow(host);
  if (!frameWindow) {
    logAssistantWorkspaceDebug(
      host,
      "dock-drop-no-frame-window",
      "Assistant Workspace shell docking failed because the frame window did not become available.",
      { target },
    );
    return false;
  }
  installShellBridge(host);
  logAssistantWorkspaceDebug(
    host,
    "dock-done",
    "Assistant Workspace shell docking completed.",
    { target },
  );
  return true;
}

function commitAssistantWorkspaceTarget(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  logAssistantWorkspaceDebug(
    host,
    "target-commit-start",
    "Assistant Workspace target commit started.",
    { target },
  );
  host.activeTarget = target;
  clearAssistantWorkspaceReadyTabs(host, "target-commit");
  clearAssistantWorkspaceInitPublicationState(host, "target-commit");
  setShellActiveTarget(host, target);
  setDockActive(host.library, "library", target === "library");
  setDockActive(host.reader, "reader", target === "reader");
  publishAssistantWorkspaceStatePulse(host, "target-commit");
  logAssistantWorkspaceDebug(
    host,
    "target-commit-done",
    "Assistant Workspace target commit completed.",
    { target },
  );
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
  setDockActive({ button, container }, "library", false);
  roots.itemPane.insertBefore(container, roots.sidenav);
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
  setDockActive({ button, container }, "reader", false);
  roots.contextInner.parentElement?.insertBefore(container, roots.contextInner);
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
  };
}

async function activateTarget(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  logAssistantWorkspaceDebug(
    host,
    "activate-target-start",
    "Assistant Workspace target activation started.",
    { target },
  );
  const libraryRoots = getLibraryRoots(host.win);
  const readerRoots = getReaderRoots(host.win);
  installMessageBridge(host);
  if (
    host.activeTab === "skillrunner" &&
    host.activeTarget &&
    host.activeTarget !== target
  ) {
    clearSkillRunnerSidebarRefresh(host);
    detachSkillRunnerFromShell(host, "target-switch-away");
  }
  if (target === "library") {
    if (!ensureLibraryPaneExpanded(host.win)) {
      logAssistantWorkspaceDebug(
        host,
        "activate-target-drop-library-pane",
        "Assistant Workspace library target activation failed because the pane could not be expanded.",
        { target },
      );
      return false;
    }
    deactivateTarget(host, "reader");
    (libraryRoots.defaultDeck as Element | null)?.setAttribute(
      "hidden",
      "true",
    );
    setSidebarContainerVisible(host.library.container, true);
    setButtonSelected(host.library.button, true);
    const docked = await dockAssistantWorkspaceShell(host, "library");
    if (!docked) {
      appendRuntimeLog({
        level: "warn",
        scope: "system",
        component: "assistant-shell",
        operation: "dock-shell",
        phase: "error",
        stage: "library",
        message:
          "Assistant Workspace shell could not be docked in library pane.",
      });
      deactivateTarget(host, "library");
      return false;
    }
    host.activeTarget = "library";
    logAssistantWorkspaceDebug(
      host,
      "activate-target-preload-ready",
      "Assistant Workspace active target set before backend preload.",
      { target: "library" },
    );
    await preloadAcpChatBackendsForWorkspaceInit(host, "library");
    commitAssistantWorkspaceTarget(host, "library");
    return true;
  }
  if (!ensureReaderPaneExpanded(host.win)) {
    logAssistantWorkspaceDebug(
      host,
      "activate-target-drop-reader-pane",
      "Assistant Workspace reader target activation failed because the pane could not be expanded.",
      { target },
    );
    return false;
  }
  deactivateTarget(host, "library");
  (readerRoots.contextInner as Element | null)?.setAttribute("hidden", "true");
  setSidebarContainerVisible(host.reader.container, true);
  setButtonSelected(host.reader.button, true);
  const docked = await dockAssistantWorkspaceShell(host, "reader");
  if (!docked) {
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      component: "assistant-shell",
      operation: "dock-shell",
      phase: "error",
      stage: "reader",
      message: "Assistant Workspace shell could not be docked in reader pane.",
    });
    deactivateTarget(host, "reader");
    return false;
  }
  host.activeTarget = "reader";
  logAssistantWorkspaceDebug(
    host,
    "activate-target-preload-ready",
    "Assistant Workspace active target set before backend preload.",
    { target: "reader" },
  );
  await preloadAcpChatBackendsForWorkspaceInit(host, "reader");
  commitAssistantWorkspaceTarget(host, "reader");
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
    acpChatSnapshotBuildSeq: 0,
    acpSkillRunSnapshotBuildSeq: 0,
    publishedWorkspaceInitScopeKey: null,
    publishedChildInitScopeKeys: new Set<string>(),
    streamingRenderPreferenceInitialized: false,
    streamingRenderPreferenceLocalWriteDepth: 0,
    shellHandshakeTimer: null,
    shellHandshakeAttempt: 0,
    acpChatBackendRefreshInFlight: false,
    acpChatBackendRefreshRepostQueued: false,
    skillRunnerRefreshGeneration: 0,
    library: { button: null, container: null },
    reader: { button: null, container: null },
    shell: {
      frame: null,
      frameWindow: null,
      loaded: false,
      ready: false,
    },
    lastAcpSkillWaitingToastKeys: new Set<string>(),
    readyTabs: new Set<AssistantWorkspaceTab>(),
  };
  mountLibraryPane(host);
  mountReaderPane(host);
  host.removeAcpSnapshotSubscription = subscribeAcpFrontendSnapshots(() => {
    updateAssistantAttentionIndicator(host);
  });
  host.removeAcpChatPanelSubscription = subscribeAcpChatPanelSnapshots(
    (change) => {
      const pureBackgroundChange = isPureAcpChatBackgroundChange(change);
      if (!pureBackgroundChange) {
        updateAssistantAttentionIndicator(host);
      }
      const backendRefreshBoundaryChange =
        host.acpChatBackendRefreshInFlight &&
        change.global === true &&
        Array.isArray(change.kinds) &&
        change.kinds.includes("backend");
      if (backendRefreshBoundaryChange) {
        host.acpChatBackendRefreshRepostQueued = true;
        return;
      }
      if (
        shouldRefreshAcpChatSnapshotForChange(
          {
            activeTab: host.activeTab,
            hasActiveTarget: !!host.activeTarget,
            transcriptPaginationVirtualizationEnabled:
              isAssistantTranscriptPaginationVirtualizationEnabled(),
            streamingRenderEnabled: isAssistantStreamingRenderEnabled(),
          },
          change,
        )
      ) {
        schedulePostSnapshot(host);
      }
    },
  );
  host.removeAcpSkillRunSubscription = subscribeAcpSkillRunSnapshots(
    (change) => {
      const pureBackgroundChange = isPureAcpSkillRunBackgroundChange(change);
      if (!pureBackgroundChange) {
        maybeShowAcpSkillWaitingToasts(host);
        updateAssistantAttentionIndicator(host);
      }
      if (shouldRefreshAcpSkillRunSnapshotForChange(host, change)) {
        schedulePostSnapshot(host);
      }
    },
  );
  host.removeTaskSubscription = subscribeWorkflowTaskChanges(() => {
    updateAssistantAttentionIndicator(host);
  });
  host.removeStreamingRenderPreferenceSubscription =
    subscribeAssistantStreamingRenderPreference(() => {
      if (!host.streamingRenderPreferenceInitialized) {
        host.streamingRenderPreferenceInitialized = true;
        logAssistantWorkspaceDebug(
          host,
          "streaming-preference-initial-skip",
          "Assistant Workspace streaming preference initial callback skipped.",
        );
        return;
      }
      if (host.streamingRenderPreferenceLocalWriteDepth > 0) {
        logAssistantWorkspaceDebug(
          host,
          "streaming-preference-local-skip",
          "Assistant Workspace streaming preference local write callback skipped.",
        );
        return;
      }
      if (host.activeTab === "skillrunner" && host.activeTarget) {
        scheduleSkillRunnerSidebarRefresh(host, host.activeTarget, {
          selectionChanged: false,
        });
        return;
      }
      schedulePostSnapshot(host);
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
  host.removeAcpChatPanelSubscription?.();
  host.removeAcpSkillRunSubscription?.();
  host.removeTaskSubscription?.();
  host.removeStreamingRenderPreferenceSubscription?.();
  detachSkillRunnerFromShell(host, "remove-shell");
  if (host.postSnapshotTimer) {
    clearTimeout(host.postSnapshotTimer);
    host.postSnapshotTimer = null;
  }
  clearShellHandshake(host, "remove-shell");
  clearAcpChatBackendRefreshBoundary(host);
  clearSkillRunnerSidebarRefresh(host);
  if (host.shell.frame && host.shell.frameLoadHandler) {
    host.shell.frame.removeEventListener("load", host.shell.frameLoadHandler);
  }
  clearShellBridge(host.shell);
  host.shell.frame?.remove();
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
  const hasExplicitTab = Boolean(args && "tab" in args && args.tab);
  if (hasExplicitTab || !host.activeTarget) {
    host.activeTab = hasExplicitTab ? normalizeTab(args?.tab) : DEFAULT_TAB;
    if (host.activeTab !== "skillrunner") {
      clearSkillRunnerSidebarRefresh(host);
      detachSkillRunnerFromShell(host, "open-non-skillrunner-tab");
    }
    if (host.activeTarget) {
      publishAssistantWorkspaceStatePulse(
        host,
        "open-tab-request",
        host.activeTab,
      );
    }
  }
  if (host.activeTab === "acp-skills" && args?.requestId) {
    await selectAcpSkillRun(args.requestId);
  }
  const target = args?.target || resolvePreferredTarget(win);
  const activated = await activateTarget(host, target);
  if (activated && host.activeTab === "skillrunner") {
    scheduleSkillRunnerSidebarRefresh(host, target, {
      runKey: args?.runKey,
      selectionChanged: true,
    });
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
        if (host.activeTab !== "skillrunner") {
          clearSkillRunnerSidebarRefresh(host);
          detachSkillRunnerFromShell(host, "toggle-non-skillrunner-tab");
        }
        publishAssistantWorkspaceStatePulse(
          host,
          "toggle-tab-request",
          host.activeTab,
        );
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

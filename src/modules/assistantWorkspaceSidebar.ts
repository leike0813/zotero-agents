import { config } from "../../package.json";
import { ACP_OPENCODE_DISPLAY_NAME } from "../config/defaults";
import type { BackendInstance } from "../backends/types";
import { getStringOrFallback } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { copyText } from "../utils/ztoolkit";
import { openFolderInSystemFileManager } from "../utils/fileSystem";
import {
  getAssistantExecutionDisplayMode,
  isAssistantExecutionDisplayMode,
  setAssistantExecutionDisplayMode,
  subscribeAssistantExecutionDisplayMode,
} from "./assistantExecutionDisplayPolicy";
import { isAssistantTranscriptPaginationVirtualizationEnabled } from "./assistantTranscriptRenderingPreference";
import {
  SKILLRUNNER_ICON_URI,
  applyToolbarButtonStyling,
  syncToolbarButtonIconFill,
  updateAssistantToolbarAttention,
} from "./dashboardToolbarButton";
import { buildAcpHostContext } from "./acpContextBuilder";
import {
  ACP_CHAT_WORKSPACE_ADAPTER,
  acpChatTranscriptPageKey,
  isPureAcpChatBackgroundChange,
} from "./acpChatWorkspaceSurface";
import {
  AssistantWorkspacePublicationRuntime,
  readAssistantWorkspaceServiceStatus,
  type AssistantWorkspacePublicationRuntimeConfiguration,
} from "./assistantWorkspacePublicationRuntime";
import { buildAssistantWorkspacePublicationLabels } from "./assistantWorkspacePublicationLabels";
import {
  authenticateAcpConversation,
  archiveAcpConversation,
  buildAcpDiagnosticsBundle,
  cancelAcpConversationPrompt,
  connectAcpConversation,
  disconnectAcpConversation,
  getActiveAcpChatOwner,
  getAcpChatWorkspaceOwnerNavigation,
  getAcpChatWorkspaceReadModel,
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
  subscribeAcpChatWorkspaceChanges,
  toggleAcpConversationDiagnostics,
  toggleAcpConversationStatusDetails,
  type AcpChatWorkspaceChange,
} from "./acpSessionManager";
import { openBackendManagerDialog } from "./backendManager";
import type { AcpSidebarTarget } from "./acpTypes";
import {
  type AcpSkillRunWorkspaceChange,
  archiveAcpSkillRun,
  cancelAcpSkillRun,
  connectAcpSkillRun,
  disconnectAcpSkillRun,
  endAcpSkillRunSession,
  getAcpSkillRunDiagnostics,
  getAcpSkillRunWorkspaceReadModel,
  getSelectedAcpSkillRunRequestId,
  interruptAcpSkillRunCurrentTurn,
  listAcpSkillRunSummaries,
  replyAcpSkillRun,
  resolveAcpSkillRunPermissionRequest,
  selectAcpSkillRun,
  setAcpSkillRunMode,
  setAcpSkillRunModel,
  setAcpSkillRunReasoningEffort,
  subscribeAcpSkillRunWorkspaceChanges,
} from "./acpSkillRunStore";
import { ACP_SKILLS_WORKSPACE_ADAPTER } from "./acpSkillsWorkspaceSurface";
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
import { isDebugModeEnabled } from "./debugMode";
import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  readAcpRuntimePerformanceClockMs,
  recordAcpRuntimePublicationAck,
} from "./acpRuntimePerformanceProfiler";
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
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createAssistantWorkspaceUnownedScope,
  assertAssistantWorkspacePublicationAck,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationAck,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublicationKind,
  type AssistantWorkspacePublicationLifecycle,
} from "./assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "./assistantWorkspacePublicationCoordinator";
import {
  parseAssistantWorkspaceTranscriptPageRequest,
  type AssistantWorkspaceTranscriptRegion,
} from "./assistantWorkspaceTranscriptPublication";
import {
  ASSISTANT_WORKSPACE_MESSAGE_PREFIX,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
  resolveRunDialogMessageType,
  type AssistantWorkspaceMessageType,
  type AssistantWorkspaceTab,
} from "../shared/assistantWireContract";
import type {
  AcpChatAction,
  AcpSkillsAction,
  AssistantWorkspaceChildActionEnvelope,
  AssistantWorkspaceInboundActionPayload,
  AssistantWorkspaceShellActionEnvelope,
} from "../shared/assistantActionContract";

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
  drawerGroupCollapsed: Map<string, boolean>;
  latestSkillRunnerBaseSnapshot?: RunWorkspaceSnapshot | null;
  latestSkillRunnerSnapshot?: RunWorkspaceSnapshot | null;
  skillRunnerAttachedFrameWindow?: Window | null;
  library: MountedSidebarDock;
  reader: MountedSidebarDock;
  shell: AssistantWorkspaceShell;
  removeMessageListener?: () => void;
  removeAcpChatPanelSubscription?: () => void;
  removeAcpSkillRunSubscription?: () => void;
  removeTaskSubscription?: () => void;
  removeStreamingRenderPreferenceSubscription?: () => void;
  postSnapshotTimer?: ReturnType<typeof setTimeout> | null;
  shellHandshakeTimer?: ReturnType<typeof setTimeout> | null;
  shellHandshakeAttempt: number;
  acpChatBackendRefreshTimer?: ReturnType<typeof setTimeout> | null;
  skillRunnerRefreshTimer?: ReturnType<typeof setTimeout> | null;
  skillRunnerRefreshGeneration: number;
  pendingSkillRunnerRefresh?: SkillRunnerSidebarRefreshRequest;
  scopeKey: string;
  snapshotRevision: number;
  workspaceInitDelivery?: {
    frameWindow: Window;
    target: AcpSidebarTarget;
  } | null;
  workspaceInitInFlight?: {
    frameWindow: Window;
    target: AcpSidebarTarget;
    promise: Promise<boolean>;
  } | null;
  childInitDeliveries: Map<
    AssistantWorkspaceTab,
    { documentGeneration: string; target: AcpSidebarTarget }
  >;
  readyTabGenerations: Map<AssistantWorkspaceTab, string>;
  childInitInFlight: Map<AssistantWorkspaceTab, Promise<boolean>>;
  streamingRenderPreferenceInitialized: boolean;
  streamingRenderPreferenceLocalWriteDepth: number;
  pendingSnapshotTab?: AssistantWorkspaceTab;
  publicationLifecycles: Map<
    string,
    AssistantWorkspacePublicationLifecycle & {
      acknowledgements: Set<string>;
      ownerKey: string;
      source: "acp-chat" | "acp-skills";
      kind: AssistantWorkspacePublicationKind;
      cause: AssistantWorkspacePublication["publicationCause"];
      form: AssistantWorkspacePublication["publicationForm"];
      deliverySequence: number;
      postedAtMs: number;
    }
  >;
  publicationCoordinator?: AssistantWorkspacePublicationCoordinator;
  publicationRuntime?: AssistantWorkspacePublicationRuntime;
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
  type?: AssistantWorkspaceMessageType;
  payload?: Record<string, unknown>;
};
// Payload union for the action-bearing inbound messages; the host probes the
// generic fields (action/actionId/tab/source) before dispatching on the
// message type, and the per-handler runtime validation stays the real gate.
type AssistantWorkspaceActionPayload = AssistantWorkspaceInboundActionPayload;
type AssistantWorkspaceBridgeResult = {
  ok: boolean;
  actionId?: string;
  error?: string;
};
type AssistantWorkspaceBridge = {
  postMessage: (
    type: AssistantWorkspaceMessageType,
    payload?: Record<string, unknown>,
  ) => Promise<AssistantWorkspaceBridgeResult>;
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
const ASSISTANT_WORKSPACE_BRIDGE_KEY = ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY;
const MAX_WORKSPACE_PUBLICATION_LIFECYCLES = 256;
const localize = getStringOrFallback;

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
      owner: "acp-sidebar",
      scope: "acp-skill-run",
      displayGroupKey: `acp-skill-run:${key}:waiting`,
      relatedHandles: {
        skillRunId: run.requestId,
        workflowRunId: run.runId,
      },
    });
  }
  host.lastAcpSkillWaitingToastKeys = nextKeys;
}

function acpSkillRunChangeKinds(change?: AcpSkillRunWorkspaceChange) {
  return Array.isArray(change?.kinds) ? change.kinds : [];
}

function isPureAcpSkillRunBackgroundChange(
  change?: AcpSkillRunWorkspaceChange,
) {
  if (!change || change.global === true) {
    return false;
  }
  const kinds = acpSkillRunChangeKinds(change);
  return (
    kinds.length > 0 &&
    kinds.every((kind) => kind === "transcript" || kind === "runtime-options")
  );
}

function scheduleAcpSkillRunPublications(
  host: AssistantWorkspaceHostRuntime,
  change?: AcpSkillRunWorkspaceChange,
) {
  if (!change) return;
  host.publicationRuntime?.schedule({
    adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
    change,
    context: undefined,
  });
}

function transcriptRebasePageRequest(
  owner: AssistantWorkspaceOwner,
  pageKey: string,
) {
  const suffix = pageKey.startsWith(`${owner.ownerKey}\n`)
    ? pageKey.slice(owner.ownerKey.length + 1)
    : "";
  const tail = /^tail:(\d+)$/.exec(suffix);
  if (tail) {
    return { cursor: undefined, limit: Math.max(1, Number(tail[1]) || 80) };
  }
  const cursor = /^cursor:(\d+):(\d+)$/.exec(suffix);
  if (cursor) {
    return {
      cursor: Math.max(0, Number(cursor[1]) || 0),
      limit: Math.max(1, Number(cursor[2]) || 80),
    };
  }
  return { cursor: undefined, limit: 80 };
}

function updateAssistantAttentionIndicator(
  host: AssistantWorkspaceHostRuntime,
) {
  const waitingCount = countWaitingTasks();
  updateAssistantToolbarAttention(host.win, waitingCount);
}

function deactivateWorkspacePublicationRuntime(
  host: AssistantWorkspaceHostRuntime,
) {
  host.pendingSnapshotTab = undefined;
  host.publicationRuntime?.deactivate();
  for (const lifecycle of host.publicationLifecycles.values()) {
    if (lifecycle.state !== "pending") continue;
    lifecycle.state = "rejected";
    lifecycle.reason = "superseded";
  }
  trimWorkspacePublicationLifecycles(host);
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
    deactivateWorkspacePublicationRuntime(host);
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

function skillRunnerDrawerGroupCollapseKey(
  sectionId: string,
  group: {
    backendId?: string;
    backendDisplayName?: string;
    title?: string;
  },
) {
  const section = String(sectionId || "").trim();
  const backend =
    String(group.backendId || "").trim() ||
    String(group.backendDisplayName || "").trim() ||
    String(group.title || "").trim();
  return section && backend ? `${section}\n${backend}` : "";
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
  const decoratedSections = sections.map((section) => ({
    id: section.id,
    title:
      section.id === "completed"
        ? localize("task-dashboard-run-completed-tasks-title", "Completed")
        : localize("task-dashboard-run-running-tasks-title", "Running"),
    collapsed: section.collapsed,
    groups: section.groups.map((group) => {
      const collapseKey = skillRunnerDrawerGroupCollapseKey(section.id, group);
      const collapsed = collapseKey
        ? (host.drawerGroupCollapsed.get(collapseKey) ?? group.collapsed)
        : group.collapsed;
      return {
        ...group,
        collapsed,
      };
    }),
  }));
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
      executionDisplayMode: getAssistantExecutionDisplayMode(),
      drawer: {
        open: host.drawerOpen,
        notice: snapshot.drawer?.notice,
        truncated: snapshot.drawer?.truncated,
        sections: decoratedSections,
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
  postShellMessage(host, ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_SNAPSHOT, {
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
    if (action === "toggle-drawer-group") {
      const sectionId = String(envelope.payload?.sectionId || "").trim();
      const backend =
        String(envelope.payload?.groupKey || "").trim() ||
        String(envelope.payload?.backendId || "").trim();
      const collapseKey =
        sectionId && backend ? `${sectionId}\n${backend}` : "";
      if (collapseKey) {
        host.drawerGroupCollapsed.set(
          collapseKey,
          envelope.payload?.collapsed !== true,
        );
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
    String(type || "").startsWith(ASSISTANT_WORKSPACE_MESSAGE_PREFIX)
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
    return false;
  }
  installShellBridge(host);
  const messagePayload = payload || {};
  logAssistantWorkspaceDebug(
    host,
    "shell-post",
    "Assistant Workspace shell message posted.",
    {
      type,
      tab: String(messagePayload.tab || ""),
      phase: String(messagePayload.phase || ""),
    },
  );
  const profilerPublication =
    type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_PUBLICATION &&
    messagePayload.publication &&
    typeof messagePayload.publication === "object"
      ? (messagePayload.publication as unknown as AssistantWorkspacePublication)
      : null;
  const metricPublication = profilerPublication;
  const profilerPublicationId = String(
    metricPublication?.publicationId || "",
  ).trim();
  const requestId = metricPublication ? metricPublication.owner.ownerKey : "";
  const profilerLabels = {
    ...(metricPublication
      ? {
          ...assistantWorkspacePublicationMetricLabels(
            metricPublication.owner.source,
            metricPublication.publicationKind,
            "matching-target",
            metricPublication.publicationCause === "initialization"
              ? "initialization"
              : "steady-state",
          ),
          publicationSurface: metricPublication.owner.source,
          publicationForm: metricPublication.publicationForm,
          publicationCause: metricPublication.publicationCause,
          publicationDeliverySequence: String(
            metricPublication.deliverySequence,
          ),
        }
      : {
          operationClass: "panel" as const,
          publicationKind: "owner-control" as const,
          publicationCausality:
            messagePayload.tab === host.activeTab
              ? ("matching-target" as const)
              : ("opposite-active" as const),
          publicationPhase:
            messagePayload.phase === "init"
              ? ("initialization" as const)
              : ("steady-state" as const),
        }),
    ...(profilerPublicationId ? { publicationId: profilerPublicationId } : {}),
  };
  const startedAt =
    profilerPublication &&
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? readAcpRuntimePerformanceClockMs()
      : 0;
  const message = { type, payload: messagePayload };
  frameWindow.postMessage(message, "*");
  if (
    profilerPublication &&
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    incrementAcpRuntimeMetric(requestId, "panel_post", profilerLabels);
    incrementAcpRuntimeMetric(
      requestId,
      "panel_post_bytes",
      profilerLabels,
      new TextEncoder().encode(JSON.stringify(message)).byteLength,
    );
    observeAcpRuntimeDuration(
      requestId,
      "panel_post_duration",
      profilerLabels,
      readAcpRuntimePerformanceClockMs() - startedAt,
    );
  }
  return true;
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
  if (
    host.readyTabs.size === 0 &&
    host.readyTabGenerations.size === 0 &&
    host.childInitInFlight.size === 0
  ) {
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "child-ready-state-clear",
    "Assistant Workspace child ready state cleared.",
    { reason, readyTabs: Array.from(host.readyTabs) },
  );
  host.readyTabs.clear();
  host.readyTabGenerations.clear();
  host.childInitInFlight.clear();
}

function clearAssistantWorkspaceInitPublicationState(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (
    !host.workspaceInitDelivery &&
    !host.workspaceInitInFlight &&
    host.childInitDeliveries.size === 0
  ) {
    return;
  }
  logAssistantWorkspaceDebug(
    host,
    "workspace-init-publication-clear",
    "Assistant Workspace init publication state cleared.",
    {
      reason,
      workspaceInitTarget: host.workspaceInitDelivery?.target || "",
      workspaceInitInFlightTarget: host.workspaceInitInFlight?.target || "",
      childInitTabs: Array.from(host.childInitDeliveries.keys()),
    },
  );
  host.workspaceInitDelivery = null;
  host.workspaceInitInFlight = null;
  host.childInitDeliveries.clear();
}

function hasPublishedWorkspaceBaselineInit(
  host: AssistantWorkspaceHostRuntime,
) {
  const frameWindow = resolveCurrentShellWindow(host);
  return (
    !!frameWindow &&
    !!host.activeTarget &&
    host.workspaceInitDelivery?.frameWindow === frameWindow &&
    host.workspaceInitDelivery.target === host.activeTarget
  );
}

function markWorkspaceBaselineInitPublished(args: {
  host: AssistantWorkspaceHostRuntime;
  frameWindow: Window;
  target: AcpSidebarTarget;
}) {
  const { host, frameWindow, target } = args;
  if (
    resolveCurrentShellWindow(host) === frameWindow &&
    host.activeTarget === target
  ) {
    host.workspaceInitDelivery = {
      frameWindow,
      target,
    };
  }
}

function hasPublishedChildBaselineInit(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab,
) {
  const documentGeneration = host.readyTabGenerations.get(tab);
  const delivery = host.childInitDeliveries.get(tab);
  return (
    !!documentGeneration &&
    !!host.activeTarget &&
    delivery?.documentGeneration === documentGeneration &&
    delivery.target === host.activeTarget
  );
}

function markChildBaselineInitPublished(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab,
  target: AcpSidebarTarget,
  documentGeneration = host.readyTabGenerations.get(tab),
) {
  if (
    documentGeneration &&
    host.activeTarget === target &&
    host.readyTabGenerations.get(tab) === documentGeneration
  ) {
    host.childInitDeliveries.set(tab, {
      documentGeneration,
      target,
    });
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
    type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION &&
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

async function acceptAssistantShellReady(host: AssistantWorkspaceHostRuntime) {
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
  await ensureAssistantWorkspaceBaselineInit(host, "shell-ready");
}

async function ensureAssistantWorkspaceBaselineInit(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  const frameWindow = resolveCurrentShellWindow(host);
  const target = host.activeTarget;
  if (!frameWindow || !target || !host.shell.ready) return false;
  if (hasPublishedWorkspaceBaselineInit(host)) return true;
  const existing = host.workspaceInitInFlight;
  if (existing?.frameWindow === frameWindow && existing.target === target) {
    return existing.promise;
  }
  const promise = publishAssistantWorkspaceStatePulse(host, reason);
  const inFlight = { frameWindow, target, promise };
  host.workspaceInitInFlight = inFlight;
  try {
    const delivered = await promise;
    if (delivered && host.workspaceInitInFlight === inFlight) {
      markWorkspaceBaselineInitPublished({ host, frameWindow, target });
    }
    return delivered;
  } finally {
    if (host.workspaceInitInFlight === inFlight) {
      host.workspaceInitInFlight = null;
    }
  }
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

function trimWorkspacePublicationLifecycles(
  host: AssistantWorkspaceHostRuntime,
) {
  if (!host.publicationLifecycles) return;
  while (
    host.publicationLifecycles.size > MAX_WORKSPACE_PUBLICATION_LIFECYCLES
  ) {
    const completed = [...host.publicationLifecycles.values()].find(
      (entry) => entry.state !== "pending",
    );
    if (!completed) return;
    host.publicationLifecycles.delete(completed.publicationId);
  }
}

function registerWorkspacePublication(
  host: AssistantWorkspaceHostRuntime,
  source: "acp-chat" | "acp-skills",
  publicationId: string,
  publication?: AssistantWorkspacePublication,
) {
  host.publicationLifecycles ||= new Map();
  host.publicationLifecycles.set(publicationId, {
    publicationId,
    state: "pending",
    reason: null,
    failure: null,
    acknowledgements: new Set<string>(),
    ownerKey: publication?.owner.ownerKey || "",
    source: publication?.owner.source || source,
    kind: publication?.publicationKind || "owner-control",
    cause: publication?.publicationCause || "initialization",
    form: publication?.publicationForm || "snapshot",
    deliverySequence: publication?.deliverySequence || 0,
    postedAtMs:
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
        ? readAcpRuntimePerformanceClockMs()
        : 0,
  });
  trimWorkspacePublicationLifecycles(host);
}

function assistantWorkspacePublicationMetricLabels(
  surface: "acp-chat" | "acp-skills",
  kind: AssistantWorkspacePublicationKind,
  causality:
    | "matching-target"
    | "opposite-active"
    | "inactive-source"
    | "owner-mismatch" = "matching-target",
  phase: "initialization" | "steady-state" = "steady-state",
) {
  return {
    operationClass: "panel" as const,
    publicationKind: kind,
    publicationCausality: causality,
    publicationPhase: phase,
    publicationSurface: surface,
  };
}

function acpChatWorkspaceSurfaceContext(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
  return {
    target,
    activeTab: host.activeTab,
    hasActiveTarget: !!host.activeTarget,
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
    executionDisplayMode: getAssistantExecutionDisplayMode(),
  };
}

async function initializeAcpChatWorkspaceSurface(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  cause: "initialization" | "activation" | "owner-switch",
) {
  const publicationIds = await host.publicationRuntime?.initialize({
    adapter: ACP_CHAT_WORKSPACE_ADAPTER,
    context: acpChatWorkspaceSurfaceContext(host, target),
    cause,
    serviceStatus: readAssistantWorkspaceServiceStatus(),
  });
  return publicationIds?.at(-1);
}

async function initializeAcpSkillsWorkspaceSurface(
  host: AssistantWorkspaceHostRuntime,
  cause: "initialization" | "activation" | "owner-switch",
) {
  const publicationIds = await host.publicationRuntime?.initialize({
    adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
    context: undefined,
    cause,
    serviceStatus: readAssistantWorkspaceServiceStatus(),
  });
  return publicationIds?.at(-1);
}

function scheduleAcpChatPublications(
  host: AssistantWorkspaceHostRuntime,
  change: AcpChatWorkspaceChange,
) {
  const context = {
    target: host.activeTarget || ("library" as const),
    activeTab: host.activeTab,
    hasActiveTarget: !!host.activeTarget,
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
    executionDisplayMode: getAssistantExecutionDisplayMode(),
  };
  host.publicationRuntime?.schedule({
    adapter: ACP_CHAT_WORKSPACE_ADAPTER,
    change,
    context,
  });
}

function getActiveAcpChatOwnerKey() {
  const { backendId, conversationId } = getActiveAcpChatOwner();
  if (!backendId) return "";
  return conversationId
    ? acpChatTranscriptPageKey(backendId, conversationId)
    : `${backendId}\n`;
}

async function runAcpChatBackendRefreshBoundary(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
) {
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
    host.acpChatBackendRefreshTimer = null;
    logAssistantWorkspaceDebug(
      host,
      "acp-chat-backend-refresh-settle",
      "ACP Chat backend refresh boundary settled.",
      { target },
    );
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
  if (host.acpChatBackendRefreshTimer) {
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

async function postSnapshotForTab(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  tab: AssistantWorkspaceTab,
  phase: "init" | "snapshot" = "snapshot",
  options?: { force?: boolean },
) {
  if (tab === "acp-chat") {
    if (options?.force === true || phase === "init") {
      return !!(await initializeAcpChatWorkspaceSurface(
        host,
        target,
        phase === "init" ? "initialization" : "activation",
      ));
    }
    const ownerKey = getActiveAcpChatOwnerKey();
    if (ownerKey) {
      const [backendId, conversationId] = ownerKey.split("\n", 2);
      const owner = createAcpChatWorkspaceOwner(backendId, conversationId);
      const context = acpChatWorkspaceSurfaceContext(host, target);
      const results = await Promise.all([
        host.publicationRuntime?.publishRegions({
          adapter: ACP_CHAT_WORKSPACE_ADAPTER,
          owner,
          context,
          kinds: ["owner-control"],
          cause: "activation",
        }),
        host.publicationRuntime?.requestTranscriptPage({
          adapter: ACP_CHAT_WORKSPACE_ADAPTER,
          owner,
          context,
          cause: "activation",
        }),
      ]);
      return results.some((result) =>
        Array.isArray(result) ? result.length > 0 : Boolean(result),
      );
    }
    return false;
  }
  if (tab === "acp-skills") {
    if (options?.force === true || phase === "init") {
      return !!(await initializeAcpSkillsWorkspaceSurface(
        host,
        phase === "init" ? "initialization" : "activation",
      ));
    }
    return !!(await initializeAcpSkillsWorkspaceSurface(host, "activation"));
  }
  postSkillRunnerSnapshot(host, phase, options);
  return true;
}

function canPublishAssistantWorkspaceStatePulse(
  host: AssistantWorkspaceHostRuntime,
) {
  if (!host.activeTarget) {
    return false;
  }
  return host.shell.ready && !!resolveCurrentShellWindow(host);
}

function shouldRefreshAcpChatBackendsForWorkspacePulse(reason: string) {
  return reason === "shell-ready";
}

function postShellInit(
  host: AssistantWorkspaceHostRuntime,
  activeTab: AssistantWorkspaceTab,
) {
  postShellMessage(host, ASSISTANT_WORKSPACE_MESSAGE_TYPES.INIT, {
    activeTab,
    activeTarget: host.activeTarget,
    scopeKey: host.scopeKey,
    surfaceConfiguration: assistantWorkspaceAcpRuntimeConfiguration(),
    surfaceLabels: {
      "acp-chat": buildAssistantWorkspacePublicationLabels("acp-chat"),
      "acp-skills": buildAssistantWorkspacePublicationLabels("acp-skills"),
    },
  });
}

function assistantWorkspaceAcpRuntimeConfiguration(): AssistantWorkspacePublicationRuntimeConfiguration {
  return {
    executionDisplayMode: getAssistantExecutionDisplayMode(),
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
    actionRegistry: ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  };
}

function postAssistantWorkspacePublicationConfiguration(
  host: AssistantWorkspaceHostRuntime,
) {
  return postShellMessage(
    host,
    ASSISTANT_WORKSPACE_MESSAGE_TYPES.SURFACE_CONFIG,
    {
      configuration: assistantWorkspaceAcpRuntimeConfiguration(),
    },
  );
}

async function postInitialSnapshotForActiveTab(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "init",
) {
  const tab = host.activeTab;
  const documentGeneration = host.readyTabGenerations.get(tab);
  await postSnapshotForTab(host, target, tab, phase, { force: true });
  if (phase === "init") {
    markChildBaselineInitPublished(host, tab, target, documentGeneration);
  }
}

async function publishAssistantWorkspaceStatePulse(
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
    const documentGeneration = host.readyTabGenerations.get(tab);
    if (reason === "child-ready") {
      host.readyTabs.add(tab);
    }
    await postSnapshotForTab(host, target, tab, phase, {
      force: reason === "child-ready" || reason === "tab-switch",
    });
    if (
      phase === "init" &&
      documentGeneration &&
      host.readyTabGenerations.get(tab) === documentGeneration
    ) {
      markChildBaselineInitPublished(host, tab, target, documentGeneration);
    }
    return true;
  }
  if (phase === "init") {
    await postInitialSnapshotForActiveTab(host, target, phase);
    return true;
  }
  await postSnapshotForTab(host, target, host.activeTab, phase, {
    force: reason === "child-ready" || reason === "tab-switch",
  });
  return true;
}

async function flushScheduledWorkspacePost(
  host: AssistantWorkspaceHostRuntime,
) {
  await host.publicationRuntime?.flush();
  const tab = host.pendingSnapshotTab;
  host.pendingSnapshotTab = undefined;
  if (!tab || host.activeTab !== tab || !host.activeTarget) return;
  postSnapshotForTab(host, host.activeTarget, tab, "snapshot");
}

function schedulePostSnapshot(
  host: AssistantWorkspaceHostRuntime,
  tab: AssistantWorkspaceTab = host.activeTab,
) {
  host.pendingSnapshotTab = tab;
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
    void flushScheduledWorkspacePost(host);
  }, 16);
}

export function inspectAssistantWorkspaceReplayPostSnapshotTimer(args: {
  window?: _ZoteroTypes.MainWindow;
  expectedTab: "acp-chat" | "acp-skills";
  expectedChatOwner?: { backendId: string; conversationId: string };
  expectedSkillRequestIds?: readonly string[];
}): import("./acpRuntimeReplayLogicalTime").AcpRuntimeReplayLogicalTimerInspection {
  if (
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) ||
    !__acp_runtime_replay_profiler_enabled__
  ) {
    return { timers: [], warnings: [] };
  }
  const win =
    args.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? hosts.get(win) : undefined;
  if (!host) {
    return {
      timers: [],
      warnings: ["logical-timer-contamination:workspace-host-missing"],
    };
  }
  if (!host.activeTarget || host.activeTab !== args.expectedTab) {
    return {
      timers: [],
      warnings: ["logical-timer-contamination:workspace-target"],
    };
  }
  let ownerKey = "";
  if (args.expectedChatOwner) {
    const chat = getActiveAcpChatOwner();
    if (
      chat.backendId !== args.expectedChatOwner.backendId ||
      chat.conversationId !== args.expectedChatOwner.conversationId
    ) {
      return {
        timers: [],
        warnings: ["logical-timer-contamination:workspace-chat-owner"],
      };
    }
    ownerKey = `${args.expectedChatOwner.backendId}\n${args.expectedChatOwner.conversationId}`;
  } else {
    const requestIds = Array.from(
      new Set(args.expectedSkillRequestIds || []),
    ).sort();
    if (!requestIds.includes(getSelectedAcpSkillRunRequestId())) {
      return {
        timers: [],
        warnings: ["logical-timer-contamination:workspace-skill-owner"],
      };
    }
    ownerKey = requestIds.join("\n");
  }
  const runtimeToken = host.publicationRuntime?.inspectTimer() || null;
  const nativeToken = runtimeToken || host.postSnapshotTimer;
  if (!nativeToken) return { timers: [], warnings: [] };
  const runtimeOwned = runtimeToken === nativeToken;
  let currentToken = nativeToken;
  return {
    warnings: [],
    timers: [
      {
        domain: "assistant-workspace-post-snapshot",
        ownerKey,
        delayMs: 16,
        nativeToken,
        detachNative: () => {
          if (
            hosts.get(host.win) !== host ||
            (runtimeOwned
              ? !host.publicationRuntime?.ownsTimer(currentToken)
              : host.postSnapshotTimer !== currentToken)
          ) {
            return false;
          }
          clearTimeout(currentToken);
          return true;
        },
        fireIfCurrent: () => {
          if (
            hosts.get(host.win) !== host ||
            (runtimeOwned
              ? !host.publicationRuntime?.ownsTimer(currentToken)
              : host.postSnapshotTimer !== currentToken)
          ) {
            return false;
          }
          if (!runtimeOwned) host.postSnapshotTimer = null;
          logAssistantWorkspaceDebug(
            host,
            "snapshot-post-fired",
            "Assistant Workspace scheduled snapshot post fired.",
          );
          if (runtimeOwned) {
            void host.publicationRuntime?.flush();
          } else {
            flushScheduledWorkspacePost(host);
          }
          return true;
        },
        resumeNative: (remainingMs) => {
          if (
            hosts.get(host.win) !== host ||
            (runtimeOwned
              ? !host.publicationRuntime?.ownsTimer(currentToken)
              : host.postSnapshotTimer !== currentToken)
          ) {
            return false;
          }
          if (runtimeOwned) {
            const replacement = host.publicationRuntime?.rescheduleFlush(
              currentToken,
              remainingMs,
            );
            if (!replacement) return false;
            currentToken = replacement;
            return true;
          }
          currentToken = setTimeout(
            () => {
              host.postSnapshotTimer = null;
              logAssistantWorkspaceDebug(
                host,
                "snapshot-post-fired",
                "Assistant Workspace scheduled snapshot post fired.",
              );
              flushScheduledWorkspacePost(host);
            },
            Math.max(0, remainingMs),
          );
          host.postSnapshotTimer = currentToken;
          return true;
        },
      },
    ],
  };
}

function setAssistantWorkspaceExecutionDisplayMode(
  host: AssistantWorkspaceHostRuntime,
  mode: unknown,
) {
  if (!isAssistantExecutionDisplayMode(mode)) {
    return getAssistantExecutionDisplayMode();
  }
  host.streamingRenderPreferenceLocalWriteDepth += 1;
  try {
    const next = setAssistantExecutionDisplayMode(mode);
    postAssistantWorkspacePublicationConfiguration(host);
    if (host.activeTarget && host.activeTab === "acp-chat") {
      const ownerKey = getActiveAcpChatOwnerKey();
      if (ownerKey) {
        const [backendId, conversationId] = ownerKey.split("\n", 2);
        void host.publicationRuntime?.requestTranscriptPage({
          adapter: ACP_CHAT_WORKSPACE_ADAPTER,
          owner: createAcpChatWorkspaceOwner(backendId, conversationId),
          context: acpChatWorkspaceSurfaceContext(host, host.activeTarget),
          cause: "rebase",
          force: true,
        });
      }
    } else if (host.activeTarget && host.activeTab === "acp-skills") {
      const requestId = getSelectedAcpSkillRunRequestId();
      if (requestId) {
        void host.publicationRuntime?.requestTranscriptPage({
          adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
          owner: createAcpSkillsWorkspaceOwner(requestId),
          context: undefined,
          cause: "rebase",
          force: true,
        });
      }
    }
    return next;
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
      : ({} as AssistantWorkspaceActionPayload);
  const actionId = String(actionPayload.actionId || "").trim();
  const action = String(actionPayload.action || "").trim();
  const tab = actionPayload.source
    ? normalizeTab(actionPayload.source)
    : normalizeTab(actionPayload.tab);
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
    data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION &&
    action === "ready" &&
    host.shell.ready;
  const duplicateChildReady =
    data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_ACTION &&
    action === "ready" &&
    host.readyTabs.has(tab);
  try {
    if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.PUBLICATION_ACK) {
      recordWorkspacePublicationAck(host, actionPayload);
      return { ok: true, actionId };
    }
    if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION) {
      await handleShellAction(
        host,
        target,
        (data.payload || {}) as AssistantWorkspaceShellActionEnvelope,
      );
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
    if (data.type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_ACTION) {
      await handleChildAction(
        host,
        target,
        (data.payload || {}) as AssistantWorkspaceChildActionEnvelope,
      );
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
  if (type === ASSISTANT_WORKSPACE_MESSAGE_TYPES.ACTION) {
    const tabText = String(payload.tab || "").trim();
    return tabText ? normalizeTab(tabText) : "shell";
  }
  return payload.source
    ? normalizeTab(payload.source)
    : normalizeTab(payload.tab);
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
  target: AcpSidebarTarget,
  payload: AssistantWorkspaceShellActionEnvelope,
) {
  const action = String(payload.action || "").trim();
  logAssistantWorkspaceDebug(
    host,
    "shell-action-start",
    "Assistant Workspace shell action handling started.",
    { action, requestedTab: String(payload.tab || "") },
  );
  if (action === "ready") {
    await acceptAssistantShellReady(host);
    return;
  }
  if (action === "set-tab") {
    const tab = normalizeTab(payload.tab);
    host.activeTab = tab;
    if (tab !== "skillrunner") {
      clearSkillRunnerSidebarRefresh(host);
      detachSkillRunnerFromShell(host, "tab-switch-away");
    }
    if (tab === "acp-chat") {
      await preloadAcpChatBackendsForWorkspaceInit(host, target);
    }
    await publishAssistantWorkspaceStatePulse(host, "tab-switch", tab);
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

function parseAssistantWorkspaceActionOwner(
  source: "acp-chat" | "acp-skills",
  value: unknown,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const owner = value as Record<string, unknown>;
  if (owner.source !== source) return null;
  if (
    source === "acp-chat" &&
    Object.keys(owner).sort().join(",") ===
      "backendId,conversationId,ownerKey,source"
  ) {
    const backendId = String(owner.backendId || "").trim();
    const conversationId = String(owner.conversationId || "").trim();
    const expected = `${backendId}\n${conversationId}`;
    return backendId &&
      conversationId &&
      String(owner.ownerKey || "") === expected
      ? createAcpChatWorkspaceOwner(backendId, conversationId)
      : null;
  }
  if (
    source === "acp-skills" &&
    Object.keys(owner).sort().join(",") === "ownerKey,requestId,source"
  ) {
    const requestId = String(owner.requestId || "").trim();
    return requestId && String(owner.ownerKey || "") === requestId
      ? createAcpSkillsWorkspaceOwner(requestId)
      : null;
  }
  return null;
}

async function handleChildAction(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  payload: AssistantWorkspaceChildActionEnvelope,
) {
  const source =
    payload.source === "acp-chat" || payload.source === "acp-skills"
      ? payload.source
      : null;
  if (
    source &&
    Object.keys(payload).sort().join(",") !==
      "action,actionId,owner,payload,source"
  ) {
    return;
  }
  const tab = source || normalizeTab(payload.tab);
  const action = String(payload.action || "").trim();
  const childPayload =
    payload.payload &&
    typeof payload.payload === "object" &&
    !Array.isArray(payload.payload)
      ? (payload.payload as Record<string, unknown>)
      : {};
  const owner = source
    ? parseAssistantWorkspaceActionOwner(source, payload.owner)
    : null;
  const ownerPayload: Record<string, unknown> =
    owner?.source === "acp-chat"
      ? {
          backendId: owner.backendId,
          conversationId: owner.conversationId,
        }
      : owner?.source === "acp-skills"
        ? { requestId: owner.requestId }
        : {};
  const actionPayload = { ...childPayload, ...ownerPayload };
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
  if (action === "publication-ack") {
    recordWorkspacePublicationAck(host, childPayload);
    return;
  }
  if (action === "publication-render-observation") {
    recordWorkspacePublicationRenderObservation(host, childPayload);
    return;
  }
  if (action === "ready") {
    const documentGeneration =
      String(childPayload.documentGeneration || "").trim() || `${tab}:document`;
    const duplicateGeneration =
      host.readyTabGenerations.get(tab) === documentGeneration;
    host.readyTabGenerations.set(tab, documentGeneration);
    host.readyTabs.add(tab);
    const inFlight = host.childInitInFlight.get(tab);
    if (duplicateGeneration && inFlight) {
      await inFlight;
      return;
    }
    if (duplicateGeneration && hasPublishedChildBaselineInit(host, tab)) {
      logAssistantWorkspaceDebug(
        host,
        "child-ready-duplicate",
        "Assistant Workspace duplicate child ready ignored.",
        { target, tab, documentGeneration },
      );
      return;
    }
    if (source && tab !== host.activeTab) {
      logAssistantWorkspaceDebug(
        host,
        "child-ready-inactive-source",
        "Assistant Workspace inactive ACP child registered without reading its source.",
        { target, tab, documentGeneration },
      );
      return;
    }
    const workspaceInit = host.workspaceInitInFlight;
    if (
      workspaceInit &&
      workspaceInit.frameWindow === resolveCurrentShellWindow(host) &&
      workspaceInit.target === host.activeTarget
    ) {
      await workspaceInit.promise;
      if (
        host.readyTabGenerations.get(tab) === documentGeneration &&
        hasPublishedWorkspaceBaselineInit(host)
      ) {
        markChildBaselineInitPublished(host, tab, target, documentGeneration);
        return;
      }
    }
    const init = publishAssistantWorkspaceStatePulse(
      host,
      "child-ready",
      tab,
      "init",
    );
    host.childInitInFlight.set(tab, init);
    try {
      await init;
    } finally {
      if (host.childInitInFlight.get(tab) === init) {
        host.childInitInFlight.delete(tab);
      }
    }
    return;
  }
  if (tab === "skillrunner") {
    if (action === "set-execution-display-mode") {
      setAssistantWorkspaceExecutionDisplayMode(host, childPayload.mode);
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
      type: resolveRunDialogMessageType("skillrunner-sidebar", "action"),
      action,
      payload: childPayload,
    });
    return;
  }
  const actionRoute = source
    ? ASSISTANT_WORKSPACE_ACTION_REGISTRY[
        action as keyof typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY
      ]
    : null;
  if (
    source &&
    (!actionRoute ||
      !actionRoute.sources.includes(source as never) ||
      Object.keys(childPayload).sort().join(",") !==
        [...actionRoute.payloadKeys].sort().join(","))
  ) {
    return;
  }
  if (
    source &&
    (actionRoute?.scope === "target-owner" ||
      actionRoute?.scope === "selected-owner") !== Boolean(owner)
  ) {
    return;
  }
  if (
    source &&
    (actionRoute?.scope === "navigation-group" ||
      actionRoute?.scope === "global") &&
    owner
  ) {
    return;
  }
  if (source && action === "set-execution-display-mode") {
    setAssistantWorkspaceExecutionDisplayMode(host, childPayload.mode);
    return;
  }
  if (
    owner &&
    ![
      "set-active-conversation",
      "set-active-backend",
      "select-run",
      "archive-conversation",
      "archive-run",
      "load-transcript-page",
    ].includes(action)
  ) {
    const selectedOwnerKey =
      owner.source === "acp-chat"
        ? getActiveAcpChatOwnerKey()
        : getSelectedAcpSkillRunRequestId();
    if (owner.ownerKey !== selectedOwnerKey) return;
  }
  if (action === "load-transcript-page") {
    const pageRequest = parseAssistantWorkspaceTranscriptPageRequest({
      owner,
      request: childPayload.request,
    });
    if (!pageRequest || pageRequest.owner.source !== tab) {
      logAssistantWorkspaceDebug(
        host,
        "transcript-page-request-drop",
        "Assistant Workspace transcript page request ignored because its canonical owner is invalid.",
        { tab, payload: childPayload },
      );
      return;
    }
    if (pageRequest.owner.source === "acp-skills") {
      const requestId = pageRequest.owner.requestId;
      const selectedRequestId = getSelectedAcpSkillRunRequestId();
      if (requestId !== selectedRequestId) {
        logAssistantWorkspaceDebug(
          host,
          "transcript-page-request-drop-owner-mismatch",
          "Assistant Workspace transcript page request ignored because its owner is not selected.",
          { tab, ownerKey: pageRequest.owner.ownerKey, selectedRequestId },
        );
        return;
      }
      await host.publicationRuntime?.requestTranscriptPage({
        adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
        owner: pageRequest.owner,
        context: undefined,
        request: {
          cursor: pageRequest.request.cursor ?? undefined,
          limit: pageRequest.request.limit,
        },
        cause: "page-request",
      });
      return;
    }
    if (pageRequest.owner.ownerKey !== getActiveAcpChatOwnerKey()) {
      logAssistantWorkspaceDebug(
        host,
        "transcript-page-request-drop-owner-mismatch",
        "Assistant Workspace transcript page request ignored because its owner is not active.",
        { tab, ownerKey: pageRequest.owner.ownerKey },
      );
      return;
    }
    await host.publicationRuntime?.requestTranscriptPage({
      adapter: ACP_CHAT_WORKSPACE_ADAPTER,
      owner: pageRequest.owner,
      context: acpChatWorkspaceSurfaceContext(host, target),
      request: {
        cursor: pageRequest.request.cursor ?? undefined,
        limit: pageRequest.request.limit,
      },
      cause: "page-request",
    });
    return;
  }
  if (action === "request-owner-details" && owner) {
    if (owner.source === "acp-skills") {
      await host.publicationRuntime?.requestOwnerDetails({
        adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
        owner,
        context: undefined,
      });
      return;
    }
    await host.publicationRuntime?.requestOwnerDetails({
      adapter: ACP_CHAT_WORKSPACE_ADAPTER,
      owner,
      context: acpChatWorkspaceSurfaceContext(host, target),
    });
    return;
  }
  if (source === "acp-chat" && actionRoute?.scope === "navigation-group") {
    const groupId = String(childPayload.groupId || "").trim();
    const navigation = getAcpChatWorkspaceOwnerNavigation();
    if (!navigation.groups.some((group) => group.groupId === groupId)) {
      return;
    }
    actionPayload.backendId = groupId;
  }
  if (tab === "acp-skills") {
    if (action === "select-run") {
      await selectAcpSkillRun(String(actionPayload.requestId || "").trim());
      return;
    }
    // The registry validation above narrows action to the source's routed
    // set; the no-source fallthrough stays defensive inside the routers.
    await handleAcpSkillRunAction(
      host,
      action as AcpSkillsHostRoutedAction,
      actionPayload,
    );
    return;
  }
  if (tab === "acp-chat") {
    if (
      action === "set-active-conversation" ||
      action === "set-active-backend" ||
      action === "new-conversation"
    ) {
      await handleAcpChatAction(
        host,
        target,
        action as AcpChatHostRoutedAction,
        actionPayload,
      );
      return;
    }
  }
  await handleAcpChatAction(
    host,
    target,
    action as AcpChatHostRoutedAction,
    actionPayload,
  );
}

function recordWorkspacePublicationAck(
  host: AssistantWorkspaceHostRuntime,
  payload: Record<string, unknown>,
) {
  try {
    assertAssistantWorkspacePublicationAck(payload);
  } catch {
    return;
  }
  const ack: AssistantWorkspacePublicationAck = payload;
  const publicationId = String(ack.publicationId || "").trim();
  host.publicationCoordinator?.acknowledge(ack);
  const lifecycle = host.publicationLifecycles.get(publicationId);
  const acknowledgementKey = [
    ack.stage,
    ack.outcome,
    ack.reason || "",
    ack.failure?.stage || "",
    ack.failure?.code || "",
  ].join(":");
  if (!lifecycle) {
    if (
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      recordAcpRuntimePublicationAck(null, ack);
    }
    return;
  }
  if (lifecycle.acknowledgements.has(acknowledgementKey)) return;
  lifecycle.acknowledgements.add(acknowledgementKey);
  if (ack.outcome === "rejected" && lifecycle.state === "pending") {
    lifecycle.state = "rejected";
    lifecycle.reason = ack.reason;
    lifecycle.failure = ack.failure;
  } else if (
    lifecycle.state === "pending" &&
    ack.stage === "render-complete" &&
    ack.outcome === "accepted"
  ) {
    lifecycle.state = "render-complete";
  }
  trimWorkspacePublicationLifecycles(host);

  if (
    !__acp_runtime_performance_profiler_enabled__ ||
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    return;
  }
  const ownerKey = lifecycle.ownerKey;
  if (!ownerKey) return;
  recordAcpRuntimePublicationAck(ownerKey, ack);
  if (ack.outcome !== "accepted") return;
  const labels = {
    operationClass: "panel" as const,
    publicationKind: lifecycle.kind,
    publicationCausality: "matching-target" as const,
    publicationPhase:
      lifecycle.cause === "initialization"
        ? ("initialization" as const)
        : ("steady-state" as const),
    publicationSurface: lifecycle.source,
    publicationForm: lifecycle.form,
    publicationCause: lifecycle.cause,
    publicationDeliverySequence: String(lifecycle.deliverySequence),
    publicationId,
  };
  if (ack.stage === "shell-forward") {
    incrementAcpRuntimeMetric(ownerKey, "panel_shell_forward", labels);
    return;
  }
  if (ack.stage === "child-apply") {
    incrementAcpRuntimeMetric(ownerKey, "panel_child_apply", labels);
    return;
  }
  if (ack.stage === "render-complete") {
    incrementAcpRuntimeMetric(ownerKey, "panel_render_ack", labels);
    if (lifecycle.postedAtMs > 0) {
      observeAcpRuntimeDuration(
        ownerKey,
        "panel_render_duration",
        labels,
        readAcpRuntimePerformanceClockMs() - lifecycle.postedAtMs,
      );
    }
  }
}

function recordWorkspacePublicationRenderObservation(
  host: AssistantWorkspaceHostRuntime,
  payload: Record<string, unknown>,
) {
  if (
    !__acp_runtime_performance_profiler_enabled__ ||
    !(typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    return;
  }
  const publicationId = String(payload.publicationId || "").trim();
  const lifecycle = host.publicationLifecycles.get(publicationId);
  if (!publicationId || !lifecycle || !lifecycle.ownerKey) return;
  const labels = {
    operationClass: "panel" as const,
    publicationKind: lifecycle.kind,
    publicationCausality: "matching-target" as const,
    publicationPhase:
      lifecycle.cause === "initialization"
        ? ("initialization" as const)
        : ("steady-state" as const),
    publicationSurface: lifecycle.source,
    publicationForm: lifecycle.form,
    publicationCause: lifecycle.cause,
    publicationDeliverySequence: String(lifecycle.deliverySequence),
    renderPath:
      payload.renderPath === "snapshot"
        ? ("snapshot" as const)
        : payload.renderPath === "recovery-full"
          ? ("recovery-full" as const)
          : ("incremental" as const),
    publicationId,
  };
  for (const [name, field] of [
    ["panel_render_inserted_rows", "insertedRows"],
    ["panel_render_updated_rows", "updatedRows"],
    ["panel_render_removed_rows", "removedRows"],
    ["panel_render_measured_rows", "measuredRows"],
  ] as const) {
    const value = Math.min(
      10_000,
      Math.max(0, Math.floor(Number(payload[field]) || 0)),
    );
    incrementAcpRuntimeMetric(lifecycle.ownerKey, name, labels, value);
  }
}

// Actions the ACP routers accept: the registry-routed actions for the source
// plus a defensive "ready" branch and dead routes without a known sender that
// predate the registry (see the TODO(contract) markers in the router bodies).
// The payload stays a merged record: handleChildAction merges the action
// payload with the owner identity fields (backendId/conversationId or
// requestId) before dispatch, and the routers keep their defensive runtime
// reads; the per-action payload shapes are contract-typed at the envelope
// boundary (src/shared/assistantActionContract.ts).
type AcpSkillsHostRoutedAction = AcpSkillsAction | "ready" | "end-session";
type AcpChatHostRoutedAction =
  | AcpChatAction
  | "ready"
  | "rename-conversation"
  | "reconnect"
  | "toggle-diagnostics"
  | "toggle-status-details";

async function handleAcpSkillRunAction(
  host: AssistantWorkspaceHostRuntime,
  action: AcpSkillsHostRoutedAction,
  payload: Record<string, unknown>,
) {
  try {
    if (action === "ready") {
      return;
    }
    if (action === "set-execution-display-mode") {
      setAssistantWorkspaceExecutionDisplayMode(host, payload.mode);
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
    // TODO(contract): host route without a known sender; verify and remove in a later phase
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
      copyText(JSON.stringify(getAcpSkillRunDiagnostics(requestId), null, 2));
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
      const requestId = String(payload.requestId || "").trim();
      const run = getAcpSkillRunWorkspaceReadModel(requestId);
      const workspaceDir = String(
        run?.workspaceDir || run?.runtimeDir || "",
      ).trim();
      if (workspaceDir) openFolderInSystemFileManager(workspaceDir);
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
  action: AcpChatHostRoutedAction,
  payload: Record<string, unknown>,
) {
  try {
    if (action === "ready") {
      return;
    }
    if (action === "set-execution-display-mode") {
      setAssistantWorkspaceExecutionDisplayMode(host, payload.mode);
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
    // TODO(contract): host route without a known sender; verify and remove in a later phase
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
    // TODO(contract): host route without a known sender; verify and remove in a later phase
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
    // TODO(contract): host route without a known sender; verify and remove in a later phase
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
    // TODO(contract): host route without a known sender; verify and remove in a later phase
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
      const backendId = String(payload.backendId || "").trim();
      const conversationId = String(payload.conversationId || "").trim();
      const session = getAcpChatWorkspaceReadModel(backendId, conversationId);
      const workspaceDir = String(
        session.agentWorkspaceDir ||
          session.sessionCwd ||
          session.workspaceDir ||
          session.runtimeDir ||
          "",
      ).trim();
      if (workspaceDir) openFolderInSystemFileManager(workspaceDir);
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
      postShellMessage(host, ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_SNAPSHOT, {
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
  clearAssistantWorkspaceInitPublicationState(host, "target-commit");
  setShellActiveTarget(host, target);
  setDockActive(host.library, "library", target === "library");
  setDockActive(host.reader, "reader", target === "reader");
  void ensureAssistantWorkspaceBaselineInit(host, "target-commit");
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
    if (host.activeTab === "acp-chat") {
      await preloadAcpChatBackendsForWorkspaceInit(host, "library");
    }
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
  if (host.activeTab === "acp-chat") {
    await preloadAcpChatBackendsForWorkspaceInit(host, "reader");
  }
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
    drawerGroupCollapsed: new Map<string, boolean>(),
    scopeKey: createAssistantSidebarScopeKey("assistant-sidebar-workspace"),
    snapshotRevision: 0,
    publicationLifecycles: new Map(),
    workspaceInitDelivery: null,
    workspaceInitInFlight: null,
    childInitDeliveries: new Map(),
    readyTabGenerations: new Map(),
    childInitInFlight: new Map(),
    streamingRenderPreferenceInitialized: false,
    streamingRenderPreferenceLocalWriteDepth: 0,
    shellHandshakeTimer: null,
    shellHandshakeAttempt: 0,
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
  host.publicationCoordinator = new AssistantWorkspacePublicationCoordinator({
    scopeKey: host.scopeKey,
    getActiveOwner(source) {
      if (!host.activeTarget || host.activeTab !== source) return null;
      if (source === "acp-chat") {
        const active = getActiveAcpChatOwner();
        return active.backendId && active.conversationId
          ? createAcpChatWorkspaceOwner(active.backendId, active.conversationId)
          : null;
      }
      const requestId = getSelectedAcpSkillRunRequestId();
      return requestId ? createAcpSkillsWorkspaceOwner(requestId) : null;
    },
    post(publication) {
      if (!host.shell.ready) return false;
      const posted = postShellMessage(
        host,
        ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_PUBLICATION,
        { publication },
      );
      if (posted) {
        registerWorkspacePublication(
          host,
          publication.owner.source,
          publication.publicationId,
          publication,
        );
      }
      return posted;
    },
    onTranscriptRebaseRequired({ owner, pageKey }) {
      const target = host.activeTarget;
      if (!target || host.activeTab !== owner.source) return;
      const request = transcriptRebasePageRequest(owner, pageKey);
      if (owner.source === "acp-chat") {
        if (getActiveAcpChatOwnerKey() !== owner.ownerKey) return;
        void host.publicationRuntime?.requestTranscriptPage({
          adapter: ACP_CHAT_WORKSPACE_ADAPTER,
          owner,
          context: acpChatWorkspaceSurfaceContext(host, target),
          request: {
            cursor: request.cursor,
            limit: request.limit,
          },
          cause: "rebase",
          force: true,
        });
        return;
      }
      if (getSelectedAcpSkillRunRequestId() !== owner.requestId) return;
      void host.publicationRuntime?.requestTranscriptPage({
        adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
        owner,
        context: undefined,
        request: {
          cursor: request.cursor,
          limit: request.limit,
        },
        cause: "rebase",
        force: true,
      });
    },
  });
  host.publicationRuntime = new AssistantWorkspacePublicationRuntime({
    coordinator: host.publicationCoordinator,
    activity(source) {
      if (!host.activeTarget) return "inactive-source";
      return host.activeTab === source ? "matching-target" : "opposite-active";
    },
    hooks: {
      onRequested({ owner, kinds, causality }) {
        if (
          !owner ||
          !__acp_runtime_performance_profiler_enabled__ ||
          !(typeof __debug_mode__ === "undefined"
            ? isDebugModeEnabled()
            : __debug_mode__)
        ) {
          return;
        }
        for (const kind of kinds) {
          incrementAcpRuntimeMetric(
            owner.ownerKey,
            "panel_requested",
            assistantWorkspacePublicationMetricLabels(
              owner.source,
              kind,
              causality,
            ),
          );
        }
      },
      onDropped({ owner, kinds, reason }) {
        if (
          !owner ||
          !__acp_runtime_performance_profiler_enabled__ ||
          !(typeof __debug_mode__ === "undefined"
            ? isDebugModeEnabled()
            : __debug_mode__)
        ) {
          return;
        }
        for (const kind of kinds) {
          incrementAcpRuntimeMetric(
            owner.ownerKey,
            "panel_dropped_before_build",
            assistantWorkspacePublicationMetricLabels(
              owner.source,
              kind,
              reason,
            ),
          );
        }
      },
      onMaterialized({
        owner,
        kind,
        cause,
        publicationForm,
        materializationSource,
      }) {
        if (
          !__acp_runtime_performance_profiler_enabled__ ||
          !(typeof __debug_mode__ === "undefined"
            ? isDebugModeEnabled()
            : __debug_mode__)
        ) {
          return;
        }
        incrementAcpRuntimeMetric(owner.ownerKey, "panel_materialization", {
          ...assistantWorkspacePublicationMetricLabels(
            owner.source,
            kind,
            "matching-target",
            cause === "initialization" ? "initialization" : "steady-state",
          ),
          publicationForm,
          publicationCause: cause,
          materializationSource,
        });
      },
      onOwnerCleared(owner) {
        for (const [publicationId, lifecycle] of host.publicationLifecycles) {
          if (
            lifecycle.source === owner.source &&
            lifecycle.ownerKey === owner.ownerKey
          ) {
            host.publicationLifecycles.delete(publicationId);
          }
        }
      },
    },
  });
  mountLibraryPane(host);
  mountReaderPane(host);
  host.removeAcpChatPanelSubscription = subscribeAcpChatWorkspaceChanges(
    (change) => {
      const pureBackgroundChange = isPureAcpChatBackgroundChange(change);
      if (!pureBackgroundChange) {
        updateAssistantAttentionIndicator(host);
      }
      scheduleAcpChatPublications(host, change);
    },
  );
  host.removeAcpSkillRunSubscription = subscribeAcpSkillRunWorkspaceChanges(
    (change) => {
      const pureBackgroundChange = isPureAcpSkillRunBackgroundChange(change);
      if (!pureBackgroundChange) {
        maybeShowAcpSkillWaitingToasts(host);
        updateAssistantAttentionIndicator(host);
      }
      scheduleAcpSkillRunPublications(host, change);
    },
  );
  host.removeTaskSubscription = subscribeWorkflowTaskChanges(() => {
    updateAssistantAttentionIndicator(host);
  });
  host.removeStreamingRenderPreferenceSubscription =
    subscribeAssistantExecutionDisplayMode(() => {
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
      postAssistantWorkspacePublicationConfiguration(host);
      if (host.activeTab === "skillrunner" && host.activeTarget) {
        scheduleSkillRunnerSidebarRefresh(host, host.activeTarget, {
          selectionChanged: false,
        });
        return;
      }
      if (host.activeTab === "acp-chat" && host.activeTarget) {
        const owner = ACP_CHAT_WORKSPACE_ADAPTER.selectedOwner();
        if (owner) {
          void host.publicationRuntime?.requestTranscriptPage({
            adapter: ACP_CHAT_WORKSPACE_ADAPTER,
            owner,
            context: acpChatWorkspaceSurfaceContext(host, host.activeTarget),
            cause: "rebase",
            force: true,
          });
        }
        return;
      }
      if (host.activeTab === "acp-skills") {
        const owner = ACP_SKILLS_WORKSPACE_ADAPTER.selectedOwner();
        if (owner) {
          void host.publicationRuntime?.requestTranscriptPage({
            adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
            owner,
            context: undefined,
            cause: "rebase",
            force: true,
          });
        }
        return;
      }
      schedulePostSnapshot(host, "skillrunner");
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
  host.removeAcpChatPanelSubscription?.();
  host.removeAcpSkillRunSubscription?.();
  host.removeTaskSubscription?.();
  host.removeStreamingRenderPreferenceSubscription?.();
  detachSkillRunnerFromShell(host, "remove-shell");
  if (host.postSnapshotTimer) {
    clearTimeout(host.postSnapshotTimer);
    host.postSnapshotTimer = null;
  }
  host.publicationRuntime?.reset();
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
  if (hasExplicitTab) {
    host.activeTab = normalizeTab(args?.tab);
    if (host.activeTab !== "skillrunner") {
      clearSkillRunnerSidebarRefresh(host);
      detachSkillRunnerFromShell(host, "open-non-skillrunner-tab");
    }
    if (host.activeTarget) {
      await publishAssistantWorkspaceStatePulse(
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

export function getAssistantWorkspaceReplayState(args?: {
  window?: _ZoteroTypes.MainWindow;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? hosts.get(win) : undefined;
  return {
    open: !!host?.activeTarget,
    tab: host?.activeTab || DEFAULT_TAB,
    target: host?.activeTarget || undefined,
  };
}

export type AssistantWorkspaceDiagnosticsPublicationOptions = {
  window?: _ZoteroTypes.MainWindow;
  tab: AssistantWorkspaceTab;
  expectedChatOwner?: {
    backendId: string;
    conversationId: string;
  };
  expectedSkillRequestId?: string;
};

export function inspectAssistantWorkspaceDiagnosticsPublicationLanes(args?: {
  window?: _ZoteroTypes.MainWindow;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? hosts.get(win) : undefined;
  if (!host) {
    return {
      childWindow: null,
      publications: [],
      detail: "workspace-host-not-ready",
    };
  }
  return {
    childWindow: null,
    publications: [...host.publicationLifecycles.values()].map(
      ({
        publicationId,
        source,
        deliverySequence,
        state,
        reason,
        failure,
      }) => ({
        publicationId,
        source,
        deliverySequence,
        state,
        ...(reason ? { reason } : {}),
        ...(failure ? { failure } : {}),
      }),
    ),
    detail:
      !host.activeTarget || !host.shell.ready
        ? "workspace-shell-not-ready"
        : "",
  };
}

function assistantWorkspaceDiagnosticsReadinessDetail(
  host: AssistantWorkspaceHostRuntime,
  args: AssistantWorkspaceDiagnosticsPublicationOptions,
) {
  if (!host.activeTarget) return "workspace-target-not-ready";
  if (host.activeTab !== args.tab) return "workspace-tab-not-ready";
  if (!host.shell.ready) return "workspace-shell-not-ready";
  if (!host.readyTabs.has(args.tab)) return "workspace-child-not-ready";
  if (args.expectedChatOwner) {
    const chat = getActiveAcpChatOwner();
    if (
      chat.backendId !== args.expectedChatOwner.backendId ||
      chat.conversationId !== args.expectedChatOwner.conversationId
    ) {
      return "workspace-owner-not-ready";
    }
  }
  if (
    args.expectedSkillRequestId &&
    getSelectedAcpSkillRunRequestId() !== args.expectedSkillRequestId
  ) {
    return "workspace-owner-not-ready";
  }
  return "";
}

export function inspectAssistantWorkspaceDiagnosticsPublication(
  args: AssistantWorkspaceDiagnosticsPublicationOptions,
) {
  const win =
    args.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? hosts.get(win) : undefined;
  if (!host) {
    return {
      childWindow: null,
      publications: [],
      detail: "workspace-host-not-ready",
    };
  }
  const detail = assistantWorkspaceDiagnosticsReadinessDetail(host, args);
  const shellWindow = resolveCurrentShellWindow(host);
  const childFrame = shellWindow?.document?.getElementById(
    `assistant-frame-${args.tab}`,
  );
  const childWindow = resolveSidebarFrameWindow(childFrame || null);
  return {
    childWindow,
    publications: [...host.publicationLifecycles.values()]
      .filter((entry) => entry.source === args.tab)
      .map(
        ({
          publicationId,
          source,
          deliverySequence,
          state,
          reason,
          failure,
        }) => ({
          publicationId,
          source,
          deliverySequence,
          state,
          ...(reason ? { reason } : {}),
          ...(failure ? { failure } : {}),
        }),
      ),
    detail: detail || (childWindow ? "" : "workspace-child-not-ready"),
  };
}

export async function forceAssistantWorkspaceDiagnosticsPublication(
  args: AssistantWorkspaceDiagnosticsPublicationOptions,
) {
  const win =
    args.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  const host = win ? hosts.get(win) : undefined;
  if (!host || hosts.get(host.win) !== host) {
    throw new Error("workspace-host-not-ready");
  }
  const readinessDetail = assistantWorkspaceDiagnosticsReadinessDetail(
    host,
    args,
  );
  if (readinessDetail) throw new Error(readinessDetail);
  const activeTarget = host.activeTarget;
  if (!activeTarget) {
    throw new Error("workspace-target-not-ready");
  }
  await host.publicationRuntime?.flush();
  const barrier = async (publicationId: string) => {
    const publication =
      await host.publicationCoordinator?.waitForPostedPublication(
        publicationId,
      );
    return publication
      ? {
          source: publication.owner.source,
          publicationId,
          deliverySequence: publication.deliverySequence,
        }
      : undefined;
  };
  if (args.tab === "acp-chat") {
    const ownerKey = getActiveAcpChatOwnerKey();
    if (!ownerKey) {
      const publicationId = await initializeAcpChatWorkspaceSurface(
        host,
        activeTarget,
        "activation",
      );
      return publicationId ? barrier(publicationId) : undefined;
    }
    const [backendId, conversationId] = ownerKey.split("\n", 2);
    const publication = await host.publicationRuntime?.requestTranscriptPage({
      adapter: ACP_CHAT_WORKSPACE_ADAPTER,
      owner: createAcpChatWorkspaceOwner(backendId, conversationId),
      context: acpChatWorkspaceSurfaceContext(host, activeTarget),
      cause: "diagnostic",
      force: true,
    });
    const publicationId = publication?.publicationId;
    return publicationId ? barrier(publicationId) : undefined;
  } else if (args.tab === "acp-skills") {
    const requestId = getSelectedAcpSkillRunRequestId();
    const publicationId = requestId
      ? (
          await host.publicationRuntime?.requestTranscriptPage({
            adapter: ACP_SKILLS_WORKSPACE_ADAPTER,
            owner: createAcpSkillsWorkspaceOwner(requestId),
            context: undefined,
            cause: "diagnostic",
            force: true,
          })
        )?.publicationId
      : await initializeAcpSkillsWorkspaceSurface(host, "activation");
    return publicationId ? barrier(publicationId) : undefined;
  } else {
    postSnapshotForTab(host, activeTarget, args.tab, "snapshot", {
      force: true,
    });
    return undefined;
  }
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
        await publishAssistantWorkspaceStatePulse(
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

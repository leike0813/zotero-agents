import { config } from "../../../../package.json";
import { workflowSubmissionQueue } from "../../../jobQueue/workflowSubmissionQueue";

import type { BackendInstance } from "../../../backends/types";
import { getStringOrFallback } from "../../../utils/locale";
import { resolveAddonRef } from "../../../utils/runtimeBridge";

import { subscribeAssistantExecutionDisplayMode } from "../publication/assistantExecutionDisplayPolicy";
import { openBackendManagerDialog } from "../../workflow/settings/backendManager";

import {
  SKILLRUNNER_ICON_URI,
  applyToolbarButtonStyling,
  syncToolbarButtonIconFill,
  updateAssistantToolbarAttention,
} from "../../dashboardToolbarButton";

import {
  ACP_CHAT_WORKSPACE_ADAPTER,
  isPureAcpChatBackgroundChange,
} from "../../acp/chat/acpChatWorkspaceSurface";
import { AssistantWorkspacePublicationRuntime } from "../publication/assistantWorkspacePublicationRuntime";
import {
  buildAssistantWorkspaceNavigationLabels,
  buildAssistantWorkspacePublicationLabels,
} from "../publication/assistantWorkspacePublicationLabels";
import { PI_CONVERSATIONS_WORKSPACE_ADAPTER } from "../../piConversationWorkspaceSurface";
import { getPiConversationCoordinator } from "../../piConversation";
import { PI_SKILL_RUNS_WORKSPACE_ADAPTER } from "../../piSkillRunWorkspaceSurface";
import { getPiSkillRunCoordinator } from "../../piSkillRun";
import {
  ASSISTANT_WORKSPACE_SOURCE_REGISTRY,
  DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID,
  isAssistantWorkspaceSourceId,
  type AssistantWorkspaceSourceId,
} from "../../../shared/assistantWorkspaceSourceRegistry";
import {
  getActiveAcpChatOwner,
  subscribeAcpChatWorkspaceChanges,
} from "../../acp/chat/acpSessionManager";

import type { AcpSidebarTarget } from "../../acpTypes";
import {
  listAcpSkillRunSummaries,
  subscribeAcpSkillRunWorkspaceChanges,
} from "../../acp/skillRun/acpSkillRunStore";

import { ACP_SKILLS_WORKSPACE_ADAPTER } from "../../acp/skillRun/acpSkillsWorkspaceSurface";

import {
  attachSkillRunnerSidebarHost,
  detachSkillRunnerSidebarHost,
  dispatchSkillRunnerWorkspaceAction,
  focusSkillRunnerWorkspace,
  getSkillRunnerWorkspaceSelectedOwner,
  subscribeSkillRunnerWorkspaceChanges,
} from "../../skillRunner/surface/skillRunnerRunDialog";
import { SKILLRUNNER_WORKSPACE_ADAPTER } from "../../skillRunner/surface/skillRunnerWorkspaceSurface";
import { appendRuntimeLog } from "../../runtimeLogManager";
import { normalizeStatus } from "../../skillRunner/run/skillRunnerProviderStateMachine";
import { showWorkflowToast } from "../../workflowExecution/feedbackSeam";
import {
  listActiveWorkflowTaskSummaries,
  subscribeWorkflowTaskChanges,
} from "../../taskRuntime";
import { countDashboardHumanAttentionTasks } from "../../dashboardActiveTasks";
import { isDebugModeEnabled } from "../../debugMode";
import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  readAcpRuntimePerformanceClockMs,
} from "../../acp/diagnostics/acpRuntimePerformanceProfiler";

import {
  applySidebarPaneContainerStyles,
  createSidebarContainer,
  createSidebarFrame,
  resolveSidebarFrameWindow,
  setSidebarContainerVisible,
} from "../../sidebarBrowserHost";
import { createAssistantSidebarScopeKey } from "./assistantSidebarViewModel";
import {
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createSkillRunnerWorkspaceOwner,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationKind,
  type AssistantWorkspacePublicationLifecycle,
  type AssistantWorkspacePublicationSource,
} from "../publication/assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "../publication/assistantWorkspacePublicationCoordinator";

import {
  ASSISTANT_WORKSPACE_MESSAGE_PREFIX,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_SHELL_ACTIONS,
  ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
  type AssistantWorkspaceMessageType,
  type AssistantWorkspaceTab,
} from "../../../shared/assistantWireContract";
import type {
  AssistantWorkspaceChildActionEnvelope,
  AssistantWorkspaceInboundActionPayload,
  AssistantWorkspaceShellActionEnvelope,
} from "../../../shared/assistantActionContract";
import {
  buildPiLocalNetworkAuthorizer,
  configureAssistantWorkspaceActionRouterShellHost,
  handleChildAction,
  invalidateAssistantWorkspacePiNavigationTargets,
} from "./assistantWorkspaceActionRouter";
import {
  acpChatWorkspaceSurfaceContext,
  assistantWorkspaceAcpRuntimeConfiguration,
  assistantWorkspacePublicationMetricLabels,
  clearAcpChatBackendRefreshBoundary,
  clearAssistantWorkspaceInitPublicationState,
  clearAssistantWorkspaceReadyTabs,
  configureAssistantWorkspacePublicationShellHost,
  deactivateWorkspacePublicationRuntime,
  getActiveAcpChatOwnerKey,
  hasPublishedWorkspaceBaselineInit,
  isPureAcpSkillRunBackgroundChange,
  markWorkspaceBaselineInitPublished,
  postAssistantWorkspacePublicationConfiguration,
  preloadAcpChatBackendsForWorkspaceInit,
  publishAssistantWorkspaceStatePulse,
  recordWorkspacePublicationAck,
  registerWorkspacePublication,
  scheduleAcpChatPublications,
  scheduleAcpSkillRunPublications,
  schedulePiSkillRunPublications,
  schedulePostSnapshot,
  scheduleSkillRunnerPublications,
  transcriptRebasePageRequest,
} from "./assistantWorkspacePublicationHost";
import {
  getSelectedAcpSkillRunRequestId,
  selectAcpSkillRun,
} from "../../acp/skillRun/acpSkillRunWorkspaceSelection";

// Decision 3/4 re-exports: publication coordination now lives in
// ./assistantWorkspacePublicationHost and host action routing (formerly the
// per-source handleAcpChatAction / handleAcpSkillRunAction routers and
// createSkillRunnerHostActionHandler) in ./assistantWorkspaceActionRouter;
// re-exported here to keep existing import sites and source-level wiring
// checks stable.
export {
  createSkillRunnerHostActionHandler,
  handleAcpChatAction,
  handleAcpSkillRunAction,
} from "./assistantWorkspaceActionRouter";
export {
  forceAssistantWorkspaceDiagnosticsPublication,
  inspectAssistantWorkspaceDiagnosticsPublication,
  inspectAssistantWorkspaceDiagnosticsPublicationLanes,
  inspectAssistantWorkspaceReplayPostSnapshotTimer,
  postInitialSnapshotForActiveTab,
  scheduleSkillRunnerPublications,
} from "./assistantWorkspacePublicationHost";
export type { AssistantWorkspaceDiagnosticsPublicationOptions } from "./assistantWorkspacePublicationHost";
export { dispatchSkillRunnerWorkspaceAction } from "../../skillRunner/surface/skillRunnerRunDialog";
export { getAcpSkillRunDiagnostics } from "../../acp/skillRun/acpSkillRunStore";

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
export type AssistantWorkspaceHostRuntime = {
  win: _ZoteroTypes.MainWindow;
  activeTarget: AcpSidebarTarget | null;
  activeTab: AssistantWorkspaceTab;
  skillRunnerAttachedFrameWindow?: Window | null;
  library: MountedSidebarDock;
  reader: MountedSidebarDock;
  shell: AssistantWorkspaceShell;
  removeMessageListener?: () => void;
  removeAcpChatPanelSubscription?: () => void;
  removeAcpSkillRunSubscription?: () => void;
  removePiSkillRunSubscription?: () => void;
  removeSkillRunnerWorkspaceSubscription?: () => void;
  removeTaskSubscription?: () => void;
  removeWorkflowQueueSubscription?: () => void;
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
  /** Sticky-stale flag of the host's current Pi navigation binding. */
  invalidatePiNavigation?: () => void;
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
      source: AssistantWorkspacePublicationSource;
      kind: AssistantWorkspacePublicationKind;
      cause: AssistantWorkspacePublication["publicationCause"];
      form: AssistantWorkspacePublication["publicationForm"];
      deliverySequence: number;
      postedAtMs: number;
    }
  >;
  publicationCoordinator?: AssistantWorkspacePublicationCoordinator;
  publicationRuntime?: AssistantWorkspacePublicationRuntime;
  skillRunWaitingToastKeys: Map<string, Set<string>>;
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
const DEFAULT_TAB: AssistantWorkspaceTab =
  DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID;
const ASSISTANT_WORKSPACE_TABS: AssistantWorkspaceTab[] = Object.keys(
  ASSISTANT_WORKSPACE_SOURCE_REGISTRY,
) as AssistantWorkspaceTab[];
const ASSISTANT_WORKSPACE_BRIDGE_KEY = ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY;
const localize = getStringOrFallback;

export function resolveAssistantWorkspaceAuditLogLevel(args: {
  tab: AssistantWorkspaceLogTab;
  action: string;
  result: "ok" | "error";
}) {
  if (args.result === "error") {
    return "warn" as const;
  }
  return args.action === ASSISTANT_WORKSPACE_SHELL_ACTIONS.READY ||
    args.action === ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY
    ? ("info" as const)
    : null;
}

configureAssistantWorkspacePublicationShellHost({
  logAssistantWorkspaceDebug,
  postShellMessage,
  resolveCurrentShellWindow,
  attachSkillRunnerToShell,
  postShellInit,
  getWorkspaceHost: (win) => hosts.get(win),
});
configureAssistantWorkspaceActionRouterShellHost({
  piConversationsSurface: () => ({
    adapter: PI_CONVERSATIONS_WORKSPACE_ADAPTER,
  }),
  piConversationCoordinator: () => getPiConversationCoordinator(),
  piSkillRunsSurface: () => ({
    adapter: PI_SKILL_RUNS_WORKSPACE_ADAPTER,
  }),
  piSkillRunCoordinator: () => getPiSkillRunCoordinator(),
  localizeString: (key, fallback) => localize(key as any, fallback),
  openBackendManager: openBackendManagerDialog,
  logAssistantWorkspaceDebug,
  closeActiveSidebarHost,
  normalizeTab,
  resolveCurrentShellWindow,
  isHostAlive: (host) => hosts.get(host.win) === host,
});
// Interactive Pi Skill Run admission focuses once through the coordinator's
// launch hook; the snapshot window main captured at admission wins, and only
// a missing snapshot falls back to the current main window.
getPiSkillRunCoordinator().setLaunchFocus(async (requestId, window) => {
  await focusPiSkillRunWorkspace(
    requestId,
    (window as _ZoteroTypes.MainWindow | undefined) || undefined,
  );
});
// Local-network approval reuses the same window-scoped dialog ACP uses, so a
// local endpoint never becomes an unapproved implicit grant. The coordinator
// passes the turn's transient origin window; only a missing one falls back to
// the current main window, resolved per request rather than at module load.
getPiSkillRunCoordinator().setLocalNetworkAuthorizer(
  async (endpoint, window) => {
    const win =
      (window as _ZoteroTypes.MainWindow | undefined) ||
      (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
    return win ? buildPiLocalNetworkAuthorizer({ win })(endpoint) : false;
  },
);

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

type SkillRunWaitingToastEntry = {
  requestId: string;
  status: string;
  pendingPermission: boolean;
  label: string;
  relatedHandles?: Record<string, unknown>;
};

/**
 * Q204: Pi and ACP Skill Runs share one waiting-notification policy and the
 * same toast/Hub pipeline. Only the owner-state projection differs per source,
 * and each source keeps its own deduplication key set.
 */
function maybeShowSkillRunWaitingToasts(
  host: AssistantWorkspaceHostRuntime,
  source: "acp-skill-run" | "pi-skill-run",
  entries: SkillRunWaitingToastEntry[],
) {
  const previousKeys =
    host.skillRunWaitingToastKeys.get(source) || new Set<string>();
  const nextKeys = new Set<string>();
  for (const entry of entries) {
    const normalized = normalizeStatus(entry.status, "running");
    const waiting =
      normalized === "waiting_user" ||
      normalized === "waiting_auth" ||
      entry.pendingPermission;
    if (!waiting) continue;
    const key = `${entry.requestId}:${entry.pendingPermission ? "permission" : normalized}`;
    nextKeys.add(key);
    if (previousKeys.has(key)) {
      continue;
    }
    showWorkflowToast({
      text: `${entry.label} needs your input.`,
      type: "default",
      semantic: "waiting",
      owner: "acp-sidebar",
      scope: source,
      displayGroupKey: `${source}:${key}:waiting`,
      relatedHandles: entry.relatedHandles,
    });
  }
  host.skillRunWaitingToastKeys.set(source, nextKeys);
}

function maybeShowAcpSkillWaitingToasts(host: AssistantWorkspaceHostRuntime) {
  maybeShowSkillRunWaitingToasts(
    host,
    "acp-skill-run",
    listAcpSkillRunSummaries({ activeOnly: true }).map((run) => ({
      requestId: run.requestId,
      status: String(run.status || ""),
      pendingPermission: !!run.pendingPermission,
      label: run.workflowLabel || run.taskName || run.skillId || "ACP Skill",
      relatedHandles: {
        skillRunId: run.requestId,
        workflowRunId: run.runId,
      },
    })),
  );
}

async function maybeShowPiSkillRunWaitingToasts(
  host: AssistantWorkspaceHostRuntime,
) {
  const owners = await getPiSkillRunCoordinator().list();
  maybeShowSkillRunWaitingToasts(
    host,
    "pi-skill-run",
    owners.map((owner) => ({
      requestId: owner.requestId,
      status: String(owner.status || ""),
      pendingPermission: owner.status === "waiting_permission",
      label: owner.taskName || owner.skillId || "Pi Skill Run",
      relatedHandles: { skillRunId: owner.requestId },
    })),
  );
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
    deactivateWorkspacePublicationRuntime(host);
    invalidateAssistantWorkspacePiNavigationTargets(host);
    host.activeTarget = null;
    setShellActiveTarget(host, null);
  }
}

function closeActiveSidebarHost(host: AssistantWorkspaceHostRuntime) {
  const activeTarget = host.activeTarget;
  if (!activeTarget) {
    return false;
  }
  clearShellHandshake(host);
  clearAcpChatBackendRefreshBoundary(host);
  clearSkillRunnerSidebarRefresh(host);
  detachSkillRunnerFromShell(host, "close-active-sidebar");
  clearAssistantWorkspaceInitPublicationState(host, "close-active-sidebar");
  deactivateTarget(host, activeTarget);
  return true;
}

// Chrome-level SkillRunner actions that stay host-side after the Stage 3
// cutover: queue cancellation (the queue is host state) and the backend
// manager dialog (needs the host window). Drawer toggles and view-mode
// switches are panel-local in the child; every business action
// (select-task, reply-run, cancel-run, resolve-permission, auth-import-run,
// copy-*, …) falls through to `dispatchSkillRunnerWorkspaceAction` via the typed
// registry route in `handleChildAction`.

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

function detachSkillRunnerFromShell(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (!host.skillRunnerAttachedFrameWindow) {
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

function clearShellHandshake(host: AssistantWorkspaceHostRuntime) {
  if (host.shellHandshakeTimer) {
    clearTimeout(host.shellHandshakeTimer);
    host.shellHandshakeTimer = null;
  }
  host.shellHandshakeAttempt = 0;
}

function scheduleShellHandshake(
  host: AssistantWorkspaceHostRuntime,
  reason: string,
) {
  if (host.shell.ready) {
    return;
  }
  if (host.shellHandshakeTimer) {
    return;
  }
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
    clearShellHandshake(host);
    return;
  }
  host.shellHandshakeAttempt += 1;
  const frameWindow = resolveCurrentShellWindow(host);
  if (!frameWindow) {
    scheduleShellHandshake(host, "retry-no-frame");
    return;
  }
  installShellBridge(host);
  if (!host.activeTarget) {
    scheduleShellHandshake(host, "retry-no-target");
    return;
  }
  postShellInit(host, host.activeTab);
}

async function acceptAssistantShellReady(host: AssistantWorkspaceHostRuntime) {
  if (host.shell.ready) {
    clearShellHandshake(host);
    return;
  }
  host.shell.ready = true;
  host.shell.loaded = true;
  clearShellHandshake(host);
  if (hasPublishedWorkspaceBaselineInit(host)) {
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
      const activeTarget = host.activeTarget;
      const isReadyEnvelope = isAssistantShellReadyEnvelope(type, payload);
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

function postShellInit(
  host: AssistantWorkspaceHostRuntime,
  activeTab: AssistantWorkspaceTab,
) {
  postShellMessage(host, ASSISTANT_WORKSPACE_MESSAGE_TYPES.INIT, {
    activeTab,
    activeTarget: host.activeTarget,
    scopeKey: host.scopeKey,
    surfaceConfiguration: assistantWorkspaceAcpRuntimeConfiguration(),
    surfaceLabels: buildAssistantWorkspacePublicationLabelsMap(),
    navigationLabels: buildAssistantWorkspaceNavigationLabels(),
  });
}

function buildAssistantWorkspacePublicationLabelsMap(): Record<
  AssistantWorkspaceSourceId,
  ReturnType<typeof buildAssistantWorkspacePublicationLabels>
> {
  const labels = {} as Record<
    AssistantWorkspaceSourceId,
    ReturnType<typeof buildAssistantWorkspacePublicationLabels>
  >;
  for (const sourceId of Object.keys(
    ASSISTANT_WORKSPACE_SOURCE_REGISTRY,
  ) as AssistantWorkspaceSourceId[]) {
    labels[sourceId] = buildAssistantWorkspacePublicationLabels(sourceId);
  }
  return labels;
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
  const level = resolveAssistantWorkspaceAuditLogLevel(args);
  if (!level) return;
  appendRuntimeLog({
    level,
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
  if (action === "ready") {
    await acceptAssistantShellReady(host);
    return;
  }
  if (action === "set-tab") {
    const tab = normalizeTab(payload.tab);
    if (host.activeTab !== tab) {
      // Leaving the presented source permanently invalidates any Pi navigation
      // target bound to the previous Workspace interaction.
      invalidateAssistantWorkspacePiNavigationTargets(host);
    }
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
  return isAssistantWorkspaceSourceId(text) ? text : DEFAULT_TAB;
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
    alertWindow: host.win,
    focusHost: () => host.win.focus(),
    isHostAlive: () => hosts.get(host.win) === host,
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
  if (host.activeTarget !== target)
    invalidateAssistantWorkspacePiNavigationTargets(host);
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
    if (host.activeTarget !== "library")
      invalidateAssistantWorkspacePiNavigationTargets(host);
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
  if (host.activeTarget !== "reader")
    invalidateAssistantWorkspacePiNavigationTargets(host);
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
    skillRunWaitingToastKeys: new Map<string, Set<string>>(),
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
      if (source === "skillrunner") {
        const selected = getSkillRunnerWorkspaceSelectedOwner();
        return selected
          ? createSkillRunnerWorkspaceOwner({
              requestId: selected.requestId || undefined,
              runKey: selected.runKey,
            })
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
      if (owner.source === "skillrunner") {
        const selected = getSkillRunnerWorkspaceSelectedOwner();
        if (!selected || selected.runKey !== owner.runKey) return;
        void host.publicationRuntime?.requestTranscriptPage({
          adapter: SKILLRUNNER_WORKSPACE_ADAPTER,
          owner,
          context: undefined,
          request: {
            cursor: request.cursor,
            limit: request.limit,
          },
          cause: "rebase",
          force: true,
        });
        return;
      }
      if (owner.source !== "acp-skills") {
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
    initializationGeneration(source) {
      return host.readyTabGenerations.get(source);
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
      onInitializationFailed({ source, owner, error }) {
        appendRuntimeLog({
          level: "error",
          scope: "system",
          component: "assistant-shell",
          operation: "workspace-initialization",
          phase: "error",
          stage: "surface-publication",
          message: "Assistant Workspace surface initialization failed.",
          details: { source, ownerKey: owner?.ownerKey || null },
          error,
        });
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
  host.removePiSkillRunSubscription = getPiSkillRunCoordinator().subscribe(
    (change) => {
      const backgroundOnly = change.kinds.every(
        (kind) => kind === "transcript" || kind === "resources",
      );
      if (!backgroundOnly) {
        void maybeShowPiSkillRunWaitingToasts(host);
        updateAssistantAttentionIndicator(host);
      }
      schedulePiSkillRunPublications(host, change);
    },
  );
  host.removeSkillRunnerWorkspaceSubscription =
    subscribeSkillRunnerWorkspaceChanges((change) => {
      scheduleSkillRunnerPublications(host, change);
    });
  host.removeTaskSubscription = subscribeWorkflowTaskChanges(() => {
    updateAssistantAttentionIndicator(host);
  });
  host.removeWorkflowQueueSubscription = workflowSubmissionQueue.subscribe(
    () => {
      if (!host.activeTarget) {
        return;
      }
      if (host.activeTab === "skillrunner") {
        // Mirror the queue change into the publication plane as a
        // skillrunner global change (owner-navigation Queued section).
        scheduleSkillRunnerPublications(host, {
          global: true,
          kinds: ["global"],
        });
        return;
      }
      if (host.activeTab === "acp-skills") {
        scheduleAcpSkillRunPublications(host, {
          global: true,
          kinds: ["global"],
        });
      }
    },
  );
  host.removeStreamingRenderPreferenceSubscription =
    subscribeAssistantExecutionDisplayMode(() => {
      if (!host.streamingRenderPreferenceInitialized) {
        host.streamingRenderPreferenceInitialized = true;
        return;
      }
      if (host.streamingRenderPreferenceLocalWriteDepth > 0) {
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
  host.removePiSkillRunSubscription?.();
  host.removeSkillRunnerWorkspaceSubscription?.();
  host.removeTaskSubscription?.();
  host.removeWorkflowQueueSubscription?.();
  host.removeStreamingRenderPreferenceSubscription?.();
  detachSkillRunnerFromShell(host, "remove-shell");
  if (host.postSnapshotTimer) {
    clearTimeout(host.postSnapshotTimer);
    host.postSnapshotTimer = null;
  }
  host.publicationRuntime?.reset();
  clearShellHandshake(host);
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
    const explicitTab = normalizeTab(args?.tab);
    if (host.activeTab !== explicitTab)
      invalidateAssistantWorkspacePiNavigationTargets(host);
    host.activeTab = explicitTab;
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
  if (host.activeTab === "pi-skill-runs" && args?.requestId) {
    await getPiSkillRunCoordinator().select(args.requestId);
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

// A Pi Skill Run focuses Assistant Workspace at most once, at Interactive
// admission. Later state changes (waiting, permission, recovery, terminal)
// only publish; they never focus.
// ponytail: process-lifetime set, one short id per admitted run.
const focusedPiSkillRunRequests = new Set<string>();

export async function focusPiSkillRunWorkspace(
  requestId: string,
  window?: _ZoteroTypes.MainWindow,
) {
  const id = String(requestId || "").trim();
  if (!id || focusedPiSkillRunRequests.has(id)) return false;
  focusedPiSkillRunRequests.add(id);
  const win =
    window || (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) return false;
  return openAssistantWorkspaceSidebar({
    window: win,
    tab: "pi-skill-runs",
    requestId: id,
  });
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
        invalidateAssistantWorkspacePiNavigationTargets(host);
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

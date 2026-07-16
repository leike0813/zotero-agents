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
  acpChatTranscriptPageKey,
  isPureAcpChatBackgroundChange,
  prepareAcpChatPanelSnapshot,
  prepareAcpChatPanelPublicationDto,
  resolveAcpChatPublicationKindsForChange,
  type AcpChatTranscriptReadMode,
  type AcpChatTranscriptPageRequest,
} from "./acpChatPanelReadModel";
import {
  authenticateAcpConversation,
  archiveAcpConversation,
  buildAcpDiagnosticsBundle,
  cancelAcpConversationPrompt,
  connectAcpConversation,
  disconnectAcpConversation,
  getAcpFrontendSnapshot,
  getActiveAcpChatOwner,
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
  toggleAcpConversationDiagnostics,
  toggleAcpConversationStatusDetails,
  type AcpChatPanelSnapshotChange,
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
  mapAcpSkillRunChangeToPublicationKinds,
  prepareAcpSkillRunPublication,
} from "./acpSkillRunPanelReadModel";
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
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createAssistantWorkspaceUnownedScope,
  assertAssistantWorkspacePublicationAck,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationAck,
  type AssistantWorkspaceDomainChange,
  type AssistantWorkspacePublicationKind,
  type AssistantWorkspacePublicationLifecycle,
  type AssistantWorkspacePublicationPayload,
} from "./assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "./assistantWorkspacePublicationCoordinator";
import {
  parseAssistantWorkspaceTranscriptPageRequest,
  type AssistantWorkspaceTranscriptRegion,
} from "./assistantWorkspaceTranscriptPublication";

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
  acpChatBackendRefreshInFlight: boolean;
  acpChatBackendRefreshRepostQueued: boolean;
  skillRunnerRefreshTimer?: ReturnType<typeof setTimeout> | null;
  skillRunnerRefreshGeneration: number;
  pendingSkillRunnerRefresh?: SkillRunnerSidebarRefreshRequest;
  scopeKey: string;
  snapshotRevision: number;
  acpChatSnapshotBuildSeq: number;
  acpSkillRunSnapshotBuildSeq: number;
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
  lastAcpSkillRunSnapshotSignature?: string | null;
  pendingWorkspacePublication?: {
    source: "acp-chat" | "acp-skills";
    target: AcpSidebarTarget;
    ownerKey: string;
    kinds: Set<AssistantWorkspacePublicationKind>;
  };
  pendingSnapshotTab?: AssistantWorkspaceTab;
  publicationLifecycles: Map<
    string,
    AssistantWorkspacePublicationLifecycle & {
      tab: "acp-chat" | "acp-skills";
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
  force?: boolean;
  requestRecorded?: boolean;
  transcriptReadMode?: AcpChatTranscriptReadMode;
  transcriptPage?: AcpChatTranscriptPageRequest;
};
type AcpSkillRunSnapshotPostOptions = {
  force?: boolean;
  transcriptReadMode?: "loading-first" | "page-first";
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
const MAX_WORKSPACE_PUBLICATION_LIFECYCLES = 256;
const localize = getStringOrFallback;

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function summarizeAcpChatPanelSnapshot(snapshot: Record<string, unknown>) {
  const region =
    snapshot.transcriptRegion && typeof snapshot.transcriptRegion === "object"
      ? (snapshot.transcriptRegion as Record<string, unknown>)
      : null;
  const page =
    region?.page && typeof region.page === "object"
      ? (region.page as Record<string, unknown>)
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
    executionDisplayMode: String(snapshot.executionDisplayMode || "live"),
    transcriptRegion: region
      ? {
          status: String(region.status || ""),
          pageKey: String(page?.pageKey || ""),
          cursor: Number(page?.startCursor || 0),
          total: Number(page?.totalItemCount || 0),
          items: countArray(page?.items),
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
    const region =
      snapshot.transcriptRegion && typeof snapshot.transcriptRegion === "object"
        ? (snapshot.transcriptRegion as Record<string, unknown>)
        : null;
    const page =
      region?.page && typeof region.page === "object"
        ? (region.page as Record<string, unknown>)
        : null;
    return {
      selectedRequestId: String(snapshot.selectedRequestId || ""),
      selectedRunRequestId: String(selectedRun?.requestId || ""),
      selectedRunStatus: String(selectedRun?.status || ""),
      runs: countArray(snapshot.runs),
      transcriptPaginationVirtualizationEnabled:
        snapshot.transcriptPaginationVirtualizationEnabled === true,
      executionDisplayMode: String(snapshot.executionDisplayMode || "live"),
      transcriptRegion: region
        ? {
            status: String(region.status || ""),
            pageKey: String(page?.pageKey || ""),
            cursor: Number(page?.startCursor || 0),
            total: Number(page?.totalItemCount || 0),
            items: countArray(page?.items),
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
    executionDisplayMode: String(snapshot.executionDisplayMode || "live"),
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

async function postAcpSkillRunPublication(
  host: AssistantWorkspaceHostRuntime,
  requestId: string,
  kind: AssistantWorkspacePublicationKind,
  options?: AcpSkillRunSnapshotPostOptions,
) {
  if (
    !host.activeTarget ||
    host.activeTab !== "acp-skills" ||
    getSelectedAcpSkillRunRequestId() !== requestId
  ) {
    return;
  }
  const profilingEnabled =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__);
  const labels = {
    operationClass: "panel" as const,
    publicationKind: kind,
    publicationCausality: "matching-target" as const,
    publicationPhase: "steady-state" as const,
    publicationSurface: "acp-skills" as const,
    publicationForm:
      kind === "transcript" ? ("delta" as const) : ("region" as const),
    materializationSource:
      kind === "transcript"
        ? ("transcript-page" as const)
        : ("region" as const),
  };
  const startedAt = profilingEnabled ? readAcpRuntimePerformanceClockMs() : 0;
  if (profilingEnabled) {
    incrementAcpRuntimeMetric(requestId, "panel_requested", labels);
  }
  const payload = await prepareAcpSkillRunPublication({
    requestId,
    publicationKind: kind,
    transcriptReadMode: options?.transcriptReadMode,
    transcriptPage: options?.transcriptPage,
  });
  if (profilingEnabled) {
    incrementAcpRuntimeMetric(requestId, "panel_materialization", labels);
    incrementAcpRuntimeMetric(requestId, "panel_prepare", labels);
    observeAcpRuntimeDuration(
      requestId,
      "panel_prepare_duration",
      labels,
      readAcpRuntimePerformanceClockMs() - startedAt,
    );
  }
  if (!payload || getSelectedAcpSkillRunRequestId() !== requestId) return;
  const owner = createAcpSkillsWorkspaceOwner(requestId);
  let publication: AssistantWorkspacePublication | undefined;
  if (kind === "transcript") {
    const region = payload as AssistantWorkspaceTranscriptRegion;
    const cause = options?.force
      ? "diagnostic"
      : options?.transcriptPage
        ? "page-request"
        : "owner-switch";
    publication = host.publicationCoordinator?.publishDomainChange({
      owner,
      kind: "transcript",
      cause,
      transcript: { form: "snapshot", region },
      force: options?.force,
    });
  } else if (kind !== "plan") {
    publication = host.publicationCoordinator?.publishDomainChange({
      owner,
      kind,
      cause: options?.force ? "diagnostic" : "steady-state",
      payload,
      force: options?.force,
    } as AssistantWorkspaceDomainChange);
  }
  return publication?.publicationId;
}

function scheduleAcpSkillRunPublications(
  host: AssistantWorkspaceHostRuntime,
  change?: AcpSkillRunSnapshotChange,
) {
  if (!change || change.global === true) {
    schedulePostSnapshot(host, "acp-skills");
    return;
  }
  const kinds = acpSkillRunChangeKinds(change);
  if (!host.activeTarget || host.activeTab !== "acp-skills") return;
  const requestId = getSelectedAcpSkillRunRequestId();
  const requestIds = change.requestIds || [];
  if (
    !requestId ||
    (requestIds.length > 0 && !requestIds.includes(requestId))
  ) {
    return;
  }
  if (kinds.includes("transcript")) {
    host.publicationCoordinator?.publishDomainChange({
      owner: createAcpSkillsWorkspaceOwner(requestId),
      kind: "transcript",
      cause: "steady-state",
      transcript: {
        form: "mutations",
        events: change.transcriptEvents || [],
        eventSeq: change.transcriptEventSeq || 0,
        totalItemCount: change.transcriptItemCount || 0,
        visibility: getAssistantExecutionDisplayMode(),
      },
    });
  }
  if (
    kinds.length === 0 ||
    kinds.some(
      (kind) => kind === "selection" || kind === "archive" || kind === "global",
    )
  ) {
    schedulePostSnapshot(host, "acp-skills");
    return;
  }
  const publicationKinds = mapAcpSkillRunChangeToPublicationKinds(kinds).filter(
    (kind) => kind !== "transcript",
  );
  queueWorkspacePublications(host, "acp-skills", requestId, publicationKinds);
}

function queueWorkspacePublications(
  host: AssistantWorkspaceHostRuntime,
  source: "acp-chat" | "acp-skills",
  ownerKey: string,
  kinds: readonly AssistantWorkspacePublicationKind[],
) {
  if (!host.activeTarget || kinds.length === 0) return;
  const pending = host.pendingWorkspacePublication;
  if (pending && pending.source === source && pending.ownerKey === ownerKey) {
    for (const kind of kinds) pending.kinds.add(kind);
  } else {
    host.pendingWorkspacePublication = {
      source,
      target: host.activeTarget,
      ownerKey,
      kinds: new Set(kinds),
    };
  }
  if (host.postSnapshotTimer) return;
  host.postSnapshotTimer = setTimeout(() => {
    host.postSnapshotTimer = null;
    flushScheduledWorkspacePost(host);
  }, 16);
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
  const profilerPayload =
    type === "assistant-workspace:child-snapshot" &&
    (messagePayload.tab === "acp-skills" ||
      messagePayload.tab === "acp-chat") &&
    messagePayload.snapshot &&
    typeof messagePayload.snapshot === "object"
      ? (messagePayload.snapshot as Record<string, unknown>)
      : null;
  const profilerPublication =
    type === "assistant-workspace:child-publication" &&
    messagePayload.publication &&
    typeof messagePayload.publication === "object"
      ? (messagePayload.publication as unknown as AssistantWorkspacePublication)
      : null;
  const profilerSnapshotPublication =
    profilerPayload?.workspacePublication &&
    typeof profilerPayload.workspacePublication === "object"
      ? (profilerPayload.workspacePublication as unknown as AssistantWorkspacePublication)
      : null;
  const metricPublication = profilerPublication || profilerSnapshotPublication;
  const profilerPublicationId = String(
    metricPublication?.publicationId || "",
  ).trim();
  const requestId = metricPublication
    ? metricPublication.owner.ownerKey
    : messagePayload.tab === "acp-skills"
      ? String(profilerPayload?.selectedRequestId || "").trim()
      : [
          String(profilerPayload?.activeBackendId || "").trim(),
          String(profilerPayload?.activeConversationId || "").trim(),
        ].join("\n");
  const profilerLabels = {
    ...(metricPublication
      ? {
          ...acpChatPublicationMetricLabels(
            metricPublication.publicationKind,
            "matching-target",
            metricPublication.publicationCause === "initialization"
              ? "initialization"
              : "steady-state",
          ),
          publicationSurface: metricPublication.owner.source,
          publicationForm:
            metricPublication.publicationCause === "initialization"
              ? ("initialization" as const)
              : metricPublication.publicationForm,
          materializationSource:
            metricPublication.publicationKind === "transcript"
              ? ("transcript-page" as const)
              : ("region" as const),
        }
      : {
          operationClass: "panel" as const,
          publicationKind: "baseline-status" as const,
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
    (profilerPayload || profilerPublication) &&
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? readAcpRuntimePerformanceClockMs()
      : 0;
  const message = { type, payload: messagePayload };
  frameWindow.postMessage(message, "*");
  if (
    (profilerPayload || profilerPublication) &&
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
  tab: "acp-chat" | "acp-skills",
  publicationId: string,
  publication?: AssistantWorkspacePublication,
) {
  host.publicationLifecycles ||= new Map();
  host.publicationLifecycles.set(publicationId, {
    publicationId,
    tab,
    state: "pending",
    reason: null,
    acknowledgements: new Set<string>(),
    ownerKey: publication?.owner.ownerKey || "",
    source: publication?.owner.source || tab,
    kind: publication?.publicationKind || "baseline-status",
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
  const posted = postShellMessage(host, "assistant-workspace:child-snapshot", {
    tab,
    phase,
    snapshot: payload,
  });
  if (!posted || (tab !== "acp-chat" && tab !== "acp-skills")) {
    return undefined;
  }
  const transcriptRegion =
    snapshot.transcriptRegion && typeof snapshot.transcriptRegion === "object"
      ? (snapshot.transcriptRegion as AssistantWorkspaceTranscriptRegion)
      : null;
  if (!transcriptRegion) return undefined;
  const publicationOwner =
    transcriptRegion.owner || createAssistantWorkspaceUnownedScope(tab);
  return host.publicationCoordinator?.publishTranscriptSnapshot({
    owner: publicationOwner,
    cause: phase === "init" ? "initialization" : "activation",
    region: transcriptRegion,
  })?.publicationId;
}

function acpChatPublicationMetricLabels(
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
    publicationSurface: "acp-chat" as const,
    publicationForm:
      phase === "initialization"
        ? ("initialization" as const)
        : kind === "transcript"
          ? ("delta" as const)
          : ("region" as const),
    materializationSource:
      kind === "transcript"
        ? ("transcript-page" as const)
        : ("region" as const),
  };
}

function buildAcpChatPublicationPayload(
  kind: AssistantWorkspacePublicationKind,
  dto: Record<string, unknown>,
): AssistantWorkspacePublicationPayload {
  if (kind === "transcript") {
    return dto.transcriptRegion as AssistantWorkspacePublicationPayload;
  }
  if (kind === "message-counts") {
    return {
      counts:
        dto.messageCounts && typeof dto.messageCounts === "object"
          ? (dto.messageCounts as never)
          : null,
    };
  }
  if (kind === "plan") {
    const items = (Array.isArray(dto.items) ? dto.items : [])
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          (item as Record<string, unknown>).kind === "plan",
      )
      .flatMap((item) => {
        const source = item as Record<string, unknown>;
        return (Array.isArray(source.entries) ? source.entries : []).map(
          (entry, index) => {
            const value = entry as Record<string, unknown>;
            return {
              itemId: `${String(source.id || "plan")}:${index}`,
              content: String(value.content || ""),
              priority: value.priority ? String(value.priority) : null,
              status: value.status ? String(value.status) : null,
            };
          },
        );
      });
    return { items };
  }
  if (kind === "permission") {
    const pending =
      dto.pendingPermissionRequest &&
      typeof dto.pendingPermissionRequest === "object"
        ? (dto.pendingPermissionRequest as Record<string, unknown>)
        : null;
    return {
      request: pending
        ? {
            requestId: String(pending.requestId || ""),
            title: String(pending.toolTitle || ""),
            summary: String(pending.summary || ""),
            options: (Array.isArray(pending.options)
              ? pending.options
              : []
            ).map((option) => {
              const value = option as Record<string, unknown>;
              return {
                optionId: String(value.optionId || ""),
                label: String(value.name || value.label || ""),
                description: value.description
                  ? String(value.description)
                  : null,
              };
            }),
          }
        : null,
    };
  }
  if (kind === "reply-hint") {
    const optionGroup = (optionsRaw: unknown, selectedRaw: unknown) => {
      const selected =
        selectedRaw && typeof selectedRaw === "object"
          ? (selectedRaw as Record<string, unknown>)
          : null;
      return {
        selectedOptionId: selected ? String(selected.id || "") || null : null,
        options: (Array.isArray(optionsRaw) ? optionsRaw : []).map((option) => {
          const value = option as Record<string, unknown>;
          return {
            optionId: String(value.id || ""),
            label: String(value.label || value.id || ""),
            description: value.description ? String(value.description) : null,
          };
        }),
      };
    };
    return {
      reply: {
        status: dto.busy === true ? "busy" : "enabled",
        hint: null,
      },
      runtimeOptions: {
        mode: optionGroup(dto.modeOptions, dto.currentMode),
        model: optionGroup(
          Array.isArray(dto.displayModelOptions) &&
            dto.displayModelOptions.length
            ? dto.displayModelOptions
            : dto.modelOptions,
          dto.currentDisplayModel || dto.currentModel,
        ),
        reasoningEffort: optionGroup(
          dto.reasoningEffortOptions,
          dto.currentReasoningEffort,
        ),
      },
    };
  }
  if (kind === "context-details") {
    return { context: [], details: [] };
  }
  return {
    status: String(dto.status || "idle"),
    busy: dto.busy === true,
    message: dto.lastError ? String(dto.lastError) : null,
  };
}

async function postAcpChatPanelPublication(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  ownerKey: string,
  kind: AssistantWorkspacePublicationKind,
  options?: AcpChatSnapshotPostOptions,
) {
  const profilingEnabled =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__);
  if (profilingEnabled && options?.requestRecorded !== true) {
    incrementAcpRuntimeMetric(
      ownerKey,
      "panel_requested",
      acpChatPublicationMetricLabels(kind),
    );
  }
  if (
    hosts.get(host.win) !== host ||
    host.activeTarget !== target ||
    host.activeTab !== "acp-chat" ||
    getActiveAcpChatOwnerKey() !== ownerKey
  ) {
    if (profilingEnabled) {
      incrementAcpRuntimeMetric(
        ownerKey,
        "panel_dropped_before_build",
        acpChatPublicationMetricLabels(
          kind,
          getActiveAcpChatOwnerKey() === ownerKey
            ? "inactive-source"
            : "owner-mismatch",
        ),
      );
    }
    return;
  }

  const prepareStartedAt = profilingEnabled
    ? readAcpRuntimePerformanceClockMs()
    : 0;
  const dto = await prepareAcpChatPanelPublicationDto({
    target,
    kind,
    transcriptReadMode: options?.transcriptReadMode,
    transcriptPage: options?.transcriptPage,
  });
  if (profilingEnabled) {
    incrementAcpRuntimeMetric(
      ownerKey,
      "panel_materialization",
      acpChatPublicationMetricLabels(kind),
    );
    incrementAcpRuntimeMetric(
      ownerKey,
      "panel_prepare",
      acpChatPublicationMetricLabels(kind),
    );
    observeAcpRuntimeDuration(
      ownerKey,
      "panel_prepare_duration",
      acpChatPublicationMetricLabels(kind),
      readAcpRuntimePerformanceClockMs() - prepareStartedAt,
    );
  }
  if (
    hosts.get(host.win) !== host ||
    host.activeTarget !== target ||
    host.activeTab !== "acp-chat" ||
    getActiveAcpChatOwnerKey() !== ownerKey
  ) {
    return;
  }

  const signatureStartedAt = profilingEnabled
    ? readAcpRuntimePerformanceClockMs()
    : 0;
  const signature = JSON.stringify(dto);
  if (profilingEnabled) {
    incrementAcpRuntimeMetric(
      ownerKey,
      "panel_signature",
      acpChatPublicationMetricLabels(kind),
    );
    incrementAcpRuntimeMetric(
      ownerKey,
      "panel_signature_bytes",
      acpChatPublicationMetricLabels(kind),
      new TextEncoder().encode(signature).byteLength,
    );
    observeAcpRuntimeDuration(
      ownerKey,
      "panel_signature_duration",
      acpChatPublicationMetricLabels(kind),
      readAcpRuntimePerformanceClockMs() - signatureStartedAt,
    );
  }
  const [backendId, conversationId] = ownerKey.split("\n", 2);
  const owner = createAcpChatWorkspaceOwner(backendId, conversationId);
  const payload = buildAcpChatPublicationPayload(kind, dto);
  let publication: AssistantWorkspacePublication | undefined;
  if (kind === "transcript") {
    const region = payload as AssistantWorkspaceTranscriptRegion;
    const cause = options?.force
      ? "diagnostic"
      : options?.transcriptPage
        ? "page-request"
        : "owner-switch";
    publication = host.publicationCoordinator?.publishDomainChange({
      owner,
      kind: "transcript",
      cause,
      transcript: { form: "snapshot", region },
      force: options?.force,
    });
  } else {
    publication = host.publicationCoordinator?.publishDomainChange({
      owner,
      kind,
      cause: options?.force ? "diagnostic" : "steady-state",
      payload,
      force: options?.force,
    } as AssistantWorkspaceDomainChange);
  }
  return publication?.publicationId;
}

function scheduleAcpChatPublications(
  host: AssistantWorkspaceHostRuntime,
  change: AcpChatPanelSnapshotChange,
) {
  const profilingEnabled =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__);
  const refreshState = {
    activeTab: host.activeTab,
    hasActiveTarget: !!host.activeTarget,
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
    executionDisplayMode: getAssistantExecutionDisplayMode(),
  };
  const requestedKinds = resolveAcpChatPublicationKindsForChange(
    {
      ...refreshState,
      activeTab: "acp-chat",
      hasActiveTarget: true,
    },
    { ...change, active: true },
  );
  const changeBackendId = String(change.backendId || "").trim();
  const changeConversationId = String(change.conversationId || "").trim();
  if (!changeBackendId || !changeConversationId) {
    if (host.activeTarget && host.activeTab === "acp-chat") {
      void postAcpChatLoadingFirstSnapshot(host, host.activeTarget, "snapshot");
    }
    return;
  }
  const owner = createAcpChatWorkspaceOwner(
    changeBackendId,
    changeConversationId,
  );
  const causality = !host.activeTarget
    ? "inactive-source"
    : host.activeTab !== "acp-chat"
      ? "opposite-active"
      : change.active !== true
        ? "owner-mismatch"
        : "matching-target";
  if (profilingEnabled) {
    for (const kind of requestedKinds) {
      incrementAcpRuntimeMetric(
        owner.ownerKey,
        "panel_requested",
        acpChatPublicationMetricLabels(kind, causality),
      );
    }
  }
  const kinds = resolveAcpChatPublicationKindsForChange(refreshState, change);
  if (
    kinds.length === 0 ||
    !host.activeTarget ||
    owner.ownerKey !== getActiveAcpChatOwnerKey()
  ) {
    if (profilingEnabled) {
      for (const kind of requestedKinds) {
        incrementAcpRuntimeMetric(
          owner.ownerKey,
          "panel_dropped_before_build",
          acpChatPublicationMetricLabels(
            kind,
            kinds.length === 0 ? causality : "owner-mismatch",
          ),
        );
      }
    }
    return;
  }
  if (kinds.includes("transcript")) {
    host.publicationCoordinator?.publishDomainChange({
      owner,
      kind: "transcript",
      cause: "steady-state",
      transcript: {
        form: "mutations",
        events: change.transcriptEvents || [],
        eventSeq: change.transcriptEventSeq || 0,
        totalItemCount: change.transcriptItemCount || 0,
        visibility: getAssistantExecutionDisplayMode(),
      },
    });
  }
  queueWorkspacePublications(
    host,
    "acp-chat",
    owner.ownerKey,
    kinds.filter((kind) => kind !== "transcript"),
  );
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
      transcriptReadMode: options?.transcriptReadMode || "page-first",
      transcriptPage: options?.transcriptPage || null,
    },
  );
  const profileRequestId = getActiveAcpChatOwnerKey();
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    incrementAcpRuntimeMetric(profileRequestId, "panel_requested", {
      surfaceState:
        host.activeTab === "acp-chat" ? "acp-active" : "open-inactive",
      publicationKind: "baseline-status",
      publicationCausality:
        host.activeTab === "acp-chat" ? "matching-target" : "opposite-active",
      publicationPhase: phase === "init" ? "initialization" : "steady-state",
      publicationSurface: "acp-chat",
      publicationForm: phase === "init" ? "initialization" : "snapshot",
      materializationSource: "panel-snapshot",
    });
  }
  const prepareStartedAt =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? readAcpRuntimePerformanceClockMs()
      : 0;
  const snapshot = await prepareAcpChatPanelSnapshot({
    target,
    transcriptReadMode: options?.transcriptReadMode,
    transcriptPage: options?.transcriptPage,
  });
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    const surfaceState =
      host.activeTab === "acp-chat" ? "acp-active" : "open-inactive";
    incrementAcpRuntimeMetric(profileRequestId, "panel_materialization", {
      surfaceState,
      publicationKind: "baseline-status",
      publicationCausality:
        host.activeTab === "acp-chat" ? "matching-target" : "opposite-active",
      publicationPhase: phase === "init" ? "initialization" : "steady-state",
      publicationSurface: "acp-chat",
      publicationForm: phase === "init" ? "initialization" : "snapshot",
      materializationSource: "panel-snapshot",
    });
    incrementAcpRuntimeMetric(profileRequestId, "panel_prepare", {
      surfaceState,
      publicationKind: "baseline-status",
      publicationCausality:
        host.activeTab === "acp-chat" ? "matching-target" : "opposite-active",
      publicationPhase: phase === "init" ? "initialization" : "steady-state",
      publicationSurface: "acp-chat",
      publicationForm: phase === "init" ? "initialization" : "snapshot",
      materializationSource: "panel-snapshot",
    });
    observeAcpRuntimeDuration(
      profileRequestId,
      "panel_prepare_duration",
      {
        surfaceState,
        publicationKind: "baseline-status",
        publicationCausality:
          host.activeTab === "acp-chat" ? "matching-target" : "opposite-active",
        publicationPhase: phase === "init" ? "initialization" : "steady-state",
        publicationSurface: "acp-chat",
        publicationForm: phase === "init" ? "initialization" : "snapshot",
        materializationSource: "panel-snapshot",
      },
      readAcpRuntimePerformanceClockMs() - prepareStartedAt,
    );
  }
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
  return postChildSnapshot(host, "acp-chat", phase, snapshot);
}

function getActiveAcpChatOwnerKey() {
  const { backendId, conversationId } = getActiveAcpChatOwner();
  if (!backendId) {
    return "";
  }
  return conversationId
    ? acpChatTranscriptPageKey(backendId, conversationId)
    : `${backendId}\n`;
}

function queueAcpChatPageFirstSnapshot(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "snapshot",
) {
  const ownerKey = getActiveAcpChatOwnerKey();
  if (!ownerKey) {
    return;
  }
  if (
    hosts.get(host.win) !== host ||
    host.activeTarget !== target ||
    host.activeTab !== "acp-chat"
  ) {
    return;
  }
  void postAcpChatPanelPublication(host, target, ownerKey, "transcript", {
    transcriptReadMode: "page-first",
  });
}

async function postAcpChatLoadingFirstSnapshot(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "snapshot",
) {
  const publicationId = await postAcpChatPanelSnapshot(host, target, phase, {
    transcriptReadMode: "loading-first",
  });
  queueAcpChatPageFirstSnapshot(host, target, "snapshot");
  return publicationId;
}

function canonicalizeAcpSkillRunSummaryForSignature(
  run: unknown,
  selectedRequestId: string,
  transcriptLoading: boolean,
) {
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return run;
  }
  const source = run as Record<string, unknown>;
  const requestId = String(source.requestId || "").trim();
  if (!transcriptLoading || requestId === selectedRequestId) {
    return source;
  }
  const canonical = { ...source };
  delete canonical.transcriptRevision;
  delete canonical.transcriptEventSeq;
  delete canonical.transcriptItemCount;
  delete canonical.transcriptPreview;
  return canonical;
}

function canonicalizeAcpSkillRunSnapshotForSignature(
  snapshot: Record<string, unknown>,
) {
  const signatureSource = { ...snapshot };
  delete signatureSource.generatedAt;
  const selectedRun =
    signatureSource.selectedRun &&
    typeof signatureSource.selectedRun === "object"
      ? (signatureSource.selectedRun as Record<string, unknown>)
      : null;
  const transcriptRegion =
    signatureSource.transcriptRegion &&
    typeof signatureSource.transcriptRegion === "object"
      ? (signatureSource.transcriptRegion as Record<string, unknown>)
      : null;
  const selectedRequestId = String(
    signatureSource.selectedRequestId ||
      selectedRun?.requestId ||
      (transcriptRegion?.owner as Record<string, unknown> | undefined)
        ?.requestId ||
      "",
  ).trim();
  const transcriptLoading =
    !!selectedRequestId && transcriptRegion?.status === "loading";
  if (Array.isArray(signatureSource.runs)) {
    signatureSource.runs = signatureSource.runs.map((run) =>
      canonicalizeAcpSkillRunSummaryForSignature(
        run,
        selectedRequestId,
        transcriptLoading,
      ),
    );
  }
  return signatureSource;
}

function buildAcpSkillRunSnapshotSignature(snapshot: Record<string, unknown>) {
  return JSON.stringify(canonicalizeAcpSkillRunSnapshotForSignature(snapshot));
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
  const selectedBeforeBuild = getSelectedAcpSkillRunRequestId();
  const profileRequestId = selectedBeforeBuild;
  const skillPublicationLabels = {
    surfaceState:
      host.activeTab === "acp-skills"
        ? ("acp-active" as const)
        : ("open-inactive" as const),
    publicationKind: "baseline-status" as const,
    publicationCausality:
      host.activeTab === "acp-skills"
        ? ("matching-target" as const)
        : ("opposite-active" as const),
    publicationPhase:
      phase === "init"
        ? ("initialization" as const)
        : ("steady-state" as const),
    publicationSurface: "acp-skills" as const,
    publicationForm:
      phase === "init" ? ("initialization" as const) : ("snapshot" as const),
    materializationSource: "panel-snapshot" as const,
  };
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    incrementAcpRuntimeMetric(
      profileRequestId,
      "panel_requested",
      skillPublicationLabels,
    );
  }
  const prepareStartedAt =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? readAcpRuntimePerformanceClockMs()
      : 0;
  const snapshot = await prepareAcpSkillRunPanelSnapshot({
    transcriptPage: options?.transcriptPage,
    transcriptReadMode: options?.transcriptReadMode,
  });
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    incrementAcpRuntimeMetric(
      profileRequestId,
      "panel_materialization",
      skillPublicationLabels,
    );
    incrementAcpRuntimeMetric(
      profileRequestId,
      "panel_prepare",
      skillPublicationLabels,
    );
    observeAcpRuntimeDuration(
      profileRequestId,
      "panel_prepare_duration",
      skillPublicationLabels,
      readAcpRuntimePerformanceClockMs() - prepareStartedAt,
    );
  }
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
    executionDisplayMode: getAssistantExecutionDisplayMode(),
    transcriptPaginationVirtualizationEnabled:
      isAssistantTranscriptPaginationVirtualizationEnabled(),
  };
  const signatureStartedAt =
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
      ? readAcpRuntimePerformanceClockMs()
      : 0;
  const signature = buildAcpSkillRunSnapshotSignature(payload);
  if (
    __acp_runtime_performance_profiler_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__)
  ) {
    incrementAcpRuntimeMetric(
      profileRequestId,
      "panel_signature",
      skillPublicationLabels,
    );
    incrementAcpRuntimeMetric(
      profileRequestId,
      "panel_signature_bytes",
      skillPublicationLabels,
      new TextEncoder().encode(signature).byteLength,
    );
    observeAcpRuntimeDuration(
      profileRequestId,
      "panel_signature_duration",
      skillPublicationLabels,
      readAcpRuntimePerformanceClockMs() - signatureStartedAt,
    );
  }
  const force = options?.force === true || phase === "init";
  if (
    !force &&
    host.lastAcpSkillRunSnapshotSignature &&
    host.lastAcpSkillRunSnapshotSignature === signature
  ) {
    if (
      __acp_runtime_performance_profiler_enabled__ &&
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__)
    ) {
      incrementAcpRuntimeMetric(
        profileRequestId,
        "panel_signature_skip",
        skillPublicationLabels,
      );
    }
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
  return postChildSnapshot(host, "acp-skills", phase, payload);
}

/**
 * Narrow test adapter for exercising the production ACP Skills
 * prepare/signature/post pipeline. Test fixtures provide a minimal host shape;
 * no publication logic is duplicated here.
 */
export async function postAcpSkillRunSnapshotForPerformanceTests(
  host: unknown,
  options?: AcpSkillRunSnapshotPostOptions,
) {
  await postAcpSkillRunSnapshot(
    host as AssistantWorkspaceHostRuntime,
    "snapshot",
    options,
  );
}

function queueAcpSkillRunPageFirstSnapshot(
  host: AssistantWorkspaceHostRuntime,
  phase: "init" | "snapshot" = "snapshot",
) {
  const selectedRequestId = getSelectedAcpSkillRunRequestId();
  if (!selectedRequestId) {
    return;
  }
  if (host.activeTab !== "acp-skills" || !host.activeTarget) {
    return;
  }
  void postAcpSkillRunSnapshot(host, phase, {
    force: true,
    transcriptReadMode: "page-first",
  });
}

async function postAcpSkillRunLoadingFirstSnapshot(
  host: AssistantWorkspaceHostRuntime,
  phase: "init" | "snapshot" = "snapshot",
) {
  const publicationId = await postAcpSkillRunSnapshot(host, phase, {
    force: true,
    transcriptReadMode: "loading-first",
  });
  queueAcpSkillRunPageFirstSnapshot(host, "snapshot");
  return publicationId;
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
      const ownerKey = getActiveAcpChatOwnerKey();
      if (ownerKey && host.activeTab === "acp-chat") {
        void postAcpChatPanelPublication(
          host,
          target,
          ownerKey,
          "baseline-status",
        );
      }
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

async function postSnapshotForTab(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  tab: AssistantWorkspaceTab,
  phase: "init" | "snapshot" = "snapshot",
  options?: { force?: boolean },
) {
  if (tab === "acp-chat") {
    if (options?.force === true || phase === "init") {
      return !!(await postAcpChatLoadingFirstSnapshot(host, target, phase));
    }
    const ownerKey = getActiveAcpChatOwnerKey();
    if (ownerKey) {
      const results = await Promise.all([
        postAcpChatPanelPublication(host, target, ownerKey, "baseline-status"),
        postAcpChatPanelPublication(host, target, ownerKey, "transcript"),
      ]);
      return results.some(Boolean);
    }
    return false;
  }
  if (tab === "acp-skills") {
    if (options?.force === true || phase === "init") {
      return !!(await postAcpSkillRunLoadingFirstSnapshot(host, phase));
    }
    return !!(await postAcpSkillRunSnapshot(host, phase));
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
  postShellMessage(host, "assistant-workspace:init", {
    activeTab,
    activeTarget: host.activeTarget,
    scopeKey: host.scopeKey,
  });
}

async function postInitialSnapshotsForAllTabs(
  host: AssistantWorkspaceHostRuntime,
  target: AcpSidebarTarget,
  phase: "init" | "snapshot" = "init",
) {
  for (const tab of ASSISTANT_WORKSPACE_TABS) {
    const documentGeneration = host.readyTabGenerations.get(tab);
    await postSnapshotForTab(host, target, tab, phase, { force: true });
    if (phase === "init") {
      markChildBaselineInitPublished(host, tab, target, documentGeneration);
    }
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
    await postInitialSnapshotsForAllTabs(host, target, phase);
    return true;
  }
  await postSnapshotForTab(host, target, host.activeTab, phase, {
    force: reason === "child-ready" || reason === "tab-switch",
  });
  return true;
}

function flushScheduledWorkspacePost(host: AssistantWorkspaceHostRuntime) {
  const publication = host.pendingWorkspacePublication;
  host.pendingWorkspacePublication = undefined;
  if (publication) {
    for (const kind of publication.kinds) {
      if (publication.source === "acp-chat") {
        void postAcpChatPanelPublication(
          host,
          publication.target,
          publication.ownerKey,
          kind,
          { requestRecorded: true },
        );
      } else {
        void postAcpSkillRunPublication(host, publication.ownerKey, kind);
      }
    }
  }
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
    flushScheduledWorkspacePost(host);
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
    const chat = getAcpFrontendSnapshot({ itemMode: "structural" });
    if (
      chat.activeBackendId !== args.expectedChatOwner.backendId ||
      chat.activeConversationId !== args.expectedChatOwner.conversationId
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
  const nativeToken = host.postSnapshotTimer;
  if (!nativeToken) return { timers: [], warnings: [] };
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
            host.postSnapshotTimer !== currentToken
          ) {
            return false;
          }
          clearTimeout(currentToken);
          return true;
        },
        fireIfCurrent: () => {
          if (
            hosts.get(host.win) !== host ||
            host.postSnapshotTimer !== currentToken
          ) {
            return false;
          }
          host.postSnapshotTimer = null;
          logAssistantWorkspaceDebug(
            host,
            "snapshot-post-fired",
            "Assistant Workspace scheduled snapshot post fired.",
          );
          flushScheduledWorkspacePost(host);
          return true;
        },
        resumeNative: (remainingMs) => {
          if (
            hosts.get(host.win) !== host ||
            host.postSnapshotTimer !== currentToken
          ) {
            return false;
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
    return setAssistantExecutionDisplayMode(mode);
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
    if (data.type === "assistant-workspace:publication-ack") {
      recordWorkspacePublicationAck(host, actionPayload);
      return { ok: true, actionId };
    }
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
      type: "skillrunner-sidebar:action",
      action,
      payload: childPayload,
    });
    return;
  }
  if (action === "load-transcript-page") {
    const pageRequest =
      parseAssistantWorkspaceTranscriptPageRequest(childPayload);
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
      await postAcpSkillRunPublication(host, requestId, "transcript", {
        transcriptPage: {
          requestId,
          cursor: pageRequest.request.cursor ?? undefined,
          limit: pageRequest.request.limit,
        },
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
    await postAcpChatPanelPublication(
      host,
      target,
      pageRequest.owner.ownerKey,
      "transcript",
      {
        transcriptPage: {
          backendId: pageRequest.owner.backendId,
          conversationId: pageRequest.owner.conversationId,
          requestId: pageRequest.owner.ownerKey,
          cursor: pageRequest.request.cursor ?? undefined,
          limit: pageRequest.request.limit,
        },
      },
    );
    return;
  }
  if (tab === "acp-skills") {
    if (action === "select-run") {
      await selectAcpSkillRun(String(childPayload.requestId || "").trim());
      await postAcpSkillRunLoadingFirstSnapshot(host, "snapshot");
      return;
    }
    await handleAcpSkillRunAction(host, action, childPayload);
    const requestId = getSelectedAcpSkillRunRequestId();
    if (requestId) {
      await postAcpSkillRunPublication(
        host,
        requestId,
        action === "resolve-permission" ? "permission" : "baseline-status",
        { force: true },
      );
    }
    return;
  }
  if (tab === "acp-chat") {
    if (
      action === "set-active-conversation" ||
      action === "set-active-backend" ||
      action === "new-conversation"
    ) {
      await handleAcpChatAction(host, target, action, childPayload);
      await postAcpChatLoadingFirstSnapshot(host, target, "snapshot");
      return;
    }
  }
  await handleAcpChatAction(host, target, action, childPayload);
  const ownerKey = getActiveAcpChatOwnerKey();
  if (ownerKey) {
    await postAcpChatPanelPublication(
      host,
      target,
      ownerKey,
      "baseline-status",
      { force: true },
    );
  }
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
  const acknowledgementKey = [ack.stage, ack.outcome, ack.reason || ""].join(
    ":",
  );
  if (!lifecycle || lifecycle.acknowledgements.has(acknowledgementKey)) return;
  lifecycle.acknowledgements.add(acknowledgementKey);
  if (ack.outcome === "rejected" && lifecycle.state === "pending") {
    lifecycle.state = "rejected";
    lifecycle.reason = ack.reason;
  } else if (ack.stage === "render-complete" && ack.outcome === "accepted") {
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
  if (!ownerKey || ack.outcome !== "accepted") return;
  const labels = {
    operationClass: "panel" as const,
    publicationKind: lifecycle.kind,
    publicationCausality: "matching-target" as const,
    publicationPhase:
      lifecycle.cause === "initialization"
        ? ("initialization" as const)
        : ("steady-state" as const),
    publicationSurface: lifecycle.source,
    publicationForm:
      lifecycle.cause === "initialization"
        ? ("initialization" as const)
        : lifecycle.form,
    materializationSource:
      lifecycle.kind === "transcript" && lifecycle.form === "snapshot"
        ? ("transcript-page" as const)
        : ("region" as const),
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
    publicationForm:
      lifecycle.cause === "initialization"
        ? ("initialization" as const)
        : lifecycle.form,
    materializationSource: "region" as const,
    renderPath:
      payload.renderPath === "snapshot"
        ? ("snapshot" as const)
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

async function handleAcpSkillRunAction(
  host: AssistantWorkspaceHostRuntime,
  action: string,
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
    drawerGroupCollapsed: new Map<string, boolean>(),
    scopeKey: createAssistantSidebarScopeKey("assistant-sidebar-workspace"),
    snapshotRevision: 0,
    acpChatSnapshotBuildSeq: 0,
    acpSkillRunSnapshotBuildSeq: 0,
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
      const tab = publication.owner.source;
      const posted = postShellMessage(
        host,
        "assistant-workspace:child-publication",
        { tab, publication },
      );
      if (posted) {
        registerWorkspacePublication(
          host,
          tab,
          publication.publicationId,
          publication,
        );
      }
      return posted;
    },
  });
  mountLibraryPane(host);
  mountReaderPane(host);
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
      scheduleAcpChatPublications(host, change);
    },
  );
  host.removeAcpSkillRunSubscription = subscribeAcpSkillRunSnapshots(
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
      if (host.activeTab === "skillrunner" && host.activeTarget) {
        scheduleSkillRunnerSidebarRefresh(host, host.activeTarget, {
          selectionChanged: false,
        });
        return;
      }
      if (host.activeTab === "acp-chat" && host.activeTarget) {
        const [backendId, conversationId] = getActiveAcpChatOwnerKey().split(
          "\n",
          2,
        );
        scheduleAcpChatPublications(host, {
          backendId,
          conversationId,
          active: true,
          kinds: ["runtime-options", "transcript-boundary"],
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

function assistantWorkspaceDiagnosticsReadinessDetail(
  host: AssistantWorkspaceHostRuntime,
  args: AssistantWorkspaceDiagnosticsPublicationOptions,
) {
  if (!host.activeTarget) return "workspace-target-not-ready";
  if (host.activeTab !== args.tab) return "workspace-tab-not-ready";
  if (!host.shell.ready) return "workspace-shell-not-ready";
  if (!host.readyTabs.has(args.tab)) return "workspace-child-not-ready";
  if (args.expectedChatOwner) {
    const chat = getAcpFrontendSnapshot({ itemMode: "structural" });
    if (
      chat.activeBackendId !== args.expectedChatOwner.backendId ||
      chat.activeConversationId !== args.expectedChatOwner.conversationId
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
      .filter((entry) => entry.tab === args.tab)
      .map(
        ({ publicationId, source, tab, deliverySequence, state, reason }) => ({
          publicationId,
          source,
          tab,
          deliverySequence,
          state,
          ...(reason ? { reason } : {}),
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
  const barrier = async (publicationId: string) => {
    const publication =
      await host.publicationCoordinator?.waitForPostedPublication(
        publicationId,
      );
    return publication
      ? {
          source: publication.owner.source,
          tab: publication.owner.source,
          publicationId,
          deliverySequence: publication.deliverySequence,
        }
      : undefined;
  };
  if (args.tab === "acp-chat") {
    const ownerKey = getActiveAcpChatOwnerKey();
    if (!ownerKey) {
      const publicationId = await postAcpChatLoadingFirstSnapshot(
        host,
        activeTarget,
        "snapshot",
      );
      return publicationId ? barrier(publicationId) : undefined;
    }
    const publicationId = await postAcpChatPanelPublication(
      host,
      activeTarget,
      ownerKey,
      "transcript",
      { force: true },
    );
    return publicationId ? barrier(publicationId) : undefined;
  } else if (args.tab === "acp-skills") {
    const requestId = getSelectedAcpSkillRunRequestId();
    const publicationId = requestId
      ? await postAcpSkillRunPublication(host, requestId, "transcript", {
          force: true,
        })
      : await postAcpSkillRunLoadingFirstSnapshot(host, "snapshot");
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

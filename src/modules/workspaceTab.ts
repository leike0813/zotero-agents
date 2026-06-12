import { config } from "../../package.json";
import { resolveAddonRef } from "../utils/runtimeBridge";
import {
  mountSynthesisWorkbenchRuntime,
  type MountedSynthesisWorkbenchRuntime,
} from "./synthesisWorkbenchTab";
import {
  type DashboardManagementHost,
  mountTaskDashboardRuntime,
  type MountedTaskDashboardRuntime,
} from "./taskManagerDialog";
import {
  closeAssistantWorkspaceSidebar,
  isAssistantWorkspaceSidebarOpen,
  openAssistantWorkspaceSidebar,
  toggleAssistantWorkspaceSidebar,
} from "./assistantWorkspaceSidebar";
import {
  listAcpSkillRuns,
  subscribeAcpSkillRunSnapshots,
} from "./acpSkillRunStore";
import { countDashboardHumanAttentionTasks } from "./dashboardActiveTasks";
import { listActiveWorkflowTasks, subscribeWorkflowTasks } from "./taskRuntime";
import {
  installWorkspaceToolbarTaskPopover,
  uninstallWorkspaceToolbarTaskPopover,
} from "./workspaceToolbarTaskPopover";

type WorkspaceView = "dashboard" | "synthesis";
type DashboardSelection = {
  tabKey?: string;
  workflowId?: string;
  backendSubview?: "runs" | "management";
};

type ZoteroTabs = {
  add?: (options: Record<string, unknown>) => {
    id?: string;
    container?: Element;
  };
  select?: (id: string) => unknown;
  close?: (id: string) => unknown;
};

type WorkspaceRuntime = {
  tabId: string;
  window: _ZoteroTypes.MainWindow;
  frame: Element;
  frameWindow: Window | null;
  selectedView: WorkspaceView;
  dashboardRuntime?: MountedTaskDashboardRuntime;
  pendingDashboardSelection?: DashboardSelection;
  managementOverlay?: {
    key: string;
    wrapper: Element;
    previousFrameDisplay: string;
  };
  synthesisRuntime?: MountedSynthesisWorkbenchRuntime;
  removeMessageListener?: () => void;
  removeAcpSkillRunSubscription?: () => void;
  removeTaskSubscription?: () => void;
  workspaceSidebarPopoverAnchor?: Element | null;
  handshakeTimer?: ReturnType<typeof setInterval>;
  selectionRestoreTimer?: ReturnType<typeof setTimeout>;
  handshakeAttemptCount: number;
  handshakeSuccessCount: number;
  handshakeComplete: boolean;
};

const WORKSPACE_TAB_ID = "zotero-skills-workspace";
const WORKSPACE_TAB_ICON = "zotero-skills-workspace";
const WORKSPACE_TAB_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_workbench_32.png`;
const WORKSPACE_BRIDGE_KEY = "__zoteroSkillsWorkspaceBridge";
const WORKSPACE_HANDSHAKE_INTERVAL_MS = 100;
const WORKSPACE_HANDSHAKE_REQUIRED_SUCCESSES = 5;
const WORKSPACE_HANDSHAKE_MAX_ATTEMPTS = 80;
const WORKSPACE_TAB_SELECTION_RESTORE_DELAY_MS = 50;

let workspaceTab: WorkspaceRuntime | undefined;

function resolveWorkspacePageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  return addonRef
    ? `chrome://${addonRef}/content/workspace/index.html?ui=20260520-controls-v5`
    : "about:blank";
}

function resolveHostWindow(argsWindow?: _ZoteroTypes.MainWindow) {
  return (
    argsWindow ||
    workspaceTab?.window ||
    ((globalThis as any).Zotero?.getMainWindow?.() as
      | _ZoteroTypes.MainWindow
      | undefined)
  );
}

function resolveZoteroTabs(win: _ZoteroTypes.MainWindow | undefined) {
  return (
    (win as unknown as { Zotero_Tabs?: ZoteroTabs } | undefined)?.Zotero_Tabs ||
    ((globalThis as any).Zotero_Tabs as ZoteroTabs | undefined)
  );
}

function createWorkspaceBrowser(doc: Document) {
  const xulDocument = doc as Document & {
    createXULElement?: (tag: string) => Element;
  };
  const frame =
    typeof xulDocument.createXULElement === "function"
      ? xulDocument.createXULElement("browser")
      : doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "workspace-frame");
  frame.setAttribute("disableglobalhistory", "true");
  frame.setAttribute("maychangeremoteness", "true");
  frame.setAttribute("flex", "1");
  frame.setAttribute("type", "content");
  frame.setAttribute("transparent", "true");
  (frame as HTMLElement).style.width = "100%";
  (frame as HTMLElement).style.height = "100%";
  (frame as HTMLElement).style.minHeight = "0";
  (frame as HTMLElement).style.border = "none";
  return frame;
}

function setElementDisplay(node: Element, value: string) {
  (node as HTMLElement).style.display = value;
}

function styleElement(
  node: Element,
  styles: Record<string, string | undefined>,
) {
  const styled = node as HTMLElement;
  for (const [name, value] of Object.entries(styles)) {
    if (value !== undefined) {
      styled.style.setProperty(name, value);
    }
  }
}

function createElementForChromeDoc(doc: Document, tag: string) {
  const createXul = (doc as { createXULElement?: (tag: string) => Element })
    .createXULElement;
  return typeof createXul === "function"
    ? createXul.call(doc, tag)
    : doc.createElement(tag);
}

function setChromeElementText(
  node: Element,
  text: string,
  xulAttribute: string,
) {
  if (
    node.namespaceURI ===
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
  ) {
    node.setAttribute(xulAttribute, text);
    return;
  }
  node.textContent = text;
}

function clearManagementOverlay(runtime: WorkspaceRuntime) {
  if (!runtime.managementOverlay) {
    return;
  }
  runtime.managementOverlay.wrapper.remove();
  setElementDisplay(
    runtime.frame,
    runtime.managementOverlay.previousFrameDisplay,
  );
  runtime.managementOverlay = undefined;
}

function createManagementHost(
  runtime: WorkspaceRuntime,
): DashboardManagementHost {
  return {
    mount: ({ backendId, title, url, onClose }) => {
      const key = `${backendId}\n${url}`;
      if (runtime.managementOverlay?.key === key) {
        return;
      }
      clearManagementOverlay(runtime);
      const doc = runtime.window.document;
      const container = runtime.frame.parentElement;
      if (!container) {
        return;
      }
      const previousFrameDisplay = (runtime.frame as HTMLElement).style.display;
      setElementDisplay(runtime.frame, "none");

      const wrapper = createElementForChromeDoc(doc, "vbox");
      wrapper.setAttribute(
        "data-zs-role",
        "skillrunner-management-workspace-host",
      );
      wrapper.setAttribute("flex", "1");
      styleElement(wrapper, {
        width: "100%",
        height: "100%",
        "min-width": "0",
        "min-height": "0",
        display: "flex",
        "flex-direction": "column",
        overflow: "hidden",
      });

      const toolbar = createElementForChromeDoc(doc, "hbox");
      toolbar.setAttribute(
        "data-zs-role",
        "skillrunner-management-workspace-toolbar",
      );
      styleElement(toolbar, {
        display: "flex",
        "align-items": "center",
        gap: "8px",
        padding: "8px 10px",
        "border-bottom": "1px solid rgba(128, 128, 128, 0.35)",
      });

      const titleNode = createElementForChromeDoc(doc, "label");
      setChromeElementText(
        titleNode,
        title || "SkillRunner Management",
        "value",
      );
      styleElement(titleNode, {
        flex: "1 1 auto",
        "font-weight": "600",
        overflow: "hidden",
        "text-overflow": "ellipsis",
        "white-space": "nowrap",
      });

      const backButton = createElementForChromeDoc(doc, "button");
      (backButton as HTMLButtonElement).type = "button";
      setChromeElementText(backButton, "Back to Runs", "label");
      backButton.addEventListener("click", () => {
        clearManagementOverlay(runtime);
        onClose();
      });

      const externalButton = createElementForChromeDoc(doc, "button");
      (externalButton as HTMLButtonElement).type = "button";
      setChromeElementText(externalButton, "Open in Browser", "label");
      externalButton.addEventListener("click", () => {
        (globalThis as any).Zotero?.launchURL?.(url);
      });

      toolbar.appendChild(backButton);
      toolbar.appendChild(titleNode);
      toolbar.appendChild(externalButton);

      const browser = createElementForChromeDoc(doc, "browser");
      browser.setAttribute(
        "data-zs-role",
        "skillrunner-management-workspace-frame",
      );
      browser.setAttribute("disableglobalhistory", "true");
      browser.setAttribute("maychangeremoteness", "true");
      browser.setAttribute("type", "content");
      browser.setAttribute("flex", "1");
      browser.setAttribute("src", url);
      styleElement(browser, {
        flex: "1 1 auto",
        width: "100%",
        height: "100%",
        "min-width": "0",
        "min-height": "0",
        border: "0",
      });

      wrapper.appendChild(toolbar);
      wrapper.appendChild(browser);
      container.appendChild(wrapper);
      runtime.managementOverlay = {
        key,
        wrapper,
        previousFrameDisplay,
      };
    },
    clear: () => clearManagementOverlay(runtime),
  };
}

function setFrameSource(frame: Element, pageUrl: string) {
  if (
    typeof HTMLIFrameElement !== "undefined" &&
    frame instanceof HTMLIFrameElement
  ) {
    frame.src = pageUrl;
    return;
  }
  frame.setAttribute("src", pageUrl);
}

function resolveFrameWindow(frame: Element | null) {
  if (!frame) {
    return null;
  }
  return (
    (frame as Element & { contentWindow?: Window | null }).contentWindow ||
    (frame as Element & { contentDocument?: Document | null }).contentDocument
      ?.defaultView ||
    null
  );
}

function writeBridge(
  target: Record<string, unknown> | null | undefined,
  runtime?: WorkspaceRuntime,
) {
  if (!target) {
    return;
  }
  if (!runtime) {
    delete target[WORKSPACE_BRIDGE_KEY];
    return;
  }
  target[WORKSPACE_BRIDGE_KEY] = {
    postMessage: async (action: string, payload?: Record<string, unknown>) => {
      await handleAction(runtime, action, payload || {});
    },
  };
}

function installBridge(runtime: WorkspaceRuntime) {
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  if (!frameWindow) {
    return false;
  }
  runtime.frameWindow = frameWindow;
  const directTarget = frameWindow as Window & Record<string, unknown>;
  const wrappedTarget =
    typeof (directTarget as { wrappedJSObject?: unknown }).wrappedJSObject ===
    "object"
      ? ((directTarget as { wrappedJSObject?: Record<string, unknown> })
          .wrappedJSObject as Record<string, unknown>)
      : null;
  writeBridge(directTarget, runtime);
  writeBridge(wrappedTarget, runtime);
  return true;
}

function clearBridge(runtime: WorkspaceRuntime) {
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
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
  writeBridge(directTarget);
  writeBridge(wrappedTarget);
}

function countWorkspaceHumanAttentionTasks() {
  return countDashboardHumanAttentionTasks({
    activeTasks: listActiveWorkflowTasks(),
    acpSkillRuns: listAcpSkillRuns(),
  });
}

function postAttention(runtime: WorkspaceRuntime) {
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  if (!frameWindow) {
    return;
  }
  runtime.frameWindow = frameWindow;
  frameWindow.postMessage(
    {
      type: "workspace:attention",
      payload: {
        waitingCount: countWorkspaceHumanAttentionTasks(),
      },
    },
    "*",
  );
}

function uninstallWorkspaceSidebarTaskPopover(runtime: WorkspaceRuntime) {
  if (!runtime.workspaceSidebarPopoverAnchor) {
    return;
  }
  uninstallWorkspaceToolbarTaskPopover({
    anchor: runtime.workspaceSidebarPopoverAnchor,
  });
  runtime.workspaceSidebarPopoverAnchor = null;
}

function installWorkspaceSidebarTaskPopover(runtime: WorkspaceRuntime) {
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  const anchor = frameWindow?.document?.querySelector(".sidebar-toggle");
  if (!frameWindow || !anchor) {
    return;
  }
  runtime.frameWindow = frameWindow;
  if (runtime.workspaceSidebarPopoverAnchor === anchor) {
    return;
  }
  uninstallWorkspaceSidebarTaskPopover(runtime);
  runtime.workspaceSidebarPopoverAnchor = anchor;
  installWorkspaceToolbarTaskPopover({
    window: runtime.window,
    anchor,
  });
}

function syncWorkspaceSidebarEntry(runtime: WorkspaceRuntime) {
  installWorkspaceSidebarTaskPopover(runtime);
  postAttention(runtime);
}

async function syncWorkspaceTabSelectionState(
  runtime: WorkspaceRuntime,
  shouldRestoreSidebar = isAssistantWorkspaceSidebarOpen({
    window: runtime.window,
  }),
) {
  syncWorkspaceSidebarEntry(runtime);
  if (shouldRestoreSidebar) {
    await openAssistantWorkspaceSidebar({
      window: runtime.window,
      target: "reader",
    });
  }
}

function scheduleWorkspaceTabSelectionStateSync(runtime: WorkspaceRuntime) {
  const shouldRestoreSidebar = isAssistantWorkspaceSidebarOpen({
    window: runtime.window,
  });
  if (runtime.selectionRestoreTimer) {
    clearTimeout(runtime.selectionRestoreTimer);
  }
  runtime.selectionRestoreTimer = setTimeout(() => {
    runtime.selectionRestoreTimer = undefined;
    if (workspaceTab !== runtime) {
      return;
    }
    void syncWorkspaceTabSelectionState(runtime, shouldRestoreSidebar);
  }, WORKSPACE_TAB_SELECTION_RESTORE_DELAY_MS);
}

function postSnapshot(
  runtime: WorkspaceRuntime,
  type: "workspace:init" | "workspace:snapshot",
) {
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  if (!frameWindow) {
    return;
  }
  runtime.frameWindow = frameWindow;
  frameWindow.postMessage(
    {
      type,
      payload: {
        selectedView: runtime.selectedView,
        waitingCount: countWorkspaceHumanAttentionTasks(),
      },
    },
    "*",
  );
}

async function ensureWorkspaceHandshake(runtime: WorkspaceRuntime) {
  runtime.frameWindow = resolveFrameWindow(runtime.frame);
  if (!runtime.frameWindow || !installBridge(runtime)) {
    return false;
  }
  postSnapshot(runtime, "workspace:init");
  syncWorkspaceSidebarEntry(runtime);
  await mountDashboardRuntimeIfReady(runtime);
  await mountSynthesisRuntimeIfReady(runtime);
  return true;
}

function stopWorkspaceHandshake(runtime: WorkspaceRuntime) {
  if (!runtime.handshakeTimer) {
    return;
  }
  clearInterval(runtime.handshakeTimer);
  runtime.handshakeTimer = undefined;
}

function stopWorkspaceSelectionRestore(runtime: WorkspaceRuntime) {
  if (!runtime.selectionRestoreTimer) {
    return;
  }
  clearTimeout(runtime.selectionRestoreTimer);
  runtime.selectionRestoreTimer = undefined;
}

function finalizeWorkspaceHandshake(runtime: WorkspaceRuntime) {
  if (runtime.handshakeComplete) {
    return;
  }
  runtime.handshakeComplete = true;
  stopWorkspaceHandshake(runtime);
  postSnapshot(runtime, "workspace:init");
  syncWorkspaceSidebarEntry(runtime);
  void mountDashboardRuntimeIfReady(runtime);
  void mountSynthesisRuntimeIfReady(runtime);
}

function scheduleWorkspaceHandshake(runtime: WorkspaceRuntime) {
  if (runtime.handshakeComplete || runtime.handshakeTimer) {
    return;
  }
  const run = () => {
    runtime.handshakeAttemptCount += 1;
    void ensureWorkspaceHandshake(runtime).then((ok) => {
      if (ok) {
        runtime.handshakeSuccessCount += 1;
      }
      if (
        runtime.handshakeSuccessCount >= WORKSPACE_HANDSHAKE_REQUIRED_SUCCESSES
      ) {
        finalizeWorkspaceHandshake(runtime);
        return;
      }
      if (runtime.handshakeAttemptCount >= WORKSPACE_HANDSHAKE_MAX_ATTEMPTS) {
        stopWorkspaceHandshake(runtime);
        if (runtime.handshakeSuccessCount > 0) {
          finalizeWorkspaceHandshake(runtime);
        }
      }
    });
  };
  run();
  runtime.handshakeTimer = setInterval(run, WORKSPACE_HANDSHAKE_INTERVAL_MS);
}

async function mountDashboardRuntimeIfReady(runtime: WorkspaceRuntime) {
  if (runtime.dashboardRuntime) {
    if (runtime.pendingDashboardSelection) {
      runtime.dashboardRuntime.selectTab(runtime.pendingDashboardSelection);
      runtime.pendingDashboardSelection = undefined;
    }
    return;
  }
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  const root = frameWindow?.document?.getElementById(
    "dashboard-mount",
  ) as HTMLElement | null;
  if (!frameWindow || !root) {
    return;
  }
  runtime.frameWindow = frameWindow;
  const initialSelection = runtime.pendingDashboardSelection;
  runtime.dashboardRuntime = await mountTaskDashboardRuntime({
    root,
    hostWindow: frameWindow,
    chromeWindow: runtime.window,
    initialTabKey: initialSelection?.tabKey,
    initialWorkflowId: initialSelection?.workflowId,
    initialBackendSubview: initialSelection?.backendSubview,
    managementHost: createManagementHost(runtime),
  });
  runtime.pendingDashboardSelection = undefined;
}

function cleanupDashboardRuntime(runtime: WorkspaceRuntime) {
  clearManagementOverlay(runtime);
  runtime.dashboardRuntime?.cleanup();
  runtime.dashboardRuntime = undefined;
}

async function mountSynthesisRuntimeIfReady(runtime: WorkspaceRuntime) {
  if (runtime.synthesisRuntime) {
    return;
  }
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  const root = frameWindow?.document?.getElementById(
    "synthesis-mount",
  ) as HTMLElement | null;
  if (!frameWindow || !root) {
    return;
  }
  runtime.frameWindow = frameWindow;
  runtime.synthesisRuntime = await mountSynthesisWorkbenchRuntime({
    root,
    hostWindow: frameWindow,
    chromeWindow: runtime.window,
  });
}

function cleanupSynthesisRuntime(runtime: WorkspaceRuntime) {
  runtime.synthesisRuntime?.cleanup();
  runtime.synthesisRuntime = undefined;
}

async function handleAction(
  runtime: WorkspaceRuntime,
  actionRaw: string,
  payload: Record<string, unknown>,
) {
  const action = String(actionRaw || "").trim();
  if (action === "ready" || action === "refresh") {
    postSnapshot(
      runtime,
      action === "ready" ? "workspace:init" : "workspace:snapshot",
    );
    syncWorkspaceSidebarEntry(runtime);
    await mountDashboardRuntimeIfReady(runtime);
    await mountSynthesisRuntimeIfReady(runtime);
    if (action === "refresh") {
      await runtime.dashboardRuntime?.refresh?.();
      await runtime.synthesisRuntime?.refresh?.();
    }
    return;
  }
  if (action === "select-view") {
    const nextView = payload.view === "synthesis" ? "synthesis" : "dashboard";
    if (nextView !== "dashboard") {
      clearManagementOverlay(runtime);
    }
    runtime.selectedView = nextView;
    postSnapshot(runtime, "workspace:snapshot");
    syncWorkspaceSidebarEntry(runtime);
    await mountDashboardRuntimeIfReady(runtime);
    await mountSynthesisRuntimeIfReady(runtime);
    return;
  }
  if (action === "dashboard-mount-ready") {
    await mountDashboardRuntimeIfReady(runtime);
    return;
  }
  if (action === "synthesis-mount-ready") {
    await mountSynthesisRuntimeIfReady(runtime);
    return;
  }
  if (action === "open-sidebar") {
    await openAssistantWorkspaceSidebar({
      window: runtime.window,
      target: "reader",
    });
    return;
  }
  if (action === "close-sidebar") {
    closeAssistantWorkspaceSidebar({ window: runtime.window });
    return;
  }
  if (action === "toggle-sidebar") {
    await toggleAssistantWorkspaceSidebar({
      window: runtime.window,
      target: "reader",
    });
    return;
  }
}

function cleanupWorkspaceTab() {
  if (workspaceTab) {
    stopWorkspaceHandshake(workspaceTab);
    stopWorkspaceSelectionRestore(workspaceTab);
    workspaceTab.removeAcpSkillRunSubscription?.();
    workspaceTab.removeTaskSubscription?.();
    uninstallWorkspaceSidebarTaskPopover(workspaceTab);
    cleanupDashboardRuntime(workspaceTab);
    cleanupSynthesisRuntime(workspaceTab);
    clearBridge(workspaceTab);
  }
  if (workspaceTab?.removeMessageListener) {
    workspaceTab.removeMessageListener();
  }
  workspaceTab = undefined;
}

function attachBridge(runtime: WorkspaceRuntime) {
  const frame = runtime.frame;
  frame.addEventListener("load", () => {
    uninstallWorkspaceSidebarTaskPopover(runtime);
    void ensureWorkspaceHandshake(runtime);
    scheduleWorkspaceHandshake(runtime);
  });
  const onMessage = (event: MessageEvent) => {
    const data = event.data as {
      type?: unknown;
      action?: unknown;
      payload?: unknown;
    };
    if (!data || data.type !== "workspace:action") {
      return;
    }
    void handleAction(
      runtime,
      String(data.action || ""),
      data.payload && typeof data.payload === "object"
        ? (data.payload as Record<string, unknown>)
        : {},
    );
  };
  runtime.window.addEventListener("message", onMessage);
  runtime.removeMessageListener = () => {
    runtime.window.removeEventListener("message", onMessage);
  };
}

export async function openZoteroSkillsWorkspaceTab(
  args: {
    window?: _ZoteroTypes.MainWindow;
    initialView?: WorkspaceView;
    initialDashboardTabKey?: string;
    initialDashboardWorkflowId?: string;
    initialDashboardBackendSubview?: "runs" | "management";
  } = {},
) {
  const hostWindow = resolveHostWindow(args.window);
  const tabs = resolveZoteroTabs(hostWindow);
  if (!hostWindow || !tabs?.add || !tabs.select) {
    throw new Error(
      "Cannot open Zotero Skills Workspace: Zotero_Tabs is unavailable.",
    );
  }
  const Zotero_Tabs = tabs as ZoteroTabs & {
    add: NonNullable<ZoteroTabs["add"]>;
    select: NonNullable<ZoteroTabs["select"]>;
  };
  const reopenAssistantSidebar = isAssistantWorkspaceSidebarOpen({
    window: hostWindow,
  });
  const dashboardSelection: DashboardSelection | undefined =
    args.initialDashboardTabKey ||
    args.initialDashboardWorkflowId ||
    args.initialDashboardBackendSubview
      ? {
          tabKey: args.initialDashboardTabKey,
          workflowId: args.initialDashboardWorkflowId,
          backendSubview: args.initialDashboardBackendSubview,
        }
      : undefined;
  if (workspaceTab) {
    workspaceTab.selectedView = args.initialView || workspaceTab.selectedView;
    if (dashboardSelection) {
      workspaceTab.pendingDashboardSelection = dashboardSelection;
    }
    Zotero_Tabs.select(WORKSPACE_TAB_ID);
    postSnapshot(workspaceTab, "workspace:snapshot");
    await syncWorkspaceTabSelectionState(workspaceTab, reopenAssistantSidebar);
    await mountDashboardRuntimeIfReady(workspaceTab);
    await mountSynthesisRuntimeIfReady(workspaceTab);
    return;
  }
  const result = Zotero_Tabs.add({
    id: WORKSPACE_TAB_ID,
    type: "zotero-skills-workspace",
    title: "Zotero Skills",
    data: {
      kind: "zotero-skills-workspace",
      icon: WORKSPACE_TAB_ICON,
      iconURI: WORKSPACE_TAB_ICON_URI,
    },
    select: true,
    onClose: cleanupWorkspaceTab,
    onSelect: () => {
      if (!workspaceTab) {
        return;
      }
      scheduleWorkspaceTabSelectionStateSync(workspaceTab);
    },
  });
  const container = result?.container;
  if (!container) {
    throw new Error(
      "Cannot open Zotero Skills Workspace: tab container is missing.",
    );
  }
  const frame = createWorkspaceBrowser(hostWindow.document);
  container.appendChild(frame);
  const runtime: WorkspaceRuntime = {
    tabId: WORKSPACE_TAB_ID,
    window: hostWindow,
    frame,
    frameWindow: resolveFrameWindow(frame),
    selectedView: args.initialView || "dashboard",
    pendingDashboardSelection: dashboardSelection,
    handshakeAttemptCount: 0,
    handshakeSuccessCount: 0,
    handshakeComplete: false,
  };
  runtime.removeAcpSkillRunSubscription = subscribeAcpSkillRunSnapshots(() => {
    syncWorkspaceSidebarEntry(runtime);
  });
  runtime.removeTaskSubscription = subscribeWorkflowTasks(() => {
    syncWorkspaceSidebarEntry(runtime);
  });
  workspaceTab = runtime;
  attachBridge(runtime);
  setFrameSource(frame, resolveWorkspacePageUrl());
  scheduleWorkspaceHandshake(runtime);
  Zotero_Tabs.select(WORKSPACE_TAB_ID);
  await syncWorkspaceTabSelectionState(runtime, reopenAssistantSidebar);
}

export function resetZoteroSkillsWorkspaceTabRuntimeForTests() {
  cleanupWorkspaceTab();
}

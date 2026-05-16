import { config } from "../../package.json";
import { resolveAddonRef } from "../utils/runtimeBridge";
import {
  mountSynthesisWorkbenchRuntime,
  type MountedSynthesisWorkbenchRuntime,
} from "./synthesisWorkbenchTab";
import {
  mountTaskDashboardRuntime,
  type MountedTaskDashboardRuntime,
} from "./taskManagerDialog";
import {
  closeAssistantWorkspaceSidebar,
  openAssistantWorkspaceSidebar,
  toggleAssistantWorkspaceSidebar,
} from "./assistantWorkspaceSidebar";

type WorkspaceView = "dashboard" | "synthesis";

type ZoteroTabs = {
  add?: (options: Record<string, unknown>) => { id?: string; container?: Element };
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
  synthesisRuntime?: MountedSynthesisWorkbenchRuntime;
  removeMessageListener?: () => void;
  handshakeTimer?: ReturnType<typeof setInterval>;
  handshakeAttemptCount: number;
  handshakeSuccessCount: number;
  handshakeComplete: boolean;
};

const WORKSPACE_TAB_ID = "zotero-skills-workspace";
const WORKSPACE_BRIDGE_KEY = "__zoteroSkillsWorkspaceBridge";
const WORKSPACE_HANDSHAKE_INTERVAL_MS = 100;
const WORKSPACE_HANDSHAKE_REQUIRED_SUCCESSES = 5;
const WORKSPACE_HANDSHAKE_MAX_ATTEMPTS = 80;

let workspaceTab: WorkspaceRuntime | undefined;

function resolveWorkspacePageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  return addonRef ? `chrome://${addonRef}/content/workspace/index.html` : "about:blank";
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
    (win as unknown as { Zotero_Tabs?: ZoteroTabs } | undefined)
      ?.Zotero_Tabs ||
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

function postSnapshot(runtime: WorkspaceRuntime, type: "workspace:init" | "workspace:snapshot") {
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

function finalizeWorkspaceHandshake(runtime: WorkspaceRuntime) {
  if (runtime.handshakeComplete) {
    return;
  }
  runtime.handshakeComplete = true;
  stopWorkspaceHandshake(runtime);
  postSnapshot(runtime, "workspace:init");
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
        runtime.handshakeSuccessCount >=
        WORKSPACE_HANDSHAKE_REQUIRED_SUCCESSES
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
  if (runtime.selectedView !== "dashboard" || runtime.dashboardRuntime) {
    return;
  }
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  const root = frameWindow?.document?.getElementById("dashboard-mount") as
    | HTMLElement
    | null;
  if (!frameWindow || !root) {
    return;
  }
  runtime.frameWindow = frameWindow;
  runtime.dashboardRuntime = await mountTaskDashboardRuntime({
    root,
    hostWindow: frameWindow,
    chromeWindow: runtime.window,
  });
}

function cleanupDashboardRuntime(runtime: WorkspaceRuntime) {
  runtime.dashboardRuntime?.cleanup();
  runtime.dashboardRuntime = undefined;
}

async function mountSynthesisRuntimeIfReady(runtime: WorkspaceRuntime) {
  if (runtime.selectedView !== "synthesis" || runtime.synthesisRuntime) {
    return;
  }
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  const root = frameWindow?.document?.getElementById("synthesis-mount") as
    | HTMLElement
    | null;
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
    postSnapshot(runtime, action === "ready" ? "workspace:init" : "workspace:snapshot");
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
    if (runtime.selectedView !== nextView) {
      cleanupDashboardRuntime(runtime);
      cleanupSynthesisRuntime(runtime);
    }
    runtime.selectedView = nextView;
    postSnapshot(runtime, "workspace:snapshot");
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
    await openAssistantWorkspaceSidebar({ window: runtime.window });
    return;
  }
  if (action === "close-sidebar") {
    closeAssistantWorkspaceSidebar({ window: runtime.window });
    return;
  }
  if (action === "toggle-sidebar") {
    await toggleAssistantWorkspaceSidebar({ window: runtime.window });
    return;
  }
}

function cleanupWorkspaceTab() {
  if (workspaceTab) {
    stopWorkspaceHandshake(workspaceTab);
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
    void ensureWorkspaceHandshake(runtime);
    scheduleWorkspaceHandshake(runtime);
  });
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: unknown; action?: unknown; payload?: unknown };
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

export async function openZoteroSkillsWorkspaceTab(args: {
  window?: _ZoteroTypes.MainWindow;
  initialView?: WorkspaceView;
} = {}) {
  const hostWindow = resolveHostWindow(args.window);
  const tabs = resolveZoteroTabs(hostWindow);
  if (!hostWindow || !tabs?.add || !tabs.select) {
    throw new Error("Cannot open Zotero Skills Workspace: Zotero_Tabs is unavailable.");
  }
  const Zotero_Tabs = tabs as ZoteroTabs & {
    add: NonNullable<ZoteroTabs["add"]>;
    select: NonNullable<ZoteroTabs["select"]>;
  };
  if (workspaceTab) {
    workspaceTab.selectedView = args.initialView || workspaceTab.selectedView;
    Zotero_Tabs.select(WORKSPACE_TAB_ID);
    postSnapshot(workspaceTab, "workspace:snapshot");
    await mountDashboardRuntimeIfReady(workspaceTab);
    await mountSynthesisRuntimeIfReady(workspaceTab);
    return;
  }
  const result = Zotero_Tabs.add({
    id: WORKSPACE_TAB_ID,
    type: "zotero-skills-workspace",
    title: "Zotero Skills",
    data: { kind: "zotero-skills-workspace" },
    select: true,
    onClose: cleanupWorkspaceTab,
  });
  const container = result?.container;
  if (!container) {
    throw new Error("Cannot open Zotero Skills Workspace: tab container is missing.");
  }
  const frame = createWorkspaceBrowser(hostWindow.document);
  container.appendChild(frame);
  const runtime: WorkspaceRuntime = {
    tabId: WORKSPACE_TAB_ID,
    window: hostWindow,
    frame,
    frameWindow: resolveFrameWindow(frame),
    selectedView: args.initialView || "dashboard",
    handshakeAttemptCount: 0,
    handshakeSuccessCount: 0,
    handshakeComplete: false,
  };
  workspaceTab = runtime;
  attachBridge(runtime);
  setFrameSource(frame, resolveWorkspacePageUrl());
  scheduleWorkspaceHandshake(runtime);
  Zotero_Tabs.select(WORKSPACE_TAB_ID);
}

export function resetZoteroSkillsWorkspaceTabRuntimeForTests() {
  cleanupWorkspaceTab();
}

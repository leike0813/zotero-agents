import { config } from "../../package.json";
import { getStringOrFallback } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { copyText } from "../utils/ztoolkit";
import { openFolderInSystemFileManager } from "../utils/fileSystem";
import {
  SKILLRUNNER_ICON_URI,
  applyToolbarButtonStyling,
  syncToolbarButtonIconFill,
} from "./dashboardToolbarButton";
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
  applySidebarPaneContainerStyles,
  createSidebarContainer,
  createSidebarFrame,
  resolveSidebarFrameWindow,
  setSidebarContainerVisible,
} from "./sidebarBrowserHost";
import { openBackendManagerDialog } from "./backendManager";

type SidebarTarget = "library" | "reader";
type SidebarButtonElement = XULElement | Element;
type SidebarActionBridge = {
  sendAction: (action: string, payload?: Record<string, unknown>) => void;
};
type MountedSidebarPane = {
  button: SidebarButtonElement | null;
  container: XULElement | null;
  frame: Element | null;
  frameWindow: Window | null;
  frameLoadHandler?: () => void;
};
type SidebarHostRuntime = {
  win: _ZoteroTypes.MainWindow;
  activeTarget: SidebarTarget | null;
  library: MountedSidebarPane;
  reader: MountedSidebarPane;
  removeMessageListener?: () => void;
  removeSnapshotSubscription?: () => void;
};
type ActionEnvelope = {
  type?: string;
  action?: string;
  payload?: Record<string, unknown>;
};

const hosts = new WeakMap<_ZoteroTypes.MainWindow, SidebarHostRuntime>();
const FRAME_WINDOW_WAIT_TIMEOUT_MS = 2000;
const SIDEBAR_ACTION_BRIDGE_KEY = "__zsAcpSkillRunSidebarBridge";
const localize = getStringOrFallback;

function resolveSidebarPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/dashboard/acp-skill-run.html`;
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

function resolvePreferredTarget(win: _ZoteroTypes.MainWindow): SidebarTarget {
  return String((win as any).Zotero_Tabs?.selectedType || "").trim() === "reader"
    ? "reader"
    : "library";
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

function buildSidebarButton(
  doc: Document,
  win: _ZoteroTypes.MainWindow,
  id: string,
  label: string,
) {
  const button = doc.createXULElement("toolbarbutton") as SidebarButtonElement;
  button.id = id;
  button.setAttribute("class", "zotero-tb-button zs-skillrunner-sidebar-button");
  button.setAttribute("tooltiptext", label);
  button.setAttribute("aria-label", label);
  button.setAttribute("image", SKILLRUNNER_ICON_URI);
  syncSidebarButtonVisuals(button, win);
  return button;
}

function syncSidebarButtonVisuals(
  button: SidebarButtonElement | null,
  win: _ZoteroTypes.MainWindow,
) {
  if (!button) {
    return;
  }
  const element = button as Element & {
    style?: CSSStyleDeclaration;
    querySelector?: (selector: string) => Element | null;
    getBoundingClientRect?: () => { width: number; height: number };
  };
  applyToolbarButtonStyling(element, SKILLRUNNER_ICON_URI, 26);
  syncToolbarButtonIconFill(element, win, { minIconPx: 16, insetPx: 1 });
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

function deactivateTarget(host: SidebarHostRuntime, target: SidebarTarget) {
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
    host.activeTarget = null;
  }
}

function closeActiveSidebarHost(host: SidebarHostRuntime) {
  const activeTarget = host.activeTarget;
  if (!activeTarget) {
    return false;
  }
  deactivateTarget(host, activeTarget);
  return true;
}

function postSnapshotToPane(
  pane: MountedSidebarPane,
  messageType: "acp-skill-run:init" | "acp-skill-run:snapshot" =
    "acp-skill-run:snapshot",
) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return;
  }
  pane.frameWindow = frameWindow;
  frameWindow.postMessage(
    {
      type: messageType,
      payload: buildAcpSkillRunPanelSnapshot(),
    },
    "*",
  );
}

function postSnapshot(host: SidebarHostRuntime) {
  if (host.activeTarget === "reader") {
    postSnapshotToPane(host.reader);
    return;
  }
  if (host.activeTarget === "library") {
    postSnapshotToPane(host.library);
  }
}

function writeSidebarBridgeTarget(
  target: Record<string, unknown> | null | undefined,
  bridge?: SidebarActionBridge,
) {
  if (!target) {
    return;
  }
  if (bridge) {
    target[SIDEBAR_ACTION_BRIDGE_KEY] = bridge;
    return;
  }
  delete target[SIDEBAR_ACTION_BRIDGE_KEY];
}

function clearSidebarPaneBridge(pane: MountedSidebarPane) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return;
  }
  const directTarget = frameWindow as Window & Record<string, unknown>;
  const wrappedTarget =
    typeof (directTarget as { wrappedJSObject?: unknown }).wrappedJSObject === "object"
      ? ((directTarget as { wrappedJSObject?: Record<string, unknown> })
          .wrappedJSObject as Record<string, unknown>)
      : null;
  writeSidebarBridgeTarget(directTarget, undefined);
  writeSidebarBridgeTarget(wrappedTarget, undefined);
}

function installSidebarPaneBridge(host: SidebarHostRuntime, pane: MountedSidebarPane) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return false;
  }
  pane.frameWindow = frameWindow;
  const bridge: SidebarActionBridge = {
    sendAction: (action, payload) => {
      void handleSidebarAction(host, {
        type: "acp-skill-run:action",
        action,
        payload:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload
            : {},
      });
    },
  };
  const directTarget = frameWindow as Window & Record<string, unknown>;
  const wrappedTarget =
    typeof (directTarget as { wrappedJSObject?: unknown }).wrappedJSObject === "object"
      ? ((directTarget as { wrappedJSObject?: Record<string, unknown> })
          .wrappedJSObject as Record<string, unknown>)
      : null;
  writeSidebarBridgeTarget(directTarget, bridge);
  writeSidebarBridgeTarget(wrappedTarget, bridge);
  return true;
}

function installMessageBridge(host: SidebarHostRuntime) {
  if (host.removeMessageListener) {
    return;
  }
  const onMessage = (event: MessageEvent) => {
    const data = event.data as ActionEnvelope;
    if (!data || data.type !== "acp-skill-run:action") {
      return;
    }
    void handleSidebarAction(host, data);
  };
  host.win.addEventListener("message", onMessage);
  host.removeMessageListener = () => {
    host.win.removeEventListener("message", onMessage);
  };
}

async function handleSidebarAction(
  host: SidebarHostRuntime,
  envelope: ActionEnvelope,
) {
  const action = String(envelope.action || "").trim();
  const payload = envelope.payload || {};
  if (!action) {
    return;
  }
  try {
    if (action === "ready") {
      if (host.activeTarget === "reader") {
        postSnapshotToPane(host.reader, "acp-skill-run:init");
      } else {
        postSnapshotToPane(host.library, "acp-skill-run:init");
      }
      return;
    }
    if (action === "select-run") {
      selectAcpSkillRun(String(payload.requestId || "").trim());
      if (host.activeTarget === "reader") {
        postSnapshotToPane(host.reader, "acp-skill-run:snapshot");
      } else {
        postSnapshotToPane(host.library, "acp-skill-run:snapshot");
      }
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
      const snapshot = buildAcpSkillRunPanelSnapshot({
        selectedRequestId: requestId,
      });
      copyText(JSON.stringify(snapshot, null, 2));
      return;
    }
    if (action === "open-workspace") {
      openFolderInSystemFileManager(String(payload.workspaceDir || "").trim());
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
  } catch (error) {
    host.win.alert?.(String(error));
  } finally {
    postSnapshot(host);
  }
}

function mountLibraryPane(host: SidebarHostRuntime) {
  const roots = getLibraryRoots(host.win);
  if (!roots.itemPane || !roots.sidenav || host.library.container) {
    return;
  }
  const doc = host.win.document;
  const button = buildSidebarButton(
    doc,
    host.win,
    `${config.addonRef}-library-acp-skill-run-mode`,
    localize("task-dashboard-home-acp-skill-runs-title" as any, "ACP Skill Runs"),
  );
  button.addEventListener("command", () => {
    void openAcpSkillRunnerSidebar({
      window: host.win,
    });
  });
  roots.sidenav.appendChild(button);
  const container = createSidebarContainer(doc);
  applySidebarPaneContainerStyles(container);
  const frame = createSidebarFrame(doc, resolveSidebarPageUrl());
  container.appendChild(frame);
  roots.itemPane.insertBefore(container, roots.sidenav);
  const frameLoadHandler = () => {
    host.library.frameWindow = resolveSidebarFrameWindow(frame);
    installSidebarPaneBridge(host, host.library);
    if (host.activeTarget === "library") {
      postSnapshotToPane(host.library, "acp-skill-run:init");
    }
  };
  frame.addEventListener("load", frameLoadHandler);
  roots.sidenav.addEventListener(
    "click",
    (event: Event) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }
      if (target === button || target.closest(`#${button.id}`)) {
        return;
      }
      if (host.activeTarget === "library") {
        deactivateTarget(host, "library");
      }
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

function mountReaderPane(host: SidebarHostRuntime) {
  const roots = getReaderRoots(host.win);
  if (!roots.contextPane || !roots.contextInner || !roots.sidenav || host.reader.container) {
    return;
  }
  const doc = host.win.document;
  const button = buildSidebarButton(
    doc,
    host.win,
    `${config.addonRef}-reader-acp-skill-run-mode`,
    localize("task-dashboard-home-acp-skill-runs-title" as any, "ACP Skill Runs"),
  );
  button.addEventListener("command", () => {
    void openAcpSkillRunnerSidebar({
      window: host.win,
    });
  });
  roots.sidenav.appendChild(button);
  const container = createSidebarContainer(doc);
  applySidebarPaneContainerStyles(container);
  const frame = createSidebarFrame(doc, resolveSidebarPageUrl());
  container.appendChild(frame);
  roots.contextInner.parentElement?.insertBefore(container, roots.contextInner);
  const frameLoadHandler = () => {
    host.reader.frameWindow = resolveSidebarFrameWindow(frame);
    installSidebarPaneBridge(host, host.reader);
    if (host.activeTarget === "reader") {
      postSnapshotToPane(host.reader, "acp-skill-run:init");
    }
  };
  frame.addEventListener("load", frameLoadHandler);
  roots.sidenav.addEventListener(
    "click",
    (event: Event) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }
      if (target === button || target.closest(`#${button.id}`)) {
        return;
      }
      if (host.activeTarget === "reader") {
        deactivateTarget(host, "reader");
      }
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

async function activateTarget(host: SidebarHostRuntime, target: SidebarTarget) {
  const libraryRoots = getLibraryRoots(host.win);
  const readerRoots = getReaderRoots(host.win);
  installMessageBridge(host);
  if (target === "library") {
    if (!ensureLibraryPaneExpanded(host.win)) {
      return false;
    }
    const frameWindow = await waitForPaneFrameWindow(host.library);
    if (!frameWindow) {
      return false;
    }
    host.library.frameWindow = frameWindow;
    installSidebarPaneBridge(host, host.library);
    deactivateTarget(host, "reader");
    (libraryRoots.defaultDeck as Element | null)?.setAttribute("hidden", "true");
    setSidebarContainerVisible(host.library.container, true);
    setButtonSelected(host.library.button, true);
    host.activeTarget = "library";
    postSnapshotToPane(host.library, "acp-skill-run:init");
    return true;
  }
  if (!ensureReaderPaneExpanded(host.win)) {
    return false;
  }
  const frameWindow = await waitForPaneFrameWindow(host.reader);
  if (!frameWindow) {
    return false;
  }
  host.reader.frameWindow = frameWindow;
  installSidebarPaneBridge(host, host.reader);
  deactivateTarget(host, "library");
  (readerRoots.contextInner as Element | null)?.setAttribute("hidden", "true");
  setSidebarContainerVisible(host.reader.container, true);
  setButtonSelected(host.reader.button, true);
  host.activeTarget = "reader";
  postSnapshotToPane(host.reader, "acp-skill-run:init");
  return true;
}

export function installAcpSkillRunnerSidebarShell(win: _ZoteroTypes.MainWindow) {
  const existing = hosts.get(win);
  if (existing) {
    return existing;
  }
  const host: SidebarHostRuntime = {
    win,
    activeTarget: null,
    library: {
      button: null,
      container: null,
      frame: null,
      frameWindow: null,
    },
    reader: {
      button: null,
      container: null,
      frame: null,
      frameWindow: null,
    },
  };
  mountLibraryPane(host);
  mountReaderPane(host);
  host.removeSnapshotSubscription = subscribeAcpSkillRunSnapshots(() => {
    postSnapshot(host);
  });
  hosts.set(win, host);
  return host;
}

export function removeAcpSkillRunnerSidebarShell(win: _ZoteroTypes.MainWindow | Window) {
  const typedWin = win as _ZoteroTypes.MainWindow;
  const host = hosts.get(typedWin);
  if (!host) {
    return;
  }
  host.removeMessageListener?.();
  host.removeSnapshotSubscription?.();
  if (host.library.frame && host.library.frameLoadHandler) {
    host.library.frame.removeEventListener("load", host.library.frameLoadHandler);
  }
  if (host.reader.frame && host.reader.frameLoadHandler) {
    host.reader.frame.removeEventListener("load", host.reader.frameLoadHandler);
  }
  clearSidebarPaneBridge(host.library);
  clearSidebarPaneBridge(host.reader);
  host.library.button?.remove();
  host.library.container?.remove();
  host.reader.button?.remove();
  host.reader.container?.remove();
  hosts.delete(typedWin);
}

export async function openAcpSkillRunnerSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
  requestId?: string;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) {
    return false;
  }
  if (args?.requestId) {
    selectAcpSkillRun(args.requestId);
  }
  const host = installAcpSkillRunnerSidebarShell(win);
  const target = resolvePreferredTarget(win);
  const activated = await activateTarget(host, target);
  return activated;
}

export function closeAcpSkillRunnerSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) {
    return false;
  }
  const host = hosts.get(win);
  if (!host) {
    return false;
  }
  return closeActiveSidebarHost(host);
}

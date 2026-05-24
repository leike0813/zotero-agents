import { config } from "../../package.json";
import { ACP_OPENCODE_DISPLAY_NAME } from "../config/defaults";
import { getStringOrFallback } from "../utils/locale";
import { copyText } from "../utils/ztoolkit";
import { openFolderInSystemFileManager } from "../utils/fileSystem";
import { resolveAddonRef } from "../utils/runtimeBridge";
import {
  SKILLRUNNER_ICON_URI,
  applyToolbarButtonStyling,
  syncToolbarButtonIconFill,
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
  getAcpFrontendSnapshot,
  getAcpConversationSnapshot,
  refreshAcpConversationBackends,
  reconnectAcpConversation,
  renameAcpConversation,
  resolveAcpConversationPermission,
  sendAcpConversationPrompt,
  setActiveAcpBackend,
  setActiveAcpConversation,
  setAcpConversationChatDisplayMode,
  setAcpConversationModel,
  setAcpConversationMode,
  setAcpConversationReasoningEffort,
  toggleAcpConversationStatusDetails,
  startNewAcpConversation,
  subscribeAcpFrontendSnapshots,
  toggleAcpConversationDiagnostics,
} from "./acpSessionManager";
import { openBackendManagerDialog } from "./backendManager";
import type { AcpSidebarTarget } from "./acpTypes";
import {
  applySidebarPaneContainerStyles,
  createSidebarContainer,
  createSidebarFrame,
  resolveSidebarFrameWindow,
  setSidebarContainerVisible,
} from "./sidebarBrowserHost";

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
  activeTarget: AcpSidebarTarget | null;
  library: MountedSidebarPane;
  reader: MountedSidebarPane;
  removeMessageListener?: () => void;
  removeSnapshotSubscription?: () => void;
  postSnapshotTimer?: ReturnType<typeof setTimeout> | null;
};

type AcpActionEnvelope = {
  type?: string;
  action?: string;
  payload?: Record<string, unknown>;
};

const FRAME_WINDOW_WAIT_TIMEOUT_MS = 2000;
const SIDEBAR_ACTION_BRIDGE_KEY = "__zsAcpSidebarBridge";
const localize = getStringOrFallback;
const hosts = new WeakMap<_ZoteroTypes.MainWindow, SidebarHostRuntime>();

function resolveSidebarPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/dashboard/acp-chat.html`;
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

function getLibraryRoots(win: _ZoteroTypes.MainWindow) {
  const itemPane = win.document.getElementById("zotero-item-pane");
  const defaultDeck = itemPane?.querySelector("#zotero-item-pane-content");
  const sidenav = itemPane?.querySelector("#zotero-view-item-sidenav") as
    | XULElement
    | null;
  return {
    itemPane,
    defaultDeck,
    sidenav,
  };
}

function getReaderRoots(win: _ZoteroTypes.MainWindow) {
  const contextPane = win.document.getElementById("zotero-context-pane");
  const contextInner = win.document.getElementById("zotero-context-pane-inner");
  const sidenav = win.document.getElementById(
    "zotero-context-pane-sidenav",
  ) as XULElement | null;
  return {
    contextPane,
    contextInner,
    sidenav,
  };
}

function deactivateTarget(host: SidebarHostRuntime, target: AcpSidebarTarget) {
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

function resolveTargetFromSource(
  host: SidebarHostRuntime,
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

function postSnapshotToPane(
  pane: MountedSidebarPane,
  target: AcpSidebarTarget,
  messageType: "acp:init" | "acp:snapshot" = "acp:snapshot",
) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return;
  }
  pane.frameWindow = frameWindow;
  const payload = buildAcpSidebarViewSnapshot({
    target,
    snapshot: getAcpConversationSnapshot(),
    frontendSnapshot: getAcpFrontendSnapshot(),
  });
  if (messageType === "acp:init") {
    frameWindow.postMessage(
      {
        type: "acp:init",
        payload,
      },
      "*",
    );
    return;
  }
  frameWindow.postMessage(
    {
      type: "acp:snapshot",
      payload,
    },
    "*",
  );
}

async function postFreshSnapshotToPane(
  pane: MountedSidebarPane,
  target: AcpSidebarTarget,
  messageType: "acp:init" | "acp:snapshot" = "acp:snapshot",
) {
  await refreshAcpConversationBackends();
  postSnapshotToPane(pane, target, messageType);
}

function postSnapshot(host: SidebarHostRuntime) {
  if (host.postSnapshotTimer) {
    clearTimeout(host.postSnapshotTimer);
  }
  host.postSnapshotTimer = null;
  if (host.activeTarget === "reader") {
    postSnapshotToPane(host.reader, "reader");
    return;
  }
  if (host.activeTarget === "library") {
    postSnapshotToPane(host.library, "library");
  }
}

function schedulePostSnapshot(host: SidebarHostRuntime) {
  if (host.postSnapshotTimer) {
    return;
  }
  host.postSnapshotTimer = setTimeout(() => {
    host.postSnapshotTimer = null;
    postSnapshot(host);
  }, 16);
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

function installSidebarPaneBridge(
  host: SidebarHostRuntime,
  pane: MountedSidebarPane,
  target: AcpSidebarTarget,
) {
  const frameWindow = pane.frameWindow || resolveSidebarFrameWindow(pane.frame);
  if (!frameWindow) {
    return false;
  }
  pane.frameWindow = frameWindow;
  const bridge: SidebarActionBridge = {
    sendAction: (action, payload) => {
      void handleSidebarAction(host, target, {
        type: "acp:action",
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
    const data = event.data as AcpActionEnvelope;
    if (!data || data.type !== "acp:action") {
      return;
    }
    const target = resolveTargetFromSource(host, event.source as Window | null);
    if (!target) {
      return;
    }
    void handleSidebarAction(host, target, data);
  };
  host.win.addEventListener("message", onMessage);
  host.removeMessageListener = () => {
    host.win.removeEventListener("message", onMessage);
  };
}

async function handleSidebarAction(
  host: SidebarHostRuntime,
  target: AcpSidebarTarget,
  envelope: AcpActionEnvelope,
) {
  const action = String(envelope.action || "").trim();
  if (!action) {
    return;
  }
  try {
    if (action === "ready") {
      await postFreshSnapshotToPane(
        target === "reader" ? host.reader : host.library,
        target,
        "acp:init",
      );
      return;
    }
    if (action === "set-active-backend") {
      const backendId = String(envelope.payload?.backendId || "").trim();
      if (!backendId) {
        return;
      }
      await setActiveAcpBackend({ backendId });
      return;
    }
    if (action === "set-active-conversation") {
      const conversationId = String(envelope.payload?.conversationId || "").trim();
      const backendId = String(envelope.payload?.backendId || "").trim();
      if (!conversationId) {
        return;
      }
      if (backendId) {
        await setActiveAcpBackend({ backendId });
      }
      await setActiveAcpConversation({ conversationId, backendId });
      return;
    }
    if (action === "open-backend-manager") {
      await openBackendManagerDialog({ window: host.win });
      postSnapshot(host);
      return;
    }
    if (action === "close-sidebar") {
      closeActiveSidebarHost(host);
      return;
    }
    if (action === "new-conversation") {
      const backendId = String(envelope.payload?.backendId || "").trim();
      await startNewAcpConversation({ backendId });
      return;
    }
    if (action === "rename-conversation") {
      const title = String(envelope.payload?.title || "").trim();
      const conversationId = String(
        envelope.payload?.conversationId || "",
      ).trim();
      const backendId = String(envelope.payload?.backendId || "").trim();
      if (!title) {
        return;
      }
      await renameAcpConversation({ title, conversationId, backendId });
      return;
    }
    if (action === "archive-conversation") {
      const conversationId = String(
        envelope.payload?.conversationId || "",
      ).trim();
      const backendId = String(envelope.payload?.backendId || "").trim();
      if (!conversationId) {
        return;
      }
      await archiveAcpConversation({ conversationId, backendId });
      return;
    }
    if (action === "reconnect") {
      await reconnectAcpConversation();
      return;
    }
    if (action === "connect") {
      await connectAcpConversation({
        backendId: String(envelope.payload?.backendId || "").trim(),
      });
      return;
    }
    if (action === "disconnect") {
      await disconnectAcpConversation({
        backendId: String(envelope.payload?.backendId || "").trim(),
      });
      return;
    }
    if (action === "cancel") {
      await cancelAcpConversationPrompt();
      return;
    }
    if (action === "authenticate") {
      const methodId = String(envelope.payload?.methodId || "").trim();
      await authenticateAcpConversation({
        backendId: String(envelope.payload?.backendId || "").trim(),
        methodId,
      });
      return;
    }
    if (action === "resolve-permission") {
      const outcome =
        String(envelope.payload?.outcome || "").trim() === "selected"
          ? "selected"
          : "cancelled";
      const optionId = String(envelope.payload?.optionId || "").trim();
      await resolveAcpConversationPermission({
        outcome,
        optionId,
      });
      return;
    }
    if (action === "set-mode") {
      const modeId = String(envelope.payload?.modeId || "").trim();
      if (!modeId) {
        return;
      }
      await setAcpConversationMode({
        modeId,
      });
      return;
    }
    if (action === "set-model") {
      const modelId = String(envelope.payload?.modelId || "").trim();
      if (!modelId) {
        return;
      }
      await setAcpConversationModel({
        modelId,
      });
      return;
    }
    if (action === "set-reasoning-effort") {
      const effortId = String(envelope.payload?.effortId || "").trim();
      if (!effortId) {
        return;
      }
      await setAcpConversationReasoningEffort({
        effortId,
      });
      return;
    }
    if (action === "toggle-diagnostics") {
      const visible =
        typeof envelope.payload?.visible === "boolean"
          ? Boolean(envelope.payload?.visible)
          : undefined;
      toggleAcpConversationDiagnostics({
        visible,
      });
      return;
    }
    if (action === "toggle-status-details") {
      const expanded =
        typeof envelope.payload?.expanded === "boolean"
          ? Boolean(envelope.payload?.expanded)
          : undefined;
      toggleAcpConversationStatusDetails({
        expanded,
      });
      return;
    }
    if (action === "set-chat-display-mode") {
      const mode =
        String(envelope.payload?.mode || "").trim() === "bubble"
          ? "bubble"
          : "plain";
      setAcpConversationChatDisplayMode({
        mode,
      });
      return;
    }
    if (action === "copy-diagnostics") {
      const bundle = buildAcpDiagnosticsBundle();
      copyText(JSON.stringify(bundle, null, 2));
      toggleAcpConversationDiagnostics({
        visible: true,
      });
      return;
    }
    if (action === "open-workspace") {
      openFolderInSystemFileManager(
        String(envelope.payload?.workspaceDir || "").trim(),
      );
      return;
    }
    if (action === "send-prompt") {
      const message = String(envelope.payload?.message || "").trim();
      if (!message) {
        return;
      }
      await sendAcpConversationPrompt({
        message,
        hostContext: buildAcpHostContext({
          window: host.win,
          target,
        }),
      });
      return;
    }
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
    `${config.addonRef}-library-acp-mode`,
    localize("task-dashboard-home-acp-title" as any, ACP_OPENCODE_DISPLAY_NAME),
  );
  button.addEventListener("command", () => {
    void openAcpSidebar({
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
    installSidebarPaneBridge(host, host.library, "library");
    if (host.activeTarget === "library") {
      void postFreshSnapshotToPane(host.library, "library", "acp:init");
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
    `${config.addonRef}-reader-acp-mode`,
    localize("task-dashboard-home-acp-title" as any, ACP_OPENCODE_DISPLAY_NAME),
  );
  button.addEventListener("command", () => {
    void openAcpSidebar({
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
    installSidebarPaneBridge(host, host.reader, "reader");
    if (host.activeTarget === "reader") {
      void postFreshSnapshotToPane(host.reader, "reader", "acp:init");
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

async function activateTarget(host: SidebarHostRuntime, target: AcpSidebarTarget) {
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
    installSidebarPaneBridge(host, host.library, "library");
    deactivateTarget(host, "reader");
    (libraryRoots.defaultDeck as Element | null)?.setAttribute("hidden", "true");
    setSidebarContainerVisible(host.library.container, true);
    setButtonSelected(host.library.button, true);
    host.activeTarget = "library";
    await postFreshSnapshotToPane(host.library, "library", "acp:init");
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
  installSidebarPaneBridge(host, host.reader, "reader");
  deactivateTarget(host, "library");
  (readerRoots.contextInner as Element | null)?.setAttribute("hidden", "true");
  setSidebarContainerVisible(host.reader.container, true);
  setButtonSelected(host.reader.button, true);
  host.activeTarget = "reader";
  await postFreshSnapshotToPane(host.reader, "reader", "acp:init");
  return true;
}

export function installAcpSidebarShell(win: _ZoteroTypes.MainWindow) {
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
  host.removeSnapshotSubscription = subscribeAcpFrontendSnapshots(() => {
    schedulePostSnapshot(host);
  });
  hosts.set(win, host);
  return host;
}

export function removeAcpSidebarShell(win: _ZoteroTypes.MainWindow | Window) {
  const typedWin = win as _ZoteroTypes.MainWindow;
  const host = hosts.get(typedWin);
  if (!host) {
    return;
  }
  host.removeMessageListener?.();
  host.removeSnapshotSubscription?.();
  if (host.postSnapshotTimer) {
    clearTimeout(host.postSnapshotTimer);
    host.postSnapshotTimer = null;
  }
  clearSidebarPaneBridge(host.library);
  clearSidebarPaneBridge(host.reader);
  if (host.library.frame && host.library.frameLoadHandler) {
    host.library.frame.removeEventListener("load", host.library.frameLoadHandler);
  }
  if (host.reader.frame && host.reader.frameLoadHandler) {
    host.reader.frame.removeEventListener("load", host.reader.frameLoadHandler);
  }
  host.library.button?.remove();
  host.library.container?.remove();
  host.reader.button?.remove();
  host.reader.container?.remove();
  hosts.delete(typedWin);
}

export async function openAcpSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) {
    return false;
  }
  const host = installAcpSidebarShell(win);
  const target = resolvePreferredTarget(win);
  return activateTarget(host, target);
}

export function closeAcpSidebar(args?: {
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

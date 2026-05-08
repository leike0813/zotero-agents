import { config } from "../../package.json";
import type { BackendInstance } from "../backends/types";
import { getStringOrFallback } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import {
  SKILLRUNNER_ICON_URI,
  applyToolbarButtonStyling,
  syncToolbarButtonIconFill,
  updateSkillRunnerToolbarButtonBadge,
} from "./dashboardToolbarButton";
import {
  attachSkillRunnerSidebarHost,
  dispatchRunWorkspaceAction,
  focusSkillRunnerWorkspace,
  openSkillRunnerRunDialog,
  type RunWorkspaceSnapshot,
} from "./skillRunnerRunDialog";
import {
  buildSkillRunnerSidebarSections,
  countWaitingSkillRunnerTasks,
  isSkillRunnerTaskRelatedToContext,
  type SkillRunnerSidebarContext,
} from "./skillRunnerSidebarModel";
import {
  createSidebarContainer,
  createSidebarFrame,
  resolveSidebarFrameWindow,
  setSidebarContainerVisible,
} from "./sidebarBrowserHost";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";
import { listActiveWorkflowTasks, subscribeWorkflowTasks } from "./taskRuntime";
import { normalizeStatus } from "./skillRunnerProviderStateMachine";
import { openBackendManagerDialog } from "./backendManager";

type SidebarTarget = "library" | "reader";
type SidebarButtonElement = XULElement | Element;
type LibraryNativeMode = "message" | "item" | "note" | "duplicates";
type ReaderNativeMode = "item" | "notes";
type WaitingSidebarTask = {
  toastKey: string;
  workflowLabel: string;
  requestId?: string;
  status: "waiting_user" | "waiting_auth";
};
type SidebarActionBridge = {
  sendAction: (action: string, payload?: Record<string, unknown>) => void;
};

type MountedSidebarPane = {
  button: SidebarButtonElement | null;
  container: XULElement | null;
  frame: Element | null;
  frameWindow: Window | null;
  bridgeReady: boolean;
  frameLoadHandler?: () => void;
};

type SidebarHostRuntime = {
  win: _ZoteroTypes.MainWindow;
  activeTarget: SidebarTarget | null;
  drawerOpen: boolean;
  drawerCompletedCollapsed: boolean;
  library: MountedSidebarPane;
  reader: MountedSidebarPane;
  removeTaskSubscription?: () => void;
  removeLibrarySelectionListener?: () => void;
  readerTabObserverId?: string | number | symbol;
  lastWaitingToastKeys: Set<string>;
  libraryLastNativeMode: LibraryNativeMode;
  readerLastNativeMode: ReaderNativeMode;
};

const hosts = new WeakMap<_ZoteroTypes.MainWindow, SidebarHostRuntime>();
const FRAME_WINDOW_WAIT_TIMEOUT_MS = 2000;
const SIDEBAR_ACTION_BRIDGE_KEY = "__zsSkillRunnerSidebarBridge";
const localize = getStringOrFallback;

function resolveSidebarPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/dashboard/run-dialog.html`;
}

function createFrame(doc: Document, pageUrl: string) {
  return createSidebarFrame(doc, pageUrl);
}

function resolveFrameWindow(frame: Element | null) {
  return resolveSidebarFrameWindow(frame);
}

function ensureContainer(doc: Document) {
  return createSidebarContainer(doc);
}

function applyPaneContainerStyles(container: XULElement) {
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "display",
    "none",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "flex",
    "1",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "height",
    "100%",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "min-width",
    "0",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "min-height",
    "0",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "overflow",
    "hidden",
  );
  (container as Element & { style?: CSSStyleDeclaration }).style?.setProperty(
    "flex-direction",
    "column",
  );
}

function setContainerVisible(container: XULElement | null, visible: boolean) {
  setSidebarContainerVisible(container, visible);
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
  if (typeof (win as { setTimeout?: unknown }).setTimeout === "function") {
    (win as { setTimeout: (handler: () => void, timeout?: number) => number }).setTimeout(
      () => syncToolbarButtonIconFill(element, win, { minIconPx: 16, insetPx: 1 }),
      80,
    );
  }
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

function listWaitingSidebarTasks(): WaitingSidebarTask[] {
  return listActiveWorkflowTasks().reduce<WaitingSidebarTask[]>((tasks, task) => {
      if (String(task.backendType || "").trim() !== "skillrunner") {
        return tasks;
      }
      const normalized = normalizeStatus(task.state, "running");
      if (normalized !== "waiting_user" && normalized !== "waiting_auth") {
        return tasks;
      }
      tasks.push({
        toastKey: `${task.id}:${normalized}`,
        workflowLabel: String(task.workflowLabel || task.taskName || "SkillRunner").trim(),
        requestId: String(task.requestId || "").trim() || undefined,
        status: normalized,
      });
      return tasks;
    }, []);
}

function formatWaitingTaskToastText(task: WaitingSidebarTask) {
  const baseText =
    task.status === "waiting_auth"
      ? localize(
          "task-dashboard-run-sidebar-toast-waiting-auth",
          "SkillRunner run needs authentication",
        )
      : localize(
          "task-dashboard-run-sidebar-toast-waiting-user",
          "SkillRunner run needs your input",
        );
  const details = [task.workflowLabel, task.requestId].filter(Boolean).join(" · ");
  return details ? `${baseText}: ${details}` : baseText;
}

function maybeShowWaitingTaskToasts(
  host: SidebarHostRuntime,
  waitingTasks: WaitingSidebarTask[],
) {
  const nextKeys = new Set(waitingTasks.map((task) => task.toastKey));
  if (!host.activeTarget) {
    for (const task of waitingTasks) {
      if (host.lastWaitingToastKeys.has(task.toastKey)) {
        continue;
      }
      showWorkflowToast({
        text: formatWaitingTaskToastText(task),
        type: "default",
      });
    }
  }
  host.lastWaitingToastKeys = nextKeys;
}

function getInitialWaitingToastKeys() {
  return new Set(listWaitingSidebarTasks().map((task) => task.toastKey));
}

function updateSidebarBadges(host: SidebarHostRuntime) {
  const waitingTasks = listWaitingSidebarTasks();
  const waitingCount = waitingTasks.length;
  maybeShowWaitingTaskToasts(host, waitingTasks);
  setButtonBadge(host.library.button, waitingCount);
  setButtonBadge(host.reader.button, waitingCount);
  updateSkillRunnerToolbarButtonBadge(host.win, waitingCount);
}

function waitForTimeout(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function resolveLibraryNativeMode(
  win: _ZoteroTypes.MainWindow,
): LibraryNativeMode {
  const mode = String((win as any).ZoteroPane?.itemPane?.mode || "").trim();
  if (
    mode === "message" ||
    mode === "item" ||
    mode === "note" ||
    mode === "duplicates"
  ) {
    return mode;
  }
  return "item";
}

function resolveReaderNativeMode(
  win: _ZoteroTypes.MainWindow,
): ReaderNativeMode {
  return String((win as any).ZoteroContextPane?.context?.mode || "").trim() ===
    "notes"
    ? "notes"
    : "item";
}

function captureNativeMode(host: SidebarHostRuntime, target: SidebarTarget) {
  if (target === "library") {
    host.libraryLastNativeMode = resolveLibraryNativeMode(host.win);
    return;
  }
  host.readerLastNativeMode = resolveReaderNativeMode(host.win);
}

function restoreLibraryNativeMode(host: SidebarHostRuntime) {
  const mode = host.libraryLastNativeMode || "item";
  if ((host.win as any).ZoteroPane?.itemPane) {
    (host.win as any).ZoteroPane.itemPane.mode = mode;
  }
}

function restoreReaderNativeMode(
  host: SidebarHostRuntime,
  mode: ReaderNativeMode,
) {
  host.readerLastNativeMode = mode;
  const contextHost =
    (host.win as any).ZoteroContextPane?.context ||
    (host.win as any).ZoteroContextPane;
  if (contextHost && "mode" in contextHost) {
    (contextHost as { mode?: string }).mode = mode;
    return;
  }
  const readerRoots = getReaderRoots(host.win);
  if (readerRoots.contextInner && "mode" in readerRoots.contextInner) {
    (readerRoots.contextInner as unknown as { mode?: string }).mode = mode;
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
  try {
    delete target[SIDEBAR_ACTION_BRIDGE_KEY];
  } catch {
    target[SIDEBAR_ACTION_BRIDGE_KEY] = undefined;
  }
}

function clearSidebarPaneBridge(pane: MountedSidebarPane) {
  const frameWindow = pane.frameWindow || resolveFrameWindow(pane.frame);
  if (!frameWindow) {
    pane.bridgeReady = false;
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
  pane.bridgeReady = false;
}

function installSidebarPaneBridge(
  host: SidebarHostRuntime,
  pane: MountedSidebarPane,
) {
  const frameWindow = pane.frameWindow || resolveFrameWindow(pane.frame);
  if (!frameWindow) {
    pane.bridgeReady = false;
    return false;
  }
  pane.frameWindow = frameWindow;
  const bridge: SidebarActionBridge = {
    sendAction: (action, payload) => {
      const normalizedAction = String(action || "").trim();
      if (!normalizedAction) {
        return;
      }
      void dispatchRunWorkspaceAction({
        type: "skillrunner-sidebar:action",
        action: normalizedAction,
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
  pane.bridgeReady = true;
  return true;
}

async function waitForPaneFrameWindow(
  pane: MountedSidebarPane,
  timeoutMs = FRAME_WINDOW_WAIT_TIMEOUT_MS,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const frameWindow = resolveFrameWindow(pane.frame);
    if (frameWindow) {
      pane.frameWindow = frameWindow;
      return frameWindow;
    }
    await waitForTimeout(40);
  }
  return null;
}

function resolveItemTitle(item: {
  getField?: (field: string) => unknown;
} | null | undefined) {
  return String(item?.getField?.("title") || "").trim();
}

function resolveSelectionParent(
  item: {
    id?: number;
    parentID?: number;
    parentItem?: unknown;
    isAttachment?: () => boolean;
  } | null | undefined,
) {
  if (!item) {
    return null;
  }
  if (item.isAttachment?.()) {
    return item.parentItem || (item.parentID ? Zotero.Items.get(item.parentID) : null);
  }
  return item;
}

function normalizeParentItemIds(values: unknown[]) {
  const seen = new Set<number>();
  const parentItemIds: number[] = [];
  for (const value of values) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      continue;
    }
    const normalized = Math.floor(numeric);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    parentItemIds.push(normalized);
  }
  return parentItemIds;
}

function resolveLibraryContext(
  win: _ZoteroTypes.MainWindow,
): SkillRunnerSidebarContext | null {
  const items = win.ZoteroPane?.getSelectedItems?.() || [];
  if (items.length === 0) {
    return null;
  }
  const parentItems = items
    .map((item: any) => resolveSelectionParent(item))
    .filter(Boolean);
  const relatedParentItemIds = normalizeParentItemIds(
    parentItems.map((item: any) => item?.id),
  );
  if (relatedParentItemIds.length === 0) {
    return null;
  }
  const primaryParentItemId = relatedParentItemIds[0];
  const primaryParent =
    parentItems.find((item: any) => Number(item?.id || 0) === primaryParentItemId) ||
    Zotero.Items.get(primaryParentItemId);
  const itemLabel = resolveItemTitle(primaryParent);
  return {
    primaryParentItemId,
    relatedParentItemIds,
    itemLabel: itemLabel || undefined,
  };
}

function resolveReaderContext(
  win: _ZoteroTypes.MainWindow,
): SkillRunnerSidebarContext | null {
  const selectedTabId = String((win as any).Zotero_Tabs?.selectedID || "").trim();
  if (!selectedTabId) {
    return null;
  }
  const tabRecord = (win as any).Zotero_Tabs?._getTab?.(selectedTabId);
  const itemId = Number(tabRecord?.tab?.data?.itemID || 0);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return null;
  }
  const item = Zotero.Items.get(itemId);
  if (!item) {
    return null;
  }
  const parent =
    item.parentItem || (item.parentID ? Zotero.Items.get(item.parentID) : null);
  const parentId = Number(parent?.id || 0);
  if (!Number.isFinite(parentId) || parentId <= 0) {
    return null;
  }
  const itemLabel = resolveItemTitle(parent) || resolveItemTitle(item);
  return {
    primaryParentItemId: Math.floor(parentId),
    relatedParentItemIds: [Math.floor(parentId)],
    itemLabel: itemLabel || undefined,
  };
}

function resolveContextForTarget(
  host: SidebarHostRuntime,
  target: SidebarTarget,
) {
  return target === "reader"
    ? resolveReaderContext(host.win)
    : resolveLibraryContext(host.win);
}

function buildDecoratedSnapshot(args: {
  host: SidebarHostRuntime;
  target: SidebarTarget;
  snapshot: RunWorkspaceSnapshot;
}) {
  const context = resolveContextForTarget(args.host, args.target);
  const sections = buildSkillRunnerSidebarSections({
    groups: args.snapshot.workspace.groups,
    context,
    selectedTaskKey: args.snapshot.workspace.selectedTaskKey,
    completedCollapsed: args.host.drawerCompletedCollapsed,
  });
  const hasRelated = args.snapshot.workspace.groups.some((group) =>
    !group.disabled &&
    group.activeTasks.some((task) =>
      task.selectable === true &&
      String(task.requestId || "").trim().length > 0 &&
      isSkillRunnerTaskRelatedToContext({
        targetParentID: task.targetParentID,
        context,
      }),
    ),
  );
  const drawerNotice =
    context && !hasRelated
      ? localize(
          "task-dashboard-run-sidebar-context-global",
          "No related runs were found. Showing the global workspace.",
        )
      : "";
  const selectionTasks = context
    ? (() => {
        const tasks = args.snapshot.workspace.groups.flatMap((group) => {
          if (group.disabled) {
            return [];
          }
          return group.activeTasks
            .filter((task) => {
              return (
                task.selectable === true &&
                String(task.requestId || "").trim().length > 0 &&
                isSkillRunnerTaskRelatedToContext({
                  targetParentID: task.targetParentID,
                  context,
                })
              );
            })
            .map((task) => ({
              key: task.key,
              label:
                String(task.workflowLabel || "").trim() ||
                String(task.title || "").trim() ||
                String(task.requestId || "").trim() ||
                localize(
                  "task-dashboard-run-waiting-request-id",
                  "Waiting for requestId",
                ),
              selected:
                String(task.key || "").trim() ===
                String(args.snapshot.workspace.selectedTaskKey || "").trim(),
            }));
        });
        return tasks.length > 0
          ? {
              itemLabel: context.itemLabel,
              tasks,
            }
          : undefined;
      })()
    : undefined;
  return {
    ...args.snapshot,
    hostMode: "sidebar" as const,
    drawer: {
      open: args.host.drawerOpen,
      notice: drawerNotice || undefined,
      sections: sections.map((section) => ({
        id: section.id,
        title:
          section.id === "completed"
            ? localize(
                "task-dashboard-run-completed-tasks-title",
                "Completed",
              )
            : localize(
                "task-dashboard-run-running-tasks-title",
                "Running",
              ),
        collapsed: section.collapsed,
        groups: section.groups,
      })),
    },
    badges: {
      waitingCount: countWaitingSkillRunnerTasks(args.snapshot.workspace.groups),
    },
    selectionTasks: selectionTasks,
    contextHint: context && hasRelated
      ? {
          itemLabel: context.itemLabel,
          hasRelated,
          tooltip: localize(
            "task-dashboard-run-sidebar-context-related-tooltip",
            "This run matches the current selection.",
          ),
        }
      : undefined,
  } satisfies RunWorkspaceSnapshot;
}

function resolvePreferredTarget(win: _ZoteroTypes.MainWindow): SidebarTarget {
  return String((win as any).Zotero_Tabs?.selectedType || "").trim() === "reader"
    ? "reader"
    : "library";
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

function deactivateTarget(host: SidebarHostRuntime, target: SidebarTarget) {
  const libraryRoots = getLibraryRoots(host.win);
  const readerRoots = getReaderRoots(host.win);
  if (target === "library") {
    setContainerVisible(host.library.container, false);
    (libraryRoots.defaultDeck as Element | null)?.removeAttribute("hidden");
    restoreLibraryNativeMode(host);
    setButtonSelected(host.library.button, false);
  } else {
    setContainerVisible(host.reader.container, false);
    (readerRoots.contextInner as Element | null)?.removeAttribute("hidden");
    restoreReaderNativeMode(host, host.readerLastNativeMode || "item");
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
  host.drawerOpen = false;
  deactivateTarget(host, activeTarget);
  return true;
}

function createSidebarHostActionHandler(host: SidebarHostRuntime) {
  return async (envelope: {
    action?: string;
    payload?: Record<string, unknown>;
  }) => {
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
    if (action === "open-backend-manager") {
      await openBackendManagerDialog({ window: host.win });
      return true;
    }
    if (action === "close-sidebar") {
      return closeActiveSidebarHost(host);
    }
    return false;
  };
}

function refreshSidebarSelection(host: SidebarHostRuntime, target: SidebarTarget) {
  if (host.activeTarget !== target) {
    return;
  }
  void focusSkillRunnerWorkspace({
    selectionChanged: true,
  });
}

function installLibrarySelectionListener(host: SidebarHostRuntime) {
  const itemsView = (host.win as any).ZoteroPane?.itemsView;
  const onSelect = itemsView?.onSelect;
  if (
    !onSelect ||
    typeof onSelect.addListener !== "function" ||
    typeof onSelect.removeListener !== "function"
  ) {
    return;
  }
  const listener = () => {
    refreshSidebarSelection(host, "library");
  };
  onSelect.addListener(listener);
  host.removeLibrarySelectionListener = () => {
    onSelect.removeListener(listener);
  };
}

function installReaderSelectionObserver(host: SidebarHostRuntime) {
  const observerId = (Zotero as any).Notifier?.registerObserver?.(
    {
      notify: (event: string, type: string) => {
        if (String(type || "").trim() !== "tab") {
          return;
        }
        const normalizedEvent = String(event || "").trim();
        if (normalizedEvent !== "select" && normalizedEvent !== "load") {
          return;
        }
        refreshSidebarSelection(host, "reader");
      },
    },
    ["tab"],
    "zotero-skills-skillrunner-sidebar",
  );
  if (observerId) {
    host.readerTabObserverId = observerId;
  }
}

async function activateTarget(host: SidebarHostRuntime, target: SidebarTarget) {
  captureNativeMode(host, target);
  const libraryRoots = getLibraryRoots(host.win);
  const readerRoots = getReaderRoots(host.win);
  const handleHostAction = createSidebarHostActionHandler(host);
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
    setContainerVisible(host.library.container, true);
    syncSidebarButtonVisuals(host.library.button, host.win);
    setButtonSelected(host.library.button, true);
    host.activeTarget = "library";
    await attachSkillRunnerSidebarHost({
      hostWindow: host.win,
      frameWindow,
      alertWindow: host.win,
      focusHost: () => {
        host.win.focus();
      },
      isHostAlive: () => true,
      decorateSnapshot: (snapshot) =>
        buildDecoratedSnapshot({
          host,
          target: "library",
          snapshot,
        }),
      resolveSelectionContext: () => resolveContextForTarget(host, "library"),
      handleHostAction,
    });
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
  setContainerVisible(host.reader.container, true);
  syncSidebarButtonVisuals(host.reader.button, host.win);
  setButtonSelected(host.reader.button, true);
  host.activeTarget = "reader";
  await attachSkillRunnerSidebarHost({
    hostWindow: host.win,
    frameWindow,
    alertWindow: host.win,
    focusHost: () => {
      host.win.focus();
    },
    isHostAlive: () => true,
      decorateSnapshot: (snapshot) =>
        buildDecoratedSnapshot({
          host,
          target: "reader",
          snapshot,
        }),
      resolveSelectionContext: () => resolveContextForTarget(host, "reader"),
    handleHostAction,
  });
  return true;
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
    `${config.addonRef}-library-skillrunner-mode`,
    localize(
      "task-dashboard-sidebar-skillrunner",
      "Skill-Runner",
    ),
  );
  button.addEventListener("command", () => {
    void openSkillRunnerSidebar({
      window: host.win,
    });
  });
  roots.sidenav.appendChild(button);

  const container = ensureContainer(doc);
  applyPaneContainerStyles(container);
  const frame = createFrame(doc, resolveSidebarPageUrl());
  container.appendChild(frame);
  roots.itemPane.insertBefore(container, roots.sidenav);
  const frameLoadHandler = () => {
    host.library.frameWindow = resolveFrameWindow(frame);
    installSidebarPaneBridge(host, host.library);
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
    frameWindow: resolveFrameWindow(frame),
    bridgeReady: false,
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
    `${config.addonRef}-reader-skillrunner-mode`,
    localize(
      "task-dashboard-sidebar-skillrunner",
      "Skill-Runner",
    ),
  );
  button.addEventListener("command", () => {
    void openSkillRunnerSidebar({
      window: host.win,
    });
  });
  roots.sidenav.appendChild(button);

  const container = ensureContainer(doc);
  applyPaneContainerStyles(container);
  const frame = createFrame(doc, resolveSidebarPageUrl());
  container.appendChild(frame);
  roots.contextInner.parentElement?.insertBefore(container, roots.contextInner);
  const frameLoadHandler = () => {
    host.reader.frameWindow = resolveFrameWindow(frame);
    installSidebarPaneBridge(host, host.reader);
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
    frameWindow: resolveFrameWindow(frame),
    bridgeReady: false,
    frameLoadHandler,
  };
}

export function installSkillRunnerSidebarShell(win: _ZoteroTypes.MainWindow) {
  const existing = hosts.get(win);
  if (existing) {
    return existing;
  }
  const host: SidebarHostRuntime = {
    win,
    activeTarget: null,
    drawerOpen: false,
    drawerCompletedCollapsed: true,
    lastWaitingToastKeys: getInitialWaitingToastKeys(),
    libraryLastNativeMode: "item",
    readerLastNativeMode: "item",
    library: {
      button: null,
      container: null,
      frame: null,
      frameWindow: null,
      bridgeReady: false,
    },
    reader: {
      button: null,
      container: null,
      frame: null,
      frameWindow: null,
      bridgeReady: false,
    },
  };
  mountLibraryPane(host);
  mountReaderPane(host);
  installLibrarySelectionListener(host);
  installReaderSelectionObserver(host);
  host.removeTaskSubscription = subscribeWorkflowTasks(() => {
    updateSidebarBadges(host);
  });
  updateSidebarBadges(host);
  hosts.set(win, host);
  return host;
}

export function removeSkillRunnerSidebarShell(win: _ZoteroTypes.MainWindow | Window) {
  const typedWin = win as _ZoteroTypes.MainWindow;
  const host = hosts.get(typedWin);
  if (!host) {
    return;
  }
  host.removeTaskSubscription?.();
  host.removeLibrarySelectionListener?.();
  if (host.readerTabObserverId) {
    (Zotero as any).Notifier?.unregisterObserver?.(host.readerTabObserverId);
  }
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
  updateSkillRunnerToolbarButtonBadge(typedWin, 0);
  hosts.delete(typedWin);
}

export async function openSkillRunnerSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
  backend?: BackendInstance;
  requestId?: string;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) {
    await openSkillRunnerRunDialog(args);
    return;
  }
  const host = installSkillRunnerSidebarShell(win);
  const target = resolvePreferredTarget(win);
  const activated = await activateTarget(host, target);
  if (!activated) {
    if (typeof console !== "undefined") {
      console.warn("[skillrunner-sidebar] sidebar injection failed, fallback to dialog");
    }
    await openSkillRunnerRunDialog(args);
    return;
  }
  await focusSkillRunnerWorkspace({
    backend: args?.backend,
    requestId: args?.requestId,
    selectionChanged: true,
  });
}

export function closeSkillRunnerSidebar(args?: {
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

export async function toggleSkillRunnerSidebar(args?: {
  window?: _ZoteroTypes.MainWindow;
}) {
  const win =
    args?.window ||
    (Zotero.getMainWindow?.() as _ZoteroTypes.MainWindow | undefined);
  if (!win) {
    return false;
  }
  const host = installSkillRunnerSidebarShell(win);
  if (host.activeTarget) {
    closeActiveSidebarHost(host);
    return false;
  }
  await openSkillRunnerSidebar({
    window: win,
  });
  return true;
}

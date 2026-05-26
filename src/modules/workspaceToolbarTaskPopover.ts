import { getStringOrFallback } from "../utils/locale";

type ToolbarTaskRow = {
  id?: string;
  taskName?: string;
  workflowId?: string;
  workflowLabel?: string;
  backendLabel?: string;
  backendId?: string;
  backendType?: string;
  requestId?: string;
  requestKind?: string;
  state?: string;
  updatedAt?: string;
};

type XulPanelElement = XULElement & {
  openPopup?: (
    anchorElement: Element,
    position?: string,
    x?: number,
    y?: number,
    isContextMenu?: boolean,
    attributesOverride?: boolean,
  ) => void;
  hidePopup?: () => void;
  moveToAnchor?: (
    anchorElement: Element,
    position?: string,
    x?: number,
    y?: number,
    attributesOverride?: boolean,
  ) => void;
  sizeTo?: (width: number, height: number) => void;
  state?: string;
};

type PopoverRuntime = {
  win: _ZoteroTypes.MainWindow;
  anchor: Element;
  popover: XulPanelElement | null;
  openTimer: ReturnType<typeof setTimeout> | null;
  closeTimer: ReturnType<typeof setTimeout> | null;
  refreshTimer: ReturnType<typeof setInterval> | null;
  removeListeners: Array<() => void>;
};

const runtimes = new WeakMap<Element, PopoverRuntime>();
const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 250;
const MAX_VISIBLE_TASKS = 6;
const POPOVER_WIDTH = 580;
const LED_CELL_WIDTH = 18;
const TASK_NAME_WIDTH = 250;
const WORKFLOW_LABEL_WIDTH = 144;
const BACKEND_LABEL_WIDTH = 134;

const localize = getStringOrFallback;

function createXulElement(doc: Document, tag: string) {
  const factory = (
    doc as Document & {
      createXULElement?: (name: string) => XULElement;
    }
  ).createXULElement;
  if (typeof factory === "function") {
    return factory.call(doc, tag);
  }
  return doc.createElementNS(
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
    tag,
  ) as XULElement;
}

function supportsNoAutoFocusWithNoAutoHide() {
  const runtime = globalThis as {
    Zotero?: { isLinux?: boolean; isMac?: boolean; isWin?: boolean };
  };
  return runtime.Zotero?.isLinux !== true;
}

function xulElement(doc: Document, tag: string, className = "") {
  const node = createXulElement(doc, tag);
  if (className) {
    node.classList.add(...className.split(/\s+/).filter(Boolean));
  }
  return node;
}

function clampForColumn(value: string, maxChars: number) {
  const text = normalizeString(value);
  if (text.length <= maxChars) {
    return text || "-";
  }
  if (maxChars <= 1) {
    return "…";
  }
  return `${text.slice(0, maxChars - 1)}…`;
}

function forceXulBoxWidth(node: XULElement, width: number) {
  const px = `${width}px`;
  node.setAttribute("width", String(width));
  node.setAttribute("minwidth", String(width));
  node.setAttribute("maxwidth", String(width));
  node.setAttribute("flex", "0");
  node.setAttribute(
    "style",
    [
      `width: ${px} !important`,
      `min-width: ${px} !important`,
      `max-width: ${px} !important`,
      "-moz-box-flex: 0 !important",
      "overflow: hidden !important",
      "white-space: nowrap !important",
      "text-overflow: ellipsis !important",
      "margin: 0 !important",
    ].join("; "),
  );
}

function xulLabel(
  doc: Document,
  className: string,
  value: string,
  width: number,
  maxChars: number,
  inlineStyle = "",
) {
  const node = xulElement(doc, "label", className);
  node.setAttribute("value", clampForColumn(value, maxChars));
  node.setAttribute("crop", "end");
  node.setAttribute("tooltiptext", value);
  forceXulBoxWidth(node, width);
  if (inlineStyle) {
    node.setAttribute(
      "style",
      `${node.getAttribute("style") || ""}; ${inlineStyle}`,
    );
  }
  return node;
}

function isPlainRunningState(row: ToolbarTaskRow) {
  return normalizeString(row.state) === "running";
}

function xulLed(doc: Document, row: ToolbarTaskRow) {
  const cell = xulElement(doc, "box", "zs-workspace-running-popover-led-cell");
  forceXulBoxWidth(cell, LED_CELL_WIDTH);
  const led = xulElement(doc, "box", "zs-workspace-running-popover-led");
  const isPlainRunning = isPlainRunningState(row);
  led.classList.add(
    isPlainRunning
      ? "zs-workspace-running-popover-led-blue"
      : "zs-workspace-running-popover-led-amber",
  );
  led.setAttribute(
    "tooltiptext",
    isPlainRunning
      ? localize("task-manager-status-running", "Running")
      : localize("task-dashboard-status-waiting-user", "Needs attention"),
  );
  led.setAttribute(
    "style",
    [
      "width: 8px !important",
      "min-width: 8px !important",
      "max-width: 8px !important",
      "height: 8px !important",
      "min-height: 8px !important",
      "max-height: 8px !important",
      "margin: 8px 5px 0 2px !important",
      "border-radius: 999px !important",
      `background-color: ${isPlainRunning ? "#2563eb" : "#f59e0b"} !important`,
      `box-shadow: 0 0 0 2px ${isPlainRunning ? "rgba(37, 99, 235, 0.16)" : "rgba(245, 158, 11, 0.18)"} !important`,
    ].join("; "),
  );
  cell.appendChild(led);
  return cell;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isSkillRunnerTask(row: ToolbarTaskRow) {
  return normalizeString(row.backendType) === "skillrunner";
}

function isAcpSkillRunTask(row: ToolbarTaskRow) {
  const backendType = normalizeString(row.backendType);
  const requestKind = normalizeString(row.requestKind);
  const taskId = normalizeString(row.id);
  return (
    backendType === "acp" &&
    (requestKind === "acp.skill.run.v1" || taskId.startsWith("acp-skill-run:"))
  );
}

async function listVisibleRows(runtime: PopoverRuntime) {
  const result = await Promise.resolve(
    addon.hooks.onPrefsEvent("listDashboardActiveTasksForPopover", {
      window: runtime.win,
    }),
  );
  if (!Array.isArray(result)) {
    return [] as ToolbarTaskRow[];
  }
  const entries = result as unknown[];
  return entries.filter(
    (entry): entry is ToolbarTaskRow =>
      !!entry && typeof entry === "object" && !Array.isArray(entry),
  );
}

function resolveBackendLabel(row: ToolbarTaskRow) {
  return (
    normalizeString(row.backendLabel) || normalizeString(row.backendId) || "-"
  );
}

function estimatePopoverHeight(rowCount: number) {
  if (rowCount <= 0) {
    return 64;
  }
  return 34 + rowCount * 30;
}

function syncPopoverSize(popover: XulPanelElement, rowCount: number) {
  const height = estimatePopoverHeight(rowCount);
  popover.setAttribute("width", String(POPOVER_WIDTH));
  popover.setAttribute("height", String(height));
  if (typeof popover.sizeTo === "function") {
    popover.sizeTo(POPOVER_WIDTH, height);
  }
}

function openTaskFromPopover(
  win: _ZoteroTypes.MainWindow,
  row: ToolbarTaskRow,
) {
  const requestId = normalizeString(row.requestId);
  if (isAcpSkillRunTask(row)) {
    void addon.hooks.onPrefsEvent("openAcpSkillRunnerSidebar", {
      window: win,
      requestId,
    });
    return;
  }
  if (isSkillRunnerTask(row) && requestId) {
    void addon.hooks.onPrefsEvent("openSkillRunnerSidebar", {
      window: win,
      backendId: normalizeString(row.backendId),
      requestId,
    });
    return;
  }
  void addon.hooks.onPrefsEvent("openDashboard", {
    window: win,
  });
}

function clearTimers(runtime: PopoverRuntime) {
  if (runtime.openTimer) {
    clearTimeout(runtime.openTimer);
    runtime.openTimer = null;
  }
  if (runtime.closeTimer) {
    clearTimeout(runtime.closeTimer);
    runtime.closeTimer = null;
  }
}

function eventTargetIsWithin(target: EventTarget | null, root: Element | null) {
  if (!target || !root) {
    return false;
  }
  if (target === root) {
    return true;
  }
  const contains = (root as Element & { contains?: (node: Node) => boolean })
    .contains;
  if (typeof contains !== "function" || typeof target !== "object") {
    return false;
  }
  try {
    return contains.call(root, target as Node);
  } catch {
    return false;
  }
}

function isActivationInsidePopoverRuntime(
  runtime: PopoverRuntime,
  event: Event,
) {
  return (
    eventTargetIsWithin(event.target, runtime.anchor) ||
    eventTargetIsWithin(event.target, runtime.popover)
  );
}

function positionPopover(runtime: PopoverRuntime) {
  const popover = runtime.popover;
  if (!popover) {
    return;
  }
  if (typeof popover.moveToAnchor === "function") {
    popover.moveToAnchor(runtime.anchor, "after_start", 0, 6, false);
  }
}

async function renderPopover(runtime: PopoverRuntime) {
  const doc = runtime.win.document;
  const rows = (await listVisibleRows(runtime))
    .slice()
    .sort((a, b) =>
      normalizeString(b.updatedAt).localeCompare(normalizeString(a.updatedAt)),
    )
    .slice(0, MAX_VISIBLE_TASKS);
  let popover = runtime.popover;
  if (!popover) {
    popover = createXulElement(doc, "panel") as XulPanelElement;
    popover.classList.add("zs-workspace-running-popover-panel");
    popover.setAttribute("type", "arrow");
    popover.setAttribute("noautohide", "true");
    if (supportsNoAutoFocusWithNoAutoHide()) {
      popover.setAttribute("noautofocus", "true");
    }
    popover.setAttribute("consumeoutsideclicks", "false");
    popover.setAttribute("width", String(POPOVER_WIDTH));
    popover.setAttribute("orient", "vertical");
    popover.setAttribute("role", "dialog");
    popover.setAttribute(
      "aria-label",
      localize("task-dashboard-toolbar-running-popover-title", "Running Tasks"),
    );
    popover.addEventListener("mouseenter", () => {
      if (runtime.closeTimer) {
        clearTimeout(runtime.closeTimer);
        runtime.closeTimer = null;
      }
    });
    popover.addEventListener("mouseleave", () => scheduleClose(runtime));
    popover.addEventListener("popuphidden", () => {
      if (runtime.popover === popover) {
        runtime.popover = null;
      }
      if (runtime.refreshTimer) {
        clearInterval(runtime.refreshTimer);
        runtime.refreshTimer = null;
      }
      popover?.remove();
    });
    (doc.documentElement || doc).appendChild(popover);
    runtime.popover = popover;
  }
  popover.textContent = "";
  const content = xulElement(doc, "vbox", "zs-workspace-running-popover");
  content.setAttribute("width", String(POPOVER_WIDTH));
  const title = xulLabel(
    doc,
    "zs-workspace-running-popover-title",
    `${localize("task-dashboard-toolbar-running-popover-title", "Running Tasks")}:`,
    POPOVER_WIDTH - 18,
    64,
    [
      "font-family: Georgia, 'Times New Roman', serif !important",
      "font-size: 12px !important",
      "font-weight: 700 !important",
      "color: #334155 !important",
      "line-height: 16px !important",
    ].join("; "),
  );
  content.appendChild(title);
  const separator = xulElement(
    doc,
    "box",
    "zs-workspace-running-popover-separator",
  );
  separator.setAttribute(
    "style",
    [
      "height: 1px !important",
      "min-height: 1px !important",
      "max-height: 1px !important",
      "margin: 5px 2px 6px !important",
      "background-color: rgba(148, 163, 184, 0.55) !important",
      "border: 0 !important",
      "padding: 0 !important",
    ].join("; "),
  );
  content.appendChild(separator);
  if (rows.length === 0) {
    content.appendChild(
      xulLabel(
        doc,
        "zs-workspace-running-popover-empty",
        localize(
          "task-dashboard-toolbar-running-popover-empty",
          "No active tasks.",
        ),
        POPOVER_WIDTH - 18,
        64,
      ),
    );
    popover.appendChild(content);
    syncPopoverSize(popover, 0);
    return;
  }
  const list = xulElement(doc, "vbox", "zs-workspace-running-popover-list");
  rows.forEach((row) => {
    const item = xulElement(doc, "hbox", "zs-workspace-running-popover-task");
    forceXulBoxWidth(
      item,
      LED_CELL_WIDTH +
        TASK_NAME_WIDTH +
        WORKFLOW_LABEL_WIDTH +
        BACKEND_LABEL_WIDTH +
        24,
    );
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("align", "center");
    item.setAttribute("data-task-id", normalizeString(row.id));
    const requestKind = normalizeString(row.requestKind);
    if (requestKind) {
      item.setAttribute("data-request-kind", requestKind);
    }
    const taskName =
      normalizeString(row.taskName) ||
      normalizeString(row.workflowLabel) ||
      "-";
    const workflowLabel =
      normalizeString(row.workflowLabel) ||
      normalizeString(row.workflowId) ||
      "-";
    const backendLabel = resolveBackendLabel(row);
    item.setAttribute(
      "tooltiptext",
      [taskName, workflowLabel, backendLabel].filter(Boolean).join("\n"),
    );
    item.addEventListener("click", () => {
      closePopover(runtime);
      openTaskFromPopover(runtime.win, row);
    });
    item.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      closePopover(runtime);
      openTaskFromPopover(runtime.win, row);
    });
    item.appendChild(xulLed(doc, row));
    item.appendChild(
      xulLabel(
        doc,
        "zs-workspace-running-popover-task-title",
        taskName,
        TASK_NAME_WIDTH,
        36,
        "font-size: 11px !important; font-weight: 650 !important; line-height: 18px !important; color: #0f172a !important",
      ),
    );
    item.appendChild(
      xulLabel(
        doc,
        "zs-workspace-running-popover-task-subtitle",
        workflowLabel,
        WORKFLOW_LABEL_WIDTH,
        19,
        "font-size: 9px !important; line-height: 18px !important; color: #475569 !important",
      ),
    );
    item.appendChild(
      xulLabel(
        doc,
        "zs-workspace-running-popover-task-backend",
        backendLabel,
        BACKEND_LABEL_WIDTH,
        20,
        "font-size: 9px !important; line-height: 18px !important; color: #64748b !important",
      ),
    );
    list.appendChild(item);
  });
  content.appendChild(list);
  popover.appendChild(content);
  syncPopoverSize(popover, rows.length);
}

function openPopover(runtime: PopoverRuntime) {
  clearTimers(runtime);
  void renderPopover(runtime).then(() => {
    const popover = runtime.popover;
    if (!popover) {
      return;
    }
    if (typeof popover.openPopup === "function" && popover.state !== "open") {
      popover.openPopup(runtime.anchor, "after_start", 0, 6, false, false);
    }
  });
  if (!runtime.refreshTimer) {
    runtime.refreshTimer = setInterval(() => refreshIfOpen(runtime), 2000);
  }
}

function closePopover(runtime: PopoverRuntime) {
  if (runtime.popover) {
    if (typeof runtime.popover.hidePopup === "function") {
      runtime.popover.hidePopup();
    } else {
      runtime.popover.remove();
    }
    runtime.popover = null;
  }
  if (runtime.refreshTimer) {
    clearInterval(runtime.refreshTimer);
    runtime.refreshTimer = null;
  }
}

function scheduleOpen(runtime: PopoverRuntime) {
  if (runtime.closeTimer) {
    clearTimeout(runtime.closeTimer);
    runtime.closeTimer = null;
  }
  if (runtime.openTimer) {
    return;
  }
  runtime.openTimer = setTimeout(() => {
    runtime.openTimer = null;
    openPopover(runtime);
  }, OPEN_DELAY_MS);
}

function scheduleClose(runtime: PopoverRuntime) {
  if (runtime.openTimer) {
    clearTimeout(runtime.openTimer);
    runtime.openTimer = null;
  }
  if (runtime.closeTimer) {
    return;
  }
  runtime.closeTimer = setTimeout(() => {
    runtime.closeTimer = null;
    closePopover(runtime);
  }, CLOSE_DELAY_MS);
}

function dismissForPrimaryActivation(runtime: PopoverRuntime) {
  clearTimers(runtime);
  closePopover(runtime);
}

function refreshIfOpen(runtime: PopoverRuntime) {
  if (runtime.popover) {
    void renderPopover(runtime);
  }
}

export function installWorkspaceToolbarTaskPopover(args: {
  window: _ZoteroTypes.MainWindow;
  anchor: Element;
}) {
  const existing = runtimes.get(args.anchor);
  if (existing) {
    return;
  }
  const runtime: PopoverRuntime = {
    win: args.window,
    anchor: args.anchor,
    popover: null,
    openTimer: null,
    closeTimer: null,
    refreshTimer: null,
    removeListeners: [],
  };
  const addListener = (
    target: EventTarget,
    type: string,
    listener: EventListener,
  ) => {
    if (
      typeof (target as { addEventListener?: unknown }).addEventListener !==
        "function" ||
      typeof (target as { removeEventListener?: unknown })
        .removeEventListener !== "function"
    ) {
      return;
    }
    target.addEventListener(type, listener);
    runtime.removeListeners.push(() =>
      target.removeEventListener(type, listener),
    );
  };
  addListener(args.anchor, "mouseenter", () => scheduleOpen(runtime));
  addListener(args.anchor, "mouseleave", () => scheduleClose(runtime));
  addListener(args.anchor, "mousedown", () =>
    dismissForPrimaryActivation(runtime),
  );
  addListener(args.anchor, "click", () => dismissForPrimaryActivation(runtime));
  addListener(args.anchor, "command", () =>
    dismissForPrimaryActivation(runtime),
  );
  addListener(args.window, "mousedown", (event: Event) => {
    if (!isActivationInsidePopoverRuntime(runtime, event)) {
      scheduleClose(runtime);
    }
  });
  addListener(args.window, "resize", () => positionPopover(runtime));
  addListener(args.window, "keydown", (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === "Escape") {
      closePopover(runtime);
    }
  });
  runtimes.set(args.anchor, runtime);
}

export function uninstallWorkspaceToolbarTaskPopover(args: {
  anchor?: Element | null;
}) {
  const anchor = args.anchor;
  if (!anchor) {
    return;
  }
  const runtime = runtimes.get(anchor);
  if (!runtime) {
    return;
  }
  clearTimers(runtime);
  closePopover(runtime);
  runtime.removeListeners.forEach((remove) => remove());
  runtimes.delete(anchor);
}

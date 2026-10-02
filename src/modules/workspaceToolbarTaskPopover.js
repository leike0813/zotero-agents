import { getStringOrFallback } from "../utils/locale";
import { registerBackgroundRefreshTimer } from "./backgroundRefreshGovernance";
const runtimes = new WeakMap();
const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 250;
const MAX_VISIBLE_TASKS = 6;
const POPOVER_WIDTH = 580;
const EMPTY_POPOVER_HEIGHT = 68;
const RUNNING_POPOVER_CHROME_HEIGHT = 54;
const RUNNING_POPOVER_TASK_ROW_HEIGHT = 32;
const LED_CELL_WIDTH = 18;
const TASK_NAME_WIDTH = 250;
const WORKFLOW_LABEL_WIDTH = 144;
const BACKEND_LABEL_WIDTH = 134;
const localize = getStringOrFallback;
function createXulElement(doc, tag) {
    const factory = doc.createXULElement;
    if (typeof factory === "function") {
        return factory.call(doc, tag);
    }
    return doc.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", tag);
}
function supportsNoAutoFocusWithNoAutoHide() {
    const runtime = globalThis;
    return runtime.Zotero?.isLinux !== true;
}
function xulElement(doc, tag, className = "") {
    const node = createXulElement(doc, tag);
    if (className) {
        node.classList.add(...className.split(/\s+/).filter(Boolean));
    }
    return node;
}
function clampForColumn(value, maxChars) {
    const text = normalizeString(value);
    if (text.length <= maxChars) {
        return text || "-";
    }
    if (maxChars <= 1) {
        return "…";
    }
    return `${text.slice(0, maxChars - 1)}…`;
}
function forceXulBoxWidth(node, width) {
    const px = `${width}px`;
    node.setAttribute("width", String(width));
    node.setAttribute("minwidth", String(width));
    node.setAttribute("maxwidth", String(width));
    node.setAttribute("flex", "0");
    node.setAttribute("style", [
        `width: ${px} !important`,
        `min-width: ${px} !important`,
        `max-width: ${px} !important`,
        "-moz-box-flex: 0 !important",
        "overflow: hidden !important",
        "white-space: nowrap !important",
        "text-overflow: ellipsis !important",
        "margin: 0 !important",
    ].join("; "));
}
function xulLabel(doc, className, value, width, maxChars, inlineStyle = "") {
    const node = xulElement(doc, "label", className);
    node.setAttribute("value", clampForColumn(value, maxChars));
    node.setAttribute("crop", "end");
    node.setAttribute("tooltiptext", value);
    forceXulBoxWidth(node, width);
    if (inlineStyle) {
        node.setAttribute("style", `${node.getAttribute("style") || ""}; ${inlineStyle}`);
    }
    return node;
}
function normalizeTaskState(row) {
    return normalizeString(row.state)
        .toLowerCase()
        .replace(/[-\s]+/g, "_");
}
function resolveTaskLedTone(row) {
    const state = normalizeTaskState(row);
    if (state === "waiting_user" || state === "waiting_auth") {
        return {
            className: "zs-workspace-running-popover-led-amber",
            color: "#f59e0b",
            shadow: "rgba(245, 158, 11, 0.2)",
            tooltip: localize("task-dashboard-status-waiting-user", "Needs attention"),
        };
    }
    if (state === "queued" || state === "pending") {
        return {
            className: "zs-workspace-running-popover-led-slate",
            color: "#64748b",
            shadow: "rgba(100, 116, 139, 0.18)",
            tooltip: localize("task-dashboard-status-queued", "Queued"),
        };
    }
    if (state === "failed") {
        return {
            className: "zs-workspace-running-popover-led-red",
            color: "#dc2626",
            shadow: "rgba(220, 38, 38, 0.18)",
            tooltip: localize("task-dashboard-status-failed", "Failed"),
        };
    }
    if (state === "succeeded" || state === "completed") {
        return {
            className: "zs-workspace-running-popover-led-green",
            color: "#16a34a",
            shadow: "rgba(22, 163, 74, 0.18)",
            tooltip: localize("task-dashboard-status-succeeded", "Succeeded"),
        };
    }
    return {
        className: "zs-workspace-running-popover-led-blue",
        color: "#2563eb",
        shadow: "rgba(37, 99, 235, 0.16)",
        tooltip: localize("task-dashboard-status-running", "Running"),
    };
}
function xulLed(doc, row) {
    const cell = xulElement(doc, "box", "zs-workspace-running-popover-led-cell");
    forceXulBoxWidth(cell, LED_CELL_WIDTH);
    cell.setAttribute("align", "center");
    cell.setAttribute("pack", "center");
    const led = xulElement(doc, "box", "zs-workspace-running-popover-led");
    const tone = resolveTaskLedTone(row);
    led.classList.add(tone.className);
    led.setAttribute("tooltiptext", tone.tooltip);
    led.setAttribute("style", [
        "appearance: none !important",
        "-moz-appearance: none !important",
        "width: 8px !important",
        "min-width: 8px !important",
        "max-width: 8px !important",
        "height: 8px !important",
        "min-height: 8px !important",
        "max-height: 8px !important",
        "margin: 0 5px 0 2px !important",
        "border-radius: 999px !important",
        `background: ${tone.color} !important`,
        `background-color: ${tone.color} !important`,
        `box-shadow: 0 0 0 2px ${tone.shadow} !important`,
    ].join("; "));
    cell.appendChild(led);
    return cell;
}
function normalizeString(value) {
    return String(value || "").trim();
}
function isSkillRunnerTask(row) {
    return normalizeString(row.backendType) === "skillrunner";
}
function isAcpSkillRunTask(row) {
    const backendType = normalizeString(row.backendType);
    const requestKind = normalizeString(row.requestKind);
    const taskId = normalizeString(row.id);
    return (backendType === "acp" &&
        (requestKind === "acp.skill.run.v1" || taskId.startsWith("acp-skill-run:")));
}
async function listVisibleRows(runtime) {
    const result = await Promise.resolve(addon.hooks.onPrefsEvent("listDashboardActiveTasksForPopover", {
        window: runtime.win,
        limit: MAX_VISIBLE_TASKS,
    }));
    if (!Array.isArray(result)) {
        return [];
    }
    const entries = result;
    return entries.filter((entry) => !!entry && typeof entry === "object" && !Array.isArray(entry));
}
function resolveBackendLabel(row) {
    return (normalizeString(row.backendLabel) || normalizeString(row.backendId) || "-");
}
function estimatePopoverHeight(rowCount) {
    if (rowCount <= 0) {
        return EMPTY_POPOVER_HEIGHT;
    }
    return (RUNNING_POPOVER_CHROME_HEIGHT +
        Math.min(rowCount, MAX_VISIBLE_TASKS) * RUNNING_POPOVER_TASK_ROW_HEIGHT);
}
function syncPopoverSize(popover, rowCount) {
    const height = estimatePopoverHeight(rowCount);
    popover.setAttribute("width", String(POPOVER_WIDTH));
    popover.setAttribute("height", String(height));
    if (typeof popover.sizeTo === "function") {
        popover.sizeTo(POPOVER_WIDTH, height);
    }
}
function openTaskFromPopover(win, row) {
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
function clearTimers(runtime) {
    if (runtime.openTimer) {
        clearTimeout(runtime.openTimer);
        runtime.openTimer = null;
    }
    if (runtime.closeTimer) {
        clearTimeout(runtime.closeTimer);
        runtime.closeTimer = null;
    }
}
function eventTargetIsWithin(target, root) {
    if (!target || !root) {
        return false;
    }
    if (target === root) {
        return true;
    }
    const contains = root
        .contains;
    if (typeof contains !== "function" || typeof target !== "object") {
        return false;
    }
    try {
        return contains.call(root, target);
    }
    catch {
        return false;
    }
}
function isActivationInsidePopoverRuntime(runtime, event) {
    return (eventTargetIsWithin(event.target, runtime.anchor) ||
        eventTargetIsWithin(event.target, runtime.popover));
}
function isRelatedTargetInsideAnchor(runtime, event) {
    return eventTargetIsWithin(event.relatedTarget, runtime.anchor);
}
function positionPopover(runtime) {
    const popover = runtime.popover;
    if (!popover) {
        return;
    }
    if (typeof popover.moveToAnchor === "function") {
        popover.moveToAnchor(runtime.anchor, "after_start", 0, 6, false);
    }
}
async function renderPopover(runtime) {
    const doc = runtime.win.document;
    const rows = (await listVisibleRows(runtime))
        .slice()
        .sort((a, b) => normalizeString(b.updatedAt).localeCompare(normalizeString(a.updatedAt)))
        .slice(0, MAX_VISIBLE_TASKS);
    let popover = runtime.popover;
    if (!popover) {
        popover = createXulElement(doc, "panel");
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
        popover.setAttribute("aria-label", localize("task-dashboard-toolbar-running-popover-title", "Running Tasks"));
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
    if (rows.length === 0) {
        content.appendChild(xulLabel(doc, "zs-workspace-running-popover-empty", localize("task-dashboard-toolbar-running-popover-empty", "No active tasks."), POPOVER_WIDTH - 18, 64));
        popover.appendChild(content);
        syncPopoverSize(popover, 0);
        return;
    }
    const title = xulLabel(doc, "zs-workspace-running-popover-title", `${localize("task-dashboard-toolbar-running-popover-title", "Running Tasks")}:`, POPOVER_WIDTH - 18, 64, [
        "font-family: Georgia, 'Times New Roman', serif !important",
        "font-size: 12px !important",
        "font-weight: 700 !important",
        "color: #334155 !important",
        "line-height: 16px !important",
    ].join("; "));
    content.appendChild(title);
    const separator = xulElement(doc, "box", "zs-workspace-running-popover-separator");
    separator.setAttribute("style", [
        "height: 1px !important",
        "min-height: 1px !important",
        "max-height: 1px !important",
        "margin: 5px 2px 6px !important",
        "background-color: rgba(148, 163, 184, 0.55) !important",
        "border: 0 !important",
        "padding: 0 !important",
    ].join("; "));
    content.appendChild(separator);
    const list = xulElement(doc, "vbox", "zs-workspace-running-popover-list");
    rows.forEach((row) => {
        const item = xulElement(doc, "hbox", "zs-workspace-running-popover-task");
        forceXulBoxWidth(item, LED_CELL_WIDTH +
            TASK_NAME_WIDTH +
            WORKFLOW_LABEL_WIDTH +
            BACKEND_LABEL_WIDTH +
            24);
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.setAttribute("align", "center");
        item.setAttribute("data-task-id", normalizeString(row.id));
        const requestKind = normalizeString(row.requestKind);
        if (requestKind) {
            item.setAttribute("data-request-kind", requestKind);
        }
        const taskName = normalizeString(row.taskName) ||
            normalizeString(row.workflowLabel) ||
            "-";
        const workflowLabel = normalizeString(row.workflowLabel) ||
            normalizeString(row.workflowId) ||
            "-";
        const backendLabel = resolveBackendLabel(row);
        item.setAttribute("tooltiptext", [taskName, workflowLabel, backendLabel].filter(Boolean).join("\n"));
        item.addEventListener("click", () => {
            closePopover(runtime);
            openTaskFromPopover(runtime.win, row);
        });
        item.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }
            event.preventDefault();
            closePopover(runtime);
            openTaskFromPopover(runtime.win, row);
        });
        item.appendChild(xulLed(doc, row));
        item.appendChild(xulLabel(doc, "zs-workspace-running-popover-task-title", taskName, TASK_NAME_WIDTH, 36, "font-size: 11px !important; font-weight: 650 !important; line-height: 18px !important; color: #0f172a !important"));
        item.appendChild(xulLabel(doc, "zs-workspace-running-popover-task-subtitle", workflowLabel, WORKFLOW_LABEL_WIDTH, 19, "font-size: 9px !important; line-height: 18px !important; color: #475569 !important"));
        item.appendChild(xulLabel(doc, "zs-workspace-running-popover-task-backend", backendLabel, BACKEND_LABEL_WIDTH, 20, "font-size: 9px !important; line-height: 18px !important; color: #64748b !important"));
        list.appendChild(item);
    });
    content.appendChild(list);
    popover.appendChild(content);
    syncPopoverSize(popover, rows.length);
}
function openPopover(runtime) {
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
        registerBackgroundRefreshTimer({
            owner: "workspace-toolbar-task-popover-refresh",
            activationCondition: "task popover is open",
            scopeKey: "visible popover rows",
            allowedDataSources: [
                "workflow active summaries",
                "acp skill run summaries",
            ],
            maxReadShape: "active summaries limited to visible popover row count",
            requiresForegroundSurface: true,
            minimumIntervalMs: 2000,
            intervalMs: 2000,
        });
        runtime.refreshTimer = setInterval(() => refreshIfOpen(runtime), 2000);
    }
}
function closePopover(runtime) {
    if (runtime.popover) {
        if (typeof runtime.popover.hidePopup === "function") {
            runtime.popover.hidePopup();
        }
        else {
            runtime.popover.remove();
        }
        runtime.popover = null;
    }
    if (runtime.refreshTimer) {
        clearInterval(runtime.refreshTimer);
        runtime.refreshTimer = null;
    }
}
function scheduleOpen(runtime) {
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
function scheduleClose(runtime) {
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
function dismissForPrimaryActivation(runtime) {
    clearTimers(runtime);
    closePopover(runtime);
}
function refreshIfOpen(runtime) {
    if (runtime.popover) {
        void renderPopover(runtime);
    }
}
export function installWorkspaceToolbarTaskPopover(args) {
    const existing = runtimes.get(args.anchor);
    if (existing) {
        return;
    }
    const runtime = {
        win: args.window,
        anchor: args.anchor,
        popover: null,
        openTimer: null,
        closeTimer: null,
        refreshTimer: null,
        removeListeners: [],
    };
    const addListener = (target, type, listener) => {
        if (typeof target.addEventListener !==
            "function" ||
            typeof target
                .removeEventListener !== "function") {
            return;
        }
        target.addEventListener(type, listener);
        runtime.removeListeners.push(() => target.removeEventListener(type, listener));
    };
    addListener(args.anchor, "mouseenter", () => scheduleOpen(runtime));
    addListener(args.anchor, "mouseleave", () => scheduleClose(runtime));
    addListener(args.anchor, "mouseover", (event) => {
        if (isRelatedTargetInsideAnchor(runtime, event)) {
            return;
        }
        scheduleOpen(runtime);
    });
    addListener(args.anchor, "mouseout", (event) => {
        if (isRelatedTargetInsideAnchor(runtime, event)) {
            return;
        }
        scheduleClose(runtime);
    });
    addListener(args.anchor, "mousedown", () => dismissForPrimaryActivation(runtime));
    addListener(args.anchor, "click", () => dismissForPrimaryActivation(runtime));
    addListener(args.anchor, "command", () => dismissForPrimaryActivation(runtime));
    addListener(args.window, "mousedown", (event) => {
        if (!isActivationInsidePopoverRuntime(runtime, event)) {
            scheduleClose(runtime);
        }
    });
    addListener(args.window, "resize", () => positionPopover(runtime));
    addListener(args.window, "keydown", (event) => {
        const keyboardEvent = event;
        if (keyboardEvent.key === "Escape") {
            closePopover(runtime);
        }
    });
    runtimes.set(args.anchor, runtime);
}
export function uninstallWorkspaceToolbarTaskPopover(args) {
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

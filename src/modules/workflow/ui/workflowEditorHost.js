import { resolveToolkitMember } from "../../../utils/runtimeBridge";
import { assertWorkflowHostStrictJsonValue, createWorkflowHostError, } from "../../../workflows/workflowHostErrorContract";
import { convertLegacyArtifactSet, } from "../../literatureArtifactMigration/converter";
const HTML_NS = "http://www.w3.org/1999/xhtml";
const ROOT_ID = "zs-workflow-editor-root";
const GLOBAL_OPEN_KEY = "__zsWorkflowEditorHostOpen";
const GLOBAL_REGISTER_KEY = "__zsWorkflowEditorHostRegisterRenderer";
const GLOBAL_UNREGISTER_KEY = "__zsWorkflowEditorHostUnregisterRenderer";
const rendererRegistry = new Map();
let sessionQueue = Promise.resolve();
const callerSessionQueues = new WeakMap();
let workflowEditorSessionOverrideForTests = null;
function createHtmlElement(doc, tag) {
    const createNs = doc.createElementNS;
    if (typeof createNs === "function") {
        return createNs.call(doc, HTML_NS, tag);
    }
    return doc.createElement(tag);
}
function clearChildren(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
function cloneSerializable(value) {
    if (typeof value === "undefined") {
        return value;
    }
    return JSON.parse(JSON.stringify(value));
}
function resolveDialogCtor() {
    return resolveToolkitMember("Dialog");
}
function serializeEditorResult(args) {
    return typeof args.renderer.serialize === "function"
        ? args.renderer.serialize({
            state: args.state,
            context: args.context,
        })
        : cloneSerializable(args.state);
}
function toComparableSnapshot(value) {
    try {
        const encoded = JSON.stringify(value);
        if (typeof encoded === "string") {
            return encoded;
        }
        return `__primitive__:${String(encoded)}`;
    }
    catch {
        return null;
    }
}
function hasUnsavedChanges(args) {
    if (args.initialSnapshot === null) {
        return true;
    }
    let currentResult;
    try {
        currentResult = serializeEditorResult({
            renderer: args.renderer,
            state: args.state,
            context: args.context,
        });
    }
    catch {
        return true;
    }
    const currentSnapshot = toComparableSnapshot(currentResult);
    if (currentSnapshot === null) {
        return true;
    }
    return currentSnapshot !== args.initialSnapshot;
}
function resolveDirtyCloseDecision(args) {
    const runtime = globalThis;
    try {
        const prompt = runtime.Zotero?.Prompt;
        if (prompt && typeof prompt.confirm === "function") {
            const clicked = prompt.confirm({
                window: args.win || null,
                title: args.title,
                text: args.message,
                button0: prompt.BUTTON_TITLE_SAVE ?? args.saveLabel,
                button1: prompt.BUTTON_TITLE_DONT_SAVE ?? args.discardLabel,
                button2: prompt.BUTTON_TITLE_CANCEL ?? args.cancelLabel,
                defaultButton: 0,
            });
            if (clicked === 0) {
                return "save";
            }
            if (clicked === 1) {
                return "discard";
            }
            return "cancel";
        }
    }
    catch {
        // ignore and fallback to window.confirm
    }
    if (args.win && typeof args.win.confirm === "function") {
        if (args.win.confirm(`${args.title}\n\n${args.message}`)) {
            return "save";
        }
        if (args.win.confirm(`${args.title}\n\nDiscard changes and close?\n\n(OK = Discard, Cancel = Keep Editing)`)) {
            return "discard";
        }
        return "cancel";
    }
    return "cancel";
}
function normalizeNumber(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(0, parsed);
}
function normalizeLayout(layout) {
    const width = normalizeNumber(layout?.width, 1100);
    const height = normalizeNumber(layout?.height, 760);
    const minWidth = normalizeNumber(layout?.minWidth, 940);
    const minHeight = normalizeNumber(layout?.minHeight, 620);
    const maxWidth = normalizeNumber(layout?.maxWidth, 1500);
    const maxHeight = normalizeNumber(layout?.maxHeight, 1080);
    const padding = normalizeNumber(layout?.padding, 8);
    return {
        width: Math.min(Math.max(width, minWidth), maxWidth),
        height: Math.min(Math.max(height, minHeight), maxHeight),
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,
        padding,
    };
}
function applyWindowSizing(doc, layout) {
    const win = doc.defaultView;
    if (win) {
        try {
            win.resizeTo(layout.width, layout.height);
        }
        catch {
            // ignore window manager restrictions
        }
    }
}
function applyFooterVisibility(args) {
    const doc = args.win?.document;
    if (!doc || typeof doc.querySelectorAll !== "function") {
        return;
    }
    const visible = args.visible === true;
    const footerSelectors = [
        ".dialog-button-box",
        ".dialog-buttons",
        ".ztoolkit-dialog-buttons",
        "#zotero-dialog-buttons",
        "button[dlgtype='accept']",
        "button[dlgtype='cancel']",
        "button[dialog='accept']",
        "button[dialog='cancel']",
        "button[command='cmd-accept']",
        "button[command='cmd-cancel']",
    ];
    for (const selector of footerSelectors) {
        let nodes = [];
        try {
            nodes = Array.from(doc.querySelectorAll(selector));
        }
        catch {
            nodes = [];
        }
        for (const node of nodes) {
            const target = node;
            if (target.style && typeof target.style === "object") {
                target.style.display = visible ? "" : "none";
            }
            target.hidden = !visible;
        }
    }
    let buttons = [];
    try {
        buttons = Array.from(doc.querySelectorAll("button"));
    }
    catch {
        buttons = [];
    }
    const acceptedLabels = new Set([args.labels.save, args.labels.cancel].map((entry) => String(entry || "")
        .trim()
        .toLowerCase()));
    for (const button of buttons) {
        const text = String(button.textContent || "")
            .trim()
            .toLowerCase();
        if (!acceptedLabels.has(text)) {
            continue;
        }
        const target = button;
        if (target.style && typeof target.style === "object") {
            target.style.display = visible ? "" : "none";
        }
        target.hidden = !visible;
    }
}
function resolveRenderer(args) {
    if (args.renderer) {
        return args.renderer;
    }
    const rendererId = String(args.rendererId || "").trim();
    if (!rendererId) {
        throw new Error("workflow editor requires an inline renderer");
    }
    const renderer = rendererRegistry.get(rendererId);
    if (!renderer) {
        throw new Error(`workflow editor renderer not found: ${rendererId}`);
    }
    return renderer;
}
async function openDialogSession(args) {
    const renderer = resolveRenderer(args);
    const Dialog = resolveDialogCtor();
    if (!Dialog) {
        throw new Error("workflow editor dialog is unavailable");
    }
    const layout = normalizeLayout(args.layout);
    const labels = {
        save: String(args.labels?.save || "Save"),
        cancel: String(args.labels?.cancel || "Cancel"),
    };
    const autoCloseAfterMs = normalizeNumber(args.autoClose?.afterMs, 0);
    const autoCloseActionId = String(args.autoClose?.actionId || "").trim();
    const customActions = Array.isArray(args.actions)
        ? args.actions.filter((entry) => {
            const id = String(entry?.id || "").trim();
            const label = String(entry?.label || "").trim();
            return !!id && !!label;
        })
        : [];
    const hasCustomActions = customActions.length > 0;
    const state = cloneSerializable(args.initialState);
    // Runtime context may carry non-serializable capabilities (callbacks, schedulers).
    // Keep the live reference for renderer/action execution; only state is cloned.
    const context = args.context;
    let initialSnapshot = null;
    try {
        initialSnapshot = toComparableSnapshot(serializeEditorResult({
            renderer,
            state,
            context,
        }));
    }
    catch {
        initialSnapshot = null;
    }
    const dialogData = {
        loadCallback: () => {
            const doc = addon.data.dialog?.window?.document;
            if (!doc) {
                return;
            }
            const root = doc.getElementById(ROOT_ID);
            if (!root) {
                return;
            }
            applyWindowSizing(doc, layout);
            const host = {
                rerender: () => {
                    clearChildren(root);
                    renderer.render({
                        doc,
                        root: root,
                        state,
                        context,
                        host,
                    });
                },
                patchState: (updater) => {
                    updater(state);
                    host.rerender();
                },
                closeWithAction: (actionId) => {
                    closeDialogWithAny(actionId);
                },
                setFooterVisible: (visible) => {
                    footerVisible = visible === true;
                    applyFooterVisibility({
                        win: dialogWindow,
                        visible: footerVisible,
                        labels,
                    });
                },
                convertLegacyArtifactSet: (input, options) => convertLegacyArtifactSet(input, options),
            };
            rerenderCurrent = host.rerender;
            root.style.width = `${layout.width - 80}px`;
            root.style.maxWidth = `${layout.maxWidth - 80}px`;
            root.style.minWidth = `${layout.minWidth - 80}px`;
            root.style.minHeight = `${layout.minHeight - 120}px`;
            root.style.maxHeight = `${layout.maxHeight - 120}px`;
            root.style.boxSizing = "border-box";
            root.style.padding = `${layout.padding}px`;
            // Keep popups from native controls (e.g., <select>) usable inside editor renderers.
            root.style.overflow = "visible";
            host.rerender();
            applyFooterVisibility({
                win: dialogWindow,
                visible: footerVisible,
                labels,
            });
            if (autoCloseAfterMs > 0 && autoCloseActionId) {
                autoCloseHandle = setTimeout(() => {
                    closeDialogWithAny(autoCloseActionId);
                }, autoCloseAfterMs);
            }
        },
        unloadCallback: () => { },
    };
    let dialogWindow = null;
    let rerenderCurrent = null;
    let footerVisible = true;
    let autoCloseHandle = null;
    const closeDialogWith = (buttonId) => {
        dialogData._lastButtonId = buttonId;
        dialogWindow?.close?.();
    };
    const closeDialogWithAny = (actionId) => {
        const normalized = String(actionId || "").trim();
        if (normalized) {
            dialogData._lastButtonId = normalized;
        }
        dialogWindow?.close?.();
    };
    const handleAttemptClose = () => {
        const dirty = hasUnsavedChanges({
            renderer,
            state,
            context,
            initialSnapshot,
        });
        if (!dirty) {
            closeDialogWith("cancel");
            return;
        }
        const action = resolveDirtyCloseDecision({
            win: dialogWindow,
            title: String(args.title || "Workflow Editor"),
            message: "You have unsaved changes. Save before closing?",
            saveLabel: labels.save,
            discardLabel: "Don't Save",
            cancelLabel: "Cancel",
        });
        if (action === "save") {
            closeDialogWith("save");
            return;
        }
        if (action === "discard") {
            closeDialogWith("discard");
            return;
        }
    };
    let dialogBuilder = new Dialog(1, 1).addCell(0, 0, {
        tag: "div",
        namespace: "html",
        id: ROOT_ID,
        styles: {
            padding: "0px",
        },
    });
    if (!hasCustomActions) {
        dialogBuilder = dialogBuilder
            .addButton(labels.save, "save")
            .addButton(labels.cancel, "cancel", {
            noClose: true,
            callback: () => {
                handleAttemptClose();
            },
        });
    }
    else {
        for (const action of customActions) {
            const actionId = String(action.id || "").trim();
            const actionLabel = String(action.label || "").trim();
            dialogBuilder = dialogBuilder.addButton(actionLabel, actionId, {
                noClose: action.noClose === true || typeof action.onClick === "function",
                callback: () => {
                    if (typeof action.onClick === "function") {
                        action.onClick({
                            state,
                            context,
                            closeWithAction: (id) => closeDialogWithAny(String(id || actionId).trim()),
                            rerender: () => {
                                rerenderCurrent?.();
                            },
                            serialize: () => serializeEditorResult({
                                renderer,
                                state,
                                context,
                            }),
                        });
                        rerenderCurrent?.();
                        return;
                    }
                    closeDialogWithAny(actionId);
                },
            });
        }
    }
    const dialog = dialogBuilder
        .setDialogData(dialogData)
        .open(String(args.title || "Workflow Editor"));
    dialogWindow =
        dialog.window || null;
    addon.data.dialog = dialog;
    try {
        await dialogData
            .unloadLock?.promise;
    }
    finally {
        if (autoCloseHandle) {
            clearTimeout(autoCloseHandle);
            autoCloseHandle = null;
        }
        addon.data.dialog = undefined;
    }
    let clicked = String(dialogData._lastButtonId || "").trim();
    if (!clicked) {
        const closeActionId = String(args.closeActionId || "").trim();
        if (closeActionId) {
            clicked = closeActionId;
        }
    }
    if (clicked === "discard") {
        return {
            saved: false,
            reason: "discarded",
            actionId: "discard",
        };
    }
    if (clicked === "save") {
        const result = serializeEditorResult({
            renderer,
            state,
            context,
        });
        return {
            saved: true,
            result,
            actionId: "save",
        };
    }
    if (!hasCustomActions && clicked === "cancel") {
        return {
            saved: false,
            reason: "canceled",
            actionId: "cancel",
        };
    }
    if (!clicked) {
        return {
            saved: false,
            reason: "canceled",
            actionId: "cancel",
        };
    }
    const result = serializeEditorResult({
        renderer,
        state,
        context,
    });
    return {
        saved: false,
        result,
        reason: "action",
        actionId: clicked,
    };
}
function enqueueSession(task) {
    const run = sessionQueue.then(task, task);
    sessionQueue = run.then(() => undefined, () => undefined);
    return run;
}
function enqueueCallerSession(callerScope, task) {
    const queue = callerSessionQueues.get(callerScope) || Promise.resolve();
    const run = queue.then(task, task);
    callerSessionQueues.set(callerScope, run.then(() => undefined, () => undefined));
    return run;
}
function assertBoundedEditorValue(value, field) {
    try {
        assertWorkflowHostStrictJsonValue(value, {
            maxDepth: 16,
            maxCollectionEntries: 10_000,
            maxStringCharacters: 256_000,
        });
    }
    catch {
        throw createWorkflowHostError("invalid_request", `Workflow editor ${field} must be bounded strict JSON`, { reason: "invalid_schema", field });
    }
}
async function openBoundedWorkflowEditorSession(args, callerScope) {
    assertBoundedEditorValue(args.initialState, "initialState");
    if (args.context !== undefined) {
        assertBoundedEditorValue(args.context, "context");
    }
    const openSession = () => workflowEditorSessionOverrideForTests
        ? Promise.resolve(workflowEditorSessionOverrideForTests(args))
        : openDialogSession(args);
    const result = args.detached === true
        ? await openSession()
        : await enqueueCallerSession(callerScope, openSession);
    if (result.result !== undefined) {
        assertBoundedEditorValue(result.result, "result");
    }
    return result;
}
export function createWorkflowEditorOwner(args) {
    const callerScope = args.callerScope || {};
    return {
        openSession(input) {
            if (args.interactionMode !== "interactive") {
                return Promise.reject(createWorkflowHostError("interaction_required", "editor.openSession requires an interactive Workflow Host", { member: "editor.openSession" }));
            }
            return openBoundedWorkflowEditorSession(input, callerScope);
        },
    };
}
export async function openWorkflowEditorSession(args) {
    if (workflowEditorSessionOverrideForTests) {
        return workflowEditorSessionOverrideForTests(args);
    }
    if (args.detached === true) {
        return openDialogSession(args);
    }
    return enqueueSession(() => openDialogSession(args));
}
export function registerWorkflowEditorRenderer(rendererId, renderer) {
    const normalizedId = String(rendererId || "").trim();
    if (!normalizedId) {
        throw new Error("rendererId is required");
    }
    rendererRegistry.set(normalizedId, renderer);
}
export function unregisterWorkflowEditorRenderer(rendererId) {
    const normalizedId = String(rendererId || "").trim();
    if (!normalizedId) {
        return;
    }
    rendererRegistry.delete(normalizedId);
}
export function installWorkflowEditorHostBridge() {
    const runtime = globalThis;
    runtime[GLOBAL_OPEN_KEY] = (args) => openWorkflowEditorSession(args);
    runtime[GLOBAL_REGISTER_KEY] = (rendererId, renderer) => registerWorkflowEditorRenderer(rendererId, renderer);
    runtime[GLOBAL_UNREGISTER_KEY] = (rendererId) => unregisterWorkflowEditorRenderer(rendererId);
    const addonData = addon.data;
    addonData.workflowEditorHost = {
        open: runtime[GLOBAL_OPEN_KEY],
        registerRenderer: runtime[GLOBAL_REGISTER_KEY],
        unregisterRenderer: runtime[GLOBAL_UNREGISTER_KEY],
    };
}
export function clearWorkflowEditorRendererRegistry() {
    rendererRegistry.clear();
}
export function installWorkflowEditorSessionOverrideForTests(override) {
    workflowEditorSessionOverrideForTests =
        typeof override === "function" ? override : null;
}
export function createWorkflowEditorPanelContainer(doc) {
    const panel = createHtmlElement(doc, "div");
    panel.style.width = "100%";
    panel.style.height = "100%";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.overflow = "hidden";
    panel.style.boxSizing = "border-box";
    return panel;
}

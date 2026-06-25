import { resolveToolkitMember } from "../utils/runtimeBridge";

const HTML_NS = "http://www.w3.org/1999/xhtml";
const ROOT_ID = "zs-workflow-editor-root";
const GLOBAL_OPEN_KEY = "__zsWorkflowEditorHostOpen";
const GLOBAL_REGISTER_KEY = "__zsWorkflowEditorHostRegisterRenderer";
const GLOBAL_UNREGISTER_KEY = "__zsWorkflowEditorHostUnregisterRenderer";

type WorkflowEditorLayout = {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  padding?: number;
};

type WorkflowEditorLabels = {
  save?: string;
  cancel?: string;
};

export type WorkflowEditorAction = {
  id: string;
  label: string;
  noClose?: boolean;
  onClick?: (args: {
    state: unknown;
    context?: unknown;
    closeWithAction: (actionId?: string) => void;
    rerender: () => void;
    serialize: () => unknown;
  }) => void;
};

type WorkflowEditorRenderArgs<TState = unknown, TContext = unknown> = {
  doc: Document;
  root: HTMLElement;
  state: TState;
  context?: TContext;
  host: {
    rerender: () => void;
    patchState: (updater: (state: TState) => void) => void;
    closeWithAction: (actionId?: string) => void;
    setFooterVisible: (visible: boolean) => void;
  };
};

export type WorkflowEditorRenderer<TState = unknown, TContext = unknown> = {
  render: (args: WorkflowEditorRenderArgs<TState, TContext>) => void;
  serialize?: (args: { state: TState; context?: TContext }) => unknown;
};

export type WorkflowEditorOpenArgs<TState = unknown, TContext = unknown> = {
  rendererId: string;
  title: string;
  initialState: TState;
  context?: TContext;
  renderer?: WorkflowEditorRenderer<TState, TContext>;
  layout?: WorkflowEditorLayout;
  labels?: WorkflowEditorLabels;
  actions?: WorkflowEditorAction[];
  closeActionId?: string;
  detached?: boolean;
  autoClose?: {
    afterMs: number;
    actionId: string;
  };
};

export type WorkflowEditorOpenResult = {
  saved: boolean;
  result?: unknown;
  reason?: string;
  actionId?: string;
};

type WorkflowEditorBridge = {
  open: (args: WorkflowEditorOpenArgs) => Promise<WorkflowEditorOpenResult>;
  registerRenderer: (
    rendererId: string,
    renderer: WorkflowEditorRenderer,
  ) => void;
  unregisterRenderer: (rendererId: string) => void;
};

type DialogCtor = new (
  rows: number,
  columns: number,
) => {
  addCell: (...args: unknown[]) => any;
  addButton: (...args: unknown[]) => any;
  setDialogData: (data: Record<string, unknown>) => any;
  open: (title: string) => unknown;
};

const rendererRegistry = new Map<string, WorkflowEditorRenderer>();
let sessionQueue: Promise<void> = Promise.resolve();
let workflowEditorSessionOverrideForTests:
  | ((
      args: WorkflowEditorOpenArgs,
    ) => Promise<WorkflowEditorOpenResult> | WorkflowEditorOpenResult)
  | null = null;

function createHtmlElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
) {
  const createNs = (
    doc as { createElementNS?: (ns: string, name: string) => Element }
  ).createElementNS;
  if (typeof createNs === "function") {
    return createNs.call(doc, HTML_NS, tag) as HTMLElementTagNameMap[K];
  }
  return doc.createElement(tag) as HTMLElementTagNameMap[K];
}

function clearChildren(node: Element) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function cloneSerializable<T>(value: T): T {
  if (typeof value === "undefined") {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveDialogCtor() {
  return resolveToolkitMember<DialogCtor>("Dialog");
}

function serializeEditorResult(args: {
  renderer: WorkflowEditorRenderer;
  state: unknown;
  context: unknown;
}) {
  return typeof args.renderer.serialize === "function"
    ? args.renderer.serialize({
        state: args.state,
        context: args.context,
      })
    : cloneSerializable(args.state);
}

function toComparableSnapshot(value: unknown) {
  try {
    const encoded = JSON.stringify(value);
    if (typeof encoded === "string") {
      return encoded;
    }
    return `__primitive__:${String(encoded)}`;
  } catch {
    return null;
  }
}

function hasUnsavedChanges(args: {
  renderer: WorkflowEditorRenderer;
  state: unknown;
  context: unknown;
  initialSnapshot: string | null;
}) {
  if (args.initialSnapshot === null) {
    return true;
  }
  let currentResult: unknown;
  try {
    currentResult = serializeEditorResult({
      renderer: args.renderer,
      state: args.state,
      context: args.context,
    });
  } catch {
    return true;
  }
  const currentSnapshot = toComparableSnapshot(currentResult);
  if (currentSnapshot === null) {
    return true;
  }
  return currentSnapshot !== args.initialSnapshot;
}

function resolveDirtyCloseDecision(args: {
  win: _ZoteroTypes.MainWindow | null;
  title: string;
  message: string;
  saveLabel: string;
  discardLabel: string;
  cancelLabel: string;
}) {
  const runtime = globalThis as {
    Zotero?: {
      Prompt?: {
        BUTTON_TITLE_SAVE?: number;
        BUTTON_TITLE_DONT_SAVE?: number;
        BUTTON_TITLE_CANCEL?: number;
        confirm?: (args: {
          window?: _ZoteroTypes.MainWindow | null;
          title: string;
          text: string;
          button0: string | number;
          button1: string | number;
          button2?: string | number;
          defaultButton: number;
        }) => number;
      };
    };
  };
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
        return "save" as const;
      }
      if (clicked === 1) {
        return "discard" as const;
      }
      return "cancel" as const;
    }
  } catch {
    // ignore and fallback to window.confirm
  }
  if (args.win && typeof args.win.confirm === "function") {
    if (args.win.confirm(`${args.title}\n\n${args.message}`)) {
      return "save" as const;
    }
    if (
      args.win.confirm(
        `${args.title}\n\nDiscard changes and close?\n\n(OK = Discard, Cancel = Keep Editing)`,
      )
    ) {
      return "discard" as const;
    }
    return "cancel" as const;
  }
  return "cancel" as const;
}

function normalizeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function normalizeLayout(layout?: WorkflowEditorLayout) {
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

function applyWindowSizing(
  doc: Document,
  layout: ReturnType<typeof normalizeLayout>,
) {
  const win = doc.defaultView;
  if (win) {
    try {
      win.resizeTo(layout.width, layout.height);
    } catch {
      // ignore window manager restrictions
    }
  }
}

function applyFooterVisibility(args: {
  win: _ZoteroTypes.MainWindow | null;
  visible: boolean;
  labels: { save: string; cancel: string };
}) {
  const doc = args.win?.document as Document | undefined;
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
    let nodes: Element[] = [];
    try {
      nodes = Array.from(doc.querySelectorAll(selector));
    } catch {
      nodes = [];
    }
    for (const node of nodes) {
      const target = node as Element & {
        style?: CSSStyleDeclaration | { display?: string };
        hidden?: boolean;
      };
      if (target.style && typeof target.style === "object") {
        (target.style as { display?: string }).display = visible ? "" : "none";
      }
      target.hidden = !visible;
    }
  }
  let buttons: Element[] = [];
  try {
    buttons = Array.from(doc.querySelectorAll("button"));
  } catch {
    buttons = [];
  }
  const acceptedLabels = new Set(
    [args.labels.save, args.labels.cancel].map((entry) =>
      String(entry || "")
        .trim()
        .toLowerCase(),
    ),
  );
  for (const button of buttons) {
    const text = String(button.textContent || "")
      .trim()
      .toLowerCase();
    if (!acceptedLabels.has(text)) {
      continue;
    }
    const target = button as Element & {
      style?: CSSStyleDeclaration | { display?: string };
      hidden?: boolean;
    };
    if (target.style && typeof target.style === "object") {
      (target.style as { display?: string }).display = visible ? "" : "none";
    }
    target.hidden = !visible;
  }
}

function resolveRenderer(args: WorkflowEditorOpenArgs) {
  const rendererId = String(args.rendererId || "").trim();
  if (!rendererId) {
    throw new Error("workflow editor requires rendererId");
  }
  if (args.renderer) {
    rendererRegistry.set(rendererId, args.renderer as WorkflowEditorRenderer);
  }
  const renderer = rendererRegistry.get(rendererId);
  if (!renderer) {
    throw new Error(`workflow editor renderer not found: ${rendererId}`);
  }
  return renderer;
}

async function openDialogSession(
  args: WorkflowEditorOpenArgs,
): Promise<WorkflowEditorOpenResult> {
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
  let initialSnapshot: string | null = null;
  try {
    initialSnapshot = toComparableSnapshot(
      serializeEditorResult({
        renderer,
        state,
        context,
      }),
    );
  } catch {
    initialSnapshot = null;
  }

  const dialogData: Record<string, unknown> = {
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
            root: root as HTMLElement,
            state,
            context,
            host,
          });
        },
        patchState: (updater: (target: unknown) => void) => {
          updater(state);
          host.rerender();
        },
        closeWithAction: (actionId?: string) => {
          closeDialogWithAny(actionId);
        },
        setFooterVisible: (visible: boolean) => {
          footerVisible = visible === true;
          applyFooterVisibility({
            win: dialogWindow,
            visible: footerVisible,
            labels,
          });
        },
      };
      rerenderCurrent = host.rerender;

      (root as HTMLElement).style.width = `${layout.width - 80}px`;
      (root as HTMLElement).style.maxWidth = `${layout.maxWidth - 80}px`;
      (root as HTMLElement).style.minWidth = `${layout.minWidth - 80}px`;
      (root as HTMLElement).style.minHeight = `${layout.minHeight - 120}px`;
      (root as HTMLElement).style.maxHeight = `${layout.maxHeight - 120}px`;
      (root as HTMLElement).style.boxSizing = "border-box";
      (root as HTMLElement).style.padding = `${layout.padding}px`;
      // Keep popups from native controls (e.g., <select>) usable inside editor renderers.
      (root as HTMLElement).style.overflow = "visible";

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
    unloadCallback: () => {},
  };

  let dialogWindow: _ZoteroTypes.MainWindow | null = null;
  let rerenderCurrent: (() => void) | null = null;
  let footerVisible = true;
  let autoCloseHandle: ReturnType<typeof setTimeout> | null = null;
  const closeDialogWith = (buttonId: "save" | "cancel" | "discard") => {
    (dialogData as { _lastButtonId?: string })._lastButtonId = buttonId;
    dialogWindow?.close?.();
  };
  const closeDialogWithAny = (actionId?: string) => {
    const normalized = String(actionId || "").trim();
    if (normalized) {
      (dialogData as { _lastButtonId?: string })._lastButtonId = normalized;
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
  } else {
    for (const action of customActions) {
      const actionId = String(action.id || "").trim();
      const actionLabel = String(action.label || "").trim();
      dialogBuilder = dialogBuilder.addButton(actionLabel, actionId, {
        noClose:
          action.noClose === true || typeof action.onClick === "function",
        callback: () => {
          if (typeof action.onClick === "function") {
            action.onClick({
              state,
              context,
              closeWithAction: (id?: string) =>
                closeDialogWithAny(String(id || actionId).trim()),
              rerender: () => {
                rerenderCurrent?.();
              },
              serialize: () =>
                serializeEditorResult({
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
    (dialog as { window?: _ZoteroTypes.MainWindow }).window || null;

  addon.data.dialog = dialog as typeof addon.data.dialog;
  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;
  if (autoCloseHandle) {
    clearTimeout(autoCloseHandle);
    autoCloseHandle = null;
  }
  addon.data.dialog = undefined;

  let clicked = String(
    (dialogData as { _lastButtonId?: string })._lastButtonId || "",
  ).trim();
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

function enqueueSession<T>(task: () => Promise<T>) {
  const run = sessionQueue.then(task, task);
  sessionQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function openWorkflowEditorSession(args: WorkflowEditorOpenArgs) {
  if (workflowEditorSessionOverrideForTests) {
    return workflowEditorSessionOverrideForTests(args);
  }
  if (args.detached === true) {
    return openDialogSession(args);
  }
  return enqueueSession(() => openDialogSession(args));
}

export function registerWorkflowEditorRenderer(
  rendererId: string,
  renderer: WorkflowEditorRenderer,
) {
  const normalizedId = String(rendererId || "").trim();
  if (!normalizedId) {
    throw new Error("rendererId is required");
  }
  rendererRegistry.set(normalizedId, renderer);
}

export function unregisterWorkflowEditorRenderer(rendererId: string) {
  const normalizedId = String(rendererId || "").trim();
  if (!normalizedId) {
    return;
  }
  rendererRegistry.delete(normalizedId);
}

export function installWorkflowEditorHostBridge() {
  const runtime = globalThis as {
    [GLOBAL_OPEN_KEY]?: (
      args: WorkflowEditorOpenArgs,
    ) => Promise<WorkflowEditorOpenResult>;
    [GLOBAL_REGISTER_KEY]?: (
      rendererId: string,
      renderer: WorkflowEditorRenderer,
    ) => void;
    [GLOBAL_UNREGISTER_KEY]?: (rendererId: string) => void;
  };

  runtime[GLOBAL_OPEN_KEY] = (args: WorkflowEditorOpenArgs) =>
    openWorkflowEditorSession(args);
  runtime[GLOBAL_REGISTER_KEY] = (
    rendererId: string,
    renderer: WorkflowEditorRenderer,
  ) => registerWorkflowEditorRenderer(rendererId, renderer);
  runtime[GLOBAL_UNREGISTER_KEY] = (rendererId: string) =>
    unregisterWorkflowEditorRenderer(rendererId);

  const addonData = addon.data as typeof addon.data & {
    workflowEditorHost?: WorkflowEditorBridge;
  };
  addonData.workflowEditorHost = {
    open: runtime[GLOBAL_OPEN_KEY],
    registerRenderer: runtime[GLOBAL_REGISTER_KEY],
    unregisterRenderer: runtime[GLOBAL_UNREGISTER_KEY],
  };
}

export function clearWorkflowEditorRendererRegistry() {
  rendererRegistry.clear();
}

export function installWorkflowEditorSessionOverrideForTests(
  override?:
    | ((
        args: WorkflowEditorOpenArgs,
      ) => Promise<WorkflowEditorOpenResult> | WorkflowEditorOpenResult)
    | null,
) {
  workflowEditorSessionOverrideForTests =
    typeof override === "function" ? override : null;
}

export function createWorkflowEditorPanelContainer(doc: Document) {
  const panel = createHtmlElement(doc, "div");
  panel.style.width = "100%";
  panel.style.height = "100%";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.overflow = "hidden";
  panel.style.boxSizing = "border-box";
  return panel;
}

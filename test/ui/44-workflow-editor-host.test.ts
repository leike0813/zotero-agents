import { assert } from "chai";
import {
  clearWorkflowEditorRendererRegistry,
  installWorkflowEditorHostBridge,
  openWorkflowEditorSession,
  registerWorkflowEditorRenderer,
} from "../../src/modules/workflowEditorHost";

type MockDialogData = Record<string, unknown> & {
  loadCallback?: () => void;
  unloadLock?: { promise?: Promise<void> };
  _lastButtonId?: string;
};

function createRootElement() {
  return {
    style: {} as Record<string, string>,
    firstChild: null as unknown,
    removeChild: () => {},
    appendChild: () => {},
  };
}

function installPromptConfirmMock(
  impl: (args: {
    window?: _ZoteroTypes.MainWindow | null;
    title: string;
    text: string;
    button0: string | number;
    button1: string | number;
    button2?: string | number;
    defaultButton: number;
  }) => number,
) {
  const runtime = globalThis as typeof globalThis & {
    Zotero?: {
      Prompt?: {
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
  const previousZotero = runtime.Zotero;
  const previousPrompt = previousZotero?.Prompt;
  runtime.Zotero = runtime.Zotero || {};
  runtime.Zotero.Prompt = runtime.Zotero.Prompt || {};
  runtime.Zotero.Prompt.confirm = impl;
  return () => {
    if (!runtime.Zotero) {
      return;
    }
    if (previousPrompt) {
      runtime.Zotero.Prompt = previousPrompt;
    } else if (runtime.Zotero.Prompt) {
      delete runtime.Zotero.Prompt;
    }
    if (!previousZotero) {
      delete runtime.Zotero;
    }
  };
}

class MockDialog {
  static nextButtons: string[] = [];

  static nextDelays: number[] = [];

  static inFlight = 0;

  static maxInFlight = 0;

  static continueAfterNoClose = true;

  static lastFooterNodes: Array<{
    style: Record<string, string>;
    hidden?: boolean;
    textContent?: string;
  }> = [];

  private dialogData: MockDialogData | null = null;

  private readonly root = createRootElement();

  private readonly buttons: Array<{
    id: string;
    label: string;
    options?: {
      noClose?: boolean;
      callback?: (event?: unknown) => void;
    };
  }> = [];

  addCell() {
    return this;
  }

  addButton(label?: string, id?: string, options?: unknown) {
    this.buttons.push({
      id: String(id || ""),
      label: String(label || ""),
      options: (options || {}) as {
        noClose?: boolean;
        callback?: (event?: unknown) => void;
      },
    });
    return this;
  }

  setDialogData(data: MockDialogData) {
    this.dialogData = data;
    return this;
  }

  open() {
    if (!this.dialogData) {
      throw new Error("dialog data missing");
    }
    MockDialog.inFlight += 1;
    MockDialog.maxInFlight = Math.max(
      MockDialog.maxInFlight,
      MockDialog.inFlight,
    );
    const delayMs = MockDialog.nextDelays.shift() || 0;
    const footerContainer = {
      style: {} as Record<string, string>,
      hidden: false,
      textContent: "",
    };
    const footerButtons = this.buttons.map((entry) => ({
      style: {} as Record<string, string>,
      hidden: false,
      textContent: String(entry.label || ""),
    }));
    MockDialog.lastFooterNodes = footerButtons;
    const doc = {
      defaultView: {
        resizeTo: () => {},
      },
      getElementById: () => this.root,
      querySelectorAll: (selector: string) => {
        const text = String(selector || "");
        if (text === "button" || text.startsWith("button[")) {
          return footerButtons;
        }
        return [footerContainer];
      },
    };

    let closed = false;
    let settled = false;
    let resolveDone: (() => void) | null = null;
    const window = {
      document: doc,
      close: () => {
        if (closed) {
          return;
        }
        closed = true;
        if (!settled) {
          settled = true;
          MockDialog.inFlight -= 1;
          resolveDone?.();
        }
      },
    };

    const completion = new Promise<void>((resolve) => {
      resolveDone = resolve;
      const runNextClick = () => {
        if (closed) {
          return;
        }
        const clicked = MockDialog.nextButtons.shift() || "save";
        if (clicked === "__close__") {
          window.close();
          return;
        }
        const button = this.buttons.find((entry) => entry.id === clicked);
        if (button?.options?.noClose) {
          button.options.callback?.({ type: "click" });
          if (!closed && MockDialog.continueAfterNoClose) {
            setTimeout(runNextClick, 0);
          }
          return;
        }
        if (this.dialogData) {
          this.dialogData._lastButtonId = clicked;
        }
        window.close();
      };
      setTimeout(() => {
        this.dialogData?.loadCallback?.();
        runNextClick();
      }, delayMs);
    });

    this.dialogData.unloadLock = { promise: completion };
    return { window };
  }
}

describe("workflow editor host", function () {
  let restorePrompt: (() => void) | null = null;

  beforeEach(function () {
    clearWorkflowEditorRendererRegistry();
    MockDialog.nextButtons = [];
    MockDialog.nextDelays = [];
    MockDialog.inFlight = 0;
    MockDialog.maxInFlight = 0;
    MockDialog.continueAfterNoClose = true;
    MockDialog.lastFooterNodes = [];

    const runtime = globalThis as typeof globalThis & {
      addon?: {
        data?: {
          dialog?: unknown;
          ztoolkit?: { Dialog?: typeof MockDialog };
        };
      };
      ztoolkit?: { Dialog?: typeof MockDialog };
    };
    runtime.addon = {
      data: {
        ztoolkit: { Dialog: MockDialog },
      },
    };
    runtime.ztoolkit = {
      Dialog: MockDialog,
    };
    installWorkflowEditorHostBridge();
    restorePrompt = installPromptConfirmMock(() => 1);
  });

  afterEach(function () {
    if (restorePrompt) {
      restorePrompt();
      restorePrompt = null;
    }
  });

  it("resolves save and cancel lifecycle consistently", async function () {
    registerWorkflowEditorRenderer("test-renderer", {
      render: () => {},
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("save");
    const saved = await openWorkflowEditorSession({
      rendererId: "test-renderer",
      title: "Test Save",
      initialState: { ok: true },
    });
    assert.isTrue(saved.saved);
    assert.deepEqual(saved.result, { ok: true });
    assert.equal(saved.actionId, "save");

    MockDialog.nextButtons.push("cancel");
    const canceled = await openWorkflowEditorSession({
      rendererId: "test-renderer",
      title: "Test Cancel",
      initialState: { ok: false },
    });
    assert.isFalse(canceled.saved);
    assert.equal(canceled.reason, "canceled");
    assert.equal(canceled.actionId, "cancel");
  });

  it("prompts dirty close and saves when user chooses save", async function () {
    let promptCalls = 0;
    if (restorePrompt) {
      restorePrompt();
    }
    restorePrompt = installPromptConfirmMock(() => {
      promptCalls += 1;
      return 0;
    });

    registerWorkflowEditorRenderer("dirty-save-renderer", {
      render: ({ state }) => {
        (state as { edited?: boolean }).edited = true;
      },
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("cancel");
    const result = await openWorkflowEditorSession({
      rendererId: "dirty-save-renderer",
      title: "Dirty Save",
      initialState: { edited: false },
    });
    assert.equal(promptCalls, 1);
    assert.isTrue(result.saved);
    assert.deepEqual(result.result, { edited: true });
  });

  it("prompts dirty close and discards when user chooses dont-save", async function () {
    let promptCalls = 0;
    if (restorePrompt) {
      restorePrompt();
    }
    restorePrompt = installPromptConfirmMock(() => {
      promptCalls += 1;
      return 1;
    });

    registerWorkflowEditorRenderer("dirty-discard-renderer", {
      render: ({ state }) => {
        (state as { edited?: boolean }).edited = true;
      },
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("cancel");
    const result = await openWorkflowEditorSession({
      rendererId: "dirty-discard-renderer",
      title: "Dirty Discard",
      initialState: { edited: false },
    });
    assert.equal(promptCalls, 1);
    assert.isFalse(result.saved);
    assert.equal(result.reason, "discarded");
  });

  it("keeps editor open when dirty close prompt chooses cancel", async function () {
    let promptCalls = 0;
    if (restorePrompt) {
      restorePrompt();
    }
    restorePrompt = installPromptConfirmMock(() => {
      promptCalls += 1;
      return 2;
    });

    registerWorkflowEditorRenderer("dirty-cancel-renderer", {
      render: ({ state }) => {
        (state as { edited?: boolean }).edited = true;
      },
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("cancel", "save");
    const result = await openWorkflowEditorSession({
      rendererId: "dirty-cancel-renderer",
      title: "Dirty Cancel",
      initialState: { edited: false },
    });
    assert.equal(promptCalls, 1);
    assert.isTrue(result.saved);
    assert.deepEqual(result.result, { edited: true });
  });

  it("fails fast when renderer id cannot be resolved", async function () {
    let error: unknown;
    try {
      await openWorkflowEditorSession({
        rendererId: "missing-renderer",
        title: "Missing Renderer",
        initialState: {},
      });
    } catch (caught) {
      error = caught;
    }
    assert.instanceOf(error, Error);
    assert.match(String((error as Error).message), /renderer not found/i);
  });

  it("queues multiple sessions sequentially", async function () {
    registerWorkflowEditorRenderer("queue-renderer", {
      render: () => {},
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("save", "save");
    MockDialog.nextDelays.push(15, 15);

    await Promise.all([
      openWorkflowEditorSession({
        rendererId: "queue-renderer",
        title: "First",
        initialState: { index: 1 },
      }),
      openWorkflowEditorSession({
        rendererId: "queue-renderer",
        title: "Second",
        initialState: { index: 2 },
      }),
    ]);

    assert.equal(MockDialog.maxInFlight, 1);
  });

  it("allows detached session to open without waiting queue", async function () {
    registerWorkflowEditorRenderer("detached-renderer", {
      render: () => {},
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("save", "save");
    MockDialog.nextDelays.push(25, 25);

    await Promise.all([
      openWorkflowEditorSession({
        rendererId: "detached-renderer",
        title: "Queued",
        initialState: { index: 1 },
      }),
      openWorkflowEditorSession({
        rendererId: "detached-renderer",
        title: "Detached",
        initialState: { index: 2 },
        detached: true,
      }),
    ]);

    assert.equal(MockDialog.maxInFlight, 2);
  });

  it("returns custom actionId and serialized result for action buttons", async function () {
    registerWorkflowEditorRenderer("custom-actions-renderer", {
      render: ({ state }) => {
        (state as { value?: number }).value = 42;
      },
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("stage-all");
    const result = await openWorkflowEditorSession({
      rendererId: "custom-actions-renderer",
      title: "Custom Actions",
      initialState: { value: 0 },
      actions: [
        { id: "join-all", label: "Join All" },
        { id: "stage-all", label: "Stage All" },
        { id: "reject-all", label: "Reject All" },
      ],
    });

    assert.isFalse(result.saved);
    assert.equal(result.reason, "action");
    assert.equal(result.actionId, "stage-all");
    assert.deepEqual(result.result, { value: 42 });
  });

  it("applies closeActionId when dialog closes without explicit button click", async function () {
    registerWorkflowEditorRenderer("close-default-renderer", {
      render: () => {},
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("__close__");
    const result = await openWorkflowEditorSession({
      rendererId: "close-default-renderer",
      title: "Close Default",
      initialState: { ok: true },
      actions: [{ id: "stage-all", label: "Stage All" }],
      closeActionId: "stage-all",
    });

    assert.isFalse(result.saved);
    assert.equal(result.reason, "action");
    assert.equal(result.actionId, "stage-all");
    assert.deepEqual(result.result, { ok: true });
  });

  it("allows renderer to hide footer buttons at runtime", async function () {
    registerWorkflowEditorRenderer("footer-visibility-renderer", {
      render: ({ host }) => {
        host.setFooterVisible(false);
      },
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("save");
    const result = await openWorkflowEditorSession({
      rendererId: "footer-visibility-renderer",
      title: "Footer Visibility",
      initialState: { ok: true },
    });

    assert.isTrue(result.saved);
    assert.isAtLeast(MockDialog.lastFooterNodes.length, 1);
    for (const node of MockDialog.lastFooterNodes) {
      assert.isTrue(node.hidden === true || node.style.display === "none");
    }
  });

  it("auto-closes dialog with configured actionId", async function () {
    registerWorkflowEditorRenderer("auto-close-renderer", {
      render: () => {},
      serialize: ({ state }) => state,
    });

    MockDialog.continueAfterNoClose = false;
    MockDialog.nextButtons.push("hold");
    const result = await openWorkflowEditorSession({
      rendererId: "auto-close-renderer",
      title: "Auto Close",
      initialState: { ok: true },
      actions: [
        {
          id: "hold",
          label: "Hold",
          noClose: true,
          onClick: () => {},
        },
      ],
      autoClose: {
        afterMs: 20,
        actionId: "stage-all",
      },
    });

    assert.isFalse(result.saved);
    assert.equal(result.reason, "action");
    assert.equal(result.actionId, "stage-all");
    assert.deepEqual(result.result, { ok: true });
  });

  it("preserves non-serializable runtime context for renderer and action callbacks", async function () {
    let renderObserved = "";
    let actionObserved = "";
    registerWorkflowEditorRenderer("runtime-context-renderer", {
      render: ({ state, context }) => {
        const runtimeContext = context as
          | { schedule?: () => string }
          | undefined;
        renderObserved = typeof runtimeContext?.schedule;
        (state as { value?: string }).value =
          runtimeContext?.schedule?.() || "";
      },
      serialize: ({ state }) => state,
    });

    MockDialog.nextButtons.push("run");
    const result = await openWorkflowEditorSession({
      rendererId: "runtime-context-renderer",
      title: "Runtime Context",
      initialState: { value: "" },
      context: {
        schedule: () => "coordinator-ok",
      },
      actions: [
        {
          id: "run",
          label: "Run",
          noClose: true,
          onClick: ({ state, context, closeWithAction }) => {
            const runtimeContext = context as
              | { schedule?: () => string }
              | undefined;
            actionObserved = typeof runtimeContext?.schedule;
            (state as { value?: string }).value =
              runtimeContext?.schedule?.() || "";
            closeWithAction("run");
          },
        },
      ],
    });

    assert.equal(renderObserved, "function");
    assert.equal(actionObserved, "function");
    assert.isFalse(result.saved);
    assert.equal(result.actionId, "run");
    assert.deepEqual(result.result, { value: "coordinator-ok" });
  });
});

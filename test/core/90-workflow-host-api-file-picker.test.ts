import { assert } from "chai";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";
import { openRuntimeFilePicker } from "../../src/platform/filePicker";
import { isZoteroRuntime } from "../zotero/workflow-test-utils";

type RuntimeWithToolkit = typeof globalThis & {
  ztoolkit?: {
    FilePicker?: new (
      title: string,
      mode: string,
      filters: [string, string][],
      suggestion: string,
      window: Window | undefined,
      filterMask?: string,
      directory?: string,
    ) => {
      open: () => Promise<unknown> | unknown;
    };
  };
  addon?: {
    data?: {
      dialog?: { window?: Window };
      prefs?: { window?: Window };
    };
  };
  Zotero?: {
    getMainWindow?: () => Window | null | undefined;
  };
  ChromeUtils?: {
    importESModule?: (specifier: string) => {
      FilePicker?: new () => {
        init: (
          parentWindow: Window | undefined,
          title: string,
          mode: number,
        ) => void;
        appendFilter: (title: string, filter: string) => void;
        displayDirectory?: string;
        modeOpenMultiple: number;
        returnCancel: number;
        show: () => Promise<number>;
        files?: string[];
      };
    };
  };
};

const describeFilePickerSuite = isZoteroRuntime() ? describe.skip : describe;

describeFilePickerSuite("workflow host api file pickers", function () {
  let previousToolkit: RuntimeWithToolkit["ztoolkit"];
  let previousAddon: RuntimeWithToolkit["addon"];
  let previousChromeUtils: RuntimeWithToolkit["ChromeUtils"];
  let previousGetMainWindow: (() => Window | null | undefined) | undefined;

  beforeEach(function () {
    const runtime = globalThis as RuntimeWithToolkit;
    previousToolkit = runtime.ztoolkit;
    previousAddon = runtime.addon;
    previousChromeUtils = runtime.ChromeUtils;
    previousGetMainWindow = runtime.Zotero?.getMainWindow;
    resetWorkflowHostApiForTests();
  });

  afterEach(function () {
    const runtime = globalThis as RuntimeWithToolkit;
    if (typeof previousToolkit === "undefined") {
      delete runtime.ztoolkit;
    } else {
      runtime.ztoolkit = previousToolkit;
    }
    if (typeof previousAddon === "undefined") {
      delete runtime.addon;
    } else {
      runtime.addon = previousAddon;
    }
    if (typeof previousChromeUtils === "undefined") {
      delete runtime.ChromeUtils;
    } else {
      runtime.ChromeUtils = previousChromeUtils;
    }
    if (runtime.Zotero) {
      if (typeof previousGetMainWindow === "undefined") {
        delete runtime.Zotero.getMainWindow;
      } else {
        runtime.Zotero.getMainWindow = previousGetMainWindow;
      }
    }
    resetWorkflowHostApiForTests();
  });

  it("falls back to the main window when the dialog lacks a browsing context", async function () {
    const mainWindow = { browsingContext: {} } as Window;
    const runtime = globalThis as RuntimeWithToolkit;
    runtime.addon = { data: { dialog: { window: {} as Window } } };
    runtime.Zotero ||= {};
    runtime.Zotero.getMainWindow = () => mainWindow;
    let parentWindow: Window | undefined;
    runtime.ztoolkit = {
      FilePicker: class {
        constructor(
          _title: string,
          _mode: string,
          _filters: [string, string][],
          _suggestion: string,
          window: Window | undefined,
        ) {
          parentWindow = window;
        }
        open() {
          return null;
        }
      },
    };

    await openRuntimeFilePicker({ mode: "open" });
    assert.strictEqual(parentWindow, mainWindow);
  });

  it("falls back to the main window when the dialog has closed", async function () {
    const mainWindow = { browsingContext: {} } as Window;
    const closedDialogWindow = {
      browsingContext: {},
      closed: true,
    } as Window;
    const runtime = globalThis as RuntimeWithToolkit;
    runtime.addon = { data: { dialog: { window: closedDialogWindow } } };
    runtime.Zotero ||= {};
    runtime.Zotero.getMainWindow = () => mainWindow;
    let parentWindow: Window | undefined;
    runtime.ztoolkit = {
      FilePicker: class {
        constructor(
          _title: string,
          _mode: string,
          _filters: [string, string][],
          _suggestion: string,
          window: Window | undefined,
        ) {
          parentWindow = window;
        }
        open() {
          return null;
        }
      },
    };

    await openRuntimeFilePicker({ mode: "open" });
    assert.strictEqual(parentWindow, mainWindow);
  });

  it("prefers a live dialog window with a browsing context", async function () {
    const dialogWindow = { browsingContext: {} } as Window;
    const mainWindow = { browsingContext: {} } as Window;
    const runtime = globalThis as RuntimeWithToolkit;
    runtime.addon = { data: { dialog: { window: dialogWindow } } };
    runtime.Zotero ||= {};
    runtime.Zotero.getMainWindow = () => mainWindow;
    let parentWindow: Window | undefined;
    runtime.ztoolkit = {
      FilePicker: class {
        constructor(
          _title: string,
          _mode: string,
          _filters: [string, string][],
          _suggestion: string,
          window: Window | undefined,
        ) {
          parentWindow = window;
        }
        open() {
          return null;
        }
      },
    };

    await openRuntimeFilePicker({ mode: "open" });
    assert.strictEqual(parentWindow, dialogWindow);
  });

  it("picks a directory through the workflow host file facade", async function () {
    const calls: Array<Record<string, unknown>> = [];
    (globalThis as RuntimeWithToolkit).ztoolkit = {
      FilePicker: class {
        constructor(
          title: string,
          mode: string,
          filters: [string, string][],
          _suggestion: string,
          _window: Window | undefined,
          _filterMask?: string,
          directory?: string,
        ) {
          calls.push({
            title,
            mode,
            filters,
            directory: String(directory || ""),
          });
        }
        async open() {
          return "D:/exports/reference-notes";
        }
      },
    };

    const hostApi = createWorkflowHostApi();
    const selected = await hostApi.file.pickDirectory({
      title: "Export Notes",
      initialDirectory: "D:/exports",
    });

    assert.equal(selected, "D:/exports/reference-notes");
    assert.deepEqual(calls, [
      {
        title: "Export Notes",
        mode: "folder",
        filters: [],
        directory: "D:/exports",
      },
    ]);
  });

  it("picks a file through the workflow host file facade with filters", async function () {
    const calls: Array<Record<string, unknown>> = [];
    (globalThis as RuntimeWithToolkit).ztoolkit = {
      FilePicker: class {
        constructor(
          title: string,
          mode: string,
          filters: [string, string][],
          _suggestion: string,
          _window: Window | undefined,
          _filterMask?: string,
          directory?: string,
        ) {
          calls.push({
            title,
            mode,
            filters,
            directory: String(directory || ""),
          });
        }
        async open() {
          return "D:/imports/digest.md";
        }
      },
    };

    const hostApi = createWorkflowHostApi();
    const selected = await hostApi.file.pickFile({
      title: "Import Digest",
      filters: [{ label: "Markdown", extensions: ["md"] }],
      initialDirectory: "D:/imports",
    });

    assert.equal(selected, "D:/imports/digest.md");
    assert.deepEqual(calls, [
      {
        title: "Import Digest",
        mode: "open",
        filters: [["Markdown", "*.md"]],
        directory: "D:/imports",
      },
    ]);
  });

  it("picks multiple files through the shared picker interface with filters", async function () {
    const calls: Array<Record<string, unknown>> = [];
    (globalThis as RuntimeWithToolkit).ztoolkit = {
      FilePicker: class {
        constructor(
          title: string,
          mode: string,
          filters: [string, string][],
          _suggestion: string,
          _window: Window | undefined,
          _filterMask?: string,
          directory?: string,
        ) {
          calls.push({
            title,
            mode,
            filters,
            directory: String(directory || ""),
          });
        }
        async open() {
          return ["D:/imports/custom-a.md", "D:/imports/custom-b.md"];
        }
      },
    };

    const selected = await openRuntimeFilePicker({
      title: "Import Custom Notes",
      mode: "multiple",
      filters: [["Markdown", "*.md"]],
      directory: "D:/imports",
    });

    assert.deepEqual(selected, [
      "D:/imports/custom-a.md",
      "D:/imports/custom-b.md",
    ]);
    assert.deepEqual(calls, [
      {
        title: "Import Custom Notes",
        mode: "multiple",
        filters: [["Markdown", "*.md"]],
        directory: "D:/imports",
      },
    ]);
  });

  it("returns null when multi-file picker is canceled", async function () {
    (globalThis as RuntimeWithToolkit).ztoolkit = {
      FilePicker: class {
        constructor() {}
        async open() {
          return null;
        }
      },
    };

    const hostApi = createWorkflowHostApi();
    const selected = await hostApi.file.pickFiles({
      title: "Import Custom Notes",
    });

    assert.equal(selected, null);
  });

  it("distinguishes a successful empty multi-selection from cancel", async function () {
    (globalThis as RuntimeWithToolkit).ztoolkit = {
      FilePicker: class {
        constructor() {}
        async open() {
          return [];
        }
      },
    };

    assert.deepEqual(await openRuntimeFilePicker({ mode: "multiple" }), []);
  });

  it("resolves the parent Window and picker constructor on every call", async function () {
    const runtime = globalThis as RuntimeWithToolkit;
    const parents: Array<Window | undefined> = [];
    const firstWindow = { browsingContext: {} } as Window;
    const secondWindow = { browsingContext: {} } as Window;
    const picker = (label: string) =>
      class {
        constructor(
          _title: string,
          _mode: string,
          _filters: [string, string][],
          _suggestion: string,
          window: Window | undefined,
        ) {
          parents.push(window);
        }
        open() {
          return label;
        }
      };

    runtime.addon = { data: { dialog: { window: firstWindow } } };
    runtime.ztoolkit = { FilePicker: picker("first") };
    assert.equal(await openRuntimeFilePicker({ mode: "open" }), "first");

    runtime.addon = { data: { dialog: { window: secondWindow } } };
    runtime.ztoolkit = { FilePicker: picker("second") };
    assert.equal(await openRuntimeFilePicker({ mode: "open" }), "second");
    assert.deepEqual(parents, [firstWindow, secondWindow]);
  });

  it("picks a save target with suggestion, filter, and initial directory", async function () {
    const calls: Array<Record<string, unknown>> = [];
    (globalThis as RuntimeWithToolkit).ztoolkit = {
      FilePicker: class {
        constructor(
          title: string,
          mode: string,
          filters: [string, string][],
          suggestion: string,
          _window: Window | undefined,
          _filterMask?: string,
          directory?: string,
        ) {
          calls.push({ title, mode, filters, suggestion, directory });
        }
        async open() {
          return "D:/exports/literature-bundle.zip";
        }
      },
    };

    const selected = await createWorkflowHostApi().file.pickSaveFile({
      title: "Export Literature Bundle",
      filters: [{ label: "ZIP bundle", extensions: ["zip"] }],
      suggestedName: "literature-bundle.zip",
      initialDirectory: "D:/exports",
    });

    assert.equal(selected, "D:/exports/literature-bundle.zip");
    assert.deepEqual(calls, [
      {
        title: "Export Literature Bundle",
        mode: "save",
        filters: [["ZIP bundle", "*.zip"]],
        suggestion: "literature-bundle.zip",
        directory: "D:/exports",
      },
    ]);
  });

  it("returns null when save picker is canceled", async function () {
    (globalThis as RuntimeWithToolkit).ztoolkit = {
      FilePicker: class {
        constructor() {}
        async open() {
          return false;
        }
      },
    };

    assert.equal(
      await createWorkflowHostApi().file.pickSaveFile({
        suggestedName: "literature-bundle.zip",
      }),
      null,
    );
  });

  it("normalizes extension lists into picker masks", async function () {
    const calls: Array<Record<string, unknown>> = [];
    (globalThis as RuntimeWithToolkit).ztoolkit = {
      FilePicker: class {
        constructor(
          _title: string,
          _mode: string,
          filters: [string, string][],
        ) {
          calls.push({ filters });
        }
        async open() {
          return null;
        }
      },
    };

    await createWorkflowHostApi().file.pickFile({
      filters: [
        { label: "Images", extensions: ["jpg", ".png", "*.webp"] },
      ],
    });

    assert.deepEqual(calls, [
      { filters: [["Images", "*.jpg;*.png;*.webp"]] },
    ]);
  });

  it("rejects picker filters that exceed fixed group and extension bounds", async function () {
    const hostApi = createWorkflowHostApi();
    const oversizedGroups = Array.from({ length: 33 }, (_, index) => ({
      label: `group-${index}`,
      extensions: ["md"],
    }));
    const oversizedExtensions = [
      {
        label: "too-many",
        extensions: Array.from({ length: 65 }, (_, index) => `e${index}`),
      },
    ];
    for (const filters of [oversizedGroups, oversizedExtensions]) {
      let error: unknown;
      try {
        await hostApi.file.pickFile({ filters });
      } catch (caught) {
        error = caught;
      }
      assert.equal((error as { code?: string })?.code, "resource_limited");
    }
  });

  it("rejects picker filters without a label or extensions", async function () {
    const hostApi = createWorkflowHostApi();
    for (const filters of [
      [{ label: "", extensions: ["md"] }],
      [{ label: "Markdown", extensions: [] }],
    ]) {
      let error: unknown;
      try {
        await hostApi.file.pickFile({ filters });
      } catch (caught) {
        error = caught;
      }
      assert.equal((error as { code?: string })?.code, "invalid_request");
    }
  });

  it("uses native multi-file picker with the active dialog window when available", async function () {
    const initCalls: Array<Record<string, unknown>> = [];
    const appendFilterCalls: Array<Record<string, unknown>> = [];
    const dialogWindow = { browsingContext: {} } as Window;
    (globalThis as RuntimeWithToolkit).addon = {
      data: {
        dialog: { window: dialogWindow },
      },
    };
    (globalThis as RuntimeWithToolkit).ChromeUtils = {
      importESModule() {
        return {
          FilePicker: class {
            modeOpenMultiple = 3;
            returnCancel = 1;
            files = ["D:/imports/custom-a.md", "D:/imports/custom-b.md"];
            init(
              parentWindow: Window | undefined,
              title: string,
              mode: number,
            ) {
              initCalls.push({ parentWindow, title, mode });
            }
            appendFilter(title: string, filter: string) {
              appendFilterCalls.push({ title, filter });
            }
            async show() {
              return 0;
            }
          },
        };
      },
    };

    const selected = await openRuntimeFilePicker({
      title: "Import Custom Notes",
      mode: "multiple",
      filters: [["Markdown", "*.md"]],
      directory: "D:/imports",
    });

    assert.deepEqual(selected, [
      "D:/imports/custom-a.md",
      "D:/imports/custom-b.md",
    ]);
    assert.deepEqual(initCalls, [
      {
        parentWindow: dialogWindow,
        title: "Import Custom Notes",
        mode: 3,
      },
    ]);
    assert.deepEqual(appendFilterCalls, [
      {
        title: "Markdown",
        filter: "*.md",
      },
    ]);
  });
});

import { assert } from "chai";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";
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

  beforeEach(function () {
    const runtime = globalThis as RuntimeWithToolkit;
    previousToolkit = runtime.ztoolkit;
    previousAddon = runtime.addon;
    previousChromeUtils = runtime.ChromeUtils;
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
    resetWorkflowHostApiForTests();
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
      directory: "D:/exports",
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
      filters: [["Markdown", "*.md"]],
      directory: "D:/imports",
    });

    assert.equal(selected, "D:/imports/digest.md");
    assert.deepEqual(calls, [
      {
        title: "Import Digest",
        mode: "file",
        filters: [["Markdown", "*.md"]],
        directory: "D:/imports",
      },
    ]);
  });

  it("picks multiple files through the workflow host file facade with filters", async function () {
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

    const hostApi = createWorkflowHostApi();
    const selected = await hostApi.file.pickFiles({
      title: "Import Custom Notes",
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
        mode: "files",
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

  it("uses native multi-file picker with the active dialog window when available", async function () {
    const initCalls: Array<Record<string, unknown>> = [];
    const appendFilterCalls: Array<Record<string, unknown>> = [];
    const dialogWindow = {} as Window;
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

    const hostApi = createWorkflowHostApi();
    const selected = await hostApi.file.pickFiles({
      title: "Import Custom Notes",
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

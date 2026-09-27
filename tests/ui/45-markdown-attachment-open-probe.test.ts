import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  installMarkdownAttachmentOpenProbe,
  isMarkdownAttachmentCandidate,
  resetMarkdownAttachmentOpenProbeForTests,
} from "../../src/modules/markdownAttachmentOpenProbe";
import {
  openMarkdownAttachmentTab,
  resetMarkdownAttachmentTabsForTests,
} from "../../src/modules/markdownAttachmentTab";

describe("markdown attachment open probe", function () {
  afterEach(function () {
    resetMarkdownAttachmentOpenProbeForTests();
    resetMarkdownAttachmentTabsForTests();
    delete (globalThis as { IOUtils?: unknown }).IOUtils;
  });

  it("identifies markdown attachments by path extension or MIME type", function () {
    assert.isTrue(
      isMarkdownAttachmentCandidate({
        filePath: "D:\\Library\\paper.md",
        contentType: "",
      }),
    );
    assert.isTrue(
      isMarkdownAttachmentCandidate({
        filePath: "D:\\Library\\paper.txt",
        contentType: "text/markdown; charset=utf-8",
      }),
    );
    assert.isFalse(
      isMarkdownAttachmentCandidate({
        filePath: "D:\\Library\\paper.pdf",
        contentType: "application/pdf",
      }),
    );
  });

  it("redirects markdown file attachments to the internal tab opener", async function () {
    let originalOpenCalls = 0;
    const opened: unknown[] = [];
    const runtime = {
      FileHandlers: {
        open: async () => {
          originalOpenCalls++;
          return "original";
        },
      },
      debug: () => undefined,
      warn: () => undefined,
      logError: () => undefined,
    };
    installMarkdownAttachmentOpenProbe({
      runtime,
      openTab: async (args) => {
        opened.push(args);
      },
    });

    const result = await runtime.FileHandlers.open({
      id: 12,
      key: "ABCD1234",
      libraryKey: "1/ABCD1234",
      attachmentContentType: "text/plain",
      getFilePathAsync: async () => "D:\\Library\\paper.md",
      getField: (field: string) => (field === "title" ? "Paper Notes" : ""),
      isAttachment: () => true,
      isFileAttachment: () => true,
    });

    assert.equal(result, true);
    assert.equal(originalOpenCalls, 0);
    assert.deepInclude(opened, {
      itemID: 12,
      itemKey: "ABCD1234",
      title: "Paper Notes",
      filePath: "D:\\Library\\paper.md",
    });
  });

  it("delegates non-markdown attachments to Zotero's original opener", async function () {
    let originalOpenCalls = 0;
    let receivedParams: unknown;
    const runtime = {
      FileHandlers: {
        open: async (_item: unknown, params?: unknown) => {
          originalOpenCalls++;
          receivedParams = params;
          return "original";
        },
      },
      debug: () => undefined,
      warn: () => undefined,
      logError: () => undefined,
    };
    installMarkdownAttachmentOpenProbe({
      runtime,
      openTab: async () => {
        throw new Error("non-markdown attachment should not open probe tab");
      },
    });

    const params = { location: { pageIndex: 0 } };
    const result = await runtime.FileHandlers.open(
      {
        id: 13,
        attachmentContentType: "application/pdf",
        getFilePathAsync: async () => "D:\\Library\\paper.pdf",
        isAttachment: () => true,
        isFileAttachment: () => true,
      },
      params,
    );

    assert.equal(result, "original");
    assert.equal(originalOpenCalls, 1);
    assert.equal(receivedParams, params);
  });

  it("delegates markdown attachments when the reader preference is disabled", async function () {
    let originalOpenCalls = 0;
    const runtime = {
      FileHandlers: {
        open: async () => {
          originalOpenCalls++;
          return "original";
        },
      },
      debug: () => undefined,
      warn: () => undefined,
      logError: () => undefined,
    };
    installMarkdownAttachmentOpenProbe({
      runtime,
      isReaderEnabled: () => false,
      openTab: async () => {
        throw new Error("disabled markdown reader should not open a tab");
      },
    });

    const result = await runtime.FileHandlers.open({
      id: 14,
      attachmentContentType: "text/markdown",
      getFilePathAsync: async () => "D:\\Library\\paper.md",
      isAttachment: () => true,
      isFileAttachment: () => true,
    });

    assert.equal(result, "original");
    assert.equal(originalOpenCalls, 1);
  });

  it("restores the original opener when reset", async function () {
    const originalOpen = async () => "original";
    const runtime = {
      FileHandlers: {
        open: originalOpen,
      },
      warn: () => undefined,
    };
    installMarkdownAttachmentOpenProbe({ runtime });
    assert.notEqual(runtime.FileHandlers.open, originalOpen);

    resetMarkdownAttachmentOpenProbeForTests();

    assert.equal(runtime.FileHandlers.open, originalOpen);
  });

  it("installs a pull bridge after the reader frame loads", async function () {
    const frameListeners = new Map<string, Array<() => void>>();
    const frameWindow = {
      location: {
        href: "chrome://zotero-skills/content/markdown-reader/index.html",
      },
      wrappedJSObject: {},
    };
    const frameAttributes = new Map<string, string>();
    const frame = {
      contentWindow: null as typeof frameWindow | null,
      style: {},
      setAttribute: (name: string, value: string) => {
        frameAttributes.set(name, value);
      },
      addEventListener: (type: string, listener: () => void) => {
        const listeners = frameListeners.get(type) || [];
        listeners.push(listener);
        frameListeners.set(type, listeners);
      },
    };
    const container = {
      appendChild: (node: unknown) => {
        assert.equal(node, frame);
      },
    };
    let addedOptions: Record<string, any> | undefined;
    const tabRecord = {
      tab: {
        title: "",
        label: "",
        data: {} as Record<string, unknown>,
      },
    };
    const hostWindow = {
      document: {
        createElement: () => frame,
      },
      Zotero_Tabs: {
        add: (options: Record<string, any>) => {
          addedOptions = options;
          tabRecord.tab.title = String(options.title || "");
          tabRecord.tab.label = String(options.title || "");
          tabRecord.tab.data = { ...(options.data || {}) };
          return { id: "tab", container };
        },
        select: () => undefined,
        _getTab: () => tabRecord,
      },
    };
    let readCount = 0;
    (globalThis as { IOUtils?: unknown }).IOUtils = {
      readUTF8: async () => {
        readCount += 1;
        return readCount === 1 ? "# Loaded\n\nBody" : "# Refreshed\n\nBody";
      },
    };
    const zotero = (globalThis as any).Zotero || {};
    const originalLaunchFile = zotero.launchFile;
    const originalFile = zotero.File;
    const launched: string[] = [];
    const revealed: string[] = [];
    zotero.launchFile = async (filePath: string) => {
      launched.push(filePath);
    };
    zotero.File = {
      ...(zotero.File || {}),
      reveal: async (filePath: string) => {
        revealed.push(filePath);
      },
      pathToFile: (filePath: string) => ({
        exists: () => true,
        reveal: () => {
          revealed.push(filePath);
        },
      }),
    };

    try {
      await openMarkdownAttachmentTab({
        itemID: "bridge-load",
        itemKey: "BRIDGELOAD",
        title: "Bridge Load",
        filePath: "D:\\Library\\bridge.md",
        window: hostWindow as unknown as _ZoteroTypes.MainWindow,
      });

      assert.equal(addedOptions?.title, "Bridge Load");
      assert.equal(tabRecord.tab.title, "Bridge Load");
      assert.include(frameAttributes.get("src") || "", "title=Bridge+Load");
      assert.include(
        String(addedOptions?.data?.iconURI || ""),
        "icon_file_markdown_32.png",
      );
      assert.isUndefined(addedOptions?.data?.itemID);
      assert.isUndefined(addedOptions?.data?.itemKey);
      assert.equal(addedOptions?.data?.markdownItemID, "bridge-load");
      assert.equal(addedOptions?.data?.markdownItemKey, "BRIDGELOAD");
      assert.equal(addedOptions?.data?.icon, "zotero-skills-markdown-reader");
      assert.isUndefined(addedOptions?.iconURI);
      assert.notInclude(
        String(addedOptions?.data?.iconURI || ""),
        "icon_markdown_file.svg",
      );
      assert.equal(frameAttributes.get("maychangeremoteness"), "true");
      assert.isUndefined(
        (
          frameWindow as {
            __zoteroSkillsMarkdownReaderBridge?: unknown;
          }
        ).__zoteroSkillsMarkdownReaderBridge,
      );

      frame.contentWindow = frameWindow;
      tabRecord.tab.title = "";
      for (const listener of frameListeners.get("load") || []) {
        listener();
      }
      assert.equal(tabRecord.tab.title, "Bridge Load");

      const bridge = (
        frameWindow as {
          __zoteroSkillsMarkdownReaderBridge?: {
            requestDocument: () => Promise<any>;
            refresh: () => Promise<any>;
            openSystem: () => Promise<void>;
            openFolder: () => Promise<void>;
            isSidebarOpen: () => boolean;
            openSidebar: () => Promise<boolean>;
            closeSidebar: () => boolean;
          };
        }
      ).__zoteroSkillsMarkdownReaderBridge;
      const wrappedBridge = (
        frameWindow.wrappedJSObject as {
          __zoteroSkillsMarkdownReaderBridge?: unknown;
        }
      ).__zoteroSkillsMarkdownReaderBridge;

      assert.isFunction(bridge?.requestDocument);
      assert.isFunction(
        (wrappedBridge as { requestDocument?: unknown })?.requestDocument,
      );

      tabRecord.tab.title = "";
      const loaded = await bridge?.requestDocument();
      assert.deepInclude(loaded, {
        itemID: "bridge-load",
        itemKey: "BRIDGELOAD",
        title: "Bridge Load",
        filePath: "D:\\Library\\bridge.md",
        baseFileUri: "file:///D%3A/Library/bridge.md",
        markdown: "# Loaded\n\nBody",
      });
      assert.equal(tabRecord.tab.title, "Bridge Load");
      assert.isString(loaded?.locale);
      assert.equal(loaded?.messages?.refresh, "Refresh");
      assert.equal(loaded?.messages?.copyMarkdown, "Copy Markdown");
      assert.equal(loaded?.messages?.openFolder, "Show in File Manager");
      assert.equal(loaded?.messages?.clearSearch, "Clear search");
      assert.equal(loaded?.messages?.openSidebar, "Open Assistant Sidebar");
      assert.equal(loaded?.messages?.closeSidebar, "Close Assistant Sidebar");
      assert.isFalse(bridge?.isSidebarOpen());
      assert.isFunction(bridge?.openSidebar);
      assert.isFunction(bridge?.closeSidebar);

      tabRecord.tab.title = "";
      const refreshed = await bridge?.refresh();
      assert.deepInclude(refreshed, {
        itemID: "bridge-load",
        itemKey: "BRIDGELOAD",
        title: "Bridge Load",
        filePath: "D:\\Library\\bridge.md",
        baseFileUri: "file:///D%3A/Library/bridge.md",
        markdown: "# Refreshed\n\nBody",
      });
      assert.equal(tabRecord.tab.title, "Bridge Load");

      await bridge?.openSystem();
      assert.deepEqual(launched, ["D:\\Library\\bridge.md"]);
      await bridge?.openFolder();
      assert.deepEqual(revealed, ["D:\\Library\\bridge.md"]);
    } finally {
      if (originalLaunchFile) {
        zotero.launchFile = originalLaunchFile;
      } else {
        delete zotero.launchFile;
      }
      if (originalFile) {
        zotero.File = originalFile;
      } else {
        delete zotero.File;
      }
    }
  });

  it("opens a standalone fallback when the reader bridge never handshakes", async function () {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "zs-md-reader-"));
    const originalRuntimeRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const originalSetInterval = globalThis.setInterval;
    const originalClearInterval = globalThis.clearInterval;
    const zotero = (globalThis as any).Zotero || {};
    const originalLaunchFile = zotero.launchFile;
    const launched: string[] = [];
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempDir;
    zotero.launchFile = async (filePath: string) => {
      launched.push(filePath);
    };
    (globalThis as { IOUtils?: unknown }).IOUtils = {
      readUTF8: async () => "# Fallback\n\nBody",
    };
    (globalThis as any).setInterval = (callback: () => void) => {
      for (let index = 0; index < 45; index += 1) {
        callback();
      }
      return 1;
    };
    (globalThis as any).clearInterval = () => undefined;

    const frame = {
      contentWindow: null,
      style: {},
      setAttribute: () => undefined,
      addEventListener: () => undefined,
    };
    const hostWindow = {
      document: {
        createElement: () => frame,
      },
      Zotero_Tabs: {
        add: () => ({
          id: "tab",
          container: {
            appendChild: () => undefined,
          },
        }),
        select: () => undefined,
      },
    };

    try {
      await openMarkdownAttachmentTab({
        itemID: "fallback",
        itemKey: "FALLBACK",
        title: "Fallback",
        filePath: "D:\\Library\\fallback.md",
        window: hostWindow as unknown as _ZoteroTypes.MainWindow,
      });
      for (
        let attempt = 0;
        attempt < 20 && launched.length === 0;
        attempt += 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      assert.lengthOf(launched, 1);
      assert.match(launched[0], /markdown-reader.*\.html$/);
      const fallbackHtml = await fs.readFile(launched[0], "utf8");
      assert.include(fallbackHtml, "# Fallback\\n\\nBody");
    } finally {
      resetMarkdownAttachmentTabsForTests();
      await fs.rm(tempDir, { recursive: true, force: true });
      if (originalRuntimeRoot === undefined) {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = originalRuntimeRoot;
      }
      (globalThis as any).setInterval = originalSetInterval;
      (globalThis as any).clearInterval = originalClearInterval;
      if (originalLaunchFile) {
        zotero.launchFile = originalLaunchFile;
      } else {
        delete zotero.launchFile;
      }
    }
  });
});

import { assert } from "chai";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { config } from "../../package.json";
import {
  isLibraryArtifactsColumnInvalidationEvent,
  libraryArtifactsColumnInternalsForTests,
  notifyLibraryArtifactsColumnItemsChanged,
  registerLibraryArtifactsColumn,
  resetLibraryArtifactsColumnForTests,
  unregisterLibraryArtifactsColumn,
} from "../../src/modules/libraryArtifactsColumn";
import { resolveLibraryArtifactReadiness } from "../../src/modules/libraryArtifactReadiness";
import {
  buildWorkbenchPayloadEnvelope,
  buildWorkbenchPayloadPngBytes,
} from "../../src/modules/notePayloadCodec";
import { probeMozillaRuntimeModules } from "../../src/utils/runtimeCompatibility";

const basePngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

describe("library artifacts column", function () {
  let previousAddon: unknown;

  beforeEach(async function () {
    previousAddon = (globalThis as { addon?: unknown }).addon;
    await unregisterLibraryArtifactsColumn();
    resetLibraryArtifactsColumnForTests();
  });

  afterEach(async function () {
    await unregisterLibraryArtifactsColumn();
    resetLibraryArtifactsColumnForTests();
    (globalThis as { addon?: unknown }).addon = previousAddon;
  });

  it("registers the Artifacts column in the main tree picker without default visibility", async function () {
    const originalRegister = Zotero.ItemTreeManager.registerColumn;
    const calls: Array<Record<string, any>> = [];
    Zotero.ItemTreeManager.registerColumn = (async (
      options: Record<string, any>,
    ) => {
      calls.push(options);
      return "registered-artifacts";
    }) as typeof Zotero.ItemTreeManager.registerColumn;

    try {
      await registerLibraryArtifactsColumn();
    } finally {
      Zotero.ItemTreeManager.registerColumn = originalRegister;
    }

    assert.equal(calls.length, 1);
    assert.include(calls[0], {
      dataKey: "artifacts",
      label: "Artifacts",
      pluginID: config.addonID,
      showInColumnPicker: true,
      width: "48",
    });
    assert.deepEqual(calls[0].enabledTreeIDs, ["*"]);
    assert.deepEqual(calls[0].zoteroPersist, ["hidden"]);
    assert.notProperty(calls[0], "defaultIn");
    assert.notProperty(calls[0], "fixedWidth");
    assert.notProperty(calls[0], "staticWidth");
  });

  it("uses the localized Artifacts column label when locale data is available", async function () {
    (globalThis as { addon?: unknown }).addon = {
      data: {
        locale: {
          current: {
            formatMessagesSync: (requests: Array<{ id: string }>) =>
              requests.map((request) => ({
                value: request.id.endsWith("library-artifacts-column-label")
                  ? "工件"
                  : request.id,
                attributes: null,
              })),
          },
        },
      },
    };
    const originalRegister = Zotero.ItemTreeManager.registerColumn;
    const calls: Array<Record<string, any>> = [];
    Zotero.ItemTreeManager.registerColumn = (async (
      options: Record<string, any>,
    ) => {
      calls.push(options);
      return "registered-artifacts";
    }) as typeof Zotero.ItemTreeManager.registerColumn;

    try {
      await registerLibraryArtifactsColumn();
    } finally {
      Zotero.ItemTreeManager.registerColumn = originalRegister;
    }

    assert.equal(calls[0].label, "工件");
  });

  it("detects a same-stem Markdown source attachment for the best PDF", async function () {
    const parent = await createParentItem("Paper");
    const pdf = await createAttachment(parent, "D:\\Library\\Paper.PDF", {
      contentType: "application/pdf",
    });
    await createAttachment(parent, "D:\\Library\\paper.md", {
      contentType: "text/markdown",
    });
    parent.getBestAttachment = async () => pdf;

    const state =
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        parent,
      );

    assert.equal(state, "source-markdown");
  });

  it("matches .markdown attachments by stem case-insensitively", async function () {
    const parent = await createParentItem("Paper");
    const pdf = await createAttachment(parent, "D:\\Library\\PAPER.pdf", {
      contentType: "application/pdf",
    });
    await createAttachment(parent, "D:\\Library\\paper.markdown", {
      contentType: "text/markdown",
    });
    parent.getBestAttachment = async () => pdf;

    const state =
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        parent,
      );

    assert.equal(state, "source-markdown");
  });

  it("does not match a different Markdown stem or items that are not top-level parents", async function () {
    const parent = await createParentItem("Paper");
    const pdf = await createAttachment(parent, "D:\\Library\\paper.pdf", {
      contentType: "application/pdf",
    });
    const markdown = await createAttachment(parent, "D:\\Library\\other.md", {
      contentType: "text/markdown",
    });
    parent.getBestAttachment = async () => pdf;

    assert.equal(
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        parent,
      ),
      "",
    );
    assert.equal(
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        markdown,
      ),
      "",
    );
  });

  it("returns empty state when no best PDF exists", async function () {
    const parent = await createParentItem("Paper");
    await createAttachment(parent, "D:\\Library\\paper.md", {
      contentType: "text/markdown",
    });
    parent.getBestAttachment = async () => false;

    const state =
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        parent,
      );

    assert.equal(state, "");
  });

  it("detects generated note artifacts from note-kind markers without title fallback", async function () {
    const parent = await createParentItem("Paper");
    await createNote(
      parent,
      "Not a generated digest",
      '<div data-zs-note-kind="digest"><p>payload is not read</p></div>',
    );
    await createNote(
      parent,
      "Not generated references",
      '<div data-zs-note-kind="references"><img data-zs-payload-anchor="references-json"></div>',
    );
    await createNote(
      parent,
      "Not generated citation analysis",
      '<div data-zs-note-kind="citation_analysis"><p>legacy underscore marker</p></div>',
    );
    await createNote(parent, "Digest", "<p>title only</p>");

    const state =
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        parent,
      );

    assert.equal(state, "digest|references|citation-analysis");

    const titleOnlyParent = await createParentItem("Title-only Paper");
    await createNote(titleOnlyParent, "Digest", "<p>title only</p>");

    assert.equal(
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        titleOnlyParent,
      ),
      "",
    );

    const anchorOnlyParent = await createParentItem("Anchor-only Paper");
    await createNote(
      anchorOnlyParent,
      "Digest",
      '<p><img data-zs-payload-anchor="digest-markdown"></p>',
    );

    assert.equal(
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        anchorOnlyParent,
      ),
      "digest",
    );

    const payloadOnlyParent = await createParentItem("Payload-only Paper");
    await createNote(
      payloadOnlyParent,
      "References",
      '<p><span data-zs-payload="references-json"></span></p>',
    );

    assert.equal(
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        payloadOnlyParent,
      ),
      "references",
    );
  });

  it("detects generated note artifacts from embedded payload when the anchor is missing", async function () {
    const parent = await createParentItem("Paper");
    const note = await createNote(
      parent,
      "Citation Analysis",
      '<div data-schema-version="9"><h1>Citation Analysis</h1><p>normalized note</p></div>',
    );
    await createEmbeddedPayloadAttachment(note, {
      noteKind: "citation-analysis",
      payloadType: "citation-analysis-json",
      payload: {
        version: 1,
        format: "json",
        citations: [],
      },
    });

    const state =
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        parent,
      );

    assert.equal(state, "citation-analysis");
  });

  it("does not classify schema headings as generated artifacts without marker or payload evidence", async function () {
    const parent = await createParentItem("Paper");
    await createNote(
      parent,
      "Citation Analysis",
      '<div data-schema-version="9"><h1>Citation Analysis</h1><p>normalized note</p></div>',
    );

    const state =
      await libraryArtifactsColumnInternalsForTests.resolveArtifactState(
        parent,
      );

    assert.equal(state, "");
  });

  it("refreshes artifact rows without refreshing item tree columns after lazy scans", async function () {
    const parent = await createParentItem("Paper");
    await createNote(
      parent,
      "Digest",
      '<div data-zs-note-kind="digest"><p>payload</p></div>',
    );
    const originalRefreshColumns = Zotero.ItemTreeManager.refreshColumns;
    const originalTrigger = Zotero.Notifier.trigger;
    let refreshColumnsCalls = 0;
    const triggerCalls: Array<{
      event: string;
      type: string;
      ids: number | number[];
    }> = [];
    Zotero.ItemTreeManager.refreshColumns = () => {
      refreshColumnsCalls += 1;
    };
    Zotero.Notifier.trigger = (async (
      event: string,
      type: string,
      ids: number | number[],
    ) => {
      triggerCalls.push({ event, type, ids });
      return true;
    }) as typeof Zotero.Notifier.trigger;

    try {
      assert.equal(
        libraryArtifactsColumnInternalsForTests.provideArtifactsCellData(
          parent,
        ),
        "",
      );
      await waitForArtifactColumnRefresh();

      assert.equal(refreshColumnsCalls, 0);
      assert.deepEqual(triggerCalls, [
        { event: "refresh", type: "item", ids: [parent.id] },
      ]);
      assert.equal(
        libraryArtifactsColumnInternalsForTests.provideArtifactsCellData(
          parent,
        ),
        "digest",
      );
    } finally {
      Zotero.ItemTreeManager.refreshColumns = originalRefreshColumns;
      Zotero.Notifier.trigger = originalTrigger;
    }
  });

  it("does not treat artifact row refresh notifications as item invalidations", function () {
    assert.isTrue(isLibraryArtifactsColumnInvalidationEvent("modify"));
    assert.isFalse(isLibraryArtifactsColumnInvalidationEvent("refresh"));
    assert.isFalse(isLibraryArtifactsColumnInvalidationEvent("redraw"));
  });

  it("does not refresh rows after a lazy scan resolves to the already rendered empty state", async function () {
    const parent = await createParentItem("Paper");
    const originalRefreshColumns = Zotero.ItemTreeManager.refreshColumns;
    const originalTrigger = Zotero.Notifier.trigger;
    let refreshColumnsCalls = 0;
    let triggerCalls = 0;
    Zotero.ItemTreeManager.refreshColumns = () => {
      refreshColumnsCalls += 1;
    };
    Zotero.Notifier.trigger = (async () => {
      triggerCalls += 1;
      return true;
    }) as typeof Zotero.Notifier.trigger;

    try {
      assert.equal(
        libraryArtifactsColumnInternalsForTests.provideArtifactsCellData(
          parent,
        ),
        "",
      );
      await waitForArtifactColumnRefresh();

      assert.equal(refreshColumnsCalls, 0);
      assert.equal(triggerCalls, 0);
      assert.equal(
        libraryArtifactsColumnInternalsForTests.provideArtifactsCellData(
          parent,
        ),
        "",
      );
    } finally {
      Zotero.ItemTreeManager.refreshColumns = originalRefreshColumns;
      Zotero.Notifier.trigger = originalTrigger;
    }
  });

  it("refreshes affected parent rows without refreshing columns for note changes", async function () {
    const parent = await createParentItem("Paper");
    const note = await createNote(
      parent,
      "Digest",
      '<div data-zs-note-kind="digest"><p>payload</p></div>',
    );
    const originalRefreshColumns = Zotero.ItemTreeManager.refreshColumns;
    const originalTrigger = Zotero.Notifier.trigger;
    let refreshColumnsCalls = 0;
    const triggerCalls: Array<{
      event: string;
      type: string;
      ids: number | number[];
    }> = [];
    Zotero.ItemTreeManager.refreshColumns = () => {
      refreshColumnsCalls += 1;
    };
    Zotero.Notifier.trigger = (async (
      event: string,
      type: string,
      ids: number | number[],
    ) => {
      triggerCalls.push({ event, type, ids });
      return true;
    }) as typeof Zotero.Notifier.trigger;

    try {
      notifyLibraryArtifactsColumnItemsChanged([note.id]);
      await waitForArtifactColumnRefresh();

      assert.equal(refreshColumnsCalls, 0);
      assert.deepEqual(triggerCalls, [
        { event: "refresh", type: "item", ids: [parent.id] },
      ]);
    } finally {
      Zotero.ItemTreeManager.refreshColumns = originalRefreshColumns;
      Zotero.Notifier.trigger = originalTrigger;
    }
  });

  it("refreshes affected parent rows without refreshing columns for attachment changes", async function () {
    const parent = await createParentItem("Paper");
    const attachment = await createAttachment(parent, "D:\\Library\\paper.md", {
      contentType: "text/markdown",
    });
    const originalRefreshColumns = Zotero.ItemTreeManager.refreshColumns;
    const originalTrigger = Zotero.Notifier.trigger;
    let refreshColumnsCalls = 0;
    const triggerCalls: Array<{
      event: string;
      type: string;
      ids: number | number[];
    }> = [];
    Zotero.ItemTreeManager.refreshColumns = () => {
      refreshColumnsCalls += 1;
    };
    Zotero.Notifier.trigger = (async (
      event: string,
      type: string,
      ids: number | number[],
    ) => {
      triggerCalls.push({ event, type, ids });
      return true;
    }) as typeof Zotero.Notifier.trigger;

    try {
      notifyLibraryArtifactsColumnItemsChanged([attachment.id]);
      await waitForArtifactColumnRefresh();

      assert.equal(refreshColumnsCalls, 0);
      assert.deepEqual(triggerCalls, [
        { event: "refresh", type: "item", ids: [parent.id] },
      ]);
    } finally {
      Zotero.ItemTreeManager.refreshColumns = originalRefreshColumns;
      Zotero.Notifier.trigger = originalTrigger;
    }
  });

  it("exposes structured readiness from the shared artifact evaluator", async function () {
    const parent = await createParentItem("Readiness Paper");
    const pdf = await createAttachment(parent, "D:\\Library\\readiness.pdf", {
      contentType: "application/pdf",
    });
    await createAttachment(parent, "D:\\Library\\readiness.md", {
      contentType: "text/markdown",
    });
    await createNote(
      parent,
      "Digest",
      '<div data-zs-note-kind="digest"><p>Digest</p></div>',
    );
    parent.getBestAttachment = async () => pdf;

    const readiness = await resolveLibraryArtifactReadiness(parent);

    assert.isTrue(readiness.pdf.present);
    assert.isTrue(readiness.sourceMarkdown.present);
    assert.isFalse(readiness.generated.complete);
    assert.deepEqual(readiness.generated.missingParts, [
      "references",
      "citation-analysis",
    ]);
    assert.equal(readiness.state, "source-markdown|digest");
  });

  it("renders the artifact icon set for multi-artifact cells", function () {
    const doc = createTinyDocument();

    const cell = libraryArtifactsColumnInternalsForTests.renderArtifactsCell(
      "source-markdown|digest|references|citation-analysis",
      doc as unknown as Document,
    );

    const icons = cell.querySelectorAll("img");
    assert.equal(cell.className, "cell zs-library-artifacts-cell");
    assert.equal(
      cell.getAttribute("title"),
      "Source Markdown, Digest, References, Citation Analysis",
    );
    assert.deepEqual(
      icons.map((icon) => icon.getAttribute("src")),
      [
        `chrome://${config.addonRef}/content/icons/icon_artifact_markdown.svg`,
        `chrome://${config.addonRef}/content/icons/icon_artifact_digest.svg`,
        `chrome://${config.addonRef}/content/icons/icon_artifact_references.svg`,
        `chrome://${config.addonRef}/content/icons/icon_artifact_citation_analysis.svg`,
      ],
    );
    assert.deepEqual(
      icons.map((icon) => icon.getAttribute("title")),
      ["Source Markdown", "Digest", "References", "Citation Analysis"],
    );
    assert.equal(icons[0]?.className, "zs-library-artifact-icon");
  });

  it("unregisters the returned column dataKey", async function () {
    const unregistered: string[] = [];
    const originalRegister = Zotero.ItemTreeManager.registerColumn;
    const originalUnregister = Zotero.ItemTreeManager.unregisterColumn;
    Zotero.ItemTreeManager.registerColumn = (async () =>
      "registered-artifacts") as typeof Zotero.ItemTreeManager.registerColumn;
    Zotero.ItemTreeManager.unregisterColumn = (async (dataKey: string) => {
      unregistered.push(dataKey);
      return true;
    }) as typeof Zotero.ItemTreeManager.unregisterColumn;

    try {
      await registerLibraryArtifactsColumn();
      await unregisterLibraryArtifactsColumn();
    } finally {
      Zotero.ItemTreeManager.registerColumn = originalRegister;
      Zotero.ItemTreeManager.unregisterColumn = originalUnregister;
    }

    assert.deepEqual(unregistered, ["registered-artifacts"]);
  });
});

describe("runtime module compatibility", function () {
  afterEach(function () {
    delete (globalThis as { ChromeUtils?: unknown }).ChromeUtils;
  });

  it("uses importESModule for sys.mjs specifiers without requiring a caller hint", function () {
    const calls: string[] = [];
    (globalThis as any).ChromeUtils = {
      importESModule: (specifier: string) => {
        calls.push(`esm:${specifier}`);
        return { ConsoleAPI: true };
      },
      import: (specifier: string) => {
        calls.push(`legacy:${specifier}`);
        throw new Error(`legacy import should not be used: ${specifier}`);
      },
    };

    const [result] = probeMozillaRuntimeModules({
      specifiers: ["resource://gre/modules/Console.sys.mjs"],
    });

    assert.deepEqual(calls, ["esm:resource://gre/modules/Console.sys.mjs"]);
    assert.deepEqual(result.imported, { ConsoleAPI: true });
    assert.isUndefined(result.error);
  });
});

async function createParentItem(title: string) {
  const item = new Zotero.Item("journalArticle");
  item.setField("title", title);
  await item.saveTx();
  return item;
}

async function waitForArtifactColumnRefresh() {
  await new Promise((resolve) => setTimeout(resolve, 150));
}

function createTinyDocument() {
  return {
    createElement: (tagName: string) => new TinyElement(tagName),
  };
}

class TinyElement {
  className = "";
  private attributes = new Map<string, string>();
  private children: TinyElement[] = [];

  constructor(private readonly tagName: string) {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) || null;
  }

  appendChild(child: TinyElement) {
    this.children.push(child);
    return child;
  }

  querySelector(tagName: string) {
    const normalized = tagName.toLowerCase();
    return (
      this.children.find(
        (child) => child.tagName.toLowerCase() === normalized,
      ) || null
    );
  }

  querySelectorAll(tagName: string) {
    const normalized = tagName.toLowerCase();
    return this.children.filter(
      (child) => child.tagName.toLowerCase() === normalized,
    );
  }
}

async function createAttachment(
  parent: Zotero.Item,
  filePath: string,
  options: { contentType?: string } = {},
) {
  const item = new Zotero.Item("attachment") as Zotero.Item & {
    attachmentContentType?: string;
    attachmentFilename?: string;
    setFilePath?: (path: string) => void;
  };
  item.parentID = parent.id;
  item.attachmentContentType = options.contentType || "";
  item.setFilePath?.(filePath);
  item.attachmentFilename = filePath.split(/[\\/]+/).pop() || "";
  await item.saveTx();
  return item;
}

async function createNote(parent: Zotero.Item, title: string, html: string) {
  const item = new Zotero.Item("note");
  item.parentID = parent.id;
  item.setField("title", title);
  item.setNote(html);
  await item.saveTx();
  return item;
}

async function createEmbeddedPayloadAttachment(
  note: Zotero.Item,
  options: {
    noteKind: string;
    payloadType: string;
    payload: unknown;
  },
) {
  const envelope = buildWorkbenchPayloadEnvelope({
    noteKind: options.noteKind,
    payloadType: options.payloadType,
    payload: options.payload,
    noteId: note.id,
    noteKey: note.key,
    parentId: note.parentID,
  });
  const bytes = buildWorkbenchPayloadPngBytes(basePngBytes, envelope);
  const filePath = path.join(
    os.tmpdir(),
    `zotero-artifact-payload-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.png`,
  );
  await fs.writeFile(filePath, bytes);
  const attachment = await createAttachment(note, filePath, {
    contentType: "image/png",
  });
  (
    attachment as Zotero.Item & {
      getAttachmentLinkMode?: () => number;
      isEmbeddedImageAttachment?: () => boolean;
    }
  ).getAttachmentLinkMode = () => 4;
  (
    attachment as Zotero.Item & {
      getAttachmentLinkMode?: () => number;
      isEmbeddedImageAttachment?: () => boolean;
    }
  ).isEmbeddedImageAttachment = () => true;
  return attachment;
}

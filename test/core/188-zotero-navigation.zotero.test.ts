import { assert } from "chai";
import {
  createZoteroHostCapabilityBroker,
  type ZoteroHostCapabilityError,
} from "../../src/modules/zoteroHostCapabilityBroker";
import { getParentPath, joinNativePath } from "../../src/platform/path";
import { readDiagnosticsEnv } from "../zotero/testDiagnosticsOutput";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
  };
  return !!runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock";
}

const describeZotero = isRealZoteroRuntime() ? describe : describe.skip;

async function attempt(action: () => Promise<unknown>) {
  try {
    return { ok: true, value: await action() } as const;
  } catch (error) {
    const failure = error as ZoteroHostCapabilityError;
    return {
      ok: false,
      code: failure.code,
      reason: (failure.details as { reason?: string } | undefined)?.reason,
      message: error instanceof Error ? error.message : String(error),
    } as const;
  }
}

function assertFeatureDetected(
  result: Awaited<ReturnType<typeof attempt>>,
  operation: string,
) {
  if (!result.ok) {
    assert.oneOf(
      result.code,
      ["unavailable", "unsupported_operation"],
      `${operation}: ${result.message || "unknown failure"}`,
    );
  }
}

describeZotero("canonical navigation in Zotero runtime", function () {
  it("covers native navigation seams with feature-detected cleanup", async function () {
    this.timeout(120000);
    const broker = createZoteroHostCapabilityBroker();
    const libraryId = Zotero.Libraries.userLibraryID;
    const projectRoot =
      readDiagnosticsEnv("ZOTERO_COMPAT_PROJECT_ROOT") ||
      getParentPath(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"));
    const attachmentPath = joinNativePath(
      projectRoot,
      "test",
      "fixtures",
      "selection-context",
      "attachments",
      "8BVUFWMZ",
      "Zhang 等 - 2024 - Enhancing DETRs Variants through Improved Content Query and Similar Query Aggregation.pdf",
    );
    const item = new Zotero.Item("journalArticle");
    item.setField("title", `Navigation matrix ${Date.now()}`);
    await item.saveTx();
    const attachment = await Zotero.Attachments.importFromFile({
      file: attachmentPath,
      parentItemID: item.id,
      title: "Navigation PDF",
      contentType: "application/pdf",
    });
    const annotation = new Zotero.Item("annotation");
    annotation.libraryID = libraryId;
    annotation.parentID = attachment.id;
    (annotation as any).annotationType = "highlight";
    (annotation as any).annotationText = "Navigation annotation";
    (annotation as any).annotationPageLabel = "1";
    (annotation as any).annotationSortIndex = "00000|000000|00000";
    (annotation as any).annotationPosition = JSON.stringify({
      pageIndex: 0,
      rects: [[10, 10, 20, 20]],
    });
    await annotation.saveTx();
    const collection = new Zotero.Collection();
    collection.name = `Navigation collection ${Date.now()}`;
    collection.libraryID = libraryId;
    await collection.saveTx();
    const search = new Zotero.Search();
    search.name = `Navigation search ${Date.now()}`;
    search.libraryID = libraryId;
    search.addCondition("title", "contains", "Navigation matrix");
    await search.saveTx();
    const itemRef = { libraryId, key: item.key };
    const attachmentRef = { libraryId, key: attachment.key };
    const mainWindow = (Zotero as any).getMainWindow?.();
    (globalThis as any).window?.debug?.({
      kind: "zotero-navigation-native-capabilities",
      version: String(Zotero.version || ""),
      capabilities: {
        viewItems: typeof mainWindow?.ZoteroPane?.viewItems === "function",
        selectByID:
          typeof mainWindow?.ZoteroPane?.collectionsView?.selectByID ===
          "function",
        readerOpen: typeof (Zotero as any).Reader?.open === "function",
      },
    });
    try {
      assert.deepEqual(await broker.navigation.focusZotero(), {
        outcome: "focused",
      });
      const navigationResults = [
        [
          "select library view",
          await attempt(() =>
            broker.navigation.selectLibraryView({ view: "library", libraryId }),
          ),
        ],
        [
          "select collection",
          await attempt(() =>
            broker.navigation.selectCollection({
              libraryId,
              key: collection.key,
            }),
          ),
        ],
        [
          "select saved search",
          await attempt(() =>
            broker.navigation.selectSavedSearch({ libraryId, key: search.key }),
          ),
        ],
        [
          "reveal items",
          await attempt(() =>
            broker.navigation.revealItems({
              itemRefs: [itemRef, attachmentRef],
            }),
          ),
        ],
        ["open item", await attempt(() => broker.navigation.openItem(itemRef))],
      ] as const;
      for (const [operation, result] of navigationResults) {
        assertFeatureDetected(result, operation);
      }
      for (const location of [
        { kind: "page", pageIndex: 0 } as const,
        { kind: "page", pageIndex: 0 } as const,
        { kind: "annotation", annotationKey: annotation.key } as const,
        { kind: "epub", cfi: "epubcfi(/6/2[chapter]!/4/1:0)" } as const,
      ]) {
        const result = await attempt(() =>
          broker.navigation.openReaderLocation({
            target: attachmentRef,
            location,
          }),
        );
        if (!result.ok) {
          assert.oneOf(result.code, ["unavailable", "unsupported_operation"]);
          if (result.code === "unsupported_operation")
            assert.strictEqual(result.reason, "location_unsupported");
        }
      }
    } finally {
      await Zotero.Items.trashTx([item.id, attachment.id, annotation.id]);
      await collection.eraseTx();
      await search.eraseTx();
    }
  });
});

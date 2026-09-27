import { assert } from "chai";
import {
  createZoteroHostCapabilityBroker,
  type ZoteroHostCapabilityError,
} from "../../../../src/modules/zoteroHostCapabilityBroker";
import { getParentPath, joinNativePath } from "../../../../src/platform/path";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";

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
  it("rejects a cold Reader when native construction switches windows", async function () {
    this.timeout(120000);
    const broker = createZoteroHostCapabilityBroker();
    const libraryId = Zotero.Libraries.userLibraryID;
    const projectRoot =
      readDiagnosticsEnv("ZOTERO_COMPAT_PROJECT_ROOT") ||
      getParentPath(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"));
    const attachmentPath = joinNativePath(
      projectRoot,
      "tests",
      "fixtures",
      "selection-context",
      "attachments",
      "8BVUFWMZ",
      "Zhang 等 - 2024 - Enhancing DETRs Variants through Improved Content Query and Similar Query Aggregation.pdf",
    );
    const item = new Zotero.Item("journalArticle");
    item.setField("title", `Navigation Reader race ${Date.now()}`);
    await item.saveTx();
    const attachment = await Zotero.Attachments.importFromFile({
      file: attachmentPath,
      parentItemID: item.id,
      title: "Navigation raced PDF",
      contentType: "application/pdf",
    });
    const targetWindow = (Zotero as any).getMainWindow?.();
    const control = {
      target: {
        resolveAndValidate: () => (targetWindow?.closed ? null : targetWindow),
      },
    };
    const library = Zotero.Libraries.get(attachment.libraryID);
    const originalWaitForDataLoad = library.waitForDataLoad;
    let waitCount = 0;
    let entered!: () => void;
    let release!: () => void;
    let otherWindow: any;
    const enteredReaderWait = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blockedReaderWait = new Promise<void>((resolve) => {
      release = resolve;
    });
    library.waitForDataLoad = async function (...args: unknown[]) {
      await originalWaitForDataLoad.apply(this, args as [string]);
      waitCount++;
      // The Broker prewarms once; the second wait is native Reader.open().
      if (waitCount === 2) {
        entered();
        await blockedReaderWait;
      }
    };
    try {
      assert.isTrue(
        Zotero.getMainWindow() === targetWindow,
        "the captured window starts as the native MRU window",
      );
      const targetTabs = targetWindow.Zotero_Tabs.numTabs;
      const pending = attempt(() =>
        broker.navigation.openReaderLocation(
          {
            kind: "page",
            attachment: { libraryId, key: attachment.key },
            pageIndex: 0,
          },
          control,
        ),
      );
      await Promise.race([
        enteredReaderWait,
        pending.then(() => {
          throw new Error("Reader open settled before the native wait gate");
        }),
      ]);

      Zotero.openMainWindow();
      const otherWindowDeadline = Date.now() + 20_000;
      while (!otherWindow && Date.now() < otherWindowDeadline) {
        otherWindow = Zotero.getMainWindows().find(
          (candidate: any) =>
            candidate !== targetWindow &&
            candidate.ZoteroPane?.itemsView &&
            Zotero.getMainWindow() === candidate,
        );
        if (!otherWindow) await Zotero.Promise.delay(50);
      }
      assert.isOk(
        otherWindow,
        "a different native main window became MRU during Reader.open",
      );
      const otherWindowTabs = otherWindow.Zotero_Tabs.numTabs;
      release();
      const result = await pending;

      assert.isFalse(result.ok);
      if (!result.ok) assert.strictEqual(result.code, "execution_failed");
      assert.strictEqual(otherWindow.Zotero_Tabs.numTabs, otherWindowTabs);
      assert.strictEqual(targetWindow.Zotero_Tabs.numTabs, targetTabs + 1);
      const reservation = targetWindow.Zotero_Tabs.getTabIDByItemID(
        attachment.id,
      );
      assert.isOk(reservation, "target-window reservation remains visible");
      assert.isNotOk(Zotero.Reader.getByTabID(reservation));
    } finally {
      release();
      library.waitForDataLoad = originalWaitForDataLoad;
      for (const win of [targetWindow, otherWindow]) {
        const tabID = win?.Zotero_Tabs?.getTabIDByItemID?.(attachment.id);
        if (tabID) win.Zotero_Tabs.close(tabID);
      }
      if (otherWindow && !otherWindow.closed) otherWindow.close();
      await Zotero.Items.trashTx([item.id, attachment.id]);
    }
  });

  it("covers native navigation seams with feature-detected cleanup", async function () {
    this.timeout(120000);
    const broker = createZoteroHostCapabilityBroker();
    const libraryId = Zotero.Libraries.userLibraryID;
    const projectRoot =
      readDiagnosticsEnv("ZOTERO_COMPAT_PROJECT_ROOT") ||
      getParentPath(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"));
    const attachmentPath = joinNativePath(
      projectRoot,
      "tests",
      "fixtures",
      "selection-context",
      "attachments",
      "8BVUFWMZ",
      "Zhang 等 - 2024 - Enhancing DETRs Variants through Improved Content Query and Similar Query Aggregation.pdf",
    );
    // Verbatim Zotero 10.0.1 test fixture (AGPL-3.0),
    // originally test/tests/data/stub.epub at commit 36749bd0.
    const epubPath = joinNativePath(
      projectRoot,
      "tests",
      "fixtures",
      "reader",
      "zotero-stub.epub",
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
    const epub = await Zotero.Attachments.importFromFile({
      file: epubPath,
      parentItemID: item.id,
      title: "Navigation EPUB",
      contentType: "application/epub+zip",
    });
    const unloadedAttachment = await Zotero.Attachments.importFromFile({
      file: attachmentPath,
      parentItemID: item.id,
      title: "Navigation unloaded PDF",
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
    const epubRef = { libraryId, key: epub.key };
    const mainWindow = (Zotero as any).getMainWindow?.();
    const control = {
      target: {
        resolveAndValidate: () => (mainWindow?.closed ? null : mainWindow),
      },
    };
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
      assert.deepEqual(await broker.navigation.focusZotero(control), {
        outcome: "focus_dispatched",
      });
      const navigationResults = [
        [
          "select library view",
          await attempt(() =>
            broker.navigation.selectLibraryView(
              { view: "library", libraryId },
              control,
            ),
          ),
        ],
        [
          "select collection",
          await attempt(() =>
            broker.navigation.selectCollection(
              {
                libraryId,
                key: collection.key,
              },
              control,
            ),
          ),
        ],
        [
          "select saved search",
          await attempt(() =>
            broker.navigation.selectSavedSearch(
              { libraryId, key: search.key },
              control,
            ),
          ),
        ],
        [
          "reveal items",
          await attempt(() =>
            broker.navigation.revealItems(
              {
                items: [itemRef, attachmentRef],
              },
              control,
            ),
          ),
        ],
        [
          "open item",
          await attempt(() => broker.navigation.openItem(itemRef, control)),
        ],
      ] as const;
      for (const [operation, result] of navigationResults) {
        assertFeatureDetected(result, operation);
      }
      for (const location of [
        { kind: "page", attachment: attachmentRef, pageIndex: 0 } as const,
        { kind: "page", attachment: attachmentRef, pageIndex: 0 } as const,
        {
          kind: "annotation",
          annotation: { libraryId, key: annotation.key },
        } as const,
        {
          kind: "epub",
          attachment: epubRef,
          cfi: "epubcfi(/6/2[chapter]!/4/1:0)",
        } as const,
      ]) {
        const result = await broker.navigation.openReaderLocation(
          location,
          control,
        );
        assert.strictEqual(result.outcome, "reader_location_dispatched");
        const target =
          location.kind === "annotation"
            ? attachment
            : location.attachment.key === epub.key
              ? epub
              : attachment;
        const tabID = mainWindow.Zotero_Tabs.getTabIDByItemID(target.id);
        const reader = Zotero.Reader.getByTabID(tabID);
        assert.strictEqual(reader?._window, mainWindow);
        assert.strictEqual(reader?.tabID, tabID);
      }
      const wrongKind = await attempt(() =>
        broker.navigation.openReaderLocation(
          {
            kind: "epub",
            attachment: attachmentRef,
            cfi: "epubcfi(/6/2[chapter]!/4/1:0)",
          },
          control,
        ),
      );
      assert.isFalse(wrongKind.ok);
      if (!wrongKind.ok) assert.equal(wrongKind.code, "invalid_ref");

      const unloadedTab = mainWindow.Zotero_Tabs.add({
        type: "reader-unloaded",
        title: "Navigation unloaded PDF",
        data: { itemID: unloadedAttachment.id },
        select: false,
      });
      const unloadedLocation = {
        kind: "page" as const,
        attachment: { libraryId, key: unloadedAttachment.key },
        pageIndex: 0,
      };
      assert.strictEqual(
        (await broker.navigation.openReaderLocation(unloadedLocation, control))
          .outcome,
        "reader_location_dispatched",
      );
      assert.strictEqual(
        Zotero.Reader.getByTabID(unloadedTab.id)?._window,
        mainWindow,
      );
    } finally {
      for (const attachmentItem of [attachment, epub, unloadedAttachment]) {
        const tabID = mainWindow?.Zotero_Tabs?.getTabIDByItemID?.(
          attachmentItem.id,
        );
        if (tabID) mainWindow.Zotero_Tabs.close(tabID);
      }
      await Zotero.Items.trashTx([
        item.id,
        attachment.id,
        epub.id,
        unloadedAttachment.id,
        annotation.id,
      ]);
      await collection.eraseTx();
      await search.eraseTx();
    }
  });
});

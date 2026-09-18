import { assert } from "chai";
import { config } from "../../../../package.json";
import gold from "../../../fixtures/zotero-e2e/lisongtao-v1.json";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";

type WorkbenchFrame = HTMLElement & { contentDocument?: Document };

async function waitUntil<Value>(
  read: () => Value | null | undefined,
  maxAttempts = 24_000,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const value = read();
    if (value) return value;
    await Zotero.Promise.delay(25);
  }
  throw new Error("e2e_condition_not_reached");
}

async function readGoldLibraryFacts() {
  const libraryId = Zotero.Libraries.userLibraryID;
  const itemTypes = (await Zotero.DB.queryAsync(
    `SELECT it.typeName AS typeName, COUNT(*) AS count
       FROM items i
       JOIN itemTypes it USING (itemTypeID)
       LEFT JOIN deletedItems d USING (itemID)
      WHERE i.libraryID = ? AND d.itemID IS NULL
        AND it.typeName IN ('journalArticle', 'thesis', 'conferencePaper', 'bookSection')
      GROUP BY it.typeName`,
    [libraryId],
  )) as Array<{ typeName: string; count: number }>;
  const scalar = (sql: string) => Zotero.DB.valueQueryAsync(sql, [libraryId]);
  return {
    itemTypes: Object.fromEntries(
      itemTypes.map((row) => [row.typeName, Number(row.count)]),
    ),
    attachments: Number(
      await scalar(
        "SELECT COUNT(*) FROM items i JOIN itemAttachments a USING (itemID) LEFT JOIN deletedItems d USING (itemID) WHERE i.libraryID = ? AND d.itemID IS NULL",
      ),
    ),
    notes: Number(
      await scalar(
        "SELECT COUNT(*) FROM items i JOIN itemNotes n USING (itemID) LEFT JOIN deletedItems d USING (itemID) WHERE i.libraryID = ? AND d.itemID IS NULL",
      ),
    ),
    collections: Number(
      await scalar(
        "SELECT COUNT(*) FROM collections WHERE libraryID = ? AND collectionID NOT IN (SELECT collectionID FROM deletedCollections)",
      ),
    ),
    tags: Number(
      await scalar(
        "SELECT COUNT(DISTINCT tagID) FROM itemTags JOIN items USING (itemID) WHERE libraryID = ?",
      ),
    ),
  };
}

describe("Synthesis E2E gold library", function () {
  this.timeout(900_000);

  before(function () {
    if (readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "HB-03") {
      this.skip();
    }
  });

  afterEach(async function () {
    const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
    await Promise.resolve(
      (mainWindow as any)?.Zotero_Tabs?.close?.("zotero-skills-workspace"),
    );
  });

  it("refreshes the Reference sidecar and opens the persisted Index projection", async function () {
    if (readDiagnosticsEnv("ZOTERO_E2E_GOLD_ID") === gold.id) {
      const facts = await readGoldLibraryFacts();
      assert.deepEqual(facts.itemTypes, gold.library.itemTypes);
      assert.equal(
        Object.values(facts.itemTypes).reduce((sum, count) => sum + count, 0),
        gold.library.topLevelItems,
      );
      assert.equal(facts.attachments, gold.library.attachments);
      assert.equal(facts.notes, gold.managedArtifacts.notes);
      assert.equal(facts.collections, gold.library.collections);
      assert.equal(facts.tags, gold.library.tags);
    }

    const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
    const plugin = (Zotero as any)[config.addonInstance];
    assert.isFunction(plugin?.hooks?.onPrefsEvent);
    await plugin.hooks.onPrefsEvent("openSynthesisWorkbench", {
      window: mainWindow,
    });
    const workspaceFrame = (await waitUntil(() =>
      mainWindow.document.querySelector<HTMLElement>(
        '[data-zs-role="workspace-frame"]',
      ),
    )) as WorkbenchFrame;
    const frame = (await waitUntil(() =>
      workspaceFrame.contentDocument?.querySelector<HTMLElement>(
        '[data-zs-role="synthesis-workbench-frame"]',
      ),
    )) as WorkbenchFrame;
    const indexTab = await waitUntil(() =>
      frame.contentDocument?.querySelector<HTMLButtonElement>(
        'button[data-synthesis-tab="registry"]',
      ),
    );
    indexTab.click();

    const refreshButton = await waitUntil(() =>
      frame.contentDocument?.querySelector<HTMLButtonElement>(
        'button[data-synthesis-command="refreshReferenceSidecarNow"]',
      ),
    );
    refreshButton.click();
    await waitUntil(() => refreshButton.getAttribute("aria-busy") === "true");
    await waitUntil(() => {
      const error = frame.contentDocument?.querySelector<HTMLElement>(
        '[data-synthesis-error-code="payload_stale"]',
      );
      if (error) throw new Error("reference_refresh_payload_stale");
      const status = frame.contentDocument
        ?.querySelector<HTMLElement>("[data-synthesis-reference-cache-status]")
        ?.getAttribute("data-synthesis-reference-cache-status");
      return refreshButton.getAttribute("aria-busy") !== "true" &&
        status === "ready"
        ? true
        : null;
    });

    assert.isOk(
      frame.contentDocument?.querySelector(
        '[data-region-content="synthesis-registry"]',
      ),
    );
    if (readDiagnosticsEnv("ZOTERO_E2E_GOLD_ID") === gold.id) {
      assert.isOk(
        frame.contentDocument?.querySelector(".registry-table tbody tr"),
      );
    }
  });
});

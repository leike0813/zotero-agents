// THROWAWAY: runs only in a fresh, disposable native Zotero profile.
declare const Zotero: any;
declare const window: any;

function evidence(name: string, facts: unknown) {
  window.debug({ spike: "issue39", version: Zotero.version, name, facts });
}
function check(value: unknown, message: string) {
  if (!value) throw new Error(message);
}

describe("Issue39 native API spike", function () {
  this.timeout(120000);
  it("tries window-owned cold Reader tab binding without replacing global window lookup", async function () {
    const root = Zotero.Prefs.get("issue39SpikeProjectRoot");
    const file =
      root +
      "/test/fixtures/selection-context/attachments/8BVUFWMZ/Zhang 等 - 2024 - Enhancing DETRs Variants through Improved Content Query and Similar Query Aggregation.pdf";
    const attachment = await Zotero.Attachments.importFromFile({
      file,
      title: "ISSUE39 SPIKE PDF",
      contentType: "application/pdf",
    });
    const first = Zotero.getMainWindow();
    Zotero.openMainWindow();
    let second: any;
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      second = Zotero.getMainWindows().find(
        (win: any) => win !== first && win.ZoteroPane?.itemsView,
      );
      if (second) break;
      await Zotero.Promise.delay(50);
    }
    check(second, "Second native main window must initialize");
    const focus = async (win: any) => {
      win.focus();
      const until = Date.now() + 3000;
      while (Zotero.getMainWindow() !== win && Date.now() < until)
        await Zotero.Promise.delay(20);
      check(
        Zotero.getMainWindow() === win,
        "Native window focus must be observable",
      );
    };
    const createOwned = () =>
      first.Zotero_Tabs.add({
        type:
          typeof first.Zotero_Tabs.parseTabType === "function"
            ? "reader-loading"
            : "reader-unloaded",
        title: "ISSUE39 SPIKE",
        data: { itemID: attachment.id },
        select: false,
      });
    const owned = createOwned();
    await focus(first);
    const reader = await Zotero.Reader.open(
      attachment.id,
      { pageIndex: 0 },
      { tabID: owned.id, allowDuplicate: true, openInBackground: true },
    );
    await reader._initPromise;
    first.Zotero_Tabs.markAsLoaded(owned.id);
    await reader.navigate({ pageIndex: 1 });
    evidence("owned-tab-cold-open", {
      windowMatches: reader._window === first,
      tabMatches: reader.tabID === owned.id,
      readerRegistered: Zotero.Reader.getByTabID(owned.id) === reader,
      otherWindowTab:
        second.Zotero_Tabs.getTabIDByItemID(attachment.id) || null,
    });
    check(
      reader._window === first && reader.tabID === owned.id,
      "Reader must initialize in the pre-created owned tab",
    );

    const raceTab = createOwned();
    await focus(first);
    const beforeCount = second.Zotero_Tabs.numTabs;
    let rejected = false;
    const library = Zotero.Libraries.get(attachment.libraryID);
    const originalWait = library.waitForDataLoad;
    let entered!: () => void;
    let release!: () => void;
    const enteredWait = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Instrument only the async seam, preserving its real work; no window resolver is replaced.
    library.waitForDataLoad = async function (...args: unknown[]) {
      await originalWait.apply(this, args);
      entered();
      await blocked;
    };
    try {
      const pending = Zotero.Reader.open(
        attachment.id,
        { pageIndex: 0 },
        { tabID: raceTab.id, allowDuplicate: true, openInBackground: true },
      );
      await enteredWait;
      await focus(second);
      release();
      await pending;
    } catch {
      rejected = true;
    } finally {
      release();
      library.waitForDataLoad = originalWait;
    }
    evidence("owned-tab-wrong-window", {
      changedDuringAwait: true,
      rejected,
      wrongWindowTabsAdded: second.Zotero_Tabs.numTabs - beforeCount,
      registered: !!Zotero.Reader.getByTabID(raceTab.id),
      ownedTabStillPresent:
        raceTab.container.isConnected &&
        raceTab.container.ownerDocument === first.document,
    });
    check(
      rejected &&
        second.Zotero_Tabs.numTabs === beforeCount &&
        !Zotero.Reader.getByTabID(raceTab.id),
      "Wrong-window binding must reject without opening a fallback tab",
    );
    // Only test-owned UI is closed; no production rollback strategy is implied.
    first.Zotero_Tabs.close(owned.id);
    first.Zotero_Tabs.close(raceTab.id);
    second.close();
  });
  it("measures Search SQL bounds and transaction serialization", async function () {
    const marker = `ISSUE39-SPIKE-${Date.now()}`;
    const libraryId = Zotero.Libraries.userLibraryID;
    await Zotero.DB.executeTransaction(async () => {
      for (let i = 0; i < 32; i++) {
        const item = new Zotero.Item("journalArticle");
        item.libraryID = libraryId;
        item.setField("title", marker);
        item.setField("DOI", `10.9999/issue39-${i}`);
        await item.save();
      }
    });
    const search = new Zotero.Search();
    search.libraryID = libraryId;
    search.addCondition("title", "is", marker);
    const sql = await search.getSQL();
    const params = await search.getSQLParams();
    const all = await search.search();
    const bounded = await Zotero.DB.columnQueryAsync(
      `SELECT itemID FROM (${sql}) LIMIT ?`,
      [...(params || []), 26],
    );
    evidence("bounded-native-search", {
      all: all.length,
      bounded: bounded.length,
      sql,
      params,
    });
    check(
      all.length === 32 && bounded.length === 26,
      "Search SQL must apply LIMIT at source",
    );
    const doiSearch = new Zotero.Search();
    doiSearch.libraryID = libraryId;
    doiSearch.addCondition("DOI", "contains", "10.9999/issue39-0");
    const doiSql = await doiSearch.getSQL();
    const doiParams = await doiSearch.getSQLParams();
    const combinedSql = `SELECT itemID FROM (${sql} UNION ${doiSql}) LIMIT ?`;
    const combinedParams = [...(params || []), ...(doiParams || []), 26];
    const combined = await Zotero.DB.columnQueryAsync(
      combinedSql,
      combinedParams,
    );
    evidence("bounded-union-native-search", {
      count: combined.length,
      unique: new Set(combined).size,
    });
    check(
      combined.length === 26 && new Set(combined).size === 26,
      "UNION must deduplicate before source LIMIT",
    );

    const serialMarker = marker + "-serial";
    const serialSearch = new Zotero.Search();
    serialSearch.libraryID = libraryId;
    serialSearch.addCondition("title", "is", serialMarker);
    const serialSql = await serialSearch.getSQL();
    const serialParams = await serialSearch.getSQLParams();
    const events: string[] = [];
    let entered!: () => void;
    const firstEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const run = (name: string) =>
      Zotero.DB.executeTransaction(async () => {
        events.push(name + ":entered");
        if (name === "A") entered();
        const ids = await Zotero.DB.columnQueryAsync(
          `SELECT itemID FROM (${serialSql}) LIMIT 2`,
          serialParams,
        );
        events.push(name + ":observed:" + ids.length);
        if (!ids.length) {
          // Widen the scheduling window deliberately: B is submitted while A awaits.
          await Zotero.Promise.delay(50);
          const item = new Zotero.Item("journalArticle");
          item.libraryID = libraryId;
          item.setField("title", serialMarker);
          await item.save();
          events.push(name + ":created");
        }
      }).then(() => {
        events.push(name + ":committed");
      });
    const first = run("A");
    await firstEntered;
    const second = run("B");
    await Promise.all([first, second]);
    const ids = await serialSearch.search();
    evidence("native-transaction-identity", { events, count: ids.length });
    check(
      ids.length === 1 && events.includes("B:observed:1"),
      "Competing transactions must not duplicate identity",
    );

    // Negative control: a transaction does not prevent unrelated save() from joining it.
    const intrusion: string[] = [];
    let intruded!: () => void;
    const intrusionDone = new Promise<void>((resolve) => {
      intruded = resolve;
    });
    const owner = Zotero.DB.executeTransaction(async () => {
      intrusion.push("owner:entered");
      setTimeout(async () => {
        const item = new Zotero.Item("journalArticle");
        item.libraryID = libraryId;
        item.setField("title", marker + "-intrusion");
        await item.save();
        intrusion.push("unowned-save:done");
        intruded();
      }, 0);
      await intrusionDone;
      intrusion.push("owner:leaving");
    });
    await owner;
    evidence("transaction-intrusion-negative-control", { intrusion });
  });
});

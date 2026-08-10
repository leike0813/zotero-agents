import { assert } from "chai";
import {
  appendRuntimeLog,
  clearRuntimeLogs,
  flushRuntimeLogsPersistence,
  getRuntimeLogPersistenceStateForTests,
  getRuntimeLogSummary,
  initializeRuntimeLogsPersistence,
  listRuntimeLogs,
  resetRuntimeLogHydrationForTests,
  setRuntimeLogPersistenceWriterForTests,
} from "../../src/modules/runtimeLogManager";
import {
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

function hasRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
    IOUtils?: { readUTF8?: unknown; writeUTF8?: unknown; move?: unknown };
  };
  return (
    !!runtime.Zotero &&
    runtime.Zotero.__parity?.runtime !== "node-mock" &&
    typeof runtime.IOUtils?.readUTF8 === "function" &&
    typeof runtime.IOUtils?.writeUTF8 === "function" &&
    typeof runtime.IOUtils?.move === "function"
  );
}

describe("runtime log persistence in Zotero", function () {
  before(function () {
    if (!hasRealZoteroRuntime()) {
      this.skip();
    }
  });

  it("hydrates, drains one writer, and atomically replaces a chunked JSON document", async function () {
    this.timeout(120000);
    const logPath = getRuntimeLogPersistenceStateForTests().path;
    const hadOriginal = await runtimePathExists(logPath);
    const original = hadOriginal ? await readRuntimeTextFile(logPath) : "";
    let releaseFirst: (() => void) | undefined;
    try {
      await writeRuntimeTextFile(
        logPath,
        JSON.stringify({
          entries: [
            {
              id: "log-1",
              ts: new Date().toISOString(),
              level: "info",
              scope: "system",
              schemaVersion: 1,
              diagnosticMode: false,
              stage: "zotero-hydration",
              message: "hydrated through IOUtils",
            },
            {
              id: "log-2",
              ts: new Date().toISOString(),
              level: "warn",
              scope: "system",
              schemaVersion: 1,
              diagnosticMode: false,
              stage: "zotero-hydration-warn",
              message: "hydrated warn through IOUtils",
            },
          ],
          droppedEntries: 0,
          droppedByReason: {
            entry_limit: 0,
            byte_budget: 0,
            expired: 0,
          },
        }),
      );
      resetRuntimeLogHydrationForTests();
      await initializeRuntimeLogsPersistence();
      assert.equal(listRuntimeLogs()[0]?.stage, "zotero-hydration");
      assert.deepEqual(
        listRuntimeLogs().map((entry) => entry.stage),
        ["zotero-hydration", "zotero-hydration-warn"],
      );
      assert.equal(getRuntimeLogSummary().importantEntryCount, 1);

      await clearRuntimeLogs();
      const documents: string[] = [];
      let active = 0;
      let maxActive = 0;
      let markFirstStarted!: () => void;
      const firstStarted = new Promise<void>((resolve) => {
        markFirstStarted = resolve;
      });
      const firstRelease = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      setRuntimeLogPersistenceWriterForTests(async ({ fragments }) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        if (documents.length === 0) {
          markFirstStarted();
          await firstRelease;
        }
        documents.push(Array.from(fragments).join(""));
        active -= 1;
      });
      appendRuntimeLog({
        level: "info",
        scope: "system",
        stage: "zotero-first-revision",
        message: "first",
      });
      const firstFlush = flushRuntimeLogsPersistence();
      await firstStarted;
      appendRuntimeLog({
        level: "warn",
        scope: "system",
        stage: "zotero-second-revision",
        message: "second",
      });
      const secondFlush = flushRuntimeLogsPersistence();
      releaseFirst?.();
      await Promise.all([firstFlush, secondFlush]);
      assert.equal(maxActive, 1);
      assert.equal(documents.length, 2);
      const orderedEntries = JSON.parse(documents[1]).entries as Array<{
        stage: string;
      }>;
      assert.deepEqual(
        orderedEntries.map((entry) => entry.stage),
        ["zotero-first-revision", "zotero-second-revision"],
      );

      setRuntimeLogPersistenceWriterForTests(null);
      await clearRuntimeLogs();
      const details = Array.from(
        { length: 90 },
        (_, index) => `zotero-${index}-${"x".repeat(4000)}`,
      );
      for (let index = 0; index < 16; index += 1) {
        appendRuntimeLog({
          level: "info",
          scope: "system",
          stage: `zotero-chunk-${index}`,
          message: `chunk ${index}`,
          details,
        });
      }
      await flushRuntimeLogsPersistence();
      const persisted = JSON.parse(await readRuntimeTextFile(logPath)) as {
        entries: Array<{ stage: string; details: string[] }>;
      };
      assert.lengthOf(persisted.entries, 16);
      assert.equal(persisted.entries[0].stage, "zotero-chunk-0");
      assert.include(persisted.entries[0].details[0], "zotero-0-");
      assert.isFalse(getRuntimeLogPersistenceStateForTests().dirty);
    } finally {
      releaseFirst?.();
      setRuntimeLogPersistenceWriterForTests(null);
      if (hadOriginal) {
        await writeRuntimeTextFile(logPath, original);
      } else {
        await removeRuntimePath(logPath);
      }
      resetRuntimeLogHydrationForTests();
      await initializeRuntimeLogsPersistence();
    }
  });
});

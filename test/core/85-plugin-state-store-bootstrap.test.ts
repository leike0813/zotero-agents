import { assert } from "chai";
import {
  getPluginStateMigrationStatus,
  inspectPluginStateStoreCounts,
  resetPluginStateStoreForTests,
  upsertPluginTaskRowEntry,
} from "../../src/modules/pluginStateStore";
import {
  getGuardedSqliteConnection,
  resetGuardedSqliteForTests,
} from "../../src/modules/guardedSqlite";
import { getPref, setPref } from "../../src/utils/prefs";

describe("plugin state store bootstrap", function () {
  beforeEach(function () {
    setPref("skillRunnerRequestLedgerJson", "");
    setPref("skillRunnerDeferredTasksJson", "");
    setPref("taskDashboardHistoryJson", "");
    resetPluginStateStoreForTests();
  });

  afterEach(function () {
    setPref("skillRunnerRequestLedgerJson", "");
    setPref("skillRunnerDeferredTasksJson", "");
    setPref("taskDashboardHistoryJson", "");
    resetPluginStateStoreForTests();
    resetGuardedSqliteForTests();
  });

  it("writes migration status in plugin_meta during initialization", function () {
    const status = getPluginStateMigrationStatus();
    assert.equal(status, "done");
  });

  it("drops legacy SkillRunner prefs instead of migrating old local rows", function () {
    setPref(
      "skillRunnerRequestLedgerJson",
      JSON.stringify([
        null,
        { requestId: "", backendId: "b1", snapshot: "running" },
        {
          requestId: "req-ok",
          backendId: "b1",
          snapshot: "running",
          updatedAt: "2026-03-16T00:00:00.000Z",
        },
      ]),
    );
    setPref(
      "skillRunnerDeferredTasksJson",
      JSON.stringify([
        { id: "", requestId: "", backendId: "b1", state: "running" },
        {
          id: "ctx-ok",
          requestId: "req-ok",
          backendId: "b1",
          state: "running",
        },
      ]),
    );
    setPref(
      "taskDashboardHistoryJson",
      JSON.stringify([
        { id: "", requestId: "req-ok", backendId: "b1", state: "failed" },
        {
          id: "task-ok",
          requestId: "req-ok",
          backendId: "b1",
          state: "failed",
        },
      ]),
    );
    resetPluginStateStoreForTests();

    assert.equal(getPluginStateMigrationStatus(), "done");
    const counts = inspectPluginStateStoreCounts();
    assert.equal(counts.requestCount, 0);
    assert.equal(counts.contextCount, 0);
    assert.equal(counts.rowCount, 0);
    assert.equal(String(getPref("skillRunnerRequestLedgerJson") || ""), "");
    assert.equal(String(getPref("skillRunnerDeferredTasksJson") || ""), "");
    assert.equal(String(getPref("taskDashboardHistoryJson") || ""), "");
  });

  it("reuses guarded connections and avoids nested BEGIN IMMEDIATE", function () {
    resetGuardedSqliteForTests();
    const opened: string[] = [];
    const sql: string[] = [];
    const storage = {
      openDatabase(file: { path?: string }) {
        opened.push(String(file.path || ""));
        return {
          createStatement() {
            throw new Error("unexpected statement");
          },
          executeSimpleSQL(value: string) {
            sql.push(value);
          },
        };
      },
    };

    const first = getGuardedSqliteConnection({
      dbPath: "C:\\Runtime\\state\\zotero-agents.db",
      file: { path: "first" },
      storage,
    });
    const second = getGuardedSqliteConnection({
      dbPath: "c:/runtime/state/zotero-agents.db",
      file: { path: "second" },
      storage,
    });
    getGuardedSqliteConnection({
      dbPath: "C:/Runtime/state/other.db",
      file: { path: "third" },
      storage,
    });

    first.transaction(() => {
      second.transaction(() => undefined);
    });

    assert.deepEqual(opened, ["first", "third"]);
    assert.equal(sql.filter((entry) => entry === "BEGIN IMMEDIATE").length, 1);
  });

  it("retries transient busy writes in plugin task rows", function () {
    const harness = installPluginStateStoreSqliteHarness({
      busyPluginTaskRowAttempts: 1,
    });
    try {
      upsertPluginTaskRowEntry("acp", "skill-runs", {
        taskId: "run-1",
        requestId: "run-1",
        backendId: "opencode",
        state: "queued",
        updatedAt: "2026-06-09T00:00:00.000Z",
        payload: "{}",
      });

      assert.equal(harness.pluginTaskRowExecuteAttempts, 2);
    } finally {
      harness.restore();
    }
  });

  it("preserves diagnostics when plugin task row busy persists", function () {
    const harness = installPluginStateStoreSqliteHarness({
      busyPluginTaskRowAttempts: 10,
    });
    try {
      assert.throws(
        () =>
          upsertPluginTaskRowEntry("acp", "skill-runs", {
            taskId: "run-1",
            requestId: "run-1",
            backendId: "opencode",
            state: "queued",
            updatedAt: "2026-06-09T00:00:00.000Z",
            payload: "{}",
          }),
        /storage execution failed.*NS_ERROR_STORAGE_BUSY/s,
      );
      assert.equal(harness.pluginTaskRowExecuteAttempts, 3);
    } finally {
      harness.restore();
    }
  });

  it("retries transient busy transaction begin", function () {
    const harness = installPluginStateStoreSqliteHarness({
      busyBeginAttempts: 1,
    });
    try {
      assert.equal(getPluginStateMigrationStatus(), "done");
      assert.equal(harness.beginAttempts, 2);
    } finally {
      harness.restore();
    }
  });
});

function createBusyError() {
  const error = new Error("Component returned failure code: 0x80630001");
  error.name = "NS_ERROR_STORAGE_BUSY";
  return error;
}

function installPluginStateStoreSqliteHarness(options: {
  busyPluginTaskRowAttempts?: number;
  busyBeginAttempts?: number;
}) {
  resetPluginStateStoreForTests();
  const runtime = globalThis as { Services?: unknown; Zotero?: any };
  const previousServices = runtime.Services;
  const previousPathToFile = runtime.Zotero?.File?.pathToFile;
  let metaDone = false;
  let pluginTaskRowExecuteAttempts = 0;
  let beginAttempts = 0;

  if (runtime.Zotero?.File) {
    runtime.Zotero.File.pathToFile = (filePath: string) => ({
      path: filePath,
      parent: { exists: () => true },
    });
  }
  runtime.Services = {
    storage: {
      openDatabase() {
        return {
          createStatement(sql: string) {
            return createStatementHarness(sql, {
              get metaDone() {
                return metaDone;
              },
              setMetaDone() {
                metaDone = true;
              },
              executePluginTaskRow() {
                pluginTaskRowExecuteAttempts += 1;
                if (
                  pluginTaskRowExecuteAttempts <=
                  (options.busyPluginTaskRowAttempts || 0)
                ) {
                  throw createBusyError();
                }
              },
            });
          },
          executeSimpleSQL(sql: string) {
            if (sql === "BEGIN IMMEDIATE") {
              beginAttempts += 1;
              if (beginAttempts <= (options.busyBeginAttempts || 0)) {
                throw createBusyError();
              }
            }
          },
        };
      },
    },
  };
  resetPluginStateStoreForTests();

  return {
    get pluginTaskRowExecuteAttempts() {
      return pluginTaskRowExecuteAttempts;
    },
    get beginAttempts() {
      return beginAttempts;
    },
    restore() {
      resetPluginStateStoreForTests();
      runtime.Services = previousServices;
      if (runtime.Zotero?.File && previousPathToFile) {
        runtime.Zotero.File.pathToFile = previousPathToFile;
      }
      resetPluginStateStoreForTests();
    },
  };
}

function createStatementHarness(
  sql: string,
  callbacks: {
    metaDone: boolean;
    setMetaDone: () => void;
    executePluginTaskRow: () => void;
  },
) {
  const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
  const rows = normalized.includes("select count(*) as value from plugin_meta")
    ? [{ value: 0 }]
    : normalized.includes("select value from plugin_meta") && callbacks.metaDone
      ? [{ value: "done" }]
      : [];
  let rowIndex = -1;
  let currentRow: Record<string, unknown> | null = null;
  return {
    params: {} as Record<string, unknown>,
    columnCount: rows.length > 0 ? Object.keys(rows[0]).length : 0,
    bindByIndex() {
      // Binding values is not needed for this storage behavior test.
    },
    execute() {
      if (normalized.startsWith("insert or replace into plugin_meta")) {
        callbacks.setMetaDone();
      }
      if (normalized.startsWith("insert or replace into plugin_task_rows")) {
        callbacks.executePluginTaskRow();
      }
    },
    executeStep() {
      rowIndex += 1;
      currentRow = rows[rowIndex] || null;
      return !!currentRow;
    },
    getColumnName(index: number) {
      return Object.keys(currentRow || rows[0] || {})[index] || "";
    },
    getTypeOfIndex(index: number) {
      const value = Object.values(currentRow || {})[index];
      if (value === null || typeof value === "undefined") {
        return 0;
      }
      return typeof value === "number" ? 1 : 3;
    },
    getInt64(index: number) {
      return Number(Object.values(currentRow || {})[index] || 0);
    },
    getDouble(index: number) {
      return Number(Object.values(currentRow || {})[index] || 0);
    },
    getUTF8String(index: number) {
      return String(Object.values(currentRow || {})[index] || "");
    },
    finalize() {
      // no-op
    },
  };
}

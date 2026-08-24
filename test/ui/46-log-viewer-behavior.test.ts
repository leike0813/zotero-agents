import { assert } from "chai";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import type { RuntimeLogEntry } from "../../src/modules/runtimeLogManager";
import {
  buildLogCopyPayload,
  createDefaultLogViewerLevelFilter,
  filterLogsByLevels,
} from "../../src/modules/runtimeLogManager";

function makeEntry(args: {
  id: string;
  level: RuntimeLogEntry["level"];
  scope?: RuntimeLogEntry["scope"];
  stage?: string;
  message?: string;
}): RuntimeLogEntry {
  return {
    id: args.id,
    ts: "2026-02-12T12:00:00.000Z",
    level: args.level,
    scope: args.scope || "system",
    schemaVersion: 1,
    diagnosticMode: false,
    stage: args.stage || "stage",
    message: args.message || "message",
  };
}

describe("log viewer behavior", function () {
  it("defaults to non-debug level visibility", function () {
    const filter = createDefaultLogViewerLevelFilter();
    assert.deepEqual(filter, {
      debug: false,
      info: true,
      warn: true,
      error: true,
    });
  });

  it("filters entries by selected levels", function () {
    const entries: RuntimeLogEntry[] = [
      makeEntry({ id: "1", level: "debug" }),
      makeEntry({ id: "2", level: "info" }),
      makeEntry({ id: "3", level: "warn" }),
      makeEntry({ id: "4", level: "error" }),
    ];
    const filtered = filterLogsByLevels(entries, {
      debug: false,
      info: false,
      warn: false,
      error: true,
    });
    assert.lengthOf(filtered, 1);
    assert.equal(filtered[0].id, "4");
  });

  it("uses pretty JSON array by default and supports NDJSON", function () {
    const entries: RuntimeLogEntry[] = [
      makeEntry({
        id: "1",
        level: "info",
        stage: "trigger-start",
        message: "started",
      }),
      makeEntry({
        id: "2",
        level: "error",
        stage: "apply-failed",
        message: "failed",
      }),
    ];

    const pretty = buildLogCopyPayload({
      entries,
    });
    assert.match(pretty, /^\[\s*\{/);
    assert.include(pretty, '"id": "1"');
    assert.include(pretty, '"id": "2"');

    const ndjson = buildLogCopyPayload({
      entries,
      format: "ndjson",
    });
    const lines = ndjson.split("\n");
    assert.lengthOf(lines, 2);
    assert.include(lines[0], '"id":"1"');
    assert.include(lines[1], '"id":"2"');
  });

  it("renders the important and total retention budgets in the Dashboard", async function () {
    const source = await readFile("addon/content/dashboard/app.js", "utf8");
    const dom = new JSDOM('<div id="app"></div>', {
      runScripts: "outside-only",
      url: "https://dashboard.invalid/",
    });
    try {
      dom.window.eval(source);
      dom.window.dispatchEvent(
        new dom.window.MessageEvent("message", {
          data: {
            type: "dashboard:init",
            payload: {
              selectedTabKey: "runtime-logs",
              title: "Runtime Logs",
              tabs: [{ key: "runtime-logs", label: "Runtime Logs" }],
              labels: {
                runtimeLogsTabTitle: "Runtime Logs",
                runtimeLogsBudget: "Budget: { $value }",
                runtimeLogsDiagnosticMode: "Diagnostic Mode",
                runtimeLogsClear: "Clear Logs",
                runtimeLogsCopySelected: "Copy Selected",
                runtimeLogsCopyVisibleNDJSON: "Copy Visible",
                runtimeLogsCopyDiagnosticBundle: "Copy Bundle",
                runtimeLogsCopyIssueSummary: "Copy Issue",
              },
              runtimeLogsView: {
                filters: { levels: ["info", "warn", "error"] },
                diagnosticMode: false,
                totalEntries: 37,
                budget: {
                  maxEntries: 2000,
                  maxBytes: 0,
                  estimatedBytes: 4096,
                  droppedEntries: 0,
                  droppedByReason: {
                    entry_limit: 0,
                    byte_budget: 0,
                    expired: 0,
                  },
                  retentionMode: "normal",
                  maxImportantEntries: 500,
                  importantEntryCount: 12,
                },
                logs: [],
                selectedEntryIds: [],
                filterOptions: { backends: [], workflows: [] },
              },
            },
          },
        }),
      );

      const budget = dom.window.document.querySelector(
        "[data-runtime-log-budget]",
      );
      assert.isOk(budget);
      assert.include(budget?.textContent || "", "warn/error 12/500");
      assert.include(budget?.textContent || "", "total 37/2000");
    } finally {
      dom.window.close();
    }
  });
});

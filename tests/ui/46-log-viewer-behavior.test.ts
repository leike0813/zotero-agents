import { assert } from "chai";
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
});

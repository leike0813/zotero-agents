import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  initializeCitationGraphCrashJournal,
  recordCitationGraphCrashJournalPhase,
} from "../../src/modules/synthesis/debug/citationGraphCrashJournal";
import { SYSTEM_E2E_EVENT_URL_PREF } from "../../src/modules/systemE2ETestRun";

describe("synthesis citation graph crash journal", function () {
  const runtime = globalThis as Record<string, unknown>;

  // The close-lifecycle System E2E case reads this journal as evidence, and a
  // calibration build is a production build with debug mode off, so the journal
  // has to follow the test run rather than the build mode.
  it("records a phase for a System E2E run while debug mode is off", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-crash-journal-"));
    const previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const previousZotero = Object.getOwnPropertyDescriptor(runtime, "Zotero");
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    setDebugModeOverrideForTests(false);
    Object.defineProperty(runtime, "Zotero", {
      configurable: true,
      writable: true,
      value: {
        Prefs: {
          get: (key: string) =>
            key === SYSTEM_E2E_EVENT_URL_PREF
              ? "http://127.0.0.1:1/system-e2e"
              : undefined,
        },
      },
    });
    try {
      await initializeCitationGraphCrashJournal();
      await recordCitationGraphCrashJournalPhase("sigma-renderer-created");

      const journalPath = path.join(
        getRuntimePersistencePaths().logsDir,
        "citation-graph-crash-journal.json",
      );
      const journal = await fs.readFile(journalPath, "utf8");

      assert.include(journal, "sigma-renderer-created");
    } finally {
      setDebugModeOverrideForTests(undefined);
      if (previousRoot === undefined) {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
      }
      if (previousZotero) {
        Object.defineProperty(runtime, "Zotero", previousZotero);
      } else {
        delete runtime.Zotero;
      }
    }
  });
});

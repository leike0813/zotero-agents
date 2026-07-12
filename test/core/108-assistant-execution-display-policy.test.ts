import { assert } from "chai";
import { config } from "../../package.json";
import { clearPref } from "../../src/utils/prefs";
import {
  canPublishAssistantWorkspaceUpdate,
  getAssistantExecutionDisplayMode,
  setAssistantExecutionDisplayMode,
  subscribeAssistantExecutionDisplayMode,
} from "../../src/modules/assistantExecutionDisplayPolicy";

describe("assistant execution display policy", function () {
  const modePref = `${config.prefsPrefix}.assistantExecutionDisplayMode`;
  const oldBooleanPref = `${config.prefsPrefix}.assistantStreamingRenderEnabled`;

  afterEach(function () {
    clearPref("assistantExecutionDisplayMode");
    Zotero.Prefs.set(oldBooleanPref, true, true);
  });

  for (const mode of ["live", "boundary", "silent"] as const) {
    it(`round-trips ${mode}`, function () {
      assert.equal(setAssistantExecutionDisplayMode(mode), mode);
      assert.equal(getAssistantExecutionDisplayMode(), mode);
    });
  }

  it("normalizes missing and invalid values through the old boolean", function () {
    for (const [raw, oldValue, expected] of [
      ["", true, "live"],
      ["unexpected", true, "live"],
      ["", false, "boundary"],
      ["unexpected", false, "boundary"],
    ] as const) {
      Zotero.Prefs.set(modePref, raw, true);
      Zotero.Prefs.set(oldBooleanPref, oldValue, true);
      assert.equal(getAssistantExecutionDisplayMode(), expected);
    }
  });

  it("ignores the old boolean after an explicit mode write", function () {
    setAssistantExecutionDisplayMode("silent");
    Zotero.Prefs.set(oldBooleanPref, false, true);
    assert.equal(getAssistantExecutionDisplayMode(), "silent");
  });

  it("notifies subscribers for external writes and deduplicates the setter observer", function () {
    const values: string[] = [];
    const unsubscribe = subscribeAssistantExecutionDisplayMode((mode) => {
      values.push(mode);
    });

    setAssistantExecutionDisplayMode("boundary");
    Zotero.Prefs.set(modePref, "silent", true);

    assert.deepEqual(values, ["live", "boundary", "silent"]);
    unsubscribe();
  });

  it("applies the publication matrix", function () {
    const expected = {
      live: [true, true, true, false],
      boundary: [true, true, false, false],
      silent: [true, false, false, false],
    } as const;
    const reasons = ["critical", "boundary", "live", "background"] as const;
    for (const mode of ["live", "boundary", "silent"] as const) {
      setAssistantExecutionDisplayMode(mode);
      assert.deepEqual(
        reasons.map(canPublishAssistantWorkspaceUpdate),
        expected[mode],
      );
    }
  });
});

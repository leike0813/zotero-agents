import { assert } from "chai";
import { config } from "../../package.json";
import {
  isAssistantStreamingRenderEnabled,
  setAssistantStreamingRenderEnabled,
  subscribeAssistantStreamingRenderPreference,
} from "../../src/modules/assistantStreamingRenderPreference";

describe("assistant streaming render preference", function () {
  afterEach(function () {
    setAssistantStreamingRenderEnabled(true);
  });

  it("notifies subscribers when the Zotero pref changes outside the setter", function () {
    const values: boolean[] = [];
    const unsubscribe = subscribeAssistantStreamingRenderPreference(
      (enabled) => {
        values.push(enabled);
      },
    );

    Zotero.Prefs.set(
      `${config.prefsPrefix}.assistantStreamingRenderEnabled`,
      false,
      true,
    );

    assert.deepEqual(values, [true, false]);
    assert.isFalse(isAssistantStreamingRenderEnabled());

    unsubscribe();
  });

  it("deduplicates setter notification when the pref observer fires synchronously", function () {
    const values: boolean[] = [];
    const unsubscribe = subscribeAssistantStreamingRenderPreference(
      (enabled) => {
        values.push(enabled);
      },
    );

    setAssistantStreamingRenderEnabled(false);

    assert.deepEqual(values, [true, false]);

    unsubscribe();
  });
});

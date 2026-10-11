import { assert } from "chai";
import { installAcpSessionManagerTestHooks } from "../helpers/acpSessionManagerHarness";
import {
  getPluginMetaValue,
  setPluginMetaValue,
} from "../../src/modules/pluginStateStore";
import {
  getAcpModelFavorites,
  setAcpModelFavorite,
  subscribeAcpModelFavorites,
} from "../../src/modules/acp/acpModelFavorites";

describe("ACP model favorites", function () {
  installAcpSessionManagerTestHooks();

  it("persists explicit backend-scoped choices and publishes only changes", function () {
    const changes: string[] = [];
    const unsubscribe = subscribeAcpModelFavorites((backendId) =>
      changes.push(backendId),
    );
    try {
      setAcpModelFavorite("backend-a", "opaque-model", true);
      setAcpModelFavorite("backend-a", "opaque-model", true);
      assert.deepEqual(
        [...getAcpModelFavorites("backend-a")],
        ["opaque-model"],
      );
      assert.isEmpty([...getAcpModelFavorites("backend-b")]);
      assert.include(
        getPluginMetaValue("acp-model-favorites:backend-a"),
        "opaque-model",
      );
      setAcpModelFavorite("backend-a", "opaque-model", false);
      assert.isEmpty([...getAcpModelFavorites("backend-a")]);
      assert.deepEqual(changes, ["backend-a", "backend-a"]);
    } finally {
      unsubscribe();
    }
  });

  it("recovers malformed records and retains favorites absent from a catalog", function () {
    setPluginMetaValue("acp-model-favorites:backend-a", "invalid-json");
    assert.isEmpty([...getAcpModelFavorites("backend-a")]);
    setPluginMetaValue(
      "acp-model-favorites:backend-a",
      JSON.stringify(["gone-model", "gone-model", 4]),
    );
    setAcpModelFavorite("backend-a", "new-model", true);
    assert.deepEqual(
      [...getAcpModelFavorites("backend-a")],
      ["gone-model", "new-model"],
    );
  });
});

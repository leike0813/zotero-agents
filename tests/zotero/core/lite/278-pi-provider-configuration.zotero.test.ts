import { assert } from "chai";
import "../../../runtime/242-pi-provider-configuration.test";
import {
  loadPiModelCatalog,
  normalizePiModelOverlay,
} from "../../../../src/modules/piModelCatalog";
import { getPref, setPref } from "../../../../src/utils/prefs";
import {
  deletePiCredential,
  putPiCredential,
  readPiCredential,
} from "../../../../src/modules/piCredentialStore";

describe("Pi configuration in real Zotero", function () {
  it("uses browser-safe catalog and encrypted profile credentials", async function () {
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const models = normalizePiModelOverlay(
      "providers:\n  local:\n    baseUrl: http://127.0.0.1:1234/v1\n    api: openai-completions\n    models:\n      - id: test\n        contextWindow: 1000\n        maxTokens: 100\n        input: [text]\n",
    );
    assert.equal(models[0].id, "test");
    const catalog = await loadPiModelCatalog();
    assert.isAbove(catalog.models.length, 0);
    assert.isNotEmpty(catalog.revision);
    const original = String(getPref("piCredentialEncryptedJson") || "");
    const id = `zotero-${Date.now()}`;
    try {
      await putPiCredential({
        id,
        label: "Fixture",
        material: { kind: "api-key", secret: "fixture-only" },
      });
      assert.notInclude(
        String(getPref("piCredentialEncryptedJson")),
        "fixture-only",
      );
      const result = await readPiCredential(id);
      assert.isTrue(result.ok);
    } finally {
      await deletePiCredential(id);
      setPref("piCredentialEncryptedJson", original);
    }
  });
});

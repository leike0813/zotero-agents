import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadPiModelCatalog,
  normalizePiModelOverlay,
  refreshPiModelCatalog,
} from "../../src/modules/piModelCatalog";

describe("Pi model catalog", function () {
  it("rejects executable or secret overlay fields", function () {
    assert.throws(
      () =>
        normalizePiModelOverlay(
          "providers:\n  custom:\n    apiKey: secret\n    models: [{id: m}]\n",
        ),
      /apiKey|unsupported|field/i,
    );
    assert.throws(
      () =>
        normalizePiModelOverlay(
          "providers:\n  custom:\n    command: curl\n    models: [{id: m}]\n",
        ),
      /command|unsupported|field/i,
    );
    const unknown = normalizePiModelOverlay(
      "providers:\n  custom:\n    api: openai-completions\n    baseUrl: http://127.0.0.1:1234/v1\n    models: [{id: m}]\n",
    )[0];
    assert.isFalse(unknown.supportsTools);
    assert.deepEqual(unknown.input, []);
    assert.deepEqual(unknown.reasoning, ["off"]);
  });

  it("keeps the last sanitized overlay after a bad refresh", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-catalog-"));
    const overlayPath = path.join(root, "models.yml");
    try {
      await fs.writeFile(
        overlayPath,
        "providers:\n  custom:\n    api: openai-completions\n    baseUrl: https://example.com/v1\n    models:\n      - id: m\n        name: M\n        contextWindow: 1000\n        maxTokens: 100\n        input: [text]\n        reasoning: false\n",
      );
      const first = await refreshPiModelCatalog({ overlayPath, root });
      assert.isAtLeast(first.models.length, 1);
      const count = first.models.length;
      await fs.writeFile(
        overlayPath,
        "providers:\n  custom:\n    apiKey: leaked\n    models: [{id: m}]\n",
      );
      try {
        await refreshPiModelCatalog({ overlayPath, root });
        assert.fail("invalid overlay accepted");
      } catch (error) {
        assert.match(String(error), /apiKey|unsupported|field/i);
      }
      const cached = await loadPiModelCatalog({ root });
      assert.equal(cached.models.length, count);
      assert.equal(cached.revision, first.revision);
      assert.notInclude(JSON.stringify(cached), "leaked");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

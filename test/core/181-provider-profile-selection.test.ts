import { assert } from "chai";
import { config } from "../../package.json";
import {
  listAcpModelOptionsForProvider,
  listAcpModelProviderOptions,
} from "../../src/modules/acpModelOptionFolding";
import { describeProviderProfile } from "../../src/providers/profile";
import { resetBackendsRegistryReadDiagnosticsForTests } from "../../src/backends/registry";

describe("provider profile ACP catalog projection", function () {
  const prefKey = `${config.prefsPrefix}.backendsConfigJson`;
  let previous: unknown;

  beforeEach(function () {
    previous = Zotero.Prefs.get(prefKey, true);
    resetBackendsRegistryReadDiagnosticsForTests();
  });

  afterEach(function () {
    if (typeof previous === "undefined") {
      Zotero.Prefs.clear(prefKey, true);
    } else {
      Zotero.Prefs.set(prefKey, previous, true);
    }
    resetBackendsRegistryReadDiagnosticsForTests();
  });

  it("keeps a 709-model cache grouped by provider and does not invent qwen3.7-plus", function () {
    const models = Array.from({ length: 709 }, (_, index) => ({
      id: `provider-${index % 5}/model-${index}`,
      label: `model-${index}`,
    }));
    const providers = listAcpModelProviderOptions(models);
    assert.deepEqual(providers, [
      "provider-0",
      "provider-1",
      "provider-2",
      "provider-3",
      "provider-4",
    ]);
    assert.lengthOf(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "provider-0",
      }),
      142,
    );
    assert.notInclude(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "provider-0",
      }),
      "qwen3.7-plus",
    );
  });

  it("marks stale and inconsistent ACP catalogs as non-ready", async function () {
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-k3-fixture",
            type: "acp",
            baseUrl: "local://acp-k3-fixture",
            command: "acp-fixture",
            auth: { kind: "none" },
            acp: {
              runtimeOptionsCache: {
                refreshedAt: "2020-01-01T00:00:00.000Z",
                displayModels: [
                  { id: "missing-provider/qwen3.7-plus", label: "qwen3.7-plus" },
                ],
                rawModels: [],
              },
            },
          },
        ],
      }),
      true,
    );
    const descriptor = await describeProviderProfile("acp-k3-fixture");
    assert.strictEqual(descriptor.catalog.state, "stale");
    assert.include(
      descriptor.catalog.diagnostics.map((entry) => entry.code),
      "runtime_catalog_inconsistent",
    );
  });
});

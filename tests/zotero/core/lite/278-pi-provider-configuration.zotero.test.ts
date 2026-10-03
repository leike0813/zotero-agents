import { assert } from "chai";
import "../../../runtime/242-pi-provider-configuration.test";
import {
  loadPiModelCatalog,
  normalizePiModelOverlay,
  refreshPiPublicModelCatalog,
  setPiModelCatalogAutoUpdate,
  shutdownPiModelCatalog,
} from "../../../../src/modules/piModelCatalog";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { joinPath } from "../../../../src/utils/path";
import { removeRuntimePath } from "../../../../src/modules/runtimePersistence";
import { readRuntimeEnv } from "../../../../src/platform/env";
import {
  resolvePiModelSelection,
  upsertPiProviderConfiguration,
} from "../../../../src/modules/piProviderConfiguration";
import { PI_RUNTIME_VERSION } from "../../../../src/config/piRuntimeBuild";
import {
  deletePiCredential,
  putPiCredential,
  readPiCredential,
} from "../../../../src/modules/piCredentialStore";

describe("Pi configuration in real Zotero", function () {
  it("adopts directory B with a fixed runtime while preserving directory A's active selection", async function () {
    const root = joinPath(
      Zotero.getTempDirectory().path,
      `pi-catalog-switch-${Date.now()}`,
    );
    const prior = String(getPref("piProviderConfigurationJson") || "");
    const model = {
      id: "fixture",
      name: "Fixture",
      api: "openai-responses",
      baseUrl: "https://example.com/v1",
      contextWindow: 32000,
      maxTokens: 2048,
      input: ["text"],
      supportsTools: true,
      reasoning: false,
      cost: { input: 2, output: 8, cacheRead: 1, cacheWrite: 4 },
    };
    const response = (revision: string, input: number) =>
      new Response(
        JSON.stringify({
          fixture: [{ ...model, cost: { ...model.cost, input } }],
        }),
        {
          headers: {
            "x-pi-model-catalog-revision": revision,
            "x-pi-model-catalog-minimum-version": PI_RUNTIME_VERSION,
          },
        },
      );
    try {
      setPref("piProviderConfigurationJson", "");
      await setPiModelCatalogAutoUpdate(false, { root });
      const a = await refreshPiPublicModelCatalog({
        root,
        fetch: async () => response("a", 2),
      });
      assert.equal(a.state?.status, "idle");
      upsertPiProviderConfiguration(
        {
          id: "directory-fixture",
          label: "Fixture",
          provider: "fixture",
          modelId: "fixture",
          authVariant: "api-key",
          credentialRef: "fixture-key",
          enabled: true,
        },
        a,
      );
      const args = {
        kind: "conversation" as const,
        explicit: { configurationId: "directory-fixture" },
        credentials: [{ id: "fixture-key", kind: "api-key" as const }],
      };
      const frozen = resolvePiModelSelection({ ...args, catalog: a });
      const b = await refreshPiPublicModelCatalog({
        root,
        fetch: async () => response("b", 3),
      });
      const next = resolvePiModelSelection({ ...args, catalog: b });
      assert.equal(next.runtimeVersion, frozen.runtimeVersion);
      assert.equal(next.bindingRevision, frozen.bindingRevision);
      assert.equal(frozen.metadata?.cost?.input, 2);
      assert.equal(next.metadata?.cost?.input, 3);
      assert.equal(next.baseUrl, frozen.baseUrl);
    } finally {
      setPref("piProviderConfigurationJson", prior);
      await shutdownPiModelCatalog({ root });
      await removeRuntimePath(root);
    }
  });

  it("reads the official catalog through the actual Zotero HTTP implementation", async function () {
    if (readRuntimeEnv("ZOTERO_PI_CATALOG_HTTP") !== "1") this.skip();
    this.timeout(45_000);
    const root = joinPath(
      Zotero.getTempDirectory().path,
      `pi-catalog-http-${Date.now()}`,
    );
    try {
      await setPiModelCatalogAutoUpdate(false, { root });
      const catalog = await refreshPiPublicModelCatalog({
        root,
        fetch: async (url, init) => {
          assert.equal(
            new URL(String(url)).searchParams.get("pi-version"),
            PI_RUNTIME_VERSION,
          );
          assert.isNull(new Headers(init?.headers).get("authorization"));
          return globalThis.fetch(url, init);
        },
      });
      assert.equal(catalog.state?.status, "idle", catalog.state?.error);
      assert.equal(catalog.state?.source, "current");
      assert.equal(catalog.state?.runtimeVersion, PI_RUNTIME_VERSION);
      assert.isNotEmpty(catalog.state?.revision || "");
      assert.isArray(catalog.models);
    } finally {
      await shutdownPiModelCatalog({ root });
      await removeRuntimePath(root);
    }
  });

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

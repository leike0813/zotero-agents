import { assert } from "chai";
import fs from "fs";
import path from "path";
import { createInProcessSynthesisClient } from "../../src/modules/synthesisClient/inProcessClient";
import {
  getFreshDefaultSynthesisClient,
  getDefaultSynthesisClient,
  invalidateDefaultSynthesisClient,
} from "../../src/modules/synthesisClient/defaultClient";
import {
  getDefaultLegacySynthesisServiceForTests,
  invalidateDefaultLegacySynthesisService,
} from "../../src/modules/synthesisClient/legacyComposition";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Synthesis lifecycle client consumers", function () {
  it("adapts lifecycle and protected maintenance commands", async function () {
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      reconcileSynthesisRuntimeWorkStateOnStartup() {
        return { canceledCount: 1, canceledOperationIds: ["operation-1"] };
      },
      async resetSynthesisDatabase(request) {
        assert.equal(request.confirmationText, "confirmed");
        return { ok: true, status: "reset", resetAt: "2026-07-15T00:00:00Z" };
      },
      async consumeRelatedItemsSyncEcho() {
        return null;
      },
    });

    assert.deepEqual(await client.system.reconcileRuntimeWorkOnStartup(), {
      canceledCount: 1,
      canceledOperationIds: ["operation-1"],
    });
    assert.deepEqual(
      await client.maintenance.resetDatabase({ confirmationText: "confirmed" }),
      { ok: true, status: "reset", resetAt: "2026-07-15T00:00:00Z" },
    );
  });

  it("reduces legacy notifier rows to bounded consumed receipts", async function () {
    let consumed = false;
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      reconcileSynthesisRuntimeWorkStateOnStartup() {
        return { canceledCount: 0, canceledOperationIds: [] };
      },
      async resetSynthesisDatabase() {
        return { ok: false, status: "confirmation_mismatch" };
      },
      async consumeRelatedItemsSyncEcho() {
        return consumed ? { repositoryRow: "must-not-cross" } : null;
      },
    });

    assert.deepEqual(
      await client.notifications.consumeRelatedItemsSyncEcho({
        libraryId: 1,
        itemKey: "AAAA1111",
      }),
      { consumed: false },
    );
    consumed = true;
    assert.deepEqual(
      await client.notifications.consumeRelatedItemsSyncEcho({
        libraryId: 1,
        itemKey: "AAAA1111",
      }),
      { consumed: true },
    );
  });

  it("invalidates the default client synchronously", async function () {
    const first = await getDefaultSynthesisClient();
    invalidateDefaultSynthesisClient();
    const second = await getDefaultSynthesisClient();

    assert.notStrictEqual(second, first);
    invalidateDefaultSynthesisClient();
  });

  it("fresh acquisition rebuilds a cached client and legacy service", async function () {
    invalidateDefaultSynthesisClient();
    invalidateDefaultLegacySynthesisService();
    const firstService = await getDefaultLegacySynthesisServiceForTests();
    const firstClient = await getDefaultSynthesisClient();

    const secondClient = await getFreshDefaultSynthesisClient();
    const secondService = await getDefaultLegacySynthesisServiceForTests();

    assert.notStrictEqual(secondClient, firstClient);
    assert.notStrictEqual(secondService, firstService);
    invalidateDefaultSynthesisClient();
  });

  it("fresh acquisition rebuilds the legacy service without a cached client", async function () {
    invalidateDefaultSynthesisClient();
    invalidateDefaultLegacySynthesisService();
    const firstService = await getDefaultLegacySynthesisServiceForTests();

    await getFreshDefaultSynthesisClient();
    const secondService = await getDefaultLegacySynthesisServiceForTests();

    assert.notStrictEqual(secondService, firstService);
    invalidateDefaultSynthesisClient();
  });

  it("removes full-service access from lifecycle and notification consumers", function () {
    for (const relativePath of [
      "src/hooks.ts",
      "src/modules/hostBridgeServer.ts",
      "src/modules/synthesis/itemObserver.ts",
    ]) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      assert.notMatch(source, /synthesis\/service["']/);
      assert.notMatch(
        source,
        /\b(?:getDefaultSynthesisService|invalidateDefaultSynthesisService|SynthesisService)\b/,
      );
    }
  });

  it("composes remote export delivery only in the production legacy root", function () {
    const legacyComposition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    const readonlyComposition = fs.readFileSync(
      path.join(ROOT, "src/modules/harness/synthesisReadonlyClient.ts"),
      "utf8",
    );
    assert.include(legacyComposition, "createSynthesisHostExportDeliveryPort");
    assert.include(legacyComposition, "hostExportDeliveryPort");
    assert.notInclude(readonlyComposition, "hostExportDeliveryPort");
  });

  it("injects the in-process Citation Graph engines in production composition", function () {
    const legacyComposition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );

    assert.include(
      legacyComposition,
      "createInProcessSynthesisCitationGraphLayoutEngine",
    );
    assert.include(legacyComposition, "citationGraphLayoutEngine");
    assert.include(
      legacyComposition,
      "createInProcessSynthesisCitationGraphMetricsEngine",
    );
    assert.include(legacyComposition, "citationGraphMetricsEngine");
    assert.include(
      legacyComposition,
      "createInProcessSynthesisCitationGraphBuildEngine",
    );
    assert.include(legacyComposition, "citationGraphBuildEngine");
    const readonlyComposition = fs.readFileSync(
      path.join(ROOT, "src/modules/harness/synthesisReadonlyClient.ts"),
      "utf8",
    );
    assert.include(
      readonlyComposition,
      "createInProcessSynthesisCitationGraphBuildEngine",
    );
    assert.include(readonlyComposition, "citationGraphBuildEngine");
  });

  it("composes Sync Host runtimes explicitly for production and readonly", function () {
    const legacyComposition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    const readonlyComposition = fs.readFileSync(
      path.join(ROOT, "src/modules/harness/synthesisReadonlyClient.ts"),
      "utf8",
    );
    assert.include(
      legacyComposition,
      "createPrefsConfiguredSynthesisWebDavSyncPort",
    );
    assert.include(legacyComposition, "hostWebDavSyncPort");
    assert.include(legacyComposition, "new AbortController()");
    assert.include(
      legacyComposition,
      "defaultLegacyServiceAbortController?.abort()",
    );
    assert.include(legacyComposition, "runtimeAbortSignal");
    assert.notInclude(legacyComposition, "onConfigurationChanged");
    assert.include(
      readonlyComposition,
      "createDisabledSynthesisHostWebDavSyncPort",
    );
  });
});

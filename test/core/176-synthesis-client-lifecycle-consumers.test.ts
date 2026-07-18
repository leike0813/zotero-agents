import { assert } from "chai";
import fs from "fs";
import path from "path";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src/index";
import { createInProcessSynthesisClient } from "../../src/modules/synthesisClient/inProcessClient";
import {
  getFreshDefaultSynthesisClient,
  getDefaultSynthesisClient,
  invalidateDefaultSynthesisClient,
  resetDefaultSynthesisClientForTests,
  shutdownDefaultSynthesisClient,
} from "../../src/modules/synthesisClient/defaultClient";
import {
  getDefaultLegacySynthesisServiceForTests,
  invalidateDefaultLegacySynthesisService,
} from "../../src/modules/synthesisClient/legacyComposition";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Synthesis lifecycle client consumers", function () {
  afterEach(async function () {
    await resetDefaultSynthesisClientForTests();
  });

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

  it("shares one default client across concurrent acquisition", async function () {
    const [first, second, third] = await Promise.all([
      getDefaultSynthesisClient(),
      getDefaultSynthesisClient(),
      getDefaultSynthesisClient(),
    ]);

    assert.strictEqual(second, first);
    assert.strictEqual(third, first);
  });

  it("fails an acquisition whose initialization generation was invalidated", async function () {
    const staleAcquisition = getDefaultSynthesisClient();
    invalidateDefaultSynthesisClient();

    let failure: unknown;
    try {
      await staleAcquisition;
    } catch (error) {
      failure = error;
    }

    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "unavailable");
    const current = await getDefaultSynthesisClient();
    assert.isObject(current);
  });

  it("keeps invalidated clients from recreating the legacy service", async function () {
    const client = await getDefaultSynthesisClient();
    const service = await getDefaultLegacySynthesisServiceForTests();
    invalidateDefaultSynthesisClient();

    let failure: unknown;
    try {
      await client.system.reconcileRuntimeWorkOnStartup();
    } catch (error) {
      failure = error;
    }

    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "unavailable");
    const replacement = await getDefaultLegacySynthesisServiceForTests();
    assert.notStrictEqual(replacement, service);
  });

  it("shuts down idempotently and reopens only through the test reset", async function () {
    const client = await getDefaultSynthesisClient();
    await Promise.all([
      shutdownDefaultSynthesisClient(),
      shutdownDefaultSynthesisClient(),
    ]);

    let shutdownFailure: unknown;
    try {
      await getDefaultSynthesisClient();
    } catch (error) {
      shutdownFailure = error;
    }
    assert.instanceOf(shutdownFailure, SynthesisClientError);
    assert.equal((shutdownFailure as SynthesisClientError).code, "unavailable");

    await resetDefaultSynthesisClientForTests();
    const reopened = await getDefaultSynthesisClient();
    assert.notStrictEqual(reopened, client);
  });

  it("waits for an initializing generation during shutdown", async function () {
    const acquisition = getDefaultSynthesisClient();
    const shutdown = shutdownDefaultSynthesisClient();

    const [acquisitionResult, shutdownResult] = await Promise.allSettled([
      acquisition,
      shutdown,
    ]);

    assert.equal(acquisitionResult.status, "rejected");
    if (acquisitionResult.status === "rejected") {
      assert.instanceOf(acquisitionResult.reason, SynthesisClientError);
      assert.equal(acquisitionResult.reason.code, "unavailable");
    }
    assert.equal(shutdownResult.status, "fulfilled");
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

  it("injects sidecar layout/metrics and in-process build engines in production composition", function () {
    const legacyComposition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );

    assert.include(
      legacyComposition,
      "createSynthesisSidecarCitationGraphLayoutEngine",
    );
    assert.include(legacyComposition, "citationGraphLayoutEngine");
    assert.include(
      legacyComposition,
      "createSynthesisSidecarCitationGraphMetricsEngine",
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
    assert.include(legacyComposition, "owner.abortController?.abort()");
    assert.include(legacyComposition, "runtimeAbortSignal");
    assert.notInclude(legacyComposition, "onConfigurationChanged");
    assert.include(
      readonlyComposition,
      "createDisabledSynthesisHostWebDavSyncPort",
    );
  });
});

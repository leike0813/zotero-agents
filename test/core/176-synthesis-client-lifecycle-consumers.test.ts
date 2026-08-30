import { assert } from "chai";
import fs from "fs";
import path from "path";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src/index";
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";
import {
  drainDefaultSynthesisClientGeneration,
  getFreshDefaultSynthesisClient,
  getDefaultSynthesisClient,
  invalidateDefaultSynthesisClient,
  resetDefaultSynthesisClientForTests,
  setDefaultSynthesisClientCompositionFactoryForTests,
  shutdownDefaultSynthesisClient,
} from "../../src/modules/synthesisClient/defaultClient";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import { createWorkflowSynthesisHostApi } from "../../src/modules/synthesisClient/workflowHostClient";
import { resolveWorkflowParameterOptionsSource } from "../../src/modules/workflowParameterOptions";
import {
  configureHostBridgeServerForTests,
  handleHostBridgeHttpRequestForTests,
  resetHostBridgeServerForTests,
} from "../../src/modules/hostBridgeServer";
import {
  handleZoteroMcpRequestForTests,
  resetZoteroMcpServerForTests,
} from "../../src/modules/zoteroMcpServer";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Synthesis lifecycle client consumers", function () {
  beforeEach(function () {
    setDefaultSynthesisClientCompositionFactoryForTests(() =>
      createNativeSynthesisClientComposition({
        getReadyConnection: () => ({
          discovery: {
            host: "127.0.0.1",
            port: 9134,
            profileId: "1".repeat(64),
            serviceInstanceId: "service-test",
          },
          clientToken: "client-token",
        }),
        rpcClient: {
          async call(args) {
            return args.rebuildResult({});
          },
        },
      }),
    );
  });

  afterEach(async function () {
    resetHostBridgeServerForTests();
    resetZoteroMcpServerForTests();
    await resetDefaultSynthesisClientForTests();
    setDefaultSynthesisClientCompositionFactoryForTests(null);
  });

  it("adapts lifecycle and protected maintenance commands", async function () {
    const client = createSynthesisClientFromPort({
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
    const client = createSynthesisClientFromPort({
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

  it("keeps invalidated clients from resolving another production owner", async function () {
    const client = await getDefaultSynthesisClient();
    invalidateDefaultSynthesisClient();

    let failure: unknown;
    try {
      await client.system.reconcileRuntimeWorkOnStartup();
    } catch (error) {
      failure = error;
    }

    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "unavailable");
    assert.notStrictEqual(await getDefaultSynthesisClient(), client);
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

  it("fresh acquisition rebuilds only the cached native client", async function () {
    invalidateDefaultSynthesisClient();
    const firstClient = await getDefaultSynthesisClient();

    const secondClient = await getFreshDefaultSynthesisClient();

    assert.notStrictEqual(secondClient, firstClient);
    invalidateDefaultSynthesisClient();
  });

  it("drains a cutover generation without entering terminal shutdown", async function () {
    const first = await getDefaultSynthesisClient();

    await drainDefaultSynthesisClientGeneration();

    const second = await getDefaultSynthesisClient();
    assert.notStrictEqual(second, first);
  });

  it("keeps the default production factory native-only", function () {
    const source = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/defaultClient.ts"),
      "utf8",
    );
    assert.include(source, "createReadyNativeSynthesisClientComposition");
    assert.notInclude(source, "legacyComposition");
    assert.notInclude(source, "createDefaultLegacySynthesisClientComposition");
  });

  it("routes workflow, Workbench, Host Bridge, and MCP-facing capabilities through the default client", function () {
    for (const relativePath of [
      "src/modules/synthesisClient/workflowHostClient.ts",
      "src/modules/synthesisWorkbenchTab.ts",
      "src/modules/workflowParameterOptions.ts",
      "src/modules/hostBridgeCapabilityRegistry.ts",
    ]) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      assert.include(source, "getDefaultSynthesisClient");
      assert.notInclude(source, "legacyComposition");
      assert.notInclude(source, "createSynthesisService");
    }
  });

  it("executes workflow options, Host Bridge, and MCP through one native service instance", async function () {
    const calls: Array<{
      capability: string;
      serviceInstanceId: string;
    }> = [];
    setDefaultSynthesisClientCompositionFactoryForTests(() =>
      createNativeSynthesisClientComposition({
        getReadyConnection: () => ({
          discovery: {
            host: "127.0.0.1",
            port: 9134,
            profileId: "1".repeat(64),
            serviceInstanceId: "native-production-1",
          },
          clientToken: "client-token",
        }),
        rpcClient: {
          async call(args) {
            calls.push({
              capability: args.capability,
              serviceInstanceId: args.connection.serviceInstanceId,
            });
            const data =
              args.capability === "client.listWorkflowTopicOptions"
                ? {
                    options: [
                      {
                        value: "topic-1",
                        label: "Topic 1",
                        description: "Semantic scope",
                        meta: {
                          kind: "synthesis.topic",
                          topicId: "topic-1",
                          title: "Topic 1",
                        },
                      },
                    ],
                    diagnostics: [],
                  }
                : args.capability === "client.getTopicReport"
                  ? {
                      ok: true,
                      status: "available",
                      topic_id: "topic-1",
                      format: "markdown",
                      markdown: "# Topic 1",
                      diagnostics: [],
                    }
                  : {
                      schema_id: "synthesis.topic_context",
                      schema_version: "2.0.0",
                      topic_id: "topic-1",
                      status: "not_found",
                      diagnostics: [],
                    };
            return args.rebuildResult(data);
          },
        },
      }),
    );

    const workflow = createWorkflowSynthesisHostApi({
      notifyChanged() {},
    });
    assert.deepEqual(await workflow.getTopicReport({ topicId: "topic-1" }), {
      ok: true,
      status: "available",
      topic_id: "topic-1",
      format: "markdown",
      markdown: "# Topic 1",
      diagnostics: [],
    });
    assert.lengthOf(
      (
        await resolveWorkflowParameterOptionsSource({
          kind: "synthesis.topics",
          filter: "",
        })
      ).options,
      1,
    );

    const token = configureHostBridgeServerForTests({
      token: "native-route-token",
    });
    const bridgeRaw = await handleHostBridgeHttpRequestForTests({
      method: "POST",
      path: "/bridge/v2/call",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        capability: "topics.get_context",
        input: { topicId: "topic-1", view: "full" },
      }),
    });
    assert.include(bridgeRaw, '"status":"ok"');

    const mcp = (await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "native-route",
      method: "tools/call",
      params: {
        name: "topics.get_context",
        arguments: { topicId: "topic-1", view: "full" },
      },
    })) as any;
    assert.equal(mcp.result.structuredContent.data.topic_id, "topic-1");
    assert.deepEqual(
      [...new Set(calls.map((call) => call.serviceInstanceId))],
      ["native-production-1"],
    );
    assert.includeMembers(
      calls.map((call) => call.capability),
      [
        "client.getTopicReport",
        "client.listWorkflowTopicOptions",
        "client.getTopicContext",
      ],
    );
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
});

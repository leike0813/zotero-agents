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
import { resolveWorkflowParameterOptionsSource } from "../../src/modules/workflow/settings/workflowParameterOptions";
import { buildWorkflowSettingsUiDescriptor } from "../../src/modules/workflow/settings/workflowSettings";
import {
  configureHostBridgeServerForTests,
  handleHostBridgeHttpRequestForTests,
  resetHostBridgeServerForTests,
} from "../../src/modules/hostBridge/server/hostBridgeServer";
import {
  handleZoteroMcpRequestForTests,
  resetZoteroMcpServerForTests,
} from "../../src/modules/hostBridge/mcp/zoteroMcpServer";
import { recordSynthesisZoteroItemNotifications } from "../../src/modules/synthesis/itemObserver";
import { loadWorkflowManifests } from "../../src/workflows/loader";

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

  for (const transition of ["fresh", "shutdown"] as const) {
    it(`drains an in-flight native generation during ${transition} without canceling its replacement`, async function () {
      let entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let observeCleanup!: () => void;
      const cleanupStarted = new Promise<void>((resolve) => {
        observeCleanup = resolve;
      });
      let releaseCleanup!: () => void;
      const cleanup = new Promise<void>((resolve) => {
        releaseCleanup = resolve;
      });
      let creations = 0;
      setDefaultSynthesisClientCompositionFactoryForTests(() => {
        const generation = ++creations;
        return createNativeSynthesisClientComposition({
          getReadyConnection: () => ({
            discovery: {
              host: "127.0.0.1",
              port: 9134,
              profileId: "1".repeat(64),
              serviceInstanceId: `generation-${generation}`,
            },
            clientToken: "token",
          }),
          rpcClient: {
            async call(args) {
              if (generation === 1) {
                const action = args.payload.action;
                if (action === "put_input_page") {
                  entered();
                  await gate;
                }
                if (action === "cancel") {
                  observeCleanup();
                  await cleanup;
                  return args.rebuildResult({ canceled: true });
                }
                return args.rebuildResult({
                  sessionId: "native-transfer:generation",
                  state: "receiving_input",
                  input: {
                    receivedPages: 0,
                    totalPages: 1,
                    stagedBytes: 900_000,
                  },
                  execution: { attempts: 0 },
                  stagedBytes: 900_000,
                  createdAtMs: 1,
                  lastActivityAtMs: 2,
                });
              }
              return args.rebuildResult({ options: [], diagnostics: [] });
            },
          },
        });
      });
      const first = await getDefaultSynthesisClient();
      const pending = first.workflowApply
        .applyTopicPlan({
          kind: "topic_plan",
          operation: "reconcile",
          base_graph_hash: `sha256:${"1".repeat(64)}`,
          library_index_hash: `sha256:${"2".repeat(64)}`,
          topic_actions: [],
          relation_proposals: [],
          coverage_manifest_path: "coverage/topic-plan.json",
          recommended_updates: Array.from(
            { length: 250 },
            (_, index) => `${index}:${"x".repeat(3990)}`,
          ),
        })
        .then(
          () => null,
          (error: unknown) => error,
        );
      try {
        await started;
        let transitioned = false;
        const transitionTask = (async () => {
          if (transition === "fresh") return getFreshDefaultSynthesisClient();
          await shutdownDefaultSynthesisClient();
          await resetDefaultSynthesisClientForTests();
          return getDefaultSynthesisClient();
        })().then((client) => {
          transitioned = true;
          return client;
        });
        await cleanupStarted;
        assert.isFalse(transitioned);
        assert.equal(creations, 1);
        releaseCleanup();
        const replacement = await transitionTask;
        const failure = await pending;
        assert.instanceOf(failure, SynthesisClientError);
        assert.equal(
          (failure as SynthesisClientError).details?.sidecarCode,
          "request_canceled",
        );
        release();
        await gate;
        assert.deepEqual(
          await replacement.topics.listWorkflowOptions({ filter: "all" }),
          {
            options: [],
            diagnostics: [],
          },
        );
        assert.equal(creations, 2);
      } finally {
        release();
        releaseCleanup();
      }
    });
  }

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
      "src/modules/synthesis/workbench/synthesisWorkbenchTab.ts",
      "src/modules/workflow/settings/workflowParameterOptions.ts",
      "src/modules/hostBridgeCapabilityRegistry.ts",
    ]) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      assert.include(source, "getDefaultSynthesisClient");
      assert.notInclude(source, "legacyComposition");
      assert.notInclude(source, "createSynthesisService");
    }
  });

  it("describes empty planned-topic options without claiming updatable topics", async function () {
    setDefaultSynthesisClientCompositionFactoryForTests(() =>
      createNativeSynthesisClientComposition({
        getReadyConnection: () => ({
          discovery: {
            host: "127.0.0.1",
            port: 9134,
            profileId: "1".repeat(64),
            serviceInstanceId: "planned-options-empty",
          },
          clientToken: "client-token",
        }),
        rpcClient: {
          async call(args) {
            if (args.capability === "client.listWorkflowTopicOptions") {
              return args.rebuildResult({ options: [], diagnostics: [] });
            }
            return args.rebuildResult({});
          },
        },
      }),
    );
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-search-ingest",
    );
    assert.isOk(workflow);

    const descriptor = await buildWorkflowSettingsUiDescriptor({
      workflow: {
        ...workflow!,
        manifest: {
          ...workflow!.manifest,
          parameters: {
            plannedTopicId: {
              type: "string",
              title: "Planned topic",
              allowCustom: false,
              optionsSource: {
                kind: "synthesis.topics",
                filter: "planned",
              },
            },
          },
        },
      } as any,
      candidateBackends: [
        {
          id: "acp-test",
          type: "acp",
          displayName: "ACP Test",
          baseUrl: "http://127.0.0.1",
        } as any,
      ],
      ignoreSavedSettings: true,
    });

    const entry = descriptor.workflowSchemaEntries[0];
    assert.isTrue(entry?.disabled);
    const messages = (entry?.diagnostics || [])
      .map((diagnostic) => String(diagnostic.message || diagnostic.code || ""))
      .join(" ");
    assert.include(messages, "No selectable options");
    assert.notInclude(messages.toLowerCase(), "updatable");
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
    assert.deepEqual(await workflow.topics.getReport({ topicId: "topic-1" }), {
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
      "src/modules/hostBridge/server/hostBridgeServer.ts",
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

  it("routes related-item echoes through the native composition with a strict request DTO", async function () {
    const requests: Array<{ capability: string; args: unknown[] }> = [];
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 9134,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-echo",
        },
        clientToken: "client-token",
      }),
      rpcClient: {
        async call(args) {
          requests.push({
            capability: args.capability,
            args: (args.payload as { args: unknown[] }).args,
          });
          return args.rebuildResult({ consumed: false });
        },
      },
    });

    await recordSynthesisZoteroItemNotifications({
      event: "modify",
      type: "item",
      ids: [900011],
      extraData: { 900011: { key: "ITEMAAAA", libraryID: 3 } },
      client: composition.client,
    });
    await recordSynthesisZoteroItemNotifications({
      event: "modify",
      type: "item",
      ids: [900012],
      extraData: {
        900012: {
          key: "ITEMBBBB",
          libraryID: 3,
          relatedItemKey: "PARENTBB",
        },
      },
      client: composition.client,
    });

    assert.deepEqual(
      requests.map((request) => request.capability),
      [
        "client.consumeRelatedItemsSyncEcho",
        "client.consumeRelatedItemsSyncEcho",
      ],
    );
    assert.deepEqual(requests[0].args[0], {
      libraryId: 3,
      itemKey: "ITEMAAAA",
    });
    assert.notProperty(requests[0].args[0] as object, "relatedItemKey");
    assert.deepEqual(requests[1].args[0], {
      libraryId: 3,
      itemKey: "ITEMBBBB",
      relatedItemKey: "PARENTBB",
    });
  });
});

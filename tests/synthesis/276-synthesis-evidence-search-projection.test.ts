import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020";
import { describe, it } from "mocha";
import {
  rebuildSynthesisEvidenceSearchRequest,
  rebuildSynthesisEvidenceSearchResult,
  rebuildSynthesisTopicSearchRequest,
  type SynthesisEvidenceSearchRequest,
  type SynthesisEvidenceSearchResult,
} from "../../packages/synthesis-contracts/src/search";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "../../src/modules/synthesisClient/clientPortAdapter";
import { createWorkflowSynthesisHostApi } from "../../src/modules/synthesisClient/workflowHostClient";
import {
  createNativeSynthesisClientComposition,
  createNativeSynthesisEvidenceRetrievalPort,
} from "../../src/modules/synthesisClient/nativeComposition";
import type { SynthesisClient } from "../../packages/synthesis-contracts/src/client";
import { executeHostBridgeCapability } from "../../src/modules/hostBridgeCapabilityRegistry";
import { handleZoteroMcpJsonRpc } from "../../src/modules/hostBridge/mcp/zoteroMcpProtocol";
import { getHostBridgeApprovalRequirement } from "../../src/modules/hostBridge/permissions/hostBridgePermissionManager";

const request: SynthesisEvidenceSearchRequest = { query: "fulltext evidence" };
describe("Synthesis search Unicode request bounds", function () {
  it("keeps Unicode evidence lengths separate from UTF-16 passage ranges", function () {
    const content = "\u{20000}".repeat(8192);
    const sourceVersion = "\u{20000}".repeat(256);
    const rebuilt = rebuildSynthesisEvidenceSearchResult({
      ...result,
      nextCursor: "\u{20000}".repeat(4096),
      hasMore: true,
      total: null,
      results: [
        {
          itemRef: { libraryId: 1, key: "ITEM1" },
          content,
          format: "text",
          source: { kind: "metadata", field: "title" },
          sourceVersion,
          location: {
            unit: "field",
            field: "title",
            range: { start: 0, end: content.length },
          },
          context: [],
        },
      ],
    });
    assert.equal(rebuilt.results[0].content, content);
    assert.equal(rebuilt.results[0].location.range.end, content.length);
  });
  it("uses the schema character bounds for both search producers", function () {
    const query = "😀".repeat(4096);
    for (const rebuild of [
      rebuildSynthesisEvidenceSearchRequest,
      rebuildSynthesisTopicSearchRequest,
    ]) {
      assert.equal(rebuild({ query, cursor: query }).query, query);
      assert.throws(() => rebuild({ query: query + "x" }));
    }
    assert.equal(
      rebuildSynthesisEvidenceSearchRequest({
        query: "fixture",
        tag: "\u{1f600}".repeat(256),
        itemType: "\u{1f600}".repeat(64),
      }).tag,
      "\u{1f600}".repeat(256),
    );
  });
});
const result: SynthesisEvidenceSearchResult = {
  results: [],
  status: "completed",
  method: "lexical",
  coverage: {
    kind: "library",
    sources: {
      metadata: { status: "complete", sourcesScanned: 0 },
      fulltext: { status: "complete", sourcesScanned: 0 },
      analysis: { status: "complete", sourcesScanned: 0 },
    },
  },
  issues: [],
  nextCursor: null,
  hasMore: false,
  total: 0,
};

describe("Synthesis evidence search projection", function () {
  it("rebuilds and forwards the grouped client request and result", async function () {
    let received: unknown;
    const client = createSynthesisClientFromPort({
      searchEvidence: async (input) => {
        received = input;
        return result;
      },
    } as SynthesisClientPort);

    const actual = await client.searchEvidence(request);

    assert.deepEqual(received, rebuildSynthesisEvidenceSearchRequest(request));
    assert.deepEqual(actual, rebuildSynthesisEvidenceSearchResult(result));
  });

  it("exposes an explicit Workflow Host projection to the grouped client", async function () {
    let received: unknown;
    const client = {
      searchEvidence: async (input: SynthesisEvidenceSearchRequest) => {
        received = input;
        return result;
      },
    } as SynthesisClient;
    const host = createWorkflowSynthesisHostApi({
      resolveClient: async () => client,
    });

    const actual = await host.searchEvidence(request);

    assert.deepEqual(received, rebuildSynthesisEvidenceSearchRequest(request));
    assert.deepEqual(actual, rebuildSynthesisEvidenceSearchResult(result));
  });

  it("routes the public operation through the native client catalog", async function () {
    const calls: Array<{ capability: string; payload: unknown }> = [];
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          calls.push({ capability: args.capability, payload: args.payload });
          return args.rebuildResult(result);
        },
      },
    });

    assert.deepEqual(
      await composition.client.searchEvidence(request),
      rebuildSynthesisEvidenceSearchResult(result),
    );
    assert.deepEqual(calls, [
      {
        capability: "client.searchEvidence",
        payload: { args: [request] },
      },
    ]);
  });

  it("exposes only evidence retrieval from native composition to private consumers", async function () {
    const calls: Array<{ capability: string; payload: unknown }> = [];
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          calls.push({ capability: args.capability, payload: args.payload });
          return args.rebuildResult(result);
        },
      },
    });

    assert.deepEqual(
      await composition.evidenceRetrieval.searchEvidence(request),
      rebuildSynthesisEvidenceSearchResult(result),
    );
    assert.deepEqual(calls, [
      {
        capability: "client.searchEvidence",
        payload: { args: [request] },
      },
    ]);
    assert.equal("client" in composition.evidenceRetrieval, false);
  });

  it("creates the private native evidence port without a public client", async function () {
    const calls: Array<{ capability: string; payload: unknown }> = [];
    const port = createNativeSynthesisEvidenceRetrievalPort({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          calls.push({ capability: args.capability, payload: args.payload });
          return args.rebuildResult(result);
        },
      },
    });

    assert.deepEqual(
      await port.searchEvidence(request),
      rebuildSynthesisEvidenceSearchResult(result),
    );
    assert.deepEqual(Object.keys(port), ["searchEvidence"]);
    assert.deepEqual(calls, [
      {
        capability: "client.searchEvidence",
        payload: { args: [request] },
      },
    ]);
  });

  it("executes evidence search through Host Bridge and advertises and calls the MCP mirror", async function () {
    const calls: SynthesisEvidenceSearchRequest[] = [];
    const client = createSynthesisClientFromPort({
      searchEvidence: async (input) => {
        calls.push(input);
        return result;
      },
    } as SynthesisClientPort);
    const context = {
      getStatus: () => ({}) as never,
      connectionMode: "remote" as const,
      resolveSynthesisClient: () => client,
    };

    const bridgeResult = await executeHostBridgeCapability(
      "synthesis.search_evidence",
      request,
      context,
    );
    const listed = (await handleZoteroMcpJsonRpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    })) as { result: { tools: Array<{ name: string; inputSchema: unknown }> } };
    const searchTool = listed.result.tools.find(
      (tool) => tool.name === "synthesis.search_evidence",
    );
    const mcpResult = (await handleZoteroMcpJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "synthesis.search_evidence", arguments: request },
      },
      context,
    )) as { result: { structuredContent: { data: unknown } } };

    assert.deepEqual(bridgeResult, result);
    assert.equal(
      getHostBridgeApprovalRequirement("synthesis.search_evidence"),
      "none",
    );
    assert.ok(searchTool);
    assert.equal((searchTool!.inputSchema as { type?: string }).type, "object");
    const validate = new Ajv2020({ strict: false }).compile(
      searchTool!.inputSchema as object,
    );
    assert.equal(validate(request), true);
    for (const invalid of [
      {},
      { ...request, limit: 0 },
      { ...request, limit: 101 },
    ]) {
      assert.equal(validate(invalid), false);
    }
    assert.deepEqual(mcpResult.result.structuredContent.data, result);
    assert.deepEqual(calls, [request, request]);
  });
});

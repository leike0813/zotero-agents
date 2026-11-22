import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import type { SynthesisClient } from "../../packages/synthesis-contracts/src/client";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src/common";
import { executeHostBridgeCapability } from "../../src/modules/hostBridgeCapabilityRegistry";
import { handleZoteroMcpJsonRpc } from "../../src/modules/hostBridge/mcp/zoteroMcpProtocol";
import { getHostBridgeApprovalRequirement } from "../../src/modules/hostBridge/permissions/hostBridgePermissionManager";

const searchRequest = {
  query: "semantic evidence",
  target: "paper",
  limit: 8,
};

const contextRequest = {
  evidenceRef: {
    publication: "publication-1",
    identity: "identity-1",
    fragmentId: "fragment-1",
    sourceVersion: "source-version-1",
  },
};

const evidenceResult = {
  status: "completed",
  method: "vector",
  results: [],
  coverage: { vector: "complete" },
  issues: [],
};

function clientWithSpies() {
  const calls: Array<{ method: string; request: unknown }> = [];
  const client = {
    async searchSemanticEvidence(request: unknown) {
      calls.push({ method: "searchSemanticEvidence", request });
      return evidenceResult;
    },
    async readSemanticContext(request: unknown) {
      calls.push({ method: "readSemanticContext", request });
      return evidenceResult;
    },
  } as unknown as SynthesisClient;
  return { calls, client };
}

function contextFor(client: SynthesisClient) {
  return {
    getStatus: () => ({}) as never,
    connectionMode: "remote" as const,
    resolveSynthesisClient: () => client,
  };
}

describe("Host Bridge semantic evidence projection", function () {
  this.timeout(30_000);

  it("routes semantic evidence search through the shared client", async function () {
    const { calls, client } = clientWithSpies();

    const result = await executeHostBridgeCapability(
      "synthesis.search_semantic_evidence",
      searchRequest,
      contextFor(client),
    );

    assert.deepEqual(result, evidenceResult);
    assert.deepEqual(calls, [
      { method: "searchSemanticEvidence", request: searchRequest },
    ]);
  });

  it("routes semantic evidence context through the shared client", async function () {
    const { calls, client } = clientWithSpies();

    const result = await executeHostBridgeCapability(
      "synthesis.read_semantic_context",
      contextRequest,
      contextFor(client),
    );

    assert.deepEqual(result, evidenceResult);
    assert.deepEqual(calls, [
      { method: "readSemanticContext", request: contextRequest },
    ]);
  });

  it("mirrors both operations as read-only MCP tools", async function () {
    const { calls, client } = clientWithSpies();
    const listed = (await handleZoteroMcpJsonRpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    })) as { result: { tools: Array<{ name: string }> } };
    const names = listed.result.tools.map((tool) => tool.name);
    assert.include(names, "synthesis.search_semantic_evidence");
    assert.include(names, "synthesis.read_semantic_context");
    for (const capability of [
      "synthesis.search_semantic_evidence",
      "synthesis.read_semantic_context",
    ]) {
      assert.equal(getHostBridgeApprovalRequirement(capability), "none");
    }

    const callsUnderTest: Array<[string, unknown]> = [
      ["synthesis.search_semantic_evidence", searchRequest],
      ["synthesis.read_semantic_context", contextRequest],
    ];
    for (const [name, request] of callsUnderTest) {
      const response = (await handleZoteroMcpJsonRpc(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name, arguments: request },
        },
        contextFor(client),
      )) as { result: { structuredContent: { data: unknown } } };
      assert.deepEqual(response.result.structuredContent.data, evidenceResult);
    }
    assert.deepEqual(calls, [
      { method: "searchSemanticEvidence", request: searchRequest },
      { method: "readSemanticContext", request: contextRequest },
    ]);
  });

  it("rejects out-of-bound semantic evidence arguments at the MCP boundary", async function () {
    const { calls, client } = clientWithSpies();
    const rejected = (await handleZoteroMcpJsonRpc(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "synthesis.search_semantic_evidence",
          arguments: { query: "semantic evidence", limit: 13 },
        },
      },
      contextFor(client),
    )) as { error?: { code?: number; message?: string } };

    assert.equal(rejected.error?.code, -32602);
    assert.include(
      String(rejected.error?.message),
      "Invalid arguments for synthesis.search_semantic_evidence",
    );
    assert.deepEqual(calls, []);
  });

  it("maps semantic search failures with the shared transient classification", async function () {
    const cases = [
      {
        code: "unavailable" as const,
        reason: "foreground_search_queue_full",
        retryable: true,
      },
      {
        code: "unavailable" as const,
        reason: "service_not_ready",
        retryable: true,
      },
      {
        code: "unavailable" as const,
        reason: "identity_mismatch",
        retryable: false,
      },
      {
        code: "invalid_request" as const,
        reason: "transport_unavailable",
        retryable: false,
      },
    ];
    let current = 0;
    const client = {
      async searchSemanticEvidence() {
        const failure = cases[current++]!;
        throw new SynthesisClientError(failure.code, "Semantic search failed", {
          reason: failure.reason,
          retryable: true,
        });
      },
      async readSemanticContext() {
        return evidenceResult;
      },
    } as unknown as SynthesisClient;

    for (const [index, failure] of cases.entries()) {
      const response: any = await handleZoteroMcpJsonRpc(
        {
          jsonrpc: "2.0",
          id: `semantic-retryability-${index}`,
          method: "tools/call",
          params: {
            name: "synthesis.search_semantic_evidence",
            arguments: searchRequest,
          },
        },
        contextFor(client),
      );

      assert.isTrue(response.result?.isError);
      assert.equal(
        response.result.structuredContent.reasonCode,
        failure.reason,
      );
      assert.equal(
        response.result.structuredContent.retryable,
        failure.retryable,
      );
    }
    assert.equal(current, cases.length);
  });

  it("publishes both CLI commands on the shared retrieval contract", function () {
    const root = process.cwd();
    const capabilities = JSON.parse(
      fs.readFileSync(
        path.join(root, "contracts/host-bridge/capabilities.v2.json"),
        "utf8",
      ),
    ).capabilities;
    const commands = JSON.parse(
      fs.readFileSync(
        path.join(root, "contracts/host-bridge/cli-commands.v2.json"),
        "utf8",
      ),
    ).commands;
    const retrievalPrefix =
      "https://zotero-agents.local/synthesis/sidecar-protocol/v1/retrieval.schema.json#/$defs/";

    for (const [capability, requestDefinition, resultDefinition] of [
      [
        "synthesis.search_semantic_evidence",
        "SemanticEvidenceSearchRequest",
        "SemanticEvidenceSearchResult",
      ],
      [
        "synthesis.read_semantic_context",
        "SemanticEvidenceContextRequest",
        "SemanticEvidenceContextResult",
      ],
    ]) {
      assert.equal(
        capabilities[capability].inputSchema.$ref,
        `${retrievalPrefix}${requestDefinition}`,
      );
      assert.equal(
        capabilities[capability].outputSchema.$ref,
        `${retrievalPrefix}${resultDefinition}`,
      );
      assert.equal(capabilities[capability].effect, "read");
      assert.equal(capabilities[capability].approval, "none");
      assert.equal(capabilities[capability].exposure.mcpMirror, true);
    }
    for (const [command, capability] of [
      [
        "synthesis evidence semantic-search",
        "synthesis.search_semantic_evidence",
      ],
      ["synthesis evidence context", "synthesis.read_semantic_context"],
    ]) {
      assert.equal(commands[command].target.capability, capability);
      assert.equal(commands[command].binding, "passthrough");
      assert.equal(commands[command].inputs.query.token, "--query");
      assert.equal(commands[command].inputs.query.required, true);
    }
  });
});

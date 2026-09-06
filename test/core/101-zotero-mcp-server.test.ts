import { assert } from "chai";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import {
  buildZoteroMcpRequestFailureResponseForTests,
  configureZoteroMcpServerForTests,
  getZoteroMcpHealthSnapshot,
  getZoteroMcpServerStatus,
  handleZoteroMcpHttpRequestForTests,
  handleZoteroMcpRequestForTests,
  markZoteroMcpServerDescriptorInjected,
  recordZoteroMcpResponseWriteFailureForTests,
  redactZoteroMcpServerDescriptor,
  resetZoteroMcpServerForTests,
  serializeZoteroMcpResponseForTests,
  type ZoteroMcpServerDescriptor,
} from "../../src/modules/zoteroMcpServer";
import {
  ZOTERO_MCP_TOOL_LIBRARY_INDEX_GET,
  ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_EXPORT_FILTERED,
  ZOTERO_MCP_TOOL_RESOLVERS_RESOLVE,
  ZOTERO_MCP_TOOL_TOPICS_LIST,
} from "../../src/modules/zoteroMcpProtocol";
import { runtimeHttpResponseInternalsForTests } from "../../src/modules/runtimeHttpResponse";
import {
  getRuntimePersistencePaths,
  removeRuntimePath,
  writeRuntimeBytes,
} from "../../src/modules/runtimePersistence";
import { joinPath } from "../../src/utils/path";
import { createCancellationController } from "../../src/utils/wait";
import type { ZoteroHostCanonicalMutationControl } from "../../src/modules/zoteroHostCapabilityBroker";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";

const ZOTERO_MCP_TOOL_GET_CURRENT_VIEW = "context.get_current_view";
const ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS = "context.get_selected_items";
const ZOTERO_MCP_TOOL_SEARCH_ITEMS = "library.search_items";
const ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS = "library.list_items";
const ZOTERO_MCP_TOOL_GET_ITEM_DETAIL = "library.get_item_detail";
const ZOTERO_MCP_TOOL_GET_ITEM_NOTES = "library.get_item_notes";
const ZOTERO_MCP_TOOL_GET_NOTE_DETAIL = "library.get_note_detail";
const ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS = "library.list_note_payloads";
const ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD = "library.get_note_payload";
const ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS = "library.get_item_attachments";
const ZOTERO_MCP_TOOL_GET_MCP_STATUS = "diagnostic.get_status";
const ZOTERO_MCP_TOOL_PREVIEW_MUTATION = "mutation.preview";
const ZOTERO_MCP_TOOL_EXECUTE_MUTATION = "mutation.execute";

const dynamicImport = new Function("specifier", "return import(specifier)") as <
  T = any,
>(
  specifier: string,
) => Promise<T>;

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: {
        runtime?: string;
      };
    };
  };
  return !!runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock";
}

function parseRawHttpResponse(raw: string) {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
  const lines = head.split("\r\n");
  const status = Number(lines[0]?.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return {
    status,
    headers,
    body,
  };
}

function parseJsonBody(raw: string) {
  return JSON.parse(parseRawHttpResponse(raw).body);
}

function toolText(response: any) {
  return String(response?.result?.content?.[0]?.text || "");
}

function assertNotCountOnlyToolText(text: string) {
  assert.notMatch(
    text.trim(),
    /^(Selected Zotero items|Found|Listed)\s+\d+\b[^.\n]*\.$/,
  );
}

function canonicalMutationControlForTests(
  args: {
    onPrepare?: (input: Record<string, unknown>) => void;
    onExecute?: (input: Record<string, unknown>) => Record<string, unknown>;
  } = {},
): ZoteroHostCanonicalMutationControl {
  const prepared = {};
  return {
    async prepare({ input, scope }) {
      assert.deepEqual(scope, { ownerId: "host-bridge" });
      args.onPrepare?.(input as Record<string, unknown>);
      return {
        state: "prepared",
        preview: {
          schema: "zotero-agents.mutation-preview.v1",
          operation: input.operation,
          outcome: "would_change",
          observedAt: "2026-09-06T00:00:00.000Z",
          domainPlanDigest: `test-plan:${input.operationId}`,
          plan: { operation: input.operation },
        },
        prepared,
      };
    },
    async execute({ input, scope, prepared: actualPrepared }) {
      assert.deepEqual(scope, { ownerId: "host-bridge" });
      assert.strictEqual(actualPrepared, prepared);
      return {
        outcome: "committed",
        receipt: {
          schema: "zotero-agents.mutation-receipt.v1",
          receiptId: `test-receipt:${input.operationId}`,
          operationId: input.operationId,
          operation: input.operation,
          outcome: "committed",
          committedAt: "2026-09-06T00:00:00.000Z",
          effectDigest: `test-effect:${input.operationId}`,
          changes: [],
        },
        result: args.onExecute?.(input as Record<string, unknown>) || {},
      };
    },
  } as unknown as ZoteroHostCanonicalMutationControl;
}

let mcpIngestCollection: Zotero.Collection | undefined;
let mcpMutationSequence = 0;

function mcpMutationOperationId(label: string) {
  mcpMutationSequence += 1;
  return `mcp-${label}-${Date.now().toString(36)}-${mcpMutationSequence}`;
}

async function mcpIngestCollectionRef() {
  const existing = mcpIngestCollection
    ? Zotero.Collections.getByLibraryAndKey(
        mcpIngestCollection.libraryID,
        mcpIngestCollection.key,
      )
    : undefined;
  if (!existing) {
    const collection = new Zotero.Collection();
    (collection as any).version = 1;
    collection.name = "MCP canonical ingest";
    (collection as any).libraryID = Zotero.Libraries.userLibraryID;
    await collection.saveTx();
    mcpIngestCollection = collection;
  } else {
    mcpIngestCollection = existing;
  }
  return {
    libraryId: mcpIngestCollection.libraryID,
    key: mcpIngestCollection.key,
  };
}

async function withMcpIngestIdentitySearch<T>(run: () => Promise<T>) {
  const previousSearch = (Zotero as any).Search;
  class IngestIdentitySearch {
    libraryID?: number;
    private condition?: [string, string, string];

    addCondition(field: string, operator: string, value: string) {
      this.condition = [field, operator, value];
    }

    async search() {
      const [field, operator, value] = this.condition || [];
      const expected = String(value || "")
        .trim()
        .toLowerCase();
      const items = await (Zotero.Items as any).getAll(this.libraryID);
      return items
        .filter((item: Zotero.Item) => {
          const actual = String(item.getField(field) || "")
            .trim()
            .toLowerCase();
          return operator === "contains"
            ? actual.includes(expected)
            : actual === expected;
        })
        .map((item: Zotero.Item) => item.id);
    }
  }
  (Zotero as any).Search = IngestIdentitySearch;
  try {
    return await run();
  } finally {
    (Zotero as any).Search = previousSearch;
  }
}

function canonicalIngestResult(response: unknown) {
  assert.property(
    response as Record<string, unknown>,
    "result",
    `expected canonical ingest result, received ${JSON.stringify(response)}`,
  );
  const data = (response as any).result.structuredContent.data;
  assert.include(["committed", "unchanged"], data.outcome);
  return data.result as {
    item: { ref: { libraryId: number; key: string }; title: string };
    itemOutcome: "created" | "existing";
    collectionOutcome: "added" | "already_present";
    enrichment: Array<{ kind: string; outcome: string; code?: string }>;
  };
}

function ingestEnrichment(
  result: ReturnType<typeof canonicalIngestResult>,
  kind: "pdf" | "landing",
) {
  return result.enrichment.find((entry) => entry.kind === kind);
}

async function readRequestBody(request: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function writeMcpTestResponse(request: any, response: any) {
  const body = await readRequestBody(request);
  const raw = await handleZoteroMcpHttpRequestForTests({
    method: request.method || "GET",
    path: request.url || "/",
    headers: request.headers as Record<string, unknown>,
    body,
  });
  const parsed = parseRawHttpResponse(raw);
  response.writeHead(parsed.status, parsed.headers);
  response.end(parsed.body);
}

async function createNodeMcpTestServer() {
  if (isRealZoteroRuntime()) {
    throw new Error("Node MCP test server is only available in Node tests");
  }
  const { createServer } =
    await dynamicImport<typeof import("node:http")>("node:http");
  return createServer((request, response) => {
    void writeMcpTestResponse(request, response).catch((error) => {
      response.writeHead(500, { "content-type": "text/plain" });
      response.end(error instanceof Error ? error.message : String(error));
    });
  });
}

async function createMcpSdkClient(args: {
  name: string;
  url: URL;
  token: string;
  authProvider?: unknown;
}) {
  if (isRealZoteroRuntime()) {
    throw new Error("MCP SDK client is only available in Node tests");
  }
  const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
    dynamicImport<typeof import("@modelcontextprotocol/sdk/client/index.js")>(
      "@modelcontextprotocol/sdk/client/index.js",
    ),
    dynamicImport<
      typeof import("@modelcontextprotocol/sdk/client/streamableHttp.js")
    >("@modelcontextprotocol/sdk/client/streamableHttp.js"),
  ]);
  const client = new Client({
    name: args.name,
    version: "0.0.0",
  });
  const transport = new StreamableHTTPClientTransport(args.url, {
    authProvider: args.authProvider as any,
    requestInit: {
      headers: {
        Authorization: `Bearer ${args.token}`,
      },
    },
  });
  return {
    client,
    transport,
  };
}

describe("embedded Zotero MCP server protocol", function () {
  const temporaryRuntimeFiles: string[] = [];

  afterEach(async function () {
    resetZoteroMcpServerForTests();
    clearRuntimeLogs();
    await Promise.all(
      temporaryRuntimeFiles.splice(0).map((path) => removeRuntimePath(path)),
    );
  });

  it("responds to initialize with tool capability", async function () {
    const response = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });

    assert.deepInclude(response, {
      jsonrpc: "2.0",
      id: 1,
    });
    assert.propertyVal(
      (response as any).result,
      "protocolVersion",
      "2025-06-18",
    );
    assert.deepEqual((response as any).result.capabilities, {
      tools: {},
    });
  });

  it("echoes requested MCP protocol version during initialize", async function () {
    const response = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
      },
    });

    assert.propertyVal(
      (response as any).result,
      "protocolVersion",
      "2025-11-25",
    );
  });

  it("records initialize response shape for diagnostics", async function () {
    const token = configureZoteroMcpServerForTests();
    runtimeHttpResponseInternalsForTests.resetMetrics();
    await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "0",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
        },
      }),
    });

    const [entry] = getZoteroMcpServerStatus().recentRequests;
    assert.strictEqual(entry.jsonrpcMethod, "initialize");
    assert.strictEqual(entry.protocolVersion, "2025-11-25");
    assert.strictEqual(entry.responseJsonrpc, "2.0");
    assert.strictEqual(entry.responseJsonrpcId, "0");
    assert.strictEqual(entry.responseProtocolVersion, "2025-11-25");
    assert.strictEqual(
      entry.responseContentType,
      "application/json; charset=utf-8",
    );
    assert.isAbove(entry.responseBodyLength, 0);
    assert.deepEqual(runtimeHttpResponseInternalsForTests.getMetrics(), {
      jsonSerializations: 1,
      bodyEncodes: 1,
      maxWriteChunkBytes: 0,
    });
  });

  it("derives host-side MCP health from server and client activity", async function () {
    const token = configureZoteroMcpServerForTests();
    let health = getZoteroMcpHealthSnapshot();
    assert.strictEqual(health.state, "listening");
    assert.strictEqual(health.severity, "ok");
    assert.isFalse(health.clientHandshakeSeen);

    markZoteroMcpServerDescriptorInjected();
    health = getZoteroMcpHealthSnapshot();
    assert.strictEqual(health.state, "injected");
    assert.isTrue(health.descriptorInjected);

    await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "0",
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
        },
      }),
    });
    health = getZoteroMcpHealthSnapshot();
    assert.strictEqual(health.state, "handshake_seen");
    assert.isTrue(health.clientHandshakeSeen);

    await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "tools",
        method: "tools/list",
      }),
    });
    health = getZoteroMcpHealthSnapshot();
    assert.strictEqual(health.state, "tools_seen");
    assert.isTrue(health.toolsListSeen);
    assert.include(health.tooltip.join("\n"), "tools_seen");
  });

  it("keeps MCP health green after a structured tool request failure", async function () {
    const token = configureZoteroMcpServerForTests();
    await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "bad-tool",
        method: "tools/call",
        params: {
          name: "no_such_tool",
          arguments: {},
        },
      }),
    });

    const health = getZoteroMcpHealthSnapshot();
    assert.strictEqual(health.state, "listening");
    assert.strictEqual(health.severity, "ok");
    assert.isTrue(health.toolCallSeen);
    assert.match(health.lastError, /Unknown Zotero MCP tool|no_such_tool/);
    assert.include(health.tooltip.join("\n"), "lastRequestFailure=tools/call");
  });

  it("keeps MCP health green while a tool call is running", async function () {
    configureZoteroMcpServerForTests();
    const pending = handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "slow-current-view",
      method: "tools/call",
      params: {
        name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
        arguments: {},
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    const health = getZoteroMcpHealthSnapshot();
    assert.strictEqual(health.state, "listening");
    assert.strictEqual(health.severity, "ok");
    await pending;
  });

  it("lists context.get_current_view without duplicating the zotero MCP server name", async function () {
    const response = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list",
    });

    const tools = (response as any).result.tools;
    assert.isArray(tools);
    assert.strictEqual(tools[0].name, ZOTERO_MCP_TOOL_GET_CURRENT_VIEW);
    assert.deepEqual(tools[0].inputSchema, {
      type: "object",
      properties: {},
      additionalProperties: false,
    });
  });

  it("lists the formal Zotero MCP tool suite from the registry", async function () {
    const response = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list",
    });

    const toolNames = (response as any).result.tools.map(
      (tool: { name: string }) => tool.name,
    );
    assert.includeMembers(toolNames, [
      ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
      ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS,
      ZOTERO_MCP_TOOL_SEARCH_ITEMS,
      ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
      ZOTERO_MCP_TOOL_GET_ITEM_DETAIL,
      ZOTERO_MCP_TOOL_GET_ITEM_NOTES,
      ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
      ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS,
      ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
      ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
      ZOTERO_MCP_TOOL_GET_MCP_STATUS,
      ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
      ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
    ]);
    assert.notIncludeMembers(toolNames, [
      "get_current_view",
      "get_selected_items",
      "search_items",
      "list_library_items",
      "prepare_paper_reading_context",
      "preview_mutation",
      "add_item_tags",
      "create_markdown_note",
      "update_markdown_note",
      "ingest_paper",
      "ingest_papers",
    ]);
    assert.isFalse(
      toolNames.some((name: string) => name.startsWith("zotero.")),
      "tool names should be scoped by the MCP server name, not a zotero. prefix",
    );
    for (const tool of (response as any).result.tools) {
      assert.strictEqual(tool.inputSchema.type, "object");
      assert.isString(tool.description);
      assert.isNotEmpty(tool.description);
    }
    const executeMutation = (response as any).result.tools.find(
      (tool: { name: string }) =>
        tool.name === ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
    );
    assert.include(
      executeMutation.description,
      "Execute a supported Zotero mutation",
    );
    assert.include(executeMutation.description, "verify state");
    assert.strictEqual(executeMutation.inputSchema.type, "object");
    assert.isObject(executeMutation.inputSchema.$defs);
    assert.isArray(executeMutation.inputSchema.oneOf);
    assert.isAbove(executeMutation.inputSchema.oneOf.length, 1);
    const listItems = (response as any).result.tools.find(
      (tool: { name: string }) =>
        tool.name === ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
    );
    assert.include(
      listItems.description,
      "compact parent Zotero library item summaries",
    );
    assert.include(
      listItems.description,
      "Up to nine ordinary tool requests may be in flight",
    );
    const noteDetail = (response as any).result.tools.find(
      (tool: { name: string }) => tool.name === ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
    );
    assert.include(noteDetail.description, "bounded chunks");
    const notePayload = (response as any).result.tools.find(
      (tool: { name: string }) =>
        tool.name === ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
    );
    assert.include(notePayload.description, "Decode one workflow payload");
    assert.deepEqual(executeMutation.inputSchema.required, ["operationId"]);
  });

  it("accepts MCP initialized notification without returning an error", async function () {
    const response = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    assert.isNull(response);
  });

  it("rejects null JSON-RPC ids instead of treating them as notifications", async function () {
    const response: any = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: null,
      method: "tools/list",
    });

    assert.strictEqual(response.error.code, -32600);
    assert.match(response.error.message, /id/i);
  });

  it("rejects tool calls with unknown or invalid typed arguments before handlers run", async function () {
    let called = false;
    const unknown: any = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "schema-unknown",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {
            unexpected: true,
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () => {
          called = true;
          return createFailClosedZoteroHostCapabilityBroker({
            context: {
              getCurrentView: () => ({
                target: "library",
                libraryIds: [1],
                selectionEmpty: true,
                selectedSources: [],
              }),
            },
          });
        },
      },
    );
    const wrongType: any = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "schema-type",
      method: "tools/call",
      params: {
        name: ZOTERO_MCP_TOOL_SEARCH_ITEMS,
        arguments: {
          query: 123,
        },
      },
    });

    assert.isFalse(called);
    assert.strictEqual(unknown.error.code, -32602);
    assert.match(unknown.error.message, /unknown|additional/i);
    assert.strictEqual(wrongType.error.code, -32602);
    assert.match(wrongType.error.message, /query/i);
  });

  it("returns 202 with no body for Streamable HTTP notifications", async function () {
    const token = configureZoteroMcpServerForTests();
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });
    const response = parseRawHttpResponse(raw);

    assert.strictEqual(response.status, 202);
    assert.strictEqual(response.body, "");
  });

  it("rejects GET /mcp because the server is Streamable HTTP POST-only", async function () {
    const token = configureZoteroMcpServerForTests();
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "GET",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "text/event-stream",
      },
    });
    const response = parseRawHttpResponse(raw);

    assert.strictEqual(response.status, 405);
    assert.include(response.body, "streamable_http_get_not_supported");
    const status = getZoteroMcpServerStatus();
    assert.strictEqual(status.lastResponseStatus, 405);
    assert.strictEqual(
      status.recentRequests[0].error,
      "streamable_http_get_not_supported",
    );
  });

  it("rejects query-token authentication for MCP POST requests", async function () {
    const token = configureZoteroMcpServerForTests();
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: `/mcp?token=${encodeURIComponent(token)}`,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "query-token",
        method: "tools/list",
      }),
    });
    const response = parseRawHttpResponse(raw);

    assert.strictEqual(response.status, 401);
    assert.include(response.body, "unauthorized");
  });

  it("rejects untrusted Origin headers before JSON-RPC handling", async function () {
    const token = configureZoteroMcpServerForTests();
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "origin",
        method: "tools/list",
      }),
    });
    const response = parseRawHttpResponse(raw);

    assert.strictEqual(response.status, 403);
    assert.include(response.body, "origin_not_allowed");
  });

  it("rejects oversized MCP HTTP request bodies", async function () {
    const token = configureZoteroMcpServerForTests();
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "x".repeat(2 * 1024 * 1024),
    });
    const response = parseRawHttpResponse(raw);

    assert.strictEqual(response.status, 413);
    assert.include(response.body, "request_body_too_large");
  });

  it("returns a structured bad request for malformed query encoding", async function () {
    const token = configureZoteroMcpServerForTests();
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp?bad=%E0%A4%A",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "bad-query",
        method: "tools/list",
      }),
    });
    const response = parseRawHttpResponse(raw);

    assert.strictEqual(response.status, 400);
    assert.include(response.body, "bad_request");
  });

  it("rejects the legacy SSE message endpoint", async function () {
    const token = configureZoteroMcpServerForTests();
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: `/mcp/message?token=${encodeURIComponent(token)}`,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "0",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
        },
      }),
    });
    const response = parseRawHttpResponse(raw);
    const [entry] = getZoteroMcpServerStatus().recentRequests;

    assert.strictEqual(response.status, 404);
    assert.include(response.body, "not_found");
    assert.strictEqual(entry.path, "/mcp/message?token=<redacted>");
    assert.strictEqual(entry.status, 404);
    assert.strictEqual(entry.error, "not_found");
  });

  it("handles JSON-RPC batches and drops notification responses", async function () {
    const response = await handleZoteroMcpRequestForTests([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      },
      {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      },
    ]);

    assert.isArray(response);
    assert.lengthOf(response as unknown[], 1);
    assert.strictEqual((response as any[])[0].id, 1);
  });

  it("calls get_current_view and returns structured host context", async function () {
    let observedTool = "";
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            context: {
              getCurrentView: () => ({
                target: "library",
                libraryId: 1,
                libraryIds: [1],
                selectionEmpty: false,
                currentItem: {
                  ref: { libraryId: 1, key: "ABCD1234" },
                  title: "A Zotero Paper",
                },
                selectedSources: [],
              }),
            },
          }),
        onToolCall: (event) => {
          observedTool = event.toolName;
        },
      },
    );

    assert.strictEqual(observedTool, ZOTERO_MCP_TOOL_GET_CURRENT_VIEW);
    assert.strictEqual(
      (response as any).result.structuredContent.data.currentItem.title,
      "A Zotero Paper",
    );
    assert.include((response as any).result.content[0].text, "libraryId=1");
  });

  it("preserves plural library identity in current-view MCP output", async function () {
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "plural-current-view",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            context: {
              getCurrentView: () => ({
                target: "library",
                libraryIds: [1, 2],
                selectionEmpty: true,
                selectedSources: [
                  { kind: "library", libraryId: 1 },
                  { kind: "library", libraryId: 2 },
                ],
              }),
            },
          }),
      },
    );

    const result = (response as any).result;
    assert.deepEqual(result.structuredContent.data.libraryIds, [1, 2]);
    assert.notProperty(result.structuredContent.data, "libraryId");
    assert.include(result.content[0].text, "libraryIds=1,2");
  });

  it("routes read tools through the capability broker and returns structured content", async function () {
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "selected",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS,
          arguments: {},
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            context: {
              getSelectedItems: async () => ({
                items: [
                  {
                    ref: { libraryId: 1, key: "READTOOL1" },
                    itemType: "journalArticle",
                    title: "Read Tool Paper",
                  },
                ],
                returned: 1,
                total: 1,
                hasMore: false,
                nextCursor: null,
              }),
            },
          }),
      },
    );

    assert.strictEqual(
      (response as any).result.structuredContent.data.items[0].ref.key,
      "READTOOL1",
    );
    assert.deepInclude((response as any).result.structuredContent.data, {
      nextCursor: null,
      hasMore: false,
      returned: 1,
      total: 1,
    });
    const text = toolText(response);
    assert.include(text, "READTOOL1");
    assert.include(text, "libraryId=1");
    assert.include(text, "type=journalArticle");
    assert.include(text, ZOTERO_MCP_TOOL_GET_ITEM_DETAIL);
    assertNotCountOnlyToolText(text);
  });

  it("forwards trusted call control to Broker-backed MCP read handlers", async function () {
    const controller = createCancellationController();
    controller.abort();
    let observedSignal: { readonly aborted: boolean } | undefined;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "control-forwarding",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL,
          arguments: {
            key: "PARENTKEY",
            libraryId: 1,
          },
        },
      },
      {
        control: { signal: controller.signal },
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            library: {
              getItemDetail: async (_ref, control) => {
                observedSignal = control?.signal;
                return {
                  id: 10,
                  key: "PARENTKEY",
                  libraryId: 1,
                  itemType: "journalArticle",
                  title: "Parent Paper",
                  creators: ["Example Author"],
                  year: "2024",
                  date: "2024",
                  publicationTitle: "Journal",
                  tags: ["mcp"],
                  collections: [],
                  fields: {},
                  noteCount: 0,
                  attachmentCount: 0,
                  relatedItemKeys: [],
                };
              },
            },
          }),
      },
    );

    assert.strictEqual(observedSignal, controller.signal);
    assert.isTrue(observedSignal?.aborted);
    assert.property((response as any).result, "structuredContent");
  });

  it("returns paged library item summaries without large child content", async function () {
    let observedArgs: any = null;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "library-list",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
          arguments: {
            collectionKey: "COLLKEY",
            libraryId: 1,
            limit: 1,
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            library: {
              listItems: async (args: any) => {
                observedArgs = args;
                return {
                  items: [
                    {
                      id: 10,
                      key: "PARENTKEY",
                      libraryId: 1,
                      itemType: "journalArticle",
                      title: "Parent Paper",
                      creators: [],
                      year: "",
                      date: "",
                      publicationTitle: "",
                      creators: ["Long Creator Name"],
                      tags: ["large-tag-that-should-not-be-returned-in-index"],
                      collections: ["COLLKEY"],
                      noteCount: 2,
                      attachmentCount: 1,
                    },
                  ],
                  nextCursor: "1",
                  totalScanned: 3,
                  returned: 1,
                  hasMore: true,
                  filters: {},
                };
              },
            },
          }),
      },
    );

    assert.strictEqual(observedArgs.limit, 1);
    const structured = (response as any).result.structuredContent;
    assert.strictEqual(
      structured.capability,
      ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
    );
    assert.strictEqual(structured.approval, "none");
    assert.strictEqual(structured.data.items[0].key, "PARENTKEY");
    assert.strictEqual(structured.data.items[0].noteCount, 2);
    assert.isTrue(structured.data.hasMore);
    const text = toolText(response);
    assert.include(text, "PARENTKEY");
    assert.include(text, "libraryId=1");
    assert.include(text, "notes=2");
    assert.include(text, "attachments=1");
    assert.include(text, "hasMore=true");
    assert.include(text, "nextCursor=1");
    assert.include(text, ZOTERO_MCP_TOOL_GET_ITEM_DETAIL);
    assertNotCountOnlyToolText(text);
  });

  it("caps list_library_items page size for agent-safe MCP responses", async function () {
    let observedArgs: any = null;
    await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "library-list-cap",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
          arguments: {
            limit: 200,
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            library: {
              listItems: async (args: any) => {
                observedArgs = args;
                return {
                  items: [],
                  nextCursor: "",
                  totalScanned: 0,
                  returned: 0,
                  hasMore: false,
                  filters: {},
                };
              },
            },
          }),
      },
    );

    assert.strictEqual(observedArgs.limit, 50);
  });

  it("returns actionable item detail summaries", async function () {
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "item-detail",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_ITEM_DETAIL,
          arguments: {
            key: "PARENTKEY",
            libraryId: 1,
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            library: {
              getItemDetail: async () => ({
                id: 10,
                key: "PARENTKEY",
                libraryId: 1,
                itemType: "journalArticle",
                title: "Parent Paper",
                creators: ["Example Author"],
                year: "2024",
                date: "2024",
                publicationTitle: "Journal",
                tags: ["mcp"],
                collections: [],
                fields: {
                  DOI: "10.123/example",
                  abstractNote: "This paper has a useful abstract.",
                },
                noteCount: 2,
                attachmentCount: 1,
                relatedItemKeys: [],
              }),
            },
          }),
      },
    );

    const text = toolText(response);
    assert.include(text, "PARENTKEY");
    assert.include(text, "libraryId=1");
    assert.include(text, "Parent Paper");
    assert.include(text, "notes=2");
    assert.include(text, "attachments=1");
    assert.include(text, "10.123/example");
    assert.include(text, ZOTERO_MCP_TOOL_GET_ITEM_NOTES);
    assert.include(text, ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS);
    assertNotCountOnlyToolText(text);
  });

  it("returns note summaries by default and reads note details in chunks", async function () {
    const largeText = "0123456789".repeat(100);
    const notesResponse = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "note-summary",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_ITEM_NOTES,
          arguments: {
            key: "PARENTKEY",
            libraryId: 1,
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            library: {
              getItemNotes: async () => ({
                notes: [
                  {
                    ref: { libraryId: 1, key: "NOTEKEY1" },
                    parentRef: { libraryId: 1, key: "PARENTKEY" },
                    title: "Long note",
                    textExcerpt: largeText.slice(0, 50),
                    textLength: largeText.length,
                    htmlLength: largeText.length + 7,
                    revision: "note-revision-1",
                  },
                ],
                nextCursor: null,
                hasMore: false,
                returned: 1,
                total: 1,
                limit: 25,
              }),
            },
          }),
      },
    );
    const notesPage = (notesResponse as any).result.structuredContent.data;
    const notes = notesPage.notes;
    assert.deepEqual(notes[0].ref, { libraryId: 1, key: "NOTEKEY1" });
    assert.strictEqual(notes[0].textLength, largeText.length);
    assert.notProperty(notes[0], "html");
    assert.deepInclude(notesPage, {
      nextCursor: null,
      hasMore: false,
      returned: 1,
      total: 1,
      limit: 25,
    });
    const notesText = toolText(notesResponse);
    assert.include(notesText, 'title="Long note"');
    assert.include(notesText, "textLength=1000");
    assert.include(notesText, largeText.slice(0, 20));
    assert.include(notesText, ZOTERO_MCP_TOOL_GET_NOTE_DETAIL);
    assertNotCountOnlyToolText(notesText);

    const detailResponse = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "note-detail",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
          arguments: {
            key: "NOTEKEY1",
            libraryId: 1,
            maxChars: 12,
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            library: {
              getNoteDetail: async () => ({
                ref: { libraryId: 1, key: "NOTEKEY1" },
                parentRef: { libraryId: 1, key: "PARENTKEY" },
                title: "Long note",
                format: "text",
                content: largeText,
                revision: "note-revision-1",
              }),
            },
          }),
      },
    );
    const note = (detailResponse as any).result.structuredContent.data;
    assert.strictEqual(note.content, largeText.slice(0, 12));
    assert.isTrue(note.hasMore);
    assert.strictEqual(note.nextOffset, 12);
    const detailText = toolText(detailResponse);
    assert.include(detailText, "0-12");
    assert.include(detailText, "nextOffset");
    assert.include(detailText, "totalChars");
    assert.include(detailText, "hasMore=true");
    assert.include(detailText, ZOTERO_MCP_TOOL_GET_NOTE_DETAIL);
  });

  it("returns a JSON-RPC error when a tool backend throws", async function () {
    let observedError = "";
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "throwing-tool",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_SEARCH_ITEMS,
          arguments: {
            query: "boom",
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            library: {
              listItems: async () => {
                throw new TypeError("backend exploded");
              },
            },
          }),
        onToolCall: (event) => {
          observedError = event.error?.message || "";
        },
      },
    );

    assert.strictEqual((response as any).error.code, -32602);
    assert.strictEqual((response as any).error.data.errorName, "TypeError");
    assert.strictEqual(observedError, "backend exploded");
  });

  it("returns remote-compatible attachment access metadata without file content", async function () {
    const attachmentRoot = getRuntimePersistencePaths().tmpDir;
    const attachmentSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const markdownPath = joinPath(
      attachmentRoot,
      `mcp-attachment-${attachmentSuffix}.md`,
    );
    const pdfPath = joinPath(
      attachmentRoot,
      `mcp-attachment-${attachmentSuffix}.pdf`,
    );
    temporaryRuntimeFiles.push(markdownPath, pdfPath);
    await writeRuntimeBytes(markdownPath, new TextEncoder().encode("# paper"), {
      overwrite: true,
    });
    await writeRuntimeBytes(pdfPath, new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
      overwrite: true,
    });
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "attachments",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
          arguments: {
            key: "PARENT1",
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            library: {
              getItemAttachments: async () => ({
                attachments: [
                  {
                    ref: { libraryId: 1, key: "ATTACHMD" },
                    parentRef: { libraryId: 1, key: "PARENT1" },
                    revision: "attachment-revision-md",
                    title: "paper.md",
                    filename: "paper.md",
                    contentType: "text/markdown",
                    charset: null,
                    url: null,
                    linkMode: "stored_file",
                    role: "ordinary",
                    file: {
                      state: "available",
                      path: markdownPath,
                      sizeBytes: 7,
                      modifiedAt: null,
                    },
                  },
                  {
                    ref: { libraryId: 1, key: "ATTACH1" },
                    parentRef: { libraryId: 1, key: "PARENT1" },
                    revision: "attachment-revision-pdf",
                    title: "paper.pdf",
                    filename: "paper.pdf",
                    contentType: "application/pdf",
                    charset: null,
                    url: null,
                    linkMode: "stored_file",
                    role: "ordinary",
                    file: {
                      state: "available",
                      path: pdfPath,
                      sizeBytes: 4,
                      modifiedAt: null,
                    },
                  },
                  {
                    ref: { libraryId: 1, key: "ATTACH2" },
                    parentRef: { libraryId: 1, key: "PARENT1" },
                    revision: "attachment-revision-linked",
                    title: "linked record",
                    filename: null,
                    contentType: null,
                    charset: null,
                    url: null,
                    linkMode: "linked_file",
                    role: "ordinary",
                    file: { state: "missing" },
                  },
                ],
                nextCursor: null,
                hasMore: false,
                returned: 3,
                total: 3,
                limit: 25,
              }),
            },
          }),
      },
    );

    const attachmentPage = (response as any).result.structuredContent.data;
    const attachments = attachmentPage.attachments;
    assert.strictEqual(attachments[0].access.mode, "bridge-download");
    assert.strictEqual(attachments[0].access.file.displayName, "paper.md");
    assert.strictEqual(attachments[0].access.file.owner.itemKey, "PARENT1");
    assert.deepEqual(attachments[0].ref, { libraryId: 1, key: "ATTACHMD" });
    assert.isUndefined(attachments[0].path);
    assert.strictEqual(attachments[2].access.mode, "unavailable");
    assert.notProperty(attachments[0], "content");
    assert.deepInclude(attachmentPage, {
      nextCursor: null,
      hasMore: false,
      returned: 3,
      total: 3,
      limit: 25,
    });
    const text = toolText(response);
    assert.include(text, 'filename="paper.md"');
    assert.include(text, 'filename="paper.pdf"');
    assert.include(text, "paper.pdf");
    assert.include(text, "contentType=application/pdf");
    assert.include(text, "access.mode=bridge-download");
    assert.include(text, 'filename="linked record"');
    assert.include(text, "access.mode=unavailable");
    assert.notInclude(text, "path=");
    assert.notInclude(text, markdownPath);
    assert.notInclude(text, pdfPath);
    assertNotCountOnlyToolText(text);
  });

  it("rejects the legacy aggregate paper reading context tool", async function () {
    const response = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "reading-context-legacy",
      method: "tools/call",
      params: {
        name: "prepare_paper_reading_context",
        arguments: {},
      },
    });

    assert.strictEqual((response as any).error.code, -32602);
    assert.include((response as any).error.message, "Unknown Zotero MCP tool");
    assert.strictEqual(
      (response as any).error.data.toolName,
      "prepare_paper_reading_context",
    );
  });

  it("returns structured item-not-found tool results for broker read tools", async function () {
    const response = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "missing-notes",
      method: "tools/call",
      params: {
        name: ZOTERO_MCP_TOOL_GET_ITEM_NOTES,
        arguments: {
          id: 99999999,
        },
      },
    });

    const result = (response as any).result;
    assert.strictEqual(result.isError, true);
    assert.strictEqual(
      result.structuredContent.error_code,
      "zotero_item_not_found",
    );
    assert.strictEqual(result.structuredContent.retryable, false);
    assert.strictEqual(
      result.structuredContent.tool,
      ZOTERO_MCP_TOOL_GET_ITEM_NOTES,
    );
  });

  it("publishes string library cursors and returns non-retryable cursor errors", async function () {
    const listed = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "cursor-tools",
      method: "tools/list",
      params: {},
    });
    const tool = (listed as any).result.tools.find(
      (entry: any) => entry.name === ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
    );
    assert.deepEqual(tool.inputSchema.properties.cursor, { type: "string" });

    const called = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "bad-library-cursor",
      method: "tools/call",
      params: {
        name: ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
        arguments: { cursor: "damaged!", limit: 1 },
      },
    });
    assert.strictEqual((called as any).result.isError, true);
    assert.strictEqual(
      (called as any).result.structuredContent.error_code,
      "invalid_library_cursor",
    );
    assert.strictEqual(
      (called as any).result.structuredContent.retryable,
      false,
    );
  });

  it("lists and reads Zotero note payloads for workflow notes", async function () {
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        listNotePayloads: async () => ({
          payloads: [
            {
              payloadType: "digest-markdown",
              noteKind: "digest",
              version: "1",
              encoding: "base64",
              estimatedBytes: 42,
              format: "markdown",
              source: { kind: "inline" },
              state: "available",
              issues: [],
            },
            {
              payloadType: "references-json",
              noteKind: "references",
              version: "1",
              encoding: "base64",
              estimatedBytes: 120,
              format: "json",
              source: { kind: "inline" },
              state: "available",
              issues: [],
            },
          ],
          scanned: 2,
          nextCursor: null,
          hasMore: false,
          returned: 2,
          total: null,
          limit: 25,
        }),
        getNotePayload: async () => ({
          summary: {
            payloadType: "digest-markdown",
            noteKind: "digest",
            version: "1",
            encoding: "base64",
            estimatedBytes: 42,
            format: "markdown",
            source: { kind: "inline" },
            state: "available",
            issues: [],
          },
          value: "# Digest\n\nBody",
        }),
      },
    });

    const listed = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "payloads",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS,
          arguments: {
            key: "NOTEPAY1",
            libraryId: 1,
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () => broker,
      },
    );
    const listedText = toolText(listed);
    assert.include(listedText, "digest-markdown");
    assert.include(listedText, "references-json");
    assert.include(listedText, ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD);
    const payloadPage = (listed as any).result.structuredContent.data;
    assert.deepEqual(
      payloadPage.payloads.map(
        (entry: { payloadType: string }) => entry.payloadType,
      ),
      ["digest-markdown", "references-json"],
    );
    assert.deepInclude(payloadPage, {
      nextCursor: null,
      hasMore: false,
      returned: 2,
      total: null,
      scanned: 2,
      limit: 25,
    });

    const detail = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "payload",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
          arguments: {
            key: "NOTEPAY1",
            libraryId: 1,
            payloadType: "digest-markdown",
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () => broker,
      },
    );
    const detailPayload = (detail as any).result.structuredContent.data;
    assert.strictEqual(detailPayload.summary.payloadType, "digest-markdown");
    assert.strictEqual(detailPayload.value, "# Digest\n\nBody");
    assert.include(toolText(detail), ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD);
  });

  it("previews mutations without requesting permission or executing", async function () {
    let permissionCalls = 0;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "preview",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
          arguments: {
            operation: "item.updateTags",
            itemRef: { libraryId: 1, key: "ITEM0001" },
            add: ["mcp"],
            remove: [],
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker({
            mutations: {
              preview: async (input, scope) => {
                assert.deepEqual(scope, { ownerId: "host-bridge" });
                assert.deepInclude(input, {
                  operation: "item.updateTags",
                  itemRef: { libraryId: 1, key: "ITEM0001" },
                  add: ["mcp"],
                  remove: [],
                });
                return {
                  schema: "zotero-agents.mutation-preview.v1",
                  operation: "item.updateTags",
                  outcome: "would_change",
                  observedAt: "2026-09-06T00:00:00.000Z",
                  domainPlanDigest: "preview-tags",
                  plan: { operation: "item.updateTags" },
                };
              },
            },
          }),
        requestToolPermission: () => {
          permissionCalls += 1;
          return true;
        },
      },
    );

    assert.strictEqual(permissionCalls, 0);
    assert.strictEqual(
      (response as any).result.structuredContent.capability,
      ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
    );
    assert.strictEqual(
      (response as any).result.structuredContent.approval,
      "none",
    );
    assert.deepInclude((response as any).result.structuredContent.data, {
      operation: "item.updateTags",
      outcome: "would_change",
    });
    const text = toolText(response);
    assert.include(text, "operation=item.updateTags");
  });

  it("executes write tools only after permission approval", async function () {
    let executeCalls = 0;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "write",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "item.updateTags",
            operationId: "mcp-approved-tags",
            itemRef: { libraryId: 1, key: "ITEM0001" },
            add: ["approved"],
            remove: [],
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker(),
        canonicalMutationControl: canonicalMutationControlForTests({
          onExecute: () => {
            executeCalls += 1;
            return { item: { ref: { libraryId: 1, key: "ITEM0001" } } };
          },
        }),
        requestToolPermission: () => ({
          outcome: "approved",
        }),
      },
    );

    assert.strictEqual(executeCalls, 1);
    assert.strictEqual(
      (response as any).result.structuredContent.capability,
      ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
    );
    assert.include(
      ["zotero-ui-required", "none"],
      (response as any).result.structuredContent.approval,
    );
    assert.strictEqual(
      (response as any).result.structuredContent.data.outcome,
      "committed",
    );
    const text = toolText(response);
    assert.include(text, "mutation.execute Host Bridge capability result.");
  });

  it("ingests one paper with duplicate detection and best-effort PDF attachment", async function () {
    const doi = "10.5555/zs.mcp.ingest.001";
    const collectionRef = await mcpIngestCollectionRef();
    const first = await withMcpIngestIdentitySearch(() =>
      handleZoteroMcpRequestForTests(
        {
          jsonrpc: "2.0",
          id: "ingest-first",
          method: "tools/call",
          params: {
            name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
            arguments: {
              operation: "literature.ingest",
              operationId: mcpMutationOperationId("ingest-first"),
              collectionRef,
              paper: {
                itemType: "journalArticle",
                fields: {
                  title: "Zotero Skills MCP Ingest Paper",
                  date: "2026",
                  DOI: doi,
                  publicationTitle: "Journal of Agentic Libraries",
                },
                creators: [
                  {
                    firstName: "Ada",
                    lastName: "Lovelace",
                    creatorType: "author",
                  },
                  {
                    firstName: "Grace",
                    lastName: "Hopper",
                    creatorType: "author",
                  },
                ],
                identifiers: { doi },
                landingUrl: "https://example.test/papers/zs-mcp-ingest",
                pdfUrl: "https://example.test/papers/zs-mcp-ingest.pdf",
                attachLandingUrlOnMissingPdf: true,
              },
            },
          },
        },
        {
          requestToolPermission: () => true,
        },
      ),
    );

    const firstIngest = canonicalIngestResult(first);
    assert.strictEqual(firstIngest.itemOutcome, "created");
    assert.strictEqual(
      ingestEnrichment(firstIngest, "pdf")?.outcome,
      "attached",
    );
    assert.strictEqual(
      ingestEnrichment(firstIngest, "landing")?.outcome,
      "skipped",
    );
    assert.strictEqual(
      firstIngest.item.title,
      "Zotero Skills MCP Ingest Paper",
    );
    const firstItem = Zotero.Items.getByLibraryAndKey(
      firstIngest.item.ref.libraryId,
      firstIngest.item.ref.key,
    )!;
    assert.lengthOf(firstItem.getAttachments(), 1);

    const duplicate = await withMcpIngestIdentitySearch(() =>
      handleZoteroMcpRequestForTests(
        {
          jsonrpc: "2.0",
          id: "ingest-duplicate",
          method: "tools/call",
          params: {
            name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
            arguments: {
              operation: "literature.ingest",
              operationId: mcpMutationOperationId("ingest-duplicate"),
              collectionRef,
              paper: {
                itemType: "journalArticle",
                fields: {
                  title: "Zotero Skills MCP Ingest Paper",
                  DOI: doi,
                },
                creators: [],
                identifiers: { doi },
              },
            },
          },
        },
        {
          requestToolPermission: () => true,
        },
      ),
    );

    const duplicateIngest = canonicalIngestResult(duplicate);
    assert.strictEqual(duplicateIngest.itemOutcome, "existing");
    assert.strictEqual(
      ingestEnrichment(duplicateIngest, "pdf")?.outcome,
      "skipped",
    );
  });

  it("ingests typed non-journal metadata without splitting Chinese creators", async function () {
    const collectionRef = await mcpIngestCollectionRef();
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-typed-thesis",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "literature.ingest",
            operationId: mcpMutationOperationId("ingest-thesis"),
            collectionRef,
            paper: {
              itemType: "thesis",
              fields: {
                title: "面向学术知识发现的智能体方法研究",
                university: "示例大学",
                thesisType: "博士学位论文",
                language: "zh-CN",
              },
              creators: [
                {
                  name: "欧阳明",
                  creatorType: "author",
                },
                {
                  name: "示例研究院",
                  creatorType: "contributor",
                },
              ],
              identifiers: {},
              landingUrl: "https://example.test/theses/agentic-discovery",
            },
          },
        },
      },
      { requestToolPermission: () => true },
    );

    const ingest = canonicalIngestResult(response);
    assert.strictEqual(ingest.itemOutcome, "created");
    const item = Zotero.Items.getByLibraryAndKey(
      ingest.item.ref.libraryId,
      ingest.item.ref.key,
    )!;
    assert.strictEqual(item.itemType, "thesis");
    assert.strictEqual(item.getField("university"), "示例大学");
    assert.strictEqual(item.getField("thesisType"), "博士学位论文");
    assert.deepEqual(item.getCreatorsJSON(), [
      { name: "欧阳明", creatorType: "author" },
      { name: "示例研究院", creatorType: "contributor" },
    ]);
  });

  it("keeps identifiers in Extra when the conservative document type has no typed identifier field", async function () {
    const doi = "10.5555/zs.mcp.document.001";
    const collectionRef = await mcpIngestCollectionRef();
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-typed-document",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "literature.ingest",
            operationId: mcpMutationOperationId("ingest-document"),
            collectionRef,
            paper: {
              itemType: "document",
              fields: { title: "Conservatively typed source" },
              creators: [],
              identifiers: { doi },
            },
          },
        },
      },
      { requestToolPermission: () => true },
    );

    const ingest = canonicalIngestResult(response);
    assert.strictEqual(ingest.itemOutcome, "created");
    const item = Zotero.Items.getByLibraryAndKey(
      ingest.item.ref.libraryId,
      ingest.item.ref.key,
    )!;
    assert.strictEqual(item.itemType, "document");
    assert.include(String(item.getField("extra") || ""), `DOI: ${doi}`);
  });

  it("maps an identifier-only DOI to the native journal article field", async function () {
    const doi = "10.5555/zs.mcp.native-doi.001";
    const collectionRef = await mcpIngestCollectionRef();
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-native-doi",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "literature.ingest",
            operationId: mcpMutationOperationId("ingest-native-doi"),
            collectionRef,
            paper: {
              itemType: "journalArticle",
              fields: {
                title: "Identifier-only DOI paper",
                extra: `DOI: ${doi}\nSource note`,
              },
              creators: [],
              identifiers: { doi },
            },
          },
        },
      },
      { requestToolPermission: () => true },
    );

    const ingest = canonicalIngestResult(response);
    assert.strictEqual(ingest.itemOutcome, "created");
    const item = Zotero.Items.getByLibraryAndKey(
      ingest.item.ref.libraryId,
      ingest.item.ref.key,
    )!;
    assert.strictEqual(item.getField("DOI"), doi);
    assert.notInclude(String(item.getField("extra") || ""), "DOI:");
    assert.include(String(item.getField("extra") || ""), "Source note");
  });

  it("rejects conflicting typed DOI representations before permission", async function () {
    let permissionCalls = 0;
    const collectionRef = await mcpIngestCollectionRef();
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-conflicting-doi",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "literature.ingest",
            operationId: mcpMutationOperationId("ingest-conflicting-doi"),
            collectionRef,
            paper: {
              itemType: "journalArticle",
              fields: {
                title: "Conflicting DOI paper",
                DOI: "10.5555/zs.mcp.native-doi.fields",
              },
              creators: [],
              identifiers: {
                doi: "10.5555/zs.mcp.native-doi.identifiers",
              },
            },
          },
        },
      },
      {
        requestToolPermission: () => {
          permissionCalls += 1;
          return true;
        },
      },
    );

    assert.strictEqual((response as any).error?.code, -32602);
    assert.match(
      String((response as any).error?.message || ""),
      /DOI.*conflict/i,
    );
    assert.strictEqual(permissionCalls, 0);
  });

  it("attaches a landing URL when requested and no PDF is available", async function () {
    const doi = "10.5555/zs.mcp.ingest.landing.001";
    const landingUrl = "https://example.test/papers/zs-mcp-landing";
    const collectionRef = await mcpIngestCollectionRef();
    const first = await withMcpIngestIdentitySearch(() =>
      handleZoteroMcpRequestForTests(
        {
          jsonrpc: "2.0",
          id: "ingest-landing-link",
          method: "tools/call",
          params: {
            name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
            arguments: {
              operation: "literature.ingest",
              operationId: mcpMutationOperationId("ingest-landing"),
              collectionRef,
              paper: {
                itemType: "journalArticle",
                fields: {
                  title: "Zotero Skills MCP Ingest Landing Link",
                  DOI: doi,
                },
                creators: [],
                identifiers: { doi },
                landingUrl,
                attachLandingUrlOnMissingPdf: true,
              },
            },
          },
        },
        {
          requestToolPermission: () => true,
        },
      ),
    );

    const firstIngest = canonicalIngestResult(first);
    assert.strictEqual(firstIngest.itemOutcome, "created");
    assert.strictEqual(
      ingestEnrichment(firstIngest, "pdf")?.outcome,
      "skipped",
    );
    assert.strictEqual(
      ingestEnrichment(firstIngest, "landing")?.outcome,
      "attached",
    );

    const item = Zotero.Items.getByLibraryAndKey(
      firstIngest.item.ref.libraryId,
      firstIngest.item.ref.key,
    )!;
    const attachmentIds = item.getAttachments();
    assert.lengthOf(attachmentIds, 1);
    const landingAttachment = Zotero.Items.get(attachmentIds[0])!;
    assert.strictEqual(landingAttachment.getField("url"), landingUrl);
    assert.strictEqual(landingAttachment.getField("contentType"), "text/html");

    const duplicate = await withMcpIngestIdentitySearch(() =>
      handleZoteroMcpRequestForTests(
        {
          jsonrpc: "2.0",
          id: "ingest-landing-link-duplicate",
          method: "tools/call",
          params: {
            name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
            arguments: {
              operation: "literature.ingest",
              operationId: mcpMutationOperationId("ingest-landing-duplicate"),
              collectionRef,
              paper: {
                itemType: "journalArticle",
                fields: {
                  title: "Zotero Skills MCP Ingest Landing Link",
                  DOI: doi,
                },
                creators: [],
                identifiers: { doi },
                landingUrl,
                attachLandingUrlOnMissingPdf: true,
              },
            },
          },
        },
        {
          requestToolPermission: () => true,
        },
      ),
    );

    const duplicateIngest = canonicalIngestResult(duplicate);
    assert.strictEqual(duplicateIngest.itemOutcome, "existing");
    assert.strictEqual(
      ingestEnrichment(duplicateIngest, "landing")?.outcome,
      "attached",
    );
    assert.lengthOf(item.getAttachments(), 2);
  });

  it("keeps paper ingest successful when landing URL attachment fails", async function () {
    const collectionRef = await mcpIngestCollectionRef();
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-landing-link-fail",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "literature.ingest",
            operationId: mcpMutationOperationId("ingest-landing-failure"),
            collectionRef,
            paper: {
              itemType: "journalArticle",
              fields: {
                title: "Zotero Skills MCP Ingest Landing Failure",
                DOI: "10.5555/zs.mcp.ingest.landing.002",
              },
              creators: [],
              identifiers: { doi: "10.5555/zs.mcp.ingest.landing.002" },
              landingUrl: "https://example.test/fail?paper=landing",
              attachLandingUrlOnMissingPdf: true,
            },
          },
        },
      },
      {
        requestToolPermission: () => true,
      },
    );

    const ingest = canonicalIngestResult(response);
    assert.strictEqual(ingest.itemOutcome, "created");
    assert.strictEqual(ingestEnrichment(ingest, "pdf")?.outcome, "skipped");
    assert.deepInclude(ingestEnrichment(ingest, "landing"), {
      outcome: "failed",
      code: "landing_url_attachment_failed",
    });
  });

  it("keeps paper ingest successful when PDF attachment import fails", async function () {
    const collectionRef = await mcpIngestCollectionRef();
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-pdf-fail",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "literature.ingest",
            operationId: mcpMutationOperationId("ingest-pdf-failure"),
            collectionRef,
            paper: {
              itemType: "journalArticle",
              fields: {
                title: "Zotero Skills MCP Ingest PDF Failure",
                DOI: "10.5555/zs.mcp.ingest.002",
              },
              creators: [],
              identifiers: { doi: "10.5555/zs.mcp.ingest.002" },
              pdfUrl: "https://example.test/fail?paper=zs-mcp-ingest",
            },
          },
        },
      },
      {
        requestToolPermission: () => true,
      },
    );

    const ingest = canonicalIngestResult(response);
    assert.strictEqual(ingest.itemOutcome, "created");
    assert.deepInclude(ingestEnrichment(ingest, "pdf"), {
      outcome: "failed",
      code: "pdf_attachment_failed",
    });
  });

  it("does not execute paper ingest when permission is denied", async function () {
    let executeCalls = 0;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-denied",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "literature.ingest",
            operationId: mcpMutationOperationId("denied-ingest"),
            collectionRef: { libraryId: 1, key: "COLLECT1" },
            paper: {
              itemType: "journalArticle",
              fields: {
                title: "Denied Paper Ingest",
                DOI: "10.5555/zs.mcp.ingest.denied",
              },
              creators: [],
              identifiers: {
                doi: "10.5555/zs.mcp.ingest.denied",
              },
            },
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker(),
        canonicalMutationControl: canonicalMutationControlForTests({
          onExecute: () => {
            executeCalls += 1;
            return {};
          },
        }),
        requestToolPermission: () => ({
          outcome: "denied",
          reason: "test denial",
        }),
      },
    );

    assert.strictEqual(executeCalls, 0);
    assert.strictEqual((response as any).error.code, -32602);
    assert.deepInclude((response as any).error.data, {
      toolName: "mutation.execute",
    });
    assert.deepInclude((response as any).error.data.details, {
      approval: "denied",
    });
  });

  it("rejects batch paper ingest MCP arguments before permission", async function () {
    let permissionCalls = 0;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-batch-rejected",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "literature.ingest",
            papers: [
              {
                title: "Batch Paper One",
              },
              {
                title: "Batch Paper Two",
              },
            ],
          },
        },
      },
      {
        requestToolPermission: () => {
          permissionCalls += 1;
          return true;
        },
      },
    );

    assert.strictEqual(permissionCalls, 0);
    assert.strictEqual((response as any).error.code, -32602);
    assert.isObject((response as any).error.data);
  });

  it("creates markdown-backed notes through permission-gated mutation flow", async function () {
    let mutationContent = "";
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "create-md-note",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "notes.create",
            operationId: "mcp-create-note",
            placement: {
              kind: "child",
              parentRef: {
                key: "PARENT1",
                libraryId: 1,
              },
            },
            content: {
              format: "html",
              value:
                '<div data-zs-note-kind="custom" data-zs-payload="custom-markdown">Agent Note</div>',
            },
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker(),
        canonicalMutationControl: canonicalMutationControlForTests({
          onPrepare: (mutation) => {
            mutationContent = String(
              (mutation.content as Record<string, unknown>).value,
            );
          },
          onExecute: () => ({
            note: {
              ref: { key: "NOTE1", libraryId: 1 },
              title: "Agent Note",
            },
          }),
        }),
        requestToolPermission: () => ({
          outcome: "approved",
        }),
      },
    );

    assert.include(mutationContent, 'data-zs-note-kind="custom"');
    assert.include(mutationContent, 'data-zs-payload="custom-markdown"');
    assert.strictEqual(
      (response as any).result.structuredContent.data.result.note.ref.key,
      "NOTE1",
    );
    assert.include(
      toolText(response),
      "mutation.execute Host Bridge capability result.",
    );
  });

  it("updates markdown-backed notes through generic mutation.execute", async function () {
    let executeCalls = 0;
    const broker = createFailClosedZoteroHostCapabilityBroker();
    const updated = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "update-md-note",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "notes.updateContent",
            operationId: "mcp-update-note",
            noteRef: {
              key: "NOTE1",
              libraryId: 1,
            },
            content: {
              format: "html",
              value:
                '<div data-zs-payload="conversation-note-markdown">Updated</div>',
            },
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () => broker,
        canonicalMutationControl: canonicalMutationControlForTests({
          onExecute: (mutation) => {
            executeCalls += 1;
            assert.include(
              String((mutation.content as Record<string, unknown>).value),
              'data-zs-payload="conversation-note-markdown"',
            );
            return { note: { ref: { libraryId: 1, key: "NOTE1" } } };
          },
        }),
        requestToolPermission: () => true,
      },
    );
    assert.strictEqual(executeCalls, 1);
    assert.strictEqual(
      (updated as any).result.structuredContent.data.outcome,
      "committed",
    );

    const rejected = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "reject-md-note",
      method: "tools/call",
      params: {
        name: "update_markdown_note",
        arguments: {
          note: {
            key: "NOTE1",
            libraryId: 1,
          },
          markdown: "# Updated",
          expectedPayloadType: "references-json",
        },
      },
    });
    assert.strictEqual((rejected as any).error.code, -32602);
    assert.include((rejected as any).error.message, "Unknown Zotero MCP tool");
    assert.strictEqual(executeCalls, 1);
  });

  it("does not execute write tools when permission is denied or unavailable", async function () {
    let executeCalls = 0;
    const denied = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "denied",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "item.updateTags",
            operationId: "mcp-denied-tags",
            itemRef: { libraryId: 1, key: "ITEM0001" },
            add: ["denied"],
            remove: [],
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker(),
        canonicalMutationControl: canonicalMutationControlForTests({
          onExecute: () => {
            executeCalls += 1;
            return {};
          },
        }),
        requestToolPermission: () => ({
          outcome: "denied",
          reason: "user_denied",
        }),
      },
    );
    const unavailable = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "unavailable",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_EXECUTE_MUTATION,
          arguments: {
            operation: "item.updateTags",
            operationId: "mcp-unavailable-tags",
            itemRef: { libraryId: 1, key: "ITEM0001" },
            add: ["unavailable"],
            remove: [],
          },
        },
      },
      {
        resolveZoteroHostCapabilityBroker: () =>
          createFailClosedZoteroHostCapabilityBroker(),
        canonicalMutationControl: canonicalMutationControlForTests({
          onExecute: () => {
            executeCalls += 1;
            return {};
          },
        }),
      },
    );

    assert.strictEqual(executeCalls, 0);
    assert.strictEqual((denied as any).error.code, -32602);
    assert.deepInclude((denied as any).error.data, {
      toolName: "mutation.execute",
    });
    assert.deepInclude((denied as any).error.data.details, {
      approval: "denied",
    });
    assert.strictEqual(
      (unavailable as any).result.structuredContent.approval,
      "unavailable",
    );
    assert.include(toolText(unavailable), "unavailable");
  });

  it("is compatible with the official MCP Streamable HTTP client", async function () {
    if (isRealZoteroRuntime()) {
      this.skip();
    }
    this.timeout(10000);
    const token = configureZoteroMcpServerForTests({
      resolveZoteroHostCapabilityBroker: () =>
        createFailClosedZoteroHostCapabilityBroker({
          context: {
            getCurrentView: () => ({
              target: "library",
              libraryId: 7,
              libraryIds: [7],
              selectionEmpty: false,
              currentItem: {
                ref: { libraryId: 7, key: "SDKTEST1" },
                title: "SDK Compatibility Paper",
              },
              selectedSources: [],
            }),
          },
        }),
    });
    const server = await createNodeMcpTestServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.isObject(address);
    const url = new URL(
      `http://127.0.0.1:${(address as { port: number }).port}/mcp`,
    );
    const { client, transport } = await createMcpSdkClient({
      name: "zotero-skills-test-client",
      url,
      token,
    });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      assert.strictEqual(tools.tools[0].name, ZOTERO_MCP_TOOL_GET_CURRENT_VIEW);

      const result = await client.callTool({
        name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
        arguments: {},
      });
      assert.include(JSON.stringify(result), "SDK Compatibility Paper");

      const status = getZoteroMcpServerStatus();
      assert.isAtLeast(status.toolCallCount, 1);
      assert.include(
        status.recentRequests.map((entry) => entry.jsonrpcMethod),
        "tools/list",
      );
      assert.include(
        status.recentRequests.map((entry) => entry.jsonrpcMethod),
        "tools/call",
      );
      const toolsListLog = [...status.recentRequests]
        .reverse()
        .find((entry) => entry.jsonrpcMethod === "tools/list");
      const toolCallLog = [...status.recentRequests]
        .reverse()
        .find((entry) => entry.jsonrpcMethod === "tools/call");
      assert.isAtLeast(toolsListLog?.responseToolCount || 0, 1);
      assert.strictEqual(
        toolCallLog?.jsonrpcToolName,
        ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
      );
    } finally {
      await client.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("is compatible with the official MCP client when an auth provider is present", async function () {
    if (isRealZoteroRuntime()) {
      this.skip();
    }
    this.timeout(10000);
    const token = configureZoteroMcpServerForTests();
    const server = await createNodeMcpTestServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.isObject(address);
    const url = new URL(
      `http://127.0.0.1:${(address as { port: number }).port}/mcp`,
    );
    const authProvider = {
      redirectUrl: undefined,
      clientMetadata: {
        client_name: "opencode-like-test-client",
        redirect_uris: [],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      clientInformation: () => undefined,
      tokens: () => undefined,
      saveTokens: () => undefined,
      redirectToAuthorization: () => undefined,
      saveCodeVerifier: () => undefined,
      codeVerifier: () => "",
    };
    const { client, transport } = await createMcpSdkClient({
      name: "opencode-like-test-client",
      url,
      token,
      authProvider,
    });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      assert.strictEqual(tools.tools[0].name, ZOTERO_MCP_TOOL_GET_CURRENT_VIEW);
    } finally {
      await client.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("admits concurrent Streamable HTTP tool calls and records admission diagnostics", async function () {
    const token = configureZoteroMcpServerForTests({
      resolveZoteroHostCapabilityBroker: () =>
        createFailClosedZoteroHostCapabilityBroker({
          context: {
            getCurrentView: () => ({
              target: "library",
              libraryId: 1,
              libraryIds: [1],
              selectionEmpty: true,
              selectedSources: [],
            }),
          },
        }),
    });
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: "call",
      method: "tools/call",
      params: {
        name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
        arguments: {},
      },
    });

    const [first, second] = await Promise.all([
      handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body,
      }),
      handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body,
      }),
    ]);

    assert.strictEqual(parseRawHttpResponse(first).status, 200);
    assert.strictEqual(parseRawHttpResponse(second).status, 200);
    const toolLogs = getZoteroMcpServerStatus().recentRequests.filter(
      (entry) => entry.jsonrpcMethod === "tools/call",
    );
    assert.lengthOf(toolLogs, 2);
    assert.deepEqual(
      toolLogs.map((entry) => entry.toolOutcome),
      ["success", "success"],
    );
    assert.isAtLeast(toolLogs[0].durationMs, 0);
    assert.isAtLeast(toolLogs[0].inflightAtAccept, 0);
    assert.isAtLeast(toolLogs[1].inflightAtAccept, 0);
  });

  it("admits nine concurrent tool calls under the fixed inflight policy", async function () {
    let releaseAll!: () => void;
    const allCallsBlocked = new Promise<void>((resolve) => {
      releaseAll = resolve;
    });
    const token = configureZoteroMcpServerForTests({
      resolveZoteroHostCapabilityBroker: () =>
        createFailClosedZoteroHostCapabilityBroker({
          context: {
            getCurrentView: () => ({
              target: "library",
              libraryId: 1,
              libraryIds: [1],
              selectionEmpty: true,
              selectedSources: [],
            }),
          },
        }),
      beforeToolCallForTests: () => allCallsBlocked,
    });

    const requests = Array.from({ length: 9 }, (_entry, index) =>
      handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `admission-${index}`,
          method: "tools/call",
          params: {
            name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
            arguments: {},
          },
        }),
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    const admittedStatus = getZoteroMcpServerStatus();
    assert.deepEqual(admittedStatus.admissionPolicy, {
      inflightLimit: 9,
      runningTimeoutMs: 45000,
    });
    assert.strictEqual(admittedStatus.admissionState.inflight, 9);
    assert.strictEqual(admittedStatus.admissionState.limit, 9);
    releaseAll();

    const responses = await Promise.all(requests);
    assert.deepEqual(
      responses.map((raw) => parseRawHttpResponse(raw).status),
      Array(9).fill(200),
    );
    const toolLogs = getZoteroMcpServerStatus().recentRequests.filter(
      (entry) => entry.jsonrpcMethod === "tools/call",
    );
    assert.lengthOf(toolLogs, 9);
    assert.deepEqual(
      toolLogs.map((entry) => entry.inflightAtAccept).sort((a, b) => a - b),
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.deepEqual(
      toolLogs.map((entry) => entry.toolOutcome),
      Array(9).fill("success"),
    );
  });

  it("returns a structured JSON-RPC error when the inflight admission limit is reached", async function () {
    let releaseFirst!: () => void;
    let shouldBlock = true;
    const token = configureZoteroMcpServerForTests({
      beforeToolCallForTests: async () => {
        if (!shouldBlock) {
          return;
        }
        shouldBlock = false;
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      },
    });
    const bodyFor = (id: string) =>
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      });

    const requests = Array.from({ length: 10 }, (_entry, index) =>
      handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: bodyFor(`inflight-limit-${index}`),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    releaseFirst();
    const responses = await Promise.all(requests);
    const parsed = responses.map(parseJsonBody);
    const full = parsed.find(
      (entry) => entry.error?.data?.code === "zotero_mcp_inflight_limit",
    );

    assert.exists(full);
    assert.strictEqual(full.error.code, -32001);
    const logs = getZoteroMcpServerStatus().recentRequests.filter(
      (entry) => entry.jsonrpcMethod === "tools/call",
    );
    assert.isAtLeast(logs.length, 10);
    const fullLog = logs.find(
      (entry) => entry.limitReason === "inflight_limit",
    );
    assert.exists(fullLog);
    assert.strictEqual(fullLog?.toolOutcome, "error");
    assert.strictEqual(fullLog?.toolErrorName, "ZoteroMcpInflightLimitError");
    assert.strictEqual(getZoteroMcpServerStatus().toolCallCount, 9);
  });

  it("bypasses admission for tools/list while a tool call is running", async function () {
    let releaseFirst!: () => void;
    let shouldBlock = true;
    const token = configureZoteroMcpServerForTests({
      beforeToolCallForTests: async () => {
        if (!shouldBlock) {
          return;
        }
        shouldBlock = false;
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      },
    });
    const toolCall = handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "blocked-tool",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      }),
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const toolsList = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "tools-list-bypass",
        method: "tools/list",
      }),
    });
    releaseFirst();
    await toolCall;

    const parsed = parseJsonBody(toolsList);
    assert.isArray(parsed.result.tools);
    const toolsLog = getZoteroMcpServerStatus().recentRequests.find(
      (entry) => entry.jsonrpcMethod === "tools/list",
    );
    assert.exists(toolsLog);
    assert.strictEqual(toolsLog?.inflightAtAccept, 0);
  });

  it("returns a structured timeout error when a running tool exceeds its guard timeout", async function () {
    let releaseFirst!: () => void;
    let shouldBlock = true;
    const token = configureZoteroMcpServerForTests({
      runningTimeoutMs: 10,
      beforeToolCallForTests: async () => {
        if (!shouldBlock) {
          return;
        }
        shouldBlock = false;
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      },
    });

    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "running-timeout",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      }),
    });
    releaseFirst();
    const parsed = parseJsonBody(raw);

    assert.strictEqual(parsed.error.code, -32003);
    assert.strictEqual(parsed.error.data.code, "zotero_mcp_tool_timeout");
    const timeoutLog = getZoteroMcpServerStatus().recentRequests.find(
      (entry) => entry.limitReason === "tool_timeout",
    );
    assert.exists(timeoutLog);
    assert.strictEqual(timeoutLog?.toolErrorName, "ZoteroMcpToolTimeoutError");
  });

  it("retains inflight admission until a timed-out tool really settles", async function () {
    let releaseFirst!: () => void;
    let releaseOthers!: () => void;
    let callCount = 0;
    const otherCallsBlocked = new Promise<void>((resolve) => {
      releaseOthers = resolve;
    });
    const token = configureZoteroMcpServerForTests({
      runningTimeoutMs: 10,
      beforeToolCallForTests: async () => {
        callCount += 1;
        if (callCount > 1) {
          await otherCallsBlocked;
          return;
        }
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      },
    });
    const makeRequest = (
      id: string,
      toolName = ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
    ) =>
      handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: {},
          },
        }),
      });

    const first = makeRequest("retained-timeout-first");
    await new Promise((resolve) => setTimeout(resolve, 40));
    const firstResponse = parseJsonBody(await first);
    const retainedStatus = getZoteroMcpServerStatus();

    assert.strictEqual(
      firstResponse.error.data.code,
      "zotero_mcp_tool_timeout",
    );
    assert.strictEqual(retainedStatus.admissionState.inflight, 1);
    assert.strictEqual(retainedStatus.admissionState.limit, 9);
    assert.isTrue(retainedStatus.guardState.timedOutButStillRunning);
    assert.include(retainedStatus.guardState.retryGuidance, "wait");

    const fillerToolNames = [
      ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS,
      ZOTERO_MCP_TOOL_SEARCH_ITEMS,
      ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
      ZOTERO_MCP_TOOL_GET_ITEM_DETAIL,
      ZOTERO_MCP_TOOL_GET_ITEM_NOTES,
      ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
      ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS,
      ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
    ];
    const fillers = fillerToolNames.map((toolName, index) =>
      makeRequest(`retained-timeout-filler-${index}`, toolName),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    const second = makeRequest("retained-timeout-second");
    const secondResponse = parseJsonBody(await second);
    assert.strictEqual(getZoteroMcpServerStatus().admissionState.inflight, 9);
    assert.strictEqual(secondResponse.error.code, -32001);
    assert.strictEqual(
      secondResponse.error.data.code,
      "zotero_mcp_inflight_limit",
    );

    releaseFirst();
    releaseOthers();
    await Promise.all(fillers);
  });

  it("opens a per-tool circuit after repeated runtime failures", async function () {
    let failures = 0;
    const token = configureZoteroMcpServerForTests({
      beforeToolCallForTests: () => {
        failures += 1;
        throw new Error(`native failure ${failures}`);
      },
    });
    const call = (id: string) =>
      handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: {
            name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
            arguments: {},
          },
        }),
      });

    await call("circuit-1");
    await call("circuit-2");
    await call("circuit-3");
    const open = parseJsonBody(await call("circuit-4"));

    assert.strictEqual(open.error.code, -32010);
    assert.strictEqual(open.error.data.code, "zotero_mcp_tool_circuit_open");
    assert.strictEqual(
      open.error.data.toolName,
      ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
    );
    assert.strictEqual(failures, 3);
    const breaker = getZoteroMcpServerStatus().guardState.circuitBreakers.find(
      (entry) => entry.toolName === ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
    );
    assert.strictEqual(breaker?.state, "open");
    assert.strictEqual(breaker?.failureCount, 3);
  });

  it("exposes safe MCP guard and admission status through a bypassed status tool", async function () {
    let releaseAll!: () => void;
    const allCallsBlocked = new Promise<void>((resolve) => {
      releaseAll = resolve;
    });
    const token = configureZoteroMcpServerForTests({
      beforeToolCallForTests: () => allCallsBlocked,
    });
    const activeCalls = Array.from({ length: 9 }, (_entry, index) =>
      handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `status-bypass-${index}`,
          method: "tools/call",
          params: {
            name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
            arguments: {},
          },
        }),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "status-tool",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_MCP_STATUS,
          arguments: {},
        },
      }),
    });
    const parsed = parseJsonBody(raw);
    const status = parsed.result.structuredContent.data;

    assert.strictEqual(
      parsed.result.structuredContent.capability,
      ZOTERO_MCP_TOOL_GET_MCP_STATUS,
    );
    assert.property(status, "status");
    assert.property(status, "endpoint");
    assert.property(status, "tokenMasked");
    assert.notInclude(JSON.stringify(status), token);
    assert.strictEqual(getZoteroMcpServerStatus().admissionState.inflight, 9);
    const logs = getZoteroMcpServerStatus().recentRequests.filter(
      (entry) => entry.jsonrpcToolName === ZOTERO_MCP_TOOL_GET_MCP_STATUS,
    );
    assert.strictEqual(logs[0]?.inflightAtAccept, 0);
    releaseAll();
    await Promise.all(activeCalls);
  });

  it("records host-side MCP runtime logs for a successful tool call", async function () {
    const token = configureZoteroMcpServerForTests({
      resolveZoteroHostCapabilityBroker: () =>
        createFailClosedZoteroHostCapabilityBroker({
          context: {
            getCurrentView: () => ({
              target: "library",
              libraryId: 1,
              libraryIds: [1],
              selectionEmpty: true,
              selectedSources: [],
            }),
          },
        }),
    });
    await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "runtime-log-success",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      }),
    });

    const logs = listRuntimeLogs({
      scopes: ["system"],
      component: "zotero-mcp",
      order: "asc",
    });
    const stages = logs.map((entry) => entry.stage);
    assert.includeMembers(stages, [
      "request.accepted",
      "request.parsed",
      "tool.resolved",
      "tool.started",
      "tool.finished",
      "response.serialize.started",
      "response.serialize.finished",
      "response.write.started",
      "response.write.finished",
    ]);
    const requestIds = new Set(
      logs.map((entry) => entry.requestId).filter(Boolean),
    );
    assert.strictEqual(requestIds.size, 1);
    assert.notInclude(JSON.stringify(logs), token);
  });

  it("records host-side MCP runtime logs for tool failures", async function () {
    const token = configureZoteroMcpServerForTests();
    await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "runtime-log-failure",
        method: "tools/call",
        params: {
          name: "no_such_tool",
          arguments: {},
        },
      }),
    });

    const logs = listRuntimeLogs({
      scopes: ["system"],
      component: "zotero-mcp",
      order: "asc",
    });
    assert.include(
      logs.map((entry) => entry.stage),
      "tool.failed",
    );
    const failed = logs.find((entry) => entry.stage === "tool.failed");
    assert.strictEqual(failed?.level, "warn");
    assert.include(JSON.stringify(failed?.details || {}), "no_such_tool");
  });

  it("records response serialization failures and returns a structured fallback", async function () {
    const circular: any = { jsonrpc: "2.0", id: "serialize-failure" };
    circular.self = circular;
    const raw = serializeZoteroMcpResponseForTests(circular);
    const parsed = parseJsonBody(raw);
    const logs = listRuntimeLogs({
      scopes: ["system"],
      component: "zotero-mcp",
    });

    assert.strictEqual(parseRawHttpResponse(raw).status, 200);
    assert.strictEqual(parsed.id, null);
    assert.strictEqual(parsed.error.code, -32603);
    assert.include(
      logs.map((entry) => entry.stage),
      "response.serialize.failed",
    );
  });

  it("keeps MCP health green while surfacing response write diagnostics", function () {
    configureZoteroMcpServerForTests();
    recordZoteroMcpResponseWriteFailureForTests(
      new Error("NS_BASE_STREAM_CLOSED"),
    );

    const health = getZoteroMcpHealthSnapshot();
    assert.strictEqual(health.state, "listening");
    assert.strictEqual(health.severity, "ok");
    assert.strictEqual(health.lastWriteFailure, true);
    assert.strictEqual(health.lastLogStage, "response.write.failed");
    assert.strictEqual(health.lastLogErrorName, "Error");
    assert.include(
      health.tooltip.join("\n"),
      "lastRuntimeFailure=response.write.failed",
    );
  });

  it("records transport diagnostics for tools/list discovery", async function () {
    const token = configureZoteroMcpServerForTests();
    await handleZoteroMcpHttpRequestForTests({
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "user-agent": "claude-code/2.1.44",
        "mcp-protocol-version": "2025-11-25",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "tools-list-diagnostics",
        method: "tools/list",
      }),
    });

    const logs = listRuntimeLogs({
      scopes: ["system"],
      component: "zotero-mcp",
      order: "asc",
    });
    const serialized = JSON.stringify(logs);
    assert.notInclude(serialized, token);
    const finished = logs.find(
      (entry) => entry.stage === "response.serialize.finished",
    );
    assert.include(
      JSON.stringify(finished?.details || {}),
      '"requiredSynthesisToolsPresent":true',
    );
    assert.include(
      JSON.stringify(finished?.details || {}),
      ZOTERO_MCP_TOOL_TOPICS_LIST,
    );
    assert.include(
      JSON.stringify(finished?.details || {}),
      ZOTERO_MCP_TOOL_LIBRARY_INDEX_GET,
    );
    assert.include(
      JSON.stringify(finished?.details || {}),
      ZOTERO_MCP_TOOL_RESOLVERS_RESOLVE,
    );
    assert.include(
      JSON.stringify(finished?.details || {}),
      ZOTERO_MCP_TOOL_PAPER_ARTIFACTS_EXPORT_FILTERED,
    );
    assert.match(
      JSON.stringify(finished?.details || {}),
      /"responseBytes":\d+/,
    );
    assert.match(
      JSON.stringify(finished?.details || {}),
      /"contentLength":\d+/,
    );
  });

  it("records unsupported streamable HTTP GET diagnostics", async function () {
    const token = configureZoteroMcpServerForTests();
    const raw = await handleZoteroMcpHttpRequestForTests({
      method: "GET",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "text/event-stream",
        "user-agent": "claude-code/2.1.44",
      },
    });
    const parsed = parseRawHttpResponse(raw);
    assert.strictEqual(parsed.status, 405);
    assert.strictEqual(parsed.headers.Allow, "POST");

    const logs = listRuntimeLogs({
      scopes: ["system"],
      component: "zotero-mcp",
      order: "asc",
    });
    const accepted = logs.find((entry) => entry.stage === "request.accepted");
    const serialized = JSON.stringify(accepted?.details || {});
    assert.include(serialized, "text/event-stream");
    assert.include(serialized, "claude-code");
    assert.notInclude(JSON.stringify(logs), token);
  });

  it("builds a JSON-RPC fallback response for request-level listener failures", function () {
    const rawRequest = [
      "POST /mcp HTTP/1.1",
      "Content-Type: application/json",
      "",
      JSON.stringify({
        jsonrpc: "2.0",
        id: "listener-failure",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      }),
    ].join("\r\n");

    const raw = buildZoteroMcpRequestFailureResponseForTests(
      rawRequest,
      new Error("listener exploded"),
    );
    const parsed = parseJsonBody(raw);

    assert.strictEqual(parseRawHttpResponse(raw).status, 200);
    assert.strictEqual(parsed.id, "listener-failure");
    assert.strictEqual(parsed.error.code, -32603);
    assert.strictEqual(parsed.error.data.errorName, "Error");
  });

  it("redacts bearer token from diagnostics-facing descriptor", function () {
    const descriptor: ZoteroMcpServerDescriptor = {
      name: "zotero",
      type: "http",
      url: "http://127.0.0.1:26370/mcp",
      headers: [
        {
          name: "Authorization",
          value: "Bearer secret-token",
        },
      ],
      enabled: true,
    };

    assert.deepEqual(redactZoteroMcpServerDescriptor(descriptor), {
      name: "zotero",
      type: "http",
      url: "http://127.0.0.1:26370/mcp",
      headers: [
        {
          name: "Authorization",
          value: "Bearer <redacted>",
        },
      ],
      enabled: true,
    });
  });

  it("exposes masked server status by default", function () {
    const status = getZoteroMcpServerStatus();
    assert.include(["idle", "stopped"], status.status);
    assert.strictEqual(status.tokenMasked, "");
    assert.strictEqual(status.endpoint, "");
    assert.strictEqual(status.lastResponseStatus, 0);
    assert.strictEqual(status.guardState.runningTimeoutMs, 45000);
    assert.deepEqual(status.guardState.circuitBreakers, []);
    assert.deepEqual(status.recentRequests, []);
  });
});

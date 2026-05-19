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
  ZOTERO_MCP_TOOL_ADD_ITEM_TAGS,
  ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
  ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
  ZOTERO_MCP_TOOL_GET_ITEM_DETAIL,
  ZOTERO_MCP_TOOL_GET_ITEM_NOTES,
  ZOTERO_MCP_TOOL_GET_MCP_STATUS,
  ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
  ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
  ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS,
  ZOTERO_MCP_TOOL_INGEST_PAPERS,
  ZOTERO_MCP_TOOL_CREATE_MARKDOWN_NOTE,
  ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
  ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS,
  ZOTERO_MCP_TOOL_PREPARE_PAPER_READING_CONTEXT,
  ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
  ZOTERO_MCP_TOOL_SEARCH_ITEMS,
  ZOTERO_MCP_TOOL_SYNTHESIS_EXPORT_FILTERED_PAPER_ARTIFACTS,
  ZOTERO_MCP_TOOL_SYNTHESIS_GET_LIBRARY_INDEX,
  ZOTERO_MCP_TOOL_SYNTHESIS_LIST_TOPICS,
  ZOTERO_MCP_TOOL_SYNTHESIS_RESOLVE_RESOLVER,
  ZOTERO_MCP_TOOL_UPDATE_MARKDOWN_NOTE,
} from "../../src/modules/zoteroMcpProtocol";

const dynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as <T = any>(specifier: string) => Promise<T>;

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: {
        runtime?: string;
      };
    };
  };
  return (
    !!runtime.Zotero &&
    runtime.Zotero.__parity?.runtime !== "node-mock"
  );
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
    headers[line.slice(0, separator).trim()] = line
      .slice(separator + 1)
      .trim();
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
  assert.notMatch(text.trim(), /^(Selected Zotero items|Found|Listed)\s+\d+\b[^.\n]*\.$/);
}

async function readRequestBody(request: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function writeMcpTestResponse(
  request: any,
  response: any,
) {
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
  afterEach(function () {
    resetZoteroMcpServerForTests();
    clearRuntimeLogs();
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
    assert.propertyVal((response as any).result, "protocolVersion", "2025-06-18");
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

    assert.propertyVal((response as any).result, "protocolVersion", "2025-11-25");
  });

  it("records initialize response shape for diagnostics", async function () {
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
    assert.strictEqual(entry.responseContentType, "application/json; charset=utf-8");
    assert.isAbove(entry.responseBodyLength, 0);
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

  it("lists get_current_view without duplicating the zotero MCP server name", async function () {
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
      "get_item_detail",
      "get_item_notes",
      ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
      ZOTERO_MCP_TOOL_LIST_NOTE_PAYLOADS,
      ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
      ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
      ZOTERO_MCP_TOOL_PREPARE_PAPER_READING_CONTEXT,
      ZOTERO_MCP_TOOL_GET_MCP_STATUS,
      ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
      "update_item_fields",
      ZOTERO_MCP_TOOL_ADD_ITEM_TAGS,
      "remove_item_tags",
      "create_child_note",
      "update_note",
      ZOTERO_MCP_TOOL_CREATE_MARKDOWN_NOTE,
      ZOTERO_MCP_TOOL_UPDATE_MARKDOWN_NOTE,
      ZOTERO_MCP_TOOL_INGEST_PAPERS,
      "add_items_to_collection",
      "remove_items_from_collection",
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
    const updateFields = (response as any).result.tools.find(
      (tool: { name: string }) => tool.name === "update_item_fields",
    );
    assert.include(updateFields.description, "Permission-gated");
    assert.include(updateFields.description, "verify state");
    assert.deepEqual(updateFields.inputSchema.required, ["fields"]);
    const listItems = (response as any).result.tools.find(
      (tool: { name: string }) => tool.name === ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
    );
    assert.include(listItems.description, "paged summaries");
    assert.include(listItems.description, "do not call zotero MCP tools concurrently");
    const noteDetail = (response as any).result.tools.find(
      (tool: { name: string }) => tool.name === ZOTERO_MCP_TOOL_GET_NOTE_DETAIL,
    );
    assert.include(noteDetail.description, "bounded chunks");
    const notePayload = (response as any).result.tools.find(
      (tool: { name: string }) => tool.name === ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD,
    );
    assert.include(notePayload.description, "Decode one hidden workflow payload");
    const createMarkdownNote = (response as any).result.tools.find(
      (tool: { name: string }) =>
        tool.name === ZOTERO_MCP_TOOL_CREATE_MARKDOWN_NOTE,
    );
    assert.deepEqual(createMarkdownNote.inputSchema.required, ["title", "markdown"]);
    const ingestPapers = (response as any).result.tools.find(
      (tool: { name: string }) => tool.name === ZOTERO_MCP_TOOL_INGEST_PAPERS,
    );
    assert.deepEqual(ingestPapers.inputSchema.required, ["papers"]);
    assert.include(ingestPapers.description, "Permission-gated");
    assert.include(ingestPapers.description, "best-effort");
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
        resolveHostContext: () => {
          called = true;
          return {
            target: "library",
            libraryId: "1",
            selectionEmpty: true,
          };
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
    assert.strictEqual(status.recentRequests[0].error, "streamable_http_get_not_supported");
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
        resolveHostContext: () => ({
          target: "library",
          libraryId: "1",
          selectionEmpty: false,
          currentItem: {
            id: 42,
            key: "ABCD1234",
            title: "A Zotero Paper",
          },
        }),
        onToolCall: (event) => {
          observedTool = event.toolName;
        },
      },
    );

    assert.strictEqual(observedTool, ZOTERO_MCP_TOOL_GET_CURRENT_VIEW);
    assert.strictEqual(
      (response as any).result.structuredContent.hostContext.currentItem.title,
      "A Zotero Paper",
    );
    assert.include((response as any).result.content[0].text, "libraryId=1");
  });

  it("routes read tools through hostApi and returns structured content", async function () {
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
        resolveHostApi: () =>
          ({
            context: {
              getSelectedItems: () => [
                {
                  id: 1,
                  key: "READTOOL1",
                  libraryId: 1,
                  itemType: "journalArticle",
                  title: "Read Tool Paper",
                  creators: [],
                  year: "",
                  date: "",
                  publicationTitle: "",
                  tags: [],
                  collections: [],
                },
              ],
            },
          }) as any,
      },
    );

    assert.strictEqual((response as any).result.structuredContent.items[0].key, "READTOOL1");
    const text = toolText(response);
    assert.include(text, "READTOOL1");
    assert.include(text, "libraryId=1");
    assert.include(text, "type=journalArticle");
    assert.include(text, ZOTERO_MCP_TOOL_GET_ITEM_DETAIL);
    assertNotCountOnlyToolText(text);
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
        resolveHostApi: () =>
          ({
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
          }) as any,
      },
    );

    assert.strictEqual(observedArgs.limit, 1);
    const structured = (response as any).result.structuredContent;
    assert.strictEqual(structured.items[0].key, "PARENTKEY");
    assert.strictEqual(structured.items[0].noteCount, 2);
    assert.isTrue(structured.compact);
    assert.notProperty(structured.items[0], "creators");
    assert.notProperty(structured.items[0], "tags");
    assert.notProperty(structured.items[0], "collections");
    assert.notProperty(structured.items[0], "publicationTitle");
    assert.isTrue(structured.hasMore);
    assert.notProperty(structured.items[0], "notes");
    assert.notProperty(structured.items[0], "attachments");
    const text = toolText(response);
    assert.include(text, "PARENTKEY");
    assert.include(text, "libraryId=1");
    assert.include(text, "notes=2");
    assert.include(text, "attachments=1");
    assert.include(text, "hasMore=true");
    assert.include(text, "nextCursor=1");
    assert.include(text, "Use get_item_detail for full metadata");
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
        resolveHostApi: () =>
          ({
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
          }) as any,
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
        resolveHostApi: () =>
          ({
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
          }) as any,
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
        resolveHostApi: () =>
          ({
            library: {
              getItemNotes: async () => [
                {
                  id: 11,
                  key: "NOTEKEY1",
                  libraryId: 1,
                  title: "Long note",
                  textExcerpt: largeText.slice(0, 50),
                  textLength: largeText.length,
                  htmlLength: largeText.length + 7,
                },
              ],
            },
          }) as any,
      },
    );
    const notes = (notesResponse as any).result.structuredContent.notes;
    assert.strictEqual(notes[0].key, "NOTEKEY1");
    assert.strictEqual(notes[0].textLength, largeText.length);
    assert.notProperty(notes[0], "html");
    const notesText = toolText(notesResponse);
    assert.include(notesText, "NOTEKEY1");
    assert.include(notesText, "libraryId=1");
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
        resolveHostApi: () =>
          ({
            library: {
              getNoteDetail: async () => ({
                id: 11,
                key: "NOTEKEY1",
                libraryId: 1,
                title: "Long note",
                format: "text",
                content: largeText.slice(0, 12),
                offset: 0,
                nextOffset: 12,
                hasMore: true,
                totalChars: largeText.length,
                truncated: true,
              }),
            },
          }) as any,
      },
    );
    const note = (detailResponse as any).result.structuredContent.note;
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
        resolveHostApi: () =>
          ({
            library: {
              searchItems: async () => {
                throw new TypeError("backend exploded");
              },
            },
          }) as any,
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
        resolveHostApi: () =>
          ({
            library: {
              getItemAttachments: async () => [
                {
                  id: 4,
                  key: "ATTACHMD",
                  libraryId: 1,
                  title: "paper.md",
                  contentType: "text/markdown",
                  path: "C:\\Users\\leike\\Zotero\\storage\\ATTACHMD\\paper.md",
                  filename: "paper.md",
                },
                {
                  id: 2,
                  key: "ATTACH1",
                  libraryId: 1,
                  title: "paper.pdf",
                  contentType: "application/pdf",
                  path: "C:\\Users\\leike\\Zotero\\storage\\ATTACH1\\paper.pdf",
                  filename: "paper.pdf",
                },
                {
                  id: 3,
                  key: "ATTACH2",
                  libraryId: 1,
                  title: "linked record",
                  contentType: "",
                  path: "",
                  filename: "",
                },
              ],
            },
          }) as any,
      },
    );

    const attachments = (response as any).result.structuredContent.attachments;
    assert.strictEqual(attachments[0].access.mode, "local-path");
    assert.strictEqual(attachments[0].access.locality, "same-host");
    assert.include(attachments[0].access.path, "paper.md");
    assert.strictEqual(attachments[0].contentRole, "markdown-fulltext");
    assert.strictEqual(attachments[0].readability, "direct-text");
    assert.strictEqual(attachments[0].recommendedForReading, true);
    assert.isAbove(attachments[0].rank, attachments[1].rank);
    assert.isUndefined(attachments[0].access.url);
    assert.strictEqual(attachments[2].access.mode, "unavailable");
    assert.notProperty(attachments[0], "content");
    const text = toolText(response);
    assert.include(text, "Recommended for reading");
    assert.include(text, "ATTACHMD");
    assert.include(text, "contentRole=markdown-fulltext");
    assert.include(text, "recommendedForReading=true");
    assert.include(text, "ATTACH1");
    assert.include(text, "paper.pdf");
    assert.include(text, "contentType=application/pdf");
    assert.include(text, "access.mode=local-path");
    assert.include(text, "locality=same-host");
    assert.include(text, "File content is not returned");
    assert.include(text, "ATTACH2");
    assert.include(text, "access.mode=unavailable");
    assertNotCountOnlyToolText(text);
  });

  it("prepares paper reading context from a single selected item", async function () {
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "reading-context",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_PREPARE_PAPER_READING_CONTEXT,
          arguments: {},
        },
      },
      {
        resolveHostApi: () =>
          ({
            context: {
              getCurrentView: () => ({
                target: "library",
                libraryId: 1,
                selectionEmpty: false,
                selectedItems: [
                  {
                    id: 1,
                    key: "PAPER1",
                    libraryId: 1,
                    itemType: "journalArticle",
                    title: "Context Paper",
                    creators: ["Lin"],
                    year: "2021",
                    date: "2021",
                    publicationTitle: "Test Journal",
                    tags: [],
                    collections: [],
                  },
                ],
              }),
              getSelectedItems: () => [],
            },
            library: {
              getItemDetail: async () => ({
                id: 1,
                key: "PAPER1",
                libraryId: 1,
                itemType: "journalArticle",
                title: "Context Paper",
                creators: ["Lin"],
                year: "2021",
                date: "2021",
                publicationTitle: "Test Journal",
                tags: ["detr"],
                collections: [],
                fields: {
                  DOI: "10.1234/example",
                },
                noteCount: 1,
                attachmentCount: 2,
                relatedItemKeys: [],
              }),
              getItemNotes: async () => [
                {
                  id: 10,
                  key: "NOTE1",
                  libraryId: 1,
                  title: "Digest",
                  textExcerpt: "Key finding excerpt",
                  textLength: 120,
                },
              ],
              listNotePayloads: async () => [
                {
                  payloadType: "digest-markdown",
                  noteKind: "digest",
                  version: "1",
                  encoding: "base64",
                  estimatedSize: 200,
                  format: "markdown",
                },
              ],
              getItemAttachments: async () => [
                {
                  id: 2,
                  key: "FULLMD",
                  libraryId: 1,
                  title: "main-fulltext.md",
                  contentType: "text/markdown",
                  path: "C:\\Zotero\\storage\\FULLMD\\main-fulltext.md",
                  filename: "main-fulltext.md",
                },
                {
                  id: 3,
                  key: "PDF1",
                  libraryId: 1,
                  title: "paper.pdf",
                  contentType: "application/pdf",
                  path: "C:\\Zotero\\storage\\PDF1\\paper.pdf",
                  filename: "paper.pdf",
                },
              ],
            },
          }) as any,
      },
    );

    const structured = (response as any).result.structuredContent;
    assert.strictEqual(structured.source, "single-selection");
    assert.strictEqual(structured.item.key, "PAPER1");
    assert.strictEqual(structured.notes[0].key, "NOTE1");
    assert.strictEqual(
      structured.notePayloads[0].payloads[0].readableAsMarkdown,
      true,
    );
    assert.strictEqual(structured.recommendedAttachment.key, "FULLMD");
    assert.strictEqual(
      structured.recommendedAttachment.contentRole,
      "markdown-fulltext",
    );
    assert.notProperty(structured.recommendedAttachment, "content");
    const text = toolText(response);
    assert.include(text, "Prepared Zotero paper reading context");
    assert.include(text, "recommendedAttachment");
    assert.include(text, "FULLMD");
    assert.include(text, "digest-markdown");
    assert.include(text, ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD);
    assert.include(text, "Attachment file content is not returned");
  });

  it("does not guess a paper reading context for multiple selected items", async function () {
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "reading-context-multi",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_PREPARE_PAPER_READING_CONTEXT,
          arguments: {},
        },
      },
      {
        resolveHostApi: () =>
          ({
            context: {
              getCurrentView: () => ({
                target: "library",
                libraryId: 1,
                selectionEmpty: false,
                selectedItems: [
                  {
                    id: 1,
                    key: "PAPER1",
                    libraryId: 1,
                    itemType: "journalArticle",
                    title: "One",
                    creators: [],
                    year: "",
                    date: "",
                    publicationTitle: "",
                    tags: [],
                    collections: [],
                  },
                  {
                    id: 2,
                    key: "PAPER2",
                    libraryId: 1,
                    itemType: "journalArticle",
                    title: "Two",
                    creators: [],
                    year: "",
                    date: "",
                    publicationTitle: "",
                    tags: [],
                    collections: [],
                  },
                ],
              }),
              getSelectedItems: () => [],
            },
          }) as any,
      },
    );

    assert.strictEqual((response as any).error.code, -32602);
    assert.include((response as any).error.message, "multiple selected");
    assert.strictEqual(
      (response as any).error.data.details.candidates[0].item.key,
      "PAPER1",
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
    assert.strictEqual(result.structuredContent.error_code, "zotero_item_not_found");
    assert.strictEqual(result.structuredContent.retryable, false);
    assert.strictEqual(result.structuredContent.tool, ZOTERO_MCP_TOOL_GET_ITEM_NOTES);
  });

  it("lists and reads Zotero note payloads for workflow notes", async function () {
    const hostApi = {
      library: {
        listNotePayloads: async () => [
          {
            payloadType: "digest-markdown",
            noteKind: "digest",
            version: "1",
            encoding: "base64",
            estimatedSize: 42,
            format: "markdown",
          },
          {
            payloadType: "references-json",
            noteKind: "references",
            version: "1",
            encoding: "base64",
            estimatedSize: 120,
            format: "json",
          },
        ],
        getNotePayload: async () => ({
          payloadType: "digest-markdown",
          noteKind: "digest",
          version: "1",
          encoding: "base64",
          estimatedSize: 42,
          format: "markdown",
          markdown: "# Digest\n\nBody",
          payload: {
            version: 1,
            content: "# Digest\n\nBody",
          },
          content: "# Digest",
          offset: 0,
          nextOffset: 8,
          totalChars: 14,
          hasMore: true,
          truncated: true,
        }),
      },
    } as any;

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
        resolveHostApi: () => hostApi,
      },
    );
    const listedText = toolText(listed);
    assert.include(listedText, "digest-markdown");
    assert.include(listedText, "references-json");
    assert.include(listedText, ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD);
    assert.deepEqual(
      (listed as any).result.structuredContent.payloads.map(
        (entry: { payloadType: string }) => entry.payloadType,
      ),
      ["digest-markdown", "references-json"],
    );

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
            maxChars: 8,
          },
        },
      },
      {
        resolveHostApi: () => hostApi,
      },
    );
    const detailPayload = (detail as any).result.structuredContent.payload;
    assert.strictEqual(detailPayload.payloadType, "digest-markdown");
    assert.strictEqual(detailPayload.markdown, "# Digest\n\nBody");
    assert.strictEqual(detailPayload.hasMore, true);
    assert.include(toolText(detail), "nextOffset=8");
    assert.include(toolText(detail), "hasMore=true");
  });

  it("previews mutations without requesting permission or executing", async function () {
    let executeCalls = 0;
    let permissionCalls = 0;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "preview",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
          arguments: {
            request: {
              operation: "item.addTags",
              target: 1,
              tags: ["mcp"],
            },
          },
        },
      },
      {
        resolveHostApi: () =>
          ({
            mutations: {
              preview: async () => ({
                ok: true,
                operation: "item.addTags",
                targetRefs: [],
                summary: "Add 1 tag.",
                warnings: [],
                requiresConfirmation: true,
              }),
              execute: async () => {
                executeCalls += 1;
                throw new Error("should not execute");
              },
            },
          }) as any,
        requestToolPermission: () => {
          permissionCalls += 1;
          return true;
        },
      },
    );

    assert.strictEqual(executeCalls, 0);
    assert.strictEqual(permissionCalls, 0);
    assert.isFalse((response as any).result.structuredContent.executed);
    assert.strictEqual((response as any).result.structuredContent.preview.summary, "Add 1 tag.");
    const text = toolText(response);
    assert.include(text, "executed=false");
    assert.include(text, "permission=not_requested");
    assert.include(text, "No Zotero write was executed");
  });

  it("executes write tools only after permission approval", async function () {
    let executeCalls = 0;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "write",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_ADD_ITEM_TAGS,
          arguments: {
            id: 1,
            tags: ["approved"],
          },
        },
      },
      {
        resolveHostApi: () =>
          ({
            mutations: {
              preview: async () => ({
                ok: true,
                operation: "item.addTags",
                targetRefs: [],
                summary: "Add 1 tag.",
                warnings: [],
                requiresConfirmation: true,
              }),
              execute: async () => {
                executeCalls += 1;
                return {
                  ok: true,
                  operation: "item.addTags",
                  targetRefs: [],
                  summary: "Add 1 tag.",
                  warnings: [],
                  requiresConfirmation: true,
                  result: {
                    items: [],
                  },
                };
              },
            },
          }) as any,
        requestToolPermission: () => ({
          outcome: "approved",
        }),
      },
    );

    assert.strictEqual(executeCalls, 1);
    assert.isTrue((response as any).result.structuredContent.executed);
    assert.strictEqual(
      (response as any).result.structuredContent.permission.outcome,
      "approved",
    );
    assert.include(
      (response as any).result.structuredContent.verificationHint,
      "Verify with",
    );
    assert.include(
      (response as any).result.structuredContent.verificationHint,
      ZOTERO_MCP_TOOL_LIST_LIBRARY_ITEMS,
    );
    const text = toolText(response);
    assert.include(text, "permission=approved");
    assert.include(text, "executed=true");
    assert.include(text, "Verify:");
  });

  it("ingests papers with duplicate detection and best-effort PDF attachment", async function () {
    const doi = "10.5555/zs.mcp.ingest.001";
    const first = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-first",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_INGEST_PAPERS,
          arguments: {
            papers: [
              {
                title: "Zotero Skills MCP Ingest Paper",
                authors: ["Ada Lovelace", "Grace Hopper"],
                year: 2026,
                doi,
                landingUrl: "https://example.test/papers/zs-mcp-ingest",
                pdfUrl: "https://example.test/papers/zs-mcp-ingest.pdf",
                venue: "Journal of Agentic Libraries",
              },
            ],
          },
        },
      },
      {
        requestToolPermission: () => true,
      },
    );

    const firstIngest = (first as any).result.structuredContent.execution.result.ingest;
    assert.isTrue((first as any).result.structuredContent.executed);
    assert.strictEqual(firstIngest.created, 1);
    assert.strictEqual(firstIngest.existing, 0);
    assert.strictEqual(firstIngest.failed, 0);
    assert.strictEqual(firstIngest.pdfAttached, 1);
    assert.strictEqual(firstIngest.results[0].attachmentStatus, "attached");
    assert.strictEqual(firstIngest.results[0].item.title, "Zotero Skills MCP Ingest Paper");

    const duplicate = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-duplicate",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_INGEST_PAPERS,
          arguments: {
            papers: [
              {
                title: "Zotero Skills MCP Ingest Paper",
                doi,
              },
            ],
          },
        },
      },
      {
        requestToolPermission: () => true,
      },
    );

    const duplicateIngest = (duplicate as any).result.structuredContent.execution.result.ingest;
    assert.strictEqual(duplicateIngest.created, 0);
    assert.strictEqual(duplicateIngest.existing, 1);
    assert.strictEqual(duplicateIngest.failed, 0);
    assert.strictEqual(duplicateIngest.pdfSkipped, 1);
  });

  it("keeps paper ingest successful when PDF attachment import fails", async function () {
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-pdf-fail",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_INGEST_PAPERS,
          arguments: {
            papers: [
              {
                title: "Zotero Skills MCP Ingest PDF Failure",
                doi: "10.5555/zs.mcp.ingest.002",
                pdfUrl: "https://example.test/fail?paper=zs-mcp-ingest",
              },
            ],
          },
        },
      },
      {
        requestToolPermission: () => true,
      },
    );

    const ingest = (response as any).result.structuredContent.execution.result.ingest;
    assert.strictEqual(ingest.created, 1);
    assert.strictEqual(ingest.failed, 0);
    assert.strictEqual(ingest.pdfFailed, 1);
    assert.strictEqual(ingest.results[0].status, "created");
    assert.strictEqual(ingest.results[0].attachmentStatus, "failed");
    assert.strictEqual(ingest.results[0].error.code, "pdf_attachment_failed");
  });

  it("does not execute paper ingest when permission is denied", async function () {
    let executeCalls = 0;
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "ingest-denied",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_INGEST_PAPERS,
          arguments: {
            papers: [
              {
                title: "Denied Paper Ingest",
                doi: "10.5555/zs.mcp.ingest.denied",
              },
            ],
          },
        },
      },
      {
        resolveHostApi: () =>
          ({
            mutations: {
              preview: async (mutation: any) => ({
                ok: true,
                operation: mutation.operation,
                targetRefs: [],
                summary: "Ingest 1 paper.",
                warnings: [],
                requiresConfirmation: true,
              }),
              execute: async () => {
                executeCalls += 1;
                throw new Error("should not execute");
              },
            },
          }) as any,
        requestToolPermission: () => ({
          outcome: "denied",
          reason: "test denial",
        }),
      },
    );

    assert.strictEqual(executeCalls, 0);
    assert.isFalse((response as any).result.structuredContent.executed);
    assert.strictEqual(
      (response as any).result.structuredContent.permission.outcome,
      "denied",
    );
  });

  it("creates markdown-backed notes through permission-gated mutation flow", async function () {
    let mutationContent = "";
    const response = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "create-md-note",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_CREATE_MARKDOWN_NOTE,
          arguments: {
            parent: {
              key: "PARENT1",
              libraryId: 1,
            },
            title: "Agent Note",
            markdown: "# Agent Note\n\nBody",
          },
        },
      },
      {
        resolveHostApi: () =>
          ({
            mutations: {
              preview: async (mutation: any) => {
                mutationContent = mutation.content;
                return {
                  ok: true,
                  operation: mutation.operation,
                  targetRefs: [],
                  summary: "Create markdown note.",
                  warnings: [],
                  requiresConfirmation: true,
                };
              },
              execute: async (mutation: any) => ({
                ok: true,
                operation: mutation.operation,
                targetRefs: [],
                summary: "Created markdown note.",
                warnings: [],
                requiresConfirmation: true,
                result: {
                  notes: [
                    {
                      key: "NOTE1",
                      libraryId: 1,
                      title: "Agent Note",
                    },
                  ],
                },
              }),
            },
          }) as any,
        requestToolPermission: () => ({
          outcome: "approved",
        }),
      },
    );

    assert.include(mutationContent, 'data-zs-note-kind="custom"');
    assert.include(mutationContent, 'data-zs-payload="custom-markdown"');
    assert.include(mutationContent, 'data-zs-encoding="base64"');
    assert.isTrue((response as any).result.structuredContent.executed);
    assert.strictEqual(
      (response as any).result.structuredContent.payloadType,
      "custom-markdown",
    );
    assert.include(toolText(response), "payloadType=custom-markdown");
    assert.include(toolText(response), ZOTERO_MCP_TOOL_GET_NOTE_PAYLOAD);
  });

  it("updates markdown-backed notes only when the expected payload matches", async function () {
    let executeCalls = 0;
    const hostApi = {
      library: {
        listNotePayloads: async () => [
          {
            payloadType: "conversation-note-markdown",
            noteKind: "conversation-note",
            version: "1",
            encoding: "base64",
            estimatedSize: 20,
            format: "markdown",
          },
        ],
      },
      mutations: {
        preview: async (mutation: any) => ({
          ok: true,
          operation: mutation.operation,
          targetRefs: [],
          summary: "Update markdown note.",
          warnings: [],
          requiresConfirmation: true,
        }),
        execute: async (mutation: any) => {
          executeCalls += 1;
          assert.include(mutation.content, 'data-zs-payload="conversation-note-markdown"');
          return {
            ok: true,
            operation: mutation.operation,
            targetRefs: [],
            summary: "Updated markdown note.",
            warnings: [],
            requiresConfirmation: true,
            result: {
              notes: [],
            },
          };
        },
      },
    } as any;
    const updated = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "update-md-note",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_UPDATE_MARKDOWN_NOTE,
          arguments: {
            note: {
              key: "NOTE1",
              libraryId: 1,
            },
            title: "Conversation Note",
            markdown: "# Updated",
            expectedPayloadType: "conversation-note-markdown",
          },
        },
      },
      {
        resolveHostApi: () => hostApi,
        requestToolPermission: () => true,
      },
    );
    assert.strictEqual(executeCalls, 1);
    assert.isTrue((updated as any).result.structuredContent.executed);

    const rejected = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "reject-md-note",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_UPDATE_MARKDOWN_NOTE,
          arguments: {
            note: {
              key: "NOTE1",
              libraryId: 1,
            },
            markdown: "# Updated",
            expectedPayloadType: "references-json",
          },
        },
      },
      {
        resolveHostApi: () => hostApi,
        requestToolPermission: () => true,
      },
    );
    assert.strictEqual((rejected as any).error.code, -32602);
    assert.include((rejected as any).error.message, "expected markdown payload not found");
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
          name: ZOTERO_MCP_TOOL_ADD_ITEM_TAGS,
          arguments: {
            id: 1,
            tags: ["denied"],
          },
        },
      },
      {
        resolveHostApi: () =>
          ({
            mutations: {
              preview: async () => ({
                ok: true,
                operation: "item.addTags",
                targetRefs: [],
                summary: "Add 1 tag.",
                warnings: [],
                requiresConfirmation: true,
              }),
              execute: async () => {
                executeCalls += 1;
                throw new Error("should not execute");
              },
            },
          }) as any,
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
          name: ZOTERO_MCP_TOOL_ADD_ITEM_TAGS,
          arguments: {
            id: 1,
            tags: ["unavailable"],
          },
        },
      },
      {
        resolveHostApi: () =>
          ({
            mutations: {
              preview: async () => ({
                ok: true,
                operation: "item.addTags",
                targetRefs: [],
                summary: "Add 1 tag.",
                warnings: [],
                requiresConfirmation: true,
              }),
              execute: async () => {
                executeCalls += 1;
                throw new Error("should not execute");
              },
            },
          }) as any,
      },
    );

    assert.strictEqual(executeCalls, 0);
    assert.isFalse((denied as any).result.structuredContent.executed);
    assert.strictEqual(
      (denied as any).result.structuredContent.permission.reason,
      "user_denied",
    );
    assert.strictEqual(
      (unavailable as any).result.structuredContent.permission.outcome,
      "unavailable",
    );
    assert.include(toolText(denied), "permission=denied");
    assert.include(toolText(denied), "executed=false");
    assert.include(toolText(denied), "No Zotero write was executed");
    assert.include(toolText(unavailable), "permission=unavailable");
  });

  it("is compatible with the official MCP Streamable HTTP client", async function () {
    if (isRealZoteroRuntime()) {
      this.skip();
    }
    this.timeout(10000);
    const token = configureZoteroMcpServerForTests({
      resolveHostContext: () => ({
        target: "library",
        libraryId: "7",
        selectionEmpty: false,
        currentItem: {
          id: 99,
          key: "SDKTEST1",
          title: "SDK Compatibility Paper",
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

  it("serializes concurrent Streamable HTTP tool calls and records timing diagnostics", async function () {
    const token = configureZoteroMcpServerForTests({
      resolveHostContext: () => ({
        target: "library",
        libraryId: "1",
        selectionEmpty: true,
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
    assert.isAtLeast(toolLogs[1].queueWaitMs, 0);
  });

  it("accepts one running and eight pending tool calls under the default queue policy", async function () {
    let releaseFirst!: () => void;
    let shouldBlock = true;
    const token = configureZoteroMcpServerForTests({
      resolveHostContext: () => ({
        target: "library",
        libraryId: "queue-policy",
        selectionEmpty: true,
      }),
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
          id: `queue-${index}`,
          method: "tools/call",
          params: {
            name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
            arguments: {},
          },
        }),
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    const queuedStatus = getZoteroMcpServerStatus();
    assert.deepEqual(queuedStatus.queuePolicy, {
      runningLimit: 1,
      pendingLimit: 8,
      queueTimeoutMs: 30000,
      runningTimeoutMs: 45000,
    });
    assert.strictEqual(queuedStatus.queueState.running, 1);
    assert.strictEqual(queuedStatus.queueState.pending, 8);
    releaseFirst();

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
      toolLogs.map((entry) => entry.queuePosition),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
    assert.deepEqual(
      toolLogs.map((entry) => entry.toolOutcome),
      Array(9).fill("success"),
    );
  });

  it("returns a structured JSON-RPC error when the tool-call queue is full", async function () {
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
        body: bodyFor(`queue-full-${index}`),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    releaseFirst();
    const responses = await Promise.all(requests);
    const parsed = responses.map(parseJsonBody);
    const full = parsed.find(
      (entry) => entry.error?.data?.code === "zotero_mcp_queue_full",
    );

    assert.exists(full);
    assert.strictEqual(full.error.code, -32001);
    const logs = getZoteroMcpServerStatus().recentRequests.filter(
      (entry) => entry.jsonrpcMethod === "tools/call",
    );
    assert.isAtLeast(logs.length, 10);
    const fullLog = logs.find((entry) => entry.limitReason === "queue_full");
    assert.exists(fullLog);
    assert.strictEqual(fullLog?.toolOutcome, "error");
    assert.strictEqual(fullLog?.toolErrorName, "ZoteroMcpQueueFullError");
    assert.strictEqual(getZoteroMcpServerStatus().toolCallCount, 9);
  });

  it("returns a structured JSON-RPC error when a queued tool call times out", async function () {
    let releaseFirst!: () => void;
    let shouldBlock = true;
    const token = configureZoteroMcpServerForTests({
      queueTimeoutMs: 10,
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
    const makeRequest = (id: string) =>
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

    const first = makeRequest("timeout-first");
    const second = makeRequest("timeout-second");
    await new Promise((resolve) => setTimeout(resolve, 40));
    const secondResponse = parseJsonBody(await second);
    releaseFirst();
    const firstResponse = parseJsonBody(await first);

    assert.notProperty(firstResponse, "error");
    assert.strictEqual(secondResponse.error.code, -32002);
    assert.strictEqual(
      secondResponse.error.data.code,
      "zotero_mcp_queue_timeout",
    );
    const timeoutLog = getZoteroMcpServerStatus().recentRequests.find(
      (entry) => entry.limitReason === "queue_timeout",
    );
    assert.exists(timeoutLog);
    assert.strictEqual(timeoutLog?.toolOutcome, "error");
    assert.strictEqual(timeoutLog?.toolErrorName, "ZoteroMcpQueueTimeoutError");
    assert.strictEqual(getZoteroMcpServerStatus().toolCallCount, 1);
  });

  it("does not queue tools/list while a tool call is running", async function () {
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
    assert.strictEqual(toolsLog?.queueWaitMs, 0);
    assert.strictEqual(toolsLog?.queuePosition, 0);
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

  it("retains the single host-call slot until a timed-out tool really settles", async function () {
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
    const makeRequest = (id: string) =>
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

    const first = makeRequest("retained-timeout-first");
    await new Promise((resolve) => setTimeout(resolve, 40));
    const firstResponse = parseJsonBody(await first);
    const second = makeRequest("retained-timeout-second");
    await new Promise((resolve) => setTimeout(resolve, 20));
    const retainedStatus = getZoteroMcpServerStatus();

    assert.strictEqual(firstResponse.error.data.code, "zotero_mcp_tool_timeout");
    assert.strictEqual(retainedStatus.queueState.running, 1);
    assert.strictEqual(retainedStatus.queueState.pending, 1);
    assert.isTrue(retainedStatus.guardState.timedOutButStillRunning);
    assert.include(retainedStatus.guardState.retryGuidance, "wait");

    releaseFirst();
    const secondResponse = parseJsonBody(await second);
    assert.notProperty(secondResponse, "error");
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
    assert.strictEqual(open.error.data.toolName, ZOTERO_MCP_TOOL_GET_CURRENT_VIEW);
    assert.strictEqual(failures, 3);
    const breaker = getZoteroMcpServerStatus().guardState.circuitBreakers.find(
      (entry) => entry.toolName === ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
    );
    assert.strictEqual(breaker?.state, "open");
    assert.strictEqual(breaker?.failureCount, 3);
  });

  it("exposes safe MCP guard and queue status through a non-queued status tool", async function () {
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
        id: "status-tool",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_MCP_STATUS,
          arguments: {},
        },
      }),
    });
    const parsed = parseJsonBody(raw);
    const status = parsed.result.structuredContent.status;

    assert.strictEqual(parsed.result.structuredContent.tool, ZOTERO_MCP_TOOL_GET_MCP_STATUS);
    assert.deepEqual(status.queuePolicy.runningLimit, 1);
    assert.property(status, "guardState");
    assert.isArray(status.recentRuntimeLogs);
    assert.notInclude(JSON.stringify(status), token);
    const logs = getZoteroMcpServerStatus().recentRequests.filter(
      (entry) => entry.jsonrpcToolName === ZOTERO_MCP_TOOL_GET_MCP_STATUS,
    );
    assert.strictEqual(logs[0]?.queuePosition, 0);
  });

  it("records host-side MCP runtime logs for a successful tool call", async function () {
    const token = configureZoteroMcpServerForTests({
      resolveHostContext: () => ({
        target: "library",
        libraryId: "1",
        selectionEmpty: true,
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
    const requestIds = new Set(logs.map((entry) => entry.requestId).filter(Boolean));
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
    assert.include(logs.map((entry) => entry.stage), "tool.failed");
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
    assert.include(logs.map((entry) => entry.stage), "response.serialize.failed");
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
    assert.include(health.tooltip.join("\n"), "lastRuntimeFailure=response.write.failed");
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
      ZOTERO_MCP_TOOL_SYNTHESIS_LIST_TOPICS,
    );
    assert.include(
      JSON.stringify(finished?.details || {}),
      ZOTERO_MCP_TOOL_SYNTHESIS_GET_LIBRARY_INDEX,
    );
    assert.include(
      JSON.stringify(finished?.details || {}),
      ZOTERO_MCP_TOOL_SYNTHESIS_RESOLVE_RESOLVER,
    );
    assert.include(
      JSON.stringify(finished?.details || {}),
      ZOTERO_MCP_TOOL_SYNTHESIS_EXPORT_FILTERED_PAPER_ARTIFACTS,
    );
    assert.match(JSON.stringify(finished?.details || {}), /"responseBytes":\d+/);
    assert.match(JSON.stringify(finished?.details || {}), /"contentLength":\d+/);
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

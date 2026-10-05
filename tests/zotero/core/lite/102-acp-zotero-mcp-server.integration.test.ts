import { assert } from "chai";
import { nativeFixtureMutations } from "../../../helpers/nativeFixtureMutations";
import {
  ensureZoteroMcpServer,
  getZoteroMcpServerStatus,
  shutdownZoteroMcpServer,
} from "../../../../src/modules/hostBridge/mcp/zoteroMcpServer";
import {
  ensureHostBridgeServer,
  shutdownHostBridgeServer,
} from "../../../../src/modules/hostBridge/server/hostBridgeServer";
import { ZOTERO_MCP_TOOL_GET_CURRENT_VIEW } from "../../../../src/modules/hostBridge/mcp/zoteroMcpProtocol";
import {
  executeHostBridgeCapability,
  type HostBridgeCapabilityContext,
} from "../../../../src/modules/hostBridgeCapabilityRegistry";
import {
  createZoteroHostCapabilityBroker,
  type ZoteroHostCapabilityBroker,
} from "../../../../src/modules/zoteroHostCapabilityBroker";
import { createNativeSynthesisLibraryLexicalPort } from "../../../../src/modules/synthesisClient/nativeComposition";
import { rebuildSynthesisSidecarLaunchConfig } from "../../../../packages/synthesis-contracts/src";
import { readRuntimeTextFile } from "../../../../src/modules/runtimePersistence";
import { joinPath } from "../../../../src/utils/path";
import {
  listSidecarDiscoveries,
  waitUntil,
} from "../../../../scripts/system-e2e/healthGate";

// MCP exposes every mirrored Host Bridge capability under its capability
// name; the short aliases exported for older clients are not tool names.
const LIBRARY_ITEM_SEARCH_TOOL = "library.search_items";

type McpSearchResult = {
  result?: {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: Record<string, any>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
};

function isRealZoteroRuntime() {
  const runtime = globalThis as typeof globalThis & {
    Zotero?: {
      __parity?: {
        runtime?: string;
      };
    };
    XMLHttpRequest?: typeof XMLHttpRequest;
  };
  return (
    !!runtime.Zotero &&
    runtime.Zotero.__parity?.runtime !== "node-mock" &&
    typeof runtime.XMLHttpRequest === "function"
  );
}

function requestJson(args: {
  url: string;
  token: string;
  payload: unknown;
  accept?: string;
}) {
  return rawHttpRequest({
    url: args.url,
    token: args.token,
    body: JSON.stringify(args.payload),
    accept: args.accept || "application/json, text/event-stream",
  });
}

function requestGet(args: { url: string; token: string }) {
  return rawGetRequest({
    url: args.url,
    token: args.token,
    accept: "text/event-stream",
  });
}

function getComponents() {
  const runtime = globalThis as any;
  return (
    runtime.Components ||
    runtime.ChromeUtils?.importESModule?.(
      "resource://gre/modules/Services.sys.mjs",
    )?.Components
  );
}

function createScriptableInputStream(inputStream: any) {
  const components = getComponents();
  const factory =
    components?.classes?.["@mozilla.org/scriptableinputstream;1"] ||
    (globalThis as any).Cc?.["@mozilla.org/scriptableinputstream;1"];
  const iface =
    components?.interfaces?.nsIScriptableInputStream ||
    (globalThis as any).Ci?.nsIScriptableInputStream;
  const stream = factory.createInstance(iface);
  stream.init(inputStream);
  return stream;
}

function openSocketTransport(host: string, port: number) {
  const components = getComponents();
  const factory =
    components?.classes?.["@mozilla.org/network/socket-transport-service;1"] ||
    (globalThis as any).Cc?.["@mozilla.org/network/socket-transport-service;1"];
  const iface =
    components?.interfaces?.nsISocketTransportService ||
    (globalThis as any).Ci?.nsISocketTransportService;
  const service = factory.getService(iface);
  return service.createTransport([], host, port, null, null);
}

function parseRawHttpResponse(raw: string) {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
  const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
  const headers: Record<string, string> = {};
  for (const line of head.split("\r\n").slice(1)) {
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    headers[line.slice(0, separator).trim().toLowerCase()] = line
      .slice(separator + 1)
      .trim();
  }
  return {
    status,
    text: body,
    contentType: headers["content-type"] || "",
  };
}

function parseJsonRpcMethod(body: string) {
  try {
    const payload = JSON.parse(body) as { method?: unknown };
    return typeof payload.method === "string" ? payload.method : "";
  } catch {
    return "";
  }
}

async function waitForRequestLog(method: string) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 1000) {
    const status = getZoteroMcpServerStatus();
    const entry = [...status.recentRequests]
      .reverse()
      .find((request) => request.jsonrpcMethod === method);
    if (entry) {
      return entry;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return undefined;
}

function responseFromRequestLog(entry: {
  status: number;
  responseContentType?: string;
}) {
  return {
    status: entry.status,
    text: "",
    contentType: entry.responseContentType || "",
  };
}

async function rawHttpRequest(args: {
  url: string;
  token: string;
  body: string;
  accept: string;
}) {
  const url = new URL(args.url);
  const port = Number(url.port || 80);
  const path = `${url.pathname || "/"}${url.search || ""}`;
  const bodyLength = new TextEncoder().encode(args.body).length;
  const request = [
    `POST ${path} HTTP/1.1`,
    `Host: ${url.hostname}:${port}`,
    `Authorization: Bearer ${args.token}`,
    "Content-Type: application/json",
    `Accept: ${args.accept}`,
    `Content-Length: ${bodyLength}`,
    "Connection: close",
    "",
    args.body,
  ].join("\r\n");
  const transport = openSocketTransport(url.hostname, port);
  const output = transport.openOutputStream(0, 0, 0);
  output.write(request, request.length);
  output.flush?.();
  const input = createScriptableInputStream(transport.openInputStream(0, 0, 0));
  let raw = "";
  const jsonrpcMethod = parseJsonRpcMethod(args.body);
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    let available = 0;
    try {
      available = Number(input.available?.() || 0);
    } catch (error) {
      if (!raw) {
        const entry = await waitForRequestLog(jsonrpcMethod);
        if (entry) {
          return responseFromRequestLog(entry);
        }
        const status = getZoteroMcpServerStatus();
        throw new Error(
          `raw TCP input stream closed before response; serverStatus=${JSON.stringify(status)}`,
        );
      }
      throw error;
    }
    if (available <= 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      continue;
    }
    raw += input.read(available);
    if (raw.includes("\r\n\r\n")) {
      const parsed = parseRawHttpResponse(raw);
      const length = Number(
        raw.match(/\r\ncontent-length:\s*(\d+)/i)?.[1] || 0,
      );
      if (parsed.text.length >= length) {
        break;
      }
    }
  }
  input.close?.();
  transport.close?.(0);
  if (!raw) {
    const entry = await waitForRequestLog(jsonrpcMethod);
    if (entry) {
      return responseFromRequestLog(entry);
    }
    const status = getZoteroMcpServerStatus();
    throw new Error(
      `raw TCP HTTP request returned no response; serverStatus=${JSON.stringify(status)}`,
    );
  }
  return parseRawHttpResponse(raw);
}

async function rawGetRequest(args: {
  url: string;
  token: string;
  accept: string;
}) {
  const url = new URL(args.url);
  const port = Number(url.port || 80);
  const path = `${url.pathname || "/"}${url.search || ""}`;
  const request = [
    `GET ${path} HTTP/1.1`,
    `Host: ${url.hostname}:${port}`,
    `Authorization: Bearer ${args.token}`,
    `Accept: ${args.accept}`,
    "Connection: keep-alive",
    "",
    "",
  ].join("\r\n");
  const transport = openSocketTransport(url.hostname, port);
  const output = transport.openOutputStream(0, 0, 0);
  output.write(request, request.length);
  output.flush?.();
  const input = createScriptableInputStream(transport.openInputStream(0, 0, 0));
  let raw = "";
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    let available = 0;
    try {
      available = Number(input.available?.() || 0);
    } catch (error) {
      if (!raw) {
        const status = getZoteroMcpServerStatus();
        throw new Error(
          `raw TCP GET input stream closed before response; serverStatus=${JSON.stringify(status)}`,
        );
      }
      throw error;
    }
    if (available <= 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      continue;
    }
    raw += input.read(available);
    if (raw.includes("\r\n\r\n")) {
      const parsed = parseRawHttpResponse(raw);
      const length = Number(
        raw.match(/\r\ncontent-length:\s*(\d+)/i)?.[1] || 0,
      );
      if (parsed.text.length >= length) {
        break;
      }
    }
    if (raw.includes("streamable_http_get_not_supported")) {
      break;
    }
  }
  input.close?.();
  transport.close?.(0);
  if (!raw) {
    const status = getZoteroMcpServerStatus();
    throw new Error(
      `raw TCP GET request returned no response; serverStatus=${JSON.stringify(status)}`,
    );
  }
  return parseRawHttpResponse(raw);
}

function latestRequest(method: string) {
  const status = getZoteroMcpServerStatus();
  const entry = [...status.recentRequests]
    .reverse()
    .find((request) => request.jsonrpcMethod === method);
  assert.exists(entry, `expected ${method} request log`);
  return entry!;
}

async function startMcpEndpoint(broker?: ZoteroHostCapabilityBroker) {
  const descriptor = await ensureZoteroMcpServer({
    hostBridgeStatus: await ensureHostBridgeServer(),
    resolveZoteroHostCapabilityBroker: broker ? () => broker : undefined,
  });
  const authHeader = descriptor.headers.find(
    (entry) => entry.name.toLowerCase() === "authorization",
  );
  const token = String(authHeader?.value || "").replace(/^Bearer\s+/i, "");
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { url: descriptor.url, token };
}

function parseJsonRpcPayload(response: { text: string; contentType: string }) {
  if (response.contentType.includes("text/event-stream")) {
    const events = response.text
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .filter(Boolean);
    return JSON.parse(events[events.length - 1] || "{}") as McpToolCallResult;
  }
  return JSON.parse(response.text) as McpToolCallResult;
}

async function callLibrarySearchTool(
  endpoint: { url: string; token: string },
  id: string,
  args: unknown,
): Promise<McpSearchResult> {
  const response = await requestJson({
    url: endpoint.url,
    token: endpoint.token,
    payload: {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name: LIBRARY_ITEM_SEARCH_TOOL, arguments: args },
    },
  });
  assert.strictEqual(response.status, 200);
  return parseJsonRpcPayload(response);
}

async function mcpLibrarySearch(
  endpoint: { url: string; token: string },
  id: string,
  args: unknown,
) {
  const response = await callLibrarySearchTool(endpoint, id, args);
  assert.isUndefined(response.error, id);
  const data = response.result?.structuredContent?.data;
  assertLibrarySearchEnvelope(data);
  assert.notInclude(
    String(response.result?.content?.[0]?.text || ""),
    "/home/",
  );
  return data as Record<string, any>;
}

async function createProductionSearchBroker() {
  // Unit bundles have their own module state. Use the plugin's published owner
  // through the existing discovery seam rather than starting a second lifecycle.
  const found = await waitUntil(
    async () => {
      const discoveries = await listSidecarDiscoveries();
      return discoveries.length === 1 &&
        discoveries[0].discovery.lifecycleState === "ready"
        ? discoveries[0]
        : null;
    },
    90_000,
    "current-source-sidecar-ready",
  );
  const sessionRoot = found.path.slice(
    0,
    Math.max(found.path.lastIndexOf("/"), found.path.lastIndexOf("\\")),
  );
  const launch = rebuildSynthesisSidecarLaunchConfig(
    JSON.parse(await readRuntimeTextFile(joinPath(sessionRoot, "config.json"))),
  );
  return createZoteroHostCapabilityBroker(undefined, {
    lexicalPort: createNativeSynthesisLibraryLexicalPort({
      getReadyConnection: () => ({
        discovery: found.discovery,
        clientToken: launch.clientToken,
      }),
    }),
  });
}

function assertLibrarySearchEnvelope(envelope: Record<string, any>) {
  assert.deepEqual(Object.keys(envelope).sort(), [
    "coverage",
    "hasMore",
    "issues",
    "method",
    "nextCursor",
    "results",
    "status",
    "total",
  ]);
  assert.strictEqual(envelope.method, "lexical");
  assert.include(["completed", "limited", "unavailable"], envelope.status);
  assert.strictEqual(envelope.coverage.kind, "library");
  for (const kind of ["metadata", "fulltext", "analysis"]) {
    assert.isNumber(envelope.coverage.sources?.[kind]?.sourcesScanned);
  }
  for (const issue of envelope.issues) {
    assert.isString(issue.code);
    assert.isAtLeast(issue.affectedCount, 1);
  }
  assert.isBoolean(envelope.hasMore);
  assert.isTrue(envelope.nextCursor === null || !!envelope.nextCursor);
  assert.isTrue(envelope.total === null || envelope.total >= 0);
  // The search envelope never degrades into the legacy list page and never
  // publishes a score, passage content or a local path.
  const serialized = JSON.stringify(envelope);
  assert.notMatch(serialized, /"(items|truncated|score|path|content)":/);
  assert.notInclude(serialized, "/home/");
}

describe("embedded Zotero MCP server in Zotero runtime", function () {
  this.timeout(15000);

  afterEach(async function () {
    await shutdownZoteroMcpServer();
    await shutdownHostBridgeServer();
  });

  it("serves Streamable HTTP JSON-RPC over the real Zotero localhost socket", async function () {
    if (!isRealZoteroRuntime()) {
      this.skip();
    }
    const endpoint = await startMcpEndpoint();
    const { url, token } = endpoint;
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
    assert.isNotEmpty(token);

    const initialize = await requestJson({
      url,
      token,
      payload: {
        jsonrpc: "2.0",
        id: "0",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: {
            name: "zotero-runtime-xhr-test",
            version: "0.0.0",
          },
        },
      },
    });
    assert.strictEqual(initialize.status, 200);
    assert.include(initialize.contentType, "application/json");
    const initializeLog = latestRequest("initialize");
    assert.strictEqual(initializeLog.responseJsonrpc, "2.0");
    assert.strictEqual(initializeLog.responseJsonrpcId, "0");
    assert.strictEqual(initializeLog.responseProtocolVersion, "2025-11-25");
    assert.isAbove(initializeLog.responseBodyLength || 0, 0);
    assert.strictEqual(initializeLog.responseError, "");

    const getMcp = await requestGet({
      url,
      token,
    });
    assert.strictEqual(getMcp.status, 405);
    assert.include(getMcp.text, "streamable_http_get_not_supported");

    const initialized = await requestJson({
      url,
      token,
      payload: {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      },
    });
    assert.strictEqual(initialized.status, 202);
    assert.strictEqual(initialized.text, "");
    const initializedLog = latestRequest("notifications/initialized");
    assert.strictEqual(initializedLog.status, 202);

    const tools = await requestJson({
      url,
      token,
      payload: {
        jsonrpc: "2.0",
        id: "tools",
        method: "tools/list",
      },
    });
    assert.strictEqual(tools.status, 200);
    const toolsLog = latestRequest("tools/list");
    assert.strictEqual(toolsLog.responseJsonrpc, "2.0");
    assert.strictEqual(toolsLog.responseJsonrpcId, "tools");
    assert.isAbove(toolsLog.responseBodyLength || 0, 0);

    const toolCall = await requestJson({
      url,
      token,
      payload: {
        jsonrpc: "2.0",
        id: "call",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      },
    });
    assert.strictEqual(toolCall.status, 200);
    const toolCallLog = latestRequest("tools/call");
    assert.strictEqual(toolCallLog.responseJsonrpc, "2.0");
    assert.strictEqual(toolCallLog.responseJsonrpcId, "call");
    assert.strictEqual(
      toolCallLog.jsonrpcToolName,
      ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
    );
    assert.isAbove(toolCallLog.responseBodyLength || 0, 0);

    const status = getZoteroMcpServerStatus();
    assert.strictEqual(status.status, "running");
    assert.isAtLeast(status.requestCount, 5);
    assert.include(
      status.recentRequests.map((entry) => entry.jsonrpcMethod),
      "tools/list",
    );
    assert.include(
      status.recentRequests.map((entry) => entry.jsonrpcMethod),
      "tools/call",
    );
  });

  it("routes lexical Library item search through the registered capability and MCP on the real Broker", async function () {
    if (!isRealZoteroRuntime()) {
      this.skip();
    }
    this.timeout(180_000);
    const broker = await createProductionSearchBroker();
    const libraryId = Zotero.Libraries.userLibraryID;
    const items = [];
    for (const suffix of ["alpha", "beta"]) {
      items.push(
        await nativeFixtureMutations.item.create({
          itemType: "journalArticle",
          libraryID: libraryId,
          fields: {
            title: `Lexical bridge marker ${suffix}`,
            abstractNote: "Bounded abstract passage.",
          },
        }),
      );
    }
    // The item ref scope keeps the deterministic marker query unambiguous, and
    // metadata-only sources keep the expected evidence bounded.
    const request = {
      query: "Lexical bridge marker",
      libraryIds: [libraryId],
      itemRefs: items.map((item) => ({ libraryId, key: item.key })),
      sourceKinds: ["metadata"],
    };
    const endpoint = await startMcpEndpoint(broker);
    const capability = (await executeHostBridgeCapability(
      "library.search_items",
      request,
      {
        connectionMode: "local",
        getStatus: () => ({}) as never,
        resolveZoteroHostCapabilityBroker: () => broker,
      } satisfies HostBridgeCapabilityContext,
    )) as Record<string, any>;
    assertLibrarySearchEnvelope(capability);
    assert.include(["completed", "limited"], capability.status);
    assert.sameMembers(
      capability.results.map((entry: any) => entry.item.ref.key),
      items.map((item) => item.key),
    );
    for (const entry of capability.results) {
      assert.strictEqual(entry.item.ref.libraryId, libraryId);
      assert.isNotEmpty(entry.matches);
      assert.isTrue(
        entry.matches.every(
          (match: any) =>
            match.source.kind === "metadata" &&
            match.matchedTerms.length > 0 &&
            match.sourceVersion.length > 0 &&
            typeof match.phraseMatch === "boolean" &&
            match.location.range.end >= match.location.range.start,
        ),
        "metadata-only search must report bounded field evidence",
      );
    }

    // Continuation runs as separate MCP requests, so it only succeeds while the
    // capability resolver keeps the same real Broker owner.
    const firstPage = await mcpLibrarySearch(endpoint, "search-page-1", {
      ...request,
      limit: 1,
    });
    assert.lengthOf(firstPage.results, 1);
    assert.isTrue(firstPage.hasMore, "a bounded page must report hasMore");
    assert.isNotEmpty(firstPage.nextCursor);
    const searchCalls = [
      {
        id: "search-mirror",
        args: request,
        check: (data: Record<string, any>) =>
          assert.deepEqual(data, capability),
      },
      {
        id: "search-page-2",
        args: { ...request, limit: 1, cursor: firstPage.nextCursor },
        check: (data: Record<string, any>) => {
          assert.lengthOf(data.results, 1);
          assert.notEqual(
            data.results[0].item.ref.key,
            firstPage.results[0].item.ref.key,
          );
          assert.isFalse(data.hasMore);
          assert.isNull(data.nextCursor);
        },
      },
    ];
    for (const call of searchCalls) {
      call.check(await mcpLibrarySearch(endpoint, call.id, call.args));
    }

    const stale = await callLibrarySearchTool(endpoint, "search-stale", {
      ...request,
      cursor: "library-search:not-a-continuation",
    });
    assert.strictEqual(stale.result?.isError, true);
    assert.strictEqual(stale.result?.structuredContent?.error_code, "conflict");
    assert.isFalse(stale.result?.structuredContent?.retryable);
    assert.isUndefined(stale.result?.structuredContent?.data);
  });
});

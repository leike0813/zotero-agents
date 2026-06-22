import { assert } from "chai";
import {
  ensureZoteroMcpServer,
  getZoteroMcpServerStatus,
  shutdownZoteroMcpServer,
} from "../../src/modules/zoteroMcpServer";
import { shutdownHostBridgeServer } from "../../src/modules/hostBridgeServer";
import { ZOTERO_MCP_TOOL_GET_CURRENT_VIEW } from "../../src/modules/zoteroMcpProtocol";

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

function requestGet(args: {
  url: string;
  token: string;
}) {
  return rawGetRequest({
    url: args.url,
    token: args.token,
    accept: "text/event-stream",
  });
}

function getComponents() {
  const runtime = globalThis as any;
  return runtime.Components || runtime.ChromeUtils?.importESModule?.("resource://gre/modules/Services.sys.mjs")?.Components;
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
    const descriptor = await ensureZoteroMcpServer({
      resolveHostContext: () => ({
        target: "library",
        libraryId: "zotero-runtime-test",
        selectionEmpty: true,
      }),
    });
    const authHeader = descriptor.headers.find(
      (entry) => entry.name.toLowerCase() === "authorization",
    );
    const token = String(authHeader?.value || "").replace(/^Bearer\s+/i, "");
    assert.match(descriptor.url, /^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
    assert.isNotEmpty(token);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const initialize = await requestJson({
      url: descriptor.url,
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
    assert.strictEqual(
      initializeLog.responseProtocolVersion,
      "2025-11-25",
    );
    assert.isAbove(initializeLog.responseBodyLength || 0, 0);
    assert.strictEqual(initializeLog.responseError, "");

    const getMcp = await requestGet({
      url: descriptor.url,
      token,
    });
    assert.strictEqual(getMcp.status, 405);
    assert.include(getMcp.text, "streamable_http_get_not_supported");

    const initialized = await requestJson({
      url: descriptor.url,
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
      url: descriptor.url,
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
    assert.isAtLeast(toolsLog.responseToolCount || 0, 1);
    assert.isAbove(toolsLog.responseBodyLength || 0, 0);

    const toolCall = await requestJson({
      url: descriptor.url,
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
    assert.strictEqual(toolCallLog.jsonrpcToolName, ZOTERO_MCP_TOOL_GET_CURRENT_VIEW);
    assert.isAbove(toolCallLog.responseBodyLength || 0, 0);

    const status = getZoteroMcpServerStatus();
    assert.strictEqual(status.status, "running");
    assert.isAtLeast(status.requestCount, 5);
    assert.isAtLeast(status.toolCallCount, 1);
    assert.include(
      status.recentRequests.map((entry) => entry.jsonrpcMethod),
      "tools/list",
    );
    assert.include(
      status.recentRequests.map((entry) => entry.jsonrpcMethod),
      "tools/call",
    );
  });
});

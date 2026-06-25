import { assert } from "chai";
import type { BackendInstance } from "../../src/backends/types";
import { AcpClientConnection } from "../../src/modules/acpClientConnection";
import { createAcpNdJsonMessageStream } from "../../src/modules/acpMessageStream";
import { ACP_PROTOCOL_VERSION } from "../../src/modules/acpProtocol";
import {
  launchAcpTransport,
  type AcpTransport,
} from "../../src/modules/acpTransport";
import {
  configureZoteroMcpServerForTests,
  getZoteroMcpServerStatus,
  handleZoteroMcpHttpRequestForTests,
  resetZoteroMcpServerForTests,
  type ZoteroMcpServerDescriptor,
} from "../../src/modules/zoteroMcpServer";
import { ZOTERO_MCP_TOOL_GET_CURRENT_VIEW } from "../../src/modules/zoteroMcpProtocol";

const dynamicImport = new Function("specifier", "return import(specifier)") as <
  T = any,
>(
  specifier: string,
) => Promise<T>;

function shouldRunRealOpenCodeIntegration() {
  const runtime = globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  return (
    runtime.process?.env?.ZOTERO_SKILLS_RUN_OPENCODE_ACP_INTEGRATION === "1"
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
    headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return {
    status,
    headers,
    body,
  };
}

async function readRequestBody(request: any) {
  const bufferModule =
    await dynamicImport<typeof import("node:buffer")>("node:buffer");
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(
      bufferModule.Buffer.isBuffer(chunk)
        ? chunk
        : bufferModule.Buffer.from(chunk),
    );
  }
  return bufferModule.Buffer.concat(chunks).toString("utf8");
}

async function writeMcpResponse(request: any, response: any) {
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

async function createNodeMcpServer() {
  const { createServer } =
    await dynamicImport<typeof import("node:http")>("node:http");
  return createServer((request, response) => {
    void writeMcpResponse(request, response).catch((error) => {
      response.writeHead(500, { "content-type": "text/plain" });
      response.end(error instanceof Error ? error.message : String(error));
    });
  });
}

async function listen(server: any) {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.isObject(address);
  return Number((address as { port: number }).port);
}

async function waitForMcpMethod(method: string, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = getZoteroMcpServerStatus();
    if (status.recentRequests.some((entry) => entry.jsonrpcMethod === method)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

function createOpenCodeBackend(): BackendInstance {
  return {
    id: "acp-opencode-real-integration",
    type: "acp",
    baseUrl: "local://acp-opencode-real-integration",
    displayName: "OpenCode ACP Real Integration",
    command: "npx",
    args: ["opencode-ai@latest", "acp"],
  };
}

describe("real OpenCode ACP MCP integration", function () {
  this.timeout(120000);

  let transport: AcpTransport | null = null;
  let server: any = null;

  afterEach(async function () {
    if (transport) {
      await transport.close().catch(() => undefined);
      transport = null;
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      server = null;
    }
    resetZoteroMcpServerForTests();
  });

  it("discovers injected Zotero MCP tools through real opencode-ai ACP", async function () {
    if (!shouldRunRealOpenCodeIntegration()) {
      this.skip();
    }

    const token = configureZoteroMcpServerForTests({
      resolveHostContext: () => ({
        target: "library",
        libraryId: "opencode-real-integration",
        selectionEmpty: true,
      }),
    });
    server = await createNodeMcpServer();
    const port = await listen(server);
    const descriptor: ZoteroMcpServerDescriptor = {
      name: "zotero",
      type: "http",
      url: `http://127.0.0.1:${port}/mcp`,
      headers: [
        {
          name: "Authorization",
          value: `Bearer ${token}`,
        },
      ],
      enabled: true,
    };

    transport = await launchAcpTransport({
      backend: createOpenCodeBackend(),
      cwd: process.cwd(),
    });
    const stream = createAcpNdJsonMessageStream(
      transport.stdin,
      transport.stdout,
    );
    const traces: unknown[] = [];
    const connection = new AcpClientConnection(
      () => ({
        requestPermission: async () => ({ outcome: "cancelled" }),
        sessionUpdate: async () => undefined,
      }),
      stream,
      {
        onTrace: (event) => {
          traces.push(event);
        },
      },
    );

    const initialize = await connection.initialize({
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: {},
    });
    assert.strictEqual(
      initialize.agentCapabilities?.mcpCapabilities?.http,
      true,
      `OpenCode did not advertise HTTP MCP support: ${JSON.stringify(initialize.agentCapabilities)}`,
    );

    const session = await connection.newSession({
      cwd: process.cwd(),
      mcpServers: [descriptor],
    });
    assert.isNotEmpty(session.sessionId);

    const discovered = await waitForMcpMethod("tools/list", 10000);
    const status = getZoteroMcpServerStatus();
    assert.isTrue(
      discovered,
      [
        "Real OpenCode ACP did not request tools/list from the injected Zotero MCP server.",
        `mcpStatus=${JSON.stringify(status)}`,
        `acpTraces=${JSON.stringify(traces)}`,
        `stderr=${transport.getStderrText()}`,
      ].join("\n"),
    );
    assert.include(
      status.recentRequests.map((entry) => entry.jsonrpcMethod),
      "tools/list",
    );
    assert.isAbove(
      status.recentRequests.find(
        (entry) => entry.jsonrpcMethod === "tools/list",
      )?.responseBodyLength || 0,
      0,
      `tools/list response did not include ${ZOTERO_MCP_TOOL_GET_CURRENT_VIEW}`,
    );
  });
});

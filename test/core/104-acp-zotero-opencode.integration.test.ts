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
  ensureZoteroMcpServer,
  getZoteroMcpServerStatus,
  shutdownZoteroMcpServer,
} from "../../src/modules/zoteroMcpServer";
import { getTestGrepPattern } from "../zotero/testMode";

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

function shouldRunRealOpenCodeIntegration() {
  const runtime = globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  return (
    runtime.process?.env?.ZOTERO_SKILLS_RUN_OPENCODE_ACP_INTEGRATION === "1" ||
    getTestGrepPattern().includes(
      "real OpenCode ACP against Zotero MCP server in Zotero runtime",
    )
  );
}

function resolveTestCwd() {
  const runtime = globalThis as {
    process?: {
      cwd?: () => string;
    };
    Zotero?: {
      DataDirectory?: {
        dir?: string;
      };
    };
  };
  return (
    runtime.process?.cwd?.() || runtime.Zotero?.DataDirectory?.dir || "C:\\"
  );
}

function createOpenCodeBackend(): BackendInstance {
  return {
    id: "acp-opencode-zotero-runtime-integration",
    type: "acp",
    baseUrl: "local://acp-opencode-zotero-runtime-integration",
    displayName: "OpenCode ACP Zotero Runtime Integration",
    command: "npx",
    args: ["opencode-ai@latest", "acp"],
  };
}

async function waitForMcpMethod(method: string, timeoutMs = 10000) {
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

describe("real OpenCode ACP against Zotero MCP server in Zotero runtime", function () {
  this.timeout(120000);

  let transport: AcpTransport | null = null;

  afterEach(async function () {
    if (transport) {
      await transport.close().catch(() => undefined);
      transport = null;
    }
    await shutdownZoteroMcpServer();
  });

  it("discovers Zotero MCP tools through the real embedded server", async function () {
    if (!isRealZoteroRuntime() || !shouldRunRealOpenCodeIntegration()) {
      this.skip();
    }

    const descriptor = await ensureZoteroMcpServer({
      resolveHostContext: () => ({
        target: "library",
        libraryId: "zotero-opencode-runtime-test",
        selectionEmpty: true,
      }),
    });
    transport = await launchAcpTransport({
      backend: createOpenCodeBackend(),
      cwd: resolveTestCwd(),
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
      cwd: resolveTestCwd(),
      mcpServers: [descriptor],
    });
    assert.isNotEmpty(session.sessionId);

    const discovered = await waitForMcpMethod("tools/list", 10000);
    const status = getZoteroMcpServerStatus();
    assert.isTrue(
      discovered,
      [
        "Real OpenCode ACP did not request tools/list from the real embedded Zotero MCP server.",
        `mcpStatus=${JSON.stringify(status)}`,
        `acpTraces=${JSON.stringify(traces)}`,
        `stderr=${transport.getStderrText()}`,
      ].join("\n"),
    );
  });
});

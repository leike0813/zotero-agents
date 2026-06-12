import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AcpClientConnection } from "../../src/modules/acpClientConnection";
import {
  createAcpConnectionAdapter,
  type AcpConnectionUpdate,
} from "../../src/modules/acpConnectionAdapter";
import type { BackendInstance } from "../../src/backends/types";
import {
  ACP_CLIENT_METHODS,
  ACP_PROTOCOL_VERSION,
  type JsonRpcMessage,
  type RequestPermissionRequest,
  type SessionNotification,
} from "../../src/modules/acpProtocol";

function redefineGlobalProperty(key: string, value: unknown) {
  const runtime = globalThis as Record<string, unknown>;
  const previous = Object.getOwnPropertyDescriptor(runtime, key);
  Object.defineProperty(runtime, key, {
    value,
    writable: true,
    configurable: true,
  });
  return previous;
}

function restoreGlobalProperty(key: string, descriptor?: PropertyDescriptor) {
  const runtime = globalThis as Record<string, unknown>;
  if (!descriptor) {
    delete runtime[key];
    return;
  }
  Object.defineProperty(runtime, key, descriptor);
}

function createMessageHarness() {
  const inboundQueue: JsonRpcMessage[] = [];
  const outboundQueue: JsonRpcMessage[] = [];
  const waitingInbound: Array<
    (result: { done: boolean; value?: JsonRpcMessage }) => void
  > = [];
  const waitingOutbound: Array<(message: JsonRpcMessage) => void> = [];
  let inboundClosed = false;

  const flushInbound = () => {
    while (waitingInbound.length > 0) {
      if (inboundQueue.length > 0) {
        const next = waitingInbound.shift();
        next?.({
          done: false,
          value: inboundQueue.shift(),
        });
        continue;
      }
      if (inboundClosed) {
        const next = waitingInbound.shift();
        next?.({ done: true, value: undefined });
        continue;
      }
      break;
    }
  };

  const flushOutbound = () => {
    while (waitingOutbound.length > 0 && outboundQueue.length > 0) {
      const next = waitingOutbound.shift();
      next?.(outboundQueue.shift() as JsonRpcMessage);
    }
  };

  return {
    stream: {
      readable: {
        getReader() {
          return {
            async read() {
              if (inboundQueue.length > 0) {
                return {
                  done: false,
                  value: inboundQueue.shift(),
                };
              }
              if (inboundClosed) {
                return { done: true, value: undefined };
              }
              return new Promise<{ done: boolean; value?: JsonRpcMessage }>(
                (resolve) => {
                  waitingInbound.push(resolve);
                },
              );
            },
            releaseLock() {
              return;
            },
          };
        },
      },
      writable: {
        getWriter() {
          return {
            async write(message: JsonRpcMessage) {
              outboundQueue.push(message);
              flushOutbound();
            },
            releaseLock() {
              return;
            },
          };
        },
      },
    },
    pushInbound(message: JsonRpcMessage) {
      inboundQueue.push(message);
      flushInbound();
    },
    closeInbound() {
      inboundClosed = true;
      flushInbound();
    },
    async nextOutbound() {
      if (outboundQueue.length > 0) {
        return outboundQueue.shift() as JsonRpcMessage;
      }
      return new Promise<JsonRpcMessage>((resolve) => {
        waitingOutbound.push(resolve);
      });
    },
  };
}

async function createFakeClaudeAcpServerScript(root: string) {
  const scriptPath = path.join(root, "fake-claude-acp-server.mjs");
  await fs.writeFile(
    scriptPath,
    [
      'import readline from "node:readline";',
      "let rawEnabled = false;",
      "let newSessionAttempts = 0;",
      "const rejectMeta = process.env.REJECT_META === '1';",
      "function send(message) { process.stdout.write(JSON.stringify(message) + '\\n'); }",
      "const rl = readline.createInterface({ input: process.stdin });",
      "rl.on('line', (line) => {",
      "  if (!line.trim()) return;",
      "  const request = JSON.parse(line);",
      "  if (request.method === 'initialize') {",
      "    send({ jsonrpc: '2.0', id: request.id, result: { protocolVersion: 1, agentInfo: { name: 'fake', version: '1' }, agentCapabilities: { sessionCapabilities: { resume: {} }, loadSession: true, mcpCapabilities: { http: true } }, authMethods: [] } });",
      "    return;",
      "  }",
      "  if (request.method === 'session/new') {",
      "    newSessionAttempts += 1;",
      "    if (rejectMeta && request.params && request.params._meta) {",
      "      send({ jsonrpc: '2.0', id: request.id, error: { code: -32602, message: 'Invalid params: unknown _meta' } });",
      "      return;",
      "    }",
      "    rawEnabled = !!(request.params && request.params._meta && request.params._meta.claudeCode && request.params._meta.claudeCode.emitRawSDKMessages);",
      "    send({ jsonrpc: '2.0', id: request.id, result: { sessionId: 'session-1', title: `attempts:${newSessionAttempts}` } });",
      "    return;",
      "  }",
      "  if (request.method === 'session/prompt') {",
      "    send({ jsonrpc: '2.0', method: 'session/update', params: { sessionId: request.params.sessionId, update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '' } } } });",
      "    if (rawEnabled) {",
      "      send({ jsonrpc: '2.0', method: '_claude/sdkMessage', params: { sessionId: request.params.sessionId, message: { type: 'assistant', message: { content: [{ type: 'text', text: '{\"probe\":\"raw\",\"ok\":true}' }] } } } });",
      "    }",
      "    send({ jsonrpc: '2.0', id: request.id, result: { stopReason: 'end_turn' } });",
      "    return;",
      "  }",
      "  send({ jsonrpc: '2.0', id: request.id, result: {} });",
      "});",
    ].join("\n"),
    "utf8",
  );
  return scriptPath;
}

function createClaudeBackend(
  scriptPath: string,
  env?: Record<string, string>,
): BackendInstance {
  return {
    id: "fake-claude-acp",
    displayName: "Fake Claude ACP",
    type: "acp",
    baseUrl: "local://fake-claude-acp",
    command: process.execPath,
    args: [scriptPath],
    env,
    acp: {
      agentFamily: "claude-code",
    },
  };
}

describe("acp client connection", function () {
  it("sends initialize request and resolves the matching response", async function () {
    const harness = createMessageHarness();
    const traces: unknown[] = [];
    const connection = new AcpClientConnection(
      () => ({
        requestPermission: async () => ({ outcome: "cancelled" }),
        sessionUpdate: async () => undefined,
      }),
      harness.stream,
      {
        onTrace: (event) => {
          traces.push(event);
        },
      },
    );

    const initializePromise = connection.initialize({
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: {},
    });
    const outbound = await harness.nextOutbound();
    assert.include(outbound, {
      jsonrpc: "2.0",
      method: "initialize",
    });
    assert.deepEqual(outbound.params, {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: {},
    });

    harness.pushInbound({
      jsonrpc: "2.0",
      id: outbound.id,
      result: {
        protocolVersion: ACP_PROTOCOL_VERSION,
        agentInfo: {
          name: "OpenCode",
          version: "1.2.3",
        },
        authMethods: [],
      },
    });

    const response = await initializePromise;
    assert.deepEqual(response.agentInfo, {
      name: "OpenCode",
      version: "1.2.3",
    });
    assert.isTrue(
      traces.some((entry) => {
        const trace = entry as Record<string, unknown>;
        return (
          trace.direction === "out" &&
          trace.kind === "request" &&
          trace.id === 0 &&
          trace.method === "initialize"
        );
      }),
    );
    assert.isTrue(
      traces.some((entry) => {
        const trace = entry as Record<string, unknown>;
        return (
          trace.direction === "in" &&
          trace.kind === "response" &&
          trace.id === 0
        );
      }),
    );
    harness.closeInbound();
    await connection.closed;
  });

  it("handles session/request_permission and responds with the selected outcome", async function () {
    const harness = createMessageHarness();
    let capturedRequest: RequestPermissionRequest | null = null;
    const connection = new AcpClientConnection(
      () => ({
        requestPermission: async (request) => {
          capturedRequest = request;
          return {
            outcome: "selected",
            optionId: "allow-once",
          };
        },
        sessionUpdate: async () => undefined,
      }),
      harness.stream,
    );

    harness.pushInbound({
      jsonrpc: "2.0",
      id: 99,
      method: ACP_CLIENT_METHODS.session_request_permission,
      params: {
        sessionId: "session-1",
        toolCall: {
          toolCallId: "tool-1",
          title: "Inspect notes",
        },
        options: [
          {
            optionId: "allow-once",
            kind: "allow_once",
            name: "Allow Once",
          },
        ],
      },
    });

    const outbound = await harness.nextOutbound();
    assert.deepEqual(capturedRequest, {
      sessionId: "session-1",
      toolCall: {
        toolCallId: "tool-1",
        title: "Inspect notes",
      },
      options: [
        {
          optionId: "allow-once",
          kind: "allow_once",
          name: "Allow Once",
        },
      ],
    });
    assert.deepEqual(outbound, {
      jsonrpc: "2.0",
      id: 99,
      result: {
        outcome: "selected",
        optionId: "allow-once",
      },
    });
    harness.closeInbound();
    await connection.closed;
  });

  it("sends session/resume and session/load requests with cwd and MCP server params", async function () {
    const harness = createMessageHarness();
    const connection = new AcpClientConnection(
      () => ({
        requestPermission: async () => ({ outcome: "cancelled" }),
        sessionUpdate: async () => undefined,
      }),
      harness.stream,
    );

    const resumePromise = connection.resumeSession({
      sessionId: "session-1",
      cwd: "D:\\ZoteroData",
      mcpServers: [],
    });
    const resumeOutbound = await harness.nextOutbound();
    assert.include(resumeOutbound, {
      jsonrpc: "2.0",
      method: "session/resume",
    });
    assert.deepEqual(resumeOutbound.params, {
      sessionId: "session-1",
      cwd: "D:\\ZoteroData",
      mcpServers: [],
    });
    harness.pushInbound({
      jsonrpc: "2.0",
      id: resumeOutbound.id,
      result: {
        title: "Resumed",
      },
    });
    assert.deepEqual(await resumePromise, {
      title: "Resumed",
    });

    const loadPromise = connection.loadSession({
      sessionId: "session-2",
      cwd: "D:\\ZoteroData",
      mcpServers: [],
    });
    const loadOutbound = await harness.nextOutbound();
    assert.include(loadOutbound, {
      jsonrpc: "2.0",
      method: "session/load",
    });
    assert.deepEqual(loadOutbound.params, {
      sessionId: "session-2",
      cwd: "D:\\ZoteroData",
      mcpServers: [],
    });
    harness.pushInbound({
      jsonrpc: "2.0",
      id: loadOutbound.id,
      result: null,
    });
    assert.isNull(await loadPromise);

    harness.closeInbound();
    await connection.closed;
  });

  it("does not depend on AbortController to receive session/update and close cleanly", async function () {
    const harness = createMessageHarness();
    const previousAbortController = redefineGlobalProperty(
      "AbortController",
      undefined,
    );
    const updates: SessionNotification[] = [];

    try {
      const connection = new AcpClientConnection(
        () => ({
          requestPermission: async () => ({ outcome: "cancelled" }),
          sessionUpdate: async (event) => {
            updates.push(event);
          },
        }),
        harness.stream,
      );

      harness.pushInbound({
        jsonrpc: "2.0",
        method: ACP_CLIENT_METHODS.session_update,
        params: {
          sessionId: "session-1",
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: "Hello from agent",
            },
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.lengthOf(updates, 1);
      assert.deepEqual(updates[0], {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "Hello from agent",
          },
        },
      });

      harness.closeInbound();
      await connection.closed;
    } finally {
      restoreGlobalProperty("AbortController", previousAbortController);
    }
  });

  it("routes provider extension notifications to the optional handler", async function () {
    const harness = createMessageHarness();
    const providerNotifications: JsonRpcMessage[] = [];
    const connection = new AcpClientConnection(
      () => ({
        requestPermission: async () => ({ outcome: "cancelled" }),
        sessionUpdate: async () => undefined,
        providerNotification: async (notification) => {
          providerNotifications.push(notification);
        },
      }),
      harness.stream,
    );

    harness.pushInbound({
      jsonrpc: "2.0",
      method: "_claude/sdkMessage",
      params: {
        sessionId: "session-1",
        message: {
          type: "assistant",
          message: {
            content: [{ type: "text", text: "fallback text" }],
          },
        },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.lengthOf(providerNotifications, 1);
    assert.equal(providerNotifications[0].method, "_claude/sdkMessage");

    harness.closeInbound();
    await connection.closed;
  });

  it("keeps receiving session updates when provider notifications are ignored or fail", async function () {
    const harness = createMessageHarness();
    const updates: SessionNotification[] = [];
    const previousConsoleError = console.error;
    const connection = new AcpClientConnection(
      () => ({
        requestPermission: async () => ({ outcome: "cancelled" }),
        sessionUpdate: async (event) => {
          updates.push(event);
        },
        providerNotification: async () => {
          throw new Error("extension handler failed");
        },
      }),
      harness.stream,
    );

    try {
      console.error = () => undefined;
      harness.pushInbound({
        jsonrpc: "2.0",
        method: "_claude/sdkMessage",
        params: {
          sessionId: "session-1",
        },
      });
      harness.pushInbound({
        jsonrpc: "2.0",
        method: ACP_CLIENT_METHODS.session_update,
        params: {
          sessionId: "session-1",
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: "standard text",
            },
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.lengthOf(updates, 1);
      assert.equal(
        (updates[0].update as { content?: { text?: string } }).content?.text,
        "standard text",
      );
    } finally {
      console.error = previousConsoleError;
    }

    harness.closeInbound();
    await connection.closed;
  });

  it("projects Claude raw SDK assistant text when the standard assistant stream is empty", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-client-"));
    let adapter: Awaited<ReturnType<typeof createAcpConnectionAdapter>> | null =
      null;
    try {
      const scriptPath = await createFakeClaudeAcpServerScript(root);
      adapter = await createAcpConnectionAdapter({
        backend: createClaudeBackend(scriptPath),
        agentWorkspaceDir: root,
        sessionCwd: root,
        workspaceDir: root,
        runtimeDir: root,
      });
      const updates: AcpConnectionUpdate[] = [];
      adapter.onUpdate((event) => {
        updates.push(event);
      });

      await adapter.initialize();
      const session = await adapter.newSession();
      const response = await adapter.prompt({
        sessionId: session.sessionId,
        message: "return JSON",
      });

      assert.equal(response.stopReason, "end_turn");
      assert.deepEqual(
        updates.map(
          (event) =>
            (event.update as { content?: { text?: string } }).content?.text ||
            "",
        ),
        ["", '{"probe":"raw","ok":true}'],
      );
    } finally {
      await adapter?.close().catch(() => undefined);
      await fs.rm(root, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  });

  it("retries Claude session creation without raw SDK metadata when the backend rejects it", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-client-"));
    let adapter: Awaited<ReturnType<typeof createAcpConnectionAdapter>> | null =
      null;
    try {
      const scriptPath = await createFakeClaudeAcpServerScript(root);
      adapter = await createAcpConnectionAdapter({
        backend: createClaudeBackend(scriptPath, { REJECT_META: "1" }),
        agentWorkspaceDir: root,
        sessionCwd: root,
        workspaceDir: root,
        runtimeDir: root,
      });
      const diagnostics: string[] = [];
      adapter.onDiagnostics((entry) => {
        diagnostics.push(entry.kind);
      });

      await adapter.initialize();
      const session = await adapter.newSession();

      assert.equal(session.sessionId, "session-1");
      assert.include(diagnostics, "claude_raw_sdk_extension_disabled");
    } finally {
      await adapter?.close().catch(() => undefined);
      await fs.rm(root, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  });
});

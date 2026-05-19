import { assert } from "chai";
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createAcpMcpGatewayConnection,
} from "../../src/modules/acpMcpGateway";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-mcp-gateway-"));
}

function readLine(stream: NodeJS.ReadableStream) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const index = buffer.indexOf("\n");
      if (index >= 0) {
        cleanup();
        resolve(buffer.slice(0, index));
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      stream.off("data", onData);
      stream.off("error", onError);
    };
    stream.on("data", onData);
    stream.on("error", onError);
  });
}

function waitForExit(child: ReturnType<typeof spawn>) {
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    const timer = setTimeout(() => {
      child.kill();
    }, 1000);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

function listen(server: Server) {
  return new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

describe("ACP MCP smoke gateway", function () {
  it("isolates smoke observations by connection and smoke attempt", async function () {
    const first = createAcpMcpGatewayConnection({
      runtimeDir: "runtime-a",
      disableHttpServer: true,
    });
    const second = createAcpMcpGatewayConnection({
      runtimeDir: "runtime-b",
      disableHttpServer: true,
    });
    const firstSpan = await first.startMcpSmokeSpan({
      sessionId: "session-a",
      requiredTools: ["tool.alpha"],
      timeoutMs: 120000,
    });
    const secondSpan = await second.startMcpSmokeSpan({
      sessionId: "session-b",
      requiredTools: ["tool.alpha"],
      timeoutMs: 120000,
    });

    second.observeToolCall({
      toolName: "tool.alpha",
      connectionId: first.connectionId,
      smokeAttemptId: firstSpan.smokeAttemptId,
    });
    assert.deepEqual(secondSpan.snapshot().reachedTools, []);
    assert.deepEqual(secondSpan.snapshot().missingTools, ["tool.alpha"]);

    second.observeToolCall({
      toolName: "tool.alpha",
      connectionId: second.connectionId,
      smokeAttemptId: "old-attempt",
    });
    assert.deepEqual(secondSpan.snapshot().reachedTools, []);
    assert.deepEqual(secondSpan.snapshot().missingTools, ["tool.alpha"]);

    second.observeToolCall({
      toolName: "tool.alpha",
      connectionId: second.connectionId,
      smokeAttemptId: secondSpan.smokeAttemptId,
    });
    const observed = await secondSpan.observed;
    assert.deepEqual(observed.reachedTools, ["tool.alpha"]);
    assert.deepEqual(observed.missingTools, []);

    await firstSpan.abort("test cleanup").catch(() => undefined);
    await first.close();
    await second.close();
  });

  it("short-circuits active smoke tools/call requests and preserves batch ids", async function () {
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: "runtime-http",
      disableHttpServer: true,
    });
    const span = await gateway.startMcpSmokeSpan({
      sessionId: "session-http",
      requiredTools: ["tool.alpha", "tool.beta"],
      timeoutMs: 120000,
    });
    const forwarded: unknown[] = [];

    const response = await gateway.handleJsonRpcPayloadForTests(
      [
        {
          jsonrpc: "2.0",
          id: "a",
          method: "tools/call",
          params: { name: "tool.alpha", arguments: {} },
        },
        {
          jsonrpc: "2.0",
          id: "list",
          method: "tools/list",
        },
        {
          jsonrpc: "2.0",
          id: "b",
          method: "tools/call",
          params: { name: "tool.beta", arguments: {} },
        },
      ],
      {
        forward: async (payload) => {
          forwarded.push(payload);
          return {
            jsonrpc: "2.0",
            id: "list",
            result: { tools: [] },
          };
        },
      },
    );

    assert.deepEqual(span.snapshot().reachedTools, ["tool.alpha", "tool.beta"]);
    assert.deepEqual((response as any[]).map((entry) => entry.id), [
      "a",
      "list",
      "b",
    ]);
    assert.equal((response as any[])[0].result.structuredContent.toolName, "tool.alpha");
    assert.equal((response as any[])[2].result.structuredContent.toolName, "tool.beta");
    assert.deepEqual(forwarded, [
      [
        {
          jsonrpc: "2.0",
          id: "list",
          method: "tools/list",
        },
      ],
    ]);

    const observed = await span.observed;
    assert.deepEqual(observed.missingTools, []);
    await gateway.close();
  });

  it("passes through formal tools/call traffic after smoke is observed", async function () {
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: "runtime-passive",
      disableHttpServer: true,
    });
    const span = await gateway.startMcpSmokeSpan({
      sessionId: "session-passive",
      requiredTools: ["tool.alpha"],
      timeoutMs: 120000,
    });
    await gateway.handleJsonRpcPayloadForTests({
      jsonrpc: "2.0",
      id: "smoke",
      method: "tools/call",
      params: { name: "tool.alpha", arguments: {} },
    });
    await span.observed;

    const forwarded: unknown[] = [];
    const response = await gateway.handleJsonRpcPayloadForTests(
      {
        jsonrpc: "2.0",
        id: "formal",
        method: "tools/call",
        params: { name: "tool.alpha", arguments: { real: true } },
      },
      {
        forward: async (payload) => {
          forwarded.push(payload);
          return {
            jsonrpc: "2.0",
            id: "formal",
            result: { content: [{ type: "text", text: "real" }] },
          };
        },
      },
    );

    assert.deepEqual(forwarded, [
      {
        jsonrpc: "2.0",
        id: "formal",
        method: "tools/call",
        params: { name: "tool.alpha", arguments: { real: true } },
      },
    ]);
    assert.equal((response as any).result.content[0].text, "real");
    await gateway.close();
  });

  it("passes through passive responses without putting large payloads in diagnostics", async function () {
    const diagnostics: string[] = [];
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: "runtime-large-passive",
      disableHttpServer: true,
      emitDiagnostic: (entry) => diagnostics.push(JSON.stringify(entry)),
    });
    const largeText = "x".repeat(1024 * 256);
    const directResponse = {
      jsonrpc: "2.0",
      id: "list",
      result: {
        tools: [
          {
            name: "tool.alpha",
            description: largeText,
          },
        ],
      },
    };

    const response = await gateway.handleJsonRpcPayloadForTests(
      {
        jsonrpc: "2.0",
        id: "list",
        method: "tools/list",
      },
      {
        forward: async () => directResponse,
      },
    );

    assert.deepEqual(response, directResponse);
    assert.notInclude(diagnostics.join("\n"), largeText.slice(0, 128));
    await gateway.close();
  });

  it("wraps HTTP descriptors and records transport kinds without exposing upstream tokens", async function () {
    clearRuntimeLogs();
    const diagnostics: string[] = [];
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: "runtime-wrap",
      disableHttpServer: true,
      emitDiagnostic: (entry) => diagnostics.push(String(entry.detail || "")),
    });
    const wrapped = await gateway.wrapMcpServersForSession([
      {
        name: "zotero",
        type: "http",
        url: "http://127.0.0.1:1/mcp",
        headers: [{ name: "Authorization", value: "Bearer secret-token" }],
        enabled: true,
      },
    ]);
    const descriptor = wrapped[0] as any;

    assert.equal(descriptor.type, "http");
    assert.include(descriptor.url, "/mcp-gateway/");
    assert.equal(descriptor.headers[0].value.startsWith("Bearer "), true);
    assert.deepEqual(gateway.getTransportKinds(), ["http"]);
    assert.notInclude(JSON.stringify(descriptor._meta), "secret-token");
    assert.notInclude(diagnostics.join("\n"), "secret-token");
    const logs = listRuntimeLogs({
      order: "asc",
    }).filter((entry) => entry.component === "acp-mcp-gateway");
    assert.isTrue(
      logs.some((entry) => entry.stage === "mcp-gateway-started"),
      JSON.stringify(logs, null, 2),
    );
    assert.isTrue(
      logs.some((entry) => entry.stage === "mcp-gateway-descriptor-wrapped"),
      JSON.stringify(logs, null, 2),
    );
    assert.notInclude(JSON.stringify(logs), "secret-token");
    await gateway.close();
  });

  it("writes persistent gateway request, observation, and short-circuit logs", async function () {
    clearRuntimeLogs();
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: "runtime-gateway-logs",
      disableHttpServer: true,
    });
    const span = await gateway.startMcpSmokeSpan({
      sessionId: "session-gateway-logs",
      requiredTools: ["tool.alpha"],
      timeoutMs: 120000,
    });

    await gateway.handleJsonRpcPayloadForTests({
      jsonrpc: "2.0",
      id: "smoke",
      method: "tools/call",
      params: { name: "tool.alpha", arguments: {} },
    });
    await span.observed;
    await span.finish();

    const stages = listRuntimeLogs({ order: "asc" })
      .filter((entry) => entry.component === "acp-mcp-gateway")
      .map((entry) => entry.stage);
    assert.includeMembers(stages, [
      "mcp-gateway-smoke-started",
      "mcp-gateway-tool-observed",
      "mcp-gateway-tool-short-circuited",
      "mcp-gateway-smoke-finished",
    ]);
    await gateway.close();
  });

  it("wraps stdio descriptors with a shim that forwards non-smoke JSON-RPC and child lifecycle signals", async function () {
    const root = await mkTempRoot();
    const childPath = path.join(root, "child.mjs");
    await fs.writeFile(
      childPath,
      [
        "process.stderr.write('child-stderr\\n');",
        "process.stdin.setEncoding('utf8');",
        "let buffer = '';",
        "process.stdin.on('data', chunk => {",
        "  buffer += chunk;",
        "  let index;",
        "  while ((index = buffer.indexOf('\\n')) >= 0) {",
        "    const line = buffer.slice(0, index);",
        "    buffer = buffer.slice(index + 1);",
        "    if (!line.trim()) continue;",
        "    const message = JSON.parse(line);",
        "    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { forwarded: message.method } }) + '\\n');",
        "  }",
        "});",
        "process.stdin.on('end', () => process.exit(7));",
      ].join("\n"),
      "utf8",
    );
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: root,
      disableHttpServer: true,
    });
    const wrapped = await gateway.wrapMcpServersForSession([
      {
        name: "stdio-test",
        type: "stdio",
        command: process.execPath,
        args: [childPath],
        env: { SECRET_TOKEN: "secret-token" },
        cwd: root,
      },
    ]);
    const descriptor = wrapped[0] as any;
    assert.equal(descriptor.type, "stdio");
    assert.equal(descriptor.command, process.execPath);
    assert.lengthOf(descriptor.args, 2);
    assert.notInclude(JSON.stringify(descriptor._meta), "secret-token");

    const shim = spawn(descriptor.command, descriptor.args, {
      cwd: descriptor.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    try {
      assert.equal(await readLine(shim.stderr), "child-stderr");
      shim.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: "init",
          method: "initialize",
        })}\n`,
      );
      const line = await readLine(shim.stdout);
      const response = JSON.parse(line);
      assert.equal(response.id, "init");
      assert.equal(response.result.forwarded, "initialize");

      shim.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: "list",
          method: "tools/list",
        })}\n`,
      );
      const listResponse = JSON.parse(await readLine(shim.stdout));
      assert.equal(listResponse.id, "list");
      assert.equal(listResponse.result.forwarded, "tools/list");

      shim.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: "call",
          method: "tools/call",
          params: { name: "tool.alpha", arguments: {} },
        })}\n`,
      );
      const callResponse = JSON.parse(await readLine(shim.stdout));
      assert.equal(callResponse.id, "call");
      assert.equal(callResponse.result.forwarded, "tools/call");
    } finally {
      shim.stdin.end();
      const exit = await waitForExit(shim);
      assert.equal(exit.code, 7);
      await gateway.close();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("short-circuits active stdio smoke calls without forwarding them to the real child", async function () {
    const root = await mkTempRoot();
    const childPath = path.join(root, "child.mjs");
    const forwardedPath = path.join(root, "forwarded.log");
    await fs.writeFile(
      childPath,
      [
        "import { appendFileSync } from 'node:fs';",
        "const forwardedPath = process.argv[2];",
        "process.stdin.setEncoding('utf8');",
        "process.stdin.on('data', chunk => {",
        "  appendFileSync(forwardedPath, chunk);",
        "  const message = JSON.parse(String(chunk).trim());",
        "  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { forwarded: true } }) + '\\n');",
        "});",
      ].join("\n"),
      "utf8",
    );
    const observedTools: string[] = [];
    const observer = createServer((request, response) => {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        observedTools.push(JSON.parse(body).toolName);
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            shortCircuit: true,
            smokeAttemptId: "stdio-smoke-attempt",
          }),
        );
      });
    });
    const port = await listen(observer);
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: root,
      disableHttpServer: true,
    });
    const wrapped = await gateway.wrapMcpServersForSession([
      {
        name: "stdio-test",
        type: "stdio",
        command: process.execPath,
        args: [childPath, forwardedPath],
        cwd: root,
      },
    ]);
    const descriptor = wrapped[0] as any;
    const configPath = descriptor.args[1];
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    config.observerEndpoint = `http://127.0.0.1:${port}/observe`;
    await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    const shim = spawn(descriptor.command, descriptor.args, {
      cwd: descriptor.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    try {
      shim.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: "smoke",
          method: "tools/call",
          params: { name: "tool.alpha", arguments: {} },
        })}\n`,
      );
      const response = JSON.parse(await readLine(shim.stdout));
      assert.equal(response.id, "smoke");
      assert.equal(response.result.structuredContent.smoke, true);
      assert.equal(response.result.structuredContent.smokeAttemptId, "stdio-smoke-attempt");
      assert.deepEqual(observedTools, ["tool.alpha"]);
      let forwarded = "";
      try {
        forwarded = await fs.readFile(forwardedPath, "utf8");
      } catch {
        forwarded = "";
      }
      assert.equal(forwarded, "");
    } finally {
      shim.stdin.end();
      await waitForExit(shim);
      await gateway.close();
      await closeServer(observer);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("reports stdio_gateway_unavailable when no Node runtime can be resolved", async function () {
    const root = await mkTempRoot();
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: root,
      disableHttpServer: true,
    });
    const originalProcess = globalThis.process;
    Object.defineProperty(globalThis, "process", {
      configurable: true,
      value: { versions: {} },
    });
    let message = "";
    try {
      await gateway.wrapMcpServersForSession([
        {
          name: "stdio-test",
          type: "stdio",
          command: "server",
        },
      ]);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    } finally {
      Object.defineProperty(globalThis, "process", {
        configurable: true,
        value: originalProcess,
      });
      await gateway.close();
      await fs.rm(root, { recursive: true, force: true });
    }
    assert.include(message, "stdio_gateway_unavailable");
  });
});

import { assert } from "chai";
import {
  ensureZoteroMcpServer,
  getZoteroMcpServerStatus,
  resetZoteroMcpServerForTests,
  shutdownZoteroMcpServer,
} from "../../src/modules/zoteroMcpServer";
import {
  getHostBridgeServerStatus,
  handleHostBridgeHttpRequestForTests,
  hostBridgeServerInternalsForTests,
  resetHostBridgeServerForTests,
  restartHostBridgeServer,
  shutdownHostBridgeServer,
} from "../../src/modules/hostBridgeServer";
import { setPref } from "../../src/utils/prefs";

type SocketListener = {
  onSocketAccepted(socket: unknown, transport: FakeTransport): void;
  onStopListening(socket?: unknown, status?: unknown): void;
};

class FakeAsyncInputStream {
  private chunks: Uint8Array[] = [];
  private callback: any = null;
  waitCount = 0;
  closeCount = 0;

  asyncWait(callback: any) {
    this.callback = callback;
    if (callback) {
      this.waitCount += 1;
      if (this.chunks.length) this.deliver();
    }
  }

  available() {
    return this.chunks[0]?.byteLength || 0;
  }

  readByteArray(length: number) {
    const chunk = this.chunks.shift() || new Uint8Array();
    assert.equal(chunk.byteLength, length);
    return Array.from(chunk);
  }

  push(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.deliver();
  }

  close() {
    this.closeCount += 1;
  }

  private deliver() {
    const callback = this.callback;
    if (!callback) return;
    this.callback = null;
    queueMicrotask(() => callback.onInputStreamReady(this));
  }
}

class FakeOutputStream {
  chunks: Uint8Array[] = [];
  closeCount = 0;

  write(value: string, length: number) {
    this.chunks.push(
      new Uint8Array(Buffer.from(value.slice(0, length), "latin1")),
    );
    return length;
  }

  close() {
    this.closeCount += 1;
  }

  text() {
    return Buffer.concat(
      this.chunks.map((chunk) => Buffer.from(chunk)),
    ).toString("latin1");
  }
}

class FakeTransport {
  readonly input = new FakeAsyncInputStream();
  readonly output = new FakeOutputStream();
  closeCount = 0;

  openInputStream() {
    return this.input;
  }

  openOutputStream() {
    return this.output;
  }

  close() {
    this.closeCount += 1;
  }
}

function rawRequest(args: {
  method?: string;
  path?: string;
  body?: Uint8Array;
  headers?: readonly string[];
}) {
  const body = args.body || new Uint8Array();
  const headers = args.headers || [`Content-Length: ${body.byteLength}`];
  const head = [
    `${args.method || "GET"} ${args.path || "/bridge/v1/health"} HTTP/1.1`,
    ...headers,
    "",
    "",
  ].join("\r\n");
  return new Uint8Array(
    Buffer.concat([Buffer.from(head, "latin1"), Buffer.from(body)]),
  );
}

function installXpcom() {
  const runtime = globalThis as any;
  const previousComponents = Object.getOwnPropertyDescriptor(
    runtime,
    "Components",
  );
  const previousServices = Object.getOwnPropertyDescriptor(runtime, "Services");
  Object.defineProperty(runtime, "Components", {
    configurable: true,
    value: {
      classes: {
        "@mozilla.org/binaryinputstream;1": {
          createInstance: () => {
            let input: FakeAsyncInputStream;
            return {
              setInputStream(value: FakeAsyncInputStream) {
                input = value;
              },
              available: () => input.available(),
              readByteArray: (length: number) => input.readByteArray(length),
              close: () => input.close(),
            };
          },
        },
      },
      interfaces: {
        nsIAsyncInputStream: {},
        nsIBinaryInputStream: {},
      },
    },
  });
  Object.defineProperty(runtime, "Services", {
    configurable: true,
    value: { tm: { mainThread: {} } },
  });
  return () => {
    if (previousComponents) {
      Object.defineProperty(runtime, "Components", previousComponents);
    } else {
      delete runtime.Components;
    }
    if (previousServices) {
      Object.defineProperty(runtime, "Services", previousServices);
    } else {
      delete runtime.Services;
    }
  };
}

async function waitUntil(check: () => boolean, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (!check()) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error("condition was not reached before timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function parseRawHttpResponse(raw: string) {
  const separator = raw.indexOf("\r\n\r\n");
  const head = separator >= 0 ? raw.slice(0, separator) : raw;
  const body = separator >= 0 ? raw.slice(separator + 4) : "";
  return {
    status: Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0),
    body,
  };
}

describe("host bridge socket lifecycle", function () {
  let restoreXpcom: () => void;
  let listeners: SocketListener[];

  beforeEach(function () {
    restoreXpcom = installXpcom();
    listeners = [];
    setPref("hostBridgeLanEnabled", false);
    setPref("hostBridgePinPortEnabled", false);
    hostBridgeServerInternalsForTests.setServerSocketFactory(() => ({
      asyncListen(listener: SocketListener) {
        listeners.push(listener);
      },
      close() {
        return;
      },
    }));
  });

  afterEach(async function () {
    await shutdownHostBridgeServer();
    resetHostBridgeServerForTests();
    restoreXpcom();
  });

  it("returns from accept after registering an async read and preserves the response", async function () {
    await restartHostBridgeServer();
    const transport = new FakeTransport();
    const expected = await handleHostBridgeHttpRequestForTests({
      method: "GET",
      path: "/bridge/v1/health",
    });

    listeners[0].onSocketAccepted(null, transport);
    assert.equal(transport.input.waitCount, 1);
    assert.equal(transport.output.chunks.length, 0);

    transport.input.push(rawRequest({}));
    await waitUntil(() => transport.output.closeCount === 1);
    assert.equal(transport.output.text(), expected);
    assert.equal(transport.input.closeCount, 1);
    assert.equal(transport.closeCount, 1);
  });

  it("maps an idle timeout locally and leaves the listener running", async function () {
    this.timeout(2000);
    await restartHostBridgeServer();
    const transport = new FakeTransport();
    listeners[0].onSocketAccepted(null, transport);

    await waitUntil(() => transport.output.closeCount === 1, 1000);
    assert.match(transport.output.text(), /^HTTP\/1\.1 408 /);
    assert.equal(getHostBridgeServerStatus().status, "running");
    assert.equal(transport.input.closeCount, 1);
    assert.equal(transport.output.closeCount, 1);
    assert.equal(transport.closeCount, 1);
  });

  it("does not dispatch a partial upload to the upload handler", async function () {
    this.timeout(2000);
    setPref("hostBridgeToken", "partial-upload-token");
    await restartHostBridgeServer();
    const transport = new FakeTransport();
    listeners[0].onSocketAccepted(null, transport);
    transport.input.push(
      rawRequest({
        method: "POST",
        path: "/bridge/v1/files/upload",
        body: new TextEncoder().encode("ab"),
        headers: [
          "Content-Length: 4",
          "Authorization: Bearer partial-upload-token",
          "Content-Type: application/octet-stream",
        ],
      }),
    );

    await waitUntil(() => transport.output.closeCount === 1, 1000);
    assert.match(transport.output.text(), /^HTTP\/1\.1 408 /);
    assert.notInclude(transport.output.text(), "fileId");
    assert.equal(getHostBridgeServerStatus().status, "running");
  });

  it("aborts and closes a pending accepted connection during shutdown", async function () {
    await restartHostBridgeServer();
    const transport = new FakeTransport();
    listeners[0].onSocketAccepted(null, transport);
    assert.equal(transport.input.waitCount, 1);

    await shutdownHostBridgeServer();
    await waitUntil(() => transport.closeCount === 1);
    assert.equal(transport.output.chunks.length, 0);
    assert.equal(transport.input.closeCount, 1);
    assert.equal(transport.output.closeCount, 1);
  });

  it("ignores a stale listener stop after restart", async function () {
    await restartHostBridgeServer();
    const stale = listeners[0];
    await restartHostBridgeServer();
    assert.equal(listeners.length, 2);
    assert.equal(getHostBridgeServerStatus().status, "running");

    stale.onStopListening();
    assert.equal(getHostBridgeServerStatus().status, "running");
  });
});

function isRealZoteroRuntime() {
  const runtime = globalThis as any;
  return (
    !!runtime.Zotero &&
    runtime.Zotero.__parity?.runtime !== "node-mock" &&
    typeof runtime.XMLHttpRequest === "function"
  );
}

function realComponents() {
  const runtime = globalThis as any;
  return (
    runtime.Components ||
    runtime.ChromeUtils?.importESModule?.(
      "resource://gre/modules/Services.sys.mjs",
    )?.Components
  );
}

function openRealSocketTransport(host: string, port: number) {
  const components = realComponents();
  const factory =
    components?.classes?.["@mozilla.org/network/socket-transport-service;1"] ||
    (globalThis as any).Cc?.["@mozilla.org/network/socket-transport-service;1"];
  const iface =
    components?.interfaces?.nsISocketTransportService ||
    (globalThis as any).Ci?.nsISocketTransportService;
  return factory.getService(iface).createTransport([], host, port, null, null);
}

function createRealScriptableInput(input: any) {
  const components = realComponents();
  const factory =
    components?.classes?.["@mozilla.org/scriptableinputstream;1"] ||
    (globalThis as any).Cc?.["@mozilla.org/scriptableinputstream;1"];
  const iface =
    components?.interfaces?.nsIScriptableInputStream ||
    (globalThis as any).Ci?.nsIScriptableInputStream;
  const stream = factory.createInstance(iface);
  stream.init(input);
  return stream;
}

function createRealBinaryOutput(output: any) {
  const components = realComponents();
  const factory =
    components?.classes?.["@mozilla.org/binaryoutputstream;1"] ||
    (globalThis as any).Cc?.["@mozilla.org/binaryoutputstream;1"];
  const iface =
    components?.interfaces?.nsIBinaryOutputStream ||
    (globalThis as any).Ci?.nsIBinaryOutputStream;
  const stream = factory.createInstance(iface);
  stream.setOutputStream(output);
  return stream;
}

function readRealSocketResponse(rawInput: any, startingRequestCount: number) {
  const components = realComponents();
  const asyncInterface =
    components?.interfaces?.nsIAsyncInputStream ||
    (globalThis as any).Ci?.nsIAsyncInputStream;
  const asyncInput = rawInput.QueryInterface(asyncInterface);
  const input = createRealScriptableInput(rawInput);
  return {
    input,
    response: new Promise<string>((resolve, reject) => {
      let raw = "";
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("fragmented real socket response timed out"));
      }, 5000);
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(raw);
      };
      const callback = {
        onInputStreamReady() {
          if (settled) return;
          try {
            const available = Number(input.available?.() || 0);
            if (available > 0) raw += input.read(available);
            const parsed = parseRawHttpResponse(raw);
            const length = Number(
              raw.match(/\r\ncontent-length:\s*(\d+)/i)?.[1] || -1,
            );
            if (length >= 0 && parsed.body.length >= length) {
              finish();
              return;
            }
            asyncInput.asyncWait(
              callback,
              0,
              0,
              (globalThis as any).Services.tm.mainThread,
            );
          } catch (error) {
            if (
              raw ||
              getHostBridgeServerStatus().requestCount > startingRequestCount
            ) {
              finish();
            } else finish(error);
          }
        },
      };
      asyncInput.asyncWait(
        callback,
        0,
        0,
        (globalThis as any).Services.tm.mainThread,
      );
    }),
  };
}

async function fragmentedRealSocketRequest(args: {
  url: string;
  head: string;
  body?: Uint8Array;
  splitHead?: boolean;
  delayMs?: number;
}) {
  const url = new URL(args.url);
  const transport = openRealSocketTransport(
    url.hostname,
    Number(url.port || 80),
  );
  const rawOutput = transport.openOutputStream(0, 0, 0);
  const output = createRealBinaryOutput(rawOutput);
  const startingRequestCount = getHostBridgeServerStatus().requestCount;
  const responseRead = readRealSocketResponse(
    transport.openInputStream(0, 0, 0),
    startingRequestCount,
  );
  const headBytes = new TextEncoder().encode(args.head);
  const parts = args.splitHead
    ? [
        headBytes.slice(0, Math.max(1, headBytes.byteLength - 2)),
        headBytes.slice(Math.max(1, headBytes.byteLength - 2)),
      ]
    : [headBytes, args.body || new Uint8Array()];
  let heartbeat = 0;
  const heartbeatTimer = setInterval(() => {
    heartbeat += 1;
  }, 5);
  try {
    output.writeByteArray(Array.from(parts[0]), parts[0].byteLength);
    rawOutput.flush?.();
    await new Promise((resolve) => setTimeout(resolve, args.delayMs || 50));
    for (const part of parts.slice(1)) {
      output.writeByteArray(Array.from(part), part.byteLength);
      rawOutput.flush?.();
    }

    const raw = await responseRead.response;
    const response = raw
      ? parseRawHttpResponse(raw)
      : {
          status: getHostBridgeServerStatus().lastResponseStatus,
          body: "",
          json: undefined,
        };
    return { response, responseCaptured: !!raw, heartbeat };
  } finally {
    clearInterval(heartbeatTimer);
    try {
      responseRead.input.close?.();
    } catch {
      // The server may already have closed the connection.
    }
    try {
      transport.close?.(0);
    } catch {
      // Best-effort test cleanup.
    }
  }
}

describe("host bridge socket integration in Zotero runtime", function () {
  this.timeout(15_000);

  afterEach(async function () {
    await shutdownZoteroMcpServer();
    resetZoteroMcpServerForTests();
    await shutdownHostBridgeServer();
  });

  it("keeps heartbeat alive across fragmented health, upload, and MCP requests", async function () {
    if (!isRealZoteroRuntime()) this.skip();

    const descriptor = await ensureZoteroMcpServer();
    const token = String(
      descriptor.headers.find(
        (entry) => entry.name.toLowerCase() === "authorization",
      )?.value || "",
    ).replace(/^Bearer\s+/i, "");
    const bridgeUrl = descriptor.url.replace(/\/mcp$/, "/bridge/v1");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const health = await fragmentedRealSocketRequest({
      url: `${bridgeUrl}/health`,
      head: [
        "GET /bridge/v1/health HTTP/1.1",
        `Host: ${new URL(bridgeUrl).host}`,
        "Connection: close",
        "",
        "",
      ].join("\r\n"),
      splitHead: true,
    });
    assert.equal(health.response.status, 200);
    assert.isAtLeast(health.heartbeat, 3);

    const uploadBody = Uint8Array.from([0, 255, 13, 10, 128, 1]);
    const upload = await fragmentedRealSocketRequest({
      url: `${bridgeUrl}/files/upload`,
      head: [
        "POST /bridge/v1/files/upload HTTP/1.1",
        `Host: ${new URL(bridgeUrl).host}`,
        `Authorization: Bearer ${token}`,
        "Content-Type: application/octet-stream",
        "X-Zotero-File-Name: fragmented.bin",
        `Content-Length: ${uploadBody.byteLength}`,
        "Connection: close",
        "",
        "",
      ].join("\r\n"),
      body: uploadBody,
    });
    assert.equal(upload.response.status, 200);
    if (upload.responseCaptured) {
      assert.equal(JSON.parse(upload.response.body).result.file.size, 6);
    }
    assert.isAtLeast(upload.heartbeat, 3);

    const mcpBody = new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "fragmented-initialize",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "fragmented-socket-test", version: "0.0.0" },
        },
      }),
    );
    const mcp = await fragmentedRealSocketRequest({
      url: descriptor.url,
      head: [
        "POST /mcp HTTP/1.1",
        `Host: ${new URL(descriptor.url).host}`,
        `Authorization: Bearer ${token}`,
        "Content-Type: application/json",
        `Content-Length: ${mcpBody.byteLength}`,
        "Connection: close",
        "",
        "",
      ].join("\r\n"),
      body: mcpBody,
    });
    assert.equal(mcp.response.status, 200);
    if (mcp.responseCaptured) {
      assert.equal(JSON.parse(mcp.response.body).id, "fragmented-initialize");
    }
    assert.equal(
      [...getZoteroMcpServerStatus().recentRequests].reverse()[0]
        ?.jsonrpcMethod,
      "initialize",
    );
    assert.isAtLeast(mcp.heartbeat, 3);
  });
});

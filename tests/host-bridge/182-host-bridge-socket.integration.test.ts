import { assert } from "chai";
import {
  getHostBridgeServerStatus,
  handleHostBridgeHttpRequestForTests,
  hostBridgeServerInternalsForTests,
  resetHostBridgeServerForTests,
  restartHostBridgeServer,
  shutdownHostBridgeServer,
} from "../../src/modules/hostBridge/server/hostBridgeServer";
import {
  registerHostBridgeExportFile,
  resetHostBridgeFileRegistryForTests,
} from "../../src/modules/hostBridge/server/hostBridgeFileRegistry";
import {
  getRuntimePersistencePaths,
  readRuntimeBytes,
  removeRuntimePath,
  writeRuntimeBytes,
} from "../../src/modules/runtimePersistence";
import { joinPath } from "../../src/utils/path";
import { setPref } from "../../src/utils/prefs";

type SocketListener = {
  onSocketAccepted(socket: unknown, transport: any): void;
  onStopListening(socket?: unknown, status?: unknown): void;
};

class FakeAsyncInputStream {
  private chunks: Uint8Array[] = [];
  private callback: any = null;
  waitCount = 0;
  closeCount = 0;
  readBytes = 0;

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
    assert.isAtMost(length, chunk.byteLength);
    const result = chunk.subarray(0, length);
    if (length < chunk.byteLength) {
      this.chunks.unshift(chunk.subarray(length));
    }
    this.readBytes += result.byteLength;
    return Array.from(result);
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
    `${args.method || "GET"} ${args.path || "/bridge/v2/health"} HTTP/1.1`,
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
  const mainThread = {};
  Object.defineProperty(runtime, "Components", {
    configurable: true,
    value: {
      classes: {
        "@mozilla.org/file/local;1": {
          createInstance: () => ({
            path: "",
            initWithPath(value: string) {
              this.path = value;
            },
          }),
        },
        "@mozilla.org/network/file-input-stream;1": {
          createInstance: () => ({
            path: "",
            init(file: { path: string }) {
              this.path = file.path;
            },
            close() {},
          }),
        },
        "@mozilla.org/network/stream-transport-service;1": {
          getService: () => ({}),
        },
        "@mozilla.org/network/async-stream-copier;1": {
          createInstance: () => {
            let source: { path: string };
            let sink: FakeOutputStream;
            let closeSink = false;
            let canceled = false;
            return {
              init(
                sourceValue: { path: string },
                sinkValue: FakeOutputStream,
                _target: unknown,
                _chunkSize: number,
                _closeSource: boolean,
                closeSinkValue: boolean,
              ) {
                source = sourceValue;
                sink = sinkValue;
                closeSink = closeSinkValue;
              },
              asyncCopy(observer: any) {
                setTimeout(async () => {
                  if (canceled) return;
                  try {
                    const bytes = await readRuntimeBytes(source.path);
                    const text = Buffer.from(bytes).toString("latin1");
                    sink.write(text, text.length);
                    if (closeSink) sink.close();
                    observer.onStopRequest(null, 0);
                  } catch {
                    observer.onStopRequest(null, 1);
                  }
                }, 20);
              },
              cancel() {
                canceled = true;
              },
            };
          },
        },
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
        "@mozilla.org/thread-manager;1": {
          getService: () => ({ mainThread }),
        },
      },
      interfaces: {
        nsIAsyncInputStream: {},
        nsIAsyncStreamCopier2: {},
        nsIBinaryInputStream: {},
        nsIFile: {},
        nsIFileInputStream: {},
        nsIStreamTransportService: {},
        nsIThreadManager: {},
      },
    },
  });
  Object.defineProperty(runtime, "Services", {
    configurable: true,
    value: { tm: { mainThread } },
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
    resetHostBridgeFileRegistryForTests();
    restoreXpcom();
  });

  it("serves without a DOM AbortController and releases successful ownership", async function () {
    await restartHostBridgeServer();
    const transport = new FakeTransport();
    const expected = await handleHostBridgeHttpRequestForTests({
      method: "GET",
      path: "/bridge/v2/health",
    });

    const runtime = globalThis as any;
    const previousAbortController = Object.getOwnPropertyDescriptor(
      runtime,
      "AbortController",
    );
    try {
      Object.defineProperty(runtime, "AbortController", {
        configurable: true,
        value: undefined,
      });
      listeners[0].onSocketAccepted(null, transport);
      assert.equal(transport.input.waitCount, 1);
      assert.equal(transport.output.chunks.length, 0);

      transport.input.push(rawRequest({}));
      await waitUntil(() => transport.output.closeCount === 1);
      assert.equal(transport.output.text(), expected);
      assert.equal(transport.input.closeCount, 1);
      assert.equal(transport.closeCount, 0);
      assert.equal(
        hostBridgeServerInternalsForTests.getAcceptedConnectionCount(),
        0,
      );
    } finally {
      if (previousAbortController) {
        Object.defineProperty(
          runtime,
          "AbortController",
          previousAbortController,
        );
      } else {
        delete runtime.AbortController;
      }
    }
  });

  it("rejects unauthorized requests before consuming their declared body", async function () {
    setPref("hostBridgeToken", "expected-token");
    await restartHostBridgeServer();
    const transport = new FakeTransport();
    listeners[0].onSocketAccepted(null, transport);
    transport.input.push(
      rawRequest({
        method: "POST",
        path: "/bridge/v2/call",
        body: new Uint8Array(64 * 1024),
        headers: [
          `Content-Length: ${64 * 1024}`,
          "Authorization: Bearer invalid-token",
        ],
      }),
    );

    await waitUntil(() => transport.output.closeCount === 1);
    assert.match(transport.output.text(), /^HTTP\/1\.1 401 /);
    assert.isAtMost(transport.input.readBytes, 4 * 1024);
  });

  it("closes connections accepted beyond the fixed capacity", async function () {
    await restartHostBridgeServer();
    const capacity =
      hostBridgeServerInternalsForTests.constants.MAX_ACCEPTED_CONNECTIONS;
    const transports = Array.from(
      { length: capacity + 1 },
      () => new FakeTransport(),
    );
    for (const transport of transports) {
      listeners[0].onSocketAccepted(null, transport);
    }

    assert.equal(
      hostBridgeServerInternalsForTests.getAcceptedConnectionCount(),
      capacity,
    );
    assert.equal(transports.at(-1)?.closeCount, 1);
    assert.equal(transports.at(-1)?.input.waitCount, 0);
  });

  it("cleans a partial accept failure and serves the next connection", async function () {
    await restartHostBridgeServer();
    const output = new FakeOutputStream();
    let transportCloseCount = 0;
    const brokenTransport = {
      openOutputStream: () => output,
      openInputStream: () => {
        throw new Error("input open failed");
      },
      close: () => {
        transportCloseCount += 1;
      },
    };

    assert.doesNotThrow(() =>
      listeners[0].onSocketAccepted(null, brokenTransport),
    );
    assert.equal(output.closeCount, 1);
    assert.equal(transportCloseCount, 1);
    assert.equal(getHostBridgeServerStatus().status, "running");
    assert.include(
      getHostBridgeServerStatus().lastError,
      "connection initialization failed",
    );

    const healthyTransport = new FakeTransport();
    listeners[0].onSocketAccepted(null, healthyTransport);
    healthyTransport.input.push(rawRequest({}));
    await waitUntil(() => healthyTransport.output.closeCount === 1);
    assert.match(healthyTransport.output.text(), /^HTTP\/1\.1 200 /);
    assert.equal(getHostBridgeServerStatus().lastError, "");
    assert.equal(
      hostBridgeServerInternalsForTests.getAcceptedConnectionCount(),
      0,
    );
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
    assert.equal(transport.closeCount, 0);
    assert.equal(
      hostBridgeServerInternalsForTests.getAcceptedConnectionCount(),
      0,
    );
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
        path: "/bridge/v2/files/upload",
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

  it("retains accepted ownership until an asynchronous file copy completes", async function () {
    const root = joinPath(
      getRuntimePersistencePaths().tmpDir,
      `socket-file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const filePath = joinPath(root, "large.bin");
    const bytes = new Uint8Array(0x10005);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = index % 251;
    }
    await writeRuntimeBytes(filePath, bytes, { overwrite: true });
    setPref("hostBridgeToken", "file-copy-token");
    try {
      const descriptor = await registerHostBridgeExportFile({
        localPath: filePath,
      });
      await restartHostBridgeServer();
      const transport = new FakeTransport();
      listeners[0].onSocketAccepted(null, transport);
      transport.input.push(
        rawRequest({
          path: `/bridge/v2/files/${descriptor.fileId}`,
          headers: [
            "Content-Length: 0",
            "Authorization: Bearer file-copy-token",
          ],
        }),
      );

      await waitUntil(() => transport.output.chunks.length > 0);
      assert.equal(transport.output.closeCount, 0);
      assert.equal(
        hostBridgeServerInternalsForTests.getAcceptedConnectionCount(),
        1,
      );

      await waitUntil(() => transport.output.closeCount === 1);
      const parsed = parseRawHttpResponse(transport.output.text());
      assert.equal(parsed.status, 200);
      assert.equal(parsed.body.length, bytes.byteLength);
      assert.equal(
        hostBridgeServerInternalsForTests.getAcceptedConnectionCount(),
        0,
      );
    } finally {
      await removeRuntimePath(root);
    }
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

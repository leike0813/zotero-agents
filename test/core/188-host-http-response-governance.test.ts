import { assert } from "chai";
import {
  beginRuntimeMemoryResponseTransfer,
  prepareJsonHttpResponse,
  runtimeHttpResponseInternalsForTests,
  RUNTIME_HTTP_RESPONSE_POLICY,
} from "../../src/modules/runtimeHttpResponse";
import {
  SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
  SYNTHESIS_REVERSE_HOST_CAPABILITIES,
  synthesisReverseHostCallTimeoutMs,
  synthesisReverseHostResponseBodyLimit,
} from "../../packages/synthesis-contracts/src";
import { createSynthesisReverseHostEndpoint } from "../../src/modules/synthesisReverseHostEndpoint";
import type { SynthesisReverseHostHandlers } from "../../src/modules/synthesisReverseHostBroker";

class CapturingOutputStream {
  readonly chunks: string[] = [];
  closeCount = 0;

  write(value: string, length: number) {
    this.chunks.push(value.slice(0, length));
    return length;
  }

  close() {
    this.closeCount += 1;
  }

  bytes() {
    return new Uint8Array(
      Buffer.concat(this.chunks.map((chunk) => Buffer.from(chunk, "latin1"))),
    );
  }
}

class PartialAsyncOutputStream extends CapturingOutputStream {
  constructor(private readonly writeLimit: number) {
    super();
  }

  override write(value: string, length: number) {
    const accepted = Math.min(length, this.writeLimit);
    this.chunks.push(value.slice(0, accepted));
    return accepted;
  }

  asyncWait(callback: { onOutputStreamReady(stream: unknown): void }) {
    queueMicrotask(() => callback.onOutputStreamReady(this));
  }
}

class FakeAsyncInputStream {
  private chunks: Uint8Array[] = [];
  private callback: any;
  closeCount = 0;

  asyncWait(callback: any) {
    this.callback = callback;
    if (callback && this.chunks.length) this.deliver();
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

class EndpointOutputStream extends PartialAsyncOutputStream {
  constructor(
    writeLimit: number,
    private readonly failWrites = false,
  ) {
    super(writeLimit);
  }

  override write(value: string, length: number) {
    return this.failWrites ? 0 : super.write(value, length);
  }
}

class FakeEndpointTransport {
  readonly input = new FakeAsyncInputStream();
  readonly output: EndpointOutputStream;
  closeCount = 0;

  constructor(writeLimit = 997, failWrites = false) {
    this.output = new EndpointOutputStream(writeLimit, failWrites);
  }

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

function installEndpointXpcom() {
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
        nsIBinaryInputStream: {},
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

function endpointRequest(args: {
  authorizationToken: string;
  profileId: string;
  serviceInstanceId: string;
}) {
  const body = new TextEncoder().encode(
    JSON.stringify({
      schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
      requestId: "request-1",
      profileId: args.profileId,
      serviceInstanceId: args.serviceInstanceId,
      operationId: "operation-1",
      capability: "library.artifacts.scan_page",
      deadlineAtMs: Date.now() + 10_000,
      payload: {},
    }),
  );
  return new Uint8Array(
    Buffer.concat([
      Buffer.from(
        [
          "POST /synthesis/v1/host-call HTTP/1.1",
          `Authorization: Bearer ${args.authorizationToken}`,
          `Content-Length: ${body.byteLength}`,
          "",
          "",
        ].join("\r\n"),
        "latin1",
      ),
      Buffer.from(body),
    ]),
  );
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

describe("host HTTP response governance", function () {
  beforeEach(function () {
    runtimeHttpResponseInternalsForTests.resetMetrics();
  });

  it("serializes and encodes one Unicode JSON body once", function () {
    const response = prepareJsonHttpResponse({
      status: 200,
      reason: "OK",
      body: { title: "目录治理", values: [1, 2, 3] },
    });
    const expected = JSON.stringify({ title: "目录治理", values: [1, 2, 3] });
    const decoded = new TextDecoder().decode(response.bodyBytes);
    const metrics = runtimeHttpResponseInternalsForTests.getMetrics();

    assert.equal(decoded, expected);
    assert.equal(
      response.bodyByteLength,
      new TextEncoder().encode(expected).byteLength,
    );
    assert.include(
      response.headers,
      `Content-Length: ${response.bodyByteLength}`,
    );
    assert.equal(metrics.jsonSerializations, 1);
    assert.equal(metrics.bodyEncodes, 1);
  });

  it("writes prepared memory bodies in bounded asynchronous chunks", async function () {
    const response = prepareJsonHttpResponse({
      status: 200,
      reason: "OK",
      body: { value: "x".repeat(RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes * 3) },
    });
    const output = new CapturingOutputStream();
    const transfer = beginRuntimeMemoryResponseTransfer({
      response,
      outputStream: output,
    });

    await transfer.completion;

    const bytes = output.bytes();
    const headerBytes = Buffer.from(response.headers, "latin1");
    assert.deepEqual(
      Array.from(bytes.subarray(0, headerBytes.byteLength)),
      Array.from(headerBytes),
    );
    assert.deepEqual(
      Array.from(bytes.subarray(headerBytes.byteLength)),
      Array.from(response.bodyBytes),
    );
    assert.equal(output.closeCount, 1);
    assert.isAtMost(
      runtimeHttpResponseInternalsForTests.getMetrics().maxWriteChunkBytes,
      RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes,
    );
  });

  it("continues partial asynchronous output writes until framing is complete", async function () {
    const response = prepareJsonHttpResponse({
      status: 200,
      reason: "OK",
      body: {
        value: "文".repeat(RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes * 2),
      },
    });
    const output = new PartialAsyncOutputStream(997);

    await beginRuntimeMemoryResponseTransfer({
      response,
      outputStream: output,
    }).completion;

    const expected = Buffer.concat([
      Buffer.from(response.headers, "latin1"),
      Buffer.from(response.bodyBytes),
    ]);
    assert.deepEqual(Array.from(output.bytes()), Array.from(expected));
    assert.equal(output.closeCount, 1);
  });

  it("uses the reference artifact deadline for scan, payload, and representative-image reads", function () {
    assert.equal(
      synthesisReverseHostCallTimeoutMs("library.artifacts.scan_page"),
      10_000,
    );
    assert.equal(
      synthesisReverseHostCallTimeoutMs("library.artifacts.read"),
      10_000,
    );
    assert.equal(
      synthesisReverseHostCallTimeoutMs("library.representative_image.read"),
      10_000,
    );
    assert.equal(
      synthesisReverseHostResponseBodyLimit(
        "library.representative_image.read",
      ),
      8 * 1024 * 1024,
    );
    assert.equal(synthesisReverseHostCallTimeoutMs("webdav.describe"), 2_000);
  });

  it("releases a fully written endpoint transport but aborts failed and stopped transports", async function () {
    const restore = installEndpointXpcom();
    const authorizationToken = "a".repeat(64);
    const profileId = "b".repeat(64);
    const serviceInstanceId = "service-1";
    let listener: any;
    const handlers = Object.fromEntries(
      SYNTHESIS_REVERSE_HOST_CAPABILITIES.map((capability) => [
        capability,
        async () => ({ value: "文".repeat(40_000) }),
      ]),
    ) as SynthesisReverseHostHandlers;
    const endpoint = createSynthesisReverseHostEndpoint({
      profileId,
      authorizationToken,
      now: Date.now,
      isHostConnected: () => true,
      authorizeCapability: () => true,
      handlers,
      serverSocketFactory: () => ({
        port: 12345,
        asyncListen(value: any) {
          listener = value;
        },
        close() {},
      }),
    });
    endpoint.start();
    endpoint.bindServiceInstance(serviceInstanceId);
    try {
      const completed = new FakeEndpointTransport();
      listener.onSocketAccepted(null, completed);
      completed.input.push(
        endpointRequest({ authorizationToken, profileId, serviceInstanceId }),
      );
      await waitUntil(() => completed.output.closeCount > 0);
      assert.equal(completed.closeCount, 0);

      const failed = new FakeEndpointTransport(997, true);
      listener.onSocketAccepted(null, failed);
      failed.input.push(
        endpointRequest({ authorizationToken, profileId, serviceInstanceId }),
      );
      await waitUntil(() => failed.closeCount > 0);

      const stopped = new FakeEndpointTransport();
      listener.onSocketAccepted(null, stopped);
      endpoint.stop();
      await waitUntil(() => stopped.closeCount > 0);
    } finally {
      endpoint.stop();
      restore();
    }
  });
});

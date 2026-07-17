import { assert } from "chai";
import {
  DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS,
  HostHttpRequestReadError,
  readHostHttpRequest,
  type HostHttpRequestReadLimits,
} from "../../src/modules/hostHttpRequestReader";

class FakeAsyncInputStream {
  private chunks: Uint8Array[] = [];
  private callback: any = null;
  private closedError: unknown = null;
  private readError: unknown = null;
  waitCount = 0;
  closeCount = 0;
  lastTarget: unknown;

  asyncWait(callback: any, _flags: number, _count: number, target: unknown) {
    this.callback = callback;
    if (callback) {
      this.lastTarget = target;
      this.waitCount += 1;
      if (this.chunks.length || this.closedError || this.readError) {
        this.deliver();
      }
    }
  }

  available() {
    if (this.readError) {
      throw this.readError;
    }
    if (this.chunks.length) {
      return this.chunks[0].byteLength;
    }
    if (this.closedError) {
      throw this.closedError;
    }
    return 0;
  }

  readByteArray(length: number) {
    if (this.readError) {
      throw this.readError;
    }
    const chunk = this.chunks.shift() || new Uint8Array();
    assert.equal(length, chunk.byteLength);
    return Array.from(chunk);
  }

  push(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.deliver();
  }

  notify() {
    this.deliver();
  }

  end() {
    this.closedError = new Error("NS_BASE_STREAM_CLOSED");
    this.deliver();
  }

  fail(error = new Error("read exploded")) {
    this.readError = error;
    this.deliver();
  }

  close() {
    this.closeCount += 1;
  }

  private deliver() {
    const callback = this.callback;
    if (!callback) return;
    this.callback = null;
    queueMicrotask(() => {
      if (typeof callback === "function") {
        callback(this);
      } else {
        callback.onInputStreamReady(this);
      }
    });
  }
}

function bytes(text: string) {
  return new TextEncoder().encode(text);
}

function requestBytes(args: {
  body?: Uint8Array;
  headers?: readonly string[];
  method?: string;
  path?: string;
}) {
  const body = args.body || new Uint8Array();
  const headers =
    args.headers === undefined
      ? [`Content-Length: ${body.byteLength}`]
      : [...args.headers];
  const head = [
    `${args.method || "POST"} ${args.path || "/bridge/v1/call"} HTTP/1.1`,
    ...headers,
    "",
    "",
  ].join("\r\n");
  return new Uint8Array(
    Buffer.concat([Buffer.from(head, "latin1"), Buffer.from(body)]),
  );
}

function tick(delayMs = 0) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
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
        "@mozilla.org/binaryinputstream;1": {
          createInstance: () => {
            let input: FakeAsyncInputStream;
            return {
              setInputStream(value: FakeAsyncInputStream) {
                input = value;
              },
              available() {
                return input.available();
              },
              readByteArray(length: number) {
                return input.readByteArray(length);
              },
              close() {
                input.close();
              },
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
    value: { tm: { mainThread } },
  });
  return {
    mainThread,
    restore() {
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
    },
  };
}

async function expectReadError(
  promise: Promise<unknown>,
  code: HostHttpRequestReadError["code"],
) {
  try {
    await promise;
    assert.fail(`expected ${code}`);
  } catch (error) {
    assert.instanceOf(error, HostHttpRequestReadError);
    assert.equal((error as HostHttpRequestReadError).code, code);
    return error as HostHttpRequestReadError;
  }
}

describe("host HTTP request reader", function () {
  let xpcom: ReturnType<typeof installXpcom>;

  beforeEach(function () {
    xpcom = installXpcom();
  });

  afterEach(function () {
    xpcom.restore();
  });

  it("publishes the fixed production limits", function () {
    assert.deepEqual(DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS, {
      maxHeaderBytes: 64 * 1024,
      maxBodyBytes: 16 * 1024 * 1024,
      idleTimeoutMs: 500,
      totalTimeoutMs: 30_000,
    });
  });

  it("reads a complete request from one readiness callback", async function () {
    const stream = new FakeAsyncInputStream();
    const raw = requestBytes({ body: bytes("{}") });
    const pending = readHostHttpRequest(stream);
    stream.push(raw);

    const result = await pending;
    assert.deepEqual(Array.from(result.bytes), Array.from(raw));
    assert.equal(result.fragments, 1);
    assert.equal(result.waits, 1);
    assert.equal(result.bodyBytes, 2);
    assert.strictEqual(stream.lastTarget, xpcom.mainThread);
    assert.equal(stream.closeCount, 1);
  });

  it("rearms after zero available and finds a separator across chunks", async function () {
    const stream = new FakeAsyncInputStream();
    const raw = requestBytes({ body: bytes("hello") });
    const split = raw.indexOf(13, raw.indexOf(13) + 1);
    const pending = readHostHttpRequest(stream);

    stream.notify();
    await tick();
    stream.push(raw.slice(0, split + 1));
    await tick();
    stream.push(raw.slice(split + 1, raw.byteLength - 2));
    await tick();
    stream.push(raw.slice(raw.byteLength - 2));

    const result = await pending;
    assert.deepEqual(Array.from(result.bytes), Array.from(raw));
    assert.equal(result.fragments, 3);
    assert.isAtLeast(result.waits, 4);
  });

  it("preserves arbitrary binary body bytes", async function () {
    const stream = new FakeAsyncInputStream();
    const body = Uint8Array.from([0, 255, 13, 10, 128, 1]);
    const raw = requestBytes({ body });
    const pending = readHostHttpRequest(stream);
    stream.push(raw.slice(0, raw.byteLength - body.byteLength + 2));
    await tick();
    stream.push(raw.slice(raw.byteLength - body.byteLength + 2));

    const result = await pending;
    assert.deepEqual(
      Array.from(result.bytes.slice(result.headerBytes)),
      Array.from(body),
    );
  });

  it("treats missing Content-Length as an empty body", async function () {
    const stream = new FakeAsyncInputStream();
    const raw = requestBytes({ method: "GET", headers: [] });
    const pending = readHostHttpRequest(stream);
    stream.push(raw);
    const result = await pending;
    assert.equal(result.contentLength, 0);
    assert.equal(result.bodyBytes, 0);
  });

  it("resets idle timeout after each non-empty fragment", async function () {
    const stream = new FakeAsyncInputStream();
    const raw = requestBytes({ body: bytes("abcdef") });
    const limits = {
      ...DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS,
      idleTimeoutMs: 25,
    };
    const pending = readHostHttpRequest(stream, { limits });
    stream.push(raw.slice(0, 20));
    await tick(15);
    stream.push(raw.slice(20, raw.byteLength - 1));
    await tick(15);
    stream.push(raw.slice(-1));
    assert.deepEqual(Array.from((await pending).bytes), Array.from(raw));
  });

  it("enforces idle and total deadlines independently", async function () {
    const idleStream = new FakeAsyncInputStream();
    const idleError = await expectReadError(
      readHostHttpRequest(idleStream, {
        limits: {
          ...DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS,
          idleTimeoutMs: 15,
          totalTimeoutMs: 100,
        },
      }),
      "idle_timeout",
    );
    assert.equal(idleError.stats.waits, 1);

    const totalStream = new FakeAsyncInputStream();
    const totalError = expectReadError(
      readHostHttpRequest(totalStream, {
        limits: {
          ...DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS,
          idleTimeoutMs: 30,
          totalTimeoutMs: 40,
        },
      }),
      "total_timeout",
    );
    for (let index = 0; index < 4; index += 1) {
      totalStream.push(bytes("G"));
      await tick(12);
    }
    await totalError;
  });

  it("rejects invalid Content-Length and transfer encoding", async function () {
    for (const value of ["-1", "nope", "1.5", "9007199254740992"]) {
      const stream = new FakeAsyncInputStream();
      const pending = readHostHttpRequest(stream);
      stream.push(requestBytes({ headers: [`Content-Length: ${value}`] }));
      await expectReadError(pending, "invalid_content_length");
    }

    const duplicate = new FakeAsyncInputStream();
    const duplicatePending = readHostHttpRequest(duplicate);
    duplicate.push(
      requestBytes({ headers: ["Content-Length: 0", "Content-Length: 1"] }),
    );
    await expectReadError(duplicatePending, "invalid_content_length");

    const chunked = new FakeAsyncInputStream();
    const chunkedPending = readHostHttpRequest(chunked);
    chunked.push(requestBytes({ headers: ["Transfer-Encoding: chunked"] }));
    await expectReadError(chunkedPending, "transfer_encoding_unsupported");
  });

  it("enforces inclusive header and body limits", async function () {
    const limits: HostHttpRequestReadLimits = {
      maxHeaderBytes: 80,
      maxBodyBytes: 4,
      idleTimeoutMs: 100,
      totalTimeoutMs: 200,
    };
    const fixedHeadBytes = requestBytes({ headers: ["X-Pad: "] }).byteLength;
    const atHeaderLimit = requestBytes({
      headers: [`X-Pad: ${"x".repeat(80 - fixedHeadBytes)}`],
    });
    assert.equal(atHeaderLimit.byteLength, 80);
    const headerStream = new FakeAsyncInputStream();
    const headerPending = readHostHttpRequest(headerStream, { limits });
    headerStream.push(atHeaderLimit);
    assert.equal((await headerPending).headerBytes, 80);

    const headerTooLarge = new FakeAsyncInputStream();
    const headerTooLargePending = readHostHttpRequest(headerTooLarge, {
      limits,
    });
    headerTooLarge.push(
      requestBytes({ headers: [`X-Pad: ${"x".repeat(81 - fixedHeadBytes)}`] }),
    );
    await expectReadError(headerTooLargePending, "header_too_large");

    const bodyStream = new FakeAsyncInputStream();
    const bodyPending = readHostHttpRequest(bodyStream, { limits });
    bodyStream.push(requestBytes({ body: bytes("1234") }));
    assert.equal((await bodyPending).bodyBytes, 4);

    const bodyTooLarge = new FakeAsyncInputStream();
    const bodyTooLargePending = readHostHttpRequest(bodyTooLarge, { limits });
    bodyTooLarge.push(requestBytes({ headers: ["Content-Length: 5"] }));
    await expectReadError(bodyTooLargePending, "body_too_large");
  });

  it("rejects extra body bytes and early EOF", async function () {
    const extra = new FakeAsyncInputStream();
    const extraPending = readHostHttpRequest(extra);
    extra.push(
      requestBytes({ body: bytes("ab"), headers: ["Content-Length: 1"] }),
    );
    await expectReadError(extraPending, "invalid_framing");

    const eof = new FakeAsyncInputStream();
    const eofPending = readHostHttpRequest(eof);
    eof.push(requestBytes({ headers: ["Content-Length: 2"] }));
    await tick();
    eof.end();
    await expectReadError(eofPending, "early_eof");
  });

  it("classifies unavailable async streams and read failures", async function () {
    await expectReadError(readHostHttpRequest({}), "async_stream_unavailable");

    const stream = new FakeAsyncInputStream();
    const pending = readHostHttpRequest(stream);
    stream.fail();
    await expectReadError(pending, "read_failed");
  });

  it("settles once when abort races a queued callback", async function () {
    const stream = new FakeAsyncInputStream();
    const controller = new AbortController();
    const pending = readHostHttpRequest(stream, { signal: controller.signal });
    stream.push(requestBytes({ body: bytes("late") }));
    controller.abort();
    const error = await expectReadError(pending, "aborted");
    await tick();
    assert.equal(stream.closeCount, 1);
    assert.isAtLeast(error.stats.waits, 1);
  });
});

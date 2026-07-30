import { assert } from "chai";
import {
  beginRuntimeMemoryResponseTransfer,
  prepareJsonHttpResponse,
  runtimeHttpResponseInternalsForTests,
  RUNTIME_HTTP_RESPONSE_POLICY,
} from "../../src/modules/runtimeHttpResponse";

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
});

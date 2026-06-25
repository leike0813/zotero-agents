import { assert } from "chai";
import { createAcpNdJsonMessageStream } from "../../src/modules/acpMessageStream";
import type {
  AcpReadableLike,
  AcpWritableLike,
} from "../../src/modules/acpTransport";

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

describe("acp message stream", function () {
  it("encodes and decodes ndjson messages without global Web Streams", async function () {
    const outputChunks: Uint8Array[] = [];
    const inputChunks = [
      new TextEncoder().encode(
        '{"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n',
      ),
    ];
    const output: AcpWritableLike<Uint8Array> = {
      getWriter() {
        return {
          async write(chunk: Uint8Array) {
            outputChunks.push(chunk);
          },
          releaseLock() {
            return;
          },
        };
      },
    };
    const input: AcpReadableLike<Uint8Array> = {
      getReader() {
        return {
          async read() {
            const chunk = inputChunks.shift();
            if (!chunk) {
              return { done: true as const, value: undefined };
            }
            return { done: false as const, value: chunk };
          },
          releaseLock() {
            return;
          },
        };
      },
    };
    const previousReadableStream = redefineGlobalProperty(
      "ReadableStream",
      undefined,
    );
    const previousWritableStream = redefineGlobalProperty(
      "WritableStream",
      undefined,
    );

    try {
      const stream = createAcpNdJsonMessageStream(output, input);
      const writer = stream.writable.getWriter();
      await writer.write({
        jsonrpc: "2.0",
        id: 2,
        method: "session/prompt",
        params: { prompt: "hi" },
      });
      writer.releaseLock();

      const reader = stream.readable.getReader();
      const first = await reader.read();
      const second = await reader.read();
      reader.releaseLock();

      assert.lengthOf(outputChunks, 1);
      assert.include(
        new TextDecoder().decode(outputChunks[0]),
        '"method":"session/prompt"',
      );
      assert.isFalse(first.done);
      assert.deepEqual(first.value, {
        jsonrpc: "2.0",
        id: 1,
        result: { ok: true },
      });
      assert.isTrue(second.done);
    } finally {
      restoreGlobalProperty("WritableStream", previousWritableStream);
      restoreGlobalProperty("ReadableStream", previousReadableStream);
    }
  });

  it("raises a staged parse error for malformed inbound JSON", async function () {
    const output: AcpWritableLike<Uint8Array> = {
      getWriter() {
        return {
          async write() {
            return;
          },
          releaseLock() {
            return;
          },
        };
      },
    };
    const inputChunks = [new TextEncoder().encode("{not json}\n")];
    const input: AcpReadableLike<Uint8Array> = {
      getReader() {
        return {
          async read() {
            const chunk = inputChunks.shift();
            if (!chunk) {
              return { done: true as const, value: undefined };
            }
            return { done: false as const, value: chunk };
          },
          releaseLock() {
            return;
          },
        };
      },
    };
    const stream = createAcpNdJsonMessageStream(output, input);
    const reader = stream.readable.getReader();

    let thrown: unknown;
    try {
      await reader.read();
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, Error);
    assert.equal((thrown as Error & { stage?: string }).stage, "ndjson_parse");
  });

  it("preserves Mozilla subprocess object errors when outbound write fails", async function () {
    const output: AcpWritableLike<Uint8Array> = {
      getWriter() {
        return {
          async write() {
            throw {
              message: "File closed",
              fileName:
                "resource://gre/modules/subprocess/subprocess_worker_win.js",
              lineNumber: 706,
              errorCode: 4286185473,
            };
          },
          releaseLock() {
            return;
          },
        };
      },
    };
    const input: AcpReadableLike<Uint8Array> = {
      getReader() {
        return {
          async read() {
            return { done: true as const, value: undefined };
          },
          releaseLock() {
            return;
          },
        };
      },
    };
    const stream = createAcpNdJsonMessageStream(output, input);
    const writer = stream.writable.getWriter();

    let thrown: unknown;
    try {
      await writer.write({ jsonrpc: "2.0", id: 1, method: "initialize" });
    } catch (error) {
      thrown = error;
    } finally {
      writer.releaseLock();
    }

    assert.instanceOf(thrown, Error);
    assert.equal((thrown as Error & { stage?: string }).stage, "ndjson_write");
    assert.include((thrown as Error).message, "File closed");
    assert.deepInclude(
      (thrown as Error & { cause?: unknown }).cause as object,
      {
        message: "File closed",
        errorCode: 4286185473,
      },
    );
  });
});

import { assert } from "chai";
import {
  RUNTIME_FILE_RANGE_MAX_BATCH_ENTRIES,
  type RuntimeFileRangeRequest,
  type RuntimeFileRangeResponse,
} from "../../../src/modules/runtimeFileRangeProtocol";
import {
  RuntimeFileIoError,
  readRuntimeFileRangesWithWorker,
  resetRuntimeFileRangeReaderForTests,
  setRuntimeFileRangeWorkerFactoryForTests,
  shutdownRuntimeFileRangeReader,
  type RuntimeFileRangeWorkerLike,
} from "../../../src/modules/runtimeFileRangeReader";

class FakeRangeWorker implements RuntimeFileRangeWorkerLike {
  onmessage: ((event: { data: RuntimeFileRangeResponse }) => void) | null =
    null;

  onerror: ((event: { message?: string }) => void) | null = null;

  readonly requests: RuntimeFileRangeRequest[] = [];

  terminated = false;

  constructor(
    private readonly source: Uint8Array,
    private readonly behavior: "respond" | "error" | "hang" = "respond",
  ) {}

  postMessage(request: RuntimeFileRangeRequest) {
    this.requests.push(request);
    if (this.behavior === "hang") {
      return;
    }
    queueMicrotask(() => {
      if (this.behavior === "error") {
        this.onerror?.({ message: "worker failed" });
        return;
      }
      const lengths = request.ranges.map((range) =>
        range.offset >= this.source.length
          ? 0
          : Math.min(range.length, this.source.length - range.offset),
      );
      const packed = new Uint8Array(
        lengths.reduce((total, length) => total + length, 0),
      );
      let cursor = 0;
      request.ranges.forEach((range, index) => {
        const length = lengths[index];
        packed.set(
          this.source.subarray(range.offset, range.offset + length),
          cursor,
        );
        cursor += length;
      });
      this.onmessage?.({
        data: {
          version: 1,
          generation: request.generation,
          requestId: request.requestId,
          ok: true,
          buffer: packed.buffer,
          lengths,
        },
      });
    });
  }

  terminate() {
    this.terminated = true;
  }
}

describe("runtime file range reader", function () {
  afterEach(function () {
    resetRuntimeFileRangeReaderForTests();
  });

  it("preserves range order while bounding physical packed batches", async function () {
    const source = new Uint8Array(4096);
    source.forEach((_, index) => {
      source[index] = index % 251;
    });
    const worker = new FakeRangeWorker(source);
    setRuntimeFileRangeWorkerFactoryForTests(() => worker);
    const ranges = Array.from(
      { length: RUNTIME_FILE_RANGE_MAX_BATCH_ENTRIES + 3 },
      (_, index) => ({ offset: index % source.length, length: 1 }),
    );

    const output = await readRuntimeFileRangesWithWorker("/tmp/source", ranges);

    assert.lengthOf(output, ranges.length);
    assert.deepEqual(
      output.map((entry) => entry[0]),
      ranges.map((range) => source[range.offset]),
    );
    assert.lengthOf(worker.requests, 2);
    assert.equal(
      worker.requests[0].ranges.length,
      RUNTIME_FILE_RANGE_MAX_BATCH_ENTRIES,
    );
    assert.equal(worker.requests[1].ranges.length, 3);
  });

  it("clamps EOF reads and recreates a failed worker generation", async function () {
    const source = new TextEncoder().encode("abcdef");
    const first = new FakeRangeWorker(source, "error");
    const second = new FakeRangeWorker(source);
    let creations = 0;
    setRuntimeFileRangeWorkerFactoryForTests(() =>
      creations++ === 0 ? first : second,
    );

    let firstError: unknown;
    try {
      await readRuntimeFileRangesWithWorker("/tmp/source", [
        { offset: 0, length: 1 },
      ]);
    } catch (error) {
      firstError = error;
    }
    assert.instanceOf(firstError, RuntimeFileIoError);
    assert.equal(
      (firstError as RuntimeFileIoError).code,
      "runtime_file_range_read_failed",
    );
    assert.isTrue(first.terminated);

    const output = await readRuntimeFileRangesWithWorker("/tmp/source", [
      { offset: 4, length: 8 },
      { offset: 20, length: 2 },
      { offset: 0, length: 0 },
    ]);
    assert.deepEqual(
      output.map((entry) => new TextDecoder().decode(entry)),
      ["ef", "", ""],
    );
  });

  it("times out pending work and rejects reads after controlled shutdown", async function () {
    const worker = new FakeRangeWorker(new Uint8Array(), "hang");
    setRuntimeFileRangeWorkerFactoryForTests(() => worker, { timeoutMs: 5 });

    let timeoutError: unknown;
    try {
      await readRuntimeFileRangesWithWorker("/tmp/source", [
        { offset: 0, length: 1 },
      ]);
    } catch (error) {
      timeoutError = error;
    }
    assert.equal(
      (timeoutError as RuntimeFileIoError).code,
      "runtime_file_range_read_failed",
    );
    assert.isTrue(worker.terminated);

    shutdownRuntimeFileRangeReader();
    let shutdownError: unknown;
    try {
      await readRuntimeFileRangesWithWorker("/tmp/source", [
        { offset: 0, length: 1 },
      ]);
    } catch (error) {
      shutdownError = error;
    }
    assert.equal(
      (shutdownError as RuntimeFileIoError).code,
      "runtime_async_file_io_unavailable",
    );
  });
});

import { assert } from "chai";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  RUNTIME_FILE_TRANSFER_POLICY,
  RuntimeFileTransferError,
  beginRuntimeFileResponseTransfer,
  collectRuntimeFileSourceBytesForTests,
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
  runtimeFileTransferInternalsForTests,
} from "../../src/modules/runtimeFileTransfer";
import {
  registerHostBridgeFileHandlesInOrder,
  resetHostBridgeFileRegistryForTests,
} from "../../src/modules/runtimeFileRegistry";

type Settlement<T> = {
  settled: boolean;
  value?: T;
  error?: unknown;
};

function observeSettlement<T>(promise: Promise<T>): Settlement<T> {
  const state: Settlement<T> = { settled: false };
  promise.then(
    (value) => {
      state.settled = true;
      state.value = value;
    },
    (error) => {
      state.settled = true;
      state.error = error;
    },
  );
  return state;
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

function installXpcFileTransferFakes(
  options: {
    readError?: Error;
    closeError?: Error;
    asyncReadError?: Error;
    asyncCopyError?: Error;
    cancelError?: Error;
  } = {},
) {
  const runtime = globalThis as any;
  const previousComponents = Object.getOwnPropertyDescriptor(
    runtime,
    "Components",
  );
  const asyncInput = {
    closeCount: 0,
    close() {
      this.closeCount += 1;
      if (options.closeError) throw options.closeError;
    },
  };
  const fileInputs: Array<{ closeCount: number }> = [];
  let pumpObserver: any;
  const pump = {
    cancelCount: 0,
    cancelStatus: undefined as number | undefined,
    get observer() {
      return pumpObserver;
    },
    init() {},
    asyncRead(observer: any) {
      pumpObserver = observer;
      if (options.asyncReadError) throw options.asyncReadError;
      if (options.readError) {
        setTimeout(
          () => observer.onDataAvailable(null, { fake: true }, 0, 3),
          0,
        );
      }
    },
    cancel(status: number) {
      this.cancelCount += 1;
      this.cancelStatus = status;
      if (options.cancelError) throw options.cancelError;
    },
  };
  let copierObserver: any;
  const copier = {
    cancelCount: 0,
    cancelStatus: undefined as number | undefined,
    get observer() {
      return copierObserver;
    },
    init() {},
    asyncCopy(observer: any) {
      if (options.asyncCopyError) throw options.asyncCopyError;
      copierObserver = observer;
    },
    cancel(status: number) {
      this.cancelCount += 1;
      this.cancelStatus = status;
      if (options.cancelError) throw options.cancelError;
    },
  };
  Object.defineProperty(runtime, "Components", {
    configurable: true,
    value: {
      classes: {
        "@mozilla.org/file/local;1": {
          createInstance: () => ({ initWithPath() {} }),
        },
        "@mozilla.org/network/file-input-stream;1": {
          createInstance: () => {
            const fileInput = {
              closeCount: 0,
              init() {},
              close() {
                this.closeCount += 1;
              },
            };
            fileInputs.push(fileInput);
            return fileInput;
          },
        },
        "@mozilla.org/network/stream-transport-service;1": {
          getService: () => ({
            createInputTransport: () => ({
              openInputStream: () => asyncInput,
            }),
          }),
        },
        "@mozilla.org/network/input-stream-pump;1": {
          createInstance: () => pump,
        },
        "@mozilla.org/binaryinputstream;1": {
          createInstance: () => ({
            setInputStream() {},
            readByteArray() {
              if (options.readError) throw options.readError;
              return [1, 2, 3];
            },
          }),
        },
        "@mozilla.org/network/async-stream-copier;1": {
          createInstance: () => copier,
        },
      },
      interfaces: {
        nsIFile: {},
        nsIFileInputStream: {},
        nsIStreamTransportService: {},
        nsIInputStreamPump: {},
        nsIBinaryInputStream: {},
        nsIAsyncStreamCopier2: {},
      },
      results: {
        NS_ERROR_FAILURE: 0x80004005,
        NS_BINDING_ABORTED: 0x804b0002,
      },
      isSuccessCode: (status: number) => status === 0,
    },
  });
  return {
    pump,
    copier,
    asyncInput,
    fileInputs,
    restore() {
      if (previousComponents) {
        Object.defineProperty(runtime, "Components", previousComponents);
      } else {
        delete runtime.Components;
      }
    },
  };
}

describe("runtime file transfer governance", function () {
  let restoreXpcFakes: (() => void) | undefined;

  afterEach(function () {
    restoreXpcFakes?.();
    restoreXpcFakes = undefined;
    resetHostBridgeFileRegistryForTests();
    runtimeFileTransferInternalsForTests.resetMetrics();
  });

  it("keeps digest and collection chunks bounded while preserving bytes", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-file-transfer-"));
    const filePath = path.join(root, "large.bin");
    const bytes = new Uint8Array(
      RUNTIME_FILE_TRANSFER_POLICY.chunkBytes * 3 + 17,
    );
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = index % 251;
    }
    await fs.writeFile(filePath, bytes);

    try {
      const source = await inspectRuntimeFileSource(filePath);
      const digest = await digestRuntimeFileSource(source);
      const collected = await collectRuntimeFileSourceBytesForTests(source);
      const metrics = runtimeFileTransferInternalsForTests.getMetrics();

      assert.strictEqual(source.size, bytes.byteLength);
      assert.strictEqual(digest.bytesRead, bytes.byteLength);
      assert.strictEqual(
        digest.sha256,
        `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`,
      );
      assert.deepEqual(collected, bytes);
      assert.isAtMost(
        metrics.maxChunkBytes,
        RUNTIME_FILE_TRANSFER_POLICY.chunkBytes,
      );
      assert.strictEqual(metrics.peakActiveTransfers, 1);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("registers attachment files in order through one global worker", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-file-transfer-"));
    const paths = await Promise.all(
      ["one.pdf", "two.pdf", "three.pdf"].map(async (name, index) => {
        const filePath = path.join(root, name);
        await fs.writeFile(
          filePath,
          new Uint8Array(RUNTIME_FILE_TRANSFER_POLICY.chunkBytes + index + 1),
        );
        return filePath;
      }),
    );

    try {
      const descriptors = await registerHostBridgeFileHandlesInOrder(
        paths.map((localPath) => ({
          localPath,
          sourceKind: "zotero-attachment" as const,
        })),
      );
      const metrics = runtimeFileTransferInternalsForTests.getMetrics();

      assert.deepEqual(
        descriptors.map((descriptor) => descriptor.displayName),
        ["one.pdf", "two.pdf", "three.pdf"],
      );
      assert.strictEqual(
        RUNTIME_FILE_TRANSFER_POLICY.maxConcurrentTransfers,
        1,
      );
      assert.strictEqual(metrics.peakActiveTransfers, 1);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("serializes concurrent digest callers through the global scheduler", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-file-transfer-"));
    const paths = await Promise.all(
      [0, 1, 2].map(async (index) => {
        const filePath = path.join(root, `parallel-${index}.bin`);
        await fs.writeFile(
          filePath,
          new Uint8Array(RUNTIME_FILE_TRANSFER_POLICY.chunkBytes * 2 + index),
        );
        return filePath;
      }),
    );
    try {
      const sources = await Promise.all(paths.map(inspectRuntimeFileSource));
      await Promise.all(sources.map(digestRuntimeFileSource));

      assert.strictEqual(
        runtimeFileTransferInternalsForTests.getMetrics().peakActiveTransfers,
        1,
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("settles a failed digest only after the pump stops and closes its stream", async function () {
    const readError = new Error("controlled read failure");
    const fakes = installXpcFileTransferFakes({
      readError,
      closeError: new Error("controlled close failure"),
    });
    restoreXpcFakes = fakes.restore;
    const settlement = observeSettlement(
      digestRuntimeFileSource({ path: "controlled.bin", size: 3 }),
    );

    await waitUntil(() => fakes.pump.cancelCount === 1);
    assert.strictEqual(fakes.pump.cancelStatus, 0x80004005);
    assert.isFalse(settlement.settled);
    assert.strictEqual(fakes.asyncInput.closeCount, 0);

    fakes.pump.observer.onStopRequest(null, 0x804b0002);
    await waitUntil(() => settlement.settled);

    assert.strictEqual(settlement.error, readError);
    assert.strictEqual(fakes.asyncInput.closeCount, 1);
    assert.strictEqual(fakes.fileInputs[0].closeCount, 1);
    fakes.pump.observer.onStopRequest(null, 0);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.strictEqual(settlement.error, readError);
  });

  it("keeps the transfer slot until an aborted copy reaches onStopRequest", async function () {
    const fakes = installXpcFileTransferFakes();
    restoreXpcFakes = fakes.restore;
    const outputStream = {
      chunks: [] as string[],
      write(value: string, length: number) {
        this.chunks.push(value.slice(0, length));
        return length;
      },
    };
    const transfer = beginRuntimeFileResponseTransfer({
      headers: "Header\r\n",
      source: { path: "controlled.bin", size: 3 },
      outputStream,
    });
    const settlement = observeSettlement(transfer.completion);

    await waitUntil(() => Boolean(fakes.copier.observer));
    assert.strictEqual(outputStream.chunks.join(""), "Header\r\n");
    transfer.abort();
    transfer.abort();
    await new Promise((resolve) => setTimeout(resolve, 5));

    assert.strictEqual(fakes.copier.cancelCount, 1);
    assert.strictEqual(fakes.copier.cancelStatus, 0x804b0002);
    assert.isFalse(settlement.settled);
    assert.strictEqual(
      runtimeFileTransferInternalsForTests.getMetrics().activeTransfers,
      1,
    );

    fakes.copier.observer.onStopRequest(null, 0x804b0002);
    await waitUntil(() => settlement.settled);

    assert.instanceOf(settlement.error, RuntimeFileTransferError);
    assert.strictEqual(fakes.fileInputs[0].closeCount, 1);
    assert.strictEqual(
      (settlement.error as RuntimeFileTransferError).code,
      "runtime_file_transfer_failed",
    );
    assert.strictEqual(
      runtimeFileTransferInternalsForTests.getMetrics().activeTransfers,
      0,
    );
    fakes.copier.observer.onStopRequest(null, 0);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.instanceOf(settlement.error, RuntimeFileTransferError);
  });

  it("closes acquired streams when native async startup fails", async function () {
    const readError = new Error("controlled asyncRead failure");
    const readFakes = installXpcFileTransferFakes({
      asyncReadError: readError,
    });
    restoreXpcFakes = readFakes.restore;
    const digestSettlement = observeSettlement(
      digestRuntimeFileSource({ path: "controlled.bin", size: 3 }),
    );
    await waitUntil(() => digestSettlement.settled);

    assert.strictEqual(digestSettlement.error, readError);
    assert.strictEqual(readFakes.asyncInput.closeCount, 1);
    assert.strictEqual(readFakes.fileInputs[0].closeCount, 1);

    readFakes.restore();
    const copyError = new Error("controlled asyncCopy failure");
    const copyFakes = installXpcFileTransferFakes({
      asyncCopyError: copyError,
    });
    restoreXpcFakes = copyFakes.restore;
    const outputStream = {
      closeCount: 0,
      write(_value: string, length: number) {
        return length;
      },
      close() {
        this.closeCount += 1;
      },
    };
    const transfer = beginRuntimeFileResponseTransfer({
      headers: "Header\r\n",
      source: { path: "controlled.bin", size: 3 },
      outputStream,
    });
    const copySettlement = observeSettlement(transfer.completion);
    await waitUntil(() => copySettlement.settled);

    assert.strictEqual(copySettlement.error, copyError);
    assert.strictEqual(copyFakes.fileInputs[0].closeCount, 1);
    assert.strictEqual(outputStream.closeCount, 1);
  });

  it("retains ownership when native cancellation throws until the stop callback", async function () {
    const readError = new Error("controlled read failure");
    const fakes = installXpcFileTransferFakes({
      readError,
      cancelError: new Error("controlled cancellation failure"),
    });
    restoreXpcFakes = fakes.restore;
    const digest = observeSettlement(
      digestRuntimeFileSource({ path: "controlled.bin", size: 3 }),
    );
    await waitUntil(() => fakes.pump.cancelCount === 1);
    assert.isFalse(digest.settled);
    assert.equal(
      runtimeFileTransferInternalsForTests.getMetrics().activeTransfers,
      1,
    );
    fakes.pump.observer.onStopRequest(null, 0x804b0002);
    await waitUntil(() => digest.settled);
    assert.strictEqual(digest.error, readError);

    const outputStream = {
      write(_value: string, length: number) {
        return length;
      },
      close() {},
    };
    const transfer = beginRuntimeFileResponseTransfer({
      headers: "Header\r\n",
      source: { path: "controlled.bin", size: 3 },
      outputStream,
    });
    const copy = observeSettlement(transfer.completion);
    await waitUntil(() => Boolean(fakes.copier.observer));
    transfer.abort();
    assert.isFalse(copy.settled);
    assert.equal(
      runtimeFileTransferInternalsForTests.getMetrics().activeTransfers,
      1,
    );
    fakes.copier.observer.onStopRequest(null, 0x804b0002);
    await waitUntil(() => copy.settled);
    assert.instanceOf(copy.error, RuntimeFileTransferError);
    assert.equal(
      runtimeFileTransferInternalsForTests.getMetrics().activeTransfers,
      0,
    );
  });
});

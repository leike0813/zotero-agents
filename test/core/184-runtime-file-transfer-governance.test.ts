import { assert } from "chai";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
  RUNTIME_FILE_TRANSFER_POLICY,
  collectRuntimeFileSourceBytesForTests,
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
  runtimeFileTransferInternalsForTests,
} from "../../src/modules/runtimeFileTransfer";
import {
  registerHostBridgeFileHandlesInOrder,
  resetHostBridgeFileRegistryForTests,
} from "../../src/modules/hostBridgeFileRegistry";

describe("runtime file transfer governance", function () {
  afterEach(function () {
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
});

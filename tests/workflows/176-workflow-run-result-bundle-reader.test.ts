import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openRunResultBundleReader } from "../../src/modules/workflowExecution/bundleIO";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-run-result-bundle-"));
}

async function assertPathMissing(filePath: string) {
  try {
    await fs.access(filePath);
    assert.fail(`expected path to be missing: ${filePath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

describe("workflow run result bundle reader", function () {
  it("opens bundle bytes as a temp zip and dispose removes the file", async function () {
    const handle = await openRunResultBundleReader({
      result: { bundleBytes: new Uint8Array([1, 2, 3]) },
      requestId: "request-zip",
    });

    try {
      assert.isNotEmpty(handle.bundlePath);
      await fs.access(handle.bundlePath);
      assert.isOk(handle.bundleReader);
    } finally {
      await handle.dispose();
    }
    await assertPathMissing(handle.bundlePath);
  });

  it("opens a bundle directory without writing a temp file", async function () {
    const root = await mkTempRoot();
    try {
      const handle = await openRunResultBundleReader({
        result: { bundleDir: root },
        requestId: "request-dir",
      });

      assert.equal(handle.bundlePath, "");
      assert.equal(await handle.bundleReader.getExtractedDir?.(), root);
      await handle.dispose();
      await fs.access(root);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("opens an unavailable reader when no bundle source exists", async function () {
    const handle = await openRunResultBundleReader({
      result: {},
      requestId: "request-missing",
    });

    assert.equal(handle.bundlePath, "");
    try {
      await handle.bundleReader.readText("missing/entry.txt");
      assert.fail("expected unavailable reader to reject entry reads");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "does not provide bundle content",
      );
    }
    await handle.dispose();
  });

  it("dispose is idempotent for temp zip handles", async function () {
    const handle = await openRunResultBundleReader({
      result: { bundleBytes: new Uint8Array([4, 5, 6]) },
      requestId: "request-idempotent",
    });
    const bundlePath = handle.bundlePath;

    await handle.dispose();
    await handle.dispose();
    await assertPathMissing(bundlePath);
  });

  it("non-empty bytes win over a bundle directory; empty bytes do not", async function () {
    const root = await mkTempRoot();
    try {
      const bytesHandle = await openRunResultBundleReader({
        result: {
          bundleBytes: new Uint8Array([7, 8, 9]),
          bundleDir: root,
        },
        requestId: "request-bytes-first",
      });
      assert.isNotEmpty(bytesHandle.bundlePath);
      await fs.access(bytesHandle.bundlePath);
      await bytesHandle.dispose();
      await assertPathMissing(bytesHandle.bundlePath);

      const dirHandle = await openRunResultBundleReader({
        result: {
          bundleBytes: new Uint8Array(0),
          bundleDir: root,
        },
        requestId: "request-empty-bytes",
      });
      assert.equal(dirHandle.bundlePath, "");
      assert.equal(await dirHandle.bundleReader.getExtractedDir?.(), root);
      await dirHandle.dispose();
      await fs.access(root);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

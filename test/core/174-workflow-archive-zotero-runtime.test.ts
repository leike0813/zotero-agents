import { assert } from "chai";
import { joinPath } from "../../src/utils/path";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";

function getRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
    PathUtils?: { tempDir?: string };
    IOUtils?: {
      remove?: (
        path: string,
        options?: { recursive?: boolean; ignoreAbsent?: boolean },
      ) => Promise<void>;
    };
  };
  return runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock"
    ? runtime
    : null;
}

describe("workflow archive Zotero runtime", function () {
  it("round-trips ZIP through the Zotero runtime", async function () {
    const runtime = getRealZoteroRuntime();
    if (!runtime) {
      this.skip();
    }
    const tempDir = runtime?.PathUtils?.tempDir;
    const remove = runtime?.IOUtils?.remove;
    assert.isString(tempDir);
    assert.isFunction(remove);
    if (!tempDir || typeof remove !== "function") {
      throw new Error("Zotero archive test runtime file APIs are unavailable");
    }
    const targetPath = joinPath(
      tempDir,
      `zs-runtime-archive-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`,
    );
    const archive = createWorkflowArchiveApi();
    try {
      const written = await archive.writeZipAtomic({
        targetPath,
        entries: [
          { name: "manifest.json", text: '{"runtime":"zotero"}' },
          { name: "payload.bin", bytes: new Uint8Array([7, 8, 9]) },
        ],
      });
      assert.match(written.files["manifest.json"].sha256, /^[a-f0-9]{64}$/);
      await archive.withExtractedZip(targetPath, async (extracted) => {
        assert.equal(
          await extracted.readText("manifest.json"),
          '{"runtime":"zotero"}',
        );
        assert.deepEqual(
          Array.from(await extracted.readBytes("payload.bin")),
          [7, 8, 9],
        );
        const remeasured = await extracted.measureEntries(["payload.bin"]);
        assert.deepEqual(
          remeasured.files["payload.bin"],
          written.files["payload.bin"],
        );
      });
    } finally {
      await remove(targetPath, {
        recursive: true,
        ignoreAbsent: true,
      });
    }
  });
});

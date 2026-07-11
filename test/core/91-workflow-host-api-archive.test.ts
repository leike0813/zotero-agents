import { assert } from "chai";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";

describe("workflow host api archive facade", function () {
  let root = "";

  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-archive-test-"));
    resetWorkflowHostApiForTests();
  });

  afterEach(async function () {
    resetWorkflowHostApiForTests();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("round-trips file, text, and byte entries with integrity metadata", async function () {
    const sourcePath = path.join(root, "source.bin");
    const targetPath = path.join(root, "bundle.zip");
    await fs.writeFile(sourcePath, Buffer.from([1, 2, 3, 4]));
    const host = createWorkflowHostApi();

    const written = await host.archive.writeZipAtomic({
      targetPath,
      entries: [
        { name: "manifest.json", text: '{"kind":"test"}' },
        { name: "files/source.bin", sourcePath },
        { name: "files/bytes.bin", bytes: new Uint8Array([5, 6, 7]) },
      ],
    });

    assert.sameMembers(Object.keys(written.files), [
      "manifest.json",
      "files/source.bin",
      "files/bytes.bin",
    ]);
    assert.equal(written.files["files/source.bin"].size, 4);
    assert.match(written.files["files/source.bin"].sha256, /^[a-f0-9]{64}$/);

    let extractedRoot = "";
    await host.archive.withExtractedZip(targetPath, async (archive) => {
      extractedRoot = archive.rootPath;
      assert.sameMembers(archive.entries, [
        "manifest.json",
        "files/source.bin",
        "files/bytes.bin",
      ]);
      assert.equal(await archive.readText("manifest.json"), '{"kind":"test"}');
      assert.deepEqual(
        Array.from(await archive.readBytes("files/source.bin")),
        [1, 2, 3, 4],
      );
      assert.equal(
        archive.resolvePath("files/bytes.bin").replace(/\\/g, "/"),
        `${archive.rootPath.replace(/\\/g, "/")}/files/bytes.bin`,
      );
    });
    let cleanupError: unknown;
    try {
      await fs.access(extractedRoot);
    } catch (error) {
      cleanupError = error;
    }
    assert.instanceOf(cleanupError, Error);
  });

  it("rejects unsafe and duplicate entry names", async function () {
    const archive = createWorkflowHostApi().archive;
    for (const entries of [
      [{ name: "../escape.txt", text: "x" }],
      [
        { name: "same.txt", text: "a" },
        { name: "same.txt", text: "b" },
      ],
    ]) {
      let error: unknown;
      try {
        await archive.writeZipAtomic({
          targetPath: path.join(root, `${Math.random()}.zip`),
          entries,
        });
      } catch (caught) {
        error = caught;
      }
      assert.instanceOf(error, Error);
    }
  });

  it("preserves an existing target when archive creation fails", async function () {
    const targetPath = path.join(root, "existing.zip");
    await fs.writeFile(targetPath, "original");

    let error: unknown;
    try {
      await createWorkflowHostApi().archive.writeZipAtomic({
        targetPath,
        entries: [
          { name: "missing.bin", sourcePath: path.join(root, "missing.bin") },
        ],
      });
    } catch (caught) {
      error = caught;
    }

    assert.instanceOf(error, Error);
    assert.equal(await fs.readFile(targetPath, "utf8"), "original");
  });
});

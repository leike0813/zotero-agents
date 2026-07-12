import { assert } from "chai";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";

function installRuntimeGlobals(values: Record<string, unknown>) {
  const runtime = globalThis as Record<string, unknown>;
  const originalProperties = new Map(
    Object.keys(values).map((name) => [
      name,
      Object.getOwnPropertyDescriptor(runtime, name),
    ]),
  );
  for (const [name, value] of Object.entries(values)) {
    Object.defineProperty(runtime, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
  return () => {
    for (const [name, descriptor] of originalProperties) {
      if (descriptor) {
        Object.defineProperty(runtime, name, descriptor);
      } else {
        delete runtime[name];
      }
    }
  };
}

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
      const remeasured = await archive.measureEntries([
        "files/source.bin",
        "files/bytes.bin",
      ]);
      assert.deepEqual(remeasured.files, {
        "files/source.bin": written.files["files/source.bin"],
        "files/bytes.bin": written.files["files/bytes.bin"],
      });
    });
    let cleanupError: unknown;
    try {
      await fs.access(extractedRoot);
    } catch (error) {
      cleanupError = error;
    }
    assert.instanceOf(cleanupError, Error);
  });

  it("uses nsICryptoHash when WebCrypto is unavailable", async function () {
    const expectedHash =
      "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81";
    const digestBytes = (expectedHash.match(/.{2}/g) || []).map((value) =>
      Number.parseInt(value, 16),
    );
    const nsICryptoHash = { SHA256: 42 };
    let createInstanceCalls = 0;
    let initializedWith: unknown;
    let updatedBytes: number[] = [];
    let updatedLength = 0;
    const restoreRuntime = installRuntimeGlobals({
      crypto: undefined,
      Components: {
        classes: {
          "@mozilla.org/security/hash;1": {
            createInstance(contract: unknown) {
              createInstanceCalls += 1;
              assert.equal(contract, nsICryptoHash);
              return {
                init(algorithm: unknown) {
                  initializedWith = algorithm;
                },
                update(bytes: number[], length: number) {
                  updatedBytes = bytes;
                  updatedLength = length;
                },
                finish(ascii: boolean) {
                  assert.isFalse(ascii);
                  return String.fromCharCode(...digestBytes);
                },
              };
            },
          },
        },
        interfaces: { nsICryptoHash },
      },
    });
    try {
      const measured = await createWorkflowHostApi().archive.measureEntries([
        { name: "entry.bin", bytes: new Uint8Array([1, 2, 3]) },
      ]);

      assert.equal(createInstanceCalls, 1);
      assert.equal(initializedWith, nsICryptoHash.SHA256);
      assert.deepEqual(updatedBytes, [1, 2, 3]);
      assert.equal(updatedLength, 3);
      assert.equal(measured.files["entry.bin"].sha256, expectedHash);
    } finally {
      restoreRuntime();
    }
  });

  it("uses runtime IO when Zotero has no Cc/Ci aliases or Node runtime", async function () {
    let writeCalls = 0;
    let moveCalls = 0;
    const restoreRuntime = installRuntimeGlobals({
      process: undefined,
      Components: undefined,
      Cc: undefined,
      Ci: undefined,
      OS: undefined,
      PathUtils: { tempDir: root },
      IOUtils: {
        async exists(targetPath: string) {
          try {
            await fs.access(targetPath);
            return true;
          } catch {
            return false;
          }
        },
        async stat(targetPath: string) {
          const entry = await fs.stat(targetPath);
          return {
            type: entry.isDirectory() ? "directory" : "regular",
            size: entry.size,
          };
        },
        makeDirectory(targetPath: string) {
          return fs.mkdir(targetPath, { recursive: true });
        },
        async read(targetPath: string) {
          return new Uint8Array(await fs.readFile(targetPath));
        },
        async write(targetPath: string, bytes: Uint8Array) {
          writeCalls += 1;
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.writeFile(targetPath, bytes);
        },
        async move(sourcePath: string, targetPath: string) {
          moveCalls += 1;
          await fs.rename(sourcePath, targetPath);
        },
        remove(targetPath: string) {
          return fs.rm(targetPath, { recursive: true, force: true });
        },
      },
    });
    try {
      const archive = createWorkflowHostApi().archive;
      const targetPath = path.join(root, "zotero9-runtime.zip");
      const written = await archive.writeZipAtomic({
        targetPath,
        entries: [
          { name: "manifest.json", text: '{"runtime":"zotero9"}' },
          { name: "payload.bin", bytes: new Uint8Array([4, 5, 6]) },
        ],
      });

      assert.isAtLeast(writeCalls, 1);
      assert.equal(moveCalls, 1);
      assert.match(written.files["manifest.json"].sha256, /^[a-f0-9]{64}$/);
      await archive.withExtractedZip(targetPath, async (extracted) => {
        assert.equal(
          await extracted.readText("manifest.json"),
          '{"runtime":"zotero9"}',
        );
        assert.deepEqual(
          Array.from(await extracted.readBytes("payload.bin")),
          [4, 5, 6],
        );
      });
    } finally {
      restoreRuntime();
    }
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

  it("rejects unsafe, duplicate, and unknown extracted measurement names", async function () {
    const archive = createWorkflowHostApi().archive;
    const targetPath = path.join(root, "measure.zip");
    await archive.writeZipAtomic({
      targetPath,
      entries: [{ name: "known.bin", bytes: new Uint8Array([1]) }],
    });
    await archive.withExtractedZip(targetPath, async (extracted) => {
      for (const names of [
        ["../escape.bin"],
        ["known.bin", "known.bin"],
        ["unknown.bin"],
      ]) {
        let error: unknown;
        try {
          await extracted.measureEntries(names);
        } catch (caught) {
          error = caught;
        }
        assert.instanceOf(error, Error);
      }
    });
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

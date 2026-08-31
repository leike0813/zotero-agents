import { assert } from "chai";
import { rejects as assertRejects } from "node:assert";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";
import type { WorkflowExtractedArchive } from "../../src/workflows/archive";

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
        {
          name: "manifest.json",
          content: { kind: "text", text: '{"kind":"test"}' },
        },
        { name: "files/source.bin", content: { kind: "file", sourcePath } },
        {
          name: "files/bytes.bin",
          content: { kind: "bytes", bytes: new Uint8Array([5, 6, 7]) },
        },
      ],
    });

    assert.sameMembers(Object.keys(written.files), [
      "manifest.json",
      "files/source.bin",
      "files/bytes.bin",
    ]);
    assert.equal(written.files["files/source.bin"].sizeBytes, 4);
    assert.match(written.files["files/source.bin"].sha256, /^[a-f0-9]{64}$/);
    assert.equal(written.totalEntries, 3);

    let extractedRoot = "";
    await host.archive.withExtractedZip(
      { sourcePath: targetPath },
      {},
      async (archive) => {
        extractedRoot = archive.rootPath;
        assert.sameMembers(archive.entries, [
          "manifest.json",
          "files/source.bin",
          "files/bytes.bin",
        ]);
        assert.equal(
          await archive.readText("manifest.json"),
          '{"kind":"test"}',
        );
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
      },
    );
    let cleanupError: unknown;
    try {
      await fs.access(extractedRoot);
    } catch (error) {
      cleanupError = error;
    }
    assert.instanceOf(cleanupError, Error);
  });

  it("measures local file URL sources through the native path boundary", async function () {
    const sourcePath = path.join(root, "source.bin");
    await fs.writeFile(sourcePath, Buffer.from([1, 2, 3, 4]));

    const measured = await createWorkflowHostApi().archive.measureEntries({
      entries: [
        {
          name: "files/source.bin",
          content: {
            kind: "file",
            sourcePath: pathToFileURL(sourcePath).href,
          },
        },
      ],
    });

    assert.equal(measured.files["files/source.bin"].sizeBytes, 4);
    assert.match(measured.files["files/source.bin"].sha256, /^[a-f0-9]{64}$/);
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
      const measured = await createWorkflowHostApi().archive.measureEntries({
        entries: [
          {
            name: "entry.bin",
            content: { kind: "bytes", bytes: new Uint8Array([1, 2, 3]) },
          },
        ],
      });

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
          {
            name: "manifest.json",
            content: { kind: "text", text: '{"runtime":"zotero9"}' },
          },
          {
            name: "payload.bin",
            content: { kind: "bytes", bytes: new Uint8Array([4, 5, 6]) },
          },
        ],
      });

      assert.isAtLeast(writeCalls, 1);
      assert.equal(moveCalls, 1);
      assert.match(written.files["manifest.json"].sha256, /^[a-f0-9]{64}$/);
      await archive.withExtractedZip(
        { sourcePath: targetPath },
        {},
        async (extracted) => {
          assert.equal(
            await extracted.readText("manifest.json"),
            '{"runtime":"zotero9"}',
          );
          assert.deepEqual(
            Array.from(await extracted.readBytes("payload.bin")),
            [4, 5, 6],
          );
        },
      );
    } finally {
      restoreRuntime();
    }
  });

  it("rejects unsafe, duplicate, and case-folded duplicate entry names with stable error codes", async function () {
    const archive = createWorkflowHostApi().archive;
    const cases: Array<{
      entries: Array<{ name: string; content: { kind: "text"; text: string } }>;
      code: string;
    }> = [
      {
        entries: [
          { name: "../escape.txt", content: { kind: "text", text: "x" } },
        ],
        code: "invalid_request",
      },
      {
        entries: [
          { name: "same.txt", content: { kind: "text", text: "a" } },
          { name: "same.txt", content: { kind: "text", text: "b" } },
        ],
        code: "invalid_request",
      },
      {
        entries: [
          { name: "Same.txt", content: { kind: "text", text: "a" } },
          { name: "same.txt", content: { kind: "text", text: "b" } },
        ],
        code: "invalid_request",
      },
    ];
    for (const { entries, code } of cases) {
      let error: unknown;
      try {
        await archive.writeZipAtomic({
          targetPath: path.join(root, `${Math.random()}.zip`),
          entries,
        });
      } catch (caught) {
        error = caught;
      }
      assert.equal((error as { code?: string })?.code, code);
    }
  });

  it("rejects entries without exactly one content variant", async function () {
    const archive = createWorkflowHostApi().archive;
    for (const content of [
      undefined,
      { kind: "file" },
      { kind: "unknown", text: "x" },
    ]) {
      let error: unknown;
      try {
        await archive.measureEntries({
          entries: [
            {
              name: "entry.txt",
              content: content as never,
            },
          ],
        });
      } catch (caught) {
        error = caught;
      }
      assert.equal((error as { code?: string })?.code, "invalid_request");
    }
  });

  it("rejects unsafe, duplicate, and unknown extracted measurement names", async function () {
    const archive = createWorkflowHostApi().archive;
    const targetPath = path.join(root, "measure.zip");
    await archive.writeZipAtomic({
      targetPath,
      entries: [
        {
          name: "known.bin",
          content: { kind: "bytes", bytes: new Uint8Array([1]) },
        },
      ],
    });
    await archive.withExtractedZip(
      { sourcePath: targetPath },
      {},
      async (extracted) => {
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
      },
    );
  });

  it("preserves an existing target when archive creation fails", async function () {
    const targetPath = path.join(root, "existing.zip");
    await fs.writeFile(targetPath, "original");

    let error: unknown;
    try {
      await createWorkflowHostApi().archive.writeZipAtomic({
        targetPath,
        entries: [
          {
            name: "missing.bin",
            content: {
              kind: "file",
              sourcePath: path.join(root, "missing.bin"),
            },
          },
        ],
      });
    } catch (caught) {
      error = caught;
    }

    assert.instanceOf(error, Error);
    assert.equal(await fs.readFile(targetPath, "utf8"), "original");
  });

  it("invalidates an extracted archive handle after its callback settles", async function () {
    const targetPath = path.join(root, "scoped.zip");
    const archive = createWorkflowHostApi().archive;
    await archive.writeZipAtomic({
      targetPath,
      entries: [
        { name: "payload.txt", content: { kind: "text", text: "scoped" } },
      ],
    });

    let extracted: WorkflowExtractedArchive | undefined;
    await archive.withExtractedZip(
      { sourcePath: targetPath },
      {},
      async (current) => {
        extracted = current;
        assert.equal(await current.readText("payload.txt"), "scoped");
      },
    );

    assert.throws(() => extracted?.resolvePath("payload.txt"));
    await assertRejects(extracted?.readBytes("payload.txt"));
    await assertRejects(extracted?.measureEntries(["payload.txt"]));
  });

  it("rejects archives that exceed fixed entry name and count bounds", async function () {
    const archive = createWorkflowHostApi().archive;

    await assertRejects(
      archive.measureEntries({
        entries: [
          {
            name: `${"a".repeat(1021)}.txt`,
            content: { kind: "text", text: "x" },
          },
        ],
      }),
      (error: { code?: string }) => error?.code === "resource_limited",
    );
    await assertRejects(
      archive.measureEntries({
        entries: Array.from({ length: 20_001 }, (_, index) => ({
          name: `entries/${index}.txt`,
          content: { kind: "text" as const, text: "" },
        })),
      }),
      (error: { code?: string }) => error?.code === "resource_limited",
    );
  });

  it("fails canceled measure and write calls with a stable canceled error", async function () {
    const archive = createWorkflowHostApi().archive;
    const controller = new AbortController();
    controller.abort();
    const control = { signal: controller.signal };

    await assertRejects(
      archive.measureEntries(
        {
          entries: [
            { name: "a.txt", content: { kind: "text", text: "a" } },
          ],
        },
        control,
      ),
      (error: { code?: string; details?: { reason?: string } }) =>
        error?.code === "canceled" &&
        error?.details?.reason === "caller_signal",
    );
    await assertRejects(
      archive.writeZipAtomic(
        {
          targetPath: path.join(root, "canceled.zip"),
          entries: [
            { name: "a.txt", content: { kind: "text", text: "a" } },
          ],
        },
        control,
      ),
      (error: { code?: string }) => error?.code === "canceled",
    );
    assert.isFalse(
      await fs
        .access(path.join(root, "canceled.zip"))
        .then(() => true)
        .catch(() => false),
    );
  });

  it("does not publish a late success result when cancellation lands mid-write", async function () {
    const archive = createWorkflowHostApi().archive;
    const controller = new AbortController();
    const targetPath = path.join(root, "mid-write.zip");
    const entries = Array.from({ length: 32 }, (_, index) => ({
      name: `entries/${index}.txt`,
      content: {
        kind: "bytes" as const,
        bytes: new Uint8Array([index % 256]),
      },
    }));
    // Abort while the write path is measuring entries; the native write
    // itself is not interruptible, so the member must fail with a stable
    // canceled error instead of publishing a late success result.
    const probe = archive.writeZipAtomic(
      { targetPath, entries },
      { signal: controller.signal },
    );
    controller.abort();
    await assertRejects(
      probe,
      (error: { code?: string }) => error?.code === "canceled",
    );
  });

  it("cancels withExtractedZip before and after the callback", async function () {
    const archive = createWorkflowHostApi().archive;
    const targetPath = path.join(root, "scoped-cancel.zip");
    await archive.writeZipAtomic({
      targetPath,
      entries: [
        { name: "payload.txt", content: { kind: "text", text: "scoped" } },
      ],
    });

    const preAborted = new AbortController();
    preAborted.abort();
    await assertRejects(
      archive.withExtractedZip(
        { sourcePath: targetPath },
        { signal: preAborted.signal },
        async () => "unreachable",
      ),
      (error: { code?: string }) => error?.code === "canceled",
    );

    const midRun = new AbortController();
    await assertRejects(
      archive.withExtractedZip(
        { sourcePath: targetPath },
        { signal: midRun.signal },
        async (extracted) => {
          assert.equal(await extracted.readText("payload.txt"), "scoped");
          midRun.abort();
          return "late-success";
        },
      ),
      (error: { code?: string }) => error?.code === "canceled",
    );
  });
});

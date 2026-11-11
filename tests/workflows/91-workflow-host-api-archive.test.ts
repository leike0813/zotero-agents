import { assert } from "chai";
import { rejects as assertRejects } from "node:assert";
import { promises as fs } from "fs";
import { writeFileSync } from "node:fs";
import { createStoreZipBytes } from "../../src/modules/zipStore";
import { assertRuntimePathBudget } from "../../src/modules/runtimePersistence";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";
import type { WorkflowExtractedArchive } from "../../src/workflows/archive";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";

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

function longNativeDirectory(root: string, seed: string) {
  return path.join(root, seed.repeat(80), seed.repeat(80), seed.repeat(40));
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

  it("preflights workflow bundle extraction before any entry is written", async function () {
    const bundle = path.join(root, "result.zip");
    const extractionRoot = path.join(root, "extract");
    await fs.mkdir(extractionRoot);
    await fs.writeFile(
      bundle,
      createStoreZipBytes([
        { name: "full.md", bytes: new TextEncoder().encode("ready") },
        {
          name: `${"a".repeat(140)}/${"b".repeat(140)}.png`,
          bytes: new Uint8Array([1]),
        },
      ]),
    );
    const restore = installRuntimeGlobals({
      Cc: undefined,
      Ci: undefined,
      Zotero: { ...Zotero, isWin: true },
      PathUtils: { tempDir: extractionRoot },
    });
    try {
      await assertRejects(
        new ZipBundleReader(bundle).getExtractedDir(),
        (error: { code?: string }) => error.code === "resource_limited",
      );
      assert.deepEqual(await fs.readdir(extractionRoot), []);
    } finally {
      restore();
    }
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

  it("writes through the available native queue and reports completed work", async function () {
    const queued: Array<{ name: string; path: string }> = [];
    const payloads: Array<{ name: string; bytes: Uint8Array }> = [];
    const observations: Array<{
      phase: string;
      completed: number;
      total?: number;
    }> = [];
    let target = "";
    let opened = false;
    let pending = false;
    let queueRuns = 0;
    const runtime = globalThis as typeof globalThis & {
      Zotero: Record<string, unknown>;
    };
    const restore = installRuntimeGlobals({
      Zotero: {
        ...runtime.Zotero,
        File: { pathToFile: (path: string) => ({ path }) },
      },
      Components: {
        classes: {
          "@mozilla.org/zipwriter;1": {
            createInstance() {
              return {
                open(file: { path: string }) {
                  opened = true;
                  target = file.path;
                },
                addEntryFile(
                  name: string,
                  _level: number,
                  file: { path: string },
                  enqueue: boolean,
                ) {
                  assert.isTrue(enqueue);
                  queued.push({ name, path: file.path });
                },
                processQueue(observer: {
                  onStartRequest(request: unknown): void;
                  onStopRequest(request: unknown, status: number): void;
                }) {
                  pending = true;
                  queueRuns++;
                  observer.onStartRequest({});
                  setTimeout(async () => {
                    for (const entry of queued.splice(0)) {
                      payloads.push({
                        name: entry.name,
                        bytes: await fs.readFile(entry.path),
                      });
                    }
                    pending = false;
                    observer.onStopRequest({}, 0);
                  }, 0);
                },
                close() {
                  assert.isFalse(pending, "writer must settle before closing");
                  writeFileSync(target, createStoreZipBytes(payloads));
                },
              };
            },
          },
        },
        interfaces: { nsIZipWriter: { COMPRESSION_DEFAULT: 6 } },
      },
    });
    try {
      const archive = createWorkflowHostApi().archive;
      const result = await archive.writeZipAtomic(
        {
          targetPath: path.join(root, "native.zip"),
          entries: [
            { name: "a.txt", content: { kind: "text", text: "first" } },
            { name: "b.txt", content: { kind: "text", text: "second" } },
          ],
        },
        {
          onProgress(progress) {
            observations.push(progress);
          },
        },
      );
      assert.isTrue(opened, "native writer must be selected");
      assert.isAtLeast(queueRuns, 1);
      assert.includeDeepMembers(observations, [
        { phase: "archive", completed: 2, total: 2, unit: "items" },
      ]);
      assert.deepEqual(await fs.readdir(root), ["native.zip"]);
      await archive.withExtractedZip(
        { sourcePath: result.targetPath },
        {},
        async (zip) => {
          assert.equal(await zip.readText("a.txt"), "first");
          assert.equal(await zip.readText("b.txt"), "second");
        },
      );
    } finally {
      restore();
    }
  });

  it("writes a near-limit long basename through a short sibling directory", async function () {
    const archive = createWorkflowHostApi().archive;
    const stemLength =
      process.platform === "win32" ? Math.min(240, 254 - root.length) : 240;
    const basename = `${"a".repeat(stemLength)}.zip`;
    const targetPath = path.join(root, basename);

    const written = await archive.writeZipAtomic({
      targetPath,
      entries: [
        { name: "payload.txt", content: { kind: "text", text: "near limit" } },
      ],
    });

    assert.equal(written.targetPath, targetPath);
    assert.deepEqual(await fs.readdir(root), [basename]);
    await archive.withExtractedZip(
      { sourcePath: targetPath },
      {},
      async (extracted) => {
        assert.equal(await extracted.readText("payload.txt"), "near limit");
      },
    );
  });

  it("stages long native archive inputs and outputs in short compatibility paths", async function () {
    if (process.platform !== "win32") this.skip();
    const sourceDirectory = longNativeDirectory(root, "a");
    const targetDirectory = longNativeDirectory(root, "b");
    await fs.mkdir(sourceDirectory, { recursive: true });
    await fs.mkdir(targetDirectory, { recursive: true });
    const sourcePath = path.join(sourceDirectory, "long-input.bin");
    const targetPath = path.join(targetDirectory, "bundle.zip");
    await fs.writeFile(sourcePath, "long native input");
    assert.throws(() => assertRuntimePathBudget(sourcePath));
    assert.throws(() => assertRuntimePathBudget(targetPath));

    const queued: Array<{ name: string; path: string }> = [];
    const addedEntries: Array<{ name: string; path: string }> = [];
    const payloads: Array<{ name: string; bytes: Uint8Array }> = [];
    let openedPath = "";
    let pending = false;
    const runtime = globalThis as typeof globalThis & {
      Zotero: Record<string, unknown>;
    };
    const restore = installRuntimeGlobals({
      Zotero: {
        ...runtime.Zotero,
        File: { pathToFile: (target: string) => ({ path: target }) },
      },
      Components: {
        classes: {
          "@mozilla.org/zipwriter;1": {
            createInstance() {
              return {
                open(file: { path: string }) {
                  openedPath = file.path;
                },
                addEntryFile(
                  name: string,
                  _level: number,
                  file: { path: string },
                  enqueue: boolean,
                ) {
                  assert.isTrue(enqueue);
                  const entry = { name, path: file.path };
                  queued.push(entry);
                  addedEntries.push(entry);
                },
                processQueue(observer: {
                  onStartRequest(request: unknown): void;
                  onStopRequest(request: unknown, status: number): void;
                }) {
                  pending = true;
                  observer.onStartRequest({});
                  setTimeout(async () => {
                    for (const entry of queued.splice(0)) {
                      payloads.push({
                        name: entry.name,
                        bytes: await fs.readFile(entry.path),
                      });
                    }
                    pending = false;
                    observer.onStopRequest({}, 0);
                  }, 0);
                },
                close() {
                  assert.isFalse(pending);
                  writeFileSync(openedPath, createStoreZipBytes(payloads));
                },
              };
            },
          },
        },
        interfaces: { nsIZipWriter: { COMPRESSION_DEFAULT: 6 } },
      },
    });
    try {
      const archive = createWorkflowHostApi().archive;
      const written = await archive.writeZipAtomic({
        targetPath,
        entries: [
          {
            name: "files/long-input.bin",
            content: { kind: "file", sourcePath },
          },
        ],
      });
      assert.equal(written.targetPath, targetPath);
      assert.isNotEmpty(openedPath);
      assertRuntimePathBudget(openedPath);
      assert.equal(addedEntries.length, 1);
      assert.notEqual(addedEntries[0].path, sourcePath);
      assertRuntimePathBudget(addedEntries[0].path);
      assert.equal(
        await fs.readFile(targetPath).then((bytes) => bytes.length > 0),
        true,
      );

      await archive.withExtractedZip(
        { sourcePath: targetPath },
        {},
        async (extracted) => {
          assert.equal(
            await extracted.readText("files/long-input.bin"),
            "long native input",
          );
        },
      );
      assert.deepEqual(await fs.readdir(targetDirectory), ["bundle.zip"]);
    } finally {
      restore();
    }
  });

  it("copies a long bundle source into a short extraction scope", async function () {
    if (process.platform !== "win32") this.skip();
    const sourceDirectory = longNativeDirectory(root, "c");
    const deepTempRoot = longNativeDirectory(root, "d");
    await fs.mkdir(sourceDirectory, { recursive: true });
    await fs.mkdir(deepTempRoot, { recursive: true });
    const bundlePath = path.join(sourceDirectory, "result.zip");
    await fs.writeFile(
      bundlePath,
      createStoreZipBytes([
        { name: "result.txt", bytes: new TextEncoder().encode("long source") },
      ]),
    );
    assert.throws(() => assertRuntimePathBudget(bundlePath));
    assert.throws(() => assertRuntimePathBudget(deepTempRoot, "directory"));

    const restore = installRuntimeGlobals({
      Cc: undefined,
      Ci: undefined,
      Zotero: { ...Zotero, isWin: true },
      PathUtils: { tempDir: deepTempRoot },
    });
    let reader: ZipBundleReader | undefined;
    try {
      reader = new ZipBundleReader(bundlePath);
      const extractedDir = await reader.getExtractedDir();
      assertRuntimePathBudget(extractedDir, "directory");
      assert.equal(await reader.readText("result.txt"), "long source");
      assert.deepEqual(await fs.readdir(deepTempRoot), []);
    } finally {
      await reader?.dispose();
      restore();
    }
  });

  it("rejects an over-budget Windows target before opening the native writer", async function () {
    const writes: string[] = [];
    let opened = false;
    const runtime = globalThis as typeof globalThis & {
      Zotero: Record<string, unknown>;
    };
    const restore = installRuntimeGlobals({
      Zotero: {
        ...runtime.Zotero,
        File: { pathToFile: (target: string) => ({ path: target }) },
      },
      IOUtils: {
        write: async (target: string) => {
          writes.push(target);
        },
      },
      Components: {
        classes: {
          "@mozilla.org/zipwriter;1": {
            createInstance: () => ({
              open() {
                opened = true;
              },
              addEntryFile() {},
              processQueue() {},
              close() {},
            }),
          },
        },
        interfaces: { nsIZipWriter: { COMPRESSION_DEFAULT: 6 } },
      },
    });
    try {
      const windowsTarget = `C:\\${"a".repeat(256)}\\data.zip`;
      await assertRejects(
        createWorkflowHostApi().archive.writeZipAtomic({
          targetPath: windowsTarget,
          entries: [{ name: "a.txt", content: { kind: "text", text: "a" } }],
        }),
        (error: {
          code?: string;
          details?: { resource?: string; limit?: number; observed?: number };
        }) => {
          assert.equal(error?.code, "resource_limited");
          // The Host contract reports every path budget as `path_length`.
          assert.equal(error?.details?.resource, "path_length");
          assert.isAbove(
            error?.details?.observed ?? 0,
            error?.details?.limit ?? 0,
          );
          return true;
        },
      );
      assert.isFalse(opened);
      assert.deepEqual(writes, []);
    } finally {
      restore();
    }
  });

  it("rejects an over-budget extraction destination before writing entries", async function () {
    const archive = createWorkflowHostApi().archive;
    const targetPath = path.join(root, "oversized-entry.zip");
    const longName = `${"b".repeat(300)}.bin`;
    await archive.writeZipAtomic({
      targetPath,
      entries: [
        { name: "ok.txt", content: { kind: "text", text: "ok" } },
        { name: longName, content: { kind: "text", text: "long" } },
      ],
    });

    const writes: string[] = [];
    const restore = installRuntimeGlobals({
      IOUtils: {
        write: async (target: string) => {
          writes.push(target);
        },
      },
    });
    let callbackRan = false;
    try {
      await assertRejects(
        archive.withExtractedZip({ sourcePath: targetPath }, {}, async () => {
          callbackRan = true;
          return "unreachable";
        }),
        (error: {
          code?: string;
          details?: { resource?: string; limit?: number; observed?: number };
        }) => {
          assert.equal(error?.code, "resource_limited");
          // The Host contract reports every path budget as `path_length`.
          assert.equal(error?.details?.resource, "path_length");
          assert.isAbove(
            error?.details?.observed ?? 0,
            error?.details?.limit ?? 0,
          );
          return true;
        },
      );
    } finally {
      restore();
    }
    assert.isFalse(callbackRan);
    assert.deepEqual(writes, []);
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

  it("fails unavailable without native ZIP support in Zotero", async function () {
    const restore = installRuntimeGlobals({
      process: undefined,
      Components: undefined,
      Cc: undefined,
      Ci: undefined,
    });
    try {
      await assertRejects(
        createWorkflowHostApi().archive.writeZipAtomic({
          targetPath: path.join(root, "unavailable.zip"),
          entries: [{ name: "a.txt", content: { kind: "text", text: "a" } }],
        }),
        (error: { code?: string }) => error.code === "unavailable",
      );
    } finally {
      restore();
    }
  });

  for (const outcome of [
    "failed",
    "canceled",
    "changed",
    "changed-during-write",
  ] as const) {
    it(`preserves the target when the native queue is ${outcome}`, async function () {
      const targetPath = path.join(root, "existing.zip");
      const sourcePath = path.join(root, "source.txt");
      await fs.writeFile(targetPath, "original");
      await fs.writeFile(sourcePath, "source");
      const controller = new AbortController();
      let temporary = "";
      let pending = false;
      let closed = false;
      const runtime = globalThis as typeof globalThis & {
        Zotero: Record<string, unknown>;
      };
      const restore = installRuntimeGlobals({
        Zotero: {
          ...runtime.Zotero,
          File: { pathToFile: (path: string) => ({ path }) },
        },
        Components: {
          classes: {
            "@mozilla.org/zipwriter;1": {
              createInstance: () => ({
                open(file: { path: string }) {
                  temporary = file.path;
                  writeFileSync(temporary, "partial");
                },
                addEntryFile() {},
                processQueue(observer: {
                  onStopRequest(
                    request: unknown,
                    context: null,
                    status: number,
                  ): void;
                }) {
                  pending = true;
                  setTimeout(() => {
                    if (outcome === "canceled") controller.abort();
                    if (outcome === "changed-during-write")
                      writeFileSync(sourcePath, "changed during queue");
                    pending = false;
                    observer.onStopRequest(
                      {},
                      null,
                      outcome === "failed" ? 0x80004005 : 0,
                    );
                  }, 0);
                },
                close() {
                  assert.isFalse(pending);
                  closed = true;
                },
              }),
            },
          },
          interfaces: { nsIZipWriter: { COMPRESSION_DEFAULT: 6 } },
        },
      });
      try {
        await assertRejects(
          createWorkflowHostApi().archive.writeZipAtomic(
            {
              targetPath,
              entries: [
                { name: "source.txt", content: { kind: "file", sourcePath } },
              ],
            },
            {
              signal: controller.signal,
              onProgress(progress) {
                if (
                  outcome === "changed" &&
                  progress.phase === "measure" &&
                  progress.completed === 1
                ) {
                  writeFileSync(sourcePath, "changed");
                }
              },
            },
          ),
          (error: { code?: string }) =>
            error.code ===
            {
              failed: "execution_failed",
              canceled: "canceled",
              changed: "conflict",
              "changed-during-write": "conflict",
            }[outcome],
        );
        assert.isTrue(closed);
        assert.equal(await fs.readFile(targetPath, "utf8"), "original");
        await assertRejects(fs.access(temporary));
      } finally {
        restore();
      }
    });
  }

  it("does not let progress observers fail an archive operation", async function () {
    let observations = 0;
    const result = await createWorkflowHostApi().archive.writeZipAtomic(
      {
        targetPath: path.join(root, "observed.zip"),
        entries: [{ name: "a.txt", content: { kind: "text", text: "a" } }],
      },
      {
        onProgress() {
          observations++;
          throw new Error("observer");
        },
      },
    );
    assert.isAbove(observations, 0);
    assert.equal(result.totalEntries, 1);
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
          entries: [{ name: "a.txt", content: { kind: "text", text: "a" } }],
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
          entries: [{ name: "a.txt", content: { kind: "text", text: "a" } }],
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

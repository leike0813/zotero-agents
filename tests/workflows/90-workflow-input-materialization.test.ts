import { assert } from "chai";
import { rejects as assertRejects } from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getRuntimePersistencePaths,
  assertRuntimePathBudget,
  removeRuntimePath,
} from "../../src/modules/runtimePersistence";
import {
  createWorkflowInputMaterializer,
  materializeWorkflowInputFile,
} from "../../src/workflows/workflowInputMaterialization";
import { createWorkflowFileApi } from "../../src/workflows/file";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";

describe("Workflow Input Materialization", function () {
  it("keeps generated provider inputs compatible when workflow identity and runtime root are long", async function () {
    const previous = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-input-long-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = path.join(
      root,
      "a".repeat(90),
      "b".repeat(90),
    );
    let result: { path: string } | undefined;
    try {
      result = await materializeWorkflowInputFile({
        workflowId: "workflow".repeat(40),
        key: "key".repeat(60),
        fileName: `${"paper".repeat(60)}.yaml`,
        content: "甲😀 input",
      });
      assertRuntimePathBudget(result.path);
      assert.equal(path.extname(result.path), ".yaml");
      assert.equal(await fs.readFile(result.path, "utf8"), "甲😀 input");
    } finally {
      if (result) await removeRuntimePath(path.dirname(result.path));
      if (previous === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previous;
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it("materializes isolated text and binary provider inputs under managed runtime tmp", async function () {
    const first = await materializeWorkflowInputFile({
      workflowId: "tag-regulator/../unsafe",
      key: "valid_tags",
      fileName: "CON.yaml",
      content: "- topic:sequence\n",
    });
    const second = await materializeWorkflowInputFile({
      workflowId: "tag-regulator/../unsafe",
      key: "valid_tags",
      fileName: "CON.yaml",
      content: "- topic:other\n",
    });
    const binary = await materializeWorkflowInputFile({
      workflowId: "literature-deep-reading",
      key: "source_bundle_path",
      fileName: "source_bundle.zip",
      bytes: new Uint8Array([1, 2, 3]),
    });

    const normalizedTmp = getRuntimePersistencePaths().tmpDir.replace(
      /\\/g,
      "/",
    );
    for (const materialized of [first, second, binary]) {
      const normalized = materialized.path.replace(/\\/g, "/");
      assert.include(normalized, `${normalizedTmp}/workflow-inputs/`);
      assert.notInclude(normalized, "../");
      assert.isNumber(materialized.sizeBytes);
      assert.match(materialized.sha256, /^[a-f0-9]{64}$/);
    }
    assert.notEqual(first.path, second.path);
    assert.equal(await fs.readFile(first.path, "utf8"), "- topic:sequence\n");
    assert.deepEqual(Array.from(await fs.readFile(binary.path)), [1, 2, 3]);
  });

  it("rejects ambiguous or missing content before writing", async function () {
    for (const args of [
      {
        workflowId: "tag-regulator",
        key: "valid_tags",
        fileName: "valid_tags.yaml",
      },
      {
        workflowId: "tag-regulator",
        key: "valid_tags",
        fileName: "valid_tags.yaml",
        content: "content",
        bytes: new Uint8Array([1]),
      },
    ]) {
      let materializationError: unknown;
      try {
        await materializeWorkflowInputFile(args);
      } catch (error) {
        materializationError = error;
      }
      assert.equal(
        (materializationError as { code?: string })?.code,
        "invalid_request",
      );
    }
  });

  it("scopes host-facing materialization to the injected workflow/run identity", async function () {
    const hostApi = createWorkflowHostApi({
      inputScope: { workflowId: "tag-regulator", runId: "run-1" },
    });
    const materialized = await hostApi.file.materializeWorkflowInputFile({
      key: "valid_tags",
      fileName: "valid_tags.yaml",
      content: { kind: "text", text: "- topic:sequence\n" },
    });
    const normalized = materialized.path.replace(/\\/g, "/");
    assert.include(normalized, "/workflow-inputs/");
    assert.isNumber(materialized.sizeBytes);
    assert.match(materialized.sha256, /^[a-f0-9]{64}$/);
    assert.equal(
      await fs.readFile(materialized.path, "utf8"),
      "- topic:sequence\n",
    );

    const directMaterializer = createWorkflowInputMaterializer({
      workflowId: "literature-deep-reading",
      runId: "run-2",
    });
    let invalidVariant: unknown;
    try {
      await directMaterializer({
        fileName: "broken.dat",
        content: { kind: "unknown" } as never,
      });
    } catch (error) {
      invalidVariant = error;
    }
    assert.equal(
      (invalidVariant as { code?: string })?.code,
      "invalid_request",
    );
  });

  it("owns bounded stat, list, move, and remove operations", async function () {
    const file = createWorkflowFileApi();
    const root = `${getRuntimePersistencePaths().tmpDir}/workflow-file-owner-${Date.now()}`;
    const nested = `${root}/nested`;
    const source = `${nested}/source.txt`;
    const moved = `${nested}/moved.txt`;
    await file.makeDirectory({ path: nested });
    await file.writeText(source, "owned file\n");

    assert.deepInclude(await file.stat(source), {
      path: source,
      kind: "file",
      sizeBytes: 11,
    });
    const listing = await file.list({ path: root, recursive: true });
    assert.deepEqual(
      listing.entries.map((entry) => entry.relativePath),
      ["nested", "nested/source.txt"],
    );
    assert.equal(listing.totalFileBytes, 11);

    await file.move({ sourcePath: source, targetPath: moved });
    assert.isFalse(await file.exists(source));
    assert.isTrue(await file.exists(moved));
    await file.remove({ path: root, recursive: true });
    assert.isFalse(await file.exists(root));
  });

  it("atomically replaces long text and binary filenames without extending their names", async function () {
    const file = createWorkflowFileApi();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-long-file-"));
    try {
      const stemLength =
        process.platform === "win32" ? Math.min(238, 254 - root.length) : 238;
      for (const binary of [false, true]) {
        const target = path.join(
          root,
          `${"a".repeat(stemLength)}${binary ? ".bin" : ".txt"}`,
        );
        await fs.writeFile(target, "old");
        if (binary) {
          await file.writeBytes(target, new Uint8Array([0, 128, 255]));
          assert.deepEqual([...(await fs.readFile(target))], [0, 128, 255]);
        } else {
          await file.writeText(target, "new text");
          assert.equal(await fs.readFile(target, "utf8"), "new text");
        }
      }
      assert.equal((await fs.readdir(root)).length, 2);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("preserves an existing output when an overwrite copy fails", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-copy-"));
    const sourcePath = path.join(root, "source.bin");
    const targetPath = path.join(root, "target.bin");
    await fs.writeFile(sourcePath, "new");
    await fs.writeFile(targetPath, "old");
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "IOUtils");
    Object.defineProperty(globalThis, "IOUtils", {
      configurable: true,
      value: {
        copy: async () => {
          throw new Error("copy interrupted");
        },
      },
    });
    try {
      await assertRejects(
        createWorkflowFileApi().copy({
          sourcePath,
          targetPath,
          overwrite: true,
        }),
      );
      assert.equal(await fs.readFile(targetPath, "utf8"), "old");
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "IOUtils", descriptor);
      else Reflect.deleteProperty(globalThis, "IOUtils");
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unsafe complete Windows paths before filesystem effects", async function () {
    const runtime = globalThis as typeof globalThis & {
      Zotero: Record<string, unknown>;
      IOUtils?: unknown;
    };
    const previousZotero = Object.getOwnPropertyDescriptor(runtime, "Zotero");
    const previousIO = Object.getOwnPropertyDescriptor(runtime, "IOUtils");
    const effects: string[] = [];
    Object.defineProperty(runtime, "Zotero", {
      configurable: true,
      value: { ...runtime.Zotero, isWin: true },
    });
    Object.defineProperty(runtime, "IOUtils", {
      configurable: true,
      value: {
        makeDirectory: async () => {
          effects.push("mkdir");
        },
        stat: async () => ({ type: "regular", size: 1 }),
        writeUTF8: async () => {
          effects.push("write");
        },
        write: async () => {
          effects.push("write");
        },
        copy: async () => {
          effects.push("copy");
        },
        move: async () => {
          effects.push("move");
        },
        remove: async () => {
          effects.push("remove");
        },
      },
    });
    try {
      const file = createWorkflowFileApi();
      const tooLong = `C:\\${"segment\\".repeat(4100)}file.txt`;
      for (const operation of [
        () => file.writeText(tooLong, "new"),
        () => file.writeBytes(tooLong, new Uint8Array([1])),
        () => file.makeDirectory({ path: tooLong }),
        () =>
          file.move({
            sourcePath: "C:\\old.txt",
            targetPath: tooLong,
            overwrite: true,
          }),
        () =>
          file.copy({
            sourcePath: "C:\\old.txt",
            targetPath: tooLong,
            overwrite: true,
          }),
        () => file.stat(tooLong),
      ]) {
        await assertRejects(
          operation,
          (error: { code?: string; details?: { resource?: string } }) =>
            error.code === "resource_limited" &&
            error.details?.resource === "path_length",
        );
      }
      const unicodePath = `C:\\safe\\${"文".repeat(86)}.md`;
      assert.equal((await file.stat(unicodePath)).sizeBytes, 1);
      assert.deepEqual(effects, []);
    } finally {
      if (previousZotero)
        Object.defineProperty(runtime, "Zotero", previousZotero);
      else Reflect.deleteProperty(runtime, "Zotero");
      if (previousIO) Object.defineProperty(runtime, "IOUtils", previousIO);
      else Reflect.deleteProperty(runtime, "IOUtils");
    }
  });

  it("never reuses an exclusively reserved directory", async function () {
    const file = createWorkflowFileApi();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-exclusive-"));
    const reserved = path.join(root, "reserved");
    try {
      await file.makeDirectory({ path: reserved, exclusive: true });
      await file.writeText(path.join(reserved, "owned.txt"), "keep");
      await assertRejects(
        file.makeDirectory({ path: reserved, exclusive: true }),
      );
      assert.equal(
        await fs.readFile(path.join(reserved, "owned.txt"), "utf8"),
        "keep",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("moves a directory containing a dangling symlink without following its target", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-link-move-"));
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await fs.mkdir(source);
    await fs.symlink(
      path.join(root, "missing"),
      path.join(source, "broken"),
      process.platform === "win32" ? "junction" : "file",
    );
    try {
      await createWorkflowFileApi().move({
        sourcePath: source,
        targetPath: target,
      });
      assert.isTrue(
        (await fs.lstat(path.join(target, "broken"))).isSymbolicLink(),
      );
      await assertRejects(fs.access(source));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("moves ordinary directory descendants beyond the interoperability budget", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-tree-"));
    const source = path.join(root, "s");
    const target = path.join(root, "d".repeat(60));
    const leaf = `${"x".repeat(195)}.txt`;
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, leaf), "source");
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Zotero");
    Object.defineProperty(globalThis, "Zotero", {
      configurable: true,
      value: { ...Zotero, isWin: true },
    });
    try {
      await createWorkflowFileApi().move({
        sourcePath: source,
        targetPath: target,
      });
      assert.equal(
        await fs.readFile(path.join(target, leaf), "utf8"),
        "source",
      );
      assert.isFalse(await createWorkflowFileApi().exists(source));
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "Zotero", descriptor);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("requires explicit recursive directory removal and honors missing ignore", async function () {
    const file = createWorkflowFileApi();
    const root = `${getRuntimePersistencePaths().tmpDir}/workflow-file-remove-${Date.now()}`;
    await file.makeDirectory({ path: root });
    await file.writeText(`${root}/file.txt`, "content");

    await assertRejects(
      file.remove({ path: root }),
      (error: { code?: string }) => error?.code === "invalid_request",
    );
    assert.deepEqual(
      await file.remove({ path: `${root}/missing`, missing: "ignore" }),
      { removed: false },
    );
    await assertRejects(
      file.remove({ path: `${root}/missing` }),
      (error: { code?: string }) => error?.code === "not_found",
    );
    await file.remove({ path: root, recursive: true });
  });

  it("creates directories recursively by default and requires an existing parent otherwise", async function () {
    const file = createWorkflowFileApi();
    const root = `${getRuntimePersistencePaths().tmpDir}/workflow-file-mkdir-${Date.now()}`;
    await file.makeDirectory({ path: `${root}/a/b` });
    assert.isTrue(await file.exists(`${root}/a/b`));

    await assertRejects(
      file.makeDirectory({
        path: `${root}/missing-parent/leaf`,
        recursive: false,
      }),
      (error: { code?: string }) => error?.code === "not_found",
    );
    await file.makeDirectory({ path: `${root}/a/leaf`, recursive: false });
    assert.isTrue(await file.exists(`${root}/a/leaf`));
    await file.remove({ path: root, recursive: true });
  });

  it("bounds list traversal by caller maxDepth without failing", async function () {
    const file = createWorkflowFileApi();
    const root = `${getRuntimePersistencePaths().tmpDir}/workflow-file-depth-${Date.now()}`;
    await file.makeDirectory({ path: `${root}/a/b/c` });
    await file.writeText(`${root}/a/b/c/deep.txt`, "deep");
    await file.writeText(`${root}/a/shallow.txt`, "shallow");

    const bounded = await file.list({
      path: root,
      recursive: true,
      maxDepth: 1,
    });
    assert.deepEqual(
      bounded.entries.map((entry) => entry.relativePath),
      ["a", "a/b", "a/shallow.txt"],
    );
    const unbounded = await file.list({ path: root, recursive: true });
    assert.deepEqual(
      unbounded.entries.map((entry) => entry.relativePath),
      ["a", "a/b", "a/b/c", "a/b/c/deep.txt", "a/shallow.txt"],
    );

    await assertRejects(
      file.list({ path: root, recursive: true, maxDepth: 65 }),
      (error: { code?: string; details?: { resource?: string } }) =>
        error?.code === "resource_limited" &&
        error?.details?.resource === "depth",
    );
    await assertRejects(
      file.list({ path: root, recursive: true, maxDepth: -1 }),
      (error: { code?: string }) => error?.code === "invalid_request",
    );
    await file.remove({ path: root, recursive: true });
  });

  it("fails canceled file operations with a stable canceled error", async function () {
    const file = createWorkflowFileApi();
    const root = `${getRuntimePersistencePaths().tmpDir}/workflow-file-cancel-${Date.now()}`;
    await file.makeDirectory({ path: root });
    await file.writeText(`${root}/source.txt`, "content");
    const controller = new AbortController();
    controller.abort();
    const control = { signal: controller.signal };

    await assertRejects(
      file.readText(`${root}/source.txt`, control),
      (error: { code?: string; details?: { reason?: string } }) =>
        error?.code === "canceled" &&
        error?.details?.reason === "caller_signal",
    );
    await assertRejects(
      file.writeText(`${root}/target.txt`, "x", control),
      (error: { code?: string }) => error?.code === "canceled",
    );
    await assertRejects(
      file.copy(
        { sourcePath: `${root}/source.txt`, targetPath: `${root}/copy.txt` },
        control,
      ),
      (error: { code?: string }) => error?.code === "canceled",
    );
    await assertRejects(
      file.move(
        { sourcePath: `${root}/source.txt`, targetPath: `${root}/moved.txt` },
        control,
      ),
      (error: { code?: string }) => error?.code === "canceled",
    );
    await assertRejects(
      file.remove({ path: `${root}/source.txt` }, control),
      (error: { code?: string }) => error?.code === "canceled",
    );
    await assertRejects(
      file.list({ path: root }, control),
      (error: { code?: string }) => error?.code === "canceled",
    );
    assert.isFalse(await file.exists(`${root}/target.txt`));
    assert.isFalse(await file.exists(`${root}/copy.txt`));
    assert.isFalse(await file.exists(`${root}/moved.txt`));
    await file.remove({ path: root, recursive: true });
  });

  it("reports stable error codes for invalid paths and conflicts", async function () {
    const file = createWorkflowFileApi();
    const root = `${getRuntimePersistencePaths().tmpDir}/workflow-file-errors-${Date.now()}`;
    await file.makeDirectory({ path: root });
    await file.writeText(`${root}/existing.txt`, "content");

    await assertRejects(
      file.readText(""),
      (error: { code?: string }) => error?.code === "invalid_request",
    );
    await assertRejects(
      file.readText(`${root}/missing.txt`),
      (error: { code?: string }) => error?.code === "not_found",
    );
    await assertRejects(
      file.stat(`${root}/missing.txt`),
      (error: { code?: string }) => error?.code === "not_found",
    );
    await assertRejects(
      file.copy({
        sourcePath: `${root}/existing.txt`,
        targetPath: `${root}/existing.txt`,
      }),
      (error: { code?: string }) => error?.code === "conflict",
    );
    await assertRejects(
      file.readText(`${root}/${"x".repeat(5000)}`),
      (error: { code?: string; details?: { resource?: string } }) =>
        error?.code === "resource_limited" &&
        error?.details?.resource === "path_length",
    );
    await file.remove({ path: root, recursive: true });
  });
});

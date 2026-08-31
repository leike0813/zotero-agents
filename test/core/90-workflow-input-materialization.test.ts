import { assert } from "chai";
import { rejects as assertRejects } from "node:assert";
import fs from "node:fs/promises";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  createWorkflowInputMaterializer,
  materializeWorkflowInputFile,
} from "../../src/workflows/workflowInputMaterialization";
import { createWorkflowFileApi } from "../../src/workflows/file";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";

describe("Workflow Input Materialization", function () {
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
    assert.include(normalized, "tag-regulator-run-1");
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
    assert.equal((invalidVariant as { code?: string })?.code, "invalid_request");
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
      file.makeDirectory({ path: `${root}/missing-parent/leaf`, recursive: false }),
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

    const bounded = await file.list({ path: root, recursive: true, maxDepth: 1 });
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

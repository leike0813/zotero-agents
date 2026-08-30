import { assert } from "chai";
import { rejects as assertRejects } from "node:assert";
import fs from "node:fs/promises";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import { materializeWorkflowInputFile } from "../../src/workflows/workflowInputMaterialization";
import { createWorkflowFileApi } from "../../src/workflows/file";

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
      assert.instanceOf(materializationError, Error);
    }
  });

  it("owns bounded stat, list, move, and remove operations", async function () {
    const file = createWorkflowFileApi();
    const root = `${getRuntimePersistencePaths().tmpDir}/workflow-file-owner-${Date.now()}`;
    const nested = `${root}/nested`;
    const source = `${nested}/source.txt`;
    const moved = `${nested}/moved.txt`;
    await file.makeDirectory(nested);
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
    await file.makeDirectory(root);
    await file.writeText(`${root}/file.txt`, "content");

    await assertRejects(
      file.remove({ path: root }),
      /Recursive workflow directory removal was not requested/,
    );
    assert.deepEqual(
      await file.remove({ path: `${root}/missing`, missing: "ignore" }),
      { removed: false },
    );
    await file.remove({ path: root, recursive: true });
  });
});

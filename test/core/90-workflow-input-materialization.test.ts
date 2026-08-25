import { assert } from "chai";
import fs from "node:fs/promises";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import { materializeWorkflowInputFile } from "../../src/workflows/workflowInputMaterialization";

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
});

import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildRequest } from "../../workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs";

describe("workflow: literature-analysis sequence step apply", function () {
  it("declares per-step apply for digest and tag-regulator steps", async function () {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-literature-analysis-apply-"),
    );
    const parent = {
      id: 10,
      key: "PARENT10",
      itemType: "journalArticle",
      libraryID: 1,
      getField: (field: string) => (field === "title" ? "Paper" : ""),
      getCreators: () => [],
      getTags: () => [],
    };
    const runtime = {
      hostApiVersion: 5,
      hostApi: {
        file: {
          getTempDirectoryPath: () => tempDir,
        },
        synthesis: {
          exportTagVocabularyForRegulator: async () => ["segmentation"],
        },
      },
      helpers: {
        resolveItemRef: () => parent,
        getAttachmentFilePath: (entry: { filePath?: string }) =>
          entry.filePath || "",
      },
    };

    try {
      const request = (await buildRequest({
        selectionContext: {
          items: {
            parents: [{ item: { id: parent.id } }],
            attachments: [
              {
                filePath: "D:/papers/paper.md",
                parent: { id: parent.id },
              },
            ],
          },
        },
        executionOptions: {
          workflowParams: {
            language: "zh-CN",
            auto_tag_regulator: true,
          },
        },
        runtime,
      })) as {
        steps: Array<{
          id: string;
          apply_result?: { workflow_id?: string; on_failure?: string };
        }>;
      };

      assert.deepEqual(
        request.steps.map((step) => step.id),
        ["digest", "tag-regulator"],
      );
      assert.deepEqual(request.steps[0].apply_result, {
        workflow_id: "literature-analysis",
        on_failure: "continue",
      });
      assert.deepEqual(request.steps[1].apply_result, {
        workflow_id: "tag-regulator",
        on_failure: "continue",
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

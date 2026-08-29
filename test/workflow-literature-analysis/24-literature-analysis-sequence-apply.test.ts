import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildRequest } from "../../workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  createLiteratureAnalysisFixtureHelpers,
  workflowsPath,
} from "./workflow-test-utils";

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
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "missing literature-analysis workflow");
    const runtime = {
      hostApiVersion: 6,
      hostApi: {
        file: {
          materializeWorkflowInputFile: async (args: {
            workflowId?: string;
            key?: string;
            fileName?: string;
            content?: string;
            bytes?: Uint8Array | ArrayBuffer;
          }) => {
            const filePath = path.join(
              tempDir,
              "runtime",
              "tmp",
              "workflow-inputs",
              String(args.workflowId || "workflow"),
              String(args.key || "input"),
              String(args.fileName || "input.dat"),
            );
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            if (typeof args.content === "string") {
              await fs.writeFile(filePath, args.content, "utf8");
            } else {
              await fs.writeFile(
                filePath,
                Buffer.from(args.bytes || new Uint8Array()),
              );
            }
            return { path: filePath };
          },
        },
        synthesis: {
          exportTagVocabularyForRegulator: async () => ["segmentation"],
        },
      },
      helpers: createLiteratureAnalysisFixtureHelpers(Zotero),
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
        manifest: workflow!.manifest,
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
      assert.match(
        String((request.steps[1] as any).input?.valid_tags || ""),
        /runtime[\\/]tmp[\\/]workflow-inputs[\\/]tag-regulator[\\/]valid_tags[\\/]valid_tags-parent-10\.yaml$/,
      );
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

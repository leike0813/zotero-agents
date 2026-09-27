import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildRequest } from "../../workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs";
import { lockSelection } from "../../src/modules/selectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { workflowsPath } from "./workflow-test-utils";
import { nativeFixtureMutations as handlers } from "../helpers/nativeFixtureMutations";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";

describe("workflow: literature-analysis sequence step apply", function () {
  it("declares per-step apply for digest and tag-regulator steps", async function () {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-literature-analysis-apply-"),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Paper" },
    });
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "missing literature-analysis workflow");
    const baseHostApi = createWorkflowHostApi();
    const parentRef = {
      libraryId: Number(parent.libraryID),
      key: String(parent.key),
    };
    const sourceAttachmentRef = { libraryId: 1, key: "ATTACH01" };
    const runtime = {
      hostApiVersion: 12,
      hostApi: {
        ...baseHostApi,
        library: {
          ...baseHostApi.library,
          getItemDetail: async (ref: { libraryId: number; key: string }) => {
            if (ref.key !== sourceAttachmentRef.key) {
              return {
                kind: "regular",
                item: {
                  ref,
                  kind: "regular",
                  itemType: "journalArticle",
                  title: "Paper",
                  parentRef: null,
                  state: "active",
                  revision: "test",
                  tags: [],
                  collectionRefs: [],
                  creators: [],
                  date: "",
                  year: null,
                  publicationTitle: "",
                  fields: { title: "Paper" },
                  relatedRefs: [],
                  childCounts: { notes: 0, attachments: 1, annotations: 0 },
                  createdAt: "2026-01-01T00:00:00Z",
                  modifiedAt: "2026-01-01T00:00:00Z",
                },
              };
            }
            return {
              kind: "attachment",
              item: {
                ref: sourceAttachmentRef,
                parentRef,
                revision: "test",
                title: "paper.md",
                filename: "paper.md",
                contentType: "text/markdown",
                charset: null,
                url: null,
                linkMode: "linked_file",
                role: "ordinary",
                createdAt: "2026-01-01T00:00:00Z",
                file: {
                  state: "available",
                  path: "D:/papers/paper.md",
                  sizeBytes: 1,
                  modifiedAt: null,
                },
              },
            };
          },
          getItemNotes: async () => ({
            notes: [],
            limit: 100,
            nextCursor: null,
            hasMore: false,
            returned: 0,
            total: 0,
          }),
        },
        file: {
          ...baseHostApi.file,
          materializeWorkflowInputFile: async (args: {
            key?: string;
            fileName?: string;
            content?:
              | { kind: "text"; text: string }
              | { kind: "bytes"; bytes: Uint8Array | ArrayBuffer };
          }) => {
            const filePath = path.join(
              tempDir,
              "runtime",
              "tmp",
              "workflow-inputs",
              "tag-regulator",
              String(args.key || "input"),
              String(args.fileName || "input.dat"),
            );
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            if (args.content?.kind === "text") {
              await fs.writeFile(filePath, args.content.text, "utf8");
            } else {
              await fs.writeFile(
                filePath,
                Buffer.from(
                  (args.content as { bytes?: Uint8Array | ArrayBuffer })
                    ?.bytes || new Uint8Array(),
                ),
              );
            }
            return { path: filePath };
          },
        },
        synthesis: {
          ...baseHostApi.synthesis,
          tags: {
            ...baseHostApi.synthesis.tags,
            exportVocabularyForRegulator: async () => ({
              allowedTags: ["segmentation"],
            }),
          },
        },
      },
    };

    try {
      const request = (await buildRequest({
        selectionContext: lockSelection([
          {
            kind: "parent",
            ref: parentRef,
            itemType: "journalArticle",
            title: "Paper",
          },
          {
            kind: "attachment",
            ref: sourceAttachmentRef,
            itemType: "attachment",
            parentRef,
            title: "paper.md",
            filename: "paper.md",
            contentType: "text/markdown",
            createdAt: "2026-01-01T00:00:00Z",
            fileState: "available",
          },
        ]),
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
        new RegExp(
          `runtime[\\\\/]tmp[\\\\/]workflow-inputs[\\\\/]tag-regulator[\\\\/]valid_tags[\\\\/]valid_tags-parent-${parent.key}\\.yaml$`,
        ),
      );
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

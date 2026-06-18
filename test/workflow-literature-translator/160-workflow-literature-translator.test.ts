import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { createWorkflowResultContext } from "../../src/modules/workflowExecution/resultContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import {
  ensureDir,
  existsPath,
  joinPath,
  mkTempDir,
  readUtf8,
  workflowsPath,
  writeUtf8,
} from "../zotero/workflow-test-utils";

async function getLiteratureTranslatorWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-translator",
  );
  assert.isOk(
    workflow,
    `workflow literature-translator not found; loaded=${loaded.workflows
      .map((entry) => entry.manifest.id)
      .join(",")} warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
  );
  return workflow!;
}

async function createAttachment(args: {
  parent: Zotero.Item;
  dirPath: string;
  name: string;
  mimeType: string;
  content?: string;
}) {
  const filePath = joinPath(args.dirPath, args.name);
  await ensureDir(args.dirPath);
  await writeUtf8(filePath, args.content || args.name);
  const attachment = await handlers.attachment.createFromPath({
    parent: args.parent,
    path: filePath,
    title: args.name,
    mimeType: args.mimeType,
  });
  return { attachment, filePath };
}

async function createParent(title: string) {
  return handlers.item.create({
    itemType: "journalArticle",
    fields: { title },
  });
}

async function listAttachmentPaths(parent: Zotero.Item) {
  const paths: string[] = [];
  for (const id of parent.getAttachments()) {
    const item = Zotero.Items.get(id);
    if (!item) {
      continue;
    }
    const filePath = await item.getFilePathAsync?.();
    if (filePath) {
      paths.push(String(filePath));
    }
  }
  return paths;
}

async function countAttachmentsByPath(parent: Zotero.Item, targetPath: string) {
  const normalizedTarget = normalizePathForCompare(targetPath);
  const paths = await listAttachmentPaths(parent);
  return paths.filter(
    (entry) => normalizePathForCompare(entry) === normalizedTarget,
  ).length;
}

describe("workflow: literature-translator", function () {
  this.timeout(30000);

  it("normalizes translator output paths before host file access", async function () {
    const { __translatorArtifactsTestOnly } = (await import(
      "../../workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs"
    )) as {
      __translatorArtifactsTestOnly: {
        normalizeHostFilePath(value: string): string;
      };
    };

    assert.equal(
      __translatorArtifactsTestOnly.normalizeHostFilePath(
        "D:/Workspace/Artifact/run/output_zh-CN.md",
      ),
      "D:\\Workspace\\Artifact\\run\\output_zh-CN.md",
    );
  });

  it("loads literature-translator workflow manifest", async function () {
    const workflow = await getLiteratureTranslatorWorkflow();
    assert.equal(workflow.manifest.provider, "skillrunner");
    assert.equal(workflow.manifest.request?.kind, "skillrunner.sequence.v1");
    assert.equal(workflow.manifest.result?.fetch?.type, "bundle");
    assert.equal(workflow.manifest.parameters?.mode?.default, "fast");
    assert.deepEqual(workflow.manifest.parameters?.mode?.enum, [
      "fast",
      "high_quality",
    ]);
    assert.equal(workflow.manifest.inputs?.unit, "attachment");
    assert.deepEqual(workflow.manifest.inputs?.accepts?.mime, [
      "text/markdown",
      "text/x-markdown",
      "text/plain",
      "application/pdf",
    ]);
    assert.equal(workflow.manifest.validateSelection?.select?.policy, "literature-source");
    assert.isFunction(workflow.hooks.buildRequest);
    assert.isFunction(workflow.hooks.applyResult);
  });

  it("uses literature source selection policy and builds a one-step sequence request", async function () {
    const workflow = await getLiteratureTranslatorWorkflow();
    const tempDir = await mkTempDir("zotero-skills-translator-source");
    const parent = await createParent("Translator Source Parent");
    await createAttachment({
      parent,
      dirPath: tempDir,
      name: "paper.pdf",
      mimeType: "application/pdf",
    });
    const markdown = await createAttachment({
      parent,
      dirPath: tempDir,
      name: "paper.md",
      mimeType: "text/markdown",
      content: "# Source",
    });

    const selection = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
      executionOptions: {
        workflowParams: {
          target_language: "fr-FR",
          mode: "high_quality",
        },
      },
    })) as Array<{
      kind: string;
      sourceAttachmentPaths?: string[];
      targetParentID?: number;
      steps?: Array<{
        skill_id?: string;
        fetch_type?: string;
        input?: { source_path?: string };
        parameter?: { target_language?: string; mode?: string };
      }>;
      final_step_id?: string;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].kind, "skillrunner.sequence.v1");
    assert.equal(requests[0].targetParentID, parent.id);
    assert.deepEqual(requests[0].sourceAttachmentPaths, [markdown.filePath]);
    assert.equal(requests[0].final_step_id, "translate");
    assert.lengthOf(requests[0].steps || [], 1);
    assert.equal(requests[0].steps?.[0].skill_id, "literature-translator");
    assert.equal(requests[0].steps?.[0].fetch_type, "bundle");
    assert.equal(requests[0].steps?.[0].input?.source_path, markdown.filePath);
    assert.equal(requests[0].steps?.[0].parameter?.target_language, "fr-FR");
    assert.equal(requests[0].steps?.[0].parameter?.mode, "high_quality");
  });

  it("filters selected inputs when translated markdown target already exists", async function () {
    const workflow = await getLiteratureTranslatorWorkflow();
    const tempDir = await mkTempDir("zotero-skills-translator-filter");
    const keepParent = await createParent("Translator Keep Parent");
    const skipParent = await createParent("Translator Skip Parent");
    const keep = await createAttachment({
      parent: keepParent,
      dirPath: tempDir,
      name: "keep.pdf",
      mimeType: "application/pdf",
    });
    const skip = await createAttachment({
      parent: skipParent,
      dirPath: tempDir,
      name: "skip.pdf",
      mimeType: "application/pdf",
    });
    await writeUtf8(joinPath(tempDir, "skip_zh-CN.md"), "already translated");

    const selection = await buildSelectionContext([keepParent, skipParent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as Array<{ sourceAttachmentPaths?: string[] }> & {
      __stats?: {
        totalUnits?: number;
        skippedUnits?: number;
      };
    };

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].sourceAttachmentPaths?.[0], keep.filePath);
    assert.notEqual(requests[0].sourceAttachmentPaths?.[0], skip.filePath);
    assert.equal(requests.__stats?.totalUnits, 2);
    assert.equal(requests.__stats?.skippedUnits, 1);
  });

  it("reports no valid input units when every selected source already has target markdown", async function () {
    const workflow = await getLiteratureTranslatorWorkflow();
    const tempDir = await mkTempDir("zotero-skills-translator-all-filtered");
    const parent = await createParent("Translator All Filtered Parent");
    await createAttachment({
      parent,
      dirPath: tempDir,
      name: "paper.pdf",
      mimeType: "application/pdf",
    });
    await writeUtf8(joinPath(tempDir, "paper_zh-CN.md"), "already translated");

    const selection = await buildSelectionContext([parent]);
    let thrown: unknown = null;
    try {
      await executeBuildRequests({
        workflow,
        selectionContext: selection,
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown, "expected all existing translations to be skipped");
    assert.equal((thrown as { code?: string }).code, "NO_VALID_INPUT_UNITS");
    assert.equal((thrown as { totalUnits?: number }).totalUnits, 1);
    assert.equal((thrown as { skippedUnits?: number }).skippedUnits, 1);
  });

  it("materializes translated markdown next to source and does not duplicate linked attachment", async function () {
    const workflow = await getLiteratureTranslatorWorkflow();
    const sourceDir = await mkTempDir("zotero-skills-translator-apply-source");
    const outputDir = await mkTempDir("zotero-skills-translator-apply-output");
    const parent = await createParent("Translator Apply Parent");
    const source = await createAttachment({
      parent,
      dirPath: sourceDir,
      name: "paper.pdf",
      mimeType: "application/pdf",
    });
    const outputPath = joinPath(outputDir, "output_fr-FR.md");
    const alignmentPath = joinPath(outputDir, "alignment.json");
    await writeUtf8(outputPath, "# Traduction\n");
    await writeUtf8(
      alignmentPath,
      JSON.stringify({
        format: "v1",
        target_language: "fr-FR",
        blocks: [],
      }),
    );
    const request = {
      kind: "skillrunner.sequence.v1",
      sourceAttachmentPaths: [source.filePath],
      steps: [
        {
          id: "translate",
          parameter: {
            target_language: "fr-FR",
          },
        },
      ],
    };
    const runResult = {
      resultJson: {
        status: "success",
        output_path: outputPath,
        alignment_path: alignmentPath,
        provenance: {
          source_path: source.filePath,
          source_language: "en-US",
          target_language: "fr-FR",
        },
      },
    };

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        readText: async () => "",
      },
      request,
      runResult,
    });
    await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        readText: async () => "",
      },
      request,
      runResult,
    });

    const targetPath = joinPath(sourceDir, "paper_fr-FR.md");
    const targetAlignmentPath = joinPath(sourceDir, "paper_fr-FR.json");
    assert.isTrue(await existsPath(targetPath));
    assert.isTrue(await existsPath(targetAlignmentPath));
    assert.equal(await readUtf8(targetPath), "# Traduction\n");
    assert.include(await readUtf8(targetAlignmentPath), '"target_language":"fr-FR"');
    assert.equal(await countAttachmentsByPath(parent, targetPath), 1);
    assert.equal(await countAttachmentsByPath(parent, targetAlignmentPath), 0);
  });

  it("materializes translated artifacts from a remote bundle when result paths are not local", async function () {
    const workflow = await getLiteratureTranslatorWorkflow();
    const sourceDir = await mkTempDir("zotero-skills-translator-bundle-source");
    const parent = await createParent("Translator Bundle Parent");
    const source = await createAttachment({
      parent,
      dirPath: sourceDir,
      name: "paper.pdf",
      mimeType: "application/pdf",
    });
    const resultJson = {
      status: "success",
      output_path: "D:/remote/run/output_fr-FR.md",
      alignment_path: "D:/remote/run/alignment.json",
      provenance: {
        source_path: source.filePath,
        source_language: "en-US",
        target_language: "fr-FR",
      },
    };
    const bundleEntries: Record<string, string> = {
      "result/result.json": JSON.stringify(resultJson),
      "output_fr-FR.md": "# Traduction depuis bundle\n",
      "alignment.json": JSON.stringify({
        format: "v1",
        target_language: "fr-FR",
        blocks: [],
      }),
    };
    const bundleReader = {
      async readText(entryPath: string) {
        if (Object.prototype.hasOwnProperty.call(bundleEntries, entryPath)) {
          return bundleEntries[entryPath];
        }
        throw new Error(`missing bundle entry: ${entryPath}`);
      },
    };
    const runResult = {
      status: "succeeded",
      requestId: "translator-bundle-test",
      fetchType: "bundle",
    };
    const resultContext = await createWorkflowResultContext({
      runResult,
      bundleReader,
      manifest: workflow.manifest,
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader,
      resultContext,
      request: {
        kind: "skillrunner.sequence.v1",
        sourceAttachmentPaths: [source.filePath],
        steps: [
          {
            id: "translate",
            parameter: {
              target_language: "fr-FR",
            },
          },
        ],
      },
      runResult,
    });

    const targetPath = joinPath(sourceDir, "paper_fr-FR.md");
    const targetAlignmentPath = joinPath(sourceDir, "paper_fr-FR.json");
    assert.equal(await readUtf8(targetPath), "# Traduction depuis bundle\n");
    assert.include(await readUtf8(targetAlignmentPath), '"target_language":"fr-FR"');
    assert.equal(await countAttachmentsByPath(parent, targetPath), 1);
  });
});

function normalizePathForCompare(value: string) {
  return String(value || "").replace(/[\\/]+/g, "/").toLowerCase();
}

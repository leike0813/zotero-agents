import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import singleMarkdownFixture from "../fixtures/selection-context/selection-context-single-markdown.json";
import {
  fixturePath,
  workflowsPath,
} from "./workflow-test-utils";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";
import { isFullTestMode } from "./testMode";

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

type SingleMarkdownFixture = {
  items: {
    attachments: Array<{
      item: {
        title: string;
        data?: {
          contentType?: string;
        };
      };
      parent: {
        itemType: string;
        title: string;
      } | null;
      filePath: string;
    }>;
  };
};

function basename(targetPath: string) {
  const normalized = targetPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : targetPath;
}

const describeLiteratureDigestE2ESuite = isFullTestMode() ? describe : describe.skip;

describeLiteratureDigestE2ESuite("integration: literature-analysis with mock skill-runner", function () {
  this.timeout(30000);

  it("rebuilds single-markdown sequence request and applies fixture bundle with notes written", async function () {
    try {
      const fixture = singleMarkdownFixture as SingleMarkdownFixture;
      const source = fixture.items.attachments[0];
      const parent = await handlers.item.create({
        itemType: source.parent?.itemType || "conferencePaper",
        fields: {
          title: source.parent?.title || "Fixture Parent",
        },
      });
      const attachmentRelPath = source.filePath;
      const attachmentAbsPath = fixturePath("selection-context", attachmentRelPath);
      const attachment = await handlers.attachment.createFromPath({
        parent,
        path: attachmentAbsPath,
        title: source.item.title || basename(attachmentRelPath),
        mimeType: source.item.data?.contentType || "text/plain",
      });

      const selectionContext = await buildSelectionContext([attachment]);
      assert.equal(selectionContext.selectionType, "attachment");
      assert.equal(selectionContext.summary.attachmentCount, 1);
      assert.equal(selectionContext.items.attachments[0].item.parentItemID, parent.id);

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "workflow literature-analysis not found");

      const requests = (await executeBuildRequests({
        workflow: workflow!,
        selectionContext,
        executionOptions: {
          workflowParams: {
            auto_tag_regulator: false,
          },
        },
      })) as Array<{
        kind: string;
        targetParentID: number;
        sourceAttachmentPaths?: string[];
        steps?: Array<{
          id?: string;
          skill_id?: string;
          input?: { source_path?: string };
          parameter?: { language?: string };
          fetch_type?: string;
          workspace?: string;
          apply_result?: { workflow_id?: string; on_failure?: string };
        }>;
        final_step_id?: string;
      }>;
      assert.lengthOf(requests, 1);
      assert.equal(requests[0].kind, "skillrunner.sequence.v1");
      assert.equal(requests[0].targetParentID, parent.id);
      assert.deepEqual(requests[0].sourceAttachmentPaths, [attachmentAbsPath]);
      assert.equal(requests[0].final_step_id, "digest");
      const digestStep = requests[0].steps?.find(
        (step) => step.id === "digest",
      );
      assert.isOk(digestStep, "digest sequence step should exist");
      assert.equal(digestStep?.skill_id, "literature-analysis");
      assert.equal(digestStep?.workspace, "new");
      assert.equal(digestStep?.fetch_type, "bundle");
      assert.equal(digestStep?.apply_result?.workflow_id, "literature-analysis");
      assert.equal(digestStep?.apply_result?.on_failure, "continue");
      assert.equal(digestStep?.input?.source_path, attachmentAbsPath);
      assert.equal(digestStep?.parameter?.language, "zh-CN");

      const bundleReader = new ZipBundleReader(
        fixturePath("literature-analysis", "run_bundle.zip"),
      );
      const applyResult = (await executeApplyResult({
        workflow: workflow!,
        parent,
        bundleReader,
        request: requests[0],
      })) as { notes: Zotero.Item[] };
      const { parseGeneratedNoteKind } = await dynamicImport(
        "../../workflows_builtin/literature-workbench-package/lib/referencesNote.mjs",
      );
      assert.lengthOf(applyResult.notes, 3);
      const firstNote = Zotero.Items.get(applyResult.notes[0].id)!;
      const secondNote = Zotero.Items.get(applyResult.notes[1].id)!;
      const thirdNote = Zotero.Items.get(applyResult.notes[2].id)!;
      assert.equal(firstNote.parentItemID, parent.id);
      assert.equal(secondNote.parentItemID, parent.id);
      assert.equal(thirdNote.parentItemID, parent.id);
      assert.match(firstNote.getNote(), /<h1>Digest<\/h1>/);
      assert.equal(parseGeneratedNoteKind(firstNote.getNote()), "digest");
      assert.isAtLeast((firstNote.getAttachments?.() || []).length, 1);
      assert.match(secondNote.getNote(), /<h1>References<\/h1>/);
      assert.match(secondNote.getNote(), /<table\b/);
      assert.equal(parseGeneratedNoteKind(secondNote.getNote()), "references");
      assert.isAtLeast((secondNote.getAttachments?.() || []).length, 1);
      assert.match(thirdNote.getNote(), /<h1>Citation Analysis<\/h1>/);
      assert.equal(
        parseGeneratedNoteKind(thirdNote.getNote()),
        "citation-analysis",
      );
      assert.isAtLeast((thirdNote.getAttachments?.() || []).length, 1);
      const parentNotes = parent.getNotes();
      assert.include(parentNotes, firstNote.id);
      assert.include(parentNotes, secondNote.id);
      assert.include(parentNotes, thirdNote.id);
    } catch (error) {
      console.error(
        `[integration: literature-analysis with mock skill-runner] e2e failed\n${formatError(error)}`,
      );
      throw error;
    }
  });
});

import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { JobQueueManager } from "../../src/jobQueue/manager";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { SkillRunnerProvider } from "../../src/providers/skillrunner/provider";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import singleMarkdownFixture from "../fixtures/selection-context/selection-context-single-markdown.json";
import {
  fixturePath,
  joinPath,
  mkTempDir,
  workflowsPath,
} from "./workflow-test-utils";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";
import { isFullTestMode } from "./testMode";

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

const MOCK_SKILLRUNNER_BASE_URL =
  (typeof process !== "undefined" &&
    process.env?.ZOTERO_TEST_SKILLRUNNER_ENDPOINT) ||
  "http://127.0.0.1:8030";

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

async function isMockSkillRunnerReachable(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${baseUrl}/v1/jobs`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
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

async function writeBytes(filePath: string, bytes: Uint8Array) {
  const runtime = globalThis as {
    IOUtils?: { write: (targetPath: string, data: Uint8Array) => Promise<number | void> };
  };
  if (typeof runtime.IOUtils?.write === "function") {
    await runtime.IOUtils.write(filePath, bytes);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(filePath, Buffer.from(bytes));
}

const describeLiteratureDigestE2ESuite = isFullTestMode() ? describe : describe.skip;

describeLiteratureDigestE2ESuite("integration: literature-analysis with mock skill-runner", function () {
  this.timeout(30000);

  it("rebuilds single-markdown selection and finishes full run with notes written", async function () {
    if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
      this.skip();
    }
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
      })) as Array<{
        kind: string;
        targetParentID: number;
        skill_id?: string;
        parameter?: { language?: string };
        input?: { source_path?: string };
        upload_files?: Array<{ key: string; path: string }>;
        sourceAttachmentPaths?: string[];
      }>;
      assert.lengthOf(requests, 1);
      assert.equal(requests[0].kind, "skillrunner.job.v1");
      assert.equal(requests[0].targetParentID, parent.id);
      assert.equal(requests[0].skill_id, "literature-analysis");
      assert.equal(requests[0].parameter?.language, "zh-CN");
      assert.equal(requests[0].upload_files?.[0].key, "source_path");
      assert.equal(requests[0].upload_files?.[0].path, attachmentAbsPath);
      assert.match(String(requests[0].input?.source_path || ""), /^inputs\/source_path\//);

      const provider = new SkillRunnerProvider({
        baseUrl: MOCK_SKILLRUNNER_BASE_URL,
      });
      const queue = new JobQueueManager({
        concurrency: 1,
        executeJob: (job) =>
          provider.execute({
            requestKind: workflow!.manifest.request!.kind,
            request: job.request,
          }),
      });
      const jobId = queue.enqueue({
        workflowId: workflow!.manifest.id,
        request: requests[0],
        meta: { fixture: "selection-context-single-markdown.json" },
      });
      await queue.waitForIdle();
      const finishedJob = queue.getJob(jobId) as {
        state: string;
        result?: {
          status?: string;
          bundleBytes?: Uint8Array;
          requestId?: string;
        };
      } | null;
      assert.isOk(finishedJob);
      assert.equal(finishedJob?.state, "succeeded");
      assert.equal(finishedJob?.result?.status, "succeeded");
      assert.isAbove(finishedJob?.result?.bundleBytes?.length || 0, 0);

      const downloadDir = await mkTempDir("zotero-skills-e2e-download");
      const bundlePath = joinPath(
        downloadDir,
        `${finishedJob?.result?.requestId || "mock"}-run_bundle.zip`,
      );
      await writeBytes(
        bundlePath,
        finishedJob!.result!.bundleBytes as Uint8Array,
      );

      const bundleReader = new ZipBundleReader(bundlePath);
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

import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeApplyResult, executeBuildRequests } from "../../src/workflows/runtime";
import {
  ensureDir,
  existsPath,
  isZoteroRuntime,
  joinPath,
  mkTempDir,
  readUtf8,
  workflowsPath,
  writeUtf8,
} from "./workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";

async function pathExists(targetPath: string) {
  return existsPath(targetPath);
}

async function getMineruWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find((entry) => entry.manifest.id === "mineru");
  assert.isOk(
    workflow,
    `workflow mineru not found; loaded=${loaded.workflows.map((entry) => entry.manifest.id).join(",")} warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
  );
  return workflow!;
}

async function createPdfAttachment(args: {
  parent: Zotero.Item;
  dirPath: string;
  name: string;
}) {
  const pdfPath = joinPath(args.dirPath, args.name);
  await ensureDir(args.dirPath);
  await writeUtf8(pdfPath, "pdf");
  const attachment = await handlers.attachment.createFromPath({
    parent: args.parent,
    path: pdfPath,
    title: args.name,
    mimeType: "application/pdf",
  });
  return { attachment, pdfPath };
}

async function buildMineruRequest(attachment: Zotero.Item, pdfPath: string) {
  return {
    sourceAttachmentPaths: [pdfPath],
    context: {
      source_attachment_path: pdfPath,
      source_attachment_item_id: attachment.id,
      source_attachment_item_key: attachment.key,
    },
  };
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
  let count = 0;
  for (const id of parent.getAttachments()) {
    const item = Zotero.Items.get(id);
    if (!item) {
      continue;
    }
    const filePath = await item.getFilePathAsync?.();
    if (!filePath) {
      continue;
    }
    if (normalizePathForCompare(filePath) === normalizedTarget) {
      count += 1;
    }
  }
  return count;
}

const itFullOnly = isFullTestMode() ? it : it.skip;
const itNodeOnly = isZoteroRuntime() ? it.skip : it;

describe("workflow: mineru", function () {
  this.timeout(30000);

  itNodeOnly("loads mineru workflow manifest", async function () {
    const workflow = await getMineruWorkflow();
    assert.equal(workflow.manifest.provider, "generic-http");
    assert.equal(workflow.manifest.request?.kind, "generic-http.steps.v1");
    assert.equal(workflow.manifest.validateSelection?.select?.policy, "pdf-attachment");
    assert.isFunction(workflow.hooks.applyResult);
  });

  it("builds one request per selected pdf attachment", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-input");
    const parentA = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Parent A" },
    });
    const parentB = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Parent B" },
    });
    const a = await createPdfAttachment({
      parent: parentA,
      dirPath: tempDir,
      name: "a.pdf",
    });
    const b = await createPdfAttachment({
      parent: parentB,
      dirPath: tempDir,
      name: "b.pdf",
    });
    const selection = await buildSelectionContext([a.attachment, b.attachment]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as Array<{
      kind: string;
      sourceAttachmentPaths?: string[];
      context?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 2);
    assert.equal(requests[0].kind, "generic-http.steps.v1");
    assert.equal(requests[1].kind, "generic-http.steps.v1");
    const sourcePaths = requests
      .map((entry) => String(entry.sourceAttachmentPaths?.[0] || ""))
      .sort();
    assert.deepEqual(sourcePaths, [a.pdfPath, b.pdfPath].sort());
    const names = requests
      .map((entry) => String(entry.context?.source_attachment_name || ""))
      .sort();
    assert.deepEqual(names, ["a.pdf", "b.pdf"]);
  });

  itNodeOnly("expands parent selection to child pdf attachments and keeps one task per pdf", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-parent");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Parent Expand" },
    });
    const a = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "x.pdf",
    });
    const b = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "y.pdf",
    });
    const selection = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as Array<{ sourceAttachmentPaths?: string[] }>;

    assert.lengthOf(requests, 2);
    const sourcePaths = requests
      .map((entry) => String(entry.sourceAttachmentPaths?.[0] || ""))
      .sort();
    assert.deepEqual(sourcePaths, [a.pdfPath, b.pdfPath].sort());
  });

  it("filters out inputs when sibling markdown target already exists", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-conflict");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Filter Conflict Parent" },
    });
    const keep = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "keep.pdf",
    });
    const skip = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "skip.pdf",
    });
    await writeUtf8(joinPath(tempDir, "skip.md"), "exists");
    const selection = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as Array<{
      sourceAttachmentPaths?: string[];
    }> & {
      __stats?: {
        totalUnits?: number;
        skippedUnits?: number;
      };
    };

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].sourceAttachmentPaths?.[0], keep.pdfPath);
    assert.equal(requests.__stats?.totalUnits, 2);
    assert.equal(requests.__stats?.skippedUnits, 1);
    assert.notEqual(requests[0].sourceAttachmentPaths?.[0], skip.pdfPath);
  });

  itNodeOnly("reports all skipped units when every candidate pdf conflicts with existing markdown", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-all-conflicts");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU All Conflicts Parent" },
    });
    await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "a.pdf",
    });
    await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "b.pdf",
    });
    await writeUtf8(joinPath(tempDir, "a.md"), "exists-a");
    await writeUtf8(joinPath(tempDir, "b.md"), "exists-b");

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

    assert.isOk(thrown, "expected all-conflict selection to be skipped");
    const typed = thrown as {
      code?: string;
      totalUnits?: number;
      skippedUnits?: number;
    };
    assert.equal(typed.code, "NO_VALID_INPUT_UNITS");
    assert.equal(typed.totalUnits, 2);
    assert.equal(typed.skippedUnits, 2);
  });

  itFullOnly("does not filter when only Images_<itemKey> directory exists", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-images-only");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Images Existing Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "images-only.pdf",
    });
    const staleImages = joinPath(tempDir, `Images_${source.attachment.key}`);
    await ensureDir(staleImages);
    const selection = await buildSelectionContext([source.attachment]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as Array<{
      sourceAttachmentPaths?: string[];
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].sourceAttachmentPaths?.[0], source.pdfPath);
  });

  itFullOnly("filters conflicting input when attachment uses attachments: relative path form", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-attachments-relative");
    const sourceDir = joinPath(tempDir, "2026", "paper-a");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Attachments Relative Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: sourceDir,
      name: "paper.pdf",
    });
    await writeUtf8(joinPath(sourceDir, "paper.md"), "already-exists");

    const selection = await buildSelectionContext([source.attachment]);
    const attachmentEntry = selection.items.attachments[0] as {
      filePath?: string | null;
      item?: { data?: { path?: string } };
    };
    attachmentEntry.filePath = null;
    if (!attachmentEntry.item) {
      attachmentEntry.item = {};
    }
    if (!attachmentEntry.item.data) {
      attachmentEntry.item.data = {};
    }
    attachmentEntry.item.data.path = "attachments:2026/paper-a/paper.pdf";

    const originalResolveRelativePath = Zotero.Attachments.resolveRelativePath;
    Zotero.Attachments.resolveRelativePath = ((value: string) => {
      const text = String(value || "");
      if (/^attachments:/i.test(text)) {
        return "";
      }
      return joinPath(tempDir, text);
    }) as typeof Zotero.Attachments.resolveRelativePath;

    try {
      let thrown: unknown = null;
      try {
        await executeBuildRequests({
          workflow,
          selectionContext: selection,
        });
      } catch (error) {
        thrown = error;
      }

      assert.isOk(thrown, "expected attachments: relative path conflict to be filtered");
      const typed = thrown as { code?: string };
      assert.equal(typed.code, "NO_VALID_INPUT_UNITS");
    } finally {
      Zotero.Attachments.resolveRelativePath = originalResolveRelativePath;
    }
  });

  itFullOnly("filters conflicting input when attachment path prefix is singular attachment:", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-attachment-singular");
    const sourceDir = joinPath(tempDir, "2026", "paper-b");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Attachment Prefix Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: sourceDir,
      name: "paper.pdf",
    });
    await writeUtf8(joinPath(sourceDir, "paper.md"), "already-exists");

    const selection = await buildSelectionContext([source.attachment]);
    const attachmentEntry = selection.items.attachments[0] as {
      filePath?: string | null;
      item?: { data?: { path?: string } };
    };
    attachmentEntry.filePath = null;
    if (!attachmentEntry.item) {
      attachmentEntry.item = {};
    }
    if (!attachmentEntry.item.data) {
      attachmentEntry.item.data = {};
    }
    attachmentEntry.item.data.path = "attachment:2026/paper-b/paper.pdf";

    const originalResolveRelativePath = Zotero.Attachments.resolveRelativePath;
    Zotero.Attachments.resolveRelativePath = ((value: string) => {
      const text = String(value || "")
        .replace(/^attachments?:/i, "")
        .replace(/^[\\/]+/, "");
      return joinPath(tempDir, text);
    }) as typeof Zotero.Attachments.resolveRelativePath;

    try {
      let thrown: unknown = null;
      try {
        await executeBuildRequests({
          workflow,
          selectionContext: selection,
        });
      } catch (error) {
        thrown = error;
      }
      assert.isOk(thrown, "expected attachment: prefixed path conflict to be filtered");
      const typed = thrown as { code?: string };
      assert.equal(typed.code, "NO_VALID_INPUT_UNITS");
    } finally {
      Zotero.Attachments.resolveRelativePath = originalResolveRelativePath;
    }
  });

  itFullOnly("filters conflicting input when pathToFile rejects drive paths with forward slashes", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-win-slash-parse");
    const sourceDir = joinPath(tempDir, "2026", "paper-c");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Windows Slash Parse Parent" },
    });
    await createPdfAttachment({
      parent,
      dirPath: sourceDir,
      name: "paper.pdf",
    });
    await writeUtf8(joinPath(sourceDir, "paper.md"), "already-exists");

    const selection = await buildSelectionContext([parent]);
    const originalPathToFile = Zotero.File.pathToFile;
    Zotero.File.pathToFile = ((targetPath: string) => {
      const text = String(targetPath || "");
      if (/^[A-Za-z]:\//.test(text)) {
        throw new Error(`Unexpected path value '${text}'`);
      }
      return originalPathToFile(text);
    }) as typeof Zotero.File.pathToFile;

    try {
      let thrown: unknown = null;
      try {
        await executeBuildRequests({
          workflow,
          selectionContext: selection,
        });
      } catch (error) {
        thrown = error;
      }
      assert.isOk(
        thrown,
        "expected conflict to be filtered when slash path parsing fails",
      );
      const typed = thrown as { code?: string };
      assert.equal(typed.code, "NO_VALID_INPUT_UNITS");
    } finally {
      Zotero.File.pathToFile = originalPathToFile;
    }
  });

  it("materializes full.md/images, rewrites image paths, and attaches markdown to parent", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-apply");
    const bundleDir = await mkTempDir("zotero-skills-mineru-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Apply Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "paper.pdf",
    });
    await writeUtf8(
      joinPath(bundleDir, "full.md"),
      "![fig](images/figure-1.png)\n<img src=\"images/figure-2.png\" />\n",
    );
    await ensureDir(joinPath(bundleDir, "images"));
    await writeUtf8(joinPath(bundleDir, "images", "figure-1.png"), "png-1");
    await writeUtf8(joinPath(bundleDir, "images", "figure-2.png"), "png-2");

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        readText: async () => "",
        getExtractedDir: async () => bundleDir,
      },
      request: await buildMineruRequest(source.attachment, source.pdfPath),
      runResult: {},
    });

    const targetMdPath = joinPath(tempDir, "paper.md");
    const targetImages = joinPath(tempDir, `Images_${source.attachment.key}`);
    assert.isTrue(await pathExists(targetMdPath));
    assert.isTrue(await pathExists(joinPath(targetImages, "figure-1.png")));
    const markdown = await readUtf8(targetMdPath);
    assert.include(markdown, `Images_${source.attachment.key}/figure-1.png`);
    assert.include(markdown, `Images_${source.attachment.key}/figure-2.png`);

    const attachmentPaths = await listAttachmentPaths(parent);
    assert.isTrue(
      attachmentPaths.some((entry) => compareNormalizedPath(entry, targetMdPath)),
      `expected linked markdown attachment=${targetMdPath}, got=${attachmentPaths.join(",")}`,
    );
  });

  itFullOnly("replaces existing orphan images directory before moving new images", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-orphan-images");
    const bundleDir = await mkTempDir("zotero-skills-mineru-orphan-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Orphan Images Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "replace-images.pdf",
    });
    const targetImages = joinPath(tempDir, `Images_${source.attachment.key}`);
    await ensureDir(targetImages);
    await writeUtf8(joinPath(targetImages, "old.png"), "old");

    await writeUtf8(
      joinPath(bundleDir, "full.md"),
      "![fig](images/new.png)\n",
    );
    await ensureDir(joinPath(bundleDir, "images"));
    await writeUtf8(joinPath(bundleDir, "images", "new.png"), "new");

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        readText: async () => "",
        getExtractedDir: async () => bundleDir,
      },
      request: await buildMineruRequest(source.attachment, source.pdfPath),
      runResult: {},
    });

    assert.isFalse(await pathExists(joinPath(targetImages, "old.png")));
    assert.isTrue(await pathExists(joinPath(targetImages, "new.png")));
  });

  itFullOnly("fails when full.md is missing and does not create partial outputs", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-missing-full");
    const bundleDir = await mkTempDir("zotero-skills-mineru-missing-full-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Missing Full Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "missing-full.pdf",
    });
    await ensureDir(joinPath(bundleDir, "images"));
    await writeUtf8(joinPath(bundleDir, "images", "figure.png"), "new");
    const targetMdPath = joinPath(tempDir, "missing-full.md");
    const attachmentCountBefore = parent.getAttachments().length;

    let thrown: unknown = null;
    try {
      await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          readText: async () => "",
          getExtractedDir: async () => bundleDir,
        },
        request: await buildMineruRequest(source.attachment, source.pdfPath),
        runResult: {},
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(String(thrown), /full\.md/i);
    assert.isFalse(await pathExists(targetMdPath));
    assert.equal(parent.getAttachments().length, attachmentCountBefore);
  });

  itNodeOnly("does not create duplicate linked markdown attachment for same parent and same path", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-dedupe-link");
    const bundleDir = await mkTempDir("zotero-skills-mineru-dedupe-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Dedupe Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "dedupe.pdf",
    });
    await writeUtf8(joinPath(bundleDir, "full.md"), "content\n");
    await ensureDir(joinPath(bundleDir, "images"));
    await writeUtf8(joinPath(bundleDir, "images", "x.png"), "x");

    const request = await buildMineruRequest(source.attachment, source.pdfPath);
    await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        readText: async () => "",
        getExtractedDir: async () => bundleDir,
      },
      request,
      runResult: {},
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        readText: async () => "",
        getExtractedDir: async () => bundleDir,
      },
      request,
      runResult: {},
    });

    const mdPath = joinPath(tempDir, "dedupe.md");
    const mdAttachmentCount = await countAttachmentsByPath(parent, mdPath);
    assert.equal(mdAttachmentCount, 1);
  });
});

function compareNormalizedPath(a: string, b: string) {
  return normalizePathForCompare(a) === normalizePathForCompare(b);
}

function normalizePathForCompare(value: string) {
  return String(value || "").replace(/[\\/]+/g, "/").toLowerCase();
}

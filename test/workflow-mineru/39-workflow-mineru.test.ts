import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { createHookHelpers } from "../../src/workflows/helpers";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
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
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "mineru",
  );
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

function runtimeWithPdfMetadata(metadata: {
  pageCount?: number;
  numPages?: number;
  outline?: Array<{ title?: string; page?: number; level?: number }>;
}) {
  const helpers = createHookHelpers(Zotero) as ReturnType<
    typeof createHookHelpers
  > & {
    mineruReadPdfMetadata?: () => Promise<typeof metadata>;
  };
  helpers.mineruReadPdfMetadata = async () => metadata;
  return { helpers };
}

function bundleReaderForDir(bundleDir: string) {
  return {
    readText: async () => "",
    getExtractedDir: async () => bundleDir,
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
    assert.equal(
      workflow.manifest.validateSelection?.select?.policy,
      "pdf-attachment",
    );
    assert.isFunction(workflow.hooks.preflight);
    assert.isFunction(workflow.hooks.buildRequest);
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

  it("keeps PDFs at or below 200 pages on the single-request path", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-short-pdf");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Short Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "short.pdf",
    });
    const selection = await buildSelectionContext([source.attachment]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
      runtime: runtimeWithPdfMetadata({ pageCount: 200 }),
    })) as Array<{
      steps?: Array<{ request?: { json?: any } }>;
      context?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 1);
    assert.isUndefined(
      requests[0].steps?.[0]?.request?.json?.files?.[0]?.page_ranges,
    );
    assert.deepInclude(requests[0].context?.mineruSplit as any, {
      enabled: false,
      reason: "within-page-limit",
    });
  });

  it("splits PDFs above 200 pages with outline-aware page ranges", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-long-pdf");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Long Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "long.pdf",
    });
    const selection = await buildSelectionContext([source.attachment]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
      runtime: runtimeWithPdfMetadata({
        pageCount: 450,
        outline: [
          { title: "Chapter 2", page: 151, level: 1 },
          { title: "Chapter 3", page: 301, level: 1 },
        ],
      }),
    })) as Array<{
      steps?: Array<{ request?: { json?: any; binary_from?: string } }>;
      context?: Record<string, unknown>;
    }> & {
      __preflight?: {
        aggregates?: Array<{ requestIndexes: number[] }>;
      };
    };

    assert.lengthOf(requests, 3);
    assert.deepEqual(
      requests.map(
        (entry) => entry.steps?.[0]?.request?.json?.files?.[0]?.page_ranges,
      ),
      ["1-150", "151-300", "301-450"],
    );
    assert.deepEqual(
      requests.map((entry) => entry.steps?.[1]?.request?.binary_from),
      [source.pdfPath, source.pdfPath, source.pdfPath],
    );
    assert.deepEqual(
      requests.map((entry) => entry.context?.partIndex),
      [1, 2, 3],
    );
    assert.deepEqual(
      requests.__preflight?.aggregates?.[0]?.requestIndexes,
      [0, 1, 2],
    );
  });

  itNodeOnly(
    "expands parent selection to child pdf attachments and keeps one task per pdf",
    async function () {
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
    },
  );

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

  itNodeOnly(
    "reports all skipped units when every candidate pdf conflicts with existing markdown",
    async function () {
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
    },
  );

  itFullOnly(
    "does not filter when only Images_<itemKey> directory exists",
    async function () {
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
    },
  );

  itFullOnly(
    "filters conflicting input when attachment uses attachments: relative path form",
    async function () {
      const workflow = await getMineruWorkflow();
      const tempDir = await mkTempDir(
        "zotero-skills-mineru-attachments-relative",
      );
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

      const originalResolveRelativePath =
        Zotero.Attachments.resolveRelativePath;
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

        assert.isOk(
          thrown,
          "expected attachments: relative path conflict to be filtered",
        );
        const typed = thrown as { code?: string };
        assert.equal(typed.code, "NO_VALID_INPUT_UNITS");
      } finally {
        Zotero.Attachments.resolveRelativePath = originalResolveRelativePath;
      }
    },
  );

  itFullOnly(
    "filters conflicting input when attachment path prefix is singular attachment:",
    async function () {
      const workflow = await getMineruWorkflow();
      const tempDir = await mkTempDir(
        "zotero-skills-mineru-attachment-singular",
      );
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

      const originalResolveRelativePath =
        Zotero.Attachments.resolveRelativePath;
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
        assert.isOk(
          thrown,
          "expected attachment: prefixed path conflict to be filtered",
        );
        const typed = thrown as { code?: string };
        assert.equal(typed.code, "NO_VALID_INPUT_UNITS");
      } finally {
        Zotero.Attachments.resolveRelativePath = originalResolveRelativePath;
      }
    },
  );

  itFullOnly(
    "filters conflicting input when pathToFile rejects drive paths with forward slashes",
    async function () {
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
    },
  );

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
      '![fig](images/figure-1.png)\n<img src="images/figure-2.png" />\n',
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
      attachmentPaths.some((entry) =>
        compareNormalizedPath(entry, targetMdPath),
      ),
      `expected linked markdown attachment=${targetMdPath}, got=${attachmentPaths.join(",")}`,
    );
  });

  it("merges aggregate child bundles in order with one blank line", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-aggregate");
    const bundleA = await mkTempDir("zotero-skills-mineru-aggregate-a");
    const bundleB = await mkTempDir("zotero-skills-mineru-aggregate-b");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Aggregate Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "book.pdf",
    });
    await writeUtf8(
      joinPath(bundleA, "full.md"),
      "![a](images/hash-a.png)\nPart A\n",
    );
    await ensureDir(joinPath(bundleA, "images"));
    await writeUtf8(joinPath(bundleA, "images", "hash-a.png"), "a");
    await writeUtf8(
      joinPath(bundleB, "full.md"),
      "![b](images/hash-b.png)\nPart B\n",
    );
    await ensureDir(joinPath(bundleB, "images"));
    await writeUtf8(joinPath(bundleB, "images", "hash-b.png"), "b");
    const request = await buildMineruRequest(source.attachment, source.pdfPath);

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: bundleReaderForDir(bundleA),
      request: { kind: "workflow.preflight.aggregate.v1" },
      runResult: {},
      resultContext: {
        aggregate: {
          id: "mineru-book",
          mode: "single-apply",
          children: [
            {
              unitId: "part-2",
              order: 2,
              request,
              runResult: {},
              resultContext: {} as any,
              bundleReader: bundleReaderForDir(bundleB),
            },
            {
              unitId: "part-1",
              order: 1,
              request,
              runResult: {},
              resultContext: {} as any,
              bundleReader: bundleReaderForDir(bundleA),
            },
          ],
        },
      } as any,
    });

    const targetMdPath = joinPath(tempDir, "book.md");
    const targetImages = joinPath(tempDir, `Images_${source.attachment.key}`);
    const markdown = await readUtf8(targetMdPath);
    assert.include(markdown, "Part A\n\n![b]");
    assert.include(markdown, `Images_${source.attachment.key}/hash-a.png`);
    assert.include(markdown, `Images_${source.attachment.key}/hash-b.png`);
    assert.isTrue(await pathExists(joinPath(targetImages, "hash-a.png")));
    assert.isTrue(await pathExists(joinPath(targetImages, "hash-b.png")));
  });

  itFullOnly(
    "preserves existing outputs when aggregate child full.md is missing",
    async function () {
      const workflow = await getMineruWorkflow();
      const tempDir = await mkTempDir("zotero-skills-mineru-aggregate-fail");
      const bundleA = await mkTempDir("zotero-skills-mineru-aggregate-fail-a");
      const bundleB = await mkTempDir("zotero-skills-mineru-aggregate-fail-b");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "MinerU Aggregate Fail Parent" },
      });
      const source = await createPdfAttachment({
        parent,
        dirPath: tempDir,
        name: "preserve.pdf",
      });
      const targetMdPath = joinPath(tempDir, "preserve.md");
      const targetImages = joinPath(tempDir, `Images_${source.attachment.key}`);
      await writeUtf8(targetMdPath, "old markdown");
      await ensureDir(targetImages);
      await writeUtf8(joinPath(targetImages, "old.png"), "old");
      await writeUtf8(joinPath(bundleA, "full.md"), "new markdown");
      await ensureDir(joinPath(bundleB, "images"));
      await writeUtf8(joinPath(bundleB, "images", "new.png"), "new");
      const request = await buildMineruRequest(
        source.attachment,
        source.pdfPath,
      );

      let thrown: unknown = null;
      try {
        await executeApplyResult({
          workflow,
          parent,
          bundleReader: bundleReaderForDir(bundleA),
          request: { kind: "workflow.preflight.aggregate.v1" },
          runResult: {},
          resultContext: {
            aggregate: {
              id: "mineru-preserve",
              mode: "single-apply",
              children: [
                {
                  unitId: "part-1",
                  order: 1,
                  request,
                  runResult: {},
                  resultContext: {} as any,
                  bundleReader: bundleReaderForDir(bundleA),
                },
                {
                  unitId: "part-2",
                  order: 2,
                  request,
                  runResult: {},
                  resultContext: {} as any,
                  bundleReader: bundleReaderForDir(bundleB),
                },
              ],
            },
          } as any,
        });
      } catch (error) {
        thrown = error;
      }

      assert.isOk(thrown);
      assert.match(String(thrown), /full\.md/i);
      assert.equal(await readUtf8(targetMdPath), "old markdown");
      assert.isTrue(await pathExists(joinPath(targetImages, "old.png")));
      assert.isFalse(await pathExists(joinPath(targetImages, "new.png")));
    },
  );

  itFullOnly(
    "replaces existing orphan images directory before moving new images",
    async function () {
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
    },
  );

  itFullOnly(
    "fails when full.md is missing and does not create partial outputs",
    async function () {
      const workflow = await getMineruWorkflow();
      const tempDir = await mkTempDir("zotero-skills-mineru-missing-full");
      const bundleDir = await mkTempDir(
        "zotero-skills-mineru-missing-full-bundle",
      );
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
    },
  );

  itNodeOnly(
    "does not create duplicate linked markdown attachment for same parent and same path",
    async function () {
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

      const request = await buildMineruRequest(
        source.attachment,
        source.pdfPath,
      );
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
    },
  );
});

function compareNormalizedPath(a: string, b: string) {
  return normalizePathForCompare(a) === normalizePathForCompare(b);
}

function normalizePathForCompare(value: string) {
  return String(value || "")
    .replace(/[\\/]+/g, "/")
    .toLowerCase();
}

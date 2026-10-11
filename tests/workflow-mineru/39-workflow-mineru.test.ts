import { assert } from "chai";
import { nativeFixtureMutations as handlers } from "../helpers/nativeFixtureMutations";
import {
  buildSelectionContext,
  itemRef,
} from "../helpers/workflowSelectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { evaluateWorkflowSelection } from "../../src/workflows/workflowInputPlanning";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
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
    sourceAttachmentRefs: [itemRef(attachment)],
    context: {
      source_attachment_path: pdfPath,
      source_attachment_name: attachment.getField("title"),
      source_attachment_ref: itemRef(attachment),
    },
  };
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
  const normalizedTarget = normalizePathForCompare(targetPath).split("/").pop();
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
    if (
      normalizePathForCompare(filePath).split("/").pop() === normalizedTarget
    ) {
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
      workflow.manifest.validateSelection.select.policy,
      "input-member",
    );
    assert.equal(workflow.manifest.inputs.member.kind, "attachment");
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
      sourceAttachmentRefs?: Array<{ libraryId: number; key: string }>;
      context?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 2);
    assert.equal(requests[0].kind, "generic-http.steps.v1");
    assert.equal(requests[1].kind, "generic-http.steps.v1");
    const sourcePaths = requests
      .map((entry) => String(entry.context?.source_attachment_path || ""))
      .sort();
    assert.deepEqual(sourcePaths, [a.pdfPath, b.pdfPath].sort());
    const names = requests
      .map((entry) => String(entry.context?.source_attachment_name || ""))
      .sort();
    assert.deepEqual(names, ["a.pdf", "b.pdf"]);
  });

  it("skips a PDF whose source path cannot be parsed by the host file API", async function () {
    const workflow = await getMineruWorkflow();
    const malformedPath =
      "Harnessing Vision Models for Time Series Analysis: A Survey PDF";
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU malformed path parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: await mkTempDir("zotero-skills-mineru-malformed"),
      name: "malformed.pdf",
    });
    const selection = await buildSelectionContext([source.attachment]);
    const hostApi = createWorkflowHostApi();
    const originalGetItemDetail = hostApi.library.getItemDetail;
    hostApi.library.getItemDetail = async (ref: any) => {
      const detail = await originalGetItemDetail(ref);
      if (ref.key === source.attachment.key) {
        return {
          ...detail,
          item: {
            ...detail.item,
            file: {
              ...detail.item.file,
              path: malformedPath,
            },
          },
        } as any;
      }
      return detail;
    };
    const result = await evaluateWorkflowSelection({
      workflow,
      mode: "execute",
      selectionContext: selection,
      runtime: {
        hostApi: {
          ...hostApi,
          file: {
            ...hostApi.file,
            exists: async () => {
              throw new Error(
                "could not parse path (NS_ERROR_FILE_UNRECOGNIZED_PATH)",
              );
            },
          },
        } as any,
      },
    });

    assert.equal(result.state, "disabled");
    assert.equal(result.reasonCode, "no-valid-input-units");
    assert.deepEqual(result.scopedSelectionContexts, []);
    assert.deepEqual(result.stats, {
      totalUnits: 1,
      validUnits: 0,
      skippedUnits: 1,
    });
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
    await writeUtf8(source.pdfPath, "/Type /Page\n".repeat(200));
    const selection = await buildSelectionContext([source.attachment]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
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
    await writeUtf8(source.pdfPath, "/Type /Page\n".repeat(450));
    const selection = await buildSelectionContext([source.attachment]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
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
      })) as Array<{
        sourceAttachmentRefs?: Array<{ libraryId: number; key: string }>;
        context?: Record<string, unknown>;
      }>;

      assert.lengthOf(requests, 2);
      const sourcePaths = requests
        .map((entry) => String(entry.context?.source_attachment_path || ""))
        .sort();
      assert.deepEqual(sourcePaths, [a.pdfPath, b.pdfPath].sort());
    },
  );

  it("keeps inputs when sibling markdown exists so reruns can replace it", async function () {
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
      sourceAttachmentRefs?: Array<{ libraryId: number; key: string }>;
      context?: Record<string, unknown>;
    }> & {
      __stats?: {
        totalUnits?: number;
        skippedUnits?: number;
        candidateStats?: { total?: number; skipped?: number };
      };
    };

    assert.lengthOf(requests, 2);
    assert.equal(requests[0].context?.source_attachment_path, keep.pdfPath);
    assert.equal(requests[1].context?.source_attachment_path, skip.pdfPath);
    assert.equal(requests.__stats?.totalUnits, 2);
    assert.equal(requests.__stats?.skippedUnits, 0);
    assert.equal(requests.__stats?.candidateStats?.total, 2);
    assert.equal(requests.__stats?.candidateStats?.skipped, 0);
  });

  itNodeOnly(
    "keeps every candidate when all adjacent markdown files already exist",
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
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext: selection,
      })) as any[];
      assert.lengthOf(requests, 2);
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
        sourceAttachmentRefs?: Array<{ libraryId: number; key: string }>;
        context?: Record<string, unknown>;
      }>;

      assert.lengthOf(requests, 1);
      assert.equal(requests[0].context?.source_attachment_path, source.pdfPath);
    },
  );

  itFullOnly(
    "keeps rerun input when the attachment uses attachments: relative path form",
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
      const attachmentEntry = selection.items.find(
        (item: any) => item.kind === "attachment",
      ) as any;
      assert.equal(attachmentEntry.filename, "paper.pdf");

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
        const requests = await executeBuildRequests({
          workflow,
          selectionContext: selection,
        });
        assert.lengthOf(requests, 1);
      } finally {
        Zotero.Attachments.resolveRelativePath = originalResolveRelativePath;
      }
    },
  );

  itFullOnly(
    "keeps rerun input when attachment path prefix is singular attachment:",
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
      const attachmentEntry = selection.items.find(
        (item: any) => item.kind === "attachment",
      ) as any;
      assert.equal(attachmentEntry.filename, "paper.pdf");

      const originalResolveRelativePath =
        Zotero.Attachments.resolveRelativePath;
      Zotero.Attachments.resolveRelativePath = ((value: string) => {
        const text = String(value || "")
          .replace(/^attachments?:/i, "")
          .replace(/^[\\/]+/, "");
        return joinPath(tempDir, text);
      }) as typeof Zotero.Attachments.resolveRelativePath;

      try {
        const requests = await executeBuildRequests({
          workflow,
          selectionContext: selection,
        });
        assert.lengthOf(requests, 1);
      } finally {
        Zotero.Attachments.resolveRelativePath = originalResolveRelativePath;
      }
    },
  );

  itFullOnly(
    "keeps rerun input when pathToFile rejects drive paths with forward slashes",
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
        const requests = await executeBuildRequests({
          workflow,
          selectionContext: selection,
        });
        assert.lengthOf(requests, 1);
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

    const statusTransitions: unknown[] = [];
    const applied = (await executeApplyResult({
      workflow,
      parent: itemRef(parent),
      bundleReader: {
        readText: async () => "",
        getExtractedDir: async () => bundleDir,
      },
      request: await buildMineruRequest(source.attachment, source.pdfPath),
      runResult: {},
      runtime: {
        hostApi: {
          ...createWorkflowHostApi(),
          statusTags: {
            getPolicy: () => ({}),
            transition: async (args: unknown) => {
              statusTransitions.push(args);
              return {
                outcome: "committed",
                result: { added: [], removed: [], unchanged: [] },
              };
            },
          },
        } as any,
      },
    })) as { partial?: boolean };

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
      `expected stored markdown attachment for ${targetMdPath}`,
    );
    const storedMarkdown = attachmentPaths.find((entry) =>
      compareNormalizedPath(entry, targetMdPath),
    )!;
    assert.notEqual(storedMarkdown, targetMdPath);
    assert.equal(await readUtf8(storedMarkdown), markdown);
    assert.isTrue(
      await pathExists(
        joinPath(
          storedMarkdown.replace(/[\\/][^\\/]+$/, ""),
          `Images_${source.attachment.key}`,
          "figure-1.png",
        ),
      ),
    );
    assert.lengthOf(statusTransitions, 1);
    assert.deepInclude(statusTransitions[0], {
      itemRef: { libraryId: parent.libraryID, key: parent.key },
      remove: ["need-fulltext", "need-markdown"],
    });
    assert.isFalse(applied.partial);
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
      parent: itemRef(parent),
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
          parent: itemRef(parent),
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
        parent: itemRef(parent),
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
          parent: itemRef(parent),
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
        parent: itemRef(parent),
        bundleReader: {
          readText: async () => "",
          getExtractedDir: async () => bundleDir,
        },
        request,
        runResult: {},
      });

      await executeApplyResult({
        workflow,
        parent: itemRef(parent),
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

  it("prefers an exact output path over a stored attachment with the same filename", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-exact-match");
    const bundleDir = await mkTempDir(
      "zotero-skills-mineru-exact-match-bundle",
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Exact Match Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "exact.pdf",
    });
    const targetPath = joinPath(tempDir, "exact.md");
    const exact = {
      ref: { libraryId: parent.libraryID, key: "EXACT01" },
      linkMode: "linked_file",
      filename: "exact.md",
      file: { state: "available", path: targetPath },
    };
    const stored = {
      ref: { libraryId: parent.libraryID, key: "STORED1" },
      linkMode: "stored_file",
      filename: "exact.md",
      file: {
        state: "available",
        path: joinPath(tempDir, "other", "exact.md"),
      },
    };
    await writeUtf8(joinPath(bundleDir, "full.md"), "new result\n");
    const api = createWorkflowHostApi();
    const replaced: unknown[] = [];
    const created: unknown[] = [];
    const runtime = {
      hostApi: {
        ...api,
        library: {
          ...api.library,
          getItemAttachments: async () => ({
            attachments: [stored, exact],
            hasMore: false,
          }),
        },
        attachments: {
          replaceFile: async (input: unknown) => {
            replaced.push(input);
            return { outcome: "committed" };
          },
          create: async (input: unknown) => {
            created.push(input);
            return { outcome: "committed" };
          },
        },
      },
    } as any;

    await executeApplyResult({
      workflow,
      parent: itemRef(parent),
      bundleReader: bundleReaderForDir(bundleDir),
      request: await buildMineruRequest(source.attachment, source.pdfPath),
      runResult: {},
      runtime,
    });

    assert.lengthOf(replaced, 0);
    assert.lengthOf(created, 0);
  });

  it("matches paths case-sensitively on POSIX and case-insensitively on Windows", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-path-case");
    const bundleDir = await mkTempDir("zotero-skills-mineru-path-case-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Path Case Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "case.pdf",
    });
    const targetPath = joinPath(tempDir, "case.md");
    const exact = {
      ref: { libraryId: parent.libraryID, key: "CASE001" },
      linkMode: "linked_file",
      filename: "case.md",
      file: { state: "available", path: joinPath(tempDir, "Case.md") },
    };
    const stored = {
      ref: { libraryId: parent.libraryID, key: "CASE002" },
      linkMode: "stored_file",
      filename: "case.md",
      file: {
        state: "available",
        path: joinPath(tempDir, "stored", "case.md"),
      },
    };
    await writeUtf8(joinPath(bundleDir, "full.md"), "result\n");
    const api = createWorkflowHostApi();
    const replaced: string[] = [];
    const runtime = {
      hostApi: {
        ...api,
        library: {
          ...api.library,
          getItemAttachments: async () => ({
            attachments: [exact, stored],
            hasMore: false,
          }),
        },
        attachments: {
          replaceFile: async (input: any) => {
            replaced.push(input.attachmentRef.key);
            return { outcome: "committed" };
          },
          create: async () => ({ outcome: "committed" }),
        },
      },
    } as any;
    const originalIsWin = Zotero.isWin;
    try {
      Zotero.isWin = false;
      await executeApplyResult({
        workflow,
        parent: itemRef(parent),
        bundleReader: bundleReaderForDir(bundleDir),
        request: await buildMineruRequest(source.attachment, source.pdfPath),
        runResult: {},
        runtime,
      });
      assert.deepEqual(replaced, ["CASE002"]);
      Zotero.isWin = true;
      await executeApplyResult({
        workflow,
        parent: itemRef(parent),
        bundleReader: bundleReaderForDir(bundleDir),
        request: await buildMineruRequest(source.attachment, source.pdfPath),
        runResult: {},
        runtime,
      });
      assert.deepEqual(replaced, ["CASE002"]);
    } finally {
      Zotero.isWin = originalIsWin;
    }
    assert.isTrue(await pathExists(targetPath));
  });

  it("rejects ambiguous stored filename fallback before touching adjacent outputs", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-ambiguous");
    const bundleDir = await mkTempDir("zotero-skills-mineru-ambiguous-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Ambiguous Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "ambiguous.pdf",
    });
    const targetPath = joinPath(tempDir, "ambiguous.md");
    await writeUtf8(targetPath, "old markdown");
    await writeUtf8(joinPath(bundleDir, "full.md"), "new markdown");
    const api = createWorkflowHostApi();
    const runtime = {
      hostApi: {
        ...api,
        library: {
          ...api.library,
          getItemAttachments: async () => ({
            attachments: ["STORED1", "STORED2"].map((key) => ({
              ref: { libraryId: parent.libraryID, key },
              linkMode: "stored_file",
              filename: "ambiguous.md",
              file: {
                state: "available",
                path: joinPath(tempDir, key, "ambiguous.md"),
              },
            })),
            hasMore: false,
          }),
        },
      },
    } as any;
    let thrown: unknown;
    try {
      await executeApplyResult({
        workflow,
        parent: itemRef(parent),
        bundleReader: bundleReaderForDir(bundleDir),
        request: await buildMineruRequest(source.attachment, source.pdfPath),
        runResult: {},
        runtime,
      });
    } catch (error) {
      thrown = error;
    }

    assert.match(String(thrown), /ambiguous/i);
    assert.equal(await readUtf8(targetPath), "old markdown");
  });

  it("rejects a missing stored filename candidate before touching adjacent outputs", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-missing-candidate");
    const bundleDir = await mkTempDir(
      "zotero-skills-mineru-missing-candidate-bundle",
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Missing Candidate Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "missing-candidate.pdf",
    });
    const targetPath = joinPath(tempDir, "missing-candidate.md");
    await writeUtf8(targetPath, "old markdown");
    await writeUtf8(joinPath(bundleDir, "full.md"), "new markdown");
    const api = createWorkflowHostApi();
    const runtime = {
      hostApi: {
        ...api,
        library: {
          ...api.library,
          getItemAttachments: async () => ({
            attachments: [
              {
                ref: { libraryId: parent.libraryID, key: "MISSING1" },
                linkMode: "stored_file",
                filename: "missing-candidate.md",
                file: { state: "missing" },
              },
            ],
            hasMore: false,
          }),
        },
      },
    } as any;
    let thrown: unknown;
    try {
      await executeApplyResult({
        workflow,
        parent: itemRef(parent),
        bundleReader: bundleReaderForDir(bundleDir),
        request: await buildMineruRequest(source.attachment, source.pdfPath),
        runResult: {},
        runtime,
      });
    } catch (error) {
      thrown = error;
    }

    assert.match(String(thrown), /attachment is missing/i);
    assert.equal(await readUtf8(targetPath), "old markdown");
  });

  it("restores previous Markdown and images when attachment replacement fails", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-rollback");
    const bundleDir = await mkTempDir("zotero-skills-mineru-rollback-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Rollback Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "rollback.pdf",
    });
    const targetPath = joinPath(tempDir, "rollback.md");
    const imagesPath = joinPath(tempDir, `Images_${source.attachment.key}`);
    await writeUtf8(targetPath, "old markdown");
    await ensureDir(imagesPath);
    await writeUtf8(joinPath(imagesPath, "old.png"), "old image");
    await writeUtf8(joinPath(bundleDir, "full.md"), "new markdown");
    await ensureDir(joinPath(bundleDir, "images"));
    await writeUtf8(joinPath(bundleDir, "images", "new.png"), "new image");
    const api = createWorkflowHostApi();
    const runtime = {
      hostApi: {
        ...api,
        library: {
          ...api.library,
          getItemAttachments: async () => ({ attachments: [], hasMore: false }),
        },
        attachments: {
          create: async () => ({
            outcome: "failed",
            attempt: { error: { message: "confirmed failure" } },
          }),
        },
      },
    } as any;

    let thrown: unknown;
    try {
      await executeApplyResult({
        workflow,
        parent: itemRef(parent),
        bundleReader: bundleReaderForDir(bundleDir),
        request: await buildMineruRequest(source.attachment, source.pdfPath),
        runResult: {},
        runtime,
      });
    } catch (error) {
      thrown = error;
    }

    assert.match(String(thrown), /confirmed failure/);
    assert.equal(await readUtf8(targetPath), "old markdown");
    assert.isTrue(await pathExists(joinPath(imagesPath, "old.png")));
    assert.isFalse(await pathExists(joinPath(imagesPath, "new.png")));
  });

  it("removes old images after a successful rerun with no image output", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-no-images-rerun");
    const bundleDir = await mkTempDir("zotero-skills-mineru-no-images-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU No Images Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "no-images.pdf",
    });
    const imagesPath = joinPath(tempDir, `Images_${source.attachment.key}`);
    await ensureDir(imagesPath);
    await writeUtf8(joinPath(imagesPath, "old.png"), "old image");
    await writeUtf8(
      joinPath(bundleDir, "full.md"),
      "new markdown without images\n",
    );

    await executeApplyResult({
      workflow,
      parent: itemRef(parent),
      bundleReader: bundleReaderForDir(bundleDir),
      request: await buildMineruRequest(source.attachment, source.pdfPath),
      runResult: {},
    });

    assert.isFalse(await pathExists(imagesPath));
    assert.equal(
      await readUtf8(joinPath(tempDir, "no-images.md")),
      "new markdown without images\n",
    );
  });

  it("rejects same-parent source PDFs with the same filename before writing", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-source-collision");
    const otherDir = await mkTempDir(
      "zotero-skills-mineru-source-collision-other",
    );
    const bundleDir = await mkTempDir(
      "zotero-skills-mineru-source-collision-bundle",
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Source Collision Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "same.pdf",
    });
    await createPdfAttachment({ parent, dirPath: otherDir, name: "same.pdf" });
    await writeUtf8(joinPath(bundleDir, "full.md"), "new markdown\n");
    let thrown: unknown;
    try {
      await executeApplyResult({
        workflow,
        parent: itemRef(parent),
        bundleReader: bundleReaderForDir(bundleDir),
        request: await buildMineruRequest(source.attachment, source.pdfPath),
        runResult: {},
      });
    } catch (error) {
      thrown = error;
    }

    assert.match(String(thrown), /filename conflicts/i);
    assert.isFalse(await pathExists(joinPath(tempDir, "same.md")));
  });

  it("preserves recovery files when the attachment operation throws", async function () {
    const workflow = await getMineruWorkflow();
    const tempDir = await mkTempDir("zotero-skills-mineru-unknown");
    const bundleDir = await mkTempDir("zotero-skills-mineru-unknown-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "MinerU Unknown Parent" },
    });
    const source = await createPdfAttachment({
      parent,
      dirPath: tempDir,
      name: "unknown.pdf",
    });
    const targetPath = joinPath(tempDir, "unknown.md");
    await writeUtf8(targetPath, "old markdown");
    await writeUtf8(joinPath(bundleDir, "full.md"), "new markdown");
    const api = createWorkflowHostApi();
    const runtime = {
      hostApi: {
        ...api,
        library: {
          ...api.library,
          getItemAttachments: async () => ({ attachments: [], hasMore: false }),
        },
        attachments: {
          create: async () => {
            throw new Error("connection lost after dispatch");
          },
        },
      },
    } as any;
    let thrown: unknown;
    try {
      await executeApplyResult({
        workflow,
        parent: itemRef(parent),
        bundleReader: bundleReaderForDir(bundleDir),
        request: await buildMineruRequest(source.attachment, source.pdfPath),
        runResult: {},
        runtime,
      });
    } catch (error) {
      thrown = error;
    }

    assert.match(String(thrown), /recovery files:/i);
    assert.equal(await readUtf8(targetPath), "new markdown\n");
    const stageNames = (
      await (await import("node:fs/promises")).readdir(tempDir)
    ).filter((name: string) => name.startsWith(".mineru-"));
    assert.lengthOf(stageNames, 1);
    assert.equal(
      await readUtf8(joinPath(tempDir, stageNames[0], "backup", "unknown.md")),
      "old markdown",
    );
  });
});

function compareNormalizedPath(a: string, b: string) {
  return (
    normalizePathForCompare(a).split("/").pop() ===
    normalizePathForCompare(b).split("/").pop()
  );
}

function normalizePathForCompare(value: string) {
  return String(value || "")
    .replace(/[\\/]+/g, "/")
    .toLowerCase();
}

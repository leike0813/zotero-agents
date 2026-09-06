import { assert } from "chai";
import { nativeFixtureMutations as handlers } from "../helpers/nativeFixtureMutations";
import { lockSelection } from "../../src/modules/selectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { evaluateWorkflowSelection } from "../../src/workflows/workflowInputPlanning";
import type { LoadedWorkflow } from "../../src/workflows/types";
import {
  createLiteratureAnalysisFixtureHelpers,
  workflowsPath,
} from "./workflow-test-utils";

async function getWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-analysis",
  );
  assert.isOk(workflow, "workflow literature-analysis not found");
  assert.equal(
    workflow?.manifest.validateSelection?.select?.policy,
    "literature-source",
  );
  return workflow!;
}

function attachmentFact(entry: ReturnType<typeof attachmentEntry>) {
  const item = entry.item;
  const parent = entry.parent;
  return {
    kind: "attachment" as const,
    ref: { libraryId: Number(item.libraryID), key: String(item.key) },
    itemType: "attachment",
    title: String(item.title || ""),
    parentRef: {
      libraryId: Number(parent.libraryID),
      key: String(parent.key),
    },
    filename:
      String(entry.filePath)
        .split(/[\\/]+/)
        .pop() || "",
    contentType: String(entry.mimeType || item.data.contentType || ""),
    createdAt: String(item.data.dateAdded || ""),
    fileState: "available" as const,
  };
}

function parentFact(parentId: number, title: string) {
  return {
    kind: "parent" as const,
    ref: { libraryId: 1, key: `P${parentId}` },
    itemType: "journalArticle",
    title,
  };
}

function makeSyntheticContext(
  entries: Array<ReturnType<typeof attachmentEntry>>,
  parents: Array<ReturnType<typeof parentFact>> = [],
) {
  return lockSelection(
    [...parents, ...entries.map(attachmentFact)],
    "2026-02-09T00:00:00.000Z",
  );
}

const hookRuntime = {
  handlers,
  zotero: Zotero,
  helpers: createLiteratureAnalysisFixtureHelpers(Zotero),
};

async function evaluateSelection(workflow: LoadedWorkflow, context: unknown) {
  const selectedItems = (context as { items: readonly any[] }).items || [];
  const result = await evaluateWorkflowSelection({
    workflow,
    selectionContext: context,
    runtime: {
      ...hookRuntime,
      hostApi: {
        library: {
          getItemAttachments: async (parentRef: {
            libraryId: number;
            key: string;
          }) => ({
            attachments: selectedItems
              .filter(
                (item) =>
                  item.kind === "attachment" &&
                  item.parentRef?.libraryId === parentRef.libraryId &&
                  item.parentRef?.key === parentRef.key,
              )
              .map((item) => ({
                ref: item.ref,
                parentRef: item.parentRef,
                revision: "test",
                title: item.title || "",
                filename: item.filename || null,
                contentType: item.contentType || null,
                charset: null,
                url: null,
                linkMode: "linked_file",
                role: "ordinary",
                createdAt: item.createdAt || "",
                file: {
                  state: "available",
                  path: item.filename || "",
                  sizeBytes: 0,
                  modifiedAt: null,
                },
              })),
            hasMore: false,
            nextCursor: undefined,
            returned: selectedItems.filter(
              (item) =>
                item.kind === "attachment" &&
                item.parentRef?.libraryId === parentRef.libraryId &&
                item.parentRef?.key === parentRef.key,
            ).length,
            total: null,
          }),
          getItemNotes: async () => ({
            notes: [],
            limit: 100,
            nextCursor: null,
            hasMore: false,
            returned: 0,
            total: 0,
          }),
        },
      } as any,
    },
    mode: "execute",
  });
  return result.scopedSelectionContexts[0] as {
    items: Array<{ filename?: string }>;
  };
}

function attachmentEntry(args: {
  id: number;
  title: string;
  filePath: string;
  parentId: number;
  parentTitle: string;
  dateAdded: string;
  mimeType: string;
}) {
  return {
    item: {
      id: args.id,
      key: `K${args.id}`,
      itemType: "attachment",
      title: args.title,
      libraryID: 1,
      parentItemID: args.parentId,
      data: {
        dateAdded: args.dateAdded,
        path: args.filePath,
        contentType: args.mimeType,
      },
    },
    parent: {
      id: args.parentId,
      key: `P${args.parentId}`,
      libraryID: 1,
      title: args.parentTitle,
    },
    filePath: args.filePath,
    mimeType: args.mimeType,
  };
}

describe("literature-analysis validateSelection", function () {
  it("resolves parent with multiple md and pdf using earliest-pdf filename match", async function () {
    const workflow = await getWorkflow();
    const entries = [
      attachmentEntry({
        id: 96,
        title:
          "Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.md",
        filePath:
          "attachments/NWU22TPK/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.md",
        parentId: 57,
        parentTitle:
          "Panoptic SegFormer: Delving Deeper Into Panoptic Segmentation With Transformers",
        dateAdded: "2026-01-27T01:18:30Z",
        mimeType: "text/plain",
      }),
      attachmentEntry({
        id: 247,
        title:
          "Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.no_watermark.zh-CN.dual.md",
        filePath:
          "attachments/WC7HIYMF/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.no_watermark.zh-CN.dual.md",
        parentId: 57,
        parentTitle:
          "Panoptic SegFormer: Delving Deeper Into Panoptic Segmentation With Transformers",
        dateAdded: "2026-01-27T10:11:46Z",
        mimeType: "text/plain",
      }),
      attachmentEntry({
        id: 248,
        title:
          "Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.pdf",
        filePath:
          "attachments/SMFVBYXT/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.pdf",
        parentId: 57,
        parentTitle:
          "Panoptic SegFormer: Delving Deeper Into Panoptic Segmentation With Transformers",
        dateAdded: "2026-01-27T00:57:05Z",
        mimeType: "application/pdf",
      }),
    ];
    const context = makeSyntheticContext(entries, [
      parentFact(
        57,
        "Panoptic SegFormer: Delving Deeper Into Panoptic Segmentation With Transformers",
      ),
    ]);
    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items, 1);
    assert.match(
      filtered.items[0].filename || "",
      /Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers\.md$/,
    );
  });

  it("fallbacks to earliest md when no pdf-name match exists", async function () {
    const workflow = await getWorkflow();
    const context = makeSyntheticContext([
      attachmentEntry({
        id: 1,
        title: "paperA.v2.md",
        filePath: "attachments/A/paperA.v2.md",
        parentId: 100010,
        parentTitle: "P1",
        dateAdded: "2026-01-03T00:00:00Z",
        mimeType: "text/plain",
      }),
      attachmentEntry({
        id: 2,
        title: "paperA.md",
        filePath: "attachments/A/paperA.md",
        parentId: 100010,
        parentTitle: "P1",
        dateAdded: "2026-01-02T00:00:00Z",
        mimeType: "text/plain",
      }),
      attachmentEntry({
        id: 3,
        title: "paperA.pdf",
        filePath: "attachments/A/paperA.pdf",
        parentId: 100010,
        parentTitle: "P1",
        dateAdded: "2026-01-01T00:00:00Z",
        mimeType: "application/pdf",
      }),
    ]);

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items, 1);
    assert.equal(filtered.items[0].filename, "paperA.md");
  });

  it("fallbacks to earliest pdf when no markdown exists", async function () {
    const workflow = await getWorkflow();
    const context = makeSyntheticContext([
      attachmentEntry({
        id: 21,
        title: "paper.pdf",
        filePath: "attachments/B/paper.pdf",
        parentId: 100020,
        parentTitle: "P2",
        dateAdded: "2026-01-02T00:00:00Z",
        mimeType: "application/pdf",
      }),
      attachmentEntry({
        id: 22,
        title: "paper-v2.pdf",
        filePath: "attachments/B/paper-v2.pdf",
        parentId: 100020,
        parentTitle: "P2",
        dateAdded: "2026-01-03T00:00:00Z",
        mimeType: "application/pdf",
      }),
    ]);

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items, 1);
    assert.equal(filtered.items[0].filename, "paper.pdf");
  });

  it("ignores selected markdown attachments when their parent is selected", async function () {
    const workflow = await getWorkflow();
    const context = makeSyntheticContext(
      [
        attachmentEntry({
          id: 11,
          title: "alpha.md",
          filePath: "attachments/P/alpha.md",
          parentId: 20,
          parentTitle: "Parent 20",
          dateAdded: "2026-01-02T00:00:00Z",
          mimeType: "text/plain",
        }),
        attachmentEntry({
          id: 12,
          title: "alpha.pdf",
          filePath: "attachments/P/alpha.pdf",
          parentId: 20,
          parentTitle: "Parent 20",
          dateAdded: "2026-01-01T00:00:00Z",
          mimeType: "application/pdf",
        }),
      ],
      [parentFact(20, "Parent 20")],
    );

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items, 1);
    assert.equal(filtered.items[0].filename, "alpha.md");
  });
});

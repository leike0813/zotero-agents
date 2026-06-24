import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { createHookHelpers } from "../../src/workflows/helpers";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { evaluateWorkflowSelection } from "../../src/workflows/workflowSelectionValidation";
import type { LoadedWorkflow } from "../../src/workflows/types";
import multiPdfAndMd from "../fixtures/selection-context/selection-context-multi-pdf-and-md.json";
import { workflowsPath } from "./workflow-test-utils";

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

function makeSyntheticContext(entries: Array<Record<string, unknown>>) {
  return {
    selectionType: "attachment",
    items: {
      parents: [],
      children: [],
      attachments: entries,
      notes: [],
    },
    summary: {
      parentCount: 0,
      childCount: 0,
      attachmentCount: entries.length,
      noteCount: 0,
    },
    warnings: [],
    sampledAt: "2026-02-09T00:00:00.000Z",
  };
}

function withSyntheticParentIds<T>(value: T): T {
  const cloned = JSON.parse(JSON.stringify(value || {})) as {
    items?: {
      parents?: Array<{
        item?: { id?: number };
        attachments?: Array<{ item?: { parentItemID?: number | null } }>;
      }>;
      attachments?: Array<{
        parent?: { id?: number };
        item?: { parentItemID?: number | null };
      }>;
    };
  };
  const parentIdMap = new Map<number, number>();
  const parents = cloned.items?.parents || [];
  for (let index = 0; index < parents.length; index += 1) {
    const entry = parents[index];
    const rawId = Number(entry?.item?.id || 0);
    if (!rawId || parentIdMap.has(rawId)) {
      continue;
    }
    parentIdMap.set(rawId, 900000 + index + 1);
  }
  for (const parent of parents) {
    const rawId = Number(parent?.item?.id || 0);
    const mapped = parentIdMap.get(rawId);
    if (!mapped) {
      continue;
    }
    if (parent.item) {
      parent.item.id = mapped;
    }
    for (const attachment of parent.attachments || []) {
      if (attachment?.item) {
        attachment.item.parentItemID = mapped;
      }
    }
  }
  for (const attachment of cloned.items?.attachments || []) {
    const rawParentId = Number(
      attachment?.parent?.id || attachment?.item?.parentItemID || 0,
    );
    const mapped = parentIdMap.get(rawParentId);
    if (!mapped) {
      continue;
    }
    if (attachment.parent) {
      attachment.parent.id = mapped;
    }
    if (attachment.item) {
      attachment.item.parentItemID = mapped;
    }
  }
  return cloned as unknown as T;
}

const hookRuntime = {
  handlers,
  zotero: Zotero,
  helpers: createHookHelpers(Zotero),
};

async function evaluateSelection(workflow: LoadedWorkflow, context: unknown) {
  const result = await evaluateWorkflowSelection({
    workflow,
    selectionContext: context,
    runtime: hookRuntime,
    mode: "execute",
  });
  return result.scopedSelectionContexts[0] as {
    items: { attachments: Array<{ filePath?: string }> };
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
      title: args.parentTitle,
    },
    filePath: args.filePath,
    mimeType: args.mimeType,
  };
}

describe("literature-analysis validateSelection", function () {
  it("exposes generic helper to pick earliest pdf attachment", function () {
    const earliest = hookRuntime.helpers.pickEarliestPdfAttachment([
      attachmentEntry({
        id: 100,
        title: "b.pdf",
        filePath: "attachments/H/b.pdf",
        parentId: 99,
        parentTitle: "Parent 99",
        dateAdded: "2026-01-02T00:00:00Z",
        mimeType: "application/pdf",
      }),
      attachmentEntry({
        id: 101,
        title: "a.pdf",
        filePath: "attachments/H/a.pdf",
        parentId: 99,
        parentTitle: "Parent 99",
        dateAdded: "2026-01-01T00:00:00Z",
        mimeType: "application/pdf",
      }),
      attachmentEntry({
        id: 102,
        title: "note.md",
        filePath: "attachments/H/note.md",
        parentId: 99,
        parentTitle: "Parent 99",
        dateAdded: "2026-01-01T00:00:00Z",
        mimeType: "text/markdown",
      }),
    ]);

    assert.isOk(earliest);
    assert.equal(
      (earliest as { filePath?: string }).filePath,
      "attachments/H/a.pdf",
    );
  });

  it("resolves parent with multiple md and pdf using earliest-pdf filename match", async function () {
    const workflow = await getWorkflow();
    const context = withSyntheticParentIds(multiPdfAndMd);
    const filtered = await evaluateSelection(workflow, context as unknown);

    assert.lengthOf(filtered.items.attachments, 1);
    assert.match(
      filtered.items.attachments[0].filePath || "",
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

    assert.lengthOf(filtered.items.attachments, 1);
    assert.equal(
      filtered.items.attachments[0].filePath,
      "attachments/A/paperA.md",
    );
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

    assert.lengthOf(filtered.items.attachments, 1);
    assert.equal(
      filtered.items.attachments[0].filePath,
      "attachments/B/paper.pdf",
    );
  });

  it("ignores selected markdown attachments when their parent is selected", async function () {
    const workflow = await getWorkflow();
    const context = withSyntheticParentIds({
      selectionType: "mixed",
      items: {
        parents: [
          {
            item: { id: 20, title: "Parent 20" },
            attachments: [
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
          },
        ],
        children: [],
        attachments: [
          attachmentEntry({
            id: 11,
            title: "alpha.md",
            filePath: "attachments/P/alpha.md",
            parentId: 20,
            parentTitle: "Parent 20",
            dateAdded: "2026-01-02T00:00:00Z",
            mimeType: "text/plain",
          }),
        ],
        notes: [],
      },
      summary: {
        parentCount: 1,
        childCount: 0,
        attachmentCount: 1,
        noteCount: 0,
      },
      warnings: [],
      sampledAt: "2026-02-09T00:00:00.000Z",
    });

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items.attachments, 1);
    assert.equal(
      filtered.items.attachments[0].filePath,
      "attachments/P/alpha.md",
    );
  });
});

import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { createHookHelpers } from "../../src/workflows/helpers";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { evaluateWorkflowSelection } from "../../src/workflows/workflowSelectionValidation";
import type { LoadedWorkflow } from "../../src/workflows/types";
import { workflowsPath } from "./workflow-test-utils";

async function getWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-explainer",
  );
  assert.isOk(workflow, "workflow literature-explainer not found");
  assert.equal(workflow?.manifest.validateSelection?.select?.policy, "literature-source");
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
    sampledAt: "2026-03-12T00:00:00.000Z",
  };
}

const hookRuntime = {
  handlers,
  zotero: Zotero,
  helpers: createHookHelpers(Zotero),
};

async function evaluateSelection(
  workflow: LoadedWorkflow,
  context: unknown,
) {
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

describe("literature-explainer validateSelection", function () {
  it("picks single markdown when markdown and pdf both exist", async function () {
    const workflow = await getWorkflow();
    const context = makeSyntheticContext([
      attachmentEntry({
        id: 1,
        title: "paper.md",
        filePath: "attachments/A/paper.md",
        parentId: 1001,
        parentTitle: "Parent A",
        dateAdded: "2026-01-02T00:00:00Z",
        mimeType: "text/markdown",
      }),
      attachmentEntry({
        id: 2,
        title: "paper.pdf",
        filePath: "attachments/A/paper.pdf",
        parentId: 1001,
        parentTitle: "Parent A",
        dateAdded: "2026-01-01T00:00:00Z",
        mimeType: "application/pdf",
      }),
    ]);

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items.attachments, 1);
    assert.equal(filtered.items.attachments[0].filePath, "attachments/A/paper.md");
  });

  it("picks markdown matched by earliest pdf stem when multiple markdown files exist", async function () {
    const workflow = await getWorkflow();
    const context = makeSyntheticContext([
      attachmentEntry({
        id: 11,
        title: "paper-v1.md",
        filePath: "attachments/B/paper-v1.md",
        parentId: 1002,
        parentTitle: "Parent B",
        dateAdded: "2026-01-03T00:00:00Z",
        mimeType: "text/markdown",
      }),
      attachmentEntry({
        id: 12,
        title: "paper.md",
        filePath: "attachments/B/paper.md",
        parentId: 1002,
        parentTitle: "Parent B",
        dateAdded: "2026-01-04T00:00:00Z",
        mimeType: "text/plain",
      }),
      attachmentEntry({
        id: 13,
        title: "paper.pdf",
        filePath: "attachments/B/paper.pdf",
        parentId: 1002,
        parentTitle: "Parent B",
        dateAdded: "2026-01-01T00:00:00Z",
        mimeType: "application/pdf",
      }),
      attachmentEntry({
        id: 14,
        title: "paper-v2.pdf",
        filePath: "attachments/B/paper-v2.pdf",
        parentId: 1002,
        parentTitle: "Parent B",
        dateAdded: "2026-01-02T00:00:00Z",
        mimeType: "application/pdf",
      }),
    ]);

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items.attachments, 1);
    assert.equal(filtered.items.attachments[0].filePath, "attachments/B/paper.md");
  });

  it("falls back to earliest markdown when no markdown matches earliest pdf stem", async function () {
    const workflow = await getWorkflow();
    const context = makeSyntheticContext([
      attachmentEntry({
        id: 21,
        title: "aaa.md",
        filePath: "attachments/C/aaa.md",
        parentId: 1003,
        parentTitle: "Parent C",
        dateAdded: "2026-01-01T00:00:00Z",
        mimeType: "text/plain",
      }),
      attachmentEntry({
        id: 22,
        title: "bbb.md",
        filePath: "attachments/C/bbb.md",
        parentId: 1003,
        parentTitle: "Parent C",
        dateAdded: "2026-01-02T00:00:00Z",
        mimeType: "text/markdown",
      }),
      attachmentEntry({
        id: 23,
        title: "paper.pdf",
        filePath: "attachments/C/paper.pdf",
        parentId: 1003,
        parentTitle: "Parent C",
        dateAdded: "2026-01-01T00:00:00Z",
        mimeType: "application/pdf",
      }),
    ]);

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items.attachments, 1);
    assert.equal(filtered.items.attachments[0].filePath, "attachments/C/aaa.md");
  });

  it("falls back to earliest pdf when markdown is absent", async function () {
    const workflow = await getWorkflow();
    const context = makeSyntheticContext([
      attachmentEntry({
        id: 31,
        title: "b.pdf",
        filePath: "attachments/D/b.pdf",
        parentId: 1004,
        parentTitle: "Parent D",
        dateAdded: "2026-01-02T00:00:00Z",
        mimeType: "application/pdf",
      }),
      attachmentEntry({
        id: 32,
        title: "a.pdf",
        filePath: "attachments/D/a.pdf",
        parentId: 1004,
        parentTitle: "Parent D",
        dateAdded: "2026-01-01T00:00:00Z",
        mimeType: "application/pdf",
      }),
    ]);

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items.attachments, 1);
    assert.equal(filtered.items.attachments[0].filePath, "attachments/D/a.pdf");
  });

  it("keeps one input per parent when parent and child attachment are both selected", async function () {
    const workflow = await getWorkflow();
    const context = {
      selectionType: "mixed",
      items: {
        parents: [
          {
            item: { id: 2001, title: "Parent E" },
            attachments: [
              attachmentEntry({
                id: 41,
                title: "paper.md",
                filePath: "attachments/E/paper.md",
                parentId: 2001,
                parentTitle: "Parent E",
                dateAdded: "2026-01-01T00:00:00Z",
                mimeType: "text/markdown",
              }),
            ],
          },
        ],
        children: [],
        attachments: [
          attachmentEntry({
            id: 41,
            title: "paper.md",
            filePath: "attachments/E/paper.md",
            parentId: 2001,
            parentTitle: "Parent E",
            dateAdded: "2026-01-01T00:00:00Z",
            mimeType: "text/markdown",
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
      sampledAt: "2026-03-12T00:00:00.000Z",
    };

    const filtered = await evaluateSelection(workflow, context);

    assert.lengthOf(filtered.items.attachments, 1);
    assert.equal(filtered.items.attachments[0].filePath, "attachments/E/paper.md");
  });
});

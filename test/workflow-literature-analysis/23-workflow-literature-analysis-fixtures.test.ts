import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { WORKFLOW_HOST_API_VERSION } from "../../src/workflows/workflowHostContract";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  lockSelection,
  type SelectionContext,
  type SelectionItemFact,
} from "../../src/modules/selectionContext";
import { evaluateWorkflowSelection } from "../../src/workflows/workflowInputPlanning";
import type { LoadedWorkflow } from "../../src/workflows/types";
import { LITERATURE_ANALYSIS_FIXTURE_CASES } from "./literature-analysis-fixture-cases";
import { isFullTestMode } from "./testMode";
import {
  createLiteratureAnalysisFixtureHelpers,
  workflowsPath,
} from "./workflow-test-utils";

type FixtureParent = {
  id?: number;
  key?: string;
  libraryID?: number;
  itemType?: string;
  title?: string;
  data?: Record<string, unknown>;
};

type FixtureItem = FixtureParent & {
  data?: Record<string, unknown> & {
    contentType?: string;
    dateAdded?: string;
    path?: string;
  };
};

type FixtureAttachmentEntry = {
  item?: FixtureItem;
  parent?: FixtureParent | null;
  filePath?: string;
  mimeType?: string | null;
};

type FilteredSelection = {
  items?: Array<{ kind?: string; filename?: string }>;
};

type BuiltRequest = {
  kind: string;
  targetParentRef: { libraryId: number; key: string };
  sourceAttachmentRefs?: Array<{ libraryId: number; key: string }>;
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
};

type WorkflowParameterSpec = {
  default?: string;
};

function collectParents(context: unknown) {
  const selection = context as {
    items?: {
      parents?: Array<{ item?: FixtureParent }>;
      attachments?: Array<{ parent?: FixtureParent }>;
      children?: Array<{ parent?: FixtureParent }>;
      notes?: Array<{ parent?: FixtureParent }>;
    };
  };
  const parentsById = new Map<number, FixtureParent>();
  const parents = selection.items?.parents || [];
  const attachments = selection.items?.attachments || [];
  const children = selection.items?.children || [];
  const notes = selection.items?.notes || [];

  for (const entry of parents) {
    const parent = entry.item;
    const id = parent?.id;
    if (typeof id === "number" && Number.isFinite(id)) {
      parentsById.set(id, parent);
    }
  }
  for (const entry of [...attachments, ...children, ...notes]) {
    const parent = entry.parent;
    const id = parent?.id;
    if (typeof id === "number" && Number.isFinite(id) && parent) {
      parentsById.set(id, parent);
    }
  }
  return Array.from(parentsById.values());
}

function itemRef(item: FixtureItem | FixtureParent) {
  return {
    libraryId: Number(item.libraryID),
    key: String(item.key || ""),
  };
}

function itemFact(item: FixtureItem, parent?: FixtureParent | null) {
  const ref = itemRef(item);
  const parentRef = parent ? itemRef(parent) : undefined;
  const createdAt = String(item.data?.dateAdded || "").trim();
  return {
    kind: parentRef ? (item.itemType === "note" ? "note" : "child") : "parent",
    ref,
    itemType: String(item.itemType || ""),
    ...(item.title ? { title: item.title } : {}),
    ...(parentRef ? { parentRef } : {}),
    ...(createdAt ? { createdAt } : {}),
  } satisfies SelectionItemFact;
}

function attachmentFact(entry: FixtureAttachmentEntry) {
  const item = entry.item || {};
  const parent = entry.parent || null;
  const filePath = String(entry.filePath || item.data?.path || "");
  const filename =
    filePath
      .split(/[\\/]+/)
      .filter(Boolean)
      .pop() || item.title;
  const contentType = String(
    entry.mimeType || item.data?.contentType || "",
  ).trim();
  const createdAt = String(item.data?.dateAdded || "").trim();
  return {
    kind: "attachment" as const,
    ref: itemRef(item),
    itemType: "attachment",
    ...(item.title ? { title: item.title } : {}),
    ...(parent ? { parentRef: itemRef(parent) } : {}),
    ...(filename ? { filename } : {}),
    ...(contentType ? { contentType } : {}),
    ...(createdAt ? { createdAt } : {}),
    fileState: filePath ? ("available" as const) : ("missing" as const),
  } satisfies SelectionItemFact;
}

function fixtureItems(context: unknown) {
  const selection = context as {
    items?: {
      parents?: Array<{
        item?: FixtureItem;
        attachments?: FixtureAttachmentEntry[];
      }>;
      attachments?: FixtureAttachmentEntry[];
      children?: Array<{ item?: FixtureItem; parent?: FixtureParent | null }>;
      notes?: Array<{ item?: FixtureItem; parent?: FixtureParent | null }>;
    };
  };
  return selection.items || {};
}

function canonicalFixtureSelection(context: unknown): SelectionContext {
  const items = fixtureItems(context);
  const facts: SelectionItemFact[] = [];
  for (const entry of items.parents || []) {
    if (entry.item) facts.push(itemFact(entry.item));
  }
  for (const entry of items.attachments || []) {
    if (entry.item) facts.push(attachmentFact(entry));
  }
  for (const entry of items.children || []) {
    if (entry.item) facts.push(itemFact(entry.item, entry.parent));
  }
  for (const entry of items.notes || []) {
    if (entry.item) facts.push(itemFact(entry.item, entry.parent));
  }
  const sampledAt = String(
    (context as { sampledAt?: string })?.sampledAt ||
      "2026-01-01T00:00:00.000Z",
  );
  return lockSelection(facts, sampledAt);
}

function collectFixtureAttachments(context: unknown) {
  const items = fixtureItems(context);
  return [
    ...(items.attachments || []),
    ...(items.parents || []).flatMap((entry) => entry.attachments || []),
  ];
}

function findFixtureAttachment(ref: { libraryId: number; key: string }) {
  for (const fixtureCase of LITERATURE_ANALYSIS_FIXTURE_CASES) {
    const entry = collectFixtureAttachments(fixtureCase.context).find(
      (candidate) =>
        Number(candidate.item?.libraryID) === ref.libraryId &&
        String(candidate.item?.key || "") === ref.key,
    );
    if (entry?.item) return entry;
  }
  return null;
}

function findFixtureAttachmentsForParent(ref: {
  libraryId: number;
  key: string;
}) {
  return LITERATURE_ANALYSIS_FIXTURE_CASES.flatMap((fixtureCase) =>
    collectFixtureAttachments(fixtureCase.context).filter((entry) => {
      const parent = entry.parent;
      return (
        Number(parent?.libraryID) === ref.libraryId &&
        String(parent?.key || "") === ref.key
      );
    }),
  );
}

function descriptorForFixtureAttachment(entry: FixtureAttachmentEntry) {
  const item = entry.item || {};
  const parent = entry.parent || null;
  const filePath = String(entry.filePath || item.data?.path || "");
  return {
    ref: itemRef(item),
    parentRef: parent ? itemRef(parent) : null,
    revision: "fixture",
    title: String(item.title || ""),
    filename:
      filePath
        .split(/[\\/]+/)
        .filter(Boolean)
        .pop() || String(item.title || ""),
    contentType: String(entry.mimeType || item.data?.contentType || "") || null,
    charset: null,
    url: null,
    linkMode: "linked_file",
    role: "ordinary",
    createdAt: String(item.data?.dateAdded || ""),
    file: {
      state: filePath ? "available" : "missing",
      path: filePath || null,
      sizeBytes: 0,
      modifiedAt: null,
    },
  };
}

function findFixtureParent(ref: { libraryId: number; key: string }) {
  for (const fixtureCase of LITERATURE_ANALYSIS_FIXTURE_CASES) {
    const parent = collectParents(fixtureCase.context).find(
      (candidate) =>
        candidate.libraryID === ref.libraryId && candidate.key === ref.key,
    );
    if (parent) return parent;
  }
  return null;
}

async function clearExistingNotesForFixtureParents(context: unknown) {
  for (const { id: parentId } of collectParents(context)) {
    if (typeof parentId !== "number") continue;
    const parent = Zotero.Items.get(parentId) as
      | (Zotero.Item & { getNotes?: () => number[] })
      | undefined;
    if (!parent || typeof parent.getNotes !== "function") {
      continue;
    }
    let noteIDs: number[] = [];
    try {
      noteIDs = parent.getNotes() || [];
    } catch {
      continue;
    }
    for (const noteID of noteIDs) {
      const note = Zotero.Items.get(noteID);
      if (!note || typeof note.isNote !== "function" || !note.isNote()) {
        continue;
      }
      try {
        await note.eraseTx();
      } catch {
        // Best-effort cleanup for fixture stability in real Zotero DB.
      }
    }
  }
}

const describeFixtureMatrixSuite = isFullTestMode() ? describe : describe.skip;

describeFixtureMatrixSuite(
  "workflow: literature-analysis fixture matrix",
  function () {
    let workflow: LoadedWorkflow;

    const hookRuntime = {
      handlers,
      zotero: Zotero,
      helpers: createLiteratureAnalysisFixtureHelpers(Zotero),
    };

    function createFixtureRequestRuntime() {
      const baseHostApi = createWorkflowHostApi();
      return {
        ...hookRuntime,
        hostApiVersion: WORKFLOW_HOST_API_VERSION,
        hostApi: {
          ...baseHostApi,
          library: {
            ...baseHostApi.library,
            async getItemDetail(ref: { libraryId: number; key: string }) {
              const attachment = findFixtureAttachment(ref);
              if (attachment) {
                return {
                  kind: "attachment" as const,
                  item: descriptorForFixtureAttachment(attachment),
                };
              }
              const parent = findFixtureParent(ref);
              if (!parent) return baseHostApi.library.getItemDetail(ref);
              const fields = {
                ...(parent.data || {}),
                title: parent.title || parent.data?.title || "",
              };
              return {
                kind: "regular" as const,
                item: {
                  ref,
                  itemType: parent.itemType || "journalArticle",
                  fields,
                  creators: Array.isArray(parent.data?.creators)
                    ? parent.data.creators
                    : [],
                },
              };
            },
            async getItemNotes(
              ref: { libraryId: number; key: string },
              page: { limit?: number; cursor?: string } = {},
              control?: { signal?: AbortSignal },
            ) {
              if (findFixtureParent(ref)) {
                const limit = page.limit || 25;
                return {
                  notes: [],
                  limit,
                  nextCursor: null,
                  hasMore: false,
                  returned: 0,
                  total: 0,
                };
              }
              return baseHostApi.library.getItemNotes(ref, page, control);
            },
            async getItemAttachments(
              ref: { libraryId: number; key: string },
              page: { limit?: number; cursor?: string } = {},
            ) {
              const attachments = findFixtureAttachmentsForParent(ref).map(
                descriptorForFixtureAttachment,
              );
              const limit = page.limit || 25;
              return {
                attachments,
                limit,
                nextCursor: null,
                hasMore: false,
                returned: attachments.length,
                total: attachments.length,
              };
            },
          },
          synthesis: {
            ...(baseHostApi as any).synthesis,
            async exportTagVocabularyForRegulator() {
              return {
                entries: [
                  {
                    tag: "topic:fixture",
                    facet: "topic",
                    deprecated: false,
                  },
                ],
              };
            },
          },
        },
        helpers: hookRuntime.helpers,
      };
    }

    before(async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const found = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(found, "workflow literature-analysis not found");
      workflow = found!;
      assert.equal(
        workflow.manifest.validateSelection?.select?.policy,
        "literature-source",
      );
    });

    beforeEach(async function () {
      for (const fixtureCase of LITERATURE_ANALYSIS_FIXTURE_CASES) {
        await clearExistingNotesForFixtureParents(fixtureCase.context);
      }
    });

    for (const fixtureCase of LITERATURE_ANALYSIS_FIXTURE_CASES) {
      it(`keeps validateSelection output stable for ${fixtureCase.name}`, async function () {
        const validation = await evaluateWorkflowSelection({
          workflow,
          selectionContext: canonicalFixtureSelection(fixtureCase.context),
          runtime: createFixtureRequestRuntime(),
          mode: "execute",
        });
        const filtered = validation
          .scopedSelectionContexts[0] as FilteredSelection;

        const actualPaths = (filtered.items || [])
          .filter((entry) => entry.kind === "attachment")
          .map((entry) => entry.filename || "")
          .filter(Boolean);
        assert.deepEqual(
          actualPaths,
          fixtureCase.expectedFilteredPaths.map((path) =>
            path.split(/[\\/]/).pop(),
          ),
        );
      });

      it(`keeps request generation stable for ${fixtureCase.name}`, async function () {
        const validation = await evaluateWorkflowSelection({
          workflow,
          selectionContext: canonicalFixtureSelection(fixtureCase.context),
          runtime: createFixtureRequestRuntime(),
          mode: "execute",
        });
        const expectedPathSet = new Set(
          fixtureCase.expectedFilteredPaths.map((path) =>
            path.split(/[\\/]/).pop(),
          ),
        );
        const requestSelectionContexts =
          validation.scopedSelectionContexts.filter((selectionContext) => {
            const firstPath = String(
              (selectionContext as FilteredSelection).items?.find(
                (entry) => entry.kind === "attachment",
              )?.filename || "",
            );
            return expectedPathSet.has(firstPath);
          });
        const requests = (await Promise.all(
          requestSelectionContexts.map((selectionContext) =>
            workflow.hooks.buildRequest!({
              selectionContext,
              manifest: workflow.manifest,
              executionOptions: {
                workflowParams: {
                  auto_tag_regulator: false,
                },
              },
              runtime: createFixtureRequestRuntime() as never,
            }),
          ),
        )) as BuiltRequest[];
        assert.lengthOf(requests, fixtureCase.expectedRequests.length);

        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];
          const expected = fixtureCase.expectedRequests[i];
          const languageDefault = (
            workflow.manifest.parameters?.language as WorkflowParameterSpec
          )?.default;
          const digestStep = request.steps?.find(
            (step) => step.id === "digest",
          );

          assert.equal(request.kind, "skillrunner.sequence.v1");
          assert.deepEqual(request.targetParentRef, expected.targetParentRef);
          assert.deepEqual(request.sourceAttachmentRefs, [
            expected.sourceAttachmentRef,
          ]);
          assert.equal(request.final_step_id, "digest");
          assert.isOk(digestStep, "digest sequence step should exist");
          assert.equal(digestStep?.skill_id, "literature-analysis");
          assert.equal(digestStep?.workspace, "new");
          assert.equal(digestStep?.fetch_type, "bundle");
          assert.equal(
            digestStep?.apply_result?.workflow_id,
            "literature-analysis",
          );
          assert.equal(digestStep?.apply_result?.on_failure, "continue");
          assert.equal(digestStep?.input?.source_path, expected.uploadPath);
          assert.equal(digestStep?.parameter?.language, languageDefault);
        }
      });
    }
  },
);

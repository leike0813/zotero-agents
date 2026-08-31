import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { WORKFLOW_HOST_API_VERSION } from "../../src/workflows/workflowHostContract";
import { loadWorkflowManifests } from "../../src/workflows/loader";
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

type FilteredSelection = {
  items?: { attachments?: Array<{ filePath?: string }> };
};

type BuiltRequest = {
  kind: string;
  targetParentRef: { libraryId: number; key: string };
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
            async getItemNotes(ref: { libraryId: number; key: string }) {
              if (findFixtureParent(ref)) return [];
              return baseHostApi.library.getItemNotes(ref);
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
          selectionContext: fixtureCase.context,
          runtime: hookRuntime,
          mode: "execute",
        });
        const filtered = validation
          .scopedSelectionContexts[0] as FilteredSelection;

        const actualPaths = (filtered.items?.attachments || [])
          .map((entry) => entry.filePath || "")
          .filter(Boolean);
        assert.deepEqual(actualPaths, fixtureCase.expectedFilteredPaths);
      });

      it(`keeps request generation stable for ${fixtureCase.name}`, async function () {
        const validation = await evaluateWorkflowSelection({
          workflow,
          selectionContext: fixtureCase.context,
          runtime: hookRuntime,
          mode: "execute",
        });
        const expectedPathSet = new Set(fixtureCase.expectedFilteredPaths);
        const requestSelectionContexts =
          validation.scopedSelectionContexts.filter((selectionContext) => {
            const firstPath = String(
              (selectionContext as FilteredSelection).items?.attachments?.[0]
                ?.filePath || "",
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
          const expectedParent = collectParents(fixtureCase.context).find(
            (parent) => parent.id === expected.targetParentID,
          );
          assert.deepEqual(request.targetParentRef, {
            libraryId: expectedParent?.libraryID,
            key: expectedParent?.key,
          });
          assert.deepEqual(request.sourceAttachmentPaths, [
            expected.uploadPath,
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

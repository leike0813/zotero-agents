import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { createHookHelpers } from "../../src/workflows/helpers";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { evaluateWorkflowSelection } from "../../src/workflows/workflowSelectionValidation";
import type { LoadedWorkflow } from "../../src/workflows/types";
import { LITERATURE_ANALYSIS_FIXTURE_CASES } from "./literature-analysis-fixture-cases";
import { isFullTestMode } from "./testMode";
import { workflowsPath } from "./workflow-test-utils";

type FilteredSelection = {
  items?: { attachments?: Array<{ filePath?: string }> };
};

type BuiltRequest = {
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
};

type WorkflowParameterSpec = {
  default?: string;
};

function collectParentIds(context: unknown) {
  const selection = context as {
    items?: {
      parents?: Array<{ item?: { id?: number } }>;
      attachments?: Array<{ parent?: { id?: number | null } }>;
      children?: Array<{ parent?: { id?: number | null } }>;
      notes?: Array<{ parent?: { id?: number | null } }>;
    };
  };
  const ids = new Set<number>();
  const parents = selection.items?.parents || [];
  const attachments = selection.items?.attachments || [];
  const children = selection.items?.children || [];
  const notes = selection.items?.notes || [];

  for (const entry of parents) {
    const id = entry.item?.id;
    if (typeof id === "number" && Number.isFinite(id)) {
      ids.add(id);
    }
  }
  for (const entry of attachments) {
    const id = entry.parent?.id;
    if (typeof id === "number" && Number.isFinite(id)) {
      ids.add(id);
    }
  }
  for (const entry of children) {
    const id = entry.parent?.id;
    if (typeof id === "number" && Number.isFinite(id)) {
      ids.add(id);
    }
  }
  for (const entry of notes) {
    const id = entry.parent?.id;
    if (typeof id === "number" && Number.isFinite(id)) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

async function clearExistingNotesForFixtureParents(context: unknown) {
  for (const parentId of collectParentIds(context)) {
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
      helpers: createHookHelpers(Zotero),
    };

    function createFixtureRequestRuntime() {
      const baseHostApi = createWorkflowHostApi();
      return {
        ...hookRuntime,
        hostApi: {
          ...baseHostApi,
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
        helpers: {
          ...hookRuntime.helpers,
          resolveItemRef(ref: number | string) {
            const id = Number(ref);
            return {
              id,
              key: `fixture-parent-${id}`,
              itemType: "journalArticle",
              libraryID: 1,
              getField(field: string) {
                return field === "title" ? `Fixture Parent ${id}` : "";
              },
              getCreators() {
                return [];
              },
              getTags() {
                return [];
              },
            };
          },
        },
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
          assert.equal(request.targetParentID, expected.targetParentID);
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

import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { createHookHelpers } from "../../src/workflows/helpers";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import type { LoadedWorkflow } from "../../src/workflows/types";
import {
  LITERATURE_ANALYSIS_FIXTURE_CASES,
} from "./literature-analysis-fixture-cases";
import { isFullTestMode } from "./testMode";
import { workflowsPath } from "./workflow-test-utils";

type FilteredSelection = {
  items?: { attachments?: Array<{ filePath?: string }> };
};

type BuiltRequest = {
  kind: string;
  targetParentID: number;
  skill_id?: string;
  parameter?: { language?: string };
  input?: { source_path?: string };
  upload_files?: Array<{ key: string; path: string }>;
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

describeFixtureMatrixSuite("workflow: literature-analysis fixture matrix", function () {
  let workflow: LoadedWorkflow;

  const hookRuntime = {
    handlers,
    zotero: Zotero,
    helpers: createHookHelpers(Zotero),
  };

  before(async function () {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const found = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(found, "workflow literature-analysis not found");
    workflow = found!;
    assert.isFunction(workflow.hooks.filterInputs, "filterInputs hook missing");
  });

  beforeEach(async function () {
    for (const fixtureCase of LITERATURE_DIGEST_FIXTURE_CASES) {
      await clearExistingNotesForFixtureParents(fixtureCase.context);
    }
  });

  for (const fixtureCase of LITERATURE_DIGEST_FIXTURE_CASES) {
    it(`keeps filterInputs output stable for ${fixtureCase.name}`, async function () {
      const filtered = (await workflow.hooks.filterInputs!({
        selectionContext: fixtureCase.context,
        manifest: workflow.manifest,
        runtime: hookRuntime,
      })) as FilteredSelection;

      const actualPaths = (filtered.items?.attachments || [])
        .map((entry) => entry.filePath || "")
        .filter(Boolean);
      assert.deepEqual(actualPaths, fixtureCase.expectedFilteredPaths);
    });

    it(`keeps request generation stable for ${fixtureCase.name}`, async function () {
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext: fixtureCase.context,
        runtime: hookRuntime,
      })) as BuiltRequest[];
      assert.lengthOf(requests, fixtureCase.expectedRequests.length);

      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const expected = fixtureCase.expectedRequests[i];
        const languageDefault = (workflow.manifest.parameters?.language as WorkflowParameterSpec)
          ?.default;

        assert.equal(request.kind, "skillrunner.job.v1");
        assert.equal(request.targetParentID, expected.targetParentID);
        assert.equal(request.skill_id, "literature-analysis");
        assert.equal(request.parameter?.language, languageDefault);
        assert.equal(request.upload_files?.[0].key, "source_path");
        assert.equal(request.upload_files?.[0].path, expected.uploadPath);
        assert.match(String(request.input?.source_path || ""), /^inputs\/source_path\//);
      }
    });
  }
});

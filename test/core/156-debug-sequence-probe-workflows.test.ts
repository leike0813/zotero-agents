import { assert } from "chai";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { compileDeclarativeRequest } from "../../src/workflows/declarativeRequestCompiler";
import { executeSkillRunnerSequence } from "../../src/modules/workflowExecution/sequenceRuntime";
import {
  scanPluginSkillRegistry,
} from "../../src/modules/pluginSkillRegistry";
import { buildAcpSharedSkillCatalog } from "../../src/modules/acpSharedSkillCatalog";
import { isWorkflowVisible } from "../../src/modules/workflowVisibility";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { mkTempDir } from "./workflow-test-utils";
import type { LoadedWorkflow } from "../../src/workflows/types";

const PROBE_WORKFLOW_IDS = [
  "workflow-debug-probe",
  "debug-sequence-linear-probe",
  "debug-sequence-workspace-reuse-probe",
  "debug-sequence-context-isolation-probe",
];

const PROBE_SKILL_IDS = [
  "debug-sequence-probe-emit",
  "debug-sequence-probe-check",
  "debug-sequence-probe-finalize",
];

function workflowById(workflows: LoadedWorkflow[], id: string) {
  const workflow = workflows.find((entry) => entry.manifest.id === id);
  assert.isOk(workflow, `workflow missing: ${id}`);
  return workflow!;
}

describe("debug sequence probe workflows", function () {
  afterEach(function () {
    setDebugModeOverrideForTests();
  });

  it("loads workflow-debug-probe as a debug-only package with sequence probes", async function () {
    setDebugModeOverrideForTests(true);
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const ids = loaded.workflows.map((entry) => entry.manifest.id);

    assert.includeMembers(ids, PROBE_WORKFLOW_IDS);
    for (const id of PROBE_WORKFLOW_IDS) {
      const workflow = workflowById(loaded.workflows, id);
      assert.equal(workflow.packageId, "workflow-debug-probe");
      assert.equal(workflow.manifest.debug_only, true);
      assert.equal(isWorkflowVisible(workflow), true);
    }

    setDebugModeOverrideForTests(false);
    for (const id of PROBE_WORKFLOW_IDS) {
      assert.equal(isWorkflowVisible(workflowById(loaded.workflows, id)), false);
    }
  });

  it("filters debug probe skills from registry and ACP shared catalog outside debug mode", async function () {
    setDebugModeOverrideForTests(false);
    const hiddenRegistry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    for (const id of PROBE_SKILL_IDS) {
      assert.notProperty(hiddenRegistry.entriesById, id);
    }
    assert.property(hiddenRegistry.entriesById, "tag-regulator");

    const hiddenCatalog = await buildAcpSharedSkillCatalog({
      registry: hiddenRegistry,
      catalogRootDir: await mkTempDir("debug-sequence-hidden-catalog"),
    });
    for (const id of PROBE_SKILL_IDS) {
      assert.notProperty(hiddenCatalog.entriesById, id);
    }

    setDebugModeOverrideForTests(true);
    const visibleRegistry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    for (const id of PROBE_SKILL_IDS) {
      assert.property(visibleRegistry.entriesById, id);
      assert.equal(visibleRegistry.entriesById[id].debugOnly, true);
    }

    const visibleCatalog = await buildAcpSharedSkillCatalog({
      registry: visibleRegistry,
      catalogRootDir: await mkTempDir("debug-sequence-visible-catalog"),
    });
    for (const id of PROBE_SKILL_IDS) {
      assert.property(visibleCatalog.entriesById, id);
    }
  });

  it("compiles sequence probe manifests with expected workspace and handoff contracts", async function () {
    setDebugModeOverrideForTests(true);
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });

    const linear = compileDeclarativeRequest({
      kind: "skillrunner.sequence.v1",
      selectionContext: {},
      manifest: workflowById(loaded.workflows, "debug-sequence-linear-probe")
        .manifest,
    }) as any;
    assert.equal(linear.kind, "skillrunner.sequence.v1");
    assert.deepEqual(
      linear.steps.map((step: { id: string }) => step.id),
      ["emit", "check", "finalize"],
    );
    assert.equal(linear.final_step_id, "finalize");

    const reuse = compileDeclarativeRequest({
      kind: "skillrunner.sequence.v1",
      selectionContext: {},
      manifest: workflowById(
        loaded.workflows,
        "debug-sequence-workspace-reuse-probe",
      ).manifest,
    }) as any;
    assert.deepEqual(
      reuse.steps.map((step: { workspace?: string }) => step.workspace),
      ["new", "reuse-workflow", "reuse-workflow"],
    );

    const isolated = compileDeclarativeRequest({
      kind: "skillrunner.sequence.v1",
      selectionContext: {},
      manifest: workflowById(
        loaded.workflows,
        "debug-sequence-context-isolation-probe",
      ).manifest,
    }) as any;
    assert.equal(isolated.steps[1].workspace, "new");
    assert.deepEqual(isolated.steps[1].handoff, {
      from_step: "emit-secret",
      pass_through: false,
      input: {
        public_marker: "public_marker",
      },
    });
  });

  it("does not inject default handoff when context isolation declares pass_through false", async function () {
    setDebugModeOverrideForTests(true);
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const request = compileDeclarativeRequest({
      kind: "skillrunner.sequence.v1",
      selectionContext: {},
      manifest: workflowById(
        loaded.workflows,
        "debug-sequence-context-isolation-probe",
      ).manifest,
    }) as any;
    const launched: Array<Record<string, any>> = [];

    await executeSkillRunnerSequence({
      request,
      backend: {
        id: "acp-backend",
        type: "acp",
        baseUrl: "local://acp",
        auth: { kind: "none" },
      },
      providerOptions: {},
      workflowId: "debug-sequence-context-isolation-probe",
      workflowRunId: "debug-sequence-run-1",
      jobId: "job-1",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request: stepRequest }) => {
        const launchedRequest = stepRequest as Record<string, any>;
        launched.push(launchedRequest);
        const skillId = String(launchedRequest.skill_id || "");
        if (skillId === "debug-sequence-probe-emit") {
          return {
            status: "succeeded",
            requestId: "emit-request",
            fetchType: "result",
            resultJson: {
              __SKILL_DONE__: true,
              kind: "debug_sequence_probe_result",
              probe_id: "context-isolation",
              status: "ok",
              public_marker: "isolation-public",
              secret_marker: "isolation-secret",
              checks: [],
              diagnostics: [],
            },
            responseJson: {},
          };
        }
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson: {
            __SKILL_DONE__: true,
            kind: "debug_sequence_probe_result",
            probe_id: "context-isolation",
            status: "ok",
            checks: [],
            diagnostics: [],
          },
          responseJson: {},
        };
      },
    });

    assert.lengthOf(launched, 3);
    assert.deepInclude(launched[1].input, {
      public_marker: "isolation-public",
    });
    assert.notProperty(launched[1].input, "handoff");
    assert.notProperty(launched[1].input, "secret_marker");
    assert.deepEqual(launched[1].runtime_options.workflow_workspace, {
      mode: "new",
      workflow_run_id: "debug-sequence-run-1",
    });
  });
});

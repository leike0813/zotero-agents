import { assert } from "chai";
import { readFile } from "fs/promises";
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
  "debug-host-bridge-connectivity-probe",
  "debug-sequence-linear-probe",
  "debug-sequence-workspace-reuse-probe",
  "debug-sequence-context-isolation-probe",
];

const PROBE_SKILL_IDS = [
  "debug-host-bridge-connectivity-probe",
  "debug-sequence-probe-emit",
  "debug-sequence-probe-check",
  "debug-sequence-probe-finalize",
];

function workflowById(workflows: LoadedWorkflow[], id: string) {
  const workflow = workflows.find((entry) => entry.manifest.id === id);
  assert.isOk(workflow, `workflow missing: ${id}`);
  return workflow!;
}

function assertSchemaHasNoNullType(value: unknown, path = "$") {
  if (Array.isArray(value)) {
    assert.notInclude(value, "null", `${path} must not include null type`);
    assert.notInclude(value, null, `${path} must not include null enum value`);
    value.forEach((entry, index) =>
      assertSchemaHasNoNullType(entry, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    assert.notStrictEqual(entry, "null", `${path}.${key} must not be null type`);
    assert.notStrictEqual(entry, null, `${path}.${key} must not allow null`);
    assertSchemaHasNoNullType(entry, `${path}.${key}`);
  }
}

describe("debug sequence probe workflows", function () {
  this.timeout(10000);

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

  it("ships debug probe input and parameter schemas without breaking sequence requests", async function () {
    setDebugModeOverrideForTests(true);
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });

    for (const id of [
      "debug-sequence-probe-emit",
      "debug-sequence-probe-check",
      "debug-sequence-probe-finalize",
    ]) {
      const runner = JSON.parse(
        await readFile(`skills_builtin/${id}/assets/runner.json`, "utf8"),
      );
      assert.equal(runner.schemas.parameter, "assets/parameter.schema.json");
      assert.property(registry.entriesById, id);
    }

    for (const id of [
      "debug-sequence-probe-check",
      "debug-sequence-probe-finalize",
    ]) {
      const runner = JSON.parse(
        await readFile(`skills_builtin/${id}/assets/runner.json`, "utf8"),
      );
      const inputSchema = JSON.parse(
        await readFile(`skills_builtin/${id}/assets/input.schema.json`, "utf8"),
      );
      assert.equal(runner.schemas.input, "assets/input.schema.json");
      assert.equal(
        inputSchema.properties.handoff["x-input-source"],
        "inline",
      );
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

  it("compiles Host Bridge connectivity probe as a debug-only job with required host access", async function () {
    setDebugModeOverrideForTests(true);
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = workflowById(
      loaded.workflows,
      "debug-host-bridge-connectivity-probe",
    );

    assert.equal(workflow.manifest.debug_only, true);
    assert.deepEqual(workflow.manifest.execution?.zoteroHostAccess, {
      required: true,
    });

    const request = compileDeclarativeRequest({
      kind: "skillrunner.job.v1",
      selectionContext: {},
      manifest: workflow.manifest,
    }) as any;

    assert.deepInclude(request, {
      kind: "skillrunner.job.v1",
      skill_id: "debug-host-bridge-connectivity-probe",
      skill_source: "local-package",
      fetch_type: "result",
    });
    assert.deepEqual(request.parameter, {
      probeDepth: "capability",
      expectedConnectionMode: "auto",
    });
    assert.deepEqual(request.poll, {
      interval_ms: undefined,
      timeout_ms: 120000,
    });
  });

  it("keeps Host Bridge connectivity probe output schema free of nullable fields", async function () {
    const schema = JSON.parse(
      await readFile(
        "skills_builtin/debug-host-bridge-connectivity-probe/assets/output.schema.json",
        "utf8",
      ),
    );

    assertSchemaHasNoNullType(schema);
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
    assert.deepEqual(launched[1].runtime_options.workspace, {
      mode: "new",
      workflow_run_id: "debug-sequence-run-1",
    });
    assert.notProperty(launched[1].runtime_options, "workflow_workspace");
  });
});

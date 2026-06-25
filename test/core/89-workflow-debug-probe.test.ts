import { assert } from "chai";
import { handlers } from "../../src/handlers";
import {
  __workflowDebugProbeTestOnly,
  collectWorkflowDebugProbeChecks,
} from "../../src/modules/workflowDebugProbe";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";
import { resetWorkflowHostApiForTests } from "../../src/workflows/hostApi";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { executeApplyResult } from "../../src/workflows/runtime";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { createWorkflowResultContext } from "../../src/modules/workflowExecution/resultContext";
import { workflowsPath } from "./workflow-test-utils";
import type { LoadedWorkflow } from "../../src/workflows/types";
import { applyResult as applyHostBridgeConnectivityProbeResult } from "../../workflows_builtin/workflow-debug-probe/hooks/applyHostBridgeConnectivityProbeResult.mjs";
import { applyResult as applySequenceProbeResult } from "../../workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs";

function makePassThroughWorkflow(args: {
  id: string;
  label: string;
  packageId?: string;
  debugOnly?: boolean;
  buildRequest?: LoadedWorkflow["hooks"]["buildRequest"];
  validateSelection?: LoadedWorkflow["manifest"]["validateSelection"];
}): LoadedWorkflow {
  const hooks: LoadedWorkflow["hooks"] = {
    applyResult: async () => ({ ok: true }),
  };
  if (args.buildRequest) {
    hooks.buildRequest = args.buildRequest;
  }
  return {
    manifest: {
      id: args.id,
      label: args.label,
      provider: "pass-through",
      debug_only: args.debugOnly === true,
      ...(args.validateSelection
        ? { validateSelection: args.validateSelection }
        : {}),
      hooks: {
        applyResult: "hooks/applyResult.js",
        ...(args.buildRequest ? { buildRequest: "hooks/buildRequest.js" } : {}),
      },
    },
    rootDir: `workflows/${args.id}`,
    packageId: args.packageId,
    hooks,
    buildStrategy: args.buildRequest ? "hook" : "declarative",
  };
}

class FakeElement {
  public children: FakeElement[] = [];
  public style: Record<string, string> = {};
  public attributes = new Map<string, string>();
  public textContent = "";
  public innerHTML = "";
  constructor(public readonly tagName: string) {}
  appendChild(child: FakeElement) {
    this.children.push(child);
    return child;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

class FakeDocument {
  createElementNS(_ns: string, tag: string) {
    return new FakeElement(tag);
  }
}

function flattenText(node: FakeElement): string[] {
  const values: string[] = [];
  if (node.textContent) {
    values.push(node.textContent);
  }
  for (const child of node.children) {
    values.push(...flattenText(child));
  }
  return values;
}

async function getBuiltinDebugWorkflow(workflowId: string) {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === workflowId,
  );
  assert.isOk(
    workflow,
    `expected ${workflowId}; loaded=${loaded.workflows
      .map((entry) => entry.manifest.id)
      .join(",")}`,
  );
  return workflow!;
}

describe("workflow debug probe", function () {
  beforeEach(function () {
    clearRuntimeLogs();
    setDebugModeOverrideForTests(true);
    resetRuntimeBridgeOverrideForTests();
    resetWorkflowHostApiForTests();
  });

  afterEach(function () {
    clearRuntimeLogs();
    setDebugModeOverrideForTests();
    resetRuntimeBridgeOverrideForTests();
    resetWorkflowHostApiForTests();
  });

  it("classifies enabled workflows and declarative selection failures without request preflight", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Debug Probe Parent" },
    });
    const selectionContext = await buildSelectionContext([parent]);
    const checks = await collectWorkflowDebugProbeChecks({
      selectionContext,
      workflows: [
        makePassThroughWorkflow({
          id: "ok-workflow",
          label: "OK Workflow",
          packageId: "debug-package",
        }),
        makePassThroughWorkflow({
          id: "selection-fail-workflow",
          label: "Selection Fail Workflow",
          packageId: "debug-package",
          validateSelection: {
            require: {
              counts: {
                parents: { exact: 2 },
              },
            },
          },
        }),
        makePassThroughWorkflow({
          id: "build-fail-workflow",
          label: "Build Fail Workflow",
          packageId: "debug-package",
          buildRequest: async () => {
            throw new Error("build boom");
          },
        }),
        makePassThroughWorkflow({
          id: "debug-only-hidden",
          label: "Debug Only Hidden",
          debugOnly: true,
        }),
      ],
    });

    assert.lengthOf(checks, 3);
    const ok = checks.find((entry) => entry.workflowId === "ok-workflow");
    const selectionFail = checks.find(
      (entry) => entry.workflowId === "selection-fail-workflow",
    );
    const buildFail = checks.find(
      (entry) => entry.workflowId === "build-fail-workflow",
    );

    assert.isOk(ok);
    assert.isTrue(ok!.canRun);
    assert.equal(ok!.requestCount, 1);

    assert.isOk(selectionFail);
    assert.isFalse(selectionFail!.canRun);
    assert.equal(selectionFail!.failedStage, "selection-validation");
    assert.equal(selectionFail!.disabledReason, "no valid input");

    assert.isOk(buildFail);
    assert.isTrue(buildFail!.canRun);
    assert.equal(buildFail!.executionMode, "node-native-module");
  });

  it("does not execute workflow-unit buildRequest during debug preflight", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Debug Probe Workflow Unit Parent" },
    });
    const selectionContext = await buildSelectionContext([parent]);
    const counter = { calls: 0 };
    const workflow = makePassThroughWorkflow({
      id: "workflow-unit-side-effect",
      label: "Workflow Unit Side Effect",
      packageId: "debug-package",
      buildRequest: async () => {
        counter.calls += 1;
        return {
          kind: "pass-through.run.v1",
          selectionContext: {},
        };
      },
    });
    workflow.manifest.inputs = { unit: "workflow" };

    const checks = await collectWorkflowDebugProbeChecks({
      selectionContext,
      workflows: [workflow],
    });

    assert.equal(counter.calls, 0);
    assert.lengthOf(checks, 1);
    assert.isTrue(checks[0].canRun);
    assert.equal(checks[0].requestCount, 1);
  });

  it("renders diagnostic table with required headers", function () {
    const renderer = __workflowDebugProbeTestOnly.buildProbeRenderer({
      generatedAt: new Date().toISOString(),
      debugMode: true,
      selectionSummary: {
        selectionType: "parent",
        selectedItemIds: [1],
        summary: { parentCount: 1 },
        warnings: [],
      },
      runtimeSummary: {
        builtinWorkflowsDir: "builtin",
        workflowsDir: "user",
        loadedWorkflowCount: 2,
      },
      workflowChecks: [
        {
          workflowId: "tag-regulator",
          workflowLabel: "Tag Regulator",
          packageId: "literature-workbench-package",
          workflowSource: "builtin",
          executionMode: "precompiled-host-hook",
          canRun: false,
          failedStage: "buildRequest",
          disabledReason: "prefs API unavailable",
          hostApiSummary: {},
        },
      ],
    });

    const doc = new FakeDocument() as unknown as Document;
    const root = new FakeElement("div") as unknown as HTMLElement;
    renderer.render({
      doc,
      root,
      state: {},
    } as any);

    const texts = flattenText(root as unknown as FakeElement);
    assert.include(texts, "Workflow");
    assert.include(texts, "Package");
    assert.include(texts, "Source");
    assert.include(texts, "Preflight");
    assert.include(texts, "Reason");
    assert.include(texts, "Tag Regulator");
  });

  it("records hook failure logs with message, stack and hook metadata", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Debug Probe Log Parent" },
    });
    const selectionContext = await buildSelectionContext([parent]);
    const workflow = makePassThroughWorkflow({
      id: "build-fail-log-workflow",
      label: "Build Fail Log Workflow",
      packageId: "debug-package",
      buildRequest: async () => {
        throw new Error("build log boom");
      },
    });

    let caught: unknown;
    try {
      await executeBuildRequests({
        workflow,
        selectionContext,
      });
    } catch (error) {
      caught = error;
    }
    assert.isOk(caught);

    const failedLog = listRuntimeLogs({
      order: "asc",
      workflowId: "build-fail-log-workflow",
    }).find((entry) => entry.stage === "workflow-hook-execute-failed");

    assert.isOk(failedLog);
    assert.equal(failedLog?.workflowId, "build-fail-log-workflow");
    assert.equal(failedLog?.error?.message, "build log boom");
    assert.equal((failedLog?.details as any)?.hookName, "buildRequest");
    assert.equal((failedLog?.details as any)?.packageId, "debug-package");
    assert.include(
      String((failedLog?.details as any)?.errorMessage || ""),
      "build log boom",
    );
  });

  it("reports hostApi summary for precompiled-host-hook workflows", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Debug Probe Host Scope Parent" },
    });
    const selectionContext = await buildSelectionContext([parent]);
    const checks = await collectWorkflowDebugProbeChecks({
      selectionContext,
      workflows: [
        {
          ...makePassThroughWorkflow({
            id: "bundle-host-summary",
            label: "Bundle Host Summary",
            packageId: "debug-package",
          }),
          hookExecutionMode: "precompiled-host-hook",
        },
      ],
    });

    assert.lengthOf(checks, 1);
    assert.deepInclude(checks[0].hostApiSummary || {}, {
      items: true,
      prefs: true,
      editor: true,
    });
    assert.equal(checks[0].hostApiVersion, 5);
    assert.equal(checks[0].compiledHookSource, "scan-time-precompile");
  });

  it("injects runtime addon into applyResult hook context", async function () {
    const runtime = globalThis as typeof globalThis & {
      addon?: {
        data?: {
          workflowDebugProbe?: {
            run: (args: {
              selectionContext: unknown;
              workflowId?: string;
            }) => Promise<unknown>;
          };
        };
      };
    };
    const previousAddon = runtime.addon;
    const captured: Array<{ selectionContext: unknown; workflowId?: string }> =
      [];
    runtime.addon = {
      data: {
        workflowDebugProbe: {
          run: async (args) => {
            captured.push(args);
            return { ok: true };
          },
        },
      },
    };

    const workflow: LoadedWorkflow = {
      manifest: {
        id: "workflow-debug-probe",
        label: "Workflow Debug Probe",
        provider: "pass-through",
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      },
      rootDir: "workflows/workflow-debug-probe",
      packageId: "workflow-debug-probe",
      hooks: {
        applyResult: async (args) => {
          const bridge = (args.runtime?.addon as any)?.data?.workflowDebugProbe;
          if (!bridge || typeof bridge.run !== "function") {
            throw new Error("workflow debug probe bridge is unavailable");
          }
          return bridge.run({
            selectionContext: args.runResult,
            workflowId: args.manifest?.id,
          });
        },
      },
      buildStrategy: "declarative",
      workflowSourceKind: "builtin",
    };

    try {
      const result = await executeApplyResult({
        workflow,
        parent: 1,
        bundleReader: {
          readText: async () => "",
        },
        runResult: {
          selectionType: "parent",
          items: {
            parents: [{ item: { id: 1 } }],
          },
        },
      });
      assert.deepEqual(result, { ok: true });
      assert.lengthOf(captured, 1);
      assert.equal(captured[0].workflowId, "workflow-debug-probe");
    } finally {
      runtime.addon = previousAddon;
    }
  });

  it("debug probe apply hooks consume canonical resultJson instead of responseJson envelopes", async function () {
    const hostResult = await applyHostBridgeConnectivityProbeResult({
      runResult: {
        resultJson: {
          ok: true,
          checks: [{ name: "canonical", ok: true }],
        },
        responseJson: {
          result: {
            ok: false,
            failure_code: "stale-envelope",
          },
        },
      },
    });
    assert.equal(hostResult.ok, true);
    assert.deepEqual(hostResult.checks, [{ name: "canonical", ok: true }]);

    const sequenceResult = await applySequenceProbeResult({
      runResult: {
        resultJson: {
          status: "ok",
          probe_id: "canonical-sequence",
          checks: [],
        },
        sequence: {
          workflow_run_id: "workflow-run",
        },
        responseJson: {
          result: {
            status: "failed",
            probe_id: "stale-envelope",
          },
          sequence: {
            workflow_run_id: "stale-response-sequence",
          },
        },
      },
    });
    assert.equal(sequenceResult.probeId, "canonical-sequence");
    assert.deepEqual(sequenceResult.sequence, {
      workflow_run_id: "workflow-run",
    });
  });

  it("loads debug apply contract workflows", async function () {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflowIds = new Set(
      loaded.workflows.map((entry) => entry.manifest.id),
    );
    for (const workflowId of [
      "debug-apply-manifest-bundle",
      "debug-apply-single-bundle",
      "debug-apply-single-result",
      "debug-apply-sequence-bundle",
      "debug-apply-sequence-result",
      "debug-apply-bundle-then-result",
      "debug-apply-result-then-bundle",
      "debug-interactive-choice-probe",
      "debug-interactive-then-result",
    ]) {
      assert.isTrue(workflowIds.has(workflowId), `${workflowId} should load`);
    }

    const bundleThenResult = loaded.workflows.find(
      (entry) => entry.manifest.id === "debug-apply-bundle-then-result",
    )!.manifest;
    assert.deepEqual(
      bundleThenResult.request.sequence?.steps?.map((step) => step.id),
      ["bundle", "result"],
    );
    assert.deepEqual(bundleThenResult.request.sequence?.steps?.[1].include_if, {
      kind: "parameter",
      parameter: "run_result_step",
      equals: true,
    });

    const resultThenBundle = loaded.workflows.find(
      (entry) => entry.manifest.id === "debug-apply-result-then-bundle",
    )!.manifest;
    assert.deepEqual(
      resultThenBundle.request.sequence?.steps?.map((step) => step.id),
      ["result", "bundle"],
    );
    assert.deepEqual(resultThenBundle.request.sequence?.steps?.[0].include_if, {
      kind: "parameter",
      parameter: "skip_result_step",
      equals: false,
    });
  });

  it("debug interactive choice probe builds an interactive SkillRunner request", async function () {
    const workflow = await getBuiltinDebugWorkflow(
      "debug-interactive-choice-probe",
    );
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: {
        selectionType: "empty",
        items: { parents: [], attachments: [] },
      },
    })) as Array<{
      kind: string;
      skill_id?: string;
      runtime_options?: Record<string, unknown>;
      fetch_type?: string;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].kind, "skillrunner.job.v1");
    assert.equal(requests[0].skill_id, "debug-interactive-choice-probe");
    assert.equal(requests[0].runtime_options?.execution_mode, "interactive");
    assert.equal(requests[0].fetch_type, "result");
  });

  it("debug apply buildRequest creates a unique parent and conditional sequence steps", async function () {
    const selectionContext = {
      selectionType: "empty",
      items: { parents: [], attachments: [] },
    };
    const bundleThenResult = await getBuiltinDebugWorkflow(
      "debug-apply-bundle-then-result",
    );
    const defaultRequests = (await executeBuildRequests({
      workflow: bundleThenResult,
      selectionContext,
    })) as Array<{
      kind: string;
      targetParentID: number;
      input?: Record<string, unknown>;
      parameter: { run_key?: string };
      steps: Array<{
        id: string;
        fetch_type: string;
        handoff?: Record<string, unknown>;
        input?: Record<string, unknown>;
        parameter?: Record<string, unknown>;
      }>;
    }>;
    assert.lengthOf(defaultRequests, 1);
    assert.lengthOf(defaultRequests[0].steps, 1);
    assert.deepEqual(defaultRequests[0].steps[0].input, {});
    assert.isUndefined(defaultRequests[0].steps[0].handoff);
    assert.containsAllKeys(defaultRequests[0].steps[0].parameter || {}, [
      "workflow_id",
      "step_id",
      "run_key",
    ]);
    assert.deepEqual(
      defaultRequests[0].steps.map((step) => step.fetch_type),
      ["bundle"],
    );
    const defaultParent = Zotero.Items.get(defaultRequests[0].targetParentID)!;
    assert.include(
      String(defaultParent.getField("title") || ""),
      "debug-apply-bundle-then-result",
    );
    assert.include(
      String(defaultParent.getField("title") || ""),
      String(defaultRequests[0].parameter.run_key || ""),
    );

    const enabledRequests = (await executeBuildRequests({
      workflow: bundleThenResult,
      selectionContext,
      executionOptions: {
        workflowParams: { run_result_step: true },
      },
    })) as Array<{
      steps: Array<{
        id: string;
        fetch_type: string;
        handoff?: Record<string, unknown>;
        input?: Record<string, unknown>;
      }>;
    }>;
    assert.deepEqual(
      enabledRequests[0].steps.map((step) => `${step.id}:${step.fetch_type}`),
      ["bundle:bundle", "result:result"],
    );
    assert.deepEqual(
      enabledRequests[0].steps.map((step) => step.input),
      [{}, {}],
    );
    assert.deepEqual(
      enabledRequests[0].steps.map((step) => step.handoff),
      [undefined, undefined],
    );

    const resultThenBundle = await getBuiltinDebugWorkflow(
      "debug-apply-result-then-bundle",
    );
    const skippedRequests = (await executeBuildRequests({
      workflow: resultThenBundle,
      selectionContext,
      executionOptions: {
        workflowParams: { skip_result_step: true },
      },
    })) as Array<{
      steps: Array<{ id: string; fetch_type: string; workspace: string }>;
    }>;
    assert.deepEqual(
      skippedRequests[0].steps.map(
        (step) => `${step.id}:${step.fetch_type}:${step.workspace}`,
      ),
      ["bundle:bundle:new"],
    );

    const singleBundle = await getBuiltinDebugWorkflow(
      "debug-apply-single-bundle",
    );
    const singleRequests = (await executeBuildRequests({
      workflow: singleBundle,
      selectionContext,
    })) as Array<{
      input?: Record<string, unknown>;
      parameter?: Record<string, unknown>;
    }>;
    assert.deepEqual(singleRequests[0].input, {});
    assert.containsAllKeys(singleRequests[0].parameter || {}, [
      "workflow_id",
      "step_id",
      "run_key",
    ]);

    const manifestBundle = await getBuiltinDebugWorkflow(
      "debug-apply-manifest-bundle",
    );
    const manifestRequests = (await executeBuildRequests({
      workflow: manifestBundle,
      selectionContext,
    })) as Array<{
      kind: string;
      skill_id?: string;
      fetch_type?: string;
      input?: Record<string, unknown>;
      parameter?: Record<string, unknown>;
    }>;
    assert.equal(manifestRequests[0].kind, "skillrunner.job.v1");
    assert.equal(
      manifestRequests[0].skill_id,
      "debug-apply-manifest-bundle-probe",
    );
    assert.equal(manifestRequests[0].fetch_type, "bundle");
    assert.deepEqual(manifestRequests[0].input, {});
    assert.containsAllKeys(manifestRequests[0].parameter || {}, [
      "workflow_id",
      "step_id",
      "run_key",
    ]);

    const interactiveThenResult = await getBuiltinDebugWorkflow(
      "debug-interactive-then-result",
    );
    const mixedModeRequests = (await executeBuildRequests({
      workflow: interactiveThenResult,
      selectionContext,
    })) as Array<{
      targetParentID: number;
      parameter: { run_key?: string };
      steps: Array<{
        id: string;
        skill_id: string;
        mode: string;
        fetch_type: string;
        workspace: string;
        apply_result?: Record<string, unknown>;
        input?: Record<string, unknown>;
      }>;
    }>;
    assert.lengthOf(mixedModeRequests, 1);
    assert.deepEqual(
      mixedModeRequests[0].steps.map(
        (step) =>
          `${step.id}:${step.mode}:${step.fetch_type}:${step.workspace}`,
      ),
      [
        "interactive:interactive:result:new",
        "result:auto:result:reuse-workflow",
      ],
    );
    assert.deepEqual(
      mixedModeRequests[0].steps.map((step) => step.skill_id),
      ["debug-interactive-choice-probe", "debug-apply-result-probe"],
    );
    assert.isUndefined(mixedModeRequests[0].steps[0].apply_result);
    assert.deepInclude(mixedModeRequests[0].steps[1].apply_result || {}, {
      workflow_id: "debug-interactive-then-result",
      on_failure: "fail_sequence",
    });
    assert.deepEqual(
      mixedModeRequests[0].steps.map((step) => step.input),
      [{}, {}],
    );
    const mixedModeParent = Zotero.Items.get(
      mixedModeRequests[0].targetParentID,
    )!;
    assert.include(
      String(mixedModeParent.getField("title") || ""),
      "debug-interactive-then-result",
    );
    assert.include(
      String(mixedModeParent.getField("title") || ""),
      String(mixedModeRequests[0].parameter.run_key || ""),
    );
  });

  it("debug apply hook applies canonical resultJson and ignores stale responseJson", async function () {
    const workflow = await getBuiltinDebugWorkflow("debug-apply-single-result");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "debug-apply-single-result apply-test" },
    });
    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      request: { targetParentID: parent.id },
      runResult: {
        resultJson: {
          kind: "debug_apply_contract_result",
          workflow_id: "debug-apply-single-result",
          step_id: "result",
          run_key: "abc123",
          apply_mode: "result",
          tag: "debug-result:abc123",
          message: "canonical",
        },
        responseJson: {
          result: {
            data: {
              apply_mode: "result",
              tag: "stale-response-json",
            },
          },
        },
      },
    })) as { mode: string; tags: string[] };

    assert.equal(applied.mode, "result");
    assert.include(applied.tags, "debug-result:abc123");
    const tags = parent.getTags().map((entry) => entry.tag);
    assert.include(tags, "debug-result:abc123");
    assert.notInclude(tags, "stale-response-json");
  });

  it("debug apply hook reads bundle artifacts through resultContext", async function () {
    const workflow = await getBuiltinDebugWorkflow("debug-apply-single-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "debug-apply-single-bundle apply-test" },
    });
    const resultJson = {
      kind: "debug_apply_contract_result",
      workflow_id: "debug-apply-single-bundle",
      step_id: "bundle",
      run_key: "def456",
      apply_mode: "bundle",
      artifact_path: "result/debug-apply-artifact.txt",
      message: "canonical bundle",
    };
    const bundleEntries: Record<string, string> = {
      "result/result.json": JSON.stringify(resultJson),
      "result/debug-apply-artifact.txt": "debug bundle artifact body",
    };
    const bundleReader = {
      readText: async (entryPath: string) => {
        if (Object.prototype.hasOwnProperty.call(bundleEntries, entryPath)) {
          return bundleEntries[entryPath];
        }
        throw new Error(`missing bundle entry: ${entryPath}`);
      },
    };
    const runResult = {
      status: "succeeded",
      requestId: "debug-bundle-request",
      fetchType: "bundle",
    };
    const resultContext = await createWorkflowResultContext({
      runResult,
      bundleReader,
      manifest: workflow.manifest,
    });
    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader,
      resultContext,
      request: { targetParentID: parent.id },
      runResult,
    })) as {
      mode: string;
      artifactEntryPath: string;
      artifactText: string;
      attachmentId: number;
    };

    assert.equal(applied.mode, "bundle");
    assert.equal(applied.artifactEntryPath, "result/debug-apply-artifact.txt");
    assert.equal(applied.artifactText, "debug bundle artifact body");
    assert.include(parent.getAttachments(), applied.attachmentId);
  });

  it("debug apply manifest-bundle hook reads artifacts listed by resultJson manifest path", async function () {
    const workflow = await getBuiltinDebugWorkflow(
      "debug-apply-manifest-bundle",
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "debug-apply-manifest-bundle apply-test" },
    });
    const resultJson = {
      kind: "debug_apply_contract_result",
      workflow_id: "debug-apply-manifest-bundle",
      step_id: "bundle",
      run_key: "manifest1",
      apply_mode: "bundle",
      artifact_manifest_path: "result/debug-apply-artifacts.json",
      message: "canonical manifest bundle",
    };
    assert.notProperty(resultJson, "artifact_path");
    const bundleEntries: Record<string, string> = {
      "result/result.json": JSON.stringify(resultJson),
      "result/debug-apply-artifacts.json": JSON.stringify({
        debug_apply_artifact:
          "result/manifest-artifacts/debug-apply-artifact.txt",
      }),
      "result/manifest-artifacts/debug-apply-artifact.txt":
        "debug manifest bundle artifact body",
    };
    const bundleReader = {
      readText: async (entryPath: string) => {
        if (Object.prototype.hasOwnProperty.call(bundleEntries, entryPath)) {
          return bundleEntries[entryPath];
        }
        throw new Error(`missing bundle entry: ${entryPath}`);
      },
    };
    const runResult = {
      status: "succeeded",
      requestId: "debug-manifest-bundle-request",
      fetchType: "bundle",
    };
    const resultContext = await createWorkflowResultContext({
      runResult,
      bundleReader,
      manifest: workflow.manifest,
    });
    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader,
      resultContext,
      request: { targetParentID: parent.id },
      runResult,
    })) as {
      mode: string;
      artifactEntryPath: string;
      artifactText: string;
      attachmentId: number;
    };

    assert.equal(applied.mode, "bundle");
    assert.equal(
      applied.artifactEntryPath,
      "result/manifest-artifacts/debug-apply-artifact.txt",
    );
    assert.equal(applied.artifactText, "debug manifest bundle artifact body");
    assert.include(parent.getAttachments(), applied.attachmentId);
  });

  it("debug apply bundle hook writes Windows temp attachments with native separators", async function () {
    const workflow = await getBuiltinDebugWorkflow("debug-apply-single-bundle");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "debug-apply-single-bundle windows-path-test" },
    });
    let writtenPath = "";
    let writtenText = "";
    let attachmentPath = "";
    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        readText: async () => "debug bundle artifact body",
      },
      request: { targetParentID: parent.id },
      runResult: {
        resultJson: {
          kind: "debug_apply_contract_result",
          workflow_id: "debug-apply-sequence-bundle",
          step_id: "bundle_one",
          run_key: "fzho2i",
          apply_mode: "bundle",
          artifact_path: "result/debug-apply-artifact.txt",
        },
      },
      runtime: {
        hostApi: {
          file: {
            getTempDirectoryPath: () =>
              "C:\\Users\\leike\\AppData\\Local\\Temp\\Zotero",
            writeText: async (path: string, text: string) => {
              writtenPath = path;
              writtenText = text;
            },
          },
        } as any,
        handlers: {
          ...handlers,
          attachment: {
            ...handlers.attachment,
            createFromPath: async (options: { path: string }) => {
              attachmentPath = options.path;
              return { id: 987654 };
            },
          },
        } as any,
      },
    })) as { attachmentId: number };

    assert.equal(applied.attachmentId, 987654);
    assert.equal(writtenText, "debug bundle artifact body");
    assert.equal(attachmentPath, writtenPath);
    assert.equal(
      writtenPath,
      "C:\\Users\\leike\\AppData\\Local\\Temp\\Zotero\\debug-apply-sequence-bundle-bundle_one-fzho2i.txt",
    );
    assert.notInclude(writtenPath, "Zotero/debug-apply");
  });
});

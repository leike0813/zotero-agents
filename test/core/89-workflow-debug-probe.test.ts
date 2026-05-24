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
import type { LoadedWorkflow } from "../../src/workflows/types";

function makePassThroughWorkflow(args: {
  id: string;
  label: string;
  packageId?: string;
  debugOnly?: boolean;
  filterInputs?: LoadedWorkflow["hooks"]["filterInputs"];
  buildRequest?: LoadedWorkflow["hooks"]["buildRequest"];
}): LoadedWorkflow {
  const hooks: LoadedWorkflow["hooks"] = {
    applyResult: async () => ({ ok: true }),
  };
  if (args.filterInputs) {
    hooks.filterInputs = args.filterInputs;
  }
  if (args.buildRequest) {
    hooks.buildRequest = args.buildRequest;
  }
  return {
    manifest: {
      id: args.id,
      label: args.label,
      provider: "pass-through",
      debug_only: args.debugOnly === true,
      hooks: {
        applyResult: "hooks/applyResult.js",
        ...(args.filterInputs ? { filterInputs: "hooks/filterInputs.js" } : {}),
        ...(args.buildRequest ? { buildRequest: "hooks/buildRequest.js" } : {}),
      },
    },
    rootDir: `workflows/${args.id}`,
    packageId: args.packageId,
    hooks,
    buildStrategy: args.buildRequest || args.filterInputs ? "hook" : "declarative",
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

  it("classifies enabled workflows and hook failures using real preflight execution", async function () {
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
          id: "filter-fail-workflow",
          label: "Filter Fail Workflow",
          packageId: "debug-package",
          filterInputs: async () => {
            throw new Error("filter boom");
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
    const filterFail = checks.find(
      (entry) => entry.workflowId === "filter-fail-workflow",
    );
    const buildFail = checks.find(
      (entry) => entry.workflowId === "build-fail-workflow",
    );

    assert.isOk(ok);
    assert.isTrue(ok!.canRun);
    assert.equal(ok!.requestCount, 1);

    assert.isOk(filterFail);
    assert.isFalse(filterFail!.canRun);
    assert.equal(filterFail!.failedStage, "filterInputs");
    assert.include(filterFail!.error?.message || "", "filter boom");

    assert.isOk(buildFail);
    assert.isFalse(buildFail!.canRun);
    assert.equal(buildFail!.failedStage, "buildRequest");
    assert.include(buildFail!.error?.message || "", "build boom");
    assert.equal(buildFail!.executionMode, "node-native-module");
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
          workflowId: "tag-manager",
          workflowLabel: "Tag Manager",
          packageId: "tag-vocabulary-package",
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
    assert.include(texts, "Tag Manager");
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
    assert.include(String((failedLog?.details as any)?.errorMessage || ""), "build log boom");
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
    const captured: Array<{ selectionContext: unknown; workflowId?: string }> = [];
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
});

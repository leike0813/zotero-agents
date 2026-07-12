import { assert } from "chai";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
  resetRuntimeLogAllowedLevels,
  setRuntimeLogDiagnosticMode,
} from "../../src/modules/runtimeLogManager";
import { enableWorkflowPackageDiagnosticsForDebugMode } from "../../src/modules/workflowPackageDiagnostics";
import {
  clearWorkflowRuntimeBridgeForTests,
  ensureWorkflowRuntimeBridgeInstalled,
} from "../../src/modules/workflowRuntimeBridge";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import type { LoadedWorkflow } from "../../src/workflows/types";

describe("workflow runtime scope diagnostics", function () {
  beforeEach(function () {
    installRuntimeBridgeOverrideForTests({
      addon: {
        data: {},
      } as any,
    });
    clearWorkflowRuntimeBridgeForTests();
    clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogDiagnosticMode(false);
    setDebugModeOverrideForTests(true);
    enableWorkflowPackageDiagnosticsForDebugMode();
  });

  afterEach(function () {
    clearWorkflowRuntimeBridgeForTests();
    resetRuntimeBridgeOverrideForTests();
    clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogDiagnosticMode(false);
    setDebugModeOverrideForTests();
  });

  it("records hook execution start with runtime capability summary", async function () {
    ensureWorkflowRuntimeBridgeInstalled();
    const workflow: LoadedWorkflow = {
      manifest: {
        id: "diagnostic-build-request",
        label: "Diagnostic Build Request",
        provider: "pass-through",
        hooks: {
          applyResult: "hooks/applyResult.js",
          buildRequest: "hooks/buildRequest.js",
        },
      } as any,
      rootDir: "fixtures/diagnostic-build-request",
      packageId: "diagnostic-package",
      packageRootDir: "fixtures/diagnostic-package",
      workflowSourceKind: "builtin",
      hookExecutionMode: "precompiled-host-hook",
      hooks: {
        async applyResult() {
          return { ok: true };
        },
        async buildRequest(args) {
          return {
            kind: "pass-through.run.v1",
            parentItemId: 1,
            selectionContext: args.selectionContext,
          };
        },
      },
      buildStrategy: "hook",
    };

    await executeBuildRequests({
      workflow,
      selectionContext: {
        items: {
          parents: [{ item: { id: 1, title: "Parent" } }],
        },
      },
    });

    const entry = listRuntimeLogs({
      workflowId: "diagnostic-build-request",
    }).find((item) => item.stage === "workflow-hook-execute-start");
    assert.isOk(entry, JSON.stringify(listRuntimeLogs(), null, 2));
    assert.equal(entry?.details && (entry.details as any).hook, "buildRequest");
    assert.equal(
      entry?.details && (entry.details as any).executionMode,
      "precompiled-host-hook",
    );
    assert.equal(
      entry?.details && (entry.details as any).capabilitySource,
      "host-api-facade",
    );
    assert.equal(
      entry?.details && (entry.details as any).hostApiSummary?.items,
      true,
    );
  });

  it("records hook execution failure with workflow and hook context", async function () {
    const workflow: LoadedWorkflow = {
      manifest: {
        id: "diagnostic-apply-result",
        label: "Diagnostic Apply Result",
        provider: "pass-through",
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      } as any,
      rootDir: "fixtures/diagnostic-apply-result",
      packageId: "diagnostic-package",
      packageRootDir: "fixtures/diagnostic-package",
      workflowSourceKind: "builtin",
      hookExecutionMode: "precompiled-host-hook",
      hooks: {
        async applyResult() {
          throw new Error("diagnostic apply failure");
        },
      },
      buildStrategy: "declarative",
    };

    try {
      await executeApplyResult({
        workflow,
        parent: 1,
        bundleReader: {
          async readText() {
            return "";
          },
        },
      });
      assert.fail("expected applyResult to fail");
    } catch (error) {
      assert.include(String(error), "diagnostic apply failure");
    }

    const entry = listRuntimeLogs({
      workflowId: "diagnostic-apply-result",
    }).find((item) => item.stage === "workflow-hook-execute-failed");
    assert.isOk(entry, JSON.stringify(listRuntimeLogs(), null, 2));
    assert.equal(entry?.details && (entry.details as any).hook, "applyResult");
    assert.equal(entry?.error?.message, "diagnostic apply failure");
    assert.equal(
      entry?.details && (entry.details as any).executionMode,
      "precompiled-host-hook",
    );
  });

  it("passes a normalized locale to package apply hooks", async function () {
    let locale = "";
    const workflow: LoadedWorkflow = {
      manifest: {
        id: "localized-apply-result",
        label: "Localized Apply Result",
        provider: "pass-through",
        hooks: { applyResult: "hooks/applyResult.js" },
      } as any,
      rootDir: "fixtures/localized-apply-result",
      packageId: "diagnostic-package",
      packageRootDir: "fixtures/diagnostic-package",
      workflowSourceKind: "builtin",
      hookExecutionMode: "precompiled-host-hook",
      hooks: {
        async applyResult(args) {
          locale = args.runtime.locale || "";
          return { ok: true };
        },
      },
      buildStrategy: "declarative",
    };

    await executeApplyResult({
      workflow,
      parent: 1,
      bundleReader: {
        async readText() {
          return "";
        },
      },
      runtime: { locale: "zh_cn" },
    });

    assert.equal(locale, "zh-CN");
  });
});

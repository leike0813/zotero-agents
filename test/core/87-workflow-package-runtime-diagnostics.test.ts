import { assert } from "chai";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  clearRuntimeLogs,
  getRuntimeLogDiagnosticMode,
  listRuntimeLogs,
  resetRuntimeLogAllowedLevels,
  setRuntimeLogDiagnosticMode,
} from "../../src/modules/runtimeLogManager";
import {
  emitWorkflowPackageDiagnostic,
  enableWorkflowPackageDiagnosticsForDebugMode,
} from "../../src/modules/workflowPackageDiagnostics";

describe("workflow package runtime diagnostics", function () {
  let originalZoteroDebug: unknown;
  let originalConsoleDebug: unknown;
  let originalConsoleInfo: unknown;
  let originalConsoleLog: unknown;
  let consoleCalls = 0;
  let zoteroCalls = 0;

  beforeEach(function () {
    clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogDiagnosticMode(false);
    setDebugModeOverrideForTests();
    consoleCalls = 0;
    zoteroCalls = 0;
    originalConsoleDebug = console.debug;
    originalConsoleInfo = console.info;
    originalConsoleLog = console.log;
    console.debug = (() => {
      consoleCalls += 1;
    }) as typeof console.debug;
    console.info = (() => {
      consoleCalls += 1;
    }) as typeof console.info;
    console.log = (() => {
      consoleCalls += 1;
    }) as typeof console.log;
    originalZoteroDebug = Zotero.debug;
    (Zotero as typeof Zotero & { debug: (message: string) => void }).debug = (
      _message: string,
    ) => {
      zoteroCalls += 1;
    };
  });

  afterEach(function () {
    console.debug = originalConsoleDebug as typeof console.debug;
    console.info = originalConsoleInfo as typeof console.info;
    console.log = originalConsoleLog as typeof console.log;
    (Zotero as typeof Zotero & { debug?: unknown }).debug = originalZoteroDebug;
    clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogDiagnosticMode(false);
    setDebugModeOverrideForTests();
  });

  it("stays silent when debug mode is disabled", function () {
    setDebugModeOverrideForTests(false);
    emitWorkflowPackageDiagnostic({
      stage: "workflow-package-debug-silent",
      message: "should not emit",
    });
    assert.lengthOf(listRuntimeLogs(), 0);
    assert.equal(consoleCalls, 0);
    assert.equal(zoteroCalls, 0);
  });

  it("emits runtime log and console diagnostics when debug mode is enabled", function () {
    setDebugModeOverrideForTests(true);
    enableWorkflowPackageDiagnosticsForDebugMode();

    emitWorkflowPackageDiagnostic({
      level: "debug",
      scope: "system",
      workflowId: "tag-regulator",
      packageId: "literature-workbench-package",
      hook: "applyResult",
      stage: "workflow-package-debug-test",
      message: "diagnostic message",
      filePath:
        "workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs",
      moduleSpecifier:
        "resource://zotero-skills-builtin-workflows/literature-workbench-package/tag-regulator/hooks/applyResult.mjs",
    });

    const entries = listRuntimeLogs({
      workflowId: "tag-regulator",
    });
    assert.lengthOf(entries, 1);
    assert.isOk(
      entries.find((entry) => entry.stage === "workflow-package-debug-test"),
    );
    assert.isTrue(getRuntimeLogDiagnosticMode());
    assert.isAtLeast(consoleCalls, 1);
    assert.isAtLeast(zoteroCalls, 1);
  });
});

import { assert } from "chai";
import { config } from "../../package.json";
import hooks, {
  initializeSynthesisBuiltinTagsOnStartup,
} from "../../src/hooks";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { getSkillRunnerBackendReachabilityCoordinatorRuntimeForTests } from "../../src/modules/skillRunnerBackendReachabilityCoordinator";
import {
  clearRuntimeLogs,
  getRuntimeLogDiagnosticMode,
  getRuntimeLogPersistenceStateForTests,
  listRuntimeLogs,
  resetRuntimeLogHydrationForTests,
  resetRuntimeLogAllowedLevels,
  setRuntimeLogDiagnosticMode,
} from "../../src/modules/runtimeLogManager";
import { writeRuntimeTextFile } from "../../src/modules/runtimePersistence";
import { cleanupBackgroundRuntimeForZoteroTests } from "../../src/modules/testRuntimeCleanup";
import { getDefaultSynthesisService } from "../../src/modules/synthesis/service";
import { getBuiltinStatusPolicy } from "../../src/modules/synthesis/builtinTagPolicy";

type LocalizationRequest = {
  id: string;
  args?: Record<string, unknown>;
};

class MockLocalization {
  constructor(_resources: string[], _generateBundles: boolean) {}

  formatMessagesSync(requests: LocalizationRequest[]) {
    return requests.map((request) => ({
      value: request.id,
      attributes: null,
    }));
  }
}

describe("hooks startup template cleanup", function () {
  this.timeout(30000);

  let prevAddonData: unknown;
  let prevAddonHooks: unknown;
  let usedAddonObject: Record<string, unknown> | null = null;
  let prevLocalization: unknown;

  beforeEach(function () {
    const runtime = globalThis as {
      addon?: unknown;
      Localization?: unknown;
    };
    const addonObj = ((runtime.addon as Record<string, unknown> | undefined) ||
      {}) as Record<string, unknown> & {
      data?: unknown;
      hooks?: unknown;
    };
    usedAddonObject = addonObj;
    prevAddonData = addonObj.data;
    prevAddonHooks = addonObj.hooks;
    prevLocalization = runtime.Localization;
    addonObj.data = {
      ...(addonObj.data as Record<string, unknown> | undefined),
      config,
      ztoolkit:
        (addonObj.data as { ztoolkit?: unknown } | undefined)?.ztoolkit || {},
    };
    addonObj.hooks = hooks;
    if (!runtime.addon) {
      try {
        Object.defineProperty(runtime, "addon", {
          configurable: true,
          writable: true,
          value: addonObj,
        });
      } catch {
        // ignore if runtime addon cannot be assigned in this environment
      }
    }
    runtime.Localization = MockLocalization;
  });

  afterEach(async function () {
    const runtime = globalThis as {
      addon?: unknown;
      Localization?: unknown;
    };
    if (usedAddonObject) {
      (usedAddonObject as { data?: unknown }).data = prevAddonData;
      (usedAddonObject as { hooks?: unknown }).hooks = prevAddonHooks;
    }
    runtime.Localization = prevLocalization;
    setDebugModeOverrideForTests();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogDiagnosticMode(false);
    await cleanupBackgroundRuntimeForZoteroTests();
  });

  it("emits runtime startup preflight info logs", async function () {
    await clearRuntimeLogs();

    await hooks.onStartup();

    const logs = listRuntimeLogs({
      component: "runtime-platform",
      operation: "startup-preflight",
      levels: ["info"],
    });
    const stages = new Set(logs.map((entry) => entry.stage));

    assert.includeMembers(Array.from(stages), [
      "command",
      "environment",
      "process-control",
    ]);
    for (const entry of logs) {
      assert.notInclude(JSON.stringify(entry.details || {}), "OPENAI_API_KEY");
      assert.notInclude(JSON.stringify(entry.details || {}), "PATH=");
    }
  });

  it("initializes runtime log persistence before startup log producers", async function () {
    await clearRuntimeLogs();
    resetRuntimeLogHydrationForTests();
    await writeRuntimeTextFile(
      getRuntimeLogPersistenceStateForTests().path,
      JSON.stringify({
        entries: [
          {
            id: "log-before-startup",
            ts: new Date().toISOString(),
            level: "info",
            scope: "system",
            schemaVersion: 1,
            diagnosticMode: false,
            stage: "before-startup",
            message: "hydrate before startup producers",
          },
        ],
      }),
    );

    await hooks.onStartup();

    assert.equal(
      listRuntimeLogs().find((entry) => entry.stage === "before-startup")?.id,
      "log-before-startup",
    );
  });

  it("initializes builtin status vocabulary before startup completes", async function () {
    await hooks.onStartup();

    assert.isTrue(Boolean((globalThis as any).addon?.data?.initialized));
    const snapshot = await getDefaultSynthesisService().loadTagVocabulary();
    assert.includeMembers(
      snapshot.entries.map((entry) => entry.tag),
      Object.values(getBuiltinStatusPolicy()),
    );
  });

  it("keeps startup incomplete with a structured error when builtin policy initialization fails", async function () {
    (globalThis as any).addon.data.initialized = true;
    try {
      await initializeSynthesisBuiltinTagsOnStartup({
        async initializeBuiltinTagPolicy() {
          throw new Error("synthetic repository failure");
        },
      } as any);
      assert.fail("expected startup initialization failure");
    } catch (error) {
      assert.match(String(error), /synthetic repository failure/);
    }

    assert.isFalse((globalThis as any).addon.data.initialized);
    assert.deepInclude((globalThis as any).addon.data.startupError, {
      stage: "synthesis-builtin-tag-policy",
      code: "builtin_tag_policy_initialization_failed",
      message: "synthetic repository failure",
    });
  });

  it("registers preferences pane on startup", async function () {
    const originalRegister = Zotero.PreferencePanes.register;
    const calls: Array<Record<string, unknown>> = [];
    Zotero.PreferencePanes.register = ((args: Record<string, unknown>) => {
      calls.push(args);
      return undefined as unknown as string;
    }) as typeof Zotero.PreferencePanes.register;

    try {
      await hooks.onStartup();
    } finally {
      Zotero.PreferencePanes.register = originalRegister;
    }

    assert.equal(calls.length, 1);
    assert.equal(calls[0].pluginID, config.addonID);
    assert.match(String(calls[0].src || ""), /content\/preferences\.xhtml$/);
  });

  it("starts SkillRunner backend reachability coordination on startup", async function () {
    await hooks.onStartup();

    const runtime =
      getSkillRunnerBackendReachabilityCoordinatorRuntimeForTests();
    assert.isTrue(runtime.started);
    assert.isTrue(runtime.timerActive || runtime.pendingProbeTimerCount > 0);
  });

  it("enables runtime diagnostic log mode on startup when hardcoded debug mode is on", async function () {
    setDebugModeOverrideForTests(true);
    setRuntimeLogDiagnosticMode(false);

    await hooks.onStartup();

    assert.isTrue(getRuntimeLogDiagnosticMode());
  });

  it("completes debug startup when the privileged host has no performance global", async function () {
    const performanceDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "performance",
    );
    setDebugModeOverrideForTests(true);
    setRuntimeLogDiagnosticMode(false);
    if (usedAddonObject?.data) {
      (usedAddonObject.data as { initialized?: boolean }).initialized = false;
    }
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    try {
      await hooks.onStartup();

      assert.isTrue(
        (usedAddonObject?.data as { initialized?: boolean } | undefined)
          ?.initialized,
      );
      assert.isTrue(getRuntimeLogDiagnosticMode());
    } finally {
      if (performanceDescriptor) {
        Object.defineProperty(globalThis, "performance", performanceDescriptor);
      } else {
        delete (globalThis as { performance?: unknown }).performance;
      }
    }
  });
});

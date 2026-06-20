import { assert } from "chai";
import { config } from "../../package.json";
import hooks from "../../src/hooks";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { getSkillRunnerBackendReachabilityCoordinatorRuntimeForTests } from "../../src/modules/skillRunnerBackendReachabilityCoordinator";
import {
  getRuntimeLogDiagnosticMode,
  resetRuntimeLogAllowedLevels,
  setRuntimeLogDiagnosticMode,
} from "../../src/modules/runtimeLogManager";
import { cleanupBackgroundRuntimeForZoteroTests } from "../../src/modules/testRuntimeCleanup";

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
    assert.isTrue(
      runtime.timerActive || runtime.pendingProbeTimerCount > 0,
    );
  });

  it("enables runtime diagnostic log mode on startup when hardcoded debug mode is on", async function () {
    setDebugModeOverrideForTests(true);
    setRuntimeLogDiagnosticMode(false);

    await hooks.onStartup();

    assert.isTrue(getRuntimeLogDiagnosticMode());
  });
});

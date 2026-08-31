import { assert } from "chai";
import { config } from "../../package.json";
import {
  registerSelectionSampleMenu,
  sampleSelectionContext,
} from "../../src/modules/selectionSample";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";

describe("selection sample risk regression", function () {
  let previousAddon: unknown;
  let previousGetMainWindow: unknown;
  let previousOutputDirPref: unknown;
  const prefKey = `${config.prefsPrefix}.sampleOutputDir`;

  beforeEach(function () {
    const runtime = globalThis as { addon?: Record<string, unknown> };
    previousAddon = runtime.addon;
    runtime.addon = runtime.addon || {};
    runtime.addon.data = (runtime.addon.data as Record<string, unknown>) || {};

    previousGetMainWindow = Zotero.getMainWindow;
    previousOutputDirPref = Zotero.Prefs.get(prefKey, true);
    setDebugModeOverrideForTests();
    resetRuntimeBridgeOverrideForTests();
  });

  afterEach(function () {
    const runtime = globalThis as { addon?: unknown };
    runtime.addon = previousAddon;
    Zotero.getMainWindow = previousGetMainWindow as typeof Zotero.getMainWindow;

    if (typeof previousOutputDirPref === "undefined") {
      Zotero.Prefs.clear(prefKey, true);
    } else {
      Zotero.Prefs.set(prefKey, previousOutputDirPref, true);
    }
    setDebugModeOverrideForTests();
    resetRuntimeBridgeOverrideForTests();
  });

  it("registers no selection debug menus when debug mode is disabled", function () {
    const registeredIds: string[] = [];
    installRuntimeBridgeOverrideForTests({
      ztoolkit: {
        Menu: {
          register: (
            _scope: string,
            options: {
              id: string;
            },
          ) => {
            registeredIds.push(options.id);
          },
        },
      },
    });
    setDebugModeOverrideForTests(false);

    registerSelectionSampleMenu();

    assert.lengthOf(registeredIds, 0);
  });

  it("registers selection debug menus when debug mode is enabled", function () {
    const registeredIds: string[] = [];
    installRuntimeBridgeOverrideForTests({
      ztoolkit: {
        Menu: {
          register: (
            _scope: string,
            options: {
              id: string;
            },
          ) => {
            registeredIds.push(options.id);
          },
        },
      },
    });
    setDebugModeOverrideForTests(true);

    registerSelectionSampleMenu();

    assert.sameMembers(registeredIds, [
      `${config.addonRef}-sample-selection`,
      `${config.addonRef}-validate-selection`,
    ]);
  });

  it("Risk: MR-03 alerts when sample output directory is missing", async function () {
    const alerts: string[] = [];
    Zotero.Prefs.clear(prefKey, true);
    Zotero.getMainWindow = (() =>
      ({
        alert: (message: unknown) => {
          alerts.push(String(message || ""));
        },
        ZoteroPane: {
          getSelectedItems: () => [],
        },
      }) as _ZoteroTypes.MainWindow) as typeof Zotero.getMainWindow;

    await sampleSelectionContext();

    assert.lengthOf(alerts, 1);
    assert.match(alerts[0], /sample-output-dir-missing|采样输出目录|输出目录/i);
  });
});

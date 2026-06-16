import { assert } from "chai";
import { config } from "../../package.json";
import hooks from "../../src/hooks";
import {
  ensureDefaultWorkflowDirExistsOnStartup,
  getBuiltinWorkflowDir,
  getDefaultWorkflowDir,
  getEffectiveWorkflowDir,
  getLoadedWorkflowEntries,
  getWorkflowRegistryState,
  rescanWorkflowRegistry,
} from "../../src/modules/workflowRuntime";
import { localizeWorkflowLabel } from "../../src/workflows/localization";
import { syncBuiltinWorkflowsOnStartup } from "../../src/modules/builtinWorkflowSync";
import {
  getBuiltinSkillTargetDir,
  syncBuiltinSkillsOnStartup,
} from "../../src/modules/builtinSkillSync";
import {
  existsPath,
  joinPath,
  mkTempDir,
  workflowsPath,
  writeUtf8,
} from "./workflow-test-utils";

const workflowDirPrefKey = `${config.prefsPrefix}.workflowDir`;

describe("workflow scan + registry integration", function () {
  let prevAddon: unknown;
  let prevWorkflowDirPref: unknown;
  let prevDataDirectory: unknown;
  let prevTestWorkflowDirEnv: string | undefined;
  let prevDisableWorkflowDirOverride: boolean | undefined;

  beforeEach(function () {
    const runtime = globalThis as { addon?: unknown };
    prevAddon = runtime.addon;
    runtime.addon = {
      data: {
        config,
      },
    };

    prevDataDirectory = (Zotero as unknown as { DataDirectory?: unknown })
      .DataDirectory;
    prevTestWorkflowDirEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env?.ZOTERO_TEST_WORKFLOW_DIR;
    prevDisableWorkflowDirOverride = (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride;

    prevWorkflowDirPref = Zotero.Prefs.get(workflowDirPrefKey, true);
    Zotero.Prefs.clear(workflowDirPrefKey, true);
  });

  afterEach(function () {
    if (typeof prevWorkflowDirPref === "undefined") {
      Zotero.Prefs.clear(workflowDirPrefKey, true);
    } else {
      Zotero.Prefs.set(workflowDirPrefKey, prevWorkflowDirPref, true);
    }
    const runtime = globalThis as { addon?: unknown };
    runtime.addon = prevAddon;

    const zoteroRuntime = Zotero as unknown as { DataDirectory?: unknown };
    zoteroRuntime.DataDirectory = prevDataDirectory as
      | { dir?: string }
      | undefined;

    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (processEnv) {
      if (typeof prevTestWorkflowDirEnv === "undefined") {
        delete processEnv.ZOTERO_TEST_WORKFLOW_DIR;
      } else {
        processEnv.ZOTERO_TEST_WORKFLOW_DIR = prevTestWorkflowDirEnv;
      }
    }

    (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride = prevDisableWorkflowDirOverride;
  });

  it("keeps user workflow dir default separate from built-in dir and registers literature-analysis", async function () {
    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (processEnv) {
      delete processEnv.ZOTERO_TEST_WORKFLOW_DIR;
    }
    (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride = true;

    await syncBuiltinWorkflowsOnStartup();
    await syncBuiltinSkillsOnStartup();
    const configuredDir = getDefaultWorkflowDir();
    assert.match(
      configuredDir.replace(/\\/g, "/"),
      /zotero-agents\/data\/workflows$/,
    );
    assert.equal(getEffectiveWorkflowDir(), configuredDir);
    assert.equal(Zotero.Prefs.get(workflowDirPrefKey, true), configuredDir);

    const state = await rescanWorkflowRegistry();
    const workflow = state.loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    const builtinDir = getBuiltinWorkflowDir();
    assert.match(
      builtinDir.replace(/\\/g, "/"),
      /zotero-agents\/data\/workflows_builtin$/,
    );
    assert.isTrue(
      await existsPath(
        joinPath(
          builtinDir,
          "literature-workbench-package",
          "lib",
          "referenceQualityGate.mjs",
        ),
      ),
      "literature-analysis quality gate module should be copied with builtin workflows",
    );
    assert.isTrue(
      await existsPath(
        joinPath(builtinDir, "synthesis-layer", "locales", "zh-CN.json"),
      ),
      "synthesis-layer zh-CN locale should be copied with builtin workflows",
    );
    const builtinSkillDir = getBuiltinSkillTargetDir();
    assert.isTrue(
      await existsPath(
        joinPath(
          builtinSkillDir,
          "literature-deep-reading",
          "renderer",
          "templates",
          "deep-reading.js",
        ),
      ),
      "literature-deep-reading renderer should be copied with builtin skills",
    );

    assert.equal(state.workflowsDir, configuredDir);
    assert.equal(state.builtinWorkflowsDir, builtinDir);
    assert.notEqual(state.workflowsDir, state.builtinWorkflowsDir);
    assert.isOk(
      workflow,
      `workflows=${state.loaded.workflows.map((entry) => entry.manifest.id).join(",")} warnings=${JSON.stringify(state.loaded.warnings)} errors=${JSON.stringify(state.loaded.errors)}`,
    );
    const workflowIds = state.loaded.workflows.map(
      (entry) => entry.manifest.id,
    );
    assert.notInclude(workflowIds, "reference-matching");
    assert.notInclude(workflowIds, "reference-note-editor");
    assert.equal(workflow?.manifest.label, "Literature Analysis");
    assert.equal(localizeWorkflowLabel(workflow!, "zh-CN"), "📊 文献分析");
    const expectedCoreWorkflows = new Map([
      ["literature-analysis", "📊"],
      ["tag-regulator", "🏷️"],
      ["literature-explainer", "💬"],
      ["literature-deep-reading", "📖"],
      ["literature-search-ingest", "🔎"],
      ["mineru", "📄"],
      ["create-topic-synthesis", "🧩"],
      ["update-topic-synthesis", "🔄"],
      ["manuscript-literature-framing", "🧭"],
    ]);
    for (const [workflowId, emoji] of expectedCoreWorkflows) {
      const coreWorkflow = state.loaded.workflows.find(
        (entry) => entry.manifest.id === workflowId,
      );
      assert.isOk(coreWorkflow, `missing core workflow ${workflowId}`);
      assert.isTrue(coreWorkflow?.manifest.display?.core, workflowId);
      assert.equal(coreWorkflow?.manifest.display?.emoji, emoji, workflowId);
      assert.match(
        localizeWorkflowLabel(coreWorkflow!, "zh-CN"),
        new RegExp(`^${emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s`),
        workflowId,
      );
    }
    assert.isFunction(workflow?.hooks.applyResult);
    assert.isFunction(workflow?.hooks.filterInputs);
    assert.isAtLeast(state.loaded.manifests.length, 1);
    assert.isAtLeast((state.loaded.diagnostics || []).length, 0);

    const entries = getLoadedWorkflowEntries();
    assert.isAtLeast(entries.length, 1);
    assert.isOk(
      entries.find((entry) => entry.manifest.id === "literature-analysis"),
    );
    assert.equal(getWorkflowRegistryState().workflowsDir, configuredDir);
  });

  it("creates default user workflow directory on startup path and does not fallback to built-in source directory", async function () {
    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (processEnv) {
      delete processEnv.ZOTERO_TEST_WORKFLOW_DIR;
    }

    (Zotero as unknown as { DataDirectory?: { dir?: string } }).DataDirectory =
      {
        dir: joinPath(workflowsPath(), "..", "non-existing-zotero-data"),
      };

    (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride = true;

    Zotero.Prefs.clear(workflowDirPrefKey, true);

    const expectedDefault = getDefaultWorkflowDir();
    const created = await ensureDefaultWorkflowDirExistsOnStartup();
    assert.isTrue(created || (await existsPath(expectedDefault)));
    const existedAfter = await existsPath(expectedDefault);
    assert.isTrue(
      existedAfter,
      `expected directory created: ${expectedDefault}`,
    );

    const state = await rescanWorkflowRegistry();

    assert.equal(state.workflowsDir, expectedDefault);
    assert.equal(Zotero.Prefs.get(workflowDirPrefKey, true), expectedDefault);
    assert.notEqual(state.workflowsDir, getBuiltinWorkflowDir());
    const expectedDefaultWithSlash = `${expectedDefault.replace(/\\/g, "/")}/`;
    assert.lengthOf(state.loaded.workflows, 0);
    assert.isTrue(
      state.loaded.errors.every((entry) => {
        const normalized = String(entry || "").replace(/\\/g, "/");
        return !normalized.includes(expectedDefaultWithSlash);
      }),
      `errors=${JSON.stringify(state.loaded.errors)}`,
    );
  });

  it("scans via prefs event and reports summary message", async function () {
    const alerts: string[] = [];
    const window = {
      alert: (message: string) => {
        alerts.push(message);
      },
    } as unknown as Window;

    await hooks.onPrefsEvent("scanWorkflows", { window });

    assert.lengthOf(alerts, 1);
    assert.match(
      alerts[0],
      /^Workflow scan finished: loaded=\d+, warnings=\d+, errors=\d+/,
    );

    const loadedMatch = alerts[0].match(/loaded=(\d+)/);
    assert.isOk(loadedMatch);
    assert.isAtLeast(Number(loadedMatch![1]), 1);

    const entries = getLoadedWorkflowEntries();
    assert.isOk(
      entries.find((entry) => entry.manifest.id === "literature-analysis"),
    );
  });

  it("loads tag-regulator from literature package and excludes legacy tag-manager builtin", async function () {
    await syncBuiltinWorkflowsOnStartup();
    const state = await rescanWorkflowRegistry();
    const tagManager = state.loaded.workflows.find(
      (entry) => entry.manifest.id === "tag-manager",
    );
    const tagRegulator = state.loaded.workflows.find(
      (entry) => entry.manifest.id === "tag-regulator",
    );

    assert.isUndefined(tagManager);
    assert.isOk(tagRegulator);
    assert.equal(state.workflowSourceById["tag-regulator"], "builtin");
    assert.equal(tagRegulator?.packageId, "literature-workbench-package");
  });

  it("loads package workflows with precompiled-host-hook execution mode after registry rescan", async function () {
    await syncBuiltinWorkflowsOnStartup();
    const state = await rescanWorkflowRegistry();
    const packageWorkflow = state.loaded.workflows.find(
      (entry) => entry.packageId === "literature-workbench-package",
    );
    assert.isOk(packageWorkflow);
    assert.equal(packageWorkflow?.hookExecutionMode, "precompiled-host-hook");
  });

  it("loads literature-explainer from literature-workbench-package after registry rescan", async function () {
    await syncBuiltinWorkflowsOnStartup();
    const state = await rescanWorkflowRegistry();
    const workflow = state.loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-explainer",
    );
    assert.isOk(workflow);
    assert.equal(workflow?.packageId, "literature-workbench-package");
    assert.equal(workflow?.hookExecutionMode, "precompiled-host-hook");
  });

  it("shows first error detail when scan target directory is invalid", async function () {
    const alerts: string[] = [];
    const window = {
      alert: (message: string) => {
        alerts.push(message);
      },
    } as unknown as Window;

    const invalidDir = `${getDefaultWorkflowDir()}-missing`;
    await hooks.onPrefsEvent("scanWorkflows", {
      window,
      workflowsDir: invalidDir,
    });

    assert.lengthOf(alerts, 1);
    assert.match(
      alerts[0],
      /^Workflow scan finished: loaded=\d+, warnings=\d+, errors=\d+/,
    );
    assert.include(alerts[0], "First error:");
    assert.include(alerts[0], invalidDir);
    const errorsMatch = alerts[0].match(/errors=(\d+)/);
    assert.isOk(errorsMatch);
    assert.isAtLeast(Number(errorsMatch![1]), 1);

    const state = getWorkflowRegistryState();
    assert.equal(state.workflowsDir, invalidDir);
    assert.isAtLeast(state.loaded.workflows.length, 0);
    assert.isAtLeast(state.loaded.errors.length, 1);
  });
});

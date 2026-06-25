import { assert } from "chai";
import { config } from "../../package.json";
import hooks from "../../src/hooks";
import {
  ensureDefaultWorkflowDirExistsOnStartup,
  getBuiltinWorkflowDir,
  getDefaultSkillDirForWorkflowDir,
  getDefaultWorkflowDir,
  getEffectiveWorkflowDir,
  getLoadedWorkflowEntries,
  getWorkflowRegistryState,
  rescanWorkflowRegistry,
} from "../../src/modules/workflowRuntime";
import { getOfficialSkillDir } from "../../src/modules/contentPackageSubscription";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  ensureDir,
  existsPath,
  joinPath,
  mkTempDir,
  workflowsPath,
  writeUtf8,
} from "./workflow-test-utils";

const workflowDirPrefKey = `${config.prefsPrefix}.workflowDir`;
const skillDirPrefKey = `${config.prefsPrefix}.skillDir`;

describe("workflow scan + registry integration", function () {
  let prevAddon: unknown;
  let prevWorkflowDirPref: unknown;
  let prevSkillDirPref: unknown;
  let prevDataDirectory: unknown;
  let prevTestWorkflowDirEnv: string | undefined;
  let prevContentDevRootEnv: string | undefined;
  let prevDisableWorkflowDirOverride: boolean | undefined;

  beforeEach(async function () {
    const runtime = globalThis as { addon?: unknown };
    prevAddon = runtime.addon;
    runtime.addon = {
      data: {
        config,
      },
    };

    prevDataDirectory = (Zotero as unknown as { DataDirectory?: unknown })
      .DataDirectory;
    (Zotero as unknown as { DataDirectory?: { dir?: string } }).DataDirectory =
      {
        dir: await mkTempDir("workflow-registry-data"),
      };
    prevTestWorkflowDirEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env?.ZOTERO_TEST_WORKFLOW_DIR;
    prevContentDevRootEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env?.ZOTERO_AGENTS_CONTENT_DEV_ROOT;
    prevDisableWorkflowDirOverride = (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride;

    prevWorkflowDirPref = Zotero.Prefs.get(workflowDirPrefKey, true);
    prevSkillDirPref = Zotero.Prefs.get(skillDirPrefKey, true);
    Zotero.Prefs.clear(workflowDirPrefKey, true);
    Zotero.Prefs.clear(skillDirPrefKey, true);
    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (processEnv) {
      delete processEnv.ZOTERO_TEST_WORKFLOW_DIR;
      delete processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT;
    }
  });

  afterEach(function () {
    setDebugModeOverrideForTests();
    if (typeof prevWorkflowDirPref === "undefined") {
      Zotero.Prefs.clear(workflowDirPrefKey, true);
    } else {
      Zotero.Prefs.set(workflowDirPrefKey, prevWorkflowDirPref, true);
    }
    if (typeof prevSkillDirPref === "undefined") {
      Zotero.Prefs.clear(skillDirPrefKey, true);
    } else {
      Zotero.Prefs.set(skillDirPrefKey, prevSkillDirPref, true);
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
      if (typeof prevContentDevRootEnv === "undefined") {
        delete processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT;
      } else {
        processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT = prevContentDevRootEnv;
      }
    }

    (
      globalThis as {
        __zoteroSkillsDisableWorkflowDirOverride?: boolean;
      }
    ).__zoteroSkillsDisableWorkflowDirOverride = prevDisableWorkflowDirOverride;
  });

  async function writeOfficialPackageWorkflow(args: {
    workflowId: string;
    label: string;
    packageId?: string;
    skillId?: string;
  }) {
    const packageId = args.packageId || "test-official-package";
    const packageRoot = joinPath(getBuiltinWorkflowDir(), packageId);
    await writeUtf8(
      joinPath(packageRoot, "workflow-package.json"),
      `${JSON.stringify(
        {
          id: packageId,
          version: "1.0.0",
          workflows: [`${args.workflowId}/workflow.json`],
        },
        null,
        2,
      )}\n`,
    );
    await writeUtf8(
      joinPath(packageRoot, args.workflowId, "workflow.json"),
      `${JSON.stringify(
        {
          id: args.workflowId,
          label: args.label,
          provider: args.skillId ? "skillrunner" : "pass-through",
          ...(args.skillId
            ? {
                request: {
                  kind: "skillrunner.job.v1",
                  create: {
                    skill_id: args.skillId,
                    mode: "auto",
                  },
                },
              }
            : {}),
          hooks: { applyResult: "hooks/applyResult.mjs" },
        },
        null,
        2,
      )}\n`,
    );
    await writeUtf8(
      joinPath(packageRoot, args.workflowId, "hooks", "applyResult.mjs"),
      "export async function applyResult(){ return { ok: true }; }\n",
    );
  }

  async function writeOfficialSkill(skillId: string) {
    const skillDir = joinPath(getOfficialSkillDir(), skillId);
    await writeUtf8(
      joinPath(skillDir, "SKILL.md"),
      ["---", `name: ${skillId}`, "---", "", `# ${skillId}`, ""].join("\n"),
    );
    await writeUtf8(
      joinPath(skillDir, "assets", "output.schema.json"),
      `${JSON.stringify({ type: "object" }, null, 2)}\n`,
    );
    await writeUtf8(
      joinPath(skillDir, "assets", "runner.json"),
      `${JSON.stringify(
        {
          id: skillId,
          execution_modes: ["auto"],
          schemas: { output: "assets/output.schema.json" },
        },
        null,
        2,
      )}\n`,
    );
  }

  it("keeps user workflow dir default separate from official content dir and starts empty before subscription install", async function () {
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

    const configuredDir = getDefaultWorkflowDir();
    assert.match(
      configuredDir.replace(/\\/g, "/"),
      /zotero-agents\/content\/user\/workflows$/,
    );
    assert.equal(getEffectiveWorkflowDir(), configuredDir);
    assert.equal(String(Zotero.Prefs.get(workflowDirPrefKey, true) || ""), "");

    const state = await rescanWorkflowRegistry();
    const officialDir = getBuiltinWorkflowDir();
    assert.match(
      officialDir.replace(/\\/g, "/"),
      /zotero-agents\/content\/official\/workflows$/,
    );

    assert.equal(state.workflowsDir, configuredDir);
    assert.equal(state.builtinWorkflowsDir, officialDir);
    assert.notEqual(state.workflowsDir, state.builtinWorkflowsDir);
    assert.lengthOf(state.loaded.workflows, 0);
    assert.isAtLeast(state.loaded.manifests.length, 0);

    const entries = getLoadedWorkflowEntries();
    assert.lengthOf(entries, 0);
    assert.equal(getWorkflowRegistryState().workflowsDir, configuredDir);
  });

  it("creates default user workflow and skill directories on startup path and does not fallback to built-in source directory", async function () {
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
    const expectedSkillDefault =
      getDefaultSkillDirForWorkflowDir(expectedDefault);
    const created = await ensureDefaultWorkflowDirExistsOnStartup();
    assert.isTrue(created || (await existsPath(expectedDefault)));
    const existedAfter = await existsPath(expectedDefault);
    assert.isTrue(
      existedAfter,
      `expected directory created: ${expectedDefault}`,
    );
    assert.isTrue(
      await existsPath(expectedSkillDefault),
      `expected skill directory created: ${expectedSkillDefault}`,
    );

    const state = await rescanWorkflowRegistry();

    assert.equal(state.workflowsDir, expectedDefault);
    assert.equal(String(Zotero.Prefs.get(workflowDirPrefKey, true) || ""), "");
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
    assert.isAtLeast(Number(loadedMatch![1]), 0);

    const entries = getLoadedWorkflowEntries();
    assert.isAtLeast(entries.length, 0);
  });

  it("loads official package workflows and marks their source", async function () {
    await writeOfficialPackageWorkflow({
      workflowId: "tag-regulator",
      label: "Tag Regulator",
      packageId: "literature-workbench-package",
    });
    const state = await rescanWorkflowRegistry();
    const tagRegulator = state.loaded.workflows.find(
      (entry) => entry.manifest.id === "tag-regulator",
    );

    assert.isOk(tagRegulator);
    assert.equal(state.workflowSourceById["tag-regulator"], "official");
    assert.equal(tagRegulator?.packageId, "literature-workbench-package");
  });

  it("filters skillrunner workflows whose declared skill dependency is missing or invalid", async function () {
    await writeOfficialPackageWorkflow({
      workflowId: "needs-skill",
      label: "Needs Skill",
      packageId: "skill-dependency-package",
      skillId: "declared-skill",
    });

    const missing = await rescanWorkflowRegistry();
    assert.notProperty(missing.workflowSourceById, "needs-skill");
    assert.isTrue(
      (missing.loaded.diagnostics || []).some(
        (entry) =>
          entry.category === "skill_dependency_missing" &&
          entry.workflowId === "needs-skill",
      ),
    );

    await writeOfficialSkill("declared-skill");
    const valid = await rescanWorkflowRegistry();
    assert.equal(valid.workflowSourceById["needs-skill"], "official");
  });

  it("loads package workflows with precompiled-host-hook execution mode after registry rescan", async function () {
    await writeOfficialPackageWorkflow({
      workflowId: "package-workflow",
      label: "Package Workflow",
      packageId: "literature-workbench-package",
    });
    const state = await rescanWorkflowRegistry();
    const packageWorkflow = state.loaded.workflows.find(
      (entry) => entry.packageId === "literature-workbench-package",
    );
    assert.isOk(packageWorkflow);
    assert.equal(packageWorkflow?.hookExecutionMode, "precompiled-host-hook");
  });

  it("loads literature-explainer from literature-workbench-package after registry rescan", async function () {
    await writeOfficialPackageWorkflow({
      workflowId: "literature-explainer",
      label: "Literature Explainer",
      packageId: "literature-workbench-package",
    });
    const state = await rescanWorkflowRegistry();
    const workflow = state.loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-explainer",
    );
    assert.isOk(workflow);
    assert.equal(workflow?.packageId, "literature-workbench-package");
    assert.equal(workflow?.hookExecutionMode, "precompiled-host-hook");
  });

  it("scans dev-local workflows from env root and uses debug mode only for visibility", async function () {
    const root = await mkTempDir("workflow-dev-local");
    const devRoot = joinPath(root, "dev-source");
    const devWorkflows = joinPath(devRoot, "workflows_builtin");
    const userWorkflows = joinPath(root, "user-workflows");
    const workflowId = "dev-local-debug-workflow";
    async function writeWorkflow(args: {
      rootDir: string;
      label: string;
      debugOnly?: boolean;
    }) {
      const workflowDir = joinPath(args.rootDir, workflowId);
      await writeUtf8(
        joinPath(workflowDir, "workflow.json"),
        `${JSON.stringify(
          {
            id: workflowId,
            label: args.label,
            ...(args.debugOnly ? { debug_only: true } : {}),
            provider: "pass-through",
            hooks: { applyResult: "hooks/applyResult.js" },
          },
          null,
          2,
        )}\n`,
      );
      await writeUtf8(
        joinPath(workflowDir, "hooks", "applyResult.js"),
        "export async function applyResult(){ return { ok: true }; }\n",
      );
    }

    await writeWorkflow({
      rootDir: devWorkflows,
      label: "Dev Local Debug Workflow",
      debugOnly: true,
    });
    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (processEnv) {
      processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT = devRoot;
    }

    setDebugModeOverrideForTests(false);
    const hidden = await rescanWorkflowRegistry({
      workflowsDir: userWorkflows,
    });
    assert.notProperty(hidden.workflowSourceById, workflowId);
    assert.equal(hidden.devLocalWorkflowsDir, devWorkflows);

    setDebugModeOverrideForTests(true);
    const visible = await rescanWorkflowRegistry({
      workflowsDir: userWorkflows,
    });
    assert.equal(visible.devLocalWorkflowsDir, devWorkflows);
    assert.equal(visible.workflowSourceById[workflowId], "dev-local");
    assert.equal(
      visible.loaded.workflows.find((entry) => entry.manifest.id === workflowId)
        ?.manifest.label,
      "Dev Local Debug Workflow",
    );

    await writeWorkflow({
      rootDir: userWorkflows,
      label: "User Override Workflow",
    });
    const overridden = await rescanWorkflowRegistry({
      workflowsDir: userWorkflows,
    });
    assert.equal(overridden.workflowSourceById[workflowId], "user");
    assert.equal(
      overridden.loaded.workflows.find(
        (entry) => entry.manifest.id === workflowId,
      )?.manifest.label,
      "User Override Workflow",
    );
  });

  it("keeps dev-local skills available when workflow dependency filtering runs", async function () {
    const root = await mkTempDir("workflow-dev-local-skills");
    const devRoot = joinPath(root, "dev-source");
    const devWorkflows = joinPath(devRoot, "workflows_builtin");
    const devSkills = joinPath(devRoot, "skills_builtin");
    const userWorkflows = joinPath(root, "user-workflows");
    const workflowId = "dev-local-skillrunner-workflow";
    const skillId = "dev-local-debug-skill";

    await writeUtf8(
      joinPath(devWorkflows, workflowId, "workflow.json"),
      `${JSON.stringify(
        {
          id: workflowId,
          label: "Dev Local Skillrunner Workflow",
          provider: "skillrunner",
          debug_only: true,
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: skillId,
              mode: "auto",
            },
          },
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        null,
        2,
      )}\n`,
    );
    await writeUtf8(
      joinPath(devWorkflows, workflowId, "hooks", "applyResult.js"),
      "export async function applyResult(){ return { ok: true }; }\n",
    );
    await writeUtf8(
      joinPath(devSkills, skillId, "SKILL.md"),
      ["---", `name: ${skillId}`, "---", "", `# ${skillId}`, ""].join("\n"),
    );
    await writeUtf8(
      joinPath(devSkills, skillId, "assets", "output.schema.json"),
      `${JSON.stringify({ type: "object" }, null, 2)}\n`,
    );
    await writeUtf8(
      joinPath(devSkills, skillId, "assets", "runner.json"),
      `${JSON.stringify(
        {
          id: skillId,
          debug_only: true,
          execution_modes: ["auto"],
          schemas: { output: "assets/output.schema.json" },
        },
        null,
        2,
      )}\n`,
    );

    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (processEnv) {
      processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT = devRoot;
    }

    setDebugModeOverrideForTests(true);
    const state = await rescanWorkflowRegistry({
      workflowsDir: userWorkflows,
    });

    assert.equal(state.devLocalWorkflowsDir, devWorkflows);
    assert.equal(state.workflowSourceById[workflowId], "dev-local");
    assert.isFalse(
      (state.loaded.diagnostics || []).some(
        (entry) =>
          entry.category === "skill_dependency_missing" &&
          entry.workflowId === workflowId,
      ),
    );
  });

  it("scans default dev-local content root when env root is not set", async function () {
    const devWorkflows = joinPath(
      getRuntimePersistencePaths().root,
      "content",
      "dev-local",
      "workflows",
    );
    const workflowId = "default-dev-local-workflow";
    await writeUtf8(
      joinPath(devWorkflows, workflowId, "workflow.json"),
      `${JSON.stringify(
        {
          id: workflowId,
          label: "Default Dev Local Workflow",
          provider: "pass-through",
          hooks: { applyResult: "hooks/applyResult.js" },
        },
        null,
        2,
      )}\n`,
    );
    await writeUtf8(
      joinPath(devWorkflows, workflowId, "hooks", "applyResult.js"),
      "export async function applyResult(){ return { ok: true }; }\n",
    );

    setDebugModeOverrideForTests(false);
    const state = await rescanWorkflowRegistry();

    assert.equal(state.devLocalWorkflowsDir, devWorkflows);
    assert.equal(state.workflowSourceById[workflowId], "dev-local");
  });

  it("shows first error detail when scan target directory is invalid", async function () {
    const alerts: string[] = [];
    const window = {
      alert: (message: string) => {
        alerts.push(message);
      },
    } as unknown as Window;

    const invalidDir = `${getDefaultWorkflowDir()}-missing`;
    await ensureDir(getBuiltinWorkflowDir());
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

import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "path";
import {
  buildZoteroLaunchEnv,
  patchRuntimeRootPref,
  resolveDirectRuntimeRoot,
} from "../../scripts/run-zotero-direct";
import {
  buildStartWithMockEnv,
  patchStartWithMockRuntimePrefs,
} from "../../scripts/run-zotero-start-with-mock";

describe("run-zotero-direct runtime root safety", function () {
  it("uses the configured Zotero data dir before the generic local-app-data fallback", function () {
    const env = {
      ZOTERO_PLUGIN_DATA_DIR: "D:\\Workspace\\Artifact\\Zotero-Skills\\Zotero_data",
      LOCALAPPDATA: "C:\\Users\\leike\\AppData\\Local",
    } as NodeJS.ProcessEnv;

    const runtimeRoot = resolveDirectRuntimeRoot(env);
    const launchEnv = buildZoteroLaunchEnv(env);

    assert.equal(
      runtimeRoot,
      path.resolve(
        "D:\\Workspace\\Artifact\\Zotero-Skills\\Zotero_data",
        "zotero-agents",
      ),
    );
    assert.equal(launchEnv.ZOTERO_SKILLS_RUNTIME_ROOT, runtimeRoot);
  });

  it("sets a project-external runtime root when no data dir is provided", function () {
    const env = {
      LOCALAPPDATA: "C:\\Users\\leike\\AppData\\Local",
    } as NodeJS.ProcessEnv;

    const runtimeRoot = resolveDirectRuntimeRoot(env);
    const launchEnv = buildZoteroLaunchEnv(env);

    assert.equal(
      runtimeRoot,
      path.resolve("C:\\Users\\leike\\AppData\\Local", "Zotero-Agents-Direct-Runtime"),
    );
    assert.equal(launchEnv.ZOTERO_SKILLS_RUNTIME_ROOT, runtimeRoot);
    assert.notInclude(
      runtimeRoot.replace(/\\/g, "/").toLowerCase(),
      "workspace/code/javascript/zotero-skills",
    );
  });

  it("preserves an explicitly configured runtime root", function () {
    const env = {
      ZOTERO_SKILLS_RUNTIME_ROOT: "D:\\ZoteroSkillsRuntime",
      LOCALAPPDATA: "C:\\Users\\leike\\AppData\\Local",
    } as NodeJS.ProcessEnv;

    assert.equal(resolveDirectRuntimeRoot(env), "D:\\ZoteroSkillsRuntime");
    assert.equal(
      buildZoteroLaunchEnv(env).ZOTERO_SKILLS_RUNTIME_ROOT,
      "D:\\ZoteroSkillsRuntime",
    );
  });

  it("applies the same runtime root to npm start with mock skillrunner", function () {
    const env = {
      ZOTERO_PLUGIN_DATA_DIR: "D:\\Workspace\\Artifact\\Zotero-Skills\\Zotero_data",
      LOCALAPPDATA: "C:\\Users\\leike\\AppData\\Local",
    } as NodeJS.ProcessEnv;

    assert.equal(
      buildStartWithMockEnv(env).ZOTERO_SKILLS_RUNTIME_ROOT,
      path.resolve(
        "D:\\Workspace\\Artifact\\Zotero-Skills\\Zotero_data",
        "zotero-agents",
      ),
    );
  });

  it("patches the Zotero profile pref used by plugin runtime persistence", async function () {
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), "zs-profile-"));
    const dataDir = path.join(profile, "zotero-data");
    const env = {
      ZOTERO_PLUGIN_PROFILE_PATH: profile,
      ZOTERO_PLUGIN_DATA_DIR: dataDir,
      LOCALAPPDATA: "C:\\Users\\leike\\AppData\\Local",
    } as NodeJS.ProcessEnv;
    try {
      assert.equal(patchStartWithMockRuntimePrefs(env), true);
      const prefs = await fs.readFile(path.join(profile, "prefs.js"), "utf8");
      assert.include(
        prefs,
        'user_pref("extensions.zotero.zotero-skills.runtimeRoot"',
      );
      assert.include(prefs, JSON.stringify(path.resolve(dataDir, "zotero-agents")));

      patchRuntimeRootPref(profile, {
        ...env,
        ZOTERO_SKILLS_RUNTIME_ROOT: "D:\\ExplicitRuntime",
      });
      const updated = await fs.readFile(path.join(profile, "prefs.js"), "utf8");
      assert.equal(
        updated.match(/extensions\.zotero\.zotero-skills\.runtimeRoot/g)
          ?.length,
        1,
      );
      assert.include(updated, JSON.stringify("D:\\ExplicitRuntime"));
    } finally {
      await fs.rm(profile, { recursive: true, force: true });
    }
  });
});

import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "path";
import {
  buildZoteroLaunchEnv,
  parseDirectSynthesisRuntimeLogDocument,
  patchRuntimeRootPref,
  resolveDirectRuntimeRoot,
  resolveDirectSynthesisTarget,
} from "../../scripts/run-zotero-direct";
import {
  buildStartWithMockEnv,
  patchStartWithMockRuntimePrefs,
} from "../../scripts/run-zotero-start-with-mock";
import {
  resolveNativeCrashPrivateRoot,
  selectWindowsZoteroHostProcess,
  stagePrivateZoteroCrashFixture,
} from "../../scripts/zotero-native-crash-capture";

describe("run-zotero-direct runtime root safety", function () {
  it("uses the configured Zotero data dir before the temporary fallback", function () {
    const env = {
      ZOTERO_PLUGIN_DATA_DIR:
        "D:\\Workspace\\Artifact\\Zotero-Skills\\Zotero_data",
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

  it("sets a temp-scoped runtime root when no data dir is provided", function () {
    const env = {
      LOCALAPPDATA: "C:\\Users\\leike\\AppData\\Local",
      TEMP: "D:\\Temp",
    } as NodeJS.ProcessEnv;

    const runtimeRoot = resolveDirectRuntimeRoot(env);
    const launchEnv = buildZoteroLaunchEnv(env);

    assert.equal(
      runtimeRoot,
      path.resolve("D:\\Temp", "Zotero-Agents-Direct-Runtime"),
    );
    assert.equal(launchEnv.ZOTERO_SKILLS_RUNTIME_ROOT, runtimeRoot);
    assert.notInclude(
      runtimeRoot.replace(/\\/g, "/").toLowerCase(),
      "appdata/local",
    );
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

  it("maps the host platform to the packaged Synthesis target", function () {
    assert.equal(resolveDirectSynthesisTarget("linux", "x64"), "linux-x64");
    assert.equal(resolveDirectSynthesisTarget("win32", "x64"), "win32-x64");
    assert.equal(
      resolveDirectSynthesisTarget("darwin", "arm64"),
      "darwin-arm64",
    );
    assert.throws(
      () => resolveDirectSynthesisTarget("win32", "arm64"),
      /synthesis_sidecar_direct_target_unsupported/,
    );
  });

  it("keeps native crash artifacts outside the workspace by default", function () {
    assert.equal(
      resolveNativeCrashPrivateRoot({
        LOCALAPPDATA: "C:\\Users\\person\\AppData\\Local",
      }),
      path.win32.join(
        "C:\\Users\\person\\AppData\\Local",
        "Zotero Agents",
        "crash-captures",
      ),
    );
  });

  it("selects the real Windows host by install tree and copied profile", function () {
    const selected = selectWindowsZoteroHostProcess(
      [
        {
          processId: 10,
          executablePath: "C:\\Zotero\\zotero.exe",
          commandLine: '"C:\\Zotero\\zotero.exe"',
        },
        {
          processId: 42,
          executablePath: "C:\\Zotero\\zotero.exe",
          commandLine:
            '"C:\\Zotero\\zotero.exe" -profile "D:\\Private\\profile"',
        },
        {
          processId: 43,
          executablePath: "C:\\Zotero\\zotero.exe",
          commandLine:
            '"C:\\Zotero\\zotero.exe" -foreground -profile "D:\\Private\\profile\\chrome_debugger_profile" -chrome chrome://devtools/content/framework/browser-toolbox/window.html',
        },
        {
          processId: 99,
          executablePath: "C:\\Other\\zotero.exe",
          commandLine:
            '"C:\\Other\\zotero.exe" -profile "D:\\Private\\profile"',
        },
      ],
      {
        installRoot: "C:\\Zotero",
        profileDir: "D:\\Private\\profile",
      },
    );

    assert.equal(selected?.processId, 42);
  });

  it("stages private profile and data copies without retaining profile locks", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-crash-fixture-"));
    const workspace = path.join(root, "workspace");
    const sourceProfile = path.join(root, "source-profile");
    const sourceData = path.join(root, "source-data");
    try {
      await Promise.all([
        fs.mkdir(sourceProfile, { recursive: true }),
        fs.mkdir(sourceData, { recursive: true }),
        fs.mkdir(workspace, { recursive: true }),
      ]);
      await Promise.all([
        fs.writeFile(path.join(sourceProfile, "prefs.js"), "source-profile"),
        fs.writeFile(path.join(sourceProfile, "parent.lock"), "locked"),
        fs.writeFile(path.join(sourceData, "zotero.sqlite"), "source-data"),
      ]);

      const fixture = await stagePrivateZoteroCrashFixture({
        profileSource: sourceProfile,
        dataSource: sourceData,
        privateRoot: path.join(root, "private"),
        workspaceRoot: workspace,
      });

      assert.equal(
        await fs.readFile(path.join(fixture.profileDir, "prefs.js"), "utf8"),
        "source-profile",
      );
      assert.equal(
        await fs.readFile(path.join(fixture.dataDir, "zotero.sqlite"), "utf8"),
        "source-data",
      );
      let copiedLockExists = true;
      try {
        await fs.access(path.join(fixture.profileDir, "parent.lock"));
      } catch {
        copiedLockExists = false;
      }
      assert.isFalse(copiedLockExists);
      assert.equal(
        await fs.readFile(path.join(sourceProfile, "parent.lock"), "utf8"),
        "locked",
      );
      await fixture.cleanup();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("selects only unseen Synthesis lifecycle events for terminal output", function () {
    const first = parseDirectSynthesisRuntimeLogDocument(
      JSON.stringify({
        entries: [
          {
            id: "log-1",
            ts: "2026-07-30T00:00:00.000Z",
            component: "other",
            stage: "failed",
            message: "ignored",
          },
          {
            id: "log-2",
            ts: "2026-07-30T00:00:01.000Z",
            component: "synthesis-sidecar-lifecycle",
            phase: "runtime-install",
            stage: "running",
            message: "installing",
          },
        ],
      }),
      new Set(),
    );
    assert.deepEqual(first.ids, ["log-2"]);
    assert.include(first.lines[0], "runtime-install");
    assert.include(first.lines[0], "installing");

    const second = parseDirectSynthesisRuntimeLogDocument(
      JSON.stringify({ entries: first.entries }),
      new Set(first.ids),
    );
    assert.deepEqual(second.ids, []);
    assert.deepEqual(second.lines, []);
  });

  it("applies the same runtime root to npm start with mock skillrunner", function () {
    const env = {
      ZOTERO_PLUGIN_DATA_DIR:
        "D:\\Workspace\\Artifact\\Zotero-Skills\\Zotero_data",
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
      assert.include(
        prefs,
        JSON.stringify(path.resolve(dataDir, "zotero-agents")),
      );

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

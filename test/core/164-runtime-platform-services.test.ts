import { assert } from "chai";
import {
  isAbsolutePathLike,
  isNonNativeAbsolutePath,
  joinNativePath,
  normalizeNativeLocalPath,
} from "../../src/platform/path";
import { mergePathEntries, splitPathEntries } from "../../src/platform/env";
import {
  buildNonInteractiveCommandCandidates,
  getCachedRuntimeCommand,
  getRuntimeCommandRegistrySnapshot,
  preflightRuntimeCommandsOnStartup,
  resetRuntimeCommandRegistryForTests,
  resolveRuntimeCommand,
} from "../../src/platform/command";
import {
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

describe("runtime platform services", function () {
  beforeEach(function () {
    resetRuntimeCommandRegistryForTests();
  });

  afterEach(function () {
    resetRuntimeCommandRegistryForTests();
  });

  it("preserves Windows path style when joining from a Windows root", function () {
    assert.equal(
      joinNativePath("D:\\ZoteroSkillsRuntime", "acp", "runs"),
      "D:\\ZoteroSkillsRuntime\\acp\\runs",
    );
    assert.equal(
      joinNativePath("/tmp/zotero", "acp", "runs"),
      "/tmp/zotero/acp/runs",
    );
  });

  it("normalizes Windows slash-form absolute paths independent of host OS", function () {
    assert.equal(
      normalizeNativeLocalPath("C:/Users/leike/Zotero/runtime/result.json"),
      "C:\\Users\\leike\\Zotero\\runtime\\result.json",
    );
    assert.isTrue(isAbsolutePathLike("C:\\Users\\leike\\Zotero"));
    assert.isTrue(isAbsolutePathLike("/home/leike/zotero"));
    assert.isFalse(isAbsolutePathLike("C:relative"));
  });

  it("detects Windows absolute paths as non-native outside Windows", function () {
    assert.isTrue(isNonNativeAbsolutePath("C:\\Temp\\run.json", "linux"));
    assert.isTrue(isNonNativeAbsolutePath("C:\\Temp\\run.json", "darwin"));
    assert.isFalse(isNonNativeAbsolutePath("C:\\Temp\\run.json", "win32"));
    assert.isFalse(isNonNativeAbsolutePath("/tmp/run.json", "linux"));
  });

  it("refuses to write non-native absolute runtime paths", async function () {
    if (process.platform === "win32") {
      this.skip();
    }
    const target = "C:\\zs-non-native-runtime\\file.txt";
    try {
      await writeRuntimeTextFile(target, "content");
      assert.fail("expected non-native runtime path write to fail");
    } catch (error) {
      assert.include(String((error as Error).message || error), "non-native");
    }
    assert.isFalse(await runtimePathExists(target));
  });

  it("splits and merges PATH entries using the path style of the value", function () {
    assert.deepEqual(splitPathEntries("C:\\Tools;D:\\Node"), [
      "C:\\Tools",
      "D:\\Node",
    ]);
    assert.equal(
      mergePathEntries("C:\\Tools;D:\\Node", ["D:\\Node", "E:\\Bin"]),
      "E:\\Bin;C:\\Tools;D:\\Node",
    );
    assert.deepEqual(splitPathEntries("/usr/local/bin:/usr/bin"), [
      "/usr/local/bin",
      "/usr/bin",
    ]);
  });

  it("provides non-interactive POSIX command candidates outside PATH", function () {
    assert.deepInclude(
      buildNonInteractiveCommandCandidates({
        command: "npx",
        platform: "linux",
        homeDir: "/home/leike",
      }),
      "/home/leike/.local/bin/npx",
    );
    assert.deepEqual(
      buildNonInteractiveCommandCandidates({
        command: "npx",
        platform: "win32",
        homeDir: "C:\\Users\\leike",
      }),
      [],
    );
  });

  it("resolves commands through PATH and POSIX non-interactive candidates", async function () {
    const checked: string[] = [];
    const resolved = await resolveRuntimeCommand("npx", {
      platform: "linux",
      pathValue: "/usr/bin",
      homeDir: "/home/leike",
      exists: async (candidate) => {
        checked.push(candidate);
        return candidate === "/home/leike/.local/bin/npx";
      },
    });
    assert.equal(resolved.available, true);
    assert.equal(resolved.resolvedPath, "/home/leike/.local/bin/npx");
    assert.equal(resolved.source, "posix-non-interactive");
    assert.include(checked, "/usr/bin/npx");
    assert.include(checked, "/home/leike/.local/bin/npx");
  });

  it("caches PowerShell launch specs for Windows npm command shims", async function () {
    const snapshot = await preflightRuntimeCommandsOnStartup({
      commands: ["npx"],
      platform: "win32",
      resolver: async (command) => ({
        command,
        available: true,
        resolvedPath: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
        source: "path",
        checkedCandidates: ["checked:npx"],
      }),
    });

    const launch = snapshot.commands.npx?.launch;
    assert.equal(launch?.mode, "powershell");
    assert.match(launch?.command || "", /(^|\\)(powershell|pwsh)\.exe$/i);
    assert.deepEqual(launch?.args.slice(0, 6), [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
    ]);
    assert.include(
      launch?.args[6] || "",
      "& 'C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd'",
    );
  });

  it("builds PowerShell launch specs for nvm-windows symlink npm commands", async function () {
    const resolved = await resolveRuntimeCommand("npx", {
      platform: "win32",
      pathValue: "C:\\Users\\tester\\AppData\\Roaming\\nvm;C:\\nvm4w\\nodejs",
      exists: async (candidate) => candidate === "C:\\nvm4w\\nodejs\\npx.cmd",
    });

    assert.equal(resolved.available, true);
    assert.equal(resolved.resolvedPath, "C:\\nvm4w\\nodejs\\npx.cmd");
    assert.equal(resolved.launch?.mode, "powershell");
    assert.include(
      resolved.launch?.args[6] || "",
      "& 'C:\\nvm4w\\nodejs\\npx.cmd'",
    );
  });

  it("keeps Windows executables on direct launch specs", async function () {
    const resolved = await resolveRuntimeCommand("uv", {
      platform: "win32",
      pathValue: "C:\\Users\\tester\\.local\\bin",
      exists: async (candidate) =>
        candidate === "C:\\Users\\tester\\.local\\bin\\uv.exe",
    });

    assert.equal(resolved.available, true);
    assert.equal(
      resolved.resolvedPath,
      "C:\\Users\\tester\\.local\\bin\\uv.exe",
    );
    assert.equal(resolved.launch?.mode, "direct");
    assert.equal(
      resolved.launch?.command,
      "C:\\Users\\tester\\.local\\bin\\uv.exe",
    );
    assert.deepEqual(resolved.launch?.args, []);
  });

  it("preflights startup commands once and reuses the in-memory snapshot", async function () {
    let calls = 0;
    const snapshot = await preflightRuntimeCommandsOnStartup({
      commands: ["uv", "python", "npx"],
      resolver: async (command) => {
        calls += 1;
        return {
          command,
          available: command !== "uv",
          resolvedPath: command === "uv" ? undefined : `/bin/${command}`,
          source: command === "uv" ? undefined : "path",
          checkedCandidates: [`checked:${command}`],
          diagnostic: command === "uv" ? "uv unavailable" : undefined,
        };
      },
    });

    assert.equal(calls, 3);
    assert.equal(snapshot.initialized, true);
    assert.equal(snapshot.commands.uv?.available, false);
    assert.equal(snapshot.primaryPython?.resolvedPath, "/bin/python");

    const cachedNpx = getCachedRuntimeCommand("npx");
    assert.equal(cachedNpx?.resolvedPath, "/bin/npx");
    cachedNpx!.checkedCandidates.push("mutated");
    assert.notInclude(
      getRuntimeCommandRegistrySnapshot().commands.npx?.checkedCandidates || [],
      "mutated",
    );
    assert.equal(calls, 3);
  });
});

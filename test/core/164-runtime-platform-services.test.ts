import { assert } from "chai";
import {
  isAbsolutePathLike,
  isNonNativeAbsolutePath,
  joinNativePath,
  normalizeNativeLocalPath,
} from "../../src/platform/path";
import {
  buildSubprocessEnvironment,
  mergePathEntries,
  preflightRuntimeEnvironmentOnStartup,
  resetRuntimeEnvironmentSnapshotForTests,
  seedRuntimeEnvironmentSnapshotForTests,
  splitPathEntries,
  summarizeSubprocessEnvironment,
} from "../../src/platform/env";
import {
  buildRuntimeCommandNestedArgs,
  buildPathCommandCandidates,
  buildNonInteractiveCommandCandidates,
  getCachedRuntimeCommand,
  getPreferredWindowsShellCommandsFromRegistry,
  getRuntimeCommandRegistrySnapshot,
  preflightRuntimeCommandsOnStartup,
  resetRuntimeCommandRegistryForTests,
  resolveRuntimeCommand,
  seedRuntimeCommandRegistryForTests,
} from "../../src/platform/command";
import {
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

function redefineGlobalProperty(key: string, value: unknown) {
  const runtime = globalThis as Record<string, unknown>;
  const previous = Object.getOwnPropertyDescriptor(runtime, key);
  Object.defineProperty(runtime, key, {
    value,
    writable: true,
    configurable: true,
  });
  return previous;
}

function restoreGlobalProperty(key: string, descriptor?: PropertyDescriptor) {
  const runtime = globalThis as Record<string, unknown>;
  if (!descriptor) {
    delete runtime[key];
    return;
  }
  Object.defineProperty(runtime, key, descriptor);
}

function decodeUtf16LeBase64(value: string) {
  return Buffer.from(value, "base64").toString("utf16le");
}

describe("runtime platform services", function () {
  beforeEach(function () {
    resetRuntimeCommandRegistryForTests();
    resetRuntimeEnvironmentSnapshotForTests();
  });

  afterEach(function () {
    resetRuntimeCommandRegistryForTests();
    resetRuntimeEnvironmentSnapshotForTests();
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

  it("orders Windows PATH command candidates by executable preference", function () {
    assert.deepEqual(
      buildPathCommandCandidates({
        command: "npx",
        platform: "win32",
        pathValue: "C:\\A;C:\\B",
      }).slice(0, 8),
      [
        "C:\\A\\npx.exe",
        "C:\\B\\npx.exe",
        "C:\\A\\npx.ps1",
        "C:\\B\\npx.ps1",
        "C:\\A\\npx.cmd",
        "C:\\B\\npx.cmd",
        "C:\\A\\npx.bat",
        "C:\\B\\npx.bat",
      ],
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

  it("caches cmd.exe launch specs for Windows npm command shims", async function () {
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-06-28T00:00:00.000Z",
      commands: {
        powershell: {
          command: "powershell",
          available: true,
          resolvedPath:
            "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
          source: "path",
          checkedCandidates: [],
        },
      },
    });
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
    assert.equal(launch?.mode, "cmd");
    assert.match(launch?.command || "", /(^|\\)cmd\.exe$/i);
    assert.deepEqual(launch?.args.slice(0, 3), ["/d", "/s", "/c"]);
    assert.include(
      launch?.args[3] || "",
      "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
    );
    assert.notInclude(launch?.args.join("\n") || "", "$nativeCommandLine");
  });

  it("builds cmd.exe launch specs for nvm-windows symlink npm commands", async function () {
    const resolved = await resolveRuntimeCommand("npx", {
      platform: "win32",
      pathValue: "C:\\Users\\tester\\AppData\\Roaming\\nvm;C:\\nvm4w\\nodejs",
      exists: async (candidate) => candidate === "C:\\nvm4w\\nodejs\\npx.cmd",
    });

    assert.equal(resolved.available, true);
    assert.equal(resolved.resolvedPath, "C:\\nvm4w\\nodejs\\npx.cmd");
    assert.equal(resolved.launch?.mode, "cmd");
    assert.match(resolved.launch?.command || "", /(^|\\)cmd\.exe$/i);
    assert.deepEqual(resolved.launch?.args.slice(0, 3), ["/d", "/s", "/c"]);
    assert.include(
      resolved.launch?.args[3] || "",
      "C:\\nvm4w\\nodejs\\npx.cmd",
    );
    assert.notInclude(
      resolved.launch?.args.join("\n") || "",
      "$nativeCommandLine",
    );
  });

  it("prefers Windows ps1 shims over cmd and bat candidates when exe is absent", async function () {
    const checked: string[] = [];
    const resolved = await resolveRuntimeCommand("npx", {
      platform: "win32",
      pathValue: "C:\\Tools",
      exists: async (candidate) => {
        checked.push(candidate);
        return candidate === "C:\\Tools\\npx.ps1";
      },
    });

    assert.equal(resolved.available, true);
    assert.equal(resolved.resolvedPath, "C:\\Tools\\npx.ps1");
    assert.equal(resolved.launch?.mode, "powershell");
    assert.deepEqual(checked.slice(0, 2), [
      "C:\\Tools\\npx.exe",
      "C:\\Tools\\npx.ps1",
    ]);
    assert.notInclude(checked, "C:\\Tools\\npx.cmd");
  });

  it("builds nested Windows launch args for uv-wrapped backend commands", function () {
    const ps1Nested = buildRuntimeCommandNestedArgs({
      command: "npx",
      resolvedCommand: "C:\\Program Files\\nodejs\\npx.ps1",
      commandArgs: ["codex", "acp"],
      platform: "win32",
    });
    assert.match(
      ps1Nested[0] || "",
      /(?:^|[\\/])(?:pwsh|powershell)(?:\.exe)?$/i,
    );
    assert.include(ps1Nested, "-File");
    assert.include(ps1Nested, "C:\\Program Files\\nodejs\\npx.ps1");
    assert.deepEqual(ps1Nested.slice(-2), ["codex", "acp"]);

    const cmdNested = buildRuntimeCommandNestedArgs({
      command: "npx",
      resolvedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
      commandArgs: ["codex", "acp"],
      platform: "win32",
    });
    assert.match(cmdNested[0] || "", /(?:^|[\\/])cmd(?:\.exe)?$/i);
    assert.deepEqual(cmdNested.slice(1, 4), ["/d", "/s", "/c"]);
    assert.include(cmdNested[4] || "", "C:\\Program Files\\nodejs\\npx.cmd");
    assert.include(cmdNested[4] || "", "codex");
    assert.include(cmdNested[4] || "", "acp");

    const bareNested = buildRuntimeCommandNestedArgs({
      command: "npx",
      commandArgs: ["codex", "acp"],
      platform: "win32",
    });
    assert.match(
      bareNested[0] || "",
      /(?:^|[\\/])(?:pwsh|powershell)(?:\.exe)?$/i,
    );
    assert.include(bareNested, "-Command");
    assert.include(bareNested.at(-1) || "", "'npx'");
    assert.include(bareNested.at(-1) || "", "'codex'");
    assert.include(bareNested.at(-1) || "", "'acp'");
  });

  it("promotes resolved Windows shims to verified sibling executables", async function () {
    const checked: string[] = [];
    const resolved = await resolveRuntimeCommand("agent", {
      platform: "win32",
      pathSearch: async () => "C:\\Tools\\agent.cmd",
      exists: async (candidate) => {
        checked.push(candidate);
        return candidate === "C:\\Tools\\agent.exe";
      },
    });

    assert.equal(resolved.available, true);
    assert.equal(resolved.resolvedPath, "C:\\Tools\\agent.exe");
    assert.equal(resolved.launch?.mode, "direct");
    assert.include(
      resolved.checkedCandidates,
      "windows-shim-exe:C:\\Tools\\agent.cmd->C:\\Tools\\agent.exe",
    );
    assert.include(checked, "C:\\Tools\\agent.exe");
  });

  it("parses direct executable references from Windows ps1 shims", async function () {
    const resolved = await resolveRuntimeCommand("C:\\Tools\\agent.ps1", {
      platform: "win32",
      exists: async (candidate) =>
        candidate === "C:\\Tools\\agent.ps1" ||
        candidate === "C:\\Tools\\agent-core.exe",
      readText: async () => '& "$PSScriptRoot/agent-core.exe" $args',
    });

    assert.equal(resolved.available, true);
    assert.equal(resolved.resolvedPath, "C:\\Tools\\agent-core.exe");
    assert.equal(resolved.launch?.mode, "direct");
    assert.include(
      resolved.checkedCandidates,
      "windows-shim-exe:C:\\Tools\\agent.ps1->C:\\Tools\\agent-core.exe",
    );
  });

  it("keeps Windows shims when parsed executable targets do not exist", async function () {
    const resolved = await resolveRuntimeCommand("C:\\Tools\\agent.cmd", {
      platform: "win32",
      exists: async (candidate) => candidate === "C:\\Tools\\agent.cmd",
      readText: async () => '"%~dp0\\agent-core.exe" %*',
    });

    assert.equal(resolved.available, true);
    assert.equal(resolved.resolvedPath, "C:\\Tools\\agent.cmd");
    assert.equal(resolved.launch?.mode, "cmd");
    assert.notInclude(resolved.checkedCandidates.join("\n"), "agent-core.exe");
  });

  it("builds PowerShell -File launch specs for Windows ps1 commands", async function () {
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-06-28T00:00:00.000Z",
      commands: {
        powershell: {
          command: "powershell",
          available: true,
          resolvedPath:
            "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
          source: "path",
          checkedCandidates: [],
        },
      },
    });
    const resolved = await resolveRuntimeCommand("agent.ps1", {
      platform: "win32",
      pathValue: "C:\\Tools\\Agent",
      exists: async (candidate) => candidate === "C:\\Tools\\Agent\\agent.ps1",
    });

    assert.equal(resolved.available, true);
    assert.equal(resolved.resolvedPath, "C:\\Tools\\Agent\\agent.ps1");
    assert.equal(resolved.launch?.mode, "powershell");
    assert.match(resolved.launch?.command || "", /(^|\\)powershell\.exe$/i);
    assert.deepEqual(resolved.launch?.args.slice(0, 6), [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
    ]);
    assert.equal(resolved.launch?.args[6], "C:\\Tools\\Agent\\agent.ps1");
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

  it("includes PowerShell commands in the startup command preflight", async function () {
    const snapshot = await preflightRuntimeCommandsOnStartup({
      platform: "win32",
      resolver: async (command) => ({
        command,
        available: command !== "pwsh",
        resolvedPath:
          command === "powershell"
            ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
            : command === "pwsh"
              ? undefined
              : `C:\\Tools\\${command}.exe`,
        source: command === "pwsh" ? undefined : "path",
        checkedCandidates: [`checked:${command}`],
      }),
    });

    assert.equal(snapshot.commands.powershell?.available, true);
    assert.equal(
      snapshot.commands.powershell?.resolvedPath,
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    );
    assert.equal(snapshot.commands.pwsh?.available, false);
  });

  it("prefers pwsh over Windows PowerShell from the command registry", function () {
    const commands = getPreferredWindowsShellCommandsFromRegistry({
      initialized: true,
      initializedAt: "2026-06-28T00:00:00.000Z",
      commands: {
        powershell: {
          command: "powershell",
          available: true,
          resolvedPath:
            "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
          source: "path",
          checkedCandidates: [],
        },
        pwsh: {
          command: "pwsh",
          available: true,
          resolvedPath: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
          source: "path",
          checkedCandidates: [],
        },
      },
    });

    assert.deepEqual(commands, [
      "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ]);
  });

  it("hydrates Windows subprocess PATH from the login environment", async function () {
    const snapshot = await preflightRuntimeEnvironmentOnStartup({
      platform: "win32",
      currentEnv: {
        Path: "C:\\Program Files\\Zotero;C:\\Windows\\System32",
        USERPROFILE: "C:\\Users\\tester",
      },
      powershellRunner: async () =>
        JSON.stringify({
          Machine: {
            Path: "C:\\Windows\\System32;C:\\Program Files\\nodejs",
          },
          User: {
            Path: "C:\\Users\\tester\\AppData\\Roaming\\npm",
            OPENAI_API_KEY: "secret",
          },
        }),
      now: () => "2026-06-28T00:00:00.000Z",
    });

    const env = buildSubprocessEnvironment();

    assert.equal(snapshot.source, "windows-login");
    assert.equal(env.HOME, "C:\\Users\\tester");
    const pathEntries = splitPathEntries(env.Path);
    assert.include(pathEntries, "C:\\Program Files\\Zotero");
    assert.include(pathEntries, "C:\\Windows\\System32");
    assert.include(pathEntries, "C:\\Program Files\\nodejs");
    assert.include(pathEntries, "C:\\Users\\tester\\AppData\\Roaming\\npm");
    assert.equal(env.OPENAI_API_KEY, "secret");
  });

  it("keeps existing Windows HOME above synthesized user profile home", async function () {
    await preflightRuntimeEnvironmentOnStartup({
      platform: "win32",
      currentEnv: {
        Path: "C:\\Program Files\\Zotero",
        HOME: "D:\\ShellHome",
        USERPROFILE: "C:\\Users\\tester",
      },
      powershellRunner: async () =>
        JSON.stringify({
          Machine: { Path: "C:\\Program Files\\nodejs" },
          User: { Path: "C:\\Users\\tester\\AppData\\Roaming\\npm" },
        }),
    });

    const env = buildSubprocessEnvironment();

    assert.equal(env.HOME, "D:\\ShellHome");
  });

  it("uses preflight-resolved PowerShell command for Windows login env", async function () {
    const calls: string[] = [];
    const snapshot = await preflightRuntimeEnvironmentOnStartup({
      platform: "win32",
      currentEnv: {
        Path: "C:\\Program Files\\Zotero",
      },
      powershellCommands: [
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ],
      powershellRunner: async (command) => {
        calls.push(command);
        return JSON.stringify({
          Machine: { Path: "C:\\Program Files\\nodejs" },
          User: { Path: "C:\\Users\\tester\\AppData\\Roaming\\npm" },
        });
      },
    });

    assert.equal(snapshot.source, "windows-login");
    assert.deepEqual(calls, [
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ]);
  });

  it("tries only preflight-resolved shell commands for Windows login env", async function () {
    const calls: string[] = [];
    const snapshot = await preflightRuntimeEnvironmentOnStartup({
      platform: "win32",
      currentEnv: {
        Path: "C:\\Program Files\\Zotero",
      },
      powershellCommands: [
        "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ],
      powershellRunner: async (command) => {
        calls.push(command);
        if (/pwsh\.exe$/i.test(command)) {
          throw new Error("pwsh failed");
        }
        return JSON.stringify({
          Machine: { Path: "C:\\Program Files\\nodejs" },
          User: { Path: "C:\\Users\\tester\\AppData\\Roaming\\npm" },
        });
      },
    });

    assert.equal(snapshot.source, "windows-login");
    assert.deepEqual(calls, [
      "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ]);
  });

  it("does not enumerate fallback PowerShell candidates after a resolved command fails", async function () {
    const calls: string[] = [];
    const snapshot = await preflightRuntimeEnvironmentOnStartup({
      platform: "win32",
      currentEnv: {
        Path: "C:\\Program Files\\Zotero",
      },
      powershellCommands: [
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ],
      powershellRunner: async (command) => {
        calls.push(command);
        throw new Error("resolved shell failed");
      },
    });

    assert.equal(snapshot.source, "fallback");
    assert.include(snapshot.error || "", "resolved shell failed");
    assert.deepEqual(calls, [
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ]);
  });

  it("keeps sanitized stdout and stderr diagnostics when Windows login env preflight fails", async function () {
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          call: async () => {
            let stdoutRead = false;
            let stderrRead = false;
            return {
              stdout: {
                readString: async () => {
                  if (stdoutRead) {
                    return "";
                  }
                  stdoutRead = true;
                  return JSON.stringify({
                    OPENAI_API_KEY: "secret-value",
                    note: "partial output",
                  });
                },
              },
              stderr: {
                readString: async () => {
                  if (stderrRead) {
                    return "";
                  }
                  stderrRead = true;
                  return "failure ANTHROPIC_API_KEY=secret-token";
                },
              },
              wait: async () => 1,
            };
          },
        },
      }),
    });

    try {
      const snapshot = await preflightRuntimeEnvironmentOnStartup({
        platform: "win32",
        currentEnv: {
          Path: "C:\\Program Files\\Zotero",
        },
        powershellCommands: [
          "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        ],
      });
      const diagnostic = snapshot.diagnostics?.[0];

      assert.equal(snapshot.source, "fallback");
      assert.equal(diagnostic?.ok, false);
      assert.equal(diagnostic?.exitCode, 1);
      assert.include(diagnostic?.stdoutTail || "", "partial output");
      assert.include(diagnostic?.stderrTail || "", "failure");
      assert.notInclude(JSON.stringify(diagnostic), "secret-value");
      assert.notInclude(JSON.stringify(diagnostic), "secret-token");
      assert.include(JSON.stringify(diagnostic), "<redacted>");
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("keeps explicit subprocess environment overrides above hydrated values", async function () {
    await preflightRuntimeEnvironmentOnStartup({
      platform: "win32",
      currentEnv: {
        Path: "C:\\Program Files\\Zotero",
      },
      powershellRunner: async () =>
        JSON.stringify({
          Machine: { Path: "C:\\Program Files\\nodejs" },
          User: {
            Path: "C:\\Users\\tester\\AppData\\Roaming\\npm",
            CODEX_HOME: "C:\\Users\\tester\\.codex",
          },
        }),
    });

    const env = buildSubprocessEnvironment({
      Path: "D:\\CustomBin",
      CODEX_HOME: "D:\\CustomCodex",
    });

    assert.equal(env.Path, "D:\\CustomBin");
    assert.equal(env.CODEX_HOME, "D:\\CustomCodex");
  });

  it("falls back to current environment when Windows login environment preflight fails", async function () {
    const snapshot = await preflightRuntimeEnvironmentOnStartup({
      platform: "win32",
      currentEnv: {
        Path: "C:\\Program Files\\Zotero",
        ANTHROPIC_API_KEY: "secret",
      },
      powershellRunner: async () => {
        throw new Error("powershell unavailable");
      },
    });

    const env = buildSubprocessEnvironment();

    assert.equal(snapshot.source, "fallback");
    assert.include(snapshot.error || "", "powershell unavailable");
    assert.equal(env.Path, "C:\\Program Files\\Zotero");
    assert.equal(env.ANTHROPIC_API_KEY, "secret");
  });

  it("adds common Windows user PATH entries when login environment preflight fails", async function () {
    await preflightRuntimeEnvironmentOnStartup({
      platform: "win32",
      currentEnv: {
        Path: "C:\\Program Files\\Zotero",
        USERPROFILE: "C:\\Users\\tester",
        APPDATA: "C:\\Users\\tester\\AppData\\Roaming",
        LOCALAPPDATA: "C:\\Users\\tester\\AppData\\Local",
      },
      powershellRunner: async () => {
        throw new Error("powershell unavailable");
      },
    });

    const env = buildSubprocessEnvironment();
    const pathEntries = splitPathEntries(env.Path);

    assert.include(pathEntries, "C:\\Users\\tester\\.local\\bin");
    assert.include(pathEntries, "C:\\Users\\tester\\AppData\\Roaming\\npm");
    assert.include(
      pathEntries,
      "C:\\Users\\tester\\AppData\\Local\\Microsoft\\WindowsApps",
    );
  });

  it("uses Mozilla Subprocess before Zotero internal subprocess for Windows login env", async function () {
    const calls: string[] = [];
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          call: async (args: { command: string; arguments?: string[] }) => {
            calls.push(args.command);
            assert.include(args.arguments || [], "-EncodedCommand");
            assert.notInclude(args.arguments || [], "-Command");
            const encodedCommand =
              args.arguments?.[
                (args.arguments || []).indexOf("-EncodedCommand") + 1
              ] || "";
            assert.equal(
              args.arguments?.[(args.arguments || []).length - 1],
              encodedCommand,
            );
            const script = decodeUtf16LeBase64(encodedCommand);
            assert.include(script, "| ConvertFrom-Json\n$outputPath");
            assert.match(
              script,
              /\$outputPath = '.*zotero-agents-env-.*\.json'/,
            );
            assert.include(script, "\nfunction Convert-EnvDict");
            assert.notInclude(script, "ConvertFrom-Json function");
            let stdoutRead = false;
            return {
              stdout: {
                readString: async () => {
                  if (stdoutRead) {
                    return "";
                  }
                  stdoutRead = true;
                  return JSON.stringify({
                    Machine: { Path: "C:\\Program Files\\nodejs" },
                    User: { Path: "C:\\Users\\tester\\AppData\\Roaming\\npm" },
                  });
                },
              },
              stderr: { readString: async () => "" },
              wait: async () => 0,
            };
          },
        },
      }),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      Utilities: {
        Internal: {
          subprocess: async () => {
            throw new Error("internal subprocess should not be used");
          },
        },
      },
    });

    try {
      const snapshot = await preflightRuntimeEnvironmentOnStartup({
        platform: "win32",
        currentEnv: { Path: "C:\\Program Files\\Zotero" },
      });

      assert.equal(snapshot.source, "windows-login");
      assert.isAtLeast(calls.length, 1);
      assert.include(buildSubprocessEnvironment().Path, "Roaming\\npm");
    } finally {
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("reads Windows login env output from the PowerShell output file", async function () {
    const files = new Map<string, string>();
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          call: async (args: { arguments?: string[] }) => ({
            stdout: {
              readString: async () => "",
            },
            stderr: { readString: async () => "" },
            wait: async () => {
              const encodedCommand =
                args.arguments?.[
                  (args.arguments || []).indexOf("-EncodedCommand") + 1
                ] || "";
              const script = decodeUtf16LeBase64(encodedCommand);
              const outputPath =
                script.match(/\$outputPath = '([^']+)'/)?.[1] || "";
              assert.match(outputPath, /zotero-agents-env-.+\.json$/);
              files.set(
                outputPath,
                JSON.stringify({
                  Machine: { Path: "C:\\Program Files\\nodejs" },
                  User: { Path: "C:\\Users\\tester\\AppData\\Roaming\\npm" },
                }),
              );
              return 0;
            },
          }),
        },
      }),
    });
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async (path: string) => files.has(path),
      readUTF8: async (path: string) => files.get(path) || "",
      remove: async (path: string) => {
        files.delete(path);
      },
    });

    try {
      const snapshot = await preflightRuntimeEnvironmentOnStartup({
        platform: "win32",
        currentEnv: { Path: "C:\\Program Files\\Zotero" },
        powershellCommands: ["C:\\Program Files\\PowerShell\\7\\pwsh.exe"],
      });

      assert.equal(snapshot.source, "windows-login");
      assert.include(buildSubprocessEnvironment().Path, "Roaming\\npm");
      assert.equal(files.size, 0);
    } finally {
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("summarizes subprocess environment without exposing secret values", function () {
    seedRuntimeEnvironmentSnapshotForTests({
      initialized: true,
      initializedAt: "2026-06-28T00:00:00.000Z",
      platform: "win32",
      source: "windows-login",
      env: {
        HOME: "C:\\Users\\tester",
        Path: "C:\\Program Files\\nodejs",
        OPENAI_API_KEY: "secret",
      },
      pathKey: "Path",
      pathEntryCount: 1,
    });

    const summary = summarizeSubprocessEnvironment({
      CODEX_HOME: "D:\\CustomCodex",
    });

    assert.deepEqual(summary.explicitKeys, ["CODEX_HOME"]);
    assert.include(summary.injectedKeys, "OPENAI_API_KEY");
    assert.equal(summary.pathValue, "C:\\Program Files\\nodejs");
    assert.deepEqual(summary.pathEntries, ["C:\\Program Files\\nodejs"]);
    assert.equal(summary.selectedValues.HOME, "C:\\Users\\tester");
    assert.equal(summary.snapshotSelectedValues.HOME, "C:\\Users\\tester");
    assert.equal(summary.explicitValues.CODEX_HOME, "D:\\CustomCodex");
    assert.equal(summary.selectedValues.OPENAI_API_KEY, "<redacted>");
    assert.notInclude(JSON.stringify(summary), "secret");
  });
});

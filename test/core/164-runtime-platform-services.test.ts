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
  buildPosixProcessGroupSignalInvocation,
  getRuntimeProcessControlSnapshot,
  preflightRuntimeProcessControlOnStartup,
  resetRuntimeProcessControlSnapshotForTests,
  seedRuntimeProcessControlSnapshotForTests,
  validatePosixProcessGroupOwnership,
} from "../../src/platform/processControl";
import {
  ensureRuntimeDirectoryStrict,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import {
  detectRuntimeArchitecture,
  detectSynthesisSidecarRuntimeTarget,
} from "../../src/platform/runtimePlatform";
import {
  executeOneShotSubprocess,
  type OneShotSubprocessAdapter,
} from "../../src/platform/subprocess";

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
    resetRuntimeProcessControlSnapshotForTests();
  });

  afterEach(function () {
    resetRuntimeCommandRegistryForTests();
    resetRuntimeEnvironmentSnapshotForTests();
    resetRuntimeProcessControlSnapshotForTests();
  });

  it("normalizes one-shot output and exit evidence across host adapters", async function () {
    for (const kind of ["node", "mozilla"] as const) {
      const adapter: OneShotSubprocessAdapter = {
        kind,
        supportsHiddenExecution: kind === "node",
        async start(request) {
          assert.equal(request.command, "/resolved/tool");
          assert.deepEqual(request.args, ["--probe"]);
          assert.deepEqual(request.environment, { TOKEN: "redacted" });
          assert.equal(request.cwd, "/resolved/workdir");
          return {
            readStdout: async () => "stdout-value",
            readStderr: async () => "stderr-value",
            wait: async () => ({ exitCode: 7 }),
          };
        },
      };

      const result = await executeOneShotSubprocess(
        {
          command: "/resolved/tool",
          args: ["--probe"],
          environment: { TOKEN: "redacted" },
          cwd: "/resolved/workdir",
          timeoutMs: 100,
          hidden: true,
        },
        { adapter },
      );

      assert.deepInclude(result, {
        outcome: "exited",
        adapter: kind,
        available: true,
        stdout: "stdout-value",
        stderr: "stderr-value",
        exitCode: 7,
        timedOut: false,
      });
      assert.deepEqual(result.hidden, {
        requested: true,
        applied: kind === "node",
      });
      assert.deepEqual(result.termination, {
        requested: false,
        supported: false,
        completed: false,
      });
    }
  });

  it("returns unavailable without searching commands or building environments", async function () {
    const result = await executeOneShotSubprocess(
      {
        command: "already-resolved-command",
        args: [],
        timeoutMs: 100,
      },
      { adapter: null },
    );

    assert.deepInclude(result, {
      outcome: "unavailable",
      adapter: null,
      available: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      timedOut: false,
    });
  });

  it("returns timeout and bounded termination evidence", async function () {
    let terminateCalls = 0;
    const adapter: OneShotSubprocessAdapter = {
      kind: "mozilla",
      supportsHiddenExecution: true,
      async start() {
        return {
          readStdout: async () => "partial-out",
          readStderr: async () => "partial-err",
          wait: async () => new Promise<never>(() => undefined),
          terminate: async () => {
            terminateCalls += 1;
          },
        };
      },
    };

    const result = await executeOneShotSubprocess(
      {
        command: "/resolved/hanging-tool",
        timeoutMs: 5,
        terminationGraceMs: 5,
        hidden: true,
      },
      { adapter },
    );

    assert.equal(terminateCalls, 1);
    assert.deepInclude(result, {
      outcome: "timed_out",
      adapter: "mozilla",
      available: true,
      stdout: "partial-out",
      stderr: "partial-err",
      exitCode: null,
      timedOut: true,
    });
    assert.deepEqual(result.hidden, { requested: true, applied: true });
    assert.deepEqual(result.termination, {
      requested: true,
      supported: true,
      completed: true,
    });
  });

  it("bounds a termination operation that never settles", async function () {
    const adapter: OneShotSubprocessAdapter = {
      kind: "windows-xpcom",
      supportsHiddenExecution: true,
      async start() {
        return {
          wait: async () => new Promise<never>(() => undefined),
          terminate: async () => new Promise<never>(() => undefined),
        };
      },
    };

    const startedAt = Date.now();
    const result = await executeOneShotSubprocess(
      {
        command: "C:\\resolved\\tool.exe",
        timeoutMs: 5,
        terminationGraceMs: 5,
        hidden: true,
      },
      { adapter },
    );

    assert.isBelow(Date.now() - startedAt, 250);
    assert.equal(result.outcome, "timed_out");
    assert.deepEqual(result.hidden, { requested: true, applied: true });
    assert.deepEqual(result.termination, {
      requested: true,
      supported: true,
      completed: false,
    });
  });

  it("executes through the production Node adapter with hidden execution", async function () {
    const previousChromeUtils = redefineGlobalProperty(
      "ChromeUtils",
      undefined,
    );
    const previousZotero = redefineGlobalProperty("Zotero", undefined);
    const previousComponents = redefineGlobalProperty("Components", undefined);
    const previousCc = redefineGlobalProperty("Cc", undefined);
    try {
      const result = await executeOneShotSubprocess({
        command: process.execPath,
        args: [
          "-e",
          "process.stdout.write('node-out');process.stderr.write('node-err');process.exit(3)",
        ],
        timeoutMs: 2000,
        hidden: true,
      });

      assert.deepInclude(result, {
        outcome: "exited",
        adapter: "node",
        stdout: "node-out",
        stderr: "node-err",
        exitCode: 3,
      });
      assert.deepEqual(result.hidden, { requested: true, applied: true });
    } finally {
      restoreGlobalProperty("Cc", previousCc);
      restoreGlobalProperty("Components", previousComponents);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("resolves the production Mozilla adapter independently on each invocation", async function () {
    let invocation = 0;
    const previousComponents = redefineGlobalProperty("Components", undefined);
    const previousCc = redefineGlobalProperty("Cc", undefined);
    const previousZotero = redefineGlobalProperty("Zotero", undefined);
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      importESModule() {
        invocation += 1;
        const stdout = `mozilla-${invocation}`;
        let stdoutRead = false;
        return {
          Subprocess: {
            async call() {
              return {
                stdout: {
                  async readString() {
                    if (stdoutRead) return "";
                    stdoutRead = true;
                    return stdout;
                  },
                },
                stderr: { readString: async () => "" },
                wait: async () => ({ exitValue: 0 }),
              };
            },
          },
        };
      },
    });
    try {
      const first = await executeOneShotSubprocess({
        command: "/resolved/mozilla-tool",
        timeoutMs: 100,
      });
      const second = await executeOneShotSubprocess({
        command: "/resolved/mozilla-tool",
        timeoutMs: 100,
      });

      assert.equal(first.adapter, "mozilla");
      assert.equal(first.stdout, "mozilla-1");
      assert.equal(second.adapter, "mozilla");
      assert.equal(second.stdout, "mozilla-2");
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("Cc", previousCc);
      restoreGlobalProperty("Components", previousComponents);
    }
  });

  it("feature-detects the production Windows hidden XPCOM adapter", async function () {
    let initializedPath = "";
    let processInstance:
      | {
          startHidden?: boolean;
          noShell?: boolean;
          exitValue: number;
        }
      | undefined;
    const previousChromeUtils = redefineGlobalProperty(
      "ChromeUtils",
      undefined,
    );
    const previousZotero = redefineGlobalProperty("Zotero", undefined);
    const previousComponents = redefineGlobalProperty("Components", {
      interfaces: { nsIFile: {}, nsIProcess: {} },
      classes: {
        "@mozilla.org/file/local;1": {
          createInstance() {
            return {
              initWithPath(path: string) {
                initializedPath = path;
              },
            };
          },
        },
        "@mozilla.org/process/util;1": {
          createInstance() {
            const instance = {
              startHidden: false,
              noShell: false,
              exitValue: 4,
              init() {},
              runwAsync(
                _args: string[],
                _count: number,
                observer: {
                  observe: (subject: unknown, topic: string) => void;
                },
              ) {
                observer.observe(instance, "process-finished");
              },
            };
            processInstance = instance;
            return instance;
          },
        },
      },
    });
    try {
      const result = await executeOneShotSubprocess({
        command: "C:\\resolved\\hidden-tool.exe",
        args: ["--probe"],
        timeoutMs: 100,
        hidden: true,
      });

      assert.equal(initializedPath, "C:\\resolved\\hidden-tool.exe");
      assert.equal(processInstance?.startHidden, true);
      assert.equal(processInstance?.noShell, true);
      assert.deepInclude(result, {
        outcome: "exited",
        adapter: "windows-xpcom",
        exitCode: 4,
      });
      assert.deepEqual(result.hidden, { requested: true, applied: true });
    } finally {
      restoreGlobalProperty("Components", previousComponents);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
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

  it("detects supported Synthesis runtime targets without command discovery", function () {
    assert.equal(detectRuntimeArchitecture("x64"), "x64");
    assert.equal(detectRuntimeArchitecture("arm64"), "arm64");
    assert.equal(detectRuntimeArchitecture("ia32"), "x86");
    assert.equal(detectRuntimeArchitecture("armv7l"), "arm");
    assert.equal(
      detectSynthesisSidecarRuntimeTarget({
        platform: "win32",
        architecture: "x64",
      }),
      "win32-x64",
    );
    assert.equal(
      detectSynthesisSidecarRuntimeTarget({
        platform: "darwin",
        architecture: "arm64",
      }),
      "darwin-arm64",
    );
    assert.equal(
      detectSynthesisSidecarRuntimeTarget({
        platform: "linux",
        architecture: "ia32",
      }),
      "linux-x86",
    );
    assert.equal(
      detectSynthesisSidecarRuntimeTarget({
        platform: "linux",
        architecture: "armv7l",
      }),
      "linux-arm",
    );
    assert.equal(
      detectSynthesisSidecarRuntimeTarget({
        platform: "win32",
        architecture: "arm64",
      }),
      "unsupported",
    );
  });

  it("normalizes Windows slash-form absolute paths independent of host OS", function () {
    assert.equal(
      normalizeNativeLocalPath("C:/Users/leike/Zotero/runtime/result.json"),
      "C:\\Users\\leike\\Zotero\\runtime\\result.json",
    );
    assert.equal(
      normalizeNativeLocalPath(
        "file:///E:/research/images/a%20b.jpg?preview=1#page",
      ),
      "E:\\research\\images\\a b.jpg",
    );
    assert.equal(
      normalizeNativeLocalPath("file:///tmp/research/a%20b.jpg"),
      "/tmp/research/a b.jpg",
    );
    assert.equal(normalizeNativeLocalPath("file:///%"), "");
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

  it("refuses Node fallback for non-native absolute runtime paths", async function () {
    if (typeof process === "undefined" || process.platform === "win32") {
      this.skip();
    }
    const root = `C:\\zs-non-native-runtime-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const target = `${root}\\file.txt`;
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      isMac: false,
      isLinux: false,
    });
    const previousIOUtils = redefineGlobalProperty("IOUtils", undefined);
    try {
      try {
        await writeRuntimeTextFile(target, "content");
        assert.fail("expected non-native runtime path write to fail");
      } catch (error) {
        assert.include(String((error as Error).message || error), "non-native");
      }
      assert.isFalse(await runtimePathExists(target));
    } finally {
      await removeRuntimePath(root).catch(() => false);
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("prefers the IOUtils runtime directory adapter in Node", async function () {
    if (typeof process === "undefined" || process.platform === "win32") {
      this.skip();
    }
    const target = `/tmp/zs-runtime-directory-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const dirs = new Set<string>();
    const calls: string[] = [];
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: false,
      isMac: false,
      isLinux: true,
    });
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      makeDirectory: async (path: string) => {
        calls.push(path);
        dirs.add(path);
      },
      stat: async (path: string) => {
        if (!dirs.has(path)) {
          throw new Error("directory not found");
        }
        return { type: "directory" };
      },
      exists: async (path: string) => dirs.has(path),
      remove: async (path: string) => {
        dirs.delete(path);
      },
    });
    try {
      await ensureRuntimeDirectoryStrict(target);
      assert.include(calls, target);
      assert.isTrue(dirs.has(target));
    } finally {
      await removeRuntimePath(target).catch(() => false);
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
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

  it("includes POSIX process-control commands in non-interactive lookup candidates", function () {
    assert.deepInclude(
      buildNonInteractiveCommandCandidates({
        command: "setsid",
        platform: "linux",
        homeDir: "/home/leike",
      }),
      "/usr/bin/setsid",
    );
    assert.deepInclude(
      buildNonInteractiveCommandCandidates({
        command: "kill",
        platform: "linux",
        homeDir: "/home/leike",
      }),
      "/bin/kill",
    );
    assert.deepInclude(
      buildNonInteractiveCommandCandidates({
        command: "ps",
        platform: "linux",
        homeDir: "/home/leike",
      }),
      "/bin/ps",
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

  it("preflights POSIX process-control cleanup from cached command registry", async function () {
    const snapshot = await preflightRuntimeProcessControlOnStartup({
      platform: "linux",
      now: () => "2026-07-07T00:00:00.000Z",
      commandRegistry: {
        initialized: true,
        commands: {
          sh: {
            command: "sh",
            available: true,
            resolvedPath: "/bin/sh",
            checkedCandidates: [],
          },
          setsid: {
            command: "setsid",
            available: true,
            resolvedPath: "/usr/bin/setsid",
            checkedCandidates: [],
          },
          kill: {
            command: "kill",
            available: true,
            resolvedPath: "/bin/kill",
            checkedCandidates: [],
          },
          ps: {
            command: "ps",
            available: true,
            resolvedPath: "/bin/ps",
            checkedCandidates: [],
          },
        },
      },
    });

    assert.include(snapshot, {
      initialized: true,
      platform: "linux",
      preferredCleanupStrategy: "posix-pidfile-supervisor",
      supportsProcessTreeCleanup: true,
      supportsProcessGroupLaunch: true,
      supportsNegativePidSignal: true,
      supportsPidFileSupervisor: true,
      supportsProcessIdentityQuery: true,
    });
    assert.equal(snapshot.initializedAt, "2026-07-07T00:00:00.000Z");
    assert.equal(
      getRuntimeProcessControlSnapshot().preferredCleanupStrategy,
      "posix-pidfile-supervisor",
    );
  });

  it("preserves the complete validated PGID in external signal operands", function () {
    const validation = validatePosixProcessGroupOwnership({
      strategy: "posix-pidfile-supervisor",
      expectedStrategy: "posix-pidfile-supervisor",
      childPid: 1_743_624,
      launchIdentity: {
        pid: 1_743_624,
        pgid: 1_743_624,
        sid: 1_743_624,
      },
      liveIdentity: {
        pid: 1_743_624,
        pgid: 1_743_624,
        sid: 1_743_624,
      },
      pidfileIdentity: {
        pid: 1_743_624,
        token: "launch-bound-token",
      },
      supervisorToken: "launch-bound-token",
      identityQuerySupported: true,
    });

    assert.isTrue(validation.ok);
    if (!validation.ok) {
      return;
    }
    assert.isTrue(Object.isFrozen(validation.target));
    assert.deepEqual(
      buildPosixProcessGroupSignalInvocation(validation.target, "TERM"),
      {
        signal: "TERM",
        targetPgid: 1_743_624,
        arguments: ["-s", "TERM", "--", "-1743624"],
      },
    );
    assert.deepEqual(
      buildPosixProcessGroupSignalInvocation(validation.target, "KILL")
        .arguments,
      ["-s", "KILL", "--", "-1743624"],
    );
  });

  it("rejects process groups that cannot be safe signal targets", function () {
    const validation = validatePosixProcessGroupOwnership({
      strategy: "node-process-group",
      expectedStrategy: "node-process-group",
      childPid: 1,
      launchIdentity: { pid: 1, pgid: 1, sid: 1 },
      liveIdentity: { pid: 1, pgid: 1, sid: 1 },
      identityQuerySupported: true,
    });

    assert.deepEqual(validation, {
      ok: false,
      reason: "unsafe-process-group",
    });
  });

  it("keeps process-control preflight cached after initialization", async function () {
    const first = await preflightRuntimeProcessControlOnStartup({
      platform: "linux",
      now: () => "first",
      commandRegistry: {
        initialized: true,
        commands: {
          sh: {
            command: "sh",
            available: true,
            resolvedPath: "/bin/sh",
            checkedCandidates: [],
          },
          setsid: {
            command: "setsid",
            available: true,
            resolvedPath: "/usr/bin/setsid",
            checkedCandidates: [],
          },
          kill: {
            command: "kill",
            available: true,
            resolvedPath: "/bin/kill",
            checkedCandidates: [],
          },
        },
      },
    });
    const second = await preflightRuntimeProcessControlOnStartup({
      platform: "win32",
      now: () => "second",
      commandRegistry: { initialized: true, commands: {} },
    });

    assert.equal(first.initializedAt, "first");
    assert.equal(second.initializedAt, "first");
    assert.equal(second.platform, "linux");
  });

  it("allows tests to seed process-control snapshots", function () {
    seedRuntimeProcessControlSnapshotForTests({
      initialized: true,
      initializedAt: "seeded",
      platform: "linux",
      preferredCleanupStrategy: "direct-kill-only",
      supportsProcessTreeCleanup: false,
      supportsProcessGroupLaunch: false,
      supportsNegativePidSignal: true,
      supportsPidFileSupervisor: false,
      diagnostics: [
        {
          stage: "startup-process-control",
          ok: false,
          message: "seeded diagnostic",
        },
      ],
    });

    const snapshot = getRuntimeProcessControlSnapshot();
    assert.equal(snapshot.initializedAt, "seeded");
    assert.equal(snapshot.diagnostics?.[0]?.message, "seeded diagnostic");
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

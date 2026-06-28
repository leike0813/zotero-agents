import { assert } from "chai";
import {
  buildAcpLaunchPlanForTests,
  launchAcpTransport,
  type AcpLaunchPlan,
} from "../../src/modules/acpTransport";
import {
  resetRuntimeCommandRegistryForTests,
  seedRuntimeCommandRegistryForTests,
} from "../../src/platform/command";
import {
  resetRuntimeEnvironmentSnapshotForTests,
  seedRuntimeEnvironmentSnapshotForTests,
} from "../../src/platform/env";
import { resolveWindowsCommandFromPowerShell } from "../../src/modules/windowsCommandResolution";
import type { BackendInstance } from "../../src/backends/types";

type SubprocessCallInvocation = {
  command: string;
  arguments: string[];
  environment?: Record<string, string>;
};

function assertCommandLineContains(
  plan: AcpLaunchPlan,
  expectedParts: string[],
) {
  for (const part of expectedParts) {
    assert.include(plan.commandLine, part);
  }
}

function assertCmdShimLaunch(args: {
  command: string;
  argv: string[];
  expectedCommand: string;
  expectedArgs: string[];
}) {
  assert.match(args.command, /(^|\\)cmd\.exe$/i);
  assert.deepEqual(args.argv.slice(0, 3), ["/d", "/s", "/c"]);
  const commandLine = args.argv[3] || "";
  assert.include(commandLine, `"${args.expectedCommand.replace(/"/g, '\\"')}"`);
  for (const expectedArg of args.expectedArgs) {
    assert.include(commandLine, `"${expectedArg.replace(/"/g, '\\"')}"`);
  }
  assert.notInclude(commandLine, "$nativeCommandLine");
  assert.notInclude(commandLine, "RedirectStandardInput");
  assert.notInclude(commandLine, "CopyToAsync");
}

function assertPowerShellScriptLaunch(args: {
  command: string;
  argv: string[];
  expectedCommand: string;
  expectedArgs: string[];
}) {
  assert.match(args.command, /(^|\\)(?:pwsh|powershell)\.exe$/i);
  assert.deepEqual(args.argv.slice(0, 6), [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
  ]);
  assert.equal(args.argv[6], args.expectedCommand);
  assert.deepEqual(args.argv.slice(7), args.expectedArgs);
  assert.notInclude(args.argv.join("\n"), "$nativeCommandLine");
  assert.notInclude(args.argv.join("\n"), "RedirectStandardInput");
  assert.notInclude(args.argv.join("\n"), "CopyToAsync");
}

function assertPowerShellBareCommandLaunch(args: {
  command: string;
  argv: string[];
  expectedCommand: string;
  expectedArgs: string[];
}) {
  assert.match(args.command, /(^|\\)(?:pwsh|powershell)\.exe$/i);
  assert.deepEqual(args.argv.slice(0, 6), [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
  ]);
  const script = args.argv[6] || "";
  assert.include(script, `& '${args.expectedCommand.replace(/'/g, "''")}'`);
  for (const expectedArg of args.expectedArgs) {
    assert.include(script, `'${expectedArg.replace(/'/g, "''")}'`);
  }
  assert.notInclude(script, ".cmd");
  assert.notInclude(script, "$nativeCommandLine");
  assert.notInclude(script, "RedirectStandardInput");
  assert.notInclude(script, "CopyToAsync");
}

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

function snapshotProcessEnv(keys: string[]) {
  return Object.fromEntries(
    keys.map((key) => [key, process.env[key]] as const),
  ) as Record<string, string | undefined>;
}

function restoreProcessEnv(snapshot: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
}

const PATH_ENV_KEYS = ["PATH", "Path", "path"];

function clearPathEnvForCommandResolution() {
  const snapshot = snapshotProcessEnv(PATH_ENV_KEYS);
  for (const key of PATH_ENV_KEYS) {
    process.env[key] = "";
  }
  return snapshot;
}

function seedWindowsLoginEnvironmentForTransportTests(
  overrides: Record<string, string> = {},
) {
  seedRuntimeEnvironmentSnapshotForTests({
    initialized: true,
    initializedAt: "2026-06-28T00:00:00.000Z",
    platform: "win32",
    source: "windows-login",
    env: {
      Path: "C:\\Program Files\\nodejs;C:\\Users\\tester\\AppData\\Roaming\\npm",
      OPENAI_API_KEY: "test-secret",
      ...overrides,
    },
    pathKey: "Path",
    pathEntryCount: 2,
  });
}

function assertHydratedWindowsEnvironment(
  environment: Record<string, string> | undefined,
) {
  assert.include(
    environment?.Path || environment?.PATH || "",
    "C:\\Users\\tester\\AppData\\Roaming\\npm",
  );
  assert.equal(environment?.OPENAI_API_KEY, "test-secret");
}

describe("acp transport", function () {
  beforeEach(function () {
    resetRuntimeCommandRegistryForTests();
    resetRuntimeEnvironmentSnapshotForTests();
  });

  afterEach(function () {
    resetRuntimeCommandRegistryForTests();
    resetRuntimeEnvironmentSnapshotForTests();
  });

  it("wraps host-global Windows command shims through cmd.exe", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
    });

    assert.equal(plan.mode, "cmd");
    assertCmdShimLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
      expectedArgs: ["-y", "opencode-ai@latest", "acp"],
    });
    assert.isUndefined(plan.environment);
    assert.equal(plan.commandLabel, "npx -y opencode-ai@latest acp");
    assertCommandLineContains(plan, [
      "cmd",
      "npx.cmd",
      "opencode-ai@latest",
      "acp",
    ]);
  });

  it("runs non-registry bare Windows ACP profile commands through PowerShell", function () {
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-06-28T00:00:00.000Z",
      commands: {
        pwsh: {
          command: "pwsh",
          available: true,
          resolvedPath: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
          source: "path",
          checkedCandidates: [],
        },
      },
    });
    const plan = buildAcpLaunchPlanForTests({
      command: "opencode",
      resolvedCommand: "C:\\Users\\tester\\AppData\\Roaming\\npm\\opencode.cmd",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
      preferWindowsBareCommandPowerShell: true,
    });

    assert.equal(plan.mode, "powershell");
    assertPowerShellBareCommandLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "opencode",
      expectedArgs: ["opencode-ai@latest", "acp"],
    });
    assert.match(plan.command, /(^|\\)pwsh\.exe$/i);
    assert.notInclude(plan.commandLine, "opencode.cmd");
  });

  it("quotes Windows command shim paths with spaces through cmd.exe", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
    });

    assert.equal(plan.mode, "cmd");
    assertCmdShimLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
      expectedArgs: ["-y", "opencode-ai@latest", "acp"],
    });
    assert.isUndefined(plan.environment);
    assert.notInclude(plan.commandLine, '"""');
  });

  it("keeps Windows command shims on cmd.exe even when PowerShell is preflighted", function () {
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-06-28T00:00:00.000Z",
      commands: {
        pwsh: {
          command: "pwsh",
          available: true,
          resolvedPath: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
          source: "path",
          checkedCandidates: [],
        },
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

    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
    });

    assert.equal(plan.mode, "cmd");
    assert.match(plan.command, /(^|\\)cmd\.exe$/i);
    assertCmdShimLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
      expectedArgs: ["-y", "opencode-ai@latest", "acp"],
    });
  });

  it("quotes single quotes in cmd.exe shim launch arguments", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Tools\\O'Node\\npx.cmd",
      args: ["agent's-cli", "acp"],
      platform: "win32",
    });

    assert.equal(plan.mode, "cmd");
    assertCmdShimLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "C:\\Tools\\O'Node\\npx.cmd",
      expectedArgs: ["-y", "agent's-cli", "acp"],
    });
    assert.include(plan.args[3] || "", '"C:\\Tools\\O\'Node\\npx.cmd"');
    assert.include(plan.args[3] || "", '"agent\'s-cli"');
  });

  it("wraps Windows PowerShell scripts through PowerShell -File", function () {
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-06-28T00:00:00.000Z",
      commands: {
        pwsh: {
          command: "pwsh",
          available: true,
          resolvedPath: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
          source: "path",
          checkedCandidates: [],
        },
      },
    });

    const plan = buildAcpLaunchPlanForTests({
      command: "agent",
      resolvedCommand: "C:\\Tools\\Agent\\agent.ps1",
      args: ["acp"],
      platform: "win32",
    });

    assert.equal(plan.mode, "powershell");
    assertPowerShellScriptLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "C:\\Tools\\Agent\\agent.ps1",
      expectedArgs: ["acp"],
    });
    assert.match(plan.command, /(^|\\)pwsh\.exe$/i);
  });

  it("keeps direct execution for non-Windows commands", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "/usr/local/bin/npx",
      args: ["opencode-ai@latest", "acp"],
      platform: "linux",
    });

    assert.equal(plan.mode, "direct");
    assert.equal(plan.command, "/usr/local/bin/npx");
    assert.deepEqual(plan.args, ["-y", "opencode-ai@latest", "acp"]);
    assert.equal(plan.commandLabel, "npx -y opencode-ai@latest acp");
    assert.equal(
      plan.commandLine,
      "/usr/local/bin/npx -y opencode-ai@latest acp",
    );
  });

  it("keeps resolved Windows executables direct so nested quoted args survive", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "uv",
      resolvedCommand: "C:\\Users\\tester\\.local\\bin\\uv.exe",
      args: [
        "run",
        "--isolated",
        "--",
        "C:\\Program Files\\nodejs\\npx.cmd",
        "@agentclientprotocol/claude-agent-acp@latest",
      ],
      platform: "win32",
    });

    assert.equal(plan.mode, "direct");
    assert.equal(plan.command, "C:\\Users\\tester\\.local\\bin\\uv.exe");
    assert.deepEqual(plan.args, [
      "run",
      "--isolated",
      "--",
      "C:\\Program Files\\nodejs\\npx.cmd",
      "@agentclientprotocol/claude-agent-acp@latest",
    ]);
    assert.notInclude(plan.commandLine, "cmd.exe /d /c");
  });

  it("creates mozilla transport adapters without global Web Streams", async function () {
    const writes: string[] = [];
    let readCount = 0;
    const previousReadableStream = redefineGlobalProperty(
      "ReadableStream",
      undefined,
    );
    const previousWritableStream = redefineGlobalProperty(
      "WritableStream",
      undefined,
    );
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Program Files\\nodejs\\npx.cmd",
          call: async () => ({
            stdin: {
              write: async (data: string) => {
                writes.push(data);
              },
              close: async () => undefined,
            },
            stdout: {
              readString: async () => {
                readCount += 1;
                return readCount === 1 ? "hello" : "";
              },
            },
            stderr: {
              readString: async () => "",
            },
            wait: async () => 0,
            kill: () => undefined,
          }),
        },
      }),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      const writer = transport.stdin.getWriter();
      await writer.write(new TextEncoder().encode('{"ping":true}\n'));
      writer.releaseLock();

      const reader = transport.stdout.getReader();
      const firstRead = await reader.read();
      const secondRead = await reader.read();
      reader.releaseLock();

      assert.deepEqual(writes, ['{"ping":true}\n']);
      assert.isFalse(firstRead.done);
      assert.equal(new TextDecoder().decode(firstRead.value), "hello");
      assert.isTrue(secondRead.done);

      await transport.close();
    } finally {
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("WritableStream", previousWritableStream);
      restoreGlobalProperty("ReadableStream", previousReadableStream);
    }
  });

  it("waits for natural Mozilla subprocess exit before cleanup kill", async function () {
    let killCount = 0;
    let stderrReadCount = 0;
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
          call: async () => ({
            stdin: {
              write: async () => undefined,
              close: async () => undefined,
            },
            stdout: {
              readString: async () => "",
            },
            stderr: {
              readString: async () => {
                stderrReadCount += 1;
                return stderrReadCount === 1 ? "backend failed\n" : "";
              },
            },
            wait: async () => {
              await new Promise((resolve) => setTimeout(resolve, 20));
              return { exitCode: 7 };
            },
            kill: () => {
              killCount += 1;
            },
          }),
        },
      }),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-test",
          displayName: "ACP Test",
          type: "acp",
          baseUrl: "local://acp-test",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      await transport.close({ graceMs: 100 });

      assert.equal(killCount, 0);
      assert.equal(transport.getExitCode(), 7);
      assert.include(transport.getStderrText(), "backend failed");
      assert.include(transport.getLifecycle(), {
        exitCode: 7,
        exitSource: "natural-exit",
        killedByClose: false,
      });
    } finally {
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("uses registry resolved paths for bare ACP profile commands before PowerShell fallback", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    seedWindowsLoginEnvironmentForTransportTests();
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-06-28T00:00:00.000Z",
      commands: {
        npx: {
          command: "npx",
          available: true,
          resolvedPath: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
          source: "path",
          checkedCandidates: [],
        },
      },
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            return {
              stdin: {
                write: async () => undefined,
                close: async () => undefined,
              },
              stdout: {
                readString: async () => "",
              },
              stderr: {
                readString: async () => "",
              },
              wait: async () => 0,
              kill: () => undefined,
            };
          },
        },
      }),
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      assert.lengthOf(callInvocations, 1);
      assertCmdShimLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
        expectedArgs: ["-y", "opencode-ai@latest", "acp"],
      });
      assertHydratedWindowsEnvironment(callInvocations[0].environment);
      assert.include(transport.getCommandLine(), "npx.cmd");
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("resolves npx via PowerShell when Zotero pathSearch misses the npm shim", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    const powerShellCalls: Array<{ command: string; args: string[] }> = [];
    seedWindowsLoginEnvironmentForTransportTests();
    const previousPathEnv = clearPathEnvForCommandResolution();
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async (command: string, args?: string[]) => {
            powerShellCalls.push({ command, args: [...(args || [])] });
            if (command.toLowerCase().includes("powershell")) {
              return "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.ps1\n";
            }
            throw new Error(`Unexpected subprocess command: ${command}`);
          },
        },
      },
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            return {
              stdin: {
                write: async () => undefined,
                close: async () => undefined,
              },
              stdout: {
                readString: async () => "",
              },
              stderr: {
                readString: async () => "",
              },
              wait: async () => 0,
              kill: () => undefined,
            };
          },
        },
      }),
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      assert.lengthOf(callInvocations, 1);
      assertPowerShellBareCommandLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "npx",
        expectedArgs: ["-y", "opencode-ai@latest", "acp"],
      });
      assertHydratedWindowsEnvironment(callInvocations[0].environment);
      assert.equal(transport.getCommandLabel(), "npx -y opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx");
      assert.notInclude(transport.getCommandLine(), "npx.cmd");
      assert.include(transport.getCommandLine(), "opencode-ai@latest");
      assert.isTrue(
        powerShellCalls.some((entry) =>
          entry.command.toLowerCase().includes("powershell"),
        ),
      );
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreProcessEnv(previousPathEnv);
    }
  });

  it("does not invoke PowerShell fallback for unsafe bare command names", async function () {
    let invoked = false;
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async () => {
            invoked = true;
            return "";
          },
        },
      },
    });

    try {
      const resolved = await resolveWindowsCommandFromPowerShell(
        "npx;Write-Output pwned",
        "win32",
      );

      assert.deepEqual(resolved, []);
      assert.isFalse(invoked);
    } finally {
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("ignores bare pathSearch results and still resolves npx through Windows fallbacks", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    const powerShellCalls: Array<{ command: string; args: string[] }> = [];
    seedWindowsLoginEnvironmentForTransportTests();
    const previousPathEnv = clearPathEnvForCommandResolution();
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async (command: string, args?: string[]) => {
            powerShellCalls.push({ command, args: [...(args || [])] });
            if (command.toLowerCase().includes("powershell")) {
              return "C:\\Program Files\\nodejs\\npx.ps1\n";
            }
            throw new Error(`Unexpected subprocess command: ${command}`);
          },
        },
      },
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "npx",
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            return {
              stdin: {
                write: async () => undefined,
                close: async () => undefined,
              },
              stdout: {
                readString: async () => "",
              },
              stderr: {
                readString: async () => "",
              },
              wait: async () => 0,
              kill: () => undefined,
            };
          },
        },
      }),
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      assert.lengthOf(callInvocations, 1);
      assertPowerShellBareCommandLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "npx",
        expectedArgs: ["-y", "opencode-ai@latest", "acp"],
      });
      assertHydratedWindowsEnvironment(callInvocations[0].environment);
      assert.equal(transport.getCommandLabel(), "npx -y opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx");
      assert.notInclude(transport.getCommandLine(), "npx.cmd");
      assert.include(transport.getCommandLine(), "opencode-ai@latest");
      assert.isTrue(
        powerShellCalls.some((entry) =>
          entry.command.toLowerCase().includes("powershell"),
        ),
      );
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreProcessEnv(previousPathEnv);
    }
  });

  it("continues Windows fallback resolution when mozilla pathSearch throws executable-not-found", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    const powerShellCalls: Array<{ command: string; args: string[] }> = [];
    seedWindowsLoginEnvironmentForTransportTests();
    const previousPathEnv = clearPathEnvForCommandResolution();
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async (command: string, args?: string[]) => {
            powerShellCalls.push({ command, args: [...(args || [])] });
            if (command.toLowerCase().includes("powershell")) {
              return "C:\\Program Files\\nodejs\\npx.ps1\n";
            }
            throw new Error(`Unexpected subprocess command: ${command}`);
          },
        },
      },
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => {
            throw new Error("Executable not found: npx");
          },
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            return {
              stdin: {
                write: async () => undefined,
                close: async () => undefined,
              },
              stdout: {
                readString: async () => "",
              },
              stderr: {
                readString: async () => "",
              },
              wait: async () => 0,
              kill: () => undefined,
            };
          },
        },
      }),
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      assert.lengthOf(callInvocations, 1);
      assertPowerShellBareCommandLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "npx",
        expectedArgs: ["-y", "opencode-ai@latest", "acp"],
      });
      assertHydratedWindowsEnvironment(callInvocations[0].environment);
      assert.equal(transport.getCommandLabel(), "npx -y opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx");
      assert.notInclude(transport.getCommandLine(), "npx.cmd");
      assert.include(transport.getCommandLine(), "opencode-ai@latest");
      assert.isTrue(
        powerShellCalls.some((entry) =>
          entry.command.toLowerCase().includes("powershell"),
        ),
      );
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreProcessEnv(previousPathEnv);
    }
  });

  it("falls back to the host global npm directory when PATH and Get-Command both miss npx", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    seedWindowsLoginEnvironmentForTransportTests();
    const previousPathEnv = clearPathEnvForCommandResolution();
    const previousAppData = process.env.APPDATA;
    const previousLocalAppData = process.env.LOCALAPPDATA;
    const previousNpmPrefix = process.env.NPM_CONFIG_PREFIX;
    const previousUserProfile = process.env.USERPROFILE;
    process.env.APPDATA = "C:\\Users\\tester\\AppData\\Roaming";
    delete process.env.LOCALAPPDATA;
    delete process.env.NPM_CONFIG_PREFIX;
    process.env.USERPROFILE = "C:\\Users\\tester";
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async (candidate: string) =>
        /AppData\\Roaming\\npm\\npx\.cmd$/i.test(String(candidate || "")),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async () => {
            throw new Error("Executable not found: powershell.exe");
          },
        },
      },
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => null,
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            return {
              stdin: {
                write: async () => undefined,
                close: async () => undefined,
              },
              stdout: {
                readString: async () => "",
              },
              stderr: {
                readString: async () => "",
              },
              wait: async () => 0,
              kill: () => undefined,
            };
          },
        },
      }),
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      assert.lengthOf(callInvocations, 1);
      assertPowerShellBareCommandLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "npx",
        expectedArgs: ["-y", "opencode-ai@latest", "acp"],
      });
      assertHydratedWindowsEnvironment(callInvocations[0].environment);
      assert.equal(transport.getCommandLabel(), "npx -y opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx");
      assert.notInclude(transport.getCommandLine(), "npx.cmd");
      assert.include(transport.getCommandLine(), "opencode-ai@latest");
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreProcessEnv(previousPathEnv);
      if (typeof previousAppData === "string") {
        process.env.APPDATA = previousAppData;
      } else {
        delete process.env.APPDATA;
      }
      if (typeof previousLocalAppData === "string") {
        process.env.LOCALAPPDATA = previousLocalAppData;
      } else {
        delete process.env.LOCALAPPDATA;
      }
      if (typeof previousNpmPrefix === "string") {
        process.env.NPM_CONFIG_PREFIX = previousNpmPrefix;
      } else {
        delete process.env.NPM_CONFIG_PREFIX;
      }
      if (typeof previousUserProfile === "string") {
        process.env.USERPROFILE = previousUserProfile;
      } else {
        delete process.env.USERPROFILE;
      }
    }
  });

  it("falls back to the Node.js install directory when PATH, Get-Command, and global npm roots all miss npx", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    seedWindowsLoginEnvironmentForTransportTests();
    const previousPathEnv = clearPathEnvForCommandResolution();
    const previousAppData = process.env.APPDATA;
    const previousLocalAppData = process.env.LOCALAPPDATA;
    const previousNpmPrefix = process.env.NPM_CONFIG_PREFIX;
    const previousUserProfile = process.env.USERPROFILE;
    const previousProgramFiles = process.env.ProgramFiles;
    const previousProgramFilesX86 = process.env["ProgramFiles(x86)"];
    process.env.APPDATA = "C:\\Users\\tester\\AppData\\Roaming";
    delete process.env.LOCALAPPDATA;
    delete process.env.NPM_CONFIG_PREFIX;
    process.env.USERPROFILE = "C:\\Users\\tester";
    process.env.ProgramFiles = "C:\\Program Files";
    process.env["ProgramFiles(x86)"] = "C:\\Program Files (x86)";
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async (candidate: string) =>
        /Program Files\\nodejs\\npx\.cmd$/i.test(String(candidate || "")),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async () => {
            throw new Error("Executable not found: powershell.exe");
          },
        },
      },
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => null,
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            return {
              stdin: {
                write: async () => undefined,
                close: async () => undefined,
              },
              stdout: {
                readString: async () => "",
              },
              stderr: {
                readString: async () => "",
              },
              wait: async () => 0,
              kill: () => undefined,
            };
          },
        },
      }),
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      assert.lengthOf(callInvocations, 1);
      assertPowerShellBareCommandLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "npx",
        expectedArgs: ["-y", "opencode-ai@latest", "acp"],
      });
      assertHydratedWindowsEnvironment(callInvocations[0].environment);
      assert.equal(transport.getCommandLabel(), "npx -y opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx");
      assert.notInclude(transport.getCommandLine(), "npx.cmd");
      assert.include(transport.getCommandLine(), "opencode-ai@latest");
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreProcessEnv(previousPathEnv);
      if (typeof previousAppData === "string") {
        process.env.APPDATA = previousAppData;
      } else {
        delete process.env.APPDATA;
      }
      if (typeof previousLocalAppData === "string") {
        process.env.LOCALAPPDATA = previousLocalAppData;
      } else {
        delete process.env.LOCALAPPDATA;
      }
      if (typeof previousNpmPrefix === "string") {
        process.env.NPM_CONFIG_PREFIX = previousNpmPrefix;
      } else {
        delete process.env.NPM_CONFIG_PREFIX;
      }
      if (typeof previousUserProfile === "string") {
        process.env.USERPROFILE = previousUserProfile;
      } else {
        delete process.env.USERPROFILE;
      }
      if (typeof previousProgramFiles === "string") {
        process.env.ProgramFiles = previousProgramFiles;
      } else {
        delete process.env.ProgramFiles;
      }
      if (typeof previousProgramFilesX86 === "string") {
        process.env["ProgramFiles(x86)"] = previousProgramFilesX86;
      } else {
        delete process.env["ProgramFiles(x86)"];
      }
    }
  });

  it("resolves npx through Windows fallbacks even when mozilla pathSearch is unavailable", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    seedWindowsLoginEnvironmentForTransportTests();
    const previousPathEnv = clearPathEnvForCommandResolution();
    const previousProgramFiles = process.env.ProgramFiles;
    const previousProgramFilesX86 = process.env["ProgramFiles(x86)"];
    process.env.ProgramFiles = "C:\\Program Files";
    process.env["ProgramFiles(x86)"] = "C:\\Program Files (x86)";
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async (candidate: string) =>
        /Program Files\\nodejs\\npx\.cmd$/i.test(String(candidate || "")),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async () => {
            throw new Error("Executable not found: powershell.exe");
          },
        },
      },
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            return {
              stdin: {
                write: async () => undefined,
                close: async () => undefined,
              },
              stdout: {
                readString: async () => "",
              },
              stderr: {
                readString: async () => "",
              },
              wait: async () => 0,
              kill: () => undefined,
            };
          },
        },
      }),
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });

      assert.lengthOf(callInvocations, 1);
      assertPowerShellBareCommandLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "npx",
        expectedArgs: ["-y", "opencode-ai@latest", "acp"],
      });
      assertHydratedWindowsEnvironment(callInvocations[0].environment);
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreProcessEnv(previousPathEnv);
      if (typeof previousProgramFiles === "string") {
        process.env.ProgramFiles = previousProgramFiles;
      } else {
        delete process.env.ProgramFiles;
      }
      if (typeof previousProgramFilesX86 === "string") {
        process.env["ProgramFiles(x86)"] = previousProgramFilesX86;
      } else {
        delete process.env["ProgramFiles(x86)"];
      }
    }
  });

  it("throws a transport resolution error instead of leaking bare npx when pathSearch is unavailable and all fallbacks fail", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async () => false,
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async () => {
            throw new Error("Executable not found: powershell.exe");
          },
        },
      },
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            throw new Error(`Executable not found: ${args.command}`);
          },
        },
      }),
    });

    try {
      let thrown: unknown = null;
      try {
        await launchAcpTransport({
          backend: {
            id: "acp-opencode",
            displayName: "OpenCode ACP",
            type: "acp",
            baseUrl: "local://acp-opencode",
            command: "npx",
            args: ["opencode-ai@latest", "acp"],
          } as BackendInstance,
          cwd: "D:\\ZoteroData",
        });
      } catch (error) {
        thrown = error;
      }
      assert.instanceOf(thrown, Error);
      const message = String((thrown as Error).message || "");
      assert.match(message, /Command "npx" was not found/);
      assert.match(message, /checked candidates/);
      assert.deepEqual(callInvocations, []);
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
    }
  });

  it("throws a transport resolution error when mozilla pathSearch throws and all fallbacks fail", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async () => false,
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async () => {
            throw new Error("Executable not found: powershell.exe");
          },
        },
      },
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => {
            throw new Error("Executable not found: npx");
          },
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
          }) => {
            callInvocations.push({
              command: args.command,
              arguments: [...(args.arguments || [])],
              environment: args.environment,
            });
            throw new Error(`Executable not found: ${args.command}`);
          },
        },
      }),
    });

    try {
      let thrown: unknown = null;
      try {
        await launchAcpTransport({
          backend: {
            id: "acp-opencode",
            displayName: "OpenCode ACP",
            type: "acp",
            baseUrl: "local://acp-opencode",
            command: "npx",
            args: ["opencode-ai@latest", "acp"],
          } as BackendInstance,
          cwd: "D:\\ZoteroData",
        });
      } catch (error) {
        thrown = error;
      }
      assert.instanceOf(thrown, Error);
      const message = String((thrown as Error).message || "");
      assert.match(message, /Command "npx" was not found/);
      assert.match(message, /checked candidates/);
      assert.deepEqual(callInvocations, []);
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
    }
  });
});

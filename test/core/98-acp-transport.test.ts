import { assert } from "chai";
import {
  buildAcpLaunchPlanForTests,
  launchAcpTransport,
  type AcpLaunchPlan,
} from "../../src/modules/acpTransport";
import { resetRuntimeCommandRegistryForTests } from "../../src/platform/command";
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

function assertPowerShellLaunch(args: {
  command: string;
  argv: string[];
  expectedCommand: string;
  expectedArgs: string[];
}) {
  assert.match(args.command, /(^|\\)(powershell|pwsh)\.exe$/i);
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
  assert.notInclude(script, "cmd.exe");
  assert.notInclude(script, '"""');
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

describe("acp transport", function () {
  beforeEach(function () {
    resetRuntimeCommandRegistryForTests();
  });

  afterEach(function () {
    resetRuntimeCommandRegistryForTests();
  });

  it("wraps host-global Windows command shims through PowerShell", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
    });

    assert.equal(plan.mode, "powershell");
    assertPowerShellLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
      expectedArgs: ["opencode-ai@latest", "acp"],
    });
    assert.isUndefined(plan.environment);
    assert.equal(plan.commandLabel, "npx opencode-ai@latest acp");
    assertCommandLineContains(plan, [
      "powershell",
      "npx.cmd",
      "opencode-ai@latest",
      "acp",
    ]);
  });

  it("quotes Windows command shim paths with spaces through PowerShell", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
    });

    assert.equal(plan.mode, "powershell");
    assertPowerShellLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
      expectedArgs: ["opencode-ai@latest", "acp"],
    });
    assert.isUndefined(plan.environment);
    assert.notInclude(plan.commandLine, '"""');
  });

  it("escapes single quotes in PowerShell shim launch arguments", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Tools\\O'Node\\npx.cmd",
      args: ["agent's-cli", "acp"],
      platform: "win32",
    });

    assert.equal(plan.mode, "powershell");
    assertPowerShellLaunch({
      command: plan.command,
      argv: plan.args,
      expectedCommand: "C:\\Tools\\O'Node\\npx.cmd",
      expectedArgs: ["agent's-cli", "acp"],
    });
    assert.include(plan.args[6] || "", "'C:\\Tools\\O''Node\\npx.cmd'");
    assert.include(plan.args[6] || "", "'agent''s-cli'");
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
    assert.deepEqual(plan.args, ["opencode-ai@latest", "acp"]);
    assert.equal(plan.commandLabel, "npx opencode-ai@latest acp");
    assert.equal(plan.commandLine, "/usr/local/bin/npx opencode-ai@latest acp");
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

  it("resolves npx via PowerShell when Zotero pathSearch misses the npm shim", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    const powerShellCalls: Array<{ command: string; args: string[] }> = [];
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
      assertPowerShellLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
        expectedArgs: ["opencode-ai@latest", "acp"],
      });
      assert.isUndefined(callInvocations[0].environment?.PATH);
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx.cmd");
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
      assertPowerShellLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
        expectedArgs: ["opencode-ai@latest", "acp"],
      });
      assert.isUndefined(callInvocations[0].environment?.PATH);
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx.cmd");
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
      assertPowerShellLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
        expectedArgs: ["opencode-ai@latest", "acp"],
      });
      assert.isUndefined(callInvocations[0].environment?.PATH);
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx.cmd");
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
      assertPowerShellLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
        expectedArgs: ["opencode-ai@latest", "acp"],
      });
      assert.isUndefined(callInvocations[0].environment?.PATH);
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx.cmd");
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
      assertPowerShellLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
        expectedArgs: ["opencode-ai@latest", "acp"],
      });
      assert.isUndefined(callInvocations[0].environment?.PATH);
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx.cmd");
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
      assertPowerShellLaunch({
        command: callInvocations[0].command,
        argv: callInvocations[0].arguments,
        expectedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
        expectedArgs: ["opencode-ai@latest", "acp"],
      });
      assert.isUndefined(callInvocations[0].environment?.PATH);
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

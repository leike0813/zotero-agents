import { assert } from "chai";
import {
  buildAcpLaunchPlanForTests,
  launchAcpTransport,
  type AcpLaunchPlan,
} from "../../src/modules/acpTransport";
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

describe("acp transport", function () {
  it("wraps host-global Windows commands through cmd.exe", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand:
        "C:\\Users\\tester\\AppData\\Roaming\\npm\\npx.cmd",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
      comspec: "C:\\Windows\\System32\\cmd.exe",
    });

    assert.equal(plan.command, "C:\\Windows\\System32\\cmd.exe");
    assert.deepEqual(plan.args.slice(0, 2), ["/d", "/c"]);
    assert.equal(plan.args[2], "npx opencode-ai@latest acp");
    assert.equal(
      plan.environment?.PATH,
      "C:\\Users\\tester\\AppData\\Roaming\\npm",
    );
    assert.equal(plan.commandLabel, "npx opencode-ai@latest acp");
    assert.notInclude(plan.commandLine, '"""');
    assert.notInclude(plan.commandLine, '"" opencode-ai');
    assertCommandLineContains(plan, [
      "cmd.exe",
      "npx",
      "opencode-ai@latest",
      "acp",
    ]);
  });

  it("quotes Windows command shim paths with spaces without cmd triple quotes", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Program Files\\nodejs\\npx.cmd",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
      comspec: "C:\\Windows\\System32\\cmd.exe",
    });

    assert.equal(plan.command, "C:\\Windows\\System32\\cmd.exe");
    assert.deepEqual(plan.args.slice(0, 2), ["/d", "/c"]);
    assert.equal(plan.args[2], "npx opencode-ai@latest acp");
    assert.equal(plan.environment?.PATH, "C:\\Program Files\\nodejs");
    assert.notInclude(plan.commandLine, '"""');
    assert.notInclude(plan.commandLine, '"" opencode-ai');
  });

  it("keeps direct execution for non-Windows commands", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "/usr/local/bin/npx",
      args: ["opencode-ai@latest", "acp"],
      platform: "linux",
    });

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
        "@zed-industries/claude-code-acp@latest",
      ],
      platform: "win32",
      comspec: "C:\\Windows\\System32\\cmd.exe",
    });

    assert.equal(plan.command, "C:\\Users\\tester\\.local\\bin\\uv.exe");
    assert.deepEqual(plan.args, [
      "run",
      "--isolated",
      "--",
      "C:\\Program Files\\nodejs\\npx.cmd",
      "@zed-industries/claude-code-acp@latest",
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
      assert.match(
        callInvocations[0].command,
        /(^|\\)(cmd\.exe)$/i,
      );
      assert.deepEqual(callInvocations[0].arguments.slice(0, 2), [
        "/d",
        "/c",
      ]);
      assert.equal(
        callInvocations[0].arguments[2] || "",
        "npx opencode-ai@latest acp",
      );
      assert.include(
        callInvocations[0].arguments[2] || "",
        "opencode-ai@latest",
      );
      assert.include(callInvocations[0].arguments[2] || "", "acp");
      assert.notInclude(callInvocations[0].arguments[2] || "", '"""');
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx opencode-ai@latest acp");
      assert.isTrue(
        powerShellCalls.some((entry) =>
          entry.command.toLowerCase().includes("powershell"),
        ),
      );
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
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
      assert.match(
        callInvocations[0].command,
        /(^|\\)(cmd\.exe)$/i,
      );
      assert.equal(callInvocations[0].arguments[2] || "", "npx opencode-ai@latest acp");
      assert.equal(
        callInvocations[0].environment?.PATH,
        "C:\\Program Files\\nodejs",
      );
      assert.notInclude(callInvocations[0].arguments[2] || "", '"""');
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx opencode-ai@latest acp");
      assert.isTrue(
        powerShellCalls.some((entry) =>
          entry.command.toLowerCase().includes("powershell"),
        ),
      );
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("continues Windows fallback resolution when mozilla pathSearch throws executable-not-found", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    const powerShellCalls: Array<{ command: string; args: string[] }> = [];
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
      assert.match(
        callInvocations[0].command,
        /(^|\\)(cmd\.exe)$/i,
      );
      assert.equal(callInvocations[0].arguments[2] || "", "npx opencode-ai@latest acp");
      assert.equal(callInvocations[0].environment?.PATH, "C:\\Program Files\\nodejs");
      assert.notInclude(callInvocations[0].arguments[2] || "", '"""');
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx opencode-ai@latest acp");
      assert.isTrue(
        powerShellCalls.some((entry) =>
          entry.command.toLowerCase().includes("powershell"),
        ),
      );
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("falls back to the host global npm directory when PATH and Get-Command both miss npx", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
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
      assert.match(
        callInvocations[0].command,
        /(^|\\)(cmd\.exe)$/i,
      );
      assert.equal(callInvocations[0].arguments[2] || "", "npx opencode-ai@latest acp");
      assert.equal(
        callInvocations[0].environment?.PATH,
        "C:\\Users\\tester\\AppData\\Roaming\\npm",
      );
      assert.include(
        callInvocations[0].arguments[2] || "",
        "opencode-ai@latest",
      );
      assert.include(callInvocations[0].arguments[2] || "", "acp");
      assert.notInclude(callInvocations[0].arguments[2] || "", '"""');
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx opencode-ai@latest acp");
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
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
      assert.match(
        callInvocations[0].command,
        /(^|\\)(cmd\.exe)$/i,
      );
      assert.equal(callInvocations[0].arguments[2] || "", "npx opencode-ai@latest acp");
      assert.equal(callInvocations[0].environment?.PATH, "C:\\Program Files\\nodejs");
      assert.include(
        callInvocations[0].arguments[2] || "",
        "opencode-ai@latest",
      );
      assert.include(callInvocations[0].arguments[2] || "", "acp");
      assert.notInclude(callInvocations[0].arguments[2] || "", '"""');
      assert.equal(transport.getCommandLabel(), "npx opencode-ai@latest acp");
      assert.include(transport.getCommandLine(), "npx opencode-ai@latest acp");
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
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
      assert.match(
        callInvocations[0].command,
        /(^|\\)(cmd\.exe)$/i,
      );
      assert.equal(callInvocations[0].arguments[2] || "", "npx opencode-ai@latest acp");
      assert.equal(callInvocations[0].environment?.PATH, "C:\\Program Files\\nodejs");
      assert.notInclude(callInvocations[0].arguments[2] || "", '"""');
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
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
      assert.match(
        String((thrown as Error).message || ""),
        /Command "npx" was not found in PATH/,
      );
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
      assert.match(
        String((thrown as Error).message || ""),
        /Command "npx" was not found in PATH/,
      );
      assert.deepEqual(callInvocations, []);
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("IOUtils", previousIOUtils);
    }
  });
});

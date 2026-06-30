import { assert } from "chai";
import { SkillRunnerCtlBridge } from "../../../src/modules/skillRunnerCtlBridge";
import { DEFAULT_LOCAL_RUNTIME_VERSION } from "../../../src/modules/skillRunnerLocalRuntimeManager";

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

describe("skillrunner ctl bridge", function () {
  it("normalizes ctl --json response payload", async function () {
    const bridge = new SkillRunnerCtlBridge({
      runCommand: async () => ({
        exitCode: 0,
        stdout: JSON.stringify({
          ok: true,
          exit_code: 0,
          status: "running",
          message: "Local runtime status: running.",
        }),
        stderr: "",
      }),
    });

    const result = await bridge.runCtlCommand({
      ctlPath: "C:\\SkillRunner\\scripts\\skill-runnerctl.ps1",
      command: "status",
      mode: "local",
      port: 8000,
    });

    assert.isTrue(result.ok);
    assert.equal(result.exitCode, 0);
    assert.equal(result.details?.status, "running");
    assert.equal(result.message, "Local runtime status: running.");
  });

  it("treats non-zero exit as failed when payload does not override ok", async function () {
    const bridge = new SkillRunnerCtlBridge({
      runCommand: async () => ({
        exitCode: 5,
        stdout: "runtime failed",
        stderr: "stderr detail",
      }),
    });

    const result = await bridge.runCtlCommand({
      ctlPath: "C:\\SkillRunner\\scripts\\skill-runnerctl.ps1",
      command: "status",
      mode: "local",
      port: 8000,
    });

    assert.isFalse(result.ok);
    assert.equal(result.exitCode, 5);
    assert.include(result.message, "stderr detail");
  });

  it("supports bootstrap command with json mode", async function () {
    const commands: Array<{ command: string; args: string[] }> = [];
    const bridge = new SkillRunnerCtlBridge({
      runCommand: async (args) => {
        commands.push({ command: args.command, args: args.args });
        return {
          exitCode: 0,
          stdout: JSON.stringify({
            ok: true,
            exit_code: 0,
            message: "Bootstrap completed.",
          }),
          stderr: "",
        };
      },
    });

    const result = await bridge.runCtlCommand({
      ctlPath: "C:\\SkillRunner\\scripts\\skill-runnerctl.ps1",
      command: "bootstrap",
    });

    assert.isTrue(result.ok);
    assert.equal(commands.length, 1);
    const commandScript = commands[0].args.join(" ");
    assert.include(commandScript, "bootstrap");
    assert.include(commandScript, "--json");
  });

  it("supports direct agent bootstrap with injected runtime env", async function () {
    const commands: Array<{ command: string; args: string[] }> = [];
    const bridge = new SkillRunnerCtlBridge({
      runCommand: async (args) => {
        commands.push({ command: args.command, args: args.args });
        return {
          exitCode: 0,
          stdout: "agent ensure finished",
          stderr: "",
        };
      },
    });

    const result = await bridge.runDirectAgentBootstrap({
      installDir: `C:\\SkillRunner\\releases\\${DEFAULT_LOCAL_RUNTIME_VERSION}`,
    });

    assert.isTrue(result.ok);
    assert.equal(commands.length, 1);
    const commandScript = commands[0].args.join(" ");
    assert.include(commandScript, "scripts/agent_manager.py");
    assert.include(commandScript, "SKILL_RUNNER_DATA_DIR");
    assert.include(
      String(result.details?.bootstrap_report_file || ""),
      "agent_bootstrap_report.json",
    );
  });

  it("retries direct bootstrap once when uv venv is broken (missing pyvenv.cfg)", async function () {
    let callCount = 0;
    const bridge = new SkillRunnerCtlBridge({
      runCommand: async () => {
        callCount += 1;
        if (callCount === 1) {
          return {
            exitCode: 2,
            stdout: "",
            stderr:
              "error: Querying Python at `C:\\\\Users\\\\u\\\\agent-cache\\\\uv_venv\\\\Scripts\\\\python.exe` failed with exit status exit code: 106\n\n[stderr]\nfailed to locate pyvenv.cfg: ?????",
          };
        }
        return {
          exitCode: 0,
          stdout: "agent ensure finished",
          stderr: "",
        };
      },
    });

    const result = await bridge.runDirectAgentBootstrap({
      installDir: `C:\\SkillRunner\\releases\\${DEFAULT_LOCAL_RUNTIME_VERSION}`,
    });

    assert.equal(callCount, 2);
    assert.isTrue(result.ok);
    assert.equal(result.details?.retry_attempted, true);
    assert.equal(result.details?.retry_reason, "broken-uv-venv-pyvenv-cfg");
  });

  it("supports preflight command with host/port/fallback args", async function () {
    const commands: Array<{ command: string; args: string[] }> = [];
    const bridge = new SkillRunnerCtlBridge({
      runCommand: async (args) => {
        commands.push({ command: args.command, args: args.args });
        return {
          exitCode: 0,
          stdout: JSON.stringify({
            ok: true,
            exit_code: 0,
            message: "Preflight completed.",
          }),
          stderr: "",
        };
      },
    });

    const result = await bridge.runCtlCommand({
      ctlPath: "C:\\SkillRunner\\scripts\\skill-runnerctl.ps1",
      command: "preflight",
      host: "127.0.0.1",
      port: 29813,
      portFallbackSpan: 10,
    });

    assert.isTrue(result.ok);
    assert.equal(commands.length, 1);
    const commandScript = commands[0].args.join(" ");
    assert.include(commandScript, "preflight");
    assert.include(commandScript, "--host");
    assert.include(commandScript, "127.0.0.1");
    assert.include(commandScript, "--port");
    assert.include(commandScript, "29813");
    assert.include(commandScript, "--port-fallback-span");
    assert.include(commandScript, "10");
    assert.include(commandScript, "--json");
  });

  it("preflight accepts available port via mozilla server-socket probe", async function () {
    const fs = await import("fs/promises");
    const os = await import("os");
    const path = await import("path");
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zotero-skills-bridge-preflight-"),
    );
    const installDir = path.join(
      tempRoot,
      "releases",
      DEFAULT_LOCAL_RUNTIME_VERSION,
    );
    const serverDir = path.join(installDir, "server");
    const scriptsDir = path.join(installDir, "scripts");
    const dataDir = path.join(tempRoot, "data");
    const reportPath = path.join(dataDir, "agent_bootstrap_report.json");
    await fs.mkdir(serverDir, { recursive: true });
    await fs.mkdir(scriptsDir, { recursive: true });
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(serverDir, "main.py"), "# mock\n", "utf8");
    await fs.writeFile(
      path.join(scriptsDir, "agent_manager.py"),
      "# mock\n",
      "utf8",
    );
    await fs.writeFile(
      reportPath,
      JSON.stringify({ summary: { outcome: "ok" } }, null, 2),
      "utf8",
    );
    const runtime = globalThis as {
      Components?: {
        classes?: Record<
          string,
          { createInstance?: (iface: unknown) => unknown }
        >;
        interfaces?: Record<string, unknown>;
      };
      Cc?: Record<string, { createInstance?: (iface: unknown) => unknown }>;
      Ci?: Record<string, unknown>;
    };
    const prevCc = runtime.Cc;
    const prevCi = runtime.Ci;
    const prevComponents = runtime.Components;
    let socketInitCount = 0;
    runtime.Cc = {
      ...(prevCc || {}),
      "@mozilla.org/network/server-socket;1": {
        createInstance: () => ({
          init: () => {
            socketInitCount += 1;
          },
          close: () => {
            // no-op
          },
        }),
      },
    };
    runtime.Ci = {
      ...(prevCi || {}),
      nsIServerSocket: {},
    };
    let prevComponentsDescriptor: PropertyDescriptor | undefined;
    if (prevComponents) {
      prevComponentsDescriptor = redefineGlobalProperty("Components", {
        ...prevComponents,
        classes: runtime.Cc,
        interfaces: runtime.Ci,
      });
    }
    try {
      const bridge = new SkillRunnerCtlBridge({
        runCommand: async () => ({
          exitCode: 0,
          stdout: "",
          stderr: "",
        }),
      });
      const result = await bridge.preflightLocalRuntime({
        installDir,
        localRoot: tempRoot,
        host: "127.0.0.1",
        port: 29813,
        portFallbackSpan: 0,
      });
      assert.isTrue(result.ok);
      assert.equal(socketInitCount, 1);
      const checks = result.details?.checks as Record<string, unknown>;
      const port = checks?.port as Record<string, unknown>;
      const dependencies = checks?.dependencies as Record<string, unknown>;
      assert.equal(dependencies?.tar, true);
      assert.equal(Number(port?.selected_port || 0), 29813);
    } finally {
      if (typeof prevCc === "undefined") {
        delete runtime.Cc;
      } else {
        runtime.Cc = prevCc;
      }
      if (typeof prevCi === "undefined") {
        delete runtime.Ci;
      } else {
        runtime.Ci = prevCi;
      }
      if (typeof prevComponents === "undefined") {
        delete runtime.Components;
      } else if (prevComponentsDescriptor) {
        restoreGlobalProperty("Components", prevComponentsDescriptor);
      }
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("passes --port-fallback-span when running ctl up", async function () {
    const commands: Array<{ command: string; args: string[] }> = [];
    const bridge = new SkillRunnerCtlBridge({
      runCommand: async (args) => {
        commands.push({ command: args.command, args: args.args });
        return {
          exitCode: 0,
          stdout: JSON.stringify({
            ok: true,
            exit_code: 0,
            message: "Local runtime started.",
          }),
          stderr: "",
        };
      },
    });

    const result = await bridge.runCtlCommand({
      ctlPath: "C:\\SkillRunner\\scripts\\skill-runnerctl.ps1",
      command: "up",
      mode: "local",
      host: "127.0.0.1",
      port: 29813,
      portFallbackSpan: 10,
    });

    assert.isTrue(result.ok);
    assert.equal(commands.length, 1);
    const commandScript = commands[0].args.join(" ");
    assert.include(commandScript, "--port-fallback-span");
    assert.include(commandScript, "10");
  });

  it("prefers mozilla subprocess execution for windows powershell ctl commands", async function () {
    const runtime = globalThis as {
      Zotero?: {
        isWin?: boolean;
        Utilities?: {
          Internal?: {
            subprocess?: (command: string, args?: string[]) => Promise<string>;
          };
        };
      };
      ChromeUtils?: {
        import?: (url: string) => {
          Subprocess?: {
            call?: (args: {
              command: string;
              arguments?: string[];
            }) => Promise<{
              stdout?: unknown;
              stderr?: unknown;
              wait?: () => Promise<number>;
            }>;
          };
        };
      };
      IOUtils?: {
        exists?: (path: string) => Promise<boolean>;
      };
    };
    const zoteroRuntime = runtime.Zotero as {
      isWin?: boolean;
      Utilities?: {
        Internal?: {
          subprocess?: (command: string, args?: string[]) => Promise<string>;
        };
      };
    };
    const prevIsWin = zoteroRuntime?.isWin;
    const prevSubprocess = zoteroRuntime?.Utilities?.Internal?.subprocess;
    const prevChromeUtils = runtime.ChromeUtils;
    const prevIOUtils = runtime.IOUtils;
    let zoteroCallCount = 0;
    let mozillaCallCount = 0;
    runtime.ChromeUtils = {
      import: () => ({
        Subprocess: {
          call: async () => {
            mozillaCallCount += 1;
            return {
              stdout: {
                text: JSON.stringify({
                  ok: true,
                  exit_code: 0,
                  message: "Local runtime status: running.",
                  status: "running",
                }),
              },
              stderr: { text: "" },
              wait: async () => 0,
            };
          },
        },
      }),
    };
    runtime.IOUtils = {
      exists: async (path: string) =>
        /skill-runnerctl\.ps1$/i.test(String(path || "")),
    };
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = true;
    zoteroRuntime.Utilities = zoteroRuntime.Utilities || {};
    zoteroRuntime.Utilities.Internal = zoteroRuntime.Utilities.Internal || {};
    zoteroRuntime.Utilities.Internal.subprocess = async () => {
      zoteroCallCount += 1;
      throw new Error("zotero subprocess should not be used");
    };
    try {
      const bridge = new SkillRunnerCtlBridge();
      const result = await bridge.runCtlCommand({
        ctlPath: "C:\\SkillRunner\\scripts\\skill-runnerctl.ps1",
        command: "status",
        mode: "local",
        port: 8000,
      });
      assert.isTrue(result.ok);
      assert.equal(String(result.details?.status || ""), "running");
      assert.equal(mozillaCallCount, 1);
      assert.equal(zoteroCallCount, 0);
    } finally {
      if (zoteroRuntime) {
        zoteroRuntime.isWin = prevIsWin;
        if (!zoteroRuntime.Utilities) {
          zoteroRuntime.Utilities = {};
        }
        if (!zoteroRuntime.Utilities.Internal) {
          zoteroRuntime.Utilities.Internal = {};
        }
        if (typeof prevSubprocess === "undefined") {
          delete zoteroRuntime.Utilities.Internal.subprocess;
        } else {
          zoteroRuntime.Utilities.Internal.subprocess = prevSubprocess;
        }
      }
      if (typeof prevChromeUtils === "undefined") {
        delete runtime.ChromeUtils;
      } else {
        runtime.ChromeUtils = prevChromeUtils;
      }
      if (typeof prevIOUtils === "undefined") {
        delete runtime.IOUtils;
      } else {
        runtime.IOUtils = prevIOUtils;
      }
    }
  });

  it("wraps windows powershell script execution with PATH/npm bootstrap command", async function () {
    const runtime = globalThis as {
      Zotero?: { isWin?: boolean };
    };
    const prevIsWin = runtime.Zotero?.isWin;
    if (!runtime.Zotero) {
      throw new Error("zotero runtime unavailable");
    }
    runtime.Zotero.isWin = true;
    const commands: Array<{ command: string; args: string[] }> = [];
    try {
      const bridge = new SkillRunnerCtlBridge({
        runCommand: async (args) => {
          commands.push({
            command: args.command,
            args: args.args,
          });
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              exit_code: 0,
              status: "running",
            }),
            stderr: "",
          };
        },
      });
      await bridge.runCtlCommand({
        ctlPath: "C:\\SkillRunner\\scripts\\skill-runnerctl.ps1",
        command: "status",
        mode: "local",
        port: 8000,
      });
    } finally {
      if (runtime.Zotero) {
        runtime.Zotero.isWin = prevIsWin;
      }
    }

    assert.equal(commands.length, 1);
    const first = commands[0];
    assert.equal(first.command, "powershell.exe");
    assert.include(first.args, "-Command");
    const commandScript = first.args[first.args.length - 1] || "";
    assert.include(commandScript, "Get-Command npm");
    assert.include(commandScript, "$env:PATH");
    assert.include(commandScript, "skill-runnerctl.ps1");
  });

  it("runs generic system command for release extraction", async function () {
    const bridge = new SkillRunnerCtlBridge({
      runCommand: async () => ({
        exitCode: 0,
        stdout: "ok",
        stderr: "",
      }),
    });

    const result = await bridge.runSystemCommand({
      command: "tar",
      args: ["-xzf", "artifact.tar.gz", "-C", "/tmp/release"],
    });

    assert.isTrue(result.ok);
    assert.equal(result.command, "tar");
    assert.equal(result.exitCode, 0);
  });

  it("uses hidden nsIProcess wrapper first for windows release extraction command", async function () {
    const runtime = globalThis as {
      Zotero?: { isWin?: boolean };
      IOUtils?: {
        exists?: (path: string) => Promise<boolean>;
      };
      Cc?: Record<string, { createInstance?: (iface: unknown) => unknown }>;
      Ci?: Record<string, unknown>;
      Components?: {
        classes?: Record<
          string,
          { createInstance?: (iface: unknown) => unknown }
        >;
        interfaces?: Record<string, unknown>;
      };
      ChromeUtils?: {
        import?: (url: string) => { Subprocess?: unknown };
      };
    };
    const previousIsWin = runtime.Zotero?.isWin;
    const previousIOUtils = runtime.IOUtils;
    const previousCc = runtime.Cc;
    const previousCi = runtime.Ci;
    const previousComponents = runtime.Components;
    const previousComponentsDescriptor = Object.getOwnPropertyDescriptor(
      runtime,
      "Components",
    );
    const previousChromeUtils = runtime.ChromeUtils;
    let runCount = 0;
    let executablePath = "";
    runtime.IOUtils = {
      exists: async (path: string) => /[\\/]tar\.exe$/i.test(path),
    };
    runtime.Cc = {
      "@mozilla.org/file/local;1": {
        createInstance: () => ({
          initWithPath: (path: string) => {
            executablePath = path;
          },
        }),
      },
      "@mozilla.org/process/util;1": {
        createInstance: () => ({
          exitValue: 0,
          init: () => {
            // no-op
          },
          runwAsync: (
            _args: string[],
            _count: number,
            observer: { observe?: (subject: unknown, topic: string) => void },
          ) => {
            runCount += 1;
            observer.observe?.(null, "process-finished");
          },
        }),
      },
    };
    runtime.Ci = {
      ...(previousCi || {}),
      nsIFile: {},
      nsIProcess: {},
    };
    redefineGlobalProperty("Components", {
      ...(previousComponents || {}),
      classes: runtime.Cc,
      interfaces: runtime.Ci,
    });
    runtime.ChromeUtils = {
      import: () => {
        throw new Error("mozilla subprocess should not be used");
      },
    };
    if (!runtime.Zotero) {
      throw new Error("zotero runtime unavailable");
    }
    runtime.Zotero.isWin = true;
    try {
      const bridge = new SkillRunnerCtlBridge();
      const result = await bridge.runSystemCommand({
        command: "tar",
        args: ["-xzf", "a.tar.gz", "-C", "C:\\tmp\\release"],
      });
      assert.isTrue(result.ok);
      assert.equal(runCount, 1);
      assert.match(executablePath, /[\\/]tar\.exe$/i);
    } finally {
      if (runtime.Zotero) {
        runtime.Zotero.isWin = previousIsWin;
      }
      if (typeof previousIOUtils === "undefined") {
        delete runtime.IOUtils;
      } else {
        runtime.IOUtils = previousIOUtils;
      }
      if (typeof previousCc === "undefined") {
        delete runtime.Cc;
      } else {
        runtime.Cc = previousCc;
      }
      if (typeof previousCi === "undefined") {
        delete runtime.Ci;
      } else {
        runtime.Ci = previousCi;
      }
      restoreGlobalProperty("Components", previousComponentsDescriptor);
      if (typeof previousChromeUtils === "undefined") {
        delete runtime.ChromeUtils;
      } else {
        runtime.ChromeUtils = previousChromeUtils;
      }
    }
  });

  it("falls through to zotero subprocess when mozilla subprocess returns executable-not-found stderr", async function () {
    const runtime = globalThis as {
      Zotero?: {
        isWin?: boolean;
        Utilities?: {
          Internal?: {
            subprocess?: (command: string, args?: string[]) => Promise<string>;
          };
        };
      };
      ChromeUtils?: {
        import?: (url: string) => {
          Subprocess?: {
            call?: (args: {
              command: string;
              arguments?: string[];
            }) => Promise<{
              stdout?: unknown;
              stderr?: unknown;
              wait?: () => Promise<number>;
            }>;
          };
        };
      };
      IOUtils?: {
        exists?: (path: string) => Promise<boolean>;
      };
    };
    const zoteroRuntime = runtime.Zotero as {
      isWin?: boolean;
      Utilities?: {
        Internal?: {
          subprocess?: (command: string, args?: string[]) => Promise<string>;
        };
      };
    };
    const prevIsWin = zoteroRuntime?.isWin;
    const prevSubprocess = zoteroRuntime?.Utilities?.Internal?.subprocess;
    const prevChromeUtils = runtime.ChromeUtils;
    const prevIOUtils = runtime.IOUtils;
    const calls: string[] = [];
    runtime.IOUtils = {
      exists: async () => false,
    };
    runtime.ChromeUtils = {
      import: () => ({
        Subprocess: {
          call: async () => ({
            stdout: { text: "" },
            stderr: { text: "Executable not found: tar" },
            wait: async () => 1,
          }),
        },
      }),
    };
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = true;
    zoteroRuntime.Utilities = zoteroRuntime.Utilities || {};
    zoteroRuntime.Utilities.Internal = zoteroRuntime.Utilities.Internal || {};
    zoteroRuntime.Utilities.Internal.subprocess = async (command: string) => {
      calls.push(command);
      if (command === "tar") {
        throw new Error("Executable not found: tar");
      }
      if (/(^|[\\/])tar$/i.test(command)) {
        throw new Error(
          `File at path "${command}" does not exist, or is not executable`,
        );
      }
      if (/(^|[\\/])tar\.exe$/i.test(command)) {
        return "";
      }
      throw new Error(`Executable not found: ${command}`);
    };
    try {
      const bridge = new SkillRunnerCtlBridge();
      const result = await bridge.runSystemCommand({
        command: "tar",
        args: ["-xzf", "a.tar.gz", "-C", "C:\\tmp\\release"],
      });
      assert.isTrue(result.ok);
      assert.isAtLeast(calls.length, 2);
      assert.isTrue(calls.includes("tar"));
      assert.isTrue(calls.some((entry) => /(^|[\\/])tar\.exe$/i.test(entry)));
    } finally {
      if (zoteroRuntime) {
        zoteroRuntime.isWin = prevIsWin;
        if (!zoteroRuntime.Utilities) {
          zoteroRuntime.Utilities = {};
        }
        if (!zoteroRuntime.Utilities.Internal) {
          zoteroRuntime.Utilities.Internal = {};
        }
        if (typeof prevSubprocess === "undefined") {
          delete zoteroRuntime.Utilities.Internal.subprocess;
        } else {
          zoteroRuntime.Utilities.Internal.subprocess = prevSubprocess;
        }
      }
      if (typeof prevChromeUtils === "undefined") {
        delete runtime.ChromeUtils;
      } else {
        runtime.ChromeUtils = prevChromeUtils;
      }
      if (typeof prevIOUtils === "undefined") {
        delete runtime.IOUtils;
      } else {
        runtime.IOUtils = prevIOUtils;
      }
    }
  });

  it("falls back to absolute windows tar path when bare tar is not found in zotero subprocess", async function () {
    const runtime = globalThis as {
      Zotero?: {
        isWin?: boolean;
        Utilities?: {
          Internal?: {
            subprocess?: (command: string, args?: string[]) => Promise<string>;
          };
        };
      };
      ChromeUtils?: {
        import?: (url: string) => { Subprocess?: unknown };
      };
      IOUtils?: {
        exists?: (path: string) => Promise<boolean>;
      };
    };
    const zoteroRuntime = runtime.Zotero as {
      isWin?: boolean;
      Utilities?: {
        Internal?: {
          subprocess?: (command: string, args?: string[]) => Promise<string>;
        };
      };
    };
    const prevIsWin = zoteroRuntime?.isWin;
    const prevSubprocess = zoteroRuntime?.Utilities?.Internal?.subprocess;
    const prevChromeUtils = runtime.ChromeUtils;
    const prevIOUtils = runtime.IOUtils;
    const calls: string[] = [];
    runtime.IOUtils = {
      exists: async () => false,
    };
    runtime.ChromeUtils = {
      import: () => {
        throw new Error("mozilla subprocess unavailable");
      },
    };
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = true;
    zoteroRuntime.Utilities = zoteroRuntime.Utilities || {};
    zoteroRuntime.Utilities.Internal = zoteroRuntime.Utilities.Internal || {};
    zoteroRuntime.Utilities.Internal.subprocess = async (command: string) => {
      calls.push(command);
      if (command === "tar") {
        throw new Error("Executable not found: tar");
      }
      if (/(^|[\\/])tar\.exe$/i.test(command)) {
        return "";
      }
      throw new Error(`Executable not found: ${command}`);
    };
    try {
      const bridge = new SkillRunnerCtlBridge();
      const result = await bridge.runSystemCommand({
        command: "tar",
        args: ["-xzf", "a.tar.gz", "-C", "C:\\tmp\\release"],
      });
      assert.isTrue(result.ok);
      assert.isAtLeast(calls.length, 2);
      assert.isTrue(calls.includes("tar"));
      assert.isTrue(calls.some((entry) => /(^|[\\/])tar\.exe$/i.test(entry)));
    } finally {
      if (!zoteroRuntime) {
        // no-op
      } else {
        zoteroRuntime.isWin = prevIsWin;
        if (!zoteroRuntime.Utilities) {
          zoteroRuntime.Utilities = {};
        }
        if (!zoteroRuntime.Utilities.Internal) {
          zoteroRuntime.Utilities.Internal = {};
        }
        if (typeof prevSubprocess === "undefined") {
          delete zoteroRuntime.Utilities.Internal.subprocess;
        } else {
          zoteroRuntime.Utilities.Internal.subprocess = prevSubprocess;
        }
      }
      if (typeof prevChromeUtils === "undefined") {
        delete runtime.ChromeUtils;
      } else {
        runtime.ChromeUtils = prevChromeUtils;
      }
      if (typeof prevIOUtils === "undefined") {
        delete runtime.IOUtils;
      } else {
        runtime.IOUtils = prevIOUtils;
      }
    }
  });

  it("resolves command path via windows Get-Command before fallback candidates", async function () {
    const runtime = globalThis as {
      Zotero?: {
        isWin?: boolean;
        Utilities?: {
          Internal?: {
            subprocess?: (command: string, args?: string[]) => Promise<string>;
          };
        };
      };
      ChromeUtils?: {
        import?: (url: string) => { Subprocess?: unknown };
      };
      IOUtils?: {
        exists?: (path: string) => Promise<boolean>;
      };
    };
    const zoteroRuntime = runtime.Zotero as {
      isWin?: boolean;
      Utilities?: {
        Internal?: {
          subprocess?: (command: string, args?: string[]) => Promise<string>;
        };
      };
    };
    const prevIsWin = zoteroRuntime?.isWin;
    const prevSubprocess = zoteroRuntime?.Utilities?.Internal?.subprocess;
    const prevChromeUtils = runtime.ChromeUtils;
    const prevIOUtils = runtime.IOUtils;
    const calls: string[] = [];
    runtime.IOUtils = {
      exists: async () => false,
    };
    runtime.ChromeUtils = {
      import: () => {
        throw new Error("mozilla subprocess unavailable");
      },
    };
    if (!zoteroRuntime) {
      throw new Error("zotero runtime unavailable");
    }
    zoteroRuntime.isWin = true;
    zoteroRuntime.Utilities = zoteroRuntime.Utilities || {};
    zoteroRuntime.Utilities.Internal = zoteroRuntime.Utilities.Internal || {};
    zoteroRuntime.Utilities.Internal.subprocess = async (
      command: string,
      args?: string[],
    ) => {
      calls.push(command);
      if (command.toLowerCase().includes("powershell")) {
        const joinedArgs = (args || []).join(" ");
        if (joinedArgs.includes("Get-Command")) {
          return "C:\\Windows\\System32\\tar.exe\n";
        }
      }
      if (/(^|[\\/])tar\.exe$/i.test(command)) {
        return "";
      }
      throw new Error(`Executable not found: ${command}`);
    };
    try {
      const bridge = new SkillRunnerCtlBridge();
      const result = await bridge.runSystemCommand({
        command: "tar",
        args: ["-xzf", "a.tar.gz", "-C", "C:\\tmp\\release"],
      });
      assert.isTrue(result.ok);
      assert.isTrue(
        calls.some((entry) => entry.toLowerCase().includes("powershell")),
      );
      assert.isTrue(calls.some((entry) => /(^|[\\/])tar\.exe$/i.test(entry)));
    } finally {
      if (zoteroRuntime) {
        zoteroRuntime.isWin = prevIsWin;
        if (!zoteroRuntime.Utilities) {
          zoteroRuntime.Utilities = {};
        }
        if (!zoteroRuntime.Utilities.Internal) {
          zoteroRuntime.Utilities.Internal = {};
        }
        if (typeof prevSubprocess === "undefined") {
          delete zoteroRuntime.Utilities.Internal.subprocess;
        } else {
          zoteroRuntime.Utilities.Internal.subprocess = prevSubprocess;
        }
      }
      if (typeof prevChromeUtils === "undefined") {
        delete runtime.ChromeUtils;
      } else {
        runtime.ChromeUtils = prevChromeUtils;
      }
      if (typeof prevIOUtils === "undefined") {
        delete runtime.IOUtils;
      } else {
        runtime.IOUtils = prevIOUtils;
      }
    }
  });

  it("keeps legacy windows uninstall script invocation available for compatibility", async function () {
    const runtime = globalThis as {
      Zotero?: { isWin?: boolean };
    };
    const previousIsWin = runtime.Zotero?.isWin;
    if (!runtime.Zotero) {
      throw new Error("zotero runtime unavailable");
    }
    runtime.Zotero.isWin = true;
    const commands: Array<{ command: string; args: string[] }> = [];
    try {
      const bridge = new SkillRunnerCtlBridge({
        runCommand: async (args) => {
          commands.push({
            command: args.command,
            args: args.args,
          });
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              exit_code: 0,
              message: "Uninstall completed.",
            }),
            stderr: "",
          };
        },
      });
      const result = await bridge.runUninstallCommand({
        uninstallPath: "C:\\SkillRunner\\scripts\\skill-runner-uninstall.ps1",
        localRoot: "C:\\SkillRunner",
      });
      assert.isTrue(result.ok);
      assert.equal(commands.length, 1);
      assert.equal(commands[0].command, "powershell.exe");
      const script = commands[0].args[commands[0].args.length - 1] || "";
      assert.include(script, "skill-runner-uninstall.ps1");
      assert.include(script, "-Json");
      assert.include(script, "-LocalRoot");
      assert.include(script, "C:\\SkillRunner");
      assert.notInclude(script, "'-Json'");
      assert.notInclude(script, "'-LocalRoot'");
      assert.notInclude(script, "@scriptArgs");
    } finally {
      if (runtime.Zotero) {
        runtime.Zotero.isWin = previousIsWin;
      }
    }
  });

  it("keeps sanitizing suspicious windows uninstall localRoot argument", async function () {
    const runtime = globalThis as {
      Zotero?: { isWin?: boolean };
    };
    const previousIsWin = runtime.Zotero?.isWin;
    if (!runtime.Zotero) {
      throw new Error("zotero runtime unavailable");
    }
    runtime.Zotero.isWin = true;
    const commands: Array<{ command: string; args: string[] }> = [];
    try {
      const bridge = new SkillRunnerCtlBridge({
        runCommand: async (args) => {
          commands.push({
            command: args.command,
            args: args.args,
          });
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              exit_code: 0,
              message: "Uninstall completed.",
            }),
            stderr: "",
          };
        },
      });
      const result = await bridge.runUninstallCommand({
        uninstallPath: "C:\\SkillRunner\\scripts\\skill-runner-uninstall.ps1",
        localRoot: "-Json",
      });
      assert.isTrue(result.ok);
      assert.equal(commands.length, 1);
      const script = commands[0].args[commands[0].args.length - 1] || "";
      assert.include(script, "-Json");
      assert.notInclude(script, "-LocalRoot");
      assert.notInclude(script, "@scriptArgs");
    } finally {
      if (runtime.Zotero) {
        runtime.Zotero.isWin = previousIsWin;
      }
    }
  });

  it("keeps legacy non-windows uninstall script invocation available for compatibility", async function () {
    const runtime = globalThis as {
      Zotero?: { isWin?: boolean };
    };
    const previousIsWin = runtime.Zotero?.isWin;
    if (!runtime.Zotero) {
      throw new Error("zotero runtime unavailable");
    }
    runtime.Zotero.isWin = false;
    const commands: Array<{ command: string; args: string[] }> = [];
    try {
      const bridge = new SkillRunnerCtlBridge({
        runCommand: async (args) => {
          commands.push({
            command: args.command,
            args: args.args,
          });
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              exit_code: 0,
              message: "Uninstall completed.",
            }),
            stderr: "",
          };
        },
      });
      const result = await bridge.runUninstallCommand({
        uninstallPath: "/tmp/skill-runner-uninstall.sh",
        clearData: false,
        clearAgentHome: false,
      });
      assert.isTrue(result.ok);
      assert.equal(commands.length, 1);
      assert.equal(commands[0].command, "sh");
      assert.equal(commands[0].args[0], "/tmp/skill-runner-uninstall.sh");
      assert.include(commands[0].args, "--json");
    } finally {
      if (runtime.Zotero) {
        runtime.Zotero.isWin = previousIsWin;
      }
    }
  });
});

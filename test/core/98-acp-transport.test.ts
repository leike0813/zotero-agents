import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as vm from "node:vm";
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
import {
  resetRuntimeProcessControlSnapshotForTests,
  seedRuntimeProcessControlSnapshotForTests,
} from "../../src/platform/processControl";
import {
  acpWebSocketBridgeServiceInternalsForTests,
  ensureAcpWebSocketBridgeService,
  getAcpWebSocketBridgeSnapshot,
  getAcpWebSocketConstructor,
  resetAcpWebSocketBridgeServiceForTests,
  seedAcpWebSocketBridgeServiceForTests,
  setAcpWebSocketBridgeTestOverridesForTests,
  shutdownAcpWebSocketBridgeService,
  type AcpWebSocketBridgeService,
} from "../../src/modules/acpWebSocketBridgeService";
import { resolveWindowsCommandFromPowerShell } from "../../src/modules/windowsCommandResolution";
import type { BackendInstance } from "../../src/backends/types";

type SubprocessCallInvocation = {
  command: string;
  arguments: string[];
  environment?: Record<string, string>;
};

type FakeWebSocketInstance = {
  url: string;
  sent: Array<string | Uint8Array | ArrayBuffer>;
  closeCalls: number;
  binaryType?: string;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data?: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  send: (data: string | Uint8Array | ArrayBuffer) => void;
  close: () => void;
  emitOpen: () => void;
  emitMessage: (data: unknown) => void;
  emitError: (event: unknown) => void;
  emitClose: (event?: unknown) => void;
};

function createFakeWebSocketHarness() {
  const instances: FakeWebSocketInstance[] = [];
  class FakeWebSocket implements FakeWebSocketInstance {
    url: string;
    sent: Array<string | Uint8Array | ArrayBuffer> = [];
    closeCalls = 0;
    binaryType?: string;
    onopen: ((event: unknown) => void) | null = null;
    onmessage: ((event: { data?: unknown }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onclose: ((event: unknown) => void) | null = null;

    constructor(url: string) {
      this.url = url;
      instances.push(this);
    }

    send(data: string | Uint8Array | ArrayBuffer) {
      this.sent.push(data);
    }

    close() {
      this.closeCalls += 1;
      this.emitClose();
    }

    emitOpen() {
      this.onopen?.({});
    }

    emitMessage(data: unknown) {
      this.onmessage?.({ data });
    }

    emitError(event: unknown) {
      this.onerror?.(event);
    }

    emitClose(event: unknown = {}) {
      this.onclose?.(event);
    }
  }
  return { instances, WebSocketCtor: FakeWebSocket };
}

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
  assert.isTrue(
    commandLine.startsWith('""') && commandLine.endsWith('""'),
    "cmd /s /c payload must be outer-quoted so quoted shim paths survive",
  );
  assert.include(commandLine, `"${args.expectedCommand.replace(/"/g, '""')}"`);
  for (const expectedArg of args.expectedArgs) {
    assert.include(commandLine, `"${expectedArg.replace(/"/g, '""')}"`);
  }
  assert.notInclude(commandLine, '\\"');
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

async function waitForFakeSocket(instances: FakeWebSocketInstance[]) {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (instances[0]) {
      return instances[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Fake WebSocket was not created");
}

function seedFakeBridgeService(): AcpWebSocketBridgeService {
  const service = {
    url: "ws://127.0.0.1:34567/v1/acp?token=test-secret-token",
    pid: 4242,
    proc: {
      wait: async () => new Promise(() => undefined),
      kill: () => undefined,
    },
    binaryPath: "D:\\Runtime\\bin\\zotero-acp-bridge.exe",
    readyFile: "D:\\Runtime\\tmp\\acp-websocket-bridge\\ready.json",
    logFile: "D:\\Runtime\\tmp\\acp-websocket-bridge\\bridge.log",
    startedAt: "2026-06-28T00:00:00.000Z",
    closed: new Promise<void>(() => undefined),
  } as AcpWebSocketBridgeService;
  seedAcpWebSocketBridgeServiceForTests(service);
  return service;
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
    resetRuntimeProcessControlSnapshotForTests();
    setAcpWebSocketBridgeTestOverridesForTests();
  });

  afterEach(async function () {
    resetRuntimeCommandRegistryForTests();
    resetRuntimeEnvironmentSnapshotForTests();
    resetRuntimeProcessControlSnapshotForTests();
    await resetAcpWebSocketBridgeServiceForTests();
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
    assert.include(plan.args[3] || "", '""C:\\Program Files\\nodejs\\npx.cmd"');
  });

  it("prefers node-direct npx-cli launch for Windows npx ACP backends when available", function () {
    const plan = buildAcpLaunchPlanForTests({
      command: "npx",
      resolvedCommand: "C:\\Program Files\\nodejs\\npx.ps1",
      args: ["opencode-ai@latest", "acp"],
      platform: "win32",
      resolution: {
        command: "npx",
        available: true,
        resolvedPath: "C:\\Program Files\\nodejs\\npx.ps1",
        source: "path",
        checkedCandidates: [],
        launch: {
          mode: "powershell",
          command: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
          args: ["-File", "C:\\Program Files\\nodejs\\npx.ps1"],
          environment: { PATH: "C:\\Program Files\\nodejs" },
          commandLine:
            '"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -File "C:\\Program Files\\nodejs\\npx.ps1"',
        },
      },
      nodeDirectNpx: {
        nodePath: "C:\\Program Files\\nodejs\\node.exe",
        npxCliPath:
          "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
      },
    });

    assert.equal(plan.mode, "direct");
    assert.equal(plan.command, "C:\\Program Files\\nodejs\\node.exe");
    assert.deepEqual(plan.args, [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
      "-y",
      "opencode-ai@latest",
      "acp",
    ]);
    assert.deepEqual(plan.environment, { PATH: "C:\\Program Files\\nodejs" });
    assert.equal(plan.commandLabel, "npx -y opencode-ai@latest acp");
    assert.include(plan.commandLine, "node.exe");
    assert.include(plan.commandLine, "npx-cli.js");
    assert.notInclude(plan.commandLine, "pwsh.exe");
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

  it("starts Mozilla stderr capture before process identity discovery settles", async function () {
    let releaseIdentityQuery!: () => void;
    const identityQueryGate = new Promise<void>((resolve) => {
      releaseIdentityQuery = resolve;
    });
    let stderrCaptureStarted = false;
    let identityQueryStarted = false;
    const callCommands: string[] = [];
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-07-15T00:00:00.000Z",
      commands: {
        agent: {
          command: "agent",
          available: true,
          resolvedPath: "/usr/bin/agent",
          checkedCandidates: [],
        },
        ps: {
          command: "ps",
          available: true,
          resolvedPath: "/bin/ps",
          checkedCandidates: [],
        },
      },
    });
    seedRuntimeProcessControlSnapshotForTests({
      initialized: true,
      initializedAt: "2026-07-15T00:00:00.000Z",
      platform: "linux",
      preferredCleanupStrategy: "direct-kill-only",
      supportsProcessTreeCleanup: false,
      supportsProcessGroupLaunch: false,
      supportsNegativePidSignal: false,
      supportsPidFileSupervisor: false,
      supportsProcessIdentityQuery: true,
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: false,
      isLinux: true,
    });
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async () => true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async (command: string) =>
            command === "ps" ? "/bin/ps" : "/usr/bin/agent",
          call: async (invocation: { command: string }) => {
            callCommands.push(invocation.command);
            if (/(^|[\\/])ps(?:\.exe)?$/i.test(invocation.command)) {
              identityQueryStarted = true;
              await identityQueryGate;
              return {
                stdout: { readString: async () => "4242 4242 4242\n" },
                stderr: { readString: async () => "" },
                wait: async () => 0,
              };
            }
            let stderrReads = 0;
            return {
              pid: 4242,
              stdin: {
                write: async () => undefined,
                close: async () => undefined,
              },
              stdout: { readString: async () => "" },
              stderr: {
                readString: async () => {
                  stderrCaptureStarted = true;
                  stderrReads += 1;
                  return stderrReads === 1 ? "npm rename ENOTEMPTY _npx\n" : "";
                },
              },
              wait: async () => ({ exitCode: 217 }),
              kill: () => undefined,
            };
          },
        },
      }),
    });

    try {
      const transportPromise = launchAcpTransport({
        backend: {
          id: "acp-fast-exit",
          displayName: "ACP fast exit",
          type: "acp",
          baseUrl: "local://acp-fast-exit",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "/tmp/acp-fast-exit",
      });
      const deadline = Date.now() + 1_000;
      while (!identityQueryStarted && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      assert.isTrue(identityQueryStarted, JSON.stringify(callCommands));
      assert.isTrue(
        stderrCaptureStarted,
        "stderr capture must begin while process identity discovery is pending",
      );
      releaseIdentityQuery();
      const transport = await transportPromise;
      await transport.closed;
      assert.include(transport.getStderrText(), "ENOTEMPTY");
      assert.equal(transport.getExitCode(), 217);
    } finally {
      releaseIdentityQuery();
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("marks a finalized Mozilla close snapshot when pipe drain is bounded", async function () {
    this.timeout(5_000);
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
          call: async () => ({
            stdin: {
              write: async () => undefined,
              close: async () => undefined,
            },
            stdout: { readString: async () => "" },
            stderr: { readString: async () => new Promise(() => undefined) },
            wait: async () => ({ exitCode: 9 }),
            kill: () => undefined,
          }),
        },
      }),
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-hung-stderr",
          displayName: "ACP hung stderr",
          type: "acp",
          baseUrl: "local://acp-hung-stderr",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
      });
      await transport.closed;
      assert.include(transport.getLifecycle(), {
        exitCode: 9,
        pipeDrainCompleted: false,
        pipeDrainTimedOut: true,
      });
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("waits for natural Mozilla subprocess exit before cleanup kill", async function () {
    let killCount = 0;
    let stdinCloseCount = 0;
    let stderrReadCount = 0;
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
          call: async () => ({
            stdin: {
              write: async () => undefined,
              close: async () => {
                stdinCloseCount += 1;
              },
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

      const firstClose = transport.close({ graceMs: 100 });
      const secondClose = transport.close({ graceMs: 100 });
      assert.strictEqual(firstClose, secondClose);
      await firstClose;

      assert.equal(killCount, 0);
      assert.equal(stdinCloseCount, 1);
      assert.equal(transport.getExitCode(), 7);
      assert.include(transport.getStderrText(), "backend failed");
      assert.include(transport.getLifecycle(), {
        exitCode: 7,
        exitSource: "natural-exit",
        killedByClose: false,
        stdinEofStatus: "succeeded",
        gracefulExit: true,
        closeInvocationCount: 2,
        closeReused: true,
      });
    } finally {
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("bounds Mozilla subprocess transport close after cleanup kill", async function () {
    this.timeout(5000);
    let killCount = 0;
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
          call: async () => ({
            stdin: {
              write: async () => undefined,
              close: async () => new Promise(() => undefined),
            },
            stdout: {
              readString: async () => "",
            },
            stderr: {
              readString: async () => "",
            },
            wait: async () => new Promise(() => undefined),
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
      const startedAt = Date.now();

      await transport.close({ graceMs: 0 });

      assert.isBelow(Date.now() - startedAt, 3800);
      assert.equal(killCount, 1);
      assert.include(transport.getLifecycle(), {
        killedByClose: true,
        closeTimedOut: true,
        stdinEofStatus: "timed-out",
      });
      assert.isString(transport.getLifecycle().cleanupKillTimedOutAt);
    } finally {
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("validates POSIX pidfile supervisor identity before process-group cleanup", async function () {
    this.timeout(15000);

    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "acp-supervisor-"));
    const calls: Array<{
      command: string;
      arguments: string[];
    }> = [];
    let publishedPid = 4321;
    let publishedTokenOverride = "";
    let failTermSignal = false;
    let livePgid = 4321;
    let liveSid = 4321;
    let mutateIdentityAfterTerm = false;
    let publishCorruptIdentity = false;
    let liveIdentityUnavailable = false;
    let directKillCount = 0;
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-07-07T00:00:00.000Z",
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
        uv: {
          command: "uv",
          available: true,
          resolvedPath: "/usr/bin/uv",
          checkedCandidates: [],
        },
      },
    });
    seedRuntimeProcessControlSnapshotForTests({
      initialized: true,
      initializedAt: "2026-07-07T00:00:00.000Z",
      platform: "linux",
      preferredCleanupStrategy: "posix-pidfile-supervisor",
      supportsProcessTreeCleanup: true,
      supportsProcessGroupLaunch: true,
      supportsNegativePidSignal: true,
      supportsPidFileSupervisor: true,
      supportsProcessIdentityQuery: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async (command: string) => `/usr/bin/${command}`,
          call: async (invocation: {
            command: string;
            arguments?: string[];
          }) => {
            calls.push({
              command: invocation.command,
              arguments: invocation.arguments || [],
            });
            if (invocation.command === "/usr/bin/setsid") {
              const pidFile = invocation.arguments?.[4] || "";
              const supervisorToken = invocation.arguments?.[5] || "";
              await fs.writeFile(
                pidFile,
                publishCorruptIdentity
                  ? "not-a-supervisor-identity"
                  : `${publishedPid}\n${publishedTokenOverride || supervisorToken}`,
                "utf8",
              );
              return {
                pid: 4321,
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
                wait: async () => new Promise(() => undefined),
                kill: () => {
                  directKillCount += 1;
                },
              };
            }
            if (invocation.command === "/bin/ps") {
              return {
                stdout: {
                  readString: async () =>
                    liveIdentityUnavailable
                      ? ""
                      : `4321 ${livePgid} ${liveSid}\n`,
                },
                stderr: { readString: async () => "" },
                wait: async () => ({ exitCode: 0 }),
              };
            }
            if (failTermSignal && invocation.arguments?.[1] === "TERM") {
              return {
                stdout: { readString: async () => "" },
                stderr: { readString: async () => "" },
                wait: async () => ({ exitCode: 1 }),
              };
            }
            if (
              mutateIdentityAfterTerm &&
              invocation.arguments?.[1] === "TERM"
            ) {
              liveSid = 9876;
            }
            return {
              stdout: {
                readString: async () => "",
              },
              stderr: {
                readString: async () => "",
              },
              wait: async () => ({ exitCode: 0 }),
            };
          },
        },
      }),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: false,
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-uv",
          displayName: "ACP uv",
          type: "acp",
          baseUrl: "local://acp-uv",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });

      await transport.close({ graceMs: 0 });

      const launch = calls[0];
      assert.equal(launch.command, "/usr/bin/setsid");
      assert.deepEqual(launch.arguments.slice(0, 5), [
        "/bin/sh",
        "-c",
        'printf "%s\\n%s" "$$" "$2" > "$1"; shift 2; exec "$@"',
        "zotero-acp-supervisor",
        launch.arguments[4],
      ]);
      assert.isNotEmpty(launch.arguments[5]);
      assert.equal(launch.arguments[6], "/usr/bin/uv");
      assert.deepEqual(launch.arguments.slice(7), [
        "run",
        "--",
        "agent",
        "acp",
      ]);
      const initialSignals = calls.filter(
        (entry) => entry.command === "/bin/kill",
      );
      assert.include(initialSignals[0], {
        command: "/bin/kill",
      });
      assert.deepEqual(initialSignals[0].arguments, [
        "-s",
        "TERM",
        "--",
        "-4321",
      ]);
      assert.deepEqual(initialSignals[1].arguments, [
        "-s",
        "KILL",
        "--",
        "-4321",
      ]);
      assert.include(transport.getLifecycle(), {
        wrapperProneCommand: true,
        processTreeCleanupSupported: true,
        processTreeCleanupStrategy: "posix-pidfile-supervisor",
        processTreeCleanupPid: 4321,
        processTreeCleanupValidation: "validated",
        launchPidValidated: true,
        launchPgidValidated: true,
        launchSidValidated: true,
        termSignalSent: true,
        killRevalidationPerformed: true,
        killSignalSent: true,
        processGroupSignalDelivery: "mozilla-external-kill",
        processGroupSignalTargetPgid: 4321,
        processGroupSignalOperandDelimited: true,
        stdinEofStatus: "succeeded",
      });
      assert.equal(transport.getStdoutText(), "");

      calls.length = 0;
      publishedPid = 9876;
      const mismatchedTransport = await launchAcpTransport({
        backend: {
          id: "acp-uv-mismatch",
          displayName: "ACP uv mismatch",
          type: "acp",
          baseUrl: "local://acp-uv-mismatch",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });

      await mismatchedTransport.close({ graceMs: 0 });

      assert.equal(
        calls.filter((entry) => entry.command === "/bin/kill").length,
        0,
      );
      assert.equal(directKillCount, 1);
      assert.include(mismatchedTransport.getLifecycle(), {
        childPid: 4321,
        processTreeCleanupPid: 9876,
        processTreeCleanupValidation: "rejected",
      });
      assert.include(
        mismatchedTransport.getLifecycle().processTreeCleanupDiagnostic || "",
        "pidfile-pid-mismatch",
      );

      calls.length = 0;
      publishedPid = 4321;
      publishedTokenOverride = "wrong-transport-token";
      const wrongTokenTransport = await launchAcpTransport({
        backend: {
          id: "acp-uv-token-mismatch",
          displayName: "ACP uv token mismatch",
          type: "acp",
          baseUrl: "local://acp-uv-token-mismatch",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });

      await wrongTokenTransport.close({ graceMs: 0 });

      assert.equal(
        calls.filter((entry) => entry.command === "/bin/kill").length,
        0,
      );
      assert.equal(directKillCount, 2);
      assert.include(
        wrongTokenTransport.getLifecycle().processTreeCleanupDiagnostic || "",
        "pidfile-token-mismatch",
      );

      calls.length = 0;
      publishedTokenOverride = "";
      const pgidMismatchTransport = await launchAcpTransport({
        backend: {
          id: "acp-uv-pgid-mismatch",
          displayName: "ACP uv PGID mismatch",
          type: "acp",
          baseUrl: "local://acp-uv-pgid-mismatch",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });
      livePgid = 9999;
      await pgidMismatchTransport.close({ graceMs: 0 });
      assert.equal(
        calls.filter((entry) => entry.command === "/bin/kill").length,
        0,
      );
      assert.equal(
        pgidMismatchTransport.getLifecycle().processTreeCleanupValidationReason,
        "live-pgid-mismatch",
      );
      livePgid = 4321;

      calls.length = 0;
      const sidMismatchTransport = await launchAcpTransport({
        backend: {
          id: "acp-uv-sid-mismatch",
          displayName: "ACP uv SID mismatch",
          type: "acp",
          baseUrl: "local://acp-uv-sid-mismatch",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });
      liveSid = 9999;
      await sidMismatchTransport.close({ graceMs: 0 });
      assert.equal(
        calls.filter((entry) => entry.command === "/bin/kill").length,
        0,
      );
      assert.equal(
        sidMismatchTransport.getLifecycle().processTreeCleanupValidationReason,
        "live-sid-mismatch",
      );
      liveSid = 4321;

      calls.length = 0;
      publishedTokenOverride = "";
      failTermSignal = true;
      const failedTermTransport = await launchAcpTransport({
        backend: {
          id: "acp-uv-term-failure",
          displayName: "ACP uv TERM failure",
          type: "acp",
          baseUrl: "local://acp-uv-term-failure",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });

      await failedTermTransport.close({ graceMs: 0 });

      const groupSignals = calls
        .filter((entry) => entry.command === "/bin/kill")
        .map((entry) => entry.arguments[1]);
      assert.deepEqual(groupSignals, ["TERM"]);
      assert.equal(directKillCount, 5);
      assert.include(
        failedTermTransport.getLifecycle().processTreeCleanupDiagnostic || "",
        "TERM failed",
      );

      calls.length = 0;
      failTermSignal = false;
      mutateIdentityAfterTerm = true;
      const changedIdentityTransport = await launchAcpTransport({
        backend: {
          id: "acp-uv-identity-change",
          displayName: "ACP uv identity change",
          type: "acp",
          baseUrl: "local://acp-uv-identity-change",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });
      await changedIdentityTransport.close({ graceMs: 0 });
      assert.deepEqual(
        calls
          .filter((entry) => entry.command === "/bin/kill")
          .map((entry) => entry.arguments[1]),
        ["TERM"],
      );
      assert.equal(
        changedIdentityTransport.getLifecycle()
          .processTreeCleanupValidationReason,
        "live-sid-mismatch",
      );

      calls.length = 0;
      mutateIdentityAfterTerm = false;
      liveSid = 4321;
      publishCorruptIdentity = true;
      const corruptIdentityTransport = await launchAcpTransport({
        backend: {
          id: "acp-uv-corrupt-identity",
          displayName: "ACP uv corrupt identity",
          type: "acp",
          baseUrl: "local://acp-uv-corrupt-identity",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });
      await corruptIdentityTransport.close({ graceMs: 0 });
      assert.equal(
        calls.filter((entry) => entry.command === "/bin/kill").length,
        0,
      );
      assert.equal(
        corruptIdentityTransport.getLifecycle()
          .processTreeCleanupValidationReason,
        "pidfile-missing-or-invalid",
      );

      calls.length = 0;
      publishCorruptIdentity = false;
      const unavailableIdentityTransport = await launchAcpTransport({
        backend: {
          id: "acp-uv-live-identity-unavailable",
          displayName: "ACP uv live identity unavailable",
          type: "acp",
          baseUrl: "local://acp-uv-live-identity-unavailable",
          command: "uv",
          args: ["run", "--", "agent", "acp"],
        } as BackendInstance,
        cwd,
      });
      liveIdentityUnavailable = true;
      await unavailableIdentityTransport.close({ graceMs: 0 });
      assert.equal(
        calls.filter((entry) => entry.command === "/bin/kill").length,
        0,
      );
      assert.equal(
        unavailableIdentityTransport.getLifecycle()
          .processTreeCleanupValidationReason,
        "live-process-missing",
      );
    } finally {
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("uses cached process-control snapshot for Node process group cleanup", async function () {
    if (process.platform === "win32") {
      this.skip();
    }
    const previousChromeUtils = redefineGlobalProperty(
      "ChromeUtils",
      undefined,
    );
    seedRuntimeCommandRegistryForTests({
      initialized: true,
      initializedAt: "2026-07-07T00:00:00.000Z",
      commands: {
        node: {
          command: "node",
          available: true,
          resolvedPath: process.execPath,
          checkedCandidates: [],
        },
        ps: {
          command: "ps",
          available: true,
          resolvedPath: "/usr/bin/ps",
          checkedCandidates: [],
        },
      },
    });
    seedRuntimeProcessControlSnapshotForTests({
      initialized: true,
      initializedAt: "2026-07-07T00:00:00.000Z",
      platform: process.platform,
      preferredCleanupStrategy: "posix-pidfile-supervisor",
      supportsProcessTreeCleanup: true,
      supportsProcessGroupLaunch: true,
      supportsNegativePidSignal: true,
      supportsPidFileSupervisor: true,
      supportsProcessIdentityQuery: true,
    });

    try {
      const transport = await launchAcpTransport({
        backend: {
          id: "acp-node",
          displayName: "ACP Node",
          type: "acp",
          baseUrl: "local://acp-node",
          command: "node",
          args: ["-e", "setInterval(() => undefined, 1000);"],
        } as BackendInstance,
        cwd: process.cwd(),
      });
      const unrelatedTransport = await launchAcpTransport({
        backend: {
          id: "acp-node-unrelated",
          displayName: "ACP Node unrelated",
          type: "acp",
          baseUrl: "local://acp-node-unrelated",
          command: "node",
          args: ["-e", "setInterval(() => undefined, 1000);"],
        } as BackendInstance,
        cwd: process.cwd(),
      });

      await transport.close({ graceMs: 0 });
      assert.isFalse(await unrelatedTransport.waitForExit(1));

      assert.include(transport.getLifecycle(), {
        processTreeCleanupSupported: true,
        processTreeCleanupStrategy: "node-process-group",
        processTreeCleanupValidation: "validated",
        launchPidValidated: true,
        launchPgidValidated: true,
        launchSidValidated: true,
        termSignalSent: true,
        processGroupSignalDelivery: "node-direct",
        processGroupSignalOperandDelimited: false,
        killedByClose: true,
      });
      assert.notEqual(transport.getLifecycle().directSubprocessFallback, true);
      assert.isNumber(transport.getLifecycle().childPid);
      await unrelatedTransport.close({ graceMs: 0 });
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("keeps external negative-PGID actuation behind the safe process-control builder", async function () {
    const transportSource = await fs.readFile(
      path.join(process.cwd(), "src/modules/acpTransport.ts"),
      "utf8",
    );
    const processControlSource = await fs.readFile(
      path.join(process.cwd(), "src/platform/processControl.ts"),
      "utf8",
    );

    assert.notMatch(
      transportSource,
      /arguments:\s*\[\s*`-\$\{args\.signal\}`\s*,\s*`-\$\{args\.pid\}`/u,
    );
    assert.include(transportSource, "buildPosixProcessGroupSignalInvocation");
    assert.include(
      processControlSource,
      'arguments: ["-s", signal, "--", `-${target.pgid}`]',
    );
  });

  it("bounds ACP WebSocket bridge service shutdown when process wait never settles", async function () {
    let killCount = 0;
    const service = {
      url: "ws://127.0.0.1:34567/v1/acp?token=test-secret-token",
      pid: 4242,
      proc: {
        wait: async () => new Promise(() => undefined),
        kill: () => {
          killCount += 1;
        },
      },
      binaryPath: "D:\\Runtime\\bin\\zotero-acp-bridge.exe",
      readyFile: "D:\\Runtime\\tmp\\acp-websocket-bridge\\ready.json",
      logFile: "D:\\Runtime\\tmp\\acp-websocket-bridge\\bridge.log",
      startedAt: "2026-06-28T00:00:00.000Z",
      closed: new Promise<void>(() => undefined),
    } as AcpWebSocketBridgeService;
    seedAcpWebSocketBridgeServiceForTests(service);
    const startedAt = Date.now();

    await shutdownAcpWebSocketBridgeService();

    assert.isBelow(Date.now() - startedAt, 1600);
    assert.equal(killCount, 1);
    assert.isNull(getAcpWebSocketBridgeSnapshot());
  });

  it("uses the Windows ACP WebSocket bridge when enabled in Zotero runtime", async function () {
    const harness = createFakeWebSocketHarness();
    seedWindowsLoginEnvironmentForTransportTests();
    seedFakeBridgeService();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Program Files\\nodejs\\npx.cmd",
          call: async () => {
            throw new Error(
              "bridge test should not launch ACP backend directly",
            );
          },
        },
      }),
    });

    try {
      const auditEvents: Array<Record<string, unknown>> = [];
      const transportPromise = launchAcpTransport({
        backend: {
          id: "acp-opencode",
          displayName: "OpenCode ACP",
          type: "acp",
          baseUrl: "local://acp-opencode",
          command: "npx",
          args: ["opencode-ai@latest", "acp"],
          env: {
            OPENAI_API_KEY: "backend-secret",
          },
        } as BackendInstance,
        cwd: "D:\\ZoteroData",
        diagnosticCapture: {
          bridgeAuditFile: "D:\\ZoteroData\\.acp\\bridge.ndjson",
          onAuditEvent: (event) => {
            auditEvents.push(event);
          },
        },
      });
      const socket = await waitForFakeSocket(harness.instances);
      assert.equal(
        socket.url,
        "ws://127.0.0.1:34567/v1/acp?token=test-secret-token",
      );
      assert.equal(socket.binaryType, "arraybuffer");

      socket.emitOpen();
      const spawnRequest = JSON.parse(String(socket.sent[0] || ""));
      assert.equal(spawnRequest.type, "spawn");
      assertPowerShellBareCommandLaunch({
        command: spawnRequest.command,
        argv: spawnRequest.args,
        expectedCommand: "npx",
        expectedArgs: ["-y", "opencode-ai@latest", "acp"],
      });
      assert.equal(spawnRequest.cwd, "D:\\ZoteroData");
      assert.equal(
        spawnRequest.auditFile,
        "D:\\ZoteroData\\.acp\\bridge.ndjson",
      );
      assert.include(
        spawnRequest.env.Path || spawnRequest.env.PATH || "",
        "C:\\Users\\tester\\AppData\\Roaming\\npm",
      );
      assert.equal(spawnRequest.env.OPENAI_API_KEY, "backend-secret");

      socket.emitMessage(
        JSON.stringify({ type: "spawned", id: spawnRequest.id, pid: 9001 }),
      );
      const transport = await transportPromise;
      socket.emitMessage(new TextEncoder().encode("hello\n"));
      socket.emitMessage(
        JSON.stringify({
          type: "stderr",
          id: spawnRequest.id,
          dataBase64: Buffer.from("warn\n", "utf8").toString("base64"),
        }),
      );

      const reader = transport.stdout.getReader();
      const first = await reader.read();
      reader.releaseLock();
      assert.isFalse(first.done);
      assert.equal(new TextDecoder().decode(first.value), "hello\n");

      const writer = transport.stdin.getWriter();
      await writer.write(new TextEncoder().encode('{"jsonrpc":"2.0"}\n'));
      writer.releaseLock();
      assert.instanceOf(socket.sent[1], Uint8Array);

      socket.emitMessage(
        JSON.stringify({ type: "exit", id: spawnRequest.id, code: 0 }),
      );
      socket.emitClose();
      await transport.closed;

      assert.equal(transport.getStderrText(), "warn\n");
      assert.include(transport.getLifecycle(), {
        transportKind: "websocket-bridge",
        bridgePid: 4242,
        childPid: 9001,
        exitCode: 0,
        exitSource: "natural-exit",
        processIdentityQuerySupported: false,
        processTreeCleanupValidation: "not-required",
        directSubprocessFallback: false,
        possibleWrapperDescendants: false,
      });
      assert.notInclude(
        transport.getLifecycle().bridgeUrl || "",
        "test-secret-token",
      );
      assert.includeMembers(
        auditEvents.map((event) => String(event.event || "")),
        [
          "launch_plan_built",
          "websocket_open",
          "spawn_request_sent",
          "spawned_received",
          "stdout_frame_received",
          "stderr_control_received",
          "stdin_write",
          "exit_received",
          "websocket_close",
        ],
      );
      const launchAudit = auditEvents.find(
        (event) => event.event === "launch_plan_built",
      );
      assert.notProperty(launchAudit || {}, "commandLine");
      assert.notProperty(launchAudit || {}, "command");
      assert.isTrue(
        auditEvents.every((event) => event.spawnId === spawnRequest.id),
      );
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("closes a Windows bridge socket when spawned startup is canceled or times out", async function () {
    const harness = createFakeWebSocketHarness();
    seedWindowsLoginEnvironmentForTransportTests();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", { isWin: true });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
          call: async () => {
            throw new Error("bridge test should not launch directly");
          },
        },
      }),
    });
    const backend = {
      id: "acp-startup-bound",
      displayName: "ACP Startup Bound",
      type: "acp",
      baseUrl: "local://acp-startup-bound",
      command: "agent",
      args: ["acp"],
    } as BackendInstance;

    try {
      const controller = new AbortController();
      const canceledLaunch = launchAcpTransport({
        backend,
        cwd: "D:\\Canceled",
        startup: { signal: controller.signal, timeoutMs: 60_000 },
      }).then(
        () => null,
        (error) => error,
      );
      const canceledSocket = await waitForFakeSocket(harness.instances);
      canceledSocket.emitOpen();
      controller.abort();
      assert.match(String(await canceledLaunch), /canceled/i);
      assert.equal(canceledSocket.closeCalls, 1);

      const timedOutLaunch = launchAcpTransport({
        backend,
        cwd: "D:\\TimedOut",
        startup: { timeoutMs: 10 },
      }).then(
        () => null,
        (error) => error,
      );
      while (harness.instances.length < 2) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const timedOutSocket = harness.instances[1];
      timedOutSocket.emitOpen();
      assert.match(String(await timedOutLaunch), /timed out.*10 ms/i);
      assert.equal(timedOutSocket.closeCalls, 1);

      timedOutSocket.emitMessage(
        JSON.stringify({ type: "spawned", id: "late", pid: 9002 }),
      );
      assert.equal(timedOutSocket.closeCalls, 1);
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("isolates cancellation between concurrent Windows bridge transports", async function () {
    const harness = createFakeWebSocketHarness();
    seedWindowsLoginEnvironmentForTransportTests();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", { isWin: true });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
          call: async () => {
            throw new Error("bridge test should not launch directly");
          },
        },
      }),
    });
    const backend = {
      id: "acp-concurrent-startup",
      displayName: "ACP Concurrent Startup",
      type: "acp",
      baseUrl: "local://acp-concurrent-startup",
      command: "agent",
      args: ["acp"],
    } as BackendInstance;

    try {
      const firstController = new AbortController();
      const firstPromise = launchAcpTransport({
        backend,
        cwd: "D:\\First",
        startup: { signal: firstController.signal, timeoutMs: 60_000 },
      }).then(
        () => null,
        (error) => error,
      );
      const secondPromise = launchAcpTransport({
        backend,
        cwd: "D:\\Second",
        startup: { timeoutMs: 60_000 },
      });
      while (harness.instances.length < 2) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const [firstSocket, secondSocket] = harness.instances;
      firstSocket.emitOpen();
      secondSocket.emitOpen();
      const secondSpawn = JSON.parse(String(secondSocket.sent[0] || ""));

      firstController.abort();
      secondSocket.emitMessage(
        JSON.stringify({ type: "spawned", id: secondSpawn.id, pid: 9003 }),
      );
      assert.match(String(await firstPromise), /canceled/i);
      const second = await secondPromise;
      assert.equal(firstSocket.closeCalls, 1);
      assert.equal(secondSocket.closeCalls, 0);

      secondSocket.emitMessage(
        JSON.stringify({ type: "exit", id: secondSpawn.id, code: 0 }),
      );
      secondSocket.emitClose();
      await second.closed;
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("reuses one Windows ACP WebSocket bridge daemon across transports", async function () {
    const harness = createFakeWebSocketHarness();
    const service = seedFakeBridgeService();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service,
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
          call: async () => {
            throw new Error(
              "bridge test should not launch ACP backend directly",
            );
          },
        },
      }),
    });

    try {
      const firstPromise = launchAcpTransport({
        backend: {
          id: "acp-one",
          displayName: "ACP One",
          type: "acp",
          baseUrl: "local://acp-one",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\One",
      });
      const firstSocket = await waitForFakeSocket(harness.instances);
      firstSocket.emitOpen();
      const firstSpawn = JSON.parse(String(firstSocket.sent[0] || ""));
      firstSocket.emitMessage(
        JSON.stringify({ type: "spawned", id: firstSpawn.id, pid: 1001 }),
      );
      const first = await firstPromise;

      const secondPromise = launchAcpTransport({
        backend: {
          id: "acp-two",
          displayName: "ACP Two",
          type: "acp",
          baseUrl: "local://acp-two",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\Two",
      });
      while (harness.instances.length < 2) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const secondSocket = harness.instances[1];
      secondSocket.emitOpen();
      const secondSpawn = JSON.parse(String(secondSocket.sent[0] || ""));
      secondSocket.emitMessage(
        JSON.stringify({ type: "spawned", id: secondSpawn.id, pid: 1002 }),
      );
      const second = await secondPromise;

      assert.equal(first.getLifecycle().bridgePid, service.pid);
      assert.equal(second.getLifecycle().bridgePid, service.pid);
      assert.notEqual(firstSpawn.id, secondSpawn.id);
      assert.equal(firstSpawn.cwd, "D:\\One");
      assert.equal(secondSpawn.cwd, "D:\\Two");

      firstSocket.emitMessage(
        JSON.stringify({ type: "exit", id: firstSpawn.id, code: 0 }),
      );
      firstSocket.emitClose();
      secondSocket.emitMessage(
        JSON.stringify({ type: "exit", id: secondSpawn.id, code: 0 }),
      );
      secondSocket.emitClose();
      await Promise.all([first.closed, second.closed]);
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("decodes Blob stdout frames from the Windows ACP WebSocket bridge", async function () {
    const harness = createFakeWebSocketHarness();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
        },
      }),
    });

    try {
      const transportPromise = launchAcpTransport({
        backend: {
          id: "acp-blob",
          displayName: "ACP Blob",
          type: "acp",
          baseUrl: "local://acp-blob",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\Workspace",
      });
      const socket = await waitForFakeSocket(harness.instances);
      socket.emitOpen();
      const spawnRequest = JSON.parse(String(socket.sent[0] || ""));
      socket.emitMessage(
        JSON.stringify({ type: "spawned", id: spawnRequest.id, pid: 1003 }),
      );
      const transport = await transportPromise;
      const reader = transport.stdout.getReader();
      socket.emitMessage(new Blob([new TextEncoder().encode("hello\n")]));
      const first = await reader.read();
      reader.releaseLock();

      assert.isFalse(first.done);
      assert.equal(new TextDecoder().decode(first.value), "hello\n");

      socket.emitMessage(
        JSON.stringify({ type: "exit", id: spawnRequest.id, code: 0 }),
      );
      socket.emitClose();
      await transport.closed;
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("decodes cross-realm ArrayBuffer stdout frames from the Windows ACP WebSocket bridge", async function () {
    const harness = createFakeWebSocketHarness();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
        },
      }),
    });

    try {
      const transportPromise = launchAcpTransport({
        backend: {
          id: "acp-cross-realm",
          displayName: "ACP Cross Realm",
          type: "acp",
          baseUrl: "local://acp-cross-realm",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\Workspace",
      });
      const socket = await waitForFakeSocket(harness.instances);
      socket.emitOpen();
      const spawnRequest = JSON.parse(String(socket.sent[0] || ""));
      socket.emitMessage(
        JSON.stringify({ type: "spawned", id: spawnRequest.id, pid: 1004 }),
      );
      const transport = await transportPromise;
      const reader = transport.stdout.getReader();
      const crossRealmBuffer = vm.runInNewContext(`
        const buffer = new ArrayBuffer(17);
        const bytes = new Uint8Array(buffer);
        [104,101,108,108,111,32,102,114,111,109,32,114,101,97,108,109,10]
          .forEach((value, index) => { bytes[index] = value; });
        buffer;
      `);
      socket.emitMessage(crossRealmBuffer);
      const first = await reader.read();
      reader.releaseLock();

      assert.isFalse(first.done);
      assert.equal(new TextDecoder().decode(first.value), "hello from realm\n");

      socket.emitMessage(
        JSON.stringify({ type: "exit", id: spawnRequest.id, code: 0 }),
      );
      socket.emitClose();
      await transport.closed;
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("does not fail ACP bridge WebSocket resolution when hiddenDOMWindow is unavailable", function () {
    const harness = createFakeWebSocketHarness();
    const previousWebSocket = redefineGlobalProperty("WebSocket", undefined);
    const previousMozWebSocket = redefineGlobalProperty(
      "MozWebSocket",
      undefined,
    );
    const previousZotero = redefineGlobalProperty("Zotero", {
      getMainWindow: () => ({
        WebSocket: harness.WebSocketCtor,
      }),
    });
    const previousServices = redefineGlobalProperty("Services", {
      appShell: Object.defineProperty({}, "hiddenDOMWindow", {
        get() {
          throw new Error("hiddenDOMWindow unavailable during startup");
        },
      }),
    });

    try {
      assert.equal(getAcpWebSocketConstructor(), harness.WebSocketCtor);
    } finally {
      restoreGlobalProperty("Services", previousServices);
      restoreGlobalProperty("Zotero", previousZotero);
      restoreGlobalProperty("MozWebSocket", previousMozWebSocket);
      restoreGlobalProperty("WebSocket", previousWebSocket);
    }
  });

  it("reports ACP bridge WebSocket error event details", async function () {
    const harness = createFakeWebSocketHarness();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
        },
      }),
    });

    try {
      const transportPromise = launchAcpTransport({
        backend: {
          id: "acp-error",
          displayName: "ACP Error",
          type: "acp",
          baseUrl: "local://acp-error",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\Workspace",
      });
      const socket = await waitForFakeSocket(harness.instances);
      socket.emitError({
        type: "error",
        message: "connect failed",
        target: { readyState: 3 },
      });

      try {
        await transportPromise;
        assert.fail("expected WebSocket transport launch to fail");
      } catch (error) {
        assert.match(
          String((error as Error)?.message || error),
          /ACP bridge WebSocket error: .*type=error.*message=connect failed.*readyState=3/,
        );
      }
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("uses a content-addressed ACP bridge runtime binary path on Windows", function () {
    const sha =
      "82c665cdb134db0b21a2c36915c1d9a2aaac13060918b42f9c6612b2f9299175  zotero-acp-bridge.exe";
    const parsed =
      acpWebSocketBridgeServiceInternalsForTests.parseBridgeSha256Text(sha);
    const binaryPath =
      acpWebSocketBridgeServiceInternalsForTests.buildBridgeRuntimeBinaryPath(
        "D:\\Runtime",
        parsed,
      );
    const fallbackPath =
      acpWebSocketBridgeServiceInternalsForTests.buildBridgeRuntimeBinaryPath(
        "D:\\Runtime",
        "not-a-sha",
      );

    assert.equal(
      parsed,
      "82c665cdb134db0b21a2c36915c1d9a2aaac13060918b42f9c6612b2f9299175",
    );
    assert.include(
      binaryPath.replace(/[\\/]+/g, "\\"),
      "D:\\Runtime\\bin\\acp-ws-bridge\\82c665cdb134db0b\\zotero-acp-bridge.exe",
    );
    assert.equal(
      fallbackPath.replace(/[\\/]+/g, "\\"),
      "D:\\Runtime\\bin\\zotero-acp-bridge.exe",
    );
  });

  it("rejects unsupported ACP bridge stdout frame types and wakes pending readers", async function () {
    const harness = createFakeWebSocketHarness();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
        },
      }),
    });

    try {
      const transportPromise = launchAcpTransport({
        backend: {
          id: "acp-unsupported-frame",
          displayName: "ACP Unsupported Frame",
          type: "acp",
          baseUrl: "local://acp-unsupported-frame",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\Workspace",
      });
      const socket = await waitForFakeSocket(harness.instances);
      socket.emitOpen();
      const spawnRequest = JSON.parse(String(socket.sent[0] || ""));
      socket.emitMessage(
        JSON.stringify({ type: "spawned", id: spawnRequest.id, pid: 1005 }),
      );
      const transport = await transportPromise;
      const reader = transport.stdout.getReader();
      const readPromise = reader.read();

      socket.emitMessage({ notBytes: true });

      let thrown: unknown = null;
      try {
        await readPromise;
      } catch (error) {
        thrown = error;
      } finally {
        reader.releaseLock();
      }

      assert.instanceOf(thrown, Error);
      assert.match(String((thrown as Error).message), /unsupported data type/i);
      assert.match(transport.getLifecycle().readError || "", /unsupported/i);

      socket.emitClose();
      await transport.closed;
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("keeps diagnostic stdout capture out of the ACP protocol stdout queue", async function () {
    const harness = createFakeWebSocketHarness();
    const capturedStdout: string[] = [];
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
        },
      }),
    });

    try {
      const transportPromise = launchAcpTransport({
        backend: {
          id: "acp-capture",
          displayName: "ACP Capture",
          type: "acp",
          baseUrl: "local://acp-capture",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\Workspace",
        diagnosticCapture: {
          captureStdout: true,
          onStdoutChunk: (chunk) => {
            capturedStdout.push(chunk);
          },
        },
      });
      const socket = await waitForFakeSocket(harness.instances);
      socket.emitOpen();
      const spawnRequest = JSON.parse(String(socket.sent[0] || ""));
      socket.emitMessage(
        JSON.stringify({ type: "spawned", id: spawnRequest.id, pid: 1006 }),
      );
      const transport = await transportPromise;
      socket.emitMessage(new TextEncoder().encode("captured\n"));
      socket.emitMessage(
        JSON.stringify({ type: "exit", id: spawnRequest.id, code: 0 }),
      );
      socket.emitClose();
      await transport.closed;

      const reader = transport.stdout.getReader();
      const result = await reader.read();
      reader.releaseLock();

      assert.deepEqual(capturedStdout, ["captured\n"]);
      assert.isTrue(result.done);
      assert.equal(transport.getStdoutText(), "captured\n");
      assert.equal(transport.getLifecycle().stdoutChars, 9);
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("tracks large ACP bridge stdout volume while retaining only a bounded text tail", async function () {
    const harness = createFakeWebSocketHarness();
    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      websocketCtor: harness.WebSocketCtor,
      service: seedFakeBridgeService(),
    });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
        },
      }),
    });

    try {
      const transportPromise = launchAcpTransport({
        backend: {
          id: "acp-large-stdout",
          displayName: "ACP Large Stdout",
          type: "acp",
          baseUrl: "local://acp-large-stdout",
          command: "agent",
          args: ["acp"],
        } as BackendInstance,
        cwd: "D:\\Workspace",
      });
      const socket = await waitForFakeSocket(harness.instances);
      socket.emitOpen();
      const spawnRequest = JSON.parse(String(socket.sent[0] || ""));
      socket.emitMessage(
        JSON.stringify({ type: "spawned", id: spawnRequest.id, pid: 1007 }),
      );
      const transport = await transportPromise;
      const reader = transport.stdout.getReader();
      const encoder = new TextEncoder();
      let totalBytes = 0;

      for (let index = 0; index < 12; index += 1) {
        const chunk = `${String(index).padStart(2, "0")}:${"x".repeat(8192)}\n`;
        const bytes = encoder.encode(chunk);
        totalBytes += bytes.byteLength;
        socket.emitMessage(bytes);
        const result = await reader.read();
        assert.isFalse(result.done);
        assert.equal(result.value?.byteLength, bytes.byteLength);
      }
      reader.releaseLock();

      socket.emitMessage(
        JSON.stringify({ type: "exit", id: spawnRequest.id, code: 0 }),
      );
      socket.emitClose();
      await transport.closed;

      assert.equal(transport.getLifecycle().stdoutChars, totalBytes);
      assert.isAtMost(transport.getStdoutText().length, 64 * 1024);
      assert.match(transport.getStdoutText(), /11:x+\n$/);
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("coalesces concurrent ACP bridge service startup into one daemon process", async function () {
    const runtimeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zotero-acp-bridge-service-"),
    );
    let callCount = 0;
    let killCount = 0;
    let capturedArguments: string[] = [];
    const waitForever = new Promise<void>(() => undefined);

    setAcpWebSocketBridgeTestOverridesForTests({
      enabled: true,
      runtimeRoot,
      binaryPath: path.join(runtimeRoot, "bin", "zotero-acp-bridge.exe"),
      token: "service-secret-token",
      subprocess: {
        call: async (args: { arguments?: string[] }) => {
          callCount += 1;
          capturedArguments = args.arguments || [];
          const readyFileIndex = capturedArguments.indexOf("--ready-file");
          const readyFile =
            capturedArguments[readyFileIndex + 1] ||
            path.join(runtimeRoot, "ready.json");
          await fs.mkdir(path.dirname(readyFile), { recursive: true });
          await fs.writeFile(
            readyFile,
            JSON.stringify({
              ok: true,
              url: "ws://127.0.0.1:29999/v1/acp?token=service-secret-token",
              pid: 7654,
            }),
            "utf8",
          );
          return {
            wait: async () => waitForever,
            kill: () => {
              killCount += 1;
            },
          };
        },
      } as any,
    });

    try {
      const [first, second] = await Promise.all([
        ensureAcpWebSocketBridgeService(),
        ensureAcpWebSocketBridgeService(),
      ]);
      const snapshot = getAcpWebSocketBridgeSnapshot();

      assert.strictEqual(first, second);
      assert.equal(callCount, 1);
      assert.equal(first.pid, 7654);
      assert.includeMembers(capturedArguments, [
        "--serve",
        "--host",
        "127.0.0.1",
        "--port",
        "0",
        "--token",
        "service-secret-token",
      ]);
      assert.equal(
        snapshot?.url,
        "ws://127.0.0.1:29999/v1/acp?token=<redacted>",
      );

      await resetAcpWebSocketBridgeServiceForTests();
      assert.equal(killCount, 1);
    } finally {
      await resetAcpWebSocketBridgeServiceForTests();
      await fs.rm(runtimeRoot, { recursive: true, force: true });
    }
  });

  it("keeps non-Windows Mozilla ACP transport on direct subprocess stdio", async function () {
    const callInvocations: SubprocessCallInvocation[] = [];
    setAcpWebSocketBridgeTestOverridesForTests({ enabled: true });
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: false,
      isLinux: true,
    });
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async (candidate: string) =>
        String(candidate || "") === "C:\\Tools\\agent.exe",
    });
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async () => "C:\\Tools\\agent.exe",
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
          id: "acp-linux",
          displayName: "ACP Linux",
          type: "acp",
          baseUrl: "local://acp-linux",
          command: "C:\\Tools\\agent.exe",
          args: ["acp"],
        } as BackendInstance,
        cwd: "/tmp/acp",
      });

      assert.lengthOf(callInvocations, 1);
      assert.equal(callInvocations[0].command, "C:\\Tools\\agent.exe");
      assert.deepEqual(callInvocations[0].arguments, ["acp"]);
      assert.equal(
        transport.getLifecycle().transportKind,
        "mozilla-subprocess",
      );
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreGlobalProperty("Zotero", previousZotero);
    }
  });

  it("uses node-direct npx launch for registry resolved npx ACP profiles when node is available", async function () {
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
        node: {
          command: "node",
          available: true,
          resolvedPath: "C:\\Program Files\\nodejs\\node.exe",
          source: "path",
          checkedCandidates: [],
        },
      },
    });
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async (candidate: string) =>
        /node_modules[\\/]npm[\\/]bin[\\/]npx-cli\.js$/i.test(candidate),
      readUTF8: async () =>
        'SET "NPX_CLI_JS=%~dp0\\node_modules\\npm\\bin\\npx-cli.js"',
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
      assertHydratedWindowsEnvironment(callInvocations[0].environment);
      assert.match(callInvocations[0].command, /(^|\\)node\.exe$/i);
      assert.match(
        callInvocations[0].arguments[0] || "",
        /(^|\\)npx-cli\.js$/i,
      );
      assert.deepEqual(callInvocations[0].arguments.slice(1), [
        "-y",
        "opencode-ai@latest",
        "acp",
      ]);
      assert.equal(
        transport.getCommandLabel(),
        "npx -y opencode-ai@latest acp",
      );
      assert.include(transport.getCommandLine(), "node.exe");
      assert.include(transport.getCommandLine(), "npx-cli.js");
      await transport.close();
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
      restoreGlobalProperty("IOUtils", previousIOUtils);
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
      assert.equal(
        transport.getCommandLabel(),
        "npx -y opencode-ai@latest acp",
      );
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
      assert.equal(
        transport.getCommandLabel(),
        "npx -y opencode-ai@latest acp",
      );
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
      assert.equal(
        transport.getCommandLabel(),
        "npx -y opencode-ai@latest acp",
      );
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
      assert.equal(
        transport.getCommandLabel(),
        "npx -y opencode-ai@latest acp",
      );
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
      assert.equal(
        transport.getCommandLabel(),
        "npx -y opencode-ai@latest acp",
      );
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

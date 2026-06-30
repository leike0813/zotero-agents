import { appendSkillRunnerLocalDeployDebugLog } from "./skillRunnerLocalDeployDebugStore";
import {
  getWindowsExecutableCandidates,
  getWindowsPowerShellAbsoluteCandidates,
  isTrustedResolvedCommandPath,
  resolveTrustedPathSearchResult,
  resolveWindowsCommandFromPowerShell,
} from "./windowsCommandResolution";
import { getMozillaSubprocessModule } from "../utils/runtimeCompatibility";
import {
  getParentPath,
  isAbsolutePathLike,
  joinNativePath,
} from "../platform/path";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export type SkillRunnerCtlCommandResult = {
  ok: boolean;
  exitCode: number;
  message: string;
  stdout: string;
  stderr: string;
  details?: Record<string, unknown>;
  command: string;
  args: string[];
};

type CommandOutput = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type SkillRunnerCtlBridgeDeps = {
  runCommand?: (args: {
    command: string;
    args: string[];
    cwd?: string;
    timeoutMs?: number;
  }) => Promise<CommandOutput>;
};

type CtlArgs = {
  ctlPath: string;
  command:
    | "bootstrap"
    | "install"
    | "preflight"
    | "up"
    | "down"
    | "status"
    | "doctor";
  mode?: "local" | "docker";
  host?: string;
  port?: number;
  portFallbackSpan?: number;
  waitSeconds?: number;
};

export type SkillRunnerAgentBootstrapArgs = {
  installDir: string;
  localRoot?: string;
  reportFilePath?: string;
};

export type SkillRunnerLocalRuntimeBridgeArgs = {
  installDir: string;
  localRoot?: string;
  host?: string;
  port?: number;
  portFallbackSpan?: number;
  waitSeconds?: number;
};

type UninstallArgs = {
  uninstallPath: string;
  clearData?: boolean;
  clearAgentHome?: boolean;
  localRoot?: string;
};

type ScriptCommandInvocation = {
  command: string;
  argv: string[];
  scriptPath: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isExecutableNotFoundText(value: unknown) {
  return /executable not found|not found|does not exist|is not executable|找不到|不存在|不可执行/i.test(
    normalizeString(value),
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function detectWindows() {
  const runtime = globalThis as {
    Zotero?: { isWin?: boolean };
    process?: { platform?: string };
  };
  if (typeof runtime.Zotero?.isWin === "boolean") {
    return runtime.Zotero.isWin;
  }
  return runtime.process?.platform === "win32";
}

function readDirectoryServicePath(key: string) {
  const runtime = globalThis as {
    Services?: {
      dirsvc?: {
        get?: (name: string, iface: unknown) => { path?: string };
      };
    };
    Ci?: { nsIFile?: unknown };
  };
  if (!runtime.Services?.dirsvc?.get || !runtime.Ci?.nsIFile) {
    return "";
  }
  try {
    const file = runtime.Services.dirsvc.get(key, runtime.Ci.nsIFile);
    return normalizeString(file?.path);
  } catch {
    return "";
  }
}

function resolveTempRoot() {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const env = runtime.process?.env || {};
  return (
    normalizeString(env.TEMP) ||
    normalizeString(env.TMP) ||
    normalizeString(env.TMPDIR) ||
    readDirectoryServicePath("TmpD") ||
    readDirectoryServicePath("ProfD") ||
    "."
  );
}

function joinFsPath(...segments: string[]) {
  return joinNativePath(...segments);
}

function getParentFsPath(pathValue: string) {
  return getParentPath(pathValue);
}

function isAbsoluteFsPath(pathValue: string) {
  return isAbsolutePathLike(pathValue);
}

function toPosixSingleQuotedLiteral(raw: string) {
  const normalized = String(raw || "");
  return `'${normalized.replace(/'/g, `'\\''`)}'`;
}

function normalizeSafeLocalRootArg(localRoot: unknown) {
  const normalized = normalizeString(localRoot);
  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("-")) {
    return "";
  }
  if (!isAbsoluteFsPath(normalized)) {
    return "";
  }
  const stripped = normalized.replace(/[\\/]+$/g, "");
  if (!stripped) {
    return "";
  }
  if (detectWindows()) {
    if (/^[A-Za-z]:$/.test(stripped)) {
      return "";
    }
    if (/^\\\\[^\\]+\\[^\\]+$/.test(stripped)) {
      return "";
    }
  } else if (stripped === "/") {
    return "";
  }
  return normalized;
}

async function ensureDirectory(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return;
  }
  const runtime = globalThis as {
    IOUtils?: {
      makeDirectory?: (
        path: string,
        options?: { createAncestors?: boolean; ignoreExisting?: boolean },
      ) => Promise<void>;
    };
  };
  if (typeof runtime.IOUtils?.makeDirectory === "function") {
    await runtime.IOUtils.makeDirectory(normalized, {
      createAncestors: true,
      ignoreExisting: true,
    });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(normalized, { recursive: true });
}

async function readUtf8File(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return "";
  }
  const runtime = globalThis as {
    IOUtils?: { readUTF8?: (path: string) => Promise<string> };
  };
  if (typeof runtime.IOUtils?.readUTF8 === "function") {
    return runtime.IOUtils.readUTF8(normalized);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(normalized, "utf8") as Promise<string>;
}

async function removePath(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return;
  }
  const runtime = globalThis as {
    IOUtils?: {
      remove?: (
        path: string,
        options?: { ignoreAbsent?: boolean; recursive?: boolean },
      ) => Promise<void>;
    };
  };
  if (typeof runtime.IOUtils?.remove === "function") {
    try {
      await runtime.IOUtils.remove(normalized, {
        ignoreAbsent: true,
        recursive: true,
      });
      return;
    } catch {
      // fall through
    }
  }
  try {
    const fs = await dynamicImport("fs/promises");
    await fs.rm(normalized, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
  }
}

async function writeUtf8File(pathValue: string, content: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return;
  }
  const runtime = globalThis as {
    IOUtils?: { writeUTF8?: (path: string, data: string) => Promise<unknown> };
  };
  if (typeof runtime.IOUtils?.writeUTF8 === "function") {
    await runtime.IOUtils.writeUTF8(normalized, String(content || ""));
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(normalized, String(content || ""), "utf8");
}

async function readJsonObject(pathValue: string) {
  const content = await readUtf8File(pathValue);
  const normalized = normalizeString(content);
  if (!normalized) {
    return null;
  }
  try {
    const parsed = JSON.parse(normalized);
    if (isObjectRecord(parsed)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

async function writeJsonObject(
  pathValue: string,
  value: Record<string, unknown>,
) {
  await writeUtf8File(pathValue, `${JSON.stringify(value, null, 2)}\n`);
}

function nowIso() {
  return new Date().toISOString();
}

async function sleepMs(ms: number) {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, Math.floor(ms))),
  );
}

function toInteger(value: unknown, fallback: number) {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value || "").trim(), 10);
  if (Number.isFinite(numeric)) {
    return Math.floor(numeric);
  }
  return fallback;
}

function normalizePort(value: unknown, fallback: number) {
  const next = toInteger(value, fallback);
  if (next >= 1 && next <= 65535) {
    return next;
  }
  return fallback;
}

function normalizePortFallbackSpan(value: unknown, fallback = 0) {
  const next = toInteger(value, fallback);
  if (next >= 0) {
    return next;
  }
  return fallback;
}

function buildServiceUrl(host: string, port: number, path = "/") {
  const normalizedHost = normalizeString(host) || "127.0.0.1";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `http://${normalizedHost}:${port}${normalizedPath}`;
}

function getGlobalFetch() {
  const runtime = globalThis as {
    fetch?: unknown;
  };
  if (typeof runtime.fetch === "function") {
    return runtime.fetch as (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
  }
  return undefined;
}

async function isTcpPortAvailable(host: string, port: number) {
  const mozillaRuntime = globalThis as {
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
  try {
    const classes = mozillaRuntime.Components?.classes || mozillaRuntime.Cc;
    const interfaces =
      mozillaRuntime.Components?.interfaces || mozillaRuntime.Ci;
    const serverSocketFactory =
      classes?.["@mozilla.org/network/server-socket;1"];
    const nsIServerSocket = interfaces?.nsIServerSocket;
    if (serverSocketFactory?.createInstance && nsIServerSocket) {
      const serverSocket = serverSocketFactory.createInstance(
        nsIServerSocket,
      ) as {
        init?: (port: number, loopbackOnly: boolean, backLog: number) => void;
        close?: () => void;
      };
      if (
        typeof serverSocket.init === "function" &&
        typeof serverSocket.close === "function"
      ) {
        const normalizedHost = normalizeString(host).toLowerCase();
        const loopbackOnly =
          normalizedHost === "127.0.0.1" ||
          normalizedHost === "localhost" ||
          normalizedHost === "::1";
        serverSocket.init(port, loopbackOnly, -1);
        serverSocket.close();
        return true;
      }
    }
  } catch {
    return false;
  }
  try {
    const net = await dynamicImport("net");
    return await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      let settled = false;
      const finalize = (value: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        try {
          server.close();
        } catch {
          // ignore
        }
        resolve(value);
      };
      server.once("error", () => finalize(false));
      server.once("listening", () => finalize(true));
      server.listen(port, host);
    });
  } catch {
    return false;
  }
}

function isAbsoluteCommand(command: string) {
  const normalized = normalizeString(command);
  return (
    normalized.startsWith("/") ||
    normalized.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(normalized)
  );
}

function hasPathSeparator(command: string) {
  return /[\\/]/.test(command);
}

async function readProcessPipe(stream: unknown) {
  if (typeof stream === "string") {
    return stream;
  }
  if (
    stream &&
    typeof stream === "object" &&
    "text" in (stream as Record<string, unknown>) &&
    typeof (stream as { text?: unknown }).text === "string"
  ) {
    return String((stream as { text?: unknown }).text || "");
  }
  const reader = stream as {
    readString?: () => Promise<string>;
  };
  if (!reader || typeof reader.readString !== "function") {
    return "";
  }
  let text = "";
  while (true) {
    const chunk = await reader.readString();
    if (!chunk) {
      break;
    }
    text += chunk;
  }
  return text;
}

async function waitMozillaProcessExit(proc: unknown) {
  const process = proc as {
    wait?: () => Promise<number>;
    exitCode?: unknown;
  };
  if (typeof process.wait === "function") {
    try {
      const code = await process.wait();
      if (typeof code === "number" && Number.isFinite(code)) {
        return Math.floor(code);
      }
    } catch {
      return 1;
    }
  }
  if (
    typeof process.exitCode === "number" &&
    Number.isFinite(process.exitCode)
  ) {
    return Math.floor(process.exitCode);
  }
  return 0;
}

async function runWithMozillaSubprocess(args: {
  command: string;
  argv: string[];
}): Promise<CommandOutput> {
  const subprocess = getMozillaSubprocessModule() as {
    pathSearch?: (command: string) => Promise<string>;
    call?: (args: { command: string; arguments?: string[] }) => Promise<{
      stdout?: unknown;
      stderr?: unknown;
      wait?: () => Promise<number>;
      exitCode?: unknown;
    }>;
  } | null;
  if (!subprocess?.call) {
    throw new Error("mozilla subprocess unavailable");
  }
  const command = normalizeString(args.command);
  const pathSearchResult =
    !isAbsoluteCommand(command) && !hasPathSeparator(command)
      ? await resolveTrustedPathSearchResult({
          command,
          pathSearch: subprocess.pathSearch,
          platform: detectWindows() ? "win32" : undefined,
        })
      : "";
  const resolvedCommand =
    !isAbsoluteCommand(command) &&
    !hasPathSeparator(command) &&
    pathSearchResult &&
    (await isTrustedResolvedCommandPath(pathSearchResult))
      ? normalizeString(pathSearchResult)
      : command;
  const proc = await subprocess.call({
    command: resolvedCommand,
    arguments: args.argv,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    readProcessPipe(proc.stdout),
    readProcessPipe(proc.stderr),
    waitMozillaProcessExit(proc),
  ]);
  if (
    exitCode !== 0 &&
    (isExecutableNotFoundText(stderr) || isExecutableNotFoundText(stdout))
  ) {
    throw new Error(
      normalizeString(stderr) ||
        normalizeString(stdout) ||
        "executable not found",
    );
  }
  return {
    exitCode,
    stdout,
    stderr,
  };
}

async function runWithZoteroSubprocess(args: {
  command: string;
  argv: string[];
}): Promise<CommandOutput> {
  const runtime = globalThis as {
    Zotero?: {
      Utilities?: {
        Internal?: {
          subprocess?: (command: string, args?: string[]) => Promise<string>;
        };
      };
    };
  };
  const subprocess = runtime.Zotero?.Utilities?.Internal?.subprocess;
  if (typeof subprocess !== "function") {
    throw new Error("zotero subprocess unavailable");
  }
  const normalizeErrorText = (error: unknown) =>
    normalizeString(
      error && typeof error === "object" && "message" in error
        ? (error as { message?: unknown }).message
        : error,
    );
  const commandCandidates = await (async () => {
    if (!detectWindows()) {
      return [args.command];
    }
    const normalized = normalizeString(args.command).toLowerCase();
    const powerShellSet = new Set([
      "powershell",
      "powershell.exe",
      "pwsh",
      "pwsh.exe",
    ]);
    if (!powerShellSet.has(normalized)) {
      const resolvedCandidates = await resolveWindowsCommandFromPowerShell(
        args.command,
      );
      const candidates = [
        args.command,
        ...resolvedCandidates,
        ...getWindowsExecutableCandidates(args.command),
        `${normalized.replace(/\.(exe|cmd|bat)$/i, "")}.exe`,
      ];
      return Array.from(
        new Set(
          candidates.map((entry) => normalizeString(entry)).filter(Boolean),
        ),
      );
    }
    const candidates = [
      args.command,
      ...getWindowsPowerShellAbsoluteCandidates(),
      "powershell.exe",
      "pwsh.exe",
      "pwsh",
      "powershell",
    ];
    return Array.from(
      new Set(
        candidates.map((entry) => normalizeString(entry)).filter(Boolean),
      ),
    );
  })();
  let lastErrorText = "";
  for (let i = 0; i < commandCandidates.length; i++) {
    const command = commandCandidates[i];
    try {
      const stdout = await subprocess(command, args.argv);
      return {
        exitCode: 0,
        stdout: String(stdout || ""),
        stderr: "",
      };
    } catch (error) {
      const errorText = normalizeErrorText(error);
      lastErrorText = errorText || lastErrorText;
      if (
        i < commandCandidates.length - 1 &&
        isExecutableNotFoundText(errorText)
      ) {
        continue;
      }
      break;
    }
  }
  return {
    exitCode: 1,
    stdout: "",
    stderr: lastErrorText || "subprocess failed",
  };
}

async function resolveWindowsCommandForNsIProcess(command: string) {
  if (!detectWindows()) {
    return "";
  }
  const normalized = normalizeString(command);
  if (!normalized) {
    return "";
  }
  const powerShellSet = new Set([
    "powershell",
    "powershell.exe",
    "pwsh",
    "pwsh.exe",
  ]);
  const lower = normalized.toLowerCase();
  const candidates = Array.from(
    new Set(
      [
        ...(isAbsoluteCommand(normalized) || hasPathSeparator(normalized)
          ? [normalized]
          : []),
        ...(powerShellSet.has(lower)
          ? getWindowsPowerShellAbsoluteCandidates()
          : []),
        ...(await resolveWindowsCommandFromPowerShell(normalized)),
        ...getWindowsExecutableCandidates(normalized),
      ]
        .map((entry) => normalizeString(entry))
        .filter(Boolean),
    ),
  );
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return "";
}

type WindowsPowerShellCaptureContext = {
  argv: string[];
  tempDir: string;
  stdoutPath: string;
  stderrPath: string;
};

async function buildWindowsPowerShellCaptureContext(argv: string[]) {
  const commandIndex = argv.findIndex(
    (entry, index) => /^-command$/i.test(entry) && index < argv.length - 1,
  );
  if (commandIndex < 0) {
    return null as WindowsPowerShellCaptureContext | null;
  }
  const originalCommand = String(argv[commandIndex + 1] || "");
  const tempDir = joinFsPath(
    resolveTempRoot(),
    `zotero-skills-ps-capture-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );
  await ensureDirectory(tempDir);
  const stdoutPath = joinFsPath(tempDir, "stdout.log");
  const stderrPath = joinFsPath(tempDir, "stderr.log");
  const wrappedCommand = [
    "$ErrorActionPreference='Stop'",
    `$stdoutPath = ${toPowerShellSingleQuotedLiteral(stdoutPath)}`,
    `$stderrPath = ${toPowerShellSingleQuotedLiteral(stderrPath)}`,
    "& {",
    originalCommand,
    "} 1> $stdoutPath 2> $stderrPath",
    "exit $LASTEXITCODE",
  ].join("; ");
  const nextArgv = [...argv];
  nextArgv[commandIndex + 1] = wrappedCommand;
  return {
    argv: nextArgv,
    tempDir,
    stdoutPath,
    stderrPath,
  } as WindowsPowerShellCaptureContext;
}

async function runWithWindowsNsIProcessHidden(args: {
  command: string;
  argv: string[];
}): Promise<CommandOutput> {
  if (!detectWindows()) {
    throw new Error("nsIProcess hidden execution is only available on Windows");
  }
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
  const classes = runtime.Components?.classes || runtime.Cc;
  const interfaces = runtime.Components?.interfaces || runtime.Ci;
  const localFileFactory = classes?.["@mozilla.org/file/local;1"];
  const processFactory = classes?.["@mozilla.org/process/util;1"];
  const nsIFile = interfaces?.nsIFile;
  const nsIProcess = interfaces?.nsIProcess;
  if (
    !localFileFactory?.createInstance ||
    !processFactory?.createInstance ||
    !nsIFile ||
    !nsIProcess
  ) {
    throw new Error("XPCOM nsIProcess APIs are unavailable");
  }
  const resolvedCommand = await resolveWindowsCommandForNsIProcess(
    args.command,
  );
  if (!resolvedCommand) {
    throw new Error(
      `failed to resolve command for nsIProcess: ${args.command}`,
    );
  }
  const captureContext = await buildWindowsPowerShellCaptureContext(args.argv);
  const invocationArgv = captureContext ? captureContext.argv : args.argv;
  const executable = localFileFactory.createInstance(nsIFile) as {
    initWithPath?: (path: string) => void;
  };
  if (typeof executable.initWithPath !== "function") {
    throw new Error("nsIFile.initWithPath is unavailable");
  }
  executable.initWithPath(resolvedCommand);
  const proc = processFactory.createInstance(nsIProcess) as {
    init?: (file: unknown) => void;
    runwAsync?: (args: string[], count: number, observer: unknown) => void;
    runAsync?: (args: string[], count: number, observer: unknown) => void;
    startHidden?: boolean;
    noShell?: boolean;
    exitValue?: number;
  };
  if (typeof proc.init !== "function") {
    throw new Error("nsIProcess.init is unavailable");
  }
  proc.init(executable);
  try {
    proc.startHidden = true;
  } catch {
    // ignore if unsupported
  }
  try {
    proc.noShell = true;
  } catch {
    // ignore if unsupported
  }
  const runAsync =
    typeof proc.runwAsync === "function"
      ? proc.runwAsync.bind(proc)
      : typeof proc.runAsync === "function"
        ? proc.runAsync.bind(proc)
        : null;
  if (!runAsync) {
    throw new Error("nsIProcess async execution is unavailable");
  }
  await new Promise<void>((resolve, reject) => {
    try {
      runAsync(invocationArgv, invocationArgv.length, {
        observe: (_subject: unknown, topic: string) => {
          if (topic === "process-finished" || topic === "process-failed") {
            resolve();
            return;
          }
          reject(new Error(`unexpected process topic: ${topic}`));
        },
      });
    } catch (error) {
      reject(error);
    }
  });
  const exitCode =
    typeof proc.exitValue === "number" && Number.isFinite(proc.exitValue)
      ? Math.floor(proc.exitValue)
      : 1;
  let stdout = "";
  let stderr = "";
  if (captureContext) {
    try {
      stdout = await readUtf8File(captureContext.stdoutPath);
    } catch {
      stdout = "";
    }
    try {
      stderr = await readUtf8File(captureContext.stderrPath);
    } catch {
      stderr = "";
    }
    await removePath(captureContext.tempDir);
  }
  return {
    exitCode,
    stdout,
    stderr,
  };
}

async function runWithNodeExecFile(args: {
  command: string;
  argv: string[];
  cwd?: string;
  timeoutMs?: number;
}): Promise<CommandOutput> {
  const childProcess = await dynamicImport("child_process");
  const util = await dynamicImport("util");
  const execFileAsync = util.promisify(childProcess.execFile) as (
    command: string,
    argv: string[],
    options: Record<string, unknown>,
  ) => Promise<{ stdout: string; stderr: string }>;
  try {
    const result = await execFileAsync(args.command, args.argv, {
      cwd: args.cwd,
      timeout: args.timeoutMs ?? 600000,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
    return {
      exitCode: 0,
      stdout: String(result.stdout || ""),
      stderr: String(result.stderr || ""),
    };
  } catch (error) {
    const typed = (error || {}) as {
      code?: unknown;
      stdout?: unknown;
      stderr?: unknown;
      message?: unknown;
    };
    return {
      exitCode:
        typeof typed.code === "number" && Number.isFinite(typed.code)
          ? Math.floor(typed.code)
          : 1,
      stdout: normalizeString(typed.stdout),
      stderr: normalizeString(typed.stderr) || normalizeString(typed.message),
    };
  }
}

async function runCommand(args: {
  command: string;
  argv: string[];
  cwd?: string;
  timeoutMs?: number;
}) {
  const isWindows = detectWindows();
  const isWindowsPowerShellCommand =
    isWindows &&
    /(^|[\\/])(powershell|pwsh)(\.exe)?$/i.test(normalizeString(args.command));
  if (isWindows && (!args.cwd || isWindowsPowerShellCommand)) {
    try {
      return await runWithWindowsNsIProcessHidden({
        command: args.command,
        argv: args.argv,
      });
    } catch {
      // fallthrough
    }
    try {
      return await runWithMozillaSubprocess({
        command: args.command,
        argv: args.argv,
      });
    } catch {
      // fallthrough
    }
    try {
      return await runWithZoteroSubprocess({
        command: args.command,
        argv: args.argv,
      });
    } catch {
      // fallthrough
    }
    return runWithNodeExecFile(args);
  }
  try {
    return await runWithMozillaSubprocess({
      command: args.command,
      argv: args.argv,
    });
  } catch {
    // fallthrough
  }
  try {
    return await runWithZoteroSubprocess({
      command: args.command,
      argv: args.argv,
    });
  } catch {
    // fallthrough
  }
  return runWithNodeExecFile(args);
}

async function pathExists(pathValue: string) {
  const targetPath = normalizeString(pathValue);
  if (!targetPath) {
    return false;
  }
  const runtime = globalThis as {
    IOUtils?: { exists?: (path: string) => Promise<boolean> };
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
  if (typeof runtime.IOUtils?.exists === "function") {
    try {
      return !!(await runtime.IOUtils.exists(targetPath));
    } catch {
      // continue fallback checks
    }
  }
  try {
    const classes = runtime.Components?.classes || runtime.Cc;
    const interfaces = runtime.Components?.interfaces || runtime.Ci;
    const localFileFactory = classes?.["@mozilla.org/file/local;1"];
    const nsIFile = interfaces?.nsIFile;
    if (localFileFactory?.createInstance && nsIFile) {
      const file = localFileFactory.createInstance(nsIFile) as {
        initWithPath?: (path: string) => void;
        exists?: () => boolean;
      };
      if (typeof file.initWithPath === "function") {
        file.initWithPath(targetPath);
      }
      if (typeof file.exists === "function") {
        return !!file.exists();
      }
    }
  } catch {
    // continue fallback checks
  }
  try {
    const fs = await dynamicImport("fs");
    if (typeof fs?.existsSync === "function") {
      return !!fs.existsSync(targetPath);
    }
  } catch {
    // ignore node fs fallback failure
  }
  return false;
}

function parseJsonObjectCandidate(text: string) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return null;
  }
  const lines = normalized.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const candidate = lines[i].trim();
    if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
      continue;
    }
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeCtlResult(args: {
  output: CommandOutput;
  command: string;
  argv: string[];
  fallbackMessage: string;
}) {
  const payload =
    parseJsonObjectCandidate(args.output.stdout) ||
    parseJsonObjectCandidate(args.output.stderr);
  const details = payload || {};
  const exitCode =
    typeof payload?.exit_code === "number" && Number.isFinite(payload.exit_code)
      ? Math.floor(payload.exit_code)
      : args.output.exitCode;
  const ok = typeof payload?.ok === "boolean" ? payload.ok : exitCode === 0;
  const message =
    normalizeString(payload?.message) ||
    normalizeString(args.output.stderr) ||
    normalizeString(args.output.stdout) ||
    args.fallbackMessage;
  return {
    ok,
    exitCode,
    message,
    stdout: args.output.stdout,
    stderr: args.output.stderr,
    details,
    command: args.command,
    args: args.argv,
  } as SkillRunnerCtlCommandResult;
}

function toPowerShellSingleQuotedLiteral(raw: string) {
  const normalized = String(raw || "");
  return `'${normalized.replace(/'/g, "''")}'`;
}

function toPowerShellInvocationToken(raw: string) {
  const normalized = String(raw || "");
  if (/^-{1,2}[A-Za-z][A-Za-z0-9-]*$/.test(normalized)) {
    return normalized;
  }
  return toPowerShellSingleQuotedLiteral(normalized);
}

function buildWindowsPowerShellScriptInvocation(args: {
  scriptPath: string;
  scriptArgs: string[];
}): ScriptCommandInvocation {
  const scriptPath = normalizeString(args.scriptPath);
  const scriptArgList = args.scriptArgs.map((entry) =>
    toPowerShellInvocationToken(entry),
  );
  const inlineScriptArgs = scriptArgList.join(" ");
  const commandScript = [
    "$ErrorActionPreference='Stop'",
    "if ([string]::IsNullOrWhiteSpace($env:PATH) -and -not [string]::IsNullOrWhiteSpace($env:Path)) { $env:PATH = $env:Path }",
    "$npmCommand = Get-Command npm -ErrorAction SilentlyContinue",
    'if ($npmCommand -and $npmCommand.Source) { $npmDir = Split-Path -Parent $npmCommand.Source; if ($npmDir -and ($env:PATH -notlike "*${npmDir}*")) { $env:PATH = "$npmDir;$env:PATH" } }',
    `& ${toPowerShellSingleQuotedLiteral(scriptPath)}${inlineScriptArgs ? ` ${inlineScriptArgs}` : ""}`,
    "exit $LASTEXITCODE",
  ].join("; ");
  return {
    command: "powershell.exe",
    argv: [
      "-NoLogo",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      commandScript,
    ],
    scriptPath,
  };
}

function buildCtlInvocation(args: CtlArgs): ScriptCommandInvocation {
  const isWin = detectWindows();
  const commandArgs: string[] = [args.command];
  if (args.command === "preflight") {
    if (args.host) {
      commandArgs.push("--host", args.host);
    }
    if (typeof args.port === "number" && Number.isFinite(args.port)) {
      commandArgs.push("--port", String(Math.floor(args.port)));
    }
    if (
      typeof args.portFallbackSpan === "number" &&
      Number.isFinite(args.portFallbackSpan) &&
      args.portFallbackSpan >= 0
    ) {
      commandArgs.push(
        "--port-fallback-span",
        String(Math.floor(args.portFallbackSpan)),
      );
    }
  } else if (args.command === "up") {
    commandArgs.push("--mode", args.mode || "local");
    if (args.host) {
      commandArgs.push("--host", args.host);
    }
    if (typeof args.port === "number" && Number.isFinite(args.port)) {
      commandArgs.push("--port", String(Math.floor(args.port)));
    }
    if (
      typeof args.waitSeconds === "number" &&
      Number.isFinite(args.waitSeconds) &&
      args.waitSeconds > 0
    ) {
      commandArgs.push("--wait-seconds", String(Math.floor(args.waitSeconds)));
    }
    if (
      typeof args.portFallbackSpan === "number" &&
      Number.isFinite(args.portFallbackSpan) &&
      args.portFallbackSpan >= 0
    ) {
      commandArgs.push(
        "--port-fallback-span",
        String(Math.floor(args.portFallbackSpan)),
      );
    }
  } else if (args.command === "down" || args.command === "status") {
    commandArgs.push("--mode", args.mode || "local");
    if (
      args.command === "status" &&
      typeof args.port === "number" &&
      Number.isFinite(args.port)
    ) {
      commandArgs.push("--port", String(Math.floor(args.port)));
    }
  }
  commandArgs.push("--json");
  if (isWin) {
    return buildWindowsPowerShellScriptInvocation({
      scriptPath: args.ctlPath,
      scriptArgs: commandArgs,
    });
  }
  return {
    command: "sh",
    argv: [args.ctlPath, ...commandArgs],
    scriptPath: args.ctlPath,
  };
}

function buildUninstallInvocation(
  args: UninstallArgs,
): ScriptCommandInvocation {
  const safeLocalRoot = normalizeSafeLocalRootArg(args.localRoot);
  if (detectWindows()) {
    const scriptArgs: string[] = ["-Json"];
    if (args.clearData === true) {
      scriptArgs.push("-ClearData");
    }
    if (args.clearAgentHome === true) {
      scriptArgs.push("-ClearAgentHome");
    }
    if (safeLocalRoot) {
      scriptArgs.push("-LocalRoot", safeLocalRoot);
    }
    return buildWindowsPowerShellScriptInvocation({
      scriptPath: args.uninstallPath,
      scriptArgs,
    });
  }
  const scriptArgs: string[] = ["--json"];
  if (args.clearData === true) {
    scriptArgs.push("--clear-data");
  }
  if (args.clearAgentHome === true) {
    scriptArgs.push("--clear-agent-home");
  }
  if (safeLocalRoot) {
    scriptArgs.push("--local-root", safeLocalRoot);
  }
  return {
    command: "sh",
    argv: [args.uninstallPath, ...scriptArgs],
    scriptPath: args.uninstallPath,
  };
}

function previewText(text: string, limit = 240) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit)}...`;
}

const STREAM_CHUNK_SIZE = 1800;

function appendCtlStreamChunks(args: {
  operation: string;
  stream: "stdout" | "stderr";
  text: string;
  level: "info" | "warn" | "error";
}) {
  const normalized = String(args.text || "");
  if (!normalized) {
    return;
  }
  const chunks: string[] = [];
  for (
    let offset = 0;
    offset < normalized.length;
    offset += STREAM_CHUNK_SIZE
  ) {
    chunks.push(normalized.slice(offset, offset + STREAM_CHUNK_SIZE));
  }
  const total = chunks.length;
  for (let i = 0; i < chunks.length; i++) {
    appendSkillRunnerLocalDeployDebugLog({
      level: args.level,
      operation: `${args.operation}-${args.stream}-chunk`,
      stage: `${args.operation}-${args.stream}-chunk`,
      message: `${args.operation} ${args.stream} chunk ${i + 1}/${total}`,
      details: {
        stream: args.stream,
        chunkIndex: i + 1,
        chunkCount: total,
        streamChunk: chunks[i],
      },
    });
  }
}

function appendCtlLog(args: {
  level: "info" | "warn" | "error";
  operation: string;
  message: string;
  result?: SkillRunnerCtlCommandResult;
}) {
  appendSkillRunnerLocalDeployDebugLog({
    level: args.level,
    operation: args.operation,
    stage: args.operation,
    message: args.message,
    details: args.result
      ? {
          ok: args.result.ok,
          exitCode: args.result.exitCode,
          command: args.result.command,
          args: args.result.args,
          message: args.result.message,
          stdoutPreview: previewText(args.result.stdout),
          stderrPreview: previewText(args.result.stderr),
          stdoutBytes: args.result.stdout.length,
          stderrBytes: args.result.stderr.length,
          details: args.result.details,
        }
      : undefined,
  });
  if (!args.result) {
    return;
  }
  appendCtlStreamChunks({
    operation: args.operation,
    stream: "stdout",
    text: args.result.stdout,
    level: "info",
  });
  appendCtlStreamChunks({
    operation: args.operation,
    stream: "stderr",
    text: args.result.stderr,
    level: args.result.ok ? "info" : "warn",
  });
}

export class SkillRunnerCtlBridge {
  private readonly runCommandImpl: NonNullable<
    SkillRunnerCtlBridgeDeps["runCommand"]
  >;

  private readonly shouldPreflightScripts: boolean;

  constructor(deps: SkillRunnerCtlBridgeDeps = {}) {
    this.runCommandImpl =
      deps.runCommand ||
      (async (args) =>
        runCommand({
          command: args.command,
          argv: args.args,
          cwd: args.cwd,
          timeoutMs: args.timeoutMs,
        }));
    this.shouldPreflightScripts = !deps.runCommand;
  }

  resolveCtlPathFromInstallDir(installDir: string) {
    const normalizedInstallDir = normalizeString(installDir);
    if (!normalizedInstallDir) {
      return "";
    }
    return joinFsPath(
      normalizedInstallDir,
      "scripts",
      detectWindows() ? "skill-runnerctl.ps1" : "skill-runnerctl",
    );
  }

  private resolveLocalRuntimeLayout(args: {
    installDir: string;
    localRoot?: string;
    reportFilePath?: string;
  }) {
    const base = this.resolveDirectBootstrapLayout({
      installDir: args.installDir,
      localRoot: args.localRoot,
      reportFilePath: args.reportFilePath,
    });
    if (!base.ok) {
      return base;
    }
    const stateFile = joinFsPath(
      base.agentCacheDir,
      "local_runtime_service.json",
    );
    const localLogFile = joinFsPath(
      base.dataDir,
      "logs",
      "local_runtime_service.log",
    );
    const localErrLogFile = joinFsPath(
      base.dataDir,
      "logs",
      "local_runtime_service.stderr.log",
    );
    return {
      ...base,
      stateFile,
      localLogFile,
      localErrLogFile,
    };
  }

  private async commandExists(command: string) {
    const normalized = normalizeString(command);
    if (!normalized) {
      return false;
    }
    if (detectWindows()) {
      const script = [
        "$ErrorActionPreference='SilentlyContinue'",
        `$cmd=Get-Command ${toPowerShellSingleQuotedLiteral(normalized)} -ErrorAction SilentlyContinue`,
        "if ($cmd -and $cmd.Source) { exit 0 }",
        "exit 1",
      ].join("; ");
      const output = await this.runCommandImpl({
        command: "powershell.exe",
        args: [
          "-NoLogo",
          "-NonInteractive",
          "-WindowStyle",
          "Hidden",
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          script,
        ],
        timeoutMs: 30 * 1000,
      });
      return output.exitCode === 0;
    }
    const output = await this.runCommandImpl({
      command: "sh",
      args: [
        "-lc",
        `command -v ${toPosixSingleQuotedLiteral(normalized)} >/dev/null 2>&1`,
      ],
      timeoutMs: 30 * 1000,
    });
    return output.exitCode === 0;
  }

  private async isPidAlive(pid: number) {
    const targetPid = toInteger(pid, 0);
    if (targetPid <= 0) {
      return false;
    }
    if (detectWindows()) {
      const script = [
        "$ErrorActionPreference='SilentlyContinue'",
        `$proc=Get-Process -Id ${targetPid} -ErrorAction SilentlyContinue`,
        "if ($proc) { exit 0 }",
        "exit 1",
      ].join("; ");
      const output = await this.runCommandImpl({
        command: "powershell.exe",
        args: [
          "-NoLogo",
          "-NonInteractive",
          "-WindowStyle",
          "Hidden",
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          script,
        ],
        timeoutMs: 30 * 1000,
      });
      return output.exitCode === 0;
    }
    try {
      const runtime = globalThis as {
        process?: { kill?: (pid: number, signal?: number | string) => void };
      };
      if (typeof runtime.process?.kill === "function") {
        runtime.process.kill(targetPid, 0);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  private async terminatePid(pid: number) {
    const targetPid = toInteger(pid, 0);
    if (targetPid <= 0) {
      return;
    }
    if (detectWindows()) {
      const script = [
        "$ErrorActionPreference='SilentlyContinue'",
        `Stop-Process -Id ${targetPid} -Force -ErrorAction SilentlyContinue`,
        "exit 0",
      ].join("; ");
      await this.runCommandImpl({
        command: "powershell.exe",
        args: [
          "-NoLogo",
          "-NonInteractive",
          "-WindowStyle",
          "Hidden",
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          script,
        ],
        timeoutMs: 30 * 1000,
      });
      return;
    }
    try {
      const runtime = globalThis as {
        process?: { kill?: (pid: number, signal?: number | string) => void };
      };
      if (typeof runtime.process?.kill === "function") {
        runtime.process.kill(targetPid, "SIGTERM");
        await sleepMs(800);
        if (await this.isPidAlive(targetPid)) {
          runtime.process.kill(targetPid, "SIGKILL");
        }
      }
    } catch {
      // ignore
    }
  }

  private async resolveListeningPidByPort(host: string, port: number) {
    const normalizedHost = normalizeString(host) || "127.0.0.1";
    const normalizedPort = normalizePort(port, 0);
    if (normalizedPort <= 0) {
      return 0;
    }
    if (detectWindows()) {
      const script = [
        "$ErrorActionPreference='SilentlyContinue'",
        `$targetHost=${toPowerShellSingleQuotedLiteral(normalizedHost)}`,
        `$targetPort=${normalizedPort}`,
        "$conn = $null",
        "try {",
        "  $conn = Get-NetTCPConnection -LocalPort $targetPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1",
        "} catch {}",
        "if ($conn -and $conn.OwningProcess) { Write-Output $conn.OwningProcess; exit 0 }",
        "exit 1",
      ].join("; ");
      const output = await this.runCommandImpl({
        command: "powershell.exe",
        args: [
          "-NoLogo",
          "-NonInteractive",
          "-WindowStyle",
          "Hidden",
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          script,
        ],
        timeoutMs: 30 * 1000,
      });
      if (output.exitCode !== 0) {
        return 0;
      }
      return toInteger(
        String(output.stdout || "")
          .split(/\r?\n/)
          .map((entry) => normalizeString(entry))
          .filter(Boolean)
          .pop(),
        0,
      );
    }
    const output = await this.runCommandImpl({
      command: "sh",
      args: ["-lc", `lsof -tiTCP:${normalizedPort} -sTCP:LISTEN | head -n 1`],
      timeoutMs: 30 * 1000,
    });
    if (output.exitCode !== 0) {
      return 0;
    }
    return toInteger(
      String(output.stdout || "")
        .split(/\r?\n/)
        .map((entry) => normalizeString(entry))
        .filter(Boolean)
        .pop(),
      0,
    );
  }

  private async probeLocalService(host: string, port: number) {
    const fetchImpl = getGlobalFetch();
    if (!fetchImpl) {
      return { ok: false, status: 0, body: null as unknown };
    }
    const controller =
      typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => {
          try {
            controller.abort();
          } catch {
            // ignore
          }
        }, 1500)
      : undefined;
    try {
      const response = await fetchImpl(buildServiceUrl(host, port, "/"), {
        method: "GET",
        signal: controller?.signal,
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      return { ok: response.ok, status: response.status, body };
    } catch {
      return { ok: false, status: 0, body: null as unknown };
    } finally {
      if (typeof timer !== "undefined") {
        clearTimeout(timer);
      }
    }
  }

  private async selectPortWithFallback(
    host: string,
    requestedPort: number,
    span: number,
  ) {
    const triedPorts: number[] = [];
    const fallbackSpan = normalizePortFallbackSpan(span, 0);
    for (let offset = 0; offset <= fallbackSpan; offset++) {
      const candidate = requestedPort + offset;
      if (candidate < 1 || candidate > 65535) {
        continue;
      }
      triedPorts.push(candidate);
      if (await isTcpPortAvailable(host, candidate)) {
        return {
          selectedPort: candidate,
          triedPorts,
        };
      }
    }
    return {
      selectedPort: 0,
      triedPorts,
    };
  }

  private async readLocalRuntimeState(stateFile: string) {
    if (!(await pathExists(stateFile))) {
      return null;
    }
    return readJsonObject(stateFile);
  }

  private async writeLocalRuntimeState(
    stateFile: string,
    payload: Record<string, unknown>,
  ) {
    await ensureDirectory(getParentFsPath(stateFile));
    await writeJsonObject(stateFile, payload);
  }

  private async buildLocalStatus(args: {
    layout: {
      stateFile: string;
    };
    hostFallback: string;
    portFallback: number;
  }) {
    const statePayload = await this.readLocalRuntimeState(
      args.layout.stateFile,
    );
    const host = normalizeString(statePayload?.host) || args.hostFallback;
    const port = normalizePort(statePayload?.port, args.portFallback);
    const pid = toInteger(statePayload?.pid, 0);
    const pidAlive = pid > 0 ? await this.isPidAlive(pid) : false;
    const health = await this.probeLocalService(host, port);
    const healthy = health.status === 200;
    const status = healthy ? "running" : pidAlive ? "starting" : "stopped";
    return {
      ok: true,
      exitCode: 0,
      message: `Local runtime status: ${status}.`,
      stdout: "",
      stderr: "",
      details: {
        mode: "local",
        status,
        pid: pid > 0 ? pid : undefined,
        pid_alive: pidAlive,
        service_healthy: healthy,
        host,
        port,
        url: buildServiceUrl(host, port, "/"),
        state_file: args.layout.stateFile,
      },
      command: "bridge-local-status",
      args: [] as string[],
    } as SkillRunnerCtlCommandResult;
  }

  private resolveDirectBootstrapLayout(args: SkillRunnerAgentBootstrapArgs) {
    const installDir = normalizeString(args.installDir);
    if (!installDir || !isAbsoluteFsPath(installDir)) {
      return {
        ok: false as const,
        message: "invalid installDir for direct bootstrap",
      };
    }
    const releasesDir = getParentFsPath(installDir);
    const inferredLocalRoot = getParentFsPath(releasesDir);
    const localRoot =
      normalizeSafeLocalRootArg(args.localRoot) ||
      normalizeSafeLocalRootArg(inferredLocalRoot);
    if (!localRoot) {
      return {
        ok: false as const,
        message: "failed to resolve safe localRoot for direct bootstrap",
      };
    }
    const agentCacheDir = joinFsPath(localRoot, "agent-cache");
    const dataDir = joinFsPath(localRoot, "data");
    const reportFilePath =
      normalizeString(args.reportFilePath) ||
      joinFsPath(dataDir, "agent_bootstrap_report.json");
    const agentHome = joinFsPath(agentCacheDir, "agent-home");
    const npmPrefix = joinFsPath(agentCacheDir, "npm");
    const uvCacheDir = joinFsPath(agentCacheDir, "uv_cache");
    const uvVenvDir = joinFsPath(agentCacheDir, "uv_venv");
    return {
      ok: true as const,
      installDir,
      localRoot,
      dataDir,
      agentCacheDir,
      reportFilePath,
      agentHome,
      npmPrefix,
      uvCacheDir,
      uvVenvDir,
    };
  }

  async runDirectAgentBootstrap(
    args: SkillRunnerAgentBootstrapArgs,
  ): Promise<SkillRunnerCtlCommandResult> {
    const layout = this.resolveDirectBootstrapLayout(args);
    if (!layout.ok) {
      return {
        ok: false,
        exitCode: 2,
        message: layout.message,
        stdout: "",
        stderr: "",
        details: {},
        command: "",
        args: [],
      };
    }
    const directStdoutFile = joinFsPath(
      layout.dataDir,
      "logs",
      "plugin_direct_bootstrap_stdout.log",
    );
    const directStderrFile = joinFsPath(
      layout.dataDir,
      "logs",
      "plugin_direct_bootstrap_stderr.log",
    );
    const invocation = detectWindows()
      ? {
          command: "powershell.exe",
          args: [
            "-NoLogo",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            [
              "$ErrorActionPreference='Stop'",
              "if ([string]::IsNullOrWhiteSpace($env:PATH) -and -not [string]::IsNullOrWhiteSpace($env:Path)) { $env:PATH = $env:Path }",
              "$npmCommand = Get-Command npm -ErrorAction SilentlyContinue",
              'if ($npmCommand -and $npmCommand.Source) { $npmDir = Split-Path -Parent $npmCommand.Source; if ($npmDir -and ($env:PATH -notlike "*${npmDir}*")) { $env:PATH = "$npmDir;$env:PATH" } }',
              "$uvCommand = Get-Command uv -ErrorAction SilentlyContinue",
              'if ($uvCommand -and $uvCommand.Source) { $uvDir = Split-Path -Parent $uvCommand.Source; if ($uvDir -and ($env:PATH -notlike "*${uvDir}*")) { $env:PATH = "$uvDir;$env:PATH" }; $uvExe = $uvCommand.Source } else { $uvExe = \'uv\' }',
              `$env:SKILL_RUNNER_RUNTIME_MODE = ${toPowerShellSingleQuotedLiteral("local")}`,
              `$env:SKILL_RUNNER_LOCAL_ROOT = ${toPowerShellSingleQuotedLiteral(layout.localRoot)}`,
              `$env:SKILL_RUNNER_DATA_DIR = ${toPowerShellSingleQuotedLiteral(layout.dataDir)}`,
              `$env:SKILL_RUNNER_AGENT_CACHE_DIR = ${toPowerShellSingleQuotedLiteral(layout.agentCacheDir)}`,
              `$env:SKILL_RUNNER_AGENT_HOME = ${toPowerShellSingleQuotedLiteral(layout.agentHome)}`,
              `$env:SKILL_RUNNER_NPM_PREFIX = ${toPowerShellSingleQuotedLiteral(layout.npmPrefix)}`,
              "$env:NPM_CONFIG_PREFIX = $env:SKILL_RUNNER_NPM_PREFIX",
              `$env:UV_CACHE_DIR = ${toPowerShellSingleQuotedLiteral(layout.uvCacheDir)}`,
              `$env:UV_PROJECT_ENVIRONMENT = ${toPowerShellSingleQuotedLiteral(layout.uvVenvDir)}`,
              `Set-Location -LiteralPath ${toPowerShellSingleQuotedLiteral(layout.installDir)}`,
              "New-Item -ItemType Directory -Path $env:SKILL_RUNNER_DATA_DIR -Force | Out-Null",
              "New-Item -ItemType Directory -Path $env:SKILL_RUNNER_AGENT_CACHE_DIR -Force | Out-Null",
              "New-Item -ItemType Directory -Path $env:SKILL_RUNNER_AGENT_HOME -Force | Out-Null",
              `New-Item -ItemType Directory -Path ${toPowerShellSingleQuotedLiteral(joinFsPath(layout.dataDir, "logs"))} -Force | Out-Null`,
              `$directStdoutFile = ${toPowerShellSingleQuotedLiteral(directStdoutFile)}`,
              `$directStderrFile = ${toPowerShellSingleQuotedLiteral(directStderrFile)}`,
              "if (Test-Path -LiteralPath $directStdoutFile) { Remove-Item -LiteralPath $directStdoutFile -Force -ErrorAction SilentlyContinue }",
              "if (Test-Path -LiteralPath $directStderrFile) { Remove-Item -LiteralPath $directStderrFile -Force -ErrorAction SilentlyContinue }",
              "try {",
              "  $proc = Start-Process -FilePath $uvExe -ArgumentList @('run','python','scripts/agent_manager.py','--ensure','--bootstrap-report-file'," +
                toPowerShellSingleQuotedLiteral(layout.reportFilePath) +
                ") -Wait -PassThru -NoNewWindow -RedirectStandardOutput $directStdoutFile -RedirectStandardError $directStderrFile",
              "  exit [int]$proc.ExitCode",
              "} catch {",
              "  $_ | Out-File -LiteralPath $directStderrFile -Encoding utf8 -Append",
              "  exit 1",
              "}",
            ].join("; "),
          ],
        }
      : {
          command: "sh",
          args: [
            "-lc",
            [
              "set -e",
              `cd ${toPosixSingleQuotedLiteral(layout.installDir)}`,
              `export SKILL_RUNNER_RUNTIME_MODE=${toPosixSingleQuotedLiteral("local")}`,
              `export SKILL_RUNNER_LOCAL_ROOT=${toPosixSingleQuotedLiteral(layout.localRoot)}`,
              `export SKILL_RUNNER_DATA_DIR=${toPosixSingleQuotedLiteral(layout.dataDir)}`,
              `export SKILL_RUNNER_AGENT_CACHE_DIR=${toPosixSingleQuotedLiteral(layout.agentCacheDir)}`,
              `export SKILL_RUNNER_AGENT_HOME=${toPosixSingleQuotedLiteral(layout.agentHome)}`,
              `export SKILL_RUNNER_NPM_PREFIX=${toPosixSingleQuotedLiteral(layout.npmPrefix)}`,
              'export NPM_CONFIG_PREFIX="$SKILL_RUNNER_NPM_PREFIX"',
              `export UV_CACHE_DIR=${toPosixSingleQuotedLiteral(layout.uvCacheDir)}`,
              `export UV_PROJECT_ENVIRONMENT=${toPosixSingleQuotedLiteral(layout.uvVenvDir)}`,
              'mkdir -p "$SKILL_RUNNER_DATA_DIR" "$SKILL_RUNNER_AGENT_CACHE_DIR" "$SKILL_RUNNER_AGENT_HOME"',
              `mkdir -p ${toPosixSingleQuotedLiteral(joinFsPath(layout.dataDir, "logs"))}`,
              `DIRECT_STDOUT=${toPosixSingleQuotedLiteral(directStdoutFile)}`,
              `DIRECT_STDERR=${toPosixSingleQuotedLiteral(directStderrFile)}`,
              'rm -f "$DIRECT_STDOUT" "$DIRECT_STDERR"',
              `uv run python scripts/agent_manager.py --ensure --bootstrap-report-file ${toPosixSingleQuotedLiteral(layout.reportFilePath)} 1>"$DIRECT_STDOUT" 2>"$DIRECT_STDERR"`,
            ].join(" && "),
          ],
        };
    const runOnce = async () => {
      const output = await this.runCommandImpl({
        command: invocation.command,
        args: invocation.args,
        timeoutMs: 20 * 60 * 1000,
      });
      const normalized = normalizeCtlResult({
        output,
        command: invocation.command,
        argv: invocation.args,
        fallbackMessage: "direct agent bootstrap finished",
      });
      let directStdoutPreview = "";
      let directStderrPreview = "";
      if (await pathExists(directStdoutFile)) {
        try {
          directStdoutPreview = previewText(
            await readUtf8File(directStdoutFile),
            1200,
          );
        } catch {
          directStdoutPreview = "";
        }
      }
      if (await pathExists(directStderrFile)) {
        try {
          directStderrPreview = previewText(
            await readUtf8File(directStderrFile),
            1200,
          );
        } catch {
          directStderrPreview = "";
        }
      }
      return {
        normalized,
        directStdoutPreview,
        directStderrPreview,
      };
    };

    const shouldRetryBrokenUvVenv = (text: string) =>
      /failed to locate pyvenv\.cfg/i.test(text) || /pyvenv\.cfg/i.test(text);

    let retryAttempted = false;
    let retryReason = "";
    let runResult = await runOnce();
    if (!runResult.normalized.ok) {
      const failureText = [
        normalizeString(runResult.normalized.message),
        normalizeString(runResult.normalized.stderr),
        normalizeString(runResult.directStderrPreview),
      ]
        .filter(Boolean)
        .join("\n");
      if (shouldRetryBrokenUvVenv(failureText)) {
        retryAttempted = true;
        retryReason = "broken-uv-venv-pyvenv-cfg";
        await removePath(layout.uvVenvDir);
        appendSkillRunnerLocalDeployDebugLog({
          level: "warn",
          operation: "local-direct-agent-bootstrap-retry",
          stage: "local-direct-agent-bootstrap-retry",
          message:
            "direct bootstrap detected broken uv venv, removed uv_venv and retrying once",
          details: {
            uvVenvDir: layout.uvVenvDir,
            reason: retryReason,
          },
        });
        runResult = await runOnce();
      }
    }

    const refinedMessage =
      !runResult.normalized.ok &&
      !normalizeString(runResult.normalized.stderr) &&
      !normalizeString(runResult.normalized.stdout) &&
      (runResult.directStderrPreview || runResult.directStdoutPreview)
        ? runResult.directStderrPreview || runResult.directStdoutPreview
        : runResult.normalized.message;
    const details = {
      ...(isObjectRecord(runResult.normalized.details)
        ? runResult.normalized.details
        : {}),
      bootstrap_report_file: layout.reportFilePath,
      local_root: layout.localRoot,
      data_dir: layout.dataDir,
      agent_cache_dir: layout.agentCacheDir,
      strategy: "direct-agent-manager",
      direct_stdout_file: directStdoutFile,
      direct_stderr_file: directStderrFile,
      direct_stdout_preview: runResult.directStdoutPreview,
      direct_stderr_preview: runResult.directStderrPreview,
      retry_attempted: retryAttempted,
      retry_reason: retryReason || undefined,
    };
    const result = {
      ...runResult.normalized,
      message: refinedMessage,
      details,
    };
    appendCtlLog({
      level: result.ok ? "info" : "warn",
      operation: "local-direct-agent-bootstrap",
      message: result.ok
        ? "direct agent bootstrap succeeded"
        : "direct agent bootstrap failed",
      result,
    });
    return result;
  }

  async bootstrapLocalRuntime(
    args: SkillRunnerAgentBootstrapArgs,
  ): Promise<SkillRunnerCtlCommandResult> {
    return this.runDirectAgentBootstrap(args);
  }

  async preflightLocalRuntime(
    args: SkillRunnerLocalRuntimeBridgeArgs,
  ): Promise<SkillRunnerCtlCommandResult> {
    const layout = this.resolveLocalRuntimeLayout({
      installDir: args.installDir,
      localRoot: args.localRoot,
    });
    if (!layout.ok) {
      const result: SkillRunnerCtlCommandResult = {
        ok: false,
        exitCode: 2,
        message: layout.message,
        stdout: "",
        stderr: "",
        details: {},
        command: "bridge-local-preflight",
        args: [],
      };
      appendCtlLog({
        level: "warn",
        operation: "local-bridge-preflight",
        message: "bridge local preflight failed to resolve layout",
        result,
      });
      return result;
    }
    const host = normalizeString(args.host) || "127.0.0.1";
    const requestedPort = normalizePort(args.port, 29813);
    const fallbackSpan = normalizePortFallbackSpan(args.portFallbackSpan, 10);
    const blockingIssues: Record<string, unknown>[] = [];
    const warnings: Record<string, unknown>[] = [];

    const uvExists = await this.commandExists("uv");
    const nodeExists = await this.commandExists("node");
    const npmExists = await this.commandExists("npm");
    const tarExists = await this.commandExists("tar");
    if (!uvExists) {
      blockingIssues.push({
        code: "missing_dependency",
        message: "Missing required dependency: uv.",
        component: "uv",
      });
    }
    if (!tarExists) {
      blockingIssues.push({
        code: "missing_dependency",
        message: "Missing required dependency: tar.",
        component: "tar",
      });
    }
    const requiredFiles = [
      {
        id: "server-main",
        path: joinFsPath(layout.installDir, "server", "main.py"),
      },
      {
        id: "agent-manager",
        path: joinFsPath(layout.installDir, "scripts", "agent_manager.py"),
      },
    ];
    const requiredFileChecks: Record<string, unknown> = {};
    for (const target of requiredFiles) {
      const exists = await pathExists(target.path);
      requiredFileChecks[target.id] = {
        path: target.path,
        exists,
        readable: exists,
      };
      if (!exists) {
        blockingIssues.push({
          code: "required_file_missing",
          message: `Required entry file missing: ${target.path}.`,
          file_id: target.id,
          path: target.path,
        });
      }
    }
    const portSelection = await this.selectPortWithFallback(
      host,
      requestedPort,
      fallbackSpan,
    );
    if (portSelection.selectedPort <= 0) {
      blockingIssues.push({
        code: "port_unavailable",
        message: "No available port found in fallback range.",
        host,
        requested_port: requestedPort,
        port_fallback_span: fallbackSpan,
        tried_ports: portSelection.triedPorts,
      });
    }
    const bootstrapReportExists = await pathExists(layout.reportFilePath);
    let bootstrapOutcome = "";
    if (bootstrapReportExists) {
      const report = await readJsonObject(layout.reportFilePath);
      const summary = isObjectRecord(report?.summary) ? report.summary : {};
      bootstrapOutcome = normalizeString(summary?.outcome);
      if (!report) {
        warnings.push({
          code: "bootstrap_report_unreadable",
          message: `Bootstrap report is unreadable: ${layout.reportFilePath}.`,
          path: layout.reportFilePath,
        });
      } else if (bootstrapOutcome === "partial_failure") {
        warnings.push({
          code: "bootstrap_partial_failure",
          message: "Bootstrap report indicates partial_failure.",
          path: layout.reportFilePath,
          outcome: bootstrapOutcome,
        });
      }
    } else {
      warnings.push({
        code: "bootstrap_report_missing",
        message: `Bootstrap report not found: ${layout.reportFilePath}.`,
        path: layout.reportFilePath,
      });
    }

    const statePayload = await this.readLocalRuntimeState(layout.stateFile);
    const statePid = toInteger(statePayload?.pid, 0);
    const statePidAlive =
      statePid > 0 ? await this.isPidAlive(statePid) : false;
    const stateStale = !!statePayload && !statePidAlive;
    if (stateStale) {
      warnings.push({
        code: "stale_state_file",
        message: "State file exists but recorded pid is not alive.",
        path: layout.stateFile,
        pid: statePid > 0 ? statePid : undefined,
      });
    }

    const ok = blockingIssues.length === 0;
    const result: SkillRunnerCtlCommandResult = {
      ok,
      exitCode: ok ? 0 : 2,
      message: ok
        ? warnings.length > 0
          ? "Preflight passed with warnings."
          : "Preflight passed."
        : "Preflight failed with blocking issues.",
      stdout: "",
      stderr: "",
      details: {
        mode: "local",
        checks: {
          dependencies: {
            uv: uvExists,
            node: nodeExists,
            npm: npmExists,
            tar: tarExists,
          },
          required_files: requiredFileChecks,
          integrity: {
            checked: false,
            source: "plugin-bridge",
          },
          port: {
            host,
            requested_port: requestedPort,
            port_fallback_span: fallbackSpan,
            selected_port:
              portSelection.selectedPort > 0
                ? portSelection.selectedPort
                : null,
            tried_ports: portSelection.triedPorts,
            available: portSelection.selectedPort > 0,
          },
          bootstrap_report: {
            path: layout.reportFilePath,
            exists: bootstrapReportExists,
            parse_ok: bootstrapReportExists,
            outcome: bootstrapOutcome || null,
          },
          state_file: {
            path: layout.stateFile,
            exists: !!statePayload,
            parse_ok: statePayload
              ? true
              : !(await pathExists(layout.stateFile)),
            pid: statePid > 0 ? statePid : null,
            pid_alive: statePidAlive,
            stale: stateStale,
          },
        },
        blocking_issues: blockingIssues,
        warnings,
        suggested_next: {
          mode: "local",
          host,
          requested_port: requestedPort,
          port:
            portSelection.selectedPort > 0
              ? portSelection.selectedPort
              : requestedPort,
          port_fallback_span: fallbackSpan,
          command:
            "plugin-bridge up --mode local " +
            `--host ${host} --port ${
              portSelection.selectedPort > 0
                ? portSelection.selectedPort
                : requestedPort
            } --port-fallback-span ${fallbackSpan}`,
        },
        strategy: "plugin-bridge-native",
      },
      command: "bridge-local-preflight",
      args: [],
    };
    appendCtlLog({
      level: result.ok ? "info" : "warn",
      operation: "local-bridge-preflight",
      message: result.ok
        ? "bridge local preflight succeeded"
        : "bridge local preflight failed",
      result,
    });
    return result;
  }

  async statusLocalRuntime(
    args: SkillRunnerLocalRuntimeBridgeArgs,
  ): Promise<SkillRunnerCtlCommandResult> {
    const layout = this.resolveLocalRuntimeLayout({
      installDir: args.installDir,
      localRoot: args.localRoot,
    });
    if (!layout.ok) {
      return {
        ok: false,
        exitCode: 2,
        message: layout.message,
        stdout: "",
        stderr: "",
        details: {},
        command: "bridge-local-status",
        args: [],
      };
    }
    const host = normalizeString(args.host) || "127.0.0.1";
    const port = normalizePort(args.port, 29813);
    const result = await this.buildLocalStatus({
      layout: {
        stateFile: layout.stateFile,
      },
      hostFallback: host,
      portFallback: port,
    });
    appendCtlLog({
      level: result.ok ? "info" : "warn",
      operation: "local-bridge-status",
      message: "bridge local status completed",
      result,
    });
    return result;
  }

  async downLocalRuntime(
    args: SkillRunnerLocalRuntimeBridgeArgs,
  ): Promise<SkillRunnerCtlCommandResult> {
    const layout = this.resolveLocalRuntimeLayout({
      installDir: args.installDir,
      localRoot: args.localRoot,
    });
    if (!layout.ok) {
      return {
        ok: false,
        exitCode: 2,
        message: layout.message,
        stdout: "",
        stderr: "",
        details: {},
        command: "bridge-local-down",
        args: [],
      };
    }
    const statePayload = await this.readLocalRuntimeState(layout.stateFile);
    const host =
      normalizeString(statePayload?.host) ||
      normalizeString(args.host) ||
      "127.0.0.1";
    const port = normalizePort(
      statePayload?.port,
      normalizePort(args.port, 29813),
    );
    let pid = toInteger(statePayload?.pid, 0);
    if (pid <= 0) {
      pid = await this.resolveListeningPidByPort(host, port);
    }
    if (pid > 0 && (await this.isPidAlive(pid))) {
      await this.terminatePid(pid);
    }
    await removePath(layout.stateFile);
    const health = await this.probeLocalService(host, port);
    if (health.status === 200) {
      const result: SkillRunnerCtlCommandResult = {
        ok: false,
        exitCode: 1,
        message: "Local runtime is still running after stop attempt.",
        stdout: "",
        stderr: "",
        details: {
          mode: "local",
          host,
          port,
          pid: pid > 0 ? pid : null,
          state_file: layout.stateFile,
          strategy: "plugin-bridge-native",
        },
        command: "bridge-local-down",
        args: [],
      };
      appendCtlLog({
        level: "warn",
        operation: "local-bridge-down",
        message: "bridge local down failed to stop service",
        result,
      });
      return result;
    }
    const result: SkillRunnerCtlCommandResult = {
      ok: true,
      exitCode: 0,
      message: "Local runtime stopped.",
      stdout: "",
      stderr: "",
      details: {
        mode: "local",
        host,
        port,
        pid: pid > 0 ? pid : null,
        state_file: layout.stateFile,
      },
      command: "bridge-local-down",
      args: [],
    };
    appendCtlLog({
      level: "info",
      operation: "local-bridge-down",
      message: "bridge local down completed",
      result,
    });
    return result;
  }

  async upLocalRuntime(
    args: SkillRunnerLocalRuntimeBridgeArgs,
  ): Promise<SkillRunnerCtlCommandResult> {
    const layout = this.resolveLocalRuntimeLayout({
      installDir: args.installDir,
      localRoot: args.localRoot,
    });
    if (!layout.ok) {
      return {
        ok: false,
        exitCode: 2,
        message: layout.message,
        stdout: "",
        stderr: "",
        details: {},
        command: "bridge-local-up",
        args: [],
      };
    }
    if (!(await this.commandExists("uv"))) {
      return {
        ok: false,
        exitCode: 2,
        message: "uv is not installed.",
        stdout: "",
        stderr: "",
        details: {
          mode: "local",
          strategy: "plugin-bridge-native",
        },
        command: "bridge-local-up",
        args: [],
      };
    }
    const host = normalizeString(args.host) || "127.0.0.1";
    const requestedPort = normalizePort(args.port, 29813);
    const fallbackSpan = normalizePortFallbackSpan(args.portFallbackSpan, 10);
    const waitSeconds = Math.max(1, toInteger(args.waitSeconds, 30));

    const currentStatus = await this.buildLocalStatus({
      layout: {
        stateFile: layout.stateFile,
      },
      hostFallback: host,
      portFallback: requestedPort,
    });
    if (
      currentStatus.ok &&
      normalizeString(currentStatus.details?.status) === "running"
    ) {
      const alreadyRunning: SkillRunnerCtlCommandResult = {
        ...currentStatus,
        message: "Local runtime already running.",
      };
      appendCtlLog({
        level: "info",
        operation: "local-bridge-up",
        message: "bridge local up skipped because runtime already running",
        result: alreadyRunning,
      });
      return alreadyRunning;
    }

    const portSelection = await this.selectPortWithFallback(
      host,
      requestedPort,
      fallbackSpan,
    );
    if (portSelection.selectedPort <= 0) {
      return {
        ok: false,
        exitCode: 1,
        message: "No available port found in fallback range.",
        stdout: "",
        stderr: "",
        details: {
          mode: "local",
          host,
          requested_port: requestedPort,
          port_fallback_span: fallbackSpan,
          tried_ports: portSelection.triedPorts,
          strategy: "plugin-bridge-native",
        },
        command: "bridge-local-up",
        args: [],
      };
    }
    const selectedPort = portSelection.selectedPort;
    const fallbackUsed = selectedPort !== requestedPort;

    await ensureDirectory(layout.dataDir);
    await ensureDirectory(layout.agentCacheDir);
    await ensureDirectory(layout.agentHome);
    await ensureDirectory(getParentFsPath(layout.localLogFile));
    const pidCaptureFile = joinFsPath(
      layout.agentCacheDir,
      "local_runtime_startup.pid",
    );
    await removePath(pidCaptureFile);

    let output: CommandOutput = {
      exitCode: 1,
      stdout: "",
      stderr: "failed to start local runtime process",
    };
    if (detectWindows()) {
      const script = [
        "$ErrorActionPreference='Stop'",
        "if ([string]::IsNullOrWhiteSpace($env:PATH) -and -not [string]::IsNullOrWhiteSpace($env:Path)) { $env:PATH = $env:Path }",
        "$uvCommand = Get-Command uv -ErrorAction SilentlyContinue",
        'if ($uvCommand -and $uvCommand.Source) { $uvDir = Split-Path -Parent $uvCommand.Source; if ($uvDir -and ($env:PATH -notlike "*${uvDir}*")) { $env:PATH = "$uvDir;$env:PATH" }; $uvExe = $uvCommand.Source } else { $uvExe = \'uv\' }',
        `$env:SKILL_RUNNER_RUNTIME_MODE = ${toPowerShellSingleQuotedLiteral("local")}`,
        `$env:SKILL_RUNNER_LOCAL_ROOT = ${toPowerShellSingleQuotedLiteral(layout.localRoot)}`,
        `$env:SKILL_RUNNER_DATA_DIR = ${toPowerShellSingleQuotedLiteral(layout.dataDir)}`,
        `$env:SKILL_RUNNER_AGENT_CACHE_DIR = ${toPowerShellSingleQuotedLiteral(layout.agentCacheDir)}`,
        `$env:SKILL_RUNNER_AGENT_HOME = ${toPowerShellSingleQuotedLiteral(layout.agentHome)}`,
        `$env:SKILL_RUNNER_NPM_PREFIX = ${toPowerShellSingleQuotedLiteral(layout.npmPrefix)}`,
        "$env:NPM_CONFIG_PREFIX = $env:SKILL_RUNNER_NPM_PREFIX",
        `$env:UV_CACHE_DIR = ${toPowerShellSingleQuotedLiteral(layout.uvCacheDir)}`,
        `$env:UV_PROJECT_ENVIRONMENT = ${toPowerShellSingleQuotedLiteral(layout.uvVenvDir)}`,
        `$pidCaptureFile = ${toPowerShellSingleQuotedLiteral(pidCaptureFile)}`,
        `$argsList = @('run','uvicorn','server.main:app','--host',${toPowerShellSingleQuotedLiteral(
          host,
        )},'--port',${toPowerShellSingleQuotedLiteral(String(selectedPort))})`,
        `$proc = Start-Process -FilePath $uvExe -ArgumentList $argsList -WorkingDirectory ${toPowerShellSingleQuotedLiteral(
          layout.installDir,
        )} -PassThru -WindowStyle Hidden -RedirectStandardOutput ${toPowerShellSingleQuotedLiteral(
          layout.localLogFile,
        )} -RedirectStandardError ${toPowerShellSingleQuotedLiteral(layout.localErrLogFile)}`,
        "Set-Content -LiteralPath $pidCaptureFile -Value ([string]$proc.Id) -Encoding ascii -Force",
        "Write-Output $proc.Id",
        "exit 0",
      ].join("; ");
      output = await this.runCommandImpl({
        command: "powershell.exe",
        args: [
          "-NoLogo",
          "-NonInteractive",
          "-WindowStyle",
          "Hidden",
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          script,
        ],
        timeoutMs: 2 * 60 * 1000,
      });
    } else {
      const commandScript = [
        "set -e",
        `cd ${toPosixSingleQuotedLiteral(layout.installDir)}`,
        `export SKILL_RUNNER_RUNTIME_MODE=${toPosixSingleQuotedLiteral("local")}`,
        `export SKILL_RUNNER_LOCAL_ROOT=${toPosixSingleQuotedLiteral(layout.localRoot)}`,
        `export SKILL_RUNNER_DATA_DIR=${toPosixSingleQuotedLiteral(layout.dataDir)}`,
        `export SKILL_RUNNER_AGENT_CACHE_DIR=${toPosixSingleQuotedLiteral(layout.agentCacheDir)}`,
        `export SKILL_RUNNER_AGENT_HOME=${toPosixSingleQuotedLiteral(layout.agentHome)}`,
        `export SKILL_RUNNER_NPM_PREFIX=${toPosixSingleQuotedLiteral(layout.npmPrefix)}`,
        'export NPM_CONFIG_PREFIX="$SKILL_RUNNER_NPM_PREFIX"',
        `export UV_CACHE_DIR=${toPosixSingleQuotedLiteral(layout.uvCacheDir)}`,
        `export UV_PROJECT_ENVIRONMENT=${toPosixSingleQuotedLiteral(layout.uvVenvDir)}`,
        `nohup uv run uvicorn server.main:app --host ${toPosixSingleQuotedLiteral(
          host,
        )} --port ${toPosixSingleQuotedLiteral(String(selectedPort))} >>${toPosixSingleQuotedLiteral(
          layout.localLogFile,
        )} 2>>${toPosixSingleQuotedLiteral(layout.localErrLogFile)} < /dev/null &`,
        `echo $! > ${toPosixSingleQuotedLiteral(pidCaptureFile)}`,
        "echo $!",
      ].join(" && ");
      output = await this.runCommandImpl({
        command: "sh",
        args: ["-lc", commandScript],
        timeoutMs: 2 * 60 * 1000,
      });
    }
    let pid = toInteger(
      String(output.stdout || "")
        .split(/\r?\n/)
        .map((entry) => normalizeString(entry))
        .filter(Boolean)
        .pop(),
      0,
    );
    if (pid <= 0 && (await pathExists(pidCaptureFile))) {
      pid = toInteger(await readUtf8File(pidCaptureFile), 0);
    }
    if (output.exitCode !== 0) {
      await removePath(pidCaptureFile);
      const failed: SkillRunnerCtlCommandResult = {
        ok: false,
        exitCode: output.exitCode || 1,
        message:
          normalizeString(output.stderr) ||
          normalizeString(output.stdout) ||
          "Failed to start local runtime.",
        stdout: output.stdout,
        stderr: output.stderr,
        details: {
          mode: "local",
          host,
          requested_port: requestedPort,
          port: selectedPort,
          port_fallback_span: fallbackSpan,
          port_fallback_used: fallbackUsed,
          tried_ports: portSelection.triedPorts,
          log_path: layout.localLogFile,
          stderr_log_path: layout.localErrLogFile,
          strategy: "plugin-bridge-native",
        },
        command: detectWindows() ? "powershell.exe" : "sh",
        args: [],
      };
      appendCtlLog({
        level: "warn",
        operation: "local-bridge-up",
        message: "bridge local up failed to spawn process",
        result: failed,
      });
      return failed;
    }

    const deadline = Date.now() + waitSeconds * 1000;
    let healthy = false;
    while (Date.now() < deadline) {
      const health = await this.probeLocalService(host, selectedPort);
      if (health.status === 200) {
        healthy = true;
        break;
      }
      if (pid > 0 && !(await this.isPidAlive(pid))) {
        break;
      }
      await sleepMs(500);
    }
    if (!healthy) {
      if (pid <= 0) {
        pid = await this.resolveListeningPidByPort(host, selectedPort);
      }
      if (pid > 0) {
        await this.terminatePid(pid);
      }
      await removePath(layout.stateFile);
      const failed: SkillRunnerCtlCommandResult = {
        ok: false,
        exitCode: 1,
        message: "Local runtime failed to become healthy within timeout.",
        stdout: "",
        stderr: "",
        details: {
          mode: "local",
          pid,
          host,
          requested_port: requestedPort,
          port: selectedPort,
          port_fallback_span: fallbackSpan,
          port_fallback_used: fallbackUsed,
          tried_ports: portSelection.triedPorts,
          url: buildServiceUrl(host, selectedPort, "/"),
          log_path: layout.localLogFile,
          stderr_log_path: layout.localErrLogFile,
          strategy: "plugin-bridge-native",
        },
        command: "bridge-local-up",
        args: [],
      };
      appendCtlLog({
        level: "warn",
        operation: "local-bridge-up",
        message: "bridge local up timed out waiting for health",
        result: failed,
      });
      await removePath(pidCaptureFile);
      return failed;
    }
    if (pid <= 0) {
      pid = await this.resolveListeningPidByPort(host, selectedPort);
    }
    await this.writeLocalRuntimeState(layout.stateFile, {
      pid: pid > 0 ? pid : null,
      host,
      port: selectedPort,
      started_at: nowIso(),
      mode: "local",
      log_path: layout.localLogFile,
    });

    const succeeded: SkillRunnerCtlCommandResult = {
      ok: true,
      exitCode: 0,
      message: fallbackUsed
        ? `Local runtime started on fallback port ${selectedPort} (requested ${requestedPort}).`
        : "Local runtime started.",
      stdout: "",
      stderr: "",
      details: {
        mode: "local",
        pid: pid > 0 ? pid : null,
        host,
        requested_port: requestedPort,
        port: selectedPort,
        port_fallback_span: fallbackSpan,
        port_fallback_used: fallbackUsed,
        tried_ports: portSelection.triedPorts,
        url: buildServiceUrl(host, selectedPort, "/"),
        log_path: layout.localLogFile,
        stderr_log_path: layout.localErrLogFile,
        state_file: layout.stateFile,
        strategy: "plugin-bridge-native",
      },
      command: "bridge-local-up",
      args: [],
    };
    appendCtlLog({
      level: "info",
      operation: "local-bridge-up",
      message: "bridge local up succeeded",
      result: succeeded,
    });
    await removePath(pidCaptureFile);
    return succeeded;
  }

  async doctorLocalRuntime(
    args: SkillRunnerLocalRuntimeBridgeArgs,
  ): Promise<SkillRunnerCtlCommandResult> {
    const layout = this.resolveLocalRuntimeLayout({
      installDir: args.installDir,
      localRoot: args.localRoot,
    });
    if (!layout.ok) {
      return {
        ok: false,
        exitCode: 2,
        message: layout.message,
        stdout: "",
        stderr: "",
        details: {},
        command: "bridge-local-doctor",
        args: [],
      };
    }
    const checks = {
      uv: await this.commandExists("uv"),
      node: await this.commandExists("node"),
      npm: await this.commandExists("npm"),
      tar: await this.commandExists("tar"),
      docker: await this.commandExists("docker"),
      ttyd: await this.commandExists("ttyd"),
    };
    const host = normalizeString(args.host) || "127.0.0.1";
    const port = normalizePort(args.port, 29813);
    const result: SkillRunnerCtlCommandResult = {
      ok: true,
      exitCode: 0,
      message: "Doctor completed.",
      stdout: "",
      stderr: "",
      details: {
        ok: true,
        exit_code: 0,
        mode: "local",
        checks,
        paths: {
          install_dir: layout.installDir,
          local_root: layout.localRoot,
          data_dir: layout.dataDir,
          agent_cache_root: layout.agentCacheDir,
          agent_home: layout.agentHome,
          npm_prefix: layout.npmPrefix,
          uv_cache_dir: layout.uvCacheDir,
          uv_project_environment: layout.uvVenvDir,
          state_file: layout.stateFile,
          local_log_file: layout.localLogFile,
          local_err_log_file: layout.localErrLogFile,
          bootstrap_report_file: layout.reportFilePath,
        },
        env_snapshot: {
          SKILL_RUNNER_RUNTIME_MODE: "local",
          SKILL_RUNNER_LOCAL_BIND_HOST: host,
          SKILL_RUNNER_LOCAL_PORT: String(port),
          SKILL_RUNNER_LOCAL_PORT_FALLBACK_SPAN: String(
            normalizePortFallbackSpan(args.portFallbackSpan, 10),
          ),
        },
        strategy: "plugin-bridge-native",
      },
      command: "bridge-local-doctor",
      args: [],
    };
    appendCtlLog({
      level: "info",
      operation: "local-bridge-doctor",
      message: "bridge local doctor completed",
      result,
    });
    return result;
  }

  async runSystemCommand(args: {
    command: string;
    args: string[];
    cwd?: string;
    timeoutMs?: number;
  }): Promise<SkillRunnerCtlCommandResult> {
    const output = await this.runCommandImpl({
      command: args.command,
      args: args.args,
      cwd: args.cwd,
      timeoutMs: args.timeoutMs,
    });
    const ok = output.exitCode === 0;
    return {
      ok,
      exitCode: output.exitCode,
      message:
        normalizeString(output.stderr) ||
        normalizeString(output.stdout) ||
        `${args.command} exited with code ${output.exitCode}`,
      stdout: output.stdout,
      stderr: output.stderr,
      details: {},
      command: args.command,
      args: args.args,
    };
  }

  async runCtlCommand(args: CtlArgs): Promise<SkillRunnerCtlCommandResult> {
    const invocation = buildCtlInvocation(args);
    if (this.shouldPreflightScripts) {
      if (!(await pathExists(args.ctlPath))) {
        return {
          ok: false,
          exitCode: 2,
          message: `ctl script not found: ${normalizeString(args.ctlPath)}`,
          stdout: "",
          stderr: "",
          details: {
            ctlPath: normalizeString(args.ctlPath),
          },
          command: invocation.command,
          args: invocation.argv,
        };
      }
    }
    const output = await this.runCommandImpl({
      command: invocation.command,
      args: invocation.argv,
      timeoutMs: 10 * 60 * 1000,
    });
    const result = normalizeCtlResult({
      output,
      command: invocation.command,
      argv: invocation.argv,
      fallbackMessage: `ctl ${args.command} finished`,
    });
    appendCtlLog({
      level: result.ok ? "info" : "warn",
      operation: `local-ctl-${args.command}`,
      message: result.ok
        ? `skill-runner ctl ${args.command} succeeded`
        : `skill-runner ctl ${args.command} failed`,
      result,
    });
    return result;
  }

  async runUninstallCommand(
    args: UninstallArgs,
  ): Promise<SkillRunnerCtlCommandResult> {
    const invocation = buildUninstallInvocation(args);
    if (this.shouldPreflightScripts) {
      if (!(await pathExists(args.uninstallPath))) {
        return {
          ok: false,
          exitCode: 2,
          message: `uninstall script not found: ${normalizeString(args.uninstallPath)}`,
          stdout: "",
          stderr: "",
          details: {
            uninstallPath: normalizeString(args.uninstallPath),
          },
          command: invocation.command,
          args: invocation.argv,
        };
      }
    }
    const output = await this.runCommandImpl({
      command: invocation.command,
      args: invocation.argv,
      timeoutMs: 10 * 60 * 1000,
    });
    const result = normalizeCtlResult({
      output,
      command: invocation.command,
      argv: invocation.argv,
      fallbackMessage: "uninstall finished",
    });
    appendCtlLog({
      level: result.ok ? "info" : "warn",
      operation: "local-uninstall",
      message: result.ok
        ? "skill-runner uninstall succeeded"
        : "skill-runner uninstall failed",
      result,
    });
    return result;
  }
}

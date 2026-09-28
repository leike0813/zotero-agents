import type { BackendInstance } from "../../../backends/types";
import {
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
} from "../../runtimePersistence";
import {
  getMozillaSubprocessModule,
  type MozillaSubprocessModule,
} from "../../../platform/subprocess";
import {
  buildRuntimeCommandLaunchPlan,
  getCachedRuntimeCommand,
  resolveRuntimeCommand,
  type RuntimeCommandLaunchSpec,
  type RuntimeCommandResolution,
} from "../../../platform/command";
import { buildSubprocessEnvironment } from "../../../platform/env";
import { joinNativePath } from "../../../platform/path";
import {
  buildPosixProcessGroupSignalInvocation,
  getRuntimeProcessControlSnapshot,
  validatePosixProcessGroupOwnership,
  type PosixProcessGroupSignal,
  type PosixProcessIdentity,
  type PosixProcessOwnershipRejectionReason,
  type PosixProcessOwnershipValidation,
  type RuntimeProcessCleanupStrategy,
  type ValidatedPosixProcessGroupTarget,
} from "../../../platform/processControl";
import { detectRuntimePlatform } from "../../../platform/runtimePlatform";
import { startLongLivedProcess } from "../../../platform/longLivedProcess";
import { shouldUseWindowsStdioBridge as shouldUseAcpWebSocketBridgeTransport } from "../../../platform/windowsStdioBridgeService";
import { isDebugModeEnabled } from "../../debugMode";
import { observeAcpRuntimeGauge } from "../diagnostics/acpRuntimePerformanceProfiler";
import { type BoundedWaitStartupOptions } from "../../../utils/wait";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export type AcpTransportLaunchArgs = {
  backend: BackendInstance;
  cwd: string;
  diagnosticCapture?: AcpTransportDiagnosticCaptureOptions;
  performanceProfileRequestId?: string;
  startup?: BoundedWaitStartupOptions;
};

export type AcpReadResult<T> = {
  done: boolean;
  value?: T;
};

export type AcpReadableReader<T> = {
  read: () => Promise<AcpReadResult<T>>;
  releaseLock: () => void;
};

export type AcpReadableLike<T> = {
  getReader: () => AcpReadableReader<T>;
};

export type AcpWritableWriter<T> = {
  write: (chunk: T) => Promise<void>;
  close?: () => Promise<void>;
  abort?: (reason?: unknown) => Promise<void>;
  releaseLock: () => void;
};

export type AcpWritableLike<T> = {
  getWriter: () => AcpWritableWriter<T>;
};

export type AcpTransport = {
  stdin: AcpWritableLike<Uint8Array>;
  stdout: AcpReadableLike<Uint8Array>;
  close: (options?: AcpTransportCloseOptions) => Promise<void>;
  closed: Promise<void>;
  waitForExit: (timeoutMs: number) => Promise<boolean>;
  getExitCode: () => number | null;
  getStdoutText: () => string;
  getStderrText: () => string;
  getLifecycle: () => AcpTransportLifecycle;
  getCommandLabel: () => string;
  getCommandLine: () => string;
};

export type AcpLaunchPlan = RuntimeCommandLaunchSpec & {
  commandLabel: string;
};

export type AcpTransportExitSource =
  | "running"
  | "natural-exit"
  | "cleanup-kill"
  | "unknown";

export type AcpTransportLifecycle = {
  transportKind?: "mozilla-subprocess" | "node-subprocess" | "websocket-bridge";
  startedAt: string;
  closedAt?: string;
  closeRequestedAt?: string;
  cleanupKillRequestedAt?: string;
  cleanupKillTimedOutAt?: string;
  closeTimedOut?: boolean;
  exitCode: number | null;
  exitSource: AcpTransportExitSource;
  killedByClose: boolean;
  stdoutChars: number;
  stderrChars: number;
  bridgePid?: number | null;
  childPid?: number | null;
  bridgeUrl?: string;
  spawnId?: string;
  webSocketError?: string;
  webSocketClose?: string;
  readError?: string;
  wrapperProneCommand?: boolean;
  processTreeCleanupSupported?: boolean;
  processTreeCleanupStrategy?:
    | RuntimeProcessCleanupStrategy
    | "node-process-group";
  processTreeCleanupDiagnostic?: string;
  processTreeCleanupPid?: number | null;
  processTreeCleanupValidation?: "validated" | "rejected" | "not-required";
  processTreeCleanupValidationReason?: AcpProcessOwnershipRejectionReason;
  processIdentityQuerySupported?: boolean;
  launchPidValidated?: boolean;
  launchPgidValidated?: boolean;
  launchSidValidated?: boolean;
  stdinEofRequested?: boolean;
  stdinEofStatus?: "not-requested" | "succeeded" | "failed" | "timed-out";
  gracefulExit?: boolean;
  closeInvocationCount?: number;
  closeReused?: boolean;
  termSignalSent?: boolean;
  termSignalSucceeded?: boolean;
  killRevalidationPerformed?: boolean;
  killSignalSent?: boolean;
  killSignalSucceeded?: boolean;
  processGroupSignalDelivery?: "mozilla-external-kill" | "node-direct";
  processGroupSignalTargetPgid?: number | null;
  processGroupSignalOperandDelimited?: boolean;
  directSubprocessFallback?: boolean;
  possibleWrapperDescendants?: boolean;
  pipeDrainCompleted?: boolean;
  pipeDrainTimedOut?: boolean;
};

export type AcpProcessOwnershipRejectionReason =
  PosixProcessOwnershipRejectionReason;

export type AcpTransportCloseOptions = {
  graceMs?: number;
  kill?: boolean;
};

export type AcpTransportAuditEvent = {
  schema: "zotero-skills.acp.transport-audit.v1";
  ts: string;
  event: string;
  spawnId?: string;
  transportKind?: AcpTransportLifecycle["transportKind"];
  [key: string]: unknown;
};

export type AcpTransportDiagnosticCaptureOptions = {
  captureStdout?: boolean;
  bridgeAuditFile?: string;
  onAuditEvent?: (event: AcpTransportAuditEvent) => void | Promise<void>;
  onStdoutChunk?: (chunk: string) => void;
  onStderrChunk?: (chunk: string) => void;
};

const ACP_STDERR_MAX_CHARS = 64 * 1024;
const ACP_PIPE_DRAIN_TIMEOUT_MS = 2_000;
const ACP_TRANSPORT_CLOSE_GRACE_MS = 250;
const ACP_TRANSPORT_KILL_WAIT_MS = 1_000;
const ACP_PROCESS_IDENTITY_QUERY_TIMEOUT_MS = 500;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function appendTail(current: string, chunk: unknown) {
  const combined = `${current}${String(chunk || "")}`;
  return combined.length > ACP_STDERR_MAX_CHARS
    ? combined.slice(combined.length - ACP_STDERR_MAX_CHARS)
    : combined;
}

function toFiniteExitCode(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.floor(value)
    : null;
}

function toPositiveProcessId(value: unknown) {
  const pid = toFiniteExitCode(value);
  return pid !== null && pid > 0 ? pid : null;
}

function basenameCommand(commandRaw: unknown) {
  const command = normalizeString(commandRaw).replace(/[\\/]+$/, "");
  const index = Math.max(command.lastIndexOf("/"), command.lastIndexOf("\\"));
  return (index >= 0 ? command.slice(index + 1) : command).toLowerCase();
}

function isWrapperProneCommand(
  commandRaw: unknown,
  launchPlan?: AcpLaunchPlan,
) {
  const command = basenameCommand(commandRaw).replace(
    /\.(exe|cmd|bat|ps1)$/i,
    "",
  );
  if (
    [
      "uv",
      "npx",
      "npm",
      "pnpm",
      "yarn",
      "sh",
      "bash",
      "zsh",
      "cmd",
      "powershell",
      "pwsh",
    ].includes(command)
  ) {
    return true;
  }
  return launchPlan?.mode === "cmd" || launchPlan?.mode === "powershell";
}

function applyProcessControlLifecycle(args: {
  lifecycle: AcpTransportLifecycle;
  backendCommand: string;
  launchPlan: AcpLaunchPlan;
  strategy?: RuntimeProcessCleanupStrategy | "node-process-group";
  supported?: boolean;
  diagnostic?: string;
}) {
  const snapshot = getRuntimeProcessControlSnapshot();
  const wrapperProne = isWrapperProneCommand(
    args.backendCommand,
    args.launchPlan,
  );
  args.lifecycle.wrapperProneCommand = wrapperProne;
  args.lifecycle.processTreeCleanupSupported =
    args.supported ?? snapshot.supportsProcessTreeCleanup;
  args.lifecycle.processTreeCleanupStrategy =
    args.strategy || snapshot.preferredCleanupStrategy;
  if (args.diagnostic) {
    args.lifecycle.processTreeCleanupDiagnostic = args.diagnostic;
  } else if (wrapperProne && !args.lifecycle.processTreeCleanupSupported) {
    args.lifecycle.processTreeCleanupDiagnostic =
      "Wrapper-prone ACP backend will use direct process kill only because process tree cleanup is unavailable";
  }
}

function getCachedResolvedCommand(command: "sh" | "setsid" | "kill" | "ps") {
  const resolution = getCachedRuntimeCommand(command);
  return normalizeString(
    resolution?.resolvedPath || resolution?.launch?.command,
  );
}

function buildSupervisorPidFilePath(cwd: string) {
  return joinNativePath(cwd, `.zotero-acp-${randomTransportId()}.pid`);
}

function buildMozillaProcessLaunch(args: {
  cwd: string;
  backendCommand: string;
  launchPlan: AcpLaunchPlan;
}) {
  const snapshot = getRuntimeProcessControlSnapshot();
  const wrapperProne = isWrapperProneCommand(
    args.backendCommand,
    args.launchPlan,
  );
  if (
    wrapperProne &&
    snapshot.preferredCleanupStrategy === "posix-pidfile-supervisor" &&
    snapshot.supportsPidFileSupervisor
  ) {
    const setsid = getCachedResolvedCommand("setsid");
    const shell = getCachedResolvedCommand("sh");
    if (setsid && shell) {
      const pidFilePath = buildSupervisorPidFilePath(args.cwd);
      const supervisorToken = randomTransportId();
      return {
        command: setsid,
        args: [
          shell,
          "-c",
          'printf "%s\\n%s" "$$" "$2" > "$1"; shift 2; exec "$@"',
          "zotero-acp-supervisor",
          pidFilePath,
          supervisorToken,
          args.launchPlan.command,
          ...args.launchPlan.args,
        ],
        pidFilePath,
        supervisorToken,
        strategy: "posix-pidfile-supervisor" as const,
        supported: snapshot.supportsProcessTreeCleanup,
      };
    }
  }
  return {
    command: args.launchPlan.command,
    args: args.launchPlan.args,
    pidFilePath: "",
    supervisorToken: "",
    strategy: snapshot.preferredCleanupStrategy,
    supported: !wrapperProne || snapshot.supportsProcessTreeCleanup,
  };
}

function extractExitCode(value: unknown) {
  const direct = toFiniteExitCode(value);
  if (direct !== null) {
    return direct;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  return (
    toFiniteExitCode(record.exitCode) ??
    toFiniteExitCode(record.exitValue) ??
    toFiniteExitCode(record.code) ??
    toFiniteExitCode(record.status)
  );
}

function isNpxCommand(command: string) {
  return /(^|[\\/])npx(?:\.(?:cmd|bat|ps1|exe|com))?$/i.test(
    normalizeString(command),
  );
}

function withDefaultNpxYesArg(command: string, args: string[]) {
  if (!isNpxCommand(command)) {
    return args;
  }
  if (args.some((entry) => entry === "-y" || entry === "--yes")) {
    return args;
  }
  return ["-y", ...args];
}

type NodeDirectNpxLaunch = {
  nodePath: string;
  npxCliPath: string;
};

function getWindowsDirName(pathRaw: string) {
  const path = normalizeString(pathRaw).replace(/[\\/]+$/, "");
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index > 0 ? path.slice(0, index) : "";
}

function joinWindowsPath(baseDir: string, relativePath: string) {
  const base = normalizeString(baseDir).replace(/[\\/]+$/, "");
  const relative = normalizeString(relativePath)
    .replace(/^[/\\]+/, "")
    .replace(/[\\/]+/g, "\\");
  if (!base || !relative) {
    return "";
  }
  return `${base}\\${relative}`;
}

function pushUniquePath(paths: string[], pathRaw: string) {
  const path = normalizeString(pathRaw);
  if (
    path &&
    !paths.some((entry) => entry.toLowerCase() === path.toLowerCase())
  ) {
    paths.push(path);
  }
}

function parseNpxCliPathFromShim(args: { shimPath: string; shimText: string }) {
  const shimDir = getWindowsDirName(args.shimPath);
  const text = String(args.shimText || "");
  if (!shimDir || !text) {
    return "";
  }
  const ps1Match =
    text.match(
      /\$NPX_CLI_JS\s*=\s*"\$PSScriptRoot[\\/]+([^"]*?npx-cli\.js)"/iu,
    ) ||
    text.match(
      /\$NPM_PREFIX_NPX_CLI_JS\s*=\s*"\$NPM_PREFIX[\\/]+([^"]*?npx-cli\.js)"/iu,
    );
  if (ps1Match?.[1]) {
    return joinWindowsPath(shimDir, ps1Match[1]);
  }
  const cmdMatch = text.match(
    /SET\s+"NPX_CLI_JS=%~dp0[\\/]*([^"]*?npx-cli\.js)"/iu,
  );
  if (cmdMatch?.[1]) {
    return joinWindowsPath(shimDir, cmdMatch[1]);
  }
  return "";
}

async function resolveNodeDirectNpxLaunch(args: {
  command: string;
  resolvedNpxPath: string;
  platform: string;
  pathSearch?: ((command: string) => Promise<unknown>) | null;
}) {
  if (
    args.platform !== "win32" ||
    !isNpxCommand(args.command) ||
    !normalizeString(args.resolvedNpxPath)
  ) {
    return null;
  }
  const nodeResolution =
    getCachedRuntimeCommand("node") ||
    (await resolveRuntimeCommand("node", { pathSearch: args.pathSearch }));
  const nodePath = normalizeString(nodeResolution.resolvedPath);
  if (!nodeResolution.available || !/\.exe$/i.test(nodePath)) {
    return null;
  }
  const candidates: string[] = [];
  const npxPath = normalizeString(args.resolvedNpxPath);
  const npxDir = getWindowsDirName(npxPath);
  const nodeDir = getWindowsDirName(nodePath);
  pushUniquePath(
    candidates,
    joinWindowsPath(npxDir, "node_modules\\npm\\bin\\npx-cli.js"),
  );
  pushUniquePath(
    candidates,
    joinWindowsPath(nodeDir, "node_modules\\npm\\bin\\npx-cli.js"),
  );
  try {
    const shimText = await readRuntimeTextFile(npxPath);
    pushUniquePath(
      candidates,
      parseNpxCliPathFromShim({ shimPath: npxPath, shimText }),
    );
  } catch {
    // Missing or unreadable shim text only disables this optimization.
  }
  for (const candidate of candidates) {
    if (await runtimePathExists(candidate)) {
      return {
        nodePath,
        npxCliPath: candidate,
      } satisfies NodeDirectNpxLaunch;
    }
  }
  return null;
}

export function buildAcpLaunchPlanForTests(args: {
  command: string;
  resolvedCommand: string;
  args?: string[];
  platform?: string;
  comspec?: string;
  resolution?: RuntimeCommandResolution;
  preferWindowsBareCommandPowerShell?: boolean;
  nodeDirectNpx?: NodeDirectNpxLaunch | null;
}): AcpLaunchPlan {
  const command = normalizeString(args.command);
  const resolvedCommand = normalizeString(args.resolvedCommand) || command;
  const commandArgs = withDefaultNpxYesArg(
    command,
    Array.isArray(args.args) ? [...args.args] : [],
  );
  const commandLabel = [command || resolvedCommand, ...commandArgs]
    .filter(Boolean)
    .join(" ");
  const platform = normalizeString(args.platform) || detectRuntimePlatform();
  if (platform === "win32" && isNpxCommand(command) && args.nodeDirectNpx) {
    const launchPlan = buildRuntimeCommandLaunchPlan({
      command: args.nodeDirectNpx.nodePath,
      resolvedCommand: args.nodeDirectNpx.nodePath,
      commandArgs: [args.nodeDirectNpx.npxCliPath, ...commandArgs],
      platform,
    });
    return {
      ...launchPlan,
      environment: args.resolution?.launch?.environment
        ? { ...args.resolution.launch.environment }
        : launchPlan.environment,
      commandLabel,
    };
  }
  const launchPlan = buildRuntimeCommandLaunchPlan({
    command,
    resolvedCommand,
    commandArgs,
    platform,
    resolution: args.resolution,
    preferWindowsBareCommandPowerShell: args.preferWindowsBareCommandPowerShell,
  });
  return {
    ...launchPlan,
    commandLabel,
  };
}

function resolveTextEncoderCtor() {
  const ctor = (globalThis as { TextEncoder?: typeof globalThis.TextEncoder })
    .TextEncoder;
  if (typeof ctor !== "function") {
    throw new Error("TextEncoder is unavailable in current runtime");
  }
  return ctor;
}

function resolveTextDecoderCtor() {
  const ctor = (globalThis as { TextDecoder?: typeof globalThis.TextDecoder })
    .TextDecoder;
  if (typeof ctor !== "function") {
    throw new Error("TextDecoder is unavailable in current runtime");
  }
  return ctor;
}

function encodeUint8Chunk(
  value: unknown,
  encoder: InstanceType<ReturnType<typeof resolveTextEncoderCtor>>,
) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (typeof value === "string") {
    return encoder.encode(value);
  }
  if (value && typeof value === "object") {
    const runtime = globalThis as {
      Buffer?: {
        isBuffer?: (value: unknown) => boolean;
      };
    };
    if (runtime.Buffer?.isBuffer?.(value)) {
      return new Uint8Array(value as ArrayBufferLike);
    }
  }
  return encoder.encode(String(value || ""));
}

function randomTransportId() {
  const runtime = globalThis as {
    crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
  };
  const bytes = new Uint8Array(16);
  if (typeof runtime.crypto?.getRandomValues === "function") {
    runtime.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createReadableStreamFromMozillaPipe(
  pipe: {
    readString?: () => Promise<string>;
  },
  onChunk?: (chunk: string) => void,
) {
  const TextEncoderCtor = resolveTextEncoderCtor();
  const encoder = new TextEncoderCtor();
  return {
    getReader() {
      let released = false;
      return {
        async read() {
          if (released || typeof pipe.readString !== "function") {
            return { done: true, value: undefined };
          }
          const chunk = await pipe.readString();
          if (!chunk) {
            return { done: true, value: undefined };
          }
          onChunk?.(chunk);
          return {
            done: false,
            value: encoder.encode(chunk),
          };
        },
        releaseLock() {
          released = true;
        },
      };
    },
  } satisfies AcpReadableLike<Uint8Array>;
}

function createPumpedReadableStreamFromMozillaPipe(
  pipe: {
    readString?: () => Promise<string>;
  },
  onChunk: (chunk: string) => void,
) {
  const TextEncoderCtor = resolveTextEncoderCtor();
  const encoder = new TextEncoderCtor();
  const queued: Uint8Array[] = [];
  const waiting: Array<{
    resolve: (result: AcpReadResult<Uint8Array>) => void;
    reject: (error: unknown) => void;
  }> = [];
  let done = typeof pipe.readString !== "function";
  let failure: unknown = null;

  const flush = () => {
    while (waiting.length > 0) {
      const pending = waiting.shift();
      if (!pending) {
        continue;
      }
      const value = queued.shift();
      if (value) {
        pending.resolve({ done: false, value });
        continue;
      }
      if (failure) {
        pending.reject(failure);
        continue;
      }
      if (done) {
        pending.resolve({ done: true, value: undefined });
        continue;
      }
      waiting.unshift(pending);
      break;
    }
  };

  const capture = (async () => {
    if (typeof pipe.readString !== "function") {
      return;
    }
    try {
      while (true) {
        const chunk = await pipe.readString();
        if (!chunk) {
          break;
        }
        onChunk(chunk);
        queued.push(encoder.encode(chunk));
        flush();
      }
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      done = true;
      flush();
    }
  })();
  void capture.catch(() => undefined);

  const readable = {
    getReader() {
      let released = false;
      return {
        async read(): Promise<AcpReadResult<Uint8Array>> {
          if (released) {
            return { done: true, value: undefined };
          }
          const value = queued.shift();
          if (value) {
            return { done: false, value };
          }
          if (failure) {
            throw failure;
          }
          if (done) {
            return { done: true, value: undefined };
          }
          return await new Promise<AcpReadResult<Uint8Array>>(
            (resolve, reject) => {
              waiting.push({ resolve, reject });
            },
          );
        },
        releaseLock() {
          released = true;
        },
      };
    },
  } satisfies AcpReadableLike<Uint8Array>;

  return { readable, capture };
}

function createWritableStreamFromMozillaPipe(pipe: {
  write?: (data: string) => Promise<void>;
  close?: () => Promise<void>;
}) {
  const TextDecoderCtor = resolveTextDecoderCtor();
  const decoder = new TextDecoderCtor();
  return {
    getWriter() {
      let released = false;
      return {
        async write(chunk: Uint8Array) {
          if (released) {
            throw new Error("mozilla subprocess stdin writer lock released");
          }
          if (typeof pipe.write !== "function") {
            throw new Error("mozilla subprocess stdin.write is unavailable");
          }
          await pipe.write(decoder.decode(chunk));
        },
        async close() {
          if (typeof pipe.close === "function") {
            await pipe.close();
          }
        },
        async abort() {
          if (typeof pipe.close === "function") {
            await pipe.close();
          }
        },
        releaseLock() {
          released = true;
        },
      };
    },
  } satisfies AcpWritableLike<Uint8Array>;
}

async function drainMozillaPipe(
  pipe:
    | {
        readString?: () => Promise<string>;
      }
    | null
    | undefined,
) {
  if (!pipe || typeof pipe.readString !== "function") {
    return "";
  }
  let combined = "";
  while (true) {
    const chunk = await withTimeoutFallback(
      pipe.readString(),
      ACP_PIPE_DRAIN_TIMEOUT_MS,
      "",
    );
    if (!chunk) {
      break;
    }
    combined += chunk;
    if (combined.length > ACP_STDERR_MAX_CHARS) {
      combined = combined.slice(combined.length - ACP_STDERR_MAX_CHARS);
    }
  }
  return combined;
}

function nowIso() {
  return new Date().toISOString();
}

function dispatchTransportAuditEvent(
  options: AcpTransportDiagnosticCaptureOptions | undefined,
  event: AcpTransportAuditEvent,
) {
  try {
    const result = options?.onAuditEvent?.(event);
    if (result && typeof (result as Promise<void>).catch === "function") {
      void (result as Promise<void>).catch(() => undefined);
    }
  } catch {
    // Audit callbacks must not affect transport flow.
  }
}

function createLifecycleState(): AcpTransportLifecycle {
  return {
    startedAt: nowIso(),
    exitCode: null,
    exitSource: "running",
    killedByClose: false,
    stdoutChars: 0,
    stderrChars: 0,
  };
}

function cloneLifecycleState(
  lifecycle: AcpTransportLifecycle,
): AcpTransportLifecycle {
  return { ...lifecycle };
}

async function waitForCleanupKillExit(args: {
  waitForExit: (timeoutMs: number) => Promise<boolean>;
  lifecycle: AcpTransportLifecycle;
  timeoutMs?: number;
}) {
  const settled = await args.waitForExit(
    args.timeoutMs ?? ACP_TRANSPORT_KILL_WAIT_MS,
  );
  if (!settled) {
    args.lifecycle.closeTimedOut = true;
    args.lifecycle.cleanupKillTimedOutAt ||= nowIso();
  }
  return settled;
}

async function readSupervisorIdentity(pidFilePath: string) {
  const path = normalizeString(pidFilePath);
  if (!path) {
    return null;
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const text = normalizeString(await readRuntimeTextFile(path));
    const [pidText, token = ""] = text.split(/\r?\n/, 2);
    const pid = toPositiveProcessId(Number.parseInt(pidText, 10));
    if (pid !== null && normalizeString(token)) {
      return { pid, token: normalizeString(token) };
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
}

async function removeSupervisorPidFile(pidFilePath: string) {
  const path = normalizeString(pidFilePath);
  if (!path) {
    return;
  }
  try {
    await removeRuntimePath(path);
  } catch {
    // Pidfile cleanup is best-effort diagnostic hygiene.
  }
}

async function terminatePosixProcessGroupWithMozilla(args: {
  subprocess: MozillaSubprocessModule;
  target: ValidatedPosixProcessGroupTarget;
  signal: PosixProcessGroupSignal;
}) {
  const killCommand = getCachedResolvedCommand("kill");
  if (!killCommand || !args.subprocess.call) {
    return false;
  }
  try {
    const invocation = buildPosixProcessGroupSignalInvocation(
      args.target,
      args.signal,
    );
    const killProc = await args.subprocess.call({
      command: killCommand,
      arguments: invocation.arguments,
    });
    const waited =
      typeof killProc.wait === "function" ? await killProc.wait() : undefined;
    const exitCode = extractExitCode(waited) ?? extractExitCode(killProc);
    return exitCode === 0;
  } catch {
    return false;
  }
}

function parsePosixProcessIdentity(
  value: unknown,
): PosixProcessIdentity | null {
  const fields = normalizeString(value).split(/\s+/);
  if (fields.length < 3) {
    return null;
  }
  const [pid, pgid, sid] = fields.map((field) =>
    toPositiveProcessId(Number.parseInt(field, 10)),
  );
  return pid && pgid && sid ? { pid, pgid, sid } : null;
}

async function queryPosixProcessIdentityWithMozilla(args: {
  subprocess: MozillaSubprocessModule;
  pid: number;
}) {
  const psCommand = getCachedResolvedCommand("ps");
  if (!psCommand || !args.subprocess.call) {
    return null;
  }
  return await withTimeoutValue(
    (async () => {
      try {
        const proc = await args.subprocess.call!({
          command: psCommand,
          arguments: ["-o", "pid=,pgid=,sid=", "-p", String(args.pid)],
        });
        const output = await proc.stdout?.readString?.();
        if (typeof proc.wait === "function") {
          await proc.wait();
        }
        return parsePosixProcessIdentity(output);
      } catch {
        return null;
      }
    })(),
    ACP_PROCESS_IDENTITY_QUERY_TIMEOUT_MS,
  );
}

async function queryPosixProcessIdentityWithNode(args: {
  childProcess: any;
  pid: number;
}) {
  const psCommand = getCachedResolvedCommand("ps");
  if (!psCommand || typeof args.childProcess.execFile !== "function") {
    return null;
  }
  return await new Promise<PosixProcessIdentity | null>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, ACP_PROCESS_IDENTITY_QUERY_TIMEOUT_MS);
    args.childProcess.execFile(
      psCommand,
      ["-o", "pid=,pgid=,sid=", "-p", String(args.pid)],
      (error: unknown, stdout: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(error ? null : parsePosixProcessIdentity(stdout));
      },
    );
  });
}

function applyOwnershipValidationLifecycle(
  lifecycle: AcpTransportLifecycle,
  validation: PosixProcessOwnershipValidation,
) {
  lifecycle.processTreeCleanupValidation = validation.ok
    ? "validated"
    : "rejected";
  lifecycle.processTreeCleanupValidationReason = validation.ok
    ? undefined
    : validation.reason;
  lifecycle.launchPidValidated = validation.ok;
  lifecycle.launchPgidValidated = validation.ok;
  lifecycle.launchSidValidated = validation.ok;
  if (!validation.ok) {
    lifecycle.directSubprocessFallback = true;
    lifecycle.possibleWrapperDescendants = true;
    lifecycle.processTreeCleanupDiagnostic = validation.reason;
  }
}

async function waitForPromiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
) {
  return await withTimeoutFallback(
    promise.then(
      () => true,
      () => true,
    ),
    timeoutMs,
    false,
  );
}

async function withTimeoutValue<T>(promise: Promise<T>, timeoutMs: number) {
  return await withTimeoutFallback(
    promise.catch(() => null),
    timeoutMs,
    null,
  );
}

async function withTimeoutFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
) {
  if (timeoutMs <= 0) {
    return fallback;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

async function captureMozillaPipeTail(
  pipe:
    | {
        readString?: () => Promise<string>;
      }
    | null
    | undefined,
  onChunk: (chunk: string) => void,
) {
  if (!pipe || typeof pipe.readString !== "function") {
    return;
  }
  while (true) {
    const chunk = await pipe.readString();
    if (!chunk) {
      return;
    }
    onChunk(chunk);
  }
}

async function resolveMozillaCommand(
  subprocess: MozillaSubprocessModule,
  commandRaw: string,
) {
  const command = normalizeString(commandRaw);
  if (!command) {
    throw new Error("ACP backend command is required");
  }
  const resolved = await resolveRuntimeCommand(command, {
    pathSearch: subprocess.pathSearch,
  });
  if (resolved.available && resolved.resolvedPath) {
    return resolved;
  }
  throw new Error(resolved.diagnostic || `Command "${command}" was not found`);
}

async function launchMozillaAcpTransport(
  args: AcpTransportLaunchArgs,
): Promise<AcpTransport> {
  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    throw new Error("mozilla subprocess unavailable");
  }
  const backendCommand = normalizeString(args.backend.command);
  const resolved = await resolveMozillaCommand(subprocess, backendCommand);
  const registryResolution = getCachedRuntimeCommand(backendCommand);
  const nodeDirectNpx = await resolveNodeDirectNpxLaunch({
    command: backendCommand,
    resolvedNpxPath: resolved.resolvedPath || backendCommand,
    platform: detectRuntimePlatform(),
    pathSearch: subprocess.pathSearch,
  });
  const launchPlan = buildAcpLaunchPlanForTests({
    command: backendCommand,
    resolvedCommand: resolved.resolvedPath || backendCommand,
    args: args.backend.args || [],
    resolution: resolved,
    preferWindowsBareCommandPowerShell: !registryResolution,
    nodeDirectNpx,
  });
  const processLaunch = buildMozillaProcessLaunch({
    cwd: args.cwd,
    backendCommand,
    launchPlan,
  });
  const proc = await subprocess.call({
    command: processLaunch.command,
    arguments: processLaunch.args,
    environment: buildSubprocessEnvironment({
      ...(launchPlan.environment || {}),
      ...(args.backend.env || {}),
    }),
    environmentAppend: true,
    workdir: args.cwd,
  });
  let stderrText = "";
  let stdoutText = "";
  const lifecycle = createLifecycleState();
  lifecycle.transportKind = "mozilla-subprocess";
  lifecycle.childPid = toPositiveProcessId(proc.pid);
  const stderrCapture = captureMozillaPipeTail(proc.stderr, (chunk) => {
    stderrText = appendTail(stderrText, chunk);
    lifecycle.stderrChars += String(chunk || "").length;
    args.diagnosticCapture?.onStderrChunk?.(String(chunk || ""));
  }).catch((error) => {
    stderrText = appendTail(
      stderrText,
      `\n[stderr capture failed] ${String((error as Error)?.message || error)}`,
    );
  });
  const pumpedStdout = args.diagnosticCapture?.captureStdout
    ? null
    : createPumpedReadableStreamFromMozillaPipe(proc.stdout || {}, (chunk) => {
        stdoutText = appendTail(stdoutText, chunk);
        lifecycle.stdoutChars += String(chunk || "").length;
        args.diagnosticCapture?.onStdoutChunk?.(String(chunk || ""));
      });
  const stdoutCapture = args.diagnosticCapture?.captureStdout
    ? captureMozillaPipeTail(proc.stdout, (chunk) => {
        stdoutText = appendTail(stdoutText, chunk);
        lifecycle.stdoutChars += String(chunk || "").length;
        args.diagnosticCapture?.onStdoutChunk?.(String(chunk || ""));
      }).catch((error) => {
        stdoutText = appendTail(
          stdoutText,
          `\n[stdout capture failed] ${String((error as Error)?.message || error)}`,
        );
      })
    : pumpedStdout?.capture || Promise.resolve();
  const identityQuerySupported =
    getRuntimeProcessControlSnapshot().supportsProcessIdentityQuery === true;
  lifecycle.processIdentityQuerySupported = identityQuerySupported;
  const launchIdentity = lifecycle.childPid
    ? await queryPosixProcessIdentityWithMozilla({
        subprocess,
        pid: lifecycle.childPid,
      })
    : null;
  applyProcessControlLifecycle({
    lifecycle,
    backendCommand,
    launchPlan,
    strategy: processLaunch.strategy,
    supported: processLaunch.supported,
  });
  const closed = (async () => {
    let waited: unknown = undefined;
    if (typeof proc.wait === "function") {
      waited = await proc.wait();
    }
    lifecycle.pipeDrainCompleted = await withTimeoutFallback(
      Promise.allSettled([stderrCapture, stdoutCapture]).then(() => true),
      ACP_PIPE_DRAIN_TIMEOUT_MS,
      false,
    );
    lifecycle.pipeDrainTimedOut = !lifecycle.pipeDrainCompleted;
    lifecycle.closedAt = nowIso();
    lifecycle.exitCode = extractExitCode(waited) ?? extractExitCode(proc);
    lifecycle.exitSource = lifecycle.killedByClose
      ? "cleanup-kill"
      : lifecycle.exitCode === null
        ? "unknown"
        : "natural-exit";
  })();
  const waitForExit = (timeoutMs: number) =>
    waitForPromiseWithTimeout(closed, timeoutMs);
  return {
    stdin: createWritableStreamFromMozillaPipe(proc.stdin || {}),
    stdout: args.diagnosticCapture?.captureStdout
      ? createReadableStreamFromMozillaPipe({})
      : pumpedStdout!.readable,
    close: async (options?: AcpTransportCloseOptions) => {
      lifecycle.closeRequestedAt ||= nowIso();
      const graceMs = options?.graceMs ?? ACP_TRANSPORT_CLOSE_GRACE_MS;
      if (await waitForExit(graceMs)) {
        await removeSupervisorPidFile(processLaunch.pidFilePath);
        return;
      }
      if (options?.kill === false) {
        return;
      }
      lifecycle.cleanupKillRequestedAt ||= nowIso();
      lifecycle.killedByClose = true;
      if (processLaunch.pidFilePath) {
        const pidfileIdentity = await readSupervisorIdentity(
          processLaunch.pidFilePath,
        );
        lifecycle.processTreeCleanupPid = pidfileIdentity?.pid ?? null;
        const validateOwnership = async () =>
          validatePosixProcessGroupOwnership({
            strategy: processLaunch.strategy,
            expectedStrategy: "posix-pidfile-supervisor",
            childPid: lifecycle.childPid,
            launchIdentity,
            liveIdentity: lifecycle.childPid
              ? await queryPosixProcessIdentityWithMozilla({
                  subprocess,
                  pid: lifecycle.childPid,
                })
              : null,
            pidfileIdentity: await readSupervisorIdentity(
              processLaunch.pidFilePath,
            ),
            supervisorToken: processLaunch.supervisorToken,
            identityQuerySupported,
          });
        const termValidation = await validateOwnership();
        applyOwnershipValidationLifecycle(lifecycle, termValidation);
        if (termValidation.ok) {
          lifecycle.termSignalSent = true;
          lifecycle.processGroupSignalDelivery = "mozilla-external-kill";
          lifecycle.processGroupSignalTargetPgid = termValidation.target.pgid;
          lifecycle.processGroupSignalOperandDelimited = true;
          const terminated = await terminatePosixProcessGroupWithMozilla({
            subprocess,
            target: termValidation.target,
            signal: "TERM",
          });
          lifecycle.termSignalSucceeded = terminated;
          if (terminated && (await waitForExit(ACP_TRANSPORT_KILL_WAIT_MS))) {
            await removeSupervisorPidFile(processLaunch.pidFilePath);
            return;
          }
          if (terminated) {
            lifecycle.killRevalidationPerformed = true;
            const killValidation = await validateOwnership();
            applyOwnershipValidationLifecycle(lifecycle, killValidation);
            if (killValidation.ok) {
              lifecycle.killSignalSent = true;
              lifecycle.killSignalSucceeded =
                await terminatePosixProcessGroupWithMozilla({
                  subprocess,
                  target: killValidation.target,
                  signal: "KILL",
                });
              if (lifecycle.killSignalSucceeded) {
                await waitForCleanupKillExit({ waitForExit, lifecycle });
                await removeSupervisorPidFile(processLaunch.pidFilePath);
                return;
              }
            }
          }
          lifecycle.directSubprocessFallback = true;
          lifecycle.possibleWrapperDescendants = true;
          lifecycle.processTreeCleanupDiagnostic = terminated
            ? "Validated POSIX process group KILL was rejected or failed; using direct subprocess cleanup"
            : "Validated POSIX process group TERM failed; using direct subprocess cleanup";
        }
      }
      lifecycle.directSubprocessFallback = true;
      lifecycle.possibleWrapperDescendants =
        lifecycle.wrapperProneCommand === true;
      try {
        proc.kill?.(0);
      } catch {
        // ignore
      }
      await waitForCleanupKillExit({ waitForExit, lifecycle });
      await removeSupervisorPidFile(processLaunch.pidFilePath);
    },
    closed,
    waitForExit,
    getExitCode: () => lifecycle.exitCode,
    getStdoutText: () => stdoutText,
    getStderrText: () => stderrText,
    getLifecycle: () => cloneLifecycleState(lifecycle),
    getCommandLabel: () => launchPlan.commandLabel,
    getCommandLine: () => launchPlan.commandLine,
  };
}

async function resolveNodeCommand(commandRaw: string) {
  const command = normalizeString(commandRaw);
  if (!command) {
    throw new Error("ACP backend command is required");
  }
  const resolved = await resolveRuntimeCommand(command);
  if (resolved.available && resolved.resolvedPath) {
    return resolved;
  }
  throw new Error(resolved.diagnostic || `Command "${command}" was not found`);
}

async function launchNodeAcpTransport(
  args: AcpTransportLaunchArgs,
): Promise<AcpTransport> {
  const childProcess = await dynamicImport("node:child_process");
  const processModule = await dynamicImport("node:process");
  type NodeWritable = {
    write: (
      chunk: Uint8Array | string,
      callback: (error?: Error | null) => void,
    ) => boolean;
    end: (callback: (error?: Error | null) => void) => void;
    destroy: () => void;
  };
  type NodeReadable = {
    on: (event: "data", handler: (chunk: unknown) => void) => void;
    once: (event: "end" | "error", handler: (arg?: unknown) => void) => void;
    off: (
      event: "data" | "end" | "error",
      handler: (arg?: unknown) => void,
    ) => void;
  };
  const spawn = childProcess.spawn as (
    command: string,
    argv: string[],
    options: {
      cwd?: string;
      env?: Record<string, string | undefined>;
      stdio: ["pipe", "pipe", "pipe"];
      detached?: boolean;
    },
  ) => {
    pid?: number;
    stdin: NodeWritable;
    stdout: NodeReadable;
    stderr: {
      on: (event: string, handler: (chunk: Buffer | string) => void) => void;
    };
    once: (
      event: string,
      handler: (errorOrCode?: unknown, signal?: unknown) => void,
    ) => void;
    kill: (signal?: string) => void;
  };
  const command = normalizeString(args.backend.command);
  const resolved = await resolveNodeCommand(command);
  const nodeDirectNpx = await resolveNodeDirectNpxLaunch({
    command,
    resolvedNpxPath: resolved.resolvedPath || command,
    platform: String(processModule.platform || "").trim(),
  });
  const launchPlan = buildAcpLaunchPlanForTests({
    command,
    resolvedCommand: resolved.resolvedPath || command,
    args: args.backend.args || [],
    platform: String(processModule.platform || "").trim(),
    resolution: resolved,
    nodeDirectNpx,
  });
  const env = {
    ...(processModule.env as Record<string, string | undefined>),
    ...(launchPlan.environment || {}),
    ...(args.backend.env || {}),
  };
  const processControl = getRuntimeProcessControlSnapshot();
  const platform = String(processModule.platform || "").trim();
  const useNodeProcessGroup =
    platform !== "win32" && processControl.supportsProcessGroupLaunch;
  const nodeLaunchToken = randomTransportId();
  const child = spawn(launchPlan.command, launchPlan.args, {
    cwd: args.cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
    detached: useNodeProcessGroup,
  });
  let stderrText = "";
  let stdoutText = "";
  const lifecycle = createLifecycleState();
  lifecycle.transportKind = "node-subprocess";
  lifecycle.childPid = toPositiveProcessId(child.pid);
  const identityQuerySupported =
    processControl.supportsProcessIdentityQuery === true;
  lifecycle.processIdentityQuerySupported = identityQuerySupported;
  const launchIdentity =
    useNodeProcessGroup && lifecycle.childPid
      ? await queryPosixProcessIdentityWithNode({
          childProcess,
          pid: lifecycle.childPid,
        })
      : null;
  applyProcessControlLifecycle({
    lifecycle,
    backendCommand: command,
    launchPlan,
    strategy: useNodeProcessGroup
      ? "node-process-group"
      : processControl.preferredCleanupStrategy,
    supported:
      (useNodeProcessGroup && identityQuerySupported) ||
      !isWrapperProneCommand(command, launchPlan) ||
      processControl.supportsProcessTreeCleanup,
  });
  lifecycle.processTreeCleanupPid = lifecycle.childPid;
  lifecycle.processTreeCleanupValidation = useNodeProcessGroup
    ? undefined
    : "not-required";
  child.stderr.on("data", (chunk: Buffer | string) => {
    stderrText = appendTail(stderrText, chunk);
    lifecycle.stderrChars += String(chunk || "").length;
    args.diagnosticCapture?.onStderrChunk?.(String(chunk || ""));
  });
  const onDiagnosticStdoutData = (chunk: unknown) => {
    stdoutText = appendTail(stdoutText, chunk);
    lifecycle.stdoutChars += String(chunk || "").length;
    args.diagnosticCapture?.onStdoutChunk?.(String(chunk || ""));
  };
  if (args.diagnosticCapture?.captureStdout) {
    child.stdout.on("data", onDiagnosticStdoutData);
  }
  const closed = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => {
      lifecycle.closedAt = nowIso();
      lifecycle.exitCode = extractExitCode(code);
      lifecycle.exitSource = lifecycle.killedByClose
        ? "cleanup-kill"
        : lifecycle.exitCode === null
          ? "unknown"
          : "natural-exit";
      resolve();
    });
  });
  const waitForExit = (timeoutMs: number) =>
    waitForPromiseWithTimeout(closed, timeoutMs);
  const TextEncoderCtor = resolveTextEncoderCtor();
  const encoder = new TextEncoderCtor();
  return {
    stdin: {
      getWriter() {
        let released = false;
        return {
          async write(chunk: Uint8Array) {
            if (released) {
              throw new Error("node subprocess stdin writer lock released");
            }
            await new Promise<void>((resolve, reject) => {
              child.stdin.write(chunk, (error?: Error | null) => {
                if (error) {
                  reject(error);
                  return;
                }
                resolve();
              });
            });
          },
          async close() {
            await new Promise<void>((resolve, reject) => {
              child.stdin.end((error?: Error | null) => {
                if (error) {
                  reject(error);
                  return;
                }
                resolve();
              });
            });
          },
          async abort() {
            child.stdin.destroy();
          },
          releaseLock() {
            released = true;
          },
        };
      },
    },
    stdout: {
      getReader() {
        let released = false;
        const queue: Uint8Array[] = [];
        const waiting: Array<{
          resolve: (result: AcpReadResult<Uint8Array>) => void;
          reject: (error: unknown) => void;
        }> = [];
        let ended = false;
        let pendingError: unknown = null;
        let queuedBytes = 0;

        const observeQueue = () => {
          if (
            __acp_runtime_performance_profiler_enabled__ &&
            (typeof __debug_mode__ === "undefined"
              ? isDebugModeEnabled()
              : __debug_mode__)
          ) {
            observeAcpRuntimeGauge(
              args.performanceProfileRequestId,
              "transport_queue_entries",
              {},
              queue.length,
            );
            observeAcpRuntimeGauge(
              args.performanceProfileRequestId,
              "transport_queue_bytes",
              {},
              queuedBytes,
            );
          }
        };

        const flush = () => {
          while (waiting.length > 0) {
            if (pendingError) {
              const next = waiting.shift();
              next?.reject(pendingError);
              continue;
            }
            if (queue.length > 0) {
              const next = waiting.shift();
              const value = queue.shift();
              queuedBytes = Math.max(0, queuedBytes - (value?.byteLength || 0));
              next?.resolve({
                done: false,
                value,
              });
              observeQueue();
              continue;
            }
            if (ended) {
              const next = waiting.shift();
              next?.resolve({ done: true, value: undefined });
              continue;
            }
            break;
          }
        };

        const onData = (chunk: unknown) => {
          const encoded = encodeUint8Chunk(chunk, encoder);
          queue.push(encoded);
          queuedBytes += encoded.byteLength;
          observeQueue();
          stdoutText = appendTail(stdoutText, chunk);
          lifecycle.stdoutChars += String(chunk || "").length;
          args.diagnosticCapture?.onStdoutChunk?.(String(chunk || ""));
          flush();
        };
        const onEnd = () => {
          ended = true;
          flush();
        };
        const onError = (error: unknown) => {
          pendingError = error;
          flush();
        };

        child.stdout.on("data", onData);
        child.stdout.once("end", onEnd);
        child.stdout.once("error", onError);

        return {
          async read() {
            if (released) {
              return { done: true, value: undefined };
            }
            if (pendingError) {
              throw pendingError;
            }
            if (queue.length > 0) {
              const value = queue.shift();
              queuedBytes = Math.max(0, queuedBytes - (value?.byteLength || 0));
              observeQueue();
              return {
                done: false,
                value,
              };
            }
            if (ended) {
              return { done: true, value: undefined };
            }
            return new Promise<AcpReadResult<Uint8Array>>((resolve, reject) => {
              waiting.push({ resolve, reject });
            });
          },
          releaseLock() {
            if (released) {
              return;
            }
            released = true;
            if (args.diagnosticCapture?.captureStdout) {
              child.stdout.off("data", onDiagnosticStdoutData);
            }
            child.stdout.off("data", onData);
            child.stdout.off("end", onEnd);
            child.stdout.off("error", onError);
          },
        };
      },
    },
    close: async (options?: AcpTransportCloseOptions) => {
      lifecycle.closeRequestedAt ||= nowIso();
      const graceMs = options?.graceMs ?? ACP_TRANSPORT_CLOSE_GRACE_MS;
      if (await waitForExit(graceMs)) {
        return;
      }
      if (options?.kill === false) {
        return;
      }
      lifecycle.cleanupKillRequestedAt ||= nowIso();
      lifecycle.killedByClose = true;
      if (useNodeProcessGroup && lifecycle.childPid) {
        const validateOwnership = async () =>
          validatePosixProcessGroupOwnership({
            strategy: "node-process-group",
            expectedStrategy: "node-process-group",
            childPid: lifecycle.childPid,
            launchIdentity,
            liveIdentity: lifecycle.childPid
              ? await queryPosixProcessIdentityWithNode({
                  childProcess,
                  pid: lifecycle.childPid,
                })
              : null,
            supervisorToken: nodeLaunchToken,
            identityQuerySupported,
          });
        const termValidation = await validateOwnership();
        applyOwnershipValidationLifecycle(lifecycle, termValidation);
        let termSent = false;
        if (termValidation.ok) {
          lifecycle.termSignalSent = true;
          lifecycle.processGroupSignalDelivery = "node-direct";
          lifecycle.processGroupSignalTargetPgid = termValidation.target.pgid;
          lifecycle.processGroupSignalOperandDelimited = false;
          try {
            processModule.kill(-termValidation.target.pgid, "SIGTERM");
            termSent = true;
            lifecycle.termSignalSucceeded = true;
          } catch (error) {
            lifecycle.termSignalSucceeded = false;
            lifecycle.processTreeCleanupDiagnostic = String(
              (error as Error)?.message || error,
            );
          }
        }
        if (termSent && (await waitForExit(ACP_TRANSPORT_KILL_WAIT_MS))) {
          return;
        }
        if (termSent) {
          lifecycle.killRevalidationPerformed = true;
          const killValidation = await validateOwnership();
          applyOwnershipValidationLifecycle(lifecycle, killValidation);
          if (killValidation.ok) {
            lifecycle.killSignalSent = true;
            try {
              processModule.kill(-killValidation.target.pgid, "SIGKILL");
              lifecycle.killSignalSucceeded = true;
              await waitForCleanupKillExit({ waitForExit, lifecycle });
              return;
            } catch {
              lifecycle.killSignalSucceeded = false;
            }
          }
        }
        lifecycle.directSubprocessFallback = true;
        lifecycle.possibleWrapperDescendants =
          lifecycle.wrapperProneCommand === true;
      }
      lifecycle.directSubprocessFallback = true;
      lifecycle.possibleWrapperDescendants =
        lifecycle.wrapperProneCommand === true;
      try {
        child.kill();
      } catch {
        // ignore
      }
      await waitForCleanupKillExit({ waitForExit, lifecycle });
    },
    closed,
    waitForExit,
    getExitCode: () => lifecycle.exitCode,
    getStdoutText: () => stdoutText,
    getStderrText: () => stderrText,
    getLifecycle: () => cloneLifecycleState(lifecycle),
    getCommandLabel: () => launchPlan.commandLabel,
    getCommandLine: () => launchPlan.commandLine,
  };
}

async function launchPlatformWindowsAcpTransport(
  args: AcpTransportLaunchArgs,
  subprocess: MozillaSubprocessModule,
): Promise<AcpTransport> {
  const backendCommand = normalizeString(args.backend.command);
  const resolved = await resolveMozillaCommand(subprocess, backendCommand);
  const registryResolution = getCachedRuntimeCommand(backendCommand);
  const nodeDirectNpx = await resolveNodeDirectNpxLaunch({
    command: backendCommand,
    resolvedNpxPath: resolved.resolvedPath || backendCommand,
    platform: detectRuntimePlatform(),
    pathSearch: subprocess.pathSearch,
  });
  const launchPlan = buildAcpLaunchPlanForTests({
    command: backendCommand,
    resolvedCommand: resolved.resolvedPath || backendCommand,
    args: args.backend.args || [],
    resolution: resolved,
    preferWindowsBareCommandPowerShell: !registryResolution,
    nodeDirectNpx,
  });
  const environment = buildSubprocessEnvironment({
    ...(launchPlan.environment || {}),
    ...(args.backend.env || {}),
  });
  const process = await startLongLivedProcess({
    executable: launchPlan.command,
    argv: launchPlan.args,
    cwd: args.cwd,
    environment,
    startup: args.startup,
    auditFile: normalizeString(args.diagnosticCapture?.bridgeAuditFile),
  }).catch((error) => {
    if (
      error instanceof Error &&
      error.message.startsWith("stdio bridge WebSocket error")
    ) {
      throw new Error(error.message.replace("stdio bridge", "ACP bridge"));
    }
    throw error;
  });
  const processFacts = process.snapshot();
  const lifecycle = createLifecycleState();
  lifecycle.transportKind = "websocket-bridge";
  lifecycle.bridgePid = processFacts.bridgePid;
  lifecycle.bridgeUrl = processFacts.bridgeUrl;
  lifecycle.spawnId = processFacts.spawnId;
  lifecycle.childPid = processFacts.pid;
  lifecycle.processIdentityQuerySupported = false;
  lifecycle.processTreeCleanupValidation = "not-required";
  lifecycle.directSubprocessFallback = false;
  lifecycle.possibleWrapperDescendants = false;
  applyProcessControlLifecycle({
    lifecycle,
    backendCommand,
    launchPlan,
    strategy: "windows-bridge",
    supported: true,
  });
  let stdoutText = "";
  let stderrText = "";
  const emitAudit = (event: string, details: Record<string, unknown> = {}) =>
    dispatchTransportAuditEvent(args.diagnosticCapture, {
      schema: "zotero-skills.acp.transport-audit.v1",
      ts: nowIso(),
      event,
      spawnId: lifecycle.spawnId,
      transportKind: lifecycle.transportKind,
      ...details,
    });
  emitAudit("launch_plan_built", {
    commandLabel: launchPlan.commandLabel,
    mode: launchPlan.mode,
    argCount: launchPlan.args.length,
    envKeys: Object.keys(environment).sort(),
    bridgePid: lifecycle.bridgePid,
    bridgeUrl: lifecycle.bridgeUrl,
    bridgeAuditFile: normalizeString(args.diagnosticCapture?.bridgeAuditFile),
  });
  emitAudit("websocket_connecting", { bridgePid: lifecycle.bridgePid });
  emitAudit("websocket_open", { bridgePid: lifecycle.bridgePid });
  emitAudit("spawn_request_sent", {
    command: launchPlan.command,
    argCount: launchPlan.args.length,
    cwd: args.cwd,
    envKeys: Object.keys(environment).sort(),
    bridgeAuditFile: normalizeString(args.diagnosticCapture?.bridgeAuditFile),
  });
  emitAudit("spawned_received", { childPid: lifecycle.childPid });

  const captureStdout = (bytes: Uint8Array) => {
    const chunk = new TextDecoder().decode(bytes);
    stdoutText = appendTail(stdoutText, chunk);
    lifecycle.stdoutChars += bytes.byteLength;
    args.diagnosticCapture?.onStdoutChunk?.(chunk);
    emitAudit("stdout_frame_received", {
      bytes: bytes.byteLength,
      stdoutChars: lifecycle.stdoutChars,
    });
  };
  const captureStderr = (bytes: Uint8Array) => {
    const chunk = new TextDecoder().decode(bytes);
    stderrText = appendTail(stderrText, chunk);
    lifecycle.stderrChars += chunk.length;
    args.diagnosticCapture?.onStderrChunk?.(chunk);
    emitAudit("stderr_control_received", {
      bytes: bytes.byteLength,
      stderrChars: lifecycle.stderrChars,
    });
  };
  const pump = async (
    stream: typeof process.stdout,
    onChunk: (bytes: Uint8Array) => void,
  ) => {
    const reader = stream.getReader();
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) return;
        if (result.value) onChunk(result.value);
      }
    } finally {
      reader.releaseLock();
    }
  };
  const stderrPump = pump(process.stderr, captureStderr).catch((error) => {
    lifecycle.readError ||= String((error as Error)?.message || error);
  });
  if (args.diagnosticCapture?.captureStdout) {
    void pump(process.stdout, captureStdout).catch((error) => {
      lifecycle.readError ||= String((error as Error)?.message || error);
    });
  }
  const stdout: AcpReadableLike<Uint8Array> = args.diagnosticCapture
    ?.captureStdout
    ? {
        getReader: () => ({
          read: async () => ({ done: true }),
          releaseLock() {},
        }),
      }
    : {
        getReader() {
          const reader = process.stdout.getReader();
          return {
            async read() {
              try {
                const result = await reader.read();
                if (result.value) captureStdout(result.value);
                return result;
              } catch (error) {
                lifecycle.readError ||= String(
                  (error as Error)?.message || error,
                );
                throw error;
              }
            },
            releaseLock: () => reader.releaseLock(),
          };
        },
      };
  const closed = process.wait().then(async (result) => {
    await withTimeoutFallback(
      stderrPump.then(() => true),
      ACP_PIPE_DRAIN_TIMEOUT_MS,
      false,
    );
    lifecycle.closedAt = nowIso();
    lifecycle.exitCode = result.exitCode;
    lifecycle.exitSource =
      result.outcome === "exited"
        ? lifecycle.killedByClose
          ? "cleanup-kill"
          : "natural-exit"
        : "unknown";
    lifecycle.webSocketError = result.webSocketError;
    lifecycle.readError ||= result.readError;
    if (result.outcome === "exited")
      emitAudit("exit_received", {
        exitCode: result.exitCode,
        exitSource: lifecycle.exitSource,
      });
    emitAudit("websocket_close", {
      exitCode: result.exitCode,
      exitSource: lifecycle.exitSource,
    });
  });
  const waitForExit = async (timeoutMs: number) =>
    (await waitForPromiseWithTimeout(closed, timeoutMs)) &&
    lifecycle.exitSource !== "unknown";
  return {
    stdin: {
      getWriter() {
        const writer = process.stdin.getWriter();
        return {
          async write(chunk: Uint8Array) {
            await writer.write(chunk);
            emitAudit("stdin_write", { bytes: chunk.byteLength });
          },
          async close() {
            await writer.close();
            emitAudit("stdin_close", { reason: "close" });
          },
          releaseLock: () => writer.releaseLock(),
        };
      },
    },
    stdout,
    close: async (options?: AcpTransportCloseOptions) => {
      lifecycle.closeRequestedAt ||= nowIso();
      const graceMs = options?.graceMs ?? ACP_TRANSPORT_CLOSE_GRACE_MS;
      if (await waitForExit(graceMs)) return;
      if (options?.kill === false) return;
      lifecycle.cleanupKillRequestedAt ||= nowIso();
      lifecycle.killedByClose = true;
      emitAudit("transport_cleanup_kill_requested");
      const result = await process.terminate();
      if (result.outcome === "unknown") {
        lifecycle.closeTimedOut = true;
        lifecycle.cleanupKillTimedOutAt ||= nowIso();
      }
      await waitForPromiseWithTimeout(closed, ACP_TRANSPORT_KILL_WAIT_MS);
    },
    closed,
    waitForExit,
    getExitCode: () => lifecycle.exitCode,
    getStdoutText: () => stdoutText,
    getStderrText: () => stderrText,
    getLifecycle: () =>
      ({ ...lifecycle, ...process.snapshot() }) as AcpTransportLifecycle,
    getCommandLabel: () => launchPlan.commandLabel,
    getCommandLine: () => launchPlan.commandLine,
  };
}

function createControlledAcpTransport(
  transport: AcpTransport,
  diagnosticCapture?: AcpTransportDiagnosticCaptureOptions,
): AcpTransport {
  let acceptingWrites = true;
  let writeQueue: Promise<void> = Promise.resolve();
  let eofPromise: Promise<void> | null = null;
  let closePromise: Promise<void> | null = null;
  const controllerLifecycle: Partial<AcpTransportLifecycle> = {
    stdinEofRequested: false,
    stdinEofStatus: "not-requested",
    gracefulExit: false,
    closeInvocationCount: 0,
    closeReused: false,
  };

  const requestEof = () => {
    if (eofPromise) {
      return eofPromise;
    }
    controllerLifecycle.stdinEofRequested = true;
    controllerLifecycle.stdinEofStatus = "not-requested";
    eofPromise = (async () => {
      let writer: AcpWritableWriter<Uint8Array> | null = null;
      try {
        writer = transport.stdin.getWriter();
        if (typeof writer.close === "function") {
          await writer.close();
        }
        controllerLifecycle.stdinEofStatus = "succeeded";
      } catch {
        controllerLifecycle.stdinEofStatus = "failed";
      } finally {
        writer?.releaseLock();
      }
    })();
    return eofPromise;
  };

  const stdin: AcpWritableLike<Uint8Array> = {
    getWriter() {
      let released = false;
      return {
        async write(chunk: Uint8Array) {
          if (released) {
            throw new Error("ACP transport stdin writer lock released");
          }
          if (!acceptingWrites) {
            throw new Error("ACP transport is closing");
          }
          const operation = writeQueue
            .catch(() => undefined)
            .then(async () => {
              const writer = transport.stdin.getWriter();
              try {
                await writer.write(chunk);
              } finally {
                writer.releaseLock();
              }
            });
          writeQueue = operation;
          await operation;
        },
        async close() {
          acceptingWrites = false;
          await writeQueue.catch(() => undefined);
          await requestEof();
        },
        async abort(reason?: unknown) {
          acceptingWrites = false;
          const writer = transport.stdin.getWriter();
          try {
            await writer.abort?.(reason);
          } finally {
            writer.releaseLock();
          }
        },
        releaseLock() {
          released = true;
        },
      };
    },
  };

  const close = (options?: AcpTransportCloseOptions) => {
    controllerLifecycle.closeInvocationCount =
      (controllerLifecycle.closeInvocationCount || 0) + 1;
    if (closePromise) {
      controllerLifecycle.closeReused = true;
      dispatchTransportAuditEvent(diagnosticCapture, {
        schema: "zotero-skills.acp.transport-audit.v1",
        ts: nowIso(),
        event: "controller_close_reused",
        transportKind: transport.getLifecycle().transportKind,
      });
      return closePromise;
    }
    acceptingWrites = false;
    closePromise = (async () => {
      dispatchTransportAuditEvent(diagnosticCapture, {
        schema: "zotero-skills.acp.transport-audit.v1",
        ts: nowIso(),
        event: "controller_close_started",
        transportKind: transport.getLifecycle().transportKind,
      });
      await waitForPromiseWithTimeout(
        writeQueue.catch(() => undefined),
        ACP_PIPE_DRAIN_TIMEOUT_MS,
      );
      const eofSettled = await waitForPromiseWithTimeout(
        requestEof(),
        ACP_PIPE_DRAIN_TIMEOUT_MS,
      );
      if (!eofSettled) {
        controllerLifecycle.stdinEofStatus = "timed-out";
      }
      await transport.close(options);
      const platformLifecycle = transport.getLifecycle();
      controllerLifecycle.gracefulExit =
        platformLifecycle.killedByClose !== true &&
        platformLifecycle.exitSource === "natural-exit";
      const lifecycle = {
        ...platformLifecycle,
        ...controllerLifecycle,
      };
      dispatchTransportAuditEvent(diagnosticCapture, {
        schema: "zotero-skills.acp.transport-audit.v1",
        ts: nowIso(),
        event: "controller_close_completed",
        transportKind: lifecycle.transportKind,
        stdinEofStatus: lifecycle.stdinEofStatus,
        gracefulExit: lifecycle.gracefulExit,
        processTreeCleanupValidation: lifecycle.processTreeCleanupValidation,
        processTreeCleanupValidationReason:
          lifecycle.processTreeCleanupValidationReason,
        termSignalSent: lifecycle.termSignalSent === true,
        killRevalidationPerformed: lifecycle.killRevalidationPerformed === true,
        killSignalSent: lifecycle.killSignalSent === true,
        processGroupSignalDelivery: lifecycle.processGroupSignalDelivery,
        processGroupSignalTargetPgid: lifecycle.processGroupSignalTargetPgid,
        processGroupSignalOperandDelimited:
          lifecycle.processGroupSignalOperandDelimited,
        directSubprocessFallback: lifecycle.directSubprocessFallback === true,
        possibleWrapperDescendants:
          lifecycle.possibleWrapperDescendants === true,
      });
    })();
    return closePromise;
  };

  return {
    ...transport,
    stdin,
    close,
    getLifecycle: () => ({
      ...transport.getLifecycle(),
      ...controllerLifecycle,
    }),
  };
}

export async function launchAcpTransport(args: AcpTransportLaunchArgs) {
  const subprocess = getMozillaSubprocessModule();
  if (subprocess) {
    if (
      detectRuntimePlatform() === "win32" &&
      shouldUseAcpWebSocketBridgeTransport()
    ) {
      return createControlledAcpTransport(
        await launchPlatformWindowsAcpTransport(args, subprocess),
        args.diagnosticCapture,
      );
    }
    return createControlledAcpTransport(
      await launchMozillaAcpTransport(args),
      args.diagnosticCapture,
    );
  }
  return createControlledAcpTransport(
    await launchNodeAcpTransport(args),
    args.diagnosticCapture,
  );
}

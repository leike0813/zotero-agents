import type { BackendInstance } from "../backends/types";
import { getMozillaSubprocessModule as getCompatMozillaSubprocessModule } from "../utils/runtimeCompatibility";
import {
  buildRuntimeCommandLaunchPlan,
  getCachedRuntimeCommand,
  resolveRuntimeCommand,
  type RuntimeCommandLaunchSpec,
  type RuntimeCommandResolution,
} from "../platform/command";
import { buildSubprocessEnvironment } from "../platform/env";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import {
  ensureAcpWebSocketBridgeService,
  getAcpWebSocketBridgeSnapshot,
  getAcpWebSocketConstructor,
  shouldUseAcpWebSocketBridgeTransport,
  type AcpWebSocketLike,
} from "./acpWebSocketBridgeService";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

type MozillaSubprocessModule = {
  pathSearch?: (command: string) => Promise<string | null>;
  call?: (args: {
    command: string;
    arguments?: string[];
    environment?: Record<string, string>;
    environmentAppend?: boolean;
    workdir?: string;
  }) => Promise<{
    stdin?: {
      write?: (data: string) => Promise<void>;
      close?: () => Promise<void>;
    };
    stdout?: {
      readString?: () => Promise<string>;
    };
    stderr?: {
      readString?: () => Promise<string>;
    };
    wait?: () => Promise<unknown>;
    exitCode?: unknown;
    exitValue?: unknown;
    kill?: (timeout?: number) => void;
  }>;
};

export type AcpTransportLaunchArgs = {
  backend: BackendInstance;
  cwd: string;
  diagnosticCapture?: AcpTransportDiagnosticCaptureOptions;
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
};

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

function stringifyEventValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (value instanceof Error) {
    return value.message || value.name;
  }
  return "";
}

function describeWebSocketEvent(event: unknown) {
  if (!event) {
    return "";
  }
  if (typeof event !== "object") {
    return String(event);
  }
  const record = event as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["type", "message", "code", "reason", "wasClean"]) {
    const value = stringifyEventValue(record[key]);
    if (value) {
      parts.push(`${key}=${value}`);
    }
  }
  const errorText = stringifyEventValue(record.error);
  if (errorText) {
    parts.push(`error=${errorText}`);
  }
  const target = record.target;
  if (target && typeof target === "object") {
    const targetRecord = target as Record<string, unknown>;
    const readyState = stringifyEventValue(targetRecord.readyState);
    if (readyState) {
      parts.push(`readyState=${readyState}`);
    }
  }
  return parts.join(" ") || Object.prototype.toString.call(event);
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

export function buildAcpLaunchPlanForTests(args: {
  command: string;
  resolvedCommand: string;
  args?: string[];
  platform?: string;
  comspec?: string;
  resolution?: RuntimeCommandResolution;
  preferWindowsBareCommandPowerShell?: boolean;
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
  const launchPlan = buildRuntimeCommandLaunchPlan({
    command,
    resolvedCommand,
    commandArgs,
    platform: args.platform,
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

function describeBinaryFrameValue(value: unknown) {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value !== "object") {
    return typeof value;
  }
  return Object.prototype.toString.call(value);
}

function readBlobLikeWithFileReader(value: {
  size?: number;
  type?: string;
}): Promise<ArrayBuffer> | null {
  const runtime = globalThis as {
    FileReader?: new () => {
      result: string | ArrayBuffer | null;
      error: unknown;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      readAsArrayBuffer: (blob: unknown) => void;
    };
  };
  const Reader = runtime.FileReader;
  if (typeof Reader !== "function") {
    return null;
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new Reader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error("FileReader did not return an ArrayBuffer"));
    };
    reader.onerror = () =>
      reject(reader.error || new Error("FileReader failed"));
    reader.readAsArrayBuffer(value);
  });
}

async function decodeBinaryMessage(value: unknown) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (typeof ArrayBuffer.isView === "function" && ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
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
    if (Object.prototype.toString.call(value) === "[object ArrayBuffer]") {
      return new Uint8Array(value as ArrayBuffer);
    }
    const record = value as {
      buffer?: ArrayBuffer;
      byteOffset?: number;
      byteLength?: number;
    };
    const buffer = record.buffer;
    if (
      buffer &&
      (buffer instanceof ArrayBuffer ||
        Object.prototype.toString.call(buffer) === "[object ArrayBuffer]")
    ) {
      return new Uint8Array(buffer, record.byteOffset || 0, record.byteLength);
    }
    const blobLike = value as {
      arrayBuffer?: () => Promise<ArrayBuffer>;
      size?: number;
      type?: string;
    };
    if (typeof blobLike.arrayBuffer === "function") {
      return new Uint8Array(await blobLike.arrayBuffer());
    }
    if (
      typeof blobLike.size === "number" &&
      typeof blobLike.type === "string"
    ) {
      const buffer = await readBlobLikeWithFileReader(blobLike);
      if (buffer) {
        return new Uint8Array(buffer);
      }
    }
  }
  return null;
}

function decodeBase64Text(value: unknown) {
  const text = normalizeString(value);
  if (!text) {
    return "";
  }
  const runtime = globalThis as {
    atob?: (value: string) => string;
    Buffer?: {
      from?: (
        value: string,
        encoding: string,
      ) => { toString: (encoding: string) => string };
    };
  };
  if (typeof runtime.atob === "function") {
    const binary = runtime.atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const TextDecoderCtor = resolveTextDecoderCtor();
    return new TextDecoderCtor("utf-8").decode(bytes);
  }
  if (typeof runtime.Buffer?.from === "function") {
    return runtime.Buffer.from(text, "base64").toString("utf-8");
  }
  return "";
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

function getMozillaSubprocessModule() {
  return getCompatMozillaSubprocessModule() as MozillaSubprocessModule | null;
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
    const chunk = await Promise.race([
      pipe.readString(),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(""), ACP_PIPE_DRAIN_TIMEOUT_MS);
      }),
    ]);
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

async function waitForPromiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
) {
  if (timeoutMs <= 0) {
    return false;
  }
  return await Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);
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
  const launchPlan = buildAcpLaunchPlanForTests({
    command: backendCommand,
    resolvedCommand: resolved.resolvedPath || backendCommand,
    args: args.backend.args || [],
    resolution: resolved,
    preferWindowsBareCommandPowerShell: !registryResolution,
  });
  const proc = await subprocess.call({
    command: launchPlan.command,
    arguments: launchPlan.args,
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
    : Promise.resolve();
  const closed = (async () => {
    let waited: unknown = undefined;
    if (typeof proc.wait === "function") {
      waited = await proc.wait();
    }
    await Promise.race([
      Promise.allSettled([stderrCapture, stdoutCapture]).then(() => undefined),
      new Promise<void>((resolve) => {
        setTimeout(resolve, ACP_PIPE_DRAIN_TIMEOUT_MS);
      }),
    ]);
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
      : createReadableStreamFromMozillaPipe(proc.stdout || {}, (chunk) => {
          stdoutText = appendTail(stdoutText, chunk);
          lifecycle.stdoutChars += String(chunk || "").length;
          args.diagnosticCapture?.onStdoutChunk?.(String(chunk || ""));
        }),
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
      try {
        proc.kill?.(0);
      } catch {
        // ignore
      }
      await closed;
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
    },
  ) => {
    stdin: NodeWritable;
    stdout: NodeReadable;
    stderr: {
      on: (event: string, handler: (chunk: Buffer | string) => void) => void;
    };
    once: (
      event: string,
      handler: (errorOrCode?: unknown, signal?: unknown) => void,
    ) => void;
    kill: () => void;
  };
  const command = normalizeString(args.backend.command);
  const resolved = await resolveNodeCommand(command);
  const launchPlan = buildAcpLaunchPlanForTests({
    command,
    resolvedCommand: resolved.resolvedPath || command,
    args: args.backend.args || [],
    platform: String(processModule.platform || "").trim(),
    resolution: resolved,
  });
  const env = {
    ...(processModule.env as Record<string, string | undefined>),
    ...(launchPlan.environment || {}),
    ...(args.backend.env || {}),
  };
  const child = spawn(launchPlan.command, launchPlan.args, {
    cwd: args.cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderrText = "";
  let stdoutText = "";
  const lifecycle = createLifecycleState();
  lifecycle.transportKind = "node-subprocess";
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

        const flush = () => {
          while (waiting.length > 0) {
            if (pendingError) {
              const next = waiting.shift();
              next?.reject(pendingError);
              continue;
            }
            if (queue.length > 0) {
              const next = waiting.shift();
              next?.resolve({
                done: false,
                value: queue.shift(),
              });
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
          queue.push(encodeUint8Chunk(chunk, encoder));
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
              return {
                done: false,
                value: queue.shift(),
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
      try {
        child.kill();
      } catch {
        // ignore
      }
      await closed;
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

function createWebSocketStdoutReadable(args: {
  queue: Uint8Array[];
  waiting: Array<{
    resolve: (result: AcpReadResult<Uint8Array>) => void;
    reject: (error: unknown) => void;
  }>;
  getEnded: () => boolean;
  getError: () => unknown;
}) {
  return {
    getReader() {
      let released = false;
      return {
        async read() {
          if (released) {
            return { done: true, value: undefined };
          }
          const error = args.getError();
          if (error) {
            throw error;
          }
          if (args.queue.length > 0) {
            return {
              done: false,
              value: args.queue.shift(),
            };
          }
          if (args.getEnded()) {
            return { done: true, value: undefined };
          }
          return new Promise<AcpReadResult<Uint8Array>>((resolve, reject) => {
            args.waiting.push({ resolve, reject });
          });
        },
        releaseLock() {
          released = true;
        },
      };
    },
  } satisfies AcpReadableLike<Uint8Array>;
}

function createWebSocketStdinWritable(args: {
  socket: AcpWebSocketLike;
  getClosed: () => boolean;
  getError: () => unknown;
  onWrite?: (chunk: Uint8Array) => void;
  onClose?: (reason: "close" | "abort") => void;
}) {
  return {
    getWriter() {
      let released = false;
      return {
        async write(chunk: Uint8Array) {
          if (released) {
            throw new Error("websocket bridge stdin writer lock released");
          }
          const error = args.getError();
          if (error) {
            throw error;
          }
          if (args.getClosed()) {
            throw new Error("websocket bridge transport is closed");
          }
          args.onWrite?.(chunk);
          args.socket.send(chunk);
        },
        async close() {
          try {
            args.onClose?.("close");
            args.socket.close();
          } catch {
            // ignore close errors
          }
        },
        async abort() {
          try {
            args.onClose?.("abort");
            args.socket.close();
          } catch {
            // ignore close errors
          }
        },
        releaseLock() {
          released = true;
        },
      };
    },
  } satisfies AcpWritableLike<Uint8Array>;
}

async function launchWebSocketBridgeAcpTransport(
  args: AcpTransportLaunchArgs,
  subprocess: MozillaSubprocessModule,
): Promise<AcpTransport> {
  const backendCommand = normalizeString(args.backend.command);
  const resolved = await resolveMozillaCommand(subprocess, backendCommand);
  const registryResolution = getCachedRuntimeCommand(backendCommand);
  const launchPlan = buildAcpLaunchPlanForTests({
    command: backendCommand,
    resolvedCommand: resolved.resolvedPath || backendCommand,
    args: args.backend.args || [],
    resolution: resolved,
    preferWindowsBareCommandPowerShell: !registryResolution,
  });
  const env = buildSubprocessEnvironment({
    ...(launchPlan.environment || {}),
    ...(args.backend.env || {}),
  });
  const bridge = await ensureAcpWebSocketBridgeService();
  const bridgeSnapshot = getAcpWebSocketBridgeSnapshot();
  const WebSocketCtor = getAcpWebSocketConstructor();
  const socket = new WebSocketCtor(bridge.url);
  socket.binaryType = "arraybuffer";

  let stderrText = "";
  let stdoutText = "";
  let ended = false;
  let closed = false;
  let pendingError: unknown = null;
  let closeResolve: (() => void) | null = null;
  let spawnResolve: (() => void) | null = null;
  let spawnReject: ((error: unknown) => void) | null = null;
  let messageQueue = Promise.resolve();
  const stdoutQueue: Uint8Array[] = [];
  const stdoutWaiting: Array<{
    resolve: (result: AcpReadResult<Uint8Array>) => void;
    reject: (error: unknown) => void;
  }> = [];
  const lifecycle = createLifecycleState();
  lifecycle.transportKind = "websocket-bridge";
  lifecycle.bridgePid = bridge.pid;
  lifecycle.bridgeUrl = bridgeSnapshot?.url;
  lifecycle.spawnId = randomTransportId();
  const emitAudit = (event: string, details: Record<string, unknown> = {}) => {
    dispatchTransportAuditEvent(args.diagnosticCapture, {
      schema: "zotero-skills.acp.transport-audit.v1",
      ts: nowIso(),
      event,
      spawnId: lifecycle.spawnId,
      transportKind: lifecycle.transportKind,
      ...details,
    });
  };
  emitAudit("launch_plan_built", {
    commandLabel: launchPlan.commandLabel,
    commandLine: launchPlan.commandLine,
    mode: launchPlan.mode,
    command: launchPlan.command,
    argCount: launchPlan.args.length,
    envKeys: Object.keys(env).sort(),
    bridgePid: bridge.pid,
    bridgeUrl: bridgeSnapshot?.url,
    bridgeAuditFile: normalizeString(args.diagnosticCapture?.bridgeAuditFile),
  });
  emitAudit("websocket_connecting", {
    bridgePid: bridge.pid,
  });

  const flushStdout = () => {
    while (stdoutWaiting.length > 0) {
      if (pendingError) {
        stdoutWaiting.shift()?.reject(pendingError);
        continue;
      }
      if (stdoutQueue.length > 0) {
        stdoutWaiting.shift()?.resolve({
          done: false,
          value: stdoutQueue.shift(),
        });
        continue;
      }
      if (ended) {
        stdoutWaiting.shift()?.resolve({ done: true, value: undefined });
        continue;
      }
      break;
    }
  };

  const fail = (error: unknown) => {
    pendingError = error;
    spawnReject?.(error);
    flushStdout();
  };

  const closedPromise = new Promise<void>((resolve) => {
    closeResolve = resolve;
  });

  const spawnedPromise = new Promise<void>((resolve, reject) => {
    spawnResolve = resolve;
    spawnReject = reject;
  });

  socket.onopen = () => {
    emitAudit("websocket_open", {
      bridgePid: bridge.pid,
    });
    const spawnRequest: Record<string, unknown> = {
      type: "spawn",
      id: lifecycle.spawnId,
      command: launchPlan.command,
      args: launchPlan.args,
      cwd: args.cwd,
      env,
    };
    const bridgeAuditFile = normalizeString(
      args.diagnosticCapture?.bridgeAuditFile,
    );
    if (bridgeAuditFile) {
      spawnRequest.auditFile = bridgeAuditFile;
    }
    socket.send(JSON.stringify(spawnRequest));
    emitAudit("spawn_request_sent", {
      command: launchPlan.command,
      argCount: launchPlan.args.length,
      cwd: args.cwd,
      envKeys: Object.keys(env).sort(),
      bridgeAuditFile,
    });
  };
  const handleMessage = async (event: { data?: unknown }) => {
    if (typeof event.data === "string") {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        fail(error);
        return;
      }
      const type = normalizeString(message.type);
      if (type === "spawned") {
        lifecycle.childPid = toFiniteExitCode(message.pid);
        emitAudit("spawned_received", {
          childPid: lifecycle.childPid,
        });
        spawnResolve?.();
        return;
      }
      if (type === "stderr") {
        const chunk = decodeBase64Text(message.dataBase64);
        stderrText = appendTail(stderrText, chunk);
        lifecycle.stderrChars += chunk.length;
        args.diagnosticCapture?.onStderrChunk?.(chunk);
        emitAudit("stderr_control_received", {
          bytes: chunk.length,
          stderrChars: lifecycle.stderrChars,
        });
        return;
      }
      if (type === "exit") {
        lifecycle.exitCode = toFiniteExitCode(message.code);
        lifecycle.exitSource = lifecycle.killedByClose
          ? "cleanup-kill"
          : lifecycle.exitCode === null
            ? "unknown"
            : "natural-exit";
        ended = true;
        emitAudit("exit_received", {
          exitCode: lifecycle.exitCode,
          exitSource: lifecycle.exitSource,
        });
        flushStdout();
        return;
      }
      if (type === "error") {
        emitAudit("bridge_error_received", {
          message: normalizeString(message.message) || "ACP bridge error",
        });
        fail(new Error(normalizeString(message.message) || "ACP bridge error"));
      }
      return;
    }
    const bytes = await decodeBinaryMessage(event.data);
    if (!bytes) {
      const error = new Error(
        `ACP bridge stdout frame has unsupported data type: ${describeBinaryFrameValue(
          event.data,
        )}`,
      );
      lifecycle.readError = error.message;
      fail(error);
      return;
    }
    const TextDecoderCtor = resolveTextDecoderCtor();
    const chunkText = new TextDecoderCtor("utf-8").decode(bytes);
    stdoutText = appendTail(stdoutText, chunkText);
    lifecycle.stdoutChars += bytes.byteLength;
    args.diagnosticCapture?.onStdoutChunk?.(chunkText);
    emitAudit("stdout_frame_received", {
      bytes: bytes.byteLength,
      stdoutChars: lifecycle.stdoutChars,
    });
    if (!args.diagnosticCapture?.captureStdout) {
      stdoutQueue.push(bytes);
      flushStdout();
    }
  };
  socket.onmessage = (event: { data?: unknown }) => {
    messageQueue = messageQueue
      .then(() => handleMessage(event))
      .catch((error) => fail(error));
  };
  socket.onerror = (event: unknown) => {
    const detail = describeWebSocketEvent(event);
    lifecycle.webSocketError = detail;
    emitAudit("websocket_error", {
      detail,
    });
    fail(new Error(`ACP bridge WebSocket error${detail ? `: ${detail}` : ""}`));
  };
  const handleClose = (event: unknown) => {
    const detail = describeWebSocketEvent(event);
    lifecycle.webSocketClose = detail;
    closed = true;
    ended = true;
    lifecycle.closedAt ||= nowIso();
    if (lifecycle.exitSource === "running") {
      lifecycle.exitSource = lifecycle.killedByClose
        ? "cleanup-kill"
        : lifecycle.exitCode === null
          ? "unknown"
          : "natural-exit";
    }
    if (
      !lifecycle.killedByClose &&
      lifecycle.exitCode === null &&
      !pendingError
    ) {
      pendingError = new Error(
        `ACP bridge WebSocket closed before exit frame${
          detail ? `: ${detail}` : ""
        }`,
      );
    }
    emitAudit("websocket_close", {
      detail,
      exitCode: lifecycle.exitCode,
      exitSource: lifecycle.exitSource,
      killedByClose: lifecycle.killedByClose,
    });
    spawnReject?.(
      pendingError || new Error("ACP bridge WebSocket closed before spawn"),
    );
    flushStdout();
    closeResolve?.();
  };
  socket.onclose = (event: unknown) => {
    messageQueue = messageQueue
      .catch((error) => {
        fail(error);
      })
      .then(() => handleClose(event));
  };

  await spawnedPromise;

  const waitForExit = (timeoutMs: number) =>
    waitForPromiseWithTimeout(closedPromise, timeoutMs);

  return {
    stdin: createWebSocketStdinWritable({
      socket,
      getClosed: () => closed,
      getError: () => pendingError,
      onWrite: (chunk) => {
        emitAudit("stdin_write", {
          bytes: chunk.byteLength,
        });
      },
      onClose: (reason) => {
        emitAudit("stdin_close", {
          reason,
        });
      },
    }),
    stdout: createWebSocketStdoutReadable({
      queue: stdoutQueue,
      waiting: stdoutWaiting,
      getEnded: () => ended,
      getError: () => pendingError,
    }),
    close: async (options?: AcpTransportCloseOptions) => {
      lifecycle.closeRequestedAt ||= nowIso();
      emitAudit("transport_close_requested", {
        graceMs: options?.graceMs ?? ACP_TRANSPORT_CLOSE_GRACE_MS,
        kill: options?.kill !== false,
      });
      const graceMs = options?.graceMs ?? ACP_TRANSPORT_CLOSE_GRACE_MS;
      if (await waitForExit(graceMs)) {
        emitAudit("transport_close_completed", {
          exitCode: lifecycle.exitCode,
          exitSource: lifecycle.exitSource,
        });
        return;
      }
      if (options?.kill === false) {
        emitAudit("transport_close_deferred", {
          reason: "kill-disabled",
        });
        return;
      }
      lifecycle.cleanupKillRequestedAt ||= nowIso();
      lifecycle.killedByClose = true;
      emitAudit("transport_cleanup_kill_requested", {});
      try {
        socket.close();
      } catch {
        // ignore close errors
      }
      await closedPromise;
      emitAudit("transport_close_completed", {
        exitCode: lifecycle.exitCode,
        exitSource: lifecycle.exitSource,
      });
    },
    closed: closedPromise,
    waitForExit,
    getExitCode: () => lifecycle.exitCode,
    getStdoutText: () => stdoutText,
    getStderrText: () => stderrText,
    getLifecycle: () => cloneLifecycleState(lifecycle),
    getCommandLabel: () => launchPlan.commandLabel,
    getCommandLine: () => launchPlan.commandLine,
  };
}

export async function launchAcpTransport(args: AcpTransportLaunchArgs) {
  const subprocess = getMozillaSubprocessModule();
  if (subprocess) {
    if (
      detectRuntimePlatform() === "win32" &&
      shouldUseAcpWebSocketBridgeTransport()
    ) {
      return launchWebSocketBridgeAcpTransport(args, subprocess);
    }
    return launchMozillaAcpTransport(args);
  }
  return launchNodeAcpTransport(args);
}

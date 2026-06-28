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
  startedAt: string;
  closedAt?: string;
  closeRequestedAt?: string;
  cleanupKillRequestedAt?: string;
  exitCode: number | null;
  exitSource: AcpTransportExitSource;
  killedByClose: boolean;
  stdoutChars: number;
  stderrChars: number;
};

export type AcpTransportCloseOptions = {
  graceMs?: number;
  kill?: boolean;
};

export type AcpTransportDiagnosticCaptureOptions = {
  captureStdout?: boolean;
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
    preferWindowsBareCommandPowerShell:
      args.preferWindowsBareCommandPowerShell,
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
  const resolved = await resolveMozillaCommand(
    subprocess,
    backendCommand,
  );
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

export async function launchAcpTransport(args: AcpTransportLaunchArgs) {
  if (getMozillaSubprocessModule()) {
    return launchMozillaAcpTransport(args);
  }
  return launchNodeAcpTransport(args);
}

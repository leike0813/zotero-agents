import type { BackendInstance } from "../backends/types";
import { getMozillaSubprocessModule as getCompatMozillaSubprocessModule } from "../utils/runtimeCompatibility";
import {
  buildRuntimeCommandLaunchPlan,
  resolveRuntimeCommand,
  type RuntimeCommandLaunchSpec,
  type RuntimeCommandResolution,
} from "../platform/command";

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
    wait?: () => Promise<number>;
    kill?: (timeout?: number) => void;
  }>;
};

export type AcpTransportLaunchArgs = {
  backend: BackendInstance;
  cwd: string;
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
  close: () => Promise<void>;
  closed: Promise<void>;
  getStderrText: () => string;
  getCommandLabel: () => string;
  getCommandLine: () => string;
};

export type AcpLaunchPlan = RuntimeCommandLaunchSpec & {
  commandLabel: string;
};

const ACP_STDERR_MAX_CHARS = 64 * 1024;
const ACP_PIPE_DRAIN_TIMEOUT_MS = 2_000;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function buildAcpLaunchPlanForTests(args: {
  command: string;
  resolvedCommand: string;
  args?: string[];
  platform?: string;
  comspec?: string;
  resolution?: RuntimeCommandResolution;
}): AcpLaunchPlan {
  const command = normalizeString(args.command);
  const resolvedCommand = normalizeString(args.resolvedCommand) || command;
  const commandArgs = Array.isArray(args.args) ? [...args.args] : [];
  const commandLabel = [command || resolvedCommand, ...commandArgs]
    .filter(Boolean)
    .join(" ");
  const launchPlan = buildRuntimeCommandLaunchPlan({
    command,
    resolvedCommand,
    commandArgs,
    platform: args.platform,
    resolution: args.resolution,
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

function createReadableStreamFromMozillaPipe(pipe: {
  readString?: () => Promise<string>;
}) {
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
  const resolved = await resolveMozillaCommand(
    subprocess,
    normalizeString(args.backend.command),
  );
  const launchPlan = buildAcpLaunchPlanForTests({
    command: normalizeString(args.backend.command),
    resolvedCommand:
      resolved.resolvedPath || normalizeString(args.backend.command),
    args: args.backend.args || [],
    resolution: resolved,
  });
  const proc = await subprocess.call({
    command: launchPlan.command,
    arguments: launchPlan.args,
    environment: {
      ...(launchPlan.environment || {}),
      ...(args.backend.env || {}),
    },
    environmentAppend: true,
    workdir: args.cwd,
  });
  const stderrPromise = drainMozillaPipe(proc.stderr);
  const closed = (async () => {
    if (typeof proc.wait === "function") {
      await proc.wait();
    }
    await stderrPromise;
  })();
  let stderrText = "";
  void stderrPromise.then((text) => {
    stderrText = text;
  });
  return {
    stdin: createWritableStreamFromMozillaPipe(proc.stdin || {}),
    stdout: createReadableStreamFromMozillaPipe(proc.stdout || {}),
    close: async () => {
      try {
        proc.kill?.(0);
      } catch {
        // ignore
      }
      await closed;
    },
    closed,
    getStderrText: () => stderrText,
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
    once: (event: string, handler: (error?: unknown) => void) => void;
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
  child.stderr.on("data", (chunk: Buffer | string) => {
    stderrText += String(chunk || "");
    if (stderrText.length > ACP_STDERR_MAX_CHARS) {
      stderrText = stderrText.slice(stderrText.length - ACP_STDERR_MAX_CHARS);
    }
  });
  const closed = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", () => resolve());
  });
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
            child.stdout.off("data", onData);
            child.stdout.off("end", onEnd);
            child.stdout.off("error", onError);
          },
        };
      },
    },
    close: async () => {
      try {
        child.kill();
      } catch {
        // ignore
      }
      await closed;
    },
    closed,
    getStderrText: () => stderrText,
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

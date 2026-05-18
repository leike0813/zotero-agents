import type { BackendInstance } from "../backends/types";
import {
  getWindowsShellCommandCandidates,
  isTrustedResolvedCommandPath,
  resolveTrustedPathSearchResult,
  resolveWindowsCommandFromGlobalNpmRoot,
  resolveWindowsCommandFromNodeInstallRoot,
  resolveWindowsCommandFromPowerShell,
  resolveWindowsCommandFromUserLocalBin,
} from "./windowsCommandResolution";
import { getMozillaSubprocessModule as getCompatMozillaSubprocessModule } from "../utils/runtimeCompatibility";

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

export type AcpLaunchPlan = {
  command: string;
  args: string[];
  environment?: Record<string, string>;
  commandLabel: string;
  commandLine: string;
};

const ACP_STDERR_MAX_CHARS = 64 * 1024;
const ACP_PIPE_DRAIN_TIMEOUT_MS = 2_000;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function detectWindowsPlatform(platform?: string) {
  const runtime = globalThis as {
    Zotero?: { isWin?: boolean };
    process?: { platform?: string };
  };
  if (typeof platform === "string" && platform.trim()) {
    return platform.trim().toLowerCase() === "win32";
  }
  if (typeof runtime.Zotero?.isWin === "boolean") {
    return runtime.Zotero.isWin;
  }
  return String(runtime.process?.platform || "").toLowerCase() === "win32";
}

function isPathLikeCommand(commandRaw: string) {
  const command = normalizeString(commandRaw);
  return (
    /[\\/]/.test(command) ||
    /^[A-Za-z]:[\\/]/.test(command) ||
    command.startsWith("/")
  );
}

function quoteShellToken(value: string) {
  const normalized = String(value || "");
  if (!/[\s"&()^|<>]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/(["^&|<>])/g, "^$1")}"`;
}

function formatCommandLine(command: string, args: string[]) {
  return [command, ...args].map((entry) => quoteShellToken(entry)).join(" ");
}

function buildWindowsShellCommandLine(command: string, args: string[]) {
  return [command, ...args].map((entry) => quoteShellToken(entry)).join(" ");
}

function dirnameWindowsPath(pathRaw: string) {
  const path = normalizeString(pathRaw);
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index > 0 ? path.slice(0, index) : "";
}

function prependPathEntry(pathValue: string | undefined, entryRaw: string) {
  const entry = normalizeString(entryRaw);
  if (!entry) {
    return pathValue;
  }
  const current = String(pathValue || "");
  const parts = current
    .split(";")
    .map((part) => normalizeString(part).toLowerCase())
    .filter(Boolean);
  if (parts.includes(entry.toLowerCase())) {
    return current;
  }
  return current ? `${entry};${current}` : entry;
}

function resolveWindowsShellCommand(commandRaw: string, platform?: string) {
  const candidates = getWindowsShellCommandCandidates(commandRaw, platform);
  return normalizeString(candidates[0]) || normalizeString(commandRaw);
}

function shouldWrapWindowsLaunch(args: {
  command: string;
  resolvedCommand: string;
  platform?: string;
}) {
  if (!detectWindowsPlatform(args.platform)) {
    return false;
  }
  return /\.(cmd|bat)$/i.test(normalizeString(args.resolvedCommand));
}

export function buildAcpLaunchPlanForTests(args: {
  command: string;
  resolvedCommand: string;
  args?: string[];
  platform?: string;
  comspec?: string;
}): AcpLaunchPlan {
  const command = normalizeString(args.command);
  const resolvedCommand = normalizeString(args.resolvedCommand) || command;
  const commandArgs = Array.isArray(args.args) ? [...args.args] : [];
  const commandLabel = [command || resolvedCommand, ...commandArgs]
    .filter(Boolean)
    .join(" ");
  if (
    shouldWrapWindowsLaunch({
      command,
      resolvedCommand,
      platform: args.platform,
    })
  ) {
    const shellCommand = resolveWindowsShellCommand(
      normalizeString(args.comspec) || "cmd.exe",
      args.platform,
    );
    const commandForShell = isPathLikeCommand(command) ? resolvedCommand : command;
    const resolvedCommandDir = dirnameWindowsPath(resolvedCommand);
    const environment =
      resolvedCommandDir && !isPathLikeCommand(command)
        ? {
            PATH: prependPathEntry(undefined, resolvedCommandDir) || resolvedCommandDir,
          }
        : undefined;
    const shellArgs = [
      "/d",
      "/c",
      buildWindowsShellCommandLine(commandForShell, commandArgs),
    ];
    return {
      command: shellCommand,
      args: shellArgs,
      environment,
      commandLabel,
      commandLine: formatCommandLine(shellCommand, shellArgs),
    };
  }
  return {
    command: resolvedCommand,
    args: commandArgs,
    commandLabel,
    commandLine: formatCommandLine(resolvedCommand, commandArgs),
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

function encodeUint8Chunk(value: unknown, encoder: InstanceType<ReturnType<typeof resolveTextEncoderCtor>>) {
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

async function drainMozillaPipe(pipe: {
  readString?: () => Promise<string>;
} | null | undefined) {
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
  const isPathLike =
    /[\\/]/.test(command) ||
    /^[A-Za-z]:[\\/]/.test(command) ||
    command.startsWith("/");
  if (isPathLike) {
    return command;
  }
  const resolvedFromPathSearch = await resolveTrustedPathSearchResult({
    command,
    pathSearch: subprocess.pathSearch,
    platform: detectWindowsPlatform() ? "win32" : undefined,
  });
  if (resolvedFromPathSearch) {
    return resolvedFromPathSearch;
  }
  if (detectWindowsPlatform()) {
    const resolvedFromPowerShell = await resolveWindowsCommandFromPowerShell(
      command,
    );
    if (resolvedFromPowerShell.length > 0) {
      return normalizeString(resolvedFromPowerShell[0]);
    }
    const resolvedFromUserLocalBin = await resolveWindowsCommandFromUserLocalBin(
      command,
    );
    if (resolvedFromUserLocalBin.length > 0) {
      return normalizeString(resolvedFromUserLocalBin[0]);
    }
    const resolvedFromGlobalNpm = await resolveWindowsCommandFromGlobalNpmRoot(
      command,
    );
    if (resolvedFromGlobalNpm.length > 0) {
      return normalizeString(resolvedFromGlobalNpm[0]);
    }
    const resolvedFromNodeInstall = await resolveWindowsCommandFromNodeInstallRoot(
      command,
    );
    if (resolvedFromNodeInstall.length > 0) {
      return normalizeString(resolvedFromNodeInstall[0]);
    }
  }
  throw new Error(`Command "${command}" was not found in PATH`);
}

async function launchMozillaAcpTransport(
  args: AcpTransportLaunchArgs,
): Promise<AcpTransport> {
  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    throw new Error("mozilla subprocess unavailable");
  }
  const resolvedCommand = await resolveMozillaCommand(
    subprocess,
    normalizeString(args.backend.command),
  );
  const launchPlan = buildAcpLaunchPlanForTests({
    command: normalizeString(args.backend.command),
    resolvedCommand,
    args: args.backend.args || [],
    comspec: normalizeString(
      args.backend.env?.ComSpec || args.backend.env?.COMSPEC,
    ),
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
  const pathModule = await dynamicImport("node:path");
  const fs = await dynamicImport("node:fs");
  const processModule = await dynamicImport("node:process");
  const isWindows = String(processModule.platform || "").toLowerCase() === "win32";
  const accessModes = fs.constants?.X_OK ?? 0;
  const isPathLike =
    /[\\/]/.test(command) ||
    /^[A-Za-z]:[\\/]/.test(command) ||
    command.startsWith("/");
  const checkOne = (candidate: string) => {
    try {
      if (typeof fs.accessSync === "function") {
        fs.accessSync(candidate, accessModes);
      }
      return true;
    } catch {
      return false;
    }
  };
  if (isPathLike) {
    if (!checkOne(command)) {
      throw new Error(`Command "${command}" is not executable`);
    }
    return command;
  }
  const pathValue = String(processModule.env?.PATH || "");
  const entries = pathValue
    .split(pathModule.delimiter)
    .map((entry: string) => String(entry || "").trim())
    .filter(Boolean);
  const extCandidates =
    isWindows
      ? (() => {
          const configured = String(processModule.env?.PATHEXT || "")
            .split(";")
            .map((entry: string) => String(entry || "").trim())
            .filter(Boolean);
          if (/\.[A-Za-z0-9]+$/.test(command)) {
            return [""];
          }
          return configured.length > 0
            ? configured
            : [".EXE", ".CMD", ".BAT", ".COM"];
        })()
      : [""];
  for (const dir of entries) {
    for (const ext of extCandidates) {
      const candidate = pathModule.join(dir, `${command}${ext}`);
      if (checkOne(candidate)) {
        return candidate;
      }
    }
  }
  throw new Error(`Command "${command}" was not found in PATH`);
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
    once: (
      event: "end" | "error",
      handler: (arg?: unknown) => void,
    ) => void;
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
  const resolvedCommand = await resolveNodeCommand(command);
  const launchPlan = buildAcpLaunchPlanForTests({
    command,
    resolvedCommand,
    args: args.backend.args || [],
    platform: String(processModule.platform || "").trim(),
    comspec: normalizeString(
      processModule.env?.ComSpec || processModule.env?.COMSPEC,
    ),
  });
  const env = {
    ...(processModule.env as Record<string, string | undefined>),
    ...(launchPlan.environment || {}),
    ...(args.backend.env || {}),
  };
  if (launchPlan.environment?.PATH && !args.backend.env?.PATH) {
    env.PATH = prependPathEntry(
      String(processModule.env?.PATH || ""),
      launchPlan.environment.PATH,
    );
  }
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

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export type MozillaSubprocessModule = {
  pathSearch?: (command: string) => Promise<string | null>;
  call?: (args: {
    command: string;
    arguments?: string[];
    environment?: Record<string, string>;
    environmentAppend?: boolean;
    stderr?: "ignore" | "stdout" | "pipe";
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
    pid?: unknown;
  }>;
};

export type OneShotSubprocessAdapterKind =
  | "node"
  | "mozilla"
  | "zotero-internal"
  | "windows-xpcom";

export type OneShotSubprocessRequest = {
  command: string;
  args?: string[];
  environment?: Record<string, string>;
  cwd?: string;
  timeoutMs?: number;
  terminationGraceMs?: number;
  hidden?: boolean;
};

export type OneShotSubprocessAdapterRequest = {
  command: string;
  args: string[];
  environment?: Record<string, string>;
  cwd?: string;
  hidden: boolean;
};

export type OneShotSubprocessExecution = {
  readStdout?: () => Promise<string>;
  readStderr?: () => Promise<string>;
  wait: () => Promise<unknown>;
  exitCode?: unknown | (() => unknown);
  terminate?: () => void | Promise<void>;
};

export type OneShotSubprocessAdapter = {
  kind: OneShotSubprocessAdapterKind;
  supportsHiddenExecution: boolean;
  start: (
    request: OneShotSubprocessAdapterRequest,
  ) => Promise<OneShotSubprocessExecution>;
};

export type OneShotSubprocessResult = {
  outcome: "exited" | "unavailable" | "timed_out" | "failed";
  adapter: OneShotSubprocessAdapterKind | null;
  available: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  hidden: {
    requested: boolean;
    applied: boolean;
  };
  termination: {
    requested: boolean;
    supported: boolean;
    completed: boolean;
  };
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function extractMozillaSubprocess(value: unknown) {
  const record =
    value && typeof value === "object"
      ? (value as { Subprocess?: unknown })
      : null;
  return (record?.Subprocess || null) as MozillaSubprocessModule | null;
}

/**
 * Resolve the current Mozilla subprocess capability at invocation time.
 * Long-lived lifecycle owners use this narrow resolver without moving their
 * process handles or lifecycle policy into the one-shot interface.
 */
export function getMozillaSubprocessModule() {
  const runtime = globalThis as {
    ChromeUtils?: {
      importESModule?: (url: string) => unknown;
      import?: (url: string) => unknown;
    };
  };

  const importESModule = runtime.ChromeUtils?.importESModule;
  if (typeof importESModule === "function") {
    for (const specifier of [
      "resource://gre/modules/Subprocess.sys.mjs",
      "resource://gre/modules/Subprocess.mjs",
    ]) {
      try {
        const subprocess = extractMozillaSubprocess(importESModule(specifier));
        if (subprocess) {
          return subprocess;
        }
      } catch {
        // Try the next supported module shape.
      }
    }
  }

  const legacyImport = runtime.ChromeUtils?.import;
  if (typeof legacyImport === "function") {
    try {
      return extractMozillaSubprocess(
        legacyImport("resource://gre/modules/Subprocess.jsm"),
      );
    } catch {
      return null;
    }
  }
  return null;
}

function toFiniteExitCode(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  return null;
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

function readExecutionExitCode(execution: OneShotSubprocessExecution) {
  try {
    const value =
      typeof execution.exitCode === "function"
        ? execution.exitCode()
        : execution.exitCode;
    return extractExitCode(value);
  } catch {
    return null;
  }
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => ({ completed: true as const, value })),
      new Promise<{ completed: false }>((resolve) => {
        timer = globalThis.setTimeout(
          () => resolve({ completed: false }),
          Math.max(0, Math.floor(timeoutMs)),
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      globalThis.clearTimeout(timer);
    }
  }
}

async function drainMozillaPipe(pipe: unknown) {
  const reader = pipe as
    | { readString?: () => Promise<string> }
    | null
    | undefined;
  if (typeof reader?.readString !== "function") {
    return "";
  }
  let output = "";
  while (true) {
    const chunk = await reader.readString();
    if (!chunk) {
      return output;
    }
    output += chunk;
  }
}

function createMozillaAdapter(
  subprocess: MozillaSubprocessModule,
): OneShotSubprocessAdapter | null {
  if (typeof subprocess.call !== "function") {
    return null;
  }
  return {
    kind: "mozilla",
    supportsHiddenExecution: false,
    async start(request) {
      const process = await subprocess.call!({
        command: request.command,
        arguments: request.args,
        environment: request.environment,
        environmentAppend: true,
        workdir: request.cwd,
      });
      return {
        readStdout: () => drainMozillaPipe(process.stdout),
        readStderr: () => drainMozillaPipe(process.stderr),
        wait: async () =>
          typeof process.wait === "function" ? process.wait() : undefined,
        exitCode: () => process.exitCode ?? process.exitValue,
        terminate:
          typeof process.kill === "function"
            ? () => {
                process.kill?.(0);
              }
            : undefined,
      };
    },
  };
}

function getZoteroInternalSubprocess() {
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
  return typeof subprocess === "function" ? subprocess : null;
}

function createZoteroInternalAdapter(
  subprocess: (command: string, args?: string[]) => Promise<string>,
): OneShotSubprocessAdapter {
  return {
    kind: "zotero-internal",
    supportsHiddenExecution: false,
    async start(request) {
      const completion = subprocess(request.command, request.args);
      return {
        readStdout: async () => String((await completion) || ""),
        readStderr: async () => "",
        wait: async () => {
          await completion;
          return 0;
        },
        exitCode: 0,
      };
    },
  };
}

function createWindowsXpcomAdapter(
  request: OneShotSubprocessRequest,
): OneShotSubprocessAdapter | null {
  const command = normalizeString(request.command);
  if (
    !request.hidden ||
    request.cwd ||
    request.environment ||
    !(/^[A-Za-z]:[\\/]/.test(command) || command.startsWith("/"))
  ) {
    return null;
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
    typeof localFileFactory?.createInstance !== "function" ||
    typeof processFactory?.createInstance !== "function" ||
    !nsIFile ||
    !nsIProcess
  ) {
    return null;
  }
  return {
    kind: "windows-xpcom",
    supportsHiddenExecution: true,
    async start(adapterRequest) {
      const executable = localFileFactory.createInstance!(nsIFile) as {
        initWithPath?: (path: string) => void;
      };
      if (typeof executable.initWithPath !== "function") {
        throw new Error("XPCOM file initialization is unavailable");
      }
      executable.initWithPath(adapterRequest.command);
      const process = processFactory.createInstance!(nsIProcess) as {
        init?: (file: unknown) => void;
        runwAsync?: (args: string[], count: number, observer: unknown) => void;
        runAsync?: (args: string[], count: number, observer: unknown) => void;
        startHidden?: boolean;
        noShell?: boolean;
        exitValue?: unknown;
        kill?: () => void;
      };
      if (typeof process.init !== "function") {
        throw new Error("XPCOM process initialization is unavailable");
      }
      process.init(executable);
      process.startHidden = true;
      process.noShell = true;
      const runAsync =
        typeof process.runwAsync === "function"
          ? process.runwAsync.bind(process)
          : typeof process.runAsync === "function"
            ? process.runAsync.bind(process)
            : null;
      if (!runAsync) {
        throw new Error("XPCOM asynchronous execution is unavailable");
      }
      const completion = new Promise<unknown>((resolve, reject) => {
        try {
          runAsync(adapterRequest.args, adapterRequest.args.length, {
            observe: (_subject: unknown, topic: string) => {
              if (topic === "process-finished" || topic === "process-failed") {
                resolve(process.exitValue);
                return;
              }
              reject(new Error(`Unexpected XPCOM process topic: ${topic}`));
            },
          });
        } catch (error) {
          reject(error);
        }
      });
      return {
        readStdout: async () => "",
        readStderr: async () => "",
        wait: () => completion,
        exitCode: () => process.exitValue,
        terminate:
          typeof process.kill === "function"
            ? () => {
                process.kill?.();
              }
            : undefined,
      };
    },
  };
}

async function createNodeAdapter() {
  const runtime = globalThis as { process?: unknown };
  if (!runtime.process) {
    return null;
  }
  const childProcess = await dynamicImport("node:child_process").catch(
    () => null,
  );
  if (typeof childProcess?.spawn !== "function") {
    return null;
  }
  return {
    kind: "node",
    supportsHiddenExecution: true,
    async start(request) {
      const child = childProcess.spawn(request.command, request.args, {
        cwd: request.cwd,
        env: request.environment,
        windowsHide: request.hidden,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk: unknown) => {
        stdout += String(chunk || "");
      });
      child.stderr?.on("data", (chunk: unknown) => {
        stderr += String(chunk || "");
      });
      const completion = new Promise<unknown>((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code: unknown, signal: unknown) => {
          resolve({ exitCode: code, signal });
        });
      });
      return {
        readStdout: async () => {
          await completion.catch(() => undefined);
          return stdout;
        },
        readStderr: async () => {
          await completion.catch(() => undefined);
          return stderr;
        },
        wait: () => completion,
        terminate: () => {
          child.kill();
        },
      };
    },
  } satisfies OneShotSubprocessAdapter;
}

async function resolveProductionAdapters(request: OneShotSubprocessRequest) {
  const adapters: OneShotSubprocessAdapter[] = [];
  const xpcom = createWindowsXpcomAdapter(request);
  if (xpcom) {
    adapters.push(xpcom);
  }
  const mozilla = getMozillaSubprocessModule();
  if (mozilla) {
    const adapter = createMozillaAdapter(mozilla);
    if (adapter) {
      adapters.push(adapter);
    }
  }
  const zoteroInternal = getZoteroInternalSubprocess();
  if (zoteroInternal) {
    adapters.push(createZoteroInternalAdapter(zoteroInternal));
  }
  const node = await createNodeAdapter();
  if (node) {
    adapters.push(node);
  }
  return adapters;
}

function unavailableResult(hiddenRequested: boolean): OneShotSubprocessResult {
  return {
    outcome: "unavailable",
    adapter: null,
    available: false,
    stdout: "",
    stderr: "",
    exitCode: null,
    timedOut: false,
    hidden: { requested: hiddenRequested, applied: false },
    termination: {
      requested: false,
      supported: false,
      completed: false,
    },
  };
}

export async function executeOneShotSubprocess(
  request: OneShotSubprocessRequest,
  options: { adapter?: OneShotSubprocessAdapter | null } = {},
): Promise<OneShotSubprocessResult> {
  const command = normalizeString(request.command);
  if (!command) {
    throw new TypeError("A resolved subprocess command is required");
  }
  const hiddenRequested = request.hidden === true;
  const hasAdapterOverride = Object.prototype.hasOwnProperty.call(
    options,
    "adapter",
  );
  if (!hasAdapterOverride) {
    const adapters = await resolveProductionAdapters(request);
    if (adapters.length === 0) {
      return unavailableResult(hiddenRequested);
    }
    return executeOneShotSubprocess(request, { adapter: adapters[0] });
  }
  const adapter = options.adapter ?? null;
  if (!adapter) {
    return unavailableResult(hiddenRequested);
  }
  const hiddenApplied = hiddenRequested && adapter.supportsHiddenExecution;
  const timeoutMs = Math.max(1, Math.floor(request.timeoutMs ?? 30000));
  const terminationGraceMs = Math.max(
    1,
    Math.floor(request.terminationGraceMs ?? 500),
  );
  let execution: OneShotSubprocessExecution;
  try {
    execution = await adapter.start({
      command,
      args: (request.args || []).map(String),
      environment: request.environment,
      cwd: normalizeString(request.cwd) || undefined,
      hidden: hiddenApplied,
    });
  } catch (error) {
    return {
      outcome: "failed",
      adapter: adapter.kind,
      available: true,
      stdout: "",
      stderr: normalizeString(error instanceof Error ? error.message : error),
      exitCode: null,
      timedOut: false,
      hidden: { requested: hiddenRequested, applied: hiddenApplied },
      termination: {
        requested: false,
        supported: false,
        completed: false,
      },
    };
  }

  const stdoutPromise = (execution.readStdout?.() ?? Promise.resolve(""))
    .then((value) => String(value || ""))
    .catch(() => "");
  const stderrPromise = (execution.readStderr?.() ?? Promise.resolve(""))
    .then((value) => String(value || ""))
    .catch((error) =>
      normalizeString(error instanceof Error ? error.message : error),
    );
  const completionPromise = Promise.all([
    execution.wait(),
    stdoutPromise,
    stderrPromise,
  ]) as Promise<[unknown, string, string]>;
  let completion:
    | { completed: false }
    | { completed: true; value: [unknown, string, string] };
  try {
    completion = await settleWithin(completionPromise, timeoutMs);
  } catch (error) {
    const output = await settleWithin(
      Promise.all([stdoutPromise, stderrPromise]),
      terminationGraceMs,
    );
    const [stdout, stderr] = output.completed ? output.value : ["", ""];
    return {
      outcome: "failed",
      adapter: adapter.kind,
      available: true,
      stdout,
      stderr:
        stderr ||
        normalizeString(error instanceof Error ? error.message : error),
      exitCode: readExecutionExitCode(execution),
      timedOut: false,
      hidden: { requested: hiddenRequested, applied: hiddenApplied },
      termination: {
        requested: false,
        supported: typeof execution.terminate === "function",
        completed: false,
      },
    };
  }
  if (completion.completed) {
    const [waitResult, stdout, stderr] = completion.value;
    const exitCode =
      extractExitCode(waitResult) ?? readExecutionExitCode(execution) ?? 0;
    return {
      outcome: "exited",
      adapter: adapter.kind,
      available: true,
      stdout,
      stderr,
      exitCode,
      timedOut: false,
      hidden: { requested: hiddenRequested, applied: hiddenApplied },
      termination: {
        requested: false,
        supported: typeof execution.terminate === "function",
        completed: false,
      },
    };
  }

  const terminationSupported = typeof execution.terminate === "function";
  const termination = terminationSupported
    ? await settleWithin(
        Promise.resolve()
          .then(() => execution.terminate?.())
          .then(
            () => true,
            () => false,
          ),
        terminationGraceMs,
      )
    : { completed: false as const };
  const drained = await settleWithin(
    Promise.all([stdoutPromise, stderrPromise]),
    terminationGraceMs,
  );
  const [stdout, stderr] = drained.completed ? drained.value : ["", ""];
  return {
    outcome: "timed_out",
    adapter: adapter.kind,
    available: true,
    stdout,
    stderr,
    exitCode: null,
    timedOut: true,
    hidden: { requested: hiddenRequested, applied: hiddenApplied },
    termination: {
      requested: terminationSupported,
      supported: terminationSupported,
      completed:
        termination.completed &&
        ("value" in termination ? termination.value === true : false),
    },
  };
}

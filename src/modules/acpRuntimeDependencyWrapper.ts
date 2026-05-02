import type { BackendInstance } from "../backends/types";
import { buildAcpLaunchPlanForTests } from "./acpTransport";
import {
  resolveTrustedPathSearchResult,
  resolveWindowsCommandFromGlobalNpmRoot,
  resolveWindowsCommandFromNodeInstallRoot,
  resolveWindowsCommandFromPowerShell,
  resolveWindowsCommandFromUserLocalBin,
} from "./windowsCommandResolution";

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

export type AcpRuntimeDependencyPlan = {
  dependencies: string[];
  probeRequired: boolean;
  wrapperMode: AcpRuntimeDependencyWrapperMode;
  wrappedBackend: BackendInstance;
  diagnostic?: {
    level: "info" | "warning" | "error";
    code: string;
    message: string;
  };
};

export type AcpRuntimeDependencyWrapperMode = "disabled" | "probe-and-wrap";

export type AcpRuntimeDependencyProbe = (args: {
  dependencies: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}) => Promise<{ ok: boolean; summary?: string }>;

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

function getMozillaSubprocessModule() {
  const runtime = globalThis as {
    ChromeUtils?: {
      import?: (url: string) => { Subprocess?: unknown };
    };
  };
  if (typeof runtime.ChromeUtils?.import !== "function") {
    return null;
  }
  try {
    const imported = runtime.ChromeUtils.import(
      "resource://gre/modules/Subprocess.jsm",
    ) as { Subprocess?: unknown };
    return (imported?.Subprocess || null) as MozillaSubprocessModule | null;
  } catch {
    return null;
  }
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

export function resolveSkillRuntimeDependencies(runnerJson: unknown) {
  const runtime =
    runnerJson && typeof runnerJson === "object"
      ? (runnerJson as { runtime?: { dependencies?: unknown } }).runtime
      : null;
  if (!runtime || !Array.isArray(runtime.dependencies)) {
    return [] as string[];
  }
  return runtime.dependencies
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

export function wrapAcpBackendWithUv(args: {
  backend: BackendInstance;
  dependencies: string[];
  resolvedCommand?: string;
}): BackendInstance {
  const dependencies = args.dependencies.map(normalizeString).filter(Boolean);
  if (dependencies.length === 0) {
    return { ...args.backend };
  }
  const backendCommand =
    normalizeString(args.resolvedCommand) || normalizeString(args.backend.command);
  const uvArgs = ["run", "--isolated"];
  for (const dependency of dependencies) {
    uvArgs.push("--with", dependency);
  }
  uvArgs.push("--", backendCommand);
  uvArgs.push(...(args.backend.args || []));
  return {
    ...args.backend,
    command: "uv",
    args: uvArgs,
  };
}

function summarizeProbeText(value: unknown) {
  const compact = String(value || "")
    .replace(/\r/g, "\n")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  if (!compact) {
    return "uv dependency probe failed with empty output";
  }
  return compact.length > 300 ? `${compact.slice(0, 297)}...` : compact;
}

async function drainMozillaPipe(pipe: {
  readString?: () => Promise<string>;
} | null | undefined) {
  if (!pipe || typeof pipe.readString !== "function") {
    return "";
  }
  let combined = "";
  while (true) {
    const chunk = await pipe.readString();
    if (!chunk) {
      break;
    }
    combined += chunk;
  }
  return combined;
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

async function waitMozillaProcessExit(proc: {
  wait?: () => Promise<unknown>;
  exitCode?: unknown;
  exitValue?: unknown;
}) {
  if (typeof proc.wait === "function") {
    try {
      const waited = await proc.wait();
      const code = extractExitCode(waited);
      if (code !== null) {
        return code;
      }
    } catch {
      return 1;
    }
  }
  return extractExitCode(proc) ?? 0;
}

async function resolveMozillaProbeCommand(
  subprocess: MozillaSubprocessModule,
  commandRaw: string,
) {
  const command = normalizeString(commandRaw);
  if (!command) {
    throw new Error("ACP runtime dependency probe command is required");
  }
  if (isPathLikeCommand(command)) {
    return command;
  }
  const platform = detectWindowsPlatform() ? "win32" : undefined;
  const resolvedFromPathSearch = await resolveTrustedPathSearchResult({
    command,
    pathSearch: subprocess.pathSearch,
    platform,
  });
  if (resolvedFromPathSearch) {
    return resolvedFromPathSearch;
  }
  if (detectWindowsPlatform()) {
    const resolvedFromPowerShell =
      await resolveWindowsCommandFromPowerShell(command);
    if (resolvedFromPowerShell.length > 0) {
      return normalizeString(resolvedFromPowerShell[0]);
    }
    const resolvedFromUserLocalBin =
      await resolveWindowsCommandFromUserLocalBin(command);
    if (resolvedFromUserLocalBin.length > 0) {
      return normalizeString(resolvedFromUserLocalBin[0]);
    }
    const resolvedFromGlobalNpm =
      await resolveWindowsCommandFromGlobalNpmRoot(command);
    if (resolvedFromGlobalNpm.length > 0) {
      return normalizeString(resolvedFromGlobalNpm[0]);
    }
    const resolvedFromNodeInstall =
      await resolveWindowsCommandFromNodeInstallRoot(command);
    if (resolvedFromNodeInstall.length > 0) {
      return normalizeString(resolvedFromNodeInstall[0]);
    }
  }
  throw new Error(
    `Command "${command}" was not found in PATH for ACP runtime dependency probe`,
  );
}

async function resolveZoteroInternalUvCommand() {
  return resolveWindowsCommandForUvWrapper("uv");
}

async function resolveWindowsCommandForUvWrapper(commandRaw: string) {
  const command = normalizeString(commandRaw);
  if (!command || !detectWindowsPlatform() || isPathLikeCommand(command)) {
    return command;
  }
  const resolvedFromPowerShell =
    await resolveWindowsCommandFromPowerShell(command);
  if (resolvedFromPowerShell.length > 0) {
    return normalizeString(resolvedFromPowerShell[0]);
  }
  const resolvedFromUserLocalBin =
    await resolveWindowsCommandFromUserLocalBin(command);
  if (resolvedFromUserLocalBin.length > 0) {
    return normalizeString(resolvedFromUserLocalBin[0]);
  }
  const resolvedFromGlobalNpm =
    await resolveWindowsCommandFromGlobalNpmRoot(command);
  if (resolvedFromGlobalNpm.length > 0) {
    return normalizeString(resolvedFromGlobalNpm[0]);
  }
  const resolvedFromNodeInstall =
    await resolveWindowsCommandFromNodeInstallRoot(command);
  if (resolvedFromNodeInstall.length > 0) {
    return normalizeString(resolvedFromNodeInstall[0]);
  }
  return command;
}

async function runUvProbeWithMozillaSubprocess(args: {
  uvArgs: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  subprocess: MozillaSubprocessModule;
}): Promise<{ ok: boolean; summary?: string }> {
  if (typeof args.subprocess.call !== "function") {
    return {
      ok: false,
      summary: "Zotero Subprocess.call is unavailable for uv dependency probe",
    };
  }
  let proc: Awaited<ReturnType<NonNullable<MozillaSubprocessModule["call"]>>>;
  let commandLine = "uv " + args.uvArgs.join(" ");
  try {
    const resolvedUvCommand = await resolveMozillaProbeCommand(
      args.subprocess,
      "uv",
    );
    const launchPlan = buildAcpLaunchPlanForTests({
      command: "uv",
      resolvedCommand: resolvedUvCommand,
      args: args.uvArgs,
      comspec: normalizeString(args.env.ComSpec || args.env.COMSPEC),
    });
    commandLine = launchPlan.commandLine;
    proc = await args.subprocess.call({
      command: launchPlan.command,
      arguments: launchPlan.args,
      environment: {
        ...(launchPlan.environment || {}),
        ...args.env,
      },
      environmentAppend: true,
      workdir: args.cwd,
    });
  } catch (error) {
    return {
      ok: false,
      summary: summarizeProbeText(error instanceof Error ? error.message : error),
    };
  }
  let settled = false;
  return await new Promise((resolve) => {
    const finish = (result: { ok: boolean; summary?: string }) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      try {
        proc.kill?.(0);
      } catch {
        // ignore
      }
      finish({
        ok: false,
        summary: `uv dependency probe timed out after ${args.timeoutMs}ms`,
      });
    }, Math.max(1000, args.timeoutMs));
    void (async () => {
      const code = await waitMozillaProcessExit(proc);
      const output = await Promise.all([
        drainMozillaPipe(proc.stdout),
        drainMozillaPipe(proc.stderr),
      ]);
      if (code === 0) {
        finish({ ok: true });
        return;
      }
      finish({
        ok: false,
        summary: summarizeProbeText(
          `uv dependency probe exited ${code}: command=${commandLine}; stdout=${output[0]}; stderr=${output[1]}`,
        ),
      });
    })().catch((error) => {
      finish({
        ok: false,
        summary: summarizeProbeText(error instanceof Error ? error.message : error),
      });
    });
  });
}

async function runUvProbeWithNodeChildProcess(args: {
  uvArgs: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}): Promise<{ ok: boolean; summary?: string }> {
  const childProcess = await dynamicImport("node:child_process");
  return await new Promise((resolve) => {
    let settled = false;
    const child = childProcess.spawn("uv", args.uvArgs, {
      cwd: args.cwd,
      env: { ...(process.env as Record<string, string>), ...args.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: string[] = [];
    const finish = (result: { ok: boolean; summary?: string }) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // ignore
      }
      finish({
        ok: false,
        summary: `uv dependency probe timed out after ${args.timeoutMs}ms`,
      });
    }, Math.max(1000, args.timeoutMs));
    child.stdout?.on("data", (chunk: unknown) => chunks.push(String(chunk || "")));
    child.stderr?.on("data", (chunk: unknown) => chunks.push(String(chunk || "")));
    child.once("error", (error: unknown) => {
      finish({
        ok: false,
        summary: summarizeProbeText(error instanceof Error ? error.message : error),
      });
    });
    child.once("close", (code: number) => {
      if (code === 0) {
        finish({ ok: true });
        return;
      }
      finish({
        ok: false,
        summary: summarizeProbeText(
          `uv dependency probe exited ${code}: ${chunks.join(" ")}`,
        ),
      });
    });
  });
}

async function runUvProbeWithZoteroInternalSubprocess(args: {
  uvArgs: string[];
  subprocess: (command: string, args?: string[]) => Promise<string>;
}): Promise<{ ok: boolean; summary?: string }> {
  try {
    const command = await resolveZoteroInternalUvCommand();
    await args.subprocess(command, args.uvArgs);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      summary: summarizeProbeText(error instanceof Error ? error.message : error),
    };
  }
}

export async function defaultAcpRuntimeDependencyProbe(args: {
  dependencies: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}): Promise<{ ok: boolean; summary?: string }> {
  const uvArgs = ["run", "--isolated"];
  for (const dependency of args.dependencies) {
    uvArgs.push("--with", dependency);
  }
  uvArgs.push("--", "python", "--version");
  const zoteroSubprocess = getZoteroInternalSubprocess();
  if (zoteroSubprocess) {
    return runUvProbeWithZoteroInternalSubprocess({
      uvArgs,
      subprocess: zoteroSubprocess,
    });
  }
  const subprocess = getMozillaSubprocessModule();
  if (subprocess) {
    return runUvProbeWithMozillaSubprocess({
      uvArgs,
      cwd: args.cwd,
      env: args.env,
      timeoutMs: args.timeoutMs,
      subprocess,
    });
  }
  return runUvProbeWithNodeChildProcess({
    uvArgs,
    cwd: args.cwd,
    env: args.env,
    timeoutMs: args.timeoutMs,
  });
}

export async function buildAcpRuntimeDependencyPlan(args: {
  backend: BackendInstance;
  runnerJson: unknown;
  cwd: string;
  mode?: AcpRuntimeDependencyWrapperMode;
  probe?: AcpRuntimeDependencyProbe;
  timeoutMs?: number;
}): Promise<AcpRuntimeDependencyPlan> {
  const dependencies = resolveSkillRuntimeDependencies(args.runnerJson);
  const wrapperMode = args.mode || "disabled";
  if (dependencies.length === 0) {
    return {
      dependencies,
      probeRequired: false,
      wrapperMode,
      wrappedBackend: { ...args.backend },
    };
  }
  if (wrapperMode === "disabled") {
    return {
      dependencies,
      probeRequired: false,
      wrapperMode,
      wrappedBackend: { ...args.backend },
      diagnostic: {
        level: "warning",
        code: "runtime_dependencies_wrapper_disabled",
        message:
          "ACP SkillRunner-compatible uv dependency wrapper is disabled; launching the ACP backend command unchanged.",
      },
    };
  }
  const env = { ...(args.backend.env || {}) };
  const probe = args.probe || defaultAcpRuntimeDependencyProbe;
  const result = await probe({
    dependencies,
    cwd: args.cwd,
    env,
    timeoutMs: args.timeoutMs || 120000,
  });
  if (!result.ok) {
    return {
      dependencies,
      probeRequired: true,
      wrapperMode,
      wrappedBackend: { ...args.backend },
      diagnostic: {
        level: "error",
        code: "runtime_dependencies_injection_failed",
        message:
          result.summary ||
          `Failed to inject runtime.dependencies with uv: ${dependencies.join(", ")}`,
      },
    };
  }
  return {
    dependencies,
    probeRequired: true,
    wrapperMode,
    wrappedBackend: wrapAcpBackendWithUv({
      backend: args.backend,
      dependencies,
      resolvedCommand: await resolveWindowsCommandForUvWrapper(
        normalizeString(args.backend.command),
      ),
    }),
    diagnostic: {
      level: "info",
      code: "runtime_dependencies_injection_ready",
      message: `ACP workflow launch will use uv for ${dependencies.length} runtime dependencies`,
    },
  };
}

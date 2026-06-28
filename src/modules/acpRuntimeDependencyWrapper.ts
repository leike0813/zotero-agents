import type { BackendInstance } from "../backends/types";
import { getMozillaSubprocessModule as getCompatMozillaSubprocessModule } from "../utils/runtimeCompatibility";
import {
  buildRuntimeCommandLaunchPlan,
  getCachedRuntimeCommand,
  getPrimaryPythonCommand,
  getRuntimeCommandRegistrySnapshot,
  resolveRuntimeCommandForLaunch,
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
    details?: Record<string, unknown>;
  };
};

export type AcpRuntimeDependencyWrapperMode = "disabled" | "probe-and-wrap";

export type AcpRuntimeDependencyProbe = (args: {
  dependencies: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}) => Promise<{
  ok: boolean;
  summary?: string;
  readiness?:
    | "uv_dependency_environment_ready"
    | "uv_dependency_resolution_failed"
    | "system_python_dependencies_ready"
    | "system_python_dependencies_missing"
    | "runtime_dependency_strategy_unavailable";
  strategy?: "uv" | "system-python" | "unavailable";
  details?: Record<string, unknown>;
}>;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function getMozillaSubprocessModule() {
  return getCompatMozillaSubprocessModule() as MozillaSubprocessModule | null;
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
    normalizeString(args.resolvedCommand) ||
    normalizeString(args.backend.command);
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

async function runUvProbeWithMozillaSubprocess(args: {
  uvCommand: RuntimeCommandResolution;
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
  let commandLine =
    normalizeString(args.uvCommand.resolvedPath) + " " + args.uvArgs.join(" ");
  try {
    const launchPlan = buildRuntimeCommandLaunchPlan({
      command: "uv",
      resolvedCommand: args.uvCommand.resolvedPath,
      commandArgs: args.uvArgs,
      resolution: args.uvCommand,
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
      summary: summarizeProbeText(
        error instanceof Error ? error.message : error,
      ),
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
    const timer = setTimeout(
      () => {
        try {
          proc.kill?.(0);
        } catch {
          // ignore
        }
        finish({
          ok: false,
          summary: `uv dependency probe timed out after ${args.timeoutMs}ms`,
        });
      },
      Math.max(1000, args.timeoutMs),
    );
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
        summary: summarizeProbeText(
          error instanceof Error ? error.message : error,
        ),
      });
    });
  });
}

async function runUvProbeWithNodeChildProcess(args: {
  uvCommand: RuntimeCommandResolution;
  uvArgs: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}): Promise<{ ok: boolean; summary?: string }> {
  const childProcess = await dynamicImport("node:child_process");
  const launchPlan = buildRuntimeCommandLaunchPlan({
    command: "uv",
    resolvedCommand: args.uvCommand.resolvedPath,
    commandArgs: args.uvArgs,
    resolution: args.uvCommand,
  });
  return await new Promise((resolve) => {
    let settled = false;
    const child = childProcess.spawn(launchPlan.command, launchPlan.args, {
      cwd: args.cwd,
      env: {
        ...(process.env as Record<string, string>),
        ...(launchPlan.environment || {}),
        ...args.env,
      },
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
    const timer = setTimeout(
      () => {
        try {
          child.kill();
        } catch {
          // ignore
        }
        finish({
          ok: false,
          summary: `uv dependency probe timed out after ${args.timeoutMs}ms`,
        });
      },
      Math.max(1000, args.timeoutMs),
    );
    child.stdout?.on("data", (chunk: unknown) =>
      chunks.push(String(chunk || "")),
    );
    child.stderr?.on("data", (chunk: unknown) =>
      chunks.push(String(chunk || "")),
    );
    child.once("error", (error: unknown) => {
      finish({
        ok: false,
        summary: summarizeProbeText(
          error instanceof Error ? error.message : error,
        ),
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
  uvCommand: string;
  uvArgs: string[];
  subprocess: (command: string, args?: string[]) => Promise<string>;
}): Promise<{ ok: boolean; summary?: string }> {
  try {
    await args.subprocess(args.uvCommand, args.uvArgs);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      summary: summarizeProbeText(
        error instanceof Error ? error.message : error,
      ),
    };
  }
}

export async function defaultAcpRuntimeDependencyProbe(args: {
  dependencies: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}): ReturnType<AcpRuntimeDependencyProbe> {
  const uvCommand = getCachedRuntimeCommand("uv");
  if (uvCommand?.available && uvCommand.resolvedPath) {
    const result = await probeDependenciesWithUv({
      ...args,
      uvCommand,
    });
    return {
      ...result,
      readiness: result.ok
        ? "uv_dependency_environment_ready"
        : "uv_dependency_resolution_failed",
      strategy: "uv",
      details: {
        uv: uvCommand,
      },
    };
  }
  const pythonCommand = getPrimaryPythonCommand();
  if (pythonCommand?.available && pythonCommand.resolvedPath) {
    const result = await probeDependenciesWithSystemPython({
      ...args,
      pythonCommand,
    });
    return {
      ...result,
      readiness: result.ok
        ? "system_python_dependencies_ready"
        : "system_python_dependencies_missing",
      strategy: "system-python",
      details: {
        uv: uvCommand,
        python: pythonCommand,
      },
    };
  }
  return {
    ok: false,
    readiness: "runtime_dependency_strategy_unavailable",
    strategy: "unavailable",
    summary: buildRuntimeDependencyUnavailableMessage(args.dependencies),
    details: {
      uv: uvCommand,
      python: getRuntimeCommandRegistrySnapshot().primaryPython,
    },
  };
}

async function probeDependenciesWithUv(args: {
  dependencies: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  uvCommand: RuntimeCommandResolution;
}): Promise<{ ok: boolean; summary?: string }> {
  const uvArgs = ["run", "--isolated"];
  for (const dependency of args.dependencies) {
    uvArgs.push("--with", dependency);
  }
  uvArgs.push("--", "python", "--version");
  const uvCommand = normalizeString(args.uvCommand.resolvedPath);
  if (!uvCommand) {
    return {
      ok: false,
      summary: "uv command is unavailable for ACP runtime dependency probe",
    };
  }
  const zoteroSubprocess = getZoteroInternalSubprocess();
  if (zoteroSubprocess) {
    return runUvProbeWithZoteroInternalSubprocess({
      uvCommand,
      uvArgs,
      subprocess: zoteroSubprocess,
    });
  }
  const subprocess = getMozillaSubprocessModule();
  if (subprocess) {
    return runUvProbeWithMozillaSubprocess({
      uvCommand: args.uvCommand,
      uvArgs,
      cwd: args.cwd,
      env: args.env,
      timeoutMs: args.timeoutMs,
      subprocess,
    });
  }
  return runUvProbeWithNodeChildProcess({
    uvCommand: args.uvCommand,
    uvArgs,
    cwd: args.cwd,
    env: args.env,
    timeoutMs: args.timeoutMs,
  });
}

function buildPythonDependencyProbeScript(dependencies: string[]) {
  return [
    "import importlib.metadata as m",
    "import importlib.util as u",
    `deps=${JSON.stringify(dependencies)}`,
    "missing=[]",
    "try:",
    "    from packaging.requirements import Requirement",
    "except Exception:",
    "    Requirement=None",
    "def fallback_name(raw):",
    "    import re",
    "    match=re.match(r'^([A-Za-z0-9_.-]+)', raw.strip())",
    "    return match.group(1) if match else ''",
    "for raw in deps:",
    "    dep=raw.strip()",
    "    name=fallback_name(dep)",
    "    spec=None",
    "    if Requirement is not None:",
    "        try:",
    "            req=Requirement(dep)",
    "            name=req.name",
    "            spec=req.specifier",
    "        except Exception:",
    "            missing.append(dep)",
    "            continue",
    "    elif any(token in dep for token in ['<','>','=','!','~','[',';']):",
    "        missing.append(dep+' (packaging is required to verify this requirement)')",
    "        continue",
    "    ok=True",
    "    try:",
    "        version=m.version(name)",
    "        if spec is not None and str(spec) and version not in spec:",
    "            ok=False",
    "    except Exception:",
    "        ok=u.find_spec(name.replace('-', '_')) is not None",
    "    if not ok:",
    "        missing.append(dep)",
    "if missing:",
    "    raise SystemExit('missing runtime dependencies: '+', '.join(missing))",
  ].join("\n");
}

async function runPythonProbeWithMozillaSubprocess(args: {
  pythonCommand: RuntimeCommandResolution;
  pythonArgs: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  subprocess: MozillaSubprocessModule;
}): Promise<{ ok: boolean; summary?: string }> {
  if (typeof args.subprocess.call !== "function") {
    return {
      ok: false,
      summary:
        "Zotero Subprocess.call is unavailable for Python dependency probe",
    };
  }
  let proc: Awaited<ReturnType<NonNullable<MozillaSubprocessModule["call"]>>>;
  let commandLine =
    normalizeString(args.pythonCommand.resolvedPath) +
    " " +
    args.pythonArgs.join(" ");
  try {
    const launchPlan = buildRuntimeCommandLaunchPlan({
      command: "python",
      resolvedCommand: args.pythonCommand.resolvedPath,
      commandArgs: args.pythonArgs,
      resolution: args.pythonCommand,
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
      summary: summarizeProbeText(
        error instanceof Error ? error.message : error,
      ),
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
    const timer = setTimeout(
      () => {
        try {
          proc.kill?.(0);
        } catch {
          // ignore
        }
        finish({
          ok: false,
          summary: `Python dependency probe timed out after ${args.timeoutMs}ms`,
        });
      },
      Math.max(1000, args.timeoutMs),
    );
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
          `Python dependency probe exited ${code}: command=${commandLine}; stdout=${output[0]}; stderr=${output[1]}`,
        ),
      });
    })().catch((error) => {
      finish({
        ok: false,
        summary: summarizeProbeText(
          error instanceof Error ? error.message : error,
        ),
      });
    });
  });
}

async function runPythonProbeWithNodeChildProcess(args: {
  pythonCommand: RuntimeCommandResolution;
  pythonArgs: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}): Promise<{ ok: boolean; summary?: string }> {
  const childProcess = await dynamicImport("node:child_process");
  const launchPlan = buildRuntimeCommandLaunchPlan({
    command: "python",
    resolvedCommand: args.pythonCommand.resolvedPath,
    commandArgs: args.pythonArgs,
    resolution: args.pythonCommand,
  });
  return await new Promise((resolve) => {
    let settled = false;
    const child = childProcess.spawn(launchPlan.command, launchPlan.args, {
      cwd: args.cwd,
      env: {
        ...(process.env as Record<string, string>),
        ...(launchPlan.environment || {}),
        ...args.env,
      },
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
    const timer = setTimeout(
      () => {
        try {
          child.kill();
        } catch {
          // ignore
        }
        finish({
          ok: false,
          summary: `Python dependency probe timed out after ${args.timeoutMs}ms`,
        });
      },
      Math.max(1000, args.timeoutMs),
    );
    child.stdout?.on("data", (chunk: unknown) =>
      chunks.push(String(chunk || "")),
    );
    child.stderr?.on("data", (chunk: unknown) =>
      chunks.push(String(chunk || "")),
    );
    child.once("error", (error: unknown) => {
      finish({
        ok: false,
        summary: summarizeProbeText(
          error instanceof Error ? error.message : error,
        ),
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
          `Python dependency probe exited ${code}: ${chunks.join(" ")}`,
        ),
      });
    });
  });
}

async function probeDependenciesWithSystemPython(args: {
  dependencies: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  pythonCommand: RuntimeCommandResolution;
}): Promise<{ ok: boolean; summary?: string }> {
  const pythonCommand = normalizeString(args.pythonCommand.resolvedPath);
  if (!pythonCommand) {
    return {
      ok: false,
      summary: "Python command is unavailable for runtime dependency probe",
    };
  }
  const pythonArgs = [
    "-c",
    buildPythonDependencyProbeScript(args.dependencies),
  ];
  const zoteroSubprocess = getZoteroInternalSubprocess();
  if (zoteroSubprocess) {
    try {
      await zoteroSubprocess(pythonCommand, pythonArgs);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        summary: summarizeProbeText(
          error instanceof Error ? error.message : error,
        ),
      };
    }
  }
  const subprocess = getMozillaSubprocessModule();
  if (subprocess) {
    return runPythonProbeWithMozillaSubprocess({
      pythonCommand: args.pythonCommand,
      pythonArgs,
      cwd: args.cwd,
      env: args.env,
      timeoutMs: args.timeoutMs,
      subprocess,
    });
  }
  return runPythonProbeWithNodeChildProcess({
    pythonCommand: args.pythonCommand,
    pythonArgs,
    cwd: args.cwd,
    env: args.env,
    timeoutMs: args.timeoutMs,
  });
}

function buildRuntimeDependencyUnavailableMessage(dependencies: string[]) {
  return [
    `Runtime dependencies are required but no supported dependency strategy is available: ${dependencies.join(", ")}`,
    "Install uv or install the dependencies into the detected Python environment.",
    'Windows uv install: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
  ].join(" ");
}

function buildRuntimeDependencyFailureMessage(args: {
  dependencies: string[];
  result: Awaited<ReturnType<AcpRuntimeDependencyProbe>>;
}) {
  if (args.result.summary) {
    return args.result.summary;
  }
  if (args.result.readiness === "uv_dependency_resolution_failed") {
    return `uv could not prepare runtime.dependencies: ${args.dependencies.join(", ")}`;
  }
  if (args.result.readiness === "system_python_dependencies_missing") {
    return `The detected Python environment is missing runtime.dependencies: ${args.dependencies.join(", ")}`;
  }
  return buildRuntimeDependencyUnavailableMessage(args.dependencies);
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
        message: buildRuntimeDependencyFailureMessage({
          dependencies,
          result,
        }),
        details: {
          readiness: result.readiness,
          strategy: result.strategy,
          ...(result.details || {}),
        },
      },
    };
  }
  if (result.strategy === "system-python") {
    return {
      dependencies,
      probeRequired: true,
      wrapperMode,
      wrappedBackend: { ...args.backend },
      diagnostic: {
        level: "info",
        code: "runtime_dependencies_system_python_ready",
        message: `ACP workflow launch will use the configured backend; detected Python already provides ${dependencies.length} runtime dependencies`,
        details: {
          readiness: result.readiness || "system_python_dependencies_ready",
          strategy: "system-python",
          ...(result.details || {}),
        },
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
      resolvedCommand: await resolveRuntimeCommandForLaunch(
        normalizeString(args.backend.command),
      ),
    }),
    diagnostic: {
      level: "info",
      code: "runtime_dependencies_injection_ready",
      message: `ACP workflow launch will use uv for ${dependencies.length} runtime dependencies`,
      details: {
        readiness: result.readiness || "uv_dependency_environment_ready",
        strategy: "uv",
        ...(result.details || {}),
      },
    },
  };
}

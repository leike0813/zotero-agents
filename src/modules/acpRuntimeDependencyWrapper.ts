import type { BackendInstance } from "../backends/types";
import { resolveAcpAgentFamily } from "./acpAgentFamilyResolver";
import {
  buildRuntimeCommandNestedArgs,
  buildRuntimeCommandLaunchPlan,
  getCachedRuntimeCommand,
  getPrimaryPythonCommand,
  getRuntimeCommandRegistrySnapshot,
  resolveRuntimeCommandForLaunch,
  type RuntimeCommandResolution,
} from "../platform/command";
import { buildSubprocessEnvironment } from "../platform/env";
import { executeOneShotSubprocess } from "../platform/subprocess";

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
  const backendLaunchArgs = buildRuntimeCommandNestedArgs({
    command: normalizeString(args.backend.command),
    resolvedCommand: args.resolvedCommand,
    commandArgs: args.backend.args || [],
  });
  const uvArgs = ["run", "--isolated"];
  for (const dependency of dependencies) {
    uvArgs.push("--with", dependency);
  }
  uvArgs.push("--", ...backendLaunchArgs);
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

async function runDependencyProbeCommand(args: {
  label: "uv" | "Python";
  commandName: "uv" | "python";
  resolution: RuntimeCommandResolution;
  commandArgs: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}): Promise<{ ok: boolean; summary?: string }> {
  const launchPlan = buildRuntimeCommandLaunchPlan({
    command: args.commandName,
    resolvedCommand: args.resolution.resolvedPath,
    commandArgs: args.commandArgs,
    resolution: args.resolution,
  });
  const result = await executeOneShotSubprocess({
    command: launchPlan.command,
    args: launchPlan.args,
    cwd: args.cwd,
    environment: buildSubprocessEnvironment({
      ...(launchPlan.environment || {}),
      ...args.env,
    }),
    timeoutMs: Math.max(1000, args.timeoutMs),
    hidden: true,
  });
  if (result.outcome === "exited" && result.exitCode === 0) {
    return { ok: true };
  }
  if (result.outcome === "timed_out") {
    return {
      ok: false,
      summary: `${args.label} dependency probe timed out after ${args.timeoutMs}ms`,
    };
  }
  if (result.outcome === "unavailable") {
    return {
      ok: false,
      summary: `No supported subprocess adapter is available for ${args.label} dependency probe`,
    };
  }
  return {
    ok: false,
    summary: summarizeProbeText(
      `${args.label} dependency probe exited ${result.exitCode ?? "unknown"}: command=${launchPlan.commandLine}; stdout=${result.stdout}; stderr=${result.stderr}`,
    ),
  };
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
  return runDependencyProbeCommand({
    label: "uv",
    commandName: "uv",
    resolution: args.uvCommand,
    commandArgs: uvArgs,
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
  return runDependencyProbeCommand({
    label: "Python",
    commandName: "python",
    resolution: args.pythonCommand,
    commandArgs: pythonArgs,
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
  const agentFamily = resolveAcpAgentFamily(args.backend);
  if (agentFamily === "hermes") {
    return {
      dependencies,
      probeRequired: true,
      wrapperMode,
      wrappedBackend: { ...args.backend },
      diagnostic: {
        level: "info",
        code: "runtime_dependencies_backend_wrapper_bypassed",
        message:
          "ACP workflow launch will use the configured Hermes backend command; uv backend wrapping is bypassed because Hermes owns its Python runtime",
        details: {
          readiness: result.readiness || "uv_dependency_environment_ready",
          strategy: result.strategy || "uv",
          agentFamily,
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

import type { BackendInstance } from "../backends/types";
import {
  ACP_BACKEND_TYPE,
  ACP_OPENCODE_ARGS,
  ACP_OPENCODE_BACKEND_ID,
  ACP_OPENCODE_COMMAND,
  ACP_OPENCODE_DISPLAY_NAME,
} from "../config/defaults";
import { joinPath } from "../utils/path";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
} from "./runtimePersistence";

export type AcpBackendPresetId =
  | "opencode"
  | "codex"
  | "claude-code"
  | "gemini-cli"
  | "hermes"
  | "qwen-code"
  | "github-copilot"
  | "qoder-cli"
  | "cursor-agent-acp"
  | "deepagents"
  | "auggie"
  | "kilo"
  | "cline"
  | "codebuddy"
  | "grok";

export type AcpBackendPresetOptions = {
  useNpx?: boolean;
  isolated?: boolean;
};

export type AcpBackendPresetIsolation = {
  envKey?: string;
  args?: Array<{
    flag: string;
    pathSuffix?: string;
  }>;
};

type AcpBackendPresetAgentFamily = NonNullable<
  NonNullable<BackendInstance["acp"]>["agentFamily"]
>;

export type AcpBackendPreset = {
  id: AcpBackendPresetId;
  displayName: string;
  bareCommand: string;
  bareArgs: string[];
  npxPackage?: string;
  npxArgs?: string[];
  defaultUseNpx: boolean;
  supportsNpx: boolean;
  agentFamily: AcpBackendPresetAgentFamily;
  builtIn?: boolean;
  isolation?: AcpBackendPresetIsolation;
};

const ACP_ISOLATED_ENV_ROOT = "acp-backend-environments";

export const ACP_BACKEND_PRESETS: readonly AcpBackendPreset[] = [
  {
    id: "opencode",
    displayName: ACP_OPENCODE_DISPLAY_NAME,
    bareCommand: ACP_OPENCODE_COMMAND,
    bareArgs: [...ACP_OPENCODE_ARGS],
    npxPackage: "opencode-ai@latest",
    npxArgs: ["acp"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "opencode",
    builtIn: true,
    isolation: {
      envKey: "OPENCODE_CONFIG_DIR",
    },
  },
  {
    id: "codex",
    displayName: "Codex ACP",
    bareCommand: "codex-acp",
    bareArgs: [],
    npxPackage: "@agentclientprotocol/codex-acp@latest",
    npxArgs: [],
    defaultUseNpx: true,
    supportsNpx: true,
    agentFamily: "codex",
    isolation: {
      envKey: "CODEX_HOME",
    },
  },
  {
    id: "claude-code",
    displayName: "Claude Code ACP",
    bareCommand: "claude-agent-acp",
    bareArgs: [],
    npxPackage: "@agentclientprotocol/claude-agent-acp@latest",
    npxArgs: [],
    defaultUseNpx: true,
    supportsNpx: true,
    agentFamily: "claude-code",
    isolation: {
      envKey: "CLAUDE_CONFIG_DIR",
    },
  },
  {
    id: "gemini-cli",
    displayName: "Gemini CLI ACP",
    bareCommand: "gemini",
    bareArgs: ["--experimental-acp"],
    npxPackage: "@google/gemini-cli@latest",
    npxArgs: ["--experimental-acp"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "gemini-cli",
    isolation: {
      envKey: "GEMINI_CLI_HOME",
    },
  },
  {
    id: "hermes",
    displayName: "Hermes ACP",
    bareCommand: "hermes",
    bareArgs: ["acp"],
    defaultUseNpx: false,
    supportsNpx: false,
    agentFamily: "hermes",
    isolation: {
      envKey: "HERMES_HOME",
    },
  },
  {
    id: "qwen-code",
    displayName: "Qwen Code ACP",
    bareCommand: "qwen",
    bareArgs: ["--acp", "--experimental-skills"],
    npxPackage: "@qwen-code/qwen-code@latest",
    npxArgs: ["--acp", "--experimental-skills"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "qwen-code",
  },
  {
    id: "github-copilot",
    displayName: "GitHub Copilot ACP",
    bareCommand: "copilot",
    bareArgs: ["--acp", "--stdio"],
    npxPackage: "@github/copilot@latest",
    npxArgs: ["--acp", "--stdio"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "unknown",
  },
  {
    id: "qoder-cli",
    displayName: "Qoder CLI ACP",
    bareCommand: "qodercli",
    bareArgs: ["--acp"],
    npxPackage: "@qoder-ai/qodercli@latest",
    npxArgs: ["--acp"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "unknown",
    isolation: {
      envKey: "QODER_CONFIG_DIR",
    },
  },
  {
    id: "cursor-agent-acp",
    displayName: "Cursor Agent ACP",
    bareCommand: "cursor-agent-acp",
    bareArgs: [],
    npxPackage: "@blowmage/cursor-agent-acp@latest",
    npxArgs: [],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "unknown",
    isolation: {
      args: [{ flag: "--session-dir" }],
    },
  },
  {
    id: "deepagents",
    displayName: "DeepAgents ACP",
    bareCommand: "deepagents-acp",
    bareArgs: [],
    npxPackage: "deepagents-acp@latest",
    npxArgs: [],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "unknown",
  },
  {
    id: "auggie",
    displayName: "Auggie ACP",
    bareCommand: "auggie",
    bareArgs: ["--acp"],
    npxPackage: "@augmentcode/auggie@latest",
    npxArgs: ["--acp"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "unknown",
  },
  {
    id: "kilo",
    displayName: "Kilo ACP",
    bareCommand: "kilo",
    bareArgs: ["acp"],
    defaultUseNpx: false,
    supportsNpx: false,
    agentFamily: "unknown",
  },
  {
    id: "cline",
    displayName: "Cline ACP",
    bareCommand: "cline",
    bareArgs: ["--acp"],
    npxPackage: "cline@latest",
    npxArgs: ["--acp"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "unknown",
  },
  {
    id: "codebuddy",
    displayName: "CodeBuddy ACP",
    bareCommand: "codebuddy",
    bareArgs: ["--acp"],
    npxPackage: "@tencent-ai/codebuddy-code@latest",
    npxArgs: ["--acp"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "unknown",
  },
  {
    id: "grok",
    displayName: "Grok ACP",
    bareCommand: "grok",
    bareArgs: ["agent", "stdio"],
    npxPackage: "@xai-official/grok@latest",
    npxArgs: ["agent", "stdio"],
    defaultUseNpx: false,
    supportsNpx: true,
    agentFamily: "unknown",
  },
];

function hasIsolationRule(preset: AcpBackendPreset) {
  return (
    typeof preset.isolation?.envKey === "string" ||
    (Array.isArray(preset.isolation?.args) && preset.isolation.args.length > 0)
  );
}

function normalizePresetOptions(
  preset: AcpBackendPreset,
  options: AcpBackendPresetOptions = {},
) {
  const useNpx =
    options.useNpx === undefined
      ? preset.defaultUseNpx
      : options.useNpx === true;
  const isolated = options.isolated === true && hasIsolationRule(preset);
  return {
    useNpx: useNpx && preset.supportsNpx,
    isolated,
  };
}

export function listAcpBackendPresets() {
  return [...ACP_BACKEND_PRESETS];
}

export function findAcpBackendPreset(id: string) {
  const normalized = String(id || "").trim();
  return ACP_BACKEND_PRESETS.find((preset) => preset.id === normalized);
}

export function buildAcpBackendPresetProfileId(
  presetOrId: AcpBackendPreset | string,
  options: AcpBackendPresetOptions = {},
) {
  const preset =
    typeof presetOrId === "string"
      ? findAcpBackendPreset(presetOrId)
      : presetOrId;
  if (!preset) {
    throw new Error(`Unknown ACP backend preset: ${String(presetOrId)}`);
  }
  const normalized = normalizePresetOptions(preset, options);
  const suffixes = [
    normalized.useNpx ? "npx" : "",
    normalized.isolated ? "isolated" : "",
  ].filter(Boolean);
  return `acp-${preset.id}${suffixes.length > 0 ? `-${suffixes.join("-")}` : ""}`;
}

export function buildAcpBackendPresetDisplayName(
  presetOrId: AcpBackendPreset | string,
  options: AcpBackendPresetOptions = {},
) {
  const preset =
    typeof presetOrId === "string"
      ? findAcpBackendPreset(presetOrId)
      : presetOrId;
  if (!preset) {
    throw new Error(`Unknown ACP backend preset: ${String(presetOrId)}`);
  }
  const normalized = normalizePresetOptions(preset, options);
  let displayName = preset.displayName;
  if (normalized.useNpx) {
    displayName += " (npm)";
  }
  if (normalized.isolated) {
    displayName += normalized.useNpx ? "(Isolated)" : " (Isolated)";
  }
  return displayName;
}

export function getAcpBackendIsolatedEnvironmentPath(backendId: string) {
  return joinPath(getAcpBackendIsolatedEnvironmentRoot(), backendId);
}

export function getAcpBackendIsolatedEnvironmentRoot() {
  return joinPath(getRuntimePersistencePaths().dataDir, ACP_ISOLATED_ENV_ROOT);
}

function buildAcpBackendPresetIsolationEnv(
  preset: AcpBackendPreset,
  backendId: string,
  isolated: boolean,
) {
  if (!isolated || !preset.isolation?.envKey) {
    return {};
  }
  return {
    [preset.isolation.envKey]: getAcpBackendIsolatedEnvironmentPath(backendId),
  };
}

function buildAcpBackendPresetIsolationArgs(
  preset: AcpBackendPreset,
  backendId: string,
  isolated: boolean,
) {
  if (!isolated || !Array.isArray(preset.isolation?.args)) {
    return [];
  }
  const root = getAcpBackendIsolatedEnvironmentPath(backendId);
  return preset.isolation.args.flatMap((entry) => {
    const flag = String(entry.flag || "").trim();
    if (!flag) {
      return [];
    }
    const path = entry.pathSuffix ? joinPath(root, entry.pathSuffix) : root;
    return [flag, path];
  });
}

function buildAcpBackendPresetNpxArgs(
  preset: AcpBackendPreset,
  isolationArgs: string[],
) {
  const rest = [
    String(preset.npxPackage || ""),
    ...(preset.npxArgs || []),
    ...isolationArgs,
  ].filter(Boolean);
  return rest.some((entry) => entry === "-y" || entry === "--yes")
    ? rest
    : ["-y", ...rest];
}

export function createAcpBackendFromPresetOptions(
  presetOrId: AcpBackendPreset | string,
  options: AcpBackendPresetOptions = {},
): BackendInstance {
  const preset =
    typeof presetOrId === "string"
      ? findAcpBackendPreset(presetOrId)
      : presetOrId;
  if (!preset) {
    throw new Error(`Unknown ACP backend preset: ${String(presetOrId)}`);
  }
  const normalized = normalizePresetOptions(preset, options);
  const id = buildAcpBackendPresetProfileId(preset, normalized);
  const env = buildAcpBackendPresetIsolationEnv(
    preset,
    id,
    normalized.isolated,
  );
  const isolationArgs = buildAcpBackendPresetIsolationArgs(
    preset,
    id,
    normalized.isolated,
  );
  const args = normalized.useNpx
    ? buildAcpBackendPresetNpxArgs(preset, isolationArgs)
    : [...preset.bareArgs, ...isolationArgs];
  return {
    id,
    displayName: buildAcpBackendPresetDisplayName(preset, normalized),
    type: ACP_BACKEND_TYPE,
    baseUrl: `local://${id}`,
    command: normalized.useNpx ? "npx" : preset.bareCommand,
    args,
    auth: {
      kind: "none",
    },
    ...(Object.keys(env).length > 0 ? { env } : {}),
    acp: {
      agentFamily: preset.agentFamily,
    },
  };
}

export function createAcpBackendFromPreset(
  presetOrId: AcpBackendPreset | string,
): BackendInstance {
  return createAcpBackendFromPresetOptions(presetOrId);
}

export async function ensureManagedAcpBackendEnvironmentDirectories(
  backends: BackendInstance[],
) {
  for (const backend of backends) {
    const preset = ACP_BACKEND_PRESETS.find(
      (entry) =>
        hasIsolationRule(entry) && backend.id.startsWith(`acp-${entry.id}`),
    );
    if (!preset) {
      continue;
    }
    const expectedPath = getAcpBackendIsolatedEnvironmentPath(backend.id);
    const envKey = preset.isolation?.envKey;
    const hasExpectedEnv = !!envKey && backend.env?.[envKey] === expectedPath;
    const hasExpectedArg = (backend.args || []).includes(expectedPath);
    if (hasExpectedEnv || hasExpectedArg) {
      await ensureRuntimeDirectory(expectedPath);
    }
  }
}

export function listBuiltinAcpBackends() {
  return ACP_BACKEND_PRESETS.filter((preset) => preset.builtIn).map((preset) =>
    createAcpBackendFromPresetOptions(preset, {
      useNpx: false,
      isolated: false,
    }),
  );
}

export const acpBackendPresetInternalsForTests = {
  normalizePresetOptions,
};

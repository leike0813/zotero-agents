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
  | "qwen-code";

export type AcpBackendPresetOptions = {
  useNpx?: boolean;
  isolated?: boolean;
};

export type AcpBackendPresetIsolation = {
  envKey: string;
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
      envKey: "OPENCODE_CONFIG",
    },
  },
  {
    id: "codex",
    displayName: "Codex ACP",
    bareCommand: "codex-acp",
    bareArgs: [],
    npxPackage: "@zed-industries/codex-acp@latest",
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
    npxPackage: "hermes@latest",
    npxArgs: ["acp"],
    defaultUseNpx: false,
    supportsNpx: true,
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
];

function normalizePresetOptions(
  preset: AcpBackendPreset,
  options: AcpBackendPresetOptions = {},
) {
  const useNpx =
    options.useNpx === undefined
      ? preset.defaultUseNpx
      : options.useNpx === true;
  const isolated =
    options.isolated === true && typeof preset.isolation?.envKey === "string";
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

export function getAcpBackendIsolatedEnvironmentPath(backendId: string) {
  return joinPath(getAcpBackendIsolatedEnvironmentRoot(), backendId);
}

export function getAcpBackendIsolatedEnvironmentRoot() {
  return joinPath(getRuntimePersistencePaths().dataDir, ACP_ISOLATED_ENV_ROOT);
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
  const env =
    normalized.isolated && preset.isolation
      ? {
          [preset.isolation.envKey]: getAcpBackendIsolatedEnvironmentPath(id),
        }
      : {};
  return {
    id,
    displayName: preset.displayName,
    type: ACP_BACKEND_TYPE,
    baseUrl: `local://${id}`,
    command: normalized.useNpx ? "npx" : preset.bareCommand,
    args: normalized.useNpx
      ? [String(preset.npxPackage || ""), ...(preset.npxArgs || [])].filter(
          Boolean,
        )
      : [...preset.bareArgs],
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
        entry.isolation?.envKey && backend.id.startsWith(`acp-${entry.id}`),
    );
    const envKey = preset?.isolation?.envKey;
    if (!envKey) {
      continue;
    }
    const expectedPath = getAcpBackendIsolatedEnvironmentPath(backend.id);
    if (backend.env?.[envKey] === expectedPath) {
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

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
  | "codex-isolated"
  | "claude-code"
  | "claude-code-isolated"
  | "gemini-cli"
  | "gemini-cli-isolated"
  | "hermes"
  | "hermes-isolated"
  | "qwen-code";

export type AcpBackendPreset = {
  id: AcpBackendPresetId;
  backendId: string;
  displayName: string;
  command: string;
  args: string[];
  agentFamily: NonNullable<BackendInstance["acp"]>["agentFamily"];
  builtIn?: boolean;
};

type AcpBackendIsolationEnvSpec = {
  backendId: string;
  envKey: string;
};

const ACP_ISOLATED_ENV_ROOT = "acp-backend-environments";

const ACP_ISOLATED_ENV_BY_BACKEND_ID: Record<
  string,
  AcpBackendIsolationEnvSpec
> = {
  "acp-codex-isolated": {
    backendId: "acp-codex-isolated",
    envKey: "CODEX_HOME",
  },
  "acp-claude-code-isolated": {
    backendId: "acp-claude-code-isolated",
    envKey: "CLAUDE_CONFIG_DIR",
  },
  "acp-gemini-cli-isolated": {
    backendId: "acp-gemini-cli-isolated",
    envKey: "GEMINI_CLI_HOME",
  },
  "acp-hermes-isolated": {
    backendId: "acp-hermes-isolated",
    envKey: "HERMES_HOME",
  },
};

export const ACP_BACKEND_PRESETS: readonly AcpBackendPreset[] = [
  {
    id: "opencode",
    backendId: ACP_OPENCODE_BACKEND_ID,
    displayName: ACP_OPENCODE_DISPLAY_NAME,
    command: ACP_OPENCODE_COMMAND,
    args: [...ACP_OPENCODE_ARGS],
    agentFamily: "opencode",
    builtIn: true,
  },
  {
    id: "codex",
    backendId: "acp-codex",
    displayName: "Codex ACP",
    command: "npx",
    args: ["@zed-industries/codex-acp@latest"],
    agentFamily: "codex",
  },
  {
    id: "codex-isolated",
    backendId: "acp-codex-isolated",
    displayName: "Codex ACP (Isolated Environment)",
    command: "npx",
    args: ["@zed-industries/codex-acp@latest"],
    agentFamily: "codex",
  },
  {
    id: "claude-code",
    backendId: "acp-claude-code",
    displayName: "Claude Code ACP",
    command: "npx",
    args: ["@agentclientprotocol/claude-agent-acp@latest"],
    agentFamily: "claude-code",
  },
  {
    id: "claude-code-isolated",
    backendId: "acp-claude-code-isolated",
    displayName: "Claude Code ACP (Isolated Environment)",
    command: "npx",
    args: ["@agentclientprotocol/claude-agent-acp@latest"],
    agentFamily: "claude-code",
  },
  {
    id: "gemini-cli",
    backendId: "acp-gemini-cli",
    displayName: "Gemini CLI ACP",
    command: "npx",
    args: ["@google/gemini-cli@latest", "--experimental-acp"],
    agentFamily: "gemini-cli",
  },
  {
    id: "gemini-cli-isolated",
    backendId: "acp-gemini-cli-isolated",
    displayName: "Gemini CLI ACP (Isolated Environment)",
    command: "npx",
    args: ["@google/gemini-cli@latest", "--experimental-acp"],
    agentFamily: "gemini-cli",
  },
  {
    id: "hermes",
    backendId: "acp-hermes",
    displayName: "Hermes ACP",
    command: "hermes",
    args: ["acp"],
    agentFamily: "hermes",
  },
  {
    id: "hermes-isolated",
    backendId: "acp-hermes-isolated",
    displayName: "Hermes ACP (Isolated Environment)",
    command: "hermes",
    args: ["acp"],
    agentFamily: "hermes",
  },
  {
    id: "qwen-code",
    backendId: "acp-qwen-code",
    displayName: "Qwen Code ACP",
    command: "npx",
    args: ["@qwen-code/qwen-code@latest", "--acp", "--experimental-skills"],
    agentFamily: "qwen-code",
  },
];

export function listAcpBackendPresets() {
  return [...ACP_BACKEND_PRESETS];
}

export function findAcpBackendPreset(id: string) {
  const normalized = String(id || "").trim();
  return ACP_BACKEND_PRESETS.find((preset) => preset.id === normalized);
}

export function getAcpBackendIsolatedEnvironmentPath(backendId: string) {
  return joinPath(
    getRuntimePersistencePaths().dataDir,
    ACP_ISOLATED_ENV_ROOT,
    backendId,
  );
}

function getAcpBackendPresetEnv(preset: AcpBackendPreset) {
  const spec = ACP_ISOLATED_ENV_BY_BACKEND_ID[preset.backendId];
  if (!spec) {
    return {};
  }
  return {
    [spec.envKey]: getAcpBackendIsolatedEnvironmentPath(preset.backendId),
  };
}

export function createAcpBackendFromPreset(
  presetOrId: AcpBackendPreset | AcpBackendPresetId,
): BackendInstance {
  const preset =
    typeof presetOrId === "string"
      ? findAcpBackendPreset(presetOrId)
      : presetOrId;
  if (!preset) {
    throw new Error(`Unknown ACP backend preset: ${String(presetOrId)}`);
  }
  const env = getAcpBackendPresetEnv(preset);
  return {
    id: preset.backendId,
    displayName: preset.displayName,
    type: ACP_BACKEND_TYPE,
    baseUrl: `local://${preset.backendId}`,
    command: preset.command,
    args: [...preset.args],
    auth: {
      kind: "none",
    },
    ...(Object.keys(env).length > 0 ? { env } : {}),
    acp: {
      agentFamily: preset.agentFamily,
    },
  };
}

export async function ensureManagedAcpBackendEnvironmentDirectories(
  backends: BackendInstance[],
) {
  for (const backend of backends) {
    const spec = ACP_ISOLATED_ENV_BY_BACKEND_ID[backend.id];
    if (!spec) {
      continue;
    }
    const expectedPath = getAcpBackendIsolatedEnvironmentPath(spec.backendId);
    if (backend.env?.[spec.envKey] === expectedPath) {
      await ensureRuntimeDirectory(expectedPath);
    }
  }
}

export function listBuiltinAcpBackends() {
  return ACP_BACKEND_PRESETS.filter((preset) => preset.builtIn).map((preset) =>
    createAcpBackendFromPreset(preset),
  );
}

import type { BackendInstance } from "../backends/types";
import {
  ACP_BACKEND_TYPE,
  ACP_OPENCODE_ARGS,
  ACP_OPENCODE_BACKEND_ID,
  ACP_OPENCODE_COMMAND,
  ACP_OPENCODE_DISPLAY_NAME,
} from "../config/defaults";

export type AcpBackendPresetId =
  | "opencode"
  | "codex"
  | "claude-code"
  | "gemini-cli"
  | "hermes"
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
    id: "claude-code",
    backendId: "acp-claude-code",
    displayName: "Claude Code ACP",
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
    id: "hermes",
    backendId: "acp-hermes",
    displayName: "Hermes ACP",
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
    acp: {
      agentFamily: preset.agentFamily,
    },
  };
}

export function listBuiltinAcpBackends() {
  return ACP_BACKEND_PRESETS.filter((preset) => preset.builtIn).map((preset) =>
    createAcpBackendFromPreset(preset),
  );
}

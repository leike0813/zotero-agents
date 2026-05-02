import type { BackendInstance } from "../backends/types";
import { joinPath } from "../utils/path";

export type AcpAgentFamily =
  | "codex"
  | "claude-code"
  | "opencode"
  | "gemini-cli"
  | "qwen-code"
  | "unknown";

export type AcpSkillInjectionPlan = {
  family: AcpAgentFamily;
  skillRoots: string[];
  diagnostics: Array<{
    level: "info" | "warning" | "error";
    code: string;
    message: string;
  }>;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeFamily(value: unknown): AcpAgentFamily {
  const normalized = normalizeString(value).toLowerCase();
  if (["codex", "claude-code", "opencode", "gemini-cli", "qwen-code"].includes(normalized)) {
    return normalized as AcpAgentFamily;
  }
  if (normalized === "claude" || normalized === "claude_code") {
    return "claude-code";
  }
  if (normalized === "gemini") {
    return "gemini-cli";
  }
  if (normalized === "qwen") {
    return "qwen-code";
  }
  return "unknown";
}

function haystackForBackend(backend: BackendInstance) {
  return [
    backend.id,
    backend.displayName,
    backend.command,
    ...(Array.isArray(backend.args) ? backend.args : []),
  ]
    .map((entry) => normalizeString(entry).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export function resolveAcpAgentFamily(backend: BackendInstance): AcpAgentFamily {
  const explicit = normalizeFamily(backend.acp?.agentFamily);
  if (explicit !== "unknown") {
    return explicit;
  }

  const source = haystackForBackend(backend);
  if (/\bqwen(?:-code)?\b/.test(source)) {
    return "qwen-code";
  }
  if (/\bgemini(?:-cli)?\b/.test(source)) {
    return "gemini-cli";
  }
  if (/\bopencode\b|opencode-ai/.test(source)) {
    return "opencode";
  }
  if (/claude(?:-code)?|zed-industries\/claude-code-acp/.test(source)) {
    return "claude-code";
  }
  if (/\bcodex\b|openai\/codex/.test(source)) {
    return "codex";
  }
  return "unknown";
}

export function defaultAcpSkillRootsForFamily(family: AcpAgentFamily) {
  switch (family) {
    case "codex":
      return [".agents/skills", ".codex/skills"];
    case "claude-code":
      return [".claude/skills"];
    case "opencode":
      return [".agents/skills", ".claude/skills"];
    case "gemini-cli":
      return [".agents/skills", ".gemini/skills"];
    case "qwen-code":
      return [".qwen/skills"];
    case "unknown":
    default:
      return [".agents/skills"];
  }
}

export function buildAcpSkillInjectionPlan(args: {
  backend: BackendInstance;
  workspaceDir: string;
}): AcpSkillInjectionPlan {
  const family = resolveAcpAgentFamily(args.backend);
  const configuredRoots = Array.isArray(args.backend.acp?.skillRoots)
    ? args.backend.acp!.skillRoots!
        .map((entry) => normalizeString(entry).replace(/\\/g, "/"))
        .filter(Boolean)
    : [];
  const relativeRoots =
    configuredRoots.length > 0 ? configuredRoots : defaultAcpSkillRootsForFamily(family);
  const skillRoots = Array.from(new Set(relativeRoots)).map((root) =>
    joinPath(args.workspaceDir, root),
  );
  const diagnostics: AcpSkillInjectionPlan["diagnostics"] = [];
  if (family === "unknown") {
    diagnostics.push({
      level: "warning",
      code: "acp_agent_family_unknown",
      message: "ACP agent family could not be inferred; using .agents/skills fallback",
    });
  }
  if (configuredRoots.length > 0) {
    diagnostics.push({
      level: "info",
      code: "acp_skill_roots_override",
      message: "ACP skill roots were provided by backend profile override",
    });
  }
  return {
    family,
    skillRoots,
    diagnostics,
  };
}


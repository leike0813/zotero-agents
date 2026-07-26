import type { BackendInstance } from "../backends/types";
import { joinPath } from "../utils/path";

export type AcpAgentFamily =
  | "codex"
  | "claude-code"
  | "opencode"
  | "gemini-cli"
  | "hermes"
  | "qwen-code"
  | "kilo"
  | "codebuddy"
  | "kimi-code"
  | "unknown";

export type AcpSkillInjectionPlan = {
  family: AcpAgentFamily;
  families: AcpAgentFamily[];
  relativeSkillRoots: string[];
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
  if (
    [
      "codex",
      "claude-code",
      "opencode",
      "gemini-cli",
      "hermes",
      "qwen-code",
      "kilo",
      "codebuddy",
      "kimi-code",
    ].includes(normalized)
  ) {
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
  if (normalized === "kilocode") {
    return "kilo";
  }
  if (normalized === "kimi") {
    return "kimi-code";
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

export function resolveAcpAgentFamily(
  backend: BackendInstance,
): AcpAgentFamily {
  const explicit = normalizeFamily(backend.acp?.agentFamily);
  if (explicit !== "unknown") {
    return explicit;
  }

  const source = haystackForBackend(backend);
  if (/\bqwen(?:-code)?\b/.test(source)) {
    return "qwen-code";
  }
  if (/\bkilo(?:code)?\b|@kilocode\/cli/.test(source)) {
    return "kilo";
  }
  if (/\b(?:codebuddy|cbc)\b/.test(source)) {
    return "codebuddy";
  }
  if (/\bkimi\b/.test(source)) {
    return "kimi-code";
  }
  if (/\bhermes\b/.test(source)) {
    return "hermes";
  }
  if (/\bgemini(?:-cli)?\b/.test(source)) {
    return "gemini-cli";
  }
  if (/\bopencode\b|opencode-ai/.test(source)) {
    return "opencode";
  }
  if (
    /claude(?:-code)?|zed-industries\/claude-code-acp|agentclientprotocol\/claude-agent-acp/.test(
      source,
    )
  ) {
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
      return [".agents/skills", ".claude/skills"];
    case "opencode":
      return [".agents/skills", ".opencode/skills"];
    case "gemini-cli":
      return [".agents/skills", ".gemini/skills"];
    case "qwen-code":
      return [".agents/skills", ".qwen/skills"];
    case "kilo":
      return [".agents/skills", ".kilo/skills"];
    case "codebuddy":
      return [".agents/skills", ".codebuddy/skills"];
    case "kimi-code":
      return [".agents/skills", ".kimi-code/skills"];
    case "hermes":
      return [];
    case "unknown":
    default:
      return [".agents/skills"];
  }
}

export function normalizeAcpProjectSkillRoot(value: unknown) {
  const normalized = normalizeString(value).replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.includes("\u0000") ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized)
  ) {
    return "";
  }
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    return "";
  }
  return segments.join("/");
}

export function buildAcpChatSkillInjectionPlan(args: {
  backends: readonly BackendInstance[];
  workspaceDir: string;
}): AcpSkillInjectionPlan {
  const diagnostics: AcpSkillInjectionPlan["diagnostics"] = [];
  const families: AcpAgentFamily[] = [];
  const relativeSkillRoots: string[] = [];
  const seenRoots = new Set<string>();
  const appendRoot = (root: string) => {
    if (seenRoots.has(root)) {
      return;
    }
    seenRoots.add(root);
    relativeSkillRoots.push(root);
  };
  for (const backend of args.backends) {
    const family = resolveAcpAgentFamily(backend);
    if (!families.includes(family)) {
      families.push(family);
    }
    for (const root of defaultAcpSkillRootsForFamily(family)) {
      appendRoot(root);
    }
    for (const entry of backend.acp?.skillRoots || []) {
      const root = normalizeAcpProjectSkillRoot(entry);
      if (!root) {
        diagnostics.push({
          level: "warning",
          code: "acp_chat_skill_root_invalid",
          message: `ACP Chat ignored an invalid project skill root from backend "${backend.id}".`,
        });
        continue;
      }
      appendRoot(root);
    }
  }
  const skillRoots = relativeSkillRoots.map((root) =>
    joinPath(args.workspaceDir, root),
  );
  if (
    args.backends.some(
      (backend) =>
        Array.isArray(backend.acp?.skillRoots) &&
        backend.acp!.skillRoots!.length > 0,
    )
  ) {
    diagnostics.push({
      level: "info",
      code: "acp_chat_skill_roots_override_appended",
      message:
        "ACP Chat appended configured backend profile skill roots to family project skill roots",
    });
  }
  return {
    family: families[0] || "unknown",
    families,
    relativeSkillRoots,
    skillRoots,
    diagnostics,
  };
}

export function buildAcpSkillInjectionPlan(args: {
  backend: BackendInstance;
  workspaceDir: string;
}): AcpSkillInjectionPlan {
  const family = resolveAcpAgentFamily(args.backend);
  const diagnostics: AcpSkillInjectionPlan["diagnostics"] = [];
  const configuredRoots: string[] = [];
  for (const entry of args.backend.acp?.skillRoots || []) {
    const root = normalizeAcpProjectSkillRoot(entry);
    if (!root) {
      diagnostics.push({
        level: "warning",
        code: "acp_skill_root_invalid",
        message: "ACP skill root override was invalid and was ignored",
      });
      continue;
    }
    configuredRoots.push(root);
  }
  const relativeSkillRoots =
    configuredRoots.length > 0
      ? Array.from(new Set(configuredRoots))
      : defaultAcpSkillRootsForFamily(family);
  const skillRoots = relativeSkillRoots.map((root) =>
    joinPath(args.workspaceDir, root),
  );
  if (family === "unknown") {
    diagnostics.push({
      level: "warning",
      code: "acp_agent_family_unknown",
      message:
        "ACP agent family could not be inferred; using .agents/skills fallback",
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
    families: [family],
    relativeSkillRoots,
    skillRoots,
    diagnostics,
  };
}

import type { BackendInstance } from "../backends/types";
import { joinPath } from "../utils/path";
import type { AcpAgentFamily } from "./acpAgentFamilyResolver";
import {
  ACP_SKILL_PATCH_TEMPLATES_BY_MODULE,
  loadAcpSkillPatchTemplate,
  renderAcpSkillPatchTemplate,
} from "./acpSkillPatchTemplates";
import type { AcpSkillRunnerWorkspace } from "./acpSkillRunnerWorkspace";
import { writeRuntimeTextFile } from "./runtimePersistence";

type RunPromptContext = {
  skillId: string;
  workspace: AcpSkillRunnerWorkspace;
  backend: BackendInstance;
  agentFamily: AcpAgentFamily;
  proxySkillRoots: string[];
  requestedSkillProxyPath?: string;
  sharedSkillCatalogPath: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function toPortablePath(path: string) {
  return normalizeString(path).replace(/\\/g, "/");
}

function resolveEngineWorkspaceDir(family: AcpAgentFamily) {
  if (family === "claude-code") {
    return "./.claude";
  }
  if (family === "gemini-cli") {
    return "./.gemini";
  }
  if (family === "qwen-code") {
    return "./.qwen";
  }
  if (family === "codex") {
    return "./.codex";
  }
  return "./.agents";
}

function resolveEngineSkillsDir(family: AcpAgentFamily) {
  const workspaceDir = resolveEngineWorkspaceDir(family);
  return `${workspaceDir}/skills`;
}

function resolveInstructionFilename(family: AcpAgentFamily) {
  if (family === "claude-code") {
    return "CLAUDE.md";
  }
  if (family === "gemini-cli") {
    return "GEMINI.md";
  }
  return "AGENTS.md";
}

function resolveSkillInvokeLine(family: AcpAgentFamily, skillId: string) {
  if (family === "claude-code") {
    return `/${skillId}`;
  }
  if (family === "opencode") {
    return `/skills ${skillId}`;
  }
  if (family === "gemini-cli") {
    return `/${skillId} invoke`;
  }
  if (family === "codex") {
    return `$${skillId}`;
  }
  return `Invoke skill named ${skillId}`;
}

function renderKeyValueLines(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "- (none)";
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return "- (none)";
  }
  return entries
    .map(([key, val]) => `- ${key}: ${typeof val === "string" ? val : JSON.stringify(val)}`)
    .join("\n");
}

function resolvePromptInputAndParameter(request: unknown) {
  const payload =
    request && typeof request === "object" && !Array.isArray(request)
      ? (request as Record<string, unknown>)
      : {};
  const parameter =
    payload.parameter && typeof payload.parameter === "object" && !Array.isArray(payload.parameter)
      ? (payload.parameter as Record<string, unknown>)
      : {};
  return {
    input: payload.input || {},
    parameter,
  };
}

export async function materializeAcpRunExecutionInstructions(args: {
  context: RunPromptContext;
}) {
  const template = await loadAcpSkillPatchTemplate(
    ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.run_execution_instructions,
  );
  const rendered = renderAcpSkillPatchTemplate({
    template,
    replacements: {
      run_dir: toPortablePath(args.context.workspace.workspaceDir),
      engine_workspace_dir: resolveEngineWorkspaceDir(args.context.agentFamily),
      engine_skills_dir: resolveEngineSkillsDir(args.context.agentFamily),
    },
    requiredPlaceholders: [
      "run_dir",
      "engine_workspace_dir",
      "engine_skills_dir",
    ],
  });
  const path = joinPath(
    args.context.workspace.workspaceDir,
    resolveInstructionFilename(args.context.agentFamily),
  );
  await writeRuntimeTextFile(path, `${rendered}\n`);
  return path;
}

export async function buildAcpSkillRunPrompt(args: {
  context: RunPromptContext;
  request: unknown;
}) {
  const { input, parameter } = resolvePromptInputAndParameter(args.request);
  const bodyTemplate = await loadAcpSkillPatchTemplate(
    ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.prompt_body_common,
  );
  const body = renderAcpSkillPatchTemplate({
    template: bodyTemplate,
    replacements: {
      input_lines: renderKeyValueLines(input),
      parameter_lines: renderKeyValueLines(parameter),
    },
    requiredPlaceholders: ["input_lines", "parameter_lines"],
  });
  return [
    resolveSkillInvokeLine(args.context.agentFamily, args.context.skillId),
    body,
    "",
    "ACP run context:",
    `- Run workspace: ${toPortablePath(args.context.workspace.workspaceDir)}`,
    `- Input manifest: ${toPortablePath(args.context.workspace.inputManifestPath)}`,
    `- Agent skill roots: ${args.context.proxySkillRoots.map(toPortablePath).join(", ")}`,
    `- Requested skill proxy: ${toPortablePath(args.context.requestedSkillProxyPath || "(unavailable)")}`,
    `- Shared skill catalog: ${toPortablePath(args.context.sharedSkillCatalogPath)}`,
  ].join("\n");
}

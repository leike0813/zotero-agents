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

const ZOTERO_HOST_ACCESS_START =
  "<!-- zotero-skills-zotero-host-access:start -->";
const ZOTERO_HOST_ACCESS_END =
  "<!-- zotero-skills-zotero-host-access:end -->";

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

function appendZoteroHostAccessSnippet(args: {
  renderedInstructions: string;
  snippet?: string;
}) {
  const snippet = normalizeString(args.snippet);
  if (!snippet) {
    return `${args.renderedInstructions}\n`;
  }
  return [
    args.renderedInstructions,
    "",
    ZOTERO_HOST_ACCESS_START,
    snippet,
    ZOTERO_HOST_ACCESS_END,
    "",
  ].join("\n");
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

function resolveSkillRunnerEngineId(family: AcpAgentFamily) {
  if (family === "claude-code") {
    return "claude";
  }
  if (family === "gemini-cli") {
    return "gemini";
  }
  if (family === "qwen-code") {
    return "qwen";
  }
  return family;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveRunnerEntrypointPrompt(args: {
  runnerJson?: Record<string, unknown>;
  engineId: string;
}) {
  const entrypoint = isRecord(args.runnerJson?.entrypoint)
    ? args.runnerJson?.entrypoint
    : undefined;
  const prompts = isRecord(entrypoint?.prompts) ? entrypoint?.prompts : undefined;
  const enginePrompt = prompts ? prompts[args.engineId] : undefined;
  if (typeof enginePrompt === "string" && enginePrompt.trim()) {
    return enginePrompt;
  }
  const commonPrompt = prompts ? prompts.common : undefined;
  if (typeof commonPrompt === "string" && commonPrompt.trim()) {
    return commonPrompt;
  }
  return "";
}

function resolveTemplateValue(path: string, context: Record<string, unknown>) {
  const normalized = normalizeString(path);
  if (!normalized) {
    return "";
  }
  const parts = normalized.split(".").map((entry) => entry.trim()).filter(Boolean);
  let current: unknown = context;
  for (const part of parts) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return "";
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === "string") {
    return current;
  }
  if (typeof current === "number" || typeof current === "boolean") {
    return String(current);
  }
  if (typeof current === "undefined" || current === null) {
    return "";
  }
  return JSON.stringify(current);
}

function renderSimpleEntrypointTemplate(args: {
  template: string;
  context: Record<string, unknown>;
}) {
  return args.template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, expr) =>
    resolveTemplateValue(String(expr || ""), args.context),
  );
}

export async function materializeAcpRunExecutionInstructions(args: {
  context: RunPromptContext;
  hostBridgeCliPromptSnippet?: string;
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
  await writeRuntimeTextFile(
    path,
    appendZoteroHostAccessSnippet({
      renderedInstructions: rendered,
      snippet: args.hostBridgeCliPromptSnippet,
    }),
  );
  return path;
}

export async function buildAcpSkillRunPrompt(args: {
  context: RunPromptContext;
  request: unknown;
  runnerJson?: Record<string, unknown>;
  inputContext?: Record<string, unknown>;
  parameterContext?: Record<string, unknown>;
}) {
  const resolved = resolvePromptInputAndParameter(args.request);
  const input = args.inputContext || resolved.input;
  const parameter = args.parameterContext || resolved.parameter;
  const engineId = resolveSkillRunnerEngineId(args.context.agentFamily);
  const entrypointPrompt = resolveRunnerEntrypointPrompt({
    runnerJson: args.runnerJson,
    engineId,
  });
  let body = "";
  if (entrypointPrompt) {
    body = renderSimpleEntrypointTemplate({
      template: entrypointPrompt,
      context: {
        input,
        parameter,
        skill: { id: args.context.skillId },
        skill_id: args.context.skillId,
        run_dir: toPortablePath(args.context.workspace.workspaceDir),
        engine_id: engineId,
        engine_workspace_dir: resolveEngineWorkspaceDir(
          args.context.agentFamily,
        ),
        engine_skills_dir: resolveEngineSkillsDir(args.context.agentFamily),
      },
    });
  } else {
    const bodyTemplate = await loadAcpSkillPatchTemplate(
      ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.prompt_body_common,
    );
    body = renderAcpSkillPatchTemplate({
      template: bodyTemplate,
      replacements: {
        input_lines: renderKeyValueLines(input),
        parameter_lines: renderKeyValueLines(parameter),
      },
      requiredPlaceholders: ["input_lines", "parameter_lines"],
    });
  }
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

import { config } from "../../package.json";
import { joinPath } from "../utils/path";
import { resolveAddonRef } from "../utils/runtimeBridge";
import {
  readRuntimeTextFile,
  runtimePathExists,
} from "./runtimePersistence";

export type AcpRuntimePromptTemplateId =
  | "mcp_required_guard"
  | "recovered_continuation_guard"
  | "host_bridge_cli_readme"
  | "host_bridge_cli_prompt";

export type AcpRuntimePromptTemplate = {
  id: AcpRuntimePromptTemplateId;
  filename: string;
};

export const ACP_RUNTIME_PROMPT_TEMPLATE_ROOT =
  "addon/content/acp-runtime-prompts/templates";

export const ACP_RUNTIME_PROMPT_TEMPLATES = [
  {
    id: "mcp_required_guard",
    filename: "mcp_required_guard.md",
  },
  {
    id: "recovered_continuation_guard",
    filename: "recovered_continuation_guard.md",
  },
  {
    id: "host_bridge_cli_readme",
    filename: "host_bridge_cli_readme.md",
  },
  {
    id: "host_bridge_cli_prompt",
    filename: "host_bridge_cli_prompt.md",
  },
] satisfies AcpRuntimePromptTemplate[];

export const ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID = Object.fromEntries(
  ACP_RUNTIME_PROMPT_TEMPLATES.map((entry) => [entry.id, entry]),
) as Record<AcpRuntimePromptTemplateId, AcpRuntimePromptTemplate>;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function getRuntimeCwd() {
  const runtime = globalThis as { process?: { cwd?: () => string } };
  return normalizeString(runtime.process?.cwd?.()) || ".";
}

function hasNodeRuntime() {
  return !!(globalThis as { process?: unknown }).process;
}

function resolveChromeTemplateUri(template: AcpRuntimePromptTemplate) {
  const addonRef =
    normalizeString(config.addonRef) || resolveAddonRef("zotero-skills");
  return `chrome://${addonRef}/content/acp-runtime-prompts/templates/${template.filename}`;
}

async function readTemplateFromChrome(template: AcpRuntimePromptTemplate) {
  if (typeof fetch !== "function") {
    return "";
  }
  const uri = resolveChromeTemplateUri(template);
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(
      `failed to load ACP runtime prompt template: ${uri} (${response.status})`,
    );
  }
  return response.text();
}

async function readTemplateFromNode(template: AcpRuntimePromptTemplate) {
  const path = joinPath(
    getRuntimeCwd(),
    ACP_RUNTIME_PROMPT_TEMPLATE_ROOT,
    template.filename,
  );
  if (!(await runtimePathExists(path))) {
    return "";
  }
  return readRuntimeTextFile(path);
}

export async function loadAcpRuntimePromptTemplate(
  template: AcpRuntimePromptTemplate,
) {
  const content = hasNodeRuntime()
    ? (await readTemplateFromNode(template)) || (await readTemplateFromChrome(template))
    : (await readTemplateFromChrome(template)) || (await readTemplateFromNode(template));
  const trimmed = normalizeString(content);
  if (!trimmed) {
    throw new Error(`ACP runtime prompt template is missing or empty: ${template.filename}`);
  }
  return trimmed;
}

export function renderAcpRuntimePromptTemplate(args: {
  template: string;
  replacements: Record<string, string>;
  requiredPlaceholders?: string[];
}) {
  let rendered = args.template;
  for (const key of args.requiredPlaceholders || []) {
    if (!rendered.includes(`{${key}}`)) {
      throw new Error(`ACP runtime prompt template is missing placeholder: {${key}}`);
    }
  }
  for (const [key, value] of Object.entries(args.replacements)) {
    rendered = rendered.split(`{${key}}`).join(value);
  }
  for (const key of args.requiredPlaceholders || []) {
    if (rendered.includes(`{${key}}`)) {
      throw new Error(`ACP runtime prompt template placeholder was not rendered: {${key}}`);
    }
  }
  return rendered.trim();
}

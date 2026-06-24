import { config } from "../../package.json";
import { joinPath } from "../utils/path";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { readRuntimeTextFile, runtimePathExists } from "./runtimePersistence";

export type AcpSkillPatchModule =
  | "runtime_enforcement"
  | "resource_mapping"
  | "output_format_contract"
  | "output_contract_details"
  | "output_contract_interactive_pending"
  | "skill_run_feedback"
  | "mode_auto"
  | "mode_interactive"
  | "run_execution_instructions"
  | "prompt_body_common";

export type AcpSkillPatchTemplate = {
  module: AcpSkillPatchModule;
  filename: string;
};

export const ACP_SKILL_PATCH_TEMPLATE_ROOT =
  "addon/content/acp-skill-patches/templates";

export const ACP_SKILL_PATCH_TEMPLATES = [
  {
    module: "runtime_enforcement",
    filename: "patch_runtime_enforcement.md",
  },
  {
    module: "resource_mapping",
    filename: "patch_resource_mapping.md",
  },
  {
    module: "output_format_contract",
    filename: "patch_output_format_contract.md",
  },
  {
    module: "output_contract_details",
    filename: "patch_output_contract_details.md",
  },
  {
    module: "output_contract_interactive_pending",
    filename: "patch_output_contract_interactive_pending.md",
  },
  {
    module: "skill_run_feedback",
    filename: "patch_skill_run_feedback.md.j2",
  },
  {
    module: "mode_auto",
    filename: "patch_mode_auto.md",
  },
  {
    module: "mode_interactive",
    filename: "patch_mode_interactive.md",
  },
  {
    module: "run_execution_instructions",
    filename: "run_execution_instructions.md.j2",
  },
  {
    module: "prompt_body_common",
    filename: "prompt_body_common.md",
  },
] satisfies AcpSkillPatchTemplate[];

export const ACP_SKILL_PATCH_TEMPLATES_BY_MODULE = Object.fromEntries(
  ACP_SKILL_PATCH_TEMPLATES.map((entry) => [entry.module, entry]),
) as Record<AcpSkillPatchModule, AcpSkillPatchTemplate>;

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

function resolveChromeTemplateUri(template: AcpSkillPatchTemplate) {
  const addonRef =
    normalizeString(config.addonRef) || resolveAddonRef("zotero-skills");
  return `chrome://${addonRef}/content/acp-skill-patches/templates/${template.filename}`;
}

async function readTemplateFromChrome(template: AcpSkillPatchTemplate) {
  if (typeof fetch !== "function") {
    return "";
  }
  const uri = resolveChromeTemplateUri(template);
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(
      `failed to load ACP skill patch template: ${uri} (${response.status})`,
    );
  }
  return response.text();
}

async function readTemplateFromNode(template: AcpSkillPatchTemplate) {
  const path = joinPath(
    getRuntimeCwd(),
    ACP_SKILL_PATCH_TEMPLATE_ROOT,
    template.filename,
  );
  if (!(await runtimePathExists(path))) {
    return "";
  }
  return readRuntimeTextFile(path);
}

export async function loadAcpSkillPatchTemplate(
  template: AcpSkillPatchTemplate,
) {
  const content = hasNodeRuntime()
    ? (await readTemplateFromNode(template)) ||
      (await readTemplateFromChrome(template))
    : (await readTemplateFromChrome(template)) ||
      (await readTemplateFromNode(template));
  const trimmed = normalizeString(content);
  if (!trimmed) {
    throw new Error(
      `ACP skill patch template is missing or empty: ${template.filename}`,
    );
  }
  return trimmed;
}

export function renderAcpSkillPatchTemplate(args: {
  template: string;
  replacements: Record<string, string>;
  requiredPlaceholders?: string[];
}) {
  let rendered = args.template;
  for (const key of args.requiredPlaceholders || []) {
    if (!rendered.includes(`{${key}}`)) {
      throw new Error(
        `ACP skill patch template is missing placeholder: {${key}}`,
      );
    }
  }
  for (const [key, value] of Object.entries(args.replacements)) {
    rendered = rendered.split(`{${key}}`).join(value);
  }
  for (const key of args.requiredPlaceholders || []) {
    if (rendered.includes(`{${key}}`)) {
      throw new Error(
        `ACP skill patch template placeholder was not rendered: {${key}}`,
      );
    }
  }
  return rendered.trim();
}

import { config } from "../../../../package.json";
import { joinPath } from "../../../utils/path";
import { resolveAddonRef } from "../../../utils/runtimeBridge";
import { readRuntimeTextFile, runtimePathExists, } from "../../runtimePersistence";
export const ACP_RUNTIME_PROMPT_TEMPLATE_ROOT = "addon/content/acp-runtime-prompts/templates";
export const ACP_RUNTIME_PROMPT_TEMPLATES = [
    {
        id: "acp_chat_startup_preamble",
        filename: "acp_chat_startup_preamble.md",
    },
    {
        id: "acp_chat_workspace_agents",
        filename: "acp_chat_workspace_agents.md",
    },
    {
        id: "acp_skills_startup_preamble",
        filename: "acp_skills_startup_preamble.md",
    },
    {
        id: "mcp_required_guard",
        filename: "mcp_required_guard.md",
    },
    {
        id: "recovered_continuation_guard",
        filename: "recovered_continuation_guard.md",
    },
    {
        id: "interaction_file_reply",
        filename: "interaction_file_reply.md",
    },
];
export const ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID = Object.fromEntries(ACP_RUNTIME_PROMPT_TEMPLATES.map((entry) => [entry.id, entry]));
function normalizeString(value) {
    return String(value || "").trim();
}
function getRuntimeCwd() {
    const runtime = globalThis;
    return normalizeString(runtime.process?.cwd?.()) || ".";
}
function hasNodeRuntime() {
    return !!globalThis.process;
}
function resolveChromeTemplateUri(template) {
    const addonRef = normalizeString(config.addonRef) || resolveAddonRef("zotero-skills");
    return `chrome://${addonRef}/content/acp-runtime-prompts/templates/${template.filename}`;
}
async function readTemplateFromChrome(template) {
    if (typeof fetch !== "function") {
        return "";
    }
    const uri = resolveChromeTemplateUri(template);
    const response = await fetch(uri);
    if (!response.ok) {
        throw new Error(`failed to load ACP runtime prompt template: ${uri} (${response.status})`);
    }
    return response.text();
}
async function readTemplateFromNode(template) {
    const path = joinPath(getRuntimeCwd(), ACP_RUNTIME_PROMPT_TEMPLATE_ROOT, template.filename);
    if (!(await runtimePathExists(path))) {
        return "";
    }
    return readRuntimeTextFile(path);
}
export async function loadAcpRuntimePromptTemplate(template) {
    const content = hasNodeRuntime()
        ? (await readTemplateFromNode(template)) ||
            (await readTemplateFromChrome(template))
        : (await readTemplateFromChrome(template)) ||
            (await readTemplateFromNode(template));
    const trimmed = normalizeString(content);
    if (!trimmed) {
        throw new Error(`ACP runtime prompt template is missing or empty: ${template.filename}`);
    }
    return trimmed;
}
export function renderAcpRuntimePromptTemplate(args) {
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

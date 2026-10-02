import { ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID, loadAcpRuntimePromptTemplate, renderAcpRuntimePromptTemplate, } from "./acpRuntimePromptTemplates";
const HOST_BRIDGE_CLI_SKILL_ID = "zotero-bridge-cli";
function normalizeString(value) {
    return String(value || "").trim();
}
export function resolveAcpStartupInstructionFile(agentFamily) {
    const family = normalizeString(agentFamily).toLowerCase();
    if (family === "hermes") {
        return "HERMES.md";
    }
    if (family === "claude-code") {
        return "CLAUDE.md";
    }
    if (family === "gemini-cli") {
        return "GEMINI.md";
    }
    return "AGENTS.md";
}
function displaySurface(surface) {
    return surface === "acp-skills" ? "ACP Skills" : "ACP Chat";
}
export async function buildAcpStartupPromptPreamble(context) {
    const template = await loadAcpRuntimePromptTemplate(context.surface === "acp-skills"
        ? ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.acp_skills_startup_preamble
        : ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.acp_chat_startup_preamble);
    return renderAcpRuntimePromptTemplate({
        template,
        replacements: {
            HOST_BRIDGE_SKILL_ID: HOST_BRIDGE_CLI_SKILL_ID,
            INSTRUCTION_FILE: context.surface === "acp-chat"
                ? "AGENTS.md"
                : normalizeString(context.instructionFile) ||
                    resolveAcpStartupInstructionFile(),
            SURFACE: displaySurface(context.surface),
            WORKSPACE_DIR: normalizeString(context.workspaceDir) || "(unknown)",
        },
        requiredPlaceholders: [
            "HOST_BRIDGE_SKILL_ID",
            "INSTRUCTION_FILE",
            "SURFACE",
            "WORKSPACE_DIR",
        ],
    });
}
export function prependAcpStartupPromptPreamble(args) {
    const message = normalizeString(args.message);
    const preamble = normalizeString(args.preamble);
    if (!preamble) {
        return message;
    }
    if (!message) {
        return preamble;
    }
    return `${preamble}\n\n${message}`;
}

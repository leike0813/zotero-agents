import { buildAcpSharedSkillCatalog, } from "./acpSharedSkillCatalog";
import { materializeAcpThinProxySkills } from "./acpThinProxySkillMaterializer";
import { readRuntimeTextFile } from "../../runtimePersistence";
async function readJsonFile(filePath) {
    return JSON.parse(await readRuntimeTextFile(filePath));
}
export async function materializeAcpSkill(args) {
    const catalog = await buildAcpSharedSkillCatalog({
        registry: args.registry,
        catalogRootDir: args.catalogRootDir,
    });
    const requested = catalog.entriesById[args.requestedSkillId];
    if (!requested) {
        throw new Error(`Plugin-side skill not found: ${args.requestedSkillId}`);
    }
    const proxy = args.injectionPlan.family === "hermes"
        ? {
            materializedDirs: [],
            requestedSkillProxyDirs: [],
            requestedSkillProxyPath: undefined,
            requestedOutputContractDetailsMarkdown: undefined,
            proxySkillRoots: [],
            proxySkillCount: 0,
            resourceRewriteWarnings: [],
            diagnostics: [
                {
                    level: "info",
                    code: "acp_hermes_proxy_skills_skipped",
                    message: "Hermes ACP uses shared catalog instructions instead of run-local proxy skills.",
                },
            ],
        }
        : await materializeAcpThinProxySkills({
            catalog,
            requestedSkillId: args.requestedSkillId,
            injectionPlan: args.injectionPlan,
            workspaceDir: args.workspaceDir,
            resultJsonPath: args.resultJsonPath,
            inputManifestPath: args.inputManifestPath,
            executionMode: args.executionMode,
            collectSkillRunFeedback: args.collectSkillRunFeedback,
        });
    const runnerJson = await readJsonFile(requested.runnerJsonPath);
    return {
        skillId: args.requestedSkillId,
        materializedDirs: proxy.materializedDirs,
        requestedSkillProxyDirs: proxy.requestedSkillProxyDirs,
        requestedSkillProxyPath: proxy.requestedSkillProxyPath,
        primarySkillDir: requested.catalogSkillRoot,
        runnerJson,
        sharedSkillCatalogPath: catalog.catalogRoot,
        sharedSkillCatalog: catalog,
        proxySkillRoots: proxy.proxySkillRoots,
        proxySkillCount: proxy.proxySkillCount,
        outputContractDetailsMarkdown: proxy.requestedOutputContractDetailsMarkdown,
        resourceRewriteWarnings: proxy.resourceRewriteWarnings,
        diagnostics: [
            ...catalog.diagnostics,
            ...proxy.diagnostics,
            ...proxy.resourceRewriteWarnings.map((warning) => ({
                level: "warning",
                code: "acp_skill_reference_rewrite_warning",
                message: warning,
            })),
        ],
    };
}

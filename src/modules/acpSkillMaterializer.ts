import type { AcpSkillInjectionPlan } from "./acpAgentFamilyResolver";
import type { PluginSkillRegistrySnapshot } from "./pluginSkillRegistry";
import {
  buildAcpSharedSkillCatalog,
  type AcpSharedSkillCatalog,
} from "./acpSharedSkillCatalog";
import { materializeAcpThinProxySkills } from "./acpThinProxySkillMaterializer";
import { readRuntimeTextFile } from "./runtimePersistence";

export type AcpSkillMaterializationResult = {
  skillId: string;
  materializedDirs: string[];
  requestedSkillProxyDirs: string[];
  requestedSkillProxyPath?: string;
  primarySkillDir: string;
  runnerJson: Record<string, unknown>;
  sharedSkillCatalogPath: string;
  sharedSkillCatalog: AcpSharedSkillCatalog;
  proxySkillRoots: string[];
  proxySkillCount: number;
  resourceRewriteWarnings: string[];
  diagnostics: Array<{
    level: "info" | "warning" | "error";
    code: string;
    message: string;
  }>;
};

async function readJsonFile(filePath: string) {
  return JSON.parse(await readRuntimeTextFile(filePath)) as Record<string, unknown>;
}

export async function materializeAcpSkill(args: {
  registry: PluginSkillRegistrySnapshot;
  requestedSkillId: string;
  injectionPlan: AcpSkillInjectionPlan;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  catalogRootDir?: string;
}): Promise<AcpSkillMaterializationResult> {
  const catalog = await buildAcpSharedSkillCatalog({
    registry: args.registry,
    catalogRootDir: args.catalogRootDir,
  });
  const requested = catalog.entriesById[args.requestedSkillId];
  if (!requested) {
    throw new Error(`Plugin-side skill not found: ${args.requestedSkillId}`);
  }
  const proxy = await materializeAcpThinProxySkills({
    catalog,
    requestedSkillId: args.requestedSkillId,
    injectionPlan: args.injectionPlan,
    workspaceDir: args.workspaceDir,
    resultJsonPath: args.resultJsonPath,
    inputManifestPath: args.inputManifestPath,
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
    resourceRewriteWarnings: proxy.resourceRewriteWarnings,
    diagnostics: [
      ...catalog.diagnostics,
      ...proxy.diagnostics,
      ...proxy.resourceRewriteWarnings.map((warning) => ({
        level: "warning" as const,
        code: "acp_skill_reference_rewrite_warning",
        message: warning,
      })),
    ],
  };
}

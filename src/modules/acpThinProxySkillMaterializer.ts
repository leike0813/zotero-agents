import type { AcpSkillInjectionPlan } from "./acpAgentFamilyResolver";
import type {
  AcpSharedSkillCatalog,
  AcpSharedSkillCatalogEntry,
} from "./acpSharedSkillCatalog";
import {
  copyRuntimeDirectory,
  readRuntimeTextFile,
  removeRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { joinPath } from "../utils/path";
import {
  insertAcpSkillProxyPatchBlock,
  rewriteAcpSkillReferences,
} from "./acpSkillReferenceRewriter";

export type AcpThinProxyMaterializationResult = {
  materializedDirs: string[];
  requestedSkillProxyDirs: string[];
  requestedSkillProxyPath?: string;
  proxySkillRoots: string[];
  proxySkillCount: number;
  resourceRewriteWarnings: string[];
  diagnostics: Array<{
    level: "info" | "warning" | "error";
    code: string;
    message: string;
  }>;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function toPortablePath(path: string) {
  return normalizeString(path).replace(/\\/g, "/");
}

function buildPatchBlock(args: {
  entry: AcpSharedSkillCatalogEntry;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  requested: boolean;
}) {
  const manifest = args.entry.resourceManifest;
  return [
    "<!-- zotero-skills-acp-thin-proxy:start -->",
    "## Zotero Skills ACP Thin Proxy Run Contract",
    "",
    `- Proxy mode: ${args.requested ? "primary requested skill" : "available auxiliary skill"}.`,
    `- Run workspace: ${toPortablePath(args.workspaceDir)}`,
    `- Input manifest: ${toPortablePath(args.inputManifestPath)}`,
    `- Runner result envelope path: ${toPortablePath(args.resultJsonPath)}`,
    `- Shared catalog skill root: ${toPortablePath(args.entry.catalogSkillRoot)}`,
    `- Resource root assets: ${toPortablePath(manifest.assetsDir)}`,
    `- Resource root scripts: ${toPortablePath(manifest.scriptsDir)}`,
    `- Resource root references: ${toPortablePath(manifest.referencesDir)}`,
    "- This proxy intentionally does not contain copied assets, scripts, or references.",
    "- When executing scripts or reading resources, use the absolute shared catalog paths above.",
    "- Do not write the runner result envelope yourself. Return a final assistant JSON payload with `__SKILL_DONE__: true`; Zotero Skills will validate it and create the envelope.",
    "- In interactive mode, return `__SKILL_DONE__: false` with `message` and `ui_hints` when waiting for user input.",
    "- Put additional artifacts under the run workspace and reference them from the final JSON payload.",
    "<!-- zotero-skills-acp-thin-proxy:end -->",
  ].join("\n");
}

function shouldUseFullSnapshot(runnerJson: Record<string, unknown>) {
  if (runnerJson.requiresFullSnapshot === true) {
    return true;
  }
  const acp = runnerJson.acp;
  return !!(
    acp &&
    typeof acp === "object" &&
    !Array.isArray(acp) &&
    (acp as Record<string, unknown>).requiresFullSnapshot === true
  );
}

async function readJsonFile(path: string) {
  try {
    return JSON.parse(await readRuntimeTextFile(path)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeProxySkill(args: {
  entry: AcpSharedSkillCatalogEntry;
  targetDir: string;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  requested: boolean;
}) {
  await removeRuntimePath(args.targetDir);
  const original = await readRuntimeTextFile(args.entry.skillMdPath);
  const rewrite = rewriteAcpSkillReferences({
    skillId: args.entry.skillId,
    skillRoot: args.entry.catalogSkillRoot,
    skillMdContent: original,
  });
  const content = insertAcpSkillProxyPatchBlock({
    rewrittenSkillMd: rewrite.content,
    patchBlock: buildPatchBlock(args),
  });
  await writeRuntimeTextFile(joinPath(args.targetDir, "SKILL.md"), content);
  await writeRuntimeTextFile(
    joinPath(args.targetDir, "zotero-skill-proxy.json"),
    JSON.stringify(
      {
        schema: "zotero-skills.acp.thin-proxy-skill.v1",
        skillId: args.entry.skillId,
        sourceKind: args.entry.sourceKind,
        checksum: args.entry.checksum,
        catalogSkillRoot: args.entry.catalogSkillRoot,
        resourceManifest: args.entry.resourceManifest,
        requested: args.requested,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  return rewrite.warnings;
}

export async function materializeAcpThinProxySkills(args: {
  catalog: AcpSharedSkillCatalog;
  requestedSkillId: string;
  injectionPlan: AcpSkillInjectionPlan;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
}): Promise<AcpThinProxyMaterializationResult> {
  const materializedDirs: string[] = [];
  const requestedSkillProxyDirs: string[] = [];
  const resourceRewriteWarnings: string[] = [];
  const diagnostics: AcpThinProxyMaterializationResult["diagnostics"] = [];
  for (const root of args.injectionPlan.skillRoots) {
    for (const entry of args.catalog.entries) {
      const targetDir = joinPath(root, entry.skillId);
      const runnerJson = await readJsonFile(entry.runnerJsonPath);
      const requested = entry.skillId === args.requestedSkillId;
      if (shouldUseFullSnapshot(runnerJson)) {
        await copyRuntimeDirectory({
          sourceDir: entry.catalogSkillRoot,
          targetDir,
        });
        diagnostics.push({
          level: "warning",
          code: "acp_skill_full_snapshot_fallback",
          message: `Skill ${entry.skillId} requested full snapshot fallback.`,
        });
      } else {
        const warnings = await writeProxySkill({
          entry,
          targetDir,
          workspaceDir: args.workspaceDir,
          resultJsonPath: args.resultJsonPath,
          inputManifestPath: args.inputManifestPath,
          requested,
        });
        resourceRewriteWarnings.push(
          ...warnings.map((warning) => `${entry.skillId}: ${warning}`),
        );
      }
      materializedDirs.push(targetDir);
      if (requested) {
        requestedSkillProxyDirs.push(targetDir);
      }
    }
  }
  diagnostics.push({
    level: "info",
    code: "acp_thin_proxy_skills_materialized",
    message: `Materialized ${materializedDirs.length} ACP thin proxy skill(s) into ${args.injectionPlan.skillRoots.length} root(s).`,
  });
  return {
    materializedDirs,
    requestedSkillProxyDirs,
    requestedSkillProxyPath: requestedSkillProxyDirs[0],
    proxySkillRoots: [...args.injectionPlan.skillRoots],
    proxySkillCount: materializedDirs.length,
    resourceRewriteWarnings,
    diagnostics,
  };
}

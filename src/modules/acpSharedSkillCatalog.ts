import type {
  PluginSkillRegistryEntry,
  PluginSkillRegistrySnapshot,
} from "./pluginSkillRegistry";
import {
  copyRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { joinPath } from "../utils/path";
import {
  buildAcpSkillResourceManifest,
  type AcpSkillResourceManifest,
} from "./acpSkillResourceManifest";

export type AcpSharedSkillCatalogEntry = {
  skillId: string;
  sourceKind: PluginSkillRegistryEntry["sourceKind"];
  checksum: string;
  sourceDir: string;
  catalogSkillRoot: string;
  skillMdPath: string;
  runnerJsonPath: string;
  resourceManifest: AcpSkillResourceManifest;
  diagnostics: PluginSkillRegistryEntry["diagnostics"];
};

export type AcpSharedSkillCatalog = {
  catalogId: string;
  catalogRoot: string;
  skillsRoot: string;
  entries: AcpSharedSkillCatalogEntry[];
  entriesById: Record<string, AcpSharedSkillCatalogEntry>;
  diagnostics: Array<{
    level: "info" | "warning" | "error";
    code: string;
    message: string;
  }>;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function fnv1a32(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function buildCatalogId(entries: PluginSkillRegistryEntry[]) {
  const key = entries
    .map((entry) => `${entry.skillId}:${entry.sourceKind}:${entry.checksum}`)
    .sort()
    .join("|");
  return `catalog-${fnv1a32(key)}`;
}

async function readJsonFile(path: string) {
  const text = await readRuntimeTextFile(path);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function buildAcpSharedSkillCatalog(args: {
  registry: PluginSkillRegistrySnapshot;
  catalogRootDir?: string;
}): Promise<AcpSharedSkillCatalog> {
  const effectiveEntries = [...args.registry.entries].sort((left, right) =>
    left.skillId.localeCompare(right.skillId),
  );
  const baseRoot =
    normalizeString(args.catalogRootDir) ||
    joinPath(getRuntimePersistencePaths().cacheDir, "acp-shared-skill-catalog");
  const catalogId = buildCatalogId(effectiveEntries);
  const catalogRoot = joinPath(baseRoot, catalogId);
  const skillsRoot = joinPath(catalogRoot, "skills");
  const indexPath = joinPath(catalogRoot, "zotero-skill-catalog.json");
  const existingIndex = await readJsonFile(indexPath);
  const canReuse =
    existingIndex?.catalogId === catalogId &&
    Array.isArray(existingIndex.entries);
  const diagnostics: AcpSharedSkillCatalog["diagnostics"] = [];
  const entries: AcpSharedSkillCatalogEntry[] = [];
  for (const entry of effectiveEntries) {
    const catalogSkillRoot = joinPath(skillsRoot, entry.skillId);
    if (!canReuse || !(await runtimePathExists(catalogSkillRoot))) {
      await copyRuntimeDirectory({
        sourceDir: entry.sourceDir,
        targetDir: catalogSkillRoot,
      });
    }
    const catalogEntry: PluginSkillRegistryEntry = {
      ...entry,
      sourceDir: catalogSkillRoot,
      skillMdPath: joinPath(catalogSkillRoot, "SKILL.md"),
      runnerJsonPath: joinPath(catalogSkillRoot, "assets", "runner.json"),
    };
    const resourceManifest = await buildAcpSkillResourceManifest(catalogEntry);
    entries.push({
      skillId: entry.skillId,
      sourceKind: entry.sourceKind,
      checksum: entry.checksum,
      sourceDir: entry.sourceDir,
      catalogSkillRoot,
      skillMdPath: catalogEntry.skillMdPath,
      runnerJsonPath: catalogEntry.runnerJsonPath,
      resourceManifest,
      diagnostics: entry.diagnostics,
    });
  }
  const index = {
    schema: "zotero-skills.acp.shared-skill-catalog.v1",
    catalogId,
    generatedAt: new Date().toISOString(),
    entries: entries.map((entry) => ({
      skillId: entry.skillId,
      sourceKind: entry.sourceKind,
      checksum: entry.checksum,
      sourceDir: entry.sourceDir,
      catalogSkillRoot: entry.catalogSkillRoot,
      resourceManifest: entry.resourceManifest,
    })),
  };
  await writeRuntimeTextFile(indexPath, JSON.stringify(index, null, 2));
  diagnostics.push({
    level: "info",
    code: canReuse ? "acp_shared_skill_catalog_reused" : "acp_shared_skill_catalog_built",
    message: `ACP shared skill catalog ${catalogId} contains ${entries.length} skill(s).`,
  });
  return {
    catalogId,
    catalogRoot,
    skillsRoot,
    entries,
    entriesById: Object.fromEntries(entries.map((entry) => [entry.skillId, entry])),
    diagnostics,
  };
}

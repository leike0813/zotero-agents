import type { PluginSkillRegistryEntry } from "./pluginSkillRegistry";
import {
  collectRuntimeFiles,
  runtimeRelativePath,
  runtimePathExists,
} from "./runtimePersistence";
import { joinPath } from "../utils/path";

export type AcpSkillResourceManifestFile = {
  relativePath: string;
  absolutePath: string;
};

export type AcpSkillResourceManifest = {
  skillId: string;
  sourceKind: PluginSkillRegistryEntry["sourceKind"];
  checksum: string;
  skillRoot: string;
  skillMdPath: string;
  assetsDir: string;
  scriptsDir: string;
  referencesDir: string;
  runnerJsonPath: string;
  files: AcpSkillResourceManifestFile[];
};

export async function buildAcpSkillResourceManifest(
  entry: PluginSkillRegistryEntry,
): Promise<AcpSkillResourceManifest> {
  const files = await collectRuntimeFiles(entry.sourceDir);
  const assetsDir = joinPath(entry.sourceDir, "assets");
  const scriptsDir = joinPath(entry.sourceDir, "scripts");
  const referencesDir = joinPath(entry.sourceDir, "references");
  return {
    skillId: entry.skillId,
    sourceKind: entry.sourceKind,
    checksum: entry.checksum,
    skillRoot: entry.sourceDir,
    skillMdPath: entry.skillMdPath,
    assetsDir,
    scriptsDir,
    referencesDir,
    runnerJsonPath: entry.runnerJsonPath,
    files: files.map((absolutePath) => ({
      relativePath: runtimeRelativePath(entry.sourceDir, absolutePath),
      absolutePath,
    })),
  };
}

export async function summarizeAcpSkillManifestAvailability(
  manifest: AcpSkillResourceManifest,
) {
  return {
    hasAssets: await runtimePathExists(manifest.assetsDir),
    hasScripts: await runtimePathExists(manifest.scriptsDir),
    hasReferences: await runtimePathExists(manifest.referencesDir),
    fileCount: manifest.files.length,
  };
}

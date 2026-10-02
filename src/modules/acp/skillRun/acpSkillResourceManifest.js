import { RUNTIME_TREE_POLICIES, runtimePathExists, scanRuntimeTree, } from "../../runtimePersistence";
import { joinPath } from "../../../utils/path";
export async function buildAcpSkillResourceManifest(entry, runtimeTreeManifest) {
    const tree = runtimeTreeManifest ||
        entry.runtimeTreeManifest ||
        (await scanRuntimeTree(entry.sourceDir, RUNTIME_TREE_POLICIES.skill));
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
        files: tree.entries
            .filter((file) => file.kind === "file")
            .map((file) => ({
            relativePath: file.relativePath,
            absolutePath: file.absolutePath,
        })),
    };
}
export async function summarizeAcpSkillManifestAvailability(manifest) {
    return {
        hasAssets: await runtimePathExists(manifest.assetsDir),
        hasScripts: await runtimePathExists(manifest.scriptsDir),
        hasReferences: await runtimePathExists(manifest.referencesDir),
        fileCount: manifest.files.length,
    };
}

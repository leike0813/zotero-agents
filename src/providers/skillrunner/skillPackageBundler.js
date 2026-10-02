import { listRuntimeChildren, readRuntimeBytes, runtimeRelativePath, statRuntimePath, } from "../../modules/runtimePersistence";
import { scanPluginSkillRegistry } from "../../modules/workflow/catalog/pluginSkillRegistry";
import { createZipFromNamedFiles } from "./zipTransport";
const EXCLUDED_DIR_NAMES = new Set([
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
]);
const EXCLUDED_FILE_NAMES = new Set([".DS_Store", "Thumbs.db"]);
function normalizePath(input) {
    return String(input || "").replace(/\\/g, "/");
}
function normalizeSkillId(value) {
    return String(value || "").trim();
}
function pathSegments(relativePath) {
    return normalizePath(relativePath).split("/").filter(Boolean);
}
function shouldExcludeRelativePath(relativePath) {
    const segments = pathSegments(relativePath);
    const basename = segments[segments.length - 1] || "";
    return (segments.some((segment) => EXCLUDED_DIR_NAMES.has(segment)) ||
        EXCLUDED_FILE_NAMES.has(basename) ||
        basename.endsWith(".pyc") ||
        basename.endsWith(".pyo"));
}
async function collectPackageFiles(root) {
    const files = [];
    async function visit(dir) {
        for (const child of await listRuntimeChildren(dir)) {
            const relativePath = runtimeRelativePath(root, child);
            if (shouldExcludeRelativePath(relativePath)) {
                continue;
            }
            const stat = await statRuntimePath(child);
            if (!stat.exists) {
                continue;
            }
            if (stat.isDir) {
                await visit(child);
            }
            else {
                files.push(child);
            }
        }
    }
    await visit(root);
    return files.sort((left, right) => normalizePath(runtimeRelativePath(root, left)).localeCompare(normalizePath(runtimeRelativePath(root, right))));
}
export async function buildSkillRunnerSkillPackageBundle(args) {
    const skillId = normalizeSkillId(args.skillId);
    if (!skillId) {
        throw new Error("SkillRunner local package source requires skill_id");
    }
    const registry = await scanPluginSkillRegistry({
        userRoot: args.userRoot,
        builtinRoot: args.builtinRoot,
    });
    const entry = registry.entriesById[skillId];
    if (!entry) {
        throw new Error(`SkillRunner local skill package not found for skill_id='${skillId}'. ` +
            `Install the skill under skills/ or skills_builtin/, or set request.create.skill_source='installed' to use a backend-installed skill.`);
    }
    const files = await collectPackageFiles(entry.sourceDir);
    const zipEntries = [];
    for (const filePath of files) {
        const relativePath = normalizePath(runtimeRelativePath(entry.sourceDir, filePath));
        zipEntries.push({
            name: `${skillId}/${relativePath}`,
            data: await readRuntimeBytes(filePath),
        });
    }
    return {
        skillId,
        sourceDir: entry.sourceDir,
        zipBytes: createZipFromNamedFiles(zipEntries),
        fileCount: zipEntries.length,
    };
}

const MIB = 1024 * 1024;
export const RUNTIME_TREE_POLICIES = Object.freeze({
    skill: Object.freeze({
        name: "skill",
        warningBudget: Object.freeze({
            depth: 64,
            entries: 20_000,
            bytes: 512 * MIB,
        }),
    }),
    "workspace-result": Object.freeze({
        name: "workspace-result",
        warningBudget: Object.freeze({ depth: 64, entries: 20_000 }),
        excludedRootDirectories: Object.freeze([".acp", "result"]),
    }),
    "agent-run-bundle": Object.freeze({
        name: "agent-run-bundle",
        warningBudget: Object.freeze({
            depth: 64,
            entries: 10_000,
            bytes: 512 * MIB,
        }),
    }),
    general: Object.freeze({
        name: "general",
        warningBudget: Object.freeze({
            depth: 64,
            entries: 50_000,
            bytes: 1024 * MIB,
        }),
    }),
});
const BASE_EXCLUDED_DIRECTORIES = new Set([
    ".git",
    "node_modules",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
]);
function normalizeSlashes(path) {
    return String(path || "").replace(/\\/g, "/");
}
function baseName(path) {
    return normalizeSlashes(path).split("/").filter(Boolean).pop() || "";
}
function joinRelative(parent, name) {
    return parent ? `${parent}/${name}` : name;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error || "");
}
function isExcludedDirectory(name, relativePath, policy) {
    return (BASE_EXCLUDED_DIRECTORIES.has(name) ||
        (!relativePath.includes("/") &&
            (policy.excludedRootDirectories || []).includes(name)));
}
function isExcludedFile(name) {
    return name.endsWith(".pyc") || name.endsWith(".pyo");
}
function buildWarnings(args) {
    const warnings = [];
    const add = (code, observed, budget) => {
        if (budget !== undefined && observed > budget) {
            warnings.push({ code, policy: args.policy.name, observed, budget });
        }
    };
    add("runtime_tree_depth_observed", args.maxDepth, args.policy.warningBudget.depth);
    add("runtime_tree_entries_observed", args.entries, args.policy.warningBudget.entries);
    add("runtime_tree_bytes_observed", args.bytes, args.policy.warningBudget.bytes);
    return warnings;
}
export async function scanRuntimeTreeWithIo(args) {
    const root = String(args.root || "")
        .trim()
        .replace(/[\\/]+$/g, "");
    const entries = [];
    const issues = [];
    let rootStat;
    try {
        rootStat = await args.io.stat(root);
    }
    catch (error) {
        issues.push({
            code: "runtime_tree_stat_failed",
            relativePath: "",
            message: errorMessage(error),
        });
    }
    if (!rootStat?.exists || !rootStat.isDir) {
        if (!issues.length) {
            issues.push({
                code: "runtime_tree_stat_failed",
                relativePath: "",
                message: "runtime tree root is unavailable",
            });
        }
        return {
            root,
            entries,
            fileCount: 0,
            directoryCount: 0,
            totalBytes: 0,
            maxDepth: 0,
            issues,
            warnings: [],
        };
    }
    const pending = [
        { absolutePath: root, relativePath: "" },
    ];
    while (pending.length) {
        const current = pending.pop();
        let children;
        try {
            children = await args.io.list(current.absolutePath);
        }
        catch (error) {
            issues.push({
                code: "runtime_tree_list_failed",
                relativePath: current.relativePath,
                message: errorMessage(error),
            });
            continue;
        }
        for (const absolutePath of [...children].sort((left, right) => normalizeSlashes(left).localeCompare(normalizeSlashes(right)))) {
            const name = baseName(absolutePath);
            const relativePath = joinRelative(current.relativePath, name);
            let stat;
            try {
                stat = await args.io.stat(absolutePath);
            }
            catch (error) {
                issues.push({
                    code: "runtime_tree_stat_failed",
                    relativePath,
                    message: errorMessage(error),
                });
                continue;
            }
            if (!stat.exists) {
                issues.push({
                    code: "runtime_tree_stat_failed",
                    relativePath,
                    message: "runtime tree entry is unavailable",
                });
                continue;
            }
            if (stat.isDir) {
                if (isExcludedDirectory(name, relativePath, args.policy))
                    continue;
                entries.push({
                    relativePath,
                    absolutePath,
                    kind: "directory",
                    size: 0,
                    ...(stat.lastModified ? { mtime: stat.lastModified } : {}),
                });
                pending.push({ absolutePath, relativePath });
            }
            else if (!isExcludedFile(name)) {
                entries.push({
                    relativePath,
                    absolutePath,
                    kind: "file",
                    size: Math.max(0, Number(stat.size || 0) || 0),
                    ...(stat.lastModified ? { mtime: stat.lastModified } : {}),
                });
            }
        }
    }
    entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    const files = entries.filter((entry) => entry.kind === "file");
    const directories = entries.length - files.length;
    const totalBytes = files.reduce((total, entry) => total + entry.size, 0);
    const maxDepth = entries.reduce((maximum, entry) => Math.max(maximum, entry.relativePath.split("/").filter(Boolean).length), 0);
    return {
        root,
        entries,
        fileCount: files.length,
        directoryCount: directories,
        totalBytes,
        maxDepth,
        issues,
        warnings: buildWarnings({
            policy: args.policy,
            maxDepth,
            entries: entries.length,
            bytes: totalBytes,
        }),
    };
}
export function rebaseRuntimeTreeManifest(manifest, targetRoot) {
    const root = String(targetRoot || "").replace(/[\\/]+$/g, "");
    return {
        ...manifest,
        root,
        entries: manifest.entries.map((entry) => ({
            ...entry,
            absolutePath: `${root}/${entry.relativePath}`.replace(/\\/g, "/"),
        })),
    };
}

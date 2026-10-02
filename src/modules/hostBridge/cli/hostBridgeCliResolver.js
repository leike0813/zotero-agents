import { joinPath } from "../../../utils/path";
import { readRuntimeEnv, readRuntimePathEnv, splitPathEntries, } from "../../../platform/env";
import { detectRuntimePlatform } from "../../../platform/runtimePlatform";
import { runtimePathExists } from "../../runtimePersistence";
function normalizeString(value) {
    return String(value || "").trim();
}
function dirname(pathRaw) {
    const path = normalizeString(pathRaw);
    const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    return index > 0 ? path.slice(0, index) : "";
}
function resolveRuntimeEnv(name) {
    return readRuntimeEnv(name);
}
function resolveRuntimePathEnv() {
    return readRuntimePathEnv();
}
function buildPathCandidates(args) {
    return uniqueStrings(splitPathEntries(args.pathValue).map((entry) => joinPath(entry, args.binary)));
}
function resolveRuntimePlatform() {
    const runtime = globalThis;
    return resolveHostBridgeCliPlatform({
        platform: detectRuntimePlatform(),
        arch: runtime.process?.arch,
    });
}
export function resolveHostBridgeCliPlatform(args) {
    const platform = normalizeString(args.platform).toLowerCase();
    const arch = normalizeString(args.arch).toLowerCase();
    if (platform === "win32") {
        return { dir: "win32-x64", binary: "zotero-bridge.exe" };
    }
    if (platform === "darwin") {
        return {
            dir: arch === "arm64" ? "darwin-arm64" : "darwin-x64",
            binary: "zotero-bridge",
        };
    }
    if (platform === "linux") {
        const dir = arch === "ia32" || arch === "x86" || arch === "x32"
            ? "linux-x86"
            : arch === "arm"
                ? "linux-arm"
                : arch === "arm64" || arch === "aarch64"
                    ? "linux-arm64"
                    : "linux-x64";
        return { dir, binary: "zotero-bridge" };
    }
    return { dir: "unknown", binary: "zotero-bridge" };
}
function resolveRuntimeCwd() {
    const runtime = globalThis;
    return normalizeString(runtime.process?.cwd?.()) || ".";
}
function resolveRuntimeRootPath() {
    try {
        if (typeof rootPath === "string") {
            return normalizeString(rootPath);
        }
    }
    catch {
        // Fall back to object property lookup below.
    }
    const runtime = globalThis;
    return normalizeString(runtime.rootPath);
}
function uniqueStrings(values) {
    return Array.from(new Set(values.map(normalizeString).filter(Boolean)));
}
function parentPath(pathRaw) {
    const path = normalizeString(pathRaw).replace(/[\\/]+$/, "");
    const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    return index > 0 ? path.slice(0, index) : "";
}
function candidateRoots(...roots) {
    const candidates = [];
    for (const root of roots.map(normalizeString).filter(Boolean)) {
        let current = root;
        for (let depth = 0; current && depth < 4; depth += 1) {
            candidates.push(current);
            const parent = parentPath(current);
            if (!parent || parent === current) {
                break;
            }
            current = parent;
        }
    }
    return uniqueStrings(candidates);
}
function buildBundledCandidates(args) {
    const candidates = [];
    for (const root of candidateRoots(...args.roots)) {
        candidates.push(joinPath(root, "bin", args.platformDir, args.binary));
        candidates.push(joinPath(root, "addon", "bin", args.platformDir, args.binary));
    }
    return uniqueStrings(candidates);
}
export async function resolveHostBridgeCliBinary() {
    const envOverride = resolveRuntimeEnv("ZOTERO_BRIDGE_CLI");
    const checkedPaths = [];
    if (envOverride) {
        checkedPaths.push(envOverride);
        if (await runtimePathExists(envOverride)) {
            return {
                available: true,
                binaryPath: envOverride,
                cliDir: dirname(envOverride),
                source: "env",
            };
        }
    }
    const platform = resolveRuntimePlatform();
    const runtimeRoot = resolveRuntimeRootPath();
    const runtimeCwd = resolveRuntimeCwd();
    const bundledCandidates = buildBundledCandidates({
        roots: [runtimeRoot, runtimeCwd],
        platformDir: platform.dir,
        binary: platform.binary,
    });
    for (const bundled of bundledCandidates) {
        checkedPaths.push(bundled);
        if (await runtimePathExists(bundled)) {
            return {
                available: true,
                binaryPath: bundled,
                cliDir: dirname(bundled),
                source: "bundled",
            };
        }
    }
    const pathCandidates = buildPathCandidates({
        pathValue: resolveRuntimePathEnv(),
        binary: platform.binary,
    });
    for (const pathCandidate of pathCandidates) {
        checkedPaths.push(pathCandidate);
        if (await runtimePathExists(pathCandidate)) {
            return {
                available: true,
                binaryPath: pathCandidate,
                cliDir: dirname(pathCandidate),
                source: "path",
            };
        }
    }
    return {
        available: false,
        code: "cli_binary_unavailable",
        message: "No Host Bridge CLI binary is available for this platform. Set ZOTERO_BRIDGE_CLI for development or package platform binaries in a later phase.",
        checkedPaths,
    };
}
export const hostBridgeCliResolverInternalsForTests = {
    dirname,
    parentPath,
    candidateRoots,
    buildBundledCandidates,
    buildPathCandidates,
    resolveRuntimePathEnv,
    resolveRuntimePlatform,
    resolveRuntimeRootPath,
    resolveHostBridgeCliPlatform,
};

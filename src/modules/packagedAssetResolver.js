import { joinPath } from "../utils/path";
import { config } from "../../package.json";
import { readRuntimeBytes, runtimePathExists, writeRuntimeBytes, } from "./runtimePersistence";
function normalizeString(value) {
    return String(value || "").trim();
}
function normalizeRelativePath(value) {
    return normalizeString(value).replace(/\\/g, "/").replace(/^\/+/g, "");
}
function ensureTrailingSlash(value) {
    const text = normalizeString(value);
    return text && !text.endsWith("/") ? `${text}/` : text;
}
function dirname(pathRaw) {
    const path = normalizeString(pathRaw);
    const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    return index > 0 ? path.slice(0, index) : "";
}
function parentPath(pathRaw) {
    const path = normalizeString(pathRaw).replace(/[\\/]+$/, "");
    const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    return index > 0 ? path.slice(0, index) : "";
}
function uniqueStrings(values) {
    return Array.from(new Set(values.map(normalizeString).filter(Boolean)));
}
function resolveInstalledAddonPackagedAssetRoots() {
    try {
        const runtime = globalThis;
        return runtime.Zotero?.[config.addonInstance]?.data?.packagedAssets || {};
    }
    catch {
        return {};
    }
}
export function resolveRuntimeRootURI() {
    try {
        if (typeof rootURI === "string") {
            return normalizeString(rootURI);
        }
    }
    catch {
        // Fall back to object property lookup below.
    }
    const runtime = globalThis;
    return (normalizeString(runtime.rootURI) ||
        normalizeString(resolveInstalledAddonPackagedAssetRoots().rootURI));
}
export function resolveRuntimeResourceURI() {
    try {
        if (typeof resourceURI === "string") {
            return normalizeString(resourceURI);
        }
    }
    catch {
        // Fall back to object property lookup below.
    }
    const runtime = globalThis;
    return (normalizeString(runtime.resourceURI) ||
        normalizeString(resolveInstalledAddonPackagedAssetRoots().resourceURI));
}
export function resolveRuntimeRootPath() {
    try {
        if (typeof rootPath === "string") {
            return normalizeString(rootPath);
        }
    }
    catch {
        // Fall back to object property lookup below.
    }
    const runtime = globalThis;
    return (normalizeString(runtime.rootPath) ||
        normalizeString(resolveInstalledAddonPackagedAssetRoots().rootPath));
}
export function resolveRuntimeCwd() {
    const runtime = globalThis;
    return normalizeString(runtime.process?.cwd?.()) || ".";
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
export function buildPackagedAssetCandidates(relativePathRaw) {
    const relativePath = normalizeRelativePath(relativePathRaw);
    const rootURI = resolveRuntimeRootURI();
    const resourceURI = resolveRuntimeResourceURI();
    const rootPath = resolveRuntimeRootPath();
    const cwd = resolveRuntimeCwd();
    const checkedUris = uniqueStrings([rootURI, resourceURI]
        .map(ensureTrailingSlash)
        .filter(Boolean)
        .map((base) => `${base}${relativePath}`));
    const checkedPaths = uniqueStrings(candidateRoots(rootPath, cwd).flatMap((root) => [
        joinPath(root, relativePath),
        joinPath(root, "addon", relativePath),
    ]));
    return {
        rootURI,
        resourceURI,
        rootPath,
        cwd,
        checkedUris,
        checkedPaths,
    };
}
function createDiagnostics(candidates) {
    return {
        rootURI: candidates.rootURI,
        resourceURI: candidates.resourceURI,
        rootPath: candidates.rootPath,
        cwd: candidates.cwd,
        checkedUris: candidates.checkedUris,
        checkedPaths: candidates.checkedPaths,
        failures: [],
    };
}
function recordFailure(diagnostics, label, source, error) {
    diagnostics.failures.push({
        label,
        source,
        message: error instanceof Error ? error.message : String(error || ""),
    });
}
async function readUriBinaryWithFetch(uri) {
    const runtime = globalThis;
    if (typeof runtime.fetch !== "function") {
        throw new Error("fetch is unavailable");
    }
    const response = await runtime.fetch(uri);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
}
async function readUriBinaryWithXhr(uri) {
    const runtime = globalThis;
    const Xhr = runtime.XMLHttpRequest;
    if (typeof Xhr !== "function") {
        throw new Error("XMLHttpRequest is unavailable");
    }
    return new Promise((resolve, reject) => {
        const request = new Xhr();
        request.open("GET", uri, true);
        request.responseType = "arraybuffer";
        request.onload = () => {
            if (request.status === 0 ||
                (request.status >= 200 && request.status < 300)) {
                resolve(new Uint8Array(request.response));
                return;
            }
            reject(new Error(`HTTP ${request.status}`));
        };
        request.onerror = () => reject(new Error("request failed"));
        request.send();
    });
}
async function readPathBinary(path) {
    if (!(await runtimePathExists(path))) {
        throw new Error("path does not exist");
    }
    return readRuntimeBytes(path);
}
export async function writeBinaryFile(targetPath, bytes, options) {
    await writeRuntimeBytes(targetPath, bytes, options);
}
export async function readPackagedBinaryAsset(relativePath) {
    const candidates = buildPackagedAssetCandidates(relativePath);
    const diagnostics = createDiagnostics(candidates);
    for (const uri of candidates.checkedUris) {
        try {
            return {
                ok: true,
                bytes: await readUriBinaryWithFetch(uri),
                source: { label: "root-or-resource-uri-fetch", source: uri, uri },
                diagnostics,
            };
        }
        catch (error) {
            recordFailure(diagnostics, "uri-fetch", uri, error);
        }
        try {
            return {
                ok: true,
                bytes: await readUriBinaryWithXhr(uri),
                source: { label: "root-or-resource-uri-xhr", source: uri, uri },
                diagnostics,
            };
        }
        catch (error) {
            recordFailure(diagnostics, "uri-xhr", uri, error);
        }
    }
    for (const path of candidates.checkedPaths) {
        try {
            return {
                ok: true,
                bytes: await readPathBinary(path),
                source: { label: "runtime-path", source: path, path },
                diagnostics,
            };
        }
        catch (error) {
            recordFailure(diagnostics, "runtime-path", path, error);
        }
    }
    return { ok: false, diagnostics };
}
export async function copyPackagedBinaryAsset(args) {
    const read = await readPackagedBinaryAsset(args.relativePath);
    if (!read.ok) {
        return read;
    }
    await writeBinaryFile(args.targetPath, read.bytes, {
        overwrite: args.overwrite,
    });
    return {
        ok: true,
        source: read.source,
        diagnostics: read.diagnostics,
    };
}
export const packagedAssetResolverInternalsForTests = {
    dirname,
    parentPath,
    candidateRoots,
    normalizeRelativePath,
    buildPackagedAssetCandidates,
};

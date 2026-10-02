import { joinPath } from "../../utils/path";
import { ZipBundleReader } from "../../workflows/zipBundleReader";
import { readRuntimeBytes, readRuntimeTextFile, removeRuntimePath, resolveRuntimeTemporaryDirectory, runtimePathExists, writeRuntimeBytes, } from "../runtimePersistence";
export function buildTempBundlePath(requestId) {
    const tempDir = resolveRuntimeTemporaryDirectory();
    const stamp = Date.now().toString(36);
    return joinPath(tempDir, `zotero-skills-${requestId}-${stamp}.zip`);
}
export async function writeBytes(filePath, bytes) {
    await writeRuntimeBytes(filePath, bytes, { overwrite: true });
}
export async function removeFileIfExists(filePath) {
    await removeRuntimePath(filePath);
}
export function createUnavailableBundleReader(requestId) {
    return {
        readText: async (entryPath) => {
            throw new Error(`Run ${requestId} does not provide bundle content; entry unavailable: ${entryPath}`);
        },
    };
}
function normalizeEntryPath(entryPath) {
    return String(entryPath || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/g, "")
        .split("/")
        .filter((segment) => segment && segment !== "." && segment !== "..")
        .join("/");
}
export function createDirectoryBundleReader(rootDir) {
    const resolveEntry = async (entryPath) => {
        const normalized = normalizeEntryPath(entryPath);
        if (!normalized) {
            throw new Error("bundle entry path is required");
        }
        const filePath = joinPath(rootDir, normalized);
        if (!(await runtimePathExists(filePath))) {
            throw new Error(`bundle entry not found: ${normalized}`);
        }
        return filePath;
    };
    return {
        readText: async (entryPath) => {
            return readRuntimeTextFile(await resolveEntry(entryPath));
        },
        readBytes: async (entryPath) => readRuntimeBytes(await resolveEntry(entryPath)),
        getExtractedDir: async () => rootDir,
    };
}
export async function openRunResultBundleReader(args) {
    let bundlePath = "";
    let bundleReader = createUnavailableBundleReader(args.requestId);
    if (args.result.bundleBytes && args.result.bundleBytes.length > 0) {
        bundlePath = buildTempBundlePath(args.requestId);
        await writeBytes(bundlePath, args.result.bundleBytes);
        bundleReader = new ZipBundleReader(bundlePath);
    }
    else if (args.result.bundleDir) {
        bundleReader = createDirectoryBundleReader(args.result.bundleDir);
    }
    let disposed = false;
    return {
        bundleReader,
        bundlePath,
        dispose: async () => {
            if (disposed) {
                return;
            }
            disposed = true;
            if (bundlePath) {
                await removeFileIfExists(bundlePath);
            }
        },
    };
}

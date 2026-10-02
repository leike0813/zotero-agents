import { copyRuntimeFile, ensureRuntimeDirectoryStrict, isRuntimePathInspectionUnavailableError, listRuntimeChildrenStrict, moveRuntimePath, readRuntimeBytes, readRuntimeTextFileStrict, removeRuntimePath, resolveRuntimeTemporaryDirectory, runtimePathExists, statRuntimePath, statRuntimePathStrict, writeRuntimeBytes, writeRuntimeTextFileStrict, } from "../modules/runtimePersistence";
import { openRuntimeFilePicker } from "../platform/filePicker";
import { getBaseName, getParentPath, normalizeNativeLocalPath, } from "../platform/path";
import { joinPath } from "../utils/path";
import { assertWorkflowCallNotCanceled, createWorkflowHostError, } from "./workflowHostErrorContract";
const FILE_LIMITS = Object.freeze({
    readTextBytes: 64 * 1024 * 1024,
    readBytes: 256 * 1024 * 1024,
    transferBytes: 4 * 1024 * 1024 * 1024,
    entries: 100_000,
    depth: 64,
    pathCharacters: 4_096,
    pickerFilterGroups: 32,
    pickerFilterExtensions: 64,
});
function invalidRequest(reason, field, message) {
    return createWorkflowHostError("invalid_request", message, {
        reason,
        field,
    });
}
function resourceLimited(resource, limit, observed) {
    return createWorkflowHostError("resource_limited", "Workflow file operation exceeds a fixed limit", {
        resource,
        limit,
        ...(typeof observed === "number" ? { observed } : {}),
    });
}
function unavailable(message) {
    return createWorkflowHostError("unavailable", message, {
        reason: "filesystem",
    });
}
function notFound() {
    return createWorkflowHostError("not_found", "Workflow file target does not exist", { kind: "resource" });
}
function requirePath(value, field = "path") {
    const raw = String(value || "");
    if (raw.length > FILE_LIMITS.pathCharacters) {
        throw resourceLimited("path_length", FILE_LIMITS.pathCharacters, raw.length);
    }
    const path = normalizeNativeLocalPath(raw);
    if (!path) {
        throw invalidRequest("invalid_value", field, "Workflow file path is invalid");
    }
    return path;
}
function relativePath(root, path) {
    const normalizedRoot = root.replace(/\\/g, "/").replace(/\/+$/, "");
    const normalizedPath = path.replace(/\\/g, "/");
    if (!normalizedPath.startsWith(`${normalizedRoot}/`)) {
        throw createWorkflowHostError("permission_denied", "Workflow file listing escaped its root", { reason: "security_policy" });
    }
    return normalizedPath.slice(normalizedRoot.length + 1);
}
function statDto(path, stat) {
    return {
        path,
        kind: stat.isDir ? "directory" : "file",
        sizeBytes: stat.isDir ? null : stat.size,
        modifiedAt: typeof stat.lastModified === "number"
            ? new Date(stat.lastModified).toISOString()
            : null,
    };
}
async function inspectExistingFile(path) {
    try {
        const stat = await statRuntimePathStrict(path);
        if (!stat.exists || stat.isDir)
            throw notFound();
        return stat;
    }
    catch (error) {
        if (isRuntimePathInspectionUnavailableError(error))
            throw error;
        if (error?.name === "WorkflowHostError")
            throw error;
        if (!(await runtimePathExists(path)))
            throw notFound();
        throw unavailable("Workflow file cannot be inspected in this runtime");
    }
}
async function assertFileSize(path, limit) {
    const stat = await inspectExistingFile(path);
    if (stat.size > limit) {
        throw resourceLimited("bytes", limit, stat.size);
    }
    return stat;
}
async function atomicWrite(targetPath, write) {
    const temporaryPath = joinPath(getParentPath(targetPath), `.${getBaseName(targetPath)}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    let committed = false;
    try {
        await write(temporaryPath);
        await moveRuntimePath({
            sourcePath: temporaryPath,
            targetPath,
            overwrite: true,
        });
        committed = true;
    }
    finally {
        if (!committed)
            await removeRuntimePath(temporaryPath).catch(() => false);
    }
}
function normalizePickerFilters(filters) {
    if (typeof filters === "undefined")
        return undefined;
    if (!Array.isArray(filters)) {
        throw invalidRequest("invalid_type", "filters", "Workflow picker filters must be an array");
    }
    if (filters.length > FILE_LIMITS.pickerFilterGroups) {
        throw resourceLimited("selection", FILE_LIMITS.pickerFilterGroups, filters.length);
    }
    return filters.map((filter) => {
        const label = String(filter?.label || "").trim();
        const extensions = Array.isArray(filter?.extensions)
            ? filter.extensions
                .map((extension) => String(extension || "")
                .trim()
                .replace(/^\*?\.+/, ""))
                .filter(Boolean)
            : [];
        if (!label || extensions.length === 0) {
            throw invalidRequest("invalid_value", "filters", "Workflow picker filters require a label and extensions");
        }
        if (extensions.length > FILE_LIMITS.pickerFilterExtensions) {
            throw resourceLimited("selection", FILE_LIMITS.pickerFilterExtensions, extensions.length);
        }
        return [label, extensions.map((extension) => `*.${extension}`).join(";")];
    });
}
function pickerArgs(args) {
    return {
        title: args?.title,
        directory: args?.initialDirectory,
        filters: normalizePickerFilters(args?.filters),
        suggestion: typeof args?.suggestedName ===
            "string"
            ? args.suggestedName
            : undefined,
    };
}
export function createWorkflowFileApi() {
    return {
        async readText(pathRaw, control) {
            assertWorkflowCallNotCanceled(control);
            const path = requirePath(pathRaw);
            try {
                await assertFileSize(path, FILE_LIMITS.readTextBytes);
            }
            catch (error) {
                // Some runtimes cannot stat URL-like paths that remain readable;
                // only the stable inspection-unavailable classification falls through.
                if (!isRuntimePathInspectionUnavailableError(error)) {
                    throw error;
                }
            }
            const text = await readRuntimeTextFileStrict(path).catch(() => {
                throw unavailable("Workflow file read failed in this runtime");
            });
            if (new TextEncoder().encode(text).length > FILE_LIMITS.readTextBytes) {
                throw resourceLimited("bytes", FILE_LIMITS.readTextBytes);
            }
            assertWorkflowCallNotCanceled(control);
            return text;
        },
        async writeText(pathRaw, content, control) {
            assertWorkflowCallNotCanceled(control);
            const path = requirePath(pathRaw);
            const text = String(content ?? "");
            if (new TextEncoder().encode(text).length > FILE_LIMITS.transferBytes) {
                throw resourceLimited("bytes", FILE_LIMITS.transferBytes);
            }
            await atomicWrite(path, (temporaryPath) => writeRuntimeTextFileStrict(temporaryPath, text));
            assertWorkflowCallNotCanceled(control);
        },
        async readBytes(pathRaw, control) {
            assertWorkflowCallNotCanceled(control);
            const path = requirePath(pathRaw);
            try {
                await assertFileSize(path, FILE_LIMITS.readBytes);
            }
            catch (error) {
                // Same tolerance as readText: readable paths that cannot be stat-ed.
                if (!isRuntimePathInspectionUnavailableError(error)) {
                    throw error;
                }
            }
            const bytes = await readRuntimeBytes(path);
            assertWorkflowCallNotCanceled(control);
            return bytes;
        },
        async writeBytes(pathRaw, bytes, control) {
            assertWorkflowCallNotCanceled(control);
            const path = requirePath(pathRaw);
            const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            if (view.byteLength > FILE_LIMITS.transferBytes) {
                throw resourceLimited("bytes", FILE_LIMITS.transferBytes);
            }
            await atomicWrite(path, (temporaryPath) => writeRuntimeBytes(temporaryPath, view, { overwrite: false }));
            assertWorkflowCallNotCanceled(control);
        },
        async copy(args, control) {
            assertWorkflowCallNotCanceled(control);
            const sourcePath = requirePath(args?.sourcePath, "sourcePath");
            const targetPath = requirePath(args?.targetPath, "targetPath");
            try {
                await assertFileSize(sourcePath, FILE_LIMITS.transferBytes);
            }
            catch (error) {
                if (isRuntimePathInspectionUnavailableError(error)) {
                    throw unavailable("Workflow file cannot be inspected in this runtime");
                }
                throw error;
            }
            const overwrite = args?.overwrite === true;
            if (!overwrite && (await runtimePathExists(targetPath))) {
                throw createWorkflowHostError("conflict", "Workflow file copy target already exists", { reason: "ambiguous_state" });
            }
            if (overwrite && (await runtimePathExists(targetPath))) {
                await removeRuntimePath(targetPath);
            }
            await copyRuntimeFile({ sourcePath, targetPath });
            assertWorkflowCallNotCanceled(control);
        },
        async exists(pathRaw, control) {
            assertWorkflowCallNotCanceled(control);
            try {
                return await runtimePathExists(requirePath(pathRaw));
            }
            catch {
                return false;
            }
        },
        async makeDirectory(args, control) {
            assertWorkflowCallNotCanceled(control);
            const path = requirePath(args?.path);
            if (args?.recursive === false) {
                const parentStat = await statRuntimePath(getParentPath(path));
                if (!parentStat.exists || !parentStat.isDir) {
                    throw notFound();
                }
            }
            await ensureRuntimeDirectoryStrict(path);
            assertWorkflowCallNotCanceled(control);
        },
        async stat(pathRaw, control) {
            assertWorkflowCallNotCanceled(control);
            const path = requirePath(pathRaw);
            try {
                const stat = await statRuntimePathStrict(path);
                if (!stat.exists)
                    throw notFound();
                return statDto(path, stat);
            }
            catch (error) {
                if (isRuntimePathInspectionUnavailableError(error)) {
                    throw unavailable("Workflow file cannot be inspected in this runtime");
                }
                if (error?.name === "WorkflowHostError")
                    throw error;
                if (!(await runtimePathExists(path)))
                    throw notFound();
                throw unavailable("Workflow file cannot be inspected in this runtime");
            }
        },
        async list(args, control) {
            assertWorkflowCallNotCanceled(control);
            const rootPath = requirePath(args?.path);
            const recursive = args?.recursive === true;
            const requestedDepth = args?.maxDepth;
            if (typeof requestedDepth !== "undefined" &&
                (!Number.isSafeInteger(requestedDepth) || Number(requestedDepth) < 0)) {
                throw invalidRequest("invalid_value", "maxDepth", "Workflow file list maxDepth must be a non-negative integer");
            }
            if (Number(requestedDepth) > FILE_LIMITS.depth) {
                throw resourceLimited("depth", FILE_LIMITS.depth, Number(requestedDepth));
            }
            // A caller-provided maxDepth bounds traversal silently; only the fixed
            // hard depth limit fails with resource_limited.
            const depthBound = typeof requestedDepth === "number"
                ? Number(requestedDepth)
                : Number.POSITIVE_INFINITY;
            const rootStat = await statRuntimePathStrict(rootPath).catch((error) => {
                if (isRuntimePathInspectionUnavailableError(error)) {
                    throw unavailable("Workflow file cannot be inspected in this runtime");
                }
                throw error;
            });
            if (!rootStat.exists)
                throw notFound();
            if (!rootStat.isDir) {
                throw invalidRequest("invalid_value", "path", "Workflow file list root is not a directory");
            }
            const entries = [];
            const pending = [{ path: rootPath, depth: 0 }];
            let totalFileBytes = 0;
            while (pending.length) {
                assertWorkflowCallNotCanceled(control);
                const current = pending.shift();
                const children = (await listRuntimeChildrenStrict(current.path)).sort();
                for (const child of children) {
                    const stat = await statRuntimePathStrict(child);
                    const entry = statDto(child, stat);
                    entries.push({
                        relativePath: relativePath(rootPath, child),
                        kind: entry.kind,
                        sizeBytes: entry.sizeBytes,
                        modifiedAt: entry.modifiedAt,
                    });
                    if (entries.length > FILE_LIMITS.entries) {
                        throw resourceLimited("entries", FILE_LIMITS.entries);
                    }
                    if (entry.kind === "file")
                        totalFileBytes += entry.sizeBytes || 0;
                    if (recursive && entry.kind === "directory") {
                        const nextDepth = current.depth + 1;
                        if (nextDepth > FILE_LIMITS.depth) {
                            throw resourceLimited("depth", FILE_LIMITS.depth, nextDepth);
                        }
                        if (current.depth < depthBound) {
                            pending.push({ path: child, depth: nextDepth });
                        }
                    }
                }
            }
            entries.sort((left, right) => left.relativePath < right.relativePath
                ? -1
                : left.relativePath > right.relativePath
                    ? 1
                    : 0);
            assertWorkflowCallNotCanceled(control);
            return {
                rootPath,
                entries,
                totalEntries: entries.length,
                totalFileBytes,
            };
        },
        async move(args, control) {
            assertWorkflowCallNotCanceled(control);
            await moveRuntimePath({
                sourcePath: requirePath(args?.sourcePath, "sourcePath"),
                targetPath: requirePath(args?.targetPath, "targetPath"),
                overwrite: args?.overwrite === true,
            });
            assertWorkflowCallNotCanceled(control);
        },
        async remove(args, control) {
            assertWorkflowCallNotCanceled(control);
            const path = requirePath(args?.path);
            if (!(await runtimePathExists(path))) {
                if (args?.missing === "ignore")
                    return { removed: false };
                throw notFound();
            }
            const stat = await statRuntimePathStrict(path);
            if (stat.isDir && args?.recursive !== true) {
                const children = await listRuntimeChildrenStrict(path);
                if (children.length) {
                    throw invalidRequest("invalid_combination", "recursive", "Recursive workflow directory removal was not requested");
                }
            }
            const removed = await removeRuntimePath(path);
            assertWorkflowCallNotCanceled(control);
            return { removed };
        },
        getTempDirectoryPath() {
            try {
                return resolveRuntimeTemporaryDirectory();
            }
            catch {
                throw createWorkflowHostError("unavailable", "Runtime temporary directory is unavailable", { reason: "runtime" });
            }
        },
        pickDirectory: (args) => openRuntimeFilePicker({
            ...pickerArgs(args),
            mode: "folder",
        }),
        pickFile: (args) => openRuntimeFilePicker({
            ...pickerArgs(args),
            mode: "open",
        }),
        pickSaveFile: (args) => openRuntimeFilePicker({
            ...pickerArgs(args),
            mode: "save",
        }),
        pickFiles: (args) => openRuntimeFilePicker({
            ...pickerArgs(args),
            mode: "multiple",
        }),
    };
}
export const workflowFileLimits = FILE_LIMITS;

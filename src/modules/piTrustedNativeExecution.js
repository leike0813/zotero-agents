import { listRuntimeChildrenStrict, readRuntimeBytes, readRuntimeTextFileStrict, replaceRuntimeTextFileAtomically, resolveRuntimePathIdentity, scanRuntimeUtf8Lines, statRuntimePathStrict, copyRuntimeFile, moveRuntimePath, removeRuntimePath, runtimePathExists, setRuntimeFilePermissions, writeRuntimeBytes, } from "./runtimePersistence";
import { getBaseName, joinPath } from "../utils/path";
import ignore from "ignore";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import { resolveRuntimeCommand } from "../platform/command";
import { getMozillaSubprocessModule, normalizeSubprocessExitCode, } from "../platform/subprocess";
import { appendRuntimeTextFile, ensureRuntimeDirectoryStrict, } from "./runtimePersistence";
import { digestRuntimeFileSource, inspectRuntimeFileSource, verifyRuntimeFileSource, collectRuntimeFileSourceBytes, } from "./runtimeFileTransfer";
import { sha256PrefixedHex } from "../utils/sha256";
import { getRuntimeEnvironmentSnapshot } from "../platform/env";
import { createWorkflowStoredAttachmentStager } from "../workflows/workflowStoredAttachmentImport";
import { PI_TOOL_SHELL_DEFAULT_DEADLINE_MS, PI_TOOL_SHELL_MAX_DEADLINE_MS, } from "./piToolGateway";
import { createZoteroHostPreparedFiles } from "./zoteroHost/zoteroHostPreparedFiles";
const VISIBLE_BYTES = 50 * 1024;
const VISIBLE_LINES = 2000;
const MAX_EDIT_BYTES = 50 * 1024 * 1024;
const OWNER_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;
const WORKSPACE_SCAN_MAX_DEPTH = 32;
const WORKSPACE_SCAN_MAX_ENTRIES = 20000;
// Owner diagnostics live here and are lower priority than business data: the
// owner quota counts their bytes exactly once, and an owner over quota may
// reclaim them instead of losing managed results.
const OWNER_RUNTIME_AUDIT_DIR = "runtime-audit";
const textEncoder = new TextEncoder();
const ownerLocks = new Map();
const MANAGED_FILE_MAX_BYTES = 256 * 1024 * 1024;
// In-flight private staging bytes per owner key. Concurrent stored-attachment
// preparations reserve here so they cannot each pass the shared quota check
// before any copy exists on disk; the reservation is released on every
// dispose/cleanup path.
const ownerStagedBytes = new Map();
function ownerStagedBytesFor(key) {
    return ownerStagedBytes.get(key) || 0;
}
function adjustOwnerStagedBytes(key, delta) {
    const next = Math.max(0, ownerStagedBytesFor(key) + delta);
    if (next === 0)
        ownerStagedBytes.delete(key);
    else
        ownerStagedBytes.set(key, next);
}
// Keeps a staging reservation tied to the prepared-files lifetime. It is only
// released once private cleanup is confirmed: the private owner tree is
// excluded from the workspace scan, so a retained reservation keeps accounting
// for residue that a failed cleanup leaves on disk.
function withStagingRelease(files, release) {
    return Object.freeze({
        prepareStoredAttachment: (request) => files.prepareStoredAttachment(request),
        resolveStoredAttachment: async (prepared) => {
            const resolved = await files.resolveStoredAttachment(prepared);
            return {
                ...resolved,
                cleanup: async () => {
                    try {
                        await resolved.cleanup();
                    }
                    catch {
                        throw new Error("pi_managed_cleanup_pending");
                    }
                    release();
                },
            };
        },
        dispose: async () => {
            try {
                await files.dispose();
            }
            catch {
                throw new Error("pi_managed_cleanup_pending");
            }
            release();
        },
    });
}
/** Combined Conversation user-file snapshot bounds (per send). */
export const PI_USER_FILE_SNAPSHOT_LIMITS = Object.freeze({
    maxResources: 20,
    maxFileBytes: 20 * 1024 * 1024,
    maxTotalBytes: 50 * 1024 * 1024,
});
function parseManifestEntries(parsed) {
    if (!parsed ||
        typeof parsed !== "object" ||
        parsed.version !== 1 ||
        !Array.isArray(parsed.entries) ||
        parsed.entries.length > 4096 ||
        parsed.entries.some((entry) => {
            const row = entry;
            return (!row ||
                !["source", "generated", "snapshot"].includes(row.kind) ||
                typeof row.name !== "string" ||
                !/^managed-[A-Za-z0-9.-]+$/.test(row.name) ||
                !Number.isSafeInteger(row.size) ||
                row.size < 0 ||
                typeof row.sha256 !== "string" ||
                (row.kind === "snapshot" &&
                    (typeof row.displayName !== "string" ||
                        !row.displayName ||
                        row.displayName.length > 512 ||
                        /[\\/]/.test(row.displayName))) ||
                (row.kind === "source" &&
                    (typeof row.sourceKey !== "string" ||
                        typeof row.revisionKey !== "string")));
        }))
        throw new Error("pi_manifest_corrupt");
    return parsed.entries;
}
const ownerKey = (path) => path.replace(/\\/g, "/").replace(/\/+$/, "");
const caseInsensitiveOwner = detectRuntimePlatform() === "win32" || detectRuntimePlatform() === "darwin";
function isWithin(ancestor, path) {
    const owner = ownerKey(ancestor);
    if (!owner)
        return false;
    const left = ownerKey(path);
    const lower = caseInsensitiveOwner ? left.toLowerCase() : left;
    const upper = caseInsensitiveOwner ? owner.toLowerCase() : owner;
    return lower === upper || lower.startsWith(`${upper}/`);
}
// Bounded recursive byte total of the agent workspace (listing and sizes only,
// no file bodies). Symlinked entries are rejected so a cyclic or branching link
// layout cannot make the scan exponential; the entry and depth caps bound the
// work, and the total short-circuits once the quota is exceeded.
async function walkByteTotal(scanRoot, exclude) {
    let total = 0;
    let visited = 0;
    const stack = [
        { path: scanRoot, depth: 0 },
    ];
    while (stack.length) {
        if (visited >= WORKSPACE_SCAN_MAX_ENTRIES)
            throw new Error("pi_owner_quota_unavailable");
        const current = stack.pop();
        if (current.depth >= WORKSPACE_SCAN_MAX_DEPTH)
            throw new Error("pi_owner_quota_unavailable");
        let children;
        try {
            children = await listRuntimeChildrenStrict(current.path);
        }
        catch {
            throw new Error("pi_owner_quota_unavailable");
        }
        for (const child of children) {
            visited += 1;
            if (visited > WORKSPACE_SCAN_MAX_ENTRIES)
                throw new Error("pi_owner_quota_unavailable");
            if (exclude(child))
                continue;
            let identity;
            try {
                // Rejects symlinks so a cyclic link layout cannot recurse, and keeps
                // the walk inside the already-verified parent directory.
                identity = await resolveRuntimePathIdentity({
                    root: current.path,
                    path: child,
                });
            }
            catch {
                continue;
            }
            if (!identity.exists)
                continue;
            const info = await statRuntimePathStrict(identity.path).catch(() => null);
            if (!info?.exists)
                throw new Error("pi_owner_quota_unavailable");
            if (info.isDir) {
                stack.push({ path: identity.path, depth: current.depth + 1 });
                continue;
            }
            total += info.size;
            if (total > OWNER_QUOTA_BYTES)
                return total;
        }
    }
    return total;
}
// Diagnostics are measured on their own so the workspace walk can exclude
// them: the audit directory is counted exactly once, and its bytes are still
// bounded and symlink-rejected like any other counted tree.
async function auditByteTotal(scanRoot, auditRoot) {
    if (!isWithin(scanRoot, auditRoot))
        return 0;
    const identity = await resolveRuntimePathIdentity({
        root: scanRoot,
        path: auditRoot,
        allowMissing: true,
    }).catch(() => null);
    if (!identity?.exists)
        return 0;
    return walkByteTotal(identity.path, () => false);
}
function parentDirectory(pathRaw) {
    const normalized = String(pathRaw || "").replace(/[\\/]+$/, "");
    const index = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
    if (index < 0)
        return "";
    if (index === 0)
        return normalized.slice(0, 1);
    if (index === 2 && /^[A-Za-z]:/.test(normalized))
        return normalized.slice(0, 3);
    return normalized.slice(0, index);
}
function snapshotDisplayName(displayName, sourcePath) {
    const fromInput = getBaseName(String(displayName || "").replace(/\\/g, "/"));
    const name = fromInput || getBaseName(String(sourcePath || ""));
    return name.slice(0, 512) || "user-file";
}
function snapshotRef(sha256) {
    return `managed:${sha256}`;
}
async function withOwnerLock(ownerRoot, work) {
    const prior = ownerLocks.get(ownerRoot) || Promise.resolve();
    let release;
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    const tail = prior.then(() => pending);
    ownerLocks.set(ownerRoot, tail);
    await prior;
    try {
        return await work();
    }
    finally {
        release();
        if (ownerLocks.get(ownerRoot) === tail)
            ownerLocks.delete(ownerRoot);
    }
}
function visibleText(text) {
    const lines = text.split("\n");
    const limited = lines.slice(0, VISIBLE_LINES).join("\n");
    const bytes = textEncoder.encode(limited);
    if (bytes.length <= VISIBLE_BYTES)
        return { text: limited, truncated: lines.length > VISIBLE_LINES };
    return {
        text: new TextDecoder().decode(bytes.subarray(0, VISIBLE_BYTES)),
        truncated: true,
    };
}
function visibleTail(text) {
    const lines = text.split("\n");
    const limited = lines.slice(-VISIBLE_LINES).join("\n");
    const bytes = textEncoder.encode(limited);
    return {
        text: new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - VISIBLE_BYTES))),
        truncated: lines.length > VISIBLE_LINES || bytes.length > VISIBLE_BYTES,
    };
}
function looksBinaryText(text) {
    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        if (code === 0xfffd ||
            (code < 32 && code !== 9 && code !== 10 && code !== 13))
            return true;
    }
    return false;
}
function result(value) {
    return { status: "completed", effectCertainty: "confirmed_complete", value };
}
function failure(code) {
    return { status: "failed", effectCertainty: "confirmed_none", code };
}
function matchesGlob(pattern, value) {
    if (!pattern || pattern.length > 256 || value.length > 1024)
        return false;
    const memo = new Map();
    function match(i, j) {
        const key = `${i}:${j}`;
        if (memo.has(key))
            return memo.get(key);
        let accepted = false;
        if (i === pattern.length)
            accepted = j === value.length;
        else if (pattern.slice(i, i + 3) === "**/")
            accepted = match(i + 3, j) || (j < value.length && match(i, j + 1));
        else if (pattern.slice(i, i + 2) === "**")
            accepted = match(i + 2, j) || (j < value.length && match(i, j + 1));
        else if (pattern[i] === "*")
            accepted =
                match(i + 1, j) ||
                    (j < value.length && value[j] !== "/" && match(i, j + 1));
        else if (pattern[i] === "?")
            accepted = j < value.length && value[j] !== "/" && match(i + 1, j + 1);
        else
            accepted =
                j < value.length && pattern[i] === value[j] && match(i + 1, j + 1);
        memo.set(key, accepted);
        return accepted;
    }
    return match(0, 0);
}
function safeSearchExpression(pattern, literal, ignoreCase) {
    if (pattern.length > 128 ||
        (!literal &&
            (/[(){}|]/.test(pattern) ||
                /\\[1-9]/.test(pattern) ||
                (pattern.match(/[?*+]/g)?.length || 0) > 1)))
        throw new Error("pi_pattern_unsupported");
    return new RegExp(literal ? pattern.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&") : pattern, ignoreCase ? "i" : "");
}
const pathSchema = { type: "string", minLength: 1 };
const boundedLimit = (max) => ({
    type: "integer",
    minimum: 1,
    maximum: max,
});
export async function createPiTrustedNativeExecution(args) {
    let root;
    try {
        root = (await resolveRuntimePathIdentity({
            root: args.workspaceRoot,
            path: args.workspaceRoot,
        })).path;
    }
    catch (error) {
        if (!String(error).includes("pi_path_inspection_unavailable"))
            throw error;
        return {
            definitions: [],
            runtimeCapability: {
                identity: `pi-native-unavailable:${args.mode}`,
                availableCapabilityIds: [],
            },
            materializeOrReuse: async (_input) => {
                throw new Error("pi_path_inspection_unavailable");
            },
            materializeOrReuseMany: async (_inputs) => {
                throw new Error("pi_path_inspection_unavailable");
            },
            commitGeneratedOutputs: async (_files) => {
                throw new Error("pi_path_inspection_unavailable");
            },
            beginGeneratedTextOutput: async (_suffix) => {
                throw new Error("pi_path_inspection_unavailable");
            },
            snapshotUserFiles: async (_sources) => {
                throw new Error("pi_path_inspection_unavailable");
            },
            listUserFileSnapshots: async () => {
                throw new Error("pi_path_inspection_unavailable");
            },
            resolveUserFileSnapshot: async (_ref) => {
                throw new Error("pi_path_inspection_unavailable");
            },
            prepareStoredAttachment: async (_path, _signal) => {
                throw new Error("pi_path_inspection_unavailable");
            },
        };
    }
    const definitions = [];
    const managedDir = joinPath(args.ownerRoot, "files");
    const manifestPath = joinPath(args.ownerRoot, "managed-files.json");
    const ownerIdentity = await resolveRuntimePathIdentity({
        root,
        path: args.ownerRoot,
        allowMissing: true,
    }).catch(() => null);
    const privateKey = ownerIdentity?.canonicalKey.replace(/\\/g, "/");
    // Owner diagnostics are private metadata: the agent may neither read nor
    // write them, so the audit tree is excluded like the owner tree itself even
    // when the workspace is nested inside the owner.
    const auditKey = await resolveRuntimePathIdentity({
        root,
        path: joinPath(root, OWNER_RUNTIME_AUDIT_DIR),
        allowMissing: true,
    })
        .then((identity) => identity.exists ? identity.canonicalKey.replace(/\\/g, "/") : "")
        .catch(() => "");
    // Shared owner quota key for in-flight private staging reservations.
    const stagedBytesKey = await resolveOwnerKey(root, args.ownerRoot);
    function assertPublic(key) {
        const normalized = key.replace(/\\/g, "/");
        if (auditKey &&
            (normalized === auditKey || normalized.startsWith(auditKey + "/")))
            throw new Error("pi_path_private_owner");
        if (privateKey &&
            (normalized === privateKey || normalized.startsWith(`${privateKey}/`)))
            throw new Error("pi_path_private_owner");
    }
    async function readManifest() {
        if (!(await runtimePathExists(manifestPath)))
            return [];
        const info = await statRuntimePathStrict(manifestPath);
        if (!info.exists || info.isDir || info.size > 1024 * 1024)
            throw new Error("pi_manifest_corrupt");
        return parseManifestEntries(JSON.parse(await readRuntimeTextFileStrict(manifestPath)));
    }
    async function commitManifest(entries) {
        if (entries.length > 4096)
            throw new Error("pi_manifest_limit");
        const content = JSON.stringify({ version: 1, entries });
        if (textEncoder.encode(content).length > 1024 * 1024)
            throw new Error("pi_manifest_limit");
        await ensureRuntimeDirectoryStrict(args.ownerRoot);
        await replaceRuntimeTextFileAtomically(manifestPath, content);
    }
    // Shared owner 2 GiB quota, counted by the same module-scope seam the audit
    // writer uses: manifest-managed copies, workspace files, owner diagnostics
    // and in-flight private staging reserved by stored-attachment preparation.
    const ownerUsageBytes = (entries) => ownerUsageBytesFor({
        ownerRoot: args.ownerRoot,
        workspaceRoot: root,
        stagedBytesKey,
        manifestBytes: entries.reduce((sum, entry) => sum + entry.size, 0),
    });
    // Business data outranks diagnostics: an allocation that would exceed the
    // owner quota reclaims just enough audit bytes and is only rejected if it
    // still does not fit. Callers already hold the owner lock, which is what
    // serializes the reclaim against every other quota consumer.
    async function admitsOwnerAllocation(entries, deltaBytes) {
        const usage = await ownerUsageBytes(entries);
        if (usage + deltaBytes <= OWNER_QUOTA_BYTES)
            return true;
        const required = usage + deltaBytes - OWNER_QUOTA_BYTES;
        await reclaimAuditForQuota(args.ownerRoot, root, required);
        return (await ownerUsageBytes(entries)) + deltaBytes <= OWNER_QUOTA_BYTES;
    }
    async function nextManagedPath(sourcePath) {
        await ensureRuntimeDirectoryStrict(managedDir);
        const extension = (getBaseName(sourcePath).match(/\.[A-Za-z0-9]{1,12}$/) || [""])[0];
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const name = `managed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${extension}`;
            const path = joinPath(managedDir, name);
            if (!(await runtimePathExists(path)))
                return { name, path };
        }
        throw new Error("pi_managed_name_unavailable");
    }
    async function materializeOrReuseMany(inputs) {
        return withOwnerLock(args.ownerRoot, async () => {
            const entries = await readManifest();
            const planned = [];
            let newBytes = 0;
            for (const input of inputs) {
                if (!input.sourceId || !input.revision)
                    throw new Error("pi_source_identity_missing");
                const source = await inspectRuntimeFileSource(input.sourcePath);
                if (source.size > MANAGED_FILE_MAX_BYTES)
                    throw new Error("pi_managed_file_too_large");
                const digest = await digestRuntimeFileSource(source);
                if (digest.bytesRead !== source.size)
                    throw new Error("pi_source_changed");
                const sourceKey = await sha256PrefixedHex(textEncoder.encode(input.sourceId));
                const revisionKey = await sha256PrefixedHex(textEncoder.encode(input.revision));
                if (!sourceKey || !revisionKey)
                    throw new Error("pi_digest_unavailable");
                const current = entries.find((entry) => entry.kind === "source" &&
                    entry.sourceKey === sourceKey &&
                    entry.revisionKey === revisionKey &&
                    entry.size === source.size &&
                    entry.sha256 === digest.sha256);
                let reusedPath;
                if (current) {
                    const existingPath = joinPath(managedDir, current.name);
                    const existing = await resolveRuntimePathIdentity({
                        root: args.ownerRoot,
                        path: existingPath,
                    }).catch(() => null);
                    if (existing?.exists) {
                        const info = await statRuntimePathStrict(existing.path);
                        if (!info.isDir)
                            reusedPath = existing.path;
                    }
                }
                if (!reusedPath)
                    newBytes += source.size;
                planned.push({
                    sourcePath: input.sourcePath,
                    size: source.size,
                    sha256: digest.sha256,
                    sourceKey,
                    revisionKey,
                    reusedPath,
                });
            }
            if (newBytes > 512 * 1024 * 1024 ||
                !(await admitsOwnerAllocation(entries, newBytes)))
                throw new Error("pi_owner_quota_exceeded");
            const created = [];
            const result = [];
            try {
                for (const item of planned) {
                    if (item.reusedPath) {
                        result.push({ path: item.reusedPath, reused: true });
                        continue;
                    }
                    const target = await nextManagedPath(item.sourcePath);
                    created.push(target.path);
                    await copyRuntimeFile({
                        sourcePath: item.sourcePath,
                        targetPath: target.path,
                    });
                    const copied = await digestRuntimeFileSource({
                        path: target.path,
                        size: item.size,
                    });
                    if (copied.bytesRead !== item.size || copied.sha256 !== item.sha256)
                        throw new Error("pi_source_changed");
                    entries.push({
                        kind: "source",
                        sourceKey: item.sourceKey,
                        revisionKey: item.revisionKey,
                        size: item.size,
                        sha256: item.sha256,
                        name: target.name,
                    });
                    result.push({ path: target.path, reused: false });
                }
                if (created.length)
                    await commitManifest(entries);
                return result;
            }
            catch (error) {
                const removed = await Promise.all(created.map((path) => removeRuntimePath(path).catch(() => false)));
                if (removed.some((ok) => !ok))
                    throw new Error("pi_managed_cleanup_pending");
                throw error;
            }
        });
    }
    async function materializeOrReuse(input) {
        return (await materializeOrReuseMany([input]))[0];
    }
    let snapshotReadMapCache = null;
    // Exact read route: the agent may read only owner-managed snapshot files,
    // matched by canonical identity, never their parent directory or other
    // private owner metadata. The map is rebuilt from the manifest so historical
    // snapshots stay readable across turns.
    async function snapshotReadMap() {
        if (snapshotReadMapCache)
            return snapshotReadMapCache;
        const map = new Map();
        try {
            for (const entry of await readManifest()) {
                if (entry.kind !== "snapshot")
                    continue;
                try {
                    const identity = await resolveRuntimePathIdentity({
                        root: args.ownerRoot,
                        path: joinPath(managedDir, entry.name),
                    });
                    map.set(identity.canonicalKey.replace(/\\/g, "/"), true);
                }
                catch {
                    // Missing or unverifiable snapshot: not readable.
                }
            }
        }
        catch {
            // A corrupt or unreadable manifest exposes no snapshot reads.
        }
        snapshotReadMapCache = map;
        return map;
    }
    async function matchSnapshotPath(inputPath) {
        const map = await snapshotReadMap();
        if (!map.size)
            return null;
        let identity;
        try {
            identity = await resolveRuntimePathIdentity({
                root: args.ownerRoot,
                path: inputPath,
            });
        }
        catch {
            return null;
        }
        if (!map.has(identity.canonicalKey.replace(/\\/g, "/")))
            return null;
        return identity;
    }
    async function resolveSnapshotSourceIdentity(sourcePath) {
        const parent = parentDirectory(sourcePath);
        if (!parent)
            throw new Error("pi_snapshot_unavailable");
        try {
            return await resolveRuntimePathIdentity({
                root: parent,
                path: sourcePath,
            });
        }
        catch (error) {
            const message = String(error);
            if (message.includes("link") || message.includes("outside"))
                throw new Error("pi_snapshot_not_regular");
            throw new Error("pi_snapshot_unavailable");
        }
    }
    // Never surface the transient source path in an error message: map any raw
    // filesystem failure to a project code while re-throwing our own codes.
    function sourceFailureCode(error) {
        const message = error instanceof Error ? error.message : String(error || "");
        return message.startsWith("pi_") ? null : "pi_snapshot_unavailable";
    }
    async function inspectSnapshotSource(sourcePath) {
        try {
            const identity = await resolveSnapshotSourceIdentity(sourcePath);
            const info = await statRuntimePathStrict(identity.path);
            if (!info.exists || info.isDir)
                throw new Error("pi_snapshot_not_regular");
            if (info.size > PI_USER_FILE_SNAPSHOT_LIMITS.maxFileBytes)
                throw new Error("pi_snapshot_file_too_large");
            const digest = await digestRuntimeFileSource({
                path: identity.path,
                size: info.size,
            });
            if (digest.bytesRead !== info.size)
                throw new Error("pi_source_changed");
            return { identity, info, digest };
        }
        catch (error) {
            const code = sourceFailureCode(error);
            if (code)
                throw new Error(code);
            throw error;
        }
    }
    function toSnapshot(entry, path) {
        return {
            ref: snapshotRef(entry.sha256),
            path,
            displayName: entry.displayName || getBaseName(entry.name),
            size: entry.size,
            sha256: entry.sha256,
        };
    }
    async function listUserFileSnapshots() {
        const entries = await readManifest();
        const snapshots = [];
        for (const entry of entries) {
            if (entry.kind !== "snapshot")
                continue;
            const identity = await resolveRuntimePathIdentity({
                root: args.ownerRoot,
                path: joinPath(managedDir, entry.name),
            }).catch(() => null);
            if (!identity?.exists)
                continue;
            snapshots.push(toSnapshot(entry, identity.path));
        }
        return snapshots;
    }
    async function resolveUserFileSnapshot(ref) {
        const value = String(ref || "");
        if (!value.startsWith("managed:sha256:"))
            return null;
        const entry = (await readManifest()).find((row) => row.kind === "snapshot" && snapshotRef(row.sha256) === value);
        if (!entry)
            return null;
        const identity = await resolveRuntimePathIdentity({
            root: args.ownerRoot,
            path: joinPath(managedDir, entry.name),
        }).catch(() => null);
        if (!identity?.exists)
            return null;
        return toSnapshot(entry, identity.path);
    }
    async function snapshotUserFiles(sources, limits = {}) {
        const list = Array.isArray(sources) ? sources : [];
        const maxResources = Math.min(PI_USER_FILE_SNAPSHOT_LIMITS.maxResources, limits.maxResources ?? PI_USER_FILE_SNAPSHOT_LIMITS.maxResources);
        const maxTotalBytes = Math.min(PI_USER_FILE_SNAPSHOT_LIMITS.maxTotalBytes, limits.maxTotalBytes ?? PI_USER_FILE_SNAPSHOT_LIMITS.maxTotalBytes);
        if (list.length > maxResources)
            throw new Error("pi_snapshot_resource_limit");
        return withOwnerLock(args.ownerRoot, async () => {
            const entries = await readManifest();
            const planned = [];
            const seen = new Set();
            let totalBytes = 0;
            for (const source of list) {
                const sourcePath = String(source?.path || "").trim();
                if (!sourcePath)
                    throw new Error("pi_snapshot_unavailable");
                const displayName = snapshotDisplayName(source?.displayName, sourcePath);
                const { identity, info, digest } = await inspectSnapshotSource(sourcePath);
                const revision = `${info.size}:${digest.sha256}`;
                const dedupeKey = `${identity.canonicalKey.replace(/\\/g, "/")}\n${revision}`;
                if (seen.has(dedupeKey))
                    continue;
                seen.add(dedupeKey);
                totalBytes += info.size;
                const entryName = entries.find((entry) => entry.kind === "snapshot" &&
                    entry.size === info.size &&
                    entry.sha256 === digest.sha256)?.name;
                planned.push({
                    sourcePath: identity.path,
                    displayName,
                    size: info.size,
                    sha256: digest.sha256,
                    entryName,
                });
            }
            if (totalBytes > maxTotalBytes)
                throw new Error("pi_snapshot_total_too_large");
            const newBytes = planned.reduce((sum, item) => (item.entryName ? sum : sum + item.size), 0);
            if (newBytes > PI_USER_FILE_SNAPSHOT_LIMITS.maxTotalBytes ||
                !(await admitsOwnerAllocation(entries, newBytes)))
                throw new Error("pi_owner_quota_exceeded");
            const created = [];
            const snaps = [];
            try {
                for (const item of planned) {
                    const entry = item.entryName
                        ? entries.find((row) => row.kind === "snapshot" && row.name === item.entryName)
                        : undefined;
                    let name = item.entryName;
                    let exists = false;
                    if (name) {
                        const identity = await resolveRuntimePathIdentity({
                            root: args.ownerRoot,
                            path: joinPath(managedDir, name),
                        }).catch(() => null);
                        if (identity?.exists) {
                            const info = await statRuntimePathStrict(identity.path);
                            exists = !info.isDir;
                        }
                    }
                    if (!exists) {
                        if (!name)
                            name = (await nextManagedPath(item.displayName)).name;
                        const target = joinPath(managedDir, name);
                        try {
                            const bytes = await collectRuntimeFileSourceBytes({
                                path: item.sourcePath,
                                size: item.size,
                            });
                            created.push(target);
                            await writeRuntimeBytes(target, bytes);
                        }
                        catch {
                            throw new Error("pi_snapshot_copy_failed");
                        }
                        try {
                            await verifyRuntimeFileSource({
                                path: target,
                                size: item.size,
                                sha256: item.sha256,
                            });
                        }
                        catch {
                            throw new Error("pi_source_changed");
                        }
                        if (entry) {
                            entry.displayName = item.displayName;
                        }
                        else {
                            entries.push({
                                kind: "snapshot",
                                size: item.size,
                                sha256: item.sha256,
                                name,
                                displayName: item.displayName,
                            });
                        }
                    }
                    const snapshot = entry
                        ? toSnapshot(entry, joinPath(managedDir, name))
                        : {
                            ref: snapshotRef(item.sha256),
                            path: joinPath(managedDir, name),
                            displayName: item.displayName,
                            size: item.size,
                            sha256: item.sha256,
                        };
                    snaps.push(snapshot);
                }
                if (created.length) {
                    await commitManifest(entries);
                    // Best-effort read-only marking; the exact read route already denies
                    // writes, so a platform without POSIX modes stays correct.
                    await Promise.all(created.map((path) => setRuntimeFilePermissions(path, 0o444).catch(() => false)));
                }
                snapshotReadMapCache = null;
                return snaps;
            }
            catch (error) {
                const removed = await Promise.all(created.map(async (path) => !(await runtimePathExists(path)) ||
                    (await removeRuntimePath(path).catch(() => false))));
                if (removed.some((ok) => !ok))
                    throw new Error("pi_managed_cleanup_pending");
                throw error;
            }
        });
    }
    async function commitGeneratedOutputs(files) {
        return withOwnerLock(args.ownerRoot, async () => {
            const entries = await readManifest();
            const staged = [];
            let newBytes = 0;
            for (const file of files) {
                const identity = await resolveRuntimePathIdentity({
                    root,
                    path: file.stagedPath,
                });
                const source = await inspectRuntimeFileSource(identity.path);
                if (source.size > MANAGED_FILE_MAX_BYTES)
                    throw new Error("pi_generated_file_too_large");
                const digest = await digestRuntimeFileSource(source);
                if (digest.bytesRead !== source.size)
                    throw new Error("pi_generated_file_changed");
                newBytes += source.size;
                staged.push({
                    path: identity.path,
                    size: source.size,
                    sha256: digest.sha256,
                });
            }
            if (newBytes > 512 * 1024 * 1024 ||
                !(await admitsOwnerAllocation(entries, newBytes)))
                throw new Error("pi_owner_quota_exceeded");
            const promoted = [];
            const temporary = [];
            try {
                for (const file of staged) {
                    const target = await nextManagedPath(file.path);
                    const tempPath = `${target.path}.staging`;
                    temporary.push(tempPath);
                    await copyRuntimeFile({
                        sourcePath: file.path,
                        targetPath: tempPath,
                    });
                    const copied = await digestRuntimeFileSource({
                        path: tempPath,
                        size: file.size,
                    });
                    if (copied.bytesRead !== file.size || copied.sha256 !== file.sha256)
                        throw new Error("pi_generated_file_changed");
                    await moveRuntimePath({
                        sourcePath: tempPath,
                        targetPath: target.path,
                    });
                    promoted.push(target.path);
                    entries.push({
                        kind: "generated",
                        size: file.size,
                        sha256: file.sha256,
                        name: target.name,
                    });
                }
                await commitManifest(entries);
                return promoted;
            }
            catch (error) {
                await Promise.all([...promoted, ...temporary].map((path) => removeRuntimePath(path).catch(() => false)));
                throw error;
            }
        });
    }
    async function beginGeneratedTextOutput(suffix) {
        if (![".md", ".json", ".ndjson"].includes(suffix))
            throw new Error("pi_generated_suffix_invalid");
        const stagingDir = joinPath(args.ownerRoot, "staging");
        await ensureRuntimeDirectoryStrict(stagingDir);
        let stagedPath = "";
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const candidate = joinPath(stagingDir, `managed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${suffix}`);
            if (await runtimePathExists(candidate))
                continue;
            await writeRuntimeBytes(candidate, new Uint8Array(), {
                overwrite: false,
            });
            stagedPath = candidate;
            break;
        }
        if (!stagedPath)
            throw new Error("pi_managed_name_unavailable");
        let sizeBytes = 0;
        let state = "open";
        const discard = async () => {
            if (state !== "open")
                return;
            if (!(await removeRuntimePath(stagedPath).catch(() => false)))
                throw new Error("pi_managed_cleanup_pending");
            state = "discarded";
        };
        return {
            append: async (content) => {
                if (state !== "open")
                    throw new Error("pi_generated_output_closed");
                const bytes = textEncoder.encode(content).byteLength;
                if (sizeBytes + bytes > MANAGED_FILE_MAX_BYTES)
                    throw new Error("pi_generated_file_too_large");
                await appendRuntimeTextFile(stagedPath, content);
                sizeBytes += bytes;
            },
            commit: async () => {
                if (state !== "open")
                    throw new Error("pi_generated_output_closed");
                const digest = await digestRuntimeFileSource({
                    path: stagedPath,
                    size: sizeBytes,
                });
                if (digest.bytesRead !== sizeBytes)
                    throw new Error("pi_generated_file_changed");
                const [path] = await commitGeneratedOutputs([{ stagedPath }]);
                state = "committed";
                if (!(await removeRuntimePath(stagedPath).catch(() => false)))
                    throw new Error("pi_managed_cleanup_pending");
                return { path, sizeBytes, sha256: digest.sha256 };
            },
            discard,
        };
    }
    // Trusted stored-attachment staging lives under the private owner tree and
    // reuses the shared attachment stager and prepared-files owner. Only regular
    // public Workspace files pass the lexical/resolved verifier; managed snapshot
    // aliases, private owner paths, external paths and links are rejected.
    const storedAttachmentStagingRoot = joinPath(args.ownerRoot, "staging");
    async function resolveStoredAttachmentSource(inputPath) {
        const identity = await resolveRuntimePathIdentity({
            root,
            path: String(inputPath || ""),
        });
        assertPublic(identity.canonicalKey);
        const info = await statRuntimePathStrict(identity.path);
        if (!info.exists || !info.isFile)
            throw new Error("pi_managed_file_not_regular");
        if (info.size > MANAGED_FILE_MAX_BYTES)
            throw new Error("pi_managed_file_too_large");
        return { path: identity.path, size: info.size };
    }
    // `createZoteroHostPreparedFiles` buffers whole files for its digest, so cap
    // the size before reading rather than after; it also bounds the post-copy
    // verification of the real staged snapshot.
    const readStoredAttachmentBytes = async (sourcePath) => {
        const info = await statRuntimePathStrict(sourcePath);
        if (!info.exists || !info.isFile)
            throw new Error("pi_managed_file_not_regular");
        if (info.size > MANAGED_FILE_MAX_BYTES)
            throw new Error("pi_managed_file_too_large");
        return readRuntimeBytes(sourcePath);
    };
    async function prepareStoredAttachment(inputPath, signal) {
        if (signal?.aborted)
            throw new Error("pi_stored_attachment_canceled");
        const source = await resolveStoredAttachmentSource(inputPath);
        // Measuring and reserving share the owner lock with the other quota
        // consumers (write/edit/snapshot/materialize), so a concurrent workspace
        // write cannot slip past this measurement before its own bytes are counted.
        // The reserved total itself is sampled after `ownerUsageBytes`'s awaits,
        // adjacent to the check, so a second preparation cannot observe it stale.
        await withOwnerLock(args.ownerRoot, async () => {
            const usage = await ownerUsageBytes(await readManifest());
            if (usage + source.size > OWNER_QUOTA_BYTES) {
                await reclaimAuditForQuota(args.ownerRoot, root, usage + source.size - OWNER_QUOTA_BYTES);
                if ((await ownerUsageBytes(await readManifest())) + source.size >
                    OWNER_QUOTA_BYTES)
                    throw new Error("pi_owner_quota_exceeded");
            }
            adjustOwnerStagedBytes(stagedBytesKey, source.size);
        });
        let held = source.size;
        let released = false;
        const release = () => {
            if (released)
                return;
            released = true;
            adjustOwnerStagedBytes(stagedBytesKey, -held);
        };
        const files = createZoteroHostPreparedFiles({
            stageStoredAttachmentSources: createWorkflowStoredAttachmentStager({
                getStagingRoot: () => storedAttachmentStagingRoot,
                validateSource: async (sourcePath) => ({
                    sizeBytes: (await resolveStoredAttachmentSource(sourcePath)).size,
                }),
                ensureDirectory: ensureRuntimeDirectoryStrict,
                copyFile: async (sourcePath, targetPath) => {
                    // Reuse the existing copy; the native single-call copy cannot be
                    // interrupted mid-flight, so cancellation is observed at the
                    // boundaries and the stager still cleans up on the throw.
                    if (signal?.aborted)
                        throw new Error("pi_stored_attachment_canceled");
                    await copyRuntimeFile({ sourcePath, targetPath });
                    if (signal?.aborted)
                        throw new Error("pi_stored_attachment_canceled");
                },
                removePath: removeRuntimePath,
            }),
            readBytes: readStoredAttachmentBytes,
        });
        const preparedFiles = withStagingRelease(files, release);
        const abandon = async (error) => {
            try {
                await files.dispose();
            }
            catch {
                throw new Error("pi_managed_cleanup_pending");
            }
            release();
            throw error;
        };
        let prepared;
        try {
            prepared = await files.prepareStoredAttachment({ path: source.path });
        }
        catch (error) {
            return abandon(error);
        }
        // Bind the reservation to the real staged size, then recheck the quota so a
        // source that grew during the copy cannot slip past it.
        const actual = prepared.snapshot.main.sizeBytes;
        if (actual > MANAGED_FILE_MAX_BYTES)
            return abandon(new Error("pi_managed_file_too_large"));
        adjustOwnerStagedBytes(stagedBytesKey, actual - held);
        held = actual;
        const withinQuota = await withOwnerLock(args.ownerRoot, async () => {
            // Fresh measurement: it includes this file's real staged size and any
            // reservation another preparation made while the copy was running.
            const entries = await readManifest();
            if ((await ownerUsageBytes(entries)) <= OWNER_QUOTA_BYTES)
                return true;
            await reclaimAuditForQuota(args.ownerRoot, root, (await ownerUsageBytes(entries)) - OWNER_QUOTA_BYTES);
            return (await ownerUsageBytes(await readManifest())) <= OWNER_QUOTA_BYTES;
        });
        if (!withinQuota)
            return abandon(new Error("pi_owner_quota_exceeded"));
        if (signal?.aborted)
            return abandon(new Error("pi_stored_attachment_canceled"));
        return Object.freeze({
            prepared,
            preparedFiles,
            manifest: prepared.snapshot,
            dispose: async () => {
                try {
                    await files.dispose();
                }
                catch {
                    throw new Error("pi_managed_cleanup_pending");
                }
                release();
            },
        });
    }
    const fileTool = (name, schema, effect, executeFile) => {
        const resolvePath = async (inputPath) => {
            if (name === "read") {
                // The model is given a safe managed ref; the owner path stays out of
                // durable conversation state. Resolve it to the exact snapshot only.
                if (String(inputPath || "")
                    .trim()
                    .startsWith("managed:")) {
                    const snapshot = await resolveUserFileSnapshot(inputPath);
                    if (!snapshot)
                        throw new Error("pi_snapshot_ref_invalid");
                    return await resolveRuntimePathIdentity({
                        root: args.ownerRoot,
                        path: snapshot.path,
                    });
                }
                const matched = await matchSnapshotPath(inputPath);
                if (matched)
                    return matched;
            }
            const identity = await resolveRuntimePathIdentity({
                root,
                path: inputPath,
                allowMissing: name === "write",
            });
            assertPublic(identity.canonicalKey);
            return identity;
        };
        return {
            capabilityId: `pi.native.${name}`,
            name,
            description: `${name} a workspace file`,
            schema,
            minimumEffects: [effect],
            maxResultBytes: name === "read" ? 1024 * 1024 : 256 * 1024,
            // A read is a bounded text projection, not an attachment transfer, so it
            // keeps the ordinary bound. Only known-long work earns the long one.
            deadlineCategory: "ordinary",
            classify: async (value) => {
                const input = value;
                const identity = await resolvePath(input.path);
                return {
                    effects: [effect],
                    authorizationKeys: [`workspace:${root}`],
                    resourceKeys: [`file:${identity.canonicalKey}`],
                    cost: 1,
                };
            },
            execute: async (value, context) => {
                if (context.signal.aborted)
                    return { status: "canceled", effectCertainty: "not_started" };
                let identity;
                try {
                    const input = value;
                    identity = await resolvePath(input.path);
                }
                catch (error) {
                    const message = String(error);
                    return failure(message.includes("pi_snapshot_ref_invalid")
                        ? "pi_snapshot_ref_invalid"
                        : message.includes("pi_path_")
                            ? "pi_path_invalid"
                            : "pi_file_failed");
                }
                try {
                    return effect === "workspace-mutation"
                        ? await withOwnerLock(args.ownerRoot, () => executeFile(value, identity.path))
                        : await executeFile(value, identity.path);
                }
                catch {
                    return effect === "workspace-mutation"
                        ? {
                            status: "failed",
                            effectCertainty: "unknown",
                            code: "pi_file_state_unknown",
                        }
                        : failure("pi_file_failed");
                }
            },
        };
    };
    definitions.push(fileTool("read", {
        type: "object",
        properties: {
            path: {
                type: "string",
                minLength: 1,
                description: "Workspace file path, or a managed:sha256:<hex> reference for an attached Conversation snapshot.",
            },
            offset: boundedLimit(Number.MAX_SAFE_INTEGER),
            limit: boundedLimit(VISIBLE_LINES),
        },
        required: ["path"],
        additionalProperties: false,
    }, "bounded-read", async (input, path) => {
        const stat = await statRuntimePathStrict(path);
        if (!stat.exists || stat.isDir)
            return failure("pi_file_not_regular");
        if (stat.size > 50 * 1024 * 1024)
            return failure("pi_file_too_large");
        if (/\.(?:png|jpe?g|gif|webp|bmp)$/i.test(path)) {
            if (stat.size > 700 * 1024 || typeof btoa !== "function")
                return failure("pi_image_too_large");
            const bytes = await readRuntimeBytes(path);
            let binary = "";
            for (let offset = 0; offset < bytes.length; offset += 0x8000)
                binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
            const extension = getBaseName(path).split(".").pop()?.toLowerCase();
            return result({
                kind: "image",
                mimeType: `image/${extension === "jpg" ? "jpeg" : extension}`,
                base64: btoa(binary),
            });
        }
        let lineNo = 0;
        const selected = [];
        let bytes = 0;
        let truncated = false;
        const stop = {};
        try {
            await scanRuntimeUtf8Lines({
                path,
                onLine: (line) => {
                    lineNo += 1;
                    if (lineNo < (input.offset || 1))
                        return;
                    if (selected.length >= (input.limit || VISIBLE_LINES) ||
                        selected.length >= VISIBLE_LINES ||
                        bytes + line.length > VISIBLE_BYTES) {
                        truncated = true;
                        throw stop;
                    }
                    if (looksBinaryText(line.text))
                        throw new Error("pi_binary_file");
                    selected.push(line.text.replace(/\n$/, ""));
                    bytes += line.length;
                },
            });
        }
        catch (error) {
            if (error !== stop)
                throw error;
        }
        return result({
            text: selected.join("\n"),
            truncated,
            nextOffset: truncated ? (input.offset || 1) + selected.length : null,
        });
    }));
    definitions.push(fileTool("write", {
        type: "object",
        properties: { path: pathSchema, content: { type: "string" } },
        required: ["path", "content"],
        additionalProperties: false,
    }, "workspace-mutation", async (input, path) => {
        const content = input.content || "";
        const bytes = textEncoder.encode(content).length;
        const existing = await statRuntimePathStrict(path).catch(() => null);
        const existingBytes = existing?.exists && !existing.isDir ? existing.size : 0;
        if (!(await admitsOwnerAllocation(await readManifest().catch(() => []), bytes - existingBytes)))
            return failure("pi_owner_quota_exceeded");
        await replaceRuntimeTextFileAtomically(path, content);
        return result({ written: true });
    }));
    definitions.push(fileTool("edit", {
        type: "object",
        properties: {
            path: pathSchema,
            edits: {
                type: "array",
                minItems: 1,
                items: {
                    type: "object",
                    properties: {
                        oldText: { type: "string", minLength: 1 },
                        newText: { type: "string" },
                    },
                    required: ["oldText", "newText"],
                    additionalProperties: false,
                },
            },
        },
        required: ["path", "edits"],
        additionalProperties: false,
    }, "workspace-mutation", async (input, path) => {
        const stat = await statRuntimePathStrict(path);
        if (!stat.exists || stat.isDir || stat.size > MAX_EDIT_BYTES)
            return failure("pi_file_not_editable");
        const original = await readRuntimeTextFileStrict(path);
        const positions = (input.edits || []).map((edit) => ({
            ...edit,
            at: original.indexOf(edit.oldText),
        }));
        if (positions.some((edit) => edit.at < 0 || original.indexOf(edit.oldText, edit.at + 1) >= 0))
            return failure("pi_edit_ambiguous");
        positions.sort((a, b) => a.at - b.at);
        if (positions.some((edit, index) => index > 0 &&
            positions[index - 1].at + positions[index - 1].oldText.length >
                edit.at))
            return failure("pi_edit_overlap");
        let changed = original;
        for (const edit of positions.reverse())
            changed =
                changed.slice(0, edit.at) +
                    edit.newText +
                    changed.slice(edit.at + edit.oldText.length);
        const delta = textEncoder.encode(changed).length -
            textEncoder.encode(original).length;
        if (delta > 0) {
            if (!(await admitsOwnerAllocation(await readManifest().catch(() => []), delta)))
                return failure("pi_owner_quota_exceeded");
        }
        await replaceRuntimeTextFileAtomically(path, changed);
        return result({ edits: positions.length });
    }));
    if (args.mode === "restricted") {
        const searchSchema = (name) => ({
            type: "object",
            properties: {
                path: pathSchema,
                ...(name === "ls" ? {} : { pattern: pathSchema }),
                ...(name === "grep"
                    ? {
                        glob: pathSchema,
                        ignoreCase: { type: "boolean" },
                        literal: { type: "boolean" },
                        context: { type: "integer", minimum: 0, maximum: 10 },
                    }
                    : {}),
                limit: boundedLimit(name === "grep" ? 100 : name === "find" ? 1000 : 500),
            },
            required: name === "ls" ? [] : ["pattern"],
            additionalProperties: false,
        });
        async function walk(start, onEntry, maxDepth = Infinity) {
            const stack = [{ path: start, relative: "", depth: 0, rules: [] }];
            let visited = 0;
            while (stack.length) {
                const item = stack.pop();
                const rules = [...item.rules];
                const ignorePath = joinPath(item.path, ".gitignore");
                const ignoreInfo = await statRuntimePathStrict(ignorePath).catch(() => ({ exists: false, size: 0, isDir: false }));
                if (ignoreInfo.exists &&
                    !ignoreInfo.isDir &&
                    ignoreInfo.size <= 256 * 1024) {
                    const matcher = ignore().add(await readRuntimeTextFileStrict(ignorePath));
                    rules.push({ base: item.relative, matcher });
                }
                const children = (await listRuntimeChildrenStrict(item.path)).sort();
                for (const child of children) {
                    const name = getBaseName(child);
                    if (name === ".git" ||
                        child === args.ownerRoot ||
                        (auditKey &&
                            (ownerKey(child) === ownerKey(auditKey) ||
                                ownerKey(child).startsWith(ownerKey(auditKey) + "/"))))
                        continue;
                    const relative = item.relative ? `${item.relative}/${name}` : name;
                    try {
                        const childIdentity = await resolveRuntimePathIdentity({
                            root,
                            path: child,
                        });
                        assertPublic(childIdentity.canonicalKey);
                    }
                    catch {
                        continue;
                    }
                    const stat = await statRuntimePathStrict(child);
                    if (!stat.exists)
                        continue;
                    if (rules.some(({ base, matcher }) => {
                        const sub = base ? relative.slice(base.length + 1) : relative;
                        return matcher.ignores(stat.isDir ? `${sub}/` : sub);
                    }))
                        continue;
                    visited += 1;
                    if (visited > 50000)
                        return true;
                    if (await onEntry(child, relative, stat.isDir))
                        return true;
                    if (stat.isDir && item.depth + 1 < maxDepth)
                        stack.push({ path: child, relative, depth: item.depth + 1, rules });
                }
            }
            return false;
        }
        for (const name of ["grep", "find", "ls"]) {
            definitions.push({
                capabilityId: `pi.broker.${name}`,
                name,
                description: `${name} in the workspace without a subprocess`,
                schema: searchSchema(name),
                minimumEffects: ["bounded-read"],
                maxResultBytes: 256 * 1024,
                // These traverse the workspace tree, so they carry the long bound.
                deadlineCategory: "long-traversal",
                classify: async (value) => {
                    const input = value;
                    if (name === "grep")
                        safeSearchExpression(input.pattern || "", !!input.literal, !!input.ignoreCase);
                    if (name === "find" && (input.pattern || "").length > 256)
                        throw new Error("pi_pattern_unsupported");
                    const identity = await resolveRuntimePathIdentity({
                        root,
                        path: input.path || root,
                    });
                    assertPublic(identity.canonicalKey);
                    return {
                        effects: ["bounded-read"],
                        authorizationKeys: [`workspace:${root}`],
                        resourceKeys: [`dir:${identity.canonicalKey}`],
                        cost: 1,
                    };
                },
                execute: async (value, context) => {
                    if (context.signal.aborted)
                        return { status: "canceled", effectCertainty: "not_started" };
                    try {
                        const input = value;
                        const startIdentity = await resolveRuntimePathIdentity({
                            root,
                            path: input.path || root,
                        });
                        assertPublic(startIdentity.canonicalKey);
                        const start = startIdentity.path;
                        const stat = await statRuntimePathStrict(start);
                        if (!stat.isDir)
                            return failure("pi_search_not_directory");
                        const limit = Math.min(input.limit ||
                            (name === "grep" ? 100 : name === "find" ? 1000 : 500), name === "grep" ? 100 : name === "find" ? 1000 : 500);
                        const entries = [];
                        const matches = [];
                        let visibleBytes = 0;
                        let outputFull = false;
                        let truncated = false;
                        const pattern = name === "find" ? input.pattern || "" : null;
                        const filter = input.glob || null;
                        const expression = name === "grep"
                            ? safeSearchExpression(input.pattern || "", !!input.literal, !!input.ignoreCase)
                            : null;
                        const exhausted = await walk(start, async (path, relative, isDir) => {
                            if (context.signal.aborted)
                                throw new Error("pi_search_canceled");
                            if (name === "ls" && relative.includes("/"))
                                return false;
                            if (name === "ls" ||
                                (name === "find" &&
                                    (matchesGlob(pattern, relative) ||
                                        matchesGlob(pattern, getBaseName(path))))) {
                                const entry = isDir ? `${relative}/` : relative;
                                const entryBytes = textEncoder.encode(entry).length;
                                if (visibleBytes + entryBytes > VISIBLE_BYTES) {
                                    outputFull = true;
                                    return true;
                                }
                                visibleBytes += entryBytes;
                                entries.push(entry);
                                return entries.length >= limit;
                            }
                            if (name === "grep" &&
                                !isDir &&
                                (!filter ||
                                    matchesGlob(filter, relative) ||
                                    matchesGlob(filter, getBaseName(path)))) {
                                const info = await statRuntimePathStrict(path);
                                if (info.size > 10 * 1024 * 1024)
                                    return false;
                                const stop = {};
                                let lineNo = 0;
                                const contextLines = input.context || 0;
                                const previous = [];
                                const pending = [];
                                try {
                                    await scanRuntimeUtf8Lines({
                                        path,
                                        onLine: (line) => {
                                            lineNo += 1;
                                            const shown = visibleText(line.text.replace(/\n$/, "")).text.slice(0, 500);
                                            for (const item of pending) {
                                                if (lineNo <= item.until) {
                                                    const nextBytes = textEncoder.encode(shown).length;
                                                    if (visibleBytes + nextBytes > VISIBLE_BYTES) {
                                                        outputFull = true;
                                                        throw stop;
                                                    }
                                                    visibleBytes += nextBytes;
                                                    item.match.after.push(shown);
                                                }
                                            }
                                            while (pending.length && pending[0].until <= lineNo)
                                                pending.shift();
                                            if (matches.length >= limit && pending.length === 0)
                                                throw stop;
                                            if (matches.length >= limit)
                                                return;
                                            if (!expression.test(line.text)) {
                                                if (contextLines) {
                                                    previous.push(shown);
                                                    if (previous.length > contextLines)
                                                        previous.shift();
                                                }
                                                return;
                                            }
                                            const before = contextLines ? [...previous] : undefined;
                                            const nextBytes = textEncoder.encode(relative + shown + (before || []).join("")).length + 32;
                                            if (visibleBytes + nextBytes > VISIBLE_BYTES) {
                                                outputFull = true;
                                                throw stop;
                                            }
                                            visibleBytes += nextBytes;
                                            const match = {
                                                path: relative,
                                                line: lineNo,
                                                text: shown,
                                                ...(contextLines
                                                    ? { before, after: [] }
                                                    : {}),
                                            };
                                            matches.push(match);
                                            if (contextLines)
                                                pending.push({ until: lineNo + contextLines, match });
                                            if (contextLines) {
                                                previous.push(shown);
                                                if (previous.length > contextLines)
                                                    previous.shift();
                                            }
                                            if (matches.length >= limit && !contextLines)
                                                throw stop;
                                        },
                                    });
                                }
                                catch (error) {
                                    if (error !== stop)
                                        throw error;
                                }
                                return outputFull || matches.length >= limit;
                            }
                            return false;
                        }, name === "ls" ? 1 : Infinity);
                        truncated = exhausted || outputFull;
                        if (name === "grep")
                            return result({ matches, truncated });
                        return result(name === "ls"
                            ? { entries: entries.sort(), truncated }
                            : { paths: entries.sort(), truncated });
                    }
                    catch (error) {
                        return failure(String(error).includes("canceled")
                            ? "pi_search_canceled"
                            : "pi_search_failed");
                    }
                },
            });
        }
    }
    if (args.mode === "trusted") {
        const subprocess = getMozillaSubprocessModule();
        const windows = detectRuntimePlatform() === "win32";
        const shellNames = windows ? ["pwsh", "powershell"] : ["bash"];
        const snapshot = getRuntimeEnvironmentSnapshot();
        const servicesEnv = globalThis.Services?.env;
        const systemRoot = windows
            ? snapshot.env.SystemRoot ||
                snapshot.env.SYSTEMROOT ||
                snapshot.env.WINDIR ||
                servicesEnv?.get?.("SystemRoot") ||
                ""
            : "";
        let shellPath = "";
        for (const name of shellNames) {
            const resolution = await resolveRuntimeCommand(name).catch(() => null);
            if (resolution?.available &&
                resolution.resolvedPath &&
                (!windows || /\.exe$/i.test(resolution.resolvedPath)) &&
                !resolution.resolvedPath
                    .replace(/\\/g, "/")
                    .toLowerCase()
                    .startsWith(`${root.replace(/\\/g, "/").toLowerCase()}/`)) {
                shellPath = resolution.resolvedPath;
                break;
            }
        }
        if (subprocess?.call &&
            shellPath &&
            (!windows || /^[A-Za-z]:[\\/]/.test(systemRoot))) {
            const name = windows ? "powershell" : "bash";
            definitions.push({
                capabilityId: `pi.native.${name}`,
                name,
                description: "Run a native command in the workspace",
                schema: {
                    type: "object",
                    properties: {
                        command: { type: "string", minLength: 1 },
                        timeout: { type: "integer", minimum: 1, maximum: 3600 },
                    },
                    required: ["command"],
                    additionalProperties: false,
                },
                minimumEffects: ["code-execution"],
                maxResultBytes: 256 * 1024,
                batchMode: "exclusive",
                deadlineCategory: "shell",
                classify: (value) => {
                    const command = value.command.trim();
                    const literal = /^(?:pwd|true|false)$/.test(command);
                    return {
                        effects: literal
                            ? ["code-execution", "bounded-read"]
                            : [
                                "code-execution",
                                "workspace-mutation",
                                "external-egress",
                                "local-network",
                                "host-control",
                            ],
                        authorizationKeys: [
                            `workspace:${root}`,
                            literal ? "execution:literal" : "execution:opaque",
                        ],
                        resourceKeys: [`workspace:${root}`],
                        cost: 2,
                        safeRefs: [literal ? "literal-execution" : "opaque-execution"],
                    };
                },
                execute: async (value, context) => {
                    if (context.signal.aborted)
                        return { status: "canceled", effectCertainty: "not_started" };
                    const input = value;
                    const scratch = joinPath(args.ownerRoot, "scratch");
                    await ensureRuntimeDirectoryStrict(args.ownerRoot);
                    await ensureRuntimeDirectoryStrict(scratch);
                    if (!windows) {
                        const ownerPrivate = await setRuntimeFilePermissions(args.ownerRoot, 0o700);
                        const scratchPrivate = await setRuntimeFilePermissions(scratch, 0o700);
                        if (!ownerPrivate || !scratchPrivate)
                            return failure("pi_shell_private_storage_unavailable");
                    }
                    const outputPath = joinPath(scratch, `shell-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);
                    await writeRuntimeBytes(outputPath, new Uint8Array());
                    if (!windows && !(await setRuntimeFilePermissions(outputPath, 0o600)))
                        return failure("pi_shell_private_storage_unavailable");
                    const environment = windows
                        ? {
                            SystemRoot: systemRoot,
                            WINDIR: systemRoot,
                            PATH: `${joinPath(systemRoot, "System32")};${systemRoot}`,
                            HOME: args.ownerRoot,
                            USERPROFILE: args.ownerRoot,
                            TEMP: scratch,
                            TMP: scratch,
                        }
                        : {
                            PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
                            HOME: args.ownerRoot,
                            TMPDIR: scratch,
                            LANG: "C.UTF-8",
                        };
                    let process;
                    try {
                        process = await subprocess.call({
                            command: shellPath,
                            arguments: windows
                                ? [
                                    "-NoLogo",
                                    "-NoProfile",
                                    "-NonInteractive",
                                    "-Command",
                                    input.command,
                                ]
                                : ["--noprofile", "--norc", "-c", input.command],
                            environment,
                            environmentAppend: false,
                            workdir: root,
                            stderr: "pipe",
                        });
                    }
                    catch {
                        return {
                            status: "failed",
                            effectCertainty: "unknown",
                            code: "pi_shell_start_unknown",
                        };
                    }
                    let bytes = 0;
                    let tail = "";
                    let overflow = false;
                    async function drain(pipe) {
                        while (pipe?.readString) {
                            const chunk = await pipe.readString();
                            if (!chunk)
                                break;
                            bytes += textEncoder.encode(chunk).length;
                            if (bytes > 50 * 1024 * 1024) {
                                overflow = true;
                                process.kill?.();
                                break;
                            }
                            await appendRuntimeTextFile(outputPath, chunk);
                            tail = `${tail}${chunk}`;
                            if (tail.length > 2 * VISIBLE_BYTES)
                                tail = tail.slice(-2 * VISIBLE_BYTES);
                        }
                    }
                    const drains = Promise.allSettled([
                        drain(process.stdout),
                        drain(process.stderr),
                    ]);
                    let timedOut = false;
                    let canceled = false;
                    // Resolves the logical race below. Requesting a stop is not a reason
                    // to keep waiting for the child: the physical claim is tracked
                    // separately, so the caller is told the outcome is unknown as soon as
                    // the stop is requested, instead of when the Gateway limit fires.
                    let resolveAborted;
                    const aborted = new Promise((resolve) => {
                        resolveAborted = () => resolve("aborted");
                    });
                    const requestStop = () => {
                        try {
                            process.kill?.();
                        }
                        catch {
                            /* termination is unproved */
                        }
                    };
                    // The requested timeout is clamped to the trusted Shell ceiling;
                    // omitting it uses the trusted default rather than any model value.
                    const timeoutMs = Math.min(input.timeout || PI_TOOL_SHELL_DEFAULT_DEADLINE_MS / 1000, PI_TOOL_SHELL_MAX_DEADLINE_MS / 1000) * 1000;
                    const timer = setTimeout(() => {
                        timedOut = true;
                        requestStop();
                        resolveAborted();
                    }, timeoutMs);
                    const onAbort = () => {
                        canceled = true;
                        requestStop();
                        resolveAborted();
                    };
                    context.signal.addEventListener("abort", onAbort, { once: true });
                    let exit;
                    try {
                        // Real settlement: the child's observed wait, not a timer. A
                        // logical timeout or cancel returns below while this promise stays
                        // registered, so claims and files are held until exit is proved.
                        const observed = (async () => {
                            const value = await process.wait?.();
                            const results = await drains;
                            if (results.some((item) => item.status === "rejected"))
                                throw new Error("pi_shell_output_failed");
                            return value;
                        })();
                        context.trackPhysical?.(observed.then(() => "settled", () => "unknown"));
                        // The logical result is still bounded: a timeout or cancel stops
                        // waiting and reports unknown, while the registered promise above
                        // keeps the physical claim until the exit is actually observed.
                        const settled = await Promise.race([
                            observed.then((value) => ({ kind: "settled", value })),
                            aborted.then(() => ({ kind: "aborted", value: null })),
                        ]);
                        if (settled.kind === "aborted")
                            return {
                                status: "failed",
                                effectCertainty: "unknown",
                                code: timedOut ? "pi_shell_timeout" : "pi_shell_canceled",
                            };
                        exit = settled.value;
                    }
                    catch {
                        return {
                            status: "failed",
                            effectCertainty: "unknown",
                            code: "pi_shell_state_unknown",
                        };
                    }
                    finally {
                        clearTimeout(timer);
                        context.signal.removeEventListener("abort", onAbort);
                        // Release the stop signal's waiter when the child won the race, so
                        // a settled call leaves nothing pending behind it.
                        resolveAborted();
                    }
                    if (overflow || timedOut || canceled)
                        return {
                            status: "failed",
                            effectCertainty: "unknown",
                            code: overflow
                                ? "pi_shell_output_limit"
                                : timedOut
                                    ? "pi_shell_timeout"
                                    : "pi_shell_canceled",
                        };
                    const code = normalizeSubprocessExitCode(exit) ??
                        normalizeSubprocessExitCode(process.exitCode);
                    const visible = visibleTail(tail);
                    return {
                        status: code === 0 ? "completed" : "failed",
                        effectCertainty: "confirmed_complete",
                        code: code === 0 ? undefined : "pi_shell_exit_nonzero",
                        value: {
                            text: visible.text,
                            truncated: visible.truncated || bytes > textEncoder.encode(tail).length,
                            outputPath,
                            exitCode: code,
                        },
                    };
                },
            });
        }
    }
    const order = args.mode === "trusted"
        ? ["read", "bash", "powershell", "edit", "write"]
        : ["read", "edit", "write", "grep", "find", "ls"];
    definitions.sort((left, right) => order.indexOf(left.name) - order.indexOf(right.name));
    return {
        definitions,
        materializeOrReuse,
        materializeOrReuseMany,
        commitGeneratedOutputs,
        beginGeneratedTextOutput,
        snapshotUserFiles,
        listUserFileSnapshots,
        resolveUserFileSnapshot,
        prepareStoredAttachment,
        runtimeCapability: {
            identity: `pi-native:${args.mode}:${root}`,
            availableCapabilityIds: definitions.map((item) => item.capabilityId),
        },
    };
}
async function readOwnerManifestEntries(ownerRoot) {
    const manifestPath = joinPath(ownerRoot, "managed-files.json");
    if (!(await runtimePathExists(manifestPath)))
        return [];
    const info = await statRuntimePathStrict(manifestPath);
    if (!info.exists || info.isDir || info.size > 1024 * 1024)
        throw new Error("pi_manifest_corrupt");
    // A corrupt manifest is missing quota evidence, so admission fails closed
    // rather than admitting against an unverified owner.
    return parseManifestEntries(JSON.parse(await readRuntimeTextFileStrict(manifestPath)));
}
async function ownerUsageBytesFor(args) {
    const { ownerRoot, workspaceRoot, stagedBytesKey } = args;
    const auditRoot = joinPath(workspaceRoot, OWNER_RUNTIME_AUDIT_DIR);
    // Private owner bytes are already counted by the manifest, so the walk skips
    // them only when its root is an ancestor of the owner tree: a nested owner
    // workspace is real content and must count. Diagnostics are measured apart
    // so they are counted exactly once and can be reclaimed when over quota.
    const excludeAudit = (path) => isWithin(auditRoot, path);
    const excludePrivateOwner = isWithin(workspaceRoot, ownerRoot)
        ? (path) => isWithin(ownerRoot, path)
        : () => false;
    return (args.manifestBytes +
        (await walkByteTotal(workspaceRoot, (path) => excludeAudit(path) || excludePrivateOwner(path))) +
        (await auditByteTotal(workspaceRoot, auditRoot)) +
        ownerStagedBytesFor(stagedBytesKey));
}
// One canonical owner key for every quota consumer. Resolving it against the
// same scan root everywhere keeps the in-flight staging reservation key that
// `prepareStoredAttachment` reserves under identical to the one the audit seam
// reads: a nested owner (an ancestor of the workspace) resolves to nothing and
// both sides fall back to the same lexical key.
async function resolveOwnerKey(scanRoot, ownerRoot) {
    const identity = await resolveRuntimePathIdentity({
        root: scanRoot,
        path: ownerRoot,
        allowMissing: true,
    }).catch(() => null);
    return identity?.canonicalKey.replace(/\\/g, "/") || ownerKey(ownerRoot);
}
// Diagnostics are lower priority than business data: when a business
// allocation would push the owner over quota, it reclaims audit bytes first and
// only rejects when there is no room left. The reclaim runs under the owner lock
// and never acquires the audit queue or quota lock itself.
async function reclaimAuditForQuota(ownerRoot, workspaceRoot, requiredBytes) {
    const { reclaimPiRuntimeAudit } = await import("./piRuntimeAudit");
    await reclaimPiRuntimeAudit(ownerRoot, workspaceRoot, requiredBytes).catch(() => undefined);
}
/**
 * Owner-private quota seam for the Runtime Audit writer. It shares the single
 * owner lock, manifest accounting and workspace scan with the business
 * allocation paths, so an audit append can never push an owner past the quota
 * unnoticed. An audit append never reclaims for its own admission: without
 * capacity it fails, and the audit layer records the gap.
 */
export async function withPiOwnerAuditQuota(args, write) {
    const stagedBytesKey = await resolveOwnerKey(args.workspaceRoot, args.ownerRoot);
    return withOwnerLock(args.ownerRoot, async () => {
        const entries = await readOwnerManifestEntries(args.ownerRoot);
        const usage = await ownerUsageBytesFor({
            ownerRoot: args.ownerRoot,
            workspaceRoot: args.workspaceRoot,
            stagedBytesKey,
            manifestBytes: entries.reduce((sum, entry) => sum + entry.size, 0),
        });
        if (usage + Math.max(0, args.additionalBytes) > OWNER_QUOTA_BYTES)
            throw new Error("pi_owner_quota_exceeded");
        return write();
    });
}

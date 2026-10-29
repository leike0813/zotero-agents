import { sha256Hex } from "../../utils/sha256";
import {
  getBaseName,
  getParentPath,
  normalizeAttachmentFilename,
  normalizeNativeLocalPath,
} from "../../platform/path";
import { joinPath } from "../../utils/path";
import type {
  WorkflowStagedAttachmentSources,
  WorkflowStoredAttachmentImportRequest,
} from "../../workflows/workflowStoredAttachmentImport";
import {
  acquireRuntimeTemporaryOwnership,
  copyRuntimeFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeBytes,
  removeRuntimePath,
  statRuntimePathStrict,
} from "../runtimePersistence";

export class WorkflowStoredAttachmentInputError extends Error {
  constructor(
    message: string,
    readonly resource?: {
      resource: "entries" | "bytes";
      limit: number;
      observed: number;
    },
  ) {
    super(message);
    this.name = "WorkflowStoredAttachmentInputError";
  }
}

type StoredAttachmentStagerDependencies = {
  getStagingRoot(): string;
  validateSource?(
    path: string,
  ): Promise<{ sizeBytes: number; isSymlink?: boolean } | undefined | void>;
  ensureDirectory(path: string): Promise<void>;
  copyFile(sourcePath: string, targetPath: string): Promise<void>;
  removePath(path: string): Promise<unknown>;
};

const ENTRY_LIMIT = 10_000;
const BYTE_LIMIT = 4 * 1024 * 1024 * 1024;

function companionSegments(value: unknown) {
  const normalized = String(value || "").replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    segments.some(
      (part) =>
        !part ||
        part.startsWith(".") ||
        // eslint-disable-next-line no-control-regex -- Windows filenames exclude C0 controls.
        /[<>:"|?*\u0000-\u001f]/.test(part) ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part) ||
        new TextEncoder().encode(part).byteLength > 180,
    )
  ) {
    throw new WorkflowStoredAttachmentInputError("Unsafe companion file path");
  }
  return segments;
}

export function createZoteroHostPreparedFileStager(
  dependencies: StoredAttachmentStagerDependencies,
) {
  return async function stageStoredAttachmentSources(
    request: Pick<
      WorkflowStoredAttachmentImportRequest,
      "path" | "targetFilename" | "companionFiles" | "defaultMetadata"
    >,
  ): Promise<WorkflowStagedAttachmentSources> {
    const mainPath = normalizeNativeLocalPath(String(request?.path || ""));
    if (!mainPath) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment path is invalid",
      );
    }
    const requested = String(request?.targetFilename || "").trim();
    if (
      requested.includes("\0") ||
      (requested && getBaseName(requested) !== requested)
    ) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment target filename is invalid",
      );
    }
    const mainFilename = normalizeAttachmentFilename(
      requested || getBaseName(mainPath),
    );
    const companions = (request?.companionFiles || []).map((item) => ({
      sourcePath: normalizeNativeLocalPath(String(item?.sourcePath || "")),
      segments: companionSegments(item?.relativePath),
    }));
    if (companions.some((item) => !item.sourcePath)) {
      throw new WorkflowStoredAttachmentInputError(
        "Companion source path is invalid",
      );
    }
    if (companions.length + 1 > ENTRY_LIMIT) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment entry limit exceeded",
        {
          resource: "entries",
          limit: ENTRY_LIMIT,
          observed: companions.length + 1,
        },
      );
    }
    const targets = [
      mainFilename,
      ...companions.map((item) => item.segments.join("/")),
    ].map((target) => target.toLowerCase());
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        if (
          targets[i] === targets[j] ||
          targets[i].startsWith(`${targets[j]}/`) ||
          targets[j].startsWith(`${targets[i]}/`)
        ) {
          throw new WorkflowStoredAttachmentInputError(
            "Stored attachment targets collide",
          );
        }
      }
    }
    let totalBytes = 0;
    for (const path of [
      mainPath,
      ...companions.map((item) => item.sourcePath),
    ]) {
      const stat = await dependencies.validateSource?.(path);
      if (stat?.isSymlink) {
        throw new WorkflowStoredAttachmentInputError(
          "Stored attachment source must not be a symbolic link",
        );
      }
      totalBytes += Math.max(0, Number(stat?.sizeBytes || 0));
      if (totalBytes > BYTE_LIMIT) {
        throw new WorkflowStoredAttachmentInputError(
          "Stored attachment byte limit exceeded",
          { resource: "bytes", limit: BYTE_LIMIT, observed: totalBytes },
        );
      }
    }
    const stagingDirectory = joinPath(
      dependencies.getStagingRoot(),
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10) || "import"}`,
    );
    const stagedMainPath = joinPath(stagingDirectory, mainFilename);
    const entries = companions.map((item) => ({
      relativePath: item.segments.join("/"),
      stagedPath: joinPath(stagingDirectory, ...item.segments),
      sourcePath: item.sourcePath,
    }));
    try {
      await dependencies.ensureDirectory(getParentPath(stagedMainPath));
      await dependencies.copyFile(mainPath, stagedMainPath);
      for (const entry of entries) {
        await dependencies.ensureDirectory(getParentPath(entry.stagedPath));
        await dependencies.copyFile(entry.sourcePath, entry.stagedPath);
      }
      return {
        stagingDirectory,
        mainFilename,
        stagedMainPath,
        entries: entries.map(({ relativePath, stagedPath }) => ({
          relativePath,
          stagedPath,
        })),
        cleanup: () => removeStagingDirectory(dependencies, stagingDirectory),
      };
    } catch (error) {
      try {
        await removeStagingDirectory(dependencies, stagingDirectory);
      } catch (cleanupError) {
        attachCleanupFailure(error, cleanupError);
      }
      throw error;
    }
  };
}

async function removeStagingDirectory(
  dependencies: Pick<StoredAttachmentStagerDependencies, "removePath">,
  stagingDirectory: string,
) {
  if ((await dependencies.removePath(stagingDirectory)) === false) {
    throw new Error("Managed attachment staging cleanup did not complete");
  }
}

function attachCleanupFailure(primaryError: unknown, cleanupError: unknown) {
  if (!(primaryError instanceof Error)) return;
  const target = primaryError as Error & { cleanupErrors?: unknown[] };
  target.cleanupErrors = [...(target.cleanupErrors || []), cleanupError];
}

export function createRuntimeBoundZoteroHostPreparedFiles() {
  let releaseOwnership: (() => void) | undefined;
  let disposed = false;
  let successfulPreparations = 0;
  let inFlightPreparations = 0;
  const prepareWaiters = new Set<() => void>();
  const stager = createZoteroHostPreparedFileStager({
    getStagingRoot: () =>
      joinPath(
        getRuntimePersistencePaths().tmpDir,
        "workflow-attachment-import",
      ),
    async validateSource(path) {
      const stat = await statRuntimePathStrict(path);
      if (!stat.exists || stat.isDir || stat.isSymlink)
        throw new WorkflowStoredAttachmentInputError(
          "Stored attachment source must be a regular file",
        );
      return { sizeBytes: stat.size, isSymlink: stat.isSymlink };
    },
    ensureDirectory: ensureRuntimeDirectory,
    copyFile: async (sourcePath, targetPath) => {
      await copyRuntimeFile({ sourcePath, targetPath });
    },
    removePath: removeRuntimePath,
  });
  const owner = createZoteroHostPreparedFiles({
    stageStoredAttachmentSources: stager,
    readBytes: readRuntimeBytes,
  });
  return Object.freeze({
    async prepareStoredAttachment(
      request: Pick<
        WorkflowStoredAttachmentImportRequest,
        "path" | "targetFilename" | "companionFiles" | "defaultMetadata"
      >,
    ) {
      if (disposed) throw new Error("Prepared file scope is disposed");
      releaseOwnership ||= acquireRuntimeTemporaryOwnership();
      inFlightPreparations += 1;
      try {
        const prepared = await owner.prepareStoredAttachment(request);
        successfulPreparations += 1;
        return prepared;
      } finally {
        inFlightPreparations -= 1;
        if (inFlightPreparations === 0) {
          for (const resolve of prepareWaiters) resolve();
          prepareWaiters.clear();
        }
        if (inFlightPreparations === 0 && successfulPreparations === 0) {
          releaseOwnership?.();
          releaseOwnership = undefined;
        }
      }
    },
    resolveStoredAttachment: owner.resolveStoredAttachment,
    async dispose() {
      if (disposed) return;
      disposed = true;
      try {
        while (inFlightPreparations > 0) {
          await new Promise<void>((resolve) => prepareWaiters.add(resolve));
        }
        await owner.dispose();
      } finally {
        releaseOwnership?.();
        releaseOwnership = undefined;
      }
    },
  });
}

export type PreparedStoredAttachmentFile = Readonly<{
  relativePath: string;
  sizeBytes: number;
  sha256: string;
}>;

export type PreparedStoredAttachmentSnapshot = Readonly<{
  identity: string;
  main: PreparedStoredAttachmentFile;
  companions: readonly PreparedStoredAttachmentFile[];
}>;

export type PreparedStoredAttachment = Readonly<{
  snapshot: PreparedStoredAttachmentSnapshot;
}>;

export type ResolvedPreparedStoredAttachment = Readonly<{
  snapshot: PreparedStoredAttachmentSnapshot;
  defaultMetadata?: Readonly<{ title?: string; contentType?: string }>;
  stagingDirectory: string;
  mainPath: string;
  companionPaths: readonly Readonly<{
    relativePath: string;
    path: string;
  }>[];
  cleanup(): Promise<void>;
  complete(): void;
}>;

export type ZoteroHostPreparedFiles = Readonly<{
  prepareStoredAttachment(
    request: Pick<
      WorkflowStoredAttachmentImportRequest,
      "path" | "targetFilename" | "companionFiles" | "defaultMetadata"
    >,
  ): Promise<PreparedStoredAttachment>;
  resolveStoredAttachment(
    prepared: PreparedStoredAttachment,
  ): Promise<ResolvedPreparedStoredAttachment>;
  dispose(): Promise<void>;
}>;

type PreparedRecord = Readonly<{
  staged: WorkflowStagedAttachmentSources;
  snapshot: PreparedStoredAttachmentSnapshot;
  defaultMetadata?: Readonly<{ title?: string; contentType?: string }>;
}>;

type Dependencies = Readonly<{
  stageStoredAttachmentSources(
    request: Pick<
      WorkflowStoredAttachmentImportRequest,
      "path" | "targetFilename" | "companionFiles" | "defaultMetadata"
    >,
  ): Promise<WorkflowStagedAttachmentSources>;
  readBytes(path: string): Promise<Uint8Array>;
}>;

async function requiredSha256(bytes: Uint8Array) {
  const digest = await sha256Hex(bytes);
  if (!digest) throw new Error("SHA-256 is unavailable");
  return digest;
}

async function describeFile(
  relativePath: string,
  path: string,
  readBytes: Dependencies["readBytes"],
): Promise<PreparedStoredAttachmentFile> {
  const bytes = await readBytes(path);
  return Object.freeze({
    relativePath,
    sizeBytes: bytes.byteLength,
    sha256: await requiredSha256(bytes),
  });
}

async function describeStagedAttachment(
  staged: WorkflowStagedAttachmentSources,
  readBytes: Dependencies["readBytes"],
): Promise<PreparedStoredAttachmentSnapshot> {
  const main = await describeFile(
    staged.mainFilename,
    staged.stagedMainPath,
    readBytes,
  );
  const companions = await Promise.all(
    staged.entries.map((entry) =>
      describeFile(entry.relativePath, entry.stagedPath, readBytes),
    ),
  );
  companions.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
  const identity = await requiredSha256(
    new TextEncoder().encode(JSON.stringify({ main, companions })),
  );
  return Object.freeze({
    main,
    companions: Object.freeze(companions),
    identity,
  });
}

async function verifyRecord(
  record: PreparedRecord,
  readBytes: Dependencies["readBytes"],
) {
  const current = await describeStagedAttachment(record.staged, readBytes);
  if (current.identity !== record.snapshot.identity) {
    throw new Error("Prepared attachment source changed before execution");
  }
}

export function createZoteroHostPreparedFiles(
  dependencies: Dependencies,
): ZoteroHostPreparedFiles {
  const records = new WeakMap<PreparedStoredAttachment, PreparedRecord>();
  const active = new Set<PreparedStoredAttachment>();
  let disposed = false;

  const release = async (prepared: PreparedStoredAttachment) => {
    const record = records.get(prepared);
    if (!record) return;
    active.delete(prepared);
    records.delete(prepared);
    await record.staged.cleanup();
  };

  return {
    async prepareStoredAttachment(request) {
      if (disposed) throw new Error("Prepared file scope is disposed");
      const staged = await dependencies.stageStoredAttachmentSources(request);
      try {
        const snapshot = await describeStagedAttachment(
          staged,
          dependencies.readBytes,
        );
        const prepared = Object.freeze({ snapshot });
        const defaultMetadata = request.defaultMetadata
          ? Object.freeze({ ...request.defaultMetadata })
          : undefined;
        records.set(prepared, { staged, snapshot, defaultMetadata });
        active.add(prepared);
        return prepared;
      } catch (error) {
        await staged.cleanup();
        throw error;
      }
    },
    async resolveStoredAttachment(prepared) {
      if (disposed) throw new Error("Prepared file scope is disposed");
      const record = records.get(prepared);
      if (!record) {
        throw new Error("Prepared attachment is not owned by this scope");
      }
      await verifyRecord(record, dependencies.readBytes);
      return Object.freeze({
        snapshot: record.snapshot,
        ...(record.defaultMetadata
          ? { defaultMetadata: record.defaultMetadata }
          : {}),
        stagingDirectory: record.staged.stagingDirectory,
        mainPath: record.staged.stagedMainPath,
        companionPaths: Object.freeze(
          record.staged.entries.map((entry) =>
            Object.freeze({
              relativePath: entry.relativePath,
              path: entry.stagedPath,
            }),
          ),
        ),
        cleanup: () => release(prepared),
        complete: () => {
          active.delete(prepared);
          records.delete(prepared);
        },
      });
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      const prepared = [...active];
      await Promise.all(prepared.map((entry) => release(entry)));
    },
  };
}

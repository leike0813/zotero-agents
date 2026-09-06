import { sha256Hex } from "../utils/sha256";
import type {
  WorkflowStagedAttachmentSources,
  WorkflowStoredAttachmentImportRequest,
} from "../workflows/workflowStoredAttachmentImport";

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
      "path" | "targetFilename" | "companionFiles"
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
}>;

type Dependencies = Readonly<{
  stageStoredAttachmentSources(
    request: Pick<
      WorkflowStoredAttachmentImportRequest,
      "path" | "targetFilename" | "companionFiles"
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
        records.set(prepared, { staged, snapshot });
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

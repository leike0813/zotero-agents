import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  listRuntimeChildren,
  moveRuntimePath,
  readRuntimeBytes,
  readRuntimeTextFile,
  replacePrivateRuntimeTextFileAtomically,
  removeRuntimePath,
  runtimePathExists,
  scanRuntimeTree,
} from "../runtimePersistence";
import type { ResolvedPreparedStoredAttachment } from "./zoteroHostPreparedFiles";
import { getParentPath } from "../../platform/path";
import { joinPath } from "../../utils/path";
import { sha256Hex } from "../../utils/sha256";
import type { AttachmentContentManifestDto } from "../../workflows/types";

export type ZoteroNativeAdmissionPhase = "read" | "effect";

export type ZoteroNativeAdmission = <T>(
  work: () => Promise<T> | T,
  phase?: ZoteroNativeAdmissionPhase,
) => Promise<T>;

export type StoredAttachmentMetadata = Readonly<{
  title?: string;
  contentType?: string;
  charset?: string;
  originalUrl?: string;
}>;

export type NativeAttachmentFailureStatus =
  | "failed"
  | "unknown"
  | "repair_required";

export type DownloadedStoredAttachmentSource = Readonly<{
  path: string;
  cleanup(): Promise<void>;
}>;

type NativeAttachmentFailure = Error & {
  cleanupErrors?: unknown[];
  nativeAttachmentFailureStatus?: NativeAttachmentFailureStatus;
};

type StoredAttachmentReplacementJournal = {
  schema: "zotero-agents.stored-attachment-replacement.v1";
  operationId: string;
  libraryId: number;
  attachmentKey: string;
  storageRoot: string;
  backupRoot: string;
  stagingRoot: string;
  oldFilename: string;
  oldContentType: string;
  newFilename: string;
  newContentType: string;
  oldDigest: string;
  newDigest: string;
  phase: "prepared" | "old_backed_up" | "new_promoted" | "metadata_committed";
};

const ATTACHMENT_REPLACEMENT_JOURNAL_SCHEMA =
  "zotero-agents.stored-attachment-replacement.v1" as const;
let attachmentReplacementTail = Promise.resolve();

function serializeAttachmentReplacement<T>(work: () => Promise<T>) {
  // ponytail: one global lock; split by attachment only if replacement throughput matters.
  const result = attachmentReplacementTail.catch(() => undefined).then(work);
  attachmentReplacementTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function replacementJournalDirectory() {
  return joinPath(
    getRuntimePersistencePaths().stateDir,
    "stored-attachment-replacements",
  );
}

async function replacementJournalPath(operationId: string) {
  const digest = await sha256Hex(new TextEncoder().encode(operationId));
  if (!digest) throw new Error("SHA-256 is unavailable");
  return joinPath(replacementJournalDirectory(), `${digest}.json`);
}

async function writeReplacementJournal(
  path: string,
  journal: StoredAttachmentReplacementJournal,
) {
  await ensureRuntimeDirectory(replacementJournalDirectory());
  await replacePrivateRuntimeTextFileAtomically(
    path,
    `${JSON.stringify(journal)}\n`,
  );
}

function assertReplacementJournal(
  value: unknown,
): asserts value is StoredAttachmentReplacementJournal {
  const journal = value as Partial<StoredAttachmentReplacementJournal> | null;
  const strings = [
    journal?.operationId,
    journal?.attachmentKey,
    journal?.storageRoot,
    journal?.backupRoot,
    journal?.stagingRoot,
    journal?.oldFilename,
    journal?.oldContentType,
    journal?.newFilename,
    journal?.newContentType,
    journal?.oldDigest,
    journal?.newDigest,
  ];
  if (
    !journal ||
    journal.schema !== ATTACHMENT_REPLACEMENT_JOURNAL_SCHEMA ||
    !Number.isSafeInteger(journal.libraryId) ||
    Number(journal.libraryId) <= 0 ||
    strings.some((entry) => typeof entry !== "string") ||
    !/^[a-f0-9]{64}$/.test(String(journal.oldDigest)) ||
    !/^[a-f0-9]{64}$/.test(String(journal.newDigest)) ||
    ![
      "prepared",
      "old_backed_up",
      "new_promoted",
      "metadata_committed",
    ].includes(String(journal.phase))
  ) {
    throw new Error(
      "repair_required: attachment replacement journal is invalid",
    );
  }
  const normalized = (path: string) =>
    path.replace(/\\/g, "/").replace(/\/+$/g, "");
  const storageRoot = normalized(journal.storageRoot!);
  const backupRoot = normalized(journal.backupRoot!);
  const stagingRoot = normalized(journal.stagingRoot!);
  const tmpRoot = normalized(
    joinPath(getRuntimePersistencePaths().tmpDir, "workflow-attachment-import"),
  );
  if (
    !storageRoot ||
    !backupRoot.startsWith(`${storageRoot}.replace-backup-`) ||
    !stagingRoot.startsWith(`${tmpRoot}/`)
  ) {
    throw new Error(
      "repair_required: attachment replacement paths are invalid",
    );
  }
}

function nativeFailure(error: unknown, status: NativeAttachmentFailureStatus) {
  const failure: NativeAttachmentFailure =
    error instanceof Error
      ? (error as NativeAttachmentFailure)
      : (new Error(String(error)) as NativeAttachmentFailure);
  failure.nativeAttachmentFailureStatus = status;
  return failure;
}

function nativeAttachmentFailureStatus(
  error: unknown,
): NativeAttachmentFailureStatus | undefined {
  return (error as NativeAttachmentFailure | undefined)
    ?.nativeAttachmentFailureStatus;
}

function attachCleanupFailure(
  primaryError: unknown,
  cleanupError: unknown,
  status: NativeAttachmentFailureStatus = "repair_required",
) {
  const failure = nativeFailure(primaryError, status);
  failure.cleanupErrors = [...(failure.cleanupErrors || []), cleanupError];
  return failure;
}

function nativeFile(path: string) {
  const file = Zotero.File?.pathToFile?.(path);
  if (!file) throw new Error("Zotero file conversion is unavailable");
  return file;
}

function derivedMimeType(filename: string) {
  const extension = filename.split(".").at(-1)?.toLowerCase();
  return (
    {
      pdf: "application/pdf",
      html: "text/html",
      htm: "text/html",
      json: "application/json",
      md: "text/markdown",
      txt: "text/plain",
    }[extension || ""] || "application/octet-stream"
  );
}

async function fileSetDigest(root: string) {
  const manifest = await scanRuntimeTree(root);
  if (manifest.issues.length) {
    throw new Error("Managed attachment content could not be inspected");
  }
  const entries = [];
  for (const entry of manifest.entries) {
    if (entry.kind !== "file") continue;
    const digest = await sha256Hex(await readRuntimeBytes(entry.absolutePath));
    if (!digest) throw new Error("SHA-256 is unavailable");
    entries.push([entry.relativePath.replace(/\\/g, "/"), digest]);
  }
  entries.sort(([left], [right]) => String(left).localeCompare(String(right)));
  const digest = await sha256Hex(
    new TextEncoder().encode(JSON.stringify(entries)),
  );
  if (!digest) throw new Error("SHA-256 is unavailable");
  return digest;
}

function canonicalRelativePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

async function matchesStoredContentManifest(args: {
  attachment: Zotero.Item;
  content: AttachmentContentManifestDto;
  admit: ZoteroNativeAdmission;
}) {
  const { linkMode, storedPath } = await args.admit(
    async () => ({
      linkMode: Number(
        (args.attachment as Zotero.Item & { attachmentLinkMode?: unknown })
          .attachmentLinkMode,
      ),
      storedPath: String(
        (await args.attachment.getFilePathAsync?.()) || "",
      ).trim(),
    }),
    "read",
  );
  if (linkMode !== 0 && linkMode !== 1) return false;
  const storageRoot = getParentPath(storedPath);
  if (!storageRoot) return false;

  const expected = [args.content.main, ...args.content.companions];
  const expectedByPath = new Map(
    expected.map((entry) => [canonicalRelativePath(entry.relativePath), entry]),
  );
  if (expectedByPath.size !== expected.length) return false;

  const actual = await scanRuntimeTree(storageRoot);
  if (actual.issues.length) {
    throw new Error("Managed attachment content could not be inspected");
  }
  const files = actual.entries.filter((entry) => entry.kind === "file");
  if (files.length !== expectedByPath.size) return false;
  for (const file of files) {
    const expectedFile = expectedByPath.get(
      canonicalRelativePath(file.relativePath),
    );
    if (!expectedFile || file.size !== expectedFile.sizeBytes) return false;
    const digest = await sha256Hex(await readRuntimeBytes(file.absolutePath));
    if (!digest) throw new Error("SHA-256 is unavailable");
    if (digest !== expectedFile.sha256.replace(/^sha256:/, "")) return false;
  }
  return true;
}

async function eraseAttachment(args: {
  attachment: Zotero.Item;
  admit: ZoteroNativeAdmission;
}) {
  await args.admit(() => args.attachment.eraseTx(), "effect");
}

function downloadFilename(url: string, fallbackFilename: string) {
  try {
    const candidate = new URL(url).pathname.split("/").at(-1)?.trim();
    if (
      candidate &&
      candidate !== "." &&
      candidate !== ".." &&
      !/[\\/\0]/.test(candidate)
    ) {
      return candidate;
    }
  } catch {
    // URL validation below classifies malformed input as a clean failure.
  }
  return fallbackFilename;
}

async function downloadStoredUrlToManagedStaging(args: {
  url: string;
  referrer?: string;
  fallbackFilename?: string;
}): Promise<DownloadedStoredAttachmentSource> {
  if (!/^https?:\/\/[^\s]+$/i.test(args.url)) {
    throw nativeFailure("Stored attachment URL is invalid", "failed");
  }
  const stagingDirectory = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "stored-url-download",
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10) || "download"}`,
  );
  const path = joinPath(
    stagingDirectory,
    downloadFilename(args.url, args.fallbackFilename || "download"),
  );
  const cleanup = async () => {
    try {
      await removeRuntimePath(stagingDirectory);
      if (await runtimePathExists(stagingDirectory)) {
        throw new Error("Downloaded attachment staging remains");
      }
    } catch (error) {
      throw nativeFailure(error, "repair_required");
    }
  };
  try {
    await ensureRuntimeDirectory(stagingDirectory);
    const download = (
      Zotero as unknown as {
        HTTP?: {
          download?: (
            uri: string,
            path: string,
            options?: { headers?: Record<string, string> },
          ) => Promise<unknown>;
        };
      }
    ).HTTP?.download;
    if (typeof download !== "function") {
      throw new Error("Zotero HTTP download is unavailable");
    }
    await download(args.url, path, {
      ...(args.referrer ? { headers: { Referer: args.referrer } } : {}),
    });
    if (!(await runtimePathExists(path))) {
      throw new Error("Downloaded attachment is unavailable");
    }
    return Object.freeze({ path, cleanup });
  } catch (error) {
    let primaryError = nativeFailure(error, "failed");
    try {
      await cleanup();
    } catch (cleanupError) {
      primaryError = attachCleanupFailure(primaryError, cleanupError);
    }
    throw primaryError;
  }
}

async function createLinkedUrlAttachment(args: {
  parent: Zotero.Item;
  libraryId: number;
  url: string;
  title?: string;
  contentType?: string;
  admit: ZoteroNativeAdmission;
}) {
  if (!Number.isInteger(args.libraryId) || args.libraryId <= 0) {
    throw nativeFailure("Attachment library ID is invalid", "failed");
  }
  try {
    return await args.admit(() => {
      if (typeof Zotero.Attachments?.linkFromURL !== "function") {
        throw new Error("Zotero.Attachments.linkFromURL is unavailable");
      }
      return Zotero.Attachments.linkFromURL({
        libraryID: args.libraryId,
        url: args.url,
        parentItemID: args.parent.id,
        title: args.title || args.url,
        contentType: args.contentType || "text/html",
      });
    }, "effect");
  } catch (error) {
    // Zotero 7/9/10 implement linkFromURL as one _addToDB transaction. A
    // rejection therefore has no returned or committed attachment owner.
    throw nativeFailure(error, "failed");
  }
}

async function importStoredAttachment(args: {
  prepared: ResolvedPreparedStoredAttachment;
  parent: Zotero.Item | null;
  libraryId: number;
  metadata?: StoredAttachmentMetadata;
  admit: ZoteroNativeAdmission;
  afterImport?: (attachment: Zotero.Item) => void;
  afterMetadataSave?: (attachment: Zotero.Item) => void;
}) {
  if (!Number.isInteger(args.libraryId) || args.libraryId <= 0) {
    throw nativeFailure("Attachment library ID is invalid", "failed");
  }
  let attachment: Zotero.Item | null = null;
  let importDispatched = false;
  let preparedCleanupAttempted = false;
  const cleanupPrepared = async () => {
    if (preparedCleanupAttempted) {
      return;
    }
    preparedCleanupAttempted = true;
    await args.prepared.cleanup();
  };
  try {
    attachment = await args.admit(async () => {
      if (typeof Zotero.Attachments?.importFromFile !== "function") {
        throw new Error("Zotero.Attachments.importFromFile is unavailable");
      }
      const file = nativeFile(args.prepared.mainPath);
      importDispatched = true;
      const imported = await Zotero.Attachments.importFromFile({
        file,
        libraryID: args.libraryId,
        ...(args.parent ? { parentItemID: args.parent.id } : {}),
        ...(args.metadata?.title ? { title: args.metadata.title } : {}),
        ...(args.metadata?.contentType
          ? { contentType: args.metadata.contentType }
          : {}),
        ...(args.metadata?.charset ? { charset: args.metadata.charset } : {}),
      });
      attachment = imported;
      args.afterImport?.(imported);
      return imported;
    }, "effect");
    const storedPath = String(
      (await args.admit(() => attachment!.getFilePathAsync?.(), "read")) || "",
    ).trim();
    const storageRoot = getParentPath(storedPath);
    if (!storageRoot) {
      throw new Error("Stored attachment storage directory is unavailable");
    }
    for (const companion of args.prepared.companionPaths) {
      const targetPath = joinPath(storageRoot, companion.relativePath);
      await ensureRuntimeDirectory(getParentPath(targetPath));
      await copyRuntimeFile({ sourcePath: companion.path, targetPath });
    }
    await args.admit(async () => {
      if (args.metadata?.originalUrl) {
        attachment!.setField("url", args.metadata.originalUrl);
        await attachment!.saveTx();
        args.afterMetadataSave?.(attachment!);
      }
    }, "effect");
    await cleanupPrepared();
    return attachment;
  } catch (error) {
    const failureStatus: NativeAttachmentFailureStatus = attachment
      ? preparedCleanupAttempted
        ? "repair_required"
        : "failed"
      : importDispatched
        ? "unknown"
        : "failed";
    let primaryError = nativeFailure(error, failureStatus);
    if (attachment) {
      try {
        await eraseAttachment({ attachment, admit: args.admit });
      } catch (cleanupError) {
        primaryError = attachCleanupFailure(primaryError, cleanupError);
      }
    }
    if (!preparedCleanupAttempted) {
      try {
        await cleanupPrepared();
      } catch (cleanupError) {
        primaryError = attachCleanupFailure(primaryError, cleanupError);
      }
    }
    throw primaryError;
  }
}

async function replaceStoredAttachment(args: {
  operationId: string;
  prepared: ResolvedPreparedStoredAttachment;
  attachment: Zotero.Item;
  admit: ZoteroNativeAdmission;
}) {
  return serializeAttachmentReplacement(() =>
    replaceStoredAttachmentOnce(args),
  );
}

async function replaceStoredAttachmentOnce(args: {
  operationId: string;
  prepared: ResolvedPreparedStoredAttachment;
  attachment: Zotero.Item;
  admit: ZoteroNativeAdmission;
}) {
  const { linkMode, oldPath } = await args.admit(
    async () => ({
      linkMode: Number(
        (args.attachment as Zotero.Item & { attachmentLinkMode?: unknown })
          .attachmentLinkMode,
      ),
      oldPath: String(
        (await args.attachment.getFilePathAsync?.()) || "",
      ).trim(),
    }),
    "read",
  );
  if (linkMode !== 0 && linkMode !== 1) {
    let primaryError = nativeFailure(
      "Only stored attachments can replace managed files",
      "failed",
    );
    try {
      await args.prepared.cleanup();
    } catch (cleanupError) {
      primaryError = attachCleanupFailure(primaryError, cleanupError);
    }
    throw primaryError;
  }
  const storageRoot = getParentPath(oldPath);
  if (!storageRoot) {
    let primaryError = nativeFailure(
      "Managed attachment storage is unavailable",
      "failed",
    );
    try {
      await args.prepared.cleanup();
    } catch (cleanupError) {
      primaryError = attachCleanupFailure(primaryError, cleanupError);
    }
    throw primaryError;
  }
  const newDigest = await fileSetDigest(args.prepared.stagingDirectory);
  const oldDigest = await fileSetDigest(storageRoot);
  if (newDigest === oldDigest) {
    try {
      await args.prepared.cleanup();
    } catch (error) {
      throw nativeFailure(error, "repair_required");
    }
    return args.attachment;
  }

  const backupRoot = storageRoot + ".replace-backup-" + Date.now().toString(36);
  const storedAttachment = args.attachment as Zotero.Item & {
    attachmentFilename: string;
    attachmentContentType: string;
  };
  const oldFilename = String(storedAttachment.attachmentFilename || "");
  const oldContentType = String(storedAttachment.attachmentContentType || "");
  const newFilename = args.prepared.snapshot.main.relativePath;
  const newContentType = derivedMimeType(newFilename);
  const journalPath = await replacementJournalPath(args.operationId);
  const journal: StoredAttachmentReplacementJournal = {
    schema: ATTACHMENT_REPLACEMENT_JOURNAL_SCHEMA,
    operationId: args.operationId,
    libraryId: Number(args.attachment.libraryID),
    attachmentKey: String(args.attachment.key || ""),
    storageRoot,
    backupRoot,
    stagingRoot: args.prepared.stagingDirectory,
    oldFilename,
    oldContentType,
    newFilename,
    newContentType,
    oldDigest,
    newDigest,
    phase: "prepared",
  };
  try {
    await writeReplacementJournal(journalPath, journal);
  } catch (error) {
    try {
      await args.prepared.cleanup();
    } catch (cleanupError) {
      throw attachCleanupFailure(error, cleanupError);
    }
    throw nativeFailure(error, "failed");
  }
  let oldMoved = false;
  let newMoved = false;
  try {
    await args.admit(() => undefined, "effect");
    await moveRuntimePath({ sourcePath: storageRoot, targetPath: backupRoot });
    oldMoved = true;
    journal.phase = "old_backed_up";
    await writeReplacementJournal(journalPath, journal);
    await moveRuntimePath({
      sourcePath: args.prepared.stagingDirectory,
      targetPath: storageRoot,
    });
    newMoved = true;
    journal.phase = "new_promoted";
    await writeReplacementJournal(journalPath, journal);
  } catch (error) {
    let primaryError = nativeFailure(error, "failed");
    try {
      if (oldMoved && !newMoved) {
        await moveRuntimePath({
          sourcePath: backupRoot,
          targetPath: storageRoot,
        });
      }
      await args.prepared.cleanup();
      await removeRuntimePath(journalPath);
    } catch (cleanupError) {
      primaryError = attachCleanupFailure(
        primaryError,
        cleanupError,
        oldMoved ? "unknown" : "repair_required",
      );
    }
    throw primaryError;
  }

  try {
    await args.admit(async () => {
      storedAttachment.attachmentFilename = newFilename;
      storedAttachment.attachmentContentType = newContentType;
      await args.attachment.saveTx();
    }, "effect");
    journal.phase = "metadata_committed";
    await writeReplacementJournal(journalPath, journal);
  } catch (error) {
    let primaryError = nativeFailure(error, "failed");
    try {
      await moveRuntimePath({
        sourcePath: storageRoot,
        targetPath: args.prepared.stagingDirectory,
      });
      await moveRuntimePath({
        sourcePath: backupRoot,
        targetPath: storageRoot,
      });
      await args.admit(async () => {
        storedAttachment.attachmentFilename = oldFilename;
        storedAttachment.attachmentContentType = oldContentType;
        await args.attachment.saveTx();
      }, "effect");
      await args.prepared.cleanup();
      await removeRuntimePath(journalPath);
    } catch (cleanupError) {
      primaryError = attachCleanupFailure(
        primaryError,
        cleanupError,
        "unknown",
      );
    }
    throw primaryError;
  }
  args.prepared.complete();

  try {
    const removed = await removeRuntimePath(backupRoot);
    if (removed === false) {
      throw new Error("Managed attachment backup remains");
    }
    await removeRuntimePath(journalPath);
  } catch (error) {
    const primaryError = nativeFailure(
      "Managed attachment backup cleanup failed",
      "repair_required",
    );
    throw attachCleanupFailure(primaryError, error, "repair_required");
  }
  return args.attachment;
}

async function recoverStoredAttachmentReplacement(journalPath: string) {
  let journal: unknown;
  try {
    journal = JSON.parse(await readRuntimeTextFile(journalPath));
  } catch {
    throw new Error(
      "repair_required: attachment replacement journal is invalid",
    );
  }
  assertReplacementJournal(journal);
  if (journal.schema !== ATTACHMENT_REPLACEMENT_JOURNAL_SCHEMA) {
    throw new Error(
      "repair_required: attachment replacement journal is unsupported",
    );
  }
  const attachment = Zotero.Items.getByLibraryAndKey(
    journal.libraryId,
    journal.attachmentKey,
  ) as
    | (Zotero.Item & {
        attachmentFilename?: string;
        attachmentContentType?: string;
      })
    | undefined;
  if (!attachment) {
    throw new Error("repair_required: replacement attachment is unavailable");
  }
  const filename = String(attachment.attachmentFilename || "");
  const contentType = String(attachment.attachmentContentType || "");
  const metadataIsOld =
    filename === journal.oldFilename && contentType === journal.oldContentType;
  const metadataIsNew =
    filename === journal.newFilename && contentType === journal.newContentType;
  const storageExists = await runtimePathExists(journal.storageRoot);
  const backupExists = await runtimePathExists(journal.backupRoot);
  const stagingExists = await runtimePathExists(journal.stagingRoot);
  const storageDigest = storageExists
    ? await fileSetDigest(journal.storageRoot)
    : "";
  const backupDigest = backupExists
    ? await fileSetDigest(journal.backupRoot)
    : "";
  const stagingDigest = stagingExists
    ? await fileSetDigest(journal.stagingRoot)
    : "";

  if (
    metadataIsNew &&
    (storageDigest === journal.newDigest ||
      (!storageExists && stagingDigest === journal.newDigest))
  ) {
    if (!storageExists) {
      await moveRuntimePath({
        sourcePath: journal.stagingRoot,
        targetPath: journal.storageRoot,
      });
    }
    if ((await fileSetDigest(journal.storageRoot)) !== journal.newDigest) {
      throw new Error(
        "repair_required: promoted attachment content is invalid",
      );
    }
    await removeRuntimePath(journal.backupRoot);
    await removeRuntimePath(journal.stagingRoot);
    await removeRuntimePath(journalPath);
    return;
  }

  if (metadataIsOld && !backupExists && storageDigest === journal.oldDigest) {
    await removeRuntimePath(journal.stagingRoot);
    await removeRuntimePath(journalPath);
    return;
  }

  if (
    metadataIsOld &&
    !metadataIsNew &&
    backupDigest === journal.oldDigest &&
    (!storageExists || storageDigest === journal.newDigest)
  ) {
    if (storageExists) {
      if (stagingExists) {
        throw new Error(
          "repair_required: attachment replacement staging is ambiguous",
        );
      }
      await moveRuntimePath({
        sourcePath: journal.storageRoot,
        targetPath: journal.stagingRoot,
      });
    }
    await moveRuntimePath({
      sourcePath: journal.backupRoot,
      targetPath: journal.storageRoot,
    });
    if ((await fileSetDigest(journal.storageRoot)) !== journal.oldDigest) {
      throw new Error(
        "repair_required: restored attachment content is invalid",
      );
    }
    await removeRuntimePath(journal.stagingRoot);
    await removeRuntimePath(journalPath);
    return;
  }

  throw new Error("repair_required: attachment replacement state is ambiguous");
}

export async function recoverStoredAttachmentReplacements() {
  return serializeAttachmentReplacement(async () => {
    const directory = replacementJournalDirectory();
    for (const journalPath of await listRuntimeChildren(directory)) {
      if (!journalPath.endsWith(".json")) continue;
      await recoverStoredAttachmentReplacement(journalPath);
    }
  });
}

export const nativeMutations = Object.freeze({
  attachments: Object.freeze({
    downloadStoredUrlToManagedStaging,
    createLinkedUrlAttachment,
    importStoredAttachment,
    replaceStoredAttachment,
    matchesStoredContentManifest,
    eraseAttachment,
  }),
  attachmentFailureStatus: nativeAttachmentFailureStatus,
});

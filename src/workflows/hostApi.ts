import { handlers } from "../handlers";
import {
  openWorkflowEditorSession,
  registerWorkflowEditorRenderer,
  unregisterWorkflowEditorRenderer,
} from "../modules/workflowEditorHost";
import { appendRuntimeLog } from "../modules/runtimeLogManager";
import {
  recordLeakProbeTempArtifactForTests,
  releaseLeakProbeTempArtifactForTests,
} from "../modules/testLeakProbeTempArtifacts";
import { recordTestPerformanceSpan } from "../modules/testPerformanceProbeBridge";
import {
  createZoteroHostCapabilityBroker,
  ZoteroHostCapabilityError,
  type ZoteroHostCollectionRefInput,
  type ZoteroHostItemRefInput,
  type ZoteroHostLibraryListArgs,
  type ZoteroHostLibrarySyncSnapshotRequest,
  type ZoteroHostMutationRequest,
} from "../modules/zoteroHostCapabilityBroker";
import { showWorkflowToast } from "../modules/workflowExecution/feedbackSeam";
import {
  copyRuntimeFile,
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
  readRuntimeBytes,
  readRuntimeTextFileStrict,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeBytes,
  writeRuntimeTextFileStrict,
} from "../modules/runtimePersistence";
import { createWorkflowSynthesisHostApi } from "../modules/synthesisClient/workflowHostClient";
import { getDefaultSynthesisClient } from "../modules/synthesisClient/defaultClient";
import {
  resolveRuntimeAddon,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import { joinPath } from "../utils/path";
import { normalizeNativeLocalPath } from "../platform/path";
import { openRuntimeFilePicker } from "../platform/filePicker";
import type {
  WorkflowHostApi,
  WorkflowHostCollectionRefInput,
  WorkflowHostItemRefInput,
  WorkflowHostMutationRequest,
  WorkflowPreparedNoteImage,
} from "./types";
import { createWorkflowArchiveApi } from "./archive";
import { materializeWorkflowInputFile } from "./workflowInputMaterialization";
import { prepareWorkflowNoteImage } from "./workflowNoteImagePreparation";
import { createWorkflowStoredAttachmentImport } from "./workflowStoredAttachmentImport";
import { exportZoteroItemsAsText } from "../modules/zoteroItemTextExporter";
import { createResearchBundleMaterializer } from "../modules/researchBundleService";
import { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";
import type {
  ZoteroLibrarySnapshotBatchDto,
  ZoteroLibrarySnapshotWorkflowResultDto,
} from "../../packages/synthesis-contracts/src/index";

export { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";

function workflowSnapshotOwnerId() {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  return `workflow-snapshot-${
    crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }`;
}

function workflowMutationOperationId(member: string) {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  const suffix =
    crypto?.randomUUID?.() ||
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  return member + ":" + suffix;
}

function requireConfirmedMutationResult<
  TResult extends Record<string, unknown>,
>(
  result: import("./types").MutationExecutionResult<TResult>,
): TResult {
  if ("result" in result) {
    return result.result;
  }
  const error = new Error(
    result.attempt.error.message ||
      `Workflow Host mutation ${result.outcome}: ${result.attempt.error.code}`,
  );
  Object.assign(error, { attempt: result.attempt });
  throw error;
}

export async function withWorkflowLibraryItemSnapshot(
  request: ZoteroHostLibrarySyncSnapshotRequest,
  control: Readonly<{ signal?: AbortSignal }>,
  onBatch: (batch: ZoteroLibrarySnapshotBatchDto) => void | Promise<void>,
): Promise<ZoteroLibrarySnapshotWorkflowResultDto> {
  if (control.signal?.aborted) {
    throw new ZoteroHostCapabilityError(
      "canceled",
      "snapshot was canceled before capture",
      { reason: "caller_signal" },
    );
  }
  const broker = createZoteroHostCapabilityBroker();
  const scope = { ownerId: workflowSnapshotOwnerId() };
  let page = await broker.library.syncSnapshot(request, scope);
  for (;;) {
    try {
      await onBatch({
        schema: page.schema,
        snapshotId: page.snapshotId,
        batchIndex: page.batchIndex,
        items: page.items,
      });
    } catch (error) {
      if (page.outcome === "active") {
        broker.library.cancelSnapshot(page.snapshotId, scope);
      }
      throw error;
    }
    if (control.signal?.aborted) {
      if (page.outcome === "active") {
        return broker.library.cancelSnapshot(page.snapshotId, scope);
      }
      return {
        outcome: "canceled",
        snapshotId: page.snapshotId,
        deliveredItems: page.deliveredItems,
        deliveredBatches: page.deliveredBatches,
      };
    }
    if (page.outcome === "completed") {
      return {
        outcome: "completed",
        completionEvidence: page.completionEvidence,
      };
    }
    page = await broker.library.syncSnapshot(
      {
        libraryId: page.libraryId,
        batchSize: page.batchSize,
        snapshotId: page.snapshotId,
        cursor: page.nextCursor,
      },
      scope,
    );
  }
}

function resolveHostAddonConfig() {
  const addonConfig = resolveRuntimeAddon()?.data?.config || null;
  return {
    addonName: String(addonConfig?.addonName || "Zotero Agents").trim(),
    addonRef: String(addonConfig?.addonRef || "").trim(),
    prefsPrefix: String(
      addonConfig?.prefsPrefix || "extensions.zotero.zotero-skills",
    ).trim(),
  };
}

function resolveHostZotero() {
  const runtimeZotero =
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!runtimeZotero) {
    throw new Error("Zotero runtime is unavailable in workflow host api");
  }
  return runtimeZotero;
}

function resolveHostItem(ref: Zotero.Item | number | string) {
  const zotero = resolveHostZotero();
  if (ref && typeof ref === "object") {
    return ref;
  }
  if (typeof ref === "number") {
    return zotero.Items.get(ref) || null;
  }
  const key = String(ref || "").trim();
  if (!key) {
    return null;
  }
  return (
    zotero.Items.getByLibraryAndKey(zotero.Libraries.userLibraryID, key) || null
  );
}

function assertHostItem(ref: Zotero.Item | number | string) {
  const item = resolveHostItem(ref);
  if (!item) {
    throw new Error(`Item not found: ${String(ref)}`);
  }
  return item;
}

async function readText(path: string) {
  return readRuntimeTextFileStrict(requireHostFilePath(path));
}

async function writeText(path: string, content: string) {
  await writeRuntimeTextFileStrict(
    requireHostFilePath(path),
    String(content || ""),
  );
}

async function readBytes(path: string) {
  return readRuntimeBytes(requireHostFilePath(path));
}

async function writeBytes(path: string, bytes: Uint8Array | ArrayBuffer) {
  await writeRuntimeBytes(requireHostFilePath(path), bytes, {
    overwrite: true,
  });
}

async function copyFile(sourcePath: string, targetPath: string) {
  await copyRuntimeFile({
    sourcePath: requireHostFilePath(sourcePath),
    targetPath: requireHostFilePath(targetPath),
  });
}

async function pathExists(path: string) {
  const nativePath = normalizeNativeLocalPath(path);
  return nativePath ? runtimePathExists(nativePath) : false;
}

async function makeDirectory(path: string) {
  await ensureRuntimeDirectoryStrict(requireHostFilePath(path));
}

function requireHostFilePath(path: string) {
  const nativePath = normalizeNativeLocalPath(path);
  if (!nativePath) {
    throw new TypeError("Host file path is invalid");
  }
  return nativePath;
}

function toUint8Array(bytes: Uint8Array | ArrayBuffer) {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function getBlobCtor() {
  const BlobCtor = (globalThis as typeof globalThis & { Blob?: typeof Blob })
    .Blob;
  if (typeof BlobCtor !== "function") {
    throw new Error("Blob is unavailable in workflow host api");
  }
  return BlobCtor;
}

function blobFromPreparedImage(image: WorkflowPreparedNoteImage) {
  const mimeType =
    String(image?.mimeType || "image/jpeg").trim() || "image/jpeg";
  if (image?.blob) {
    return image.blob.type
      ? image.blob
      : image.blob.slice(0, image.blob.size, mimeType);
  }
  if (image?.bytes) {
    return new (getBlobCtor())([toUint8Array(image.bytes)], { type: mimeType });
  }
  throw new Error("Prepared image must provide blob or bytes");
}

async function importEmbeddedImage(
  noteRef: Zotero.Item | number | string,
  image: WorkflowPreparedNoteImage,
) {
  const note = assertHostItem(noteRef);
  const blob = blobFromPreparedImage(image);
  const zotero = resolveHostZotero();
  if (typeof zotero.Attachments?.importEmbeddedImage !== "function") {
    throw new Error("Zotero embedded image import is unavailable");
  }
  const attachment = await zotero.Attachments.importEmbeddedImage({
    blob,
    parentItemID: note.id,
  });
  return {
    attachmentKey: String(attachment?.key || "").trim(),
    attachmentItem: attachment,
    mimeType: blob.type || image.mimeType,
    bytes: blob.size,
  };
}

function toBrokerItemRef(
  ref: WorkflowHostItemRefInput,
): ZoteroHostItemRefInput {
  const resolved =
    typeof ref === "number" || typeof ref === "string"
      ? resolveHostItem(ref)
      : ref;
  const candidate = (resolved || {}) as {
    key?: unknown;
    libraryId?: unknown;
    libraryID?: unknown;
  };
  const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
  const libraryId = Number(candidate.libraryId ?? candidate.libraryID);
  if (key && Number.isSafeInteger(libraryId) && libraryId > 0) {
    return { key, libraryId };
  }
  throw new Error("Workflow item ref cannot be normalized to a portable ref");
}

function toBrokerCollectionRef(
  ref: WorkflowHostCollectionRefInput,
): ZoteroHostCollectionRefInput {
  let resolved: unknown = ref;
  if (typeof ref === "number" || typeof ref === "string") {
    const scopedKey = String(ref).trim().match(/^(\d+):([A-Z0-9]{8})$/);
    if (scopedKey) {
      return { libraryId: Number(scopedKey[1]), key: scopedKey[2] };
    }
    const zotero = resolveHostZotero();
    const numericId = Number(ref);
    resolved =
      (Number.isSafeInteger(numericId) && numericId > 0
        ? zotero.Collections?.get?.(numericId)
        : null) ||
      zotero.Collections?.getByLibraryAndKey?.(
        zotero.Libraries.userLibraryID,
        String(ref).trim(),
      );
  }
  const candidate = (resolved || {}) as {
    key?: unknown;
    libraryId?: unknown;
    libraryID?: unknown;
  };
  const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
  const libraryId = Number(candidate.libraryId ?? candidate.libraryID);
  if (key && Number.isSafeInteger(libraryId) && libraryId > 0) {
    return { key, libraryId };
  }
  throw new Error(
    "Workflow collection ref cannot be normalized to a portable ref",
  );
}

function toBrokerLibraryListArgs(
  args: ZoteroHostLibraryListArgs,
): ZoteroHostLibraryListArgs {
  return args.collection === undefined
    ? args
    : { ...args, collection: toBrokerCollectionRef(args.collection) };
}

function toBrokerMutationRequest(
  request: WorkflowHostMutationRequest,
): ZoteroHostMutationRequest {
  const {
    target,
    targets,
    item,
    items,
    parent,
    note,
    collection,
    ...portableRequest
  } = request;
  return {
    ...portableRequest,
    ...(target !== undefined
      ? { target: toBrokerItemRef(target) }
      : {}),
    ...(targets !== undefined
      ? { targets: targets.map(toBrokerItemRef) }
      : {}),
    ...(item !== undefined
      ? { item: toBrokerItemRef(item) }
      : {}),
    ...(items !== undefined
      ? { items: items.map(toBrokerItemRef) }
      : {}),
    ...(parent !== undefined
      ? { parent: toBrokerItemRef(parent) }
      : {}),
    ...(note !== undefined
      ? { note: toBrokerItemRef(note) }
      : {}),
    ...(collection !== undefined
      ? { collection: toBrokerCollectionRef(collection) }
      : {}),
  };
}

let cachedHostApi: WorkflowHostApi | null = null;

export function createWorkflowHostApi(): WorkflowHostApi {
  if (cachedHostApi) {
    return cachedHostApi;
  }
  const importStoredFile = createWorkflowStoredAttachmentImport({
    getStagingRoot: () =>
      joinPath(
        getRuntimePersistencePaths().tmpDir,
        "workflow-attachment-import",
      ),
    ensureDirectory: makeDirectory,
    copyFile,
    removePath: removeRuntimePath,
    importStoredFromPath: (args) =>
      handlers.attachment.importStoredFromPath(args),
    removeAttachment: (attachment) =>
      handlers.attachment.remove(attachment),
  });
  const zoteroBroker = createZoteroHostCapabilityBroker({
    async createStoredFile(request, parent) {
      if (request.source.kind !== "stored_file") {
        throw new Error("stored attachment source is required");
      }
      if (request.source.main.source.kind !== "local_path") {
        throw new Error("resource attachment source is not materialized");
      }
      const companions = (request.source.companions || []).map((entry) => {
        if (entry.source.kind !== "local_path") {
          throw new Error("resource companion source is not materialized");
        }
        return {
          sourcePath: entry.source.path,
          relativePath: entry.targetRelativePath,
        };
      });
      return importStoredFile({
        parent,
        path: request.source.main.source.path,
        title: request.metadata?.title,
        mimeType: request.metadata?.contentType,
        charset: request.metadata?.charset,
        url: request.metadata?.originalUrl,
        companionFiles: companions,
      });
    },
  });
  const materializeWorkflowResearchBundlePapers =
    createResearchBundleMaterializer({
      async resolvePaper({ paperRef, libraryId, itemKey }) {
        const item = resolveHostZotero().Items.getByLibraryAndKey(
          libraryId,
          itemKey,
        );
        if (!item) return null;
        const attachments = await zoteroBroker.library.getItemAttachments({
          key: itemKey,
          libraryId,
        });
        return {
          paperRef,
          libraryId,
          itemKey,
          title: String(item.getField?.("title") || "").trim(),
          metadata: handlers.item.exportPortableJson(item),
          attachments: attachments
            .filter((attachment) => String(attachment.path || "").trim())
            .map((attachment) => ({
              path: attachment.path,
              filename: attachment.filename,
              contentType: attachment.contentType,
            })),
        };
      },
      async readArtifacts({ paperRefs, artifactTypes }) {
        const client = await getDefaultSynthesisClient();
        return client.artifacts.readPaperArtifacts({
          paper_refs: paperRefs,
          artifact_types: artifactTypes,
        });
      },
    });
  const context = {
    getCurrentView: zoteroBroker.context.getCurrentView,
    getSelectedItems: zoteroBroker.context.getSelectedItems,
  } satisfies WorkflowHostApi["context"];
  const library = {
    listItems: (args: ZoteroHostLibraryListArgs) =>
      zoteroBroker.library.listItems(toBrokerLibraryListArgs(args)),
    syncSnapshot: (args: ZoteroHostLibrarySyncSnapshotRequest) =>
      zoteroBroker.library.syncSnapshot(args, {
        ownerId: "workflow-host-v11",
      }),
    searchItems: zoteroBroker.library.searchItems,
    getItemDetail: (ref: WorkflowHostItemRefInput) =>
      zoteroBroker.library.getItemDetail(toBrokerItemRef(ref)),
    getItemNotes: (
      ref: WorkflowHostItemRefInput,
      args?: Parameters<WorkflowHostApi["library"]["getItemNotes"]>[1],
    ) => zoteroBroker.library.getItemNotes(toBrokerItemRef(ref), args),
    getNoteDetail: (
      ref: WorkflowHostItemRefInput,
      args?: Parameters<WorkflowHostApi["library"]["getNoteDetail"]>[1],
    ) => zoteroBroker.library.getNoteDetail(toBrokerItemRef(ref), args),
    listNotePayloads: (ref: WorkflowHostItemRefInput) =>
      zoteroBroker.library.listNotePayloads(toBrokerItemRef(ref)),
    getNotePayload: (
      ref: WorkflowHostItemRefInput,
      args?: Parameters<WorkflowHostApi["library"]["getNotePayload"]>[1],
    ) => zoteroBroker.library.getNotePayload(toBrokerItemRef(ref), args),
    getItemAttachments: (ref: WorkflowHostItemRefInput) =>
      zoteroBroker.library.getItemAttachments(toBrokerItemRef(ref)),
  } satisfies WorkflowHostApi["library"];
  const mutations = {
    preview: (request: WorkflowHostMutationRequest) =>
      zoteroBroker.legacyMutations.preview(toBrokerMutationRequest(request)),
    execute: (request: WorkflowHostMutationRequest) =>
      zoteroBroker.legacyMutations.execute(toBrokerMutationRequest(request)),
  } satisfies WorkflowHostApi["mutations"];
  const metadata = {
    translateIdentifier: zoteroBroker.metadata.translateIdentifier,
  } satisfies WorkflowHostApi["metadata"];
  const resolveBrokerResultItem = (ref: ZoteroHostItemRefInput) => {
    const item = resolveHostZotero().Items.getByLibraryAndKey(
      Number(ref.libraryId),
      ref.key,
    );
    if (!item) throw new Error(`Mutation result item not found: ${ref.key}`);
    return item;
  };
  const notes = {
    async create(note: { content: string }) {
      const result = requireConfirmedMutationResult(
        await zoteroBroker.notes.create(
          {
            operationId: workflowMutationOperationId("notes.create"),
            content: note.content,
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
      return resolveBrokerResultItem(
        (result.note as { ref: ZoteroHostItemRefInput }).ref,
      );
    },
    async update(
      noteRef: WorkflowHostItemRefInput,
      patch: { content: string },
    ) {
      const result = requireConfirmedMutationResult(
        await zoteroBroker.notes.updateContent(
          {
            operationId: workflowMutationOperationId("notes.updateContent"),
            noteRef: toBrokerItemRef(noteRef),
            content: patch.content,
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
      return resolveBrokerResultItem(
        (result.note as { ref: ZoteroHostItemRefInput }).ref,
      );
    },
    async remove(noteRef: WorkflowHostItemRefInput) {
      requireConfirmedMutationResult(
        await zoteroBroker.notes.remove(
          {
            operationId: workflowMutationOperationId("notes.remove"),
            noteRef: toBrokerItemRef(noteRef),
            disposition: "permanent",
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
    },
    importEmbeddedImage,
  } satisfies WorkflowHostApi["notes"];
  const attachmentPlacement = (parent?: WorkflowHostItemRefInput | null) =>
    parent
      ? ({ kind: "child", parentRef: toBrokerItemRef(parent) } as const)
      : ({ kind: "top_level" } as const);
  const attachmentFromResult = (result: Record<string, unknown>) =>
    resolveBrokerResultItem(
      (result.attachment as { ref: ZoteroHostItemRefInput }).ref,
    );
  const legacyFilePath = (spec: { file?: any; filePath?: string }) => {
    const path = String(spec.filePath || spec.file?.path || "").trim();
    if (!path) throw new Error("Attachment file path is required");
    return path;
  };
  const attachments = {
    async create(spec: { file?: any; filePath?: string }) {
      const result = requireConfirmedMutationResult(
        await zoteroBroker.attachments.create(
          {
            operationId: workflowMutationOperationId("attachments.create"),
            placement: { kind: "top_level" },
            source: { kind: "linked_file", path: legacyFilePath(spec) },
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
      return attachmentFromResult(result);
    },
    async createFromPath(options: {
      parent?: WorkflowHostItemRefInput | null;
      path?: string | null;
      dataPath?: string | null;
      title?: string | null;
      mimeType?: string | null;
    }) {
      const path = String(options.path || options.dataPath || "").trim();
      const result = requireConfirmedMutationResult(
        await zoteroBroker.attachments.create(
          {
            operationId: workflowMutationOperationId("attachments.create"),
            placement: attachmentPlacement(options.parent),
            source: { kind: "linked_file", path },
            metadata: {
              ...(options.title ? { title: options.title } : {}),
              ...(options.mimeType ? { contentType: options.mimeType } : {}),
            },
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
      return attachmentFromResult(result);
    },
    async importStoredFromPath(options: {
      parent?: WorkflowHostItemRefInput | null;
      path?: string | null;
      title?: string | null;
      mimeType?: string | null;
      charset?: string | null;
      url?: string | null;
    }) {
      const result = requireConfirmedMutationResult(
        await zoteroBroker.attachments.create(
          {
            operationId: workflowMutationOperationId("attachments.create"),
            placement: attachmentPlacement(options.parent),
            source: {
              kind: "stored_file",
              main: {
                source: {
                  kind: "local_path",
                  path: String(options.path || "").trim(),
                },
              },
            },
            metadata: {
              ...(options.title ? { title: options.title } : {}),
              ...(options.mimeType ? { contentType: options.mimeType } : {}),
              ...(options.charset ? { charset: options.charset } : {}),
              ...(options.url ? { originalUrl: options.url } : {}),
            },
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
      return attachmentFromResult(result);
    },
    async createFromUrl(options: {
      parent?: WorkflowHostItemRefInput | null;
      url: string;
      title?: string | null;
      mimeType?: string | null;
    }) {
      const result = requireConfirmedMutationResult(
        await zoteroBroker.attachments.create(
          {
            operationId: workflowMutationOperationId("attachments.create"),
            placement: attachmentPlacement(options.parent),
            source: { kind: "linked_url", url: options.url },
            metadata: {
              ...(options.title ? { title: options.title } : {}),
              ...(options.mimeType ? { contentType: options.mimeType } : {}),
            },
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
      return attachmentFromResult(result);
    },
    async update(
      attachmentRef: WorkflowHostItemRefInput,
      patch: Record<string, string | number | boolean | null>,
    ) {
      const allowed = new Set(["title", "url", "contentType", "charset"]);
      const unsupported = Object.keys(patch).find((field) => !allowed.has(field));
      if (unsupported) {
        throw new Error(`Unsupported attachment metadata field: ${unsupported}`);
      }
      const result = requireConfirmedMutationResult(
        await zoteroBroker.attachments.updateMetadata(
          {
            operationId: workflowMutationOperationId(
              "attachments.updateMetadata",
            ),
            attachmentRef: toBrokerItemRef(attachmentRef),
            patch: patch as {
              title?: string | null;
              url?: string | null;
              contentType?: string | null;
              charset?: string | null;
            },
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
      return attachmentFromResult(result);
    },
    async remove(attachmentRef: WorkflowHostItemRefInput) {
      requireConfirmedMutationResult(
        await zoteroBroker.attachments.remove(
          {
            operationId: workflowMutationOperationId("attachments.remove"),
            attachmentRef: toBrokerItemRef(attachmentRef),
            disposition: "permanent",
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
    },
    async importStoredFile(args: {
      parent?: WorkflowHostItemRefInput | null;
      path: string;
      title?: string | null;
      mimeType?: string | null;
      charset?: string | null;
      url?: string | null;
      companionFiles?: Array<{ sourcePath: string; relativePath: string }>;
    }) {
      const result = requireConfirmedMutationResult(
        await zoteroBroker.attachments.create(
          {
            operationId: workflowMutationOperationId("attachments.create"),
            placement: attachmentPlacement(args.parent),
            source: {
              kind: "stored_file",
              main: { source: { kind: "local_path", path: args.path } },
              companions: (args.companionFiles || []).map((entry) => ({
                source: { kind: "local_path", path: entry.sourcePath },
                targetRelativePath: entry.relativePath,
              })),
            },
            metadata: {
              ...(args.title ? { title: args.title } : {}),
              ...(args.mimeType ? { contentType: args.mimeType } : {}),
              ...(args.charset ? { charset: args.charset } : {}),
              ...(args.url ? { originalUrl: args.url } : {}),
            },
          },
          { ownerId: "workflow-host-v11" },
        ),
      );
      return attachmentFromResult(result);
    },
  } satisfies WorkflowHostApi["attachments"];
  cachedHostApi = {
    version: WORKFLOW_HOST_API_VERSION,
    addon: {
      getConfig: resolveHostAddonConfig,
    },
    items: {
      get(ref) {
        return resolveHostItem(ref);
      },
      resolve(ref) {
        const item = resolveHostItem(ref);
        if (!item) {
          throw new Error(`Item not found: ${String(ref)}`);
        }
        return item;
      },
      getByLibraryAndKey(libraryID, key) {
        return (
          resolveHostZotero().Items.getByLibraryAndKey(
            libraryID,
            String(key || "").trim(),
          ) || null
        );
      },
      async getAll() {
        const zotero = resolveHostZotero();
        if (typeof (zotero.Items as any).getAll !== "function") {
          throw new Error("Zotero.Items.getAll(libraryId) is not available");
        }
        const libraryId = Number(zotero.Libraries?.userLibraryID) || 1;
        const loaded = await (zotero.Items as any).getAll(libraryId);
        if (!Array.isArray(loaded)) {
          throw new Error(
            "Zotero.Items.getAll(libraryId) did not return an array",
          );
        }
        return loaded;
      },
      exportPortableJson(ref) {
        return handlers.item.exportPortableJson(ref);
      },
      exportText(args) {
        return exportZoteroItemsAsText(resolveHostZotero() as any, args);
      },
      createFromJson(args) {
        return handlers.item.createFromJson(args);
      },
      remove(ref) {
        return handlers.item.remove(ref);
      },
    },
    context,
    library,
    mutations,
    metadata,
    researchBundles: {
      async materializePapers(args) {
        const materialized = await materializeWorkflowResearchBundlePapers({
          papers: args.papers,
          sourcePaperRefs: args.sourcePaperRefs,
        });
        return {
          ...materialized,
          warnings: materialized.warnings.map((warning) =>
            warning.code === "source_missing"
              ? { ...warning, code: "core_source_missing" }
              : warning,
          ),
        };
      },
    },
    prefs: {
      get(key, global = true) {
        return resolveHostZotero().Prefs.get(
          String(key || "").trim(),
          Boolean(global),
        );
      },
      set(key, value, global = true) {
        resolveHostZotero().Prefs.set(
          String(key || "").trim(),
          value as any,
          Boolean(global),
        );
      },
      clear(key, global = true) {
        resolveHostZotero().Prefs.clear(
          String(key || "").trim(),
          Boolean(global),
        );
      },
    },
    parents: {
      async addNote(parentRef, note) {
        const result = requireConfirmedMutationResult(
          await zoteroBroker.notes.create(
            {
              operationId: workflowMutationOperationId("notes.create"),
              parentRef: toBrokerItemRef(parentRef),
              content: note.content,
            },
            { ownerId: "workflow-host-v11" },
          ),
        );
        return resolveBrokerResultItem(
          (result.note as { ref: ZoteroHostItemRefInput }).ref,
        );
      },
      addAttachment: (parentRef, spec) =>
        attachments.createFromPath({
          parent: parentRef,
          path: legacyFilePath(spec),
        }),
      addRelated: handlers.parent.addRelated,
      removeRelated: handlers.parent.removeRelated,
      updateFields: handlers.parent.updateFields,
      updateMetadata: handlers.parent.updateMetadata,
    },
    notes,
    images: {
      prepareForNoteEmbedding: prepareWorkflowNoteImage,
    },
    attachments,
    tags: {
      add: handlers.tag.add,
      list: handlers.tag.list,
      remove: handlers.tag.remove,
      replace: handlers.tag.replace,
    },
    statusTags: {
      getPolicy: zoteroBroker.statusTags.getPolicy,
      transition: (request, control) => {
        const legacyRequest = request as typeof request & {
          item?: WorkflowHostItemRefInput;
        };
        return zoteroBroker.statusTags.transition(
          {
            ...request,
            operationId:
              request.operationId ||
              workflowMutationOperationId("statusTags.transition"),
            itemRef: toBrokerItemRef(
              legacyRequest.itemRef ?? legacyRequest.item!,
            ),
          },
          { ownerId: "workflow-host-v11" },
          control,
        );
      },
    },
    collections: {
      update: handlers.collection.update,
      create: handlers.collection.create,
      delete: handlers.collection.delete,
      add: handlers.collection.add,
      remove: handlers.collection.remove,
      replace: handlers.collection.replace,
    },
    command: {
      run: handlers.command.run,
    },
    editor: {
      openSession: openWorkflowEditorSession,
      registerRenderer: registerWorkflowEditorRenderer,
      unregisterRenderer: unregisterWorkflowEditorRenderer,
    },
    notifications: {
      toast(args) {
        showWorkflowToast({
          text: String(args?.text || "").trim(),
          type: args?.type || "default",
          source: "host-api",
          owner: "workflow",
          scope: "workflow-host-api",
        });
      },
    },
    logging: {
      appendRuntimeLog,
      recordPerformanceSpanForTests: recordTestPerformanceSpan,
      recordLeakProbeTempArtifactForTests,
      releaseLeakProbeTempArtifactForTests,
    },
    file: {
      pathToFile(path: string) {
        return resolveHostZotero().File.pathToFile(requireHostFilePath(path));
      },
      readText,
      writeText,
      readBytes,
      writeBytes,
      copy: copyFile,
      exists: pathExists,
      makeDirectory,
      materializeWorkflowInputFile,
      getTempDirectoryPath() {
        const tempDir = resolveHostZotero().getTempDirectory?.();
        return String(tempDir?.path || "").trim();
      },
      async pickDirectory(args) {
        return openRuntimeFilePicker({
          title: args?.title,
          mode: "folder",
          directory: args?.directory,
        }) as Promise<string | null>;
      },
      async pickFile(args) {
        return openRuntimeFilePicker({
          title: args?.title,
          mode: "open",
          filters: args?.filters,
          directory: args?.directory,
        }) as Promise<string | null>;
      },
      async pickSaveFile(args) {
        return openRuntimeFilePicker({
          title: args?.title,
          mode: "save",
          filters: args?.filters,
          directory: args?.directory,
          suggestion: args?.suggestedName,
        }) as Promise<string | null>;
      },
      async pickFiles(args) {
        return openRuntimeFilePicker({
          title: args?.title,
          mode: "multiple",
          filters: args?.filters,
          directory: args?.directory,
        }) as Promise<string[] | null>;
      },
    },
    archive: createWorkflowArchiveApi(),
    synthesis: createWorkflowSynthesisHostApi(),
  };
  return cachedHostApi;
}

export function resetWorkflowHostApiForTests() {
  cachedHostApi = null;
}

import {
  config as packageConfig,
  version as packageVersion,
} from "../../package.json";
import { createWorkflowEditorOwner } from "../modules/workflowEditorHost";
import {
  createWorkflowLoggingOwner,
  type WorkflowRuntimeLogBinding,
} from "../modules/runtimeLogManager";
import {
  createZoteroHostCapabilityBroker,
  ZoteroHostCapabilityError,
  type ZoteroHostLibrarySyncSnapshotRequest,
} from "../modules/zoteroHostCapabilityBroker";
import { createWorkflowNotificationOwner } from "../modules/workflowExecution/feedbackSeam";
import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  moveRuntimePath,
  readRuntimeBytes,
  removeRuntimePath,
  scanRuntimeTree,
  statRuntimePathStrict,
} from "../modules/runtimePersistence";
import { createWorkflowSynthesisHostApi } from "../modules/synthesisClient/workflowHostClient";
import { handlers } from "../handlers";
import {
  resolveRuntimeAddon,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import {
  canonicalizeLocale,
  resolveRuntimeLocale,
} from "../utils/localizationGovernance";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import { joinPath } from "../utils/path";
import {
  getBaseName,
  getParentPath,
  normalizeNativeLocalPath,
} from "../platform/path";
import type {
  WorkflowHostApiV12,
  WorkflowHostLiveReadAdapters,
  WorkflowResearchBundleApi,
  WorkflowCallControl,
  ImportPapersRequestDto,
  ImportPapersResultDto,
  MaterializePapersRequestDto,
  MaterializedNoteDto,
  PortableItemRef,
  ResourceRef,
  WorkflowAddonOwner,
  WorkflowEnvironmentOwner,
  WorkflowResourceFile,
  WorkflowResourceApi,
} from "./types";
import { createWorkflowArchiveApi } from "./archive";
import { createWorkflowFileApi } from "./file";
import {
  createWorkflowPreparedImageScope,
  type WorkflowPreparedImageScope,
} from "./workflowNoteImagePreparation";
import { createWorkflowBibliographyOwner } from "./bibliography";
import { createWorkflowClipboardOwner } from "./clipboard";
import {
  createWorkflowStoredAttachmentImport,
  createWorkflowStoredAttachmentStager,
  WorkflowStoredAttachmentInputError,
} from "./workflowStoredAttachmentImport";
import {
  createResearchBundleImportEffects,
  createResearchBundleImporter,
  createCanonicalResearchBundleMaterializer,
} from "../modules/researchBundleService";
import { MutationAuthorityExecutionError } from "../modules/zoteroHostMutationAuthority";
import { sha256Hex } from "../utils/sha256";
import { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";
import {
  createWorkflowHostError,
  type WorkflowInteractionMember,
} from "./workflowHostErrorContract";

export { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";

export type WorkflowHostLeafScope = Readonly<{
  owners: Readonly<{
    addon: ReturnType<typeof createWorkflowAddonOwner>;
    environment: ReturnType<typeof createWorkflowEnvironmentOwner>;
    images: WorkflowPreparedImageScope["owner"];
    bibliography: ReturnType<typeof createWorkflowBibliographyOwner>;
    clipboard: ReturnType<typeof createWorkflowClipboardOwner>;
    editor: ReturnType<typeof createWorkflowEditorOwner>;
    notifications: ReturnType<typeof createWorkflowNotificationOwner>;
    logging: ReturnType<typeof createWorkflowLoggingOwner>;
  }>;
  preparedImages: Pick<WorkflowPreparedImageScope, "resolve">;
  dispose(): void;
}>;

export function createWorkflowHostCapabilityBroker(
  resources?: Pick<WorkflowResourceApi, "get">,
) {
  const validateStoredSource = async (path: string) => {
    let stat;
    try {
      stat = await statRuntimePathStrict(path);
    } catch {
      stat = null;
    }
    if (!stat?.exists || stat.isDir) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment source must be a regular file",
      );
    }
    return { sizeBytes: stat.size };
  };
  const importStoredFile = createWorkflowStoredAttachmentImport({
    getStagingRoot: () =>
      joinPath(
        getRuntimePersistencePaths().tmpDir,
        "workflow-attachment-import",
      ),
    ensureDirectory: ensureRuntimeDirectory,
    copyFile: (sourcePath, targetPath) =>
      copyRuntimeFile({ sourcePath, targetPath }).then(() => undefined),
    removePath: removeRuntimePath,
    validateSource: validateStoredSource,
    importStoredFromPath: (request) =>
      handlers.attachment.importStoredFromPath(request),
    removeAttachment: (attachment) => handlers.attachment.remove(attachment),
  });
  const resolveSourcePath = async (
    source:
      | { kind: "local_path"; path: string }
      | { kind: "resource"; resourceRef: object },
  ) => {
    if (source.kind === "local_path") return source.path;
    if (!resources)
      throw new Error("workflow resource resolver is unavailable");
    return (await resources.get(source.resourceRef as ResourceRef)).path;
  };
  const fileSetDigest = async (root: string) => {
    const manifest = await scanRuntimeTree(root);
    if (manifest.issues.length) {
      throw new Error("Managed attachment content could not be inspected");
    }
    const entries = [];
    for (const entry of manifest.entries) {
      if (entry.kind !== "file") continue;
      entries.push([
        entry.relativePath.replace(/\\/g, "/"),
        await sha256Hex(await readRuntimeBytes(entry.absolutePath)),
      ]);
    }
    return sha256Hex(new TextEncoder().encode(JSON.stringify(entries)));
  };
  const derivedMimeType = (filename: string) => {
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
  };
  const replaceFailure = (
    message: string,
    recovery:
      | "retry_same_operation"
      | "refresh_and_retry_new_operation"
      | "reconcile"
      | "manual_repair",
    outcome: "failed" | "unknown" | "repair_required" = "failed",
    ref?: PortableItemRef,
  ) =>
    new MutationAuthorityExecutionError(
      outcome,
      "execution_failed",
      outcome === "repair_required" ? "compensation" : "commit",
      recovery,
      {
        phase: outcome === "repair_required" ? "cleanup" : "commit",
        recovery,
        ...(ref ? { affectedCount: 1 } : {}),
        ...(outcome === "repair_required" && ref ? { residualCount: 1 } : {}),
      },
      message,
      ref ? [{ kind: "item", ref }] : [],
      outcome === "repair_required" && ref ? [{ kind: "item", ref }] : [],
    );
  return createZoteroHostCapabilityBroker({
    async createStoredFile(request, parent) {
      if (request.source.kind !== "stored_file") {
        throw new Error("stored attachment source is required");
      }
      return importStoredFile({
        parent,
        path: await resolveSourcePath(request.source.main.source),
        targetFilename: request.source.main.targetFilename,
        title: request.metadata?.title,
        mimeType: request.metadata?.contentType,
        charset: request.metadata?.charset,
        url: request.metadata?.originalUrl,
        companionFiles: await Promise.all(
          (request.source.companions || []).map(async (companion) => ({
            sourcePath: await resolveSourcePath(companion.source),
            relativePath: companion.targetRelativePath,
          })),
        ),
      });
    },
    async replaceFile(request, attachment) {
      const ref = {
        libraryId: Number(attachment.libraryID),
        key: String(attachment.key),
      };
      const linkMode = Number(
        (attachment as any).attachmentLinkMode ??
          (attachment as any).getAttachmentLinkMode?.(),
      );
      const storedTarget = linkMode === 0 || linkMode === 1;
      const linkedTarget = linkMode === 2;
      if (
        (!storedTarget && !linkedTarget) ||
        (storedTarget && request.source.kind !== "stored_file") ||
        (linkedTarget && request.source.kind !== "linked_file")
      ) {
        throw new MutationAuthorityExecutionError(
          "failed",
          "invalid_request",
          "validation",
          "refresh_and_retry_new_operation",
          {
            reason: "invalid_combination",
            operation: "attachments.replaceFile",
          },
          "attachment source does not match its link mode",
          [{ kind: "item", ref }],
        );
      }

      const oldPath = String(
        (await attachment.getFilePathAsync?.()) || "",
      ).trim();
      if (!oldPath) {
        throw replaceFailure(
          "attachment file path is unavailable",
          "refresh_and_retry_new_operation",
          "failed",
          ref,
        );
      }
      if (request.source.kind === "linked_file") {
        const path = normalizeNativeLocalPath(request.source.path);
        if (!path) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "invalid_request",
            "validation",
            "refresh_and_retry_new_operation",
            {
              reason: "invalid_value",
              field: "source.path",
              operation: "attachments.replaceFile",
            },
            "linked attachment path is invalid",
            [{ kind: "item", ref }],
          );
        }
        let stat;
        try {
          stat = await statRuntimePathStrict(path);
        } catch {
          stat = null;
        }
        if (!stat?.exists || stat.isDir) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "invalid_request",
            "validation",
            "refresh_and_retry_new_operation",
            {
              reason: "invalid_value",
              field: "source.path",
              operation: "attachments.replaceFile",
            },
            "linked attachment path must be a readable regular file",
            [{ kind: "item", ref }],
          );
        }
        if (normalizeNativeLocalPath(oldPath) === path) return attachment;
        const oldFilename = String(
          (attachment as any).attachmentFilename || "",
        );
        const oldContentType = String(
          (attachment as any).attachmentContentType || "",
        );
        try {
          (attachment as any).setFilePath(path);
          (attachment as any).attachmentFilename = getBaseName(path);
          (attachment as any).attachmentContentType = derivedMimeType(path);
          await attachment.saveTx();
          return attachment;
        } catch {
          (attachment as any).setFilePath(oldPath);
          (attachment as any).attachmentFilename = oldFilename;
          (attachment as any).attachmentContentType = oldContentType;
          throw replaceFailure(
            "linked attachment relocation could not be confirmed",
            "reconcile",
            "unknown",
            ref,
          );
        }
      }

      const sourceMain = await resolveSourcePath(request.source.main.source);
      const storageRoot = getParentPath(oldPath);
      if (!storageRoot) {
        throw replaceFailure(
          "managed attachment storage is unavailable",
          "reconcile",
          "unknown",
          ref,
        );
      }
      const stager = createWorkflowStoredAttachmentStager({
        getStagingRoot: () => getParentPath(storageRoot),
        validateSource: validateStoredSource,
        ensureDirectory: ensureRuntimeDirectory,
        copyFile: (sourcePath, targetPath) =>
          copyRuntimeFile({ sourcePath, targetPath }).then(() => undefined),
        removePath: removeRuntimePath,
      });
      let staged;
      try {
        staged = await stager({
          path: sourceMain,
          targetFilename: request.source.main.targetFilename,
          companionFiles: await Promise.all(
            (request.source.companions || []).map(async (companion) => ({
              sourcePath: await resolveSourcePath(companion.source),
              relativePath: companion.targetRelativePath,
            })),
          ),
        });
      } catch (error) {
        if (error instanceof WorkflowStoredAttachmentInputError) {
          throw new MutationAuthorityExecutionError(
            "failed",
            error.resource ? "resource_limited" : "invalid_request",
            "validation",
            "refresh_and_retry_new_operation",
            error.resource || {
              reason: "invalid_value",
              field: "source",
              operation: "attachments.replaceFile",
            },
            error.message,
            [{ kind: "item", ref }],
          );
        }
        throw replaceFailure(
          error instanceof Error ? error.message : "attachment staging failed",
          "retry_same_operation",
          "failed",
          ref,
        );
      }
      if (
        (await fileSetDigest(staged.stagingDirectory)) ===
        (await fileSetDigest(storageRoot))
      ) {
        await staged.cleanup();
        return attachment;
      }
      const backupRoot = `${storageRoot}.replace-backup-${Date.now().toString(36)}`;
      let oldMoved = false;
      let newMoved = false;
      try {
        await moveRuntimePath({
          sourcePath: storageRoot,
          targetPath: backupRoot,
        });
        oldMoved = true;
        await moveRuntimePath({
          sourcePath: staged.stagingDirectory,
          targetPath: storageRoot,
        });
        newMoved = true;
      } catch (primary) {
        if (!oldMoved) {
          try {
            await staged.cleanup();
          } catch {
            // The original managed content is still authoritative.
          }
        }
        if (oldMoved && !newMoved) {
          try {
            await moveRuntimePath({
              sourcePath: backupRoot,
              targetPath: storageRoot,
            });
            await staged.cleanup();
          } catch {
            throw replaceFailure(
              "managed attachment switch could not be reconciled",
              "reconcile",
              "unknown",
              ref,
            );
          }
        }
        throw replaceFailure(
          primary instanceof Error
            ? primary.message
            : "attachment switch failed",
          "retry_same_operation",
          "failed",
          ref,
        );
      }

      const nextPath = joinPath(storageRoot, staged.mainFilename);
      const oldFilename = String((attachment as any).attachmentFilename || "");
      const oldContentType = String(
        (attachment as any).attachmentContentType || "",
      );
      try {
        (attachment as any).setFilePath(nextPath);
        (attachment as any).attachmentFilename = staged.mainFilename;
        (attachment as any).attachmentContentType = derivedMimeType(
          staged.mainFilename,
        );
        await attachment.saveTx();
      } catch {
        try {
          await moveRuntimePath({
            sourcePath: storageRoot,
            targetPath: staged.stagingDirectory,
          });
          await moveRuntimePath({
            sourcePath: backupRoot,
            targetPath: storageRoot,
          });
          await staged.cleanup();
          (attachment as any).setFilePath(oldPath);
          (attachment as any).attachmentFilename = oldFilename;
          (attachment as any).attachmentContentType = oldContentType;
        } catch {
          throw replaceFailure(
            "managed attachment commit could not be reconciled",
            "reconcile",
            "unknown",
            ref,
          );
        }
        throw replaceFailure(
          "managed attachment commit failed",
          "retry_same_operation",
          "failed",
          ref,
        );
      }
      try {
        const removed = await removeRuntimePath(backupRoot);
        if (removed === false)
          throw new Error("backup cleanup was not confirmed");
      } catch {
        throw replaceFailure(
          "old managed attachment content remains",
          "manual_repair",
          "repair_required",
          ref,
        );
      }
      return attachment;
    },
  });
}

export function createWorkflowHostLeafScope(args: {
  interactionMode: "interactive" | "non_interactive";
  runScopeId: string;
  logBinding: WorkflowRuntimeLogBinding;
  resources?: Pick<WorkflowResourceApi, "get">;
  imageAdapter?: Parameters<
    typeof createWorkflowPreparedImageScope
  >[0]["adapter"];
}): WorkflowHostLeafScope {
  const prepared = createWorkflowPreparedImageScope({
    runScopeId: args.runScopeId,
    adapter: args.imageAdapter,
    readResourceBlob: args.resources?.get
      ? async (ref) => {
          const resource = await args.resources!.get!(ref);
          return new Blob([await readRuntimeBytes(resource.path)], {
            type: resource.contentType,
          });
        }
      : undefined,
  });
  const callerScope = {};
  return {
    owners: {
      addon: createWorkflowAddonOwner(),
      environment: createWorkflowEnvironmentOwner(),
      images: prepared.owner,
      bibliography: createWorkflowBibliographyOwner(),
      clipboard: createWorkflowClipboardOwner({
        interactionMode: args.interactionMode,
      }),
      editor: createWorkflowEditorOwner({
        interactionMode: args.interactionMode,
        callerScope,
      }),
      notifications: createWorkflowNotificationOwner({
        interactionMode: args.interactionMode,
        callerScope,
      }),
      logging: createWorkflowLoggingOwner(args.logBinding),
    },
    preparedImages: { resolve: prepared.resolve },
    dispose: prepared.dispose,
  };
}

export async function withWorkflowHostLeafScope<T>(
  args: Parameters<typeof createWorkflowHostLeafScope>[0],
  work: (scope: WorkflowHostLeafScope) => Promise<T> | T,
) {
  const scope = createWorkflowHostLeafScope(args);
  try {
    return await work(scope);
  } finally {
    scope.dispose();
  }
}

export function createWorkflowHostLiveReadAdapters(args: {
  interactionMode: "interactive" | "non_interactive";
  broker?: ReturnType<typeof createZoteroHostCapabilityBroker>;
}): WorkflowHostLiveReadAdapters {
  const broker = args.broker || createZoteroHostCapabilityBroker();
  const interactionRequiredError = (member: WorkflowInteractionMember) =>
    new ZoteroHostCapabilityError(
      "interaction_required",
      `${member} requires an interactive Workflow Host`,
      { member },
    );
  const interactive = args.interactionMode === "interactive";
  return {
    context: {
      getCurrentView: () =>
        interactive
          ? broker.context.getCurrentView()
          : (() => {
              throw interactionRequiredError("context.getCurrentView");
            })(),
      getSelectedItems: (
        request?: Parameters<typeof broker.context.getSelectedItems>[0],
        control?: Parameters<typeof broker.context.getSelectedItems>[1],
      ) =>
        interactive
          ? broker.context.getSelectedItems(request, control)
          : Promise.reject(
              interactionRequiredError("context.getSelectedItems"),
            ),
    },
    navigation: {
      openItem: (
        ...parameters: Parameters<typeof broker.navigation.openItem>
      ) =>
        interactive
          ? broker.navigation.openItem(...parameters)
          : Promise.reject(interactionRequiredError("navigation.openItem")),
      openNote: (
        ...parameters: Parameters<typeof broker.navigation.openNote>
      ) =>
        interactive
          ? broker.navigation.openNote(...parameters)
          : Promise.reject(interactionRequiredError("navigation.openNote")),
      openCollection: (
        ...parameters: Parameters<typeof broker.navigation.openCollection>
      ) =>
        interactive
          ? broker.navigation.openCollection(...parameters)
          : Promise.reject(
              interactionRequiredError("navigation.openCollection"),
            ),
      openSelection: (
        ...parameters: Parameters<typeof broker.navigation.openSelection>
      ) =>
        interactive
          ? broker.navigation.openSelection(...parameters)
          : Promise.reject(
              interactionRequiredError("navigation.openSelection"),
            ),
    },
    library: {
      listItems: broker.library.listItems,
      traverseItems: broker.library.traverseItems,
      listCollections: broker.library.listCollections,
      listSavedSearches: broker.library.listSavedSearches,
      getItemDetail: broker.library.getItemDetail,
      getItemNotes: broker.library.getItemNotes,
      getNoteDetail: broker.library.getNoteDetail,
      listNotePayloads: broker.library.listNotePayloads,
      getNotePayload: broker.library.getNotePayload,
      getItemAttachments: broker.library.getItemAttachments,
      listAnnotations: broker.library.listAnnotations,
      exportPortableItems: broker.library.exportPortableItems,
    },
  };
}

import type {
  ZoteroLibrarySnapshotBatchDto,
  ZoteroLibrarySnapshotWorkflowResultDto,
} from "../../packages/synthesis-contracts/src/index";

function workflowSnapshotOwnerId() {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  return `workflow-snapshot-${
    crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }`;
}

function requireConfirmedMutationResult<
  TResult extends Record<string, unknown>,
>(result: import("./types").MutationExecutionResult<TResult>): TResult {
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

async function researchImportEffectOperationId(
  operationId: string,
  consistencyGroupId: string,
  member: string,
  identity: string,
) {
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify([operationId, consistencyGroupId, member, identity]),
    ),
  );
  if (!digest) {
    throw new Error("SHA-256 is unavailable for research import identity");
  }
  return `research-import:${digest}`;
}

function requireMutationItemRef(value: unknown): {
  ref: { libraryId: number; key: string };
  revision: string;
} {
  const candidate = value as {
    ref?: { libraryId?: unknown; key?: unknown };
    revision?: unknown;
  };
  const libraryId = Number(candidate?.ref?.libraryId);
  const key = String(candidate?.ref?.key || "").trim();
  const revision = String(candidate?.revision || "").trim();
  if (!Number.isInteger(libraryId) || libraryId <= 0 || !key || !revision) {
    throw new Error("Research import mutation returned an invalid item result");
  }
  return { ref: { libraryId, key }, revision };
}

function escapeResearchImportHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function createWorkflowResearchBundleImportApi(args: {
  ownerId: string;
  images: WorkflowHostApiV12["images"];
  preparedImages: WorkflowHostLeafScope["preparedImages"];
  resources: {
    get(ref: ResourceRef): Promise<WorkflowResourceFile>;
  };
}): WorkflowResearchBundleApi["importPapers"] {
  const broker = createWorkflowHostCapabilityBroker(args.resources);
  const callerScope = {
    ownerId: args.ownerId,
    preparedImages: args.preparedImages,
  };
  const mutationResult = async (
    request: Parameters<typeof broker.mutations.execute>[0],
    control?: Parameters<typeof broker.mutations.execute>[2],
  ) =>
    requireConfirmedMutationResult(
      await broker.mutations.execute(request, callerScope, control),
    );
  const importPapers = createResearchBundleImporter({
    ownerId: args.ownerId,
    effects: createResearchBundleImportEffects({
      resolveLibraryId(libraryId) {
        return (
          libraryId || Number(resolveHostZotero().Libraries?.userLibraryID) || 1
        );
      },
      async readExistingTarget({ itemRef, control }) {
        const detail = await broker.library.getItemDetail(itemRef, control);
        if (!detail || detail.kind !== "regular") return null;
        return {
          itemRef: detail.item.ref,
          revision: detail.item.revision,
          itemType: detail.item.itemType,
        };
      },
      async readCollectionTarget({ collectionRef, control }) {
        let cursor: string | undefined;
        while (true) {
          const page = await broker.library.listCollections(
            {
              libraryId: collectionRef.libraryId,
              limit: 100,
              ...(cursor ? { cursor } : {}),
            },
            control,
          );
          const collection = page.collections.find(
            (entry) => entry.ref.key === collectionRef.key,
          );
          if (collection) {
            return {
              collectionRef: collection.ref,
              revision: collection.revision,
            };
          }
          if (!page.hasMore) return null;
          const nextCursor = page.nextCursor?.trim();
          if (!nextCursor || nextCursor === cursor) {
            throw new Error("Research import collection pagination is invalid");
          }
          cursor = nextCursor;
        }
      },
      async resolveResource({ resourceRef }) {
        const resource = await args.resources.get(resourceRef);
        const sizeBytes = Number(resource.sizeBytes ?? resource.size);
        const sha256 = String(resource.sha256 || "").replace(/^sha256:/, "");
        if (!resource.path || !Number.isFinite(sizeBytes) || !sha256) {
          throw new Error("Research import resource is incomplete");
        }
        return {
          path: resource.path,
          sizeBytes,
          sha256,
          ...(resource.contentType
            ? { contentType: resource.contentType }
            : {}),
        };
      },
      async createItem({
        operationId,
        consistencyGroupId,
        graphId,
        libraryId,
        item,
        control,
      }) {
        const result = await mutationResult(
          {
            operation: "item.create",
            operationId: await researchImportEffectOperationId(
              operationId,
              consistencyGroupId,
              "item.create",
              graphId,
            ),
            libraryId,
            itemType: item.itemType,
            fields: item.fields,
            creators: item.creators,
            initialTags: item.tags,
          },
          control,
        );
        return requireMutationItemRef(result.item);
      },
      async addToCollection({
        operationId,
        consistencyGroupId,
        graphId,
        itemRef,
        collectionRef,
        control,
      }) {
        await mutationResult(
          {
            operation: "collection.updateMembership",
            operationId: await researchImportEffectOperationId(
              operationId,
              consistencyGroupId,
              "collection.updateMembership",
              `${graphId}:${collectionRef.libraryId}:${collectionRef.key}`,
            ),
            collectionRef,
            add: [itemRef],
            remove: [],
          },
          control,
        );
      },
      async createNote({
        operationId,
        consistencyGroupId,
        graphId,
        parentRef,
        note,
        embeddedImages,
        control,
      }) {
        const content =
          note.content.format === "html"
            ? note.content.value
            : `<p>${escapeResearchImportHtml(note.content.value)}</p>`;
        let noteResult: ReturnType<typeof requireMutationItemRef> | undefined;
        try {
          const imageBindings = await Promise.all(
            embeddedImages.map(async (image) => ({
              slot: image.slot,
              preparedImage: (
                await args.images.prepareForNoteEmbedding(
                  {
                    source: { kind: "file", path: image.resource.path },
                    ...(image.preserveSourceBytes
                      ? { options: { preserveSourceBytes: true } }
                      : {}),
                  },
                  control,
                )
              ).ref,
              ...(image.altText ? { altText: image.altText } : {}),
            })),
          );
          noteResult = requireMutationItemRef(
            requireConfirmedMutationResult(
              await broker.notes.create(
                {
                  operationId: await researchImportEffectOperationId(
                    operationId,
                    consistencyGroupId,
                    "notes.create",
                    `${graphId}:${note.noteId}`,
                  ),
                  placement: { kind: "child", parentRef },
                  content: {
                    format: "html",
                    value: content,
                    ...(imageBindings.length
                      ? { embeddedImages: imageBindings }
                      : {}),
                  },
                  ...(note.tags.length ? { initialTags: note.tags } : {}),
                },
                callerScope,
                control,
              ),
            ).note,
          );

          for (const payload of note.payloads) {
            requireConfirmedMutationResult(
              await broker.notes.upsertPayload(
                {
                  operationId: await researchImportEffectOperationId(
                    operationId,
                    consistencyGroupId,
                    "notes.upsertPayload",
                    `${graphId}:${note.noteId}:${payload.summary.payloadType}`,
                  ),
                  noteRef: noteResult.ref,
                  payload: {
                    payloadType: payload.summary.payloadType,
                    noteKind: payload.summary.noteKind,
                    schemaVersion: payload.summary.version,
                    format: payload.summary.format,
                    value: payload.value,
                  },
                },
                callerScope,
                control,
              ),
            );
          }
          return noteResult;
        } catch (error) {
          const affectedRefs = noteResult ? [noteResult.ref] : [];
          const residualRefs: Array<{ libraryId: number; key: string }> = [];
          for (const itemRef of [...affectedRefs].reverse()) {
            try {
              const detail = await broker.library.getItemDetail(
                itemRef,
                control,
              );
              if (!detail) continue;
              await mutationResult(
                {
                  operation: "item.remove",
                  operationId: await researchImportEffectOperationId(
                    operationId,
                    consistencyGroupId,
                    "item.remove",
                    `${itemRef.libraryId}:${itemRef.key}`,
                  ),
                  itemRef,
                  disposition: "trash",
                  expectedRevision: detail.item.revision,
                },
                control,
              );
            } catch {
              residualRefs.push(itemRef);
            }
          }
          throw new MutationAuthorityExecutionError(
            residualRefs.length ? "repair_required" : "failed",
            "execution_failed",
            "compensation",
            residualRefs.length ? "reconcile" : "retry_same_operation",
            {
              phase: "cleanup",
              recovery: residualRefs.length
                ? "reconcile"
                : "retry_same_operation",
              affectedCount: affectedRefs.length,
              residualCount: residualRefs.length,
            },
            error instanceof Error
              ? error.message
              : "Research note import failed",
            affectedRefs.map((ref) => ({ kind: "item" as const, ref })),
            residualRefs.map((ref) => ({ kind: "item" as const, ref })),
          );
        }
      },
      async createAttachment({
        operationId,
        consistencyGroupId,
        graphId,
        parentRef,
        attachment,
        materializedSource,
        control,
      }) {
        const result = requireConfirmedMutationResult(
          await broker.attachments.create(
            {
              operationId: await researchImportEffectOperationId(
                operationId,
                consistencyGroupId,
                "attachments.create",
                `${graphId}:${attachment.attachmentId}`,
              ),
              placement: { kind: "child", parentRef },
              source:
                materializedSource.kind === "stored_file"
                  ? {
                      kind: "stored_file",
                      main: {
                        source: {
                          kind: "local_path",
                          path: materializedSource.main.path,
                        },
                        ...(materializedSource.main.targetFilename
                          ? {
                              targetFilename:
                                materializedSource.main.targetFilename,
                            }
                          : {}),
                      },
                      companions: materializedSource.companions.map(
                        (companion) => ({
                          source: {
                            kind: "local_path" as const,
                            path: companion.path,
                          },
                          targetRelativePath: companion.targetRelativePath,
                        }),
                      ),
                    }
                  : {
                      kind: materializedSource.kind,
                      url: materializedSource.url,
                    },
              metadata: attachment.metadata,
            },
            callerScope,
            control,
          ),
        );
        return requireMutationItemRef(result.attachment);
      },
      async addRelated({
        operationId,
        consistencyGroupId,
        sourceGraphId,
        sourceRef,
        targetRef,
        control,
      }) {
        await mutationResult(
          {
            operation: "item.addRelated",
            operationId: await researchImportEffectOperationId(
              operationId,
              consistencyGroupId,
              "item.addRelated",
              `${sourceGraphId}:${targetRef.libraryId}:${targetRef.key}`,
            ),
            sourceRef,
            relatedRef: targetRef,
          },
          control,
        );
      },
      async readRevision({ itemRef, control }) {
        const detail = await broker.library.getItemDetail(itemRef, control);
        if (!detail) {
          throw new Error("Imported research item is unavailable");
        }
        return detail.item.revision;
      },
      async removeItem({ operationId, consistencyGroupId, itemRef, control }) {
        const detail = await broker.library.getItemDetail(itemRef, control);
        if (!detail) {
          throw new Error("Research import compensation target is missing");
        }
        await mutationResult(
          {
            operation: "item.remove",
            operationId: await researchImportEffectOperationId(
              operationId,
              consistencyGroupId,
              "item.remove",
              `${itemRef.libraryId}:${itemRef.key}`,
            ),
            itemRef,
            disposition: "trash",
            expectedRevision: detail.item.revision,
          },
          control,
        );
      },
    }),
  });
  return (
    request: ImportPapersRequestDto,
    control?: Parameters<typeof importPapers>[1],
  ): Promise<ImportPapersResultDto> => importPapers(request, control);
}

export function createWorkflowResearchBundleMaterializeApi(args: {
  resources: {
    materializeFile(input: {
      slotId: string;
      sourcePath: string;
      displayName?: string;
      contentType?: string;
      kind?: "file" | "archive";
    }): Promise<WorkflowResourceFile>;
    releaseResources(refs: ResourceRef[]): Promise<void>;
  };
}) {
  const broker = createZoteroHostCapabilityBroker();
  async function readAllLibraryPages<
    TPage extends {
      hasMore: boolean;
      nextCursor: string | null;
    },
    TItem,
  >(
    readPage: (page: { limit: number; cursor?: string }) => Promise<TPage>,
    getItems: (page: TPage) => readonly TItem[],
  ): Promise<TItem[]> {
    const items: TItem[] = [];
    let cursor: string | undefined;
    while (true) {
      const page = await readPage({
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      items.push(...getItems(page));
      if (!page.hasMore) return items;
      const nextCursor = page.nextCursor?.trim();
      if (!nextCursor || nextCursor === cursor) {
        throw new Error("Workflow Host page continuation is invalid");
      }
      cursor = nextCursor;
    }
  }
  const readPaper = async (
    ref: PortableItemRef,
    control: WorkflowCallControl | undefined,
    stageFile: (input: {
      slotId: string;
      sourcePath: string;
      displayName: string;
      contentType?: string;
    }) => Promise<{
      ref: ResourceRef;
      path: string;
      displayName: string;
      contentType: string;
      sizeBytes: number;
      sha256: string;
    }>,
  ) => {
    const detail = await broker.library.getItemDetail(ref, control);
    if (!detail || detail.kind !== "regular") return null;
    const [item] = await broker.library.exportPortableItems([ref], control);
    if (!item) return null;
    const noteSummaries = await readAllLibraryPages(
      (page) => broker.library.getItemNotes(ref, page, control),
      (page) => page.notes,
    );
    const notes = await Promise.all(
      noteSummaries.map(async (summary) => {
        const note = await broker.library.getNoteDetail(
          summary.ref,
          { format: "html" },
          control,
        );
        const payloadSummaries = await readAllLibraryPages(
          (page) => broker.library.listNotePayloads(summary.ref, page, control),
          (page) => page.payloads,
        );
        const payloads = await Promise.all(
          payloadSummaries
            .filter((payload) => payload.state === "available")
            .map((payload) =>
              broker.library.getNotePayload(
                summary.ref,
                { payloadType: payload.payloadType },
                control,
              ),
            ),
        );
        let content = note.content;
        const embeddedImages: MaterializedNoteDto["content"]["embeddedImages"] =
          [];
        const imageAttachments = (
          await readAllLibraryPages(
            (page) =>
              broker.library.getItemAttachments(summary.ref, page, control),
            (page) => page.attachments,
          )
        ).filter(
          (attachment) =>
            (attachment.role === "note_image" ||
              attachment.role === "note_payload") &&
            attachment.file.state === "available" &&
            (attachment.contentType === "image/jpeg" ||
              attachment.contentType === "image/png") &&
            new RegExp(
              `\\bdata-attachment-key\\s*=\\s*(?:["']${attachment.ref.key}["']|${attachment.ref.key}(?=\\s|>))`,
              "i",
            ).test(note.content),
        );
        for (const attachment of imageAttachments) {
          if (
            attachment.file.state !== "available" ||
            (attachment.contentType !== "image/jpeg" &&
              attachment.contentType !== "image/png")
          ) {
            continue;
          }
          const slot = `${attachment.ref.libraryId}:${attachment.ref.key}`;
          const staged = await stageFile({
            slotId: `paper:${ref.libraryId}:${ref.key}:note:${summary.ref.key}:image:${attachment.ref.key}`,
            sourcePath: attachment.file.path,
            displayName: attachment.filename || `${attachment.ref.key}.png`,
            contentType: attachment.contentType || undefined,
          });
          content = content
            .replaceAll(
              `data-attachment-key="${attachment.ref.key}"`,
              `data-zotero-agents-image-slot="${slot}"`,
            )
            .replaceAll(
              `data-attachment-key='${attachment.ref.key}'`,
              `data-zotero-agents-image-slot='${slot}'`,
            );
          embeddedImages.push({
            slot,
            resourceRef: staged.ref,
            altText: attachment.title || null,
            mimeType: attachment.contentType,
            sizeBytes: staged.sizeBytes,
            sha256: staged.sha256.replace(/^sha256:/, ""),
          });
        }
        return {
          source: { ref: summary.ref, revision: summary.revision },
          content: {
            format: "html" as const,
            value: content,
            embeddedImages,
          },
          tags: [],
          payloads,
        };
      }),
    );
    const attachments = (
      await readAllLibraryPages(
        (page) => broker.library.getItemAttachments(ref, page, control),
        (page) => page.attachments,
      )
    ).filter((attachment) => attachment.role === "ordinary");
    const annotations = await readAllLibraryPages(
      (page) => broker.library.listAnnotations(ref, page, control),
      (page) => page.annotations,
    );
    return {
      source: { ref: detail.item.ref, revision: detail.item.revision },
      item,
      collectionRefs: detail.item.collectionRefs,
      relatedRefs: detail.item.relatedRefs,
      notes,
      attachments,
      annotations,
    };
  };
  return async (
    request: MaterializePapersRequestDto,
    control: WorkflowCallControl = {},
  ) => {
    const stagedRefs: ResourceRef[] = [];
    const stageFile = async (stageArgs: {
      slotId: string;
      sourcePath: string;
      displayName: string;
      contentType?: string;
    }) => {
      const staged = await args.resources.materializeFile({
        ...stageArgs,
        slotId: "research-materialized-files",
      });
      if (
        !staged.ref ||
        !staged.path ||
        staged.sizeBytes === undefined ||
        !staged.sha256
      ) {
        throw new Error("Materialized research resource is incomplete");
      }
      stagedRefs.push(staged.ref);
      return {
        ref: staged.ref,
        path: staged.path,
        displayName: staged.displayName,
        contentType: staged.contentType,
        sizeBytes: staged.sizeBytes,
        sha256: staged.sha256,
      };
    };
    const materialize = createCanonicalResearchBundleMaterializer({
      readPaper: (ref, readControl) => readPaper(ref, readControl, stageFile),
      resources: {
        async stageFile(stageArgs) {
          const staged = await stageFile(stageArgs);
          return {
            ref: staged.ref,
            path: staged.path,
            displayName: staged.displayName,
            contentType: staged.contentType,
            sizeBytes: staged.sizeBytes,
            sha256: staged.sha256,
          };
        },
        cleanup: () => args.resources.releaseResources(stagedRefs),
      },
    });
    return materialize(request, control);
  };
}

export function createBoundWorkflowResearchBundleApi(args: {
  ownerId: string;
  images: WorkflowHostApiV12["images"];
  preparedImages: WorkflowHostLeafScope["preparedImages"];
  resources: Parameters<
    typeof createWorkflowResearchBundleMaterializeApi
  >[0]["resources"] & {
    get(ref: ResourceRef): Promise<WorkflowResourceFile>;
  };
}): WorkflowResearchBundleApi {
  const canonicalMaterialize = createWorkflowResearchBundleMaterializeApi({
    resources: args.resources,
  });
  return {
    materializePapers: canonicalMaterialize,
    importPapers: createWorkflowResearchBundleImportApi({
      ownerId: args.ownerId,
      images: args.images,
      preparedImages: args.preparedImages,
      resources: args.resources,
    }),
  };
}

export function createWorkflowLibraryItemSnapshotApi(
  broker: Pick<
    ReturnType<typeof createZoteroHostCapabilityBroker>,
    "library"
  > = createZoteroHostCapabilityBroker(),
) {
  return async function withItemSnapshot(
    request: ZoteroHostLibrarySyncSnapshotRequest,
    control: WorkflowCallControl,
    onBatch: (batch: ZoteroLibrarySnapshotBatchDto) => void | Promise<void>,
  ): Promise<ZoteroLibrarySnapshotWorkflowResultDto> {
    if (control.signal?.aborted) {
      throw new ZoteroHostCapabilityError(
        "canceled",
        "snapshot was canceled before capture",
        { reason: "caller_signal" },
      );
    }
    const scope = { ownerId: workflowSnapshotOwnerId() };
    let page = await broker.library.syncSnapshot(request, scope, control);
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
        control,
      );
    }
  };
}

export async function withWorkflowLibraryItemSnapshot(
  request: ZoteroHostLibrarySyncSnapshotRequest,
  control: WorkflowCallControl,
  onBatch: (batch: ZoteroLibrarySnapshotBatchDto) => void | Promise<void>,
): Promise<ZoteroLibrarySnapshotWorkflowResultDto> {
  return createWorkflowLibraryItemSnapshotApi()(request, control, onBatch);
}

export function createWorkflowAddonOwner(): WorkflowAddonOwner {
  return {
    getConfig() {
      const runtime = resolveRuntimeAddon()?.data?.config;
      return {
        addonName: String(runtime?.addonName || packageConfig.addonName).trim(),
        addonRef: String(runtime?.addonRef || packageConfig.addonRef).trim(),
        addonVersion: String(runtime?.addonVersion || packageVersion).trim(),
      };
    },
  };
}

export function createWorkflowEnvironmentOwner(): WorkflowEnvironmentOwner {
  return {
    getInfo() {
      const zotero = resolveRuntimeZotero();
      return {
        zoteroVersion: String(zotero?.version || "unknown").trim() || "unknown",
        platform: detectRuntimePlatform(
          zotero?.isWin
            ? "win32"
            : zotero?.isMac
              ? "darwin"
              : zotero?.isLinux
                ? "linux"
                : "unknown",
        ),
        locale: canonicalizeLocale(resolveRuntimeLocale(zotero?.locale)),
      };
    },
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

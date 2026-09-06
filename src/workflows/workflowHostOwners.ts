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
  getZoteroHostCanonicalMutationControl,
  ZoteroHostCapabilityError,
  type ZoteroHostLibrarySyncSnapshotRequest,
} from "../modules/zoteroHostCapabilityBroker";
import { createWorkflowNotificationOwner } from "../modules/workflowExecution/feedbackSeam";
import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeBytes,
  removeRuntimePath,
  statRuntimePathStrict,
} from "../modules/runtimePersistence";
import { createWorkflowSynthesisHostApi } from "../modules/synthesisClient/workflowHostClient";
import {
  createZoteroHostPreparedFiles,
  type PreparedStoredAttachment,
  type ZoteroHostPreparedFiles,
} from "../modules/zoteroHostPreparedFiles";
import {
  resolveRuntimeAddon,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import {
  canonicalizeLocale,
  resolveRuntimeLocale,
} from "../utils/localizationGovernance";
import { joinPath } from "../utils/path";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import type {
  WorkflowHostApiV12,
  WorkflowHostLiveReadAdapters,
  WorkflowResearchBundleApi,
  WorkflowCallControl,
  AttachmentContentManifestDto,
  AttachmentMetadataDto,
  AttachmentCreateRequestDto,
  AttachmentDetailDto,
  CanonicalStoredAttachmentSourceDto,
  JsonObject,
  MutationExecutionResult,
  MutationRequestByOperation,
  MutationResultByOperation,
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
  createWorkflowStoredAttachmentStager,
  WorkflowStoredAttachmentInputError,
} from "./workflowStoredAttachmentImport";
import {
  createResearchBundleImportEffects,
  createResearchBundleImporter,
  createCanonicalResearchBundleMaterializer,
} from "../modules/researchBundleService";
import {
  lookupTrustedStoredAttachmentMutation,
  MutationAuthorityExecutionError,
  type ZoteroHostMutationCallerScope,
} from "../modules/zoteroHostMutationAuthority";
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

export type WorkflowStoredAttachmentSource =
  | Readonly<{ kind: "local_path"; path: string }>
  | Readonly<{ kind: "resource"; resourceRef: ResourceRef }>;

export type WorkflowStoredAttachmentPreparationRequest = Readonly<{
  main: Readonly<{
    source: WorkflowStoredAttachmentSource;
    targetFilename?: string;
  }>;
  companions?: readonly Readonly<{
    source: WorkflowStoredAttachmentSource;
    targetRelativePath: string;
  }>[];
}>;

export type WorkflowPreparedStoredFiles = Readonly<{
  prepareStoredAttachment(
    request: WorkflowStoredAttachmentPreparationRequest,
  ): Promise<PreparedStoredAttachment>;
  preparedFiles: ZoteroHostPreparedFiles;
}>;

function canonicalAttachmentSha256(value: string) {
  return value.startsWith("sha256:") ? value : `sha256:${value}`;
}

type NullableAttachmentMetadataDto = {
  [K in keyof AttachmentMetadataDto]?: AttachmentMetadataDto[K] | null;
};

function canonicalAttachmentMetadata(
  metadata: NullableAttachmentMetadataDto | undefined,
): AttachmentMetadataDto | undefined {
  if (!metadata) return undefined;
  const result: AttachmentMetadataDto = {};
  for (const key of [
    "title",
    "contentType",
    "charset",
    "originalUrl",
  ] as const) {
    const value = metadata[key];
    if (value !== undefined && value !== null) result[key] = value;
  }
  return Object.keys(result).length ? result : undefined;
}

export function createCanonicalStoredAttachmentSource(
  source: WorkflowStoredAttachmentPreparationRequest,
  snapshot: PreparedStoredAttachment["snapshot"],
): CanonicalStoredAttachmentSourceDto {
  const content: AttachmentContentManifestDto = {
    schema: "zotero-agents.attachment-content.v1",
    identity: snapshot.identity,
    main: {
      ...snapshot.main,
      sha256: canonicalAttachmentSha256(snapshot.main.sha256),
    },
    companions: snapshot.companions.map((companion) => ({
      ...companion,
      sha256: canonicalAttachmentSha256(companion.sha256),
    })),
  };
  return {
    kind: "stored_file",
    content,
    ...(source.main.targetFilename
      ? { targetFilename: source.main.targetFilename }
      : {}),
    ...(source.companions?.length
      ? {
          companions: source.companions.map(({ targetRelativePath }) => ({
            targetRelativePath,
          })),
        }
      : {}),
  };
}

export function createStoredAttachmentNonResourceSemanticInput<
  K extends "attachments.create" | "attachments.replaceFile",
>(
  input: Omit<MutationRequestByOperation[K], "source">,
  source: WorkflowStoredAttachmentPreparationRequest,
): JsonObject {
  return {
    ...input,
    source: {
      kind: "stored_file",
      ...(source.main.targetFilename
        ? { targetFilename: source.main.targetFilename }
        : {}),
      ...(source.companions?.length
        ? {
            companions: source.companions.map(({ targetRelativePath }) => ({
              targetRelativePath,
            })),
          }
        : {}),
    },
  };
}

export function createStoredAttachmentCompleteSemanticInput<
  K extends "attachments.create" | "attachments.replaceFile",
>(
  input: Omit<MutationRequestByOperation[K], "source">,
  source: CanonicalStoredAttachmentSourceDto,
): JsonObject {
  return {
    ...input,
    source: {
      kind: "stored_file",
      content: {
        schema: source.content.schema,
        identity: source.content.identity,
        main: { ...source.content.main },
        companions: source.content.companions.map((companion) => ({
          ...companion,
        })),
      },
      ...(source.targetFilename
        ? { targetFilename: source.targetFilename }
        : {}),
      ...(source.companions?.length
        ? {
            companions: source.companions.map(({ targetRelativePath }) => ({
              targetRelativePath,
            })),
          }
        : {}),
    },
  };
}

export function lookupWorkflowStoredAttachmentMutation<
  K extends "attachments.create" | "attachments.replaceFile",
>(args: Readonly<{
  scope: ZoteroHostMutationCallerScope;
  input: Omit<MutationRequestByOperation[K], "source">;
  source: WorkflowStoredAttachmentPreparationRequest;
  completeSemanticInput?: JsonObject;
}>) {
  return lookupTrustedStoredAttachmentMutation<MutationResultByOperation[K]>({
    scope: args.scope,
    operationId: args.input.operationId,
    operation: args.input.operation,
    nonResourceSemanticInput: createStoredAttachmentNonResourceSemanticInput(
      args.input,
      args.source,
    ),
    ...(args.completeSemanticInput
      ? { completeSemanticInput: args.completeSemanticInput }
      : {}),
  });
}

function isAttachmentDetail(
  value: JsonObject["attachment"],
): value is AttachmentDetailDto {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return (
    !!value.ref &&
    typeof value.ref === "object" &&
    !Array.isArray(value.ref) &&
    typeof value.title === "string"
  );
}

export function isAttachmentCreateMutationResult(
  value: JsonObject,
): value is JsonObject & { attachment: AttachmentDetailDto } {
  return isAttachmentDetail(value.attachment);
}

export function isAttachmentReplaceMutationResult(
  value: JsonObject,
): value is JsonObject & {
  attachment: AttachmentDetailDto;
  outcome: "replaced" | "unchanged";
} {
  return (
    isAttachmentDetail(value.attachment) &&
    (value.outcome === "replaced" || value.outcome === "unchanged")
  );
}

export function createWorkflowHostCapabilityBroker(
  _resources?: Pick<WorkflowResourceApi, "get">,
) {
  return createZoteroHostCapabilityBroker();
}

export function createWorkflowPreparedStoredFiles(
  resources?: Pick<WorkflowResourceApi, "get">,
): WorkflowPreparedStoredFiles {
  const validateStoredSource = async (path: string) => {
    const stat = await statRuntimePathStrict(path).catch(() => null);
    if (!stat?.exists || stat.isDir) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment source must be a regular file",
      );
    }
    return { sizeBytes: stat.size };
  };
  const stager = createWorkflowStoredAttachmentStager({
    getStagingRoot: () =>
      joinPath(
        getRuntimePersistencePaths().tmpDir,
        "workflow-attachment-import",
      ),
    validateSource: validateStoredSource,
    ensureDirectory: ensureRuntimeDirectory,
    copyFile: (sourcePath, targetPath) =>
      copyRuntimeFile({ sourcePath, targetPath }).then(() => undefined),
    removePath: removeRuntimePath,
  });
  const preparedFiles = createZoteroHostPreparedFiles({
    stageStoredAttachmentSources: stager,
    readBytes: readRuntimeBytes,
  });
  const resolveSource = async (source: WorkflowStoredAttachmentSource) => {
    if (source.kind === "local_path") return source.path;
    if (!resources) {
      throw new Error("workflow resource resolver is unavailable");
    }
    return (await resources.get(source.resourceRef)).path;
  };
  return Object.freeze({
    async prepareStoredAttachment(request) {
      return preparedFiles.prepareStoredAttachment({
        path: await resolveSource(request.main.source),
        targetFilename: request.main.targetFilename,
        companionFiles: await Promise.all(
          (request.companions || []).map(async (companion) => ({
            sourcePath: await resolveSource(companion.source),
            relativePath: companion.targetRelativePath,
          })),
        ),
      });
    },
    preparedFiles,
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
  const trusted = getZoteroHostCanonicalMutationControl(broker);
  const callerScope = {
    ownerId: args.ownerId,
    preparedImages: args.preparedImages,
  };
  const executePreparedAttachmentCreate = async (
    input: Omit<
      MutationRequestByOperation["attachments.create"],
      "source"
    >,
    source: Parameters<
      ReturnType<
        typeof createWorkflowPreparedStoredFiles
      >["prepareStoredAttachment"]
    >[0],
    control?: WorkflowCallControl,
  ): Promise<
    MutationExecutionResult<MutationResultByOperation["attachments.create"]>
  > => {
    const existing = await lookupWorkflowStoredAttachmentMutation<"attachments.create">({
      scope: callerScope,
      input,
      source,
    });
    if (existing.state !== "missing") return existing.result;
    const files = createWorkflowPreparedStoredFiles(args.resources);
    try {
      const preparedFile = await files.prepareStoredAttachment(source);
      const canonicalSource = createCanonicalStoredAttachmentSource(
        source,
        preparedFile.snapshot,
      );
      const canonicalInput: MutationRequestByOperation["attachments.create"] = {
        ...input,
        source: canonicalSource,
      };
      const replay = await lookupWorkflowStoredAttachmentMutation<"attachments.create">({
        scope: callerScope,
        input,
        source,
        completeSemanticInput: createStoredAttachmentCompleteSemanticInput(
          input,
          canonicalSource,
        ),
      });
      if (replay.state !== "missing") return replay.result;
      const prepared = await trusted.prepare<"attachments.create">({
        input: canonicalInput,
        scope: callerScope,
        control,
        resources: {
          deferredStoredAttachment: {
            prepare: async () => preparedFile,
          },
          preparedFiles: files.preparedFiles,
        },
      });
      if (prepared.state === "settled") return prepared.result;
      return await trusted.execute<"attachments.create">({
        input: canonicalInput,
        scope: callerScope,
        prepared: prepared.prepared,
        control,
      });
    } finally {
      await files.preparedFiles.dispose();
    }
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
              await mutationResult(
                {
                  operation: "trash.setItemsState",
                  operationId: await researchImportEffectOperationId(
                    operationId,
                    consistencyGroupId,
                    "trash.setItemsState",
                    `${itemRef.libraryId}:${itemRef.key}`,
                  ),
                  itemRefs: [itemRef],
                  state: "trashed",
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
        const metadata = canonicalAttachmentMetadata(attachment.metadata);
        const input = {
          operationId: await researchImportEffectOperationId(
            operationId,
            consistencyGroupId,
            "attachments.create",
            `${graphId}:${attachment.attachmentId}`,
          ),
          placement: { kind: "child" as const, parentRef },
          ...(metadata ? { metadata } : {}),
        };
        const result = requireConfirmedMutationResult(
          materializedSource.kind === "stored_file"
            ? await executePreparedAttachmentCreate(
                { ...input, operation: "attachments.create" },
                {
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
                },
                control,
              )
            : await broker.attachments.create(
                {
                  ...input,
                  source: {
                    kind: materializedSource.kind,
                    url: materializedSource.url,
                  },
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
            relatedRefs: [targetRef],
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
        await mutationResult(
          {
            operation: "trash.setItemsState",
            operationId: await researchImportEffectOperationId(
              operationId,
              consistencyGroupId,
              "trash.setItemsState",
              `${itemRef.libraryId}:${itemRef.key}`,
            ),
            itemRefs: [itemRef],
            state: "trashed",
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

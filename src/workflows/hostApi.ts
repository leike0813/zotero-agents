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
  getLegacyZoteroItemAttachments,
  getLegacyZoteroItemDetail,
  getLegacyZoteroItemNotes,
  getLegacyZoteroNoteDetail,
  getLegacyZoteroNotePayload,
  getLegacyZoteroCurrentView,
  getLegacyZoteroSelectedItems,
  listLegacyZoteroLibraryItems,
  listLegacyZoteroNotePayloads,
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
  resolveRuntimeTemporaryDirectory,
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
  WorkflowHostLiveReadAdapters,
  WorkflowPreparedNoteImage,
  WorkflowResearchBundleApi,
  WorkflowCallControl,
  ImportPapersRequestDto,
  ImportPapersResultDto,
  MaterializePapersRequestDto,
  PortableItemRef,
  ResourceRef,
  WorkflowResourceFile,
} from "./types";
import { createWorkflowArchiveApi } from "./archive";
import { createWorkflowFileApi } from "./file";
import { materializeWorkflowInputFile } from "./workflowInputMaterialization";
import { prepareWorkflowNoteImage } from "./workflowNoteImagePreparation";
import { createWorkflowStoredAttachmentImport } from "./workflowStoredAttachmentImport";
import { exportZoteroItemsAsText } from "../modules/zoteroItemTextExporter";
import {
  createResearchBundleImportEffects,
  createResearchBundleImporter,
  createCanonicalResearchBundleMaterializer,
  createResearchBundleMaterializer,
} from "../modules/researchBundleService";
import { MutationAuthorityExecutionError } from "../modules/zoteroHostMutationAuthority";
import { sha256Hex } from "../utils/sha256";
import { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";
import type { WorkflowInteractionMember } from "./workflowHostErrorContract";

export { WORKFLOW_HOST_API_VERSION } from "./workflowHostContract";

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
      getSelectedItems: (control?: Parameters<typeof broker.context.getSelectedItems>[0]) =>
        interactive
          ? broker.context.getSelectedItems(control)
          : Promise.reject(interactionRequiredError("context.getSelectedItems")),
    },
    navigation: {
      openItem: (...parameters: Parameters<typeof broker.navigation.openItem>) =>
        interactive
          ? broker.navigation.openItem(...parameters)
          : Promise.reject(interactionRequiredError("navigation.openItem")),
      openNote: (...parameters: Parameters<typeof broker.navigation.openNote>) =>
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
          : Promise.reject(interactionRequiredError("navigation.openSelection")),
    },
    library: {
      listItems: broker.library.listItems,
      traverseItems: broker.library.traverseItems,
      listCollections: broker.library.listCollections,
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

function escapeResearchImportRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bindResearchImportImageSlots(
  html: string,
  attachmentKeys: ReadonlyMap<string, string>,
) {
  let result = html;
  for (const [slot, attachmentKey] of attachmentKeys) {
    const escapedSlot = escapeResearchImportRegex(slot);
    const attribute = new RegExp(
      `\\sdata-zotero-agents-image-slot\\s*=\\s*(?:"${escapedSlot}"|'${escapedSlot}')`,
      "gi",
    );
    result = result.replace(
      attribute,
      ` data-attachment-key="${attachmentKey}"`,
    );
  }
  return result;
}

export function createWorkflowResearchBundleImportApi(args: {
  base: WorkflowHostApi;
  ownerId: string;
  resources: {
    get(ref: ResourceRef): Promise<WorkflowResourceFile>;
  };
}): NonNullable<WorkflowHostApi["researchBundles"]["importPapers"]> {
  const broker = createZoteroHostCapabilityBroker();
  const callerScope = { ownerId: args.ownerId };
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
        do {
          const page = await broker.library.listCollections(
            {
              libraryId: collectionRef.libraryId,
              limit: 500,
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
          cursor = page.nextCursor || undefined;
        } while (cursor);
        return null;
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
        let noteResult:
          | ReturnType<typeof requireMutationItemRef>
          | undefined;
        const embeddedRefs: Array<{ libraryId: number; key: string }> = [];
        try {
          noteResult = requireMutationItemRef(
            (
              requireConfirmedMutationResult(
                await broker.notes.create(
              {
                operationId: await researchImportEffectOperationId(
                  operationId,
                  consistencyGroupId,
                  "notes.create",
                  `${graphId}:${note.noteId}`,
                ),
                parentRef,
                content,
              },
              callerScope,
              control,
              ),
              )
            ).note,
          );

          if (embeddedImages.length) {
            const noteItem = args.base.items.getByLibraryAndKey(
              noteResult.ref.libraryId,
              noteResult.ref.key,
            );
            if (!noteItem) {
              throw new Error("Research import note is unavailable");
            }
            const attachmentKeys = new Map<string, string>();
            for (const image of embeddedImages) {
              const bytes = await args.base.file.readBytes(image.resource.path);
              const mimeType =
                image.resource.contentType === "image/jpeg"
                  ? "image/jpeg"
                  : "image/png";
              const prepared = {
                bytes,
                mimeType,
                width: 1,
                height: 1,
                originalBytes: bytes.byteLength,
                compressedBytes: bytes.byteLength,
              };
              const imported = await args.base.notes.importEmbeddedImage(
                noteItem,
                prepared,
              );
              const itemRef = toBrokerItemRef(imported.attachmentItem);
              embeddedRefs.push(itemRef);
              attachmentKeys.set(image.slot, imported.attachmentKey);
            }
            await args.base.notes.update(noteItem, {
              content: bindResearchImportImageSlots(content, attachmentKeys),
            });
          }

          if (note.tags.length) {
            await mutationResult(
              {
                operation: "item.updateTags",
                operationId: await researchImportEffectOperationId(
                  operationId,
                  consistencyGroupId,
                  "item.updateTags",
                  `${graphId}:${note.noteId}`,
                ),
                itemRef: noteResult.ref,
                add: note.tags,
                remove: [],
              },
              control,
            );
          }
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
                  payloadType: payload.summary.payloadType,
                  noteKind: payload.summary.noteKind,
                  payload: payload.value,
                },
                callerScope,
                control,
              ),
            );
          }
          return {
            ...noteResult,
            ...(embeddedRefs.length ? { ownedRefs: embeddedRefs } : {}),
          };
        } catch (error) {
          const affectedRefs = [
            ...(noteResult ? [noteResult.ref] : []),
            ...embeddedRefs,
          ];
          const residualRefs: Array<{ libraryId: number; key: string }> = [];
          for (const itemRef of [...affectedRefs].reverse()) {
            try {
              const item = args.base.items.getByLibraryAndKey(
                itemRef.libraryId,
                itemRef.key,
              );
              if (item) await args.base.items.remove(item);
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
        parentRef,
        attachment,
        materializedSource,
      }) {
        const parent = args.base.items.getByLibraryAndKey(
          parentRef.libraryId,
          parentRef.key,
        );
        if (!parent) {
          throw new Error("Research import attachment parent is unavailable");
        }
        const created =
          materializedSource.kind === "stored_file"
            ? await args.base.attachments.importStoredFile({
                parent,
                path: materializedSource.main.path,
                title: attachment.metadata?.title,
                mimeType: attachment.metadata?.contentType,
                charset: attachment.metadata?.charset,
                url: attachment.metadata?.originalUrl,
                companionFiles: materializedSource.companions.map(
                  (companion) => ({
                    sourcePath: companion.path,
                    relativePath: companion.targetRelativePath,
                  }),
                ),
              })
            : await args.base.attachments.createFromUrl({
                parent,
                url: materializedSource.url,
                title: attachment.metadata?.title,
                mimeType: attachment.metadata?.contentType,
                deduplicate: false,
              });
        const ref = toBrokerItemRef(created);
        const detail = await broker.library.getItemDetail(ref);
        if (!detail || detail.kind !== "attachment") {
          throw new Error("Research import attachment verification failed");
        }
        return { ref, revision: detail.item.revision };
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
        try {
          const detail = await broker.library.getItemDetail(itemRef, control);
          if (detail) return detail.item.revision;
        } catch {
          // Some plugin-managed note attachments do not have a public detail
          // projection, but they still participate in the group receipt.
        }
        const item = args.base.items.getByLibraryAndKey(
          itemRef.libraryId,
          itemRef.key,
        ) as (Zotero.Item & { version?: unknown; dateModified?: unknown }) | null;
        const revision =
          item?.version ??
          item?.dateModified ??
          (item as any)?.toJSON?.()?.version;
        if (revision === undefined || revision === null || !String(revision)) {
          throw new Error("Imported research item is unavailable");
        }
        return String(revision);
      },
      async removeItem({ itemRef }) {
        const item = args.base.items.getByLibraryAndKey(
          itemRef.libraryId,
          itemRef.key,
        );
        if (!item) throw new Error("Research import compensation target is missing");
        await args.base.items.remove(item);
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
  const readPaper = async (
    ref: PortableItemRef,
    control?: WorkflowCallControl,
  ) => {
      const detail = await broker.library.getItemDetail(ref, control);
      if (!detail || detail.kind !== "regular") return null;
      const [item] = await broker.library.exportPortableItems([ref], control);
      if (!item) return null;
      const noteSummaries = await broker.library.getItemNotes(ref, control);
      const notes = await Promise.all(
        noteSummaries.map(async (summary) => {
          const note = await broker.library.getNoteDetail(
            summary.ref,
            { format: "html" },
            control,
          );
          const payloadSummaries = await broker.library.listNotePayloads(
            summary.ref,
            control,
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
          return {
            source: { ref: summary.ref, revision: summary.revision },
            content: {
              format: "html" as const,
              value: note.content,
              embeddedImages: [],
            },
            tags: [],
            payloads,
          };
        }),
      );
      const attachments = (
        await broker.library.getItemAttachments(ref, control)
      ).filter((attachment) => attachment.role === "ordinary");
      const annotations = await broker.library.listAnnotations(ref, control);
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
    const materialize = createCanonicalResearchBundleMaterializer({
      readPaper,
      resources: {
        async stageFile(stageArgs) {
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
        },
        cleanup: () => args.resources.releaseResources(stagedRefs),
      },
    });
    return materialize(request, control);
  };
}

export function createBoundWorkflowResearchBundleApi(args: {
  base: WorkflowHostApi;
  ownerId: string;
  resources: Parameters<typeof createWorkflowResearchBundleMaterializeApi>[0]["resources"] & {
    get(ref: ResourceRef): Promise<WorkflowResourceFile>;
  };
}): WorkflowResearchBundleApi {
  const canonicalMaterialize = createWorkflowResearchBundleMaterializeApi({
    resources: args.resources,
  });
  const materializePapers = (async (
    request: Parameters<WorkflowResearchBundleApi["materializePapers"]>[0],
    control?: WorkflowCallControl,
  ) => {
    if ("paperRefs" in request) {
      return canonicalMaterialize(request, control);
    }
    return args.base.researchBundles.materializePapers(request);
  }) as WorkflowResearchBundleApi["materializePapers"];
  return {
    materializePapers,
    importPapers: createWorkflowResearchBundleImportApi({
      base: args.base,
      ownerId: args.ownerId,
      resources: args.resources,
    }),
  };
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
        const attachments = await getLegacyZoteroItemAttachments({
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
    getCurrentView: getLegacyZoteroCurrentView,
    getSelectedItems: getLegacyZoteroSelectedItems,
  } satisfies WorkflowHostApi["context"];
  const library = {
    listItems: (args: ZoteroHostLibraryListArgs) =>
      listLegacyZoteroLibraryItems(toBrokerLibraryListArgs(args)),
    syncSnapshot: (args: ZoteroHostLibrarySyncSnapshotRequest) =>
      zoteroBroker.library.syncSnapshot(args, {
        ownerId: "workflow-host-v11",
      }),
    searchItems: zoteroBroker.library.searchItems,
    getItemDetail: (ref: WorkflowHostItemRefInput) =>
      getLegacyZoteroItemDetail(toBrokerItemRef(ref)),
    getItemNotes: (
      ref: WorkflowHostItemRefInput,
      args?: Parameters<WorkflowHostApi["library"]["getItemNotes"]>[1],
    ) => getLegacyZoteroItemNotes(toBrokerItemRef(ref), args),
    getNoteDetail: (
      ref: WorkflowHostItemRefInput,
      args?: Parameters<WorkflowHostApi["library"]["getNoteDetail"]>[1],
    ) => getLegacyZoteroNoteDetail(toBrokerItemRef(ref), args),
    listNotePayloads: (ref: WorkflowHostItemRefInput) =>
      listLegacyZoteroNotePayloads(toBrokerItemRef(ref)),
    getNotePayload: (
      ref: WorkflowHostItemRefInput,
      args?: Parameters<WorkflowHostApi["library"]["getNotePayload"]>[1],
    ) => getLegacyZoteroNotePayload(toBrokerItemRef(ref), args),
    getItemAttachments: (ref: WorkflowHostItemRefInput) =>
      getLegacyZoteroItemAttachments(toBrokerItemRef(ref)),
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
  const workflowFile = createWorkflowFileApi();
  const legacyMaterializePapers = async (args: {
    papers: Array<{ paperRef: string }>;
    sourcePaperRefs?: string[];
  }) => {
    const materialized = await materializeWorkflowResearchBundlePapers(args);
    return {
      ...materialized,
      warnings: materialized.warnings.map((warning) =>
        warning.code === "source_missing"
          ? { ...warning, code: "core_source_missing" }
          : warning,
      ),
    };
  };
  const researchBundles: WorkflowResearchBundleApi = {
    materializePapers:
      legacyMaterializePapers as WorkflowResearchBundleApi["materializePapers"],
  };
  const hostApi: WorkflowHostApi = {
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
    researchBundles,
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
      ...workflowFile,
    },
    archive: createWorkflowArchiveApi(),
    synthesis: createWorkflowSynthesisHostApi(),
  };
  cachedHostApi = hostApi;
  return hostApi;
}

export function resetWorkflowHostApiForTests() {
  cachedHostApi = null;
}

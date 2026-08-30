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
} from "./types";
import { createWorkflowArchiveApi } from "./archive";
import { materializeWorkflowInputFile } from "./workflowInputMaterialization";
import { prepareWorkflowNoteImage } from "./workflowNoteImagePreparation";
import { createWorkflowStoredAttachmentImport } from "./workflowStoredAttachmentImport";
import {
  getBuiltinStatusPolicy,
  getBuiltinStatusTag,
  isBuiltinStatusKey,
  type BuiltinStatusKey,
  type BuiltinStatusTag,
} from "../modules/synthesis/builtinTagPolicy";

import { exportZoteroItemsAsText } from "../modules/zoteroItemTextExporter";
import { createResearchBundleMaterializer } from "../modules/researchBundleService";
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

function normalizeBuiltinStatusKeys(values: unknown): BuiltinStatusKey[] {
  const keys = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
  const unknown = keys.filter((key) => !isBuiltinStatusKey(key));
  if (unknown.length) {
    throw new Error(`Unknown builtin status key: ${unknown.join(", ")}`);
  }
  return keys as BuiltinStatusKey[];
}

async function transitionBuiltinStatusTags(args: {
  item: Zotero.Item | number | string;
  add?: BuiltinStatusKey[];
  remove?: BuiltinStatusKey[];
}) {
  const addKeys = normalizeBuiltinStatusKeys(args?.add);
  const removeKeys = normalizeBuiltinStatusKeys(args?.remove);
  const removeSet = new Set(removeKeys);
  const overlapping = addKeys.filter((key) => removeSet.has(key));
  if (overlapping.length) {
    throw new Error(
      `Builtin status keys cannot be added and removed together: ${overlapping.join(", ")}`,
    );
  }
  const synthesisClient = await getDefaultSynthesisClient();
  if (!(await synthesisClient.tags.isBuiltinTagPolicyInitialized())) {
    throw new Error("Builtin status tag policy is not initialized");
  }
  const item = assertHostItem(args.item);
  const current = new Set(await handlers.tag.list(item));
  const addTags = addKeys
    .map(getBuiltinStatusTag)
    .filter((tag) => !current.has(tag));
  const removeTags = removeKeys
    .map(getBuiltinStatusTag)
    .filter((tag) => current.has(tag));
  const added: BuiltinStatusTag[] = [];
  const removed: BuiltinStatusTag[] = [];
  const warnings: Array<{
    code: string;
    operation: "add" | "remove";
    tags: BuiltinStatusTag[];
    message: string;
  }> = [];
  if (addTags.length) {
    try {
      await handlers.tag.add(item, addTags);
      added.push(...addTags);
    } catch (error) {
      warnings.push({
        code: "builtin_status_add_failed",
        operation: "add",
        tags: addTags,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (removeTags.length) {
    try {
      await handlers.tag.remove(item, removeTags);
      removed.push(...removeTags);
    } catch (error) {
      warnings.push({
        code: "builtin_status_remove_failed",
        operation: "remove",
        tags: removeTags,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { added, removed, warnings };
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
  const zoteroBroker = createZoteroHostCapabilityBroker();
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
    syncSnapshot: (args: ZoteroHostLibraryListArgs) =>
      zoteroBroker.library.syncSnapshot(toBrokerLibraryListArgs(args)),
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
      zoteroBroker.mutations.preview(toBrokerMutationRequest(request)),
    execute: (request: WorkflowHostMutationRequest) =>
      zoteroBroker.mutations.execute(toBrokerMutationRequest(request)),
  } satisfies WorkflowHostApi["mutations"];
  const metadata = {
    translateIdentifier: zoteroBroker.metadata.translateIdentifier,
  } satisfies WorkflowHostApi["metadata"];
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
    parents: handlers.parent,
    notes: {
      ...handlers.note,
      importEmbeddedImage,
    },
    images: {
      prepareForNoteEmbedding: prepareWorkflowNoteImage,
    },
    attachments: {
      ...handlers.attachment,
      importStoredFile,
    },
    tags: handlers.tag,
    statusTags: {
      getPolicy: getBuiltinStatusPolicy,
      transition: transitionBuiltinStatusTags,
    },
    collections: handlers.collection,
    command: handlers.command,
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
        return resolveRuntimeTemporaryDirectory();
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

import { getHostBridgeApprovalRequirement } from "./hostBridgePermissionManager";
import type {
  AttachmentDetailDto,
  LibraryListItemsRequestDto,
  SelectedItemsPageRequestDto,
  WorkflowCallControl,
} from "../workflows/types";
import {
  registerHostBridgeFileHandle,
  registerHostBridgeFileHandlesInOrder,
  registerHostBridgeWorkflowArtifactFile,
  type HostBridgeFileDescriptor,
} from "./hostBridgeFileRegistry";
import {
  isDebugModeEnabled,
  isSkillRunnerConnectionAuditAvailable,
} from "./debugMode";
import {
  getRuntimePersistencePaths,
  readRuntimeBytes,
  scanRuntimePersistenceUsage,
  writeRuntimeBytes,
} from "./runtimePersistence";
import { joinPath } from "../utils/path";
import { ZoteroLibraryCursorError } from "./zoteroLibraryPageQuery";
import { createStoreZipBytes } from "./zipStore";
import {
  chunkHostBridgeText,
  paginateHostBridgeRows,
} from "./hostBridgePagination";
import {
  assertWorkflowProductStorageReady,
  exportWorkflowProductToDirectory,
  getWorkflowProduct,
  listWorkflowProducts,
  removeWorkflowProduct,
  resolveManagedWorkflowProductAsset,
  resolveManagedWorkflowProductAssetByRelativePath,
  WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK,
  type WorkflowProductAsset,
  type WorkflowProductRecord,
} from "./workflowProductStore";
import { scanPersistenceIntegrity } from "./persistenceIntegrity";
import type {
  HostBridgeApprovalRequirement,
  HostBridgeCapabilityManifestEntry,
  HostBridgeConnectionMode,
  HostBridgeErrorCategory,
  HostBridgeStatusSnapshot,
} from "./hostBridgeProtocol";
import {
  resolveZoteroHostCapabilityBroker,
  ZoteroHostCapabilityError,
  type ZoteroHostCapabilityBroker,
  type ZoteroHostCollectionRefInput,
  type ZoteroHostItemRefInput,
  type ZoteroHostLibraryListArgs,
  type ZoteroHostLibrarySyncSnapshotRequest,
  type ZoteroHostMutationRequest,
  type ZoteroHostAttachmentDto,
} from "./zoteroHostCapabilityBroker";
import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import type {
  SynthesisClient,
  SynthesisDeliveryContext,
  SynthesisJsonObject,
  SynthesisPaperArtifactsRequest,
  SynthesisTopicReportRequest,
} from "../../packages/synthesis-contracts/src/index";
import {
  rebuildSynthesisTopicContextRequest,
  rebuildSynthesisTopicFindRequest,
  rebuildSynthesisTopicListRequest,
  rebuildSynthesisTopicResolverRequest,
  rebuildSynthesisWorkbenchPaperDigestReadRequest,
  rebuildSynthesisWorkflowReviewRequest,
} from "../../packages/synthesis-contracts/src/index";
import { getDefaultSynthesisClient } from "./synthesisClient/defaultClient";
import {
  createDirectResearchBundleApplication,
  type DirectResearchBundleApplication,
} from "./researchBundleService";
import {
  getHostBridgeCapabilityContract,
  listHostBridgeCapabilityContractEntries,
  validateHostBridgeCapabilityInput,
  validateHostBridgeCapabilityOutput,
  type HostBridgeContractViolation,
} from "./hostBridgeCapabilityContract";
export type HostBridgeCapabilityContext = {
  getStatus: () => HostBridgeStatusSnapshot;
  connectionMode: HostBridgeConnectionMode;
  control?: WorkflowCallControl;
  resolveZoteroHostCapabilityBroker?: () => ZoteroHostCapabilityBroker;
  resolveSynthesisClient?: () => SynthesisClient | Promise<SynthesisClient>;
  resolveDirectResearchBundleApplication?: () =>
    | DirectResearchBundleApplication
    | Promise<DirectResearchBundleApplication>;
};

export type JsonSerializableValue =
  | null
  | boolean
  | number
  | string
  | undefined
  | object;

export type HostBridgeCapabilityHandler = (
  input: unknown,
  context: HostBridgeCapabilityContext,
) => JsonSerializableValue | Promise<JsonSerializableValue>;

export type HostBridgeCapabilityDefinition =
  HostBridgeCapabilityManifestEntry & {
    handler: HostBridgeCapabilityHandler;
  };

type HostBridgeWorkflowProductErrorCode =
  | "workflow_product_not_found"
  | "workflow_product_asset_not_found"
  | "workflow_product_store_migration_incomplete"
  | "workflow_product_export_path_too_long"
  | "workflow_product_export_failed";

export class HostBridgeWorkflowProductError extends Error {
  readonly code: HostBridgeWorkflowProductErrorCode;
  readonly httpStatus: number;
  readonly statusText: string;
  readonly category: HostBridgeErrorCategory;

  constructor(code: HostBridgeWorkflowProductErrorCode, message: string) {
    super(message);
    this.name = "HostBridgeWorkflowProductError";
    this.code = code;
    if (
      code === "workflow_product_not_found" ||
      code === "workflow_product_asset_not_found"
    ) {
      this.httpStatus = 404;
      this.statusText = "Not Found";
      this.category = "not_found";
    } else if (code === "workflow_product_export_path_too_long") {
      this.httpStatus = 400;
      this.statusText = "Bad Request";
      this.category = "validation";
    } else if (code === "workflow_product_store_migration_incomplete") {
      this.httpStatus = 503;
      this.statusText = "Service Unavailable";
      this.category = "workflow";
    } else {
      this.httpStatus = 500;
      this.statusText = "Internal Server Error";
      this.category = "capability";
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function asObject(input: unknown): Record<string, unknown> {
  return isPlainObject(input) ? input : {};
}

function librarySnapshotArgsFromInput(
  input: unknown,
): ZoteroHostLibrarySyncSnapshotRequest {
  const object = asObject(input);
  return {
    libraryId: Number(object.libraryId),
    ...(object.batchSize === undefined
      ? {}
      : { batchSize: Number(object.batchSize) }),
    ...(typeof object.snapshotId === "string"
      ? { snapshotId: object.snapshotId }
      : {}),
    ...(typeof object.cursor === "string" ? { cursor: object.cursor } : {}),
  };
}

function capabilityPageCriteria(
  input: Record<string, unknown>,
  pagingKeys: string[] = ["cursor", "limit"],
) {
  const omitted = new Set(pagingKeys);
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !omitted.has(key)),
  );
}

function capabilityPageRowKey(value: unknown) {
  const object = asObject(value);
  for (const key of [
    "productId",
    "assetId",
    "artifact_id",
    "artifactId",
    "paper_ref",
    "paperRef",
    "topic_id",
    "topicId",
    "payloadType",
    "node_id",
    "nodeId",
    "eventId",
    "id",
    "key",
  ]) {
    const candidate = String(object[key] || "").trim();
    if (candidate) return `${key}:${candidate}`;
  }
  return JSON.stringify(value);
}

function paginateCapabilityRows<T>(args: {
  scope: string;
  section: string;
  input: Record<string, unknown>;
  rows: readonly T[];
  result?: Record<string, unknown>;
}) {
  const page = paginateHostBridgeRows({
    scope: args.scope,
    criteria: capabilityPageCriteria(args.input),
    rows: args.rows,
    key: capabilityPageRowKey,
    cursor: args.input.cursor,
    limit: args.input.limit,
  });
  return {
    ...(args.result || {}),
    [args.section]: page.page,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    returned: page.returned,
    total: page.total,
    limit: page.limit,
  };
}

type HostBridgePortableRefKind = "item" | "note" | "collection";

function resolveHostBridgeZotero() {
  const zotero =
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!zotero) {
    throw new ZoteroHostCapabilityError(
      "unavailable",
      "Zotero runtime is unavailable",
      { reason: "capability" },
      true,
    );
  }
  return zotero;
}

function refNotFound(kind: HostBridgePortableRefKind, key?: string): never {
  throw new ZoteroHostCapabilityError("not_found", `${kind} not found`, {
    kind,
    ...(key ? { opaqueKey: key } : {}),
  });
}

function invalidProjectionRef(
  kind: HostBridgePortableRefKind,
  reason: "invalid_shape" | "invalid_library_id" | "invalid_key",
): never {
  throw new ZoteroHostCapabilityError(
    "invalid_ref",
    `${kind} ref cannot be normalized to a portable ref`,
    { kind, reason },
  );
}

function objectForLegacyRef(input: unknown) {
  const object = asObject(input);
  return Object.prototype.hasOwnProperty.call(object, "ref")
    ? asObject(object.ref)
    : object;
}

export function normalizeHostBridgeItemRef(
  input: unknown,
  kind: "item" | "note" = "item",
): ZoteroHostItemRefInput {
  const wrapper = asObject(input);
  const value = Object.prototype.hasOwnProperty.call(wrapper, "ref")
    ? wrapper.ref
    : input;
  const candidate = objectForLegacyRef(input);
  const scopedKey =
    typeof value === "string"
      ? value.trim().match(/^(\d+):([A-Z0-9]{8})$/)
      : null;
  if (scopedKey) {
    return { libraryId: Number(scopedKey[1]), key: scopedKey[2] };
  }

  const key =
    typeof value === "string"
      ? value.trim()
      : typeof candidate.key === "string"
        ? candidate.key.trim()
        : "";
  const libraryId = Number(candidate.libraryId ?? candidate.libraryID);
  if (key && Number.isSafeInteger(libraryId) && libraryId > 0) {
    return { libraryId, key };
  }

  const idValue =
    typeof value === "number" ||
    (typeof value === "string" && /^\d+$/.test(value.trim()))
      ? value
      : candidate.id;
  const id = Number(idValue);
  const zotero = resolveHostBridgeZotero();
  if (Number.isSafeInteger(id) && id > 0) {
    const item = zotero.Items.get(id);
    if (!item) refNotFound(kind);
    const itemCandidate = item as unknown as {
      key?: unknown;
      libraryID?: unknown;
      libraryId?: unknown;
    };
    const itemKey = String(itemCandidate.key || "").trim();
    const itemLibraryId = Number(
      itemCandidate.libraryID ?? itemCandidate.libraryId,
    );
    if (itemKey && Number.isSafeInteger(itemLibraryId) && itemLibraryId > 0) {
      return { libraryId: itemLibraryId, key: itemKey };
    }
    invalidProjectionRef(kind, "invalid_shape");
  }

  if (key) {
    const defaultLibraryId = Number(zotero.Libraries.userLibraryID);
    if (!Number.isSafeInteger(defaultLibraryId) || defaultLibraryId <= 0) {
      invalidProjectionRef(kind, "invalid_library_id");
    }
    return { libraryId: defaultLibraryId, key };
  }
  invalidProjectionRef(kind, key ? "invalid_key" : "invalid_shape");
}

export function normalizeHostBridgeCollectionRef(
  input: unknown,
): ZoteroHostCollectionRefInput {
  const wrapper = asObject(input);
  const value = Object.prototype.hasOwnProperty.call(wrapper, "ref")
    ? wrapper.ref
    : input;
  const candidate = objectForLegacyRef(input);
  const scopedKey =
    typeof value === "string"
      ? value.trim().match(/^(\d+):([A-Z0-9]{8})$/)
      : null;
  if (scopedKey) {
    return { libraryId: Number(scopedKey[1]), key: scopedKey[2] };
  }
  const key =
    typeof value === "string"
      ? value.trim()
      : typeof candidate.key === "string"
        ? candidate.key.trim()
        : "";
  const libraryId = Number(candidate.libraryId ?? candidate.libraryID);
  if (key && Number.isSafeInteger(libraryId) && libraryId > 0) {
    return { libraryId, key };
  }

  const idValue =
    typeof value === "number" ||
    (typeof value === "string" && /^\d+$/.test(value.trim()))
      ? value
      : candidate.id;
  const id = Number(idValue);
  const zotero = resolveHostBridgeZotero();
  if (Number.isSafeInteger(id) && id > 0) {
    const collection = zotero.Collections?.get?.(id);
    if (!collection) refNotFound("collection");
    const collectionCandidate = collection as unknown as {
      key?: unknown;
      libraryID?: unknown;
      libraryId?: unknown;
    };
    const collectionKey = String(collectionCandidate.key || "").trim();
    const collectionLibraryId = Number(
      collectionCandidate.libraryID ?? collectionCandidate.libraryId,
    );
    if (
      collectionKey &&
      Number.isSafeInteger(collectionLibraryId) &&
      collectionLibraryId > 0
    ) {
      return { libraryId: collectionLibraryId, key: collectionKey };
    }
    invalidProjectionRef("collection", "invalid_shape");
  }

  if (key) {
    const defaultLibraryId = Number(zotero.Libraries.userLibraryID);
    if (!Number.isSafeInteger(defaultLibraryId) || defaultLibraryId <= 0) {
      invalidProjectionRef("collection", "invalid_library_id");
    }
    return { libraryId: defaultLibraryId, key };
  }
  invalidProjectionRef("collection", key ? "invalid_key" : "invalid_shape");
}

function itemRefFromInput(input: unknown): ZoteroHostItemRefInput {
  const object = asObject(input);
  if (Object.prototype.hasOwnProperty.call(object, "ref")) {
    return normalizeHostBridgeItemRef(object.ref);
  }
  return normalizeHostBridgeItemRef(input);
}

function libraryListArgsFromInput(input: unknown): ZoteroHostLibraryListArgs {
  const args = { ...asObject(input) } as ZoteroHostLibraryListArgs;
  if (args.collection !== undefined) {
    args.collection = normalizeHostBridgeCollectionRef(args.collection);
  }
  const limit = Number(args.limit);
  if (Number.isFinite(limit) && limit > 200) {
    args.limit = 200;
  }
  return args;
}

type BridgeAttachmentProjectionInput = Pick<
  ZoteroHostAttachmentDto,
  "key" | "libraryId" | "title" | "contentType" | "path" | "filename"
> & {
  errors?: ZoteroHostAttachmentDto["errors"];
  parent?: Pick<NonNullable<ZoteroHostAttachmentDto["parent"]>, "key">;
};

function toBridgeAttachmentDescriptor(
  attachment: BridgeAttachmentProjectionInput,
  file?: HostBridgeFileDescriptor,
) {
  const path = String(attachment.path || "").trim();
  const { path: _path, ...safeAttachment } = attachment;
  if (!path || attachment.errors?.length) {
    return {
      ...safeAttachment,
      access: {
        mode: "unavailable",
        file: null,
      },
    };
  }
  if (!file) {
    return {
      ...safeAttachment,
      access: {
        mode: "unavailable",
        file: null,
      },
    };
  }
  return {
    ...safeAttachment,
    access: {
      mode: "bridge-download",
      file,
    },
  };
}

function resolveCapabilityBroker(context: HostBridgeCapabilityContext) {
  const broker = context.resolveZoteroHostCapabilityBroker
    ? context.resolveZoteroHostCapabilityBroker()
    : resolveZoteroHostCapabilityBroker();
  if (!broker) {
    throw new ZoteroHostCapabilityError("unavailable", "Broker unavailable", {
      reason: "capability",
    });
  }
  return broker;
}

function bridgeCurrentView(context: HostBridgeCapabilityContext) {
  const broker = resolveCapabilityBroker(context);
  if (typeof broker.context?.getCurrentView !== "function") {
    throw new ZoteroHostCapabilityError(
      "unavailable",
      "Broker current-view capability is unavailable",
      { reason: "capability" },
    );
  }
  return broker.context.getCurrentView();
}

function bridgeSelectedItems(
  input: unknown,
  context: HostBridgeCapabilityContext,
) {
  const broker = resolveCapabilityBroker(context);
  if (typeof broker.context?.getSelectedItems !== "function") {
    throw new ZoteroHostCapabilityError(
      "unavailable",
      "Broker selected-items capability is unavailable",
      { reason: "capability" },
    );
  }
  return broker.context.getSelectedItems(
    readPageRequest(input),
    context.control,
  );
}

function bridgeLibraryItems(
  context: HostBridgeCapabilityContext,
  args: ZoteroHostLibraryListArgs,
) {
  const input: LibraryListItemsRequestDto = {
    ...readPageRequest(args),
    ...(args.libraryId === undefined
      ? {}
      : { libraryId: Number(args.libraryId) }),
    ...(args.tag === undefined ? {} : { tag: args.tag }),
    ...(args.itemType === undefined ? {} : { itemType: args.itemType }),
    ...(args.query === undefined ? {} : { query: args.query }),
  };
  if (args.collection !== undefined) {
    input.collectionRef = normalizeHostBridgeCollectionRef(args.collection);
  } else if (
    args.collectionKey !== undefined ||
    args.collectionId !== undefined
  ) {
    input.collectionRef = normalizeHostBridgeCollectionRef({
      key: args.collectionKey,
      id: args.collectionId,
      libraryId: args.collectionLibraryId ?? args.libraryId,
    });
  }
  return resolveCapabilityBroker(context)
    .library.listItems(input, context.control)
    .catch((error) => {
      throw mapBrokerLibraryCursorError(error);
    });
}

function mapBrokerLibraryCursorError(error: unknown): Error {
  if (
    error instanceof ZoteroHostCapabilityError &&
    error.code === "invalid_request" &&
    (error.details as { field?: unknown }).field === "cursor"
  ) {
    const reason = (error.details as { reason?: unknown }).reason;
    throw new ZoteroLibraryCursorError(error.message, {
      reason: typeof reason === "string" ? reason : "invalid_value",
    });
  }
  throw error;
}

function readPageRequest(input: unknown): SelectedItemsPageRequestDto {
  const object = asObject(input);
  return {
    ...(object.limit === undefined ? {} : { limit: Number(object.limit) }),
    ...(object.cursor === undefined ? {} : { cursor: String(object.cursor) }),
  };
}

async function toBridgeAttachmentDescriptors(
  attachments: BridgeAttachmentProjectionInput[],
  capability: "library.get_item_attachments" | "mutation.execute",
) {
  const registerable = attachments.filter(
    (attachment) =>
      String(attachment.path || "").trim() && !attachment.errors?.length,
  );
  const files = await registerHostBridgeFileHandlesInOrder(
    registerable.map((attachment) => ({
      localPath: String(attachment.path).trim(),
      sourceKind: "zotero-attachment" as const,
      displayName: attachment.filename || attachment.title,
      contentType: attachment.contentType,
      owner: {
        capability,
        itemKey: attachment.parent?.key || attachment.key,
        libraryId: attachment.libraryId,
      },
    })),
  );
  let fileIndex = 0;
  return attachments.map((attachment) => {
    const canRegister =
      String(attachment.path || "").trim() && !attachment.errors?.length;
    return toBridgeAttachmentDescriptor(
      attachment,
      canRegister ? files[fileIndex++] : undefined,
    );
  });
}

async function toBridgeAttachmentDescriptorsWithContext(
  input: unknown,
  context: HostBridgeCapabilityContext,
) {
  const ref = itemRefFromInput(input);
  const page = await resolveCapabilityBroker(
    context,
  ).library.getItemAttachments(ref, readPageRequest(input), context.control);
  return {
    ...page,
    attachments: await toBridgeCanonicalAttachmentDescriptors(page.attachments),
  };
}

async function toBridgeCanonicalAttachmentDescriptors(
  attachments: AttachmentDetailDto[],
) {
  const projected = await toBridgeAttachmentDescriptors(
    attachments.map((attachment) => ({
      key: attachment.ref.key,
      libraryId: attachment.ref.libraryId,
      title: attachment.title,
      ...(attachment.parentRef
        ? { parent: { key: attachment.parentRef.key } }
        : {}),
      filename: attachment.filename || "",
      contentType: attachment.contentType || "",
      path: attachment.file.state === "available" ? attachment.file.path : "",
    })),
    "library.get_item_attachments",
  );
  return attachments.map((attachment, index) => {
    const { file, ...metadata } = attachment;
    return {
      ...metadata,
      file:
        file.state === "available"
          ? {
              state: file.state,
              sizeBytes: file.sizeBytes,
              modifiedAt: file.modifiedAt,
            }
          : file,
      access: projected[index].access,
    };
  });
}

async function executeMutationWithBridgeProjection(
  input: unknown,
  context: HostBridgeCapabilityContext,
) {
  const response = await resolveCapabilityBroker(
    context,
  ).legacyMutations.execute(normalizeHostBridgeMutationRequest(input));
  if (!response.ok || !response.result.attachments?.length) {
    return response;
  }
  return {
    ...response,
    result: {
      ...response.result,
      attachments: await toBridgeAttachmentDescriptors(
        response.result.attachments,
        "mutation.execute",
      ),
    },
  };
}

export function normalizeHostBridgeMutationRequest(
  input: unknown,
): ZoteroHostMutationRequest {
  const request = asObject(input);
  const itemRefFields = ["target", "item", "parent", "note"] as const;
  const itemRefArrayFields = ["targets", "items"] as const;
  const normalized: Record<string, unknown> = { ...request };
  for (const field of itemRefFields) {
    if (request[field] !== undefined) {
      normalized[field] = normalizeHostBridgeItemRef(
        request[field],
        field === "note" ? "note" : "item",
      );
    }
  }
  for (const field of itemRefArrayFields) {
    const entries = request[field];
    if (entries !== undefined) {
      if (!Array.isArray(entries)) {
        invalidProjectionRef("item", "invalid_shape");
      }
      normalized[field] = entries.map((entry) =>
        normalizeHostBridgeItemRef(entry),
      );
    }
  }
  if (request.collection !== undefined) {
    normalized.collection = normalizeHostBridgeCollectionRef(
      request.collection,
    );
  }
  return normalized as ZoteroHostMutationRequest;
}

function capability(
  name: string,
  handler: HostBridgeCapabilityHandler,
): HostBridgeCapabilityDefinition {
  const contract = getHostBridgeCapabilityContract(name);
  if (!contract) {
    throw new Error(`Missing executable Host Bridge contract for ${name}`);
  }
  const approval = getHostBridgeApprovalRequirement(name);
  return {
    name,
    category: contract.category,
    summary: contract.summary,
    approval,
    requestEffect: contract.effect,
    inputSchema: contract.inputSchema,
    outputSchema: contract.outputSchema,
    exposure: contract.exposure,
    handler: async (rawInput, context) =>
      (await handler(rawInput, context)) ?? null,
  };
}

function assertDebugModeEnabled() {
  if (!isDebugModeEnabled()) {
    throw new Error("Host Bridge debug capabilities are disabled");
  }
}

function debugCapability(
  name: string,
  handler: HostBridgeCapabilityHandler,
): HostBridgeCapabilityDefinition {
  return capability(name, async (input, context) => {
    assertDebugModeEnabled();
    return handler(input, context);
  });
}

function debugLimit(input: Record<string, unknown>, fallback = 25) {
  return Math.max(
    1,
    Math.min(
      100,
      Math.floor(Number(input.limit ?? input.maxRows ?? fallback) || fallback),
    ),
  );
}

function debugEnvelope(
  schema: string,
  input: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  return {
    schema,
    debugMode: true,
    generatedAt: new Date().toISOString(),
    truncated: Boolean(payload.truncated),
    limits: {
      limit: debugLimit(input),
      includeLocalPaths: input.includeLocalPaths === true,
      includeRawRows: input.includeRawRows === true,
    },
    diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics : [],
    ...payload,
  };
}

function normalizedWorkflowProductId(value: unknown) {
  return String(value || "").trim();
}

function assertHostWorkflowProductStorageReady() {
  try {
    assertWorkflowProductStorageReady();
  } catch {
    throw new HostBridgeWorkflowProductError(
      "workflow_product_store_migration_incomplete",
      "Workflow Product storage migration is incomplete",
    );
  }
}

function publicWorkflowProductAsset(asset: WorkflowProductAsset) {
  return {
    assetId: asset.assetId,
    label: asset.label,
    relativePath: asset.relativePath,
    contentType: asset.contentType,
    availability: asset.availability,
    size: asset.size,
    sha256: asset.sha256,
    diagnostics: asset.diagnostics,
  };
}

function publicWorkflowProduct(product: WorkflowProductRecord) {
  return {
    productId: product.productId,
    productKey: product.productKey,
    kind: product.kind,
    title: product.title,
    workflowId: product.workflowId,
    workflowLabel: product.workflowLabel,
    backendId: product.backendId,
    backendType: product.backendType,
    runKey: product.runKey,
    requestId: product.requestId,
    runId: product.runId,
    assets: product.assets.map(publicWorkflowProductAsset),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function isNormalWorkflowProduct(
  product: WorkflowProductRecord | null,
): product is WorkflowProductRecord {
  return !!product && product.kind !== WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK;
}

function workflowProductPageInput(input: unknown) {
  const object = asObject(input);
  return {
    workflowId: normalizedWorkflowProductId(object.workflowId),
    backendId: normalizedWorkflowProductId(object.backendId),
    requestId: normalizedWorkflowProductId(object.requestId),
    cursor: object.cursor,
    limit: object.limit,
  };
}

function selectWorkflowProducts(input: unknown) {
  assertHostWorkflowProductStorageReady();
  const filters = workflowProductPageInput(input);
  const matches = listWorkflowProducts().filter((product) => {
    if (!isNormalWorkflowProduct(product)) return false;
    return (
      (!filters.workflowId || product.workflowId === filters.workflowId) &&
      (!filters.backendId || product.backendId === filters.backendId) &&
      (!filters.requestId || product.requestId === filters.requestId)
    );
  });
  return paginateCapabilityRows({
    scope: "product list",
    section: "products",
    input: asObject(input),
    rows: matches.map(publicWorkflowProduct),
  });
}

function workflowProductOrThrow(productId: unknown) {
  assertHostWorkflowProductStorageReady();
  const product = getWorkflowProduct(normalizedWorkflowProductId(productId));
  if (!isNormalWorkflowProduct(product)) {
    throw new HostBridgeWorkflowProductError(
      "workflow_product_not_found",
      "Workflow product was not found",
    );
  }
  return product;
}

async function managedWorkflowProductAssetOrThrow(
  productId: unknown,
  selector: { assetId?: unknown; relativePath?: unknown },
) {
  const product = workflowProductOrThrow(productId);
  const assetId = normalizedWorkflowProductId(selector.assetId);
  const relativePath = normalizedWorkflowProductId(selector.relativePath);
  if (Boolean(assetId) === Boolean(relativePath)) {
    throw new HostBridgeWorkflowProductError(
      "workflow_product_asset_not_found",
      "Exactly one workflow product asset selector is required",
    );
  }
  const resolved = assetId
    ? await resolveManagedWorkflowProductAsset(product.productId, assetId)
    : await resolveManagedWorkflowProductAssetByRelativePath(
        product.productId,
        relativePath,
      );
  if (!resolved) {
    throw new HostBridgeWorkflowProductError(
      "workflow_product_asset_not_found",
      "Workflow product asset was not found",
    );
  }
  return resolved;
}

function safeWorkflowProductExportPath(relativePath: string) {
  const value = String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const parts = value.split("/").filter((part) => part && part !== ".");
  if (!parts.length || parts.some((part) => part === "..")) {
    throw new HostBridgeWorkflowProductError(
      "workflow_product_asset_not_found",
      "Workflow product asset path is unsafe",
    );
  }
  return parts.join("/");
}

async function exportWorkflowProduct(
  input: unknown,
  context: HostBridgeCapabilityContext,
) {
  const object = asObject(input);
  const product = workflowProductOrThrow(object.productId);
  const requestedAssetId = normalizedWorkflowProductId(object.assetId);
  const assets = requestedAssetId
    ? product.assets.filter((asset) => asset.assetId === requestedAssetId)
    : product.assets.filter((asset) => asset.availability === "available");
  if (!assets.length) {
    throw new HostBridgeWorkflowProductError(
      "workflow_product_asset_not_found",
      "Workflow product asset was not found",
    );
  }
  const resolved = await Promise.all(
    assets.map((asset) =>
      managedWorkflowProductAssetOrThrow(product.productId, {
        assetId: asset.assetId,
      }),
    ),
  );
  if (context.connectionMode !== "remote") {
    const outputDir = normalizedWorkflowProductId(object.outputDir);
    if (!outputDir) {
      throw new Error(
        "workflow_products.export requires outputDir for local callers",
      );
    }
    let exported;
    try {
      exported = await exportWorkflowProductToDirectory({
        productId: product.productId,
        outputDir,
        assetId: requestedAssetId || undefined,
        overwrite: object.overwrite === true,
      });
    } catch (error) {
      const code = isPlainObject(error) ? String(error.code || "") : "";
      if (
        code === "workflow_product_export_path_too_long" ||
        code === "workflow_product_export_failed"
      ) {
        throw new HostBridgeWorkflowProductError(
          code,
          error instanceof Error
            ? error.message
            : "Workflow Product export failed",
        );
      }
      throw error;
    }
    return {
      product: publicWorkflowProduct(product),
      delivery: { mode: "local", files: exported.files },
    };
  }
  const exportRoot = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "host-bridge-exports",
    "workflow-products",
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const zipName = `workflow-product-${product.productId.replace(/[^A-Za-z0-9._-]+/g, "-")}.zip`;
  const zipPath = joinPath(exportRoot, zipName);
  const entries = await Promise.all(
    resolved.map(async (entry) => ({
      name: safeWorkflowProductExportPath(entry.asset.relativePath),
      bytes: await readRuntimeBytes(entry.localPath),
    })),
  );
  const zipBytes = createStoreZipBytes(entries);
  await writeRuntimeBytes(zipPath, zipBytes);
  const file = await registerHostBridgeFileHandle({
    localPath: zipPath,
    sourceKind: "bridge-export",
    displayName: zipName,
    contentType: "application/zip",
    size: zipBytes.byteLength,
    owner: {
      capability: "workflow_products.export",
      requestId: product.requestId,
    },
  });
  return {
    product: publicWorkflowProduct(product),
    delivery: {
      mode: "bridge-download",
      bundle: file,
      downloadCommand: `zotero-bridge file download ${file.fileId} --output ${zipName}`,
      unpackHint: `unzip ${zipName} -d .`,
    },
  };
}

async function registerBoundedOutputFile(args: {
  capability: string;
  displayName: string;
  contentType: string;
  content: string;
  owner?: { requestId?: string; itemKey?: string; libraryId?: number };
}) {
  const exportRoot = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "host-bridge-exports",
    "bounded-output",
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const localPath = joinPath(exportRoot, args.displayName);
  const bytes = new TextEncoder().encode(args.content);
  await writeRuntimeBytes(localPath, bytes);
  return registerHostBridgeFileHandle({
    localPath,
    sourceKind: "bridge-export",
    displayName: args.displayName,
    contentType: args.contentType,
    size: bytes.byteLength,
    owner: {
      capability: args.capability,
      ...(args.owner || {}),
    },
  });
}

function synthesisTextChunk(
  result: unknown,
  field: "markdown" | "digest_markdown",
  input: Record<string, unknown>,
) {
  const object = asObject(result);
  const chunk = chunkHostBridgeText(object[field], {
    offset: input.offset,
    maxChars: input.maxChars ?? input.max_chars,
  });
  return {
    ...object,
    [field]: chunk.text,
    offset: chunk.offset,
    nextOffset: chunk.nextOffset,
    totalChars: chunk.totalChars,
    hasMore: chunk.hasMore,
    truncated: chunk.truncated,
    maxChars: chunk.maxChars,
  };
}

function normalizeSynthesisPageResult(
  result: unknown,
  sourceSection: string,
  targetSection = sourceSection,
) {
  const object = asObject(result);
  const rows = Array.isArray(object[sourceSection])
    ? object[sourceSection]
    : [];
  const normalized = { ...object };
  if (targetSection !== sourceSection) {
    delete normalized[sourceSection];
  }
  delete normalized.next_cursor;
  delete normalized.has_more;
  normalized[targetSection] = rows;
  normalized.nextCursor = String(object.nextCursor ?? object.next_cursor ?? "");
  normalized.hasMore = Boolean(object.hasMore ?? object.has_more);
  const returned = Math.max(
    0,
    Math.floor(Number(object.returned) || rows.length),
  );
  normalized.returned = returned;
  normalized.total = Math.max(
    returned,
    Math.floor(Number(object.total ?? object.total_papers) || rows.length),
  );
  normalized.limit = Math.max(
    1,
    Math.min(100, Math.floor(Number(object.limit) || 25)),
  );
  return normalized;
}

const SYNTHESIS_CURSOR_CAPABILITIES = new Set([
  "topics.list",
  "citation_graph.get_metrics",
  "citation_graph.rank_external_references",
  "citation_graph.rank_library_papers",
  "reference_index.get",
  "resolvers.resolve",
]);

function normalizeSynthesisCapabilityInput(
  capabilityName: string,
  input: Record<string, unknown>,
) {
  if (!SYNTHESIS_CURSOR_CAPABILITIES.has(capabilityName)) {
    return input;
  }
  const requestedLimit = Math.floor(Number(input.limit) || 25);
  return {
    ...input,
    limit: Math.max(1, Math.min(100, requestedLimit)),
  };
}

async function applySynthesisOutputBoundary(
  capabilityName: string,
  input: Record<string, unknown>,
  result: unknown,
) {
  if (capabilityName === "paper_artifacts.get_manifest") {
    const object = asObject(result);
    const papers = Array.isArray(object.papers)
      ? object.papers
      : Array.isArray(object.artifacts)
        ? object.artifacts
        : [];
    const boundedResult = { ...object };
    delete boundedResult.artifacts;
    return paginateCapabilityRows({
      scope: "synthesis artifact manifest",
      section: "papers",
      input,
      rows: papers,
      result: boundedResult,
    });
  }
  if (capabilityName === "topics.list") {
    return normalizeSynthesisPageResult(result, "topics");
  }
  if (capabilityName === "citation_graph.get_metrics") {
    return normalizeSynthesisPageResult(result, "items", "metrics");
  }
  if (capabilityName === "citation_graph.rank_external_references") {
    return normalizeSynthesisPageResult(result, "items", "references");
  }
  if (capabilityName === "citation_graph.rank_library_papers") {
    return normalizeSynthesisPageResult(result, "items", "papers");
  }
  if (capabilityName === "reference_index.get") {
    return normalizeSynthesisPageResult(result, "rows", "entries");
  }
  if (capabilityName === "resolvers.resolve") {
    return normalizeSynthesisPageResult(result, "papers", "candidates");
  }
  if (capabilityName === "topics.get_report") {
    return synthesisTextChunk(result, "markdown", input);
  }
  if (capabilityName === "paper_artifacts.resolve_topic_digest") {
    return synthesisTextChunk(result, "digest_markdown", input);
  }
  if (capabilityName === "topics.get_planning_context") {
    const object = asObject(result);
    const library = asObject(object.library);
    const graph = asObject(object.topic_graph);
    const papers = Array.isArray(library.papers) ? library.papers : [];
    const topics = Array.isArray(object.topics) ? object.topics : [];
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const previewLimit = Math.max(
      1,
      Math.min(5000, Math.floor(Number(input.limit) || 100)),
    );
    const displayName = "synthesis-topic-planning-context.json";
    const file = await registerBoundedOutputFile({
      capability: capabilityName,
      displayName,
      contentType: "application/json",
      content: `${JSON.stringify(result, null, 2)}\n`,
    });
    return {
      summary: {
        totalPapers: Math.max(
          papers.length,
          Math.floor(Number(library.total_papers) || 0),
        ),
        totalTopics: topics.length,
        graphNodes: nodes.length,
        graphEdges: edges.length,
        paperRefs: papers.slice(0, previewLimit).map((entry) => {
          const paper = asObject(entry);
          return paper.paper_ref || paper.paperRef || paper.key;
        }),
        previewTruncated: papers.length > previewLimit,
      },
      diagnostics: asObject(object.diagnostics),
      delivery: {
        mode: "bridge-download",
        bundle: file,
        downloadCommand: `zotero-bridge file download ${file.fileId} --output ${displayName}`,
      },
    };
  }
  if (capabilityName === "topics.get_review_input") {
    const object = asObject(result);
    const topic = asObject(object.topic);
    const registryRows = asObject(object.registry_artifact_coverage).rows;
    const file = await registerBoundedOutputFile({
      capability: capabilityName,
      displayName: `synthesis-review-input-${String(topic.topic_id || input.topicId || input.topic_id || "topic")}.json`,
      contentType: "application/json",
      content: `${JSON.stringify(result, null, 2)}\n`,
    });
    return {
      topic: {
        topic_id: topic.topic_id || input.topicId || input.topic_id,
        title: topic.title,
      },
      summary: {
        registryRows: Array.isArray(registryRows) ? registryRows.length : 0,
        graphNodes: Array.isArray(asObject(object.citation_graph_slice).nodes)
          ? (asObject(object.citation_graph_slice).nodes as unknown[]).length
          : 0,
        graphEdges: Array.isArray(asObject(object.citation_graph_slice).edges)
          ? (asObject(object.citation_graph_slice).edges as unknown[]).length
          : 0,
      },
      diagnostics: object.diagnostics || {},
      delivery: { mode: "bridge-download", file },
    };
  }
  if (capabilityName === "paper_artifacts.read") {
    const paperRefs = [
      ...(Array.isArray(input.paper_refs) ? input.paper_refs : []),
      ...(Array.isArray(input.paperRefs) ? input.paperRefs : []),
      input.paper_ref,
      input.paperRef,
    ]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (!paperRefs.length) {
      const error = new Error(
        "paper_artifacts.read requires paper_ref or paper_refs",
      );
      (error as { code?: string }).code = "invalid_capability_input";
      throw error;
    }
    const object = asObject(result);
    const artifacts = Array.isArray(object.artifacts) ? object.artifacts : [];
    const file = await registerBoundedOutputFile({
      capability: capabilityName,
      displayName: `synthesis-paper-artifacts-${Date.now()}.json`,
      contentType: "application/json",
      content: `${JSON.stringify(result, null, 2)}\n`,
    });
    return {
      paperRefs: Array.from(new Set(paperRefs)),
      manifest: artifacts.map((entry) => {
        const artifact = asObject(entry);
        return {
          paper_ref: artifact.paper_ref,
          artifact_type: artifact.artifact_type,
          payload_type: artifact.payload_type,
          note_key: artifact.note_key,
          status: artifact.status,
          hash: artifact.hash,
        };
      }),
      diagnostics: Array.isArray(object.diagnostics) ? object.diagnostics : [],
      summary: { artifacts: artifacts.length },
      delivery: { mode: "bridge-download", file },
    };
  }
  return result;
}

const DEBUG_ZOTERO_EVAL_SCHEMA = "host_bridge.debug.zotero.eval.v1";
const DEBUG_ZOTERO_EVAL_DEFAULT_TIMEOUT_MS = 5000;
const DEBUG_ZOTERO_EVAL_MAX_TIMEOUT_MS = 30000;
const DEBUG_ZOTERO_EVAL_DEFAULT_MAX_DEPTH = 4;
const DEBUG_ZOTERO_EVAL_MAX_DEPTH = 8;
const DEBUG_ZOTERO_EVAL_DEFAULT_MAX_ITEMS = 50;
const DEBUG_ZOTERO_EVAL_MAX_ITEMS = 500;
const DEBUG_ZOTERO_EVAL_DEFAULT_MAX_CHARS = 20000;
const DEBUG_ZOTERO_EVAL_MAX_CHARS = 200000;
const DEBUG_ZOTERO_EVAL_STRING_LIMIT = 4000;

function clampDebugInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function debugZoteroEvalResultType(value: unknown) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (value instanceof Error) {
    return "error";
  }
  return typeof value;
}

function truncateDebugString(
  value: string,
  maxChars: number,
  truncated: { value: boolean },
) {
  if (value.length <= maxChars) {
    return value;
  }
  truncated.value = true;
  return `${value.slice(0, Math.max(0, maxChars))}...[truncated]`;
}

function safeDebugEvalValue(
  value: unknown,
  options: {
    depth: number;
    maxDepth: number;
    maxItems: number;
    maxStringChars: number;
    seen: WeakSet<object>;
    truncated: { value: boolean };
  },
): unknown {
  if (value === undefined) {
    return "[Undefined]";
  }
  if (typeof value === "bigint") {
    return `${value.toString()}n`;
  }
  if (typeof value === "symbol") {
    return value.toString();
  }
  if (typeof value === "function") {
    return `[Function${value.name ? `: ${value.name}` : ""}]`;
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (typeof value === "string") {
    return truncateDebugString(
      value,
      options.maxStringChars,
      options.truncated,
    );
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    const errorResult: Record<string, unknown> = {
      name: value.name,
      message: truncateDebugString(
        value.message,
        options.maxStringChars,
        options.truncated,
      ),
    };
    if (value.stack) {
      errorResult.stack = truncateDebugString(
        value.stack,
        options.maxStringChars,
        options.truncated,
      );
    }
    return errorResult;
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if (options.seen.has(value)) {
    options.truncated.value = true;
    return "[Circular]";
  }
  if (options.depth >= options.maxDepth) {
    options.truncated.value = true;
    return "[MaxDepth]";
  }
  options.seen.add(value);
  if (Array.isArray(value)) {
    const items = value.slice(0, options.maxItems).map((entry) =>
      safeDebugEvalValue(entry, {
        ...options,
        depth: options.depth + 1,
      }),
    );
    if (value.length > options.maxItems) {
      options.truncated.value = true;
      items.push(`[${value.length - options.maxItems} more item(s)]`);
    }
    return items;
  }
  const output: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, options.maxItems);
  for (const [key, entry] of entries) {
    output[key] = safeDebugEvalValue(entry, {
      ...options,
      depth: options.depth + 1,
    });
  }
  const totalEntries = Object.keys(value).length;
  if (totalEntries > options.maxItems) {
    options.truncated.value = true;
    output.__truncatedKeys = totalEntries - options.maxItems;
  }
  return output;
}

function enforceDebugEvalJsonLimit(
  value: unknown,
  maxChars: number,
  truncated: { value: boolean },
) {
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length <= maxChars) {
    return value;
  }
  truncated.value = true;
  return {
    summary: truncateDebugString(serialized, maxChars, truncated),
  };
}

function timeoutPromise(timeoutMs: number) {
  return new Promise<never>((_resolve, reject) => {
    setTimeout(
      () =>
        reject(new Error(`debug.zotero.eval timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
}

async function debugZoteroEval(rawInput: unknown) {
  const input = asObject(rawInput);
  const code = String(input.code || "").trim();
  if (!code) {
    throw new Error("debug.zotero.eval requires non-empty code");
  }
  const timeoutMs = clampDebugInteger(
    input.timeoutMs,
    DEBUG_ZOTERO_EVAL_DEFAULT_TIMEOUT_MS,
    1,
    DEBUG_ZOTERO_EVAL_MAX_TIMEOUT_MS,
  );
  const maxDepth = clampDebugInteger(
    input.maxDepth,
    DEBUG_ZOTERO_EVAL_DEFAULT_MAX_DEPTH,
    1,
    DEBUG_ZOTERO_EVAL_MAX_DEPTH,
  );
  const maxItems = clampDebugInteger(
    input.maxItems,
    DEBUG_ZOTERO_EVAL_DEFAULT_MAX_ITEMS,
    1,
    DEBUG_ZOTERO_EVAL_MAX_ITEMS,
  );
  const maxChars = clampDebugInteger(
    input.maxChars,
    DEBUG_ZOTERO_EVAL_DEFAULT_MAX_CHARS,
    100,
    DEBUG_ZOTERO_EVAL_MAX_CHARS,
  );
  const startedAt =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const evaluator = new Function(
    "Zotero",
    "window",
    "globalThis",
    "input",
    `"use strict"; return (async () => {\n${code}\n})();`,
  ) as (
    zotero: unknown,
    win: unknown,
    global: typeof globalThis,
    input: unknown,
  ) => Promise<unknown>;
  const result = await Promise.race([
    evaluator(
      (globalThis as { Zotero?: unknown }).Zotero,
      (globalThis as { window?: unknown }).window,
      globalThis,
      input.input,
    ),
    timeoutPromise(timeoutMs),
  ]);
  const endedAt =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const truncated = { value: false };
  const safeResult = safeDebugEvalValue(result, {
    depth: 0,
    maxDepth,
    maxItems,
    maxStringChars: Math.min(DEBUG_ZOTERO_EVAL_STRING_LIMIT, maxChars),
    seen: new WeakSet<object>(),
    truncated,
  });
  return {
    schema: DEBUG_ZOTERO_EVAL_SCHEMA,
    debugMode: true,
    generatedAt: new Date().toISOString(),
    elapsedMs: Math.max(0, Math.round(endedAt - startedAt)),
    result: enforceDebugEvalJsonLimit(safeResult, maxChars, truncated),
    resultType: debugZoteroEvalResultType(result),
    truncated: truncated.value,
  };
}

function redactLocalPaths(value: unknown, includeLocalPaths: boolean): unknown {
  if (includeLocalPaths) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactLocalPaths(entry, includeLocalPaths));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key.toLowerCase().includes("path") || key === "root") {
      output[key] = entry ? "[redacted-path]" : entry;
      continue;
    }
    output[key] = redactLocalPaths(entry, includeLocalPaths);
  }
  return output;
}

function summarizeRun(run: Record<string, unknown>) {
  return {
    requestId: run.requestId,
    runId: run.runId,
    workflowId: run.workflowId,
    backendId: run.backendId,
    status: run.status,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    error: run.error,
  };
}

async function debugStatus(
  input: unknown,
  context: HostBridgeCapabilityContext,
) {
  const object = asObject(input);
  const [taskRuntime, acpSkillRunStore] = await Promise.all([
    import("./taskRuntime"),
    import("./acpSkillRunStore"),
  ]);
  const { listActiveWorkflowTaskSummaries, listWorkflowTasks } = taskRuntime;
  const { listAcpSkillRunSummaries } = acpSkillRunStore;
  const tasks = listWorkflowTasks();
  const activeTasks = listActiveWorkflowTaskSummaries();
  const runs = listAcpSkillRunSummaries();
  return debugEnvelope("host_bridge.debug.status.v1", object, {
    hostBridge: context.getStatus(),
    capabilityCounts: {
      total: listHostBridgeCapabilities().length,
      debug: listHostBridgeCapabilities().filter((entry) =>
        entry.name.startsWith("debug."),
      ).length,
    },
    runtimePersistence: redactLocalPaths(
      getRuntimePersistencePaths(),
      object.includeLocalPaths === true,
    ),
    tasks: {
      total: tasks.length,
      active: activeTasks.length,
      recent: tasks.slice(0, debugLimit(object)),
    },
    acpSkillRuns: {
      total: runs.length,
      active: runs.filter(
        (run) =>
          run.status !== "succeeded" &&
          run.status !== "failed" &&
          run.status !== "canceled",
      ).length,
      recent: runs.slice(0, debugLimit(object)).map(summarizeRun),
    },
    truncated:
      tasks.length > debugLimit(object) || runs.length > debugLimit(object),
  });
}

async function debugPersistenceSnapshot(input: unknown) {
  const object = asObject(input);
  const [usage, integrity] = await Promise.all([
    scanRuntimePersistenceUsage(),
    scanPersistenceIntegrity(),
  ]);
  return debugEnvelope("host_bridge.debug.persistence.snapshot.v1", object, {
    usage: redactLocalPaths(usage, object.includeLocalPaths === true),
    integrity: redactLocalPaths(integrity, object.includeLocalPaths === true),
    truncated: false,
  });
}

async function debugTasksSnapshot(input: unknown) {
  const object = asObject(input);
  const limit = debugLimit(object);
  const [taskRuntime, acpSkillRunStore] = await Promise.all([
    import("./taskRuntime"),
    import("./acpSkillRunStore"),
  ]);
  const { listActiveWorkflowTaskSummaries, listWorkflowTasks } = taskRuntime;
  const { listAcpSkillRunSummaries } = acpSkillRunStore;
  const tasks = listWorkflowTasks();
  const activeTasks = listActiveWorkflowTaskSummaries({ limit });
  const runs = listAcpSkillRunSummaries({ limit });
  return debugEnvelope("host_bridge.debug.tasks.snapshot.v1", object, {
    tasks: tasks.slice(0, limit),
    activeTasks: activeTasks.slice(0, limit),
    acpSkillRuns: runs.slice(0, limit).map(summarizeRun),
    totals: {
      tasks: tasks.length,
      activeTasks: activeTasks.length,
      acpSkillRuns: runs.length,
    },
    truncated:
      tasks.length > limit || activeTasks.length > limit || runs.length > limit,
  });
}

async function debugSkillRunnerConnectionsSnapshot(input: unknown) {
  if (
    typeof __debug_mode__ === "undefined" ||
    (__debug_mode__ && __skillrunner_connection_audit_enabled__)
  ) {
    const object = asObject(input);
    const { getSkillRunnerConnectionGovernorSnapshot } =
      await import("./skillRunnerConnectionAudit");
    return debugEnvelope(
      "host_bridge.debug.skillrunner.connections.snapshot.v1",
      object,
      {
        skillRunnerConnections: getSkillRunnerConnectionGovernorSnapshot(),
        truncated: false,
      },
    );
  }
  throw new Error("SkillRunner connection audit is unavailable");
}

type SynthesisClientCapabilityMethod =
  | "listTopics"
  | "findTopicsByPaperRef"
  | "getTopicContext"
  | "getTopicPlanningContext"
  | "getTopicReport"
  | "getSchemas"
  | "queryConceptKb"
  | "queryCitationGraphCluster"
  | "getLibraryIndex"
  | "resolveResolver"
  | "getReferenceSidecarIndex"
  | "startReferenceSidecarRefresh"
  | "getPublicMaintenanceOperation"
  | "queryCitationGraph"
  | "getCitationGraphSlice"
  | "getCitationGraphLayout"
  | "getCitationGraphMetrics"
  | "rankExternalReferences"
  | "rankLibraryPapers"
  | "refreshCitationGraphMetricsNow"
  | "startCitationGraphUpdate"
  | "getPaperArtifactManifest"
  | "readPaperArtifacts"
  | "exportFilteredPaperArtifacts"
  | "resolveTopicPaperDigest"
  | "getReviewInput"
  | "getAttentionQueue";

function topicReportRequest(
  input: SynthesisJsonObject,
): SynthesisTopicReportRequest {
  return {
    topicId: String(input.topicId || input.topic_id || "").trim(),
  };
}

function paperArtifactsRequest(
  input: SynthesisJsonObject,
): SynthesisPaperArtifactsRequest {
  const refs = [
    ...(Array.isArray(input.paper_refs) ? input.paper_refs : []),
    ...(Array.isArray(input.paperRefs) ? input.paperRefs : []),
    input.paper_ref,
    input.paperRef,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const artifactTypes = [
    ...(Array.isArray(input.artifact_types) ? input.artifact_types : []),
    ...(Array.isArray(input.artifactTypes) ? input.artifactTypes : []),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return {
    paper_refs: Array.from(new Set(refs)),
    ...(artifactTypes.length
      ? { artifact_types: Array.from(new Set(artifactTypes)) }
      : {}),
  };
}

function invokeSynthesisClientCapability(
  client: SynthesisClient,
  methodName: SynthesisClientCapabilityMethod,
  input: SynthesisJsonObject,
  delivery: SynthesisDeliveryContext,
) {
  switch (methodName) {
    case "listTopics":
      return client.topics.list(rebuildSynthesisTopicListRequest(input));
    case "findTopicsByPaperRef":
      return client.topics.findByPaperRef(
        rebuildSynthesisTopicFindRequest(input),
      );
    case "getTopicContext":
      return client.topics.getContext(
        rebuildSynthesisTopicContextRequest(input),
        delivery,
      );
    case "getTopicPlanningContext":
      return client.topics.getPlanningContext();
    case "getTopicReport":
      return client.topics.getTopicReport(topicReportRequest(input));
    case "getSchemas":
      return client.maintenance.getSchemas();
    case "queryConceptKb":
      return client.concepts.query(input);
    case "queryCitationGraphCluster":
      return client.graph.queryCluster(input);
    case "getLibraryIndex":
      return client.libraryIndex.getPage(input);
    case "resolveResolver":
      return client.topics.resolveResolver(
        rebuildSynthesisTopicResolverRequest(input),
      );
    case "getReferenceSidecarIndex":
      return client.references.getSidecarIndex(input);
    case "startReferenceSidecarRefresh":
      return client.references.startRefresh(input);
    case "getPublicMaintenanceOperation":
      return client.maintenance.getOperation(
        input as unknown as
          | { operation_id: string; operationId?: never }
          | { operationId: string; operation_id?: never },
      );
    case "queryCitationGraph":
      return client.graph.getOverview(input);
    case "getCitationGraphSlice":
      return client.graph.getSlice(input);
    case "getCitationGraphLayout":
      return client.graph.getPersistedLayout(input);
    case "getCitationGraphMetrics":
      return client.graph.getMetrics(input);
    case "rankExternalReferences":
      return client.references.rankExternalReferences(input);
    case "rankLibraryPapers":
      return client.graph.rankLibraryPapers(input);
    case "refreshCitationGraphMetricsNow":
      return client.graph.refreshMetricsNow(input);
    case "startCitationGraphUpdate":
      return client.graph.startUpdate(input);
    case "getPaperArtifactManifest":
      return client.artifacts.getManifest(input);
    case "readPaperArtifacts":
      return client.artifacts.readPaperArtifacts(paperArtifactsRequest(input));
    case "exportFilteredPaperArtifacts":
      return client.artifacts.exportFiltered(input, delivery);
    case "resolveTopicPaperDigest":
      return client.artifacts.resolveTopicPaperDigest(
        rebuildSynthesisWorkbenchPaperDigestReadRequest(input),
      );
    case "getReviewInput":
      return client.workflowReview.getInput(
        rebuildSynthesisWorkflowReviewRequest(input),
      );
    case "getAttentionQueue":
      return client.references.getAttentionQueue(input);
  }
}

function synthesisCapability(
  name: string,
  methodName: SynthesisClientCapabilityMethod,
): HostBridgeCapabilityDefinition {
  return capability(name, async (input, context) => {
    const client = await (context.resolveSynthesisClient?.() ||
      getDefaultSynthesisClient());
    const normalizedInput = normalizeSynthesisCapabilityInput(
      name,
      asObject(input),
    ) as SynthesisJsonObject;
    const result = await invokeSynthesisClientCapability(
      client,
      methodName,
      normalizedInput,
      { mode: context.connectionMode },
    );
    return applySynthesisOutputBoundary(name, normalizedInput, result);
  });
}

async function resolveDirectResearchBundleApplication(
  context: HostBridgeCapabilityContext,
) {
  const injected = context.resolveDirectResearchBundleApplication?.();
  if (injected) return injected;
  const [client, broker] = await Promise.all([
    context.resolveSynthesisClient?.() || getDefaultSynthesisClient(),
    resolveCapabilityBroker(context),
  ]);
  return createDirectResearchBundleApplication({
    client,
    host: {
      async resolveItems(selectors) {
        const papers = [];
        for (const selector of selectors) {
          const detail = await broker.library.getItemDetail(
            normalizeHostBridgeItemRef(selector),
            context.control,
          );
          if (detail.kind !== "regular") {
            throw new ZoteroHostCapabilityError(
              "invalid_ref",
              "Expected a regular item",
              {
                kind: "item",
                reason: "wrong_kind",
              },
            );
          }
          const item = detail.item;
          const attachments: AttachmentDetailDto[] = [];
          let cursor: string | undefined;
          do {
            const page = await broker.library.getItemAttachments(
              item.ref,
              { limit: 100, ...(cursor ? { cursor } : {}) },
              context.control,
            );
            attachments.push(...page.attachments);
            cursor = page.hasMore ? (page.nextCursor ?? undefined) : undefined;
          } while (cursor);
          papers.push({
            paperRef: `${item.ref.libraryId}:${item.ref.key}`,
            libraryId: item.ref.libraryId,
            itemKey: item.ref.key,
            title: item.title,
            metadata: item,
            attachments: attachments.flatMap((attachment) =>
              attachment.file.state === "available"
                ? [
                    {
                      path: attachment.file.path,
                      filename: attachment.filename || "",
                      contentType: attachment.contentType || "",
                    },
                  ]
                : [],
            ),
          });
        }
        return papers;
      },
    },
  });
}

function directResearchBundleCapability(
  name: "items.export_research_bundle" | "topics.export_research_bundle",
  method: "exportPapers" | "exportTopics",
): HostBridgeCapabilityDefinition {
  return capability(name, async (input, context) => {
    const normalizedInput = normalizeSynthesisCapabilityInput(
      name,
      asObject(input),
    ) as SynthesisJsonObject;
    const application = await resolveDirectResearchBundleApplication(context);
    const result = await application[method](normalizedInput, {
      mode: context.connectionMode,
    });
    return applySynthesisOutputBoundary(name, normalizedInput, result);
  });
}

async function callSynthesisDebugClient(
  context: HostBridgeCapabilityContext,
  methodName: string,
  input: unknown,
) {
  const object = asObject(input);
  const client = await (context.resolveSynthesisClient?.() ||
    getDefaultSynthesisClient());
  const requiredString = (field: "paperRef" | "topicId") => {
    const value = object[field];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Synthesis debug ${field} is required`);
    }
    return value;
  };
  let result: SynthesisJsonObject;
  switch (methodName) {
    case "debugSynthesisSnapshot":
      result = await client.debug.snapshot(object as SynthesisJsonObject);
      break;
    case "debugSynthesisOperationsList":
      result = await client.debug.listOperations(object as SynthesisJsonObject);
      break;
    case "debugSynthesisProfilerList":
      result = await client.debug.listProfiler(object as SynthesisJsonObject);
      break;
    case "debugSynthesisPaperInspect":
      result = await client.debug.inspectPaper({
        paperRef: requiredString("paperRef"),
      });
      break;
    case "debugSynthesisTopicInspect":
      result = await client.debug.inspectTopic({
        topicId: requiredString("topicId"),
      });
      break;
    case "debugSynthesisDiff":
      result = await client.debug.diff(object as SynthesisJsonObject);
      break;
    case "debugSynthesisCacheList":
      result = await client.debug.listCache(object as SynthesisJsonObject);
      break;
    case "debugSynthesisCleanInstallReset":
      result = await client.debug.cleanInstallReset(
        object as SynthesisJsonObject,
      );
      break;
    default:
      throw new Error(`Synthesis debug method is unavailable: ${methodName}`);
  }
  const includeFull =
    object.includeFull === true || object.include_full === true;
  const requiresFileDelivery =
    (methodName === "debugSynthesisSnapshot" &&
      (includeFull ||
        object.includeUiSnapshot === true ||
        object.include_ui_snapshot === true)) ||
    (includeFull &&
      [
        "debugSynthesisProfilerList",
        "debugSynthesisPaperInspect",
        "debugSynthesisTopicInspect",
      ].includes(methodName));
  if (!requiresFileDelivery) {
    return result;
  }
  const capability =
    (
      {
        debugSynthesisSnapshot: "debug.synthesis.snapshot",
        debugSynthesisProfilerList: "debug.synthesis.profiler.list",
        debugSynthesisPaperInspect: "debug.synthesis.paper.inspect",
        debugSynthesisTopicInspect: "debug.synthesis.topic.inspect",
      } as Record<string, string>
    )[methodName] || "debug.synthesis";
  const displayName = `${capability.replace(/[^A-Za-z0-9._-]+/g, "-")}.json`;
  const file = await registerBoundedOutputFile({
    capability,
    displayName,
    contentType: "application/json",
    content: `${JSON.stringify(result, null, 2)}\n`,
  });
  return {
    schema: "host_bridge.debug.file_delivery.v1",
    diagnostic: capability,
    delivery: {
      mode: "bridge-download",
      bundle: file,
      downloadCommand: `zotero-bridge file download ${file.fileId} --output ${displayName}`,
    },
    truncated: false,
  };
}

const CAPABILITIES: HostBridgeCapabilityDefinition[] = [
  capability("context.get_current_view", (_input, context) =>
    bridgeCurrentView(context),
  ),
  capability("context.get_selected_items", (input, context) =>
    bridgeSelectedItems(input, context),
  ),
  capability("library.search_items", async (input, context) => {
    const page = await bridgeLibraryItems(
      context,
      asObject(input) as {
        query: string;
        limit?: number | string;
        libraryId?: number | string;
      },
    );
    return {
      items: page.items,
      truncated: page.hasMore,
    };
  }),
  capability("library.list_items", (input, context) =>
    bridgeLibraryItems(context, libraryListArgsFromInput(input)),
  ),
  capability("library.sync_snapshot", (input, context) =>
    resolveCapabilityBroker(context).library.syncSnapshot(
      librarySnapshotArgsFromInput(input),
      { ownerId: `host-bridge:${context.connectionMode}` },
      context.control,
    ),
  ),
  capability("library.readiness_audit", (input, context) =>
    resolveCapabilityBroker(context).library.readinessAudit(
      libraryListArgsFromInput(input),
      context.control,
    ),
  ),
  capability("library.list_saved_searches", (input, context) => {
    const object = asObject(input);
    return resolveCapabilityBroker(context).library.listSavedSearches(
      {
        ...readPageRequest(input),
        ...(object.libraryId === undefined
          ? {}
          : { libraryId: Number(object.libraryId) }),
      },
      context.control,
    );
  }),
  capability("library.get_item_detail", async (input, context) => {
    const detail = await resolveCapabilityBroker(context).library.getItemDetail(
      itemRefFromInput(input),
      context.control,
    );
    return detail.kind === "attachment"
      ? {
          kind: detail.kind,
          item: (
            await toBridgeCanonicalAttachmentDescriptors([detail.item])
          )[0],
        }
      : detail;
  }),
  capability("library.get_item_notes", (input, context) =>
    resolveCapabilityBroker(context).library.getItemNotes(
      itemRefFromInput(input),
      readPageRequest(input),
      context.control,
    ),
  ),
  capability("library.get_note_detail", async (input, context) => {
    const object = asObject(input);
    const detail = await resolveCapabilityBroker(context).library.getNoteDetail(
      itemRefFromInput(input),
      { format: object.format === "html" ? "html" : "text" },
      context.control,
    );
    const { text, ...window } = chunkHostBridgeText(detail.content, object);
    return { ...detail, content: text, ...window };
  }),
  capability("library.list_note_payloads", (input, context) =>
    resolveCapabilityBroker(context).library.listNotePayloads(
      itemRefFromInput(input),
      readPageRequest(input),
      context.control,
    ),
  ),
  capability("library.get_note_payload", (input, context) =>
    resolveCapabilityBroker(context).library.getNotePayload(
      itemRefFromInput(input),
      { payloadType: String(asObject(input).payloadType || "") },
      context.control,
    ),
  ),
  capability("library.get_item_attachments", (input, context) =>
    toBridgeAttachmentDescriptorsWithContext(input, context),
  ),
  capability("library.list_annotations", (input, context) =>
    resolveCapabilityBroker(context).library.listAnnotations(
      itemRefFromInput(input),
      readPageRequest(input),
      context.control,
    ),
  ),
  capability("library.export_annotations", async (input, context) => {
    const object = asObject(input);
    const exported = await resolveCapabilityBroker(
      context,
    ).library.exportAnnotations(
      itemRefFromInput(input),
      object as { format?: string },
      context.control,
    );
    const format = String(exported.format || "markdown");
    const content =
      format === "json"
        ? `${JSON.stringify(exported.annotations || [], null, 2)}\n`
        : String(exported.markdown || "");
    const file = await registerBoundedOutputFile({
      capability: "library.export_annotations",
      displayName: `zotero-annotations.${format === "json" ? "json" : "md"}`,
      contentType: format === "json" ? "application/json" : "text/markdown",
      content,
    });
    return {
      format,
      count: Array.isArray(exported.annotations)
        ? exported.annotations.length
        : 0,
      delivery: { mode: "bridge-download", file },
    };
  }),
  capability("workflow_products.list", (input) =>
    selectWorkflowProducts(input),
  ),
  capability("workflow_products.get", (input) => {
    const object = asObject(input);
    const product = publicWorkflowProduct(
      workflowProductOrThrow(object.productId),
    );
    const page = paginateHostBridgeRows({
      scope: "product get",
      criteria: capabilityPageCriteria(object),
      rows: product.assets,
      key: capabilityPageRowKey,
      cursor: object.cursor,
      limit: object.limit,
    });
    return {
      product: { ...product, assets: page.page },
      pagination: {
        assets: {
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          returned: page.returned,
          total: page.total,
          limit: page.limit,
        },
      },
    };
  }),
  capability("workflow_products.read_asset", async (input) => {
    const object = asObject(input);
    const resolved = await managedWorkflowProductAssetOrThrow(
      object.productId,
      { assetId: object.assetId, relativePath: object.relativePath },
    );
    const file = await registerHostBridgeWorkflowArtifactFile({
      localPath: resolved.localPath,
      displayName: resolved.asset.label || resolved.asset.relativePath,
      contentType: resolved.asset.contentType,
      size: resolved.asset.size,
      workflowId: resolved.product.workflowId,
      requestId: resolved.product.requestId,
      runId: resolved.product.runId,
      owner: {
        capability: "workflow_products.read_asset",
        requestId: resolved.product.requestId,
      },
    });
    return { asset: publicWorkflowProductAsset(resolved.asset), file };
  }),
  capability("workflow_products.export", exportWorkflowProduct),
  capability("workflow_products.remove", (input) => {
    const product = workflowProductOrThrow(asObject(input).productId);
    if (!removeWorkflowProduct(product.productId)) {
      throw new HostBridgeWorkflowProductError(
        "workflow_product_not_found",
        "Workflow product was not found",
      );
    }
    return { productId: product.productId, removed: true };
  }),
  capability("mutation.preview", (input, context) =>
    resolveCapabilityBroker(context).legacyMutations.preview(
      normalizeHostBridgeMutationRequest(input),
    ),
  ),
  capability("mutation.execute", executeMutationWithBridgeProjection),
  capability("diagnostic.get_status", (_input, context) => context.getStatus()),
  debugCapability("debug.status", debugStatus),
  debugCapability("debug.persistence.snapshot", debugPersistenceSnapshot),
  debugCapability("debug.tasks.snapshot", debugTasksSnapshot),
  debugCapability(
    "debug.skillrunner.connections.snapshot",
    debugSkillRunnerConnectionsSnapshot,
  ),
  debugCapability("debug.acpSkillRun.reapplyResult", async (input) => {
    const object = asObject(input);
    const { reapplyAcpSkillRunResult } =
      await import("./acpSkillRunnerOrchestrator");
    return reapplyAcpSkillRunResult({
      requestId: object.requestId as string | undefined,
      runId: object.runId as string | undefined,
      force: object.force === true,
      persistResult: Object.prototype.hasOwnProperty.call(
        object,
        "persistResult",
      )
        ? object.persistResult !== false
        : undefined,
      resultJsonOverride: isPlainObject(object.resultJsonOverride)
        ? object.resultJsonOverride
        : undefined,
      overrideMode:
        object.overrideMode === "replace" || object.overrideMode === "merge"
          ? object.overrideMode
          : undefined,
    });
  }),
  debugCapability("debug.zotero.eval", (input) => debugZoteroEval(input)),
  debugCapability("debug.synthesis.snapshot", (input, context) =>
    callSynthesisDebugClient(context, "debugSynthesisSnapshot", input),
  ),
  debugCapability("debug.synthesis.operations.list", (input, context) =>
    callSynthesisDebugClient(context, "debugSynthesisOperationsList", input),
  ),
  debugCapability("debug.synthesis.profiler.list", (input, context) =>
    callSynthesisDebugClient(context, "debugSynthesisProfilerList", input),
  ),
  debugCapability("debug.synthesis.paper.inspect", (input, context) =>
    callSynthesisDebugClient(context, "debugSynthesisPaperInspect", input),
  ),
  debugCapability("debug.synthesis.topic.inspect", (input, context) =>
    callSynthesisDebugClient(context, "debugSynthesisTopicInspect", input),
  ),
  debugCapability("debug.synthesis.diff", (input, context) =>
    callSynthesisDebugClient(context, "debugSynthesisDiff", input),
  ),
  debugCapability("debug.synthesis.cache.list", (input, context) =>
    callSynthesisDebugClient(context, "debugSynthesisCacheList", input),
  ),
  debugCapability("debug.synthesis.cleanInstallReset", (input, context) =>
    callSynthesisDebugClient(context, "debugSynthesisCleanInstallReset", input),
  ),
  synthesisCapability("topics.list", "listTopics"),
  synthesisCapability("topics.find_by_paper_ref", "findTopicsByPaperRef"),
  synthesisCapability("topics.get_context", "getTopicContext"),
  synthesisCapability("topics.get_planning_context", "getTopicPlanningContext"),
  synthesisCapability("topics.get_report", "getTopicReport"),
  directResearchBundleCapability(
    "topics.export_research_bundle",
    "exportTopics",
  ),
  synthesisCapability("schemas.get", "getSchemas"),
  synthesisCapability("concepts.query", "queryConceptKb"),
  synthesisCapability(
    "citation_graph.query_cluster",
    "queryCitationGraphCluster",
  ),
  synthesisCapability("library_index.get", "getLibraryIndex"),
  synthesisCapability("resolvers.resolve", "resolveResolver"),
  synthesisCapability("reference_index.get", "getReferenceSidecarIndex"),
  synthesisCapability(
    "reference_sidecar.refresh",
    "startReferenceSidecarRefresh",
  ),
  synthesisCapability(
    "synthesis.operation.get",
    "getPublicMaintenanceOperation",
  ),
  synthesisCapability("citation_graph.get_overview", "queryCitationGraph"),
  synthesisCapability("citation_graph.get_slice", "getCitationGraphSlice"),
  synthesisCapability("citation_graph.get_layout", "getCitationGraphLayout"),
  synthesisCapability("citation_graph.get_metrics", "getCitationGraphMetrics"),
  synthesisCapability(
    "citation_graph.rank_external_references",
    "rankExternalReferences",
  ),
  synthesisCapability(
    "citation_graph.rank_library_papers",
    "rankLibraryPapers",
  ),
  synthesisCapability(
    "citation_graph.refresh_metrics",
    "refreshCitationGraphMetricsNow",
  ),
  synthesisCapability("citation_graph.update", "startCitationGraphUpdate"),
  synthesisCapability(
    "paper_artifacts.get_manifest",
    "getPaperArtifactManifest",
  ),
  synthesisCapability("paper_artifacts.read", "readPaperArtifacts"),
  directResearchBundleCapability(
    "items.export_research_bundle",
    "exportPapers",
  ),
  synthesisCapability(
    "paper_artifacts.export_filtered",
    "exportFilteredPaperArtifacts",
  ),
  synthesisCapability(
    "paper_artifacts.resolve_topic_digest",
    "resolveTopicPaperDigest",
  ),
  synthesisCapability("topics.get_review_input", "getReviewInput"),
  synthesisCapability("insights.get_attention_queue", "getAttentionQueue"),
];

const CAPABILITY_BY_NAME = new Map<string, HostBridgeCapabilityDefinition>(
  CAPABILITIES.map((entry) => [entry.name, entry]),
);
const REGISTERED_CAPABILITY_NAMES = CAPABILITIES.map((entry) => entry.name);
const CONTRACT_CAPABILITY_NAMES = listHostBridgeCapabilityContractEntries().map(
  (entry) => entry.name,
);
if (
  new Set(REGISTERED_CAPABILITY_NAMES).size !==
    REGISTERED_CAPABILITY_NAMES.length ||
  [...REGISTERED_CAPABILITY_NAMES].sort().join("\n") !==
    [...CONTRACT_CAPABILITY_NAMES].sort().join("\n")
) {
  const registered = new Set(REGISTERED_CAPABILITY_NAMES);
  const contracted = new Set(CONTRACT_CAPABILITY_NAMES);
  throw new Error(
    [
      "Host Bridge capability handler/contract mismatch",
      `missing handlers: ${CONTRACT_CAPABILITY_NAMES.filter((name) => !registered.has(name)).join(", ")}`,
      `orphan handlers: ${REGISTERED_CAPABILITY_NAMES.filter((name) => !contracted.has(name)).join(", ")}`,
      `duplicate handlers: ${REGISTERED_CAPABILITY_NAMES.filter(
        (name, index) => REGISTERED_CAPABILITY_NAMES.indexOf(name) !== index,
      ).join(", ")}`,
    ].join("; "),
  );
}

function withCurrentApproval<T extends HostBridgeCapabilityManifestEntry>(
  entry: T,
): T {
  return {
    ...entry,
    approval: getHostBridgeApprovalRequirement(entry.name),
  };
}

export function listHostBridgeCapabilities(): HostBridgeCapabilityManifestEntry[] {
  return CAPABILITIES.filter(
    (entry) =>
      (entry.category !== "debug" || isDebugModeEnabled()) &&
      (entry.name !== "debug.skillrunner.connections.snapshot" ||
        isSkillRunnerConnectionAuditAvailable()),
  ).map(({ handler: _handler, ...entry }) => ({
    ...withCurrentApproval(entry),
  }));
}

export function getHostBridgeCapability(
  name: string,
): HostBridgeCapabilityManifestEntry | null {
  const capability = CAPABILITY_BY_NAME.get(name) || null;
  if (!capability) {
    return null;
  }
  if (capability.category === "debug" && !isDebugModeEnabled()) {
    return null;
  }
  if (
    capability.name === "debug.skillrunner.connections.snapshot" &&
    !isSkillRunnerConnectionAuditAvailable()
  ) {
    return null;
  }
  const { handler: _handler, ...manifest } = withCurrentApproval(capability);
  return manifest;
}

export function getHostBridgeCapabilityApproval(
  name: string,
): HostBridgeApprovalRequirement {
  return getHostBridgeCapability(name)?.approval || "zotero-ui-required";
}

export class HostBridgeCapabilityContractError extends Error {
  readonly code:
    | "invalid_capability_input"
    | "capability_output_contract_violation";
  readonly violations: HostBridgeContractViolation[];

  constructor(
    code: "invalid_capability_input" | "capability_output_contract_violation",
    capability: string,
    violations: HostBridgeContractViolation[],
  ) {
    super(
      code === "invalid_capability_input"
        ? `Input for ${capability} does not satisfy its executable contract`
        : `Output from ${capability} does not satisfy its executable contract`,
    );
    this.name = "HostBridgeCapabilityContractError";
    this.code = code;
    this.violations = violations;
  }
}

export async function executeHostBridgeCapability(
  name: string,
  input: unknown,
  context: HostBridgeCapabilityContext,
) {
  const definition = CAPABILITY_BY_NAME.get(name);
  const manifest = getHostBridgeCapability(name);
  if (!definition || !manifest) {
    return null;
  }
  const normalizedInput = input ?? {};
  const inputViolations = validateHostBridgeCapabilityInput(
    name,
    normalizedInput,
  );
  if (inputViolations.length) {
    throw new HostBridgeCapabilityContractError(
      "invalid_capability_input",
      name,
      inputViolations,
    );
  }
  const data = await definition.handler(normalizedInput, context);
  const outputViolations = validateHostBridgeCapabilityOutput(name, data);
  if (outputViolations.length) {
    throw new HostBridgeCapabilityContractError(
      "capability_output_contract_violation",
      name,
      outputViolations,
    );
  }
  return data;
}

import { getHostBridgeApprovalRequirement } from "./hostBridgePermissionManager";
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
  HostBridgeCapabilityCategory,
  HostBridgeCapabilityManifestEntry,
  HostBridgeConnectionMode,
  HostBridgeErrorCategory,
  HostBridgeStatusSnapshot,
} from "./hostBridgeProtocol";
import {
  createZoteroHostCapabilityBrokerApis,
  type ZoteroHostItemRefInput,
  type ZoteroHostLibraryListArgs,
  type ZoteroHostMutationRequest,
  type ZoteroHostNoteDetailArgs,
  type ZoteroHostNotePayloadDetailArgs,
  type ZoteroHostAttachmentDto,
} from "./zoteroHostCapabilityBroker";
import type {
  SynthesisClient,
  SynthesisDeliveryContext,
  SynthesisJsonObject,
  SynthesisPaperArtifactsRequest,
  SynthesisTopicReportRequest,
} from "../../packages/synthesis-contracts/src/index";
import { getDefaultSynthesisClient } from "./synthesisClient/defaultClient";

export type HostBridgeCapabilityContext = {
  getStatus: () => HostBridgeStatusSnapshot;
  connectionMode: HostBridgeConnectionMode;
  resolveHostBridgeApis?: () => ZoteroHostCapabilityBrokerApis;
  resolveSynthesisClient?: () => SynthesisClient | Promise<SynthesisClient>;
};

export type ZoteroHostCapabilityBrokerApis = ReturnType<
  typeof createZoteroHostCapabilityBrokerApis
>;

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

function itemRefFromInput(input: unknown): ZoteroHostItemRefInput {
  const object = asObject(input);
  if (Object.prototype.hasOwnProperty.call(object, "ref")) {
    return object.ref as ZoteroHostItemRefInput;
  }
  return input as ZoteroHostItemRefInput;
}

function libraryListArgsFromInput(input: unknown): ZoteroHostLibraryListArgs {
  const args = { ...asObject(input) } as ZoteroHostLibraryListArgs;
  const limit = Number(args.limit);
  if (Number.isFinite(limit) && limit > 200) {
    args.limit = 200;
  }
  return args;
}

function toBridgeAttachmentDescriptor(
  attachment: ZoteroHostAttachmentDto,
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

function resolveHostBridgeApis(context: HostBridgeCapabilityContext) {
  return (
    context.resolveHostBridgeApis?.() || createZoteroHostCapabilityBrokerApis()
  );
}

async function toBridgeAttachmentDescriptorsWithContext(
  input: unknown,
  context: HostBridgeCapabilityContext,
) {
  const attachments = await resolveHostBridgeApis(
    context,
  ).library.getItemAttachments(itemRefFromInput(input));
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
        capability: "library.get_item_attachments",
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

function capability(
  name: string,
  category: HostBridgeCapabilityCategory,
  summary: string,
  input: HostBridgeCapabilityManifestEntry["input"],
  handler: HostBridgeCapabilityHandler,
  requestEffect: HostBridgeCapabilityManifestEntry["requestEffect"] = "read",
): HostBridgeCapabilityDefinition {
  const approval = getHostBridgeApprovalRequirement(name);
  return {
    name,
    category,
    summary,
    approval,
    requestEffect,
    input,
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
  summary: string,
  handler: HostBridgeCapabilityHandler,
  requestEffect: HostBridgeCapabilityManifestEntry["requestEffect"] = "read",
): HostBridgeCapabilityDefinition {
  return capability(
    name,
    "debug",
    summary,
    { type: "object", required: false },
    async (input, context) => {
      assertDebugModeEnabled();
      return handler(input, context);
    },
    requestEffect,
  );
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
  if (capabilityName === "topics.get_review_input") {
    const object = asObject(result);
    const topic = asObject(object.topic);
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
        registryRows: Array.isArray(object.registry_rows)
          ? object.registry_rows.length
          : 0,
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
  const [taskRuntime, acpSkillRunDashboard] = await Promise.all([
    import("./taskRuntime"),
    import("./acpSkillRunDashboardFacade"),
  ]);
  const { listActiveWorkflowTaskSummaries, listWorkflowTasks } = taskRuntime;
  const { listAcpSkillRunSummaries } = acpSkillRunDashboard;
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
  const [taskRuntime, acpSkillRunDashboard] = await Promise.all([
    import("./taskRuntime"),
    import("./acpSkillRunDashboardFacade"),
  ]);
  const { listActiveWorkflowTaskSummaries, listWorkflowTasks } = taskRuntime;
  const { listAcpSkillRunSummaries } = acpSkillRunDashboard;
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

function synthesisCapability(
  name: string,
  category: HostBridgeCapabilityCategory,
  summary: string,
  invoke: (
    client: SynthesisClient,
    input: SynthesisJsonObject,
    delivery: SynthesisDeliveryContext,
  ) => unknown | Promise<unknown>,
  input: HostBridgeCapabilityManifestEntry["input"] = {
    type: "object",
    required: false,
  },
  requestEffect: HostBridgeCapabilityManifestEntry["requestEffect"] = "read",
): HostBridgeCapabilityDefinition {
  return capability(
    name,
    category,
    summary,
    input,
    async (input, context) => {
      const client = await (context.resolveSynthesisClient?.() ||
        getDefaultSynthesisClient());
      const normalizedInput = normalizeSynthesisCapabilityInput(
        name,
        asObject(input),
      ) as SynthesisJsonObject;
      const result = await invoke(client, normalizedInput, {
        mode: context.connectionMode,
      });
      return applySynthesisOutputBoundary(name, normalizedInput, result);
    },
    requestEffect,
  );
}

async function callSynthesisDebugClient(
  context: HostBridgeCapabilityContext,
  capabilityName: string,
  input: unknown,
  invoke: (client: SynthesisClient) => Promise<SynthesisJsonObject>,
) {
  const client = await (context.resolveSynthesisClient?.() ||
    getDefaultSynthesisClient());
  const result = await invoke(client);
  const object = asObject(input);
  const includeFull =
    object.includeFull === true || object.include_full === true;
  const requiresFileDelivery =
    (capabilityName === "debug.synthesis.snapshot" &&
      (includeFull ||
        object.includeUiSnapshot === true ||
        object.include_ui_snapshot === true)) ||
    (includeFull &&
      [
        "debug.synthesis.profiler.list",
        "debug.synthesis.paper.inspect",
        "debug.synthesis.topic.inspect",
      ].includes(capabilityName));
  if (!requiresFileDelivery) {
    return result;
  }
  const displayName = `${capabilityName.replace(/[^A-Za-z0-9._-]+/g, "-")}.json`;
  const file = await registerBoundedOutputFile({
    capability: capabilityName,
    displayName,
    contentType: "application/json",
    content: `${JSON.stringify(result, null, 2)}\n`,
  });
  return {
    schema: "host_bridge.debug.file_delivery.v1",
    diagnostic: capabilityName,
    delivery: {
      mode: "bridge-download",
      bundle: file,
      downloadCommand: `zotero-bridge file download ${file.fileId} --output ${displayName}`,
    },
    truncated: false,
  };
}

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

const CAPABILITIES: HostBridgeCapabilityDefinition[] = [
  capability(
    "context.get_current_view",
    "context",
    "Return the active Zotero target, library id, selection state, and current item metadata.",
    { type: "none", required: false },
    (_input, context) =>
      resolveHostBridgeApis(context).context.getCurrentView(),
  ),
  capability(
    "context.get_selected_items",
    "context",
    "Return JSON-safe summaries for the currently selected Zotero items.",
    { type: "none", required: false },
    (_input, context) =>
      resolveHostBridgeApis(context).context.getSelectedItems(),
  ),
  capability(
    "library.search_items",
    "library",
    "Search regular Zotero library items by bounded text query.",
    {
      type: "object",
      required: true,
      properties: {
        query: { type: "string", minLength: 1, maxLength: 500 },
        limit: { type: ["number", "string"], minimum: 1 },
        libraryId: { type: ["number", "string"] },
      },
      requiredProperties: ["query"],
    },
    (input, context) =>
      resolveHostBridgeApis(context).library.searchItems(
        asObject(input) as {
          query: string;
          limit?: number | string;
          libraryId?: number | string;
        },
      ),
  ),
  capability(
    "library.list_items",
    "library",
    "List compact parent Zotero library item summaries with bounded pagination and filters.",
    {
      type: "object",
      required: false,
      properties: {
        libraryId: { type: ["number", "string"] },
        collection: {},
        collectionId: { type: ["number", "string"] },
        collectionKey: { type: "string" },
        collectionLibraryId: { type: ["number", "string"] },
        tag: { type: "string" },
        itemType: { type: "string" },
        query: { type: "string" },
        limit: { type: ["number", "string"], minimum: 1 },
        cursor: { type: "string" },
      },
    },
    (input, context) =>
      resolveHostBridgeApis(context).library.listItems(
        libraryListArgsFromInput(input),
      ),
  ),
  capability(
    "library.sync_snapshot",
    "library",
    "Return a paginated Zotero library metadata snapshot for local librarian indexes.",
    {
      type: "object",
      required: false,
      properties: {
        libraryId: { type: ["number", "string"] },
        collection: {},
        collectionId: { type: ["number", "string"] },
        collectionKey: { type: "string" },
        collectionLibraryId: { type: ["number", "string"] },
        tag: { type: "string" },
        itemType: { type: "string" },
        query: { type: "string" },
        limit: { type: ["number", "string"], minimum: 1 },
        cursor: { type: "string" },
      },
    },
    (input, context) =>
      resolveHostBridgeApis(context).library.syncSnapshot(
        libraryListArgsFromInput(input),
      ),
  ),
  capability(
    "library.readiness_audit",
    "library",
    "Return paginated read-only library readiness for missing PDF, source Markdown, and literature-analysis artifacts.",
    {
      type: "object",
      required: false,
      properties: {
        libraryId: { type: ["number", "string"] },
        collection: {},
        collectionId: { type: ["number", "string"] },
        collectionKey: { type: "string" },
        collectionLibraryId: { type: ["number", "string"] },
        tag: { type: "string" },
        itemType: { type: "string" },
        query: { type: "string" },
        limit: { type: ["number", "string"], minimum: 1 },
        cursor: { type: "string" },
        checks: {},
        missingOnly: { type: ["boolean", "string", "number"] },
        missing_only: { type: ["boolean", "string", "number"] },
      },
    },
    (input, context) =>
      resolveHostBridgeApis(context).library.readinessAudit(
        libraryListArgsFromInput(input),
      ),
  ),
  capability(
    "library.get_item_detail",
    "library",
    "Return detailed JSON-safe metadata for one Zotero item.",
    { type: "item-ref", required: true },
    (input, context) =>
      resolveHostBridgeApis(context).library.getItemDetail(
        itemRefFromInput(input),
      ),
  ),
  capability(
    "library.get_item_notes",
    "library",
    "Return bounded child note summaries for one Zotero item.",
    { type: "object", required: true },
    async (input, context) => {
      const object = asObject(input);
      const notes = [];
      const sourceLimit = 100;
      for (let cursor = 0; ; cursor += sourceLimit) {
        const batch = await resolveHostBridgeApis(context).library.getItemNotes(
          itemRefFromInput(input),
          {
            ...object,
            cursor,
            limit: sourceLimit,
          },
        );
        notes.push(...batch);
        if (batch.length < sourceLimit) break;
      }
      return paginateCapabilityRows({
        scope: "library item notes",
        section: "items",
        input: object,
        rows: notes,
      });
    },
  ),
  capability(
    "library.get_note_detail",
    "library",
    "Read one Zotero note body in bounded chunks.",
    { type: "object", required: true },
    (input, context) =>
      resolveHostBridgeApis(context).library.getNoteDetail(
        itemRefFromInput(input),
        asObject(input) as ZoteroHostNoteDetailArgs,
      ),
  ),
  capability(
    "library.list_note_payloads",
    "library",
    "List workflow note payloads from embedded attachments and note payload blocks.",
    {
      type: "object",
      required: true,
      properties: {
        key: { type: "string" },
        id: { type: ["number", "string"] },
        libraryId: { type: ["number", "string"] },
        cursor: { type: "string" },
        limit: { type: ["number", "string"], minimum: 1 },
      },
    },
    async (input, context) =>
      paginateCapabilityRows({
        scope: "library note payloads",
        section: "payloads",
        input: asObject(input),
        rows: await resolveHostBridgeApis(context).library.listNotePayloads(
          itemRefFromInput(input),
        ),
      }),
  ),
  capability(
    "library.get_note_payload",
    "library",
    "Decode one workflow payload from one Zotero note.",
    { type: "object", required: true },
    (input, context) =>
      resolveHostBridgeApis(context).library.getNotePayload(
        itemRefFromInput(input),
        asObject(input) as ZoteroHostNotePayloadDetailArgs,
      ),
  ),
  capability(
    "library.get_item_attachments",
    "library",
    "Return child attachment metadata with broker-issued download handles when available.",
    {
      type: "object",
      required: true,
      properties: {
        key: { type: "string" },
        id: { type: ["number", "string"] },
        libraryId: { type: ["number", "string"] },
        cursor: { type: "string" },
        limit: { type: ["number", "string"], minimum: 1 },
      },
    },
    async (input, context) =>
      paginateCapabilityRows({
        scope: "library item attachments",
        section: "attachments",
        input: asObject(input),
        rows: await toBridgeAttachmentDescriptorsWithContext(input, context),
      }),
  ),
  capability(
    "library.list_annotations",
    "library",
    "List reader annotations for one Zotero item when the Zotero runtime exposes them.",
    {
      type: "object",
      required: true,
      properties: {
        key: { type: "string" },
        id: { type: ["number", "string"] },
        libraryId: { type: ["number", "string"] },
        cursor: { type: "string" },
        limit: { type: ["number", "string"], minimum: 1 },
      },
    },
    async (input, context) =>
      paginateCapabilityRows({
        scope: "library annotation list",
        section: "annotations",
        input: asObject(input),
        rows: await resolveHostBridgeApis(context).library.listAnnotations(
          itemRefFromInput(input),
        ),
      }),
  ),
  capability(
    "library.export_annotations",
    "library",
    "Export reader annotations for one Zotero item as markdown or JSON.",
    { type: "object", required: true },
    async (input, context) => {
      const object = asObject(input);
      const exported = await resolveHostBridgeApis(
        context,
      ).library.exportAnnotations(
        itemRefFromInput(input),
        object as { format?: string },
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
    },
  ),
  capability(
    "workflow_products.list",
    "workflow_products",
    "List normal Dashboard Products with bounded filters and pagination.",
    {
      type: "object",
      required: false,
      properties: {
        workflowId: { type: "string" },
        backendId: { type: "string" },
        requestId: { type: "string" },
        cursor: { type: ["number", "string"], minimum: 0 },
        limit: { type: ["number", "string"], minimum: 1 },
      },
    },
    (input) => selectWorkflowProducts(input),
  ),
  capability(
    "workflow_products.get",
    "workflow_products",
    "Return public metadata for one normal Dashboard Product.",
    {
      type: "object",
      required: true,
      properties: {
        productId: { type: "string" },
        cursor: { type: "string" },
        limit: { type: ["number", "string"], minimum: 1 },
      },
      requiredProperties: ["productId"],
    },
    (input) => {
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
    },
  ),
  capability(
    "workflow_products.read_asset",
    "workflow_products",
    "Register one normal Dashboard Product asset for opaque file download.",
    {
      type: "object",
      required: true,
      properties: {
        productId: { type: "string" },
        assetId: { type: "string" },
        relativePath: { type: "string" },
      },
      requiredProperties: ["productId"],
    },
    async (input) => {
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
    },
  ),
  capability(
    "workflow_products.export",
    "workflow_products",
    "Export one or all normal Dashboard Product assets with local or remote delivery.",
    {
      type: "object",
      required: true,
      properties: {
        productId: { type: "string" },
        assetId: { type: "string" },
        outputDir: { type: "string" },
        overwrite: { type: "boolean" },
      },
      requiredProperties: ["productId"],
    },
    exportWorkflowProduct,
  ),
  capability(
    "workflow_products.remove",
    "mutation",
    "Remove one normal Dashboard Product record while retaining managed assets for persistence cleanup.",
    {
      type: "object",
      required: true,
      properties: { productId: { type: "string" } },
      requiredProperties: ["productId"],
    },
    (input) => {
      const product = workflowProductOrThrow(asObject(input).productId);
      if (!removeWorkflowProduct(product.productId)) {
        throw new HostBridgeWorkflowProductError(
          "workflow_product_not_found",
          "Workflow product was not found",
        );
      }
      return { productId: product.productId, removed: true };
    },
    "state-change",
  ),
  capability(
    "mutation.preview",
    "mutation",
    "Preview a supported Zotero mutation without executing it.",
    { type: "mutation-preview", required: true },
    (input, context) =>
      resolveHostBridgeApis(context).mutations.preview(
        asObject(input) as ZoteroHostMutationRequest,
      ),
  ),
  capability(
    "mutation.execute",
    "mutation",
    "Execute a supported Zotero mutation after Zotero-side approval.",
    { type: "mutation-preview", required: true },
    (input, context) =>
      resolveHostBridgeApis(context).mutations.execute(
        asObject(input) as ZoteroHostMutationRequest,
      ),
    "state-change",
  ),
  capability(
    "diagnostic.get_status",
    "diagnostic",
    "Return a redacted Host Bridge service status snapshot.",
    { type: "none", required: false },
    (_input, context) => context.getStatus(),
  ),
  debugCapability(
    "debug.status",
    "Return a debug-only Host Bridge and runtime status snapshot.",
    debugStatus,
  ),
  debugCapability(
    "debug.persistence.snapshot",
    "Return a debug-only runtime persistence usage and integrity snapshot.",
    debugPersistenceSnapshot,
  ),
  debugCapability(
    "debug.tasks.snapshot",
    "Return debug-only workflow task and ACP run diagnostics.",
    debugTasksSnapshot,
  ),
  ...(typeof __debug_mode__ === "undefined" ||
  (__debug_mode__ && __skillrunner_connection_audit_enabled__)
    ? [
        debugCapability(
          "debug.skillrunner.connections.snapshot",
          "Return debug-only SkillRunner connection governor diagnostics.",
          debugSkillRunnerConnectionsSnapshot,
        ),
      ]
    : []),
  debugCapability(
    "debug.acpSkillRun.reapplyResult",
    "Debug-only operation: re-run applyResult for an existing ACP skill run result.",
    async (input) => {
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
    },
    "state-change",
  ),
  debugCapability(
    "debug.zotero.eval",
    "Debug-only operation: execute approved JavaScript in the Zotero host context.",
    (input) => debugZoteroEval(input),
    "state-change",
  ),
  debugCapability(
    "debug.synthesis.snapshot",
    "Return a debug-only Synthesis operation, cache, table-count, and UI snapshot.",
    (input, context) =>
      callSynthesisDebugClient(
        context,
        "debug.synthesis.snapshot",
        input,
        (client) =>
          client.debug.snapshot(asObject(input) as SynthesisJsonObject),
      ),
  ),
  debugCapability(
    "debug.synthesis.operations.list",
    "List debug-only Synthesis explicit operations and background job rows.",
    (input, context) =>
      callSynthesisDebugClient(
        context,
        "debug.synthesis.operations.list",
        input,
        (client) =>
          client.debug.listOperations(asObject(input) as SynthesisJsonObject),
      ),
  ),
  debugCapability(
    "debug.synthesis.profiler.list",
    "List debug-only Synthesis profiler runs and phase timings.",
    (input, context) =>
      callSynthesisDebugClient(
        context,
        "debug.synthesis.profiler.list",
        input,
        (client) =>
          client.debug.listProfiler(asObject(input) as SynthesisJsonObject),
      ),
  ),
  debugCapability(
    "debug.synthesis.paper.inspect",
    "Inspect one paper across Zotero payloads and Synthesis repository caches.",
    (input, context) =>
      callSynthesisDebugClient(
        context,
        "debug.synthesis.paper.inspect",
        input,
        (client) =>
          client.debug.inspectPaper(asObject(input) as SynthesisJsonObject),
      ),
  ),
  debugCapability(
    "debug.synthesis.topic.inspect",
    "Inspect one topic across artifacts, graph, freshness, and discovery state.",
    (input, context) =>
      callSynthesisDebugClient(
        context,
        "debug.synthesis.topic.inspect",
        input,
        (client) =>
          client.debug.inspectTopic(asObject(input) as SynthesisJsonObject),
      ),
  ),
  debugCapability(
    "debug.synthesis.diff",
    "Compare Zotero payload availability against Synthesis repository caches.",
    (input, context) =>
      callSynthesisDebugClient(
        context,
        "debug.synthesis.diff",
        input,
        (client) => client.debug.diff(asObject(input) as SynthesisJsonObject),
      ),
  ),
  debugCapability(
    "debug.synthesis.cache.list",
    "List debug-only Synthesis sidecar cache basis rows.",
    (input, context) =>
      callSynthesisDebugClient(
        context,
        "debug.synthesis.cache.list",
        input,
        (client) =>
          client.debug.listCache(asObject(input) as SynthesisJsonObject),
      ),
  ),
  debugCapability(
    "debug.synthesis.cleanInstallReset",
    "Dangerous debug operation: reset Synthesis DB state and delete data/synthesis.",
    (input, context) =>
      callSynthesisDebugClient(
        context,
        "debug.synthesis.cleanInstallReset",
        input,
        (client) =>
          client.debug.cleanInstallReset(
            asObject(input) as SynthesisJsonObject,
          ),
      ),
    "state-change",
  ),
  synthesisCapability(
    "topics.list",
    "topics",
    "List paged Zotero Synthesis Layer topics for duplicate checks and topic selection.",
    (client, input) => client.topics.list(input),
    {
      type: "object",
      required: false,
      properties: {
        cursor: { type: ["number", "string"] },
        limit: { type: ["number", "string"], minimum: 1 },
      },
    },
    "state-change",
  ),
  synthesisCapability(
    "topics.find_by_paper_ref",
    "topics",
    "Return active Synthesis topics associated with selected paper references from artifact dependency state.",
    (client, input) => client.topics.findByPaperRef(input),
  ),
  synthesisCapability(
    "topics.get_context",
    "topics",
    "Return one topic context as digest, semantic, audit, or full view; large view results may be written to outputPath.",
    (client, input, delivery) => client.topics.getContext(input, delivery),
    {
      type: "object",
      required: false,
      properties: {
        topicId: { type: "string" },
        topic_id: { type: "string" },
        view: {
          type: "string",
          enum: ["digest", "semantic", "audit", "full"],
        },
        mode: { type: "string", enum: ["create", "update"] },
        language: { type: "string" },
        updateScope: { type: "string" },
        update_scope: { type: "string" },
        updateMode: { type: "string" },
        update_mode: { type: "string" },
        updateReason: { type: "string" },
        update_reason: { type: "string" },
        includeFull: { type: "boolean" },
        include_full: { type: "boolean" },
        includeMarkdown: { type: "boolean" },
        include_markdown: { type: "boolean" },
        includeArtifact: { type: "boolean" },
        include_artifact: { type: "boolean" },
        includeManifest: { type: "boolean" },
        include_manifest: { type: "boolean" },
        outputPath: { type: "string" },
        output_path: { type: "string" },
        overwrite: { type: "boolean" },
      },
    },
  ),
  synthesisCapability(
    "topics.get_report",
    "topics",
    "Return one topic synthesis report markdown body from runtime synthesis_report.body.",
    (client, input) => client.topics.getTopicReport(topicReportRequest(input)),
  ),
  synthesisCapability(
    "schemas.get",
    "schemas",
    "Return Synthesis Layer schema metadata for diagnostic and validation workflows.",
    (client, input) => client.maintenance.getSchemas(input),
  ),
  synthesisCapability(
    "concepts.query",
    "concepts",
    "Return bounded read-only Concept KB and alias-index candidates for topic synthesis KG enrichment.",
    (client, input) => client.concepts.query(input),
  ),
  synthesisCapability(
    "citation_graph.query_cluster",
    "citation_graph",
    "Return bounded read-only topic-scoped citation graph cluster data for synthesis statistics.",
    (client, input) => client.graph.queryCluster(input),
    {
      type: "object",
      required: false,
      properties: {
        source_paper_refs: { type: "array" },
        sourcePaperRefs: { type: "array" },
        paper_refs: { type: "array" },
        paperRefs: { type: "array" },
        paper_ref: { type: "string" },
        paperRef: { type: "string" },
        max_external_nodes: { type: ["number", "string"], minimum: 0 },
        maxExternalNodes: { type: ["number", "string"], minimum: 0 },
        max_nodes: { type: ["number", "string"], minimum: 1 },
        maxNodes: { type: ["number", "string"], minimum: 1 },
        max_edges: { type: ["number", "string"], minimum: 0 },
        maxEdges: { type: ["number", "string"], minimum: 0 },
        cluster_policy: { type: "string" },
        clusterPolicy: { type: "string" },
      },
    },
  ),
  synthesisCapability(
    "library_index.get",
    "library_index",
    "Return paginated compact Synthesis library index pages derived from Zotero library facts.",
    (client, input) => client.libraryIndex.getPage(input),
    {
      type: "object",
      required: false,
      properties: {
        libraryId: { type: ["number", "string"] },
        cursor: { type: ["number", "string"] },
        limit: { type: ["number", "string"], minimum: 1 },
        includeTags: { type: "boolean" },
        includeCollections: { type: "boolean" },
        includeItems: { type: "boolean" },
        tagCursor: { type: ["number", "string"] },
        tagLimit: { type: ["number", "string"], minimum: 1 },
        collectionCursor: { type: ["number", "string"] },
        collectionLimit: { type: ["number", "string"], minimum: 1 },
        topicCursor: { type: ["number", "string"] },
        topicLimit: { type: ["number", "string"], minimum: 1 },
        registryCursor: { type: ["number", "string"] },
        registryLimit: { type: ["number", "string"], minimum: 1 },
      },
    },
  ),
  synthesisCapability(
    "resolvers.resolve",
    "resolvers",
    "Resolve a topic resolver into a deterministic paper workset and diagnostics.",
    (client, input) => client.topics.resolveResolver(input),
  ),
  synthesisCapability(
    "reference_index.get",
    "reference_index",
    "Return bounded read-only reference index metadata and diagnostics for selected source references.",
    (client, input) => client.references.getSidecarIndex(input),
  ),
  synthesisCapability(
    "reference_sidecar.refresh",
    "reference_index",
    "Start an independently approved reference-sidecar refresh for one library or a bounded same-library paper-ref scope and return a persistent operation handle.",
    (client, input) => client.references.startRefresh(input),
    {
      type: "object",
      required: false,
      properties: {
        scope: { type: "string", enum: ["library", "papers"] },
        library_id: { type: ["number", "string"] },
        libraryId: { type: ["number", "string"] },
        paper_refs: { type: "array" },
        paperRefs: { type: "array" },
        idempotency_key: { type: "string" },
        idempotencyKey: { type: "string" },
      },
    },
    "state-change",
  ),
  synthesisCapability(
    "synthesis.operation.get",
    "diagnostic",
    "Read one persistent public Synthesis maintenance operation and its terminal receipt without mutating operation state.",
    (client, input) =>
      client.maintenance.getOperation(
        input as unknown as
          | { operation_id: string; operationId?: never }
          | { operationId: string; operation_id?: never },
      ),
    {
      type: "object",
      required: true,
      properties: {
        operation_id: { type: "string" },
        operationId: { type: "string" },
      },
    },
  ),
  synthesisCapability(
    "citation_graph.get_overview",
    "citation_graph",
    "Return paged read-only Synthesis citation graph overview arrays with summary counts.",
    (client, input) => client.graph.getOverview(input),
    {
      type: "object",
      required: false,
      properties: {
        cursor: { type: ["number", "string"] },
        limit: { type: ["number", "string"], minimum: 1 },
        nodeCursor: { type: ["number", "string"] },
        node_cursor: { type: ["number", "string"] },
        nodeLimit: { type: ["number", "string"], minimum: 1 },
        node_limit: { type: ["number", "string"], minimum: 1 },
        edgeCursor: { type: ["number", "string"] },
        edge_cursor: { type: ["number", "string"] },
        edgeLimit: { type: ["number", "string"], minimum: 1 },
        edge_limit: { type: ["number", "string"], minimum: 1 },
        hoverNodeCursor: { type: ["number", "string"] },
        hover_node_cursor: { type: ["number", "string"] },
        hoverNodeLimit: { type: ["number", "string"], minimum: 1 },
        hover_node_limit: { type: ["number", "string"], minimum: 1 },
        hoverEdgeCursor: { type: ["number", "string"] },
        hover_edge_cursor: { type: ["number", "string"] },
        hoverEdgeLimit: { type: ["number", "string"], minimum: 1 },
        hover_edge_limit: { type: ["number", "string"], minimum: 1 },
      },
    },
  ),
  synthesisCapability(
    "citation_graph.get_slice",
    "citation_graph",
    "Return a bounded read-only citation graph slice with freshness diagnostics for selected paper references.",
    (client, input) => client.graph.getSlice(input),
  ),
  synthesisCapability(
    "citation_graph.get_layout",
    "citation_graph",
    "Return persisted citation graph layout coordinates for an explicit full graph or bounded subgraph query without recomputing layout.",
    (client, input) => client.graph.getPersistedLayout(input),
  ),
  synthesisCapability(
    "citation_graph.get_metrics",
    "citation_graph",
    "Return bounded read-only citation graph metrics, freshness diagnostics, and recommended maintenance commands for selected paper references.",
    (client, input) => client.graph.getMetrics(input),
    {
      type: "object",
      required: false,
      properties: {
        paperRefs: { type: "array" },
        paper_refs: { type: "array" },
        cursor: { type: ["number", "string"] },
        limit: { type: ["number", "string"], minimum: 1 },
        sortBy: { type: "string" },
        sort_by: { type: "string" },
      },
    },
  ),
  synthesisCapability(
    "citation_graph.rank_external_references",
    "citation_graph",
    "Return ranked external references from the persisted citation graph without refreshing graph state.",
    (client, input) => client.references.rankExternalReferences(input),
    {
      type: "object",
      required: false,
      properties: {
        cursor: { type: ["number", "string"] },
        limit: { type: ["number", "string"], minimum: 1 },
        sortBy: { type: "string" },
        sort_by: { type: "string" },
      },
    },
  ),
  synthesisCapability(
    "citation_graph.rank_library_papers",
    "citation_graph",
    "Return ranked library papers from persisted citation graph metrics without refreshing graph state.",
    (client, input) => client.graph.rankLibraryPapers(input),
    {
      type: "object",
      required: false,
      properties: {
        paperRefs: { type: "array" },
        paper_refs: { type: "array" },
        cursor: { type: ["number", "string"] },
        limit: { type: ["number", "string"], minimum: 1 },
        sortBy: { type: "string" },
        sort_by: { type: "string" },
      },
    },
  ),
  synthesisCapability(
    "citation_graph.refresh_metrics",
    "citation_graph",
    "Diagnostic repair: refresh persisted citation graph complex metrics from the current graph cache without rebuilding graph structure.",
    (client, input) => client.graph.refreshMetricsNow(input),
    { type: "object", required: false },
    "state-change",
  ),
  synthesisCapability(
    "citation_graph.update",
    "citation_graph",
    "Start an independently approved atomic citation-graph update for one library or a bounded paper closure and return a persistent operation handle.",
    (client, input) => client.graph.startUpdate(input),
    {
      type: "object",
      required: false,
      properties: {
        scope: { type: "string", enum: ["library", "papers"] },
        library_id: { type: ["number", "string"] },
        libraryId: { type: ["number", "string"] },
        paper_refs: { type: "array" },
        paperRefs: { type: "array" },
        expected_reference_basis_hash: { type: "string" },
        expectedReferenceBasisHash: { type: "string" },
        idempotency_key: { type: "string" },
        idempotencyKey: { type: "string" },
      },
    },
    "state-change",
  ),
  synthesisCapability(
    "paper_artifacts.get_manifest",
    "paper_artifacts",
    "Return available Synthesis paper artifact descriptors for selected paper references.",
    (client, input) => client.artifacts.getManifest(input),
  ),
  synthesisCapability(
    "paper_artifacts.read",
    "paper_artifacts",
    "Read bounded Synthesis paper artifacts for selected paper references.",
    (client, input) =>
      client.artifacts.readPaperArtifacts(paperArtifactsRequest(input)),
  ),
  synthesisCapability(
    "paper_artifacts.export_filtered",
    "paper_artifacts",
    "Export bounded filtered paper artifacts into the ACP run workspace.",
    (client, input, delivery) =>
      client.artifacts.exportFiltered(input, delivery),
  ),
  synthesisCapability(
    "paper_artifacts.resolve_topic_digest",
    "paper_artifacts",
    "Resolve one topic paper digest artifact for reading or diagnostics.",
    (client, input) => client.artifacts.resolveTopicPaperDigest(input),
  ),
  synthesisCapability(
    "topics.get_review_input",
    "topics",
    "Return structured Synthesis review workflow input.",
    (client, input) => client.workflowReview.getInput(input),
  ),
  synthesisCapability(
    "insights.get_attention_queue",
    "insights",
    "Return read-only attention items for graph metrics, reference index, and paper artifact readiness.",
    (client, input) => client.references.getAttentionQueue(input),
  ),
];

const CAPABILITY_BY_NAME = new Map(
  CAPABILITIES.map((entry) => [entry.name, entry]),
);

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
): HostBridgeCapabilityDefinition | null {
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
  return withCurrentApproval(capability);
}

export function getHostBridgeCapabilityApproval(
  name: string,
): HostBridgeApprovalRequirement {
  return getHostBridgeCapability(name)?.approval || "zotero-ui-required";
}

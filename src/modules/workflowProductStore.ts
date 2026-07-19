import { joinPath, normalizeNativeLocalPath } from "../utils/path";
import { isWindowsRuntime } from "../platform/runtimePlatform";
import {
  assertManagedRelativePath,
  copyRuntimeFile,
  getRuntimePersistencePaths,
  readRuntimeBytes,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  statRuntimePath,
  writeRuntimeBytes,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { sha256Hex, sha256PrefixedHex } from "../utils/sha256";
import {
  PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
  deletePluginTaskRowEntry,
  getPluginMetaValue,
  listPluginTaskRowEntries,
  setPluginMetaValue,
  upsertPluginTaskRowEntry,
} from "./pluginStateStore";
import type {
  WorkflowResolvedArtifact,
  WorkflowResultContext,
} from "./workflowExecution/resultContext";

export type WorkflowProductAsset = {
  assetId: string;
  label: string;
  relativePath: string;
  contentType?: string;
  availability: "available" | "missing";
  size?: number;
  sha256?: string;
  diagnostics?: string[];
};

export type WorkflowProductRecord = {
  schemaVersion: 2;
  productId: string;
  productKey: string;
  kind: string;
  title: string;
  workflowId: string;
  workflowLabel: string;
  backendId?: string;
  backendType: string;
  runKey?: string;
  requestId: string;
  runId?: string;
  storageRevision: string;
  assets: WorkflowProductAsset[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowProductRegistrationReceipt = {
  productId: string;
  assetCount: number;
  availableAssetCount: number;
  missingAssetCount: number;
};

export type WorkflowProductPreview = {
  productId: string;
  assetId: string;
  path: string;
  exists: boolean;
  previewable: boolean;
  truncated: boolean;
  kind:
    | "markdown"
    | "json"
    | "yaml"
    | "toml"
    | "latex"
    | "text"
    | "binary"
    | "missing";
  language: string;
  text: string;
  formattedText?: string;
  size?: number;
  error?: string;
};

export type ProductStorageAssetSource =
  | { kind: "result-artifact"; rawPath?: unknown; fallbackPath?: string }
  | { kind: "local-file"; path: string }
  | { kind: "inline-text"; text: string };

export type ResolvedWorkflowProductAsset = {
  product: WorkflowProductRecord;
  asset: WorkflowProductAsset;
  localPath: string;
};

export type ProductStorageAssetInput = {
  assetId?: string;
  label?: string;
  rawPath?: unknown;
  fallbackPath?: string;
  productAssetPath?: string;
  contentType?: string;
  source?: ProductStorageAssetSource;
};

export type RegisterProductInput = {
  productKey?: string;
  kind: string;
  title: string;
  assets: ProductStorageAssetInput[];
  metadata?: Record<string, unknown>;
  failurePolicy?: "record-missing" | "atomic";
};

export type ProductStorageApi = {
  registerProduct: (
    input: RegisterProductInput,
  ) => Promise<WorkflowProductRegistrationReceipt>;
};

export type WorkflowProductMigrationStatus = {
  state: "idle" | "running" | "ready" | "failed";
  failedProductIds: string[];
  errorCode?: string;
};

export const WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK = "skill_run_feedback";
export const SKILL_RUN_FEEDBACK_ASSET_ID = "feedback";
const STORE_SCOPE = "products";
const RECORD_SCHEMA_VERSION = 2;
const DEFAULT_PREVIEW_BYTES = 256 * 1024;
const MIGRATION_META_KEY = "workflow_product_object_store_v2";
const OBJECTS_DIR = "objects";
const DIGEST_LENGTH = 32;
const REVISION_LENGTH = 16;

let migrationRoot = "";
let migrationPromise: Promise<void> | null = null;
let migrationStatus: WorkflowProductMigrationStatus = {
  state: "idle",
  failedProductIds: [],
};
const registrationTails = new Map<string, Promise<void>>();

function productStorageError(code: string, message: string, cause?: unknown) {
  return Object.assign(new Error(message), { code, cause });
}

function assertObjectPathBudget(path: string) {
  if (isWindowsRuntime() && path.length > 240) {
    throw productStorageError(
      "workflow_product_storage_path_too_long",
      "workflow Product storage root is too long for managed assets",
    );
  }
}

function nowIso() {
  return new Date().toISOString();
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeSegment(value: unknown, fallback = "asset") {
  const normalized = cleanString(value)
    .replace(/\\/g, "/")
    .replace(/\.\.+/g, ".")
    .replace(/[^A-Za-z0-9._/-]+/g, "-")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return normalized || fallback;
}

function safeId(value: unknown, fallback = "product") {
  const normalized = cleanString(value)
    .replace(/[^A-Za-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function extensionOf(path: string) {
  const base = path.replace(/\\/g, "/").split("/").pop() || "";
  const index = base.lastIndexOf(".");
  return index >= 0 ? base.slice(index + 1).toLowerCase() : "";
}

function inferPreviewKind(
  logicalPath: string,
  contentType?: string,
): WorkflowProductPreview["kind"] {
  const type = cleanString(contentType).toLowerCase();
  const ext = extensionOf(logicalPath);
  if (type.includes("markdown") || ext === "md" || ext === "markdown")
    return "markdown";
  if (type.includes("json") || ext === "json") return "json";
  if (type.includes("yaml") || ext === "yaml" || ext === "yml") return "yaml";
  if (type.includes("toml") || ext === "toml") return "toml";
  if (type.includes("latex") || ext === "tex" || ext === "bib") return "latex";
  if (
    [
      "txt",
      "text",
      "log",
      "csv",
      "tsv",
      "xml",
      "html",
      "css",
      "js",
      "ts",
      "mjs",
    ].includes(ext) ||
    type.startsWith("text/")
  ) {
    return "text";
  }
  return "binary";
}

function languageForKind(kind: WorkflowProductPreview["kind"]) {
  if (kind === "markdown") return "markdown";
  if (kind === "json") return "json";
  if (kind === "yaml") return "yaml";
  if (kind === "toml") return "toml";
  if (kind === "latex") return "latex";
  return "text";
}

function languageForPath(
  logicalPath: string,
  kind: WorkflowProductPreview["kind"],
  contentType?: string,
) {
  if (kind !== "text") return languageForKind(kind);
  const type = cleanString(contentType).toLowerCase();
  const ext = extensionOf(logicalPath);
  if (type.includes("html") || ext === "html" || ext === "htm") return "html";
  if (type.includes("xml") || ext === "xml") return "xml";
  if (type.includes("css") || ext === "css") return "css";
  if (type.includes("javascript") || ext === "js" || ext === "mjs")
    return "javascript";
  if (type.includes("typescript") || ext === "ts" || ext === "tsx")
    return "typescript";
  if (ext === "jsx") return "javascript";
  if (type.includes("csv") || ext === "csv") return "csv";
  if (ext === "tsv") return "tsv";
  if (ext === "log") return "log";
  return "text";
}

function prettyJson(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function cloneRecord(record: WorkflowProductRecord): WorkflowProductRecord {
  return {
    ...record,
    assets: record.assets.map((asset) => ({
      ...asset,
      diagnostics: asset.diagnostics ? [...asset.diagnostics] : undefined,
    })),
    metadata: { ...(record.metadata || {}) },
  };
}

function normalizeDiagnostics(value: unknown) {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean).slice(0, 20)
    : undefined;
}

function normalizeV2Asset(
  raw: unknown,
  index = 0,
): WorkflowProductAsset | null {
  if (!isRecord(raw)) return null;
  const assetId = safeId(raw.assetId || `asset-${index + 1}`, "");
  let relativePath = "";
  try {
    relativePath = assertManagedRelativePath(raw.relativePath);
  } catch {
    return null;
  }
  const availability = cleanString(raw.availability);
  if (!assetId || !["available", "missing"].includes(availability)) {
    return null;
  }
  return {
    assetId,
    label: cleanString(raw.label) || assetId,
    relativePath,
    contentType: cleanString(raw.contentType) || undefined,
    availability: availability as WorkflowProductAsset["availability"],
    size: Number.isFinite(Number(raw.size))
      ? Math.max(0, Number(raw.size))
      : undefined,
    sha256: cleanString(raw.sha256) || undefined,
    diagnostics: normalizeDiagnostics(raw.diagnostics),
  };
}

function parseV2Product(payload: string): WorkflowProductRecord | null {
  try {
    const raw = JSON.parse(payload);
    if (!isRecord(raw) || Number(raw.schemaVersion) !== RECORD_SCHEMA_VERSION) {
      return null;
    }
    const productId = safeId(raw.productId || raw.id, "");
    const revision = cleanString(raw.storageRevision).toLowerCase();
    const assets = Array.isArray(raw.assets)
      ? raw.assets.map(normalizeV2Asset)
      : [];
    if (
      !productId ||
      !new RegExp(`^[a-f0-9]{${REVISION_LENGTH}}$`).test(revision) ||
      assets.some((asset) => !asset)
    ) {
      return null;
    }
    const now = nowIso();
    return {
      schemaVersion: 2,
      productId,
      productKey: safeId(raw.productKey || productId),
      kind: cleanString(raw.kind) || "workflow.product",
      title: cleanString(raw.title) || productId,
      workflowId: cleanString(raw.workflowId),
      workflowLabel: cleanString(raw.workflowLabel),
      backendId: cleanString(raw.backendId) || undefined,
      backendType: cleanString(raw.backendType),
      runKey: cleanString(raw.runKey) || undefined,
      requestId: cleanString(raw.requestId),
      runId: cleanString(raw.runId) || undefined,
      storageRevision: revision,
      assets: assets as WorkflowProductAsset[],
      metadata: isRecord(raw.metadata) ? { ...raw.metadata } : {},
      createdAt: cleanString(raw.createdAt) || now,
      updatedAt: cleanString(raw.updatedAt) || now,
    };
  } catch {
    return null;
  }
}

function productRows() {
  return listPluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
    STORE_SCOPE,
  );
}

function persistProduct(record: WorkflowProductRecord) {
  upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS, STORE_SCOPE, {
    taskId: record.productId,
    requestId: record.requestId,
    backendId: record.backendType || "workflow-product",
    state: "available",
    updatedAt: record.updatedAt,
    payload: JSON.stringify(record),
  });
}

export function listWorkflowProducts() {
  if (migrationStatus.state === "failed") return [];
  return productRows()
    .map((entry) => parseV2Product(entry.payload))
    .filter((entry): entry is WorkflowProductRecord => Boolean(entry))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(cloneRecord);
}

export function getWorkflowProduct(productIdRaw: string) {
  const productId = safeId(productIdRaw, "");
  if (!productId) return null;
  return (
    listWorkflowProducts().find((record) => record.productId === productId) ||
    null
  );
}

async function digestText(value: string) {
  const digest = await sha256Hex(new TextEncoder().encode(value));
  if (!digest) throw new Error("SHA-256 is unavailable in the current runtime");
  return digest.slice(0, DIGEST_LENGTH);
}

async function productDigest(productId: string) {
  return digestText(`product\0${productId}`);
}

async function assetDigest(
  asset: Pick<WorkflowProductAsset, "assetId" | "relativePath">,
) {
  return digestText(`asset\0${asset.assetId}\0${asset.relativePath}`);
}

function objectsRoot() {
  return joinPath(
    getRuntimePersistencePaths().workflowProductsDir,
    "assets",
    OBJECTS_DIR,
  );
}

async function productObjectRoot(productId: string) {
  return joinPath(objectsRoot(), await productDigest(productId));
}

async function revisionRoot(productId: string, revision: string) {
  return joinPath(await productObjectRoot(productId), revision);
}

async function assetObjectPath(
  productId: string,
  revision: string,
  asset: Pick<WorkflowProductAsset, "assetId" | "relativePath">,
) {
  return joinPath(
    await revisionRoot(productId, revision),
    await assetDigest(asset),
  );
}

export async function deriveWorkflowProductAssetLocalPath(
  product: WorkflowProductRecord,
  asset: Pick<WorkflowProductAsset, "assetId" | "relativePath">,
) {
  return assetObjectPath(product.productId, product.storageRevision, asset);
}

function randomHex(bytes: number) {
  const output = new Uint8Array(bytes);
  const cryptoRuntime = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof cryptoRuntime?.getRandomValues === "function") {
    cryptoRuntime.getRandomValues(output);
  } else {
    for (let index = 0; index < output.length; index += 1) {
      output[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(output, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function createStorageRevision(productId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const revision = randomHex(REVISION_LENGTH / 2);
    if (!(await runtimePathExists(await revisionRoot(productId, revision)))) {
      return revision;
    }
  }
  throw new Error("unable to allocate workflow product storage revision");
}

async function assertDigestOwnership(
  productId: string,
  assets: WorkflowProductAsset[],
) {
  const digest = await productDigest(productId);
  for (const product of listWorkflowProducts()) {
    if (
      product.productId !== productId &&
      (await productDigest(product.productId)) === digest
    ) {
      throw new Error("workflow product storage digest collision");
    }
  }
  const identities = new Map<string, string>();
  for (const asset of assets) {
    const digestValue = await assetDigest(asset);
    const identity = `${asset.assetId}\0${asset.relativePath}`;
    const existing = identities.get(digestValue);
    if (existing && existing !== identity) {
      throw new Error("workflow product asset digest collision");
    }
    identities.set(digestValue, identity);
  }
}

export async function resolveManagedWorkflowProductAsset(
  productIdRaw: string,
  assetIdRaw: string,
): Promise<ResolvedWorkflowProductAsset | null> {
  const product = getWorkflowProduct(productIdRaw);
  if (!product) return null;
  const asset = product.assets.find(
    (entry) => entry.assetId === safeId(assetIdRaw, ""),
  );
  return resolveProductAssetRecord(product, asset);
}

export async function resolveManagedWorkflowProductAssetByRelativePath(
  productIdRaw: string,
  relativePathRaw: string,
): Promise<ResolvedWorkflowProductAsset | null> {
  const product = getWorkflowProduct(productIdRaw);
  if (!product) return null;
  let relativePath = "";
  try {
    relativePath = assertManagedRelativePath(relativePathRaw);
  } catch {
    return null;
  }
  const asset = product.assets.find(
    (entry) => entry.relativePath === relativePath,
  );
  return resolveProductAssetRecord(product, asset);
}

async function resolveProductAssetRecord(
  product: WorkflowProductRecord,
  asset?: WorkflowProductAsset,
): Promise<ResolvedWorkflowProductAsset | null> {
  if (!asset || asset.availability !== "available") return null;
  const localPath = await assetObjectPath(
    product.productId,
    product.storageRevision,
    asset,
  );
  const stat = await statRuntimePath(localPath);
  if (
    !stat.exists ||
    (typeof asset.size === "number" && stat.size !== asset.size)
  ) {
    return null;
  }
  return { product: cloneRecord(product), asset: { ...asset }, localPath };
}

export function removeWorkflowProduct(productIdRaw: string) {
  const productId = safeId(productIdRaw, "");
  if (!productId) return false;
  return deletePluginTaskRowEntry(
    PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
    productId,
  );
}

export function listSkillRunFeedbackProducts(skillIdRaw?: string) {
  const skillId = cleanString(skillIdRaw);
  return listWorkflowProducts().filter((product) => {
    if (product.kind !== WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK) return false;
    return !skillId || cleanString(product.metadata?.skillId) === skillId;
  });
}

function formatFeedbackAuditValue(value: unknown) {
  return cleanString(value) || "-";
}

function buildFeedbackAuditHeader(product: WorkflowProductRecord) {
  const metadata = product.metadata || {};
  return [
    `workflowId: ${formatFeedbackAuditValue(product.workflowId)}`,
    `workflowLabel: ${formatFeedbackAuditValue(product.workflowLabel)}`,
    `skillId: ${formatFeedbackAuditValue(metadata.skillId)}`,
    `backendId: ${formatFeedbackAuditValue(product.backendId)}`,
    `backendType: ${formatFeedbackAuditValue(product.backendType)}`,
    `requestId: ${formatFeedbackAuditValue(product.requestId)}`,
    `runId: ${formatFeedbackAuditValue(product.runId)}`,
    `jobId: ${formatFeedbackAuditValue(metadata.jobId)}`,
    `sourcePath: ${formatFeedbackAuditValue(metadata.sourcePath)}`,
    `collectedAt: ${formatFeedbackAuditValue(metadata.collectedAt)}`,
    `contentHash: ${formatFeedbackAuditValue(metadata.contentHash)}`,
    `applySucceeded: ${metadata.applySucceeded === true ? "true" : "false"}`,
  ].join("\n");
}

export async function buildSkillRunFeedbackExportMarkdown(
  productIdsRaw: string[],
) {
  const productIds = new Set(
    (productIdsRaw || []).map((entry) => safeId(entry, "")).filter(Boolean),
  );
  const products = listSkillRunFeedbackProducts().filter((product) =>
    productIds.has(product.productId),
  );
  const sections: string[] = [];
  for (const product of products) {
    const asset =
      product.assets.find(
        (entry) => entry.assetId === SKILL_RUN_FEEDBACK_ASSET_ID,
      ) || product.assets[0];
    const preview = asset
      ? await readProductAssetPreview(product.productId, asset.assetId, {
          maxBytes: 1024 * 1024,
        })
      : null;
    sections.push(
      [
        `## ${product.title || product.productId}`,
        "",
        "```yaml",
        buildFeedbackAuditHeader(product),
        "```",
        "",
        preview?.previewable ? preview.text : "_Feedback body unavailable._",
      ].join("\n"),
    );
  }
  return [
    "# Skill Run Feedback Export",
    "",
    `exportedAt: ${nowIso()}`,
    `count: ${sections.length}`,
    "",
    ...sections,
  ].join("\n\n");
}

function timestampForFilename() {
  return nowIso().replace(/[:.]/g, "-");
}

export async function exportSkillRunFeedbackMarkdownFile(
  productIdsRaw: string[],
) {
  const text = await buildSkillRunFeedbackExportMarkdown(productIdsRaw);
  const filePath = joinPath(
    getRuntimePersistencePaths().workflowProductsDir,
    "exports",
    `skill-run-feedback-${timestampForFilename()}.md`,
  );
  await writeRuntimeTextFile(filePath, text);
  return { filePath, text };
}

export async function exportWorkflowProductToDirectory(args: {
  productId: string;
  outputDir: string;
  assetId?: string;
  overwrite?: boolean;
}) {
  const product = getWorkflowProduct(args.productId);
  if (!product) throw new Error("workflow product was not found");
  const selected = args.assetId
    ? product.assets.filter(
        (asset) => asset.assetId === safeId(args.assetId, ""),
      )
    : product.assets.filter((asset) => asset.availability === "available");
  if (!selected.length) throw new Error("workflow product asset was not found");
  const resolved: ResolvedWorkflowProductAsset[] = [];
  for (const asset of selected) {
    const entry = await resolveManagedWorkflowProductAsset(
      product.productId,
      asset.assetId,
    );
    if (!entry) throw new Error("workflow product asset was not found");
    const targetPath = joinPath(
      args.outputDir,
      assertManagedRelativePath(asset.relativePath),
    );
    if (isWindowsRuntime() && targetPath.length > 240) {
      throw productStorageError(
        "workflow_product_export_path_too_long",
        "workflow Product export path is too long; use ZIP or a shorter directory",
      );
    }
    if ((await runtimePathExists(targetPath)) && args.overwrite !== true) {
      throw new Error("workflow product export output already exists");
    }
    resolved.push(entry);
  }
  const files: Array<{ assetId: string; relativePath: string; size?: number }> =
    [];
  for (const entry of resolved) {
    const targetPath = joinPath(args.outputDir, entry.asset.relativePath);
    try {
      await copyRuntimeFile({ sourcePath: entry.localPath, targetPath });
    } catch (error) {
      throw productStorageError(
        "workflow_product_export_failed",
        "unable to export workflow Product asset",
        error,
      );
    }
    files.push({
      assetId: entry.asset.assetId,
      relativePath: entry.asset.relativePath,
      size: entry.asset.size,
    });
  }
  return { product: cloneRecord(product), outputDir: args.outputDir, files };
}

function resolveRequestId(source: unknown) {
  if (!isRecord(source)) return "";
  return cleanString(source.requestId || source.request_id);
}

function resolveRunId(source: unknown) {
  if (!isRecord(source)) return "";
  const response = isRecord(source.responseJson) ? source.responseJson : {};
  return cleanString(
    source.runId || source.run_id || response.runId || response.run_id,
  );
}

function resolveRunKey(source: unknown) {
  if (!isRecord(source)) return "";
  const response = isRecord(source.responseJson) ? source.responseJson : {};
  return cleanString(
    source.runKey || source.run_key || response.runKey || response.run_key,
  );
}

function resolveBackendType(source: unknown) {
  if (!isRecord(source)) return "";
  const response = isRecord(source.responseJson) ? source.responseJson : {};
  return (
    cleanString(source.backendType) ||
    cleanString(response.backendType) ||
    cleanString(response.provider)
  );
}

function resolveBackendId(source: unknown) {
  if (!isRecord(source)) return "";
  const response = isRecord(source.responseJson) ? source.responseJson : {};
  return cleanString(
    source.backendId ||
      source.backend_id ||
      response.backendId ||
      response.backend_id,
  );
}

type ResolvedAssetInput = Partial<WorkflowResolvedArtifact> & {
  bytes?: Uint8Array;
  entryPath: string;
  sourcePath?: string;
};

async function withProductRegistration<T>(
  productId: string,
  operation: () => Promise<T>,
) {
  const previous = registrationTails.get(productId) || Promise.resolve();
  let release!: () => void;
  const tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  registrationTails.set(productId, tail);
  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
    if (registrationTails.get(productId) === tail)
      registrationTails.delete(productId);
  }
}

export function createProductStorageApi(args: {
  manifest?: { id?: string; label?: string };
  resultContext?: WorkflowResultContext;
  request?: unknown;
  runResult?: unknown;
}): ProductStorageApi {
  const requestId =
    resolveRequestId(args.runResult) ||
    resolveRequestId(args.request) ||
    `request-${Date.now()}`;
  const runId = resolveRunId(args.runResult) || undefined;
  const runKey = resolveRunKey(args.runResult) || undefined;
  const workflowId = cleanString(args.manifest?.id);
  const workflowLabel = cleanString(args.manifest?.label) || workflowId;
  const backendId = resolveBackendId(args.runResult);
  const backendType = resolveBackendType(args.runResult);

  const normalizeSource = (input: ProductStorageAssetInput) =>
    input.source || {
      kind: "result-artifact" as const,
      rawPath: input.rawPath,
      fallbackPath: input.fallbackPath,
    };

  const resolveInput = async (
    input: ProductStorageAssetInput,
  ): Promise<ResolvedAssetInput> => {
    if (!args.resultContext)
      throw new Error("workflow resultContext is unavailable");
    const source = normalizeSource(input);
    if (source.kind === "inline-text") {
      return {
        bytes: new TextEncoder().encode(source.text),
        entryPath: input.productAssetPath || input.assetId || "asset",
      };
    }
    if (source.kind === "local-file") {
      const sourcePath = normalizeNativeLocalPath(source.path);
      if (!sourcePath) throw new Error("local product asset path is invalid");
      if (!(await runtimePathExists(sourcePath))) {
        throw new Error(`local product asset does not exist: ${source.path}`);
      }
      return { entryPath: sourcePath, sourcePath };
    }
    return args.resultContext.resolveArtifactBytes({
      fieldName: input.assetId || input.label || "product asset",
      rawPath: source.rawPath,
      fallbackPath: source.fallbackPath,
    });
  };

  return {
    async registerProduct(input) {
      await ensureWorkflowProductStorageReady();
      const productKey = safeId(input.productKey || input.kind || "default");
      const productId = safeId(`${requestId}:${productKey}`);
      return withProductRegistration(productId, async () => {
        const existing = getWorkflowProduct(productId);
        const revision = await createStorageRevision(productId);
        const revisionDir = await revisionRoot(productId, revision);
        const atomic = input.failurePolicy === "atomic";
        const assets: WorkflowProductAsset[] = [];
        const seenPaths = new Set<string>();
        try {
          for (const assetInput of input.assets || []) {
            const assetId = safeId(
              assetInput.assetId ||
                assetInput.label ||
                assetInput.productAssetPath,
            );
            let resolved: ResolvedAssetInput | null = null;
            let resolutionError: unknown;
            try {
              resolved = await resolveInput(assetInput);
            } catch (error) {
              resolutionError = error;
              if (atomic) throw error;
            }
            const inferredPath = safeSegment(
              assetInput.fallbackPath || resolved?.entryPath || assetId,
              assetId,
            );
            const relativePath = assertManagedRelativePath(
              cleanString(assetInput.productAssetPath) || inferredPath,
            );
            if (seenPaths.has(relativePath)) {
              throw new Error(`duplicate product asset path: ${relativePath}`);
            }
            seenPaths.add(relativePath);
            const baseAsset: WorkflowProductAsset = {
              assetId,
              label: cleanString(assetInput.label) || assetId,
              relativePath,
              contentType: cleanString(assetInput.contentType) || undefined,
              availability: resolved ? "available" : "missing",
            };
            if (!resolved) {
              baseAsset.diagnostics = [
                resolutionError instanceof Error
                  ? resolutionError.message
                  : String(resolutionError),
              ];
              assets.push(baseAsset);
              continue;
            }
            const targetPath = await assetObjectPath(
              productId,
              revision,
              baseAsset,
            );
            try {
              assertObjectPathBudget(targetPath);
              if (resolved.sourcePath) {
                await copyRuntimeFile({
                  sourcePath: resolved.sourcePath,
                  targetPath,
                });
              } else if (resolved.bytes) {
                await writeRuntimeBytes(targetPath, resolved.bytes, {
                  overwrite: false,
                });
              } else {
                throw new Error(
                  `product asset has no readable content: ${resolved.entryPath}`,
                );
              }
              const bytes = await readRuntimeBytes(targetPath);
              baseAsset.size = bytes.byteLength;
              baseAsset.sha256 = await sha256PrefixedHex(bytes);
              assets.push(baseAsset);
            } catch (error) {
              if (atomic) {
                if (
                  isRecord(error) &&
                  cleanString(error.code) ===
                    "workflow_product_storage_path_too_long"
                ) {
                  throw error;
                }
                throw productStorageError(
                  "workflow_product_asset_materialization_failed",
                  "unable to materialize workflow Product asset",
                  error,
                );
              }
              await removeRuntimePath(targetPath).catch(() => undefined);
              assets.push({
                ...baseAsset,
                availability: "missing",
                diagnostics: [
                  error instanceof Error ? error.message : String(error),
                ],
              });
            }
          }
          await assertDigestOwnership(productId, assets);
          const record: WorkflowProductRecord = {
            schemaVersion: 2,
            productId,
            productKey,
            kind: cleanString(input.kind) || "workflow.product",
            title: cleanString(input.title) || productId,
            workflowId,
            workflowLabel,
            backendId: backendId || undefined,
            backendType,
            runKey,
            requestId,
            runId,
            storageRevision: revision,
            assets,
            metadata: isRecord(input.metadata) ? { ...input.metadata } : {},
            createdAt: existing?.createdAt || nowIso(),
            updatedAt: nowIso(),
          };
          persistProduct(record);
          if (existing?.storageRevision) {
            const oldRevision = await revisionRoot(
              productId,
              existing.storageRevision,
            );
            await removeRuntimePath(oldRevision).catch(() => undefined);
          }
          const availableAssetCount = assets.filter(
            (asset) => asset.availability === "available",
          ).length;
          return {
            productId,
            assetCount: assets.length,
            availableAssetCount,
            missingAssetCount: assets.length - availableAssetCount,
          };
        } catch (error) {
          await removeRuntimePath(revisionDir).catch(() => undefined);
          throw error;
        }
      });
    },
  };
}

export async function readProductAssetPreview(
  productIdRaw: string,
  assetIdRaw: string,
  options?: { maxBytes?: number },
): Promise<WorkflowProductPreview> {
  const assetId = safeId(assetIdRaw, "");
  const fallback = {
    productId: safeId(productIdRaw, ""),
    assetId,
    path: "",
    exists: false,
    previewable: false,
    truncated: false,
    kind: "missing" as const,
    language: "text",
    text: "",
  };
  const resolved = await resolveManagedWorkflowProductAsset(
    productIdRaw,
    assetId,
  );
  if (!resolved) return { ...fallback, error: "product asset not found" };
  const { product, asset, localPath } = resolved;
  const stat = await statRuntimePath(localPath);
  const kind = inferPreviewKind(asset.relativePath, asset.contentType);
  const maxBytes = Math.max(
    4096,
    Number(options?.maxBytes || DEFAULT_PREVIEW_BYTES) || DEFAULT_PREVIEW_BYTES,
  );
  if (kind === "binary") {
    return {
      ...fallback,
      productId: product.productId,
      assetId: asset.assetId,
      path: asset.relativePath,
      exists: true,
      kind,
      size: stat.size,
      error: "binary or unsupported file type",
    };
  }
  if (stat.size > maxBytes) {
    return {
      ...fallback,
      productId: product.productId,
      assetId: asset.assetId,
      path: asset.relativePath,
      exists: true,
      truncated: true,
      kind,
      language: languageForPath(asset.relativePath, kind, asset.contentType),
      size: stat.size,
      error: `file is too large to preview (${stat.size} bytes)`,
    };
  }
  const text = await readRuntimeTextFile(localPath);
  if (text.includes("\u0000")) {
    return {
      ...fallback,
      productId: product.productId,
      assetId: asset.assetId,
      path: asset.relativePath,
      exists: true,
      kind: "binary",
      size: stat.size,
      error: "binary or unsupported file type",
    };
  }
  return {
    productId: product.productId,
    assetId: asset.assetId,
    path: asset.relativePath,
    exists: true,
    previewable: true,
    truncated: false,
    kind,
    language: languageForPath(asset.relativePath, kind, asset.contentType),
    text,
    formattedText: kind === "json" ? prettyJson(text) : undefined,
    size: stat.size,
  };
}

function legacyCacheDir(productId: string) {
  return joinPath(
    getRuntimePersistencePaths().workflowProductsDir,
    "assets",
    safeSegment(productId),
  );
}

async function migrateLegacyProduct(raw: Record<string, unknown>) {
  const productId = safeId(raw.productId || raw.id, "");
  if (!productId) throw new Error("legacy workflow product id is invalid");
  const revision = await createStorageRevision(productId);
  const revisionDir = await revisionRoot(productId, revision);
  const oldRoot = legacyCacheDir(productId);
  const oldCache = cleanString(raw.cacheDir)
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
  if (
    oldCache &&
    oldCache !== oldRoot.replace(/\\/g, "/").replace(/\/+$/g, "")
  ) {
    throw new Error("legacy workflow product ownership is invalid");
  }
  const assets: WorkflowProductAsset[] = [];
  try {
    for (const [index, rawAsset] of (Array.isArray(raw.assets)
      ? raw.assets
      : []
    ).entries()) {
      const source = isRecord(rawAsset) ? rawAsset : {};
      const assetId = safeId(
        source.assetId || source.id || `asset-${index + 1}`,
      );
      const relativePath = assertManagedRelativePath(
        source.relativePath || source.path || assetId,
      );
      const base: WorkflowProductAsset = {
        assetId,
        label: cleanString(source.label) || assetId,
        relativePath,
        contentType: cleanString(source.contentType) || undefined,
        availability: "missing",
      };
      if (cleanString(source.sourceKind) === "missing") {
        base.diagnostics = normalizeDiagnostics(source.diagnostics) || [
          "legacy asset was unavailable",
        ];
        assets.push(base);
        continue;
      }
      const expectedSource = joinPath(oldRoot, relativePath);
      const persistedSource = cleanString(source.localPath);
      if (
        persistedSource &&
        persistedSource.replace(/\\/g, "/") !==
          expectedSource.replace(/\\/g, "/")
      ) {
        throw new Error("legacy workflow product asset ownership is invalid");
      }
      if (!(await runtimePathExists(expectedSource))) {
        base.diagnostics = ["legacy_asset_missing"];
        assets.push(base);
        continue;
      }
      const bytes = await readRuntimeBytes(expectedSource);
      const actualHash = await sha256PrefixedHex(bytes);
      const expectedHash = cleanString(source.sha256);
      if (expectedHash && expectedHash !== actualHash) {
        base.diagnostics = ["legacy_asset_integrity_mismatch"];
        assets.push(base);
        continue;
      }
      const target = await assetObjectPath(productId, revision, base);
      assertObjectPathBudget(target);
      await writeRuntimeBytes(target, bytes, { overwrite: false });
      assets.push({
        ...base,
        availability: "available",
        size: bytes.byteLength,
        sha256: actualHash,
        diagnostics: undefined,
      });
    }
    await assertDigestOwnership(productId, assets);
    const record: WorkflowProductRecord = {
      schemaVersion: 2,
      productId,
      productKey: safeId(raw.productKey || productId),
      kind: cleanString(raw.kind) || "workflow.product",
      title: cleanString(raw.title) || productId,
      workflowId: cleanString(raw.workflowId),
      workflowLabel: cleanString(raw.workflowLabel),
      backendId: cleanString(raw.backendId) || undefined,
      backendType: cleanString(raw.backendType),
      runKey: cleanString(raw.runKey) || undefined,
      requestId: cleanString(raw.requestId),
      runId: cleanString(raw.runId) || undefined,
      storageRevision: revision,
      assets,
      metadata: isRecord(raw.metadata) ? { ...raw.metadata } : {},
      createdAt: cleanString(raw.createdAt) || nowIso(),
      updatedAt: cleanString(raw.updatedAt) || nowIso(),
    };
    persistProduct(record);
    await removeRuntimePath(oldRoot).catch(() => undefined);
  } catch (error) {
    await removeRuntimePath(revisionDir).catch(() => undefined);
    throw error;
  }
}

export function getWorkflowProductMigrationStatus(): WorkflowProductMigrationStatus {
  return {
    ...migrationStatus,
    failedProductIds: [...migrationStatus.failedProductIds],
  };
}

export function assertWorkflowProductStorageReady() {
  if (migrationStatus.state === "failed") {
    throw productStorageError(
      "workflow_product_store_migration_incomplete",
      "workflow Product storage migration is incomplete",
    );
  }
}

export async function initializeWorkflowProductStorage() {
  const root = getRuntimePersistencePaths().runtimeRoot;
  if (migrationRoot !== root) {
    migrationRoot = root;
    migrationPromise = null;
    migrationStatus = { state: "idle", failedProductIds: [] };
  }
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    migrationStatus = { state: "running", failedProductIds: [] };
    const failed: string[] = [];
    for (const row of productRows()) {
      if (parseV2Product(row.payload)) continue;
      try {
        const raw = JSON.parse(row.payload);
        if (!isRecord(raw))
          throw new Error("legacy workflow product record is invalid");
        await migrateLegacyProduct(raw);
      } catch {
        failed.push(row.taskId);
      }
    }
    if (failed.length) {
      migrationStatus = {
        state: "failed",
        failedProductIds: failed,
        errorCode: "workflow_product_store_migration_incomplete",
      };
      setPluginMetaValue(
        MIGRATION_META_KEY,
        JSON.stringify({
          state: "failed",
          failedProductIds: failed,
          updatedAt: nowIso(),
        }),
      );
      throw Object.assign(
        new Error("workflow product storage migration is incomplete"),
        {
          code: "workflow_product_store_migration_incomplete",
        },
      );
    }
    setPluginMetaValue(MIGRATION_META_KEY, "done");
    migrationStatus = { state: "ready", failedProductIds: [] };
  })().catch((error) => {
    migrationPromise = null;
    throw error;
  });
  return migrationPromise;
}

async function ensureWorkflowProductStorageReady() {
  if (
    migrationRoot === getRuntimePersistencePaths().runtimeRoot &&
    migrationStatus.state === "ready" &&
    getPluginMetaValue(MIGRATION_META_KEY) === "done"
  ) {
    return;
  }
  await initializeWorkflowProductStorage();
}

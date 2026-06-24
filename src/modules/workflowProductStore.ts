import { joinPath } from "../utils/path";
import {
  getRuntimePersistencePaths,
  readRuntimeTextFile,
  runtimePathExists,
  statRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import {
  PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
  deletePluginTaskRowEntry,
  listPluginTaskRowEntries,
  upsertPluginTaskRowEntry,
} from "./pluginStateStore";
import type {
  WorkflowResolvedArtifact,
  WorkflowResultContext,
} from "./workflowExecution/resultContext";

export type WorkflowProductStorageMode =
  | "persistent-cache"
  | "local-workspace"
  | "cached-bundle";

export type WorkflowProductAsset = {
  assetId: string;
  label: string;
  path: string;
  relativePath: string;
  contentType?: string;
  sourceKind: "product-cache" | "local-path" | "bundle-entry" | "missing";
  localPath?: string;
  entryPath?: string;
  size?: number;
  diagnostics?: string[];
};

export type WorkflowProductRecord = {
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
  storageMode: WorkflowProductStorageMode;
  workspaceDir?: string;
  cacheDir?: string;
  resultJsonPath?: string;
  assets: WorkflowProductAsset[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

export type ProductStorageAssetInput = {
  assetId?: string;
  label?: string;
  rawPath?: unknown;
  fallbackPath?: string;
  productAssetPath?: string;
  contentType?: string;
};

export type RegisterProductInput = {
  productKey?: string;
  kind: string;
  title: string;
  assets: ProductStorageAssetInput[];
  metadata?: Record<string, unknown>;
};

export type ProductStorageApi = {
  registerProduct: (
    input: RegisterProductInput,
  ) => Promise<WorkflowProductRecord>;
  cacheBundleAsset: (
    input: ProductStorageAssetInput,
  ) => Promise<WorkflowProductAsset>;
  registerLocalAsset: (
    input: ProductStorageAssetInput,
  ) => Promise<WorkflowProductAsset>;
  listProducts: () => WorkflowProductRecord[];
  getProduct: (productId: string) => WorkflowProductRecord | null;
  removeProduct: (productId: string) => boolean;
  resolveProductAsset: (
    productId: string,
    assetId: string,
  ) => WorkflowProductAsset | null;
  readProductAssetPreview: (
    productId: string,
    assetId: string,
    options?: { maxBytes?: number },
  ) => Promise<WorkflowProductPreview>;
};

export const WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK = "skill_run_feedback";
export const SKILL_RUN_FEEDBACK_ASSET_ID = "feedback";
const STORE_SCOPE = "products";
const DEFAULT_PREVIEW_BYTES = 256 * 1024;

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
  path: string,
  contentType?: string,
): WorkflowProductPreview["kind"] {
  const type = cleanString(contentType).toLowerCase();
  const ext = extensionOf(path);
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
  path: string,
  kind: WorkflowProductPreview["kind"],
  contentType?: string,
) {
  if (kind !== "text") {
    return languageForKind(kind);
  }
  const type = cleanString(contentType).toLowerCase();
  const ext = extensionOf(path);
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
  return languageForKind(kind);
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

function parseProduct(payload: string): WorkflowProductRecord | null {
  try {
    const parsed = JSON.parse(payload);
    if (!isRecord(parsed)) {
      return null;
    }
    return normalizeProductRecord(parsed);
  } catch {
    return null;
  }
}

function normalizeAsset(raw: unknown, index = 0): WorkflowProductAsset {
  const source = isRecord(raw) ? raw : {};
  const assetId = safeId(source.assetId || source.id || `asset-${index + 1}`);
  const path = safeSegment(source.path || source.relativePath || assetId);
  return {
    assetId,
    label: cleanString(source.label) || assetId,
    path,
    relativePath: safeSegment(source.relativePath || path),
    contentType: cleanString(source.contentType) || undefined,
    sourceKind: [
      "product-cache",
      "local-path",
      "bundle-entry",
      "missing",
    ].includes(cleanString(source.sourceKind))
      ? (cleanString(source.sourceKind) as WorkflowProductAsset["sourceKind"])
      : "missing",
    localPath: cleanString(source.localPath) || undefined,
    entryPath: cleanString(source.entryPath) || undefined,
    size: Number.isFinite(Number(source.size))
      ? Math.max(0, Number(source.size))
      : undefined,
    diagnostics: Array.isArray(source.diagnostics)
      ? source.diagnostics.map(cleanString).filter(Boolean)
      : undefined,
  };
}

function normalizeProductRecord(
  raw: Record<string, unknown>,
): WorkflowProductRecord {
  const productId = safeId(raw.productId || raw.id);
  const now = nowIso();
  return {
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
    storageMode: [
      "persistent-cache",
      "cached-bundle",
      "local-workspace",
    ].includes(cleanString(raw.storageMode))
      ? (cleanString(raw.storageMode) as WorkflowProductStorageMode)
      : "local-workspace",
    workspaceDir: cleanString(raw.workspaceDir) || undefined,
    cacheDir: cleanString(raw.cacheDir) || undefined,
    resultJsonPath: cleanString(raw.resultJsonPath) || undefined,
    assets: Array.isArray(raw.assets)
      ? raw.assets.map((asset, index) => normalizeAsset(asset, index))
      : [],
    metadata: isRecord(raw.metadata) ? { ...raw.metadata } : {},
    createdAt: cleanString(raw.createdAt) || now,
    updatedAt: cleanString(raw.updatedAt) || now,
  };
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
  return listPluginTaskRowEntries(
    PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
    STORE_SCOPE,
  )
    .map((entry) => parseProduct(entry.payload))
    .filter((entry): entry is WorkflowProductRecord => Boolean(entry))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(cloneRecord);
}

export function listSkillRunFeedbackProducts(skillIdRaw?: string) {
  const skillId = cleanString(skillIdRaw);
  return listWorkflowProducts().filter((product) => {
    if (product.kind !== WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK) {
      return false;
    }
    if (!skillId) {
      return true;
    }
    return cleanString(product.metadata?.skillId) === skillId;
  });
}

function formatFeedbackAuditValue(value: unknown) {
  const normalized = cleanString(value);
  return normalized || "-";
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
    const body = preview?.previewable ? preview.text : "";
    sections.push(
      [
        `## ${product.title || product.productId}`,
        "",
        "```yaml",
        buildFeedbackAuditHeader(product),
        "```",
        "",
        body || "_Feedback body unavailable._",
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
  const exportDir = joinPath(
    getRuntimePersistencePaths().runtimeRoot,
    "workflow-products",
    "exports",
  );
  const filePath = joinPath(
    exportDir,
    `skill-run-feedback-${timestampForFilename()}.md`,
  );
  await writeRuntimeTextFile(filePath, text);
  return {
    filePath,
    text,
  };
}

export function getWorkflowProduct(productIdRaw: string) {
  const productId = safeId(productIdRaw, "");
  if (!productId) {
    return null;
  }
  return (
    listWorkflowProducts().find((record) => record.productId === productId) ||
    null
  );
}

export function removeWorkflowProduct(productIdRaw: string) {
  const productId = safeId(productIdRaw, "");
  if (!productId) {
    return false;
  }
  return deletePluginTaskRowEntry(
    PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
    productId,
  );
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

async function statAsset(path?: string) {
  if (!path) {
    return undefined;
  }
  const stat = await statRuntimePath(path);
  return stat.exists ? stat.size : undefined;
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
  const workspaceDir = cleanString(args.resultContext?.workspaceDir);
  const resultJsonPath = cleanString(args.resultContext?.resultJsonPath);

  const productBase = (productKeyRaw?: string) => {
    const productKey = safeId(productKeyRaw || "default");
    const productId = safeId(`${requestId}:${productKey}`);
    const cacheDir = joinPath(
      getRuntimePersistencePaths().runtimeRoot,
      "workflow-products",
      "assets",
      safeSegment(productId),
    );
    return { productId, productKey, cacheDir };
  };

  const resolveInput = async (input: ProductStorageAssetInput) => {
    if (!args.resultContext) {
      throw new Error("workflow resultContext is unavailable");
    }
    return args.resultContext.resolveArtifact({
      fieldName: input.assetId || input.label || "product asset",
      rawPath: input.rawPath,
      fallbackPath: input.fallbackPath,
    });
  };

  const makeAsset = async (
    input: ProductStorageAssetInput,
    resolved: WorkflowResolvedArtifact | null,
    cacheDir: string,
  ): Promise<WorkflowProductAsset> => {
    const assetId = safeId(
      input.assetId || input.label || input.productAssetPath,
    );
    const relativePath = safeSegment(
      input.productAssetPath ||
        input.fallbackPath ||
        resolved?.entryPath ||
        assetId,
      assetId,
    );
    const label = cleanString(input.label) || assetId;
    if (!resolved) {
      return {
        assetId,
        label,
        path: relativePath,
        relativePath,
        contentType: cleanString(input.contentType) || undefined,
        sourceKind: "missing",
        diagnostics: ["artifact not resolved"],
      };
    }
    const targetPath = joinPath(cacheDir, relativePath);
    await writeRuntimeTextFile(targetPath, resolved.text);
    return {
      assetId,
      label,
      path: relativePath,
      relativePath,
      contentType: cleanString(input.contentType) || undefined,
      sourceKind: "product-cache",
      localPath: targetPath,
      entryPath: resolved.entryPath,
      size: await statAsset(targetPath),
    };
  };

  const api: ProductStorageApi = {
    async cacheBundleAsset(input) {
      const { cacheDir } = productBase("adhoc");
      return makeAsset(input, await resolveInput(input), cacheDir);
    },
    async registerLocalAsset(input) {
      const { cacheDir } = productBase("adhoc");
      return makeAsset(input, await resolveInput(input), cacheDir);
    },
    async registerProduct(input) {
      const { productId, productKey, cacheDir } = productBase(
        input.productKey || input.kind,
      );
      const existing = getWorkflowProduct(productId);
      const createdAt = existing?.createdAt || nowIso();
      const assets: WorkflowProductAsset[] = [];
      for (const assetInput of input.assets || []) {
        try {
          const resolved = await resolveInput(assetInput);
          assets.push(await makeAsset(assetInput, resolved, cacheDir));
        } catch (error) {
          assets.push({
            assetId: safeId(assetInput.assetId || assetInput.label),
            label: cleanString(assetInput.label) || safeId(assetInput.assetId),
            path: safeSegment(
              assetInput.productAssetPath || assetInput.fallbackPath,
            ),
            relativePath: safeSegment(
              assetInput.productAssetPath || assetInput.fallbackPath,
            ),
            contentType: cleanString(assetInput.contentType) || undefined,
            sourceKind: "missing",
            diagnostics: [
              error instanceof Error ? error.message : String(error),
            ],
          });
        }
      }
      const record: WorkflowProductRecord = {
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
        storageMode: "persistent-cache",
        workspaceDir: workspaceDir || undefined,
        cacheDir,
        resultJsonPath: resultJsonPath || undefined,
        assets,
        metadata: isRecord(input.metadata) ? { ...input.metadata } : {},
        createdAt,
        updatedAt: nowIso(),
      };
      persistProduct(record);
      return cloneRecord(record);
    },
    listProducts: listWorkflowProducts,
    getProduct: getWorkflowProduct,
    removeProduct: removeWorkflowProduct,
    resolveProductAsset(productId, assetId) {
      const product = getWorkflowProduct(productId);
      if (!product) return null;
      return (
        product.assets.find((asset) => asset.assetId === safeId(assetId)) ||
        null
      );
    },
    readProductAssetPreview,
  };
  return api;
}

export async function readProductAssetPreview(
  productIdRaw: string,
  assetIdRaw: string,
  options?: { maxBytes?: number },
): Promise<WorkflowProductPreview> {
  const product = getWorkflowProduct(productIdRaw);
  const assetId = safeId(assetIdRaw, "");
  const asset = product?.assets.find((entry) => entry.assetId === assetId);
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
  if (!product || !asset) {
    return { ...fallback, error: "product asset not found" };
  }
  const path = cleanString(asset.localPath);
  if (!path || !(await runtimePathExists(path))) {
    return {
      ...fallback,
      path: asset.path,
      error: "product asset file is missing",
    };
  }
  const stat = await statRuntimePath(path);
  const kind = inferPreviewKind(path, asset.contentType);
  const maxBytes = Math.max(
    4096,
    Number(options?.maxBytes || DEFAULT_PREVIEW_BYTES) || DEFAULT_PREVIEW_BYTES,
  );
  if (kind === "binary") {
    return {
      productId: product.productId,
      assetId: asset.assetId,
      path: asset.path,
      exists: true,
      previewable: false,
      truncated: false,
      kind,
      language: "text",
      text: "",
      size: stat.size,
      error: "binary or unsupported file type",
    };
  }
  if (stat.size > maxBytes) {
    return {
      productId: product.productId,
      assetId: asset.assetId,
      path: asset.path,
      exists: true,
      previewable: false,
      truncated: true,
      kind,
      language: languageForPath(path, kind, asset.contentType),
      text: "",
      size: stat.size,
      error: `file is too large to preview (${stat.size} bytes)`,
    };
  }
  const text = await readRuntimeTextFile(path);
  if (text.includes("\u0000")) {
    return {
      productId: product.productId,
      assetId: asset.assetId,
      path: asset.path,
      exists: true,
      previewable: false,
      truncated: false,
      kind: "binary",
      language: "text",
      text: "",
      size: stat.size,
      error: "file contains binary content",
    };
  }
  return {
    productId: product.productId,
    assetId: asset.assetId,
    path: asset.path,
    exists: true,
    previewable: true,
    truncated: false,
    kind,
    language: languageForPath(path, kind, asset.contentType),
    text,
    formattedText: kind === "json" ? prettyJson(text) : text,
    size: stat.size,
  };
}

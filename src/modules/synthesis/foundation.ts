import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import {
  assertManagedRelativePath,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  MANAGED_TRANSACTION_ID_MAX_LENGTH,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  validateManagedRelativePathSet,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import { createSynthesisRepository } from "./repository";
import { joinPath } from "../../utils/path";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
  sha256SynthesisEngineText,
} from "../../../packages/synthesis-engine/src/canonicalJson";
import { canonicalSynthesisTopicPathId } from "../../../packages/synthesis-application/src/topicCanonical";

export const SYNTHESIS_SCHEMA_VERSION = "1.0.0";

export type CanonicalEnvelope<T = unknown> = {
  schema_id: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  data: T;
  [key: string]: unknown;
};

export type CanonicalEnvelopeParseResult<T = unknown> = {
  envelope: CanonicalEnvelope<T>;
  data: T;
  warnings: string[];
};

export class SynthesisSchemaRegistry {
  private ajv = new Ajv({ allErrors: true, strict: false, logger: false });

  private validators = new Map<string, ValidateFunction>();

  registerDataSchema(schemaId: string, schema: AnySchema) {
    const normalized = String(schemaId || "").trim();
    if (!normalized) {
      throw new Error("schemaId must be non-empty");
    }
    this.validators.set(normalized, this.ajv.compile(schema));
  }

  parseEnvelope<T = unknown>(input: unknown, schemaId: string) {
    const validator = this.validators.get(schemaId);
    if (!validator) {
      throw new Error(`schema not registered: ${schemaId}`);
    }
    return parseCanonicalEnvelope<T>(input, {
      schemaId,
      validateData(data) {
        return Boolean(validator(data));
      },
    });
  }

  validateData(schemaId: string, data: unknown) {
    const validator = this.validators.get(schemaId);
    if (!validator) {
      throw new Error(`schema not registered: ${schemaId}`);
    }
    const ok = Boolean(validator(data));
    return {
      ok,
      errors: ok
        ? []
        : (validator.errors || []).map((entry) => entry.message || ""),
    };
  }
}

export type FoundationPrefs = {
  autoWatchEnabled: boolean;
  autoRebuildRegistry: boolean;
  autoRebuildGraph: "off" | "idle" | "auto";
  autoScanStalenessEnabled: boolean;
  rebuildDebounceMs: number;
  rebuildMaxAutoGraphItems: number;
  graphLayoutDefaultPreset: "compact" | "balanced" | "expanded";
  graphLayoutComputeAllPresets: boolean;
  runHashCheckOnStartup: boolean;
};

export type SynthesisKnowledgeGraphScope =
  | "topics"
  | "concepts"
  | "topic-graph"
  | "citation-graph"
  | "tags"
  | "sync";

export type SynthesisKnowledgeGraphPaths = {
  synthesisRoot: string;
  topicsRoot: string;
  conceptsRoot: string;
  topicGraphRoot: string;
  citationGraphRoot: string;
  tagsRoot: string;
  syncRoot: string;
  sidecarRoot: string;
  transactionsRoot: string;
  receiptsLog: string;
  eventsLog: string;
  diagnosticsLog: string;
  projectionRegistry: string;
};

export type CanonicalStoreChangedEvent = {
  event: "canonical-store-changed";
  scope: SynthesisKnowledgeGraphScope;
  changed_assets: string[];
  transaction_id: string;
  created_at: string;
};

export type CanonicalTransactionReceipt = {
  schema_id: "synthesis.canonical_store_transaction_receipt";
  schema_version: string;
  transaction_id: string;
  scope: SynthesisKnowledgeGraphScope;
  status: "committed";
  changed_assets: string[];
  created_at: string;
};

export type CanonicalDiagnostic = {
  schema_id: "synthesis.canonical_store_diagnostic";
  schema_version: string;
  transaction_id?: string;
  scope?: SynthesisKnowledgeGraphScope;
  code: string;
  message: string;
  asset_path?: string;
  details?: unknown;
  created_at: string;
};

export type ProjectionState = {
  target: string;
  schema_version: string;
  source_manifest_hash: string;
  stale: boolean;
  stale_reason?: string;
  last_transaction_id?: string;
  last_marked_stale_at?: string;
  last_rebuild_at?: string;
  diagnostics: unknown[];
};

export type ProjectionRegistryState = {
  schema_id: "synthesis.projection_registry_state";
  schema_version: string;
  updated_at: string;
  projections: Record<string, ProjectionState>;
};

const ENVELOPE_KEYS = new Set([
  "schema_id",
  "schema_version",
  "created_at",
  "updated_at",
  "data",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function normalizeNonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function normalizeMarkdown(input: unknown) {
  return String(input ?? "").replace(/\r\n?/g, "\n");
}

export function sha256(input: unknown) {
  return sha256SynthesisEngineText(input);
}

export function canonicalizeJson(value: unknown) {
  return canonicalizeSynthesisEngineJson(value);
}

export function hashCanonicalJson(value: unknown) {
  return hashSynthesisEngineCanonicalJson(value);
}

export function topicPathId(topicId: string) {
  return canonicalSynthesisTopicPathId(topicId);
}

export function hashMarkdown(value: unknown) {
  return sha256(normalizeMarkdown(value));
}

export function createCanonicalEnvelope<T>(args: {
  schemaId: string;
  data: T;
  now?: string;
  schemaVersion?: string;
}): CanonicalEnvelope<T> {
  const timestamp = args.now || nowIso();
  return {
    schema_id: args.schemaId,
    schema_version: args.schemaVersion || SYNTHESIS_SCHEMA_VERSION,
    created_at: timestamp,
    updated_at: timestamp,
    data: args.data,
  };
}

export function parseCanonicalEnvelope<T = unknown>(
  input: unknown,
  args: {
    schemaId?: string;
    validateData?: (data: unknown) => boolean;
  } = {},
): CanonicalEnvelopeParseResult<T> {
  if (!isObject(input)) {
    throw new Error("canonical envelope must be an object");
  }
  const schemaId = String(input.schema_id || "");
  if (!schemaId) {
    throw new Error("canonical envelope missing schema_id");
  }
  if (args.schemaId && schemaId !== args.schemaId) {
    throw new Error(`unexpected schema_id: ${schemaId}`);
  }
  if (!String(input.schema_version || "")) {
    throw new Error("canonical envelope missing schema_version");
  }
  if (!String(input.created_at || "")) {
    throw new Error("canonical envelope missing created_at");
  }
  if (!String(input.updated_at || "")) {
    throw new Error("canonical envelope missing updated_at");
  }
  if (!Object.prototype.hasOwnProperty.call(input, "data")) {
    throw new Error("canonical envelope missing data");
  }
  if (args.validateData && !args.validateData(input.data)) {
    throw new Error(
      `schema validation failed for canonical envelope: ${schemaId}`,
    );
  }
  const unknownFields = Object.keys(input)
    .filter((key) => !ENVELOPE_KEYS.has(key))
    .sort((left, right) => left.localeCompare(right));
  return {
    envelope: input as CanonicalEnvelope<T>,
    data: input.data as T,
    warnings: unknownFields.length
      ? [`unknown_top_level_fields: ${unknownFields.join(", ")}`]
      : [],
  };
}

export class LibraryWriteLock {
  private tails = new Map<number, Promise<unknown>>();

  async runExclusive<T>(libraryIdRaw: number, operation: () => Promise<T> | T) {
    const libraryId = normalizePositiveInteger(libraryIdRaw);
    if (!libraryId) {
      throw new Error("libraryId must be a positive integer");
    }
    const previous = this.tails.get(libraryId) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(
      libraryId,
      previous.then(
        () => current,
        () => current,
      ),
    );
    await previous.catch(() => {
      // A failed previous operation must not permanently poison the lock.
    });
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(libraryId) === current) {
        this.tails.delete(libraryId);
      }
    }
  }
}

export function checkBaseHashes(args: {
  current: Record<string, string | undefined>;
  base: Record<string, string | undefined>;
}):
  | { ok: true; mismatches: [] }
  | {
      ok: false;
      mismatches: Array<{ name: string; base: string; current: string }>;
    } {
  const names = Array.from(
    new Set([
      ...Object.keys(args.current || {}),
      ...Object.keys(args.base || {}),
    ]),
  ).sort((left, right) => left.localeCompare(right));
  const mismatches = names
    .filter(
      (name) =>
        String(args.current[name] || "") !== String(args.base[name] || ""),
    )
    .map((name) => ({
      name,
      base: String(args.base[name] || ""),
      current: String(args.current[name] || ""),
    }));
  return mismatches.length
    ? { ok: false, mismatches }
    : { ok: true, mismatches: [] };
}

export function defaultSynthesisFoundationPrefs(): FoundationPrefs {
  return {
    autoWatchEnabled: true,
    autoRebuildRegistry: true,
    autoRebuildGraph: "idle",
    autoScanStalenessEnabled: true,
    rebuildDebounceMs: 1500,
    rebuildMaxAutoGraphItems: 500,
    graphLayoutDefaultPreset: "balanced",
    graphLayoutComputeAllPresets: false,
    runHashCheckOnStartup: true,
  };
}

function canonicalJsonText(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readRuntimeJson<T = unknown>(path: string): Promise<T | null> {
  const text = await readRuntimeTextFile(path);
  if (!text.trim()) {
    return null;
  }
  return JSON.parse(text) as T;
}

async function writeRuntimeJson(path: string, value: unknown) {
  await writeRuntimeTextFile(path, canonicalJsonText(value));
}

function synthesisRepositoryForRoot(root: string) {
  return createSynthesisRepository({
    runtimeRoot: resolveSynthesisPersistenceRoot(root),
  });
}

function parseProjectionDiagnostics(value: unknown): {
  diagnostics: unknown[];
  last_transaction_id?: string;
  last_marked_stale_at?: string;
  last_rebuild_at?: string;
  schema_version?: string;
} {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      return {
        diagnostics: Array.isArray(record.diagnostics)
          ? record.diagnostics
          : [],
        last_transaction_id:
          typeof record.last_transaction_id === "string"
            ? record.last_transaction_id
            : undefined,
        last_marked_stale_at:
          typeof record.last_marked_stale_at === "string"
            ? record.last_marked_stale_at
            : undefined,
        last_rebuild_at:
          typeof record.last_rebuild_at === "string"
            ? record.last_rebuild_at
            : undefined,
        schema_version:
          typeof record.schema_version === "string"
            ? record.schema_version
            : undefined,
      };
    }
  } catch {
    // Ignore malformed legacy diagnostics; callers will rebuild projection state.
  }
  return { diagnostics: [] };
}

function projectionStateFromCacheBasis(row: {
  cacheKey: string;
  scopeRef?: string;
  status?: string;
  basisKind?: string;
  basisValue?: string;
  sourceHash?: string;
  refreshedAt?: string;
  staleReason?: string;
  diagnosticsJson?: string;
  updatedAt?: string;
}): ProjectionState | null {
  const target =
    String(row.scopeRef || "").trim() ||
    String(row.cacheKey || "")
      .replace(/^projection:/, "")
      .trim();
  if (!target) {
    return null;
  }
  const diagnostics = parseProjectionDiagnostics(row.diagnosticsJson);
  const stale = row.status === "stale";
  return {
    target,
    schema_version:
      diagnostics.schema_version ||
      String(row.basisKind || "").trim() ||
      SYNTHESIS_SCHEMA_VERSION,
    source_manifest_hash: String(row.sourceHash || "").trim(),
    stale,
    stale_reason: stale ? String(row.staleReason || "").trim() : undefined,
    last_transaction_id:
      diagnostics.last_transaction_id || String(row.basisValue || "").trim(),
    last_marked_stale_at:
      diagnostics.last_marked_stale_at ||
      (stale ? String(row.updatedAt || row.refreshedAt || "").trim() : ""),
    last_rebuild_at:
      diagnostics.last_rebuild_at ||
      (!stale ? String(row.refreshedAt || row.updatedAt || "").trim() : ""),
    diagnostics: diagnostics.diagnostics,
  };
}

function projectionDiagnosticsJson(state: ProjectionState) {
  return JSON.stringify({
    diagnostics: (state.diagnostics || []).map((entry) =>
      sanitizeDiagnosticValue(entry),
    ),
    last_transaction_id: state.last_transaction_id || "",
    last_marked_stale_at: state.last_marked_stale_at || "",
    last_rebuild_at: state.last_rebuild_at || "",
    schema_version: state.schema_version || SYNTHESIS_SCHEMA_VERSION,
  });
}

function writeCanonicalStoreRecordToDb(args: {
  root: string;
  kind: "receipt" | "event" | "diagnostic";
  transactionId?: string;
  scope?: string;
  assetPath?: string;
  payload: unknown;
  createdAt: string;
}) {
  const repository = synthesisRepositoryForRoot(args.root);
  const recordId = [
    "canonical-store",
    args.kind,
    args.transactionId || "no-transaction",
    hashCanonicalJson(args.payload).slice(
      "sha256:".length,
      "sha256:".length + 16,
    ),
  ].join(":");
  repository.upsertCanonicalStoreRecord({
    recordId,
    recordKind: args.kind,
    transactionId: args.transactionId,
    scope: args.scope,
    assetPath: args.assetPath,
    payloadJson: JSON.stringify(args.payload),
    createdAt: args.createdAt,
  });
}

function isKnownKgScope(value: unknown): value is SynthesisKnowledgeGraphScope {
  return [
    "topics",
    "concepts",
    "topic-graph",
    "citation-graph",
    "tags",
    "sync",
  ].includes(String(value || ""));
}

function normalizeKgScope(value: unknown): SynthesisKnowledgeGraphScope {
  if (isKnownKgScope(value)) {
    return value;
  }
  throw new Error(`unknown synthesis KG scope: ${String(value || "")}`);
}

export function normalizeCanonicalAssetPath(value: unknown) {
  const input = String(value || "")
    .trim()
    .replace(/\\/g, "/");
  if (!input) {
    throw new Error("canonical asset path must be non-empty");
  }
  const normalizedPath = assertManagedRelativePath(input);
  const [scope] = normalizedPath.split("/");
  if (!isKnownKgScope(scope)) {
    throw new Error(`unknown canonical asset scope: ${scope || "(empty)"}`);
  }
  return normalizedPath;
}

export function canonicalAssetFileName(prefix: unknown, stableId: unknown) {
  const safePrefix =
    String(prefix || "asset")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "asset";
  const digest = hashCanonicalJson(String(stableId ?? "")).slice(
    "sha256:".length,
    "sha256:".length + 24,
  );
  return assertManagedRelativePath(`${safePrefix}_${digest}.json`);
}

export function canonicalAssetPath(
  scope: SynthesisKnowledgeGraphScope,
  collection: unknown,
  prefix: unknown,
  stableId: unknown,
) {
  const normalizedScope = normalizeKgScope(scope);
  const collectionPath = assertManagedRelativePath(String(collection || ""));
  return normalizeCanonicalAssetPath(
    `${normalizedScope}/${collectionPath}/${canonicalAssetFileName(prefix, stableId)}`,
  );
}

function validateCanonicalAssetPathSet(paths: string[]) {
  const result = validateManagedRelativePathSet(paths);
  if (!result.ok) {
    throw new Error(
      result.diagnostics
        .map(
          (entry) =>
            `${entry.code}: ${
              entry.relativePath || entry.segment || entry.message
            }`,
        )
        .join("; "),
    );
  }
}

function safeTransactionId(value: unknown, fallbackInput: unknown) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalized) {
    if (normalized.length <= MANAGED_TRANSACTION_ID_MAX_LENGTH) {
      return normalized;
    }
    const digest = hashCanonicalJson({ normalized, fallbackInput }).slice(
      "sha256:".length,
      "sha256:".length + 24,
    );
    const prefix = normalized.slice(
      0,
      Math.max(0, MANAGED_TRANSACTION_ID_MAX_LENGTH - digest.length - 1),
    );
    return `${prefix}-${digest}`.replace(/^-+|-+$/g, "") || `tx-${digest}`;
  }
  return `tx-${hashCanonicalJson(fallbackInput).slice("sha256:".length, "sha256:".length + 16)}`;
}

function redactDiagnosticString(value: string) {
  return value
    .replace(/[A-Za-z]:[\\/][^\s"'`<>]+/g, (match) => {
      return `path:${hashCanonicalJson(match).slice("sha256:".length, "sha256:".length + 12)}`;
    })
    .replace(
      /\/[^\s"'`<>]*(?:synthesis|runtime|zotero|tmp)[^\s"'`<>]*/gi,
      (match) => {
        return `path:${hashCanonicalJson(match).slice("sha256:".length, "sha256:".length + 12)}`;
      },
    )
    .replace(
      /\b(token|secret|password|authorization|bearer)(\s*[:=]\s*)([^\s,;]+)/gi,
      "$1$2[redacted]",
    );
}

function sanitizeDiagnosticValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactDiagnosticString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeDiagnosticValue(entry));
  }
  if (isObject(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (/token|secret|password|authorization|bearer/i.test(key)) {
        output[key] = "[redacted]";
      } else {
        output[key] = sanitizeDiagnosticValue(entry);
      }
    }
    return output;
  }
  return value;
}

function validateCanonicalAssetData(args: {
  registry: SynthesisSchemaRegistry;
  schemaId: string;
  data: unknown;
}) {
  const result = args.registry.validateData(args.schemaId, args.data);
  if (!result.ok) {
    throw new Error(
      `schema validation failed for ${args.schemaId}: ${result.errors.join("; ")}`,
    );
  }
}

export function buildSynthesisKnowledgeGraphPaths(
  root: string,
): SynthesisKnowledgeGraphPaths {
  const synthesisRoot = resolveSynthesisRuntimeFileRoot(root);
  const sidecarRoot = joinPath(synthesisRoot, "sidecar");
  return {
    synthesisRoot,
    topicsRoot: joinPath(synthesisRoot, "topics"),
    conceptsRoot: joinPath(synthesisRoot, "concepts"),
    topicGraphRoot: joinPath(synthesisRoot, "topic-graph"),
    citationGraphRoot: joinPath(synthesisRoot, "citation-graph"),
    tagsRoot: joinPath(synthesisRoot, "tags"),
    syncRoot: joinPath(synthesisRoot, "sync"),
    sidecarRoot,
    transactionsRoot: joinPath(sidecarRoot, "transactions"),
    receiptsLog: joinPath(sidecarRoot, "canonical-store-receipts.jsonl"),
    eventsLog: joinPath(sidecarRoot, "canonical-store-events.jsonl"),
    diagnosticsLog: joinPath(sidecarRoot, "canonical-store-diagnostics.jsonl"),
    projectionRegistry: joinPath(sidecarRoot, "projection-registry.json"),
  };
}

export async function initializeSynthesisKnowledgeGraphStore(root: string) {
  const paths = buildSynthesisKnowledgeGraphPaths(root);
  await ensureRuntimeDirectory(paths.synthesisRoot);
  return paths;
}

export async function readCanonicalJsonAsset<T = unknown>(args: {
  root: string;
  relativePath: string;
  schemaId: string;
  registry: SynthesisSchemaRegistry;
}): Promise<CanonicalEnvelopeParseResult<T> | null> {
  const paths = buildSynthesisKnowledgeGraphPaths(args.root);
  const relativePath = normalizeCanonicalAssetPath(args.relativePath);
  const raw = await readRuntimeJson(
    joinPath(paths.synthesisRoot, relativePath),
  );
  if (!raw) {
    return null;
  }
  return args.registry.parseEnvelope<T>(raw, args.schemaId);
}

export async function writeCanonicalJsonAsset<T>(args: {
  root: string;
  relativePath: string;
  schemaId: string;
  data: T;
  registry: SynthesisSchemaRegistry;
  now?: string;
  schemaVersion?: string;
}) {
  await initializeSynthesisKnowledgeGraphStore(args.root);
  validateCanonicalAssetData({
    registry: args.registry,
    schemaId: args.schemaId,
    data: args.data,
  });
  const relativePath = normalizeCanonicalAssetPath(args.relativePath);
  const envelope = createCanonicalEnvelope({
    schemaId: args.schemaId,
    schemaVersion: args.schemaVersion,
    data: args.data,
    now: args.now,
  });
  const paths = buildSynthesisKnowledgeGraphPaths(args.root);
  const targetPath = joinPath(paths.synthesisRoot, relativePath);
  await writeRuntimeJson(targetPath, envelope);
  return { path: targetPath, relativePath, envelope };
}

export async function writeCanonicalDiagnostic(args: {
  root: string;
  diagnostic: Omit<CanonicalDiagnostic, "schema_id" | "schema_version">;
}) {
  const diagnostic: CanonicalDiagnostic = {
    schema_id: "synthesis.canonical_store_diagnostic",
    schema_version: SYNTHESIS_SCHEMA_VERSION,
    transaction_id: args.diagnostic.transaction_id,
    scope: args.diagnostic.scope,
    code: redactDiagnosticString(args.diagnostic.code),
    message: redactDiagnosticString(args.diagnostic.message),
    asset_path: args.diagnostic.asset_path
      ? normalizeCanonicalAssetPath(args.diagnostic.asset_path)
      : undefined,
    details: sanitizeDiagnosticValue(args.diagnostic.details),
    created_at: args.diagnostic.created_at,
  };
  writeCanonicalStoreRecordToDb({
    root: args.root,
    kind: "diagnostic",
    transactionId: diagnostic.transaction_id,
    scope: diagnostic.scope,
    assetPath: diagnostic.asset_path,
    payload: diagnostic,
    createdAt: diagnostic.created_at,
  });
  return diagnostic;
}

export async function readProjectionRegistryState(
  root: string,
): Promise<ProjectionRegistryState> {
  const repository = synthesisRepositoryForRoot(root);
  const projections = Object.fromEntries(
    repository
      .listCacheBasis({ cacheKinds: ["projection_registry"] })
      .map(projectionStateFromCacheBasis)
      .filter((entry): entry is ProjectionState => Boolean(entry))
      .map((entry) => [entry.target, entry] as const),
  );
  return {
    schema_id: "synthesis.projection_registry_state",
    schema_version: SYNTHESIS_SCHEMA_VERSION,
    updated_at: nowIso(),
    projections,
  };
}

async function writeProjectionRegistryState(
  root: string,
  state: ProjectionRegistryState,
) {
  const repository = synthesisRepositoryForRoot(root);
  for (const projection of Object.values(state.projections || {})) {
    repository.upsertCacheBasis({
      cacheKey: `projection:${projection.target}`,
      cacheKind: "projection_registry",
      scopeKind: "projection",
      scopeRef: projection.target,
      status: projection.stale ? "stale" : "ready",
      basisKind: projection.schema_version || SYNTHESIS_SCHEMA_VERSION,
      basisValue: projection.last_transaction_id || "",
      sourceHash: projection.source_manifest_hash || "",
      policyVersion: "projection-registry-db-v1",
      refreshedAt:
        projection.last_rebuild_at ||
        projection.last_marked_stale_at ||
        state.updated_at,
      staleReason: projection.stale ? projection.stale_reason || "" : "",
      diagnosticsJson: projectionDiagnosticsJson(projection),
      updatedAt: state.updated_at,
    });
  }
}

export async function markProjectionStale(args: {
  root: string;
  target: string;
  transactionId: string;
  sourceManifestHash?: string;
  reason?: string;
  now?: string;
}) {
  const timestamp = args.now || nowIso();
  const target = String(args.target || "").trim();
  if (!target) {
    throw new Error("projection target must be non-empty");
  }
  const state = await readProjectionRegistryState(args.root);
  const current = state.projections[target];
  state.projections[target] = {
    target,
    schema_version: current?.schema_version || SYNTHESIS_SCHEMA_VERSION,
    source_manifest_hash:
      args.sourceManifestHash || current?.source_manifest_hash || "",
    stale: true,
    stale_reason:
      args.reason || current?.stale_reason || "canonical-store-changed",
    last_transaction_id: args.transactionId,
    last_marked_stale_at: timestamp,
    last_rebuild_at: current?.last_rebuild_at,
    diagnostics: current?.diagnostics || [],
  };
  state.updated_at = timestamp;
  await writeProjectionRegistryState(args.root, state);
  return state.projections[target];
}

export async function recordProjectionRebuild(args: {
  root: string;
  target: string;
  schemaVersion?: string;
  sourceManifestHash?: string;
  diagnostics?: unknown[];
  now?: string;
}) {
  const timestamp = args.now || nowIso();
  const target = String(args.target || "").trim();
  if (!target) {
    throw new Error("projection target must be non-empty");
  }
  const state = await readProjectionRegistryState(args.root);
  const current = state.projections[target];
  state.projections[target] = {
    target,
    schema_version:
      args.schemaVersion || current?.schema_version || SYNTHESIS_SCHEMA_VERSION,
    source_manifest_hash:
      args.sourceManifestHash || current?.source_manifest_hash || "",
    stale: false,
    stale_reason: undefined,
    last_transaction_id: current?.last_transaction_id,
    last_marked_stale_at: current?.last_marked_stale_at,
    last_rebuild_at: timestamp,
    diagnostics: (args.diagnostics || []).map((entry) =>
      sanitizeDiagnosticValue(entry),
    ),
  };
  state.updated_at = timestamp;
  await writeProjectionRegistryState(args.root, state);
  return state.projections[target];
}

export async function writeCanonicalTransaction(args: {
  root: string;
  scope: SynthesisKnowledgeGraphScope;
  assets: Array<{
    relativePath: string;
    schemaId: string;
    data: unknown;
    schemaVersion?: string;
  }>;
  deleteAssets?: string[];
  registry: SynthesisSchemaRegistry;
  transactionId?: string;
  projectionTargets?: string[];
  sourceManifestHash?: string;
  now?: string;
}) {
  const timestamp = args.now || nowIso();
  const scope = normalizeKgScope(args.scope);
  const assets = args.assets.map((asset) => ({
    ...asset,
    relativePath: normalizeCanonicalAssetPath(asset.relativePath),
  }));
  const deleteAssets = (args.deleteAssets || [])
    .map(normalizeCanonicalAssetPath)
    .filter(
      (relativePath) =>
        !assets.some((asset) => asset.relativePath === relativePath),
    );
  validateCanonicalAssetPathSet(
    assets.map((asset) => asset.relativePath).concat(deleteAssets),
  );
  if (assets.length === 0 && deleteAssets.length === 0) {
    throw new Error("canonical transaction requires at least one asset");
  }
  const transactionId = safeTransactionId(args.transactionId, {
    scope,
    assets: assets
      .map((asset) => asset.relativePath)
      .concat(deleteAssets.map((relativePath) => `delete:${relativePath}`)),
    timestamp,
  });
  const paths = await initializeSynthesisKnowledgeGraphStore(args.root);
  const backups = new Map<
    string,
    { existed: boolean; text: string; promoted: boolean }
  >();
  try {
    for (const asset of assets) {
      validateCanonicalAssetData({
        registry: args.registry,
        schemaId: asset.schemaId,
        data: asset.data,
      });
    }
    for (const asset of assets) {
      const envelope = createCanonicalEnvelope({
        schemaId: asset.schemaId,
        schemaVersion: asset.schemaVersion,
        data: asset.data,
        now: timestamp,
      });
      const stagePath = joinPath(
        paths.transactionsRoot,
        transactionId,
        asset.relativePath,
      );
      await writeRuntimeJson(stagePath, envelope);
      args.registry.parseEnvelope(envelope, asset.schemaId);
    }
    for (const asset of assets) {
      const staged = await readRuntimeTextFile(
        joinPath(paths.transactionsRoot, transactionId, asset.relativePath),
      );
      const targetPath = joinPath(paths.synthesisRoot, asset.relativePath);
      if (!backups.has(asset.relativePath)) {
        backups.set(asset.relativePath, {
          existed: await runtimePathExists(targetPath),
          text: await readRuntimeTextFile(targetPath),
          promoted: false,
        });
      }
      await writeRuntimeTextFile(targetPath, staged);
      const backup = backups.get(asset.relativePath);
      if (backup) {
        backup.promoted = true;
      }
    }
    for (const relativePath of deleteAssets) {
      const targetPath = joinPath(paths.synthesisRoot, relativePath);
      if (!backups.has(relativePath)) {
        backups.set(relativePath, {
          existed: await runtimePathExists(targetPath),
          text: await readRuntimeTextFile(targetPath),
          promoted: false,
        });
      }
      if (await runtimePathExists(targetPath)) {
        await removeRuntimePath(targetPath);
      }
      const backup = backups.get(relativePath);
      if (backup) {
        backup.promoted = true;
      }
    }
    const changedAssets = assets
      .map((asset) => asset.relativePath)
      .concat(deleteAssets)
      .sort((left, right) => left.localeCompare(right));
    const receipt: CanonicalTransactionReceipt = {
      schema_id: "synthesis.canonical_store_transaction_receipt",
      schema_version: SYNTHESIS_SCHEMA_VERSION,
      transaction_id: transactionId,
      scope,
      status: "committed",
      changed_assets: changedAssets,
      created_at: timestamp,
    };
    writeCanonicalStoreRecordToDb({
      root: args.root,
      kind: "receipt",
      transactionId,
      scope,
      payload: receipt,
      createdAt: timestamp,
    });
    const event: CanonicalStoreChangedEvent = {
      event: "canonical-store-changed",
      scope,
      changed_assets: changedAssets,
      transaction_id: transactionId,
      created_at: timestamp,
    };
    writeCanonicalStoreRecordToDb({
      root: args.root,
      kind: "event",
      transactionId,
      scope,
      payload: event,
      createdAt: timestamp,
    });
    const projectionTargets = args.projectionTargets?.length
      ? args.projectionTargets
      : [scope];
    for (const target of projectionTargets) {
      await markProjectionStale({
        root: args.root,
        target,
        transactionId,
        sourceManifestHash: args.sourceManifestHash,
        now: timestamp,
      });
    }
    return { transactionId, receipt, event };
  } catch (error) {
    const rollbackDiagnostics: unknown[] = [];
    for (const [relativePath, backup] of [...backups.entries()].reverse()) {
      if (!backup.promoted) {
        continue;
      }
      const targetPath = joinPath(paths.synthesisRoot, relativePath);
      try {
        if (backup.existed) {
          await writeRuntimeTextFile(targetPath, backup.text);
        } else {
          await removeRuntimePath(targetPath);
        }
      } catch (rollbackError) {
        rollbackDiagnostics.push({
          relativePath,
          error:
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError),
        });
      }
    }
    await writeCanonicalDiagnostic({
      root: args.root,
      diagnostic: {
        transaction_id: transactionId,
        scope,
        code: "canonical_transaction_failed",
        message: error instanceof Error ? error.message : String(error),
        details:
          error instanceof Error
            ? {
                name: error.name,
                stack: error.stack,
                rollback: rollbackDiagnostics,
              }
            : error,
        created_at: timestamp,
      },
    });
    throw error;
  }
}

export async function writeCanonicalEnvelopeTextTransaction(args: {
  root: string;
  scope: SynthesisKnowledgeGraphScope;
  assets: Array<{
    relativePath: string;
    envelopeText: string;
  }>;
  transactionId?: string;
  projectionTargets?: string[];
  sourceManifestHash?: string;
  now?: string;
  onBeforePromoteAsset?: (asset: {
    relativePath: string;
    index: number;
  }) => void | Promise<void>;
}) {
  const timestamp = args.now || nowIso();
  const scope = normalizeKgScope(args.scope);
  const assets = args.assets.map((asset) => ({
    relativePath: normalizeCanonicalAssetPath(asset.relativePath),
    envelopeText: String(asset.envelopeText || ""),
  }));
  validateCanonicalAssetPathSet(assets.map((asset) => asset.relativePath));
  if (assets.length === 0) {
    throw new Error("canonical transaction requires at least one asset");
  }
  const transactionId = safeTransactionId(args.transactionId, {
    scope,
    assets: assets.map((asset) => asset.relativePath),
    timestamp,
  });
  const paths = await initializeSynthesisKnowledgeGraphStore(args.root);
  const backups = new Map<
    string,
    { existed: boolean; text: string; promoted: boolean }
  >();
  try {
    for (const asset of assets) {
      parseCanonicalEnvelope(JSON.parse(asset.envelopeText));
    }
    for (const asset of assets) {
      await writeRuntimeTextFile(
        joinPath(paths.transactionsRoot, transactionId, asset.relativePath),
        asset.envelopeText,
      );
    }
    for (const [index, asset] of assets.entries()) {
      const targetPath = joinPath(paths.synthesisRoot, asset.relativePath);
      if (!backups.has(asset.relativePath)) {
        backups.set(asset.relativePath, {
          existed: await runtimePathExists(targetPath),
          text: await readRuntimeTextFile(targetPath),
          promoted: false,
        });
      }
      await args.onBeforePromoteAsset?.({
        relativePath: asset.relativePath,
        index,
      });
      const staged = await readRuntimeTextFile(
        joinPath(paths.transactionsRoot, transactionId, asset.relativePath),
      );
      await writeRuntimeTextFile(targetPath, staged);
      const backup = backups.get(asset.relativePath);
      if (backup) {
        backup.promoted = true;
      }
    }
    const changedAssets = assets
      .map((asset) => asset.relativePath)
      .sort((left, right) => left.localeCompare(right));
    const receipt: CanonicalTransactionReceipt = {
      schema_id: "synthesis.canonical_store_transaction_receipt",
      schema_version: SYNTHESIS_SCHEMA_VERSION,
      transaction_id: transactionId,
      scope,
      status: "committed",
      changed_assets: changedAssets,
      created_at: timestamp,
    };
    writeCanonicalStoreRecordToDb({
      root: args.root,
      kind: "receipt",
      transactionId,
      scope,
      payload: receipt,
      createdAt: timestamp,
    });
    const event: CanonicalStoreChangedEvent = {
      event: "canonical-store-changed",
      scope,
      changed_assets: changedAssets,
      transaction_id: transactionId,
      created_at: timestamp,
    };
    writeCanonicalStoreRecordToDb({
      root: args.root,
      kind: "event",
      transactionId,
      scope,
      payload: event,
      createdAt: timestamp,
    });
    const projectionTargets = args.projectionTargets?.length
      ? args.projectionTargets
      : [scope];
    for (const target of projectionTargets) {
      await markProjectionStale({
        root: args.root,
        target,
        transactionId,
        sourceManifestHash: args.sourceManifestHash,
        now: timestamp,
      });
    }
    return { transactionId, receipt, event };
  } catch (error) {
    const rollbackDiagnostics: unknown[] = [];
    for (const [relativePath, backup] of [...backups.entries()].reverse()) {
      if (!backup.promoted) {
        continue;
      }
      const targetPath = joinPath(paths.synthesisRoot, relativePath);
      try {
        if (backup.existed) {
          await writeRuntimeTextFile(targetPath, backup.text);
        } else {
          await removeRuntimePath(targetPath);
        }
      } catch (rollbackError) {
        rollbackDiagnostics.push({
          relativePath,
          error:
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError),
        });
      }
    }
    await writeCanonicalDiagnostic({
      root: args.root,
      diagnostic: {
        transaction_id: transactionId,
        scope,
        code: "canonical_raw_transaction_failed",
        message: error instanceof Error ? error.message : String(error),
        details: {
          error:
            error instanceof Error
              ? { name: error.name, stack: error.stack }
              : error,
          rollback: rollbackDiagnostics,
        },
        created_at: timestamp,
      },
    });
    throw error;
  }
}

export function buildSynthesisStoragePaths(root: string, topicId?: string) {
  const synthesisRoot = resolveSynthesisRuntimeFileRoot(root);
  const sidecarRoot = joinPath(synthesisRoot, "sidecar");
  const topicRoot = topicId
    ? joinPath(synthesisRoot, "topics", topicId)
    : joinPath(synthesisRoot, "topics");
  return {
    synthesisRoot,
    topicsRoot: joinPath(synthesisRoot, "topics"),
    topicRoot,
    legacyCurrentMarkdown: topicId ? joinPath(topicRoot, "current.md") : "",
    legacyCurrentMetadata: topicId ? joinPath(topicRoot, "current.json") : "",
    currentRoot: topicId ? joinPath(topicRoot, "current") : "",
    currentAssetsRoot: topicId ? joinPath(topicRoot, "current", "assets") : "",
    currentManifest: topicId
      ? joinPath(topicRoot, "current", "manifest.json")
      : "",
    currentArtifact: topicId
      ? joinPath(topicRoot, "current", "artifact.json")
      : "",
    currentMetadata: topicId
      ? joinPath(topicRoot, "current", "metadata.json")
      : "",
    currentSectionsRoot: topicId
      ? joinPath(topicRoot, "current", "sections")
      : "",
    currentTopicDetailHtml: topicId
      ? joinPath(topicRoot, "current", "assets", "topic-detail.html")
      : "",
    currentTopicDetailHtmlMetadata: topicId
      ? joinPath(
          topicRoot,
          "current",
          "assets",
          "topic-detail.html.metadata.json",
        )
      : "",
    sidecarRoot,
    index: joinPath(sidecarRoot, "index.json"),
    artifactState: joinPath(sidecarRoot, "artifact-state.json"),
    deletedRoot: joinPath(synthesisRoot, "deleted"),
    deletedArtifacts: joinPath(sidecarRoot, "deleted-topic-artifacts.json"),
    topicDefinitions: joinPath(sidecarRoot, "topic-definitions.json"),
    resolvers: joinPath(sidecarRoot, "resolvers.json"),
    resolvedPaperSets: joinPath(sidecarRoot, "resolved-paper-sets.json"),
    unifiedCitationGraph: joinPath(sidecarRoot, "unified-citation-graph.json"),
    unifiedCitationLayouts: joinPath(
      sidecarRoot,
      "unified-citation-layouts.json",
    ),
    unifiedCitationGraphMetrics: joinPath(
      sidecarRoot,
      "unified-citation-graph-metrics.json",
    ),
    log: joinPath(sidecarRoot, "log.jsonl"),
  };
}

export function isValidHash(value: unknown) {
  return /^sha256:[a-f0-9]{64}$/.test(String(value || ""));
}

export function normalizeShardSize(value: unknown, fallback: number) {
  const parsed = normalizeNonNegativeInteger(value);
  return parsed || fallback;
}

function normalizePathForBoundary(value: string) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

function pathSegmentsForBoundary(value: string) {
  return normalizePathForBoundary(value)
    .split("/")
    .filter((segment) => segment.length > 0);
}

function parentPathForBoundary(value: string, levels = 1) {
  const normalized = normalizePathForBoundary(value);
  let current = normalized;
  for (let index = 0; index < levels; index += 1) {
    const slash = current.lastIndexOf("/");
    if (slash <= 0) {
      return current;
    }
    current = current.slice(0, slash);
  }
  return current;
}

export function resolveSynthesisPersistenceRoot(root: string) {
  const normalized = normalizePathForBoundary(root);
  const segments = pathSegmentsForBoundary(normalized);
  const leaf = (segments[segments.length - 1] || "").toLocaleLowerCase("en-US");
  const parent = (segments[segments.length - 2] || "").toLocaleLowerCase(
    "en-US",
  );
  if (leaf === "synthesis" && (parent === "data" || parent === "runtime")) {
    return parentPathForBoundary(normalized, 2);
  }
  if (leaf === "data" || leaf === "runtime" || leaf === "state") {
    return parentPathForBoundary(normalized, 1);
  }
  return normalized;
}

export function resolveSynthesisRuntimeFileRoot(root: string) {
  const persistenceRoot = resolveSynthesisPersistenceRoot(root);
  return getRuntimePersistencePaths(persistenceRoot).synthesisDataRoot;
}

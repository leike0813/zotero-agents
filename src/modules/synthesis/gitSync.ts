import { joinPath } from "../../utils/path";
import {
  collectRuntimeFiles,
  ensureRuntimeDirectory,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimeRelativePath,
  runtimePathExists,
  validateManagedRelativePath,
  validateManagedRelativePathSet,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import {
  buildSynthesisKnowledgeGraphPaths,
  createCanonicalEnvelope,
  hashCanonicalJson,
  initializeSynthesisKnowledgeGraphStore,
  writeCanonicalDiagnostic,
  writeCanonicalEnvelopeTextTransaction,
  type CanonicalTransactionReceipt,
} from "./foundation";

export const SYNTHESIS_GIT_SYNC_MANIFEST_SCHEMA_ID =
  "synthesis.git_sync_manifest";
export const SYNTHESIS_GIT_SYNC_SCHEMA_VERSION = "1.0.0";

export type SynthesisGitSyncQueueState =
  | "idle"
  | "queued"
  | "syncing"
  | "blocked_conflict"
  | "failed_retryable"
  | "failed_permanent"
  | "disabled";

export type SynthesisGitSyncDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  asset_path?: string;
  details?: unknown;
};

export type SynthesisGitSyncManifestAsset = {
  path: string;
  hash: string;
  bytes: number;
  schema_id?: string;
  schema_version?: string;
};

export type SynthesisGitSyncManifest = {
  generated_at: string;
  asset_count: number;
  assets: SynthesisGitSyncManifestAsset[];
  manifest_hash: string;
};

export type SynthesisGitSyncConflict = {
  asset_path: string;
  local_hash?: string;
  remote_hash?: string;
  base_hash?: string;
  reason: "both_changed" | "adapter_conflict";
};

export type SynthesisGitSyncConflictReport = {
  schema_id: "synthesis.git_sync_conflict_report";
  schema_version: string;
  conflict_id: string;
  status: "open" | "resolved" | "skipped";
  created_at: string;
  updated_at: string;
  conflicts: SynthesisGitSyncConflict[];
  diagnostics: SynthesisGitSyncDiagnostic[];
};

export type SynthesisGitSyncRunReceipt = {
  schema_id: "synthesis.git_sync_run_receipt";
  schema_version: string;
  run_id: string;
  status:
    | "success"
    | "blocked_conflict"
    | "failed_retryable"
    | "failed_permanent";
  started_at: string;
  completed_at: string;
  exported_asset_count: number;
  imported_asset_count: number;
  manifest_hash?: string;
  diagnostics: SynthesisGitSyncDiagnostic[];
  canonical_receipt?: CanonicalTransactionReceipt;
  retry_attempt?: number;
  next_retry_at?: string;
  last_retry_at?: string;
};

export type SynthesisGitSyncState = {
  schema_id: "synthesis.git_sync_state";
  schema_version: string;
  queue_state: SynthesisGitSyncQueueState;
  paused: boolean;
  adapter_configured: boolean;
  remote_url?: string;
  branch?: string;
  worktree_path: string;
  last_run?: SynthesisGitSyncRunReceipt;
  conflict_report?: SynthesisGitSyncConflictReport;
  diagnostics: SynthesisGitSyncDiagnostic[];
  allowed_actions: string[];
  retry_attempt?: number;
  next_retry_at?: string;
  last_retry_at?: string;
  updated_at: string;
};

export type SynthesisGitSyncValidationResult = {
  ok: boolean;
  manifest?: SynthesisGitSyncManifest;
  assets: SynthesisGitSyncManifestAsset[];
  diagnostics: SynthesisGitSyncDiagnostic[];
};

export type SynthesisGitSyncAdapterMergeResult = {
  status: "clean" | "conflict";
  localChangedFiles?: string[];
  remoteChangedFiles?: string[];
  conflicts?: SynthesisGitSyncConflict[];
  diagnostics?: SynthesisGitSyncDiagnostic[];
};

export type SynthesisGitSyncAdapter = {
  validateConfiguration?: () =>
    | Promise<{ ok: boolean; diagnostics?: SynthesisGitSyncDiagnostic[] }>
    | { ok: boolean; diagnostics?: SynthesisGitSyncDiagnostic[] };
  describeRemote?: () =>
    | Promise<{ remoteUrl?: string; branch?: string }>
    | { remoteUrl?: string; branch?: string };
  fetch?: (args: {
    worktreePath: string;
    remoteUrl?: string;
    branch?: string;
  }) =>
    | Promise<{ diagnostics?: SynthesisGitSyncDiagnostic[] } | void>
    | {
        diagnostics?: SynthesisGitSyncDiagnostic[];
      }
    | void;
  merge?: (args: {
    worktreePath: string;
    remoteUrl?: string;
    branch?: string;
    localManifest: SynthesisGitSyncManifest;
  }) =>
    | Promise<SynthesisGitSyncAdapterMergeResult>
    | SynthesisGitSyncAdapterMergeResult;
  push?: (args: {
    worktreePath: string;
    remoteUrl?: string;
    branch?: string;
    manifest: SynthesisGitSyncManifest;
  }) =>
    | Promise<{ diagnostics?: SynthesisGitSyncDiagnostic[] } | void>
    | {
        diagnostics?: SynthesisGitSyncDiagnostic[];
      }
    | void;
};

type ServiceOptions = {
  root: string;
  now?: () => string;
  adapter?: SynthesisGitSyncAdapter;
  debounceMs?: number;
  lockTtlMs?: number;
  retryDelaysMs?: number[];
  autoRetryEnabled?: boolean;
};

type SynthesisGitSyncLockFile = {
  schema_id: "synthesis.git_sync_lock";
  schema_version: string;
  run_id: string;
  owner: string;
  acquired_at: string;
  expires_at: string;
};

const EXPORT_ROOTS = [
  "tags",
  "topics",
  "concepts",
  "topic-graph",
  "citation-graph",
];

const PROJECTION_TARGETS = [
  "tag-index",
  "topic-graph-index",
  "concept-kb-index",
  "literature-registry-index",
  "citation-graph-index",
];

const MAX_IMPORT_ASSETS = 5000;
const MAX_IMPORT_BYTES = 50 * 1024 * 1024;
const MAX_SINGLE_ASSET_BYTES = 5 * 1024 * 1024;

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function canonicalJsonText(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeDiagnosticString(value: unknown) {
  return cleanString(value)
    .replace(/[A-Za-z]:[\\/][^\s"'`<>]+/g, (match) => {
      return `path:${hashCanonicalJson(match).slice("sha256:".length, 24)}`;
    })
    .replace(
      /\/[^\s"'`<>]*(?:synthesis|runtime|zotero|tmp)[^\s"'`<>]*/gi,
      (match) => `path:${hashCanonicalJson(match).slice("sha256:".length, 24)}`,
    )
    .replace(
      /\b(token|secret|password|authorization|bearer)(\s*[:=]\s*)([^\s,;]+)/gi,
      "$1$2[redacted]",
    );
}

function sanitizeDiagnosticValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeDiagnosticString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeDiagnosticValue(entry));
  }
  if (isRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = /token|secret|password|authorization|bearer/i.test(key)
        ? "[redacted]"
        : sanitizeDiagnosticValue(entry);
    }
    return output;
  }
  return value;
}

function diagnostic(args: {
  code: string;
  severity?: "info" | "warning" | "error";
  message: unknown;
  assetPath?: string;
  details?: unknown;
}): SynthesisGitSyncDiagnostic {
  return {
    code: sanitizeDiagnosticString(args.code),
    severity: args.severity || "warning",
    message: sanitizeDiagnosticString(args.message),
    asset_path: args.assetPath
      ? normalizeGitSyncAssetPath(args.assetPath).path
      : undefined,
    details: sanitizeDiagnosticValue(args.details),
  };
}

export function sanitizeGitSyncRemoteUrl(value: unknown) {
  const input = cleanString(value);
  if (!input) {
    return "";
  }
  return input
    .replace(/^([a-z][a-z0-9+.-]*:\/\/)([^/@\s]+)@/i, "$1[redacted]@")
    .replace(
      /([?&](?:token|password|secret|access_token)=)[^&#]+/gi,
      "$1[redacted]",
    )
    .replace(
      /\b(token|secret|password|authorization|bearer)(\s*[:=]\s*)([^\s,;]+)/gi,
      "$1$2[redacted]",
    );
}

export function normalizeGitSyncAssetPath(value: unknown): {
  ok: boolean;
  path: string;
  reason?: string;
} {
  const result = validateManagedRelativePath(value);
  if (!result.ok) {
    return {
      ok: false,
      path: result.normalizedPath || cleanString(value).replace(/\\/g, "/"),
      reason: result.diagnostics[0]?.code || "managed_path_invalid",
    };
  }
  return { ok: true, path: result.normalizedPath };
}

function isAllowedCanonicalSyncAsset(relativePath: string) {
  if (relativePath === "sync/sync-manifest.json") {
    return true;
  }
  if (!relativePath.endsWith(".json")) {
    return false;
  }
  if (
    relativePath.startsWith("state/") ||
    relativePath.includes("/state/") ||
    relativePath.includes("/tmp/") ||
    relativePath.includes("/temp/") ||
    relativePath.includes("/runtime/") ||
    relativePath.includes("/logs/") ||
    relativePath.includes("/workspaces/") ||
    relativePath.includes("/locks/")
  ) {
    return false;
  }
  return EXPORT_ROOTS.some((root) => relativePath.startsWith(`${root}/`));
}

function contentLooksSensitive(text: string) {
  return /\b(access[_-]?token|authorization|bearer|password|secret)\b/i.test(
    text,
  );
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function envelopeSchema(input: Record<string, unknown>) {
  return {
    schema_id: cleanString(input.schema_id),
    schema_version: cleanString(input.schema_version),
  };
}

function manifestDataFromEnvelope(input: Record<string, unknown>) {
  const data = isRecord(input.data) ? input.data : {};
  const assets = Array.isArray(data.assets)
    ? data.assets
        .map((entry): SynthesisGitSyncManifestAsset | null => {
          if (!isRecord(entry)) {
            return null;
          }
          const normalized = normalizeGitSyncAssetPath(entry.path);
          if (!normalized.ok) {
            return null;
          }
          return {
            path: normalized.path,
            hash: cleanString(entry.hash),
            bytes: Math.max(0, Math.floor(Number(entry.bytes || 0))),
            schema_id: cleanString(entry.schema_id) || undefined,
            schema_version: cleanString(entry.schema_version) || undefined,
          };
        })
        .filter((entry): entry is SynthesisGitSyncManifestAsset =>
          Boolean(entry?.path && entry.hash),
        )
    : [];
  return {
    generated_at: cleanString(data.generated_at),
    asset_count: Math.max(0, Math.floor(Number(data.asset_count || 0))),
    assets,
    manifest_hash: cleanString(data.manifest_hash),
  };
}

function manifestHashBase(
  manifest: Omit<SynthesisGitSyncManifest, "manifest_hash">,
) {
  return {
    generated_at: manifest.generated_at,
    asset_count: manifest.asset_count,
    assets: manifest.assets,
  };
}

function createManifest(args: {
  assets: SynthesisGitSyncManifestAsset[];
  generatedAt: string;
}) {
  const base = manifestHashBase({
    generated_at: args.generatedAt,
    asset_count: args.assets.length,
    assets: [...args.assets].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
  });
  return {
    ...base,
    manifest_hash: hashCanonicalJson(base),
  };
}

async function readJson<T = unknown>(path: string): Promise<T | null> {
  const text = await readRuntimeTextFile(path);
  if (!text.trim()) {
    return null;
  }
  return JSON.parse(text) as T;
}

async function writeJson(path: string, value: unknown) {
  await writeRuntimeTextFile(path, canonicalJsonText(value));
}

async function appendJsonLine(path: string, value: unknown) {
  const current = await readRuntimeTextFile(path);
  await writeRuntimeTextFile(path, `${current}${JSON.stringify(value)}\n`);
}

function parentPath(pathRaw: string) {
  const path = cleanString(pathRaw);
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/g, "");
  const index = normalized.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : path;
}

function syncPaths(root: string) {
  const kg = buildSynthesisKnowledgeGraphPaths(root);
  const syncRoot = kg.syncRoot;
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/+$/g, "");
  const rootName = normalizedRoot.split("/").pop();
  const worktreeRoot =
    rootName === "data"
      ? joinPath(parentPath(root), "runtime", "sync-worktree")
      : joinPath(root, "sync-worktree");
  return {
    ...kg,
    worktreeRoot,
    statePath: joinPath(syncRoot, "git-sync-state.json"),
    lockPath: joinPath(syncRoot, "git-sync-lock.json"),
    conflictPath: joinPath(syncRoot, "git-sync-conflict.json"),
    receiptsLog: joinPath(syncRoot, "git-sync-receipts.jsonl"),
  };
}

function allowedActions(state: {
  queue_state: SynthesisGitSyncQueueState;
  paused: boolean;
  adapter_configured: boolean;
}) {
  if (!state.adapter_configured) {
    return [] as string[];
  }
  if (state.queue_state === "syncing") {
    return ["pauseGitSync"];
  }
  if (state.queue_state === "blocked_conflict") {
    return ["resolveGitSyncConflict", "retryGitSync", "pauseGitSync"];
  }
  if (state.paused) {
    return ["resumeGitSync", "syncNow"];
  }
  return ["syncNow", "pauseGitSync"];
}

function defaultState(args: {
  root: string;
  adapterConfigured: boolean;
  now: string;
  remoteUrl?: string;
  branch?: string;
}): SynthesisGitSyncState {
  return {
    schema_id: "synthesis.git_sync_state",
    schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
    queue_state: args.adapterConfigured ? "idle" : "disabled",
    paused: false,
    adapter_configured: args.adapterConfigured,
    remote_url: sanitizeGitSyncRemoteUrl(args.remoteUrl),
    branch: cleanString(args.branch) || undefined,
    worktree_path: syncPaths(args.root).worktreeRoot,
    diagnostics: args.adapterConfigured
      ? []
      : [
          diagnostic({
            code: "git_sync_adapter_missing",
            severity: "info",
            message: "Git Sync is disabled because no adapter is configured.",
          }),
        ],
    allowed_actions: [],
    updated_at: args.now,
  };
}

function normalizeState(
  input: Partial<SynthesisGitSyncState> | null,
  fallback: SynthesisGitSyncState,
) {
  const queueState = cleanString(input?.queue_state);
  const normalized: SynthesisGitSyncState = {
    ...fallback,
    ...(input || {}),
    schema_id: "synthesis.git_sync_state",
    schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
    queue_state: [
      "idle",
      "queued",
      "syncing",
      "blocked_conflict",
      "failed_retryable",
      "failed_permanent",
      "disabled",
    ].includes(queueState)
      ? (queueState as SynthesisGitSyncQueueState)
      : fallback.queue_state,
    paused: Boolean(input?.paused),
    adapter_configured: fallback.adapter_configured,
    remote_url: sanitizeGitSyncRemoteUrl(
      input?.remote_url || fallback.remote_url,
    ),
    branch: cleanString(input?.branch || fallback.branch) || undefined,
    worktree_path: fallback.worktree_path,
    diagnostics: Array.isArray(input?.diagnostics)
      ? input?.diagnostics || []
      : fallback.diagnostics,
    retry_attempt:
      Number.isFinite(Number(input?.retry_attempt)) &&
      Number(input?.retry_attempt) > 0
        ? Math.floor(Number(input?.retry_attempt))
        : undefined,
    next_retry_at: cleanString(input?.next_retry_at) || undefined,
    last_retry_at: cleanString(input?.last_retry_at) || undefined,
    updated_at: cleanString(input?.updated_at) || fallback.updated_at,
  };
  if (!normalized.adapter_configured) {
    normalized.queue_state = "disabled";
  }
  normalized.allowed_actions = allowedActions(normalized);
  return normalized;
}

export function createSynthesisGitSyncService(options: ServiceOptions) {
  const root = cleanString(options.root);
  if (!root) {
    throw new Error("Synthesis Git Sync requires a storage root");
  }
  const now = options.now || nowIso;
  const adapter = options.adapter;
  const debounceMs = Math.max(0, Math.floor(options.debounceMs ?? 250));
  const lockTtlMs = Math.max(1000, Math.floor(options.lockTtlMs ?? 300000));
  const retryDelaysMs = (
    options.retryDelaysMs?.length
      ? options.retryDelaysMs
      : [60000, 300000, 900000, 1800000]
  ).map((value) => Math.max(0, Math.floor(value)));
  const autoRetryEnabled = options.autoRetryEnabled !== false;
  const owner = `git-sync-${hashCanonicalJson({
    root,
    createdAt: now(),
    random: Math.random(),
  }).slice("sha256:".length, 24)}`;
  let locked = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  async function describeRemote() {
    const described = adapter?.describeRemote
      ? await adapter.describeRemote()
      : {};
    return {
      remoteUrl: sanitizeGitSyncRemoteUrl(described?.remoteUrl),
      branch: cleanString(described?.branch) || undefined,
    };
  }

  async function validateAdapterConfiguration() {
    if (!adapter?.validateConfiguration) {
      return { ok: true, diagnostics: [] as SynthesisGitSyncDiagnostic[] };
    }
    const result = await adapter.validateConfiguration();
    return {
      ok: result.ok,
      diagnostics: (result.diagnostics || []).map((entry) =>
        diagnostic({
          code: entry.code,
          severity: entry.severity,
          message: entry.message,
          assetPath: entry.asset_path,
          details: entry.details,
        }),
      ),
    };
  }

  async function loadGitSyncState() {
    const timestamp = now();
    const paths = await initializeSynthesisKnowledgeGraphStore(root).then(() =>
      syncPaths(root),
    );
    await ensureRuntimeDirectory(paths.syncRoot);
    const remote = await describeRemote();
    const config = await validateAdapterConfiguration();
    const fallback = defaultState({
      root,
      adapterConfigured: Boolean(adapter) && config.ok,
      now: timestamp,
      remoteUrl: remote.remoteUrl,
      branch: remote.branch,
    });
    const existing = await readJson<Partial<SynthesisGitSyncState>>(
      paths.statePath,
    ).catch(() => null);
    const state = normalizeState(existing, fallback);
    state.remote_url = remote.remoteUrl || state.remote_url;
    state.branch = remote.branch || state.branch;
    state.adapter_configured = Boolean(adapter) && config.ok;
    if (!adapter || !config.ok) {
      state.queue_state = "disabled";
      if (!config.ok) {
        state.diagnostics = [...config.diagnostics, ...state.diagnostics];
      }
    }
    state.allowed_actions = allowedActions(state);
    await writeJson(paths.statePath, state);
    return state;
  }

  function clearRetryTimer() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  }

  function retryTimestamp(attempt: number) {
    const index = Math.max(0, Math.min(attempt - 1, retryDelaysMs.length - 1));
    const delay =
      retryDelaysMs[index] ?? retryDelaysMs[retryDelaysMs.length - 1] ?? 0;
    return new Date(Date.parse(now()) + delay).toISOString();
  }

  function scheduleRetryFromState(state: SynthesisGitSyncState) {
    clearRetryTimer();
    if (
      !autoRetryEnabled ||
      !adapter ||
      state.paused ||
      state.queue_state !== "failed_retryable" ||
      !state.next_retry_at
    ) {
      return;
    }
    const delay = Math.max(
      0,
      Date.parse(state.next_retry_at) - Date.parse(now()),
    );
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void runSync().catch((error) => {
        void persistState({
          queue_state: "failed_retryable",
          diagnostics: [
            diagnostic({
              code: "git_sync_auto_retry_failed",
              severity: "error",
              message: error instanceof Error ? error.message : String(error),
            }),
          ],
        });
      });
    }, delay);
  }

  async function persistState(
    patch: Partial<SynthesisGitSyncState>,
  ): Promise<SynthesisGitSyncState> {
    const current = await loadGitSyncState();
    const next = normalizeState(
      {
        ...current,
        ...patch,
        updated_at: now(),
      },
      current,
    );
    next.allowed_actions = allowedActions(next);
    await writeJson(syncPaths(root).statePath, next);
    scheduleRetryFromState(next);
    return next;
  }

  async function listEligibleCanonicalAssets(sourceRoot: string) {
    const files = await collectRuntimeFiles(sourceRoot);
    const diagnostics: SynthesisGitSyncDiagnostic[] = [];
    const assets: SynthesisGitSyncManifestAsset[] = [];
    for (const file of files) {
      const relative = normalizeGitSyncAssetPath(
        runtimeRelativePath(sourceRoot, file),
      );
      if (!relative.ok) {
        diagnostics.push(
          diagnostic({
            code: relative.reason || "unsafe_path",
            severity: "error",
            message: `Unsafe canonical asset path: ${relative.path}`,
          }),
        );
        continue;
      }
      if (relative.path === "sync/sync-manifest.json") {
        continue;
      }
      if (!isAllowedCanonicalSyncAsset(relative.path)) {
        continue;
      }
      const text = await readRuntimeTextFile(file);
      if (contentLooksSensitive(text)) {
        diagnostics.push(
          diagnostic({
            code: "sensitive_asset_rejected",
            severity: "error",
            message: "Canonical asset contains sensitive-looking content.",
            assetPath: relative.path,
          }),
        );
        continue;
      }
      const envelope = parseJsonObject(text);
      const schema: { schema_id?: string; schema_version?: string } = envelope
        ? envelopeSchema(envelope)
        : {};
      assets.push({
        path: relative.path,
        hash: hashCanonicalJson(text),
        bytes: text.length,
        schema_id: schema.schema_id || undefined,
        schema_version: schema.schema_version || undefined,
      });
    }
    return {
      assets: assets.sort((left, right) => left.path.localeCompare(right.path)),
      diagnostics,
    };
  }

  async function exportCanonicalSnapshot() {
    const timestamp = now();
    const paths = syncPaths(root);
    await initializeSynthesisKnowledgeGraphStore(root);
    const exportRoot = joinPath(
      paths.syncRoot,
      `export-${timestamp.replace(/[^0-9A-Za-z]+/g, "-")}`,
    );
    await removeRuntimePath(exportRoot);
    await ensureRuntimeDirectory(exportRoot);
    const listed = await listEligibleCanonicalAssets(paths.synthesisRoot);
    const manifest = createManifest({
      assets: listed.assets,
      generatedAt: timestamp,
    });
    for (const asset of listed.assets) {
      const source = joinPath(paths.synthesisRoot, asset.path);
      const target = joinPath(exportRoot, asset.path);
      await writeRuntimeTextFile(target, await readRuntimeTextFile(source));
    }
    await writeRuntimeTextFile(
      joinPath(exportRoot, "sync", "sync-manifest.json"),
      canonicalJsonText(
        createCanonicalEnvelope({
          schemaId: SYNTHESIS_GIT_SYNC_MANIFEST_SCHEMA_ID,
          schemaVersion: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
          data: manifest,
          now: timestamp,
        }),
      ),
    );
    return {
      exportRoot,
      manifest,
      diagnostics: listed.diagnostics,
    };
  }

  async function copySnapshotToWorktree(exportRoot: string) {
    const paths = syncPaths(root);
    await removeRuntimePath(joinPath(paths.worktreeRoot, "synthesis"));
    await ensureRuntimeDirectory(joinPath(paths.worktreeRoot, "synthesis"));
    for (const file of await collectRuntimeFiles(exportRoot)) {
      const relative = normalizeGitSyncAssetPath(
        runtimeRelativePath(exportRoot, file),
      );
      if (!relative.ok) {
        continue;
      }
      await writeRuntimeTextFile(
        joinPath(paths.worktreeRoot, "synthesis", relative.path),
        await readRuntimeTextFile(file),
      );
    }
  }

  async function validateGitSyncImportSnapshot(
    synthesisRoot: string,
  ): Promise<SynthesisGitSyncValidationResult> {
    const diagnostics: SynthesisGitSyncDiagnostic[] = [];
    const files = await collectRuntimeFiles(synthesisRoot);
    const assets: SynthesisGitSyncManifestAsset[] = [];
    let totalBytes = 0;
    let manifest: SynthesisGitSyncManifest | undefined;
    const seenPaths = new Set<string>();

    for (const file of files) {
      const relative = normalizeGitSyncAssetPath(
        runtimeRelativePath(synthesisRoot, file),
      );
      if (!relative.ok) {
        diagnostics.push(
          diagnostic({
            code: relative.reason || "unsafe_path",
            severity: "error",
            message: "Import contains an unsafe canonical path.",
            assetPath: relative.path,
          }),
        );
        continue;
      }
      if (!isAllowedCanonicalSyncAsset(relative.path)) {
        diagnostics.push(
          diagnostic({
            code: "asset_not_allowlisted",
            severity: "error",
            message: "Import contains a non-allowlisted asset.",
            assetPath: relative.path,
          }),
        );
        continue;
      }
      const text = await readRuntimeTextFile(file);
      const bytes = text.length;
      totalBytes += bytes;
      if (bytes > MAX_SINGLE_ASSET_BYTES) {
        diagnostics.push(
          diagnostic({
            code: "asset_too_large",
            severity: "error",
            message: "Import asset exceeds the per-file size limit.",
            assetPath: relative.path,
          }),
        );
      }
      if (contentLooksSensitive(text)) {
        diagnostics.push(
          diagnostic({
            code: "sensitive_asset_rejected",
            severity: "error",
            message: "Import asset contains sensitive-looking content.",
            assetPath: relative.path,
          }),
        );
      }
      const envelope = parseJsonObject(text);
      if (!envelope) {
        diagnostics.push(
          diagnostic({
            code: "invalid_json",
            severity: "error",
            message: "Import asset is not a JSON object.",
            assetPath: relative.path,
          }),
        );
        continue;
      }
      const schema = envelopeSchema(envelope);
      if (!schema.schema_id || !schema.schema_version) {
        diagnostics.push(
          diagnostic({
            code: "invalid_canonical_envelope",
            severity: "error",
            message: "Import asset is missing canonical envelope fields.",
            assetPath: relative.path,
          }),
        );
      }
      if (relative.path === "sync/sync-manifest.json") {
        if (schema.schema_id !== SYNTHESIS_GIT_SYNC_MANIFEST_SCHEMA_ID) {
          diagnostics.push(
            diagnostic({
              code: "invalid_manifest_schema",
              severity: "error",
              message: "Sync manifest schema is invalid.",
              assetPath: relative.path,
            }),
          );
        }
        manifest = manifestDataFromEnvelope(envelope);
      } else {
        const asset = {
          path: relative.path,
          hash: hashCanonicalJson(text),
          bytes,
          schema_id: schema.schema_id || undefined,
          schema_version: schema.schema_version || undefined,
        };
        assets.push(asset);
        seenPaths.add(relative.path);
      }
    }

    if (assets.length > MAX_IMPORT_ASSETS || totalBytes > MAX_IMPORT_BYTES) {
      diagnostics.push(
        diagnostic({
          code: "import_size_limit_exceeded",
          severity: "error",
          message: "Import snapshot exceeds configured size or count limits.",
          details: { asset_count: assets.length, total_bytes: totalBytes },
        }),
      );
    }
    const managedPathSet = validateManagedRelativePathSet(
      assets
        .map((asset) => asset.path)
        .concat(manifest ? manifest.assets.map((asset) => asset.path) : []),
    );
    for (const pathDiagnostic of managedPathSet.diagnostics) {
      if (pathDiagnostic.code !== "managed_path_case_collision") {
        continue;
      }
      diagnostics.push(
        diagnostic({
          code: pathDiagnostic.code,
          severity: "error",
          message: pathDiagnostic.message,
          assetPath: pathDiagnostic.relativePath,
          details: pathDiagnostic.details,
        }),
      );
    }
    if (!manifest) {
      diagnostics.push(
        diagnostic({
          code: "manifest_missing",
          severity: "error",
          message: "Import snapshot is missing sync/sync-manifest.json.",
        }),
      );
    } else {
      const manifestBase = manifestHashBase({
        generated_at: manifest.generated_at,
        asset_count: manifest.asset_count,
        assets: manifest.assets,
      });
      if (manifest.manifest_hash !== hashCanonicalJson(manifestBase)) {
        diagnostics.push(
          diagnostic({
            code: "manifest_hash_mismatch",
            severity: "error",
            message: "Sync manifest hash does not match manifest content.",
            assetPath: "sync/sync-manifest.json",
          }),
        );
      }
      const declared = new Map(
        manifest.assets.map((asset) => [asset.path, asset] as const),
      );
      for (const asset of assets) {
        const expected = declared.get(asset.path);
        if (!expected) {
          diagnostics.push(
            diagnostic({
              code: "asset_missing_from_manifest",
              severity: "error",
              message: "Import asset is not declared in sync manifest.",
              assetPath: asset.path,
            }),
          );
        } else if (expected.hash !== asset.hash) {
          diagnostics.push(
            diagnostic({
              code: "asset_hash_mismatch",
              severity: "error",
              message: "Import asset hash does not match sync manifest.",
              assetPath: asset.path,
            }),
          );
        }
      }
      for (const asset of manifest.assets) {
        if (!seenPaths.has(asset.path)) {
          diagnostics.push(
            diagnostic({
              code: "declared_asset_missing",
              severity: "error",
              message: "Sync manifest declares an asset that is missing.",
              assetPath: asset.path,
            }),
          );
        }
      }
    }
    return {
      ok: !diagnostics.some((entry) => entry.severity === "error"),
      manifest,
      assets: assets.sort((left, right) => left.path.localeCompare(right.path)),
      diagnostics,
    };
  }

  async function importCanonicalSnapshot(args: {
    synthesisRoot: string;
    transactionId?: string;
    onBeforePromoteAsset?: (asset: {
      relativePath: string;
      index: number;
    }) => void | Promise<void>;
  }) {
    const timestamp = now();
    const validation = await validateGitSyncImportSnapshot(args.synthesisRoot);
    if (!validation.ok || !validation.manifest) {
      await writeCanonicalDiagnostic({
        root,
        diagnostic: {
          transaction_id: args.transactionId || "git-sync-import",
          scope: "sync",
          code: "git_sync_import_rejected",
          message: "Git Sync import snapshot failed validation.",
          details: validation.diagnostics,
          created_at: timestamp,
        },
      });
      return { ok: false as const, validation };
    }
    const rawAssets = [
      ...validation.assets.map((asset) => ({
        relativePath: asset.path,
        envelopeText: readRuntimeTextFile(
          joinPath(args.synthesisRoot, asset.path),
        ),
      })),
      {
        relativePath: "sync/sync-manifest.json",
        envelopeText: readRuntimeTextFile(
          joinPath(args.synthesisRoot, "sync", "sync-manifest.json"),
        ),
      },
    ];
    const transaction = await writeCanonicalEnvelopeTextTransaction({
      root,
      scope: "sync",
      assets: await Promise.all(
        rawAssets.map(async (asset) => ({
          relativePath: asset.relativePath,
          envelopeText: await asset.envelopeText,
        })),
      ),
      transactionId: args.transactionId || "git-sync-import",
      projectionTargets: PROJECTION_TARGETS,
      sourceManifestHash: validation.manifest.manifest_hash,
      now: timestamp,
      onBeforePromoteAsset: args.onBeforePromoteAsset,
    });
    return { ok: true as const, validation, transaction };
  }

  async function writeConflictReport(conflicts: SynthesisGitSyncConflict[]) {
    const timestamp = now();
    const report: SynthesisGitSyncConflictReport = {
      schema_id: "synthesis.git_sync_conflict_report",
      schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
      conflict_id: `conflict-${hashCanonicalJson({
        conflicts,
        timestamp,
      }).slice("sha256:".length, 24)}`,
      status: "open",
      created_at: timestamp,
      updated_at: timestamp,
      conflicts: conflicts.map((entry) => ({
        ...entry,
        asset_path: normalizeGitSyncAssetPath(entry.asset_path).path,
      })),
      diagnostics: [
        diagnostic({
          code: "git_sync_conflict",
          severity: "warning",
          message:
            "Remote synchronization is blocked because the same canonical asset changed locally and remotely.",
        }),
      ],
    };
    await writeJson(syncPaths(root).conflictPath, report);
    return report;
  }

  function addMs(timestamp: string, ms: number) {
    return new Date(Date.parse(timestamp) + ms).toISOString();
  }

  function isLockActive(
    lock: SynthesisGitSyncLockFile | null,
    timestamp: string,
  ) {
    if (!lock?.expires_at) {
      return false;
    }
    const expiresAt = Date.parse(lock.expires_at);
    const nowAt = Date.parse(timestamp);
    return (
      Number.isFinite(expiresAt) && Number.isFinite(nowAt) && expiresAt > nowAt
    );
  }

  async function readLockFile() {
    if (!(await runtimePathExists(syncPaths(root).lockPath))) {
      return null;
    }
    return readJson<SynthesisGitSyncLockFile>(syncPaths(root).lockPath).catch(
      () => null,
    );
  }

  async function acquireLock(runId: string) {
    const timestamp = now();
    if (locked) {
      return {
        acquired: false,
        diagnostics: [] as SynthesisGitSyncDiagnostic[],
      };
    }
    const existing = await readLockFile();
    if (isLockActive(existing, timestamp)) {
      return {
        acquired: false,
        diagnostics: [
          diagnostic({
            code: "git_sync_lock_active",
            severity: "info",
            message: "A Git Sync run is already in progress.",
          }),
        ],
      };
    }
    locked = true;
    const diagnostics = existing
      ? [
          diagnostic({
            code: "git_sync_stale_lock_takeover",
            severity: "warning",
            message: "Git Sync took over an expired sync lock.",
            details: {
              previous_run_id: existing.run_id,
              previous_owner: existing.owner,
            },
          }),
        ]
      : [];
    const lock: SynthesisGitSyncLockFile = {
      schema_id: "synthesis.git_sync_lock",
      schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
      run_id: runId,
      owner,
      acquired_at: timestamp,
      expires_at: addMs(timestamp, lockTtlMs),
    };
    await writeJson(syncPaths(root).lockPath, lock);
    return { acquired: true, diagnostics };
  }

  async function releaseLock() {
    locked = false;
    const current = await readLockFile();
    if (!current || current.owner === owner) {
      await removeRuntimePath(syncPaths(root).lockPath);
    }
  }

  async function runSync() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    const startedAt = now();
    const runId = `git-sync-${startedAt.replace(/[^0-9A-Za-z]+/g, "-")}`;
    const state = await loadGitSyncState();
    if (!adapter || state.queue_state === "disabled") {
      return state;
    }
    if (state.paused) {
      return persistState({ queue_state: "queued" });
    }
    if (state.queue_state === "blocked_conflict") {
      return state;
    }
    const acquiredLock = await acquireLock(runId);
    if (!acquiredLock.acquired) {
      return persistState({ queue_state: "queued" });
    }
    const diagnostics: SynthesisGitSyncDiagnostic[] = [
      ...acquiredLock.diagnostics,
    ];
    await persistState({ queue_state: "syncing", diagnostics: [] });
    try {
      const remote = await describeRemote();
      const exported = await exportCanonicalSnapshot();
      diagnostics.push(...exported.diagnostics);
      if (diagnostics.some((entry) => entry.severity === "error")) {
        throw new Error("Git Sync export failed validation.");
      }
      await copySnapshotToWorktree(exported.exportRoot);
      const fetchResult = await adapter.fetch?.({
        worktreePath: syncPaths(root).worktreeRoot,
        remoteUrl: remote.remoteUrl,
        branch: remote.branch,
      });
      if (fetchResult?.diagnostics?.length) {
        diagnostics.push(...fetchResult.diagnostics);
      }
      const mergeResult = (await adapter.merge?.({
        worktreePath: syncPaths(root).worktreeRoot,
        remoteUrl: remote.remoteUrl,
        branch: remote.branch,
        localManifest: exported.manifest,
      })) || { status: "clean" as const };
      if (mergeResult.diagnostics?.length) {
        diagnostics.push(...mergeResult.diagnostics);
      }
      if (mergeResult.status === "conflict") {
        const report = await writeConflictReport(
          mergeResult.conflicts?.length
            ? mergeResult.conflicts
            : (mergeResult.localChangedFiles || [])
                .filter((path) =>
                  (mergeResult.remoteChangedFiles || []).includes(path),
                )
                .map((path) => ({
                  asset_path: path,
                  reason: "both_changed" as const,
                })),
        );
        const receipt: SynthesisGitSyncRunReceipt = {
          schema_id: "synthesis.git_sync_run_receipt",
          schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
          run_id: runId,
          status: "blocked_conflict",
          started_at: startedAt,
          completed_at: now(),
          exported_asset_count: exported.manifest.asset_count,
          imported_asset_count: 0,
          manifest_hash: exported.manifest.manifest_hash,
          diagnostics: [...diagnostics, ...report.diagnostics],
        };
        await appendJsonLine(syncPaths(root).receiptsLog, receipt);
        return persistState({
          queue_state: "blocked_conflict",
          conflict_report: report,
          last_run: receipt,
          diagnostics: receipt.diagnostics,
          remote_url: remote.remoteUrl,
          branch: remote.branch,
        });
      }
      const candidateRoot = joinPath(syncPaths(root).worktreeRoot, "synthesis");
      const validation = await validateGitSyncImportSnapshot(candidateRoot);
      if (!validation.ok) {
        const receipt: SynthesisGitSyncRunReceipt = {
          schema_id: "synthesis.git_sync_run_receipt",
          schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
          run_id: runId,
          status: "failed_permanent",
          started_at: startedAt,
          completed_at: now(),
          exported_asset_count: exported.manifest.asset_count,
          imported_asset_count: 0,
          manifest_hash: exported.manifest.manifest_hash,
          diagnostics: [...diagnostics, ...validation.diagnostics],
        };
        await appendJsonLine(syncPaths(root).receiptsLog, receipt);
        return persistState({
          queue_state: "failed_permanent",
          last_run: receipt,
          diagnostics: receipt.diagnostics,
          remote_url: remote.remoteUrl,
          branch: remote.branch,
        });
      }
      const pushResult = await adapter.push?.({
        worktreePath: syncPaths(root).worktreeRoot,
        remoteUrl: remote.remoteUrl,
        branch: remote.branch,
        manifest: validation.manifest || exported.manifest,
      });
      if (pushResult?.diagnostics?.length) {
        diagnostics.push(...pushResult.diagnostics);
      }
      const imported = await importCanonicalSnapshot({
        synthesisRoot: candidateRoot,
        transactionId: runId,
      });
      if (!imported.ok) {
        const receipt: SynthesisGitSyncRunReceipt = {
          schema_id: "synthesis.git_sync_run_receipt",
          schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
          run_id: runId,
          status: "failed_permanent",
          started_at: startedAt,
          completed_at: now(),
          exported_asset_count: exported.manifest.asset_count,
          imported_asset_count: 0,
          manifest_hash: exported.manifest.manifest_hash,
          diagnostics: [...diagnostics, ...imported.validation.diagnostics],
        };
        await appendJsonLine(syncPaths(root).receiptsLog, receipt);
        return persistState({
          queue_state: "failed_permanent",
          last_run: receipt,
          diagnostics: receipt.diagnostics,
        });
      }
      const receipt: SynthesisGitSyncRunReceipt = {
        schema_id: "synthesis.git_sync_run_receipt",
        schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
        run_id: runId,
        status: "success",
        started_at: startedAt,
        completed_at: now(),
        exported_asset_count: exported.manifest.asset_count,
        imported_asset_count: imported.validation.assets.length,
        manifest_hash: imported.validation.manifest?.manifest_hash,
        diagnostics,
        canonical_receipt: imported.transaction.receipt,
      };
      await appendJsonLine(syncPaths(root).receiptsLog, receipt);
      await removeRuntimePath(syncPaths(root).conflictPath);
      return persistState({
        queue_state: "idle",
        conflict_report: undefined,
        last_run: receipt,
        diagnostics,
        remote_url: remote.remoteUrl,
        branch: remote.branch,
        retry_attempt: undefined,
        next_retry_at: undefined,
        last_retry_at: undefined,
      });
    } catch (error) {
      const current = await loadGitSyncState();
      const retryAttempt = Math.max(0, Number(current.retry_attempt) || 0) + 1;
      const nextRetryAt = retryTimestamp(retryAttempt);
      const failureDiagnostic = diagnostic({
        code: "git_sync_failed",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? { name: error.name } : error,
      });
      const receipt: SynthesisGitSyncRunReceipt = {
        schema_id: "synthesis.git_sync_run_receipt",
        schema_version: SYNTHESIS_GIT_SYNC_SCHEMA_VERSION,
        run_id: runId,
        status: "failed_retryable",
        started_at: startedAt,
        completed_at: now(),
        exported_asset_count: 0,
        imported_asset_count: 0,
        diagnostics: [...diagnostics, failureDiagnostic],
        retry_attempt: retryAttempt,
        next_retry_at: nextRetryAt,
        last_retry_at: now(),
      };
      await appendJsonLine(syncPaths(root).receiptsLog, receipt);
      return persistState({
        queue_state: "failed_retryable",
        last_run: receipt,
        diagnostics: receipt.diagnostics,
        retry_attempt: retryAttempt,
        next_retry_at: nextRetryAt,
        last_retry_at: receipt.last_retry_at,
      });
    } finally {
      await releaseLock();
    }
  }

  async function enqueueGitSync() {
    const state = await loadGitSyncState();
    if (!adapter || state.queue_state === "disabled") {
      return state;
    }
    if (state.queue_state === "blocked_conflict") {
      return state;
    }
    return persistState({ queue_state: "queued" });
  }

  function scheduleDebouncedSync() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      void runSync().catch((error) => {
        void persistState({
          queue_state: "failed_retryable",
          diagnostics: [
            diagnostic({
              code: "git_sync_debounce_worker_failed",
              severity: "error",
              message: error instanceof Error ? error.message : String(error),
            }),
          ],
        });
      });
    }, debounceMs);
  }

  async function notifyCanonicalStoreChanged() {
    const state = await enqueueGitSync();
    if (adapter && !state.paused && state.queue_state === "queued") {
      scheduleDebouncedSync();
    }
    return state;
  }

  async function pauseGitSync() {
    clearRetryTimer();
    return persistState({ paused: true });
  }

  async function resumeGitSync() {
    const state = await persistState({ paused: false });
    return state.queue_state === "queued" ||
      state.queue_state === "failed_retryable"
      ? runSync()
      : state;
  }

  async function retryGitSync() {
    clearRetryTimer();
    const state = await persistState({
      queue_state: "queued",
      conflict_report: undefined,
      diagnostics: [],
      retry_attempt: undefined,
      next_retry_at: undefined,
      last_retry_at: undefined,
    });
    return state.paused ? state : runSync();
  }

  async function resolveGitSyncConflict(args: { action: "skip" | "resolved" }) {
    const current = await loadGitSyncState();
    const report = current.conflict_report
      ? {
          ...current.conflict_report,
          status:
            args.action === "resolved"
              ? ("resolved" as const)
              : ("skipped" as const),
          updated_at: now(),
        }
      : undefined;
    if (report) {
      await writeJson(syncPaths(root).conflictPath, report);
    }
    return persistState({
      queue_state: args.action === "resolved" ? "queued" : "idle",
      conflict_report: report,
    });
  }

  async function readGitSyncDiagnostics() {
    return (await loadGitSyncState()).diagnostics;
  }

  async function recordGitSyncDiagnostic(args: {
    code: string;
    severity?: "info" | "warning" | "error";
    message: unknown;
    assetPath?: string;
    details?: unknown;
  }) {
    const current = await loadGitSyncState();
    return persistState({
      diagnostics: [
        ...current.diagnostics,
        diagnostic({
          code: args.code,
          severity: args.severity,
          message: args.message,
          assetPath: args.assetPath,
          details: args.details,
        }),
      ],
    });
  }

  return {
    loadGitSyncState,
    exportCanonicalSnapshot,
    validateGitSyncImportSnapshot,
    importCanonicalSnapshot,
    enqueueGitSync,
    notifyCanonicalStoreChanged,
    runSync,
    pauseGitSync,
    resumeGitSync,
    retryGitSync,
    resolveGitSyncConflict,
    readGitSyncDiagnostics,
    recordGitSyncDiagnostic,
  };
}

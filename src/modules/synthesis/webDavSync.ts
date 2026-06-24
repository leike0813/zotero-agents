import { joinPath } from "../../utils/path";
import {
  collectRuntimeFiles,
  ensureRuntimeDirectory,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimeRelativePath,
  runtimePathExists,
  validateManagedRelativePath,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import {
  applySynthesisDurableImport,
  previewSynthesisDurableImport,
  readSynthesisDurableManifest,
  writeSynthesisDurableExportSnapshot,
  type SynthesisDurableExportProgress,
} from "./durableSync";
import {
  getSynthesisRepositoryDatabasePath,
  type SynthesisRepository,
} from "./repository";
import {
  createDefaultSynthesisWebDavHttpClient,
  sanitizeWebDavUrl,
  webDavCredentialForRequest,
  webDavRemoteUrl,
  type SynthesisWebDavHttpClient,
} from "./webDavSyncClient";
import {
  getSynthesisWebDavSyncPrefsConfig,
  getWebDavSyncPrefsStatus,
  type SynthesisWebDavSyncConfigStatus,
  type SynthesisWebDavSyncDiagnostic,
} from "./webDavSyncPrefs";

export type SynthesisWebDavSyncQueueState =
  | "idle"
  | "queued"
  | "syncing"
  | "blocked_conflict"
  | "failed_retryable"
  | "failed_permanent"
  | "disabled";

export type SynthesisWebDavSnapshotPointer = {
  schema_id: "synthesis.webdav_sync_head";
  schema_version: "1.0.0";
  snapshot_id: string;
  manifest_hash: string;
  updated_at: string;
  producer_version?: string;
};

export type SynthesisWebDavRemoteHead = {
  pointer?: SynthesisWebDavSnapshotPointer;
  etag?: string;
  missing: boolean;
};

export type SynthesisWebDavSyncConflictReport = {
  schema_id: "synthesis.webdav_sync_conflict_report";
  schema_version: "1.0.0";
  conflict_id: string;
  status: "blocked" | "resolved";
  conflicts: Array<{
    asset_path: string;
    reason: string;
    base_hash?: string;
    local_hash?: string;
    remote_hash?: string;
  }>;
  diagnostics: SynthesisWebDavSyncDiagnostic[];
};

export type SynthesisWebDavSyncState = {
  schema_id: "synthesis.webdav_sync_state";
  schema_version: "1.0.0";
  queue_state: SynthesisWebDavSyncQueueState;
  paused: boolean;
  adapter_configured: boolean;
  config_status?: SynthesisWebDavSyncConfigStatus;
  base_url: string;
  remote_path: string;
  username?: string;
  credential_updated_at?: string;
  connection_test?: unknown;
  last_run?: {
    run_id: string;
    status:
      | "completed"
      | "failed_retryable"
      | "failed_permanent"
      | "blocked_conflict";
    started_at: string;
    completed_at: string;
    diagnostics: SynthesisWebDavSyncDiagnostic[];
    snapshot_id?: string;
    manifest_hash?: string;
  };
  conflict_report?: SynthesisWebDavSyncConflictReport;
  conflict_actions?: string[];
  diagnostics: SynthesisWebDavSyncDiagnostic[];
  allowed_actions: string[];
  last_phase?: string;
  progress?: {
    phase?: string;
    phase_label?: string;
    message?: string;
    processed_count?: number;
    total_count?: number;
    bundle_count?: number;
    entry_count?: number;
    total_bytes?: number;
    updated_at?: string;
  };
  updated_at: string;
};

export type SynthesisWebDavSyncProgressReport = {
  jobName: string;
  runId: string;
  source: "webdav_sync";
  label: string;
  status:
    | "running"
    | "queued"
    | "waiting"
    | "completed"
    | "failed_retryable"
    | "failed_terminal";
  phase?: string;
  phaseLabel?: string;
  message?: string;
  processedCount?: number;
  totalCount?: number;
  progressMode?: "determinate" | "indeterminate";
  diagnosticsJson?: string;
};

type ServiceOptions = {
  root: string;
  persistenceRoot?: string;
  repository?: SynthesisRepository;
  client?: SynthesisWebDavHttpClient;
  now?: () => string;
  progressReporter?: (
    report: SynthesisWebDavSyncProgressReport,
  ) => void | Promise<void>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function diagnostic(args: {
  code: string;
  severity?: "info" | "warning" | "error";
  message: unknown;
  details?: unknown;
}): SynthesisWebDavSyncDiagnostic {
  return {
    code: cleanString(args.code),
    severity: args.severity || "warning",
    message: sanitizeWebDavUrl(String(args.message || "")),
    details:
      args.details === undefined
        ? undefined
        : JSON.parse(
            JSON.stringify(args.details, (_key, value) =>
              typeof value === "string" ? sanitizeWebDavUrl(value) : value,
            ),
          ),
  };
}

function syncPaths(root: string) {
  const syncRoot = joinPath(root, "runtime", "synthesis", "webdav-sync");
  return {
    syncRoot,
    statePath: joinPath(syncRoot, "webdav-sync-state.json"),
    conflictPath: joinPath(syncRoot, "webdav-sync-conflict.json"),
    exportRoot: joinPath(syncRoot, "export"),
    importRoot: joinPath(syncRoot, "import"),
  };
}

const STALE_SYNCING_MS = 5 * 60 * 1000;

function allowedActions(state: SynthesisWebDavSyncState) {
  if (!state.adapter_configured) {
    return [] as string[];
  }
  if (state.queue_state === "blocked_conflict") {
    return ["resolveWebDavSyncConflict", "retryWebDavSync", "pauseWebDavSync"];
  }
  if (state.paused) {
    return ["resumeWebDavSync", "syncWebDavNow"];
  }
  if (state.queue_state === "syncing") {
    return ["pauseWebDavSync"];
  }
  return ["syncWebDavNow", "pauseWebDavSync"];
}

function conflictActions(state: SynthesisWebDavSyncState) {
  return state.queue_state === "blocked_conflict"
    ? ["keep_local", "save_remote_copy", "clear_after_manual_edit"]
    : [];
}

async function readJson<T>(path: string): Promise<T | null> {
  if (!(await runtimePathExists(path))) {
    return null;
  }
  return JSON.parse(await readRuntimeTextFile(path)) as T;
}

async function writeJson(path: string, value: unknown) {
  await writeRuntimeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeState(
  input: Partial<SynthesisWebDavSyncState> | null,
  fallback: SynthesisWebDavSyncState,
): SynthesisWebDavSyncState {
  const state: SynthesisWebDavSyncState = {
    ...fallback,
    ...input,
    diagnostics: Array.isArray(input?.diagnostics)
      ? input.diagnostics
      : fallback.diagnostics,
    allowed_actions: [],
    conflict_actions: [],
  };
  delete (state as Record<string, unknown>).credential_masked;
  state.allowed_actions = allowedActions(state);
  state.conflict_actions = conflictActions(state);
  return state;
}

function staleSyncing(state: SynthesisWebDavSyncState, timestamp: string) {
  if (state.queue_state !== "syncing") {
    return false;
  }
  const updatedAt = Date.parse(state.progress?.updated_at || state.updated_at);
  const nowMs = Date.parse(timestamp);
  return (
    Number.isFinite(updatedAt) &&
    Number.isFinite(nowMs) &&
    nowMs - updatedAt > STALE_SYNCING_MS
  );
}

function progressFromDurable(
  progress: SynthesisDurableExportProgress,
  timestamp: string,
) {
  const details =
    progress.details && typeof progress.details === "object"
      ? (progress.details as Record<string, unknown>)
      : {};
  return {
    phase: `export_${progress.phase}`,
    phase_label: progress.phase_label,
    message: progress.message,
    processed_count: progress.processed_count,
    total_count: progress.total_count,
    bundle_count: Number(details.bundle_count) || undefined,
    entry_count:
      Number(details.entry_count || details.draft_count) || undefined,
    total_bytes: Number(details.total_bytes) || undefined,
    updated_at: timestamp,
  };
}

function remotePath(...parts: string[]) {
  return parts
    .map((part) => cleanString(part).replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function snapshotId(timestamp: string, manifestHash: string) {
  return `${timestamp.replace(/[^0-9A-Za-z]+/g, "-")}-${manifestHash.slice(-12)}`;
}

function parseHead(text: string): SynthesisWebDavSnapshotPointer | null {
  try {
    const parsed = JSON.parse(text) as SynthesisWebDavSnapshotPointer;
    if (
      parsed?.schema_id === "synthesis.webdav_sync_head" &&
      parsed.schema_version === "1.0.0" &&
      parsed.snapshot_id &&
      parsed.manifest_hash
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function createSynthesisWebDavSyncService(options: ServiceOptions) {
  const root = cleanString(options.root);
  const persistenceRoot = cleanString(options.persistenceRoot) || root;
  const now = options.now || nowIso;
  const client = options.client || createDefaultSynthesisWebDavHttpClient();
  const repository = options.repository;

  function prefs() {
    return getSynthesisWebDavSyncPrefsConfig();
  }

  async function loadWebDavSyncState() {
    const timestamp = now();
    const paths = syncPaths(persistenceRoot);
    await ensureRuntimeDirectory(paths.syncRoot);
    const config = prefs();
    const prefsStatus = getWebDavSyncPrefsStatus();
    const configured =
      config.enabled &&
      prefsStatus.config_status === "configured" &&
      Boolean(repository);
    const fallback: SynthesisWebDavSyncState = {
      schema_id: "synthesis.webdav_sync_state",
      schema_version: "1.0.0",
      queue_state: configured ? "idle" : "disabled",
      paused: false,
      adapter_configured: configured,
      config_status: prefsStatus.config_status,
      base_url: sanitizeWebDavUrl(config.baseUrl),
      remote_path: config.remotePath,
      username: config.username || undefined,
      credential_updated_at: prefsStatus.credential_updated_at,
      connection_test: prefsStatus.connection_test,
      diagnostics: configured
        ? []
        : [
            ...prefsStatus.diagnostics,
            ...(repository
              ? []
              : [
                  diagnostic({
                    code: "webdav_sync_repository_unavailable",
                    severity: "error",
                    message:
                      "WebDAV Sync requires an injected Synthesis repository.",
                    details: {
                      expected_db_path:
                        getSynthesisRepositoryDatabasePath(persistenceRoot),
                    },
                  }),
                ]),
          ],
      allowed_actions: [],
      updated_at: timestamp,
    };
    const state = normalizeState(
      await readJson<Partial<SynthesisWebDavSyncState>>(paths.statePath),
      fallback,
    );
    state.adapter_configured = configured;
    state.config_status = prefsStatus.config_status;
    state.base_url = sanitizeWebDavUrl(config.baseUrl);
    state.remote_path = config.remotePath;
    state.username = config.username || undefined;
    state.credential_updated_at = prefsStatus.credential_updated_at;
    state.connection_test = prefsStatus.connection_test;
    if (!configured) {
      state.queue_state = "disabled";
      state.diagnostics = fallback.diagnostics;
    } else if (state.queue_state === "disabled") {
      state.queue_state = "idle";
      state.diagnostics = [];
    } else if (staleSyncing(state, timestamp)) {
      state.queue_state = "failed_retryable";
      state.diagnostics = [
        diagnostic({
          code: "webdav_sync_stale_running_recovered",
          severity: "warning",
          message:
            "Recovered a stale WebDAV Sync run that did not reach a terminal state.",
          details: {
            previous_updated_at: state.updated_at,
            last_phase: state.last_phase,
          },
        }),
      ];
    }
    state.allowed_actions = allowedActions(state);
    state.conflict_actions = conflictActions(state);
    await writeJson(paths.statePath, state);
    return state;
  }

  async function persistState(patch: Partial<SynthesisWebDavSyncState>) {
    const current = await loadWebDavSyncState();
    const next = {
      ...current,
      ...patch,
      updated_at: now(),
    };
    next.allowed_actions = allowedActions(next);
    next.conflict_actions = conflictActions(next);
    await writeJson(syncPaths(persistenceRoot).statePath, next);
    return next;
  }

  async function reportPhase(args: {
    runId: string;
    phase: string;
    index: number;
    total: number;
    status?:
      | "running"
      | "queued"
      | "waiting"
      | "completed"
      | "failed_retryable"
      | "failed_terminal";
    message?: string;
    diagnostics?: SynthesisWebDavSyncDiagnostic[];
    progress?: SynthesisWebDavSyncState["progress"];
  }) {
    const timestamp = now();
    await options.progressReporter?.({
      jobName: "synthesis:webdav-sync",
      runId: args.runId,
      source: "webdav_sync",
      label: "WebDAV Sync",
      status: args.status || "running",
      phase: args.phase,
      phaseLabel: args.phase.charAt(0).toUpperCase() + args.phase.slice(1),
      message: args.message,
      processedCount: args.index,
      totalCount: args.total,
      progressMode: "determinate",
      diagnosticsJson: args.diagnostics
        ? JSON.stringify(args.diagnostics)
        : "[]",
    });
    if ((args.status || "running") === "running") {
      await persistState({
        queue_state: "syncing",
        last_phase: args.phase,
        progress: {
          phase: args.phase,
          phase_label: args.phase.charAt(0).toUpperCase() + args.phase.slice(1),
          message: args.message,
          processed_count: args.index,
          total_count: args.total,
          updated_at: timestamp,
          ...(args.progress || {}),
        },
      });
    }
  }

  async function readRemoteHead(): Promise<SynthesisWebDavRemoteHead> {
    const config = prefs();
    const credential = await webDavCredentialForRequest();
    const response = await client.request({
      method: "GET",
      url: webDavRemoteUrl({
        baseUrl: config.baseUrl,
        remotePath: config.remotePath,
        relativePath: "HEAD.json",
      }),
      username: config.username,
      credential,
    });
    if (response.status === 404) {
      return { missing: true };
    }
    if (!response.ok) {
      throw new Error(`webdav HEAD read failed: HTTP ${response.status}`);
    }
    const pointer = parseHead(response.text || "");
    if (!pointer) {
      throw new Error("webdav HEAD is invalid");
    }
    return { pointer, etag: response.etag, missing: false };
  }

  async function downloadSnapshot(pointer: SynthesisWebDavSnapshotPointer) {
    const config = prefs();
    const credential = await webDavCredentialForRequest();
    const paths = syncPaths(persistenceRoot);
    await removeRuntimePath(paths.importRoot);
    await ensureRuntimeDirectory(paths.importRoot);
    const manifestResponse = await client.request({
      method: "GET",
      url: webDavRemoteUrl({
        baseUrl: config.baseUrl,
        remotePath: config.remotePath,
        relativePath: remotePath(
          "snapshots",
          pointer.snapshot_id,
          "manifest.json",
        ),
      }),
      username: config.username,
      credential,
    });
    if (!manifestResponse.ok) {
      throw new Error(
        `webdav manifest download failed: HTTP ${manifestResponse.status}`,
      );
    }
    await writeRuntimeTextFile(
      joinPath(paths.importRoot, "manifest.json"),
      manifestResponse.text || "",
    );
    const manifest = await readSynthesisDurableManifest(paths.importRoot);
    if (!manifest) {
      throw new Error("webdav durable manifest missing");
    }
    for (const asset of manifest.assets) {
      const safe = validateManagedRelativePath(asset.path);
      if (!safe.ok || !safe.normalizedPath.startsWith("bundles/")) {
        throw new Error("webdav durable asset path invalid");
      }
      const response = await client.request({
        method: "GET",
        url: webDavRemoteUrl({
          baseUrl: config.baseUrl,
          remotePath: config.remotePath,
          relativePath: remotePath(
            "snapshots",
            pointer.snapshot_id,
            safe.normalizedPath,
          ),
        }),
        username: config.username,
        credential,
      });
      if (!response.ok) {
        throw new Error(
          `webdav bundle download failed: HTTP ${response.status}`,
        );
      }
      await writeRuntimeTextFile(
        joinPath(paths.importRoot, safe.normalizedPath),
        response.text || "",
      );
    }
    return paths.importRoot;
  }

  function parentCollections(relativePath: string) {
    const parts = remotePath(relativePath).split("/").filter(Boolean);
    const parents: string[] = [];
    for (let index = 1; index < parts.length; index += 1) {
      parents.push(parts.slice(0, index).join("/"));
    }
    return parents;
  }

  async function ensureRemoteCollections(relativePaths: string[]) {
    const config = prefs();
    const credential = await webDavCredentialForRequest();
    const makeCollection = async (args: {
      remotePath: string;
      relativePath: string;
    }) => {
      const result = await client.request({
        method: "MKCOL",
        url: webDavRemoteUrl({
          baseUrl: config.baseUrl,
          remotePath: args.remotePath,
          relativePath: args.relativePath,
        }),
        username: config.username,
        credential,
      });
      if (
        result.ok ||
        result.status === 200 ||
        result.status === 201 ||
        result.status === 204 ||
        result.status === 405 ||
        result.status === 409
      ) {
        return;
      }
      throw new Error(`webdav collection create failed: HTTP ${result.status}`);
    };
    const remoteRootParts = remotePath(config.remotePath)
      .split("/")
      .filter(Boolean);
    for (let index = 1; index <= remoteRootParts.length; index += 1) {
      await makeCollection({
        remotePath: "",
        relativePath: remoteRootParts.slice(0, index).join("/"),
      });
    }
    const collections = Array.from(
      new Set(
        relativePaths
          .flatMap(parentCollections)
          .sort((left, right) => left.localeCompare(right)),
      ),
    );
    for (const collection of collections) {
      await makeCollection({
        remotePath: config.remotePath,
        relativePath: collection,
      });
    }
  }

  async function uploadSnapshot(
    exportRoot: string,
    pointer: SynthesisWebDavSnapshotPointer,
    head: SynthesisWebDavRemoteHead,
  ) {
    const config = prefs();
    const credential = await webDavCredentialForRequest();
    const beforeHead = await readRemoteHead().catch(
      () => ({ missing: true }) as SynthesisWebDavRemoteHead,
    );
    if (
      !head.missing &&
      beforeHead.pointer?.manifest_hash !== head.pointer?.manifest_hash
    ) {
      throw new Error("webdav_sync_remote_changed_during_sync");
    }
    const uploadFiles: Array<{
      path: string;
      relativePath: string;
    }> = [];
    for (const file of await collectRuntimeFiles(exportRoot)) {
      const relativeFile = runtimeRelativePath(exportRoot, file);
      const safe = validateManagedRelativePath(relativeFile);
      if (
        !safe.ok ||
        (safe.normalizedPath !== "manifest.json" &&
          !safe.normalizedPath.startsWith("bundles/"))
      ) {
        continue;
      }
      uploadFiles.push({ path: file, relativePath: safe.normalizedPath });
    }
    await ensureRemoteCollections([
      ...uploadFiles.map((file) =>
        remotePath("snapshots", pointer.snapshot_id, file.relativePath),
      ),
      "HEAD.json",
    ]);
    for (const file of uploadFiles) {
      const uploadResult = await client.request({
        method: "PUT",
        url: webDavRemoteUrl({
          baseUrl: config.baseUrl,
          remotePath: config.remotePath,
          relativePath: remotePath(
            "snapshots",
            pointer.snapshot_id,
            file.relativePath,
          ),
        }),
        body: await readRuntimeTextFile(file.path),
        username: config.username,
        credential,
      });
      if (!uploadResult.ok) {
        throw new Error(
          `webdav snapshot upload failed: HTTP ${uploadResult.status}`,
        );
      }
    }
    const headResult = await client.request({
      method: "PUT",
      url: webDavRemoteUrl({
        baseUrl: config.baseUrl,
        remotePath: config.remotePath,
        relativePath: "HEAD.json",
      }),
      body: JSON.stringify(pointer, null, 2),
      headers: head.etag ? { "If-Match": head.etag } : undefined,
      username: config.username,
      credential,
    });
    if (!headResult.ok) {
      if (headResult.status === 409 || headResult.status === 412) {
        throw new Error("webdav_sync_remote_changed_during_sync");
      }
      throw new Error(`webdav HEAD upload failed: HTTP ${headResult.status}`);
    }
  }

  async function runSync() {
    const startedAt = now();
    const runId = `webdav-sync-${startedAt.replace(/[^0-9A-Za-z]+/g, "-")}`;
    const phaseTotal = 10;
    const initialState = await loadWebDavSyncState();
    if (
      !initialState.adapter_configured ||
      initialState.queue_state === "disabled"
    ) {
      return initialState;
    }
    if (initialState.paused) {
      return persistState({ queue_state: "queued" });
    }
    if (initialState.queue_state === "blocked_conflict") {
      return initialState;
    }
    await persistState({ queue_state: "syncing", diagnostics: [] });
    const diagnostics: SynthesisWebDavSyncDiagnostic[] = [];
    try {
      await reportPhase({
        runId,
        phase: "head",
        index: 1,
        total: phaseTotal,
        message: "Reading WebDAV remote HEAD.",
      });
      const head = await readRemoteHead().catch((error) => {
        if (
          String(error instanceof Error ? error.message : error).includes(
            "HTTP 404",
          )
        ) {
          return { missing: true } as SynthesisWebDavRemoteHead;
        }
        throw error;
      });
      if (head.pointer) {
        await reportPhase({
          runId,
          phase: "download",
          index: 2,
          total: phaseTotal,
          message: "Downloading WebDAV durable snapshot.",
        });
        const importRoot = await downloadSnapshot(head.pointer);
        await reportPhase({
          runId,
          phase: "preview",
          index: 3,
          total: phaseTotal,
          message: "Validating downloaded durable snapshot.",
        });
        const preview = await previewSynthesisDurableImport({
          root,
          sourceRoot: importRoot,
          repository,
        });
        diagnostics.push(
          ...preview.diagnostics.map((entry) =>
            diagnostic({
              code: entry.code,
              severity: entry.severity,
              message: entry.message,
              details: entry.details,
            }),
          ),
        );
        if (preview.conflicts.length) {
          const report: SynthesisWebDavSyncConflictReport = {
            schema_id: "synthesis.webdav_sync_conflict_report",
            schema_version: "1.0.0",
            conflict_id: runId,
            status: "blocked",
            conflicts: preview.conflicts.map((entry) => ({
              asset_path: entry.path,
              reason: entry.reason,
              base_hash: entry.base_hash,
              local_hash: entry.local_hash,
              remote_hash: entry.remote_hash,
            })),
            diagnostics: [
              diagnostic({
                code: "webdav_sync_conflict_blocked",
                severity: "warning",
                message: "WebDAV Sync is blocked by durable-state conflicts.",
              }),
            ],
          };
          await writeJson(syncPaths(persistenceRoot).conflictPath, report);
          return persistState({
            queue_state: "blocked_conflict",
            conflict_report: report,
            diagnostics: report.diagnostics,
            last_run: {
              run_id: runId,
              status: "blocked_conflict",
              started_at: startedAt,
              completed_at: now(),
              diagnostics: report.diagnostics,
            },
          });
        }
        if (!preview.ok) {
          throw new Error("webdav_sync_snapshot_validation_failed");
        }
        await reportPhase({
          runId,
          phase: "apply",
          index: 4,
          total: phaseTotal,
          message: "Applying durable snapshot to local Synthesis store.",
        });
        await applySynthesisDurableImport({
          root,
          sourceRoot: importRoot,
          repository,
          runId,
        });
      } else {
        diagnostics.push(
          diagnostic({
            code: "webdav_sync_head_missing_initializable",
            severity: "info",
            message:
              "WebDAV Sync remote HEAD is missing and will be initialized.",
          }),
        );
      }
      const paths = syncPaths(persistenceRoot);
      await removeRuntimePath(paths.exportRoot);
      await ensureRuntimeDirectory(paths.exportRoot);
      await reportPhase({
        runId,
        phase: "export",
        index: 5,
        total: phaseTotal,
        message: "Exporting local durable Synthesis state.",
      });
      const exported = await writeSynthesisDurableExportSnapshot({
        root,
        outputRoot: paths.exportRoot,
        repository,
        now: () => now(),
        onProgress: async (progress) => {
          const mapped = progressFromDurable(progress, now());
          await reportPhase({
            runId,
            phase: mapped.phase || "export",
            index: 5,
            total: phaseTotal,
            message: mapped.message || progress.message,
            progress: mapped,
          });
        },
      });
      const pointer: SynthesisWebDavSnapshotPointer = {
        schema_id: "synthesis.webdav_sync_head",
        schema_version: "1.0.0",
        snapshot_id: snapshotId(startedAt, exported.manifest.manifest_hash),
        manifest_hash: exported.manifest.manifest_hash,
        updated_at: now(),
        producer_version: exported.manifest.producer_version,
      };
      await reportPhase({
        runId,
        phase: "upload",
        index: 8,
        total: phaseTotal,
        message: "Uploading WebDAV durable snapshot.",
        progress: {
          bundle_count: exported.manifest.assets.length,
          entry_count: exported.entityEntries.length,
          total_bytes: exported.manifest.assets.reduce(
            (sum, asset) => sum + asset.bytes,
            0,
          ),
          updated_at: now(),
        },
      });
      await uploadSnapshot(paths.exportRoot, pointer, head);
      await reportPhase({
        runId,
        phase: "complete",
        index: phaseTotal,
        total: phaseTotal,
        status: "completed",
        message: "WebDAV Sync completed.",
        diagnostics,
      });
      return persistState({
        queue_state: "idle",
        diagnostics,
        conflict_report: undefined,
        last_run: {
          run_id: runId,
          status: "completed",
          started_at: startedAt,
          completed_at: now(),
          diagnostics,
          snapshot_id: pointer.snapshot_id,
          manifest_hash: pointer.manifest_hash,
        },
      });
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error);
      const code = message.includes("webdav_sync_remote_changed_during_sync")
        ? "webdav_sync_remote_changed_during_sync"
        : "webdav_sync_failed";
      const entry = diagnostic({
        code,
        severity: "error",
        message,
      });
      await reportPhase({
        runId,
        phase: "failed",
        index: phaseTotal,
        total: phaseTotal,
        status: "failed_retryable",
        message,
        diagnostics: [entry],
      });
      return persistState({
        queue_state: "failed_retryable",
        diagnostics: [entry],
        last_run: {
          run_id: runId,
          status: "failed_retryable",
          started_at: startedAt,
          completed_at: now(),
          diagnostics: [entry],
        },
      });
    }
  }

  async function pauseWebDavSync() {
    return persistState({ paused: true });
  }

  async function resumeWebDavSync() {
    return persistState({ paused: false });
  }

  async function retryWebDavSync() {
    await persistState({
      paused: false,
      queue_state: "queued",
      diagnostics: [],
      conflict_report: undefined,
    });
    return runSync();
  }

  async function resolveWebDavSyncConflict(args: { action: string }) {
    const state = await loadWebDavSyncState();
    const action = cleanString(args.action) || "keep_local";
    if (action === "keep_local" && state.conflict_report) {
      return persistState({
        queue_state: "queued",
        conflict_report: { ...state.conflict_report, status: "resolved" },
        diagnostics: [],
      });
    }
    if (action === "clear_after_manual_edit") {
      return retryWebDavSync();
    }
    return persistState({
      queue_state: "blocked_conflict",
      diagnostics: [
        diagnostic({
          code: "webdav_sync_conflict_action_unsupported",
          severity: "warning",
          message: `WebDAV Sync conflict action is not safely supported in v1: ${action}`,
        }),
      ],
    });
  }

  return {
    loadWebDavSyncState,
    runSync,
    pauseWebDavSync,
    resumeWebDavSync,
    retryWebDavSync,
    resolveWebDavSyncConflict,
  };
}

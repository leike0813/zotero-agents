import {
  SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_ID,
  SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_VERSION,
  SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID,
  SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_VERSION,
  SYNTHESIS_WEBDAV_SYNC_RETRY_DELAYS_MS,
  SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_ID,
  SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_VERSION,
  rebuildSynthesisWebDavSnapshotPointer,
  rebuildSynthesisWebDavSyncState,
  synthesisWebDavRemotePath,
  synthesisWebDavSnapshotId,
  type SynthesisWebDavRemoteHead,
  type SynthesisWebDavSyncApplicationOptions,
  type SynthesisWebDavSyncConflictReport,
  type SynthesisWebDavSyncDiagnostic,
  type SynthesisWebDavSyncState,
} from "../../synthesis-contracts/src/webDavSync.js";
import {
  rebuildSynthesisHostWebDavSyncDescription,
  rebuildSynthesisHostWebDavSyncEnsureCollectionResult,
  rebuildSynthesisHostWebDavSyncReadResult,
  rebuildSynthesisHostWebDavSyncWriteResult,
  type SynthesisHostWebDavSyncDescription,
} from "../../synthesis-contracts/src/webDavSyncPort.js";

const STALE_SYNCING_MS = 5 * 60 * 1000;

export class SynthesisWebDavSyncApplicationError extends Error {
  constructor(
    readonly code: string,
    readonly kind: "retryable" | "permanent" | "conflict" = "permanent",
  ) {
    super(code);
    this.name = "SynthesisWebDavSyncApplicationError";
  }
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function diagnostic(
  code: string,
  severity: "info" | "warning" | "error" = "warning",
  details?: unknown,
): SynthesisWebDavSyncDiagnostic {
  return {
    code,
    severity,
    message: code,
    ...(details === undefined ? {} : { details }),
  };
}

function allowedActions(state: SynthesisWebDavSyncState) {
  if (!state.adapter_configured) return [] as string[];
  if (state.queue_state === "blocked_conflict") {
    return ["resolveWebDavSyncConflict", "retryWebDavSync", "pauseWebDavSync"];
  }
  if (state.paused) return ["resumeWebDavSync", "syncWebDavNow"];
  if (state.queue_state === "syncing") return ["pauseWebDavSync"];
  return ["syncWebDavNow", "pauseWebDavSync"];
}

function conflictActions(state: SynthesisWebDavSyncState) {
  return state.queue_state === "blocked_conflict"
    ? ["keep_local", "save_remote_copy", "clear_after_manual_edit"]
    : [];
}

function normalizedSavedState(value: unknown) {
  if (value === null || value === undefined) return null;
  try {
    return rebuildSynthesisWebDavSyncState(value);
  } catch {
    throw new SynthesisWebDavSyncApplicationError(
      "webdav_sync_state_invalid",
      "permanent",
    );
  }
}

function staleSyncing(state: SynthesisWebDavSyncState, timestamp: string) {
  if (state.queue_state !== "syncing") return false;
  const updatedAt = Date.parse(state.progress?.updated_at || state.updated_at);
  const current = Date.parse(timestamp);
  return (
    Number.isFinite(updatedAt) &&
    Number.isFinite(current) &&
    current - updatedAt > STALE_SYNCING_MS
  );
}

function parentCollections(paths: readonly string[]) {
  const collections = new Set<string>();
  for (const path of paths) {
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      collections.add(parts.slice(0, index).join("/"));
    }
  }
  return [...collections].sort((left, right) => left.localeCompare(right));
}

export function createSynthesisWebDavSyncApplication(
  options: SynthesisWebDavSyncApplicationOptions,
) {
  const now = options.now ?? (() => new Date().toISOString());
  const retryDelays = (
    options.retryDelaysMs ?? SYNTHESIS_WEBDAV_SYNC_RETRY_DELAYS_MS
  )
    .slice(0, 4)
    .map((value) => Math.max(0, Math.floor(value)))
    .filter(Number.isFinite);
  let stopping = false;
  let active: Promise<SynthesisWebDavSyncState> | null = null;
  let triggerGeneration = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let aborted = options.abortSignal?.aborted === true;

  const clearTimer = () => {
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  };

  const cancelTriggerChain = () => {
    triggerGeneration += 1;
    clearTimer();
  };

  options.abortSignal?.addEventListener(
    "abort",
    () => {
      aborted = true;
      cancelTriggerChain();
    },
    { once: true },
  );

  async function describeHost(): Promise<SynthesisHostWebDavSyncDescription> {
    try {
      return rebuildSynthesisHostWebDavSyncDescription(
        await options.hostPort.describe(),
      );
    } catch {
      return rebuildSynthesisHostWebDavSyncDescription({
        status: "unavailable",
        configStatus: "invalid",
        autoSyncEnabled: false,
        autoRetryEnabled: false,
        baseUrl: "",
        remotePath: "",
        username: "",
        diagnostics: ["webdav_sync_host_description_failed"],
      });
    }
  }

  async function save(state: SynthesisWebDavSyncState) {
    state.allowed_actions = allowedActions(state);
    state.conflict_actions = conflictActions(state);
    const normalized = rebuildSynthesisWebDavSyncState(state);
    await options.stateStore.save(normalized);
    return normalized;
  }

  async function loadWebDavSyncState() {
    const timestamp = now();
    const host = await describeHost();
    const configured =
      host.status === "available" && host.configStatus === "configured";
    const fallback: SynthesisWebDavSyncState = {
      schema_id: SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_ID,
      schema_version: SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_VERSION,
      queue_state: configured ? "idle" : "disabled",
      paused: false,
      adapter_configured: configured,
      config_status: host.configStatus,
      base_url: host.baseUrl,
      remote_path: host.remotePath,
      username: host.username || undefined,
      credential_updated_at: host.credentialUpdatedAt,
      connection_test: host.connectionTest,
      diagnostics: configured
        ? []
        : host.diagnostics.map((code) =>
            diagnostic(
              code,
              code === "webdav_sync_disabled" ? "info" : "error",
            ),
          ),
      allowed_actions: [],
      updated_at: timestamp,
    };
    const saved = normalizedSavedState(await options.stateStore.load());
    const state: SynthesisWebDavSyncState = {
      ...fallback,
      ...saved,
      schema_id: SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_ID,
      schema_version: SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_VERSION,
      adapter_configured: configured,
      config_status: host.configStatus,
      base_url: host.baseUrl,
      remote_path: host.remotePath,
      username: host.username || undefined,
      credential_updated_at: host.credentialUpdatedAt,
      connection_test: host.connectionTest,
      diagnostics: Array.isArray(saved?.diagnostics)
        ? saved.diagnostics
        : fallback.diagnostics,
      allowed_actions: [],
      updated_at: saved?.updated_at || timestamp,
    };
    if (!configured) {
      cancelTriggerChain();
      state.queue_state = "disabled";
      state.diagnostics = fallback.diagnostics;
    } else if (state.queue_state === "disabled") {
      state.queue_state = "idle";
      state.diagnostics = [];
    } else if (staleSyncing(state, timestamp)) {
      state.queue_state = "failed_retryable";
      state.diagnostics = [
        diagnostic("webdav_sync_stale_running_recovered", "warning", {
          previous_updated_at: state.updated_at,
          ...(state.last_phase ? { last_phase: state.last_phase } : {}),
        }),
      ];
    }
    return save(state);
  }

  async function persistState(patch: Partial<SynthesisWebDavSyncState>) {
    const current = await loadWebDavSyncState();
    return save({ ...current, ...patch, updated_at: now() });
  }

  async function reportPhase(
    runId: string,
    phase: string,
    index: number,
    total: number,
    status:
      | "running"
      | "queued"
      | "waiting"
      | "completed"
      | "failed_retryable"
      | "failed_terminal" = "running",
    message = phase,
    diagnostics: SynthesisWebDavSyncDiagnostic[] = [],
  ) {
    await options.progressReporter?.({
      jobName: "synthesis:webdav-sync",
      runId,
      source: "webdav_sync",
      label: "WebDAV Sync",
      status,
      phase,
      phaseLabel: phase.charAt(0).toUpperCase() + phase.slice(1),
      message,
      processedCount: index,
      totalCount: total,
      progressMode: "determinate",
      diagnosticsJson: JSON.stringify(diagnostics),
    });
    if (status === "running") {
      await persistState({
        queue_state: "syncing",
        last_phase: phase,
        progress: {
          phase,
          phase_label: phase.charAt(0).toUpperCase() + phase.slice(1),
          message,
          processed_count: index,
          total_count: total,
          updated_at: now(),
        },
      });
    }
  }

  function hostFailure(
    diagnostics: readonly string[],
    fallback: string,
  ): never {
    throw new SynthesisWebDavSyncApplicationError(
      cleanString(diagnostics[0]) || fallback,
      "retryable",
    );
  }

  async function readRemoteHead(): Promise<SynthesisWebDavRemoteHead> {
    const response = rebuildSynthesisHostWebDavSyncReadResult(
      await options.hostPort.readText({ path: "HEAD.json" }),
    );
    if (response.status === "missing") return { missing: true };
    if (response.status === "unavailable") {
      hostFailure(response.diagnostics, "webdav_sync_host_read_failed");
    }
    let raw: unknown;
    try {
      raw = JSON.parse(response.text);
    } catch {
      throw new SynthesisWebDavSyncApplicationError(
        "webdav_sync_head_invalid",
        "permanent",
      );
    }
    try {
      return {
        pointer: rebuildSynthesisWebDavSnapshotPointer(raw),
        ...(response.etag ? { etag: response.etag } : {}),
        missing: false,
      };
    } catch {
      throw new SynthesisWebDavSyncApplicationError(
        "webdav_sync_head_invalid",
        "permanent",
      );
    }
  }

  function remoteSource(pointer: { snapshot_id: string }) {
    return {
      async readManifestText() {
        const response = rebuildSynthesisHostWebDavSyncReadResult(
          await options.hostPort.readText({
            path: synthesisWebDavRemotePath(
              "snapshots",
              pointer.snapshot_id,
              "manifest.json",
            ),
          }),
        );
        if (response.status !== "available") {
          if (response.status === "unavailable") {
            hostFailure(
              response.diagnostics,
              "webdav_sync_manifest_download_failed",
            );
          }
          return null;
        }
        return response.text;
      },
      async readAssetText(path: string) {
        if (!path.startsWith("bundles/")) {
          throw new SynthesisWebDavSyncApplicationError(
            "webdav_sync_asset_path_invalid",
            "permanent",
          );
        }
        const response = rebuildSynthesisHostWebDavSyncReadResult(
          await options.hostPort.readText({
            path: synthesisWebDavRemotePath(
              "snapshots",
              pointer.snapshot_id,
              path,
            ),
          }),
        );
        if (response.status !== "available") {
          if (response.status === "unavailable") {
            hostFailure(
              response.diagnostics,
              "webdav_sync_bundle_download_failed",
            );
          }
          return null;
        }
        return response.text;
      },
    };
  }

  async function ensureCollections(paths: readonly string[]) {
    for (const path of parentCollections(paths)) {
      const result = rebuildSynthesisHostWebDavSyncEnsureCollectionResult(
        await options.hostPort.ensureCollection({ path }),
      );
      if (result.status !== "ready") {
        hostFailure(result.diagnostics, "webdav_sync_host_collection_failed");
      }
    }
  }

  async function assertHeadCurrent(observed: SynthesisWebDavRemoteHead) {
    const current = await readRemoteHead();
    if (
      current.missing !== observed.missing ||
      current.pointer?.manifest_hash !== observed.pointer?.manifest_hash ||
      (!observed.missing && current.etag !== observed.etag)
    ) {
      throw new SynthesisWebDavSyncApplicationError(
        "webdav_sync_remote_changed_during_sync",
        "retryable",
      );
    }
  }

  async function uploadExport(
    built: Awaited<ReturnType<typeof options.durable.buildExport>>,
    pointer: ReturnType<typeof rebuildSynthesisWebDavSnapshotPointer>,
    observed: SynthesisWebDavRemoteHead,
  ) {
    await assertHeadCurrent(observed);
    const assets = [...built.assets].sort((left, right) =>
      left.path.localeCompare(right.path),
    );
    const remoteAssets = assets.map((asset) =>
      synthesisWebDavRemotePath("snapshots", pointer.snapshot_id, asset.path),
    );
    const manifestPath = synthesisWebDavRemotePath(
      "snapshots",
      pointer.snapshot_id,
      "manifest.json",
    );
    await ensureCollections([...remoteAssets, manifestPath, "HEAD.json"]);
    for (let index = 0; index < assets.length; index += 1) {
      const result = rebuildSynthesisHostWebDavSyncWriteResult(
        await options.hostPort.writeText({
          path: remoteAssets[index],
          text: assets[index].text,
        }),
      );
      if (result.status !== "written") {
        if (result.status === "conflict") {
          throw new SynthesisWebDavSyncApplicationError(
            "webdav_sync_remote_changed_during_sync",
            "retryable",
          );
        }
        hostFailure(result.diagnostics, "webdav_sync_snapshot_upload_failed");
      }
    }
    const manifestResult = rebuildSynthesisHostWebDavSyncWriteResult(
      await options.hostPort.writeText({
        path: manifestPath,
        text: built.manifestText,
      }),
    );
    if (manifestResult.status !== "written") {
      if (manifestResult.status === "conflict") {
        throw new SynthesisWebDavSyncApplicationError(
          "webdav_sync_remote_changed_during_sync",
          "retryable",
        );
      }
      hostFailure(
        manifestResult.diagnostics,
        "webdav_sync_snapshot_upload_failed",
      );
    }
    const headResult = rebuildSynthesisHostWebDavSyncWriteResult(
      await options.hostPort.writeText({
        path: "HEAD.json",
        text: JSON.stringify(pointer, null, 2),
        ...(observed.etag ? { ifMatch: observed.etag } : {}),
      }),
    );
    if (headResult.status === "conflict") {
      throw new SynthesisWebDavSyncApplicationError(
        "webdav_sync_remote_changed_during_sync",
        "retryable",
      );
    }
    if (headResult.status !== "written") {
      hostFailure(headResult.diagnostics, "webdav_sync_head_upload_failed");
    }
  }

  function conflictReport(
    runId: string,
    conflicts: SynthesisWebDavSyncConflictReport["conflicts"],
    code = "webdav_sync_conflict_blocked",
  ): SynthesisWebDavSyncConflictReport {
    return {
      schema_id: SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_ID,
      schema_version: SYNTHESIS_WEBDAV_SYNC_CONFLICT_SCHEMA_VERSION,
      conflict_id: runId,
      status: "blocked",
      conflicts,
      diagnostics: [diagnostic(code, "warning")],
    };
  }

  async function executeSync() {
    if (stopping) {
      throw new SynthesisWebDavSyncApplicationError("stopping", "permanent");
    }
    if (aborted) {
      throw new SynthesisWebDavSyncApplicationError("aborted", "permanent");
    }
    const startedAt = now();
    const runId = `webdav-sync-${startedAt.replace(/[^0-9A-Za-z]+/g, "-")}`;
    const phaseTotal = 10;
    const initial = await loadWebDavSyncState();
    if (!initial.adapter_configured || initial.queue_state === "disabled") {
      return initial;
    }
    if (initial.paused) return persistState({ queue_state: "queued" });
    if (initial.queue_state === "blocked_conflict") return initial;
    await persistState({ queue_state: "syncing", diagnostics: [] });
    const runDiagnostics: SynthesisWebDavSyncDiagnostic[] = [];
    try {
      await reportPhase(
        runId,
        "head",
        1,
        phaseTotal,
        "running",
        "Reading WebDAV remote HEAD.",
      );
      const head = await readRemoteHead();
      if (head.pointer) {
        await reportPhase(
          runId,
          "download",
          2,
          phaseTotal,
          "running",
          "Downloading WebDAV durable snapshot.",
        );
        await reportPhase(
          runId,
          "preview",
          3,
          phaseTotal,
          "running",
          "Validating downloaded durable snapshot.",
        );
        const preview = await options.durable.previewImport(
          remoteSource(head.pointer),
        );
        runDiagnostics.push(
          ...preview.diagnostics.map((entry) => {
            const details = {
              ...(entry.path ? { path: entry.path } : {}),
              ...(entry.entityKind ? { entity_kind: entry.entityKind } : {}),
              ...(entry.entityId ? { entity_id: entry.entityId } : {}),
            };
            return diagnostic(
              entry.code,
              entry.severity,
              Object.keys(details).length > 0 ? details : undefined,
            );
          }),
        );
        if (preview.conflicts.length > 0) {
          await options.durable.discardImport(preview.receiptId);
          const report = conflictReport(
            runId,
            preview.conflicts.map((entry) => ({
              asset_path: entry.path,
              reason: entry.reason,
              base_hash: entry.baseHash,
              local_hash: entry.localHash,
              remote_hash: entry.remoteHash,
            })),
          );
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
        if (!preview.ok || !preview.receiptId || !preview.manifestHash) {
          await options.durable.discardImport(preview.receiptId);
          throw new SynthesisWebDavSyncApplicationError(
            "webdav_sync_snapshot_validation_failed",
            "permanent",
          );
        }
        if (
          preview.unbasedUpdates > 0 &&
          options.acknowledgeUnbasedUpdates !== true
        ) {
          await options.durable.discardImport(preview.receiptId);
          const report = conflictReport(
            runId,
            [
              {
                asset_path: "durable://unbased-updates",
                reason: "unbased_update_acknowledgement_required",
              },
            ],
            "webdav_sync_unbased_update_blocked",
          );
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
        await reportPhase(
          runId,
          "apply",
          4,
          phaseTotal,
          "running",
          "Applying durable snapshot to local Synthesis store.",
        );
        await options.durable.applyImport({
          receiptId: preview.receiptId,
          manifestHash: preview.manifestHash,
          acknowledgeUnbasedUpdates: options.acknowledgeUnbasedUpdates === true,
        });
      } else {
        runDiagnostics.push(
          diagnostic("webdav_sync_head_missing_initializable", "info"),
        );
      }
      await reportPhase(
        runId,
        "export",
        5,
        phaseTotal,
        "running",
        "Exporting local durable Synthesis state.",
      );
      const built = await options.durable.buildExport();
      const pointer = rebuildSynthesisWebDavSnapshotPointer({
        schema_id: SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID,
        schema_version: SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_VERSION,
        snapshot_id: synthesisWebDavSnapshotId(
          startedAt,
          built.manifest.manifest_hash,
        ),
        manifest_hash: built.manifest.manifest_hash,
        updated_at: now(),
        ...(built.manifest.producer_version
          ? { producer_version: built.manifest.producer_version }
          : {}),
      });
      await reportPhase(
        runId,
        "upload",
        8,
        phaseTotal,
        "running",
        "Uploading WebDAV durable snapshot.",
      );
      await uploadExport(built, pointer, head);
      await reportPhase(
        runId,
        "complete",
        phaseTotal,
        phaseTotal,
        "completed",
        "WebDAV Sync completed.",
        runDiagnostics,
      );
      return persistState({
        queue_state: "idle",
        retry_attempt: undefined,
        next_retry_at: undefined,
        diagnostics: runDiagnostics,
        conflict_report: undefined,
        last_run: {
          run_id: runId,
          status: "completed",
          started_at: startedAt,
          completed_at: now(),
          diagnostics: runDiagnostics,
          snapshot_id: pointer.snapshot_id,
          manifest_hash: pointer.manifest_hash,
        },
      });
    } catch (error) {
      const failure =
        error instanceof SynthesisWebDavSyncApplicationError
          ? error
          : new SynthesisWebDavSyncApplicationError(
              cleanString(error instanceof Error ? error.message : error) ||
                "webdav_sync_failed",
              "retryable",
            );
      const permanent = failure.kind === "permanent";
      const entry = diagnostic(failure.code, "error");
      await reportPhase(
        runId,
        "failed",
        phaseTotal,
        phaseTotal,
        permanent ? "failed_terminal" : "failed_retryable",
        failure.code,
        [entry],
      );
      return persistState({
        queue_state: permanent ? "failed_permanent" : "failed_retryable",
        retry_attempt: undefined,
        next_retry_at: undefined,
        diagnostics: [entry],
        last_run: {
          run_id: runId,
          status: permanent ? "failed_permanent" : "failed_retryable",
          started_at: startedAt,
          completed_at: now(),
          diagnostics: [entry],
        },
      });
    }
  }

  function runSync() {
    if (stopping) {
      return Promise.reject(
        new SynthesisWebDavSyncApplicationError("stopping", "permanent"),
      );
    }
    if (active) {
      return Promise.reject(
        new SynthesisWebDavSyncApplicationError(
          "webdav_sync_busy",
          "retryable",
        ),
      );
    }
    const task = executeSync();
    active = task;
    return task.finally(() => {
      if (active === task) active = null;
    });
  }

  function retryTimestamp(delayMs: number) {
    const parsed = Date.parse(now());
    return new Date(
      (Number.isFinite(parsed) ? parsed : Date.now()) + delayMs,
    ).toISOString();
  }

  async function scheduleRetry(
    state: SynthesisWebDavSyncState,
    generation: number,
    retryIndex: number,
  ): Promise<SynthesisWebDavSyncState> {
    if (
      stopping ||
      aborted ||
      generation !== triggerGeneration ||
      state.queue_state !== "failed_retryable" ||
      state.paused ||
      retryIndex >= retryDelays.length
    ) {
      clearTimer();
      return state;
    }
    const host = await describeHost();
    if (host.status !== "available" || !host.autoRetryEnabled) return state;
    const delay = retryDelays[retryIndex];
    const scheduled = await persistState({
      retry_attempt: retryIndex + 1,
      next_retry_at: retryTimestamp(delay),
    });
    clearTimer();
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      if (stopping || aborted || generation !== triggerGeneration) return;
      void runSync()
        .then((next) => scheduleRetry(next, generation, retryIndex + 1))
        .catch(() => undefined);
    }, delay);
    return scheduled;
  }

  async function triggerWebDavSync() {
    cancelTriggerChain();
    const generation = triggerGeneration;
    return scheduleRetry(await runSync(), generation, 0);
  }

  async function triggerWebDavAutoSync() {
    const host = await describeHost();
    if (host.status !== "available" || !host.autoSyncEnabled || aborted) {
      return loadWebDavSyncState();
    }
    return triggerWebDavSync();
  }

  async function isWebDavAutoSyncEnabled() {
    const host = await describeHost();
    return host.status === "available" && host.autoSyncEnabled && !aborted;
  }

  async function pauseWebDavSync() {
    cancelTriggerChain();
    return persistState({
      paused: true,
      retry_attempt: undefined,
      next_retry_at: undefined,
    });
  }

  const resumeWebDavSync = () => persistState({ paused: false });

  async function retryWebDavSync() {
    await persistState({
      paused: false,
      queue_state: "queued",
      diagnostics: [],
      conflict_report: undefined,
      retry_attempt: undefined,
      next_retry_at: undefined,
    });
    return triggerWebDavSync();
  }

  async function resolveWebDavSyncConflict(args: { action: string }) {
    cancelTriggerChain();
    const state = await loadWebDavSyncState();
    const action = cleanString(args.action) || "keep_local";
    if (action === "keep_local" && state.conflict_report) {
      return persistState({
        queue_state: "queued",
        conflict_report: { ...state.conflict_report, status: "resolved" },
        diagnostics: [],
      });
    }
    if (action === "clear_after_manual_edit") return retryWebDavSync();
    return persistState({
      queue_state: "blocked_conflict",
      diagnostics: [
        diagnostic("webdav_sync_conflict_action_unsupported", "warning", {
          action,
        }),
      ],
    });
  }

  function stopAdmission() {
    stopping = true;
    cancelTriggerChain();
  }

  async function shutdown() {
    stopAdmission();
    if (active) await active.catch(() => undefined);
  }

  return {
    loadWebDavSyncState,
    runSync,
    triggerWebDavSync,
    triggerWebDavAutoSync,
    isWebDavAutoSyncEnabled,
    pauseWebDavSync,
    resumeWebDavSync,
    retryWebDavSync,
    resolveWebDavSyncConflict,
    stopAdmission,
    shutdown,
  };
}

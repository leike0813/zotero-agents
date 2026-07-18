import { joinPath } from "../../utils/path";
import { createSynthesisWebDavSyncApplication } from "../../../packages/synthesis-application/src/webDavSyncApplication";
import type {
  SynthesisDurableBundleSource,
  SynthesisDurableSyncManifest,
} from "../../../packages/synthesis-contracts/src/durableBundle";
import type {
  SynthesisWebDavSyncDurablePort,
  SynthesisWebDavSyncProgressReport,
  SynthesisWebDavSyncState,
  SynthesisWebDavSyncStateStore,
} from "../../../packages/synthesis-contracts/src/webDavSync";
import type { SynthesisHostWebDavSyncPort } from "../../../packages/synthesis-contracts/src/webDavSyncPort";
import {
  ensureRuntimeDirectory,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  validateManagedRelativePath,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import {
  applySynthesisDurableImport,
  previewSynthesisDurableImport,
  readSynthesisDurableManifest,
  synthesisDurableCanonicalJsonText,
  writeSynthesisDurableExportSnapshot,
  type SynthesisDurableExportProgress,
} from "./durableSync";
import type { SynthesisRepository } from "./repository";

export type {
  SynthesisWebDavRemoteHead,
  SynthesisWebDavSnapshotPointer,
  SynthesisWebDavSyncConflictReport,
  SynthesisWebDavSyncProgressReport,
  SynthesisWebDavSyncQueueState,
  SynthesisWebDavSyncState,
} from "../../../packages/synthesis-contracts/src/webDavSync";

type ServiceOptions = {
  root: string;
  persistenceRoot?: string;
  repository?: SynthesisRepository;
  hostPort: SynthesisHostWebDavSyncPort;
  now?: () => string;
  progressReporter?: (
    report: SynthesisWebDavSyncProgressReport,
  ) => void | Promise<void>;
  retryDelaysMs?: number[];
  abortSignal?: AbortSignal;
};

function cleanString(value: unknown) {
  return String(value ?? "").trim();
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

async function readJson(path: string) {
  if (!(await runtimePathExists(path))) return null;
  return JSON.parse(await readRuntimeTextFile(path)) as unknown;
}

async function writeJson(path: string, value: unknown) {
  await writeRuntimeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function productionStateStore(root: string): SynthesisWebDavSyncStateStore {
  const paths = syncPaths(root);
  return {
    async load() {
      await ensureRuntimeDirectory(paths.syncRoot);
      return readJson(paths.statePath);
    },
    async save(state: SynthesisWebDavSyncState) {
      await ensureRuntimeDirectory(paths.syncRoot);
      await writeJson(paths.statePath, state);
      if (state.conflict_report) {
        await writeJson(paths.conflictPath, state.conflict_report);
      } else if (await runtimePathExists(paths.conflictPath)) {
        await removeRuntimePath(paths.conflictPath);
      }
    },
  };
}

function progressFromDurable(
  progress: SynthesisDurableExportProgress,
  runId: string,
): SynthesisWebDavSyncProgressReport {
  return {
    jobName: "synthesis:webdav-sync",
    runId,
    source: "webdav_sync",
    label: "WebDAV Sync",
    status: "running",
    phase: `export_${progress.phase}`,
    phaseLabel: progress.phase_label,
    message: progress.message,
    processedCount: progress.processed_count,
    totalCount: progress.total_count,
    progressMode:
      progress.total_count === undefined ? "indeterminate" : "determinate",
    diagnosticsJson: "[]",
  };
}

async function materializeSource(
  source: SynthesisDurableBundleSource,
  targetRoot: string,
) {
  await removeRuntimePath(targetRoot);
  await ensureRuntimeDirectory(targetRoot);
  const manifestText = await source.readManifestText();
  if (typeof manifestText !== "string") {
    throw new Error("durable_manifest_missing");
  }
  await writeRuntimeTextFile(
    joinPath(targetRoot, "manifest.json"),
    manifestText,
  );
  let manifest: SynthesisDurableSyncManifest;
  try {
    manifest = JSON.parse(manifestText) as SynthesisDurableSyncManifest;
  } catch {
    throw new Error("durable_manifest_json_invalid");
  }
  if (!Array.isArray(manifest.assets)) {
    throw new Error("durable_manifest_assets_invalid");
  }
  for (const asset of manifest.assets) {
    const checked = validateManagedRelativePath(asset.path);
    if (!checked.ok || !checked.normalizedPath.startsWith("bundles/")) {
      throw new Error("durable_asset_path_invalid");
    }
    const text = await source.readAssetText(checked.normalizedPath);
    if (typeof text !== "string") throw new Error("durable_asset_missing");
    await writeRuntimeTextFile(
      joinPath(targetRoot, checked.normalizedPath),
      text,
    );
  }
  return manifest;
}

function productionDurablePort(args: {
  root: string;
  persistenceRoot: string;
  repository: SynthesisRepository;
  now?: () => string;
  progressReporter?: ServiceOptions["progressReporter"];
}): SynthesisWebDavSyncDurablePort {
  const paths = syncPaths(args.persistenceRoot);
  let receipt:
    | { receiptId: string; manifestHash: string; sourceRoot: string }
    | undefined;
  let receiptSequence = 0;
  return {
    async previewImport(source) {
      receipt = undefined;
      await materializeSource(source, paths.importRoot);
      const preview = await previewSynthesisDurableImport({
        root: args.root,
        sourceRoot: paths.importRoot,
        repository: args.repository,
      });
      const manifestHash = preview.manifest?.manifest_hash;
      const receiptId =
        preview.ok && manifestHash
          ? `production-webdav-import:${++receiptSequence}`
          : undefined;
      if (receiptId && manifestHash) {
        receipt = {
          receiptId,
          manifestHash,
          sourceRoot: paths.importRoot,
        };
      }
      return {
        ok: preview.ok,
        additions: preview.additions,
        updates: preview.updates,
        unbasedUpdates: 0,
        unchanged: preview.unchanged,
        tombstones: preview.tombstones,
        conflicts: preview.conflicts
          .filter((entry) => entry.entity_kind !== "tombstone")
          .map((entry) => ({
            entityKind: entry.entity_kind as Exclude<
              typeof entry.entity_kind,
              "tombstone"
            >,
            entityId: entry.entity_id,
            path: entry.path,
            reason: "both_changed" as const,
            baseHash: entry.base_hash || "",
            localHash: entry.local_hash || "",
            remoteHash: entry.remote_hash || "",
          })),
        ...(manifestHash ? { manifestHash } : {}),
        ...(receiptId ? { receiptId } : {}),
        diagnostics: preview.diagnostics.map((entry) => ({
          code: entry.code,
          severity: "error" as const,
          ...(entry.path ? { path: entry.path } : {}),
        })),
      };
    },
    async applyImport(request) {
      const current = receipt;
      receipt = undefined;
      if (
        !current ||
        current.receiptId !== request.receiptId ||
        current.manifestHash !== request.manifestHash
      ) {
        throw new Error("receipt_invalid");
      }
      const applied = await applySynthesisDurableImport({
        root: args.root,
        sourceRoot: current.sourceRoot,
        repository: args.repository,
        runId: current.receiptId,
      });
      if (!applied.applied) throw new Error("durable_import_apply_failed");
      return {
        status: "committed" as const,
        manifestHash: current.manifestHash,
        imported:
          applied.preview.additions +
          applied.preview.updates +
          applied.preview.unchanged,
      };
    },
    async discardImport(receiptId) {
      if (
        !receipt ||
        (receiptId !== undefined && receipt.receiptId !== receiptId)
      ) {
        return false;
      }
      receipt = undefined;
      return true;
    },
    async buildExport() {
      await removeRuntimePath(paths.exportRoot);
      await ensureRuntimeDirectory(paths.exportRoot);
      const runId = `webdav-sync-${(args.now?.() || new Date().toISOString()).replace(/[^0-9A-Za-z]+/g, "-")}`;
      const snapshot = await writeSynthesisDurableExportSnapshot({
        root: args.root,
        outputRoot: paths.exportRoot,
        repository: args.repository,
        now: args.now,
        onProgress: async (progress) => {
          await args.progressReporter?.(progressFromDurable(progress, runId));
        },
      });
      return {
        manifest: snapshot.manifest as never,
        manifestText: synthesisDurableCanonicalJsonText(snapshot.manifest),
        assets: snapshot.assets.map((asset) => ({
          path: asset.relativePath,
          text: asset.text,
          bundle: asset.bundle as never,
        })),
        entries: [],
        summary: {
          bundleCount: snapshot.assets.length,
          entityCount: snapshot.entityEntries.length,
          topicCount: 0,
          manifestHash: snapshot.manifest.manifest_hash,
        },
      };
    },
  };
}

function repositoryRequiredPort(
  hostPort: SynthesisHostWebDavSyncPort,
  repository?: SynthesisRepository,
): SynthesisHostWebDavSyncPort {
  if (repository) return hostPort;
  return {
    ...hostPort,
    async describe() {
      const current = await hostPort.describe();
      return {
        ...current,
        status: "unavailable",
        diagnostics: ["webdav_sync_repository_unavailable"],
      } as never;
    },
  };
}

export function createSynthesisWebDavSyncService(options: ServiceOptions) {
  const root = cleanString(options.root);
  const persistenceRoot = cleanString(options.persistenceRoot) || root;
  const repository = options.repository;
  const durable = repository
    ? productionDurablePort({
        root,
        persistenceRoot,
        repository,
        now: options.now,
        progressReporter: options.progressReporter,
      })
    : ({
        async buildExport() {
          throw new Error("webdav_sync_repository_unavailable");
        },
        async previewImport() {
          throw new Error("webdav_sync_repository_unavailable");
        },
        async applyImport() {
          throw new Error("webdav_sync_repository_unavailable");
        },
        async discardImport() {
          return false;
        },
      } as SynthesisWebDavSyncDurablePort);
  return createSynthesisWebDavSyncApplication({
    hostPort: repositoryRequiredPort(options.hostPort, repository),
    durable,
    stateStore: productionStateStore(persistenceRoot),
    now: options.now,
    progressReporter: options.progressReporter,
    retryDelaysMs: options.retryDelaysMs,
    abortSignal: options.abortSignal,
    acknowledgeUnbasedUpdates: true,
  });
}

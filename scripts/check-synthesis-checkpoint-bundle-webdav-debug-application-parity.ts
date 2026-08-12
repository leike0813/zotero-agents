import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSynthesisWebDavSyncApplication } from "../packages/synthesis-application/src/webDavSyncApplication.js";
import { canonicalizeSynthesisContractJson } from "../packages/synthesis-contracts/src/canonicalJson.js";
import type { SynthesisHostWebDavSyncPort } from "../packages/synthesis-contracts/src/webDavSyncPort.js";
import { createSynthesisSidecarDebugMaintenanceApplication } from "../apps/synthesis-service/src/debugMaintenanceApplicationNode.js";
import { createSynthesisSidecarDurableBundleApplication } from "../apps/synthesis-service/src/durableBundleApplicationNode.js";
import { openSynthesisSidecarIsolatedRepository } from "../apps/synthesis-service/src/isolatedRepository.js";
import { createSynthesisSidecarKnowledgeCheckpointApplication } from "../apps/synthesis-service/src/knowledgeCheckpointApplicationNode.js";
import { openSynthesisNodeSqliteAdapter } from "../apps/synthesis-service/src/repositoryNodeSqlite.js";
import { openSynthesisSidecarTopicCanonicalStore } from "../apps/synthesis-service/src/topicCanonicalStoreNode.js";
import { normalizeSynthesisApplicationParityTableRows } from "./synthesis-application-parity-policy.js";

const root = path.resolve(import.meta.dirname, "..");
const corpusPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-checkpoint-bundle-webdav-debug-application-parity-v1/corpus.json",
);

type Corpus = {
  schema: string;
  reportSchema: string;
  profileId: string;
  dataRootId: string;
  clock: string;
  receiptIds: string[];
  runIds: string[];
  faultPhases: string[];
  coverage: Record<string, string[]>;
  expected: {
    tables: number;
    indexes: number;
    applicationFamilies: number;
    retryLimit: number;
    bundleTextLimit: number;
    productionCapabilityRegistered: boolean;
  };
};

type ParityReport = {
  schema: string;
  corpusVersion: string;
  productionCapabilityRegistered: boolean;
  knowledgeCheckpoint: Record<string, any>;
  durableBundle: Record<string, any>;
  webDavSync: Record<string, any>;
  debugMaintenance: Record<string, any>;
  crossApplication: Record<string, any>;
  tables: Record<string, Array<Record<string, unknown>>>;
  canonical: {
    before: Record<string, string>;
    after: Record<string, string>;
    importBatchPresent: boolean;
  };
  webdav: {
    state: any;
    remote: Record<string, string>;
  };
  reopen: {
    tables: Record<string, Array<Record<string, unknown>>>;
    debugBasis: unknown;
    webdavState: unknown;
  };
};

export type SynthesisCheckpointBundleWebDavDebugApplicationParityCheck = {
  ok: boolean;
  corpus: string;
  reportSchema: string;
  tables: number;
  applicationFamilies: number;
  comparedTables: number;
  implementations: {
    node: { role: "oracle"; sourceFingerprint: string };
    rust: { role: "candidate"; sourceFingerprint: string };
  };
  errors: string[];
};

function fingerprint(paths: string[]) {
  const hash = createHash("sha256");
  for (const relative of [...paths].sort()) {
    hash.update(relative);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(root, relative)));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function readTree(directory: string) {
  const files: Record<string, string> = {};
  const visit = (current: string) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current).sort()) {
      const absolute = path.join(current, entry);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error("parity_symlink_rejected");
      if (stat.isDirectory()) visit(absolute);
      else {
        files[path.relative(directory, absolute).replaceAll(path.sep, "/")] =
          `sha256:${createHash("sha256")
            .update(fs.readFileSync(absolute))
            .digest("hex")}`;
      }
    }
  };
  visit(directory);
  return files;
}

function tableSnapshot(databasePath: string) {
  const connection = openSynthesisNodeSqliteAdapter(databasePath);
  try {
    const tables = connection.adapter
      .all(
        "SELECT name FROM sqlite_master WHERE type='table' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .map((row) => String(row.name));
    return Object.fromEntries(
      tables.map((table) => {
        if (!/^[a-z0-9_]+$/.test(table))
          throw new Error("parity_table_name_invalid");
        const rows = connection.adapter.all(`SELECT * FROM ${table}`);
        rows.sort((left, right) =>
          canonicalizeSynthesisContractJson(left).localeCompare(
            canonicalizeSynthesisContractJson(right),
          ),
        );
        return [table, rows];
      }),
    );
  } finally {
    connection.close();
  }
}

function createFileStateStore(stateRoot: string) {
  const statePath = path.join(stateRoot, "state.json");
  return {
    async load() {
      return fs.existsSync(statePath)
        ? JSON.parse(fs.readFileSync(statePath, "utf8"))
        : null;
    },
    async save(state: unknown) {
      fs.mkdirSync(stateRoot, { recursive: true });
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
    },
  };
}

function createFileHost(remoteRoot: string) {
  const writes: string[] = [];
  const resolve = (relative: string) => {
    if (
      !relative ||
      relative.startsWith("/") ||
      relative.includes("\\") ||
      relative.split("/").some((part) => !part || part === "." || part === "..")
    )
      throw new Error("webdav_sync_path_invalid");
    return path.join(remoteRoot, relative);
  };
  const etag = (absolute: string) =>
    fs.existsSync(absolute)
      ? `sha256:${createHash("sha256")
          .update(fs.readFileSync(absolute))
          .digest("hex")}`
      : "";
  const port: SynthesisHostWebDavSyncPort = {
    async describe() {
      return {
        status: "available",
        configStatus: "configured",
        autoSyncEnabled: false,
        autoRetryEnabled: false,
        baseUrl: "https://parity.invalid",
        remotePath: "synthesis",
        username: "fixture",
        diagnostics: [],
      };
    },
    async readText({ path: relative }: { path: string }) {
      const absolute = resolve(relative);
      if (!fs.existsSync(absolute))
        return { status: "missing", diagnostics: [] };
      return {
        status: "available",
        text: fs.readFileSync(absolute, "utf8"),
        etag: etag(absolute),
        diagnostics: [],
      };
    },
    async ensureCollection({ path: relative }: { path: string }) {
      fs.mkdirSync(resolve(relative), { recursive: true });
      return { status: "ready", diagnostics: [] };
    },
    async writeText({
      path: relative,
      text,
      ifMatch,
    }: {
      path: string;
      text: string;
      ifMatch?: string;
    }) {
      const absolute = resolve(relative);
      if (ifMatch && etag(absolute) !== ifMatch)
        return { status: "conflict", diagnostics: [] };
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, text, "utf8");
      writes.push(relative);
      return { status: "written", etag: etag(absolute), diagnostics: [] };
    },
  };
  return {
    writes,
    port,
  };
}

async function stableErrorCode(operation: () => Promise<unknown>) {
  try {
    await operation();
    return "none";
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
    )
      return error.code;
    return error instanceof Error ? error.message : "unknown_error";
  }
}

async function runNodeOracle(
  corpus: Corpus,
  runtimeRoot: string,
  canonicalRoot: string,
  webdavStateRoot: string,
  remoteRoot: string,
): Promise<ParityReport> {
  fs.mkdirSync(runtimeRoot, { recursive: true });
  fs.mkdirSync(canonicalRoot, { recursive: true });
  fs.mkdirSync(webdavStateRoot, { recursive: true });
  fs.mkdirSync(remoteRoot, { recursive: true });
  const repository = openSynthesisSidecarIsolatedRepository({
    profileRuntimeRoot: runtimeRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    now: () => corpus.clock,
  });
  repository.store.captureDurableImportState();
  const canonical = openSynthesisSidecarTopicCanonicalStore({
    profileRuntimeRoot: canonicalRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    createTransactionId: () => "canonical:final-r7",
  });
  const checkpoint = createSynthesisSidecarKnowledgeCheckpointApplication({
    repository: repository.store,
    now: () => corpus.clock,
    createReceiptId: () => corpus.receiptIds[0]!,
  });
  const canonicalBefore = readTree(canonicalRoot);
  const builtCheckpoint = await checkpoint.buildCheckpoint();
  const initialCheckpointPreview =
    await checkpoint.previewImport(builtCheckpoint);
  const checkpointAcknowledgementCode = await stableErrorCode(() =>
    checkpoint.applyImport({
      receiptId: initialCheckpointPreview.receiptId,
      checkpointHash: builtCheckpoint.checkpointHash,
      acknowledgeFullReplacement: false,
    }),
  );
  const checkpointPreview = await checkpoint.previewImport(builtCheckpoint);
  const checkpointApplied = await checkpoint.applyImport({
    receiptId: checkpointPreview.receiptId,
    checkpointHash: builtCheckpoint.checkpointHash,
    acknowledgeFullReplacement: true,
  });
  const checkpointReplayCode = await stableErrorCode(() =>
    checkpoint.applyImport({
      receiptId: checkpointPreview.receiptId,
      checkpointHash: builtCheckpoint.checkpointHash,
      acknowledgeFullReplacement: true,
    }),
  );

  const durable = createSynthesisSidecarDurableBundleApplication({
    repository: repository.store,
    canonicalStore: canonical,
    now: () => corpus.clock,
    producerVersion: "parity",
  });
  const durableExport = await durable.buildExport();
  const durableAssets = new Map(
    durableExport.assets.map((asset) => [asset.path, asset.text]),
  );
  const durablePreview = await durable.previewImport({
    readManifestText: async () => durableExport.manifestText,
    readAssetText: async (assetPath) => durableAssets.get(assetPath) ?? null,
  });
  if (!durablePreview.receiptId || !durablePreview.manifestHash)
    throw new Error("durable_parity_receipt_missing");
  const durableApplied = await durable.applyImport({
    receiptId: durablePreview.receiptId,
    manifestHash: durablePreview.manifestHash,
    acknowledgeUnbasedUpdates: false,
  });
  const durableReplayCode = await stableErrorCode(() =>
    durable.applyImport({
      receiptId: durablePreview.receiptId!,
      manifestHash: durablePreview.manifestHash!,
      acknowledgeUnbasedUpdates: false,
    }),
  );
  const stateStore = createFileStateStore(webdavStateRoot);
  const host = createFileHost(remoteRoot);
  const webdav = createSynthesisWebDavSyncApplication({
    now: () => corpus.clock,
    retryDelaysMs: [0, 0, 0, 0],
    stateStore,
    hostPort: host.port,
    durable,
  });
  const webdavResult = await webdav.triggerWebDavSync();
  const debug = createSynthesisSidecarDebugMaintenanceApplication({
    repository: repository.store,
    canonicalStore: canonical,
  });
  const debugSnapshot = debug.snapshot();
  const profiler = await debug.inspectProfiler();
  const tables = tableSnapshot(repository.paths.databasePath);
  const canonicalTree = readTree(canonicalRoot);
  const remoteTree = readTree(remoteRoot);
  const persistedState = await stateStore.load();

  await checkpoint.shutdown();
  await durable.shutdown();
  await webdav.shutdown();
  await debug.shutdown();
  canonical.close();
  repository.close();

  const reopened = openSynthesisSidecarIsolatedRepository({
    profileRuntimeRoot: runtimeRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    now: () => corpus.clock,
  });
  const reopenTables = tableSnapshot(reopened.paths.databasePath);
  const reopenDebug = reopened.store.captureDebugProjection();
  reopened.close();

  return {
    schema: corpus.reportSchema,
    corpusVersion: corpus.schema,
    productionCapabilityRegistered: false,
    knowledgeCheckpoint: {
      built: {
        contractVersion: builtCheckpoint.contractVersion,
        counts: builtCheckpoint.counts,
        hashPresent: builtCheckpoint.checkpointHash.startsWith("sha256:"),
      },
      preview: {
        receiptId: checkpointPreview.receiptId,
        diff: checkpointPreview.diff,
        overrideCount: checkpointPreview.userDecisionOverrides.length,
      },
      acknowledgementCode: checkpointAcknowledgementCode,
      replayCode: checkpointReplayCode,
      applied: checkpointApplied,
    },
    durableBundle: {
      manifestVersion: durableExport.manifest.manifest_schema_version,
      assetCount: durableExport.manifest.asset_count,
      entityCount: durableExport.entries.length,
      manifestHashPresent:
        durableExport.manifest.manifest_hash.startsWith("sha256:"),
      preview: {
        ok: durablePreview.ok,
        additions: durablePreview.additions,
        updates: durablePreview.updates,
        unchanged: durablePreview.unchanged,
      },
      applied: durableApplied,
      replayCode: durableReplayCode,
    },
    webDavSync: {
      queueState: webdavResult.queue_state,
      lastRunStatus: webdavResult.last_run?.status ?? null,
      writes: host.writes,
      schedulerEvents: [],
    },
    debugMaintenance: {
      snapshotStatus: debugSnapshot.status,
      schemaId: debugSnapshot.schemaId,
      profiler,
    },
    crossApplication: {
      checkpointApplied: true,
      bundleExported: true,
      webDavPublished: true,
      debugRead: true,
      downstreamTriggered: false,
    },
    tables,
    canonical: {
      before: canonicalBefore,
      after: canonicalTree,
      importBatchPresent: fs.existsSync(
        path.join(canonicalRoot, "import-batch.json"),
      ),
    },
    webdav: {
      state: persistedState,
      remote: remoteTree,
    },
    reopen: {
      tables: reopenTables,
      debugBasis: reopenDebug.basis,
      webdavState: await stateStore.load(),
    },
  };
}

function runRustCandidate(
  corpus: Corpus,
  runtimeRoot: string,
  canonicalRoot: string,
  webdavStateRoot: string,
  remoteRoot: string,
): ParityReport {
  const output = execFileSync(
    "cargo",
    [
      "+nightly-2026-07-25",
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "native/synthesis-sidecar/Cargo.toml",
      "-p",
      "synthesis-application",
      "--example",
      "checkpoint_bundle_webdav_debug_application_parity",
    ],
    {
      cwd: root,
      input: JSON.stringify({
        corpus,
        runtimeRoot,
        canonicalRoot,
        webdavStateRoot,
        remoteRoot,
      }),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  return JSON.parse(output) as ParityReport;
}

function equal(left: unknown, right: unknown) {
  return (
    canonicalizeSynthesisContractJson(left) ===
    canonicalizeSynthesisContractJson(right)
  );
}

function stableTableRows(table: string, rows: Array<Record<string, unknown>>) {
  const generatedBasisFields: Record<string, string[]> = {
    synt_tag_application_state: ["vocabulary_hash"],
    synt_concept_application_state: ["manifest_hash"],
    synt_topic_graph_application_state: ["manifest_hash"],
  };
  const omitted = new Set(generatedBasisFields[table] ?? []);
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(([field]) => !omitted.has(field)),
    ),
  );
}

function stableParityTableRows(
  role: "node" | "rust",
  table: string,
  rows: Array<Record<string, unknown>>,
) {
  return stableTableRows(
    table,
    normalizeSynthesisApplicationParityTableRows(role, table, rows),
  );
}

function compareReports(
  corpus: Corpus,
  node: ParityReport,
  rust: ParityReport,
  errors: string[],
) {
  if (
    node.schema !== corpus.reportSchema ||
    rust.schema !== corpus.reportSchema ||
    node.corpusVersion !== corpus.schema ||
    rust.corpusVersion !== corpus.schema
  )
    errors.push("report_schema_mismatch");
  if (
    node.productionCapabilityRegistered !== false ||
    rust.productionCapabilityRegistered !== false
  )
    errors.push("production_capability_changed");
  for (const [family, fields] of Object.entries({
    knowledgeCheckpoint: [
      "built.contractVersion",
      "built.counts",
      "built.hashPresent",
      "preview.receiptId",
      "preview.diff",
      "preview.overrideCount",
      "acknowledgementCode",
      "replayCode",
      "applied.status",
    ],
    durableBundle: [
      "manifestVersion",
      "assetCount",
      "entityCount",
      "manifestHashPresent",
      "preview",
      "applied.status",
      "applied.imported",
      "replayCode",
    ],
    webDavSync: ["queueState", "lastRunStatus", "writes"],
    debugMaintenance: ["snapshotStatus", "schemaId", "profiler.status"],
  })) {
    for (const field of fields) {
      const get = (report: ParityReport) =>
        field
          .split(".")
          .reduce<any>(
            (value, part) => value?.[part],
            report[family as keyof ParityReport],
          );
      if (!equal(get(node), get(rust)))
        errors.push(`dto_mismatch:${family}.${field}`);
    }
  }
  const nodeTables = Object.keys(node.tables).sort();
  const rustTables = Object.keys(rust.tables).sort();
  if (
    !equal(nodeTables, rustTables) ||
    nodeTables.length !== corpus.expected.tables
  )
    errors.push(
      `table_inventory_mismatch:${nodeTables.length}:${rustTables.length}`,
    );
  for (const table of nodeTables) {
    const nodeRows = stableParityTableRows(
      "node",
      table,
      node.tables[table] ?? [],
    );
    const rustRows = stableParityTableRows(
      "rust",
      table,
      rust.tables[table] ?? [],
    );
    if (!equal(nodeRows, rustRows)) errors.push(`table_mismatch:${table}`);
    if (
      !equal(
        stableParityTableRows("node", table, node.reopen.tables[table] ?? []),
        nodeRows,
      )
    )
      errors.push(`node_reopen_mismatch:${table}`);
    if (
      !equal(
        stableParityTableRows("rust", table, rust.reopen.tables[table] ?? []),
        rustRows,
      )
    )
      errors.push(`rust_reopen_mismatch:${table}`);
  }
  for (const report of [node, rust]) {
    if (report.canonical.importBatchPresent)
      errors.push("canonical_import_batch_leaked");
    if (report.crossApplication.downstreamTriggered !== false)
      errors.push("automatic_downstream_triggered");
    if (report.webdav.state?.queue_state !== "idle")
      errors.push("webdav_state_not_idle");
    if (!equal(report.canonical.before, report.canonical.after))
      errors.push("canonical_tree_mutated");
  }
  if (!equal(node.webdav.remote, rust.webdav.remote))
    errors.push("webdav_remote_bytes_mismatch");
}

export async function checkSynthesisCheckpointBundleWebDavDebugApplicationParity(): Promise<SynthesisCheckpointBundleWebDavDebugApplicationParityCheck> {
  const errors: string[] = [];
  let corpus: Corpus;
  try {
    corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8")) as Corpus;
  } catch {
    return {
      ok: false,
      corpus: "",
      reportSchema: "",
      tables: 0,
      applicationFamilies: 4,
      comparedTables: 0,
      implementations: {
        node: { role: "oracle", sourceFingerprint: "" },
        rust: { role: "candidate", sourceFingerprint: "" },
      },
      errors: ["corpus_invalid"],
    };
  }
  for (const family of [
    "knowledgeCheckpoint",
    "durableBundle",
    "webDavSync",
    "debugMaintenance",
    "crossApplication",
  ]) {
    if (
      !Array.isArray(corpus.coverage[family]) ||
      !corpus.coverage[family].length
    )
      errors.push(`coverage_missing:${family}`);
  }
  const parityRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "synthesis-checkpoint-bundle-webdav-debug-parity-"),
  );
  let nodeReport: ParityReport | null = null;
  let rustReport: ParityReport | null = null;
  try {
    nodeReport = await runNodeOracle(
      corpus,
      path.join(parityRoot, "node", "runtime"),
      path.join(parityRoot, "node", "canonical"),
      path.join(parityRoot, "node", "webdav-state"),
      path.join(parityRoot, "node", "remote"),
    );
  } catch (error) {
    errors.push(
      `node_oracle_failed:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    rustReport = runRustCandidate(
      corpus,
      path.join(parityRoot, "rust", "runtime"),
      path.join(parityRoot, "rust", "canonical"),
      path.join(parityRoot, "rust", "webdav-state"),
      path.join(parityRoot, "rust", "remote"),
    );
  } catch (error) {
    errors.push(
      `rust_driver_failed:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (nodeReport && rustReport)
    compareReports(corpus, nodeReport, rustReport, errors);
  if (process.env.SYNTHESIS_PARITY_KEEP_ROOT) {
    fs.writeFileSync(
      path.join(parityRoot, "node-report.json"),
      JSON.stringify(nodeReport, null, 2),
    );
    fs.writeFileSync(
      path.join(parityRoot, "rust-report.json"),
      JSON.stringify(rustReport, null, 2),
    );
    process.stderr.write(`parityRoot=${parityRoot}\n`);
  } else {
    fs.rmSync(parityRoot, { recursive: true, force: true });
  }
  const driver =
    "native/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs";
  return {
    ok: errors.length === 0,
    corpus: corpus.schema,
    reportSchema: corpus.reportSchema,
    tables: corpus.expected.tables,
    applicationFamilies: corpus.expected.applicationFamilies,
    comparedTables:
      nodeReport && rustReport ? Object.keys(nodeReport.tables).length : 0,
    implementations: {
      node: {
        role: "oracle",
        sourceFingerprint: fingerprint([
          "packages/synthesis-application/src/knowledgeCheckpointApplication.ts",
          "packages/synthesis-application/src/durableBundleApplication.ts",
          "packages/synthesis-application/src/webDavSyncApplication.ts",
          "packages/synthesis-application/src/debugMaintenanceApplication.ts",
        ]),
      },
      rust: {
        role: "candidate",
        sourceFingerprint: fingerprint([
          "native/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs",
          "native/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs",
          "native/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs",
          "native/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs",
          "native/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs",
          driver,
        ]),
      },
    },
    errors,
  };
}

if (import.meta.main) {
  const result =
    await checkSynthesisCheckpointBundleWebDavDebugApplicationParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

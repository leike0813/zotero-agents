import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalSynthesisTopicPathId,
  createSynthesisTopicApplication,
  readSynthesisWorkbenchOperationalChrome,
} from "../packages/synthesis-application/src/index.js";
import { canonicalizeSynthesisContractJson } from "../packages/synthesis-contracts/src/canonicalJson.js";
import type { SynthesisTopicStructuredArtifactEngine } from "../packages/synthesis-engine/src/index.js";
import type {
  SynthesisCacheBasisRecord,
  SynthesisOperationRecord,
} from "../packages/synthesis-repository/src/index.js";
import { openSynthesisSidecarIsolatedRepository } from "../apps/synthesis-service/src/isolatedRepository.js";
import { openSynthesisNodeSqliteAdapter } from "../apps/synthesis-service/src/repositoryNodeSqlite.js";
import { openSynthesisSidecarTopicCanonicalStore } from "../apps/synthesis-service/src/topicCanonicalStoreNode.js";

const CORPUS_PATH = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-typed-application-parity-v1/corpus.json",
);

type Corpus = {
  schema: string;
  reportSchema: string;
  profileId: string;
  dataRootId: string;
  clock: string;
  operationIds: string[];
  transactionIds: string[];
  workbench: {
    cacheRows: SynthesisCacheBasisRecord[];
    operationRows: SynthesisOperationRecord[];
    generatedBounds: {
      runningCount: number;
      failedCount: number;
      updatedAt: string;
    };
  };
  topic: {
    topicId: string;
    apply: { bundle: Record<string, unknown>; assets: TopicAssetFixture[] };
    patch: { bundle: Record<string, unknown>; assets: TopicAssetFixture[] };
    limits: { maxAssetBytes: number };
    faults: Record<string, { phase: string; status: string; warning?: string }>;
  };
  coverage: { workbench: string[]; topic: string[] };
};

type TopicAssetFixture = {
  id: string;
  mediaType: string;
  text: string;
};

type ParityReport = {
  schema: string;
  corpusVersion: string;
  sourceFingerprint: string;
  workbench: unknown;
  topic: unknown;
  tables: unknown;
  canonical: unknown;
  reopen: unknown;
};

export type SynthesisTypedApplicationParityCheck = {
  ok: boolean;
  corpus: string;
  reportSchema: string;
  tables: number;
  workbenchCases: number;
  topicCases: number;
  implementations: {
    node: { role: "oracle"; sourceFingerprint: string };
    rust: { role: "candidate"; sourceFingerprint: string };
  };
  errors: string[];
};

const fixtureEngine: SynthesisTopicStructuredArtifactEngine = {
  async validateManifest(request) {
    if (
      request.manifest.fixture_outcome === "compute_failure" ||
      request.manifest.fixture_outcome === "compute_cancel"
    ) {
      throw new Error(String(request.manifest.fixture_outcome));
    }
    return {
      contractVersion: request.contractVersion,
      algorithmVersion: request.algorithmVersion,
      ok: true,
      errors: [],
    };
  },
  async assembleArtifact(request) {
    return {
      contractVersion: request.contractVersion,
      algorithmVersion: request.algorithmVersion,
      artifact: {
        schema_id: "synthesis.topic_synthesis_artifact",
        schema_version: "3.0.0",
        language: String(request.manifest.language || "en"),
        ...request.sections,
      },
    };
  },
  async validateArtifact(request) {
    return {
      contractVersion: request.contractVersion,
      algorithmVersion: request.algorithmVersion,
      ok: true,
      errors: [],
    };
  },
  async applySectionPatch(request) {
    if (request.patchManifest.fixture_outcome === "patch_conflict") {
      return {
        contractVersion: request.contractVersion,
        algorithmVersion: request.algorithmVersion,
        status: "conflict",
        mismatches: [
          {
            name: "claims",
            base: `sha256:${"1".repeat(64)}`,
            current: `sha256:${"2".repeat(64)}`,
          },
        ],
      };
    }
    return {
      contractVersion: request.contractVersion,
      algorithmVersion: request.algorithmVersion,
      status: "applied",
      sections: { ...request.currentSections, ...request.changedSections },
      nextSectionHashes: {},
    };
  },
};

function sourceFingerprint(root: string, inputs: string[]) {
  const hash = createHash("sha256");
  const visit = (relativePath: string) => {
    const absolutePath = path.resolve(root, relativePath);
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolutePath).sort()) {
        if (entry !== "target") visit(path.join(relativePath, entry));
      }
      return;
    }
    hash.update(relativePath.replaceAll(path.sep, "/"));
    hash.update("\0");
    hash.update(fs.readFileSync(absolutePath));
    hash.update("\0");
  };
  for (const input of inputs) visit(input);
  return `sha256:${hash.digest("hex")}`;
}

function readTree(root: string) {
  const files: Record<string, string> = {};
  const visit = (directory: string) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, entry);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error("parity_symlink_rejected");
      if (stat.isDirectory()) visit(absolute);
      else {
        files[path.relative(root, absolute).replaceAll(path.sep, "/")] =
          fs.readFileSync(absolute, "utf8");
      }
    }
  };
  visit(root);
  return files;
}

function tableSnapshot(databasePath: string) {
  const connection = openSynthesisNodeSqliteAdapter(databasePath);
  try {
    const tables = connection.adapter
      .all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'synt_%' ORDER BY name",
      )
      .map((row) => String(row.name));
    return Object.fromEntries(
      tables.map((table) => {
        if (!/^[a-z0-9_]+$/.test(table)) {
          throw new Error("parity_table_name_invalid");
        }
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

function canonicalReport(
  canonical: ReturnType<typeof openSynthesisSidecarTopicCanonicalStore>,
  topicId: string,
  includeReceipt = true,
) {
  const pathId = canonicalSynthesisTopicPathId(topicId);
  const current = canonical.readCurrent({ topicId });
  const currentValue =
    current.status === "ready"
      ? {
          status: "ready",
          topicId,
          pathId,
          snapshot: current.snapshot,
          diagnostics: [],
        }
      : {
          status: current.status,
          topicId,
          pathId,
          diagnostics: current.diagnostics,
        };
  const receipt = fs.existsSync(canonical.paths.receiptPath)
    ? (JSON.parse(
        fs.readFileSync(canonical.paths.receiptPath, "utf8"),
      ) as Record<string, unknown>)
    : null;
  return {
    inspect: canonical.inspect({ topicId }),
    current: currentValue,
    files: readTree(path.join(canonical.paths.topicsRoot, pathId, "current")),
    journal: fs.existsSync(canonical.paths.journalPath)
      ? JSON.parse(fs.readFileSync(canonical.paths.journalPath, "utf8"))
      : null,
    receipt:
      includeReceipt && receipt && receipt.topicId === topicId
        ? {
            transactionId: receipt.transactionId,
            topicId: receipt.topicId,
            pathId: receipt.pathId,
            manifestHash: receipt.manifestHash,
            artifactHash: receipt.artifactHash,
          }
        : null,
  };
}

function cloneTopicRequest<T>(value: T): T {
  return structuredClone(value);
}

function topicRequestFor(fixture: Corpus["topic"]["apply"], topicId: string) {
  const request = cloneTopicRequest(fixture);
  const definition = request.bundle.topic_definition as Record<string, unknown>;
  definition.id = topicId;
  definition.title = topicId === "topic-alpha" ? "Typed Topic" : "Typed Beta";
  request.bundle.topic_id = topicId;
  const manifest = JSON.parse(request.assets[0]!.text) as Record<
    string,
    unknown
  >;
  manifest.topic_id = topicId;
  request.assets[0]!.text = JSON.stringify(manifest);
  return request;
}

function fullUpdateRequest(
  fixture: Corpus["topic"]["apply"],
  hashes: Record<string, string>,
) {
  const request = topicRequestFor(fixture, "topic-alpha");
  request.bundle.operation = "update_full";
  request.bundle.mode = "update";
  request.bundle.base_hashes = hashes;
  const definition = request.bundle.topic_definition as Record<string, unknown>;
  definition.title = "Typed Topic Updated";
  definition.definition = "Typed full update";
  return request;
}

function manifestOutcomeRequest(
  fixture: Corpus["topic"]["apply"] | Corpus["topic"]["patch"],
  outcome: string,
) {
  const request = cloneTopicRequest(fixture);
  const manifest = JSON.parse(request.assets[0]!.text) as Record<
    string,
    unknown
  >;
  manifest.fixture_outcome = outcome;
  request.assets[0]!.text = JSON.stringify(manifest);
  return request;
}

function topicStateReport(
  repository: ReturnType<typeof openSynthesisSidecarIsolatedRepository>,
  canonical: ReturnType<typeof openSynthesisSidecarTopicCanonicalStore>,
  topicIds: string[],
) {
  return {
    tables: tableSnapshot(repository.paths.databasePath),
    canonical: Object.fromEntries(
      topicIds.map((topicId, index) => [
        topicId,
        canonicalReport(canonical, topicId, index === topicIds.length - 1),
      ]),
    ),
  };
}

async function runNodeOracle(
  corpus: Corpus,
  root: string,
  fingerprint: string,
): Promise<ParityReport> {
  let operationIndex = 0;
  let transactionIndex = 0;
  const nextOperationId = () => corpus.operationIds[operationIndex++]!;
  const nextTransactionId = () => corpus.transactionIds[transactionIndex++]!;
  const mainRoot = path.join(root, "main");
  const repository = openSynthesisSidecarIsolatedRepository({
    profileRuntimeRoot: mainRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    now: () => corpus.clock,
  });
  repository.store.captureDurableImportState();
  const emptyWorkbench = readSynthesisWorkbenchOperationalChrome(
    repository.store,
  );
  for (const row of corpus.workbench.cacheRows) {
    repository.store.upsertCacheBasis(row);
  }
  for (const row of corpus.workbench.operationRows) {
    repository.store.upsertOperation(row);
  }
  for (
    let index = 0;
    index < corpus.workbench.generatedBounds.runningCount;
    index += 1
  ) {
    repository.store.upsertOperation({
      operationId: `running-bound-${String(index).padStart(3, "0")}`,
      operationType: "canonical_maintenance",
      status: "running",
      label: `Running ${index}`,
      progressMode: "indeterminate",
      createdAt: corpus.clock,
      startedAt: corpus.clock,
      updatedAt: corpus.workbench.generatedBounds.updatedAt,
    });
  }
  for (
    let index = 0;
    index < corpus.workbench.generatedBounds.failedCount;
    index += 1
  ) {
    repository.store.upsertOperation({
      operationId: `failed-bound-${String(index).padStart(3, "0")}`,
      operationType: "citation_graph_cache_rebuild",
      status: "failed",
      label: `Failed ${index}`,
      progressMode: "indeterminate",
      createdAt: corpus.clock,
      startedAt: corpus.clock,
      updatedAt: corpus.workbench.generatedBounds.updatedAt,
    });
  }
  const canonical = openSynthesisSidecarTopicCanonicalStore({
    profileRuntimeRoot: mainRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    createTransactionId: nextTransactionId,
  });
  const topic = createSynthesisTopicApplication({
    repository: repository.store,
    canonicalStore: canonical,
    engine: fixtureEngine,
    now: () => corpus.clock,
    createOperationId: nextOperationId,
  });
  const populatedWorkbench = readSynthesisWorkbenchOperationalChrome(
    repository.store,
  );
  const absent = topic.detail({ topicId: corpus.topic.topicId });
  const missingRequest = fullUpdateRequest(corpus.topic.apply, {
    manifest: `sha256:${"1".repeat(64)}`,
    artifact: `sha256:${"2".repeat(64)}`,
    metadata: `sha256:${"3".repeat(64)}`,
  });
  const missingUpdate = await topic.apply(missingRequest);
  const created = await topic.apply(corpus.topic.apply);
  const duplicate = await topic.apply(corpus.topic.apply);
  const updateFull = await topic.apply(
    fullUpdateRequest(corpus.topic.apply, created.hashes),
  );
  const staleBasis = await topic.apply(
    fullUpdateRequest(corpus.topic.apply, created.hashes),
  );
  const updatePatch = await topic.apply(corpus.topic.patch);
  const patchConflict = await topic.apply(
    manifestOutcomeRequest(corpus.topic.patch, "patch_conflict"),
  );
  const betaCreate = await topic.apply(
    topicRequestFor(corpus.topic.apply, "topic-beta"),
  );
  const computeFailure = await topic.apply(
    manifestOutcomeRequest(
      topicRequestFor(corpus.topic.apply, "topic-compute-failure"),
      "compute_failure",
    ),
  );
  const computeCancel = await topic.apply(
    manifestOutcomeRequest(
      topicRequestFor(corpus.topic.apply, "topic-compute-cancel"),
      "compute_cancel",
    ),
  );
  const invalidFieldRequest = cloneTopicRequest(corpus.topic.apply);
  invalidFieldRequest.bundle.unknown = true;
  const invalidField = await topic.apply(invalidFieldRequest);
  const invalidAssetRequest = cloneTopicRequest(corpus.topic.apply);
  invalidAssetRequest.assets = invalidAssetRequest.assets.filter(
    (asset) => asset.id !== "asset/resolver",
  );
  const invalidAsset = await topic.apply(invalidAssetRequest);
  const invalidPathRequest = cloneTopicRequest(corpus.topic.apply);
  invalidPathRequest.assets[0]!.id = "../escape";
  const invalidPath = await topic.apply(invalidPathRequest);
  const invalidSizeRequest = cloneTopicRequest(corpus.topic.apply);
  invalidSizeRequest.assets[1]!.text = "x".repeat(
    corpus.topic.limits.maxAssetBytes + 1,
  );
  const invalidSize = await topic.apply(invalidSizeRequest);
  const firstPage = topic.list({ cursor: "", limit: 1 });
  const secondPage = topic.list({
    cursor: firstPage.nextCursor,
    limit: 1,
  });
  const detail = topic.detail({ topicId: corpus.topic.topicId });
  topic.stopAdmission();
  const stopAdmission = await topic.apply(corpus.topic.apply);
  await topic.shutdown();
  const mainState = topicStateReport(repository, canonical, [
    corpus.topic.topicId,
    "topic-beta",
  ]);
  canonical.close();
  repository.close();

  const reopenedRepository = openSynthesisSidecarIsolatedRepository({
    profileRuntimeRoot: mainRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    now: () => corpus.clock,
  });
  const reopenedCanonical = openSynthesisSidecarTopicCanonicalStore({
    profileRuntimeRoot: mainRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
  });
  const reopenedTopic = createSynthesisTopicApplication({
    repository: reopenedRepository.store,
    canonicalStore: reopenedCanonical,
    engine: fixtureEngine,
    now: () => corpus.clock,
  });
  const reopen = {
    workbench: readSynthesisWorkbenchOperationalChrome(
      reopenedRepository.store,
    ),
    detail: reopenedTopic.detail({ topicId: corpus.topic.topicId }),
    tables: tableSnapshot(reopenedRepository.paths.databasePath),
    canonical: Object.fromEntries(
      [corpus.topic.topicId, "topic-beta"].map((topicId) => [
        topicId,
        canonicalReport(reopenedCanonical, topicId, topicId === "topic-beta"),
      ]),
    ),
  };
  await reopenedTopic.shutdown();
  reopenedCanonical.close();
  reopenedRepository.close();

  const runDrain = async () => {
    const drainRoot = path.join(root, "drain");
    const drainRepository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: drainRoot,
      profileId: corpus.profileId,
      dataRootId: corpus.dataRootId,
      now: () => corpus.clock,
    });
    drainRepository.store.captureDurableImportState();
    const drainCanonical = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: drainRoot,
      profileId: corpus.profileId,
      dataRootId: corpus.dataRootId,
      createTransactionId: nextTransactionId,
    });
    let markStarted!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const drainEngine: SynthesisTopicStructuredArtifactEngine = {
      ...fixtureEngine,
      async validateManifest(request) {
        markStarted();
        await blocked;
        return fixtureEngine.validateManifest(request);
      },
    };
    const drainTopic = createSynthesisTopicApplication({
      repository: drainRepository.store,
      canonicalStore: drainCanonical,
      engine: drainEngine,
      now: () => corpus.clock,
      createOperationId: nextOperationId,
    });
    const apply = drainTopic.apply(
      topicRequestFor(corpus.topic.apply, "topic-drain"),
    );
    await started;
    let shutdownComplete = false;
    const shutdown = drainTopic.shutdown().then(() => {
      shutdownComplete = true;
    });
    await Promise.resolve();
    const blockedBeforeRelease = !shutdownComplete;
    release();
    const result = await apply;
    await shutdown;
    const before = topicStateReport(drainRepository, drainCanonical, [
      "topic-drain",
    ]);
    drainCanonical.close();
    drainRepository.close();
    const drainReopenedRepository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: drainRoot,
      profileId: corpus.profileId,
      dataRootId: corpus.dataRootId,
      now: () => corpus.clock,
    });
    const drainReopenedCanonical = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: drainRoot,
      profileId: corpus.profileId,
      dataRootId: corpus.dataRootId,
    });
    const drainReopenedTopic = createSynthesisTopicApplication({
      repository: drainReopenedRepository.store,
      canonicalStore: drainReopenedCanonical,
      engine: fixtureEngine,
      now: () => corpus.clock,
    });
    const reopen = {
      detail: drainReopenedTopic.detail({ topicId: "topic-drain" }),
      ...topicStateReport(drainReopenedRepository, drainReopenedCanonical, [
        "topic-drain",
      ]),
    };
    await drainReopenedTopic.shutdown();
    drainReopenedCanonical.close();
    drainReopenedRepository.close();
    return {
      result,
      blockedBeforeRelease,
      drained: shutdownComplete,
      before,
      reopen,
    };
  };
  const drain = await runDrain();

  const runFault = async (
    caseName: string,
    options: {
      promotionStatus?:
        | "canonical_store_busy"
        | "failed_recovered"
        | "repair_required";
      projectionFailure?: boolean;
      receiptFailure?: boolean;
    },
  ) => {
    const faultRoot = path.join(root, `fault-${caseName}`);
    const faultRepository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: faultRoot,
      profileId: corpus.profileId,
      dataRootId: corpus.dataRootId,
      now: () => corpus.clock,
    });
    faultRepository.store.captureDurableImportState();
    const faultCanonicalOwner = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: faultRoot,
      profileId: corpus.profileId,
      dataRootId: corpus.dataRootId,
      createTransactionId: nextTransactionId,
    });
    const faultCanonical = options.promotionStatus
      ? {
          ...faultCanonicalOwner,
          promote() {
            nextTransactionId();
            return { status: options.promotionStatus! };
          },
        }
      : faultCanonicalOwner;
    const faultStore = {
      ...faultRepository.store,
      upsertTopicApplicationState(
        record: Parameters<
          typeof faultRepository.store.upsertTopicApplicationState
        >[0],
      ) {
        if (options.projectionFailure) throw new Error("fixture_projection");
        return faultRepository.store.upsertTopicApplicationState(record);
      },
      updateOperationStatus(
        update: Parameters<
          typeof faultRepository.store.updateOperationStatus
        >[0],
      ) {
        if (options.receiptFailure && update.status === "completed") {
          throw new Error("fixture_receipt");
        }
        return faultRepository.store.updateOperationStatus(update);
      },
    };
    const faultTopic = createSynthesisTopicApplication({
      repository: faultStore,
      canonicalStore: faultCanonical,
      engine: fixtureEngine,
      now: () => corpus.clock,
      createOperationId: nextOperationId,
    });
    const result = await faultTopic.apply(corpus.topic.apply);
    await faultTopic.shutdown();
    const before = topicStateReport(faultRepository, faultCanonicalOwner, [
      corpus.topic.topicId,
    ]);
    faultCanonicalOwner.close();
    faultRepository.close();
    const faultReopenedRepository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: faultRoot,
      profileId: corpus.profileId,
      dataRootId: corpus.dataRootId,
      now: () => corpus.clock,
    });
    const faultReopenedCanonical = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: faultRoot,
      profileId: corpus.profileId,
      dataRootId: corpus.dataRootId,
    });
    const faultReopenedTopic = createSynthesisTopicApplication({
      repository: faultReopenedRepository.store,
      canonicalStore: faultReopenedCanonical,
      engine: fixtureEngine,
      now: () => corpus.clock,
    });
    const after = {
      detail: faultReopenedTopic.detail({ topicId: corpus.topic.topicId }),
      ...topicStateReport(faultReopenedRepository, faultReopenedCanonical, [
        corpus.topic.topicId,
      ]),
    };
    await faultReopenedTopic.shutdown();
    faultReopenedCanonical.close();
    faultReopenedRepository.close();
    return { result, before, reopen: after };
  };
  const faults = {
    canonicalBusy: await runFault("canonical-busy", {
      promotionStatus: "canonical_store_busy",
    }),
    failedRecovered: await runFault("failed-recovered", {
      promotionStatus: "failed_recovered",
    }),
    repairRequired: await runFault("repair-required", {
      promotionStatus: "repair_required",
    }),
    projectionWarning: await runFault("projection-warning", {
      projectionFailure: true,
    }),
    receiptWarning: await runFault("receipt-warning", {
      receiptFailure: true,
    }),
  };
  return {
    schema: corpus.reportSchema,
    corpusVersion: corpus.schema,
    sourceFingerprint: fingerprint,
    workbench: { empty: emptyWorkbench, populated: populatedWorkbench },
    topic: {
      absent,
      missingUpdate,
      create: created,
      duplicateCreate: duplicate,
      updateFull,
      staleBasis,
      updatePatch,
      patchConflict,
      betaCreate,
      computeFailure,
      computeCancel,
      invalidField,
      invalidAsset,
      invalidPath,
      invalidSize,
      listPaging: { firstPage, secondPage },
      detail,
      stopAdmission,
      drain,
      faults,
    },
    tables: mainState.tables,
    canonical: mainState.canonical,
    reopen,
  };
}

function comparable(report: ParityReport) {
  const { sourceFingerprint: _sourceFingerprint, ...observable } = report;
  return observable;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function exactKeys(value: unknown, expected: string[]) {
  return (
    JSON.stringify(Object.keys(record(value)).sort()) ===
    JSON.stringify([...expected].sort())
  );
}

function validateCorpus(corpus: Corpus) {
  const expectedWorkbench = [
    "empty",
    "populated",
    "old_failure_suppression",
    "deterministic_order",
    "running_50_bound",
    "failed_20_bound",
    "restart_reconciliation",
  ];
  const expectedTopic = [
    "absent",
    "list_paging",
    "detail",
    "create",
    "duplicate_create",
    "missing_update",
    "update_full",
    "update_patch_inheritance",
    "stale_basis",
    "patch_conflict",
    "invalid_field",
    "invalid_asset",
    "invalid_path",
    "invalid_size",
    "canonical_busy",
    "failed_recovered",
    "repair_required",
    "compute_failure",
    "compute_cancel",
    "projection_warning",
    "receipt_warning",
    "stop_admission",
    "drain",
    "reopen",
  ];
  return (
    corpus.schema === "synthesis-typed-application-parity-v1" &&
    corpus.reportSchema === "synthesis-typed-application-parity-report.v1" &&
    exactKeys(corpus, [
      "schema",
      "reportSchema",
      "profileId",
      "dataRootId",
      "clock",
      "operationIds",
      "transactionIds",
      "workbench",
      "topic",
      "coverage",
    ]) &&
    exactKeys(corpus.workbench, [
      "cacheRows",
      "operationRows",
      "generatedBounds",
    ]) &&
    exactKeys(corpus.topic, [
      "topicId",
      "apply",
      "patch",
      "limits",
      "faults",
    ]) &&
    exactKeys(corpus.topic.faults, [
      "canonicalBusy",
      "failedRecovered",
      "repairRequired",
      "computeFailure",
      "computeCancel",
      "projectionWarning",
      "receiptWarning",
    ]) &&
    exactKeys(corpus.workbench.generatedBounds, [
      "runningCount",
      "failedCount",
      "updatedAt",
    ]) &&
    exactKeys(corpus.topic.apply, ["bundle", "assets"]) &&
    exactKeys(corpus.topic.patch, ["bundle", "assets"]) &&
    exactKeys(corpus.topic.limits, ["maxAssetBytes"]) &&
    Object.values(corpus.topic.faults).every((fault) =>
      exactKeys(
        fault,
        fault.warning ? ["phase", "status", "warning"] : ["phase", "status"],
      ),
    ) &&
    corpus.operationIds.length === 16 &&
    corpus.transactionIds.length === 10 &&
    corpus.workbench.generatedBounds.runningCount === 51 &&
    corpus.workbench.generatedBounds.failedCount === 21 &&
    corpus.topic.limits.maxAssetBytes === 5 * 1024 * 1024 &&
    JSON.stringify(corpus.coverage.workbench) ===
      JSON.stringify(expectedWorkbench) &&
    JSON.stringify(corpus.coverage.topic) === JSON.stringify(expectedTopic)
  );
}

function validateExpectedReport(corpus: Corpus, report: ParityReport) {
  const topic = record(report.topic);
  const statuses: Record<string, string> = {
    missingUpdate: "topic_missing",
    create: "persisted",
    duplicateCreate: "topic_exists",
    updateFull: "persisted",
    staleBasis: "conflict",
    updatePatch: "persisted",
    patchConflict: "patch_conflict",
    betaCreate: "persisted",
    computeFailure: corpus.topic.faults.computeFailure!.status,
    computeCancel: corpus.topic.faults.computeCancel!.status,
    invalidField: "invalid_request",
    invalidAsset: "invalid_request",
    invalidPath: "invalid_request",
    invalidSize: "invalid_request",
    stopAdmission: "repair_required",
  };
  if (
    Object.entries(statuses).some(
      ([name, status]) => record(topic[name]).status !== status,
    )
  ) {
    return false;
  }
  const workbench = record(report.workbench);
  const emptyMaintenance = record(record(workbench.empty).maintenance);
  const populatedMaintenance = record(record(workbench.populated).maintenance);
  if (
    !Array.isArray(emptyMaintenance.cacheReadiness) ||
    emptyMaintenance.cacheReadiness.length !== 2 ||
    !Array.isArray(emptyMaintenance.backgroundJobs) ||
    emptyMaintenance.backgroundJobs.length !== 0 ||
    !Array.isArray(populatedMaintenance.backgroundJobs) ||
    populatedMaintenance.backgroundJobs.length !== 70
  ) {
    return false;
  }
  const listPaging = record(topic.listPaging);
  const firstPage = record(listPaging.firstPage);
  const secondPage = record(listPaging.secondPage);
  if (
    firstPage.hasMore !== true ||
    firstPage.total !== 2 ||
    secondPage.hasMore !== false ||
    secondPage.total !== 2
  ) {
    return false;
  }
  const faults = record(topic.faults);
  for (const name of [
    "canonicalBusy",
    "failedRecovered",
    "repairRequired",
    "projectionWarning",
    "receiptWarning",
  ]) {
    const fixture = corpus.topic.faults[name]!;
    const fault = record(faults[name]);
    const result = record(fault.result);
    if (result.status !== fixture.status) return false;
    if (
      fixture.warning &&
      (!Array.isArray(result.warnings) ||
        !result.warnings.includes(fixture.warning))
    ) {
      return false;
    }
  }
  const faultBefore = (name: string) => {
    const before = record(record(faults[name]).before);
    const tables = record(before.tables);
    const canonical = record(
      record(record(before.canonical)[corpus.topic.topicId]).current,
    );
    return { tables, canonical };
  };
  for (const name of ["canonicalBusy", "failedRecovered", "repairRequired"]) {
    const before = faultBefore(name);
    if (
      before.canonical.status !== "absent" ||
      !Array.isArray(before.tables.synt_topic_application_state) ||
      before.tables.synt_topic_application_state.length !== 0 ||
      !Array.isArray(before.tables.synt_topic_application_projection) ||
      before.tables.synt_topic_application_projection.length !== 0
    ) {
      return false;
    }
  }
  const projectionBefore = faultBefore("projectionWarning");
  const receiptBefore = faultBefore("receiptWarning");
  if (
    projectionBefore.canonical.status !== "ready" ||
    !Array.isArray(projectionBefore.tables.synt_topic_application_state) ||
    projectionBefore.tables.synt_topic_application_state.length !== 0 ||
    receiptBefore.canonical.status !== "ready" ||
    !Array.isArray(receiptBefore.tables.synt_topic_application_state) ||
    receiptBefore.tables.synt_topic_application_state.length !== 1 ||
    !Array.isArray(receiptBefore.tables.synt_topic_application_projection) ||
    receiptBefore.tables.synt_topic_application_projection.length !== 1
  ) {
    return false;
  }
  for (const name of [
    "invalidField",
    "invalidAsset",
    "invalidPath",
    "invalidSize",
  ]) {
    if (record(topic[name]).operationId !== "") return false;
  }
  const detail = record(topic.detail);
  const snapshot = record(detail.snapshot);
  const sections = record(snapshot.sections);
  if (
    detail.status !== "ready" ||
    !Array.isArray(sections.claims) ||
    record(sections.claims[0]).id !== "claim:two" ||
    !Array.isArray(sections.source_papers) ||
    sections.source_papers.length !== 1
  ) {
    return false;
  }
  const drain = record(topic.drain);
  if (
    drain.blockedBeforeRelease !== true ||
    drain.drained !== true ||
    record(drain.result).status !== "persisted" ||
    record(record(drain.reopen).detail).status !== "ready"
  ) {
    return false;
  }
  const reopen = record(report.reopen);
  const reopenWorkbench = record(record(reopen.workbench).maintenance);
  const reopenTables = record(reopen.tables);
  if (
    !Array.isArray(reopenWorkbench.backgroundJobs) ||
    reopenWorkbench.backgroundJobs.length !== 20 ||
    !Array.isArray(reopenTables.synt_operation) ||
    reopenTables.synt_operation.some((row) => record(row).status === "running")
  ) {
    return false;
  }
  return record(topic.absent).status === "absent";
}

export async function checkSynthesisTypedApplicationParity(
  root = process.cwd(),
): Promise<SynthesisTypedApplicationParityCheck> {
  const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8")) as Corpus;
  const errors: string[] = [];
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "synthesis-typed-application-parity-"),
  );
  const nodeRoot = path.join(temporaryRoot, "node-oracle");
  const rustRoot = path.join(temporaryRoot, "rust-candidate");
  fs.mkdirSync(nodeRoot, { recursive: true });
  fs.mkdirSync(rustRoot, { recursive: true });
  const nodeFingerprint = sourceFingerprint(root, [
    "packages/synthesis-application/src/index.ts",
    "packages/synthesis-application/src/topicApplication.ts",
    "packages/synthesis-repository/src/index.ts",
    "apps/synthesis-service/src/isolatedRepository.ts",
    "apps/synthesis-service/src/topicCanonicalStoreNode.ts",
    path.relative(root, CORPUS_PATH),
  ]);
  const rustFingerprint = sourceFingerprint(root, [
    "native/synthesis-sidecar/crates/synthesis-application",
    "native/synthesis-sidecar/crates/synthesis-repository",
    "native/synthesis-sidecar/crates/synthesis-canonical-store",
    path.relative(root, CORPUS_PATH),
  ]);
  try {
    if (!validateCorpus(corpus)) {
      errors.push("typed_application_corpus_invalid");
    }
    const node = await runNodeOracle(corpus, nodeRoot, nodeFingerprint);
    const output = execFileSync(
      "cargo",
      [
        "+nightly-2026-07-25",
        "run",
        "-q",
        "-p",
        "synthesis-application",
        "--example",
        "typed_application_parity",
        "--locked",
        "--manifest-path",
        "native/synthesis-sidecar/Cargo.toml",
        "--",
        CORPUS_PATH,
        rustRoot,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          SYNTHESIS_RUST_SOURCE_FINGERPRINT: rustFingerprint,
        },
      },
    );
    const rust = JSON.parse(output) as ParityReport;
    if (process.env.SYNTHESIS_KEEP_PARITY_REPORTS === "1") {
      const reportRoot = path.join(temporaryRoot, "reports");
      fs.mkdirSync(reportRoot, { recursive: true });
      fs.writeFileSync(
        path.join(reportRoot, "node.json"),
        `${JSON.stringify(node, null, 2)}\n`,
      );
      fs.writeFileSync(
        path.join(reportRoot, "rust.json"),
        `${JSON.stringify(rust, null, 2)}\n`,
      );
    }
    if (
      !validateExpectedReport(corpus, node) ||
      !validateExpectedReport(corpus, rust)
    ) {
      errors.push("typed_application_expected_observable_missing");
    }
    if (
      canonicalizeSynthesisContractJson(comparable(node)) !==
      canonicalizeSynthesisContractJson(comparable(rust))
    ) {
      const reportRoot = path.join(temporaryRoot, "reports");
      fs.mkdirSync(reportRoot, { recursive: true });
      fs.writeFileSync(
        path.join(reportRoot, "node.json"),
        `${JSON.stringify(node, null, 2)}\n`,
      );
      fs.writeFileSync(
        path.join(reportRoot, "rust.json"),
        `${JSON.stringify(rust, null, 2)}\n`,
      );
      errors.push("typed_application_observable_mismatch");
    }
  } catch (error) {
    errors.push(
      `typed_application_checker_failed:${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  } finally {
    if (process.env.SYNTHESIS_KEEP_PARITY_REPORTS !== "1") {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    } else {
      process.stderr.write(`typed parity reports: ${temporaryRoot}\n`);
    }
  }
  return {
    ok: errors.length === 0,
    corpus: corpus.schema,
    reportSchema: corpus.reportSchema,
    tables: 51,
    workbenchCases: corpus.coverage.workbench.length,
    topicCases: corpus.coverage.topic.length,
    implementations: {
      node: { role: "oracle", sourceFingerprint: nodeFingerprint },
      rust: { role: "candidate", sourceFingerprint: rustFingerprint },
    },
    errors,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const result = await checkSynthesisTypedApplicationParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

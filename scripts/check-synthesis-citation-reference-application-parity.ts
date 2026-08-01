import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createSynthesisCitationGraphApplication,
  createSynthesisReferenceRefreshApplication,
} from "../packages/synthesis-application/src/index.js";
import { canonicalizeSynthesisContractJson } from "../packages/synthesis-contracts/src/canonicalJson.js";
import { computeSynthesisCitationGraphMetrics } from "../packages/synthesis-engine/src/index.js";
import { computeSynthesisCitationGraphBuild } from "../packages/synthesis-engine/src/citationGraphBuild.js";
import { createSynthesisSidecarComputeWorkerPool } from "../apps/synthesis-service/src/computeWorkerPool.js";
import { openSynthesisSidecarIsolatedRepository } from "../apps/synthesis-service/src/isolatedRepository.js";
import { createSynthesisSidecarReferenceMatchingReviewApplication } from "../apps/synthesis-service/src/referenceMatchingReviewApplicationNode.js";
import { openSynthesisNodeSqliteAdapter } from "../apps/synthesis-service/src/repositoryNodeSqlite.js";

const root = path.resolve(import.meta.dirname, "..");
const corpusPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-citation-reference-application-parity-v1/corpus.json",
);

type Corpus = {
  schema: string;
  reportSchema: string;
  profileId: string;
  dataRootId: string;
  clock: string;
  operationIds: string[];
  preparationIds: string[];
  faultPhases: string[];
  fixture: {
    citationInput: Record<string, unknown>;
    refresh: {
      items: Array<Record<string, unknown>>;
      artifacts: Array<Record<string, unknown>>;
      references: Record<string, unknown>;
      citationAnalysis: Record<string, unknown>;
    };
    matchingHostCandidates: Array<{
      libraryId: number;
      itemKey: string;
      title: string;
      year: string;
      authors: string[];
    }>;
  };
  coverage: Record<string, string[]>;
};

type ParityReport = {
  schema: string;
  corpusVersion: string;
  productionCapabilityRegistered?: boolean;
  citationGraph: Record<string, any>;
  referenceRefresh: Record<string, any>;
  referenceMatching: Record<string, any>;
  crossApplication: Record<string, any>;
  tables: Record<string, Array<Record<string, unknown>>>;
  canonical: {
    before: Record<string, string>;
    after: Record<string, string>;
    journal: unknown;
    receipt: unknown;
  };
  reopen: {
    tables: Record<string, Array<Record<string, unknown>>>;
    citation: unknown;
    refresh: unknown;
    matching: unknown;
  };
};

export type SynthesisCitationReferenceApplicationParityCheck = {
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
  for (const relative of paths.sort()) {
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
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'synt_%' ORDER BY name",
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

async function runNodeOracle(
  corpus: Corpus,
  runtimeRoot: string,
  canonicalRoot: string,
): Promise<ParityReport> {
  fs.mkdirSync(canonicalRoot, { recursive: true });
  const canonicalBefore = readTree(canonicalRoot);
  const repository = openSynthesisSidecarIsolatedRepository({
    profileRuntimeRoot: runtimeRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    now: () => corpus.clock,
  });
  repository.store.captureDurableImportState();
  const pool = createSynthesisSidecarComputeWorkerPool();
  let operationIndex = 0;
  const citation = createSynthesisCitationGraphApplication({
    repository: repository.store,
    compute: {
      build: (request) =>
        Promise.resolve(computeSynthesisCitationGraphBuild(request)),
      metrics: (request) =>
        Promise.resolve(computeSynthesisCitationGraphMetrics(request)),
      layout: (request) => pool.runCitationGraphLayout(request),
    },
    now: () => corpus.clock,
    createOperationId: () =>
      corpus.operationIds[operationIndex++] ?? "fixture:id:exhausted",
  });
  const initial = citation.inspect();
  const created = await citation.rebuildFull({
    expectedGraphHash: null,
    force: false,
    input: corpus.fixture.citationInput,
  });
  const unchanged = await citation.rebuildFull({
    expectedGraphHash: created.graphHash,
    force: false,
    input: corpus.fixture.citationInput,
  });
  const mismatch = await citation.rebuildFull({
    expectedGraphHash: `sha256:${"0".repeat(64)}`,
    force: true,
    input: corpus.fixture.citationInput,
  });
  const slice = citation.readSlice({ rootNodeId: "paper:a" });
  const metrics = citation.readMetrics({ limit: 1 });
  const layout = await citation.recomputeLayout({
    preset: "force",
    scope: { kind: "full" },
    maxNodes: 200,
    maxEdges: 500,
  });
  const graphBeforeRefresh = citation.inspect().graphHash;

  const refresh = createSynthesisReferenceRefreshApplication({
    repository: repository.store,
    now: () => corpus.clock,
    createPreparationId: () => corpus.preparationIds[0]!,
  });
  const preparedRefresh = await refresh.prepareRefresh({
    expectedReferenceHash: null,
    force: false,
    scope: { kind: "full" },
    items: corpus.fixture.refresh.items,
    artifacts: corpus.fixture.refresh.artifacts,
  });
  const wrongRefresh = await refresh.applyRefresh({
    preparationId: "refresh:wrong",
    payloads: [],
  });
  const payloads =
    preparedRefresh.status === "prepared"
      ? preparedRefresh.reads.map((read) => ({
          locator: read.locator,
          expectedHash: read.expectedHash,
          result: {
            status: "available" as const,
            payloadHash: read.expectedHash,
            content: {
              kind: "json" as const,
              value:
                read.artifactType === "references"
                  ? corpus.fixture.refresh.references
                  : corpus.fixture.refresh.citationAnalysis,
            },
            diagnostics: [],
          },
        }))
      : [];
  const promotedRefresh = await refresh.applyRefresh({
    preparationId:
      preparedRefresh.status === "prepared"
        ? preparedRefresh.preparationId
        : "missing",
    payloads,
  });
  const replayRefresh = await refresh.applyRefresh({
    preparationId:
      preparedRefresh.status === "prepared"
        ? preparedRefresh.preparationId
        : "missing",
    payloads: [],
  });
  const graphAfterRefresh = citation.inspect().graphHash;

  const matching = createSynthesisSidecarReferenceMatchingReviewApplication({
    databasePath: repository.paths.databasePath,
    computePool: pool,
    now: () => corpus.clock,
    createPreparationId: () => corpus.preparationIds[1]!,
  });
  const matchingPapers = corpus.fixture.matchingHostCandidates.map(
    (candidate) => ({
      paperRef: `${candidate.libraryId}:${candidate.itemKey}`,
      itemKey: candidate.itemKey,
      title: candidate.title,
      year: candidate.year,
      authors: candidate.authors,
      citekey: candidate.itemKey.toLowerCase(),
    }),
  );
  const preparedMatching = await matching.prepareMatching({
    expectedReferenceHash: promotedRefresh.referenceHash,
    papers: matchingPapers,
  });
  const busyMatching = await matching.prepareMatching({
    expectedReferenceHash: promotedRefresh.referenceHash,
    papers: matchingPapers,
  });
  const promotedMatching = await matching.applyMatching({
    preparationId:
      preparedMatching.status === "prepared"
        ? preparedMatching.preparationId
        : "missing",
    hostBasisHash:
      preparedMatching.status === "prepared"
        ? preparedMatching.hostBasisHash
        : `sha256:${"0".repeat(64)}`,
  });
  const replayMatching = await matching.applyMatching({
    preparationId:
      preparedMatching.status === "prepared"
        ? preparedMatching.preparationId
        : "missing",
    hostBasisHash:
      preparedMatching.status === "prepared"
        ? preparedMatching.hostBasisHash
        : `sha256:${"0".repeat(64)}`,
  });
  const proposals = matching.listProposals({ limit: 100 });
  const accepted = proposals.proposals[0]
    ? await matching.applyReviewDecisions({
        decisions: [
          { proposalId: proposals.proposals[0].proposalId, action: "accept" },
        ],
      })
    : { status: "unchanged", results: [] };
  const partial = await matching.applyReviewDecisions({
    decisions: [{ proposalId: "missing", action: "reject" }],
  });
  const graphAfterReview = citation.inspect().graphHash;

  const changedInput = structuredClone(corpus.fixture.citationInput);
  (
    (changedInput.libraryNodes as Array<Record<string, unknown>>)[0] ?? {}
  ).title = "Alpha explicit rebuild";
  const explicitRebuild = await citation.rebuildFull({
    expectedGraphHash: graphAfterReview,
    force: true,
    input: changedInput,
  });
  const graphAfterExplicitRebuild = citation.inspect().graphHash;
  const referenceRows = refresh.readReferences({ limit: 100 }).returned;
  const tables = tableSnapshot(repository.paths.databasePath);
  const citationInspect = citation.inspect();
  const refreshInspect = refresh.inspect();
  const matchingInspect = matching.inspect();
  await matching.shutdown();
  await refresh.shutdown();
  await citation.shutdown();
  await pool.shutdown();
  repository.close();

  const reopened = openSynthesisSidecarIsolatedRepository({
    profileRuntimeRoot: runtimeRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    now: () => corpus.clock,
  });
  const reopenTables = tableSnapshot(reopened.paths.databasePath);
  const reopen = {
    citation: reopenTables.synt_citation_graph_application_state?.[0] ?? null,
    refresh: reopenTables.synt_reference_application_state?.[0] ?? null,
    matching: reopenTables.synt_reference_matching_state?.[0] ?? null,
    tables: reopenTables,
  };
  reopened.close();
  const canonicalAfter = readTree(canonicalRoot);
  return {
    schema: corpus.reportSchema,
    corpusVersion: corpus.schema,
    citationGraph: {
      initial,
      created,
      unchanged,
      mismatch,
      slice: { nodes: slice.nodes.length, edges: slice.edges.length },
      metrics: { returned: metrics.returned, hasMore: metrics.hasMore },
      layout,
      inspect: citationInspect,
    },
    referenceRefresh: {
      prepared: preparedRefresh,
      wrongPreparation: wrongRefresh,
      promoted: promotedRefresh,
      replay: replayRefresh,
      referenceRows,
      inspect: refreshInspect,
    },
    referenceMatching: {
      prepared: preparedMatching,
      busy: busyMatching,
      promoted: promotedMatching,
      replay: replayMatching,
      proposalRows: proposals.returned,
      accepted,
      partial,
      inspect: matchingInspect,
    },
    crossApplication: {
      graphBeforeRefresh,
      graphAfterRefresh,
      graphAfterReview,
      explicitRebuild,
      graphAfterExplicitRebuild,
    },
    tables,
    canonical: {
      before: canonicalBefore,
      after: canonicalAfter,
      journal: null,
      receipt: null,
    },
    reopen,
  };
}

function runRustCandidate(
  corpus: Corpus,
  runtimeRoot: string,
  canonicalRoot: string,
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
      "citation_reference_application_parity",
    ],
    {
      cwd: root,
      input: JSON.stringify({ corpus, runtimeRoot, canonicalRoot }),
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

function statusAt(report: ParityReport, pathValue: string) {
  let value: any = report;
  for (const part of pathValue.split(".")) value = value?.[part];
  return value;
}

function stableTableRows(table: string, rows: Array<Record<string, unknown>>) {
  const pick = (row: Record<string, unknown>, keys: string[]) =>
    Object.fromEntries(keys.map((key) => [key, row[key]]));
  const edgeStatus = (value: unknown) =>
    value === "matched" ? "accepted" : value;
  const normalized = rows.map((row) => {
    switch (table) {
      case "synt_cache_basis":
        return pick(row, [
          "cache_key",
          "cache_kind",
          "scope_kind",
          "scope_ref",
          "status",
          "basis_kind",
          "source_hash",
          "policy_version",
          "stale_reason",
          "updated_at",
        ]);
      case "synt_citation_graph_application_state":
        return pick(row, [
          "singleton_id",
          "input_hash",
          "node_count",
          "edge_count",
          "updated_at",
        ]);
      case "synt_citation_node":
        return pick(row, [
          "literature_item_id",
          "node_status",
          "has_zotero_binding",
          "title",
          "year",
          "authors_json",
          "updated_at",
        ]);
      case "synt_citation_edge":
        return {
          ...pick(row, [
            "edge_id",
            "source_literature_item_id",
            "target_literature_item_id",
            "reference_instance_id",
            "roles_json",
            "weight",
            "created_at",
            "updated_at",
          ]),
          edge_status: edgeStatus(row.edge_status),
        };
      case "synt_citation_source_ownership":
      case "synt_citation_incoming_group":
        return {
          ...pick(
            row,
            table === "synt_citation_source_ownership"
              ? [
                  "source_literature_item_id",
                  "edge_id",
                  "reference_instance_id",
                  "target_literature_item_id",
                  "updated_at",
                ]
              : [
                  "target_literature_item_id",
                  "source_literature_item_id",
                  "edge_id",
                  "reference_instance_id",
                  "updated_at",
                ],
          ),
          edge_status: edgeStatus(row.edge_status),
        };
      case "synt_citation_metrics_light":
        return pick(row, [
          "literature_item_id",
          "outgoing_count",
          "incoming_count",
          "matched_outgoing_count",
          "unresolved_outgoing_count",
          "ambiguous_outgoing_count",
          "local_degree",
          "updated_at",
        ]);
      case "synt_citation_metrics_complex":
        return pick(row, [
          "literature_item_id",
          "node_id",
          "title",
          "year",
          "status",
          "updated_at",
        ]);
      case "synt_operation":
        return {
          operation_id: String(row.operation_id).replace(/^operation:/, ""),
          operation_type: String(row.operation_type)
            .replace(
              "citation_graph_cache_rebuild",
              "citation_graph_application_rebuild",
            )
            .replace("reference_sidecar_refresh", "reference_sidecar_refresh"),
          status: row.status === "succeeded" ? "completed" : String(row.status),
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      case "synt_reference_application_state":
        return pick(row, [
          "singleton_id",
          "input_hash",
          "source_count",
          "reference_count",
          "canonical_count",
          "binding_count",
          "reference_ready",
          "graph_ready",
          "related_items_ready",
          "updated_at",
        ]);
      case "synt_reference_source":
        return pick(row, [
          "paper_ref",
          "library_id",
          "item_key",
          "title",
          "year",
          "metadata_hash",
          "updated_at",
        ]);
      case "synt_reference_canonical":
        return pick(row, [
          "canonical_reference_id",
          "title",
          "normalized_title",
          "year",
          "authors_json",
          "identifiers_json",
          "status",
          "updated_at",
        ]);
      case "synt_reference_raw":
        return pick(row, [
          "raw_reference_id",
          "source_ref",
          "references_artifact_hash",
          "reference_index",
          "raw_hash",
          "parsed_title",
          "normalized_title",
          "year",
          "authors_json",
          "raw_reference",
          "canonical_reference_id",
          "status",
          "roles_json",
          "updated_at",
        ]);
      case "synt_reference_binding":
        return pick(row, [
          "canonical_reference_id",
          "library_id",
          "item_key",
          "status",
          "updated_at",
        ]);
      case "synt_reference_matching_state":
        return pick(row, [
          "singleton_id",
          "proposal_count",
          "open_proposal_count",
          "matching_ready",
          "graph_ready",
          "related_items_ready",
          "updated_at",
        ]);
      default:
        return row;
    }
  });
  return normalized.sort((left, right) =>
    canonicalizeSynthesisContractJson(left).localeCompare(
      canonicalizeSynthesisContractJson(right),
    ),
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
  ) {
    errors.push("report_schema_mismatch");
  }
  if (rust.productionCapabilityRegistered !== false)
    errors.push("driver_not_development_only");
  for (const pathValue of [
    "citationGraph.created.status",
    "citationGraph.unchanged.status",
    "citationGraph.mismatch.status",
    "referenceRefresh.prepared.status",
    "referenceRefresh.wrongPreparation.status",
    "referenceRefresh.promoted.status",
    "referenceRefresh.replay.status",
    "referenceMatching.prepared.status",
    "referenceMatching.busy.status",
    "referenceMatching.promoted.status",
    "referenceMatching.replay.status",
  ]) {
    if (statusAt(node, pathValue) !== statusAt(rust, pathValue))
      errors.push(
        `dto_mismatch:${pathValue}:${String(statusAt(node, pathValue))}:${String(
          statusAt(rust, pathValue),
        )}`,
      );
  }
  for (const pathValue of [
    "citationGraph.slice",
    "citationGraph.metrics",
    "referenceRefresh.referenceRows",
  ]) {
    if (!equal(statusAt(node, pathValue), statusAt(rust, pathValue)))
      errors.push(
        `dto_mismatch:${pathValue}:${JSON.stringify(
          statusAt(node, pathValue),
        )}:${JSON.stringify(statusAt(rust, pathValue))}`,
      );
  }
  for (const [name, report] of [
    ["node", node],
    ["rust", rust],
  ] as const) {
    const cross = report.crossApplication;
    if (
      cross.graphBeforeRefresh !== cross.graphAfterRefresh ||
      cross.graphAfterRefresh !== cross.graphAfterReview
    ) {
      errors.push(`automatic_downstream_dispatch:${name}`);
    }
    if (cross.graphAfterExplicitRebuild === cross.graphBeforeRefresh)
      errors.push(`explicit_rebuild_missing:${name}`);
    if (!equal(report.tables, report.reopen.tables))
      errors.push(`reopen_table_drift:${name}`);
    if (
      !equal(report.canonical.before, report.canonical.after) ||
      report.canonical.journal !== null ||
      report.canonical.receipt !== null
    ) {
      errors.push(`canonical_owner_modified:${name}`);
    }
  }
  const nodeTables = Object.keys(node.tables).sort();
  const rustTables = Object.keys(rust.tables).sort();
  if (!equal(nodeTables, rustTables) || nodeTables.length !== 52) {
    errors.push("table_inventory_mismatch");
    return;
  }
  const clusterTables = new Set([
    "synt_cache_basis",
    "synt_citation_edge",
    "synt_citation_graph_application_state",
    "synt_citation_incoming_group",
    "synt_citation_layout_state",
    "synt_citation_metrics_complex",
    "synt_citation_metrics_light",
    "synt_citation_node",
    "synt_citation_source_ownership",
    "synt_operation",
    "synt_reference_application_state",
    "synt_reference_artifact",
    "synt_reference_binding",
    "synt_reference_canonical",
    "synt_reference_match_proposal",
    "synt_reference_matching_preparation",
    "synt_reference_matching_state",
    "synt_reference_raw",
    "synt_reference_redirect",
    "synt_reference_revision_review",
    "synt_reference_source",
  ]);
  for (const table of nodeTables) {
    const nodeRows = node.tables[table];
    const rustRows = rust.tables[table];
    if (!Array.isArray(nodeRows) || !Array.isArray(rustRows)) {
      errors.push(`table_invalid:${table}`);
      continue;
    }
    if (!clusterTables.has(table) && !equal(nodeRows, rustRows))
      errors.push(`untouched_table_mismatch:${table}`);
    if (
      clusterTables.has(table) &&
      !equal(stableTableRows(table, nodeRows), stableTableRows(table, rustRows))
    )
      errors.push(`cluster_table_mismatch:${table}`);
  }
}

export async function checkSynthesisCitationReferenceApplicationParity(): Promise<SynthesisCitationReferenceApplicationParityCheck> {
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
      applicationFamilies: 3,
      comparedTables: 0,
      implementations: {
        node: { role: "oracle", sourceFingerprint: "" },
        rust: { role: "candidate", sourceFingerprint: "" },
      },
      errors: ["corpus_invalid"],
    };
  }
  for (const family of [
    "citationGraph",
    "referenceRefresh",
    "referenceMatching",
    "crossApplication",
  ]) {
    if (
      !Array.isArray(corpus.coverage[family]) ||
      !corpus.coverage[family].length
    )
      errors.push(`coverage_missing:${family}`);
  }
  const parityRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "synthesis-citation-reference-parity-"),
  );
  let nodeReport: ParityReport | null = null;
  let rustReport: ParityReport | null = null;
  try {
    nodeReport = await runNodeOracle(
      corpus,
      path.join(parityRoot, "node", "runtime"),
      path.join(parityRoot, "node", "canonical"),
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
    );
  } catch (error) {
    errors.push(
      `rust_driver_failed:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (nodeReport && rustReport)
    compareReports(corpus, nodeReport, rustReport, errors);
  fs.rmSync(parityRoot, { recursive: true, force: true });
  const driver =
    "native/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs";
  return {
    ok: errors.length === 0,
    corpus: corpus.schema,
    reportSchema: corpus.reportSchema,
    tables: 52,
    applicationFamilies: 3,
    comparedTables:
      nodeReport && rustReport ? Object.keys(nodeReport.tables).length : 0,
    implementations: {
      node: {
        role: "oracle",
        sourceFingerprint: fingerprint([
          "packages/synthesis-application/src/citationGraphApplication.ts",
          "packages/synthesis-application/src/referenceRefreshApplication.ts",
          "packages/synthesis-application/src/referenceMatchingReviewApplication.ts",
          "apps/synthesis-service/src/referenceMatchingReviewApplicationNode.ts",
        ]),
      },
      rust: {
        role: "candidate",
        sourceFingerprint: fingerprint([
          "native/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs",
          "native/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs",
          "native/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs",
          "native/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs",
          driver,
        ]),
      },
    },
    errors,
  };
}

if (import.meta.main) {
  const result = await checkSynthesisCitationReferenceApplicationParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

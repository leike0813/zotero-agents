import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createSynthesisConceptKbApplication,
  createSynthesisTagVocabularyApplication,
  createSynthesisTopicGraphApplication,
} from "../packages/synthesis-application/src/index.js";
import { canonicalizeSynthesisContractJson } from "../packages/synthesis-contracts/src/canonicalJson.js";
import {
  createInProcessSynthesisConceptKbIndexEngine,
  createInProcessSynthesisTagVocabularyEngine,
  createInProcessSynthesisTopicGraphIndexEngine,
} from "../packages/synthesis-engine/src/index.js";
import { openSynthesisSidecarIsolatedRepository } from "../apps/synthesis-service/src/isolatedRepository.js";
import { openSynthesisNodeSqliteAdapter } from "../apps/synthesis-service/src/repositoryNodeSqlite.js";
import { normalizeSynthesisApplicationParityTableRows } from "./synthesis-application-parity-policy.js";

const root = path.resolve(import.meta.dirname, "..");
const corpusPath = path.join(
  root,
  "packages/synthesis-contracts/contract-set/synthesis-tag-concept-topic-graph-application-parity-v1/corpus.json",
);

type Corpus = {
  schema: string;
  reportSchema: string;
  profileId: string;
  dataRootId: string;
  clock: string;
  operationIds: string[];
  faultPhases: string[];
  fixture: {
    tag: {
      initialTag: string;
      promotedTag: string;
      libraryId: number;
      itemKey: string;
    };
    concept: {
      firstLabel: string;
      reviewLabel: string;
      topicId: string;
      topicPathId: string;
    };
    topicGraph: {
      rootTopicId: string;
      childTopicId: string;
      rootTitle: string;
      childTitle: string;
    };
  };
  coverage: Record<string, string[]>;
};

type ParityReport = {
  schema: string;
  corpusVersion: string;
  productionCapabilityRegistered?: boolean;
  tagVocabulary: Record<string, any>;
  conceptKb: Record<string, any>;
  topicGraph: Record<string, any>;
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
    tag: unknown;
    concept: unknown;
    topicGraph: unknown;
  };
};

export type SynthesisTagConceptTopicGraphApplicationParityCheck = {
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

function tagCandidate(corpus: Corpus) {
  return {
    entries: [
      {
        tag: corpus.fixture.tag.initialTag,
        facet: "topic",
        note: "fixture",
        aliases: [],
        abbrev: [],
      },
    ],
    aliases: {},
    abbrev: {},
    protocol: {
      version: "1.0.0",
      tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
      maxTagLength: 120,
      facets: ["topic", "method"],
    },
  };
}

function topicNode(id: string, title: string, rootNode = false) {
  return {
    topicId: id,
    title,
    aliases: [],
    nodeType: "materialized" as const,
    definitionStatus: "has_synthesis" as const,
    isRoot: rootNode,
    level: "normal" as const,
    paperCount: 0,
  };
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
  // Initialize the complete durable table inventory without invoking any
  // downstream application or writing domain facts.
  repository.store.captureDurableImportState();

  const tagEngine = createInProcessSynthesisTagVocabularyEngine();
  const tag = createSynthesisTagVocabularyApplication({
    repository: repository.store,
    compute: {
      validate: (request) => Promise.resolve(tagEngine.validate(request)),
      buildIndex: (request) => Promise.resolve(tagEngine.buildIndex(request)),
    },
    tagEffectPort: {
      async applyBatch() {
        throw new Error("fixture_host_unavailable");
      },
    },
    now: () => corpus.clock,
  });
  const tagSaved = await tag.save({
    expectedVocabularyHash: null,
    candidate: tagCandidate(corpus),
  });
  const tagStaged = await tag.stage({
    expectedStagedRevision: 0,
    entries: [
      {
        tag: corpus.fixture.tag.promotedTag,
        facet: "method",
        parentBindings: [
          {
            libraryId: corpus.fixture.tag.libraryId,
            itemKey: corpus.fixture.tag.itemKey,
          },
        ],
      },
    ],
  });
  const tagPromoted = await tag.promote({
    expectedVocabularyHash: tagSaved.vocabularyHash,
    expectedStagedRevision: tagStaged.stagedRevision,
    tags: [corpus.fixture.tag.promotedTag],
  });
  const tagIndexed = await tag.rebuildIndex({
    expectedVocabularyHash: tagPromoted.vocabularyHash,
  });
  const tagInspect = tag.inspect();

  const conceptEngine = createInProcessSynthesisConceptKbIndexEngine();
  const concept = createSynthesisConceptKbApplication({
    repository: repository.store,
    compute: {
      buildIndex: (request) =>
        Promise.resolve(conceptEngine.buildIndex(request)),
      query: (request) => Promise.resolve(conceptEngine.query(request)),
    },
    now: () => corpus.clock,
  });
  const proposal = (label: string, confidence: "high" | "low" = "high") => ({
    label,
    aliases: [],
    conceptType: "method",
    domain: "research",
    shortDefinition: `${label} short`,
    definition: `${label} definition`,
    evidence: [],
    relations: [],
    mergeHints: [],
    confidence,
  });
  const conceptCreated = await concept.ingestProposals({
    expectedManifestHash: null,
    topicId: corpus.fixture.concept.topicId,
    topicPathId: corpus.fixture.concept.topicPathId,
    proposals: [proposal(corpus.fixture.concept.firstLabel)],
  });
  const conceptProposed = await concept.ingestProposals({
    expectedManifestHash: conceptCreated.manifestHash,
    topicId: `${corpus.fixture.concept.topicId}:review`,
    topicPathId: `${corpus.fixture.concept.topicPathId}-review`,
    proposals: [proposal(corpus.fixture.concept.reviewLabel, "low")],
  });
  const reviewId = concept.load().snapshot.reviewItems[0]?.reviewId;
  if (!reviewId) throw new Error("fixture_concept_review_missing");
  const conceptReviewed = await concept.review({
    expectedManifestHash: conceptProposed.manifestHash,
    reviewId,
    action: "approve",
  });
  const conceptIndexed = await concept.rebuildIndex({
    expectedManifestHash: conceptReviewed.manifestHash,
  });
  const conceptQuery = await concept.query({
    labels: [corpus.fixture.concept.firstLabel],
  });
  const conceptInspect = concept.inspect();

  const topicEngine = createInProcessSynthesisTopicGraphIndexEngine();
  const topicGraph = createSynthesisTopicGraphApplication({
    repository: repository.store,
    compute: {
      buildIndex: (request) => Promise.resolve(topicEngine.buildIndex(request)),
    },
    now: () => corpus.clock,
  });
  const rootNode = topicNode(
    corpus.fixture.topicGraph.rootTopicId,
    corpus.fixture.topicGraph.rootTitle,
    true,
  );
  const childNode = topicNode(
    corpus.fixture.topicGraph.childTopicId,
    corpus.fixture.topicGraph.childTitle,
  );
  const topicCreated = await topicGraph.replaceSnapshot({
    expectedManifestHash: null,
    snapshot: {
      nodes: [rootNode, childNode],
      edges: [],
      reviewItems: [],
    },
  });
  const topicIngested = await topicGraph.ingestProposals({
    expectedManifestHash: topicCreated.manifestHash,
    sourceTopicId: corpus.fixture.topicGraph.rootTopicId,
    proposals: [
      {
        type: "target_is_narrower_topic_candidate",
        targetTopicId: corpus.fixture.topicGraph.childTopicId,
        confidence: 0.9,
        provenance: [{ source: "fixture" }],
        evidenceRefs: [],
      },
    ],
  });
  const edgeId = topicGraph.load().snapshot.edges[0]?.edgeId;
  if (!edgeId) throw new Error("fixture_topic_edge_missing");
  const topicDecided = await topicGraph.decideRelation({
    expectedManifestHash: topicIngested.manifestHash,
    edgeId,
    status: "confirmed",
  });
  let topicCycle: { status: string };
  try {
    await topicGraph.replaceSnapshot({
      expectedManifestHash: topicDecided.manifestHash,
      snapshot: {
        nodes: [rootNode, childNode],
        edges: [
          {
            edgeId: "edge:broader:root-child",
            sourceTopicId: rootNode.topicId,
            targetTopicId: childNode.topicId,
            relation: "broader_than",
            status: "confirmed",
            provenance: [],
            evidenceRefs: [],
          },
          {
            edgeId: "edge:broader:child-root",
            sourceTopicId: childNode.topicId,
            targetTopicId: rootNode.topicId,
            relation: "broader_than",
            status: "confirmed",
            provenance: [],
            evidenceRefs: [],
          },
        ],
        reviewItems: [],
      },
    });
    topicCycle = { status: "unexpected_success" };
  } catch {
    topicCycle = { status: "invalid_request" };
  }
  const topicDeleted = await topicGraph.replaceSnapshot({
    expectedManifestHash: topicDecided.manifestHash,
    snapshot: {
      nodes: [{ ...rootNode, definitionStatus: "deleted" as const }, childNode],
      edges: [
        {
          ...topicGraph.load().snapshot.edges[0]!,
          status: "confirmed" as const,
        },
      ],
      reviewItems: [],
    },
  });
  const topicMarked = await topicGraph.markTopicRelationsDeleted({
    expectedManifestHash: topicDeleted.manifestHash,
    topicId: rootNode.topicId,
  });
  const topicPurged = await topicGraph.purgeDeletedTopicRelations({
    expectedManifestHash: topicMarked.manifestHash,
    topicIds: [rootNode.topicId],
  });
  const topicIndexed = await topicGraph.rebuildIndex({
    expectedManifestHash: topicPurged.manifestHash,
  });
  const topicInspect = topicGraph.inspect();

  const tables = tableSnapshot(repository.paths.databasePath);
  await tag.shutdown();
  await concept.shutdown();
  await topicGraph.shutdown();
  repository.close();

  const reopened = openSynthesisSidecarIsolatedRepository({
    profileRuntimeRoot: runtimeRoot,
    profileId: corpus.profileId,
    dataRootId: corpus.dataRootId,
    now: () => corpus.clock,
  });
  const reopenTables = tableSnapshot(reopened.paths.databasePath);
  const reopen = {
    tag: reopened.store.getTagApplicationState(),
    concept: reopened.store.getConceptApplicationState(),
    topicGraph: reopened.store.getTopicGraphApplicationState(),
    tables: reopenTables,
  };
  reopened.close();
  const canonicalAfter = readTree(canonicalRoot);
  return {
    schema: corpus.reportSchema,
    corpusVersion: corpus.schema,
    productionCapabilityRegistered: false,
    tagVocabulary: {
      saved: tagSaved,
      staged: tagStaged,
      promoted: tagPromoted,
      indexed: tagIndexed,
      inspect: tagInspect,
    },
    conceptKb: {
      created: conceptCreated,
      reviewed: conceptReviewed,
      indexed: conceptIndexed,
      query: conceptQuery,
      inspect: conceptInspect,
    },
    topicGraph: {
      created: topicCreated,
      decided: topicDecided,
      cycle: topicCycle,
      purged: topicPurged,
      indexed: topicIndexed,
      inspect: topicInspect,
    },
    crossApplication: {
      tagPresent: true,
      conceptPresent: true,
      topicGraphPresent: true,
      downstreamTriggered: false,
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
      "tag_concept_topic_graph_application_parity",
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

const clusterTables = new Set([
  "synt_tag_abbrev",
  "synt_tag_alias",
  "synt_tag_application_state",
  "synt_tag_audit",
  "synt_tag_effect",
  "synt_tag_protocol",
  "synt_tag_staged_suggestion",
  "synt_tag_validation_warning",
  "synt_tag_vocabulary_entry",
  "synt_concept",
  "synt_concept_alias",
  "synt_concept_application_state",
  "synt_concept_relation",
  "synt_concept_review_item",
  "synt_concept_sense",
  "synt_topic_concept_link",
  "synt_topic_graph_application_state",
  "synt_topic_graph_edge",
  "synt_topic_graph_node",
  "synt_topic_graph_review_item",
]);

function stableTableRows(table: string, rows: Array<Record<string, unknown>>) {
  const sorted = (values: unknown[]) =>
    values.sort((left, right) =>
      canonicalizeSynthesisContractJson(left).localeCompare(
        canonicalizeSynthesisContractJson(right),
      ),
    );
  switch (table) {
    case "synt_schema_meta":
      return sorted(
        rows.map((row) => ({
          key: row.key ?? row.name ?? row.schema_key,
        })),
      );
    case "synt_tag_application_state":
    case "synt_concept_application_state":
    case "synt_topic_graph_application_state":
      return rows.map((row) => ({
        present: true,
        indexReady: Number(row.index_stale) === 0,
      }));
    case "synt_tag_vocabulary_entry":
      return sorted(rows.map((row) => ({ tag: row.tag, facet: row.facet })));
    case "synt_tag_staged_suggestion":
      return sorted(rows.map((row) => ({ tag: row.tag })));
    case "synt_tag_effect":
      return sorted(
        rows.map((row) => ({
          libraryId: Number(row.library_id),
          itemKey: row.item_key,
          tag: row.tag,
          pending: row.status === "pending",
        })),
      );
    case "synt_concept":
      return sorted(
        rows.map((row) => ({ label: row.label, status: row.status })),
      );
    case "synt_concept_review_item":
      return sorted(
        rows.map((row) => ({
          label: row.label,
          open: row.status === "open",
        })),
      );
    case "synt_topic_graph_node":
      return sorted(
        rows.map((row) => ({
          title: row.title,
          root: Number(row.is_root) !== 0,
        })),
      );
    case "synt_topic_graph_edge":
      return sorted(
        rows.map((row) => ({
          relation: row.relation,
          status: row.status,
        })),
      );
    case "synt_topic_graph_review_item":
      return sorted(
        rows.map((row) => ({
          relation: row.relation,
          open: row.status === "open",
        })),
      );
    default:
      if (clusterTables.has(table)) return [{ table, rowCount: rows.length }];
      return rows;
  }
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
  ) {
    errors.push("report_schema_mismatch");
  }
  if (node.productionCapabilityRegistered !== false)
    errors.push("node_oracle_capability_changed");
  if (rust.productionCapabilityRegistered !== false)
    errors.push("rust_candidate_capability_changed");
  for (const pathValue of [
    "tagVocabulary.saved.status",
    "tagVocabulary.staged.status",
    "tagVocabulary.promoted.status",
    "tagVocabulary.indexed.status",
    "conceptKb.created.status",
    "conceptKb.reviewed.status",
    "conceptKb.indexed.status",
    "topicGraph.created.status",
    "topicGraph.decided.status",
    "topicGraph.cycle.status",
    "topicGraph.purged.status",
    "topicGraph.indexed.status",
  ]) {
    if (statusAt(node, pathValue) !== statusAt(rust, pathValue)) {
      errors.push(
        `dto_mismatch:${pathValue}:${String(statusAt(node, pathValue))}:${String(
          statusAt(rust, pathValue),
        )}`,
      );
    }
  }
  for (const [pathValue, nodeKey, rustKey] of [
    ["tagVocabulary.inspect", "entryCount", "entryCount"],
    ["tagVocabulary.inspect", "stagedCount", "stagedCount"],
    ["tagVocabulary.inspect", "pendingEffectCount", "pendingEffectCount"],
    ["conceptKb.inspect", "conceptCount", "conceptCount"],
    ["conceptKb.inspect", "reviewItemCount", "reviewCount"],
    ["topicGraph.inspect", "nodeCount", "nodeCount"],
    ["topicGraph.inspect", "edgeCount", "edgeCount"],
    ["topicGraph.inspect", "reviewItemCount", "reviewCount"],
  ] as const) {
    const nodeValue = statusAt(node, `${pathValue}.${nodeKey}`);
    const rustValue = statusAt(rust, `${pathValue}.${rustKey}`);
    if (nodeValue !== rustValue)
      errors.push(
        `dto_count_mismatch:${pathValue}:${nodeKey}:${String(nodeValue)}:${String(rustValue)}`,
      );
  }
  const nodeTables = Object.keys(node.tables).sort();
  const rustTables = Object.keys(rust.tables).sort();
  if (!equal(nodeTables, rustTables) || nodeTables.length !== 53)
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
    if (!equal(nodeRows, rustRows))
      errors.push(
        `table_mismatch:${table}:${canonicalizeSynthesisContractJson(nodeRows)}:${canonicalizeSynthesisContractJson(rustRows)}`,
      );
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
    if (!equal(report.canonical.before, report.canonical.after))
      errors.push("canonical_tree_mutated");
    if (report.canonical.journal !== null)
      errors.push("canonical_journal_mutated");
    if (report.canonical.receipt !== null)
      errors.push("canonical_receipt_mutated");
    if (report.crossApplication.downstreamTriggered !== false)
      errors.push("automatic_downstream_triggered");
  }
}

export async function checkSynthesisTagConceptTopicGraphApplicationParity(): Promise<SynthesisTagConceptTopicGraphApplicationParityCheck> {
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
    "tagVocabulary",
    "conceptKb",
    "topicGraph",
    "crossApplication",
  ]) {
    if (
      !Array.isArray(corpus.coverage[family]) ||
      !corpus.coverage[family].length
    )
      errors.push(`coverage_missing:${family}`);
  }
  const parityRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "synthesis-tag-concept-topic-graph-parity-"),
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
    "native/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs";
  return {
    ok: errors.length === 0,
    corpus: corpus.schema,
    reportSchema: corpus.reportSchema,
    tables: 53,
    applicationFamilies: 3,
    comparedTables:
      nodeReport && rustReport ? Object.keys(nodeReport.tables).length : 0,
    implementations: {
      node: {
        role: "oracle",
        sourceFingerprint: fingerprint([
          "packages/synthesis-application/src/tagVocabularyApplication.ts",
          "packages/synthesis-application/src/conceptKbApplication.ts",
          "packages/synthesis-application/src/topicGraphApplication.ts",
        ]),
      },
      rust: {
        role: "candidate",
        sourceFingerprint: fingerprint([
          "native/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs",
          "native/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs",
          "native/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs",
          "native/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs",
          driver,
        ]),
      },
    },
    errors,
  };
}

if (import.meta.main) {
  const result = await checkSynthesisTagConceptTopicGraphApplicationParity();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

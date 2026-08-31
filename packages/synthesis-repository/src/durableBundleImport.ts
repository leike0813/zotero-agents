import {
  SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_ID,
  SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
  rebuildSynthesisDurableSyncIndex,
  synthesisDurableEntityKey,
  type SynthesisDurableImportFact,
  type SynthesisDurableSyncIndex,
} from "../../synthesis-contracts/src/durableBundleImport.js";
import {
  SYNTHESIS_DURABLE_BUNDLE_LIMITS,
  type SynthesisDurableAssetEnvelope,
} from "../../synthesis-contracts/src/durableBundle.js";
import {
  rebuildSynthesisConceptAliasRow,
  rebuildSynthesisConceptRelationRow,
  rebuildSynthesisConceptReviewItemRow,
  rebuildSynthesisConceptRow,
  rebuildSynthesisConceptSenseRow,
  rebuildSynthesisTopicConceptLinkRow,
} from "./conceptKb.js";
import {
  captureSynthesisDurableBundleRepositoryState,
  type SynthesisDurableBundleRepositoryTopicBasis,
} from "./durableBundle.js";
import type { SqlAdapter, SqlParams, SqlRow } from "./index.js";
import { rebuildSynthesisReferenceMatchProposalRow } from "./referenceMatchingReview.js";
import {
  rebuildSynthesisCanonicalReferenceRow,
  rebuildSynthesisReferenceBindingRow,
} from "./referenceRefresh.js";
import {
  rebuildSynthesisTagAbbrevRow,
  rebuildSynthesisTagAliasRow,
  rebuildSynthesisTagProtocolRow,
  rebuildSynthesisTagVocabularyEntryRow,
} from "./tagVocabulary.js";
import {
  rebuildSynthesisTopicGraphEdgeRow,
  rebuildSynthesisTopicGraphNodeRow,
  rebuildSynthesisTopicGraphReviewItemRow,
} from "./topicGraph.js";

export const SYNTHESIS_DURABLE_IMPORT_REPOSITORY_SCHEMA_VERSION =
  "synthesis-durable-import-repository.v1" as const;
export const SYNTHESIS_DURABLE_IMPORT_REPOSITORY_SCHEMA_META_KEY =
  "durable_import_repository_schema_version" as const;

export type SynthesisDurableImportCommitReceipt = {
  receiptId: string;
  manifestHash: string;
  topicTargets: SynthesisDurableBundleRepositoryTopicBasis[];
  committedAt: string;
};

export type SynthesisDurableImportRepositoryCapture = {
  aggregateBasis: unknown;
  drafts: ReturnType<
    typeof captureSynthesisDurableBundleRepositoryState
  >["drafts"];
  topicBases: ReturnType<
    typeof captureSynthesisDurableBundleRepositoryState
  >["topicBases"];
  indexRevision: number;
  syncIndex: SynthesisDurableSyncIndex;
  commitReceipt: SynthesisDurableImportCommitReceipt | null;
};

export type SynthesisDurableImportRepositoryApply = {
  expectedAggregateBasis: unknown;
  expectedIndexRevision: number;
  receiptId: string;
  manifestHash: string;
  entries: SynthesisDurableAssetEnvelope[];
  facts: SynthesisDurableImportFact[];
  topicTargets: SynthesisDurableBundleRepositoryTopicBasis[];
  runId?: string;
  now: string;
};

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function nonNegative(value: unknown) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function json(value: unknown) {
  return JSON.stringify(value);
}

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(String(value ?? "")) as T;
  } catch {
    return fallback;
  }
}

function strictTopicTargets(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.entries
  ) {
    throw new Error("durable_import_commit_receipt_invalid");
  }
  const seen = new Set<string>();
  return value.map((target) => {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      throw new Error("durable_import_commit_receipt_invalid");
    }
    const row = target as Record<string, unknown>;
    if (
      Object.keys(row).sort().join("\0") !==
        "artifactHash\0bundleHash\0manifestHash\0metadataHash\0pathId\0topicId" ||
      !clean(row.topicId) ||
      !clean(row.pathId) ||
      !HASH_PATTERN.test(clean(row.manifestHash)) ||
      !HASH_PATTERN.test(clean(row.artifactHash)) ||
      !HASH_PATTERN.test(clean(row.metadataHash)) ||
      !HASH_PATTERN.test(clean(row.bundleHash)) ||
      seen.has(clean(row.topicId))
    ) {
      throw new Error("durable_import_commit_receipt_invalid");
    }
    seen.add(clean(row.topicId));
    return {
      topicId: clean(row.topicId),
      pathId: clean(row.pathId),
      manifestHash: clean(row.manifestHash),
      artifactHash: clean(row.artifactHash),
      metadataHash: clean(row.metadataHash),
      bundleHash: clean(row.bundleHash),
    };
  });
}

export function ensureSynthesisDurableImportRepositorySchema(db: SqlAdapter) {
  db.run(`CREATE TABLE IF NOT EXISTS synt_topic_interest_metadata (
    topic_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_topic_discovery_hint (
    hint_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_related_items_sync_effect (
    effect_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_review_item (
    review_item_id TEXT PRIMARY KEY,
    review_kind TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'open',
    scope_kind TEXT NOT NULL DEFAULT '',
    scope_ref TEXT NOT NULL DEFAULT '',
    blocked_by_review_item_id TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    diagnostics_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_durable_sync_state (
    singleton_id INTEGER PRIMARY KEY CHECK(singleton_id=1),
    revision INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_durable_sync_entity (
    entity_key TEXT PRIMARY KEY,
    entity_kind TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    path TEXT NOT NULL,
    last_synced_hash TEXT NOT NULL,
    last_exported_hash TEXT NOT NULL DEFAULT '',
    last_imported_hash TEXT NOT NULL DEFAULT '',
    last_run_id TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_durable_import_commit (
    singleton_id INTEGER PRIMARY KEY CHECK(singleton_id=1),
    receipt_id TEXT NOT NULL,
    manifest_hash TEXT NOT NULL,
    topic_targets_json TEXT NOT NULL,
    committed_at TEXT NOT NULL
  )`);
  db.run(
    `INSERT OR IGNORE INTO synt_durable_sync_state(singleton_id,revision,updated_at)
     VALUES(1,0,'')`,
  );
  db.run(
    `INSERT OR IGNORE INTO synt_schema_meta(key,value) VALUES(@key,@value)`,
    {
      key: SYNTHESIS_DURABLE_IMPORT_REPOSITORY_SCHEMA_META_KEY,
      value: SYNTHESIS_DURABLE_IMPORT_REPOSITORY_SCHEMA_VERSION,
    },
  );
  const version = clean(
    db.get("SELECT value FROM synt_schema_meta WHERE key=@key", {
      key: SYNTHESIS_DURABLE_IMPORT_REPOSITORY_SCHEMA_META_KEY,
    })?.value,
  );
  if (version !== SYNTHESIS_DURABLE_IMPORT_REPOSITORY_SCHEMA_VERSION) {
    throw new Error("durable_import_repository_schema_mismatch");
  }
}

function payloadRows(db: SqlAdapter, table: string, idColumn: string) {
  return db
    .all(`SELECT * FROM ${table} ORDER BY ${idColumn} ASC`)
    .map((row) => parseJson<Record<string, unknown>>(row.payload_json, {}));
}

export function listSynthesisDurableTopicInterestMetadata(db: SqlAdapter) {
  return payloadRows(db, "synt_topic_interest_metadata", "topic_id");
}

export function listSynthesisDurableTopicDiscoveryHints(db: SqlAdapter) {
  return payloadRows(db, "synt_topic_discovery_hint", "hint_id");
}

export function listSynthesisDurableRelatedItemsEffects(db: SqlAdapter) {
  return payloadRows(db, "synt_related_items_sync_effect", "effect_id");
}

function readSyncIndex(db: SqlAdapter): SynthesisDurableSyncIndex {
  const entities: SynthesisDurableSyncIndex["entities"] = {};
  for (const row of db.all(
    "SELECT * FROM synt_durable_sync_entity ORDER BY entity_key ASC",
  )) {
    const key = clean(row.entity_key);
    entities[key] = {
      entity_id: clean(row.entity_id),
      entity_kind: clean(
        row.entity_kind,
      ) as SynthesisDurableSyncIndex["entities"][string]["entity_kind"],
      path: clean(row.path),
      last_synced_hash: clean(row.last_synced_hash),
      ...(clean(row.last_exported_hash)
        ? { last_exported_hash: clean(row.last_exported_hash) }
        : {}),
      ...(clean(row.last_imported_hash)
        ? { last_imported_hash: clean(row.last_imported_hash) }
        : {}),
      ...(clean(row.last_run_id)
        ? { last_run_id: clean(row.last_run_id) }
        : {}),
      updated_at: clean(row.updated_at),
    };
  }
  return rebuildSynthesisDurableSyncIndex({
    schema_id: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_ID,
    schema_version: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
    updated_at:
      clean(
        db.get(
          "SELECT updated_at FROM synt_durable_sync_state WHERE singleton_id=1",
        )?.updated_at,
      ) || "",
    entities,
  });
}

function readCommitReceipt(
  db: SqlAdapter,
): SynthesisDurableImportCommitReceipt | null {
  const row = db.get(
    "SELECT * FROM synt_durable_import_commit WHERE singleton_id=1",
  );
  if (!row) return null;
  const rawTargets = parseJson<unknown>(row.topic_targets_json, null);
  const receipt = {
    receiptId: clean(row.receipt_id),
    manifestHash: clean(row.manifest_hash),
    topicTargets: strictTopicTargets(rawTargets),
    committedAt: clean(row.committed_at),
  };
  if (
    !receipt.receiptId ||
    receipt.receiptId.length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.string ||
    !HASH_PATTERN.test(receipt.manifestHash) ||
    !receipt.committedAt
  ) {
    throw new Error("durable_import_commit_receipt_invalid");
  }
  return receipt;
}

export function captureSynthesisDurableImportRepositoryState(
  db: SqlAdapter,
): SynthesisDurableImportRepositoryCapture {
  return db.transaction(() => {
    ensureSynthesisDurableImportRepositorySchema(db);
    const durable = captureSynthesisDurableBundleRepositoryState(db);
    return {
      aggregateBasis: durable.aggregateBasis,
      drafts: durable.drafts,
      topicBases: durable.topicBases,
      indexRevision: nonNegative(
        db.get(
          "SELECT revision FROM synt_durable_sync_state WHERE singleton_id=1",
        )?.revision,
      ),
      syncIndex: readSyncIndex(db),
      commitReceipt: readCommitReceipt(db),
    };
  });
}

const ENTITY_TABLES: Partial<Record<string, string>> = {
  concept: "synt_concept",
  concept_sense: "synt_concept_sense",
  concept_alias: "synt_concept_alias",
  concept_relation: "synt_concept_relation",
  concept_review_item: "synt_concept_review_item",
  topic_graph_node: "synt_topic_graph_node",
  topic_graph_edge: "synt_topic_graph_edge",
  topic_graph_review_item: "synt_topic_graph_review_item",
  canonical_reference: "synt_reference_canonical",
  canonical_reference_redirect: "synt_reference_redirect",
  reference_binding: "synt_reference_binding",
  reference_match_proposal: "synt_reference_match_proposal",
  review_item: "synt_review_item",
  tag_protocol: "synt_tag_protocol",
};

function snake(value: string) {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function sqlValue(value: unknown) {
  if (value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "object") return JSON.stringify(value);
  return value as string | number;
}

function upsertObject(db: SqlAdapter, table: string, data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("durable_import_payload_invalid");
  }
  const available = new Set(
    db.all(`PRAGMA table_info(${table})`).map((row) => clean(row.name)),
  );
  const entries = Object.entries(data as Record<string, unknown>)
    .map(([key, value]) => [snake(key), value] as const)
    .filter(([column, value]) => available.has(column) && value !== undefined);
  if (!entries.length) throw new Error("durable_import_payload_invalid");
  const params: SqlParams = {};
  for (const [column, value] of entries) params[column] = sqlValue(value);
  db.run(
    `INSERT OR REPLACE INTO ${table} (${entries.map(([column]) => column).join(",")})
     VALUES (${entries.map(([column]) => `@${column}`).join(",")})`,
    params,
  );
}

function sqlRow(data: unknown): SqlRow {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("durable_import_payload_invalid");
  }
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => [
      snake(key),
      value,
    ]),
  );
}

const ENTITY_REBUILDERS: Partial<
  Record<string, (row: SqlRow) => Record<string, unknown>>
> = {
  concept: rebuildSynthesisConceptRow,
  concept_sense: rebuildSynthesisConceptSenseRow,
  concept_alias: rebuildSynthesisConceptAliasRow,
  concept_relation: rebuildSynthesisConceptRelationRow,
  concept_review_item: rebuildSynthesisConceptReviewItemRow,
  topic_graph_node: rebuildSynthesisTopicGraphNodeRow,
  topic_graph_edge: rebuildSynthesisTopicGraphEdgeRow,
  topic_graph_review_item: rebuildSynthesisTopicGraphReviewItemRow,
  canonical_reference: rebuildSynthesisCanonicalReferenceRow,
  reference_binding: rebuildSynthesisReferenceBindingRow,
  reference_match_proposal: rebuildSynthesisReferenceMatchProposalRow,
  tag_protocol: rebuildSynthesisTagProtocolRow,
};

function replaceAggregate(
  db: SqlAdapter,
  table: string,
  field: string,
  data: unknown,
  rebuild: (row: SqlRow) => Record<string, unknown>,
) {
  const record = data as Record<string, unknown>;
  const rows = Array.isArray(record?.[field]) ? record[field] : null;
  if (!rows) throw new Error("durable_import_payload_invalid");
  db.run(`DELETE FROM ${table}`);
  for (const row of rows) upsertObject(db, table, rebuild(sqlRow(row)));
}

function applyEntry(db: SqlAdapter, entry: SynthesisDurableAssetEnvelope) {
  if (entry.entity_kind === "topic_current_asset") return;
  if (entry.entity_kind === "topic_interest_metadata") {
    db.run(
      `INSERT OR REPLACE INTO synt_topic_interest_metadata(topic_id,payload_json,updated_at)
       VALUES(@id,@payload,@updated_at)`,
      {
        id: entry.entity_id,
        payload: json(entry.data),
        updated_at: entry.updated_at,
      },
    );
    return;
  }
  if (entry.entity_kind === "topic_discovery_hint") {
    db.run(
      `INSERT OR REPLACE INTO synt_topic_discovery_hint(hint_id,payload_json,updated_at)
       VALUES(@id,@payload,@updated_at)`,
      {
        id: entry.entity_id,
        payload: json(entry.data),
        updated_at: entry.updated_at,
      },
    );
    return;
  }
  if (entry.entity_kind === "related_items_sync_effect") {
    db.run(
      `INSERT OR REPLACE INTO synt_related_items_sync_effect(effect_id,payload_json,updated_at)
       VALUES(@id,@payload,@updated_at)`,
      {
        id: entry.entity_id,
        payload: json(entry.data),
        updated_at: entry.updated_at,
      },
    );
    return;
  }
  if (entry.entity_kind === "canonical_reference_redirect") {
    const data = entry.data as Record<string, unknown>;
    upsertObject(db, "synt_reference_redirect", {
      fromCanonicalReferenceId: data.fromCanonicalReferenceId,
      toCanonicalReferenceId: data.toCanonicalReferenceId,
      reason: clean(data.reason),
      diagnosticsJson: clean(data.diagnosticsJson) || "[]",
      createdAt: clean(data.createdAt) || entry.updated_at,
      updatedAt: clean(data.updatedAt) || entry.updated_at,
    });
    return;
  }
  if (entry.entity_kind === "topic_concept_links") {
    const data = entry.data as { links?: unknown[] };
    db.run("DELETE FROM synt_topic_concept_link WHERE topic_id=@topic_id", {
      topic_id: entry.entity_id,
    });
    for (const row of data.links ?? [])
      upsertObject(
        db,
        "synt_topic_concept_link",
        rebuildSynthesisTopicConceptLinkRow(sqlRow(row)),
      );
    return;
  }
  if (entry.entity_kind === "tag_vocabulary") {
    replaceAggregate(
      db,
      "synt_tag_vocabulary_entry",
      "entries",
      entry.data,
      rebuildSynthesisTagVocabularyEntryRow,
    );
    return;
  }
  if (entry.entity_kind === "tag_aliases") {
    replaceAggregate(
      db,
      "synt_tag_alias",
      "aliases",
      entry.data,
      rebuildSynthesisTagAliasRow,
    );
    return;
  }
  if (entry.entity_kind === "tag_abbrev") {
    replaceAggregate(
      db,
      "synt_tag_abbrev",
      "abbrev",
      entry.data,
      rebuildSynthesisTagAbbrevRow,
    );
    return;
  }
  const table = ENTITY_TABLES[entry.entity_kind];
  if (!table) throw new Error("durable_import_entity_kind_unsupported");
  const rebuild = ENTITY_REBUILDERS[entry.entity_kind];
  upsertObject(db, table, rebuild ? rebuild(sqlRow(entry.data)) : entry.data);
}

function updateDomainBases(
  db: SqlAdapter,
  manifestHash: string,
  topicTargets: SynthesisDurableBundleRepositoryTopicBasis[],
  now: string,
) {
  db.run(
    "UPDATE synt_concept_application_state SET manifest_hash=@hash,index_stale=1,updated_at=@now WHERE singleton_id=1",
    { hash: manifestHash, now },
  );
  db.run(
    "UPDATE synt_topic_graph_application_state SET manifest_hash=@hash,index_stale=1,updated_at=@now WHERE singleton_id=1",
    { hash: manifestHash, now },
  );
  db.run(
    "UPDATE synt_tag_application_state SET vocabulary_hash=@hash,index_stale=1,updated_at=@now WHERE singleton_id=1",
    { hash: manifestHash, now },
  );
  db.run(
    "UPDATE synt_reference_application_state SET reference_hash=@hash,graph_ready=0,related_items_ready=0,updated_at=@now WHERE singleton_id=1",
    { hash: manifestHash, now },
  );
  for (const topic of topicTargets) {
    const existing = db.get(
      "SELECT * FROM synt_topic_application_state WHERE topic_id=@topic_id",
      { topic_id: topic.topicId },
    );
    db.run(
      `INSERT OR REPLACE INTO synt_topic_application_state(
        topic_id,path_id,title,definition,language,operation,manifest_hash,
        artifact_hash,metadata_hash,bundle_hash,paper_count,
        topic_definition_json,topic_resolver_json,resolved_paper_set_json,
        created_at,updated_at
      ) VALUES(
        @topic_id,@path_id,@title,@definition,@language,@operation,@manifest_hash,
        @artifact_hash,@metadata_hash,@bundle_hash,@paper_count,
        @topic_definition_json,@topic_resolver_json,@resolved_paper_set_json,
        @created_at,@updated_at
      )`,
      {
        topic_id: topic.topicId,
        path_id: topic.pathId,
        title: clean(existing?.title),
        definition: clean(existing?.definition),
        language: clean(existing?.language) || "auto",
        operation: clean(existing?.operation) || "durable_import",
        manifest_hash: topic.manifestHash,
        artifact_hash: topic.artifactHash,
        metadata_hash: topic.metadataHash,
        bundle_hash: topic.bundleHash,
        paper_count: nonNegative(existing?.paper_count),
        topic_definition_json: clean(existing?.topic_definition_json) || "{}",
        topic_resolver_json: clean(existing?.topic_resolver_json) || "{}",
        resolved_paper_set_json:
          clean(existing?.resolved_paper_set_json) || "{}",
        created_at: clean(existing?.created_at) || now,
        updated_at: now,
      },
    );
  }
  db.run(
    `UPDATE synt_cache_basis SET status='stale',stale_reason='durable_sync_import',updated_at=@now`,
    { now },
  );
}

export function applySynthesisDurableImportRepositoryState(
  db: SqlAdapter,
  args: SynthesisDurableImportRepositoryApply,
) {
  if (
    !HASH_PATTERN.test(args.manifestHash) ||
    !clean(args.receiptId) ||
    clean(args.receiptId).length > SYNTHESIS_DURABLE_BUNDLE_LIMITS.string ||
    !clean(args.now)
  ) {
    throw new Error("durable_import_apply_invalid");
  }
  const topicTargets = strictTopicTargets(args.topicTargets);
  return db.transaction(() => {
    ensureSynthesisDurableImportRepositorySchema(db);
    const current = captureSynthesisDurableImportRepositoryState(db);
    if (
      json(current.aggregateBasis) !== json(args.expectedAggregateBasis) ||
      current.indexRevision !== args.expectedIndexRevision
    ) {
      return false;
    }
    for (const entry of args.entries) applyEntry(db, entry);
    updateDomainBases(db, args.manifestHash, topicTargets, args.now);
    const facts = new Map(
      args.facts
        .filter((fact) => fact.entityKind !== "tombstone")
        .map((fact) => [
          synthesisDurableEntityKey(fact.entityKind, fact.entityId),
          fact,
        ]),
    );
    for (const [key, fact] of facts) {
      db.run(
        `INSERT OR REPLACE INTO synt_durable_sync_entity(
          entity_key,entity_kind,entity_id,path,last_synced_hash,
          last_imported_hash,last_run_id,updated_at
        ) VALUES(@key,@kind,@id,@path,@hash,@hash,@run_id,@updated_at)`,
        {
          key,
          kind: fact.entityKind,
          id: fact.entityId,
          path: fact.path,
          hash: fact.hash,
          run_id: clean(args.runId),
          updated_at: args.now,
        },
      );
    }
    db.run(
      "UPDATE synt_durable_sync_state SET revision=@revision,updated_at=@now WHERE singleton_id=1",
      { revision: current.indexRevision + 1, now: args.now },
    );
    db.run(
      `INSERT OR REPLACE INTO synt_durable_import_commit(
        singleton_id,receipt_id,manifest_hash,topic_targets_json,committed_at
      ) VALUES(1,@receipt_id,@manifest_hash,@targets,@committed_at)`,
      {
        receipt_id: args.receiptId,
        manifest_hash: args.manifestHash,
        targets: json(topicTargets),
        committed_at: args.now,
      },
    );
    return true;
  });
}

export function clearSynthesisDurableImportCommit(
  db: SqlAdapter,
  receiptId: string,
) {
  db.run(
    "DELETE FROM synt_durable_import_commit WHERE singleton_id=1 AND receipt_id=@receipt_id",
    { receipt_id: receiptId },
  );
}

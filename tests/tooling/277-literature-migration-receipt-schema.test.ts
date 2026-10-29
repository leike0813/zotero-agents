import { assert } from "chai";
import { DatabaseSync } from "node:sqlite";
import {
  createLiteratureMigrationTables,
  ensureLiteratureMigrationTablesSchema,
} from "../../src/modules/pluginStateStore/literatureMigrationTables";
import type { LiteratureArtifactMigrationSetEntry } from "../../src/modules/pluginStateStore";

function createAdapter(database: DatabaseSync) {
  return {
    run: (sql: string, params?: Record<string, unknown>) =>
      database.prepare(sql).run(params || {}),
    all: (sql: string, params?: Record<string, unknown>) =>
      database.prepare(sql).all(params || {}) as Record<string, unknown>[],
    get: (sql: string, params?: Record<string, unknown>) =>
      (database.prepare(sql).get(params || {}) as
        | Record<string, unknown>
        | undefined) || null,
    transaction: <T>(run: () => T) => run(),
    close: () => database.close(),
  };
}

function legacySetTable(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE plugin_literature_artifact_migration_sets (
      run_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      operation_id TEXT NOT NULL DEFAULT '',
      ordinal INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      parent_ref_json TEXT NOT NULL,
      refs_json TEXT NOT NULL DEFAULT '[]',
      basis_hash TEXT NOT NULL DEFAULT '',
      classification TEXT NOT NULL,
      outcome TEXT NOT NULL,
      reason_codes_json TEXT NOT NULL DEFAULT '[]',
      verified_count INTEGER NOT NULL DEFAULT 0,
      unresolved_count INTEGER NOT NULL DEFAULT 0,
      recovered_count INTEGER NOT NULL DEFAULT 0,
      dropped_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (run_id, candidate_id)
    )
  `);
}

function setEntry(
  overrides: Partial<LiteratureArtifactMigrationSetEntry> = {},
): LiteratureArtifactMigrationSetEntry {
  return {
    runId: "run-1",
    candidateId: "candidate-1",
    operationId: "operation-1",
    ordinal: 1,
    title: "Synthetic title",
    parentRef: "{}",
    refs: [],
    basisHash: "basis",
    classification: "review_required",
    outcome: "preview",
    reasonCodes: ["duplicate_reference"],
    verifiedCount: 1,
    unresolvedCount: 0,
    recoveredCount: 0,
    droppedCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    diagnostics: [],
    ...overrides,
  };
}

describe("literature migration decision receipt schema", function () {
  it("adds one defaulted summary column to existing receipts and reads old rows", function () {
    const database = new DatabaseSync(":memory:");
    legacySetTable(database);
    database
      .prepare(
        `
      INSERT INTO plugin_literature_artifact_migration_sets
        (run_id, candidate_id, ordinal, parent_ref_json, classification,
         outcome, reason_codes_json, created_at, updated_at)
      VALUES ('run-1', 'legacy-candidate', 1, '{}', 'review_required',
              'preview', '["duplicate_reference"]', 'created', 'updated')
    `,
      )
      .run();

    const adapter = createAdapter(database);
    ensureLiteratureMigrationTablesSchema(adapter);
    const columns = database
      .prepare("PRAGMA table_info(plugin_literature_artifact_migration_sets)")
      .all() as Array<{ name: string; dflt_value: string | null }>;
    const summaryColumn = columns.find(
      ({ name }) => name === "decision_summary_json",
    );
    assert.isDefined(summaryColumn);
    assert.equal(summaryColumn?.dflt_value, "'{}'");

    const tables = createLiteratureMigrationTables(() => adapter);
    const legacy = tables.getLiteratureArtifactMigrationSet(
      "run-1",
      "legacy-candidate",
    );
    assert.deepEqual(legacy?.originalReasonCodes, []);
    assert.equal(legacy?.selectionSource, "automatic");
    assert.equal(legacy?.disposition, "pending");
    assert.deepEqual(legacy?.decisions, []);
    database.close();
  });

  it("round trips bounded structured decisions without persisting raw inputs", function () {
    const database = new DatabaseSync(":memory:");
    const adapter = createAdapter(database);
    ensureLiteratureMigrationTablesSchema(adapter);
    const tables = createLiteratureMigrationTables(() => adapter);
    const entry = setEntry({
      originalReasonCodes: ["duplicate_reference", "unresolved_linkage"],
      selectionSource: "individual",
      disposition: "include",
      decisions: Array.from({ length: 25 }, (_, index) => ({
        reasonCode: `reason-${index}`,
        kind: "merge_duplicates",
        source: index % 2 ? "individual" : "batch",
      })),
      diagnostics: ["bounded-receipt"],
    });
    tables.upsertLiteratureArtifactMigrationSet(entry);
    const result = tables.getLiteratureArtifactMigrationSet(
      "run-1",
      "candidate-1",
    );
    assert.deepEqual(result?.originalReasonCodes, [
      "duplicate_reference",
      "unresolved_linkage",
    ]);
    assert.equal(result?.selectionSource, "individual");
    assert.equal(result?.disposition, "include");
    assert.lengthOf(result?.decisions || [], 20);
    assert.equal(result?.decisions?.[19]?.reasonCode, "reason-19");
    assert.deepEqual(
      tables.listLiteratureArtifactMigrationSets({ runId: "run-1" })[0]
        ?.decisions,
      result?.decisions,
    );

    const stored = adapter.get!(
      "SELECT decision_summary_json FROM plugin_literature_artifact_migration_sets WHERE candidate_id=@candidate_id",
      { candidate_id: "candidate-1" },
    );
    const serialized = String(stored?.decision_summary_json || "");
    assert.notInclude(serialized, "Synthetic title");
    assert.notInclude(serialized, "raw");
    database.close();
  });
});

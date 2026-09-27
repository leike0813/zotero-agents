import { strict as assert } from "node:assert";
import { DatabaseSync } from "node:sqlite";

import {
  ensureSynthesisReferenceRefreshRepositorySchema,
  listSynthesisRawReferences,
  replaceSynthesisReferenceProjection,
} from "../../packages/synthesis-repository/src/referenceRefresh";
import { projectSynthesisReferencePayloads } from "../../packages/synthesis-application/src/referenceProjection";
import type { SqlAdapter } from "../../packages/synthesis-repository/src/index";

function adapter(database: DatabaseSync): SqlAdapter {
  return {
    run(sql, params) {
      database.prepare(sql).run(params ?? {});
    },
    all(sql, params) {
      return database.prepare(sql).all(params ?? {}) as Record<
        string,
        unknown
      >[];
    },
    get(sql, params) {
      return (
        (database.prepare(sql).get(params ?? {}) as
          | Record<string, unknown>
          | undefined) ?? null
      );
    },
    transaction(fn) {
      database.exec("BEGIN");
      try {
        const result = fn();
        database.exec("COMMIT");
        return result;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function rawReference() {
  return {
    sourceReferenceId: "550e8400-e29b-41d4-a716-446655440000",
    rawReferenceId: "rawref:one",
    sourceRef: "1:SOURCE",
    referencesArtifactHash: "sha256:references",
    referenceIndex: 0,
    rawHash: "sha256:raw",
    parsedTitle: "Example",
    normalizedTitle: "example",
    year: "2024",
    authorsJson: '["Doe"]',
    rawReference: "Doe. Example. 2024.",
    canonicalReferenceId: "cref:one",
    status: "active" as const,
    rolesJson: "[]",
    diagnosticsJson: "[]",
    createdAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-07T00:00:00.000Z",
  };
}

function canonicalReferences(sourceReferenceId: string) {
  return {
    schema: "source_reference_artifact.v1",
    references: [
      {
        sourceReferenceId,
        extraction: { raw: "Doe. Example. 2024.", confidence: 1 },
        bibliography: { title: "Example", authors: ["Doe"], year: 2024 },
        matching: {},
      },
    ],
  };
}

describe("Synthesis Source Reference ID storage", function () {
  it("round-trips the opaque Source ID through the TS projection repository", function () {
    const database = new DatabaseSync(":memory:");
    const db = adapter(database);
    db.run(
      "CREATE TABLE synt_schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    );
    db.run(`CREATE TABLE synt_cache_basis (
      cache_key TEXT PRIMARY KEY, cache_kind TEXT, scope_kind TEXT, scope_ref TEXT,
      status TEXT, basis_kind TEXT, basis_value TEXT, source_hash TEXT,
      policy_version TEXT, refreshed_at TEXT, stale_reason TEXT,
      diagnostics_json TEXT, updated_at TEXT
    )`);
    ensureSynthesisReferenceRefreshRepositorySchema(db);
    assert.equal(
      database
        .prepare("SELECT source_reference_id FROM synt_reference_raw")
        .columns()[0]?.name,
      "source_reference_id",
    );
    assert.equal(
      replaceSynthesisReferenceProjection(db, {
        expectedReferenceHash: null,
        referenceHash: "sha256:state",
        inputHash: "sha256:input",
        scope: "full",
        sourceRefs: [],
        replaceReferenceSourceRefs: [],
        sources: [],
        artifacts: [],
        rawReferences: [rawReference()],
        canonicals: [],
        bindings: [],
        reviews: [],
        graphFactsChanged: false,
        now: "2026-09-07T00:00:00.000Z",
      }),
      true,
    );
    assert.equal(
      listSynthesisRawReferences(db)[0]?.sourceReferenceId,
      rawReference().sourceReferenceId,
    );
    database.close();
  });

  it("upgrades an existing v1 table before accepting the v2 schema", function () {
    const database = new DatabaseSync(":memory:");
    const db = adapter(database);
    db.run(
      "CREATE TABLE synt_schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    );
    db.run(
      "INSERT INTO synt_schema_meta(key, value) VALUES ('reference_refresh_application_schema_version', 'synthesis-reference-refresh-repository.v1')",
    );
    db.run(`CREATE TABLE synt_reference_raw (
      raw_reference_id TEXT PRIMARY KEY, source_ref TEXT NOT NULL,
      references_artifact_hash TEXT NOT NULL, reference_index INTEGER NOT NULL,
      raw_hash TEXT NOT NULL, parsed_title TEXT NOT NULL, normalized_title TEXT NOT NULL,
      year TEXT NOT NULL, authors_json TEXT NOT NULL, raw_reference TEXT NOT NULL,
      canonical_reference_id TEXT NOT NULL, status TEXT NOT NULL,
      roles_json TEXT NOT NULL, diagnostics_json TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`);
    ensureSynthesisReferenceRefreshRepositorySchema(db);
    const columns = database
      .prepare("PRAGMA table_info(synt_reference_raw)")
      .all() as Array<{ name: string }>;
    assert.ok(columns.some((column) => column.name === "source_reference_id"));
    assert.equal(
      db.get(
        "SELECT value FROM synt_schema_meta WHERE key='reference_refresh_application_schema_version'",
      )?.value,
      "synthesis-reference-refresh-repository.v2",
    );
    database.close();
  });

  it("retains every Source ID when equal content converges on one canonical reference", function () {
    const sourceA = "550e8400-e29b-41d4-a716-446655440001";
    const sourceB = "550e8400-e29b-41d4-a716-446655440002";
    const projected = projectSynthesisReferencePayloads({
      items: [],
      sources: [
        {
          paperRef: "1:PAPER-A",
          referencesArtifactHash: "sha256:references-a",
          referencesPayload: canonicalReferences(sourceA),
        },
        {
          paperRef: "1:PAPER-B",
          referencesArtifactHash: "sha256:references-b",
          referencesPayload: canonicalReferences(sourceB),
        },
      ],
      timestamp: "2026-09-07T00:00:00.000Z",
    });
    assert.equal(projected.rawReferences.length, 2);
    assert.deepEqual(
      new Set(projected.rawReferences.map((row) => row.sourceReferenceId)),
      new Set([sourceA, sourceB]),
    );
    assert.equal(
      projected.rawReferences[0]?.canonicalReferenceId,
      projected.rawReferences[1]?.canonicalReferenceId,
    );
    assert.equal(projected.canonicals.length, 1);

    const database = new DatabaseSync(":memory:");
    const db = adapter(database);
    db.run(
      "CREATE TABLE synt_schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    );
    db.run(`CREATE TABLE synt_cache_basis (
      cache_key TEXT PRIMARY KEY, cache_kind TEXT, scope_kind TEXT, scope_ref TEXT,
      status TEXT, basis_kind TEXT, basis_value TEXT, source_hash TEXT,
      policy_version TEXT, refreshed_at TEXT, stale_reason TEXT,
      diagnostics_json TEXT, updated_at TEXT
    )`);
    ensureSynthesisReferenceRefreshRepositorySchema(db);
    assert.equal(
      replaceSynthesisReferenceProjection(db, {
        expectedReferenceHash: null,
        referenceHash: "sha256:state",
        inputHash: "sha256:input",
        scope: "full",
        sourceRefs: [],
        replaceReferenceSourceRefs: [],
        sources: [],
        artifacts: [],
        rawReferences: projected.rawReferences,
        canonicals: projected.canonicals,
        bindings: [],
        reviews: [],
        graphFactsChanged: false,
        now: "2026-09-07T00:00:00.000Z",
      }),
      true,
    );
    const storedRaw = listSynthesisRawReferences(db);
    assert.deepEqual(
      new Set(storedRaw.map((row) => row.sourceReferenceId)),
      new Set([sourceA, sourceB]),
    );
    assert.equal(
      storedRaw[0]?.canonicalReferenceId,
      storedRaw[1]?.canonicalReferenceId,
    );
    database.close();
  });
});

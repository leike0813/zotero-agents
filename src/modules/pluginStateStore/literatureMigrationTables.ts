import type {
  LiteratureArtifactMigrationRunEntry,
  LiteratureArtifactMigrationRunListOptions,
  LiteratureArtifactMigrationRunState,
  LiteratureArtifactMigrationSetEntry,
  LiteratureArtifactMigrationSetListOptions,
  LiteratureArtifactMigrationSetOutcome,
} from "../pluginStateStore";
import {
  normalizeRowLimit,
  normalizeString,
  nowIso,
  type SqlAdapter,
  type SqlParams,
} from "./core";

export function ensureLiteratureMigrationTablesSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_literature_artifact_migration_runs (
      run_id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL,
      migration_id TEXT NOT NULL,
      definition_version TEXT NOT NULL,
      library_id TEXT NOT NULL,
      state TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      processed_count INTEGER NOT NULL DEFAULT 0,
      remaining_count INTEGER NOT NULL DEFAULT 0,
      set_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      terminal_at TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]'
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_literature_artifact_migration_sets (
      run_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      operation_id TEXT NOT NULL DEFAULT '',
      ordinal INTEGER NOT NULL,
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
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_literature_migration_runs_updated
      ON plugin_literature_artifact_migration_runs(updated_at DESC, run_id DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_literature_migration_sets_run_ordinal
      ON plugin_literature_artifact_migration_sets(run_id, ordinal ASC);
  `);
}

export function createLiteratureMigrationTables(getAdapter: () => SqlAdapter) {
  function parseStringArrayJson(value: unknown): string[] {
    try {
      const parsed = JSON.parse(normalizeString(value) || "[]") as unknown;
      return Array.isArray(parsed)
        ? parsed.map((entry) => normalizeString(entry)).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  function jsonStringArray(values: unknown): string {
    return JSON.stringify(
      Array.isArray(values)
        ? values.map((entry) => normalizeString(entry)).filter(Boolean)
        : [],
    );
  }

  function normalizeLiteratureArtifactMigrationRunRow(
    row: Record<string, unknown>,
  ): LiteratureArtifactMigrationRunEntry {
    return {
      runId: normalizeString(row.run_id),
      operationId: normalizeString(row.operation_id),
      migrationId: normalizeString(row.migration_id),
      definitionVersion: Number(row.definition_version || 0),
      libraryId: normalizeString(row.library_id),
      state: normalizeString(row.state) as LiteratureArtifactMigrationRunState,
      reason: normalizeString(row.reason),
      processedCount: Number(row.processed_count || 0),
      remainingCount: Number(row.remaining_count || 0),
      setCount: Number(row.set_count || 0),
      createdAt: normalizeString(row.created_at),
      updatedAt: normalizeString(row.updated_at),
      terminalAt: normalizeString(row.terminal_at),
      diagnostics: parseStringArrayJson(row.diagnostics_json),
    };
  }

  function normalizeLiteratureArtifactMigrationSetRow(
    row: Record<string, unknown>,
  ): LiteratureArtifactMigrationSetEntry {
    return {
      runId: normalizeString(row.run_id),
      candidateId: normalizeString(row.candidate_id),
      operationId: normalizeString(row.operation_id),
      ordinal: Number(row.ordinal || 0),
      parentRef: normalizeString(row.parent_ref_json),
      refs: parseStringArrayJson(row.refs_json),
      basisHash: normalizeString(row.basis_hash),
      classification: normalizeString(row.classification) as
        | "ready"
        | "review_required"
        | "blocked",
      outcome: normalizeString(
        row.outcome,
      ) as LiteratureArtifactMigrationSetOutcome,
      reasonCodes: parseStringArrayJson(row.reason_codes_json),
      verifiedCount: Number(row.verified_count || 0),
      unresolvedCount: Number(row.unresolved_count || 0),
      recoveredCount: Number(row.recovered_count || 0),
      droppedCount: Number(row.dropped_count || 0),
      createdAt: normalizeString(row.created_at),
      updatedAt: normalizeString(row.updated_at),
      diagnostics: parseStringArrayJson(row.diagnostics_json),
    };
  }

  function decodeMigrationCursor(raw: unknown): {
    updatedAt?: string;
    runId?: string;
    ordinal?: number;
  } {
    const value = normalizeString(raw);
    if (!value) return {};
    try {
      const parsed = JSON.parse(decodeURIComponent(value)) as Record<
        string,
        unknown
      >;
      return {
        updatedAt: normalizeString(parsed.updatedAt) || undefined,
        runId: normalizeString(parsed.runId) || undefined,
        ordinal:
          Number.isFinite(Number(parsed.ordinal)) && Number(parsed.ordinal) > 0
            ? Number(parsed.ordinal)
            : undefined,
      };
    } catch {
      return {};
    }
  }

  function upsertLiteratureArtifactMigrationRun(
    entry: LiteratureArtifactMigrationRunEntry,
  ) {
    const runId = normalizeString(entry.runId);
    if (!runId) return;
    const db = getAdapter();
    db.run(
      `
        INSERT OR REPLACE INTO plugin_literature_artifact_migration_runs
        (run_id, operation_id, migration_id, definition_version, library_id,
         state, reason, processed_count, remaining_count, set_count, created_at,
         updated_at, terminal_at, diagnostics_json)
        VALUES (@run_id, @operation_id, @migration_id, @definition_version,
         @library_id, @state, @reason, @processed_count, @remaining_count,
         @set_count, @created_at, @updated_at, @terminal_at, @diagnostics_json)
      `,
      {
        run_id: runId,
        operation_id: normalizeString(entry.operationId),
        migration_id: normalizeString(entry.migrationId),
        definition_version: Number(entry.definitionVersion || 0),
        library_id: normalizeString(entry.libraryId),
        state: normalizeString(entry.state),
        reason: normalizeString(entry.reason),
        processed_count: Math.max(
          0,
          Math.floor(Number(entry.processedCount) || 0),
        ),
        remaining_count: Math.max(
          0,
          Math.floor(Number(entry.remainingCount) || 0),
        ),
        set_count: Math.max(0, Math.floor(Number(entry.setCount) || 0)),
        created_at: normalizeString(entry.createdAt) || nowIso(),
        updated_at: normalizeString(entry.updatedAt) || nowIso(),
        terminal_at: normalizeString(entry.terminalAt),
        diagnostics_json: jsonStringArray(entry.diagnostics),
      },
    );
  }

  function getLiteratureArtifactMigrationRun(runIdRaw: string) {
    const runId = normalizeString(runIdRaw);
    if (!runId) return null;
    const row = getAdapter().get(
      `
        SELECT run_id, operation_id, migration_id, definition_version,
          library_id, state, reason, processed_count, remaining_count, set_count,
          created_at, updated_at, terminal_at, diagnostics_json
        FROM plugin_literature_artifact_migration_runs
        WHERE run_id=@run_id
        LIMIT 1
      `,
      { run_id: runId },
    );
    return row ? normalizeLiteratureArtifactMigrationRunRow(row) : null;
  }

  function listLiteratureArtifactMigrationRuns(
    options: LiteratureArtifactMigrationRunListOptions = {},
  ) {
    const where: string[] = [];
    const params: SqlParams = {};
    const libraryId = normalizeString(options.libraryId);
    if (libraryId) {
      where.push("library_id=@library_id");
      params.library_id = libraryId;
    }
    const states = Array.from(
      new Set((options.states || []).map((state) => normalizeString(state))),
    ).filter(Boolean);
    if (states.length) {
      states.forEach((state, index) => {
        params[`state_${index}`] = state;
      });
      where.push(
        `state IN (${states.map((_, index) => `@state_${index}`).join(", ")})`,
      );
    }
    const cursor = decodeMigrationCursor(options.cursor);
    if (cursor.updatedAt) {
      params.cursor_updated_at = cursor.updatedAt;
      params.cursor_run_id = cursor.runId || "";
      where.push(
        "(updated_at < @cursor_updated_at OR (updated_at = @cursor_updated_at AND run_id < @cursor_run_id))",
      );
    }
    const limit = Math.min(100, normalizeRowLimit(options.limit) || 50);
    params.limit = limit;
    const rows = getAdapter().all(
      `
        SELECT run_id, operation_id, migration_id, definition_version,
          library_id, state, reason, processed_count, remaining_count, set_count,
          created_at, updated_at, terminal_at, diagnostics_json
        FROM plugin_literature_artifact_migration_runs
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, run_id DESC
        LIMIT @limit
      `,
      params,
    );
    return rows.map(normalizeLiteratureArtifactMigrationRunRow);
  }

  function upsertLiteratureArtifactMigrationSet(
    entry: LiteratureArtifactMigrationSetEntry,
  ) {
    const runId = normalizeString(entry.runId);
    const candidateId = normalizeString(entry.candidateId);
    if (!runId || !candidateId) return;
    const db = getAdapter();
    db.run(
      `
        INSERT OR REPLACE INTO plugin_literature_artifact_migration_sets
        (run_id, candidate_id, operation_id, ordinal, parent_ref_json, refs_json,
         basis_hash, classification, outcome, reason_codes_json, verified_count,
         unresolved_count, recovered_count, dropped_count, created_at, updated_at,
         diagnostics_json)
        VALUES (@run_id, @candidate_id, @operation_id, @ordinal, @parent_ref_json, @refs_json,
         @basis_hash, @classification, @outcome, @reason_codes_json,
         @verified_count, @unresolved_count, @recovered_count, @dropped_count,
         @created_at, @updated_at, @diagnostics_json)
      `,
      {
        run_id: runId,
        candidate_id: candidateId,
        operation_id: normalizeString(entry.operationId),
        ordinal: Math.max(0, Math.floor(Number(entry.ordinal) || 0)),
        parent_ref_json: normalizeString(entry.parentRef) || "{}",
        refs_json: jsonStringArray(entry.refs),
        basis_hash: normalizeString(entry.basisHash),
        classification: normalizeString(entry.classification),
        outcome: normalizeString(entry.outcome),
        reason_codes_json: jsonStringArray(entry.reasonCodes),
        verified_count: Math.max(
          0,
          Math.floor(Number(entry.verifiedCount) || 0),
        ),
        unresolved_count: Math.max(
          0,
          Math.floor(Number(entry.unresolvedCount) || 0),
        ),
        recovered_count: Math.max(
          0,
          Math.floor(Number(entry.recoveredCount) || 0),
        ),
        dropped_count: Math.max(0, Math.floor(Number(entry.droppedCount) || 0)),
        created_at: normalizeString(entry.createdAt) || nowIso(),
        updated_at: normalizeString(entry.updatedAt) || nowIso(),
        diagnostics_json: jsonStringArray(entry.diagnostics),
      },
    );
  }

  function getLiteratureArtifactMigrationSet(
    runIdRaw: string,
    candidateIdRaw: string,
  ) {
    const runId = normalizeString(runIdRaw);
    const candidateId = normalizeString(candidateIdRaw);
    if (!runId || !candidateId) return null;
    const row = getAdapter().get(
      `
        SELECT run_id, candidate_id, operation_id, ordinal, parent_ref_json, refs_json,
          basis_hash, classification, outcome, reason_codes_json, verified_count,
          unresolved_count, recovered_count, dropped_count, created_at, updated_at,
          diagnostics_json
        FROM plugin_literature_artifact_migration_sets
        WHERE run_id=@run_id AND candidate_id=@candidate_id
        LIMIT 1
      `,
      { run_id: runId, candidate_id: candidateId },
    );
    return row ? normalizeLiteratureArtifactMigrationSetRow(row) : null;
  }

  function listLiteratureArtifactMigrationSets(
    options: LiteratureArtifactMigrationSetListOptions,
  ) {
    const runId = normalizeString(options.runId);
    if (!runId) return [];
    const cursor = decodeMigrationCursor(options.cursor);
    const where = ["run_id=@run_id"];
    const params: SqlParams = { run_id: runId };
    if (cursor.ordinal) {
      where.push("ordinal > @cursor_ordinal");
      params.cursor_ordinal = cursor.ordinal;
    }
    const limit = Math.min(100, normalizeRowLimit(options.limit) || 50);
    params.limit = limit;
    const rows = getAdapter().all(
      `
        SELECT run_id, candidate_id, operation_id, ordinal, parent_ref_json, refs_json,
          basis_hash, classification, outcome, reason_codes_json, verified_count,
          unresolved_count, recovered_count, dropped_count, created_at, updated_at,
          diagnostics_json
        FROM plugin_literature_artifact_migration_sets
        WHERE ${where.join(" AND ")}
        ORDER BY ordinal ASC
        LIMIT @limit
      `,
      params,
    );
    return rows.map(normalizeLiteratureArtifactMigrationSetRow);
  }

  return {
    upsertLiteratureArtifactMigrationRun,
    getLiteratureArtifactMigrationRun,
    listLiteratureArtifactMigrationRuns,
    upsertLiteratureArtifactMigrationSet,
    getLiteratureArtifactMigrationSet,
    listLiteratureArtifactMigrationSets,
  };
}

import type {
  PluginMutationAuthorityEntry,
  PluginMutationAuthorityState,
  PluginMutationAuthorityStorageFaultForTests,
} from "../pluginStateStore";
import { normalizeString, nowIso, type SqlAdapter } from "./core";

export function ensureMutationAuthorityTableSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_mutation_authority (
      scope TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      semantic_digest TEXT NOT NULL,
      semantic_input_json TEXT NOT NULL,
      state TEXT NOT NULL,
      result_json TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      terminal_at TEXT NOT NULL DEFAULT '',
      last_accessed_at TEXT NOT NULL,
      PRIMARY KEY (scope, operation_id)
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_mutation_authority_state_terminal
      ON plugin_mutation_authority(state, terminal_at);
  `);
}

export function createMutationAuthorityTable(getAdapter: () => SqlAdapter) {
  let storageFaultForTests:
    | PluginMutationAuthorityStorageFaultForTests
    | undefined;

  function throwMutationAuthorityStorageFault(
    fault: PluginMutationAuthorityStorageFaultForTests,
  ) {
    if (storageFaultForTests === fault) {
      throw new Error(`plugin_mutation_authority_test_${fault}_failure`);
    }
  }

  function normalizePluginMutationAuthorityEntry(
    row: Record<string, unknown>,
  ): PluginMutationAuthorityEntry {
    const state = normalizeString(row.state);
    if (
      state !== "started" &&
      state !== "terminal" &&
      state !== "identity_only"
    ) {
      throw new Error("plugin_mutation_authority_state_invalid");
    }
    return {
      scope: normalizeString(row.scope),
      operationId: normalizeString(row.operation_id),
      operation: normalizeString(row.operation),
      semanticDigest: normalizeString(row.semantic_digest),
      semanticInput: normalizeString(row.semantic_input_json),
      state,
      result: normalizeString(row.result_json),
      createdAt: normalizeString(row.created_at),
      terminalAt: normalizeString(row.terminal_at),
      lastAccessedAt: normalizeString(row.last_accessed_at),
    };
  }

  function getPluginMutationAuthorityEntry(
    scopeRaw: string,
    operationIdRaw: string,
  ): PluginMutationAuthorityEntry | null {
    const scope = normalizeString(scopeRaw);
    const operationId = normalizeString(operationIdRaw);
    if (!scope || !operationId) {
      return null;
    }
    throwMutationAuthorityStorageFault("read");
    const row = getAdapter().get(
      `
        SELECT scope, operation_id, operation, semantic_digest,
          semantic_input_json, state, result_json, created_at, terminal_at,
          last_accessed_at
        FROM plugin_mutation_authority
        WHERE scope=@scope AND operation_id=@operation_id
        LIMIT 1
      `,
      { scope, operation_id: operationId },
    );
    return row ? normalizePluginMutationAuthorityEntry(row) : null;
  }

  function claimPluginMutationAuthorityEntry(
    entry: PluginMutationAuthorityEntry,
  ): { claimed: boolean; entry: PluginMutationAuthorityEntry } {
    const scope = normalizeString(entry.scope);
    const operationId = normalizeString(entry.operationId);
    const operation = normalizeString(entry.operation);
    const semanticDigest = normalizeString(entry.semanticDigest);
    const semanticInput = normalizeString(entry.semanticInput);
    const createdAt = normalizeString(entry.createdAt);
    const lastAccessedAt = normalizeString(entry.lastAccessedAt);
    if (
      !scope ||
      !operationId ||
      !operation ||
      !semanticDigest ||
      !semanticInput ||
      !createdAt ||
      !lastAccessedAt
    ) {
      throw new Error("plugin_mutation_authority_entry_invalid");
    }
    throwMutationAuthorityStorageFault("admission");
    const db = getAdapter();
    return db.transaction(() => {
      db.run(
        `
          INSERT OR IGNORE INTO plugin_mutation_authority
          (scope, operation_id, operation, semantic_digest, semantic_input_json,
            state, result_json, created_at, terminal_at, last_accessed_at)
          VALUES (@scope, @operation_id, @operation, @semantic_digest,
            @semantic_input_json, 'started', '', @created_at, '', @last_accessed_at)
        `,
        {
          scope,
          operation_id: operationId,
          operation,
          semantic_digest: semanticDigest,
          semantic_input_json: semanticInput,
          created_at: createdAt,
          last_accessed_at: lastAccessedAt,
        },
      );
      const changes = Number(db.get("SELECT changes() AS value")?.value);
      if (changes !== 0 && changes !== 1) {
        throw new Error("plugin_mutation_authority_admission_changes_invalid");
      }
      const persisted = getPluginMutationAuthorityEntry(scope, operationId);
      if (!persisted) {
        throw new Error("plugin_mutation_authority_admission_missing");
      }
      return { claimed: changes === 1, entry: persisted };
    });
  }

  function settlePluginMutationAuthorityEntry(args: {
    scope: string;
    operationId: string;
    result: string;
    terminalAt: string;
    lastAccessedAt: string;
    overwriteTerminal?: boolean;
  }) {
    const scope = normalizeString(args.scope);
    const operationId = normalizeString(args.operationId);
    const result = normalizeString(args.result);
    const terminalAt = normalizeString(args.terminalAt);
    const lastAccessedAt = normalizeString(args.lastAccessedAt);
    if (!scope || !operationId || !result || !terminalAt || !lastAccessedAt) {
      throw new Error("plugin_mutation_authority_terminal_invalid");
    }
    throwMutationAuthorityStorageFault("terminal");
    const db = getAdapter();
    db.run(
      `
        UPDATE plugin_mutation_authority
        SET state='terminal', result_json=@result_json, terminal_at=@terminal_at,
          last_accessed_at=@last_accessed_at
        WHERE scope=@scope AND operation_id=@operation_id
          ${args.overwriteTerminal ? "" : "AND state='started'"}
      `,
      {
        scope,
        operation_id: operationId,
        result_json: result,
        terminal_at: terminalAt,
        last_accessed_at: lastAccessedAt,
      },
    );
    const changes = Number(db.get("SELECT changes() AS value")?.value);
    if (changes !== 1) {
      throw new Error("plugin_mutation_authority_terminal_update_missing");
    }
  }

  function expirePluginMutationAuthorityEntryEvidence(args: {
    scope: string;
    operationId: string;
    lastAccessedAt: string;
  }) {
    const scope = normalizeString(args.scope);
    const operationId = normalizeString(args.operationId);
    const lastAccessedAt = normalizeString(args.lastAccessedAt);
    if (!scope || !operationId || !lastAccessedAt) {
      throw new Error("plugin_mutation_authority_expiry_invalid");
    }
    const db = getAdapter();
    db.run(
      `
        UPDATE plugin_mutation_authority
        SET state='identity_only', result_json='', last_accessed_at=@last_accessed_at
        WHERE scope=@scope AND operation_id=@operation_id AND state='terminal'
      `,
      { scope, operation_id: operationId, last_accessed_at: lastAccessedAt },
    );
    return getPluginMutationAuthorityEntry(scope, operationId);
  }

  function clearPluginMutationAuthorityEntriesForTests() {
    const db = getAdapter();
    db.run("DELETE FROM plugin_mutation_authority");
  }

  function configurePluginMutationAuthorityStorageFaultForTests(
    fault?: PluginMutationAuthorityStorageFaultForTests,
  ) {
    storageFaultForTests = fault;
  }

  return {
    getPluginMutationAuthorityEntry,
    claimPluginMutationAuthorityEntry,
    settlePluginMutationAuthorityEntry,
    expirePluginMutationAuthorityEntryEvidence,
    clearPluginMutationAuthorityEntriesForTests,
    configurePluginMutationAuthorityStorageFaultForTests,
  };
}

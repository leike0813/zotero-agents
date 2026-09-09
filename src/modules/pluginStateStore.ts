import { joinPath } from "../utils/path";
import { getPref, setPref } from "../utils/prefs";
import { getRuntimePersistencePaths } from "./runtimePersistence";
import {
  getGuardedSqliteConnection,
  resetGuardedSqliteForTests,
} from "./guardedSqlite";
import { isDiagnosticVerboseEnabled } from "./diagnosticVerbosity";
import {
  createPluginStateTestAdapter,
  normalizeString,
  type SqlAdapter,
  type SqlParams,
  type SqlPrimitive,
  type SqlRow,
} from "./pluginStateStore/core";
import {
  createRunTables,
  ensureRunTablesSchema,
} from "./pluginStateStore/runTables";
import {
  createTaskTables,
  ensureTaskTablesSchema,
} from "./pluginStateStore/taskTables";
import {
  createMutationAuthorityTable,
  ensureMutationAuthorityTableSchema,
} from "./pluginStateStore/mutationAuthorityTable";
import {
  createLiteratureMigrationTables,
  ensureLiteratureMigrationTablesSchema,
} from "./pluginStateStore/literatureMigrationTables";

export const PLUGIN_TASK_DOMAIN_SKILLRUNNER = "skillrunner";
export const PLUGIN_TASK_DOMAIN_ACP = "acp";
export const PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS = "workflow-products";
export const PLUGIN_TASK_DOMAIN_WORKFLOW_SEQUENCE = "workflow-sequence";
const RUN_STORE_RESET_META_KEY = "agent_run_separated_store_hard_cut_reset_v2";

export type PluginTaskRequestEntry = {
  requestId: string;
  backendId: string;
  state: string;
  updatedAt: string;
  payload: string;
};

export type PluginTaskContextEntry = {
  contextId: string;
  requestId: string;
  backendId: string;
  state: string;
  updatedAt: string;
  payload: string;
};

export type PluginTaskRowEntry = {
  taskId: string;
  requestId: string;
  backendId: string;
  state: string;
  updatedAt: string;
  payload: string;
};

export type PluginTaskRowListOptions = {
  backendId?: string;
  requestId?: string;
  states?: string[];
  excludeStates?: string[];
  limit?: number;
};

export type PluginTaskRowStateCount = {
  state: string;
  count: number;
};

export type PluginRunStoreKind = "acp" | "skillrunner";

export type PluginRunStoreEntry = {
  runKey: string;
  requestId: string;
  backendId: string;
  state: string;
  updatedAt: string;
  payload: string;
};

export type PluginRunStoreListOptions = {
  backendId?: string;
  requestId?: string;
  states?: string[];
  excludeStates?: string[];
  limit?: number;
};

export type WorkflowSequenceRunStoreEntry = {
  sequenceRunId: string;
  workflowRunId: string;
  workflowId: string;
  backendId: string;
  backendType: string;
  state: string;
  updatedAt: string;
  payload: string;
};

export type WorkflowSequenceRunStoreListOptions = {
  sequenceRunId?: string;
  workflowRunId?: string;
  backendId?: string;
  backendType?: string;
  states?: string[];
  excludeStates?: string[];
  limit?: number;
};

export type PluginRunEventStoreEntry = {
  eventId: string;
  runKey: string;
  requestId: string;
  backendId: string;
  type: string;
  createdAt: string;
  payload: string;
};

export type PluginMutationAuthorityState =
  | "started"
  | "terminal"
  | "identity_only";

export type PluginMutationAuthorityStorageFaultForTests =
  | "read"
  | "admission"
  | "terminal";

export type PluginMutationAuthorityEntry = {
  scope: string;
  operationId: string;
  operation: string;
  semanticDigest: string;
  semanticInput: string;
  state: PluginMutationAuthorityState;
  result: string;
  createdAt: string;
  terminalAt: string;
  lastAccessedAt: string;
};

/**
 * Private durable records for the Dashboard-local literature artifact
 * migration. These records intentionally contain only bounded refs, facts,
 * and receipts; the converted artifact payload remains in the host-owned
 * migration plan and is never copied into plugin state.
 */
export type LiteratureArtifactMigrationRunState =
  | "preview"
  | "applying"
  | "completed"
  | "completed_with_attention"
  | "failed";

export type LiteratureArtifactMigrationRunEntry = {
  runId: string;
  operationId: string;
  migrationId: string;
  definitionVersion: number;
  libraryId: string;
  state: LiteratureArtifactMigrationRunState;
  reason: string;
  processedCount: number;
  remainingCount: number;
  setCount: number;
  createdAt: string;
  updatedAt: string;
  terminalAt: string;
  diagnostics: string[];
};

export type LiteratureArtifactMigrationSetOutcome =
  | "preview"
  | "applied"
  | "skipped"
  | "changed_since_scan"
  | "repair_required"
  | "blocked"
  | "failed";

export type LiteratureArtifactMigrationSetEntry = {
  runId: string;
  candidateId: string;
  operationId: string;
  ordinal: number;
  parentRef: string;
  refs: string[];
  basisHash: string;
  classification: "ready" | "review_required" | "blocked";
  outcome: LiteratureArtifactMigrationSetOutcome;
  reasonCodes: string[];
  verifiedCount: number;
  unresolvedCount: number;
  recoveredCount: number;
  droppedCount: number;
  createdAt: string;
  updatedAt: string;
  diagnostics: string[];
};

export type LiteratureArtifactMigrationRunListOptions = {
  libraryId?: string | number;
  states?: LiteratureArtifactMigrationRunState[];
  limit?: number;
  cursor?: string;
};

export type LiteratureArtifactMigrationSetListOptions = {
  runId: string;
  limit?: number;
  cursor?: string;
};

const SQLITE_MIGRATION_META_KEY = "migration_task_state_v1";

let adapter: SqlAdapter | null = null;
let initialized = false;
function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSqlParam(value: unknown): SqlPrimitive {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return String(value);
}

function sqlFingerprint(sql: string) {
  return sql.replace(/\s+/g, " ").trim().slice(0, 240);
}

function collectNamedPlaceholders(sql: string) {
  const matches = sql.match(/[@:$]([A-Za-z_][A-Za-z0-9_]*)/g) || [];
  const names = new Set<string>();
  for (const raw of matches) {
    names.add(raw.slice(1));
  }
  return Array.from(names);
}

function collectPlaceholderSequence(sql: string) {
  const regex = /[@:$]([A-Za-z_][A-Za-z0-9_]*)/g;
  const result: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(sql)) !== null) {
    result.push(match[1]);
  }
  return result;
}

function buildStorageExecutionError(args: {
  operation: string;
  sql: string;
  placeholders: string[];
  params?: SqlParams;
  dbPath: string;
  cause: unknown;
}) {
  const paramKeys = Object.keys(args.params || {});
  const baseMessage =
    args.cause instanceof Error
      ? `${args.cause.name}: ${args.cause.message}`
      : String(args.cause || "unknown");
  const error = new Error(
    [
      "[pluginStateStore] storage execution failed",
      `operation=${args.operation}`,
      `dbPath=${args.dbPath}`,
      `sql=${sqlFingerprint(args.sql)}`,
      `placeholders=${JSON.stringify(args.placeholders)}`,
      `paramKeys=${JSON.stringify(paramKeys)}`,
      `cause=${baseMessage}`,
    ].join(" | "),
  );
  (error as Error & { cause?: unknown }).cause = args.cause;
  return error;
}

function logInfo(message: string, payload?: unknown) {
  if (!isDiagnosticVerboseEnabled()) {
    return;
  }
  const runtime = globalThis as {
    console?: {
      info?: (message?: unknown, ...optionalParams: unknown[]) => void;
    };
    Zotero?: { debug?: (message: string) => void };
  };
  if (runtime.console && typeof runtime.console.info === "function") {
    runtime.console.info(message, payload);
    return;
  }
  if (runtime.Zotero && typeof runtime.Zotero.debug === "function") {
    runtime.Zotero.debug(
      `${message}${typeof payload === "undefined" ? "" : ` ${JSON.stringify(payload)}`}`,
    );
  }
}

function logWarn(message: string, payload?: unknown) {
  const runtime = globalThis as {
    console?: {
      warn?: (message?: unknown, ...optionalParams: unknown[]) => void;
    };
    Zotero?: { debug?: (message: string) => void };
  };
  if (runtime.console && typeof runtime.console.warn === "function") {
    runtime.console.warn(message, payload);
    return;
  }
  if (runtime.Zotero && typeof runtime.Zotero.debug === "function") {
    runtime.Zotero.debug(
      `${message}${typeof payload === "undefined" ? "" : ` ${JSON.stringify(payload)}`}`,
    );
  }
}

function getDataDirectoryPath() {
  const runtime = globalThis as {
    Zotero?: { DataDirectory?: { dir?: string } };
    process?: { cwd?: () => string };
  };
  const dataDir = normalizeString(runtime.Zotero?.DataDirectory?.dir);
  if (dataDir) {
    return dataDir;
  }
  const cwd = runtime.process?.cwd?.();
  if (cwd) {
    return joinPath(cwd, ".zotero-agents");
  }
  return ".zotero-agents";
}

export function getPluginDataDirectoryPath() {
  return getDataDirectoryPath();
}

function ensureDirectoryZotero(targetDir: string) {
  const runtime = globalThis as {
    Zotero?: {
      File?: {
        pathToFile?: (path: string) => {
          path: string;
          parent?: any;
          exists?: () => boolean;
          create?: (type: number, permissions: number) => void;
        };
      };
    };
    Components?: { interfaces?: { nsIFile?: { DIRECTORY_TYPE?: number } } };
  };
  const file = runtime.Zotero?.File?.pathToFile?.(targetDir);
  if (!file) {
    throw new Error("Zotero.File.pathToFile is unavailable");
  }
  const ensureOne = (entry: any) => {
    if (!entry) {
      return;
    }
    if (typeof entry.exists === "function" && entry.exists()) {
      return;
    }
    ensureOne(entry.parent);
    const directoryType =
      runtime.Components?.interfaces?.nsIFile?.DIRECTORY_TYPE ?? 1;
    if (typeof entry.create === "function") {
      entry.create(directoryType, 0o755);
    }
  };
  ensureOne(file);
}

function getStateDirectoryPath() {
  return getRuntimePersistencePaths().stateDir;
}

export function getPluginStateDatabasePath() {
  return getRuntimePersistencePaths().stateDbPath;
}

function ensureStateDirectory() {
  const runtime = globalThis as {
    Services?: unknown;
    Zotero?: unknown;
  };
  const stateDir = getStateDirectoryPath();
  if (runtime.Services && runtime.Zotero) {
    ensureDirectoryZotero(stateDir);
  }
}

function buildZoteroAdapter(dbPath: string): SqlAdapter {
  const runtime = globalThis as {
    Services?: {
      storage?: {
        openDatabase?: (file: any) => any;
      };
    };
    Zotero?: {
      File?: {
        pathToFile?: (path: string) => any;
      };
    };
  };
  const file = runtime.Zotero?.File?.pathToFile?.(dbPath);
  const conn = getGuardedSqliteConnection({
    dbPath,
    file,
    storage: runtime.Services?.storage,
  });
  const bindParams = (statement: any, sql: string, params?: SqlParams) => {
    const placeholderSequence = collectPlaceholderSequence(sql);
    if (placeholderSequence.length === 0) {
      return;
    }
    if (!params) {
      throw new Error(
        `[pluginStateStore] missing SQL params for placeholders ${JSON.stringify(placeholderSequence)}`,
      );
    }
    for (let index = 0; index < placeholderSequence.length; index += 1) {
      const key = placeholderSequence[index];
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        throw new Error(
          `[pluginStateStore] missing SQL param "${key}" for ${sqlFingerprint(sql)}`,
        );
      }
      const normalized = normalizeSqlParam(params[key]);
      const bindValue = normalized === null ? "" : normalized;
      let bound = false;
      const bindByIndex = (
        statement as {
          bindByIndex?: (idx: number, value: SqlPrimitive) => void;
        }
      ).bindByIndex;
      if (typeof bindByIndex === "function") {
        try {
          bindByIndex.call(statement, index, bindValue);
          bound = true;
        } catch {
          // fall through to named binding fallbacks
        }
      }
      if (!bound) {
        const candidates = [key, `:${key}`, `@${key}`, `$${key}`];
        const bindByName = (
          statement as {
            bindByName?: (name: string, value: SqlPrimitive) => void;
          }
        ).bindByName;
        if (typeof bindByName === "function") {
          for (const name of candidates) {
            try {
              bindByName.call(statement, name, bindValue);
              bound = true;
              break;
            } catch {
              // try next candidate
            }
          }
        }
        if (!bound) {
          for (const name of candidates) {
            try {
              statement.params[name] = bindValue;
              bound = true;
              break;
            } catch {
              // try next candidate
            }
          }
        }
      }
      if (!bound) {
        throw new Error(
          `[pluginStateStore] failed to bind SQL param "${key}" for ${sqlFingerprint(sql)}`,
        );
      }
    }
  };
  const readValue = (statement: any, index: number) => {
    const type = Number(statement.getTypeOfIndex(index));
    switch (type) {
      case 0:
        return null;
      case 1:
        return statement.getInt64(index);
      case 2:
        return statement.getDouble(index);
      case 3:
        return statement.getUTF8String(index);
      default:
        return statement.getUTF8String(index);
    }
  };
  return {
    run(sql, params) {
      const placeholders = collectNamedPlaceholders(sql);
      try {
        conn.execute(() => {
          const statement = conn.createStatement(sql) as any;
          try {
            bindParams(statement, sql, params);
            statement.execute();
          } finally {
            statement.finalize();
          }
        });
      } catch (error) {
        throw buildStorageExecutionError({
          operation: "run.execute",
          sql,
          placeholders,
          params,
          dbPath,
          cause: error,
        });
      }
    },
    all(sql, params) {
      const placeholders = collectNamedPlaceholders(sql);
      try {
        return conn.execute(() => {
          const statement = conn.createStatement(sql) as any;
          try {
            bindParams(statement, sql, params);
            const rows: SqlRow[] = [];
            while (true) {
              const hasRow = statement.executeStep();
              if (!hasRow) {
                break;
              }
              const row: SqlRow = {};
              const count = Number(statement.columnCount || 0);
              for (let index = 0; index < count; index += 1) {
                const name = String(statement.getColumnName(index) || "");
                row[name] = readValue(statement, index);
              }
              rows.push(row);
            }
            return rows;
          } finally {
            statement.finalize();
          }
        });
      } catch (error) {
        throw buildStorageExecutionError({
          operation: "all.executeStep",
          sql,
          placeholders,
          params,
          dbPath,
          cause: error,
        });
      }
    },
    get(sql, params) {
      const rows = this.all(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },
    transaction(fn) {
      return conn.transaction(fn);
    },
  };
}

function resolveAdapter() {
  const runtime = globalThis as {
    Services?: unknown;
    Zotero?: unknown;
  };
  const dbPath = getPluginStateDatabasePath();
  ensureStateDirectory();
  if (runtime.Services && runtime.Zotero) {
    return buildZoteroAdapter(dbPath);
  }
  return createPluginStateTestAdapter();
}

function ensureSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  ensureTaskTablesSchema(db);
  ensureRunTablesSchema(db);
  ensureMutationAuthorityTableSchema(db);
  ensureLiteratureMigrationTablesSchema(db);
}

function parseLegacyDocument(rawValue: string) {
  const raw = normalizeString(rawValue);
  if (!raw) {
    return [] as unknown[];
  }
  try {
    const parsed = JSON.parse(raw) as unknown[] | { records?: unknown };
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray((parsed as { records?: unknown }).records)) {
      return (parsed as { records: unknown[] }).records;
    }
  } catch {
    return [] as unknown[];
  }
  return [] as unknown[];
}

function migrateLegacyPrefsIntoSqlite(db: SqlAdapter) {
  const migrated = db.get("SELECT value FROM plugin_meta WHERE key=@meta_key", {
    meta_key: SQLITE_MIGRATION_META_KEY,
  });
  if (normalizeString(migrated?.value) === "done") {
    return;
  }

  const requestRows = parseLegacyDocument(
    String(getPref("skillRunnerRequestLedgerJson") || ""),
  );
  const contextRows = parseLegacyDocument(
    String(getPref("skillRunnerDeferredTasksJson") || ""),
  );
  const historyRows = parseLegacyDocument(
    String(getPref("taskDashboardHistoryJson") || ""),
  );
  const invalidReasons: string[] = [];
  const counters = {
    requestTotal: requestRows.length,
    requestInserted: 0,
    requestSkipped: 0,
    contextTotal: contextRows.length,
    contextInserted: 0,
    contextSkipped: 0,
    historyTotal: historyRows.length,
    historyInserted: 0,
    historySkipped: 0,
  };

  logInfo("[pluginStateStore] migration-start", {
    requestTotal: counters.requestTotal,
    contextTotal: counters.contextTotal,
    historyTotal: counters.historyTotal,
  });
  db.transaction(() => {
    db.run("DELETE FROM plugin_task_requests WHERE domain=@domain", {
      domain: PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    });
    counters.requestSkipped = requestRows.length;

    db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", {
      domain: PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    });
    counters.contextSkipped = contextRows.length;

    db.run(
      "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope",
      { domain: PLUGIN_TASK_DOMAIN_SKILLRUNNER, scope: "history" },
    );
    counters.historySkipped = historyRows.length;

    logInfo("[pluginStateStore] migration-before-meta-write");
    db.run(
      `
        INSERT OR REPLACE INTO plugin_meta(key, value)
        VALUES (@meta_key, @meta_value)
      `,
      {
        meta_key: SQLITE_MIGRATION_META_KEY,
        meta_value: "done",
      },
    );
    logInfo("[pluginStateStore] migration-after-meta-write");
  });

  setPref("skillRunnerRequestLedgerJson", "");
  setPref("skillRunnerDeferredTasksJson", "");
  setPref("taskDashboardHistoryJson", "");
  if (invalidReasons.length > 0) {
    logWarn("[pluginStateStore] migration-invalid-rows", {
      sample: invalidReasons.slice(0, 20),
      total: invalidReasons.length,
    });
  }
  logInfo("[pluginStateStore] migration-finished", counters);
}

function resetLegacySeparatedAgentRunStateIfNeeded(db: SqlAdapter) {
  const reset = db.get("SELECT value FROM plugin_meta WHERE key=@meta_key", {
    meta_key: RUN_STORE_RESET_META_KEY,
  });
  if (normalizeString(reset?.value) === "done") {
    return;
  }
  db.transaction(() => {
    db.run("DELETE FROM plugin_task_requests WHERE domain=@domain", {
      domain: PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    });
    db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", {
      domain: PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    });
    db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", {
      domain: PLUGIN_TASK_DOMAIN_WORKFLOW_SEQUENCE,
    });
    db.run("DELETE FROM plugin_task_rows WHERE domain=@domain", {
      domain: PLUGIN_TASK_DOMAIN_SKILLRUNNER,
    });
    db.run(
      "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope",
      { domain: PLUGIN_TASK_DOMAIN_ACP, scope: "skill-runs" },
    );
    db.run(
      `
        INSERT OR REPLACE INTO plugin_meta(key, value)
        VALUES (@meta_key, @meta_value)
      `,
      {
        meta_key: RUN_STORE_RESET_META_KEY,
        meta_value: "done",
      },
    );
  });
  logInfo("[pluginStateStore] separated agent run legacy state reset");
}

function getAdapter() {
  if (!adapter) {
    adapter = resolveAdapter();
  }
  if (!initialized) {
    try {
      ensureSchema(adapter);
      const schemaProbe = adapter.get(
        "SELECT COUNT(*) AS value FROM plugin_meta",
      );
      if (schemaProbe === null || typeof schemaProbe.value === "undefined") {
        throw new Error(
          "[pluginStateStore] schema probe failed for plugin_meta",
        );
      }
      migrateLegacyPrefsIntoSqlite(adapter);
      resetLegacySeparatedAgentRunStateIfNeeded(adapter);
      const migrationProbe = adapter.get(
        "SELECT value FROM plugin_meta WHERE key=@meta_key",
        { meta_key: SQLITE_MIGRATION_META_KEY },
      );
      if (normalizeString(migrationProbe?.value) !== "done") {
        throw new Error(
          "[pluginStateStore] migration status probe failed: migration_task_state_v1 is not done",
        );
      }
      initialized = true;
    } catch (error) {
      throw buildStorageExecutionError({
        operation: "getAdapter.initialize",
        sql: "schema+migration startup sequence",
        placeholders: [],
        params: {},
        dbPath: getPluginStateDatabasePath(),
        cause: error,
      });
    }
  }
  return adapter;
}

const {
  listPluginRunStoreEntries,
  listPluginRunStoreEntriesFiltered,
  getPluginRunStoreEntry,
  getPluginRunStoreEntryByRequest,
  upsertPluginRunStoreEntry,
  deletePluginRunStoreEntry,
  listWorkflowSequenceRunStoreEntries,
  getWorkflowSequenceRunStoreEntry,
  upsertWorkflowSequenceRunStoreEntry,
  deleteWorkflowSequenceRunStoreEntry,
  clearPluginRunStore,
  countPluginRunStore,
  estimatePluginRunStoreBytes,
  appendPluginRunEventStoreEntry,
  listPluginRunEventStoreEntries,
} = createRunTables(getAdapter);

export {
  listPluginRunStoreEntries,
  listPluginRunStoreEntriesFiltered,
  getPluginRunStoreEntry,
  getPluginRunStoreEntryByRequest,
  upsertPluginRunStoreEntry,
  deletePluginRunStoreEntry,
  listWorkflowSequenceRunStoreEntries,
  getWorkflowSequenceRunStoreEntry,
  upsertWorkflowSequenceRunStoreEntry,
  deleteWorkflowSequenceRunStoreEntry,
  clearPluginRunStore,
  countPluginRunStore,
  estimatePluginRunStoreBytes,
  appendPluginRunEventStoreEntry,
  listPluginRunEventStoreEntries,
};

const {
  listPluginTaskRequestEntries,
  getPluginTaskRequestEntry,
  upsertPluginTaskRequestEntry,
  replacePluginTaskRequestEntries,
  deletePluginTaskRequestEntry,
  deletePluginTaskRequestEntriesByBackend,
  listPluginTaskContextEntries,
  getPluginTaskContextEntry,
  compareAndSetPluginTaskContextEntry,
  deletePluginTaskContextDomain,
  upsertPluginTaskContextEntry,
  replacePluginTaskContextEntries,
  deletePluginTaskContextEntry,
  deletePluginTaskContextEntriesByBackend,
  listPluginTaskRowEntries,
  getPluginTaskRowEntry,
  listPluginTaskRowEntriesFiltered,
  countPluginTaskRowStates,
  upsertPluginTaskRowEntry,
  replacePluginTaskRowEntries,
  clearPluginTaskRowEntries,
  deletePluginTaskRowEntry,
  deletePluginTaskRowEntriesByBackend,
  clearPluginTaskDomain,
  countPluginTaskDomain,
  estimatePluginTaskDomainBytes,
  clearPluginTaskDomainExceptRowScopes,
  countPluginTaskDomainExceptRowScopes,
  estimatePluginTaskDomainExceptRowScopesBytes,
  clearAcpConversationTaskRecords,
  countAcpConversationTaskRecords,
  estimateAcpConversationTaskRecordsBytes,
  clearPluginTaskScope,
  countPluginTaskScope,
  estimatePluginTaskScopeBytes,
} = createTaskTables(getAdapter);

export {
  listPluginTaskRequestEntries,
  getPluginTaskRequestEntry,
  upsertPluginTaskRequestEntry,
  replacePluginTaskRequestEntries,
  deletePluginTaskRequestEntry,
  deletePluginTaskRequestEntriesByBackend,
  listPluginTaskContextEntries,
  getPluginTaskContextEntry,
  compareAndSetPluginTaskContextEntry,
  deletePluginTaskContextDomain,
  upsertPluginTaskContextEntry,
  replacePluginTaskContextEntries,
  deletePluginTaskContextEntry,
  deletePluginTaskContextEntriesByBackend,
  listPluginTaskRowEntries,
  getPluginTaskRowEntry,
  listPluginTaskRowEntriesFiltered,
  countPluginTaskRowStates,
  upsertPluginTaskRowEntry,
  replacePluginTaskRowEntries,
  clearPluginTaskRowEntries,
  deletePluginTaskRowEntry,
  deletePluginTaskRowEntriesByBackend,
  clearPluginTaskDomain,
  countPluginTaskDomain,
  estimatePluginTaskDomainBytes,
  clearPluginTaskDomainExceptRowScopes,
  countPluginTaskDomainExceptRowScopes,
  estimatePluginTaskDomainExceptRowScopesBytes,
  clearAcpConversationTaskRecords,
  countAcpConversationTaskRecords,
  estimateAcpConversationTaskRecordsBytes,
  clearPluginTaskScope,
  countPluginTaskScope,
  estimatePluginTaskScopeBytes,
};

const {
  getPluginMutationAuthorityEntry,
  claimPluginMutationAuthorityEntry,
  settlePluginMutationAuthorityEntry,
  expirePluginMutationAuthorityEntryEvidence,
  clearPluginMutationAuthorityEntriesForTests,
  configurePluginMutationAuthorityStorageFaultForTests,
} = createMutationAuthorityTable(getAdapter);

export {
  getPluginMutationAuthorityEntry,
  claimPluginMutationAuthorityEntry,
  settlePluginMutationAuthorityEntry,
  expirePluginMutationAuthorityEntryEvidence,
  clearPluginMutationAuthorityEntriesForTests,
  configurePluginMutationAuthorityStorageFaultForTests,
};

const {
  upsertLiteratureArtifactMigrationRun,
  getLiteratureArtifactMigrationRun,
  listLiteratureArtifactMigrationRuns,
  upsertLiteratureArtifactMigrationSet,
  getLiteratureArtifactMigrationSet,
  listLiteratureArtifactMigrationSets,
} = createLiteratureMigrationTables(getAdapter);

export {
  upsertLiteratureArtifactMigrationRun,
  getLiteratureArtifactMigrationRun,
  listLiteratureArtifactMigrationRuns,
  upsertLiteratureArtifactMigrationSet,
  getLiteratureArtifactMigrationSet,
  listLiteratureArtifactMigrationSets,
};

export function resetPluginStateStoreForTests() {
  resetGuardedSqliteForTests();
  if (adapter) {
    const db = getAdapter();
    db.run("DELETE FROM plugin_task_requests");
    db.run("DELETE FROM plugin_task_contexts");
    db.run("DELETE FROM plugin_task_rows");
    db.run("DELETE FROM plugin_acp_skill_run_events");
    db.run("DELETE FROM plugin_acp_skill_runs");
    db.run("DELETE FROM plugin_skillrunner_run_events");
    db.run("DELETE FROM plugin_skillrunner_runs");
    db.run("DELETE FROM plugin_workflow_sequence_runs");
    db.run("DELETE FROM plugin_mutation_authority");
    db.run("DELETE FROM plugin_literature_artifact_migration_sets");
    db.run("DELETE FROM plugin_literature_artifact_migration_runs");
    db.run("DELETE FROM plugin_meta");
  }
  configurePluginMutationAuthorityStorageFaultForTests(undefined);
  adapter?.close?.();
  adapter = null;
  initialized = false;
}

export function getPluginStateMigrationStatus() {
  const db = getAdapter();
  const row = db.get("SELECT value FROM plugin_meta WHERE key=@meta_key", {
    meta_key: SQLITE_MIGRATION_META_KEY,
  });
  return normalizeString(row?.value);
}

export function getPluginMetaValue(keyRaw: string) {
  const key = normalizeString(keyRaw);
  if (!key) {
    return "";
  }
  const db = getAdapter();
  const row = db.get("SELECT value FROM plugin_meta WHERE key=@meta_key", {
    meta_key: key,
  });
  return normalizeString(row?.value);
}

export function setPluginMetaValue(keyRaw: string, valueRaw: string) {
  const key = normalizeString(keyRaw);
  if (!key) {
    return;
  }
  const db = getAdapter();
  db.run(
    `
      INSERT OR REPLACE INTO plugin_meta(key, value)
      VALUES (@meta_key, @meta_value)
    `,
    {
      meta_key: key,
      meta_value: normalizeString(valueRaw),
    },
  );
}

export function inspectPluginStateStoreCounts() {
  const db = getAdapter();
  const requestCount = Number(
    db.get("SELECT COUNT(*) AS value FROM plugin_task_requests")?.value || 0,
  );
  const contextCount = Number(
    db.get("SELECT COUNT(*) AS value FROM plugin_task_contexts")?.value || 0,
  );
  const rowCount = Number(
    db.get("SELECT COUNT(*) AS value FROM plugin_task_rows")?.value || 0,
  );
  const acpRunCount = Number(
    db.get("SELECT COUNT(*) AS value FROM plugin_acp_skill_runs")?.value || 0,
  );
  const skillRunnerRunCount = Number(
    db.get("SELECT COUNT(*) AS value FROM plugin_skillrunner_runs")?.value || 0,
  );
  const workflowSequenceRunCount = Number(
    db.get("SELECT COUNT(*) AS value FROM plugin_workflow_sequence_runs")
      ?.value || 0,
  );
  const literatureMigrationRunCount = Number(
    db.get(
      "SELECT COUNT(*) AS value FROM plugin_literature_artifact_migration_runs",
    )?.value || 0,
  );
  const literatureMigrationSetCount = Number(
    db.get(
      "SELECT COUNT(*) AS value FROM plugin_literature_artifact_migration_sets",
    )?.value || 0,
  );
  return {
    requestCount: Number.isFinite(requestCount) ? requestCount : 0,
    contextCount: Number.isFinite(contextCount) ? contextCount : 0,
    rowCount: Number.isFinite(rowCount) ? rowCount : 0,
    acpRunCount: Number.isFinite(acpRunCount) ? acpRunCount : 0,
    skillRunnerRunCount: Number.isFinite(skillRunnerRunCount)
      ? skillRunnerRunCount
      : 0,
    workflowSequenceRunCount: Number.isFinite(workflowSequenceRunCount)
      ? workflowSequenceRunCount
      : 0,
    literatureMigrationRunCount: Number.isFinite(literatureMigrationRunCount)
      ? literatureMigrationRunCount
      : 0,
    literatureMigrationSetCount: Number.isFinite(literatureMigrationSetCount)
      ? literatureMigrationSetCount
      : 0,
  };
}

export function exportPluginStateStoreRowsForTests() {
  const db = getAdapter();
  return {
    requests: db.all(
      `
        SELECT domain, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_requests
        ORDER BY domain, request_id
      `,
    ),
    contexts: db.all(
      `
        SELECT domain, context_id, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_contexts
        ORDER BY domain, context_id
      `,
    ),
    rows: db.all(
      `
        SELECT domain, scope, task_id, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_task_rows
        ORDER BY domain, scope, task_id
      `,
    ),
    acpRuns: db.all(
      `
        SELECT run_key, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_acp_skill_runs
        ORDER BY run_key
      `,
    ),
    acpRunEvents: db.all(
      `
        SELECT event_id, run_key, request_id, backend_id, type, created_at, payload_json
        FROM plugin_acp_skill_run_events
        ORDER BY event_id
      `,
    ),
    skillRunnerRuns: db.all(
      `
        SELECT run_key, request_id, backend_id, state, updated_at, payload_json
        FROM plugin_skillrunner_runs
        ORDER BY run_key
      `,
    ),
    skillRunnerRunEvents: db.all(
      `
        SELECT event_id, run_key, request_id, backend_id, type, created_at, payload_json
        FROM plugin_skillrunner_run_events
        ORDER BY event_id
      `,
    ),
    workflowSequenceRuns: db.all(
      `
        SELECT sequence_run_id, workflow_run_id, workflow_id, backend_id, backend_type, state, updated_at, payload_json
        FROM plugin_workflow_sequence_runs
        ORDER BY sequence_run_id
      `,
    ),
    literatureMigrationRuns: db.all(
      `
        SELECT run_id, operation_id, migration_id, definition_version,
          library_id, state, reason, processed_count, remaining_count,
          set_count, created_at, updated_at, terminal_at, diagnostics_json
        FROM plugin_literature_artifact_migration_runs
        ORDER BY run_id
      `,
    ),
    literatureMigrationSets: db.all(
      `
        SELECT run_id, candidate_id, operation_id, ordinal, parent_ref_json, refs_json,
          basis_hash, classification, outcome, reason_codes_json,
          verified_count, unresolved_count, recovered_count, dropped_count,
          created_at, updated_at, diagnostics_json
        FROM plugin_literature_artifact_migration_sets
        ORDER BY run_id, ordinal
      `,
    ),
  };
}

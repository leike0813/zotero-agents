import { joinPath } from "../utils/path";
import { getPref, setPref } from "../utils/prefs";
import {
  getRuntimePersistencePaths,
  registerPluginTaskDomainByteEstimator,
  registerPluginTaskDomainClearer,
  registerPluginTaskDomainExceptRowScopesClearer,
  registerPluginTaskDomainExceptRowScopesByteEstimator,
  registerPluginTaskDomainCounter,
  registerPluginTaskDomainExceptRowScopesCounter,
  registerPluginRunStoreByteEstimator,
  registerPluginRunStoreClearer,
  registerPluginRunStoreCounter,
  registerPluginTaskScopeByteEstimator,
  registerPluginTaskScopeClearer,
  registerPluginTaskScopeCounter,
} from "./runtimePersistence";
import {
  getGuardedSqliteConnection,
  resetGuardedSqliteForTests,
} from "./guardedSqlite";
import { isDiagnosticVerboseEnabled } from "./diagnosticVerbosity";

type SqlPrimitive = string | number | null;
type SqlParams = Record<string, SqlPrimitive>;
type SqlRow = Record<string, unknown>;

type SqlAdapter = {
  run: (sql: string, params?: SqlParams) => void;
  all: (sql: string, params?: SqlParams) => SqlRow[];
  get: (sql: string, params?: SqlParams) => SqlRow | null;
  transaction: <T>(fn: () => T) => T;
};

type PluginTaskScope =
  | "active"
  | "history"
  | "skill-runs"
  | "products"
  | "synthesis-update-events"
  | "synthesis-update-state";

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

export type PluginRunEventStoreEntry = {
  eventId: string;
  runKey: string;
  requestId: string;
  backendId: string;
  type: string;
  createdAt: string;
  payload: string;
};

const SQLITE_MIGRATION_META_KEY = "migration_task_state_v1";

let adapter: SqlAdapter | null = null;
let initialized = false;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

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

function migrateLegacyStateDatabaseIfNeeded() {
  // Legacy database migration is now handled only by the explicit one-shot
  // persistence migration script. Runtime startup must not silently read or copy
  // the old zotero-skills state database.
}

function ensureStateDirectory() {
  const runtime = globalThis as {
    Services?: unknown;
    Zotero?: unknown;
  };
  const stateDir = getStateDirectoryPath();
  if (runtime.Services && runtime.Zotero) {
    ensureDirectoryZotero(stateDir);
    migrateLegacyStateDatabaseIfNeeded();
  }
}

type MemoryTables = {
  meta: Map<string, { key: string; value: string }>;
  requests: Map<
    string,
    {
      domain: string;
      request_id: string;
      backend_id: string;
      state: string;
      updated_at: string;
      payload_json: string;
    }
  >;
  contexts: Map<
    string,
    {
      domain: string;
      context_id: string;
      request_id: string;
      backend_id: string;
      state: string;
      updated_at: string;
      payload_json: string;
    }
  >;
  rows: Map<
    string,
    {
      domain: string;
      scope: string;
      task_id: string;
      request_id: string;
      backend_id: string;
      state: string;
      updated_at: string;
      payload_json: string;
    }
  >;
  acpRuns: Map<
    string,
    {
      run_key: string;
      request_id: string;
      backend_id: string;
      state: string;
      updated_at: string;
      payload_json: string;
    }
  >;
  acpRunEvents: Map<
    string,
    {
      event_id: string;
      run_key: string;
      request_id: string;
      backend_id: string;
      type: string;
      created_at: string;
      payload_json: string;
    }
  >;
  skillRunnerRuns: Map<
    string,
    {
      run_key: string;
      request_id: string;
      backend_id: string;
      state: string;
      updated_at: string;
      payload_json: string;
    }
  >;
  skillRunnerRunEvents: Map<
    string,
    {
      event_id: string;
      run_key: string;
      request_id: string;
      backend_id: string;
      type: string;
      created_at: string;
      payload_json: string;
    }
  >;
};

const memoryTables: MemoryTables = {
  meta: new Map(),
  requests: new Map(),
  contexts: new Map(),
  rows: new Map(),
  acpRuns: new Map(),
  acpRunEvents: new Map(),
  skillRunnerRuns: new Map(),
  skillRunnerRunEvents: new Map(),
};

function requestKey(domain: string, requestId: string) {
  return `${domain}::${requestId}`;
}

function contextKey(domain: string, contextId: string) {
  return `${domain}::${contextId}`;
}

function rowKey(domain: string, scope: string, taskId: string) {
  return `${domain}::${scope}::${taskId}`;
}

function memoryRunTablesFromSql(normalizedSql: string) {
  if (normalizedSql.includes("plugin_acp_skill_run_events")) {
    return { runs: memoryTables.acpRuns, events: memoryTables.acpRunEvents };
  }
  if (normalizedSql.includes("plugin_acp_skill_runs")) {
    return { runs: memoryTables.acpRuns, events: memoryTables.acpRunEvents };
  }
  if (normalizedSql.includes("plugin_skillrunner_run_events")) {
    return {
      runs: memoryTables.skillRunnerRuns,
      events: memoryTables.skillRunnerRunEvents,
    };
  }
  if (normalizedSql.includes("plugin_skillrunner_runs")) {
    return {
      runs: memoryTables.skillRunnerRuns,
      events: memoryTables.skillRunnerRunEvents,
    };
  }
  return null;
}

function byUpdatedDesc<T extends { updated_at: string }>(rows: T[]) {
  return rows.sort((left, right) =>
    String(right.updated_at || "").localeCompare(String(left.updated_at || "")),
  );
}

function buildMemoryAdapter(): SqlAdapter {
  return {
    run(sql, params = {}) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim().toLowerCase();
      if (
        normalizedSql.startsWith("create table") ||
        normalizedSql.startsWith("create index") ||
        normalizedSql.startsWith("pragma")
      ) {
        return;
      }
      if (normalizedSql.startsWith("insert or replace into plugin_meta")) {
        const key = normalizeString(params.meta_key);
        if (!key) {
          return;
        }
        memoryTables.meta.set(key, {
          key,
          value: normalizeString(params.meta_value),
        });
        return;
      }
      if (normalizedSql.startsWith("delete from plugin_meta")) {
        if (normalizedSql.includes("where key=@meta_key")) {
          memoryTables.meta.delete(normalizeString(params.meta_key));
          return;
        }
        memoryTables.meta.clear();
        return;
      }
      const runTables = memoryRunTablesFromSql(normalizedSql);
      if (
        runTables &&
        normalizedSql.startsWith("insert or replace into") &&
        normalizedSql.includes("_run_events")
      ) {
        const eventId = normalizeString(params.event_id);
        if (!eventId) {
          return;
        }
        runTables.events.set(eventId, {
          event_id: eventId,
          run_key: normalizeString(params.run_key),
          request_id: normalizeString(params.request_id),
          backend_id: normalizeString(params.backend_id),
          type: normalizeString(params.type),
          created_at: normalizeString(params.created_at),
          payload_json: normalizeString(params.payload_json) || "{}",
        });
        return;
      }
      if (
        runTables &&
        normalizedSql.startsWith("insert or replace into") &&
        normalizedSql.includes("_runs")
      ) {
        const runKey = normalizeString(params.run_key);
        if (!runKey) {
          return;
        }
        runTables.runs.set(runKey, {
          run_key: runKey,
          request_id: normalizeString(params.request_id),
          backend_id: normalizeString(params.backend_id),
          state: normalizeString(params.state),
          updated_at: normalizeString(params.updated_at),
          payload_json: normalizeString(params.payload_json) || "{}",
        });
        return;
      }
      if (runTables && normalizedSql.startsWith("delete from")) {
        if (normalizedSql.includes("_run_events")) {
          const eventId = normalizeString(params.event_id);
          const runKey = normalizeString(params.run_key);
          if (!eventId && !runKey) {
            runTables.events.clear();
            return;
          }
          for (const [key, row] of runTables.events.entries()) {
            if (eventId && row.event_id !== eventId) {
              continue;
            }
            if (runKey && row.run_key !== runKey) {
              continue;
            }
            runTables.events.delete(key);
          }
          return;
        }
        const runKey = normalizeString(params.run_key);
        const requestId = normalizeString(params.request_id);
        const backendId = normalizeString(params.backend_id);
        if (!runKey && !requestId && !backendId) {
          runTables.runs.clear();
          return;
        }
        for (const [key, row] of runTables.runs.entries()) {
          if (runKey && row.run_key !== runKey) {
            continue;
          }
          if (requestId && row.request_id !== requestId) {
            continue;
          }
          if (backendId && row.backend_id !== backendId) {
            continue;
          }
          runTables.runs.delete(key);
        }
        return;
      }
      if (
        normalizedSql.startsWith("insert or replace into plugin_task_requests")
      ) {
        const domain = normalizeString(params.domain);
        const requestId = normalizeString(params.request_id);
        if (!domain || !requestId) {
          return;
        }
        memoryTables.requests.set(requestKey(domain, requestId), {
          domain,
          request_id: requestId,
          backend_id: normalizeString(params.backend_id),
          state: normalizeString(params.state),
          updated_at: normalizeString(params.updated_at),
          payload_json: normalizeString(params.payload_json) || "{}",
        });
        return;
      }
      if (normalizedSql.startsWith("delete from plugin_task_requests")) {
        const domain = normalizeString(params.domain);
        if (!domain) {
          memoryTables.requests.clear();
          return;
        }
        const requestId = normalizeString(params.request_id);
        const backendId = normalizeString(params.backend_id);
        for (const [key, row] of memoryTables.requests.entries()) {
          if (row.domain !== domain) {
            continue;
          }
          if (requestId && row.request_id !== requestId) {
            continue;
          }
          if (backendId && row.backend_id !== backendId) {
            continue;
          }
          memoryTables.requests.delete(key);
        }
        return;
      }
      if (
        normalizedSql.startsWith("insert or replace into plugin_task_contexts")
      ) {
        const domain = normalizeString(params.domain);
        const contextId = normalizeString(params.context_id);
        if (!domain || !contextId) {
          return;
        }
        memoryTables.contexts.set(contextKey(domain, contextId), {
          domain,
          context_id: contextId,
          request_id: normalizeString(params.request_id),
          backend_id: normalizeString(params.backend_id),
          state: normalizeString(params.state),
          updated_at: normalizeString(params.updated_at),
          payload_json: normalizeString(params.payload_json) || "{}",
        });
        return;
      }
      if (normalizedSql.startsWith("delete from plugin_task_contexts")) {
        const domain = normalizeString(params.domain);
        const contextId = normalizeString(params.context_id);
        for (const [key, row] of memoryTables.contexts.entries()) {
          if (domain && row.domain !== domain) {
            continue;
          }
          if (contextId && row.context_id !== contextId) {
            continue;
          }
          memoryTables.contexts.delete(key);
        }
        return;
      }
      if (normalizedSql.startsWith("insert or replace into plugin_task_rows")) {
        const domain = normalizeString(params.domain);
        const scope = normalizeString(params.scope);
        const taskId = normalizeString(params.task_id);
        if (!domain || !scope || !taskId) {
          return;
        }
        memoryTables.rows.set(rowKey(domain, scope, taskId), {
          domain,
          scope,
          task_id: taskId,
          request_id: normalizeString(params.request_id),
          backend_id: normalizeString(params.backend_id),
          state: normalizeString(params.state),
          updated_at: normalizeString(params.updated_at),
          payload_json: normalizeString(params.payload_json) || "{}",
        });
        return;
      }
      if (normalizedSql.startsWith("delete from plugin_task_rows")) {
        const domain = normalizeString(params.domain);
        const scope = normalizeString(params.scope);
        const taskId = normalizeString(params.task_id);
        const requestId = normalizeString(params.request_id);
        const backendId = normalizeString(params.backend_id);
        for (const [key, row] of memoryTables.rows.entries()) {
          if (domain && row.domain !== domain) {
            continue;
          }
          if (scope && row.scope !== scope) {
            continue;
          }
          if (taskId && row.task_id !== taskId) {
            continue;
          }
          if (requestId && row.request_id !== requestId) {
            continue;
          }
          if (backendId && row.backend_id !== backendId) {
            continue;
          }
          memoryTables.rows.delete(key);
        }
        return;
      }
    },
    all(sql, params = {}) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim().toLowerCase();
      const runTables = memoryRunTablesFromSql(normalizedSql);
      if (runTables && normalizedSql.includes("_run_events")) {
        const runKey = normalizeString(params.run_key);
        const rows = Array.from(runTables.events.values()).filter((row) => {
          if (runKey && row.run_key !== runKey) {
            return false;
          }
          return true;
        });
        return rows
          .sort((left, right) =>
            String(right.created_at || "").localeCompare(
              String(left.created_at || ""),
            ),
          )
          .map((row) => ({ ...row }));
      }
      if (runTables && normalizedSql.includes("_runs")) {
        const runKey = normalizeString(params.run_key);
        const requestId = normalizeString(params.request_id);
        const backendId = normalizeString(params.backend_id);
        const stateSet = new Set(
          Object.entries(params)
            .filter(([key]) => /^state_\d+$/.test(key))
            .map(([, value]) => normalizeString(value))
            .filter(Boolean),
        );
        const excludedStateSet = new Set(
          Object.entries(params)
            .filter(([key]) => /^exclude_state_\d+$/.test(key))
            .map(([, value]) => normalizeString(value))
            .filter(Boolean),
        );
        const limit =
          typeof params.limit === "number" && Number.isFinite(params.limit)
            ? Math.max(0, Math.floor(params.limit))
            : 0;
        const rows = Array.from(runTables.runs.values()).filter((row) => {
          if (runKey && row.run_key !== runKey) {
            return false;
          }
          if (requestId && row.request_id !== requestId) {
            return false;
          }
          if (backendId && row.backend_id !== backendId) {
            return false;
          }
          if (stateSet.size > 0 && !stateSet.has(row.state)) {
            return false;
          }
          if (excludedStateSet.has(row.state)) {
            return false;
          }
          return true;
        });
        const sorted = byUpdatedDesc(rows);
        return (limit ? sorted.slice(0, limit) : sorted).map((row) => ({
          ...row,
        }));
      }
      if (normalizedSql.includes("from plugin_task_requests")) {
        const domain = normalizeString(params.domain);
        const requestId = normalizeString(params.request_id);
        const rows = Array.from(memoryTables.requests.values()).filter(
          (row) => {
            if (domain && row.domain !== domain) {
              return false;
            }
            if (requestId && row.request_id !== requestId) {
              return false;
            }
            return true;
          },
        );
        return byUpdatedDesc(rows).map((row) => ({ ...row }));
      }
      if (normalizedSql.includes("from plugin_task_contexts")) {
        const domain = normalizeString(params.domain);
        const contextId = normalizeString(params.context_id);
        const rows = Array.from(memoryTables.contexts.values()).filter(
          (row) => {
            if (domain && row.domain !== domain) {
              return false;
            }
            if (contextId && row.context_id !== contextId) {
              return false;
            }
            return true;
          },
        );
        return byUpdatedDesc(rows).map((row) => ({ ...row }));
      }
      if (
        normalizedSql.startsWith("select state, count(*) as value") &&
        normalizedSql.includes("from plugin_task_rows")
      ) {
        const domain = normalizeString(params.domain);
        const scope = normalizeString(params.scope);
        const taskId = normalizeString(params.task_id);
        const requestId = normalizeString(params.request_id);
        const backendId = normalizeString(params.backend_id);
        const counts = new Map<string, number>();
        for (const row of memoryTables.rows.values()) {
          if (domain && row.domain !== domain) {
            continue;
          }
          if (scope && row.scope !== scope) {
            continue;
          }
          if (requestId && row.request_id !== requestId) {
            continue;
          }
          if (backendId && row.backend_id !== backendId) {
            continue;
          }
          const state = normalizeString(row.state);
          counts.set(state, (counts.get(state) || 0) + 1);
        }
        return Array.from(counts.entries())
          .map(([state, value]) => ({ state, value }))
          .sort((left, right) =>
            String(left.state || "").localeCompare(String(right.state || "")),
          );
      }
      if (normalizedSql.includes("from plugin_task_rows")) {
        const domain = normalizeString(params.domain);
        const scope = normalizeString(params.scope);
        const taskId = normalizeString(params.task_id);
        const requestId = normalizeString(params.request_id);
        const backendId = normalizeString(params.backend_id);
        const stateSet = new Set(
          Object.entries(params)
            .filter(([key]) => /^state_\d+$/.test(key))
            .map(([, value]) => normalizeString(value))
            .filter(Boolean),
        );
        const excludedStateSet = new Set(
          Object.entries(params)
            .filter(([key]) => /^exclude_state_\d+$/.test(key))
            .map(([, value]) => normalizeString(value))
            .filter(Boolean),
        );
        const limit =
          typeof params.limit === "number" && Number.isFinite(params.limit)
            ? Math.max(0, Math.floor(params.limit))
            : 0;
        const rows = Array.from(memoryTables.rows.values()).filter((row) => {
          if (domain && row.domain !== domain) {
            return false;
          }
          if (scope && row.scope !== scope) {
            return false;
          }
          if (taskId && row.task_id !== taskId) {
            return false;
          }
          if (requestId && row.request_id !== requestId) {
            return false;
          }
          if (backendId && row.backend_id !== backendId) {
            return false;
          }
          if (stateSet.size > 0 && !stateSet.has(row.state)) {
            return false;
          }
          if (excludedStateSet.has(row.state)) {
            return false;
          }
          return true;
        });
        const sorted = byUpdatedDesc(rows);
        return (limit ? sorted.slice(0, limit) : sorted).map((row) => ({
          ...row,
        }));
      }
      if (normalizedSql.includes("from plugin_meta")) {
        const key = normalizeString(params.meta_key);
        if (key) {
          const row = memoryTables.meta.get(key);
          return row ? [{ ...row }] : [];
        }
        return Array.from(memoryTables.meta.values()).map((row) => ({
          ...row,
        }));
      }
      return [];
    },
    get(sql, params = {}) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim().toLowerCase();
      const runTables = memoryRunTablesFromSql(normalizedSql);
      if (
        runTables &&
        normalizedSql.startsWith("select count(*) as value") &&
        normalizedSql.includes("_run_events")
      ) {
        const runKey = normalizeString(params.run_key);
        let count = 0;
        for (const row of runTables.events.values()) {
          if (runKey && row.run_key !== runKey) {
            continue;
          }
          count += 1;
        }
        return { value: count };
      }
      if (
        runTables &&
        normalizedSql.startsWith("select count(*) as value") &&
        normalizedSql.includes("_runs")
      ) {
        const backendId = normalizeString(params.backend_id);
        let count = 0;
        for (const row of runTables.runs.values()) {
          if (backendId && row.backend_id !== backendId) {
            continue;
          }
          count += 1;
        }
        return { value: count };
      }
      if (
        normalizedSql.startsWith(
          "select count(*) as value from plugin_task_requests",
        )
      ) {
        const domain = normalizeString(params.domain);
        const backendId = normalizeString(params.backend_id);
        let count = 0;
        for (const row of memoryTables.requests.values()) {
          if (domain && row.domain !== domain) {
            continue;
          }
          if (backendId && row.backend_id !== backendId) {
            continue;
          }
          count += 1;
        }
        return { value: count };
      }
      if (
        normalizedSql.startsWith(
          "select count(*) as value from plugin_task_contexts",
        )
      ) {
        const domain = normalizeString(params.domain);
        const backendId = normalizeString(params.backend_id);
        let count = 0;
        for (const row of memoryTables.contexts.values()) {
          if (domain && row.domain !== domain) {
            continue;
          }
          if (backendId && row.backend_id !== backendId) {
            continue;
          }
          count += 1;
        }
        return { value: count };
      }
      if (
        normalizedSql.startsWith(
          "select count(*) as value from plugin_task_rows",
        )
      ) {
        const domain = normalizeString(params.domain);
        const backendId = normalizeString(params.backend_id);
        let count = 0;
        for (const row of memoryTables.rows.values()) {
          if (domain && row.domain !== domain) {
            continue;
          }
          if (backendId && row.backend_id !== backendId) {
            continue;
          }
          count += 1;
        }
        return { value: count };
      }
      if (
        normalizedSql.startsWith("select count(*) as value from plugin_meta")
      ) {
        return { value: memoryTables.meta.size };
      }
      const rows = this.all(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },
    transaction(fn) {
      return fn();
    },
  };
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
  return buildMemoryAdapter();
}

function ensureSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_task_requests (
      domain TEXT NOT NULL,
      request_id TEXT NOT NULL,
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, request_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_task_contexts (
      domain TEXT NOT NULL,
      context_id TEXT NOT NULL,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, context_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_task_rows (
      domain TEXT NOT NULL,
      scope TEXT NOT NULL,
      task_id TEXT NOT NULL,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, scope, task_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_acp_skill_runs (
      run_key TEXT PRIMARY KEY,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_acp_skill_run_events (
      event_id TEXT PRIMARY KEY,
      run_key TEXT NOT NULL DEFAULT '',
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_skillrunner_runs (
      run_key TEXT PRIMARY KEY,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plugin_skillrunner_run_events (
      event_id TEXT PRIMARY KEY,
      run_key TEXT NOT NULL DEFAULT '',
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_requests_backend_request
      ON plugin_task_requests(domain, backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_requests_state_updated
      ON plugin_task_requests(domain, state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_contexts_backend_request
      ON plugin_task_contexts(domain, backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_contexts_state_updated
      ON plugin_task_contexts(domain, state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_rows_scope_state_updated
      ON plugin_task_rows(domain, scope, state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_task_rows_backend_request
      ON plugin_task_rows(domain, backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_acp_skill_runs_backend_request
      ON plugin_acp_skill_runs(backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_acp_skill_runs_state_updated
      ON plugin_acp_skill_runs(state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_acp_skill_run_events_run_created
      ON plugin_acp_skill_run_events(run_key, created_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_skillrunner_runs_backend_request
      ON plugin_skillrunner_runs(backend_id, request_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_skillrunner_runs_state_updated
      ON plugin_skillrunner_runs(state, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plugin_skillrunner_run_events_run_created
      ON plugin_skillrunner_run_events(run_key, created_at DESC);
  `);
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

function ensureJsonPayload(payload: string) {
  const normalized = normalizeString(payload);
  if (!normalized) {
    return "{}";
  }
  return normalized;
}

function runStoreTables(kind: PluginRunStoreKind) {
  if (kind === "acp") {
    return {
      runs: "plugin_acp_skill_runs",
      events: "plugin_acp_skill_run_events",
    };
  }
  return {
    runs: "plugin_skillrunner_runs",
    events: "plugin_skillrunner_run_events",
  };
}

function normalizeRunStoreEntry(row: Record<string, unknown>) {
  return {
    runKey: normalizeString(row.run_key),
    requestId: normalizeString(row.request_id),
    backendId: normalizeString(row.backend_id),
    state: normalizeString(row.state),
    updatedAt: normalizeString(row.updated_at),
    payload: ensureJsonPayload(normalizeString(row.payload_json)),
  } satisfies PluginRunStoreEntry;
}

function normalizeRunEventStoreEntry(row: Record<string, unknown>) {
  return {
    eventId: normalizeString(row.event_id),
    runKey: normalizeString(row.run_key),
    requestId: normalizeString(row.request_id),
    backendId: normalizeString(row.backend_id),
    type: normalizeString(row.type),
    createdAt: normalizeString(row.created_at),
    payload: ensureJsonPayload(normalizeString(row.payload_json)),
  } satisfies PluginRunEventStoreEntry;
}

export function listPluginRunStoreEntries(kind: PluginRunStoreKind) {
  return listPluginRunStoreEntriesFiltered(kind);
}

export function listPluginRunStoreEntriesFiltered(
  kind: PluginRunStoreKind,
  options: PluginRunStoreListOptions = {},
) {
  const backendId = normalizeString(options.backendId);
  const requestId = normalizeString(options.requestId);
  const states = normalizeTaskRowStates(options.states);
  const excludeStates = normalizeTaskRowStates(options.excludeStates);
  const limit = normalizeTaskRowLimit(options.limit);
  const where: string[] = [];
  const params: SqlParams = {};
  if (backendId) {
    where.push("backend_id=@backend_id");
    params.backend_id = backendId;
  }
  if (requestId) {
    where.push("request_id=@request_id");
    params.request_id = requestId;
  }
  states.forEach((state, index) => {
    const key = `state_${index}`;
    params[key] = state;
  });
  excludeStates.forEach((state, index) => {
    const key = `exclude_state_${index}`;
    params[key] = state;
  });
  if (states.length > 0) {
    where.push(
      `state IN (${states.map((_, index) => `@state_${index}`).join(", ")})`,
    );
  }
  if (excludeStates.length > 0) {
    where.push(
      `state NOT IN (${excludeStates
        .map((_, index) => `@exclude_state_${index}`)
        .join(", ")})`,
    );
  }
  if (limit) {
    params.limit = limit;
  }
  const db = getAdapter();
  const tables = runStoreTables(kind);
  const rows = db.all(
    `
    SELECT run_key, request_id, backend_id, state, updated_at, payload_json
    FROM ${tables.runs}
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY updated_at DESC
    ${limit ? "LIMIT @limit" : ""}
  `,
    params,
  );
  const entries = rows.map(normalizeRunStoreEntry);
  return limit ? entries.slice(0, limit) : entries;
}

export function getPluginRunStoreEntry(
  kind: PluginRunStoreKind,
  runKeyRaw: string,
) {
  const runKey = normalizeString(runKeyRaw);
  if (!runKey) {
    return null;
  }
  const db = getAdapter();
  const tables = runStoreTables(kind);
  const row = db.get(
    `
      SELECT run_key, request_id, backend_id, state, updated_at, payload_json
      FROM ${tables.runs}
      WHERE run_key=@run_key
      LIMIT 1
    `,
    { run_key: runKey },
  );
  return row ? normalizeRunStoreEntry(row) : null;
}

export function getPluginRunStoreEntryByRequest(args: {
  kind: PluginRunStoreKind;
  backendId?: string;
  requestId: string;
}) {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    return null;
  }
  const backendId = normalizeString(args.backendId);
  const db = getAdapter();
  const tables = runStoreTables(args.kind);
  if (backendId) {
    const row = db.get(
      `
        SELECT run_key, request_id, backend_id, state, updated_at, payload_json
        FROM ${tables.runs}
        WHERE request_id=@request_id AND backend_id=@backend_id
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      { request_id: requestId, backend_id: backendId },
    );
    return row ? normalizeRunStoreEntry(row) : null;
  }
  const row = db.get(
    `
      SELECT run_key, request_id, backend_id, state, updated_at, payload_json
      FROM ${tables.runs}
      WHERE request_id=@request_id
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    { request_id: requestId },
  );
  return row ? normalizeRunStoreEntry(row) : null;
}

export function upsertPluginRunStoreEntry(
  kind: PluginRunStoreKind,
  entry: PluginRunStoreEntry,
) {
  const runKey = normalizeString(entry.runKey);
  if (!runKey) {
    return;
  }
  const db = getAdapter();
  const tables = runStoreTables(kind);
  db.run(
    `
      INSERT OR REPLACE INTO ${tables.runs}
      (run_key, request_id, backend_id, state, updated_at, payload_json)
      VALUES (@run_key, @request_id, @backend_id, @state, @updated_at, @payload_json)
    `,
    {
      run_key: runKey,
      request_id: normalizeString(entry.requestId),
      backend_id: normalizeString(entry.backendId),
      state: normalizeString(entry.state),
      updated_at: normalizeString(entry.updatedAt) || nowIso(),
      payload_json: ensureJsonPayload(entry.payload),
    },
  );
}

export function deletePluginRunStoreEntry(
  kind: PluginRunStoreKind,
  runKeyRaw: string,
) {
  const runKey = normalizeString(runKeyRaw);
  if (!runKey) {
    return false;
  }
  const db = getAdapter();
  const tables = runStoreTables(kind);
  db.run(`DELETE FROM ${tables.runs} WHERE run_key=@run_key`, {
    run_key: runKey,
  });
  db.run(`DELETE FROM ${tables.events} WHERE run_key=@run_key`, {
    run_key: runKey,
  });
  return true;
}

export function clearPluginRunStore(kind: PluginRunStoreKind) {
  const db = getAdapter();
  const tables = runStoreTables(kind);
  const runCount = Number(
    db.get(`SELECT COUNT(*) AS value FROM ${tables.runs}`)?.value || 0,
  );
  const eventCount = Number(
    db.get(`SELECT COUNT(*) AS value FROM ${tables.events}`)?.value || 0,
  );
  db.transaction(() => {
    db.run(`DELETE FROM ${tables.events}`);
    db.run(`DELETE FROM ${tables.runs}`);
  });
  const total =
    (Number.isFinite(runCount) ? runCount : 0) +
    (Number.isFinite(eventCount) ? eventCount : 0);
  return total;
}

export function countPluginRunStore(kind: PluginRunStoreKind) {
  const db = getAdapter();
  const tables = runStoreTables(kind);
  const runCount = Number(
    db.get(`SELECT COUNT(*) AS value FROM ${tables.runs}`)?.value || 0,
  );
  const eventCount = Number(
    db.get(`SELECT COUNT(*) AS value FROM ${tables.events}`)?.value || 0,
  );
  return (
    (Number.isFinite(runCount) ? runCount : 0) +
    (Number.isFinite(eventCount) ? eventCount : 0)
  );
}

export function estimatePluginRunStoreBytes(kind: PluginRunStoreKind) {
  const db = getAdapter();
  const tables = runStoreTables(kind);
  const runBytes = Number(
    db.get(
      `SELECT COALESCE(SUM(LENGTH(payload_json)), 0) AS value FROM ${tables.runs}`,
    )?.value || 0,
  );
  const eventBytes = Number(
    db.get(
      `SELECT COALESCE(SUM(LENGTH(payload_json)), 0) AS value FROM ${tables.events}`,
    )?.value || 0,
  );
  return (
    (Number.isFinite(runBytes) ? runBytes : 0) +
    (Number.isFinite(eventBytes) ? eventBytes : 0)
  );
}

export function appendPluginRunEventStoreEntry(
  kind: PluginRunStoreKind,
  entry: PluginRunEventStoreEntry,
) {
  const eventId = normalizeString(entry.eventId);
  if (!eventId) {
    return;
  }
  const db = getAdapter();
  const tables = runStoreTables(kind);
  db.run(
    `
      INSERT OR REPLACE INTO ${tables.events}
      (event_id, run_key, request_id, backend_id, type, created_at, payload_json)
      VALUES (@event_id, @run_key, @request_id, @backend_id, @type, @created_at, @payload_json)
    `,
    {
      event_id: eventId,
      run_key: normalizeString(entry.runKey),
      request_id: normalizeString(entry.requestId),
      backend_id: normalizeString(entry.backendId),
      type: normalizeString(entry.type),
      created_at: normalizeString(entry.createdAt) || nowIso(),
      payload_json: ensureJsonPayload(entry.payload),
    },
  );
}

export function listPluginRunEventStoreEntries(args: {
  kind: PluginRunStoreKind;
  runKey: string;
}) {
  const runKey = normalizeString(args.runKey);
  if (!runKey) {
    return [];
  }
  const db = getAdapter();
  const tables = runStoreTables(args.kind);
  const rows = db.all(
    `
      SELECT event_id, run_key, request_id, backend_id, type, created_at, payload_json
      FROM ${tables.events}
      WHERE run_key=@run_key
      ORDER BY created_at DESC
    `,
    { run_key: runKey },
  );
  return rows.map(normalizeRunEventStoreEntry);
}

export function listPluginTaskRequestEntries(domain: string) {
  const db = getAdapter();
  const rows = db.all(
    `
      SELECT request_id, backend_id, state, updated_at, payload_json
      FROM plugin_task_requests
      WHERE domain=@domain
      ORDER BY updated_at DESC
    `,
    { domain: normalizeString(domain) },
  );
  return rows.map((row) => ({
    requestId: normalizeString(row.request_id),
    backendId: normalizeString(row.backend_id),
    state: normalizeString(row.state),
    updatedAt: normalizeString(row.updated_at),
    payload: ensureJsonPayload(normalizeString(row.payload_json)),
  }));
}

export function getPluginTaskRequestEntry(
  domain: string,
  requestIdRaw: string,
) {
  const requestId = normalizeString(requestIdRaw);
  if (!requestId) {
    return null;
  }
  const db = getAdapter();
  const row = db.get(
    `
      SELECT request_id, backend_id, state, updated_at, payload_json
      FROM plugin_task_requests
      WHERE domain=@domain AND request_id=@request_id
      LIMIT 1
    `,
    {
      domain: normalizeString(domain),
      request_id: requestId,
    },
  );
  if (!row) {
    return null;
  }
  return {
    requestId: normalizeString(row.request_id),
    backendId: normalizeString(row.backend_id),
    state: normalizeString(row.state),
    updatedAt: normalizeString(row.updated_at),
    payload: ensureJsonPayload(normalizeString(row.payload_json)),
  } as PluginTaskRequestEntry;
}

export function upsertPluginTaskRequestEntry(
  domainRaw: string,
  entry: PluginTaskRequestEntry,
) {
  const domain = normalizeString(domainRaw);
  const requestId = normalizeString(entry.requestId);
  if (!domain || !requestId) {
    return;
  }
  const db = getAdapter();
  db.run(
    `
      INSERT OR REPLACE INTO plugin_task_requests
      (domain, request_id, backend_id, state, updated_at, payload_json)
      VALUES (@domain, @request_id, @backend_id, @state, @updated_at, @payload_json)
    `,
    {
      domain,
      request_id: requestId,
      backend_id: normalizeString(entry.backendId),
      state: normalizeString(entry.state),
      updated_at: normalizeString(entry.updatedAt) || nowIso(),
      payload_json: ensureJsonPayload(entry.payload),
    },
  );
}

export function replacePluginTaskRequestEntries(
  domainRaw: string,
  entries: PluginTaskRequestEntry[],
) {
  const domain = normalizeString(domainRaw);
  if (!domain) {
    return;
  }
  const db = getAdapter();
  db.transaction(() => {
    db.run("DELETE FROM plugin_task_requests WHERE domain=@domain", {
      domain,
    });
    for (const entry of entries) {
      upsertPluginTaskRequestEntry(domain, entry);
    }
  });
}

export function deletePluginTaskRequestEntry(
  domainRaw: string,
  requestIdRaw: string,
) {
  const domain = normalizeString(domainRaw);
  const requestId = normalizeString(requestIdRaw);
  if (!domain || !requestId) {
    return false;
  }
  const db = getAdapter();
  db.run(
    "DELETE FROM plugin_task_requests WHERE domain=@domain AND request_id=@request_id",
    {
      domain,
      request_id: requestId,
    },
  );
  return true;
}

export function deletePluginTaskRequestEntriesByBackend(
  domainRaw: string,
  backendIdRaw: string,
) {
  const domain = normalizeString(domainRaw);
  const backendId = normalizeString(backendIdRaw);
  if (!domain || !backendId) {
    return 0;
  }
  const db = getAdapter();
  const before = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_requests
        WHERE domain=@domain AND backend_id=@backend_id
      `,
      { domain, backend_id: backendId },
    )?.value || 0,
  );
  db.run(
    "DELETE FROM plugin_task_requests WHERE domain=@domain AND backend_id=@backend_id",
    {
      domain,
      backend_id: backendId,
    },
  );
  return Number.isFinite(before) ? before : 0;
}

export function listPluginTaskContextEntries(domainRaw: string) {
  const domain = normalizeString(domainRaw);
  const db = getAdapter();
  const rows = db.all(
    `
      SELECT context_id, request_id, backend_id, state, updated_at, payload_json
      FROM plugin_task_contexts
      WHERE domain=@domain
      ORDER BY updated_at DESC
    `,
    { domain },
  );
  return rows.map((row) => ({
    contextId: normalizeString(row.context_id),
    requestId: normalizeString(row.request_id),
    backendId: normalizeString(row.backend_id),
    state: normalizeString(row.state),
    updatedAt: normalizeString(row.updated_at),
    payload: ensureJsonPayload(normalizeString(row.payload_json)),
  }));
}

export function upsertPluginTaskContextEntry(
  domainRaw: string,
  entry: PluginTaskContextEntry,
) {
  const domain = normalizeString(domainRaw);
  const contextId = normalizeString(entry.contextId);
  if (!domain || !contextId) {
    return;
  }
  const db = getAdapter();
  db.run(
    `
      INSERT OR REPLACE INTO plugin_task_contexts
      (domain, context_id, request_id, backend_id, state, updated_at, payload_json)
      VALUES (@domain, @context_id, @request_id, @backend_id, @state, @updated_at, @payload_json)
    `,
    {
      domain,
      context_id: contextId,
      request_id: normalizeString(entry.requestId),
      backend_id: normalizeString(entry.backendId),
      state: normalizeString(entry.state),
      updated_at: normalizeString(entry.updatedAt) || nowIso(),
      payload_json: ensureJsonPayload(entry.payload),
    },
  );
}

export function replacePluginTaskContextEntries(
  domainRaw: string,
  entries: PluginTaskContextEntry[],
) {
  const domain = normalizeString(domainRaw);
  if (!domain) {
    return;
  }
  const db = getAdapter();
  db.transaction(() => {
    db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", {
      domain,
    });
    for (const entry of entries) {
      upsertPluginTaskContextEntry(domain, entry);
    }
  });
}

export function deletePluginTaskContextEntry(
  domainRaw: string,
  contextIdRaw: string,
) {
  const domain = normalizeString(domainRaw);
  const contextId = normalizeString(contextIdRaw);
  if (!domain || !contextId) {
    return false;
  }
  const db = getAdapter();
  db.run(
    "DELETE FROM plugin_task_contexts WHERE domain=@domain AND context_id=@context_id",
    {
      domain,
      context_id: contextId,
    },
  );
  return true;
}

export function deletePluginTaskContextEntriesByBackend(
  domainRaw: string,
  backendIdRaw: string,
) {
  const domain = normalizeString(domainRaw);
  const backendId = normalizeString(backendIdRaw);
  if (!domain || !backendId) {
    return 0;
  }
  const db = getAdapter();
  const before = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_contexts
        WHERE domain=@domain AND backend_id=@backend_id
      `,
      { domain, backend_id: backendId },
    )?.value || 0,
  );
  db.run(
    "DELETE FROM plugin_task_contexts WHERE domain=@domain AND backend_id=@backend_id",
    {
      domain,
      backend_id: backendId,
    },
  );
  return Number.isFinite(before) ? before : 0;
}

export function listPluginTaskRowEntries(
  domainRaw: string,
  scopeRaw: PluginTaskScope,
) {
  return listPluginTaskRowEntriesFiltered(domainRaw, scopeRaw);
}

export function getPluginTaskRowEntry(
  domainRaw: string,
  scopeRaw: PluginTaskScope,
  taskIdRaw: string,
) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  const taskId = normalizeString(taskIdRaw);
  if (!domain || !scope || !taskId) {
    return null;
  }
  const db = getAdapter();
  const row = db.get(
    `
      SELECT task_id, request_id, backend_id, state, updated_at, payload_json
      FROM plugin_task_rows
      WHERE domain=@domain AND scope=@scope AND task_id=@task_id
    `,
    {
      domain,
      scope,
      task_id: taskId,
    },
  );
  return row
    ? {
        taskId: normalizeString(row.task_id),
        requestId: normalizeString(row.request_id),
        backendId: normalizeString(row.backend_id),
        state: normalizeString(row.state),
        updatedAt: normalizeString(row.updated_at),
        payload: ensureJsonPayload(normalizeString(row.payload_json)),
      }
    : null;
}

function normalizeTaskRowStates(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values || []).map((value) => normalizeString(value)).filter(Boolean),
    ),
  );
}

function normalizeTaskRowLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

export function listPluginTaskRowEntriesFiltered(
  domainRaw: string,
  scopeRaw: PluginTaskScope,
  options: PluginTaskRowListOptions = {},
) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  const backendId = normalizeString(options.backendId);
  const requestId = normalizeString(options.requestId);
  const states = normalizeTaskRowStates(options.states);
  const excludeStates = normalizeTaskRowStates(options.excludeStates);
  const limit = normalizeTaskRowLimit(options.limit);
  const where = ["domain=@domain", "scope=@scope"];
  const params: SqlParams = { domain, scope };
  if (backendId) {
    where.push("backend_id=@backend_id");
    params.backend_id = backendId;
  }
  if (requestId) {
    where.push("request_id=@request_id");
    params.request_id = requestId;
  }
  states.forEach((state, index) => {
    const key = `state_${index}`;
    params[key] = state;
  });
  excludeStates.forEach((state, index) => {
    const key = `exclude_state_${index}`;
    params[key] = state;
  });
  if (states.length > 0) {
    where.push(
      `state IN (${states.map((_, index) => `@state_${index}`).join(", ")})`,
    );
  }
  if (excludeStates.length > 0) {
    where.push(
      `state NOT IN (${excludeStates
        .map((_, index) => `@exclude_state_${index}`)
        .join(", ")})`,
    );
  }
  if (limit) {
    params.limit = limit;
  }
  const db = getAdapter();
  const rows = db.all(
    `
      SELECT task_id, request_id, backend_id, state, updated_at, payload_json
      FROM plugin_task_rows
      WHERE ${where.join(" AND ")}
      ORDER BY updated_at DESC
      ${limit ? "LIMIT @limit" : ""}
    `,
    params,
  );
  const entries = rows.map((row) => ({
    taskId: normalizeString(row.task_id),
    requestId: normalizeString(row.request_id),
    backendId: normalizeString(row.backend_id),
    state: normalizeString(row.state),
    updatedAt: normalizeString(row.updated_at),
    payload: ensureJsonPayload(normalizeString(row.payload_json)),
  }));
  return limit ? entries.slice(0, limit) : entries;
}

export function countPluginTaskRowStates(
  domainRaw: string,
  scopeRaw: PluginTaskScope,
  options: Pick<PluginTaskRowListOptions, "backendId" | "requestId"> = {},
): PluginTaskRowStateCount[] {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  const backendId = normalizeString(options.backendId);
  const requestId = normalizeString(options.requestId);
  if (!domain || !scope) {
    return [];
  }
  const where = ["domain=@domain", "scope=@scope"];
  const params: SqlParams = { domain, scope };
  if (backendId) {
    where.push("backend_id=@backend_id");
    params.backend_id = backendId;
  }
  if (requestId) {
    where.push("request_id=@request_id");
    params.request_id = requestId;
  }
  const db = getAdapter();
  const rows = db.all(
    `
      SELECT state, COUNT(*) AS value
      FROM plugin_task_rows
      WHERE ${where.join(" AND ")}
      GROUP BY state
    `,
    params,
  );
  return rows
    .map((row) => ({
      state: normalizeString(row.state),
      count: Math.max(0, Math.floor(Number(row.value) || 0)),
    }))
    .filter((row) => row.state && row.count > 0)
    .sort((left, right) => left.state.localeCompare(right.state));
}

export function upsertPluginTaskRowEntry(
  domainRaw: string,
  scopeRaw: PluginTaskScope,
  entry: PluginTaskRowEntry,
) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  const taskId = normalizeString(entry.taskId);
  if (!domain || !scope || !taskId) {
    return;
  }
  const db = getAdapter();
  db.run(
    `
      INSERT OR REPLACE INTO plugin_task_rows
      (domain, scope, task_id, request_id, backend_id, state, updated_at, payload_json)
      VALUES (@domain, @scope, @task_id, @request_id, @backend_id, @state, @updated_at, @payload_json)
    `,
    {
      domain,
      scope,
      task_id: taskId,
      request_id: normalizeString(entry.requestId),
      backend_id: normalizeString(entry.backendId),
      state: normalizeString(entry.state),
      updated_at: normalizeString(entry.updatedAt) || nowIso(),
      payload_json: ensureJsonPayload(entry.payload),
    },
  );
}

export function replacePluginTaskRowEntries(
  domainRaw: string,
  scopeRaw: PluginTaskScope,
  entries: PluginTaskRowEntry[],
) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  if (!domain || !scope) {
    return;
  }
  const db = getAdapter();
  db.transaction(() => {
    db.run(
      "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope",
      { domain, scope },
    );
    for (const entry of entries) {
      upsertPluginTaskRowEntry(domain, scope as PluginTaskScope, entry);
    }
  });
}

export function clearPluginTaskRowEntries(
  domainRaw: string,
  scopeRaw: PluginTaskScope,
) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  if (!domain || !scope) {
    return;
  }
  const db = getAdapter();
  db.run("DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope", {
    domain,
    scope,
  });
}

export function deletePluginTaskRowEntry(
  domainRaw: string,
  taskIdRaw: string,
  scopeRaw: PluginTaskScope = "products",
) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  const taskId = normalizeString(taskIdRaw);
  if (!domain || !scope || !taskId) {
    return false;
  }
  const db = getAdapter();
  db.run(
    "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope AND task_id=@task_id",
    {
      domain,
      scope,
      task_id: taskId,
    },
  );
  return true;
}

export function deletePluginTaskRowEntriesByBackend(
  domainRaw: string,
  backendIdRaw: string,
) {
  const domain = normalizeString(domainRaw);
  const backendId = normalizeString(backendIdRaw);
  if (!domain || !backendId) {
    return 0;
  }
  const db = getAdapter();
  const before = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_rows
        WHERE domain=@domain AND backend_id=@backend_id
      `,
      { domain, backend_id: backendId },
    )?.value || 0,
  );
  db.run(
    "DELETE FROM plugin_task_rows WHERE domain=@domain AND backend_id=@backend_id",
    {
      domain,
      backend_id: backendId,
    },
  );
  return Number.isFinite(before) ? before : 0;
}

export function clearPluginTaskDomain(domainRaw: string) {
  const domain = normalizeString(domainRaw);
  if (!domain) {
    return 0;
  }
  const db = getAdapter();
  const requestCount = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_requests
        WHERE domain=@domain
      `,
      { domain },
    )?.value || 0,
  );
  const contextCount = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_contexts
        WHERE domain=@domain
      `,
      { domain },
    )?.value || 0,
  );
  const rowCount = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_rows
        WHERE domain=@domain
      `,
      { domain },
    )?.value || 0,
  );
  db.transaction(() => {
    db.run("DELETE FROM plugin_task_requests WHERE domain=@domain", { domain });
    db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", { domain });
    db.run("DELETE FROM plugin_task_rows WHERE domain=@domain", { domain });
  });
  return [requestCount, contextCount, rowCount].reduce((sum, value) => {
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export function countPluginTaskDomain(domainRaw: string) {
  const domain = normalizeString(domainRaw);
  if (!domain) {
    return 0;
  }
  const db = getAdapter();
  const requestCount = Number(
    db.get(
      "SELECT COUNT(*) AS value FROM plugin_task_requests WHERE domain=@domain",
      { domain },
    )?.value || 0,
  );
  const contextCount = Number(
    db.get(
      "SELECT COUNT(*) AS value FROM plugin_task_contexts WHERE domain=@domain",
      { domain },
    )?.value || 0,
  );
  const rowCount = Number(
    db.get(
      "SELECT COUNT(*) AS value FROM plugin_task_rows WHERE domain=@domain",
      { domain },
    )?.value || 0,
  );
  return [requestCount, contextCount, rowCount].reduce((sum, value) => {
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function estimateEntryBytes(entry: Record<string, unknown>) {
  return Object.values(entry).reduce<number>(
    (sum, value) => sum + normalizeString(value).length,
    0,
  );
}

function estimateEntriesBytes(entries: Array<Record<string, unknown>>) {
  return entries.reduce<number>(
    (sum, entry) => sum + estimateEntryBytes(entry),
    0,
  );
}

function sumPluginTaskRowBytesForScopes(
  domain: string,
  args: { scope?: string; excludedScopes?: Set<string> } = {},
) {
  const db = getAdapter();
  const rows = db.all(
    `
      SELECT domain, scope, task_id, request_id, backend_id, state, updated_at, payload_json
      FROM plugin_task_rows
      WHERE domain=@domain
    `,
    { domain },
  );
  return rows.reduce<number>((sum, row) => {
    const scope = normalizeString(row.scope);
    if (args.scope && scope !== args.scope) {
      return sum;
    }
    if (args.excludedScopes?.has(scope)) {
      return sum;
    }
    return (
      sum +
      [
        row.domain,
        row.scope,
        row.task_id,
        row.request_id,
        row.backend_id,
        row.state,
        row.updated_at,
        row.payload_json,
      ].reduce<number>(
        (rowSum, value) => rowSum + normalizeString(value).length,
        0,
      )
    );
  }, 0);
}

export function estimatePluginTaskDomainBytes(domainRaw: string) {
  const domain = normalizeString(domainRaw);
  if (!domain) {
    return 0;
  }
  return (
    estimateEntriesBytes(listPluginTaskRequestEntries(domain)) +
    estimateEntriesBytes(listPluginTaskContextEntries(domain)) +
    sumPluginTaskRowBytesForScopes(domain)
  );
}

export function clearPluginTaskDomainExceptRowScopes(
  domainRaw: string,
  preservedRowScopesRaw: string[],
) {
  const domain = normalizeString(domainRaw);
  if (!domain) {
    return 0;
  }
  const preserved = new Set(
    (preservedRowScopesRaw || [])
      .map((scope) => normalizeString(scope))
      .filter(Boolean),
  );
  const db = getAdapter();
  const requestCount = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_requests
        WHERE domain=@domain
      `,
      { domain },
    )?.value || 0,
  );
  const contextCount = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_contexts
        WHERE domain=@domain
      `,
      { domain },
    )?.value || 0,
  );
  const rows = db.all(
    `
      SELECT scope
      FROM plugin_task_rows
      WHERE domain=@domain
    `,
    { domain },
  );
  const rowCount = rows.filter(
    (row) => !preserved.has(normalizeString(row.scope)),
  ).length;
  db.transaction(() => {
    db.run("DELETE FROM plugin_task_requests WHERE domain=@domain", { domain });
    db.run("DELETE FROM plugin_task_contexts WHERE domain=@domain", { domain });
    if (preserved.size === 0) {
      db.run("DELETE FROM plugin_task_rows WHERE domain=@domain", { domain });
      return;
    }
    for (const row of rows) {
      const scope = normalizeString(row.scope);
      if (!scope || preserved.has(scope)) {
        continue;
      }
      db.run(
        "DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope",
        { domain, scope },
      );
    }
  });
  return [requestCount, contextCount, rowCount].reduce((sum, value) => {
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export function countPluginTaskDomainExceptRowScopes(
  domainRaw: string,
  preservedRowScopesRaw: string[],
) {
  const domain = normalizeString(domainRaw);
  if (!domain) {
    return 0;
  }
  const preserved = new Set(
    (preservedRowScopesRaw || [])
      .map((scope) => normalizeString(scope))
      .filter(Boolean),
  );
  const db = getAdapter();
  const requestCount = Number(
    db.get(
      "SELECT COUNT(*) AS value FROM plugin_task_requests WHERE domain=@domain",
      { domain },
    )?.value || 0,
  );
  const contextCount = Number(
    db.get(
      "SELECT COUNT(*) AS value FROM plugin_task_contexts WHERE domain=@domain",
      { domain },
    )?.value || 0,
  );
  const rows = db.all(
    `
      SELECT scope
      FROM plugin_task_rows
      WHERE domain=@domain
    `,
    { domain },
  );
  const rowCount = rows.filter(
    (row) => !preserved.has(normalizeString(row.scope)),
  ).length;
  return [requestCount, contextCount, rowCount].reduce((sum, value) => {
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export function estimatePluginTaskDomainExceptRowScopesBytes(
  domainRaw: string,
  preservedRowScopesRaw: string[],
) {
  const domain = normalizeString(domainRaw);
  if (!domain) {
    return 0;
  }
  const preserved = new Set(
    (preservedRowScopesRaw || [])
      .map((scope) => normalizeString(scope))
      .filter(Boolean),
  );
  return (
    estimateEntriesBytes(listPluginTaskRequestEntries(domain)) +
    estimateEntriesBytes(listPluginTaskContextEntries(domain)) +
    sumPluginTaskRowBytesForScopes(domain, { excludedScopes: preserved })
  );
}

export function clearPluginTaskScope(domainRaw: string, scopeRaw: string) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  if (!domain || !scope) {
    return 0;
  }
  const db = getAdapter();
  const rowCount = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_rows
        WHERE domain=@domain AND scope=@scope
      `,
      { domain, scope },
    )?.value || 0,
  );
  db.run("DELETE FROM plugin_task_rows WHERE domain=@domain AND scope=@scope", {
    domain,
    scope,
  });
  return Number.isFinite(rowCount) ? rowCount : 0;
}

export function countPluginTaskScope(domainRaw: string, scopeRaw: string) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  if (!domain || !scope) {
    return 0;
  }
  const db = getAdapter();
  const rowCount = Number(
    db.get(
      `
        SELECT COUNT(*) AS value
        FROM plugin_task_rows
        WHERE domain=@domain AND scope=@scope
      `,
      { domain, scope },
    )?.value || 0,
  );
  return Number.isFinite(rowCount) ? rowCount : 0;
}

export function estimatePluginTaskScopeBytes(
  domainRaw: string,
  scopeRaw: string,
) {
  const domain = normalizeString(domainRaw);
  const scope = normalizeString(scopeRaw);
  if (!domain || !scope) {
    return 0;
  }
  return sumPluginTaskRowBytesForScopes(domain, { scope });
}

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
    db.run("DELETE FROM plugin_meta");
  }
  memoryTables.requests.clear();
  memoryTables.contexts.clear();
  memoryTables.rows.clear();
  memoryTables.acpRunEvents.clear();
  memoryTables.acpRuns.clear();
  memoryTables.skillRunnerRunEvents.clear();
  memoryTables.skillRunnerRuns.clear();
  memoryTables.meta.clear();
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
  return {
    requestCount: Number.isFinite(requestCount) ? requestCount : 0,
    contextCount: Number.isFinite(contextCount) ? contextCount : 0,
    rowCount: Number.isFinite(rowCount) ? rowCount : 0,
    acpRunCount: Number.isFinite(acpRunCount) ? acpRunCount : 0,
    skillRunnerRunCount: Number.isFinite(skillRunnerRunCount)
      ? skillRunnerRunCount
      : 0,
  };
}

registerPluginTaskDomainClearer(clearPluginTaskDomain);
registerPluginTaskDomainExceptRowScopesClearer(
  clearPluginTaskDomainExceptRowScopes,
);
registerPluginTaskScopeClearer(clearPluginTaskScope);
registerPluginTaskDomainCounter(countPluginTaskDomain);
registerPluginTaskDomainExceptRowScopesCounter(
  countPluginTaskDomainExceptRowScopes,
);
registerPluginTaskScopeCounter(countPluginTaskScope);
registerPluginTaskDomainByteEstimator(estimatePluginTaskDomainBytes);
registerPluginTaskDomainExceptRowScopesByteEstimator(
  estimatePluginTaskDomainExceptRowScopesBytes,
);
registerPluginTaskScopeByteEstimator(estimatePluginTaskScopeBytes);
registerPluginRunStoreClearer(clearPluginRunStore);
registerPluginRunStoreCounter(countPluginRunStore);
registerPluginRunStoreByteEstimator(estimatePluginRunStoreBytes);

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
  };
}

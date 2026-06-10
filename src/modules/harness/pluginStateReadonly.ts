import {
  createReadonlySqliteDatabase,
  type ReadonlySqliteDatabase,
} from "./sqliteReadonly";

export type PluginStateReadonlyRow = Record<string, unknown> & {
  domain: string;
  scope: string;
  requestId: string;
  backendId: string;
  taskId: string;
  state: string;
  updatedAt: string;
  payload: Record<string, any>;
};

export type PluginStateReadonlyStore = {
  db: ReadonlySqliteDatabase;
  tableExists(table: string): boolean;
  listTaskRows(args?: {
    domain?: string;
    scope?: string;
    limit?: number;
  }): PluginStateReadonlyRow[];
  listRequestRows(args?: {
    domain?: string;
    limit?: number;
  }): PluginStateReadonlyRow[];
  listContextRows(args?: {
    domain?: string;
    limit?: number;
  }): PluginStateReadonlyRow[];
  diagnostics(): Record<string, unknown>;
  close(): void;
};

export function cleanHarnessString(value: unknown) {
  return String(value || "").trim();
}

export function parseHarnessJsonObject(value: unknown): Record<string, any> {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function safeRows(
  db: ReadonlySqliteDatabase,
  sql: string,
  params: Record<string, string | number | null> = {},
) {
  try {
    return db.all(sql, params);
  } catch {
    return [];
  }
}

function rowPayload(row: Record<string, unknown>) {
  return parseHarnessJsonObject(row.payload_json);
}

function normalizeTaskRow(row: Record<string, unknown>) {
  const payload = rowPayload(row);
  const taskId =
    cleanHarnessString(row.task_id) ||
    cleanHarnessString(payload.taskId) ||
    cleanHarnessString(payload.id) ||
    cleanHarnessString(row.request_id) ||
    cleanHarnessString(payload.requestId);
  const requestId =
    cleanHarnessString(row.request_id) || cleanHarnessString(payload.requestId);
  const backendId =
    cleanHarnessString(row.backend_id) || cleanHarnessString(payload.backendId);
  const state =
    cleanHarnessString(row.state) ||
    cleanHarnessString(payload.state) ||
    cleanHarnessString(payload.status);
  const updatedAt =
    cleanHarnessString(row.updated_at) ||
    cleanHarnessString(payload.updatedAt) ||
    cleanHarnessString(payload.updated_at);
  return {
    ...payload,
    ...row,
    domain: cleanHarnessString(row.domain),
    scope: cleanHarnessString(row.scope),
    taskId,
    requestId,
    backendId,
    state,
    status: state,
    updatedAt,
    payload,
  } satisfies PluginStateReadonlyRow;
}

function normalizeRequestRow(row: Record<string, unknown>) {
  const payload = rowPayload(row);
  const requestId =
    cleanHarnessString(row.request_id) || cleanHarnessString(payload.requestId);
  const backendId =
    cleanHarnessString(row.backend_id) || cleanHarnessString(payload.backendId);
  const state =
    cleanHarnessString(row.state) ||
    cleanHarnessString(payload.state) ||
    cleanHarnessString(payload.status);
  const updatedAt =
    cleanHarnessString(row.updated_at) ||
    cleanHarnessString(payload.updatedAt) ||
    cleanHarnessString(payload.updated_at);
  return {
    ...payload,
    ...row,
    domain: cleanHarnessString(row.domain),
    scope: cleanHarnessString(row.scope),
    taskId: cleanHarnessString(payload.taskId || requestId),
    requestId,
    backendId,
    state,
    status: state,
    updatedAt,
    payload,
  } satisfies PluginStateReadonlyRow;
}

function normalizeContextRow(row: Record<string, unknown>) {
  const payload = rowPayload(row);
  const contextId = cleanHarnessString(row.context_id);
  const requestId =
    cleanHarnessString(row.request_id) || cleanHarnessString(payload.requestId);
  const backendId =
    cleanHarnessString(row.backend_id) || cleanHarnessString(payload.backendId);
  const state =
    cleanHarnessString(row.state) ||
    cleanHarnessString(payload.state) ||
    cleanHarnessString(payload.status);
  const updatedAt =
    cleanHarnessString(row.updated_at) ||
    cleanHarnessString(payload.updatedAt) ||
    cleanHarnessString(payload.updated_at);
  return {
    ...payload,
    ...row,
    domain: cleanHarnessString(row.domain),
    scope: cleanHarnessString(row.scope),
    taskId: cleanHarnessString(payload.taskId || contextId || requestId),
    contextId,
    requestId,
    backendId,
    state,
    status: state,
    updatedAt,
    payload,
  } satisfies PluginStateReadonlyRow;
}

function tableExists(db: ReadonlySqliteDatabase, table: string) {
  return Boolean(
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=@table",
      { table },
    ),
  );
}

function whereClauses(args: { domain?: string; scope?: string }) {
  const clauses: string[] = [];
  const params: Record<string, string | number | null> = {};
  const domain = cleanHarnessString(args.domain);
  const scope = cleanHarnessString(args.scope);
  if (domain) {
    clauses.push("domain = @domain");
    params.domain = domain;
  }
  if (scope) {
    clauses.push("scope = @scope");
    params.scope = scope;
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function limitValue(value: unknown, fallback: number) {
  const limit = Math.floor(Number(value));
  return Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : fallback;
}

export async function createPluginStateReadonlyStore(
  dbPath: string,
): Promise<PluginStateReadonlyStore> {
  const db = await createReadonlySqliteDatabase(dbPath);
  return {
    db,
    tableExists(table) {
      return tableExists(db, table);
    },
    listTaskRows(args = {}) {
      if (!tableExists(db, "plugin_task_rows")) return [];
      const { where, params } = whereClauses(args);
      return safeRows(
        db,
        `
          SELECT *
          FROM plugin_task_rows
          ${where}
          ORDER BY COALESCE(updated_at, '') DESC
          LIMIT @limit
        `,
        { ...params, limit: limitValue(args.limit, 300) },
      ).map(normalizeTaskRow);
    },
    listRequestRows(args = {}) {
      if (!tableExists(db, "plugin_task_requests")) return [];
      const { where, params } = whereClauses(args);
      return safeRows(
        db,
        `
          SELECT *
          FROM plugin_task_requests
          ${where}
          ORDER BY COALESCE(updated_at, '') DESC
          LIMIT @limit
        `,
        { ...params, limit: limitValue(args.limit, 300) },
      ).map(normalizeRequestRow);
    },
    listContextRows(args = {}) {
      if (!tableExists(db, "plugin_task_contexts")) return [];
      const { where, params } = whereClauses(args);
      return safeRows(
        db,
        `
          SELECT *
          FROM plugin_task_contexts
          ${where}
          ORDER BY COALESCE(updated_at, '') DESC
          LIMIT @limit
        `,
        { ...params, limit: limitValue(args.limit, 300) },
      ).map(normalizeContextRow);
    },
    diagnostics() {
      const tables = [
        "plugin_meta",
        "plugin_task_requests",
        "plugin_task_contexts",
        "plugin_task_rows",
      ];
      const domains = tableExists(db, "plugin_task_rows")
        ? safeRows(
            db,
            `
              SELECT domain, scope, COUNT(*) AS count
              FROM plugin_task_rows
              GROUP BY domain, scope
              ORDER BY domain, scope
            `,
          )
        : [];
      return {
        journalMode: db.get("PRAGMA journal_mode"),
        lockingMode: db.get("PRAGMA locking_mode"),
        tables: Object.fromEntries(
          tables.map((table) => [table, tableExists(db, table)]),
        ),
        rowScopes: domains,
      };
    },
    close() {
      db.close();
    },
  };
}

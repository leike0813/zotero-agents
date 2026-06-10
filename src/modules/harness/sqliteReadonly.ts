import type { SqlAdapter, SqlParams, SqlRow } from "../synthesis/repository";

type DatabaseSync = {
  prepare: (sql: string) => {
    all: (params?: Record<string, unknown>) => SqlRow[];
    get: (params?: Record<string, unknown>) => SqlRow | undefined;
    run: (params?: Record<string, unknown>) => unknown;
  };
  exec?: (sql: string) => unknown;
  close: () => void;
};

export type ReadonlySqliteDatabase = {
  all: (sql: string, params?: SqlParams) => SqlRow[];
  get: (sql: string, params?: SqlParams) => SqlRow | null;
  close: () => void;
};

export type ReadonlySqliteAdapter = SqlAdapter & {
  close: () => void;
};

const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<any>;

const READONLY_SQLITE_BUSY_TIMEOUT_MS = 5000;

function normalizeSql(sql: string) {
  return String(sql || "")
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isReadonlySql(sql: string) {
  return /^(select|with|pragma)\b/i.test(normalizeSql(sql));
}

function isSchemaInitNoop(sql: string) {
  const normalized = normalizeSql(sql).toLowerCase();
  return (
    normalized.startsWith("create table if not exists ") ||
    normalized.startsWith("create index if not exists ") ||
    normalized.startsWith("create unique index if not exists ") ||
    normalized.startsWith("drop table if exists synt_") ||
    normalized.startsWith("insert or replace into synt_schema_meta")
  );
}

function readonlyError(sql: string) {
  const normalized = normalizeSql(sql);
  const token = normalized.split(/\s+/)[0] || "statement";
  return new Error(
    `Readonly SQLite adapter refused ${token.toUpperCase()}: ${normalized.slice(0, 160)}`,
  );
}

function normalizeParams(params?: SqlParams): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params || {})) {
    normalized[key] = typeof value === "boolean" ? (value ? 1 : 0) : value;
  }
  return normalized;
}

async function openReadonlyDatabase(dbPath: string): Promise<DatabaseSync> {
  const sqlite = await dynamicImport("node:sqlite");
  const DatabaseCtor = sqlite.DatabaseSync;
  if (typeof DatabaseCtor !== "function") {
    throw new Error(
      "node:sqlite DatabaseSync is unavailable; Node 24+ is required.",
    );
  }
  const db = new DatabaseCtor(dbPath, {
    readOnly: true,
    timeout: READONLY_SQLITE_BUSY_TIMEOUT_MS,
  }) as DatabaseSync;
  db.exec?.(`PRAGMA busy_timeout=${READONLY_SQLITE_BUSY_TIMEOUT_MS}`);
  return db;
}

export async function createReadonlySqliteDatabase(
  dbPath: string,
): Promise<ReadonlySqliteDatabase> {
  const db = await openReadonlyDatabase(dbPath);
  return {
    all(sql, params) {
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      return db.prepare(sql).all(normalizeParams(params));
    },
    get(sql, params) {
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      return db.prepare(sql).get(normalizeParams(params)) || null;
    },
    close() {
      db.close();
    },
  };
}

export async function createReadonlySqliteAdapter(
  dbPath: string,
): Promise<ReadonlySqliteAdapter> {
  const db = await openReadonlyDatabase(dbPath);
  return {
    run(sql, params) {
      if (isSchemaInitNoop(sql)) {
        return;
      }
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      db.prepare(sql).run(normalizeParams(params));
    },
    all(sql, params) {
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      return db.prepare(sql).all(normalizeParams(params));
    },
    get(sql, params) {
      if (!isReadonlySql(sql)) {
        throw readonlyError(sql);
      }
      return db.prepare(sql).get(normalizeParams(params)) || null;
    },
    transaction() {
      throw new Error("Readonly SQLite adapter refused TRANSACTION");
    },
    close() {
      db.close();
    },
  };
}
